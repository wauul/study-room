import { NextResponse } from "next/server";
import { z } from "zod";
import { sendMail } from "@/lib/mail";
import { requestGuard, userGuard, audit } from "@/lib/guardrails";
import { jsonBody } from "@/lib/request-body";
import { withLease } from "@/lib/work-budget";
import { db } from "@/lib/db";
import { membership, HttpError, verified } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/http";
import { personalizedPdf } from "@/lib/pdf";
import { getLocale } from "@/lib/locale";
import { translator } from "@/lib/i18n";
import { operation } from "@/lib/telemetry";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const t = translator(await getLocale());
    checkOrigin(req);
    await requestGuard(req, "email", 5);
    const { id } = await params;
    const body = z
      .object({
        all: z.boolean().default(false),
        email: z.string().email().optional(),
      })
      .parse(await jsonBody(req));
    const { room, user, participant } = await membership(id, body.all);
    verified(user); await userGuard("email", user.id, 3, 3600);
    return await withLease("compute:pdf", async () => {
    if (room.status !== "ENDED")
      throw new HttpError(409, "End the session first.");
    if (body.email) {
      if (body.email.toLowerCase() !== user.email.toLowerCase())
        throw new HttpError(
          400,
          "Use your account email for your personal copy.",
        );
      await db.participant.update({
        where: { id: participant.id },
        data: { email: body.email },
      });
    }
    const recipients = body.all
      ? await db.participant.findMany({
          where: { roomId: id, revokedAt: null, user: { emailVerified: { not: null } } },
          include: { user: { select: { email: true } } },
          take: 31,
        })
      : [
          {
            ...participant,
            email: body.email || participant.email || user.email,
          },
        ];
    if (recipients.length > 30) throw new HttpError(413, "Send reports to at most 30 people.");
    let sent = 0;
    for (const person of recipients) {
      const recipient = await db.user.findUniqueOrThrow({ where: { id: person.userId }, select: { email: true, emailVerified: true } });
      if (!recipient.emailVerified) continue;
      // A permanent reservation prevents concurrent sends and replay beyond provider TTL.
      const reserved = await db.reportDelivery.createMany({ data: [{ roomId: id, participantId: person.id }], skipDuplicates: true });
      if (!reserved.count) continue;
      try {
        const content = await personalizedPdf(id, person.id);
        await operation("email.send", { provider: "resend" }, () => sendMail({
          to: recipient.email,
          subject: t("Your Study Room rundown: {room}", { room: room.name }),
          text: t("Hi {name},\n\nYour group rundown and personal confidence record are attached.\n\nA little clearer, together.\nStudy Room", { name: person.displayName }),
          attachments: [{ filename: "study-room-rundown.pdf", content: content.toString("base64") }],
        }, `summary-${id}-${person.id}`));
        await db.reportDelivery.update({ where: { roomId_participantId: { roomId: id, participantId: person.id } }, data: { status: "sent" } });
        await audit("report.sent", user.id, person.id);
        sent++;
      } catch (error) {
        // Ambiguous deliveries stay reserved. An operator must reconcile them, never auto-retry.
        throw error;
      }
    }
    return NextResponse.json({ sent });
    });
  } catch (e) {
    return apiError(e, "email.send");
  }
}

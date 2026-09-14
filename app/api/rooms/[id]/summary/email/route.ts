import { NextResponse } from "next/server";
import { z } from "zod";
import { Resend } from "resend";
import { db } from "@/lib/db";
import { membership, HttpError } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/http";
import { personalizedPdf } from "@/lib/pdf";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const { id } = await params;
    const body = z
      .object({
        all: z.boolean().default(false),
        email: z.string().email().optional(),
      })
      .parse(await req.json());
    const { room, user, participant } = await membership(id, body.all);
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
          where: { roomId: id, email: { not: null } },
        })
      : [
          {
            ...participant,
            email: body.email || participant.email || user.email,
          },
        ];
    const resend = new Resend(process.env.RESEND_API_KEY);
    let sent = 0;
    for (const person of recipients) {
      if (!person.email) continue;
      const content = await personalizedPdf(id, person.id);
      const result = await resend.emails.send(
        {
          from: process.env.RESEND_FROM || "Study Room <onboarding@resend.dev>",
          to: person.email,
          subject: `Your Study Room rundown: ${room.name}`,
          text: `Hi ${person.displayName},\n\nYour group rundown and personal confidence record are attached.\n\nA little clearer, together.\nStudy Room`,
          attachments: [{ filename: "study-room-rundown.pdf", content }],
        },
        { idempotencyKey: `summary-${id}-${person.id}` },
      );
      if (result.error)
        throw new HttpError(
          502,
          `Email delivery failed after ${sent} sends. Check your verified sender and Resend limits.`,
        );
      sent++;
    }
    return NextResponse.json({ sent });
  } catch (e) {
    return apiError(e);
  }
}

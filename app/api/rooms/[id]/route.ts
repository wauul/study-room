import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { membership } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/http";
import { deleteRoom } from "@/lib/deletion";
import { withLease } from "@/lib/work-budget";
import { chatHistory } from "@/lib/chat-history";
import { requestGuard } from "@/lib/guardrails";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requestGuard(req, "rooms", 60);
    const { id } = await params;
    const { room, user } = await membership(id);
    const [documents, messages, participants, latestRound] = await Promise.all([
      db.document.findMany({
        where: { roomId: id },
        select: {
          id: true,
          filename: true,
          sourceType: true,
          createdAt: true,
          chunks: {
            where: { active: true },
            orderBy: { position: "asc" },
            select: {
              id: true,
              content: true,
              sectionLabel: true,
              position: true,
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      chatHistory(id),
      db.participant.findMany({
        where: { roomId: id, revokedAt: null },
        select: { id: true, displayName: true },
      }),
      db.quizQuestion.findFirst({
        where: { roomId: id, lockedAt: { not: null } },
        orderBy: { createdAt: "desc" },
        include: {
          results: {
            include: { participant: { select: { displayName: true } } },
          },
        },
      }),
    ]);
    return NextResponse.json({
      room: {
        id: room.id,
        name: room.name,
        status: room.status,
        studyFocusRaw: room.studyFocusRaw,
      },
      isHost: room.hostUserId === user.id,
      documents,
      messages: messages.messages,
      nextCursor: messages.nextCursor,
      participants,
      latestRound,
    });
  } catch (e) {
    return apiError(e, "http.request");
  }
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(req); await requestGuard(req, "rooms", 5);
    const { id } = await params;
    const { user } = await membership(id, true);
    await withLease(`delete:${id}`, () => db.$transaction(async tx => {
      await deleteRoom(tx, id);
      await tx.securityAudit.create({ data: { action: "room.delete", actorId: user.id } });
    }));
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

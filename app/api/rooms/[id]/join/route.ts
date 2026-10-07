import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireVerifiedUser, HttpError } from "@/lib/auth";
import { requestGuard, userGuard, privateKey, audit } from "@/lib/guardrails";
import { jsonBody } from "@/lib/request-body";
import { withLease } from "@/lib/work-budget";
import { roomToken } from "@/lib/tokens";
import { apiError, checkOrigin } from "@/lib/http";
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    await requestGuard(req, "rooms", 30);
    const { id } = await params;
    const user = await requireVerifiedUser();
    const policy = await userGuard("rooms", user.id, 20);
    const { displayName, invite } = z
      .object({ displayName: z.string().trim().min(1).max(50), invite: z.string().regex(/^[a-f0-9]{64}$/).optional() })
      .parse(await jsonBody(req));
    return await withLease(`members:${id}`, async () => {
    const room = await db.room.findUnique({ where: { id } });
    if (!room) throw new HttpError(404, "Room not found.");
    let participant = await db.participant.findUnique({
      where: { roomId_userId: { roomId: id, userId: user.id } },
    });
    if (participant?.revokedAt) throw new HttpError(403, "Your room access has been removed.");
    if (!participant) {
      if (room.status === "ENDED")
        throw new HttpError(409, "This session has ended.");
      if (room.hostUserId !== user.id) {
        if (!invite || !await db.roomInvitation.findFirst({ where: { roomId: id, tokenHash: privateKey(invite), revokedAt: null, expiresAt: { gt: new Date() } } }))
          throw new HttpError(403, "Ask the host for a new invitation link.");
      }
      if (await db.participant.count({ where: { roomId: id, revokedAt: null } }) >= policy.maxParticipantsPerRoom)
        throw new HttpError(429, "This room has reached its participant limit.");
      participant = await db.participant.upsert({
        where: { roomId_userId: { roomId: id, userId: user.id } },
        create: { roomId: id, userId: user.id, displayName, email: user.email },
        update: {},
      });
      await audit("room.join", user.id, id);
    }
    return NextResponse.json({
      participantId: participant.id,
      token: await roomToken(id, participant.id, user.id),
      socketUrl: process.env.SOCKET_SERVER_URL || "http://localhost:3001",
      isHost: room.hostUserId === user.id,
    });
    });
  } catch (e) {
    return apiError(e, "http.request");
  }
}

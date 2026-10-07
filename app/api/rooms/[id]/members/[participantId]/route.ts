import { db } from "@/lib/db";
import { membership, HttpError } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/http";
import { requestGuard, audit } from "@/lib/guardrails";
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; participantId: string }> }) {
  try {
    checkOrigin(req); await requestGuard(req, "rooms", 10);
    const { id, participantId } = await params, { user } = await membership(id, true);
    const participant = await db.participant.findFirst({ where: { id: participantId, roomId: id } });
    if (!participant || participant.userId === user.id) throw new HttpError(400, "This participant cannot be removed.");
    await db.$transaction([
      db.participant.update({ where: { id: participantId }, data: { revokedAt: new Date() } }),
      db.roomInvitation.updateMany({ where: { roomId: id, revokedAt: null }, data: { revokedAt: new Date() } }),
      db.securityAudit.create({ data: { action: "member.revoke", actorId: user.id, targetId: participantId } }),
    ]);
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

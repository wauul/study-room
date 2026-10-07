import { randomBytes } from "node:crypto";
import { membership, HttpError } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/http";
import { requestGuard, userGuard, privateKey, audit } from "@/lib/guardrails";
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(req); await requestGuard(req, "rooms", 10);
    const { id } = await params, { user, room } = await membership(id, true);
    await userGuard("rooms", user.id, 5);
    if (room.status !== "ACTIVE") throw new HttpError(409, "Session ended.");
    const token = randomBytes(32).toString("hex"), expiresAt = new Date(Date.now() + 24 * 3600_000);
    await db.roomInvitation.create({ data: { roomId: id, tokenHash: privateKey(token), expiresAt } });
    await audit("invite.create", user.id, id);
    return Response.json({ token, expiresAt }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiError(error); }
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    checkOrigin(req); await requestGuard(req, "rooms", 10);
    const { id } = await params, { user } = await membership(id, true);
    await db.roomInvitation.updateMany({ where: { roomId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    await audit("invite.revoke", user.id, id);
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
import { db } from "@/lib/db";

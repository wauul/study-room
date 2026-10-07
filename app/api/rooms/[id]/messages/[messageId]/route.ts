import { z } from "zod";
import { db } from "@/lib/db";
import { membership, HttpError } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/http";
import { jsonBody } from "@/lib/request-body";
import { requestGuard, userGuard, audit } from "@/lib/guardrails";
export async function POST(req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    checkOrigin(req); await requestGuard(req, "rooms", 10);
    const { id, messageId } = await params, { user } = await membership(id);
    await userGuard("rooms", user.id, 5, 3600);
    const { reason } = z.object({ reason: z.enum(["unsafe", "incorrect", "harassment"]) }).parse(await jsonBody(req));
    if (!await db.chatMessage.findFirst({ where: { id: messageId, roomId: id } })) throw new HttpError(404, "Message not found.");
    await audit(`content.report.${reason}`, user.id, messageId);
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; messageId: string }> }) {
  try {
    checkOrigin(req); await requestGuard(req, "rooms", 10);
    const { id, messageId } = await params, { user } = await membership(id, true);
    const result = await db.chatMessage.updateMany({ where: { id: messageId, roomId: id }, data: { content: "This message was removed by the host.", status: "removed", citedChunkIds: [], citations: [] } });
    if (!result.count) throw new HttpError(404, "Message not found.");
    await audit("content.remove", user.id, messageId);
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

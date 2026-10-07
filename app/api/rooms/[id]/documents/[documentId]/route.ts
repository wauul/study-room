import { db } from "@/lib/db";
import { membership, HttpError } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/http";
import { requestGuard } from "@/lib/guardrails";
import { withLease } from "@/lib/work-budget";
export async function DELETE(req: Request, { params }: { params: Promise<{ id: string; documentId: string }> }) {
  try {
    checkOrigin(req); await requestGuard(req, "rooms", 10);
    const { id, documentId } = await params, { user, room } = await membership(id, true);
    if (room.status !== "ACTIVE") throw new HttpError(409, "Delete the archived room to remove its study material.");
    await withLease("compute:upload", () => db.$transaction(async tx => {
      const document = await tx.document.findFirst({ where: { id: documentId, roomId: id }, include: { chunks: { select: { id: true } } } });
      if (!document) throw new HttpError(404, "Document not found.");
      const ids = document.chunks.map(c => c.id);
      await tx.quizQuestion.deleteMany({ where: { sourceChunkId: { in: ids }, roomId: id } });
      await tx.chatMessage.deleteMany({ where: { roomId: id, citedChunkIds: { hasSome: ids } } });
      await tx.document.delete({ where: { id: documentId } });
      await tx.securityAudit.create({ data: { action: "document.delete", actorId: user.id, targetId: id } });
    }));
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

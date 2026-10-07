import { NextResponse } from "next/server";
import { z } from "zod";
import { membership, HttpError, verified } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/http";
import { ingest } from "@/lib/rag/ingest";
import { captureFailure, operation } from "@/lib/telemetry";
import { requestGuard, userGuard, reserveUpload, audit } from "@/lib/guardrails";
import { formBody } from "@/lib/request-body";
import { withLease } from "@/lib/work-budget";
import { parsePdf } from "@/lib/pdf-parse-worker";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    await requestGuard(req, "uploads", 5);
    const { id } = await params;
    const { room, user } = await membership(id, true);
    verified(user); const policy = await userGuard("uploads", user.id, 3, 3600);
    if (room.status !== "ACTIVE") throw new HttpError(409, "Session ended.");
    return await withLease("compute:upload", async () => {
    const existing = await db.document.findMany({ where: { roomId: id }, select: { rawText: true } });
    if (existing.length >= policy.maxDocumentsPerRoom) throw new HttpError(429, "This room has reached its document limit.");
    const form = await formBody(req);
    const sourceType = z
      .enum(["COURSE_MATERIAL", "PAST_EXAM"])
      .parse(form.get("sourceType"));
    let text = String(form.get("text") || "");
    let filename = String(form.get("filename") || "Study notes").slice(0, 200);
    const file = form.get("file");
    if (file instanceof File && file.size) {
      if (file.size > 4 * 1024 * 1024)
        throw new HttpError(413, "Use a PDF smaller than 4 MB.");
      if (!file.name.toLowerCase().endsWith(".pdf"))
        throw new HttpError(400, "Upload a PDF or paste text.");
      const bytes = Buffer.from(await file.arrayBuffer());
      if (bytes.subarray(0, 5).toString() !== "%PDF-")
        throw new HttpError(400, "This is not a valid PDF.");
      await reserveUpload();
      text = await operation("pdf.parse", {}, () => parsePdf(new Uint8Array(bytes)));
      filename = file.name.slice(0, 200);
    }
    if (text.length < 20 || text.length > 180000)
      throw new HttpError(
        400,
        "Provide between 20 and 180,000 characters of readable text.",
      );
    if (existing.reduce((total, doc) => total + (doc.rawText?.length || 0), 0) + text.length > policy.maxRoomCharacters)
      throw new HttpError(429, "This room has reached its text storage limit.");
    const stored = await db.$queryRaw<{ total: bigint }[]>`SELECT COALESCE(SUM(COALESCE(length(d."rawText"), (SELECT SUM(length(c.content)) FROM "DocumentChunk" c WHERE c."documentId"=d.id))),0)::bigint AS total FROM "Document" d`;
    if (Number(stored[0]?.total || 0) + text.length > policy.maxStoredCharacters)
      throw new HttpError(429, "The shared storage limit has been reached.");
    if (!(file instanceof File && file.size)) await reserveUpload();
    const document = await ingest(id, filename, text, sourceType);
    await audit("document.upload", user.id, document.id);
    return NextResponse.json(document, { status: 201 });
    });
  } catch (e) {
    return apiError(e, "document.ingest");
  }
}

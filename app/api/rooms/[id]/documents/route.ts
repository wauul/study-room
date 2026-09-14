import { NextResponse } from "next/server";
import { z } from "zod";
import { membership, HttpError } from "@/lib/auth";
import { apiError, checkOrigin } from "@/lib/http";
import { ingest } from "@/lib/rag/ingest";
export const runtime = "nodejs";
export const maxDuration = 60;
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    const { id } = await params;
    const { room } = await membership(id, true);
    if (room.status !== "ACTIVE") throw new HttpError(409, "Session ended.");
    const form = await req.formData();
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
      const pdf = (await import("pdf-parse/lib/pdf-parse.js")).default;
      text = (await pdf(bytes)).text;
      filename = file.name.slice(0, 200);
    }
    if (text.length < 20 || text.length > 180000)
      throw new HttpError(
        400,
        "Provide between 20 and 180,000 characters of readable text.",
      );
    const document = await ingest(id, filename, text, sourceType);
    return NextResponse.json(document, { status: 201 });
  } catch (e) {
    return apiError(e);
  }
}

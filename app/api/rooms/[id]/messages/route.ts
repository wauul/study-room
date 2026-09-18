import { NextResponse } from "next/server";
import { membership } from "@/lib/auth";
import { apiError } from "@/lib/http";
import { chatHistory } from "@/lib/chat-history";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    await membership(id);
    return NextResponse.json(
      await chatHistory(id, new URL(req.url).searchParams.get("before")),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return apiError(e);
  }
}

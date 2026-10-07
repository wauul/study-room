import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { membership, HttpError, verified } from "@/lib/auth";
import { requestGuard, userGuard } from "@/lib/guardrails";
import { jsonBody } from "@/lib/request-body";
import { withLease } from "@/lib/work-budget";
import { simpler, summarySchema } from "@/lib/summary";
import { apiError, checkOrigin } from "@/lib/http";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requestGuard(req, "rooms", 60);
    const { id } = await params;
    const { room, participant, user } = await membership(id);
    const summary = await db.sessionSummary.findUnique({
      where: { roomId: id },
    });
    if (!summary) throw new HttpError(404, "The rundown is not ready yet.");
    const results = await db.quizResult.findMany({
      where: {
        participantId: participant.id,
        quizQuestion: { roomId: id, lockedAt: { not: null } },
      },
      include: { quizQuestion: true },
    });
    return NextResponse.json({
      roomName: room.name,
      summary: summary.resultJson,
      results,
      isHost: room.hostUserId === user.id,
      displayName: participant.displayName,
    });
  } catch (e) {
    return apiError(e, "summary.generate");
  }
}
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    checkOrigin(req);
    await requestGuard(req, "ai", 10);
    const { id } = await params;
    const { user } = await membership(id);
    verified(user); await userGuard("ai", user.id, 5);
    const { sourceChunkId } = z
      .object({ sourceChunkId: z.string().max(100) })
      .parse(await jsonBody(req));
    return await withLease(`summary:${id}`, async () => {
    const summary = await db.sessionSummary.findUniqueOrThrow({
      where: { roomId: id },
    });
    const data = summarySchema.parse(summary.resultJson);
    const point = data.strugglePoints.find(
      (p) => p.sourceChunkId === sourceChunkId && p.severity === "high",
    );
    if (!point) throw new HttpError(400, "Unknown struggle point.");
    point.explanation = await simpler(sourceChunkId, 2);
    await db.sessionSummary.update({
      where: { roomId: id },
      data: { resultJson: data },
    });
    return NextResponse.json({ explanation: point.explanation });
    });
  } catch (e) {
    return apiError(e, "summary.generate");
  }
}

import { operation } from "./telemetry";
import { z } from "zod";
import { db } from "./db";
import { structured } from "./ai";
import { confusionWeight } from "./scoring/properScoringRule";
const insight = z.object({
  topic: z.string().max(200),
  evidence: z.string().max(2000),
  sourceChunkId: z.string().max(100),
});
export const summarySchema = z.object({
  wellUnderstood: z.array(insight).max(20),
  strugglePoints: z.array(
    insight.extend({
      severity: z.enum(["high", "medium", "low"]),
      explanation: z.string().max(4000).optional(),
    }),
  ).max(20),
  studyTips: z.array(z.string().max(1000)).max(10),
  suggestedNextSteps: z.string().max(2000),
});
export type Rundown = z.infer<typeof summarySchema>;
export async function simpler(chunkId: string, level = 1) {
  const chunk = await db.documentChunk.findUniqueOrThrow({
    where: { id: chunkId },
  });
  const response = await structured(
    'Explain this course passage using plain language, a concrete analogy, and one short check-for-understanding question. Return {"explanation":string}.',
    JSON.stringify({ passage: chunk.content, simplicityLevel: level }),
    z.object({ explanation: z.string() }),
  );
  return response.explanation;
}
export async function buildSummary(
  roomId: string,
  heatmap: Record<string, number>,
) {
  return operation("summary.generate", {}, async () => {
    const room = await db.room.findUniqueOrThrow({
      where: { id: roomId },
      include: {
        documents: { include: { chunks: true } },
        lostClicks: { include: { chatMessage: true } },
        questions: { include: { results: true }, orderBy: { createdAt: "desc" }, take: 100 },
      },
    });
    const retrievalCounts = new Map(
      (
        await db.retrievalEvent.groupBy({
          by: ["chunkId"],
          where: { roomId },
          _count: { _all: true },
        })
      ).map((row) => [row.chunkId, row._count._all]),
    );
    const facts = room.documents
      .flatMap((d) =>
        d.chunks.map((c) => ({
          sourceChunkId: c.id,
          topic: c.sectionLabel || d.filename,
          retrievals: retrievalCounts.get(c.id) || 0,
          decayedHeat: heatmap[c.id] || 0,
          lostClicks: room.lostClicks.filter((l) =>
            l.chatMessage.citedChunkIds.includes(c.id),
          ).length,
          quiz: room.questions
            .filter((q) => q.sourceChunkId === c.id)
            .flatMap((q) =>
              q.results.map((r) => ({
                question: q.questionText,
                score: r.zeroProbability ? "negative infinity" : r.score,
                confusionWeight: confusionWeight(
                  r.submittedDistribution as number[],
                  q.correctOptionIndex,
                ),
                probabilityOnTruth: (r.submittedDistribution as number[])[
                  q.correctOptionIndex
                ],
              })),
            ),
        })),
      )
      .filter((f) => f.retrievals > 0 || f.lostClicks > 0 || f.quiz.length > 0);
    const result = await structured(
      'Create an evidence-based study rundown. Return {wellUnderstood:[{topic,evidence,sourceChunkId}],strugglePoints:[{topic,evidence,sourceChunkId,severity:"high"|"medium"|"low"}],studyTips:string[],suggestedNextSteps:string}. Every evidence string MUST cite actual numeric facts from input. Use only supplied sourceChunkIds. Retrieval frequency alone does NOT establish confusion. No quiz data means no demonstrated mastery. No activity means explicitly insufficient evidence; do not invent achievements or struggles.',
      JSON.stringify({ focus: room.studyFocusRaw, scope: "At most 20 topics with recorded activity; course quizzes are capped at 100 rounds.", facts: [...facts].sort((a,b) => (b.lostClicks + b.quiz.length) - (a.lostClicks + a.quiz.length)).slice(0,20).map(f => ({ sourceChunkId:f.sourceChunkId,topic:f.topic,retrievals:f.retrievals,lostClicks:f.lostClicks,quizSubmissions:f.quiz.length,correctConfidenceMean:f.quiz.length ? f.quiz.reduce((sum,q)=>sum+q.probabilityOnTruth,0)/f.quiz.length : null,confidentErrors:f.quiz.filter(q=>q.probabilityOnTruth<50).length })) }),
      summarySchema,
    );
    const valid = new Set(facts.map((f) => f.sourceChunkId));
    if (
      [...result.wellUnderstood, ...result.strugglePoints].some(
        (s) => !valid.has(s.sourceChunkId),
      )
    )
      throw new Error(
        "Summary returned an invalid source. Retry ending the session.",
      );
    // Evidence is rendered from recorded metrics, not entrusted to generated prose.
    // This makes numerical claims auditable even if the model embellishes its draft.
    const evidence = (id: string) => {
      const f = facts.find((f) => f.sourceChunkId === id)!;
      return `${f.retrievals} retrievals; ${f.lostClicks} lost clicks; ${f.quiz.length} quiz submissions${f.quiz.length ? `; probability assigned to the correct answer: ${f.quiz.map((q) => q.probabilityOnTruth + "%").join(", ")}; log scores: ${f.quiz.map((q) => (typeof q.score === "number" ? q.score.toFixed(3) : q.score)).join(", ")}` : ". No quiz evidence of mastery."}`;
    };
    result.wellUnderstood = result.wellUnderstood.filter((p) => {
      const f = facts.find((f) => f.sourceChunkId === p.sourceChunkId)!;
      return (
        f.quiz.length > 0 &&
        f.quiz.every((q) => q.probabilityOnTruth >= 70) &&
        f.lostClicks === 0
      );
    });
    result.strugglePoints = result.strugglePoints.filter((p) => {
      const f = facts.find((f) => f.sourceChunkId === p.sourceChunkId)!;
      return f.lostClicks > 0 || f.quiz.some((q) => q.probabilityOnTruth < 50);
    });
    for (const point of [...result.wellUnderstood, ...result.strugglePoints])
      point.evidence = evidence(point.sourceChunkId);
    for (const point of result.strugglePoints.filter(p => p.severity === "high").slice(0, 3))
      if (point.severity === "high")
        point.explanation = await simpler(point.sourceChunkId);
    await db.$transaction([
      db.sessionSummary.upsert({
        where: { roomId },
        create: { roomId, resultJson: result },
        update: { resultJson: result },
      }),
      db.room.update({
        where: { id: roomId },
        data: { status: "ENDED", endedAt: new Date() },
      }),
    ]);
    return result;
  });
}

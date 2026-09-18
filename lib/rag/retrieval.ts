import { Prisma, Room, SourceType } from "@prisma/client";
import { db } from "../db";
import { embedQuery } from "./embeddings";
import { focusPatterns } from "./focus";
export type RetrievedChunk = {
  id: string;
  content: string;
  sectionLabel: string | null;
  similarity: number;
  filename: string;
  relevance?: number;
};
export async function retrieve(
  room: Room,
  query: string,
  sourceType: SourceType = "COURSE_MATERIAL",
  limit = 5,
  rerankAnswers = false,
): Promise<RetrievedChunk[]> {
  const vector = JSON.stringify(await embedQuery(query));
  const exclude = focusPatterns(room.studyFocusExclude);
  const boost = focusPatterns(room.studyFocusBoost);
  // Exclusions are applied BEFORE ranking; boosts change rank, never the reported
  // cosine similarity. Parameters are bound by Prisma, including all user labels.
  const chunks = await db.$transaction(async (tx) => {
    await tx.$executeRaw`SET LOCAL hnsw.iterative_scan = 'strict_order'`;
    return tx.$queryRaw<(RetrievedChunk & { boosted: boolean })[]>(Prisma.sql`
    SELECT c.id,c.content,c."sectionLabel",d.filename,
      1-(c.embedding <=> ${vector}::vector) AS similarity,
      coalesce(c."sectionLabel",'') ~* ANY(${boost}::text[]) AS boosted
    FROM "DocumentChunk" c JOIN "Document" d ON d.id=c."documentId"
    WHERE d."roomId"=${room.id} AND d."sourceType"=${sourceType}::"SourceType"
      AND c.active AND c.embedding IS NOT NULL
      AND NOT (coalesce(c."sectionLabel",'') ~* ANY(${exclude}::text[]))
    ORDER BY c.embedding <=> ${vector}::vector
    LIMIT ${Math.max(20, limit * 3)}`);
  });
  if (rerankAnswers && chunks.length) {
    const { rerank } = await import("./rerank");
    const scored = await rerank(query, chunks);
    // Focus is a small tie-breaker after relevance, never a .2 cosine override.
    return scored
      .sort(
        (a, b) =>
          b.relevance +
          (b.boosted ? 0.1 : 0) -
          (a.relevance + (a.boosted ? 0.1 : 0)),
      )
      .slice(0, limit);
  }
  return chunks
    .sort(
      (a, b) =>
        b.similarity +
        (b.boosted ? 0.02 : 0) -
        (a.similarity + (a.boosted ? 0.02 : 0)),
    )
    .slice(0, limit);
}

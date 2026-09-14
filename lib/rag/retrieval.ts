import { Prisma, Room, SourceType } from "@prisma/client";
import { db } from "../db";
import { embed } from "./embeddings";
export type RetrievedChunk = {
  id: string;
  content: string;
  sectionLabel: string | null;
  similarity: number;
  filename: string;
};
export async function retrieve(
  room: Room,
  query: string,
  sourceType: SourceType = "COURSE_MATERIAL",
  limit = 5,
): Promise<RetrievedChunk[]> {
  const vector = JSON.stringify(await embed(query));
  // Exclusions are applied BEFORE ranking; boosts change rank, never the reported
  // cosine similarity. Parameters are bound by Prisma, including all user labels.
  return db.$queryRaw<RetrievedChunk[]>(Prisma.sql`
    SELECT c.id,c.content,c."sectionLabel",d.filename,
      1-(c.embedding <=> ${vector}::vector) AS similarity
    FROM "DocumentChunk" c JOIN "Document" d ON d.id=c."documentId"
    WHERE d."roomId"=${room.id} AND d."sourceType"=${sourceType}::"SourceType"
      AND c.embedding IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM unnest(${room.studyFocusExclude}::text[]) e
        WHERE strpos(lower(coalesce(c."sectionLabel",'')),lower(e))>0)
    ORDER BY (1-(c.embedding <=> ${vector}::vector)) + CASE WHEN EXISTS
      (SELECT 1 FROM unnest(${room.studyFocusBoost}::text[]) b
       WHERE strpos(lower(coalesce(c."sectionLabel",'')),lower(b))>0) THEN 0.2 ELSE 0 END DESC
    LIMIT ${limit}`);
}

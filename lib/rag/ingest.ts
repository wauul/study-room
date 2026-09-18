import { SourceType, Prisma } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { db } from "../db";
import { chunkText } from "./chunking";
import { embed } from "./embeddings";
import { prepareChunks } from "./prepare-chunks";
export async function ingest(
  roomId: string,
  filename: string,
  text: string,
  sourceType: SourceType,
) {
  const chunks = await prepareChunks(text);
  if (!chunks.length)
    throw new Error(
      "No readable text found. Scanned PDFs need OCR before upload.",
    );
  if (chunks.length > 200)
    throw new Error(
      "Please split this document into smaller uploads (maximum 200 chunks).",
    );
  const embedded: (ReturnType<typeof chunkText>[number] & {
    vector: string;
  })[] = [];
  for (const chunk of chunks)
    embedded.push({
      ...chunk,
      vector: JSON.stringify(await embed(chunk.content)),
    });
  return db.$transaction(
    async (tx) => {
      const document = await tx.document.create({
        data: {
          roomId,
          filename,
          sourceType,
          rawText: text,
          processingVersion: 2,
        },
      });
      await insertChunks(tx, document.id, embedded);
      return { id: document.id, filename: document.filename, sourceType: document.sourceType, createdAt: document.createdAt, chunks: chunks.length };
    },
    { timeout: 30000 },
  );
}
export async function insertChunks(
  tx: Prisma.TransactionClient,
  documentId: string,
  chunks: (ReturnType<typeof chunkText>[number] & { vector: string })[],
) {
  for (let start = 0; start < chunks.length; start += 50) {
    const values = chunks
      .slice(start, start + 50)
      .map(
        (c) =>
          Prisma.sql`(${randomUUID()},${documentId},${c.content},${c.sectionLabel},${c.position},${c.vector}::vector,true)`,
      );
    await tx.$executeRaw(
      Prisma.sql`INSERT INTO "DocumentChunk" (id,"documentId",content,"sectionLabel",position,embedding,active) VALUES ${Prisma.join(values)}`,
    );
  }
}

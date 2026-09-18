import "dotenv/config";
import fs from "node:fs/promises";
import { db } from "../lib/db";
import { chunkText } from "../lib/rag/chunking";
import { reconstructText } from "../lib/rag/reconstruct";
import { embed } from "../lib/rag/embeddings";
import { insertChunks } from "../lib/rag/ingest";
import { prepareChunks } from "../lib/rag/prepare-chunks";

async function main() {
  const apply = process.argv.includes("--apply");
  const documents = await db.document.findMany({
    where: { processingVersion: { lt: 2 } },
    include: {
      chunks: { where: { active: true }, orderBy: { position: "asc" } },
    },
  });
  const report = [];
  for (const document of documents) {
    const text = document.rawText || reconstructText(document.chunks);
    const chunks = await prepareChunks(text);
    if (!chunks.length)
      throw new Error(`Refusing empty reprocessing: ${document.id}`);
    if (apply) {
      const embedded: (ReturnType<typeof chunkText>[number] & {
        vector: string;
      })[] = [];
      for (const c of chunks)
        embedded.push({ ...c, vector: JSON.stringify(await embed(c.content)) });
      await db.$transaction(
        async (tx) => {
          // Claim the version atomically. A second run cannot duplicate chunks.
          const claim = await tx.document.updateMany({
            where: { id: document.id, processingVersion: { lt: 2 } },
            data: { processingVersion: 2, rawText: text },
          });
          if (!claim.count) return;
          await tx.documentChunk.updateMany({
            where: { documentId: document.id, active: true },
            data: { active: false },
          });
          await insertChunks(tx, document.id, embedded);
        },
        { timeout: 30000 },
      );
    }
    const row = {
      id: document.id,
      oldChunks: document.chunks.length,
      newChunks: chunks.length,
      reconstructed: !document.rawText,
      applied: apply,
    };
    report.push(row);
    console.log(JSON.stringify(row));
  }
  await fs.mkdir(".tools", { recursive: true });
  await fs.writeFile(
    ".tools/reprocessing-report.json",
    JSON.stringify(report, null, 2),
  );
}
main().finally(() => db.$disconnect());

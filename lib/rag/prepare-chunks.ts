import { chunkText, type TextChunk } from "./chunking";
import { tokenLength } from "./embeddings";
/** Leave space for a query in the reranker's 512-token pair. Word counts alone
 * underestimate French text and code, so ingestion checks the actual tokenizer. */
export async function prepareChunks(text: string): Promise<TextChunk[]> {
  const result: TextChunk[] = [];
  async function fit(chunk: TextChunk): Promise<void> {
    const tokens = await tokenLength(chunk.content);
    if (tokens <= 384) {
      result.push({ ...chunk, position: result.length });
      return;
    }
    const words = chunk.content.split(/\s+/).length;
    if (words <= 2) {
      for (let i = 0; i < chunk.content.length; i += 200)
        await fit({ ...chunk, content: chunk.content.slice(i, i + 224) });
      return;
    }
    const target = Math.max(
      2,
      Math.min(words - 1, Math.floor((words * 300) / tokens)),
    );
    for (const part of chunkText(
      chunk.content,
      target,
      Math.min(20, Math.floor(target / 6)),
    ))
      await fit({ ...part, sectionLabel: chunk.sectionLabel });
  }
  for (const chunk of chunkText(text)) await fit(chunk);
  return result;
}

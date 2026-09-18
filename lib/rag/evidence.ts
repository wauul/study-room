import type { RetrievedChunk } from "./retrieval";
/** A raw cross-encoder logit, not a probability. Recalibrate for new domains. */
export const MIN_RELEVANCE = -5;
export function supportedPassages(chunks: RetrievedChunk[]) {
  return chunks.filter(c => c.relevance === undefined || c.relevance >= MIN_RELEVANCE);
}

import { operation } from "../telemetry";
import { modelWork } from "./model-worker";
export function rerank<T extends { content: string }>(query: string, chunks: T[]): Promise<(T & { relevance: number })[]> {
  return operation("retrieval.rerank", {count:chunks.length,provider:"local",model:"Xenova/ms-marco-MiniLM-L-6-v2"}, async () => {
    const scores = await modelWork<number[]>("rerank", {query,chunks:chunks.map(c=>c.content)});
    return chunks.map((c,i)=>({...c,relevance:scores[i]})).sort((a,b)=>b.relevance-a.relevance);
  });
}

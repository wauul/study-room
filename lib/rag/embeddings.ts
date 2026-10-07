import { operation } from "../telemetry";
import { modelWork } from "./model-worker";
const cache = new Map<string, { expires: number; value: Promise<number[]> }>();
/** Whitespace-equivalent questions share work; distinct wording never shares a vector. */
export function embedQuery(text: string): Promise<number[]> {
  const key = text.trim().replace(/\s+/g, " ");
  const now = Date.now();
  for (const [key, entry] of cache) if (entry.expires <= now) cache.delete(key);
  const existing = cache.get(key);
  if (existing) return existing.value.then((v) => [...v]);
  const value = embed(key).catch((error) => {
    cache.delete(key);
    throw error;
  });
  if (cache.size >= 128) cache.delete(cache.keys().next().value!);
  cache.set(key, { expires: now + 5 * 60_000, value });
  return value.then((v) => [...v]);
}
export async function tokenLength(text: string): Promise<number> {
  return operation("embedding.tokenize", { provider: "local" }, () => modelWork<number>("tokenize", text));
}
export async function embed(text: string): Promise<number[]> {
  return operation("embedding.generate", { provider: "local", model: "Xenova/all-MiniLM-L6-v2" }, () => modelWork<number[]>("embed", text));
}

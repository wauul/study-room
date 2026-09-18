import path from "node:path";
let extractor: Promise<any> | undefined;
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
/** One quantized model per process. Serialize ingestion to keep free-tier memory bounded. */
async function getExtractor() {
  if (!extractor)
    extractor = (async () => {
      const { pipeline, env } = await import("@xenova/transformers");
      env.cacheDir =
        process.env.HF_HOME ||
        path.join(process.env.VERCEL ? "/tmp" : ".cache", "models");
      env.backends.onnx.wasm.numThreads = 1;
      return pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2", {
        quantized: true,
      });
    })().catch((error) => {
      extractor = undefined;
      throw error;
    });
  return extractor;
}
export async function tokenLength(text: string): Promise<number> {
  return (await getExtractor()).tokenizer(text, { truncation: false }).input_ids
    .size;
}
export async function embed(text: string): Promise<number[]> {
  const output = await (
    await getExtractor()
  )(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

import path from "node:path";
let scorer: Promise<any> | undefined;
let queue: Promise<unknown> = Promise.resolve();
/** Single-pair inference bounds memory on the 512 MB realtime service. */
export function rerank<T extends { content: string }>(
  query: string,
  chunks: T[],
): Promise<(T & { relevance: number })[]> {
  const task = queue.then(async () => {
    scorer ||= (async () => {
      const { AutoTokenizer, AutoModelForSequenceClassification, env } =
        await import("@xenova/transformers");
      env.cacheDir =
        process.env.HF_HOME ||
        path.join(process.env.VERCEL ? "/tmp" : ".cache", "models");
      const name = "Xenova/ms-marco-MiniLM-L-6-v2";
      const tokenizer = await AutoTokenizer.from_pretrained(name);
      const model = await AutoModelForSequenceClassification.from_pretrained(
        name,
        { quantized: true },
      );
      return { tokenizer, model };
    })().catch((error) => {
      scorer = undefined;
      throw error;
    });
    const { tokenizer, model } = await scorer;
    const scored = [];
    for (const chunk of chunks) {
      const output = await model(
        tokenizer(query, {
          text_pair: chunk.content,
          padding: true,
          truncation: true,
          max_length: 512,
        }),
      );
      scored.push({ ...chunk, relevance: Number(output.logits.data[0]) });
    }
    return scored.sort((a, b) => b.relevance - a.relevance);
  });
  queue = task.catch(() => {});
  return task;
}

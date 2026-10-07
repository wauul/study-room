import { Worker } from "node:worker_threads";
import path from "node:path";
import { HttpError } from "../errors";
import { workSignal } from "../work-budget";
const source = `
const { parentPort, workerData } = require('node:worker_threads');
let extractor, scorer;
async function tools() {
  const t = await import('@xenova/transformers');
  t.env.cacheDir=workerData.cacheDir; t.env.backends.onnx.wasm.numThreads=1;
  return t;
}
parentPort.on('message', async ({kind,input}) => {
 try {
  const t = await tools(); let result;
  if(kind==='rerank') {
    scorer ||= (async()=>({tokenizer:await t.AutoTokenizer.from_pretrained('Xenova/ms-marco-MiniLM-L-6-v2'),model:await t.AutoModelForSequenceClassification.from_pretrained('Xenova/ms-marco-MiniLM-L-6-v2',{quantized:true})}))();
    const s=await scorer; result=[];
    for(const text of input.chunks) {
      const output=await s.model(s.tokenizer(input.query,{text_pair:text,padding:true,truncation:true,max_length:512}));
      result.push(Number(output.logits.data[0]));
    }
  } else {
    extractor ||= t.pipeline('feature-extraction','Xenova/all-MiniLM-L6-v2',{quantized:true});
    const e=await extractor;
    result=kind==='tokenize' ? e.tokenizer(input,{truncation:false}).input_ids.size : Array.from((await e(input,{pooling:'mean',normalize:true})).data);
  }
  parentPort.postMessage({result});
 } catch { parentPort.postMessage({error:true}); }
});`;
type Job = { kind: string; input: unknown; resolve: (result: unknown) => void; reject: (error: Error) => void; signal: AbortSignal };
let worker: Worker | undefined, active: Job | undefined, timer: NodeJS.Timeout | undefined;
const queue: Job[] = [];
function stop(error: Error) {
  const old = worker; worker = undefined; if (timer) clearTimeout(timer);
  active?.reject(error); active = undefined;
  for (const job of queue.splice(0)) job.reject(error);
  void old?.terminate();
}
function next() {
  if (active || !queue.length) { worker?.unref(); return; }
  active = queue.shift()!;
  if (active.signal.aborted) { active.reject(new HttpError(408, "Processing timed out.")); active = undefined; next(); return; }
  if (!worker) {
    const current = worker = new Worker(source, { eval: true, workerData: { cacheDir: process.env.HF_HOME || path.join(process.env.VERCEL ? "/tmp" : ".cache", "models") }, resourceLimits: { maxOldGenerationSizeMb: 384 } });
    current.on("message", value => {
      if (worker !== current) return;
      if (timer) clearTimeout(timer);
      if (value.error) active?.reject(new HttpError(503, "Local model processing is unavailable.")); else active?.resolve(value.result);
      active = undefined; next();
    });
    current.on("error", () => { if (worker === current) stop(new HttpError(503, "Local model processing is unavailable.")); });
    current.on("exit", () => { if (worker === current) stop(new HttpError(503, "Local model processing stopped.")); });
  }
  worker.ref();
  timer = setTimeout(() => stop(new HttpError(408, "Local model processing timed out.")), 15000);
  worker.postMessage({ kind: active.kind, input: active.input });
}
export function modelWork<T>(kind: "embed" | "tokenize" | "rerank", input: unknown): Promise<T> {
  if (queue.length >= 4) return Promise.reject(new HttpError(429, "The processing queue is full. Please try again later."));
  return new Promise<T>((resolve, reject) => {
    const signal = workSignal();
    const job: Job = { kind, input, resolve: value => { cleanup(); resolve(value as T); }, reject: error => { cleanup(); reject(error); }, signal };
    const abort = () => {
      if (active === job) stop(new HttpError(408, "Local model processing timed out."));
      else { const index = queue.indexOf(job); if (index >= 0) queue.splice(index, 1); job.reject(new HttpError(408, "Local model processing timed out.")); }
    };
    const cleanup = () => signal.removeEventListener("abort", abort);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) { abort(); return; }
    queue.push(job); next();
  });
}

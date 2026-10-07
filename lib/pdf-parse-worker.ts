import { Worker } from "node:worker_threads";
import { HttpError } from "./errors";
const source = `
const { parentPort, workerData } = require('node:worker_threads');
(async () => {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({data: workerData});
  try {
    const info = await parser.getInfo();
    if (info.total > 100) throw new Error('too many pages');
    const result = await parser.getText();
    if (result.text.length > 180000) throw new Error('too much text');
    parentPort.postMessage({text: result.text});
  } finally { await parser.destroy(); }
})().catch(() => parentPort.postMessage({error:true}));`;
export function parsePdf(bytes: Uint8Array): Promise<string> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(source, { eval: true, workerData: bytes, resourceLimits: { maxOldGenerationSizeMb: 128 } });
    let settled = false;
    const finish = (error?: Error, text?: string) => {
      if (settled) return; settled = true; clearTimeout(timer); void worker.terminate();
      if (error) reject(error); else resolve(text!);
    };
    const timer = setTimeout(() => finish(new HttpError(408, "PDF processing timed out.")), 10000);
    worker.on("message", result => finish(result.error ? new HttpError(400, "Use a readable PDF with at most 100 pages and 180,000 characters.") : undefined, result.text));
    worker.on("error", () => finish(new HttpError(400, "This PDF could not be read.")));
    worker.on("exit", () => { if (!settled) finish(new HttpError(400, "This PDF could not be read.")); });
  });
}

import { Worker } from "node:worker_threads";
import { isValidElement, type ReactNode } from "react";
import { HttpError } from "./errors";
import { workSignal } from "./work-budget";
type Tree = string | number | null | Tree[] | { type: string; props: Record<string, unknown>; children: Tree };
function serialize(node: ReactNode): Tree {
  if (node === null || node === undefined || typeof node === "boolean") return null;
  if (typeof node === "string" || typeof node === "number") return node;
  if (Array.isArray(node)) return node.map(serialize);
  if (!isValidElement<{ children?: ReactNode; render?: (data: { pageNumber: string; totalPages: string }) => string }>(node) || typeof node.type !== "string") throw new Error("Unsupported PDF element");
  const { children, ...props } = node.props;
  // Functions cannot cross the worker boundary. Preserve our page-number footer
  // as a string template, then rebuild only that fixed formatter inside the worker.
  const { render, ...plain } = props;
  return { type: node.type, props: render ? { ...plain, pageTemplate: render({ pageNumber: "{PAGE_NUMBER}", totalPages: "{TOTAL_PAGES}" }) } : plain, children: serialize(children) };
}
const source = `
const {parentPort,workerData}=require('node:worker_threads');
(async()=>{
 const React=await import('react');const {renderToBuffer}=await import('@react-pdf/renderer');
 function build(n){if(n===null||typeof n!=='object')return n;if(Array.isArray(n))return n.map(build);const {pageTemplate,...props}=n.props;if(pageTemplate)props.render=({pageNumber,totalPages})=>pageTemplate.replace('{PAGE_NUMBER}',pageNumber).replace('{TOTAL_PAGES}',totalPages);return React.createElement(n.type,props,build(n.children));}
 const bytes=await renderToBuffer(build(workerData));parentPort.postMessage({bytes});
})().catch(()=>parentPort.postMessage({error:true}));`;
export function renderPdf(node: ReactNode): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(source, { eval: true, workerData: serialize(node), resourceLimits: { maxOldGenerationSizeMb: 128 } });
    const signal = workSignal(); let settled = false;
    const finish = (error?: Error, bytes?: Uint8Array) => {
      if (settled) return; settled = true; clearTimeout(timer); signal.removeEventListener("abort", abort); void worker.terminate();
      if (error) reject(error); else resolve(Buffer.from(bytes!));
    };
    const abort = () => finish(new HttpError(408, "PDF export timed out."));
    const timer = setTimeout(abort, 15000);
    signal.addEventListener("abort", abort, { once: true });
    if (signal.aborted) abort();
    worker.on("message", result => finish(result.error ? new HttpError(503, "PDF export is unavailable.") : undefined, result.bytes));
    worker.on("error", () => finish(new HttpError(503, "PDF export is unavailable.")));
    worker.on("exit", () => { if (!settled) finish(new HttpError(503, "PDF export stopped.")); });
  });
}

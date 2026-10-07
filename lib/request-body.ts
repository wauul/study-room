import { HttpError } from "./errors";
/** Reads no more than the allowed bytes, including requests with no/false Content-Length. */
export async function boundedBody(req: Request, maxBytes = 16_384): Promise<Uint8Array> {
  const declared = req.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maxBytes)) throw new HttpError(413, "Request is too large.");
  const reader = req.body?.getReader();
  if (!reader) return new Uint8Array();
  const parts: Uint8Array[] = [];
  let size = 0;
  const deadline = AbortSignal.timeout(10_000);
  const cancel = () => { void reader.cancel().catch(() => {}); };
  deadline.addEventListener("abort", cancel, { once: true });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (deadline.aborted) throw new HttpError(408, "Request timed out.");
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) { await reader.cancel(); throw new HttpError(413, "Request is too large."); }
      parts.push(value);
    }
    const bytes = new Uint8Array(size); let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.byteLength; }
    return bytes;
  } finally { deadline.removeEventListener("abort", cancel); reader.releaseLock(); }
}
export async function jsonBody(req: Request) {
  try { return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(await boundedBody(req))); }
  catch (error) { if (error instanceof HttpError) throw error; throw new HttpError(400, "Invalid JSON body."); }
}
export async function formBody(req: Request) {
  const bytes = await boundedBody(req, 4 * 1024 * 1024 + 32_768);
  try { return await new Response(bytes as BodyInit, { headers: { "content-type": req.headers.get("content-type") || "" } }).formData(); }
  catch { throw new HttpError(400, "Invalid upload body."); }
}

import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { db } from "./db";
import { HttpError } from "./errors";
const deadlines = new AsyncLocalStorage<AbortSignal>();
export function workSignal() { return deadlines.getStore() || AbortSignal.timeout(45000); }
export async function withDeadline<T>(work: () => Promise<T>, ms = 45000): Promise<T> {
  const signal = AbortSignal.timeout(ms);
  return deadlines.run(signal, work);
}
export function checkDeadline() { if (workSignal().aborted) throw new HttpError(408, "This operation timed out."); }
export async function withLease<T>(key: string, work: () => Promise<T>): Promise<T> {
  const owner = randomUUID();
  let accepted: unknown[];
  try {
    accepted = await db.$queryRaw`INSERT INTO "GuardrailLease" (key, owner, "expiresAt") VALUES (${key}, ${owner}, (NOW() AT TIME ZONE 'UTC') + INTERVAL '120 seconds') ON CONFLICT (key) DO UPDATE SET owner=EXCLUDED.owner,"expiresAt"=EXCLUDED."expiresAt" WHERE "GuardrailLease"."expiresAt" < (NOW() AT TIME ZONE 'UTC') RETURNING key`;
  } catch (error) { throw new HttpError(503, "Safety controls are unavailable.", { cause: error }); }
  if (!accepted.length) throw new HttpError(429, "Another operation is in progress. Please wait.");
  try { return await withDeadline(work); }
  finally { await db.guardrailLease.deleteMany({ where: { key, owner } }); }
}

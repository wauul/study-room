import { db } from "./db";
import * as Sentry from "@sentry/core";
import { reserve, globalCharges, windowCharge, privateKey, requestIp, type Feature, type GuardStore } from "./guardrail-core";
export { requestIp, privateKey } from "./guardrail-core";
export const guardStore: GuardStore = {
  threshold: () => Sentry.withScope(scope => { scope.setTag("operation", "guardrail.threshold"); Sentry.captureException(new Error("Usage threshold reached")); }),
  transaction: work => db.$transaction(tx => work({
    query: <T>(sql: string, ...values: unknown[]) => tx.$queryRawUnsafe<T[]>(sql, ...values),
    execute: (sql, ...values) => tx.$executeRawUnsafe(sql, ...values),
  }), { timeout: 5000, maxWait: 5000 }),
};
export function featureEnabled(feature: Feature) { return reserve(guardStore, feature, () => []); }
export function rateLimit(feature: Feature, identity: string, limit: number, seconds = 60) {
  // Different server-defined allowances must not consume each other's counters.
  return reserve(guardStore, feature, () => [windowCharge(`${feature}:${limit}:${seconds}:${privateKey(identity)}`, limit, seconds)]);
}
export async function requestGuard(req: Request, feature: Feature, limit = 30) {
  await rateLimit(feature, `ip:${requestIp(req.headers)}`, limit);
}
export function userGuard(feature: Feature, userId: string, limit = 10, seconds = 60) {
  return rateLimit(feature, `user:${userId}`, limit, seconds);
}
export function reserveAi(tokens: number) { return reserve(guardStore, "ai", p => globalCharges("ai", p, tokens)); }
export function reserveEmail() { return reserve(guardStore, "email", p => globalCharges("email", p)); }
export function reserveUpload() { return reserve(guardStore, "uploads", p => globalCharges("uploads", p)); }
export async function audit(action: string, actorId?: string, targetId?: string) {
  await db.securityAudit.create({ data: { action, actorId, targetId } });
}

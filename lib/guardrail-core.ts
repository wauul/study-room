import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { z } from "zod";
import { HttpError } from "./errors";

export const features = ["signup", "newsletter", "rooms", "ai", "uploads", "email", "realtime", "exports"] as const;
export type Feature = typeof features[number];
const cap = z.number().int().min(0).max(1_000_000_000);
export const policySchema = z.object({
  enabled: z.record(z.enum(features), z.boolean()).refine(v => features.every(f => typeof v[f] === "boolean")),
  dailyAiTokens: cap, monthlyAiTokens: cap, dailyAiCalls: cap,
  dailyEmails: cap, monthlyEmails: cap, dailyUploads: cap,
  maxRoomsPerUser: cap, maxDocumentsPerRoom: cap, maxRoomCharacters: cap,
  maxParticipantsPerRoom: cap, retentionDays: z.number().int().min(7).max(365),
  maxStoredCharacters: cap,
});
export type Policy = z.infer<typeof policySchema>;
export type Charge = { key: string; amount: number; limit: number; expires: Date };
export interface GuardTransaction {
  query<T>(sql: string, ...values: unknown[]): Promise<T[]>;
  execute(sql: string, ...values: unknown[]): Promise<number>;
}
export interface GuardStore {
  transaction<T>(work: (tx: GuardTransaction) => Promise<T>): Promise<T>;
  threshold?: (feature: Feature) => void;
}

/** A dedicated lease row is the shared lock; the application can only READ policy. */
export async function reserve(store: GuardStore, feature: Feature, makeCharges: (policy: Policy) => Charge[]) {
  try {
    let crossed = false;
    const result = await store.transaction(async tx => {
      const lock = await tx.query<{ key: string }>('SELECT key FROM "GuardrailLease" WHERE key = $1 FOR UPDATE', "policy-lock");
      if (!lock.length) throw new HttpError(503, "Safety controls are unavailable. Please try again later.");
      const rows = await tx.query<{ config: unknown }>('SELECT config FROM "GuardrailPolicy" WHERE id = $1', "default");
      const parsed = policySchema.safeParse(rows[0]?.config);
      if (!parsed.success) throw new HttpError(503, "Safety controls are unavailable. Please try again later.");
      const policy = parsed.data;
      if (!policy.enabled[feature]) throw new HttpError(503, "This feature is temporarily paused.");
      for (const charge of makeCharges(policy)) {
        if (!Number.isSafeInteger(charge.amount) || charge.amount <= 0 || !Number.isSafeInteger(charge.limit))
          throw new HttpError(503, "Invalid safety configuration.");
        const accepted = await tx.query<{ used: number }>(
          'INSERT INTO "GuardrailBucket" (key, used, "expiresAt") SELECT $1::text, $2::integer, $3::timestamp WHERE $2::integer <= $4::integer ON CONFLICT (key) DO UPDATE SET used = "GuardrailBucket".used + EXCLUDED.used WHERE "GuardrailBucket".used + EXCLUDED.used <= $4::integer RETURNING used',
          charge.key, charge.amount, charge.expires, charge.limit,
        );
        if (!accepted.length) throw new HttpError(429, "The usage limit has been reached. Please try again later.");
        const threshold = Math.ceil(charge.limit * 0.8);
        if (charge.key.startsWith("global:") && accepted[0].used >= threshold && accepted[0].used - charge.amount < threshold) {
          crossed = true;
          await tx.execute('INSERT INTO "SecurityAudit" (id, action, "targetId") VALUES ($1, $2, $3)', randomUUID(), "usage.threshold", charge.key);
        }
      }
      return policy;
    });
    if (crossed) { try { store.threshold?.(feature); } catch { /* Monitoring cannot change enforcement. */ } }
    return result;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(503, "Safety controls are unavailable. Please try again later.", { cause: error });
  }
}
export function windowCharge(key: string, limit: number, seconds: number, amount = 1, now = Date.now()): Charge {
  const start = Math.floor(now / (seconds * 1000)) * seconds * 1000;
  return { key: `${key}:${start}`, amount, limit, expires: new Date(start + seconds * 1000) };
}
export function globalCharges(kind: "ai" | "email" | "uploads", policy: Policy, amount = 1, now = new Date()): Charge[] {
  const day = now.toISOString().slice(0, 10), month = day.slice(0, 7);
  const dailyExpires = new Date(`${day}T00:00:00Z`); dailyExpires.setUTCDate(dailyExpires.getUTCDate() + 1);
  const monthlyExpires = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  if (kind === "uploads") return [{ key: `global:uploads:${day}`, amount, limit: policy.dailyUploads, expires: dailyExpires }];
  if (kind === "email") return [
    { key: `global:email:${day}`, amount, limit: policy.dailyEmails, expires: dailyExpires },
    { key: `global:email:${month}`, amount, limit: policy.monthlyEmails, expires: monthlyExpires },
  ];
  return [
    { key: `global:ai-calls:${day}`, amount: 1, limit: policy.dailyAiCalls, expires: dailyExpires },
    { key: `global:ai-tokens:${day}`, amount, limit: policy.dailyAiTokens, expires: dailyExpires },
    { key: `global:ai-tokens:${month}`, amount, limit: policy.monthlyAiTokens, expires: monthlyExpires },
  ];
}
export function privateKey(value: string, secret = process.env.NEXTAUTH_SECRET) {
  if (!secret) throw new HttpError(503, "Safety controls are unavailable.");
  return createHmac("sha256", secret).update(value).digest("hex");
}
/** Never select an arbitrary forwarded address. Unknown ingress fails closed. */
export function requestIp(headers: Headers, env: Record<string, string | undefined> = process.env, peer?: string) {
  let ip: string | null = null;
  if (env.VERCEL === "1") ip = headers.get("x-forwarded-for");
  else if (env.NODE_ENV !== "production") ip = peer || "127.0.0.1";
  else if (env.TRUSTED_PROXY_IP_HEADER && env.TRUSTED_PROXY_IP_HEADER === "x-study-client-ip") ip = headers.get("x-study-client-ip");
  else if (peer) ip = peer; // Transport identity is safe but groups clients behind the same proxy.
  if (!ip || ip.includes(",") || !isIP(ip.trim())) throw new HttpError(503, "Trusted network identity is unavailable.");
  return ip.trim();
}

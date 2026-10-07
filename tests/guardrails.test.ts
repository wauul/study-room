import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { reserve, windowCharge, globalCharges, requestIp, type GuardStore, type Policy } from "../lib/guardrail-core";
import { verifyBot } from "../lib/bot";
import { boundedBody, jsonBody } from "../lib/request-body";
import { HttpError } from "../lib/errors";
const migration = await readFile("prisma/migrations/202610070001_guardrails/migration.sql", "utf8");
async function setup() {
  const pg = await PGlite.create();
  await pg.exec('CREATE TABLE "Room" (id TEXT PRIMARY KEY); CREATE TABLE "Participant" (id TEXT PRIMARY KEY); CREATE TABLE "Account" (access_token TEXT, refresh_token TEXT, id_token TEXT, session_state TEXT);');
  await pg.exec(migration);
  const store: GuardStore = { transaction: work => pg.transaction(tx => work({
    query: async <T>(sql: string, ...values: unknown[]) => (await tx.query<T>(sql, values)).rows,
    execute: async (sql, ...values) => { const r = await tx.query(sql, values); return r.affectedRows || 0; },
  })) };
  async function policy(patch: Partial<Policy>) {
    const original = (await pg.query<{ config: Policy }>('SELECT config FROM "GuardrailPolicy"')).rows[0].config;
    await pg.query('UPDATE "GuardrailPolicy" SET config=$1', [JSON.stringify({ ...original, ...patch })]);
  }
  return { pg, store, policy };
}
const status = (code: number) => (error: unknown) => error instanceof HttpError && error.status === code;
test("missing, malformed, disabled policy and unavailable database deny before provider work", async () => {
  const { pg, store } = await setup(); let calls = 0;
  const invoke = async () => { await reserve(store, "ai", () => []); calls++; };
  try {
    await assert.rejects(invoke, status(503));
    await pg.exec('UPDATE "GuardrailPolicy" SET config=\'{}\'');
    await assert.rejects(invoke, status(503));
    await pg.exec('DELETE FROM "GuardrailPolicy"');
    await assert.rejects(invoke, status(503));
    await pg.close(); await assert.rejects(invoke, status(503));
    assert.equal(calls, 0);
  } finally { if (!pg.closed) await pg.close(); }
});
test("concurrent daily/monthly reservations enforce the shared ceiling and rollback all buckets", async () => {
  const { pg, store, policy } = await setup();
  try {
    const enabled = (await pg.query<{config:Policy}>('SELECT config FROM "GuardrailPolicy"')).rows[0].config.enabled;
    await policy({ enabled: { ...enabled, ai: true }, dailyAiCalls: 100, dailyAiTokens: 100, monthlyAiTokens: 60 });
    let providerCalls = 0;
    const results = await Promise.allSettled(Array.from({ length: 20 }, async () => {
      await reserve(store, "ai", p => globalCharges("ai", p, 10, new Date("2026-10-07T12:00:00Z"))); providerCalls++;
    }));
    assert.equal(providerCalls, 6);
    assert.equal(results.filter(r => r.status === "rejected").length, 14);
    const rows = (await pg.query<{key:string;used:number}>('SELECT key,used FROM "GuardrailBucket"')).rows;
    assert.equal(rows.find(r => r.key === "global:ai-calls:2026-10-07")?.used, 6);
    assert.equal(rows.find(r => r.key === "global:ai-tokens:2026-10-07")?.used, 60);
    assert.equal((await pg.query('SELECT * FROM "SecurityAudit" WHERE action=\'usage.threshold\'')).rows.length, 1);
  } finally { await pg.close(); }
});
test("shared user/IP counters reject excess requests; new time windows reset", async () => {
  const { pg, store } = await setup();
  try {
    await reserve(store, "rooms", () => [windowCharge("ip:one", 2, 60, 1, 1)]);
    await reserve(store, "rooms", () => [windowCharge("ip:one", 2, 60, 1, 2)]);
    await assert.rejects(() => reserve(store, "rooms", () => [windowCharge("ip:one", 2, 60, 1, 3)]), status(429));
    await reserve(store, "rooms", () => [windowCharge("ip:one", 2, 60, 1, 60001)]);
    await pg.exec('DELETE FROM "GuardrailLease" WHERE key=\'policy-lock\'');
    await assert.rejects(() => reserve(store, "rooms", () => []), status(503));
  } finally { await pg.close(); }
});
test("untrusted, malformed or multiple forwarded IPs fail closed", () => {
  assert.throws(() => requestIp(new Headers({ "x-forwarded-for": "1.2.3.4" }), { NODE_ENV: "production" }), status(503));
  assert.throws(() => requestIp(new Headers({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }), { NODE_ENV: "production", VERCEL: "1" }), status(503));
  assert.throws(() => requestIp(new Headers({ "x-forwarded-for": "bad" }), { VERCEL: "1" }), status(503));
  assert.equal(requestIp(new Headers({ "x-forwarded-for": "1.2.3.4" }), { VERCEL: "1" }), "1.2.3.4");
});
test("CAPTCHA errors, wrong hostname/action and replay all block protected work", async () => {
  const env = { TURNSTILE_SECRET_KEY: "synthetic", NEXTAUTH_URL: "https://study.invalid", NODE_ENV: "production" };
  for (const result of [{success:false},{success:true,hostname:"evil.invalid",action:"signup"},{success:true,hostname:"study.invalid",action:"login"}])
    await assert.rejects(() => verifyBot("token", "signup", "1.2.3.4", async () => Response.json(result), env));
  await assert.rejects(() => verifyBot("token", "signup", "1.2.3.4", async () => { throw new Error("offline"); }, env), status(503));
  let used = false;
  const fetcher = async () => { const success = !used; used = true; return Response.json({ success, hostname: "study.invalid", action: "signup" }); };
  await verifyBot("token", "signup", "1.2.3.4", fetcher, env);
  await assert.rejects(() => verifyBot("token", "signup", "1.2.3.4", fetcher, env), status(403));
});
test("body limits count actual bytes with absent or lying Content-Length", async () => {
  await assert.rejects(() => boundedBody(new Request("https://study.invalid", {method:"POST",body:"12345"}), 4), status(413));
  await assert.rejects(() => boundedBody(new Request("https://study.invalid", {method:"POST",headers:{"content-length":"1"},body:"12345"}), 4), status(413));
  await assert.rejects(() => jsonBody(new Request("https://study.invalid", {method:"POST",body:"{"})), status(400));
  assert.equal(new TextDecoder().decode(await boundedBody(new Request("https://study.invalid", {method:"POST",body:"1234"}),4)),"1234");
});


test("socket credentials expire and never accept session signing keys", async () => {
  const { roomToken, verifyRoomToken } = await import("../lib/tokens");
  const { SignJWT } = await import("jose");
  const previous = process.env.SOCKET_SIGNING_SECRET;
  process.env.SOCKET_SIGNING_SECRET = "isolated-socket-test-secret";
  try {
    const claims = await verifyRoomToken(await roomToken("room", "participant", "user"));
    assert.equal(claims.roomId, "room");
    assert.ok(claims.expiresAt > Date.now() && claims.expiresAt <= Date.now()+1800000);
    const expired = await new SignJWT({roomId:"room",participantId:"participant"}).setSubject("user").setProtectedHeader({alg:"HS256"}).setAudience("study-room-socket").setExpirationTime(1).sign(new TextEncoder().encode(process.env.SOCKET_SIGNING_SECRET));
    await assert.rejects(()=>verifyRoomToken(expired));
    delete process.env.SOCKET_SIGNING_SECRET;
    await assert.rejects(()=>roomToken("room","participant","user"));
  } finally { if(previous===undefined)delete process.env.SOCKET_SIGNING_SECRET;else process.env.SOCKET_SIGNING_SECRET=previous; }
});

test("OAuth identity storage strips unused provider credentials", async () => {
  const { minimizeProviderAccount } = await import("../lib/provider-secrets");
  const result = minimizeProviderAccount({provider:"google",providerAccountId:"identity",access_token:"secret",refresh_token:"secret",id_token:"secret",session_state:"secret"});
  assert.equal(result.providerAccountId,"identity");
  for(const key of ["access_token","refresh_token","id_token","session_state"])assert.equal(result[key],undefined);
});


test("PDF worker renders the page footer across the serialization boundary", async () => {
  const React = await import("react");
  const { Document, Page, Text } = await import("@react-pdf/renderer");
  const { renderPdf } = await import("../lib/pdf-render-worker");
  const document = React.createElement(Document, {}, React.createElement(Page, {}, React.createElement(Text, {render:({pageNumber,totalPages})=>`Page ${pageNumber} / ${totalPages}`})));
  const bytes = await renderPdf(document);
  assert.equal(bytes.subarray(0,5).toString(),"%PDF-");
});

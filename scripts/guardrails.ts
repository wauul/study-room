import "dotenv/config";
import fs from "node:fs/promises";
import { db } from "../lib/db";
import { policySchema } from "../lib/guardrail-core";
import { deleteRoom } from "../lib/deletion";
async function main() {
  const command = process.argv[2];
  if (command === "set") {
    const config = policySchema.parse(JSON.parse(await fs.readFile(process.argv[3], "utf8")));
    await db.$transaction(async tx => {
      await tx.$queryRaw`SELECT key FROM "GuardrailLease" WHERE key='policy-lock' FOR UPDATE`;
      await tx.guardrailPolicy.update({ where: { id: "default" }, data: { config } });
      await tx.securityAudit.create({ data: { action: "policy.updated" } });
    });
    console.log("Runtime policy updated.");
    return;
  }
  const policy = policySchema.parse((await db.guardrailPolicy.findUniqueOrThrow({ where: { id: "default" } })).config);
  if (command === "status" || command === "check") {
    const usage = await db.guardrailBucket.findMany({ where: { key: { startsWith: "global:" }, expiresAt: { gt: new Date() } }, select: { key: true, used: true, expiresAt: true } });
    if (command === "check") {
      const limits = { "ai-calls": policy.dailyAiCalls, "ai-tokens": policy.dailyAiTokens, email: policy.dailyEmails, uploads: policy.dailyUploads };
      const approaching = usage.filter(row => {
        const [,kind,period] = row.key.split(":");
        const limit = period.length === 7 ? (kind === "ai-tokens" ? policy.monthlyAiTokens : policy.monthlyEmails) : limits[kind as keyof typeof limits];
        return limit !== undefined && row.used >= limit * 0.8;
      });
      console.log(JSON.stringify({ approachingLimits: approaching }));
      if (approaching.length) process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify({ policy, usage }, null, 2)); return;
  }
  if (command === "retention") {
    const cutoff = new Date(Date.now() - policy.retentionDays * 86400_000);
    let deleted = 0;
    // Batches bound each job. Repeated runs drain backlog without one huge transaction.
    const rooms = await db.room.findMany({ where: { createdAt: { lt: cutoff } }, select: { id: true }, take: 50 });
    for (const room of rooms) { await db.$transaction(tx => deleteRoom(tx, room.id), { timeout: 30000 }); deleted++; }
    await db.guardrailBucket.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db.guardrailLease.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db.emailVerification.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db.roomInvitation.deleteMany({ where: { expiresAt: { lt: new Date() } } });
    await db.securityAudit.deleteMany({ where: { createdAt: { lt: cutoff } } });
    await db.newsletterSubscriber.deleteMany({ where: { unsubscribedAt: { lt: new Date(Date.now() - 30 * 86400_000) } } });
    console.log(JSON.stringify({ deletedRooms: deleted })); return;
  }
  throw new Error("Usage: tsx scripts/guardrails.ts status | check | set policy.json | retention");
}
main().catch(() => { console.error("Guardrail operation failed. Check configuration; no secrets are printed."); process.exitCode = 1; }).finally(() => db.$disconnect());

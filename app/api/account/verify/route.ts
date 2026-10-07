import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { apiError, checkOrigin } from "@/lib/http";
import { jsonBody } from "@/lib/request-body";
import { requestGuard, rateLimit, privateKey, requestIp, audit } from "@/lib/guardrails";
import { verifyBot } from "@/lib/bot";
import { sendMail } from "@/lib/mail";
export async function POST(req: Request) {
  try {
    checkOrigin(req); await requestGuard(req, "email", 5);
    const user = await requireUser();
    if (user.emailVerified) return Response.json({ ok: true });
    const { botToken } = z.object({ botToken: z.string().min(1).max(2048) }).parse(await jsonBody(req));
    await verifyBot(botToken, "verify", requestIp(req.headers));
    await rateLimit("email", `verify-user:${user.id}`, 1, 3600);
    await rateLimit("email", `verify-email:${user.email.toLowerCase()}`, 2, 86400);
    const token = randomBytes(32).toString("hex");
    const url = new URL("/verify", process.env.NEXTAUTH_URL); url.hash = token;
    await db.emailVerification.create({ data: { userId: user.id, tokenHash: privateKey(token), expiresAt: new Date(Date.now() + 3600_000) } });
    await sendMail({ to: user.email, subject: "Verify your Study Room email", text: `Confirm your email address using this link within one hour:\n\n${url}\n\nIf you did not request this, ignore this email.` }, `verify-${privateKey(token)}`);
    await audit("email.verification.request", user.id);
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}
export async function PATCH(req: Request) {
  try {
    checkOrigin(req); await requestGuard(req, "realtime", 10);
    const { token } = z.object({ token: z.string().regex(/^[a-f0-9]{64}$/) }).parse(await jsonBody(req));
    // One-use token, consumed and verified atomically. No login needed on the receiving device.
    const changed = await db.$transaction(async tx => {
      const tokens = await tx.$queryRaw<{ userId: string }[]>`DELETE FROM "EmailVerification" WHERE "tokenHash"=${privateKey(token)} AND "expiresAt">(NOW() AT TIME ZONE 'UTC') RETURNING "userId"`;
      if (!tokens.length) return false;
      await tx.user.update({ where: { id: tokens[0].userId }, data: { emailVerified: new Date() } });
      await tx.emailVerification.deleteMany({ where: { userId: tokens[0].userId } });
      await tx.securityAudit.create({ data: { action: "email.verified", actorId: tokens[0].userId } });
      return true;
    });
    if (!changed) return Response.json({ error: "This verification link has expired or was already used." }, { status: 400 });
    return Response.json({ ok: true });
  } catch (error) { return apiError(error); }
}

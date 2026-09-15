/** Explicit integration checks against a running deployment and real Neon.
 * Reuses ignored test credentials from the live-session test. Sends no emails. */
import "dotenv/config";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
const base = process.env.TEST_BASE_URL || "http://localhost:3000";
class Client {
  cookies = new Map<string, string>();
  async request(path: string, init: RequestInit = {}) {
    const r = await fetch(base + path, {
      ...init,
      headers: {
        ...init.headers,
        Cookie: [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; "),
      },
      redirect: "manual",
    });
    for (const cookie of r.headers.getSetCookie()) {
      const pair = cookie.split(";")[0];
      const i = pair.indexOf("=");
      this.cookies.set(pair.slice(0, i), pair.slice(i + 1));
    }
    return r;
  }
  async json(path: string, body?: unknown, method = "POST") {
    const r = await this.request(
      path,
      body === undefined
        ? {}
        : {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          },
    );
    const data = await r.json();
    assert.ok(r.ok, `${path}: ${JSON.stringify(data)}`);
    return data;
  }
  async login(email: string, password: string, register = true) {
    if (register) await this.json("/api/auth/register", { email, password });
    const { csrfToken } = await this.json("/api/auth/csrf");
    const r = await this.request("/api/auth/callback/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        email,
        password,
        csrfToken,
        callbackUrl: base,
        json: "true",
      }),
    });
    assert.ok(r.status < 400, "Credentials sign-in failed");
  }
}
import { db } from "../lib/db";
async function main() {
  const saved = JSON.parse(
    await fs.readFile(".tools/test-session.json", "utf8"),
  );
  const a = new Client();
  await a.login(saved.hostEmail, saved.password, false);
  const user = await db.user.findUniqueOrThrow({
    where: { email: saved.hostEmail },
  });
  const members = await db.participant.findMany({
    where: { userId: user.id },
    select: { roomId: true },
  });
  const allowed = new Set(members.map((m) => m.roomId));
  const publicResult = await (
    await fetch(base + "/api/search?q=biology")
  ).json();
  assert.ok(
    publicResult.results.every((r: any) => !r.href.startsWith("/rooms/")),
    "Anonymous search exposed private records",
  );
  const privateResult = await a.json("/api/search?q=biology");
  assert.ok(
    privateResult.results.some((r: any) => r.type === "Document"),
    "Expected own document match",
  );
  for (const r of privateResult.results) {
    const id = r.href.match(/^\/rooms\/([^/]+)/)?.[1];
    if (id) assert.ok(allowed.has(id), "Search exposed another room");
  }
  const notes = privateResult.results.find(
    (r: any) => r.type === "Document",
  ).href;
  assert.equal((await a.request(notes)).status, 200);
  const anonymousNotes = await (
    await fetch(base + notes, { redirect: "manual" })
  ).text();
  assert.ok(
    anonymousNotes.includes("/login?next=") ||
      anonymousNotes.includes("/login%3Fnext"),
    "Anonymous notes must redirect to sign in",
  );
  assert.ok(
    !anonymousNotes.includes("Your room library"),
    "Anonymous notes must not render library content",
  );
  assert.ok(
    (
      await (await fetch(base + "/api/search?q=confidence")).json()
    ).results.some((r: any) => r.type === "Journal"),
  );
  console.log(
    "Search: public/private isolation, own notes access, journal results passed",
  );
  const email = "newsletter-verification-" + Date.now() + "@example.com";
  const post = (body: any, path = "/api/newsletter") =>
    fetch(base + path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal((await post({ email, consent: false })).status, 400);
  assert.equal((await post({ email: "invalid", consent: true })).status, 400);
  assert.equal((await post({ email, consent: true })).status, 200);
  assert.equal((await post({ email, consent: true })).status, 200);
  assert.equal(await db.newsletterSubscriber.count({ where: { email } }), 1);
  const subscriber = await db.newsletterSubscriber.findUniqueOrThrow({
    where: { email },
  });
  assert.equal(
    (
      await post(
        { token: subscriber.unsubscribeToken },
        "/api/newsletter/unsubscribe",
      )
    ).status,
    200,
  );
  assert.ok(
    (await db.newsletterSubscriber.findUniqueOrThrow({ where: { email } }))
      .unsubscribedAt,
  );
  console.log(
    "Newsletter: validation, durable signup, deduplication, unsubscribe passed (no email sent)",
  );
  assert.equal((await fetch(base + "/a-page-that-does-not-exist")).status, 404);
  console.log("Custom 404 status passed");
}
main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());

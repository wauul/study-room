/** Explicit local/staging smoke; no study data or real AI requests are used. */
import assert from "node:assert/strict";
import { io } from "socket.io-client";
import { smokeEnabled } from "../lib/telemetry/smoke";
const base = process.env.TEST_BASE_URL || "http://localhost:3103";
const realtime = process.env.TEST_SOCKET_URL || "http://localhost:3104";
if (!smokeEnabled())
  throw new Error(
    "Synthetic telemetry smoke requires an explicitly configured non-production environment",
  );
const headers = { "x-study-smoke-token": process.env.SENTRY_SMOKE_TOKEN! };
for (const mode of ["server", "caught", "trace"]) {
  const response = await fetch(`${base}/api/telemetry-smoke?mode=${mode}`, {
    method: "POST",
    headers,
  });
  assert.equal(response.status, mode === "trace" ? 200 : 500);
  console.log(`Next.js ${mode}: HTTP ${response.status}`);
}
assert.equal(
  (await fetch(`${base}/api/telemetry-smoke`, { method: "POST" })).status,
  404,
);
const traceId = "3".repeat(32),
  parentId = "4".repeat(16);
const socket = io(realtime, {
  auth: { smokeToken: process.env.SENTRY_SMOKE_TOKEN },
  extraHeaders: { Origin: base },
  transports: ["websocket"],
});
try {
  await new Promise<void>((resolve, reject) => {
    socket.once("connect", () => resolve());
    socket.once("connect_error", reject);
  });
  const send = (mode: string) =>
    new Promise<{ ok: boolean }>((resolve, reject) => {
      socket
        .timeout(10_000)
        .emit(
          "telemetry-smoke",
          { mode },
          { sentryTrace: `${traceId}-${parentId}-1` },
          (error: Error | null, ack: { ok: boolean }) =>
            error ? reject(error) : resolve(ack),
        );
    });
  assert.equal((await send("error")).ok, false);
  await new Promise((resolve) => setTimeout(resolve, 300));
  assert.equal((await send("trace")).ok, true);
  console.log(
    `Socket error acknowledgement and explicit trace propagation passed. Trace: ${traceId}`,
  );
} finally {
  socket.disconnect();
}

import assert from "node:assert/strict";
import * as Sentry from "@sentry/node";
assert.equal(
  globalThis.__studyTelemetryReady,
  true,
  "Sentry preload must run before this entrypoint",
);
assert.equal(Sentry.getClient()?.getOptions().dataCollection?.userInfo, false);
assert.deepEqual(
  Sentry.getClient()?.getOptions().dataCollection?.httpBodies,
  [],
);
assert.equal(
  Sentry.getClient()?.getOptions().dataCollection?.genAI?.inputs,
  false,
);
assert.equal(
  process.env.SENTRY_AUTH_TOKEN,
  undefined,
  "Build credential must be removed before runtime",
);
await import("node:http");
await import("socket.io");
assert.ok(Sentry.getClient()?.getIntegrationByName("Http"));
await Sentry.close(500);
console.log(
  "Initialization preceded HTTP and Socket.io imports; upload secret absent.",
);

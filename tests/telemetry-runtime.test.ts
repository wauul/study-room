import test from "node:test";
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import { readFileSync, existsSync } from "node:fs";
import { SourceMap } from "node:module";

test("Node 22/tsx preloads telemetry before instrumented dependencies and removes the build secret", () => {
  const result = spawnSync(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      "./server/instrument.ts",
      "tests/fixtures/telemetry-order.ts",
    ],
    {
      encoding: "utf8",
      timeout: 60_000,
      env: {
        ...process.env,
        SENTRY_DSN: "https://public@example.invalid/1",
        SENTRY_AUTH_TOKEN: "synthetic-build-only",
        SENTRY_TRACES_SAMPLE_RATE: "0",
      },
    },
  );
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Initialization preceded/);
});

test("fatal realtime startup exits promptly even when the telemetry endpoint never responds", async () => {
  const envelopes: string[] = [];
  const blocked = createServer((request) => {
    let body = "";
    request.setEncoding("utf8");
    request.on("data", (chunk) => (body += chunk));
    request.on("end", () => envelopes.push(body));
    // Deliberately leave the response open to exercise bounded flushing.
  });
  blocked.listen(0, "127.0.0.1");
  await once(blocked, "listening");
  const port = (blocked.address() as { port: number }).port;
  const started = Date.now();
  const child = spawn(
    process.execPath,
    [
      "--import",
      "tsx",
      "--import",
      "./server/instrument.ts",
      "server/entry.mjs",
    ],
    {
      env: {
        ...process.env,
        SENTRY_DSN: `http://public@127.0.0.1:${port}/1`,
        SENTRY_ENVIRONMENT: "development",
        SENTRY_SMOKE_ENABLED: "true",
        SENTRY_SMOKE_ONLY: "true",
        SENTRY_SMOKE_TOKEN: "synthetic",
        SENTRY_TRACES_SAMPLE_RATE: "0",
        PORT: String(port),
        DATABASE_URL: "postgresql://unused:unused@127.0.0.1:1/unused",
      },
      stdio: "ignore",
    },
  );
  const guard = setTimeout(() => child.kill(), 20_000);
  try {
    const [code, signal] = await once(child, "exit");
    assert.equal(
      signal,
      null,
      "Fatal startup must exit itself without the test killing it",
    );
    assert.equal(code, 1);
    assert.ok(Date.now() - started < 15_000);
    assert.ok(
      envelopes.some((body) => body.includes('"operation":"realtime.startup"')),
    );
    assert.ok(envelopes.every((body) => !body.includes("postgresql://")));
  } finally {
    clearTimeout(guard);
    blocked.closeAllConnections();
    await new Promise<void>((resolve) => blocked.close(() => resolve()));
  }
});
test(
  "realtime build debug IDs match source maps and resolve to original TypeScript",
  { skip: !existsSync("dist/realtime/index.mjs.map") },
  () => {
    for (const name of ["index", "instrument"]) {
      const js = readFileSync(`dist/realtime/${name}.mjs`, "utf8");
      const map = JSON.parse(
        readFileSync(`dist/realtime/${name}.mjs.map`, "utf8"),
      );
      assert.match(map.debugId, /^[a-f0-9-]{36}$/);
      assert.ok(js.includes(map.debugId));
    }
    const js = readFileSync("dist/realtime/index.mjs", "utf8");
    const map = new SourceMap(
      JSON.parse(readFileSync("dist/realtime/index.mjs.map", "utf8")),
    );
    const offset = js.indexOf('throw new TypeError("Synthetic socket failure:');
    assert.ok(offset > 0);
    const lines = js.slice(0, offset).split("\n");
    const entry = map.findEntry(lines.length - 1, lines.at(-1)!.length);
    assert.ok("originalSource" in entry && "originalLine" in entry);
    assert.match(entry.originalSource || "", /server\/index\.ts$/);
    assert.ok(typeof entry.originalLine === "number");
  },
);

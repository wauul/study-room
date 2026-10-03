import { build, transform } from "esbuild";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { readFile, writeFile } from "node:fs/promises";
import { sentryRelease } from "./sentry-release.mjs";
const require = createRequire(import.meta.url);
const release = sentryRelease();
await build({
  entryPoints: ["server/index.ts", "server/instrument.ts"],
  outdir: "dist/realtime",
  outExtension: { ".js": ".mjs" },
  platform: "node",
  target: "node22",
  format: "esm",
  bundle: true,
  packages: "external",
  sourcemap: "external",
  sourcesContent: true,
  banner: { js: `process.env.SENTRY_RELEASE = ${JSON.stringify(release)};` },
});
const entry = await transform(
  (await readFile("server/entry.mjs", "utf8")).replace(
    'import("./index.ts")',
    'import("./index.mjs")',
  ),
  {
    sourcefile: "server/entry.mjs",
    format: "esm",
    target: "node22",
    sourcemap: "external",
    sourcesContent: true,
  },
);
await writeFile(
  "dist/realtime/entry.mjs",
  `${entry.code}\n//# sourceMappingURL=entry.mjs.map\n`,
);
await writeFile("dist/realtime/entry.mjs.map", entry.map);
// Injection is useful without credentials too: verify artifacts offline before deploying.
const cli = require("@sentry/cli").SentryCli.getPath();
execFileSync(cli, ["sourcemaps", "inject", "dist/realtime"], {
  stdio: "inherit",
});
if (process.env.SENTRY_AUTH_TOKEN) {
  if (!process.env.SENTRY_ORG || !process.env.SENTRY_PROJECT)
    throw new Error("Sentry source maps need SENTRY_ORG and SENTRY_PROJECT");
  execFileSync(
    cli,
    [
      "sourcemaps",
      "upload",
      "--release",
      release,
      "--dist",
      "realtime",
      "dist/realtime",
    ],
    { stdio: "inherit" },
  );
} else
  console.info(
    "Realtime maps generated; authenticated Sentry upload is not configured.",
  );

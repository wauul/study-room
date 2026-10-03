import "dotenv/config";
import * as Sentry from "@sentry/node";
import { telemetryOptions } from "../lib/telemetry/options";
// Render variables can be shared with the builder. Remove upload credentials before application code runs.
delete process.env.SENTRY_AUTH_TOKEN;
try {
  if (process.env.SENTRY_DSN)
    Sentry.init({
      ...telemetryOptions(process.env, "realtime"),
      // index.ts owns fatal exits and bounded flushing so app shutdown stays deterministic.
      integrations: (defaults) =>
        telemetryOptions(process.env, "realtime")
          .integrations(defaults)
          .filter(
            (i) =>
              i.name !== "OnUncaughtException" &&
              i.name !== "OnUnhandledRejection",
          ),
      enableOpenTelemetrySetup: true,
    });
} catch {
  console.warn("Realtime telemetry initialization unavailable");
}
// Used by a child-process test to prove preloading happened before dependencies.
globalThis.__studyTelemetryReady = true;

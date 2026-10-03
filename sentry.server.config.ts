import * as Sentry from "@sentry/nextjs";
import { telemetryOptions } from "./lib/telemetry/options";
// Do not let an invalid DSN or SDK initialization failure prevent server startup.
try {
  if (process.env.SENTRY_DSN)
    Sentry.init(
      telemetryOptions(
        {
          ...process.env,
          SENTRY_RELEASE: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
          SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
        },
        "web",
      ),
    );
} catch {
  console.warn("Web telemetry initialization unavailable");
}

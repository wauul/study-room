import * as Sentry from "@sentry/nextjs";
import { telemetryOptions } from "./lib/telemetry/options";
// Enumerate public values so server-only secrets cannot be bundled by Next.js.
const env = {
  NEXT_PUBLIC_SENTRY_DSN: process.env.NEXT_PUBLIC_SENTRY_DSN,
  NEXT_PUBLIC_SENTRY_ENVIRONMENT: process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT,
  NEXT_PUBLIC_SENTRY_RELEASE: process.env.NEXT_PUBLIC_SENTRY_RELEASE,
  NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE:
    process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE,
  NEXT_PUBLIC_SENTRY_TRACE_ORIGINS:
    process.env.NEXT_PUBLIC_SENTRY_TRACE_ORIGINS,
  NEXT_PUBLIC_SENTRY_LOGS_ENABLED: process.env.NEXT_PUBLIC_SENTRY_LOGS_ENABLED,
};
try {
  if (env.NEXT_PUBLIC_SENTRY_DSN)
    Sentry.init({
      ...telemetryOptions(env, "web", true),
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
    });
} catch {
  /* Optional telemetry. */
}
export const onRouterTransitionStart: typeof Sentry.captureRouterTransitionStart =
  (...args) => {
    // Stop before a private room path/query can enter raw replay metadata.
    void Sentry.getReplay()?.stop();
    Sentry.captureRouterTransitionStart(...args);
  };

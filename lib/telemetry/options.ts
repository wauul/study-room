import { withStaticSpan } from "@sentry/core";
import type { DataCollection } from "@sentry/core";
import {
  beforeSend,
  beforeSendTransaction,
  privacyIntegrations,
  scrubBreadcrumb,
  scrubLog,
  scrubSpan,
} from "./privacy";

type Env = Record<string, string | undefined>;
export function environment(
  env: Env,
): "development" | "preview" | "production" {
  const value =
    env.SENTRY_ENVIRONMENT ||
    env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
    env.VERCEL_ENV;
  return value === "production" || value === "preview" ? value : "development";
}
export function sampleRate(
  value: string | undefined,
  fallback: number,
): number {
  if (!value?.trim()) return fallback;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 1
    ? number
    : fallback;
}
export function trustedOrigins(value: string | undefined): RegExp[] {
  return (value || "").split(",").flatMap((raw) => {
    try {
      const url = new URL(raw.trim());
      if (
        url.protocol !== "https:" &&
        !(
          url.protocol === "http:" &&
          /^(localhost|127\.0\.0\.1)$/.test(url.hostname)
        )
      )
        return [];
      if (url.username || url.password) return [];
      return [
        new RegExp(
          `^${url.origin.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?:/|$)`,
        ),
      ];
    } catch {
      return [];
    }
  });
}
export function telemetryOptions(
  env: Env,
  service: "web" | "realtime",
  browser = false,
) {
  const stage = environment(env);
  const dsn = browser ? env.NEXT_PUBLIC_SENTRY_DSN : env.SENTRY_DSN;
  return {
    dsn: dsn || undefined,
    enabled: !!dsn,
    environment: stage,
    release: env.SENTRY_RELEASE || env.NEXT_PUBLIC_SENTRY_RELEASE || undefined,
    dist: service,
    sendDefaultPii: false,
    // SDK 11 replaced sendDefaultPii; explicitly opt out at collection time too.
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
      frameContextLines: 0,
    } satisfies DataCollection,
    includeServerName: false,
    // Static lifecycle lets the final transaction hook scrub root spans and metadata too.
    traceLifecycle: "static" as const,
    tracesSampleRate: sampleRate(
      browser
        ? env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
        : env.SENTRY_TRACES_SAMPLE_RATE,
      stage === "production" ? 0.05 : stage === "preview" ? 0.1 : 1,
    ),
    tracePropagationTargets: trustedOrigins(
      browser ? env.NEXT_PUBLIC_SENTRY_TRACE_ORIGINS : env.SENTRY_TRACE_ORIGINS,
    ),
    enableLogs:
      (browser
        ? env.NEXT_PUBLIC_SENTRY_LOGS_ENABLED
        : env.SENTRY_LOGS_ENABLED) === "true",
    beforeSendLog: scrubLog,
    beforeSendMetric: () => null,
    profilesSampleRate: 0,
    beforeSend,
    beforeSendTransaction,
    beforeSendSpan: withStaticSpan(scrubSpan),
    beforeBreadcrumb: scrubBreadcrumb,
    integrations: privacyIntegrations,
    maxBreadcrumbs: 20,
    normalizeDepth: 3,
    initialScope: { tags: { service } },
  };
}

/** Smoke triggers are synthetic, explicitly enabled, and never available in production. */
export function smokeEnabled(
  env: Record<string, string | undefined> = process.env,
) {
  return (
    env.SENTRY_SMOKE_ENABLED === "true" &&
    !!env.SENTRY_SMOKE_TOKEN &&
    (env.SENTRY_ENVIRONMENT === "development" ||
      env.SENTRY_ENVIRONMENT === "preview") &&
    env.VERCEL_ENV !== "production"
  );
}
export function smokeAuthorized(request: Request) {
  return (
    smokeEnabled() &&
    request.headers.get("x-study-smoke-token") ===
      process.env.SENTRY_SMOKE_TOKEN
  );
}

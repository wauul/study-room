import * as Sentry from "@sentry/node";
// Catch module-evaluation failures as well as index.ts's explicit startup failures.
try { await import("./index.ts"); }
catch (error) {
  const deadline = setTimeout(() => process.exit(1), 3000);
  try {
    Sentry.withIsolationScope(scope => {
      scope.setTag("service", "realtime");
      scope.setTag("operation", "realtime.startup");
      Sentry.captureException(error);
    });
    await Sentry.flush(2000);
  } finally { clearTimeout(deadline); process.exit(1); }
}

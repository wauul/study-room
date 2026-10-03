import * as Sentry from "@sentry/core";
import {
  expectedError,
  safeAttributes,
  safeOperation,
} from "./telemetry/privacy";

/** Explicitly mark user/validation failures at their origin, not by matching arbitrary error text. */
export class ExpectedError extends Error {
  readonly expected = true;
}
const reported = new WeakSet<object>();
export function captureFailure(error: unknown, operation: string) {
  if (expectedError(error)) return;
  if (error && typeof error === "object") {
    if (reported.has(error)) return;
    reported.add(error);
  }
  try {
    Sentry.withScope((scope) => {
      scope.setTag("operation", safeOperation(operation));
      Sentry.captureException(error);
    });
  } catch {
    /* Telemetry cannot change the application outcome. */
  }
}
export function operation<T>(
  name: string,
  attributes: Record<string, unknown>,
  work: () => T,
): T {
  return Sentry.startSpan(
    {
      name: safeOperation(name),
      op: safeOperation(name),
      attributes: safeAttributes(attributes),
    },
    work,
  );
}
export function isolatedOperation<T>(name: string, work: () => T): T {
  const client = Sentry.getClient();
  const isolated = new Sentry.Scope();
  isolated.setClient(client);
  const current = new Sentry.Scope();
  current.setClient(client);
  return Sentry.withIsolationScope(isolated, (scope) => {
    // A socket callback or detached timer must never inherit another user's identity.
    scope.setTag("service", "realtime");
    scope.setTag("operation", safeOperation(name));
    return Sentry.withScope(current, () => {
      return Sentry.startNewTrace(() => operation(name, {}, work));
    });
  });
}

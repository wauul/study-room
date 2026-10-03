import * as Sentry from "@sentry/core";
import { operation } from "../telemetry";

const tracePattern = /^[a-f0-9]{32}-[a-f0-9]{16}(?:-[01])?$/;
export function socketTrace(target: string): { sentryTrace?: string } {
  // Never send telemetry metadata to a URL that was not explicitly trusted.
  const allowed =
    Sentry.getClient()?.getOptions().tracePropagationTargets || [];
  try {
    if (
      !allowed.some((rule) =>
        typeof rule === "string"
          ? new URL(target).origin === rule
          : rule.test(target),
      )
    )
      return {};
  } catch {
    return {};
  }
  const value = Sentry.getTraceData()["sentry-trace"];
  return typeof value === "string" && tracePattern.test(value)
    ? { sentryTrace: value }
    : {};
}
export function socketOperation<T>(
  name: string,
  incoming: unknown,
  trusted: boolean,
  work: () => T,
): T {
  const client = Sentry.getClient();
  const isolation = new Sentry.Scope();
  isolation.setClient(client);
  isolation.setTag("service", "realtime");
  isolation.setTag("operation", name);
  const current = new Sentry.Scope();
  current.setClient(client);
  const trace =
    trusted &&
    incoming &&
    typeof incoming === "object" &&
    "sentryTrace" in incoming
      ? incoming.sentryTrace
      : undefined;
  return Sentry.withIsolationScope(isolation, () =>
    Sentry.withScope(current, () =>
      Sentry.withActiveSpan(null, () =>
        typeof trace === "string" && tracePattern.test(trace)
          ? Sentry.continueTrace(
              { sentryTrace: trace, baggage: undefined },
              () => operation(name, {}, work),
            )
          : Sentry.startNewTrace(() => operation(name, {}, work)),
      ),
    ),
  );
}

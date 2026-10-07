import type {
  Breadcrumb,
  ErrorEvent,
  EventHint,
  Integration,
  Log,
  SpanJSON,
  TransactionEvent,
} from "@sentry/core";

const operations = new Set([
  "http.request",
  "guardrail.threshold",
  "react.error",
  "react.global-error",
  "auth.database",
  "pdf.parse",
  "document.ingest",
  "embedding.generate",
  "embedding.tokenize",
  "retrieval.search",
  "retrieval.rerank",
  "ai.structured",
  "ai.generation",
  "ai.first-token",
  "quiz.generate",
  "summary.generate",
  "pdf.export",
  "email.send",
  "realtime.startup",
  "realtime.shutdown",
  "realtime.authenticate",
  "realtime.heatmap",
  "quiz.reveal",
  "socket.join-room",
  "socket.leave-room",
  "socket.ask-question",
  "socket.lost-click",
  "socket.quiz-question-start",
  "socket.quiz-submit",
  "socket.end-session",
  "telemetry.smoke",
  "socket.telemetry-smoke",
]);
const types = new Set([
  "Error",
  "TypeError",
  "RangeError",
  "SyntaxError",
  "ReferenceError",
  "AggregateError",
  "PrismaClientKnownRequestError",
  "PrismaClientUnknownRequestError",
  "PrismaClientInitializationError",
  "PrismaClientValidationError",
  "APIError",
  "InternalServerError",
  "RateLimitError",
  "AuthenticationError",
  "PermissionDeniedError",
  "NotFoundError",
  "BadRequestError",
  "UnprocessableEntityError",
  "ZodError",
  "HttpError",
]);
export const safeOperation = (value: unknown) =>
  typeof value === "string" && operations.has(value) ? value : "http.request";
export const safeErrorType = (value: unknown) =>
  typeof value === "string" && types.has(value) ? value : "Error";

/** Never retain a raw path segment: room IDs are invite tokens. */
export function safeRoute(input: unknown): string {
  if (typeof input !== "string") return "/[redacted]";
  let pathname: string;
  try {
    pathname = new URL(input, "https://application.invalid").pathname;
  } catch {
    return "/[redacted]";
  }
  if (/^\/(?:api\/)?rooms(?:\/|$)/.test(pathname)) {
    const match = pathname.match(/^\/(api\/)?rooms(?:\/([^/]+))?(.*)$/)!;
    const tail = match[3];
    const suffix = new Set([
      "",
      "/notes",
      "/summary",
      "/join",
      "/documents",
      "/messages",
      "/study-focus",
      "/summary/pdf",
      "/summary/email",
    ]);
    return `/${match[1] || ""}rooms${match[2] ? (match[2] === "new" ? "/new" : "/[id]") : ""}${suffix.has(tail) ? tail : "/[redacted]"}`;
  }
  if (/^\/api\/auth\//.test(pathname)) return "/api/auth/[action]";
  if (/^\/guides\//.test(pathname)) return "/guides/[slug]";
  return new Set([
    "/",
    "/login",
    "/privacy",
    "/help",
    "/search",
    "/guides",
    "/unsubscribe",
    "/api/search",
    "/api/newsletter",
    "/api/newsletter/unsubscribe",
    "/health",
    "/socket.io/",
    "/api/telemetry-smoke",
    "/telemetry-smoke",
  ]).has(pathname)
    ? pathname
    : "/[redacted]";
}
function safeSource(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  // Preserve generated bundle names and repository source paths for debug-ID mapping.
  const clean = input.split(/[?#]/)[0].replace(/\\/g, "/");
  if (clean.includes("/_next/"))
    return `app:///_next/${clean.split("/_next/")[1]}`;
  const match = clean.match(
    /(?:^|\/)((?:app|lib|server|components|dist|node_modules)\/[\w./@()\[\]-]+\.[cm]?[jt]sx?)$/,
  );
  if (match) return `app:///${match[1]}`;
  if (/^(?:webpack-internal|webpack):/.test(clean)) {
    const source = clean.match(
      /((?:app|lib|server|components)\/[\w./@()\[\]-]+\.[jt]sx?)$/,
    );
    if (source) return `app:///${source[1]}`;
  }
  return undefined;
}
export function expectedError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; digest?: string; expected?: boolean };
  return (
    e.expected === true ||
    e.name === "AbortError" ||
    e.name === "CanceledError" ||
    (typeof e.digest === "string" &&
      /^(NEXT_REDIRECT|NEXT_NOT_FOUND|NEXT_HTTP_ERROR_FALLBACK)/.test(e.digest))
  );
}
export function safeAttributes(
  input: Record<string, unknown> | undefined,
): Record<string, string | number | boolean> {
  const result: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(input || {})) {
    if (
      new Set([
        "count",
        "chunks",
        "tokens",
        "frames",
        "duration_ms",
        "ttft_ms",
        "http.response.status_code",
        "sentry.sample_rate",
      ]).has(key) &&
      typeof value === "number" &&
      Number.isFinite(value)
    )
      result[key] = value;
    if (key === "operation") result[key] = safeOperation(value);
    if (
      key === "provider" &&
      new Set(["groq", "local", "resend"]).has(String(value))
    )
      result[key] = String(value);
    if (
      key === "model" &&
      new Set([
        "openai/gpt-oss-20b",
        "openai/gpt-oss-120b",
        "Xenova/all-MiniLM-L6-v2",
        "Xenova/ms-marco-MiniLM-L-6-v2",
      ]).has(String(value))
    )
      result[key] = String(value);
    if (
      key === "http.request.method" &&
      /^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)$/.test(String(value))
    )
      result[key] = String(value);
    if (key === "http.route") result[key] = safeRoute(value);
    if (
      key === "sentry.origin" &&
      typeof value === "string" &&
      /^(auto|manual)(\.[a-z_-]+){0,5}$/.test(value)
    )
      result[key] = value;
    if (key === "sentry.source" || key === "sentry.segment.name.source")
      result[key] = "route";
    if (key === "sentry.op" && typeof value === "string")
      result[key] = operations.has(value)
        ? value
        : value.startsWith("http")
          ? "http.client"
          : value.startsWith("db")
            ? "db"
            : "app.operation";
    if (key === "sentry.segment.name") result[key] = safeRoute(value);
  }
  return result;
}
export function scrubBreadcrumb(b: Breadcrumb): Breadcrumb | null {
  if (!new Set(["http", "navigation", "app.operation"]).has(b.category || ""))
    return null;
  return {
    timestamp: b.timestamp,
    type: b.type,
    category: b.category,
    data:
      b.category === "navigation"
        ? { from: safeRoute(b.data?.from), to: safeRoute(b.data?.to) }
        : safeAttributes(b.data),
  };
}
export function scrubSpan(span: SpanJSON): SpanJSON {
  const data = safeAttributes(span.data);
  const operation = safeOperation(span.description);
  return {
    trace_id: span.trace_id,
    span_id: span.span_id,
    parent_span_id: span.parent_span_id,
    start_timestamp: span.start_timestamp,
    timestamp: span.timestamp,
    status: span.status,
    description: operations.has(span.description || "")
      ? operation
      : safeRoute(span.description),
    op: operations.has(span.op || "")
      ? span.op
      : span.op?.startsWith("http")
        ? "http.client"
        : span.op?.startsWith("db")
          ? "db"
          : "app.operation",
    data,
  };
}
function scrubEvent<T extends ErrorEvent | TransactionEvent>(event: T): T {
  const trace = event.contexts?.trace;
  const tags: Record<string, string> = {};
  if (event.tags?.service === "web" || event.tags?.service === "realtime")
    tags.service = event.tags.service;
  if (event.tags?.operation)
    tags.operation = safeOperation(event.tags.operation);
  const result = {
    event_id: event.event_id,
    timestamp: event.timestamp,
    start_timestamp:
      "start_timestamp" in event ? event.start_timestamp : undefined,
    type: event.type,
    platform: event.platform,
    level: event.level,
    release: /^study-room@(?:[a-f0-9]{7,40}|local)$/.test(event.release || "")
      ? event.release
      : undefined,
    environment: ["production", "preview", "development"].includes(
      event.environment || "",
    )
      ? event.environment
      : undefined,
    dist:
      event.dist === "web" || event.dist === "realtime"
        ? event.dist
        : undefined,
    sdk: event.sdk
      ? { name: event.sdk.name, version: event.sdk.version }
      : undefined,
    debug_meta: event.debug_meta
      ? {
          images: event.debug_meta.images?.flatMap((image) => {
            if (
              image.type !== "sourcemap" ||
              !("debug_id" in image) ||
              !/^[a-f0-9-]{36}$/.test(image.debug_id || "")
            )
              return [];
            const code_file = safeSource(image.code_file);
            return code_file
              ? [
                  {
                    type: "sourcemap" as const,
                    debug_id: image.debug_id,
                    code_file,
                  },
                ]
              : [];
          }),
        }
      : undefined,
    tags,
    transaction: event.transaction
      ? operations.has(event.transaction)
        ? event.transaction
        : safeRoute(
            event.transaction.replace(/^(GET|POST|PUT|DELETE|PATCH) /, ""),
          )
      : undefined,
    transaction_info: { source: "route" },
    contexts: trace
      ? {
          trace: {
            trace_id: trace.trace_id,
            span_id: trace.span_id,
            parent_span_id: trace.parent_span_id,
            op: "app.operation",
            status: trace.status,
            data: safeAttributes(trace.data as Record<string, unknown>),
          },
        }
      : undefined,
    request: event.request
      ? { method: event.request.method, url: safeRoute(event.request.url) }
      : undefined,
    breadcrumbs: event.breadcrumbs?.map(scrubBreadcrumb).filter(Boolean),
    exception: event.exception
      ? {
          values: event.exception.values?.map((value) => ({
            type: safeErrorType(value.type),
            value: "[Exception text removed for study privacy]",
            mechanism: value.mechanism
              ? { type: "generic", handled: value.mechanism.handled }
              : undefined,
            stacktrace: value.stacktrace
              ? {
                  frames: value.stacktrace.frames?.map((frame) => ({
                    filename: safeSource(frame.filename),
                    abs_path: safeSource(frame.abs_path),
                    function:
                      typeof frame.function === "string" &&
                      /^[\w.$<> ()\[\]-]{1,120}$/.test(frame.function)
                        ? frame.function
                        : undefined,
                    lineno: frame.lineno,
                    colno: frame.colno,
                    in_app: frame.in_app,
                  })),
                }
              : undefined,
          })),
        }
      : undefined,
    ...("spans" in event ? { spans: event.spans?.map(scrubSpan) } : {}),
  };
  return result as T;
}
export function beforeSend(
  event: ErrorEvent,
  hint: EventHint,
): ErrorEvent | null {
  hint.attachments = [];
  return expectedError(hint.originalException) ? null : scrubEvent(event);
}
export const beforeSendTransaction = (event: TransactionEvent) =>
  scrubEvent(event);
export function scrubLog(log: Log): Log | null {
  // Only explicit low-cardinality application logs are accepted. No console forwarding.
  if (!operations.has(log.message)) return null;
  return {
    level: log.level,
    attributes: safeAttributes(log.attributes),
    message: safeOperation(log.message),
  };
}
const safeIntegrations = new Set([
  "EventFilters",
  "InboundFilters",
  "FunctionToString",
  "LinkedErrors",
  "Dedupe",
  "Http",
  "NodeFetch",
  "GlobalHandlers",
  "BrowserApiErrors",
  "TryCatch",
  "BrowserTracing",
  "Nextjs",
  "OnUncaughtException",
  "OnUnhandledRejection",
  "RewriteFrames",
  "Replay",
]);
safeIntegrations.add("DistDirRewriteFrames");
safeIntegrations.add("NextjsClientStackFrameNormalization");
export const privacyIntegrations = (integrations: Integration[]) =>
  integrations.filter((i) => safeIntegrations.has(i.name));

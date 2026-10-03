import test from "node:test";
import assert from "node:assert/strict";
import * as Sentry from "@sentry/node";
import type { Envelope, ErrorEvent, TransactionEvent } from "@sentry/core";
import {
  beforeSend,
  beforeSendTransaction,
  privacyIntegrations,
  safeRoute,
  scrubLog,
  scrubSpan,
} from "../lib/telemetry/privacy";
import {
  telemetryOptions,
  sampleRate,
  trustedOrigins,
} from "../lib/telemetry/options";
import {
  captureFailure,
  ExpectedError,
  isolatedOperation,
} from "../lib/telemetry";
import { socketOperation, socketTrace } from "../lib/telemetry/socket";
import { smokeEnabled } from "../lib/telemetry/smoke";
import {
  replayAllowed,
  replayPrivacyOptions,
} from "../lib/telemetry/replay-policy";

const secrets = [
  "private-study-sentinel",
  "person@example.invalid",
  "postgresql://user:password@neon.invalid/db",
  "gsk_private_key",
  "re_private_key",
  "Bearer privateJWT",
  "oauth-private-secret",
  "private-invite-token",
  "Private Exam.pdf",
];
const privateText = secrets.join(" ");
const frames = [
  {
    filename:
      "https://study.invalid/_next/static/chunks/app/page-a123.js?token=private-invite-token",
    lineno: 10,
    colno: 4,
    context_line: privateText,
    pre_context: [privateText],
    post_context: [privateText],
    vars: { password: privateText },
  },
];
function assertPrivate(value: unknown) {
  const json = JSON.stringify(value);
  for (const secret of secrets)
    assert.equal(json.includes(secret), false, `Leaked ${secret}`);
}
test("errors, URLs, source context, breadcrumbs and arbitrary fields are scrubbed", () => {
  const event: ErrorEvent = {
    type: undefined,
    event_id: "123",
    message: privateText,
    user: { id: privateText, email: secrets[1], ip_address: "127.0.0.1" },
    request: {
      url: "https://study.invalid/rooms/private-invite-token/notes?q=private-study-sentinel",
      headers: { authorization: secrets[5], cookie: privateText },
      data: privateText,
    },
    extra: { question: privateText, report: privateText },
    tags: { service: "web", operation: "pdf.export", email: secrets[1] },
    contexts: {
      ai: { prompt: privateText },
      trace: {
        trace_id: "a".repeat(32),
        span_id: "b".repeat(16),
        data: { "db.statement": privateText, count: 2 },
      },
    },
    exception: {
      values: [
        { type: "TypeError", value: privateText, stacktrace: { frames } },
      ],
    },
    breadcrumbs: [
      { category: "console", message: privateText },
      {
        category: "navigation",
        data: {
          to: "/unsubscribe?token=private-invite-token",
          question: privateText,
        },
      },
    ],
    debug_meta: {
      images: [
        {
          type: "sourcemap",
          code_file: frames[0].filename,
          debug_id: "11111111-1111-4111-8111-111111111111",
        },
      ],
    },
  };
  const result = beforeSend(event, {
    originalException: new TypeError(privateText),
  })!;
  assertPrivate(result);
  assert.equal(result.exception?.values?.[0].type, "TypeError");
  assert.equal(
    result.exception?.values?.[0].stacktrace?.frames?.[0].lineno,
    10,
  );
  assert.equal(result.request?.url, "/rooms/[id]/notes");
  assert.equal(
    result.debug_meta?.images?.[0].code_file,
    result.exception?.values?.[0].stacktrace?.frames?.[0].filename,
  );
  assert.equal(result.user, undefined);
});
test("root transactions, child spans, SQL, AI content, URLs and logs are scrubbed", () => {
  const span = {
    trace_id: "a".repeat(32),
    span_id: "b".repeat(16),
    status: "ok",
    start_timestamp: 1,
    timestamp: 2,
    description: privateText,
    op: "db.query",
    data: {
      "db.statement": privateText,
      "gen_ai.prompt": privateText,
      count: 2,
    },
    links: [
      {
        trace_id: "c".repeat(32),
        span_id: "d".repeat(16),
        attributes: { answer: privateText },
      },
    ],
  };
  assertPrivate(scrubSpan(span));
  assert.equal(scrubSpan(span).data.count, 2);
  const transaction: TransactionEvent = {
    type: "transaction",
    transaction: "/rooms/private-invite-token?q=private-study-sentinel",
    spans: [span],
    extra: { report: privateText },
  };
  assertPrivate(beforeSendTransaction(transaction));
  assert.equal(scrubLog({ level: "info", message: privateText }), null);
  assertPrivate(
    scrubLog({
      level: "info",
      message: "email.send",
      attributes: { email: privateText, count: 1 },
    }),
  );
});
test("validation, cancellation, navigation and unauthorized requests are excluded", () => {
  for (const error of [
    new ExpectedError("User input"),
    Object.assign(new Error(), { name: "AbortError" }),
    Object.assign(new Error(), { status: 401, expected: true }),
    Object.assign(new Error(), {
      digest: "NEXT_REDIRECT;replace;/private;307",
    }),
  ]) {
    assert.equal(
      beforeSend({ type: undefined }, { originalException: error }),
      null,
    );
  }
  assert.notEqual(
    beforeSend(
      { type: undefined },
      { originalException: Object.assign(new Error(), { status: 503 }) },
    ),
    null,
  );
  assert.notEqual(
    beforeSend(
      { type: undefined },
      {
        originalException: Object.assign(new Error(), {
          name: "AuthenticationError",
          status: 401,
        }),
      },
    ),
    null,
  );
});
test("sampling, runtime flags and trusted propagation targets fail closed", () => {
  assert.equal(sampleRate("2", 0.05), 0.05);
  assert.equal(sampleRate("0", 0.05), 0);
  const options = telemetryOptions({ SENTRY_ENVIRONMENT: "production" }, "web");
  assert.equal(options.enabled, false);
  assert.equal(options.sendDefaultPii, false);
  assert.equal(options.dataCollection.userInfo, false);
  assert.equal(options.dataCollection.httpHeaders, false);
  assert.deepEqual(options.dataCollection.httpBodies, []);
  assert.equal(options.dataCollection.genAI.outputs, false);
  assert.equal(options.dataCollection.databaseQueryData, false);
  assert.equal(options.tracesSampleRate, 0.05);
  assert.equal(options.profilesSampleRate, 0);
  const targets = trustedOrigins(
    "https://study.invalid,http://localhost:3101,http://untrusted.invalid,https://username:secret@study.invalid",
  );
  assert.equal(targets.length, 2);
  assert.equal(
    targets.some((t) => t.test("https://study.invalid.evil.invalid/")),
    false,
  );
  assert.equal(
    targets.some((t) => t.test("https://study.invalid/api/rooms")),
    true,
  );
  assert.equal(
    smokeEnabled({
      SENTRY_SMOKE_ENABLED: "true",
      SENTRY_SMOKE_TOKEN: "test",
      SENTRY_ENVIRONMENT: "production",
    }),
    false,
  );
  assert.equal(
    smokeEnabled({
      SENTRY_SMOKE_ENABLED: "true",
      SENTRY_SMOKE_TOKEN: "test",
      SENTRY_ENVIRONMENT: "preview",
      VERCEL_ENV: "production",
    }),
    false,
  );
  assert.equal(
    smokeEnabled({
      SENTRY_SMOKE_ENABLED: "true",
      SENTRY_SMOKE_TOKEN: "test",
      SENTRY_ENVIRONMENT: "development",
    }),
    true,
  );
  assert.equal(
    safeRoute("/rooms/secret/summary/pdf?jwt=secret"),
    "/rooms/[id]/summary/pdf",
  );
  const integrations = [
    "Prisma",
    "Postgres",
    "Groq",
    "OpenAI",
    "LocalVariables",
    "ContextLines",
    "Console",
    "RequestData",
    "Http",
    "Nextjs",
  ].map((name) => ({ name }));
  assert.deepEqual(
    privacyIntegrations(integrations).map((i) => i.name),
    ["Http", "Nextjs"],
  );
});
test("replay refuses private paths or query strings and drops custom recording data", () => {
  assert.equal(
    replayAllowed({
      pathname: "/rooms/private-invite-token",
      search: "",
      hash: "",
    }),
    false,
  );
  assert.equal(
    replayAllowed({
      pathname: "/help",
      search: "?q=private-study-sentinel",
      hash: "",
    }),
    false,
  );
  assert.equal(
    replayAllowed({ pathname: "/help", search: "", hash: "" }),
    true,
  );
  assert.equal(replayPrivacyOptions.beforeAddRecordingEvent(), null);
  assert.equal(replayPrivacyOptions.networkCaptureBodies, false);
  assert.equal(replayPrivacyOptions.maskAllInputs, true);
  assert.deepEqual(replayPrivacyOptions.networkDetailAllowUrls, []);
});

test("real SDK envelopes preserve independent concurrent scopes, dedupe and socket parent traces", async () => {
  const envelopes: Envelope[] = [];
  const client = Sentry.init({
    ...telemetryOptions(
      {
        SENTRY_DSN: "https://public@example.invalid/1",
        SENTRY_ENVIRONMENT: "development",
        SENTRY_RELEASE: "study-room@1234567",
        SENTRY_TRACE_ORIGINS: "https://study.invalid",
      },
      "realtime",
    ),
    enableOpenTelemetrySetup: true,
    transport: () => ({
      send: async (envelope) => {
        envelopes.push(envelope);
        return { statusCode: 200 };
      },
      flush: async () => true,
    }),
  });
  Sentry.setUser({ id: "outer-private-user", email: secrets[1] });
  Sentry.setTag("operation", "summary.generate");
  const cases = [
    ["socket.ask-question", 15],
    ["socket.quiz-submit", 2],
  ] as const;
  await Promise.all(
    cases.map(([name, delay]) =>
      socketOperation(name, {}, true, async () => {
        assert.deepEqual(Sentry.getIsolationScope().getUser(), {});
        assert.deepEqual(Sentry.getCurrentScope().getUser(), {});
        assert.equal(
          Sentry.getIsolationScope().getScopeData().tags.operation,
          name,
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        const error = new TypeError(privateText);
        captureFailure(error, name);
        captureFailure(error, name);
      }),
    ),
  );
  const parentTrace = "1".repeat(32),
    parentSpan = "2".repeat(16);
  await socketOperation(
    "socket.join-room",
    { sentryTrace: `${parentTrace}-${parentSpan}-1`, baggage: privateText },
    true,
    async () => {
      const context = Sentry.getActiveSpan()!.spanContext();
      assert.equal(context.traceId, parentTrace);
    },
  );
  await isolatedOperation("quiz.reveal", async () => {
    assert.deepEqual(Sentry.getIsolationScope().getUser(), {});
    await Promise.resolve();
  });
  assert.deepEqual(socketTrace("https://untrusted.invalid"), {});
  await client!.flush(2000);
  const events = envelopes.flatMap((envelope) =>
    envelope[1]
      .filter((item) => item[0].type === "event")
      .map((item) => item[1] as ErrorEvent),
  );
  assert.equal(events.length, 2);
  assert.deepEqual(
    events.map((e) => e.tags?.operation).sort(),
    cases.map(([name]) => name).sort(),
  );
  for (const event of events) {
    assertPrivate(event);
    assert.equal(event.tags?.service, "realtime");
    assert.equal(event.user, undefined);
  }
  const transactions = envelopes.flatMap((envelope) =>
    envelope[1]
      .filter((item) => item[0].type === "transaction")
      .map((item) => item[1] as TransactionEvent),
  );
  assert.ok(
    transactions.some(
      (t) =>
        t.contexts?.trace?.trace_id === parentTrace &&
        t.contexts.trace.parent_span_id === parentSpan,
    ),
  );
  assertPrivate(envelopes);
  assert.equal(JSON.stringify(envelopes).includes("outer-private-user"), false);
  Sentry.setUser(null);
  await client!.close(2000);
});

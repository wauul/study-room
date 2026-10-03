# Sentry operations

## Services and SDK compatibility

The organization is `study-room-iq` (EU region). Use `study-room-web` (Next.js) and `study-room-realtime` (Node.js) as separate projects. Both use stable Sentry SDK 11.4.0. It supports Next.js 15.5.24 and requires Node 22.12 or newer on the Node 22 line; Render is pinned to 22.16.0. Local verification uses Node 22.23.3.

Browser initialization uses `instrumentation-client.ts` and navigation tracing uses `onRouterTransitionStart`. Server and edge initialization use `instrumentation.ts`; `onRequestError` captures Server Component and uncaught request errors. Route handlers are automatically instrumented by the Next.js wrapper. There are no application Server Actions in this checkout; wrap any added later with `withServerActionInstrumentation`. `app/error.tsx` preserves translations and recovery links. `app/global-error.tsx` renders its own HTML/body and can recover without the root layout or LanguageProvider. Client boundaries leave digested server errors to `onRequestError` to avoid reporting the same failure twice.

SDK 11 separates the build helper into `@sentry/nextjs/config`. `next.config.mjs` preserves tracing includes and external packages. AI/database dependency instrumentation is disabled at build time and removed from runtime integrations.

Next's SDK isolates requests. Each Socket.io event runs with fresh current and isolation scopes. Detached round timers and heat updates get independent traces/scopes. Account identification is deliberately omitted in every runtime, so logout cannot leave a Sentry user identity behind. Socket events carry a separate, validated `sentryTrace` metadata argument; old clients using `(payload, ack)` still work. Only a handshake from an exact `APP_ORIGIN` may continue an event trace. Browser metadata is sent only to configured trusted origins. Baggage is deliberately omitted from socket metadata.

## Collection and privacy

`sendDefaultPii=false` is retained as an explicit policy. SDK 11 replaces that option with `dataCollection`: every runtime explicitly disables identity, cookies, headers, bodies, query parameters, AI inputs/outputs, GraphQL documents/variables, database data, queue arguments, frame variables and source context. Server names are disabled too. A final allowlist removes exception messages, arbitrary tags/context and SQL/AI attributes. It preserves exception type, source file/line, debug IDs, trace IDs, safe route templates, service/operation tags, numeric counts and explicitly allowed providers/models. Room IDs are invite tokens and become `[id]`. Stack locations and debug-image code files receive the same rewrite so debug IDs remain matchable. Sentry grouping continues to use source stacks and exception types; no global custom fingerprint merges unrelated failures.

Automatic Console, ContextLines, LocalVariables, RequestData, database, AI, session and host-context integrations are excluded. Metrics are dropped. Expected application input errors are marked at their origin, not identified by arbitrary exception text. Aborted work, navigation exceptions, rejected user credentials and routine disconnects are excluded. Provider authentication failures remain application configuration defects. Shared catches report the original exception once; rethrows/retries maintain application responses and socket acknowledgements.

Production trace sampling defaults to 5%, preview to 10%, development to 100%. Environment variables can override these with a number from 0 to 1; invalid values use the default. `.env.example` intentionally uses 5% locally too unless overridden. Timed operations cover PDF parsing, ingestion, embeddings/tokenization, retrieval/reranking, structured Groq work, streaming generation/first token, quizzes, summaries, PDF export and email. No document/question/answer is used as a span name or attribute.

Structured logs are off by default. When enabled, `beforeSendLog` accepts only fixed application operation names and safe attributes. Console forwarding remains off. Profiling is reserved and forced to zero: it has not been demonstrated on Vercel/Render and no native profiling dependency is installed. A nonzero `SENTRY_PROFILES_SAMPLE_RATE` does not enable it. Validate SDK/runtime compatibility, privacy and memory/CPU overhead before implementing a profiling opt-in.

Replay is off by default and initialized lazily only after BOTH `NEXT_PUBLIC_SENTRY_REPLAY_ENABLED=true` and an explicit `setReplayConsent(true)` call from a dedicated consent UI. The app has no such consent UI yet, so setting the flag alone cannot start replay. Recording is restricted to `/help`, `/privacy`, and `/guides` without query strings or hashes, and stops before navigation. This also excludes private room URLs from raw replay metadata. Text/inputs are masked, all media and main study panes/documents are blocked, custom events are dropped, and network bodies/details are excluded. `setReplayConsent(false)` stops recording. Do not interpret the essential cookie notice or sign-in as replay consent. Review data retention, legal basis and the replay scrubber before enabling it in a deployment.

## Deployment variables

See `.env.example` for the full list. DSNs are public ingest identifiers; they do not permit reading events or uploading maps. Missing DSNs make local telemetry a no-op. Configure:

| Variable | Vercel web | Render realtime |
| --- | --- | --- |
| `SENTRY_DSN` | Web project's DSN | Realtime project's DSN |
| `NEXT_PUBLIC_SENTRY_DSN` | Web project's DSN | Omit |
| `SENTRY_ORG` | `study-room-iq` | `study-room-iq` (build) |
| `SENTRY_PROJECT` | `study-room-web` | `study-room-realtime` (build) |
| `SENTRY_RELEASE` | `study-room@<full commit SHA>` | Same value |
| `SENTRY_ENVIRONMENT` | `production` or `preview` | Explicit `production` or `preview` |
| `SENTRY_TRACES_SAMPLE_RATE` | `0.05` production | `0.05` production |
| `NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE` | `0.05` production | Omit |
| `SENTRY_TRACE_ORIGINS` | Exact web and realtime origins | Exact web and realtime origins |
| `NEXT_PUBLIC_SENTRY_TRACE_ORIGINS` | Exact web and realtime origins | Omit |
| `SENTRY_LOGS_ENABLED` | `false` | `false` |
| `NEXT_PUBLIC_SENTRY_LOGS_ENABLED` | `false` | Omit |
| `NEXT_PUBLIC_SENTRY_REPLAY_ENABLED` | `false` | Omit |
| `SENTRY_PROFILES_SAMPLE_RATE` | `0` (reserved) | `0` (reserved) |
| `SENTRY_SMOKE_ENABLED` | `false` | `false` |
| `SENTRY_SMOKE_TOKEN` | Omit in production | Omit in production |
| `SENTRY_AUTH_TOKEN` | Build job secret only | Build job secret only |

For the current hosts, trace origins are `https://study-room-ten-blond.vercel.app,https://study-room-realtime.onrender.com`. Add each exact trusted preview origin when testing a preview. Do not use broad `vercel.app` wildcards. Browser release and environment are injected at build time; do not set them independently. On Vercel, `VERCEL_ENV` is used unless `SENTRY_ENVIRONMENT` overrides it. On Render, set the environment explicitly; `NODE_ENV=production` is not a substitute for deployment-stage configuration.

`scripts/sentry-release.mjs` derives a release from `VERCEL_GIT_COMMIT_SHA`, `RENDER_GIT_COMMIT`, or Git HEAD. Manual deployments should explicitly set the same SHA on both builders; commit the final changes before assigning a production release. A local build from a dirty tree is a development verification artifact, not a released commit.

## Builds and source maps

For web, `npm run build` uploads source maps when `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, and `SENTRY_PROJECT` are supplied. Build-plugin telemetry is disabled and generated source maps are removed after upload. Never set `NEXT_PUBLIC_SENTRY_AUTH_TOKEN`. Keep the upload token out of `.env.local`, runtime secrets, logs, committed files and browser bundles.

For realtime, `npm run server:build` creates ESM modules and external maps in `dist/realtime`, injects debug IDs with `sentry-cli`, and uploads the artifact bundle with the same release and `dist=realtime`. Runtime uses `npm run server:start`: the `--import` preload initializes Sentry before HTTP, Socket.io, Prisma and Groq load. A deferred entry catches module-evaluation failures. Shutdown clears room timers, closes sockets/database connections, flushes telemetry for at most two seconds and forces exit within five seconds. Fatal module imports have a three-second deadline. Development uses `npm run server` or `npm run server:dev` with `tsx` preloaded before the instrumentation file.

Use build secrets in CI rather than ordinary provider runtime variables. Render's blueprint sets build/start commands and non-secret monitoring options, but intentionally does not declare an upload token. If using Render's shared environment as a temporary build-secret carrier, the preload removes `SENTRY_AUTH_TOKEN` before application code runs; prefer building/uploading in CI with a secret unavailable to runtime. For Vercel, a prebuilt deployment from a CI builder is the cleanest way to keep the token build-only: build with the secret, then deploy the prebuilt output without that secret. Do not place the token in a Vercel environment group shared with runtime functions.

The README's manual release policy still applies. A Git push does not deploy either service. Update Vercel variables, build/upload the web deployment, and deploy only with authorization. Update Render's build command to `npm ci && npm run server:build`, start command to `npm run server:start`, and monitoring variables; manually deploy the same committed revision only with authorization.

## Dashboard setup

Use the existing `#study-room` team and notification destination. Do not invite people, add destinations, enable paid products or purchase retention. For each project:

1. Keep default stack-based grouping and enhanced server-side sensitive-data scrubbing enabled. Add organization/project scrub fields for tokens, authorization, cookies, email, questions, prompts, responses, quiz submissions, document names and reports as defense in depth. Client scrubbing remains the primary protection.
2. Keep the included Developer plan retention; do not upgrade. Sentry's current documentation states [30-day event retention](https://www.sentry.help/en/articles/13964940-how-long-are-my-organization-s-audit-logs-stored) for this plan. Individual span/log retention windows were not shown in the inspected subscription UI.
3. Create an issue alert limited to `environment:production` for a new issue or regression, routed to the existing team/destination. Do not enable it for development smoke traffic.
4. For realtime, create an available metric alert for at least 5 error events over 5 minutes, filtered to `environment:production service:realtime`, with a recovery threshold below 1. Use the existing destination and a 30-minute action interval. If metric alerts are unavailable on the current plan, use an issue frequency rule and document that it is per issue, not aggregate service availability.
5. Keep spike protection and quotas enabled. Verify an authorized alert once, then resolve synthetic issues. Transport receipt alone does not prove alert delivery.

## Synthetic verification

`npm test` includes sensitive-value, scope concurrency, sampling, gating, tsx preload-order and compiled-map checks. Build realtime artifacts before checking their debug IDs. `npm run typecheck` and `npm run build` are required.

For a local/staging smoke, set both services to development/preview, enable `SENTRY_SMOKE_ENABLED=true`, set a temporary `SENTRY_SMOKE_TOKEN`, and use synthetic data only. The web endpoint requires `x-study-smoke-token` and returns 404 otherwise. `/telemetry-smoke` provides browser error/trace buttons only outside production. Run `SENTRY_SMOKE_ENABLED=true SENTRY_ENVIRONMENT=development SENTRY_SMOKE_TOKEN=<temporary> npx tsx tests/telemetry-smoke.ts` with appropriate `TEST_BASE_URL` and `TEST_SOCKET_URL`.

For a database-free socket smoke, additionally set `SENTRY_SMOKE_ONLY=true`; it binds to loopback and skips database startup recovery. This flag is not for staging deployments or normal app sessions. Production cannot enable these triggers; the explicit stage gate and Vercel production gate both block them. Remove smoke variables after testing. Live-session checks using `tests/live-session.ts` additionally require a disposable database and Groq credentials; email checks must remain explicitly requested.

Verify Sentry receipt in both projects, environment/release/service tags, scrubbed raw event data, original-source frames and parent trace relationships. Record event/trace links and operational limitations in `docs/sentry-verification.md`; a successful build alone is not production-monitoring verification.

Official references checked for this integration: [Next.js manual setup](https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/), [Node initialization methods](https://docs.sentry.io/platforms/javascript/guides/node/install/), [Node debug-ID source-map uploads](https://docs.sentry.io/platforms/javascript/guides/node/sourcemaps/uploading/cli/).

## Approved manual release method

For this release, use Vercel's remote Linux builder with `vercel deploy --prod --build-env SENTRY_AUTH_TOKEN=<build-secret>`, passing the secret from the ignored token file in a process argument without printing it. [Vercel documents `--build-env` as build-step variables, separately from runtime `--env`](https://vercel.com/docs/cli/deploy). Do not save that token in the project's shared environment. Pass the committed `SENTRY_RELEASE` explicitly for the deployment's build/runtime. A Windows prebuilt output can contain Windows native PDF/embedding dependencies and must not be deployed to Linux.

For the manually deployed Render service, build and upload realtime artifacts locally from the exact committed release with Node 22 and the lockfile, then let Render compile the same revision without any upload token in its environment. Compare the live artifact's debug ID/source mapping after deployment. Future manual releases must repeat that authenticated upload, or use a dedicated CI build secret for the upload. The service's existing Oregon region is retained; the blueprint's historical Ohio value is not applied to the existing service.

The verified dashboard setup and remaining live checks are recorded in [sentry-verification.md](sentry-verification.md). Production deployment requires explicit authorization; approval for this release was received on 3 October 2026.

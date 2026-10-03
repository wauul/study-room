# Sentry verification — 3 October 2026

## Implemented and checked

Browser, Next.js Node/edge hooks, translated error boundaries and the separate Node 22 ESM realtime process use Sentry 11.4.0. Unexpected caught failures retain their original exceptions; expected input/authentication/cancellation errors are excluded. Socket operations and detached timers use isolated scopes, with explicit trace metadata restricted to trusted origins. Performance spans cover ingestion, parsing, embedding, retrieval/reranking, Groq generation/first token, quizzes, summaries, PDF export and email.

Collection-time opt-outs and final allowlists exclude identities, headers, bodies, query strings, study content and secrets. Source maps retain repository code and line numbers, not uploaded documents. Replay and logs are off; profiling is unavailable pending runtime validation. The deployment variables and exact build/start commands are in [sentry.md](sentry.md).

| Check | Result |
| --- | --- |
| `npm test` on Node 22 | 25 passed, no skipped tests; includes actual SDK envelopes, concurrent scope isolation, scrubbing, trace parenting, tsx preload order, bounded fatal exit and compiled debug-ID/source-map matching |
| `npm run typecheck` | Passed |
| `npm run build` | Passed with authenticated web source-map upload |
| `npm run server:build` | Passed; compiled ESM and injected debug IDs; authenticated artifact upload also passed |
| `git diff --check` | Passed |
| Upload-token scan of browser/realtime artifacts | No secret matches |
| Gated synthetic smoke | Browser boundary/recovery; uncaught and caught Next.js HTTP 500; performance HTTP 200; unauthorized HTTP 404; socket error acknowledgement and explicit parent propagation passed |
| Normal live session | Passed with existing Groq credentials and a new, isolated disposable Neon database: registration/login, room create/join, two-client streaming, citation highlights, simplification, unsupported-answer abstention, private quiz submissions and reveal, rundown and personal PDF export |

Local verification used Node 22.23.3. The development artifact release was `study-room@d3492169dee8b4eddc15b59f388e72c88b5a7708`; it identifies the pre-integration HEAD plus uncommitted development work, **not a deployed production revision**. Production deployment was subsequently authorized and must use the committed integration revision on both hosts.

## Live Sentry evidence

These links require access to the `study-room-iq` organization:

| Evidence | Link and observation |
| --- | --- |
| Browser error | [STUDY-ROOM-WEB-3](https://study-room-iq.sentry.io/issues/151112951/?project=4512192467959888): original `app/telemetry-smoke/smoke-client.tsx` frame, removed exception text, service `web`, dist `web`, development release |
| Uncaught Next.js error | [STUDY-ROOM-WEB-2](https://study-room-iq.sentry.io/issues/151112262/?project=4512192467959888): original `app/api/telemetry-smoke/route.ts:8:32` frame; debug-ID symbolication |
| Caught route error | [STUDY-ROOM-WEB-1](https://study-room-iq.sentry.io/issues/151112259/?project=4512192467959888): original `app/api/telemetry-smoke/route.ts:10:17` frame, original RangeError retained |
| Realtime error | [STUDY-ROOM-REALTIME-1](https://study-room-iq.sentry.io/issues/151110329/?project=4512192481263696): original `server/index.ts` frame, service/dist `realtime`; continued trace `33333333333333333333333333333333`, parent `4444444444444444` |
| Browser → Next.js trace | [Trace 0cf2855fdf4a4042a1ae8b90d1a2860e](https://study-room-iq.sentry.io/issues/trace/0cf2855fdf4a4042a1ae8b90d1a2860e/?eventId=3a3e110761504357b357f65894c88952&groupId=151112951&source=issue_details&timestamp=1791035814.665): browser `telemetry.smoke` and child HTTP request with nested Next.js operation |
| Real Groq generation | [Trace c54e1aa615ab4cc78a34693972e1d08d](https://study-room-iq.sentry.io/explore/traces/trace/c54e1aa615ab4cc78a34693972e1d08d/?node=span-ad0bafce8fce9a93&statsPeriod=14d&timestamp=1791036333): socket question → retrieval/embedding/reranking → Groq generation 862.72 ms; first token 715.99 ms. Safe provider/model attributes, no input for the generation span |
| Fresh processed privacy check | [Event JSON](https://de.sentry.io/api/0/projects/study-room-iq/study-room-web/events/98e0882d8b614fb5a0140ea5d44ea66d/json/): removed exception value, no request body/headers/query, no identity/IP, inferred geo values null after organization scrubbing, original-source symbolication true |

Uploaded source-map code context includes the literal synthetic fixture sentinel. This is static repository code restored by symbolication, not a retained error message or study input. Early development events received Sentry-inferred coarse geography; organization removal rules now remove those fields on new events. Those rules do not rewrite old events.

## Dashboard configuration

Created EU projects `study-room-web` (4512192467959888) and `study-room-realtime` (4512192481263696), with the existing `#study-room` team. The approved organization CI token is stored in the ignored `.tools/sentry-upload.env`; DSNs are in ignored `.tools/sentry-web-dsn.txt` and `.tools/sentry-realtime-dsn.txt`. No credential is committed.

- Default stack/type grouping retained. Organization/project data scrubbers and sensitive-field lists enabled; IP storage prevented, enhanced privacy enabled, shared issues and JavaScript source fetching disabled. Organization advanced rule removes `$user.geo.**`.
- Existing issue alerts updated for **new issues OR resolved regressions**, requiring event tag `environment=production`, existing team destination, 30-minute throttle. Development smoke traffic is excluded by that exact tag filter.
- [Realtime metric monitor](https://study-room-iq.sentry.io/monitors/2349250/?statsPeriod=14d): Error events, count above 4 over 5 minutes, `environment:production service:realtime`, recovery at 0; connected existing-team alert for failure/recovery, 30-minute throttle.
- Spike protection retained. Free Developer plan retained; no paid service, trial, upgrade or additional spending enabled. Current Sentry documentation states [30-day event retention for the free Developer plan](https://www.sentry.help/en/articles/13964940-how-long-are-my-organization-s-audit-logs-stored). Included retention was left unchanged; individual span/log retention windows were not exposed in the inspected subscription UI.

## Limits and release verification

Production alert delivery has not been deliberately triggered: creating application defects or sending test notifications to people requires explicit authorization. Early automatically created default alerts recorded development triggers before production filtering was applied; this is not proof of the final production rules' delivery.

Edge initialization compiles but this app currently has no edge route to exercise. Email instrumentation is implemented but no email was sent. Structured-log scrubbing is tested offline; logs remain disabled and have not been verified live. Replay policy/consent gates are tested, but no consent UI exists and no live replay was recorded. Profiling stays disabled until compatibility, privacy and overhead are demonstrated. Production normal-flow and production telemetry receipt must be checked after the approved deployments.

Existing npm audit findings are in the Tailwind 3/braces dependency chain; no unrelated major upgrade was included.

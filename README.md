# Study Room

A shared study table: document-grounded streaming Q&A, synchronized confidence quizzes, a live discussion heatmap, and a personalized session rundown.

Live app: https://study-room-ten-blond.vercel.app · Repository: https://github.com/wauul/study-room · Socket service: https://study-room-realtime.onrender.com/health

These deployments currently use manual releases: run `vercel deploy --prod` for the frontend and choose **Deploy latest commit** in Render for the socket service. A GitHub push alone does not update these deployments.

## Run locally

Use Node 22 and a Postgres database with permission to install pgvector. On Windows ARM, use an x64 Node runtime for the native ONNX dependency.

```sh
npm ci
cp .env.example .env
# Fill in the values described below.
npx prisma migrate deploy
npm run dev
# In a second terminal:
npm run server
```

The frontend runs on port 3000 and the long-running Socket.io process on port 3001. Both processes read `.env`; never commit this file. `npm test` checks scoring, input validation, chunk boundaries, and decay. `npm run typecheck` and `npm run build` validate the application.

Environment variables:

| Variable          | Purpose                                                         |
| ----------------- | --------------------------------------------------------------- |
| DATABASE_URL      | Neon Postgres connection URI, with SSL                          |
| NEXTAUTH_SECRET   | Random secret shared by web and socket servers                  |
| NEXTAUTH_URL      | Canonical web URL                                               |
| GROQ_API_KEY      | Groq generation credential                                      |
| GROQ_MODEL        | Defaults to `openai/gpt-oss-20b`                                |
| RESEND_API_KEY    | Sending-only Resend credential                                  |
| RESEND_FROM       | Verified sender, e.g. `Study Room <study@example.com>`          |
| SOCKET_SERVER_URL | Public HTTPS socket host URL, or localhost in development       |
| APP_ORIGIN        | Allowed frontend origin(s), comma separated, on the socket host |
| PORT              | Socket host port (provider-managed on Render)                   |
| HF_HOME           | Optional writable model cache directory                         |

Next.js 15 replaces the originally requested 14 with user approval to use a maintained security release. Groq retired `llama-3.1-8b-instant` for free-tier accounts on August 16, 2026; the model is configurable and defaults to its recommended replacement. Transitive dependency overrides patch known advisories; test the embedding pipeline when upgrading them.

## Use the app

1. Create an email/password account, then a room. Accounts are required for both hosts and participants so room actions and personalized exports have verifiable ownership.
2. Upload selectable-text PDFs (up to 4 MB) or paste text. Add past exams separately as style references. Invite friends using the room link.
3. Ask a shared question, follow the cited passages, or start a confidence quiz as host.
4. Assign percentages summing to 100. Submissions stay private until the server locks the round.
5. End the session after active work completes. Download your own PDF or email a copy to your account address. The host can email each participant their own report.

## RAG pipeline

`lib/rag/chunking.ts` detects rough chapter/section headers and splits text into approximately 350-word windows (roughly 500 tokens), with 45-word overlap inside each section. `lib/rag/embeddings.ts` caches the quantized `Xenova/all-MiniLM-L6-v2` model in the Node process and normalizes 384-dimensional embeddings. Uploads embed sequentially before an atomic document transaction; failed ingestion does not leave half a document.

The initial migration executes `CREATE EXTENSION IF NOT EXISTS vector`. Prisma uses `Unsupported("vector(384)")` and bound raw SQL for vector writes and cosine retrieval. Excluded labels are removed before ranking. Boosted labels get a ranking bonus, but displayed relevance remains the original cosine similarity. Course material and past exams are queried separately.

Questions retrieve up to five course passages. Those exact IDs are stored with each answer and broadcast to every participant; highlighting does not depend on parsing model-generated citations. Similarity below 0.5 raises a visible caution. Model prompts treat documents as untrusted source material and retain the room's raw focus instruction.

Quiz generation uses course material for facts and past exams ONLY for format. The prompt explicitly forbids copying, and a normalized verbatim check rejects copied question text. Generation is schema-validated before a round begins.

## Real-time architecture

Vercel functions cannot own a durable Socket.io listener, timers, or shared in-memory room state across requests. `server/index.ts` runs separately on a single long-lived Node host. Next.js owns authentication, setup, ingestion, summary retrieval, PDF rendering, and email.

The web app mints a two-hour signed room token after verifying the user's membership. The socket host verifies its audience, signature, user, participant, and room. Host-only actions are checked against the database. Room-scoped channels carry streaming answers, source highlights, presence, decayed heat, quiz starts/reveals, and session transitions. Correct quiz answers are never sent in the start event. Late joiners observe the current round and participate in the next.

Round clocks use a server deadline with a client clock-offset estimate. Submissions are validated and stored privately. The server locks on deadline or after every eligible participant submits. Disconnections do not silently remove eligibility; the deadline still closes the round. Interrupted rounds are marked locked at process startup and persisted results are recoverable.

## Why honesty wins

`lib/scoring/properScoringRule.ts` implements **ln(probability of the correct option)**. A perfect forecast scores 0, a uniform forecast scores approximately -1.386, and a confidently wrong forecast scores much worse. Higher is better.

If your real beliefs are q but you report p, the expected loss compared with honesty is KL(q || p), which is never negative. This is why reporting what you actually believe maximizes expected score. It is the proper-scoring principle used in probabilistic forecasting.

Assigning exactly zero to the true outcome gives negative infinity. We preserve that result rather than silently clipping probabilities: a boolean flag represents infinity in JSON/Postgres, and the UI/PDF render it as −∞. Leaderboards show cumulative log scores and number of answered rounds; participants who skip rounds are not penalized, so totals across unequal participation need care.

## Heat and evidence

Each retrieved chunk adds a hit. Weight decays continuously as `0.95 ^ elapsedMinutes`, and updates broadcast every four seconds. Persisted retrieval timestamps reconstruct heat after restart. Warm passages indicate discussion frequency, which by itself is not evidence of confusion.

Unique “I'm lost” clicks count once per participant per answer. Three clicks or half of the connected participants trigger a simpler explanation. Rundowns combine actual retrieval counts, decayed heat, lost clicks, and confidence-adjusted quiz mistakes. They include numeric evidence and validated source IDs. High-priority struggle points receive simplified explanations. PDF exports use the same rundown JSON plus only the requesting participant's quiz record.

## Design

Three palettes were explored in `docs/design.md` before component code. The selected paper/terracotta system uses centralized CSS variables, Lora serif headings, quiet sans-serif UI text, fine borders, a dotted reading desk, visible paper edges, and restrained line icons. Terracotta connects actions with the warm end of the discussion heatmap. Responsive layouts stack the reading and conversation areas on small screens. Reduced-motion preferences disable animation.

## Deploy on free tiers

1. Create a free Neon project. Run `npx prisma migrate deploy` against its connection URI.
2. Import the public repository into a Vercel Hobby project. Set the web environment variables and deploy.
3. Create a Render free Node web service using `deploy/render.yaml`, or manually use `npm ci && npx prisma generate` and `npm run server`. Set DATABASE_URL, NEXTAUTH_SECRET, GROQ_API_KEY, GROQ_MODEL, and APP_ORIGIN. Never select a paid plan without consent.
4. Set SOCKET_SERVER_URL on Vercel to the resulting Render HTTPS URL. Set APP_ORIGIN on Render to the canonical Vercel URL. Redeploy after updating environment variables.
5. Use a verified Resend domain. The default onboarding sender can only deliver to the Resend account owner; a verified domain is required for other recipients.

## Current limitations

- Free Render services sleep when idle and have 512 MB RAM. The initial model download/inference and cold starts may be slow; no uptime guarantee is implied. A quantized model is used to reduce memory. Local embeddings save API cost but have weaker retrieval than larger hosted models.
- Vercel upload/request duration and bundle-size constraints limit ingestion. Split large documents. Scanned PDFs need external OCR; images/tables and original PDF pagination are not preserved. The viewer presents extracted text passages.
- The heatmap, timers, and generation locks live in one socket process. Redis/adapters and distributed locks are needed before scaling to multiple instances. Durable DB records preserve completed work; an interrupted streaming response must be asked again.
- Automatic summaries are model-generated and can still misinterpret evidence. Review them against the visible facts; absence of questions is not mastery.
- Credential authentication does not yet include password reset, email ownership verification, or account deletion. Invite links are unguessable room IDs but may be forwarded. Do not upload highly sensitive documents.
- Free-tier rate limits can delay generation or email. Email sends use idempotency keys so retrying an unchanged report does not duplicate sends within the provider's retention window.
- Section detection and focus matching are deliberately approximate. Broad exclusions can leave no retrievable passages; the app reports that state.

Deployment and test evidence is recorded in `docs/verification.md` as checks complete.

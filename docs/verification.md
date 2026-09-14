# Live verification — September 14, 2026

App: https://study-room-ten-blond.vercel.app
Repository: https://github.com/wauul/study-room
Socket service: https://study-room-realtime.onrender.com

## Passed

- Neon migration applied, including pgvector and 384-dimensional vectors. Actual local embeddings returned a normalized 384-dimensional vector.
- Six unit tests cover proper scoring, honest expected score, zero-probability infinity, invalid probabilities, confusion weighting, chunking, and heat decay.
- TypeScript checks and production Next.js builds pass. Latest dependency install audit reported zero vulnerabilities.
- `tests/live-session.ts` passed against the public app and Render with actual Neon, Groq, and embeddings. Two independent authenticated Socket.io clients received identical streaming tokens and passage highlights. Course and past-exam ingestion succeeded; lost-click threshold produced a shared simpler explanation.
- Both clients received the same quiz ID/deadline, without the correct answer in the start event. The first submission did not reveal results; the second locked the round and both clients received the same reveal.
- Session rundown and personalized production PDF passed (5,032-byte PDF in the final full integration run). Room: `cmu1m2ykd0003l504besk3ssu`.
- Two separate browser authentication sessions additionally completed a shared question, lost-click explanation, and quiz. Both showed 20 seconds at round start and identical results: Alex −1.386, Sam −2.303. Ending the session moved both browsers to the rundown. Room: `cmu1crxwb0001l704gkw6xott`.
- Browser rundown showed actual numeric evidence, personal quiz history, and a high-priority struggle. Regenerating the simpler explanation updated it successfully.
- A personalized report sent using the verified Resend domain was shown as **delivered** in the provider dashboard. No email was sent to generated example.com test accounts.
- A two-page generated PDF was rendered and visually inspected for legibility and clipping.

## Fixes found during verification

- Await pending quiz writes before revealing results.
- Include PDF font assets in Vercel functions; corrected production PDF export.
- Preserve numeric evidence in summaries instead of trusting generated counts or unsupported mastery claims.
- Recover busy controls on reconnect and renew expired room tokens; render answer Markdown safely.
- Replaced the legacy PDF parser after valid generated PDFs failed parsing, and included its native runtime in Vercel. Modern parser extracted 1,798 characters locally. The final production PDF upload returned HTTP 201 and four embedded passages (room `cmu1mquf50001jw04pgtqfac3`).

Final frontend deployment: `dpl_FV45dcRRqWdQ8JfRRqAvdo3SwGcT`, code commit `0ad284c`, READY. Render's verified server code is commit `f1882d7`; later commits changed only frontend/PDF handling and documentation. Final Render health check returned HTTP 200.

## Operational scope

Vercel Hobby, Neon free, and Render free are used. Render can sleep when idle, so first connection may be slow. Releases are currently manual. The implementation uses one socket process; horizontal scaling needs shared coordination. Authentication does not include password reset or email ownership verification. See README for document limits and other constraints.

Integration tests create real test accounts, rooms, and AI calls. Credentials and provider secrets are stored only in ignored local files, never in this report.

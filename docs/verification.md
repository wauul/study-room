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

## September 15 interface refresh

Implemented the requested twenty additions: persistent dark mode, sticky header, mobile navigation, button hover/focus states, scroll progress, back-to-top, loading motion and skeletons, membership-aware site search, skip link, floating contact, expandable FAQ, persisted newsletter signup with success, password visibility, essential-cookie notice, confirmation dialogs, designed 404, print CSS, outbound UTM labels, code clipboard actions, and dated journal posts.

Browser preview checks passed at desktop and 390 px mobile widths: dark/light toggles persisted through reload, mobile navigation expanded and routed correctly, no horizontal page overflow, header remained at top while scrolling, progress advanced, back-to-top returned upward, skip link focused main content, FAQ expanded, newsletter showed server-confirmed success, password input toggled text/password, code clipboard contents matched, and contact dialog returned keyboard focus after Escape. The custom 404 was visually reviewed. No console errors were reported in the final checked preview page.

`tests/site-features.ts` passed locally against the real Neon database: anonymous search contained no private results; authenticated results were limited to membership; saved notes were readable only after authentication; public journal search worked; invalid newsletter email/consent failed; repeated signup produced one database row; unsubscribe persisted; nonexistent paths returned 404. Tests send no emails. All six existing unit tests and TypeScript checks passed. Print rules were reviewed in source; no automated print-render comparison was performed.

Newsletter campaign delivery is intentionally separate from signup storage. Future campaign senders must honor unsubscribe state and include the tokenized unsubscribe link. Contact currently uses the project's GitHub issue form.

Production release `62ca164` is READY at deployment `dpl_8A8vQroMXorQDqtcuk77WAutucmn`. The full site-feature integration suite also passed against the public production URL. The existing biology rundown loaded with the refreshed styles and no console errors. In a new empty test room, the end-session dialog explained finality; choosing Keep studying closed it and returned focus to Wrap up without ending the room. The browser viewport override was reset, and the original rundown was restored. Test newsletter subscriptions were unsubscribed after verification.

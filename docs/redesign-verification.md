# Study notation redesign verification

Recorded 30 September 2026. This report concerns the current redesign; earlier live-service and performance results retain their original dates and scope.

The interface retains the user-pinned violet/slate palette and uses IBM Plex Sans through `next/font`. Root [DESIGN.md](../DESIGN.md) is the visual specification. There are no new production dependencies or shipping raster assets.

## Coverage

The source audit covers anonymous/authenticated home, room list empty/error states, sign-in/registration, create/join, workspace library/reader/discussion, citation navigation and heat, quiz generation/timer/submission/reveal/leaderboard, upload/focus/end dialogs, rundown and personal confidence, exports, notes/archive/pagination, search, the journal and all three articles, Help/FAQ, privacy, unsubscribe, 404/loading/error, newsletter, header/footer, consent, and support actions.

Account/membership and host boundaries, private quiz submissions, deadlines, archived citations, focus instructions, upload limits, exports, consent, and unsubscribe remain audited contracts. Native OS menus/file pickers remain native. No date/calendar or autocomplete component exists to redesign.

## Browser evidence

Ignored `.tools/design-verification/review-manifest.json` records 184 authoritative captures and 15 matrix/interaction checks: desktop 1440×1000, tablet 820×1180, mobile 390×844 in both themes, plus 320px and 200% text edge cases in both themes. It records zero page errors and zero horizontal overflow. `.tools/design-verification/edge-states-report.json` adds 24 desktop/mobile captures in both themes and three checks for rundown loading/error, search pending/error/empty, and newsletter error retention; no page errors were recorded.

Interactions cover theme persistence/System updates, menu Escape/focus restoration, search shortcut/public results, copy feedback, password visibility, registration recovery, create-room validation/errors, upload errors/Escape, exact mobile citation navigation, modal focus confinement/restoration, 100% quiz submission validation, unsubscribe token recovery, newsletter consent/success, and narrow/enlarged-text reflow.

Public routes use the real local application. Authenticated home/notes were rendered from actual source page components using isolated source-derived fixtures. Workspace/rundown use local REST/Socket.IO fixtures. These establish rendered client behavior under controlled inputs, not live authentication or persistence.

The semantic-pair contrast audit is in `.tools/design-verification/contrast.json`. The lowest tested light text pair is muted text on surface-muted at 4.59:1; the light strong control border against surface is 3.32:1. Tested text pairs meet 4.5:1 and control-boundary pairs meet 3:1 in both themes. This is a token-pair audit, not whole-page accessibility certification.

## Finish review and build

This section records the earlier redesign pass. The preference/authentication extension's final results appear below.

A fresh reviewer followed the supplied Impeccable finish role. Findings were corrected: meaningful headings precede metadata, the native theme selector grows/reflows without clipping “System” at 320px with doubled text, and support actions sit in footer flow without covering fields. Final `.tools/design-verification/finish-verdict.md` scores those three fixes as resolved and records `disposition: ship` at that exact scope; it is not a new review of every route.

The hook detector ran once. Its quiz side-stripe finding was corrected to a 1px success outline with explicit “Correct answer” text. Authoritative captures were refreshed after the reviewer correction batch.

All 11 unit tests passed. Final standalone typecheck and production build passed after reviewer corrections; build included Next.js lint/type validation and generated all 15 static pages. No separate lint script exists. Unit tests preceded the final visual corrections, which introduced no subsequent logic changes. Scripts, screenshots, fixtures, and downloaded research remain ignored in `.tools`.

## Live verification limits

Live sign-in/registration, database persistence, AI generation/indexing, email delivery, and personalized PDF endpoints were not exercised end to end in this pass because service credentials were unavailable. Generation, ineligible/reconnect states, timers, exports, and access rules were audited in source, with key related client states captured. Fixture success is not evidence of live delivery or account access to a private PDF.

Production runtime requires `NEXTAUTH_SECRET`; no credentials or production configuration were written. No deployment was performed as part of this verification report.

## Preferences, localization and OAuth extension

The approved extension replaces the theme selector with a two-state sun/moon button, adds a styled native English/Français dropdown, translates application chrome and public content, and adds Google, Microsoft and GitHub entry points shared by sign-in and signup. Explicit theme choices persist in `study-theme`; without an override the app bootstraps from the OS preference. Language persists in the essential `study-locale` cookie; server rendering resolves that cookie before supported browser language preferences and English fallback. Uploaded sources and authored/generated study content retain their language.

Ignored `.tools/design-verification/preferences-report.json` records 193 captures across English/French, both themes and responsive routes with zero page errors or horizontal overflow. `preferences-interaction-report.json` adds seven captures and successful preference persistence, refreshed French search, signup recovery and doubled-text checks. Public application and source-derived authenticated fixtures retain the browser-evidence limits above.

The fresh extension review in `.tools/design-verification/preferences-finish-review.md` records `disposition: ship`, with no material fixes. Its sampled routes preserve Study notation and the pinned palette; this is an extension review, not a renewed whole-app certification. Final typecheck, all 16 unit tests and the Node 22 production build passed after the copy-feedback comparison, privacy preference-copy and submit busy-guard fixes. The final build generated 14 static pages; request-dependent locale rendering makes affected routes dynamic.

Ignored `.tools/design-verification/preferences-final-confirmation.json` adds four successful checks with zero page errors: French copy feedback survives language switching while code stays unchanged; no-override theme follows OS and explicit override wins; bilingual privacy preference text and French metadata; and disabled OAuth UI matches the actual credentials-only `/api/auth/providers` response. The final mobile login capture is `preferences-final-mobile-login.png`.

Provider buttons are enabled only when both credentials exist, otherwise disabled with translated configuration copy. [OAuth setup](oauth-setup.md) documents the additive migration, callbacks and safe account-linking flow. No migration was applied and no live OAuth callback, account/database persistence, AI/indexing, email or personalized PDF integration was exercised in this extension. UI and configuration verification do not establish live service success.

The subsequent credential setup on 30 September 2026 applied the migration to both databases and provisioned Google, Microsoft and GitHub for production and local development. All three live callbacks and authenticated room access were verified; the existing test account was preserved. See [OAuth setup](oauth-setup.md) for the current configuration, expiry and exact verification scope. This supersedes the authentication-specific limits above, while the other live-service limits remain.

## Research provenance

Design work consulted [taste-skill](https://github.com/Leonxlnx/taste-skill), [Impeccable](https://github.com/pbakaus/impeccable), and [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill). The [21st.dev source citation rail](https://21st.dev/@rmahammad/components/source-citation-rail) informed contextual navigation; no third-party component code/assets were copied. The [awesome-ai-tools-for-ui directory](https://github.com/maxbogo/awesome-ai-tools-for-ui) selectively led to a Shape of AI grounding-pattern reference; it was not installed wholesale. Implementation uses existing primitives and original CSS.

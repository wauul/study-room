---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["components/RoomClient.tsx","components/SummaryClient.tsx"]
---

# Redesign coverage and direction contract

## Audit

Current implementation combines historical paper/terracotta CSS with a later violet theme. Lora headings and undersized Arial controls, excessive eyebrow labels, decorative arrows and periods, generic empty states and large boxed feature rows weaken the product identity. Native dialogs, source links, membership filtering, focus handling and theme bootstrap are functional foundations to preserve.

## Three directions

1. Seminar poster: condensed sans, asymmetric poster composition, cobalt #2447B2, orange #B74622, cool paper #F3F5FA. Broad blocks, typographic hierarchy, purposeful reveals. Recognizable as a campus seminar publication. Risk: more promotional than useful for long reading.
2. Study notation (chosen): IBM Plex Sans, readable measure and annotated margins; graphite #21302E, teal #14665B, highlight #E7EEAD, neutral #F3F6F3. Citation brackets, baseline rules, square confidence measures, quiet state transitions. Recognizable through how evidence and uncertainty are marked. Best match to the actual workflow.
3. Common room: rounded geometric sans, social group composition, plum #623E60, coral #D1674E, neutral #F7F1F5. Softer panels and conversational rhythm. Risk: social expression competes with course content.

## Direction contract

THESIS: Study notation makes the route from course passage to answer to honest confidence visible. Avoid interchangeable promotional feature cards.
OWN-WORLD: user-pinned original violet/slate palette (#6250C8/#F5F6FA light; #B8A5FF/#12151E dark), highlighted evidence, fine rules, annotation brackets, IBM Plex Sans; mono only for confidence, scores and code. Low-radius controls and spacious prose.
STORY: bring notes, ask together, check the passages, state confidence, take away revision steps. No synthetic product results or endorsements.
FIRST VIEWPORT: a left-aligned three-line proposition beside an instructional confidence composition, with one clear start action. Signed-in visitors get their actual rooms and a compact introduction. Workspace gives source reading and conversation priority.
FORM: the user delegated selection from three grounded directions, then explicitly pinned the original palette. Code-led implementation; inferred product audience explicitly recorded. Concept seed 704a25f2 (assigned 6) supports exploration; the user's selection instructions override the generic tournament and approval workflow.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Coverage checklist

- [x] Home: anonymous proposition; authenticated room list; empty and failed room loading
- [x] Header/footer: active navigation, mobile menu, search shortcut, two-state theme button with system bootstrap, styled native English/Français dropdown
- [x] English/French: cookie persistence, server locale resolution, translated interface/public content and authored source preservation
- [x] Login/register: password toggle, validation, busy/error, return navigation; Google/Microsoft/GitHub configured/unavailable states
- [x] New room: name, display name, optional focus, validation and permission redirect
- [x] Room join: sign-in boundary, name, busy and errors
- [x] Workspace: library, source selection, highlights/heat, participants, focus, chat/history, citation navigation
- [x] Quiz: idle, generation, active timer, distributions, locked/submitted/ineligible, reveal and leaderboard
- [x] Dialogs: upload, focus, ending, contact, unsubscribe; focus trap, cancel and restore
- [x] Rundown: loading/error, mastery/struggles, next steps, personal confidence, PDF/email
- [x] Notes archive: long sources, archived citation, pagination and access boundary
- [x] Search: initial, pending, error, empty, public and private results
- [x] Journal index and every article; code copying
- [x] Help: expanded FAQ and contact
- [x] Privacy, unsubscribe, 404, global loading/error
- [x] Newsletter: consent, validation, pending, error and success
- [x] All control types in use: input, number, textarea, file, select, checkbox, range, tabs, button
- [x] Responsive: mobile, tablet and desktop; both themes; long content and text zoom
- [x] Keyboard, contrast, reduced motion, overflow and console
- [x] Unit tests, typecheck, production build, browser flows and documented verification limits

## Verification boundaries

The following paragraph records the earlier redesign pass; the preference/authentication extension's current evidence is recorded under Finish outcome.

Checks mark implementation and source audit coverage. Actual browser assertions and captures are recorded in `.tools/design-verification/review-manifest.json`, `valid-server-fixtures-report.json`, and `edge-states-report.json`. Public routes use the real local dev server. Authenticated home and notes use markup rendered from their actual page components with isolated source-derived fixtures; workspace/rundown use mocked REST and a local Socket.IO service. Account creation/sign-in, database persistence, live AI/indexing, delivery to email, and personalized PDF endpoints require credentials and were not exercised end to end. Generation, ineligible, reconnect, timer, export, and access rules were checked in source, with key related client states captured. The production build, typecheck, and 11 unit tests pass. The production server requires NEXTAUTH_SECRET; no production credentials or configuration were added.

## Finish outcome

The preference/authentication extension retains this direction contract. `.tools/design-verification/preferences-report.json` adds 193 English/French and responsive captures with no page errors/overflow; `preferences-interaction-report.json` adds seven captures covering preferences, search, signup recovery and doubled text. The extension finish review records `disposition: ship` with no material fixes. Final typecheck, all 16 unit tests and Node 22 build passed after the last fixes. preferences-final-confirmation.json adds four passing checks with zero page errors for bilingual copy feedback/code preservation, system-theme tracking and override, privacy/metadata translation and actual disabled-provider configuration. No additive OAuth migration or live callback was exercised; disabled-provider configuration copy is part of the approved state. See `docs/oauth-setup.md` and `docs/redesign-verification.md` for setup and exact limits.

Complete: the fresh finish reviewer scored its three material fixes resolved, disposition ship for that fix list. Final production build, typecheck, and supplied browser checks pass. Root DESIGN.md and .impeccable/design.json capture the shipped identity; docs/redesign-verification.md records full coverage and live-service limits. No shipping raster assets were created.

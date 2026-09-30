---
name: Study Room
description: Cited passages, shared questions, and measured confidence.
colors:
  light-background: "#f5f6fa"
  light-surface: "#fff"
  light-surface-raised: "#fff"
  light-surface-muted: "#ecebf7"
  light-text: "#202538"
  light-muted: "#626a7d"
  light-line: "#dfe2ed"
  light-line-strong: "#858da2"
  light-accent: "#6250c8"
  light-accent-hover: "#4e3bab"
  light-on-accent: "#fff"
  light-accent-soft: "#ecebf7"
  light-highlight: "#e4defb"
  light-highlight-text: "#342778"
  light-error: "#a32e34"
  light-error-soft: "#f9e9e8"
  light-success: "#206344"
  light-success-soft: "#e5f1e8"
  light-warning: "#79530d"
  light-warning-soft: "#f7efda"
  light-focus-ring: "#6250c8"
  dark-background: "#12151e"
  dark-surface: "#1b202c"
  dark-surface-raised: "#252b3b"
  dark-surface-muted: "#282b42"
  dark-text: "#f0f1f6"
  dark-muted: "#a8afc2"
  dark-line: "#363d50"
  dark-line-strong: "#778098"
  dark-accent: "#b8a5ff"
  dark-accent-hover: "#ccbfff"
  dark-on-accent: "#211a3e"
  dark-accent-soft: "#282b42"
  dark-highlight: "#40365f"
  dark-highlight-text: "#e8e0ff"
  dark-error: "#ffaeb0"
  dark-error-soft: "#42282b"
  dark-success: "#9dd6ad"
  dark-success-soft: "#233c2e"
  dark-warning: "#e8cd8e"
  dark-warning-soft: "#3b3424"
  dark-focus-ring: "#b8a5ff"
typography:
  display:
    fontFamily: "IBM Plex Sans, Arial, sans-serif"
    fontSize: "clamp(2.8rem, 4.9vw, 4.75rem)"
    fontWeight: 500
    lineHeight: 1.07
    letterSpacing: "-0.04em"
  headline:
    fontFamily: "IBM Plex Sans, Arial, sans-serif"
    fontSize: "clamp(2.1rem, 4vw, 3.3rem)"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-0.035em"
  title:
    fontFamily: "IBM Plex Sans, Arial, sans-serif"
    fontSize: "1.65rem"
    fontWeight: 600
    lineHeight: 1.18
    letterSpacing: "-0.025em"
  body:
    fontFamily: "IBM Plex Sans, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "IBM Plex Sans, Arial, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 500
  citation:
    fontFamily: "ui-monospace, SFMono-Regular, Consolas, monospace"
    fontSize: "0.7rem"
    lineHeight: 1.6
    letterSpacing: "0.015em"
rounded:
  square: "0"
  annotation: "2px"
  compact: "3px"
  control: "5px"
  dialog: "8px"
spacing:
  tight: "8px"
  action: "10px"
  row: "12px"
  inset: "16px"
  stack: "18px"
  field: "20px"
  section-inset: "24px"
  dialog-inset: "26px"
components:
  navigation:
    textColor: "{colors.light-muted}"
    padding: "10px 0"
  room-row:
    textColor: "{colors.light-text}"
    rounded: "{rounded.square}"
    padding: "28px 0"
  button-primary:
    backgroundColor: "{colors.light-accent}"
    textColor: "{colors.light-on-accent}"
    rounded: "{rounded.control}"
    padding: "11px 19px"
  button-primary-hover:
    backgroundColor: "{colors.light-accent-hover}"
    textColor: "{colors.light-on-accent}"
  button-primary-dark:
    backgroundColor: "{colors.dark-accent}"
    textColor: "{colors.dark-on-accent}"
    rounded: "{rounded.control}"
    padding: "11px 19px"
  button-primary-dark-hover:
    backgroundColor: "{colors.dark-accent-hover}"
    textColor: "{colors.dark-on-accent}"
  button-secondary:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.control}"
    padding: "11px 19px"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.light-accent}"
    rounded: "{rounded.control}"
    padding: "11px 10px"
  input:
    backgroundColor: "{colors.light-surface}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.control}"
    padding: "12px 13px"
  tag:
    backgroundColor: "{colors.light-surface-muted}"
    textColor: "{colors.light-muted}"
    rounded: "{rounded.annotation}"
    padding: "5px 9px"
  citation:
    backgroundColor: "transparent"
    textColor: "{colors.light-accent}"
    rounded: "{rounded.annotation}"
    padding: "8px"
  dialog:
    backgroundColor: "{colors.light-surface-raised}"
    textColor: "{colors.light-text}"
    rounded: "{rounded.dialog}"
    padding: "26px"
    width: "min(570px, 100% - 32px)"
---

# Design System: Study Room

## Overview

**Creative North Star: "Study notation"**

Study Room makes evidence and uncertainty legible through cited passages, annotation brackets, ruled reading surfaces, and square confidence measures. The user-pinned violet/slate identity anchors a calm, practical interface with IBM Plex Sans, low-radius controls, and room for long prose.

Reading and conversation determine density. Public pages use generous margins; workspaces use compact controls around readable source material. Specific labels and meaningful state messages carry the interface. Instructional compositions identify themselves as examples.

**Key Characteristics:**

- Violet annotations on slate and white reading surfaces.
- Fine rules, bracket marks, and contextual passage links.
- Sans typography with measured numeric and citation details.
- Shared findings and personal confidence records remain visibly distinct.

Normative tokens are extracted from `app/globals.css` and `app/layout.tsx`. Mode-prefixed colors map to the same semantic variable under `:root` or `:root[data-theme="dark"]`; duplicate values preserve distinct roles. Component frontmatter records light defaults and explicit primary dark variants; sidecar snippets bind live semantic variables for both modes. No additional tonal scale is a production token.

## Colors

The primary violet marks annotations and actions; cool slate neutrals organize reading depth.

### Primary

Use **annotation violet** (`light-accent` / `dark-accent`) for primary actions, source links, active navigation, selected passage outlines, probability measures, and focus. Hover uses the corresponding `accent-hover`; filled controls always use `on-accent` text. `accent-soft` supports quiet hover, selected workspace views, and explanatory blocks.

### Neutral

**Slate canvas** (`background`) surrounds **reading surfaces** (`surface`). `surface-muted` groups secondary material, library areas, and skeletons. `surface-raised` distinguishes dialogs above the page. `text` carries content; `muted` carries supporting copy and identifiers. Fine `line` dividers separate rows; `line-strong` defines fields and important boundaries. Pair `highlight` with `highlight-text` for evidence and text selection.

### State colors

Pair `error`, `success`, and `warning` with their same-mode soft backgrounds. Preserve labels alongside color: reveals say “Correct answer”; failures explain the next action. Connection status also has text. Discussion heat is not an assertion of confusion or mastery.

**The Evidence Rule.** Highlighting identifies a passage or measured activity; it must keep its source label and readable text.

The pre-hydration theme script reads a local override or system preference before rendering. An icon-only sun/moon button has two states, light and dark, and persists explicit overrides. Until the first explicit choice, it follows OS changes. Preserve this behavior on new routes. Print overrides render dark text on white paper.

## Typography

**Display and Body Font:** IBM Plex Sans, loaded through `next/font/google` with weights 400, 500, 600, and 700 and `display: swap`; Arial and sans-serif are fallbacks. The legacy `--serif` variable aliases the sans stack.

**Label/Mono Font:** the native monospace stack from `citation`, also used for percentages, clocks, scores, steps, and code. Use tabular numerals for numeric comparisons.

Display, headline, title, body, and label roles appear in frontmatter. Headings balance lines; h3 uses a compact size (`1.15rem`, 600). Passages use comfortable leading (`0.95rem/1.85`) and `70ch` measure; page leads cap at `65ch`. These are observed role sizes, not a universal geometric scale.

Hero type becomes `clamp(2.65rem, 7.6vw, 4.3rem)` below 800px and `2.55rem` below 420px. Form/workspace titles have smaller context-specific sizes. Preserve reflow at doubled text size rather than forcing fixed heading heights.

**The Heading Rule.** Lead with the meaningful room, article, question, or page heading; place supporting category and provenance metadata after it.

## Layout

General pages use a centered container (`min(1240px, 100% - 80px)`) with top/bottom padding (`58px` / `80px`). Below 800px, width becomes `100% - 40px` and top padding `36px`. Articles cap at `820px`; forms use `min(510px, 100% - 48px)`. Parallel public content, authentication, room lists, and rundown columns become single-column below 800px. Journal rows become single-column below 420px.

The workspace uses `min(1600px, 100% - 48px)` and three columns: `215px` library, fluid reader, and `minmax(340px, 390px)` discussion. Its height is `max(620px, calc(100dvh - 210px))`; panes scroll independently. Below 1200px, library becomes `180px` and discussion `340px`. Below 1000px, a sticky Library / Read / Discuss switcher selects one task pane. Discuss is the default; selecting material or a citation moves to Read. Source reading expands in page flow. Below 800px, margins and pane padding tighten.

The sticky header measures `--sticky-header-height` so scrolling and task navigation follow actual reflow. Search becomes an icon below 1200px; desktop links and New room move into mobile navigation below 1100px. Below 800px, search is available through the menu or the keyboard shortcut. Below 420px, the header can wrap. A styled native English/Français select sits beside the theme button; its icon and chevron are decorative, and the select retains a translated accessible name. Language labels stay in their own language.

Help and feedback and Back to top appear in footer flow, wrapping inside the container. Workspace pages hide the footer/support area. The essential-cookie notice retains fixed corner placement and stacks below 420px.

**The Reflow Rule.** Long sources, names, citations, and actions must wrap inside their pane; changing viewport or text size must not hide the task or cover form fields.

## Elevation & Depth

Tonal layering and fine rules organize normal content. Room, journal, search, passage, and rundown rows use separators rather than repeated lifted cards. Dialogs, mobile navigation, and the cookie notice use the shared shadow. The support action has a smaller existing shadow. Exact mode-aware shadows and the dialog backdrop live in `.impeccable/design.json`.

## Shapes

Controls have modest corners (`control`); citations and annotation surfaces are near-square (`annotation`); passage rows and tab edges stay square. Dialogs are softer (`dialog`). Rules are normally 1px. Selected passages use a 1px inset accent outline and a margin bracket. Correct quiz options use a 1px success outline, soft fill, and explicit label. Reserve circles for presence dots, spinners, and native controls.

## Components

### Buttons and fields

Primary buttons use same-mode accent/on-accent; secondary buttons use surface/text and a strong border; quiet buttons use transparent backgrounds and accent text. Standard buttons have a 44px minimum height; icon buttons are 44px square. Hover changes tone, active press moves down 1px, disabled controls use 0.55 opacity, and busy controls have progress feedback. Label icon-only actions.

Fields use surface/text, a strong 1px border, and 46px minimum height. Hover/focus use accent; field focus outlines are 2px with 2px offset. General keyboard focus uses 4px offset. Invalid fields use error borders and explanatory text; disabled fields use muted surfaces. Textareas resize vertically. Checkbox/radio marks are 20px; consent labels offer a 44px row. Range controls have 44px minimum height. Native selects, number spinners, file pickers, and OS menus retain native behavior. No date/calendar or autocomplete control exists in this app.

### Navigation and tags

Active desktop links combine accent text and a fine bottom rule. The mobile disclosure closes on route change or Escape. Discussion/quiz and task-pane controls expose selected state with `aria-pressed`. Tags are small muted surfaces, with success styling for live rooms; they supplement headings.

### Preferences and authentication

The theme control is a 44px square secondary button with a sun/moon SVG showing the current mode, a translated action label naming the next mode, and `aria-pressed` for dark mode. The language control keeps native select behavior with surface fill, a strong border, decorative SVGs and a 44px minimum height. It uses compact text (`0.82rem`, `0.78rem` below 800px) and asymmetric padding for the icons (`9px 27px 9px 34px`). Below 420px the language icon disappears and left padding becomes `10px`; the choice and chevron remain visible.

English/Français selection writes the essential `study-locale` cookie for one year, updates the document language and refreshes server-rendered content. The server uses a supported cookie preference, then the highest-priority supported Accept-Language entry, then English. Interface translation preserves authored notes, messages and generated study content.

Google, Microsoft and GitHub use full-width secondary buttons in a vertical stack above email authentication, shared by sign-in and signup. Provider icons are SVGs; connecting state replaces the action label and locks competing actions. Providers without both configured credentials remain disabled with translated availability copy. A fine-rule divider labels the email alternative. These states describe configuration, not evidence of successful live callbacks; migration and provider setup are recorded in [OAuth setup](docs/oauth-setup.md).

### Reading surfaces and citations

Passages use ruled rows, mono identifiers, preserved line breaks, and wrapping. Citation buttons name filename/section and navigate to the exact passage, across mobile task panes when needed. Discussion heat changes accent opacity up to 0.22 and measures retrieved activity. The home instructional figure uses corner brackets, source/question marks, ruled divisions, and explicitly labeled example confidence bars. These recurring details do not represent real user activity.

### Dialogs and feedback

Native modals constrain width/viewport height, scroll when necessary, and lock background scrolling. Preserve native focus confinement, trigger focus restoration, Escape cancellation, and busy close suppression. Errors, pending/empty results, consent, and success states each need useful copy and the component's status/alert semantics.

### Rundowns

Lead with the room name. Ruled sections separate shared findings/next steps from personal confidence. Keep PDF/email actions and host-only distribution clear. Preserve empty-evidence language, source links, explanations, busy/disabled export controls, and genuine request feedback.

### Motion

State transitions use 0.18s ease. Spinners rotate over 0.8s; skeletons breathe over 1.5s. Citation, discussion, and Back to top scrolling respect reduced motion. The media query compresses animation/transitions to 0.01ms with one animation iteration and automatic scrolling. Motion explains state; avoid ornamental loops.

## Do's and Don'ts

### Do:

- **Do** use same-mode semantic colors for every surface, state, and control.
- **Do** preserve readable cited passages, meaningful headings, and explicit confidence labels.
- **Do** retain focus outlines, native controls, and task-pane reflow at small widths and enlarged text.
- **Do** distinguish shared findings from personal records and instructional examples from real activity.

### Don't:

- **Don't** restore the superseded terracotta palette or serif heading identity.
- **Don't** replace ruled content rows with decorative stacks of lifted feature cards.
- **Don't** use a colored side stripe as the sole marker for a selected or correct answer.
- **Don't** let floating support actions obscure fields or clip preference controls.

Coverage, review disposition, research provenance, and fixture verification limits are in [the redesign verification report](docs/redesign-verification.md).

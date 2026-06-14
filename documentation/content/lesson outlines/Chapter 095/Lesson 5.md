# Chapter 095 — Lesson 5 outline

## Lesson title

Chapter-outline title "Gate PostHog behind consent" fits — it names the senior decision (consent gating) and the tool (PostHog). Keep it.

- **Page title:** Gate PostHog behind consent
- **Sidebar:** Consent-gate PostHog

## Lesson type

`Implementation` — the test-coder runs for this lesson. The student rewrites `providers.tsx` and builds the consent provider, banner, and seam from scratch against the lesson tests, then verifies on the Network panel and PostHog dashboard.

## Lesson framing

The student installs the discipline that analytics is off until the user says yes, and that the choice lives in exactly one seam. They convert the seeded "capture on first load" defect into a two-belt consent gate: `opt_out_capturing_by_default: true` plus a consent-gated dynamic `import('posthog-js')` that never loads the SDK pre-consent, with grant and revoke both routed through `lib/analytics/consent.ts` so a feature engineer can never reach `opt_in_capturing()` inline. The payoff is the senior framing — a consent banner whose privacy intent actually gates the tracker, closing the analytics half of the chapter 082 consent finding — not the React mechanics. By the end a fresh visit fires zero `/ingest` requests, Accept produces a `$pageview`, and Reject stops capture.

## Codebase state

### Entry (after lesson 4)

- Sentry is wired across client/server/edge (lesson 3); the logger redacts secrets and stamps every line and Sentry event with a `requestId` (lesson 4). Findings 001–003 Fix sections filled.
- `src/app/_components/providers.tsx` is the seeded single `Providers` component: imports `posthog-js` at module scope, wraps `PostHogProvider`, and calls `posthog.init(...)` with `opt_out_capturing_by_default: false` inside a `useEffect` — capture is on at first paint (finding 4 live).
- No consent provider, banner, or `lib/analytics/consent.ts` exists anywhere in the tree.
- `findings/004-posthog-consent-gate.md` is a TODO skeleton (Category / Severity / Rule / Location / Consequence / Fix headers, all empty).
- `/ingest` reverse-proxy rewrite ships pre-wired in `next.config.ts`; PostHog env keys (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`) already validated in `src/env.ts`.
- Performance findings 5/6/7/8 still live and undocumented (lesson 6).

### Exit (after lesson 5)

- `providers.tsx` rewritten to `ConsentProvider > PostHogGate > ThemeProvider` with the `ConsentBanner` mounted inside; the gate runs the dynamic import only on the consented branch and inits with `opt_out_capturing_by_default: true`.
- New `src/app/_components/consent-provider.tsx` (the `analytics`/`decided` source of truth + `useConsent` hook), `src/app/_components/consent-banner.tsx` (equal-weight Accept/Reject), and `src/lib/analytics/consent.ts` (`grantAnalyticsConsent` / `revokeAnalyticsConsent` / `hasAnalyticsConsentCookie` / `ANALYTICS_CONSENT_COOKIE`).
- `findings/004-posthog-consent-gate.md` filled, its Fix section naming the seam, the init flag, the runtime opt-in/opt-out calls, and the session-continuity re-call.
- Optional bonus `findings/009-missing-next-font.md` may be written here.
- Sentry/logger wiring from lessons 3–4 untouched; app still boots.

## Lesson sections

`Implementation` section list, in contract order. Intro carries no header; the rest use the contract's exact headers.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: analytics fires only after the visitor opts in, and the choice is recorded so it sticks across reloads. Then a one-paragraph (or `Screenshot`) description of the finished feature: a cookie-consent banner pinned to the bottom with equal-weight Accept/Reject; a fresh visit shows zero `/ingest` requests in the Network panel; Accept produces a `$pageview` in the PostHog dashboard within ~30 s; Reject stops capture; a reload after Accept resumes capture with no second click. Frame the senior payoff up front — the banner's privacy promise is only real if it actually gates the tracker. Use a `Screenshot` (desktop) of the banner over the marketing page if available; otherwise prose.

### Your mission

Prose brief, no implementation hints, no subsection headers. Weave the following:

- **Feature (user terms):** A cookie-consent banner that holds product analytics off until the visitor explicitly accepts, and a single seam that every grant and revoke flows through.
- **Framing / why it matters:** This is the chapter 082 consent finding re-exposed from the analytics side — chapter 082 caught that a banner's privacy intent must actually gate analytics; here the student builds the gate from scratch and closes the half where PostHog captures with no consent. The seeded `Providers` imports `posthog-js` at module scope and inits with `opt_out_capturing_by_default: false`, so events fire on first load; nothing in the tree gates it.
- **Constraints (the senior decisions that shape the solution, stated as constraints not hints):**
  - Two independent belts must both hold: capture-off-by-default at init *and* a consent-gated dynamic import that keeps the SDK chunk out of the page until consent — default-out alone still ships the SDK and never captures even after consent; the gated import alone risks capture if the flag flips.
  - Grant and revoke both route through one seam so no call site reaches `opt_in_capturing()` directly — the audit grep must have exactly one place to read.
  - Session continuity is the easily-missed case: after a reload `init` ran with capture off, so a returning visitor whose consent cookie is already present must be opted back in on mount.
  - There must be a single source of truth for the consent decision that every tracker reads; the undecided state and an explicit reject both collapse to "off" so nothing fires before the click.
- **Out of scope:** session replay (chapter 093 lesson 6) inherits this same gate once it ships — not enabled here.
- **Functional requirements** — numbered list, each item tagged `[tested]` or `[untested]`. Render with `Checklist` / `ChecklistItem` carrying the `tested`/`untested` chip. Each is a verifiable outcome, phrased as behavior, never as a file or export. Tests are `readFileSync` source-shape probes plus the finding-file shape (node env, no DOM) per the seeded test stub — so observable runtime behaviors that need a browser are `[untested]` and confirmed by hand.

  1. A fresh visit (cookies and localStorage cleared) produces zero `/ingest` requests. `[untested]`
  2. Clicking Accept starts capture; the next navigation fires a `$pageview`, and the events land in the PostHog dashboard within ~30 s. `[untested]`
  3. Clicking Reject stops capture. `[untested]`
  4. Reloading after consent was granted resumes capture without a second click. `[untested]`
  5. PostHog is initialized with capture off by default (`opt_out_capturing_by_default: true`). `[tested]`
  6. The consent decision is held in one source of truth that every consumer reads (`ConsentProvider` / `useConsent`). `[tested]`
  7. Every grant and revoke routes through the single `lib/analytics/consent.ts` seam (`grantAnalyticsConsent` / `revokeAnalyticsConsent` exported and used). `[tested]`
  8. `findings/004-posthog-consent-gate.md` carries all four sections (Rule / Location / Consequence / Fix), the rule cites chapter 093 lesson 3 + chapter 081 lesson 5, the location names `providers.tsx` and the Network surface, and the fix names the opt-out/opt-in pair and the `consent.ts` seam. `[tested]`

  Note for test-coder: tests are source-shape and finding-shape probes only (no DOM/runtime), so requirements 1–4 are the hand-verified browser behaviors and 5–8 are the asserted ones.

### Coding time

One line directing the student to implement against the brief and the lesson tests, then read the reference. Wrap the solution in `<details>` (writer collapses it). Show the four files organized as they sit in the repo, in dependency order:

1. **`src/lib/analytics/consent.ts`** — the single seam. `ANALYTICS_CONSENT_COOKIE = 'consent_analytics'`; `writeConsentCookie` (private; `max-age` 400 days per ePrivacy 13-month cap, `SameSite=Lax`, not `HttpOnly` because the client reads it on mount); `hasAnalyticsConsentCookie`; `grantAnalyticsConsent` (write cookie → dynamic-import posthog → `opt_in_capturing()` → `capture('analytics_consent_granted')`); `revokeAnalyticsConsent` (write cookie off → `opt_out_capturing()` → `reset()`). Use `AnnotatedCode` to direct focus across the three exported functions and the two-belt note that the dynamic import inside each function keeps the SDK out of the page until a consented/teardown branch runs.
2. **`src/app/_components/consent-provider.tsx`** — `ConsentContext` + `ConsentProvider` + `useConsent`. `analytics`/`decided` both start `false` (server and first client render must agree — `document.cookie` is unreadable on the server, so this avoids a hydration mismatch); a mount effect hydrates from `hasAnalyticsConsentCookie()`; `accept`/`reject` call the seam then set state. `useConsent` throws outside the provider. `AnnotatedCode` to highlight the `decided` vs `analytics` distinction and the hydration-mismatch rationale.
3. **`src/app/_components/consent-banner.tsx`** — shows only while `!decided`; equal-weight `Button` Accept/Reject both routed through the hook (never an inline cookie write). Simple `Code`.
4. **`src/app/_components/providers.tsx`** — the rewritten shape `ConsentProvider > PostHogGate > ThemeProvider` with `ConsentBanner` mounted inside `ThemeProvider`. `PostHogGate` reads `analytics` from `useConsent`, short-circuits when false, and runs the dynamic `import('posthog-js')` in an effect keyed on `analytics` with a `cancelled` cleanup guard; init config carries `opt_out_capturing_by_default: true` (belt one) plus `api_host: '/ingest'`, `capture_pageview: false`; the on-mount `hasAnalyticsConsentCookie()` re-calls `opt_in_capturing()` for session continuity. Use `CodeVariants` to show seeded `providers.tsx` (before — module-scope import, `opt_out_…: false`) vs the rewritten gate (after); this before/after is the clearest way to surface the two-belt change.

Decision rationale (one or two sentences each, covering the non-obvious choices and `[untested]` requirements):
- Why two belts are independent and both required (covers the "default-out alone" and "gated-import alone" failure modes).
- Why grant/revoke route through one seam — keeps the discipline grep-able instead of feature engineers reaching for `opt_in_capturing()` directly (requirement 7).
- Why the on-mount opt-in re-call exists — `init` ran with capture off after a reload, so an explicit re-call keeps the wiring readable regardless of PostHog's own persistence (requirement 4).
- Why `analytics`/`decided` both start `false` — hydration-mismatch avoidance, and `decided` separates "undecided, show banner" from "rejected, banner gone, flag off."
- **Callout (`Aside` caution):** the typing wrinkle — posthog-js 1.386 omits `opt_out_capturing_by_default` from its public `PostHogConfig` (its `init` overload rejects unknown keys via `OnlyValidKeys`), so the config is typed through a local `ConsentGatedConfig` extension and passed as `Partial<PostHogConfig>`. The installed surface wins; this is a deliberate deviation from a bare `init({ opt_out_… })` call.
- Coverage of the finding file (requirement 8): the Fix section is a paragraph naming the seam, the init flag, the runtime opt-in/opt-out calls, and the session-continuity re-call.

Link rather than re-explain: chapter 093 lesson 3 for the PostHog consent-gated-init pattern; chapter 081 lesson 5 for the cookie-consent discipline and the "essential cookie needs no consent" rule. Note the optional bonus `findings/009-missing-next-font.md` (raw `<link>` font in `src/app/(marketing)/layout.tsx`, same LCP-path discipline) may be written here for the senior reach.

External resources (resourcer appends after the `<details>`, no header).

### Moment of truth

Test command and expected pass output, then the hand-verify checklist (`Checklist` / `ChecklistItem`) for the `[untested]` runtime behaviors. Named surfaces: **DevTools Network panel** alongside the **PostHog dashboard**.

- Command: `pnpm test:lesson 5`
- Expected: a clean pass (the seeded `describe.todo` is replaced by passing assertions on the init flag, the `ConsentProvider`/`useConsent` source of truth, the `consent.ts` grant/revoke exports, and the finding-file shape).
- By-hand checklist:
  - [ ] With cookies and localStorage cleared, a fresh load shows zero `/ingest` requests (Network filtered to `ingest`).
  - [ ] Clicking Accept fires the `/ingest` capture; the next navigation fires `$pageview`.
  - [ ] The events appear in the PostHog dashboard within ~30 s.
  - [ ] Clicking Reject stops capture.
  - [ ] Reloading after consent resumes capture with no second click.
  - [ ] `findings/004-posthog-consent-gate.md` Fix section names the seam and the three changes (init flag, runtime calls, session continuity).

## Scope

- **Sentry wiring + `beforeSend`** — lesson 3 (Sentry) and lesson 4 (redactor join); untouched here.
- **The logger redactor and request-correlation IDs** — lesson 4.
- **PostHog session replay** — chapter 093 lesson 6; the gate is built so replay inherits it, but enabling replay is out of scope.
- **PostHog events / autocapture tuning beyond the one-off `analytics_consent_granted`** — chapter 093 lesson 4.
- **Performance findings (RSC waterfall, barrel import, N+1, LCP image, composite index) and `SUMMARY.md`** — lesson 6; only the optional bonus font finding 009 may be touched here.
- **`/ingest` reverse-proxy rewrite** — ships pre-wired in `next.config.ts` (chapter 093 lesson 3); not built here.

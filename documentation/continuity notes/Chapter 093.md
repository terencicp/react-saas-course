# Chapter 093 — Product analytics

## Lesson 1 — The cookieless floor: Vercel Analytics and Speed Insights

**Taught.** Installed `@vercel/analytics` and `@vercel/speed-insights` as the cookieless, always-on analytics floor covering traffic (page views, unique visitors, top pages, top referrers, geo, device) and real-user Core Web Vitals, plus the consent-gate exception that lets these two components run outside `useConsent()` and the five-signal threshold for reaching past the floor to PostHog.

**Cut.** Chapter outline listed Web Analytics custom events as a watch-out; lesson mentions them briefly and explicitly marks them out of scope (Pro/Enterprise only, shallow schema) — not cut, just boundary-set. No meaningful chapter-outline topics were dropped.

**Debts.**
- Core Web Vitals metric definitions and thresholds deferred to ch094 lesson 1 (LCP, INP, CLS, TTFB, FCP introduced as preview vocabulary only).
- PostHog decision, wiring, events, flags, replay — all deferred to lessons 2–6 of this chapter.
- Speed Insights dashboard is framed as the input ch094 will consume; ch094 lesson writer should not re-install it.

**Terminology.**
- **Cookieless floor** / **Tier 0** — the always-on, no-consent analytics base; `@vercel/analytics` + `@vercel/speed-insights` in `app/layout.tsx`.
- **Tier 1** — PostHog; additive, consent-gated, earns its weight only when one of the five signals is real.
- **Five threshold signals** — *who* (identified user), *what they did* (event + properties), *across sessions* (funnel), *gated by a flag*, *in replay* — introduced here as the exact boundary; lessons 2–6 elaborate each.
- **Field data** vs. **lab data** — Speed Insights is field data (real users, 75th-percentile); this distinction belongs to this lesson; ch094 owns depth.
- `<Analytics />` / `<SpeedInsights />` — placed inside `<body>` after `{children}` in `app/layout.tsx`; subpath imports `@vercel/analytics/next` and `@vercel/speed-insights/next`.
- `useConsent()` — referenced as the ch081 lesson 5 consent gate; these two components explicitly bypass it.

**Patterns and best practices.**
- `<Analytics />` and `<SpeedInsights />` dropped once at root layout; no per-route placement.
- Neither component wrapped in a consent gate — this is deliberate and must not be "fixed" in later lessons.
- Dashboard toggle (Vercel project settings, per-environment) is a required step separate from the package install; production on, preview opt-in, dev off.
- GA4 named once and dismissed; course default is Vercel for traffic + PostHog for product analytics.

**Misc.**
- Lesson explicitly warns: gating `<Analytics />` behind `useConsent()` kills pre-consent traffic data for zero compliance benefit — later lessons that touch consent must not inadvertently contradict this.
- `@vercel/analytics` requires Vercel's edge to ingest; static exports on non-Vercel hosts silently collect nothing — relevant if ch096–100 deployment chapter discusses static export.
- Vercel Hobby plan has a monthly captured-events cap (collection pauses at cap, not billed); lesson frames it as "effectively free pre-PMF."

---

## Lesson 2 — When PostHog earns its weight

**Taught.** Named the four product needs (event-level analytics, feature flags, session replay, experiments) that cross the cookieless floor; argued one platform (PostHog) over four vendors via shared identity and a single SDK; established PostHog Cloud EU as the GDPR-default region; introduced the consent gate as a named constraint (not wired); previewed the three install packages; closed with a StateMachineWalker decision procedure.

**Cut.** Chapter outline listed self-hosted PostHog's ops cost with a "~50M events/month" break-even figure; lesson rounds this to "tens of millions" without the hard number — immaterial for later lessons. Amplitude named briefly alongside Mixpanel in the outline; lesson collapses them ("Mixpanel / Amplitude") without a separate entry for Amplitude's deeper cohort tooling — not meaningful downstream.

**Debts.**
- PostHog wiring (posthog.init, PostHogProvider, dynamic import, /ingest proxy, env vars, opt_out_capturing_by_default mechanics) — deferred to lesson 3.
- Consent gate internals and state-machine labels — owned by ch081 lesson 5; this lesson references the contract only.
- Event taxonomy, typed track() helper, identify/reset handshake — deferred to lesson 4.
- Feature flags and experiments at depth, server-side bootstrap — deferred to lesson 5.
- Session replay, masking catalog — deferred to lesson 6.

**Terminology.**
- **Four needs** — events, feature flags, session replay, experiments; the canonical threshold names for the rest of the chapter.
- **Distinct ID** — PostHog's per-user/browser identifier; all four primitives hang off it; referenced here with a one-line gloss, deep treatment in lesson 4.
- **One platform, four primitives** — the minimum-stack framing; one SDK, one identity, one dashboard over four-vendor shape.
- **Flag request** — one evaluation of a flag for one user (billing unit introduced here).
- **PostHog Cloud EU** — course default region (Frankfurt, IP capture disabled by default); US Cloud is the non-EU alternative; self-hosted out of scope.
- `useConsent().analytics` — the boolean PostHog reads; lesson names this as the contract without committing to state-machine label names (follows ch081 `{ analytics, marketing }` shape).
- **data residency**, **DPA**, **ClickHouse** — tooltipped at first mention; later lessons can rely on these being defined.

**Patterns and best practices.**
- Adopt primitives incrementally: events + flags first, replay only for the specific no-error bug-class, experiments at the metric-led moment. Shipping all four at install is the named anti-pattern.
- Quota-bust shapes to avoid (named but not fixed here): capture() inside a React render, missing identity stitch doubling events, recording every anonymous session on B2C scale. Lesson 3–6 provide the guardrails.
- PostHog does NOT replace Sentry: Sentry = thrown errors, PostHog = behavior and the no-error bug class. Both are in the stack.
- Vercel Analytics has no consent gate; PostHog does. The two rules must not be merged in later lessons.
- Picking US Cloud when EU users dominate is explicitly "harder to undo than to set up right" — region is load-bearing.

**Misc.**
- Free-tier numbers (~1M events, ~5k replays, ~1M flag requests/mo) are hedged as "at time of writing — check current pricing"; later lessons should not treat them as committed figures.
- `@posthog/next` flagged pre-release (mid-2026): PostHog still points teams at the standard Next.js guide for production; lesson 3 should reach for it where stable and fall back to manual posthog-js + posthog-node where not. Do not present the wrapper as a settled default.
- The three-package install line (`pnpm add posthog-js posthog-node @posthog/next`) is the only code in this lesson — lesson 3 owns all wiring from here.

---

## Lesson 3 — Wiring PostHog through the consent gate

**Taught.** Wired `posthog-js` end-to-end: `PostHogProvider` as a consent-gated dynamic import (belt two), `posthog-node` for server-side capture, the `/ingest` proxy via `next.config.ts` rewrites, and a three-check verification ritual proving the gate holds.

**Cut.** Chapter outline called for `@posthog/next` as the committed default and `capture_pageview: 'history_change'` as the pageview mode. Lesson instead uses the manual two-package wire (`posthog-js` + `posthog-node`) as the default — `@posthog/next` is presented as a future convenience layer once it leaves beta. Pageview handling uses `capture_pageview: false` plus an explicit `PostHogPageView` component (not `'history_change'` auto-mode). Chapter outline's `defaults: '2025-05-24'` was corrected to `'2026-01-30'`. `posthog.identify()` wiring the outline included is deferred entirely to lesson 4.

**Debts.**
- `posthog.identify()` / `posthog.reset()` handshake, anonymous-to-known stitching, how the server obtains `distinctId` — deferred to lesson 4.
- Event taxonomy, typed `track()` helper, person/event/super-property split — deferred to lesson 4.
- Feature flags, `useFeatureFlagValue`, `bootstrapFlags`, flash-of-default-variant fix — deferred to lesson 5. `bootstrapFlags` named only as "what `@posthog/next` will fold in."
- Session replay, masking catalog, `disable_session_recording` — deferred to lesson 6.
- Autocapture on/off decision — deferred to lesson 4.

**Terminology.**
- **Belt two** — the dynamic `import('posthog-js')` inside the consented branch; the module does not exist in the page until `analytics` is `true`.
- **Belt one** — `opt_out_capturing_by_default: true` in `posthog.init`; the SDK is silent even once loaded, the floor if belt two is ever bypassed.
- **`PostHogProvider`** — `'use client'` component in `app/_components/`; reads `const { analytics } = useConsent()`; nests inside `ConsentProvider`, outside `{children}`. Must be a `ConsentProvider` descendant or `useConsent()` throws.
- **`PostHogPageView`** — small `'use client'` component in `app/_components/posthog-pageview.tsx`; uses `usePathname()` + `useSearchParams()` + `Suspense` wrapper; fires `posthog.capture('$pageview')` on route change. Required because `capture_pageview: false` is set.
- **`posthog-node` adapter** — lives at `lib/posthog.ts`; starts with `import 'server-only'`; constructed once at module scope with `flushAt: 1, flushInterval: 0`; use `captureImmediate()` (not `capture()`) in serverless; flush via `after(() => posthog.shutdown())`.
- **`/ingest` proxy** — `next.config.ts` rewrites: `/ingest/static/:path*` → `https://eu-assets.i.posthog.com/static/:path*` and `/ingest/:path*` → `https://eu.i.posthog.com/:path*`; `skipTrailingSlashRedirect: true` required; `api_host: '/ingest'` + `ui_host: 'https://eu.posthog.com'` (no `.i.`) in `posthog.init`.
- **`distinctId`** — glossed as "PostHog's per-user identifier, a parameter the call needs"; lesson 4 owns the full treatment.
- **`defaults: '2026-01-30'`** — pinned PostHog defaults snapshot; the discipline is pinning, the date is to confirm against PostHog docs at write time.

**Patterns and best practices.**
- Provider nesting order is load-bearing: `<QueryClientProvider>` → `<ConsentProvider>` → `<PostHogProvider>` → `{children}`.
- `useEffect` is the correct primitive for the dynamic import + init (external system synchronization); React Compiler is on — no manual `useMemo`/`useCallback` in the provider.
- The `cancelled` flag guards the async-import/effect-teardown gap; a ref guard against double-init exists in production but is omitted here for clarity (lesson notes this).
- `captureImmediate()` over `capture()` for serverless server-side capture; `after(() => posthog.shutdown())` to flush without blocking the response.
- Moral consent gate on server-side capture: only fire behavioral events server-side for users who accepted client-side; no code mechanism enforces this — it is a discipline.
- Verify gate in DevTools: reject path → zero `/ingest` or `posthog.com` requests, no `posthog-js` chunk; accept path → one `/ingest` pageview, `posthog-js` chunk present.
- `NEXT_PUBLIC_POSTHOG_KEY` and `NEXT_PUBLIC_POSTHOG_HOST` go in the `client` block of `env.ts`; `POSTHOG_PERSONAL_API_KEY` goes in the `server` block — a `NEXT_PUBLIC_POSTHOG_PERSONAL_KEY` typo is a build error, not a silent leak.

**Misc.**
- `@posthog/next` explicitly presented as not-the-current-default (beta); lesson names what it will eventually fold in (the `/ingest` proxy, synced client/server distinct-ID cookie, `bootstrapFlags`, automatic flushing) so lesson 5 can refer back to this framing.
- The `PostHogPageView` `Suspense` wrapper is not optional — `useSearchParams()` without it is a Next.js build error.
- Route-handler alternative for the proxy (`app/ingest/[...path]/route.ts` with `[...path]` not `[path]`) is named as the fallback for request-time logic; `next.config.ts` rewrites are the canonical path.

---

## Lesson 4 — Events, properties, and the identify handshake

**Taught.** Installed the Object-Action snake_case past-tense event-naming convention, a typed `AnalyticsEvents` dictionary (`lib/analytics/events.ts`) with a generic `track<K extends EventName>()` helper reached via `useTrack()`, the four property homes (event / person / super / group), the anonymous→known `identify` + `reset` lifecycle, PostHog group analytics for org-level metrics, server-side capture via the `lib/posthog.ts` adapter with the distinct-ID join, the autocapture on/off decision, and a three-event trial-to-paid worked funnel.

**Cut.** Chapter outline listed `posthog.register({...})` super-properties as including `org_id` and `seats` in the default set; lesson drops `org_id` and `seats` from the super-property example (they belong on the group, not as super-properties) — any later lesson building on super-properties should not assume those keys are pre-registered. Outline listed `as const` for the event dictionary literal map; lesson uses a plain `type` declaration (no `as const` object) — the dictionary shape is `type AnalyticsEvents = { ... }`, not an `as const` runtime object. Lint-rule config (`noRestrictedImports` / `no-restricted-syntax` forbidding raw `posthog.capture`) is named as a backstop but not authored — lesson 5 should not assume that config exists in the repo.

**Debts.**
- `$feature/...` super-property auto-attached on flag evaluation — deferred to lesson 5 (super-property mechanism defined here; flag-derived usage is lesson 5's territory).
- `bootstrapFlags` and the distinct-ID cookie shared across SSR boundary — deferred to lesson 5.
- Session replay consent-gated start, `disable_session_recording` — deferred to lesson 6.
- Storing the PostHog `distinctId` on the user row (the durable join for webhooks) — named as the recommended approach but the DB column and migration are not authored here; lesson 5 or the project chapter will need to handle or assume it.

**Terminology.**
- **`AnalyticsEvents`** — `type` mapping event name (snake_case string key) → its property object; lives in `lib/analytics/events.ts`; no runtime object, pure type.
- **`EventName`** — `keyof AnalyticsEvents`; auto-derived union of valid event name strings.
- **`track<K extends EventName>(event, properties)`** — the only public API for firing events in feature code; reached via `useTrack()` hook (not a free exported function) to bind the consented client from `PostHogProvider`.
- **`useTrack()`** — hook that pulls the PostHog client from `PostHogProvider` context and returns the typed `track` bound to it; must be called at component top level (hook rules apply).
- **Distinct ID** — fully defined here (was glossed in lesson 3): PostHog's per-user/per-browser identifier; starts anonymous (localStorage + cookie), linked to `userId` via `identify`, cleared by `reset`.
- **Identify/link/merge** — PostHog's terms for the anonymous→known stitching; "stitch" is accepted as an intuitive synonym; "alias" is explicitly not the operative verb here (that's a separate lower-level PostHog call).
- **Once-per-session constraint** — `identify` with a different ID without a prior `reset` is rejected by PostHog; the lesson shows this as an explicit failure step.
- **`posthog.reset()`** — called *after* `signOut()` (server session destroyed first); clears distinct ID, super-properties, identity link.
- **`posthog.group('organization', orgId, { name, plan, seats })`** — called alongside `identify` at sign-in; must be re-called on org-switch.
- **`captureImmediate()`** — server-side method on the `lib/posthog.ts` adapter (not `capture()`); required for Vercel serverless (flush-per-call); always paired with `after(() => posthog.shutdown())`.
- **Distinct-ID join** — the technique of reading the user's stored `distinctId` from the user row so server-side events (webhooks, cron) attach to the real person rather than creating a ghost.
- **`autocapture: false`** — set in `posthog.init` for the authenticated app; left on for marketing surfaces; `ph-no-capture` CSS class excludes specific elements where autocapture is on (note: this is a class, not an attribute; `data-ph-no-capture` is L6's per-element block terminology, introduced there).
- **Four property homes**: event property (immutable, this event only) / person property (`setPersonProperties`, `$set` / `$set_once`, queryable across all events) / super-property (`posthog.register({...})`, auto-attached to every subsequent event, `register_once` for first-seen values) / group property (on the org via `posthog.group()`).
- **Money as `amount_cents: number`** — integers, never formatted strings; lesson defines this as the course convention.
- **PII boundary** — email and IP never travel as event properties; email goes on the person via `setPersonProperties`; high-cardinality free text is replaced by a bounded fact (`note_length`, `query_had_results: boolean`).

**Patterns and best practices.**
- `track()` calls live in event handlers or effects only — never in a render body (re-renders multiply events).
- One file for the entire event dictionary; do not split across modules (kills the git-log-as-changelog property and scatters diffs).
- Event property keys are snake_case (matching the event name convention and PostHog/query surfaces); surrounding TS identifiers (`track`, `EventName`, `useTrack`) remain camelCase/PascalCase.
- `posthog.identify(user.id, { email })` + `posthog.group('organization', org.id, { ... })` always called together immediately after sign-in.
- `posthog.reset()` called after `signOut()` resolves — ordering is load-bearing (server session destroyed first).
- Server-side capture always: `captureImmediate({ distinctId, event, properties })` → `after(() => posthog.shutdown())`; `distinctId` from the user row (not a fresh ID).
- Moral consent gate on server-side events: only fire for users who accepted client-side; no code mechanism enforces it — it is a discipline.
- PostHog naming divergence from official docs: course uses past-tense Object-Action (`plan_upgraded`); PostHog's own docs use present-tense. This is intentional and documented in the lesson; lesson 5+ must not "fix" it toward PostHog's convention.

**Misc.**
- `@posthog/next` identify/group helpers explicitly excluded — lesson uses raw `posthog-js` client from the provider (consistent with lesson 3's `@posthog/next`-is-not-the-default position).
- The `distinctId` debt from lesson 3 is paid off fully here; lessons 5+ can treat it as established.
- Lesson 5 can rely on super-properties being defined (via `posthog.register`) but should not assume any specific keys are already registered at runtime — the lesson's example only shows the mechanism, not a committed set of pre-registered super-properties shipped to production.
- `$pageview`, `$identify`, `$feature_flag_called` — the `$`-prefixed PostHog system-event namespace is named; custom events live in the unprefixed namespace and must not use `$`.
- The identity stitch diagram is implemented as `IdentifyStitchSequence` (a custom Astro component at `src/components/lessons/093/4/IdentifyStitchSequence.astro`), not the standard `DiagramSequence` — the project chapter should not expect a reusable standard component here.

---

## Lesson 5 — Flags, rollouts, and experiments on one primitive

**Taught.** Feature flags as a single primitive (boolean / multivariate / JSON payload) doing three jobs (kill switch, rollout, experiment); server-side bootstrap via `posthog-node` + the `bootstrap` option on `posthog.init` to eliminate flash-of-default-variant; local evaluation for latency safety; the `@posthog/react` hook surface; experiment discipline (pre-declare metric, no early peeking); and the stale-flag deletion ritual.

**Cut.** Chapter outline framed `@posthog/next` as handling `bootstrapFlags` end-to-end; lesson wires `posthog-node` manually (consistent with L3 — `@posthog/next` named as a future convenience layer, not the current default). Outline listed `useFeatureFlagValue` as the hook name; lesson uses the current `@posthog/react` names (`useFeatureFlagEnabled`, `useFeatureFlagVariantKey`, `useFeatureFlagPayload`). Outline listed both middleware and server-component as server-side evaluation patterns; lesson covers server-component and mentions `proxy.ts` at the call site but does not author a full middleware-redirect pattern — lesson 6 or the project chapter can do so.

**Debts.**
- Session replay (`disable_session_recording`, `startSessionRecording`, masking catalog) — deferred to lesson 6.
- The `posthog.deletePerson(distinctId)` GDPR deletion path for replays — lesson 6 / ch081 L4.
- Lint rule forbidding raw `posthog.capture()` outside the `track()` helper — named in L4 as a backstop but not authored; still unresolved.

**Terminology.**
- **Deploy ≠ release** — code ships dead (flag off); the release is a dashboard toggle. Core mental model of the lesson.
- **Boolean / multivariate / JSON-payload flag** — three value shapes; reach order: boolean first, multivariate for experiments, payload for config-that-varies-by-cohort.
- **Cohort** — PostHog set of users matching a property predicate (defined here; L6 can rely on it).
- **Flash of the default variant** — the client-only timing bug where the default paints before the SDK resolves the assigned variant; poisons experiment day-one buckets.
- **Server-side bootstrap** — evaluate flags with `posthog-node` on the server, pass `{ distinctID, isIdentifiedID, featureFlags }` into `posthog.init({ bootstrap: ... })` so the client's first render has the real value.
- **`bootstrap` shape** — exact keys: `distinctID` (capital `ID`), `isIdentifiedID` (boolean), `featureFlags` (`{ 'flag-key': true | 'variant' }`). No `featureFlagPayloads` key.
- **Local evaluation** — `posthog-node` configured with `personalApiKey` + `featureFlagsPollingInterval: 30_000` fetches flag rules once and evaluates in-process; a server flag read is not a per-request network call.
- **`@posthog/react` hooks** — `useFeatureFlagEnabled` (boolean), `useFeatureFlagVariantKey` (variant string), `useFeatureFlagPayload` (JSON object); companion package, separate from the `posthog-js` provider wired in L3.
- **`evaluateFlags(distinctId)` snapshot** — current `posthog-node` server surface; use `.isEnabled()` / `.getFlag()` off the snapshot (not the legacy `getFeatureFlag` / `isFeatureEnabled` one-shot calls).
- **`$feature/<flag>` auto-tag** — PostHog auto-attaches the evaluated variant to every subsequent event; this is the mechanism that makes experiment attribution and funnel cohorting work.
- **`proxy.ts`** — referenced as the renamed `middleware.ts`; the flag-in-middleware pattern (flag controls a redirect/layout swap) is named but not fully authored here.
- **Kill switch / rollout / experiment** — three release strategies on one flag primitive; differ in value shape, lifespan, and exit condition (delete / convert winner to rollout).
- **Stale-flag deletion ritual** — order is load-bearing: remove code read → deploy → delete flag in PostHog → confirm zero references.

**Patterns and best practices.**
- Bootstrap flags in the root layout (`app/layout.tsx`) for authenticated per-user routes; do not bootstrap on static marketing pages (forces dynamic rendering, loses ISR).
- Server and client must resolve the same `distinctId` — both read the same cookie; mismatch flips the variant at hydration.
- `useFeatureFlagPayload` must be paired with `useFeatureFlagEnabled` or `useFeatureFlagVariantKey` on the same flag — payload read alone does not fire the `$feature_flag_called` exposure event, which silently drops users from experiment attribution.
- Flag hooks are read at component top level (hooks rules); no `useMemo` / `useCallback` (React Compiler is on).
- Experiment primary metric must be a PostHog event (from the L4 dictionary); external metrics break the `$feature/<flag>` join.
- Pre-declare primary metric, hypothesis, and run duration before launching an experiment; stopping on the first green day inflates false-positive rate.
- Quarterly stale-flag audit; deletion order is non-negotiable (read removal → deploy → PostHog deletion).

**Misc.**
- `posthog-node` server adapter (`lib/posthog.ts`, `import 'server-only'`, module-scope singleton) is the same adapter L3 established; lesson adds `personalApiKey` and `featureFlagsPollingInterval` to it — L6 and the project chapter must not construct a second client.
- `@posthog/react` is an additional install on top of L3's three-package baseline (`pnpm add posthog-js posthog-node @posthog/next`) — the L3 provider/identify/track plumbing is unchanged; only flag *reads* use the new companion package.
- Past-tense Object-Action event names (`plan_upgraded`) used as experiment metrics — do not correct toward PostHog's present-tense convention (intentional L4 divergence).
- Money in any payload example is integer cents (`price_cents: number`) per L4 course convention.

---

## Lesson 6 — Session replay with masking by default

**Taught.** Installed PostHog session replay as the fourth and final primitive: DOM-not-video mental model (rrweb-style serialization); masking-by-default posture (SDK config + dashboard settings, both required); mask-vs-block distinction with element-level levers; a SaaS masking catalog; consent-gated start via `disable_session_recording: true` + `posthog.startSessionRecording()`; sampling discipline (sample rate + trigger groups); replay-to-bug-fix operator workflow; negative-space catalog of when not to record; and the pre-ship privacy review ritual.

**Cut.** Chapter outline named `record_user_on_event` as the trigger-based config knob; lesson instead covers **trigger groups in PostHog project settings** as the current surface (SDK key is outdated). Outline listed `posthog.deletePerson(distinctId)` as the GDPR deletion API; lesson corrects this — that method does not exist on `posthog-js`; deletion is **server-side via `posthog-node`** (the `lib/posthog.ts` adapter) or via the PostHog app UI "Delete person" action. No other material scope cuts.

**Debts.**
- GDPR deletion: lesson points to ch081 L4 as the owner and instructs wiring PostHog person-deletion (server-side) as one more downstream delete in that flow — the ch081 L4 lesson must trigger `posthog-node` person-deletion; this lesson does not author that call.

**Terminology.**
- **rrweb** — the open-source DOM-recording engine PostHog's session replay is built on; named once as a gloss, not taught at depth.
- **`disable_session_recording: true`** — key in `posthog.init` that prevents replay from auto-starting; `posthog.startSessionRecording()` is the explicit on-switch called only on the consented branch.
- **`maskAllInputs: true`** — the safety floor in `session_recording`; masks every `<input>`, `<textarea>`, `<select>` value.
- **`maskTextSelector`** — CSS selector for masking text in non-input elements (e.g. `'.sensitive, [data-sensitive]'`).
- **`blockSelector`** — CSS selector for removing elements from the recording entirely (e.g. `'.never-record, [data-no-replay]'`).
- **`ph-no-capture` (class)** — per-element mask (recorded, content hidden); the per-element equivalent of `maskTextSelector`.
- **`data-ph-no-capture` (attribute)** — per-element block (element not recorded at all); the per-element equivalent of `blockSelector`.
- **`data-ph-capture-attribute-unmask="true"`** — selectively unmasks a specific element even under a broader masking regime; the rare whitelist case.
- **`.sensitive`** — course convention for "mask this element's text"; introduced here.
- **`.never-record`** — course convention for "block this element from the recording entirely"; introduced here.
- **`sampleRate`** — key in `session_recording`; value is a **string** fraction (`'0.1'`, not `0.1`) — real foot-gun.
- **Trigger groups** — PostHog project-settings feature that records only sessions matching a URL, event, or feature flag condition, each with its own sample rate and minimum duration; lives in the dashboard, not `posthog.init`, so tunable without a deploy.
- **Mask vs. block** — mask: element recorded, value replaced with `***`; block: element absent from the recording, player shows an empty placeholder.

**Patterns and best practices.**
- Set masking in **both** `posthog.init` (SDK config) and PostHog dashboard (project-level floor); the two compose and split-brain is a common misconfiguration.
- `maskAllInputs: true` is non-negotiable; turning it off streams input values in the clear.
- `contenteditable` rich-text editors are **not** caught by `maskAllInputs` — they must be masked explicitly with a class (the canonical "default didn't catch it" case).
- Sample by value: near-100% of identified users (paying customers, high signal, low volume), low single-digit-percent of anonymous traffic; use trigger groups for flows actively being debugged.
- Network body capture stays off by default; enable only for a time-boxed debugging cycle and disable afterward.
- GDPR deletion: deleting a PostHog person server-side (`posthog-node`) removes all associated events and recordings in one action.
- Internal admin tools belong on a **separate PostHog project** with replay off entirely (operator screens are full of customer PII).
- Auth forms: mask (don't block) the username/email field so support can confirm which account a session belongs to without reading the address.
- Stripe Elements card inputs are already origin-isolated (rrweb cannot read cross-origin iframes), so card data is never captured regardless of config; class the wrapper `.never-record` for defense-in-depth and signal-to-noise.

**Misc.**
- The full canonical `posthog.init` as of this lesson (with replay additions) is: `{ api_host: '/ingest', ui_host: 'https://eu.posthog.com', defaults: '2026-01-30', capture_pageview: false, opt_out_capturing_by_default: true, disable_session_recording: true, session_recording: { maskAllInputs: true, maskTextSelector: '.sensitive, [data-sensitive]', blockSelector: '.never-record, [data-no-replay]' } }`. All later lessons and the project chapter must use this as the canonical init shape.
- `posthog-node` server adapter (`lib/posthog.ts`) is the same module established in L3 and extended in L5; no new client instantiated here.
- Replay is the last PostHog primitive taught; the chapter is complete. The project chapter for Unit 19 wires Sentry, Pino, PostHog, and Vercel Analytics together.

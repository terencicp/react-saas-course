# Lesson title

- Title: `Wiring PostHog through the consent gate`
- Sidebar label: `Wiring PostHog`

# Lesson framing

This is the **wiring lesson** of the PostHog arc: lesson 2 decided *that* PostHog earns its weight; this lesson installs *how* it arrives in the App Router, and it ends in a verifiable state — one test event reaches PostHog post-consent with the right host, and zero PostHog traffic fires pre-consent. Everything past the wire (event taxonomy, identify, flags, replay) is later lessons. Keep the scope tight: this is plumbing, not product analytics yet.

The single load-bearing idea is **belt two, built for real.** Back in ch081 lesson 5 the student learned the two-belt model *conceptually*, using PostHog as the illustrative example — belt one (`opt_out_capturing_by_default`) governs an already-loaded module, belt two (dynamic `import()` after consent) keeps the module out of the page entirely. That lesson explicitly said "wiring PostHog for real is a later chapter's job." This is that chapter. The whole lesson is the student finally writing the `PostHogProvider` that *is* belt two, plus the production-grade extras the conceptual lesson skipped: the `/ingest` proxy, the EU host, server-side capture, and the verification ritual. Frame it as finishing a sentence, not opening a topic — the same move ch092 lesson 1 made with the Sentry `captureException` line.

Critical continuity correction the chapter outline gets wrong, and every downstream agent must follow. The chapter outline describes a "four-state machine (unknown / accepted / rejected / pending)." **The real consent contract shipped in ch081 lesson 5 is not that.** `useConsent()` returns `{ analytics: boolean; marketing: boolean; open, accept, reject }` — two independent booleans, four *combinations*, no string enum named `accepted`/`pending`. PostHog reads the **`analytics` boolean**, full stop. Do not invent a `consentState === 'accepted'` check; the gate is `const { analytics } = useConsent(); if (!analytics) return <>{children}</>;`. Treat "the four-state machine" phrasing in the chapter outline as superseded by the actual code. Aligning to the real contract is the single most important correctness property of this lesson — a split-brain consent read is the headline watch-out.

Pedagogical stance. The student is a competent dev meeting PostHog's App Router surface for the first time. The pain this relieves is concrete and was set up two lessons ago: "I want product analytics but I cannot leak a single tracker before consent, and I cannot flash a default UI." The mental model to leave them with: **PostHog is a module that does not exist in the page until the `analytics` flag is true, and even once it exists it is opted-out until told otherwise — two independent guarantees, audited separately.** Lead every section with the decision and the failure it prevents, not the API. Code samples carry the lesson here (this is a wiring lesson) but each must be framed by *why this shape*, never dumped.

A package-stability caveat threads the whole lesson, inherited from lesson 2's continuity notes. `@posthog/next` was flagged pre-release as of mid-2026; PostHog still points production teams at the standard `posthog-js` + `posthog-node` Next.js guide. So the **settled default is the manual two-package wire** (`posthog-js` in the provider, `posthog-node` for server capture); `@posthog/next` is presented as the convenience layer that *folds* the proxy route, distinct-ID cookie, and flag bootstrap once it stabilizes. Do not present the wrapper as the committed default. This also keeps the lesson honest if the wrapper's API shifts before the course ships. (Server-side flag bootstrap itself is lesson 5's job — name it here only as "the thing `@posthog/next` will fold in," do not wire it.)

Verification is the lesson's gate, not a footnote. The student must finish able to *prove* the gate holds: reject → clean network tab; accept → one pageview to `/ingest`; PostHog Live Events shows it. Give this its own section with a checklist deliverable, mirroring the ch081 consent-gate audit shape the student already knows.

Cognitive-load order: env → provider/belt-two (the core) → the `defaults` and pageview config knobs → the `/ingest` proxy → server-side capture (the one no-browser case) → verification. Each builds on the last; the proxy and server capture are deliberately *after* the working gate so the student has a green baseline before adding the production hardening.

# Lesson sections

## Finishing the sentence: from "nothing fires" to "the right thing fires"

Introduction. Open on the callback to ch081 lesson 5: the student built a gate that guarantees nothing non-essential fires before consent, and that lesson used PostHog as the worked example while explicitly deferring the real wiring "to a later chapter." This is that chapter. State the lesson's goal plainly: by the end, a deliberate test pageview reaches PostHog *after* consent with the EU host and the same-origin proxy, and DevTools confirms *zero* PostHog traffic before consent. Connect to what they already have: the `useConsent()` hook (the `{ analytics, marketing, ... }` contract), the root `<Providers>` Client Component (TanStack chapter), and the typed `env` boundary (ch081 lesson 7). Name the one new discipline: the SDK is a module that does not exist in the page until `analytics` is true.

Re-state the two-belt model in *one* tight paragraph as a refresher, not a re-teach (it was owned by ch081 L5): belt one = `opt_out_capturing_by_default: true`, governs a module already loaded; belt two = dynamic `import('posthog-js')` only after the flag flips, keeps the module out of the page. This lesson builds belt two for real and adds belt one as the structural floor. Use a `Term` on **belt one / belt two** only if it reads cleanly; otherwise just prose since the student saw these terms recently.

Reasoning: the lesson must not feel like a fresh start. The student arrives mid-arc with a built gate and a made decision; the introduction's job is to slot this lesson into that continuity and set the verifiable end-state so the student knows what "done" looks like.

## The three packages and what each owns

Establish the package surface before any code, so the student has a map. Three names:

- `posthog-js` — the browser SDK. Events, the flag client, replay capture. This is what belt two dynamically imports.
- `posthog-node` — the server SDK. Server-side event capture and server-side flag evaluation, for the no-browser moment (a Stripe webhook, a Trigger.dev job).
- `@posthog/next` — the 2026 App Router wrapper that *folds* both together with middleware (distinct-ID cookie), a proxy-route factory, and `bootstrapFlags`.

The senior framing, carried from lesson 2's continuity notes and **confirmed June 2026: `@posthog/next` is published but marked beta, and PostHog's own Next.js docs still position the manual `posthog-js` + `posthog-node` wire as the main walkthrough** (the wrapper is offered as "a simplified integration" beta option). So **the settled default is the manual two-package wire** — the lesson teaches it as the thing the student owns and understands, and presents `@posthog/next` (which folds the proxy, the synced client/server distinct-ID, `bootstrapFlags`, and automatic flushing) as the convenience layer to graduate to once it leaves beta. Tell downstream agents explicitly: do NOT present `@posthog/next` as the committed default, and do NOT wire `bootstrapFlags` here (that is lesson 5; also note `bootstrapFlags` opts the route into dynamic rendering — a lesson-5 concern, flagged so it is not introduced prematurely).

Component: a small `Code` block with the install line (`pnpm add posthog-js posthog-node`), and a short three-row table or a `Figure` with a simple three-box HTML/CSS diagram mapping each package to its surface (browser / server / wrapper). Keep it a *map*, not a deep dive — a plain styled three-column strip is enough; this is orientation.

Reasoning: the student needs to know which package does what before the provider code references `posthog-js` and the server-capture section references `posthog-node`. Naming the wrapper's pre-release status up front prevents the student from reaching for an unstable API as the default and prevents the lesson from rotting if the wrapper's surface shifts.

Tooltip candidates here: **DSN / project key** (gloss the public-write key vs personal key distinction in one line), **SDK** if not already glossed earlier in the course (likely is — skip if so).

## The env boundary: three keys, one of which must never reach the client

Wire the env variables through the typed `env` from ch081 lesson 7 *before* the provider, because the provider reads them. Three variables, and the client/server firewall is the whole point:

- `NEXT_PUBLIC_POSTHOG_KEY` — the project's public-write key. Safe to ship to the client by design; PostHog ingest is write-only with it. Lands in the client block of the env schema.
- `NEXT_PUBLIC_POSTHOG_HOST` — `https://eu.i.posthog.com` for EU Cloud (the course default region from lesson 2's GDPR posture). Client block.
- `POSTHOG_PERSONAL_API_KEY` — server-only, used later for server-side flag evaluation and admin reads. **Never** in the client block; it is a read-capable credential. Server block.

The load-bearing teaching point: the `NEXT_PUBLIC_` prefix is the firewall. The two public keys are *meant* to be in the browser bundle; the personal key never is, and the env schema's server/client split makes a misnamed `NEXT_PUBLIC_POSTHOG_PERSONAL_KEY` a build error, not a silent leak. This is the ch081 lesson 7 firewall job (#3 of the four jobs) applied to a concrete new credential — call that back briefly.

Component: `AnnotatedCode` over the `env.ts` additions (the `client: { ... }` and `server: { ... }` block entries plus the `runtimeEnv` mapping). Steps: (1) the two `NEXT_PUBLIC_` keys in the client block — color blue, note "these are *designed* to ship to the browser"; (2) the personal key in the server block — color orange, note "read-capable, server-only, the firewall keeps it out of the bundle"; (3) the `runtimeEnv` mapping line if the schema requires it. Keep to ~3 steps, ≤6 lines prose each.

Scope note for agents: do NOT re-teach `@t3-oss/env-nextjs` mechanics or the four jobs — ch081 lesson 7 owns that. Reference it in one sentence and move on. The reach here is "add three entries to a file you already understand."

Watch-out to fold into the section (not a separate section): misnaming the personal key with a `NEXT_PUBLIC_` prefix ships a read-capable credential to every browser. The env split is what catches it.

Reasoning: the provider code in the next section reads `env.NEXT_PUBLIC_POSTHOG_KEY` and `env.NEXT_PUBLIC_POSTHOG_HOST`; the student needs these defined and needs to understand *why* the public keys are safe and the personal one is not, since "ship a key to the client" reflexively reads as a bug.

## The provider is belt two: a consent-gated dynamic import

This is the core section — the longest, the one the lesson builds toward. The student writes (reads, really — framed as owning a starter piece, same convention as ch081 L5's provider) the `PostHogProvider`, a `'use client'` component that *is* belt two.

Build it conceptually first, then show the code. The shape:

- It mounts **inside** the existing root `<Providers>` (the TanStack one in `app/_components/providers.tsx`), and **inside** the `ConsentProvider` from ch081 L5 — order matters: `ConsentProvider` must be an ancestor so `PostHogProvider` can call `useConsent()`. State this ordering explicitly and show it in the layout snippet. One provider tree per app — this slots in, it is not a competing root.
- It reads `const { analytics } = useConsent()`. **The gate is the `analytics` boolean.** (Reinforce the continuity correction: not a string state, not a four-valued enum — the literal boolean the ch081 contract returns.)
- When `analytics` is `false` (the default, a reject, or undecided — they all converge on "off", a point ch081 L5 hammered), the provider renders `{children}` and the dynamic import is *never called*. No `posthog-js` in the bundle's executed path, no network, nothing.
- When `analytics` flips to `true`, an effect dynamically imports the SDK (`const { default: posthog } = await import('posthog-js')`), calls `posthog.init(key, { ...config })`, then `posthog.opt_in_capturing()`. The init config carries belt one: `opt_out_capturing_by_default: true`. So even after the module loads, it is silent until the explicit opt-in — and if the gate were ever bypassed, the module stays mute.
- When `analytics` flips back to `false` (withdrawal), the effect tears down: `posthog.opt_out_capturing()` + `posthog.reset()` to stop queued events, matching the revocation discipline ch081 L5 already established. (Mention `reset()`'s identity-clearing role only in passing — the deep identify/reset treatment is lesson 4.)

Components:

1. `AnnotatedCode` over the `PostHogProvider` component (the `'use client'` file). This is the centerpiece — budget the most steps here (5–6). Step targets: (a) `'use client'` + the `useConsent()` read of the `analytics` boolean — color blue, "the single source of truth, read as a boolean"; (b) the early `if (!analytics) return children` short-circuit — color green, "belt two: the import below is never reached"; (c) the `await import('posthog-js')` line — color violet, "the SDK code arrives in the browser *only here*, only now"; (d) the `posthog.init(..., { opt_out_capturing_by_default: true, ... })` — color orange, "belt one: silent even once loaded"; (e) the `opt_in_capturing()` call gated on consent; (f) the cleanup/withdrawal branch (`opt_out` + `reset`). Use `maxLines` generously but ≤18; if the file is long, that is fine — it scrolls.

2. A short `Code` (tsx) snippet of the **layout/providers nesting** showing `<ConsentProvider>` wrapping `<PostHogProvider>` wrapping `{children}`, with a one-line highlight on the nesting order. This is small but load-bearing — getting the order wrong makes `useConsent()` throw (the ch081 L5 hook throws outside its provider). Reasoning for a separate snippet: the nesting is a distinct decision from the provider internals and deserves its own focused view.

3. `RequestTrace` is **not** the right fit here (no SSR-boundary/wire question). Instead, reach for `DiagramSequence` to make belt two visible as a timeline — but **check first whether ch081 L5's `PreConsentTimeline` already covers this**; if it does, do NOT duplicate it, just reference it ("you saw this timeline in the consent-gate lesson") and skip the diagram. If a fresh visual adds value, a 3-step `DiagramSequence`: (1) page loaded, `analytics: false`, network panel empty, no `posthog-js` chunk; (2) user accepts, `analytics: true`, the dynamic import fires, `posthog-js` chunk appears in the network panel; (3) `opt_in_capturing()` runs, first capture request goes out. The pedagogical goal: make "the module does not exist until step 2" literally visible. Lean toward referencing the existing timeline to avoid redundancy — flag this decision for the writer.

`CodeTooltips` candidates on the init config block: `opt_out_capturing_by_default` (one-line: "ships disabled; governs a module already loaded — belt one"), `persistence` (gloss `'localStorage+cookie'`), `capture_pageview` (defer the full explanation to its own section below — just a stub here or omit).

Exercise: a `MultipleChoice` or short `Sequence` checking the belt-two ordering — best fit is a `Sequence` ("order the events from page load to first capture": page renders → user clicks Accept → `analytics` flips true → `import('posthog-js')` resolves → `init` with opt-out-by-default → `opt_in_capturing()` → first event). This drills the exact ordering that *is* the rule. Grade: source order is correct order. Reasoning: ordering is the misconception that ships to prod (people put the import at module top and think the opt-out flag saves them — the ch081 L5 MCQ already tested the *static* version of this; a `Sequence` here tests the *dynamic wire* the student just built). Do NOT reuse the ch081 MCQ verbatim; this one is about the wire the student now owns.

Note for agents: ReactCoding/Sandpack cannot load `posthog-js` (third-party npm; see project constraint), so a *live* coding exercise that actually runs PostHog is impossible. Keep exercises to ordering/MCQ/buckets. Do not propose a live sandbox that imports `posthog-js`.

Reasoning: this section is the lesson. The provider *is* the deliverable; everything else is hardening around it. The two-belt structure must come through in the code annotations, not just prose, because the student's job downstream is to recognize this shape and audit against it.

## Pinned defaults and App Router pageviews

Two config knobs that the init call needs but that deserve their own beat so they do not get lost inside the provider walkthrough.

**`defaults: '<date>'`.** PostHog's `defaults` option bundles the recommended settings for autocapture, pageview behavior, and exception capture behind a single dated snapshot. Pin a specific date so a future PostHog default change cannot silently flip the app's behavior under it — the same "pin the snapshot" discipline ch081 L5 mentioned in passing. **Verified June 2026: the current value PostHog's docs show is `'2026-01-30'`** (the chapter outline's `'2025-05-24'` is stale — do not use it). Re-confirm at write time against PostHog's docs and use whatever the live snapshot is; frame it as "pinning is the discipline, the date is a value to confirm and revisit when PostHog ships a new default set."

**App Router pageview capture — the deliberate-handling point.** This is the durable lesson regardless of which exact knob is current: the App Router navigates via `history.pushState` (that is how `next/link` and `useRouter().push()` move between routes without a full reload), so a naive setup either over-counts or misses client-side navigations. **Verified June 2026: PostHog's canonical Next.js pattern is `capture_pageview: false` plus a small `PostHogPageView` client component** that reads `usePathname()` + `useSearchParams()` and fires `posthog.capture('$pageview')` on route change (wrapped in `Suspense` because `useSearchParams` opts the subtree into client rendering). The `'history_change'` mode exists as an alternative auto-capture path; present the manual `PostHogPageView` component as the recommended shape since that is what the current docs walk, and note `'history_change'` as the lighter-weight alternative. Re-confirm which is current at write time — this API has shifted before.

Component: show the tiny `PostHogPageView` component as a `Code` (tsx) block — it is short and self-contained — and put `defaults` + `capture_pageview: false` in the `init` config (fold as two `AnnotatedStep`s on the provider's `AnnotatedCode`, or a small `CodeTooltips` over the config slice). Flag the placement choice for the writer. Note the `Suspense` wrap requirement explicitly; missing it is a build error in the App Router.

Watch-out to fold in: omitting deliberate pageview handling and getting either no client-side-navigation pageviews or doubled ones — the funnel looks broken and nobody knows why; forgetting the `Suspense` boundary around the `useSearchParams` reader.

Reasoning: these knobs are where "it works in dev but the numbers are wrong" bugs live. Pinning `defaults` is a senior reflex worth isolating; the pageview handling is non-obvious because the App Router's client navigation is invisible to a naive pageview config.

## The /ingest proxy: a same-origin relay past ad-blockers

Why the proxy is not optional in 2026. Ad-blockers heuristically block requests to `i.posthog.com` (and the EU host). A meaningful slice of real users runs one. Without a workaround, those users' events silently vanish — and the loss is invisible because nothing errors. The fix: a same-origin **proxy route** that relays PostHog traffic through the app's own domain, so the requests go to `/ingest/...` (first-party, unblocked) instead of `i.posthog.com`.

The wire, two halves:

- **The relay.** Verified June 2026: PostHog's canonical Next.js proxy is **`next.config.ts` `rewrites()` plus `skipTrailingSlashRedirect: true`** — two rewrite rules, one for the ingest path (`/ingest/...` → `https://eu.i.posthog.com/...`) and one for static assets (`/ingest/static/...` → `https://eu-assets.i.posthog.com/static/...`). Present this rewrites approach as the primary/canonical path. A catch-all route handler at `app/ingest/[...path]/route.ts` (note `[...path]`, not `[path]`, or it forwards only one segment) is the alternative when the relay needs request-time logic; mention it as the fallback. `@posthog/next` folds the proxy in automatically once the student adopts the wrapper — name that.
- **The init config flips.** `api_host: '/ingest'` (so the SDK sends events same-origin, through the rewrite) **and** `ui_host: 'https://eu.posthog.com'` (so links the SDK generates — toolbar, replay viewer, flag console — point at the real PostHog *UI* host). Note the distinction the student will get wrong: the ingest host is `eu.i.posthog.com` (with the `.i.`), the UI host is `eu.posthog.com` (no `.i.`). Both must be set; `api_host` without `ui_host` leaves the toolbar and SDK-generated links broken (verified — this is a documented gotcha).

Component: `CodeVariants` is the right fit — two related files as tabs: tab 1 the `next.config.ts` `rewrites()` + `skipTrailingSlashRedirect`, tab 2 the `init` config diff (`api_host` + `ui_host` added, `ins=` markers). Prose under each ≤6 lines. Reasoning: "two files that work together" is exactly the `CodeVariants` use case, and the `ins=` markers show the config delta from the previous section.

`Term` candidate: **same-origin / first-party request** (one-line gloss tying to why ad-blockers let it through). **Reverse proxy** if the writer uses the term — it is the precise name for this relay.

Watch-outs to fold in: confusing the ingest host (`eu.i.posthog.com`) with the UI host (`eu.posthog.com`) when setting `ui_host`; forgetting the static-assets rewrite (the SDK bundle itself fails to load); the catch-all glob being `[path]` not `[...path]` if the route-handler fallback is used; pointing the rewrites at the wrong region (US vs EU).

Reasoning: deliberately placed *after* the working gate so the student adds it as hardening on a green baseline rather than debugging two new things at once. The proxy is where "my events are under-counting in production but fine locally" originates, so the ad-blocker rationale must be explicit, not assumed.

## The server-side moment: capturing without a browser

The one case where `posthog-node` is the reach: a server event with no client present. Two canonical examples, both already in the student's world — a Stripe webhook completing a checkout (ch064/065), a Trigger.dev job firing on a schedule (ch066/067). The browser SDK and the consent gate are irrelevant here because there is no browser; the event originates server-side.

The pattern (keep it tight — this is a *preview* of server capture; lesson 4 owns the distinct-ID join in depth):

- `import { PostHog } from 'posthog-node'` in a `import 'server-only'` module (`lib/posthog.ts` per the `lib/` adapter convention — SDK adapters with a key live in `lib/`, start with `server-only`).
- One process-scope client, constructed with `flushAt: 1, flushInterval: 0` (no batching — the function will not live long enough to batch).
- **Verified June 2026: use `captureImmediate({ distinctId, event, properties })`, not `capture()`, in serverless** — `capture()` is fire-and-async and the function can freeze before the request lands; `captureImmediate()` awaits the HTTP send. This is a current-best-practice correction over the chapter outline's plain `capture()`.
- **Flush on the way out.** Verified June 2026: on Next.js 15.1+ (the course is on 16) the idiom is to call `posthog.shutdown()` inside `after(...)` (from `next/server`) so the flush runs *after* the response is sent without delaying it; `await client.shutdown()` inline is the fallback. Un-flushed events are lost on Vercel function termination — this is the headline server-side gotcha, and `after()` is the clean way to handle it.

The consent nuance, stated carefully (it is subtle and a likely confusion): server-side capture has no *technical* consent gate because it is not in the user's browser — but the *moral* gate still holds. Only server-fire events for users who have accepted client-side, or for genuinely session-less events (an anonymous webhook keyed by the upstream provider's ID). Do not server-fire behavioral events for a user who rejected. Name this as a discipline the student carries, not a code mechanism.

Component: `AnnotatedCode` over the `lib/posthog.ts` server client + a capture call (e.g. inside a webhook handler). Steps: (1) `server-only` + the single client construction with `flushAt: 1, flushInterval: 0` — color orange, "no batching, this process dies fast"; (2) the `captureImmediate({ distinctId, ... })` call — color blue, "awaits the send, unlike fire-and-forget `capture()`"; (3) `after(() => posthog.shutdown())` — color red, "flush after the response, or the event dies on function termination." 3 steps.

Tooltip: **distinct ID** — one-line gloss ("PostHog's per-user identifier; lesson 4 covers how the server learns it"), since the deep treatment is deferred but the student needs to not be confused by `distinctId` appearing here.

Scope note for agents: do NOT teach how the server *obtains* the distinct ID (cookie read / user-row lookup) — that is lesson 4's identify-handshake territory. Here it is a parameter the call needs; gloss it and move on.

Reasoning: server capture is genuinely different (no consent gate, must flush) and the `shutdown()` gotcha loses events silently in production, so it earns a section. But it is a small slice of total events, so it stays short and explicitly defers the identity mechanics to lesson 4.

## Proving the gate holds: the three-check verification

The lesson's gate, given its own section because "wired" is not "trusted" until verified — and the student already knows this ritual shape from the ch081 L5 consent-gate audit. Three checks, run in order:

1. **Reject path.** In an incognito window, click Reject (or leave undecided) in the consent banner. Open DevTools Network. Click a `<Link>` to navigate. Expect: **zero** requests to `/ingest` or to `posthog.com`. No `posthog-js` chunk loaded. This is belt two proven — the module is not in the page.
2. **Accept path.** Accept analytics. Click a `<Link>`. Expect: exactly **one** pageview request to `/ingest` (same-origin, proving the proxy works), and the `posthog-js` chunk now present.
3. **Server confirmation.** Open PostHog's Live Events (or Activity) tab. The pageview lands, attributed to the project's distinct ID, within seconds.

Frame check 1 as the compliance-critical one: it is the same incognito-reject test ch081 L5 made the student run, now against the *real* SDK instead of the conceptual one. If anything PostHog-shaped appears before Accept, the gate is broken — and this is exactly the test that later becomes a CI assertion.

Component: `Checklist` (the `Checklist`/`ChecklistItem` deliverable component, `untested` chips) as the section's takeaway — mirror the ch081 L5 audit-checklist pattern so the student recognizes the form. Items: the reject-path clean network tab; the accept-path single `/ingest` pageview; the Live Events landing; `api_host`/`ui_host` set correctly; the personal key absent from the client bundle (a quick "search the built bundle / Network for the key" check); `opt_out_capturing_by_default: true` present. ~6 items.

Optionally a `Screenshot` (or `TabbedContent` of two) of the DevTools Network panel — clean (reject) vs one `/ingest` request (accept) — if a real capture is feasible; otherwise prose + checklist suffices. Flag as optional; do not block on producing screenshots.

Reasoning: this is the lesson's contract with the student — they leave able to *prove* the gate, not just having typed it. The checklist is the durable artifact they run against a real codebase, consistent with how this whole part of the course teaches (auditable deliverables).

## External resources

`ExternalResource` cards in a `CardGrid`: PostHog's Next.js install guide (the canonical manual `posthog-js`+`posthog-node` wire — the settled default this lesson teaches), PostHog's reverse-proxy docs (the `/ingest` rationale and host config), PostHog's `posthog-node` docs (the `shutdown()`/flush behavior). Pick 3, all current PostHog docs. Reasoning: these are the live references for the exact APIs taught, and pointing at the manual guide reinforces that it — not the pre-release wrapper — is the default.

# Scope

**Prerequisites to redefine concisely (do not re-teach):**
- The consent gate and `useConsent()` — owned by **ch081 lesson 5**. Restate only the contract (`{ analytics, marketing, open, accept, reject }`, `analytics` is the boolean PostHog reads) and the two-belt model in one refresher paragraph. The state-machine internals, the banner, the essential/non-essential test, the audit-log write — all ch081 L5; reference, never reproduce.
- The typed `env` boundary — owned by **ch081 lesson 7**. Reference the client/server firewall in one sentence; do not re-teach `@t3-oss/env-nextjs` or the four jobs.
- The root `<Providers>` Client Component — owned by the **TanStack Query chapter**. Reference as the existing mount point; do not re-teach provider composition.
- The PostHog *decision* (four needs, one-platform play, EU region, free-tier shape) — owned by **ch093 lesson 2**. Assume it as made; do not re-argue whether to add PostHog.

**Explicitly out of scope (defer, name the owner):**
- Event taxonomy, the typed `track()` helper, the event dictionary, person/event/super-property split — **ch093 lesson 4**. The provider here exposes the SDK; *what to fire* is lesson 4.
- The `identify`/`reset` handshake, anonymous-to-known stitching, group analytics, how the server obtains the distinct ID — **ch093 lesson 4**. Server capture here takes `distinctId` as a glossed parameter only.
- Feature flags, `useFeatureFlagValue`, server-side `bootstrapFlags`, the flash-of-default-variant fix, local evaluation — **ch093 lesson 5**. Name `bootstrapFlags` only as "what `@posthog/next` will fold in"; wire nothing.
- A/B experiments — **ch093 lesson 5** (folded under flags).
- Session replay, masking catalog, `disable_session_recording`, sampling — **ch093 lesson 6**. The init config may *mention* `disable_session_recording` as part of belt one's safety floor in passing (ch081 L5 already named it), but the replay treatment is lesson 6.
- Autocapture on/off decision — **ch093 lesson 4** (it is an event-volume decision). Do not teach the `autocapture: false` choice here beyond what `defaults` implies.
- Sentry / error monitoring — **ch092**. PostHog and Sentry are complementary; do not conflate.
- GDPR data deletion (`deletePerson`) — **ch081 lesson 4** owns erasure; ch093 lesson 6 points at it for replays. Out of scope here.
- Self-hosted PostHog host configuration — out of scope (course uses PostHog Cloud EU); name once at most if a watch-out needs it.

# Notes on conventions and deliberate divergences

- File locations follow the conventions: `PostHogProvider` is a `'use client'` component co-located with the root providers (`app/_components/providers.tsx` neighborhood); the server client is `lib/posthog.ts` starting with `import 'server-only';` (SDK-adapter carve-out to the "lib is pure" rule). Env additions go in `@/env`. Flag these paths so downstream code is consistent.
- Env import is `import { env } from '@/env'` (not `lib/env`) per the established alias.
- `useEffect` is the correct tool for the dynamic import + init in the provider — it is synchronization with an external system (a third-party widget/SDK), which is exactly the sanctioned `useEffect` use in the conventions. Say so briefly so it does not read as an anti-pattern; this is one of the few legitimate effect uses.
- React Compiler is on, so no manual `useMemo`/`useCallback` in the provider — keep the code clean of them (conventions).
- **Deliberate divergence to flag for downstream agents:** the provider code is shown in a slightly simplified shape (e.g., the dynamic import + init may be shown inline in an effect rather than extracted into a fully production-hardened helper with ref guards against double-init) so the belt-two structure reads clearly. Note this is pedagogical staging — the production version would guard against React strict-mode double-invoke and memoize the client on a ref. Mention the double-init guard exists in one watch-out line so the student is not misled, but do not let it obscure the core shape.
- Server capture config (`flushAt: 1, flushInterval: 0`, `await shutdown()`) is the production shape, not simplified — these are load-bearing for correctness on Vercel and must be shown as-is.

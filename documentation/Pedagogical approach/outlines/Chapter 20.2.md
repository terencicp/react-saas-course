## Concept 1 — The cookieless floor and what it does not answer

**Why it's hard.** Students returning to web reach for Google Analytics by reflex and bolt on PostHog at day zero, then drown in event taxonomy decisions before the marketing site has 100 visitors. The mental shift is that traffic and Core Web Vitals are answered by two `<script>` injections that need no consent banner — and that this is the *whole* stack until product questions arrive.

**Ideal teaching artifact.** A two-panel Decision archetype. The left panel: a hand-drawn dashboard mock showing what Vercel Web Analytics and Speed Insights actually surface (page views, top pages, country, LCP/INP/CLS p75) — the visible product of two installs. The right panel: the same dashboard with four senior questions written across it as sticky notes ("did the new pricing page lift trial-to-paid?", "is feature X live for 10% of orgs?", "why did this user rage-click?", "did variant A beat B?") and a stamped-on "no answer here." The visceral takeaway is that the floor answers three questions completely and four questions not at all — and that the boundary, not the floor, is the lesson.

**Engagement.** A `MultipleChoice` round of five candidate senior questions ("how many unique visitors last week?", "which 10% of orgs see the new billing UI?", "is LCP under 2.5s at p75?", "what did the user click before bailing?", "what's our top referrer?") where the student marks each as *answered by the floor* or *needs more.*

**Components.**
- Primary: `Figure` wrapping a hand-SVG of the two-panel dashboard-with-sticky-notes mock; sticky-note "no answer" stamps are inline SVG.
- `MultipleChoice` for the five-question sort.
- `Steps` for the two-install walkthrough (`@vercel/analytics`, `@vercel/speed-insights`, dashboard toggle, verify).

**Project link.** Chapter 20.4 ships observability against a seeded app; the project assumes Vercel Analytics is the silent floor and only mentions it as a verify-it-rendered check — the concept's contribution to the project is removing it from the worry list.

## Concept 2 — The four needs that cross the threshold

**Why it's hard.** "When do we add product analytics?" reads as a vibes call. Students either install on day zero (premature) or wait until the team is begging (too late). The fix is naming four concrete needs — event-level analytics, feature flags, session replay, experiments — as the explicit gate. Each need is a load-bearing reach with its own senior question; none is optional once it fires.

**Ideal teaching artifact.** A Decision archetype carried by scenario sorting. Present eight short scenarios drawn from a real SaaS team's week: "the PM wants to know if trial-to-paid moved after the new onboarding"; "engineering wants the new billing UI live for 10% of orgs"; "support has three users who say the dashboard 'just broke' with no error"; "we're A/B testing two paywall copies"; "we need to know which referrer drove last week's signups"; "is the app fast enough for SEO?"; "did user 4f8a churn after seeing the upgrade modal?"; "what's our weekly active count?". The student sorts each into one of five buckets: *Vercel floor*, *events*, *flags*, *replay*, or *experiments.* The buckets *are* the four needs — making them concrete is the whole lesson.

**Engagement.** The artifact carries the assessment (the sort is the teaching). Follow with a one-question `TrueFalse` confirming the inverse — "a pre-PMF marketing site with no auth, no rollouts, and no UX bugs needs PostHog today" — to lock the threshold as an upper bound, not just a lower one.

**Components.**
- Primary: `Buckets` with the eight scenarios and five categories (two-column layout).
- `TrueFalse` for the inverse-direction lock.
- `Aside` (note) listing the four needs after the sort so the student sees the rule the buckets encoded.

**Project link.** The Chapter 20.4 starter has events, flags, and replay already in play — the four-needs frame is the prerequisite that makes the project's PostHog wiring read as inevitable rather than imposed.

## Concept 3 — One platform, four primitives

**Why it's hard.** Each PostHog primitive has a sharper specialist competitor (Mixpanel, LaunchDarkly, FullStory, Statsig). A student reading vendor marketing concludes "best-of-breed wins" and assembles four contracts. The course's minimum-stack thesis pushes back: the cost of four SDKs, four identity stores, and four dashboards exceeds the marginal depth — until a specific primitive's depth becomes load-bearing.

**Ideal teaching artifact.** A side-by-side stack diagram as the Decision archetype's visual carrier. Left: the four-vendor stack drawn as four parallel SDK boxes (`mixpanel-js`, `launchdarkly-js`, `fullstory`, `statsig-js`), each with its own identity store and its own dashboard, with four arrows leaving the browser. Right: the PostHog stack as one SDK box, one identity store, one dashboard, one arrow. The drawing is the argument. Underneath, a short "when does the four-vendor stack earn its weight?" decision tree naming the three flip conditions (flag scale past 10k, event depth past PostHog's cohort UX, experiment program past the basic stats UI).

**Engagement.** A `Matching` exercise pairing each specialist competitor to the *one* condition that would flip the choice (`Mixpanel` → "event depth is the load-bearing reach"; `LaunchDarkly` → "10k+ flags with nested targeting"; `FullStory` → "replay is the primary reason to buy"; `Statsig` → "A/B is the team's daily reach"). Forces the student to remember the flip condition, not the vendor.

**Components.**
- Primary: `Figure` with hand-SVG of the side-by-side stack drawing (four SDK boxes vs. one).
- `Matching` for vendor-to-flip-condition pairing.
- `Aside` (tip) noting PostHog Cloud EU as the GDPR-default region.

**Project link.** The Chapter 20.4 starter uses PostHog for events, flags, and replay simultaneously — the project's single-SDK shape is the concept made physical.

## Concept 4 — The consent-gated dynamic import

**Why it's hard.** The naive wiring imports `posthog-js` at the module top, calls `init()` in a provider effect, and assumes "we'll handle consent later." That ships a network request to PostHog before the user has accepted. The right wiring has three structural defenses stacked — dynamic import (no SDK code in the pre-consent bundle), `opt_out_capturing_by_default: true` (silent even after import), explicit `opt_in_capturing()` after consent flip — and a four-state machine (`unknown`, `pending`, `accepted`, `rejected`) governing each one.

**Ideal teaching artifact.** A two-beat Setup/wiring lesson. First beat: a state-machine figure showing the four `useConsent()` states as nodes with transitions, and three "what fires?" badges per state — *bundle loaded?*, *SDK initialized?*, *events captured?* The student sees that `unknown`, `pending`, and `rejected` all answer no/no/no, and only `accepted` answers yes/yes/yes. Second beat: an `AnnotatedCode` walkthrough of `PostHogProvider` with the dynamic import, the `opt_out_capturing_by_default: true` floor, and the explicit `opt_in_capturing()` call highlighted at the moments they bind to the state machine. The state-machine figure is referenced inline from the code annotations — "this guard reflects the *accepted* transition above."

**Engagement.** A `PredictOutput` round: given four DevTools Network panel snapshots (one per state) with consent set to each, the student picks which snapshot matches the state. The wrong snapshots include the classic failure modes (request fires under `unknown`; request fires under `rejected` because `opt_out_capturing_by_default` was forgotten).

**Components.**
- Primary: `Figure` with hand-SVG of the four-state machine + per-state "what fires" table. Single-use within this chapter but forward-links to any future consent-gated SDK lesson (Stripe analytics, GA4 if ever reintroduced).
- `AnnotatedCode` for the `PostHogProvider` walkthrough.
- `PredictOutput` for the network-panel-per-state sort, with rendered SVG snapshots as the "program output" surface.

**Project link.** Lesson 20.4.4 is exactly this wiring against the project starter; the four-state machine and the `opt_out_capturing_by_default` floor are the two artifacts the project's grader checks.

## Concept 5 — The /ingest proxy route

**Why it's hard.** Ad-blocker rules increasingly match `*.posthog.com` and any third-party analytics host by domain heuristic. A same-origin proxy route is the structural defense, but the wiring is non-obvious: the SDK posts to `/ingest`, the proxy relays to `eu.i.posthog.com`, the dashboard *links* to PostHog UI must still resolve to the real host (`ui_host`), and the catch-all path segment is `[...path]` not `[path]`. The two-host split (`api_host` vs. `ui_host`) is the part students miss.

**Ideal teaching artifact.** A two-row Concept archetype diagram. Top row: the no-proxy path — browser → ad-blocker filter (drawn as a wall blocking the request) → `i.posthog.com`. Bottom row: the proxy path — browser → same-origin `/ingest` (ad-blocker waves it through) → app server → `eu.i.posthog.com`. A small inset shows the PostHog dashboard's "view in PostHog" links resolving to `ui_host` on the same diagram, so the student sees why both hosts exist. The drawing makes the architecture irreducible.

**Engagement.** A `Tokens` exercise on the `posthog.init({...})` config block, asking the student to click the values that correspond to *outbound data path* (`api_host: '/ingest'`) versus *UI link path* (`ui_host: 'https://eu.i.posthog.com'`) — distinguishing the two is the recall the lesson needs.

**Components.**
- Primary: `Figure` with hand-SVG of the two-row proxy diagram (ad-blocker wall, request paths, dashboard inset).
- `Tokens` on the init config for the api_host / ui_host distinction.
- `Code` block for the `app/ingest/[...path]/route.ts` factory call.

**Project link.** The Chapter 20.4 project's "verify zero pre-consent network requests" gate runs against `/ingest`; the proxy route's existence is what makes the verify recipe coherent.

## Concept 6 — Object-Action event taxonomy and the typed dictionary

**Why it's hard.** Naming conventions read as bikeshedding until the six-month moment when nobody remembers what `clicked_thing` meant or whether `signed_up` and `signup_complete` were the same event. The discipline is two-layered: a naming convention (Object-Action, snake_case, past tense) and a structural enforcement (a typed dictionary file the build checks, so a typo cannot ship). One without the other rots.

**Ideal teaching artifact.** A Pattern archetype carried by a wrong-then-right shape. Open with a screenshot-style mock of a real PostHog event browser six months into the project: 200 events, half of them ambiguous (`clicked_button`, `button_clicked`, `Button Clicked`, `upgrade`, `upgrade_plan`, `plan_upgraded`). The student is asked which of these are the same event. The mock is unanswerable — the misconception ambush. Then introduce Object-Action snake_case past tense as the rule that would have prevented the rot, and the typed `track()` helper plus event dictionary as the structural enforcement. Close with a build-error screenshot: a typo `track('paywall_view', ...)` failing TypeScript because the dictionary doesn't include it.

**Engagement.** `Buckets` sorting twelve candidate event names into three buckets: *valid* (`invoice_created`, `plan_upgraded`, `paywall_viewed`), *ambiguous* (`clicked_button`, `upgrade`), and *wrong shape* (`Button Clicked`, `upgrading_plan`). The sort tests the convention; the build-error close locks the structural enforcement.

**Components.**
- Primary: `Figure` with a hand-SVG mock of the rotted event browser (200 ambiguous names). Single-use; the visceral hook earns the bespoke artifact.
- `Buckets` for the twelve-name three-bucket sort.
- `AnnotatedCode` for the typed `track()` + dictionary walkthrough.
- `Code` for the build-error closing screenshot (or inline terminal block).

**Project link.** The Chapter 20.4 starter has a small event dictionary already; the concept frames why the file exists rather than letting events accrete in feature code.

## Concept 7 — Where does this property live: person, event, or super

**Why it's hard.** Students conflate "stuff about the user" with "stuff on every event." Sending `plan` on every event call inflates the bundle and bloats the schema; setting `invoice_id` as a person property loses it the moment the user creates another invoice. The split is structural: properties describing *the user as of now* go on the person; properties describing *this specific event* go on the event; properties describing *the session* go on super-properties (auto-attached). The decision is reversible only with painful backfills.

**Ideal teaching artifact.** A Concept archetype carried by a single annotated diagram and a sort. The diagram: a PostHog data model figure with three nested rings — outer ring *Person* (long-lived; `plan`, `role`, `created_at`, `email`), middle ring *Super-properties on session* (`org_id`, `seats`, `experiment_variant`), inner ring *Event* (single-event: `invoice_id`, `amount_cents`, `feature`). Arrows show how a single `invoice_created` capture pulls from all three rings to produce the final stored event. The diagram is the model.

**Engagement.** `Buckets` sorting twelve real properties (`plan`, `invoice_id`, `email`, `org_seats`, `paywall_feature`, `created_at`, `last_seen_at`, `signup_source`, `experiment_variant_paywall`, `amount_cents`, `from_plan`, `to_plan`) into the three rings. The misconception this catches: students send `plan` on every event when it should live once on the person; students store `invoice_id` on the person when it should ride the event.

**Components.**
- Primary: `Figure` with hand-SVG of the three-ring data-model diagram with the `invoice_created` arrows.
- `Buckets` for the twelve-property three-ring sort.

**Project link.** No direct project artifact — but the project's `track()` calls implicitly rely on the split being internalized; the concept is what stops the student from over-stuffing event payloads in 20.4.

## Concept 8 — The identify/reset handshake and group analytics

**Why it's hard.** PostHog's distinct-ID model is invisible until it breaks. A user signs up anonymously, fires fifteen events, then signs in — without `identify()`, the prior events stay orphaned and the trial-to-paid funnel reads zero. A user signs out and a colleague signs in on the same browser — without `reset()`, both users' events collapse into one polluted funnel. For B2B, events belong to users but metrics live at the org — without `group()`, the per-org rollups don't exist. The three calls (`identify`, `reset`, `group`) are independently invisible and collectively load-bearing.

**Ideal teaching artifact.** A two-beat Mechanics + Pattern lesson. First beat: a scrubbable timeline showing a single browser session — frame 1 anonymous (events accumulating under distinct ID `anon-abc`); frame 2 sign-in fires `identify('user-42')` (prior events stitch to user-42 with a visible "stitched" badge); frame 3 events continue under user-42; frame 4 `group('organization', 'org-9')` is called (events now tagged with org); frame 5 sign-out fires `reset()` (next event starts under a fresh anonymous ID). Second beat: a "wrong-by-default" reveal — replay the same timeline with `reset()` removed; the colleague's events collide with the prior user's, and the funnel chart on the right of the diagram visibly corrupts. The wrong-by-default contrast is the lesson.

**Engagement.** A `Sequence` exercise: drag five operations (`signup completes`, `posthog.identify(userId)`, `posthog.group('organization', orgId)`, `user signs out`, `posthog.reset()`) into the correct order. Wrong orders surface the classic bugs (calling `identify` before `reset` raises; calling `group` before `identify` leaves the group untied).

**Components.**
- Primary: `DiagramSequence` scrubbing the five-frame timeline with the funnel-corruption fork. The frame contents (browser state, distinct ID badge, event list, funnel chart) are hand-SVG; `DiagramSequence` is the scrubber.
- `Sequence` for the five-step ordering drill.
- `Aside` (caution) on the `identify`-before-`reset` raise.

**Project link.** The Chapter 20.4 project includes a sign-out flow that must call `reset()`; the verify recipe checks the network panel for the right shape post-reset.

## Concept 9 — The flash-of-default-variant and server-side bootstrap

**Why it's hard.** Client-side flag fetch is the obvious wiring, and it ships a 200ms window where every user sees the default variant before the assigned one flashes in. For rollouts it's a UX bug; for experiments it's metric poison — the user *saw* control before variant, and the first event fires under the wrong assignment. The fix is server-side bootstrap: evaluate the flag in middleware or a server component with `posthog-node`, pass the value to the client as `bootstrap` data on `posthog.init`, and the first render returns the real variant. The distinct ID must be shared across SSR and client via a cookie, or the server and client evaluate to different variants and the user sees a hydration mismatch.

**Ideal teaching artifact.** A Concept archetype carried by a side-by-side timeline. Left timeline (client-side fetch): t=0ms HTML arrives → t=10ms first paint with `control` (default) → t=210ms `useFeatureFlagValue` network call returns `variant_a` → t=215ms re-render to `variant_a` with visible flash. A "metric event fired at t=50ms under `control`" callout marks the poisoning. Right timeline (server-side bootstrap): t=0ms server reads distinct-ID cookie → evaluates flag with `posthog-node` → renders HTML with `variant_a` baked in → t=10ms first paint with `variant_a`, no flash, no network call. Underneath the timelines, a one-row "distinct-ID cookie" lane shows the same ID present on both server and client — the shared identity that makes deterministic SSR evaluation possible.

**Engagement.** A `PredictOutput` round on three scenarios — (a) CSR fetch with experiment running, (b) SSR bootstrap with cookie shared, (c) SSR bootstrap with cookie mismatch — and for each the student picks which of three observable outcomes (no flash / 200ms flash / hydration mismatch warning) lands.

**Components.**
- Primary: `Figure` with hand-SVG of the side-by-side timeline + distinct-ID cookie lane. Forward-links to the broader SSR/CSR hydration discussion in any Next.js 16 deep-dive chapter.
- `PredictOutput` for the three-scenario flash sort.
- `AnnotatedCode` for the `bootstrapFlags` config and the server-component `getFeatureFlag` call.

**Project link.** Chapter 20.4 doesn't directly exercise flag bootstrap (the seeded findings live elsewhere), but the wiring from this chapter is what the project's `bootstrapFlags` line in the starter assumes.

## Concept 10 — Three patterns, one primitive, three lifecycles

**Why it's hard.** Kill switches, percentage rollouts, and A/B experiments all read as "feature flags," and students conflate them — they leave kill-switch flags in the code for two years, or run rollouts as if they were experiments without pre-declared metrics. The three patterns share a primitive but have different lifecycles: a kill switch lives weeks and dies after stabilization; a rollout lives weeks and dies at 100%; an experiment lives 2–4 weeks and converts to a rollout (or deletes the losing branch) after significance. Reading the lifecycle is what stops the codebase from rotting with stale `if (flag)` forks.

**Ideal teaching artifact.** A Decision archetype carried by a three-column comparison Figure: each column is a pattern (kill switch, rollout, experiment) with the same five rows — *trigger* (when do you reach for this?), *flag shape* (boolean or multivariate), *target rule* (100% internal then ramp / percentage / 50-50 split), *exit condition* (stabilized / reached 100% / significance), *lifespan*. The student reads across to see the symmetry; they read down to see the difference. A short epilogue paragraph names the stale-flag audit (quarterly grep + "last evaluated" filter + delete PR) as the lifecycle's last step.

**Engagement.** A `Matching` exercise pairing six real scenarios ("we're shipping a risky new billing webhook", "the new onboarding for 10% of new orgs first", "two paywall copies, which converts better?", "the legacy export endpoint we can't delete yet but want to disable for new orgs", "the new dashboard layout for everyone within a month", "compare two pricing pages over 3 weeks") to the three patterns. Two scenarios per pattern keeps the matching nontrivial.

**Components.**
- Primary: `Figure` wrapping a 3-column hand-SVG comparison table (or a styled HTML table inside `Figure`).
- `Matching` for the six-scenario pattern sort.
- `Aside` (note) on the stale-flag audit cadence.

**Project link.** Not directly exercised in 20.4; lives as the senior-reach detail the student carries into any rollout they ship after the course.

## Concept 11 — Mask versus block: the replay privacy model

**Why it's hard.** Replay is the easiest PostHog primitive to misconfigure into a GDPR violation, and the default-mask-inputs posture is *not* enough — a free-text notes field in a feature shipped six months later collects customer addresses, and the masking config drifts. The structural decision is the *mask vs. block* axis: mask preserves the DOM structure (the user typed *in* a field — show that they typed, not what), block omits the element entirely (a grey placeholder of the same size). Students default to mask because it's the option that ships; they need to understand when block is the right reach (third-party iframes carrying PII, admin tools, the customer-data export flow).

**Ideal teaching artifact.** A Concept archetype carried by a side-by-side recorded-frame mockup. Three columns of the *same* rendered form (a profile page with name, email, free-text notes, a Stripe iframe wrapper, an audit-log preview). Column 1: rendered live (what the user sees). Column 2: how it appears in replay with *default* masking (inputs masked, body text captured — the notes leak, the audit-log preview leaks). Column 3: how it appears with the *correct* masking config (`.sensitive` masked, `.never-record` blocked — notes show `***`, Stripe wrapper is a grey placeholder, audit-log preview is greyed out). The three columns are the model; reading across them makes the difference between mask and block visual.

**Engagement.** `Buckets` sorting ten DOM elements (`<input type="password">`, `<input type="email">`, `<div class="notes-textarea">`, `<iframe src="stripe.com">`, `<div class="audit-log-preview">`, `<h1>Welcome, Alex</h1>`, `<button>Upgrade</button>`, `<div class="customer-address">`, `<span class="org-name">`, `<div class="payment-form-wrapper">`) into three buckets: *default-capture is fine*, *needs `.sensitive` mask*, *needs `.never-record` block*. The sort tests the catalog from the outline.

**Components.**
- Primary: `Figure` with hand-SVG of the three-column rendered-vs-default-replay-vs-correct-replay mockup. Single-use but the visceral hook earns the bespoke artifact; defer to hand-SVG inside `Figure` rather than proposing a new component.
- `Buckets` for the ten-element three-bucket sort.
- `Code` for the `session_recording` config block with the four levers annotated.

**Project link.** Not directly in 20.4's seeded findings; the masking config from this chapter is what the project's PostHog wiring inherits.

## Concept 12 — The replay-to-bug-fix workflow

**Why it's hard.** Replay only earns its weight if the team uses it. The reach is non-obvious: a user emails support claiming "the upgrade button is broken"; the on-call doesn't know that the right move is to filter PostHog replays by distinct ID, scrub to the click, watch the DOM mutation timeline, and read the bug from the playback. Without the workflow, replay becomes shelf-ware. The workflow has five steps and each step pivots between PostHog surfaces (replay list, scrubber, network panel, console).

**Ideal teaching artifact.** A scrubbable Pattern archetype walking the full bug-fix sequence. The student scrubs through six frames: (1) the support ticket — "upgrade button does nothing"; (2) PostHog replay list filtered by the user's distinct ID; (3) the scrubber at the click moment, with the modal opening and immediately closing visible; (4) the DOM mutation timeline showing a stray click event firing on the backdrop; (5) the diagnosis — missing `e.stopPropagation()` on the modal content; (6) the one-line fix in the editor. Each frame has a short caption naming the PostHog surface the operator is on. The scrubber is the lesson because the workflow is temporal — the student must internalize the pivot pattern, not just the static moves.

**Engagement.** A `Sequence` exercise: drag the five operator moves ("look up user's distinct ID from user row", "open PostHog replay list filtered by distinct ID", "scrub to the timestamp near the support ticket", "watch DOM mutation timeline at the click moment", "read the bug from the mutation pattern") into the order the workflow runs. Catches the misconception that replay is a "play the whole session" tool rather than a "jump to the moment, read the mutation" tool.

**Components.**
- Primary: `DiagramSequence` scrubbing the six-frame bug-fix walkthrough; per-frame content is hand-SVG mocking the PostHog UI surface (replay list, scrubber with DOM panel, editor diff).
- `Sequence` for the five-move ordering drill.

**Project link.** The Chapter 20.4 project doesn't ship a replay bug, but the workflow is the senior-reach pattern the student takes into incident response after the course.

## Component proposals

None.

Every concept's artifact maps cleanly to existing components plus hand-SVG inside `Figure`. The visceral artifacts (the rotted-event-browser mock in C6, the three-column replay-frame mock in C11, the side-by-side stack diagram in C3, the flash-of-default timeline in C9, the four-state consent machine in C4, the three-ring property model in C7) are single-use compositions where a bespoke component would over-engineer; hand-SVG inside `Figure` is the right reach.

The two scrubbable Pattern artifacts (Concept 8's identify/reset timeline, Concept 12's bug-fix workflow) are served by the existing `DiagramSequence` scrubber with per-frame hand-SVG content.

## Build priority

No new components to prioritize. The investment for this chapter is *content authoring* — six bespoke hand-SVG figures inside `Figure`, two `DiagramSequence` scrubbables with per-frame hand-SVG content, and standard exercise components (`Buckets` ×4, `Matching` ×2, `MultipleChoice` ×1, `PredictOutput` ×2, `Sequence` ×2, `TrueFalse` ×1, `Tokens` ×1). The hand-SVG figures most worth the authoring effort, ranked by teaching load: (1) the four-state consent machine (Concept 4), which grounds the chapter's compliance posture; (2) the rotted-event-browser misconception ambush (Concept 6), whose visceral hook is what makes the typed-dictionary discipline stick; (3) the side-by-side flash-of-default timeline (Concept 9), the load-bearing argument for server-side bootstrap.

## Open pedagogical questions

- The "scrubbable PostHog UI mockup" frames in Concepts 8 and 12 require authoring plausible PostHog-screenshot-style hand-SVGs. If PostHog's UI shifts before lesson ship, the figures drift. Consider whether annotated real screenshots (with a "circa May 2026" stamp) are a more honest reach than stylized mocks.
- Concept 11's three-column "rendered vs. default replay vs. correct replay" mockup assumes the student can read three side-by-side frames of the same UI without losing the comparison axis. If user testing shows the three columns confuse rather than compare, fall back to a `TabbedContent` with the three frames as tabs.

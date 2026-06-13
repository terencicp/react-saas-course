# Lesson outline — Chapter 093, Lesson 2

## Lesson title

- **Title:** When PostHog earns its weight
- **Sidebar label:** When PostHog earns its weight

## Lesson framing

Decision archetype. This lesson teaches a judgment call, not a wiring. The student already shipped the cookieless floor in lesson 1 (`@vercel/analytics` + `@vercel/speed-insights`, no consent gate, traffic + Core Web Vitals). This lesson answers the next senior question: *when is that floor not enough, and what do you reach for?* The two load-bearing artifacts are (1) **the threshold** — the four product needs that cross past Vercel Analytics — and (2) **the platform decision** — one platform (PostHog) over four vendors, the minimum-stack thesis applied. There is **no PostHog wiring here** (that is lesson 3); code in this lesson is at most a 2–3 line *shape preview* of what the install will pull in, framed as "here's what's coming," not "type this."

Pedagogical spine, optimized for low cognitive load:

- **Lead with the cost, not the tool.** Every concept anchors to a concrete senior question the team is actually being asked: "did the new pricing page lift trial-to-paid?", "is the new onboarding live for 10% of orgs?", "why did three users say the dashboard broke with no error?". The student should leave able to *name the four needs* and apply the rule "if zero are real, don't add PostHog yet."
- **Where beginners go wrong.** Two failure modes drive the lesson: (a) adding PostHog at day zero on a pre-PMF marketing site — dead-weight event calls, a taxonomy that rots before anyone reads it; (b) reflexively stacking a vendor per need (Mixpanel + LaunchDarkly + FullStory + Statsig) — four contracts, four SDKs in the bundle, four identity models to keep aligned. The lesson makes both visceral before offering the resolution.
- **The mental model to install:** *Vercel = traffic floor (always on, free, cookieless). PostHog = the product-analytics ceiling you add when a specific product question becomes unanswerable from traffic data — and it folds four primitives (events, flags, replay, experiments) behind one SDK and one identity.* The "one platform, four primitives" picture is the keystone visual.
- **Alternatives belong in the lesson, named once.** This is a "trigger before tool" decision; per the pedagogical guidelines a conditional power-tool must name the threshold the default crosses, and a senior decision is only credible if the rejected options are named with their trigger conditions. Name Mixpanel/Amplitude, Statsig, LaunchDarkly, and the Plausible-tier traffic tools — each with the one condition under which you'd reach for it instead. This is what makes the PostHog choice read as reasoned, not as a sponsorship.
- **Two constraints the student must carry forward without us teaching them here:** PostHog handles personal data, so it routes through the lesson-5-of-ch081 consent gate (lesson 3 wires it; here it is a named constraint and a budget input); and PostHog Cloud EU is the GDPR-default region. Keep both crisp and forward-pointing.
- **Interaction over prose for the decision itself.** The threshold is a *walk*, not a paragraph — a `StateMachineWalker` in decision mode is the centerpiece, forcing the student through the four needs in the order a senior asks them. A `Buckets` drill checks that the student can sort real questions into "Vercel answers this" vs. "this needs PostHog." This is a judgment skill; it must be practiced, not just read.

Estimated student time: 30–40 minutes (matches outline). The threshold + four-needs frame is the content; everything else supports it.

---

## Lesson sections

### Introduction (no header — lesson lead-in)

Open on the concrete scene from the outline's senior question. The marketing site has Vercel Web Analytics; traffic is flowing. Then three asks land in the same week:

- Product: "Did the new onboarding flow improve trial-to-paid conversion?"
- Engineering: "Roll the new billing UI out to 10% of orgs first."
- Support: "Three users say the dashboard 'just broke' — no console error, logs all 200."

State plainly: **none of these are answerable from Vercel Web Analytics.** That floor counts visits and Core Web Vitals; it doesn't know *who* a user is, *what* they did across sessions, *which* feature variant they saw, or *what their screen looked like* when it broke. This lesson installs the decision — which platform, and why one platform — without wiring anything yet (forward-point lesson 3 for the wire).

Keep it warm and short. End the intro with the one-line promise: by the end, the student can name the exact threshold past the cookieless floor and defend "PostHog or not yet?" on a real product.

Reasoning: the guidelines want the senior question to open the lesson implicitly and motivate with a concrete problem. Three asks from three roles make the "one platform" payoff land later — each ask maps to a different PostHog primitive.

### The four needs that cross the threshold

The heart of the lesson. Recall from lesson 1 that the floor's threshold was framed as five signals (*who / what they did / across sessions / gated by a flag / in replay*). Re-frame those as **four product needs**, each a real SaaS line item, each mapping to one of the three asks above plus experiments:

1. **Event-level analytics** — funnels, cohorts, retention, properties on every event (`plan: 'pro'`, `org_seats: 12`). Answers *what users do across sessions.* (The "across sessions" + "what they did" signals collapse here — note this consolidation explicitly so a lesson-1 reader isn't confused by 5→4.)
2. **Feature flags** — gradual rollouts, kill switches, per-cohort releases, the substrate A/B tests ride on. Answers *who sees what feature, when.*
3. **Session replay** — privacy-masked playback of the user's actual interactions. Answers *what they did before the bail* — the UX bug that throws no error.
4. **Experiments** — statistical A/B tests with a primary metric and an automated significance call. Answers *did this change move the metric.*

Teach each as: the question it answers → the concrete ask it resolves → one sentence on what it is. Do NOT teach any of them at depth — each has its own later lesson (4: events, 5: flags + experiments, 6: replay). Keep the descriptions to "what it answers," resist drifting into "how it works."

Land the decision rule explicitly as a callout the student takes away: **name the four needs against your product; if zero are real, don't add PostHog yet. The threshold isn't arbitrary — it's these four.**

**Diagram — the four-needs map.** A small `<Figure>` with a simple HTML grid (four cards, one per need), each card: need name, the question it answers, the example ask. Pedagogical goal: make "four needs" a memorable visual unit, not a bulleted list buried in prose. Keep it horizontal/compact per the vertical-space constraint. This is a labels-only layout — plain HTML + CSS inside `<Figure>`, no diagram engine needed.

**Exercise — `Buckets` (two-column).** Centerpiece check for this section. Bucket A: "Vercel Web Analytics answers this." Bucket B: "This needs PostHog." Items (mix obvious and subtle):
- "How many visitors did the pricing page get last week?" → Vercel
- "What's the LCP on the dashboard route for real users?" → Vercel
- "Which countries does our traffic come from?" → Vercel
- "Did users who saw the new paywall copy upgrade more?" → PostHog (experiment)
- "Roll the new editor out to 10% of pro orgs." → PostHog (flag)
- "Why did this specific user rage-click and leave?" → PostHog (replay)
- "What's the trial-to-paid conversion funnel?" → PostHog (events)
- "Which referrer sends the most signups?" → Vercel (borderline — traffic referrers are Vercel's; *attributing them to identified conversions* is PostHog; grade as Vercel and address the nuance in the explanation)

`instructions` prop: "Sort each question by which tool answers it." Goal: the student internalizes the boundary as a reflex, including the one genuinely borderline case. Reasoning: the threshold is a judgment skill — a sorting drill exercises exactly the discrimination the lesson is selling.

Add `<Term>` tooltips here for terms a cross-field junior may not hold: **funnel** ("a sequence of steps you measure drop-off between, e.g. signup → activate → pay"), **cohort** ("a group of users defined by shared properties or behavior, e.g. 'orgs on the pro plan'"), **retention** ("the share of users who come back over time"). One tooltip each, at first mention.

### One platform or four vendors

This is the minimum-stack thesis applied — the second load-bearing artifact. Set up the naive path first so the resolution lands.

**The four-vendor shape (the trap).** Walk the reflex: an events tool (Mixpanel/Amplitude, $), a flags tool (LaunchDarkly/Statsig, $$), a replay tool (FullStory/Hotjar, $$), an experiments tool (Statsig/Optimizely, $$). Spell the real cost: four contracts to negotiate and renew, four SDKs in the client bundle, **four identity models to keep aligned** (the same user is a different ID in each, so cross-tool questions need a join nobody maintains), four dashboards to context-switch between. This is the cost the student should feel.

**The PostHog play.** PostHog folds the four into **one platform, one SDK, one identity, one dashboard.** The four primitives share a distinct ID, so "users who saw variant B (flag) completed the funnel (events) — watch one (replay)" is one query, not a four-tool join.

**Diagram — one SDK vs. four SDKs.** A `TabbedContent` with two tabs, OR an `<ArrowDiagram>` inside a single `<Figure>` — pick `TabbedContent` for lower authoring risk and the clean side-by-side:
- Tab "Four vendors": four separate boxes (Mixpanel / LaunchDarkly / FullStory / Statsig), each with its own SDK chip and its own "identity: ???" chip, no shared line — visually disconnected. Caption: four contracts, four bundles, four identities to reconcile.
- Tab "One platform": one PostHog box fanning out to four primitive labels (events / flags / replay / experiments), one SDK chip, one "distinct ID" chip feeding all four. Caption: one contract, one bundle, one identity across all four primitives.

Pedagogical goal: the contrast *is* the argument. The student sees the bundle/identity cost of the four-vendor path and the consolidation of PostHog at a glance. Keep both tabs as simple labeled-box HTML (or a Mermaid `flowchart LR` per tab if cleaner) — these are labels, not custom HTML, so a flowchart engine is acceptable; if using `ArrowDiagram` note it can't be `expandable`.

**Why PostHog over the alternatives — named once, each with its trigger.** A short subsection or a tight list. The senior move: name the credible competitor and the *one condition* under which you'd actually pick it over PostHog. This is the "trigger before tool" discipline.
- **Mixpanel / Amplitude** — deepest event-analytics tooling; no flags, no replay. Reach for it when event analytics is the *only* need and that depth outweighs folding everything into one platform.
- **Statsig** — strong experiments + flags, weaker event UX, growing replay. Reach for it when experiments are the *load-bearing daily* primitive for the team.
- **LaunchDarkly** — flag specialist; no events, no replay. Reach for it when flag scale (thousands of flags, complex targeting trees, enterprise governance) outgrows PostHog's flag UX.
- **Plausible / Fathom / June.so** — privacy-first *traffic* analytics, the same tier as Vercel Web Analytics — not product analytics. Don't confuse them with the four needs.

Frame the conclusion: the course default is PostHog because the *typical* SaaS has two-to-four of these needs at once and folding wins; the alternatives stay in the conversation only when their one trigger condition fits. Reasoning: a decision lesson that hides the alternatives teaches dogma; naming them with triggers teaches the actual senior reasoning the course is selling.

Optional `<Term>`: **distinct ID** ("PostHog's identifier for one user/browser; the key every event, flag eval, and replay is attached to") — but only if it reads as load-bearing here; otherwise defer the deep treatment to lesson 4 and keep a one-line gloss inline.

### The cost shape, and why you don't ship all four at once

Make the economics concrete so "earns its weight" has a number behind it, and pre-empt the over-adoption failure mode.

- **The free tier covers pre-PMF.** PostHog bills per ingested event, per replay session, and per flag request, in volume tiers, with a generous monthly free allowance on each — verified mid-2026: ~1M product-analytics events, ~5k session replays, ~1M feature-flag requests per month, resetting monthly, no credit card. Frame it as "effectively free for a pre-PMF SaaS, scales per-primitive after." State the numbers with an "at time of writing — check current pricing" hedge (per-primitive tiers move) and point at the pricing page in External resources rather than committing the lesson prose to exact cents.
- **Budget by primitive, adopt incrementally.** The chapter default: pick the **two primitives that earn weight now** (typically events + flags), add **replay for the specific bug-class it's meant for**, and reserve **experiments for the metric-led moment.** Shipping all four at install is the anti-pattern — you pay for and maintain primitives nobody is reading yet.
- **Quota-bust shapes to fear (preview, not depth).** Name them so the student recognizes the trap when lesson 3–6 wire the real thing: a `capture()` call inside a React render (re-renders multiply the event), a missing identity stitch producing two events per real action, recording every anonymous session at B2C scale. Keep these as one-liners with a forward-pointer ("the wiring lessons show the guardrails"); do not teach the fixes here.

Pedagogical goal: tie "earns its weight" to a budget the student can reason about, and kill the "add everything on day one" reflex before it forms. Reasoning: the outline makes incremental adoption a named discipline; pairing it with the cost model is what makes it stick.

### PostHog Cloud EU, and the consent constraint you'll wire next

Two setup-shaping decisions the student must take *now* even though the wiring is lesson 3. Keep both crisp and forward-pointing — this is not a wiring section.

**PostHog Cloud EU as the GDPR default region.** EU Cloud runs in Frankfurt and disables IP capture by default for new projects, which covers the data-residency posture without a DPA dance. PostHog Cloud US is the alternative for non-EU teams. Self-hosted PostHog exists (open-source) but pulls in Postgres + ClickHouse + Redis + Kafka to operate — the on-call cost outweighs the savings for any team under tens of millions of events/month. **Course default: PostHog Cloud EU.** Watch-out to state explicitly: picking US Cloud when EU users dominate is *harder to undo than to set up right* — the region is a load-bearing first decision.

`<Term>` candidates here: **data residency** ("the legal/contractual requirement that personal data is stored in a specific region, e.g. the EU"), **DPA** ("Data Processing Agreement — the contract a GDPR data controller signs with a processor; EU-region hosting reduces the friction"), **ClickHouse** ("the column-store database PostHog uses for analytics queries — fast for events, heavy to self-operate"). These are non-obvious acronyms/terms for the target student; tooltip them at first mention.

**The consent gate is non-negotiable (named, not wired).** PostHog handles personal data — distinct IDs, IPs, event properties carrying user state — so under GDPR/ePrivacy it is **non-essential**: nothing fires before the user accepts. Connect back explicitly to lesson 5 of chapter 081: the app already has a single consent source of truth, `useConsent()`, exposing `{ analytics, marketing, ... }`. Every PostHog reach in this chapter routes through `useConsent().analytics`; the SDK is dynamically imported only when it flips on; `opt_out_capturing_by_default: true` is the safety floor if the gate is ever bypassed. State that this is a *budget input too*: consented users are the population PostHog ever sees.

Contrast it sharply with lesson 1's rule so the student doesn't over-correct: **Vercel Analytics is cookieless and does NOT pass through the consent gate; PostHog does. They do not share the rule.** This is the single most likely confusion between the two lessons — call it out directly.

Hard scope line for downstream agents: this section *names* the constraint and points at lesson 3 for the wire. No `posthog.init`, no provider, no proxy route here.

Reasoning: the region and consent decisions shape the lesson-3 install, so the student must hold them now; but teaching them as setup decisions (not wiring) keeps this lesson a decision lesson and avoids stealing lesson 3's content.

### A quick look at what the install will pull in

A short, low-stakes *preview* so the next lesson isn't a cold open — explicitly framed as "here's what's coming, not something to type yet."

- `posthog-js` — the browser SDK (events, the flag client, replay capture).
- `posthog-node` — the server SDK (server-side capture, server-side flag evaluation).
- `@posthog/next` — the official App Router wrapper that ties both together with Next.js conventions (a server-component `PostHogProvider` with SSR-evaluated flag bootstrap, distinct-ID cookie seeding via middleware, a built-in same-origin proxy, automatic event flushing). **Verified mid-2026: the package exists and is official, but it is still pre-release** — PostHog itself recommends its standard Next.js setup guide for production. Reflect this honestly: name `@posthog/next` as where the integration is heading and what lesson 3 leans on, but flag the pre-release status in one line so the student isn't surprised if lesson 3 falls back to the manual `posthog-js` + `posthog-node` setup. Do not present it as a settled, stable default.

Present this as a 3-row list or a tiny `Code` block of just the install line (`pnpm add posthog-js posthog-node` plus the wrapper) with one sentence each on what each package is for. This is the *only* code in the lesson and it is a manifest, not a walkthrough — do not use `AnnotatedCode`/`CodeVariants` (overkill for three package names). End with the explicit pointer: lesson 3 wires the install end-to-end through the consent gate.

Reasoning: the outline lists the SDK-shape preview as in-scope; a manifest-level preview reduces the cognitive jump into lesson 3 without doing lesson 3's job.

### The decision, in one walk

Closing synthesis and the lesson's interactive capstone. A `StateMachineWalker` in `kind="decision"` mode (its default) that walks the student through the threshold in the order a senior asks — the component is purpose-built for "trigger before tool" decision filters, and it forces a committed one-path-at-a-time walk rather than showing the whole tree.

Proposed tree (root question first, four-need gate, terminal leaves):

- **Root** `pre-pmf` — prompt: "Is the product past the marketing-page stage — do you have signed-in users doing things?"
  - Branch "No, it's a pre-PMF marketing site" → leaf `vercel-only`
  - Branch "Yes, there are identified users in a real product" → `needs`
- **Question** `needs` — prompt: "Do any of these four needs apply right now?", description lists the four. Branches:
  - "I need to measure what users do across sessions (funnels, cohorts)" → leaf `posthog-events`
  - "I need to roll features out gradually or kill-switch them" → leaf `posthog-flags`
  - "I need to see what a user did before a no-error bug" → leaf `posthog-replay`
  - "I need to A/B test a change against a metric" → leaf `posthog-experiments`
  - "None of these are real yet" → leaf `not-yet`
- **Leaf** `vercel-only` verdict "Vercel Web Analytics only" — the floor is the whole stack until a product question becomes unanswerable; don't pay for a taxonomy nobody reads.
- **Leaf** `not-yet` verdict "Don't add PostHog yet" — zero of the four needs is the answer; revisit when the first one becomes real.
- **Leaves** `posthog-events` / `posthog-flags` / `posthog-replay` / `posthog-experiments` — each verdict "Add PostHog (Cloud EU)" with a body that (a) confirms the need is the trigger, (b) reminds: one platform covers this *and* the other three when they arrive, so you're not re-deciding per need, (c) points the relevant deep lesson (events→lesson 4, flags/experiments→lesson 5, replay→lesson 6) and notes the consent gate + EU region apply.

This component provides its own card — **do not wrap in `<Figure>`.** Set `title="Do you reach past the cookieless floor?"`.

Pedagogical goal: collapse the whole lesson into a reusable mental procedure the student can run on any future product. The four "add PostHog" leaves all converging on the same platform is the visual restatement of the one-platform thesis — reaching past the floor for *any one* need lands you on the platform that covers all four. Reasoning: a decision lesson should end in a decision *tool*, not a summary paragraph; the walker is exactly that and matches the "the lesson lives in the order, not any single leaf" intent.

### External resources (optional, end of lesson)

One or two `ExternalResource` cards: PostHog's "PostHog vs alternatives" / product-analytics overview, and the PostHog pricing page (so the student verifies the current free-tier numbers themselves — explicitly because they move). Optional `VideoCallout` only if a short, current (last ~6 months) PostHog-overview or "product analytics 101" video is found that adds signal beyond the prose; do not embed a stale or sales-heavy one. If nothing current and high-signal exists, omit — the lesson does not need a video to stand.

---

## Scope

**This lesson covers:** the threshold past the Vercel cookieless floor (the four product needs); the one-platform-vs-four-vendors decision and the named alternatives with their trigger conditions; the cost shape and incremental-adoption discipline; PostHog Cloud EU as the GDPR-default region; the consent gate and EU region as *named constraints* that shape the next lesson; a manifest-level preview of the three packages the install pulls in.

**This lesson does NOT cover (hard boundaries):**

- **Any PostHog wiring** — `posthog.init`, the `PostHogProvider`, the consent-gated dynamic import, the `/ingest` proxy route, `bootstrapFlags`, env variables. All of this is **lesson 3 of chapter 093.** The only code here is the install/manifest line.
- **The consent gate's internals** — the four-state machine, the banner, `opt_out_capturing_by_default` mechanics, `useConsent()`'s implementation. Owned by **lesson 5 of chapter 081**; this lesson references the *contract* (`useConsent().analytics`) only. (See terminology note below — defer to ch081's canonical state names, do not invent.)
- **Event taxonomy, the typed `track()` helper, the identify/reset handshake, person vs. event properties, group analytics** — **lesson 4 of chapter 093.** Mention events only as "the first need," never how to name or fire them.
- **Feature flags, server-side bootstrap, rollouts, experiments at depth** — **lesson 5 of chapter 093.** Named here as needs 2 and 4 only.
- **Session replay, masking catalog, the bug-fix workflow** — **lesson 6 of chapter 093.** Named here as need 3 only.
- **Vercel Web Analytics / Speed Insights install and what they cover** — **lesson 1 of chapter 093** (already shipped). Recall the *boundary* (traffic + Core Web Vitals, cookieless, no consent gate) in one or two sentences as the prerequisite; do not re-teach the install or re-explain Core Web Vitals.
- **Core Web Vitals definitions/thresholds** — chapter 094. Not in scope.
- **Sentry / error monitoring** — chapter 092. Touch only to draw the one-line complement ("Sentry = thrown errors; PostHog = behavior and the bug-class that throws no error"); PostHog does not replace Sentry. Do not teach Sentry.

**Prerequisite concepts to redefine concisely (one line each, do not expand):** the cookieless floor from lesson 1 (Vercel Analytics + Speed Insights, always-on, no consent gate); the consent gate from ch081 lesson 5 (`useConsent()`, non-essential = consent-required, nothing fires pre-consent); GDPR/data-residency at the "EU users → EU region" level only.

---

## Notes for downstream agents

- **Consent state-name discrepancy — resolve toward ch081.** This chapter's framing/outline references a consent machine with states "unknown/accepted/rejected/pending" and a `useConsent()` returning a `status`. The *canonical* ch081-lesson-5 contract (from that chapter's outline) is `useConsent()` returning `{ analytics, marketing, open(), accept(level), reject() }` with states `unset / analytics-only / marketing-only / all`. This lesson does not wire anything, so reference the gate at the level of "`useConsent().analytics` is the boolean PostHog reads" and avoid committing to specific state-machine labels. If you must name the shape, follow ch081's `{ analytics, marketing }` contract, not the ch093-framing labels. Do not invent a third variant.
- **No production code beyond the install line.** This is a decision lesson by design (the orchestrator's archetype). Any temptation to show `posthog.init` config belongs in lesson 3 — leave it there. This deliberate divergence from "show the code" is correct for this lesson type.
- **Numbers move — keep the hedges.** Free-tier quotas (~1M events / ~5k replays / ~1M flag requests/mo) and the `@posthog/next` surface were both verified mid-2026 and the draft reflects the verified values. They remain the two things most likely to drift before the chapter ships: keep the "check current pricing" hedge on the numbers, and keep the "pre-release, may fall back to manual setup" caveat on `@posthog/next` so lesson 3 has room to use whichever path is stable at build time.

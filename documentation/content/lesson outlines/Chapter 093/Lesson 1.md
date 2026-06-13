# The cookieless floor: Vercel Analytics and Speed Insights

- Title: `The cookieless floor: Vercel Analytics and Speed Insights`
- Sidebar label: `The cookieless floor`

## Lesson framing

First lesson of the product-analytics chapter, and the shortest (25-35 min, setup-and-decision shape). The student has just shipped a SaaS to production (Unit 5 Vercel deployment) and built the consent gate in ch081 lesson 5. This lesson installs the analytics *floor* — Vercel Web Analytics + Speed Insights — that ships before any event taxonomy or PostHog decision.

Pedagogical conclusions for the lesson as a whole:

- **Lead with the senior question, not the install.** The motivating frame: a product just hit prod; before designing any event schema, three questions need answers — how much traffic and from where, which pages convert vs. leak, is the experience fast enough that Core Web Vitals don't punish SEO/conversion. Two installs answer all three with zero event code. Open the lesson on this so the install reads as the answer to a known cost, per the "decisions before syntax" filter.
- **This is the default, not a conditional power tool.** Per the pedagogical "defaults before conditionals" filter, the lesson must frame Vercel Analytics as the thing that ships *by reflex* on every Vercel project, and explicitly name the threshold that flips past it (event-level product questions or flag-gated rollouts → PostHog, next lesson). This is the inverse of most tool lessons: here the student must be told it's OK — correct, even — to stop here for a pre-PMF product.
- **The single highest-value correction: do NOT gate Vercel Analytics behind the consent banner.** The student has just spent a whole ch081 lesson learning that "nothing fires pre-consent." The natural wrong reflex is to wrap `<Analytics />` in the consent gate too. This kills traffic data for zero compliance benefit. The cookieless guarantee is *why* it sits outside the gate. This contrast (Vercel = no gate, PostHog = gate, next lesson) is the load-bearing mental model and must be made explicit and visual.
- **Mental model to leave the student with:** a two-tier analytics stack. Tier 0 (cookieless floor: traffic + Core Web Vitals, no consent, always on) vs. Tier 1 (PostHog: events/flags/replay/experiments, consent-gated, earns its weight at a threshold). This lesson ships Tier 0 and names the boundary to Tier 1.
- **Cognitive load:** keep it light. This is a short lesson; resist pulling in Core Web Vitals depth (ch094 owns it — names only as preview vocabulary) or PostHog mechanics (lessons 2-6). The install itself is two packages and two JSX lines; the *weight* of the lesson is the two decisions (why-default, why-no-gate) and the threshold, not the syntax.
- **Code's role:** minimal and illustrative. The whole install is ~6 lines in `app/layout.tsx`. One `AnnotatedCode` walkthrough of the layout carries it. No live-coding exercise — there is nothing to compute and the runtime can't reach Vercel's edge ingest. Verification is a dashboard-watch, shown via a `Screenshot`.
- **Real production stakes throughout:** tie each capability to a concrete senior question ("which marketing page leaks trial sign-ups?", "did the last deploy regress LCP?"). The watch-outs are real money/data-loss failures (script ships but data sinkholes; static-export host can't ingest; gated-by-reflex traffic data lost).

## Lesson sections

### Introduction (no header)

Per pedagogical structure, an unlabeled intro. Set the scene: the product is live on Vercel. Before any analytics architecture decision, three questions are already due — traffic volume and sources, which pages convert vs. leak, and whether the page is fast enough that Google's Search ranking and conversion don't suffer. State the payoff: two installs (`@vercel/analytics`, `@vercel/speed-insights`), two JSX lines, zero events, and all three are answered today. Name what the student already has (a deployed app on Vercel, the consent gate from the security chapter) and preview the end state: the floor wired and verified in the Vercel dashboard, plus a clear line for when to reach past it. Warm and brief.

### Two questions, one floor (the senior frame)

Reasoning: establish the decision before the tool. Present the three questions as the recurring senior need and collapse them into the "floor" concept — the analytics layer that's correct to ship before you've decided anything else.

Content:
- The three questions restated as production stakes, each one sentence: traffic (how many, from where), behavior-lite (top pages, top referrers, where users land vs. leave), performance (real-user Core Web Vitals).
- Introduce the two-tier model as the spine of the whole chapter. Tier 0 = cookieless floor (this lesson). Tier 1 = PostHog, the conditional reach (lesson 2 onward). The floor ships unconditionally; Tier 1 has a trigger.
- State the threshold that flips to Tier 1 up front so the student has the boundary from the start: the moment you need *who* (identified user), *what they did* (event with properties), *across sessions* (funnel), *gated by a flag*, or *in replay*. Until one of those is real, the floor is the whole stack. (Full treatment: lesson 2 — name it as forward reference, don't teach it.)

Diagram (HTML+CSS, inside `<Figure>`): a simple two-tier stack illustration. A wide, short horizontal layout (respect the vertical-space constraint). Bottom tier "Tier 0 — Cookieless floor" labeled with Vercel Web Analytics + Speed Insights, tagged "always on · no consent · free"; top tier "Tier 1 — PostHog" tagged "earns its weight · consent-gated", visually dimmed/dashed to signal "not yet, next lesson." Pedagogical goal: anchor the mental model that Vercel is the foundation and PostHog is an additive, gated layer — and pre-load the no-consent vs. consent contrast visually. This is a plain illustrative diagram (a "simple visual aid"), not a system graph. Keep under ~300px tall.

### Why cookieless is the default, not the conditional path

Reasoning: this is the load-bearing *decision* of the lesson. The student must understand why this tool, unlike most in the course, ships by reflex.

Content:
- Cookieless and no fingerprinting → on the marketing site it isn't blocked by the consent banner, so you keep the pre-consent traffic data (which is most of it on a marketing page). This is the single biggest reason it's the default.
- Free on every Vercel plan including Hobby — no separate contract, no per-event invoice. Precision (fact-checked): the free tier has a monthly captured-events cap; on Hobby, collection pauses when you hit it (you can't buy more events without upgrading to Pro). For a pre-PMF product this cap is generous and effectively free; state it as "free with a monthly cap" rather than "unlimited free" so the student isn't surprised at scale. Still no event *taxonomy* to budget — the cost is volume, not engineering.
- Two `<script>` injections via two official packages — no event taxonomy to design or maintain, nothing to rot six months later.
- Zero-maintenance: the data model is fixed (page views, referrers, geo, device), so there's no schema to keep aligned across the codebase.
- Contrast explicitly with the next-lesson reach: PostHog is powerful but it's *weight* — an SDK in the bundle, an event schema to govern, a consent gate to route through, a quota to watch. The floor has none of that cost. Frame as: "you ship the floor because it's free in every sense; you add PostHog when a real need pays for the weight."

Use an `Aside` (tip) to state the senior takeaway crisply: for a pre-PMF product or a pure marketing site, this *is* the entire analytics stack — adding more is premature.

### What Vercel Web Analytics gives you

Reasoning: concrete capability inventory so the student knows exactly what they get (and don't) before reaching for more.

Content:
- The metrics: page views, unique visitors, top pages, top referrers, country, OS, browser, device class. One tight list.
- Aggregated and anonymized at ingest — no personal data leaves the device; this is the mechanism behind the cookieless guarantee.
- Resilient intake: the current `@vercel/analytics` discovers ingest endpoints to survive ad-blocker patterns — name it briefly so the student knows why it's robust, don't go deep.
- Custom events exist but are explicitly out of scope: the schema is shallow (no funnels, no cohorts, no cross-session identity), and (fact-checked) they're a **Pro/Enterprise-only** feature — not on the free Hobby tier. The moment you want event-level questions, that's the threshold to PostHog (lesson 2), not a paid Vercel-events upsell. Name this so the student doesn't try to bend Web Analytics custom events into a product-analytics layer — a named watch-out.

Show the dashboard via a `Screenshot` (desktop viewport, wrapped in `<Figure>` with a caption) of the Vercel Web Analytics overview so the student recognizes what "verified" looks like. Note for the screenshot agent: capture the overview panel (visitors/page-views/top-pages); a representative Vercel dashboard capture, redact any project-identifying data.

### What Speed Insights gives you

Reasoning: the second capability, and the wire that ch094 will consume. Keep it shallow — definitions and thresholds are ch094's job; here it's "what data this surfaces."

Content:
- Real-user Core Web Vitals sampled from production traffic: LCP, INP, CLS, TTFB, FCP. Name them as **preview vocabulary only** — explicitly forward-reference ch094 lesson 1 for definitions and thresholds. Do not define each metric here (scope discipline).
- The key idea: this is *field data* (real users, real devices, real networks), not lab data — which is what Google scores for Search at the 75th percentile. One sentence on why field data matters (it's what actually ranks you), then defer depth to ch094.
- This lesson ships the *wire*; the performance chapter (ch094) uses this dashboard as its input. Frame the relationship so the student sees continuity.
- Tooltip candidates here: `Core Web Vitals`, `LCP`, `INP`, `CLS` via `<Term>` — short one-line definitions so the preview vocabulary doesn't interrupt flow or feel like a gap. Keep each definition to a clause; the real treatment is ch094.

### Installing the floor

Reasoning: the actual hands-on. Two packages, two component injections, one dashboard toggle. This is the practical-skill payoff.

Content, as a `<Steps>` procedure:
1. Install both packages (`@vercel/analytics`, `@vercel/speed-insights`) with pnpm — show the install command in a `Code` block. Per project convention the course uses pnpm; keep the command minimal.
2. Inject both components in `app/layout.tsx`. This is the core code moment.
3. Enable Web Analytics and Speed Insights in the Vercel project dashboard, per environment. Emphasize this is a separate, easy-to-forget step — the package ships the script but the data sinkholes until the dashboard toggle is on (the #1 watch-out, placed right at the step it prevents).
4. Verify in production: load a page, watch the dashboard within ~30s-1min. Set the expectation that there's first-load latency so the student doesn't assume it's broken.

The `app/layout.tsx` code via `AnnotatedCode` (lang `tsx`, this is the one place focus needs directing across multiple parts). Steps:
- The import lines from the two subpath entry points (`@vercel/analytics/next` and `@vercel/speed-insights/next` — verify exact subpaths during fact-check; the Next.js-specific entry points are the App Router fit). Highlight the imports.
- The `RootLayout` default export signature — note for downstream agents: `layout.tsx` is a framework-named **default export** per code conventions; this is deliberate, not a style violation. It stays a server component.
- The `<Analytics />` and `<SpeedInsights />` placement inside `<body>`, after `{children}`. Highlight both, color green. Explain they're dropped once at the root so every route is covered.

Note for the writer: keep the layout minimal — show just enough surrounding layout (`html`/`body`/`children`) for the placement to make sense; don't import unrelated providers. This is a deliberately simplified layout shape for focus.

`Aside` (note): mention the Vercel Agent / dashboard can perform this install end-to-end in 2026, but the lesson walks the manual install so the student understands what gets wired and why. One sentence; don't dwell (per AGENTS.md, don't foreground AI tooling).

### Why these two skip the consent gate

Reasoning: THE correction of the lesson. The student's freshly-built instinct from ch081 is to gate everything analytics. This section exists to break that reflex precisely and explain the principle.

Content:
- Restate the ch081 rule concisely (prerequisite redefinition, one or two sentences): non-essential cookies/tracking route through `useConsent()`; nothing fires until the user accepts. Keep it tight — ch081 lesson 5 owns it.
- The distinction: Vercel Web Analytics and Speed Insights set **no cookies** and do **no fingerprinting**; data is aggregated/anonymized at ingest. Under most jurisdictions this falls under "essential" / "legitimate interest" for traffic analytics and needs no consent. So they sit **outside** the gate.
- The failure mode stated as a direct instruction: if you gate `<Analytics />` behind the consent banner, you lose traffic data from every user who hasn't clicked accept — which on a marketing page is most of them — for **zero** compliance benefit. Don't do it.
- The forward contrast: PostHog *does* handle personal data (distinct IDs, IPs, event properties) and *does* route through the gate (lesson 3). Naming both halves cements the rule: gate by *what the tool collects*, not by reflex.
- One caveat for honesty: "most jurisdictions" — a few strict regimes may differ; the engineering default in 2026 is no-gate for these two, and legal sign-off is the team's call. One sentence, don't over-hedge.

Diagram (HTML+CSS, inside `<Figure>`): a two-lane "request fork" illustration. Left lane: Vercel Analytics / Speed Insights → straight through → ingest (labeled "no consent needed — cookieless"). Right lane: PostHog → through the `useConsent()` gate (labeled "fires only on accept"). Horizontal, compact. Pedagogical goal: make the gate-vs-no-gate boundary spatial and memorable — the single most important takeaway lives in this picture. Cross-reference it from the threshold mention in the first section.

Exercise (`Buckets`, two columns): "Sort each analytics concern into where it belongs." Bucket A: "Cookieless floor — ships now, no consent." Bucket B: "Crosses the threshold — needs PostHog (consent-gated)." Items: page views by country (A), top referrers (A), real-user LCP (A), "which users abandoned the onboarding funnel" (B), "roll the new billing UI out to 10% of orgs" (B), "replay the session where the user rage-clicked" (B), unique visitor count (A), "did variant B lift trial-to-paid" (B). Pedagogical goal: checks both the capability boundary AND the consent-gate boundary in one drill — the two load-bearing distinctions of the lesson. Grading is by bucket match.

### Where to enable it: production, preview, dev

Reasoning: a small but real operational decision; placed as its own short section because it's a concrete senior call, not a watch-out.

Content:
- Production: on by default — this is where the data matters.
- Preview deployments: opt in when you want QA against real traffic on a preview URL; otherwise leave off.
- Development: off — local navigation isn't signal and pollutes nothing useful.
- The dashboard is per-environment, so the toggle is a per-environment decision.
- Tie to the static-export watch-out: `@vercel/analytics` needs Vercel's edge to ingest. Ship it on a static export hosted elsewhere and it silently catches nothing — the script loads, the data has nowhere to go. Name this as a real deployment gotcha (the course's stack is Vercel-hosted, so it's the default, but the student should know the dependency).

Use an `Aside` (caution) for the two silent-failure watch-outs consolidated where they're actionable: (1) forgot the dashboard toggle → script ships, data sinkholes; (2) static export on a non-Vercel host → no edge ingest. Both are "looks installed, collects nothing" traps.

### When to reach past the floor

Reasoning: close the lesson on the threshold — the bridge to lesson 2 — so the student leaves with the decision frame, not just an install. Reinforces "trigger before tool."

Content:
- Recap the five threshold signals (the same ones named up front, now as the closing decision): *who* (identified user, not anonymous visitor), *what they did* (event + properties), *across sessions* (funnel), *gated by a flag*, *in replay*. If zero of these are real, stay on the floor.
- One line each on why the floor can't answer them (no identity, no event schema, no cross-session stitch, no flags, no replay) — so the threshold reads as a capability gap, not an arbitrary line.
- GA4 named once and dismissed: the historical default; the course doesn't reach for it. One or two sentences — its session/hit/audience model is awkward for product analytics, the consent-banner UX is heavier, the export shape is rigid. The 2026 SaaS split is Vercel for traffic + PostHog for product analytics; GA4 stays a marketing-stack conversation. Do not teach GA4; this is a "why not X" closure.
- Hand off to lesson 2 explicitly: "the next lesson lands the PostHog decision and the one-platform-four-primitives play."

Optional closing exercise (`MultipleChoice`, single question) to cement the threshold: "A pre-PMF marketing site with one pricing page wants to know how many visitors it gets and which posts drive sign-ups. What's the right analytics stack?" Correct: Vercel Web Analytics + Speed Insights only. Distractors: PostHog from day one; GA4; all four PostHog primitives. Pedagogical goal: confirm the student internalized "don't add weight before the trigger." Only include if it doesn't bloat the short lesson — the `Buckets` drill may already suffice; writer's call, but prefer this MCQ as the cleaner threshold check and drop it only if redundant.

### External resources (optional)

A small `CardGrid` of `ExternalResource` cards: Vercel Web Analytics quickstart, Vercel Speed Insights quickstart. Two cards max — official docs only. Use `simple-icons:vercel`. Skip if it adds nothing the lesson didn't cover; the install is short enough that one quickstart link is plenty.

## Scope

In scope: the senior frame (three questions), the two-tier model, why cookieless is the default, what each of Web Analytics and Speed Insights covers, the manual install in `app/layout.tsx`, the per-environment enable decision, why these skip the consent gate, the threshold past the floor, GA4 dismissal.

Out of scope (do not teach; redefine only as one-line prerequisites or forward references):
- **The decision to add PostHog and the four-needs frame** — lesson 2. Name the threshold; don't argue the platform.
- **Any PostHog wiring, events, flags, replay, experiments** — lessons 3-6. PostHog appears here only as "the gated Tier 1 reach, next lesson."
- **Core Web Vitals definitions and thresholds** — ch094 lesson 1. LCP/INP/CLS/TTFB/FCP are *preview vocabulary* only; one-clause `<Term>` definitions max.
- **Server-side performance traces, bundle analysis, Lighthouse** — ch094.
- **The consent gate's internals** (four-state machine, `useConsent()` implementation, the banner, `opt_out_capturing_by_default`) — ch081 lesson 5. Redefine in one or two sentences ("non-essential tracking routes through `useConsent()`; nothing fires pre-accept") only where the no-gate contrast needs it.
- **Vercel deployment setup** — Unit 5. Assume the app is already deployed on Vercel.
- **The typed `env` schema** — ch081 lesson 7 / ch037. Not needed: these two packages take no env vars.

Prerequisites the student already has (assume, don't re-teach): a Next.js App Router app deployed on Vercel; `app/layout.tsx` as the root layout; the consent gate built in ch081; pnpm as the package manager.

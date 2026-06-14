# Lesson outline — Chapter 094, Lesson 5

## Lesson title

- **Title:** Lighthouse as the pre-launch gate
- **Sidebar label:** Lighthouse pre-launch gate

---

## Lesson framing

**Archetype:** tooling-and-discipline. Load-bearing content = (1) the CI regression gate via `@lhci/cli` with budget assertions, (2) the SaaS threshold cheat sheet, (3) the pre-launch deep-audit walk over two surfaces. Estimated student time 40–50 min.

**The senior question this answers (state implicitly in the intro):** "The product ships in two weeks. How do I stop a performance regression from reaching production, and how do I do a one-off deep audit of the pages that matter before launch?" The answer is Lighthouse in two postures — a recurring CI gate and a one-off pre-launch sweep.

**The spine of the lesson — three reframes the student must leave with:**

1. **Lab is not field, and at pre-launch lab is *all you have*.** ch094 L1 already taught "field is the verdict, lab is the regression catcher." This lesson cashes that in and adds the sharper pre-launch truth surfaced by fact-check: a brand-new product has **no CrUX field data** (CrUX needs sufficient traffic), so before launch Lighthouse/lab is the *only* signal. After launch, field (Speed Insights, ch093 L1) becomes the verdict and Lighthouse demotes to the regression catcher. This resolves the apparent contradiction "L1 said don't chase Lighthouse — so why a whole lesson on it?"
2. **Lighthouse does not measure INP.** This is the single biggest correction vs. the chapter outline (which said Lighthouse reports "synthetic INP, estimated"). INP is field-only — it needs real user interactions a lab run can't produce. Lighthouse's lab proxy is **Total Blocking Time (TBT)**, and TBT is the *highest-weighted* metric in the Lighthouse 12 score (30%). The student must not assert an INP number from a Lighthouse report; they read TBT and treat it as a partial proxy (it captures only the input-delay component of INP).
3. **The gate is the assertion, not the score.** The discipline is failing CI when LCP regresses past a fixed lab budget or the JS budget busts — *not* when the aggregate score drifts 95 → 93. Score is diagnostic; budget assertions are the structural protection. This is the same "structural protection over vanity metric" through-line the whole chapter runs (the ESLint ban in L2, `sideEffects:false` in L3).

**Cognitive-load sequencing.** Build in this order so each piece rests on the prior: (a) what Lighthouse is and the lab metric set → (b) the three ways to run it, ending on `@lhci/cli` → (c) the two pre-launch surfaces + threshold cheat sheet (the concrete targets) → (d) the CI gate wiring as a forward-named pattern (config + assertions, not GHA mechanics) → (e) reading a report's four panes → (f) the one-off-vs-recurring synthesis that ties it back to the chapter's vigilance theme. Targets (cheat sheet) come *before* the CI config so the assertions in the config aren't arbitrary numbers.

**Hard scope guard — GitHub Actions is NOT taught here.** ch097 L1 owns the workflow/job/step model, triggers, pnpm caching, `permissions:`, secrets, and `concurrency:`; ch097 L2 owns the four-job merge gate and required status checks. This lesson is in Unit 19, *before* Unit 20 — the student has **not yet seen a GitHub Actions workflow**. Treat the LHCI CI wiring as a forward-named pattern: teach `lighthouserc.json` (URLs, assertions, budgets) and the conceptual flow (build → start → `lhci autorun` → fail-on-assert), and explicitly defer the YAML workflow itself to ch097 with a forward pointer. Do **not** show a `.github/workflows/*.yml` file. This matches how L4 handled CI artifacts (named the shape, deferred the YAML).

**Code posture.** Mechanics archetype, so code is present but minimal and convention-correct: one `lighthouserc.json` (the load-bearing artifact, walked with AnnotatedCode), the install command, and one short `package.json` script line. No workflow YAML. The `lighthouserc.json` is the one file the student should be able to write after this lesson.

**Tone.** Adult, terse, decision-first (per pedagogical guidelines). Lead every tool with the trigger it crosses, never "here is a tool, here are its options."

---

## Lesson sections

### Introduction (no heading)

Open on the senior question: ship date is two weeks out, and the team needs a structural way to stop perf regressions reaching prod plus a one-off deep pass on the high-traffic pages. Name the tension head-on and resolve it in two sentences: ch094 L1 said *chase field data, don't chase Lighthouse* — true after launch, but **before launch there is no field data** (CrUX needs traffic the unlaunched product doesn't have), so Lighthouse is the only pre-launch signal. Frame the two postures the lesson installs: the **pre-launch deep audit** (one-off) and the **CI regression gate** (recurring). Preview the concrete deliverable: a `lighthouserc.json` with budget assertions plus a threshold cheat sheet calibrated for a 2026 SaaS. Keep it warm and brief. Back-reference Speed Insights (ch093 L1) and the Vitals/field-vs-lab framing (ch094 L1) as assumed-known; do not re-teach.

### What Lighthouse measures (and the one Vital it can't)

**Goal:** install an accurate mental model of a Lighthouse run *and* correct the widespread misconception (present in the source outline) that Lighthouse reports INP.

Content:
- **The controlled environment.** A full page load under a fixed synthetic profile: simulated Slow 4G, mid-tier mobile CPU throttling, no extensions, no warm cache. One run, on demand, reproducible — the opposite of field data's "real users, real devices, 28-day window." This is *why* it's the regression catcher: a fixed profile means a metric move is a code change, not a network fluke.
- **The four categories.** Performance, Accessibility, Best Practices, SEO. (Note in passing that the PWA category was removed in Lighthouse 12 — if a tutorial shows five categories it's stale. Mirrors L1's "if it says FID it's stale" pattern.)
- **The lab metric set behind the Performance score.** This is the load-bearing correction. Present the five lab metrics and their weights as a small table/figure: **FCP 10%, Speed Index 10%, LCP 25%, Total Blocking Time (TBT) 30%, CLS 25%.** Two observations the student must take away: (1) **LCP and CLS appear here too** — the same two Vitals from L1, so the L2 image work and the CLS reserve-space discipline move this score directly. (2) **TBT, not INP.** Lighthouse *cannot* measure INP — INP needs real user interactions a lab load never performs. TBT (total time the main thread was blocked past 50ms during load) is the **partial lab proxy** for INP; it captures only the input-delay component. So: a high TBT is your pre-launch warning that INP will likely be bad in the field, but a Lighthouse report gives you **no INP number** — for that you need Speed Insights or DevTools (ch094 L1). Tie back: L1's "INP primary fix = less client JS"; TBT is how you catch that class *before* you have field INP.
- **The boundary restated.** Lighthouse = synthetic, pre-deploy, regression catcher + pre-launch deep dive. Speed Insights = real users, the production verdict (ch093 L1). When they disagree post-launch: field wins for prioritization, lab wins for regression detection (verbatim discipline from L1 — reinforce, don't re-derive).

**Component:** a `<Figure>` containing a simple HTML+CSS horizontal weighted-bar (or a small table) of the five-metric weighting, with TBT visually dominant (30%) and a callout that TBT is the INP proxy. Pedagogical goal: make "TBT is the big lever and the INP stand-in" visually unforgettable, and kill the "Lighthouse gives me INP" reflex. Keep it under ~800px tall, horizontal.

**Terms (Term component):** `TBT` (Total Blocking Time — sum of main-thread blocking time over 50ms during load; lab proxy for INP), `Speed Index` (how quickly content visually populates during load), `CrUX` (Chrome User Experience Report — the field-data source; needs traffic to exist) — CrUX may already be a Term from L1; if so, reuse not redefine.

### Three ways to run Lighthouse, and when each earns it

**Goal:** trigger-before-tool. Give the student the decision of *which surface* before any mechanics, framed by the recurring "what problem does this posture solve" question.

Content — present as three reaches, each with its trigger:
- **DevTools Lighthouse panel** — trigger: a quick ad-hoc check while developing, on the page you're staring at. One click, local. Caveat (watch-out, inline): run it against a **production build** (`pnpm build` + `pnpm start`), never `pnpm dev` — the dev bundle is unminified and unoptimized, every metric is meaningless. Also: localhost on the loopback has near-zero network latency, so even a prod build reads artificially fast — use throttling and treat absolute numbers with suspicion.
- **PageSpeed Insights (hosted Lighthouse + CrUX overlay)** — trigger: the pre-launch reach for the **marketing page**, because it runs Lighthouse on Google's infra *and* overlays CrUX field data when it exists, tying lab and field in one view. Critical pre-launch nuance (fact-checked): for an unlaunched URL the **field section simply won't appear** (insufficient traffic) — the student sees lab-only, which is the correct and expected pre-launch state, and is exactly why lab is the only pre-launch signal. After launch the field section fills in and becomes the verdict.
- **`@lhci/cli`** — trigger: the **automated regression gate** — runs against a built app in CI, asserts thresholds, fails the build. This is the course default for the gate and the spine of the next two sections.

**Component:** a compact `StateMachineWalker` (`kind="decision"`, default) — "You need to run Lighthouse. Which reach?" Branches on: ad-hoc local check → DevTools; one-off marketing/field-overlay audit → PageSpeed Insights; block regressions on every PR → `@lhci/cli`. Three leaves naming the tool + one-line why. Pedagogical goal: encode the *order a senior asks* (purpose → posture → tool), not a flat feature list. This is the canonical use-case for the walker per its doc ("which tool do I reach for here").

### Two surfaces and the threshold cheat sheet

**Goal:** give the concrete targets *before* the CI config, so the budget numbers in the config aren't arbitrary. This is the "what do I aim at" section.

Content:
- **Two surfaces are enough.** You do not audit every route. Pick (1) the **marketing/landing page** — highest traffic, SEO-sensitive, first impression, mostly static; and (2) **one critical authenticated screen** — the dashboard home or primary task screen, which ships more JS and is the realistic interactive worst case. Patterns repeat across the rest of the app; two surfaces cover the two regimes (static-marketing vs. JS-heavy-app).
- **The cheat sheet (the deliverable).** Present as a two-row table, framed explicitly as *2026 SaaS starting points, tighten quarterly* (not laws). Use fact-checked, internally-consistent numbers aligned to L1's Vital thresholds:

  | Surface | Performance | LCP (lab) | CLS | TBT (lab) | Total JS (gzip) |
  | --- | --- | --- | --- | --- | --- |
  | Marketing page | ≥ 90 | ≤ 2.5 s | ≤ 0.1 | ≤ 200 ms | ≤ 200 KB |
  | Authenticated dashboard | ≥ 85 | ≤ 3.0 s | ≤ 0.1 | ≤ 300 ms | ≤ 350 KB |

  Reasoning to spell out: LCP and CLS match L1's *good* Vital bands (lab ≈ field target). TBT replaces the outline's bogus "INP ≤ Xms lab" — there is no lab INP, so the budget is on TBT, the proxy. JS budgets connect straight to L4's treemap work (the dashboard's larger JS budget is *why* it scores lower on Performance — more JS → higher TBT → lower score). Dashboard targets are looser by design because authenticated screens legitimately ship more interactivity.
- **Why these and not "100 everywhere."** Inline watch-out: chasing a perfect 100 is diminishing returns and often doesn't move the experience for users on flaky networks; the cheat sheet encodes "good enough to not lose users," not vanity.

**Component:** the cheat-sheet table itself is the figure (a `<Figure caption=...>` around the table, or plain Markdown table with the framing sentence). Keep numbers in one place so downstream lessons/quiz can cite them consistently.

**Exercise (here):** a `Buckets` drill — `twoCol`, two buckets "Marketing page" and "Authenticated dashboard". Items are realistic page descriptions ("the public pricing page", "the org settings screen behind login", "the signup landing", "the invoice list a logged-in user opens") that the student sorts by which audit profile/budget applies. Goal: cement that the *budget you assert depends on the surface class*, not the page name. Grading: each item maps to one bucket.

### Wiring the CI gate with `@lhci/cli`

**Goal:** the recurring gate. Install + `lighthouserc.json` (the one file to learn) + the assertion/budget block. **Forward-defer all GitHub Actions mechanics to ch097.**

Content:
- **Install.** `pnpm add -D @lhci/cli` (dev dependency; pnpm 11+ per conventions). Note current shape from fact-check: `@lhci/cli` 0.15.x ships Lighthouse 12; Node 24 LTS (course default) is fine. Do not pin a version literal in prose beyond "0.15.x / Lighthouse 12" framing — version churn.
- **`lighthouserc.json` — the contract.** Walk it with `AnnotatedCode` (single file, attention directed pane by pane). The config has three load-bearing parts:
  1. `ci.collect` — the URLs to audit (the two surfaces) and `startServerCommand` (`pnpm start`, after a build) so LHCI boots the production app itself; `numberOfRuns` (3 is typical — median smooths run-to-run noise).
  2. `ci.assert` — the **assertions**, the heart of the gate. Show per-metric audit assertions tied to the cheat sheet (e.g. `largest-contentful-paint` maxNumericValue, `total-blocking-time` maxNumericValue, `cumulative-layout-shift` maxNumericValue, `categories:performance` minScore). Frame: **assert the metric budget, not the aggregate score** — the gate fails when LCP busts 2.5s, not when the score wobbles. Can layer the recommended `preset` ("lighthouse:recommended") as a starting assertion set, then override the few that matter.
  3. `ci.upload` — `target: 'temporary-public-storage'` as the zero-setup default for getting a shareable report URL on each run (name the LHCI server as the heavier self-hosted option, one line, don't build it).
- **Performance budgets — the structural form.** The `assert` block also supports `performance-budget` / `timing-budget` (resource-size and timing budgets): cap JS bytes, image bytes, font bytes, total weight, plus LCP/FCP timings. Pick **one budget per resource class** (the JS budget from the cheat sheet is the load-bearing one). Frame budgets as the *structural protection* (busting the JS budget fails the PR mechanically) vs. the score as diagnostic — same structural-protection through-line as L2's ESLint ban and L3's `sideEffects:false`.
- **The CI flow, named not built.** Describe the conceptual sequence the gate runs on a UI/dep-touching PR: build the app → start it → `lhci autorun` (which runs healthcheck → collect → assert → upload behind the scenes) → CI fails if any assertion fails. State explicitly: **the GitHub Actions workflow that orchestrates this — triggers, the runner, pnpm caching, secrets, an authenticated test user — is owned by ch097 (GitHub Actions primitives and the merge gate); here we own the `lighthouserc.json` and the flow it encodes.** One `package.json` script line (`"lhci": "lhci autorun"`) is the only other code. Authenticated-route auditing (the dashboard surface needs a logged-in session) is named as a real requirement with the two reaches — a `puppeteerScript` login or injected session cookie — but the implementation is deferred (it depends on the auth stack and the CI secret plumbing from ch097).

**Components:**
- `AnnotatedCode` for `lighthouserc.json` — steps: (1) the `collect` URLs + `startServerCommand`, (2) `numberOfRuns: 3` (LHCI runs Lighthouse 3× per URL and takes the **median** to smooth run-to-run noise), (3) the `assert` `preset` line, (4) the per-metric budget overrides tied to the cheat sheet, (5) the `upload` target. Use `color="blue"` as default, `green` on the assertion block to signal "this is the gate". `lang="json"`. Keep each step ≤6 lines of prose.
- **Verified assertion syntax (use exactly this shape — eslint-style `["<level>", { … }]`):**
  - `"largest-contentful-paint": ["error", { "maxNumericValue": 2500 }]` (LCP in **ms**)
  - `"total-blocking-time": ["error", { "maxNumericValue": 300 }]` (TBT in **ms**)
  - `"cumulative-layout-shift": ["error", { "maxNumericValue": 0.1 }]` (CLS **unitless**)
  - `"categories:performance": ["error", { "minScore": 0.9 }]` (score is **0–1**, so 0.9 = the 90 from the cheat sheet)
  - `"preset": "lighthouse:recommended"` sits alongside `assertions`.
  - Resource budget form: `"resource-summary:script:size": ["error", { "maxNumericValue": … }]` — sizes here are in **bytes** (the JS-budget KB figures from the cheat sheet must be expressed in bytes in the config; call this out so the student isn't surprised).
  - `upload`: `{ "target": "temporary-public-storage" }`.
- A short `Code` block (bash) for the install, and a one-line `Code` (json) for the `package.json` script — keep these as plain fenced blocks, not Annotated (they're trivial).

**Terms:** `autorun` (the LHCI command that chains collect → assert → upload), `temporary-public-storage` (LHCI's zero-config hosted report target). `headless` if used for the auth note.

### Reading a Lighthouse report

**Goal:** turn a report from a number into an action list. Four scan passes, act on Opportunities first.

Content — the four panes, in reading order:
1. **Performance score** — the weighted aggregate (the five metrics from the first section). Diagnostic value is the *per-metric breakdown beneath it*, never the single number. Restate: don't chase the number, read which metric is red.
2. **Metrics strip** — the five lab metrics with their values and pass/fail coloring. This is where you see *which* metric busted the budget (a red LCP vs. a red TBT point at completely different fixes — L2 images vs. L1/L4 client-JS).
3. **Opportunities** — ranked by estimated time savings (oversized images, render-blocking resources, unused JS/CSS, no next-gen formats). **Act here first** — biggest measurable wins, and each maps to a fix the chapter already taught: image opportunities → L2 (`next/image` `preload`, sizing); unused-JS / bundle opportunities → L3 (`optimizePackageImports`) + L4 (treemap triage); render-blocking → font/CSS handling (ch034 L4).
4. **Diagnostics** — structural issues without time estimates (excessive DOM size, long main-thread tasks, console errors). Long-main-thread-tasks here is the TBT story — points back at client JS.

Add the **cross-tool routing**: a red metric in Lighthouse is the *symptom*; the *diagnosis tool* differs by metric — bundle weight → L4 treemap, render-time waterfall → L6 (RSC waterfalls / Sentry trace), DB-bound TTFB → L7. Lighthouse tells you *that* it's slow and roughly *where*; the chapter's other tools tell you *why*.

Briefly name the **a11y/SEO/best-practices bonus**: Lighthouse cheaply surfaces missing alt text, form labels, contrast, landmarks (a11y), meta-tag basics (SEO), and HTTPS/mixed-content (best practices). Explicitly *not taught at depth here* — a11y is owned by Unit 3, SEO by ch034 L7 — but the audit flags the gaps for free; fixing them is the relevant lesson's job. One inline watch-out: ignoring a11y because users don't file complaints — they don't complain, they leave.

**Component:** a `Screenshot` (`viewport="desktop"`) of a real Lighthouse report (PageSpeed Insights or DevTools) inside a `<Figure>`, OR — if a clean capture isn't feasible — a `TabbedContent` with four tabs (Score / Metrics / Opportunities / Diagnostics), each a short prose + mini-illustration of what that pane shows and what to do. Prefer the real screenshot for credibility; the resourcer/figure agent should attempt a capture of a representative report and fall back to TabbedContent. Pedagogical goal: the student recognizes the panes and knows the reading order (Opportunities before Diagnostics, metric-breakdown before aggregate).

**Exercise (here):** `Matching` (or `Buckets`) — left column: a red Lighthouse signal ("LCP 4.1s", "TBT 600ms", "huge unused-JS opportunity", "high CLS", "Diagnostics: long main-thread tasks"); right column: the chapter fix/diagnosis tool ("`next/image preload` on the LCP element — L2", "less client JS / treemap triage — L3/L4", "reserve dimensions — L1/L2", "RSC waterfall in the trace — L6", etc.). Goal: cement Lighthouse-as-symptom → known-fix routing. This is the section's understanding check and the chapter-synthesis moment.

### Pre-launch deep pass vs. the recurring gate

**Goal:** the synthesis that ties the lesson to the chapter's vigilance theme — the *cadence*, not the tool. Closes the lesson.

Content:
- **Pre-launch one-off (the deep pass).** Before ship: run PageSpeed Insights against the marketing page, the dashboard, and 2–3 other critical screens (signup, primary task, settings). Triage every finding through the chapter's fix map — bundle (L4), images (L2), waterfalls (L6), DB/TTFB (L7) — ship the fixes, re-audit until the cheat-sheet targets are met. This is a *deep dive you do once*; remember the field section will be empty pre-launch (no traffic), so lab is the whole picture here.
- **Recurring CI gate (the floor).** `@lhci/cli` on PRs that touch UI or deps, against the two surfaces, with budget assertions. This is the *floor that holds as the app grows* — it can't make the app fast, it can only stop it from silently regressing past the budget. Pair with the post-launch verdict (Speed Insights field data) and the chapter's other recurring checks (weekly slow-query review, L7).
- **Post-launch calibration.** Once field data exists, recalibrate the CI budgets against *historical field data*, not vanity scores. If the field consistently beats a lab budget, you can tighten it; if the field is worse than lab predicted, the lab profile is too generous — trust the field for prioritization (L1's rule, now actionable).
- **The two-cadence picture** ties back to L1's "pre-launch deep pass + recurring vigilance" framing and the chapter map: this lesson is the *all-three-Vitals pre-launch gate* node.

**Component:** a small `<Figure>` two-column comparison (HTML+CSS or a TabbedContent) — "One-off: pre-launch deep pass" vs. "Recurring: the CI gate" — each listing trigger / tool / surfaces / what it can and can't do. Pedagogical goal: the student leaves able to say which posture a given situation calls for. Optionally a closing `MultipleChoice` (single question) probing the cadence distinction (e.g. "Your team merges a PR that adds a charting library to the dashboard — which Lighthouse posture catches a resulting regression?" → the CI gate's JS budget).

### External resources (LinkCards / ExternalResource)

A short `CardGrid` of `ExternalResource` cards — keep to 3–4, fact-checked live URLs:
- Lighthouse CI getting-started docs (`googlechrome.github.io/lighthouse-ci`).
- `@lhci/cli` on npm (for current version).
- web.dev / Chrome docs on why Lighthouse can't measure INP + TBT as the proxy (reinforces the lesson's central correction).
- PageSpeed Insights (the hosted runner the student will actually use pre-launch).

**Optional video:** if the resourcer finds a current (≤ ~18 months), high-quality walkthrough of Lighthouse CI or reading a Lighthouse report, embed via `VideoCallout` in the "Reading a Lighthouse report" or CI section. Not required; only if it genuinely supports the concept. Respect the YouTube MCP quota note — don't burn searches if a good asset isn't quickly found.

---

## Scope

**This lesson covers:** Lighthouse as a pre-launch posture — what a lab run measures (the five-metric Performance score, TBT-not-INP), the three run surfaces and their triggers, the two audit surfaces + the SaaS threshold cheat sheet, the `@lhci/cli` CI gate via `lighthouserc.json` with budget assertions, reading a report's four panes, and the one-off-vs-recurring cadence synthesis.

**Prerequisites (redefine in ≤1 sentence each, do not re-teach):**
- **Field vs. lab data; the three Vitals and their p75 bands** — owned by ch094 L1. Restate only the one-liner "field = real-user verdict, lab = synthetic regression catcher" and the LCP ≤ 2.5s / CLS ≤ 0.1 bands where the cheat sheet needs them.
- **Speed Insights** as the live field-data surface — owned by ch093 L1; referenced as the post-launch verdict, assumed installed.
- **The treemap / bundle triage** — owned by L4; referenced as the *why* behind a JS-budget bust and an unused-JS opportunity, not re-explained.
- **`next/image preload` on the LCP element** — owned by L2; referenced as the fix for an LCP/image opportunity. (Use `preload`, not the deprecated `priority` — per L2 continuity note.)

**Explicitly OUT of scope (defer, with forward pointers where natural):**
- **GitHub Actions mechanics** — workflow/job/step, triggers, runners, pnpm caching, `permissions:`, secrets, `concurrency:`, required status checks. Owned by **ch097 L1 (primitives)** and **ch097 L2 (four-job merge gate)**. Show **no** `.github/workflows/*.yml`; name the flow and defer. This is the hardest scope line — the student hasn't seen GHA yet (Unit 19 precedes Unit 20).
- **INP measurement / DevTools INP overlay** — owned by ch094 L1; here we only establish Lighthouse *can't* measure it and TBT is the proxy.
- **Speed Insights setup** — ch093 L1.
- **Vitals definitions / primary causes / structural reaches** — ch094 L1 (do not re-derive LCP/CLS causes; cite the fix lesson).
- **Sentry performance traces / the RSC waterfall diagnosis** — ch092 (trace install) and L6 (the waterfall fix); name as the *why-is-LCP/TTFB-slow* diagnosis tool, don't teach.
- **Bundle analyzer mechanics** — L4.
- **`next/image` / `next/font` full API** — ch034 L2 / L4.
- **Accessibility at depth** — Unit 3. **SEO at depth** — ch034 L7. Lighthouse surfaces these gaps; fixing them is those lessons.
- **DB indexes / N+1 / EXPLAIN ANALYZE** — L7 and ch039; named as the TTFB-side diagnosis, not taught.
- **The legacy `@next/bundle-analyzer` and the removed `next build` "First Load JS" table** — already handled in L4; do not reintroduce.

---

## Code-convention notes for downstream agents

- **Package manager:** pnpm 11+ (`pnpm add -D @lhci/cli`, `pnpm build`, `pnpm start`). Never `npm`/`yarn` (conventions: `only-allow pnpm`).
- **JSON config formatting:** `lighthouserc.json` follows Biome's project defaults (2-space indent). JSON uses double quotes (it's JSON, not TS) — this is *not* a violation of the single-quote rule, which governs TS/JS. Note this so a downstream agent doesn't "fix" the JSON to single quotes.
- **No workflow YAML** — deliberate scope choice (GHA is ch097). Flag in the lesson prose so a reviewer doesn't treat the missing workflow as an omission.
- **Version literals:** avoid hard-pinning in prose. Frame as "`@lhci/cli` 0.15.x ships Lighthouse 12; Node 24 LTS is fine." Fact-check at write time — LHCI versioning moves.
- **Deliberate simplification:** the `lighthouserc.json` shown is a teaching minimum (two URLs, a handful of assertions, `temporary-public-storage`). A real repo's config may carry more; note it's a starting point, mirroring how the cheat sheet is framed.

---

## Fact-check log (verified at authoring, June 2026)

- **Lighthouse does NOT measure INP** — INP is field-only (needs real user interaction). Lighthouse uses **Total Blocking Time (TBT)** as a *partial* lab proxy (captures only the input-delay component). This corrects the chapter outline's "synthetic INP, estimated/approximate." Verified via web.dev/DebugBear/Search Engine Journal.
- **Lighthouse 12 Performance score weights:** FCP 10%, Speed Index 10%, LCP 25%, **TBT 30%**, CLS 25%. TBT is the single highest-weighted metric. (DebugBear.)
- **Lighthouse categories:** Performance, Accessibility, Best Practices, SEO. **PWA category removed in Lighthouse 12** (May 2024).
- **`@lhci/cli`** latest 0.15.x, ships **Lighthouse 12.6.1**; Lighthouse 13 requires Node 22.19+ (course is Node 24 LTS — fine). `lhci autorun` chains healthcheck → collect → assert → upload. `assert` supports a `preset` plus `performance-budget`/`timing-budget`. (npm + Google LHCI docs.)
- **PageSpeed Insights** shows CrUX field data on top + Lighthouse lab below; **the CrUX field section does not appear for URLs without sufficient traffic** — directly supports the "no field data pre-launch, lab is all you have" framing. (Chrome/Google docs.)
- **GitHub Actions ownership confirmed:** ch097 L1 (primitives) + L2 (four-job merge gate) per the Table of contents — this lesson must not teach GHA; Unit 19 precedes Unit 20, so the student hasn't seen a workflow.

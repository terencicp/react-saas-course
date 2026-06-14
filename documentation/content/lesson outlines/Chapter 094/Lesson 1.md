# Lesson title

- Title: The Core Web Vitals
- Sidebar label: Core Web Vitals

# Lesson framing

Chapter-opener, **concept archetype**. Estimated 30-40 min. The student already has Speed Insights streaming real-user Vitals from production (ch093 L1) but has never been told what the three metrics *mean*, what counts as good, or what moves them. This lesson installs the vocabulary and the mental model the rest of the chapter operates on; it teaches almost no new code.

Load-bearing content, in priority order:
1. The three Vitals — LCP, INP, CLS — what each *measures* (one sentence the student can repeat), its p75 threshold, its **primary cause**, and its **one structural reach** in a Next.js SaaS.
2. **Field data vs lab data** — Speed Insights is the verdict (what Google Search scores), Lighthouse is the regression catcher. This single rule anchors all seven lessons; everything downstream is "which surface, for what job."
3. The **p75 / 28-day window** discipline — why "it's fast on my laptop" is not an answer, and why a regression won't show in field data for a week or two (the implication that licenses the pre-deploy lab gate in L5).

Mental model to leave the student with: *"Three numbers, scored at the 75th percentile of real mobile traffic over 28 days. Each has one dominant cause and one structural fix. I chase the field numbers and use lab tools to stop regressions before they ship."* This is a map, not a how-to — the student should finish able to name what's wrong from a metric, not yet able to fix it (each fix is its own downstream lesson).

Pedagogical strategy:
- **Anchor every metric in the user-visible failure it names**, not the acronym. LCP = "how long until the main thing appears." INP = "does the page respond when I tap." CLS = "does the page jump while I'm reading." Lead with the felt experience, then the formal definition. This is the cognitive-load-minimizing move: the student already knows these frustrations as a user.
- **Simplified-then-complex.** Introduce each Vital as the plain-language thing first; only then layer in the scoring detail (percentile, contribution math for CLS, p98-of-interactions for INP).
- **Frame in production stakes, not vanity.** These three feed Google Search ranking, conversion, and trust. Tie each metric to a business cost so the discipline reads as money, not a scoreboard.
- **Connect to prior knowledge constantly.** The student met the render pipeline (ch010 L2: parse→DOM→CSSOM→layout→paint), `next/image` (ch034 L2), `next/font` (ch034 L4), Speed Insights (ch093 L1), the DevTools Network/Performance panels (Unit 2). Every "cause" and "reach" lands on something already taught — name the connection explicitly.
- **The chapter map is part of the lesson, not an appendix.** Because this opener defines the metric→cause→fix structure the whole chapter follows, end by mapping each Vital to the lesson that fixes it. This is the "trigger before tool" framing for the chapter.

The most important watch-out to instill: **never chase a lab score while field data says otherwise.** Beginners discover Lighthouse, fixate on hitting 100, and optimize for a synthetic profile no real user has. Hammer the field-first rule.

Visuals carry this lesson. Concept lessons with three parallel structures (three Vitals, each with threshold/cause/fix) are exactly where a clean diagram beats prose. Code is near-absent — one tiny illustrative `next/image` line at most, clearly flagged as "previewed here, taught in L2."

# Lesson sections

## Introduction (no header)

Open on the senior question, in scene: production traffic is live, Speed Insights is reporting numbers — but a number with no model is noise. A red "LCP" pill means nothing until you know LCP is the wait for the main content to appear, that Google scores it for Search, and that the fix is usually one image. State the lesson's job: install the model behind the three numbers so the rest of the chapter can act on them. Connect back: "you wired Speed Insights last chapter; now we read what it's telling you." Keep it to ~4 sentences, warm and terse. Preview the end state: by the end you can look at any of the three Vitals and name what's wrong and which lesson fixes it.

Reasoning: per guidelines the senior question is implicit in the intro, not a section. The student arrives with the tool already installed, so the hook is "you have the dashboard, you lack the model."

## Three numbers Google scores you on

Purpose: establish the *set* and the scoring rule before drilling into each metric, so the student has the frame before the detail (simplified-then-complex at the chapter-section level).

Content:
- Name the three: **LCP** (Largest Contentful Paint), **INP** (Interaction to Next Paint), **CLS** (Cumulative Layout Shift). One-line plain-language gloss for each, deferring the real definitions to their own sections.
- The **75th-percentile rule**: each Vital is scored at p75 of real production traffic — "75% of your users get at least this experience, 25% get worse." Why p75 and not the average: averages hide the tail; a fast median with a miserable p90 still loses users. This is the single most important scoring fact and the antidote to "it's fast on my machine."
- The **rolling field window**: the score reflects a trailing window of real users, not the last hour. Google's CrUX dataset (what Search uses) aggregates on a ~28-day rolling basis; Speed Insights mirrors a recent-window p75. State the *principle* (field scores lag, they're a trend not a live alarm) and attach the 28-day figure to CrUX specifically rather than presenting it as a generic Vitals rule — verified: web.dev's Vitals pages foreground p75, the 28-day cadence is a CrUX detail. Implication paid off in the cadence section: a regression you ship today won't move the public score for a week or two.
- The **three thresholds** as a single reference: introduce the good / needs-improvement / poor banding. Give the exact good-thresholds inline so they're stated once authoritatively: **LCP ≤ 2.5s**, **INP ≤ 200ms**, **CLS ≤ 0.1**. (Poor boundaries: LCP > 4.0s, INP > 500ms, CLS > 0.25 — state for completeness.) Note Speed Insights surfaces all three against these bands.

Diagram (load-bearing, the lesson's keystone visual) — **HTML+CSS three-band threshold chart inside `<Figure>`**. Three horizontal rows, one per Vital, each row a left-to-right ramp split into green (good) / amber (needs-improvement) / red (poor) segments with the boundary values labeled (2.5s/4.0s, 200ms/500ms, 0.1/0.25) and the unit on the left. Pedagogical goal: make "good/needs-improvement/poor" and the per-metric numbers a single glanceable picture the student can recall, instead of a table of six numbers. Use saturated mid-tone fills with readable labels per the html-css guidance (green `#16a34a`, amber, red `#dc2626`); apply `margin: 0` to every inner element (prose-margin gotcha); escape `≤`/`<` in any text content as entities. Cap height well under 800px — three short rows.

Tooltips (`Term`): `CrUX` (Chrome User Experience Report — Google's public dataset of real-Chrome-user field metrics; what Search scores against), `p75` / `percentile` (the value 75% of samples fall at or below). Keep `Term` plain-text only.

Reasoning: leading with the scoring rule before the metrics means the student reads each subsequent definition already knowing "this gets measured at p75 over 28 days," so the three metric sections only have to add the metric-specific content.

## LCP — the wait for the main thing to appear

Purpose: first and most fixable Vital; the one the chapter spends the most lessons on.

Content:
- **What it measures**: render time of the largest content element visible in the initial viewport — usually the hero image, a big headline, or the first card. Plain framing: "how long until the thing the page is *about* shows up."
- **Why it's dominated by the network** — walk it against the render pipeline the student already knows (ch010 L2): HTML must arrive, the browser must *discover* the LCP element, fetch its bytes, then paint. The slow link is usually byte delivery of a big image or a blocking font.
- **Primary cause in a Next.js SaaS**: hero image shipped without `priority` (browser discovers it late, after layout), primary font without `next/font` (text can't paint), or a Server Component awaiting a slow upstream before it can render the element at all.
- **The one structural reach** (named, not taught — each is a downstream lesson): `priority` on the LCP image (L2), `next/font` for the primary typeface (ch034 L4 — already learned), and getting the data fetch off the critical path (L6). State plainly: LCP has more than one lever because it sits where network, fonts, and server timing meet — that's why it gets three lessons.

Visual: a tiny **annotated illustration (HTML+CSS or hand-coded SVG) of a viewport** with the LCP candidate (hero image) outlined and a one-line caption "this element's paint time *is* your LCP." Pedagogical goal: kill the most common misconception that LCP is a whole-page or "fully loaded" metric — it's *one element*. Keep it small; this is a clarifier, not a centerpiece.

Tooltip (`Term`): `Largest Contentful Paint`, `critical path` (the chain of fetches that must finish before the page can paint its main content).

Reasoning: framing LCP as "one element" up front prevents the student conflating it with total load time, which is the error that makes the L2 `priority` fix feel arbitrary later.

## INP — does the page respond when you tap

Purpose: the Vital driven by JavaScript weight, which the bundle lessons (L3/L4) exist to fix.

Content:
- **What it measures**: the latency of user interactions across the whole visit — from tap/click/keypress to the next frame the browser paints in response. Plain framing: "you tapped; how long until something happened." Add the precision once the plain version lands: Google reports roughly the worst interaction of the visit (p98 of the page's interactions), so one janky interaction can set the score.
- **Why the bottleneck is main-thread JavaScript**: the browser handles input on the main thread; if that thread is busy (a heavy Client Component re-rendering, a synchronous `JSON.parse` of a big payload, a third-party script hogging the event loop), the response is delayed. Connect to the render pipeline: paint and JS share one thread.
- **INP replaced FID in March 2024** — state it as fact and *why it matters*: FID only measured the *first* interaction's input delay; INP measures *all* interactions and includes processing + render, so it reflects the real felt experience. Flag the watch-out directly: if a tutorial or older dashboard mentions FID, it's stale.
- **The one structural reach**: ship less client JavaScript — let Server Components do the work the client used to (the Unit 3/4 thread finally cashing in). `'use client'` on the leaves only. Conditional reaches named for completeness, not taught: code-split heavy interactive widgets with `dynamic()`, debounce high-frequency handlers, push heavy synchronous work to a Web Worker. Diagnostic surface named: Chrome DevTools Performance panel with the INP overlay (the student met this panel in Unit 2).

Tooltips (`Term`): `Interaction to Next Paint`, `FID` (First Input Delay — the metric INP replaced in March 2024; only measured the first interaction), `main thread` (the single thread where the browser runs your JS and paints — block it and input stalls).

Reasoning: the FID→INP swap is an explicit watch-out in the chapter outline and a real trap (the student will find FID everywhere online). State it in the section that teaches INP, not in a watch-outs dump.

## CLS — does the page jump while you read

Purpose: the cheapest Vital to fix structurally and the one most often dismissed as cosmetic.

Content:
- **What it measures**: the cumulative score of *unexpected* layout shifts over the page's lifetime — content that moves after it was already painted. Plain framing, in scene: you go to tap a button, an image finishes loading above it, the button jumps down, you tap an ad instead.
- **The contribution math, simply**: each shift scores impact-fraction (how much of the viewport moved) × distance-fraction (how far it moved); the page's CLS is the sum of the worst shift windows. Keep it qualitative — bigger thing, moving farther, scores worse — the number isn't something the student computes by hand.
- **Primary causes**: images without reserved dimensions (the box collapses then expands when bytes arrive), late-injected banners/toasts pushing content, font swap reflowing text when the web font loads.
- **The one structural reach**: reserve space for everything dynamic. `next/image` requires `width`/`height` (or a sized `fill` container) — that reservation *is* the CLS fix (foreshadows L2's point that the blur placeholder is UX, the dimensions are the fix). `next/font` ships fallback metrics so the swap doesn't reflow. Skeletons must match resolved-content dimensions. Modals/toasts overlay with `position: fixed` so they don't displace flow content.
- **Why it's not cosmetic** — the business stakes: a shifting page mis-fires conversion clicks (the user taps the wrong thing) and reads as broken/untrustworthy. Cheapest to fix, most embarrassing to leave.

Diagram — **`TabbedContent` with two tabs (or `DiagramSequence` two-frame), HTML+CSS**: Tab "Shift" shows a headline, then an image loads *above* it with no reserved box and shoves the headline + a button down (annotate the jump). Tab "Reserved" shows the same load with the image box pre-sized so nothing moves. Pedagogical goal: make "reserve the space" visceral — the student sees the jump and the fix side by side. Real CSS so it's devtools-inspectable (the html-css USP). Mind the prose-margin reset and `min-width: 0` on flex children.

Tooltip (`Term`): `Cumulative Layout Shift`, `reflow` (the browser re-running layout when content size changes, moving everything after it).

Reasoning: CLS is abstract as a number but obvious as a picture; the side-by-side shift/reserved diagram is the highest-leverage visual after the threshold chart. The "not cosmetic" stake is in-section because dismissing CLS is the specific beginner error.

## Field data is the verdict, lab data is the regression catcher

Purpose: the chapter's load-bearing discipline — the rule every downstream lesson defers to. Gets its own h2 because it governs the whole chapter, not one metric.

Content:
- **Field data** (Speed Insights, from ch093 L1): real users, real devices, real networks, aggregated over the 28-day p75 window. This is what Google Search actually scores. It is the **verdict** — the truth about whether users are suffering.
- **Lab data** (Lighthouse, taught in L5): one synthetic run in a controlled environment — a simulated slow network, a mid-tier mobile CPU, no extensions, no cache. Reproducible, instant, runnable before deploy. It is the **regression catcher**, not the verdict.
- **The rule**: chase the field numbers; use lab numbers to stop regressions before they ship. When the two disagree, **field wins for prioritization, lab wins for catching a regression early.** State the canonical beginner failure as the anti-pattern: discovering Lighthouse and chasing a 100 score for a synthetic profile no real user has, while field data shows mobile users on flaky networks still hurting.
- Tie the two surfaces to *when* you look: field data is continuous/after-the-fact (lags 28 days); lab data is pre-deploy/on-demand. This is why you need both — neither covers the other's timing.

Diagram — **two-column comparison card (HTML+CSS or `TabbedContent`)**: "Field — Speed Insights" vs "Lab — Lighthouse," each column listing source (real users / one synthetic run), timing (28-day lag / instant), and job (the verdict / the regression catcher). Pedagogical goal: a durable side-by-side the student can recall whenever a downstream lesson says "field" or "lab." Keep it to ~3 contrast rows per side.

Exercise — **`Buckets`, two buckets ("Field data — Speed Insights" / "Lab data — Lighthouse")**, ~6 chips the student sorts: "Scores your Google Search ranking," "Runs before you deploy in CI," "Aggregates 28 days of real users," "One simulated mid-tier mobile run," "The verdict on whether users suffer," "Catches a regression in a PR." Goal: force the student to internalize which surface does which job — the exact distinction the rest of the chapter leans on. Grading is built into the bucket match. Phrase chips so they're not verbatim prose (per MultipleChoice guidance on pattern-matching — applies to all check exercises).

Reasoning: this is the thesis of the chapter. A concept lesson earns an exercise where the takeaway is a clean binary classification — `Buckets` is purpose-built for it and cheap to build.

## TTFB and FCP — the upstream tells

Purpose: name the two supporting metrics Speed Insights reports so the student can read them as *causes* when a Vital is bad, without mistaking them for Vitals.

Content:
- These are **not** Core Web Vitals, but Speed Insights reports them and they're the diagnostic breadcrumbs when LCP is poor.
- **TTFB** (Time to First Byte): how long until the server sends the first byte of HTML. High TTFB → the server is slow (a waterfall of awaits, L6; or a slow query, L7) and *everything* downstream including LCP inherits the delay.
- **FCP** (First Contentful Paint): when *any* content first paints. Read the relationship: FCP high → render is blocked early (render-blocking CSS/JS, slow TTFB). FCP fine but LCP much later → the LCP element specifically is the bottleneck (its image/font), point at L2.
- Frame as a tiny diagnostic ladder: bad LCP → check TTFB first (server) → then FCP (render start) → then the LCP element itself. This is the reading order, stated once.

Visual: optionally fold into the LCP section's timeline, or a one-line horizontal **timeline strip (HTML+CSS)**: `request → TTFB → FCP → LCP` on a left-to-right axis, labeling which downstream lesson owns each gap. Pedagogical goal: show these metrics are *points on the same load timeline*, so "high TTFB drags LCP" is visually obvious. Small; a supporting strip, not a centerpiece.

Tooltips (`Term`): `TTFB` (Time to First Byte), `FCP` (First Contentful Paint), `render-blocking` (a resource the browser must fetch and process before it can paint anything).

Reasoning: the outline lists these as "supporting cast"; they belong here as the bridge from "the metric is red" to "here's where to look," which is the whole point of a vigilance chapter. Keeping them clearly labeled *not Vitals* prevents the student padding their mental set to five.

## What runs once, what runs forever

Purpose: convert the 28-day-window fact into the cadence discipline, and lay the chapter map. Closes the lesson by orienting the student through the rest of the chapter.

Content:
- **The cadence implication of the window**: because field data is a trailing 28-day average, it is a *stability* feature, not a same-day alarm. You cannot rely on Speed Insights to tell you a deploy broke performance — by the time the score moves, the regression has been live for weeks. Therefore regression detection must happen **before deploy** (Lighthouse in CI, L5) or via event-level alerting; the rolling window is for trend, not triage.
- **Two rhythms**, named as the spine of the chapter: a **pre-launch deep pass** (one-off: audit the high-traffic pages, fix structurally) and **recurring vigilance** (the CI gate on every PR, the weekly slow-query glance). State this is "performance vigilance" — the chapter's whole premise: a small set of recurring checks plus irreversible structural defaults.
- **The chapter map** — map each Vital to its fix lesson so the student knows where each thread resolves:
  - LCP → **L2** (`priority` on the LCP image).
  - INP → **L3 + L4** (bundle weight: the barrel-export trap, then reading the bundle treemap).
  - All three → **L5** (Lighthouse as the pre-launch gate).
  - LCP via slow server → **L6** (RSC waterfalls and `Promise.all`).
  - LCP via slow query → **L7** (indexes and N+1 in production).
- Closing line: the metric tells you *what* hurts; the rest of the chapter is *how* to fix each one. You now have the map.

Visual: **chapter-map diagram** — either a compact HTML+CSS table (Vital | primary cause | this chapter's lesson) or a small Mermaid `flowchart LR` (three Vital nodes → their fix-lesson nodes). Prefer the HTML+CSS table: it doubles as the lesson's one-glance summary card (metric → cause → reach → lesson) and is the artifact the student will scroll back to. Pedagogical goal: leave the student with a single recall surface that ties metric, cause, fix, and lesson number together.

Reasoning: the chapter map is genuinely instructional here — it's the "trigger before tool" framing for the entire chapter and the payoff of the 28-day-window fact. Ending on it gives the concept lesson a forward-pointing close instead of a summary.

## External resources (optional, LinkCards / `ExternalResource`)

- web.dev Core Web Vitals overview (Google's canonical definitions + current thresholds).
- The web.dev INP page (states the FID→INP transition authoritatively).
- Optional `VideoCallout`: a short, recent (2025-2026) Google/Chrome talk on Core Web Vitals if one cleanly covers the LCP/INP/CLS triad at this level — only if it adds over the diagrams; the resourcer should verify currency (post-INP-launch) and that it's not a deprecated-FID-era video. Do not force a video; the visuals carry the lesson.

Reasoning: official `web.dev` is the live source of truth for thresholds (Google has tightened them before — see watch-out), so pointing there protects against the numbers drifting after publication.

# Scope

**Prerequisites to restate concisely (already taught — do not re-teach):**
- Speed Insights is installed and reporting (ch093 L1) — assume it's live; this lesson reads it, doesn't set it up.
- The browser render pipeline: parse → DOM → CSSOM → layout → paint → composite (ch010 L2) — reference it for the LCP/INP causes; one-line refresher max.
- `next/image` (ch034 L2) and `next/font` (ch034 L4) exist and are the image/font primitives — name them as the reaches; do not teach their APIs.
- DevTools Network and Performance panels (Unit 2) — name them as diagnostic surfaces; assume familiarity.

**Explicitly out of scope (owned by later lessons — name and defer, never teach):**
- `priority` mechanics, the `<img>` ESLint ban, `remotePatterns` — **L2**.
- Barrel exports, `optimizePackageImports`, `sideEffects: false` — **L3**.
- `@next/bundle-analyzer`, the treemap, First Load JS — **L4**.
- Lighthouse install, `@lhci/cli`, performance budgets, the threshold cheat sheet for CI — **L5** (this lesson establishes *that* lab≠field and the good-thresholds; L5 owns the CI calibration).
- RSC waterfalls, the dependency-check reflex, `Promise.all` rewrite — **L6** (this lesson may show at most a one-line `next/image` reference; it must **not** show a `Promise.all` rewrite — flag any temptation as L6's).
- `EXPLAIN ANALYZE`, composite `(org_id, …)` indexes, Drizzle-relations N+1 fix — **L7**.
- Sentry/Vercel trace install and reading (ch092) — named as the surface for L6's waterfall, not taught here.
- A11y and SEO audits — Unit 3 / ch034 L7; mentioned only as things Lighthouse also reports, in L5.

**Deliberate divergences from code conventions** (note for downstream agents): this is a concept lesson with essentially no project code, so most conventions (imports grouping, component-prop typing, etc.) don't apply. Any illustrative snippet (e.g. a single `<Image priority />` line) is intentionally a fragment, not a complete compilable file — it exists to make a metric concrete, and the real, convention-complete version is the downstream lesson's job. Do not pad this lesson with full code samples to satisfy conventions.

**Threshold accuracy note (load-bearing for downstream agents):** the chapter outline's "good" thresholds were corrupted by a templating pass (it reads "chapter 009s" etc.). The correct, current Google "good" thresholds are **LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1**; "poor" boundaries are **LCP > 4.0s, INP > 500ms, CLS > 0.25**. These were verified against web.dev (June 2026): LCP good ≤ 2.5s / poor > 4.0s and the INP/CLS bands are current. Scoring is p75 segmented across mobile and desktop. State these explicitly; web.dev's Vitals overview is the live source to re-check, since Google has historically tightened thresholds.

## Concept 1 — Field data is the verdict, lab data is the regression catcher

**Why it's hard.** Students arrive thinking "performance" is one number on one tool. The chapter's whole discipline collapses if they treat Lighthouse's 95 and Speed Insights' poor LCP as contradictory rather than complementary. Worse, they will chase the lab score because it moves the same day, while the field number lags 28 days and feels broken.

**Ideal teaching artifact.** A *side-by-side dashboard mock* the student scrubs through a six-week timeline. Two panels: a Lighthouse-style synthetic report on the left, a Speed Insights-style p75-over-28-days panel on the right. The student drags a "ship date" handle showing when a regression PR landed. Lighthouse spikes red the moment they cross it; the field panel lags, then bends, then crosses the threshold two weeks later. A second handle ("ship the fix") inverts the dance — lab green immediately, field still red. The artifact teaches three things at once: the 28-day rolling window, why CI catches what the dashboard misses, and which one is "the truth" for Google Search. Decision archetype with a temporal twist.

**Engagement.** After scrubbing, a four-statement true-false round: *"If Lighthouse says 95, Search ranks you well" — false. "Speed Insights moves same-day on a fix" — false.* The artifact carried the model; the t/f confirms the calibration locked in.

**Components.**

- New: `<LabVsFieldScrubber>` — props: a hard-coded regression+fix timeline with daily synthetic vs p75-rolling values; renders the two panels and a draggable date cursor. Hand-SVG inside `Figure` is the alternative if this stays single-use.
- `TrueFalse` for the confirmation round.

**Project link.** 20.4 asks the student to verify Sentry and Speed Insights against a seeded app — they must already know which dashboard answers which question before they start the audit.

---

## Concept 2 — The Vital triad: one cause, one structural reach each

**Why it's hard.** LCP, INP, and CLS are easy to memorize as letters and impossible to act on unless each is tied to its dominant cause and its one default-level fix. Students who treat them as a generic "perf score" reach for micro-optimizations and miss the structural move.

**Ideal teaching artifact.** A *triptych anatomy figure*: three columns, one per Vital. Each column shows a tiny annotated page mockup with the relevant element highlighted in motion — LCP's hero image fading in late, INP's button click hanging while a JS bar runs, CLS's headline jumping when the image loads. Below each column, two labels: "primary cause" and "the one reach." Concept archetype. The student should walk away with three pictures, not three definitions — the picture is what they recall in a Sentry trace at 11pm.

**Engagement.** A `Buckets` round: nine symptom cards ("hero image without `priority`", "click-handler does `JSON.parse` of 2MB payload", "modal pushes content down", "raw `<img>` no dimensions", "third-party script blocks main thread", etc.) sorted into LCP / INP / CLS columns.

**Components.**

- Hand-SVG inside `Figure` for the triptych, with subtle CSS animation on each panel (image fade, button hang shimmer, headline shift). Single use, no forward-link — `Figure` is correct here.
- `Buckets` for the sort.

**Project link.** 20.4's eight findings cluster by Vital — the bucket sort is the same triage the student performs on real seeded code in 20.4.2.

---

## Concept 3 — The `priority` budget is exactly one

**Why it's hard.** The reflex on seeing a `priority` prop is "more is better — put it on everything above the fold." The browser's high-priority budget is finite; two `priority` images split it and neither lands first. The discipline is *exactly one* per page, on *exactly the LCP element*.

**Ideal teaching artifact.** A *wrong-by-default sandbox*. The student opens a marketing page mock with three above-the-fold images. A "network panel" sub-view shows the fetch order and timestamps. They get a checkbox per image — toggle `priority` on or off. The page reports the resulting LCP after each toggle. Four configurations matter and the student must find them: no `priority` (LCP slow because hero isn't preloaded), `priority` only on hero (LCP fast — the win), `priority` on all three (LCP back to slow because the budget split), `priority` only on a decorative side image (LCP terrible because the wrong element won). The student earns the rule by trying to break it. Pattern archetype, sandbox-driven.

**Engagement.** The sandbox itself is the assessment — it gates on finding the single-priority-on-hero configuration. Follow-up `MultipleChoice`: "On a marketing page with hero image, logo, and three below-fold product photos, which gets `priority`?" with the hero as the only correct pick.

**Components.**

- New: `<PriorityBudgetSimulator>` — props: array of image descriptors (label, position, simulated bytes, is-LCP-candidate). Renders a page mock, a network waterfall mock, a checkbox per image, and a computed LCP readout. Forward-links to any future "preload" or "resource hints" lesson.
- `MultipleChoice` for the confirmation.

**Project link.** Finding 7 in 20.4 (`007-missing-priority.md`) is this concept on real seeded code — the simulator is the rehearsal.

---

## Concept 4 — The structural ban on `<img>`

**Why it's hard.** Students who learned HTML before this course will reach for `<img>` muscle-memory the first time they need an image. Each raw `<img>` silently regresses CLS, lazy-loading, and the Vercel pipeline. Telling them "don't" once doesn't hold; the rule must be structural.

**Ideal teaching artifact.** A short *rule-as-code* walkthrough: the `.eslintrc` line that turns `@next/next/no-img-element` to error, then the ESLint output a developer sees when they try `<img src=... />` in a PR. The interesting beat is the carve-out: an MDX file where `<img>` does work because the renderer maps it to `next/image` at compile time. The student sees the rule *fail loud* in feature code and *pass silently* in content. Pattern archetype — the rule is the lesson, not the API.

**Engagement.** `Tokens` on a code diff: click the line that the lint rule catches, and the carve-out the rule allows. Correct targets: the `<img>` in a `.tsx` file. Decoy: the `<img>` in `.mdx` content.

**Components.**

- `Code` to show the ESLint config and the failing output.
- `Tokens` for the recall click.

**Project link.** The 20.4 starter ships with this rule already configured — the audit assumes the student knows why it's there and what it caught.

---

## Concept 5 — Barrel exports as a module-graph failure

**Why it's hard.** Tree-shaking sounds like magic dust the bundler applies. Students don't see why their `import { Pencil } from 'lucide-react'` ships 600KB until they have a mental model of the module graph and what defeats it (dynamic re-exports, side effects, CommonJS interop).

**Ideal teaching artifact.** An *animated module-graph diagram*. Start with a single node: the student's `import { Pencil }`. Reveal the barrel `index.ts` as a fan-out of 1500 lines, each re-exporting one icon. Animate the bundler's traversal: it follows every re-export because it can't statically prove the others are unused. The output bundle visualization fills up — 600KB. Then a second pass shows the per-icon import `lucide-react/icons/pencil` going straight to the leaf — 1KB. The animation is the proof; words alone do not budge the misconception. Concept archetype, scrubbable.

**Engagement.** `PredictOutput`-style but on bundle size: three import statements, student picks "ships ~1KB", "~600KB", "depends on the bundler." Statements: per-icon deep import; barrel without optimization; barrel with `optimizePackageImports`.

**Components.**

- New: `<ModuleGraphScrubber>` — props: a graph definition (entry, barrel, leaves) and a step list. Scrubs through unoptimized traversal, then optimized. Forward-links to any future code-splitting or import-cost lesson.
- `MultipleChoice` (three-statement variant) for the size prediction. Alternative: `Buckets` sorting imports into "ships per-icon shape" vs "ships full library."

**Project link.** Finding 8 (the barrel before/after) needs the student to know *why* `@next/bundle-analyzer` shows the 600KB tile before they can write the rule-location-consequence-fix entry.

---

## Concept 6 — `optimizePackageImports` as the modern decision

**Why it's hard.** Students who learned the per-icon deep-import trick now have to unlearn it as the default. The 2026 reach is the Next.js config flag — it lets them write the readable form and ship the lean shape. The decision needs framing as a *default-and-fallbacks ladder*, not as "two equally valid options."

**Ideal teaching artifact.** A *decision tree* the student walks once. Root: "I'm importing from a third-party or internal package." First branch: "Is the package in Next.js's auto-list?" Yes → write the barrel form, done. No → "Does the library expose typed deep paths?" Yes → add it to `optimizePackageImports`. No → reach for per-icon if available, else accept the cost and document. Decision archetype. The tree's shape matters more than any individual code sample.

**Engagement.** A four-row matching drill: four library scenarios on the left (lucide-react in 2026, a niche third-party icon set, the team's internal `@org/ui`, a CommonJS-only legacy lib) to four reaches on the right (barrel + auto-list, barrel + add to config, barrel + `sideEffects: false` + add, accept or replace).

**Components.**

- New: `<DecisionTree>` — props: a tree of question nodes and leaf actions. Renders a Mermaid-style flowchart with the student's chosen path highlighted as they click through. Forward-links to many future "when to reach for X" lessons across the curriculum. Alternative: a Mermaid flowchart inside `Figure` if this concept stays the only use.
- `Matching` for the recall.

**Project link.** Finding 8 in 20.4 asks for the rule-location-consequence-fix; the *rule* line is whichever leaf of this tree applies.

---

## Concept 7 — The four-pass scan of a bundle treemap

**Why it's hard.** A treemap is alien on first sight — colored rectangles of varying sizes with no obvious entry point. Students stare at it, find the biggest tile, declare victory or panic, and miss three of the four failure shapes (per-route, duplicates, shared-chunk growth). The skill is a *reading order*, not a list of fixes.

**Ideal teaching artifact.** An *annotated guided treemap*. A real-shaped bundle screenshot with four numbered overlays the student steps through. Pass 1: biggest tile — overlay highlights it, prose names "expected vs surprise." Pass 2: per-route chunks — overlay shifts to one route's box, prose names the heavy-component cause. Pass 3: duplicates — overlay finds two instances of the same lib in different chunks. Pass 4: shared chunk — overlay on the central shared box, prose names the global-provider regression. Each pass ends with the triage line ("if surprise, replace; if heavy route, code-split"). Reference-with-walkthrough archetype.

**Engagement.** `Sequence` drill: scramble the four pass labels, student drags them into the correct order. Follow-up `MultipleChoice`: a fifth screenshot with one obvious anomaly — student picks which pass surfaced it.

**Components.**

- `AnnotatedCode` adapted for image — actually use `Figure` wrapping a hand-cropped treemap screenshot with `<DiagramSequence>` stepping through the four overlays. `DiagramSequence` exists; reuse it.
- `Sequence` and `MultipleChoice` for the recall.

**Project link.** Finding 8 uses `@next/bundle-analyzer` before/after screenshots — the student must be reading the treemap with this order to capture the right evidence.

---

## Concept 8 — Pre-launch deep audit vs CI regression gate

**Why it's hard.** Students conflate "Lighthouse" with "the tool you run before launch" or "the tool in CI." Both are right; the modes are different — one is a wide one-off pass, one is a narrow recurring gate. Without the split they either over-engineer the CI workflow or under-engineer the launch checklist.

**Ideal teaching artifact.** A *two-column comparison panel* — "Pre-launch one-off" vs "CI recurring gate." Each column lists: trigger, surface, what runs, what fails, who reads it. The two columns share a single bottom row showing the threshold cheat sheet (marketing 90+/2.5s; dashboard 85+/3.0s) — the *same numbers* power both modes, only the cadence differs. Decision archetype. The shared cheat-sheet row is the unlock: students stop thinking of these as two tools and start thinking of them as two cadences over one rulebook.

**Engagement.** `Buckets` sort: ten tasks (run PageSpeed Insights against marketing once, set `assertions.lcp` budget, eyeball the dashboard weekly, run `lhci autorun` on PRs touching `/app`, run synthetic audit against five critical screens before launch, etc.) into Pre-launch / Recurring / Both.

**Components.**

- `TabbedContent` for the two-column comparison; `Code` blocks for the `lighthouserc.json` assertions and the GitHub Actions step.
- `Buckets` for the sort.

**Project link.** 20.4 doesn't wire `@lhci/cli` as a starter requirement, but the discipline learned here makes the audit step principled rather than checklist-driven.

---

## Concept 9 — The RSC waterfall, made visible

**Why it's hard.** Server Components let students co-locate fetches with consumers, which feels right. The cost is invisible without a trace: four 80ms fetches that should have taken 80ms total take 320ms because rendering serializes them. Students who can't *see* the waterfall keep writing it.

**Ideal teaching artifact.** A *trace-shaped diagram* the student toggles between "sequential" and "parallel." Four spans render on a timeline. Toggle off: each span starts when the previous ends — staircase, 320ms total. Toggle on: spans 2 and 3 fire together once span 1 resolves — 240ms. A dependency-graph mini-panel beside it shows the actual data dependencies (org needs user.orgId; invoices and team both need org.id but not each other), so the student sees *why* the parallel shape is legal. Concept archetype with a visualizer, not a simulator — the data is the same, only the shape changes. Inline Mermaid sequence diagram alone is the static floor; the toggle is what makes the cost land.

A second beat is needed: the parent-child component variant. A small component-tree sketch with three children each doing their own fetch; arrow showing the fetches lining up serially despite no inter-dependency. The fix-shape (hoist to parent + `Promise.all`, pass down) is overlaid as a second component-tree state.

**Engagement.** `CodeReview` on a real-shaped RSC: student leaves an inline comment on the second `await` flagging "no dependency on the first — `Promise.all`." Rubric kernel: "names sequential awaits with no dependency, proposes `Promise.all` or hoist." Follow-up `MultipleChoice`: four scenarios, which qualify for `Promise.all` (must check dependency, not just two `await`s).

**Components.**

- New: `<WaterfallToggle>` — props: array of spans (id, duration, depends-on). Renders timeline in sequential or parallel mode, computes total. Forward-links to any future trace-reading or async-pattern lesson; reusable across Sentry, observability, and async chapters.
- `Figure` with hand-SVG for the component-tree before/after.
- `CodeReview` and `MultipleChoice` for the recall.

**Project link.** Finding 5 (the waterfall) in 20.4 is documented with the same rule-location-consequence-fix template — this concept is the rehearsal for spotting and rewriting the waterfall in seeded code.

---

## Concept 10 — Suspense streaming as the *sibling* reach

**Why it's hard.** Students who have heard of Suspense will reach for it as the default fix for slow fetches; it isn't. Suspense doesn't make a fetch faster — it lets the rest paint. The decision is conditional: parallel-await when all-or-nothing; Suspense when partial-paint is acceptable. The course teaches *when each earns its weight*.

**Ideal teaching artifact.** A *split-screen render comparison*. Two page mocks side by side, same content, same backend timing (one 800ms analytics widget, the rest fast). Left page: parallel awaits at the parent — blank until 800ms, then full paint. Right page: Suspense boundary around the slow widget — fast content paints at 80ms, widget streams in at 800ms with a skeleton in between. A scrub bar advances both pages in lockstep so the student sees the user-perceived difference. Then the decision frame above: "transactional page? Left. Dashboard widgets? Right." Decision archetype with a visual contrast.

**Engagement.** `MultipleChoice` (three scenarios): the checkout review page, the dashboard with five independent widgets, the invoice detail page with a slow PDF generator preview — pick parallel-await vs Suspense for each.

**Components.**

- New: `<StreamingComparison>` — props: timing schedule for two render strategies (block-until-all vs stream-on-resolve), shared scrub bar. Forward-links to any future Suspense, streaming, or progressive-rendering lesson. Alternative: two stacked GIFs inside a `TabbedContent` — cheaper, weaker.
- `MultipleChoice` for the recall.

**Project link.** Not directly referenced in the eight findings, but the concept reinforces the decision-frame the student applies when triaging slow traces in their own code.

---

## Concept 11 — Production DB vigilance: trace shape distinguishes the two failures

**Why it's hard.** "Slow query" in production is a category, not a diagnosis. Students need to look at the trace and split it into two distinct shapes — *one long span* (missing index) vs *many short spans* (N+1) — because the fix is structurally different. The diagnosis is visual; the prose only catalogs.

**Ideal teaching artifact.** A *trace-pattern matching drill*. Three small Sentry-style trace screenshots side by side: (a) one 280ms span on `select * from invoices where org_id = ...`, (b) fifty 6ms spans on `select * from customers where id = ...`, (c) one 14ms span (the healthy reference). Below each, a question prompt: "what shape is this?" with three options — missing index, N+1, healthy. Pattern archetype, recognition-first. The student earns the trace-reading reflex before any `EXPLAIN ANALYZE` or Drizzle-relations code appears.

A second beat is the structural fix tied to each shape — composite `(org_id, created_at)` for the index miss, Drizzle `with:` relations or `innerJoin` for the N+1. Show as paired `CodeVariants`: trace shape → fix code.

**Engagement.** The pattern-matching drill is the recognition assessment. Follow-up `DrizzleCoding` exercise: take an N+1-shaped query (loop with `findFirst` per row) and rewrite it using `with:` — graded by query count, not just result match.

**Components.**

- New: `<TraceShapeMatcher>` — props: array of trace shapes (spans, durations) and a multi-choice prompt per trace. Could also be assembled with `Figure` + hand-SVG traces and `MultipleChoice` if single-use. Forward-links to observability and Sentry chapters where trace reading recurs — keep as bespoke.
- `CodeVariants` for the fix-shape pairing.
- `DrizzleCoding` for the fix-in-code drill.

**Project link.** Finding 6 (the N+1) in 20.4 — the student must recognize the trace shape in the running app before writing the rule-location-consequence-fix entry.

---

## Concept 12 — Vigilance as cadence: once vs continuously

**Why it's hard.** The chapter teaches roughly a dozen reaches; without a cadence map the student treats them as a one-time launch checklist and the discipline rots three months in. The cut: some checks fire *once* (pre-launch deep audit, `EXPLAIN ANALYZE` on the top-five queries, pool sizing), some fire *every PR* (CI gate, bundle diff), some fire *weekly* (slow-query review, Speed Insights eyeball). The cadence is the discipline.

**Ideal teaching artifact.** A *vigilance calendar*: a one-page schedule view with three lanes — Pre-launch (one-off), Per-PR (continuous), Weekly (recurring). Each chapter reach is plotted into a lane. The student sees the whole chapter as a *recurring practice*, not a launch-week sprint. Reference archetype with a temporal layout. This closes the chapter and is the only artifact that ties seven lessons together.

**Engagement.** `Buckets` sort: twelve reaches from the chapter into the three lanes. The student demonstrates they can place each tool in its cadence.

**Components.**

- `Figure` with hand-SVG for the three-lane calendar layout. Single-use, no forward-link beyond this chapter — `Figure` is correct.
- `Buckets` for the sort.

**Project link.** 20.4's audit is itself the pre-launch one-off lane; the calendar makes clear what the team would *keep doing* after the audit ships.

---

## Component proposals

- **`<LabVsFieldScrubber>`** — props: synthetic+field timeline, regression date, fix date. Two stacked panels, draggable cursor.
  - Uses in this chapter: Concept 1.
  - Forward-links: Chapter 20.2 (Speed Insights install could replay this), and any future analytics chapter contrasting lab vs real.
  - Leanest v1: two static line-chart SVGs and a single slider that reveals "day N's report" in each — no animation, no per-day interpolation. Still teaches the lag.

- **`<PriorityBudgetSimulator>`** — props: image descriptors (label, position, bytes, is-LCP-candidate). Renders page + network waterfall + checkboxes + computed LCP.
  - Uses in this chapter: Concept 3.
  - Forward-links: any future lesson on `<link rel=preload>`, resource hints, or fetchpriority.
  - Leanest v1: three checkboxes and four hard-coded LCP outcomes for the four valid configurations — no real network mock, just a result table that updates on toggle.

- **`<ModuleGraphScrubber>`** — props: graph definition (entry, barrel, leaves), traversal steps.
  - Uses in this chapter: Concept 5.
  - Forward-links: future code-splitting, `dynamic()`, or import-cost lessons.
  - Leanest v1: two static SVG frames (unoptimized vs optimized) inside `DiagramSequence`. Loses the animation; keeps the contrast.

- **`<DecisionTree>`** — props: tree of question nodes and leaf actions. Highlights the student's path as they click.
  - Uses in this chapter: Concept 6.
  - Forward-links: many — every "when to reach for X" lesson across React, Drizzle, Sentry, and platform chapters.
  - Leanest v1: a Mermaid flowchart inside `Figure` with no interactivity. Builds the reach; foregoes the click-through.

- **`<WaterfallToggle>`** — props: spans with id, duration, dependency edges. Two timeline modes, computed total.
  - Uses in this chapter: Concept 9.
  - Forward-links: Sentry trace lessons (20.1), async chapters revisiting `Promise.all`, any future observability work.
  - Leanest v1: two static SVG timelines (sequential, parallel) and a toggle button — no compute, no dependency-graph panel. Carries the shape contrast.

- **`<StreamingComparison>`** — props: timing schedule for two render strategies + shared scrub bar.
  - Uses in this chapter: Concept 10.
  - Forward-links: future Suspense, progressive-rendering, or `loading.tsx` lessons.
  - Leanest v1: two GIFs side-by-side inside `TabbedContent` — loses the synchronized scrub, keeps the contrast.

- **`<TraceShapeMatcher>`** — props: array of trace shapes (spans, durations) and a multi-choice prompt per trace.
  - Uses in this chapter: Concept 11.
  - Forward-links: 20.1 Sentry trace reading, future observability and N+1 chapters.
  - Leanest v1: three hand-SVG trace screenshots wrapped in `Figure` with a `MultipleChoice` for each — no bespoke component. Same recognition drill, more authoring effort per instance.

## Build priority

Two proposals carry the most teaching load across the chapter and forward into the curriculum: **`<WaterfallToggle>`** (Concept 9, reusable in 20.1 and every future trace-reading lesson) and **`<TraceShapeMatcher>`** (Concept 11, same forward surface — the chapter trains trace literacy and these are the two artifacts that build it). Build these first.

Second tier: **`<DecisionTree>`**, because the "when to reach for X" shape repeats across many chapters and a reusable component pays back faster than authoring Mermaid flowcharts repeatedly. **`<ModuleGraphScrubber>`** is third — narrower forward surface but the chapter's hardest mental model to convey without animation.

The single-chapter scrubbers (`<LabVsFieldScrubber>`, `<PriorityBudgetSimulator>`, `<StreamingComparison>`) are valuable but defer until the trace-literacy pair lands. Each has a credible leanest v1 using existing components, so the chapter ships without them if needed.

## Open pedagogical questions

- Concept 3's `<PriorityBudgetSimulator>` simulates LCP outcomes — should the "computed LCP" be derived from a real heuristic (bytes / simulated bandwidth) or four hard-coded outcomes for the four valid configurations? Real heuristic risks misleading numbers; hard-coded is honest but feels canned.
- Concept 9 needs both a span-timeline visualizer *and* a component-tree before/after — the two beats are genuinely different (timeline shape vs. fix-shape). Treating them as one artifact would conflate them. Confirm the two-artifact split is acceptable here against the single-paragraph default.

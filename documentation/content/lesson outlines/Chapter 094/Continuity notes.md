# Chapter 094 — Performance vigilance — Continuity notes

## Lesson 1 — The Core Web Vitals

**Taught.** Definitions, p75 thresholds, primary cause, and one structural reach for LCP/INP/CLS; the field-data-is-verdict / lab-data-is-regression-catcher discipline; p75 and the 28-day CrUX window; TTFB and FCP as non-Vital diagnostic tells; the two vigilance cadences (pre-launch deep pass, recurring CI gate); and a chapter map tying each metric to its fix lesson.

**Cut.** The chapter outline note that Google has historically tightened thresholds was not turned into a recurring watch-out callout — mentioned only in the external-resources aside. CrUX was explained as the 28-day window source but not named as a separate dashboard the student could visit.

**Debts.**
- `priority` on the LCP image — deferred to L2, explicitly named.
- Barrel-export trap and `optimizePackageImports` — deferred to L3.
- `@next/bundle-analyzer` treemap — deferred to L4.
- Lighthouse CI gate and `@lhci/cli` — deferred to L5; this lesson established only that lab ≠ field and that a pre-deploy gate is needed.
- RSC waterfalls and `Promise.all` — deferred to L6.
- DB indexes and N+1 in production — deferred to L7.
- Speed Insights install — back-referenced to ch093 L1 (assumed live).
- `next/image` and `next/font` APIs — back-referenced to ch034 L2 and ch034 L4.
- DevTools Performance panel and Network panel — back-referenced to Unit 2.

**Terminology.**
- **LCP** — Largest Contentful Paint; render time of the largest visible element in the initial viewport; good ≤ 2.5 s, poor > 4.0 s.
- **INP** — Interaction to Next Paint; worst interaction latency across the visit (≈ p98 of interactions); good ≤ 200 ms, poor > 500 ms. Replaced FID in March 2024.
- **CLS** — Cumulative Layout Shift; cumulative score of unexpected layout shifts; good ≤ 0.1, poor > 0.25.
- **p75** — the value 75 % of samples fall at or below; the percentile Google uses to score all three Vitals.
- **28-day rolling window** — CrUX (Chrome User Experience Report) aggregation period; field scores lag a regression by 1–2 weeks.
- **Field data** — real users, real devices, real networks; what Search scores; Speed Insights is the surface; "the verdict."
- **Lab data** — one synthetic run (simulated Slow 4G + mid-tier mobile CPU); pre-deploy, on-demand; Lighthouse is the surface; "the regression catcher."
- **Critical path** — the chain of fetches that must finish before the browser can paint main content (used to explain LCP's network domination).
- **Main thread** — the single browser thread that runs JS and performs layout/paint; blocking it delays INP.
- **FID** (First Input Delay) — the stale metric INP replaced; flagged as "if a tutorial mentions FID, it's stale."
- **TTFB** (Time to First Byte) — server response latency; diagnostic upstream tell for LCP.
- **FCP** (First Contentful Paint) — first paint of any content; diagnostic upstream tell distinguishing render-blocking from LCP-element bottleneck.
- **Reflow** — browser re-running layout when content dimensions change; primary CLS mechanism.
- **render-blocking** — a resource the browser must download and process before it can paint anything.
- **Pre-launch deep pass** — one-off full audit of high-traffic pages before shipping.
- **Recurring vigilance** — the CI lab gate + weekly slow-query review that keeps the app fast as it grows.

**Patterns and best practices.**
- Chase field numbers (Speed Insights p75); use lab tools (Lighthouse) only to catch regressions before deploy. When the two disagree: field wins for prioritization, lab wins for regression detection.
- Never chase a Lighthouse score while field data shows otherwise; synthetic 100 is a vanity metric.
- `next/image` `width`/`height` (or sized `fill`) prevents CLS — dimensions are the fix, `placeholder="blur"` is UX polish only.
- `next/font` ships fallback metrics so font-swap does not reflow, addressing both LCP (late discovery) and CLS.
- `'use client'` on the leaves only; Server Components doing work server-side is the primary INP lever.
- Reserve space for every dynamic element (images, skeletons, modals/toasts via `position: fixed`) to prevent CLS.
- TTFB → FCP → LCP is the diagnostic reading order when LCP is red.

**Misc.**
- The chapter-outline threshold for LCP contained a templating artifact ("chapter 009s"); correct values are LCP ≤ 2.5 s / > 4.0 s, INP ≤ 200 ms / > 500 ms, CLS ≤ 0.1 / > 0.25 — the lesson uses the correct values; all downstream lessons must match.
- The lesson is almost code-free by design; any illustrative snippet (e.g. `<Image priority />`) is a fragment, not a complete compilable file — full convention-complete code is L2's job.
- INP's p98-of-interactions nuance was taught; L3/L4 can reference "one janky interaction sets the score" without re-explaining.
- The chapter map table (metric → cause → fix → lesson) was delivered as the lesson's closing diagram — L2–L7 authors can assume students have seen it and refer back to it.

## Lesson 2 — Priority on the LCP element

**Taught.** The discovery-gap mechanism (hero is in `<body>`, CSS/JS get head start from `<head>`; default lazy-loading doubly penalizes the hero); what `preload` emits (`<link rel="preload">` in `<head>` + `fetchpriority="high"` + `loading="eager"` on the `<img>`); the one-preload-per-page discipline; how to identify the LCP element (DevTools Performance LCP marker / PageSpeed Insights); the `preload` vs `fetchPriority="high"` vs `loading="eager"` decision table (stable LCP → `preload`; art-directed viewport-dependent LCP → `fetchPriority="high"`; never combine); the `@next/next/no-img-element` ESLint ban and how `eslint-config-next/core-web-vitals` upgrades it from warning to error; the MDX carve-out; verifying via Network panel (Initiator = Parser, Priority = High) and the Speed Insights 28-day lag.

**Cut.** The chapter outline included several topics this lesson explicitly deferred to ch034 L2 (already taught there): required props (`src`/`alt`/`width`/`height`/`fill`), `placeholder="blur"` + CLS, `remotePatterns`, `decoding`/`loading` prop defaults, `unoptimized`, and Vercel image-optimization quota. The outline's `priority`-named prop was replaced by `preload` per the Next.js 16 rename — `priority` appears only as the deprecated alias. The `getImageProps` / `<picture>` art-direction implementation was named as out-of-scope; `fetchPriority="high"` is named as the reach without building the machinery.

**Debts.**
- Bundle weight / barrel exports / the analyzer — deferred to L3–L4 per the chapter map.
- TTFB and server-side causes — `preload` explicitly does not fix these; forward pointer to L6–L7.
- Lighthouse CI gate — verification here means DevTools + Speed Insights only; `@lhci/cli` deferred to L5.

**Terminology.**
- **`preload`** — the Next.js 16 `<Image>` prop (renamed from `priority` in v16.0) that injects a `<link rel="preload" as="image">` in `<head>`, sets `fetchpriority="high"`, and enables eager loading. Write `preload`; `priority` is the deprecated alias the student will recognise in old code.
- **`fetchpriority`** — HTML attribute hinting relative download urgency to the browser; distinct from discovery timing (when the resource is found vs how urgently it is fetched once found).
- **art direction** — serving a deliberately different image or crop per device (not just a different size of the same image); the case where `preload` is wrong and `fetchPriority="high"` is the reach.
- **flat config** — ESLint's `eslint.config.mjs` array-of-objects format (replaced `.eslintrc`; now the only supported ESLint config form).
- **discovery gap** — the delay between HTML parse start and when the browser first sees the LCP element in the body; `preload` eliminates it by moving the fetch hint to `<head>`-parse time.

**Patterns and best practices.**
- Add `preload` to exactly one `<Image>` per page — the LCP candidate. All other images (including above-the-fold non-LCP images) stay default lazy.
- Never combine `preload` with `loading` or `fetchPriority` — `preload` is a superset; redundant hints are ignored and add confusion.
- For a viewport-dependent hero (art direction), use `fetchPriority="high"` (optionally with `loading="eager"`) on the element that is actually painted; do not use `preload` (it would front-load an image one layout never displays).
- Biome is the primary linter but does NOT enforce `no-img-element`; that rule lives in `@next/eslint-plugin-next` and becomes an error only because the project adopts `eslint-config-next/core-web-vitals`. ESLint runs alongside Biome for Next-specific rules Biome hasn't ported.
- After adding `preload`, confirm in the Network panel: Initiator = "Parser", Priority = "High", fetch starts within ~200 ms of navigation. Lab LCP drops immediately; field LCP lags the 28-day window — do not revert a good change because the dashboard hasn't caught up.
- A raw `<img>` in feature code fails the lint run / CI. The sole carve-out: `<img>` inside MDX/markdown content bodies (the MDX renderer maps these to `next/image` at compile time).

**Misc.**
- `next lint` and the `eslint` key in `next.config` were removed in Next.js 16; linting now runs directly via the ESLint CLI against `eslint.config.mjs`.
- The lesson is code-light by design: only fragments (one `<Image>` + its emitted HTML + a before/after CodeVariants + a short `eslint.config.mjs` spread). No full compilable file — ch034 L2 is the canonical reference for the complete `next/image` surface.
- L1's snippet used `priority` (the old name) in a passing illustration; this lesson explicitly reconciles by naming `preload` as the current prop and `priority` as deprecated, so downstream lessons should use `preload` in all code.

## Lesson 3 — The barrel-export trap

**Taught.** Why barrel re-exports defeat tree-shaking (module-level side effects, wildcard re-exports, CommonJS interop); the lucide-react case study (~1500 icons, ~600KB unoptimized vs. ~30KB per-export); `experimental.optimizePackageImports` as the course default (build-time rewrite, team writes the readable form); `sideEffects: false` in `package.json` as the structural enabler; the internal `ui` package as the same trap and its three-move fix; a decision frame for any multi-export import; lodash vs. `lodash-es`; watch-outs for the fix itself.

**Cut.** The chapter outline cited Radix UI as a "per-component package that sidesteps the trap structurally" — this is outdated (Radix consolidated into a unified `radix-ui` package in 2025) and was omitted entirely. The outline's forward-claim of "graduating to stable" for `optimizePackageImports` was replaced with a fact-checked watch-out (still experimental under `experimental` as of Next.js 16.2).

**Debts.**
- Bundle analyzer (`@next/bundle-analyzer`) and treemap verification of the barrel fix — explicitly deferred to L4 with a forward pointer ("you'll prove the fix worked next lesson").
- The chapter outline's note that `optimizePackageImports` may graduate to a top-level key — forward-pointed to L4/release notes.

**Terminology.**
- **barrel file** — a package's `index.ts` whose sole job is re-exporting all named exports from its internal modules; one import path, autocomplete over the whole library, but routes the bundler through the full re-export graph.
- **tree-shaking** — dead-code elimination across ES modules; the bundler drops exports nothing imports, but only when the module graph is static and side-effect-free.
- **CommonJS interop** — mixing CJS `require`-based modules into an ESM graph; CJS exports are runtime-computed, so the bundler cannot statically shake them — it's all or nothing.
- **side effect** — code that runs as a consequence of importing a module (registering a handler, mutating a global, pulling in CSS); a module with none can be dropped when unused.
- **`optimizePackageImports`** — `next.config.ts` key under `experimental`; Next.js rewrites barrel imports to per-export deep imports at build time (production only, not `pnpm dev`). Default-optimized list includes `lucide-react`, `date-fns`, `lodash-es`, `recharts`, `@tabler/icons-react`, and others. Packages not on the list must be added explicitly.
- **per-export deep import** — `import Pencil from 'lucide-react/icons/pencil'`; reaches one module directly, bypasses the barrel; no-config but verbose and a semver risk if the path is not public API.
- **`sideEffects: false`** — `package.json` field; promises the bundler no module in the package runs import-time code, enabling aggressive pruning. Array form (`["*.css"]`) needed when genuine side-effect modules (e.g. CSS imports) exist.

**Patterns and best practices.**
- `experimental.optimizePackageImports` is the course default for multi-export packages not on Next's auto-list. Write the readable `{ named }` barrel import; let the build rewrite it. Per-export deep imports are a fallback only (no-config experiments or libraries without public deep paths).
- `sideEffects: false` must be set in the `package.json` of every internal shared package (`@acme/ui`, etc.) for the bundler to prune aggressively; use the array form for packages that ship CSS.
- Internal `ui` barrel three-move checklist: (1) barrel `index.ts` is re-export-only (no logic, no side-effect imports in the chain); (2) `"sideEffects": false` in its `package.json`; (3) package name added to `optimizePackageImports`.
- No barrel files in `lib/`, `db/`, `app/_lib/` — import the file you need. The only sanctioned barrel is a re-export-only, `sideEffects`-flagged, listed internal component library.
- Prefer `lodash-es` over `lodash`; plain `lodash` is CommonJS and drags the full ~70KB library for any import.
- Never mix per-icon deep imports and `{ named }` barrel imports from the same package — the barrel still loads for the barrel lines.

**Misc.**
- `optimizePackageImports` config is written under `experimental`, not top-level, because it is still experimental as of Next.js 16.2. Downstream agents must not "fix" it to a top-level key.
- The transform runs in production builds only; the dev bundle (`pnpm dev`) stays large — this is expected, not a regression. L4 should not frame a heavy dev bundle as a bug.
- The lesson explicitly does NOT show analyzer treemap output or claim measured byte counts beyond the rough shape (~600KB → ~30KB illustrative bar); L4 owns all verified measurements.

## Lesson 4 — Reading the bundle treemap

**Taught.** How to read a bundle treemap (area = bytes, transfer/gzipped size, client vs. server environment filter, framework runtime as the floor); the built-in Turbopack analyzer as the course default (`pnpm next experimental-analyze` / `--output`); the four scan passes (biggest tile, per-route chunk, duplicate dep, shared chunk); the triage decision tree from any surprising tile to a concrete fix; what the treemap cannot see (runtime cost, third-party scripts); the two vigilance cadences (per-dep-change PR artifact, pre-launch deep pass); the before/after proof of L3's barrel fix (~600KB → ~30KB illustrative shape).

**Cut.** The chapter outline taught this lesson around `@next/bundle-analyzer` (Webpack plugin) and the `next build` "First Load JS" per-route table — both are inapplicable to Next.js 16 + Turbopack. The lesson demoted `@next/bundle-analyzer` to a one-paragraph legacy fallback and explicitly defused the deleted build table as a beginner trap. The `hashicorp/nextjs-bundle-analysis` GitHub Action was named but flagged as Webpack/build-table-era, so only the `--output` artifact + reviewer-diff was recommended for a Turbopack project; no workflow YAML was shown (forward-pointed to ch097 L1).

**Debts.**
- `dynamic()` code-splitting mechanics — named as the fix for a heavy per-route interactive chunk; mechanics deferred to Unit 3.
- Lighthouse CI gate and total-JS budget — named as the L5 sibling on the lab-data axis; the smell test framing (Speed Insights → treemap → Lighthouse) is established here for L5 to build on.
- GitHub Actions CI-artifact wiring — named as a shape, forward-pointed to ch097 L1.
- Runtime cost / main-thread work — named as the treemap's blind spot; diagnosis deferred to Chrome DevTools Performance panel (Unit 2 back-reference).

**Terminology.**
- **treemap** — a space-filling chart of nested rectangles where area encodes a quantity (bytes); read transfer/gzipped size, not raw/parsed size.
- **transfer size** — the compressed bytes actually sent over the wire; the figure that matters for user experience.
- **framework runtime / floor** — the React + Next.js runtime tile; the largest legitimate tile in every app; not an optimization target.
- **import chain** — the exact sequence of imports that pulled a module into a bundle chunk; visible by clicking a tile in the analyzer; answers "why is this here."
- **`pnpm next experimental-analyze`** — runs a production build and opens an interactive Turbopack treemap; `--output` writes a static copy to `.next/diagnostics/analyze`.
- **per-route chunk** — a code-split bundle emitted for one route's interactive components; heavy chunk = heavy interactive component on that page.
- **shared chunk** — the chunk loaded on every route (root layout imports + framework runtime); should be near-constant across releases.
- **duplicate dependency** — the same package appearing as two tiles (usually two versions from a peer-dep mismatch); fix with `pnpm dedupe`.
- **`pnpm dedupe`** — resolves duplicate versions in the lockfile; the fix for pass-3 (duplicate dep) findings.

**Patterns and best practices.**
- Run `pnpm next experimental-analyze` (not `@next/bundle-analyzer`) on any Next.js 16 + Turbopack project; the Webpack plugin does not reflect the real build.
- Always filter to the client environment for INP-focused audits; the server view is a secondary diagnostic for cold-start size.
- Run the four scan passes in order every time: biggest tile → per-route → duplicate dep → shared chunk. Global/structural bloat (passes 3–4) is worse than route-local bloat (passes 1–2) because every route pays it.
- Any PR that adds or bumps a dependency or adds a heavy interactive component gets an `--output` artifact diff against `main` before merging.
- Run a pre-launch deep pass on the marketing page, dashboard, and primary task screen; fix findings; re-run to confirm.
- `pnpm dedupe` is the fix for duplicate-dependency findings — the resolution is in the package manager, not in source code.

**Misc.**
- The "First Load JS" per-route table was removed from `next build` output in Next.js 16 (inaccurate for RSC architectures). Downstream lessons must not reference it; if a student reports not seeing it, that is expected.
- The built-in analyzer command is still `experimental-analyze` as of Next.js 16.2 (Feb 2026); the `experimental-` prefix indicates future potential graduation, not instability. Downstream agents must not "stabilize" it.
- `--output` writes to `.next/diagnostics/analyze` (not `.next/analyze/` — that is the legacy `@next/bundle-analyzer` path).
- The smell-test framing from L1 ("field data says bundle regressed → treemap says what") is now complete: Speed Insights/INP → treemap → triage. L5 (Lighthouse) adds the lab-data regression gate on top of this.
- The lesson's before/after bar figure (lucide ~600KB → ~30KB) cashes L3's forward promise; numbers are explicitly labeled as illustrative — no real measured output was captured.

## Lesson 5 — Lighthouse as the pre-launch gate

**Taught.** What a Lighthouse lab run measures (five-metric Performance score with weights; TBT as INP proxy; PWA category removed in L12); the three run surfaces and their triggers (DevTools, PageSpeed Insights, `@lhci/cli`); the two-surface audit scope (marketing + one authenticated screen) with the 2026 SaaS threshold cheat sheet; the `@lhci/cli` CI gate via `lighthouserc.json` (collect/assert/upload blocks, median-of-3 runs, per-metric budget assertions, `resource-summary:script:size` JS cap); reading a report's four panes (score → metrics → opportunities → diagnostics) and the cross-tool routing (red metric → fix lesson); the one-off pre-launch deep-pass vs. recurring CI gate cadence distinction; post-launch calibration of CI budgets against field data.

**Cut.** The chapter outline stated Lighthouse reports "synthetic INP, estimated/approximate" — this is incorrect and was replaced with the factual correction (Lighthouse cannot measure INP at all; TBT is the partial lab proxy). The outline's GitHub Actions workflow and authenticated-route `puppeteerScript` implementation were not shown — the lesson names both as requirements and explicitly defers them to ch097. The LHCI server (self-hosted historical trends) was named and deferred; `assertMatrix` for per-surface budgets was named as a small extension of the basic gate. A11y, SEO, and best-practices categories were named but not taught at depth (deferred to Unit 3 / ch034 L7 as before). The four-pane "Trace timeline" from the outline was not delivered; the lesson's four panes are score / metrics strip / opportunities / diagnostics.

**Debts.**
- GitHub Actions workflow wiring (triggers, runners, pnpm caching, secrets, required status checks, authenticated test user) — explicitly deferred to ch097 L1 (primitives) and ch097 L2 (four-job merge gate). No `.github/workflows/*.yml` was shown; the lesson calls this out as deliberate.
- Authenticated-route Lighthouse (dashboard behind login) — named as a real requirement (two reaches: `puppeteerScript` login or session-cookie injection); implementation deferred to ch097.
- RSC waterfall diagnosis when LCP is slow despite green bundle — forward-pointed to L6 (Sentry trace).
- DB-bound TTFB diagnosis — forward-pointed to L7.
- `assertMatrix` for per-surface budget differentiation — named as a small extension once the basic gate is in place; not built.

**Terminology.**
- **TBT** (Total Blocking Time) — sum of all main-thread blocking periods over 50 ms during page load; the highest-weighted Lighthouse Performance metric (30%); the partial lab proxy for INP (captures input-delay component only). Never quote a TBT number as an INP number.
- **CrUX** (Chrome User Experience Report) — the field-data source aggregating real Chrome user measurements; requires sufficient traffic to populate; pre-launch the CrUX section in PageSpeed Insights is empty — this is expected, not a bug.
- **`@lhci/cli`** — the Lighthouse CI CLI (0.15.x line bundles Lighthouse 12); `lhci autorun` chains healthcheck → collect → assert → upload; exits non-zero on any assertion failure; install as dev dependency.
- **`lighthouserc.json`** — the single config file encoding the gate: `ci.collect` (URLs, `startServerCommand`, `numberOfRuns`), `ci.assert` (preset + per-metric overrides), `ci.upload` (target).
- **`autorun`** — the `lhci` command that chains all phases in sequence; the one command to wire into `package.json` and CI.
- **`temporary-public-storage`** — LHCI's zero-config hosted report target; produces a shareable URL per run; no server setup required.
- **Speed Index** — how quickly the page visually populates during load; 10% weight in the Lighthouse Performance score; minor metric.
- **performance budget** — an assertion in `lighthouserc.json` that caps a resource-class size (e.g. `resource-summary:script:size`); fails CI mechanically when busted; structural protection vs. the aggregate score (which is diagnostic).
- **pre-launch deep pass** — one-off PageSpeed Insights audit of marketing, dashboard, and 2–3 critical screens before ship; no field data yet; lab is the whole picture.
- **recurring CI gate** — `@lhci/cli` on every PR touching UI or dependencies; holds the floor, cannot make the app fast.

**Patterns and best practices.**
- Assert per-metric budgets in `lighthouserc.json`, not the aggregate score. The gate fails when LCP > 2500 ms or JS bytes > cap — not when score wobbles 95 → 93.
- Two audit surfaces cover the two SaaS regimes: marketing page (static, SEO-sensitive) and one authenticated screen (JS-heavy interactive). Audit all others only in the pre-launch deep pass.
- Cheat-sheet thresholds (treat as starting points, tighten quarterly): marketing ≥ 90 Performance / ≤ 2.5 s LCP / ≤ 0.1 CLS / ≤ 200 ms TBT / ≤ 200 KB JS (gzip); dashboard ≥ 85 / ≤ 3.0 s / ≤ 0.1 / ≤ 300 ms / ≤ 350 KB JS. In `lighthouserc.json` scores are 0–1 (0.9 = 90) and sizes are bytes (350 KB = 358400).
- Run Lighthouse only against a `pnpm build` + `pnpm start` production build, never `pnpm dev`. DevTools localhost reads artificially fast — use throttling; treat absolute numbers with suspicion, trust relative movement.
- After launch: field data wins for prioritization, lab data wins for regression detection. Recalibrate CI budgets against historical field data once CrUX populates.
- Read the report in this order: metrics strip (which metric is red?) → opportunities (act here first, ranked by time savings) → diagnostics (structural issues, no time estimate). Score is last — it is diagnostic not actionable.
- Never quote an INP number from a Lighthouse report — there is none. Quote TBT as the pre-launch proxy; go to Speed Insights or DevTools Performance panel for real INP.
- One JS budget is the load-bearing resource budget for a SaaS. Additional per-class budgets (images, fonts, total weight) are optional extensions.

**Misc.**
- No `.github/workflows/*.yml` is present in this lesson; the omission is deliberate and called out explicitly in the lesson prose. Downstream agents reviewing the chapter should not flag it as missing.
- `lighthouserc.json` uses double quotes (JSON) — Biome's single-quote rule applies to TS/JS only, not JSON. The shown config intentionally applies one assertion set to both URLs (both are held to the dashboard's 350 KB budget), which is noted as the teaching simplification; a real config would use `assertMatrix` for per-surface differentiation.
- The four-pane Lighthouse report component in the lesson is a `TabbedContent` fallback (a real screenshot was planned but not captured). Future lessons may reference "the four panes" using the score / metrics / opportunities / diagnostics names.
- The `lighthouserc.json` `startServerCommand: "pnpm start"` assumes a prior `pnpm build`; CI must build before invoking `lhci autorun`.
- The cheat sheet numbers are now the canonical course reference for LCP/CLS/TBT/JS thresholds; the quiz (L8) and the project chapter cite them. Any downstream lesson citing performance thresholds must use these values.

## Lesson 6 — RSC waterfalls and Promise.all

**Taught.** The full RSC waterfall diagnosis-and-fix cycle: reading stacked vs. overlapping spans in a Sentry/Vercel trace; the dependency-check reflex before every `await` in an RSC body; three fix shapes keyed to waterfall kind (co-located `Promise.all`, parent-child `cache()` kick-off / hoist / Suspense siblings, slow+fast streaming variant); the `Promise.all` partial-failure trap and the silent-wrong-data dependency trap; the parallel-await vs. Suspense-streaming decision rule; serialization vs. duplication as orthogonal problems with orthogonal tools; React `cache()` (request-scoped dedup) vs. `'use cache'` directive (cross-request persistence) as distinct caching tools; the N+1 cousin at the component layer; and the connection-pool saturation risk from wide `Promise.all` fan-outs.

**Cut.** The chapter outline cited `unstable_cache` as the request-scope dedup tool — the lesson corrected this to React `cache()` (`unstable_cache` was the legacy name; the course uses `'use cache'` for cross-request persistence). The outline sketched "Mermaid sequence diagram" for the waterfall shape — delivered as HTML+CSS DiagramSequence (bar/Gantt) for visual continuity with the chapter's bar vocabulary. Suspense mechanics and boundary semantics (Unit 4, ch031) were named as out-of-scope; the lesson teaches only the shape and decision, not the how.

**Debts.**
- React `cache()` internals, cache-key rules, and lifecycle — back-referenced to ch036/ch072; this lesson only uses the wrap-and-kick-off pattern.
- `'use cache'` directive mechanics (`cacheLife`, `cacheTag`) — back-referenced to ch032; named only to contrast request-scope vs. cross-request.
- Suspense mechanics, boundary semantics, and fallback behavior — back-referenced to Unit 4 (ch031).
- N+1 SQL fixes (Drizzle relations, joins, `inArray` batching) — deferred to L7; this lesson names it as the component-layer cousin only.
- Connection-pool sizing, `pMap`, and bounded concurrency — explicitly deferred to L7 with a caution callout.
- Sentry trace install and `tracesSampleRate` wiring — back-referenced to ch092.

**Terminology.**
- **RSC waterfall** — sequential awaits in a Server Component tree where later reads have no dependency on earlier ones; visible only on a trace as a descending staircase of spans.
- **trace span** — one timed operation in a distributed trace, with a start time and duration.
- **distributed trace** — the tree of timed spans for one request; sequential spans stack without overlap, parallel spans overlap on the time axis.
- **dependency-check reflex** — before every second `await` in an RSC body, ask "does this read need the value I just awaited?"; no → `Promise.all`; yes → keep sequential (the order is now load-bearing).
- **kick-off pattern** — the parent calls a `cache()`-wrapped read without `await` (fires the promise), so it is already in flight by the time the child component calls `await` on the same cached function; the un-awaited call is intentional and must not be linted away.
- **request-scoped memoization** — React `cache()` behavior: the same function called N times in one render pass runs once; the cache is discarded when the request ends.
- **cross-request persistence** — `'use cache'` directive behavior: the result survives between requests and is reused by future visitors; not the same tool as React `cache()`.
- **Suspense streaming** — wrapping a slow region in `<Suspense>` so fast content paints immediately and the slow region fills in when ready; not a speed-up (the slow fetch is unchanged); moves first paint, not total duration.
- **serialization** (in this context) — independent reads running one after another; fixed by parallelism (`Promise.all` or streaming).
- **duplication** (in this context) — the same read running multiple times in one render; fixed by caching (`cache()`).
- **`fetch()` auto-dedup** — Next.js deduplicates identical GET `fetch()` calls within a render pass automatically; Drizzle `db.query.*` calls are NOT auto-deduped and require explicit `cache()` wrapping.

**Patterns and best practices.**
- Before adding a second `await` in an RSC body, run the dependency check. Independent reads go into `Promise.all`; the sequential form is load-bearing only when a real dependency forces it.
- Wrap Drizzle read helpers in React `cache()` when they are called from multiple components in one render; `fetch()` gets this for free but `db.query.*` does not.
- For parent-child component waterfalls: `cache()` + kick-off is the senior default (preserves co-location, avoids prop-drilling). Hoist-and-pass is acceptable one level deep; prop-drilling through four components is a smell — that is exactly when module-level `cache()` wins.
- Use `Promise.all` when all data must be present before the page is worth painting (transactional pages); use Suspense streaming when partial paint is genuinely useful (independent dashboard widgets).
- Use `Promise.allSettled` instead of `Promise.all` when the page should render what succeeded and degrade the rest; `Promise.all` rejects on the first failure and discards others.
- Under streaming, read first-paint metrics, not the trace "Total" duration — the total spans the slow tail and is misleading.
- Recurring vigilance beat: open one slow trace per week, find the staircase, run the dependency check.

**Misc.**
- The un-awaited `cache()` kick-off call in the parent component looks like a floating-promise lint error; the lesson annotates it explicitly as intentional. Code reviewers and downstream agents must not "fix" it by adding `await` or wrapping in `void`.
- All code in this lesson is fragments (no imports block, no full compilable file) — consistent with the chapter's code-light pattern established in L1–L5.
- Helper names follow conventions: `getOrganization(orgId)`, `listInvoices(orgId, billingPeriod)`, `listTeamMembers(orgId)`, `requireOrgUser()` returns `{ user, orgId, role }`.
- The chapter-outline reference to `unstable_cache` is retired in this lesson; downstream L7, L8, and the project chapter must use React `cache()` for request-scope dedup and `'use cache'` for cross-request persistence — never `unstable_cache`.
- L7 (connection-pool sizing and bounded concurrency) is the explicit continuation point for the pool-saturation caution this lesson plants.

## Lesson 7 — Indexes and N+1 in production

**Taught.** Production-vigilance discipline over two SQL failure classes — missing/wrong index (one fat span) and N+1 (staircase of thin spans) — including the diagnose→fix→confirm loop run as production operation on both, the limit-offset deep-page scan, connection-pool saturation as L6's shifted bottleneck (Neon HTTP-proxy sidestep, WebSocket Pool trade-off, bounded concurrency), the `pg_stat_statements` / Neon Monitoring weekly review cadence, and the pre-launch DB checklist.

**Cut.** No chapter-outline scope was cut that later lessons would depend on. (The stale "Drizzle relations silently N+1 on older versions" watch-out was replaced with the factual Drizzle v2 behavior — lateral joins always emit one statement — which is not a cut but a correction.)

**Debts.**
- Interactive-transaction semantics and isolation levels — named as the reason the WebSocket Pool path exists; mechanics back-referred to ch039 L4 / Unit 5 and not taught here.
- Load-testing tooling depth — "load-test on a Neon branch" named as the way to find the pool ceiling; no harness shown; deferred to ops/deployment context.
- Drizzle index migrations and `CONCURRENTLY` mechanics — the schema declaration (`pgTable` third-arg index array) was shown; the migration that creates it was explicitly deferred to the migrations chapter (ch039 / Unit 5).

**Terminology.**
- **two-class table** — the lesson's spine artifact: a 4-row × 2-column table mapping {production signature, confirming tool, structural fix, where learned} across {missing/wrong index, N+1}; referenced by name throughout the lesson and in the closing checklist.
- **one fat span** — trace signature for a missing/wrong index: a single query span ≥100 ms, caused by a sequential scan reading far more rows than returned.
- **staircase of thin spans** — trace signature for an N+1: many near-identical short spans (sub-ms to ~2 ms), one per row in a parent list.
- **sequential scan** — Postgres reading every row in the table; free at dev scale (50 rows), ruinous at multi-tenant production scale (50k+ rows); confirmed by `Seq Scan` + `Rows Removed by Filter` in `EXPLAIN ANALYZE`. Re-def of ch039 L3 term.
- **composite index** — index on more than one column; leftmost-prefix rule: equality column (`org_id`) first, sort key (`created_at`) next, tiebreaker (`id`) last. The canonical multi-tenant SaaS index name for invoices is `idx_invoices_org_created_at_id`. Re-def of ch039 L1 term.
- **check-per-row N+1** — a permission/scope check that hits the DB once per row, disguised as authorization code; same staircase signature; fix is lifting the check to one query per scope.
- **limit-offset trap** — `LIMIT n OFFSET k` re-scans all skipped rows per page; cost is O(offset), linear-degrading with depth; the trace signature is a slow fat span that worsens the deeper a user pages; even with the right index, the skip is still paid.
- **keyset / cursor pagination** — `WHERE created_at < $cursor ORDER BY created_at DESC, id DESC LIMIT n`; O(limit) regardless of depth; the composite `(org_id, created_at, id)` index from the missing-index fix also powers keyset. Tie-break on `id` required (timestamp collisions).
- **connection pool** — fixed-size set of reusable DB connections; saturated when in-flight queries exceed pool slots; excess queries queue, turning a fast app slow under load. Re-def of ch039 L2 term.
- **Neon HTTP transport** — the serverless driver default: each query is a one-shot HTTP request to Neon's SQL-API proxy, which owns its own pre-warmed pool; the serverless function holds no persistent connection; sidesteps the classic connection-exhaustion problem for non-interactive reads.
- **WebSocket Pool** — node-postgres-compatible transport for interactive transactions (multi-statement BEGIN/COMMIT needing a persistent connection); app holds connections here; pool sizing matters.
- **interactive transaction** — a multi-statement transaction held open across round-trips (BEGIN, statements, COMMIT); requires a persistent connection; cannot use the stateless HTTP path.
- **bounded concurrency** — capping how many async operations run simultaneously (e.g. `pMap` with a concurrency limit) so a single request cannot drain the entire pool; the escape hatch when `Promise.all` over a large list is too wide.
- **`pg_stat_statements`** — Postgres extension recording per-statement execution stats (call counts, total time, mean time); powers the Neon Monitoring query-performance view; data is lost when the Neon compute suspends/scales to zero.
- **`with` over-fetch** — Drizzle relational `with` emits one SQL statement (lateral join + JSON aggregation), but a wide `with` pulling heavy `text`/`jsonb` columns trades N+1 round-trips for a fat-payload query; narrow with a `columns` projection. Inspect the emitted SQL via `.toSQL()` or the dev query log.

**Patterns and best practices.**
- Read the trace shape first (one fat span vs. staircase); the shape names the class; the class names the fix. Never open a query plan before identifying the class.
- The composite `(org_id, created_at DESC, id DESC)` index is the load-bearing multi-tenant index — every tenant-scoped list query has this shape; it also powers keyset pagination.
- Confirm every index fix with `EXPLAIN ANALYZE` — the plan must flip from `Seq Scan` to `Index Scan`; never ship an index on faith.
- Drizzle `with: { relation: { columns: { … } } }` always emits one statement in v2; the "relations silently N+1" fear is dead. Use a `columns` projection to avoid over-fetching heavy columns.
- Prefer the Neon HTTP transport for one-shot reads (default); reserve the WebSocket Pool for interactive transactions only; size that pool against load-tested concurrency.
- When `Promise.all` fan-out is too wide for the WebSocket pool, apply bounded concurrency (e.g. `pMap` with a limit) rather than serializing the calls.
- Weekly recurring cadence: eyeball the top-3 slowest queries on the Neon Monitoring page; if one is a regression, run `EXPLAIN ANALYZE`, route through the two-class table.
- Pre-launch DB checklist (one-off): (1) `EXPLAIN ANALYZE` the five most-frequent queries on a production-shaped branch; (2) composite `(org_id, …)` index on every org-scoped table; (3) every FK column indexed; (4) every large list uses keyset, not deep offset; (5) transport/pool sizing matches concurrency; (6) Neon monitoring bookmarked / slow-query alert set.

**Misc.**
- All code is fragments (no imports, no full files) — consistent with the chapter's code-light pattern.
- The Drizzle index declaration uses the third-argument array form; the canonical index name `idx_invoices_org_created_at_id` matches ch039 L1 exactly — downstream agents must not rename it.
- The chapter-outline watch-out "Drizzle relations silently N+1 on older versions" is retired; the correct statement is that Drizzle relational queries v2 always emit one SQL statement. Downstream lessons must use this framing.
- `pg_stat_statements` data resets on Neon compute suspend/scale-to-zero — a real operational trap; warn students to review against a warm compute or accept window resets.
- This is the chapter's final lesson; there are no forward debts within ch094. The project chapter (ch095) is the next consumer of this chapter's content.

# Chapter 094 — Performance vigilance

## Chapter framing

Chapter 094 closes Unit 19 by turning the observability work of chapter 092 (Sentry + structured logs) and chapter 093 (Speed Insights + PostHog) into a *vigilance discipline*: a small set of recurring checks and irreversible defaults that keep the app fast as it grows. The student arrives with Speed Insights streaming real-user Vitals from lesson 1 of chapter 093, `next/image` introduced as the only image primitive in lesson 2 of chapter 034, `Promise.all` as the sequential-vs-parallel decision from lesson 3 of chapter 007, N+1 cataloged at the Drizzle layer in lesson 2 of chapter 039, and `EXPLAIN ANALYZE` from lesson 3 of chapter 039. None of those get re-taught; this chapter binds them into the performance-vigilance pattern (SaaS pattern #15) and adds Core Web Vitals as the canonical metric set, two audit tools (`@next/bundle-analyzer` and Lighthouse), and the RSC waterfall trap that the Server Component thread finally cashes in on.

Threads through every lesson. **Field data is the source of truth, lab data is the regression catcher** — Speed Insights for verdict, Lighthouse for pre-deploy gate. **Defaults before audits** — the structural fixes (`next/image`, parallel awaits, indexes) move the metric; the audit tools surface where the default leaked. **Each metric has a primary cause and a primary fix** — LCP hero image + font, INP main-thread JS, CLS unsized media. **Vigilance is recurring** — pre-launch deep pass, CI regression gate, weekly slow-query review. Every lesson ties back to a senior question — "why did LCP regress?", "why does this dashboard feel slow with fast fetches?", "why did the bundle grow 200KB?" — so the discipline reads as the answer to a known cost.

---

## Lesson 1 — The Core Web Vitals

Definitions of LCP, INP, and CLS, their p75 thresholds, the primary cause and one structural reach for each, and the field-data-versus-lab-data discipline that anchors the chapter.

Topics to cover:

- **The senior question.** Production traffic is live; Speed Insights is reporting numbers. Three Vitals matter for Search, conversion, and trust: LCP, INP, CLS. The lesson installs what each measures, the 75th-percentile thresholds Google scores against, the primary cause for each, and the one structural reach that moves the metric in a SaaS context.
- **The 75th-percentile rule and the three thresholds.** Each Vital is scored at p75 of real production traffic over a 28-day rolling window — "75% of users see at least this experience." Thresholds: LCP ≤ chapter 009s good, INP ≤ 200ms good, CLS ≤ 0.1 good. Speed Insights surfaces all three against these bands.
- **LCP — what it measures.** Render time of the largest visible content element in the initial viewport — typically the hero image, the first card, the headline. Dominated by network: HTML fetch, LCP element discovery, element bytes, paint. Primary cause in a Next.js SaaS: hero image without `priority`, font without `next/font`, server component blocked on a slow upstream.
- **The one structural reach for LCP.** `next/image` with `priority` on the LCP element (lesson 2 of chapter 094), `next/font` for the primary typeface (lesson 4 of chapter 034), and data-fetch off the critical path (lesson 6 of chapter 094).
- **INP — what it measures.** Latency of user interactions over the visit (p98 of the page's interactions). Bottleneck is main-thread JS: heavy client component re-rendering, synchronous `JSON.parse` of a large payload, third-party script blocking the event loop. INP replaced FID in March 2024 because FID only measured the first interaction.
- **The one structural reach for INP.** Less client JavaScript — server components do the work the client used to. `'use client'` on the leaves only. Conditional reaches: code-split heavy interactive widgets with `dynamic()`, debounce high-frequency handlers, Web Worker for heavy synchronous work. Diagnostic surface: Chrome DevTools Performance panel with the INP overlay.
- **CLS — what it measures.** Cumulative score of unexpected layout shifts during the page's lifetime — hero image loading and pushing the headline, late banner shoving content, font swap. Each shift contributes impact-fraction × distance-fraction; the score sums.
- **The one structural reach for CLS.** Reserve space for every dynamic element. `next/image` requires `width`/`height` (or sized `fill`). `next/font` ships `font-display: optional` plus fallback metrics. Skeletons match resolved content dimensions. Modals/toasts use `position: fixed`. CLS is the cheapest to fix structurally and the most embarrassing to leave broken.
- **Field-data vs. lab-data — the load-bearing rule.** Speed Insights reports real users from production — what Google Search uses, the truth. Lighthouse runs synthetically on a simulated network — the regression catcher, not the verdict. Chase Speed Insights; use Lighthouse to catch regressions before they ship.
- **Supporting cast — TTFB and FCP.** Not Vitals but Speed Insights reports them; the upstream causes when LCP is bad. TTFB high → server slow (Lessons lesson 6 of chapter 094 or lesson 7 of chapter 094). FCP high but LCP close → LCP element is the bottleneck (lesson 2 of chapter 094).
- **The 28-day window cadence.** Field data is rolling 28 days — a regression won't move the score for a week or two. The implication: regression detection happens before deploy (Lighthouse in CI, lesson 5 of chapter 094) or by alerting on the perf events. The window is a stability feature; not for catching same-day regressions.
- **The chapter map.** lesson 2 of chapter 094 → LCP. lesson 3 of chapter 094 and lesson 4 of chapter 094 → INP via bundle weight. lesson 5 of chapter 094 → all three via pre-launch gate. lesson 6 of chapter 094 → TTFB therefore LCP. lesson 7 of chapter 094 → TTFB upstream.
- **Watch-outs.** Chasing Lighthouse while field data shows the opposite; reporting Vitals from a single fast device — p75 is mostly mobile on flaky networks; treating CLS as cosmetic — a shifting page mis-fires conversion clicks; assuming FID is still the metric (it's not since March 2024); assuming a "good" today is forever — Google has tightened thresholds twice in five years.

What this lesson does not cover:

- Image priority — lesson 2 of chapter 094.
- Bundle analysis — Lessons lesson 3 of chapter 094 and lesson 4 of chapter 094.
- Lighthouse in CI — lesson 5 of chapter 094.
- RSC waterfalls — lesson 6 of chapter 094.
- DB perf — lesson 7 of chapter 094.
- Speed Insights install — lesson 1 of chapter 093.

Estimated student time: 30 to 40 minutes. Concept archetype; the three definitions plus the one-structural-reach mapping is the load-bearing content.

---

## Lesson 2 — priority on the LCP element

How `next/image`'s `priority` prop preloads the LCP element, which exact image gets it, and the ESLint-enforced ban on raw `<img>` that keeps CLS and lazy-loading defaults in place.

Topics to cover:

- **The senior question.** LCP on the marketing page is chapter 015s — over the chapter 009s threshold. The hero image is the LCP element. The team needs the hint that tells the browser to fetch it immediately. The lesson revisits `next/image` from lesson 2 of chapter 034 through the LCP-vigilance lens: the `priority` prop, the `fetchPriority` hint it generates, and the structural ban on `<img>`.
- **What `priority` does.** Disables lazy loading, emits `fetchpriority="high"`, adds the image to the preload list the browser fetches during document parse. The LCP element's fetch starts at the same moment as the CSS and JS bundle; without `priority`, the browser doesn't discover it until layout, adding 200–600ms to LCP on real connections.
- **Which images get `priority`.** Exactly the LCP element, no more. Other above-the-fold images stay default-lazy. Below-the-fold stays lazy. One `priority` per page; two splits the browser's high-priority budget and neither lands faster.
- **Identifying the LCP element.** Chrome DevTools Performance panel records an LCP marker pointing at the element. PageSpeed Insights highlights it in the field-data preview. Pick the candidate at build time, verify with DevTools after the build.
- **The structural ban on `<img>`.** Raw `<img>` ships without lazy loading (in many cases), without responsive `srcset`, without `width`/`height` (causing CLS), without Vercel's optimization pipeline. The ban is the `@next/next/no-img-element` ESLint rule at error, no exceptions in feature code. One carve-out: `<img>` inside MDX content, where the renderer maps to `next/image` at compile time.
- **Required props (revisited from lesson 2 of chapter 034).** `src`, `alt`, `width`+`height` *or* `fill` with sized container. New-in-16 `qualities` config requirement. The `sizes` prop on responsive images — without it the browser fetches the largest variant, doubling LCP bytes.
- **`placeholder` and CLS.** `placeholder="blur"` paints a low-quality preview immediately, keeping the box reserved and perceived load fast. The CLS protection is `width`/`height`, not the blur — blur is UX polish.
- **Remote images and `remotePatterns`.** When the image comes from a CDN (Stripe, Cloudinary, R2), `next.config.ts`'s `images.remotePatterns` allows optimization. Without the allow-list the image renders unoptimized (or fails in Next.js 16).
- **`decoding` and `loading` — what `next/image` chooses.** For `priority`: `decoding="sync"`, `loading="eager"`. Default: `decoding="async"`, `loading="lazy"`. The student doesn't set these; the lesson names them so DevTools Elements is readable.
- **Opt out — `unoptimized`.** Some sources (external avatars, animated SVGs) shouldn't pass through optimization. Reach for `unoptimized` on the rare element, not as a global.
- **Verifying in production.** Speed Insights' LCP panel shows the per-route metric. After landing `priority`, lab LCP drops immediately, field LCP lags the 28-day window. Network panel: LCP image appears as Initiator "Parser" with high-priority hint, fetched within ~200ms.
- **Watch-outs.** `priority` on every above-the-fold image — budget splits, no image gets the boost; missing `width`/`height` on remote — CLS even with `priority`; `sizes="100vw"` on a small image — fetches the largest variant; raw `<img>` in MDX — ESLint plus MDX mapping catches it; `unoptimized` on the marketing hero — defeats the very tactic; `placeholder="blur"` without dimensions — blur paints wrong size, shift still fires; Vercel image-optimization quota — on heavy-traffic marketing pages, watch it.

What this lesson does not cover:

- `next/image` first install and `remotePatterns` — lesson 2 of chapter 034.
- `next/font` — lesson 4 of chapter 034.
- R2 hosting — Chapter 068.
- LCP measurement methodology — lesson 1 of chapter 094.

Estimated student time: 25 to 35 minutes. Mechanics archetype; the `priority` rule plus the ESLint structural protection is the load-bearing content.

---

## Lesson 3 — The barrel-export trap

Why barrel re-exports defeat tree-shaking, the lucide-react case study, and `optimizePackageImports` plus `sideEffects: false` as the modern fix that keeps imports readable while shipping per-export shape.

Topics to cover:

- **The senior question.** The bundle grew 300KB since the last release. The PR diff doesn't show new heavy deps. The culprit: `import { Pencil } from 'lucide-react'`, the barrel pulled the whole library before tree-shaking caught up. The lesson installs the per-icon import discipline, names Next.js's `optimizePackageImports` as the modern equivalent that lets the team write the barrel form and ship the per-icon shape.
- **What a barrel export is.** A package's `index.ts` re-exporting every named export. `import { Pencil } from 'lucide-react'` resolves to the barrel; bundlers must follow each re-export. Tree-shaking works on per-export paths; dynamic re-exports, module-level side-effects, and CommonJS interop defeat it. Result: many libraries drag the entire package even when one symbol was used.
- **The lucide-react case — 1500 icons.** Without optimization, `import { Pencil } from 'lucide-react'` pulls roughly 1500 icon modules. The analyzer (lesson 4 of chapter 094) catches it; the student sees a 600KB `lucide-react` chunk where actual icons used would total under 30KB.
- **The two reaches — per-icon import and `optimizePackageImports`.** **Per-icon**: `import Pencil from 'lucide-react/icons/pencil'`, direct deep-import, no barrel, ~1KB per icon; works without config; verbose at the import site; requires the library to expose typed deep paths (lucide-react does). **`optimizePackageImports`**: in `next.config.ts`, list packages — Next.js transforms barrel imports into per-export deep imports at build. The team writes the readable form, the build ships the lean form. Course default in 2026: `optimizePackageImports` over per-icon.
- **The auto-list in Next.js 16.** Next.js maintains an internal list that gets the transform automatically (`lucide-react`, `date-fns`, `lodash-es`, `@mui/icons-material`, others). The team's reach is to add the libraries Next.js doesn't already cover — typically internal monorepo packages or niche third-party icon sets.
- **The internal monorepo barrel.** A SaaS often has an internal `ui` package with a barrel `index.ts`. Same trap. Fixes mirror third-party: slim re-export-only `index.ts`, `"sideEffects": false` in the package's `package.json`, add the package name to `optimizePackageImports`.
- **`sideEffects: false` — the structural enabler.** Bundlers tree-shake aggressively when the package declares no module-level side effects. Without the flag, bundlers conservatively keep every import. The structural protection inside the team's own packages.
- **Decision frame.** Default: write `import { X } from 'package'` and let `optimizePackageImports` handle it. Library not on auto-list: add it. Library doesn't expose typed deep paths: per-icon unavailable; rely on the optimization or accept the cost. Internal package: `sideEffects: false` plus add.
- **The barrel trap beyond icons.** `date-fns` is the canonical second example — same `optimizePackageImports` reach. Lodash → `lodash-es` plus the same protections. Radix UI ships per-component packages (`@radix-ui/react-dialog`), preventing the trap structurally.
- **Verifying — bridge to lesson 4 of chapter 094.** After applying `optimizePackageImports`, run `@next/bundle-analyzer`; the lucide chunk drops from ~600KB to ~30KB. Without the analyzer, the fix is unverified.
- **Watch-outs.** Assuming barrels "just tree-shake" — many don't, especially CommonJS interop; trusting an icon library without deep-import paths — only the optimization works; mixing per-icon deep imports with `{ ... }` barrel imports — the barrel still loads for the latter; forgetting `sideEffects: false` on the internal `ui` package; `optimizePackageImports` isn't free — longer build, trade-off bundle size for build time; dev bundle stays huge — optimization runs in production by default; `experimental.optimizePackageImports` graduating to stable — track release notes; pulling a deep import the library doesn't consider public API — semver risk.

What this lesson does not cover:

- The bundle analyzer — lesson 4 of chapter 094.
- Image bundle weight — lesson 2 of chapter 094.
- `dynamic()` code-splitting — Unit 3.
- `'use client'` boundary — Unit 4.

Estimated student time: 25 to 35 minutes. Mechanics-and-decision; `optimizePackageImports` plus `sideEffects` is the load-bearing content.

---

## Lesson 4 — Reading the bundle treemap

Installing `@next/bundle-analyzer`, the four scan passes for reading its treemap (biggest tile, per-route chunks, duplicates, shared chunk), and the triage decision tree from finding to fix.

Topics to cover:

- **The senior question.** The team suspects the bundle is bloated — INP is rising, build size is up — but doesn't know which dependency is the culprit. The reach is a visual treemap of the production bundle. The lesson installs `@next/bundle-analyzer` (Turbopack-compatible build for Next.js chapter 076+), walks the treemap reading, ties findings to fixes from lesson 2 of chapter 094 and lesson 3 of chapter 094.
- **What it produces.** Two HTML treemaps per build: `client.html` (the JS shipped to the browser, the one that matters for INP) and `server.html` (Node bundle, useful for cold-start size). Each is a route → chunk → module hierarchy, tiles sized by gzipped bytes.
- **Install.** `pnpm add -D @next/bundle-analyzer`. Wrap the `next.config.ts` export with the HOF gated by `ANALYZE=true`. Run `ANALYZE=true pnpm build`. HTML files land in `.next/analyze/` and open in the default browser.
- **Next.js chapter 076 built-in.** Next.js chapter 076 ships an experimental built-in bundle analyzer that works with Turbopack (flag name pending, check release notes). Interactive UI. Course default in 2026: prefer the built-in once stable, fall back to `@next/bundle-analyzer` for the established workflow.
- **The four scan passes.** **(1) Biggest tile** — expected (framework runtime) or surprise (a date library, unused chart library pulled via barrel)? **(2) Per-route chunks** — large per-route means a heavy client component on the route's leaves; code-split or lift work server-side. **(3) Duplicate dependencies** — same library under multiple chunks means two versions in `node_modules` (peer-dep mismatch); fix at the package manager. **(4) Shared chunk** — should be near-constant; if it grew, a new heavy library landed on every page via a global provider.
- **Triage decision tree.** Surprise dep → remove or replace. Heavy per-route chunk → `dynamic(() => import('...'), { ssr: false })` for client-interactive below-fold, or move work server-side. Duplicate dep → `pnpm dedupe` plus peer-dep audit. Barrel-bloat → `optimizePackageImports` (lesson 3 of chapter 094).
- **The "First Load JS" report from `next build`.** Before opening the analyzer, `next build` prints a per-route table with "First Load JS" — bytes shipped before interaction. Routes over ~150KB gzipped (rough 2026 threshold for mobile INP under 200ms on a slow connection) get the analyzer treatment. The build report is the smell test; the analyzer is the diagnosis.
- **CI artifact pattern.** Produce the analyzer HTML in CI on dep- or route-touching PRs, upload as workflow artifact, reviewer eyeballs the diff against `main` (CI workflow primitives: lesson 1 of chapter 097). No bot needed — habit plus PR-template checklist line covers the regression class. `hashicorp/nextjs-bundle-analysis` exists for the formal version; named once.
- **What the analyzer can't show.** Run-time work (heavy `JSON.parse`, synchronous loop in a click handler) — bundle is small but INP is bad. DevTools Performance panel is that surface; the analyzer is pure static-bytes.
- **Third-party scripts don't show.** `<script>` via `next/script` isn't bundled. Network panel shows it. Heavy third-parties (Intercom, Segment) often beat the team's own code on weight; gate through consent and `lazyOnload`.
- **Watch-outs.** Reading without `ANALYZE=true` — dev bundles, useless; assuming parsed size is what ships — read gzipped column; treemap missing dynamic imports — they show as their own chunk; once-and-done audit — bundles drift, run per dep-change PR; treating framework runtime as the optimization target — it's the floor; the experimental built-in's flag name changing between minors — check release notes.

What this lesson does not cover:

- Lighthouse — lesson 5 of chapter 094.
- Icon bundle tactics — lesson 3 of chapter 094.
- Image optimization — lesson 2 of chapter 094.
- `dynamic()` at depth — Unit 3.
- Server-bundle size — out of scope; Vercel function size is the surface.

Estimated student time: 35 to 45 minutes. Tooling-and-decision; four scan passes plus triage tree is the load-bearing content.

---

## Lesson 5 — Lighthouse as the pre-launch gate

The two pre-launch audit surfaces (marketing page and one authenticated screen), `@lhci/cli` as the CI regression gate with performance budgets, and the threshold cheat sheet that calibrates lab scores against field data.

Topics to cover:

- **The senior question.** The product ships in two weeks. The team needs a structural gate that catches regressions before production, plus a one-off pre-launch deep audit of high-traffic pages. The reach is Lighthouse — run against the marketing page and one critical authenticated screen, scoring against the Vitals from lesson 1 of chapter 094. The lesson installs the pre-launch audit, the CI regression gate (`@lhci/cli`), and the lab-vs-field discipline.
- **What Lighthouse does.** Full page load in a controlled environment — simulated Slow 4G, mid-tier mobile CPU, no extensions, no caching — reports synthetic LCP, INP (estimated, approximate), CLS, plus accessibility, SEO, best-practices audits. Does *not* measure real users; that's Speed Insights from lesson 1 of chapter 093. Lighthouse is the regression catcher and pre-launch deep dive; Speed Insights is the production verdict.
- **Two pre-launch surfaces.** **(1) Marketing page** — high-traffic, SEO-sensitive, first impression. Score 90+ Performance, 95+ a11y/SEO/Best-Practices. **(2) One authenticated critical screen** — typically the dashboard home or primary task screen. Score 85+ Performance (more JS), the rest same. Two pages is enough; patterns repeat.
- **Three reaches to run Lighthouse.** **DevTools** — quick ad-hoc daily diagnostic. **PageSpeed Insights** — hosted Lighthouse plus CrUX field overlay; the pre-launch reach for the marketing page since it ties lab and field. **`@lhci/cli`** — the CI reach; runs against a built app, asserts thresholds, fails the build. Course default for the gate.
- **`@lhci/cli` install for CI.** `pnpm add -D @lhci/cli`. A `lighthouserc.json` defines URLs, assertions (per-metric thresholds), upload target. (GitHub Actions primitives — workflow/job/step, triggers, caching, permissions — are owned by lesson 1 of chapter 097; this lesson treats the LHCI CI wiring as a forward-named pattern.) GitHub Actions workflow builds, starts `pnpm start`, runs `lhci autorun`, fails if thresholds aren't met. Run on PRs touching UI/deps, against marketing route plus one authenticated route (test user via headless auth). Discipline is the assertions, not the score — fail when LCP regresses past chapter 009s lab, not when score moves 95 → 93.
- **Performance budgets — the structural version.** `@lhci/cli`'s `assertions` block supports `performance-budget` and `timing-budget` — asserts against JS bundle size, image size, font size, total page weight, LCP, FCP, TTI. Pick one budget per resource class. PR busts the budget → CI fails. Budget is structural protection; score is diagnostic.
- **Threshold cheat sheet for SaaS in 2026.** Marketing: Perf ≥ 90, LCP ≤ chapter 009s lab, CLS ≤ 0.1, total JS ≤ 200KB gzipped. Authenticated dashboard: Perf ≥ 85, LCP ≤ 3.0s lab, CLS ≤ 0.1, total JS ≤ 350KB gzipped. Starting points; tighten quarterly.
- **A11y and SEO bonus.** Lighthouse catches structural a11y gaps (missing alt, labels, contrast, landmarks), meta-tag SEO basics, HTTPS/mixed-content best-practices. Not taught at depth here (Unit 3 owns a11y, lesson 7 of chapter 034 owns SEO); the audit surfaces gaps cheaply.
- **One-off vs. recurring.** **Pre-launch one-off**: PageSpeed Insights against marketing, dashboard, 2–3 other critical screens; triage findings (lesson 4 of chapter 094 bundle, lesson 2 of chapter 094 images, lesson 6 of chapter 094 waterfalls, lesson 7 of chapter 094 DB); ship fixes; re-audit. **Recurring CI gate**: `@lhci/cli` on PRs against two routes with budgets. Gate is the floor; one-off is the deep dive.
- **Reading the report — four scan passes.** **Performance score** is weighted aggregate; diagnostic value is in the per-metric breakdown. **Opportunities** lists biggest wins by estimated time savings — image size, render-blocking resources, unused CSS/JS. **Diagnostics** lists structural issues without time estimates — DOM size, console errors, long main-thread tasks. **Trace timeline** shows the load frame-by-frame with LCP and shift sources marked. Act on Opportunities first.
- **Lighthouse-vs-field-data calibration.** Lighthouse simulates a fixed profile; Speed Insights aggregates real users. When they disagree, field data wins for prioritization, lab data wins for regression detection. CI gate thresholds are calibrated against historical field data, not vanity scores.
- **Watch-outs.** Chasing 100 — diminishing returns, doesn't move the needle for users on flaky networks; running against `pnpm dev` — unoptimized, meaningless; localhost on fast loopback — every metric artificially good; auth flow — needs `puppeteerScript` or session-cookie injection; running on every commit — audit takes 30–90s per route; budgets too tight at launch — team red-locks itself out; INP estimate is approximate — for real INP use Speed Insights or DevTools; ignoring a11y because users don't complain — they leave instead.

What this lesson does not cover:

- Speed Insights setup — lesson 1 of chapter 093.
- Vitals definitions — lesson 1 of chapter 094.
- Sentry performance traces — Chapter 092.
- A11y at depth — Unit 3.
- SEO at depth — lesson 7 of chapter 034.

Estimated student time: 40 to 50 minutes. Tooling-and-discipline; CI gate plus threshold cheat sheet plus pre-launch walk is the load-bearing content.

---

## Lesson 6 — RSC waterfalls and Promise.all

Diagnosing sequential parent-then-child awaits in a Sentry trace, the dependency-check reflex before adding a second `await`, and the `Promise.all` rewrite (with Suspense streaming as a sibling reach) that turns serial waits into parallel ones.

Topics to cover:

- **The senior question.** The dashboard renders in chapter 004s. Every DB query in the trace is under 80ms. No slow upstream. The waterfall view in Sentry's trace tells the story: the page awaited user, then org, then invoices, then team members — four sequential awaits when three had no dependency. The lesson installs the RSC-side N+1 cousin: parent-then-child sequential awaits compounding latency, and the `Promise.all` rewrite.
- **Why this is the chapter's load-bearing server-side lesson.** The Server Components thread from Unit 3 onward lets the student write data-fetching co-located with the consumer. The trap: a component awaits one fetch, then later awaits a second that doesn't depend on the first. The waterfall is the framework's natural shape unless the author thinks about parallelism — and unless the author can see the trace.
- **The trace is the gateway.** Without a waterfall view (Sentry or Vercel observability), the bug is invisible. The student sees a slow page, profiles the DB in isolation, finds nothing. The trace shows four sequential spans; the cause is obvious from the picture. Trace is the diagnostic surface; `Promise.all` is the fix shape.
- **The shape of a waterfall.** Conceptual prose with an inline mermaid sequence diagram. Four sequential awaits at 80ms each = 320ms when one round (80ms) was achievable. Dependency graph: `org` depends on `user.orgId`; `invoices` and `team` both depend on `org.id` but not on each other — they could fire in parallel.
- **The `Promise.all` rewrite.** Once `org` resolves, `invoices` and `team` start as separate promises awaited together: `const [invoices, team] = await Promise.all([getInvoices(org.id), getTeamMembers(org.id)])`. Three serial waits become two: 80 + 80 + max(80, 80) = 240ms. The saving repeats per render; compounds under load.
- **The dependency-check reflex.** lesson 3 of chapter 007 introduced sequential-vs-parallel as a JS pattern. This lesson cashes in: before adding a second `await` in an RSC, ask "does this depend on what I just awaited?" If yes, sequential. If no, `Promise.all`.
- **Parent-child component waterfalls.** When the parent fetches, renders children, and each child fetches its own, awaits become sequential not from dependencies but because rendering is sequential. Fix: hoist the fetch to the parent, pass data down. Or: split children into Suspense boundaries with `Promise.all` at the parent and individual `<Suspense>` wrappers letting the page stream resolved bits. Primary reach: hoist + pass. Secondary: Suspense streaming when sizes differ wildly.
- **Suspense-streaming variant.** When one fetch is slow (analytics aggregation, 800ms) and another fast (user profile, 50ms), wrapping the slow one in `<Suspense>` lets fast content paint immediately and slow content stream when ready. Decision: parallel-await when all must complete before paint (transactional page); Suspense streaming when partial paint is acceptable (dashboard widgets). Both depend on reading the dependency graph.
- **Server-side caching as the upstream fix.** When the same fetch happens across many pages (user, org), React `cache()` and Next.js's `unstable_cache` (Chapter 032 / chapter 072) dedup at request scope. Parallel awaits remove serialization; caching removes duplication.
- **The N+1 cousin.** lesson 2 of chapter 039 owns N+1 at the Drizzle layer (the list loop). This lesson's RSC waterfall is the same shape at the component layer: list renders, each child component awaits its own fetch, DB sees N queries serial. Fix shape is identical: hoist, batch with join or `whereIn`, pass down. lesson 7 of chapter 094 owns the SQL side; this owns the component side.
- **Trace-reading discipline.** Sentry (or Vercel) trace shows spans with start times and durations. Sequential spans stack top-to-bottom; parallel spans overlap. Skill: open the trace on the slow page, find sequential spans without a data dependency, rewrite. Recurring vigilance: one slow trace per week.
- **Watch-outs.** `Promise.all` with one rejection — all promises continue, rejected one wins, others wasted; use `Promise.allSettled` when cost matters; parallel queries saturating the connection pool; missing a real dependency — `Promise.all` over two queries where one needed the other silently shapes wrong data; hoisting then prop-drilling deeply — `cache()` at module level avoids the drill; `<Suspense>` isn't a speed-up — it streams, the slow fetch is still slow; trace "Total" misleading when streaming; third-party SDK fetch unprotected — 5s timeout cascades; missing the automatic `fetch()` dedup that doesn't apply to `db.select()`; treating "co-location is the React way" as license to skip the rewrite — co-location plus `cache()` plus parallel awaits is the synthesis.

What this lesson does not cover:

- React `cache()` mechanics — Chapters 036 and chapter 072.
- N+1 at Drizzle — Lessons lesson 2 of chapter 039 and lesson 7 of chapter 094.
- Suspense depth — Unit 3.
- Trace install — Chapter 092.
- Server Actions — Unit 6.

Estimated student time: 40 to 50 minutes. Pattern; waterfall diagnosis plus `Promise.all` rewrite plus parent-child hoist is the load-bearing content.

---

## Lesson 7 — Indexes and N+1 in production

Revisiting the two SQL failure classes at production scale: missing composite `(org_id, ...)` indexes diagnosed via `EXPLAIN ANALYZE`, N+1 fixed with Drizzle relations or joins, plus the pre-launch DB checklist and weekly slow-query review.

Topics to cover:

- **The senior question.** Production traces show one consistently slow page: the org invoice list. `EXPLAIN ANALYZE` shows a sequential scan; adding the composite `(org_id, created_at)` index drops the query from 280ms to 4ms. Separately, the audit log page shows a different shape: 50 fast queries instead of one. The lesson re-visits indexes from lesson 1 of chapter 039 and N+1 from lesson 2 of chapter 039 through the production-vigilance lens.
- **Two SQL perf failure classes at scale.** **Missing index** — one query scans more rows than it should; surfaces as one slow span. **N+1** — many small queries when one would do; surfaces as many small spans. Both are visible in traces; both have structural fixes that hold past launch.
- **Index hit — re-frame from lesson 1 of chapter 039.** Every regular query touches one of three filter shapes: by PK, by FK + scope (`where org_id = $1 and ...`), by recency (`order by created_at desc limit ...`). PK is automatic; FK on `org_id` is load-bearing for multi-tenant SaaS — composite `(org_id, created_at)` serves the list view; partial indexes on hot selective filters; unique indexes for upsert paths. lesson 1 of chapter 039 owns the depth.
- **Reading `EXPLAIN ANALYZE` for production — re-frame from lesson 3 of chapter 039.** Two markers: **Seq Scan** on a hot query over 10k+ rows → index missing or planner ignored one (often not selective enough); **Rows Removed by Filter** vastly larger than rows returned → index narrowed by some columns but predicate has more, tighten the composite. Run once on the production-slow query, fix structurally, move on.
- **The Drizzle thread on N+1.** lesson 2 of chapter 039 named it; this lesson surfaces production shapes. **List-with-children**: invoice list each needing customer name — naive code fires one query per row; fix with `innerJoin` or the Drizzle relations API (`with: { customer: true }`). **Aggregation-per-row**: each invoice needs line-item count; fix with window function or left join + group-by. **Check-per-row**: each invoice needs a permission check; lift to a single query per scope.
- **Drizzle relations as the structural fix.** `db.query.invoices.findMany({ with: { customer: true, lineItems: { columns: { id: true, amount: true } } } })` generates one query with joins; team writes the relation tree, Drizzle plans the SQL. Discipline: prefer relations for any list-with-children read; raw builder for cases the relation tree can't express.
- **Pagination and the limit-offset trap.** Limit-offset scans (offset + limit) rows on every page — page 100 scans 1000+ rows for a 10-row result. Cursor pagination (lesson 4 of chapter 033) avoids it: `where created_at < $cursor order by ... limit 10`. With the right index, O(limit) regardless of depth.
- **Connection-pool saturation — the shifted bottleneck.** A `Promise.all` fan-out (lesson 6 of chapter 094's fix) plus a small pool can saturate Postgres. Neon's serverless driver uses HTTP, sidestepping the persistent-connection cost; classic `pg` plus PgBouncer is the alternative. Surface so the student doesn't accept the new failure mode silently.
- **The hot-query monitoring surface.** Neon's dashboard surfaces top-N slowest queries over a window. Weekly vigilance: eyeball the top three; if any is a regression, open `EXPLAIN ANALYZE` and reach for index or relation fix. Discipline is the weekly check, not a one-shot.
- **In scope vs. out of scope.** In scope: the production-vigilance shape over existing primitives. Out: re-teaching index types, query builder depth, transactions, isolation levels (Unit 5 owns those).
- **Pre-launch DB pass — the checklist.** Before launch: `EXPLAIN ANALYZE` on the five most-frequent queries (list of primary entity, detail, dashboard aggregation, search, login); verify composite indexes on org-scoped tables; check pool sizing against expected traffic; set up Neon slow-query alert. Five queries plus four structural checks pre-launch; weekly check thereafter.
- **Watch-outs.** Indexing without measuring — every index slows writes; missing the composite on `(org_id, ...)` — per-row scan that surfaces only at multi-tenant scale; `findMany` with `with` fetching heavy text columns — select specific columns; Drizzle relations silently N+1 on older versions — verify with `db.toSQL()` or Neon log; partial indexes drifting as filter values change — re-audit on new status enums; dev DB doesn't match production statistics — run plans on a production-shaped branch; cursor pagination `created_at` collisions — break ties with secondary `id`; connection-pool failure hidden until traffic doubles — load-test on a Neon branch; relations API picking a bad plan — fall back to hand-written `sql`.

What this lesson does not cover:

- Index types and `EXPLAIN ANALYZE` depth — Chapter 039.
- Drizzle relations API depth — Chapter 038.
- N+1 introduction — lesson 2 of chapter 039.
- Cursor pagination shape — lesson 4 of chapter 033 and Unit 10.
- Neon driver — Chapter 036.
- Multi-tenancy filter discipline — Unit 9.

Estimated student time: 35 to 45 minutes. Pattern-revisit; production-vigilance reach over existing primitives plus the pre-launch checklist is the load-bearing content.

---

## Lesson 8 — Quizz

Top 10 topics to quiz:

- The three Core Web Vitals, what each measures, the p75 threshold; field-data vs. lab-data and which is the ground truth for Search.
- `next/image` `priority` on the LCP element exactly once per page; the structural ESLint ban on `<img>`; `width`/`height` as the CLS protection.
- The barrel-export trap; `optimizePackageImports` as the modern default; `sideEffects: false` on internal packages.
- `@next/bundle-analyzer` and the four scan passes (biggest tile, per-route, duplicates, shared chunk); the triage decision tree.
- Pre-launch surfaces (marketing page + one authenticated screen), the threshold cheat sheet, `@lhci/cli` as the CI regression gate with performance budgets.
- Lighthouse-vs-field-data calibration — Lighthouse for regressions, Speed Insights for verdict; never chase the score in isolation.
- RSC waterfalls — sequential parent-then-child compounding latency; the dependency-check reflex; the `Promise.all` rewrite when no dependency exists.
- Suspense-streaming when one fetch is slow; the hoist-to-parent fix for child fan-outs.
- DB production vigilance — index-hit cheat sheet for the three filter shapes, the composite `(org_id, ...)` for multi-tenant tables, N+1 fixes via Drizzle relations or joins.
- Pre-launch pass vs. recurring vigilance — what runs once (Lighthouse deep audit, `EXPLAIN ANALYZE` on top-five queries, pool sizing) vs. continuously (`@lhci/cli`, Speed Insights, weekly slow-query review).

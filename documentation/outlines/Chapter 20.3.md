# Chapter 20.3 — Performance vigilance (SaaS pattern #15)

## Chapter framing

Chapter 20.3 is the performance half of Unit 20 — the half that answers "is the app fast for real users, and which lever moves the needle when it isn't." Chapter 20.1 told you what broke, Chapter 20.2 told you what users were doing; this chapter teaches the response to "the dashboard feels slow" or "Speed Insights flagged `/pricing`." The student has shipped the full SaaS surface — Server Components, Server Actions, `next/image` and `next/font` (Chapter 5.6), indexed Postgres (Chapter 6.4), and Speed Insights from Chapter 20.2.1 — so the chapter teaches the senior reflexes that connect them: which Core Web Vital each architectural choice moves, where the bundle goes when nobody watches, why an RSC tree silently turns into a waterfall, and which evidence (real-user p75, a bundle treemap, an `EXPLAIN ANALYZE`) actually warrants a change.

Threads that run through every lesson: **the three Core Web Vitals are the scoreboard** — LCP, INP, CLS, measured at p75 from real devices via Speed Insights; **field over lab** — Lighthouse is the regression catcher, real-user RUM is the truth, both run; **measure before optimize** — bundle analyzer, `EXPLAIN ANALYZE`, the Profiler are the evidence sources, intuition is not; **the platform defaults already solved the easy wins** — `next/image`, `next/font`, `optimizePackageImports`, automatic code-splitting — performance work is recognizing where the default was bypassed (a raw `<img>`, an un-optimized barrel, a `Promise.all` that should be a `with`); **server and client are different budgets** — RSC waterfalls and N+1 inflate TTFB, bundle size and re-render storms inflate INP, image hygiene inflates LCP and CLS; **the pre-launch Lighthouse pass is a structural gate** — marketing page + one critical authenticated screen ship green or the deploy waits. The chapter ships six teaching lessons plus a quiz; the project (Chapter 20.4) exercises the audit shape end-to-end.

---

## Lesson 20.3.1 — The Core Web Vitals — LCP, INP, CLS

Topics to cover:

- **The senior question.** Speed Insights shows three numbers per route. The PM forwards `/pricing` at LCP 3.2s, INP 280ms, CLS 0.18 — what gets fixed first? The lesson lands what each metric measures, the 2026 thresholds, the p75-of-real-users definition that makes them honest, and the architectural lever that moves each.
- **The scoreboard.** Three field metrics proxying user experience: **LCP** (Largest Contentful Paint, load-feel), **INP** (Interaction to Next Paint, input-responsiveness), **CLS** (Cumulative Layout Shift, visual stability). Reported at p75 across a 28-day rolling window per route per device class. The p75 is load-bearing — the median is fine almost everywhere; p75 is where slow networks, old phones, and hot tabs live.
- **The 2026 "good" thresholds.** LCP ≤ 2.5s, INP ≤ 200ms, CLS ≤ 0.1. "Needs improvement" up to 4s / 500ms / 0.25; "poor" past that. A route is "good" only when all three are good at p75 — one yellow drags the route.
- **LCP — what it measures.** Render time of the largest content element in the initial viewport — typically the hero image, sometimes a heading. Levers in priority order: (1) the LCP image — `next/image` with `priority`, correct `sizes`, modern format (Lesson 20.3.2); (2) TTFB — RSC waterfalls and slow queries inflate it, which floors LCP (Lessons 20.3.4–20.3.5); (3) render-blocking resources — `beforeInteractive` scripts, blocking stylesheets, unsplit JS; (4) LCP element discovery — if it's behind a JS-rendered tree, the browser can't preload it.
- **INP — what it measures.** Replaced FID in 2024. Measures every interaction in the session and reports the worst (with outlier handling at high traffic). The clock runs from input event to the next paint reflecting the response. Levers: (1) long tasks on the main thread — large React re-renders on interaction, heavy synchronous JS; (2) JS bundle size — every parsed byte sits on the main thread before interactive (Lesson 20.3.3); (3) re-render storms — top-of-tree state updates re-rendering thousands of components; (4) third-party scripts. INP is the metric most SaaS apps fail first; a dashboard with a thousand rows whose tab switch re-renders every row is the canonical case.
- **CLS — what it measures.** Sums unexpected visible shifts (user-caused doesn't count). Levers: (1) images and embeds without explicit dimensions; (2) fonts swapping without metric-compatible fallbacks — `next/font` solves this (Chapter 5.6.4); (3) injected content above the fold; (4) geometric animations vs. `transform`/`opacity` (free). Most apps pass CLS structurally when they use the platform primitives.
- **Why p75 not average.** A long-tail-fat distribution makes averages lie. p75 catches the bottom quarter — the share that churns. Google uses p75 because it correlates with real conversion damage.
- **Where the numbers come from.** Speed Insights samples real sessions for p75 per route (Chapter 20.2.1). Lighthouse emulates a single device at a known network — lab numbers for CI regression catching, not user truth. Reflex: trust the field for "are users fast"; trust the lab for "did the last deploy regress."
- **The diagnosis lookup.** LCP regression → image, TTFB, blocking resources. INP regression → bundle size, re-render shape, long tasks. CLS regression → image dimensions, font swap, injected content. The lesson teaches the lookup so the next four lessons land in context.
- **The 2026 platform context.** Next.js 16 ships PPR (Chapter 5.4) on by default — static shell streams from the edge, dynamic hydrates later, LCP benefits structurally. React 19's `use()` and Server Components reduce client JS by default. Turbopack speeds builds but does not move runtime CWVs. The senior posture: the defaults are already right; perf work is finding where the team overrode them.
- **The "what first" decision.** Almost always: fix LCP first (load-feel dominates conversion), then INP (rage-clicks on action-heavy pages), then CLS (mostly free already).
- **TTFB, FCP, TBT — named once.** TTFB floors LCP; FCP is less actionable than LCP; TBT is the lab predecessor of INP, useful as the CI proxy. Diagnostics, not the scoreboard.
- **Watch-outs:** optimizing the lab number while the field stays red — ship the change and verify in Speed Insights over a week; `priority` on four images "to be safe" defeats prioritization; treating CLS as polish — every late widget is one more shift waiting; optimizing INP on a fast laptop — throttle CPU 4x or use a mid-tier device; declaring victory without the 28-day window — short-term wins are noise.

What this lesson does not cover:

- Image-hygiene fixes — Lesson 20.3.2.
- Bundle-size mechanics — Lesson 20.3.3.
- RSC waterfalls — Lesson 20.3.4.
- Database performance — Lesson 20.3.5.
- Lighthouse pre-launch — Lesson 20.3.6.
- Speed Insights dashboard — Chapter 20.2.1.
- Sentry tracing — deferred in Chapter 20.1.

Estimated student time: 35 to 45 minutes. Concept lesson; the diagnosis lookup is the load-bearing output.

---

## Lesson 20.3.2 — Image and font hygiene for LCP and CLS

Topics to cover:

- **The senior question.** Speed Insights flags `/pricing` LCP at 3.2s on mobile; the LCP element is the hero photograph. What's the fix, and what enforcement keeps the bug from coming back the next time someone drops a `<img>` into a marketing page? The lesson revisits `next/image` (Chapter 5.6.2) through the LCP lens, lands the `priority` decision, and codifies "never raw `<img>`" with ESLint enforcement.
- **The LCP-element identification.** Chrome DevTools Performance Insights highlights it on a recording; Speed Insights reports the selector per route. Reflex: confirm *which element* is the LCP before opening code — one element per route, not "the page."
- **`priority` — the one prop that moves LCP the most.** Sets `loading="eager"`, `fetchpriority="high"`, and emits a `<link rel="preload">` so the browser starts the request before body parsing. Without it, the LCP image waits behind JS and CSS — hundreds of milliseconds, one prop. The decision: exactly the LCP candidate, one per route.
- **The over-use anti-pattern.** Marking every above-the-fold image `priority` splits browser bandwidth — the actual LCP lands later. The Lighthouse warning ("More than one priority element") is the linter; honor it.
- **`sizes` — the responsive-image discipline.** Without `sizes`, `fill` and responsive Images ship the largest variant — 4MB to render a 300KB target. Pattern: `sizes="(min-width: 1024px) 33vw, 100vw"`. Reflex: every `fill` Image carries `sizes`; every responsive Image carries `sizes`.
- **Modern formats and Vercel's optimizer.** Negotiates AVIF / WebP via `Accept`. No config beyond `formats: ['image/webp']` (default) or adding AVIF when the asset library is image-heavy. AVIF is 20% smaller at 50% slower encoding — WebP default, AVIF when bandwidth dominates.
- **"Never raw `<img>`," structurally enforced.** `eslint-config-next` includes `@next/next/no-img-element` as a warning. The senior diff: bump to `error` in `eslint.config.mjs`. CI fails the PR; every `<img>` is a conscious `eslint-disable-next-line` decision. Carve-outs (e.g., `next/og` image templates) take the disable with justification.
- **The `<img>` failure-mode catalog.** Skips format negotiation, `srcset`/`sizes`, explicit dimensions (CLS), default lazy loading, the `priority` lever. Every one is a CWV regression by structure. The lesson reads as the failure list, not "use the component because we said so."
- **`remotePatterns` reflex.** Every external host belongs in `next.config.ts`'s `images.remotePatterns` (Chapter 5.6.2). The LCP angle: a missing entry tempts a "temporary" `<img>` that becomes permanent. Add the domain before adding the image.
- **Fonts and CLS — one-line revisit.** `next/font` (Chapter 5.6.4) ships self-hosted with pre-computed fallback metrics and `display: 'swap'` — invisible CLS during swap. Any font outside `next/font` (vendor stylesheet, raw Google Fonts `<link>`) is a CLS regression and an IP leak to the vendor. Audit and reroute.
- **CSS `background-image` — the LCP blind spot.** A hero via `background-image` is invisible to the optimizer, isn't preloaded, isn't format-negotiated, and Chrome's LCP detector sometimes misses it as the LCP element entirely. Rule: hero imagery is `<Image>`; decorative textures can stay CSS.
- **Decorative SVG carve-out.** Inline SVG icons (Lucide, Chapter 4.11) aren't images here — they're React components, owned by Lesson 20.3.3 (bundle hygiene). SVGs imported as a `src` use `next/image` with `unoptimized` (the optimizer refuses SVGs by default for XSS). Never `unoptimized` a user-uploaded SVG.
- **Worked-example outline (not code).** `/pricing` hero as `<Image src="/hero.webp" width={1280} height={720} priority alt="..." sizes="100vw" />`, three feature illustrations as static-imported `<Image>` without `priority`, a testimonial avatar from S3 with `remotePatterns` configured. The diff from a raw-`<img>` hero drops LCP from 3.2s to 1.4s.
- **Watch-outs:** `priority` on multiple images splits bandwidth; `fill` without `sizes` ships the largest variant; `<img>` allowed past a `warn` linter — `error` is the structural enforcement; CSS `background-image` for the hero — invisible to the optimizer; vendor `<link>` to Google Fonts — IP leak + CLS; `next/image` with non-default `quality` without `qualities` in `next.config.ts` — Next.js 16 build error (Chapter 5.6.2); static-imported asset used with `fill` losing intrinsic dimensions — let static imports carry `width`/`height`.

What this lesson does not cover:

- `next/image` mechanics in depth — Chapter 5.6.2.
- `next/font` mechanics — Chapter 5.6.4.
- The bundle side of INP — Lesson 20.3.3.
- OG image generation — Chapter 5.6.6.
- Image storage and presigned uploads — Chapter 13.3.
- Self-hosted deployments — Chapter 21.3.

Estimated student time: 35 to 45 minutes. Mechanics + Pattern; the `priority` decision and ESLint enforcement are the load-bearing senior diffs.

---

## Lesson 20.3.3 — Bundle hygiene: barrel imports and `@next/bundle-analyzer`

Topics to cover:

- **The senior question.** INP is yellow on the dashboard route; the profile points at a long task during hydration; the build output shows a 480KB chunk. Where did the size come from, and which two or three imports are 80% of the bytes? The lesson lands the bundle analyzer as the evidence source, the barrel-import shape as the canonical bug, `optimizePackageImports` as the platform's structural fix, and the dynamic-import lever for libraries not needed on first paint.
- **The bundle as the INP lever.** Every byte in the client bundle is parsed, compiled, and executed on the main thread before interactive. 600KB on a mid-tier Android is hundreds of milliseconds — the whole INP budget. Reflex: when INP is bad and the profile shows hydration-time long tasks, ship less JS to that route.
- **Barrel imports — the bug shape.** A barrel `index.ts` re-exports every named symbol. `import { Alert } from 'ui-library'` triggers the bundler to evaluate the entire barrel; tree-shaking with side effects keeps everything. Real-world: `lucide-react` (thousands of icons), `react-icons`, historically Material UI, Lodash, date-fns.
- **`optimizePackageImports` — the 2026 default.** Next.js 16 ships it with a pre-configured list (lucide-react, @radix-ui/*, react-icons, date-fns, lodash, others). The bundler rewrites barrel imports into direct file paths at build time — only the icons or utilities actually used end up in the bundle. The senior addition: `experimental.optimizePackageImports: ['my-internal-design-system']` for the team's own barrels or libraries Vercel hasn't added.
- **Verifying the optimization landed.** The bundle analyzer (next bullet) shows the chunk's per-module breakdown. Before: `lucide-react` shows hundreds of icons. After: only the icons the route imports. If the breakdown still shows the whole library, the package isn't covered and isn't ESM-clean — file an issue or fall back to per-file imports.
- **Per-icon import as the fallback.** `import { ArrowRight } from 'lucide-react/dist/esm/icons/arrow-right'`. Brittle, ugly; reserve for libraries that prove unfixable. In 2026 most curated libraries are auto-optimized — the per-file pattern is rare.
- **`@next/bundle-analyzer` — the evidence source.** `pnpm add -D @next/bundle-analyzer`. Wrap the config: `withBundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(nextConfig)`. Run `ANALYZE=true pnpm build`. Three interactive treemap HTML files: client, server, edge.
- **Reading the treemap.** Sort by stat size (parsed, most actionable). The top three rectangles in any chunk are 60–80% of bytes — that's where the budget goes. Common findings: a chart library (200KB+) on the dashboard, an un-optimized icon barrel (150KB), a markdown renderer loaded eagerly for a one-page feature.
- **The Turbopack analyzer note.** Next.js 16 ships Turbopack as default; `@next/bundle-analyzer` is the webpack analyzer, Turbopack has an experimental `--bundle-analyzer` flag of its own. Use whichever is stable on the project's version; the analysis principles are identical.
- **Dynamic imports — the non-first-paint lever.** `next/dynamic` (or `React.lazy` + `Suspense`) splits a component into its own chunk loaded on demand. Reach: rich-text editor on a settings page (200KB+), chart on a non-default tab, heavy modal markup. Pattern: `const Editor = dynamic(() => import('./Editor'), { ssr: false })`. Trade-off: a small flash; on non-first-paint UI it's invisible.
- **`'use client'` and the bundle boundary.** Server Components stay on the server — their code is never shipped. A heavy library used purely for rendering imported into a Server Component never touches the bundle. Reflex: if a heavy library is in the client bundle, ask whether the component can move server-side.
- **Source map exploration.** When the analyzer's attribution is ambiguous, source maps reveal which transitive dep pulled the weight. `source-map-explorer` and Vercel's bundle insights — name once. Reach when the analyzer says "a module from `node_modules/some-shared-dep`" and the team doesn't know who imported it.
- **Bundle budget as discipline.** Senior teams set per-route budgets (dashboard 200–300KB First Load JS, marketing 100–150KB) and track in CI via Vercel bundle insights or `next-bundle-stats`. A PR adding 50KB gets a comment; 200KB gets a conversation. Named once; project chapter (20.4) reads the bundle but doesn't ship the CI gate.
- **Audit before optimization.** Don't preemptively dynamic-import every component — every dynamic adds a network hop and a fallback render, INP can regress. Run the analyzer; pick the top three; fix those; re-measure. Optimizing the 10th-largest module is wasted effort.
- **Watch-outs:** `dynamic()` on everything "for safety" — every dynamic adds a hop; assuming `optimizePackageImports` covers a library when it doesn't — verify in the analyzer; the per-file path breaking on the library's next minor — pin or migrate; reading parsed size vs. gzip — parsed is the post-decompression cost, gzip is over-the-wire; chunking aggressively makes HTTP/2 sing but multiplies parse-and-eval — bigger fewer chunks for related code; `dynamic` on a Server Component is a no-op — it's a client lever; analyzer enabled without `ANALYZE=true` — slows deploys; bundle bloat from a peer-of-peer dep — only source maps reveal it.

What this lesson does not cover:

- React render performance and re-render storms — out of scope; Chapter 4.7 owns Profiler basics.
- The Next.js cache model — Chapter 5.4.
- Server-side bundle optimization — implicit; client bundle is the INP lever.
- Module federation / micro-frontends — out of scope.
- Web Workers / Partytown — Chapter 5.6.5 named once.

Estimated student time: 45 to 55 minutes. Mechanics + Decision; the analyzer-read workflow is the load-bearing skill.

---

## Lesson 20.3.4 — RSC waterfalls and parallel data fetching

Topics to cover:

- **The senior question.** A dashboard page takes 1.8s to TTFB; LCP at 2.9s; the structured log shows the route handler holding the connection for 1.4s before the first byte streams. Four Server Components, each awaiting its own query. What's the bug, and what does the rewrite look like? The lesson lands the RSC waterfall as the server-side cousin of N+1 and the `Promise.all` / Suspense-siblings rewrite.
- **The waterfall shape.** A Server Component awaits a query; a child Server Component awaits another query independent of the parent's result. The child renders concurrently only if structured to — by default, React renders top-down and the child's `await` doesn't start until the parent's `await` returns. Two independent 500ms queries become 1000ms serial. Four become 2000ms. The bug is topology — independent data fetched at different tree depths.
- **The diagnosis.** Pull the correlation ID from the slow request; the structured log entry-to-commit time is the budget. Sentry's breadcrumb panel shows the awaits as gaps. Chrome DevTools Network shows the document response TTFB — the LCP floor. Same shape as Chapter 6.4.2's N+1: multiple sequential async calls where one parallel call would do.
- **The two structural fixes.** **(1) `Promise.all` within a single component** — when independent data dependencies live in one component, hoist to `await Promise.all([...])`. Time becomes max(durations), not sum. **(2) Suspense-siblings** — split dependencies across sibling Server Components, wrap each in `<Suspense fallback={...}>`. React renders the static shell, streams each sibling's HTML as data resolves. 2026 default: Suspense-siblings for independent UI, `Promise.all` for data joined into one component.
- **The Suspense streaming model.** With PPR (Chapter 5.4) and siblings, the static shell streams from the edge in ~30ms; each fallback renders immediately; content streams in as queries resolve. LCP often lands on the static shell or the first-resolved sibling. Each Server Component owns one data dependency; sibling components fetch in parallel automatically.
- **The `cache()` reflex for shared reads.** Two siblings both need the current user; without `React.cache()`, each pays the round-trip. With `cache()`, the second call is in-memory. Same applies to `generateMetadata` and the page reading the same resource (Chapter 5.4.5). Pattern: every per-request resource fetch lives in a `cache()`-wrapped helper.
- **The dependent-data carve-out.** If the child's query needs the parent's result (user's primary org → org's settings), the await is structurally sequential. The lever is *making the join happen in one query at the database layer* (Chapter 6.3 relational API): one round-trip returning the nested shape. Reflex: if awaits are sequential, ask "can this be one query?"
- **The connection to N+1.** Chapter 6.4.2's N+1 is the same problem at the database layer — N parameterized queries vs. one `with`-joined. The RSC waterfall is the same at the component-tree layer. **Structural fan-out** — wherever code issues N sequential I/O calls, ask whether structure can be one parallel batch (siblings, `Promise.all`) or one combined query (`with`, join). One reflex, two surfaces.
- **The `preload` pattern.** A Client Component lower in the tree will need data the Server Component knows about. Calling the cached helper at the top without awaiting starts the fetch; by the time the Client Component reads it, the cache is warm. `void getInvoice(id); /* render */; ... <Detail id={id} />`. Reach when the profile shows a late read.
- **The `loading.tsx` boundary.** App Router's route-segment Suspense — first paint is the loading UI, data resolves, page swaps in. Often the right default for any route with material fetching. Ship `loading.tsx` on every dashboard route at minimum; the perceived-perf win is free.
- **`use()` and the hoisted Promise pattern.** React 19's `use()` reads a Promise inside a Client Component with Suspense handling the loading state. A Server Component creates the Promise without awaiting, passes it as a prop, the Client Component reads with `use()`. Useful for "Client Component needs data but most of its tree doesn't."
- **Verifying the fix.** Before: TTFB 1.8s, LCP 2.9s, Speed Insights p75 LCP 3.2s. After the Suspense-siblings rewrite: TTFB 200ms (static shell streams immediately), LCP 1.5s on the static heading, Speed Insights p75 LCP 1.9s after a week. The verification window is days — p75 stabilizes over the rolling field window.
- **Watch-outs:** `Promise.all([single])` — over-engineering; `<Suspense>` with a tall fallback that shifts when content lands — CLS regression by structure; module-level memoize instead of `cache()` — won't dedupe across the render; calling the auth helper twice in one component because the gate returns the user and the body needs it too — `cache()` and call everywhere; assuming Suspense streaming works through a Client Component boundary — it does, but the Client Component's `useState` and `useEffect` run after hydration and can re-introduce work; `loading.tsx` plus inner Suspense both rendering — only one fallback shows, but match dimensions to avoid shifts; `preload()` everywhere — most fetches don't need it.

What this lesson does not cover:

- Database N+1 — Chapter 6.4.2 owns the mechanic; the connection is named.
- Cache Components and `use cache` — Chapter 5.4.
- `React.cache()` mechanics — Chapter 5.4.5.
- Server Actions performance — different surface (mutation, not render).
- Suspense fundamentals — assumed.
- Streaming SSR internals — out of scope.

Estimated student time: 50 to 60 minutes. Concept + Pattern; the structural-fan-out reflex is the load-bearing senior takeaway.

---

## Lesson 20.3.5 — Database performance in production

Topics to cover:

- **The senior question.** The structured log shows a Server Action committed in 1.2s; the action's `queryTime` field reports 980ms on one Drizzle call — a list-with-children pattern. The lesson revisits indexes (Chapter 6.4.1), N+1 (Chapter 6.4.2), and `EXPLAIN ANALYZE` (Chapter 6.4.3) through the production-vigilance frame: what to do *after* the app is live and a query is slow.
- **The production-vigilance posture.** Chapter 6.4 taught mechanics; this lesson teaches *response*. A slow query shows up in: the structured log's `queryTime` field (Chapter 20.1.2), Sentry's slow-action breadcrumb, a user's "the report doesn't load" ticket, Neon's slow-query log. Don't profile preemptively; respond to signals the observability surface produces.
- **The diagnosis flow.** (1) Signal arrives. (2) Pull the correlation ID; isolate the request. (3) Identify the slow query — Drizzle's dev `logger: true` or the structured log's query-event lines name the statement. (4) Copy the emitted SQL; prefix `EXPLAIN (ANALYZE, BUFFERS)`; run in `psql` or Neon's SQL editor against a production-shaped branch. (5) Read, hypothesize, apply one change. (6) Re-run, verify, ship.
- **The four production findings, by frequency.** **(1) Missing FK index** — Chapter 6.4.1's "most common bug" surfacing when the FK table grew. Fix: add the index, ship with `CREATE INDEX CONCURRENTLY`. **(2) Missing cursor-pagination composite** — the page works in dev with 100 rows, dies at 100K. Fix: `(orgId, createdAt desc, id desc)`. **(3) N+1 from `Promise.all` over a parameterized query** — code-review missed one. Fix: relational API with `with` (Chapter 6.3.3) or a join. **(4) Stale statistics** — auto-vacuum is behind, row estimates wrong by orders of magnitude, wrong strategy. Fix: `ANALYZE <table>;`.
- **The "index hits" verification.** `EXPLAIN ANALYZE` shows the node — `Index Scan` or `Index Only Scan` means the planner used it; `Seq Scan` with `Filter` means it didn't. Rule: every slow query gets a plan; the team doesn't ship a fix without before-and-after plans in the PR description.
- **The N+1 reflex in production.** Code that passed review can N+1 if a downstream change adds a per-row helper. Detection: multiple `db_query` lines per request with similar SQL shape — same `WHERE table_id = $1` repeated 50 times. Fix is the same: rewrite to `with` or join; never reach for a cache to mask it.
- **The `db.transaction` performance trap.** Chapter 6.4.4: no external IO inside `db.transaction`. The production angle: a transaction holding the PgBouncer connection for 500ms because it awaits a third-party API starves the pool, queues every other request, surfaces as "the whole app is slow." When the slow query isn't slow but the wait is, look for a transaction wrapping an external call.
- **Connection pool exhaustion — symptom catalog.** Pool runs out, requests queue, p95 latency spikes hard while p50 stays normal — tell-tale shape on a latency chart. Causes: too-low pool size, transactions held too long, connection leak. Neon's pooled URL handles most cases; the watch-out is the long-transaction shape. Deployment-side pool tuning is Chapter 21.3.
- **`EXPLAIN ANALYZE` against a production-shaped branch.** Running plans on a 100-row dev DB tells you nothing — the planner picks different strategies at different sizes. Run against a Neon branch of production (Chapter 21.3.6 ships branching for migrations; same primitive). Free for the branch lifetime; never `EXPLAIN ANALYZE` a destructive statement against production directly.
- **Slow-query logging — `auto_explain`.** Postgres extension logs plans of any query exceeding a threshold (`log_min_duration = '500ms'`). Neon supports it on Pro. Production-vigilance angle: enable pre-launch so slow queries surface without manual sleuthing. Alternatives (pgAnalyze, Datadog DBM) — name once.
- **"Cache is not the fix," sharpened.** Request-scoped `React.cache()` deduplicates within one render. Platform `use cache` (5.4.3) is invalidation-keyed cross-request reuse. Neither fixes N+1 — they mask round-trip count on a hit, the database still pays on miss, the bug compounds when cold. A slow query gets an index or query rewrite; cache decisions answer a different question.
- **What "good" looks like.** Dashboard load: TTFB under 300ms; slowest query in the route under 100ms; every list query under 50ms p95 with the right composite; FK indexes all green; `Index Scan` or `Index Only Scan` on every hot path. When the numbers slip, the diagnostic flow runs.
- **Watch-outs:** `EXPLAIN ANALYZE` on a write-heavy statement against production — it actually runs, use a branch; chasing the slowest query while the bug is pool starvation — per-query plan looks fine, wait happens at the pool; adding an index "to be safe" — every index slows every write, never preemptive; over-relying on `auto_explain` — log volume blows up; assuming dev plan equals prod plan — different sizes, different strategies; reaching for an extension to fix a query shape that should be one `with` — instrument code first, schema second; blaming the database when the slow line is a third-party API inside a transaction.

What this lesson does not cover:

- Index mechanics — Chapter 6.4.1.
- N+1 mechanics — Chapter 6.4.2.
- `EXPLAIN ANALYZE` at depth — Chapter 6.4.3.
- Transactions and isolation — Chapter 6.4.4.
- Neon branching — Chapter 21.3.6.
- Drizzle relational API — Chapter 6.3.

Estimated student time: 40 to 50 minutes. Reference + Pattern; the diagnostic flow is the load-bearing reflex.

---

## Lesson 20.3.6 — Pre-launch Lighthouse passes

Topics to cover:

- **The senior question.** The app is days from launch. Speed Insights needs real users to report a p75 — it has none. What's the lab-side gate that catches regressions before field metrics can be trusted? The lesson lands the pre-launch Lighthouse pass as a structural gate: the marketing top-of-funnel page and one critical authenticated screen ship green or the deploy waits. After launch, Lighthouse-CI runs on every PR; Speed Insights becomes the truth.
- **Lighthouse — what it is.** Runs against a single page in an emulated environment (default: mobile, simulated 4G, mid-tier CPU). Reports Performance, Accessibility, Best Practices, SEO, PWA scores. Performance composites LCP, INP, CLS, TBT, FCP, SI with documented weights. Lab numbers: deterministic, repeatable, for regression catching — not user-facing truth.
- **The two Lighthouse surfaces.** **(1) Chrome DevTools Lighthouse** — manual run, senior workflow before merging a major change. **(2) PageSpeed Insights** (web.dev) — public-facing version, same engine, shows lab numbers plus 28-day Chrome UX Report field data when the site has enough traffic. Reflex: PageSpeed Insights for marketing (public, shareable URL), DevTools for authenticated screens.
- **The two pages — and why these.** **(1) Marketing top-of-funnel** (typically `/` or `/pricing`) — the page Google indexes, the ad-campaign landing, where CWVs affect ranking. Anything yellow costs SEO and conversion. **(2) One critical authenticated screen** (dashboard, editor, checkout) — the highest-leverage page a returning user opens most. Two passes; not 50.
- **The pre-launch targets.** Performance 90+; LCP < 2.5s; INP < 200ms in the lab (TBT < 200ms as the proxy); CLS < 0.1; Accessibility 95+; Best Practices 95+; SEO 100. Yellow is a fix, not a "we'll watch." A launch gate, not a polish step — a red launch ships paying customers a bad experience and bakes the SEO penalty into the first 90 days.
- **Running Lighthouse authenticated.** DevTools Lighthouse runs against the current logged-in session (cookies). Log in with a representative test user (the seeded org with realistic data — Chapter 21 covers staging seeds), open the page, run the audit. Repeat three times; run-to-run variance is 5–10 points; take the median.
- **Interpreting the output.** Lighthouse names diagnostics directly: "Eliminate render-blocking resources," "Properly size images," "Remove unused JavaScript," etc., with offending URLs. The diagnostics are the lookup, not the score. A 78 with one clear "Remove unused JavaScript: 320KB" is one action item; a 78 with five tied diagnostics is the bundle-analyzer plus image-audit pass from Lessons 20.3.2–20.3.3.
- **The lab-vs-field discrepancy.** Lighthouse emulation is conservative (Moto G Power, 4G). Real p75 can be better (most users on Wi-Fi) or worse (users on truly bad networks). Pre-launch the lab pass is the only signal; post-launch Speed Insights is the truth and Lighthouse becomes the CI regression catcher.
- **Lighthouse-CI — the post-launch regression gate.** `lhci` runs Lighthouse against every PR's preview deployment, compares to a baseline, fails on regressions past a threshold. Wire-up is Chapter 21 (CI) territory. 2026 default: marketing routes + one critical authenticated screen, threshold 5 points so noise doesn't fail PRs.
- **The Vercel preview deployment as test target.** Running against `localhost` is fine for fast iteration; running against a Vercel preview is the senior pre-merge step — production build, production env, production CDN. Dev-prod parity for the audit. Mechanics in Chapter 21.3.5.
- **The two-page rule as discipline.** Auditing every route turns a 30-minute task into a week and produces shallow findings on every page. Top-of-funnel + highest-leverage authenticated screen are 90% of perceived perf value; post-launch Lighthouse-CI baselines the rest. Depth over breadth.
- **What this pass is not.** Not a substitute for Speed Insights — the lab is conservative, the field is the truth post-launch. Not a one-time event — post-launch Lighthouse-CI keeps the discipline alive. Not the security audit (Chapter 17) or the a11y audit (Chapter 4.11 ships the WCAG baseline; Lighthouse A11y score is a sanity check, not the audit).
- **Worked-example outline.** Pre-launch checklist: (1) DevTools Lighthouse on `/` and `/pricing` from a clean profile, mobile emulation, three runs, median taken. (2) DevTools Lighthouse on `/dashboard` logged in as the seeded test org, same protocol. (3) Compare to targets; identify diagnostics; fix; re-run. (4) Document median scores in the launch checklist (Chapter 21.3.9 owns it).
- **Watch-outs:** trusting one Lighthouse pass — variance is real, median three; auditing on localhost — different reality; chasing 95+ on every route — diminishing returns, ship at 90+; treating A11y 95 as the actual a11y audit — manual screen-reader and keyboard testing (Chapter 4.11) is the surface; auditing as admin with cached data while normal users see cold caches — test the realistic shape; using Lighthouse for "is the app fast" past launch — Speed Insights is the truth; Lighthouse-CI thresholds too tight — every PR fails on variance, the team disables the check.

What this lesson does not cover:

- Speed Insights mechanics — Chapter 20.2.1.
- A11y audit at depth — Chapter 4.11.
- Lighthouse-CI configuration — Chapter 21 (CI).
- The launch checklist — Chapter 21.3.9.
- Preview deployments per PR — Chapter 21.3.5.
- Marketing SEO file conventions — Chapter 5.6.7.

Estimated student time: 35 to 45 minutes. Setup/wiring + Decision; the two-page rule is the load-bearing senior call.

---

## Lesson 20.3.7 — Chapter quiz

Top 10 topics to quiz:

- The three Core Web Vitals — LCP (≤ 2.5s), INP (≤ 200ms), CLS (≤ 0.1) — at p75 across a 28-day rolling window; why p75 (not average) and why field (Speed Insights) over lab (Lighthouse) for user-facing truth.
- The metric-to-architecture lookup — LCP moves with image hygiene and TTFB; INP moves with bundle size and re-render shape; CLS moves with explicit image dimensions and `next/font`.
- `next/image` `priority` for the single LCP element per page; the over-use anti-pattern; `sizes` for `fill` and responsive shapes; ESLint enforcement of `@next/next/no-img-element` as `error` so raw `<img>` becomes a conscious decision.
- The "never raw `<img>`" failure-mode list — format negotiation, srcset/sizes, dimensions for CLS, default lazy loading, the priority lever — and the CSS `background-image` blind spot for hero LCP.
- Barrel imports as the bundle bloat shape; `optimizePackageImports` as the platform's structural fix with the curated list (lucide-react, @radix-ui, react-icons, date-fns, lodash); the per-file fallback when uncovered; `next/dynamic` for non-first-paint heavy components.
- `@next/bundle-analyzer` — `ANALYZE=true pnpm build`, three treemap reports (client, server, edge), reading by stat size, the top-three rule (60–80% of bytes); the parsed-vs-gzip distinction.
- RSC waterfalls as the server-side cousin of N+1 — sequential awaits at different tree depths inflating TTFB; the `Promise.all` rewrite within a component, the Suspense-siblings rewrite for independent UI; `React.cache()` for shared per-request reads; the structural-fan-out reflex.
- The dependent-data carve-out — when child data depends on parent data, the fix is one combined query at the database layer (Chapter 6.3 `with`), not `Promise.all`; the connection between RSC waterfall and N+1 as one reflex on two surfaces.
- The four production database findings — missing FK index, missing cursor-pagination composite, N+1 from `Promise.all` over a parameterized query, stale `ANALYZE` statistics; the diagnostic flow (correlation ID → slow query → `EXPLAIN ANALYZE` against a Neon branch → one change → verify); `CREATE INDEX CONCURRENTLY` as the production-deploy reflex; the cache-isn't-the-fix rule.
- The pre-launch Lighthouse gate — two pages (marketing top-of-funnel + one critical authenticated screen), targets (Performance 90+, LCP < 2.5s, TBT < 200ms as INP proxy, CLS < 0.1, A11y 95+, SEO 100), the three-runs-median protocol, the lab-vs-field framing, Lighthouse-CI on preview deployments post-launch.

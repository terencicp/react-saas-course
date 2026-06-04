# generateStaticParams for static catalogs

- **Title (h1):** `generateStaticParams for static catalogs`
- **Sidebar label:** `generateStaticParams`

---

## Lesson framing

This is the last teaching lesson of Chapter 034 and the one that closes the chapter's recurring **"static by default under Cache Components, keep it that way"** thread (continuity: every lesson named this; here the student finally holds the lever for *dynamic route segments*). The whole chapter taught the project surface *outside* the route tree; this lesson reaches back into the route tree for the one build-time hook that lives there.

**The single mental model the student must leave with:** under `cacheComponents: true` a `[slug]` segment is *runtime data by default* — Next can't know the slug at build, so it streams. `generateStaticParams` is the **promise to the build**: "here is the full list of slugs, materialize them now." That one export flips the segment from "render-on-every-request" to "render-once-at-build, serve-from-CDN," and unlisted slugs still render on demand and get saved to disk. The senior reflexes are the **two-condition decision rule** (enumerable at build AND content stable between deploys) and the **production content-page shape** (`generateStaticParams` + a `'use cache'` read helper + a `cacheTag` for surgical invalidation).

**Why this is the right framing for the target student.** They met `'use cache'`, `cacheLife`, `cacheTag`, and `revalidateTag(tag, profile)` in chapter 032, and `params`-is-a-Promise in chapters 032/033. So this lesson teaches *almost no new caching mechanics* — it teaches the one new export (`generateStaticParams`) and how it **composes** with what they already know into the canonical blog/help-catalog shape. Lead with the composition, not the primitives. The pain it relieves is concrete and chapter-anchored: a marketing blog re-running its render function on every request for content that changes monthly is the waste the senior eliminates.

**Where beginners go wrong (drive the lesson by these):**
1. They think `generateStaticParams` *fetches the page data*. It does not — it returns only the **list of param values** (the catalog of URLs). Data fetching still happens in the page/helper. This is the #1 conceptual error; address it the moment the function is introduced.
2. Carried-over legacy intuition: "empty array ⇒ everything renders at runtime." **Under Cache Components an empty array is a build error.** This was true pre-Cache-Components and is now wrong; the student will read it in old blog posts. Correct it explicitly.
3. They put `cookies()`/`headers()` inside a `generateStaticParams` route's render path for *some* slugs and are surprised it builds fine but 500s in production. Build-time validation only exercises code paths the **sample params** hit; a conditional branch reaching a request API for an unlisted slug isn't validated. This is the subtle production failure — name it.
4. They reach for `dynamicParams: false` reflexively. It still exists, but under Cache Components it has inheriting/nesting sharp edges; it's a recognition-level power-tool for genuinely-closed lists, not a default.

**Tone:** terse, senior, decision-first (per pedagogical guidelines). No "what is a build step." Assumes Chapter 032 fluency. Estimated 30-40 min.

**Continuity hooks to honor (from the chapter's continuity notes and conventions):**
- Reuse the **Acme** fiction: `app.acme.com`, `(marketing)` / `(app)` route groups, title template `'%s — Acme'`. Lesson 7 already enumerated **public help articles** in `sitemap.ts` via a `db/queries/` helper `listPublicHelpArticles()` — this lesson's worked example builds the matching `app/(marketing)/help/[slug]/page.tsx`, so the sitemap and the static catalog reference the *same* read helper. This is a deliberate, satisfying payoff of lesson 7's forward-ref ("`generateStaticParams` build-materialization → l8").
- Caching mechanics are **recap-only** (chapter 032 owns them): `'use cache'`, `cacheLife(<preset>)`, `cacheTag` via the `tags.ts` helper, `revalidateTag(tag, profile)` two-arg form. Do not re-derive — one-line refreshers, then compose.
- Tags come from the `tags.ts` helper, never inline strings (e.g. `helpArticleTags.record(slug)`); a `'use cache'` boundary must not capture request-scoped values — pass `slug` as an argument.
- Code conventions: `db/queries/<entity>.ts` verb-led read helper; `import type { ... }` where type-only; single quotes; 2-space; `page.tsx`/`generateStaticParams` are framework-allowlisted (the page default-exports; `generateStaticParams` is a named export Next discovers by name).

---

## Lesson sections

### Introduction (no heading)

Warm, brief, problem-first — open the chapter's closing beat. Concrete scene (reuse the chapter spine): Acme's marketing blog has `/blog/[slug]` with ~30 posts; the help center has `/help/[slug]` with ~80 articles. Under `cacheComponents: true` (the flag the student turned on in lesson 1, the model they learned in chapter 032) each of these segments is **dynamic by default** — the render function runs on *every* request, for content the editorial team touches maybe weekly. State the senior question implicitly: *the content is a fixed, knowable list that rarely changes — why is it paying the per-request tax?* Name the answer in one sentence: `generateStaticParams` is the build-time hook that turns a dynamic segment into a static catalog. Preview the end state: by the end they can wire the production content-page shape (build-materialized + cached + surgically invalidated) and state the rule for when it applies. Keep it to ~5-6 sentences.

Do **not** add a "prerequisites" section; fold the one-line recaps into the sections that need them.

---

### A dynamic segment is runtime data by default

**Goal:** establish the *before* state precisely, so `generateStaticParams` reads as the fix rather than as magic. This is the hinge of the whole lesson and must be unambiguous.

Content:
- Recap in two sentences (chapter 032, don't re-teach): under Cache Components everything is dynamic by default; a route goes static only by opting in. The new fact for *this* lesson: a `[slug]` page is dynamic **because Next cannot know the slug at build time** — the slug is, by definition, runtime data. So the platform's safe default is to treat param access as runtime and stream it.
- Show the naive `app/(marketing)/help/[slug]/page.tsx`: `const { slug } = await params;` then a read + render, no `generateStaticParams`. Frame it (accurately, per docs): without `generateStaticParams`, param access is runtime data — Next ships a static shell and the param-dependent content streams on every request behind Suspense. It *works*, it's just paying a per-request cost for a fixed catalog.
- State the lever in one line: provide the list of slugs at build time and Next will materialize each as static HTML instead.

**Component — `CodeVariants`** (two tabs, the chapter's recurring "naive vs fixed" device, mirrors lessons 2/4/5):
- Tab **"Dynamic by default"**: the `[slug]` page with only `await params` + read, no `generateStaticParams`. Prose first sentence: *"Works, but the render function runs on every request — the slug is runtime data Next can't predict."*
- Tab **"Static catalog"**: same page + the `generateStaticParams` export added (`ins=` the new lines). Prose first sentence: *"The export hands Next the full slug list at build — each becomes static HTML served from the CDN."*
- Keep both under ~14 lines; this is the A/B glance, the deep walkthrough comes next.

**Tooltip terms** here: `static generation` / `prerendering` (build-time HTML, served without running the function per request — the student met the concept in ch.032 but the word is worth pinning), `materialize` (generate the concrete HTML for one URL at build).

---

### Returning the catalog, not the data

**Goal:** kill the #1 misconception — that `generateStaticParams` fetches the page. It returns **only the list of param objects**; the page still does its own data fetching. Make the division of labor explicit and physical.

Content:
- The contract: `generateStaticParams` returns `{ slug: string }[]` — one object per route to materialize, each property keyed by the dynamic segment's name. For `[slug]`, `[{ slug: 'getting-started' }, { slug: 'billing-faq' }]` materializes `/help/getting-started` and `/help/billing-faq`. That's it — a list of *URLs to build*, expressed as params.
- The async shape and where it runs: it's an `async` function executing in the **Node build environment** — the database, the filesystem, upstream APIs are all reachable. The canonical body queries the catalog **once**: `const slugs = await listPublicHelpSlugs(); return slugs.map((slug) => ({ slug }));`. (Use a thin `db/queries/` helper that returns just the slug column — not the whole row — because the list is all we need here.)
- The division of labor, stated as a rule: **`generateStaticParams` answers "which URLs exist"; the page answers "what's on each URL."** They run at the same phase (build) but do different jobs. Reading the article body inside `generateStaticParams` is a category error — it doesn't go there.
- Return-type table (tiny, reuse the docs' shape) so the multi-segment case is *recognized* without being taught deeply:
  - `/help/[slug]` → `{ slug: string }[]`
  - `/[category]/[product]` → `{ category: string, product: string }[]`
  - `/help/[...slug]` (catch-all) → `{ slug: string[] }[]`
  Keep this a one-glance reference; nested/parent-child `generateStaticParams` is explicitly out of scope (see Scope).

**Component — `AnnotatedCode`** on the `generateStaticParams` function alone (4 steps, `maxLines` ~10, blue default tint):
1. `{1}` the `export async function generateStaticParams()` signature — a **named export** Next discovers by name (contrast: the page is default-exported); runs at build.
2. highlight the read helper call — fetches the *catalog* (slug list), once; deduped with the page's reads (forward-ref to the dedup section).
3. highlight the `.map(... => ({ slug }))` — shaping each slug into the param object; the key **must** match the folder name `[slug]`.
4. highlight the return — *this is the list of URLs to build, nothing more*; restate the "not the data" rule here as the closing beat.

**Exercise — `Dropdowns`** (fenced-code mode), reinforces the return shape and the name-matching rule. A `generateStaticParams` skeleton for `app/(marketing)/help/[slug]/page.tsx` with three blanks: the function keyword line (`async` vs not — answer keeps it `async` since it awaits), the property key inside the mapped object (`slug` vs `id` vs `params` — must match the folder), and the helper that returns the list (`listPublicHelpSlugs` vs a single-record `getHelpArticle` — must be the *list* helper, not the record fetch). Grades the two load-bearing decisions: key-matches-folder, and list-not-record. Short `instructions`: "Complete the build-time catalog. The page lives at `help/[slug]`."

**Tooltip term:** `build environment` (the Node process that runs once at `next build`, before any user request — DB/FS/network all available).

---

### When a static catalog is the right call

**Goal:** the senior decision — the durable takeaway. Two conditions, both required. This is "trigger before tool" applied: name the threshold the static-catalog tool crosses.

Content:
- The rule, stated crisply: reach for `generateStaticParams` when **both** hold:
  1. **The catalog is enumerable at build** — you can produce the complete list of URLs from data you have at build time (a DB table, a content directory, a CMS export).
  2. **The content is stable between deploys** — it changes on an editorial/release cadence, not per-request and not per-user.
- The yes column (concrete, Acme-flavored): marketing pages, **blog posts**, **public help articles**, public profile slugs, changelog entries, docs pages. Anything a logged-out visitor and a logged-in visitor see identically.
- The no column (and *why* each fails the rule): per-user dashboards (not enumerable — keyed on identity), search-results pages (the "catalog" is the query space, effectively infinite), anything keyed on authenticated/session state, anything where `searchParams` drives the content (a route that reads `searchParams` is dynamic regardless — that's chapter 033 lesson 4; name it, don't re-teach). The discriminator one-liner: *"if you can write down every URL ahead of time and they'd look the same to everyone, it's a catalog."*
- Build-cost honesty: the function runs once at build and Next renders one HTML file per returned param. A few thousand pages: fine. Tens of thousands: the build slows noticeably and you reach for the **partial/on-demand** pattern (next section). Don't pre-optimize; name the threshold.

**Component — `StateMachineWalker`** (`kind="decision"`, the chapter's decision-tree device, continuity with lesson 3's three-home tree). Force the student through the senior's question order:
- Root `Question` "Can you list every URL at build time?" → **No** branch → `Leaf` verdict *"Keep it dynamic (stream it)"* (not enumerable — a dashboard/search/per-user surface; needs Suspense per ch.032, no `generateStaticParams`). → **Yes** branch → next `Question`.
- `Question` "Does the content change per request or per user?" → **Yes** branch → `Leaf` *"Keep it dynamic"* (rationale: session/searchParams-driven content can't be a shared static artifact; cross-ref ch.033 l4 for the searchParams case). → **No (editorial/release cadence)** branch → next `Question`.
- `Question` "How big is the catalog?" → **Up to a few thousand** → `Leaf` verdict *"`generateStaticParams` for the whole list"* (the production content-page shape, full materialization). → **Tens of thousands+** → `Leaf` verdict *"`generateStaticParams` for the hot subset, rest on demand"* (partial pattern, points forward to the on-demand section).
Each leaf body is 1-2 sentences naming the concrete reflex. The lesson lives in the *order* of the questions (enumerable → stable → size), not in any single leaf — that's the senior skill.

---

### The production content-page shape

**Goal:** the payoff — compose `generateStaticParams` with the chapter-032 caching primitives the student already owns into the canonical shape they'll actually ship. This is the lesson's center of gravity.

Content:
- The shape, named as three coordinated parts on one `[slug]` page:
  1. `generateStaticParams` → materializes the catalog at build.
  2. The page reads its data through a **`'use cache'` read helper** that takes `slug` as an argument and calls `cacheTag(helpArticleTags.record(slug))` + `cacheLife('days')` — so each article's HTML is cached cross-request and tagged for surgical invalidation.
  3. A CMS publish webhook (or an editorial Server Action) calls `revalidateTag(helpArticleTags.record(slug), 'max')` to bust *only the changed article* on edit.
- Why this exact composition (the senior reasoning, not just the code): `generateStaticParams` gives the build-time set; `'use cache'` + `cacheLife` makes even runtime-rendered (unlisted) slugs cheap and gives a freshness window; `cacheTag` + `revalidateTag` make a single edit invalidate exactly one page instead of redeploying. **Build-time static for the known set, cheap-and-fresh for the long tail, surgical invalidation on edit** — that's the whole value proposition in one line.
- **Critical placement note (divergence from the chapter-outline brainstorm, follow the docs):** put `'use cache'` on the **`getHelpArticle(slug)` read helper**, *not* as a bare directive at the top of the page component. Reason: the page also runs `generateStaticParams` and may branch; caching the *data read* (keyed on `slug`) is the clean, official shape (Next's own docs put `'use cache'` on `getPost(slug)`). The page body stays a thin async server component that awaits `params`, calls the cached helper, and renders. **Flag this for downstream agents so review doesn't "fix" it back to a page-level directive.**
- Recap-only refreshers (one clause each, chapter 032 owns the depth): `'use cache'` = cross-request persistence; `cacheLife('days')` = the editorial-cadence freshness profile, the documented preset for "blog posts, articles" (stale/revalidate/expire numbers come from the preset — don't list them, ch.032 l4); `cacheTag` via `tags.ts` helper, never inline strings; `revalidateTag(tag, 'max')` — the second `cacheLife` argument is mandatory in 16 (the single-arg form is a TS error). The `'use cache'` boundary **must not capture request-scoped values** — `slug` is passed in as an argument, which is exactly why the helper signature is `getHelpArticle(slug: string)`.
- **Mechanics precision for downstream agents (matches official docs):** `'use cache'` is the directive at the top of the helper body; `cacheLife('days')` and `cacheTag(...)` are **in-body function calls** (called inside `getHelpArticle`, after the directive), imported from `next/cache` — not arguments to a wrapper. Order in the body: directive → `cacheTag(...)` → `cacheLife('days')` → the read. (The official `cacheLife` docs show exactly this `getPostContent(slug)` shape; do not invent a wrapper API.)
- One sentence on the freshness model without the ISR jargon dominating: with a `'days'` profile, the platform can serve the cached page and refresh it in the background on the cadence; a publish webhook's `revalidateTag` busts it immediately. (Mention the term **ISR** once, parenthetically, as "the older name for this stale-then-refresh behavior," so the student recognizes it in the wild — but lead with the Cache Components vocabulary, not the legacy term.)

**Component — `CodeVariants`** as the worked example, three tabs grouping the three files of the shape (related files, the documented `CodeVariants` use; `syncKey` not needed). Use `app.acme.com` / Acme help center throughout. `maxLines` ~16.
- Tab **`help/[slug]/page.tsx`**: `generateStaticParams` (calls `listPublicHelpSlugs()`) + a thin `Page` that `await params`, calls `getHelpArticle(slug)`, renders. First-sentence prose: *"Build the catalog, then render each article through the cached read helper."*
- Tab **`db/queries/help-articles.ts`**: `listPublicHelpSlugs()` (the slug-only list for `generateStaticParams` + reused by lesson 7's `sitemap.ts`) and `getHelpArticle(slug)` carrying `'use cache'`, `cacheTag(helpArticleTags.record(slug))`, `cacheLife('days')`. First-sentence prose: *"`'use cache'` lives on the data read, keyed and tagged by slug — never captures the request."*
- Tab **publish webhook / action (`app/api/cms/route.ts` or an action snippet)**: on publish, `revalidateTag(helpArticleTags.record(slug), 'max')`. First-sentence prose: *"One edit busts exactly one article — no redeploy."*

Keep the `tags.ts` helper itself off-screen (chapter 032 / conventions own it) — reference `helpArticleTags.record(slug)` and trust the student knows the helper pattern; optionally a one-line aside that the helper is the same `tags.ts` file from chapter 032.

**Tooltip terms:** `ISR` (Incremental Static Regeneration — the legacy name for serve-cached-then-refresh; under Cache Components it's expressed through `cacheLife` + tags), `surgical invalidation` (busting one record's cache by tag instead of rebuilding everything).

---

### Materializing only the hot paths

**Goal:** the partial/on-demand pattern + the correct on-demand behavior under Cache Components — and the build-error correction. Keep it tight; this is the conditional power-tool, not the default.

Content:
- Partial materialization: `generateStaticParams` may return a **subset**. Return the hot 100 (the articles driving most traffic) and let the long tail render on first request. Per the docs, an unlisted slug **renders on demand and is saved to disk after a successful first request** — so the second visitor gets static HTML too. This is the same machinery as full materialization, just lazier about the cold set. Reach for it when the catalog is large enough that building all of it slows the deploy, but a small head drives the traffic.
- **The empty-array correction (load-bearing, contradicts old material the student will find):** pre-Cache-Components, returning `[]` meant "materialize nothing, render every URL at runtime." **Under `cacheComponents: true`, an empty array is a build error** (`empty-generate-static-params`). The rationale, stated simply: Cache Components validates at build that the route doesn't accidentally touch `cookies()`/`headers()`/`searchParams` at runtime, and it needs *at least one* sample param to run that validation against. Practical rule: if a route has `generateStaticParams`, give it at least one real slug. If you genuinely want *all* slugs runtime-rendered, you don't want `generateStaticParams` at all — you want the plain dynamic `[slug]` page with Suspense from the first section. State this as a clean either/or so the student isn't tempted by the placeholder-param hack (mention the `'__placeholder__'` trick exists only to dismiss it: it defeats the validation and invites runtime errors).
- Closing the loop on the *first* section: the plain dynamic page (no `generateStaticParams`, Suspense around param-dependent content) and the full static catalog are the two clean ends; partial is the deliberate middle.

**Component — `CodeVariants`** (two tabs, the empty-array correction as a before/after the student can't miss):
- Tab **"Legacy intuition (now a build error)"**: `return [];` with prose first sentence *"Pre-Cache-Components this meant 'all at runtime.' Under `cacheComponents` it fails the build."* Mark the line with `del=`.
- Tab **"Subset at build, tail on demand"**: `return hotSlugs.slice(0, 100).map((slug) => ({ slug }));` prose *"Materialize the hot set; unlisted slugs render once on first request, then serve from disk."*

**Tooltip term:** `on-demand rendering` (render the first time a URL is requested, then cache the result — versus rendering at build).

---

### What the build can and can't see

**Goal:** the real production failure mode the chapter-outline brainstorm doesn't cover but the docs flag prominently — build-time validation only exercises the sample params' code paths. This is the subtle bug a senior catches in review. High-value, keep crisp.

Content:
- The mechanism: at build, Next runs the route **once per returned param** and checks that nothing reaches a request-time API (`cookies()`, `headers()`, `searchParams`) outside a Suspense/`use cache` boundary. But it can only validate the **branches the sample params actually execute.**
- The trap (concrete): a `[slug]` page with a conditional — say `if (slug.startsWith('internal-')) return <PrivateNote .../>` where `PrivateNote` reads `cookies()`. If no sample slug starts with `internal-`, the build is green. Then a real request for `/help/internal-x` hits the unvalidated branch and **500s in production**, because that branch touches `cookies()` without a boundary. Green build, red production — exactly the failure that erodes trust in "it builds, ship it."
- The fix, two options: (a) keep param-conditional request-API reads behind a `<Suspense>` boundary so they're allowed to be runtime; (b) better for a static catalog — don't branch into request-time data at all on a page you're trying to keep static. The senior reflex: *a route you've promised the build is a static catalog shouldn't be secretly reading the request for some slugs.*
- Tie back to the decision rule: this trap is what condition #2 ("content stable, not per-request/per-user") protects against — if you're tempted to read `cookies()` for *some* slugs, that route probably isn't a pure catalog.

**Component — `AnnotatedCode`** (the trap, 3 steps, `color="red"` on the dangerous step, `color="green"` on the fix step), single block of the conditional page:
1. `{generateStaticParams lines}` blue — samples are all public slugs.
2. the `if (slug.startsWith('internal-'))` branch + the `cookies()` read inside it, red — *never executed at build with these samples → unvalidated → 500 at runtime for `internal-*`.*
3. the same branch wrapped in `<Suspense>` (or removed), green — *now the request-time read is allowed, or the route stays a pure catalog.*

**Exercise — `MultipleChoice`** (single question, checks the validation model): *"A `/help/[slug]` page has `generateStaticParams` returning `['pricing', 'faq']` and a branch that reads `cookies()` only when `slug === 'admin-preview'`. `next build` succeeds. What happens?"* Choices: (a) build should have failed — `cookies()` is banned with `generateStaticParams` [wrong: only validated paths are checked]; (b, correct) build passes because no sample slug hits that branch; a request to `/help/admin-preview` errors at runtime; (c) the admin-preview branch is silently statically rendered [wrong]; (d) `cookies()` returns an empty value at build [wrong]. Feedback reinforces "build validates only the sample params' paths."

---

### Reading older codebases: the getStaticPaths rename

**Goal:** recognition only, so the student isn't lost in pre-App-Router tutorials/codebases. One short section, no exercise.

Content:
- One paragraph: the Pages Router predecessor was **`getStaticPaths`** (which URLs to build) paired with **`getStaticProps`** (the data for each). The App Router collapses this: `generateStaticParams` replaces `getStaticPaths`, and the page's own `async` body + cached read helper replace `getStaticProps`. The `fallback: 'blocking' | true | false` option of `getStaticPaths` maps roughly onto today's dynamicParams/on-demand behavior. Name it so the student recognizes the old shape in a tutorial and knows the modern equivalent — then move on. No code archaeology.

**Tooltip terms:** `getStaticPaths`, `getStaticProps` (legacy Pages-Router functions, named for recognition only — the App Router replaced both).

Optionally a one-line forward note that `dynamicParams = false` (the closed-list 404 toggle) still exists but has sharp edges under Cache Components — keep it to a single `Aside` (caution), recognition-level, not a taught beat, since the ecosystem (GitHub discussions) shows nesting/inheriting caveats. Do **not** build it out; the clean either/or (catalog with samples vs. plain dynamic page) covers the student's real needs.

---

### External resources (optional, end of lesson)

One or two `ExternalResource` / `LinkCard`s only if they add real value:
- The official `generateStaticParams` API reference.
- The "Dynamic routes — With Cache Components" docs section (the authoritative source for the validation-only-covers-sample-paths behavior).
Keep to two max; this is supplementary, not required reading.

---

## Scope

**This lesson teaches:** `generateStaticParams` as the build-time hook that materializes dynamic segments under Cache Components; the return-the-catalog-not-the-data contract; the two-condition decision rule; the production content-page shape (compose with `'use cache'` + `cacheTag` + `cacheLife` + `revalidateTag`); partial materialization and correct on-demand behavior; the empty-array build error; the build-time-validation-only-covers-sample-paths trap; the `getStaticPaths` rename for recognition.

**Explicitly out of scope — do not (re)teach, recap in one line at most where prerequisite:**
- **`'use cache'`, `cacheLife`, `cacheTag` mechanics** — owned by chapter 032 lessons 3/4. Here: compose and recap only, never derive the three-number `cacheLife` contract or the `tags.ts` helper internals.
- **`revalidateTag` / `updateTag` / post-mutation invalidation** — chapter 032 lesson 6. Here: one call in the worked example with the mandatory two-arg form, no decision tree (that's ch.032).
- **React `cache()` request-scoped memoization vs `'use cache'`** — chapter 032 lesson 5. The dedup the student needs here is the *automatic* one across `generate*`/page/metadata (state it as a fact); if a non-fetch DB read needs explicit memoization across `generateStaticParams` + page + `generateMetadata`, name `cache()` as the tool in one clause and point to ch.032 l5 — don't teach it.
- **`generateMetadata`** — chapter 034 lesson 6 (just taught). Here: one sentence that `generateMetadata` *also* runs at build for materialized params and shares the same deduped read; do not re-teach the Metadata API.
- **Nested / parent-child `generateStaticParams`** (`[category]/[product]`, bottom-up vs top-down, the `params` argument) — recognized via the one return-type table row only; the multi-segment generation pattern is a niche the SaaS student rarely hits. Cut the deep treatment.
- **`searchParams` makes a route dynamic** — chapter 033 lesson 4. Name as a one-line boundary in the decision section; don't re-teach.
- **Route Handler `generateStaticParams`** (static API responses) — mention in at most one clause if at all; the lesson's spine is *pages*. Likely cut entirely to protect focus.
- **`dynamicParams = false`** — recognition-level `Aside` only (closed-list 404 toggle, sharp edges under Cache Components). Not a taught beat.
- **CMS integration patterns**, **cursor pagination** (chapter 038), **the build/deploy pipeline itself**, **self-hosted vs Vercel build differences** — out of scope entirely.

**Prerequisites the student already has (recap in ≤1 line if touched):** Cache Components dynamic-by-default model and `'use cache'`/`cacheLife`/`cacheTag` (ch.032); `params` is a Promise, `await params` (ch.032/033); `cacheComponents: true` and `typedRoutes` in `next.config.ts` (ch.034 l1); `(marketing)`/`(app)` route groups and the Acme fiction (ch.029 + chapter continuity); the `db/queries/` read-helper convention and `tags.ts` helper (conventions + ch.032).

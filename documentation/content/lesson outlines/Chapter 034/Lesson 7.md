# Lesson title

- Title: Robots, sitemaps, icons, and viewport
- Sidebar label: SEO file conventions

# Lesson framing

This is the second SEO lesson, closing the chapter's metadata arc. Lesson 6 taught the three *per-page* metadata mechanisms (static `metadata`, `generateMetadata`, `opengraph-image.tsx`). This lesson teaches the *site-level* surface: the handful of framework-named files that live near the root of `app/` and emit the standards-mandated SEO and platform artifacts a crawler, an OS, or a mobile browser expects — `robots.txt`, `sitemap.xml`, the favicon/touch-icon set, the PWA manifest — plus the one metadata field that is *not* metadata: the separate `viewport` export.

The through-line that organizes the whole lesson (state it once in the intro, reuse as the spine): **these are not files you hand-write into `/public` anymore; they are typed, code-generated, cached route handlers that the platform discovers by filename and wires into `<head>` for you.** Every piece in this lesson is the same shape — a file convention that replaces a hand-maintained artifact with a typed function whose output the CDN serves. The senior payoff over the historical "drop a `robots.txt` in the static folder" approach is threefold and worth naming explicitly: (1) **typed** (a `Robots` / `MetadataRoute.Sitemap` object, autocompleted, type-checked — typos become build errors); (2) **dynamic** (read the environment, query the database for indexable rows); (3) **cached by default** (static at build, served from the CDN, zero function invocation — *unless* you reach for a request-time API, which silently flips them dynamic — the chapter-wide Cache Components reflex applies here too).

Pedagogical stance. This is a breadth lesson over a small, low-conceptual-difficulty surface — there is no single hard idea like hydration or the cache model; the difficulty is *knowing the surface exists and which file owns which artifact*. So the lesson optimizes for a **map the student can recall**, not deep derivation of any one file. Lead with the senior question (a checklist of "every SaaS needs X" artifacts), then walk each file convention in the order a real project adds them. Keep each file's treatment tight: the shape, the one senior decision it carries, the watch-out. Three teaching beats earn extra depth because they carry a real decision or a real footgun: **env-aware `robots.ts`** (the staging-leak prevention pattern — a genuine production incident if botched), **the `viewport`-is-a-separate-export rule** (the single most common build warning students will hit, and a non-obvious API split), and **the cached-by-default / request-time-API-flips-dynamic property** (the chapter's caching reflex, applied to these special handlers — `sitemap.ts` reading `cookies()` burns an invocation per crawl). Everything else (manifest, multi-size icons, dynamic icons, `generateImageMetadata`, JSON-LD) is named at recognition depth so the student recognizes it in a codebase without it bloating the map.

Keep the worked example as the payoff: one coherent **root SEO bundle** the student assembles file-by-file, so the abstract map lands as a concrete `app/` directory they could copy into a real project.

Coherence with the rest of the chapter. Reuse the established **Acme** fiction: origin `app.acme.com`, the marketing/help surfaces, the title template `'%s — Acme'`, and the `app/(app)` / `(marketing)` route groups. The brand-fallback `opengraph-image.png` whose *place in the full bundle* lesson 6 explicitly deferred to here is the natural recap hook. Do not re-teach `ImageResponse` / Satori / `generateMetadata` / `metadataBase` derivation — those are lesson 6's; recap in one line and link back. The Cache Components "static by default" model is chapter 032's; reuse, do not re-derive.

# Lesson sections

## Introduction (no header)

Open with the senior question as a concrete artifact checklist, framed as a launch-readiness gap. Scenario: the Acme app's pages render and its per-page metadata is wired (lesson 6), but a pre-launch crawl/audit flags the *site-level* gaps — no `robots.txt`, no `sitemap.xml`, a default Vercel favicon in the browser tab, no Apple touch icon when someone adds the app to their iPhone home screen, a mobile address bar that doesn't match the brand, and (the dangerous one) the staging deploy is fully indexable by Google. Historical web answered each by hand-maintaining a file in `/public`; Next.js 16 ships a typed file convention for every one.

State the lesson goal: by the end, the student can stand up the complete root SEO/platform file bundle for a new SaaS, knows which filename owns which artifact, and carries the reflex that these are cached route handlers to keep pure. Name the spine sentence (typed + dynamic + cached-by-default file conventions replacing hand-maintained `/public` files). Keep it brief and warm; preview the worked root bundle as the concrete payoff.

Pedagogical note for the author: this is the moment to plant the *map*. A small **orientation diagram** here pays off for the whole lesson — see the diagram described in the next section, placed immediately after the intro prose.

## The file-convention map

Goal: install the mental map before any single file, so every subsequent section is "filling in a cell" rather than a disconnected fact. This directly serves the cognitive-load priority — the student gets the whole shape first, simplified, then we add detail.

Content: one short paragraph establishing the unifying property (filename-discovered, typed, code-generated, cached route handler, auto-wired into `<head>` or served at a well-known path), then the diagram.

Diagram — **`app/` root tree → emitted artifact** mapping (the lesson's anchor visual). Use a Starlight `<FileTree>` for the left side (the files as they sit in `app/`) paired with, or followed by, a simple two-column HTML+CSS table-style mapping (`<Figure>`-wrapped) showing `file in app/` → `what the platform emits / the head tag or URL it produces`. Rows: `robots.ts → /robots.txt`; `sitemap.ts → /sitemap.xml`; `favicon.ico → <link rel="icon">`; `icon.{png,svg} → <link rel="icon" href="/icon?…">`; `apple-icon.png → <link rel="apple-touch-icon">`; `manifest.ts → <link rel="manifest"> + /manifest.webmanifest`; `opengraph-image.png → og:image (recap, ch.034 l6)`; `viewport export → <meta name="viewport"> + <meta name="theme-color">`. The pedagogical goal: make "which file owns which output" a glanceable picture the student can reconstruct from memory. Keep it horizontal and compact per the vertical-space constraint. Caption ties it to the spine sentence.

Author guidance: this map is the table of contents for the lesson body; order the following sections to match its rows roughly (crawl-control files → icons → viewport → manifest → caching property → worked bundle).

## robots.ts: telling crawlers where to go

Goal: teach the `robots.ts` shape and, more importantly, the **env-aware staging-leak** pattern — the one genuinely production-consequential decision in this lesson.

Content:
- The shape. Default-exported function returning a typed `Robots` object (`import type { MetadataRoute } from 'next'`, return `MetadataRoute.Robots`): `{ rules: [{ userAgent, allow, disallow }], sitemap, host }`. Platform serves it at `/robots.txt`. Use a plain `Code` block for the minimal production-allow version — it's short and the focus is the object shape, not multiple parts.
- The senior decision: **per-environment robots**. The dangerous default is that a preview/staging deploy is fully crawlable, leaking unfinished pages and (worse) creating duplicate-content competing with production in the index. One `robots.ts` reads an environment signal and branches: production returns `allow: '/'` (with targeted `disallow` for private areas like `/api`, `/dashboard`, `/(app)` routes); every non-production environment returns `disallow: '/'`. Show this with `CodeVariants` is overkill — instead use a single `AnnotatedCode` over the env-branching `robots.ts`: step 1 highlights the env check, step 2 the production rule shape, step 3 the `disallow: '/'` staging shape, step 4 the `sitemap`/`host` fields pointing at the canonical origin. This directs attention to the branch as the load-bearing part.
- The env signal — important correctness note for the author. Do **not** key the index gate on `process.env.NODE_ENV` (it is `'production'` on Vercel preview deploys too — preview *is* a production build). The correct discriminator on Vercel is `process.env.VERCEL_ENV` (`'production' | 'preview' | 'development'`); gate indexing on `VERCEL_ENV === 'production'`. The course's typed-env discipline (chapter 081 l7, `@t3-oss/env-nextjs`) is the eventual home for reading this; here name it as a plain `process.env.VERCEL_ENV` read with a one-line forward reference that env access gets a typed wrapper later. This is the single most important watch-out in the section — call it out in prose, not just a list.
- `sitemap` and `host` fields point at the absolute production origin (reuse `app.acme.com`); note these want the canonical origin even on preview so a leaked preview robots still points crawlers at prod.
- Watch-out (inline, in the env paragraph): an env-aware `robots.ts` that misreads the flag and ships `disallow: '/'` to production silently delists the entire site — the failure is invisible until organic traffic craters weeks later. Frame as production stakes. The inverse (preview indexed) is the duplicate-content leak. This is why the discriminator choice is load-bearing.

`Term` candidates: **crawler / bot** (brief), **Robots Exclusion Standard** (what `robots.txt` implements). Keep `disallow` ≠ security: a one-clause note that `Disallow` is a polite request, not access control — private routes need real auth, not a robots rule. (Forward-ref auth, do not teach.)

## sitemap.ts: the index of what to crawl

Goal: teach the `sitemap.ts` shape, the static-vs-database-driven split, and the cached-by-default property in its most consequential form.

Content:
- The shape. Default-exported function returning `MetadataRoute.Sitemap` — an array of `{ url, lastModified, changeFrequency, priority }`. `url` must be absolute. Platform emits valid sitemap XML at `/sitemap.xml`. `Code` block for a static array of the marketing routes (`/`, `/pricing`, `/blog`, `/help`) — short, focus is the array shape.
- The senior reach: **database-driven sitemap**. A SaaS's public surface isn't only static marketing pages — it's public help articles, public profiles, published blog posts. The function is `async`; it queries the indexable rows and maps them to entries. Show with a second `Code` block (or a `CodeVariants` pairing static-only vs database-augmented if the before/after helps) that `await`s a `db/queries` read (reuse the course's `db/queries/<entity>.ts` verb-led helper convention — e.g. a `listPublicHelpArticles()` returning slug + `updatedAt`) and concatenates static + dynamic entries. Emphasize: only *publicly indexable* rows — never authenticated or tenant-scoped data in a sitemap (that both leaks and is useless to crawlers). Tie `lastModified` to the row's real `updatedAt` so crawlers recrawl on edits.
- The cached-by-default property — **the chapter caching reflex, applied here**. `sitemap.ts` is a special route handler, static by default: the build renders it once and the CDN serves it. The watch-out that earns depth: reading a request-time API (`cookies()`, `headers()`) inside `sitemap.ts` flips it dynamic, so it re-runs the database query on *every crawler hit* — wasted invocations on a file that should be one cached artifact. Keep it pure; derive everything from build-time data. This is the same reflex from chapter 032 / lesson 6, named explicitly as recurring. A short `Aside` (caution) reinforces it.
- Large sitemaps — recognition depth only. Google rejects a sitemap over 50,000 URLs or 50 MB. `generateSitemaps` (named, one sentence) returns an array of `{ id }` objects; the platform emits one numbered sitemap per id (`/sitemap/0.xml`, `/sitemap/1.xml`) plus an index. State the threshold and that most SaaS apps never hit it; do not build it. This keeps the map complete without bloating it.

`Term` candidates: **sitemap** (what it is, one line). Reuse `cache()` / cached-route-handler framing from prior lessons; do not redefine.

Author note: the database-driven sitemap is the place to reinforce that build-time reads can dedupe via React `cache()` across `generateStaticParams` / page / sitemap — but that's lesson 8's territory; keep it to a one-line forward reference, do not teach `cache()` dedup here.

## Icons: favicon, icon, and apple-icon

Goal: teach the three icon file conventions, the static-image path as the default, multiple sizes, and the dynamic path at recognition depth. This is mostly a "know the filenames and the supported formats" section — keep it tight and reference-table-shaped.

Content:
- The three conventions, as a small table (HTML+CSS or a Starlight table inside the prose). Verified against Next 16.2 docs — author must match exactly:
  - `favicon.ico` — root `app/` only; emits `<link rel="icon" href="/favicon.ico" sizes="any">`. The legacy single-file favicon.
  - `icon.{ico,jpg,jpeg,png,svg}` — any route segment; emits `<link rel="icon">` with `type`/`sizes` inferred from the file. SVG (or undetermined size) gets `sizes="any"`.
  - `apple-icon.{jpg,jpeg,png}` — any segment; emits `<link rel="apple-touch-icon">`. (Note: no `.svg` and no `.ico` for apple-icon — Apple touch icons are raster only.)
- The default path: drop static image files in `app/`. Platform hashes, fingerprints, caches, and injects the `<link>` tags — no manual `<head>` editing, no manual cache-busting. This is the senior default; reach for dynamic generation only for a real reason.
- **Multiple sizes — correctness note, the chapter outline is wrong here.** Next 16 sets multiple icons via a **numeric suffix** (`icon1.png`, `icon2.png`, …), sorted *lexically* — NOT the `icon-32x32.png` WxH-suffix shape the chapter outline brainstorm wrote. Author MUST teach the numeric-suffix form. Practical guidance still stands: ship a small set covering the common targets — a high-res `icon` (e.g. 512), a mid `icon` (192) for Android/PWA installs, an `apple-icon` (the iOS home-screen tile), and the legacy `favicon.ico`. The *sizes* attribute is inferred from each file's actual pixel dimensions, so the filenames carry no dimension info — the bytes do. Show the resulting `app/` tree in a `<FileTree>`.
- Dynamic icons — recognition depth. `icon.tsx` / `apple-icon.tsx` default-export a function returning an `ImageResponse` (from `next/og`), with optional exported `size` and `contentType` consts. Reach: per-org branded favicons, A/B-tested marks — rare for app surfaces. One sentence + a tiny snippet is enough; do not re-teach `ImageResponse` (lesson 6). Correctness note: the dynamic icon function receives `params` as a **Promise** in Next 16 (`await params`), matching the `generateMetadata` shape — mention only if showing the dynamic snippet.
- `opengraph-image` / `twitter-image` recap — one paragraph. These are the *image* metadata files from lesson 6; their place in the **root SEO bundle** is that a root-level `opengraph-image.png` (+ `opengraph-image.alt.txt`) is the brand-wide social-preview fallback every route inherits unless it overrides. This is the deferred-from-l6 hook. Watch-out: multiple OG fallbacks across nested layouts collide silently — keep the fallback root-only. Recap only; link back to l6 for `ImageResponse`.
- `generateImageMetadata` — named once (multi-image arrays per segment, receives an `id`). Rarely needed for app surfaces; recognition only.

Watch-outs (fold into the relevant bullets, not a trailing list): apple-icon must be raster (png/jpg), not svg; favicon only lives at the root; an apple touch icon that's too small renders blurry on the iOS home screen (a device/platform expectation around ~180×180, not a Next.js hard requirement — phrase as "ship a generously-sized apple-icon," do not assert Next rejects it).

`Term` candidates: **favicon** (one line), **apple touch icon** (the iOS home-screen icon), **PWA** (define here, reused by manifest section).

## The viewport export: the field that isn't metadata

Goal: teach the separate `viewport` export and `themeColor`, and drill the **viewport-belongs-in-its-own-export** rule — the highest-frequency build-warning footgun in the chapter for these surfaces, and a non-obvious API split worth a focused beat.

Content:
- The split, stated up front as the load-bearing rule: viewport-affecting fields are **a separate `export const viewport: Viewport`**, not keys inside `metadata`. Putting `themeColor` / `colorScheme` / `width` / `initialScale` inside the `metadata` object is a deprecated shape that triggers a build warning (deprecated since Next 14, enforced through 16). Frame the *why*: these fields drive a different `<meta>` tag family (`viewport`, `theme-color`, `color-scheme`) on a different cadence than the SEO/social tags `metadata` owns, so Next split them into their own typed export. `import type { Viewport } from 'next'`.
- The canonical shape — `Code` block: `export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f172a', colorScheme: 'light dark' }`. Walk each field briefly: `width: 'device-width'` + `initialScale: 1` is the mobile-correct default (scaffold ships it; don't fight it); `colorScheme: 'light dark'` declares the app supports both; `themeColor` tints the mobile browser chrome (Safari/Chrome address bar) to match the brand surface.
- `themeColor` light/dark — when the app has both themes, `themeColor` takes an **array of `{ media, color }`** entries (`(prefers-color-scheme: light)` → light chrome, dark → dark chrome) so the address bar matches the active theme. Show the array form as the senior pick for a theme-switching SaaS; the single-string form is the simple default. This is the one real decision in the section.
- `generateViewport` — named once (same Promise/`await` shape as `generateMetadata`, for route-dependent viewport like per-locale `colorScheme`). Rare; recognition only. Sharpening note worth one clause (verified, Next 16.2): unlike metadata, **viewport cannot be streamed** — it affects initial-load UI, so a `generateViewport` that reads runtime data (`cookies()`) blocks the *entire route* with no static shell. This makes "keep viewport static" a stronger rule than for metadata; only the static `viewport` object is right for the common case.
- Watch-out (inline, in the opening rule): the `metadata`-nested viewport field is *silently* a warning, not an error — the page still builds, the tag may still emit, but it's the deprecated path and will eventually break. The fix is mechanical: move the field to the `viewport` export. Because lesson 6 left the root layout's `export const metadata` placeholder, this is where the sibling `export const viewport` lands in that same root layout — make the worked example show both side by side so the split is visually obvious.

`Term` candidates: **viewport meta** (what it controls — the mobile rendering width), **theme-color** (browser-chrome tint). Keep these short; the audience knows mobile browsers exist.

Pedagogical note: a tiny **before/after `CodeVariants`** is ideal here — tab 1 "the warning" (viewport fields wrongly nested in `metadata`), tab 2 "the fix" (split into the two exports). This is the clearest way to cement a rule that's about *where code goes*, not what it does.

## The web manifest: add to home screen

Goal: name the `manifest.ts` convention and the minimum-viable PWA-install metadata, at low depth — full PWA is explicitly out of scope, but a basic manifest is cheap and unlocks "Add to Home Screen."

Content:
- The shape. `manifest.ts` default-exports a function returning `MetadataRoute.Manifest` (`name`, `short_name`, `description`, `start_url`, `display`, `background_color`, `theme_color`, `icons`). Platform serves `/manifest.webmanifest` and injects `<link rel="manifest">`. Short `Code` block of a minimal manifest reusing the Acme brand + the icon set already declared.
- The senior framing: a basic manifest costs nothing and makes the app installable (home-screen icon, standalone display, splash colors). Full PWA (service worker, offline, push) is a deeper topic, out of scope — name the boundary so the student doesn't think "manifest = full PWA." The `icons` array here typically points at the 192 and 512 marks (the PWA-install sizes) — tie back to the icon section.
- One-line note: a static `public/manifest.webmanifest` is the alternative; the `.ts` convention wins for the same typed/dynamic reasons as the rest of the lesson (e.g. brand strings from one config).

`Term`: **PWA** already defined in the icon section — reuse, don't redefine. Maybe **standalone display** (one line, the app-without-browser-chrome mode).

Keep this section short — it's a recognition/completeness beat, not a deep teach.

## These are cached route handlers: keep them pure

Goal: consolidate the **cached-by-default + request-time-API-flips-dynamic** property as a single cross-cutting principle covering *all* the files in the lesson, now that the student has met each. This is the chapter's caching reflex, and the most transferable senior takeaway of the lesson — it deserves its own short section as the synthesis beat (the property was foreshadowed per-file; here it's named as the unifying rule).

Content:
- One clear statement: `robots.ts`, `sitemap.ts`, `icon.tsx`, `apple-icon.tsx`, `manifest.ts`, `opengraph-image.tsx` are all special route handlers, **statically generated at build and served from the CDN by default** under Cache Components — zero per-request work. They flip to dynamic *only if* they read a request-time API (`cookies()`, `headers()`, uncached external data) or set a dynamic route-segment config.
- The reflex: keep them pure / build-time-derivable so the platform can cache them. A `sitemap.ts` that calls `cookies()` runs the database query on every crawl; a `robots.ts` that reads a header re-computes per request. The whole value proposition (one cached artifact served forever) collapses the moment a request-time read sneaks in. Frame as the same discipline taught for the cache model in chapter 032 and the OG-image caching in lesson 6 — explicitly "you've seen this reflex before; it applies to every file in this lesson."
- The viewport exception worth one line (verified Next 16.2): viewport is the *strictest* case — it cannot be streamed (it gates initial-load UI), so a runtime-reading `generateViewport` blocks the whole route with no static shell. The escape hatch when external (non-runtime) data is genuinely needed is `'use cache'` inside the function (recognition only; ties to ch.032). Reinforces: prefer the static `viewport` object.
- Mention the deploy-warming angle as the practical corollary (brief): a dynamically-generated OG/icon is cold on first request (Satori render takes a few hundred ms); a post-deploy hook that pings key OG URLs warms the CDN before a bot scrapes. Static image files don't need this; it's specific to the `ImageResponse`-generated ones. One or two sentences — recognition depth, ties back to l6's dynamic OG without re-teaching it.

Component: a small **`Buckets` exercise** fits perfectly here as a comprehension check — two buckets, "stays static (cached)" vs "flips dynamic (runs per request)", and items the student sorts: `sitemap.ts` returning a hardcoded array; `sitemap.ts` reading `cookies()`; `robots.ts` branching on `process.env.VERCEL_ENV` (static — env is build-time); `icon.tsx` reading `headers()`; a static `apple-icon.png`; an `opengraph-image.tsx` fetching uncached data per request. This drills the exact judgment the section teaches. Grading: each item in its correct bucket. This is the best assimilation tool for the lesson's most transferable rule.

`Term`: reuse **Cache Components** / static-by-default framing from ch.032; do not redefine.

## Assembling the root SEO bundle

Goal: the payoff — turn the abstract map into one concrete `app/` directory the student could lift into a real project. This is the worked example the lesson builds toward; everything prior was components, this is the assembly.

Content:
- Present the complete root bundle for Acme as a `<FileTree>` of `app/`: `robots.ts` (env-aware), `sitemap.ts` (marketing routes + public help articles), `favicon.ico`, `icon.png` (+ a second numeric-suffixed mark for the 192/512 split), `apple-icon.png`, `manifest.ts`, `opengraph-image.png` (+ `.alt.txt`) brand fallback, and `layout.tsx` carrying both `export const metadata` (recap from l6 — `metadataBase`, title template) and `export const viewport` (this lesson).
- Then show the key files. The best component here is a **`TabbedContent`** (or `CodeVariants` if treated as related files) grouping the bundle's code: a tab for `robots.ts`, a tab for `sitemap.ts`, a tab for the `layout.tsx` metadata+viewport pair, a tab for `manifest.ts`. Each tab's caption states the one decision that file embodies (env gate / public-rows-only / the two sibling exports / minimal install metadata). This lets the student see the whole bundle as coordinated files without one giant unreadable block. Reuse every snippet already shown in the body verbatim — this section *assembles*, it doesn't introduce new code.
- Close with the spine restated against the concrete bundle: every file here is typed, code-generated, cached-by-default, and discovered by filename — the historical pile of hand-maintained `/public` artifacts, replaced by a typed, environment-aware, CDN-served surface. The student now has the full site-level SEO/platform map to pair with lesson 6's per-page mechanisms.

Author note: do not introduce `metadataBase` / title-template mechanics here (l6); show them in the layout tab as already-wired context with a one-line "from lesson 6" pointer, so the viewport export is seen *next to* the metadata export it's split from.

## External resources (optional)

`ExternalResource` cards (a small `CardGrid`) linking the canonical Next.js docs the student will return to: the Metadata Files file-convention reference, the `sitemap.xml` page, the `robots.txt` page, the favicon/icon/apple-icon page, and `generateViewport`. These are the authoritative, frequently-updated sources for a reference-heavy surface — appropriate to link rather than memorize.

No YouTube video proposed: the surface is reference-shaped (filenames, object shapes) and well-covered by the diagram, the `Buckets` exercise, and the worked bundle; a video would not add over the official docs cards. If the author finds a high-quality "Next.js SEO file conventions" walkthrough it could slot here as a `VideoCallout`, but it is not required.

# Scope

Prerequisites to recap concisely (named, not re-taught):
- **`metadata` / `generateMetadata` / `opengraph-image.tsx` / `ImageResponse` / Satori / `metadataBase` / title templates / `alternates.canonical`** — all lesson 6 (ch.034). This lesson recaps the *root brand `opengraph-image.png`'s place in the bundle* and links back for everything else. Do NOT re-teach OG image generation.
- **Cache Components "static by default" model**, `use cache`, cached route handlers — chapter 032. Reuse the framing; do not re-derive. This lesson applies the reflex to the SEO files.
- **`cookies()` / `headers()` as request-time APIs that opt a render dynamic** — chapter 033 l1. Named as the thing that flips these files dynamic; not re-taught.
- **Route groups `(app)` / `(marketing)`, layouts, root layout** — chapter 029. Used as established structure.
- **`db/queries/<entity>.ts` verb-led read helpers** (`listPublicHelpArticles`) — code-convention shape, referenced for the database-driven sitemap; the actual data layer / tenancy is Unit 10+, so show the call, not the implementation.
- **Typed env (`@t3-oss/env-nextjs`)** — chapter 081 l7. The eventual home for the `VERCEL_ENV` read; here a one-line forward reference, read `process.env.VERCEL_ENV` directly.

Explicitly OUT of scope (defer, do not teach):
- **Dynamic OG/icon generation in depth** (`ImageResponse`, Satori constraints, fonts in OG) — lesson 6 owns it; recognition-depth recap only here.
- **`generateStaticParams` / build-time materialization / `cache()` request-dedup across page+metadata+sitemap** — lesson 8 (ch.034). One-line forward reference at most.
- **`use cache` / `cacheTag` / `cacheLife` / `revalidateTag` mechanics** — chapter 032 l3/l4/l6. The files are "cached by default"; do not teach the cache primitives or invalidation here.
- **Full PWA** (service worker, offline, install prompt, push) — out of course scope at this point; manifest is install-metadata only.
- **Security headers / CSP / the fact that `Disallow` is not access control beyond one clause** — chapter 081. Auth-gating private routes is referenced as "real auth, not robots," not taught.
- **i18n SEO: `hreflang`, `alternates.languages`, per-locale sitemaps, `og:locale`, per-locale OG images** — chapter 084. Do not touch internationalized sitemap/metadata shapes.
- **Structured data / JSON-LD / Schema.org** — name once at most as a recognition-depth "exists, reach for marketing/content surfaces"; the chapter outline lists it as a maybe. Do NOT build it; it's not a file convention and dilutes the lesson's spine. Recommend cutting it to a single sentence or omitting entirely if it crowds the map.
- **Core Web Vitals depth / Lighthouse / measurement** — chapter 094. The `themeColor`/viewport beats touch UX, not perf metrics.

# Code conventions notes

- Config/file shape: TypeScript file conventions, `import type { MetadataRoute, Viewport }` (type-only imports under `verbatimModuleSyntax`), single quotes, 2-space indent — per the chapter's established config conventions.
- Framework carve-out: these file-convention files **default-export** their function (framework-dictated, like `layout.tsx`/`page.tsx`) — note this is the documented exception to the course's named-export default, consistent with how l6 handled `opengraph-image.tsx`.
- Data layer: the database-driven sitemap reads through a `db/queries/<entity>.ts` verb-led helper (`listPublicHelpArticles()`), not an inline `db.select()` — matches the conventions' data-layer rule. Show the call site only; the helper body and `tenantDb` tenancy are later units. Public/indexable rows only — never tenant-scoped data through a sitemap (it's both a leak and useless to crawlers; aligns with the never-personalize-shared-surfaces rule from l6).
- Env access: `process.env.VERCEL_ENV` shown directly with a forward reference to the typed-env wrapper (ch.081 l7). Deliberate staging — note for downstream that the typed `env` object is the eventual form.
- Deliberate divergences downstream must keep: (1) numeric icon-suffix form (`icon1.png`), NOT the chapter outline's `icon-32x32.png` WxH form — the outline brainstorm is stale, verified against Next 16.2 docs. (2) `robots.ts` env gate keys on `VERCEL_ENV`, not `NODE_ENV` (which is `'production'` on preview) — the outline's generic "env flag" is correct in spirit but the discriminator matters. (3) apple-icon size guidance phrased as "ship a generously-sized raster icon (~180×180+)" as a device expectation, NOT "Next.js rejects under 180×180" (no such Next constraint exists).

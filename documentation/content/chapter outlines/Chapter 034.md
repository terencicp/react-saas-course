# Chapter 034 — Project config, platform primitives, and SEO

## Chapter framing

Chapter 034 covers the project-level surface a Next.js 16 app exposes outside the route tree: the typed `next.config.ts`, the platform components (`next/image`, `next/font`, `next/script`), the Metadata API and its SEO file conventions, and `generateStaticParams` for build-time route materialization. Where 033–037 taught how routes render and how requests flow, this chapter teaches the configuration and conventions that wrap the routes. The student leaves with a working map of "what lives where" and the senior reflexes for each: when configuration earns its weight, when a file convention beats imperative code, what the platform gives for free, and what costs accrue silently if defaults go unchecked.

Threads that run through every lesson: prefer file conventions over imperative APIs when the platform offers both (cacheable, discoverable, typed); name the platform default first, then the conditional power-tool with its threshold; the image, font, and script pipelines exist because plain `<img>` or `<link>` silently regresses Core Web Vitals — every primitive structurally enforces against a known failure mode; SEO and social previews are not optional polish for a SaaS, they shape acquisition and the senior treats them as production code; under Cache Components (lesson 1 of chapter 032), most outputs in this chapter are static by default and the senior reflex is to keep them that way unless data shape forces otherwise. The chapter ships eight teaching lessons plus a quiz. The unit closes with the chapter 035 project on routing.

---

## Lesson 1 — The typed next.config.ts

Teaches the typed `next.config.ts` surface as a one-screen map (`cacheComponents`, `typedRoutes`, `images`, `headers`, `experimental`) and `serverExternalPackages` as the lever for Node-native SDKs that break Turbopack bundling.

Topics to cover:

- **The senior question.** A new project's `next.config.ts` is five lines. Over a year it accretes image domains, redirects, security headers, and a stubborn SDK that won't bundle. What lives here, and what's the cost of each entry? The lesson orients the student to the typed config and to `serverExternalPackages` as the canonical "this SDK breaks bundling" lever.
- **The file shape.** `next.config.ts` exports a default `NextConfig` object; the typed import gives autocomplete and catches typos. Always `.ts`, never `.js` or `.mjs`.
- **The reachable surface — a one-screen tour.** Names the keys the chapter visits (`images`, `redirects`, `rewrites`, `headers`, `serverExternalPackages`, `experimental`, `typedRoutes`, `cacheComponents`) with the lesson each lands in. No deep dives — this lesson is the map.
- **`cacheComponents: true`.** The chapter 032 rendering model is opted in here; flag stays on for every new project.
- **`typedRoutes: true`.** Turns route strings into a typed union — a typo in `<Link href>` becomes a build error. Always on for any non-trivial app.
- **Security headers — forward reference.** `headers()` in config is the canonical place for CSP, HSTS, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`. Full baseline in chapter 081.
- **`serverExternalPackages` — the senior question.** A Node-native SDK (Prisma binaries, `sharp`, certain database drivers, `puppeteer`) breaks under Turbopack because it depends on native modules or dynamic `require`. Listing in `serverExternalPackages` makes Next emit a `require` at runtime instead of bundling.
- **What it actually does.** Opts the package out of Server Component bundling; the runtime uses Node's native `require` resolution. Cost: slightly slower cold start and slightly larger function output, traded for a working SDK.
- **The decision rule.** Try without; add only when the SDK crashes with "module not found" or "native binding missing." Don't preemptively externalize.
- **`transpilePackages` — named once.** For internal monorepo packages shipped as raw TS/JSX. Different problem (transpile in vs. bundle out).
- **Next.js chapter 076 transitive externalization.** Turbopack now correctly externalizes transitive dependencies of packages in `serverExternalPackages` — no more declaring an SDK's internal deps. Named so older configs are recognized.
- **Pre-packaged opt-outs.** Next ships a default list (`@aws-sdk/client-s3`, `@prisma/client`, `sharp`, others). Check before adding manually.
- **Reading and reloading.** Read at startup; most changes require a dev-server restart.
- **Worked example.** Minimal production `next.config.ts`: `cacheComponents`, `typedRoutes`, one-entry `serverExternalPackages`, placeholder for `headers()`, typed import. Under thirty lines.
- **Watch-outs.** Forgetting to restart after a config edit runs the old config; `experimental` keys come and go between minor versions; over-externalizing adds cold-start tax with no benefit; mixing `.js` and `.ts` configs is a footgun; using `serverExternalPackages` to "fix" a missing-dependency bug hides the real problem.

What this lesson does not cover:

- Image config (next lesson).
- Redirects and rewrites in detail (lesson 3 of chapter 034).
- Security headers (Chapter 081).
- The `cacheComponents` model itself (lesson 1 of chapter 032).

Estimated student time: 25 to 35 minutes.

---

## Lesson 2 — Images with next/image

Teaches `next/image` as the platform default for sized, lazy, format-negotiated images, the required `sizes`/`priority`/`placeholder` props, the Next.js 16 `qualities` requirement, and `remotePatterns` as the mandatory security gate for external sources.

Topics to cover:

- **The senior question.** A product card shows an avatar, a thumbnail from S3, and a hero from design. Plain `<img>` ships oversized images, blows CLS, and tanks LCP (CLS = Cumulative Layout Shift, LCP = Largest Contentful Paint — both Core Web Vitals, depth in lesson 1 of chapter 094). The lesson names `next/image` as the platform default, `remotePatterns` as the security gate for external sources, and Vercel's automatic optimization as the pipeline behind both.
- **What `next/image` gives you.** Automatic `srcset`/`sizes`, modern formats (AVIF, WebP) negotiated via `Accept`, layout-shift prevention via required `width`/`height` or `fill`, lazy loading by default, on-demand optimization. `<img>` is the wrong default in 2026.
- **Required props.** `src`, `width`, `height`, `alt`. `width`/`height` carry intrinsic ratio, not display size — CSS sizes. `alt` is required; empty string for decorative.
- **`fill` for unknown-size containers.** Pair with `sizes` always — without it the browser downloads the largest variant. Prefer fixed dimensions when known.
- **`sizes` — the prop that makes responsive images work.** Pattern: `sizes="(min-width: 1024px) 33vw, 100vw"`. Single most-skipped prop and highest-leverage perf fix.
- **`priority` for the LCP image.** Above-the-fold hero, the avatar in the top nav, the product photo. One per page, ideally. Over-using loses the signal.
- **`placeholder` and `blurDataURL`.** `placeholder="blur"` shows a low-quality preview during load. Static imports get this free; remote sources need a generated blur or inline base64. For heros and large media only.
- **`quality` and the Next.js 16 `qualities` requirement.** Default 75. In 16, the `qualities` array in `next.config.ts` is required if any image uses non-default quality. Declare `qualities: [50, 75, 90]` for common cases.
- **`remotePatterns` — required for external sources.** Shape: `{ protocol, hostname, port, pathname, search }`. Required in 16; without it, an attacker could route arbitrary URLs through the optimizer to consume bandwidth on the account. Name every CDN and storage origin explicitly; never wildcard hostnames in production.
- **`formats` — AVIF and WebP.** Default WebP. AVIF compresses 20% smaller at 50% slower encoding. WebP-only is the senior pick for most SaaS surfaces unless the asset library is large and bandwidth-sensitive.
- **`deviceSizes` and `imageSizes`.** Govern `srcset` widths. Defaults cover common breakpoints; leave alone until profiling shows a gap.
- **Vercel's automatic image optimization.** Edge caching of optimized variants, format negotiation, transform on first request, persistent cache keyed by URL + width + quality + format. Cost: optimization billing on Vercel's plan.
- **Image transforms (light).** Width, quality, format are the only platform transforms — no crop, no overlay. For richer transforms reach for a dedicated service (Cloudinary, Imgix, Cloudflare Images) or run sharp in a background job (Unit 12).
- **Static imports.** `import logo from './logo.png'` produces a typed object with `src`, `width`, `height`, `blurDataURL`. Design-system assets and marketing imagery: `/public` or static imports; user-generated: `remotePatterns`.
- **`unoptimized` escape hatch.** Rare; for SVGs (refused by default for safety) and already-optimized assets. Never `unoptimized` a user-provided SVG (XSS).
- **Self-hosted deploys.** Optimizer requires a sharp-capable function; outside Vercel, `loader`/`loaderFile` route to an alternative. Full pattern in chapter 098.
- **Worked example.** Three images on a product page: static-imported logo, S3 product photo with explicit dimensions and `sizes`, fill-mode avatar. Matching `remotePatterns` and `qualities` entries shown.
- **Watch-outs.** Missing `sizes` on `fill` is the single most common image perf mistake; omitting `priority` on the LCP candidate measurably slows LCP; "just one `<img>`" defeats the structural discipline; wildcard hostnames in `remotePatterns` open the optimizer to abuse; over-using `priority` defeats it; the `qualities` requirement bites on upgrade from 15.

What this lesson does not cover:

- Security headers for image sources (chapter 081).
- Object storage and presigned uploads (chapter 068).
- Self-hosted deployment specifics (chapter 098).
- `next/font` (lesson 4 of chapter 034).

Estimated student time: 45 to 55 minutes.

---

## Lesson 3 — Edge redirects and rewrites

Teaches `redirects()` and `rewrites()` in `next.config.ts` as the edge-applied home for request-independent rules, the `source`/`has`/`missing` pattern syntax, 308-vs-307 SEO consequences, and the decision tree against `proxy.ts` and `redirect()`.

Topics to cover:

- **The senior question.** A SaaS rebrands `/account` to `/settings` permanently. The rule is always-true and request-independent — `proxy.ts` would pay the proxy roundtrip on every request. The lesson names `redirects()` and `rewrites()` in `next.config.ts` as the static, CDN-edge home for request-independent rules.
- **`redirects()` shape.** Async function returning `{ source, destination, permanent }[]`. `permanent: true` is 308; `false` is 307. Applied at the edge, no function invocation.
- **`source` pattern syntax.** Static paths, single-segment params (`/account/:slug`), catch-all (`/blog/:slug*`), optional, constrained (`/items/:id(\\d+)`). Destination references captured params.
- **`has` and `missing` clauses.** Gate on cookie presence, header value, query string. Reach: gating logged-out users on a public URL only when no session cookie. Anything genuinely user-dependent still belongs in `proxy.ts`.
- **`rewrites()` shape.** Same `source`/`destination`, no `permanent`. Returns either an array (after route matching) or an object with `beforeFiles`/`afterFiles`/`fallback`. Most projects use the flat array.
- **Decision tree.** Static and request-independent (legacy URL migrations, marketing renames): `next.config.ts`. Request-conditional (auth, A/B, geo): `proxy.ts` (lesson 2 of chapter 033–lesson 3 of chapter 033). After a Server Action: `redirect()` from `next/navigation` (lesson 4 of chapter 029).
- **Cost story.** Platform applies config rules at the edge — zero function invocation, edge-cached, fast. The proxy is for rules that genuinely depend on the request.
- **Permanent vs. temporary — SEO consequence.** 308 tells search engines to update the index and forward link equity; 307 keeps the old URL indexed. Pick the right one — the wrong choice persists long after the rule is removed.
- **Rewrite vs. redirect, restated for the static side.** Redirect when the new URL should be visible (rename, deprecation); rewrite when the URL implementation changes but the user shouldn't notice. Canonical static rewrite: serving a marketing CMS at `/blog/*` from an upstream service.
- **Externalized rewrites.** `destination: 'https://marketing.example.com/:path*'` proxies to an external origin. Keep the matcher tight — every rewritten request streams through the function.
- **Headers in `next.config.ts`.** Same shape (`source`/`headers`), applied at the edge. Canonical use is the security baseline (chapter 081).
- **`trailingSlash`.** Default false; flipping mid-project breaks every external link. Pick one form at start and lock it.
- **Async data sources.** `redirects()` is async — can read from a JSON file, fetch from a CMS at build, or generate from a manifest. Rare for app teams; common for content-heavy SaaS.
- **Worked example.** Three legacy rules: 308 from `/account/:path*` to `/settings/:path*`, marketing rewrite to an external docs origin, cookie-gated permanent redirect with `has`.
- **Watch-outs.** Edit-without-restart silently runs old rules; manual 301/302 loses POST method semantics — use `permanent: true` (308) or default (307); redirect loops when source and destination overlap; rewriting to an external origin without a tight matcher proxies everything including assets; `trailingSlash` flips after launch are permanent paper cuts; rules apply globally with no per-route override; an unbounded `:slug*` can capture asset paths — exclude.

What this lesson does not cover:

- Conditional redirects in `proxy.ts` (lesson 3 of chapter 033).
- Security headers in depth (chapter 081).
- Route-level redirects via `redirect()` and `notFound()` (lesson 4 of chapter 029).
- I18n routing (chapter 084).

Estimated student time: 30 to 40 minutes.

---

## Lesson 4 — Self-hosted fonts with next/font

Teaches `next/font/google` and `next/font/local` as the build-time self-hosting pipeline that eliminates CLS via fallback metrics, the required `subsets`, variable-font defaults, and the Tailwind CSS-custom-property bridge.

Topics to cover:

- **The senior question.** Plain `<link>` to Google Fonts blocks render, leaks the visitor's IP to Google, and breaks if the CDN degrades. The lesson names `next/font` as the self-hosting and zero-CLS pipeline every 2026 Next.js app uses.
- **What `next/font` does.** Downloads font files at build, self-hosts from the project's origin, generates `@font-face`, computes fallback metrics to eliminate CLS during swap. No external request, no IP leak, no FOUT/FOIT.
- **`next/font/google`.** `const inter = Inter({ subsets: ['latin'] });` returns an object with `className`, `style`, `variable`. Apply to `<html>` or `<body>`; pass `variable` and reference in CSS (`var(--font-sans)`) for Tailwind.
- **`subsets` — required for every Google font.** Latin-only is a fraction of the full font size. Build fails without it; declare every subset actually rendered.
- **Variable fonts — the senior pick.** Ship every weight in one file (often smaller than two static weights). Default to variable when the family has one (Inter, Geist, Roboto Flex); static-with-explicit-weights when not.
- **Weight and style.** For non-variable fonts, list only used weights and styles — each combination is a separate file. For variable, omit both.
- **`display: 'swap'` — the right default.** Shows fallback immediately, swaps when real font loads; pre-computed fallback metrics make the swap invisible. Other strategies are conditional power-tools.
- **`next/font/local`.** `localFont({ src: './fonts/Display-Variable.woff2', variable: '--font-display' })`. Font lives in the repo; same pipeline.
- **Tailwind integration.** Set `variable` on the font, render the CSS custom property on a parent, reference in Tailwind config (`fontFamily.sans: ['var(--font-sans)']`). Variable bridge is the senior pick for any Tailwind app.
- **Loading scope.** Body font in root layout; display or marketing face in marketing layout only; never four families on every route.
- **Geist — the 2026 default scaffold.** `create-next-app` ships Geist Sans and Geist Mono pre-wired. Keep for prototypes; replace with the brand face when the design system arrives.
- **Preloading — automatic.** `next/font` adds preload links automatically. Trust the default; verify with DevTools when LCP regresses.
- **`adjustFontFallback`.** Disables auto-computed fallback metrics. Off by default; leaving it on prevents CLS.
- **What `next/font` does not do.** No runtime CDN fetches; no font without a subset declared; no icon-font optimization (use SVG sprites or Lucide — chapter 027).
- **Worked example.** Root layout with Geist Sans, Geist Mono, and a marketing display face on the marketing layout. Tailwind config references all three through CSS variables.
- **Watch-outs.** Forgetting `subsets` is a build error; loading too many weights inflates payload; mixing class and variable usage wires the wrong family; loading in a Client Component wastes SSR optimization; non-`woff2` files ship larger for no gain; turning off `swap` causes FOIT; importing inside a component re-initializes the font each render — declare at module scope.

What this lesson does not cover:

- Tailwind font configuration in depth (chapter 021).
- Icon libraries (chapter 027).
- Design tokens (chapter 019).

Estimated student time: 30 to 40 minutes.

---

## Lesson 5 — Third-party scripts with next/script

Teaches the four `next/script` strategies (`beforeInteractive`, `afterInteractive`, `lazyOnload`, `worker`), the `onLoad`/`onReady` callbacks, placement and dedup with `id`, and the SDK-over-snippet preference for vendors that ship one.

Topics to cover:

- **The senior question.** Marketing needs a Segment snippet, Stripe.js for checkout, and a heavy customer-support widget. Plain `<script>` tags block hydration, regress LCP, and run on every route. The lesson names `next/script` as the loading-strategy primitive every third-party script flows through.
- **What `next/script` does.** Inserts the script at the right lifecycle moment, deduplicates across renders, attaches `onLoad`/`onError`/`onReady`, prevents render-blocking unless explicitly requested. Structural enforcement against the wrong default.
- **The four strategies.** `beforeInteractive` (rare polyfills only, root layout only), `afterInteractive` (default — most analytics and tag managers), `lazyOnload` (browser-idle — chat widgets, social embeds, non-critical pixels), `worker` (Partytown — experimental, named once). Default to `afterInteractive`; `lazyOnload` aggressively for anything not on the first interaction.
- **`beforeInteractive` — narrow case.** Document HEAD before any Next.js code. Root layout only; not in route segments or Client Components. Reach: A/B variant snippets that must paint before render, or polyfills for older runtimes.
- **`afterInteractive` — default.** Loads after hydration begins. Analytics (PostHog, Plausible), tag managers, error monitoring snippets.
- **`lazyOnload` — non-critical.** Browser idle time, after every other resource. Chat widgets, social embeds, retargeting pixels.
- **`worker` and Partytown — named once.** Offloads to a Web Worker; main thread stays responsive. Experimental; not every script tolerates running off-main-thread (anything touching `document` directly fails).
- **Callbacks.** `onLoad` fires once when loaded; `onError` on network failure; `onReady` on every navigation — useful for re-initializing analytics on route changes (canonical `usePathname` + `onReady` pageview pattern).
- **Placement.** `beforeInteractive` in root layout. Other strategies in any layout or page; the script loads on first matched route and persists. Marketing pixels in marketing layout; app analytics in app layout.
- **`id` for deduplication.** When a script may render in multiple layouts. Required for inline scripts; external scripts dedupe by `src` if `id` is omitted.
- **Inline scripts.** Initializers via `children` or `dangerouslySetInnerHTML`. Set an `id`, pick a strategy. Prefer the SDK form when the vendor offers one.
- **Privacy and consent.** Many analytics scripts require user consent (GDPR/ePrivacy). Gate behind consent state; load with `lazyOnload` and conditionally render. Full consent pattern out of scope; the threshold is named.
- **The performance cost — senior framing.** Every third-party script costs JS execution, network, main-thread. Ask: "what would break if this script disappeared tomorrow?" If "nothing the user sees," push to `lazyOnload` or remove.
- **The SDK alternative.** PostHog, Sentry, LaunchDarkly, most modern vendors ship an npm SDK. Typed, tree-shakable, integrates with React. Prefer SDK; `<Script>` is the fallback.
- **Worked example.** Stripe.js (`afterInteractive` on checkout layout only), PostHog (SDK form — named as the right answer), Intercom widget (`lazyOnload` with `id`). Placement reasoning, not just syntax.
- **Watch-outs.** Defaulting to `beforeInteractive` "just to be safe" tanks LCP; loading marketing pixels on every route runs before consent — gate or move to `lazyOnload`; `<script>` instead of `<Script>` defeats the platform's strategy logic; `strategy="worker"` on a script needing `document` access crashes silently; `<Script>` in a Server Component for dynamic state is a wiring mistake; chat widgets with auto-sounds regress UX even on `lazyOnload`.

What this lesson does not cover:

- Analytics setup (chapter 093).
- Error monitoring SDKs (chapter 092).
- Stripe integration (chapter 064).

Estimated student time: 30 to 40 minutes.

---

## Lesson 6 — Metadata and dynamic OG cards

Teaches the static `metadata` export, `generateMetadata` with cached resource reads, `metadataBase` and `alternates.canonical`, and `opengraph-image.tsx` with `ImageResponse` for per-resource social cards.

Topics to cover:

- **The senior question.** A new invoice page needs a browser-tab title, a search-engine description, and a Slack preview with the company logo, the invoice number, and the customer name. The lesson names the static `metadata` export, the dynamic `generateMetadata` function, and the file-convention `opengraph-image.tsx` as the three coordinated mechanisms.
- **Static `metadata`.** `export const metadata: Metadata = { title: 'Invoices', description: '...' };` from any `page.tsx` or `layout.tsx`. Merges down the tree — child overrides or extends parent. Root layout sets brand-wide defaults; pages override what's page-specific.
- **`title` — string vs. template.** Plain string sets literal; object form `{ default, template, absolute }` interpolates a child's title into a parent template (`{ template: '%s — Acme', default: 'Acme' }` makes `'Invoices'` render as `'Invoices — Acme'`). Template at root, plain strings on pages.
- **Full `Metadata` surface — one-line tour.** `title`, `description`, `keywords`, `authors`, `creator`, `openGraph`, `twitter`, `robots`, `alternates`, `icons`, `verification`. Canonical SaaS reaches: `title`, `description`, `openGraph`, `twitter`, `alternates.canonical`.
- **`alternates.canonical` — SEO discipline.** Tells engines which URL is canonical when the same content is reachable from multiple URLs. Set on every page where query parameters might generate duplicates.
- **`generateMetadata` — dynamic.** Async function receiving `{ params, searchParams }` returning `Metadata`. Detail pages where title and OG card depend on the resource (`Invoice #INV-001 — Acme`).
- **Promise shape.** `params` and `searchParams` are Promises in 16; `await` inside. Fetches here dedupe with the page's fetch via React's `cache()` (lesson 5 of chapter 032).
- **The dedup pattern.** Wrap the resource lookup in `cache()`; `generateMetadata` and the page share one result. Canonical optimization.
- **`notFound()` from `generateMetadata`.** Short-circuits to the `not-found.tsx` boundary when the resource is missing. Existence check lives in the cached helper.
- **OG and Twitter.** `openGraph: { title, description, images: [{ url, width, height, alt }], type }` and `twitter: { card, title, description, images }`. Declare image dimensions explicitly (1200×630 canonical); platforms reject cards with missing dimensions.
- **Dynamic OG images — `opengraph-image.tsx`.** File in a route segment exports a default function returning an `ImageResponse` (from `next/og`). Platform serves at a hashed URL and wires metadata automatically. No `metadata.openGraph.images` field needed when using the file convention.
- **`ImageResponse` and Satori.** Renders a JSX subset (flexbox-style, no grid, limited CSS) to PNG via Satori. Supports custom fonts via `fetch`, dynamic content from `params`. Constraints are intentional — the design surface is narrow.
- **Shape of a dynamic OG file.** Reads `params`, fetches resource via the cached helper, composes JSX, returns `new ImageResponse(<div>...</div>, { width: 1200, height: 630 })`.
- **Fonts in `ImageResponse`.** Fetch font file at runtime, pass via `fonts`. Bundle a small subset to keep response fast. Platform caches aggressively.
- **`opengraph-image.alt.txt`.** Sibling text file supplies `alt`. Always include — accessibility and search engines read it.
- **Caching the OG output.** Cached by default; under Cache Components, treated like any special route handler. Tag with the resource's tag (`cacheTag(\`invoice:${id}\`)`) so a mutation invalidates page and card together.
- **Static fallback `opengraph-image.png`.** A plain image in the route segment ships as the static OG card. Fastest, smallest, zero runtime cost — the senior pick when the card needn't be dynamic.
- **`metadataBase`.** Set in root: `metadataBase: new URL('https://app.example.com')`. Lets the platform generate absolute URLs without repeating the origin. Required for many previews.
- **Request reads in `generateMetadata`.** Allowed but flips metadata dynamic. Derive from `params` and the resource fetch — never personalize OG cards from the session (leaks user data into shared links).
- **Worked example.** Invoice detail page: `generateMetadata` awaits cached `getInvoice(id)`, returns title/description; sibling `opengraph-image.tsx` renders the same data into a 1200×630 card; `not-found.tsx` handles missing resources.
- **Watch-outs.** Same fetch without `cache()` doubles the DB hit; mixing static `metadata` and `generateMetadata` in the same file is a build error; oversized OG images get downscaled and look fuzzy — match the spec; `ImageResponse` runs on Edge (no Node APIs); missing `metadataBase` produces relative URLs some platforms refuse; personalizing OG from the session leaks into shared links.

What this lesson does not cover:

- SEO file conventions for `robots`, `sitemap`, icons (next lesson).
- `generateImageMetadata` for multi-image arrays (named only).
- Structured data (JSON-LD) in depth.
- Auth integration (9).

Estimated student time: 50 to 60 minutes.

---

## Lesson 7 — Robots, sitemaps, icons, viewport

Teaches the SEO file conventions (`robots.ts`, `sitemap.ts`, `icon.{ext}`, `apple-icon`, `manifest.ts`), the separate `viewport` export with `themeColor`, env-aware robots, and post-deploy OG cache warming.

Topics to cover:

- **The senior question.** Every SaaS needs `robots.txt`, `sitemap.xml`, a favicon set that survives every device, an Apple touch icon, a viewport meta with the right mobile behavior, and an OG fallback. Historical Web does this with hand-maintained files in `/public`; Next.js 16 ships file conventions for every piece.
- **`robots.ts`.** File in `app/` exports a default function returning a `Robots` object: `{ rules: [{ userAgent, allow, disallow }], sitemap, host }`. Platform generates and serves `robots.txt`. Typed, versioned, environment-aware.
- **Per-environment robots.** A staging deploy serves `Disallow: /`; production allows indexing. Single `robots.ts` reads an env flag and returns the right shape.
- **`sitemap.ts`.** File exports a default function returning `MetadataRoute.Sitemap` (`{ url, lastModified, changeFrequency, priority }[]`). Platform generates XML.
- **Dynamic sitemap from the database.** Function awaits queries for indexable resources (public help articles, public-profile pages). Wrap reads in `cache()` for build-time dedupe.
- **Large sitemaps.** Google rejects over 50,000 URLs or 50 MB. `generateSitemaps` returns sitemap IDs; the platform emits one per ID plus an index. Most SaaS apps don't hit it; named so it's recognized.
- **Icon file conventions.** `favicon.ico` in `app/` is the legacy favicon. `icon.{png|svg|jpg}` at any route segment generates `<link rel="icon">`; `apple-icon.png` generates `<link rel="apple-touch-icon">`. Platform hashes, caches, and wires the head.
- **Multiple icon sizes.** Adjacent files with size suffixes (`icon-32x32.png`, `icon-192x192.png`) render as separate entries. Ship at least 192 and 512 for PWA installs.
- **Dynamic icons.** `icon.tsx` exports a function returning `ImageResponse`. Reach: branded per-org icons, A/B-tested favicons. Rare for app surfaces.
- **`opengraph-image.tsx` and `twitter-image.tsx`.** Recapped briefly; full coverage in lesson 6 of chapter 034. A root-level `opengraph-image.tsx` provides the brand fallback for every route that doesn't override.
- **`generateImageMetadata`.** Multi-image arrays per route segment; the file-convention function receives an `id`. Named once; rarely needed for app surfaces.
- **The `viewport` export.** `export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#0f172a', colorScheme: 'light dark' };`. Separate export, not nested under `metadata` — putting viewport fields inside `metadata` triggers a build warning.
- **`generateViewport`.** Same Promise/await shape as `generateMetadata`. Used when viewport depends on the route (per-theme `themeColor`, per-locale `colorScheme`). Rare.
- **`themeColor`.** Sets browser chrome color on mobile Safari/Chrome. Match brand surface; declare light and dark variants when the app supports both.
- **`manifest.json` — named once.** `manifest.ts` (file convention) or static `public/manifest.json` declares PWA install metadata. Full PWA is out of scope; basic manifest costs nothing and unlocks "Add to Home Screen."
- **Caching — these are special route handlers.** `robots.ts`, `sitemap.ts`, `icon.tsx`, `opengraph-image.tsx` cached by default. Reading a request-time API opts dynamic; otherwise static. Keep them pure so the platform serves from the CDN.
- **Warming the cache after deploy.** A cold OG image takes a few hundred milliseconds (Satori render). Post-deploy hook hits key OG URLs to warm the CDN before a bot scrapes.
- **Structured data (JSON-LD) — named once.** `<script type="application/ld+json">` describes the entity (Organization, BreadcrumbList, FAQPage) to engines. Reach: marketing or content-heavy SaaS; app dashboards rarely benefit.
- **Worked example.** Root SEO bundle: `app/robots.ts` returns env-aware rules; `app/sitemap.ts` enumerates marketing routes and pulls public help articles; icon set (`icon-192`, `icon-512`, `apple-icon`, `favicon`); `opengraph-image.png` brand fallback; root layout sets `viewport` with light/dark `themeColor` and `metadataBase`.
- **Watch-outs.** `viewport` fields inside `metadata` trigger a build warning; `sitemap.ts` calling `cookies()` burns invocations on every crawler request; missing `metadataBase` produces relative URLs some crawlers reject; env-aware `robots.ts` misreading the env can accidentally `Disallow: /` in production; `apple-icon` smaller than 180×180 is rejected by iOS; multiple OG fallbacks across nested layouts collide silently — root-only is cleanest; JSON-LD with the wrong schema name is silently ignored — validate.

What this lesson does not cover:

- Dynamic OG generation in depth (lesson 6 of chapter 034).
- Full PWA implementation.
- Schema.org in depth.
- I18n sitemaps with `hreflang` (chapter 084).

Estimated student time: 35 to 45 minutes.

---

## Lesson 8 — generateStaticParams for static catalogs

Teaches `generateStaticParams` as the hook that materializes dynamic segments at build time, the `dynamicParams` toggle for closed lists, and the pairing with `use cache` and `cacheTag` for the production content-page shape.

Topics to cover:

- **The senior question.** A marketing site has `/blog/[slug]` with thirty articles. Under Cache Components the route is dynamic by default — every request runs the function, even though content rarely changes. The lesson names `generateStaticParams` as the hook that turns a dynamic segment into a build-time static catalog.
- **What it does.** Exported from a dynamic-segment page, returns an array of `params` objects — one per route to materialize. Build renders each and ships static HTML; runtime requests serve from the CDN with no function invocation.
- **The async shape.** `export async function generateStaticParams() { const slugs = await db.posts.allSlugs(); return slugs.map((slug) => ({ slug })); }`. Runs at build, fetches the catalog once. Platform deduplicates `fetch` calls shared across `generateStaticParams`, the page, and metadata.
- **Interaction with Cache Components.** A route with `generateStaticParams` is materialized at build for the listed params and static for those URLs. Unlisted slugs fall through to the runtime.
- **On-demand path — `dynamicParams`.** When a slug isn't in the build-time list, the default renders on demand. `dynamicParams: false` returns 404 for unlisted slugs — useful for fixed lists. Leave true for catalogs that grow.
- **Decision rule.** Two conditions: catalog enumerable at build (you can list every URL), and content rarely changes between deploys. Yes for marketing pages, blog posts, public help articles, public-profile slugs. No for per-user dashboards, search results, anything keyed on authenticated state.
- **Build-time data fetching.** Function runs in the Node build environment; database, files, upstream APIs all available. Build time scales with catalog size — a few thousand pages fine; tens of thousands needs the index pattern.
- **Pairing with `use cache`.** A `[slug]` page with `generateStaticParams` plus a `use cache` body and `cacheTag(\`post:${slug}\`)` ships static for the build-time set; post-edit invalidation (lesson 6 of chapter 032) busts the cache for the changed slug. Production shape for content surfaces.
- **The ISR shape.** Under Cache Components, the `cacheLife` profile on the `use cache` body governs freshness. A `'days'` profile lets the platform refresh in background; `updateTag` from a CMS webhook busts on edit.
- **Partial static.** Return a subset; rest renders on demand and caches per-request. Reach: long-tail catalog where the top hundred drive most traffic.
- **Legacy SSG mental model.** Older Next called this `getStaticPaths` + `getStaticProps`. Named so students reading older codebases recognize the predecessor.
- **What it does not do.** No request-time run; no per-request data (`cookies()`, `headers()`); not a replacement for `use cache` on arbitrary functions (lesson 3 of chapter 032); doesn't apply without a dynamic segment.
- **Metadata interaction.** `generateMetadata` runs at build for materialized params too. `cache()` lets `generateStaticParams`, the page, and `generateMetadata` share one read per slug.
- **Worked example.** Public help-articles catalog: `app/help/[slug]/page.tsx` exports `generateStaticParams` querying `db.helpArticles.publicSlugs()`, page body uses `use cache` with `cacheTag(\`help-article:${slug}\`)`, editorial CMS webhook calls `revalidateTag` on publish. Fully static for the catalog, with surgical invalidation.
- **Watch-outs.** Empty array makes every URL fall to runtime; function failing at build breaks the deploy — guard with try/catch and a fallback if non-critical; `use cache` body reading `cookies()` is a build error — must be deterministic; tens of thousands of slugs slow the build noticeably; `dynamicParams: false` with an incomplete list returns 404s; `searchParams` doesn't participate in static generation — a route with `searchParams` is dynamic regardless (lesson 4 of chapter 033).

What this lesson does not cover:

- `use cache` and `cacheTag` in depth (lesson 3 of chapter 032, lesson 4 of chapter 032).
- Post-mutation invalidation (lesson 6 of chapter 032).
- Cursor pagination (chapter 038).
- CMS integration patterns.

Estimated student time: 30 to 40 minutes.

---

## Lesson 9 — Quizz

Top 10 topics to quiz:

- The keys that live in `next.config.ts` (image, redirects, rewrites, headers, `serverExternalPackages`, `cacheComponents`, `typedRoutes`) and the dev-server-restart reality.
- `serverExternalPackages` — when an SDK needs externalizing (native bindings, dynamic require), the cost (slightly larger function), the difference from `transpilePackages`.
- `next/image` required props (`alt`, `width`/`height` or `fill`), the `sizes` requirement on `fill`, `priority` for the LCP candidate only, and the new-in-16 `qualities` requirement in `next.config.ts`.
- `remotePatterns` is required for any non-local image source in Next.js 16; wildcard hostnames are an abuse vector.
- The static-vs-conditional decision tree — `next.config.ts` `redirects`/`rewrites` for request-independent rules, `proxy.ts` for request-conditional, `redirect()` from `next/navigation` for action-time.
- `next/font` self-hosts at build, eliminates CLS via fallback metrics, requires `subsets` for Google fonts, and pairs with Tailwind via the `variable` CSS-custom-property bridge.
- `next/script` strategies — `beforeInteractive` (rare polyfills only), `afterInteractive` (default), `lazyOnload` (non-critical), and the SDK preference over the script-snippet form when available.
- The static `metadata` export versus `generateMetadata` for dynamic routes; `metadataBase` is required for absolute OG URLs; `viewport` is a separate export in 16.
- File-convention SEO surface — `robots.ts`, `sitemap.ts`, `icon.{ext}`, `apple-icon`, `opengraph-image.tsx`; all cached by default unless a request-time API is read.
- `generateStaticParams` materializes dynamic segments at build, requires the catalog to be enumerable, pairs with `use cache` and `cacheTag` for the production content-page shape; the rename from `getStaticPaths`.

---

> **Note (`revalidateTag` in Next.js 16):** the single-argument form `revalidateTag(tag)` is deprecated — every call must pass a `cacheLife` profile as the second argument (`'max'` is the senior default), e.g. `revalidateTag(tag, 'max')`.

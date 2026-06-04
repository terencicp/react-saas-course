sources:
  34.1: The typed next.config.ts
  34.2: Images with next/image
  34.3: Edge redirects and rewrites
  34.4: Self-hosted fonts with next/font
  34.5: Third-party scripts with next/script
  34.6: Metadata and dynamic OG cards
  34.7: Robots, sitemaps, icons, viewport
  34.8: generateStaticParams for static catalogs

questions:
  - source: 34.1
    question: |
      You install a database driver, import it in a route handler, and the dev server crashes with `Cannot find module 'pg-native'`. Before reaching for `serverExternalPackages`, what should you check first?
    choices:
      - text: |
          Whether the package is already on Next's built-in external list — most popular Node SDKs (`@prisma/client`, `pg`, `sharp`, and ~80 more) are externalized for you, so adding a config line would be redundant cold-start tax.
        correct: true
      - text: |
          Whether the package belongs in `transpilePackages` instead — a native-binding crash is the signature of a raw-TypeScript package Next needs to compile in.
        correct: false
      - text: |
          Whether you should preemptively externalize every database driver, since native bindings are known to break bundling and it's safer to list them up front.
        correct: false
    why: |
      `serverExternalPackages` is a lever you pull only on a real, unhandled failure — and most of the failures it would fix are already handled. Next ships a large default external list, so the first move is to confirm the package genuinely isn't on it before adding a line that just slows cold start. `transpilePackages` solves the opposite problem (raw TS to compile *in*, not a compiled package to push *out*), and preemptively externalizing buys a slower cold start for no benefit.

  - source: 34.2
    question: |
      A product card renders a thumbnail with `fill` inside a responsive grid, and your reviewer flags it as the single most common `next/image` performance bug. What's missing?
    choices:
      - text: |
          A `sizes` prop — without it the browser can't know how wide the image renders, so it plays safe and downloads the largest variant in the `srcset`, defeating the optimization entirely.
        correct: true
      - text: |
          The `preload` prop — a `fill` image has no intrinsic dimensions, so it can't reserve its box and reduce CLS until it's told to preload.
        correct: false
      - text: |
          Explicit `width` and `height` props — `fill` still needs them to compute the aspect ratio the layout reserves.
        correct: false
      - text: |
          A `quality` value plus a matching `qualities` entry in `next.config.ts`, since `fill` images skip the default 75.
        correct: false
    why: |
      `fill` always travels with `sizes`. Without it the browser assumes the image might fill the viewport and grabs the biggest candidate — the exact oversized-bytes failure the component exists to fix. `width`/`height` are wrong here precisely because `fill` exists for containers whose size you can't hardcode; `preload` is for the one LCP image per page, not a grid thumbnail; and `quality` is unrelated to the sizing failure.

  - source: 34.3
    question: |
      Four URL rules land on your desk. Mark each rule that belongs in `next.config.ts` (`redirects`/`rewrites`) rather than `proxy.ts` or a `redirect()` call. Select all that apply.
    choices:
      - text: |
          Permanently move `/account/:path*` to `/settings/:path*` for every visitor after a rebrand.
        correct: true
      - text: |
          Serve `/docs/*` from an upstream docs origin while the URL stays on your domain.
        correct: true
      - text: |
          Bounce a logged-out-*looking* visitor (no `session_token` cookie present) off `/app` to `/welcome`.
        correct: true
      - text: |
          Send the user to a newly created invoice's page the moment a Server Action finishes saving it.
        correct: false
    why: |
      The routing question is asked first: does the rule depend on who's asking? The rebrand and the docs rewrite are request-blind, so they apply at the edge for free. A `missing`-cookie *presence* check is still edge-cheap — it tests that a cookie exists without decoding or trusting it, a UX nudge the real route re-checks. The invoice redirect is the one outlier: it fires *after application code does work*, so it's `redirect()` from `next/navigation`, not config.

  - source: 34.4
    question: |
      You wire a brand display face through `next/font/local` and reach for the `font-display` Tailwind utility, but the class does nothing. Where's the bug most likely to be?
    choices:
      - text: |
          The font's `variable` CSS custom property is never aliased into a Tailwind token via `@theme` in `globals.css`, so no `font-display` utility is generated.
        correct: true
      - text: |
          There's no `fontFamily: { display: [...] }` entry in `tailwind.config.ts`, which is where v4 registers font tokens.
        correct: false
      - text: |
          The loader is missing `subsets: ['latin']`, which is required for local fonts and blocks the build until added.
        correct: false
    why: |
      The Tailwind bridge is three hops: the loader exposes a `--font-*` variable, the variable className lands on a parent element, and `@theme` in `globals.css` aliases that variable into a token so the utility class exists. A broken bridge is always a broken hop, and forgetting the `@theme` alias is the classic one. There is no `tailwind.config.ts` in this v4 course — fonts are CSS-first tokens. And `subsets` is a Google-font requirement; `next/font/local` reads files you already ship.

  - source: 34.5
    question: |
      Marketing pastes a retargeting pixel into the root `app/layout.tsx` with `strategy="beforeInteractive"`. The build is green and the pixel fires. What's the actual problem?
    choices:
      - text: |
          It now runs ahead of hydration on every route, stealing the main thread from your own code and dragging LCP site-wide — and it can fire before the user has answered the consent banner.
        correct: true
      - text: |
          Without an `id`, Next can't dedupe an external script, so the pixel reloads on every navigation within the layout.
        correct: false
      - text: |
          `beforeInteractive` is illegal outside a route group, so placing it in the root layout is the one mistake here that should have failed the build.
        correct: false
    why: |
      A retargeting pixel is the textbook `lazyOnload`, consent-gated, narrowly-scoped script — `beforeInteractive` in the root layout is its exact opposite on every axis: earliest instead of idle, every route instead of one, eager instead of consent-gated. The `id` decoy is about *inline* scripts (this one has a `src` and dedupes automatically), and the root layout is precisely the one place `beforeInteractive` *is* required to live — so nothing here is a compile error. It's a judgment error.

  - source: 34.6
    question: |
      An invoice detail page reads the same invoice in three places on one request: `generateMetadata`, the page body, and `opengraph-image.tsx`. With the read helper wrapped in React's `cache()`, how many times does Postgres get queried for that invoice across **two** back-to-back requests for the same invoice?
    choices:
      - text: |
          Twice — once per request. `cache()` collapses the three reads *within* each request into one, but the store is discarded when each request ends.
        correct: true
      - text: |
          Once total — the first request caches the row and the second reads it straight from memory without touching the database.
        correct: false
      - text: |
          Six times — every consumer in every request queries independently, since `cache()` only applies once a route is statically optimized.
        correct: false
    why: |
      `cache()` is *request-scoped* memoization: inside one render it collapses every `getInvoice(id)` call into a single round-trip — page, metadata, and OG image all share it — then forgets the moment the request ends. Two requests means two stores, hence one query each. Persisting a result *across* requests so the second skips the DB is `'use cache'`, a different tool entirely.

  - source: 34.7
    question: |
      A `robots.ts` gates indexing on the environment so preview deploys stay invisible. A teammate writes `if (process.env.NODE_ENV === 'production')` as the discriminator. Why is that the wrong check on Vercel?
    choices:
      - text: |
          A Vercel preview deploy is a production build, so `NODE_ENV` is `'production'` there too — the gate would leave every preview indexable. `VERCEL_ENV` is the signal that distinguishes production from preview.
        correct: true
      - text: |
          `NODE_ENV` isn't available inside `robots.ts` because it runs as a cached route handler at the edge, so the branch silently evaluates to `undefined`.
        correct: false
      - text: |
          `NODE_ENV` only reflects the local dev server's mode and is always `'development'` once deployed, so the production rules would never apply.
        correct: false
    why: |
      Previews are full production builds, so `NODE_ENV` can't tell them apart from real production — gating on it leaves previews crawlable, the exact duplicate-content leak the file exists to prevent. `VERCEL_ENV` (`'production'` / `'preview'` / `'development'`) is the discriminator. Reading `process.env` here works fine; it's just stringly-typed, which is why a validated `env` object is the eventual upgrade. And the stakes cut both ways — ship `disallow: '/'` to production and you've quietly delisted the whole site.

  - source: 34.8
    question: |
      You add `generateStaticParams` to `/help/[slug]` returning `[{ slug: 'pricing' }, { slug: 'faq' }]`. The page also has a branch that reads `cookies()`, but only when `slug === 'admin-preview'`. `next build` succeeds. What happens at runtime?
    choices:
      - text: |
          The build passes because no sample slug enters that branch, so the `cookies()` read is never validated — then a request to `/help/admin-preview` errors in production.
        correct: true
      - text: |
          The build should have failed — `cookies()` is banned on any route that exports `generateStaticParams`.
        correct: false
      - text: |
          The `admin-preview` branch is silently materialized as static HTML at build alongside `pricing` and `faq`.
        correct: false
    why: |
      Build-time validation runs the route only against the **sample params** you return. `'pricing'` and `'faq'` never enter the `admin-preview` branch, so its `cookies()` read is never exercised and never flagged — a green build hiding a red production path. This is exactly what the "content stable, not per-request" condition protects against: a route tempted to read the request for *some* slugs isn't a pure catalog. Wrap the request read in `<Suspense>`, or better, don't branch into request data on a page you've promised is static.

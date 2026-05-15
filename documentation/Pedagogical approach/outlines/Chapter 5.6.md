## Concept 1 — The `next.config.ts` reachable surface as a one-screen map

**Why it's hard.** A real `next.config.ts` accretes for a year and ends up as a 200-line grab-bag of `images`, `headers`, `redirects`, `experimental`, and four entries the original author can no longer justify. Students opening a fresh config see five lines and don't have a map of what *could* live here, so by the time they need security headers or an external SDK lever they're copy-pasting from Stack Overflow. The chapter spine fails if the student doesn't first see the surface as a closed, finite map.

**Ideal teaching artifact.** A Concept-archetype *anatomy diagram* — one screen, one `NextConfig` shape with eight labeled regions: `cacheComponents`, `typedRoutes`, `images`, `redirects`, `rewrites`, `headers`, `serverExternalPackages`, `experimental`. Each region is annotated with one line (what it controls) and a tag for the lesson that owns it (5.6.2, 5.6.3, 17.2, etc.). The figure functions as a chapter table of contents the student can revisit — the same map gets re-shown at the top of 5.6.2 and 5.6.3 with the relevant region highlighted. The student leaves Lesson 5.6.1 convinced the config has a small, knowable surface rather than an open-ended one.

**Engagement.** A `Buckets` round: twelve configuration intentions ("rewrite marketing to an external CMS," "add the `Permissions-Policy` baseline," "enable typed `<Link href>`," "tell Turbopack to leave `sharp` alone," "make `cookies()` always available," "allow images from the corporate S3 bucket," "force HTTPS in production," "preserve POST through a redirect," six more) sorted onto the eight regions of the map plus a "not a config concern — wrong question" bucket. Wrong picks (e.g., "force HTTPS" belongs in `headers()` not `redirects()`) make the boundaries between regions visible.

**Components.**
- A hand-SVG anatomy diagram inside `Figure` showing the eight `NextConfig` regions, with lesson-tag annotations. Reused across 5.6.2 and 5.6.3 with the relevant region highlighted — qualifies as a chapter spine artifact, not single-use.
- `Buckets` for the sort.

---

## Concept 2 — `serverExternalPackages`: when an SDK earns externalization

**Why it's hard.** Students hit a Turbopack `module not found` for a Node-native SDK (`sharp`, Prisma, `puppeteer`), Google the error, find the `serverExternalPackages` knob, and over-apply it preemptively to every dependency on the way home. The misconception is that externalizing is free; it isn't (slower cold start, larger function output), and using it to mask a real missing-dependency bug hides the root cause. The decision needs an explicit threshold.

**Ideal teaching artifact.** A Decision-archetype *misconception-first ambush* in two beats. Beat one shows a worked snippet — a Server Component imports `sharp`, the build crashes, the error message is reproduced in an adjacent output block. The student is then shown the wrong fix (externalize every dependency mentioned in the trace) versus the right fix (externalize only `sharp` itself; transitive deps are handled by Next 16.1). Beat two is a small decision rule prose box stating the threshold explicitly: "Try without; add only when the SDK crashes with a native-binding or dynamic-require error. Check the platform's pre-packaged opt-out list first. Don't preemptively externalize."

**Engagement.** A `MultipleChoice` round of four error scenarios — "build fails with `cannot find module './build/Release/sharp.node'`," "build fails with `cannot find module 'lodash/debounce'` after a `pnpm` install," "runtime crash inside a Server Action that loads `@aws-sdk/client-s3` (already in the platform default list)," "Turbopack warning about dynamic `require` inside a date-parsing helper." For each, the student picks among {add to `serverExternalPackages`, fix the missing install, no action — already covered, refactor to remove the dynamic `require`}. The wrong picks make the over-application failure mode visible.

**Components.**
- `CodeVariants` for the wrong-fix / right-fix pair on the `sharp` crash.
- `MultipleChoice` for the diagnostic-fit recall.

---

## Concept 3 — Why plain `<img>` is the wrong default in 2026

**Why it's hard.** Students returning to web write `<img src="/hero.jpg">` because it's familiar and "it works." It does work — until Lighthouse reports a 3.4 s LCP, a 0.18 CLS, and a 2.1 MB image shipped to a phone. The failure modes are real but silent in dev. Without seeing them happen, the student treats `next/image` as bureaucracy rather than as structural enforcement.

**Ideal teaching artifact.** A *side-by-side comparison widget* — two viewports rendering the same product page, one with plain `<img>`, one with `next/image`. A throttled-network toggle (Fast 3G) and a viewport-size selector (mobile / desktop) drive a live readout below each frame: bytes shipped, LCP marker, CLS score, format served (`jpeg` vs `avif`). The student watches the plain-`<img>` side ship 2.1 MB and reflow when the image lands; the `next/image` side ships 180 KB AVIF, zero CLS, lazy-loaded below the fold. Numbers, not exhortation, do the teaching.

**Engagement.** A `TrueFalse` round of five statements — "plain `<img>` ships the same bytes on mobile as on desktop," "`next/image` automatically picks AVIF when the browser supports it," "removing `width` and `height` on plain `<img>` causes CLS," "`next/image` lazy-loads by default," "Vercel caches optimized variants per URL + width + quality + format." Fast, terminal, the wrong picks make the platform contract explicit.

**Components.**
- New component proposal: **ImageDeliveryCompare** — two synthetic page frames running the same content, one fed by `<img>`, one by `next/image`, with a throttled-network toggle and a metrics strip (bytes / LCP / CLS / format). Single-use here but the framing pattern (two browsers, throttled network, measured outcome) compounds with **RedirectVsRewriteScrub** from 5.5 and could become a shared "browser-pair" lesson primitive.
- Alternative if the widget is out of scope for v1: a hand-SVG `Figure` showing two stacked page frames with the four metrics labeled as static badges, fed by a fixed Fast-3G scenario. Loses the toggle, keeps the contrast.
- `TrueFalse` for the recall.

---

## Concept 4 — `sizes`, `priority`, `placeholder`: the three props that decide perf

**Why it's hard.** `next/image`'s `src` / `width` / `height` / `alt` quartet is obvious. The three perf-decisive props (`sizes` on `fill`, `priority` on the LCP candidate, `placeholder="blur"` for above-the-fold media) are the ones students skip because the build doesn't complain. The result is a `fill` image that downloads the largest variant on every device and an LCP marker that fires on a 2.4 MB hero. Each prop fixes a *named* failure mode; teaching them as a list-of-props loses the cause-and-effect.

**Ideal teaching artifact.** A Pattern-archetype *wrong-by-default sandbox* in `ReactCoding`. The starter renders three images on a product page — a hero with `fill`, a product photo with explicit dimensions, an avatar with `fill` in a sized container — and ships every prop *except* `sizes`, `priority`, and `placeholder`. The test bench measures LCP, CLS, bytes shipped at mobile width, and reports failures: "hero downloaded the desktop variant on mobile (missing `sizes`)," "LCP fired at 2.8 s — no `priority` on the hero," "CLS = 0.12 on the hero swap-in — no `placeholder`." The student adds the three props one at a time; tests turn green as each failure mode is removed. The student feels the cause and effect.

**Engagement.** The sandbox is the assessment. A follow-up `MultipleChoice` confirms recall on the *when not to use* axis — "use `priority` on every image on the page," "use `placeholder="blur"` on every avatar in a list," "set `sizes` only when using `fill`," "skip `sizes` if the image will always render at full viewport width" — with the correct picks naming the *one-per-page* rule for `priority` and the *fill-or-responsive* rule for `sizes`.

**Components.**
- `ReactCoding` in target-match mode with a metrics readout — needs a wrapper that exposes LCP/CLS/bytes for the test bench. Most likely a small extension to `ReactCoding` rather than a new component.
- Alternative if the metrics-instrumented variant isn't viable: `CodeVariants` with three tabs (no-props / two-props / three-props) and a fixed-metrics caption per tab. Static, loses the muscle memory.
- `MultipleChoice` for the inverse-recall.

---

## Concept 5 — `remotePatterns` as the security gate (and the `qualities` upgrade)

**Why it's hard.** Without `remotePatterns`, an attacker can route arbitrary URLs through the project's image optimizer to consume the team's Vercel bandwidth allowance — a real abuse vector, not a theoretical one. Students who skip it (or wildcard the hostname to "make it work") ship the abuse surface to production. The Next.js 16 `qualities` requirement (must declare every quality value used) is a second checkpoint students hit during the 15 → 16 upgrade and don't recognize from the error message.

**Ideal teaching artifact.** A Pattern-archetype *adversarial walkthrough* in `AnnotatedCode`. Step 1 highlights a `next.config.ts` with `remotePatterns: []` and a `<Image src="https://attacker.com/4k-video-frame.png" />`. Step 2 names the attack — an attacker on a public forum embeds the same external URL behind the project's optimizer; every view counts against the team's bandwidth quota. Step 3 highlights the fix: name the legitimate origins explicitly (`{ protocol: 'https', hostname: 'images.acme.com', pathname: '/products/**' }`). Step 4 adds the `qualities: [50, 75, 90]` declaration and shows the matching 16-upgrade build error if it's omitted. The walkthrough makes the threat model concrete in two reads.

**Engagement.** A `Tokens` round on a finished `next.config.ts`: click the configuration lines that constitute the security gate. Correct picks are the `remotePatterns` array and each `hostname` entry; decoys include `qualities` (a perf control, not security), `formats` (delivery, not access), and `deviceSizes` (responsive widths). The distinction between perf knobs and security gates is the recall.

**Components.**
- `AnnotatedCode` for the four-step walkthrough.
- `Tokens` for the security-vs-perf distinction.

---

## Concept 6 — Redirect vs rewrite, 308 vs 307: the semantic split and its SEO half-life

**Why it's hard.** Students collapse redirect and rewrite into "go to a different page" and treat the status code as cosmetic. Both flattenings have permanent consequences. A 307 where a 308 was needed leaves the old URL indexed in search engines for months. A rewrite shipped as a redirect flips the address bar in production and confuses every existing link. The differences are invisible in a happy-path test.

**Ideal teaching artifact.** A *side-by-side time-travel widget* — the **RedirectVsRewriteScrub** already proposed in Chapter 5.5 (Concept 8). Two synthetic browser frames start at `/account/billing`. Pressing Play on the redirect side flips the address bar to `/settings/billing`, grows history by one, and the network log shows two requests (308 + GET). The rewrite side keeps the address bar, grows history by zero, and the log shows one request with "served `/settings/billing` internally." A status-code toggle on the redirect side flips between 307 and 308; a sub-caption explains the SEO half-life: 308 forwards link equity and updates the index, 307 keeps the old URL alive. The student manipulates the same widget they saw in 5.5 — the reuse compounds.

**Engagement.** A `MultipleChoice` round on four product situations — "rename `/account` to `/settings` company-wide after rebrand," "serve the marketing CMS at `/blog/*` from an external origin," "send a POST from a legacy webhook URL to the new endpoint without losing the body," "temporary maintenance redirect for one route during a database migration." Correct picks land on {308 redirect, rewrite, 307 redirect, 307 redirect}.

**Components.**
- **RedirectVsRewriteScrub** (proposed in Chapter 5.5) — the canonical second use, justifying its build.
- `MultipleChoice` for the placement recall.

---

## Concept 7 — Where does a redirect live: the four-location decision tree

**Why it's hard.** Next.js 16 offers four places to write a redirect: `next.config.ts` `redirects()`, `proxy.ts`, `redirect()` from `next/navigation` inside a Server Action or route body, and `notFound()` / `permanentRedirect()` for resource-shaped cases. Each has a different cost profile (CDN edge vs. proxy invocation vs. action body) and a different scope (request-independent vs. request-conditional vs. post-action). Students reach for whichever they saw last. The decision is driven by *when the rule is known* — not by syntax preference.

**Ideal teaching artifact.** A Decision-archetype *decision tree* rendered in Mermaid, structurally identical to the one in 5.5 Concept 9 but with `next.config.ts` `redirects()` promoted to a first-class leaf. Root: "is the rule the same for every request?" → yes → "is it known at build/deploy time?" → yes → `next.config.ts` `redirects()`. No (request-conditional — auth, geo, A/B) → `proxy.ts`. No (it's per-action) → `redirect()` from `next/navigation`. No (per-route, resource is gone) → `notFound()` or `permanentRedirect()`. Each leaf carries a one-line cost tag (CDN edge, proxy invocation, action throw, framework boundary). The tree is the artifact the student references during the lesson and during code review.

**Engagement.** `Matching` between seven scenarios and the four tools — scenarios include "marketing /docs URL changed permanently," "logged-in user hits /login (cookie present)," "deleted invoice id," "post-sign-in redirect to dashboard," "subdomain to internal route group," "A/B test bucket redirect," "rebrand /account/* to /settings/*."

**Components.**
- A Mermaid flowchart inside `Figure`.
- `Matching` for the recall.

---

## Concept 8 — Why `next/font` exists: CLS, IP leak, and the broken-CDN failure mode

**Why it's hard.** Plain `<link rel="stylesheet" href="https://fonts.googleapis.com/...">` is a familiar one-liner. The three failure modes it ships — render-blocking external request, visitor IP leaked to Google, CLS when the swap fires — are silent and stable enough that a student can ship the pattern for years without noticing. Without seeing the three failure modes named together, `next/font` reads as a syntactic preference rather than as structural enforcement.

**Ideal teaching artifact.** A Concept-archetype *anatomy diagram* showing two parallel pipelines side by side. Left pipeline ("plain `<link>`"): browser → external Google Fonts CDN (red — IP leak, render block, external dependency) → font file → swap → CLS spike (red — layout shift). Right pipeline ("`next/font`"): build-time download → self-hosted from project origin (green — no external request) → preload-injected → swap with pre-computed fallback metrics → no CLS (green). Three failure modes on the left side are crossed out on the right. The student leaves with the structural enforcement made visible: each green checkmark on the right corresponds to a red failure on the left.

**Engagement.** A `Buckets` round: seven properties ("renders without network round-trip," "ships visitor's IP to a third party," "swaps invisibly with no layout shift," "requires `subsets` declaration at build," "blocks first paint when the CDN is slow," "self-hosts from the project's origin," "downgrades gracefully when the system font is missing") sorted into "plain `<link>`," "`next/font`," or "both."

**Components.**
- A hand-SVG `Figure` showing the two parallel pipelines with red / green annotations.
- `Buckets` for the property sort.

---

## Concept 9 — Variable fonts and the Tailwind CSS-variable bridge

**Why it's hard.** Two coupled choices live here. First: variable fonts ship every weight in one file (often smaller than two static weights), but students default to declaring three static weights because that's what every tutorial shows. Second: wiring the loaded font into Tailwind requires the CSS-custom-property pattern (`variable: '--font-sans'`, then `fontFamily.sans: ['var(--font-sans)']` in the Tailwind config). Students who bypass the bridge end up applying the font's `className` directly and lose Tailwind's font-family utilities for the rest of the app.

**Ideal teaching artifact.** A Setup-archetype *worked example walkthrough* in `AnnotatedCode`, four steps on one block spanning `app/layout.tsx` and `tailwind.config.ts`. Step 1: `Inter({ subsets: ['latin'], variable: '--font-sans' })` declared at module scope (highlighted line: `subsets` is required; `variable` is the bridge). Step 2: the returned object's `variable` class applied on `<html>` (highlighted: this is what attaches the CSS custom property to the cascade). Step 3: the Tailwind config references `var(--font-sans)` under `fontFamily.sans` (highlighted: this is what makes every `font-sans` utility resolve to Inter). Step 4: a sample component uses `font-sans` and `font-mono` Tailwind utilities — no `className` from the font object reaches deep components. The four-step walk makes the wiring chain visible end-to-end.

**Engagement.** A `Tokens` round on the finished setup: click the lines that constitute the bridge. Correct picks are the `variable: '--font-sans'` declaration, the `html.className` application, and the `var(--font-sans)` reference in the Tailwind config. Decoys include the `subsets` line (required, but for build, not for wiring) and the `font-sans` utility usage in the component (the consumer, not the bridge).

**Components.**
- `AnnotatedCode` for the four-step walkthrough.
- `Tokens` for the wiring-chain recall.

---

## Concept 10 — The four `next/script` strategies as a cost ladder

**Why it's hard.** Students treat the four strategies (`beforeInteractive`, `afterInteractive`, `lazyOnload`, `worker`) as a list of synonyms for "load this script," pick one randomly, and frequently default to `beforeInteractive` "to be safe." That choice tanks LCP because it blocks render. The four strategies are not parallel — they're a cost ladder, and the senior reflex is to push every script as far down the ladder as it tolerates.

**Ideal teaching artifact.** A Concept-archetype *cost-ladder diagram* — a vertical strip with four rungs, top to bottom: `beforeInteractive` (red — blocks render, document head only), `afterInteractive` (yellow — runs after hydration begins, default), `lazyOnload` (green — runs at browser idle), `worker` (green/experimental — off main thread). Each rung carries a one-line "what to put here" example (polyfills, analytics SDK, chat widget, telemetry that never touches `document`) and an inline timeline strip showing where on the page lifecycle the script fires. The visual pull is downward: the student leaves with "default to `afterInteractive`, push to `lazyOnload` whenever the user doesn't see it on the first interaction."

**Engagement.** A `Buckets` round: eight third-party scripts ("Segment analytics snippet," "Stripe.js on checkout," "Intercom chat widget," "polyfill for an experimental API," "Plausible page-view beacon," "LinkedIn retargeting pixel," "Sentry browser SDK init," "an A/B variant flag that must paint before render") sorted onto the four strategies. The misclassifications (defaulting Sentry to `beforeInteractive`, or putting Intercom on `afterInteractive`) make the cost-ladder explicit.

**Components.**
- A hand-SVG `Figure` showing the four-rung ladder with the page-lifecycle timeline.
- `Buckets` for the strategy sort.

---

## Concept 11 — SDK over snippet: when the `<Script>` tag is the wrong answer

**Why it's hard.** Every modern vendor (PostHog, Sentry, LaunchDarkly, Segment, Stripe) ships both a `<script>` snippet *and* an npm SDK. Students reach for the snippet because that's what the vendor's "Getting Started" page shows above the fold. The snippet is the wrong default in a React 19 / Next.js 16 codebase: untyped, opaque to tree-shaking, no React integration, fires before consent state is known. The threshold for "use the SDK instead" should be reflexive, not negotiated.

**Ideal teaching artifact.** A Decision-archetype *side-by-side comparison* in `CodeVariants`. Tab one ("snippet"): PostHog wired via `<Script src="https://app.posthog.com/static/array.js" strategy="afterInteractive" />` plus an inline init script. Adjacent prose names what's missing — no types, no consent gating, the snippet fires on every route, no tree-shake. Tab two ("SDK"): `posthog-js` installed, a typed `PostHogProvider` Client Component wrapped around the layout, consent gating via a `useConsent()` hook, `posthog.capture` calls typed at the call site. The two tabs are the same feature; the diff is the senior reflex. A short threshold prose box names when the snippet *is* the right answer: vendor ships no SDK, or the script must run before any React code (rare polyfill case, → Concept 10).

**Engagement.** A `MultipleChoice` round on five vendors — "PostHog analytics," "Stripe.js for card collection," "Intercom chat widget," "Cloudflare Turnstile CAPTCHA," "a legacy first-party survey script with no npm package" — picking {SDK, snippet, either-with-justification} for each. The wrong picks make the SDK-first reflex explicit.

**Components.**
- `CodeVariants` for the snippet-vs-SDK comparison.
- `MultipleChoice` for the vendor-fit recall.

---

## Concept 12 — Static `metadata` vs `generateMetadata`: the `cache()` dedup pattern

**Why it's hard.** Two coupled traps. First: students mix the static `export const metadata` and the dynamic `generateMetadata` in the same file because they have a constant title and a dynamic OG image — Next.js 16 rejects this as a build error and the message doesn't always explain why. Second: students who correctly reach for `generateMetadata` for a detail page write the resource fetch twice — once in `generateMetadata`, once in the page body — doubling the database hit. The fix (wrap the fetch in React's `cache()` so both functions share one read) isn't discoverable from the API surface.

**Ideal teaching artifact.** A Pattern-archetype *roundtrip diagram* in `ArrowDiagram` paired with a `CodeVariants` block. The diagram shows a single request landing on a `/invoices/[id]` route: `generateMetadata` and the page body each arrow to a shared `getInvoice(id)` helper wrapped in `cache()`, which arrows once to the database. A "without `cache()`" variant of the same diagram shows two arrows hitting the database. The `CodeVariants` block sits below: tab one is the doubled-fetch version, tab two wraps the resource lookup in `cache()` and shares it. The student sees both the topology and the code at once.

**Engagement.** A `Tokens` round on the deduped version: click the line that makes the dedup work. The correct pick is the `cache()` wrapper at the helper's declaration site; decoys include the `await getInvoice(id)` call in `generateMetadata` (a consumer, not the dedup), the `await getInvoice(id)` call in the page (also a consumer), and the `notFound()` short-circuit inside the helper (orthogonal — about missing resources, not deduplication).

**Components.**
- `ArrowDiagram` inside `Figure` for the with/without-`cache()` topology pair.
- `CodeVariants` for the doubled vs deduped fetch.
- `Tokens` for the dedup-site recall.

---

## Concept 13 — Dynamic OG cards: the file convention, Satori's constraints, and the leak vector

**Why it's hard.** Three failure modes hide inside the `opengraph-image.tsx` story. First: students treat `ImageResponse` as a free-form React renderer and reach for CSS grid, custom hooks, or `next/image` — Satori supports a narrow flexbox-style JSX subset and rejects the rest with cryptic errors. Second: students forget `metadataBase` and ship relative OG URLs that some platforms reject silently. Third — the senior trap — students personalize the OG card from the session and leak the recipient's data into every shared link (`"Hello Sarah, your invoice"` rendered into a card that anyone with the URL can fetch). The constraints and the leak are equally important.

**Ideal teaching artifact.** A Mechanics-archetype *real-artifact replica* with a side-by-side preview pane. Left pane: an editable `opengraph-image.tsx` body — student edits the JSX. Right pane: a rendered 1200×630 PNG produced by Satori on every keystroke, with a Slack-style preview card mock below it. A small validator strip beneath the editor flags Satori-rejected constructs in real time ("`display: grid` not supported, use flex"), the missing-`metadataBase` warning, and a red "session-derived value detected in OG body" guardrail when a fixture session field is referenced. The student tries to break the constraints and gets immediate, named feedback.

The second beat, immediately following: a Concept-archetype *anatomy diagram* showing the route segment's file layout — `page.tsx`, `opengraph-image.tsx`, `opengraph-image.alt.txt`, optional `twitter-image.tsx`, plus the `cacheTag('invoice:${id}')` annotation that ties OG invalidation to mutation. The student leaves with both the in-the-small (Satori's surface) and the in-the-large (file convention + cache tag) views.

**Engagement.** A `MultipleChoice` round of four OG composition snippets — each labeled "ships safely / ships with a leak / fails Satori / fails for missing `metadataBase`." Snippets include: a personalized "Welcome back, $user.name" card, a `display: grid` layout, a relative font URL with no `metadataBase`, and a resource-derived card using `cacheTag` (the correct ship).

**Components.**
- New component proposal: **OgCardSandbox** — an editable `opengraph-image.tsx` body fed into Satori in-browser, with a live 1200×630 PNG render, a Slack-preview mock, and an inline rule-violation strip. Single chapter use, but a forward-link candidate for any future "dynamic image generation" lesson (Chapter 13.4 file uploads occasionally generates derived images; less obvious fit).
- Alternative if Satori-in-browser is heavy for v1: a `TabbedContent` figure with four tabs showing fixed PNG renders for {happy path, grid-rejected, leak example, missing-`metadataBase` relative URL}, each captioned with the verdict. Demote to alternative — single-use bespoke component without strong forward-links should not be the default.
- A hand-SVG `Figure` for the route-segment file-convention anatomy.
- `MultipleChoice` for the four-snippet diagnostic round.

---

## Concept 14 — The SEO file-convention surface as a map

**Why it's hard.** The historical web wires `robots.txt`, `sitemap.xml`, `favicon.ico`, an Apple touch icon, a manifest, and viewport meta tags as a half-dozen hand-maintained `/public` files glued together with HTML in the document head. Next.js 16 ships a file convention for each, and the student walks in not knowing the surface exists. The teaching challenge is closing the set: there are exactly these conventions, they live at the route-segment level, and they are typed and cached by default.

**Ideal teaching artifact.** A Reference-archetype *file-tree poster* in `FileTree` showing an `app/` directory with every SEO file in place: `robots.ts`, `sitemap.ts`, `icon.tsx`, `icon-192.png`, `icon-512.png`, `apple-icon.png`, `favicon.ico`, `manifest.ts`, `opengraph-image.tsx`, `opengraph-image.alt.txt`, `twitter-image.tsx` — each annotated with what it generates (`robots.txt`, `sitemap.xml`, `<link rel="icon">`, etc.) and the lesson section that owns it. A short prose strip beside the tree names the unifying frame: these are *special route handlers*, cached by default, opt to dynamic only when they read a request-time API. The student leaves with the surface as a closed map.

**Engagement.** A `Matching` round between eight file names and their generated output (`robots.ts` → `/robots.txt`, `sitemap.ts` → `/sitemap.xml`, `icon-192.png` → `<link rel="icon" sizes="192x192">`, `apple-icon.png` → `<link rel="apple-touch-icon">`, `opengraph-image.tsx` → hashed PNG URL in `<meta property="og:image">`, `manifest.ts` → `/manifest.webmanifest`, `favicon.ico` → root favicon request, `viewport` export → `<meta name="viewport">`).

**Components.**
- `FileTree` annotated with generation-target captions (annotations may need to live as adjacent prose if `FileTree` doesn't support inline tags).
- `Matching` for the file-to-output recall.

---

## Concept 15 — Env-aware `robots.ts` and the viewport-separate-export trap

**Why it's hard.** Two specific traps inside the SEO surface bite teams in production. First: a single `robots.ts` that doesn't read an env flag will either allow staging deploys to be indexed (SEO disaster) or accidentally `Disallow: /` in production (acquisition disaster). The asymmetry is real — a staging deploy serving production-flavored robots survives one quarter before a Slack-style preview leaks the URL. Second: students put `themeColor` and `viewport` fields inside the `metadata` export — Next.js 16 emits a build warning and silently fails to render them, because viewport is a *separate* export. The warning is easy to miss in CI logs.

**Ideal teaching artifact.** Two paired Mechanics beats. Beat one: a worked `app/robots.ts` showing the env-aware branch — `process.env.VERCEL_ENV === 'production'` returns `{ rules: [{ userAgent: '*', allow: '/' }], sitemap: '...' }`; the else branch returns `{ rules: [{ userAgent: '*', disallow: '/' }] }`. Below it, a small two-row outcome table: "deploy to staging → `Disallow: /`," "deploy to production → `Allow: /` + sitemap." The student sees the branch produces the right artifact in both environments.

Beat two: a `CodeVariants` pair on the viewport trap. Tab one (wrong) puts `themeColor`, `viewport`, `colorScheme` inside the `metadata` export; the adjacent output block reproduces the actual Next.js 16 build warning. Tab two (right) declares `export const viewport: Viewport = { ... }` as its own export. The warning and the fix sit next to each other.

**Engagement.** A `Buckets` round sorting six fields ("`title`," "`themeColor`," "`description`," "`width: device-width`," "`openGraph.images`," "`colorScheme`") into "`metadata` export" vs "`viewport` export." The misclassifications make the split explicit.

**Components.**
- `CodeVariants` for the viewport wrong/right pair (env-aware `robots.ts` is a plain `Code` block — its lesson is the logic, not a comparison).
- `Buckets` for the export-placement recall.

---

## Concept 16 — `generateStaticParams`: building dynamic segments at deploy time

**Why it's hard.** Under Cache Components, every route is dynamic by default. A `/blog/[slug]` route with thirty rarely-changing articles still runs the function on every request — wasted invocations for content that doesn't change between deploys. Students who never reach for `generateStaticParams` ship a fast-feeling local dev experience and a hidden function-invocation tax in production. The hook materializes the catalog at build time and pushes those URLs to the CDN as static HTML; the mental model the student needs is "this turns a dynamic segment into a build-time render queue."

**Ideal teaching artifact.** A Concept-archetype *build-vs-runtime timeline diagram*. Top track: build time — `generateStaticParams` runs once, queries `db.posts.allSlugs()`, returns `[{ slug: 'a' }, { slug: 'b' }, ...]`, and each slug renders to static HTML pushed to the CDN. Bottom track: runtime — three example requests land. Two request slugs that were in the build list (`'a'`, `'b'`) hit the CDN directly with zero function invocations. The third (`'c'` — a slug that didn't exist at build time) falls through to a runtime render *if* `dynamicParams: true` (default), or returns 404 *if* `dynamicParams: false`. The two timeline tracks make the build / runtime division of labor visible.

**Engagement.** A `Buckets` round sorting eight route shapes into "good fit for `generateStaticParams`" vs "wrong fit." Items include `/blog/[slug]` (yes — enumerable, rarely changes), `/dashboard/[orgId]` (no — per-user, requires auth), `/help/[slug]` (yes), `/search?q=` (no — searchParams don't materialize), `/users/[id]` (no — too many, too volatile), `/changelog/[date]` (yes), `/invoices/[id]` (no — per-tenant), `/legal/[document]` (yes). The misclassifications make the *enumerable* + *rarely changes* threshold explicit.

**Components.**
- A hand-SVG `Figure` showing the two-track build/runtime timeline with the three example requests labeled.
- `Buckets` for the fit-decision recall.

---

## Concept 17 — The production content-page shape: `generateStaticParams` + `use cache` + `cacheTag`

**Why it's hard.** `generateStaticParams` alone gives a static build catalog, but the moment a CMS edit lands the static HTML is stale until the next deploy. The full production shape — `generateStaticParams` for the build catalog, `use cache` with `cacheTag('post:${slug}')` in the page body, and `revalidateTag('post:${slug}', 'max')` on a CMS webhook — is what real teams ship. Students taught the three primitives in isolation don't compose them; they reach for `generateStaticParams` and stop, then complain that edits don't reflect.

**Ideal teaching artifact.** A Pattern-archetype *end-to-end wiring diagram* in `ArrowDiagram` paired with a worked code block. The diagram shows the full lifecycle as a loop: **build** (`generateStaticParams` → render each slug → ship to CDN with `cacheTag` attached) → **read** (CDN serves static HTML, no function invocation) → **edit** (editor saves in CMS → webhook hits `/api/revalidate` → `revalidateTag('post:${slug}', 'max')`) → **invalidate** (the CDN entry and the OG card share the tag and both refresh on next read) → back to read. Below the diagram, the code: a `page.tsx` with `generateStaticParams`, a `use cache` body, `cacheTag`, and the matching webhook handler. The student sees the three primitives doing one job together.

**Engagement.** A `Sequence` exercise — the student orders the seven steps of "a CMS editor publishes an article edit and a reader sees the new version 200 ms later": editor saves → CMS fires webhook → handler calls `revalidateTag('post:slug', 'max')` → CDN entry marked stale → reader requests page → CDN serves stale-while-revalidate response → background re-render writes the fresh HTML to CDN. Out-of-order picks (e.g., placing the re-render before the webhook) make the dependencies visible.

**Components.**
- `ArrowDiagram` inside `Figure` for the four-stage wiring loop.
- `Code` block (single file shown as page + handler) for the worked example.
- `Sequence` for the lifecycle recall.

---

## Component proposals

- **ImageDeliveryCompare** — two synthetic page frames rendering the same product page, one with plain `<img>`, one with `next/image`, fed by a throttled-network toggle (Fast 3G / 4G / fast wifi) and a viewport-size selector. Metrics strip below each frame: bytes shipped, LCP marker, CLS score, format served.
  - Uses in this chapter: Concept 3.
  - Forward-links: shares the "browser-pair with measured outcome" framing with **RedirectVsRewriteScrub** from Chapter 5.5; the underlying browser-frame primitive could be lifted as a shared widget across 5.5 and 5.6 if both get built. As a standalone component, single-use — flagged for demotion if no shared primitive emerges.
  - Leanest v1: two fixed frames running a single product page fixture; one preset network condition (Fast 3G); a static metrics strip per frame instead of live measurement (numbers can be pre-computed from a real Lighthouse run baked into the figure). The cause-and-effect lands; the interactivity is gone. At this v1, the figure is close enough to a hand-SVG `Figure` that the alternative path is acceptable.

- **OgCardSandbox** — an editable `opengraph-image.tsx` body fed into Satori running in-browser, with a live 1200×630 PNG render, a Slack-style preview mock, and an inline rule-violation strip that flags Satori-rejected JSX, missing `metadataBase`, and session-derived leak attempts.
  - Uses in this chapter: Concept 13.
  - Forward-links: None — single-use. No other chapter teaches Satori or `ImageResponse` in depth. Per the single-use discipline, demoted in Concept 13's primary recommendation to the `TabbedContent` alternative (fixed PNG renders for four scenarios). The sandbox stays in this proposals list as a stretch goal if Satori-in-browser becomes a curriculum-wide capability for other dynamic-image lessons.
  - Leanest v1: three preset bodies the student switches between (happy / Satori-violation / leak attempt) with their canned PNG renders and verdict captions — no editor. At this v1 the component collapses to a `TabbedContent` and shouldn't ship as bespoke code.

## Build priority

This chapter is content-rich but ships few bespoke teaching widgets. Most concepts land cleanly on existing components (`AnnotatedCode`, `CodeVariants`, `Buckets`, `Matching`, `FileTree`, hand-SVG `Figure`), which is the right outcome — the chapter teaches *what platform conventions to reach for and why*, and concrete file-shaped artifacts in `FileTree`s and annotated code blocks do that job natively.

The one bespoke proposal worth building first is **ImageDeliveryCompare**, *and only if* a shared "browser-pair with measured outcome" primitive is lifted from the **RedirectVsRewriteScrub** in Chapter 5.5. Built that way, the cost amortizes across at least two concepts in two chapters and the visual language stays consistent. As a one-off it doesn't pass the single-use discipline — the v1 collapses to a static figure.

**OgCardSandbox** does not earn bespoke component spend. Its alternative path (a `TabbedContent` with four fixed renders) carries the four teaching beats — happy, Satori-violation, leak, missing-`metadataBase` — and lands the Satori-constraints and session-leak lessons without an in-browser Satori build.

## Open pedagogical questions

- Concept 4's `next/image` wrong-by-default sandbox depends on `ReactCoding` exposing LCP / CLS / bytes-shipped metrics from the iframe runtime. If that instrumentation isn't already a `ReactCoding` capability, the engineering ask is non-trivial — decide before lesson drafting whether to extend `ReactCoding` or fall back to the `CodeVariants` three-tab alternative.
- Concept 1's `next.config.ts` anatomy diagram is designed to be re-shown at the top of 5.6.2, 5.6.3, and 17.2 with the relevant region highlighted. That cross-lesson reuse only pays off if the highlight-region pattern is supported in `Figure` (or as a small SVG variant per lesson). Worth deciding once at the chapter level rather than per lesson.

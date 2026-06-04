# Images with next/image

Title: `Images with next/image`
Sidebar label: `Images`

---

## Lesson framing

**Where this sits.** Chapter 034 lesson 2. The student has just toured `next.config.ts` (lesson 1) and knows the Cache Components rendering model (chapter 032) and the server/client boundary (chapter 030). They have written plain HTML `<img>` in a prior unit. This lesson teaches `next/image` as the platform default for images, the props the student must author, and `remotePatterns` as the mandatory security gate for external sources.

**The senior frame (the spine of the whole lesson).** Plain `<img>` is the *wrong default in 2026* — not because it's broken, but because it silently regresses Core Web Vitals: it ships one oversized file to every device, reserves no space so the page jumps as it loads, lazy-loads nothing, and serves whatever format the source happens to be. A senior would fix every one of those by hand: generate a `srcset`, reserve the box, lazy-load below the fold, negotiate AVIF/WebP. `next/image` is *structural enforcement* of that discipline — it makes the right thing the default and makes the wrong thing (an unsized image) a type error. This is the same thread the whole chapter runs: the platform primitive exists because the naive tag regresses a known metric, and the primitive enforces against that failure mode. Open with this, return to it at the close.

**Two metrics, named not taught.** CLS (Cumulative Layout Shift — content jumping as it loads) and LCP (Largest Contentful Paint — when the biggest above-the-fold element finishes painting) are the two Core Web Vitals this lesson keeps gesturing at. Define each *once*, in a `Term`, the first time it appears. Do **not** teach thresholds, field-vs-lab data, or measurement — that is chapter 094. The student needs only: "an unsized image causes CLS; a late hero image is your LCP and you can preload it." Every prop in the lesson maps to one of these two failure modes — make that mapping explicit (it is the organizing principle that keeps eight props from feeling like a checklist).

**Pedagogical shape.** Build complexity in two passes to keep cognitive load low. Pass one: the *local* image — a static import, the four required props, what you get for free. This is the simplest complete picture and it carries zero security surface. Pass two: the *remote* image — the optimizer, why an external source is a security problem, `remotePatterns` as the gate. Slot the authored-by-you responsive props (`sizes`, `priority`, `placeholder`, `quality`) between the two passes, because they apply to both and they are where the real perf leverage (and the most common mistakes) live. Close with the optimizer pipeline (what Vercel actually does) and the narrow escape hatches.

**What the student can do at the end.** Replace an `<img>` with a correctly-propped `next/image`; choose static import vs. `remotePatterns` by asset provenance (design-system/marketing vs. user-generated); author a correct `sizes` string for a `fill` image; pick the single `priority` image on a page; configure `remotePatterns` and `qualities` in `next.config.ts`; recognize the three highest-frequency mistakes (missing `sizes` on `fill`, missing `priority` on the LCP candidate, wildcard hostname).

**Mistakes to pre-empt inline (not bundled at the end).** Beginners reliably do three things wrong, and each belongs *in the section that teaches the relevant prop*, framed as a production consequence: (1) `fill` without `sizes` → the browser downloads the largest variant, defeating the whole point; (2) no `preload` on the LCP image → measurably slower LCP because the image lazy-loads like everything else; (3) wildcard `hostname: '**'` in `remotePatterns` → anyone can route arbitrary URLs through *your* optimizer and burn *your* bandwidth bill. Teach each as "here is the failure, here is why it bites."

**Components.** Lean on `CodeVariants` for the two before/after framings (`<img>` → `next/image`; wildcard → scoped `remotePatterns`) — the contrast *is* the lesson. Use `AnnotatedCode` for the one dense worked example (three images on one page) so attention lands on each prop in turn. `CodeTooltips` on the `remotePatterns` object fields. An HTML+CSS diagram for the CLS reserved-space concept and a second for the `srcset`/`sizes` negotiation — both are geometric/visual ideas that prose handles poorly. A `MultipleChoice` or `Dropdowns` check for the static-vs-remote provenance decision and the `priority` pick. Optional `VideoCallout` if a recent high-quality `next/image` walkthrough exists.

**Tone.** Adult, terse, decision-first. No "what is an image." Assume they can read JSX and TS. Every prop introduction answers "what failure does this prevent" before "here is the syntax."

---

## Lesson sections

### Introduction (no header)

Open on the concrete senior question from the chapter framing: a product page renders three images — a brand logo from the design system, a product photo uploaded to S3, and a customer avatar. Reach for `<img src=...>` for all three and you ship oversized bytes, the layout jumps as each loads, nothing lazy-loads, and the format is whatever was uploaded. Name the cost in one line each: oversized bytes (wasted bandwidth, slow load), layout jump (<Term> CLS), late hero (<Term> LCP). State the lesson's claim: `next/image` is the platform default that makes all four fixes automatic, and `remotePatterns` is the security gate any external source must pass. Preview the two-pass structure (local first, remote second). Keep it to ~4 sentences plus the cost list; warm but brief.

`Term` definitions to place here (first appearance):
- **CLS** — "Cumulative Layout Shift — how much visible content jumps around as the page loads. An image with no reserved height pushes everything below it down when it arrives."
- **LCP** — "Largest Contentful Paint — the moment the biggest above-the-fold element (often the hero image) finishes painting. A slow LCP is a slow-feeling page."
- **Core Web Vitals** — "Google's three headline page-experience metrics; LCP and CLS are two of them." (one `Term`, brief; depth is chapter 094 — say so in half a clause.)

### Why a plain `<img>` is the wrong default

Goal: make the failure visceral *before* showing the fix, so the component feels earned rather than imposed. This is the "trigger before tool" beat.

Walk the four structural failures of `<img>`, each tied to a consequence:
1. **One size for everyone** — a 2000px source ships to a 360px phone. Wasted bytes, slow load.
2. **No reserved space** — the browser doesn't know the image's box until bytes arrive, so it renders at zero height then reflows. That reflow *is* CLS.
3. **No lazy-loading discipline** — every image fetches immediately, competing with above-the-fold content for bandwidth. (Note `loading="lazy"` exists natively but is opt-in and doesn't solve sizing or format.)
4. **Whatever format the source is** — a PNG stays a PNG even when the browser would happily take a 30%-smaller AVIF.

Then the senior reframe: a senior fixes all four by hand on a hand-built page. `next/image` does it structurally. Land the mental-model sentence: **"`next/image` is the discipline of a careful senior, encoded as a component default."**

**Diagram — the CLS reflow (HTML + CSS).** A two-row before/after strip. Top row "`<img>`": three stacked boxes (heading, image placeholder at 0px, paragraph) showing the paragraph sitting high, then an arrow to the same stack with the image now at full height and the paragraph shoved down — a literal jump. Bottom row "`next/image`": the image box reserves its height from the start (dashed outline placeholder), so the paragraph never moves. Pedagogical goal: make "reserved space prevents the jump" a *picture*, because CLS is the single hardest image concept to convey in prose. Wrap in `<Figure>` with a caption naming this as CLS. Keep it short and horizontal per the vertical-space constraint.

### The local image: static imports and the four required props

Goal: the simplest complete picture. A bundled, design-time-known image carries no security surface and gets the most for free — start here.

Teach the **static import** path first: `import logo from './logo.png';` produces a *typed object*, not a string — `{ src, width, height, blurDataURL }`. Next reads the file at build, so it knows the intrinsic dimensions and can reserve space without you typing numbers. Show `<Image src={logo} alt="Acme" />` — note that with a static import you don't pass `width`/`height` (they ride on the object).

Then the **four required props** when `src` is a plain string (the remote/explicit case the next section needs): `src`, `width`, `height`, `alt`.
- Critical correction of the universal beginner misread: `width`/`height` are the **intrinsic aspect ratio**, *not* the display size. They tell the component the shape so it can reserve the right box; CSS controls how big it actually renders. A `width={1200} height={630}` image can display at 400px wide via a `className` — the ratio is what matters.
- `alt` is required by the type. Empty string `alt=""` for purely decorative images (tells screen readers to skip it) — this is a deliberate choice, not a shortcut. Cross-link the accessibility discipline lightly (full a11y is its own track).

**`fill` for unknown-size containers.** When the parent's size is set by CSS/layout and you can't know pixel dimensions (a card thumbnail, an avatar in a flex row), use `fill` instead of `width`/`height`. The image absorbs the nearest positioned ancestor. **Hard rule, stated here and repeated:** `fill` *requires* a `sizes` prop — without it the browser downloads the largest variant. Forward-reference `sizes` (next section) and prefer fixed dimensions whenever they're known.

Component: `CodeVariants` with two tabs — "`<img>`" (the naive version, `del`-marked on the bare tag) and "`next/image`" (the static-import version, `ins`-marked). The before/after *is* the teaching unit; first sentence of each pane names the tradeoff ("ships one fixed size" vs. "sized, lazy, format-negotiated, free blur"). This is also the student's first sight of the `import Image from 'next/image'` line — point it out.

`CodeTooltips` candidates on this block: `blurDataURL` (auto-generated low-res preview baked into the import), `fill` (absorb the positioned parent instead of carrying intrinsic dimensions).

### The props you author: sizes, preload, placeholder, quality

Goal: this is where the real performance leverage lives, and where beginners under-invest. These four props apply to *both* local and remote images, so they sit between the two passes. Organize by mapping each prop back to LCP or CLS so the student sees *why* it exists, not just *that* it exists.

**`sizes` — the single highest-leverage, most-skipped prop.** Frame hard: this is "the prop that makes responsive images actually work." Without it (on `fill`, or to override the default on a sized image), the browser can't know how wide the image will render at each breakpoint, so it conservatively grabs the biggest `srcset` candidate — exactly the oversized-bytes failure `next/image` was supposed to fix. The syntax is a media-condition list read left-to-right, first match wins: `sizes="(min-width: 1024px) 33vw, 100vw"` = "at ≥1024px the image occupies a third of the viewport; otherwise full width." Teach how to *derive* the string from the layout (a 3-column grid → `33vw`; a full-bleed hero → `100vw`). This maps to wasted bytes / load time.

**Diagram — how `sizes` + `srcset` pick a file (HTML + CSS).** A horizontal strip: the optimizer generates several width variants (e.g. 640 / 1080 / 1920 px tiles shown as a row). Below, two device frames (phone, desktop) each with its `sizes`-computed slot width, an arrow pointing at the variant the browser actually fetches for that device. Pedagogical goal: show that `sizes` is an *input to the browser's pick*, not a CSS size — the most common conceptual miss. Keep horizontal and compact; `<Figure>` with caption.

**`preload` — for the LCP image only (and the `priority` rename).** The above-the-fold hero, the lead product photo — the one element the user sees first. `preload={true}` inserts a `<link rel="preload">` in `<head>` so the image starts loading before the browser discovers it in the `<body>`, directly improving LCP. **Version-critical correction the student must get right:** in **Next.js 16 the old `priority` prop is deprecated in favor of `preload`** (renamed to make the behavior — "this inserts a preload link" — explicit). Teach `preload`; mention `priority` *once* as "what older codebases and tutorials call it" so the student recognizes it when reading existing code (the TOC and other unvetted outlines still say `priority` — this lesson is the corrected source). The discipline: **one per page, ideally** — preloading everything floods the queue and destroys the signal. The docs add a real nuance worth one line: when the LCP element *changes by viewport* (different hero on mobile vs. desktop), `preload` is the wrong tool — `loading="eager"` or `fetchPriority="high"` fit better. Keep that as a brief "and when not to" aside, not a deep dive. Maps to LCP. (Which exact element to pick is chapter 094 lesson 2 — name the forward reference, don't pre-teach.)

**`placeholder="blur"` — perceived-performance polish, for heros only.** Shows a tiny blurred preview while the full image streams in, so the box isn't empty. Static imports get `blurDataURL` for free (named in the local section); remote sources need a generated blur or an inline base64 string you supply. Cost/benefit: worth it for large hero/media images, noise for a 32px avatar — don't blanket it. Maps to perceived load (a CLS-adjacent UX win).

**`quality` and the Next.js 16 `qualities` allowlist.** Get the semantics exactly right (verified against the 16.2 docs — several blog posts state this loosely):
- The default `images.qualities` is now **`[75]`** — a single allowed value, not the old `1..100` range. This trims `srcset` bloat and closes an abuse vector.
- To use any other quality, you must add it to the allowlist: `images.qualities: [50, 75, 90]` in `next.config.ts`.
- If a `quality` prop isn't in the array, the component **uses the closest allowed value** (it does *not* throw). Only hitting the optimizer's REST endpoint directly with an unlisted quality returns a **400**. So "non-default quality without the config" doesn't crash the page — it silently rounds to an allowed value, which is its own subtle bug (you asked for 90, got 75).
- Why it exists: an unbounded quality range lets an attacker request thousands of distinct variants and explode your optimizer cache. The single-value default is a security-and-cost default.
- Flag explicitly that this **changed in the 15→16 upgrade**: code that passed arbitrary `quality` values now silently coerces to 75 until the array is widened. A concrete "the platform changed under you" senior note.

Frame the takeaway: leave quality at the default 75 unless you have a measured reason; the moment you don't, the config and the prop must agree.

Interactive check here: a `Dropdowns` (fenced-code mode) over a small `next/image` JSX block — blanks for the `sizes` value given a stated layout ("full-width hero" → `100vw`), and which prop preloads the LCP image (`preload`, with `priority` as a decoy option to surface the rename). Reinforces the two trickiest authored props at the point of teaching.

### External images: the optimizer and remotePatterns as the security gate

Goal: pass two. Introduce the optimizer (so `remotePatterns` makes sense), then the security problem, then the gate. Order matters — the student must understand *why* an external URL is dangerous before the config feels like more than boilerplate.

**The optimizer, briefly.** When `src` is a remote URL (an S3 object, a CDN asset), the browser doesn't fetch it directly — it requests *your app's* optimizer endpoint (`/_next/image?url=...&w=...&q=...`), which fetches the original, transcodes it to the negotiated format at the requested width and quality, caches the result, and serves it. This is what produces the `srcset` variants and AVIF/WebP for remote images too. On Vercel this is the built-in Image Optimization, edge-cached and keyed by URL + width + quality + format. Name the cost honestly: optimization is metered on Vercel's plan — it's not free, which is *another* reason not to let arbitrary URLs through.

**The security problem — make it concrete.** That optimizer endpoint takes a URL and fetches it on your server's behalf. If you let it fetch *any* URL, an attacker hits `/_next/image?url=<some-huge-file-anywhere>&w=...` over and over — routing arbitrary, possibly enormous images through *your* optimizer, burning *your* compute and bandwidth bill, and using your domain as an open image proxy. This is the failure `remotePatterns` exists to close.

**`remotePatterns` — the allowlist.** In Next.js 16, **any** non-local image source requires a matching `remotePatterns` entry in `next.config.ts` — the optimizer refuses a URL that doesn't match. Shape: `{ protocol, hostname, port, pathname, search }`. Author one entry per real origin: name the exact `hostname` (`'assets.acme-cdn.com'`), pin `protocol: 'https'`, and tighten `pathname` to the prefix you actually serve (`'/uploads/**'`) when you can. **The cardinal rule, taught as a before/after:** never `hostname: '**'` or a leading-wildcard hostname in production — that re-opens the exact abuse you just closed. A wildcard is convenient in a tutorial and a vulnerability in prod.

Component: `CodeVariants` with two tabs — "Wildcard (don't)" showing `hostname: '**'` with the first sentence naming it an open-proxy vulnerability, and "Scoped" showing two real origins with tight `pathname`. The contrast carries the security point better than prose. `CodeTooltips` on the scoped version for each field: `protocol` (pin to `https`), `hostname` (exact host, no leading `**`), `pathname` (glob the path prefix you serve), `search` (constrain query strings, e.g. signed-URL params).

**`localPatterns` — the local-image sibling, named once.** New in 16: a local image (served from your own origin) that carries a **query string** in its `src` needs a matching `images.localPatterns` entry, same allowlist idea applied to local paths. Most projects never hit this (plain `/public` paths don't); name it in one sentence so a student who *does* use query-stringed local images recognizes the error rather than thrashing. Don't expand it.

Decision rule to state plainly, tying the two passes together: **asset provenance picks the path.** Design-system and marketing assets you control at build time → `/public` or a static import (no `remotePatterns` needed). User-generated or third-party assets fetched at runtime → remote `src` + a `remotePatterns` entry. This is the takeaway the whole lesson builds toward.

### The optimizer pipeline and its limits

Goal: round out the mental model of what's actually happening, and set honest expectations about what the platform optimizer does and does *not* do — so the student reaches for the right tool when they outgrow it.

**Format negotiation.** The optimizer reads the `Accept` header and serves AVIF or WebP to browsers that support it, falling back to the original otherwise. `images.formats` controls the menu; default is WebP. AVIF compresses ~20% smaller but encodes ~50% slower (first-request latency). Senior pick for most SaaS surfaces: **WebP-only** unless the asset library is large and bandwidth is the dominating cost — then add AVIF. Don't cargo-cult AVIF on; it's a tradeoff, not a free win.

**`deviceSizes` / `imageSizes` — leave them alone.** These govern the `srcset` widths the optimizer generates. The defaults cover common breakpoints. Name them so the student recognizes the keys in a config, but the rule is "don't touch until profiling shows a real gap." This is a *defaults-before-conditionals* beat — name the default, name the threshold, move on.

**What the platform optimizer does NOT do.** Width, quality, and format are the *only* transforms. No crop, no overlay, no text, no smart-cropping to a focal point. The moment you need those, reach for a dedicated image service (Cloudinary, Imgix, Cloudflare Images) or run `sharp` in a background job (forward-reference to Unit 12 background work). Setting this boundary prevents the student from expecting `next/image` to be a full image-processing pipeline.

**SVGs and the `unoptimized` escape hatch — rare, and one path is a security trap.** Get the SVG behavior right (verified against the docs — the common phrasing "SVGs are refused" is wrong):
- `unoptimized` bypasses the optimizer entirely and serves the original. Legitimate for already-optimized assets where re-encoding is wasted work.
- **SVGs are not optimized by default — Next serves them `unoptimized` automatically when `src` ends in `.svg`.** They're a vector format (resize losslessly, no transcoding needed) and they can carry script (an XSS vector), so the optimizer stays out of the way rather than running them.
- To run SVGs *through* the optimizer you must set `images.dangerouslyAllowSVG: true` — and the name is a warning. Doing so safely also requires `contentDispositionType: 'attachment'` and a locked-down `contentSecurityPolicy` (`script-src 'none'; sandbox;`) so an embedded script can't execute. Mention this combination exists; the full CSP story is chapter 081.
- **Hard rule:** never enable SVG optimization for *user-provided* SVGs — a malicious SVG runs script in your origin. Trusted, design-system SVGs only, and prefer inlining or a static import for those anyway (a logo is usually a React component, not an `<Image>`).

**Self-hosting — named, deferred.** The optimizer needs a `sharp`-capable function; off Vercel you wire a `loader`/`loaderFile` to an alternative (an external image CDN). One sentence; full pattern is chapter 098. Don't teach it — just close the "what if I'm not on Vercel" loop so it doesn't nag.

### Worked example: three images on one product page

Goal: synthesis. Put all three asset paths on one realistic page so the student sees the decisions side by side — this is the artifact they'll pattern-match against in real work.

The three images (straight from the chapter framing):
1. **Brand logo** — static import (`import logo from '@/app/_assets/logo.png'`), no explicit dimensions, no `preload` (it's small, in the nav, not the LCP element). Shows the zero-config local path.
2. **Product photo from S3** — remote `src`, explicit `width`/`height`, a derived `sizes` string for its grid slot, `preload` because it's the above-the-fold hero of this page (use the current prop, not the deprecated `priority`), possibly `quality={90}` to motivate the `qualities` array. Shows the remote path + the LCP pick.
3. **Customer avatar** — `fill` mode inside a fixed-size rounded container, paired `sizes` (a small fixed pixel size like `sizes="40px"`), remote `src`. Shows `fill` + the always-required `sizes`.

Then the matching `next.config.ts` slice: `images.remotePatterns` with the S3/CDN origin(s) for images 2 and 3, and `images.qualities: [75, 90]` to satisfy image 2's custom quality. Make the page→config dependency explicit — "this prop on the page requires this entry in the config" — because that coupling is exactly what trips people up.

Component: `AnnotatedCode` over the page JSX (it's dense and multi-part — step through each image and call out its distinguishing props), then a plain `Code` block for the `next.config.ts` slice with `ins`-marked lines for the two `images` keys. In the annotation steps, explicitly tie each image back to its decision: "logo → static import, no preload"; "product → remote + preload + custom quality (note the config)"; "avatar → fill + sizes". Follow `Code conventions`: single quotes, 2-space indent, `import Image from 'next/image'`, named/default-export rules (config default-exports per framework), `@/` alias for the asset import path.

### Closing: the discipline, restated

Goal: collapse the lesson to a durable rule and one decision the student carries out the door.

Restate the spine: every image prop maps to CLS (reserved space) or LCP (preload the one that matters) or bytes (size + format), and `next/image` makes that discipline the default so you don't re-derive it per page. The one-line provenance rule: **assets you ship → static import; assets users upload → remote `src` + `remotePatterns`, never a wildcard host.** The three reflexes to internalize: `sizes` on every `fill`; `preload` on exactly the LCP image; an explicit `hostname` for every external origin.

Optional `ExternalResource` LinkCards: the Next.js `next/image` component API reference and the `images` config reference. Optional `VideoCallout` only if a recent, accurate walkthrough is found in fact-checking — skip rather than embed a stale one.

---

## Scope

**Prerequisites — restate in one concise clause each, do not re-teach:**
- `next.config.ts` is a typed default-exported `NextConfig` object read once at startup, requires a dev-server restart after edits (chapter 034 lesson 1) — relevant because `images` config lives here. Reuse lesson 1's restart gotcha if a config edit "doesn't take."
- Server Components are the default; `next/image` is used in them without a directive (chapters 030, 032). No need to re-explain the boundary.
- JSX, props, TS imports (Units 1–4) — assumed.

**Explicitly out of scope (name only where the lesson naturally gestures at them, with a one-clause forward reference; do not teach):**
- **Core Web Vitals depth** — thresholds (p75), INP, field-vs-lab data, measurement tooling. Defined here only as much as the props require (CLS = jump, LCP = biggest paint). Full treatment: chapter 094, esp. lessons 1 and 2. The `priority`-and-exact-LCP-element detail is chapter 094 lesson 2 — name it, don't pre-empt it.
- **Object storage, S3/R2, presigned uploads** — how the product photo *got* to S3. This lesson consumes a remote URL; producing one is chapter 068. The avatar/product images are assumed already stored.
- **Self-hosted image optimization** — `loader`/`loaderFile` and running off Vercel. One sentence to close the loop; full pattern chapter 098.
- **Security headers (CSP, etc.) for image sources** — chapter 081. `remotePatterns` here is the optimizer allowlist, a different mechanism; don't conflate.
- **`next/font`** — chapter 034 lesson 4. Sibling primitive, separate lesson.
- **Background image processing with `sharp`** — Unit 12. Named only as "where richer transforms go."
- **Tailwind styling specifics** — assume `className` works; don't teach the utility classes used to size/round images.
- **`generateImageMetadata`, `opengraph-image.tsx`** — those are SEO/OG image surfaces (chapter 034 lessons 6–7), unrelated to `next/image` content images. Do not pull them in.

**Deliberate convention divergences (note for downstream agents):**
- The naive `<img>` examples violate the course's raw-`<img>` ban (chapter 094 lesson 2 ESLint rule) **on purpose** — they exist to be the cautionary before-state. Mark them clearly as the anti-pattern.
- Worked-example dimensions/origins are illustrative (`assets.acme-cdn.com`, an S3 host); keep them coherent with the chapter's `@acme/*` fictional-vendor convention from lesson 1 where natural.

---

## Continuity notes to update after authoring

Record for chapter coherence: the `Term`-defined metrics here (**CLS**, **LCP**, **Core Web Vitals**) and that they are defined *minimally* (lesson 3 and the project may reuse the Terms; chapter 094 owns the depth). Note the asset-provenance decision rule (static import vs. `remotePatterns`) as established. Note that `images` config keys (`remotePatterns`, `localPatterns`, `qualities`, `formats`, `deviceSizes`, `imageSizes`, `dangerouslyAllowSVG`) are now introduced — lesson 1's one-screen config map promised `images` would land here. **Version facts verified against the 16.2 docs (lastUpdated 2026-03):** `priority` is **deprecated in Next.js 16 in favor of `preload`** (taught the new form; the chapter 094 TOC bullet still says `priority` and is stale — flag if that lesson is authored). `images.qualities` defaults to **`[75]`**, quality coerces to the *closest* allowed value (only the raw optimizer endpoint 400s). `remotePatterns` mandatory for remote sources in 16; `localPatterns` required for query-stringed local sources. Default `formats` is **`['image/webp']`**. SVGs are served **`unoptimized` automatically** (not refused); `dangerouslyAllowSVG` + CSP runs them through the optimizer.

# Chapter 3.1 — How a request becomes a page

## Chapter framing

This chapter opens Unit 3. Units 1 and 2 pinned the toolchain and the language; the student has a Next.js 16 codebase running and a TypeScript surface they can read. They have never been forced to think about *what happens between typing a URL and seeing pixels.* The framework hides the seams — `pnpm dev` produces a working page, the browser shows the page, the cycle closes. Every later chapter in Unit 3 (HTTP methods, headers, status codes, URLs and origins, cookies, the DOM, Fetch, the platform APIs the UI reaches for) and Unit 4 (the React render model, SSR, hydration) lands on the same substrate. The substrate is invisible until the student can name its parts.

This chapter installs the substrate. By the end the student can walk a senior through every step from the moment a URL is committed in the address bar to the moment the page is interactive — DNS resolution, transport setup, the TLS 1.3 handshake, the HTTP request, the server's response, HTML parsing into the DOM, the CSSOM, the render tree, paint, JavaScript execution, and (since the course's stack is Next.js 16) the hydration step where the server-rendered HTML becomes an interactive React tree. HTTPS gets its own lesson because the dev-time surface — `localhost`, self-signed certificates, the cookie `Secure` flag that won't fire on `http://`, the cert-chain failure that mints a four-hour debugging session — is where the abstraction first leaks for a SaaS engineer.

The senior framing for the chapter: **the framework's job is to hide this stack; the senior's job is to know what the framework hid.** When the page is white for two seconds, when hydration mismatches an attribute, when the cookie isn't set, when the dev box can't `fetch` from a `https://api.example.com` because the cert doesn't validate, the senior debugs at the layer the framework abstracted. They don't need to write a TLS implementation. They need the mental model that tells them which layer the failure lives at and what tool reads it.

Threads that must run through every lesson:

- **Names before mechanics; mechanics before lore.** Every primitive in the chapter gets named (the resolver, the TLS handshake, the HTML parser, the render tree, hydration) before the lesson walks the mechanics. The lessons refuse to wade into the historical arc (HTTP/1.1 head-of-line blocking, the SPDY origin story, why TLS 1.2 had RSA key exchange) — the 2026 default is HTTP/2 or HTTP/3 over TLS 1.3, served by a CDN at the edge, and that's what the lesson teaches. Older protocols are named in one line where contrast clarifies; never in their own section.
- **The 2026 transport is HTTP/3 over QUIC where available, HTTP/2 over TLS 1.3 as the universal fallback.** Every CDN the course will touch in Unit 21 (Vercel's edge, Cloudflare on Cloudflare R2 in Unit 13) negotiates HTTP/3 with modern browsers; the student should know that the protocol on the wire is not the HTTP/1.1 of the canonical textbook diagram, and what's different (multiplexed streams, header compression, 0-RTT in TLS 1.3, no head-of-line blocking at the transport layer). The detail isn't load-bearing for every later chapter, but the student should recognize the protocol names on a Network panel.
- **The substrate names the seams where SSR and hydration land.** Chapter 4.7 (the React render model) and Unit 5.1 onward (Next.js's App Router and Server Components) will reference "the HTML that hydrates," "the client bundle that downloads," and "the second render that reconciles." Those are seams in the substrate this chapter installs. The lesson names each one — *initial HTML*, *render tree*, *first paint*, *first contentful paint*, *bundle load*, *hydration*, *interactive* — so when Unit 4 says "hydration," the word is already concrete.
- **HTTPS is not a Unit 21 deployment concern; it's a Day 1 dev-loop concern.** The course's first scaffold (Chapter 1.4) ran on `http://localhost:3000`. The student will hit four sites in Unit 3 onward where HTTP-only `localhost` doesn't behave like production: the cookie `Secure` flag (Chapter 3.4 — won't set on `http://`), the Service Worker registration (out of scope, but worth naming), the `Clipboard` API's secure-context requirement (Chapter 3.7.3), and the WebCrypto `subtle` interface (Chapter 3.7.2 — requires secure context). The lesson names the secure-context concept here and points to `mkcert` as the dev-time bridge so the student isn't stuck the first time the API refuses to fire on `http://`.
- **The DevTools Network panel is the chapter's instrument.** Chapter 1.3.3 installed the four-panel DevTools mental map; the student has seen the Network panel once. This chapter is where it earns its full weight. Every lesson opens DevTools, navigates to a real page, and reads the timing waterfall: DNS, TCP, TLS, the response, parsing, paint. The student leaves with the habit "open Network before reproducing the bug."
- **Naming for intent stays operating.** A timing measurement is named for what it measures (`ttfb`, `lcp`, not `time`). A certificate is named for what authority issued it (`letsencryptCert`, not `cert`). The 2.2.3 reflex runs through every snippet.
- **Senior anchors for later units are seeded here.** The TLS handshake's "secure context" lands again in Chapter 3.7.2 (WebCrypto) and 3.7.3 (Clipboard). The HTTP/2 multiplexing model lands again in Chapter 3.2 (the headers and method semantics that ride it). The hydration mental model lands again in Unit 4.7 (the render model), Unit 5.2 (the server/client boundary), and Unit 5.3 (async UI primitives). The `mkcert` bridge lands again in Chapter 3.4 (cookies with `Secure`) and Chapter 17.2 (the security baseline). Every lesson plants the forward reference at the call site.

This chapter ships almost no JavaScript code; the deliverable is mental model and reading fluency. Diagrams carry weight: a sequence diagram for the URL-to-first-byte leg, a hand-authored or animated SVG for the parsing-to-paint leg with the SSR/hydration overlay, a small Mermaid for the TLS handshake at the depth that matters, and a TabbedContent or interactive widget for the secure-context-required API matrix. A handful of terminal-style walkthroughs use `mkcert`, `dig`/`nslookup`, `openssl s_client`, and the DevTools Network panel as the chapter's instruments. The student finishes the chapter able to draw the request lifecycle on a whiteboard, name where each step's failure mode shows up in DevTools, set up a local HTTPS dev loop with `mkcert`, and explain to a junior why the `Clipboard` API refuses to fire on `http://localhost:3000` but works on `https://localhost:3000`.

The chapter ordering follows the layering. The network-side leg (URL bar to first byte) comes first because the second leg (first byte to pixels) depends on knowing what arrived. The browser-side leg (bytes to pixels) comes second because hydration is the chapter's payoff and Unit 4's setup. HTTPS comes third as the lesson that closes the chapter by naming the dev-time leak the first two lessons referenced repeatedly without resolving. The quiz closes the chapter and Unit 3's opening.

The TOC packs the entire request lifecycle into one bullet (3.1.1). One bullet is too much for one lesson at the grain rule (less than 1h student time, and the topic spans two distinct mental models — the network side and the browser side). Splitting it gives each model room to land and lets the student stop after either lesson with a coherent piece in hand. The HTTPS lesson is kept tight to its dev-time bite — TLS 1.3 mechanics at the depth that helps debug, not at the depth that helps implement.

---

## Lesson 3.1.1 — URL bar to first byte

Walk the four-step network leg from a URL commit to the first byte of HTML — DNS resolution, TCP/QUIC connection, the TLS handshake, and the HTTP request — and read each step on the DevTools Network waterfall against the 2026 HTTP/3-over-QUIC protocol stack.

Topics to cover:

- The chapter-opening senior question: the student commits a URL in the address bar; what happens *before* a single byte of HTML reaches the browser. The naive answer is "the browser fetches the page." The senior answer names four steps — resolution, connection, security handshake, request — and locates the latency of each on a DevTools timing waterfall. The lesson installs the names and the cost model.
- **The address bar is not just an input field**, named briefly. The browser disambiguates between a search query and a URL by URL-parsing rules; URLs that don't include a scheme default to `https://` in modern browsers (the Chrome HTTPS-by-default rollout completed in 2023). The student writes the scheme explicitly in production code; the address-bar inference is convenience only.
- **Step one: DNS resolution.** The browser turns a hostname into an IP address by walking the resolver chain — the OS resolver, the configured DNS server (usually the router or an explicit `1.1.1.1`/`8.8.8.8`), and the recursive resolver that walks the root, TLD, and authoritative name servers. The senior reach: DNS is cached at three layers (browser, OS, resolver) and the cache TTL is set by the authoritative server's record. The bug class: a stale DNS cache in the OS that points at a dead origin. The dev tool: `dig hostname` or `nslookup hostname` on the terminal reads the answer. Named once; the student doesn't need to walk a recursion tree, they need to know the cache lives at three layers.
- **DNS over HTTPS (DoH) and DNS over TLS (DoT)**, named in one paragraph. The 2026 reality: every modern browser encrypts DNS lookups by default to a configured DoH endpoint (Chrome's default is the OS resolver if it supports DoH, else direct DoH to Cloudflare or Google for users who opted in; Firefox defaults to Cloudflare DoH in the US, NextDNS or local resolver elsewhere). The dev-time consequence: tools like `dig` query the OS resolver and may see different results than the browser; debugging "the site loads in Chrome but not from `curl`" sometimes lands on this. Named for recognition.
- **Step two: the transport connection.** Once the IP is known, the browser opens a TCP connection (port 443 for HTTPS) or — increasingly — a QUIC connection (over UDP, also port 443) when the server's `Alt-Svc` header advertised HTTP/3 on a prior visit. The senior reach: connection setup is a round-trip cost (one RTT for TCP, sometimes zero RTTs for QUIC with 0-RTT enabled in TLS 1.3) and a measurable component of every page load on a cold connection. The browser pools connections — successive requests to the same origin reuse the same TCP or QUIC connection through HTTP/2 multiplexing or HTTP/3 streams.
- **HTTP/1.1, HTTP/2, HTTP/3 at the level a SaaS engineer needs**:
  - **HTTP/1.1** is the legacy protocol. One request per connection (or pipelined, which never worked correctly in practice). Head-of-line blocking at the application layer. The 2026 senior reach: the student recognizes the name, knows it's the protocol of the original HTTP textbook, and writes code that doesn't depend on which version is on the wire. Dismissed in one paragraph.
  - **HTTP/2** is the multiplexed binary protocol that's been the deployed default since roughly 2016. Multiple concurrent requests on one TCP connection, header compression (HPACK), server push (deprecated and unused in 2026). The senior knows that "open six connections to parallelize" is an HTTP/1.1 reflex that costs more than it saves on HTTP/2. The bug class HTTP/2 fixes: the six-connection-per-origin cap that throttled fat pages on HTTP/1.1.
  - **HTTP/3 over QUIC** is the 2026 deployed default at every major CDN (Cloudflare, Vercel's edge, Fastly, CloudFront). Built on UDP, encryption integrated into the transport (no separate TLS handshake — TLS 1.3 is part of QUIC), no head-of-line blocking at the transport layer (a packet loss on one stream doesn't stall the others). The senior knows the protocol on the wire is HTTP/3 on a modern browser hitting a modern CDN. The recognition site: the DevTools Network panel's "Protocol" column shows `h3` for HTTP/3, `h2` for HTTP/2.
- **Step three: the TLS 1.3 handshake**, at the depth that lands here (the full HTTPS treatment is in 3.1.3). Named in one tight paragraph for the lifecycle frame: the client sends a ClientHello with supported cipher suites and the SNI hostname, the server responds with the certificate chain, key exchange happens, both sides derive session keys, the connection is encrypted from that point. The 2026 reality: TLS 1.3 is one round-trip (1-RTT) for a fresh connection, zero round-trips (0-RTT) for a returning session resumption. Named here; the lesson 3.1.3 owns the certificate-chain mechanics and the dev-time bite.
- **Step four: the HTTP request itself.** Once the encrypted channel is up, the browser sends the HTTP request: method (`GET` for the navigation), path (`/dashboard`), headers (`Host`, `User-Agent`, `Accept`, `Accept-Language`, `Accept-Encoding`, `Cookie`, `Referer`, plus modern client hints like `Sec-CH-UA`), and an empty body for a `GET`. The senior reach: every header has a purpose, every cookie that's set on the origin gets sent. The course's Chapter 3.2 owns the full HTTP semantics; this lesson names the seam.
- **The server response**, named for the lifecycle frame. The server processes the request (on Vercel's edge: the Next.js handler runs, queries the database through Drizzle, renders the React tree to HTML, streams the response back). The first byte arrives back at the browser. The TTFB (Time to First Byte) is the measurement that captures everything up to this point — resolution, connection, security, request, server processing. The senior watches TTFB as the canonical "is the network leg healthy" metric.
- **The DevTools Network panel as the canonical reading instrument.** The student opens Network, navigates to a real page, and reads the timing breakdown on the document request:
  - **Queueing** — the browser's internal queue (waiting for a connection slot).
  - **Stalled / Blocked** — waiting for connection-pool availability or proxy negotiation.
  - **DNS Lookup** — the resolution cost when not cached.
  - **Initial Connection** — TCP/QUIC handshake.
  - **SSL** — the TLS handshake (named "SSL" by Chrome for historical reasons; it's TLS).
  - **Request sent** — the round-trip the request itself takes.
  - **Waiting for server response (TTFB)** — the server doing its work.
  - **Content download** — the bytes streaming in.
  The student reads each row on a real page and locates the latency. The reading habit is the lesson's primary deliverable.
- **The `Performance` API as the programmatic surface**, named once. `performance.getEntriesByType('navigation')` returns a `PerformanceNavigationTiming` entry with every timestamp the lesson named — `domainLookupStart`/`End`, `connectStart`/`End`, `secureConnectionStart`, `requestStart`, `responseStart`, `responseEnd`. The senior reach for production observability (Unit 20.3) is to ship these timings to a real-user-monitoring service. Named for recognition; the depth is in Chapter 20.3.
- **The watch-outs a senior names**:
  - **A long TTFB is almost never "the network."** It's usually the server doing slow work (an unindexed Drizzle query, a missing cache hit, a synchronous external API call). The senior reflex: a slow TTFB sends you to the server logs (Unit 20.1) and the database query plan (Chapter 6.4), not to the network layer.
  - **Connection reuse hides the cost of new origins.** The first request to a new origin pays DNS + TCP + TLS; the second through Nth requests on the same origin pay none of those. The senior watch-out: a SaaS dashboard that fetches from three different subdomains pays three handshakes in parallel; consolidating onto one origin (or using a CDN with origin fan-out) is a real win.
  - **HTTP/2 and HTTP/3 multiplex on one connection** — the senior knows that bundling assets to reduce request count is an HTTP/1.1 optimization that doesn't apply to the 2026 protocol stack. The 2026 reach: serve assets with the granularity the framework chooses (Next.js's chunks, the Tailwind CSS file) and trust the protocol.
  - **DNS cache poisoning is rare**; cache *staleness* is common. The dev box that "can't reach the new endpoint" 80% of the time is a stale DNS cache (`sudo dscacheutil -flushcache` on macOS, or restart). The senior knows the recipe.
  - **HTTPS is enforced by the browser**, not by the server. Hitting `http://example.com` redirects to `https://` when the server is configured with HSTS (Chapter 17.2 owns the header). The redirect is itself a round-trip; production apps preload HSTS to skip the redirect on first visit.

What this lesson does not cover:

- The browser-side leg — parsing, render tree, paint, hydration (3.1.2 owns it).
- The TLS 1.3 handshake at depth and certificate-chain mechanics (3.1.3).
- HTTP method semantics, status codes, and the headers surface (Chapter 3.2).
- The URL spec, `URLSearchParams`, percent-encoding (Chapter 3.3).
- Cookies, `SameSite`, `Secure`, `HttpOnly` (Chapter 3.4).
- The Fetch API surface, request and response objects (Chapter 3.6).
- Core Web Vitals (LCP, FID, CLS, INP) at depth (Chapter 20.3).
- TCP congestion control, QUIC frame formats, the recursive DNS spec — out of scope for the course.
- Service workers, push notifications, the offline cache — out of scope.

Pedagogical approach:

Concept archetype as the chapter's first load-bearing lesson. The lesson teaches a mental model that the rest of the unit (and Unit 4's SSR/hydration story) leans on. Open with the senior question — "you type a URL and hit enter; what happens before the first byte of HTML?" — and a small interactive panel where the student watches a real navigation in DevTools Network. The lesson then walks the four steps in sequence.

A `Figure` with a Mermaid sequence diagram lays out the four steps (DNS, TCP/QUIC, TLS, HTTP) as message exchanges between the browser, resolver, and server. The student sees the round-trip count for a cold connection (3-4 RTTs on classic TCP+TLS 1.3, 1-2 RTTs on QUIC) and the warm-connection short-circuit. The diagram is the lesson's anchor.

A `TabbedContent` block organizes the three HTTP versions: tab 1 is HTTP/1.1 with the connection-per-request model and head-of-line blocking, tab 2 is HTTP/2 with multiplexing over TCP, tab 3 is HTTP/3 with multiplexing over QUIC. Each tab has the recognition site (the DevTools Protocol column), the "what it fixed over the prior version" line, and the senior watch-out. The student leaves with the version palette and the recognition habit.

A short setup/wiring walkthrough has the student open DevTools, navigate to a real page (the course's home page or a major SaaS like `vercel.com`), and read the Network panel's timing breakdown on the document request. The student annotates each row in their own words (the lesson provides a worksheet-style fillable component or a Code review-style exercise where the student labels each timing segment with what it measures). The reading-the-waterfall reflex is the lesson's primary deliverable.

A second setup/wiring walkthrough has the student run `dig example.com`, `dig +trace example.com`, and (on a TLS-aware terminal) inspect the negotiated protocol with `curl -v --http3 https://example.com 2>&1 | grep -i 'http'` to see HTTP/3 advertised. Five minutes; the goal is recognition that the protocol on the wire is a real thing the student can observe, not a textbook abstraction.

A small `MultipleChoice` exercise: given a Network panel screenshot with a slow TTFB and a fast Content Download, pick the most likely root cause from four options (slow DNS — wrong; slow TLS — wrong; slow server work — right; large response body — wrong because download is fast). The discrimination is the deliverable; the senior reflex is "TTFB is server work, not network."

A `Matching` exercise: pair each Network timing row (DNS Lookup, Initial Connection, SSL, Waiting, Content Download) with the underlying step (resolver chain, TCP/QUIC handshake, TLS handshake, server processing, response body streaming). The vocabulary is locked in.

Close with a small `PredictOutput` exercise on a `performance.getEntriesByType('navigation')[0]` call in DevTools Console — the student predicts which timestamp field corresponds to which Network row. The seam between the visual tool and the programmatic API closes.

Estimated student time: 45 to 55 minutes. Load-bearing for the rest of Unit 3 and Unit 4.

---

## Lesson 3.1.2 — First byte to pixels

Trace the browser-side pipeline from HTML bytes to an interactive page — parser to DOM, CSSOM, render tree, layout, paint, composite — and overlay the SSR plus hydration model that Unit 4 and Unit 5 will land on.

Topics to cover:

- The senior question: the first byte of HTML has arrived; what does the browser actually do with it. The naive answer is "renders it." The senior answer walks the pipeline — parse to DOM, parse CSS to CSSOM, build render tree, layout, paint, composite — and locates each step's failure mode. The lesson installs the pipeline and overlays the SSR/hydration mental model the rest of the course (Chapter 4.7, Unit 5 onward) is going to lean on.
- **The HTML parser**, as the entry point. The browser receives HTML as a byte stream, decodes it according to the `Content-Type` charset (UTF-8 in 2026, always), and parses it into a tree of nodes — the **DOM** (Document Object Model). The parser is streaming: it builds the DOM incrementally as bytes arrive, which is why a `<head>` block at the top of the document can issue resource hints before the `<body>` is even parsed. The full DOM surface lands in Chapter 3.5; this lesson names the construction step.
- **Render-blocking vs. parser-blocking**, the distinction that bites in production. A `<link rel="stylesheet">` in the `<head>` blocks *render* — the browser parses the HTML and builds the DOM, but won't paint until the CSS has loaded and the CSSOM is ready. A `<script>` without `defer` or `async` blocks *parsing* — the parser pauses, fetches the script, executes it, then resumes. The senior reflex in 2026: every `<script>` is `defer` or `type="module"` (which implies defer), every CSS file is either critical (inline in the head) or async-loaded (via `media` swap or framework conventions). Next.js handles this for the student; the student should know what Next.js handled.
- **The CSSOM** — the parsed CSS as a tree of style rules. Built in parallel with the DOM from `<link rel="stylesheet">` resources. Render is blocked until the CSSOM is ready because painting an element requires knowing its computed style. The bug class: a slow CSS file on a CDN that blocks first paint while the HTML is otherwise ready. The dev tool: the Network panel shows the stylesheet's "Initiator" as the document and its timing aligns with the blocking gap before First Paint.
- **The render tree** — the DOM and CSSOM combined into the tree of actually-rendered nodes. Excludes invisible nodes (`<head>`, `display: none` elements) and includes computed style on each visible node. The render tree feeds layout.
- **Layout** (also called "reflow") — the browser computes the geometry of every render-tree node. Position, size, line breaks. Triggered by initial render, by window resize, by DOM mutations, by style changes that affect layout (changing `width`, `height`, `font-size`, etc.). The senior watch-out: thrashing layout in a tight loop (reading layout-dependent properties like `offsetWidth` in between writes) is the canonical performance bug. Named here at recognition depth; full treatment is in Chapter 20.3.
- **Paint** — converts the render tree's geometry and style into pixels in layers. Hardware-accelerated for most properties on modern browsers. The bug class: paint storms triggered by `box-shadow` animations or large `filter` chains. Named for recognition.
- **Composite** — the layers are combined into the final frame. Transform and opacity changes (CSS transforms, `opacity` animations) happen at the compositor level without re-painting — this is why `transform: translateX()` is the senior reach for animation and `top`/`left` is the bug class. Named here; the full Tailwind animation story is in Chapter 4.5.5.
- **The canonical timing milestones**, named for the lesson's vocabulary and for Chapter 20.3's full treatment:
  - **First Paint (FP)** — the first time the browser paints anything other than the default background. Rarely the right metric.
  - **First Contentful Paint (FCP)** — the first time meaningful content (text, image) is painted. Tracked in production.
  - **Largest Contentful Paint (LCP)** — the time at which the largest above-the-fold content element finished painting. The Core Web Vital for perceived load speed; under 2.5 seconds is "good." Named for recognition; Chapter 20.3 owns the optimization story.
  - **Time to Interactive (TTI)** — the time the page becomes reliably responsive to user input. Tracks the JavaScript-execution and hydration leg.
  - **Interaction to Next Paint (INP)** — the Core Web Vital for runtime responsiveness, replacing FID in 2024. Named for recognition.
- **The JavaScript execution leg**, the second half of the pipeline. After (or during) HTML parsing, the browser downloads the JavaScript bundles referenced by `<script>` tags, parses them, and executes them. With `defer`/`module`, execution waits until the DOM is fully parsed. The execution mutates the DOM (the client-side React tree mounts), attaches event handlers, and registers any side effects. The 2026 SaaS reality on Next.js 16: the framework ships React 19, the server has already rendered the initial HTML, and the client bundle's job is *hydration*.
- **Server-side rendering (SSR)**, named with the load-bearing distinction. Two models the student needs to recognize:
  - **Client-side rendering (CSR)** — the server returns a near-empty HTML shell with a `<div id="root">` and a `<script>` tag pointing at the JS bundle. The browser parses the shell, downloads the bundle, executes React, and React paints the entire UI from scratch. The 2010s default. The bug class: a long white screen while the bundle downloads and executes. Named once, dismissed as the default — the course does *not* write CSR-default apps.
  - **Server-side rendering (SSR)** — the server runs React (or, in Next.js 16's App Router, React Server Components) and produces the initial HTML with the page's content baked in. The browser parses the HTML and paints content *before* any JavaScript runs. The client bundle still downloads and executes, but the user sees content during that gap. The 2026 default for any SaaS app that cares about LCP, SEO, or perceived performance. Named as the architectural choice the course's stack makes.
- **Hydration**, the lesson's payoff. The HTML the server rendered is *static* — the buttons don't fire, the inputs don't update state, the React tree isn't yet "live." Hydration is the process where the client-side React runtime walks the server-rendered HTML, matches it against the component tree it would have produced on the client, and attaches event handlers without re-rendering the DOM. The result: the user sees content immediately (from SSR), and the page becomes interactive once the bundle has hydrated. The seam where Unit 4 (React render model) and Unit 5 (Next.js App Router) will pick up.
- **Selective and streaming hydration in React 19 / Next.js 16**, named with the 2026 reality. React 19 supports *streaming SSR* (the server streams HTML in chunks as data resolves, so above-the-fold content paints before below-the-fold content is even ready) and *selective hydration* (interactive components can hydrate independently as their bundles arrive, and a user click on a not-yet-hydrated component is queued and dispatched once hydration completes). The senior reach: the student doesn't write the streaming or selective-hydration logic — the framework does. They name the model so the Chapter 5.3 (async UI primitives) lesson is concrete.
- **The hydration mismatch failure mode**, named because every student hits it once. If the HTML the server rendered doesn't byte-for-byte match what React would render on the client at hydration (a `Date.now()` call that produced a different value on the server than on the client, a random ID, a `useEffect` that mutated the DOM before hydration completed), React logs a hydration mismatch warning in development and falls back to a client re-render in production. The senior reflex: server-rendered HTML must be deterministic with respect to the request input; non-determinism belongs in `useEffect` or in `useId` (Chapter 4.8.7 owns the deterministic-ID primitive). Named here at recognition depth; Chapter 4.7 owns the full discipline.
- **The canonical timing diagram** the student leaves with, drawn as a single horizontal timeline overlaying:
  1. **Network leg** (DNS, TCP, TLS, TTFB) — captured in Lesson 3.1.1.
  2. **Initial HTML arrival** — the first byte and the streaming HTML.
  3. **First Contentful Paint** — server-rendered content is visible.
  4. **JavaScript bundle download** — happens in parallel with rendering.
  5. **JavaScript execution and hydration** — the page becomes interactive.
  6. **Time to Interactive** — the timeline closes.
  The student traces a real page's timeline on the Performance panel and identifies each milestone.
- **The watch-outs a senior names**:
  - **The "white screen" bug** is almost always a render-blocking resource (a slow CSS file, a synchronous third-party script in the `<head>`). Open the Network panel filtered by CSS/JS and look at what's blocking First Paint.
  - **Hydration mismatches in development** are loud (a console warning) but in production they degrade silently into a full client re-render. The senior reflex is to fix them in development, not ignore them.
  - **JavaScript bundle size is not the only cost** — parse and execution time on a low-end mobile device is often a bigger problem than download time. The senior knows that "make the bundle smaller" is more important than "make the bundle download faster" past a certain threshold (Chapter 20.3 owns the full performance discipline).
  - **The order of `<script>` tags in the `<head>`** still matters — `defer` scripts execute in document order after the DOM is parsed; `async` scripts execute as soon as they're loaded, in arbitrary order. The senior default for app code is `defer` or `type="module"`; `async` is for the rare third-party analytics tag where ordering doesn't matter.
  - **CSS in the body, JS in the head with defer** is the 2026 framework default, set by Next.js. The student doesn't hand-tune `<head>` ordering for app code; they recognize what the framework did.

What this lesson does not cover:

- The full DOM API surface — `querySelector`, traversal, mutation methods (Chapter 3.5).
- The event model, bubble/capture, delegation (Chapter 3.5.3).
- The React render model — what re-renders, reconciliation, keys, when components remount (Chapter 4.7).
- React Server Components and the server/client boundary (Chapter 5.2).
- Streaming UI primitives, Suspense, `loading.tsx` (Chapter 5.3).
- Core Web Vitals optimization, bundle splitting, image optimization (Chapter 20.3).
- The Tailwind animation system and the compositor-friendly properties (Chapter 4.5.5).
- The `useId` hook and deterministic server/client IDs (Chapter 4.8.7).
- Manual hydration tuning, partial pre-rendering modes — out of scope for this lesson; the framework chooses.

Pedagogical approach:

Concept archetype with a strong visual anchor. The lesson's deliverable is a mental model of the pipeline that the student can draw on a whiteboard. Open with the senior question — "the first byte has arrived; walk me to the pixels" — and a `Figure` with an animated or step-through SVG that walks the HTML bytes through: parse to DOM, parse CSS to CSSOM, build render tree, layout, paint, composite. The student watches a small HTML fragment (a heading, a paragraph, a button) move through the pipeline.

A second `Figure` overlays the JavaScript execution and hydration leg on the same timeline. Two horizontal tracks: the HTML-to-paint track on top, the JS-to-hydration track below, joined at the "Time to Interactive" milestone. The student sees that paint happens *before* hydration in the SSR model — the lesson's load-bearing point.

A `TabbedContent` block contrasts CSR vs. SSR vs. streaming SSR with a tiny timeline per tab. Each tab has the byte sequence (what's in the HTML when it arrives), the user-visible timeline (when content first paints, when it becomes interactive), and the trigger for each model. Tab 3 is the 2026 default for the course; tabs 1 and 2 are named for the contrast.

A setup/wiring walkthrough has the student open the Performance panel in DevTools on a real Next.js page and trace the milestones: First Paint, First Contentful Paint, Largest Contentful Paint, the JavaScript execution flame chart, the moment hydration completes. The student annotates the timeline with the milestones from the lesson. The reading habit transfers from the Network panel (3.1.1) to the Performance panel.

A small `ScriptCoding` block in the Console has the student call `performance.getEntriesByType('paint')` and `performance.getEntriesByType('largest-contentful-paint')` and read the timestamps. The programmatic surface for the visual milestones is concrete.

An interactive widget (a small toggle-driven simulator) shows the same page rendered three ways: as CSR (white screen for N ms, then everything appears), as SSR (content paints immediately, hydration completes later, click on a button before hydration is queued), and as streaming SSR (top of page paints, bottom streams in, hydration is selective). The student toggles network speed and watches the user-visible timeline change. The model is tangible.

A `CodeReview` exercise on a small page snippet with three bugs: a `<script src="...">` in the `<head>` without `defer` (parser-blocking), a server-rendered component that uses `Date.now()` in its initial render (hydration mismatch), and an `<img>` without `width`/`height` attributes (layout shift, CLS hit). The student leaves a comment per bug with the senior fix.

A `Matching` exercise pairs each timing milestone (FCP, LCP, TTI, INP) with what it measures and what user experience question it answers. The vocabulary is locked in.

Close with a small `MultipleChoice` exercise: given a hydration mismatch warning in the console, pick the most likely root cause from four options (non-deterministic rendering on the server — right; CSS in the wrong order — wrong; missing `defer` on a script — wrong; bundle too large — wrong). The discrimination is the deliverable.

Estimated student time: 50 to 60 minutes. Load-bearing for Unit 4 and Unit 5.

---

## Lesson 3.1.3 — HTTPS on localhost with mkcert

Install the TLS 1.3 handshake and certificate-chain mental model at debug depth, then wire a local CA with `mkcert` to unblock the secure-context-required APIs (cookie `Secure`, Clipboard, WebCrypto) that silently fail on `http://localhost`.

Topics to cover:

- The senior question: the student has shipped to `localhost:3000` on plain HTTP since Chapter 1.4. Production runs on HTTPS. What changes between the two, what part of the change is invisible (the framework handles it), and what part of the change *will* bite in development — when the cookie won't set, when the Clipboard API refuses, when the local dev box can't `fetch` from a sibling HTTPS service. The lesson installs the model at the depth that resolves these dev-time leaks, and trusts Unit 21 (deployment) for the production-cert lifecycle and Chapter 17.2 for the security baseline.
- **What HTTPS is, in one paragraph.** HTTP carried over a TLS-encrypted transport. The browser and server perform a handshake that authenticates the server (via a certificate the server presents) and establishes shared encryption keys. From that point, every byte on the wire is encrypted and integrity-protected. TLS 1.3 (RFC 8446, 2018) is the 2026 deployed default; TLS 1.2 is still supported for legacy clients but rarely seen on a 2026 SaaS stack.
- **The TLS 1.3 handshake at the depth that matters**, named as four messages:
  1. **ClientHello** — the browser sends its supported cipher suites, the SNI hostname (`Server Name Indication`, in plain text — names which virtual host the server should authenticate as), supported key-exchange groups, and a randomly generated key share.
  2. **ServerHello + Certificate + CertificateVerify + Finished** — the server picks the cipher suite, sends its certificate chain (leaf + intermediates), proves it owns the private key, and includes the keys derived from the exchange. Everything after the ServerHello is encrypted.
  3. **Client Finished** — the client validates the certificate chain against its trust store, computes the shared keys, sends a Finished message.
  4. **Application data** — the encrypted HTTP request follows. One round-trip total (1-RTT). With session resumption (the client has talked to the server before and cached the resumption ticket), the handshake collapses to 0-RTT — the client sends the encrypted HTTP request *with* the ClientHello.
  The student doesn't write a TLS implementation; they know which message carries the certificate (the server's response), what SNI is (the routing primitive when multiple HTTPS sites share an IP), and where the 0-RTT optimization comes from.
- **The certificate chain**, named concretely. A TLS certificate is an X.509 document signed by a Certificate Authority (CA). The chain has three tiers:
  - **Leaf certificate** — issued for the specific domain (`example.com` or `*.example.com`), valid for 47 days starting March 2026 (the staged shortening from 397 → 199 → 99 → 47 days; the 2026 senior plans for automated renewal). Signed by the intermediate.
  - **Intermediate certificate(s)** — issued by the CA's root, with a longer validity period (typically 5-10 years). The server presents the leaf *and* the intermediates in its response; the client must be able to walk from the leaf up to a root it trusts.
  - **Root certificate** — the CA's self-signed root, pre-installed in the OS or browser trust store. The client does not need it from the server; the trust store has it already.
  The senior reach: the server must serve the full chain (leaf + intermediates) or modern browsers will reject the connection with a chain-validation error. The bug class: the server is misconfigured to serve only the leaf, and Chrome/Firefox refuse but Safari accepts (Safari fetches intermediates from the CA's AIA URL automatically; Chrome doesn't by default). Named for recognition.
- **Let's Encrypt as the 2026 default CA**, named in one paragraph. Free, automated via the ACME protocol, used by Vercel/Cloudflare/every modern host. The student doesn't write the ACME client; the host does. The two artifacts the student should recognize: the **leaf certificate** (rotated automatically every ~30-60 days by the host), and the **HSTS header** (Chapter 17.2 owns it — the header that tells browsers "never connect to this domain over plain HTTP again"). DigiCert and the paid-CA tier are named once for recognition; the 2026 default for SaaS is Let's Encrypt or the CA the platform bundles.
- **The 47-day validity rollout**, named because it's a 2026 reality. The CA/Browser Forum agreed in 2025 to shorten public TLS certificate validity from 397 days (the cap since 2020) to 47 days in stages: 199 days starting March 2026, 99 days starting early 2027, 47 days by early 2029. The senior consequence: any cert-rotation flow that's manual *will* break; automation (ACME, cert-manager on Kubernetes, the host's built-in renewer) is non-negotiable. The student doesn't run an ACME client by hand; they recognize the trend so they don't ship code that assumes a one-year cert.
- **HTTPS in development — the localhost story**:
  - **`http://localhost`** works for most things, and the browser treats it as a "secure context" anyway (the spec calls out `localhost` as a trusted exception — a 2017 change so dev loops don't need TLS for everything). The student writes `http://localhost:3000` for the first ~21 chapters of the course without trouble.
  - **The exceptions** — the APIs that *require* HTTPS even on `localhost`, named explicitly so the student isn't stuck:
    - The cookie `Secure` flag won't set on `http://` even on `localhost` in some browser configurations (Chapter 3.4 owns the cookie surface; the dev workaround is to either not set `Secure` in dev or use `https://localhost`).
    - The Clipboard API (`navigator.clipboard.writeText`) — Chrome and Firefox require a secure context; localhost is excepted but third-party iframes embedded on localhost aren't. Chapter 3.7.3 owns this.
    - WebCrypto's `subtle` interface — Chapter 3.7.2 lands here. Requires a secure context.
    - The `getUserMedia` (camera/microphone) and `geolocation` APIs — out of scope for the course but worth naming.
    - Service workers — out of scope.
  - **The dev-time bite**: the student building Chapter 9 (Better Auth with cookies) hits the cookie-Secure-on-http issue. The student building Chapter 13 (R2 file upload) hits the secure-context-required pattern. The lesson installs `mkcert` now so the bridge is in place when the bite happens.
- **`mkcert` as the dev-time certificate authority**:
  - **What it is.** A small CLI that creates a local Certificate Authority on the dev machine, installs the CA's root certificate into the OS and browser trust stores, and issues per-domain certificates signed by that CA. The browser trusts the CA (because the trust store now contains its root), so certificates `mkcert` issues are accepted with no warning. *Production cannot use mkcert* — only the dev machine trusts the CA.
  - **The setup walk**, three commands. `brew install mkcert nss` (macOS) or the equivalent. `mkcert -install` (installs the CA into the OS and browser trust stores once). `mkcert localhost 127.0.0.1 ::1` (issues `localhost.pem` and `localhost-key.pem` in the current directory). The student then wires Next.js dev to serve over HTTPS — Next.js 16's `pnpm dev --experimental-https` flag picks up `mkcert`-generated files automatically, or the student passes `--key` and `--cert` explicitly.
  - **The verification step.** Open `https://localhost:3000` in the browser; the lock icon shows up green; the cert details show "issued by mkcert development CA." The browser doesn't warn. The cookie `Secure` flag now fires. Every secure-context-required API now works on dev.
  - **The watch-out.** The `rootCA-key.pem` that `mkcert` generates has full power to mint trusted certificates for any domain on the dev machine. It's machine-local by design — never commit it, never share it, never copy it to another machine. The senior reflex: `mkcert` is per-dev-box; CI doesn't need it; production never sees it.
- **Reading certificates with `openssl s_client`**, named as the dev tool for the chain-debugging bug class. `openssl s_client -connect example.com:443 -servername example.com` opens a TLS connection and prints the full chain the server presented. The senior reach when the browser shows a certificate error: run `s_client` first, read the chain, identify the missing intermediate or the expired leaf. Named once as a recognition tool; the student doesn't need to read the full output, they need to know the tool exists.
- **The watch-outs a senior names**:
  - **Self-signed certificates** without a trusted CA produce a browser warning every time. The 2026 reach for dev HTTPS is `mkcert` (CA-backed, trust-store-installed, no warning), not raw self-signed certs. Self-signed is a 2010-era pattern; named once and dismissed.
  - **The browser's "Your connection is not private" warning** has four common causes: expired certificate, wrong hostname (the cert is for `example.com` but you're hitting `www.example.com`), untrusted CA (a corporate-issued cert on a personal laptop without the corporate CA in the trust store), missing intermediate (the server didn't serve the full chain). The senior reflex: read the warning's detail, not the headline.
  - **HSTS preload** (Chapter 17.2 owns it) means once a domain is on the preload list, every browser globally will refuse to connect over plain HTTP — the dev box that wants to test a fix on `http://yourapp.com` can't, because the browser refuses before the request leaves. The senior reach: development uses a non-preloaded domain (`localhost`, `*.lvh.me`, a dev subdomain that isn't preloaded).
  - **The certificate transparency log** (CT) is a public ledger of every certificate ever issued by a public CA. Visiting a domain doesn't reveal that you visited it, but the existence of a certificate for `staging.example.com` is public the moment it's issued. The senior watch-out for sensitive subdomain names — staging URLs, beta features — the names leak through CT logs. Named for recognition; the senior reach is to not put sensitive information in subdomain names.
  - **The "lock icon" doesn't mean the site is safe.** A phishing site on a freshly-minted Let's Encrypt certificate has the same green lock as a bank. The lock proves the connection is encrypted and the server is the one named in the cert — it doesn't prove the site is honest. Named once for the security-baseline framing (Chapter 17.2).
  - **Mixed content** — an HTTPS page that loads an HTTP resource (an `<img src="http://...">`) is blocked by modern browsers. The senior knows the rule: once the page is HTTPS, every subresource must be HTTPS. The Tailwind/Next.js stack handles this automatically; the bite is in legacy CDN URLs in third-party widgets.

What this lesson does not cover:

- The full TLS 1.3 protocol — record format, alerts, the full cipher suite negotiation, post-quantum cipher migration (out of scope; named once for the 2026 frame).
- ACME, Let's Encrypt's API, and automated certificate issuance — the host handles it (Chapter 21.3 names it).
- HSTS, CSP, CORS, and the full security-header surface (Chapter 17.2).
- The Same-Origin Policy and CORS preflights (Chapter 3.3).
- Cookies with `Secure`/`HttpOnly`/`SameSite` (Chapter 3.4).
- Certificate pinning, public key pinning (HPKP) — deprecated and out of scope.
- mTLS (mutual TLS) — out of scope for the course.
- The full certificate-transparency ecosystem and CT-log monitoring tools — out of scope.
- WebPKI policy, root program differences across Chrome/Mozilla/Microsoft/Apple — out of scope.

Pedagogical approach:

Setup/wiring archetype with a Concept introduction. The lesson teaches a mental model (the cert chain, the handshake at the depth that matters) and walks the student through installing `mkcert` on their dev box. The setup-walk is the deliverable; the mental model is the trigger.

Open with the senior question — "you've been on `http://localhost` for 21 chapters; what breaks when you try to use the Clipboard API?" — and a short demonstration where the student opens DevTools, runs `navigator.clipboard.writeText('hi')` on `http://localhost`, watches it fail (or notes that it works only because Chrome's localhost exception lets it through), and runs the same call on `https://localhost`, observes it works cleanly. The lesson's relevance lands in 30 seconds.

A `Figure` with a Mermaid sequence diagram walks the four messages of the TLS 1.3 handshake (ClientHello, ServerHello + Certificate, Client Finished, Application data) with the round-trip count called out. The student sees that the handshake is one RTT for a fresh connection, zero RTTs for a resumed session.

A second `Figure` with a hand-authored SVG renders the certificate-chain anatomy: a leaf for `example.com`, signed by an intermediate, signed by a root. The trust store on the right with the root pre-installed. The arrow showing the chain validation walking up. Naming each tier on the diagram.

A setup/wiring walkthrough — the lesson's primary deliverable — has the student install `mkcert`, run `mkcert -install`, generate `localhost`-scoped certificates, and configure Next.js dev to serve over HTTPS. The walkthrough uses a `Steps` component with one command per step and a verification at each step (the trust-store install puts a root in the OS keychain; the verification is "open Keychain Access and see the mkcert CA"). The student finishes with a working `https://localhost:3000` and a green lock icon.

A second, shorter walkthrough has the student run `openssl s_client -connect google.com:443 -servername google.com` and inspect the certificate chain in the output. The student doesn't read the full output; they identify the leaf, the intermediates, and the chain depth. The recognition tool is in the student's toolkit.

A `TabbedContent` block organizes the secure-context-required API matrix: tab 1 is "the dev box runs on `https://localhost`, mkcert-issued" (everything works), tab 2 is "the dev box runs on `http://localhost`" (clipboard works because of the localhost exception; cookies with `Secure` may not fire; some third-party libraries silently fail). Each tab has the recognition site and the senior fix. The student leaves with the decision tree.

A `CodeReview` exercise on a small Next.js config file with three issues: a manually pinned older TLS version (wrong — let the platform pick), a self-signed cert path in the `https` config (wrong — use `mkcert`), and a `Strict-Transport-Security` header set to a 1-year max-age without preload (named here, the depth lives in Chapter 17.2). The student leaves a comment per issue.

A `Matching` exercise pairs each browser certificate warning ("NET::ERR_CERT_AUTHORITY_INVALID", "NET::ERR_CERT_DATE_INVALID", "NET::ERR_CERT_COMMON_NAME_INVALID", "NET::ERR_CERT_REVOKED") with the root cause (untrusted CA, expired cert, hostname mismatch, certificate revoked). The error-message vocabulary is locked in.

Close with a small `MultipleChoice` exercise: given a scenario ("the cookie `Secure` flag is set on the auth cookie and the login isn't sticking in dev"), pick the most likely root cause and fix (the dev box is on `http://localhost`, install `mkcert`, switch to `https://localhost`). The decision is concrete.

Estimated student time: 40 to 50 minutes. Includes the `mkcert` install walkthrough (about 10 minutes of terminal work).

---

## Lesson 3.1.4 — Quizz

Top ten topics to quiz:

1. The four-step network leg from URL to first byte — DNS resolution, transport connection (TCP or QUIC), TLS handshake, HTTP request — and which DevTools Network panel timing row maps to each step.
2. The 2026 protocol stack — HTTP/3 over QUIC on modern CDN edges, HTTP/2 over TLS 1.3 as the universal fallback, HTTP/1.1 as legacy; multiplexing eliminates the HTTP/1.1 "bundle assets" optimization.
3. TTFB measures everything from the URL commit to the first byte arriving — a slow TTFB usually points to server work (slow DB query, missing cache, blocking external call), not the network.
4. The browser-side pipeline — HTML parser builds the DOM, CSS parser builds the CSSOM, render tree combines them, layout computes geometry, paint produces pixels, compositor combines layers.
5. Render-blocking vs. parser-blocking — `<link rel="stylesheet">` blocks render until CSSOM is ready; `<script>` without `defer` blocks parsing; the 2026 default is `defer` or `type="module"` on every script.
6. SSR vs. CSR vs. streaming SSR — SSR paints content before JavaScript executes; CSR shows a white screen until the bundle loads; streaming SSR paints above-the-fold content while below-the-fold content is still resolving on the server. Next.js 16 + React 19 is streaming SSR by default.
7. Hydration — the client-side React runtime attaches event handlers to server-rendered HTML without re-rendering the DOM; the page becomes interactive at the end of hydration. Hydration mismatches happen when server-rendered HTML doesn't match what the client would render and force a full re-render in production.
8. The TLS 1.3 handshake — one round-trip for a fresh connection (ClientHello → ServerHello + Certificate → Client Finished → Application data), zero round-trips with session resumption.
9. The certificate chain — leaf signed by intermediate signed by root; the server must serve leaf + intermediates; the root is in the client's trust store. Let's Encrypt is the 2026 default public CA. Public TLS certificate validity is shortening to 47 days by 2029 — automation is required.
10. `mkcert` as the dev-time bridge — creates a local CA, installs its root into the OS and browser trust stores, issues `localhost`-scoped certificates the browser trusts. Required to unblock the cookie `Secure` flag, the Clipboard API, WebCrypto's `subtle` interface, and any other secure-context-required API on a dev box that needs to mirror production behavior.

---

## Total chapter time

Roughly 140 to 170 minutes across the three teaching lessons plus the quiz. The chapter fits across two evenings — the two lifecycle lessons together in one sitting (about 100 minutes), HTTPS plus the `mkcert` install in a second short sitting (about 50 minutes), the quiz at the end. The student finishes the chapter able to walk a senior through the URL-to-pixels lifecycle on a whiteboard, read the DevTools Network and Performance panels with vocabulary that names what each row measures, install `mkcert` and run their dev loop on `https://localhost`, and recognize the cert-chain failure modes by their browser warning text. The substrate Unit 4 (the React render model and SSR/hydration) and Unit 5 (the App Router) will land on is in place. Chapter 3.2 opens on the other side with HTTP method semantics, status codes, and headers — the request/response surface this chapter named but didn't open.

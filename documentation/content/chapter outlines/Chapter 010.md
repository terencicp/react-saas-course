# Chapter 010 — How a request becomes a page

## Chapter framing

Unit 1 ended on the JavaScript value model — `JSON`, classes, `Temporal`, errors. Unit 2 zooms out from values to the *substrate* the values travel through: the network, the browser, the platform APIs the SaaS UI reaches for. This chapter is the unit's opening — a single end-to-end trace from the moment the user commits a URL to the moment the page is interactive — so every later chapter in Unit 2 (HTTP contract, origins and CORS, cookies, DOM and events, fetch, Web Crypto, Clipboard, storage) lands on a shared mental map. The student should leave able to point at any DevTools waterfall row, name what's happening on the wire and in the browser, and know which Unit 2 chapter owns the deeper treatment.

Two threads run through every lesson. First, **2026 protocols are the default, not an upgrade story**. HTTP/3 over QUIC, TLS 1.3, DoH, IPv6 with Happy Eyeballs — these are what production traffic actually rides on, named plainly with no detour through HTTP/1.1 or TLS 1.2. The course states the current state, names the conditional fallback in one line, and moves on. Second, **the SSR-plus-hydration pipeline is foreshadowed but not taught here**. Unit 3 and Unit 4 own React and the App Router; this chapter lays the rendering-pipeline map (HTML to DOM to render tree to paint to composite) so when Unit 4 talks about Server Components streaming and selective hydration, the student already knows which stage of the pipeline each maneuver is touching. The chapter ships no application code beyond the `mkcert` wiring in lesson 4 of chapter 010.

The student finishes the chapter with: a mental model of the four network legs (DNS, connection, TLS, HTTP) and the six browser-side stages (parse, CSSOM, render tree, layout, paint, composite); the ability to read a DevTools waterfall row by row and identify the protocol (`h3`, `h2`, `http/1.1`) and the timing breakdown (queued, DNS, initial connection, SSL, request sent, waiting/TTFB, content download); a working local HTTPS setup with `mkcert`-issued certs on `https://localhost`, unblocking the secure-context APIs (`crypto.subtle`, `navigator.clipboard`, cookies with `Secure`) that later chapters depend on; and a working preview of where SSR and hydration sit in the pipeline so Units 3 and 4 land on a known map.

---

## Lesson 1 — URL bar to first byte

Walk the four-step network leg from a URL commit to the first byte of HTML — DNS resolution, transport connection (TCP or QUIC), the TLS handshake folded into QUIC, and the HTTP request — and read each step on the DevTools Network waterfall against the 2026 HTTP/3-over-QUIC protocol stack.

Topics to cover:

- The senior framing. A page load is a pipeline; latency is the sum of its stages. The student who can point at a slow waterfall row and name the stage owns the debugging conversation. The lesson is a map: name each stage, name what it costs, name the 2026 default and the one conditional fallback.
- Stage 1 — DNS resolution. The browser resolves the hostname through the OS resolver, which in 2026 is increasingly DoH (DNS over HTTPS) by default in Chrome, Firefox, Edge, and Safari, falling back to plain DNS only when the configured resolver doesn't support it. One line on DoT and DoQ as the conditional alternates (DoT for OS-level encrypted DNS, DoQ for the QUIC-native variant). The Happy Eyeballs v2 algorithm (RFC 8305) races A and AAAA records and prefers IPv6 when both resolve — named once so the student doesn't think a single resolution is happening. Caches stack: browser, OS, recursive resolver, authoritative — and a cold lookup is the typical 20–80ms tax, a warm one is free. The senior watch-out: a cold DNS leg is invisible in the typical "fast localhost" loop; it shows up in production.
- Stage 2 — Transport connection. The 2026 default is **HTTP/3 over QUIC** on UDP/443. One paragraph names what QUIC is: a multiplexed, encrypted, congestion-controlled transport that folds the TLS handshake into the connection setup, eliminating head-of-line blocking that bit HTTP/2 over TCP. The conditional fallback is HTTP/2 over TCP plus TLS 1.3 (still ubiquitous; QUIC is blocked or degraded on some corporate networks and the client falls back). HTTP/1.1 is named in one line as the legacy floor — origin servers that haven't moved still serve it; clients still handshake it. No deep dive into HTTP/1.1 keep-alive, pipelining, or HTTP/2 frames; the course operates on QUIC.
- Stage 3 — TLS 1.3 inside QUIC. TLS 1.3 is the only flavor the 2026 stack ships. In QUIC, the TLS handshake is interleaved with the transport handshake — a fresh connection completes in 1-RTT, and a resumed connection (the client has a session ticket from a previous visit to the same origin) completes in **0-RTT**: the client sends early data inside the first flight, the server processes it, the user-visible latency is roughly the time of one network round trip. One line on the 0-RTT replay-safety constraint — only idempotent GETs are safe in early data, because an attacker could replay the packet; non-idempotent requests wait for the handshake. Forward-secrecy is the property TLS 1.3 always provides for normal traffic; 0-RTT data does *not* have forward secrecy, named in one line. The deeper TLS walkthrough lives in lesson 4 of chapter 010.
- Stage 4 — The HTTP request and the first byte. Once the secure transport is up, the client sends an HTTP/3 request: a method line, a path, a host pseudo-header, the request headers, and (for non-GET) a body. The server responds; the first byte arrives. This is **TTFB** (Time to First Byte) — the metric that fires Unit 19's performance chapter. Named here as a label, deferred there for tuning. The senior watch-out: TTFB measured from a warm connection is the server-and-network number; TTFB on a cold connection includes DNS, the QUIC handshake, and the request — three separate things bundled into one stopwatch.
- Reading the DevTools waterfall against the stages. Open the Network panel, enable the **Protocol** column (right-click the column header), and watch each request show `h3` (QUIC), `h2`, or `http/1.1`. Hover any row, the **Timing** breakdown surfaces:
  - **Queued / Stalled** — the request waiting on the browser's connection pool or priority queue.
  - **DNS Lookup** — stage 1. Often `0` on warm caches.
  - **Initial connection** — TCP for h2, or `Initial connection` collapsing the QUIC handshake for h3.
  - **SSL** — the TLS 1.3 segment of the handshake. On h3 this is folded into the initial connection.
  - **Request sent** — bytes uploaded.
  - **Waiting (TTFB)** — server thinking time plus network round trip.
  - **Content Download** — body bytes arriving.
  The student reads each row at least once on a real page so the labels lock to the stages.
- One concrete trace. Load the course site (or any well-configured site, e.g. `cloudflare.com`) with DevTools open, the cache disabled, and the Protocol column showing. The student sees `h3` on the document request, watches a fresh connection's Timing breakdown, then reloads and watches the resumed-connection numbers collapse to near-zero on DNS and Initial connection. The cause-and-effect of 0-RTT resumption becomes legible.
- The forward links named once each. The HTTP request/response contract (methods, status, headers) is Chapter 011. Origins and CORS are Chapter 012. Cookies and `Secure`/`SameSite` are Chapter 013. The lesson is a map; the deeper terrain has its owners.

What this lesson does not cover:

- The HTTP request/response semantics themselves (methods, status codes, headers) — Chapter 011 owns the full contract.
- The TLS 1.3 handshake at debug depth (cipher suites, certificate chains, ALPN negotiation) — lesson 4 of chapter 010 owns that, framed against `mkcert`.
- The browser-side rendering pipeline that fires *after* the first byte — lesson 2 of chapter 010 owns parse, CSSOM, render tree, layout, paint, composite.
- HTTP/1.1 and HTTP/2 wire formats in any depth. Named as the conditional fallback in one line each.
- TCP congestion control, BBR vs. CUBIC, or socket-level network tuning. Out of scope; the application engineer does not tune these.
- The Performance panel's frame-level traces — Unit 19 owns that surface.
- Tuning TTFB. Named as the metric; tuned in Unit 19.

Pedagogical approach:

Concept archetype with a heavy diagram lean. The lesson's center of gravity is a single annotated **sequence diagram** showing the four stages with one labeled lane per stage, the round trips marked, and the resumed-connection path overlaid. Mermaid `sequenceDiagram` is the right tool because the relationships are temporal and connection-based, not spatial. Open with the senior framing in one paragraph — a slow page load is a stage problem, and the engineer who can point at the stage wins the conversation — then walk the four stages in order, each with one short prose section. For QUIC vs. TCP+TLS, use a small side-by-side `CodeVariants`-style block showing the round-trip count: fresh QUIC is 1-RTT, resumed QUIC is 0-RTT, TCP+TLS 1.3 is 2-RTT to first byte. The DevTools waterfall section is a labeled screenshot (or a hand-authored SVG mock of the Timing panel) with arrows from each timing label to the stage it measures. Close with one `Matching` exercise pairing six waterfall rows (some `h3`, some `h2`, varying timing breakdowns) to the dominant cost (DNS-bound, connection-bound, server-bound, content-bound, queue-bound, cached). No sandbox: the student's "lab" is opening DevTools on a real site, which the lesson explicitly directs them to do mid-prose.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2 — First byte to pixels

Trace the browser-side pipeline from HTML bytes to an interactive page — parser to DOM, CSSOM, render tree, layout, paint, composite — and overlay the SSR-plus-hydration model that Unit 3 and Unit 4 will land on.

Topics to cover:

- The senior framing carried from lesson 1 of chapter 010. The first byte arrives; the page is not yet visible, let alone interactive. Everything between byte and pixel is a pipeline the browser runs, and most of the time the student will spend in Units 3 and 4 is on stages of that pipeline. The lesson is the map; later units own the tuning.
- Stage 1 — HTML parsing builds the DOM. The HTML parser is a streaming state machine — it can start emitting nodes before the body is fully downloaded. Nodes become typed objects (`HTMLElement`, `HTMLDivElement`, etc.); the DOM tree is the result. One paragraph on **the script parser-blocking rule**: a `<script>` without `async` or `defer` blocks the parser when encountered, because the script could call `document.write` and rewrite the parser's input. `defer` queues the script for after parsing; `async` runs it whenever it lands. Named here because the rule is load-bearing in Unit 3's HTML semantics chapter and because it explains why scripts live at the bottom of `<body>` or carry `defer`.
- Stage 2 — CSS parsing builds the CSSOM. CSS is **render-blocking** by default: the browser cannot construct the render tree without the CSSOM, so the first paint waits for the stylesheet. One line on `media`-scoped stylesheets being non-blocking for off-media (e.g. `media="print"`). Named so the student understands why the `<link rel="stylesheet">` in `<head>` is the load-bearing tag.
- Stage 3 — DOM plus CSSOM yields the render tree. The render tree contains every node that will paint — nodes with `display: none` are excluded, pseudo-elements are included. The render tree is the input to layout.
- Stage 4 — Layout (sometimes called reflow). The browser computes geometry for every render-tree node — position, width, height, line breaks. Layout is the expensive stage; mutations that invalidate layout (changing widths, inserting nodes, reading layout values like `offsetHeight` in a tight loop) cascade into recomputation. The senior watch-out named here, deferred for the React render model in Unit 3: layout thrashing — read-then-write-then-read on layout properties forces synchronous reflows.
- Stage 5 — Paint. The browser fills pixels into layers — text, colors, borders, shadows, images. Paint is per-layer; the browser tries to repaint as little as possible.
- Stage 6 — Composite. The compositor thread takes painted layers and combines them into the final frame on the GPU. **Compositor-only properties** — `transform` and `opacity` — change layers without re-running layout or paint, which is why CSS animations on those properties hit 60fps and animations on `width` or `top` don't. Named here, deferred for the motion chapter in Unit 3.
- The Critical Rendering Path summarized. The render-blocking dependency chain is: HTML parsed → DOM tree → CSSOM (built in parallel from `<link>` and inline `<style>`) → render tree → layout → first paint. The metric the chain produces is **First Contentful Paint (FCP)**. Named as a label; tuned in Unit 19.
- The SSR-plus-hydration overlay. The 2026 default is server-rendered HTML streamed from a Next.js Server Component tree (with React 19 Server Components stable in Next.js 16), arriving as a populated DOM that paints **before** any JavaScript executes. Hydration is the separate, later step: the React runtime attaches event listeners and component state to the already-painted DOM. The two-line senior framing:
  - Server Components produce HTML on the server; that HTML paints fast and is SEO-legible.
  - Client Components are hydrated — the JavaScript bundle for them downloads, executes, and attaches to the DOM nodes the server emitted. The page is *visible* before it's *interactive*; the gap is hydration time.
  React 19's **selective hydration** lets the renderer hydrate interactive components first and defer the rest; Next.js 16 streams HTML for components inside `<Suspense>` so the user sees skeletons fill in. The student does not need the mechanics in this lesson — they need the map: where do SSR, the first paint, and hydration sit in the pipeline above. SSR plugs in at the *server side of the request* (the HTML the browser receives is already populated); hydration plugs in *after* the first paint, between the render tree and full interactivity. The bug class the framing prevents: thinking the page is "broken" because the user can see it but a click doesn't fire — that's the hydration gap, not a bug.
- Hydration mismatches named once. If the HTML the server rendered doesn't match what React would render on the client (e.g. `Date.now()` called in render, a conditional based on `typeof window`), React logs a hydration mismatch. Deferred for full treatment in Unit 4.
- The DevTools Performance panel as the trace surface, named in one line. The panel visualizes parse, layout, paint, composite events on a frame timeline. The student does not open it in this lesson — Unit 19 owns the performance tour — but they should know which DevTools panel maps to which pipeline stage.
- Forward links. Unit 3 owns JSX, the React render model, components, the cascade and Tailwind. Unit 4 owns the App Router, Server vs. Client Components, streaming, and `loading.tsx`. Unit 19 owns Core Web Vitals (LCP, FCP, INP, CLS), the Performance panel, and the bundle analyzer.

What this lesson does not cover:

- React itself — render phases, hooks, reconciliation. Unit 3 owns the render model.
- The Server Component / Client Component boundary mechanics — Unit chapter 030 owns them. Named here as a placement on the pipeline map, not as a programming model.
- Suspense boundaries, streaming, and `loading.tsx` mechanics — chapter 031.
- Core Web Vitals and tuning (LCP, INP, CLS) — Unit 19.
- The HTML element semantics (`<header>`, `<main>`, the heading hierarchy) — chapter 017.
- Tailwind and the cascade — chapter 019.
- CSS containment, content-visibility, layer isolation. Conditional power tools; if they earn a treatment, it's in Unit 19.
- Image decoding, the `decoding` attribute, `next/image`. Unit 4 and Unit 19.

Pedagogical approach:

Concept archetype, diagram-led. The center of gravity is a hand-authored SVG (or a Mermaid flowchart with annotation) showing the pipeline left-to-right: bytes → parser → DOM, CSS → CSSOM, both merging into render tree → layout → paint → composite, with SSR plugging in at the *bytes* node (the HTML is already populated) and hydration plugging in as a separate downstream lane attaching to the painted DOM. Layout, paint, and composite each get one short prose paragraph with one inline `Term` callout for the load-bearing word. For compositor-only properties, a small interactive widget — two CSS animations side by side, one animating `transform` (cheap) and one animating `width` (expensive), with the browser's paint-flashing toggle conceptually overlaid (or just labeled "this triggers layout") — drives the point home; if the widget budget is tight, fall back to a side-by-side `CodeVariants` block with two `<div>` animations. The SSR-and-hydration overlay is a second smaller diagram layered on the first, with one paragraph explaining "the page is visible before it is interactive." Close with one `Sequence` exercise: the student orders six events ("HTML bytes arrive," "CSSOM built," "first paint," "hydration JS downloads," "hydration runs," "click handler fires") on a timeline. That ordering is the lesson's confirmation that the student internalized the pipeline. No sandbox; the lesson is structural.

Estimated student time: 35 to 45 minutes.

---

## Lesson 3 — DevTools: the four panels that earn their keep

Teaches the senior workflows in Elements (live DOM and cascade), Network (open before the action, throttle, copy-as-fetch), Console (REPL, `$0`, `console.table`), and Application (cookies, storage, service workers), with React DevTools installed here for its first call in the React unit.

Topics to cover:

- The framing. DevTools is the second half of the feedback loop the chapter is wiring against the network and rendering pipelines. Lesson 1 of chapter 010 named the waterfall as the place to read the four network stages; this lesson is the panel-by-panel tour the student needs to read every later browser surface in Unit 2 and Unit 3. Four panels carry the weight in SaaS work — Elements, Network, Console, Application — and a fifth (Performance / Lighthouse) gets a deferred mention because it doesn't earn its keep until Unit 18 and 19. Sources, Memory, Recorder, Security: one line each, "reach for it when," not taught.
- The browser commitment. Chrome (or any Chromium — Edge, Arc, Brave) DevTools as the primary surface because Chromium ships the deepest DevTools and the React DevTools extension lands there cleanly. Firefox DevTools named once as the cross-browser sanity check, Safari DevTools in one line for the iOS-specific work in Unit 20. The course teaches against Chromium DevTools by default.
- React DevTools as the one extension worth installing alongside. Components panel for inspecting the React tree (named here, used the moment the course writes its first component in Unit 3), Profiler tab for render measurement (used in chapter 023 and revisited in Unit 19). Installed here so it never has to be again.
- **Elements panel.** What it is — the live DOM, not the source HTML, with the styles cascade visible per-element. The senior workflow:
  - Inspect to find the element under the cursor.
  - Read the rules in the right pane in cascade order, with overridden rules struck through. This is *how* the cascade visualizes — the topic itself is taught in chapter 019, but the panel is the place a senior reads the cascade in practice.
  - Edit styles live (no reload) to test a fix before writing it in the source. The "if it works in DevTools, it'll work in the code" rule.
  - Toggle pseudo-states (`:hover`, `:focus-visible`, `:active`) explicitly because hovering removes the cursor and the state with it.
  - Computed tab for the resolved final value when the cascade is the question.
- **Network panel.** What it is — every request the page makes, with timing, headers, payload, and response. The senior workflow:
  - Open the panel *before* the action that triggers the request, then trigger the action. "Open after" misses the request entirely.
  - Preserve log on navigation so a redirect doesn't drop the request that caused it.
  - Disable cache while DevTools is open (a checkbox) so the request the user is actually testing fires.
  - Filter by request type (Fetch/XHR, Doc, JS, CSS, Img) when the noise drowns the signal.
  - Read the right pane in this order: Headers (auth and content type), Payload (what the client sent), Response (what the server sent back), Timing (where the latency went).
  - Throttle network speed to "Fast 3G" or "Slow 3G" when testing loading states — the senior catch for "this looks fine on localhost."
  - Right-click → Copy as fetch / cURL — the move that turns a captured request into a debuggable reproduction.
- **Console panel.** What it is — a REPL inside the running page, with read access to anything in the global scope. The senior workflow:
  - The four log levels (`log`, `info`, `warn`, `error`) and filtering by level.
  - `console.table()` for arrays of objects, `console.dir()` for the full property tree of a DOM node, `console.trace()` for the stack at the call site — three commands a senior uses regularly that a junior often hasn't seen.
  - `$0`, `$1`, … as references to recently-inspected elements.
  - `copy(value)` to put any value on the clipboard.
  - Live-evaluation as you type — useful for testing a query selector against the live DOM before pasting it into code.
- **Application panel.** What it is — every storage and identity surface the page touches. The senior workflow for SaaS work:
  - Cookies — the auth surface. The student will read session cookies here when the auth chapter (Unit 8) lands. Edit and clear right from the panel.
  - Local Storage and Session Storage — for client-state-tooling in Unit 15 and the URL-state list project in Unit 10. Same edit-and-clear surface.
  - IndexedDB — when offline state earns its weight, mentioned in one line, not the default.
  - Service Workers and Cache Storage — surfaced for Unit 14 (cache and rate limiting); not the default, named so the panel is mapped.
  - "Clear site data" — the senior nuke when "it works in incognito but not here" surfaces. Named explicitly.
- The deferred panel: Performance / Lighthouse. One sentence — it exists, it's where Core Web Vitals live, the course returns to it in Unit 19 (perf and observability). Not taught here because measuring performance on an empty page is theatre.
- The Device Mode toolbar — viewport simulation for responsive testing. Named once because the Tailwind chapter (chapter 021) will lean on it; the workflow itself is taught there.

What this lesson does not cover:

- The Sources panel and debugger / breakpoint workflow — the course's day-to-day on this stack is heavy on Server Components and Server Actions, where the debugger lives in the Node process, not the browser. Surfaced one line.
- DevTools' AI-powered insights and the Console Insights panel — named in one dismissive line. The two-pillar filter (no AI naming unless the feature is AI) and the cliff-edge of "AI features in DevTools ship and break on Chrome stable channels" make it the wrong thing to teach as a default.
- React DevTools mechanics in depth — installed here, taught at the call site in chapter 023.
- The cascade itself, the box model, the React render model — the workflows that *use* these in DevTools are taught at the panel; the model is taught in its owning chapter.

Pedagogical approach:

Reference / survey archetype with a strong "reach for it when" backbone. The lesson has four sub-sections, one per panel, and each follows the same shape: one paragraph framing the panel as the answer to a concrete senior question ("what's actually rendered? what did the server send back? what does the page think it knows? what's in storage right now?"), a short ordered list of the moves a senior makes in that panel, and one small worked beat the student can replicate against any page they have open. The lesson should not feel like a manual — the goal is map, not mastery. A `Figure` with a screenshot or annotated SVG of the DevTools layout per panel earns its weight because the geography of the panel is half the lesson. Close with a `Matching` exercise pairing eight production-like scenarios ("the API call returns 401 but the page renders fine," "a class is in the DOM but the style doesn't apply," "a session cookie is set but the next request doesn't send it," "an animation runs on hover but I can't see why," "we ship a fetch but the user sees a stale response," "the React tree shows the component but the prop is undefined," "a redirect happens before I can read the response," "the user reports `localStorage` data they shouldn't have") to the panel the student would open first — this is the one beat that turns the survey into recall. No live coding exercises; the lesson is browser-shaped, not editor-shaped. Offer one `SandboxCallout` at the end with a tiny prebuilt HTML page deliberately broken in four ways (a 404 hidden in Network, a struck-through CSS rule in Elements, a console error nobody reads, a stale cookie) and invite the student to find the four bugs using only DevTools. That sandbox is the lesson's optional confirmation that the geography landed.

Estimated student time: 35 to 40 minutes.

---

## Lesson 4 — HTTPS on localhost with mkcert

Install the TLS 1.3 handshake and certificate-chain mental model at debug depth, then wire a local CA with `mkcert` so `https://localhost` works in the browser without warnings — unblocking the secure-context APIs (cookie `Secure`, Clipboard, WebCrypto, Service Workers) that silently fail on `http://localhost` for cookie attributes and some integrations.

Topics to cover:

- The senior question, plainly stated. Modern browsers gate a growing set of APIs behind the **secure context** condition — the page must be served over HTTPS, or be on `http://localhost`, with a small but load-bearing asymmetry: `http://localhost` is *partially* a secure context (it satisfies most APIs), but cookies with the `Secure` attribute and a handful of integrations require real TLS even on localhost. The senior fix: serve the local dev server over HTTPS with a cert the browser trusts. `mkcert` is the 2026 default for that, and Next.js 16 wraps it under `next dev --experimental-https`.
- The TLS 1.3 handshake at debug depth — the part lesson 1 of chapter 010 deferred. The handshake in three named phases, kept short because most of TLS hides behind libraries.
  - **ClientHello**: client sends supported cipher suites, a random nonce, ALPN identifiers (`h3`, `h2`, `http/1.1`), and the **SNI** (Server Name Indication) — the hostname the client expects, so a server with multiple certs picks the right one.
  - **ServerHello + certificate**: server picks the cipher suite, returns its certificate chain, and signs a key exchange.
  - **Finished**: both sides derive session keys and the handshake completes. TLS 1.3 collapses the old four-step handshake into one round trip; QUIC folds it into the transport handshake (named in lesson 1 of chapter 010).
  Forward secrecy is the property TLS 1.3 always provides for normal traffic — even if the long-term private key leaks later, recorded sessions cannot be decrypted. One line, then move on.
- The certificate chain. A certificate is a public key plus metadata signed by a CA. The browser validates the chain: leaf cert → intermediate CA(s) → root CA. The root must be in the OS or browser trust store; otherwise, the browser rejects the chain. The "your connection is not private" error is the chain validation failing — and on localhost with a self-signed cert, it always fails, because the self-signing CA is not trusted by anyone. The senior fix is to **install a local CA into the trust store, then sign localhost certs with it**. That is what `mkcert` automates.
- `mkcert` walked step by step.
  - `mkcert -install` — generates a local CA, installs it into the OS trust store (macOS Keychain, Windows certificate store, Linux NSS db) and into Firefox's trust store separately (Firefox uses its own). One-time per machine.
  - `mkcert localhost 127.0.0.1 ::1` — issues a cert/key pair for the given hostnames, signed by the local CA installed above. Two files emitted: the certificate (`localhost+2.pem`) and the key (`localhost+2-key.pem`).
  - The student puts the files in a stable location (e.g. `./certs/`), `.gitignore`d.
- Wiring it into Next.js 16. The canonical 2026 path is `next dev --experimental-https`, which auto-detects `mkcert`, generates a cert into `~/.next-experimental-https/`, and serves the dev server over `https://localhost:3000`. Two flags the student should know: `--experimental-https-key` and `--experimental-https-cert` to point at custom files (the `mkcert` files generated above), used when a team wants the cert checked into the repo (the public cert can be, the key cannot — keep the key out of Git). The starter's `package.json` from lesson 2 of chapter 031 has the daily `dev` script; the student adds an opt-in `dev:https` script that runs the HTTPS variant.
- The secure-context API surface this unblocks, named with their owners in later chapters.
  - **Cookies with `Secure`** — Chapter 013 owns the senior default `HttpOnly; Secure; SameSite=Lax; Path=/`. On `http://localhost`, browsers will set a `Secure` cookie in some recent versions and reject it in others; HTTPS removes the ambiguity. One line.
  - **`crypto.subtle`** — lesson 1 of chapter 016 owns Web Crypto. The synchronous primitives (`crypto.randomUUID`, `crypto.getRandomValues`) are available on `http://localhost`; the asynchronous `subtle` interface (HMAC sign/verify, key derivation) requires a real secure context in some integrations. HTTPS removes the surprise.
  - **`navigator.clipboard`** — lesson 2 of chapter 016 owns the Copy button. `writeText` is gated on secure context and user activation. Works on `http://localhost`, but the failure mode on a non-localhost HTTP URL (a LAN IP, a `*.local` hostname for a teammate's preview) silently throws. HTTPS makes localhost behave like production.
  - **Service Workers and the Push API**, named in one line each as advanced cases that require real HTTPS. The course does not ship a service worker on this stack — Server Components and Next.js's data fetching cover the surface.
- The 2026 reality check on `http://localhost`. The bare URL is treated as a secure context for *most* APIs by browser policy — Chrome, Firefox, Safari, Edge all special-case it — so a junior team often ships on plain `http://localhost` for a year. The senior move is to flip to HTTPS the first day, because the localhost loopholes are *partial* and the bug class they produce ("works on my machine, breaks in preview") is exactly the loss the course is trying to prevent. One line on production: production env is HTTPS by default via Vercel; the cert is auto-renewed and the developer never touches it. The local cert is the only one the student manages.
- Pitfalls and watch-outs.
  - Forgetting `mkcert -install` — the cert is signed but the CA isn't trusted; the browser still shows a warning. The fix is the install command, run once.
  - Generating a cert for `localhost` but visiting `127.0.0.1` (or `::1`) — the SAN (Subject Alternative Name) list must include the hostname the browser uses. Either include all three names in the `mkcert` command (the example does), or only visit `https://localhost:3000`.
  - Committing the private key. The `.gitignore` excludes `certs/*-key.pem`. Stated once.
  - The browser sometimes caches the previous (untrusted) cert. Hard-reload or restart the browser after `mkcert -install`.

What this lesson does not cover:

- TLS at protocol-engineer depth — cipher-suite negotiation specifics, key-exchange algorithms, the precise ALPN frame structure. The student is shipping SaaS, not implementing TLS.
- Certificate transparency, OCSP stapling, HSTS preload. Surfaced (HSTS) in Chapter 081's security baseline.
- Production TLS termination — handled by Vercel and the platform. The student does not configure it.
- Mutual TLS (mTLS) or client certificates. Niche; not on the course's path.
- Service worker authoring. Out of scope on this stack.
- The cookie `Secure` attribute end-to-end — Chapter 013 owns the senior default.
- The `crypto.subtle` HMAC sign/verify usage — lesson 1 of chapter 016.
- `navigator.clipboard.writeText` usage — lesson 2 of chapter 016.

Pedagogical approach:

Setup/wiring archetype with a Concept opening. Open with one paragraph on the secure-context gate and why the senior move is to flip to HTTPS on day one. Then the TLS-1.3-at-debug-depth section — a small Mermaid `sequenceDiagram` showing ClientHello → ServerHello + cert → Finished, with one annotation per phase naming the load-bearing fields (SNI, ALPN, cipher suite, certificate chain). The certificate-chain section is a tight `Figure` showing leaf → intermediate → root with one line on the trust-store role. The `mkcert` walkthrough is a `Steps` block: `mkcert -install`, `mkcert localhost 127.0.0.1 ::1`, file placement, `next dev --experimental-https`, browser visit. Each step has its labeled output block; the student watches the chain become trusted in their browser's certificate viewer. The secure-context-API matrix is a short list with each line pointing forward to the chapter that owns it. Close with one `Buckets` exercise sorting six scenarios ("dev server over HTTP, cookie with `Secure` set," "production over HTTPS, `clipboard.writeText`," "`http://localhost`, `crypto.randomUUID`," "`http://localhost`, `crypto.subtle.sign`," "`http://teammate.local`, `clipboard.writeText`," "production over HTTPS, service worker") into "works," "works with localhost exception," or "blocked, needs real HTTPS." That exercise is the lesson's confirmation that the secure-context model transferred. Optional `SandboxCallout` is not needed — the lesson's "sandbox" is the student's own browser viewing the trusted cert.

Estimated student time: 30 to 40 minutes.

---

## Lesson 5 — Quizz

Top 10 topics that should be quizzed:

1. The four network stages from URL commit to first byte (DNS, transport connection, TLS handshake, HTTP request) and what each costs.
2. HTTP/3 over QUIC as the 2026 default — what's multiplexed where, what UDP/443 carries, and the round-trip count for fresh vs. resumed connections (1-RTT vs. 0-RTT).
3. TLS 1.3 inside QUIC — SNI, ALPN, the certificate chain, forward secrecy, and the 0-RTT replay-safety constraint (idempotent GETs only).
4. Reading a DevTools waterfall — identifying `h3`/`h2`/`http/1.1` from the Protocol column, and matching the Timing breakdown labels (Queued, DNS, Initial connection, SSL, Waiting, Content Download) to the stages.
5. The browser rendering pipeline — parse → DOM, CSS → CSSOM, render tree, layout, paint, composite, in order.
6. CSS as render-blocking by default and the `media`-scoped exception; `<script>` parser-blocking vs. `async` vs. `defer`.
7. Compositor-only properties (`transform`, `opacity`) vs. layout-triggering properties (`width`, `top`), and why the former hits 60fps and the latter doesn't.
8. The SSR-plus-hydration overlay — where SSR plugs into the pipeline (the bytes are already populated), where hydration plugs in (after first paint), and the senior framing that the page is visible before it's interactive.
9. The secure-context gate and the `http://localhost` partial exception — which APIs work and which fail on plain localhost (Clipboard, WebCrypto subtle, cookies with `Secure`, service workers).
10. The `mkcert` flow — `mkcert -install` once, `mkcert <hostnames>` per project, `next dev --experimental-https`, the certificate chain validation that the local CA makes succeed.

---

## Total chapter time

Roughly 135 to 170 minutes across the four teaching lessons plus the quiz. The chapter splits cleanly across three sittings — lesson 1 of chapter 010 + lesson 2 of chapter 010 (the request-to-pixel trace) as one, lesson 3 of chapter 010 (the DevTools panel tour) as a short second, and lesson 4 of chapter 010 + the quiz (the local HTTPS wiring and recall) as the third. The student finishes with a working `https://localhost` setup, a mental map of every network and rendering stage they will spend the rest of Unit 2 and Units 3–4 zooming into, and the forward links to know which chapter owns which deeper treatment. Chapter 011 starts on this foundation and teaches the HTTP method-status-header contract without restating any of the network-stack framing.

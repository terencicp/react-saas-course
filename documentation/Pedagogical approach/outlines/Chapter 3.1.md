## Concept 1 — Page load as a four-stage network pipeline

**Why it's hard.** Juniors treat "slow page" as one undifferentiated event and reach for the wrong knob — they tune the server when the cost was DNS, or vice versa. The mental model the chapter installs is that latency is a *sum* of named stages, and the engineer who can point at the slow stage owns the conversation.

**Ideal teaching artifact.** A scrubbable timeline of one request from URL commit to first byte, with four lanes — DNS, transport connection, TLS handshake, HTTP request — drawn to scale against round-trip cost. The student scrubs forward through "fresh visit" and watches each lane consume real milliseconds; then flips a "resumed connection" toggle and watches three lanes collapse to near-zero. Concept archetype with a temporal-scrub centerpiece. A second, smaller annotated `sequenceDiagram` sits beside it for reference, naming what's on the wire at each lane (DoH lookup, QUIC `Initial`, TLS `ClientHello`, HTTP `GET`) — the scrub teaches the *cost* shape, the sequence diagram teaches the *order*.

**Engagement.** A `Matching` round: six labeled timing breakdowns ("400ms on DNS, 5ms everything else," "0ms DNS, 350ms Initial connection," etc.) paired against the dominant bottleneck stage. Locks the "where's the cost" reflex.

**Components.**
- Primary: a hand-authored SVG inside `Figure` rendering the four-lane timeline with the fresh and resumed states drawn side by side. Single-use, no forward link — Figure-wrapped SVG is the right reach.
- Reference companion: Mermaid `sequenceDiagram` inline.
- Engagement: existing `Matching`.

---

## Concept 2 — HTTP/3 round-trip economics and 0-RTT replay safety

**Why it's hard.** "QUIC is faster" is a slogan; the student needs the *why* (TLS handshake folded into transport, no head-of-line blocking) and the *catch* (0-RTT data is replayable, so non-idempotent POSTs wait for the full handshake). Without the second beat, a student building an API will eventually misroute a payment request through early data.

**Ideal teaching artifact.** Concept archetype with a side-by-side handshake race. Three columns: TCP + TLS 1.3 (2-RTT to first byte), fresh QUIC (1-RTT), resumed QUIC (0-RTT). Each column is a small vertical sequence showing client/server arrows ticking down in round-trip units. The student sees the round-trip count visually — three boxes wide is slower than one. Below the race, a callout-style "what rides in 0-RTT?" panel with two columns — *safe in early data* (idempotent GETs, prefetches) and *not safe* (POST, PUT, DELETE; anything with side effects) — anchored to the replay-attack mechanism in one sentence.

**Engagement.** A `Buckets` exercise: six request scenarios ("fetch user profile," "POST a payment," "GET a cached image," "PATCH a draft," "DELETE a session," "HEAD a manifest") sorted into "safe to send in 0-RTT early data" vs. "wait for handshake." The sort is the test — if the student misclassifies the payment, the replay-safety beat didn't land.

**Components.**
- `CodeVariants` or `TabbedContent` for the three-column round-trip race (each tab/variant carries one protocol's handshake sequence; or render all three side-by-side inside a `Figure` for a single visual sweep).
- Existing `Buckets` for the sort.
- Inline `Term` callouts on "0-RTT," "early data," "forward secrecy."

---

## Concept 3 — Reading the DevTools waterfall against the stages

**Why it's hard.** Concepts 1 and 2 give the model; this concept is the *transfer test* — the student must look at a real Network panel row and decode it. The Timing breakdown's labels ("Stalled," "Initial connection," "SSL," "Waiting (TTFB)," "Content Download") don't line up one-to-one with the four network stages, and the Protocol column is hidden by default. Without practice, the student stares at a real waterfall and can't name what they're seeing.

**Ideal teaching artifact.** A two-part teaching beat. First, a labeled annotated screenshot (or hand-authored SVG mock) of the Chrome Network Timing panel for one row, with arrows from each timing label to the network stage it measures — a visual Rosetta stone between DevTools vocabulary and the four-stage model. Second, the lesson directs the student to open DevTools on a live well-configured site (the course site or `cloudflare.com`) with the Protocol column enabled and the cache disabled, load it twice, and watch `Initial connection` collapse on the second load. The lesson is one of the few in the chapter where the "lab" is the student's actual browser.

**Engagement.** A `Tokens` exercise on a static screenshot of a Timing panel: pre-highlighted regions (Queued, DNS, Initial connection, SSL, Waiting, Content Download) are clickable, and the prompt asks the student to click the segment that represents "the server thinking." Repeats for two more prompts ("the TLS handshake," "the cold-DNS tax"). The click is the recall.

**Components.**
- Primary: annotated screenshot inside `Figure` with a caption naming the Rosetta-stone mapping. If a clean screenshot isn't usable, a hand-authored SVG mock of the Timing panel works equally well.
- New: `WaterfallTimingTokens` — a Tokens-style component where the targets are *image regions* (rectangles over the screenshot) rather than code substrings. Inputs: image + region coordinates + per-region prompt and feedback. Could be implemented as a thin variant of `Tokens` that swaps the code-block target surface for an image overlay. Forward link: any DevTools-panel teaching surface in later chapters (Performance panel in Unit 20, Application/Storage panel in 3.4 and 3.7.4).
- Alternative: a plain `Matching` exercise pairing the six Timing labels (left column) to the four stages plus "browser-side" (right column). Lighter, ships today, loses the visual anchor.

---

## Concept 4 — The browser rendering pipeline from bytes to pixels

**Why it's hard.** "The page renders" is opaque; the student needs to see that six distinct stages run before a pixel lights up, and that each stage has different cost characteristics. Without this map, every later perf, animation, or hydration conversation lands on mush.

**Ideal teaching artifact.** Concept archetype, diagram-led. A horizontal pipeline diagram showing bytes → HTML parser → DOM tree, plus a parallel CSS → CSSOM lane, both feeding into render tree → layout → paint → composite. Each stage is a labeled node with one-line summary. The student can hover any node to surface a `Term`-style definition. A second smaller diagram below the main pipeline overlays SSR and hydration as colored bands across the same nodes (covered in Concept 7) — but for this concept, the pipeline itself stands alone.

**Engagement.** A `Sequence` exercise: six events ("HTML bytes arrive," "DOM tree built," "CSSOM built," "render tree assembled," "layout computed," "first paint") dragged into the correct order. The drag is the test that the dependency chain registered.

**Components.**
- Primary: hand-authored SVG inside `Figure` for the pipeline. Single-use diagram, no forward link — Figure-wrapped SVG is the right reach.
- `Term` inline on "DOM tree," "CSSOM," "render tree," "compositor."
- Existing `Sequence` for the order check.

---

## Concept 5 — Render-blocking CSS and parser-blocking scripts

**Why it's hard.** The pipeline diagram doesn't explain *why* a `<link rel="stylesheet">` in `<head>` is the load-bearing tag and why a `<script>` without `defer` stalls parsing. These are dependency rules that bite in production: ship a slow CSS file and FCP suffers; put a script in `<head>` without `defer` and the parser pauses every time it sees one.

**Ideal teaching artifact.** A side-by-side comparison of three HTML documents — identical body content, three different `<head>` configurations — paired with a tiny visualization of what the parser does in each case. Variant A: blocking script in `<head>`. Variant B: same script with `defer`. Variant C: same script with `async`. Below each, a four-track mini-timeline (HTML parse, network fetch, JS execute, first paint) showing how the three variants stagger the work. The point is structural recognition: the student should look at any `<head>` and predict the timing implications. A second, very short beat names the `media`-scoped stylesheet carve-out in one sentence — that the `media="print"` attribute keeps a stylesheet from blocking the render path.

**Engagement.** A `MultipleChoice`: given a `<head>` snippet with a `<script src="...">` (no attributes) and a `<link rel="stylesheet">`, which event fires last — "parser resumes," "first paint," "script executes," "DOM tree complete"? The four-option answer forces the dependency reasoning.

**Components.**
- `CodeVariants` for the three `<head>` configurations, one tab per script-loading mode, each tab carrying both the snippet and a small static timeline below.
- New: `ParserTimeline` — a tiny static SVG (or compact widget) showing four labeled tracks (parse / fetch / execute / paint) with colored bars positioned to show stalling. If the cost is high, fall back to a hand-SVG inside `Figure` for each of the three variants. Forward link: same pattern reused in Unit 5 for streaming and `Suspense` boundaries, and Unit 20 for Core Web Vitals — render-blocking is a recurring frame.
- Existing `MultipleChoice` for the recall.

---

## Concept 6 — Compositor-only properties vs. layout-triggering animations

**Why it's hard.** A junior animates `width` or `top` and the result stutters. They blame React or the device. The real cause is that mutations on those properties invalidate layout and paint, while `transform` and `opacity` change only the composited frame on the GPU — running at 60fps without re-running the upstream pipeline. The misconception fixes only when the student *sees* both cases running side by side.

**Ideal teaching artifact.** A controllable comparison — two boxes animating across the screen, one driven by `transform: translateX(...)`, one driven by `left: ...px`. Both look superficially identical at idle, but the student can toggle a "stress mode" that adds 200 sibling elements to the page; the layout-triggering animation jitters, the compositor-only animation stays smooth. A small label under each animation names which pipeline stages it re-runs (compositor only vs. layout → paint → composite). The artifact carries its own assessment — the visible jitter is the proof. Pattern archetype framed as wrong-by-default-with-fix.

**Engagement.** Artifact-as-assessment, followed by a one-question `MultipleChoice`: given four CSS animation snippets (`transform`, `opacity`, `width`, `box-shadow`), which two are compositor-only? Confirms the rule transferred beyond the two examples.

**Components.**
- New: `LayoutThrashDemo` — a controllable React/Astro widget with two animated boxes side by side, a "stress mode" toggle that injects sibling DOM, and a frame-rate readout per box. Inputs: animation duration, number of stress siblings. What it shows: cause-and-effect between property choice and frame rate. Forward link: directly reusable in Unit 4.5 (motion chapter) and Unit 20 (Core Web Vitals / INP). Strong recurrence justifies the build.
- Alternative if widget budget is tight: `CodeVariants` with two animations rendered as actual HTML inside an `HtmlCssCoding` block in exploration mode — the student edits one to use `width`, watches it stutter manually. Loses the stress-mode controllability but ships fast.
- Existing `MultipleChoice` for the confirmation question.

---

## Concept 7 — SSR + hydration overlay: visible before interactive

**Why it's hard.** This is the chapter's most consequential foreshadowing. The student will spend Units 4 and 5 on Server Components and the App Router; they need a placeholder map *now* showing where SSR plugs into the request lifecycle and where hydration sits relative to first paint. The bug class the framing prevents is "the page is visible but clicks don't fire" — that's not a bug, that's the hydration gap.

**Ideal teaching artifact.** Concept archetype with a two-layer diagram. Layer one is the rendering pipeline from Concept 4 (reused, recognizable). Layer two overlays two new colored bands: an "SSR" band that plugs into the *bytes* node (the HTML arrives already populated by the server), and a "hydration" band that runs as a separate downstream lane attaching event handlers to the already-painted DOM. The student sees that first paint happens *before* hydration starts — the page is visible while it is not yet interactive. One short paragraph explicitly names "visible before interactive" as the senior framing.

**Engagement.** A `Sequence` exercise: six events ("HTML bytes arrive from server," "CSSOM built," "first paint of server-rendered content," "hydration JS bundle downloads," "hydration runs," "click handler fires") dragged into order. The crux is that "first paint" lands *before* "hydration runs"; if the student gets that ordering right, the concept locked in.

**Components.**
- Primary: hand-authored SVG inside `Figure` that re-uses the Concept 4 pipeline as a base layer and adds two colored band overlays. Co-authored as part of the Concept 4 SVG (same file, additional layer toggled on for this lesson). Forward link: the same overlay pattern reappears in Unit 5 for Suspense streaming and selective hydration — worth building as a layered figure once.
- Existing `Sequence` for the ordering test.
- Inline `Term` on "hydration" with a one-sentence definition and a forward-link to Unit 5.

---

## Concept 8 — The TLS 1.3 handshake and the certificate chain

**Why it's hard.** Most engineers ship for years without ever opening a TLS handshake. But on localhost, the chain validation *fails*, and the student needs enough mechanism to know *what* `mkcert` is fixing. Without the chain mental model, "install the cert" is cargo-culting; with it, the student can debug a broken cert in their own Keychain in 5 minutes.

**Ideal teaching artifact.** Two coordinated pieces. First, a Mermaid `sequenceDiagram` of the TLS 1.3 handshake with three labeled phases — `ClientHello`, `ServerHello + certificate`, `Finished` — and each phase carrying one annotation naming the load-bearing field (SNI, ALPN, cipher suite, certificate chain). Second, a small static figure showing the chain itself: leaf cert → intermediate CA → root CA, with the root drawn inside a labeled "trust store" box. The two figures together establish that the chain validates *upward*, and that validation succeeds iff the root sits in the trust store.

**Engagement.** A `Matching` exercise pairing five handshake fields (SNI, ALPN, cipher suite, certificate chain, session ticket) to their role ("which hostname the client expects," "which application protocol both sides agree on," "which symmetric algorithm encrypts traffic," "the public-key signature path the browser validates," "what makes 0-RTT resumption possible"). Recall of vocabulary against function.

**Components.**
- Mermaid `sequenceDiagram` for the handshake.
- Hand-authored SVG inside `Figure` for the chain-and-trust-store diagram. Single-use, no forward link — Figure-wrapped SVG is the right reach.
- Existing `Matching` for the field-to-role mapping.

---

## Concept 9 — The secure-context gate and the `http://localhost` partial exception

**Why it's hard.** The student has heard "HTTPS for production, HTTP for dev" their whole career. The 2026 reality is that `http://localhost` is treated as a secure context *for most APIs but not all* — cookies with `Secure`, parts of `crypto.subtle`, service workers, and some integrations still fail. The bug class is "works on localhost, breaks in preview deployment" and the senior move is to flip dev to HTTPS on day one.

**Ideal teaching artifact.** A decision-grid table the student walks across, then sorts through. Rows: API surface (cookie `Secure`, `crypto.randomUUID`, `crypto.subtle.sign`, `navigator.clipboard.writeText`, service worker registration, `crypto.getRandomValues`). Columns: served over `https://`, `http://localhost`, `http://teammate.local`. Each cell is filled with "works," "works (localhost exception)," or "blocked." The student reads the grid once; the asymmetry of the localhost column makes the senior framing inevitable. Decision archetype, table-led.

**Engagement.** A `Buckets` exercise: six scenarios drawn from the lesson outline ("dev server over HTTP, cookie with `Secure` set," "production over HTTPS, `clipboard.writeText`," "`http://localhost`, `crypto.randomUUID`," "`http://localhost`, `crypto.subtle.sign`," "`http://teammate.local`, `clipboard.writeText`," "production over HTTPS, service worker") sorted into three buckets — "works," "works with localhost exception," "blocked, needs real HTTPS." The sort confirms the asymmetry transferred.

**Components.**
- A plain Markdown / HTML table inside a `Figure` for the decision grid. No new component needed.
- Existing `Buckets` for the sort.
- Inline `Term` on "secure context."

---

## Concept 10 — `mkcert` and the local-CA-in-trust-store flow

**Why it's hard.** The student has the *why* (Concept 9) and the *theory* (Concept 8). This concept is the operational beat: install a local CA into the trust store, issue a localhost cert signed by it, point Next.js at the cert, see the browser show the green padlock. The risk if it isn't walked step by step is that the student runs `mkcert localhost` first (skipping `-install`) and is then debugging a still-warning browser without a model of which step they missed.

**Ideal teaching artifact.** Setup/wiring archetype as a single `Steps` block, each step carrying one terminal command, one expected output, and one verification check the student can perform without proceeding. The verification check is the load-bearing piece: after `mkcert -install`, the student opens their browser's certificate viewer and sees `mkcert development CA` listed as trusted; after `mkcert localhost 127.0.0.1 ::1`, two files appear at known paths; after `next dev --experimental-https`, the browser address bar shows a padlock on `https://localhost:3000`. The pitfalls section is woven into the Steps as inline `Aside` callouts at the exact step where each pitfall bites (forgetting `-install`, missing SAN, committing the key, browser cert cache).

**Engagement.** Artifact-as-assessment — if the student's browser shows the padlock, the procedure worked. Follow up with one short `TrueFalse` round (three statements) confirming the model: "The `-install` command must be re-run per project" (false), "The `.key.pem` file can be committed to Git" (false), "Visiting `127.0.0.1` will work if the cert was issued only for `localhost`" (false). Three falses caught locks the pitfall reflex.

**Components.**
- Existing `Steps` for the procedural walkthrough.
- `Code` blocks for terminal commands (with file paths labeled).
- `Aside` for inline pitfall callouts.
- Existing `TrueFalse` for the pitfall recall.
- Existing `FileTree` to show the `certs/` directory layout with `.gitignore` markings.

---

## Component proposals

**`WaterfallTimingTokens`** — a Tokens-style component where clickable targets are *image regions* over a screenshot rather than substrings of a code block. Inputs: image source, region coordinates, per-region prompt and feedback text.
- Uses in this chapter: Concept 3.
- Forward-links: any DevTools panel surface in later chapters — Performance panel in Unit 20, Application/Storage panel in Chapter 3.4 (cookies) and Chapter 3.7.4 (storage), Network panel re-use in Chapter 3.6 (fetch).
- Leanest v1: extend the existing `Tokens` component with an `image` mode — same scoring and feedback model, target rectangles defined as `{x, y, width, height, correct}` arrays overlaid on an `<img>`. No new interaction primitives; the click handler swaps from "click in highlighted code span" to "click in highlighted image region."

**`ParserTimeline`** — a static (or lightly animated) compact widget showing four labeled tracks (HTML parse, network fetch, JS execute, first paint) with colored bars positioned to show how a `<head>` configuration staggers the work.
- Uses in this chapter: Concept 5.
- Forward-links: Unit 5.3 (Suspense streaming and `loading.tsx` boundaries) and Unit 20 (Core Web Vitals, render-blocking diagnosis). Render-blocking framing recurs.
- Leanest v1: not a real component — a hand-authored SVG inside `Figure`, one per `<head>` variant, with the four tracks drawn as colored rectangles. Three SVGs total. If the pattern recurs in Unit 5 and Unit 20 as expected, promote v1 to a real component that takes a track-list config.

**`LayoutThrashDemo`** — a controllable widget with two animated boxes side by side (one `transform`-driven, one `width`- or `left`-driven), a "stress mode" toggle that injects sibling DOM, and a per-box frame-rate readout.
- Uses in this chapter: Concept 6.
- Forward-links: Unit 4.5 motion chapter (the canonical reach for "why does this animation stutter"), Unit 20 INP and Core Web Vitals.
- Leanest v1: two `<div>`s with hardcoded CSS animations, a single "add 200 siblings" toggle button, and `requestAnimationFrame`-based FPS counters. No configurable inputs; ships as a self-contained Astro component. Lifts to a configurable component later if a third use-site appears.

---

## Build priority

`WaterfallTimingTokens` is the highest-leverage build: Unit 3 alone references DevTools panels in at least four downstream chapters, and the component generalizes the existing `Tokens` pattern with minimal new surface area. `LayoutThrashDemo` is the second priority — it carries the load-bearing animation-cost misconception in this chapter and is the canonical artifact for the entire Unit 4 motion chapter, where the same misconception bites students again. `ParserTimeline` is the lowest priority: ship v1 as Figure-wrapped SVGs in Chapter 3.1, watch for the recurrence in Unit 5.3 and Unit 20, then promote only if it earns a second site.

## Open pedagogical questions

- Concept 3's lab beat asks the student to open DevTools on a live external site. If the course site itself doesn't reliably serve `h3` at the time the lesson is consumed (e.g., during local preview), the worked-trace example breaks. Pin a stable external target (`cloudflare.com`) and frame the course-site step as optional.
- Concept 6's `LayoutThrashDemo` needs a fallback for users with reduced-motion preferences set — the artifact's whole pedagogy depends on visible motion. Either gate the auto-play behind a click-to-start, or run a side-by-side paused frame with explicit FPS labels for the reduced-motion path.

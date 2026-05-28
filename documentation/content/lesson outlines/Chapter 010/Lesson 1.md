# Lesson 1 outline — URL bar to first byte

## Lesson title

- **Title (h1):** URL bar to first byte
- **Sidebar label:** URL bar to first byte

The chapter-outline title is precise — keep it. It names the exact slice of the page load the lesson owns and sets up "first byte to pixels" (lesson 2) as the natural sequel.

## Lesson framing — conclusions from brainstorm

**Target student.** Junior with web basics. Has heard "DNS" and "HTTPS" in passing; has not opened the DevTools Network panel with intent. Comes from chapter 009 (JSON, classes, Temporal) — the value model is internalised, but Unit 2 is the first time the substrate the values *travel through* gets named.

**What this lesson is.** A map, not a deep dive. Four stages from URL commit to first byte, named in the 2026 vocabulary (HTTP/3 over QUIC, TLS 1.3, DoH-when-the-resolver-supports-it, Happy Eyeballs v2 for IPv6), and the DevTools waterfall as the read-out surface the rest of Unit 2 will lean on. The student finishes able to (a) point at any waterfall row, name the protocol, and locate the dominant cost in the Timing breakdown; (b) explain why a resumed connection collapses to near-zero on DNS and connection setup; (c) name which later chapter owns the deeper treatment of each stage.

**The senior framing carried through.** A slow page load is a *stage* problem. The engineer who can point at the slow stage owns the debugging conversation. This is the durable skill — protocols will turn over, but the staged mental model survives.

**Pedagogical levers.**
- **Diagram-led.** The lesson's spine is a single annotated Mermaid `sequenceDiagram` covering the four stages with round trips marked. Prose orbits the diagram, not the other way around.
- **Defaults before conditionals.** State the 2026 default (HTTP/3 over QUIC, TLS 1.3, DoH where the resolver supports it). Name the fallback in one line, do not detour.
- **No bootcamp scaffolding.** Adult tone, terse, assumes the student has used `fetch`. Do not re-explain "what is a URL."
- **No history.** No HTTP/1.1 pipelining war stories, no SPDY, no TLS 1.2 cipher-suite trivia. The course operates on the 2026 stack.
- **Real lab, no sandbox.** The student opens DevTools on a real site mid-lesson and watches the protocol column and Timing panel. This is the moment the abstraction grounds. Direct them explicitly to do it.
- **Cognitive load.** Start with the one-paragraph senior frame (a page load is a pipeline of stages), then the four stages in order. Each stage is one short prose section anchored to the diagram. The DevTools waterfall section folds the abstraction back onto the screen the student will use forever.

**Common beginner traps to defuse.**
- Thinking DNS is "free" — cold lookups are 20–80 ms and invisible on localhost.
- Reading the Timing breakdown without knowing which label maps to which stage (especially that h3 collapses TLS into the initial connection).
- Treating TTFB as a single number rather than DNS + connect + handshake + server-thinking + RTT, three of which the resumed connection skips.
- Not realising the browser races IPv6 and IPv4 in parallel (Happy Eyeballs v2) — a single resolution is not happening.
- Expecting `h3` on the *first* hit to a fresh origin. Most browsers learn HTTP/3 from the `Alt-Svc` header on a prior HTTP/2 response, then upgrade on the next request. Cold-start may be `h2`; the second navigation flips to `h3`.

**Forward links named once each, never elaborated:** HTTP method/status/header contract → chapter 011; origins and CORS → chapter 012; cookies and `Secure`/`SameSite` → chapter 013; deeper TLS handshake at debug depth (cipher suites, certificate chains, SNI/ALPN) → lesson 4 of this chapter; browser-side rendering pipeline → lesson 2 of this chapter; TTFB tuning and Core Web Vitals → Unit 19.

**Out-of-scope, do not write code.** No application code in this lesson. The "lab" is opening DevTools.

**Estimated student time:** 35–45 minutes.

---

## Lesson sections

The lesson opens with an introduction (no h2), then five h2 sections, each carrying one of the four stages plus the DevTools waterfall read-out. Close with a Matching exercise so the student exits with active recall, not passive reading.

### Introduction (no header)

One short paragraph, two beats:

1. **The senior framing.** A page load is a pipeline; the latency the user sees is the sum of its stages. The engineer who can look at a slow waterfall row and name the stage owns the debugging conversation. This lesson is the map.
2. **Scope.** Four stages from URL commit to first byte (DNS, transport, TLS, HTTP). Each stage gets one prose section and one anchor on the diagram. Reading the waterfall is the fifth section. The browser side (parse, layout, paint) is the next lesson; deeper TLS is later in this chapter.

End with a one-line directive: "Open DevTools (Cmd+Opt+I / F12), go to the Network tab, right-click any column header, and enable the **Protocol** column. Leave it open — we use it mid-lesson."

### The four-stage map

Before walking each stage, show the full diagram so the student has the whole structure in view. A single `Figure` wrapping a Mermaid `sequenceDiagram`.

**Diagram — Mermaid `sequenceDiagram`, the lesson's centrepiece.** Actors: `Browser`, `Resolver` (DNS), `Server`. Lanes from top to bottom:

1. **Stage 1 — DNS.** `Browser ->> Resolver: query example.com (A + AAAA)` then `Resolver -->> Browser: 2606:4700:: / 104.16.…` with a `Note over Browser,Resolver: Happy Eyeballs v2 races IPv6 and IPv4`. One bracket label "~20–80 ms cold, ~0 ms warm".
2. **Stage 2+3 — Transport + TLS folded (QUIC).** `Browser ->> Server: Initial (ClientHello + QUIC frames)` then `Server -->> Browser: ServerHello + cert + handshake` then `Browser ->> Server: Finished`. One bracket label "1 RTT fresh, 0 RTT resumed". A `Note over Browser,Server: HTTP/3 over QUIC on UDP/443 — TLS 1.3 folded into the transport handshake`.
3. **Stage 4 — HTTP request.** `Browser ->> Server: GET / HTTP/3` then `Server -->> Browser: 200 + first byte`. Bracket label "TTFB".

Caption: "Four stages from URL commit to the first byte of HTML on the 2026 default stack — HTTP/3 over QUIC, TLS 1.3, DoH where the resolver supports it."

Use the `themeCSS` init trick from `documentation/diagrams/mermaid.md` if the messages get too small after the figure-card scaling: `.messageText, .messageText tspan { font-size: 18px !important; }` and the same for `.actor` labels if needed.

Note about why Mermaid `sequenceDiagram`: the temporal/connection shape is exactly what `documentation/diagrams/INDEX.md` recommends Mermaid for. The four stages are sequential, the actors are persistent, the round trips are the load-bearing visual.

### Stage 1 — DNS resolution

One short prose section, ~3 short paragraphs.

- **What happens.** The browser hands the hostname to the OS resolver; the resolver walks (or hits) its cache chain — browser cache, OS cache, recursive resolver, authoritative server. A cold lookup costs roughly 20–80 ms; a warm one is free.
- **DoH, named plainly.** In 2026, DNS-over-HTTPS is the encrypted path browsers use when the configured resolver supports it. Firefox enables it by default for most users; Chrome and Edge auto-upgrade to DoH when the system resolver advertises support, falling back to plain DNS otherwise. Use the term once with `<Term definition="DNS over HTTPS — DNS queries tunneled through an HTTPS connection so the resolver path is encrypted and unmodifiable on-wire.">DoH</Term>`. DoT (DNS over TLS) and DoQ (DNS over QUIC) are the OS-level and QUIC-native alternates — name in one line, do not detour.
- **Happy Eyeballs v2.** The browser issues A and AAAA queries in parallel and prefers IPv6 when both resolve in time (RFC 8305, ~50 ms IPv6 preference window). Named so the student stops picturing a single resolution. Use `<Term definition="RFC 8305 algorithm: browsers race IPv4 and IPv6 lookups and connection attempts, preferring IPv6 by ~50ms to avoid a long-tail wait when one family is broken.">Happy Eyeballs v2</Term>`.
- **Senior watch-out (inline `<Aside type="caution">`):** a cold DNS leg is invisible on localhost where everything resolves to 127.0.0.1 in microseconds. It surfaces in production and in flaky preview environments. If a user reports "the first load is slow," DNS is the first place to look.

### Stage 2 — Transport: HTTP/3 over QUIC

This is the section that has to land cleanly. Two prose paragraphs plus one `CodeVariants`-style RTT comparison.

- **The default.** HTTP/3 over QUIC on UDP/443. Define `<Term definition="Quick UDP Internet Connections — a multiplexed, encrypted, congestion-controlled transport built on UDP. The TLS handshake is folded into the connection setup, and streams don't block each other on packet loss.">QUIC</Term>` once. Why it exists: HTTP/2 over TCP solved multiplexing at the HTTP layer but TCP's in-order delivery still caused head-of-line blocking when a single packet dropped; QUIC moves multiplexing into the transport itself so a lost packet only stalls its own stream.
- **Discovery via `Alt-Svc`.** Browsers don't speculatively try HTTP/3 cold. They reach a host over HTTP/2, see the `Alt-Svc` response header advertising HTTP/3, and upgrade on the next request. (The HTTPS DNS record — type 65 / SVCB — is starting to let browsers learn HTTP/3 from DNS on the very first visit, but Alt-Svc is still the most common discovery path in 2026.) The practical consequence the student will see in the DevTools drill: the very first hit to a fresh origin can show `h2`, and the second navigation flips to `h3`. Name this here so it isn't a surprise in the drill.
- **The conditional fallback in one line.** HTTP/2 over TCP + TLS 1.3 is still ubiquitous; corporate networks sometimes block or throttle UDP, and clients silently fall back.
- **HTTP/1.1.** Named in one literal line: "Origins that haven't moved still serve HTTP/1.1 to clients that still handshake it. The course does not write any HTTP/1.1-specific code."

**RTT comparison — `CodeVariants` with three tabs.** This is a side-by-side, not a code comparison strictly speaking, but `CodeVariants` is the right component because each tab needs a compact diagrammatic block plus one-paragraph framing. Each tab holds a small fenced block (use ` ```text ` or hand-formatted ASCII) showing the round-trip count.

- Tab 1 — **HTTP/3 fresh (1 RTT):** ASCII sequence "Client → Server: Initial + ClientHello" / "Server → Client: ServerHello + cert + Finished" / "Client → Server: Finished + HTTP request". Prose: "One round trip and the request rides on the same flight."
- Tab 2 — **HTTP/3 resumed (0 RTT):** ASCII showing the client sending early data inside the very first packet using a cached session ticket. Prose: "Repeat visit to the same origin — the request goes in the first packet. Latency to first byte ≈ one RTT for the response. Early data is only safe for idempotent GETs (replay-safety constraint)."
- Tab 3 — **HTTP/2 + TLS 1.3 (2 RTT):** ASCII showing TCP SYN/SYN-ACK/ACK then ClientHello → ServerHello → Finished. Prose: "TCP handshake first, then TLS, then the request. Two round trips to the first byte on a fresh connection."

`syncKey` on the tab group is optional; a one-shot is fine.

### Stage 3 — TLS 1.3 inside the QUIC handshake

Short. The deeper TLS treatment lives in lesson 4 of this chapter; here name the four facts that make the diagram and the RTT counts make sense.

1. **TLS 1.3 is the only flavor the 2026 stack ships.** Plain statement.
2. **In QUIC, TLS is interleaved with the transport handshake.** The ClientHello rides in the first QUIC packet. A fresh connection completes in 1 RTT; a resumed connection completes in 0 RTT using a session ticket from a previous visit to the same origin.
3. **0-RTT replay-safety constraint (one paragraph, load-bearing).** Early data is only sent for idempotent GETs, because an attacker who captures the encrypted packet could replay it and the server has no nonce yet to reject the replay. Non-idempotent requests wait for the handshake. Foreshadows chapter 011's idempotency contract — name the forward link in one line.
4. **Forward secrecy.** TLS 1.3 always provides it for normal traffic — even if the server's long-term private key leaks later, recorded sessions can't be decrypted. 0-RTT early data does *not* have forward secrecy. One sentence each, move on.

Use `<Term definition="A repeat connection to an origin the client has visited before — the client carries a session ticket, the cryptographic handshake collapses, and the request can ride in the first packet.">resumed connection</Term>` inline when it first appears.

Close with one sentence: "The full TLS 1.3 handshake with cipher suites, ALPN, and certificate chains is lesson 4 of this chapter. Here we needed the round-trip count and the resumption story."

### Stage 4 — The HTTP request and TTFB

Two short paragraphs.

- **The request.** Once the secure transport is up, the client sends an HTTP/3 request — method, path, host pseudo-header, request headers, and (for non-GET) a body. The server responds, the first byte arrives.
- **TTFB.** Define `<Term definition="Time to First Byte — the wall-clock time from the moment the browser commits the URL to the moment the first byte of the response body arrives. Bundles DNS, connection setup, TLS handshake, request travel, server thinking time, and one network round trip.">TTFB</Term>` once. The metric Unit 19 tunes; here it is just a label so the student stops thinking "server slow" when the dominant cost is actually DNS or the handshake.
- **Senior watch-out (`<Aside type="caution">`):** TTFB measured from a warm connection is the *server-and-network* number. TTFB on a cold connection bundles DNS, the QUIC handshake, the request, and server thinking time into one stopwatch. When debugging, always check which one you are looking at.

### Reading the DevTools waterfall

The lesson's grounding section. The reader opens DevTools on a real page and reads each label they will use for the rest of Unit 2.

**Structure:**

1. **One paragraph framing.** The DevTools Network panel exposes one row per request. The Protocol column tells you which version the request used; the Timing breakdown (visible by hovering the row or clicking it) maps each stage of this lesson to a label on a stopwatch.

2. **The Protocol column.** One short paragraph plus a one-line note: right-click any column header in the Network panel, enable **Protocol**. Values to expect: `h3` (HTTP/3 over QUIC), `h2` (HTTP/2), `http/1.1` (legacy). Re-state the Alt-Svc nuance: on a fresh origin, the very first document request may be `h2`; reload and it's likely `h3`. The senior reflex: any production request that is *still* not `h3` on a well-configured origin after a second load is a config conversation, not a defect.

3. **The Timing labels mapped to the stages.** A bullet list (not `<Steps>` — these are reference labels, not a procedure):

   - **Queued / Stalled** — request waiting on the browser's connection pool or priority queue (not a network stage per se; the browser's local accounting).
   - **DNS Lookup** — stage 1. Frequently `0` on warm caches.
   - **Initial connection** — stage 2 (transport). For h3, the QUIC handshake collapses into this; for h2, this is the TCP three-way handshake only.
   - **SSL** — stage 3 (TLS). For h3, this is folded into Initial connection and may not appear as a separate bar. For h2, this is the separate TLS round trip on top of TCP.
   - **Request sent** — bytes uploaded.
   - **Waiting (TTFB)** — stage 4, server thinking time plus the final network round trip.
   - **Content Download** — body bytes arriving.

   Render this as inline `<Term>` callouts on each label, with the definitions doubling as inline tooltips for revisits.

4. **The concrete trace — a guided drill.** Use a `<Steps>` block (this *is* a procedure). The student does this on a real site.

   **Steps:**
   1. Open DevTools, switch to **Network**. Tick **Disable cache**. (Note: "the checkbox lives in the toolbar at the top of the Network panel.")
   2. Hard-reload `cloudflare.com` (or the course site) and watch the document row.
   3. Check the **Protocol** column. On the very first load to a fresh origin you may see `h2`; do one more reload and the document row should flip to `h3` (the browser learned about HTTP/3 from the `Alt-Svc` header on the first response). Hover the row, read the Timing pane, find the **DNS Lookup**, **Initial connection**, **Waiting**, **Content Download** segments. On h3, the **SSL** bar collapses into **Initial connection** — that's the transport-plus-TLS fold the diagram showed.
   4. Untick **Disable cache** and do a soft reload. DNS Lookup and Initial connection collapse to near-zero. That is the resumed-connection effect the lesson named — visible on the panel.
   5. Click the **Waiting (TTFB)** segment and read the number. That is the server-and-network cost the resumed connection isolates.

5. **One concrete screenshot or visual.** Two options, pick by author preference:

   **Option A — Screenshot.** A captured Timing-panel screenshot of a real h3 request to `cloudflare.com` with all the labels visible, wrapped in `<Screenshot viewport="desktop">` inside a `<Figure caption="…">`. Store under `public/screenshots/010/01-h3-timing.png`. Annotate (in caption or with overlaid SVG) the mapping from each Timing label to its lesson stage. This is the most efficient option.

   **Option B — Hand-coded SVG mock.** Author a minimal stacked-bar SVG of the Timing breakdown with labels pointing to each stage. Use this if a real screenshot can't be obtained, or if the colours/details would distract from the mapping. Wrap in `<Figure>`.

   Recommend Option A unless the screenshot fails to capture all labels cleanly.

### Closing exercise — read the waterfall by its dominant cost

One `Matching` exercise. The student matches six waterfall-row shorthand descriptions to their dominant cost. This is the lesson's active-recall confirmation that the four stages and their Timing labels stuck.

**Pairs (left = a waterfall-row summary, right = the dominant cost):**

1. Left: "`h3`, DNS Lookup 0ms, Initial connection 0ms, Waiting (TTFB) 320ms, Content Download 12ms" — Right: **Server-bound** (warm connection, server is thinking).
2. Left: "`h2`, DNS Lookup 75ms, Initial connection 90ms, SSL 80ms, Waiting (TTFB) 60ms, Content Download 8ms" — Right: **Connection-bound** (cold TCP+TLS handshake dominates).
3. Left: "`h3`, Queued 0ms, DNS Lookup 60ms, Initial connection 35ms, Waiting (TTFB) 50ms" — Right: **DNS-bound** (cold lookup dominates).
4. Left: "`h3`, Queued 280ms, DNS 0ms, Connection 0ms, Waiting 40ms" — Right: **Queue-bound** (browser priority queue / connection pool stall).
5. Left: "`h3`, Waiting (TTFB) 30ms, Content Download 1800ms" — Right: **Content-bound** (large response body, server was fast).
6. Left: "`(from disk cache)` 0ms total" — Right: **Cached** (no network leg at all — the browser served the request from its HTTP cache).

The exercise's grading is automatic; the student gets the matching feedback after submitting.

### What stays out (named once)

A two-line wrap immediately after the exercise:

- The full TLS 1.3 handshake with cipher suites, ALPN, and certificate chains is lesson 4 of this chapter. The HTTP method/status/header contract is chapter 011. Origins and CORS are chapter 012. The browser-side rendering pipeline (parse, CSSOM, paint, composite) is lesson 2.

No `LinkCards` here — the forward links are course-internal and named in-line.

### Optional — `<details>` deep-dive

If extra room remains in the lesson budget, one collapsed `<details>` block for the curious: "Why doesn't HTTP/3 use TCP?" — one paragraph on head-of-line blocking and why moving multiplexing into the transport itself is the load-bearing change QUIC brings. Keep it short; this is *behind a click*, so the lesson's main flow is unchanged.

If the lesson reads complete without it, omit. Skim, don't pad.

---

## Components and tools to use

| Element | Component / engine |
| --- | --- |
| The four-stage sequence diagram | Mermaid `sequenceDiagram` inside `<Figure>` |
| The RTT comparison (1-RTT / 0-RTT / 2-RTT) | `<CodeVariants>` with ASCII bodies and one-paragraph prose under each tab |
| The Timing-label list | Inline `<Term>` callouts on each label name |
| The guided DevTools drill | `<Steps>` |
| The senior watch-outs | `<Aside type="caution">` |
| The concrete DevTools view | `<Screenshot viewport="desktop">` inside `<Figure caption="…">` (preferred) or hand-coded SVG inside `<Figure>` |
| The closing recall drill | `<Matching>` |
| Optional deep-dive | `<details>` |

No live-coding component; the student's "lab" is DevTools on a real site, and the lesson explicitly directs them there. No sandbox callout.

## Term tooltips to author

Strategic, not exhaustive. Each `<Term>` definition is one or two sentences of plain text.

- `DoH` (DNS over HTTPS)
- `Happy Eyeballs v2` (RFC 8305 IPv6/IPv4 race)
- `QUIC` (multiplexed, encrypted, congestion-controlled transport on UDP)
- `Alt-Svc` (the header that advertises HTTP/3 availability) — used in one line, tooltip optional
- `resumed connection` (session-ticket reuse, 0-RTT path)
- `TTFB` (time to first byte)
- `Initial connection`, `Waiting (TTFB)`, `Content Download` — in the Timing-labels list, the tooltip carries the one-line "what this label measures" so the labels become hover-revivable later in the course.

---

## Scope

### What this lesson covers

- The four stages from URL commit to first byte: DNS, transport (HTTP/3 over QUIC), TLS 1.3 inside the QUIC handshake, the HTTP request and TTFB.
- The 2026 defaults named plainly: HTTP/3 over QUIC on UDP/443, TLS 1.3, DoH where the resolver supports it, IPv6 preferred via Happy Eyeballs v2.
- The conditional fallbacks named in one line each: HTTP/2 over TCP+TLS 1.3 (UDP blocked or first hit before Alt-Svc discovery), HTTP/1.1 (legacy origins), DoT/DoQ (alternate encrypted DNS paths).
- The Alt-Svc discovery nuance — first hit to a fresh origin can be `h2`, subsequent hits flip to `h3`. Named once because the student will see it in the drill.
- Reading the DevTools Network waterfall — enabling the Protocol column, mapping the Timing breakdown labels to the four stages, and watching a fresh vs. resumed connection collapse.
- The 0-RTT replay-safety constraint (idempotent GETs only) named once as foreshadowing for chapter 011's idempotency contract.

### What this lesson does NOT cover (owned by other lessons, do not re-teach)

- **HTTP method/status/header semantics** — chapter 011 owns the contract. Do not detail GET/POST/PUT/PATCH/DELETE, status code families, or header categories. The lesson uses `GET` once in the diagram and that is the full extent.
- **Origins, CORS, the same-origin policy** — chapter 012. Do not name `Origin` / `Referer` / preflight.
- **Cookies and `Secure`/`SameSite`** — chapter 013. Do not introduce the `Cookie` header.
- **The full TLS 1.3 handshake at debug depth** — lesson 4 of this chapter. Do not enumerate cipher suites, key-exchange algorithms, the ClientHello/ServerHello fields beyond what the sequence diagram needs, certificate chains, SNI, or ALPN. Name them in one line as "lesson 4 owns the deeper terrain."
- **The browser-side rendering pipeline (parse, CSSOM, render tree, layout, paint, composite)** — lesson 2 of this chapter. The first byte *arrives* in this lesson; what happens next is the next lesson.
- **The DevTools panels beyond Network** — lesson 3 of this chapter. Elements, Console, Application get a tour there. Here, only the Network panel matters.
- **`mkcert`, the secure-context gate, local HTTPS setup** — lesson 4 of this chapter.
- **Tuning TTFB, Core Web Vitals, the Performance panel** — Unit 19. TTFB is *named* as a label here; do not tune.
- **HTTP/2 frames, HPACK, HTTP/1.1 keep-alive and pipelining, SPDY history** — out of scope across the whole course. Named in one line each as the conditional floor, not detailed.
- **TCP congestion control (BBR vs. CUBIC), socket-level tuning, kernel-level networking** — permanently out of scope for the application-engineer course.
- **AI-related framing** — no naming AI here; this is a protocol lesson.

### Prerequisites the student already has (do not re-teach)

The student arrives from chapter 009 with:

- Working knowledge of JS values, promises, async/await (chapters 001–008).
- Has used `fetch` against an API at least conceptually (touched in earlier units; full treatment in chapter 015).
- Knows what a URL is, what a hostname is, what HTTPS means at the surface level.
- Has DevTools open habitually but has not been *taught* the Network panel.

Do not re-define URL parts, hostname, HTTPS-as-encryption, or what a server is. One-line refreshers are fine when needed for flow; do not detour.

---

## Notes for the writer agent

- **No application code in this lesson.** Any `text` code blocks (ASCII RTT diagrams, the literal `GET / HTTP/3` line in the sequence diagram message) are illustrative, not functional. Code conventions (`documentation/code standards/Code conventions.md`) don't apply to the ASCII diagrams; the lesson ships no production-shape source.
- **Diagram is centre of gravity.** Build it first; the prose orbits it. If the diagram doesn't read clearly at the figure-card width, fix the diagram before the prose. Use the `themeCSS` font-size bump from `documentation/diagrams/mermaid.md` if labels shrink below ~16px after the figure-card scale-down.
- **Numerical claims to keep verifiable.** Cold DNS 20–80 ms; ~50 ms IPv6 preference window in Happy Eyeballs v2; HTTP/3 share roughly 25–35% globally in 2026 (named in passing if at all, not central); 0-RTT replay-safety = idempotent GETs only.
- **Do not overstate DoH-as-default.** Firefox is default-DoH for most regions; Chrome/Edge auto-upgrade *when the system resolver supports DoH*, otherwise plain DNS. State this precisely — "increasingly DoH when the resolver supports it" — rather than blanket "DoH everywhere."
- **HTTP/3 discovery via `Alt-Svc`.** Browsers don't speculatively try HTTP/3 cold — they discover it via the `Alt-Svc` header on a prior HTTP/2 response, then upgrade. The HTTPS DNS record (SVCB/HTTPS, type 65) is a newer alternative that lets some browsers learn HTTP/3 from DNS on the first visit; Alt-Svc is still the most common path in 2026. State the practical consequence: cold-start may be `h2`, the second request flips to `h3`.
- **One concrete screenshot is worth a thousand SVG mocks.** Prefer a real captured DevTools view to a hand-coded mock for the Timing panel.
- **The student's first DevTools moment is sacred.** The mid-lesson directive to open DevTools and find the Protocol column is the lesson's pivot from abstract to concrete. Don't bury it.

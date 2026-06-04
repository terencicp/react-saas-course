# Lesson 2 — Streaming a page in chunks

- **Title (h1):** Streaming a page in chunks
- **Sidebar label:** Streaming

## Lesson framing

Second lesson of Chapter 031. L1 taught `<Suspense>` as a declarative contract and the unit-of-UX placement rule, but deliberately deferred *the mechanism* — **why** parallel boundaries reveal independently and **why** a fast widget paints before a slow one finishes. This lesson owns that mechanism: **streaming, the wire transport the App Router uses to deliver the shell first and each Suspense boundary as its own follow-up chunk.**

The single mental model the student must leave with: **the server opens one HTTP response, flushes the static shell plus every Suspense fallback in the first chunk, then writes a follow-up chunk per boundary as it resolves — resolved HTML plus a tiny inline script that swaps it into the fallback's slot — keeping the connection open until every boundary settles.** Streaming is not a feature you turn on; the moment you wrap an async child in `<Suspense>`, the route streams.

The senior reframe that runs through the lesson: L1 framed boundary placement as a *UX* decision ("what should resolve as a unit?"); L2 reveals that the same placement is also a *performance* decision. The pain it relieves is the React 18 / classic-SSR default where **time-to-first-byte is dictated by the slowest query on the page** — one 800ms read holds the entire document hostage. Streaming breaks that coupling: the slow read no longer blocks the shell.

Two anti-patterns are the heart of the senior content because they are the bugs the student will actually ship:
1. **Sequential `await`s in one Server Component** serialize independent reads — `const a = await x(); const b = await y();` costs `x + y`, not `max(x, y)`, even though neither depends on the other. This is the most common real-world latency regression and is invisible until you read a trace.
2. **One big top-level `<Suspense>`** collapses streaming back into a single all-or-nothing loading screen — the opposite of progressive reveal.

A third, subtler insight: **work *above* every Suspense boundary blocks the first byte.** A 50ms query in the root layout is 50ms of blank screen for every route under it. The senior reflex is to keep above-boundary work cheap (auth check, layout shell) and push every slow read below a boundary.

Keep cognitive load low by staging:
1. the transport (what bytes go down the wire, in what order),
2. that it's the default (no flag),
3. parallel fetching and the sequential-await trap (the latency lesson),
4. the `Promise.all`-vs-parallel-boundaries decision (consumed *together* vs *adjacently*),
5. what blocks the first byte (above-boundary work),
6. how to *confirm* it streamed (the network-panel diagnostic),
7. what streaming is *not* (HTTP chunks, not a socket — SSE/WebSockets are a different tool).

Canonical domain carries over from L1: an invoices dashboard with a fast user-profile widget (~10ms), a mid analytics chart (~300ms), and a slow recent-activity feed (~800ms), plus a static `Header`. Reuse `listInvoices()` / `InvoiceList` / `InvoiceSkeleton` naming so the chapter reads as one codebase.

Hard scope discipline: this lesson is the **runtime transport of a single streamed request**. It does not teach the file conventions (`loading.tsx` et al. — L3), errors (L3), `global-error.tsx` (L4), or Partial Prerendering / caching (Ch032). PPR and `connection()` get named-once forward pointers; everything else is deferred silently or with a one-line pointer where the student would expect it.

Component strategy at a glance:
- `RequestTrace` (preset `phases="server-render,shell,stream"`) as the centerpiece transport visual — it animates server-render → shell flush (fallbacks shown) → holes streaming in document order. This is exactly what it was built for.
- A Gantt-style timeline (Mermaid `gantt`, HTML+CSS bar grid fallback) to make the sequential-vs-parallel latency contrast *visible* on a shared time axis.
- `CodeVariants` for the sequential-await-vs-parallel-boundaries shapes and the one-big-Suspense-vs-targeted shapes.
- `AnnotatedCode` for the parallel-fetching page where attention must move across multiple boundaries/queries.
- `CodeReview` as the primary exercise — diagnose the two anti-patterns in a realistic page (the senior diagnostic skill this lesson teaches).
- `Sequence` to drill the chunk-order model; `StateMachineWalker` (decision) for the `Promise.all`-vs-boundaries call; `MultipleChoice` for misconception recall.

## Lesson sections

### Introduction (no header)

Open with the senior question made concrete, reusing the L1 dashboard. The page renders three independent widgets: the user profile (~10ms), the analytics chart (~300ms), and the recent activity feed (~800ms). State the old-world cost plainly: with the classic server-rendering model the server must finish *every* `await` before it can send a single byte, so the user stares at a blank screen for ~800ms — the slowest query sets time-to-first-byte for the whole page. Pose the question: how does Next.js 16 hand the user the fast widgets immediately and stream the slow one in when it's ready?

Connect to L1 in one line: the student already knows *where* to draw Suspense boundaries; this lesson shows the machinery that makes those boundaries pay off, and turns boundary placement from a UX call into a performance call. State the promise: by the end the student can read why a page is slow, name the two shapes that defeat streaming, and confirm streaming worked from the network panel. Keep it to a few short paragraphs.

`Term` candidates: **time-to-first-byte (TTFB)** (when the first response byte reaches the browser — re-explained briefly, it's the metric the whole lesson moves).

### What streaming sends down the wire

The transport mental model, built up in one pass. Define streaming precisely: instead of buffering a complete HTML document and sending it at the end, the server **opens the response and writes it in chunks over time**. The sequence:

1. The server renders everything *not* behind a Suspense boundary — the static shell and any non-suspended content.
2. It writes the **first chunk**: that shell plus, in place of each suspended boundary, the boundary's `fallback`. The browser paints this immediately.
3. As each suspended boundary resolves on the server, the server writes a **follow-up chunk**: the boundary's resolved HTML plus a small inline `<script>` that finds the fallback's placeholder in the DOM and swaps the real content into it.
4. The connection **stays open** until every boundary has settled; then the response closes.

Make the key reframes explicit in prose: there is one response, not many requests; the fallbacks ship *with* the shell, so the page is interactive-looking instantly; boundaries can resolve out of source order but stream in as they're ready; the swap is a DOM patch, not a re-fetch.

**Centerpiece visual — `RequestTrace`** with `phases="server-render,shell,stream"`, `title="Streaming the invoices dashboard"`, `url="/dashboard"`. Tree (depth ≤ 3, ~5 nodes):
- `DashboardPage` (server, `cache="static"`)
  - `Header` (server, `cache="static"`)
  - `ProfileCard` (server, `await="db: profile"`) — wrap in a `Suspense` node, `fallback="Profile skeleton"`
  - `Suspense` (`kind="suspense"`, `fallback="Activity skeleton"`) → `ActivityFeed` (server, `await="db: activity"`)

Author note: every awaiting server node **must** sit inside a `kind="suspense"` ancestor or be `cache="static"`, or the component flags a `needs <Suspense>` error — so put the profile read inside its own `Suspense` node too. Add `<Phase>` captions: on `server-render`, "the shell and both feeds begin rendering; the awaiting feeds suspend"; on `shell`, "the shell + skeletons flush in the first chunk — the user sees layout instantly"; on `stream`, "each feed streams into its slot the moment its query resolves, in whatever order they finish." Do **not** wrap `RequestTrace` in `<Figure>` (it owns its card). Pedagogical goal: the student *watches* the shell-then-holes order rather than reading an assertion about it.

**Chunk-order drill — `Sequence`.** A short ordering exercise with a fixed code block above (the dashboard JSX with two boundaries) and steps to drag into order: (1) server sends the shell + both skeletons, (2) profile query resolves → its chunk patches in, (3) activity query resolves → its chunk patches in, (4) connection closes. Pedagogical goal: cement that the shell is always first and resolved boundaries arrive as independent later chunks. Keep it to ~4 steps.

`Term` candidates: **the shell** (the immediately-rendered, non-suspended outer UI), **chunk / flush** (a partial write to an open HTTP response, sent before the response is complete), **RSC payload** (the React-specific serialized stream the server writes — brief, named so the student recognizes it in devtools; full detail is Ch030's wire model).

### Streaming is the App Router default

The "no flag" section, kept short and decisive. A `page.tsx` returns a **stream, not a finished document**: wherever the renderer hits a suspended boundary it emits the fallback and keeps going. There is no opt-in export, no config switch — **the moment the student writes `<Suspense>` around an async child, that route streams.** A route with zero suspended boundaries still "streams" trivially: it just sends one chunk because nothing was held back.

State the corollary the student needs: streaming is a property of *how the response is written*, driven entirely by where the boundaries are. This is why L1's placement decision is load-bearing — boundary placement *is* the streaming plan.

**PPR — named, deferred (one paragraph).** Partial Prerendering (Ch032) extends streaming with a build-time static shell: the static parts ship from the CDN, the dynamic parts stream in over the same Suspense boundaries — same boundaries, the shell just comes from cache instead of a fresh render. Make clear this lesson covers the runtime mechanics of a single live request; the static-vs-dynamic rendering decision is Ch032's. One sentence and a pointer; do not teach it.

Keep code minimal here — a plain `Code` fence reusing the dashboard `page.tsx` skeleton showing the two `<Suspense>` boundaries, captioned "no export, no flag — these two boundaries are the entire streaming configuration."

### Two independent reads, two boundaries: fetching in parallel

The senior pattern and the lesson's central latency teaching. The rule: **each unit of UX owns its own data fetch *and* its own Suspense boundary.** When two boundaries each hold an async child that starts its own query in its body, both queries kick off as the server renders the tree, run concurrently, and each boundary streams the instant its own query resolves.

Then the trap, by contrast. The wrong shape is **one async parent that awaits its reads one after another**:

```tsx
const profile = await getProfile();   // 300ms
const activity = await getActivity(); // 800ms  — starts only after profile resolves
```

This costs `300 + 800 = 1100ms` even though neither read depends on the other — the second `await` doesn't start until the first settles. Tie back to the code conventions reflex named in L1's neighbourhood: run the dependency check before adding a second `await`; independent reads never go serial.

**Latency timeline — Gantt.** A Mermaid `gantt` (HTML+CSS bar grid fallback) inside `<Figure>`, with two task sections on a shared time axis:
- *Sequential awaits*: three stacked bars laid end to end (profile 0–300, activity 300–1100), TTFB marked at the very end (1100ms) — nothing reaches the user until the last `await` returns.
- *Parallel boundaries*: all bars start at 0 and overlap; the shell flushes near 0, each bar's right edge marks when *that* boundary streams in (profile ~300, activity ~800), TTFB marked at the shell flush (~near-zero).

Pedagogical goal: make "sequential = sum, parallel = max, and streaming pushes TTFB to the shell" a *picture*, not arithmetic the student has to do in their head. This is the shape Gantt was chosen for — parallel tasks on one time axis. Keep it horizontal, cap height per the vertical-space constraint; escape literal `;` in any Mermaid label text.

**Code contrast — `CodeVariants`** (`syncKey` optional), `maxLines` to keep both panes equal height:
- Variant "Sequential await (serialized)": one async page component with two back-to-back `await`s and a single render. `del`/highlight the second `await`. First sentence: **One component, two serial awaits — total latency is the *sum*, and nothing streams.**
- Variant "Two async children, two boundaries (parallel)": the page renders `<Suspense fallback={<ProfileSkeleton />}><Profile /></Suspense>` and `<Suspense fallback={<ActivitySkeleton />}><Activity /></Suspense>`, where `Profile` and `Activity` are async Server Components each awaiting their own read. First sentence: **Each child starts its own query and owns its own boundary — reads run concurrently, the shell ships now, each streams when ready.**

Mention `Promise.all` here in one line as the other parallel tool (full treatment next section) so the student doesn't think splitting into components is the *only* fix for serialization.

**Parallel routes — one-line tie-back.** Each `@slot` in a parallel route (Ch029 L5) is its own independent subtree and gets its own Suspense boundary, so a list-plus-detail surface streams the list and the detail in parallel; the Ch035 project leans on this. One sentence and a pointer; do not re-teach parallel routes.

`Term` candidate: **concurrent / in parallel** (reads in flight at the same time vs one-after-another — brief, the contrast the whole section turns on).

### When the data is consumed together: `Promise.all`

The data-side decision L1 forward-pointed to. Frame the fork by *how the data is consumed*, not by reflex:
- **Consumed together** — the UI cannot render until *all* the data is in (a summary card that aggregates across profile + chart + activity, a total that needs every row). Fetch with **`Promise.all` in one component, behind one boundary.** The reads still run concurrently (that's `Promise.all`'s job), the component awaits them as a group, and one fallback covers the combined unit.
- **Consumed adjacently** — each piece renders independently (the three dashboard widgets sitting side by side). **Parallel boundaries**, one per piece, so each reveals on its own.

The discriminator, stated cleanly: *do these reads feed one rendered thing, or several?* One thing → `Promise.all` + one boundary. Several things → several boundaries. Both are parallel; the difference is the reveal granularity, which follows the UX, exactly as L1's unit-of-UX rule predicts.

Code — a compact `Code` fence (reuse the conventions shape): an async component doing `const [profile, chart, activity] = await Promise.all([getProfile(), getChart(), getActivity()]);` then rendering one aggregated summary. Caption: "concurrent reads, one fallback — correct when the summary can't render until all three are in."

Watch-out in prose: `Promise.all` rejects if *any* read rejects — fine here because a partial summary is meaningless, but name `Promise.allSettled` in one clause as the tool when one failure shouldn't sink the rest (per the async conventions). Do not expand it.

**Decision drill — `StateMachineWalker` (`kind="decision"`).** Mirrors L1's placement walker but on the consumption axis.
- Root: "Does the UI need all of these reads before it can render anything meaningful?"
  - "Yes — it aggregates them into one view" → leaf: **`Promise.all` in one component, one Suspense boundary.** (One sentence: concurrent reads, single reveal.)
  - "No — each read feeds its own piece of UI" → leaf: **One async child + one Suspense boundary per piece.** (One sentence: each streams independently.)
Pedagogical goal: the student practises the *consumed-together-vs-adjacently* question, which is the actual senior decision; keep leaves to two sentences. (If a second walker on the page feels heavy next to L1's, this may downgrade to a two-option `MultipleChoice` — note the option for the writer.)

### What blocks the first byte

The subtle, high-value insight. Everything *above* every Suspense boundary runs to completion **before any chunk flushes** — the server can't send the shell until the shell itself has rendered. So a slow `await` in the root layout, or in the page body before the first boundary, is pure blank-screen time for the user, on *every* route under that layout.

State the senior reflex: keep above-boundary work cheap and synchronous-ish — the auth/session check, the layout chrome — and push every slow read *below* a boundary so it streams instead of blocking. A 50ms global query in the root layout is 50ms added to TTFB for every page; a 50ms query inside a Suspense-wrapped widget is invisible to TTFB.

Visual: reuse or reference the `RequestTrace` from the transport section — point out that the `server-render` phase is exactly the "before first byte" window, and any awaiting node placed *outside* a Suspense boundary would stall the shell flush (the component's own `needs <Suspense>` error state literally demonstrates this). A second tiny `Code` fence can show a layout doing a cheap `await requireUser()` (fine, fast, must gate the whole subtree) versus an illustrative slow `await getDashboardStats()` that belongs in a boundary instead. Frame with the conventions' `requireUser()` shape so it reads as real code.

Watch-out: this is *why* a layout is a dangerous place for data — its cost is paid by every child route. One line.

### Confirming it streamed: reading the network panel

The diagnostic, framed as a senior habit: don't *guess* what's in the first chunk from render order — *read it*. Open DevTools Network, select the document request, and watch the response arrive over time: the initial chunk carries the shell markup and the fallback HTML; subsequent chunks carry each boundary's resolved HTML and its swap script. The response's timing shows the connection held open across the boundary resolutions.

Give the concrete tells the student can look for: the document response shows a growing/streamed body rather than a single atomic payload; the "waiting" vs "content download" split is unusually long on the document because download spans the boundary settles. Note that the simplest sniff test is the question itself: *did the first chunk arrive while later chunks were still in flight?* If the whole body lands at once at the end, streaming didn't happen.

**The buffering caveat — the production gotcha.** The transport is ordinary HTTP/1.1 chunked transfer or HTTP/2 — no special infrastructure, and Vercel and Node servers stream out of the box. But **a reverse proxy (Nginx, Traefik, an ALB) or a CDN tier that buffers the entire response before forwarding it** silently collapses streaming back into one-shot delivery — the code is correct, the boundaries are right, and the user still waits for everything. Two common culprits, both worth naming concretely: a proxy buffering by default (the fix is proxy-side — e.g. Nginx `proxy_buffering off` / the `X-Accel-Buffering: no` response header), and **response compression buffering content before it flushes**. The diagnostic is the same sniff test as above: if the network panel shows a single large response landing at the end instead of incremental chunks, something in the path is buffering. Frame this as the first thing to check when "streaming works locally but not in production." Keep the fixes named, not taught (deployment/self-hosting config is out of scope) — the goal is that the student knows where to look, not that they configure Nginx here.

Visual (optional, low-effort): a `<Figure>` with a small HTML+CSS waterfall mock — one document row whose bar is segmented into "shell + skeletons" then later "activity hole" then "close" — to anchor what the student is looking for. Only include if it reads cleaner than prose; the `RequestTrace` may already carry this. Note the option for the writer rather than over-building.

`Term` candidate: **chunked transfer encoding** (the HTTP/1.1 mechanism for sending a response body in pieces without a known total length — brief, named so the network-panel reading makes sense).

### Streaming is HTTP, not a socket

A short boundary-of-responsibility section to kill a predictable conflation. Streaming the RSC payload is **HTTP response streaming** — one response written in chunks — *not* Server-Sent Events and *not* WebSockets. It flows server→browser once, for one render, and the connection closes when the page is done. It is not a live channel and cannot push updates after the page settles.

Name the real-time reach in one sentence and drop it: for live push (notifications, chat, presence) the SaaS answer is a dedicated channel — a hosted service (Pusher, Ably) or an SSE route handler — which is out of scope here. The student should leave able to say "page streaming and real-time push are different tools."

**Cancellation — named once.** When the user navigates away mid-stream, Next.js aborts the request, but in-flight server work (DB queries, `fetch` calls) does **not** auto-cancel — you either thread an `AbortSignal` through the read or accept the wasted work. Full cancellation surface (`connection()`, signal threading) is Ch032 L8; one sentence and a pointer per the async conventions.

### Diagnose what defeats streaming

The primary hands-on consolidation — a **`CodeReview`** exercise, because the durable skill this lesson teaches is *spotting* the anti-patterns in code that looks fine. Present a realistic dashboard `page.tsx` diff/file containing the two seeded defects:
1. A Server Component with two independent reads as back-to-back `await`s (serialized).
2. A single top-level `<Suspense>` wrapping the whole page (one-shot loading screen instead of progressive reveal).
Optionally a third: a slow `await` sitting in the layout above all boundaries (blocks the shell).

The student leaves inline comments identifying each problem and the fix. Grade each against a short `kernel` rubric phrase: e.g. *"sequential awaits serialize independent reads — Promise.all or split into separate Suspense-wrapped children"*; *"one top-level boundary defeats streaming — wrap only the slow parts so the shell ships first"*; *"slow await above the boundary blocks the first byte for every route — push it below a boundary."* Pedagogical goal: the student performs the senior diagnosis (read code, find the latency bug) rather than recognising it in a multiple-choice stem. Keep the file under ~25 lines so the review stays focused.

If `CodeReview` AI-grading feels too open-ended for the writer, the fallback is a `MultipleChoice` set posing the same code and asking "which change makes this stream?" — note the substitution.

### Recall check

Close with 2–3 `MultipleChoice` cards targeting this lesson's specific misconceptions (answers paraphrase, never quote prose):
1. What reaches the browser in the *first* chunk of a streamed page (the shell + fallbacks), with a distractor claiming "nothing until all data resolves" (the old model) and one claiming "the fully resolved page."
2. A page with three independent reads written as three serial `await`s is slow — which change fixes it (split into boundaries / `Promise.all`), with a distractor offering "add a config flag to enable streaming" (there is none) and one offering "wrap the whole page in one `<Suspense>`" (defeats it).
3. Streaming vs real-time: which is RSC page streaming (HTTP chunks, one render) vs which needs SSE/WebSockets (live push). 

Optionally a `TrueFalse` round folding in "you must enable streaming with an export" (false), "work in the root layout is free because it streams" (false), and "a buffering proxy can silently break streaming in production" (true).

### External resources (optional)

One or two `ExternalResource` cards: the Next.js docs on streaming / loading UI and the React `<Suspense>` streaming-on-the-server note. Optional `VideoCallout` only if a current, high-quality short explainer on App Router streaming exists — leave a placeholder note for the resourcer pass rather than guessing a URL; do not pad with a long video.

## Scope

**Prerequisites to redefine briefly (one line each, do not re-teach):**
- `<Suspense fallback>` is the declarative contract — fallback while any child suspends, children when all resolve (L1).
- The two suspending shapes: an async Server Component awaiting in its body, and a Client Component reading a server-created Promise with `use()` (L1, Ch030 L4).
- The unit-of-UX placement rule — draw the boundary around the smallest piece that loads as one concept (L1).
- Server Components are the App Router default and can `await` in the body; async request APIs (`await params/searchParams/cookies/headers`) (Ch030).

**This lesson does NOT cover (defer, with a one-line pointer where the student would expect it):**
- **The file conventions** — `loading.tsx` (Suspense at the route segment), `error.tsx`, `not-found.tsx`. L3. (This lesson is the hand-written `<Suspense>` whose transport `loading.tsx` inherits.)
- **`global-error.tsx`** — L4.
- **Error handling / Error Boundaries** — L3. Streaming a boundary that *throws* mid-stream is L3's territory; here boundaries only suspend.
- **Partial Prerendering, `cacheLife`, `cacheTag`, static-vs-dynamic rendering** — Ch032. Named once as the transport extension that adds a CDN shell; the rendering decision is Ch032's.
- **`connection()` and the dynamic-rendering opt-in** — Ch032 L8.
- **Cancellation in full** (`AbortSignal` threading from `connection()`) — Ch032 L8. Named once.
- **React `cache()` / request memoization** for deduping parallel queries — Ch032 L5. (Two children reading the same data make two requests here; the dedupe tool is deferred.)
- **Promise stability rules** for client-created Promises — Ch032 L5 (named in L1).
- **Parallel routes in full** — Ch029 L5. Referenced once as "each slot is its own boundary."
- **Real-time push (SSE, WebSockets)** at any depth — named once and dropped; a dedicated-channel concern.

## Notes for downstream agents

- The `RequestTrace` engine requires every awaiting `kind="server"` node to be inside a `kind="suspense"` ancestor (or `cache="static"`) — wrap the profile read in its own `Suspense` node, not just the activity feed, or the figure renders a `needs <Suspense>` error state. That error state is itself useful in the "what blocks the first byte" section as a demonstration.
- No `ReactCoding` exercise: the in-browser runtime has no server and cannot demonstrate real HTTP streaming, and L1 already owns the boundary-placement coding exercise. The durable L2 skill is *diagnosis* (`CodeReview`) and the *consumption decision* (walker), not syntax — keep the interactives on those.
- Keep all diagrams horizontal and under the ~800px height cap. In any Mermaid `gantt`, escape a literal `;` in label text as `#59;`.
- Reuse L1's domain and names (`InvoiceList`, `InvoiceSkeleton`, `listInvoices()`, the profile/activity dashboard) so the two lessons read as one continuous codebase.
- Code follows the conventions' async rules verbatim — this is one of the few lessons where `Promise.all` and the serial-vs-parallel `await` distinction *is* the lesson, so show production-shaped code (no teaching stand-ins needed here).

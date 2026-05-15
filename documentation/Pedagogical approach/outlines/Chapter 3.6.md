## Concept 1 — `fetch` resolves on 4xx and 5xx; `response.ok` is the branch

**Why it's hard.** Every student arrives with the muscle memory that "the request failed" means the promise rejected. `fetch` ships the opposite contract — a 500 resolves cleanly, a `try/catch` wrapping the call never fires, and the bug ships to production as a silent success. Until that mental model flips, every later reflex in the chapter (the `ok` branch, the `Result` mapping, the catch narrowing) lands on the wrong scaffold.

**Ideal teaching artifact.** A *prediction-first ambush*, then a controllable simulator. The student sees a four-line call inside `try { const r = await fetch(...) } catch { ... }` and is asked, before any prose, to pick which of four server responses (network drop, 404, 422 with Problem Details body, 500) lands in the `catch` block. Most students will mis-bucket the 404 and 500. The reveal is a live widget: a fake server with a dropdown for the response it will produce, a "Send" button, and three labeled lights — *promise resolved*, *promise rejected*, *ok branch entered*. The student toggles each scenario, watches which lights fire, and learns by surprise that only the network and abort cases reject. This is a Concept archetype with a misconception-first opening.

**Engagement.** A `Buckets` sort after the simulator — eight outcomes ("404 from API", "DNS failure", "CORS preflight rejected", "200 with malformed JSON", "abort by user", "request timeout", "422 with Problem Details", "504 gateway timeout") into two columns: *resolves (branch on `response.ok`)* and *rejects (lands in `catch`)*.

**Components.**
- New `FetchOutcomeSimulator` — dropdown picks the response scenario, "Send" fires the call, three indicator lights and a final-state badge show *resolved | rejected | ok-branch*. The student also sees the catch block firing (or not). One canonical block of code stays visible above the controls.
- `Buckets` for the follow-up sort.

---

## Concept 2 — The canonical five-seam call shape

**Why it's hard.** The lesson lists the seams as build → send → ok-branch → parse → catch, but the student has to internalize them as one indivisible reflex, not five things to remember. The failure mode is the student who writes `await fetch(url).then(r => r.json())` and ships it because nothing in their workflow ever made the missing seams visible. The seams need to read as a single shape that visibly *has parts*, with each part owning a class of failure.

**Ideal teaching artifact.** A *labeled anatomy* of a real `fetch` call, then a "spot the missing seam" drill. The anatomy is a single annotated code block with the five seams color-banded down the left margin and each band linked to the failure mode it owns ("parse seam — without me, you ship `unknown` as if it were `Invoice`"). After the anatomy, the student sees four real-looking `fetch` snippets pulled from production-shaped scenarios (a search-as-you-type call, a Stripe SDK underbelly, a Server Action POST) and has to identify which seam each one is missing and what bug ships as a result. Pattern archetype — the structural enforcement is making the seams visible enough that omission becomes diagnosable.

**Engagement.** `Tokens` over the canonical block: the student clicks each of the five seams in order, and the correct order is the assessment.

**Components.**
- `AnnotatedCode` for the labeled five-seam walkthrough — each step highlights one seam and names the failure mode it owns.
- `Tokens` for the click-the-seams recall.
- `CodeReview` for the spot-the-missing-seam drill across four production-shaped snippets — students leave a comment on each, AI grades against a kernel like "names the missing seam and the bug it ships".

---

## Concept 3 — Every outbound call carries a deadline; composing signals

**Why it's hard.** "Add a timeout" reads as a tactical fix the student does when something hangs in dev, not as a default reflex on every `fetch` call to a third party. And `AbortSignal.any` is unfamiliar machinery — the student has to grasp that *user-cancel*, *deadline*, and *request-shutdown* are three independent signals that need to compose into one, and that the catch narrows on `error.name` to tell them apart after the fact.

**Ideal teaching artifact.** A *side-by-side scrubbable timeline*. Two parallel `fetch` lifelines, one without a deadline and one with `AbortSignal.any([userController.signal, AbortSignal.timeout(5_000)])`. A scrubber advances time; at each tick the student fires events ("server slow", "user clicks cancel at 2s", "user clicks cancel at 7s") and watches what each lifeline does — the unprotected one hangs forever or returns stale, the protected one aborts with `TimeoutError` or `AbortError` depending on which fired first. The catch block on the right of each lifeline lights up with the narrowed `error.name`. Mechanics archetype with a controllable demo at its center.

**Engagement.** `PredictOutput` immediately after: three snippets, each composing signals differently (one with only `timeout`, one with only a user controller, one with `any` over both); the student predicts which `error.name` the catch sees for a given fire order.

**Components.**
- New `AbortSignalTimeline` — two parallel call lifelines, a time scrubber, fireable events on the left (server delay, user cancel, request shutdown), per-lifeline state readout on the right (`pending | resolved | aborted: TimeoutError | aborted: AbortError`). Composes the 2.7.4 surface forward.
- `PredictOutput` for the follow-up.

---

## Concept 4 — A response body is a one-shot stream; pick one consumer

**Why it's hard.** The student already knows `response.json()` and will reach for it on every body, then get bitten the day they need both raw text (for logging the 500 body) and parsed JSON, call `.json()` after `.text()`, and get a cryptic "body already used" error. The deeper model is that the body is a `ReadableStream` consumed exactly once — but that's also the bridge into the streaming lesson, so making it visible here is load-bearing for both lessons. Separately, the FormData-with-manual-Content-Type trap costs hours when it hits.

**Ideal teaching artifact.** A *wrong-by-default playground*. The student is dropped into a snippet that calls `.text()` for logging and then `.json()` for parsing — and the iframe shows the runtime error. They have to fix it by reading once into a variable and acting on the string. A second tab in the same widget runs a FormData POST with a hand-set `Content-Type: multipart/form-data` and shows the multipart boundary getting corrupted on the wire; the student has to delete the header to make the request work. Two small repairs, both Pattern archetype — the bug is the lesson.

**Engagement.** The widget is itself the assessment. Confirm recall with a one-question `MultipleChoice` afterward: "which content type does the browser set automatically when you pass `FormData` and you set nothing?" with three plausible distractors.

**Components.**
- `ReactCoding` (or `ScriptCoding` if no React is needed) for the two repair exercises — body-already-used and FormData boundary corruption — both shipping wrong-by-default with tests that pass once the repair is correct.
- `MultipleChoice` confirmation.

---

## Concept 5 — Chunks are network frames, not application messages

**Why it's hard.** The student's instinct on `for await (const chunk of response.body)` is to treat each chunk as a complete unit of work. Two failure modes ambush them. First, `TextDecoder` without `{ stream: true }` corrupts emoji and accented characters that straddle a chunk edge, and the bug only shows up on multi-byte input the dev never tested. Second, an SSE event can span two chunks or two events can land in one — splitting per chunk on `\n\n` loses events. The chunk-vs-message reframing is the load-bearing mental flip.

**Ideal teaching artifact.** A *chunk-feeder visualizer*. The student sees a synthetic stream emitting bytes labeled with their logical content (e.g. `data: {"x":1}\n\n` plus a stray emoji byte sequence pre-split into ugly chunk boundaries — `["data: {\"x", "\":1}\n", "\nda", ...]`). A "decode naively" toggle shows the resulting corrupted output (mojibake, dropped events); flipping to "decode with `stream: true` and an accumulator" shows clean output. The student can also drag chunk boundaries with their mouse to see that the *same* logical payload produces different outputs depending on framing — the model the visualizer installs is *chunks are arbitrary; messages are framed*. Concept archetype.

**Engagement.** `Sequence` drill: drag the four steps of the reframing loop (`accumulate`, `split on \n\n`, `keep the tail`, `parse the rest`) into order.

**Components.**
- New `ChunkFramingVisualizer` — pre-split byte stream on the left (chunks draggable to reshuffle boundaries), two decode modes (naive vs. `stream: true` + accumulator), output panel on the right showing the resulting messages or mojibake. Forward-links into AI-SDK streaming in Unit 23 and Suspense/RSC streaming in Chapter 5.3.
- `Sequence` for the reframing-loop ordering drill.

---

## Concept 6 — The SSE wire format and the three load-bearing headers

**Why it's hard.** SSE looks ridiculously simple — `data: {...}\n\n` per event — until production. Then a CDN buffers the stream into one blob, the client gets a 12-second-late wall of text, and the dev can't figure out why local works and prod doesn't. The three headers (`Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`) carry the contract; missing `no-transform` is the canonical production failure. The student has to see the wire format and see what each header buys.

**Ideal teaching artifact.** A *real-artifact replica* of the wire. The student sees an SSE response as raw bytes on the right (the actual `data:` / `event:` / `id:` lines with `\n\n` separators rendered visibly), a server emitter on the left writing one event at a time, and a client `EventSource` middle column dispatching parsed events as they arrive. The student can toggle each of the three response headers on or off; flipping `no-transform` off triggers a "CDN buffer" mode that holds all events until the connection closes, then dumps them — the failure mode they'll otherwise only see in prod becomes reproducible at the desk. Concept + Mechanics fused; the wire is the lesson.

**Engagement.** A `Buckets` drill on header roles: each of the three headers into its purpose ("opt into the protocol", "stop middle boxes from buffering", "keep HTTP/1.1 connection alive"), plus a decoy ("auto-reconnect with `Last-Event-ID`") that belongs to the client side.

**Components.**
- New `SSEWireInspector` — three columns (server emitter, raw wire bytes with `\n\n` boundaries highlighted, client `EventSource` event log), header toggles above the wire panel that simulate each missing header's failure mode (most importantly `no-transform` off → CDN buffering). Forward-links into Chapter 7.5 (route handlers), Chapter 5.3 (Suspense streaming wire), and Unit 23 (AI SDK stream protocol).
- `Buckets` for the header-role sort.

---

## Concept 7 — `EventSource` ceiling and when `fetch` over the stream earns its weight

**Why it's hard.** The student grabs `EventSource` because it auto-reconnects and the API is two lines. Then the first auth-bearing requirement (an `Authorization` header, a CSRF token, a non-`GET` opener) silently fails and the student doesn't know that `EventSource` literally can't carry those — they assume it's their CORS config or their token. The decision needs to land before they hit it.

**Ideal teaching artifact.** A *capability matrix as a decision card*. A small table with four rows (set custom request headers, send a request body, use a non-`GET` method, auto-reconnect with `Last-Event-ID`) and two columns (`EventSource`, `fetch` consumer). Three of the four rows split the column — only the auto-reconnect row falls on the `EventSource` side without compensation. Underneath the matrix, two minimal annotated snippets stand side-by-side: the `EventSource` version (six lines), the `fetch` consumer version (about twenty lines, calling out where the manual reconnect logic would go). Decision archetype, with the matrix as the trigger and the snippets as what the trigger flips you to.

**Engagement.** Three short scenario prompts as `MultipleChoice`: ("the endpoint needs a bearer token", "the channel is cookie-authenticated and same-origin", "the client needs to POST a body to open the stream") with the right primitive as the answer.

**Components.**
- `Figure` wrapping a hand-authored matrix SVG (capabilities × the two primitives, with check/cross marks) plus a side-by-side annotated code pairing below — `EventSource` minimal vs. `fetch` consumer minimal. Single-use in this chapter; no forward-link warrants a bespoke component.
- `MultipleChoice` triplet for the scenario assessment.
- Alternative: a bespoke `CapabilityMatrix` component (rows × columns of capabilities × primitives), but this pattern recurs nowhere else identified in the chapter — keep it in a `Figure` for v1.

---

## Concept 8 — The polling / SSE / WebSocket decision tree, trigger-before-tool

**Why it's hard.** "Real-time" reads as one tool decision to the student — pick the fanciest transport that fits. The senior posture inverts it: polling is the default, SSE is the conditional past polling on staleness or load, WebSockets are the conditional past SSE on bidirectionality. Naming the *trigger* that flips each step (not the tool that wins) is what the student has to absorb, and it directly contradicts the instinct to reach for WebSockets first.

**Ideal teaching artifact.** A *guided puzzle*. The student gets six SaaS feature briefs (CSV export progress bar, notifications panel, collaborative cursors, build-progress feed, LLM token stream, order-status update on the customer dashboard) and a worked decision tree they have to walk for each — first question "what's the staleness budget vs. server fanout cost?", second "is this server-to-client only?", third "does message framing or auth need anything HTTP can't carry?". For each feature the student picks a transport and reads back the trigger they relied on. The puzzle is the assessment; the prose around it names the tree explicitly. Decision archetype with the trigger language load-bearing.

**Engagement.** The puzzle is itself the assessment. A `TrueFalse` round afterward confirms recall on the trigger statements ("if the channel is server-to-client only and the payload is JSON, SSE is the default" / "WebSockets are the right default for an LLM token stream" / "polling stops earning its weight when the polling fan-out becomes a load problem").

**Components.**
- New `DecisionTreeWalker` — feature brief on the left, decision tree on the right with collapsible branches and per-node trigger labels; the student picks a branch at each node, the widget records the picked transport and the trigger that justified it, then reveals the senior answer with reasoning. Recurs in spirit across every "trigger before tool" decision in the course (CSS Grid vs. Flex, React Query vs. local state, queue vs. inline), so the component is multi-use if generalized.
- `TrueFalse` for the trigger-statement confirmation.
- Alternative if the bespoke component is too heavy for v1: an `ArrowDiagram`-rendered tree inside `Figure` plus a `Matching` exercise pairing each feature brief to its transport — covers the assessment but loses the per-branch trigger surfacing.

---

## Component proposals

- **`FetchOutcomeSimulator`** — server-response dropdown, "Send" button, three indicator lights (`resolved`, `rejected`, `ok-branch entered`), final-state badge, the canonical call code block above.
  - Uses in this chapter: Concept 1.
  - Forward-links: none identified — `fetch` resolution semantics are installed once. Single-use, kept because the misconception is uniquely load-bearing and prose alone won't dislodge it.
  - Leanest v1: drop the lights, render plain text labels for the three outcomes; keep the dropdown, the button, and the visible catch block firing or not. The widget still teaches the model.

- **`AbortSignalTimeline`** — two parallel call lifelines, a time scrubber, fireable events (server delay, user cancel, shutdown), per-lifeline state readout including narrowed `error.name`.
  - Uses in this chapter: Concept 3.
  - Forward-links: 2.7.4 already installed the surface, but the *visual* extends to Server Action cancellation (Chapter 7), React Query mutation cancellation (Chapter 16), and any future cancellation site. Likely reusable when the same model needs to land in a new context.
  - Leanest v1: a single lifeline with the user-cancel and timeout signals fixed in advance; the scrubber sets only when the server would respond. Loses the side-by-side comparison but still shows which signal won.

- **`ChunkFramingVisualizer`** — pre-split byte chunks (draggable boundaries), naive-vs-streamed decoder toggle, output panel showing messages or mojibake.
  - Uses in this chapter: Concept 5.
  - Forward-links: Chapter 5.3 (Suspense streaming wire), Unit 23 (AI SDK stream framing). The chunks-vs-messages model is the same model the AI SDK lesson needs.
  - Leanest v1: fixed chunk boundaries (no drag), the two decode modes, one canonical input. The boundary-drag is the showpiece but the static comparison still teaches.

- **`SSEWireInspector`** — server emitter, raw wire bytes panel with `\n\n` highlighting, client `EventSource` event log; toggles for each of the three load-bearing headers, with `no-transform` off triggering simulated CDN buffering.
  - Uses in this chapter: Concept 6.
  - Forward-links: Chapter 7.5 (route-handler streaming), Chapter 5.3 (Suspense streaming uses the same wire shape underneath), Unit 23 (AI SDK protocol). The artifact compounds across three later sites.
  - Leanest v1: drop the header toggles except `no-transform`; keep the three-column wire view and the one toggle that flips on the canonical production failure. The other two headers can be named in adjacent prose.

- **`DecisionTreeWalker`** — feature brief + walkable decision tree with per-node trigger labels; records the picked branch and replays the senior justification.
  - Uses in this chapter: Concept 8.
  - Forward-links: every "trigger before tool" decision in the course is a candidate (Flex vs. Grid, React Query vs. local state, queue vs. inline work, cache strategy). If generalized, this is one of the highest-reuse components on this list.
  - Leanest v1: a single tree with the three live-channel triggers, no replay system; the student picks a branch, the leaf reveals the transport plus a one-line trigger restatement. No per-feature recording.

## Build priority

`SSEWireInspector` first — three forward-links (Chapter 5.3, Chapter 7.5, Unit 23) and the single canonical failure mode (CDN buffering) is otherwise unteachable without a real deploy. `DecisionTreeWalker` second — if generalized, it's the most reusable widget on the list and the course has many trigger-before-tool decisions ahead of it. `ChunkFramingVisualizer` third — two forward-links into streaming chapters, and the chunks-vs-messages reframing is the kind of model prose chronically fails to land. The remaining two (`FetchOutcomeSimulator`, `AbortSignalTimeline`) are concept-critical here but single- or low-reuse; build them at v1 scope.

## Open pedagogical questions

- `SSEWireInspector`'s simulated CDN buffering is a faked failure mode (the widget can't actually route through a real CDN). Worth deciding whether the simulation is honest enough to land, or whether a captured DevTools recording of the real failure ships alongside it.
- `DecisionTreeWalker` is proposed as a generalizable component; the call between building it generalized now (with this chapter as the first user) versus shipping the chapter-specific tree first and generalizing on the second use is a real product decision.

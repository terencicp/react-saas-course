## Concept 1 — The route handler is the trust boundary

**Why it's hard.** Students treat the route handler as a regular controller — parse input, validate fields, run business logic. A public webhook endpoint is the opposite shape: every assumption about provenance has to be re-earned at the door, and the order of operations (verify, then parse, then log) is itself the security property. The misconception is procedural ("I'll add a check"); the correct mental model is structural ("nothing past line N runs on un-verified bytes").

**Ideal teaching artifact.** A *threat-walkthrough* archetype. Open with the bare endpoint visible on the public internet — a flat code block of `export async function POST(request) { const event = await request.json(); await applyEntitlement(event); return Response.json({ok: true}); }` — and then ambush it: a side-pane "attacker terminal" curls the endpoint with a hand-crafted `checkout.session.completed` JSON and the student watches a fake entitlement land in the database. Only after the attack hits does the lesson rewind and add the verify-first skeleton, replaying the same curl to show the 400. The point is to make the student feel the trust gap before naming it — misconception-first ambush with a delayed reveal.

**Engagement.** A four-step `Sequence` exercise: the student orders the operations inside the handler (read raw body, read signature header, verify, parse JSON, dispatch). Any order that puts `parse` or `log` before `verify` fails — the failure card names the specific bug it produces (body-stream consumed, attacker strings in logs).

**Components.**
- `CodeVariants` to show the naive-vs-hardened handler side by side as the rewind.
- `Sequence` for the operation-ordering recall.
- New component **`WebhookAttackReplay`** — a two-pane figure (left: handler source; right: a scripted "curl session" with a fixed forged payload and a result strip showing what hit the DB). The student presses a single "Send" button. Two presets only: `naive` and `verified`. Demoted to alternative if single-use; see below.
- Alternative: hand-SVG inside `Figure` showing the request crossing the trust boundary with a strikethrough on body/log access points to the left of "verify" — single-use cost is lower.

**Project link.** Lands directly in 12.3.3, where the student writes the verify-first skeleton for the project's Stripe route handler.

## Concept 2 — Raw bytes are sacred

**Why it's hard.** This concept is invisible until it bites: `request.json()` looks identical to `request.text()` in intent, and re-stringifying the parsed object back to a string "should" yield the same HMAC input. It doesn't, and the failure mode is "works locally, fails in production after a framework update" — the worst kind of bug to debug from a 400 alone.

**Ideal teaching artifact.** A *byte-diff demonstration* archetype. Show the same JSON payload three ways: as it arrived on the wire, as it looks after `JSON.parse` → `JSON.stringify`, and as it looks after the framework's hidden re-serialization. Beside each, show the HMAC digest computed over those exact bytes. The first matches Stripe's `v1` value; the other two don't, by a few bytes (whitespace, key order). The student sees the digest change in real time as they toggle which body the verifier uses.

**Engagement.** A `PredictOutput` round: given three pre-rendered byte strings (raw, parsed-then-stringified, framework-massaged), the student predicts which HMAC matches Stripe's `v1` digest before the reveal. Then a single-line `Tokens` click on the verified handler — click the call that reads the body correctly (`request.text()`), with `request.json()` as the clickable decoy.

**Components.**
- New component **`HmacByteDiff`** — three input strings, a fixed secret, and three computed HMAC digests rendered next to each input with a highlight when the digest matches Stripe's target. Inputs are author-provided; no student edit needed for v1.
- `PredictOutput` for the digest-match prediction.
- `Tokens` for the body-read recall.

**Project link.** Reinforced in 12.3.3 — the project's `claimEvent` helper depends on the raw-body discipline being airtight.

## Concept 3 — HMAC signature mechanics

**Why it's hard.** Students have seen HMAC in Chapter 3.7.1 as primitives. They have not seen the *applied shape* — that Stripe's signature is a structured header (`t=...,v1=...`), that the signed payload is the *literal string* `${t}.${rawBody}` and not the JSON, that constant-time comparison and timestamp tolerance are not optional polish but structural defenses against distinct attacks (timing leak, replay).

**Ideal teaching artifact.** A two-beat *visualizer + simulator* archetype. Beat one: a labeled anatomy diagram of the `stripe-signature` header parsed into its components, with arrows showing which piece feeds which step (timestamp → tolerance check; v1 → comparison target; secret → HMAC key). Beat two: a small simulator with three sliders or toggles — *clock skew* (how far off the timestamp is from now), *tolerance window* (300s default), and *comparison mode* (constant-time vs naive `===` with a faux "leaked bits" readout that grows as more bytes match). The student plays both attacks: push skew past tolerance and watch verification fail; flip to naive compare and watch the leak-meter climb byte-by-byte.

**Engagement.** A `MultipleChoice` round: given a header `t=1715800000,v1=abc...`, the student picks which string was HMACed (the body alone, `t.body`, `body.t`, or the parsed event). Then a follow-up scenario: the request arrived at `now() + 400s` — what does the handler do, and what error does it return? Multi-select to surface both "reject" and "400 with problem+json."

**Components.**
- New component **`SignatureAnatomy`** — a hand-SVG composed inside `Figure`, labeled header with arrows. Single visual, single-use risk — see below.
- New component **`HmacVerifySim`** — controls for `clockSkew`, `toleranceWindow`, `compareMode`; live readout of pass/fail and (in `naive` mode) a byte-by-byte timing trace.
- `MultipleChoice` for the recall.
- Alternative if `HmacVerifySim` is too heavy for one use: collapse beat two into two `CodeVariants` tabs (constant-time vs naive) with prose calling out the leak, and demote the simulator.

**Project link.** Indirectly — the project uses `stripe.webhooks.constructEvent` and never hand-rolls; the simulator exists so the student trusts what's inside the SDK call.

## Concept 4 — At-least-once is the contract

**Why it's hard.** "Exactly once" is the implicit mental model every developer arrives with. Webhooks are at-least-once by *design* — retries on any non-2xx, retries on timeout, retries on the sender's own bugs. Students need to feel that duplicates aren't an exception path; they're the steady state. Until that flips, every later mechanic (dedup ledger, transaction wrap) reads as defensive over-engineering.

**Ideal teaching artifact.** A *timing-diagram scrollytell* archetype. A single Mermaid sequence diagram, sliced into four states the student advances through: (1) Stripe sends event, handler 200s, all is well; (2) Stripe sends event, handler 200s but the response is lost on the wire — Stripe retries; (3) handler is slow, exceeds 30s — Stripe times out and retries while the first call is still running; (4) handler crashes mid-work — Stripe retries from scratch. Each panel shows the same `event.id` arriving multiple times. The takeaway lands before any code: the handler will see duplicates, on purpose.

**Engagement.** A `TrueFalse` round with four statements: "duplicate webhooks are a sender bug," "duplicates only happen on errors," "a 200 from the handler guarantees Stripe stops retrying," "two retries can be in flight at the same time." Three are false; the count-them-up motion is the assessment.

**Components.**
- `DiagramSequence` wrapping four sub-diagrams (Mermaid or hand-SVG); the student scrubs through retry scenarios.
- `TrueFalse` for recall.

**Project link.** Sets up 12.3.7's "rehearse every failure mode" — replay is one of the deterministic probes.

## Concept 5 — Atomic claim closes the race

**Why it's hard.** The seductive shape is `if (await select(eventId)) return; await insert(eventId); await applyWork()`. It reads correct. It is broken under concurrency in a way the student cannot reproduce with single-threaded testing — the race window is microseconds wide and only manifests when two retries land on different workers. The fix (`INSERT ... ON CONFLICT DO NOTHING RETURNING`) looks like a SQL trick if the race isn't first made viscerally real.

**Ideal teaching artifact.** A *guided puzzle* archetype carrying its own assessment. The student is shown the broken `select-then-insert` shape and a control to "release N concurrent retries." With N=1 the handler works. With N=5 the dashboard shows multiple business-work executions and a duplicated entitlement. The student is then handed the same scenario with a single line missing — an empty SQL slot where the atomic INSERT should go — and asked to fill it in. The puzzle re-runs N=5 against their answer; correct fills produce one win, four no-ops, one entitlement. The artifact carries the assessment because the fill-in *is* the test.

**Engagement.** The puzzle is the recall. After it, one `Buckets` follow-up to confirm the structural rule landed: sort five SQL statements into "race-safe" vs "racy" buckets (select-then-insert; INSERT ON CONFLICT; UPDATE without WHERE predicate; INSERT with unique constraint; INSERT inside an advisory lock).

**Components.**
- `SQLCoding` for the fill-in puzzle, seeded with `processed_events` and a `select count(*)` style criterion against the post-run state.
- New component **`ConcurrencyHarness`** — a wrapper that fires N parallel invocations of the student's SQL/handler against the same input and shows the resulting row count + duplicate-work tally. Reusable for any concurrency lesson going forward.
- `Buckets` for the follow-up sort.
- Alternative if `ConcurrencyHarness` is too costly: a static `CodeVariants` showing the racy and atomic shapes side by side, with prose describing the failure rate — loses the felt-experience of the bug.

**Project link.** This is literally what 12.3.4's `claimEvent` helper does — the puzzle is a dry run of the project step.

## Concept 6 — Receipt and consequence commit together

**Why it's hard.** Even after the atomic claim lands, students separate the claim from the work — claim first, then do the business logic. The bug is subtle: claim commits, business work fails, the retry sees "already claimed" and skips, the data is permanently wrong. The fix is a transaction wrap, which the student has seen mechanically in Chapter 6.4.4 but not as a *commit-boundary argument*.

**Ideal teaching artifact.** A *failure-injection sandbox* archetype. Show the handler with the claim and the business work in separate transactions. The student presses "crash after claim" and watches the database state: dedup row present, entitlement unchanged, retry returns 200 without doing anything. Then wrap both in `db.transaction`, press "crash after claim" again — both roll back, retry re-claims and re-processes cleanly. Same crash, different commit topology, opposite outcome.

**Engagement.** A `PredictOutput`-style prediction: given a handler shape (claim outside, work inside / both inside / both outside) and a crash point (before claim, after claim, after work), predict the final DB state. Three handler shapes × three crash points = nine scenarios; the student gets three random ones.

**Components.**
- New component **`TxBoundarySim`** — two panels: handler code (toggle the transaction wrap on/off) and a DB-state ribbon (rows visible after the run). A "crash at line X" control runs the handler with an injected failure at the chosen line. Reusable for any transaction lesson — strong forward-link to Chapter 13 (job idempotency) and Chapter 14 (notification dispatch).
- `PredictOutput` for the recall.
- Alternative: hand-SVG `Figure` with two timelines (with-wrap, without-wrap) and crash markers — loses the play-with-it loop but is single-figure-cheap.

**Project link.** Directly enforces the 12.3.4 step where the project's claim and dispatch both live inside `db.transaction`.

## Concept 7 — Status codes are control signals

**Why it's hard.** Students treat HTTP status codes as documentation. For webhooks they are imperative: 5xx means "retry me," 4xx means "stop sending this," 2xx means "we're done." Returning a 4xx on duplicate ("nothing to do") tells Stripe to stop retrying — fine. Returning a 5xx on duplicate tells Stripe to retry forever — a self-inflicted incident. The misconception is "the code that fits how I feel about this event"; the correct framing is "the code that produces the retry behavior I want from the sender."

**Ideal teaching artifact.** A short *decision-table* archetype rendered as a single matrix: rows are handler dispositions (verified-and-processed, duplicate-event, signature-failed, DB-down, code-crash); columns are "what we want Stripe to do" (stop, retry, never-send-again) and "the status code that triggers that." Filled in cells, with one obviously-wrong-on-purpose cell flipped — the student spots it.

**Engagement.** A `Matching` exercise pairing each disposition to its status code. Five rows; one decoy code (401) included to surface the "auth vs signature" misconception.

**Components.**
- `Figure` wrapping a hand-authored HTML table for the decision matrix.
- `Matching` for the recall.

**Project link.** Lands in 12.3.7's failure-mode rehearsal — each "Done when" probe asserts a specific status code.

## Concept 8 — Newer wins is structural

**Why it's hard.** Out-of-order delivery is the second misconception layer on top of duplicates. Even after the dedup lesson, students reach for "if (event.created > row.lastEventAt) update" in application code — which has exactly the same race window as the broken `select-then-insert`. The structural fix is to push the ordering predicate into the UPDATE's WHERE clause so the database evaluates it under row lock. The teaching has to make the *parallel* to dedup explicit, not just teach a second SQL trick.

**Ideal teaching artifact.** A *side-by-side time-travel* archetype. Two animated timelines, scrubbable in lockstep: top is "events emitted by Stripe in order" (active at T+0, past_due at T+5); bottom is "events arriving at the handler" with delivery delays drawn as bent arrows so past_due lands first. The student scrubs through arrival order. With the naive handler (no predicate), final row state is `active` — wrong. Toggle the predicate on, scrub again — final row state is `past_due`, correct, and the second arriving (now-stale) `active` event produces UPDATE-RETURNING zero rows. The artifact shows the same arrival sequence twice; only the WHERE clause differs.

**Engagement.** A `DrizzleCoding` exercise: write the UPDATE statement that applies a new subscription status with the `last_event_at` predicate. The criterion is "apply two events in reverse delivery order; final row matches the event with the later `created`." The student's query is tested against both orderings.

**Components.**
- New component **`EventOrderingTimeline`** — two parallel scrubbable timelines (emitted vs received) with a configurable delivery-delay function; below, a final row-state readout. Forward-link to Chapter 14 (notification dedup window) where ordering matters again.
- `DrizzleCoding` for the recall.
- Alternative if `EventOrderingTimeline` is too custom: a `DiagramSequence` of four static Mermaid frames showing in-order vs reordered arrival with both handler outcomes — single-use safe, loses the scrub feel.

**Project link.** Directly drives 12.3.5's handler implementation — the project's three subscription handlers share the same predicate.

## Concept 9 — Single writer, read-and-poll

**Why it's hard.** Two distinct concepts collapse into one decision here. First: the redirect-versus-webhook race is real (Stripe redirects faster than its own webhook usually lands). Second: the "fix" the student wants to reach for — let the success page write the entitlement — creates two writers and reintroduces the race as a write-write conflict. The correct fix is counter-intuitive because it accepts user-visible latency in exchange for correctness.

**Ideal teaching artifact.** A *wrong-by-default sandbox* archetype paired with a small race-visualization. The student is dropped into a success-page mock with the broken pattern wired up: the page reads `plan_entitlements` and renders "you're on the free plan." A control fires "redirect now" and "webhook arrives in T ms," with T as a slider from 0 to 5000ms. At low T the page works (webhook beats the read); at high T it shows the wrong plan. The student is told to fix it. Two repair paths are offered as branching code stubs: "make the success page write" (which compiles but breaks under a second control that fires concurrent redirects) and "add a poller via `router.refresh()`" (which works at every T). The artifact carries the assessment because finishing the poller path *is* passing the bar.

**Engagement.** The sandbox completion is the recall. Follow-up: a one-question `MultipleChoice` confirming the principle — "Why doesn't the success page write the entitlement?" with the correct answer phrased as "single writer for state."

**Components.**
- New component **`RedirectRaceSandbox`** — a mock success page, a webhook-delay slider, a concurrency toggle, two repair stubs the student can edit (or a guided two-step Steps wrapper around `ReactCoding`).
- `MultipleChoice` for the follow-up.
- Alternative: `ReactCoding` with a fixed scenario harness (no slider), criterion = "final rendered plan matches the entitlement after webhook lands." Loses the slider's "watch the race shrink" intuition but is built from existing parts.

**Project link.** Directly implements 12.3.6's success-page polling — the project ships the exact pattern.

## Concept 10 — One pattern, four surfaces

**Why it's hard.** This is the chapter's promotion moment — webhooks dedup, Server Actions need idempotency, retried jobs need it, public API endpoints need it. Students see four separate problems. The senior sees one discipline (unique-on-key constraint + atomic insert) with four key sources (`event.id`, form UUID, `runId`, `Idempotency-Key` header). The teaching risk is that listing four surfaces feels like a survey — exactly the cut the course rejects.

**Ideal teaching artifact.** A *unifying four-column comparison* archetype. A single figure, four columns (webhook / action / job / public API), four rows (key source, where the key originates, where the constraint lives, what replay triggers). The cells are populated by clicking through — first the webhook column lights up (already taught), then each subsequent column reveals one cell at a time, each cell echoing the structurally-identical row above. The reveal sequence is the pedagogy: nothing new appears, only the *same shape* in new clothes.

**Engagement.** A `Buckets` two-column drop: a mixed list of items (a form UUID, `event.id`, `runId`, the `Idempotency-Key` header, a server-generated UUID, a database autoincrement ID) into "valid idempotency key" vs "broken as an idempotency key." The decoys (server-generated UUID, DB autoincrement) surface the "key must be stable at the attempt" misconception.

**Components.**
- `TabbedContent` with one tab per surface, each containing the same row template (key source / origin / constraint / replay) — the visual rhyme does the teaching.
- New component **`PatternMatrix`** — a 4×4 cell grid with progressive reveal, the cells annotated. Stronger pedagogy than tabs because all four surfaces sit visible at once.
- `Buckets` for the recall.
- Alternative: hand-SVG `Figure` of the matrix, fully revealed, with prose walking row by row — cheaper, loses the "look, the same shape again" reveal cadence.

**Project link.** Indirectly — the project applies idempotency to webhook events only, but the pattern is named so 13.1 (job runs) and any future public-API chapter can call back.

## Concept 11 — Cache the response, not the state

**Why it's hard.** Idempotency-Key on public route handlers is a different beast from webhook dedup. The handler doesn't just skip the work; it returns the *exact same response* (status, body, headers) as the original call, byte-for-byte, even if the underlying state has since changed. Students conflate the two: "I'll just look up whether the row exists." The contract is stricter — the client trusts that two calls with the same key return identical responses, full stop.

**Ideal teaching artifact.** A small *contract demonstration* archetype. A two-panel mock: left, an external client sends `POST /api/invoices` with `Idempotency-Key: abc`, body `{amount: 10000}`. The server creates an invoice, returns `201 {id: "inv_1", amount: 10000}`. Now, between calls, the invoice gets updated in the database (amount changes to 9500). The same client retries with the same key. The server returns... and the student is asked to predict. Reveal: `201 {id: "inv_1", amount: 10000}` — the cached response, not the current state. Then a second scenario: the same key with a *different* body. Reveal: 422, because the key was reused for a different payload (some implementations choose 409; the lesson picks one and pins it).

**Engagement.** A `PredictOutput` two-round: predict the response on retry-after-update, and predict the response on key-reused-with-different-body. Both reveals follow predictions.

**Components.**
- New component **`IdempotencyCacheTrace`** — a request/response panel with a "fire next call" button, a hidden state column, and a cache column. Single-use within this chapter; forward-link to a public-API chapter if/when one ships.
- `PredictOutput` for the recall.
- Alternative (preferred given single-use risk): a hand-SVG `Figure` showing a two-row request/response trace with state changes between rows annotated, plus an `Aside` calling out the contract. Demoted from primary unless a forward-link surfaces.

**Project link.** None — the project handles webhook dedup only.

## Concept 12 — Portability is the proof

**Why it's hard.** The fifth lesson re-implements the same pattern for Resend with a different SDK. The risk is that it reads like a repeat lesson — same code with `svix` swapped for `stripe`. The pedagogical job is the opposite: the diff *is* the lesson. Show how little changes, and the pattern's claim to be portable becomes earned, not asserted. Layered on top: the `bypassSuppression` carve-out introduces a named, documented exception — the only one in the discipline — and students need to feel why exceptions get capitalized rather than added casually.

**Ideal teaching artifact.** A *diff-as-lesson* archetype. Put the Stripe handler and the Resend handler side by side, full source, with the matching regions visually dimmed and only the diff regions (provider string, verification SDK call, event-type switch, business work) at full opacity. The student sees the shape is identical; what changes is named and small. Then a second beat: a `bypassSuppression` decision tree — three call-site scenarios (password reset, marketing campaign, order receipt) and the student decides where the bypass is justified. The carve-out earns its name by being applied surgically; misapply it and the deliverability discipline collapses.

**Engagement.** A `CodeReview` exercise on a diff that adds `bypassSuppression: true` to a marketing email send — the student leaves an inline comment naming the failure mode (deliverability bomb, suppression-discipline bypass). Then a quick `TrueFalse` round on bounces vs complaints: complaints are always permanent, soft bounces are not, suppression check at send time is non-negotiable.

**Components.**
- `CodeVariants` with the Stripe and Resend handlers as two tabs, plus prose calling out the diff regions (or `AnnotatedCode` for stepwise diff narration if the diff is long).
- New component **`HandlerDiffViewer`** — two source panes with a shared dim/highlight overlay driven by line-pair mappings. Single-use risk — see below.
- `CodeReview` for the bypass-misuse recall; `TrueFalse` for bounce-vs-complaint.
- Alternative (preferred): `AnnotatedCode` walking the Resend handler with annotations like "same as Stripe — provider string only," "same as Stripe — claim shape unchanged" — leverages an existing component, single-use safe.

**Project link.** Foreshadows the portability claim; the project ships Stripe only, but the second instance proves the discipline.

## Component proposals

- **`WebhookAttackReplay`**
  - Two-pane figure: handler source + scripted curl session against it with a forged payload; shows DB state delta after the send.
  - Uses in this chapter: Concept 1.
  - Forward-links: None — single-use. Demoted to alternative; hand-SVG `Figure` of the trust boundary is primary.
  - Leanest v1: a static `Figure` with two pre-rendered screenshots (naive handler — entitlement written; verified handler — 400) and a one-line caption. Skip the live curl entirely; the contrast alone teaches the boundary.

- **`HmacByteDiff`**
  - Three input byte strings, fixed secret, three computed HMAC digests rendered side-by-side with a match highlight against a target.
  - Uses in this chapter: Concept 2.
  - Forward-links: any future cryptography or content-integrity lesson (signed cookies in auth, JWT verification if it ever earns scope). Plausible.
  - Leanest v1: pre-computed digest strings rendered as a static `Figure` with three rows. The student does not compute; they read. Loses interactivity, keeps the byte-level insight.

- **`SignatureAnatomy`**
  - Hand-SVG labeled diagram of the `stripe-signature` header parsed into `t`, `v1`, with arrows to verification steps.
  - Uses in this chapter: Concept 3.
  - Forward-links: any signed-header explainer (Svix headers in 12.1.5 share the shape). Plausible.
  - Leanest v1: a single hand-authored SVG inside `Figure` — this is already the lean shape, build it as drawn.

- **`HmacVerifySim`**
  - Sliders for `clockSkew` and `toleranceWindow`; toggle for `compareMode` (constant-time vs naive); live pass/fail + a byte-by-byte leak trace in naive mode.
  - Uses in this chapter: Concept 3.
  - Forward-links: a possible auth lesson on session-token comparison, but not load-bearing — single-use risk.
  - Leanest v1: drop the leak trace; keep only the skew/tolerance sliders against a fixed valid signature, returning pass/fail. The timing-attack mini-pane becomes a separate static `CodeVariants` block. Cuts the build to a 2-input form.

- **`ConcurrencyHarness`**
  - Wrapper that fires N parallel invocations of a SQL statement or handler against a shared seed, reports row count and duplicate-work tally.
  - Uses in this chapter: Concept 5.
  - Forward-links: strong — Chapter 13 (job idempotency under concurrent runs), Chapter 14 (notification dedup), any later lock/queue lesson. High reuse.
  - Leanest v1: hard-code N=2 only; report a single "duplicated?" boolean and the final row count. No knobs for the student. Still teaches the race because N=2 vs N=1 is the inflection.

- **`TxBoundarySim`**
  - Handler-code panel with a transaction-wrap toggle and a "crash at line X" control; DB-state ribbon shows committed rows after the run.
  - Uses in this chapter: Concept 6.
  - Forward-links: strong — Chapter 13 (job idempotency requires the same commit topology), Chapter 14 (notification dispatch transactions). High reuse.
  - Leanest v1: two preset scenarios (wrapped vs unwrapped) with a fixed crash point; the student presses one button per scenario and reads the resulting DB state. No code editing; no crash-line picker. Carries the boundary argument.

- **`EventOrderingTimeline`**
  - Two parallel scrubbable timelines (emitted vs received) with configurable delivery-delay; below, a row-state readout that updates as events apply.
  - Uses in this chapter: Concept 8.
  - Forward-links: Chapter 14 notification dedup-window lesson (ordering recurs); plausible reuse in any eventual-consistency teaching. Reasonable.
  - Leanest v1: two fixed scenarios (in-order, reversed) shown as a `DiagramSequence` of four Mermaid frames each, no scrubbing. The reversed scenario is the entire pedagogical payload; the scrubber is polish.

- **`RedirectRaceSandbox`**
  - Mock success page + webhook-delay slider + concurrency toggle + two student-editable repair stubs.
  - Uses in this chapter: Concept 9.
  - Forward-links: none currently identified — single-use risk in this chapter alone. Demoted; `ReactCoding` with a fixed harness is the primary path.
  - Leanest v1: a `ReactCoding` exercise with a fixed delay value (~2000ms), a `target-match` mode, and a criterion that the rendered plan matches the eventually-correct entitlement. No slider, no toggle. Built from an existing component.

- **`PatternMatrix`**
  - 4×4 cell grid (webhook / action / job / API × key source / origin / constraint / replay) with progressive reveal.
  - Uses in this chapter: Concept 10.
  - Forward-links: every subsequent surface (Server Actions in 7.2 backfill, jobs in 13.1, future API chapter) can echo or extend the matrix. Plausible.
  - Leanest v1: a static fully-revealed matrix as a hand-SVG inside `Figure`, with prose walking it row by row. The progressive reveal is polish; the visual rhyme of the four columns is the teaching.

- **`IdempotencyCacheTrace`**
  - Request/response panel with a "fire next call" button, hidden state column, cache column showing what gets returned per call.
  - Uses in this chapter: Concept 11.
  - Forward-links: a future public-API chapter could reuse it. Speculative.
  - Leanest v1 (preferred): replace with a hand-SVG `Figure` showing a two-row request/response trace, state changes annotated between rows, `Aside` calling out the contract. Build no bespoke component.

- **`HandlerDiffViewer`**
  - Two source panes with shared dim/highlight overlay driven by line-pair mappings.
  - Uses in this chapter: Concept 12.
  - Forward-links: none identified — single-use risk. Demoted; `AnnotatedCode` on the Resend handler with same-as-Stripe annotations is the primary path.
  - Leanest v1 (preferred): skip the bespoke component. Use `AnnotatedCode` over the Resend handler with annotations referencing the Stripe handler by line number.

## Build priority

Two proposals carry forward weight across the curriculum and earn the build first.

- **`ConcurrencyHarness`** (Concept 5) — reused implicitly in every later concurrency lesson (job retries, notification dedup, lock contention). It is the chapter's most leveraged new artifact because race-window bugs recur as a teaching shape, not just a topic. Build the leanest v1 (N=2, one duplicated-boolean readout) for this chapter and let later chapters extend.
- **`TxBoundarySim`** (Concept 6) — the commit-boundary argument is the same in jobs and notifications. Build the two-preset v1 here; jobs lesson extends to multiple presets.

Lower priority but worth building if budget allows: **`EventOrderingTimeline`** (concept 8) and **`PatternMatrix`** (concept 10). Both have plausible reuse in Unit 13/14; both have a credible static-figure fallback.

Demote and do not build: `WebhookAttackReplay`, `HmacVerifySim`, `RedirectRaceSandbox`, `IdempotencyCacheTrace`, `HandlerDiffViewer`. All are single-use or weakly forward-linked; their leanest-v1 fallbacks (hand-SVG `Figure`, `ReactCoding` with a fixed harness, `AnnotatedCode`) teach the concept with existing components.

`HmacByteDiff` and `SignatureAnatomy` sit in the middle — both are small, both have plausible (not certain) forward use in cryptographic lessons. `HmacByteDiff`'s static-table fallback is so close to the full version that the bespoke build adds little; ship the static figure. `SignatureAnatomy` is already at its leanest v1 (single hand-SVG inside `Figure`) — author it as drawn.

## Open pedagogical questions

- Concept 9's `RedirectRaceSandbox` is the only proposed sandbox with no clear forward-link, yet the race is the chapter's most cited "money seam" bug. Is a one-off bespoke sandbox justified for a single high-stakes concept, or does the `ReactCoding`-with-fixed-harness fallback genuinely teach it? The recommendation here defaults to the fallback; flag for a build review.
- Concept 11 (cache the response, not the state) lives entirely in the idempotency-pattern lesson and never appears in the project. Is it worth the same teaching weight as the other concepts in this chapter, or should it be folded into Concept 10 as a sub-beat to keep the chapter cut tight?
- The chapter has uneven lesson weights (12.1.1 and 12.1.2 are 50–60 min; 12.1.5 is 35–45 min). Three concepts each for lessons 1 and 2 versus one each for lessons 4 and 5 reflects that — confirm the asymmetry tracks the human read of where the teaching load actually sits.

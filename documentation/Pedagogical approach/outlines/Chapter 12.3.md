# Chapter 12.3 — pedagogical approach

## Concept 1 — Verify before you parse (and before you log)

**Why it's hard.** The natural shape of a route handler is "parse the JSON, then validate." For webhooks that shape is wrong twice over: `request.json()` consumes the raw bytes the signature is computed over, and logging an unverified payload turns attacker-controlled strings into a log-injection vector. The student arrives believing parse-then-check is the safe default; the rule reads as ceremony until they see what gets broken by reversing it.

**Ideal teaching artifact.** A misconception-first ambush (Pattern archetype). Open with three near-identical handler variants displayed side-by-side: (a) `await request.json()` then `constructEvent(JSON.stringify(body), …)`, (b) `await request.text()` then `logger.info({ body })` then `constructEvent`, (c) `await request.text()` then `constructEvent` then `JSON.parse`. Before any narration, the student picks which one is safe and what each broken one breaks. The reveal walks each variant's failure mode: variant (a) silently fails verification because `JSON.stringify` re-serializes with different whitespace and key order; variant (b) lands the attacker's payload in the structured log before the signature is checked; variant (c) is the rule. Variant order on the page is randomized in prose so the answer isn't "the last one."

**Engagement.** After the reveal, a four-statement true/false round on the disposition table — "a missing header returns 401" (false, returns 400), "the SDK throws a specific error class" (true), "the 5-minute tolerance protects against clock skew" (true), "you can lower the tolerance freely" (false). Locks the disposition decisions while the variants are still fresh.

**Components.**
- `CodeVariants` for the three handler variants, each tab carrying the failure-mode reveal in its prose slot.
- `MultipleChoice` for the prediction round before reveal.
- `TrueFalse` for the disposition recall.

**Project link.** Lands the empty route handler in 12.3.3 with the verify-then-log skeleton.

## Concept 2 — Why one transaction wraps claim and mutate

**Why it's hard.** The discipline carries in from 12.1.2, but only at the level of "do it that way." This chapter is the first time the student writes a handler whose mutate-step is non-trivial (UPSERT + audit log) and where a crash mid-handler has a visible-from-the-inspector consequence. The misconception is to treat the dedup INSERT and the business mutation as ordered-but-independent. The single-transaction rule is structural, not cosmetic.

**Ideal teaching artifact.** A scrubbable failure-injection sequence (Concept archetype, new pedagogical move). Two parallel timelines run side-by-side: top is "claim inside `db.transaction`, mutate inside `db.transaction`"; bottom is "claim outside, mutate inside" (the seductive wrong shape). The student scrubs a "crash dot" through three positions on each timeline — before claim, between claim and mutate, after mutate — and the panel under each timeline shows the post-recovery state of `processed_events` and `plan_entitlements` plus what the *next retry* will do. Only the wrapped version recovers correctly in all three positions; the unwrapped version leaks a claim row that blocks the retry from ever completing.

**Engagement.** A `Sequence` ordering drill afterward — given the four operations (verify, claim, project, upsert) and a constraint card "all DB writes share one transaction," put them in order and tick which lines are inside the `db.transaction` boundary. Confirms the boundary is internalized.

**Components.**
- New component **`CrashTimeline`** — two horizontal timelines with operation pills, a draggable crash marker, and a state-readout panel under each. Inputs: a list of operations per timeline, the DB state delta per operation, the "what survives a crash here" function.
- `Sequence` for the ordering drill.
- Alternative if `CrashTimeline` doesn't get built: a `DiagramSequence` with three scrubber stops (crash-before-claim, crash-between, crash-after) showing two columns of post-state — readable but not manipulable.

**Project link.** Lands the `db.transaction` wrapper in 12.3.4; the crash positions map directly to the "Replay last event" probe in 12.3.7.

## Concept 3 — 200 on duplicate, not 4xx

**Why it's hard.** The student's HTTP intuition says "the request didn't do anything; return a non-2xx." For idempotent webhook receivers this is precisely wrong — Stripe interprets non-2xx as "please retry," and a duplicate that returns 409 produces an infinite retry loop until the dashboard's max-retry budget burns out. The concept is about reading the contract from the *sender's* point of view, not the handler's.

**Ideal teaching artifact.** A "Stripe operator's POV" predict-the-loop simulator (Decision archetype, framed from the upstream side). The student picks the handler's response code from a small dropdown — 200, 200 with `{ duplicate: true }`, 400, 409, 500. The simulator shows the next eight Stripe delivery attempts on a time axis with their exponential backoff, plus the final dashboard state ("delivered" vs. "failed — manual retry required"). Only the two 200 variants converge to a single delivery; the others fan out into a retry storm that's visible at a glance.

**Engagement.** The simulator's "delivery count after one hour" readout is the assessment — the student must converge it to 1. Then one `MultipleChoice` follow-up: "why does returning 500 on a transient bug also work, even though duplicates return 200?" (Because transient bugs *should* retry; the discipline isn't "always 200," it's "200 when the work succeeded *or* was already done.")

**Components.**
- New component **`RetryStorm`** — pick a response code, see the resulting delivery schedule (exponential backoff per Stripe's documented policy) and the dashboard verdict. Inputs: response code, the sender's retry policy parameters (max attempts, base delay, multiplier), an outcome label.
- `MultipleChoice` for the follow-up.
- Alternative if `RetryStorm` doesn't get built: a static `Figure` with three small SVG timelines (one per response choice) showing the delivery count after one hour — loses the interactivity but preserves the operator-POV framing.

**Project link.** Lands the `{ duplicate: true }` 200 path in 12.3.4 and the replay verification in 12.3.7.

## Concept 4 — The projection function as a pure seam

**Why it's hard.** The student has seen "pure function" as a vocabulary item but not as an architectural seam. `subscriptionToEntitlement` is the only place Stripe's data shape meets the app's data shape, and the only billing code that's directly unit-testable without spinning up Stripe. The misconception is to treat it as "just a mapping function" and inline it into the handler, losing the test seam and entangling Stripe-shape knowledge with DB writes.

**Ideal teaching artifact.** A dual-pane field-trace (Mechanics archetype with a Concept beat). Left pane shows a real `Stripe.Subscription` JSON (one of the canned shapes from `stripe trigger`), right pane shows the resulting `EntitlementPatch` JSON. Hovering any field on either side lights up its counterpart and the projection-function line that produced it. `items.data[0].price.lookup_key` traces through `catalog.planFromLookupKey` to `plan`; `current_period_end * 1000` to `new Date(...)`. The trace makes the asymmetries obvious (no SDK call inside the function; `lookup_key` not `price_id`; pure transformation; null cases visible).

The second beat is a fill-in-the-blank — three of the projection's lines are blanked out (the lookup_key line, the period_end line, the seats fallback), the student writes each one against the live shape on the left and the simulator validates by running the projection on a fixture.

**Engagement.** The fill-in is the assessment beat. Plus one `Tokens` click afterward on the finished function: identify which lines could throw (the catalog lookup, only) and which couldn't (everything else).

**Components.**
- New component **`FieldTrace`** — two JSON panes with cross-pane field highlighting on hover, with an optional code-line overlay showing the mapping expression. Inputs: source JSON, target JSON, mapping descriptors `{ sourcePath, targetPath, line }[]`.
- `DrizzleCoding` or `ScriptCoding` for the fill-in-the-blank (the projection is pure TS, no DB). `ScriptCoding` fits cleanly — runs the student's function against `Stripe.Subscription` fixtures.
- `Tokens` for the throws-or-not classification.
- Alternative if `FieldTrace` doesn't get built: a hand-SVG inside `Figure` with arrows between two columns of field labels — static but readable; loses the hover-trace but keeps the shape comparison.

**Project link.** Lands `projection.ts` in 12.3.5 as the pure, unit-testable seam — and the artifact 19.6 will target.

## Concept 5 — `last_event_at` lives in the WHERE, not in a pre-read

**Why it's hard.** The student's instinct on "newer wins" is to SELECT the row, compare `lastEventAt` in code, then UPDATE if newer. That re-introduces a race window between read and write — two handlers both seeing "mine is newer," both writing, the older one wins. The atomic UPDATE with the predicate in the WHERE clause lets Postgres evaluate the condition under a row lock; the difference is invisible in single-tenant testing and brutal in production.

**Ideal teaching artifact.** A two-timeline race visualizer (Concept archetype). Two webhook deliveries arrive on parallel lanes — event A with `created = T+5`, event B with `created = T+0`. The student picks a handler shape ("pre-read then write" vs. "atomic UPDATE WHERE") and a delivery interleaving (A-then-B or B-then-A or interleaved). The visualizer plays the sequence with the row's lock state visible: pre-read-then-write shows the lock dropping between operations and both writes landing in arrival order (older clobbers newer when interleaved); atomic UPDATE shows the WHERE clause rejecting the older write under the lock, regardless of interleaving.

**Engagement.** Immediately after, a wrong-by-default `DrizzleCoding` exercise — the student is given the pre-read-then-write handler and must refactor to a single `UPDATE … WHERE … RETURNING` that returns zero rows on a stale event. The test suite fires both events in both orders and checks the entitlement landed on the newer values.

**Components.**
- New component **`RaceLanes`** — two horizontal lanes with operation pills (READ, UPDATE, etc.), a row-lock indicator that opens and closes, and a final-row-state readout. Inputs: two operation sequences, the row-state transition function, the lock-acquisition rules.
- `DrizzleCoding` for the refactor exercise — natural fit, the schema is already defined in the project.
- Alternative if `RaceLanes` doesn't get built: a Mermaid sequence diagram pair (one per handler shape) shown via `TabbedContent`, with the lock state called out in actor lifelines. Loses the interleaving control but keeps the contrast.

**Project link.** Lands the WHERE predicate in 12.3.5's `onSubscriptionUpdated` and `onSubscriptionDeleted`; the "force older event" debug in the inspector reproduces it in 12.3.7.

## Concept 6 — The single-writer rule and the redirect-versus-webhook race

**Why it's hard.** After clicking Checkout, the user lands on `/billing/success?session_id=...` while the webhook is still in flight. The instinct is to make the success page "trust the redirect" — read `session_id`, fetch the session from Stripe, write the entitlement. That works *most* of the time, which is the failure mode. Two writers (webhook + success page) racing against the same row produces silent inconsistencies. The fix — webhook is the only writer; success page reads and polls — is counterintuitive because polling feels like a hack.

**Ideal teaching artifact.** A controllable success-page simulator with two latency sliders (Concept archetype). One slider controls webhook arrival latency (0–10s), one controls poll interval (250ms–2s). A side panel shows three lanes: the user's success-page state (`finalizing` / `you're on Pro` / `check your email`), the `plan_entitlements.updatedAt`, and the poll-fire schedule. The student is asked to find webhook latencies where the page lands `you're on Pro` within 2s, and to find latencies where it falls through to the 30s fallback. Then a second mode — the wrong-shape sandbox: enable a "success page also writes" toggle and watch the race produce a stale-row bug (older write from the page clobbers newer state from the webhook, or vice versa, depending on interleaving).

**Engagement.** The simulator's "find a webhook latency that breaks the page" task is the assessment. Then one `MultipleChoice`: "why doesn't the success page just `await stripe.checkout.sessions.retrieve(session_id)` and write the entitlement from there?" — three plausibly-wrong answers and the correct one (single-writer rule prevents the race, plus the success page becomes a load-bearing security surface if it can write).

**Components.**
- New component **`SuccessPageSim`** — two sliders, three lanes, a wrong-shape toggle. Inputs: webhook arrival time, poll interval, optional "page also writes" mode. Outputs: page state over time, row-state over time.
- `MultipleChoice` for the follow-up.
- Alternative if `SuccessPageSim` doesn't get built: a `DiagramSequence` with five stops (click checkout → redirect lands → poll 1 → poll 2 → webhook lands → poll 3 reveals) — static but conveys the race; the wrong-shape variant goes in a `CodeVariants` block alongside.

**Project link.** Lands the `Poller.tsx` reading rationale in 12.3.5 and the redirect-versus-webhook verification in 12.3.7.

## Concept 7 — Why `billing.*` is the only carve-out, and where to stop

**Why it's hard.** Once the student has bought into the three-method interface, the natural creep is "for symmetry, let's also add `billing.cancel`, `billing.changePlan`, `billing.applyCoupon`." Each individual addition is locally defensible. The discipline is to *not* add them — the Portal owns user-initiated mutations, and the interface earns its weight by staying small. The senior call is recognizing when symmetry is the wrong design pressure.

**Ideal teaching artifact.** A "wrap-or-not?" decision puzzle (Decision archetype, extending 12.2.7's three-test rule). Five SDKs on cards — Stripe, Resend, Trigger.dev, R2, Drizzle. For each, three checkboxes (read-hostile shape, real swap cost, discipline to centralize). The student ticks what applies, then chooses *wrap* or *don't*. The grading reveals each one's verdict and the senior reasoning. Then a second beat on the Stripe card itself: six proposed methods — `upgrade`, `openPortal`, `requirePlan`, `cancel`, `changePlan`, `applyCoupon` — and the student picks which three belong. The reveal walks why the bottom three don't earn their weight (the Portal already does them, adding them invites the success page or some other surface to call them and bypass the Portal, the test surface inflates).

**Engagement.** The puzzle itself carries the assessment for the wrap-or-not question. The method-selection follow-up confirms recall on the specific carve-out. After both, one `Tokens` click on a `lib/billing/upgrade.ts` snippet: identify the single `import { stripe }` statement (the only one in the codebase) and the lint-rule annotation comment.

**Components.**
- `Buckets` (two-column: "wrap" / "don't wrap") for the five-SDK sort.
- `MultipleChoice` (multi-correct) for the three-of-six method picker.
- `Tokens` for the import identification.

**Project link.** Lands the `lib/billing/index.ts` re-export rule and the `no-restricted-imports` lint rule in 12.3.6 — the structural enforcement of the carve-out.

## Concept 8 — `hasActiveAccess` as a single decision table, not scattered branches

**Why it's hard.** Without the decision table, every gated page accretes its own `if (status === 'active' || status === 'trialing')` branch — and drifts. Some pages forget `past_due`; some forget the `cancel_at_period_end && currentPeriodEnd > now()` grace window. The misconception is "this is simple enough to inline." The eight statuses interact with two more dimensions (cancel-at-period-end flag, period-end timestamp), and the truth-table only fits in one place.

**Ideal teaching artifact.** An interactive decision-table walker (Pattern archetype). Eight rows — one per status. Each row exposes a "force" button that flips the inspector's entitlement to that row and renders `/inspector/pro-only` inline (or shows the rendered state when not buildable). The student walks every row, predicts the access decision before clicking, then sees `hasActiveAccess` return. Two extra columns expose the conditional cases (`cancel_at_period_end + future period_end → access`, `cancel_at_period_end + past period_end → no access`).

**Engagement.** The walker's prediction round is the assessment — the student must correctly predict all eight (plus the two conditional cases) before moving on. Then a single `MultipleChoice`: "you're adding a new status `paused` — what's the structural cost of forgetting to update `hasActiveAccess`?" (Answer: every gated page silently grants or denies based on the function's default, which is wrong; the discipline is to make the function exhaustive over the union so TypeScript catches the omission.)

**Components.**
- New component **`DecisionTableWalker`** — a table where rows have predict-then-reveal cells and an optional "side effect" hook (force-state + show downstream render). Inputs: rows of `{ inputs, prediction, answer, justification, downstream? }`.
- `MultipleChoice` for the structural-cost question.
- Alternative if `DecisionTableWalker` doesn't get built: a `Figure` wrapping a hand-built static table with one row per status, plus an immediately-following `Sequence` exercise asking the student to sort the eight statuses into "grants access" vs. "denies access" (loses the predict-then-reveal but keeps the exhaustive walk). Forward-link to Concept 9 keeps this component above the single-use bar.

**Project link.** Lands `hasActiveAccess` in 12.3.5 and the exhaustive verify pass in 12.3.7's "gate function exhaustiveness" step.

## Concept 9 — Metadata is a carry channel, not a trust channel

**Why it's hard.** `subscription_data.metadata.organization_id` is convenient — the webhook reads it instead of doing a DB lookup. That convenience is precisely the attack surface. A buggy or malicious upstream call to `billing.upgrade` could carry the wrong `organization_id` in metadata; the webhook trusts it; the entitlement lands on the wrong org. The student needs to internalize the asymmetry — metadata is the *carry* channel, the `stripeCustomerId` reverse lookup is the *truth* channel, and the cross-check is the harness.

**Ideal teaching artifact.** An attack reenactment with a toggleable defense (Pattern archetype, framed as "wrong-by-default sandbox"). The artifact is a small reproduction of the webhook resolution step. A toggle picks between three scenarios: (1) legitimate upgrade — metadata and customer lookup agree; (2) buggy upgrade — metadata holds the wrong org, customer lookup points at the right one; (3) malicious upgrade — same as (2) but with the framing of an attacker who controls the `billing.upgrade` call site. A second toggle enables or disables the cross-check defense. With the defense off, the buggy and malicious scenarios both land the entitlement on the wrong org and the inspector shows the bad write. With the defense on, both scenarios log + 500 and Stripe retries (cleanly, because the cross-check is a server-side bug, not a payload bug).

**Engagement.** After running all six combinations (three scenarios × defense on/off), a `Buckets` sort: six events into "lands wrong write," "lands right write," "rejects and 500s." Confirms the student can read the three scenarios distinctly and predict the defense's effect.

**Components.**
- New component **`AttackProbe`** — a small sandbox card with scenario selector + defense toggle + a before/after state panel. Inputs: scenario definitions (the carry-channel value, the truth-channel value), the defense predicate, the resulting DB write or rejection.
- `Buckets` (single-column with three buckets) for the six-combination sort.
- Alternative if `AttackProbe` doesn't get built: a `TabbedContent` with three tabs (one per scenario), each showing two `CodeVariants` panels (defense off vs. on) with the resulting state inline. Loses the toggleable interactivity but preserves the asymmetry.

**Project link.** Lands the metadata cross-check in 12.3.7 — the chapter's last hardening, deliberately surfaced in verify rather than build.

---

## Component proposals

- **`CrashTimeline`** — two parallel operation timelines with a draggable crash marker and a post-recovery state readout per timeline. Used in concept 2.
  - **Uses in this chapter:** Concept 2.
  - **Forward-links:** Unit 13 (background work, idempotency under retry), Unit 17 (audit-log under crash). The crash-injection pattern recurs whenever a multi-step operation crosses a transaction boundary.
  - **Leanest v1:** one timeline (the right shape), three preset crash positions selected by tabs, a post-state panel that swaps. Drops the second timeline and the drag interaction; keeps the predict-the-state beat.

- **`RetryStorm`** — pick a response code, see the upstream sender's resulting delivery schedule and dashboard verdict. Used in concept 3.
  - **Uses in this chapter:** Concept 3.
  - **Forward-links:** Unit 12.1.5 (Resend bounces — Svix retry policy), Unit 13 (Trigger.dev retry semantics on background-job failures). Operator-POV-of-retry is a recurring teaching move.
  - **Leanest v1:** four hardcoded response codes, four static SVG timelines, one swap-in panel. Loses the configurable retry policy but keeps the convergence-vs-storm contrast.

- **`FieldTrace`** — two JSON panes with cross-pane field highlighting on hover and an optional mapping-expression overlay. Used in concept 4.
  - **Uses in this chapter:** Concept 4.
  - **Forward-links:** Unit 13.2 (CSV export — DB row to CSV column projection), Unit 14 (notification payload projection from domain events), Unit 19.6 (test scaffolding for the projection function). The "shape A → shape B" transformation is a recurring archetype across the back half of the course.
  - **Leanest v1:** static side-by-side `<pre>` blocks with hover-highlight via shared `data-field` attributes; drop the code-line overlay. The hover-trace is the load-bearing piece.

- **`RaceLanes`** — two lanes with operation pills, a row-lock indicator, and a final-state readout, parameterized by interleaving and handler shape. Used in concept 5.
  - **Uses in this chapter:** Concept 5.
  - **Forward-links:** Unit 11.3 retrospective (the two-tab 409 lesson — same race-with-lock structure), Unit 13.1 (concurrent-runner semantics), Unit 17.2 (concurrent audit writes). Race visualization recurs.
  - **Leanest v1:** two preset interleavings (instead of arbitrary), the handler-shape choice as a `<Tabs>` instead of an inline toggle, lock state as a simple icon swap. Keeps the contrast; drops the scrubbable timing.

- **`SuccessPageSim`** — two latency sliders, three lanes showing user-page state, row state, and poll schedule, plus a wrong-shape toggle. Used in concept 6.
  - **Uses in this chapter:** Concept 6.
  - **Forward-links:** Unit 13 (async-result polling for background jobs), Unit 15 (cache-tag revalidation propagation timing). Latency-versus-poll-interval is the same shape across these.
  - **Leanest v1:** one slider (webhook latency only, fixed poll interval), two preset scenarios (page-reads vs. page-writes), a single state-over-time readout. Loses one degree of control; keeps the race demonstration.

- **`DecisionTableWalker`** — a predict-then-reveal table with optional downstream-render hook per row. Used in concept 8.
  - **Uses in this chapter:** Concept 8.
  - **Forward-links:** Unit 10.4 (RBAC matrix), Unit 17 (audit-log discrimination), Unit 19 (test-matrix walking). Any truth-table-with-a-side-effect is the same shape.
  - **Leanest v1:** the predict-then-reveal table (no downstream-render hook); the inspector-state side-effect lives in a parallel screenshot strip. The predict-then-reveal is what teaches; the side-effect was the embellishment.

- **`AttackProbe`** — scenario selector + defense toggle + before/after state panel for security-pattern teaching. Used in concept 9.
  - **Uses in this chapter:** Concept 9.
  - **Forward-links:** Unit 17 (CSRF, mass-assignment, IDOR — every attack-with-defense pattern), Unit 12.1.5 (Svix bypass-suppression carve-out as a defense toggle). The "toggle the defense, watch the asymmetry" pattern is Unit 17's core teaching move.
  - **Leanest v1:** three preset scenarios, defense as a `<Tabs>` (defense on / off), state panel as two `<Figure>` SVGs. Loses the live toggle; keeps the comparison.

## Build priority

`AttackProbe` and `DecisionTableWalker` carry the most forward-link weight — Unit 17 is built almost entirely on the "toggle the defense, watch the asymmetry" and "exhaustive truth table" moves, and Chapter 12.3 is the earliest natural home for both. Build these first; their leanest-v1 cuts are small enough that v1 doubles as the chapter's working artifact.

`RaceLanes` ranks next: it has three credible forward uses (11.3 retrospectives, 13.1, 17.2) and the leanest v1 is mostly a `Tabs`-driven static composition.

`FieldTrace` is the highest-value-per-LOC build — its v1 is essentially two `<pre>` blocks with shared `data-field` hover-highlight, and it unlocks the projection-teaching pattern across at least three downstream units.

`CrashTimeline`, `RetryStorm`, and `SuccessPageSim` each have one strong recurrence forward, but their full versions are ambitious. Ship v1 sketches and revisit only if a forward chapter actually demands the full interactivity.

## Open pedagogical questions

- Concept 6 leans on a `SuccessPageSim` that genuinely benefits from sliders; the leanest v1 (one slider) may not carry the wrong-shape demonstration as clearly as the prose suggests. If `SuccessPageSim` doesn't get built, consider promoting `DiagramSequence` plus `CodeVariants` to the primary recommendation rather than the alternative — the static path may actually teach the race better than a one-slider sandbox that's too constrained to break.
- Concept 7's `Buckets` sort over five SDKs partly duplicates 12.2.7's "three-test threshold" lesson. The exact line between "12.2.7 introduces the rule" and "12.3.6 applies it" needs the human's call on whether the bucket exercise belongs in the chapter-3 project or stays in chapter-2's theory lesson.

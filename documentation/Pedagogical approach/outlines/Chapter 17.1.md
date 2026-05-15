## Concept 1 — Fail-closed as the architectural default

**Why it's hard.** The student already writes auth checks; the gap is reading every gate as having *three* legal outcomes (allow, deny, the check itself failed) and refusing to let the third silently collapse into the first. Without that frame, fail-open looks like resilience.

**Ideal teaching artifact.** A pair of side-by-side "request-through-a-gate" simulators — one labeled fail-open, one labeled fail-closed — that share the same input controls. The student picks an outcome for the role check (`returns 'admin'`, `returns 'member'`, `throws ConnectionError`, `returns null`) and watches the request flow animate through both systems in parallel. In fail-open, the throw branch routes around the gate; the action runs; the user gets the resource (rendered in red as "leaked"). In fail-closed, the same throw lands in the wrapper's catch and renders a 403. The point lands when the student tries the four inputs in sequence and sees fail-open silently grant access on inputs 3 and 4. Concept archetype, not Mechanics — the model is the lesson.

**Engagement.** A `PredictOutput`-shaped round before the second simulator runs each branch: given the role-check outcome (`throws ConnectionError`), predict whether the user gets the resource under fail-open and under fail-closed. Three rounds, then the simulator confirms.

**Components.**
- New component: `GateOutcomeSimulator` — two stacked request-flow lanes (fail-open, fail-closed), a single input picker for the check's outcome (`returns role`, `throws`, `returns null`), an animated request token that moves through each lane and lands on either "resource served" or "403 refused." Reused in Concept 2 with different inputs.
- Existing: `PredictOutput` for the prediction round before the reveal.

**Project link.** The pre-launch audit in 17.3 opens with the fail-closed walkthrough of `transferOwnership.ts`; the simulator gives the student the mental movie the audit then maps to real code.

## Concept 2 — The fail-open failure modes, by canonical shape

**Why it's hard.** Fail-open rarely looks like "let unauthorized users in." It looks like a `catch (e) { log(e); }`, a helper that returns `false` for two different reasons, an `||` carve-out for super-admin that reads as defense in depth. The student has to recognize the patterns at a glance and read them as the same bug.

**Ideal teaching artifact.** A "spot the fail-open" gallery — five short, plausible code snippets the student rotates through, each carrying one of the canonical leaks from the lesson (the empty catch, the boolean-returning `requireRole` that swallows the throw, the `orgId === input.orgId || isSuperAdmin(user)` carve-out, the signature verify that returns `false` on both bad-sig and library throw, the paywall that catches the Stripe timeout). Each snippet is paired with an inert "what input breaks this?" prompt. The student picks the input from a small set; the simulator from Concept 1 then reruns with that input wired in and shows the leak. Pattern archetype — the failure mode *is* the lesson.

**Engagement.** A `Buckets` sort after the gallery: ten short snippets (mix of fail-open and fail-closed, several disguised), two buckets ("leaks under throw" / "refuses under throw"). The student has to read each for its catch shape, not its variable names.

**Components.**
- Existing: `CodeVariants` per snippet to flip between "the leak" and "the fix"; `Buckets` for the post-gallery sort.
- Existing: `GateOutcomeSimulator` (from Concept 1) reused with the snippet's specific input wired in.

**Project link.** Three of the five failure modes here recur as findings the 17.3 audit asks the student to spot in the seeded codebase.

## Concept 3 — The structural shape: check throws, wrapper catches once

**Why it's hard.** The student's instinct is to wrap each call site in try/catch and decide refusal locally. The senior reach inverts that — the check throws on its own failure, the *wrapper* catches in exactly one place. The architectural property "one place to lint" is the load-bearing idea, not the syntax.

**Ideal teaching artifact.** An annotated read of the real `authedAction` body — the canonical wrapper. The student steps through it line by line: schema parse → `requireOrgUser` → `roleAtLeast` → `fn(ctx, input)` → catch. At each step a side panel names which failure class lands here, which `Result.err` code maps out, and which throws bubble to `error.tsx`. The student does not write the wrapper; they read it as the architectural reference. Pattern archetype, with the wrapper itself as the artifact. A short follow-up beat compares the same logic *with* the wrapper versus distributed across three call sites — the lint surface visibly contracts from three files to one.

**Engagement.** A `Tokens` round on the annotated wrapper: the student clicks every line in the wrapper that implements fail-closed (the `requireRole` call site, the catch block, the `Result.err` return, the rethrow on `notFound`). Decoys are the schema parse and the `fn` invocation itself, which look defensive but aren't gates.

**Components.**
- Existing: `AnnotatedCode` for the stepped walkthrough of the wrapper.
- Existing: `Tokens` for the "click the fail-closed surface" round.
- Existing: `Figure` wrapping a hand-SVG of "three call sites → one wrapper" for the lint-surface compression beat (single-use; no bespoke component warranted).

## Concept 4 — The fail-open carve-out, named and bounded

**Why it's hard.** A student who has just internalized fail-closed as the rule will overgeneralize and lock users out of their accounts during a Redis blip. The senior framing is exactly the inverse: fail-closed is the default, fail-open is a deliberate, documented carve-out with a written reason and a logged event — and it lives in `safeLimit`, not at every call site.

**Ideal teaching artifact.** A `Decision`-archetype side-by-side: two production incident scenarios. Scenario A — Redis outage, fail-closed limiter on the login route: every user is locked out, the on-call PR is reverted at 3am. Scenario B — Redis outage, fail-open limiter on the login route: a 20-minute abuse window for credential stuffing, the structured log lights up, ops gets paged, rate limiting resumes when Redis recovers. The student reads both, then sees the policy collapsed into the `safeLimit` helper's five-line body: the catch logs `{ event: 'rate_limit_unavailable' }` and returns `{ success: true }`. The reasoning lives in the helper's doc comment, not at the call sites.

**Engagement.** A `MultipleChoice` with three new gates (admin-action limiter, billing-webhook limiter, public-signup limiter) — for each, the student picks fail-closed or fail-open and names the reason. The answer key validates the reasoning, not just the label.

**Components.**
- Existing: `TabbedContent` for the two incident scenarios side by side.
- Existing: `Code` for the `safeLimit` body.
- Existing: `MultipleChoice` for the carve-out decision round.

## Concept 5 — Two audiences, two artifacts: the wrapper splits

**Why it's hard.** "Don't leak internals to the user" reads as a vibe rule until the student sees that the operator record and the user message are *different artifacts* with different fields, different consumers, and a structural divergence point (the wrapper's catch, never the UI). Conflating them is the failure mode.

**Ideal teaching artifact.** A scrubbable "one error, two outputs" widget. A single Postgres error (`duplicate key value violates unique constraint invoices_org_id_slug_key`) enters at the top. A scrubber moves through the wrapper's catch block: at each tick, fields divert left into the operator record (cause chain walked, `requestId`, `userId`, `orgId`, parsed-and-redacted input, stack) or right into the user-facing `Result` (`code: 'conflict'`, `userMessage: 'That slug is already taken.'`). At the end, two panels: the operator-side structured-log JSON and the user-side toast string. The split is visible as a *property of the wrapper*, not a discipline the developer remembers. Concept archetype.

After the visual, a short read-aloud test beat — the student is given five candidate user messages (a leak, a leak-disguised, a sanitized, a too-vague, a senior-shaped) and picks which one a support rep could read aloud to a customer on a call without translation. This is the recall mechanic the chapter names explicitly.

**Engagement.** The read-aloud test described above, then a `Buckets` sort: twelve strings into "user-side OK" / "operator-side only." Plants include constraint names, IDs, third-party error strings, stack frames, and the digest.

**Components.**
- New component: `ErrorSplitScrubber` — scrubber input, single source error, two output panels (operator JSON, user toast), animated field-by-field divergence at the wrapper's catch. Recurs in Concept 7 (the `error.tsx` boundary's split) and would forward-link into 17.2.3 (audit-log payload shape) and 20.1.1 (Sentry capture).
- Existing: `MultipleChoice` for the read-aloud test.
- Existing: `Buckets` for the sort.

**Project link.** The 17.3 audit's "user-vs-operator message split" finding is graded against this exact split shape — the scrubber gives the student the canonical visual the audit then compares real code against.

## Concept 6 — The mapping table and the `code`/`userMessage` separation

**Why it's hard.** The student will be tempted to use the `code` field as the user message ("Error: conflict") or to use the translated `userMessage` as the analytics group key. They have to internalize that the two channels are independent, with one mapper file as the single source of truth for both.

**Ideal teaching artifact.** A small `error-mapping.ts` puzzle. The student is shown five raw error inputs (`ZodError`, Postgres `23505`, Postgres `23503`, a domain `InvoiceNotFoundError`, a totally unknown thrown value) and a table with three columns to fill in: `code`, `userMessage`, and an analytics-group label. The puzzle enforces that the same `code` always produces the same analytics group, but the `userMessage` is allowed to vary per call site (the action can override `'That value is already taken.'` to `'That slug is already taken.'`). Pattern archetype — the structural rule is encoded in the puzzle's constraints. Wrong cells (using the code as the message, using the message as the group key) trigger inline corrections.

**Engagement.** The puzzle itself is the assessment. Follow-up beat: one `MultipleChoice` confirming "when a new domain error class is added, what's the smallest correct change?" — answer is "one entry in `error-mapping.ts`."

**Components.**
- Existing: `Dropdowns` driving the table cells — `code` and analytics-group are select-from-enum, `userMessage` is a select-from-candidate-strings with plants (the leaky version, the engineer-ish version, the senior-shaped version).
- Existing: `MultipleChoice` for the follow-up beat.

## Concept 7 — The page boundary: `error.tsx`, `digest`, and 404-over-403

**Why it's hard.** Two distinct senior reflexes land at the same seam and the student has to hold both. First, `error.tsx` is a leak surface by default — `error.message` in dev shows up fine, ships as a prod leak the day someone forgets. Second, cross-tenant access returns 404, not 403, because 403 itself admits the resource exists. Both are message-split rules adapted to a different surface.

**Ideal teaching artifact.** Two short, paired walkthroughs in a single figure. **Beat one** — a "wrong-by-default" `error.tsx` the student inspects: it renders `error.message`, no Sentry call, no digest. A small toggle flips between dev mode (the constraint name shows) and prod mode (Next.js redacts to a digest, but the student sees the message component is still leaking the framework's internals when the redaction list misses an edge case). The student is then shown the senior-shaped version: generic copy, "Try again," explicit `Sentry.captureException`, a small "Reference: {digest}" line. **Beat two** — a request-flow diagram for `/invoices/[id]` where the invoice exists but belongs to another tenant: 403 path leaks "this ID is real," 404 path doesn't; the operator log still captures `cross_tenant_attempt` with all the detail. Concept archetype with two beats because the seam genuinely carries two rules.

**Engagement.** A `TrueFalse` round of seven statements about `error.tsx` and the 404/403 distinction (sample plants: "rendering `error.message` is fine in dev because it's redacted in prod"; "a 403 is the correct response for a cross-tenant resource if the request is authenticated"; "the digest is for the user, the cause chain is for the operator"). End-of-round review names the senior reading.

**Components.**
- New component: `ErrorBoundaryToggle` — a small `error.tsx` preview with a dev/prod toggle that swaps the rendered output and a leak callout that highlights what each mode exposes. Single-use in this chapter, but forward-links to Unit 20.1 (Sentry capture, `beforeSend`) and arguably 18.2 (localized boundary copy). Demote to the alternative bullet if the forward-link doesn't firm up — replace with a `Figure` wrapping two static screenshots (dev / prod) and a hand-SVG of the redaction surface.
- Existing: `Figure` + hand-SVG arrow diagram for the 404-over-403 request-flow beat.
- Existing: `TrueFalse` for the engagement round.

**Project link.** The 17.3 audit asks the student to find one `error.tsx` that surfaces the message and one cross-tenant route that returns 403 — both findings map directly to the two beats here.

## Concept 8 — The six-seam map: every error path has a shape

**Why it's hard.** The student has the rules; they don't yet have the *coverage* mental model — that every error path in the codebase belongs to one of six shapes (`authedAction`, `authedRoute`, page `requireOrgUser`, the webhook receiver, the rate limiter, the page boundary), and a seventh shape means adding a seventh seam with its own wrapper. Without the coverage model, the audit is whack-a-mole.

**Ideal teaching artifact.** A single navigable seam map — six tiles, one per seam. Each tile, when opened, shows three rows: *where it lives* (the file path and the wrapper or helper), *where fail-closed lands* (which line, which catch), *where the message-split lands* (the mapper call, the response body shape, the structured log). The map is the chapter's reference artifact — the student leaves with it bookmarked. The map closes with a "what doesn't fit?" prompt: three hypothetical new features (an internal admin endpoint, a cron-triggered cleanup, a Server-Sent-Events stream), the student picks which seam each belongs in or names "needs a seventh seam." Reference archetype, but with a guided decision drill so it doesn't read as a survey.

**Engagement.** Two beats. First, a `Matching` drill: six seams on the left, six audit-step grep commands on the right (`'use server' files not importing authedAction`, `route.ts files exporting GET/POST not importing authedRoute`, etc.) — the student matches each seam to the grep that catches its bypasses. Second, the "what seam does this belong in?" classification on the three hypotheticals above.

**Components.**
- New component: `SeamMap` — six expandable tiles, each with file path, fail-closed line, message-split line, and grep command. Could be authored as a `CardGrid` of `Card`s with structured body content, but the bespoke version compounds: forward-links to 17.2 (the security baseline walks the same six seams for headers / rate limits / audit-log gaps) and to 17.3 (the audit project structures findings by seam). Worth building.
- Existing: `Matching` for the seam-to-grep drill.

**Project link.** The 17.3 audit deliverable is literally "one paragraph per seam." The seam map is the table of contents for the audit; the student references it directly while grepping the seeded codebase.

## Component proposals

- **`GateOutcomeSimulator`** — two stacked request-flow lanes (fail-open, fail-closed), a single input picker for the check's outcome (`returns role`, `throws ConnectionError`, `returns null`), animated request token, terminal states (resource served / 403 refused).
  - Uses in this chapter — Concepts 1 and 2.
  - Forward-links — could appear anywhere a defense layer's failure semantics are taught: Unit 15.3 (rate limiter behavior — though that chapter ships first), Unit 17.2.2 (the abusable-endpoint matrix references the same fail-open carve-out), Unit 19.3 (testing the wrappers).
  - Leanest v1 — two static columns side by side, a single dropdown for the check outcome, no animation; clicking the dropdown swaps both columns' final-state panels. Skips the animated token. Still teaches the three-outcomes-collapsed-to-two model. The full proposal earns its weight only if the animated token measurably helps the third input ("returns null") read as fail-open; if not, v1 is the right scope.

- **`ErrorSplitScrubber`** — scrubber input, single source error, two output panels (operator JSON, user toast), animated field-by-field divergence at the wrapper's catch block.
  - Uses in this chapter — Concept 5, with a follow-up appearance in Concept 7's `error.tsx` beat.
  - Forward-links — Unit 17.2.3 (audit-log payload shape uses the same divergence), Unit 20.1.1 (Sentry `beforeSend` redaction, same diagram with sanitization arrows added), Unit 18.2 (localized user messages add a third lane).
  - Leanest v1 — two static panels (operator JSON, user toast) with a single intermediate column showing each field tagged "operator only" or "user-safe"; no scrubber, no animation. Still teaches the split as a property of the wrapper. The scrubber is the upgrade if the diagram needs to read temporally rather than spatially; ship v1 first.

- **`ErrorBoundaryToggle`** — a small `error.tsx` preview with a dev/prod toggle that swaps the rendered output and a leak callout that highlights what each mode exposes.
  - Uses in this chapter — Concept 7.
  - Forward-links — Unit 20.1.1 (Sentry capture in the boundary), arguably Unit 18.2 (localized boundary copy). Forward-link is real but thin; this is the borderline case. Default to the `Figure` + static-screenshot alternative in the per-concept bullet unless the forward-links to 20.1 firm up.
  - Leanest v1 — two static `Code` blocks side by side (dev output, prod output) inside a `Figure`, with the leak surfaces highlighted via Expressive Code annotations. No toggle, no live preview. Skip the bespoke component entirely at v1.

- **`SeamMap`** — six expandable tiles, each surfacing the seam's file path, the line where fail-closed lands, the line where message-split lands, and the grep command that catches its bypasses.
  - Uses in this chapter — Concept 8.
  - Forward-links — Unit 17.2 (the security baseline walks the same six seams for headers, rate-limit coverage, audit-log gaps), Unit 17.3 (the audit project structures findings by seam — the map is literally the table of contents for the deliverable), Unit 19.3 (wrapper unit tests, organized by seam), Unit 21.2 (CI lint rules that catch seam bypasses).
  - Leanest v1 — a `CardGrid` of six `Card`s, each card's body authored as three short paragraphs (lives at / fail-closed lands at / message-split lands at) plus a fenced grep command. No expand/collapse, no interactive seam-to-grep linkage. The bespoke component upgrade is justified only if 17.3 ends up needing the tile-as-checklist UX; if not, the `CardGrid` is enough.

## Build priority

`SeamMap` is the highest-leverage build — it carries Concept 8 as the chapter's reference artifact and recurs across 17.2, 17.3, 19.3, and 21.2 as the canonical organizing surface for the codebase's error/security topology. Build first.

`ErrorSplitScrubber` is the second priority — it carries the heaviest single concept of the chapter (Concept 5) and forward-links into the audit log payload (17.2.3) and Sentry redaction (20.1.1). The v1 (static two-panel diagram) is cheap and probably sufficient; the scrubber upgrade waits until 20.1 needs the temporal reading.

`GateOutcomeSimulator` is the third — it carries Concepts 1 and 2 in this chapter and the v1 (static two-column comparison with a dropdown) is small. The animated token is a polish pass, not a v1 requirement.

`ErrorBoundaryToggle` is the lowest priority — single-strong-use in this chapter with thin forward-links. Default to the `Figure` + static-screenshots alternative unless 20.1 or 18.2 surfaces a real second use.

## Open pedagogical questions

- The fail-open carve-out (Concept 4) sits inside what's otherwise a fail-closed-is-universal lesson. The two-scenario `TabbedContent` is the leanest treatment, but if students read scenario A as "fail-closed is bad" the framing has inverted. Worth pilot-testing whether the `safeLimit` helper's doc comment lands as the load-bearing artifact or whether the scenarios need a sharper "default vs. exception" wrapper.
- The `SeamMap`'s "what doesn't fit?" prompt (three hypothetical new features) is a strong recall mechanic but depends on the three hypotheticals being unambiguous. Worth deciding whether the SSE stream is a route handler (seam #2) or its own seventh shape — the answer affects how the chapter frames the catalog as closed vs. open.

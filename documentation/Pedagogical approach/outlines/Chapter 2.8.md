# Chapter 2.8 — Errors as a first-class concern

## Concept 1 — Routing each failure into the right channel

**Why it's hard.** Juniors treat `throw` as the universal failure verb and discover later that every call site has degenerated into a `try`/`catch` swamp. The hard part isn't the syntax — it's resisting the throw reflex long enough to ask whether the caller can actually do something different per cause.

**Ideal teaching artifact.** Open with the `parseInvoiceCsv` four-failure scenario *before* any code lands — empty file, malformed row, out-of-range column, disk-read crash. Hold the function signature back and walk the student through one failure at a time with a single question fixed at the top of the page: *can the caller do something different per case?* For each failure, show the would-be caller (an upload route handler) and ask the student to predict which channel routes the failure before the lesson reveals it. This is a Decision archetype: the artifact is the reading reflex itself, structured as a guided four-step prediction sequence, not a comparison table on a wall. After the four predictions, the two-channel rule lands as the consolidation: return the expected, throw the unexpected.

**Engagement.** A `Buckets` round with the eight failure scenarios from the chapter outline — CSV row out of range, Postgres connection refused, Stripe API key rotated mid-request, duplicate email, S3 503, Zod parse fail, tenant-mismatch invariant, unknown OAuth code — sorted into `Result` vs. `throw`. The sort is the assessment that proves the heuristic transferred off the worked example.

**Components.**
- `DiagramSequence` to step through the four `parseInvoiceCsv` failures, each panel showing the failure, the would-be caller, and the routing answer. Each step lands one prediction before the next loads.
- `MultipleChoice` (one per step) embedded in the prose between the sequence steps for the "which channel?" predictions, so the student commits before the reveal.
- `Buckets` for the eight-scenario sort.

## Concept 2 — `try`/`catch`/`finally` under strict-mode `unknown`

**Why it's hard.** The strict-mode `unknown`-typed catch parameter is the single change that breaks every catch block written before TS 4.4. The student has to internalize that `err.message` is a compile error *and* that `finally` is for side effects, not control flow — two unrelated rules sharing one syntax.

**Ideal teaching artifact.** One annotated snippet at the center of the lesson, walked in passes: the `try` block with a synchronous throw, the `catch (err)` parameter highlighted with the `unknown` type surfaced inline, `err.message` underlined as a compile error, and the `finally` block annotated as a side-effect-only zone. The same block evolves under the student's eyes: pass 1 shows the compile error on `err.message`, pass 2 adds a comment "narrowing comes in 2.8.2 — leave this broken on purpose," pass 3 shows a `return` inside `finally` overriding the `try`'s `throw`, with the override traced as the next step. The mechanics teach themselves when the student sees what each line *does* in sequence rather than reading rules.

**Engagement.** A `PredictOutput` drill: three small `try`/`catch`/`finally` programs whose output depends on whether `finally` returns, whether the catch swallows, and whether a bare `catch` shape was used. The student predicts what each prints; wrong attempts surface the rule.

**Components.**
- `AnnotatedCode` for the stepped walkthrough of the central snippet, with each step highlighting one part (catch type, `finally` side effects, the `return`-in-`finally` override).
- `PredictOutput` for the recall drill.
- `Term` on "useUnknownInCatchVariables" so the strict-mode flag name is one hover away without breaking prose.

## Concept 3 — Rejected Promises are throws at the await site

**Why it's hard.** The student already knows `try`/`catch` and already knows `await`. The trap is the seam: an `async` function called without `await` inside `try` looks identical to one called with `await`, and only one is catchable. The `return await` discipline from 2.7.3 lands here as the second half of the same reflex.

**Ideal teaching artifact.** A side-by-side comparison of three near-identical snippets that look the same and behave differently. Left: `try { await fetchInvoice() } catch` — catches. Middle: `try { fetchInvoice() } catch` — escapes as unhandled rejection. Right: `try { return fetchInvoice() } catch` — escapes because the function has already returned. The student reads all three before any explanation, then the prose names what differs. This is a Mechanics-via-comparison artifact: the misconception is "they all look the same" and the only way to dislodge it is to put the three forms one tab away from each other and force the eye to compare.

**Engagement.** A `Tokens` exercise on a longer snippet — the student clicks the `await` keywords (and their absence) that determine whether each Promise rejection is catchable. Decoys include `.then` calls and Promise constructors. The click confirms recognition.

**Components.**
- `CodeVariants` for the three-tab side-by-side, with each tab's prose naming what differs from its neighbors.
- `Tokens` for the await-recognition drill.

## Concept 4 — The `Result<T, E>` shape with a discriminated `E`

**Why it's hard.** Students who hear "return errors instead of throwing" gravitate to one of two failure modes: a generic `Result<T, string>` (the `E` collapses to a message and the caller learns nothing), or `Result` everywhere (operator-error failures end up in the return channel where the caller can't fix them). The shape only earns its weight when `E` is a discriminated union the caller branches on with `assertNever` exhaustiveness.

**Ideal teaching artifact.** A two-beat Pattern artifact. First beat: a labeled code block showing the canonical `type Result<T, E>` shape, the `ok`/`err` helpers, and `parseInvoiceCsv` returning `Result<Invoice[], { code: 'INVALID_ROW'; row: number } | { code: 'OUT_OF_RANGE'; column: string }>`. The block is annotated to highlight three load-bearing pieces — the `never` on each helper's absent side, the literal-tagged variants in `E`, and the call-site `switch` with `assertNever`. Second beat: a `TypeCoding` exercise where the student writes the call-site `switch` and the compiler refuses to build until every variant is handled. The exhaustiveness check *is* the lesson; making the compiler enforce it in a live editor is how it sticks.

**Engagement.** The `TypeCoding` exercise itself carries assessment — the student cannot pass without handling every variant. Follow with a one-question `MultipleChoice` after the exercise asking which of four candidate function signatures is misusing `Result` (the one with `Result<T, 'DATABASE_DOWN' | 'TIMEOUT'>` — operator errors in the return channel).

**Components.**
- `AnnotatedCode` for the canonical `Result` shape, walked through the three highlighted moves.
- `TypeCoding` for the exhaustive-`switch` exercise — the type-only nature is exactly right here because the lesson is *that the compiler enforces it*.
- `MultipleChoice` for the misuse-recognition follow-up.

## Concept 5 — Narrowing `unknown` in the catch, including the cross-realm gotcha

**Why it's hard.** Two reflexes have to interlock. The student needs `instanceof Error` as the cheap default and `error.name` as the realm-safe fallback — and has to recognize which moments demand which. The cross-realm scenario is invisible until something breaks production (a worker error caught in the main thread silently slips past `instanceof Error`); the only way to teach it before it bites is to show *why* the constructor identity fails across realms.

**Ideal teaching artifact.** Two adjacent artifacts. First, a wrong-then-right paired snippet (`CodeVariants`) showing the unguarded `err.message` compile error on the left and the `instanceof Error` narrow on the right. Second — and this is the load-bearing one — a hand-drawn SVG diagram in a `Figure` showing two realms (main thread and Web Worker) as separate boxes, each with its own `Error` constructor as a colored marker inside. An error object is thrown in the worker, crosses the postMessage boundary, and lands in the main-thread catch. The diagram highlights the constructor identity check (`err.constructor === Error`) and traces the prototype chain crossing the realm boundary to a *different* `Error` reference, then annotates the two fixes: `Error.isError(err)` (the 2026 constructor-identity-free check) and `err.name === 'AbortError'` (string comparison, realm-safe). The student sees *why* `instanceof` fails — it isn't a TS quirk, it's two physical `Error` objects.

A second beat covers `ensureError` as the third-party-seam normalizer: one labeled snippet showing the helper in `/lib/errors.ts` and the catch becoming `catch (err) { const error = ensureError(err); ... }`.

**Engagement.** A `CodeReview` exercise on three catch blocks: one with unguarded `err.message`, one using `instanceof Error` across a worker boundary, one missing `ensureError` at a vendor seam. The student leaves inline comments naming each bug — the act of *diagnosing* in someone else's code is what tests whether the three reflexes are now reading reflexes.

**Components.**
- `CodeVariants` for the wrong-then-right narrow.
- `Figure` containing a hand-authored SVG of the two realms, the two `Error` constructors, the prototype-chain crossing, and the `Error.isError()` fix annotated. This is realm-specific anatomy; `ArrowDiagram` would force the realms into generic boxes and lose the constructor-identity emphasis.
- `AnnotatedCode` for the `ensureError` helper.
- `CodeReview` for the three-catch diagnostic exercise.

## Concept 6 — Custom `Error` subclasses with literal `name`, `code`, and `Error.cause`

**Why it's hard.** This is the chapter's center of gravity and the place students most often over-build. Junior instinct reaches for an abstract `AppError` base class, a class taxonomy, and string-parsing the `message` field. The 2026 senior shape is the opposite: flat subclasses, a `readonly name = 'BillingError' as const` discriminant, structured `code` fields the catch branches on, and `Error.cause` for the original failure — *that's it*. Plus the rewrap-at-the-seam pattern and the chain-walking helper with its loop guard.

**Ideal teaching artifact.** Two beats, one structural code block at the heart of each.

First beat — the canonical `BillingError`: a single labeled block showing the full subclass with side annotations on the four senior moves (literal-typed `name`, typed `code` union, `{ cause }` passthrough to `super`, no abstract base). The block has to be readable as a whole — this is the shape the student will copy-paste at every domain seam for the rest of the course. Walk it once, annotate the four moves with `AnnotatedCode` steps, then leave the unannotated form on the page as the reference.

Second beat — the cause chain. Two adjacent snippets: the rewrap-at-the-seam pattern (catching a Stripe error, throwing `new BillingError('card_declined', '...', { cause: stripeError })`) and the chain-walker that recursively reads `err.cause` with a cycle guard. A small `Figure` between them shows the cause chain as a linked list — `BillingError` → `StripeNetworkError` → `FetchError` — with the walker's traversal animated frame-by-frame in a `DiagramSequence` so the student sees the loop guard kick in when a cycle is constructed.

**Engagement.** A `ScriptCoding` exercise: the student authors a `RateLimitError` subclass with a literal `name`, a `retryAfter: number` field, and `{ cause }` passthrough, then writes the catch block that discriminates it from `BillingError` and a generic `Error` in the canonical order (specific subclass → `error.name` → generic `Error` → `ensureError`). The tests verify the literal `name`, the structured field, the cause linkage, and the catch ordering. The writing-and-testing combo is what locks the shape in.

**Components.**
- `AnnotatedCode` for the `BillingError` walkthrough with the four annotated moves.
- `DiagramSequence` for the cause-chain traversal — each step shows the walker reading one link, the cycle detection on the final step.
- `Figure` with a hand-authored SVG of the cause chain as a linked list (between the two cause snippets). Single-use here, but the cause-chain visual will recur in Unit 20.1 when `logError` walks the chain in production — keep it as a reusable SVG primitive.
- `ScriptCoding` for the `RateLimitError` authoring exercise.
- `SandboxCallout` (optional) with a working `Error.cause` chain pre-built so curious students can poke at the walker.

## Component proposals

None. Every concept above maps onto existing components in `INDEX.md`. The two visual artifacts that aren't standard widgets — the cross-realm `Error` constructor diagram (Concept 5) and the cause-chain linked-list diagram (Concept 6) — are hand-authored SVGs inside `Figure`, which is exactly what `Figure` is for. Neither recurs often enough in this chapter to justify a bespoke component, and the cross-realm diagram is single-use; the cause-chain diagram has a forward link to Unit 20.1's structured-log walker but is still served well by a reusable SVG asset rather than a parameterized component.

## Build priority

No new components to build. The chapter's load is carried by `AnnotatedCode`, `CodeVariants`, `DiagramSequence`, and the `Result`-shape `TypeCoding` — all already in the toolkit. If anything is worth tightening on the framework side, it's making sure `TypeCoding` can surface a `switch` exhaustiveness failure as a readable diagnostic (Concept 4 depends on that being legible), and that hand-SVG `Figure` content has a documented authoring pattern so the realm and cause-chain diagrams land consistently.

## Open pedagogical questions

- Concept 5's realm diagram works only if the student already has a mental model of "a realm" as a thing. 2.6.2 named `'use client'` and the module-graph rule but didn't draw realms as memory-distinct contexts. Worth checking whether the diagram needs a one-paragraph realm primer before the constructor-identity reveal, or whether the picture itself carries the concept.
- Concept 4's `TypeCoding` exhaustiveness exercise assumes 2.5.3's `assertNever` is recallable. If retention is uneven across the gap between 2.5 and 2.8, a one-line forward-link callback at the top of Concept 4 may earn its weight.

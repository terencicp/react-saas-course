# Chapter 2.2 — Pedagogical approach

## Concept 1 — Arrow `const` as default, three triggers earn `function`

**Why it's hard.** The returning dev remembers the 2018-era arrow-vs-`function` debate and rotates between forms by mood. The teaching has to install a single default and a closed list of trigger conditions, not a survey.

**Ideal teaching artifact.** Decision archetype. Open with a side-by-side panel showing all three forms (arrow `const`, declaration, method shorthand) for the same trivial helper, so the student sees the syntax differences inert. Then introduce the decision as a flowchart with one entry — "writing a new function?" — and four exits: the default arrow `const`, plus three trigger branches (hoisting, named recursion, type-guard signature). Each trigger branch terminates in a one-line snippet that *only compiles* in the declaration form, making the trigger structural rather than stylistic. The type-guard branch is the strongest evidence — the predicate `x is User` literally fails to parse on an arrow, and the student sees that in a `TypeCoding` block.

**Engagement.** A `Buckets` sort of the eight function situations the chapter outline names (click callback, `.map` projection, recursive tree walker, type predicate, config-object method, React component, top-of-file helper used above its declaration, Server Action) into `arrow const` or `function declaration`. The sort is the senior-reflex install.

**Components.**
- `CodeVariants` for the three-form side-by-side opener.
- `Figure` wrapping a hand-authored SVG flowchart (one entry, four exits) — or a small Mermaid flowchart if the trigger branches stay text-only.
- `TypeCoding` to demonstrate that `x is User` doesn't parse on an arrow.
- `Buckets` for the closing sort.

## Concept 2 — Implicit return, block body, and the object-literal parens trap

**Why it's hard.** `(x) => { name: x }` is the single most reliable arrow bug — the braces parse as a block with a labeled statement, return is `undefined`, and the failure is silent at the call site. The student has to internalize the parser rule, not just memorize the parens.

**Ideal teaching artifact.** Mechanics archetype, ambush form. Show the broken `(x) => { name: x }` first with its `undefined` output adjacent, and ask the student to predict the output *before* the reveal. The misdirection makes the parser ambiguity tangible: the body *looks* like an object literal, but the parser sees `{` and commits to a block. The reveal shows the same expression with `({ name: x })` and the corrected output. One follow-up beat names the rule generally: any time the body is a single object literal, the literal needs parens.

**Engagement.** `PredictOutput` is the artifact — withheld output on the broken form is what teaches. Confirm recall with one `Tokens` click asking the student to identify which character pair fixes the bug on a third snippet.

**Components.**
- `PredictOutput` carries the artifact.
- `Tokens` for the recall click.

## Concept 3 — The two-positional-parameter rule and the options-object shape

**Why it's hard.** Junior code defaults to positional arguments because the syntax is shorter. The senior reflex flips at parameter three — past two, the call site stops self-documenting and adding a parameter is a breaking change. The teaching has to install the threshold *and* the replacement shape together; either alone is incomplete.

**Ideal teaching artifact.** Pattern archetype. Open with the canonical horror — `createUser('alex', 'a@x.com', true, false, true)` — and a `CodeReview`-style question: which call argument is the `admin` flag? The student can't answer without opening the function. The reveal shows the options-object replacement adjacent: `createUser({ name, email, admin: true, sendWelcome: true, verified: false })`. The lesson then states the rule (two is the threshold; comparators and reducers earn the exception) and shows the canonical signature-destructure shape that 2026 Server Actions, Drizzle calls, and React components share.

**Engagement.** A `CodeReview` exercise on a 5-positional-argument `createInvoice(...)` signature: the student leaves an inline comment naming the failure mode and writes the options-object refactor as the suggested change. The before/after carries both the recognition reflex and the refactor reflex.

**Components.**
- `CodeVariants` for the positional-vs-options side-by-side.
- `CodeReview` for the refactor exercise.

## Concept 4 — Parameter defaults fire only on `undefined`

**Why it's hard.** The returning dev expects falsy-coercion semantics — defaults that fire on `0`, `''`, or `false` because that's what `||` does. The actual rule is `===  undefined`, and the bugs ship when `0` is a meaningful page index or `''` is a deliberately-blank user input.

**Ideal teaching artifact.** Decision archetype with a comparison table as the centerpiece. The student sees a single function `function paginate({ pageSize = 20 }) { return pageSize; }` and a six-row table: each row is a call (`paginate({})`, `paginate({ pageSize: undefined })`, `paginate({ pageSize: null })`, `paginate({ pageSize: 0 })`, `paginate({ pageSize: '' })`, `paginate({ pageSize: false })`) and the student fills in the output. The values that diverge from intuition (`null`, `0`, `''`, `false` *all* pass through as the explicit value, not the default) are the recall hooks.

**Engagement.** `PredictOutput` *is* the artifact — six predictions, output withheld on the first wrong attempt per row. The mechanic forces the student to commit before the reveal.

**Components.**
- `PredictOutput` configured with six call cases against the same function.

## Concept 5 — Rest at the signature, spread at the call site

**Why it's hard.** The same `...` token does opposite things depending on position. Rest collects (one parameter, many arguments → array); spread distributes (one array → many arguments). The student who's seen both before holds them as "same operator, just intuit it" and gets bitten when the wrapper function they wrote doesn't preserve the wrapped function's signature.

**Ideal teaching artifact.** Concept archetype, two-direction diagram. A `Figure`-wrapped hand-authored SVG with two parallel scenes: on the left, three call-site arguments funneling into a single `...args` array inside the function (rest collects); on the right, an `...args` array inside the wrapper exploding back into three positional arguments on the downstream call (spread distributes). The arrows go opposite directions on purpose. Underneath, one `TypeCoding` block where the student writes a typed `wrap(fn)` that takes `...args` and forwards `...args`, watching TypeScript infer the wrapper's signature to match the wrapped function's.

**Engagement.** A `ScriptCoding` block asking the student to write `logCalls(baseFn)` that wraps a function, logs its arguments, and forwards the call. Tests catch both directions — incorrect rest (missed arguments) or incorrect spread (forwarded as a single array).

**Components.**
- `Figure` with hand-authored SVG showing the collect-vs-distribute duality.
- `TypeCoding` for the inferred-signature beat.
- `ScriptCoding` for the wrapper exercise.

## Concept 6 — Names communicate intent, not implementation

**Why it's hard.** Naming is a discipline learned by reading code, not by writing it. The student writes `data` and `result` because nothing in their flow forces them not to — and the cost of bad names is paid by future readers, never by the writer. The teaching has to install the recognition reflex.

**Ideal teaching artifact.** Concept archetype. Open with a four-row mini-table — one row per naming surface (variable, function, parameter, type) — with a before/after column. The "before" column shows the implementation-leaking form (`userArray`, `processOrder`, `(a, b)`, `InvoiceType`); the "after" shows the intent-revealing form (`users`, `submitOrder`, `(invoice, customer)`, `Invoice`). The variation across the four rows is what makes the principle stick — it's the *same* principle applied to four surfaces, and the student sees that without the prose having to spell it out four times.

**Engagement.** `Matching` exercise pairing six bad names with the surface they violate and the fix. The matching mechanic forces the student to read each name and commit before the line draws.

**Components.**
- `Figure` wrapping a 4-row HTML table (or a `TabbedContent` with one panel per surface, if interactivity helps reveal each row).
- `Matching` for the recall round.

## Concept 7 — Boolean prefixes and the negation hazard

**Why it's hard.** `notDisabled` reads forward and inverts at the use site as `!notDisabled`, which is "enabled" but doesn't say so. The double-negative shape is invisible to the writer and a re-reading tax to every future reader.

**Ideal teaching artifact.** Concept archetype with a punchy ambush. Show a one-line conditional: `if (!user.notDisabled) { redirectToBlocked(); }` and ask the student plainly: "Should `user` be redirected when they're enabled or when they're disabled?" The cognitive effort to answer *is* the lesson. Reveal both the parse and the fix — rename to `isEnabled`, rewrite as `if (!user.isEnabled) { ... }`, which reads "if user is not enabled, redirect." Follow with the four-prefix convention (`is*`, `has*`, `can*`, `should*`) as a one-paragraph reference.

**Engagement.** `MultipleChoice` (auto-switching to multi-select) asking the student to pick which of six identifiers cleanly communicate truth condition: `isAdmin`, `loaded`, `notDisabled`, `hasUnpaidInvoices`, `canEdit`, `noErrors`. The decoys are the negated and prefix-less forms.

**Components.**
- `MultipleChoice` in multi-select mode.

## Concept 8 — The three bad-name classes (recognition reflex)

**Why it's hard.** A senior spots `data` and `userArray` and `helper` as smells in three seconds because they've internalized the *classes* of bad name, not specific names. The student needs the same classifier — leaking, vague, negated — and the only way to install a classifier is to make them classify.

**Ideal teaching artifact.** Pattern archetype, recognition-first. Show a 12-line code block with five named identifiers, three of which violate one of the bad-name classes (e.g. `customerArray`, `data`, `notLoaded`). The student reads in `CodeReview` mode and leaves inline comments naming the class each violates. The artifact carries the assessment — the grading rubric is "did the student classify each smell correctly?"

**Engagement.** The `CodeReview` carries the recall. Confirm with one `Buckets` exercise sorting six new names into the three buckets (leaking, vague, negated) plus an "acceptable" bucket. The bucket sort is faster and confirms the classifier is internalized, not just exercised once.

**Components.**
- `CodeReview` with three target smells in one file.
- `Buckets` (3+1 categories) for the confirmation sort.

## Concept 9 — Guard clauses and "no else after return"

**Why it's hard.** The junior pattern of `if (valid) { ... happy path ... } else { return error; }` reads top-to-bottom but pushes every line of business logic one indentation level deeper. The senior reflex inverts: invalid-first, return-immediately, then unindented happy path. The student has to feel the readability difference, not just be told.

**Ideal teaching artifact.** Pattern archetype. Show the nested-`if` original (four levels deep, the happy path buried at the bottom) adjacent to the flattened guard-clause version (four guards, then the happy path at the outer indent). `CodeVariants` with the two side by side, plus a third tab showing the flattened version *minus* the redundant `else` blocks that Biome's `noUselessElse` would auto-fix. The three-tab progression — nested → flattened with `else` → flattened without `else` — is the lesson.

**Engagement.** One `ScriptCoding` exercise where the student takes a four-level-nested `validateOrder(order)` and refactors to guard clauses, with tests passing on the refactored form. The refactor is the lesson's confirmation; success means the student moved each invalid case to its own guard.

**Components.**
- `CodeVariants` with three tabs (nested → guards-with-else → guards-without-else).
- `ScriptCoding` for the refactor.

## Concept 10 — Exhaustive `switch` with `assertNever`

**Why it's hard.** The classic missing-case bug is structurally invisible: the `switch` compiles, the runtime returns `undefined` on the missed variant, and the bug surfaces in production. The fix — `assertNever` in the default case — turns the bug into a *compile* error, but only if the student understands *why* the type `never` is unreachable at compile time when every variant is handled, and *reachable* when one is missed.

**Ideal teaching artifact.** Mechanics archetype with type-checker theater. Open with a `Status = 'paid' | 'pending' | 'failed'` union and a `switch` that handles all three. Show the `assertNever` default-case shape and the compile-clean state. Then mutate the union — add a fourth variant `'refunded'` — in front of the student in a `TypeCoding` block. The compile error appears on the `assertNever(status)` call: "Argument of type 'refunded' is not assignable to parameter of type 'never'." The narrowing-makes-never-unreachable mental model lands because the student watched it break.

**Engagement.** `PredictOutput` on three `switch` snippets: one with fallthrough caught by `noFallthroughCasesInSwitch`, one with `assertNever` catching a missing case, one correct. The student commits to the predicted behavior per snippet before the reveal.

**Components.**
- `TypeCoding` showing the union-extension causing the `assertNever` compile error.
- `PredictOutput` with three switch scenarios.
- `Aside` (caution) naming the `noFallthroughCasesInSwitch` tsconfig flag from Chapter 1.4.3.

## Concept 11 — The 2026 loop hierarchy and the `for...in` trap

**Why it's hard.** Five loop forms exist (`.map`-family, `for...of`, C-style, `for...in`, `while`), and the returning student remembers seeing all of them. The senior reach is a strict hierarchy: array methods first, `for...of` for side effects, C-style for index-as-data, `for...in` never. The teaching has to install the hierarchy as a decision, not as a survey.

**Ideal teaching artifact.** Decision archetype. A four-row decision table: each row names a situation ("transforming a list to a list," "writing/awaiting per element," "iterating numeric ranges where the index is the data," "iterating object key-value pairs") and the senior reach for that row (`.map`, `for...of`, C-style with explicit comment naming why, `for (const [k, v] of Object.entries(obj))`). The `for...in` row is the trap — show one snippet where `for...in` iterates inherited prototype keys and produces a wrong count, and name the rule: never write `for...in`.

**Engagement.** One `ScriptCoding` block where the student rewrites a `for...in` loop over an object to `Object.entries` + `for...of`, with tests catching both the inherited-key bug and the wrong key type.

**Components.**
- `Figure` wrapping the decision table (HTML table inside `Figure`, with captions).
- `ScriptCoding` for the rewrite.

## Concept 12 — `||` vs `??` and the falsy-default trap

**Why it's hard.** The senior who reaches for `||` on `pageSize || 20` has shipped that bug at least once — a user explicitly sets `pageSize: 0` (maybe to mean "all") and `||` swaps it for the default. The trap is that `||` and `??` look interchangeable until the input is `0`, `''`, or `false`. The teaching needs to make the semantic difference unavoidable.

**Ideal teaching artifact.** Mechanics archetype, comparison-table form. A six-column table: rows are the six input values (`0`, `''`, `false`, `null`, `undefined`, `'value'`), columns are `input || 'default'` and `input ?? 'default'`. The student fills in both output columns per row. Three rows differ (`0`, `''`, `false`) — those are the three bug shapes. The table is the teaching artifact; once the student has filled it, the rule states itself: `??` for "missing" defaults, `||` for "truthy" decisions.

**Engagement.** `PredictOutput` *is* the artifact — six rows times two operators, withheld output. Confirm recall with one `MultipleChoice` round on three real-world snippets ("which operator does `const enabled = config.enabled ?? true;` need? `||` or `??`?") to test transfer.

**Components.**
- `PredictOutput` configured as a 6×2 table — or a new component if the existing `PredictOutput` doesn't render multi-column.
- `MultipleChoice` for the transfer test.

## Concept 13 — Optional chaining discipline (`?.`, `??=`, and the precedence rule)

**Why it's hard.** Two failure modes from the same operator. Under-question-marking — `a?.b.c` still throws if `b` is nullish — is the bug from a junior who learned that `?.` "makes things safe." Over-question-marking — `user.profile?.address` when `profile` is type-required — quietly swallows a real bug when the type later becomes nullable. The senior reflex is "question-dot exactly where the type acknowledges nullable, nowhere else." Plus the precedence rule: `a || b ?? c` is a syntax error, by design.

**Ideal teaching artifact.** Pattern archetype. Show three short snippets in a `CodeVariants`: (1) under-questioned `a?.b.c` with the runtime error, (2) over-questioned `user.profile?.address` with a comment noting the silenced future bug, (3) the correctly-shaped version where `?.` lines up with the nullable boundary the type annotation declares. The student sees that the right placement comes from the *type*, not from defensive instinct. Then a one-line beat on `??=` for lazy init (`cache[key] ??= compute(key)`) and a `SandboxCallout` where the student types `a || b ?? c` and watches the parser reject it.

**Engagement.** One `ScriptCoding` block where the student writes a `getCity(user)` that uses `?.` at exactly the nullable boundaries declared by a given `User` type, with tests that fail both on under-marking (throws on real input) and over-marking (returns `undefined` where TS guaranteed a value).

**Components.**
- `CodeVariants` with three tabs (under, over, correct).
- `SandboxCallout` for the precedence reject.
- `ScriptCoding` for the typed-boundary exercise.

## Concept 14 — Destructure-then-rebuild prevents accidental forwarding

**Why it's hard.** Wholesale forwarding (`callDownstream(options)`) is invisibly correct until someone upstream adds a field. The new field rides along to the downstream call — sometimes leaking a password to an audit log, sometimes a stale `id` to a third-party API. The teaching has to install a structural reflex: never forward the object, always destructure exactly the fields you mean and rebuild.

**Ideal teaching artifact.** Pattern archetype, before-and-after. Show `createUser` that receives `{ name, email, password, ...rest }` from form input and forwards the whole object to an audit-log call. The audit log now contains the password. Show the fix — destructure exactly `{ name, email }` and pass `{ name, email }` to the audit log, never the wholesale object. The structural payoff lands when the prose names what changed: *adding* a field upstream now requires the developer to *choose* to forward it. A new field can't leak by accident.

**Engagement.** A `CodeReview` exercise on a small `submitOrder(form)` function that wholesale-forwards `form` to two downstream calls (one of which writes to an audit log). The student leaves inline comments on both forwarding lines and writes the destructure-then-rebuild fix on each.

**Components.**
- `CodeVariants` with two tabs (wholesale-forward leaking → destructured-rebuild safe).
- `CodeReview` for the practice round.

## Concept 15 — Closures: lexical capture by reference, and the stale-closure trap

**Why it's hard.** Closures are the most-foundational concept in the chapter and the one with the longest forward dependency — `useEffect` cleanups, Server Action captures, and route-handler factories all depend on the same mental model. The trap is that the closure holds a *reference* to the binding, not a snapshot of its value; the binding's value at *call time* is what the closure sees, not the value at *definition time*. The student who holds "the closure captures the value" ships the stale-closure bug.

**Ideal teaching artifact.** Concept archetype, two-beat. First beat is a `Figure`-wrapped hand-authored SVG: one function body in a box, with two outgoing arrows labeled "reference to binding" pointing at two outer-scope bindings drawn as labeled cells. A call-site arrow enters the function. A caption: "the closure holds references, not values." The cells have a small `T0 = 1, T1 = 2` annotation showing the value changing over time — when the function is called at T1, it reads the binding's current value, not the value-at-definition. Second beat is the stale-timer worked example in a `ScriptCoding` block: a `setTimeout`-per-item loop, the bug with a shared mutable counter, and the fix that each iteration's `let`/`const` produces a fresh binding. The diagram installs the model; the worked example installs the trap and the fix.

**Engagement.** `PredictOutput` on four small closure scenarios that the chapter outline already names — a counter factory, a delayed-fire timer set inside a loop, a Server-Action-shaped function attempting to capture per-request data at module scope, and a `useEffect`-shaped function referencing stale state. The four predictions confirm the model transfers across the three production sites.

**Components.**
- `Figure` with hand-authored SVG showing the reference-not-value model and time-stepped binding values.
- `ScriptCoding` for the stale-timer worked example.
- `PredictOutput` for the four-scenario confirmation.

---

## Component proposals

- **`PredictOutputTable`** — `PredictOutput` variant that renders a multi-row, multi-column table where the student fills each cell before reveal. Inputs: a function-under-test, a list of input rows, a list of operator/expression columns; renders a grid of inputs to outputs with per-cell reveal.
  - **Uses in this chapter** — Concepts 4 (parameter-default semantics across six input cases) and 12 (`||` vs `??` across six input cases).
  - **Forward-links** — Chapter 2.1.2 equality-and-coercion tables; Chapter 2.4.6 narrowing-by-`typeof` matrices; Chapter 2.7.1 microtask-vs-macrotask order predictions. Compounds across the curriculum wherever the teaching artifact is a 2-D semantic table.
  - **Leanest v1** — Just an HTML table where each cell wraps a single-input `PredictOutput`. No new grading or rendering — composition only. Same teaching weight, near-zero build cost.

None — the closure-diagram, options-object SVG, and rest/spread duality SVG are all served by `Figure` + hand-authored SVG and do not need a bespoke component.

## Build priority

The only proposal worth building is `PredictOutputTable`, and the leanest v1 (composition over the existing `PredictOutput`) is the right scope. The proposal is load-bearing across at least two chapter concepts and forward-links cleanly into Chapter 2.1's equality tables, 2.4.6's narrowing tables, and 2.7.1's microtask-ordering scenarios. Build the composition wrapper; do not build a new grading engine.

Every other concept in the chapter maps cleanly onto existing components (`CodeVariants`, `TypeCoding`, `ScriptCoding`, `PredictOutput`, `CodeReview`, `Buckets`, `Matching`, `MultipleChoice`, `Tokens`, `Figure` + hand-authored SVG, `SandboxCallout`). No bespoke single-use components are warranted.

## Open pedagogical questions

- For Concept 10 (`assertNever`), the teaching depends on the student watching a `TypeCoding` block re-compile when a union variant is added. Confirm that `TypeCoding`'s author-controlled edit affordance (or its Twoslash flow) can show the diagnostic appearing without requiring the student to type the variant themselves — the "watch the type checker speak" beat is the lesson.
- For Concept 13 (`SandboxCallout` showing `a || b ?? c` as a parse error), confirm the sandbox surfaces parser errors clearly in its console panel; if it swallows them, fall back to a static `Code` block with the error message annotated.

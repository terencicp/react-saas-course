# Chapter 2.5 — TypeScript moves that prevent bug classes

## Concept 1 — The impossible-state bug class

**Why it's hard.** The flag-set shape (`isLoading`, `isSuccess`, `data?`, `error?`) reads as ordinary code and the type checker shrugs at it, so the student doesn't notice that the type admits four states the runtime can never produce. The misconception is that "the bug is in the rendering code" — the bug is upstream, in a type that allowed the impossible combination to be written down at all.

**Ideal teaching artifact.** A misconception-first ambush. The student lands on a `RequestState` flag-set type and a small UI snippet that reads `state.data.name`. Both look fine. They're asked to predict what the runtime would do in a particular field combination (`isLoading: true, error: someError, data: undefined`) — the answer is "crash, and the type allowed it." A truth-table panel then enumerates the 16 combinations the flag-set type admits versus the 4 the runtime ever produces; the student visually sees the 12 ghost rows the compiler is failing to reject. The reveal: a discriminated-union version shrinks the truth table to exactly the 4 reachable rows. The artifact is a **state-space audit** — a new pedagogical archetype that visualizes "states the type allows" minus "states the runtime produces" as the gap the pattern closes.

**Engagement.** A `PredictOutput`-shaped prediction round before the truth table is revealed: given three impossible-on-paper field combinations, the student predicts whether the type accepts them, then sees that all three compile.

**Components.**
- `PredictOutput` for the opening crash-prediction prompt.
- Hand-SVG truth table inside `Figure` — 16-row grid for the flag-set version, 4-row grid for the discriminated version, with the 12 ghost rows visually struck through. Single-use in this chapter; no forward link justifies a bespoke component.
- `CodeVariants` for the flag-set vs. discriminated-union side-by-side.

## Concept 2 — Discriminant as the compiler's hook

**Why it's hard.** The student can copy the `status: 'idle' | 'loading' | 'success' | 'error'` shape, but doesn't yet feel *why* the literal field is load-bearing — that the compiler tracks the discriminant across `if`, `switch`, and equality, and that without it narrowing falls back to property-presence checks that drift. The deeper miss is that the four canonical SaaS variants (request state, Result, event message, UI variant) all use the same hook with different discriminant names by convention.

**Ideal teaching artifact.** A controllable narrowing visualizer. The student picks one of four canonical variants (request state / Result / event message / UI variant) from a tab strip, and a split panel shows the union type on the left and a function body on the right. The student types or selects a discriminant check (`status === 'success'`, `'data' in state`, `kind === 'button'`) and the right panel re-renders showing the narrowed type at the cursor — what fields are now safely accessible. The point lands when the student tries `'data' in state` and sees a *worse* narrow than `status === 'success'` produces; the discriminant is the cleaner hook. This is a `TypeCoding`-shaped artifact extended with a variant-picker — the four canonical shapes share a teaching slot instead of getting four separate lessons.

**Engagement.** A `Buckets` exercise sorting eight scenarios ("async fetch lifecycle," "a function that can fail predictably," "webhook payload," "a button-or-link component," "a form field that's text-or-number-or-select," "a feature flag's on/off state," "a polymorphic toast notification," "an idempotent settings value") into "discriminated union" or "plain shape."

**Components.**
- `TypeCoding` carries the narrowing-visualizer surface — `^?` queries inside discriminant branches show the narrowed type the compiler computes. The four canonical variants ship as four pinned `TypeCoding` exercises rather than one bespoke widget.
- `Buckets` for the closing sort.
- `CodeTooltips` on the discriminant field across the four canonical variants — hover reveals "status / kind / type / ok — same hook, conventional name per seam."

## Concept 3 — States plus transitions (the machine view)

**Why it's hard.** Variants alone don't constrain *which next state* a transition can produce. The student writes `setState({ status: 'success', data })` from inside the `error` branch and the type happily accepts it. The miss is that valid transitions live on the *functions*, not on the union — and that per-state invariants (the `controller` only on `uploading`, the `url` only on `done`) are the structural way to write "this data is only meaningful here." Mermaid diagrams are easy to read but easy to dismiss as "documentation"; the lesson has to bind the diagram to the type signatures, not just present them side by side.

**Ideal teaching artifact.** A two-pane explorable. Left pane: a Mermaid state diagram of the upload machine with nodes for `idle / uploading / done / error / aborted` and labeled transition edges. Right pane: the discriminated-union type and the four transition signatures (`start`, `progress`, `succeed`, `fail`, `cancel`). The student clicks an edge in the diagram and the corresponding transition function's signature highlights on the right, with the per-state invariants (the `controller` field on `uploading`, the `url` field on `done`) called out in the type. The student then clicks an *invalid* edge — drawn dashed — and the right pane shows the call site failing to compile with the actual TypeScript error. The artifact teaches that the diagram and the types are the same artifact in two notations; the senior reads both fluently.

The follow-up beat: a stripped-down version of the same artifact for two of the three canonical SaaS machines (optimistic mutation, Stripe subscription lifecycle), so the student sees the same shape recur. Upload is the worked example; the other two appear as variations.

**Engagement.** A `Matching` exercise pairing four real SaaS features ("invoice payment retry," "file upload," "draft-to-published article," "Stripe subscription lifecycle") to the state-machine diagrams that fit them.

**Components.**
- `StateMachineExplorer` (new) — Mermaid diagram on the left, type-and-signatures on the right, click-an-edge bidirectional binding. Recurs three times in this chapter (upload, optimistic mutation, subscription) and forward-links to Unit 7.2 (Server Action result), Unit 12.2 (Stripe subscription status), Unit 16.2 (optimistic mutation). Worth the build.
- `Matching` for the SaaS-feature-to-diagram pairing.
- Alternative if `StateMachineExplorer` isn't built v1: a pair of `TabbedContent` panels — tab the three machines, each tab showing the Mermaid diagram next to the `Code` block, with `AnnotatedCode` highlighting per-state invariants step by step.

## Concept 4 — Exhaustiveness as a compile-time alarm

**Why it's hard.** The student understands "handle every case" as a code-review concern, not as something the compiler enforces. The bug class lands six months later, when a new variant is added to the union and the existing `switch` silently doesn't handle it. The two idioms (`assertNever` and `satisfies never`) look like ceremony unless the student feels the alarm fire — sees the red squiggle appear the instant a fifth variant is added.

**Ideal teaching artifact.** A wrong-by-default sandbox that the student has to repair, then break on purpose. Stage 1: the student is given a four-variant union and a `switch` with the `default` falling through to a no-op; they predict what happens when a fifth variant is added (nothing — silent miss). Stage 2: they add `assertNever(event)` at the bottom; the test that adds a fifth variant to the union now produces a compile error pointed at the assert call. Stage 3: they swap to `satisfies never` and the same test still fails — same alarm, no runtime cost. The artifact carries the assessment: the student has watched the compiler refuse to build twice in the same exercise.

**Engagement.** A `Matching` round pairing four narrowing scenarios ("filter `(User | Guest)[]` to `User[]`," "validate `unknown` from the wire," "assert a fixture in a test," "make `switch` refuse to compile on a new variant") to the right tool (`isFoo`, `assertIsFoo`, `assertNever`, `satisfies never`) — this also functions as the bridge into Concept 5.

**Components.**
- `ScriptCoding` (or `TypeCoding` if the runtime throw isn't being exercised) staged across three test cases — the staging is the lesson.
- `Matching` for the closing pairing.

## Concept 5 — Block-scoped vs. scope-wide narrowing

**Why it's hard.** Type predicates (`value is User`) and assertion functions (`asserts value is User`) look almost identical in source — both return-type annotations on a function that runs a check. The difference is *where* the narrow applies: predicate narrows only inside an `if`-block where the call appears; assertion narrows the variable for the rest of the scope after the call returns. The student conflates them, reaches for the wrong one, and either gets `User | Guest` where they expected `User` (predicate reach when they wanted assertion) or scope-pollutes a narrow they wanted contained (assertion reach when they wanted predicate).

**Ideal teaching artifact.** A side-by-side scope-highlight diagram inside `Figure`. Two short functions sit next to each other; in one, `isUser(value)` is called inside an `if`, and the diagram highlights the **block** where `value` is narrowed to `User`. In the other, `assertIsUser(value)` is called as a statement, and the diagram highlights the **rest of the function** where `value` is narrowed. The visual axis is *scope reach*. Below each, the actual filter or test-fixture pattern that earns each form: `.filter(isUser)` for the predicate, the parse-or-throw seam for the assertion.

**Engagement.** A short two-question `MultipleChoice` round: "to filter an array down to a subtype, reach for…" and "to assert a test fixture is valid for the rest of the test body, reach for…"

**Components.**
- Hand-SVG scope-highlight inside `Figure` — two function bodies with colored bands marking the narrowed region. Single-use in this chapter and the narrowing zone visualization is too specific to compound elsewhere; static SVG is the right call.
- `MultipleChoice` for the closing check.

## Concept 6 — Structural vs. nominal: why brands exist

**Why it's hard.** TypeScript's structural-typing default is rarely named explicitly before this lesson. The student has been working inside it for two chapters without realizing that "two `string`s match" is a *policy choice* the language makes, not a fact. Until they see the same-shape-different-meaning collision (`getInvoice(currentUser.id)` compiling cleanly and returning the wrong row), nominal typing reads as theory.

**Ideal teaching artifact.** A real-bug replica. The student is dropped into a 30-line file with two functions — `getInvoice(invoiceId: string)` and `getUser(userId: string)` — and a third caller line that mixes them up. The file compiles. The test runs. The test fails because the wrong row came back. The student reads the test output, sees the row mismatch, and the prose names the failure: structural typing matched `string` to `string`. The fix arrives in three short code blocks — declare the brand, write the factory, watch the call site fail to compile. The senior framing: "the compiler is doing exactly what it was told; the brand is how you tell it more." This is a `script-coding` exercise with a deliberately-failing baseline test the student has to fix at the type level, not the runtime level.

**Engagement.** A `Tokens` click on the fixed code: the student clicks the three locations where the brand earns its weight — the type declaration, the factory's `as` cast (the *only* legal use of `as` for the brand), and the function signature where the brand is enforced. Decoys: the function body, the test assertion, a return statement.

**Components.**
- `ScriptCoding` (or `TypeCoding` if the runtime swap isn't load-bearing) staged with a failing test as the baseline.
- `Tokens` on the three brand-bearing locations.

## Concept 7 — Brand factory and the Zod seam

**Why it's hard.** Brands aren't useful unless they're reliably applied — a brand factory that does nothing more than `value as UserId` is fine for internal seams, but the production seam needs validation. The student has to see that the brand and the parse are the same operation: the brand is what the parse *produces*, not something appended after. Zod's `.brand<'UserId'>()` and Drizzle's `$type<UserId>()` are the two production seams the chapter forward-links to.

**Ideal teaching artifact.** A pipeline diagram showing the lifecycle of an `UserId` from wire to call site. Three stages: wire (`unknown` JSON), parse (Zod schema with `.brand<'UserId'>()` producing the branded type), call site (function signature refusing a non-`UserId` string). The student sees the brand attached at the parse boundary, not floating in space. A second short panel: the Drizzle seam, `text('id').$type<UserId>()`, producing branded row types from the schema. The artifact teaches the brand as a property of a *seam*, not a free-floating decoration.

**Engagement.** A `Sequence` exercise: drag four steps into the correct order — declare brand, write Zod schema with `.brand`, infer type from schema, consume branded type in function signature.

**Components.**
- `ArrowDiagram` inside `Figure` for the three-stage pipeline (wire → parse → call site). Composes well with the Unit 7.1 Zod chapter's existing pipeline framing.
- `Sequence` for the four-step order.
- `Code` with `CodeTooltips` on the Zod and Drizzle integration lines — hover reveals the forward link.

## Concept 8 — Where brands earn vs. don't earn

**Why it's hard.** Once the student has the brand technique, the next failure mode is over-branding — branding article titles and comment bodies because "more types more safety." The cut rule is real and senior: brand values that have semantic identity, cross schema boundaries, and could plausibly be confused with a sibling of the same shape. Free-form user input fails all three tests.

**Ideal teaching artifact.** A direct sort. Eight string values, two buckets — "brand it" / "leave it." The values are drawn from real SaaS code: `userId`, `commentBody`, `stripeCustomerId`, `searchQuery`, `webhookSecret`, `articleTitle`, `sessionToken`, `urlPathSegment`. The student sorts; the feedback explains *why* each lands where it does against the three-test rule. The exercise is the teaching artifact — the rule is internalized through application.

**Engagement.** The `Buckets` exercise itself carries the assessment; the brief follow-up is a single `MultipleChoice` on a borderline case ("the URL slug of a published article — brand?") to confirm the rule transfers.

**Components.**
- `Buckets` for the eight-value sort.
- `MultipleChoice` for the borderline check.

## Concept 9 — Derive types from values, not from prose

**Why it's hard.** The student has been declaring types as separate aliases for two chapters. The reflex is "value here, type there." The misconception is that types and values are *peers* in the codebase; the senior reach is that when a value already encodes the truth (a routes map, a permission table, a locales array), the type comes from the value. The cost of getting this wrong is drift: the routes map gains a new entry, the type alias doesn't, and stale autocomplete ships.

**Ideal teaching artifact.** A two-column drift demo. Left column: the wrong shape — a `ROUTES` object and a separately-declared `RouteName` type alias. The student edits the object (adds a new route) and watches the type stay stale; the autocomplete on a function parameter doesn't pick up the new key. Right column: the same `ROUTES` object with `type RouteName = keyof typeof ROUTES`. The student adds a new route and the type updates instantly; autocomplete now includes it. The artifact is a **live-drift comparison** — the student manipulates one input and watches two outputs diverge. After the comparison: a tight tour of the three operators (`typeof V`, `keyof T`, `T[K]`) and the two load-bearing 2026 idioms (`keyof typeof OBJ`, `typeof ARR[number]`) on the same `ROUTES` and `LOCALES` examples.

**Engagement.** A `script-coding` (or `TypeCoding`) exercise where the student is given a permissions config and types `Permission`, `Role`, and a `hasPermission(role: Role, permission: Permission): boolean` whose argument types derive from the config; a hidden test edits the config and verifies the derived types track.

**Components.**
- `TypeCoding` for the live-drift comparison — the dual-pane runtime with `^?` queries makes the drift visible without a bespoke widget. Pinned scenarios: edit the value, watch the derived type update.
- `TypeCoding` again for the permissions-config exercise.
- `Buckets` (close) sorting six "I want this type" scenarios into the right derivation form (`keyof typeof`, `typeof ARR[number]`, `(typeof OBJ)[K]`, `ReturnType<F>`, `Parameters<F>`).

## Concept 10 — Utility-type toolbox grouped by what it reshapes

**Why it's hard.** Eleven utility types named alphabetically blur into noise. Grouped by what they reshape — field modifiers, field selection, construction, nullability, union-set ops, function-shape, async-shape — they snap into a mental index the student can reach for by intent ("I want fewer fields → `Pick`/`Omit`"). The teaching risk is the survey trap: enumerate eleven things and the signal dies. The fix is intent-first.

**Ideal teaching artifact.** An intent-indexed reference card. Seven group headings, each with the utility types beneath, each utility with a one-line "reach for it when" trigger and a single-line code example showing the shape transform on a shared `Invoice` type. Below the card, two short composition examples — `Partial<Pick<Invoice, 'total' | 'currency'>>` for a slim partial-update DTO, `Awaited<ReturnType<typeof fetchInvoices>>` for the resolved async value. The card is the artifact the student will scroll back to; this is the Reference archetype done right — survey only after intent has indexed the surveyed items.

**Engagement.** A `Matching` exercise pairing eight "I want this shape" scenarios ("partial-update payload," "insert payload," "can-still-edit status subset," "the resolved value of a fetch," "the first argument of an action," "a slim list DTO," "a config with all fields required at read time," "a non-null narrow of an optional field") to the right utility-type chain.

**Components.**
- `CardGrid` of `Card`s for the seven groups, each card holding the utilities and their triggers — the existing component fits the intent-indexed shape directly.
- `Code` blocks for the two composition examples.
- `Matching` for the closing pairing.

## Concept 11 — Generics with the load-bearing `K extends keyof T`

**Why it's hard.** Generics without constraints are the same as `unknown` for what the function can do — the student writes `function pluck<T, K>(obj: T, key: K)` and can't index. The misconception is that "the generic *is* the type" — the constraint is what gives the generic the shape the body needs. `K extends keyof T` is the most load-bearing constraint in 2026 SaaS TypeScript because it shows up in every wrapper that takes "an object and a key into it." The student needs to see the unconstrained version fail, then watch the constraint unlock the indexed-access return type.

**Ideal teaching artifact.** A signature-evolution explorable. Four signatures of `pluck`, shown in sequence: (1) `pluck<T, K>(obj: T, key: K): unknown` — works but returns `unknown`; (2) `pluck<T, K extends string>(obj: T, key: K): unknown` — still `unknown`, the constraint targets the wrong axis; (3) `pluck<T, K extends keyof T>(obj: T, key: K): unknown` — the call site now refuses bad keys, but the return is still `unknown`; (4) `pluck<T, K extends keyof T>(obj: T, key: K): T[K]` — the senior form, return narrows per key. At each step, the student sees the call site behavior change: which calls compile, what the inferred return type is. The artifact teaches the constraint and the indexed-access return as the two halves of the same idiom.

**Engagement.** A `script-coding` (or `TypeCoding`) exercise: write `pluck<T, K extends keyof T>(obj: T, key: K): T[K]` from scratch, with tests verifying return-type narrowing across multiple call sites.

**Components.**
- `DiagramSequence` for the four-signature evolution — the scrubbable sequence binds the four signatures together as one story rather than four code blocks.
- `TypeCoding` for the from-scratch exercise.

## Concept 12 — The three senior wrapper idioms

**Why it's hard.** `safeAction`, `requireRole`, and `cache` look intimidating — multiple generic parameters, constraint clauses, conditional return shapes. The student has the building blocks (generics, constraints, discriminated unions for the `Result` return) but hasn't seen them composed at SaaS scale. The teaching move is to show each wrapper as a *recurring shape*: an outer generic for the input contract, an outer generic for the output contract, a constraint that ties them, a discriminated-union return for failure.

**Ideal teaching artifact.** A three-up annotated breakdown. Three labeled code blocks — `safeAction`, `requireRole`, `cache` — each with the generic parameters annotated in surrounding callouts: "Input contract (Zod schema)," "Output type," "Role literal," "Parameter tuple." The student sees the same skeleton across all three: outer generics declared, constraint clause, parameter shape, return shape. The annotation makes the *pattern* visible underneath the surface differences. This is the Pattern archetype with `AnnotatedCode` doing the work — each step of the annotation walk highlights one generic parameter and explains the role it plays.

**Engagement.** A `Matching` exercise pairing five generic-function scenarios ("identity," "pluck a key from an object," "wrap an action with input validation," "memoize a function preserving its signature," "tabs config preserving literal labels") to the generic-parameter shape they require (`<T>`, `<T, K extends keyof T>`, `<S extends ZodType, O>`, `<P extends unknown[], R>`, `<const T extends readonly string[]>`).

**Components.**
- `AnnotatedCode` for each of the three wrappers — the stepped highlight is the teaching move.
- `Matching` for the closing pairing.

## Component proposals

- **`StateMachineExplorer`** — Mermaid diagram on one side, discriminated union plus transition signatures on the other, click-an-edge highlights the corresponding transition and its per-state invariants; click an *invalid* edge to surface the compile error at the call site.
  - **Uses in this chapter** — Concept 3 (upload, optimistic mutation, subscription).
  - **Forward-links** — Unit 7.2 (Server Action `Result` shape), Unit 10.3 (seat-handoff lifecycle), Unit 12.2 (Stripe subscription status), Unit 16.2 (optimistic mutation). Compounds heavily.
  - **Leanest v1** — Static Mermaid diagram with a clickable node list; click a node, the right pane swaps to the corresponding state's invariants and the transitions leaving that state. No live compile-error preview in v1; instead, an "invalid transition" tab showing the pre-baked compile error as text. Still teaches the binding between the diagram and the types, which is the load-bearing teaching move; the live error surface is the polish layer.

## Build priority

`StateMachineExplorer` is the only bespoke proposal and it carries the most teaching load in the chapter (Concept 3, the chapter's structural center between discriminated unions and exhaustiveness) and forward-links into at least four units. Build it. Every other concept in this chapter maps cleanly onto existing components — `TypeCoding` and `ScriptCoding` carry the type-level exercises, `AnnotatedCode` carries the wrapper-idiom annotation, `Buckets` and `Matching` carry the recall moments, hand-SVG inside `Figure` handles the one-off truth tables and scope-highlight diagrams. The chapter's teaching weight on existing components is the right call — over-engineering bespoke widgets for single-use truth tables would dilute the build budget that `StateMachineExplorer` actually earns.

## Open pedagogical questions

- Whether the four canonical SaaS variants in Concept 2 deserve their own narrowing-visualizer artifact or whether four pinned `TypeCoding` exercises are enough. The visualizer would compound into Unit 7.2 (Server Action result narrowing) and Unit 16.1 (TanStack Query state narrowing), but the four-`TypeCoding` route is buildable today and may carry the teaching just as well.
- Whether the live-drift comparison in Concept 9 needs a bespoke "edit-the-value, watch-the-type-update" widget or whether `TypeCoding` with pinned `^?` queries and a side-by-side scenario is sufficient. The drift is the lesson; if `TypeCoding` can show drift legibly across two pinned scenarios, bespoke is overkill.

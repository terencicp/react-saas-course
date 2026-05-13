# Chapter 2.5 — TypeScript moves that prevent bug classes

## Chapter framing

Chapter 2.4 taught the static surface a 2026 SaaS engineer writes by reflex against the values they already had — primitives, literal unions, object shapes with modifiers, tuples, `Record`, union and intersection composition, narrowing without assertions, `as const satisfies`, inference-led annotation. The student can type any value they meet. This chapter teaches the *moves* that surface enables — the patterns that make a class of bug impossible to write rather than possible to catch in review. Discriminated unions make impossible states unrepresentable. Branded types make a `userId` and an `orgId` non-interchangeable. Type predicates and `assertNever` make exhaustiveness a compile error. Generics, `keyof`, and the utility types compose the toolbox that turns a one-off type into a reusable shape.

The senior framing for the chapter: **the cheapest bug is the one the compiler refuses to let you ship.** Every move in this chapter is a structural enforcement — a pattern shaped so that writing the wrong thing fails the build, not the customer's session. The lessons foreground the bug class first, the type move second, the syntax last. The student leaves able to recognize the call site where the type system can carry the invariant and how to write the type that carries it.

Threads that must run through every lesson:

- **Architectural Principle #7 is the chapter's organizing rule.** TypeScript is for the moves that prevent bug classes, not for the moves that decorate values that already work. The introduction (2.5.1) names the principle plainly: every type addition in this chapter has a bug it kills and a failure mode it removes from production. The lessons that follow are concrete instances of the principle.
- **Bug class first, syntax last.** Every lesson opens with the production failure the move prevents — a UI that renders `data.value` when the request hasn't loaded yet, a service charge applied to the wrong org because the route handler swapped `userId` and `orgId`, a `switch` over invoice statuses that silently drops the new `'refunded'` case. The shape and the syntax follow the failure. The senior reflex the student takes away: when a bug class repeats, ask which type-level move would have made it unwritable.
- **The patterns compose.** Discriminated unions (2.5.2) are the substrate for state machines (2.5.3); state machines reach for type predicates and `assertNever` (2.5.4) to enforce exhaustiveness on transitions; branded types (2.5.5) lock the identity of the IDs that flow through those states; `keyof`, `typeof`, and indexed access (2.5.6) derive types from the schemas and configs the state machines reference; utility types (2.5.7) reshape those derived types for new call sites; generics (2.5.8) parameterize the helpers that operate over all of it. The student sees each lesson cash in on the prior.
- **One source of truth for every shape.** The chapter teaches the value-then-derive direction by reflex. The schema is the source of truth; the type comes from `typeof schema._output` or `z.infer<typeof schema>`. The status array is the source of truth; the type comes from `typeof STATUSES[number]`. The route handler's signature is the source of truth; the consumer's type comes from `ReturnType<typeof handler>`. The student stops writing types that drift from the values they describe.
- **Senior reach in 2026, no historical detours.** The course writes literal-union discriminated unions, not `enum`-tagged ones. It writes `assertNever` over `default:` or `satisfies never` at the exhaustive site, the form most senior reviewers expect. It writes branded types with a private symbol or a `__brand` phantom field — the pattern teams ship without a library dependency. It writes generics with `extends` constraints and defaults from the first example, because unconstrained generics are rare in production code. The `ts-pattern` and the heavier nominal-typing libraries are named once and dismissed; the language has enough surface for application code.
- **Naming for intent stays operating.** A state's discriminant is named `status` or `kind` (the domain noun, not `type` which collides with the keyword). A branded ID's type is `UserId`, never `UserIdBrand`. A generic parameter is `TInvoice` or `T` when the role is obvious, never `K1`. The 2.2.3 reflex applies to every type the chapter writes.

This chapter ships small standalone snippets in TypeScript, no application code. `TypeCoding` carries the type-only practice with twoslash hover queries; `ScriptCoding` carries the runtime examples where the type narrows through a function. The student finishes the chapter able to model a multi-state process as a discriminated union, enforce exhaustiveness with `assertNever`, brand the IDs that must not be interchangeable, derive types from values with `keyof` and `typeof`, reach for the right utility type for every reshape, and write a constrained generic that stays readable.

The chapter ordering reflects the dependency between the moves. Discriminated unions come first because they're the single most load-bearing pattern in 2026 TypeScript code and every later lesson references them. State machines extend the discriminated-union shape with transitions and invariants, so they follow immediately. Exhaustiveness tooling (type predicates, assertion functions, `assertNever`) comes third because it's the consumer side of the discriminated union — the move that turns a runtime check into a type narrow and forces every variant to be handled. Branded types come fourth as a separate but parallel pattern that operates on primitives rather than shapes. The type-level introspection operators (`keyof`, `typeof`, indexed access) come fifth because they're the bridge from a value to a type and the substrate for the utility-type surface. Utility types come sixth as a reference walk over the eleven the student will reach for; generics close the chapter because they explain how the utility types are built and parameterize the helpers the rest of the course writes.

---

## Lesson 2.5.1 — Discriminated unions and Architectural Principle #7

Topics to cover:

- The chapter-opening senior question: in 2026 TypeScript code, what's the move a senior reaches for when a value can legally be in one of several disjoint states, and why is that move so load-bearing it earns the chapter's first lesson. The answer is the discriminated union — a union type where every member shares a literal-typed discriminant field that the compiler narrows by. The lesson names the principle that frames the chapter, then makes the principle concrete with the canonical discriminated-union shapes the course will reference everywhere.
- **Architectural Principle #7 introduced — TypeScript for the moves that prevent bug classes, not as syntax.** Stated plainly in one paragraph. The contrast: type annotations that decorate values the compiler could already infer (an `any` removed, a return type spelled out) are the floor — they catch typos, they help autocomplete, they're the 2.4 surface. The *moves* in this chapter are different: they reshape the type so a bug class becomes unwritable. The student takes the principle as the question to ask on every PR: what bug does this type prevent? If the answer is "it documents the existing code," the type is decoration. If the answer is "it makes a wrong state fail to compile," the type is doing the work this chapter teaches.
- The bug class the discriminated union kills, stated concretely. The `{ data: T; loading: boolean; error: Error | null }` shape — three independent fields, eight possible combinations, only four of which are legal states. Code that reads `data.value` when `loading` is `true` and `data` is `null` ships a runtime error. The shape itself permits the bug — there's no way to type "if `loading` is `true`, `data` must be `null`" with three independent fields. The discriminated union refactors the shape so the illegal combinations don't exist in the type.
- **The discriminated-union shape**, restated as the load-bearing form:
  ```ts
  type RequestState<T> =
    | { status: 'idle' }
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; error: Error };
  ```
  The four states are the four legal combinations. `data` only exists in `'success'`; `error` only exists in `'error'`. The illegal eight-of-three combinatorics are gone — the type now mirrors the domain.
- **The three properties** every discriminated union has, named for what each contributes:
  1. **A union of object shapes** — each member is an object type.
  2. **A common discriminant field** — every member has the same field name with a literal type (a different literal per member). The conventional names: `status`, `kind`, `type`, `tag`. The course writes `status` for state machines and `kind` for variant types because `type` collides with the TS keyword in destructured patterns.
  3. **Per-variant payload fields** — each member carries the fields that variant needs, and only the fields that variant needs.
- **Narrowing by discriminant** — the consumer side of the pattern. Inside an `if (state.status === 'success')` block, the compiler narrows `state` to the `'success'` variant — `state.data` is accessible, the other variants' fields are not. The same narrow fires inside a `switch (state.status)` per case. The full exhaustiveness story (`assertNever`) is 2.5.4; this lesson names the narrow and the form.
- **Why the discriminant field is literal-typed**. A `status: string` field doesn't narrow — the compiler can't tell which variant a given string belongs to. The `'idle' | 'loading' | 'success' | 'error'` set is what makes the narrow tractable. The 2.4.1 literal-union discipline pays off here at full weight.
- **The canonical SaaS shapes**, named so the student recognizes them when they land in later units:
  - **Request state** — the `RequestState<T>` above. Used in every async fetch, every Server Action return, every loading-aware UI. Lands in Units 5, 7, 16.
  - **Result type** — `type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };`. The Server-Action return shape (Unit 7.2), the Zod `safeParse` shape (Unit 7.1), the typed-error-handling reach (Unit 17.1). The senior alternative to "throw and catch" at the seams where errors are part of the contract.
  - **Event-message shape** — `type DomainEvent = { kind: 'invoice.paid'; invoiceId: InvoiceId } | { kind: 'invoice.voided'; invoiceId: InvoiceId; reason: string } | ...;`. Webhook ingestion (Unit 12.1), notification dispatcher (Unit 14.1), background-job payloads (Unit 13.1). The discriminated-union shape is the contract for "one of several message types," and the consumer side is a `switch` on `kind`.
  - **Form/UI variant** — `type Field = { kind: 'text'; value: string } | { kind: 'number'; value: number } | { kind: 'select'; value: string; options: Option[] };`. Used in dynamic form rendering and in shadcn/ui-style component variants (Unit 4.11).
- **Construction-side discipline**. A discriminated union is only useful if the values are *only* constructed in the shapes the type allows. The senior reach: a small factory function per variant — `requestSucceeded(data)`, `requestFailed(error)` — returns the typed variant, callers never assemble the shape by hand. The factory functions document the legal states and remove the typo class. Optional but the senior default for any non-trivial discriminated union.
- **What this lesson seeds for the rest of the chapter**. 2.5.3 (state machines) builds on this shape to add transitions and per-state invariants. 2.5.4 (`assertNever`) builds on the narrow to enforce exhaustiveness on every consumer. 2.5.7 (utility types) builds the `Extract<T, U>` and `Exclude<T, U>` helpers that work on union members. The student sees discriminated unions everywhere from here forward.

What this lesson does not cover:

- State machines as transitions plus invariants (2.5.3).
- Exhaustiveness with `assertNever` (2.5.4).
- Branded types on the discriminant or the IDs inside the variants (2.5.5).
- `Extract<T, U>` and `Exclude<T, U>` (2.5.7).
- `ts-pattern` or external pattern-matching libraries — named once in the chapter framing and dismissed.
- Runtime validation of variant shapes (Zod owns the wire boundary, Unit 7.1).

Pedagogical approach:

Pattern archetype with the principle as the opening frame. The lesson teaches a specific shape and the bug class it prevents. Open with a 2.4-style senior question — "the UI shows stale data on a refetch, where does the bug live in the type?" — and a `CodeVariants` block showing the same `RequestState<T>` modeled two ways. Tab 1: the three-independent-fields shape with the eight-state combinatorics. Tab 2: the discriminated-union shape with the four legal states. The student sees the bug class evaporate in the diff. The annotation in tab 1 names the principle inline: TypeScript is for the moves that prevent bug classes, and this is the first move. Then a `TypeCoding` block where the student writes the `RequestState<T>` type and consumes it inside a function — `if (state.status === 'success') return state.data;` — watching the editor narrow `state` and refuse access to `state.data` in any other branch. The narrow is the lesson's payoff. A second `TypeCoding` exercises the `Result<T, E>` shape: the student writes `parseInvoice(input: unknown): Result<Invoice, string>` and the consumer destructures by `if (result.ok)`. The canonical-shapes walk closes the lesson as a tight prose reference (no tabs) — request state, Result, event message, UI variant — each in two sentences with a forward link to the unit that lands it. A small `Sequence` exercise asks the student to order the steps of refactoring an independent-fields state shape into a discriminated union: identify the legal states, pick the discriminant name, write each variant, replace the consumer's nested null-checks with a narrow. Optional `SandboxCallout` with the `RequestState` shape for free play.

Estimated student time: 40 to 50 minutes.

---

## Lesson 2.5.2 — Flow state machines

Topics to cover:

- The senior question: a multi-step process — a Stripe checkout, a file upload, a subscription lifecycle, the optimistic-mutation triplet (idle → pending → committed/reverted) — has more than two states *and* the legal transitions between them are restricted. The discriminated union from 2.5.1 captures the states. What's the move that also captures the transitions? The answer is the flow state machine — a discriminated union of states plus a `transition` function (or a set of transition functions) whose types enforce that only legal transitions compile. The lesson teaches the pattern as the senior reach in 2026 TypeScript code for any process with three or more states and constrained transitions.
- The bug class the state machine kills. The "we already started uploading, then the user double-clicked submit, and the second upload started while the first was still in flight" bug. The "we marked the invoice paid, then the webhook arrived again and tried to mark it paid from `voided`" bug. The shape that admits these bugs: a status field on the row, with no compile-time barrier between writing `voided` to a row currently in `voided`. The state machine refactors the contract so the wrong transition fails to compile.
- **The state-machine shape** as a layer over discriminated unions:
  ```ts
  type UploadState =
    | { status: 'idle' }
    | { status: 'selecting' }
    | { status: 'uploading'; file: File; progress: number; abort: AbortController }
    | { status: 'succeeded'; file: File; url: string }
    | { status: 'failed'; file: File; error: Error; retry: () => UploadState };
  ```
  The discriminated-union part is familiar from 2.5.1. The state-machine part is the **transitions**: a `startUpload(state: { status: 'selecting'; file: File }): UploadState` signature takes a `'selecting'` state and returns the next state. The function's parameter type is the *only* state that can call it — TypeScript refuses to call `startUpload` from `'uploading'` because the parameter type doesn't match. The wrong transition is unwritable.
- **The two ways to enforce transitions**, named for when each earns its weight:
  - **Per-transition function signatures** — `function startUpload(state: { status: 'selecting'; file: File }): UploadingState { ... }`. Each transition is its own function, its parameter type narrows to the legal source state, and the return type is the legal destination state. The senior default for small flows (three to five states) — every legal transition becomes a function, the file reads as the state machine.
  - **A single `transition` function with a discriminated input** — `function transition(state: UploadState, event: UploadEvent): UploadState { ... }`. Used when the events are the dominant abstraction (a reducer-style state machine, useful for `useReducer` in Unit 4.8 and the rare Zustand-state-machine in Unit 16.3). Cashes in when the consumer is a state-store rather than a sequence of function calls.
  - The senior call: per-transition functions for application code where the transitions are call sites; the unified reducer when the consumer is a state store and the events are a closed set. The chapter teaches the per-transition form as the default and names the reducer form as the conditional.
- **Per-state invariants** as the second discipline. Each variant carries the fields it needs and no others — `uploading` carries the in-flight `AbortController` (used to cancel), `succeeded` carries the final `url`, `failed` carries the `error` and the `retry` thunk. The invariant: a field's presence implies the state it belongs to. The consumer never asks "is the upload done?" by checking `state.url !== undefined`; it asks `state.status === 'succeeded'` and the narrow gives access to `url`. The 2.5.1 narrow operates here at full weight.
- **The three canonical SaaS state machines** the chapter seeds, each named with the unit it lands in:
  - **Optimistic-mutation triplet** — `{ status: 'idle' } | { status: 'pending'; optimistic: T } | { status: 'committed'; value: T } | { status: 'reverted'; error: Error }`. Used in React 19's `useOptimistic` and `useActionState` (Unit 7.3), in TanStack Query's optimistic updates (Unit 16.1), and in any UI that wants to show the new value immediately but reconcile with the server response. The 2026 React pattern lives on this shape.
  - **Upload state** — the `UploadState` above. Used in the R2 presigned-upload pattern (Unit 13.4), in image/avatar uploads, and in the rare client-side file pipeline. The progress and abort handling are load-bearing.
  - **Subscription state** — `{ status: 'none' } | { status: 'trialing'; trialEnd: Date } | { status: 'active'; plan: Plan; renewsAt: Date } | { status: 'past_due'; gracePeriodEnd: Date } | { status: 'canceled'; canceledAt: Date }`. Used in the Stripe billing flow (Unit 12.2), in the entitlements lookup (Unit 12.3), and in every UI that gates a feature by plan. The transitions are constrained by Stripe's lifecycle, and the type machinery enforces the same constraints in the application.
- **The transition signature pattern** as the senior idiom:
  ```ts
  type UploadingState = Extract<UploadState, { status: 'uploading' }>;
  type SucceededState = Extract<UploadState, { status: 'succeeded' }>;

  function completeUpload(state: UploadingState, url: string): SucceededState {
    state.abort.signal.removeEventListener(...);
    return { status: 'succeeded', file: state.file, url };
  }
  ```
  The `Extract<T, U>` utility (full treatment in 2.5.7) is the load-bearing tool here — it pulls the named variant out of the union so the transition's parameter and return types are narrow. The pattern lands here as the canonical reach; the utility-type lesson cashes in on the shape.
- **What the lesson cuts**. Full FSM libraries (XState, Robot) are named once and dismissed. The senior reach in 2026 application code is the language's discriminated union plus transition functions, because the bug class the type-only form prevents covers 90% of the cases that ship in SaaS code, and the runtime overhead of a library isn't earned for the typical three-to-six-state flow. XState earns its weight when the flow has nested states, parallel regions, or temporal logic — out of scope for this chapter.
- **The forward references the lesson plants**. The `assertNever` exhaustive switch in 2.5.4 closes the consumer side — every transition function's body uses the discriminant narrow, and every reducer-style `transition` function ends with `assertNever(event)` to force the build to break on a new event. The `Extract<T, U>` and `Exclude<T, U>` utilities in 2.5.7 are the workhorses for naming individual variants and remainders. The branded-types lesson 2.5.5 brands the IDs (`InvoiceId`, `OrgId`) that flow through the state's payload fields. The student sees the substrate here and the cash-in later.

What this lesson does not cover:

- `assertNever` and exhaustiveness on the transition body (2.5.4).
- Branded types on the IDs in the state's payload (2.5.5).
- `Extract<T, U>` and `Exclude<T, U>` in depth (2.5.7).
- XState or other FSM libraries — named and dismissed.
- The `useReducer` and `useActionState` React hooks — Unit 4.8 and Unit 7.3 own them; this lesson names them as forward references only.
- Runtime persistence of the state across reloads — out of scope for the type-level lesson.

Pedagogical approach:

Pattern archetype with two Mechanics beats. Open with the senior question — "the optimistic-mutation triplet, the upload state, the subscription lifecycle: what's the type-level move that captures the transitions and not just the states?" — and a `Figure` showing a small state-transition diagram for the upload flow (selecting → uploading → succeeded, with the back-edge from failed to uploading via retry). The visual model is the lesson's anchor. Then a `TypeCoding` block where the student writes the `UploadState` type with five variants, picking which fields belong to each state. The student feels the invariant discipline in their keystrokes. A second `TypeCoding` walks the transition signature — the student writes `completeUpload(state: UploadingState, url: string): SucceededState` and watches the editor refuse the function on a `'failed'` state because the parameter type doesn't match. The compile error is the lesson's payoff. An `AnnotatedCode` block walks the optimistic-mutation triplet in 30 lines — `idle → pending → committed`, with the `Extract<T, U>` calls highlighted and a forward link to 2.5.7. The senior idiom is named at the call site. A small `ScriptCoding` exercises the upload state as a runtime sequence — the student calls the transitions in order, sees the type narrow at each step, and tries to call a wrong transition and gets the compile error inline. Close with a `Buckets` exercise sorting six scenarios ("invoice paid/voided/refunded lifecycle," "a multi-step signup wizard with 3 steps," "a binary on/off toggle," "Stripe subscription lifecycle," "the open/closed state of a modal," "a typing indicator that shows for 3 seconds after the last keystroke") into "state machine earns its weight" or "a boolean or simple union is enough." The trigger recognition is the deliverable. Optional `SandboxCallout` with the upload state for free play.

Estimated student time: 50 to 60 minutes.

---

## Lesson 2.5.3 — Type predicates, assertion functions, and `assertNever`

Topics to cover:

- The senior question: once a discriminated union is in hand, three pieces are still missing for the move to be airtight. First — what if the narrowing check is too complex for `typeof` or the discriminant? Second — what if the check needs to happen across an entire function rather than inside one branch? Third — when a new variant lands in the union, what stops the consumer from silently ignoring it? The answers are type predicates (a user-defined narrow), assertion functions (a throw-on-mismatch narrow that affects the whole scope), and `assertNever` (the exhaustiveness guard at the consumer's `default` case). The lesson teaches all three because they earn their weight together — every state machine and every discriminated-union consumer reaches for at least one of them.
- The bug class the trio kills. Three named:
  - The "I have a `User | Admin` value and I want a function that narrows it; I keep writing the same `typeof user.role === 'admin'` check inline at every consumer" bug — type predicates centralize the check.
  - The "I want to assert at the top of a function that the user is authenticated, and have every subsequent line see the narrowed type" bug — assertion functions narrow the binding for the rest of the scope.
  - The "we added a `'refunded'` status to the union three months ago, and the formatter that maps status to label still treats it as unknown because the developer who added it didn't grep for every switch" bug — `assertNever` makes the formatter fail to compile.
- **Type predicates** — user-defined narrowing functions. The signature: `function isAdminUser(user: User): user is AdminUser { ... }`. The runtime returns a boolean; the type-level `is` clause tells the compiler what to narrow to when the boolean is true.
  - The mechanics. The function's body returns `true` or `false`. When the consumer writes `if (isAdminUser(user))`, the compiler narrows `user` to `AdminUser` inside the block (and to `Exclude<User, AdminUser>` in the `else` branch). The narrow is *only* as good as the runtime check — if the function returns `true` for a non-Admin user, the type is wrong about the runtime, and the bug surfaces in the consumer.
  - The senior triggers. Three named: when the check is complex enough that inlining it at each consumer is noise (a deep-property check, a multi-field validation); when the same check fires in three or more places and centralization improves both the call sites and the location of the bug if the check needs to change; when the narrow is to a branded subtype (`User → AdminUser`) that isn't expressible as a `typeof` or discriminant check.
  - The watch-out. A type predicate is a *promise* the function body makes — the compiler trusts the `is` clause and doesn't check that the body actually narrows correctly. The senior reflex: keep the body trivial (one or two checks), name it for what it tests (`isAdminUser`, not `checkUser`), and treat the function as a contract the team owns.
- **Assertion functions** — type predicates that throw instead of returning. The signature: `function assertIsAdmin(user: User): asserts user is AdminUser { ... }`. The function throws on mismatch; after the call, the local is narrowed for the rest of the scope.
  - The mechanics. The `asserts X is Y` return-type clause replaces `X is Y`. The function body throws (or otherwise diverges) on a failed check; if it returns normally, the compiler narrows the binding for the rest of the function. The narrow is scope-wide, not block-scoped — distinct from a type predicate, which only narrows inside the `if` block.
  - The senior triggers. Two named: when the calling code wants to assume the narrow rather than branch on it (an authorization check at the top of a Server Action — "if you reach this line, you're an admin"); when the calling code's flow would be noised up by an `if`/`else` (the action's body should read straight, not branch). Used heavily in Unit 7.2 (`requireSession`, `requireRole`) and Unit 10.2 (`requireOrgRole`).
  - The function-declaration form, restated from 2.2.1 and 2.4.2. Assertion functions and type predicates require named `function` declarations or carefully-typed arrow expressions — the arrow `const` form needs the explicit return-type annotation (`const assertIsAdmin: (user: User) => asserts user is AdminUser = (user) => { ... }`) because TypeScript can't infer the `asserts` clause. The course writes assertion functions as `function` declarations by default and names this as one of the few cases where the keyword wins.
- **`assertNever`** — the exhaustiveness guard. The shape: a small utility function that takes a `never` parameter and throws.
  ```ts
  function assertNever(value: never): never {
    throw new Error(`Unhandled variant: ${JSON.stringify(value)}`);
  }
  ```
  - The mechanics. When a `switch` handles every variant of a discriminated union, the residual type at the `default` case narrows to `never`. Passing the residual to `assertNever(value)` compiles when every case is handled (the parameter type is `never`, which only `never` assigns to) and breaks the build when a new variant is added (the residual is no longer `never`).
  - The 2026 alternative — `satisfies never`. Since TypeScript 4.9, the same check can be written inline without a helper: `state.status satisfies never;` at the end of the function body. The senior reach for the case where the helper feels heavy and the build error reads cleanly without it. The course teaches both and names `assertNever` as the more explicit form for application code and `satisfies never` as the lightweight alternative.
  - The senior trigger. Any `switch` over a discriminated union's discriminant. Any transition function in a state machine. Any router or dispatcher that maps a `kind` to a handler. The pattern is the consumer-side guarantee that pairs with the construction-side discipline of the discriminated union.
- **The `noFallthroughCasesInSwitch`** flag from 1.4.3, restated. The flag catches the *other* exhaustive-switch failure mode — a missing `break` between cases. The course's tsconfig has it on; the student writes `switch` statements with explicit returns per case (no `break`s needed, no fallthrough possible) by reflex. The combination of `noFallthroughCasesInSwitch` + `assertNever` in `default` is the airtight exhaustive switch the course writes.
- **The senior idiom the lesson cements**:
  ```ts
  function statusLabel(state: RequestState): string {
    switch (state.status) {
      case 'idle': return 'Ready';
      case 'loading': return 'Loading...';
      case 'success': return `Loaded ${state.data.length} items`;
      case 'error': return `Error: ${state.error.message}`;
      default: return assertNever(state);
    }
  }
  ```
  Every variant gets a case; every case returns its value; `default` calls `assertNever` and the compiler enforces both completeness (via the `never` narrow) and the absence of fallthrough (via the flag). Add a fifth variant to `RequestState` without updating this switch, and the build breaks at `assertNever(state)` with a precise message naming the missing variant.
- **The `unknown` narrowing case**, restated as the seam to 2.4.6. Type predicates and assertion functions are the senior tools for narrowing `unknown` to a domain type when the input crosses an unsafe boundary. The dominant boundary check in 2026 SaaS code is a Zod schema's `safeParse` (Unit 7.1) — but for boundaries where Zod is heavy or doesn't fit (a programmatic SDK callback, a runtime feature flag), a hand-written type predicate is the senior alternative.

What this lesson does not cover:

- Discriminated unions in depth (2.5.1).
- State machines (2.5.2).
- Branded types and the `is` predicates that narrow strings to brands (2.5.5).
- Zod schemas in depth (Unit 7.1).
- `as` and `!` assertions — 2.4.6 owns the escape-hatch surface; this lesson names them once as the wrong reach when a type predicate fits.

Pedagogical approach:

Pattern archetype with three discrete Mechanics beats — one per tool. The lesson teaches a discipline (let the type system enforce exhaustiveness and centralized narrowing) and the three syntactic surfaces it operates through. Open with a `CodeReview` exercise: a `statusLabel` function with a `switch` that omits the new `'refunded'` variant and a `default: return 'Unknown'` catch-all. The student leaves a comment naming the bug class (silent drift when a variant is added) and the senior fix (replace `default` with `assertNever(state)`). The wrong-then-right opening is the lesson's seed. Then a Mechanics walk through the three tools in order. For type predicates, a `TypeCoding` block where the student writes `function isAdmin(user: User): user is AdminUser` and consumes it in an `if` block, watching the narrow fire. For assertion functions, a second `TypeCoding` where the student writes `function assertIsAdmin(user: User): asserts user is AdminUser` and watches the binding narrow for the rest of the function scope. The contrast between the two narrows (block-scoped vs. scope-wide) is named inline. For `assertNever`, a `ScriptCoding` block where the student writes the helper, applies it in a switch over `RequestState`, then adds a fifth variant to the type and watches the build break at the `assertNever` line — the message is the lesson's payoff. The `satisfies never` alternative is shown side-by-side in a `CodeVariants` block — same payoff, different syntactic weight. Close with a `MultipleChoice` exercise on six scenarios — "the auth check at the top of a Server Action," "the typed narrow on `parsed.json()` after a Zod check," "the format-by-status switch," "the runtime check that an unknown is a valid event," "the assertion that a queue is non-empty before reading," "the consumer of a four-variant discriminated union" — and the student picks the right tool for each (type predicate, assertion function, `assertNever`, or a built-in narrow from 2.4.6). Optional `SandboxCallout` with a discriminated union and a partial switch for free play.

Estimated student time: 45 to 55 minutes.

---

## Lesson 2.5.4 — Branded types for IDs

Topics to cover:

- The senior question: every identifier in a SaaS database is a string — `userId`, `orgId`, `invoiceId`, `subscriptionId`, `apiKeyId`. The type `string` accepts any of them at any callsite. What happens when a Server Action takes `(userId: string, orgId: string)` and the caller passes them in the wrong order? Nothing — the build is green, the wrong row is read, the wrong audit log is written, the wrong customer sees the wrong invoice. The bug is a string at one boundary becoming a different string at another, with no type-level barrier between them. The move that kills this bug class is the branded type — a primitive that's still a string at runtime but a distinct, non-assignable type at the type level.
- The bug class branded types kill, stated concretely. The `org-scoped query that received a userId where it expected an orgId` bug — a `where orgId = $1` clause in a Drizzle query, called with a userId because the function signature said `string` and both IDs are strings. The fix at the type level: make `UserId` and `OrgId` distinct types that the compiler refuses to interchange.
- **The branded-type shape**. The pattern the course writes:
  ```ts
  declare const orgIdBrand: unique symbol;
  type OrgId = string & { readonly [orgIdBrand]: 'OrgId' };

  declare const userIdBrand: unique symbol;
  type UserId = string & { readonly [userIdBrand]: 'UserId' };
  ```
  Or, the simpler `__brand` phantom field form used by many SaaS codebases and Drizzle's `$type<>()` helper internally:
  ```ts
  type OrgId = string & { readonly __brand: 'OrgId' };
  type UserId = string & { readonly __brand: 'UserId' };
  ```
  Either form produces the same effect: a `string & { __brand: 'OrgId' }` doesn't assign to `string & { __brand: 'UserId' }` because the brands disagree, and neither assigns from a plain `string` because the brand fields are missing. At runtime, the values are plain strings — the brand field is purely a type-level fiction (the `__brand` form) or a phantom symbol key (the `unique symbol` form) that never exists on the runtime value.
- **The two construction patterns**, named for when each earns its weight:
  - **A brand factory** — `function asOrgId(id: string): OrgId { return id as OrgId; }`. A one-line cast wrapped in a named function. The senior reach when IDs enter the system through a known boundary (a session lookup, a route parameter parse, a database read) and the boundary is the place where the brand earns its weight. The factory is the *only* place an `as OrgId` is written; every consumer downstream takes the branded type by argument.
  - **A Zod-validated brand** — `const orgIdSchema = z.string().uuid().brand<'OrgId'>();` with `type OrgId = z.infer<typeof orgIdSchema>;`. Zod's `.brand()` method produces a branded output type. The senior reach when the boundary is a wire input (a form field, a route parameter, an API request body) — the schema validates the format and brands the output in one move. Full treatment in Unit 7.1.
  - The senior call: the brand factory at internal boundaries (a session reader, an admin tool); the Zod brand at wire boundaries (Server Action inputs, route handlers, webhook payloads).
- **The `as` cast inside the factory** as the controlled exception to the no-`as` rule from 2.4.6. The factory is the *one* place an `as OrgId` is written; the cast is a promise the developer makes that the input is a legal OrgId. The promise must be paid by an upstream runtime check (a Zod parse, a database lookup that returns a real OrgId, a session that's already validated). The senior reflex: every `as Branded` is a question — what runtime check made the cast true? — and the answer should live one or two lines upstream, not "trust me."
- **The consumer side**. Functions that take branded parameters refuse plain strings at the callsite — `findInvoicesByOrg(orgId: OrgId)` won't compile if called with `someRandomString`. The compile error is the lesson's payoff. The chain ripples outward: every function that handles an `OrgId` either takes it as a `OrgId` (branded all the way down) or accepts a `string` and re-brands at its boundary. The branded type is *contagious* by design — that's what makes the bug class unwritable.
- **Drizzle's `$type<>()` helper**, named once as the integration point. Drizzle's column builders accept `$type<OrgId>()` to brand the column's TS output without a runtime cost. The course wires this in Unit 6.2 — every ID column on a table reads back as the branded type, so a Drizzle query result is branded by reflex. The student sees the pattern named here and lands the wiring in Unit 6.
- **`Better Auth`'s session shape and the brand**. Unit 9 wires the Better Auth session, which includes `session.user.id` and (for org-scoped requests) `session.activeOrganizationId`. The course brands these via module augmentation (Unit 2.6.4 names the mechanism, Unit 9 wires it specifically) so the session's IDs are branded at the source. Named here as the forward reference; the lesson teaches the brand shape, not the auth integration.
- **When branded types are over-engineering**, named so the student doesn't brand by reflex. Three cases the lesson dismisses:
  - **Application-internal scratch values** — a temporary string variable inside a function, never crossing a boundary. The brand earns nothing.
  - **Strings that don't have an identity contract** — a display label, a notification title, a search query. Branding them is noise.
  - **One-off scripts and migrations** — the build-time cost of the brand isn't worth it when the script runs once.
  
  The senior rule: brand the IDs and the identity-bearing strings that *cross boundaries*. Don't brand the strings that are local and ephemeral.
- **The 2026 senior reach**, summarized. Every primary key, every foreign key, every external-system ID (Stripe customer ID, Resend message ID), every token (API key, magic link, webhook signing secret) gets a brand. Display strings, search queries, free-text input — don't. The line is "does this string have an identity contract that the type system should enforce?"

What this lesson does not cover:

- Drizzle column branding mechanics in depth (Unit 6.2).
- Zod's `.brand()` and the schema-derived brand type (Unit 7.1).
- Module augmentation for the Better Auth session (2.6.4 / Unit 9).
- The `nominal` package or other library-based branding — named once and dismissed; the language-level pattern is the senior default.
- Branding non-string primitives (number IDs, bigint IDs) — same pattern, different base type; named in one line.
- Symbol-keyed brands at depth — the lesson shows the form, doesn't survey the variants.

Pedagogical approach:

Pattern archetype. The lesson teaches a specific shape (the brand) and the bug class it kills (interchangeable IDs). Open with a `CodeReview` exercise: a `transferInvoice(fromOrgId: string, toOrgId: string)` function called with the arguments in the wrong order at a callsite buried in the test fixtures. The student leaves a comment naming the bug class and the senior fix (brand the type). The wrong-then-right opening is the lesson's seed. Then a `TypeCoding` block where the student writes `type OrgId = string & { __brand: 'OrgId' }`, hovers a plain string and an `OrgId` to see the type-level distinction, and tries to assign one to the other to see the compile error. The unassignability is the lesson's payoff. A second `TypeCoding` walks the brand factory pattern — the student writes `function asOrgId(id: string): OrgId` and consumes it: `findInvoicesByOrg(asOrgId(rawId))` compiles, `findInvoicesByOrg(rawId)` doesn't. A small `AnnotatedCode` block shows the Drizzle `$type<OrgId>()` shape (one line of code, three lines of annotation explaining the column-to-type wiring) as a forward reference to Unit 6.2 — the student sees how the brand lands in the schema and doesn't need to brand by hand at every read site. Close with a `Buckets` exercise sorting eight strings ("the user's ID from a session," "the search query in a list filter," "the Stripe customer ID returned from the API," "the user's display name," "the invoice number generated server-side," "a one-time token from a magic link," "a category label in a UI badge," "a webhook signing secret") into "brand" or "leave as string." The line — identity contract crossing a boundary — is the lesson's deliverable. Optional `SandboxCallout` for free play.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.5.5 — `keyof`, `typeof`, and indexed access types

Topics to cover:

- The senior question: in 2026 TypeScript, the value is often the source of truth — a `STATUSES` array, a `routes` config object, a Drizzle schema, a Zod schema. The type the rest of the codebase consumes should be *derived* from the value, not duplicated alongside it. The duplication is the bug class — the array gets a new entry, the type doesn't, the consumer ships a typo. The move that kills the duplication is the type-level introspection trio: `typeof V` (the type of a value), `keyof T` (the union of T's keys), and `T[K]` (the type at a key). The lesson teaches the three operators as one toolbox because they earn their weight together — every value-derived type uses at least two of them.
- The bug class the trio kills, stated concretely. The `we added 'refunded' to STATUSES but the type still says 'paid' | 'open' | 'void'` bug. The `we renamed config.stripe to config.payments but the lookup type still says 'stripe'` bug. The `we added a column to the schema but the API type doesn't include it` bug. The common shape: a value the codebase already maintains, and a type that should track the value automatically. The introspection operators close the loop.
- **`typeof V`** — the type-level operator that produces a value's type. The contrast with the JavaScript `typeof` operator named upfront: the JS `typeof x` returns a string at runtime (`'string'`, `'number'`, `'object'`); the TS `typeof x` lives in type position and produces a type. Two operators with the same name, two contexts (value position vs. type position) that disambiguate them.
  - **The senior triggers**, with the canonical pattern for each:
    - **Derive a type from a `const` value**: `const config = { stripe: '...', resend: '...' } as const; type Config = typeof config;` — the type is the object's shape with literal values. Used in every typed-config pattern.
    - **Derive a function's signature from its declaration**: `type FormatInvoice = typeof formatInvoice;` then `Parameters<FormatInvoice>` (Lesson 2.5.6) and `ReturnType<FormatInvoice>` extract the pieces. Used in consumer types for shared utilities.
    - **Derive a schema's output type**: `const orgSchema = z.object({ ... }); type Org = z.infer<typeof orgSchema>;` — the schema is the source, the type comes from it. The dominant pattern in Unit 7.1 and every later wire-boundary lesson.
- **`keyof T`** — the type-level operator that produces the union of T's keys. The result is a literal union of the key names (for object types) or a union of the index signature's key type (for `Record`-shaped types).
  - **The senior triggers**:
    - **A function that takes a property name of an object**: `function readField<T, K extends keyof T>(obj: T, key: K): T[K]` — the parameter `key` is constrained to T's actual keys, and the return type is the value at that key. The autocomplete on the callsite shows only the legal keys.
    - **Building a union of names**: `type StatusKey = keyof typeof STATUSES_BY_KEY;` — the keys of a const-objects-with-`as const` form become a literal union usable as a type.
    - **Mapped types** (the substrate for `Partial<T>`, `Pick<T, K>`, and the rest of the utility-type surface, full treatment in 2.5.7) iterate over `keyof T` to construct new types per key.
- **Indexed access types** — `T[K]`. The type at a key, or the union of types if `K` is a union of keys.
  - **The senior triggers**:
    - **Pull a field's type out of a parent type**: `type InvoiceStatus = Invoice['status'];` — produces the literal union the `Invoice` type declared, without restating it. If `Invoice` adds a status, `InvoiceStatus` follows.
    - **Pull all values of an object type**: `type ConfigValue = (typeof config)[keyof typeof config];` — the union of every value's type. Used when iterating values in mapped-type expressions.
    - **Pull the element type of an array type**: `type Status = (typeof STATUSES)[number];` — `[number]` is the indexed access form for "the element at any numeric index," which produces the array's element type. The senior reach for "derive a literal union from a const array." The pattern from 2.4.7 (`as const` plus indexed access) cashes in at full weight here.
- **The combined idiom — `typeof V[number]`** — the chapter's most-repeated pattern. The student has met it in 2.4.7; this lesson names it as the senior 2026 reach for any "list of legal values → type union" derivation. Used heavily in Drizzle schemas (`pgEnum`-derived types, Unit 6.2), Zod schemas (`z.enum(STATUSES)`, Unit 7.1), config objects, and route maps.
- **The `keyof typeof V` pattern** — the complement to `typeof V[number]`. When the source of truth is an object (a config keyed by name, a route map keyed by path), `keyof typeof config` produces the union of legal keys. Used for typed lookup functions, typed event dispatchers, and any "must reference one of these names" type.
- **Indexed access with `number` vs. a specific index**. The senior reach is almost always `[number]` for array-element extraction, not `[0]` or `[1]` — the latter only earns its weight on tuple types (2.4.3) where the per-position types differ. For homogeneous arrays, `[number]` is the form.
- **The `noUncheckedIndexedAccess` interaction**, restated. When the source is a `Record<string, V>` or an array with `noUncheckedIndexedAccess` on, indexed access returns `V | undefined` at the value level — the type-level indexed access on the *type* doesn't undergo the same widening. `Invoice['status']` is `InvoiceStatus`, not `InvoiceStatus | undefined`. The flag operates at the value-read site, not at the type-derivation site. The student doesn't need to add an undefined check when deriving a type.
- **The 2026 reflex the lesson installs**. When a type and a value should track each other, derive the type from the value. When a function takes a key of a known type, constrain the parameter with `K extends keyof T`. When a literal union should be derivable from a const array, write `typeof ARR[number]`. The student's hand defaults to derivation; duplication is a code smell.
- **Forward references**. `Partial<T>`, `Pick<T, K>`, `Omit<T, K>`, and `Record<K, V>` (2.5.7) are all built on `keyof T` and mapped types. The student sees the operators here and meets the utility types in the next lesson; generics in 2.5.8 close the loop on how the operators parameterize.

What this lesson does not cover:

- Mapped types in depth — the `{ [P in K]: T }` syntax is named once as the substrate for utility types; the full surface is 2.5.7 territory.
- Conditional types (`T extends U ? X : Y`) — out of scope for the chapter; the course uses the utility types that wrap conditional types (`Extract`, `Exclude`, `NonNullable`, `ReturnType`) without teaching the underlying mechanism.
- The `infer` keyword — out of scope; named once as "the thing that powers `ReturnType<T>`."
- Tuple-specific indexed access patterns past `[number]` — covered in 2.4.3 light; not revisited.
- Zod-specific type derivation — Unit 7.1.
- Drizzle-specific type derivation — Unit 6.2.

Pedagogical approach:

Mechanics archetype with a Concept opening. Open with the senior question — "the value is the source of truth; the type should track" — and a `CodeVariants` block showing the same `STATUSES` source two ways. Tab 1: an array and a type written separately, drift possible. Tab 2: an `as const` array and `type Status = typeof STATUSES[number]`, drift impossible. The diff is the lesson's seed. Then a `TypeCoding` block walks each operator in isolation. For `typeof V`, the student hovers `typeof config` to see the inferred shape. For `keyof T`, the student hovers `keyof Invoice` to see the key union. For `T[K]`, the student hovers `Invoice['status']` to see the field type. The three hovers are the lesson's mechanics walk. A combined `TypeCoding` block builds the canonical pattern from the ground up: the student writes `const STATUSES = ['paid', 'open', 'void'] as const`, derives `type Status = typeof STATUSES[number]`, writes a function `function setStatus(invoice: Invoice, status: Status)`, and sees the autocomplete fire with the three legal statuses. The pipeline is end-to-end in one block. A small `AnnotatedCode` walks a typed-lookup pattern: `function getConfig<K extends keyof Config>(key: K): Config[K]` with annotations on the `K extends keyof Config` constraint, the `Config[K]` return type, and the call-site narrow — the autocomplete shows only the legal keys and the return type narrows per key. Generics get a forward reference; the lesson uses the form. Close with a `Dropdowns` exercise on a five-line snippet that derives a Zod-like schema's output type — the student picks the right operator at each blank (`typeof`, `keyof`, `[number]`). Optional `SandboxCallout` for free play.

Estimated student time: 40 to 50 minutes.

---

## Lesson 2.5.6 — Utility types — the daily-reach surface

Topics to cover:

- The senior question: the course's types come from schemas, from configs, from API contracts. Often a consumer needs a *variant* of a type — every field optional, only some fields, every field minus a few, the same fields readonly, the type with `null` stripped. Writing each variant by hand is duplication; the language ships eleven utility types that produce the variants from the source. The lesson teaches the eleven utility types a 2026 SaaS engineer reaches for by reflex, with the senior trigger for each. The student finishes able to name the right utility type without a search engine for every reshape they meet.
- The bug class the utility types kill, restated. The "the form state has a `?` on every field; I wrote a separate `InvoiceFormState` type with every field marked optional; the schema gained `currency` last week, the form state didn't" bug. The duplication is the failure mode; the utility types are the move that closes the loop.
- **The eleven utility types**, named with the trigger for each. The chapter walks them in groups; the lesson teaches them grouped by what they reshape.
- **Field-presence reshapes**:
  - **`Partial<T>`** — every field of T becomes optional (`?`). The senior triggers: form state where every field might be unset, update operations (`Partial<Invoice>` is "patch this invoice with whichever fields you pass"), function options objects with all-optional fields. Watch-out: `Partial<T>` is shallow — nested object fields aren't made optional recursively; the senior reach for deep-partial cases is a hand-written type or a library, both rare in application code.
  - **`Required<T>`** — every field of T becomes required (`?` stripped). The senior trigger: a type that started life with optional fields and a consumer needs the variant where everything's been validated as present. Rare in application code; named because the symmetric form completes the surface.
  - **`Readonly<T>`** — every field of T becomes `readonly`. The senior triggers: parameter types that promise no mutation, derived shapes consumed by code that shouldn't write to them. The full `readonly` story from 2.4.2 cashes in here.
- **Field-selection reshapes**:
  - **`Pick<T, K>`** — the type containing only the fields named in K (a key union). The senior triggers: a public-facing type that's a subset of a domain type (`type PublicUser = Pick<User, 'id' | 'name' | 'avatarUrl'>`); a function's parameter shape that's a slice of a larger entity; an API response that's a projection of a row.
  - **`Omit<T, K>`** — the type containing every field of T except the ones named in K. The senior triggers: stripping the auto-managed fields from an insert input (`type CreateInvoiceInput = Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>`), a child component's props that take the parent's minus the ones the parent supplies, a public type minus the secret fields. The watch-out: `Omit` doesn't error if the key isn't actually on T — it silently produces an unchanged type. The senior reflex: pair `Omit` with `keyof T` constraint in a generic wrapper when the codebase needs the safety, or rely on review.
- **Record construction**:
  - **`Record<K, V>`** — the type whose keys are K (a literal union or `string`) and whose values are V. The full treatment is 2.4.4; this lesson restates it as a member of the utility-type family for completeness.
- **Nullability reshape**:
  - **`NonNullable<T>`** — `T` with `null` and `undefined` removed from the union. The senior triggers: after a null-check narrow, when the consumer wants the non-nullable variant as a named type; in generic helpers that take a possibly-nullable T and return the non-null form.
- **Union-member reshapes** (the discriminated-union companions):
  - **`Extract<T, U>`** — the members of T that are assignable to U. The senior triggers: pull the named variant out of a discriminated union (`type SuccessState = Extract<RequestState, { status: 'success' }>`), filter a union to a constrained subset. The state-machine pattern in 2.5.2 cashes in here.
  - **`Exclude<T, U>`** — the members of T that are *not* assignable to U. The senior triggers: the residual after picking a variant out (`type NonIdleState = Exclude<RequestState, { status: 'idle' }>`), removing forbidden values from a union (`type AllowedRole = Exclude<Role, 'banned'>`).
- **Function-type reshapes**:
  - **`ReturnType<F>`** — the return type of a function type. The senior triggers: deriving a hook's return type from its implementation (`type UseInvoice = ReturnType<typeof useInvoice>`), reading a Server Action's return type at the consumer.
  - **`Parameters<F>`** — the parameter list of a function type, as a tuple. The senior triggers: forwarding a function's parameters to a wrapper (`function withLogging(fn: F)(...args: Parameters<F>) { ... }` — full pattern with generics in 2.5.7), deriving a typed mocked function's input.
- **Async unwrap**:
  - **`Awaited<T>`** — the unwrapped type of a `Promise<T>` (or `Promise<Promise<T>>` collapsed). The senior triggers: deriving a Server Action's resolved return type (`type Result = Awaited<ReturnType<typeof createInvoice>>`), typing the consumer of an async function without naming the inner type by hand.
- **The combined idiom**. The utility types compose:
  ```ts
  type CreateInvoiceInput = Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>;
  type UpdateInvoiceInput = Partial<CreateInvoiceInput>;
  type CreateInvoiceResult = Awaited<ReturnType<typeof createInvoice>>;
  ```
  The student sees the composition as one paragraph of derived types from one source. The 2026 reflex: derive everything; restate nothing.
- **What the lesson cuts**. The deeper utility types — `ConstructorParameters`, `InstanceType`, `ThisType`, `ThisParameterType`, `OmitThisParameter` — are out of scope (class-shaped surface the course rarely writes). `Uppercase`, `Lowercase`, `Capitalize`, `Uncapitalize` (the template-literal type helpers) are named in one line as "the template-literal corner; you'll meet them in route-type or i18n libraries, you'll rarely write them." `Promise<T>` and the generic constructors are not utility types — they're generic types proper, covered in 2.5.8.
- **The senior decision** the lesson installs. When you need a variant of a type, the first reach is a utility type, not a new declaration. The duplication is the smell; the derivation is the fix.

What this lesson does not cover:

- Generics in depth — 2.5.8 owns the construction side; this lesson consumes utility types built on generics without unpacking the underlying mechanism.
- Mapped types and conditional types past the surface 2.5.6 named — out of scope.
- Custom utility types — the course doesn't write them in application code; the eleven the language ships cover the daily reach.
- Template-literal types — named in one line; rare in 2026 application code.

Pedagogical approach:

Reference / survey archetype with one Pattern beat for the composition idiom. The lesson's challenge is breadth without inflation — eleven utility types is too many for an exhaustive deep-dive but the surface earns its weight as a unified reference. Open with the senior question — "you need a variant of a type; reach for the utility, not a redeclaration" — and a `CodeVariants` showing the same `CreateInvoiceInput` as a hand-written type vs. `Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>`. The diff is the lesson's seed. Then the eleven utility types walk as a `TabbedContent` block grouped by what they reshape (field-presence, field-selection, record, nullability, union-members, function-types, async-unwrap) — each tab has a one-paragraph trigger and one inline code example. No `TypeCoding` per utility — the student would burn 11x effort on a surface that survey-then-example reads cleanly. The Pattern beat is a `TypeCoding` block on the composition idiom: the student writes the three derived types from `Invoice` (`CreateInvoiceInput`, `UpdateInvoiceInput`, `CreateInvoiceResult`) and hovers each to see the inferred shape. The composition is the lesson's center. Close with a `Matching` exercise pairing eight reshape scenarios ("form state where every field might be unset," "the auto-managed fields stripped from an insert input," "pull the success branch out of a discriminated union," "strip null from a union," "the unwrapped return of an async function," "the parameter tuple of a handler," "a parameter type that promises no mutation," "a public projection of a private domain type") to the right utility type. Optional `SandboxCallout` for free play.

Estimated student time: 40 to 50 minutes.

---

## Lesson 2.5.7 — Generics — basics, constraints, defaults

Topics to cover:

- The senior question: the chapter has been consuming generics constantly — `RequestState<T>` carries a payload, `Map<UserId, Invoice>` carries a key and value, `Partial<T>` reshapes a type, `Pick<T, K>` slices it. The course's helpers will need the same parameterization — a `safeAction(schema, fn)` wrapper that infers types from its arguments (Unit 7.2), a `requireRole(role, fn)` wrapper that narrows the session (Unit 10.2), a `cache(fn, options)` wrapper that preserves the wrapped function's signature (Unit 15.1). The move is generics, and 2026 SaaS code reaches for the constrained-and-defaulted form by reflex. The lesson teaches the senior surface: basic generics, `extends` constraints, and default type parameters.
- The bug class generics kill, stated concretely. The "we wrote `parse(schema, input): unknown` and every caller had to cast the result" bug — the result's type doesn't follow the schema's output. The "we wrote a `pickById<T>(items: T[], id: string): T` but called it with a `User[]` and an `OrgId` and the function silently returned `undefined` because the IDs don't match" bug — the function's parameter types should be related. The "we wrote a `withRole(role, fn)` wrapper and every consumer had to re-type the wrapped function" bug — the wrapper's return signature should mirror the input. The fix: parameters that carry type information through the function, with constraints that enforce the relationship and defaults that make the call site clean.
- **Basic generics**. A type parameter `T` declared in angle brackets and used in the function's signature.
  ```ts
  function first<T>(items: T[]): T | undefined {
    return items[0];
  }
  ```
  The compiler infers `T` from the argument at the callsite — `first([1, 2, 3])` infers `T` as `number`. The senior reach for any function whose input and output types are related but the specific type doesn't matter to the function's body.
- **Constraints with `extends`**. A type parameter restricted to a shape:
  ```ts
  function pickById<T extends { id: string }>(items: T[], id: string): T | undefined {
    return items.find((item) => item.id === id);
  }
  ```
  The `T extends { id: string }` clause says "T must have at least an `id` field of type `string`." The function's body can read `item.id` because the constraint promises it. The callsite refuses any T that doesn't satisfy the shape.
  - **The senior triggers**: any generic that accesses a property of T (the constraint says "T has at least this shape"); any generic that operates on a known subtype family (`T extends Element` for DOM helpers, `T extends z.ZodTypeAny` for Zod helpers, `T extends (...args: any[]) => unknown` for function-wrapping helpers); any generic where unconstrained T would let callers pass nonsensical arguments.
  - **The `keyof T` constraint**, restated from 2.5.5:
    ```ts
    function readField<T, K extends keyof T>(obj: T, key: K): T[K] {
      return obj[key];
    }
    ```
    The `K extends keyof T` constraint ties the key parameter to T's actual keys, and `T[K]` (indexed access from 2.5.5) returns the correct value type per key. The autocomplete on the callsite is exact. This is the senior idiom for "a function that takes a property name of an object."
- **Default type parameters**. A type parameter with a fallback:
  ```ts
  function createCache<T, K extends string = string>(): Map<K, T> {
    return new Map();
  }
  ```
  When the caller passes both (`createCache<Invoice, InvoiceId>()`), both are honored; when the caller passes only one (`createCache<Invoice>()`), the default fills in (`K = string`); when neither is passed, both defaults apply (when there's a default for T too).
  - **The senior triggers**: a generic helper where most callers want one specific default and a minority want to override; a hook or component where the default produces the common case and the override produces the typed-variant case (`useState<string>()` defaults the state type from the initial value, `useReducer<Reducer<S, A>>(...)` doesn't); any utility type the course writes where the second parameter should be inferrable.
- **The `const` type parameter**, named once. TypeScript 5.0+ added the `const` modifier on type parameters: `function build<const T>(items: T): T` infers `T` as the narrowest literal type rather than widening. The senior trigger: a helper that takes a literal-shaped argument and should produce a literal type, not a widened one (used in i18n helpers, route builders, typed event dispatchers). Named because it's the 2026 senior reach for this specific case; not exercised in the lesson body but flagged so the student recognizes the form.
- **Generic functions vs. generic types**, named for the distinction:
  - **Generic functions** — the typical reach. `function map<T, U>(items: T[], fn: (item: T) => U): U[]`. Parameters at the function signature.
  - **Generic types** — `type RequestState<T> = ...`, `type Map<K, V> = ...`. Parameters at the type definition. The course has been writing these since 2.5.1 (`RequestState<T>`); the lesson names the form explicitly so the student maps it to what they've been doing.
  - **Generic classes** — out of scope. The course doesn't write generic classes in application code.
- **Inference vs. explicit type arguments**. The default is inference — the compiler picks T from the arguments. Explicit type arguments (`first<Invoice>(invoices)`) are the conditional, used when inference would be wrong or the function has type parameters that can't be inferred from arguments (a phantom T used only in the return type). The senior reflex: trust inference; reach for explicit type arguments only when the editor's hover shows the wrong inferred type.
- **The 2026 senior idioms**, named with the canonical patterns the course will use:
  - **`safeAction<TSchema extends z.ZodTypeAny>(schema: TSchema, fn: (input: z.infer<TSchema>) => Promise<unknown>)`** — the Server Action wrapper from Unit 7.2. The constraint says "TSchema must be a Zod schema"; the `z.infer<TSchema>` indexes the schema's output type for the handler. The student sees the form here, the wiring in Unit 7.
  - **`requireRole<T>(role: Role, fn: () => Promise<T>): Promise<T>`** — the auth wrapper from Unit 10.2. The generic preserves the wrapped function's return type through the wrapper. The wrapper adds the auth check, the type doesn't change.
  - **`cache<TArgs extends unknown[], TResult>(fn: (...args: TArgs) => Promise<TResult>): typeof fn`** — the cache wrapper from Unit 15.1. The `Parameters<F>`/`ReturnType<F>` substrate from 2.5.6 cashes in.
- **What the lesson cuts**. Generic classes (out of scope), generic interface inheritance (rare in app code), variance modifiers (`in` / `out` on type parameters — out of scope), the historical issues with covariant function arguments — the chapter writes the senior 2026 patterns and skips the historical detours. Higher-kinded types (the language doesn't have them; libraries simulate them — out of scope). Heavy type-level programming (`UnionToIntersection`, mapped-type with `as` clause for renaming) — out of scope; the course's helpers are pragmatic, not type-gymnastic.

What this lesson does not cover:

- Generic classes — out of scope.
- Conditional types (`T extends U ? X : Y`) — out of scope; the utility types from 2.5.6 wrap the conditional-type surface the course needs.
- Variance and `in`/`out` modifiers — out of scope.
- `infer` keyword — out of scope; named once in 2.5.5 as the powering mechanism for `ReturnType<T>`.
- Higher-kinded type simulation — out of scope.

Pedagogical approach:

Mechanics archetype with a Pattern body for the constrained-and-defaulted form. The lesson teaches a syntactic surface and the senior idioms that reach for it. Open with the senior question — "you've been consuming generics for the whole chapter; here's how to write them" — and a `TypeCoding` block where the student writes the `first<T>` function and watches the inference fire at three callsites with three different T inferences. The basic form is the lesson's first beat. The constraints beat lands in a second `TypeCoding`: the student writes `pickById<T extends { id: string }>` and tries to call it with an array that lacks `id` — the compile error is the lesson's payoff. The annotation in the editor reads "Type 'X' does not satisfy the constraint '{ id: string }'." A third `TypeCoding` walks the `readField<T, K extends keyof T>` idiom — the student writes the function and consumes it at three callsites with the autocomplete showing only the legal keys. The pattern is the chapter's `keyof T` from 2.5.5 cashing in. The defaults beat lands in a small `TypeCoding` where the student writes `createCache<T, K extends string = string>` and calls it with one type parameter and with two. An `AnnotatedCode` block walks the `safeAction` shape from Unit 7.2 in 10 lines, with annotations on the `TSchema extends z.ZodTypeAny` constraint and the `z.infer<TSchema>` indexed access. The student sees the senior idiom end-to-end; the wiring is a forward reference to Unit 7. Close with a `CodeReview` exercise on three function signatures — one unconstrained generic that should be constrained, one with explicit type arguments that should be inferred, one with no generic that should have one — and the student leaves a comment with the fix for each. Optional `SandboxCallout` for free play.

Estimated student time: 50 to 60 minutes.

---

## Lesson 2.5.8 — Quizz

Top ten topics to quiz:

1. The Architectural Principle #7 framing — TypeScript for the moves that prevent bug classes, not for the moves that decorate values that already work — and what distinguishes "decoration" from "prevention" on a concrete example.
2. The discriminated-union shape (a union of object types with a shared literal discriminant field) and the bug class it kills (illegal field combinations that the three-independent-fields shape permits).
3. The state-machine pattern as discriminated unions plus transition signatures — per-transition functions whose parameter and return types restrict the legal transitions.
4. The `assertNever` + exhaustive switch idiom — what breaks the build when a new variant is added, and why `default: assertNever(state)` is the senior reach over a generic catch-all.
5. Type predicates (`x is T`) vs. assertion functions (`asserts x is T`) — the block-scoped vs. scope-wide narrow distinction and the trigger for each.
6. Branded types as the move that makes interchangeable IDs non-interchangeable; the brand-factory pattern as the controlled exception to the no-`as` rule; the line between "brand this string" and "leave this string alone."
7. The `typeof V[number]` pattern for deriving a literal union from a const array, and `keyof typeof V` for deriving a key union from a const object.
8. Indexed access types (`T[K]`) for pulling field types out of a parent type without duplication, and the chapter's "derive everything, restate nothing" reflex.
9. The eleven utility types grouped by what they reshape — `Partial`/`Required`/`Readonly`, `Pick`/`Omit`, `Record`, `NonNullable`, `Extract`/`Exclude`, `ReturnType`/`Parameters`, `Awaited` — and which one to reach for in a given reshape scenario.
10. Generics with constraints (`T extends { id: string }`, `K extends keyof T`) and defaults (`K extends string = string`) — the senior 2026 surface for writing helpers that preserve type information through a wrapper.

---

## Total chapter time

Roughly 300 to 370 minutes across the seven teaching lessons plus the quiz. The chapter splits naturally across four or five evenings — discriminated unions plus state machines (2.5.1 + 2.5.2) as a one-and-a-half-evening pairing because the two are tightly linked, exhaustiveness tooling (2.5.3) plus branded types (2.5.4) as the next sitting, the type-level introspection trio (2.5.5) as a short third sitting, utility types (2.5.6) as a survey-paced fourth, generics (2.5.7) as a denser fifth. The student finishes the chapter able to make impossible states unrepresentable, enforce exhaustiveness with `assertNever`, brand the IDs that must not be interchangeable, derive types from values with `keyof` and `typeof`, reach for the right utility type for every reshape, and write a constrained generic that stays readable. Chapter 2.6 (Modules and the module graph) lands directly on this floor — module augmentation (`interface` declaration merging) cashes in on the discriminated-union and branded-type discipline; the rest of the course consumes the moves this chapter taught at every later wire boundary, state machine, and typed wrapper.

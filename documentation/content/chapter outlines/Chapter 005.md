# Chapter 005 — TypeScript bug-class moves

## Chapter framing

Chapter 004 installed the type vocabulary — primitives, literal unions, tuples, `Record`, intersections, narrowing, `as const`, `satisfies`, and the boundary-annotation rule. The student can read and author the TypeScript the rest of the course writes. This chapter takes that vocabulary and builds the **patterns that prevent whole bug classes** — discriminated unions for impossible states, state machines for valid transitions, exhaustiveness checks that make a missed variant a compile error, branded IDs for nominal typing at the column-and-column-confusion seam, and the type-derivation operators (`typeof`, `keyof`, indexed access) plus the utility-type toolbox and generics-with-constraints that keep types tracking the values they describe. The chapter pivots from "what types exist" to "what types prevent."

Threads that must run through every lesson:

- **The bug class up front.** Every lesson opens with the production failure mode the pattern prevents — a `loading` state with a `data` field set, a `success` payload missing the `data` field, a `pending → archived` transition that should be impossible, a `getInvoice(orgId)` that compiled and ran the wrong query, a config object whose value drifted away from its type. The pattern follows the failure.
- **Structural enforcement, not discipline.** The patterns work because the compiler refuses to compile the bug, not because the team agreed to be careful. `assertNever` is mandatory at the bottom of a `switch`, brands are mandatory on IDs that cross schema boundaries, generics have constraints because unconstrained generics admit the bug back in. The senior reflex is to lean on the compiler, not on review.
- **Derive types from values, not from prose.** When a value already encodes the truth (a routes map, a permission table, an array of locales), the type comes from `typeof V`, `keyof typeof V`, `(typeof V)[number]`, not from a hand-maintained type alias that drifts. The chapter installs the derivation operators as the senior default.
- **Forward links into the SaaS stack.** Discriminated unions land again in Server Action result shapes (Unit chapter 043), TanStack Query state (Unit chapter 076), and the notification dispatcher (Unit chapter 070). Branded IDs land in Zod schemas (Unit chapter 042) and Drizzle column types (Unit chapter 037). State machines land in optimistic mutations (Unit chapter 077) and the seat-handoff lifecycle (Unit chapter 058). Each lesson seeds the link in one line.
- **No generics fetish.** Generics earn their lesson because three or four wrapper patterns (`safeAction`, `requireRole`, `cache`, the typed-fetch helper) are load-bearing in 2026 SaaS code. The chapter teaches the form the student will write, not advanced library-author tricks (conditional types at depth, infer-based parsing, recursive types).

The student finishes the chapter able to model a SaaS feature as a discriminated union plus a state machine, enforce exhaustiveness with `assertNever`, brand an ID at the seam where it leaves the database, derive types from configuration values without restating them, reach for the eleven daily utility types by name, and write a constrained generic wrapper they would defend in a code review. Chapter 006 (modules as a graph) and Chapter 007 (async) land on this floor; from here on, the course writes these patterns without commentary.

---

## Lesson 1 — Impossible states, unrepresentable

Teaches the discriminated-union shape as the structural enforcement that makes "loading-with-data" and "success-without-data" bugs uncompilable, the canonical SaaS variants (request state, Result, event message, UI variant), and narrowing by a literal discriminant.

Topics to cover:

- The senior question, framed as a production bug. The student types a request state as `{ isLoading: boolean; data?: User; error?: Error }` and ships it. Six months later a render path reads `state.data.name` on a `{ isLoading: true, error: someError }` value and crashes. The type allowed every combination of fields — including the ones the runtime can never produce. The fix is to make the impossible states unrepresentable.
- Architectural Principle #7, named once. **Model with discriminated unions so impossible states cannot be written down.** The rest of the chapter operates under this principle; lesson lesson 2 of chapter 005 extends it to transitions, lesson 3 of chapter 005 to exhaustiveness, lesson 4 of chapter 005 to identity.
- The discriminated-union shape. A union of object types where each variant carries a literal field — the **discriminant** — that names the variant. The canonical request-state shape: `{ status: 'idle' } | { status: 'loading' } | { status: 'success'; data: User } | { status: 'error'; error: Error }`. The compiler tracks the discriminant across `if`, `switch`, and equality checks; reading `data` on a non-`success` variant fails at compile time.
- Discriminant conventions. The senior defaults named with one-line triggers: `status` for async/request lifecycle, `kind` for general taxonomy, `type` for event messages (matches the platform vocabulary the student already knows from DOM events and Redux-shaped reducers). The course prefers string literals over numbers or booleans for the discriminant — string-literal discriminants survive serialization and read clearly in DevTools.
- The four canonical SaaS variants. Each named with the seam it owns.
  - **Request state.** The async-lifecycle shape above. The `idle` variant earns its weight when the request is conditional on user input; in fire-on-mount cases the union starts at `loading`. Forward link to TanStack Query (Unit chapter 076) and Server Action returns (Unit chapter 043).
  - **Result.** `{ ok: true; value: T } | { ok: false; error: E }`. The expected-failure return shape that lets a function communicate "I tried and failed" without throwing. Forward link to lesson 1 of chapter 008's two-channel rule (throw the unexpected, return the expected).
  - **Event message.** `{ type: 'user.created'; userId: UserId } | { type: 'invoice.paid'; invoiceId: InvoiceId; amount: number } | ...`. The shape every webhook handler, reducer, and queue consumer reads. Forward link to webhook ingestion (Unit chapter 063) and the notification dispatcher (Unit chapter 070).
  - **UI variant.** `{ kind: 'button'; onClick: () => void } | { kind: 'link'; href: string }` — the shape that lets a polymorphic component refuse invalid prop combinations at the call site. Forward link to Unit chapter 022 (components and composition).
- Narrowing by the discriminant. The three forms the student will write: `if (state.status === 'success')` for one branch, `switch (state.status)` for full handling, and equality on the discriminant inside a `.map` or `.filter` callback. Each narrows the variant cleanly without `as`. The compiler does the work.
- The shape rule, stated plainly. Every variant must include the discriminant key with a literal value. Optional fields belong inside the variant where they make sense, not at the top level. A field that exists on every variant lives outside the discriminated structure (e.g., on a wrapping type) or gets duplicated into each variant if the value differs by variant.
- The `as const` foreshadow. A factory that returns `{ status: 'loading' }` inlines the discriminant correctly because TypeScript infers literal types for string-literal returns; an array of states declared as `const STATES = [{ status: 'loading' }, { status: 'success', data: user }]` widens unless `as const` is applied. Named once; lesson 7 of chapter 004 owns the depth.
- The flat-state anti-pattern, contrasted. Side-by-side: the flag-set shape (`isLoading`, `isSuccess`, `data?`, `error?`) and the discriminated shape. The flag-set shape admits 16 combinations; the runtime produces 4. The discriminated shape admits exactly 4. The compiler enforces the cut.

What this lesson does not cover:

- State transitions and the functions that mutate the union (lesson 2 of chapter 005 owns the machine).
- Exhaustive `switch` enforcement with `assertNever` (lesson 3 of chapter 005 owns the compile-error guarantee).
- Branding the IDs inside variants (lesson 4 of chapter 005 owns nominal typing).
- The Zod parse that produces a discriminated union at the wire boundary (Unit chapter 042).
- Reducer patterns past the basic discriminant-on-action shape — Zustand and TanStack Query land in Unit 15.

Pedagogical approach: Pattern archetype. Open with the flag-set bug as a paired snippet — the type that allows the impossible state, then the runtime crash. Walk the discriminated-union shape on the same example. Show all four canonical variants in tight code blocks with one-line framing on the seam each owns. Use a `script-coding` exercise where the student converts a `{ isLoading; isSuccess; data?; error? }` shape to a discriminated union and the tests cover the four valid states plus rejection of an invalid combination. Close with a `Buckets` exercise sorting eight scenarios ("async fetch lifecycle," "a function that can fail predictably," "webhook payload," "a button-or-link component," "a form field that's text-or-number-or-select," "a feature flag's on/off state," "a polymorphic toast notification," "an idempotent settings value") into "discriminated union" or "plain shape."

---

## Lesson 2 — States plus transitions

Teaches the flow state-machine pattern as discriminated unions extended with per-transition function signatures, per-state invariants, and the three canonical SaaS machines (optimistic mutation, upload, subscription).

Topics to cover:

- The senior question. The student typed a request as a discriminated union; the variants are watertight. But the **transitions** between variants are still implicit — any code can write `state.status = 'success'` from `state.status = 'error'` because the union doesn't track which transitions are valid. The bug class: an upload at `state.status = 'aborted'` transitions to `state.status = 'uploading'` because a stale callback fired. The fix is to type the **transition functions**, not just the variants.
- The state-machine pattern. A discriminated union for the states plus a set of typed transition functions where each function takes a specific state as input and returns a specific state (or set of states) as output. The compiler refuses transitions the type doesn't allow.
- The minimum shape. For an upload feature: states are `{ kind: 'idle' } | { kind: 'uploading'; progress: number; controller: AbortController } | { kind: 'done'; url: string } | { kind: 'error'; error: Error }` (`AbortController` is introduced in lesson 4 of chapter 007); transitions are `start(state: { kind: 'idle' }): { kind: 'uploading'; ... }`, `progress(state: { kind: 'uploading'; ... }, progress: number)`, `succeed`, `fail`, `cancel`. The student should leave able to read this shape without commentary.
- Per-state invariants. Each state holds exactly the data the state is valid with — the `controller` lives on `uploading`, the `url` on `done`, the `error` on `error`. The compiler enforces that the caller can't read `url` on `uploading` or `controller` on `idle`. The invariants live in the type, not in a runtime check.
- The three canonical SaaS machines.
  - **Optimistic mutation.** Source state, optimistic state with the user's change applied locally, rollback state on server failure, confirmed state on server success. The shape every TanStack Query mutation operates against (Unit chapter 077). Per-state invariants: the optimistic variant carries the original value so rollback restores it; the confirmed variant doesn't.
  - **Upload.** The shape above. The student will see it again in the R2 presigned-PUT flow (Unit chapter 068 and chapter 069); the type is the same regardless of the binary destination.
  - **Subscription.** Stripe billing's plan lifecycle — `trialing`, `active`, `past_due`, `canceled`, `incomplete`. The variants are dictated by Stripe; the senior reach is to model them as a discriminated union with the per-variant fields Stripe sends (Unit chapter 064). Per-state invariants: `past_due` carries a `nextRetryAt`; `canceled` carries a `canceledAt`; `trialing` carries a `trialEndsAt`.
- Transition functions vs. reducers. Both are valid forms; the lesson defaults to standalone transition functions for legibility and notes the reducer form (`(state, event) => state`) as the shape Zustand and React's `useReducer` consume. One sentence on each; deeper treatment lands in Unit chapter 078 (Zustand) and Unit chapter 024 (`useReducer`).
- The illegal-transition guard. When a transition function receives a state the function shouldn't accept, the compile error fires at the call site. The student leaves understanding that `start(currentState)` fails at compile time if `currentState` could be `uploading`; the fix is to narrow the state first or to compose smaller transition functions that each accept one variant.
- The diagram. A Mermaid state diagram showing states as nodes and transitions as labeled edges, side-by-side with the TypeScript shape. The diagram is the value: state machines are easier to read pictorially, and the diagram is the first artifact a senior draws when designing one.
- The boundary with state-machine libraries. XState exists, is excellent for complex orchestrated workflows (multi-step wizards with parallel states, history nodes, actors). 2026 SaaS reality: the typed-discriminated-union plus transition functions cover 90% of cases; XState earns its weight when the machine has more than ~5 states with branching transitions, or when visualizing the machine in the inspector pays for itself. One paragraph; the course commits to the plain-TypeScript form.

What this lesson does not cover:

- XState API surface (named once as the threshold tool).
- `useReducer` at depth (Unit chapter 024).
- Zustand state machines (Unit chapter 078 and chapter 079).
- Side-effect orchestration inside transitions (effects, timers, retries) — Unit chapter 043 and Unit chapter 077 land the production patterns.

Pedagogical approach: Concept archetype with a Mermaid diagram at the center. Open with the stale-callback bug — the upload that came back to life. Show the upload machine's state union and the four transition function signatures side by side; this is the lesson's center of gravity. Use a `react-coding` or `script-coding` exercise where the student types the four transitions for the optimistic-mutation machine, with tests that verify the compiler refuses an invalid transition. Close with a `Matching` exercise pairing four real SaaS features ("invoice payment retry," "file upload," "draft-to-published article," "Stripe subscription lifecycle") to the state machine diagrams that fit.

---

## Lesson 3 — Exhaustiveness, enforced

Teaches type predicates (block-scoped narrow), assertion functions (scope-wide narrow), and the `assertNever` plus `satisfies never` idioms that make a missing variant a compile error.

Topics to cover:

- The senior question. The student typed an event message as a discriminated union, wrote a `switch (event.type)` to handle each variant, and shipped. Six months later, a new event variant is added to the union — and the `switch` silently doesn't handle it because the default branch falls through to a no-op. The fix is to make the missing case a compile error at the moment the variant is added. The compiler should refuse to build the missing handler.
- The two enforcement idioms. Both rely on the `never` type as the bottom of the type lattice — the type with no inhabitants.
  - **`assertNever(value)`.** A small helper: `function assertNever(value: never): never { throw new Error(`Unhandled variant: ${JSON.stringify(value)}`) }`. Called in the `default` branch of a `switch` on the discriminant. If every variant is handled, the value at the default is `never` and the call compiles. If a variant is missing, the value at the default is the missing variant and the call fails to compile. The classic form; ships in every senior SaaS codebase.
  - **`satisfies never`.** Since TypeScript 4.9, the same enforcement without a helper function. Write `event satisfies never` at the bottom of the `switch`. Same compile-error behavior, no runtime cost (the `satisfies` operator erases). The senior reach when no runtime throw is needed (the function returns before the bottom, or the bottom is logically unreachable).
- When to reach for which. `assertNever` when the bottom is reachable in some pathological runtime case and the throw is the right failure mode (a webhook payload with an unknown type from a future Stripe API version). `satisfies never` when the bottom is structurally unreachable and the type check alone is the point. The course defaults to `assertNever` for handler patterns where the runtime fallback is part of the contract.
- The two narrowing helpers the chapter has already named, now with proper depth.
  - **Type predicates** — `function isUser(value: unknown): value is User { ... }`. The return type `value is User` tells the compiler that when the function returns `true`, the value is `User` inside the if-block where the call appears. The narrow is **block-scoped**. The reach: filtering an array of `User | Guest` down to `User[]` via `.filter(isUser)`, narrowing a `unknown` parsed from the wire before passing into typed code.
  - **Assertion functions** — `function assertIsUser(value: unknown): asserts value is User { if (!isUser(value)) throw new Error(...) }`. The return type `asserts value is User` tells the compiler that after the call returns (without throwing), the value is `User` for the rest of the scope. The narrow is **scope-wide**. The reach: the test-fixture pattern, the parse-or-throw seam at a service boundary, the `expect(value).toBeUser()`-style helper.
- Authoring the runtime check. Both helpers depend on a runtime check that actually validates the shape. The body of `isUser` for production code should be a Zod parse, not a hand-written `'email' in value && typeof value.email === 'string'` chain that drifts from the schema. Forward link to Unit chapter 042 — Zod owns the schema authoring, the type-predicate idiom owns the narrowing surface that imports the parser.
- The exhaustive-switch contract, stated plainly. **Every `switch` on a discriminated union's discriminant ends with `assertNever` or `satisfies never`.** Anything less means a future variant can land without the team noticing. The course writes this discipline into every reducer, every event handler, every router that dispatches by `type` or `kind`.
- The lookup-map alternative. For dispatch where the body of each case is a value (not a procedure), a `Record<Variant, Handler>` lookup is the cleaner shape. With `Record<LiteralUnion, Handler>` from lesson 4 of chapter 004, the compiler enforces that every variant has a handler — the same exhaustiveness check, expressed as a completeness constraint on the record's keys. One paragraph naming the trigger.
- The `noFallthroughCasesInSwitch` companion, named once. From the strict tsconfig (lesson 4 of chapter 024), a `case` without an explicit `break` or `return` is an error. This flag plus `assertNever` together make `switch` statements both exhaustive (every variant handled) and unambiguous (no accidental fall-through).

What this lesson does not cover:

- Zod schema authoring (Unit chapter 042).
- The `unknown`-in-catch narrow with `instanceof Error` (lesson 2 of chapter 008).
- Advanced runtime validation libraries (Valibot, ArkType) — Zod is the course's commit.
- Conditional types or `infer` for type-level extraction (out of scope; library-author territory).

Pedagogical approach: Pattern archetype with a wrong-then-right opener. Open with the missing-variant bug — the `switch` that silently ignored a new event type. Show the unguarded `switch` and the same `switch` with `assertNever` at the bottom; the compile error fires the moment a variant is missing. Walk type predicates and assertion functions in adjacent code blocks, with the block-scoped vs. scope-wide distinction in a small annotated diagram. Use a `script-coding` exercise where the student adds `assertNever` to a `switch` on a four-variant union, then adds a fifth variant to the union without updating the switch, and the test verifies the compiler now refuses to build. Close with a `Matching` exercise pairing four narrowing scenarios ("filter `(User | Guest)[]` to `User[]`," "validate `unknown` from the wire," "assert a fixture in a test," "make `switch` refuse to compile on a new variant") to the right tool (`isFoo`, `assertIsFoo`, `assertNever`, `satisfies never`).

---

## Lesson 4 — Branded IDs

Teaches the branded-string pattern (`unique symbol` and `__brand` forms), brand factories, the Zod and Drizzle integration points, and the line between IDs that earn a brand and strings that don't.

Topics to cover:

- The senior question. The student wrote `function getInvoice(invoiceId: string)` and `function getUser(userId: string)`. Both parameters are `string`. The call site `getInvoice(currentUser.id)` compiles — the structural type system sees two `string`s and shrugs. The bug ships; the query returns the wrong row; the user sees someone else's invoice. The fix is **nominal typing on IDs**: a `UserId` is a `string` at runtime but a distinct type at compile time, and the compiler refuses to pass one where the other is expected.
- TypeScript is structural; brands give it nominal seams. One paragraph: structural typing matches by shape (any two `string`s are the same); nominal typing matches by name (a `UserId` named `UserId` is distinct from a `string` even if both are `string` at runtime). Brands are the standard technique for adding nominal typing at the seams where it pays.
- The two brand forms with their triggers.
  - **String-intersection brand** — `type UserId = string & { readonly __brand: 'UserId' }`. A phantom property attached to the type only; the runtime value is still a string. Easy to read, easy to write, easy to compose with utility types. The default for internal codebases. The course commits to this form.
  - **`unique symbol` brand** — `declare const userIdBrand: unique symbol; type UserId = string & { readonly [userIdBrand]: never }`. The same pattern with a guaranteed-unique symbol key, preventing any collision with a real `__brand` field a third-party type might use. The senior reach when the codebase publishes a library or when the branded type must round-trip across module boundaries with `declare module` (lesson 4 of chapter 006). Named in one paragraph; the course defaults to the string-intersection form and reaches for the symbol form when a brand crosses a package boundary.
- The brand factory. A small function that asserts a `string` is a branded ID after validation: `function userId(value: string): UserId { return value as UserId }`. The factory is the only place `as` appears for the brand; downstream code never asserts. The factory is the seam where validation lives — in production, the body is a Zod parse or a UUID regex check, not a bare cast. Pattern named, then shown with the Zod integration:
  - The shipped form: `const UserId = z.string().uuid().brand<'UserId'>()` produces a Zod schema whose `parse` output is the branded type. The Standard Schema integration (Zod 4 in 2026) carries the brand into the inferred type. Unit chapter 042 owns the Zod depth; the lesson here shows the integration point.
- Where brands earn their weight, named with one-line triggers.
  - **Primary keys** — `UserId`, `OrgId`, `InvoiceId`, `SessionId`. The original mix-up bug above; the brand prevents it at every call site.
  - **External keys with semantic identity** — `StripeCustomerId`, `StripePriceId`, `R2ObjectKey`. The values are strings the third party owns; the brand prevents the team from passing a `StripeCustomerId` where a `StripeSubscriptionId` was expected. Three paragraphs of webhook handlers later, the brand pays for itself.
  - **Secret-typed values** — `BearerToken`, `WebhookSecret`. The brand makes the value visible at the type level so a logger or response body can be linted against it. Forward link to Unit chapter 081 (security baseline).
- Where brands do **not** earn their weight. The senior cut, stated plainly. A `string` that holds free-form user input (an article title, a comment body, a search query) is just a `string` — branding it adds noise without preventing a real bug. The trigger for a brand: the value crosses a schema boundary, has semantic identity (matches a record somewhere), and could plausibly be confused with a different value of the same shape. If none of those, the string is a string.
- The Drizzle integration, named once. Drizzle's column-level types can be branded by combining the `.$type<UserId>()` modifier with the brand factory; the row's `id` field comes back as `UserId`, not `string`. Forward link to Unit chapter 037 — the schema is the source of truth.
- Brands at the wire boundary. The wire never sees a brand — JSON serialization erases the phantom property. The brand exists in the codebase; the value crosses the wire as a plain `string`; the receiving end re-brands at the parse seam (Zod). This is the load-bearing rule: brands are a compile-time tool, not a runtime contract.
- Forward links. Better Auth's `Session.userId` becomes `UserId` via the `declare module` pattern (lesson 4 of chapter 006). Action wrappers in Unit chapter 057 (`requireRole`, audit-trail entries) consume branded IDs. Branded IDs appear in route segment params (Unit chapter 029) and Server Action arguments (Unit chapter 043).

What this lesson does not cover:

- Zod schema authoring (Unit chapter 042).
- Drizzle column type customization (Unit chapter 037).
- `declare module` mechanics for third-party augmentation (lesson 4 of chapter 006).
- Nominal-typing alternatives (TypeScript's open issue for `unique type`, Effect's `Brand` module) — named in one line; the string-intersection brand is the course's commit.
- Branded numbers, branded booleans. Same pattern; the lesson sticks to strings because that's where the bug class lives.

Pedagogical approach: Pattern archetype. Open with the `getInvoice(currentUser.id)` bug — the call that compiled and ran the wrong query — as a paired snippet. Show the unbranded types, the brand declaration, and the call site failing to compile in three short code blocks. Walk the brand-factory pattern and the Zod integration in adjacent blocks. Use a `script-coding` exercise where the student brands `OrgId` and `UserId`, writes a factory for each, and the tests verify that passing one where the other is expected fails to compile. Close with a `Buckets` exercise sorting eight string values ("user primary key," "comment body," "Stripe customer ID," "search query," "webhook secret," "article title," "session token," "URL path segment") into "brand it" or "leave it."

---

## Lesson 5 — Derive types from values

Teaches the `typeof V`, `keyof T`, and `T[K]` operators and the load-bearing 2026 idioms (`typeof ARR[number]`, `keyof typeof OBJ`) that keep types tracking the values they describe.

Topics to cover:

- The senior question. The student writes a routes map: `const ROUTES = { home: '/', invoices: '/invoices', settings: '/settings' } as const`. They want a `RouteName` type (`'home' | 'invoices' | 'settings'`) and a `RoutePath` type (`'/' | '/invoices' | '/settings'`). The wrong move: hand-author both as separate type aliases that drift the moment the routes map is edited. The right move: derive both from the value. The chapter installs `typeof`, `keyof`, and indexed access as the operators that make this derivation mechanical.
- The three operators with their triggers.
  - **`typeof V`** — at the type level, extracts the inferred type of a runtime value. `typeof ROUTES` produces the literal-typed `{ readonly home: '/'; readonly invoices: '/invoices'; ... }` (with `as const` from lesson 7 of chapter 004). Without `as const`, `typeof ROUTES` widens to `{ home: string; ... }`. The companion rule: `typeof` at the type level is **different** from the `typeof` operator at the value level; the type-level form requires a value identifier on the right.
  - **`keyof T`** — extracts the union of keys of a shape type. `keyof typeof ROUTES` produces `'home' | 'invoices' | 'settings'`. The composition `keyof typeof V` is the 2026 idiom for "give me the keys of this config object as a literal union."
  - **Indexed access, `T[K]`** — extracts the value type at key `K`. `(typeof ROUTES)['home']` is `'/'`. `(typeof ROUTES)[keyof typeof ROUTES]` is `'/' | '/invoices' | '/settings'` — the union of value types across all keys. The reach for "give me the union of values" from a typed-config object.
- The two load-bearing idioms, named.
  - **`typeof ARR[number]`** — the union of element types in a tuple or array. `const LOCALES = ['en', 'es', 'fr'] as const; type Locale = typeof LOCALES[number]` produces `'en' | 'es' | 'fr'`. The reach for any place a value list and a type union must stay in sync — the locales the i18n module supports (Unit chapter 084), the permission strings an action wrapper accepts (Unit chapter 057), the plan tiers Stripe ships against (Unit chapter 064).
  - **`keyof typeof OBJ`** — the union of keys from a typed-config object. The route-name example above. Pair with the `as const satisfies T` pattern from lesson 7 of chapter 004 — the config validates against a contract and keeps the literal keys.
- The derived-type test. State the rule plainly: **if a hand-written type alias mirrors the keys, values, or structure of a runtime value, derive it from the value instead.** The hand-written form admits drift; the derived form refuses it.
- A worked example tying the pieces together. A permissions config: `const PERMISSIONS = { 'invoice:read': ['member', 'admin'], 'invoice:write': ['admin'], 'org:billing': ['owner'] } as const satisfies Record<string, readonly Role[]>`. Derived types: `type Permission = keyof typeof PERMISSIONS` (the permission keys), `type Role = (typeof PERMISSIONS)[Permission][number]` (the union of all roles that appear in any permission). The compile-time guarantee: adding a new permission updates `Permission` automatically; removing a role updates `Role` automatically. The student leaves with a pattern they'll reach for in Unit chapter 057 (RBAC).
- The reverse trap. Deriving a value from a type does not work — types are erased at compile time. If the student needs both a runtime value list and a compile-time union, the value is the source and the type is derived. The hand-written-type-and-hand-written-value pair is the anti-pattern; one of them must derive from the other.
- The third site, named in one paragraph. **`ReturnType<F>` and `Parameters<F>`** (utility types from lesson 6 of chapter 005) compose with `typeof` to extract function-shape types: `type ActionArgs = Parameters<typeof saveInvoice>[0]`. The lesson names this once; lesson 6 of chapter 005 owns the utility-type depth.
- Forward links. Drizzle's `$inferSelect` and `$inferInsert` (Unit chapter 037) are the schema-side application of this principle — the row type comes from the schema value, not from a parallel type declaration. Next.js route segment params (Unit chapter 029) use the same derivation against the route's `params` schema.

What this lesson does not cover:

- Mapped types and conditional types (utility types only; lesson 6 of chapter 005).
- `infer` in conditional types (out of scope; library-author territory).
- The `instanceof` and `typeof` runtime operators at depth (lesson 6 of chapter 004 owns narrowing).
- Branded-type integration with derived types — straightforward composition; named in one line.

Pedagogical approach: Concept archetype with a Mechanics close. Open with the routes-map example and the drift-prone hand-written type alias. Walk `typeof`, `keyof`, and indexed access in three tight code blocks operating on the same `ROUTES` value. Show the two load-bearing idioms (`typeof ARR[number]`, `keyof typeof OBJ`) as the senior-reflex forms. Use a `script-coding` exercise where the student is given a permissions config (the worked example) and types `Permission`, `Role`, and a `hasPermission(role: Role, permission: Permission): boolean` function whose argument types derive from the config. Close with a `Buckets` exercise sorting six "I want this type" scenarios ("the keys of my routes map," "the elements of my locales array," "the values of my routes map," "the return type of my action function," "a literal union of every permission key," "the parameter type of my Server Action") into the right derivation form (`keyof typeof`, `typeof ARR[number]`, `(typeof OBJ)[K]`, `ReturnType<F>`, `Parameters<F>`).

---

## Lesson 6 — The utility-type toolbox

Teaches the eleven daily-reach utility types grouped by what they reshape (`Partial`/`Required`/`Readonly`, `Pick`/`Omit`, `Record`, `NonNullable`, `Extract`/`Exclude`, `ReturnType`/`Parameters`, `Awaited`) and how they compose into derived types.

Topics to cover:

- The senior question. The student has an exported `Invoice` type from the database schema. They need: the same shape with all fields optional (for a partial-update endpoint), the same shape with `id` and `createdAt` removed (for the insert payload), the union of `Invoice['status']` values minus the terminal ones (for the "can still edit" check), the return type of an existing action function, the awaited value of a `Promise<User>`. The student could rewrite each by hand; the utility types do it mechanically.
- The eleven utility types, grouped by what they reshape. Each gets one line on what it does and one line on the production seam where it earns its weight.
  - **Field-modifier transforms.**
    - **`Partial<T>`** — every field optional. The partial-update payload shape: `Partial<Invoice>` for `PATCH /invoices/:id`.
    - **`Required<T>`** — every field required (removes `?`). The reach when narrowing a config object whose fields are optional at write time but always present at read time (after defaults applied).
    - **`Readonly<T>`** — every field `readonly`. The reach for returning a value the caller shouldn't mutate; pairs with `as const` for literal-typed config returns.
  - **Field-selection transforms.**
    - **`Pick<T, K>`** — keep only the named keys. `Pick<Invoice, 'id' | 'total' | 'currency'>` for a slim list-view DTO.
    - **`Omit<T, K>`** — remove the named keys. `Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>` for the insert payload (the database fills these). The most-reached utility type in CRUD code.
  - **Construction.**
    - **`Record<K, V>`** — lesson 4 of chapter 004 owns the lesson; named here as the construction utility for completeness. With a literal-union `K`, every key is required and present.
  - **Nullability transforms.**
    - **`NonNullable<T>`** — remove `null` and `undefined` from a union. `NonNullable<User['avatarUrl']>` extracts the string when the type is `string | null`. The reach after a narrow.
  - **Union-set operations.**
    - **`Extract<T, U>`** — keep members of `T` that are assignable to `U`. `Extract<InvoiceStatus, 'draft' | 'sent'>` for the can-still-edit subset.
    - **`Exclude<T, U>`** — remove members of `T` assignable to `U`. `Exclude<InvoiceStatus, 'paid' | 'void'>` for the same subset, expressed by exclusion.
  - **Function-shape transforms.**
    - **`ReturnType<F>`** — extract the return type of a function. `ReturnType<typeof saveInvoice>` for the result shape downstream code consumes.
    - **`Parameters<F>`** — extract the parameter tuple of a function. `Parameters<typeof saveInvoice>[0]` for the first argument's type. The reach for typing a wrapper or a higher-order function.
  - **Async-shape transforms.**
    - **`Awaited<T>`** — unwrap a `Promise<T>` (and recursive Promises) to its resolved type. `Awaited<ReturnType<typeof fetchInvoices>>` for the resolved value of an async action. Pairs with `Promise.all` results in lesson 3 of chapter 007.
- The composition rule. Utility types compose: `Partial<Pick<Invoice, 'total' | 'currency'>>` produces an optional-fields slim type; `Pick<Invoice, Exclude<keyof Invoice, 'id'>>` is the long form of `Omit`. The senior reflex is to read these inside-out and chain only when the chain is more legible than the alternative — a deeper chain than two compositions usually wants a named type alias for readability.
- The Drizzle and Zod seams, named once each. Drizzle's `$inferSelect` and `$inferInsert` (Unit chapter 037) produce the canonical row types; `Pick` and `Omit` slice them for DTOs. Zod's `z.infer<typeof schema>` (Unit chapter 042) produces the validated type; `Partial` and `Pick` slice it for partial-update endpoints.
- The non-utility types worth knowing but rarely reaching for. `Capitalize`, `Uncapitalize`, `Uppercase`, `Lowercase` — string-literal transforms; named in one line because they appear in template-literal type patterns the student will read in route segment types (Next.js typed routes). `InstanceType<C>` — extracts the instance type of a class constructor; rare in the SaaS path past lesson 2 of chapter 009 (classes narrowly).
- The roll-your-own boundary. State the rule: if a transform isn't expressible by chaining utility types, the senior call is usually a named type alias, not a custom mapped type. Mapped types (`{ [K in keyof T]: ... }`) exist; they're a sharp tool; reach for them when the codebase has 3+ types that would benefit from the same transform. Named once; the lesson does not teach mapped-type authoring.

What this lesson does not cover:

- Authoring mapped types (named, not taught — the daily reach is the built-in utilities).
- Authoring conditional types with `infer` (library-author territory).
- The `NoInfer<T>` utility added in TypeScript 5.4 — niche; named in one line as the trigger for generic wrapper functions whose inference would otherwise widen.
- Template literal types at depth (route segment typing is Next.js-owned; Unit chapter 029).

Pedagogical approach: Reference / survey archetype with a worked-example opener. Open with the five "I need this shape" scenarios from the senior question; show one bad solution (hand-rewriting each shape) and one good solution (chained utility types) side by side. Walk the eleven utilities in the four groups above, each with a single-line code example. Show two short composition examples — `Omit` + `Partial` for a slim partial-update DTO, `ReturnType` + `Awaited` for an async action's resolved value. Use one `Matching` exercise pairing eight "I want this shape" scenarios ("partial-update payload," "insert payload," "can-still-edit status subset," "the resolved value of a fetch," "the first argument of an action," "a slim list DTO," "a config with all fields required at read time," "a non-null narrow of an optional field") to the right utility-type chain. No coding exercise; the lesson is about reaching for the right tool by name, and the matching exercise is the confirmation.

---

## Lesson 7 — Generics with constraints

Teaches generic functions and types, `extends` constraints (including `K extends keyof T`), default type parameters, the `const` modifier, and the senior 2026 wrapper idioms (`safeAction`, `requireRole`, `cache`).

Topics to cover:

- The senior question. The student writes `function identity(value: unknown): unknown { return value }` and the return type drops to `unknown` — the function works but the type information is lost. They want `function identity(value: T): T` to preserve the type. Generics are the language feature that lets a function or type accept a type parameter the caller supplies (or the compiler infers). The lesson covers generics at the depth a SaaS engineer needs to read and write the wrappers Unit 6 and beyond depend on.
- Generic functions, the minimum shape. `function identity<T>(value: T): T`. The `<T>` declares a type parameter; the parameter and return reference it; the call site either supplies `T` explicitly (`identity<number>(42)`) or lets the compiler infer (`identity(42)` infers `T = number`). The senior reach is to let inference do the work; explicit type arguments earn their weight only when inference would be wrong or ambiguous.
- Generic types, the minimum shape. `type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E }`. The `<T, E = Error>` declares two type parameters with `E` defaulting to `Error`. The default makes `Result<User>` valid (with `E` implicitly `Error`) and `Result<User, ValidationError>` valid (with `E` overridden). Defaults are the senior reach to keep ergonomic call sites for the common case.
- Constraints with `extends`. The reach: a function that accepts only types satisfying a structural condition. The canonical forms:
  - **`T extends string`** — accept only string-assignable types. The reach for a wrapper that operates on string-shaped inputs (branded IDs, string literals).
  - **`T extends Record<string, unknown>`** — accept any object shape. The reach for a "shallow-merge defaults" helper. Forward link to Unit chapter 022's prop-merging patterns.
  - **`K extends keyof T`** — the most load-bearing constraint in 2026 SaaS TypeScript. The reach for any function that accepts an object and a key into it: `function pluck<T, K extends keyof T>(obj: T, key: K): T[K]`. The constraint says "K must be a key of T," and the return type indexes into T at that key. The student should leave able to read this signature without commentary.
- The `const` modifier on a type parameter. TypeScript 5.0 added `<const T>` — the type parameter infers literal types where it would otherwise widen. `function tabs<const T extends readonly string[]>(values: T): { ... }` called as `tabs(['home', 'about'])` infers `T` as `readonly ['home', 'about']`, not `string[]`. The senior reach: any wrapper whose inferred type should preserve literal narrows for downstream derivation. Named with one worked example.
- The three senior 2026 wrapper idioms, each shown end-to-end.
  - **`safeAction`** — a Server Action wrapper that catches thrown errors, validates the input with Zod, and returns a `Result<T, E>` discriminated union. Signature shape: `function safeAction<Input extends ZodType, Output>(schema: Input, handler: (input: z.infer<Input>) => Promise<Output>): (input: unknown) => Promise<Result<Output, AppError>>`. `ZodType` is the base TypeScript type every Zod schema satisfies, and `z.infer<S>` extracts the output type of schema `S` — full depth in lesson 4 of chapter 042. The generic parameters tie the schema, the input type, and the output together. Forward link to chapter 043.
  - **`requireRole`** — an action wrapper that asserts the caller has a role before running the handler. Signature: `function requireRole<Role extends RoleName, Output>(role: Role, handler: (ctx: Ctx<Role>) => Promise<Output>): Promise<Output>`. The generic ties the role to the context shape the handler receives. Forward link to chapter 057.
  - **`cache`** — a memoization wrapper that types the function's parameters and return faithfully. Signature shape: `function cache<P extends unknown[], R>(fn: (...args: P) => R): (...args: P) => R`. The generic on `P extends unknown[]` is the spread-parameters idiom; the wrapper preserves the wrapped function's call shape. Forward link to Unit 14 (cache decisions).
- The conventional names. `T` for "any type," `K` for "key type," `V` for "value type," `R` for "return type," `P` for "parameters." Two-letter names like `TArgs`, `TReturn` are accepted in some style guides; the course uses the short single-letter forms because every reader of TypeScript knows them and the names rarely need to communicate more than position.
- The unconstrained-generic trap, named once. An unconstrained `T` is the same as `unknown` for what the function can do with the value — it can't read fields, can't call methods, can only pass the value through. The bug class: a function whose body needs to read a field on the generic value will fail to compile until the constraint is added. The senior reflex: write the constraint that names what the function actually needs.
- When to reach for a generic vs. when to overload. Function overloads (multiple call signatures for the same implementation) are the older form; generics with conditional return types (`function f<T>(x: T): T extends string ? number : boolean`) are the modern form. The course defaults to generics; overloads are named in one line as the legacy form the student will see in older library types.
- Variance, named in one paragraph. Type parameters can be **covariant** (output positions), **contravariant** (input positions), or **invariant** (both). TypeScript 4.7 added explicit variance annotations (`out`, `in`); they're rare in app code and earn their weight in library types. Named here so the student recognizes the syntax in library types and doesn't try to use them in app code.

What this lesson does not cover:

- Conditional types with `infer` at depth (library-author territory).
- Mapped types as generic transforms (named in lesson 6 of chapter 005; not taught here).
- Higher-kinded types / type-level programming (out of scope).
- The `NoInfer<T>` utility (named in lesson 6 of chapter 005).
- Generic classes at depth — covered briefly in lesson 2 of chapter 009 where classes earn their narrow reach.

Pedagogical approach: Pattern archetype with a Reference close. Open with the `identity` function — the wrong version dropping to `unknown`, the right version preserving the type — as a paired snippet. Walk generic functions, generic types, and constraints in three tight sections. Show `K extends keyof T` as the load-bearing constraint with one worked example. Show `const T` with the tabs example. Then walk the three wrapper idioms — `safeAction`, `requireRole`, `cache` — each as a labeled code block with the generic parameters annotated. Use a `script-coding` exercise where the student writes a `pluck<T, K extends keyof T>(obj: T, key: K): T[K]` function, with tests verifying the return type narrows correctly across multiple call sites. Close with a `Matching` exercise pairing five generic-function scenarios ("identity," "pluck a key from an object," "wrap an action with input validation," "memoize a function preserving its signature," "tabs config preserving literal labels") to the generic-parameter shape they require.

---

## Lesson 8 — Quizz

Top 10 topics to quiz:

1. Discriminated unions: the discriminant field, the canonical SaaS variants (request state, Result, event message, UI variant), and the flat-state anti-pattern that admits impossible states.
2. State machines as discriminated unions plus typed transition functions, with per-state invariants on the data each variant holds.
3. `assertNever` vs. `satisfies never` for exhaustiveness checks, and the trigger that picks one over the other.
4. Type predicates (`value is T`) for block-scoped narrowing versus assertion functions (`asserts value is T`) for scope-wide narrowing.
5. Branded IDs: the string-intersection brand form, the brand factory pattern, the Zod and Drizzle integration points, and the line between IDs that earn a brand and strings that don't.
6. The two load-bearing 2026 idioms: `keyof typeof OBJ` for a union of keys from a config, and `typeof ARR[number]` for a union of elements from a value list.
7. The eleven daily utility types grouped by what they reshape (`Partial`/`Required`/`Readonly`, `Pick`/`Omit`, `Record`, `NonNullable`, `Extract`/`Exclude`, `ReturnType`/`Parameters`, `Awaited`), with the production seam each owns.
8. Composing utility types: `Omit` + `Partial` for partial-update DTOs, `ReturnType` + `Awaited` for resolved async values, and the senior boundary past which a named alias beats a deeper chain.
9. Generic functions with `extends` constraints, with `K extends keyof T` as the most load-bearing constraint; default type parameters; and the `<const T>` modifier for literal-preserving inference.
10. The three senior 2026 wrapper idioms (`safeAction`, `requireRole`, `cache`) and the generic-parameter shape each requires.

---

## Total chapter time

Roughly 215 to 255 minutes across the seven content lessons plus the quiz. The chapter splits naturally across three evenings — lesson 1 of chapter 005 + lesson 2 of chapter 005 + lesson 3 of chapter 005 (discriminated unions, state machines, exhaustiveness — the union-modeling triad) as one sitting, lesson 4 of chapter 005 + lesson 5 of chapter 005 (branded IDs and value-derived types) as the second, lesson 6 of chapter 005 + lesson 7 of chapter 005 (utility types and generics with the three wrapper idioms) plus the quiz as the third. At the end the student can model a SaaS feature as a discriminated union with typed transitions, enforce exhaustiveness with `assertNever`, brand IDs at the schema seam, derive every config-shaped type from its value, reach for the eleven utility types by name, and write a constrained generic wrapper they would defend in code review. The rest of the course writes these patterns without commentary.

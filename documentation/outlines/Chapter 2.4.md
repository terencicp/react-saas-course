# Chapter 2.4 — TypeScript: typing the values you already know

## Chapter framing

Chapter 2.1 installed the values-and-references mental model. Chapter 2.2 taught the function as the unit a senior reaches for. Chapter 2.3 taught the shapes those functions operate on. Across all three the student has been reading and writing TypeScript on every snippet — annotated parameters, inferred locals, `Map<UserId, Invoice>`, `readonly` previewed once, `?.` driving narrowing. This chapter formalizes the static surface: the type language a 2026 SaaS engineer writes by reflex against the values, functions, and collections already in their hands. Chapter 2.5 then teaches the *moves* that surface enables — discriminated unions, branded types, generics, utility types, the patterns that make impossible states unrepresentable. Here the job is the vocabulary, the modifiers, and the write-site discipline.

The senior framing for the chapter: **the type is part of the value's contract, not a label glued on after.** A primitive narrowed to a literal union (`'paid' | 'open' | 'void'`) tells the compiler — and the next reader — what values are legal. A `readonly` on a parameter promises a caller their array won't mutate. `as const` freezes a literal at the value site so the type system can use it. `satisfies` validates a value against a contract without widening the literal type back to its parent. The student leaves the chapter able to write a type that mirrors the value's intent, and able to spot the call site where a sloppier type would have shipped the wrong bug.

Threads that must run through every lesson:

- **Strict on by default.** The `tsconfig.json` from 1.4.3 is operational: `strict`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `verbatimModuleSyntax`. The chapter writes against those flags; the surface in front of the student is what's actually there in their editor. No "imagine if strictNullChecks were on" framing — it is on.
- **Inference-led with explicit boundaries.** The 2.4.10 rule operates from the first snippet: parameter types annotated, return types inferred except on exported APIs and type-guard signatures, locals inferred. The lessons name the rule once at the start and honor it in every example. Over-annotation from JSDoc-era habits is named as the failure mode and cut.
- **Literal types are the senior reach for finite domains.** Statuses, roles, plan tiers, environment names — anything with a known finite set of legal values gets a literal union, not a `string`. `enum` is named once and dismissed; the course writes literal unions. `as const` is the tool that makes literals stick at the value site; the lesson where it earns its weight is also where the student stops widening by accident.
- **No `any`. `unknown` is the escape hatch.** `any` exits the type system; `unknown` says "I don't know yet, narrow me." The chapter names the surface where `unknown` lives — parsed JSON, `catch` bindings, untyped third-party returns — and the narrowing tools that turn `unknown` into something useful (Zod at the boundary, `typeof`/`instanceof`/`Array.isArray` inside the function).
- **Assertions are an admission, not a shortcut.** `as` and `!` exist; in 2026 SaaS code they're the conditional, not the default. Every `as` is a promise the developer makes to the compiler that the reader of the PR will see and reason about. The chapter names the three legitimate triggers for each and the dominant alternative (a Zod parse, a control-flow narrow, a destructure with a default) at every other site.
- **The type writes once, autocomplete pays compound.** Every well-typed parameter, every literal union, every `as const`/`satisfies` pair upgrades the IDE's autocomplete, error messages, and refactor safety for free. The lessons name the autocomplete payoff where it lands — it's the visible compounding return on the strictness floor.
- **Naming for intent stays operating.** `type InvoiceStatus = 'paid' | 'open' | 'void'`, `type CreateInvoiceInput = { ... }`, `type UserId = string` (the brand lands in 2.5.5). The 2.2.3 reflex on naming types — domain noun, suffixed with intent when the type is a shape-of-something rather than the thing itself — runs through every snippet.

The chapter ships small standalone snippets in TypeScript. `TypeCoding` carries the type-only practice with twoslash hover queries; `ScriptCoding` carries the runtime examples where types narrow through a function. The student finishes the chapter able to type any value they've written so far, choose between `type` and `interface` with a reason, write a literal union that locks the legal values, narrow `unknown` to a useful shape, and use `as const` and `satisfies` to keep literal types where the runtime semantics demand them.

The chapter ordering reflects how the static surface composes. Primitives and the four top/bottom types come first because every later annotation references them. Object types and modifiers come next — `type` vs. `interface` and the per-field modifiers (`?`, `readonly`) are taught together because the modifiers are what makes a type definition useful. Tuples follow because they're an array-shaped variant of the object-shape discipline. Index signatures and `Record` come fourth — the lesson on dynamic-keyed shapes, paired with the watch-outs that come from `noUncheckedIndexedAccess`. Unions and intersections come fifth as the composition operators on the types built so far. Narrowing comes sixth because it's the consumer side of unions — once you have `string | number` in the type, the language gives you the tools to ask which one you have. `as const` and `satisfies` come seventh as the value-site moves that keep types narrow; they share a lesson because they earn their weight together. Inference, annotations, and type-only imports close the teaching chapter — the write-site discipline that everything in the chapter has been honoring, now named explicitly so the student can defend it on a code review.

---

## Lesson 2.4.1 — Primitives, literal types, and the four corners

Topics to cover:

- The senior question: when you write `function calculateTax(amount, rate)`, what's the cheapest type-level upgrade that catches the most bugs. The answer is the annotation of each parameter with the primitive type that fits, and — when the parameter has a finite domain — the further narrow to a literal union. The lesson opens on the workhorse types and walks down to the corners (`unknown`, `any`, `never`, `void`) that handle the edges.
- The seven primitive type names, in one paragraph: `string`, `number`, `bigint`, `boolean`, `symbol`, `null`, `undefined`. Lowercase by convention — the uppercase `String`, `Number`, `Boolean` types refer to the wrapper-object types and are almost never what the senior wants (named once, dismissed). The student has seen all seven values in Chapter 2.1; this lesson types them.
- Literal types as the narrowing of a primitive to a single value. `'paid'` is a type whose only legal value is the string `'paid'`. `42` is a type whose only legal value is the number `42`. `true` is a type whose only legal value is `true`. The compiler treats them as singleton types — they compose into unions to model finite domains.
- Literal unions as the senior reach for finite-domain values:
  - **Status fields** — `type InvoiceStatus = 'paid' | 'open' | 'void';`. The dominant pattern: any field with a known finite set of legal values.
  - **Role names** — `type Role = 'owner' | 'admin' | 'member';`. Used heavily in Unit 10 (RBAC).
  - **HTTP method types**, **environment names**, **plan tiers**, **notification channels** — every domain the course touches has at least one literal union.
  
  The autocomplete payoff is the visible win: typing `setStatus(invoice, '` in the editor pops the three legal values, and a typo (`'pad'`) fails at compile time. The runtime check at the boundary (Zod's `z.enum(['paid', 'open', 'void'])`, Unit 7.1) is the load-bearing partner; the type carries the shape, the schema enforces it at the wire.
- The `enum` keyword named once and dismissed. TypeScript's `enum` predates literal unions, has runtime emission (every numeric `enum` ships a reverse-mapping object, every string `enum` ships a constant object), and locks values into a structure that's harder to compose. Literal unions are the senior reach in 2026 — no runtime cost, free composition (`type Status = InvoiceStatus | 'pending'`), the editor surfaces them identically. The course doesn't write `enum`s; the `const`-objects-with-`as const` form (Lesson 2.4.7) covers the rare case where a literal union isn't enough.
- The four corners of the type lattice — the types at the edges of "ordinary primitive." Each named with the trigger for when it earns its weight and the bug class that mistaking one for another produces.
  - **`any`** — opt out of the type system entirely. Any value, any operation, no checking. The senior call: in 2026 application code, `any` is a bug. Two narrow exceptions named: scaffolding during a refactor (a temporary `any` with a `// FIXME` comment that gets resolved before the PR merges), and the rare case where a third-party library's types are so wrong that `any` plus a comment naming the upstream issue is clearer than fighting the type. The chapter writes `unknown` everywhere `any` would be tempting.
  - **`unknown`** — "I don't know the type yet, narrow me before you use me." The type-safe escape hatch. Any value assigns *to* `unknown`; nothing assigns *from* `unknown` without a narrowing step (`typeof`, `instanceof`, `Array.isArray`, a Zod parse). The senior triggers: parsed JSON (`JSON.parse(...)` returns `unknown` in modern type definitions — and even where it returns `any`, the senior reflex is to type the local as `unknown` immediately), `catch (error)` bindings (TS strict default since 4.4), untyped third-party returns. The lesson teaches `unknown` as the contract — the value exists but its shape isn't known until you check it.
  - **`never`** — the type with no legal values. The contract reads: "this code path can't happen, or this function never returns normally." Two production triggers named:
    - **Exhaustiveness checks** — `assertNever` in a `switch` default (full treatment in 2.5.4); when every case is handled, the residual type at `default` narrows to `never`, and adding a new case to the union without handling it breaks the build.
    - **Functions that don't return** — `throw` always, infinite loop, `process.exit()`. The return type is `never`. The compiler uses this to narrow callers: `assertIsAdmin(user)` typed as `(user: User) => asserts user is Admin` and `throwOnError(error): never` both shape the call-site narrowing in ways `void` can't.
    
    `never` also surfaces in conditional types and `keyof T` over an empty type — those are 2.5 territory; this lesson names `never` at the surface where the student first meets it.
  - **`void`** — the return type for functions that don't produce a useful value. Distinct from `undefined`: a `void`-returning function may return `undefined`, but its return value is contract-typed as "ignore me." The senior trigger: event handlers, fire-and-forget callbacks, `useEffect` setup functions (which return `void` or a cleanup function, full treatment in 4.9). The surprise: TypeScript intentionally lets a `void`-returning callback be passed a function that returns something — `[1,2,3].forEach(x => arr.push(x))` works even though `.push` returns `number`, because the `forEach` callback's return type is `void` and ignoring a returned value is fine. The lesson names this rule once so the student isn't confused when they meet it.
- The senior watch-out on `null` vs. `undefined`. Both are legal, both are primitives, both have their own types. The 2026 reflex: optional fields and "missing" values are typed with `undefined` (the `?` modifier produces `T | undefined`, not `T | null`), and `null` is reserved for the cases where the domain itself distinguishes "absent" from "explicitly cleared" (a database column where `null` is a deliberate value, a tri-state form field). The course defaults to `undefined`; `null` is the conditional. The full destructuring-and-default story is in 2.2.2 and 2.2.5; this lesson names the typing convention.
- One forward reference. Branded types (2.5.5) take literal-union discipline one step further — `type UserId = string & { __brand: 'UserId' }` makes a `userId` and an `orgId` non-interchangeable. The student sees the seed here so the brand makes sense when it lands.

What this lesson does not cover:

- `type` vs. `interface` (2.4.2).
- Object-type modifiers (`?`, `readonly`) (2.4.2).
- Narrowing in depth (2.4.6).
- Type predicates and assertion functions (2.5.4).
- Branded types (2.5.5).
- Symbols in production code beyond naming them as a primitive — out of scope for 2026 SaaS work.

Pedagogical approach:

Mechanics archetype with a Reference walk through the corners. Open with the senior question — "the cheapest type-level upgrade on `function calculateTax(amount, rate)`" — and a `TypeCoding` block where the student types the two parameters as `number` and watches the editor flag a string callsite. The literal-union beat lands next: a `TypeCoding` where the student narrows `string` to `'paid' | 'open' | 'void'` on an `InvoiceStatus`, then sees autocomplete fire in `setStatus(invoice, '` and the typo `'pad'` flagged inline. The autocomplete payoff is the lesson's center. The four corners walk as a `TabbedContent` with one tab per corner — each tab opens with the trigger that earns it and a small `ScriptCoding` or `TypeCoding` example. For `unknown`, the student takes a `JSON.parse` result typed as `unknown` and narrows with `typeof` to access a property. For `never`, the student writes a `throwIfMissing` function typed `(value: T | undefined) => asserts value is T` (one line of assertion-function signature previewed) and sees how the caller's local narrows. For `any`, the lesson shows one `any` slipping a typo through and names the rule: never the default. For `void`, the lesson shows the `forEach` surprise and explains the rule. Close with a `Buckets` exercise sorting eight scenarios ("I just called `JSON.parse`," "I'm typing an event-handler callback," "I'm in a `catch` block and I want to log the error," "I'm writing an `assertNever` for a status switch," "I'm declaring a function that always throws," "I want to opt out of type-checking on a refactor," "I'm typing the fourth status I just added to the union," "I'm typing a function that returns nothing useful") into "`unknown`," "`never`," "`void`," or "literal union." Optional `SandboxCallout` with a small `parseInvoice` function that returns `unknown` for free play.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.4.2 — `type` vs. `interface` and per-field modifiers

Topics to cover:

- The senior question: when you need to give a name to an object's shape, do you write `type` or `interface`, and what makes each field optional, readonly, or both. The lesson teaches the two keywords together with the per-field modifiers because the modifiers are how a type definition becomes useful — a bare `type Invoice = { id, status, customer }` doesn't capture the contract until `id` is `readonly`, `status` is a literal union, and the modifiers tell the reader which fields are required.
- The two keywords, named for what each does and what each costs:
  - **`type`** — a type alias. Assigns a name to any type expression — a primitive, a literal union, an object shape, an intersection, a conditional type (2.5). Closed at the declaration site: you can't reopen a `type` to add fields later.
  - **`interface`** — an object-shape declaration. Restricted to object shapes (and function signatures, which the course writes as `type` aliases by convention). Open: an `interface Foo` can be reopened in another file or module to add fields (declaration merging). The senior trigger that earns `interface` over `type`: declaration merging is the actual feature — used in module augmentation (2.6.4) to extend `Better Auth`'s `Session` type, `next-intl`'s message types, and Drizzle's relations. The course writes `interface` only when declaration merging is the goal.
- The senior rule, stated plainly. **Default to `type`. Reach for `interface` when declaration merging is the actual feature.** The full reasoning:
  - `type` composes with the operators that 2.4.5 and 2.4.6 teach — union (`A | B`), intersection (`A & B`), conditional types — without ceremony. `interface` only models object intersection through `extends`, which is more verbose for the same composition.
  - `type` aliases name any type, not just objects. The student writes `type InvoiceStatus = 'paid' | 'open' | 'void'` and `type UserId = string` next to `type Invoice = { ... }`, and the keyword is uniform. Switching to `interface` only for the object case is noise.
  - Declaration merging is a *feature* of `interface`, but in application code it's almost always an accident — a second `interface Foo` somewhere in the codebase silently extends the first, and the bug surfaces as a "missing property" error miles from the cause. Closing the declaration with `type` is the safer default.
  - Performance differences between `type` and `interface` on large codebases (a real factor in the early TypeScript era) are negligible in 2026 with the modern compiler.
- The 2026 consensus, named in one line: most major TypeScript style guides (the typescript-eslint project, the React docs, the major frameworks' codebases) default to `type` and reach for `interface` on the merging trigger. The course follows.
- The per-field modifiers:
  - **`?` — optional field**. `type Invoice = { id: string; note?: string }` types `note` as `string | undefined`, and the callsite may omit it (`{ id: 'inv_1' }` is legal). The watch-out from 2.2.2: optional fires on `undefined`, not on `null`. The autocomplete on the destructured side reflects the optionality (`const { note } = invoice` types `note` as `string | undefined`).
  - **`readonly` — per-field immutability at the type level**. `type Invoice = { readonly id: string; status: InvoiceStatus }` lets the compiler refuse `invoice.id = '...'` reassignment, while allowing `invoice.status = 'paid'`. The senior triggers: identity fields (IDs, slugs), timestamps that the system owns (`createdAt`), and any field where mutating from outside the owning module is a domain bug. Runtime mutation is still possible — `readonly` is a compile-time contract, not `Object.freeze` — but the type-level contract catches the bug in the editor.
  - **The two combine**: `readonly note?: string` is a legal modifier pair.
- The array-level `readonly` and the `Readonly<T>` cousin:
  - **`readonly` on array types**. `readonly string[]` (or `ReadonlyArray<string>`) refuses mutating methods on the array — `.push`, `.pop`, `.sort`, `.splice` are not in the type, and even index-assignment (`arr[0] = ...`) is refused. The senior trigger: function parameters that promise "I won't mutate this array." A `(invoices: readonly Invoice[])` signature is a contract; the caller can pass a mutable `Invoice[]` (TS allows the implicit narrowing on call) and trust that the function won't reorder or replace elements.
  - **`Readonly<T>`** — the utility-type version that makes every top-level field of `T` `readonly`. Used to derive a read-only view of an existing type without restating every field. Shallow — nested object fields are not recursively frozen. The full utility-type treatment is in 2.5.7; this lesson names `Readonly<T>` so the student recognizes the form when it appears.
  - **`as const`** — the value-site move that produces deeply readonly types from a literal value. The full treatment is in 2.4.7; named here as the partner to the type-level `readonly`.
- The discipline the lesson installs. Identity and audit fields are `readonly`; arrays passed into functions that don't mutate them are `readonly`. The two together kill the canonical "I mutated an input my caller didn't expect to be mutated" bug class.
- TypeScript on optional vs. defaulted, restated. The distinction from 2.2.2 fires here at the type level. `{ pageSize?: number }` types `pageSize` as `number | undefined` — the caller can omit, the consumer sees the union. A `{ pageSize: number }` parameter with a runtime default (`function f({ pageSize = 25 }: { pageSize?: number })`) is the form that destructures-with-default to land a concrete `number` in the function body — the type is still optional, the body's local is `number` after destructuring. The lesson names this pair once so the student doesn't trip over the difference in 2.4.5 when index signatures land.
- One forward reference. Module augmentation in 2.6.4 is where declaration merging on `interface` cashes in — extending `Session`, the request type in a route handler, or `next-intl`'s message types. The student sees `interface` in that context and recognizes why the keyword earned its weight there specifically.

What this lesson does not cover:

- Index signatures and `Record<K, T>` (2.4.4).
- Mapped types and `Pick`/`Omit`/`Required` (2.5.7).
- `extends` for interface inheritance — named in one line; the course rarely uses it because intersection (`type Foo = A & B`) covers the composition without the OOP framing.
- Declaration merging mechanics in depth (2.6.4).
- `Object.freeze` (2.1.1).

Pedagogical approach:

Decision archetype with a Mechanics body for the modifiers. Open with the senior rule — "default to `type`, reach for `interface` when declaration merging is the actual feature" — and a small `CodeVariants` showing the same `Invoice` shape written as `type` and as `interface`, with the senior reasoning on each tab. The student sees the equivalence and the costs. The modifier walk lands in a `TypeCoding` block: the student types an `Invoice` with `readonly id`, optional `note`, and a `readonly Invoice[]` parameter on a `summarize` function, then watches the editor flag `invoices.push(...)` inside the function body and `invoice.id = '...'` from the caller. The compile errors are the lesson's payoff. A small `AnnotatedCode` walks one canonical row-to-DTO mapping (`type CreateInvoiceInput = { readonly orgId: OrgId; readonly customerId: CustomerId; note?: string }`) with annotations pointing at each modifier and naming the bug it prevents. Close with a `Matching` exercise pairing six scenarios ("a field that must not change after creation," "a field the caller may omit," "an array a function promises not to mutate," "extending a third-party `Session` type," "modeling a finite status set," "naming a primitive alias") to the right tool (`readonly`, `?`, `readonly T[]`, `interface` + merging, literal union via `type`, `type` alias). Optional `SandboxCallout` with the `Invoice` type for free play. No mandatory sandbox.

Estimated student time: 40 to 50 minutes.

---

## Lesson 2.4.3 — Tuples and readonly tuples

Topics to cover:

- The senior question: when does a fixed-length array with per-position typing earn its weight over an object with named fields. The answer: rarely — but when it does, the cases are concrete enough that the student needs the syntax. The dominant tuple in 2026 React + Next.js code is `useState`'s return value (`const [value, setValue] = useState(...)` — the type is `[T, Dispatch<SetStateAction<T>>]`), followed by custom hooks that return paired values, and a handful of utility patterns. Beyond that, an options object beats a tuple for readability.
- The senior rule, stated plainly. **Default to an object. Reach for a tuple when the consumer always destructures by position, the positions have an established convention, or the tuple is the return type of a hook whose ergonomic shape the ecosystem expects.** Outside those triggers, name the fields.
- Tuple syntax. `type Pair = [string, number]` types a two-element array where index 0 is a `string` and index 1 is a `number`. The compiler enforces both the element types and the length. Three element types means three elements; four means four. `const p: Pair = ['hello', 1, 2]` fails.
- Tuple element labels — the readability upgrade. `type Range = [start: number, end: number]` adds names to the positions. The names don't change the runtime value or the indexing — `range[0]` still works — but they show up in autocomplete, error messages, and the destructuring callsite's IDE hint (`const [start, end] = range` — the IDE hovers each binding with its label). The senior reflex: any tuple with two or more elements gets labels.
- Optional and rest in tuples. `type Args = [first: string, second?: number]` makes the second position optional (length 1 or 2). `type Args = [first: string, ...rest: number[]]` makes the tuple variadic past the first position. The senior triggers: typing the parameter list of a forwarded call (`Parameters<typeof inner>` produces a tuple type — 2.5.7), or modeling a fixed-prefix followed by a variadic remainder (rare in application code, common in library types).
- `readonly` tuples. `type Coords = readonly [x: number, y: number]` makes the tuple immutable at the type level — no `.push`, no index assignment. The senior trigger: the same as `readonly` on an array (parameter that won't be mutated), plus the case where the tuple is being passed across a boundary (return from a hook, return from a utility) and the consumer shouldn't be able to alter it. The full immutability story is the chapter's running thread; tuples are just the array-shaped variant.
- The `as const` interaction, previewed. A literal tuple value (`[1, 2, 3]`) infers as `number[]` by default. The same value with `as const` (`[1, 2, 3] as const`) infers as `readonly [1, 2, 3]` — both the length and the values become fixed at the type level. The full `as const` treatment is in 2.4.7; named here because the literal-tuple inference question lands here.
- Where tuples show up in production SaaS code, with one line each so the student recognizes the pattern:
  - **React hooks**: `useState`, `useReducer`, `useTransition`, `useActionState` (Unit 7.3) — all return tuples by convention.
  - **Custom hooks** that return paired values (`useToggle()` returns `[boolean, () => void]`).
  - **`Object.entries` and `Map` entries**: each entry is a `[key, value]` tuple — the iterator pattern from 2.3.5.
  - **Coordinate-like values**: `[x, y]`, `[r, g, b]`, `[lat, lng]` — when the domain itself reads as positional and an object would noise the call.
  - **Function-parameter-list types** (`Parameters<T>` returns a tuple) — 2.5.7.
- What the lesson cuts. Heterogeneous arrays as "ad-hoc tuples" — when the order is unclear or the positions aren't ecosystem convention, the senior reach is an object. The `[ok, error]` Go-style return tuple is named once and dismissed — the course uses the `Result<T, E>` discriminated-union pattern (2.5.2 and 7.2.3) for that, not positional tuples. Tuple types as the workhorse for typing function arguments — the conditional case, used inside library types more than application code.
- TypeScript on tuple inference. The default inference on a literal array value is the widest array type that fits the elements (`[1, 2, 3]` infers as `number[]`). The narrowing tools — explicit annotation (`const point: [number, number] = [1, 2]`), `as const`, and the `satisfies` operator (2.4.7) — keep the tuple shape when it earns its weight.

What this lesson does not cover:

- `as const` in depth (2.4.7).
- `satisfies` (2.4.7).
- `Parameters<T>` and `ReturnType<T>` utility types (2.5.7).
- The `Result<T, E>` pattern (2.5.2, 7.2.3).
- Heterogeneous variadic types past the rest-element form named here (out of scope for 2026 application code).

Pedagogical approach:

Mechanics archetype with a Decision opening. Open with the rule — "default to an object; tuples earn their weight on `useState`-shaped returns and a few other concrete patterns" — and a `CodeVariants` showing the same paired return written as a tuple (`[value, setValue]`) vs. an object (`{ value, setValue }`), with the senior reasoning on each tab (the tuple wins on hook ergonomics; the object wins everywhere else). Then a `TypeCoding` block where the student types a `useToggle` hook's return as a labeled `readonly` tuple `readonly [isOn: boolean, toggle: () => void]`, then destructures it at the callsite (`const [isOn, toggle] = useToggle()`) and sees the labels in the editor's hover hint. A small `ScriptCoding` exercises `Object.entries` iteration with the tuple destructure (`for (const [key, value] of Object.entries(invoice)) ...`) so the student feels the tuple shape they've already been writing in Chapter 2.3 with its type-level shape named. Close with a `TrueFalse` round on five statements about tuples ("a `readonly` tuple can be passed where a mutable tuple is expected," "optional tuple elements must follow required ones," "tuple labels change the runtime value," "a literal `[1, 2, 3]` infers as a tuple by default," "`as const` makes a literal array infer as a `readonly` tuple"). No sandbox.

Estimated student time: 25 to 35 minutes.

---

## Lesson 2.4.4 — Index signatures and `Record<K, T>`

Topics to cover:

- The senior question: when the keys of an object aren't known statically — a config keyed by a runtime string, a translations map keyed by locale code, an aggregation keyed by status — what type captures it. Two tools: the index signature (`{ [k: string]: T }`) and the `Record<K, T>` utility type. They overlap in coverage and diverge in two important corners; the lesson teaches both, names the divergence, and picks the senior default.
- The two forms, side by side:
  - **Index signature**: `type StatusCounts = { [status: string]: number };` declares that any string key maps to a `number`. The `status` label is documentation only — it doesn't constrain the keys to anything narrower than `string`.
  - **`Record<K, V>`**: `type StatusCounts = Record<string, number>;` is the same shape via the utility type. Equivalent for the open-keyed case.
- Where they diverge — the corner that picks one form over the other:
  - **Finite key set via `Record<Literal Union, T>`**. `Record<InvoiceStatus, number>` types an object whose keys are *exactly* `'paid' | 'open' | 'void'`. Every key in the union must be present at construction (or TS errors); no extra keys are legal. The senior trigger: completeness checks, exhaustive lookup maps (the lookup-map alternative to `switch` from 2.2.4), and any "one-to-one map from a finite domain" shape. The index-signature form (`{ [k: string]: number }`) can't express this — it always allows any string key. `Record<K, V>` is the senior reach when the keys are a literal union.
  - **Excess-property checks**. With an explicit index signature, *no* excess-property checks fire — `{ [k: string]: number }` accepts any object literal with number values, including ones the caller "didn't mean to add." With `Record<string, number>` the same behavior holds because the type is structurally identical. The divergence the TOC hints at lives in the *intersection* case: `type StatusCounts = { paid: number } & Record<string, number>` allows arbitrary keys plus a guaranteed `paid` field, but excess-property checks don't fire because the index signature lets any key through. The senior call: pick `Record` for finite keys, use intersection only when the domain genuinely needs both.
  - **Narrowing on read**. The `noUncheckedIndexedAccess` flag from 1.4.3 fires on both forms: `counts['paid']` returns `number | undefined`, not `number`, because the runtime might not have the key. The exception: `Record<Literal Union, V>` with a *literal* key narrows — `counts.paid` (or `counts['paid']` when `'paid'` is a literal-typed key) returns `V`, not `V | undefined`, because the type system knows `paid` must be present. Open-keyed records always return the union with `undefined`.
- The senior reach for the four canonical shapes:
  - **Open dynamic keys, uniform values** — `Record<string, T>`. Used for caches, lookup tables built at runtime, parsed JSON shapes with arbitrary keys.
  - **Finite key set, uniform values** — `Record<LiteralUnion, T>`. Used for exhaustive lookup maps, finite caches, completeness-required objects (a record of formatters per status, a record of icons per role).
  - **Known shape, optional dynamic extras** — `{ id: string; status: InvoiceStatus } & Record<string, unknown>`. The intersection escape hatch. Rare in application code; more common in library types that model "your shape plus whatever else." The senior reflex: prefer a discriminated union or a separate field rather than the intersection in domain code.
  - **`Map<K, V>`** — the senior reach when the keys are non-string, the count is unbounded, the iteration order is load-bearing, or the runtime is hostile to plain-object key handling (prototype pollution from untrusted input). Taught in 2.3.4; named here because the type-level decision and the runtime decision are the same question.
- The "object as record" vs. "object as struct" framing carries from 2.3.1. The struct (named fields, known shape) gets a `type` or `interface` with explicit fields. The record (uniform value type, dynamic keys) gets `Record<K, V>`. The senior watch-out: a type that started as a struct can drift into a record over time — adding fields one by one is the senior maintenance path, not switching to a record because "we keep adding fields." The record is for the cases where the *keys* are dynamic, not where the type author is tired of typing field names.
- `noUncheckedIndexedAccess` revisited at the call site. The student has already seen `users[0]` returning `User | undefined` on arrays (2.3.2). The same flag fires on `Record<string, T>` keyed reads. The senior reflex: `?.` after the index access, a guard, or a `Map.get()` (which always types `V | undefined`, and the senior expects the undefined). The `Record<LiteralUnion, V>` form is the one place the flag doesn't add the union — the keys are statically known, the type system is sure.
- One forward reference. `Partial<Record<K, V>>` is the shape for "finite keys, every value optional" — used in form state, where every legal field might be unset. The full utility-type combinator treatment is in 2.5.7.

What this lesson does not cover:

- `Map` mechanics (2.3.4 owns them).
- Mapped types — the underlying mechanism `Record<K, V>` is built on (`{ [P in K]: V }`) — out of scope here; 2.5.6 and 2.5.7 touch the surface when utility types land.
- `keyof` and indexed access types (2.5.6).
- Excess-property checks in depth across `type`/`interface`/`Record` — the chapter names the rule once; the spec's full corners are out of scope.

Pedagogical approach:

Decision archetype with a Mechanics body. Open with the four shapes — open-keyed record, finite-keyed record, known struct, `Map` — as a small decision matrix in a `TabbedContent` block, each tab naming the trigger and the type to reach for. The student sees the surface in one visual. Then a `TypeCoding` block where the student types a `statusCounts: Record<InvoiceStatus, number>` and watches the editor enforce all three keys at construction — leaving out `'void'` is a compile error, adding `'pending'` is a compile error. The completeness payoff is the lesson's center. A small follow-up `TypeCoding` contrasts the same value typed as `Record<string, number>` — every key is legal, no completeness check, `counts.paid` is `number | undefined`. The student feels the two forms diverge in their hands. A `ScriptCoding` walks an exhaustive lookup map (`const formatters: Record<InvoiceStatus, (i: Invoice) => string> = { ... }`), the lookup-map alternative to `switch` from 2.2.4, with the formatters keyed by status. The student writes the discipline. Close with a `Buckets` exercise sorting six scenarios ("translations map keyed by locale code," "icon map keyed by role from a finite set," "cache of computed values by ID," "form state with known fields," "metadata of arbitrary user tags," "audit-log row counts per status") into "`Record<string, T>`," "`Record<LiteralUnion, T>`," "`type { ... }`," or "`Map<K, V>`." Optional `SandboxCallout` for free play.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.4.5 — Unions and intersections

Topics to cover:

- The senior question: when a value can legally be one of several shapes, or must satisfy several constraints at once, what's the type-level surface that captures it. The answer is two operators — `|` (union) and `&` (intersection) — and the chapter has been writing both already (`'paid' | 'open' | 'void'` in 2.4.1, the `readonly Invoice[]` parameter shape implied in 2.4.2). This lesson formalizes the two operators, names the bug class each catches, and seeds the discriminated-union pattern that Chapter 2.5 cashes in.
- Union types — the "or" composer:
  - **Literal-of-primitive unions**, restated. `type InvoiceStatus = 'paid' | 'open' | 'void'`. The dominant shape for finite domains.
  - **Mixed-primitive unions**. `type Id = string | number`. The senior trigger: APIs that accept either form (a URL parameter that's a string but the database column is a number, a Stripe ID that's a string vs. a numeric customer ID). The watch-out: the union widens until you narrow — `function fetchById(id: string | number)` can't call `.toUpperCase()` on `id` until a `typeof` guard narrows the branch.
  - **Shape unions**. `type Result = { ok: true; value: string } | { ok: false; error: string }`. The senior reach for any value that's "one of several disjoint shapes," and the seed of the discriminated-union pattern. The discriminant field (`ok`, `kind`, `type`, `status`) is what makes narrowing tractable — without it, the consumer can't tell which branch they're in. The full discriminated-union treatment is 2.5.2; this lesson names the form so the student sees the shape that 2.5 makes load-bearing.
  - **Nullable unions**. `string | null`, `User | undefined`. The dominant shape for "this might be missing." The 2026 default is `T | undefined` (the `?` modifier produces this); `T | null` is the conditional for domain-meaningful absence.
- The senior watch-out on unions: until you narrow, the union is the lower bound of the operations the type permits. A `string | number` lets you call `String(x)` (works on both) and the rare property both share (`.toString`, `.valueOf`), but not `.toUpperCase` or `.toFixed`. The full narrowing surface is 2.4.6; this lesson names the reflex.
- Intersection types — the "and" composer:
  - **Object-shape intersection**. `type WithTimestamps = { createdAt: Date; updatedAt: Date }; type Invoice = Base & WithTimestamps;`. The senior trigger: composing a domain type from a small set of named shape mixins (timestamps, audit fields, soft-delete flags, org-scoping). Used heavily in Unit 6 (Drizzle schemas) and Unit 10 (org-scoping).
  - **The interface alternative**: `interface Invoice extends Base, WithTimestamps { ... }`. The same composition via inheritance. The course writes intersections for shape composition because they uniform with `type` aliases everywhere else; `interface extends` is named once and dismissed for the application-code case.
  - **Type-narrowing intersections**. `type AdminUser = User & { role: 'admin' }`. Used to refine a broader type to a narrower variant. Composes with type guards (2.4.6) — `function isAdmin(user: User): user is AdminUser` ties the intersection to the runtime check.
  - **Primitive intersections (branded types, previewed)**. `type UserId = string & { __brand: 'UserId' }`. The brand makes a string non-interchangeable with another branded string. The full treatment is 2.5.5; named here so the student sees the syntax.
- Where unions and intersections compose:
  - **Distribution over union types in conditional contexts** — a senior trap with conditional types (`T extends U ? X : Y` distributes over union `T`). The chapter doesn't teach conditional types; one line names the gotcha so the student knows the surface exists.
  - **Intersection of disjoint primitives is `never`**. `string & number` is `never` — no value can be both. The senior reflex: if a type collapses to `never` unexpectedly, an intersection is asking for the impossible.
- The `null` and `undefined` interplay. `string | null | undefined` is a four-state contract — present-and-string, present-and-`null`, missing-`undefined`, and after the narrowing tools fire, narrowed-to-`string`. The `NonNullable<T>` utility type strips `null` and `undefined` from a union (full treatment in 2.5.7); named here as the seam.
- The discriminated-union seed. The lesson explicitly previews the pattern as the dominant use of unions in 2026 SaaS code:
  - The shape: `type State = { status: 'idle' } | { status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: Error }`.
  - The discriminant: a literal-typed field common to every branch (`status` here) that lets the consumer narrow by checking the field.
  - The payoff: with the discriminant in place, a `switch` on `state.status` narrows each branch to the matching variant — `state.data` is only accessible in the `'success'` case, and adding a fifth status without handling it is a compile error (with `assertNever`, 2.5.4).
  
  The lesson does *not* teach discriminated unions in depth — that's 2.5.2's full lesson. It teaches the shape so the student recognizes it when 2.5 makes it load-bearing.
- TypeScript on union order and assignability. Union member order doesn't affect the type (`A | B` equals `B | A`). Assignability rules: a value of type `A` assigns to `A | B`; a value of type `A | B` doesn't assign to `A` without a narrow. The senior reflex: the union is broader than each member; widen freely, narrow deliberately.

What this lesson does not cover:

- The narrowing surface (`typeof`, `instanceof`, type predicates, control-flow narrowing) — 2.4.6.
- Discriminated unions in depth — 2.5.2.
- `assertNever` and exhaustiveness — 2.5.4.
- Conditional types — 2.5 / 2.5.6 owns the limited surface the course teaches.
- Branded types — 2.5.5.
- `NonNullable<T>` and the related utility types — 2.5.7.

Pedagogical approach:

Concept archetype with a Mechanics body. Open with the senior question — "the value can be one of several shapes" vs. "the value must satisfy several constraints" — and a small `Figure` showing two Venn-style diagrams: union as the area covered by either circle, intersection as the area covered by both. The visual model is the lesson's anchor. Then a `TypeCoding` block where the student types `type Id = string | number` on a `fetchById(id: Id)` parameter and watches the editor refuse `id.toUpperCase()` until a `typeof` guard narrows the branch. The "the union is the lower bound" rule lands inline. The intersection beat lands in a follow-up `TypeCoding` where the student composes `type Invoice = InvoiceCore & WithTimestamps` from two named mixins, then accesses `invoice.createdAt` and `invoice.status` and sees both available. A small `AnnotatedCode` walks one discriminated-union shape (`type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`) with annotations on the discriminant field and a forward reference to 2.5.2. Close with a `Dropdowns` exercise on a five-line snippet that mixes unions and intersections — the student picks the operator and the right shape at each blank. Optional `SandboxCallout` with a `State` shape for free play.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.4.6 — Narrowing without `as` and `!`

Topics to cover:

- The senior question: once a value's type is a union (`string | number`, `User | null`, `Invoice | undefined`), how do you tell the compiler which branch you're in, and how do you do it without `as` or `!`. The answer is the narrowing surface — the runtime checks that the compiler reads as type-level refinements. The lesson teaches the surface in the order a senior reaches for each tool, and names the assertion escape hatches (`as`, `!`) last with the rule that they're the conditional, not the default.
- Control-flow narrowing — the substrate. The compiler tracks the type of a binding through `if`/`else`/`switch`/early-return blocks, refining the type as each guard fires. The student has been reading this implicitly since Chapter 2.1 (`if (typeof x === 'string') x.toUpperCase()`); this lesson names it.
- The narrowing tools, in order of senior reach:
  - **`typeof` guards** — `if (typeof id === 'string') ...` narrows `id` from `string | number` to `string` inside the block. Works on the six primitive-flavored typeofs the language defines: `'string'`, `'number'`, `'bigint'`, `'boolean'`, `'symbol'`, `'undefined'`, `'function'`, `'object'`. The senior watch-out: `typeof null === 'object'` is the historical bug the language preserves; narrowing for `null` reaches for `=== null` or `value == null` (one of the few legitimate `==` uses) instead.
  - **Equality narrowing** — `if (value === null) return;` narrows the residual type to `Exclude<T, null>` in the following lines. The most common form: `if (!value)` falls back through falsy coercion, which trips on `0` and `''` (the same trap as `||` in 2.2.5); the senior reflex is `=== null`, `=== undefined`, or `== null` to capture both nullish values precisely.
  - **`in` operator** — `if ('error' in result) ...` narrows a union to the branch that has the property. The senior trigger: discriminating between two object-shape branches that don't share a common discriminant field (the alternative when the union wasn't designed as a discriminated union from the start). With a clean discriminated union, the literal-field check is cleaner; with a third-party type that doesn't discriminate cleanly, `in` is the senior fallback.
  - **`instanceof` guards** — `if (error instanceof TypeError) ...` narrows by constructor identity. The senior triggers: `Error` subclasses in `catch` blocks (`if (error instanceof DatabaseError)` — full error-handling treatment in 2.8), DOM types in client code (`if (target instanceof HTMLInputElement)`), and any value where the runtime class is the discriminant. The watch-out: `instanceof` checks the prototype chain at runtime, which fails across module boundaries and bundling edges in rare cases — `error.name === 'DatabaseError'` is the structural alternative.
  - **`Array.isArray`** — the senior tool when narrowing `unknown` or a union to the array case. The language guarantees the type predicate (`x is unknown[]`), which means after the guard the compiler knows `x` is an array — the element type is still `unknown` unless further narrowed. Used heavily in JSON parsing and untyped third-party returns.
  - **Discriminant-field narrowing** — `if (state.status === 'success') state.data` narrows the union to the `'success'` branch. The shape from 2.4.5 cashing in. The senior reflex on any discriminated union.
  - **Type predicates** — `function isUser(value: unknown): value is User { ... }`. User-defined narrowing: the function returns a boolean at runtime, but the signature tells the compiler what to narrow to on `true`. The full treatment is 2.5.4; named here as the senior tool when the built-in guards don't fit and the check needs to live in one place.
  - **Assertion functions** — `function assertUser(value: unknown): asserts value is User { ... }`. Same idea, but the function throws when the check fails; after the call, the local is narrowed for the rest of the scope. Full treatment in 2.5.4; named here so the student recognizes the signature.
  - **Zod's `safeParse`** — at the validation boundary, a Zod schema's `safeParse(input)` returns a discriminated `{ success: true; data } | { success: false; error }`. The senior reach for narrowing arbitrary input to a domain type. Full treatment in 7.1; named here because the pattern is the dominant use of narrowing in production SaaS code.
- The two assertion escape hatches, named with the rule that they're the conditional:
  - **`as` — type assertions**. `value as User` tells the compiler "trust me, this is a `User`." The senior call: every `as` is a promise the writer is making that the reader of the PR will see. Three legitimate triggers:
    1. **Narrowing where TypeScript can't follow the runtime invariant** — a JSON schema you've validated upstream (Zod's output isn't `as`-cast, but the rare case where an upstream check guarantees a shape the compiler can't see).
    2. **`unknown` to `Record<string, unknown>` after `typeof === 'object' && value !== null`** — the compiler narrows to `object`, not to a useful record shape; `as Record<string, unknown>` lets the next access read.
    3. **Library-type workarounds** — when a third-party `.d.ts` types something less narrowly than the runtime promises and patching the upstream isn't viable.
    
    Every `as` outside these triggers is a smell. The course's reviewer reflex: an `as` in a PR diff is a question, not an answer — what runtime check made the promise true?
  - **`!` — non-null assertions**. `value!.name` tells the compiler "`value` is not null or undefined; trust me." Same rule as `as` — every `!` is a promise. Three legitimate triggers:
    1. **Refs after first render** — `inputRef.current!.focus()` inside an event handler that fires after the DOM is mounted (Unit 4 will name this exact pattern).
    2. **Map/array reads where a runtime invariant guarantees the key** — `users.get(currentUserId)!` immediately after a `.has(currentUserId)` check inside a small scope. (Better: `?.` and an explicit guard; `!` is the conditional.)
    3. **Test-only narrowing** — after a runtime check inside a test where the redundant `?.` would noise up the assertion.
    
    Every `!` outside those triggers is a smell. The senior alternative is almost always `?.` with a guard, or a narrowing predicate.
- The cost of `as` and `!`, named plainly. Both bypass the type checker for that one access. If the runtime invariant they encode breaks (a refactor changes the upstream, a new code path bypasses the guard, the library updates its types), the bug doesn't surface at the assertion site — it surfaces wherever the wrong value propagates to. The narrowing tools (`typeof`, `instanceof`, type predicates, Zod) are the senior default because they re-fire on every entry to the block; the assertions fire once and trust forever.
- The 2026 reflex, summarized in one sentence the student takes away. **Reach for a runtime check the compiler reads as a narrow; reach for `as` and `!` only when the runtime check exists somewhere else and you can name where.**
- TypeScript narrowing on `unknown`, restated for the chapter's `unknown`-is-the-escape-hatch rule. The set of operations on `unknown` is empty until the value is narrowed. Every narrowing tool above turns a slice of `unknown` into something usable. The student internalizes the loop: `unknown` in, narrow, use.

What this lesson does not cover:

- Type predicates and assertion functions in depth — 2.5.4 owns the full surface and the `assertNever` exhaustiveness pattern.
- Discriminated unions in depth — 2.5.2.
- Zod schemas in depth — 7.1.
- `catch` binding narrowing with `instanceof Error` vs. Zod — 2.8.2 owns the error-narrowing surface.
- The `satisfies` operator — 2.4.7.

Pedagogical approach:

Pattern archetype with a Mechanics body. The lesson teaches a discipline (narrow, don't assert) and the syntax it operates through. Open with the senior reflex stated plainly, then a `CodeReview` exercise: a function with three `!` assertions on a `User | null` parameter — the student rewrites with a guard clause, a discriminant check, and a `?.`, and watches the assertions disappear. The wrong-then-right is the lesson's seed. Then a tight Mechanics walk through the narrowing tools in the order above. For `typeof` and equality, a single `ScriptCoding` where the student narrows `string | number` to each branch and calls a branch-specific method. For `instanceof`, a small `TypeCoding` showing a `catch (error)` with `error` typed as `unknown` (the strict default), narrowed by `instanceof Error`. For `in` and discriminant-field narrowing, a `CodeVariants` showing the same `Result` union narrowed each way. The lesson's center of gravity is the assertion-escape-hatches section: an `AnnotatedCode` walks one canonical `inputRef!.focus()` and one canonical `as Record<string, unknown>` after a `typeof === 'object'` check, with the annotations naming the runtime invariant that made the assertion legal. Close with a `CodeReview` exercise on a longer function with five guard points, three of which are legitimate `as`/`!` uses and two of which are smells — the student leaves a comment on the two smells naming the senior alternative. Optional `SandboxCallout` for free play.

Estimated student time: 45 to 55 minutes.

---

## Lesson 2.4.7 — `as const` and `satisfies`

Topics to cover:

- The senior question: when you write a literal value (`{ status: 'paid', total: 100 }`, `[1, 2, 3]`, `'paid'`), the compiler defaults to widening — `status` infers as `string`, the array as `number[]`, the literal as `string`. What if you want the narrow type the literal actually has? And what if you want to validate a value against a contract without losing the narrow type? Two operators answer both: `as const` and `satisfies`. The lesson teaches them together because they earn their weight together — `as const` makes the value narrow, `satisfies` validates it against a contract, and the pair is the 2026 reach for typed-config patterns, literal-union builders, and any value where both narrowness and contract are load-bearing.
- `as const` — the value-site widening freeze:
  - **What it does**. A trailing `as const` on a literal expression makes every nested literal inferred at its narrowest type. `{ status: 'paid' } as const` infers as `{ readonly status: 'paid' }` instead of `{ status: string }`. Arrays become readonly tuples (`[1, 2, 3] as const` is `readonly [1, 2, 3]`). Nested objects and arrays freeze recursively.
  - **The three properties it produces** at the type level:
    1. Every literal is typed at its narrowest (the string `'paid'` becomes the literal type `'paid'`, not `string`).
    2. Every property and array element becomes `readonly`.
    3. Arrays become tuples (length-preserved).
  - **The senior triggers**:
    - **Literal-union derivation from a const value**. The pattern `const STATUSES = ['paid', 'open', 'void'] as const; type Status = typeof STATUSES[number];` derives `Status = 'paid' | 'open' | 'void'` from the runtime value — one source of truth for the values the schema, the type, and the runtime iterations all reference.
    - **Configuration objects** that downstream code reads keys from. `const config = { stripe: { ... }, resend: { ... } } as const;` lets `keyof typeof config` produce a literal union of the configured services.
    - **Tuple inference at function call sites**. `useReducer(reducer, { count: 0 })` infers the initial state's shape from the value; the wider the value's inferred type, the looser the reducer's type contract.
- The runtime-vs-type-level distinction, restated. `as const` is a *type-level* freeze — the compiler treats the value as `readonly`. At runtime, the object is not actually frozen (no `Object.freeze` is called); the type system promises you won't mutate it. The course relies on the type-level promise; the runtime-level freeze (`Object.freeze`) is the rare conditional.
- `satisfies` — the contract check that doesn't widen:
  - **What it does**. `value satisfies Type` checks that `value` is assignable to `Type`, without changing the inferred type of `value`. The expression's value-level type stays as the narrowly-inferred shape; the operator only asks "does this conform?"
  - **Contrast with type annotation**. `const config: Type = value` widens the local's type *to* `Type`, losing the literal-narrow inference. `const config = value satisfies Type` keeps the narrow type *and* validates against the contract. The lesson shows the contrast inline.
  - **Contrast with `as`**. `value as Type` is a one-way assertion — the compiler accepts the cast even when the value doesn't match (with some structural protection, but `as` is broadly trusted). `satisfies` validates the assignability and produces a type error on mismatch. The senior call: `satisfies` is the safe form when the goal is contract-checking; `as` is the conditional escape hatch from 2.4.6.
  - **The senior triggers**:
    - **Typed config objects**. `const config = { stripe: 'sk_test_...', resend: 're_...' } satisfies Record<ServiceName, string>;` validates the config against a contract while keeping the literal-narrow inference so downstream code can read `config.stripe` as a typed string.
    - **Per-route handlers, per-status formatters, per-event listeners** — any object literal indexed by a known finite key set, where the values have a contract but the literal type of each value should be preserved (a function's exact signature, a literal string return).
    - **`as const` + `satisfies` combined**. `const STATUSES = ['paid', 'open', 'void'] as const satisfies readonly InvoiceStatus[];` freezes the array as a tuple and validates that every element is a legal status. If the schema adds `'pending'` to `InvoiceStatus` and the `STATUSES` array doesn't update, the `satisfies` catches the drift.
- The combined idiom, named for what it produces. **`as const satisfies T`** is the senior 2026 form for any literal value that's both a runtime constant *and* must conform to a contract. The autocomplete is narrow (because `as const`), the contract is enforced (because `satisfies`), and the type drift is caught at compile time (because the `satisfies` re-checks on every build).
- Two anti-patterns the lesson names so the student spots them:
  - **`const STATUSES: InvoiceStatus[] = ['paid', 'open', 'void']`** — the annotation widens the array to `InvoiceStatus[]`. The literal type `'paid'` is lost at the value site; deriving the union via `typeof STATUSES[number]` produces `InvoiceStatus`, which is the input, not a derived narrow. Use `as const satisfies` instead.
  - **`const STATUSES = ['paid', 'open', 'void'] as InvoiceStatus[]`** — the `as` cast widens and trusts. No validation. Use `satisfies`.
- TypeScript on the inference dance. With strict mode on (1.4.3), inference is conservative. `as const` is the explicit "I want the narrow"; `satisfies` is the explicit "I want the check." The lesson names both as the senior tools for opting out of the default widening — not as advanced tricks but as the daily-reach moves on every typed-config pattern.
- One forward reference. Zod's `z.enum(['paid', 'open', 'void'] as const)` form (Unit 7.1) consumes the `as const` array to produce a schema whose output type is the narrow literal union. The single-source-of-truth pattern lands here and cashes in there.

What this lesson does not cover:

- `keyof T` and `typeof` operators on values in depth — 2.5.6.
- Branded types and the `&` brand pattern — 2.5.5.
- Mapped types and `Record<K, V>`-style derivation — 2.4.4 covered `Record`; mapped types broadly are 2.5 surface.
- The `Object.freeze` runtime side — 2.1.1 covered the runtime, this lesson is purely the type-level surface.
- Zod schemas in depth — 7.1.

Pedagogical approach:

Pattern archetype with a Mechanics body. The lesson is small and load-bearing — two operators that pay compound interest on every typed-config pattern in the course. Open with the senior question — "the literal value widens, and you didn't want it to" — and a `TypeCoding` block where the student writes `const status = 'paid';` and sees the inferred type as `string` (because `let`/`const` of a plain primitive widens unless the context narrows), then adds `as const` and sees the type narrow to `'paid'`. The cause-and-effect is the lesson's first beat. A second `TypeCoding` walks the literal-union-derivation pattern: `const STATUSES = ['paid', 'open', 'void'] as const; type Status = typeof STATUSES[number];` and the student confirms the derived type. The `typeof V[number]` pattern is the senior idiom. The `satisfies` beat lands in a `CodeVariants` block contrasting three forms of the same config object: bare literal (too loose), annotated (too wide), `satisfies` (just right). Each tab shows the inferred type on hover. Then a combined `TypeCoding` where the student writes `const STATUSES = ['paid', 'open', 'void'] as const satisfies readonly InvoiceStatus[];` and intentionally breaks the contract (changes `'void'` to `'voi'`) to see the `satisfies` catch the drift. Close with a `CodeReview` exercise on three configuration declarations — one too wide, one with `as`, one ready for `as const satisfies` — the student leaves a comment recommending the right form for each. Optional `SandboxCallout` for free play.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.4.8 — Inference, annotations, and type-only imports

Topics to cover:

- The senior question: when does a 2026 SaaS engineer write a type annotation, and when do they let the compiler infer. The chapter has been honoring one answer since the first snippet — annotate parameters and exported APIs, infer locals and return types. This lesson names the rule, surveys the corners where it bends, and closes the chapter with the import-side discipline that keeps types from accidentally pulling runtime code across the server/client boundary.
- The senior rule, stated plainly. **Annotate parameters. Annotate exported APIs. Let the compiler infer locals and return types. Use `unknown` and narrow when typing is genuinely unknown.** The rule operationalizes "types live at the boundaries the codebase cares about reading" — the function signature is a boundary; an internal `const` isn't.
- Where annotation earns its weight, with the trigger for each:
  - **Function parameters**. Every parameter has a type. Without it, the function's contract is unclear, the autocomplete inside the body is `any` (the inference falls back), and the callsite has no error when the wrong type is passed. The course writes a type on every parameter — full stop.
  - **Exported APIs**. The return type of an exported function, the type of an exported `const`, the shape of an exported component's props. Annotating the boundary pins it — refactors inside the function don't change the public contract by accident. The senior watch-out: an inferred return type on an exported function silently changes when the body changes; consumers downstream may break in subtle ways. The cost of the annotation is one line; the cost of the silent drift is a production bug.
  - **Generic constraints and complex type expressions**. When the inferred type would be complex enough to noise up the editor's hover (a deeply nested intersection, a conditional type result), annotating the binding to the named type makes the intent readable. Rare in application code; named once.
  - **Recursive functions**. The compiler can't infer a return type that depends on the function's own return type. Annotate.
  - **Variable declared first, assigned later**. `let user: User | undefined;` followed by an assignment in a `try` block — the inference can't find a narrow shape across the control flow, so the annotation lives at the declaration.
- Where inference is the senior default, with the trigger for each:
  - **Local `const` and `let` bindings**. The compiler infers from the right-hand side; the inference is usually tighter than what a hand-written annotation would say. `const status = 'paid'` infers as the literal `'paid'` (in some contexts); `const status: string = 'paid'` widens. Hand-annotating locals is over-annotation.
  - **Return types of non-exported functions**. The compiler infers; refactors inside the function update the inferred return; consumers within the module see the new shape automatically. Annotating an internal helper's return is friction.
  - **Callback and inline-function parameter types**. When the function is passed to an API that types the callback (`array.map((item) => ...)`, `useEffect(() => ..., [])`), the parameter is inferred from context. Annotating the inline callback's parameters is redundant and breaks if the upstream signature changes.
  - **Object literals inside a destructuring or spread**. The shape is inferred from the surrounding context.
- The "JSDoc-era over-annotation" anti-pattern, named for what it costs. The pattern: every `const`, every helper, every callback hand-annotated to its full type. The cost: the editor's hover noise grows, refactors break in more places than necessary, and the inferred-type wins from `as const` / `satisfies` / control-flow narrowing are abandoned. The senior reflex on inherited code: rip out the locals' annotations, keep the boundary annotations. The course's example domain reads tighter for it.
- The TypeScript-vs-JSDoc framing, in one paragraph. JSDoc as the type system (`@param`, `@returns` in comments) is dead in 2026 application code that ships TypeScript. The course doesn't write JSDoc types — TypeScript syntax is the form. JSDoc as *documentation comments* (TSDoc, Chapter 22.2) is a different surface — narrative on a function's behavior, not its types — and survives. The boundary the student takes away: types in TypeScript, prose in TSDoc.
- Type-only imports and exports — the boundary discipline the chapter closes on:
  - **The 1.4.4 setup, restated**. `verbatimModuleSyntax: true` is on in the project's `tsconfig.json`. The flag forces the student to write `import type` for any import that's only used at the type level — and rejects the plain `import` form when the imported name is only a type.
  - **The form**. `import type { Invoice } from './invoice';` — the entire import is elided at runtime, the bundler never includes the source module if no value imports remain. `import { type Invoice, formatInvoice } from './invoice';` — the `type` modifier is per-symbol; `Invoice` is type-only, `formatInvoice` is a value. `export type { Invoice };` — the re-export is type-only.
  - **The bug class it prevents**. A type-only import that's written as a plain `import` looks identical to a value import in the source. The bundler can't tell which symbols are types and which are values without analysis, and accidentally including a server-only module in a client bundle because the import statement looked like a value import is the canonical failure mode. With `verbatimModuleSyntax`, the source is unambiguous: a `import type` is elided; a plain `import` is included. Unit 5 (the server/client boundary) leans on this hard.
  - **The senior reflex**. When importing a type, write `import type`. When importing a mix, write the per-symbol `type` modifier. The editor (with the Next.js TypeScript plugin from 1.4.4) auto-imports correctly when the symbol is known to be a type; the student's hand-written imports should match.
  - **The `import()` type-only expression** — `type Invoice = import('./invoice').Invoice` — the inline alternative for one-off type references without a top-level import. Rare in application code; named once.
- The autocomplete payoff, restated. The chapter has paid compound interest on autocomplete at every step — literal unions in 2.4.1, `Readonly<T>` and modifiers in 2.4.2, `Record<LiteralUnion, V>` in 2.4.4, `as const satisfies` in 2.4.7. The boundary discipline (annotated parameters, annotated exports, type-only imports) is what keeps the autocomplete honest across the file boundary. The student's hover hint on `formatInvoice` shows the right signature because the export was annotated; the autocomplete on the import line shows `Invoice` because the type was re-exported.
- The lesson's takeaway, in one sentence the student carries forward. **Annotation at the boundaries, inference inside, types travel through `import type`.**

What this lesson does not cover:

- Module mechanics in depth — 2.6.1 owns ESM, 2.6.2 owns the module graph, 2.6.4 owns module augmentation.
- TSDoc and documentation comments — 22.2.
- ESLint rules that enforce the boundary (`@typescript-eslint/consistent-type-imports`, `@typescript-eslint/explicit-module-boundary-types`) — out of scope; Biome's lint surface (1.3.2) covers the common case.
- Function overloads — named in one line; rarely the senior's first reach in 2026 application code where discriminated-union parameters (2.5.2) cover the same surface more cleanly.

Pedagogical approach:

Pattern archetype. The lesson teaches a discipline the student has been reading since Chapter 2.1 and now names so they can defend it. Open with the rule — "annotate parameters and exported APIs; infer everything else" — and a `CodeVariants` showing the same module written two ways: over-annotated (every local typed, every return annotated, every callback's parameters re-typed) versus right-sized (parameters and exports typed, locals inferred). Each tab carries one paragraph naming what the over-annotation costs. The student sees the discipline operationally. Then a `TypeCoding` block where the student hovers an inferred `const` and an inferred return type, watches the inference, and then exports the function and adds the return-type annotation as the boundary commitment. The exported-surface beat is the lesson's center. The type-only-imports section walks as a small `ScriptCoding` where the student takes a module with a mix of type and value imports and migrates the type-only ones to `import type`, watching the `verbatimModuleSyntax` flag confirm each move (the violations show up inline). A small `AnnotatedCode` walks the per-symbol `import { type X, Y }` form with annotations on the elision behavior. Close with a `Buckets` exercise sorting six declarations ("an exported component's props," "an internal helper's return type," "a `.map` callback's parameter," "a top-level `const` storing a configuration object," "a function parameter," "a variable declared in one block and assigned in another") into "annotate" or "let the compiler infer." Then a `CodeReview` exercise on a module's imports — the student fixes three `import` statements to `import type` (with the per-symbol modifier in one case). No sandbox.

Estimated student time: 40 to 50 minutes.

---

## Lesson 2.4.9 — Quizz

Top ten topics to quiz:

1. Literal unions as the senior reach over `string` for finite-domain fields, and the autocomplete payoff at the call site.
2. The four corners — `unknown` (the safe escape hatch), `any` (the bug), `never` (no legal values), `void` (no useful return) — and the trigger for each.
3. The senior rule for `type` vs. `interface` — default to `type`, reach for `interface` only when declaration merging is the actual feature.
4. The per-field modifiers `?` and `readonly`, and the array-level `readonly T[]` parameter discipline.
5. `Record<LiteralUnion, V>` for completeness-required maps vs. `Record<string, V>` for open-keyed records, and the `noUncheckedIndexedAccess` divergence between the two.
6. Discriminated-union shape recognition — a literal discriminant field across every branch is what makes narrowing tractable.
7. The narrowing tools in senior-reach order — `typeof`, equality, `in`, `instanceof`, `Array.isArray`, discriminant-field, type predicates — and the rule that `as` and `!` are the conditional, not the default.
8. The three legitimate triggers for `as` and `!`, and the senior alternative at every other site.
9. `as const satisfies T` — the combined idiom for a literal value that's both a runtime constant and a contract-checked shape; what each half contributes.
10. The annotate-the-boundary / infer-the-locals rule, paired with the `import type` discipline that keeps type-only imports from pulling runtime modules across the bundler's boundary.

---

## Total chapter time

Roughly 290 to 370 minutes across the eight teaching lessons plus the quiz. The chapter splits naturally across four or five evenings — primitives and corners plus `type` vs. `interface` (2.4.1 + 2.4.2) as one sitting, tuples and `Record` (2.4.3 + 2.4.4) as the second short sitting, unions/intersections plus narrowing (2.4.5 + 2.4.6) as the third, `as const`/`satisfies` plus inference/imports (2.4.7 + 2.4.8) as the fourth, and the quiz as a short closer. The student finishes the chapter able to type any value they've written in Chapters 2.1 through 2.3, choose between `type` and `interface` with a reason, write a literal union that locks the legal values, narrow `unknown` to a useful shape without `as` or `!`, and keep literal types where the runtime semantics demand them. Chapter 2.5 (TypeScript moves that prevent bug classes) lands directly on this floor — discriminated unions, branded types, type predicates, utility types, and generics are all consumed through the surface this chapter now writes by reflex.

# Chapter 2.4 — TypeScript: typing the values you already know

## Chapter framing

Chapters 2.1 through 2.3 taught the value model — primitives, references, equality, money, strings, the container surface. The student now writes JavaScript fluently and recognizes the bug classes the language admits. This chapter is the first place the course treats TypeScript as a system, not as scattered annotations. It teaches the **type vocabulary** that maps cleanly onto those values: literal unions for finite domains, `type` for shapes, tuples for positional records, `Record` and index signatures for dynamic keys, unions and intersections for composition, narrowing for runtime branching, `as const` and `satisfies` for keeping literals literal, and the senior rule for where annotations earn their weight. Chapter 2.5 takes those primitives and builds **patterns that prevent whole bug classes** (discriminated unions, branded IDs, exhaustiveness, generics). This chapter is the vocabulary; 2.5 is the grammar.

Threads that must run through every lesson:

- **Decisions before syntax.** Each lesson opens with a production failure mode TypeScript prevents — an `any` that swallowed a `null`, a `string` that should have been a literal union, a `readonly` that wasn't, an `as` that lied. The syntax follows the failure.
- **Type the value, don't restate it.** Inference is the default; annotations live at the boundaries (exported APIs, function parameters, the public surface of a module). The senior reflex is to write the value clearly, let TypeScript read it, and add a type only where it adds information or constraint the value alone can't carry.
- **Narrow, don't assert.** `as` and `!` are conditional escape hatches. The chapter installs control-flow narrowing as the default and names the three legitimate triggers for an assertion.
- **`verbatimModuleSyntax` is on.** From the strict tsconfig of Chapter 1.3, `import type` is mandatory for type-only imports. The discipline lands in 2.4.8 but is named everywhere imports appear.
- **Forward links land softly.** Discriminated unions are seeded in 2.4.5 and built out in 2.5.1. Branded IDs are mentioned in 2.4.1 as a one-line trigger for `unique symbol` and recovered in 2.5.4. Utility types are named when they earn a mention but reserved for 2.5.6 as a chapter. No re-teaching.

The student finishes the chapter able to read and author the TypeScript that the rest of the course writes without commentary — function signatures, exported types, configuration objects, dynamic-keyed records, narrowed control flow — and able to defend the choice between a literal union and a string, a tuple and an object, `as const` and an annotation, `type` and `interface`.

---

## Lesson 2.4.1 — Primitives, literals, and the four corners

Teaches the seven primitive types, literal unions as the senior reach for finite domains, and the `any`/`unknown`/`never`/`void` corners with the trigger that earns each.

Topics to cover:

- The senior question. Two bugs the lesson prevents. First: a `status: string` field accepts any string the caller invents, so a typo like `'pendng'` ships and silently fails downstream checks. Second: an `any` that crept into a payload swallows a `null` and crashes three callers later. Both are vocabulary failures — the student reached for the widest type when a narrower one would have caught the bug at compile time.
- The seven primitive types, terse. `string`, `number`, `boolean`, `bigint`, `symbol`, `null`, `undefined`. Pair each with its JavaScript primitive from 2.1; the names are identical to `typeof` results except for `null` (which `typeof` calls `'object'`, a legacy bug). No deep tour; the student already wrote values in each shape.
- Literal types as the bridge to finite domains. A literal type is a primitive type narrowed to a single value: `'pending'`, `42`, `true`. A union of literals (`'pending' | 'sent' | 'paid'`) is the senior reach for any field that holds one of a finite set of values. State the rule: **if the runtime values are finite and known at design time, the type is a literal union, not the primitive**. Show the invoice status example and the typo caught at compile time.
- Where literal types come from. Three sources named with one-line triggers: a written annotation (`status: 'draft' | 'sent'`), a `const` binding on a primitive (`const status = 'draft'` infers `'draft'`), and `as const` (covered in 2.4.7). The non-source: `const config = { status: 'draft' }` infers `{ status: string }` because object property types widen — the bug 2.4.7 fixes.
- The four corners. Each is a top or bottom of the type lattice; each has exactly one production trigger.
  - **`any`** — the unsound escape. Disables type checking on the value and propagates outward. The course never writes `any`. Biome's `noExplicitAny` rule (1.3.2) catches it; if a library forces an `any`, use `unknown` and narrow.
  - **`unknown`** — the sound top. The right type for any value that arrived from outside the type system: JSON from the wire, `localStorage`, `catch` clause bindings, third-party APIs without types. The student cannot read or call an `unknown` value without narrowing first; that's the feature.
  - **`never`** — the bottom. The type with no inhabitants. Produced by impossible code paths (a function that always throws, a fully-narrowed-away union). The senior reach for `never` is the exhaustiveness check (`assertNever`), covered in 2.5.3; named here as the foreshadow.
  - **`void`** — function-return-only. Means "the caller should not rely on the return value." Distinct from `undefined` (a value the caller can read). The trigger: callback parameters where the framework explicitly throws the return away (event handlers, `Array.prototype.forEach`).
- Branded primitives, named once. A `string` that represents a user ID and a `string` that represents an org ID are the same type at the compile level — `getUser(orgId)` compiles. The fix is a brand (`unique symbol` form), built out in 2.5.4. One sentence; the student should know the trigger exists.
- Forward link. Discriminated unions (2.4.5 and 2.5.1) lean on literal-union discriminants. The reach for a literal type today is the seed for the pattern next chapter.

What this lesson does not cover:

- `enum`. The course does not use TypeScript enums — string-literal unions cover every case more cleanly, integrate with JSON, and don't emit runtime code. Named in one line so the student recognizes the form in legacy code.
- The `object` type vs. `{}` vs. `Record<string, unknown>`. Niche; surfaced in 2.4.4 where dynamic keys land.
- `unique symbol` syntax at depth (Chapter 2.5.4).
- `bigint` literal types (`123n` as a type). Rare; named in one sentence.

Pedagogical approach: Concept archetype with a small Reference moment for the four corners. Open with the `'pendng'` typo bug and the `any`-swallows-`null` bug as paired snippets. Walk the literal-union pattern in a tight prose-plus-code section. Use a `Buckets` exercise sorting eight values ("HTTP method," "invoice status," "user-entered text," "JSON from the wire," "a callback return," "an impossible branch," "a third-party value with no types," "a 64-bit external ID") into "primitive," "literal union," "`unknown`," "`never`," "`void`," "needs a brand." That sort is the senior-vocabulary install.

---

## Lesson 2.4.2 — Object shapes: `type`, `interface`, and field modifiers

Teaches when to default to `type` (always) and reach for `interface` (declaration merging), paired with the per-field `?` and `readonly` modifiers plus the array-level `readonly T[]` and `Readonly<T>` cousins.

Topics to cover:

- The senior question. The student joins a codebase and sees both `type User = { ... }` and `interface User { ... }` in different files. Which is right? The answer is one rule with one narrow exception. The second bug the lesson prevents: a field that should have been `readonly` got mutated by a downstream component, and the bug bled across two render cycles before anyone noticed.
- The senior default: `type` everywhere. `type` aliases handle objects, unions, intersections, primitives, tuples, generics, conditional types, and mapped types. `interface` handles only object shapes and classes. The course defaults to `type` because it scales to every type-system construct without the student having to remember which form supports which feature.
- The one trigger that earns `interface`: **declaration merging**. When the student needs to extend a third-party type from a package (Better Auth's `Session`, `next-intl`'s `messages`, Drizzle's relation types), `declare module` plus an `interface` declaration merges into the original. Chapter 2.6.4 owns the full pattern; named here as the only trigger.
- The non-differences. `interface` vs. `type` syntactic differences (`extends` vs. `&`, the trailing semicolon) are cosmetic and not the lesson. Performance differences across very large unions exist but don't bite at the course's scale; named in one line and dropped.
- Per-field modifiers, two only.
  - **`?` (optional)** — the field may be missing or `undefined`. Pair with the senior rule from 2.1: `?` means the property is absent; `| undefined` means the property is present with the value `undefined`. The two differ at `'key' in obj` and at `Object.keys` enumeration; the student needs to know the distinction. Under `strict` alone the distinction is conceptual — the language collapses the two at assignment sites — and `exactOptionalPropertyTypes` (the opt-in flag parked in 1.4.3 as a conditional) is what lets the compiler enforce the difference where the value flows.
  - **`readonly`** — the field cannot be reassigned after construction. Locks the binding (per 2.1.6's `const`-binds-not-freezes), not the value: `readonly user: { name: string }` still allows `obj.user.name = 'x'`. The fix is recursive immutability, named in one line and reserved for the rare reach.
- Array-level readonly cousins. `readonly T[]` (or `ReadonlyArray<T>`) forbids `.push`, `.pop`, `.splice`, and index-write on the array. `Readonly<T>` is the utility-type form for objects, named here in one line as the per-field-`readonly`-everywhere shorthand. The full utility-type surface is 2.5.6.
- Excess property checks, named once. Object literals assigned to a known type are checked for extra properties; values flowing through variables are not. The student should know the rule produces friendly errors at the literal site but lets unsafe data through a variable — the fix is to type the source, not to defeat the check with `as`.
- Index signatures and `Record` are the next lesson. One-sentence forward link to 2.4.4.

What this lesson does not cover:

- `extends` on interfaces at depth — the course uses `&` for type composition (covered in 2.4.5).
- The `class` form as a type. Named in 2.9.2 where classes earn their narrow reach.
- Deep immutability libraries (Immer, immutable.js). Not the 2026 default.
- Property descriptors and `Object.defineProperty`. Not in the SaaS path.

Pedagogical approach: Decision archetype. Open with the codebase-uses-both confusion in two sentences. State the rule (`type` always; `interface` only for declaration merging) and give the example of each. Walk the `?` and `readonly` modifiers in adjacent code blocks with the `?` vs. `| undefined` divergence shown conceptually under `strict`, naming `exactOptionalPropertyTypes` (1.4.3) as the opt-in that turns the distinction into an assignment-site error. Close with a `MultipleChoice` exercise: five field-modifier scenarios where the student picks the correct combination of `?`, `readonly`, and `| undefined`.

---

## Lesson 2.4.3 — Tuples: positions with labels

Teaches tuple syntax with element labels, optional and rest positions, `readonly` tuples, and the concrete patterns (`useState`, custom hooks, `Object.entries`) where a tuple beats a named-field object.

Topics to cover:

- The senior question. `useState` returns `[value, setter]` — a position-indexed pair the caller destructures. Why a tuple, not an object? The lesson answers: when the caller will destructure-and-rename on every use site, a tuple is the right shape; the rename happens at the destructure, so position carries no naming penalty.
- Tuple syntax. `[string, number]` is a tuple of length 2 with fixed positional types. Distinct from `(string | number)[]` (an array of either type, any length). The student should leave able to read the difference at a glance.
- Element labels. `[name: string, age: number]` adds documentation at the type level; the labels appear in editor tooltips and at destructure sites. Senior reach for any tuple longer than two elements — without labels, the call site can't tell which position is which.
- Optional and rest positions. `[string, number?]` allows a length-1 or length-2 tuple. `[string, ...number[]]` is a string followed by any number of numbers. The patterns: optional for "this callback can return either form," rest for variadic factories. Both are rare in SaaS code; named so the student recognizes them in library types.
- `readonly` tuples. `readonly [string, number]` forbids index-write and array-mutation methods. The companion `as const` on a tuple-shaped literal produces a `readonly` tuple of literal types — `[1, 2, 3] as const` is `readonly [1, 2, 3]`, not `number[]`. Forward link to 2.4.7.
- The three sites tuples earn their weight in 2026 SaaS code.
  - **`useState`-like hook returns.** The React idiom; covered in Unit 4. The signature: `const [value, setValue] = useState(...)`. Custom hooks that follow the pattern return tuples for the same reason.
  - **`Object.entries` and `Map` iteration.** `Object.entries(obj)` yields `[key, value]` pairs; `map.entries()` does the same. Knowing the result is a tuple lets the student destructure in the `for...of` head: `for (const [key, value] of Object.entries(obj))`.
  - **Result-shaped returns where naming wouldn't help.** Returning `[error, value]` from a wrapper is the Go-style idiom. The course prefers a discriminated `Result` type (Chapter 2.8.1) for new code; the tuple form is named so the student reads it correctly in libraries that use it.
- When to prefer an object. The flip rule: if the call site won't destructure-and-rename, or if the positions are easy to swap by accident, use a named-field object. Three coordinates is the rough boundary; past three positions, the object is the senior call.

What this lesson does not cover:

- Variadic tuple types and tuple-spread at the type level. The pattern exists for advanced library types; out of the senior-SaaS reach.
- Tuple manipulation utility types (e.g., `[...T, U]`). Niche; reserved for library authors.
- The `[number, number, number]` pattern for coordinates — named in one line as the obvious literal use.

Pedagogical approach: Mechanics archetype. Open with the `useState` shape and the question "why a tuple here." Walk the syntax in three short code blocks (positional, labeled, optional/rest, `readonly`). Use a `script-coding` exercise where the student types a custom `useToggle` hook's return as a labeled `readonly` tuple. Close with one `MultipleChoice` asking which of four data shapes (`[x, y, z]` coordinates, a user record, a key-value pair from a Map, a payload with five named fields) want a tuple vs. an object.

---

## Lesson 2.4.4 — Dynamic keys: index signatures and `Record<K, T>`

Teaches the two forms for dynamic-keyed objects, the completeness payoff of `Record<LiteralUnion, V>`, and how `noUncheckedIndexedAccess` narrows reads differently across the open-keyed and finite-keyed cases.

Topics to cover:

- The senior question. The student needs to type a cache keyed by user ID, a lookup table from status to label, and a JSON object with arbitrary keys parsed from the wire. Three different shapes, three different correct types — and the student who reaches for the same form for all of them ships subtle bugs.
- The two forms.
  - **Index signature** — `{ [key: string]: User }`. The right reach when the set of keys is genuinely open (a cache, an arbitrary JSON shape). All keys are `string`; all values are the same type. Companions: `[key: number]` for numeric-indexed objects (rare; arrays cover most cases), `[key: symbol]` for symbol keys (rare).
  - **`Record<K, V>`** — the utility-type form. With `K extends string` (`Record<string, User>`) it's interchangeable with the index signature, semantically. With `K extends a literal union` (`Record<'draft' | 'sent' | 'paid', string>`) it requires every key in the union to be present. That completeness check is the senior payoff.
- The senior call: use `Record<LiteralUnion, V>` when the keys are finite and known; use the index signature when the keys are genuinely open. The two forms are interchangeable for the open case; the course writes `Record<string, V>` for legibility and reserves the index-signature syntax for cases where additional named fields coexist with the dynamic surface.
- `noUncheckedIndexedAccess` interaction. From the strict tsconfig (1.3.2), every read through an index signature returns `T | undefined`. The senior reflex: narrow the result before using it. `Record<LiteralUnion, V>` reads return `V` directly (no `| undefined`) because every key is guaranteed present — that's the second payoff of the literal-union form.
- The mixed shape. `{ name: string; [key: string]: string | number }` — a known field plus an open dynamic surface. Rare; the rule is that every named field's type must be assignable to the index signature's value type. Named so the student recognizes the constraint when TypeScript flags it.
- Read vs. write asymmetry. The `in` operator is the most reliable existence check for an index-signature object; `obj[key] !== undefined` works under `noUncheckedIndexedAccess`. Forward link to 2.4.6 where narrowing lands.
- Forward links. Drizzle's typed-row return values are `Record`-shaped (Unit 6). Better Auth's session shape and `next-intl`'s messages use module augmentation over `Record`-typed surfaces (Chapter 2.6.4).

What this lesson does not cover:

- Mapped types (`{ [K in keyof T]: ... }`). Reserved for 2.5.6 where the utility types live.
- `Map<K, V>` vs. `Record<K, V>`. The runtime distinction is covered in 2.3.4; the type-level summary: `Map` for runtime keyed lookup at scale, `Record` for type-shape-of-an-object.
- `keyof` and `typeof` operators on the value. Reserved for 2.5.5.
- `PropertyKey` (`string | number | symbol`). Named in one line.

Pedagogical approach: Decision archetype. Open with the three-shapes scenario and ask the student to pick a type for each. Walk the two forms in adjacent code blocks. Show the `noUncheckedIndexedAccess` divergence in two output blocks — the index-signature read with `| undefined`, the `Record<LiteralUnion, V>` read without. Close with one `Buckets` exercise sorting six dynamic-keyed shapes ("cache by user ID," "status-to-label lookup," "JSON parsed at the wire," "HTTP method to handler," "i18n messages keyed by locale," "Drizzle row by primary key") into "index signature" and "`Record<LiteralUnion, V>`."

---

## Lesson 2.4.5 — Composing types: unions and intersections

Teaches the `|` and `&` operators across literal, mixed-primitive, shape, and nullable unions plus shape-and-narrowing intersections, with the discriminated-union shape seeded for Chapter 2.5.

Topics to cover:

- The senior question. The student needs to type a value that's either a `User` or a `Guest`, a function parameter that accepts a `string` or a `number`, and a `Pick<User, 'id' | 'email'> & { token: string }` payload. Three composition shapes, one operator each, and the senior reflex is to reach for the right one without thinking.
- Unions, `|`. The set-union of inhabitants. Literal unions (`'draft' | 'sent'`), mixed-primitive unions (`string | number`), shape unions (`User | Guest`), and nullable unions (`User | null`, `User | undefined`, `User | null | undefined`). The student must internalize that a union value is one of the alternatives, not all of them — to read a field on a `User | Guest`, the field must exist on both, or the value must be narrowed first.
- Nullable unions and the strict tsconfig. `strictNullChecks` (1.3.2) makes `null` and `undefined` first-class members of the type system. The student treats `User | null` as the union it is; the narrowing happens at the read site. The pattern `?:` for optional fields and `| undefined` for optional values lands here paired.
- Intersections, `&`. The set-intersection of constraints. With shape types, an intersection has all the fields of both: `{ id: string } & { email: string }` is `{ id: string; email: string }`. With incompatible types, the intersection is `never` (`string & number` is uninhabited). The senior reach: composing a request payload from a base type plus a discriminating extension, or extending a third-party type with project-local fields.
- The shape-union landmine. A shape union allows reading only fields common to all variants. The student who writes `function render(value: User | Guest) { return value.email }` gets an error if `Guest` doesn't have `email`. The fix is narrowing (next lesson), not a wider type. State the rule: **never widen a shape union to access a non-shared field; narrow it instead.**
- The discriminated-union shape, seeded. A union of object types where each variant carries a literal field that names it: `{ status: 'loading' } | { status: 'success'; data: User } | { status: 'error'; error: Error }`. Narrowing on the `status` field separates the cases at compile time. Chapter 2.5.1 owns the pattern; this lesson plants the shape so the next chapter has language to reference.
- Distributive behavior, named once. When a generic type parameter is a union, conditional types and some utility types distribute over the members. Reserved for 2.5.6 and 2.5.7; named here in one sentence so the student doesn't reinvent the wheel.

What this lesson does not cover:

- Discriminated-union narrowing in depth (2.4.6 and 2.5.1).
- Conditional types (`T extends U ? X : Y`). Reserved for 2.5.7 where generics earn their lesson; the rare conditional type a SaaS engineer reaches for comes through utility types.
- The `T | (T & {})` pattern for autocomplete-friendly string literal unions. Niche library trick; named in one line.

Pedagogical approach: Concept archetype with a Decision close. Open with the three-shapes scenario from the senior question. Walk unions and intersections in side-by-side code blocks with the same field set — `User | Guest` (intersection of fields readable) and `User & Guest` (union of fields readable). Use a `script-coding` exercise where the student types a `Result` shape as a discriminated union (`{ ok: true; value: T } | { ok: false; error: Error }`); the test is whether reading `.value` on a generic `Result` fails without narrowing. That failure is the seed for 2.4.6.

---

## Lesson 2.4.6 — Narrow, don't assert

Teaches control-flow narrowing through `typeof`, equality, `in`, `instanceof`, `Array.isArray`, and discriminant fields, with the three legitimate triggers that earn `as` and `!` named as conditional escape hatches.

Topics to cover:

- The senior question. The student wrote `function getEmail(value: User | Guest) { return (value as User).email }` and shipped it; six months later a `Guest` flowed through and the field was `undefined`. The assertion lied. The lesson installs the senior reflex: narrow the type with runtime checks the language tracks; reach for `as` and `!` only in three named cases.
- The narrowing surface. Each form with its trigger.
  - **`typeof`** — narrows `string | number | boolean | ...` by primitive. The basic reach for mixed-primitive unions.
  - **Equality narrowing** — `if (status === 'loading')` narrows a literal union. The reach for any discriminated union or literal-union switch.
  - **`in`** — narrows shape unions by property existence: `if ('email' in value)`. The reach for shape unions without a discriminant.
  - **`instanceof`** — narrows by constructor. The reach for error subclasses (`error instanceof ValidationError`) and class hierarchies. Pair with the cross-realm gotcha named in 2.8.2.
  - **`Array.isArray`** — narrows a union of `T | T[]` to the array branch. Named separately because `typeof` reports both as `'object'`.
  - **`switch` on a discriminant** — the canonical form for discriminated unions, set up in 2.4.5 and built out in 2.5.1.
  - **Custom type predicates** — `function isUser(v: unknown): v is User { ... }`. Named with one example; the depth lands in 2.5.3 where exhaustiveness lives.
- The narrowing scope rule. A narrow holds inside the block where the check fired and is invalidated by any assignment that could change the type. The closure trap: a narrow inside a callback can be lost if the variable is reassigned between the check and the callback execution. Senior reflex: assign the narrowed value to a `const` inside the block.
- The three legitimate triggers for `as`. The escape hatch exists for three cases.
  - **Boundary parse-then-trust.** After Zod validates an `unknown`, the parsed value is typed and the assertion is implicit in the parser. No `as` needed in the user code; named so the student understands where the type information comes from.
  - **TypeScript can't see what you can prove.** A `value as 'draft' | 'sent'` where the prior code already narrowed via a non-trackable mechanism (e.g., a Map lookup the type system can't follow). Rare; the senior should ask whether a refactor removes the need.
  - **The DOM and third-party type gaps.** `document.querySelector('button') as HTMLButtonElement`. The DOM API returns `Element | null` but the call site knows the selector matches a button. Acceptable for tightly-scoped cases; the broader fix is `instanceof HTMLButtonElement`.
- `as unknown as T` is a smell. Named once: it always means the type system is being silenced. Sometimes it's the right call (test fixtures, intentional type-system bypass at a third-party boundary); usually it's a refactor signal.
- The non-null assertion, `!`. Same posture as `as` — escape hatch with narrow triggers. The most common legitimate use: `array.find(...)!` when the caller has just proved the element exists via a prior check the type system can't track. The senior alternative: `array.find(...) ?? throwError()` for explicit failure.
- Type assertions that lie at runtime. The student should leave knowing that `value as User` is a compile-time-only operation; the runtime value is unchanged. The bug class: asserting something the data doesn't honor, then crashing three lines later. The fix is to narrow with a check, not to assert.

What this lesson does not cover:

- Assertion functions (`asserts value is T`). Reserved for 2.5.3 where exhaustiveness lives.
- The `satisfies` operator. Reserved for 2.4.7.
- `unknown` narrowing in `catch` blocks at depth. Reserved for 2.8.2.

Pedagogical approach: Pattern archetype. Open with the `as User` lie and its six-months-later crash in two sentences. Walk the narrowing surface in six tight code blocks, each with the trigger named. Use a `script-coding` exercise where the student receives a `User | Guest` value and writes the function body with narrowing, no `as`; the tests cover both branches. Close with one `Buckets` exercise sorting eight scenarios ("mixed-primitive union," "shape union with discriminant," "shape union without discriminant," "error subclass check," "DOM query result," "Zod parse result," "an array we just `.find`'d," "third-party type gap") into "narrowing form" or "`as`/`!` is acceptable here."

---

## Lesson 2.4.7 — Keeping literals narrow: `as const` and `satisfies`

Teaches the value-site freeze that keeps literal types from widening, the contract check that validates without losing the narrow, and the combined `as const satisfies T` idiom for typed-config patterns.

Topics to cover:

- The senior question. The student writes `const ROUTES = { home: '/', about: '/about' }` expecting the values to be literal types. They aren't — TypeScript infers `{ home: string; about: string }`, so a typo at the call site (`ROUTES.abot`) is caught but `ROUTES.home.startsWith('/')` is the only narrowing available. The student wants the literal values preserved so unions like `keyof typeof ROUTES` and `(typeof ROUTES)[keyof typeof ROUTES]` work. `as const` is the fix.
- `as const`, the value-site freeze. Applied to a literal, it tells TypeScript "freeze every nested literal at its narrowest type and make every property `readonly`." Three behaviors:
  - String literals stay as their literal type (`'/' instead of `string`).
  - Object properties become `readonly`.
  - Arrays become `readonly` tuples of their element literal types.
- The three sites `as const` earns its weight.
  - **Typed config objects.** A routes map, a permission table, a feature-flag map. The downstream type derivations (`keyof typeof X`, `(typeof X)[keyof typeof X]`) become useful only when the values are literal.
  - **Tuple literals.** `[1, 2, 3] as const` produces `readonly [1, 2, 3]`, not `number[]`. The trigger for any positional record built inline.
  - **Discriminant values.** `{ status: 'loading' } as const` keeps the literal type that 2.4.5's discriminated union depends on; without it, the inferred type widens to `string`.
- `satisfies`, the contract check that preserves the narrow. The bug it fixes: the student writes `const ROUTES: Record<string, string> = { home: '/', about: '/about' }` to enforce a contract, but the annotation widens the values to `string` and erases the literal types. `satisfies` validates the value against a type without applying the type as the value's annotation: `const ROUTES = { home: '/', about: '/about' } satisfies Record<string, string>` keeps the literal types and still errors if a non-string snuck in.
- The two senior triggers for `satisfies`.
  - **You want to keep the narrow type but validate against a contract.** The canonical case.
  - **You want the structural check at write time, not at read time.** A typo in a key or a missing required field surfaces where the value is defined, not where it's consumed. Annotations do this too but at the cost of widening.
- The combined idiom, `as const satisfies T`. The senior reach for typed-config patterns: lock the literal types (`as const`) and validate against a contract (`satisfies T`). The two compose in that order. Show one full worked example — a permissions table where keys are `Role` and values are arrays of `Permission` literals — and the type derivations it unlocks.
- The contrast table, terse. Three forms and what they do.
  - **Annotation** (`const X: T = ...`) — applies `T` to the value; loses the literal type if `T` is wider; catches missing fields.
  - **`as const`** — freezes the value's inferred type at the narrowest; doesn't validate against any contract.
  - **`satisfies T`** — validates against `T`; doesn't apply `T` to the value; keeps the inferred type.
- Forward links. The pattern lands again in Drizzle schema definitions (Unit 6.2), Next.js route segment configs (Unit 5.1), and feature-flag and permission tables in the org/RBAC chapter (Unit 10.2). One sentence each.

What this lesson does not cover:

- `as` for type assertions at depth (2.4.6 owns it).
- Mapped types and conditional types that operate on `as const` outputs (2.5 chapter).
- `const` type parameters on generic functions (2.5.7).

Pedagogical approach: Pattern archetype. Open with the `ROUTES` widening surprise in two snippets — one with the inferred wide type, one with `as const` and the narrow. Walk `as const` and `satisfies` in adjacent code blocks operating on the same `ROUTES` value. Show the combined `as const satisfies T` idiom as the third block. Use a `script-coding` exercise where the student types a permissions table with `as const satisfies Record<Role, readonly Permission[]>` and the tests validate the type derivations. Close with one `MultipleChoice` matching four scenarios ("config with literal keys and values," "config with a contract and literal values," "config with a contract and widened values," "an array literal that should be a tuple") to the right combination of annotation, `as const`, and `satisfies`.

---

## Lesson 2.4.8 — Annotate the boundaries, infer the inside

Teaches the senior rule for where annotations earn their weight (parameters, exported APIs) and where inference wins (locals, return types, inline callbacks), plus the `import type` discipline that `verbatimModuleSyntax` enforces.

Topics to cover:

- The senior question. The student has seen TypeScript codebases that annotate every local variable and every return type — and codebases that annotate nothing and lean on inference. Both extremes are wrong. The senior rule: **annotate where the type carries information the value alone can't (parameters, exported APIs, generic constraints); infer everywhere else.**
- Where annotations earn their weight.
  - **Function parameters.** Always. The function signature is the contract with the caller; the caller can't infer the type. Without an annotation, TypeScript infers `any` for parameters (the implicit-any error in strict mode).
  - **Exported APIs.** Functions, types, and values exported from a module get explicit type signatures so the consumer reads the contract without opening the implementation. The `isolatedDeclarations` story is named in one line as the 2026 direction; not yet a hard requirement.
  - **Return types where inference produces an unintended type.** Rare; the senior reaches for an explicit return type when the function's intent is to satisfy an interface, when the inferred type is a complex conditional the consumer shouldn't depend on, or when a recursive function's inferred return is `any`.
- Where inference wins.
  - **Local variables.** `const total = items.reduce(...)` — TypeScript reads the reducer and types `total` correctly. Annotating is noise.
  - **Inline callbacks.** `items.map(item => item.price)` — the callback's parameter is inferred from the array's element type. Annotating breaks the inference and forces a redundant type.
  - **Return types of internal functions.** When the function isn't exported and the body is small, the inferred return type is correct and stays in sync as the body changes. Senior reflex: annotate the return only when the function's signature is the lesson or the inference would be wrong.
- The trade-off, stated plainly. Annotations are documentation and a structural enforcement; inference is concision and refactoring resilience. The boundary rule (annotate at the seams, infer inside) gives both.
- The `import type` discipline. With `verbatimModuleSyntax: true` (from the strict tsconfig of 1.3.2), every type-only import must use `import type`. The compiler erases the import; the bundler never sees it; the runtime never executes it. The companion: `import { type Foo, bar }` for mixed imports where some names are types and some are values. Biome's `useImportType` rule (1.3.2) catches violations automatically; the lesson installs the mental model so the student writes it correctly the first time.
- The two failure modes `verbatimModuleSyntax` prevents.
  - **Side-effect modules that get tree-shaken.** A value import that's only used as a type can be erased by the bundler; the side-effecting initialization at module load (e.g., a Drizzle relation declaration) goes missing. `import type` is explicit about intent.
  - **Circular type imports that masquerade as value imports.** Drawing the import graph at type level is sound; at value level it can deadlock module initialization. `import type` lets the cycle resolve cleanly.
- Forward link. Module graph mechanics (Chapter 2.6) lands the full story; this lesson installs the per-import-line discipline.

What this lesson does not cover:

- `isolatedModules` and `isolatedDeclarations` at depth. The former is on by default in modern setups; the latter is named as the 2026 direction in one line. Module-graph chapter 2.6 owns the deeper treatment.
- `tsconfig.json` options beyond the ones already enabled in 1.3.2. The strict baseline is assumed.
- The `import type * as X` and `export type { X }` re-export forms. Named in one line; the canonical pattern is `import type { X }`.
- Project references and monorepo TypeScript topology. Not in scope for a single-app SaaS course.

Pedagogical approach: Decision archetype. Open with the two anti-extremes (annotate-everything, annotate-nothing) in two paired snippets. State the rule in one sentence. Walk the boundary cases — parameter annotation always, exported API annotation always, local inference always, callback inference always, return type annotation conditional — in a tight prose-plus-code section. Show `import type` and `import { type Foo, bar }` in a single code block with a comment on each line stating what gets erased. Close with one `Buckets` exercise sorting ten declaration sites ("exported function parameter," "internal helper parameter," "local sum variable," "inline `.map` callback parameter," "exported type alias," "internal function return," "exported function return," "an imported `User` used only as a type," "an imported `db` used as a value," "a mixed import with `type Foo` and `bar`") into "annotate," "infer," or "`import type` / mixed import."

---

## Lesson 2.4.9 — Quizz

Top 10 topics to quiz:

1. The seven primitive types and the senior trigger for each of the four corners (`any`, `unknown`, `never`, `void`).
2. Literal union types as the reach for finite domains, and the typo-caught-at-compile-time payoff.
3. `type` as the senior default; `interface` only for declaration merging.
4. The `?` vs. `| undefined` distinction under `exactOptionalPropertyTypes`.
5. `readonly` on fields (binding-only, not deep) and `readonly T[]` for array-level immutability.
6. Tuple syntax with element labels, and the three sites tuples beat objects.
7. Index signature vs. `Record<LiteralUnion, V>`, and how `noUncheckedIndexedAccess` narrows reads differently across them.
8. Union vs. intersection semantics, and the shape-union access rule (only common fields are readable without narrowing).
9. Narrowing forms (`typeof`, `in`, `instanceof`, `Array.isArray`, discriminant equality) and the three legitimate triggers for `as` / `!`.
10. `as const`, `satisfies`, and the combined `as const satisfies T` idiom for typed-config patterns; plus the `import type` discipline under `verbatimModuleSyntax`.

---

## Total chapter time

Roughly 195 to 235 minutes across the eight content lessons plus the quiz. The chapter splits naturally across three evenings — 2.4.1 + 2.4.2 + 2.4.3 (the primitives-shapes-tuples vocabulary) as one sitting, 2.4.4 + 2.4.5 + 2.4.6 (the dynamic keys, composition, and narrowing triad) as the second, 2.4.7 + 2.4.8 (`as const`/`satisfies` and the annotation rule) plus the quiz as the third. At the end the student has the type-vocabulary fluency Chapter 2.5's patterns assume — and the senior reflexes (literal unions for finite domains, `type` by default, narrow-don't-assert, `as const satisfies T` for typed config, annotate at the seams) that the rest of the course never re-explains.

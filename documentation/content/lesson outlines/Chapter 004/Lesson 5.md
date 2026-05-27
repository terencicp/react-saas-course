# Lesson 5 — Composing types: unions and intersections

- **Title**: Composing types — unions and intersections
- **Sidebar label**: Unions and intersections

## Lesson framing

Lessons 1–4 covered the scalar vocabulary (primitives, literal unions, `unknown`), named-field object shapes (`type` + `?` + `readonly`), positional tuples, and dynamic-keyed objects (`Record<K, V>`). The student can now name **every type for a single value or shape**. This lesson installs the **two operators that compose those shapes**: `|` (union) and `&` (intersection). After this lesson the student stops typing each variant by hand and starts composing — a function parameter that's `string | number`, a payload that's `Pick<User, 'id'> & { token: string }`, a value that's `User | null`.

The core mental shift is set-theoretic. The student already knows the inhabitants of a primitive (every string, every number) and of a literal type (one value, exactly). This lesson asks them to read a composed type as the **set of values it admits**:

- A **union** `A | B` is a value that is *either* an `A` *or* a `B`. The set of inhabitants grows.
- An **intersection** `A & B` (on shape types) is a value with the fields of *both* `A` and `B`. The set of fields grows; the set of inhabitants shrinks.

That symmetry is unintuitive at first — the student's instinct says "union widens, intersection narrows," and for **shape** types the opposite is true at the field level. This lesson holds the reader's hand through the inversion with set diagrams and side-by-side reads.

Three production realizations anchor the lesson:

1. **The shape-union landmine.** A function takes `User | Guest`. The body reads `value.email`. `User` has `email`; `Guest` doesn't. TypeScript errors — and the senior reflex is to **narrow**, not to widen the parameter or assert. This lesson plants that reflex and names the rule; lesson 6 builds out the narrowing surface. The seed and the build land back-to-back.
2. **`null` and `undefined` as first-class union members.** With `strictNullChecks` (already on from chapter 003's tsconfig), `User | null` is the type the student writes when a query may miss. The lesson treats nullability as a union, not as a separate concept — same operator, same narrowing rule.
3. **Intersection for shape composition.** Building a request payload as `BaseRequest & { token: string }`, extending a third-party type with project-local fields, or modeling a discriminated union variant as `{ status: 'success' } & { data: User }`. The senior reflex is reach-for-`&` whenever a shape needs additional fields that didn't belong on the original.

The lesson **seeds discriminated unions** as the fourth realization. A discriminated union is a union of object types where each variant carries a literal-typed field that names it (`{ status: 'loading' } | { status: 'success'; data: T } | { status: 'error'; error: Error }`). The shape lands here so lesson 6 can narrow on the discriminant and chapter 005 lesson 1 can build out the full pattern — fetch results, form states, command/event payloads. This lesson plants the shape and shows the bug it fixes (a flag-boolean payload where the type system can't tell which fields are present); it does **not** teach narrowing or `assertNever` (lesson 6 and chapter 005 lesson 3).

The lesson is a **concept archetype** (set-theoretic intuition for two operators) with a **decision close** (which operator for which composition). The bug-anchor → rule → mechanics → exercise rhythm continues. No `as`, no `satisfies`, no formal narrowing — just enough narrowing motion (the `value.email` error, the `'status' in value` aside) to make the lesson 6 hook land.

Cognitive build:

1. The three-shapes scenario in the introduction — a `string | number` parameter, a `User | null` query result, a `Base & { token: string }` payload. The senior question lands without naming `|` or `&` yet.
2. The set-theoretic mental model — show a tiny Venn-style diagram or color-coded prose distinguishing "value is one of" (union) from "type has fields of both" (intersection, on shapes).
3. Unions in depth — literal unions (back-reference lesson 1), mixed-primitive unions, shape unions, nullable unions. The set of inhabitants grows; the readable surface shrinks to the **common** fields.
4. The shape-union landmine — `function render(v: User | Guest) { return v.email }` errors. State the rule: **never widen to read a non-shared field; narrow instead** (forward link to lesson 6).
5. Intersections on shapes — `{ id: string } & { email: string }` has both fields. The set of fields grows. The senior reach: payload composition, third-party type extension, discriminated-union variants.
6. Intersection on incompatible types is `never` — `string & number` is uninhabited. One-line mention, foreshadows lesson 6's `never` for exhaustiveness.
7. Discriminated unions seeded — the shape, the bug a flag-boolean fixes, and the forward link to lesson 6 (narrowing) and chapter 005 lesson 1 (the full pattern).
8. Closing `TypeCoding` exercise — student authors a discriminated `Result<T>` shape and proves the type system catches the access-without-narrowing read.

The pedagogical reflex: **read every composed type as a set first**. `User | null` is "either a `User` or `null`." `Pick<User, 'id'> & { token: string }` is "a value that has `id` and `token`." The operator is the punctuation; the set-theoretic intuition is the language.

The student should leave able to:

- Read `A | B` and `A & B` and name the set of inhabitants vs. the set of fields each admits.
- Pick `|` for "one of several alternatives" (literal union, mixed-primitive, shape variant, nullable result) and `&` for "shape with fields of both."
- Recognize the shape-union access rule — only fields common to every variant are readable without narrowing — and reach for narrowing (lesson 6) instead of asserting.
- Read a discriminated union and name what the discriminant is for, even though narrowing is the next lesson.

## Lesson sections

### Introduction (no heading)

Open with three short scenarios in plain prose. The student needs to type:

- A function parameter that accepts a `string` *or* a `number` (a formatter that handles both).
- A query that returns a `User` *or* `null` (the row may not exist).
- A request payload that has the fields of a `BaseRequest` *plus* a `token: string` (auth-decorated payload).

Three compositions, three different shapes — but they share something. Each takes shapes the student already knows from lessons 1–4 (a primitive, a `User` type, a `null` value, a shape) and **composes** them. The lesson is the two operators that do the composition.

Use one tiny `Code` block to anchor the scenarios with their final types pre-stated (the student doesn't need to derive these yet; the block is the destination):

```ts
// One of two primitives
type FormattedAmount = string | number;

// A User row or null when the query misses
type UserOrMiss = User | null;

// A base request decorated with an auth token
type AuthedRequest = BaseRequest & { token: string };
```

One short paragraph: the operator `|` reads as **or** — a value of `A | B` is *one of* the alternatives. The operator `&` reads (on shape types) as **plus** — a value of `A & B` has *both* shapes' fields. The lesson teaches both operators, the senior call between them, and one bug class each prevents — plus a forward hook to discriminated unions, the pattern chapter 005 builds out.

Close the intro with a one-line preview of the shape-union landmine the student will hit in section 3: composing a shape union is the easy part; **reading** a field that isn't shared across every variant requires narrowing. The compile error is the lesson, and the fix is lesson 6.

Keep this section tight: one code block, two short paragraphs.

### How to read `|` and `&`: values and fields

**Goal:** install the set-theoretic intuition before any composition. The student leaves able to phrase `|` as "value is one of" and `&` (on shapes) as "type has fields of both."

Open with one paragraph stating the dual reading. `|` and `&` are **set operations on types**. A type, read set-theoretically, is the set of values it admits — `string` is the set of all strings; `'draft'` is the set with one inhabitant. The two operators combine those sets:

- `A | B` — the **union** of inhabitants. A value of `A | B` is a value of `A` *or* a value of `B`. The set grows.
- `A & B` — the **intersection** of constraints. A value of `A & B` satisfies *both* `A` and `B`. For shape types, this means the value has the fields of *both*. The set of values shrinks; the set of fields grows.

Use a small visual aid here — an HTML+CSS or hand-coded SVG **Venn-style diagram** wrapped in `<Figure>`. Two overlapping circles labeled `A` and `B`. The union shades both circles; the intersection shades only the overlap. Show the same diagram twice (or as `TabbedContent` with two tabs labeled "Union — `A | B`" and "Intersection — `A & B`") with the shading flipped. The pedagogical goal: **the student carries a picture of the two operations forward**, so the inversion that follows (intersection on shapes grows the field set even though the value set shrinks) lands without prose alone.

Component choice: a simple Venn diagram works best as **hand-coded SVG** inside `<Figure>` — two `<circle>` elements with `fill` opacity and labels. Total height well under 300px; horizontal layout (two circles side by side, slightly overlapping). Alternatively, `TabbedContent` with two `<Figure>`s holding the same diagram with different shading — this gives the student a side-by-side read.

After the diagram, one paragraph naming the inversion that trips beginners: for **primitive** types, the set picture is exactly the value set — `string | number` admits more values than `string` alone, `'red' & 'blue'` admits zero (the two literal sets don't overlap, so the intersection is empty). For **shape** types, the same set picture applies to the *values*, but day-to-day reading focuses on the **fields**. `{ id: string } & { email: string }` has *both* fields — the inhabitants are values that satisfy both shape constraints simultaneously. State this once and move on; the next sections show it in code.

One brief `Aside type="note"` naming the literal-intersection-is-`never` corner: `'red' & 'blue'` is `never` (no value can be both `'red'` and `'blue'`); `string & number` is `never`. The student will see this in error messages occasionally. One line; the full `never` story lives in lesson 6 (the exhaustiveness check uses it) and chapter 005 lesson 3.

Pedagogical note: the diagram is the **central pedagogical aid of the lesson**. The whole lesson rests on the student carrying a visual model of "or" vs. "plus" — the set-theoretic frame is what makes the shape-union landmine in section 3 land as "of course, only the overlap is readable." Don't skip the diagram.

`Term` tooltip candidates:

- **union (type-level)** — "The `|` operator. `A | B` is a value that is either an `A` or a `B`. The set of inhabitants is the set-theoretic union."
- **intersection (type-level)** — "The `&` operator. `A & B` is a value that satisfies both `A` and `B`. On shape types, the value has the fields of both."

### Unions in practice: literals, primitives, shapes, and nullables

**Goal:** the student leaves able to read every union shape they'll meet in 2026 SaaS code — and names the senior reach for each.

Open with one paragraph stating the rule: a union value is **one of** the alternatives, not all of them. The set of values grows; the set of fields you can read **without narrowing** is exactly the **intersection of fields** common to every alternative.

Walk through four union shapes the student will write daily. Use a single `Code` block per shape — tight, four short blocks total — with prose between them naming the senior reach.

1. **Literal unions** — back-reference lesson 1. `'draft' | 'sent' | 'paid'` is the canonical reach for any finite known domain. The lesson 1 typo (`'pendng'`) is caught at compile time because the value isn't a member of the union. This shape is now the most common union the student writes.

   ```ts
   type Status = 'draft' | 'sent' | 'paid';
   const next: Status = 'sent';
   ```

   One short paragraph: lesson 1's rule applies — finite known domain, literal union, not the primitive.

2. **Mixed-primitive unions** — `string | number` for a value that may arrive as either. The reach: a formatter accepting both a numeric amount and a pre-formatted string, a JSON field that's polymorphic in a known way.

   ```ts
   const format = (amount: string | number): string => {
     // amount.toFixed(2) ← error: toFixed isn't on string
     return typeof amount === 'number' ? amount.toFixed(2) : amount;
   };
   ```

   One short paragraph: the read-without-narrowing rule fires here. `.toFixed` is on `number`, not on `string` — TypeScript blocks the direct call. The `typeof` check in the example is a preview of lesson 6; mention it briefly and don't formalize.

3. **Shape unions** — `User | Guest`. The senior reach for "the function handles two related-but-not-identical inputs." The set of readable fields is exactly the overlap of `User` and `Guest`; everything else needs narrowing.

   ```ts
   type User = { id: string; email: string; name: string };
   type Guest = { id: string; name: string };

   const greet = (value: User | Guest): string => {
     return `Hi, ${value.name}`; // ok: name is on both
     // return value.email;       // error: email is on User, not Guest
   };
   ```

   Two short paragraphs: `value.name` reads cleanly because **both** variants carry `name`. `value.email` errors because `Guest` doesn't have it — and that's the **shape-union landmine** the next section makes the lesson rule. Don't fix the error yet; the fix is narrowing (lesson 6).

4. **Nullable unions** — `User | null`, `User | undefined`, `User | null | undefined`. With `strictNullChecks` on (from chapter 003's tsconfig), `null` and `undefined` are first-class union members. A function returning `User | null` says explicitly "this may miss"; the caller can't read `.email` without narrowing past the `null`.

   ```ts
   const getUser = (id: string): User | null => {
     // ...
   };

   const u = getUser('usr_01');
   // u.email                           // error: u may be null
   if (u !== null) console.log(u.email); // ok after narrowing
   ```

   One short paragraph: nullable unions are unions — same operator, same rule. The pattern `?:` on a field (lesson 2) types the field as `T | undefined`; the same narrowing applies. Don't re-teach `?`; reference lesson 2.

Use a `CodeVariants` to group the four shapes if four separate `Code` blocks would scatter the eye — four tabs labeled "Literal union," "Mixed-primitive," "Shape union," "Nullable union" — each with the small block and one paragraph of prose. This keeps the comparison visible and the page short. Pedagogical note: `CodeVariants` here trades depth-per-shape for **set-of-shapes legibility** — the student reads "these are the four kinds of unions" as one unit.

After the four shapes, one paragraph naming the readable-fields rule explicitly:

**The shape-union access rule** — on a union of shapes, you can read a field **only if it exists on every variant**. Anything else is a compile error, and the fix is to **narrow** the value before reading the field. This rule is the load-bearing claim of the lesson; the next section names it as the rule and forward-links the fix.

`Term` tooltip candidates:

- **shape union** — "A union of object types: `User | Guest`. Read-without-narrowing is restricted to fields common to every variant."
- **nullable union** — "A union including `null` and/or `undefined`. With `strictNullChecks` on (course default), `null` and `undefined` are first-class union members."

### The shape-union landmine and the narrow-don't-widen reflex

**Goal:** the student leaves with the rule that the chapter framing names — **narrow, don't assert** (or widen). Lesson 6 owns the narrowing surface; this section plants the rule and the fix-direction.

Open with the bug-anchor in two sentences. A function reads `value.email` on a `User | Guest` parameter. `Guest` doesn't have `email`. TypeScript errors. Three responses suggest themselves to a beginner; only one is correct.

Use a `CodeVariants` with three tabs to walk the three responses, the last being the correct one:

- **Tab 1: "Widen the parameter (wrong)"** — change `value: User | Guest` to `value: { email?: string; name: string }` or `value: any`. The bug compiles; the type system stops being useful; the runtime read still crashes for guest payloads. Prose: this is the impulse a beginner has — **silence the compiler by widening the type**. It's the wrong fix; the parameter no longer documents what the function accepts, and the bug ships.

  ```ts
  // ❌ Widening: the type no longer carries information
  const greet = (value: { email?: string; name: string }): string => {
    return `Hi, ${value.email ?? value.name}`;
  };
  ```

- **Tab 2: "Assert past the type (wrong)"** — `(value as User).email`. The compiler shuts up; the runtime crashes the moment a `Guest` flows through. Prose: this is the second beginner impulse — **lie to the compiler with `as`**. Type assertions don't change runtime values; they only change what the compiler believes. The bug is now invisible until production. (`as` and its three legitimate triggers are lesson 6's territory; one-line mention here.)

  ```ts
  // ❌ Assertion: the runtime crashes on Guests
  const greet = (value: User | Guest): string => {
    return `Hi, ${(value as User).email}`;
  };
  ```

- **Tab 3: "Narrow with a runtime check (right)"** — `if ('email' in value)` (or a `typeof` check on a mixed-primitive union). The compiler tracks the narrowing inside the `if` block; `value.email` is readable on that branch. Prose: this is the senior reflex — **narrow with a runtime check the language tracks**, then read the field on the narrowed branch. Lesson 6 owns the full narrowing surface (`typeof`, `in`, `instanceof`, `Array.isArray`, discriminant equality); this section plants the direction.

  ```ts
  // ✅ Narrowing: type-safe on both branches
  const greet = (value: User | Guest): string => {
    if ('email' in value) {
      return `Hi, ${value.email}`; // value is User here
    }
    return `Hi, ${value.name}`; // value is Guest here
  };
  ```

After the three tabs, state the rule in its own paragraph in bold:

**Never widen a shape union to read a non-shared field. Narrow it instead.**

One short `Aside type="tip"`: the same rule applies to nullable unions. To read `.email` on a `User | null` value, narrow past the `null` first (`if (u !== null)`). The shape-union rule and the nullable-narrow rule are the same rule applied to different unions.

Pedagogical note: this is the **chapter rule** ("narrow, don't assert" from the chapter framing) landing in its compositional context. Don't over-teach narrowing here — the example uses `'email' in value` as the obvious in-context choice; the full surface lives in lesson 6. The point of this section is **the direction**: widen-or-assert is wrong; narrow is right.

### Intersections on shapes: composing field sets

**Goal:** the student leaves able to read and author `&` on shape types as "the value has the fields of both," and names the three production sites it earns.

Open with one paragraph naming the inversion that confuses beginners. The student reads `&` as "and" — `A & B` means "satisfies `A` and `B`." That intuition is correct, but the day-to-day reading of an intersection on shapes is **field composition**: the resulting type has *both* `A`'s fields and *both* `B`'s fields, because a value that satisfies both shapes must have all of them. Show the inversion explicitly.

Use a single `Code` block showing one example, terse:

```ts
type WithId = { id: string };
type WithEmail = { email: string };

type IdAndEmail = WithId & WithEmail;
// equivalent to: { id: string; email: string }

const u: IdAndEmail = { id: 'usr_01', email: 'a@x.com' };
```

After the block, one paragraph: the intersection type **carries both fields**. A value of `IdAndEmail` has `id` and `email` simultaneously — assigning a literal missing either field is a compile error (the same posture as `Record<LiteralUnion, V>`'s completeness check from lesson 4, applied to fields).

Walk the three senior reach sites in three short paragraphs, one each. No new code blocks — the rule is recognition; the worked example is the next section's discriminated-union seed.

1. **Request payload composition.** A common shape: build a `BaseRequest` (the fields every request has — `requestId`, `timestamp`) and decorate it with route-specific fields via `&`: `type CreateInvoiceRequest = BaseRequest & { customerId: string; lines: InvoiceLine[] }`. The base type is reusable; the route-specific extension is local.

2. **Extending third-party types with project-local fields.** When a library exports a type and the project needs the same shape plus one or two project-local fields, `LibraryType & { localField: T }` is the senior reach. The narrow exception is **declaration merging** on `interface` (lesson 2) — used only when the library's own type needs to be augmented module-wide; the `&` form is the right reach for a project-local extension that doesn't affect every consumer of the library type.

3. **Discriminated-union variants (next section's seed).** Each variant of a discriminated union is often modeled as a base shape `&`-ed with a discriminating extension: `{ status: 'success' } & { data: User }`, equivalent to `{ status: 'success'; data: User }`. The two forms are interchangeable; the `&` form makes the **discriminant** visually distinct from the payload.

One brief `Aside type="note"` on the `&`-with-incompatible-types case: `string & number` is `never` (the empty set — no value is both a string and a number). The compiler will sometimes surface this in error messages when the student composes types that don't overlap. The `never` story (especially the **exhaustiveness check** that uses it) lives in lesson 6 and chapter 005 lesson 3 — one-line mention here, foreshadow only.

Pedagogical note: keep this section terse. The mechanics are tiny; the lesson is **the senior reflex of reaching for `&` whenever a shape needs decoration**. Two paragraphs of mechanics, three production sites, one aside on the `never` corner.

`Term` tooltip candidate:

- **declaration merging vs. `&`** — Not a tooltip; one-line cross-reference to lesson 2. The student should recognize that `interface` merging happens at the *type-declaration* level, and `&` composes at the *type-use* level. Two different tools for two different jobs.

### Discriminated unions, seeded for chapter 005

**Goal:** plant the discriminated-union shape. The student leaves able to **read** a discriminated union and name what the discriminant field is for. Narrowing on the discriminant is lesson 6; full pattern is chapter 005 lesson 1.

Open with the bug a discriminated union fixes. Use a `CodeVariants` with two tabs:

- **Tab 1: "Flag-boolean payload — the bug"** — show a `FetchResult<T>` typed as a record with optional fields. The bug is that the type system can't tell *which* fields are present in *which* state.

  ```ts
  // ❌ Flag-boolean: every field is optional, every read is unsafe
  type FetchResult<T> = {
    isLoading: boolean;
    data?: T;
    error?: Error;
  };

  const render = (r: FetchResult<User>): string => {
    if (r.isLoading) return 'Loading…';
    return r.data!.name; // ❌ assertion: the type system can't prove data is present
  };
  ```

  Prose: this is the shape a beginner reaches for — three states (`loading`, `success`, `error`) collapsed into one record with optional fields and a boolean flag. The type system can't tell that `data` is guaranteed present when `isLoading` is `false` and `error` is absent; every read needs an assertion. **The assertion is the bug.**

- **Tab 2: "Discriminated union — the fix"** — three variants, each carrying a literal-typed `status` field. The discriminant.

  ```ts
  // ✅ Discriminated union: each variant carries a literal discriminant
  type FetchResult<T> =
    | { status: 'loading' }
    | { status: 'success'; data: T }
    | { status: 'error'; error: Error };

  const render = (r: FetchResult<User>): string => {
    if (r.status === 'loading') return 'Loading…';
    if (r.status === 'error') return `Error: ${r.error.message}`;
    return r.data.name; // ✅ data is guaranteed present on the success variant
  };
  ```

  Prose: the type system **narrows on the literal value of the discriminant**. Inside `if (r.status === 'loading')`, the type is the loading variant — no `data`, no `error`. Inside `if (r.status === 'error')`, the type is the error variant — `error` is present and typed. On the fall-through, the type is the success variant and `r.data` is `T`, no assertion needed. The discriminant is what carries the information from runtime check to compile-time narrowing.

After the two tabs, one paragraph naming the pattern in its own bold sentence:

**A discriminated union is a union of object types where each variant carries a literal-typed field that names which variant it is. The field is the discriminant; narrowing on it separates the variants at compile time.**

Three short paragraphs naming what the lesson defers:

- **Narrowing on the discriminant** — the `if (r.status === 'loading')` motion is **equality narrowing**, one of the five narrowing forms lesson 6 owns. This lesson shows the motion in passing; lesson 6 names every form and the three legitimate triggers for `as` and `!`.
- **`assertNever` and the exhaustiveness check** — when every variant is handled, the unhandled branch is typed `never`. Adding a new variant to the union turns every `assertNever` site into a compile error pointing at the missing case. Chapter 005 lesson 3 builds the pattern; one-line mention here.
- **The full discriminated-union pattern** — fetch results, form states, command/event payloads, `Result<T, E>` types for error handling. Chapter 005 lesson 1 owns the full surface; this lesson plants the shape so the next chapter has language to reference.

One brief `Aside type="tip"`: literal-typed discriminants need their literals to **stay literal**. A discriminant value inferred as `string` (via property widening, lesson 1) won't narrow. The `as const` operator from lesson 7 is the fix for object-literal discriminants written inline; for `type` aliases of variants, the literal type in the declaration carries the narrow. Forward link, one line.

Pedagogical note: the `CodeVariants` is the right shape — the lesson is **the divergence between the two designs**, not the syntax of either. The flag-boolean vs. discriminated-union contrast is the senior install. Don't over-walk the narrowing inside tab 2; lesson 6 owns that.

`Term` tooltip candidate:

- **discriminant** — "The literal-typed field on every variant of a discriminated union that identifies which variant a value is. Narrowing on the discriminant separates the variants at compile time."

### Author a discriminated `Result<T>` shape

**Goal:** the student writes a discriminated union themselves and proves the type system catches the access-without-narrowing read.

Use a `TypeCoding` exercise. The student declares a `Result<T>` type as a discriminated union with two variants — `{ ok: true; value: T }` and `{ ok: false; error: Error }`. The exercise pins:

- One `^?` query on a value typed as `Result<User>` — the student must see the union shape in the resolved type.
- One `// @ts-expect-error` line attempting to read `.value` directly on a `Result<User>` without narrowing — the directive must trigger (proving the union access rule fires).
- One `// @ts-expect-error` line attempting to read `.error` directly on a `Result<User>` without narrowing — same.

Starter code (illustrative — the lesson writer should refine):

```ts
// Declare a discriminated union called Result<T>:
//   - ok: true variant carries `value: T`
//   - ok: false variant carries `error: Error`
type Result<T> = /* TODO */ never;

declare const r: Result<{ id: string; name: string }>;
//            ^?

// These must fail to type-check (the @ts-expect-error directives verify):

// @ts-expect-error — cannot read `.value` without narrowing
r.value;

// @ts-expect-error — cannot read `.error` without narrowing
r.error;

// This must succeed once the type is correct:
if (r.ok) {
  const x = r.value;
  //    ^?
}
```

`expectedQueries`:

- Line of the `r` declaration `^?` — must contain `'ok: true'` and `'ok: false'` (or whichever rendered form the language service emits for the union).
- Line of the narrowed `x` `^?` — must contain the inner record type (`{ id: string; name: string }`).

`expectedErrors`: none beyond the `@ts-expect-error` directives, which validate themselves when the targeted lines actually error.

`instructions`: "Declare `Result<T>` as a discriminated union with `ok` as the literal discriminant. Two variants: `ok: true` carries `value: T`; `ok: false` carries `error: Error`. The `@ts-expect-error` lines must trigger (the union access rule fires); the narrowed `if (r.ok)` branch must read `r.value` as `T`."

Pedagogical note: `TypeCoding` is the right widget — the exercise is type-only (no runtime), uses the discriminated-union pattern that's the lesson's seeded shape, and the `^?` queries surface the narrowing payoff. The `@ts-expect-error` directives prove the shape-union access rule fires (lesson 6's foreshadow). The exercise is the **bridge** to lesson 6: the student feels the access error and the narrowing payoff in their fingers.

If a `TypeCoding` configuration with three `@ts-expect-error` lines is unwieldy in practice, fall back to one `@ts-expect-error` on the direct `.value` read plus the two `^?` queries — that's enough to validate the shape and the access rule.

### Decide which operator to reach for

**Goal:** close with the senior call between `|` and `&`. One-move decision installer.

A `Buckets` exercise (two columns) sorting six composition scenarios into the two operators. Bucket choices:

- **`|` — union of alternatives** (the value is one of several shapes).
- **`&` — intersection of fields** (the shape has fields of both).

Items (six total, mix of clear and subtle):

1. A function parameter that accepts a `string` or a `number` — **`|`** (mixed-primitive union).
2. A payload that has the fields of a `BaseRequest` plus a `token: string` — **`&`** (shape composition).
3. A query result that may be a `User` or `null` — **`|`** (nullable union).
4. A discriminated `Result<T>` with `ok: true; value: T` and `ok: false; error: Error` variants — **`|`** (the variants are alternatives; each variant *internally* may be `&`-composed, but the `Result<T>` itself is a union).
5. A third-party `Session` extended with a project-local `tenantId: string` field — **`&`** (shape extension).
6. A `Status` field that's `'draft' | 'sent' | 'paid'` — **`|`** (literal union).

Wrap the `Buckets` in `instructions` explaining the rule once: "Sort each composition by **whether the value is *one of* several shapes** (`|`) **or has fields of *both*** (`&`)."

One paragraph after the exercise summarizing the senior reflex in one move: **`|` for alternatives, `&` for field composition.** The discriminated-union case (item 4) is the lesson's bridge to chapter 005 — the outer composition is a union; each variant inside the union is an intersection of a discriminant and a payload. Both operators in one shape; both senior reflexes in one type.

Pedagogical note: the `Buckets` exercise is the canonical-sort install. The subtle case (item 4 — discriminated union as `|` overall, with `&`-style variants inside) is the one that tests whether the student internalized the lesson's two reach rules rather than pattern-matching on syntax. The two-column layout keeps the contrast visible.

### External resources

Three `ExternalResource` cards in a `CardGrid` at the end:

- **TypeScript Handbook — [Union Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#union-types)** — the official treatment of `|`, terse and accurate.
- **TypeScript Handbook — [Intersection Types](https://www.typescriptlang.org/docs/handbook/2/objects.html#intersection-types)** — the official treatment of `&` on object types.
- One current 2026 piece on union vs. intersection on shape types, or on discriminated unions as a chapter 5 hook — the lesson writer should pick a live, recent (2025–2026) link from a credible source (Total TypeScript, Matt Pocock, 2ality, type-level-typescript, or similar). **Don't link an outdated piece** that pre-dates current TypeScript narrowing semantics; if no current resource fits, drop the third card. The first two cards carry the load.

Optionally consider a `VideoCallout` for one of:

- A short (≤10 min) clip on the shape-union access rule or on the set-theoretic frame for `|` and `&` — Matt Pocock and Andrew Burgess have both shipped explainers in this territory. Only include if a current (2025+) clip exists; don't link a 2020 video.

Pedagogical note: the chapter has established the pattern of three `ExternalResource` cards (with occasional video). Hold to the pattern; if the third slot doesn't have a current resource, drop it rather than reach for a stale one.

## Scope

**The student already knows (don't re-teach):**

- The seven primitives and literal types as primitives narrowed to one value (lesson 1 of chapter 004). Reference; don't re-derive. The literal-union shape recap in section 2 is one short paragraph plus a single example.
- `any` vs. `unknown` and the four corners (lesson 1 of chapter 004). The lesson doesn't reach for any of them; one-line aside on `never` as the intersection-of-incompatibles result is the only mention.
- Named-field object shapes, `type` as the default, the `?` and `readonly` modifiers (lesson 2 of chapter 004). Used in examples; not re-taught. The `?:` field shorthand is referenced in the nullable-union paragraph; not re-derived.
- Tuples (lesson 3 of chapter 004). The lesson doesn't compose tuples with `|` or `&` — out of scope.
- `Record<K, V>` and dynamic-keyed objects (lesson 4 of chapter 004). Referenced briefly when comparing the **completeness check** posture (the missing-field error on `&`-shape literals is the same posture as `Record<LiteralUnion, V>`'s missing-key error from lesson 4).
- Strict tsconfig is on — including `strictNullChecks` and `noUncheckedIndexedAccess` from chapter 003 (built out in chapter 024 lesson 5). The nullable-union examples *use* `strictNullChecks` as a load-bearing assumption; name the flag, don't re-derive.

**Reserved for later lessons (don't pre-teach):**

- **The narrowing surface in full.** Lesson 6 of chapter 004. This lesson shows `typeof`, `in`, and equality on the discriminant in passing — enough motion to validate the shape-union access rule's fix-direction. Don't enumerate the surface; don't teach `instanceof`, `Array.isArray`, or custom type predicates here.
- **`as` and `!` and the three legitimate triggers.** Lesson 6 of chapter 004. Mentioned in one line in the shape-union landmine section (tab 2 of the three-responses `CodeVariants`) as the wrong fix. Don't formalize the triggers.
- **`assertNever` and the exhaustiveness check.** Lesson 6 of chapter 004 and chapter 005 lesson 3. Mentioned in one line in the intersection-is-`never` aside and again in the discriminated-union-seeded section.
- **`as const` and `satisfies`.** Lesson 7 of chapter 004. Mentioned in one line in the discriminated-union aside as the fix for inline-literal discriminants that widen. Don't reach for either operator in any code block.
- **Annotation-vs-inference rule and `import type` discipline.** Lesson 8 of chapter 004. Used in examples (the lesson uses explicit `type` aliases and parameter annotations as the chapter has done throughout); don't formalize the rule.
- **The full discriminated-union pattern.** Chapter 005 lesson 1. This lesson plants the shape; chapter 005 builds out fetch results, form states, command/event payloads, the full `Result<T, E>` design. Don't anticipate the full pattern.
- **Branded IDs as a brand-via-intersection trick.** Chapter 005 lesson 4. The brand is technically `string & { __brand: unique symbol }`, an intersection. Don't reach for the brand syntax here; the brand lesson owns its own intersection example.
- **Utility types (`Pick`, `Omit`, `Partial`, `Required`).** Chapter 005 lesson 6. The intersection examples in this lesson use hand-written shapes; resist the temptation to write `Pick<User, 'id' | 'email'> & { token: string }` in a code block even though the pattern is canonical. The reach for `Pick` and `Omit` lands in chapter 005; this lesson uses raw shape types.
- **Generic constraints and `T extends U`.** Chapter 005 lesson 7. The discriminated `Result<T>` exercise uses `T` as an unconstrained type parameter; don't reach for `<T extends ...>` here.
- **Conditional types (`T extends U ? X : Y`).** Chapter 005 lesson 7. Not in scope.
- **The distributive behavior of conditional types and utility types over union members.** One-line mention only — chapter 005 lesson 6 and lesson 7 own it.

**One-line mentions only (named, not taught):**

- **`'red' & 'blue'` is `never`, `string & number` is `never`** — one-line aside in section 2 (the set-theoretic intuition) noting that the literal-intersection corner exists. Don't teach `never` further; that's lesson 6 and chapter 005 lesson 3.
- **`T | (T & {})` autocomplete pattern** — niche library trick for keeping a literal union's autocomplete alive while admitting any string. Don't mention; out of scope. (If a future writer is tempted, hold — the pattern is library-author territory and doesn't earn a place in a SaaS-fluency lesson.)
- **Declaration merging via `interface`** — one-line cross-reference to lesson 2 in the intersections section to distinguish module-wide augmentation from project-local `&` composition. Don't re-teach.
- **The `as const` fix for inline-literal discriminants** — one-line forward link to lesson 7 in the discriminated-union-seeded section.
- **Branded IDs as an intersection** — do not mention. Reserved for chapter 005 lesson 4. (The lesson 1 brand mention was a forward link to `unique symbol`; this lesson does not need to anticipate the intersection form.)
- **Discriminated `Result<T, E>` with a second type parameter for the error** — the exercise uses a fixed `Error` type for the error variant; the generic-error version is chapter 005's territory.

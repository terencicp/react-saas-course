# Lesson 1 — Primitives, literals, and the four corners

- **Title**: Primitives, literals, and the four corners
- **Sidebar label**: Primitives and four corners

## Lesson framing

This is the first lesson treating TypeScript as a system — not as scattered annotations. The student already wrote values in every primitive shape across Chapter 001-003 and ran TypeScript locally at the end of Chapter 003. What they don't yet have is the **type vocabulary** that maps cleanly onto those values.

The whole lesson is built around one realization: **picking the right type is a senior decision, and the wrong choice ships bugs the compiler should have caught**. Two production failure modes anchor everything:

1. `status: string` accepts any string — a typo (`'pendng'`) ships and silently fails downstream.
2. `any` infects a payload — a `null` walks through and crashes three callers later.

Both are vocabulary failures: the engineer reached for the widest type when a narrower one would have caught the bug at compile time. The lesson installs the senior reflexes that prevent both:

- **Reach for a literal union, not a primitive, when the runtime values are finite and known.**
- **Reach for `unknown`, not `any`, at every value-from-outside boundary.**

Primitives themselves are review. The student wrote `string`, `number`, `boolean` in dozens of snippets already. The new vocabulary is **literal types** (the bridge from value to type), **literal unions** (the senior reach for finite domains), and the **four corners** (`any`, `unknown`, `never`, `void` — each with exactly one trigger that earns it).

Cognitive build:

1. Two bugs (paired snippets) — what the lesson prevents.
2. Seven primitives — terse review, anchored to `typeof` from Chapter 001.
3. Literal types — a primitive narrowed to one value.
4. Literal unions — the senior reach for finite domains; the typo is now a compile error.
5. Where literal types come from — three sources, one non-source.
6. The four corners — each with its trigger.
7. Branded primitives + `enum` — named in one line each, foreshadow only.
8. Closing classification exercise.

The pedagogical reflex throughout: **show the type, show the bug it prevents, name the trigger**. Never teach syntax in isolation. The student should leave able to defend "why a literal union and not a string?" and "why `unknown` and not `any`?" with one sentence each.

## Lesson sections

### Introduction (no heading)

Open the lesson with the two paired-bug snippets. No heading — flows directly into the first section. Use `CodeVariants` with two tabs:

- **Tab 1: "The typo that shipped"** — show `function setStatus(status: string) { ... }` and a caller passing `'pendng'`. The function compiles, the typo escapes review, and a downstream `if (status === 'paid')` silently fails.
- **Tab 2: "The `any` that swallowed `null`"** — show a payload typed as `any`, a `.email.toLowerCase()` read on it, and a runtime crash three callers later when the field arrived as `null`.

After the snippets, one paragraph: both bugs share a root cause — the engineer reached for the widest type the language admits. The vocabulary in this lesson is what a senior reaches for instead. Preview the four senior reflexes the lesson installs (literal unions, `unknown` over `any`, the trigger for `never`, the trigger for `void`).

Keep this section tight: ~3 short paragraphs plus the `CodeVariants`. The lesson body answers the snippets.

### The seven primitives, anchored to typeof

**Goal:** terse review, not re-teaching. The student already wrote values in each shape.

Open with one sentence: TypeScript's primitive types share names with their JavaScript primitives (Chapter 001) — except for `null`, which `typeof` calls `'object'` for legacy reasons.

Use a `Code` block (TypeScript) with one annotated variable per primitive, each with its `typeof` comment:

```ts
const name = 'Lina';        // string,    typeof 'string'
const amount = 4900;        // number,    typeof 'number'
const isPaid = true;        // boolean,   typeof 'boolean'
const tenantId = 9007199254740993n; // bigint, typeof 'bigint'
const slot = Symbol('slot');// symbol,    typeof 'symbol'
const next = null;          // null,      typeof 'object' (legacy)
const missing = undefined;  // undefined, typeof 'undefined'
```

After the block, one paragraph: the seven names are the full primitive surface. Everything else in the type system either narrows one of them (literal types, next section), composes them (lessons 4 and 5 of chapter 004), or sits at the corners (later this lesson). No deep tour — the student knows what each primitive is for.

One brief callout (`Aside type="note"`) on `bigint`: rare in app code, earns its weight at the IEEE-754 boundary (Chapter 001's money lesson). The course writes `bigint` only at the database row-id and the high-precision-arithmetic seams; the lesson notes its existence and moves on. Skip a deep tour of `symbol` for the same reason.

### Literal types: a primitive narrowed to one value

**Goal:** install the bridge concept. Without this, literal unions don't read.

One paragraph: a literal type is a primitive type narrowed to **exactly one value**. `'pending'` is a type whose only inhabitant is the string `'pending'`. `42` is a type whose only inhabitant is the number `42`. `true` is a type whose only inhabitant is `true`. The runtime values look identical to plain primitives; the difference lives at compile time.

Code block (use `CodeTooltips` to surface the inferred types on hover):

```ts
const status: 'pending' = 'pending'; // type is 'pending', not string
const retries: 3 = 3;                // type is 3, not number
const isPaid: true = true;           // type is true, not boolean
```

After the block: a literal type is rarely useful on its own — a variable that can only ever hold `'pending'` is just a `const`. Literal types earn their weight when **composed into a union** (next section).

Use a `Term` tooltip on **inhabitants** here, defined inline: "the set of runtime values that satisfy a type." The student meets the term once and reads it the rest of the chapter.

### Literal unions: the senior reach for finite domains

**Goal:** the load-bearing concept of the lesson. The first bug from the introduction gets fixed here.

State the rule plainly in the opening paragraph: **if the runtime values are finite and known at design time, the type is a literal union, not the primitive**. The senior writes `'draft' | 'sent' | 'paid'`, not `string`. The compiler tracks the closed set; the typo (`'pendng'`) is no longer something the engineer has to catch in review.

Show the fix to the opening typo bug with a `CodeVariants` comparison:

- **Tab 1: "Before — `status: string`"** — the `setStatus('pendng')` typo passes; downstream `if (status === 'paid')` silently misses. Mark the typo line red.
- **Tab 2: "After — `status: 'draft' | 'sent' | 'paid'`"** — the same `setStatus('pendng')` call now produces a compile error pointing at the literal. Mark the type and the error line green.

After the comparison, one paragraph on the payoff: the compiler now enforces what code review used to. Every site that consumes the value gets autocomplete for the three members; every site that produces a value gets a compile error for any string outside the set. Refactoring (rename `'paid'` to `'settled'`) becomes a typed find-and-replace; the engineer who forgot to update one call site sees a red squiggle.

Include a small **`TypeCoding` exercise** here. Pedagogically the student needs to *do* the change once before it sticks.

- **Instructions:** "Replace the `string` annotation on `status` with a literal union so the call site at line N becomes a compile error."
- **Starter:** A `setStatus(status: string)` function plus a `setStatus('pendng')` call site, with a `// @ts-expect-error` directive on the line above the typo call (so the directive errors when `string` is the annotation and resolves when the union is in place).
- **Expected behavior:** student edits the annotation, the `@ts-expect-error` now suppresses an error and the criteria check passes.

This is the canonical "make all errors go away" polarity from `TypeCoding`'s guidance — the directive does the work of asserting "this line should fail," so the student's job stays "fix the errors."

### Where literal types come from

**Goal:** the student needs to know why their `const config = { status: 'draft' }` doesn't preserve the literal — they'll hit this in the next lesson on object shapes and again in lesson 7 of chapter 004 on `as const`. This section seeds both.

Three sources, named with one-line triggers, plus the non-source that bites:

Use an `AnnotatedCode` with four steps on a single block, showing each source side by side:

```ts
const status: 'draft' = 'draft';        // 1. written annotation
const direct = 'draft';                 // 2. const binding on a primitive (inferred 'draft')
const tuple = ['draft', 'sent'] as const; // 3. as const (lesson 7 of chapter 004)
const config = { status: 'draft' };     // 4. NOT a literal — inferred { status: string }
```

- **Step 1 — Written annotation:** the annotation itself names the literal type. The variable's type is exactly `'draft'`.
- **Step 2 — `const` binding:** a `const` bound to a primitive infers a literal type. (A `let` binding infers the widened primitive — `let direct = 'draft'` is `string`.) This is the lesson 6 of chapter 001 connection: `const` binds the name, and for primitives that's enough to keep the literal narrow.
- **Step 3 — `as const`:** the value-site freeze. One-line foreshadow only — lesson 7 of chapter 004 owns it.
- **Step 4 — The non-source:** object property types **widen** to their primitive at inference. `config.status` is `string`, not `'draft'`. Name the rule once; the fix is `as const` (lesson 7 of chapter 004) or a `satisfies` clause (also lesson 7 of chapter 004). The student now has language to recognize the widening surprise when they hit it.

Use a `Term` tooltip on **widening** here: "TypeScript broadens an inferred literal to its base primitive when the value lives somewhere it could be reassigned — most notably object properties and `let` bindings." The student needs the word; the mechanism gets full treatment in lesson 7 of chapter 004.

Pedagogical note: keep the `as const` mention to one sentence. Don't pre-teach lesson 7 of chapter 004. The student just needs to know the source exists and where it'll land.

### The four corners

**Goal:** each corner is a top or bottom of the type system; each has exactly one trigger that earns it. The student leaves with one sentence per corner, not a tour.

Open the section with a small **visual diagram** to ground the mental model. The four corners aren't four equivalent things — they sit at different positions in the type lattice. Use a hand-coded HTML+CSS diagram inside a `Figure` wrapper:

- **Diagram description:** A horizontal layout. On the left, two boxes stacked vertically labeled "Top of the lattice" — `any` (with a red border and an "unsound" badge) above `unknown` (with a green border and a "sound" badge). In the middle, a "Concrete types" box (greyed out, captioned "string, number, User, ..."). On the right, one box labeled "Bottom of the lattice" — `never` (with a "no inhabitants" badge). Below the lattice, a separate floating box labeled `void` with the caption "function-return marker, not on the lattice."
- **Pedagogical goal:** the visual makes the asymmetry obvious. `any` and `unknown` both sit at the top (any value flows in) but differ in soundness. `never` sits at the bottom (no value flows in). `void` is set apart because it isn't a lattice position — it's a marker for "the caller should ignore this return."
- **Caption:** "The four corners of the type system. `any` and `unknown` accept every value; `never` accepts none. `void` lives outside the lattice — it qualifies a function's return, not a value."

After the diagram, four subsections (h3), one per corner. Each opens with one sentence on what it is, one sentence on the trigger, and one short code example.

#### `any` — the unsound escape

One sentence: `any` disables type checking on the value and propagates outward — reading `.email` on an `any` payload compiles, even if the value is `null`. One sentence on the senior posture: the course never writes `any`; if a library forces it, accept the value as `unknown` and narrow.

Show the second opening bug (the `any` swallowing `null`) again, this time alongside the `unknown` fix. Use `CodeVariants`:

- **Tab 1: "Unsafe — `payload: any`"** — `.email.toLowerCase()` compiles; runtime crash when the field is `null`. Mark red.
- **Tab 2: "Safe — `payload: unknown`"** — the same `.email.toLowerCase()` line is now a compile error ("Object is of type 'unknown'"). The fix lives in the next subsection. Mark green.

One brief note: Biome's `noExplicitAny` rule catches it at lint time (referenced for lesson 5 of chapter 024); no need to remember to police it by hand.

#### `unknown` — the sound top

One sentence: `unknown` is the right type for any value that arrived from outside the type system — JSON from the wire, `localStorage` reads, `catch` clause bindings, third-party APIs without types. One sentence on the trigger: the student cannot read or call an `unknown` value without narrowing first; that's the feature, not the friction.

Show one narrowing example with a `Code` block — keep it terse since lesson 6 of chapter 004 owns the full narrowing surface:

```ts
function readEmail(payload: unknown): string | null {
  if (typeof payload === 'object' && payload !== null && 'email' in payload) {
    const email = payload.email;
    return typeof email === 'string' ? email : null;
  }
  return null;
}
```

One paragraph on the senior posture: the verbosity is the contract. Every shape assumption is now visible in the code; an unexpected wire shape can't smuggle a runtime crash through. The Zod boundary parse (Unit 9 in chapter 009) replaces this hand-rolled narrowing for production code; the student should still leave able to narrow `unknown` by hand because every Zod schema is a more structured version of the same posture.

#### `never` — the bottom

One sentence: `never` is the type with no inhabitants — no runtime value satisfies it. One sentence on the trigger: it's produced by impossible code paths (a function that always throws, a fully-narrowed-away union member) and consumed by the exhaustiveness check (`assertNever`, lesson 3 of chapter 005).

Show one minimal example:

```ts
function fail(message: string): never {
  throw new Error(message);
}

type Status = 'draft' | 'sent' | 'paid';
function statusLabel(status: Status): string {
  if (status === 'draft') return 'Draft';
  if (status === 'sent') return 'Sent';
  if (status === 'paid') return 'Paid';
  return status; // status is `never` here — every case was handled
}
```

Use `CodeTooltips` (or inline comments) to surface that the return on the last line types `status` as `never`. One-sentence foreshadow: lesson 3 of chapter 005 turns this into a compile-error exhaustiveness check. Don't pre-teach `assertNever`.

#### `void` — function-return-only

One sentence: `void` means "the caller should not rely on the return value of this function." One sentence on what it isn't: `void` is distinct from `undefined` — `undefined` is a value the caller can read; `void` is a marker that the caller should ignore whatever the function returns.

Show the trigger with a short example, the canonical case being a callback whose return the framework throws away:

```ts
function on(event: string, handler: () => void): void {
  // framework discards the handler's return value
}

on('click', () => 42); // OK — handler's return is ignored, even though it's a number
```

One paragraph on the canonical sites: event handlers, `Array.prototype.forEach`, custom hook callbacks that fire-and-forget. Returning a value from a `void`-typed callback is permitted by design — the framework will discard it. The student should not write `Promise<void>` to mean "no payload"; that's `Promise<undefined>`'s job (or simply no return at all).

### Branded primitives and the enum non-reach

**Goal:** two one-line foreshadows that close holes the student will otherwise re-invent. Keep terse.

Two short paragraphs (no subsection — a single `h3` is overkill):

- **Branded primitives.** A `string` that represents a user ID and a `string` that represents an org ID are the same type at the compile level — `getUser(orgId)` compiles, and the bug is the kind that costs a customer's data. The fix is a **brand** (the `unique symbol` form), built out in lesson 4 of chapter 005. Name the trigger so the student knows the gap exists.

- **The `enum` we don't write.** TypeScript ships an `enum` keyword. The course doesn't use it. String-literal unions cover every case more cleanly: they integrate with JSON (an enum value is not its string), they don't emit runtime code (an enum compiles to an object), and they read as values, not as names of values. The student will meet `enum` in legacy code — recognize the form, write a literal union instead. (`Biome` doesn't ban it by default; the rule lands in the strict baseline of lesson 5 of chapter 024.)

Both paragraphs stay one to two sentences each. No code; no exercise. The point is that the student finishes the lesson knowing the names of the moves they're explicitly **not** making.

### Sort the vocabulary

**Goal:** the senior-reach install. The student takes eight realistic values and classifies each into the right corner of the new vocabulary. This is the test of whether the lesson stuck.

Use the `Buckets` component (two-column layout) with the buckets and items the chapter outline prescribes:

- **Buckets** (6 total, two columns):
  - `primitive` — "Primitive type" — "The plain `string`, `number`, `boolean`, etc."
  - `literal-union` — "Literal union" — "A finite, known set of values."
  - `unknown` — "`unknown`" — "Value from outside the type system."
  - `never` — "`never`" — "An impossible branch."
  - `void` — "`void`" — "A callback return the caller ignores."
  - `brand` — "Needs a brand" — "A primitive that should not be assignable across entities."

- **Items** (8 total):
  - HTTP method on a Request → `literal-union`
  - Invoice status in the database → `literal-union`
  - User-entered text in a search box → `primitive` (string)
  - JSON parsed from a webhook payload → `unknown`
  - The return of an `addEventListener` handler → `void`
  - The default branch of a fully-narrowed `switch` → `never`
  - A `result` from a third-party SDK with no types → `unknown`
  - A 64-bit Stripe customer ID alongside a Stripe charge ID → `brand`

Add `instructions` on the `Buckets`: "Pick the senior reach for each value. The same primitive shows up in three different categories — the right call depends on where the value comes from and what it represents."

After the exercise, one closing paragraph: the move from "is this a string?" to "what does the string represent?" is the chapter's whole posture. The next lesson does the same for object shapes; the rest of the chapter does it for tuples, dynamic keys, unions, narrowing, and the literal-preserving `as const satisfies T` idiom that ties the vocabulary into typed configuration patterns the rest of the course uses without commentary.

### External resources

Three `ExternalResource` cards at the very end:

- TypeScript Handbook — [Everyday Types](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html) — the primitive surface, literal types, and `any` / `unknown`.
- TypeScript Handbook — [Narrowing](https://www.typescriptlang.org/docs/handbook/2/narrowing.html) — the chapter the student returns to when lesson 6 of chapter 004 lands.
- Total TypeScript — [The Difference Between `any`, `unknown`, and `never`](https://www.totaltypescript.com/the-difference-between-unknown-and-any) — Matt Pocock's short writeup; lines up with the four-corners framing.

## Scope

**The student already knows (don't re-teach):**

- JavaScript primitives and `typeof` (Chapter 001 lesson 1). Reference the names; don't define them.
- `const` vs. `let` binding semantics (Chapter 001 lesson 6). The literal-inferring effect of `const` is named, not re-derived.
- The strict tsconfig posture and `noUncheckedIndexedAccess` (lesson 5 of chapter 024 — pinned from Chapter 003 lesson 8). The student is running TypeScript locally under strict already.
- Why `==` is forbidden, money in cents, JS containers, regex, iteration — out of scope, not referenced.

**Reserved for later lessons (don't pre-teach):**

- **Object shapes (`type`, `interface`, `?`, `readonly`).** Lesson 2 of chapter 004. This lesson stays on primitives and unions of literals.
- **Tuples.** Lesson 3 of chapter 004. Don't show `[string, number]` examples.
- **Index signatures and `Record<K, V>`.** Lesson 4 of chapter 004. The `object` type vs `{}` vs `Record<string, unknown>` question lives there.
- **Unions and intersections in depth.** Lesson 5 of chapter 004 — full literal/mixed/shape/nullable surface. This lesson uses unions of literals only and does not introduce intersections.
- **Narrowing (`typeof`, `in`, `instanceof`, `Array.isArray`, discriminant equality).** Lesson 6 of chapter 004. This lesson shows one minimal narrowing on `unknown` (to motivate the corner) and otherwise defers.
- **`as const` and `satisfies`.** Lesson 7 of chapter 004. Named once in "where literal types come from" and once in the widening foreshadow; no full treatment.
- **Annotation-vs-inference rule and `import type` discipline.** Lesson 8 of chapter 004.
- **Discriminated unions.** Lesson 5 of chapter 004 (shape seeded) and lesson 1 of chapter 005 (full pattern). This lesson does not introduce the discriminant-field pattern; literal unions are the prerequisite.
- **`unique symbol` and branded IDs in depth.** Lesson 4 of chapter 005. One-line tease only.
- **`assertNever` and exhaustiveness checking.** Lesson 3 of chapter 005. The `never` corner foreshadows but does not implement it.
- **Zod parsing at the wire boundary.** Chapter 009 lesson 1. The `unknown` example uses hand-rolled narrowing; Zod is named once as the production replacement.

**One-line mentions only (named, not taught):**

- `bigint` literal types (`123n` as a type) — named in one sentence in the primitives section.
- `symbol` as a type — named with the other primitives; no deep treatment.
- `enum` — named once in the closing foreshadow as the form the course doesn't use.
- Biome's `noExplicitAny` rule — name-dropped in the `any` subsection as the lint that catches violations; full lint surface lives in lesson 5 of chapter 024.

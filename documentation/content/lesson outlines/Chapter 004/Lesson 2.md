# Lesson 2 — Object shapes: type, interface, and field modifiers

- **Title**: Object shapes — type, interface, and field modifiers
- **Sidebar label**: Object shapes and modifiers

## Lesson framing

Lesson 1 of chapter 004 installed the type vocabulary for **scalar** values (primitives, literal unions, the four corners). This lesson does the same for **object shapes** — the next-most-common type a SaaS engineer authors, and the place where the `type` vs. `interface` debate lives.

The lesson is a **decision archetype** with two paired decisions:

1. **Which alias keyword?** `type` is the senior default; `interface` is reserved for the single trigger of declaration merging on third-party module types. The course follows the Code conventions rule (`type` everywhere by default). The student leaves able to defend the call in one sentence.
2. **Which field modifiers?** `?` (optional) and `readonly`. Both look simple but each carries a sharp edge:
   - `?` collapses with `| undefined` under plain `strict`; the distinction only becomes enforceable under `exactOptionalPropertyTypes` (lesson 5 of chapter 024). The student needs to know **why** there are two forms before they meet the flag that separates them.
   - `readonly` locks the **binding**, not the value — the same `const`-binds-not-freezes posture from Chapter 001 lesson 6. The downstream bug class: assuming a `readonly user: { name: string }` field protects the nested `name`.

Two production failure modes anchor the lesson:

1. **The codebase uses both.** A new engineer joins, opens two files, sees `type User = { ... }` in one and `interface User { ... }` in the other, and can't tell which is canonical. The decision rule resolves it.
2. **The mutation that bled across renders.** A field that should have been `readonly` got reassigned by a downstream component; two render cycles passed before anyone caught it. `readonly` (at the field) plus `readonly T[]` (at the array level) plus `Readonly<T>` (as the per-field shorthand) are the three tools that prevent it.

Beyond the two decisions, two small mechanical concepts ride along:

- **Excess property checks.** Named once so the student isn't surprised by friendly errors at literal sites and silent passes through variables. The senior reflex is to type the source, not to defeat the check with `as`.
- **The forward link to dynamic keys.** Index signatures and `Record<K, V>` are next lesson; named in one sentence so the student doesn't try to stretch object literals to fit dynamic-keyed cases here.

Cognitive build:

1. Two paired snippets — the codebase-uses-both confusion plus the readonly-mutation bug.
2. `type` as the default. The rule, the example, the one mechanical reason (`type` scales to every type-system construct).
3. `interface` and its one trigger — declaration merging, with the Better Auth `Session` augmentation as the canonical case (named, not built).
4. The non-differences — `extends` vs. `&`, semicolon style, performance — dispatched in one paragraph so the student doesn't bring back the debate.
5. `?` (optional) — what it means, how it collapses under plain `strict`, how `exactOptionalPropertyTypes` (lesson 5 of chapter 024) restores the distinction.
6. `readonly` — what it locks (the binding), what it doesn't (the nested value).
7. `readonly T[]` and `Readonly<T>` — the array-level cousin and the per-field shorthand.
8. Excess property checks — the rule and where it bites.
9. Closing `MultipleChoice` exercise to test the modifier-combination decisions.

Pedagogical reflex throughout: **show the decision, show the rule, show the bug the wrong call would have shipped**. Never teach `interface` syntax without also showing the merging case it earns; never teach `readonly` without showing the nested-mutation it doesn't prevent.

The student should leave able to:

- Default to `type` and reach for `interface` only when augmenting a third-party module.
- Mark a field optional with `?` and know that the `| undefined` distinction is real but is only enforced by the compiler under `exactOptionalPropertyTypes`.
- Mark a field or an array `readonly` and know the binding-not-value boundary.
- Recognize the excess-property check as a feature, not a quirk.

## Lesson sections

### Introduction (no heading)

Open with the two paired failure modes that anchor the lesson. Use `CodeVariants` with two tabs:

- **Tab 1: "The codebase uses both"** — two short fenced blocks side-by-side conceptually (one tab each):
  - First fence: `type User = { id: string; email: string }` in one file.
  - Second fence: `interface User { id: string; email: string }` in another.
  - Prose: "Which is right?" Answer in one sentence: one rule with one narrow exception. The lesson installs both.
- **Tab 2: "The readonly that wasn't"** — show a `type Invoice = { id: string; lines: InvoiceLine[] }` with a function that mutates `invoice.lines.push(...)`. Prose: this kind of write bled across two render cycles before anyone noticed. The fix is `readonly` — but `readonly` only locks one of the two things people assume it locks. The lesson lands the boundary.

Three short paragraphs follow the snippets:

- Both failures are vocabulary failures, just like lesson 1 of chapter 004's typo and `any` bugs. The engineer reached for the wrong keyword or skipped a modifier the language already provides.
- Preview the four senior reflexes the lesson installs:
  - `type` by default; `interface` only for declaration merging.
  - `?` for optional fields, with the `| undefined` distinction the student should know exists.
  - `readonly` on the field locks the binding, not the value.
  - `readonly T[]` for array immutability; `Readonly<T>` for the per-field shorthand.
- One sentence on what the lesson does **not** cover: dynamic keys (next lesson), composition (lesson 5 of chapter 004), narrowing (lesson 6 of chapter 004). This lesson stays on a single object shape.

### type by default

**Goal:** the senior default. The student leaves able to defend it in one sentence.

Open with the rule, stated plainly: **`type` is the default for every alias the lesson covers — objects, unions, intersections, primitives, tuples, generics, conditional types, mapped types.** The course follows the project Code conventions one-keyword rule; the legibility win is that the team never debates the call.

One `Code` block (TypeScript) with one canonical object-shape `type`:

```ts
type User = {
  id: string;
  email: string;
  name: string;
};
```

After the block, one paragraph: this is what 95%+ of the course's type declarations look like. Single keyword, alphabetical-ish fields, semicolons by convention (or commas — the formatter handles it).

One paragraph on the mechanical reason `type` is the default: it scales. `interface` handles only object shapes and classes. `type` handles everything else the chapter teaches (unions in lesson 5 of chapter 004, conditional types reserved for chapter 005, mapped types reserved for chapter 005, generic helpers). Defaulting to `type` removes a decision the engineer would otherwise make every time they reach for a non-object shape.

Use a `Term` tooltip on **alias** here, defined inline: "A name bound to a type expression; the type itself is structural, the alias is just a label for it." The student meets the word once and reads it the rest of the chapter without re-explanation.

Pedagogical note: don't compare to `interface` syntactically yet — the comparison belongs in the next section, where `interface` earns its one trigger. This section is just the default.

### interface earns one trigger: declaration merging

**Goal:** the one exception to the `type`-everywhere rule. The student leaves able to name **when** to reach for `interface` and **only** then.

Open with the rule: **the one trigger that earns `interface` is declaration merging.** Two `interface` declarations with the same name in the same scope merge into one. Two `type` declarations with the same name in the same scope are a duplicate-identifier error.

State the canonical SaaS case in one paragraph: a third-party package ships a type (Better Auth's `Session`, `next-intl`'s `IntlMessages`, Drizzle's relation types) and the project needs to extend it with project-local fields. The mechanism is `declare module 'package-name' { interface ExistingType { newField: string } }`. The original type is augmented in place; every import of the package sees the merged shape. lesson 4 of chapter 006 owns the full pattern with worked examples — this lesson plants the trigger so the student recognizes the move.

Use a `CodeVariants` to show the contrast, two tabs:

- **Tab 1: "Two `type` declarations — duplicate identifier"** — show two `type User = { ... }` declarations of the same name. Use `del=` markers (or red `data-mark-color`) on the second line to convey the compile error. Prose: TypeScript errors with "Duplicate identifier 'User'."
- **Tab 2: "Two `interface` declarations — silently merged"** — show two `interface User { ... }` declarations of the same name with disjoint fields. Prose: the resulting `User` carries both sets of fields. **This is the feature when you mean it (augmenting Better Auth's `Session`), and the silent footgun when you don't.** Mark green where merge is intentional; mark the same example with a warning note about same-scope accidents.

After the comparison, one paragraph on the senior posture: write `type` by default; reach for `interface` only when you're inside a `declare module` block extending a third-party type. The single exception is small enough to remember, and the trigger has only one shape.

Add a brief `Aside type="note"` referencing the forward link: "Module augmentation is the full pattern (lesson 4 of chapter 006). This lesson just names the trigger so you read the move correctly when you meet it."

Pedagogical note: don't write the full `declare module` block here. The point is the **decision** (when to reach for `interface`), not the syntax of module augmentation. The block lives in lesson 4 of chapter 006.

### The non-differences (and why they don't matter here)

**Goal:** pre-empt the student looking up `extends` vs. `&` or interface-performance threads and bringing the debate back to the lesson. One terse paragraph; no code.

Three non-differences, named once and dismissed:

- **`extends` vs. `&`.** `interface B extends A` and `type B = A & { ... }` produce structurally equivalent types at this lesson's scale. The course composes with `&` (covered in lesson 5 of chapter 004 — intersections).
- **Semicolons vs. commas vs. trailing commas.** Cosmetic; the formatter handles it.
- **Performance at extreme scale.** `interface` checks marginally faster than very large unions of intersections in pathological cases. At a single-app SaaS scale, the difference doesn't bite; named in one line and dropped.

Close the paragraph: the only difference that matters for the senior call is **declaration merging**. Everything else is style.

Pedagogical note: this is a section the student will be tempted to skip; that's fine — the takeaway is "stop worrying about the rest of the differences." Keep it to ~4 sentences total.

### The ? modifier: optional fields and the | undefined distinction

**Goal:** the student leaves able to mark a field optional, and aware that there's a real distinction between `?` and `| undefined` that lands under `exactOptionalPropertyTypes`.

Open with the basic move in one paragraph: `?` after a field name marks the field as **optional** — the property may be absent from the object. Show one terse `Code` block:

```ts
type User = {
  id: string;
  email: string;
  name?: string; // optional — User without a name is valid
};

const a: User = { id: '1', email: 'a@x.com' };         // OK — no name
const b: User = { id: '2', email: 'b@x.com', name: 'B' }; // OK — name present
```

After the block, the load-bearing distinction. Use a `CodeVariants` with three tabs showing the three shapes:

- **Tab 1: "`name?: string` — optional and absent allowed"** — the property can be missing entirely. `'name' in obj` is `false` when absent. `Object.keys(obj)` doesn't include `name`.
- **Tab 2: "`name: string | undefined` — present but possibly undefined"** — the property must be present in the object literal; its value can be `undefined`. `'name' in obj` is `true`; `Object.keys(obj)` includes `name`.
- **Tab 3: "`name?: string | undefined` — the combined form"** — both absence and an explicit `undefined` value are accepted. The most permissive shape and the one TypeScript treats as equivalent to Tab 1 under plain `strict`.

For each tab, show one literal that's valid and one that isn't (or use `del`/`ins` markers in the fences).

After the variants, one paragraph on the runtime difference: at the runtime level, an **absent** property and a **present-but-`undefined`** property are different. `'name' in obj` separates them; `Object.keys(obj)` enumerates the second but not the first; `JSON.stringify` drops the `undefined` value silently. The senior should know the difference is real even when the compiler collapses it.

Then the flag that restores the distinction. One paragraph:

- Under plain `strict`, TypeScript treats `name?: string` and `name: string | undefined` as **assignable** to each other at object-literal sites — the language collapses them. That's a deliberate trade-off for ergonomics but means the engineer can write `{ name: undefined }` for a `name?: string` field and the compiler shrugs.
- With `exactOptionalPropertyTypes: true` (lesson 5 of chapter 024 — part of the strict tsconfig the project pins), the distinction is enforced: a `name?: string` field cannot be assigned the value `undefined`; it must be absent or a `string`. The compiler now models the runtime reality.

One short `Aside type="tip"`: "When the project's `tsconfig` enables `exactOptionalPropertyTypes` (lesson 5 of chapter 024), write `?` for absent-or-typed fields and `| undefined` only when the property genuinely needs to be present with the value `undefined`. Don't combine the two unless the API contract demands both."

Use a `Term` tooltip on **`exactOptionalPropertyTypes`** inline, defined as: "TypeScript compiler flag that enforces the distinction between optional (absent) and present-but-undefined properties. Project default in lesson 5 of chapter 024." Lets the student see the term without breaking flow.

Pedagogical note: don't pre-teach lesson 5 of chapter 024. The student should leave knowing the distinction exists and where the flag lives, not the full strict tsconfig.

### The readonly modifier: locks the binding, not the value

**Goal:** the student leaves understanding that `readonly` is the **field-level** analogue of `const` — it locks the property reference, not the value behind it.

Open with the rule in one paragraph: `readonly` before a field name forbids **reassignment** of the property after the object is constructed. It does not freeze the value the property points at. This mirrors the lesson 6 of chapter 001 rule for `const`: the binding is locked, not the value.

Use an `AnnotatedCode` with three steps on a single block:

```ts
type Invoice = {
  readonly id: string;
  readonly issuedAt: Date;
  readonly customer: { name: string; email: string };
};

const inv: Invoice = {
  id: 'inv_1',
  issuedAt: new Date(),
  customer: { name: 'Lina', email: 'lina@x.com' },
};

inv.id = 'inv_2';                    // ERROR — reassigning a readonly field
inv.customer = { name: 'B', email: '' }; // ERROR — reassigning the customer reference
inv.customer.name = 'Other';         // OK — mutating the value behind a readonly field
```

- **Step 1 — The declaration:** highlight the three `readonly` fields. Prose: each field is locked at the binding level. The shape says "you cannot reassign these properties."
- **Step 2 — The two failed reassignments:** highlight the `inv.id = ...` and `inv.customer = { ... }` lines (use red coloring). Prose: TypeScript blocks both. The `id` reassignment is the obvious case; the `customer` one is the same rule — reassigning the property is forbidden even when the new value structurally matches.
- **Step 3 — The mutation that slips through:** highlight `inv.customer.name = 'Other'` (use orange or violet). Prose: `readonly customer` locks the **`customer` property**, not the object the property points to. The nested `name` is mutable. This is the bug from the introduction.

After the annotated walkthrough, one paragraph on the senior posture: `readonly` at the field level is the right reach for almost all SaaS code. The full deep-immutability problem (preventing the nested `name` write) is rare in practice — the React rendering model already discourages deep mutation, and the cases where it does matter (typed config tables, frozen registries) are better served by `as const` (lesson 7 of chapter 004) and `Readonly<T>` (next subsection). Name "deep readonly" in one sentence as the rare reach the student doesn't need today.

Pedagogical note: do not introduce `Object.freeze` here. The chapter is about types, not runtime immutability primitives. The `const`-binds-not-freezes connection from Chapter 001 lesson 6 is the right mental model.

### Array-level readonly: readonly T[] and Readonly<T>

**Goal:** the array-level cousin (forbidding `.push` etc.) and the per-field-`readonly`-everywhere shorthand.

Open with the array case in one paragraph: an `Invoice` with `lines: InvoiceLine[]` lets any downstream caller `.push`, `.pop`, or `.splice` the array — the field is `readonly` but the array itself is mutable. The fix is to type the array as `readonly InvoiceLine[]` (or equivalently `ReadonlyArray<InvoiceLine>`).

Use a `CodeVariants` to make the contrast visible, two tabs:

- **Tab 1: "Mutable array — `readonly lines: InvoiceLine[]`"** — show the type with `readonly lines: InvoiceLine[]`. Below, show `invoice.lines.push(line)` — **this compiles**. Prose: `readonly` on the field locks the reference; the array methods aren't constrained.
- **Tab 2: "Immutable array — `readonly lines: readonly InvoiceLine[]`"** — same shape, but the array element type is now `readonly InvoiceLine[]`. Below, `invoice.lines.push(line)` — now a compile error: "Property 'push' does not exist on type 'readonly InvoiceLine[]'." Mark the diff with `ins=` on the type and red marks on the failing call.

After the variants, one paragraph on the cousins:

- **`readonly T[]`** — the concise form. Forbids `.push`, `.pop`, `.shift`, `.unshift`, `.splice`, `.sort`, `.reverse`, and index-write. Read methods (`.map`, `.filter`, `.find`, indexed read) work as normal.
- **`ReadonlyArray<T>`** — the same type, written as a utility. Interchangeable with `readonly T[]`; the course writes `readonly T[]` for concision.

One paragraph on `Readonly<T>` as the per-field shorthand. Show one terse `Code` block:

```ts
type Invoice = {
  id: string;
  issuedAt: Date;
  customer: { name: string; email: string };
};

type FrozenInvoice = Readonly<Invoice>;
// Equivalent to:
// type FrozenInvoice = {
//   readonly id: string;
//   readonly issuedAt: Date;
//   readonly customer: { name: string; email: string };
// };
```

Prose: `Readonly<T>` applies `readonly` to every top-level property of `T`. The trigger is "I have an existing type and want a frozen variant without duplicating the fields." It's shallow — the `customer.name` field is still mutable, same as the manual-`readonly` case. Full utility-type surface is reserved for lesson 6 of chapter 005; this lesson names `Readonly<T>` because it's the per-field shorthand for the rule the lesson just installed.

One short forward-link sentence on `as const` (lesson 7 of chapter 004): when the object is a literal config the engineer is authoring (not deriving from another type), `as const` is the right reach — it locks every property at the narrowest literal type and applies `readonly` to all of them in one keyword. Don't pre-teach the full move; one sentence is enough.

### Excess property checks

**Goal:** name the rule once so the student isn't surprised by friendly errors at literal sites and silent passes through variables. The fix is to type the source, not to defeat the check with `as`.

One paragraph: when an object literal is assigned directly to a known type, TypeScript checks for **extra** properties — properties not declared on the target type produce an error. When the same value flows through a variable first, the check is skipped (the variable's inferred type already structurally matches, and TypeScript doesn't re-check at the second assignment).

Use one tight `Code` block:

```ts
type User = { id: string; email: string };

// Direct literal — checked
const u1: User = { id: '1', email: 'a@x.com', role: 'admin' };
//                                              ^^^^ ERROR — 'role' does not exist on User

// Through a variable — not checked
const draft = { id: '1', email: 'a@x.com', role: 'admin' };
const u2: User = draft; // OK — no error, but `draft.role` is silently along for the ride
```

After the block, one paragraph on the senior reflex: the error at the literal site is a **friendly** error — it catches the typo (`emial` instead of `email`) at the most informative spot. The variable-flow loophole isn't a bug; it's the language preferring structural compatibility. The fix when the variable-flow path matters is to **type the source variable** (`const draft: User = { ... }`), not to bypass the literal-site check with `as` (which lesson 6 of chapter 004 covers as a smell).

One forward-link sentence: dynamic keys (next lesson) and `satisfies` (lesson 7 of chapter 004) both interact with this rule in interesting ways. The first letter the student needs is "the check exists; don't defeat it."

Pedagogical note: keep this section to ~6 sentences. It's a named-once rule, not a focal lesson concept.

### One sentence on dynamic keys

**Goal:** a one-line forward link so the student doesn't try to use the object-literal shapes from this lesson to model a cache keyed by user ID, or a JSON-from-the-wire shape with arbitrary keys.

One paragraph, no code: this lesson covered objects with **known field names**. Objects with **dynamic keys** — a cache keyed by user ID, a lookup table keyed by a literal-union status, a JSON shape parsed at the wire — need a different form: an index signature or `Record<K, V>`. Next lesson owns the full surface.

### Pick the right modifier combination

**Goal:** test the modifier-combination decisions in one focused exercise. The student leaves having made the call once per pattern.

Use a `MultipleChoice` component (multi-select mode, since several scenarios share answers). Frame the question:

**Question:** "For each field on a `User` type, pick the most accurate modifier combination. The project's `tsconfig` has `exactOptionalPropertyTypes: true`."

Then five small `McqChoice` rows in a single multi-select question:

- **`id` — a UUID assigned at row creation and never reassigned.** Correct: `readonly id: string`.
- **`email` — required, always present, never reassigned.** Correct: `readonly email: string`.
- **`name` — the user may not have set it yet; if they haven't, the field is absent.** Correct: `readonly name?: string`.
- **`lastSeenAt` — present on every row but the database column allows `NULL`.** Correct: `readonly lastSeenAt: Date | null`.
- **`overrides` — a list of role overrides that the app code must not mutate downstream.** Correct: `readonly overrides: readonly RoleOverride[]`.

Actually rework into individual MCQs for clarity — the multi-select on rows would make the grading fuzzy. Use **five small single-correct `MultipleChoice` cards** in sequence, each asking about one field. For each, three or four wrong-but-plausible options:

- `name: string` (missing the `?` and `readonly`).
- `name: string | undefined` (collapses absence and explicit-undefined).
- `name?: string` (right shape but allowed reassignment).
- **`readonly name?: string`** (correct — absent or a string, no reassignment).

Each card carries an `<McqWhy>` explanation that reinforces the rule applied. The pattern across the five cards is the test of whether the student internalized the `?` / `| undefined` / `readonly` / `readonly T[]` matrix.

Pedagogical note: the cards should not be a literal re-statement of the prose — they should ask the student to pick the modifier combination from a list of plausible-but-wrong-in-different-ways alternatives. Each wrong answer represents a specific misunderstanding the lesson named.

### External resources

Two or three `ExternalResource` cards at the very end:

- TypeScript Handbook — [Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html) — official treatment of object shapes, optional, and readonly.
- TypeScript Handbook — [Declaration Merging](https://www.typescriptlang.org/docs/handbook/declaration-merging.html) — the canonical reference for the one trigger that earns `interface`.
- Total TypeScript / Matt Pocock — a recent piece on `type` vs. `interface` if one fits the lesson's posture. (The lesson writer should pick the most current one available; the angle is "default to `type`, reserve `interface` for declaration merging.")

## Scope

**The student already knows (don't re-teach):**

- The seven primitives and literal unions (lesson 1 of chapter 004). Reference the names; use them in examples.
- `const` binds the name, not the value (Chapter 001 lesson 6). The `readonly` mental model leans on this; do not re-derive.
- The four corners (`any`, `unknown`, `never`, `void`) from lesson 1 of chapter 004. Reference `unknown` only if it shows up naturally in an example; don't re-teach.
- Strict tsconfig is on (`strict: true`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` — lesson 5 of chapter 024, pinned from Chapter 003). The student is running TypeScript under strict already; assume it.
- JavaScript object literals, property access, the `in` operator at the value level (Chapter 003 lessons on objects). The lesson uses them; doesn't define them.

**Reserved for later lessons (don't pre-teach):**

- **Tuples.** Lesson 3 of chapter 004. Don't show `[string, number]` examples. Mention "objects with named fields" vs. "positional records" only if necessary, and defer.
- **Index signatures and `Record<K, V>`.** Lesson 4 of chapter 004. The dynamic-keys forward link is one sentence; no examples.
- **Unions and intersections (`|`, `&`).** Lesson 5 of chapter 004. The "non-differences" section mentions `extends` vs. `&` in one line as a forward link; no full intersection treatment. Avoid using `&` in examples in this lesson.
- **Narrowing.** Lesson 6 of chapter 004. Don't show `typeof`, `in`, `instanceof` examples beyond the one `in` line in excess-property-check prose.
- **`as const` and `satisfies`.** Lesson 7 of chapter 004. Named once in `readonly` (as the literal-config reach) and once in dynamic-keys forward link. No full treatment.
- **Annotation-vs-inference rule and `import type` discipline.** Lesson 8 of chapter 004. The lesson can use both `type` declarations and import-type forms in examples, but the rule isn't taught here.
- **Discriminated unions.** Lesson 5 of chapter 004 (seeded) and chapter 005 lesson 1 (full). No discriminant-field examples in this lesson.
- **Utility types (`Pick`, `Omit`, `Partial`, `Required`, etc.).** Reserved for lesson 6 of chapter 005. The lesson names `Readonly<T>` because it's the per-field shorthand for the readonly rule; do **not** introduce `Pick<User, 'id'>` or `Partial<User>` here.
- **Mapped types (`{ [K in keyof T]: ... }`).** Reserved for lesson 6 of chapter 005.
- **The `class` form as a type.** Reserved for lesson 2 of chapter 009.
- **Module augmentation (`declare module`) at depth.** Reserved for lesson 4 of chapter 006. The lesson names the trigger; doesn't write the augmentation block.
- **Deep immutability libraries (Immer, immutable.js).** Not the 2026 default; don't mention.
- **Property descriptors and `Object.defineProperty`.** Not in the SaaS path; don't mention.
- **Branded primitives in depth.** Reserved for lesson 4 of chapter 005. Not relevant here.

**One-line mentions only (named, not taught):**

- **`exactOptionalPropertyTypes`** — named in the `?` section as the flag that enforces the absent-vs-`undefined` distinction; full strict tsconfig surface lives in lesson 5 of chapter 024.
- **`Readonly<T>`** — named as the per-field shorthand; full utility-type surface lives in lesson 6 of chapter 005.
- **`ReadonlyArray<T>`** — named as the equivalent-but-verbose form of `readonly T[]`; the course writes `readonly T[]`.
- **`as const`** — one-sentence forward link in the readonly section, identifying it as the right reach when the object is a literal config the engineer is authoring. Full treatment in lesson 7 of chapter 004.
- **`declare module` / module augmentation** — named in the `interface` section as the canonical trigger; full pattern in lesson 4 of chapter 006.
- **Deep readonly** — named once in the `readonly` section as the rare reach the student doesn't need today.

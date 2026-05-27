# Lesson 3 — Tuples: positions with labels

- **Title**: Tuples — positions with labels
- **Sidebar label**: Tuples

## Lesson framing

Lessons 1 and 2 of chapter 004 installed the type vocabulary for **scalar** values (primitives, literal unions, four corners) and **named-field object shapes** (`type` by default, `?`, `readonly`). This lesson covers the third common type shape: the **positional record** — a fixed-length sequence where each slot carries its own type and meaning, accessed by index rather than name.

The lesson is a **mechanics archetype with a tight decision close**. The mechanics piece is small: tuple syntax, element labels, optional and rest positions, `readonly`. The decision piece is sharper: **when does a positional record beat a named-field object?** The senior answer is narrow — three sites in 2026 SaaS code earn the tuple shape, and most other places want an object.

Two production realizations anchor everything:

1. **`useState` returns a tuple, not an object.** The student writes `const [count, setCount] = useState(0)` every day in Unit 3. They've been consuming a tuple without naming the shape. The lesson lifts that recognition: the tuple is right here because the caller destructures-and-renames on every use site. A named-field `{ value, setValue }` would force callers into `useState(0).value` or a rename-at-destructure they already do.
2. **The unlabeled five-tuple landmine.** A function returns `[id, name, email, role, createdAt]`. Six months later, a teammate adds a `lastSeenAt` and inserts it at position 3. Every call site silently shifts. Position is fragile past two or three elements; **labels** (a TS 4.0 feature the course writes by default) turn position into documentation the tooling surfaces, and the rule **"past three positions, reach for an object"** is the actual safety rail.

The lesson is small but earns its slot in the chapter because tuples sit on the seam between three things the student already knows (arrays, destructuring, hook returns) and three things the lesson installs (labeled-tuple syntax, `readonly` tuples, the tuple-vs-object decision). The student leaves able to **read** tuples in library types (`Object.entries`, custom hook signatures, Go-style `[error, value]` wrappers) and **author** them in the two places they earn their weight: custom-hook returns and inline positional records.

Cognitive build:

1. The `useState` recognition — a tuple the student has been using all along (Unit 3 forward link).
2. Tuple syntax — `[string, number]` vs. `(string | number)[]`. The student must read the difference at a glance.
3. Element labels — `[name: string, age: number]`. The senior reach for any tuple past length 2.
4. `readonly` tuples — `readonly [string, number]` and the `as const` connection (one-line forward link).
5. Optional and rest positions — named, not drilled. Library-recognition surface.
6. The three sites tuples earn their weight: custom hook returns, `Object.entries` / `Map` iteration, Go-style result wrappers (with the discriminated-union preference for new code).
7. The flip rule — when to reach for an object. Three coordinates is the rough boundary.
8. Closing exercise: a `TypeCoding` for the canonical custom-hook tuple return, plus a `MultipleChoice` testing the tuple-vs-object decision.

Pedagogical reflex throughout: **the syntax is small; the decision is the lesson**. Most production tuples the student writes will be custom hook returns. Every other position the student is tempted to use a tuple, the senior reflex should ask "would a named-field object be more legible?" — and three times out of four the answer is yes.

The student should leave able to:

- Read `[string, number]` and `(string | number)[]` and name the difference.
- Author a labeled `readonly` tuple as a custom hook's return type.
- Destructure `Object.entries(obj)` in a `for...of` head and know why it works.
- Defend the call between a tuple and an object in one sentence using the destructure-and-rename rule.

## Lesson sections

### Introduction (no heading)

Open with the `useState` recognition. The student wrote `const [count, setCount] = useState(0)` already — they've been consuming a tuple every day without naming the shape. Show one `Code` block:

```ts
const [count, setCount] = useState(0);
```

Then ask the implicit senior question in one short paragraph: **why does `useState` return a tuple and not an object like `{ value, setValue }`?** Hold the answer for the body — name the question, motivate the rest of the lesson.

Then one paragraph framing what a tuple **is** in the abstract: a fixed-length sequence where each position carries its own type and meaning. The student already knows arrays (chapter 003), already knows destructuring (chapter 002); a tuple is what TypeScript calls an array shape **where position matters and length is fixed**. Three things the lesson installs are previewed in one sentence each: the syntax (next section), the labels (senior reflex), the decision (when to reach for an object instead).

Close the intro with one short bug-anchor paragraph: position is fragile. A tuple past three elements gets brittle as soon as a teammate reorders, inserts, or drops a slot — every call site that destructured by position silently shifts. Labels mitigate it; the **three-position rule** prevents it. The lesson installs both.

Keep this section tight: one code block plus three short paragraphs.

### Tuple syntax: positions, types, and the array contrast

**Goal:** the student leaves able to read `[string, number]` and `(string | number)[]` at a glance and name the difference.

Open with the bare syntax in one paragraph: a tuple type is `[T1, T2, T3, ...]` — square brackets with one type per position. The annotated value is an array at runtime (`Array.isArray(tup)` is `true`); the type system pins the **length** and the **per-position type**.

Use a `CodeVariants` with two tabs to make the contrast load-bearing:

- **Tab 1: "Tuple — `[string, number]`"** — fixed length 2, position 0 is a `string`, position 1 is a `number`. Show one literal:

  ```ts
  const pair: [string, number] = ['draft', 3];
  ```

  Then show three errors via inline `// @ts-expect-error`-style comments (or red `del=` marks) on lines that violate the shape:

  ```ts
  // @ts-expect-error — wrong type at position 1
  const a: [string, number] = ['draft', 'three'];
  // @ts-expect-error — wrong length
  const b: [string, number] = ['draft', 3, true];
  // @ts-expect-error — wrong order
  const c: [string, number] = [3, 'draft'];
  ```

  Prose: length is fixed, types are pinned per position, order matters.

- **Tab 2: "Array — `(string | number)[]`"** — any length, any mix of the two element types in any order. Show one accepting literal of each shape that the tuple rejected:

  ```ts
  const a: (string | number)[] = ['draft', 'three'];
  const b: (string | number)[] = ['draft', 3, 5];
  const c: (string | number)[] = [3, 'draft'];
  ```

  Prose: this is what the student would write when length is **unknown** and the slots are interchangeable. The two shapes look similar at the bracket level; they're very different at the type level.

After the variants, one paragraph on the runtime-vs-type distinction: at runtime, both are arrays. The tuple is the type-level constraint that "this array has exactly two elements, this type at position 0, this type at position 1." TypeScript erases the constraint at build time; the runtime value is a plain `Array`.

One brief `Aside type="tip"`: a tuple **is** an array — `.map`, `.filter`, `.length`, indexed read all work. The tuple-specific features (the type pin) live at the type level, not the value level.

Pedagogical note: keep the section terse — two tabs, three short paragraphs. The point is recognition, not depth.

### Element labels: position with documentation

**Goal:** the student leaves writing labels by default on every tuple past length 2. Without labels, a five-tuple is a five-position landmine.

Open with the bug from the introduction: a function returns `[id, name, email, role, createdAt]`. Six months later, a teammate inserts `lastSeenAt` at position 3. Every destructure shifts; the bug doesn't surface until a downstream `role.includes('admin')` reads a `Date` and crashes (or worse, doesn't crash and silently lets the wrong user pass an authorization check). Position is fragile; labels are the fix.

State the rule in one paragraph: **a label is a name attached to a tuple position at the type level.** Syntax: `[name: string, age: number]`. The labels appear in editor tooltips, autocomplete on the destructure site, and the function-signature popover. They do not affect type compatibility — `[string, number]` and `[a: string, b: number]` are the same type at the assignment-check level. They are pure documentation, surfaced by the tooling, where the value lives.

Use a `CodeVariants` with two tabs to show the call-site experience:

- **Tab 1: "Unlabeled — `[string, string, string, string, Date]`"** — the destructure has to remember the order. Show a return type plus a destructure that gets it wrong:

  ```ts
  function getUserRow(id: string): [string, string, string, string, Date] {
    // ...
  }

  const [id, name, role, email, createdAt] = getUserRow('u_1');
  // Compiles. But `role` is now an email and `email` is now a role.
  ```

  Mark the swap with `del=` markers. Prose: TypeScript can't catch this — every position has the same type, so any permutation passes the check.

- **Tab 2: "Labeled — `[id: string, name: string, email: string, role: string, createdAt: Date]`"** — the editor shows labels at the destructure site. The student still has to use the right variable names, but **autocomplete suggests the labels in order**, and a teammate reading the signature sees what each position means without opening the body.

  ```ts
  function getUserRow(id: string): [
    id: string,
    name: string,
    email: string,
    role: string,
    createdAt: Date,
  ] {
    // ...
  }

  const [id, name, email, role, createdAt] = getUserRow('u_1');
  ```

  Mark the labels with `ins=` markers. Prose: labels surface in editor tooltips when the student hovers the call. They turn position into intent at the documentation layer.

After the variants, two short rules, one per paragraph:

- **All-or-nothing.** If you label one position, you must label every position. TypeScript enforces this — `[a: string, number]` is a syntax error.
- **Past length 2, label by default.** The two-element case (`[value, setter]`) is conventional enough that labels are noise. Past two, the senior reach is labels every time. Three is the threshold where the cost of recall surpasses the cost of authoring.

Use a `Term` tooltip on **labeled tuple** here, defined inline: "A tuple type where each position carries a name at the type level. Names appear in editor tooltips and at destructure-site autocomplete. They don't affect type compatibility."

Pedagogical note: the lesson can show the autocomplete benefit without a screenshot — the prose-and-code pairing is enough. If a screenshot is added later, it should show the editor tooltip on hover with the labels listed; this is not in scope for the first pass.

### Readonly tuples

**Goal:** the student leaves able to author `readonly [string, number]` and knows the `as const` connection (one-line forward link).

Open in one paragraph: prefix a tuple type with `readonly` to forbid index-write and array-mutation methods. Same posture as `readonly T[]` from lesson 2 of chapter 004 — the binding is locked, the type-level shape is immutable, and the runtime methods that would change the array (`.push`, `.pop`, `.splice`, `.sort`, `.reverse`, index-write) are no longer in the type.

Use one terse `Code` block (with `CodeTooltips` to surface the inferred type of the mutation lines):

```ts
type Pair = readonly [string, number];

const p: Pair = ['draft', 3];

// @ts-expect-error — index-write on a readonly tuple
p[0] = 'sent';
// @ts-expect-error — .push doesn't exist on a readonly tuple
p.push('extra');
```

After the block, one paragraph on the `as const` connection (one-line forward link, no full treatment — lesson 7 of chapter 004 owns it): an inline tuple literal with `as const` produces a `readonly` tuple of **literal** types:

```ts
const statuses = ['draft', 'sent', 'paid'] as const;
//    ^? readonly ['draft', 'sent', 'paid']
```

Without `as const`, the inferred type is `string[]` — TypeScript widens to an array because array literals don't preserve narrow types or tuple shape at the inference level (the same widening rule from lesson 1 of chapter 004). `as const` is the value-site freeze that keeps the tuple shape **and** the literal element types. The pattern is the seed for the typed-config idiom lesson 7 of chapter 004 builds.

One short `Aside type="note"`: don't reach for `as const` here. The lesson is **types**, not value-site freezes. Show it once for recognition; the full move lands in lesson 7 of chapter 004.

Pedagogical note: keep the `as const` mention to one code block and one paragraph. The student needs to recognize the form when they hit it later; full pedagogy is reserved.

### Optional and rest positions

**Goal:** library-recognition surface. The student doesn't author these often; they meet them in library types and need to read them correctly.

One paragraph framing the section: tuples can have **optional** positions (`?` after the label) and **rest** positions (`...T[]`). Both are rare in SaaS application code; both are common in library types — the React typings, `Array.prototype` overloads, custom-hook factories. Name them, show one example each, move on.

Use a `Code` block with two short shapes, side-by-side conceptually:

```ts
// Optional position — length 1 or 2
type RangeOrPoint = [start: number, end?: number];
const a: RangeOrPoint = [3];
const b: RangeOrPoint = [3, 7];

// Rest position — at least one string, then any number of numbers
type Message = [header: string, ...payload: number[]];
const m1: Message = ['ping'];
const m2: Message = ['ping', 1, 2, 3];
```

After the block, two terse rules, one per paragraph:

- **Optional position syntax.** The `?` attaches to the position (the label-side, before the type). `[start: number, end?: number]` is the canonical form. Optional positions follow required ones — a required slot cannot come after an optional slot, same posture as `?` on object fields in lesson 2 of chapter 004.
- **Rest is positional, with one constraint.** A tuple may have at most one rest position; since TypeScript 4.2 a rest position can appear anywhere it doesn't conflict with that constraint (`[string, ...number[], boolean]` is legal). The fixed-then-rest form (`[header: string, ...payload: number[]]`) is the canonical shape because it reads cleanly at the destructure site (`const [header, ...payload] = m`). Other forms surface in library types; recognize them, don't reach for them in application code.

One brief `Aside type="note"`: optional and rest positions can compose (`[a: string, b?: number, ...rest: boolean[]]`) but the result becomes hard to read past two non-fixed elements. The senior reflex when the shape gets that complex is to **switch to an object** — the decision-rule section at the end of the lesson lands the call.

Pedagogical note: this section is recognition-only. No exercise. Two terse paragraphs plus one code block.

### The three sites tuples earn their weight

**Goal:** the decision-rule install. The student leaves with three named patterns where the tuple beats an object, and the explicit acknowledgment that everything else wants an object.

Frame the section in one paragraph: a tuple earns its weight when **the caller will destructure-and-rename on every use**. The rename happens at the destructure, so the positional shape carries no naming penalty — the caller writes the names they want, the function ships the positions. Three sites in 2026 SaaS code fit this pattern; everything else wants an object.

Three subsections (h4), one per site. Each opens with the senior question, gives one code example, and closes with one sentence on the trigger.

#### Custom hook returns

State the rule: **a hook that returns ordered state plus an action returns a tuple.** The `useState` precedent (`const [count, setCount] = useState(0)`) is the project Code conventions' explicit rule for custom hooks: ordered → tuple; named → object.

Show one canonical example — a `useToggle` hook:

```ts
const useToggle = (initial = false): readonly [boolean, () => void] => {
  const [on, setOn] = useState(initial);
  const toggle = () => setOn((v) => !v);
  return [on, toggle] as const;
};

const [isOpen, toggleOpen] = useToggle();
const [isHovered, toggleHover] = useToggle();
```

Prose, one paragraph: the caller destructures-and-renames at the use site — `isOpen` here, `isHovered` there, with the same hook. The tuple shape lets the call-site naming **be the API**. Returning `{ on, toggle }` would force every caller into either using `on` and `toggle` literally (collision-prone across multiple uses in one component) or doing the rename in the destructure anyway (`const { on: isOpen, toggle: toggleOpen } = useToggle()`) — strictly more verbose for the same outcome.

One short rule: **two elements is the comfortable ceiling for a tuple hook return.** Past two, named fields win — `useForm()` returns `{ register, handleSubmit, formState, ... }`, not a six-tuple. The student will meet this rule again in Unit 3 when they write custom hooks for the project.

Add a `Term` tooltip on **destructure-and-rename** here, defined inline: "Destructuring with a rename — `const [open, toggle] = useToggle()` lets the caller name the binding without the hook prescribing it. The reason `useState` returns a tuple."

#### `Object.entries` and `Map` iteration

State the rule: **`Object.entries(obj)` yields tuples; destructure them in the `for...of` head.** Same with `map.entries()`, `Array.prototype.entries()`, and any built-in that yields key-value pairs. The student already met `Object.entries` in chapter 003; here, the tuple recognition lets the destructure read cleanly.

Show one canonical pattern:

```ts
const statusLabels = { draft: 'Draft', sent: 'Sent', paid: 'Paid' };

for (const [status, label] of Object.entries(statusLabels)) {
  console.log(`${status}: ${label}`);
}

// Same shape with Map:
const counts = new Map<string, number>([['draft', 3], ['sent', 7]]);
for (const [status, count] of counts.entries()) {
  console.log(`${status}: ${count}`);
}
```

Prose, one paragraph: the destructure in the `for...of` head names both halves of the pair without an intermediate variable. The student should leave able to read `for (const [a, b] of x.entries())` anywhere — the language ships this shape across `Object`, `Map`, `Set`, and `Array`.

One terse note (`Aside type="caution"`): `Object.entries` is typed as `[string, T][]` at the TypeScript level, **not** `[keyof T, T[keyof T]][]`. The key always widens to `string` even when the object has a literal-keyed shape. Workarounds exist (typed `entries` helpers, narrow casts) but the senior reflex is to live with the `string` key for iteration and reach for `Record<LiteralUnion, V>` (next lesson) when the typed-key matters at the access site, not at the iteration site.

#### Go-style `[error, value]` result wrappers

State the rule: **a third-party library may return `[error, value]` as a tuple — read it correctly, but write a discriminated `Result` for new code.** The Go-style tuple form is common in error-as-value wrappers; the course writes the discriminated-union `Result<T>` shape (lesson 5 of chapter 004 seeds it; chapter 008 lesson 1 builds it) for new code because it scales past two slots and narrows cleanly.

Show one short library-shaped example:

```ts
const [err, user] = await tryFetch('/api/me');
if (err) {
  return notFound();
}
// user is narrowed to the success branch
```

Prose, one paragraph: the student will meet this form in libraries (`neverthrow`, hand-rolled wrappers, fetch helpers from older codebases). It reads cleanly when the caller knows the convention; it doesn't narrow as well as a discriminated `Result` (the student has to remember that `err` truthy means `user` is whatever-was-on-failure). For new code, the course writes:

```ts
type Result<T> = { ok: true; value: T } | { ok: false; error: Error };
```

— and lesson 5 of chapter 004 introduces the shape. This subsection plants the recognition; the actual `Result` pattern is the chapter 008 lesson 1 build.

Pedagogical note: don't pre-teach discriminated unions or `Result`. The tuple recognition is the lesson. One sentence forward link is enough.

### When to reach for an object instead

**Goal:** the senior call. The student leaves able to defend the tuple-vs-object decision in one sentence.

Open with the flip rule in one paragraph: **if the call site won't destructure-and-rename, or if the positions are easy to swap by accident, use an object.** The first half of the rule rules out most "return multiple values" cases — a function returning `{ id, email, role }` is an object, not a tuple, because the caller will use the names as-is. The second half rules out tuples past three elements — a `[lat, lng, alt]` survives the rule; a `[lat, lng, alt, accuracy, timestamp]` doesn't.

Two short rules, one per paragraph:

- **Three positions is the rough boundary.** Coordinates (`[x, y, z]`) survive — the names at the call site are the same as the convention names, labels would be noise, and swapping is unlikely because the meanings are positional in the domain. Past three, the cost of remembering position outweighs the conciseness, and the senior call is an object every time.
- **If the slots have different meanings to different callers, it's an object.** A single shape that ships `[id, name, email]` to a user-card component and `[id, email, role]` to an auth check is two different signatures masquerading as one tuple. Two functions, two shapes — usually objects, possibly two tuples, never one.

Use a `MultipleChoice` (single-correct) to test the decision in one move:

**Question:** "Which of the following return shapes is best modeled as a tuple instead of an object?"

- `getUserCard(id) → { id, name, avatarUrl, role, createdAt }` — five fields, callers use the names. **Wrong** (object).
- `useToggle() → [boolean, () => void]` — two slots, every caller destructures-and-renames. **Correct.**
- `getCoordinates() → [number, number, number, number, number]` — five `number`s with no domain hint. **Wrong** (object — too many same-typed positions to swap safely).
- `parseDate(s) → { ok, value, error }` — three fields, callers reach for the names. **Wrong** (object, plus this is the `Result` shape from chapter 008 lesson 1).

Add a brief `<McqWhy>` explaining the decision rule: destructure-and-rename + short length is the tuple's earned ground; past that, name the fields.

Pedagogical note: the wrong answers must each represent a specific misunderstanding — too many positions, multiple meanings per slot, or the discriminated-union case that the student should reach for instead. The right answer is the canonical `useToggle` shape from the custom-hook subsection.

### Write a labeled readonly tuple return

**Goal:** practice the canonical custom-hook tuple return once so the syntax sticks.

Use a `TypeCoding` exercise — the lesson is **types**, so the type-only widget is the right tool.

- **Instructions:** "Type `useDisclosure` so that its return is a labeled, readonly tuple of `[isOpen, open, close]`. The `^?` queries below should resolve to the labeled tuple form."
- **Starter:** a `useDisclosure` declaration with a hand-stubbed return that loses the tuple shape (either no annotation, or an array annotation that widens). Include `^?` queries on the call site's destructured variables.

  ```ts
  import { useState } from 'react';

  const useDisclosure = (initial = false) => {
    const [isOpen, setIsOpen] = useState(initial);
    const open = () => setIsOpen(true);
    const close = () => setIsOpen(false);
    return [isOpen, open, close];
  };

  const [isOpen, open, close] = useDisclosure();
  //     ^?
  //              ^?
  //                    ^?
  ```

  The student's job is to:
  - Annotate the return type explicitly as `readonly [isOpen: boolean, open: () => void, close: () => void]` (one valid solution), **or**
  - Add `as const` to the returned array literal and let inference do the rest.

- **Expected queries:** at minimum, the first `^?` query resolves to `boolean` (or the labeled form). Pin one or two of the labels — the exact display string depends on TypeScript's tooltip rendering.
- **Expected errors:** none. The default "Fix all errors" criterion applies — if the student leaves the unlabeled array shape, the editor displays the inferred type which doesn't match the `^?` pin.

One short paragraph after the exercise: the two valid solutions (explicit annotation vs. `as const`) both land the same type. The annotation version is the senior reach when the hook is exported from a shared file — the contract is visible without opening the body. The `as const` version is fine for hooks scoped to a single file. The student will meet `as const` in full in lesson 7 of chapter 004.

Pedagogical note: the exercise's value is the **once-through-by-hand** of the labeled tuple syntax. Don't over-specify the criteria — let either valid path land the type, and rely on the `^?` queries to confirm the shape.

### External resources

Three `ExternalResource` cards at the end:

- TypeScript Handbook — [Tuple Types](https://www.typescriptlang.org/docs/handbook/2/objects.html#tuple-types) — official treatment.
- TypeScript 4.0 release notes — [Labeled Tuple Elements](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-4-0.html#labeled-tuple-elements) — the canonical reference for the label syntax.
- Total TypeScript or 2ality piece on tuple types — pick the most current 2026 article that lines up with the lesson's posture (tuples as the rare reach, not the default). The lesson writer should pick the live link; **don't link an outdated piece**.

## Scope

**The student already knows (don't re-teach):**

- Arrays, indexed read, `.map` / `.filter` / `.length` (chapter 003). Reference them; don't re-derive.
- Destructuring (chapter 002 lesson on naming and control flow). The `const [a, b] = ...` syntax is assumed.
- `for...of` loops (chapter 003). The lesson uses one in the `Object.entries` section without re-teaching.
- `useState` and the `[value, setter]` shape — the student has seen this in casual passes but **the lesson is the first time the chapter formalizes it**. Treat the recognition as fresh; treat the runtime behavior as known.
- `const` binds the name, not the value (Chapter 001 lesson 6). The `readonly` tuple mental model reuses this rule; don't re-derive.
- The seven primitives, literal unions, the four corners (lesson 1 of chapter 004). Reference primitive names freely; do not re-explain the four corners.
- `type` is the default; `?` and `readonly` modifiers on object fields (lesson 2 of chapter 004). The lesson uses both forms in examples; doesn't re-teach.
- Strict tsconfig is on (`strict: true`, `noUncheckedIndexedAccess`, `verbatimModuleSyntax` — lesson 5 of chapter 024, pinned from chapter 003). The student is running TypeScript under strict already; assume it.

**Reserved for later lessons (don't pre-teach):**

- **Index signatures and `Record<K, V>`.** Lesson 4 of chapter 004. Don't use `Record` examples here; don't show dynamic-keyed shapes.
- **Unions and intersections (`|`, `&`).** Lesson 5 of chapter 004. The `Result` forward link mentions a union shape in one line; no deeper treatment in this lesson.
- **Narrowing.** Lesson 6 of chapter 004. The Go-style `[err, value]` example uses truthy-on-`err` narrowing implicitly; don't formalize the narrowing rules.
- **`as const` and `satisfies`.** Lesson 7 of chapter 004. Named once in the `readonly` section and once in the exercise's alt-solution note. No full treatment; one-line forward links only.
- **Discriminated `Result<T>` type.** Lesson 5 of chapter 004 seeds the shape; chapter 008 lesson 1 builds it. The lesson mentions the type signature in one line as the preferred-for-new-code alternative to Go-style tuples.
- **Annotation-vs-inference rule and `import type` discipline.** Lesson 8 of chapter 004. The exercise's two valid solutions hint at the trade-off; don't formalize the rule.
- **Variadic tuple types** (`[...T, U]` at the type level beyond the rest-position basics named here). Library-author territory; the lesson names that non-final rest is legal and stops there.
- **Tuple manipulation utility types** (`[Head, ...Tail]` patterns, `Tail<T>` derivations). Library-author territory; out of scope.
- **The full custom-hook surface for the project.** Unit 3 introduces hooks formally. This lesson uses `useToggle` and `useDisclosure` as examples but does not teach hook authoring rules (`use*` prefix lint, dependency arrays, etc.).
- **Reading `Object.entries` with literally-typed keys.** The lesson mentions the `string` widening of `Object.entries` once as a caution; deeper treatment lives in lesson 5 of chapter 005 (`keyof` and `typeof` operators) and is out of scope here.

**One-line mentions only (named, not taught):**

- **`as const`** — named in the `readonly` section and in the exercise's solution-equivalence note. Full treatment in lesson 7 of chapter 004.
- **Discriminated `Result<T>`** — named in the Go-style tuple subsection as the preferred-for-new-code alternative. Full treatment in lesson 5 of chapter 004 (seed) and chapter 008 lesson 1 (build).
- **`Map.entries`, `Array.entries`, `Set.entries`** — named in the `Object.entries` subsection as built-ins that yield the same tuple shape; the lesson shows `Object.entries` and `Map.entries` and mentions the others in one line.
- **`ReadonlyArray<T>`** — implicitly referenced via the chapter 004 lesson 2 connection to `readonly T[]`; not re-named here.
- **`[number, number, number]` for coordinates** — named in one line in the "when to reach for an object" section as the canonical short-tuple-in-domain case that survives the three-position rule.
- **Non-final rest positions** (`[string, ...number[], boolean]`) — named in one line in the optional/rest section as legal-since-4.2 but rare in application code.

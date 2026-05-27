# Lesson title

- **Title (h1):** Bindings, not boxes
- **Sidebar label:** Bindings, not boxes

# Lesson framing

This is the first content lesson of the course's first chapter. The student knows some programming and may have written assignments in another language; what they don't have is a precise model of what `=` does in JavaScript and which values bleed across function boundaries. Everything later — React state immutability, Server Action serialization, the `const` reflex — leans on this lesson.

**Conclusions from brainstorming that apply lesson-wide:**

- **One central mental model.** Build the binding diagram (name → value) once, then re-reference it for every subsequent topic (assignment, parameter passing, copies, deep copies). This is the lesson's spine; everything else is a consequence of it. Don't introduce new metaphors mid-lesson.
- **Failure-first framing per the pedagogical filter.** Open with the two-components-drift bug. Each major shift in the lesson reopens with another short observable failure (mutation across a function boundary, shallow copy missing a nested object). Syntax follows the failure.
- **Senior reflexes, not rules.** End-state: the student picks `structuredClone` by default when deep-copying, recognizes `JSON.parse(JSON.stringify(x))` as a legacy smell, and can predict whether a mutation will be visible to a caller without running the code.
- **TypeScript everywhere.** All examples are `.ts`. Inference-led; don't annotate inferred types. Use object literals and arrays at the depth typical of SaaS code (a record with a nested `address`), not toy `{a: 1, b: 2}` shapes when avoidable.
- **No prose surveys.** No "JavaScript has seven primitive types — let's enumerate them" intro. Name primitives only at the call site of the binding diagram.
- **Forward links land in one sentence.** Server Action serialization (chapter 030.4) and React state immutability (chapter 023.4 / 024.2) each get a single sentence — no detours.
- **Cognitive load discipline.** The binding diagram is intentionally the simplified model first (one named binding, one value), then complicates only as needed (two bindings sharing one object box). Don't show the heap/stack abstraction — it's a separate model and isn't load-bearing for the lesson's reflexes.

Estimated student time: 30–35 minutes.

# Lesson sections

## Introduction (no h2)

Open with the production failure in two sentences: a teammate's PR mutated an object the calling component still held a reference to, and two pieces of UI drifted out of sync until the next refresh. State the diagnosis plainly: the bug class is treating `=` as "duplicates the value" when it actually "binds the name to a value." Promise the student that by the end of the lesson they'll know exactly which values are shared and which aren't, and that the fix isn't a defensive-copy reflex — it's a clear mental model.

Keep it 3–4 sentences total. No bullet list, no headers in the intro. Don't preview every section.

## Names and values

**Goal:** install the binding metaphor as the lesson's spine.

Teach the one rule that drives everything: in JavaScript, `=` binds a name to a value — it does not duplicate or box the value. Then split values into the two categories that determine what assignment looks like:

- **Primitives** (`string`, `number`, `boolean`, `bigint`, `symbol`, `null`, `undefined`). The name holds the value directly. Assigning to another name copies the value.
- **Objects** (including arrays and functions). The name holds a **reference** to a value that lives elsewhere. Assigning to another name copies the reference — both names now point at the same value.

Name the seven primitives in one sentence as a list (don't enumerate with depth — that's a future lesson). Use a `<Term>` for "reference" with a short definition: "a pointer-like value that identifies an object; assigning a reference does not duplicate the object it points at."

**Diagram (the spine):** A hand-coded SVG inside a `<Figure>`, two panels side by side:

- **Left panel — "Primitive assignment":** Two labeled boxes `a` and `b`, each containing the literal `42`. A short caption strip below the diagram reads `const a = 42; const b = a;`.
- **Right panel — "Reference assignment":** Two labeled boxes `user` and `alias`, each with an arrow pointing into a single shared object box `{ name: 'Ada', age: 36 }`. Caption strip: `const user = { name: 'Ada', age: 36 }; const alias = user;`.

Both panels use the same visual vocabulary (named box = binding, box on the right = value). Pedagogical goal: the student should be able to draw this diagram themselves after the lesson. Keep it small (≤300px height), horizontal layout. This diagram is referenced throughout the lesson and again in lesson 6 (`const binds, it doesn't freeze`).

Close the section with a single short snippet showing the consequence of right-panel sharing — `alias.name = 'Grace'; console.log(user.name);` printing `'Grace'`. Use a fenced `ts` code block.

## What functions do with the values you pass them

**Goal:** restate the binding model at the call site and resolve the perennial pass-by-value-vs-reference confusion.

Open with the senior framing that ends every debate: **JavaScript is always pass-by-value — but the value being passed for an object is a reference.** That single sentence is the takeaway.

Walk the two cases the student will ship if they don't know this, side by side. Use a `<CodeVariants>` block:

- **Variant 1 — "Reassigning the parameter":** A function that takes a `user` parameter and reassigns it locally (`user = { name: 'Grace' }`). Show that the caller's binding is untouched. The reassignment rebound the local name; the caller's name still points at the original.
- **Variant 2 — "Mutating a property":** A function that takes the same `user` and mutates a property (`user.name = 'Grace'`). Show that the caller's object is changed. The local name and the caller's name both point at the same object; the mutation is visible everywhere.

Per-pane mark colors: blue for variant 1 (safe rebinding), orange for variant 2 (cross-boundary mutation). The prose under each variant should be a single sentence naming why the result is what it is.

End with one terse sentence: every senior has shipped both bugs at least once. The fix is the model, not memorization.

## Shallow copy: the daily reach

**Goal:** install spread as the default shallow-copy form and teach the "shallow" qualifier through the failure mode it implies.

Open by naming the trigger: you usually don't want to mutate a value you received from somewhere else, but you do want to produce a modified version. The answer is to copy first, then modify. The 2026 default for that copy is the spread operator.

Show the three shallow-copy forms in a tight code block, each with one trigger:

```ts
const next = { ...prev };        // object — the default
const next = [...prev];          // array — the default
const next = Object.assign({}, prev); // rare; mixing with defineProperty semantics
```

Mention `Array.prototype.slice()` in one sentence as the legacy reach for arguments-like objects you can't spread (then drop it).

Then teach what "shallow" means by showing the failure. Use a small `<ScriptCoding>` exercise where the student watches a spread copy fail to isolate a nested object:

```ts
const original = {
  name: 'Ada',
  address: { street: 'Lovelace Ln', city: 'London' },
};
const copy = { ...original };
copy.address.street = 'Babbage Ave';
// Did `original.address.street` change?
```

The starter has the student write a single line that asserts what happened. Tests verify that `original.address.street === 'Babbage Ave'` (the shared nested reference) and that `copy.name === 'Ada'` and the names diverge when reassigned (the top level was copied). The grading is the lesson: spread copies one level; nested objects keep their original reference.

Close with the senior framing in one sentence: shallow is almost always what you want — most state shapes are flat or only one level deep, and reaching for deep copy when you don't need to is wasteful.

## structuredClone: the deep copy default

**Goal:** install `structuredClone` as the 2026 deep-copy reflex and retire `JSON.parse(JSON.stringify(x))` as the legacy form to recognize but not write.

Open by naming the trigger: when the data shape is genuinely nested (an object with objects in it, a record holding a `Map`, a tree), the spread does not protect the inner references and the mutation will bleed. The 2026 answer is `structuredClone`.

Show the canonical usage in a `<CodeVariants>` block comparing the two forms side by side:

- **Variant 1 — Spread (shallow):** `const copy = { ...original };` — followed by the now-familiar prose "nested objects still shared."
- **Variant 2 — `structuredClone` (deep):** `const copy = structuredClone(original);` — "every nested object is independently copied; mutations don't leak."

Both variants operate on the same nested record from the previous section. Use `ins=` marks on the differing line.

Then one short paragraph on what `structuredClone` is in 2026 — a global function built into Node 24 LTS (the course's pinned runtime — natively available since Node 17) and every browser the course targets, no import required, no library. It handles cyclical references and preserves `Date`, `Map`, `Set`, `ArrayBuffer`, typed arrays, and `RegExp` (none of which `JSON.parse(JSON.stringify)` survives). It's typically faster than the JSON round-trip and always more faithful.

Name the failure modes tersely (a `<Aside type="caution">`):

- Functions throw `DataCloneError` (you can't clone behavior).
- Class instances become plain objects (the prototype chain is dropped).
- DOM nodes, `WeakMap`/`WeakSet`, and getters/setters don't survive.

State the senior rule: if `structuredClone` throws, the value carries behavior — and behavior shouldn't be cloned anyway.

**Forward link (one sentence):** Server Actions and the `'use server'` boundary serialize their arguments through a superset of the structured-clone algorithm — the mental model installed here is what later chapters reuse without re-explanation.

## The JSON.parse(JSON.stringify(x)) you'll see in legacy code

**Goal:** equip the student to recognize the legacy pattern, understand what it actually does, and reach for `structuredClone` by reflex.

One tight subsection. Show the shape once:

```ts
const copy = JSON.parse(JSON.stringify(original));
```

State plainly: this is what people wrote before `structuredClone` shipped natively. It deep-copies but silently mutates the data along the way — `undefined` properties disappear, `Date` becomes an ISO string, `Map`/`Set` become empty objects, `BigInt` throws, and functions are stripped. That data loss is occasionally useful (forcing a wire-format normalization) and almost always a bug.

Use a `<PredictOutput>` exercise to land the watch-out. The snippet roundtrips a small object containing `{ created: new Date(), tags: new Set(['a', 'b']), ratio: undefined }` and logs the result; the student predicts what the keys look like after. Expected output makes the lossiness undeniable (`created` is a string, `tags` is `{}`, `ratio` is missing).

`<PredictWhy>` reveals the rule: `JSON.stringify` only knows about the JSON data model — anything outside it is silently lost or corrupted. Reach for `structuredClone` unless you specifically want JSON's lossy normalization.

## The React-shaped reflex this builds toward

**Goal:** plant the copy-then-modify reflex at the language level so the React chapters don't have to re-derive it.

One short paragraph. State the rule: React detects state changes by reference equality. Mutating an array or object in place doesn't change its reference, so the reconciler skips the re-render and the UI silently drifts from the data. The senior reflex is **copy then modify**, never mutate in place. The shallow-vs-deep call from this lesson is the call you'll make every time you update React state.

Don't show React code. The rule belongs here as a foundation; the React-specific patterns belong in chapter 023.4 and 024.2 (named in one sentence as the forward link).

Mention Immer in a single line as the "structurally enforced immutability" library some teams reach for — not the 2026 default, named here only so the student recognizes it.

## Check yourself

**Goal:** confirm the student can predict cross-boundary behavior without running the code.

A single `<PredictOutput>`-driven check (instead of four small ones — keeps cognitive load focused). The snippet combines three of the lesson's beats in a sequence of `console.log` calls:

1. A primitive assignment + reassignment of one binding (caller's binding unchanged — the rebinding case).
2. An object passed to a function that mutates a property (caller's object changed — the mutation case).
3. A spread copy mutated at a nested level (top-level isolated, nested level shared — the shallow-copy case).

Each `console.log` produces one line of output; the student predicts all three at once. `<PredictWhy>` walks each line to the relevant section of the lesson. This single exercise checks all three of the lesson's central reflexes; one composite check beats three small isolated ones because it forces the student to apply the binding model rather than pattern-matching each in isolation.

No sandbox. The lesson is short and tight; a sandbox here is busywork.

## Terms requiring `<Term>` tooltips

Use sparingly — the lesson explains terms in prose where it can.

- **reference** — at first use in the "Names and values" section. Definition: "A pointer-like value that identifies an object; assigning a reference doesn't duplicate the object it points at."
- **structured clone algorithm** — at first use of `structuredClone`. Definition: "The serialization algorithm shared by `structuredClone`, `postMessage`, and (a superset of it) Server Actions. Handles cycles, `Date`, `Map`, `Set`, typed arrays; rejects functions and class instances."

Skip tooltips for terms the lesson defines in prose (`primitive`, `object`, `binding`, `shallow copy`, `deep copy`) — defining them inline is the lesson's job, a tooltip would be redundant.

# Scope

**This lesson covers:** the binding model (primitive vs. reference), parameter passing as binding, spread for shallow copy, `structuredClone` for deep copy, the `JSON.parse(JSON.stringify(x))` legacy pattern named once, and the copy-then-modify reflex named once.

**Out of scope (explicit, with destinations):**

- The full `Object.*` static surface — `Object.keys`, `Object.entries`, `Object.groupBy`, etc. Owned by chapter 003.1.
- Enumerating every primitive type in depth (`Symbol`, `BigInt` semantics) — chapter 003.1 and chapter 004.1.
- `Object.freeze` and the distinction between binding immutability and value immutability — lesson 6 of this chapter (chapter 001.6).
- React state mutation patterns (`setX(prev => ...)`, `useReducer`, Immer integration) — chapter 023.4 and chapter 024.2. Named only as the forward link.
- Server Action serialization mechanics — chapter 030.4. Named only as the forward link.
- The `===` operator's reference-equality behavior — lesson 2 of this chapter (chapter 001.2). The student may be tempted to discuss equality; defer it explicitly with a one-sentence handoff if it comes up.
- Immer or any "structurally enforced immutability" library — named in one line, not taught.
- V8 hidden classes, heap/stack distinctions — not on the senior path.

**Prerequisite reactivation (concise):** The student has been told the runtime is Node and the language is TypeScript-flavored JS (Unit 1 prior chapters). They've seen `const` in a scaffold. They have *not* been taught the value model. Don't reintroduce TypeScript syntax; do introduce primitive vs. reference from scratch.

# Code conventions notes

- All snippets are `.ts`; use `const` by default. Don't show `let` in this lesson — its trigger is owned by lesson 6.
- Inference-led typing; do not annotate inferred types. Object literals don't need `: { ... }` annotations.
- Naming: semantic and domain-tied (`user`, `address`, not `foo`/`bar`). For demonstrating the rebinding-vs-mutation distinction, use `user` consistently.
- No arrow-function declarations in this lesson unless a callback is intrinsic (it isn't, for this lesson). The function-form conventions are owned by chapter 002.1.
- Two-positional-parameter rule doesn't bite here — keep helper functions to one parameter for clarity.
- **Deliberate divergence:** Use object literals shaped as nested records (`{ name, address: { street, city } }`) rather than the SaaS-realistic shape (`User` with branded `UserId`, `email`, etc.). Pedagogically, branded types and discriminated unions would distract from the binding model. Downstream agents: keep examples shape-simple, name them domain-realistically.

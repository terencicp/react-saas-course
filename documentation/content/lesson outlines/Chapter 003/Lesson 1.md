# Lesson 1 — The object as workhorse record

## Title and sidebar label

- **Title (h1):** `The object as workhorse record`
- **Sidebar label:** `Object as record`

## Lesson framing

This is the chapter-opener and the first container lesson. The pedagogical job is **installing the senior reflex for the daily object surface**: how to build records (shorthand / computed keys / spread), how to read them (dot vs. bracket, `Object.hasOwn`), and how to reshape them through the `Object.*` static surface that retires the lodash habit (`Object.entries`, `Object.fromEntries`, `Object.groupBy`).

Chapter 003's threads that govern this lesson:

- **Decisions before syntax.** Open with two real bugs whose roots are the same: a prototype-chain leak (`obj[userInput]` returns `Object.prototype.toString`) and a spread merge that silently overwrote an `id` field. The senior form prevents both. This is the lesson's spine.
- **Defaults before conditionals.** Dot access is the default, bracket the conditional with three named triggers. Shorthand is the default literal form, computed-keys/spread the conditional. `Object.hasOwn` over `in`. `Object.groupBy` over a hand-rolled reduce.
- **TypeScript-flavored, inference-led.** All snippets `.ts`. Respect `noUncheckedIndexedAccess` — bracket access on `Record<string, T>` returns `T | undefined`. Don't re-teach `Record<K, V>` (lands in Ch 004 L4); use it once with a `<Term>` if it appears.
- **Forward links land softly.** Drizzle row shapes (Unit 5), React props (Unit 3), Server Action input (Ch 030 L4), Zod parse output (Unit 6). One sentence each at lesson close.

**Mental model the student should end with:** an object literal is a *record* — a known, named-field shape. Use the form that says what you mean: dot to *read a known field*, brackets to *read a key held in a variable*, shorthand to *say "same name"*, spread to *say "all of base, then these overrides"*, `Object.hasOwn` to *say "is this key actually here, not inherited"*, `Object.groupBy` to *say "bucket these rows by this field"*.

**Common beginner mistakes this lesson prevents:**
- Reaching for brackets when dot would do (a "feels more dynamic" tic).
- Writing `'foo' in obj` for own-key checks (catches inherited keys; this is the lodash-era reflex `Object.hasOwn` retires).
- Assuming spread deep-merges (it doesn't — already named in Ch 001 L1; recall in one sentence).
- Writing `users.reduce((acc, u) => ({ ...acc, [u.status]: ... }), {})` when `Object.groupBy(users, u => u.status)` exists.
- Treating `Object.keys(obj)` as `keyof T` (it returns `string[]`; the widening is intentional).

**Archetype:** Mechanics with a Reference closing beat (matches the chapter outline's pedagogical guidance). Tight enumerated walks for the construction-sugar trio and the `Object.*` surface — no padding, one snippet per concept.

**Seed domain:** continue the **invoices / customers / orders** thread Ch 001 L3-L5 and Ch 002 L2-L6 established. Money in integer cents (Ch 001 L3). Names like `invoice`, `customer`, `amountCents` already familiar.

**Estimated student time:** 30 to 35 minutes (per chapter outline).

---

## Lesson sections

### Section 1 — Introduction (no h2, lesson lead)

Two-paragraph opener (no header). Sets the lesson's stakes via the chapter outline's two bugs:

- **Bug 1.** A function reaches into a config object with `config[userInput]` and the property comes back as `Object.prototype.toString` — the prototype chain leaked into application logic. Show in 4-5 lines of code as an inline fence.
- **Bug 2.** A `{ ...patch }` over a base invoice silently overwrote the `id` field the patch wasn't supposed to touch — the customer got a new invoice ID. Show in 4-5 lines as an inline fence.

Both are object-handling bugs the senior form prevents. The lesson installs the daily reach for *building*, *reading*, and *reshaping* record-shaped values. State the three subjects in one sentence so the student has a map.

**Pedagogical reasoning:** the chapter framing explicitly demands "the syntax follows the failure." Concrete bugs make the senior-form-is-the-fix story land. Keep snippets short — the bugs hit harder when the reader can hold both versions in their head.

---

### Section 2 — The two access forms

**h2:** `Dot by default, brackets on trigger`

**Content:**

- Dot access (`invoice.amountCents`) is the default. Static, type-checked against the known shape, the form every reader expects to see.
- Bracket access (`invoice['amount-cents']`, `invoice[fieldName]`) is the *conditional* form, with three named triggers:
  1. Keys that aren't valid identifiers (`'amount-cents'`, `'user.email'`).
  2. Keys held in a variable (`fieldName`).
  3. Dynamic-key patterns (factory helpers, schema-mapping).
- Under `noUncheckedIndexedAccess` (already on per Ch 024 L4), bracket access on a `Record<string, T>` returns `T | undefined`. Dot access on a typed shape returns `T`. Show the type difference with one `<CodeTooltips>` snippet that shows the inferred type via tooltip on both reads.

**Component:** Single `<CodeTooltips>` block (one .ts fence) showing both forms side-by-side on a small `invoice` object literal, with tooltips on the `invoice.amountCents` read (`number`) and on `record['amount-cents']` read (`number | undefined`). This is the single most load-bearing type-shape contrast in the lesson — tooltips are the right vehicle because the type is inferred, not annotated.

**Watch-out (inline, not a separate section):** the chapter framing also stresses that brackets feel "more dynamic" to juniors — name this as the tic, not the senior reach.

**Term:** `noUncheckedIndexedAccess` defined via `<Term>` (one-line: the tsconfig strict flag that makes indexed/bracket reads return `T | undefined`) — defined for the first time here in Ch 003; reused throughout the chapter.

**Pedagogical reasoning:** dot vs. bracket is the smallest decision in the lesson but the most-frequent one. Naming the *three triggers* gives the student a finite checklist instead of vibes.

---

### Section 3 — Building objects: the three construction sugars

**h2:** `Building records: shorthand, computed keys, spread`

Each sugar is a tiny standalone subsection (h3) so the student can scan the surface fast. The chapter outline says "named once each."

#### h3: `Property shorthand`

- `{ name, email }` over `{ name: name, email: email }` when the field name matches a binding in scope.
- The senior reflex for any object literal built from local variables.
- Short fenced .ts block, 4 lines: bindings then literal.

#### h3: `Computed keys`

- `{ [fieldName]: value }` when the key itself is dynamic.
- Rare in 2026 app code (most keys are known at write time); shows up in factory helpers and reducer patterns.
- Short fenced .ts block, 4 lines.

#### h3: `Spread merge — right-most key wins`

- `{ ...base, status: 'paid' }` for shallow merge with override.
- State the **right-most key wins** rule explicitly — this is the rule that, when misread, produces the chapter-opener's overwrite bug.
- Recall in one sentence: spread is shallow (nested object references are shared) — already named in Ch 001 L1; do **not** re-derive.
- Show the form React state setters, Server Action input merging, and Drizzle update payloads all consume.

**Component:** `<CodeVariants>` with three tabs (one per sugar) sharing the same `customer` source object so the student sees three forms of *the same operation*. Each tab has a 4-6 line fence + one-sentence framing.

**Pedagogical reasoning:** the three sugars are not parallel in importance (shorthand and spread are constant; computed keys are rare), but they share a syntactic surface — the `CodeVariants` triad reads as "three flavors of `{ ... }`". Color convention from prior chapters: green on each (all are senior defaults, just for different triggers).

**Embedded exercise — `<SandboxCallout>` (TS Playground via `<TSPlaygroundCallout>`)**: prefilled with a small program where the student plays with spread merge semantics — `{ ...base, ...patch }` vs `{ ...patch, ...base }` over an `invoice` literal with overlapping keys. The student toggles spread order and watches "right-most key wins" land. One sentence of framing.

---

### Section 4 — Reading: three checks, three behaviors

**h2:** `Is the key actually there?`

**Content:** the three property-presence checks, named with their semantics so the student stops conflating them. This is the chapter outline's "in vs. hasOwn vs. ?." paragraph.

- `'amountCents' in invoice` — walks the prototype chain. Catches inherited keys. Almost always the wrong reach in 2026 app code (the legacy form to recognize).
- `Object.hasOwn(invoice, 'amountCents')` — own-property only. The 2026 replacement for the historical `Object.prototype.hasOwnProperty.call(...)` incantation. Reach for it when the answer must exclude inherited keys (e.g. reading user-controlled keys from a parsed JSON payload).
- `invoice.amountCents !== undefined` (or `invoice.amountCents ?? fallback`) — the right reach for "is there a *value* here." This is what most application code actually wants. Anchored back to Ch 002 L5's `??` operator (one-sentence anchor, not re-derived).

**Component:** A 4-row markdown table or a tight `<CodeVariants>` (three tabs, one per check) showing each form applied to the same `invoice` object. Prefer `<CodeVariants>` (label per check, 2-3 line fence per tab) so each gets the runtime-result comment.

**Watch-out (inline):** the `in` operator's prototype-chain walk is the connective tissue back to the lesson opener's Bug 1 — name it explicitly: "this is why `obj[userInput]` returning `toString` is in the same family as `'toString' in obj` returning `true`."

**Pedagogical reasoning:** the three-check confusion is one of the chapter outline's headline beats. Naming each one's exact semantic kills the conflation. `Object.hasOwn` is the 2026 form (ES2022; universally available) — the lesson should not show `hasOwnProperty.call(...)` except in a one-line "this is the form to recognize in older code" note.

---

### Section 5 — The `Object.*` static surface

**h2:** `The Object.* methods worth knowing`

A tight enumerated walk. The chapter outline gives the exact set: keys/values/entries triad, `Object.assign`, `Object.fromEntries`, `Object.freeze`/`Object.isFrozen` (one line each), and `Object.groupBy` (the new beat). One snippet per method, no padding.

**Structure:** use `<AnnotatedCode>` to walk one shared utility example that touches `Object.entries`, `Object.fromEntries`, and `Object.assign` in three steps. Then a small standalone .ts fence for `Object.groupBy`. Then a one-line bullet for `Object.freeze`/`Object.isFrozen`.

#### h3: `Object.keys, Object.values, Object.entries — the iteration triad`

- Each returns an array of own enumerable keys / values / `[key, value]` pairs (in insertion order).
- Drives object iteration with `for...of` (forward-link to Ch 003 L5) and `.map` over key-value pairs (forward-link to Ch 003 L3).
- **TypeScript watch-out (inline):** `Object.keys(obj)` returns `string[]`, **not** `keyof T`. The type widens because at runtime, `obj` could have more keys than its compile-time type. Reach for `Object.entries` plus a type assertion only at trusted boundaries — name it as a real and intentional design choice, not a TS bug.

**Component:** small `<CodeTooltips>` snippet around an `Object.keys(invoice)` call with the tooltip on the inferred type (`string[]`) so the widening is visible.

#### h3: `Object.fromEntries — the inverse`

- The senior reach for "I have an array of `[key, value]` pairs and want an object."
- Two canonical sites: `Object.fromEntries(map)` to convert a `Map` to a plain object (forward-link Ch 003 L4), and `Object.fromEntries(new URLSearchParams(query))` for shallow query-string parsing (forward-link Ch 030 L4 / `formData` shape).
- Replaces the `.reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})` pattern — name it as the lodash-era form `Object.fromEntries` retires.

#### h3: `Object.assign — mutates, return the target`

- `Object.assign(target, ...sources)` — mutates `target`, returns it.
- **Watch-out:** the mutation surprises callers. The senior reach for non-mutating merge is spread (`{ ...a, ...b }`).
- `Object.assign` earns its place only when the mutation is the point (patching a config object the caller already owns).
- One short fence, one line of framing.

#### h3: `Object.freeze, Object.isFrozen — runtime immutability`

- Named in one line. TypeScript's `readonly` is the design-time enforcement (forward-link Ch 004 L2); `Object.freeze` is the rare runtime guarantee.
- Already framed in Ch 001 L6 — recall, don't re-derive.

#### h3: `Object.groupBy — bucket rows by a string key`

- ES2024. Returns a plain object grouping array items by the string key the function returns.
- The senior reach for "group an array of rows by a categorical field."
- Pairs with `Map.groupBy` (forward-link Ch 003 L4) when the grouping key isn't a string.
- **Canonical snippet:** `Object.groupBy(invoices, (invoice) => invoice.status)` returning `{ paid: Invoice[]; pending: Invoice[]; void: Invoice[] }` (note: actual return-type signature is `Partial<Record<K, T[]>>` — point this out via `<CodeTooltips>` on the result binding because it's a real ergonomic gotcha the student will hit).

**Components used in this section:**
- `<AnnotatedCode>` with 3-4 steps walking a `parseQueryString` or `mergeConfig` example that uses `Object.entries` → transform → `Object.fromEntries`. Colors: blue → green → green.
- `<CodeTooltips>` on the `Object.keys` return type and on the `Object.groupBy` return type.
- Plain fence for `Object.groupBy` real example.

**Pedagogical reasoning:** this section is reference-shaped but lives in the middle of the lesson, not the end, because `Object.groupBy` is the lesson's headline modern beat. The `AnnotatedCode` walk pays off the `entries` ↔ `fromEntries` symmetry — the student sees one operation, not three disconnected ones. The watch-out on `Object.keys` widening is a real bug class juniors hit; flag it inline, not in a separate section.

**Terms** to wrap with `<Term>`:
- `noUncheckedIndexedAccess` (already defined in Section 2).
- `enumerable` — one-line definition of own-enumerable-key semantics if it shows up.

---

### Section 6 — The prototype chain, named and parked

**h2:** `The prototype chain in one paragraph`

**Content:** every object literal inherits from `Object.prototype` (and therefore has `.toString`, `.hasOwnProperty`, `.constructor` available on the chain). The senior never relies on inherited methods through user-controlled keys, which is why `Object.hasOwn` exists. For the rare case where prototype-less is needed (a strict map of user keys), `Object.create(null)` is the form — named once, parked.

Keep this section to **one short paragraph** plus one 2-line fence showing `Object.create(null)` for recognition. No deep dive — the chapter outline explicitly cuts the reflective surface (`getOwnPropertyDescriptor`, `defineProperty`, `getPrototypeOf`) and `__proto__`.

**Pedagogical reasoning:** the prototype chain is the *why* behind Section 4's `hasOwn` reach. Stating it once after the practical sections lets the student close the loop without front-loading theory. The "parked" framing matches the chapter outline's direction.

---

### Section 7 — Where objects show up next

**h2:** `Where this lands later`

**Content:** four one-sentence forward links per the chapter outline:

- Drizzle returns row objects (Unit 5).
- React props are an object shape — your component receives `{ children, className, ... }` (Unit 3 / Ch 022).
- Server Actions consume an options-object input (Ch 030 L4).
- Zod's `.parse()` returns a typed object (Unit 6).

Format as a small bulleted list. No code samples — these are pointers, not previews.

**Pedagogical reasoning:** chapter framing demands "forward links land softly." One sentence each, no preview code, no `<ExternalResource>` cards — just a map of where the student will see this surface again.

---

### Section 8 — Closing exercise

**h2:** `Check yourself`

**Component:** `<Buckets twoCol>` with **four** buckets and **eight** access-pattern items, per the chapter outline's exact spec:

- **Bucket 1:** `Dot access` — known field of a typed shape.
- **Bucket 2:** `Bracket access` — dynamic key.
- **Bucket 3:** `Object.hasOwn` — exclude inherited keys.
- **Bucket 4:** `?? fallback` — "is there a value here."

Eight items, each a short prose chip phrased as an intent (not as code, so the student picks by *what they need*, not by *syntax recognition*):

1. "Read the `amountCents` field of an `Invoice` you just queried." → Dot
2. "Read a field whose name comes from a `fieldName` variable in a generic helper." → Bracket
3. "Check whether a key is present in a parsed JSON payload (must not return `true` for inherited keys like `toString`)." → `Object.hasOwn`
4. "Read a CSS property name like `'background-color'` off a style object." → Bracket
5. "Return the user's locale or `'en'` if it's missing." → `?? fallback`
6. "Look up a value in a `Record<string, number>` and need to handle the missing case." → `?? fallback` (because `noUncheckedIndexedAccess` already returns `T | undefined`)
7. "Confirm a user-supplied key isn't shadowing a `Object.prototype` method." → `Object.hasOwn`
8. "Read `customer.email` to send a receipt." → Dot

Eight items / four buckets / `twoCol` layout — consistent with Ch 001/Ch 002 closing exercise shapes the student has seen before.

**Pedagogical reasoning:** the chapter outline explicitly calls for a Buckets exercise sorting eight access patterns into four reaches. This is the senior-reflex install — the student trains the decision, not the syntax. Phrasing items as *intent* (not code) is deliberate so the student practices going *from* the problem *to* the form.

---

### Section 9 — External resources

**h2:** `Further reading`

A small `<CardGrid>` (or just `<ExternalResource>` cards) with 3 links — keep tight per the chapter outline style:

- MDN — Working with objects.
- MDN — `Object.groupBy` (since it's the headline 2026 beat).
- MDN — `Object.hasOwn`.

No video for this lesson — the surface is enumerated, not conceptual. A video would dilute. (Chapter 002 L2 / L6 both skipped video for the same reason.)

---

## Scope

### What this lesson teaches

Building, reading, and reshaping object literals as records — dot/bracket access with the three bracket triggers, the three construction sugars with the right-most-key-wins rule, the `'foo' in obj` vs. `Object.hasOwn` vs. `?.` three-check distinction, and the `Object.*` static surface the senior reaches for daily including `Object.groupBy`.

### What this lesson does NOT teach (handled elsewhere)

- **`Map` and `Set`** — Ch 003 L4. The object here is *a record* (known fields, schema-shaped), not *a dictionary* (dynamic keys at scale). Reaching for `Map` is L4's job.
- **Array methods (`.map`, `.filter`, `.reduce`, etc.)** — Ch 003 L3. If a snippet shows `.map` over `Object.entries`, it appears as syntax-in-use only, not as the teaching subject.
- **Iteration with `for...of`** — Ch 003 L5. Forward-link only.
- **Object type annotations (`type Foo = { a: string }`, `?` optional modifier, `readonly`)** — Ch 004 L2. This lesson is *values, not types*. Inferred shapes are fine; do not write explicit `type` aliases unless the snippet absolutely requires one for clarity. Even then, prefer destructuring at the call site (carryover from Ch 002 L6).
- **`Record<K, V>` mapped type** — Ch 004 L4. If `Record<string, T>` appears in a type tooltip (it likely will when explaining `noUncheckedIndexedAccess` on bracket access), wrap once with a `<Term>` defining it as "object type with dynamic keys, all values of type T" and *do not* expand. Forward-link Ch 004 L4 once.
- **The reflective surface** (`Object.getOwnPropertyDescriptor`, `Object.defineProperty`, `Object.getPrototypeOf`, `__proto__`) — class-adjacent, not on the daily senior path. Cut from the lesson; recognized in one line if at all in Section 6.
- **`Object.create(proto)` for prototype-based inheritance** — replaced by ES classes (Ch 009 L2). Named once for recognition.
- **JSON serialization and round-tripping** — Ch 009 L1. Do not show `JSON.stringify(obj)` examples here.
- **Deep merge utilities (`lodash.merge`, custom recursive merge)** — out of scope. The recall sentence on "spread is shallow" is enough.
- **`structuredClone` for deep copy** — already taught in Ch 001 L1. Recall in one sentence if shallow-vs-deep comes up.
- **The senior `useState`-as-object update pattern** (`setState(prev => ({ ...prev, ...patch }))`) — Unit 3 / Ch 023. The spread-merge form taught here forward-links there in one sentence; do not preview React state mechanics.

### Prerequisite recalls (one sentence each, no re-derivation)

- Spread is shallow (Ch 001 L1).
- `??` returns the right-hand side only on `null`/`undefined` (Ch 002 L5).
- `noUncheckedIndexedAccess` is on (Ch 024 L4, already-pinned tsconfig flag).
- `const`-bound arrow functions, single quotes, semantic domain names (Ch 001-002 carryover).

---

## Code conventions alignment

All snippets:
- `.ts`, single quotes, 2-space indent.
- `const fn = (...) => ...` arrow form for any function shown (matches Ch 002 L1).
- Inference-led — annotate only when the snippet's point is the type shape.
- Semantic domain names: `invoice`, `customer`, `amountCents`, `orderId`. Continue the chapter-001/002 seed.
- No `any`, no `enum`, no `interface` (use inline object shapes when needed).
- Money in integer cents (Ch 001 L3).
- For the `Object.groupBy` example: don't pre-define an `Invoice` type — let the inference do the work and surface the return-type shape via `<CodeTooltips>`.

**Deliberate divergence from production-grade conventions for pedagogy:**
- The Section 3 sandbox example may use slightly contrived overlapping keys (e.g. `id: 'old'` in base and `id: 'new'` in patch) to make the right-most-key-wins rule visible. Production code would name the field something less load-bearing than `id`; the pedagogical point requires the obvious case.
- Type aliases are avoided even where production code would use one (per Ch 004 L2 scope rule above).

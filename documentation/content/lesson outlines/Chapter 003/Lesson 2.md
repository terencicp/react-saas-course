# Lesson 2 — Arrays and the non-mutating update

## Title and sidebar label

- **Title (h1):** `Arrays and the non-mutating update`
- **Sidebar label:** `Arrays, non-mutating`

## Lesson framing

Second lesson in Chapter 003. Lesson 1 installed the object as record. This lesson installs **the array surface that's safe to use inside any state-holding code** — index-safe reads under `noUncheckedIndexedAccess`, `.at()` for positional access, and the ES2023 non-mutating update family (`.toSorted`, `.toReversed`, `.toSpliced`, `.with`) as the React-state-safe twins of the mutating originals.

Chapter 003's threads that govern this lesson:

- **Decisions before syntax.** The opener is the canonical React day-one bug: `arr.sort()` mutates in place, React skips the re-render. The mutating/non-mutating split *is* the lesson.
- **Defaults before conditionals.** `.at()` is the default for "last element" (over `arr[arr.length - 1]`). `.toSorted` / `.toReversed` / `.toSpliced` / `.with` are the default for any array held outside a function's own scope. `.push`/`.pop`/`.shift`/`.unshift` and bracket assignment still earn their place, but only inside a function that owns the array.
- **Immutability where the framework requires it.** Don't preach immutability as a philosophy — teach the form React and Server Actions demand. The structural rule is "outside this function's scope = replace, never mutate."
- **TypeScript-flavored, inference-led.** Respect `noUncheckedIndexedAccess` (already pinned from Ch 024 L4, defined via `<Term>` in Ch 003 L1). `arr[0]` is `T | undefined`; handle it.
- **Forward links land softly.** React `useState<T[]>` (Unit 3 / Ch 023), Drizzle result arrays (Unit 5), `Array.from(formData.entries())` in Server Actions (Ch 030 L4). One sentence each at lesson close.

**Mental model the student should end with:** an array literal is *an ordered list*. Reading it is index-safe under strict TS, so handle `undefined` at the read site. Reshaping it splits in two by ownership — *inside this function's own scope*, mutate; *anywhere the array is shared* (React state, props, a value returned upward), replace with the non-mutating twin. The four pairs (`sort`/`toSorted`, `reverse`/`toReversed`, `splice`/`toSpliced`, `arr[i] = x`/`.with(i, x)`) are the reflex.

**Common beginner mistakes this lesson prevents:**
- Calling `.sort()` on React state and wondering why the component doesn't re-render.
- Writing `arr[arr.length - 1]` for "last element" instead of `arr.at(-1)`.
- Writing `arr[0].name` under `noUncheckedIndexedAccess` and getting a TS error they don't understand.
- Reaching for `.slice()` to clone, then mutating the clone, when `.toSorted` would have said it in one step.
- Confusing `.slice` (non-mutating) with `.splice` (mutating) — names one letter apart.
- Setting `arr.length = 0` to clear (legacy form to recognize, not write).
- `Array(3)` makes `[undefined, undefined, undefined]` (a sparse hole-array) instead of `[3]`.

**Archetype:** Pattern. Open with the mutation bug, name the four pairs in a tight table, then walk the pieces. The reading surface (`.at`, indexing under strict TS) earns one short beat each. The mutate-in-place forms get a "narrow trigger" paragraph so the student knows when they're still right.

**Seed domain:** continue the **invoices / customers / orders** thread. Money in integer cents. Re-use `invoice`, `customer`, `amountCents`, `status`. Sorting an `invoices` array by `amountCents` is the running example.

**Estimated student time:** 30 to 35 minutes (per chapter outline).

---

## Lesson sections

### Section 1 — Introduction (no h2, lesson lead)

Two short paragraphs (no header). Opens with the React state-mutation bug as the senior question.

- **Bug snippet (5-6 lines of TSX):** a `<InvoiceList>` component that calls `invoices.sort(...)` inside an `onClick` and calls `setInvoices(invoices)`. The component doesn't re-render. The mutation didn't change the array's *reference*, so React's reconciler bailed out. Show the bug with one line of comment naming the silent failure.
- The fix isn't a defensive copy reflex (`[...invoices].sort(...)`); it's reaching for the ES2023 non-mutating twin by name (`invoices.toSorted(...)`). One sentence stating: this lesson installs the array surface that's safe to use inside any state-holding code, plus the strict-index reads that come with `noUncheckedIndexedAccess`.

**Pedagogical reasoning:** the chapter framing demands "syntax follows failure." The React reconciler bug is the most concrete and most-bitten failure for this surface — it sets up *why* `.toSorted` exists in one beat. The lesson doesn't yet teach React, but the bug pattern is universal enough (any framework / observable system that compares references skips a re-derive on mutation). Frame the React snippet as "you'll see this surface for real later; the bug class is the point now."

---

### Section 2 — Reading: `arr[i]` is `T | undefined`

**h2:** `Indexing under strict TypeScript`

**Content:**

- The course pins `noUncheckedIndexedAccess` (recall via `<Term>` — already defined in Ch 003 L1). Under it, `arr[0]` returns `T | undefined`, not `T`.
- Two senior reaches for handling the undefined:
  - `arr[0] ?? fallback` for "use a default when the slot is empty." Anchor back to Ch 002 L5's `??` operator in one sentence.
  - A length check that narrows: `if (arr.length > 0) { arr[0]; /* still T | undefined */ }`. **Important watch-out:** the length check does *not* narrow `arr[0]` to `T` — TypeScript can't prove that `length > 0` means index 0 is populated (sparse arrays exist). The reach when you want `T` from a length-narrowed array is destructuring: `const [first] = arr;` gives `first: T | undefined` too, but at least the intent reads cleanly. The clean form is `const first = arr[0]; if (first === undefined) return; /* first is T below */`.
- The error message juniors see: `'arr[0]' is possibly 'undefined'`. Name it explicitly so they recognize it when it lands.

**Component:** Single `<CodeTooltips>` block (one .ts fence) showing `arr[0]` and `arr[0] ?? 0` on a `const amounts: number[] = [4900, 1200]` — tooltip on each read showing the inferred type (`number | undefined` and `number`).

**Pedagogical reasoning:** the student met `noUncheckedIndexedAccess` in L1 on objects; reapplying it to arrays here cements the rule. The narrowing-via-temp-binding pattern is the senior reflex and worth one line — students otherwise write `if (arr.length > 0) arr[0]!.foo` with non-null assertions, which is the wrong escape.

**Term:** `noUncheckedIndexedAccess` re-wrapped with `<Term>` (use the same definition string from L1 for consistency).

---

### Section 3 — `.at()` for positional access

**h2:** `.at() reads from either end`

**Content:**

- `arr.at(0)` for the first, `arr.at(-1)` for the last, `arr.at(-2)` for second-to-last. Returns `T | undefined` like bracket access under strict TS.
- The senior reach over `arr[arr.length - 1]` for "last element" — shorter, no off-by-one bugs, reads as intent.
- One-line note: positive indices on `.at()` behave identically to bracket access; the value-add is negative indices.

**Component:** One short fenced `.ts` block (4-5 lines). No tooltip needed — the type is the same as bracket access and was just covered.

**Pedagogical reasoning:** small, high-value beat. The reflex is one keystroke (`.at(-1)` over `[arr.length - 1]`) but it's the single most-frequent positional read in the whole course. Worth its own h2 so students search-and-find it later.

---

### Section 4 — Reshape: the mutating / non-mutating split

**h2:** `Reshape: mutate locally, replace when shared`

**Content (the lesson's spine):**

- State the rule in one sentence: when the array is **owned by the function** (declared inside, never returned to a caller that mutates it), mutating methods are fine. When the array is **shared** (React state, props, a return value the caller holds, a value sitting in a `Map`), mutate-in-place is a bug — reach for the non-mutating twin.
- The four pairs the student must recognize. Present them in a tight 4-row table — students should be able to memorize the mapping in 30 seconds.

| Mutates the original | Returns a new array |
| --- | --- |
| `arr.sort(compareFn)` | `arr.toSorted(compareFn)` |
| `arr.reverse()` | `arr.toReversed()` |
| `arr.splice(start, deleteCount, ...items)` | `arr.toSpliced(start, deleteCount, ...items)` |
| `arr[i] = value` | `arr.with(i, value)` |

- All four ES2023 non-mutating forms are universally available in 2026 — Node 20+ (Node 24 LTS is the course's pinned runtime per Ch 003 L8), every current evergreen browser. They're the senior reach by reflex when the array is held in state.

**Component:** the table as plain markdown (Starlight handles it). Below the table, a `<CodeVariants>` with two tabs (`Mutates (wrong here)` and `Non-mutating (right)`) showing the same `invoices.sort((a, b) => a.amountCents - b.amountCents)` call inside a `setInvoices(...)`-shaped wrapper, with `del=` / `ins=` markers showing the one-line fix. Each tab body: one fence + one sentence of framing.

- **Tab 1 — Mutates:** `invoices.sort(...)` + `setInvoices(invoices)`. Framing: "Same reference, React skips the re-render."
- **Tab 2 — Non-mutating:** `setInvoices(invoices.toSorted(...))`. Framing: "New array, new reference, render lands."

**Watch-out (inline):** `.toSpliced` is the only one of the four whose mutating sibling (`.splice`) the student may have memorized for both insertion and deletion. State its signature once: `(start, deleteCount, ...itemsToInsert)`. No extended walk — the lesson stays focused on the *pair*, not the splice arithmetic.

**Pedagogical reasoning:** this is the lesson. Put the table early in the section so the student has the pairs in working memory before the rationale. The `CodeVariants` adjacent before/after on the same operation makes the one-line swap visible — it's not a refactor, it's a method-name change. The "ownership rule" framing (rather than the philosophical "immutability") matches the chapter framing's directive: *the course teaches the form React and Server Actions demand, not immutability as ideology.*

---

### Section 5 — When mutate-in-place still earns its place

**h2:** `When mutate-in-place is still right`

**Content:**

- `.push`, `.pop`, `.shift`, `.unshift` — all mutate. They're still correct **when the array is owned by the function building it.** The trigger: "I declared this `const result = []` two lines ago and I'm pushing into it inside a `for...of`; nobody outside this function will ever see the intermediate state."
- One short snippet showing the form: build a list of formatted invoice strings inside a function, return the array, caller uses it. The `.push` inside the loop is fine because the array never escapes mid-construction.
- The wrong reach (one-line counter-example, no full snippet): `setInvoices(prev => { prev.push(newInvoice); return prev; })` — same `prev` reference handed back, no re-render. The right form is `setInvoices(prev => [...prev, newInvoice])`.
- One sentence on `arr.length = 0` as the legacy clear pattern — recognize it, never write it; the form for "I need this binding to point to an empty array" is `arr = []` (reassignment) or `setArr([])` in React state.

**Component:** One short fenced `.ts` block (6-8 lines) for the inside-a-function `.push` example. Inline `:::caution` Aside for the React-state-`.push` counter-example, one line plus one fence.

**Pedagogical reasoning:** without this section, students learn "mutating = bad" as a slogan and write awkward `[...arr, x]` spreads inside locally-scoped builders where `.push` is cleaner. The senior reflex isn't "never mutate" — it's "mutate what you own." Naming the trigger (function-owned vs shared) closes the loop so the rule is *applicable*, not dogmatic.

---

### Section 6 — Two shallow-copy forms: spread and `.slice()`

**h2:** `Spread and slice: when you do want a copy`

**Content:**

- `[...arr, newItem]` is the default for "array with one or two changes at the boundary" — `[...arr, x]` for append, `[head, ...rest]` for prepend-and-keep-the-rest. Senior reflex for prepending an item to React state.
- `arr.slice()` is the default for "shallow copy of the whole thing." `arr.slice(0, 3)` for the first three, `arr.slice(-3)` for the last three. The non-mutating cousin of `.splice` — the names being one letter apart is a recognized footgun; flag it once.
- Both copy shallowly (recall via one sentence: nested objects keep their reference — already named in Ch 001 L1).
- **One-line forward-link note:** for replacing one item by index in a list (React `setItems(items.with(i, updated))`) or removing one slice (`items.toSpliced(i, 1)`), reach for `.with` and `.toSpliced` from Section 4. Spread is for the boundary; `.with` is for the middle.

**Component:** One small fenced `.ts` block showing both forms on an `invoices` array — `[...invoices, newInvoice]` for append, `invoices.slice(-3)` for last-three. Two operations, one snippet.

**Pedagogical reasoning:** spread and `.slice()` are tightly bound to the non-mutating reflex but are not themselves the ES2023 family — group them together so the student sees the full shallow-copy surface. The "spread for boundary, `.with` for middle" line is the decision rule juniors need; otherwise they default to `[...arr.slice(0, i), x, ...arr.slice(i + 1)]` which is a six-token detour.

---

### Section 7 — `Array.from` and `Array.of`

**h2:** `Array.from and Array.of`

**Content:**

- `Array.from(iterable, mapFn?)` — converts any iterable (a `Set`, a `NodeList`, a generator, a string, anything with `[Symbol.iterator]`) into an array. Optional second-arg map step folds the transform into the conversion.
- Canonical idiom: `Array.from(new Set(arr))` for primitive-array dedup. One short snippet.
- `Array.of(...items)` exists to dodge the `Array(3)` ambiguity: `Array(3)` makes a length-3 sparse array (three holes, *not* three `undefined`s for most operations); `Array.of(3)` makes `[3]`. The course writes array literals (`[3]`) by default and reaches for `Array.of` essentially never; name it for recognition.
- One-line tease: the iteration protocol behind `Array.from` (`Symbol.iterator`) gets its own treatment in the iteration lesson later in this chapter.

**Component:** One short fenced `.ts` block showing the `Array.from(new Set([...]))` dedup. No snippet for `Array.of` — one prose sentence is enough.

**Pedagogical reasoning:** these two are reference-shaped, not pattern-shaped, but `Array.from(new Set(...))` is the canonical dedup the student will reach for half a dozen times in the next units. The `Array(3)` trap is named because students *will* try it. Section is short — this isn't the lesson's heart.

---

### Section 8 — Where this lands later

**h2:** `Where this lands later`

**Content:** four one-sentence forward links per the chapter outline:

- React `useState<T[]>` and the non-mutating update rule (Unit 3 / Ch 023) — every `setState` call replaces the array reference. Spread, `.toSorted`, `.toSpliced`, and `.with` are the daily reach.
- The Drizzle result set (Unit 5) — `select` queries hand back `T[]`; transforms before the response use the methods from this lesson and the array-method surface (`.map`, `.filter`) from the next lesson.
- `Array.from(formData.entries())` in Server Actions (Ch 030 L4) — the `Array.from` over `formData`'s pair-iterator is how form input becomes a typed object.
- The full `.map`/`.filter`/`.reduce`/`.find` surface lands next lesson; this lesson handled the *containing* operations (read, copy, reshape), not the *element-by-element* operations.

Format as a small bulleted list. No code samples.

**Pedagogical reasoning:** chapter framing demands "forward links land softly." Mention the next lesson explicitly because the partition (this lesson = container ops, next lesson = element ops) helps the student build the right mental shelf.

---

### Section 9 — Predict-output exercise

**h2:** `Predict the output`

Two short `<PredictOutput>` drills back-to-back, each on one of the lesson's key beats. The chapter outline asks for *six small array operations — three mutating, three non-mutating — where the student predicts the resulting state of `original` and `result`*; split into two predict-output cards (one per operation pair) keeps each program scannable.

**Card 1 — `.sort()` vs `.toSorted()`** (the lesson's headline beat).

Program (TS, ~6 lines):
```ts
const original = [3, 1, 2];
const sorted = original.sort((a, b) => a - b);
console.log(sorted, original, sorted === original);
```
Expected output: `[ 1, 2, 3 ] [ 1, 2, 3 ] true` (or the Node REPL formatting equivalent — author chooses one shape and pins `expected` to it; recommend the `[1,2,3] [1,2,3] true` single-line form for predictability).

`<PredictWhy>`: `.sort()` mutates `original` in place and returns the same reference. Both bindings see the sorted array, and the strict-equality check is `true`. Reach for `.toSorted` when you want `original` unchanged.

**Card 2 — `.toSorted()` returns new array.**

Program (TS, ~6 lines):
```ts
const original = [3, 1, 2];
const sorted = original.toSorted((a, b) => a - b);
console.log(sorted, original, sorted === original);
```
Expected output: `[ 1, 2, 3 ] [ 3, 1, 2 ] false`.

`<PredictWhy>`: `.toSorted` builds a new array and leaves `original` alone. Different references, different contents.

**Pedagogical reasoning:** prediction exercises hit harder than reading for this beat because the difference between the two forms is *one method name* — students who have read past it without internalizing the contract will get the second card wrong, and the wrong answer + the reveal closes the loop. Two cards (not one) because the contrast between the two outputs is the actual lesson; running them in sequence lets the student commit to a prediction on one before seeing the other.

**Component:** Two `<PredictOutput>` blocks back-to-back, each with a `<PredictWhy>` inside.

---

### Section 10 — Closing react-coding exercise

**h2:** `Fix the silent re-render`

Per the chapter outline: a `<ReactCoding>` exercise where a buggy sort-mutating component is fixed by swapping `.sort()` for `.toSorted()` and the re-render lands.

**Setup:**

- `instructions`: "The list never re-orders when you click Sort by amount. Find the line that's mutating in place and reach for the non-mutating twin so React sees a new array."
- `starter`: an `App` component with a `useState` of 4-5 invoices (`id`, `amountCents`, `status`) and a "Sort by amount" button whose handler does `setInvoices(invoices.sort((a, b) => a.amountCents - b.amountCents))`. List rendered as `<ul>` with each item showing the amount in dollars. Tailwind for minimal styling so the list reads cleanly.
- `tests`: two tests.
  - **Test 1**: after clicking the button, the rendered list's first item shows the smallest amount. Use `document.querySelectorAll('li')` + check the first `textContent`.
  - **Test 2** (the structural check): after clicking the button, the original-order reference is preserved — fire the click twice and confirm the second click still produces the sorted output (which would fail if the state mutation had double-sorted weirdly, but more importantly forces the student to use a non-mutating method). Actually, **simpler approach:** the rendered first item after one click is the smallest amount, *and* the first item after a re-render (no click) is *not* sorted on initial mount. The combination is what the student must achieve. Author the tests with the simplest assertions that fail on the bug and pass on the fix.
- `live`: false (default; this is a click-then-Run exercise, not a target-match).

**Pedagogical reasoning:** the chapter outline explicitly calls for this exercise. It's the lesson's most direct payoff — students see the React reconciler actually skip the render on the mutation and start rendering on the swap. Live-mode is off because the meaningful interaction is a button click inside the iframe, not text editing.

**Note for the writer:** the test for "is the list sorted after click" is the load-bearing one. Don't over-engineer the second test; one test that passes only when the swap is made is enough.

---

### Section 11 — External resources

**h2:** `Further reading`

Small `<CardGrid>` with 3 `<ExternalResource>` cards. Keep tight.

- MDN — `Array.prototype.toSorted` (the headline ES2023 method).
- MDN — `Array.prototype.at` (the negative-index reader).
- MDN — Indexed collections / Array overview (one general pointer for the full surface).

No video — the surface is enumerated and the central beat is a one-line method swap; a video would dilute. (Matches Ch 003 L1's call.)

---

## Scope

### What this lesson teaches

Array indexing under `noUncheckedIndexedAccess`, `.at()` for positional reads (including negative), the four ES2023 non-mutating method pairs (`.toSorted`/`.toReversed`/`.toSpliced`/`.with`) and the ownership-based rule for when mutate-in-place still earns its place, the spread and `.slice()` shallow-copy forms, and the `Array.from`/`Array.of` static surface with `Array.from(new Set(arr))` as the canonical dedup.

### What this lesson does NOT teach (handled elsewhere)

- **Element-by-element transforms (`.map`, `.filter`, `.reduce`, `.find` family, `.some`/`.every`, `.flatMap`, `.forEach`)** — Ch 003 L3. If any snippet in this lesson uses `.map` (e.g. rendering the list in the React exercise), it appears as syntax-in-use, not as the teaching subject.
- **`Set` and `Map`** — Ch 003 L4. `Array.from(new Set(arr))` for dedup appears here as one-line idiom; the *why* of `Set` is Ch 003 L4's job.
- **The iteration protocol and `for...of` over arrays** — Ch 003 L5. Forward-link only.
- **The lazy `Iterator.prototype` helpers (ES2025)** — Ch 003 L5.
- **Typed arrays (`Uint8Array`, `Int32Array`, etc.)** — niche; named in Ch 016 if at all.
- **`Array.prototype.fill` and `.copyWithin`** — out of scope.
- **Sparse arrays and the holes-vs-undefined distinction** — named in one line via the `Array(3)` gotcha in Section 7; not expanded.
- **React `useState<T[]>` mechanics** — Unit 3 / Ch 023. The opener bug uses React shape for the failure visualization (and the closing exercise lands the fix), but the lesson does *not* teach `useState`. The student takes the React snippets on faith — the *array surface* is the subject.
- **Server Actions / `formData` input** — Ch 030 L4. Forward-link only.
- **Drizzle result-set transforms** — Unit 5. Forward-link only.

### Prerequisite recalls (one sentence each, no re-derivation)

- `noUncheckedIndexedAccess` is on (Ch 024 L4 pin, defined in Ch 003 L1).
- `??` returns the right-hand side only on `null`/`undefined` (Ch 002 L5).
- Spread is shallow (Ch 001 L1).
- `const` binds the reference; mutating a `const`-bound array's contents is allowed (Ch 001 L6).
- `const`-bound arrow functions, single quotes, semantic domain names (Ch 001-002 carryover).

---

## Code conventions alignment

All snippets:
- `.ts` (or `.tsx` for the React exercise), single quotes, 2-space indent, semicolons on.
- `const fn = (...) => ...` arrow form (matches Ch 002 L1).
- Inference-led — annotate only when the snippet's point is the type shape (Section 2 `.ts` `number[]` is the only deliberate annotation).
- Semantic domain names: `invoices`, `invoice`, `amountCents`, `status`, `id`. Continue the chapter-001/002 seed.
- No `any`, no `enum`, no `interface`. Use inline object shapes where needed.
- Money in integer cents (Ch 001 L3).
- The React-coding exercise's `App` is named `App` (component constraint of `ReactCoding`). Inside the component, list items are rendered with stable `key={invoice.id}`.

**Deliberate divergence from production-grade conventions for pedagogy:**
- Section 5's "mutate-in-place earns its place" snippet uses `.push` inside a function, which is fine per the conventions but worth flagging: production code in this course often prefers `.map` / `.flatMap` for the same shape. The `.push` form is shown to give students a *defensible* trigger for the mutating methods, even though Ch 003 L3 will then teach the array-method chain as the more common reach.
- The React exercise uses inline `setInvoices(invoices.sort(...))` and `setInvoices(invoices.toSorted(...))` rather than the updater-function form (`setInvoices(prev => ...)`). This is deliberate — the lesson's point is the *array method*, not React state update patterns. Updater-functions land in Ch 023.

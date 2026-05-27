# Lesson 3 — The array method surface

## Title and sidebar label

- **Title (h1):** `The array method surface`
- **Sidebar label:** `Array methods`

## Lesson framing

Third lesson in Chapter 003. Lesson 2 installed the array as a *container* — index-safe reads, the non-mutating update family, the shallow-copy forms. This lesson installs the *element-by-element* surface: `.map`, `.filter` (with the type-predicate shape), `.reduce`, the `.find` family, `.some`/`.every`, `.flatMap`, `.forEach` — plus the four explicit triggers that flip the choice from a method chain to a `for...of` loop.

Chapter 003's threads that govern this lesson:

- **Decisions before syntax.** The opener is *two* bugs at opposite ends of one spectrum: the imperative-loop-everywhere junior writes `for (let i = 0; ...)` for every transform; the over-applied-chain junior fuses `.map().filter().reduce()` for an operation that needs async sequencing and early exit. The lesson is the *choice*, not the catalog.
- **Defaults before conditionals.** `.map`/`.filter`/`.reduce`/`.find` are the default pipeline. `for...of` is the conditional reach with four named triggers (async, early termination, multiple statements per iteration, custom step). `.forEach` almost never wins.
- **Immutability where the framework requires it.** Every method in this lesson is non-mutating (recalled from L2 in one sentence). React `state.map(...)` is the daily reach for transforming list state.
- **TypeScript-flavored, inference-led.** Honor `noUncheckedIndexedAccess` (from L1, recalled via `<Term>`). The `.filter` type-predicate shape — including TS 5.5+'s *inferred* type predicates and the explicit `(x): x is T` form for the cases inference doesn't catch — is the lesson's load-bearing TS interaction.
- **Forward links land softly.** React list rendering with `key` (Unit 3 / Ch 022), TanStack Query's `data?.map(...)` (Unit 15), Drizzle result-set transforms (Unit 5). One sentence each at lesson close.

**Mental model the student should end with:** the eight array methods sort cleanly into four output shapes — *transform* (`.map`, `.flatMap`), *subset* (`.filter`), *fold* (`.reduce`), *search/test* (`.find` family, `.some`, `.every`), plus *side-effect* (`.forEach`, almost never). When the operation fits one of those shapes and stays synchronous and walks the whole array, the method is the senior reach. When async sequencing, early break, multi-statement bodies, or a custom step enter the picture, `for...of` is the right reach. When the chain hits four-plus links, *name the intermediate* instead of fluent-chaining.

**Common beginner mistakes this lesson prevents:**
- Writing a `for (let i = 0; ...)` loop for what `.map` would say in one line.
- Reaching for `.filter(fn).length > 0` instead of `.some(fn)` (which short-circuits and reads as the question).
- Writing `.filter(Boolean)` over `(string | null)[]` and being surprised the result is still `(string | null)[]` — TS 5.5+ infers type predicates from `=== null`/`!== null` style predicates but *not* from truthiness checks like `Boolean` or `!!x`.
- Reaching for a `.reduce(...)` `({...acc, [k]: v}, {})` shape that's `O(n²)` because spread copies the accumulator every iteration; missing the `Object.fromEntries(arr.map(...))` linear alternative.
- Chaining `.map(async ...)` and expecting sequential awaits — gets an array of promises that runs in parallel.
- Calling `.find` to test existence (returns the element when `.some` would have returned a boolean).
- Using `.forEach(async ...)` expecting sequenced async work — `.forEach` doesn't await; `for...of` does.
- Putting a `.includes(x.id)` inside a `.filter` callback over a 10k-row list (`O(n × m)`) when a `Set` would make the inner check `O(1)`.

**Archetype:** Reference/survey done tightly — eight methods, but each gets only one line of prose plus one short snippet because the *surface* is the lesson, not deep mechanics. Then a Decision close on the four `for...of` triggers and the chain-readability rule. The closing exercise is a `<CodeReview>` on a fifteen-line function that combines an async `.forEach` (wrong) and a four-link transform chain (poorly named) — the student flags both.

**Seed domain:** continue the **invoices / customers / orders** thread. `invoices` array with `id`, `amountCents`, `status` (`'paid' | 'pending' | 'overdue'`), `customerId`, `dueDate`. Sums, filters by status, find-by-id, and a flatten-of-line-items operation are the running examples.

**Estimated student time:** 35 to 40 minutes (per chapter outline).

---

## Lesson sections

### Section 1 — Introduction (no h2, lesson lead)

Two short paragraphs (no header). Opens with the *spectrum* of bugs the senior reflex sits between.

- **Bug 1 (5-6 lines of TS):** an `invoiceTotal` function that builds the sum with `let total = 0; for (let i = 0; i < invoices.length; i++) { total += invoices[i].amountCents; }` — the imperative C-style write where `.reduce((sum, i) => sum + i.amountCents, 0)` would have said the intent in one line.
- **Bug 2 (5-6 lines of TS):** a six-step chain — `invoices.map(...).filter(...).map(...).filter(...).reduce(...)` — where the inner work is asynchronous (an `await fetch(...)`) and a `for...of` would have been both shorter and correct (the chain returns an array of promises and runs in parallel).
- Frame the lesson: this is the *element-by-element* surface that complements L2's *container* surface. The reach for each method is well-defined; the trigger that flips to `for...of` is also well-defined. By the end, the student can pick the right form without thinking about it.

**Pedagogical reasoning:** "syntax follows failure" demands a failure to anchor the surface. The two-bug spectrum is more useful than a single bug because the lesson teaches *both* directions of the wrong reach — under-using methods and over-using chains. The asymmetry of the bugs maps onto the lesson's two big beats (the eight-method walk, then the `for...of` trigger).

---

### Section 2 — The four output shapes

**h2:** `Eight methods, four output shapes`

This is the lesson's spine. Open with a small visual taxonomy — a four-column figure (or a four-row markdown table, whichever reads cleaner; recommend a plain markdown table) that maps each of the eight methods to one of four output shapes:

| Output shape | Methods | What each returns |
| --- | --- | --- |
| Transform (same length, or 0/n) | `.map`, `.flatMap` | a new array of the same length (or expanded/contracted by `.flatMap`) |
| Subset | `.filter` | a new array of the items that pass the predicate |
| Fold | `.reduce`, `.reduceRight` | a single value built up from every element |
| Search / test | `.find`, `.findIndex`, `.findLast`, `.findLastIndex`, `.some`, `.every` | the first/last match, an index, or a boolean — *short-circuits* |
| Side effect | `.forEach` | `undefined`; runs the callback for each item |

Each subsection that follows walks one output shape with one or two snippets. The student should leave this section with the table memorized.

**Pedagogical reasoning:** the chapter outline names this lesson as a "Reference/survey archetype done tightly." Grouping the methods by *what they produce* rather than *how they're spelled* gives the student a query model — "I want one value out of a list, so I want a fold; that's `.reduce`" — instead of a list of names to memorize. The single largest cognitive-load win in this lesson is this grouping.

---

### Section 3 — Transform: `.map` and `.flatMap`

**h2:** `Transform: .map and .flatMap`

**Content:**

- **`.map((item) => transformed)`** — the default for "I have a list of A and I want a list of B." One snippet showing `invoices.map((i) => i.amountCents)` returning a `number[]`.
- **`.flatMap((item) => [...])`** — for "for each item produce zero or more results." Returning `[]` from the callback *drops* the item; returning `[a, b]` *expands* to two. The senior reach for the `.filter(fn).map(fn)` collapse when the two steps share a per-item computation. One short snippet: `invoices.flatMap((i) => i.status === 'overdue' ? [i.id] : [])` to extract overdue IDs in one walk.
- One sentence on `.flat(depth)` for *just* flattening a nested array (`[[1,2],[3]].flat()` → `[1,2,3]`). Named for recognition; `.flatMap` is the more common reach.

**Component:** Two short fenced `.ts` blocks — one for `.map`, one for `.flatMap`. No `CodeTooltips` needed; the types are obvious from the snippets.

**Pedagogical reasoning:** `.map` is the most-used method on this surface and gets the shortest beat (one snippet, one sentence) — the student already half-knows it from prior exposure. `.flatMap` earns slightly more space because the "return `[]` to drop" idiom is non-obvious and the `.filter().map()` collapse is the senior win.

---

### Section 4 — Subset: `.filter` and the type-predicate shape

**h2:** `Subset: .filter and the type predicate`

**Content (the lesson's load-bearing TS beat):**

- **`.filter((item) => boolean)`** — returns the items passing the predicate. One snippet showing `invoices.filter((i) => i.status === 'overdue')` returning the same shape.
- **The TypeScript narrowing surface.** When a `.filter` callback also *narrows* the element type (e.g. filtering `(string | null)[]` down to `string[]`), TypeScript needs to know that. There are three shapes a senior recognizes, in order of preference:
  1. **TS 5.5+'s inferred type predicate** (the modern default). TypeScript 5.5 shipped in June 2024 and is well past the universal-adoption line in 2026; the course's pinned TS version is 5.5+. When the callback is a simple comparison that clearly narrows — `(x) => x !== null`, `(x) => typeof x === 'string'` — TS *automatically* infers a type predicate and the result narrows. So `arr.filter((x) => x !== null)` over `(string | null)[]` returns `string[]` with no annotation. This is the daily reach.
  2. **The explicit `(x): x is T => ...` predicate** (the conditional reach). When the predicate is more complex than the inferer handles, or when the lesson author wants the narrowing intent visible at the call site, the explicit form is the senior reflex: `arr.filter((x): x is string => x.length > 0)`. The `is T` is a *type predicate* — it tells TS "if I return true, treat the argument as `T`." Forward link to Ch 005 L3 in one sentence (deep treatment of user-defined type guards).
  3. **A reusable helper** (the senior writes once and imports forever): `const isPresent = <T,>(x: T | null | undefined): x is T => x != null;`. Then `arr.filter(isPresent)` narrows correctly. The explicit `is T` on the helper makes the contract visible to every caller.
- **The footgun: `.filter(Boolean)` does not narrow.** TS 5.5's inferrer explicitly excludes truthiness checks (because `!!x` lies — `0`, `''`, and `false` are all "absent" by `Boolean` but valid values of their types). So `arr.filter(Boolean)` over `(string | null)[]` returns `(string | null)[]` — the type doesn't change. Name this loudly. The fix is the inferred `!== null` form, or one of the explicit forms above.

**Component:** One `<AnnotatedCode>` block (one .ts fence, 10-12 lines) walking four highlight steps on a small `(string | null)[]` example:
1. `arr.filter(Boolean)` — the naive try; TS still sees `(string | null)[]`. Annotation: "truthiness check, no narrowing."
2. `arr.filter((x) => x !== null)` — TS 5.5+ infers the predicate; result narrows to `string[]`. Annotation: "inferred — the daily reach."
3. `arr.filter((x): x is string => x !== null)` — explicit form, same narrow. Annotation: "explicit — when intent or complexity demands it."
4. `arr.filter(isPresent)` — helper form, same narrow. Annotation: "reusable — write once, import everywhere."

**Pedagogical reasoning:** the `.filter`/narrowing interaction is the one place this lesson's surface bites students with a TS shape they don't understand. Showing all four shapes in one walked snippet — including the `.filter(Boolean)` *anti-pattern* and the inferred-predicate *daily reach* — gives the student the full mental model. `<AnnotatedCode>` is the right vehicle because the focus must land on each shape in turn, and the same code block can carry all four with highlight steps.

**Term:** Define `type predicate` via `<Term>` on first use ("a function return type of the form `x is T` that tells TypeScript: if this returns `true`, treat `x` as `T`"). Reused once in Section 6 for `.find`-typed return.

---

### Section 5 — Fold: `.reduce` and its watch-outs

**h2:** `Fold: .reduce — and when not to`

**Content:**

- **`.reduce((acc, item) => nextAcc, initial)`** — the fold. The senior reach when the *result* is a single value built from every element: a sum, a min/max, an aggregate object. One snippet: `invoices.reduce((sum, i) => sum + i.amountCents, 0)` returning the total in integer cents.
- **Always pass the initial value.** Omitting it makes the first element the accumulator with confusing typing (especially under `noUncheckedIndexedAccess`); the explicit `, 0` (or `, []`, `, {}`) is the senior reflex.
- **Prefer specialized methods when they fit.** If the question is "is there at least one?" `.some` short-circuits and reads as the question. If "are they all?" `.every`. If "the first one matching?" `.find`. `.reduce` is right when none of those fit. One sentence each.
- **The "reduce to object" trap (the lesson's perf-shaped beat).** The `arr.reduce((acc, x) => ({ ...acc, [x.id]: x }), {})` pattern is `O(n²)` because the spread *copies the entire accumulator on every iteration*. The linear-time alternatives, by senior preference:
  - `Object.fromEntries(arr.map((x) => [x.id, x]))` — the canonical fix when the key is a string.
  - A `Map` (forward link to L4 in one sentence) when the key is non-string or the structure needs `.get`/`.has` semantics.
- Show the trap and the rewrite as a `<CodeVariants>` with two tabs: "Quadratic" and "Linear".

**Component:** One short fenced `.ts` block for the sum example, then one `<CodeVariants>` block (two tabs) for the reduce-to-object trap and the `Object.fromEntries` rewrite.

**Pedagogical reasoning:** `.reduce` is the method juniors most reach for *because* they don't see the alternatives. The "always pass the initial value" rule and the "prefer `.some`/`.every`/`.find` when they fit" rule are the highest-leverage instructions in this section. The reduce-to-object trap earns its own variant block because students who *do* internalize `.reduce` then write the quadratic form and silently degrade. The fix is one line; showing it adjacent makes the senior form obvious.

---

### Section 6 — Search and test: `.find`, `.some`, `.every`

**h2:** `Search and test: short-circuit by design`

**Content:** group the six short-circuit methods.

- **`.find(predicate)`** — returns the first matching element or `undefined`. The senior reach for "the row with this id." Under TS, the return type is `T | undefined`; treat the miss the same way `arr[0]` is treated under `noUncheckedIndexedAccess` (recall via `<Term>` in one inline ref). Note: `.find` accepts the same type-predicate shape as `.filter`, so `arr.find((x): x is Invoice => x.id === target)` returns `Invoice | undefined` instead of the union.
- **`.findIndex(predicate)`** — returns the index or `-1`. The reach when the *position* matters (for slicing, for paired updates with `.with(i, ...)` from L2).
- **`.findLast` and `.findLastIndex`** (ES2023, baseline-widely-available since Feb 2025 — Node 20+, every current browser) — walk from the end. The reach for "most recent event matching X" without a `.reverse()` first.
- **`.some(predicate)`** — short-circuits to `true` on the first match. The senior reach over `arr.filter(fn).length > 0`; reads as the question.
- **`.every(predicate)`** — short-circuits to `false` on the first miss. The senior reach for invariants ("are all invoices paid?").
- One sentence on `.indexOf(value)` and `.includes(value)` — both work on primitive arrays and short lists. `.includes` is the modern form for "is this value in this small primitive array?" For non-primitive or large data, the right reach is a `Set` (forward link to L4 in one sentence).

**Component:** One fenced `.ts` block (8-10 lines) showing `.find`, `.findLast`, `.some`, and `.every` on the running `invoices` array — four small expressions, one block.

**Pedagogical reasoning:** all six short-circuit methods share the same mental model (walk until the answer is known) and earn one combined section. The single most-skipped beat in junior code is `.some` — students reach for `.filter().length > 0` because they don't know `.some` exists. Naming the contrast explicitly is the win.

---

### Section 7 — Side effect: `.forEach` is almost never the right reach

**h2:** `.forEach is almost never the right reach`

**Content:**

- **`.forEach((item) => { ... })`** — iterates purely for side effects. Returns `undefined`. Named once.
- The senior almost-never uses it because `for...of` (next section) reads better, supports `break`/`continue`/`return` inside the body, and *works with `await`* (the killer feature `.forEach` lacks).
- One narrow case it earns: a short side-effecting callback at the end of a chain where the readability of the chain matters and async/control-flow isn't in play (`results.forEach((r) => console.log(r))` as the simplest example).
- **The async footgun (named loudly):** `.forEach(async (item) => { await ... })` does *not* sequence the awaits — `.forEach` ignores the returned promises. The callbacks all start in parallel, and the outer code continues before any of them finish. If sequenced async work is the goal, `for...of` with `await` inside the body is the form. One short snippet showing the wrong reach + a one-line label, no full rewrite (the `for...of` rewrite lands in the next section).

**Component:** One short fenced `.ts` block (4-5 lines) showing the `.forEach(async ...)` footgun with a `// runs in parallel, outer code continues immediately` comment.

**Pedagogical reasoning:** `.forEach` is the method seniors *unlearn*, not the one they learn. The whole section is a "don't, and here's why" beat. The async footgun is the load-bearing reason — naming it explicitly inoculates students against the bug that catches every junior writing their first async list operation.

---

### Section 8 — The four triggers for `for...of`

**h2:** `When to drop into for...of`

**Content (the lesson's second spine):**

State the four triggers that flip the choice away from a method chain. Each one earns one tight bullet with a one-line "why" or a one-line snippet showing the trigger.

1. **Async work that needs sequencing.** `.map(async ...)` returns an array of promises and runs in parallel. `for (const item of items) { await fetch(...) }` is the form that awaits one before starting the next. Forward link to Ch 007 L3 (`Promise.all` for *deliberate* parallel fan-out) in one sentence.
2. **Early termination (`break`, `return`).** Array methods (other than the search/test family) walk the whole array. `for...of` can `break` out the moment the condition fires. Useful for "find a thing, then stop" patterns where the work per item is heavy.
3. **Multiple statements per iteration.** A chain of three or four statements per element reads as a `for...of` body; the same stuffed into a `.forEach` callback feels cramped and hides the control flow.
4. **Need both index and value.** `arr.entries()` yields `[index, value]` pairs to `for...of`: `for (const [i, item] of arr.entries()) { ... }`. The senior reach when both are needed at once. (`.map((item, i) => ...)` is fine when the index is just passed to the transform; `.entries()` shines when the loop body needs both.)

**Component:** A small `<CodeVariants>` block (two tabs) on the *async sequencing* trigger — the most concrete and most-bitten:
- **Tab 1 — Parallel by accident:** `await Promise.all(items.map(async (i) => fetch(...)))` (works, runs in parallel — name it as the right tool when parallel is wanted) and the `items.forEach(async ...)` variant (broken — fires and forgets).
- **Tab 2 — Sequenced with `for...of`:** `for (const i of items) { await fetch(...); }` — one at a time, the next request waits for the previous to land.

**Pedagogical reasoning:** the chapter outline names these four triggers explicitly and asks for them in a "tight list." The list format respects the "trigger before tool" filter — students who memorize the list can apply it on sight. The async sequencing trigger gets the snippet because it's the one bug class students *will* hit in week one of writing real code.

---

### Section 9 — The chain-readability rule and the drop-into-Map foreshadow

**h2:** `Two senior habits: name the intermediate, and reach for Set`

**Content:** two short subsections (h3) rather than two full sections — both are habit-shaped, both are short.

#### h3: `Name the intermediate`

- Two or three chained methods read clearly. Four-plus often hide what's happening.
- The senior reach when the chain gets long: pull intermediates into named `const`s with intent-bearing names — `const overdueInvoices = invoices.filter(isOverdue); const overdueTotals = overdueInvoices.map((i) => i.amountCents);` — instead of a long fluent line.
- The principle stated explicitly: *naming the intermediate is often the lesson, not the chain*. A four-link `.filter().map().filter().reduce()` collapsed to two named `const`s and one `.reduce` reads in one pass.
- One `<CodeVariants>` block (two tabs) — **Tab 1 — Fluent chain (hard to scan)** with the four-link chain; **Tab 2 — Named intermediates** with the same operation split.

#### h3: `Drop into a Set when the inner check is membership`

- A `.filter(x => other.includes(x.id))` over a 10k-row `arr` and a 200-id `other` is `O(n × m)` — 2,000,000 comparisons. The senior reflex: build a `Set` of IDs once (`const otherIds = new Set(other.map((o) => o.id));`), then `arr.filter((x) => otherIds.has(x.id))` — `O(n + m)`.
- One short snippet showing the rewrite.
- Forward link to L4 in one sentence: the *why* of `Set`, plus the rest of the `Set`/`Map` surface, is L4's job.

**Pedagogical reasoning:** the chain-readability rule is the most subjective beat in the lesson and the easiest to under-teach. Stating "name the intermediate is often the lesson" gives the student a concrete refactor rule, not a vibes-based hint. The `Set` foreshadow earns its place here because the trigger (`.includes` inside `.filter`) is *only* recognizable through the method-chain lens — the student needs to see it in this lesson, even if the resolution lands in L4.

---

### Section 10 — Where this lands later

**h2:** `Where this lands later`

**Content:** three or four one-sentence forward links per the chapter outline.

- React list rendering with `items.map((item) => <Row key={item.id} ... />)` (Unit 3 / Ch 022) — every list in the course's UI uses `.map` plus a stable `key` from the item's id.
- TanStack Query's result shape (`data?.map(...)`, `data?.filter(...)`) (Unit 15) — the `data` returned from a query is the array this surface operates on, with `?.` for the loading case.
- Drizzle result-set transforms (Unit 5) — `select` queries hand back `T[]`; massaging the rows before the response uses this lesson's methods and L2's non-mutating updates.
- The `Set`/`Map` surface and `Map.groupBy` land next lesson; the lazy `Iterator.prototype` helpers two lessons out.

Format as a small bulleted list. No code samples.

**Pedagogical reasoning:** chapter framing demands soft forward links. Each named once anchors the surface to a *real* place the student will use it.

---

### Section 11 — Type-predicate exercise

**h2:** `Narrow the array with a type predicate`

A `<TypeCoding>` exercise on the `.filter` narrowing surface — the load-bearing TS interaction with this surface, isolated into a single drill. The exercise has two `^?` query targets so the student must understand the *difference* between the truthiness footgun and the inferring-predicate form.

**Setup:**

- **`instructions`:** "Two `.filter`s, two different inferred types. Rewrite the bottom filter so `presentIds` is `string[]`, not `(string | null)[]`. (Hint: TS 5.5+ infers a type predicate from a simple non-null check, but not from `Boolean`.)"
- **`starter`:**
  ```ts
  const rawIds: (string | null)[] = ['inv_1', null, 'inv_2', null, 'inv_3'];

  const truthyIds = rawIds.filter(Boolean);
  //    ^?

  const presentIds = rawIds.filter(Boolean);
  //    ^?
  ```
- **`expectedQueries`:**
  - `{ line: 3, contains: '(string | null)[]' }` — the truthiness check does *not* narrow; the student should leave this line as a witness to the footgun.
  - `{ line: 6, contains: 'string[]' }` — the student rewrites the bottom `.filter` callback to a form that *does* narrow. The expected fix is `rawIds.filter((x) => x !== null)` (or any equivalent shape that TS 5.5+ infers).
- The auto-added "Fix all errors" criterion is not active (explicit `expectedQueries` are set), and the starter has no errors — the failure is *the inferred type isn't what we want*. Both `^?` query rows are the success signals.

**Pedagogical reasoning:** the type-predicate point is the one type-shape decision in this whole surface, and the student needs to *write* it to internalize it. The two-target form is deliberate — by leaving the `.filter(Boolean)` line as a no-narrow witness above the fixed line, the student sees the contrast in their own editor. `<TypeCoding>` is the right vehicle because the entire lesson is "make the inferred type narrow" — no runtime involved.

---

### Section 12 — Code-review exercise (closing)

**h2:** `Refactor a tangled chain`

Per the chapter outline: a `<CodeReview>` exercise on a fifteen-line function that combines a misapplied `.forEach(async ...)` (broken sequencing) and a four-link transform chain (poorly readable, the wrong fit for the operation). The student flags both as PR comments; the AI grader scores against named `kernel`s.

**Setup:**

- **`instructions`:** "Review this PR for a teammate. The function is supposed to fetch a status for each overdue invoice, sequence the requests so we don't hammer the API, and return the count of those that need a reminder."
- **`<ReviewFile name="...">`** — one file (`src/invoices/process.ts`), 15-18 lines. Sketch shape (the writer will refine line numbers and exact lines):
  ```ts
  type Invoice = { id: string; amountCents: number; status: 'paid' | 'pending' | 'overdue'; customerId: string };

  export const processOverdue = async (invoices: Invoice[]): Promise<number> => {
    let count = 0;
    invoices
      .filter((i) => i.status === 'overdue')
      .map((i) => ({ ...i, key: i.id }))
      .filter((i) => i.amountCents > 0)
      .forEach(async (i) => {
        const res = await fetch(`/api/customers/${i.customerId}/status`);
        const { needsReminder } = await res.json();
        if (needsReminder) count += 1;
      });
    return count;
  };
  ```
- **`<ReviewIssue>` plants (two):**
  1. **`file="src/invoices/process.ts" line=<forEach line>` `kernel="\`.forEach(async ...)\` doesn't await — the callbacks fire in parallel and \`processOverdue\` returns 0 before any of them complete; use \`for...of\` with \`await\` for sequenced work"`** — the load-bearing async footgun.
  2. **`file="src/invoices/process.ts" line=<middle of chain>` `kernel="four-link chain hides intent — name the intermediate (\`overdueInvoices = invoices.filter(isOverdue)\`) and drop the no-op \`.map\` that only adds a \`key\` field"`** — the chain-readability bug plus a dead transform.
- **`<ReviewWhy>`:** "The pattern to spot is the *combination* — a fluent chain that ends in an async `.forEach`. Both halves of the bug come from the same instinct ('I know `.map`/`.filter`/`.forEach`, so I'll use them for everything'). The senior reflex is to recognize when `for...of` is the right tool for sequencing and when naming the intermediate is the right tool for readability."

**Pedagogical reasoning:** the chapter outline explicitly calls for a `<CodeReview>` exercise on this surface, and the *combination* of bugs in one function is the lesson's payoff — both directions of "wrong reach" the introduction flagged, surfaced together for the student to identify. `CodeReview` over `ScriptCoding` because the rewrite would be too prescriptive (multiple senior fixes are valid); the spotting is the senior skill.

**Note for the writer:** count rendered lines carefully for the `line` props (`ReviewFile` lines include `ins=`/`del=` markers). The two plants should be on the `.forEach` line and one of the chain lines — author may add a third plant on the no-op `.map((i) => ({ ...i, key: i.id }))` if a third spotting target reads naturally.

---

### Section 13 — External resources

**h2:** `Further reading`

Small `<CardGrid>` with 3 `<ExternalResource>` cards. Keep tight.

- MDN — `Array.prototype.flatMap` (the under-known transform).
- MDN — `Array.prototype.reduce` (with the long-form callback signature reference).
- TypeScript 5.5 release notes — "Inferred Type Predicates" (the modern narrowing surface for `.filter`).

No video — surface is enumerated, the central beat is a method-choice decision tree. (Matches L1 and L2's calls.)

---

## Scope

### What this lesson teaches

The eight array methods grouped by output shape (transform: `.map`/`.flatMap`; subset: `.filter`; fold: `.reduce`; search/test: `.find`/`.findIndex`/`.findLast`/`.findLastIndex`/`.some`/`.every`; side effect: `.forEach`), the `.filter` narrowing surface — including TS 5.5+'s inferred type predicates as the daily reach, the explicit `(x): x is T => ...` form as the conditional, the `isPresent` reusable helper, and the `.filter(Boolean)` no-narrow footgun — the `.reduce`-to-object O(n²) trap and its `Object.fromEntries` linear rewrite, the four `for...of` triggers (async sequencing, early termination, multi-statement bodies, index-plus-value via `.entries()`), the chain-readability rule (two-three chained methods OK; four-plus → name the intermediate), and the foreshadow that membership-inside-`.filter` should drop to a `Set`.

### What this lesson does NOT teach (handled elsewhere)

- **`Set`, `Map`, and the full set-algebra / Map-API surface** — Ch 003 L4. The `Set`-for-membership foreshadow appears in Section 9 in one snippet and one sentence; the *why* and the rest of the surface is L4.
- **The iteration protocol (`Symbol.iterator`, `.next()`, what makes something iterable), `for...in` (banned), and the lazy `Iterator.prototype` helpers (ES2025)** — Ch 003 L5. `for...of` syntax appears here as the conditional reach with four triggers; the underlying protocol is L5.
- **`for await...of` and async iteration over streams / paginated APIs** — Ch 007 L3.
- **`Promise.all` and deliberate parallel fan-out** — Ch 007 L3. Named in Section 8 in one sentence (`Promise.all(items.map(async ...))` shown in the `CodeVariants` tab as the "right tool when parallel is wanted").
- **User-defined type guards beyond `.filter` predicates** — Ch 005 L3. The `is T` shape is introduced here at the call site; deep treatment (guards on arbitrary types, narrowing patterns beyond arrays) is Ch 005.
- **React `useState<T[]>` mechanics** — Unit 3 / Ch 023. List rendering with `key` is forward-linked.
- **TanStack Query result shape** — Unit 15. Forward-link only.
- **Drizzle result-set shapes** — Unit 5. Forward-link only.
- **`.concat`, `.join`, `.split`, `.indexOf`** — these still exist but aren't on the daily senior path. `.includes` named once in Section 6; the rest mentioned only as "spread / template literals / `Set.has` retire them" if at all.
- **Imperative `.push`-inside-`.forEach` accumulation** — explicit anti-pattern in 2026; not taught.

### Prerequisite recalls (one sentence each, no re-derivation)

- `noUncheckedIndexedAccess` is on; `arr[i]` is `T | undefined` (Ch 024 L4 pin, defined Ch 003 L1, reused L2).
- The four ES2023 non-mutating array methods (`.toSorted`, `.toReversed`, `.toSpliced`, `.with`) from L2 — every method in this lesson is also non-mutating (returns a new array or a derived value).
- `.at(-1)` for negative-index positional access (L2).
- Spread is shallow (Ch 001 L1, recalled L2).
- `const fn = (...) => ...` arrow form (Ch 002 L1).
- `??` returns the right-hand side only on `null`/`undefined` (Ch 002 L5).
- `Object.fromEntries` for `[key, value]`-pair-to-object conversion (Ch 003 L1).

---

## Code conventions alignment

All snippets:
- `.ts`, single quotes, 2-space indent, semicolons on.
- `const fn = (...) => ...` arrow form for all callbacks and named functions.
- Inference-led — annotate only when the snippet's point is the type shape (Section 4's `isPresent` helper uses an explicit `is T` return because that's the lesson; the `<T,>` generic syntax is the standard form for arrow-bound generic helpers under `.tsx`-friendly parsing).
- Semantic domain names: `invoices`, `invoice`, `amountCents`, `status`, `id`, `customerId`. Continue the chapter seed.
- No `any`, no `enum`, no `interface`.
- Money in integer cents (Ch 001 L3).
- Predicate booleans read as predicates: `isPresent`, `isOverdue`, `needsReminder` (matches the conventions doc's predicate-naming rule).
- The closing `CodeReview` file follows production shape: arrow-bound exported function with annotated parameter and return type (`(invoices: Invoice[]): Promise<number>`), `type` alias for the row shape, named export.

**Deliberate divergence from production-grade conventions for pedagogy:**
- Section 6's combined `.find`/`.findLast`/`.some`/`.every` snippet stuffs four small expressions into one block for surface density. In production code, each expression would live where its consumer lives.
- The `.forEach(async ...)` footgun snippet in Section 7 is *deliberately wrong* — it exists to be flagged, not copied. One inline comment names it as the bug shape.
- The `<CodeReview>` exercise function (Section 12) is deliberately *fifteen lines of bad code* — both bugs and the no-op `.map` are pedagogical plants, not production-shaped code the student should imitate. The `<ReviewWhy>` text frames it as such.

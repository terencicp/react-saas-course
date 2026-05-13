# Chapter 2.3 — Objects, arrays, and collections

## Chapter framing

Chapter 2.1 installed the values-and-references mental model. Chapter 2.2 taught the function — the unit a senior reaches for to name an operation. This chapter teaches the shapes those functions operate on: the object, the array, and the collection types that supersede them when the access pattern earns it. Every SaaS handler in the rest of the course consumes one of these shapes — a row from Drizzle (object), a list of invoices (array), a deduplication of tag IDs (Set), a memoization keyed by user (WeakMap), an `Object.entries` walk over form data, a `regex.exec` against a webhook signature. The chapter is where the student learns to pick the right shape and the right method for each access pattern.

The senior framing for the chapter: **the right collection makes the right method obvious.** A `Map` for keyed lookups makes `.get()` and `.has()` the natural reach; an array for ordered traversal makes `.map()` and `.filter()` the natural reach; an iterator from `Object.entries()` chained through `Iterator.prototype.filter` makes the lazy path the natural reach. The chapter teaches the trigger for each container and the method surface that matches it, so the student stops reaching for `Object.keys(obj).map(k => obj[k])` when `Object.values(obj)` exists, and stops materializing intermediate arrays when an iterator-helper chain would do.

Threads that must run through every lesson:

- **The 2026 standard library is the default surface.** ES2025 / ES2026 ships in Node 24+ unflagged: the Set composition methods (`intersection`, `union`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`), the iterator helpers on `Iterator.prototype` (`.map`, `.filter`, `.take`, `.drop`, `.flatMap`, `.toArray`, `.reduce`, `.forEach`, `.some`, `.every`, `.find`), `Object.groupBy` and `Map.groupBy`, `Array.prototype.at`, `String.prototype.replaceAll`, the RegExp `v` flag. Lodash is never named — the kill-shot is `Set.prototype.intersection` and `Iterator.prototype.filter`, and the student needs to see them as the first reach.
- **Container choice is a decision before syntax.** Each lesson on a non-array container (Set, Map, WeakMap, WeakSet) opens with the trigger that earns it — the failure mode a plain object or a plain array would produce. The student leaves with a checklist: "are the keys non-strings or do I need iteration order? Map. Am I deduping primitives? Set. Am I memoizing keyed by an object that should be GC'd with its key? WeakMap." The mechanics follow the trigger.
- **Immutability by convention, mutation only when the algorithm demands it.** The array-method surface foregrounds the non-mutating methods (`.map`, `.filter`, `.slice`, `.concat`, `.toSorted`, `.toReversed`, `.toSpliced`, `.with`). The mutating methods (`.push`, `.pop`, `.sort`, `.reverse`, `.splice`) are named with the senior watch-out — the original is gone after the call, and React state must not be mutated. The ES2023 `toSorted` / `toReversed` / `toSpliced` / `with` family is the senior reach in 2026 because they return new arrays and integrate cleanly with React state and Server Action returns.
- **Lazy over eager when the chain is long.** Iterator helpers materialize one value at a time; the array methods materialize a full array per step. For a chain of three or more transforms on a large input — a paginated cursor walk, a CSV stream, an `Object.entries` iteration over a wide row — the iterator-helper form ships less garbage and reads as well. The student sees the trigger and writes the lazy form when it fits.
- **Types travel with the structure.** Every snippet types the collection at construction (`new Map<UserId, Invoice>()`, `new Set<string>()`, `{ status: 'paid' | 'open' } satisfies Invoice`). Type narrowing on `.find` (returns `T | undefined`), on indexed access (`users[0]` is `User | undefined` under `noUncheckedIndexedAccess`), and on the iterator-helper return types is named at the call site so the student sees the TS surface where it bites.
- **Naming for intent is the discipline operating.** The chapter writes `invoicesById: Map<InvoiceId, Invoice>` (the 2.2.3 reflex on container choice meeting the 2.2.3 reflex on naming). The student sees the discipline in every snippet.

This chapter ships small standalone snippets in TypeScript, no application code. Live coding components (`ScriptCoding`, `TypeCoding`) carry the practice. The student finishes the chapter able to pick the right container for an access pattern, write the right method chain over it, and recognize when an iterator helper or a `groupBy` makes the call shorter and more honest.

The chapter ordering reflects dependencies. Objects come first because every later lesson references them — arrays are objects, Maps are object-like, iterator results are objects. Arrays come second as the dominant collection in SaaS code. The array methods get their own lesson because the surface is large and the senior reach (non-mutating, the iterator-helper chain) is a discipline worth its own lesson. Set and Map come fourth — the trigger only earns its weight after the student knows what a plain object and a plain array can't do. Iteration and iterator helpers come fifth because they apply to all the previous containers and explain how the methods compose. Regex closes the chapter because it's a self-contained surface that the previous string lessons (2.1.4 / 2.1.5) deferred, and it shares the "modern flavor" framing the chapter has been operating in.

---

## Lesson 2.3.1 — Objects: access, construction, and the static `Object.*` helpers

Topics to cover:

- The senior question: when the input is a record-shaped value (form data, a parsed JSON body, a Drizzle row), what's the surface a 2026 SaaS engineer reaches for to read, build, and transform it. The lesson opens on the object as the workhorse shape and names the four access patterns: property access, computed-key access, spread for construction and update, and the `Object.keys` / `values` / `entries` / `fromEntries` family for iteration and reshaping.
- Property access mechanics. Dot access (`invoice.status`) for known statically-typed keys; bracket access (`invoice['status']`, `invoice[key]`) when the key is a variable or is not a valid identifier. The senior reflex: dot for literals, bracket for dynamic keys; never bracket on a known literal because dot is shorter and the IDE autocompletes it. TypeScript's behavior on each form named: dot access narrows through the type; bracket access with a `string` variable widens to `T[string]` unless the variable is a literal-union (`'status' | 'amount'`).
- Construction syntax — the three sugars 2026 SaaS code uses by reflex:
  - **Property shorthand** — `{ orgId, customerId }` instead of `{ orgId: orgId, customerId: customerId }`. The dominant form when the local binding name matches the property name; reaches its full weight in destructure-then-rebuild patterns from 2.2.6.
  - **Computed keys** — `{ [`${prefix}_total`]: amount }` for dynamically-named properties. The senior triggers: building i18n message maps, aggregating by a category extracted from runtime data, prefix-namespacing keys. Watch-out: a computed key with an expression that throws on `undefined` produces a confusing runtime trace; in 2026 SaaS code the alternative is usually a `Map`, which is the next lesson's lead.
  - **Spread in object literals** — `{ ...invoice, status: 'paid' }`. The non-mutating update form, used in React state updates, Drizzle update objects, and any "return a modified copy" pattern. The senior watch-out: spread is shallow (the 2.1.1 mental model fires here) — nested objects are still shared references. The override order matters — later properties win, which is the idiom for partial updates (`{ ...defaults, ...overrides }`).
- The `Object.*` static surface, named with the trigger for each:
  - **`Object.keys(obj)`** — own enumerable string keys as an array. The senior trigger: iterating the field names of a record. TypeScript watch-out: the return type is `string[]`, not `(keyof T)[]` — the language can't promise the runtime object doesn't have extra keys, so the cast to `keyof T` is sometimes earned (one line of `as (keyof T)[]` named with the caveat that it's a promise the developer is making).
  - **`Object.values(obj)`** — own enumerable values as an array. The senior trigger: summing or aggregating values when the keys don't matter. Replaces the `Object.keys(obj).map(k => obj[k])` pattern.
  - **`Object.entries(obj)`** — `[key, value]` tuples as an array. The senior trigger: mapping a record to a new shape or iterating key-and-value together. The iterator-helper combo (`Object.entries(row).map(([k, v]) => ...)` or the lazy form in 2.3.5) is the dominant transform shape.
  - **`Object.fromEntries(iter)`** — the inverse of `entries`. The senior trigger: building an object from a transformed iterator (a filtered, mapped, or grouped sequence of pairs). Paired with `Object.entries` it forms the standard "object-to-object map" pipeline: `Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, transform(v)]))`. Also the reach for `URLSearchParams` (`Object.fromEntries(searchParams)`) and `FormData` (`Object.fromEntries(formData)`) conversion at the boundary.
  - **`Object.assign(target, ...sources)`** — named once and dismissed. Spread superseded it for all the cases that matter; `Object.assign` survives for the rare "mutate `target` in place" use that the course almost never writes.
  - **`Object.groupBy(items, keyFn)`** (ES2024, Node 22+) — partition an array into a record keyed by a derived value. The senior trigger: bucketing invoices by status, grouping users by role, partitioning rows for a UI table. The keys of the result are strings (the `keyFn`'s return is coerced to a string property name). When the key needs to be a non-string, the reach is `Map.groupBy` (named in 2.3.4).
- The "object as record" vs. "object as map" distinction. Plain objects with string keys are fine for finite, statically-known shapes (a config, an enum-like record, a request body). When the keys are dynamic, the count is unbounded, or the order matters, the reach is `Map` (the trigger named here, the mechanics in 2.3.4). The senior watch-out: a plain object inherits from `Object.prototype`, so `obj.hasOwnProperty` exists by default — using an object as a dynamic key/value store opens the prototype-pollution surface. The 2026 reflex when keys come from untrusted input is `Map` or `Object.create(null)`; the latter is named once.
- One forward reference. Drizzle row objects (Unit 6.3) are the dominant object shape the student manipulates in production code; the transforms here — spread for update, `Object.entries` for mapping to a new shape, `Object.fromEntries` for building an object from a transformed iterator — are exactly the moves a row-to-API serializer makes. The patterns land now so they're reflex when the Drizzle lessons land.

What this lesson does not cover:

- Destructuring (2.2.6 owns it).
- Property descriptors, `Object.defineProperty`, getters/setters — out of scope for 2026 SaaS work.
- `Object.freeze` in depth (2.1.1 named it once).
- Map / Set / WeakMap / WeakSet (2.3.4).
- `for...in` (named once in 2.2.4 and dismissed; this lesson does not revisit it).
- JSON serialization edge cases (2.9.1 owns them).

Pedagogical approach:

Mechanics archetype with a Reference middle. Open with the senior question — "what's the surface to read, build, and transform a record-shaped value?" — and a single `ScriptCoding` block where the student takes an `invoice` object and performs three operations: read a property by bracket access with a dynamic key, build a "paid" version with spread, and round-trip it through `Object.entries` → `.map` → `Object.fromEntries` to normalize all string values to lowercase. The student writes the workhorse moves of the lesson in one block. Then a `CodeVariants` showing the three construction sugars side by side — shorthand, computed key, spread — each with a single-sentence senior trigger. The `Object.*` surface walks as a tight reference block (no tabs, just prose with one-line code samples) because surveying tab-by-tab would inflate the lesson and the API is genuinely small. `Object.groupBy` gets its own `ScriptCoding`: the student writes `Object.groupBy(invoices, (i) => i.status)` against a six-row test dataset, sees the bucketed result, and feels the call that replaces a hand-written `reduce`. Close with a `PredictOutput` exercise on four `Object.entries` / `fromEntries` round-trips — the student predicts whether the round-trip preserves the input (it does for own enumerable string-keyed properties; it doesn't for symbol keys, prototype properties, or non-enumerable ones — though the last two are out of scope). Optional `SandboxCallout` with a seeded `invoice` for free play.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.3.2 — Arrays: indexing, length, and the immutable update reflex

Topics to cover:

- The senior question: when the input is an ordered list, what does a senior 2026 SaaS engineer reach for to read, slice, and update it. The answer in this lesson is the indexing surface and the construction-and-update primitives; the iteration methods (`.map`, `.filter`, `.reduce`, etc.) earn their own lesson (2.3.3). The frame: arrays are the dominant collection in SaaS code (Drizzle result sets, React lists, form line-items), and the senior reaches for non-mutating updates by reflex because every consumer downstream — React, Server Action returns, Zod schemas, Drizzle inputs — expects a fresh array.
- Index access mechanics. `users[0]` for positional access. Under `noUncheckedIndexedAccess` (wired in 1.4.3 and now operational), the return type is `User | undefined` — TypeScript admits the runtime truth that an index might be out of bounds. The senior reflex: `?.` after the index access (`users[0]?.name`), or a guard, or `.at()` when the position is symbolic.
- **`.at()`** as the modern indexing call. `users.at(0)` is `users[0]`; `users.at(-1)` is the last element. The senior trigger: any access by a position counted from the end (the last element, the second-to-last). Replaces the `users[users.length - 1]` idiom. Returns `T | undefined` like indexed access. Available unflagged everywhere in 2026.
- The `length` property — read and write. Reading is the array's element count. Writing is the truncation hack: `arr.length = 0` empties the array in place; `arr.length = 3` truncates to three elements. The senior call: don't write `length`. The non-mutating equivalents (`.slice(0, 3)`, `[]`) are clearer and the truncation idiom is a code smell in modern code.
- Array construction:
  - **Literal**: `[a, b, c]`. The default.
  - **Spread**: `[...users, newUser]` for append, `[newUser, ...users]` for prepend, `[...firstHalf, ...secondHalf]` for concat. Used heavily — the non-mutating add. Watch-out: spread on a large array is O(n) per call; for tight loops the senior may reach for `.push` on a local mutable accumulator that gets returned as a fresh array — but in application code the spread form is the default.
  - **`Array.from(iter, mapFn?)`** — convert any iterable into an array, with an optional mapping function. The senior triggers: materializing a `Set` (`Array.from(new Set(users))` for deduped output, or now `[...new Set(users)]`), iterating a NodeList from the DOM (Unit 3), building an array of size N (`Array.from({ length: 10 }, (_, i) => i)`).
  - **`Array.of(...items)`** — named once and dismissed. Exists to disambiguate `new Array(3)` (which constructs a length-3 sparse array) from `new Array(1, 2, 3)`. The senior code never writes `new Array`; literals win.
  - **`new Array(n).fill(initial)`** — named once for the dense-array initialization pattern. `Array.from({ length: n }, ...)` is the alternative; both are fine.
- The non-mutating update family — the senior default in 2026:
  - **`.slice(start?, end?)`** — returns a shallow copy of a range. The "copy the array" idiom is `arr.slice()`; the senior reflex when a function might mutate the input is `.slice()` at the top.
  - **`.concat(...others)`** — returns a new array with the others concatenated. The senior code prefers spread (`[...a, ...b]`) for legibility; `.concat` survives in code that predates the rest/spread era.
  - **`.toSorted(compareFn?)`** (ES2023) — sorted copy. The senior reach over `.sort()`. The comparator returns negative / zero / positive, same as `.sort`; the watch-out is that the default comparator coerces to string (`[10, 2, 1].toSorted()` is `[1, 10, 2]`), so any non-string sort needs an explicit comparator (`(a, b) => a - b` for numbers, locale-aware for strings).
  - **`.toReversed()`** (ES2023) — reversed copy.
  - **`.toSpliced(start, deleteCount?, ...items)`** (ES2023) — the non-mutating `.splice`. Returns a new array with the elements removed and/or inserted. Used heavily in React state updates over arrays — remove an item by index, insert an item at a position, replace a range.
  - **`.with(index, value)`** (ES2023) — returns a new array with the index replaced. The senior reach for "update item at index i" in React state. Replaces the `[...arr.slice(0, i), newValue, ...arr.slice(i + 1)]` idiom.
- The mutating family, named with the senior watch-out:
  - **`.push`, `.pop`, `.unshift`, `.shift`** — mutate in place, return the new length or the removed element. Fine in local algorithms where the array is a scratch accumulator; never on a value coming from outside the function unless the function's contract names the mutation.
  - **`.sort(compareFn?)`** — in-place sort. The watch-out about string coercion fires here too. Almost always wrong in 2026 SaaS code; `.toSorted` is the senior reach.
  - **`.reverse()`** — in-place reverse. Same call; `.toReversed` is the senior reach.
  - **`.splice(start, deleteCount?, ...items)`** — in-place remove/insert. `.toSpliced` is the senior reach.
  - **`.fill`, `.copyWithin`** — named once; rarely the senior's first reach.
- React-state and Server-Action context, one paragraph. State setters require a new array reference — mutating in place doesn't trigger a re-render. Server-Action returns get serialized across the boundary; mutation in place inside an action doesn't affect the caller's array either way, but the discipline is uniform: return new arrays, mutate locals. The student sees the rule named at the call site here and meets it again in 4.8 and 7.2.
- TypeScript on arrays. `User[]` and `Array<User>` are equivalent — the course writes `User[]` for primitives and short types, `Array<{ ... }>` when the element type is a complex inline shape. `readonly User[]` (or `ReadonlyArray<User>`) prevents mutation at the type level — the senior trigger is function parameters that promise "I won't mutate this." Tuples (`[string, number]`) are typed at construction with `as const` or with an explicit annotation; the full tuple treatment is 2.4.4.

What this lesson does not cover:

- Array iteration methods (`.map`, `.filter`, `.reduce`, `.find`, etc.) — 2.3.3 owns them.
- Iterator helpers (`Iterator.prototype.*`) — 2.3.5.
- Destructuring on arrays (covered in 2.2.6).
- `flat` and `flatMap` — named in 2.3.3 with the iteration surface, not here.
- Typed arrays (`Uint8Array`, `Float32Array`) — surfaced in Unit 3 with binary data.
- `Array.isArray` — named here in one line if needed; the test is the senior tool when narrowing `unknown` to an array (2.4.7 and 2.8.2 use it).

Pedagogical approach:

Mechanics archetype with a Pattern beat for the immutable-update reflex. Open with the `noUncheckedIndexedAccess` reality in a `TypeCoding` block — the student hovers `users[0]` and sees `User | undefined`, then writes the `?.` or `.at` fix. The TypeScript surface is the lesson's opening because in 2026 it's load-bearing. Then a `CodeVariants` block showing the non-mutating family side by side: `.slice`, `.concat`, `.toSorted`, `.toReversed`, `.toSpliced`, `.with` — each tab labeled with its trigger and its mutating counterpart. The visual sweep is the point. A `ScriptCoding` block walks the React-state context: the student is given a `setInvoices` and an `invoices` array, and must (a) add an invoice, (b) update the third invoice's status to `'paid'`, (c) sort by amount descending — each using the non-mutating form. The student writes the discipline by hand. Close with a `Buckets` exercise sorting twelve array operations into "mutates" / "returns new" — the reflex of recognizing which call is which is the lesson's deliverable. No sandbox.

Estimated student time: 30 to 40 minutes.

---

## Lesson 2.3.3 — The array method surface a senior reaches for

Topics to cover:

- The senior question: when do you reach for `.map` vs. `.flatMap` vs. `.reduce` vs. a `for...of` loop, and what bug class does each prevent or invite. The lesson walks the methods in order of how often a SaaS engineer reaches for them, with the senior trigger and the watch-out for each. The student leaves able to write the right method for each access pattern without a search engine.
- **`.map(fn)`** — transform each element. Returns a new array of the same length. The dominant transform in SaaS code: row-to-DTO mapping, invoice-to-line mapping, user-to-public-shape mapping. Senior watch-outs: the callback runs synchronously and serially — `.map(async fn)` returns an array of promises, not awaited results (the N+1 trap is 2.7.3 and `Promise.all` is the reach); `.map` is not for side effects (use `.forEach` or, more often, a `for...of` loop with the side effect explicit).
- **`.filter(predicate)`** — keep elements where the predicate returns truthy. Returns a new array. Type narrowing: a plain predicate doesn't narrow the element type, so `.filter((u) => u != null)` returns `(User | null)[]`. The senior reflex when the filter is a type narrower is a type predicate: `.filter((u): u is User => u != null)` narrows to `User[]`. The full type-predicate treatment is 2.4.7; this lesson names the form so the student writes the narrowing-aware version from the start.
- **`.reduce(fn, initial)`** — accumulate a single value across the array. The senior triggers: summing, building an object from a list (when `Object.fromEntries(entries)` doesn't fit), folding a sequence into a state. Watch-outs: providing the initial value is mandatory in 2026 SaaS code — the no-initial form uses the first element as the accumulator and the second as the first value, which is rarely what the caller wants and trips TS's inference; reducing into an object or array mutates the accumulator across iterations by reflex — the senior call is to write the accumulator as a spread (`{ ...acc, [key]: value }`) when the result is small, and to mutate-then-return when the accumulator is large and local to the reduce.
- **`.find(predicate)`** — first matching element, or `undefined`. Returns `T | undefined` by type (TS knows). The senior reflex: the result type forces the `?.` or guard at the call site, which is the bug class the type prevents.
- **`.findIndex(predicate)`** — first matching index, or `-1`. The senior watch-out: `-1` is the not-found sentinel, not `undefined`. Used for in-place updates by index (and immediately consumed by `.with` or `.toSpliced` from 2.3.2) and almost nothing else.
- **`.findLast(predicate)` / `.findLastIndex(predicate)`** (ES2023) — last matching, scanning from the end. The senior trigger: finding the last event in a chronological array, the most-recent matching row in a result set. Replaces the `.slice().reverse().find()` idiom.
- **`.some(predicate)` / `.every(predicate)`** — boolean tests across the array. The senior trigger: precondition checks (`if (lineItems.every(isValid)) ...`), state checks (`if (invoices.some(isOverdue)) ...`). Short-circuit on first match / first failure.
- **`.includes(value)`** — boolean test for a primitive value. Uses `SameValueZero` (the same algorithm `Set` and `Map` use, named in 2.3.4) — `NaN.includes(NaN)` is `true`, unlike `===`. The senior reflex: use `.includes` for primitives; for objects (where you'd be comparing by reference), reach for `.some` with an explicit predicate.
- **`.indexOf(value)` / `.lastIndexOf(value)`** — index or `-1`. Uses `===` (so `[NaN].indexOf(NaN)` is `-1`). The senior call: prefer `.includes` for "is it in there"; reach for `.indexOf` only when the index is needed.
- **`.flat(depth?)` / `.flatMap(fn)`** — flatten one level by default; `flatMap` is map-then-flat-one-level in one pass. The senior trigger for `.flatMap`: a transform where each input produces zero, one, or many outputs (expanding a row's line items, splitting an array of strings on commas and re-flattening, conditionally including or excluding an element by returning `[]` or `[value]`). Replaces the `.map(...).flat()` two-step.
- **`.join(separator)`** — array-to-string with separator. Trivial; named here because it's the canonical exit from an array surface back into a string. The senior watch-out: the default separator is `,`, which is almost never what the caller wants — pass an explicit separator every time.
- **`.forEach(fn)`** — side effects across the array, no return. The senior question: when does `.forEach` earn its weight over `for...of`. In 2026 SaaS code, `for...of` is the default for any side effect because (a) it allows `await` inside, (b) it allows `break` / `continue`, (c) it produces clearer stack traces. `.forEach` survives as a stylistic call when the body is one expression and async isn't in play; otherwise `for...of`.
- The "when to drop out of the chain" rule. A `.map(...).filter(...).map(...)` chain reads well for two or three steps; past that, the cognitive cost passes the savings, and the senior reach is a `for...of` loop or an iterator-helper chain (2.3.5). The chain also materializes an intermediate array at each step, which is the eager-vs-lazy trigger 2.3.5 makes operational. The rule the student takes away: chain when it reads, decompose when it doesn't.
- One forward reference. The N+1 trap inside `.map` with `async` callbacks (2.7.3) is the canonical bug a returning dev ships in production — named here in one line so the student knows the trap exists before they hit `await` inside `.map`.

What this lesson does not cover:

- The iteration protocol and iterator helpers (2.3.5).
- Async iteration patterns (2.7.3).
- Type predicates in depth (2.4.7).
- `reduce` for state machines (the small set of cases where reduce is the right reach, like Redux-style reducers) — out of scope; the course uses Zustand (Unit 16.3) not Redux.
- Performance benchmarks (allocations, V8 inlining) — out of scope; the senior rule is "chain when it reads, drop out when it doesn't," not micro-benchmarking.

Pedagogical approach:

Reference / survey archetype with one Pattern beat for the `.filter` type-predicate idiom. The lesson's challenge is breadth without inflation. Open with a one-paragraph senior frame on chains-vs-loops, then a tight reference walk through the methods in the order above — each gets one paragraph of senior trigger and watch-out, with a single inline code example. No tabs, no `CodeVariants` per method — surveying tab-by-tab would burn the student's attention on a surface they already partially know. The lesson's center of gravity is the Pattern beat for `.filter` narrowing: an `AnnotatedCode` block walks a `.filter((u) => u != null)` call, with annotations pointing at the residual `null` in the result type and the type-predicate fix (`(u): u is User => u != null`). The TS error is the payoff. A `ScriptCoding` block exercises `.flatMap` against a list-of-invoices-with-line-items dataset, where the student writes a one-line flatten that would otherwise need a `.map().flat()`. Close with a `MultipleChoice` exercise on five scenarios — "you have an array of orders, you want X" — and the student picks the right method for each. Optional `SandboxCallout` with the invoices dataset for free play. No mandatory sandbox.

Estimated student time: 40 to 50 minutes.

---

## Lesson 2.3.4 — Set, Map, WeakSet, WeakMap, and the modern Set methods

Topics to cover:

- The senior question: when does a `Set` or a `Map` earn its weight over a plain array or a plain object. The lesson opens on the triggers and works back to the mechanics, because the cost of picking the wrong container — using an array where a Set would O(n) → O(1) the lookup, using a plain object as a dynamic key store and inheriting prototype-pollution surface — is what the student needs to recognize on a code review.
- **`Set<T>`** — a deduplicated collection of values. The senior triggers: dedup (`new Set(userIds)` collapses duplicates), membership test (`tagSet.has(tag)` is O(1) vs. `array.includes(tag)` O(n)), composition (the new ES2025 methods, below). Construction: `new Set<UserId>()`, or `new Set(iterable)` to seed. Mutation: `.add(value)`, `.delete(value)`, `.clear()`. Iteration: insertion order, via `for...of`, spread, or the new iterator helpers.
- **`Set` equality semantics — `SameValueZero`.** The algorithm `.has`, `.add`, `.delete`, `Array.prototype.includes`, and `Map` keys use. Differs from `===` in one place — `NaN` is equal to `NaN` under SameValueZero (so a Set of numbers can dedupe `NaN`); differs from `Object.is` in another — `+0` and `-0` are equal under SameValueZero. The senior watch-out: object equality is still by reference — `new Set([{a: 1}, {a: 1}])` has two elements because the two literals are different objects (the 2.1.1 mental model fires here). When dedup-by-value of objects is needed, the reach is a Map keyed by a canonical string (`new Map(items.map(i => [JSON.stringify(i), i]))`) or a dedup-by-key pass (`Object.fromEntries(items.map(i => [i.id, i]))` followed by `Object.values`).
- **The ES2025 Set composition methods** (Node 22+, unflagged in 2026):
  - **`a.union(b)`** — values in either set. Returns a new Set.
  - **`a.intersection(b)`** — values in both. Returns a new Set.
  - **`a.difference(b)`** — values in `a` but not in `b`. Returns a new Set.
  - **`a.symmetricDifference(b)`** — values in exactly one. Returns a new Set.
  - **`a.isSubsetOf(b)`**, **`a.isSupersetOf(b)`**, **`a.isDisjointFrom(b)`** — booleans.
  
  These methods are the kill-shot for the `lodash`-style reach. The senior call now: any time the code wants "the tags this user has but the org doesn't permit" or "the line-item IDs in both submissions" or "is the user's role set a subset of the allowed roles" — the reach is the Set method, not a `.filter(... .includes ...)`. The "other" argument accepts any object that conforms to the SetLike interface (has `.size`, `.has`, `[Symbol.iterator]`), so a Map's keys collection and a custom set-like value also compose.

- **`Map<K, V>`** — a keyed collection with arbitrary key types. The senior triggers: non-string keys (object keys, number keys, branded ID keys), keyed lookup at scale (O(1) for `.get` and `.has` vs. an `Object.keys(record).find` O(n)), preservation of insertion order (the iteration order is insertion order — same as plain objects' string keys, but Maps make the guarantee explicit and extend it to non-string keys), and when keys come from untrusted input (avoids prototype pollution).
- `Map` mechanics: `new Map<UserId, Invoice>()`, `.get(key)` (returns `V | undefined`), `.has(key)`, `.set(key, value)`, `.delete(key)`, `.size`, `.clear()`. Iteration via `.keys()`, `.values()`, `.entries()` — all iterators, useful with the helpers from 2.3.5. The senior idiom for "build a Map from an array of objects by their id": `new Map(invoices.map((i) => [i.id, i]))` — the array is `[K, V]` tuples, the constructor consumes them.
- **`Map.groupBy(items, keyFn)`** (ES2024, Node 22+) — the Map equivalent of `Object.groupBy`. The keyFn's return is used as the Map key without coercion, so non-string and non-primitive keys work. The senior trigger: grouping by a branded ID, an object reference, or any non-string discriminator.
- **`WeakSet<object>` and `WeakMap<object, V>`** — collections that hold their members weakly, so the GC can reclaim them when no other reference exists. Keys must be objects (or symbols in ES2023+); values can be anything. Not iterable, no `.size`. The senior triggers, three named:
  - **Memoization keyed by an object** — `const cache = new WeakMap<RequestContext, Result>();` caches a derived result per request context; when the request finishes and the context is GC'd, the cache entry goes with it. No leak.
  - **Metadata on an object the metadata-holder doesn't own** — attaching "have we logged this user this session" to an external user object without mutating it.
  - **One-time visited-tracking on a graph traversal** — guard against cycles when walking a tree of objects.
  
  The course doesn't write WeakMaps and WeakSets often in application code (most caching is at higher levels — TanStack Query, Drizzle's query cache, React's render cache), but the student needs to recognize the pattern when they meet it in a library and the GC story when they design one.
- TypeScript on these collections. `Set<T>`, `Map<K, V>`, `WeakSet<object>`, `WeakMap<object, V>` are parameterized. The senior reflex: annotate the type parameters at construction (`new Set<UserId>()` is clearer than `new Set()` which infers `Set<unknown>`). For Map keys, branded types (2.5.5) pay off here — a `Map<UserId, Invoice>` and a `Map<OrgId, Invoice>` are different types, and a callsite that passes the wrong ID type fails at compile time.
- One forward reference. The Drizzle layer (Unit 6.3) returns arrays of rows. Building a Map keyed by id is the standard move when you need O(1) lookup by id during a render or a transform — the student sees the trigger here and the pattern lands in the Drizzle queries lesson.

What this lesson does not cover:

- The full iteration protocol (2.3.5).
- The TC39 "decorators on classes" surface or anything else from the class side (2.9.2 names classes lightly).
- TanStack Query's cache (Unit 16.1) — that's a different abstraction layered on top of these primitives.
- Concurrent maps, immutable persistent maps (Immer, Immutable.js) — not in the stack.

Pedagogical approach:

Decision archetype with a Mechanics body. Open with the senior question — "Set or array? Map or object?" — and answer with a two-by-two `TabbedContent`: "keyed lookup at scale" / "dedup or membership test" / "non-string keys" / "GC-coupled cache" each pointing at the container that earns the trigger. The student sees the decision tree as a single visual. Then a `ScriptCoding` block on Set composition — the student is given two seeded Sets (`allowedTags`, `userTags`), and writes `userTags.intersection(allowedTags)`, `userTags.difference(allowedTags)`, and `userTags.isSubsetOf(allowedTags)` in three short turns. The methods earn their weight in the student's keystrokes. A second `ScriptCoding` walks Map construction from an array of rows (`new Map(invoices.map(i => [i.id, i]))`), followed by `.get` and `Map.groupBy`. A small reference block names WeakMap and WeakSet with the three triggers, no code beyond one inline example for the memoization case — the surface is rare enough that the student needs recognition, not muscle memory. Close with a `Matching` exercise pairing five scenarios ("dedupe an array of user IDs," "group invoices by status," "cache a derived value per request that should be GC'd with the request," "test if a tag is in a permitted set of 5,000 tags," "store roles keyed by a branded UserId") to the right container. Optional `SandboxCallout` with seeded sets and maps for free play.

Estimated student time: 40 to 50 minutes.

---

## Lesson 2.3.5 — Iteration, `for...of`, and iterator helpers

Topics to cover:

- The senior question: what makes a value iterable, and when does a senior reach for an iterator-helper chain over an array-method chain. The lesson opens on the iteration protocol — the contract every iterable value (arrays, Sets, Maps, strings, `Object.entries()`, generators, custom iterators) shares — and then teaches the helpers that operate on the protocol directly.
- The iteration protocol, named at the depth that matters. An iterable is any object with a `[Symbol.iterator]()` method that returns an iterator. An iterator is any object with a `.next()` method that returns `{ value, done }`. The contract is the substrate for `for...of`, spread (`[...iter]`), array destructuring (`[a, b] = iter`), `Array.from`, `new Set(iter)`, `new Map(iter)`, and the helpers below. The lesson names the contract without surveying the spec; the student needs the model so the "this is an iterator, I can `.map()` it" reflex fires when they meet `Map.prototype.entries()` or `URLSearchParams` in Unit 5.
- **`for...of`** — the default loop in 2026 SaaS code. Iterates the values of any iterable. The senior triggers: side effects, `await` inside the loop (the parallel-vs-sequential decision is 2.7.3), `break` / `continue`, or any case where a chain doesn't read. The watch-out: `for...of` over an object's keys requires `Object.keys(obj)` or `Object.entries(obj)` — `for...of obj` doesn't iterate a plain object (because plain objects don't implement the iteration protocol). The `for...in` form does iterate keys, but it iterates inherited enumerable keys too — `for...of Object.keys(obj)` is the senior reach.
- **`for await...of`** — named here in one line as the seam to 2.7.3 (where async iteration earns its full treatment).
- **The iterator helpers on `Iterator.prototype`** (ES2025, Node 22+, unflagged in 2026). The new surface that lets the array methods compose lazily on any iterator:
  - **`.map(fn)`** — lazy transform, yields one mapped value per pull.
  - **`.filter(predicate)`** — lazy predicate.
  - **`.take(n)`** — limit to the first `n` values.
  - **`.drop(n)`** — skip the first `n` values.
  - **`.flatMap(fn)`** — map and flatten one level.
  - **`.reduce(fn, initial)`** — fold; terminal, returns the accumulator.
  - **`.toArray()`** — materialize as an array; terminal.
  - **`.forEach(fn)`** — side effects; terminal.
  - **`.some(predicate)`, `.every(predicate)`, `.find(predicate)`** — short-circuiting terminals.
  
  The shape: every helper returns a new iterator until a terminal (`.toArray`, `.reduce`, `.forEach`, the booleans) materializes the result. The senior triggers: a long chain on a large input (no intermediate arrays materialized), a chain on an inherently lazy source (`Map.prototype.entries()`, a database cursor wrapper, a streaming parser), or any case where a terminal `.find` or `.take` can short-circuit before consuming the whole input.
- The senior decision: when does the iterator-helper form earn its weight over the array-method chain. Three triggers named:
  - **Large input** — when the array would materialize a million-element intermediate at each step, the iterator form ships one element at a time and the GC doesn't notice.
  - **Lazy source** — when the input is already an iterator (a Map's entries, a generator, a database cursor wrapper, `Object.entries` on a wide object), pulling it through helpers without an intermediate `Array.from` is the natural reach.
  - **Short-circuit** — when a `.take(10)` or a `.find` will stop early, the helper chain doesn't process the rest of the input.
  
  The default for short chains on small arrays is still the array-method form — the helpers earn their weight when one of these triggers fires.
- **`Object.entries(obj).map(...)`** vs. **`Object.entries(obj).filter(...).map(...).toArray()`** with the helpers — the lesson shows one canonical contrast, where the iterator form lets a `.filter` and `.map` over an object's entries stay lazy and finish in a `Object.fromEntries(...)` call without materializing an intermediate array.
- **Generator functions** (`function*`, `yield`) named once and dismissed. The mechanism that builds custom iterators in user code. 2026 SaaS application code rarely writes generators directly — the iterator helpers cover the consumer side, and the construction side is usually a library's job (Drizzle's prepared statements, the streaming-response APIs in Unit 5). Named in one paragraph so the student recognizes `function*` in a library and knows where the iteration protocol comes from.
- TypeScript on iterators. The `Iterator<T>` and `IterableIterator<T>` types name the protocol. The helpers preserve the element type through the chain (`.map`'s callback's return type becomes the new iterator's element type). The `.find` returns `T | undefined`; the booleans return `boolean`; `.toArray` returns `T[]`. The student sees the types light up in the editor as they chain.

What this lesson does not cover:

- Async iteration (`for await...of`, async generators) — 2.7.3.
- Writing custom generators — out of scope; named once and dismissed.
- The full `Symbol.iterator` and `Symbol.asyncIterator` protocol mechanics at the spec level.
- The TC39 "iterator sequencing" proposal — out of scope (Stage 2 at the time of writing).

Pedagogical approach:

Concept archetype with a Mechanics body. Open with the iteration protocol — one paragraph naming `[Symbol.iterator]` and `.next()`, with a small `ScriptCoding` showing that an array, a string, a Set, and an `Object.entries()` result are all iterables (the student spreads each into a new array and confirms). Then the `for...of` baseline in one tight `ScriptCoding` — the student iterates a `Map.prototype.entries()` directly with `for (const [id, invoice] of byId)`, sees the destructuring fire, and notes that `for...in` would not work here. The iterator-helper section is the lesson's center: a `CodeVariants` block contrasts an `array.map().filter().slice()` chain with the same logic written as an iterator-helper chain on `Object.entries(...)`. One tab shows the eager form materializing two intermediate arrays; the other shows the lazy form yielding one value at a time. A second `ScriptCoding` exercises a `.take` for short-circuit — the student walks an infinite generator-style source (`(function* () { let n = 0; while (true) yield n++; })()`) through `.filter(n => n % 7 === 0).take(5).toArray()` and sees that the source is consumed exactly until the fifth match. The short-circuit is the lesson's payoff. Close with a `Buckets` exercise sorting six scenarios into "use array methods" / "use iterator helpers" / "use `for...of`" — the trigger-recognition is the deliverable. Optional `SandboxCallout` for free play.

Estimated student time: 40 to 50 minutes.

---

## Lesson 2.3.6 — Regex: the modern flavor

Topics to cover:

- The senior question: when does a regex earn its weight in a 2026 SaaS codebase, and what shape does the regex take. The answer: regex is the reach for shape-matching against unstructured strings (validating an arbitrary-format token, extracting a path parameter, parsing a webhook signature header) — but the moment the input has structure (JSON, URL parameters, form data, dates), the senior reach is a parser (Zod, `URL`, `Temporal`, `URLSearchParams`), not a regex. The lesson teaches the modern flavor a senior actually writes when regex is the right tool, and names the boundary where it isn't.
- Literal syntax and flags. `/pattern/flags`. The flags a SaaS engineer reaches for, named with the trigger for each:
  - **`g`** — global. Required for `.matchAll()`, `.replaceAll()` with a regex, and any iterative match. The senior watch-out: a `g`-flagged regex used with `.test()` has stateful `.lastIndex` and trips between calls — almost always a bug; the senior reflex is `.test()` without `g`, or a fresh regex per call.
  - **`i`** — case-insensitive.
  - **`m`** — multiline (`^` and `$` match per line, not per string).
  - **`s`** — dotAll (the `.` metacharacter matches newlines too). The senior trigger: any regex against potentially-multiline input.
  - **`u`** — Unicode. Treats the pattern and the input as code-point sequences (so `.` matches one emoji code point, `[\u{1F600}-\u{1F64F}]` works, `\p{...}` property escapes work). The course's regexes are always `u` or `v`-flagged in 2026; the bare ASCII flavor is for legacy code only.
  - **`v`** — Unicode sets. The superset of `u`. Enables set notation in character classes (`[\p{L}--\p{ASCII}]` for "any letter that isn't ASCII"), string-mode property escapes (`\p{RGI_Emoji}`), and explicit handling of grapheme-like sequences. The senior reach in 2026 when the regex touches non-ASCII text and the input is anything other than ASCII. The course defaults to `v` for any pattern with character classes or property escapes; `u` survives for trivial patterns.
  - **`y`** — sticky. Named once; rare in application code.
  - **`d`** — has indices (returns match indices on the result object). Named once; useful in compilers and parsers, rare in SaaS.
- The modern regex features named for what each enables:
  - **Named capture groups** — `(?<orgSlug>[a-z0-9-]+)`. The match result's `groups` property carries the named matches as a typed-keys object. Replaces positional `match[1]` numbering. The senior reach for any regex with more than one capture: positions are unreadable, names are self-documenting.
  - **Lookaheads** (`(?=...)`, `(?!...)`) — assert that the next characters match (or don't match) the pattern, without consuming. The senior trigger: "match X only when followed by Y" without including Y in the match.
  - **Lookbehinds** (`(?<=...)`, `(?<!...)`) — assert that the previous characters match (or don't match) the pattern. Available unflagged in Node since 12+; the senior trigger is the symmetric case ("match X only when preceded by Y").
  - **Unicode property escapes** — `\p{L}` (any letter), `\p{N}` (any number), `\p{Script=Latin}`, `\p{Emoji}` (with `v`). Requires `u` or `v`. The senior reach: validating non-ASCII names, splitting on script boundaries, matching emoji.
  - **Non-capturing groups** (`(?:...)`) — group for alternation or quantification without capturing. The senior trigger: keep the match result compact when the group is structural, not extracted.
  - **Quantifiers and the lazy modifier**. `*`, `+`, `?`, `{n}`, `{n,}`, `{n,m}` greedy by default; appending `?` (`*?`, `+?`) makes them lazy (match as little as possible). The senior watch-out: greedy quantifiers in patterns over HTML or JSON (where a structural parser is the right tool) — but inside scoped patterns, greedy is usually the right default.
- The match-and-extract surface — the methods a senior reaches for:
  - **`string.match(regex)`** — without `g`, returns the first match with capture groups (and `.groups` for named groups) or `null`. With `g`, returns just the matched strings as an array (no groups). The senior call: prefer `.exec` or `.matchAll` when groups are needed.
  - **`string.matchAll(regex)`** (requires `g`) — returns an iterator of full match objects (with groups). The senior reach for "iterate all matches with their captures." Pairs with the iterator helpers from 2.3.5 — `string.matchAll(regex).map(m => m.groups!.orgSlug).toArray()`.
  - **`regex.exec(string)`** — one match at a time; with `g` and `.lastIndex` for stateful iteration. The senior reach when explicit position control is needed; otherwise `.matchAll`.
  - **`string.replace(regex, replacement)` / `string.replaceAll(regex, replacement)`** — replace by pattern. The replacement can be a string (with `$1`, `$<name>` back-references) or a function (with the match and capture groups as arguments). The senior reach for transforming matched content. ES2021's `.replaceAll` requires a `g`-flagged regex (or a plain string), which removed the `string.replace(/foo/g, 'bar')` workaround.
  - **`string.split(regexOrString)`** — split by pattern. Named here in one line.
  - **`regex.test(string)`** — boolean. The senior reach for "does the input match." Watch-out: don't use a `g`-flagged regex with `.test` (the `.lastIndex` trap).
- The boundary where regex stops being the right tool. The lesson names three cases where the senior reaches for a parser instead:
  - **Structured inputs** — JSON, URL, ISO date, form data. Use `JSON.parse`, `new URL`, `Temporal.PlainDate.from`, `URLSearchParams`.
  - **User-input validation at a schema boundary** — Zod (Unit 7.1) is the form. A Zod schema with a regex `.regex(pattern)` step is fine for the simple cases; the regex lives inside the validator, not in the handler body.
  - **HTML, XML, complex grammars** — never regex. The DOM parsing APIs (Unit 3) or a library (`fast-xml-parser`, `htmlparser2`).
- TypeScript on regex. The match result types are narrow but not narrow enough — TS doesn't know which named groups are present in `result.groups`, so `result.groups!.orgSlug` involves a non-null assertion when the schema guarantees the group exists. The senior call: a Zod regex with `.transform` is the type-safe alternative at the validation boundary; raw `string.match` inside a handler accepts the `!` cost.

What this lesson does not cover:

- The full PCRE-vs-ECMAScript feature comparison.
- Atomic groups, possessive quantifiers, recursion — not in the language.
- Performance pathologies (catastrophic backtracking) at depth — named in one watch-out, not surveyed.
- Regex DSLs / regex builders (`regexp-tree`, `magic-regexp`) — out of scope.

Pedagogical approach:

Reference / survey archetype with a Concept opening. The lesson's breadth makes the survey form right, but the opening question — "when is regex the right reach?" — needs the Decision frame so the student leaves with the boundary, not just the syntax. Open with a one-paragraph senior frame on "shape-matching vs. parsing." Then the flags table as a tight `Tabs` block — one tab per flag, with the trigger and one inline example. The named-capture-and-lookaround surface walks as a `ScriptCoding` block: the student writes a regex with two named groups for parsing an `org/repo` path, runs it against three inputs, and uses `match.groups!.org` in the result. The student feels the named-group surface in their keystrokes. The match-and-extract methods walk as a prose reference (no `CodeVariants`) with one inline example each — the surface is small enough that survey-then-example reads cleanly. The lesson's Pattern beat is a `CodeReview` exercise: a function that uses `string.match` with positional groups for a webhook-signature header, and the student rewrites it with named groups and `.matchAll`, watching the readability win. Close with a `MultipleChoice` exercise on the boundary — "given this input shape, regex or parser?" — across five scenarios.

Estimated student time: 40 to 50 minutes.

---

## Lesson 2.3.7 — Quizz

Top ten topics to quiz:

1. The four `Object.*` helpers (`keys`, `values`, `entries`, `fromEntries`) and which one to reach for in a given transform scenario.
2. The non-mutating array update family (`.toSorted`, `.toReversed`, `.toSpliced`, `.with`) and the React-state context that demands them.
3. The `.find` vs. `.findIndex` vs. `.findLast` decision, and the `T | undefined` return type that forces the guard.
4. The `.filter` type-predicate idiom (`(u): u is User => u != null`) for narrowing the result.
5. `Object.groupBy` vs. `Map.groupBy` — which one's keys can be non-strings and why that matters.
6. The senior triggers for `Set` over array (dedup, membership test, composition) and the SameValueZero semantics on `Set.has`.
7. The ES2025 Set composition methods (`intersection`, `union`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`) — the lodash-kill surface.
8. `WeakMap` keyed by an object — the GC-coupled cache trigger.
9. The trigger for iterator helpers over array methods (large input, lazy source, short-circuit).
10. The named-capture-group form in regex (`(?<name>...)`) and the `v` flag for Unicode-set operations.

---

## Total chapter time

Roughly 225 to 285 minutes across the six teaching lessons plus the quiz. The chapter splits naturally across three or four evenings — objects and arrays (2.3.1 + 2.3.2) as one sitting, the array method surface (2.3.3) as the second, Set/Map and iteration (2.3.4 + 2.3.5) as the third, regex plus the quiz as a short fourth. The student finishes able to pick the right container for an access pattern, write the right method chain over it, and recognize when an iterator helper or a Set composition method makes the call shorter and more honest. Chapter 2.4 (TypeScript: typing the values you already know) lands directly on this floor — every type annotation it teaches will be applied to the collection shapes the student now writes by reflex.

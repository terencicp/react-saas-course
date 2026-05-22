# Chapter 003 — Picking the right container

## Chapter framing

Chapter 001 installed the value model and chapter 002 installed the shape of the code that operates on values. This chapter teaches the **container surface** a 2026 SaaS senior reaches for — the object as the workhorse record, the array as the ordered list with its non-mutating update family and method pipeline, `Set` and `Map` for the two cases plain objects can't carry, the iteration protocol behind every `for...of`, and the modern regex flavor. The lesson is *which container fits which shape of data* and *which method on that container is the senior reflex*. Containers are the substrate every later unit operates on — React state holds objects and arrays, Drizzle returns arrays of rows, the URL parser hands back a `URLSearchParams`, a Zod schema parses into shapes the rest of the system trusts.

Threads that must run through every lesson:

- **Decisions before syntax.** Each lesson opens with the production failure mode the form prevents — a `state[0] = x` that React didn't re-render, a `for...in` that picked up an inherited property, a `JSON.stringify(new Map())` that produced `'{}'`, a regex without the `u` flag that miscounted emoji. The syntax follows the failure.
- **Defaults before conditionals.** Object literal is the default record. Array is the default ordered list. `for...of` is the default loop. `.map`/`.filter`/`.reduce` is the default pipeline. `Set`, `Map`, `WeakMap`, the ES2025 lazy `Iterator.prototype` helpers, and the regex `v` flag each have a named threshold the default crosses before the student reaches for them.
- **Immutability where the framework requires it.** React, Server Actions, and Zustand all assume input-as-record discipline — never mutate, always replace. The ES2023 non-mutating update family (`.toSorted`, `.toReversed`, `.toSpliced`, `.with`) and the spread/rest idiom from lesson 6 of chapter 002 are the structural enforcement. The lesson does not preach "immutability" as a philosophy; it teaches the form the React reconciler and the Server Action serializer demand.
- **TypeScript-flavored, inference-led.** Every snippet is `.ts`. `noUncheckedIndexedAccess` (already on per lesson 4 of chapter 024) is the strictness that makes `arr[0]` return `T | undefined`, and every lesson respects it. Generic constraints and the deeper utility-type surface land in chapter 005; this chapter uses what chapter 004 will name (literal unions, `readonly`, `Record<K, V>`) without re-teaching.
- **Forward links land softly.** Objects foreshadow Drizzle row shapes (Unit 5), React props (Unit chapter 022), and Server Action input (lesson 4 of chapter 030). Arrays foreshadow Drizzle result sets, React list rendering with keys (chapter 022), and TanStack Query's `data` shape (Unit 15). `Map`/`Set` foreshadow the LRU cache idiom in Unit 14. Regex foreshadows Zod string refinements in Unit 6. One sentence each.

The student finishes the chapter able to pick the right container by reflex, write the senior method form on each, recognize the mutating-method footguns React forbids, and reach for `Set`/`Map`/`WeakMap`, lazy iteration, or the `v`-flag regex only when the default is the wrong tool.

---

## Lesson 1 — The object as workhorse record

Read, build, and reshape a record-shaped value with dot and bracket access, the three construction sugars (shorthand, computed keys, spread), and the `Object.*` static surface including `Object.groupBy`.

Topics to cover:

- The senior question. Two real bugs from the same root. First, a function reaches into an object with `obj[userInput]` and the property comes back as `Object.prototype.toString` — the prototype chain leaked. Second, a `{ ...patch }` over a base object silently overwrote an `id` field the patch wasn't supposed to touch. Both are object-construction bugs the senior form prevents. The lesson installs the daily reach for *building*, *reading*, and *reshaping* record-shaped values.
- The two access forms and when each fires. `obj.prop` is the default — static, type-checked against the known shape, the form every reader expects. `obj['prop']` is the conditional reach for three triggers: keys that aren't valid identifiers (`obj['user.email']`), keys held in a variable (`obj[fieldName]`), and dynamic-key patterns. Under `noUncheckedIndexedAccess`, bracket access on a `Record<string, T>` returns `T | undefined`; dot access on a typed shape returns `T`. The course writes dot access by reflex and reaches for brackets only when the trigger fires.
- The three construction sugars, named once each.
  - **Shorthand property.** `{ name, email }` over `{ name: name, email: email }` when the field name matches a binding in scope. The senior reflex for any object literal built from local variables.
  - **Computed keys.** `{ [fieldName]: value }` when the key itself is dynamic. The trigger is rare in 2026 application code (most keys are known at write time) but lives in factory helpers, reducer patterns, and the `Record<K, V>` literal shape.
  - **Spread.** `{ ...base, name: 'new' }` for shallow merge with override. The "right-most key wins" rule. This is the form React state setters, Server Action input merging, and Drizzle update payloads all consume. Watch-out: spread is shallow — nested objects keep their reference (already named in lesson 1 of chapter 001; recalled in one sentence).
- Reading: `in` vs. `hasOwn` vs. `?.`. The three checks have different semantics. `'foo' in obj` walks the prototype chain. `Object.hasOwn(obj, 'foo')` is the 2026 replacement for `hasOwnProperty.call(obj, 'foo')` — own-property only, the senior reach when the answer must exclude inherited keys. `obj.foo !== undefined` (or `obj.foo ?? default`) is the right reach for "is there a value here," which is what application code usually wants. One paragraph naming all three with their triggers.
- The `Object.*` static surface a senior reaches for.
  - **`Object.keys`, `Object.values`, `Object.entries`.** The iteration triad. Each returns an array of own enumerable keys / values / `[key, value]` pairs. Drives `for...of` over an object (covered in lesson 5 of chapter 003) and `.map` over key-value pairs. The TypeScript watch-out: `Object.keys(obj)` returns `string[]`, not `keyof T` — the type widens because at runtime, `obj` could have more keys than its compile-time type. Reach for `Object.entries` plus a type assertion only at trusted boundaries.
  - **`Object.assign(target, ...sources)`.** Mutates `target`, returns it. The watch-out: the mutation surprises callers. The senior reach for non-mutating merge is spread (`{ ...a, ...b }`); `Object.assign` earns its place only when the mutation is the point (extending a prototype, patching a config object the caller already owns).
  - **`Object.fromEntries`.** The inverse of `Object.entries`. The senior reach for "I have an array of `[key, value]` pairs and want an object" — `Object.fromEntries(map)` to convert a `Map` to a plain object, `Object.fromEntries(new URLSearchParams(query))` for shallow query-string parsing.
  - **`Object.freeze` and `Object.isFrozen`.** Named in one line as the runtime immutability primitive. The course rarely reaches for it (TypeScript's `readonly` is the design-time enforcement); useful for genuinely shared constants where a runtime guarantee is needed.
  - **`Object.groupBy(items, keyFn)`.** ES2024, shipping in every runtime the course targets in 2026 (Chrome 117+, Firefox 119+, Safari 17.4+, Node 20.12+). Returns a plain object grouping array items by the string key the function returns. The senior reach for "group an array of rows by a categorical field" — `Object.groupBy(invoices, (i) => i.status)`. Pairs with `Map.groupBy` (covered in lesson 4 of chapter 003) when the grouping key isn't a string.
- The prototype-chain rule, stated and dropped. Every object literal inherits from `Object.prototype` (and therefore has `.toString`, `.hasOwnProperty`, `.constructor` available on the chain). The senior never relies on inherited methods through user-controlled keys, which is why `Object.hasOwn` exists. For the rare case where prototype-less is needed (a strict map of user keys), `Object.create(null)` is the form — named once, parked.
- Forward links. Drizzle returns row objects (Unit 5). React props are an object shape (Unit chapter 022). Server Actions consume an options-object input (lesson 4 of chapter 030). Zod's `.parse()` returns a typed object (Unit 6). One sentence each.

What this lesson does not cover:

- The full reflective surface (`Object.getOwnPropertyDescriptor`, `Object.defineProperty`, `Object.getPrototypeOf`). Class-adjacent, not on the daily senior path. Named once if at all.
- `Object.create(proto)` for prototype-based inheritance. Replaced by ES classes, which themselves are narrowly used (per lesson 2 of chapter 009).
- The historical `__proto__` accessor. Named in one line as the legacy form to recognize; the course writes `Object.getPrototypeOf` or `Object.setPrototypeOf` if either is needed at all.
- JSON serialization and round-tripping. Owned by lesson 1 of chapter 009.
- Deep-merge libraries (`lodash.merge`, etc.). Not in the 2026 senior reach; deep merges are almost always a structural smell that calls for explicit object construction.

Pedagogical approach:

Mechanics archetype with a Reference closing beat. Open with one tight snippet of a record being built with shorthand + spread, then read with dot access and `Object.hasOwn`. Walk the three construction sugars in three small adjacent code blocks. The `Object.*` static surface earns a tight enumerated walk — one snippet per method, no padding. `Object.groupBy` lands with a real example (group invoices by status). Close with a `Buckets` exercise sorting eight access patterns into "dot," "bracket," "use `Object.hasOwn`," "use `?.`" — the senior reflex install. Offer a `SandboxCallout` where the student plays with spread merge semantics and watches "right-most key wins."

Estimated student time: 30 to 35 minutes.

---

## Lesson 2 — Arrays and the non-mutating update

Index arrays under `noUncheckedIndexedAccess`, reach for `.at()` and the ES2023 non-mutating update family (`.toSorted`, `.toReversed`, `.toSpliced`, `.with`), and recognize the mutating methods that React state forbids.

Topics to cover:

- The senior question. The day-one React bug: a component sorts its state array with `.sort()`, the array mutates in place, and React skips the re-render because the reference didn't change. The same bug class shows up with `.reverse()`, `.splice()`, and `.push()`. The fix isn't a defensive copy reflex; it's reaching for the ES2023 non-mutating twin by name. The lesson installs the array surface that's safe to use inside any state-holding code.
- Indexing and `noUncheckedIndexedAccess`. With the strictness on (per lesson 4 of chapter 024), `arr[0]` returns `T | undefined`. The senior reflex: handle the undefined explicitly (`arr[0] ?? fallback`) or narrow with a length check. The watch-out: developers coming from looser configs will write `arr[0].name` and TypeScript will complain — this is the right behavior, and the fix is `arr[0]?.name` or `arr.at(0)?.name`.
- `.at()` for safe positional access. The ES2022 method that handles negative indices natively. `arr.at(0)` (first), `arr.at(-1)` (last), `arr.at(-2)` (second-to-last). Returns `T | undefined`. The senior reach over `arr[arr.length - 1]` for "last element" — shorter, no off-by-one bugs, reads as intent.
- The mutating/non-mutating split. The four method pairs the student must recognize.
  - **`.sort()` mutates and returns the same array; `.toSorted(compareFn)` returns a new array, leaves the original alone.**
  - **`.reverse()` mutates; `.toReversed()` doesn't.**
  - **`.splice(start, deleteCount, ...items)` mutates; `.toSpliced(start, deleteCount, ...items)` returns a new array.**
  - **`arr[i] = value` mutates the element; `.with(i, value)` returns a new array with the index replaced.**
- The four ES2023 non-mutating forms are universally available in 2026 — Node 20+ (Node 22 LTS / 24 are the course targets), every current browser. The senior reach by reflex when the array is held in state.
- The mutating methods that still earn their place. `.push`, `.pop`, `.shift`, `.unshift` — each mutates. The trigger that earns them: a local array being built up inside a function that owns it (not shared, not in React state). The form is fine for "build a result inside a `for...of`" and wrong for "modify state in a React reducer." One paragraph stating the rule.
- The shallow `[ ...arr, newItem ]` and `arr.slice()` reach. The two forms that produce a shallow copy. Spread is the default for "array with one or two changes at the end" (`[...arr, x]`, `[head, ...rest]`). `.slice()` is the default for "shallow copy of the whole thing" or "extract a sub-range without mutating" — `arr.slice(0, 3)` for the first three, `arr.slice(-3)` for the last three. Note: `.slice` is the non-mutating cousin of `.splice` (which mutates); the names are unfortunately one letter apart.
- The `Array.from` and `Array.of` static surface. `Array.from(iterable, mapFn?)` converts any iterable (a `NodeList`, a `Set`, a generator, a string) into an array, with an optional map step in one pass. `Array.of(...items)` is the rare safe constructor that avoids the `Array(3)` ambiguity (`Array(3)` makes a length-3 hole-array; `Array.of(3)` makes `[3]`). One paragraph naming both with one short snippet for `Array.from(new Set(arr))` as the dedup idiom.
- The `length` write trap, named once. Setting `arr.length = 0` mutates in place and is sometimes seen in old code. The course never reaches for it; `[]` reassignment is the form for "I need this binding to point to an empty array."
- Forward links. React `useState<T[]>` and the non-mutating update rule (Unit chapter 023). The Drizzle result-set array (Unit 5). The `Array.from(formData.entries())` pattern in Server Actions (lesson 4 of chapter 030). One sentence each.

What this lesson does not cover:

- Typed arrays (`Uint8Array`, `Int32Array`, etc.). Rarely reached for in the SaaS UI/server surface; named once if at all when binary data (file upload, Web Crypto) lands in chapter 016.
- The `Array.prototype.fill` and `.copyWithin` methods. Niche; not in the daily reach.
- Sparse arrays and the holes-vs-undefined distinction. The course writes dense arrays by default; sparse-array semantics are named in one line where `Array(n)` could trap.
- The `.map`/`.filter`/`.reduce`/`.find` family. Owned by lesson 3 of chapter 003.

Pedagogical approach:

Pattern archetype. Open with the React state-mutation bug (`arr.sort()` failing to re-render) in adjacent before/after snippets. State the four mutating/non-mutating pairs in a tight table. Walk `.at()` with a one-line snippet. The `[ ...arr ]` and `.slice()` forms get one paragraph each. Use a `predict-output` exercise on six small array operations — three mutating, three non-mutating — where the student predicts the resulting state of `original` and `result`. Close with a `react-coding` exercise where a buggy sort-mutating component is fixed by swapping `.sort()` for `.toSorted()` and the re-render lands.

Estimated student time: 30 to 35 minutes.

---

## Lesson 3 — The array method surface

Walk `.map`, `.filter` with type predicates, `.reduce`, the `.find` family, `.some`/`.every`, `.flatMap`, and `.forEach`, and learn the rule for when to drop out of a chain into a `for...of` loop.

Topics to cover:

- The senior question. Two bugs at the opposite ends of a spectrum. First: a developer who hasn't internalized array methods reaches for a `for (let i = 0; ...)` loop for every transformation, and the code reads as a stream of imperative push-into-result lines. Second: a developer who has over-internalized array methods reaches for a six-step `.map().filter().reduce()` chain for an operation that includes async work and early termination, and the chain is unreadable and twice as slow as it needs to be. The lesson teaches the senior reflex — which method is the right reach for which shape of operation, and when to drop into `for...of`.
- The eight methods, grouped by what they produce.
  - **Transform (`.map`, `.flatMap`).** Same-length transform (`.map`); one-to-many transform that flattens one level (`.flatMap`). `.flatMap` is the senior reach for "for each item produce zero or more results" — returning `[]` from the callback drops the item, returning `[a, b]` adds two. The shape that replaces `arr.filter(fn).map(fn)` when the two steps share work.
  - **Subset (`.filter`).** Returns elements passing the predicate. The TypeScript watch-out: `.filter(Boolean)` doesn't narrow `(string | null)[]` to `string[]` without a type predicate. The senior form: `.filter((x): x is string => x !== null)` or the helper `function isPresent<T>(x: T | null | undefined): x is T { return x != null; }` reached for repeatedly. This is the foreshadowing of the type-predicate pattern that lands fully in lesson 6 of chapter 004 and lesson 3 of chapter 005.
  - **Reduce (`.reduce`, `.reduceRight`).** The fold over the array. The senior reach when the result is a single value built up from every element — a sum, a min, a built-up object. The watch-outs named once: always pass the initial value (omitting it makes the first element the accumulator with confusing typing); prefer specialized methods (`.some`, `.every`, `.find`) when one of them fits, because they short-circuit and read better. The "reduce-to-object" pattern (`.reduce((acc, x) => ({ ...acc, [x.id]: x }), {})`) is named with one watch-out: it's `O(n²)` due to spread per iteration; `Object.fromEntries(arr.map((x) => [x.id, x]))` or a `Map` is the linear form.
  - **Find (`.find`, `.findIndex`, `.findLast`, `.findLastIndex`).** Short-circuit search. `.find` returns the first matching element or `undefined`; `.findIndex` returns its index or `-1`. The ES2023 `.findLast` and `.findLastIndex` walk from the end — the senior reach for "the most recent matching event" without a `.reverse()` first.
  - **Test (`.some`, `.every`).** Short-circuit boolean checks. `.some` returns `true` on the first match; `.every` returns `false` on the first miss. The senior reach over `.filter(fn).length > 0` (which walks the full array) for "is there at least one" / "are they all".
  - **Side-effecting (`.forEach`).** Iterate purely for side effects. Named once. The course almost never reaches for it — `for...of` reads better, supports `break`/`continue`/`return`, and works with async/await. The narrow reach for `.forEach`: short side-effecting callbacks where readability of the chain matters more than control flow, and `for await` integration with `for...of` is not relevant.
- The `for...of` trigger, stated explicitly. Four conditions that flip the choice away from the array-method chain.
  - **Async work that needs sequencing.** `for...of` supports `await`; chaining `.map(async ...)` returns an array of promises that needs a `Promise.all` and runs in parallel (often the wrong choice; covered in lesson 3 of chapter 007).
  - **Early termination (`break`, `return`).** Array methods (other than `.find`/`.some`/`.every`) walk the whole array. `for...of` can `break` out the moment the condition fires.
  - **Multiple side effects per iteration.** A chain of three or four statements per element reads as a `for...of` body; the same in a `.forEach` callback feels stuffed.
  - **Need both index and value with custom step.** `arr.entries()` gives `[index, value]` pairs to `for...of`. If the step isn't 1 (every other element, backward), the C-style `for (let i = 0; ...)` is still the right reach.
- The chain-readability rule. Two to three chained methods read clearly; four or more often hide what's happening. The senior reach when the chain is getting long: pull intermediate results into named `const`s with the intent in the name (`const activeUsers = users.filter(isActive); const emails = activeUsers.map((u) => u.email);`) instead of one long fluent line. The course teaches that *naming the intermediate result is often the lesson*, not the chain.
- The "drop into `Map`/`Set`" trigger, foreshadowed. A `.filter` doing membership check inside a callback (`arr.filter((x) => other.includes(x.id))`) is `O(n × m)`. The senior reflex: build a `Set` of IDs first, then `.filter` over the constant-time `.has`. The trigger and the full set composition surface land in lesson 4 of chapter 003.
- Forward links. React list rendering with `.map((item) => <Row key={item.id} ... />)` (Unit chapter 022). TanStack Query's `data?.map(...)` pattern (Unit 15). Drizzle's result-set transforms before they hit the response (Unit 5). One sentence each.

What this lesson does not cover:

- `.indexOf` and `.includes` as primary tools. Named in one line — `.includes` is fine for short primitive arrays; for anything else, `Set.has` is the right reach (lesson 4 of chapter 003).
- The `.concat` method. Replaced by spread (`[...a, ...b]`) in 2026 senior code; named once.
- The `.join` and `.split` string-array methods. Already on the radar from lesson 4 of chapter 001; named here in one sentence if at all.
- Imperative builds with `.push` inside a `.forEach`. Anti-pattern in 2026; `.map`/`.flatMap` is always the right reach for that shape.
- Lazy iteration over array-like sources. Owned by lesson 5 of chapter 003.

Pedagogical approach:

Reference/survey archetype done tightly — eight methods, but each gets only one line of prose plus one short snippet because the surface is the lesson. Open with the two bugs (imperative-loop-everywhere and overlong-chain). Walk the eight methods grouped by the four output shapes (transform, subset, reduce, find/test/iterate). The `.filter` type-predicate point gets one full `type-coding` snippet — students should see `(string | null)[]` narrow to `string[]` only with the predicate form. The `.reduce`-to-object O(n²) watch-out earns one snippet showing the linear `Object.fromEntries` rewrite. State the four `for...of` triggers in a tight list. Close with a `code-review` exercise: present a 15-line function with three nested array-method calls plus a `.forEach` doing async work; the student rewrites with `for...of` for the async loop and named intermediates for the chained transforms. The rewrite confirms the senior reflex.

Estimated student time: 35 to 40 minutes.

---

## Lesson 4 — When Set and Map earn their weight

Pick `Set` for dedup and membership, `Map` for keyed lookup at scale, `WeakMap` for GC-coupled caches, and reach for the ES2025 Set composition methods and `Map.groupBy` that retire the lodash habit.

Topics to cover:

- The senior question. The plain object as a map smells once the team hits any of three conditions — non-string keys, frequent insertion/deletion at scale, or the need to iterate in insertion order. The plain array as a set smells once a membership check (`arr.includes(x)`) shows up inside a loop. `Set` and `Map` are the data structures that close those gaps. The lesson installs the four-way pick: object, array, `Set`, `Map` (and `WeakMap`/`WeakSet` at the narrow edge).
- The trigger that earns `Set`. Three concrete shapes.
  - **Dedup.** `new Set(arr)` returns a `Set` of unique values. `Array.from(new Set(arr))` is the canonical dedup idiom for arrays of primitives.
  - **Membership check inside a loop.** `Set.has(x)` is `O(1)`; `Array.prototype.includes` is `O(n)`. The instant the membership check is inside another loop or a `.filter` callback, the senior reflex builds a `Set` first.
  - **Set algebra.** Union, intersection, difference, symmetric difference, subset and superset checks. The ES2025 methods (covered below) are the senior reach.
- The trigger that earns `Map`. Three shapes.
  - **Non-string keys.** Objects, numbers (where you want the actual number not the string coercion), other complex values. Plain objects coerce every key to a string; `Map` keeps the key as the original value.
  - **Frequent insert/delete.** `Map` is optimized for the operation; plain objects are not, and adding/removing fields can deoptimize hidden classes.
  - **Insertion-ordered iteration the contract is allowed to depend on.** `Map` guarantees insertion order on iteration; plain objects do too in modern JS, but the senior reads `Map` and *knows* the contract.
- The four `Set` methods that ship in 2026 (ES2025, universally available). Each is one line.
  - **`a.union(b)`** — elements in either.
  - **`a.intersection(b)`** — elements in both.
  - **`a.difference(b)`** — in `a` but not `b`.
  - **`a.symmetricDifference(b)`** — in exactly one.
  - **`a.isSubsetOf(b)`, `a.isSupersetOf(b)`, `a.isDisjointFrom(b)`** — three boolean checks.
- All seven retire the lodash `_.union`, `_.intersection`, `_.difference` habit returning students remember. One short snippet showing `activeUsers.intersection(adminUsers)` is the entire ergonomic case.
- The `Map.groupBy(items, keyFn)` static. ES2024, shipping in every runtime the course targets. The right reach when grouping by a non-string key (an object, a Date, a tuple) — `Map.groupBy(events, (e) => e.date)` for grouping events by `Date` object. Pairs with `Object.groupBy` from lesson 1 of chapter 003 when the key is a string.
- `Map` and `Set` API touch points. The minimum surface a senior writes by reflex:
  - **`Set`.** `add(v)`, `has(v)`, `delete(v)`, `size`, iteration via `for...of` (yields values), `new Set(iterable)`.
  - **`Map`.** `set(k, v)` (chainable), `get(k)` (returns `V | undefined`), `has(k)`, `delete(k)`, `size`, iteration via `for...of` (yields `[k, v]` pairs), `.keys()`, `.values()`, `.entries()`, `new Map(iterableOfPairs)`.
- The `.get` return-type rule and `noUncheckedIndexedAccess`-like discipline. `Map.get(k)` always returns `V | undefined` even when TypeScript types the map as `Map<K, V>` (there's no way to know at compile time which keys are present at runtime). The senior reflex: handle the miss with `??` or narrow with a `.has` check first.
- `WeakMap` and `WeakSet`, named at the narrow edge. The key difference from `Map`/`Set`: keys are weakly held — when the only reference to the key is the `WeakMap` entry, the entry is reclaimed by GC. The two production sites named in one paragraph each:
  - **Caches keyed by object identity.** Cache a computed value per object instance without preventing the object from being garbage-collected when it goes out of scope elsewhere. The DOM-element-keyed cache, the React-element-keyed metadata, the request-keyed memoization.
  - **Private state per instance.** The pre-class-field pattern for hiding state outside the class instance itself. Mostly obsolete given class private fields (`#field`); named once.
- The watch-out: keys must be objects (not primitives), and `WeakMap` has no `.size` or iteration — the keys can be reclaimed at any time. The course rarely writes `WeakSet` (uses are even narrower); named in one line for recognition.
- The serialization watch-out. `JSON.stringify(new Map())` returns `'{}'`. `JSON.stringify(new Set())` returns `'{}'`. Crossing a wire boundary (Server Action input, fetch body, localStorage) requires converting to a serializable form first — `Array.from(map)` or `Object.fromEntries(map)`. Forward link to lesson 1 of chapter 009 where serialization is the lesson.
- Forward links. The LRU cache idiom in Unit 14 (cache and rate limiting). The Set-based dedup in Drizzle result transforms (Unit 5). The `WeakMap`-keyed metadata pattern in TanStack Query's internal cache (Unit 15, named only). One sentence each.

What this lesson does not cover:

- The full prototype surface of `Set` and `Map`. The eight + seven listed methods are the entire daily reach.
- Iteration helpers chained off `Set` and `Map`. Owned by lesson 5 of chapter 003 (the ES2025 `Iterator.prototype` surface).
- Custom hash functions and equality for `Map` keys. JavaScript uses SameValueZero — named once. There is no way to override; if value-equality keying is needed, key by a canonical string form.
- Production-grade LRU and TTL implementations. Named in Unit 14.
- Concurrent data structures and the `SharedArrayBuffer` surface. Out of scope.

Pedagogical approach:

Decision archetype. Open with the four-way pick (object, array, `Set`, `Map`) as a small decision-tree diagram — questions are "Is the key dynamic-string?", "Are you doing membership or set algebra?", "Are the keys objects?". State the trigger for each container in one sentence. The ES2025 Set methods earn one tight enumerated block — each method named with a one-line trigger and an example like `activeUsers.intersection(adminUsers)`. The `Map.groupBy` example uses a non-string key (a `Date`) to land the trigger. Walk `WeakMap` with one short snippet of the DOM-element-keyed cache. The serialization watch-out lands in a callout. Close with a `Buckets` exercise sorting eight data shapes into the right container: e.g. "set of user IDs to filter against," "lookup table from order ID to row," "cache of computed metadata per DOM node," "count occurrences of words in a string" — the sort is the senior-reflex install.

Estimated student time: 35 to 40 minutes.

---

## Lesson 5 — Iteration and the lazy helpers

Learn the iteration protocol behind every iterable, default to `for...of` for side effects, and reach for the ES2025 `Iterator.prototype` helpers when the input is large, lazy, or short-circuited.

Topics to cover:

- The senior question. Two bugs from the same root. First, a function reads a million-row stream into memory by calling `.toArray()` early in the pipeline, then `.filter`s down to ten — nine hundred ninety-nine thousand nine hundred ninety rows allocated for nothing. Second, a developer writes `for (const k in obj) { ... }` to iterate an object's keys and the loop picks up an inherited property added by a polyfill. Both are iteration bugs. The lesson installs the iteration protocol, the `for...of` default, and the ES2025 lazy-helper surface that lands the right reach for the streaming case.
- The iteration protocol, in one paragraph. Anything with a `[Symbol.iterator]()` method returning an iterator is *iterable*. An iterator is anything with a `.next()` method returning `{ value, done }`. Every array, string, `Map`, `Set`, `arguments` object, `NodeList`, generator function return value, and `URLSearchParams` instance implements the protocol. Custom iterables are rare in application code; the protocol matters because it's *what `for...of` consumes*. Named once, parked.
- `for...of` as the default. The five-line model:
  - Iterates the iterable, not its keys.
  - Calls `.next()` until `done: true`.
  - Supports `break`, `continue`, `return`, and `throw` inside the body.
  - Plays naturally with `await` — `for...of` is the only loop form that doesn't fight `async/await`.
  - Plays with destructure in the binding (`for (const [key, value] of map)`, `for (const { id, name } of users)`).
- The `for...of` triggers, restated from lesson 4 of chapter 002 and lesson 3 of chapter 003 (one sentence each): side effects, async work, early termination, multiple statements per iteration. The course writes `for...of` over `.forEach` by reflex.
- The four iteration entry points on an object.
  - **`Object.entries(obj)`** for `[key, value]` pairs. The default.
  - **`Object.keys(obj)`** when only keys are needed.
  - **`Object.values(obj)`** when only values are needed.
  - **`for...in`** — named *only* to be banned. Walks the prototype chain, returns string keys including inherited enumerable ones, almost always wrong in modern code. The senior course never writes `for...in`.
- Generator functions, named at the narrow edge. The `function* name() { ... yield value; ... }` form returns an iterator on call. The two production sites a senior writes: custom iterables that are *easier to write as generators than as `[Symbol.iterator]` methods* (rare), and stateful resumable computations (rarer). Named in one paragraph with one short snippet — the student needs to recognize the syntax, not write generators by reflex.
- The ES2025 `Iterator.prototype` helpers. The lazy method surface that ships natively in 2026 (Node 22+, Chrome 122+, every current browser). The trigger: the source is large, lazy, or short-circuited.
  - **The methods.** `.map(fn)`, `.filter(fn)`, `.take(n)`, `.drop(n)`, `.flatMap(fn)`, `.reduce(fn, init)`, `.toArray()`, `.forEach(fn)`, `.some(fn)`, `.every(fn)`, `.find(fn)`, plus the static `Iterator.from(iterable)`.
  - **The laziness.** Each helper returns a new iterator. Nothing materializes until a terminal step (`.toArray`, `.reduce`, `.forEach`, `.some`, `.every`, `.find`, or a `for...of`) pulls the chain.
  - **The trigger restated.** When the source is a generator, a large file stream, a paginated API, or a sequence whose total size is unknown, the array-method chain materializes the wrong thing. The iterator-helper chain pulls only what the terminal step asks for.
  - **The reach.** Wrap any iterable with `Iterator.from(source)` to enter the helper chain. The example: `Iterator.from(stream).filter(isError).take(10).toArray()` to grab the first ten errors from a stream without buffering the stream.
- The "stay with arrays" reminder. Most application data fits in memory, and `.map`/`.filter` over an array is the right reach. The iterator helpers earn their place when the source itself is lazy. Don't reach for them by reflex on a 100-element array — the eager form reads better and runs comparably.
- The async iteration cousin (`for await...of` and `AsyncIterator`). Foreshadowed in one paragraph — streamed fetch responses, server-sent events, paginated APIs. Full treatment in lesson 3 of chapter 007. The course does not teach the async `Iterator.prototype` helpers (the spec for async helpers shipped later and the surface is identical-shaped); one sentence is enough.
- Forward links. Streamed `ReadableStream` consumption in lesson 1 of chapter 015. Server-sent events in lesson 2 of chapter 015. The `for await...of` paginated-API pattern in lesson 3 of chapter 007. The `Iterator.from(formData.entries())` shape in Server Actions in lesson 4 of chapter 030. One sentence each.

What this lesson does not cover:

- Writing custom iterables from scratch with `[Symbol.iterator]`. Rare; the generator form is the right reach when an iterable is needed.
- The `Symbol.asyncIterator` and the full async-generator surface. Owned by Chapter 007.
- Performance benchmarking of eager vs. lazy iteration. The trigger (lazy source / large size / short-circuit) is the call; microbenchmarks distract.
- Stream backpressure and the WHATWG `ReadableStream` API. Lives in chapter 015.
- Tree traversal and visitor patterns. Outside the SaaS daily reach.

Pedagogical approach:

Concept archetype. Open with the two bugs (eager-toArray-then-filter and `for...in` on object). State the iteration protocol in one paragraph. Walk the `for...of` model in five short bullets. The four object-iteration entry points get a tight comparison block. Generator functions get one short snippet for recognition. The ES2025 helpers earn the central beat — a Mermaid or hand-authored SVG showing a generator source piping through `.filter` → `.take(10)` → `.toArray`, with annotations on which step pulls and which step yields. Use a `predict-output` exercise on two short programs — one that materializes early with `.toArray`, one that stays lazy with `Iterator.from` — and the student predicts how many times the source generator's `yield` fires. Close with a `script-coding` block where the student rewrites a buffered-then-filtered chain into the lazy form and watches the `console.log` inside the source fire fewer times.

Estimated student time: 30 to 35 minutes.

---

## Lesson 6 — Regex: the modern flavor

Write 2026-flavor regex with named capture groups, lookarounds, the `u` and `v` Unicode flags and property escapes, the `.matchAll` iterator surface, and the boundary where a parser replaces the regex.

Topics to cover:

- The senior question. Regex is the place juniors over-reach and seniors *deliberately* under-reach. The common bug shapes — a username pattern that allows emoji and breaks downstream, an email regex that misses a real address, an HTML-parsing regex that misses a `<` inside an attribute. The lesson teaches the modern regex flavor a 2026 senior actually writes (small, anchored, named-grouped, Unicode-aware) *and* the threshold where a regex stops being the right tool and a real parser replaces it.
- The two construction forms. The literal `/pattern/flags` is the default — short, the flags are visible, the regex compiles once. The constructor `new RegExp(pattern, flags)` is the reach when the pattern is built from variables. Watch-out: with the constructor, backslashes double (`new RegExp('\\d+')` not `new RegExp('\\d+')` — backslash is a string escape too). The senior reach: literal regex by default, constructor only when interpolation is required.
- The flag surface. Six flags the course actually reaches for.
  - **`g` (global).** Required for `.matchAll` and global `.replaceAll(regex, ...)`. Without it, `.match` returns only the first match.
  - **`i` (case-insensitive).** The daily reach for human input.
  - **`m` (multiline).** Changes `^` and `$` to match at every line, not just at the string boundaries.
  - **`s` (dotAll).** Makes `.` match newlines. Required for any regex that spans lines.
  - **`u` (unicode).** Enables Unicode mode — full code-point matching, validation of escape sequences, `\p{...}` property escapes. Always on for human text.
  - **`v` (unicode sets, ES2024).** Successor to `u`. Enables set operations inside character classes (intersection `&&`, difference `--`, nested classes), properties-of-strings (`\p{RGI_Emoji}`), and fixed safer escape semantics. Universally available in 2026 (Chrome 117+, Firefox 119+, Safari 17.4+, Node 20.12+). The senior reach over `u` when matching emoji sequences or composing classes; otherwise `u` is fine.
- The two flags do *not* go together — `v` is a strict upgrade and is mutually exclusive with `u` at the API level (using both is a syntax error). The course writes `u` by default and switches to `v` when the trigger fires.
- Named capture groups. The senior form for any regex that captures structure. `/(?<year>\d{4})-(?<month>\d{2})-(?<day>\d{2})/`.  Accessed by name on the match result (`match.groups.year`). Reads at the call site; refactor-safe (renaming a group is a one-place change); and TypeScript-friendly (the groups object is typed where the type system can infer the pattern). The senior never reaches for `match[1]`, `match[2]` in 2026 except in the rarest of cases.
- Backreferences, named and indexed. `\k<name>` for named, `\1` for indexed. Useful for matching repeating patterns (HTML tag pairs, repeated words). One short snippet, one sentence on the watch-out: regex backreferences have polynomial worst-case complexity on adversarial input (the ReDoS class of bugs).
- Lookarounds. The four forms.
  - **`(?=...)`** positive lookahead — assert what follows.
  - **`(?!...)`** negative lookahead.
  - **`(?<=...)`** positive lookbehind — assert what precedes.
  - **`(?<!...)`** negative lookbehind.
- All four ship in every runtime the course targets. The senior reach when the surrounding context is part of the match condition but shouldn't be part of the captured text — e.g. "match a number that's followed by `px` without capturing the `px`."
- Unicode property escapes (`\p{...}` under `u` or `v`). The categorical primitive. `\p{Letter}` (any letter in any script), `\p{Number}`, `\p{White_Space}`, `\p{Emoji}`, `\p{Script=Latin}`. The senior reach over `[a-zA-Z]` for any human text — `[a-zA-Z]` misses accented letters, every non-Latin script, and the bugs land in production the moment a non-English user signs up.
- The `v`-flag set operations, named at the trigger. `[\p{Letter}&&\p{ASCII}]` (intersection — Latin letters only). `[\p{Letter}--\p{ASCII}]` (difference — non-ASCII letters). `[[\p{Letter}][\p{Number}]]` (nested classes — union by default). One short snippet showing one operation; this is a recognition surface, not a daily-write surface.
- The result surface — three methods, three behaviors.
  - **`pattern.test(string)`** — boolean. The senior reach for "does the string match." Fastest, cleanest. Watch-out: a `g`-flag regex carries state across calls of `.test()` and `.exec()` (`lastIndex`); avoid `g` on patterns reused with `.test`.
  - **`string.match(pattern)`** — returns the first match (without `g`) or all matches as strings (with `g`). Without `g`, the result has groups, indices, and the captured groups; with `g`, the result has just the matched strings (no group access). The asymmetry is the footgun.
  - **`string.matchAll(pattern)`** — requires `g`, returns an iterator of full match objects (each with groups, indices, captures). The senior reach over `.match` with `g` when any captured group is needed.
- The `.replaceAll(pattern, replacement)` reach. With a string-replacement, `.replaceAll('a', 'b')` is the senior form for non-regex replacement. With a regex, the pattern must have the `g` flag (TypeScript errors otherwise) — the strict form prevents the historical `.replace(/a/, 'b')` bug that replaced only the first occurrence. The replacement function form (`(match, ...groups) => string` or `(match, ...indexed, offset, full, groups) => string`) is named in one paragraph.
- The "drop the regex" threshold. The two triggers that flip the choice.
  - **Parsing structured formats.** Email, URL, HTML, JSON, CSV, Markdown — all have parsers built in (`URL`, `JSON.parse`, `DOMParser`) or as standard libraries. The senior never writes a regex against any of these. The cost of a wrong regex on a structured format is silent acceptance of malformed input.
  - **The regex is becoming unreadable.** When the pattern hits twenty characters of escapes and the next reviewer can't see what it matches, the threshold is crossed. The fix: a small parser (a few `.indexOf`/`.slice` calls, or a real tokenizer if the format earns it).
- ReDoS in one sentence. Adversarial input on certain pattern shapes (nested quantifiers like `(a+)+`) causes catastrophic backtracking. The 2026 mitigation: build patterns that don't nest quantifiers, avoid unbounded `.*` followed by alternation, and run untrusted input through length limits before the regex sees it.
- Forward links. Zod's `.regex(...)` and `.email()` / `.url()` validators (Unit 6) — most string validation in the course's code happens at the schema, not at hand-rolled regex. URL parsing with `new URL(...)` (Unit chapter 012). The `dedent` and `sql` tagged-template parsers from lesson 5 of chapter 001 (named) showed where parsers replace regex on multi-line strings. One sentence each.

What this lesson does not cover:

- Regex internals (NFA vs. DFA, the V8/JSC engine differences). The course uses regex as a tool; engine choice doesn't affect the senior reach.
- Sticky flag `y` and the `lastIndex` write surface. Niche; named in one line if at all.
- The `d` flag (hasIndices) for match positions. Useful for highlighting/tooling but rare in application code; named in one line.
- Regex performance tuning beyond the ReDoS sentence.
- Building regex from regex literals at runtime (`new RegExp(literal.source + ...)`). The course composes regex from strings under the constructor form; the literal-composition path is unusual.

Pedagogical approach:

Mechanics archetype with a strong Decision close. Open with the "regex is over-reached" framing and one bug example (a username regex `[a-zA-Z0-9]+` that rejects every non-Latin name). Walk the two construction forms in one short beat. The flag surface gets a tight enumerated block — six flags, one line each, with the `u`/`v` distinction highlighted. Named capture groups get one full snippet showing the date-parsing example. Lookarounds get one snippet of negative lookahead (match a number not followed by `px`). The `\p{...}` property escape lands with a before/after — `[a-zA-Z]` over a list of names where half fail, then `\p{Letter}` with the same list passing. The result-surface asymmetry (`.match` with vs. without `g`) earns a `predict-output` exercise. State the "drop the regex" threshold with two real examples (parse email with regex vs. with Zod's `.email()`; parse a date with regex vs. with `Temporal.PlainDate.from`). Close with a `code-review` exercise: a small validation function reaching for a regex where a parser belongs, refactored to use `new URL` instead. The refactor is the lesson's confirmation.

Estimated student time: 35 to 40 minutes.

---

## Lesson 7 — VS Code as a team artifact

Teaches the editor commitment, the minimum-viable extension set with one senior reason each, and the repo-owned configuration files (`.editorconfig`, `.vscode/extensions.json`, `.vscode/settings.json`) that make editor setup a teammate-shared surface rather than a personal preference — placed right before the first lesson that runs TypeScript on local files.

Topics to cover:

- The editor decision in one paragraph. VS Code is the 2026 default for SaaS work — broadest extension ecosystem, the language servers the course's stack ships its own integrations against, free, cross-platform, the editor every junior teammate will already have or will install in five minutes. Cursor, Zed, and Neovim get one line each with the trigger that would flip the choice — Cursor for AI-first workflows the course deliberately doesn't teach against, Zed for editing speed past the point a senior would notice, Neovim for keyboard fluency a returning dev usually doesn't have time to invest in. The course commits to VS Code. Installation is one line and a link; no walkthrough.
- The framing for placement. The last six lessons of chapter 003 lived in the student's terminal and online TypeScript playgrounds. From the next lesson onward, the student starts running TypeScript locally — which means files on disk, an editor that reads them, and configuration that pins how the editor behaves. This lesson installs that surface so the next lesson lands on a known editor.
- The minimum-viable extension set, with one senior reason each.
  - Biome — the lint-and-format LSP that lesson 5 of chapter 028 will configure when the first real project lands. Installed here so it's already running when the project does.
  - Tailwind CSS IntelliSense — autocomplete, hover-previewed generated CSS, class-name linting. Earns its weight from chapter 018 onward; installed here so it never has to be revisited.
  - EditorConfig — reads `.editorconfig` so non-VS Code editors on the team behave the same. One file, one extension, no per-editor config.
  - GitLens — inline blame on the line under the cursor, file history, side-by-side compare. The senior reason: code review starts with "who wrote this and why," and GitLens puts that question one click away.
  - Error Lens — pulls TypeScript / Biome diagnostics inline next to the offending line instead of hovering. Tightens the feedback loop on every save.
  - Pretty TypeScript Errors — flattens long structural type errors into something a human reads in one pass. Earns its weight the first time a Drizzle or Zod inferred type explodes into a wall of text.
- The "everything else is opinion" rule. Themes, icon packs, vim modes, productivity bundles — out of scope, the student picks their own and the course doesn't care.
- The repo-owned configuration: the `.vscode/` directory and what belongs in it.
  - `.vscode/extensions.json` with a `recommendations` array — when a teammate clones the repo (chapter 035 onward), VS Code prompts them to install the missing extensions. Structural enforcement that makes "I forgot to install Biome" hard to leave un-fixed.
  - `.vscode/settings.json` — workspace-level overrides for `editor.formatOnSave`, `editor.defaultFormatter` per language (Biome for JS/TS/JSON, the Tailwind extension for CSS Intellisense), `editor.codeActionsOnSave` with Biome's `quickfix.biome` and `source.organizeImports.biome`, `typescript.tsdk` pointing at the workspace TypeScript (the "Use Workspace Version" choice, surfaced explicitly).
  - The boundary: settings the student wants for *themselves* (theme, font) belong in User settings, not the workspace file. The lesson is explicit that the workspace file is a team artifact, not a place to push personal preference.
- `.editorconfig` at the repo root. Two-space indentation, LF line endings, UTF-8, final newline, trim trailing whitespace. Four lines, two editors honor it (VS Code via the extension, IntelliJ family natively), Biome reads it directly when chapter 028 wires it in. Stated as a single file, not a configuration surface.
- The "Use Workspace Version" of TypeScript prompt. Every fresh open of a TS project surfaces it; the student needs to pick the workspace version once so the editor uses the same `tsc` the build does. Named so they don't ignore it.

What this lesson does not cover:

- The Biome configuration itself — that's lesson 5 of chapter 028 when the first real project earns linting.
- The full `tsconfig.json` — that's lesson 4 of chapter 028.
- Keyboard shortcuts, the command palette beyond "Ctrl/Cmd-Shift-P exists" — not a productivity tutorial.
- Settings Sync — the chapter takes the position that workspace settings belong in the repo, not in a personal cloud profile.
- Theme, font, icon-pack choices — the course doesn't care.

Pedagogical approach:

Setup/wiring archetype with a one-paragraph Decision opening. Open with the VS Code commitment in two sentences and dismiss the alternatives in one line each so the lesson doesn't sit on the editor-choice question. Then a `Steps` block walks the install, the extension installs (one command via the CLI or a single Marketplace link per extension), and writing the three files the lesson cares about: `.editorconfig`, `.vscode/extensions.json`, `.vscode/settings.json` (with the Biome formatter wired but the actual rules to be configured when chapter 028 lands the first project). Show each file as a small labeled code block — never more than a dozen lines, no commentary inside the blocks. Use `Tabs` to display the three files side by side at the end so the student sees the `.vscode/` shape at a glance. Close with one short `Buckets` exercise sorting six settings into "workspace (repo)" vs "user (machine)" — `editor.formatOnSave`, theme, font family, `editor.codeActionsOnSave`, line height, default formatter — to confirm the team-vs-personal distinction landed. No sandbox: there's nothing to play with.

Estimated student time: 25 to 30 minutes.

---

## Lesson 8 — Run TypeScript locally

Pin Node 24 LTS via mise's `.mise.toml` to make the runtime a property of the repo, then partition `.ts` execution into native strip-types as the default, `tsx` past a named trigger (path aliases, JSX, decorators), and `tsc` reserved for library publishing or `--noEmit` type-checking — the moment local TS execution earns its place.

Topics to cover:

- The senior question: up until this lesson the student has played with JavaScript and TypeScript in inline exercises and the TypeScript Playground. Chapter 004 (Typing values you know) and the rest of Unit 1 land on multi-file modules, async semantics, and Temporal — patterns that benefit from running locally against the real Node runtime. This lesson pins that runtime and partitions the three ways to execute a `.ts` file. Tools earn their weight here; no premature install.
- **Pinning the toolchain with mise.** Two failure modes named concretely — the contributor whose system Node is two majors behind and breaks half the dev scripts; the CI box that runs a different Node minor and quietly tree-shakes a feature out. Pinning makes the runtime a property of the repo, not the machine.
- mise as the default in 2026, with the trigger framing. mise is Rust-built, polyglot (Node, Python, Ruby, Go — Trigger.dev's local CLI later in the course will pin under the same file), reads `.tool-versions` and `.nvmrc` for migration, and ships environment-variable and task-runner features the course will use again. nvm gets one line: shell-script architecture, Node-only, slower; the trigger to flip back is "team already standardized on nvm and migration cost is not worth it." Volta gets a sentence: still maintained, narrower scope, fine if it's already in place.
- Installing mise on macOS and Linux (Homebrew or the install script); the shell activation step (`mise activate zsh` / `bash` in the rc file) named explicitly as the line that often gets skipped and produces "command not found" half an hour later. Windows: install WSL2 first, then follow the Linux path. One line, one link, no PowerShell guide.
- Choosing the Node version. Node 24 is the current LTS in May 2026 with maintenance through late 2027; the course pins Node 24. Why LTS over Current: production SaaS doesn't ride the bleeding edge unless a feature is load-bearing. Native TypeScript stripping (the next topic) is available on Node 24.12 forward, so the LTS isn't the cost it used to be.
- Writing the first `.mise.toml` at the repo root: `[tools] node = "24"`. The `mise use --pin node@24` command as the shortcut that writes the file for you and pins the full version string. The `mise install` step that fetches the pinned version into the user's mise store. `mise current` to verify.
- **The three paths for executing `.ts`.** The senior question: how does `.ts` source actually execute. Three paths in 2026, each with a trigger that selects it.
- The default: native type stripping in Node. Stable since Node 25.2.0, backported to Node 24.12 and Node 22.18, no flag needed — `node hello.ts` Just Works. What it does mechanically: parses the file with OXC, removes type annotations, executes the resulting JavaScript. What it does not do: type-check (still `tsc --noEmit` for that), transpile (no JSX, no decorators, no enum lowering, no downlevel), and crucially, does not read `tsconfig.json` — so path aliases like `@/lib/...` will not resolve. Named in one line: native stripping is for the .ts files that don't need a tsconfig.
- The trigger that flips to `tsx`: any of path aliases from tsconfig, JSX outside a framework, decorators, enums, or downlevel-target needs. `tsx` reads `tsconfig.json`, handles path resolution, and stays a dev-dependency-only tool. Install (`pnpm add -D tsx` once the project has a `package.json`), invocation (`pnpm tsx script.ts`), and the watch mode (`pnpm tsx watch script.ts`) for dev scripts. The senior watch-out: `tsx` is a dev tool, not a production runtime — never ship a service that `tsx`s itself in production.
- The trigger that flips to `tsc`: shipping a library to npm, or CI type-checking the codebase. `tsc --noEmit` is the dedicated type-checker the course's CI will run on every PR; the actual `.js` output of `tsc` is what publishable packages ship. The course is an app, not a library — `tsc → .js` is mentioned and parked.
- One worked example end-to-end. Create `hello.ts` with a typed function. Run `node hello.ts` — works, output appears. Add a path alias and an import that uses it — `node` fails with a resolution error. Switch to `pnpm tsx hello.ts` — works. Run `pnpm tsc --noEmit` — works (type check passes). The student watches the three paths cleanly partitioned.
- Forward link: chapter 028 introduces pnpm and the project's `package.json`; from there, scripts like `pnpm tsx` and `pnpm tsc` live in the project. Next.js owns the .ts compilation pipeline for application code from chapter 028 onward.

What this lesson does not cover:

- Installing pnpm — that lands in lesson 2 of chapter 028 where the first real project earns it.
- Authoring `tsconfig.json` — that's lesson 4 of chapter 028.
- The `--experimental-transform-types` flag (still experimental, lowers TypeScript-only syntax like enums) — one line and a "reach for it when…" forward pointer; not the default.
- Bundlers (esbuild, swc, Turbopack) — Next.js handles application bundling end-to-end starting in chapter 028.
- One sentence on `ts-node`: legacy, deprioritized, replaced by `tsx` for dev and by native Node for the basics. Named so the student recognizes it in older docs and doesn't reach for it.

Pedagogical approach:

Decision archetype with a small worked-example beat. Open with the framing — the student has been on the playground, now they're moving to local files, here's the runtime and the three paths to execute `.ts`. A `Steps` block walks the mise install, the `.mise.toml` write, and `mise install`. Then a small `Figure` with a three-branch decision tree (Mermaid flowchart — "does it need path aliases / JSX / decorators? → tsx. Library? → tsc. Otherwise? → node directly") makes the partition visual. Then the worked example as a second `Steps` block: write the file, run `node hello.ts`, add the alias, watch it fail, switch to `tsx`, watch it pass, run `tsc --noEmit`. Each step is one command and one labeled output block — students see the cause and effect. Close with a Matching or Dropdowns exercise: given five `.ts` script scenarios ("seed script, no aliases," "library publish," "one-off CLI with `@/lib` import," "CI type-check," "running JSX from a standalone script"), the student picks the right execution path for each.

Estimated student time: 35 to 40 minutes.

---

## Lesson 9 — Quizz

Top 10 topics to quiz:

1. Dot-access default vs. bracket-access triggers (dynamic key, non-identifier key) and the `Object.hasOwn` reach over `'foo' in obj` for own-property checks.
2. The three object-construction sugars (shorthand, computed keys, spread) and the "right-most key wins" rule on spread merge; `Object.groupBy` for string-keyed grouping.
3. The four ES2023 non-mutating array methods (`.toSorted`, `.toReversed`, `.toSpliced`, `.with`) as the React-state-safe twins of the mutating originals.
4. `.at(-1)` for last-element access and `noUncheckedIndexedAccess` requiring `?? fallback` or narrowing on `arr[i]` reads.
5. The eight array methods grouped by what they produce (transform, subset, reduce, find/test, side-effecting) and the four `for...of` triggers (async, early break, multiple statements, custom step).
6. The `.filter` type-predicate shape (`(x): x is T => ...`) needed to narrow `(T | null)[]` to `T[]`.
7. The triggers that earn `Set` (dedup, membership check inside a loop, set algebra) and `Map` (non-string keys, frequent insert/delete, insertion-order contract); the ES2025 Set methods (`union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`).
8. `WeakMap` for GC-coupled identity-keyed caches; the serialization watch-out (`JSON.stringify(new Map())` returns `'{}'`).
9. The iteration protocol (`Symbol.iterator`, `.next()` returning `{ value, done }`), `for...of` as the default, the ban on `for...in`, and the ES2025 `Iterator.prototype` lazy helper surface (`Iterator.from(...).filter(...).take(n).toArray()`) for lazy/large/short-circuit sources.
10. The 2026 regex flavor: named capture groups, the `u` and `v` flag distinction, `\p{Letter}` property escapes over `[a-zA-Z]` for human text, the `.match`-with-`g` vs. `.matchAll` asymmetry, and the "drop the regex for a parser" threshold (URL, JSON, email-via-Zod).

---

## Total chapter time

Roughly 195 to 225 minutes across the six content lessons plus the quiz. The chapter splits naturally across two sittings — lesson 1 of chapter 003 + lesson 2 of chapter 003 + lesson 3 of chapter 003 (the object/array spine) as one evening, lesson 4 of chapter 003 + lesson 5 of chapter 003 + lesson 6 of chapter 003 (the conditional containers and the regex tool) as the second. The quiz closes the chapter in 15 to 20 minutes. At the end the student picks the right container by reflex, reaches for the senior method on each, recognizes the React-state-forbidden mutating methods, knows the threshold at which `Set` and `Map` earn their place, and writes Unicode-correct regex without reaching for it where a parser belongs.

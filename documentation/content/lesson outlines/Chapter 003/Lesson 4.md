# Lesson 4 — When Set and Map earn their weight

## Title and sidebar label

- **Title (h1):** `When Set and Map earn their weight`
- **Sidebar label:** `Set, Map, WeakMap`

## Lesson framing

Fourth lesson in Chapter 003. L1 installed the **object as workhorse record**, L2/L3 installed the **array** as ordered list with its non-mutating update family and method surface. L3 closed with a one-snippet foreshadow: when a `.filter` callback uses `.includes`, the senior reflex drops to a `Set`. This lesson cashes that promise and extends it. The student leaves with a four-way pick (object, array, `Set`, `Map`) keyed off concrete triggers, the ES2025 Set composition surface that retires the lodash habit, `Map.groupBy` as the non-string-key cousin of `Object.groupBy`, and `WeakMap` parked at its narrow edge.

Chapter 003 threads that govern this lesson:

- **Decisions before syntax.** Open with three failure shapes — `objMap[userInput]` colliding with `Object.prototype.toString`, a 10k×200 nested-`.includes` chewing 2M comparisons, a `JSON.stringify(new Map())` returning `'{}'` over the wire. The container choice is the fix in all three.
- **Defaults before conditionals; trigger before tool.** Object literal is still the default record (L1). Array is still the default ordered list (L2). `Set` and `Map` each have *named thresholds* the default crosses before the student reaches for them. State each trigger as a sentence, not a paragraph.
- **Immutability where the framework requires it.** `Set` and `Map` are *mutable* containers (`.add`, `.set`, `.delete` mutate in place). The ownership rule from L2 carries: mutate locally inside a function that owns the instance; for shared/React-state cases, build a fresh instance with `new Set(prev).add(x)` or `new Map(prev).set(k, v)`. One paragraph, no preaching.
- **TypeScript-flavored, inference-led.** `Map.get(k)` returns `V | undefined` even on `Map<K, V>` — the same undefined-discipline the chapter already established under `noUncheckedIndexedAccess` (L1, recalled via `<Term>`). One sentence connects the two.
- **Forward links land softly.** LRU cache idiom (Unit 14), Drizzle dedup transforms (Unit 5), TanStack Query's `WeakMap`-keyed internal cache (Unit 15, named only), serialization deep treatment (Ch 009 L1).

**Mental model the student should end with:** Container choice is a four-way decision keyed off two questions — *what shape are the keys?* and *what operation dominates?* Plain objects are records with known string-keyed fields; plain arrays are ordered lists you walk. The instant the keys aren't strings, or insertion/deletion dominates, or you need set algebra, or membership is checked inside a hot loop — you've crossed a named threshold and `Set`/`Map` is the right tool. `WeakMap` exists for one narrow shape: caching metadata per object instance where you want the cache to disappear with the object.

**Common beginner mistakes this lesson prevents:**
- Using `{}` as a map keyed by user input — gets `__proto__` collisions and inherited keys leaking through (handled via `Object.hasOwn` in L1, but the senior reach is `Map` for any user-controlled key space).
- Reaching for `arr.includes(x)` inside a `.filter` over a 10k-row list when a `Set` of 200 IDs would turn `O(n × m)` into `O(n + m)`.
- Writing `Array.from(new Set([...a, ...b]))` to compute a union when ES2025 has `a.union(b)`.
- Hand-rolling `_.intersection`-style helpers (or installing lodash) when seven Set composition methods now ship native.
- `JSON.stringify(new Map())` returning `'{}'` and the data silently disappearing across a wire boundary.
- `Map.get(k)` typed `V`, then a runtime `undefined` blowing up downstream — the student needs the same `?? fallback` reflex as `arr[i]`.
- `WeakMap` for "private state per instance" when class private fields (`#field`) are the modern reach.
- `Object.groupBy` over events keyed by `Date` and being surprised every group key is `"Mon Jan 01 2026..."` because objects coerce keys to strings — needs `Map.groupBy`.
- Mutating a `Set` or `Map` held in React state with `.add`/`.set` and expecting a re-render (same trap as `arr.push` from L2).

**Archetype:** Decision archetype. Open with the three bug shapes that motivate the lesson, then a decision tree (Mermaid `flowchart LR`) that maps the four containers to their triggers. Walk `Set` (with the ES2025 composition surface as the headline), then `Map` (with `Map.groupBy` as the headline), then `WeakMap` (parked at the narrow edge in one short subsection). The serialization watch-out and `Map.get` undefined-discipline get their own short beats. Close with a `<Buckets>` exercise sorting eight data shapes into the four containers — the sort *is* the senior-reflex install.

**Seed domain:** continue the chapter thread. `invoices`, `customers`, `orders` with `id`, `amountCents`, `status`, `customerId`, `dueDate`. New domain additions earned by this lesson: a `Set<string>` of selected invoice IDs (multi-select UI shape), a `Map<string, Invoice>` lookup by ID, a `Map<Date, Invoice[]>` grouping by due date.

**Estimated student time:** 35 to 40 minutes (per chapter outline).

---

## Lesson sections

### Section 1 — Introduction (no h2, lesson lead)

Two short paragraphs (no header). Opens with three bug shapes — the *spectrum* of failures plain `{}` and `[]` produce once the data outgrows them.

- **Bug 1 (4-5 lines):** `const cache: Record<string, User> = {}; ... cache[userInput]` — the lookup returns `Object.prototype.toString` (a function) when `userInput === 'toString'`. The prototype chain leaks (L1 named this; here it's the *trigger to switch container*).
- **Bug 2 (5-6 lines):** the L3 foreshadow restated — `bigArr.filter((x) => smallArr.includes(x.id))` over `bigArr.length === 10_000` and `smallArr.length === 200` is `O(n × m)` = 2M comparisons.
- **Bug 3 (3-4 lines):** `JSON.stringify(new Map([['k', 1]]))` returns `'{}'`. The Map's data evaporates the moment it crosses a wire. Frame: serialization assumes the container has the right shape; `Map` doesn't.

Frame the lesson: each bug has a *container choice* as its fix, not a defensive code reflex. By the end, the student knows the four-way pick and the named threshold that flips each direction.

**Pedagogical reasoning:** the chapter's "syntax follows failure" filter demands a bug-first opening. Three bugs (not one) because the lesson teaches three distinct triggers (membership, key shape, serialization) — one bug per trigger plants the seed for the corresponding section.

---

### Section 2 — The four-way pick

**h2:** `Four containers, four questions`

This is the lesson's spine and the central decision-archetype beat. A Mermaid `flowchart LR` decision tree mapping incoming data shape → container choice.

**Diagram (Mermaid `flowchart LR`, wrapped in `<Figure>`):**

```
Are the keys dynamic / user-controlled / non-string?
├─ Yes → Map (or WeakMap if keys are objects and you want GC coupling)
└─ No  → Is the collection a set of unique values (no associated payload)?
         ├─ Yes → Set
         └─ No  → Is the collection an ordered list you'll walk?
                  ├─ Yes → Array  (L2/L3)
                  └─ No  → Object literal as record  (L1)
```

The diagram is intentionally a flowchart with concrete English questions at each branch, not abstract type-theory boxes. The student should be able to read top-to-bottom and arrive at one container.

After the diagram, restate the four picks as one paragraph each, two-or-three sentences:

- **Object literal** — known string-keyed fields, the shape is the contract. Default record (L1).
- **Array** — ordered, walked, indexed. Default list (L2).
- **`Set`** — unique values, membership and algebra dominate. This section's first new container.
- **`Map`** — keyed lookup where keys aren't fixed strings, insertion/deletion is frequent, or insertion order is a *contract* the reader can depend on.

**Term:** Define `dictionary` via `<Term>` on first use as "an unordered collection of key→value pairs where the key set is unbounded or unknown at write time" — contrasts with `record` (defined L1 as a known-field shape). This terminology lets later prose say "use `Map` for dictionaries, object literal for records" tersely.

**Pedagogical reasoning:** the chapter outline explicitly names this as the "four-way pick (object, array, `Set`, `Map`) as a small decision-tree diagram." The Mermaid flowchart matches the diagram-engine pick (per `INDEX.md`: decision trees → Mermaid `flowchart LR`). The terminology pair (record / dictionary) is the most-leveraged conceptual install in the lesson — once a student internalizes "record vs dictionary," every other choice falls out.

---

### Section 3 — Set: the three triggers

**h2:** `Set: dedup, membership, algebra`

The senior-reflex section for `Set`. Three triggers, each with one snippet.

#### h3: `Dedup`

- One-liner: `Array.from(new Set(arr))` is the canonical dedup idiom for arrays of primitives.
- One short `.ts` block: dedup a list of customer IDs (`string[]`) that came back with duplicates.
- One sentence on the SameValueZero equality `Set` uses for membership (`NaN` matches `NaN`, `+0` matches `-0`) — recall L1's `Object.is`/`===` distinction in one inline ref. No re-derivation.

#### h3: `Membership inside a loop`

- The L3 foreshadow cashed in. `arr.includes(x)` is `O(n)`. `set.has(x)` is `O(1)`. The instant the membership check sits inside another loop (`.filter`, `for...of`, `.map`), the senior reflex builds a `Set` outside the loop and `.has`-checks inside.
- One `<CodeVariants>` block (two tabs):
  - **Tab 1 — Naive (O(n × m)):** `bigInvoices.filter((i) => watchedCustomerIds.includes(i.customerId))` with a comment naming the 10k × 200 = 2M comparisons.
  - **Tab 2 — Set-fronted (O(n + m)):** `const watched = new Set(watchedCustomerIds); bigInvoices.filter((i) => watched.has(i.customerId))` — same result, ~2k operations.

#### h3: `Set algebra (ES2025)`

- The headline beat. Seven methods that ship native in 2026 and retire the lodash habit. State the support pin in one inline sentence: Baseline Newly Available since June 2024, present in every current browser and Node 22+. The course's pinned runtime is Node 24 LTS (L8 forward-ref), so this is universally available.
- Two-column compact list:
  - **Returns a `Set`:** `a.union(b)`, `a.intersection(b)`, `a.difference(b)`, `a.symmetricDifference(b)`.
  - **Returns a boolean:** `a.isSubsetOf(b)`, `a.isSupersetOf(b)`, `a.isDisjointFrom(b)`.
- One `.ts` snippet (5-7 lines): `const activeIds = new Set(activeInvoiceIds); const flaggedIds = new Set(flaggedInvoiceIds); const needsReview = activeIds.intersection(flaggedIds);` — one expression each for `.intersection`, `.difference`, `.isDisjointFrom`.
- One sentence: the *other* operand isn't required to be a `Set` — it's any **set-like** object (one with `.size`, `.has`, and `.keys()` — a `Map` itself qualifies). Watch-out parked, not elaborated.

**Component:** one `<CodeVariants>` block in subsection 2, one fenced `.ts` block in subsection 3, two short fenced `.ts` blocks in subsection 1. No `AnnotatedCode` — the methods stand on their own and don't need stepped focus.

**Pedagogical reasoning:** the three triggers map cleanly onto three subsections, and the `<CodeVariants>` on the membership trigger is the load-bearing performance demonstration the lesson promised in the opener. The ES2025 surface gets the most space because it's the genuinely new senior tool — every other beat in this section is "the senior already knew this; here's why the trigger fires."

---

### Section 4 — The Set API touch points

**h2:** `The Set surface a senior writes`

Tight reference subsection. The full daily surface in one fenced `.ts` block — a `Set` constructed, mutated, queried, iterated, sized — annotated with `// → ...` comments showing returns. No prose padding.

```ts
const selected = new Set<string>();         // empty, typed
selected.add('inv_1');                       // returns the Set (chainable)
selected.add('inv_2').add('inv_1');          // 'inv_1' is unchanged; chain
selected.has('inv_1');                       // → true
selected.delete('inv_3');                    // → false (wasn't there)
selected.size;                               // → 2
for (const id of selected) { /* values */ }
const fromIter = new Set(['a', 'b', 'a']);   // → Set { 'a', 'b' }
```

One sentence after: `for...of` on a `Set` yields values (no keys, no index). For the rare paired form, `set.entries()` yields `[value, value]` pairs for compatibility with the `Map`-style consumer.

**Pedagogical reasoning:** a single annotated block lets the student scan the entire daily surface in one read. The L2 ownership rule applies: `set.add` mutates in place — fine for function-owned instances, wrong for React state (where `new Set(prev).add(x)` is the form). One inline sentence states this; the React state mechanics live in Ch 023.

---

### Section 5 — Map: the three triggers

**h2:** `Map: non-string keys, insert/delete, ordered contract`

Parallel structure to Section 3. Three triggers, three subsections. The headline beat is `Map.groupBy`.

#### h3: `Non-string keys`

- The senior question stated in one sentence: plain objects coerce every key to a string. `obj[someDateInstance]` becomes `obj["Mon Jan 01 2026 ..."]` and `obj[42]` becomes `obj["42"]`. `Map` keeps the key as the original value — same identity, same type.
- One short `.ts` block: a `Map<Customer, number>` mapping customer object → outstanding-invoice-count. Demonstrates that object identity is the key. No deep treatment of equality semantics (parked).
- One sentence on the SameValueZero equality (recall from Section 3's dedup), with the practical: two distinct `{}` literals are *different* keys even though they look identical, because identity is by reference.

#### h3: `Frequent insert and delete`

- One sentence: `Map` is engineered for the operation. Plain objects are a hash + a hidden-class optimization, and frequent insert/delete patterns can deoptimize. Don't measure-and-prove — the rule is "if you're inserting and deleting often, `Map` is the right tool by intent."
- No snippet; this is a one-paragraph trigger.

#### h3: `Insertion-ordered iteration the contract is allowed to depend on`

- Both `Map` and (in modern JS) plain objects iterate in insertion order. The difference is *semantic*: `Map` *promises* it in the spec; objects deliver it by current engine convention. When the contract is "process in insertion order," reach for `Map` — the reader sees the promise.
- One short snippet showing `for (const [k, v] of map) { ... }` destructuring iteration over a `Map` to highlight the `[k, v]`-pair shape that contrasts with `Set`'s values-only.

#### h3: `Map.groupBy (the headline)`

- The non-string-key cousin of L1's `Object.groupBy`. Stated as one sentence per the L1 forward-link: when the grouping key isn't a string (a `Date`, an object, a tuple), `Map.groupBy` is the right reach.
- Support pin in one inline sentence: ES2024, baseline since end of 2024, present in every current browser and Node 22+.
- One `.ts` snippet (5-6 lines): `Map.groupBy(invoices, (i) => i.dueDate)` returning a `Map<Date, Invoice[]>` grouping invoices by due date. The same example with `Object.groupBy` would have coerced each `Date` to its string form — call this out in one sentence.

**Component:** four h3 subsections. Three short fenced `.ts` blocks (one for non-string keys, one for ordered iteration, one for `Map.groupBy`). No `AnnotatedCode`, no `CodeVariants` in this section — the surface is enumerated, prose-led.

**Pedagogical reasoning:** the parallel structure with Section 3 (Set: three triggers) trains the student's expectation: each conditional container has *named* thresholds, and the lesson tells them what the thresholds are. `Map.groupBy` gets a dedicated h3 even though it's a single static — the L1→L4 parallel is the lesson author's reason for splitting `Object.groupBy` and `Map.groupBy` across two lessons, and this is the cash-in.

---

### Section 6 — The Map API touch points and the .get undefined discipline

**h2:** `The Map surface and the .get rule`

One annotated `.ts` block showing the daily Map surface — construct, set, get, has, delete, size, iterate. Then one short subsection on `.get` typing.

**The surface block** (one fenced `.ts` block, annotated with `// → ...`):

```ts
const byId = new Map<string, Invoice>();      // empty, typed
byId.set('inv_1', invoice);                    // returns the Map (chainable)
byId.set('inv_2', other).set('inv_3', third);  // chain
byId.get('inv_1');                             // → Invoice | undefined
byId.has('inv_99');                            // → false
byId.delete('inv_2');                          // → true (was there)
byId.size;                                     // → 2
for (const [id, inv] of byId) { /* pairs */ }
byId.keys();   byId.values();   byId.entries(); // iterator views
const fromPairs = new Map([['a', 1], ['b', 2]]);
```

#### h3: `Map.get always returns V | undefined`

- The senior question: even when the map is typed `Map<string, Invoice>`, `.get(k)` returns `Invoice | undefined`. TypeScript has no way to know at compile time *which* keys are present at runtime — the same reason `arr[i]` is `T | undefined` under `noUncheckedIndexedAccess` (recall via `<Term>` in one inline ref).
- Two senior reflexes for handling the miss:
  - **`??` fallback** when a default makes sense: `const inv = byId.get(id) ?? emptyInvoice;` (recall `??` from Ch 002 L5 in one inline ref).
  - **`.has`-then-`.get` only when the absence has to throw** — and even then, `.has` plus `.get` is slightly less idiomatic than `.get` plus a null check. State the rule and move on.
- One short snippet: `const inv = byId.get(id); if (inv === undefined) return; inv.amountCents` — the temp-binding-narrow pattern from L2, applied here.

**Pedagogical reasoning:** the L1+L2 prerequisite line ("`noUncheckedIndexedAccess`-style discipline") makes `.get` feel familiar instead of surprising. Naming the connection explicitly (in one sentence, via `<Term>` recall) is the senior insight the lesson is here to install. The two-reflex rule (`??` fallback first, temp-binding-narrow second) gives the student a default form to reach for.

---

### Section 7 — WeakMap at the narrow edge

**h2:** `WeakMap: caches that die with the object`

Short section (~one screen of prose plus one snippet). The whole point is "park this here; reach for it only when the trigger fires."

**Content:**

- The key difference from `Map`: `WeakMap` keys are *weakly* held. When the only remaining reference to the key is the `WeakMap` entry, the GC reclaims the entry. The container vanishes with the object.
- The two hard constraints (named, not lingered on): keys must be objects (not primitives), and `WeakMap` is **not iterable** and has **no `.size`** — entries can disappear at any time, so iteration would be unsound.
- **The one trigger that earns it:** caching computed metadata per object instance, where the cache should not prevent the object from being garbage-collected. One concrete example, one snippet.

**One snippet (4-6 lines):** a memoization cache keyed by a DOM node — the senior pattern. The student doesn't need to write DOM code yet (Unit 2+); the snippet is a *recognition* shape.

```ts
const measurements = new WeakMap<HTMLElement, DOMRect>();
const getRect = (el: HTMLElement): DOMRect => {
  const cached = measurements.get(el);
  if (cached) return cached;
  const rect = el.getBoundingClientRect();
  measurements.set(el, rect);
  return rect;
};
```

- One sentence: when the element is removed from the DOM and no other code holds it, the cache entry is reclaimed automatically — no manual `.delete`, no leak.
- One sentence parking `WeakSet`: the set cousin, narrower still, mostly for "have I already processed this object?" checks. Named for recognition; the course rarely writes it.
- One sentence parking "private state per instance" — the historical `WeakMap` use case obsoleted by class private fields (`#field`), forward-link to Ch 009.

**Component:** one fenced `.ts` block. No diagram (the GC behavior is best stated as a sentence, not visualized).

**Pedagogical reasoning:** the chapter outline says `WeakMap` lands "at the narrow edge" with one paragraph for caches and one for private-state-obsolete. The DOM-node-keyed cache is the most legible production shape for the recognition snippet — even though DOM lessons land later, the *idea* (object as key, cache disappears with the object) is the lesson.

---

### Section 8 — Serialization: Map and Set don't survive JSON

**h2:** `Map and Set don't survive JSON.stringify`

Load-bearing watch-out. Short section, one snippet, one rule.

**Content:**

- The bug shape (re-stated from the opener): `JSON.stringify(new Map([['k', 1]]))` returns `'{}'`. Same for `new Set([1, 2, 3])`. The container's data vanishes silently — no error, no warning, just an empty object on the wire.
- Why: `JSON.stringify` only serializes own enumerable properties. `Map` and `Set` store their data in internal slots the serializer can't see.
- **The fix is to convert at the boundary**, not to avoid the container:
  - **`Map` → `[k, v][]`:** `Array.from(map)` gives the canonical array-of-pairs form. `new Map(array)` round-trips it back.
  - **`Map` → object:** `Object.fromEntries(map)` gives a plain object when keys are strings (recall the `Object.fromEntries` round-trip from L1 in one inline ref).
  - **`Set` → array:** `Array.from(set)` (recall the dedup idiom from Section 3). `new Set(array)` round-trips it.
- One `<CodeVariants>` block (two tabs) showing the wrong vs right shape across a wire boundary (`fetch` body):
  - **Tab 1 — Disappears:** `await fetch('/api/save', { method: 'POST', body: JSON.stringify({ selected: new Set(['a', 'b']) }) })` — server receives `{ "selected": {} }`.
  - **Tab 2 — Survives:** `await fetch('/api/save', { method: 'POST', body: JSON.stringify({ selected: Array.from(new Set(['a', 'b'])) }) })` — server receives `{ "selected": ["a", "b"] }`.

- One forward-link sentence: deep serialization treatment (`structuredClone`, `Date` round-trips, `Temporal` encoding) is Ch 009 L1.
- One sentence on the RSC boundary: the React Server Component wire *does* accept `Map` and `Set` (and `Date`, `BigInt`, typed arrays) via structured clone — but this lesson is about `JSON.stringify`, which is the form that hits real wire boundaries (fetch, localStorage, query params, Server Action serializers in some cases). Forward-ref to Ch 028+ for the RSC nuance; don't elaborate.

**Component:** one `<CodeVariants>` block. The `<Aside type="caution">` wrapper is appropriate around the block's intro paragraph — the watch-out is the section's whole reason for existing.

**Pedagogical reasoning:** the chapter outline explicitly names "the serialization watch-out lands in a callout." The `<CodeVariants>` form (rather than two adjacent fences) frames the fix as a *choice between two shapes* the student makes at the boundary, which is the senior framing. The RSC clarification matters because students who later read about Server Components shipping `Map`/`Set` might think this watch-out is wrong — heading off the confusion with one sentence is worth the line.

---

### Section 9 — Forward links

**h2:** `Where this lands later`

Tight bulleted list — one sentence each per the chapter outline.

- The LRU cache idiom (Unit 14, cache and rate-limiting) builds on `Map`'s insertion-order contract — `map.delete(k); map.set(k, v)` is the touch-to-MRU pattern.
- Drizzle result-set transforms (Unit 5) use `Set` for dedup and `Map` for ID-keyed lookup before the response.
- TanStack Query's internal cache uses `WeakMap`-keyed metadata for query references — named only; the course doesn't write it.
- Deep serialization treatment (`structuredClone`, `Date` round-trips, `Temporal` codecs) lives in Ch 009 L1.
- `Map.groupBy` and `Object.groupBy` are the two faces of the groupBy pattern — string keys → `Object`, anything else → `Map`. The L1+L4 pair.

Format as a bulleted list. No code samples.

**Pedagogical reasoning:** chapter framing demands soft forward links. Each anchors the surface to a real later use site.

---

### Section 10 — Buckets exercise (closing)

**h2:** `Pick the right container`

The chapter outline's named closing exercise. A `<Buckets twoCol>` block sorting eight data-shape descriptions into the four containers. The sort *is* the senior-reflex install — the whole lesson collapsed to a single classification drill.

**Setup:**

- **Buckets (four):**
  - `obj` — **Object literal** ("known string-keyed fields; the shape is the contract")
  - `arr` — **Array** ("ordered, walked, indexed; same-type elements")
  - `set` — **`Set`** ("unique values; membership or set algebra dominates")
  - `map` — **`Map`** ("dynamic keys, frequent insert/delete, or non-string key types")
  - (Stretch: a fifth `weakmap` bucket — **`WeakMap`** ("object-keyed cache that should disappear with the object") — *optional* and only if eight items distribute cleanly to five buckets. The writer's call. Eight items into four buckets is the cleaner version; the `WeakMap` shape is reinforced by Section 7's snippet anyway.)
- **Eight items (intent-phrased, mix of clear and intentionally hint-shaped):**
  1. "The currently signed-in user's profile fields (`id`, `email`, `name`)" → `obj`
  2. "The list of invoices in display order on the dashboard" → `arr`
  3. "The set of selected invoice IDs in a multi-select UI" → `set`
  4. "Lookup table from order ID to row, used for `O(1)` reads inside a render loop" → `map`
  5. "Tags applied to a post, deduplicated as the user types" → `set`
  6. "Cache of computed bounding-box metadata per DOM node, that should disappear when the node leaves the page" → `map` (or `weakmap` if the optional fifth bucket is in)
  7. "A mapping from `Date` (the actual Date instance) to events scheduled on that day" → `map`
  8. "Count of how many times each word appears in a single paragraph of text" → `map` (string keys, but frequent insert/update is the trigger — *not* `obj`)

- **Pedagogical notes for the writer on item phrasing:**
  - Item 4's "used for `O(1)` reads inside a render loop" is the trigger phrase — without it, "lookup table from order ID to row" *could* be a plain object. With it, `Map` is the senior reach (frequent insert/delete in a long-lived structure).
  - Item 8 is the deliberate trap — string keys *could* live in an object, but "count … each word" implies frequent insert/update on a dynamic key space → `Map` is the senior reach. The lesson's "dictionary vs record" terminology pays off here.
  - If the optional fifth `weakmap` bucket is in, item 6 lands there; otherwise it lands in `map` with the writer adding a one-sentence post-grade callout in prose that `WeakMap` would be the *better* fit for the GC-coupling reason.

**Pedagogical reasoning:** `<Buckets>` is the exact component the chapter outline names. The 8-to-4 sort with intent-phrased items (no syntax, no code) tests whether the student can *read* the trigger language they just learned in Sections 3, 5, 7. The two trap items (4 and 8) are the load-bearing tests — they distinguish the student who memorized the four containers from the student who internalized the *triggers*.

---

### Section 11 — External resources

**h2:** `Further reading`

Small `<CardGrid>` with 3 `<ExternalResource>` cards. Keep tight.

- MDN — `Set` (the methods reference, includes the ES2025 composition methods).
- MDN — `Map.groupBy` (the static, with the keyed-grouping shape).
- web.dev — "The JavaScript Set methods are now part of Baseline" blog post (the support-baseline confirmation, published Jun 2024). Establishes the "you can use this everywhere" framing.

No video — surface is enumerated, central beat is a container-choice decision tree. (Matches L1 and L3's calls; L2 took one video on the React immutability angle, but this lesson has no equivalent visualization gap.)

**Pedagogical reasoning:** three cards is the chapter's tight default. The web.dev baseline post is the senior reassurance — students who learn ES2025 features often hesitate about support; one link with current authority resolves it.

---

## Scope

### What this lesson teaches

The four-way container pick (object literal, array, `Set`, `Map`) keyed off concrete triggers — `Set` for dedup / membership-in-a-loop / set algebra, `Map` for non-string keys / frequent insert-delete / insertion-order-as-contract. The ES2025 Set composition surface (`union`, `intersection`, `difference`, `symmetricDifference`, `isSubsetOf`, `isSupersetOf`, `isDisjointFrom`) as the lodash-retiring senior reach. `Map.groupBy` as the non-string-key cousin of `Object.groupBy` (L1). The daily API touch points for `Set` (`add`, `has`, `delete`, `size`, `for...of`, `new Set(iterable)`) and `Map` (`set`, `get`, `has`, `delete`, `size`, `for...of` yielding pairs, `.keys()`/`.values()`/`.entries()`, `new Map(pairsIterable)`). The `Map.get` undefined-discipline (`V | undefined` even when the map is typed `Map<K, V>`; handle with `??` or temp-binding-narrow). `WeakMap` parked at one narrow trigger: caches keyed by object identity that should disappear with the object — one DOM-element recognition snippet. The serialization watch-out (`JSON.stringify(new Map())` returns `'{}'`) and the boundary-conversion forms (`Array.from(map)`, `Object.fromEntries(map)`, `Array.from(set)`).

### What this lesson does NOT teach (handled elsewhere)

- **The iteration protocol (`Symbol.iterator`, `.next()` returning `{ value, done }`), `for...of`'s underlying mechanics, the ban on `for...in`, and the ES2025 lazy `Iterator.prototype` helpers** — Ch 003 L5. This lesson uses `for...of` on `Set` and `Map` instances; the *why* is L5.
- **Deep serialization (`structuredClone`, `Date` round-trips, the RSC wire's `Map`/`Set` acceptance, `Temporal` codecs)** — Ch 009 L1 owns serialization. The L4 callout is `JSON.stringify` only.
- **Production-grade LRU cache, TTL, and request-deduplication implementations** — Unit 14 (cache and rate-limiting). Named in the forward links.
- **The full reflective surface of `Map`/`Set` (custom equality, hash, SubclassConstruct semantics)** — none of it is on the daily senior path. Named in one sentence at most.
- **`SharedArrayBuffer`, concurrent data structures, atomics** — out of scope for the course.
- **React `useState` mechanics for `Set` and `Map`** — Unit 3 / Ch 023 owns React state. The L2 "ownership rule" is recalled in one inline sentence (mutate locally, replace when shared); the `new Set(prev).add(x)` / `new Map(prev).set(k, v)` shape is named for recognition only.
- **Class private fields (`#field`)** as the modern replacement for `WeakMap`-based private state — Ch 009 L2 (classes). Named in one sentence in Section 7.
- **`Object.create(null)` for prototype-less maps** — L1 parked it. This lesson's senior answer to "I want a clean dictionary" is `Map`, not prototype-less objects.

### Prerequisite recalls (one sentence each, no re-derivation)

- `Object.groupBy(items, keyFn)` for string-keyed grouping (Ch 003 L1) — this lesson's `Map.groupBy` is its non-string-key cousin.
- The prototype-chain risk on `obj[userInput]` lookups (Ch 003 L1) — the trigger for "use `Map`, not `{}`, when keys are user-controlled."
- `Object.fromEntries(entries)` for `[k, v]`-pair-to-object conversion (Ch 003 L1) — Section 8 recalls it for the `Map → object` boundary conversion.
- `noUncheckedIndexedAccess` makes `arr[i]` return `T | undefined` (defined Ch 003 L1, recalled L2/L3) — Section 6 connects `.get(k) → V | undefined` to the same discipline via `<Term>` recall.
- The L2 ownership rule: mutate locally, replace when shared — recalled in Section 4's intro to the Set surface in one sentence.
- `??` returns the right-hand side on `null` / `undefined` (Ch 002 L5) — recalled in Section 6 for the `.get(k) ?? fallback` form.
- `Array.from(iterable)` (Ch 003 L2) — recalled in Section 3 (dedup) and Section 8 (`Map`→pairs conversion).
- `for...of` as the default loop, with `[k, v]` destructuring in the binding (Ch 002 L4, recalled L3) — used in the Map surface snippet without re-deriving.

---

## Code conventions alignment

All snippets:
- `.ts`, single quotes, 2-space indent, semicolons on, trailing commas multiline.
- `const fn = (...) => ...` arrow form for all named functions and callbacks.
- Inference-led — annotate only when the snippet's point is the type shape. The Map/Set surface snippets in Sections 4 and 6 annotate the generic (`new Set<string>()`, `new Map<string, Invoice>()`) because the *type-parameter-on-construction* shape is the lesson; locals stay inferred.
- Semantic domain names — `invoices`, `invoice`, `amountCents`, `status`, `customerId`, `dueDate`, `selected`, `watched`, `flagged`. Continue the chapter seed.
- Predicate-named booleans (`isSubsetOf`, `isDisjointFrom`) are inherited from the spec; no rewrites.
- `Map<K, V>` and `Set<T>` generic forms always present at construction in production-shape snippets — TypeScript's inference for `new Map()` widens to `Map<any, any>` without the annotation (a `strict` violation), and the explicit form is the senior reflex.
- The Section 7 `getRect` snippet uses arrow form bound to `const` for the named function, with annotated parameter and return type as it'd be in production (`(el: HTMLElement): DOMRect`).
- The Section 8 `<CodeVariants>` `fetch` snippet uses single quotes for URL strings and the conventional `{ method, body }` options-object shape (matching Ch 002 L2's two-positional-parameter rule).

**Deliberate divergences from production-grade conventions for pedagogy:**

- The Section 4 and Section 6 surface-tour blocks use one-block-per-container density with `// → ...` return annotations — production code would scatter these touch points across actual call sites. The combined block is for surface scanning, not imitation.
- The Section 5 `Map<Customer, number>` snippet uses an object-keyed map purely as a *recognition* example for the non-string-key trigger. In production SaaS code the senior reach is almost always to key by the customer *ID* (a string) and use a plain `Map<string, number>` or `Record<CustomerId, number>` — but the object-key shape is what makes `Map`'s "keys keep their identity" point legible.
- The Section 7 `WeakMap` snippet shows DOM-element keys before the DOM lessons land. The snippet is for *recognition*, not for the student to write today.
- The Section 8 `<CodeVariants>` "Disappears" tab is deliberately wrong — it exists to be shown alongside the fix, not to be copied. One inline comment names it as the bug shape.

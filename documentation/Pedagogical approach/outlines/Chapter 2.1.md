## Concept 1 — Names point to values; primitives copy, references share

**Why it's hard.** Students learned `=` as "duplicates the value" from earlier languages or from informal exposure. Until that mental model is replaced, every later React-state, server-action, and immutability discussion has to fight the same misconception. The fix is a single diagram so vivid the student visualizes it whenever they read `=`.

**Ideal teaching artifact.** A Concept artifact: a small annotated diagram showing two named bindings (`user` and `clone`) sitting on the left, and the value space on the right. When the value is a primitive, each binding owns its own box; when the value is an object, the two arrows merge into the same box. The student sees the two regimes side by side in one frame, against the same syntax (`const clone = user`), so the asymmetry of `=` is unavoidable. This diagram is the chapter's spine — Concept 12 (`const`) refers back to it, so the visual has to be load-bearing the first time it lands.

**Engagement.** A `PredictOutput` round with four short snippets — primitive reassignment, primitive mutation attempt, object reassignment, object property mutation — where the student commits to "caller sees the change" or "caller doesn't" before the output reveals.

**Components.**
- Hand-authored SVG inside `Figure` for the binding diagram. Sentence-case caption. The diagram is referenced again in Concept 12, so the SVG earns its weight without needing interactivity.
- `PredictOutput` for the four-snippet recall.

---

## Concept 2 — A function reassigning a parameter is not a function mutating a property

**Why it's hard.** "JavaScript passes objects by reference" is half-truth folklore that hides the real rule. Students who hold that summary write defensive copies they don't need *and* mutate properties they shouldn't, because they can't distinguish the two cases at the call site.

**Ideal teaching artifact.** A Mechanics artifact in `CodeVariants` form: two tabs, both showing a function that takes an object and "modifies" it. Tab 1 reassigns the parameter (`user = { name: 'new' }`); Tab 2 mutates a property (`user.name = 'new'`). Adjacent to each, the caller's `console.log(user.name)` output. Identical-looking code, opposite outcomes — the student reads the divergence directly from the two outputs. Brief prose names the rule once: every call passes a copy of the binding, but for objects the copied binding still points at the original allocation.

**Engagement.** A two-question `MultipleChoice`: for each variant, "what does the caller see?" with the wrong answer being the one a student who memorized "objects pass by reference" would pick.

**Components.**
- `CodeVariants` for the two function shapes.
- `MultipleChoice` for the recall round.

---

## Concept 3 — Shallow copies leak; `structuredClone` is the deep-copy default

**Why it's hard.** Students who know spread think they've solved copying. The bug is one level down: nested objects still share allocations after `{ ...obj }`. And the legacy `JSON.parse(JSON.stringify(x))` reflex silently drops `Date`, `Map`, `BigInt`, and `undefined`, so reaching for it as a deep copy introduces a different bug class.

**Ideal teaching artifact.** A Mechanics artifact built on a small interactive widget the student pokes. Three copy strategies sit side by side as buttons — *spread*, *structuredClone*, *JSON round-trip*. A fixed source object with one nested address record and one `Date` field is displayed on the left. The student picks a strategy, then clicks "mutate `copy.address.street`" and "log `original.address.street`": the source-mutation pulse propagates (or doesn't) into the original, and the `Date` field shows up correctly typed (or stringified, or missing). Each strategy's failure mode lands as an observed consequence, not a memorized list.

**Engagement.** A `Buckets` sort of six value shapes (`{ user, address }`, a `Map<string, Item>`, a class instance with methods, a payload to send to a Server Action, a config with `undefined` defaults, a tree with cycles) into *spread is enough*, *needs `structuredClone`*, *can't be cloned — refactor the shape*.

**Components.**
- New: **`CopyStrategyExplorer`** — see Component proposals. Forward-link is real (Server Action serialization in 5.2.4, JSON wire boundary in 2.9.1), so the bespoke component is justified over an SVG.
- `Buckets` for the recall sort.

---

## Concept 4 — `===` on objects compares allocations, not shapes

**Why it's hard.** Two object literals that look identical produce `false` under `===`, and students who haven't internalized reference identity blame the operator. The same misconception is the root of every "why did my React component re-render" question three units from now.

**Ideal teaching artifact.** A Mechanics artifact: two short snippets in adjacent code blocks with their `===` results shown as output. The first compares two distinct object literals with identical contents (`false`); the second compares a single object against a binding pointing at the same allocation (`true`). One sentence connects this back to the binding diagram from Concept 1 — the operator is asking "do these two arrows point at the same box," not "do these two boxes look alike."

**Engagement.** A `Tokens` exercise on a six-line snippet where the student clicks every `===` whose result is `true`. The decoys are the visually-identical-but-different-allocation comparisons.

**Components.**
- `Code` blocks for the two snippets with adjacent output.
- `Tokens` for the recall click.

---

## Concept 5 — `NaN` and `==`: the two equality forms a senior actually picks between

**Why it's hard.** `NaN !== NaN` is a fact about IEEE 754 that students will hit and Google. The lazy fix — `==`, or the global `isNaN`, or a comparison library — introduces worse bugs. The senior rule is small (`Number.isNaN` for NaN, `Object.is` only for memo-key identity, `==` never), but only sticks if the student feels the trap first.

**Ideal teaching artifact.** A Decision artifact framed as a five-row "what does this return?" table the student fills in. Rows: `NaN === NaN`, `Number.isNaN(NaN)`, `isNaN('hello')` (the coercion trap), `Object.is(+0, -0)`, `null == undefined`. The student commits to each answer before the reveal, then a tight prose paragraph names the rule the table forces: prefer the `Number.*` namespaced predicates, reach for `Object.is` only when bit-pattern identity is the point, never write `==`.

**Engagement.** The table itself is the engagement — five `PredictOutput` rounds delivered in one tight block, then a one-sentence rule the student must restate as a `MultipleChoice` ("which form is correct for checking that a user-entered string parses to a real number").

**Components.**
- `PredictOutput` for the five-row table.
- `MultipleChoice` follow-up for rule recall.

---

## Concept 6 — Why `0.1 + 0.2` isn't `0.3`: floats can't represent most decimal fractions

**Why it's hard.** The bug is famous, the explanation isn't. Most explanations either skip the cause ("floats are weird") or drown the student in IEEE 754 bit layouts. The teaching has to land the *cause* — non-terminating binary expansions of decimal fractions — at exactly the depth that justifies the integer-cents rule in Concept 7, no deeper.

**Ideal teaching artifact.** A Concept artifact: a hand-authored SVG showing the analogy in one frame. On the left, base-10 attempting to write `1/3` and trailing off as `0.333...`; on the right, base-2 attempting to write `0.1` and trailing off as `0.0001100110011...`. The truncation happens at the 52-bit mantissa boundary. The student sees that `0.1` is to binary what `1/3` is to decimal — a fraction that can be named exactly only in another base. One sentence drives the consequence: every `number` arithmetic on a non-power-of-two fraction can round, and the rounding accumulates.

**Engagement.** A `PredictOutput` on three subtle cases the student didn't see coming — `0.1 + 0.2`, `0.1 * 3`, `0.2 + 0.4` (which surprisingly does equal `0.6`) — to lock in that the corruption is structural and inconsistent, not "JavaScript is broken."

**Components.**
- Hand-authored SVG inside `Figure` for the base-10/base-2 truncation diagram. Single-use, no forward-link — but the alternative is a wall of prose that doesn't teach. SVG is the right choice; demoted bespoke alternative listed below.
- `PredictOutput` for the three-case recall.

---

## Concept 7 — Integer cents, formatted at the boundary

**Why it's hard.** The rule is one sentence but the student has to feel where the boundaries are — input parsing, storage, arithmetic, display. A student who learns "store as cents" without learning "convert at the input boundary and only there" still mixes float dollars with integer cents three lines later.

**Ideal teaching artifact.** A Pattern artifact: a small "money pipeline" diagram showing the four stations — user input (`'$19.95'`), boundary conversion (`Math.round(Number(input) * 100)` → `1995`), storage and arithmetic (always integer), display formatting (`(1995 / 100).toFixed(2)` → `'19.95'`). Each station is labeled with what the value's type and unit are *at that point*. Adjacent, a `ScriptCoding` exercise where the student writes the boundary function `dollarsToCents(input: string): number` with `Number()`, `Number.isFinite`, and `Math.round`; tests cover `'19.95'`, `'19.999'`, `'abc'`, `''`, and a `Number.MAX_SAFE_INTEGER` edge.

**Engagement.** The `ScriptCoding` tests are the assessment — the student passes them or doesn't. A follow-up `Buckets` round sorts six SaaS values (cart total, 64-bit external ID, stock quantity, EUR price, exponential backoff delay, database row count) into *`number` is fine*, *integer cents*, *`BigInt`*, locking in Concept 7 and Concept 8 together.

**Components.**
- Hand-authored SVG inside `Figure` for the money pipeline. The four-station diagram is referenced in Unit 16 (Payments) implicitly when Stripe amounts come up — soft forward-link, keeps the SVG as the right call over a bespoke widget.
- `ScriptCoding` for the boundary function.
- `Buckets` shared with Concept 8.

---

## Concept 8 — `BigInt` earns its weight when `number` can't hold the value

**Why it's hard.** Students who hear about `BigInt` reach for it whenever an integer feels "big." But `BigInt` doesn't interoperate with `number`, breaks `JSON.stringify`, and is slower — it earns its weight only when the value genuinely crosses `Number.MAX_SAFE_INTEGER` or a 64-bit external ID arrives. The decision is small but the over-reach is common.

**Ideal teaching artifact.** A Decision artifact attached to the same `Buckets` sort from Concept 7 — the third bucket (*`BigInt`*) is the engagement here. Before the sort, three rows of tight prose: the *only* three sites that earn `BigInt` (64-bit external IDs, counters that cross 2^53, cryptographic arithmetic) and the costs (no `Math.*`, no JSON, no mixing). The sort confirms the student can apply the rule rather than recite it.

**Engagement.** The shared `Buckets` from Concept 7 is itself the recall — three of the six items belong in the `BigInt` bucket only if the student has internalized the threshold.

**Components.**
- `Buckets` (shared with Concept 7).

---

## Concept 9 — Three counts of string length, three different right answers

**Why it's hard.** Every junior thinks a string has *a* length. The reality is three counts — code units, code points, grapheme clusters — and each is correct for different questions. `string.length` happens to be the wrong answer for almost every user-facing length check, but students reach for it because it's the only one they were taught.

**Ideal teaching artifact.** A Mechanics artifact built as a side-by-side counter widget. The student types a string into one input; three live counters below show its `.length`, its `[...str].length`, and its `Intl.Segmenter` grapheme count. The widget seeds with the canonical demo inputs in dropdown buttons — `'hello'`, `'café'` (combining mark), `'🇺🇸'` (flag emoji, surrogate pair), `'👨‍👩‍👧‍👦'` (ZWJ family). For each seed, the three counters diverge dramatically. The student sees that the *only* count that matches what they see on screen is the segmenter. The prose names the rule beside the widget: code units for serialization, code points rarely, graphemes for everything user-facing.

**Engagement.** A `ScriptCoding` exercise: implement `countCharacters(input: string)` using `Intl.Segmenter`, with tests covering the four seed strings. The pass condition is the lesson's confirmation.

**Components.**
- New: **`StringLengthExplorer`** — see Component proposals. Forward-link to Zod string validation (Unit 7) and the i18n unit (Unit 18) makes the bespoke component compound.
- `ScriptCoding` for the implementation exercise.

---

## Concept 10 — Normalize at the storage boundary, compare on the normalized form

**Why it's hard.** Two visually identical strings can carry different byte sequences (precomposed `é` vs. `e` + combining acute), and `===` will say they're different. The bug surfaces as duplicate-name checks that pass and search queries that miss obvious matches. The fix is a one-line `string.normalize('NFC')` at the boundary, but the student has to first see the equality failure to believe it's needed.

**Ideal teaching artifact.** A Mechanics artifact: a short snippet showing two `café` literals (one composed, one decomposed) and `s1 === s2` evaluating to `false`. Then the same comparison wrapped in `s1.normalize('NFC') === s2.normalize('NFC')` evaluating to `true`. The rule lands in one sentence: normalize once at the database/wire boundary, never at every comparison site. The four normalization forms are named in a tight one-line-each table; `NFC` is the senior default.

**Engagement.** A `MultipleChoice` on where the `normalize('NFC')` call belongs in a three-step pipeline (form submission → DB write → later comparison) — the right answer is "at the write," not "at every read."

**Components.**
- `Code` block with the equality flip.
- `MultipleChoice` for the placement decision.

---

## Concept 11 — Tagged templates: why `sql` makes injection a deliberate act

**Why it's hard.** Students who learned SQL injection as a string-concatenation problem have a "sanitize inputs" reflex that does the wrong work. The tagged-template mechanic flips it: the dynamic values are *separated* from the static SQL at the syntax level, and the database client parameterizes them. The student has to see how the tag function receives its two arrays — segments and expressions — before the safety property reads as a structural consequence rather than a library promise.

**Ideal teaching artifact.** A Mechanics artifact with an `AnnotatedCode` walkthrough of a single `sql\`SELECT * FROM users WHERE id = ${userId}\`` call, stepped through three highlights. Step 1: highlight the backticks and call out that this is a function call in disguise. Step 2: highlight the static segments (`['SELECT * FROM users WHERE id = ', '']`) — what the tag receives as its first argument. Step 3: highlight `${userId}` and call out that this expression value arrives separately, never spliced into the SQL string, which is what makes parameterization automatic. A second `AnnotatedCode` (or paired second beat) does the same walkthrough on a `dedent\`...\`` example so the student recognizes the family.

**Engagement.** A `Matching` exercise pairing four template forms (plain interpolation, multi-line with indentation, parameterized SQL, aligned multi-line with stripped indentation) to their correct tag (none, none, `sql`, `dedent`). Recognition is the win — the student doesn't author tag functions, they read them in the rest of the course.

**Components.**
- `AnnotatedCode` for the `sql` walkthrough (and a paired one for `dedent`).
- `Matching` for the recall pairing.

---

## Concept 12 — `const` locks the arrow, not the box

**Why it's hard.** `const config = { feature: true }` followed by `config.feature = false` mutating successfully is the bug class. Students who think `const` means "constant" mutate the value, get away with it, and learn the wrong lesson. The fix is the binding diagram from Concept 1, repurposed.

**Ideal teaching artifact.** A Concept artifact: the same binding diagram from Concept 1, redrawn with one element added — a small padlock icon on the arrow (the binding) and an explicit *unlocked* state on the box (the value). One sentence connects it: `const` locks the arrow; the box is still as mutable as the value's type allows. Beside the diagram, a tight three-line clarification of where the *real* immutability tools live — `Object.freeze` (runtime, shallow, rarely the right reach), `readonly` and `as const` (compile-time, forward-link to 2.4.7). The TDZ and hoisting beats land in one short paragraph each — the student needs to recognize the `ReferenceError`, not memorize a hoisting table.

**Engagement.** A `Buckets` sort of eight binding situations (config object, `for` loop counter, `for...of` variable, accumulator sum, awaited result, array built incrementally, primitive constant, function reference) into *`const`*, *`let`*, or *could be either, prefer `const`*. This sort is the senior-reflex install — Biome's `useConst` rule will catch the rest, but the student has to internalize the decision first.

**Components.**
- Hand-authored SVG inside `Figure` — reuse of the Concept 1 binding diagram with the padlock overlay. Reuse is the point: the chapter has *one* spine diagram.
- `Buckets` for the eight-situation sort.

---

## Component proposals

- **`CopyStrategyExplorer`** — three-button widget showing a fixed nested source object on the left and a copy on the right; buttons pick the copy strategy (*spread*, *structuredClone*, *JSON round-trip*); student then triggers "mutate nested field" and "log original" to observe whether the mutation propagates, and inspects how `Date`, `Map`, and `undefined` survive each strategy.
  - Uses in this chapter: Concept 3.
  - Forward-links: Server Action serialization frame (Unit 5.2.4 — "what crosses a `'use server'` boundary"), JSON wire-boundary lesson (Unit 2.9.1), and the React state immutability beats (Unit 4.7.4, 4.8.2).
  - Leanest v1: hard-code the source object and three strategies; a single "mutate `copy.address.street`" button per strategy; render a diff-style "original after mutation" panel. No type-aware introspection, no user-editable source. v1 is meaningfully thinner than the full proposal and still passes the teaching bar — build v1.

- **`StringLengthExplorer`** — single text input plus three live counters (`.length`, code points, graphemes); a row of seed-input buttons (`'hello'`, `'café'`, `'🇺🇸'`, `'👨‍👩‍👧‍👦'`) the student can click to load the canonical divergence demos; locale dropdown for the segmenter is optional.
  - Uses in this chapter: Concept 9.
  - Forward-links: Zod string-length validation refinement (Unit 7), the i18n unit's grapheme-aware patterns (Unit 18), and any future user-facing input-length check in the course.
  - Leanest v1: text input, three counters, hard-coded seed buttons; no locale dropdown, no per-grapheme highlighting in the input. v1 carries the teaching — build v1.

---

## Build priority

Two new components, both with credible forward-links into later units. Rank:

1. **`CopyStrategyExplorer`** — highest reuse potential. The copy/clone/serialize question recurs across Units 2.9, 4, and 5; a component that lets the student *observe* what survives each strategy compounds into Server Actions and React state. Build first.
2. **`StringLengthExplorer`** — narrower reuse but the divergence is hard to teach statically. Build second, after `CopyStrategyExplorer`.

Concept 6 (the `0.1` truncation) and Concepts 1/12 (the binding diagram) are handled by hand-authored SVG inside `Figure`. The Concept 1 SVG is reused in Concept 12 with a padlock overlay — one diagram, two lessons of teaching load.

## Open pedagogical questions

- Concept 5's five-row "what does this return?" table is currently sketched as five `PredictOutput` rounds in succession; if that reads as repetitive in draft, a single `Dropdowns`-style table with five select cells may carry the same recall in tighter space.
- Concept 11 leans on `AnnotatedCode` to make the segments-and-expressions mechanic visible. If the segments array is hard to render legibly inside the existing `AnnotatedCode` walkthrough format, a small hand-SVG anatomy diagram of a tagged-template call (mirroring how the course will later anatomize a URL in 3.3.1) may be the cleaner reach.

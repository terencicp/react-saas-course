# Lesson title

- **Title (h1):** What `===` actually compares
- **Sidebar label:** What === compares

# Lesson framing

Lesson 1 installed the binding model — primitives copy by value, objects share a reference. This lesson cashes in on that diagram by teaching what comparison does over each kind of value: `===` compares primitive values, and for objects compares the reference (allocation identity), not structure. The lesson also retires two beginner reflexes — `==` and the global `isNaN` — and names the rare reaches (`Object.is`, `Number.isNaN`) so the student leaves with one default operator and an awareness of the two surprising edge cases (`NaN === NaN`, `+0 === -0`).

**Conclusions from brainstorming that apply lesson-wide:**

- **One default operator.** The senior install is `===` everywhere, full stop. `Object.is` and `==` are named so the student recognizes them in code reviews; the lesson never recommends writing them.
- **Lean on Lesson 1's diagram.** Object `===` is just "do these two bindings point at the same box?" — exactly the binding diagram from Lesson 1. Reference that mental model rather than building a new one. Don't re-draw the diagram; recall it in one sentence.
- **Failure-first per pedagogical filter.** Open with the two-object-literals surprise (`{ id: 1 } === { id: 1 }` is `false`) and the `NaN === NaN` surprise side by side. Both observable in two lines. Then teach the rule that explains both.
- **Tool, not discipline.** Name Biome's `noDoubleEquals` rule (already in the course's canonical `biome.json` per the tooling chapter) so the student sees `==` as a build-time error, not a willpower problem.
- **No coercion table.** The student does not need to memorize what `[] == false` evaluates to. The lesson explicitly does not show the coercion table; the takeaway is "`==` is forbidden," not "here's how to predict it."
- **Cognitive load discipline.** Three concepts only: the operator surface (`==`, `===`, `Object.is`), the two `===` edge cases, and the `Number.is*` namespace. Resist the urge to teach the Same-Value-Zero vs. Strict-Equality vs. Same-Value algorithms by name; teach the observable behaviors.
- **Forward links land in one sentence.** React's `Object.is` bailout (Ch. 023.1) and the structural-equality gap pointing forward to Zod/discriminated unions (Unit 6, Ch. 005) each get one sentence — no detours.

Estimated student time: 25–30 minutes.

# Lesson sections

## Introduction (no h2)

Open with the two failures, observable in two snippets totaling four lines. The first compares two object literals with `===` and is surprised the result is `false`. The second compares `NaN` to itself with `===` and is surprised the result is `false`. State the diagnosis plainly: JavaScript has three equality operators and two edge cases the spec guarantees will surprise you; a senior reaches for exactly one operator by default and recognizes the edge cases on sight. Promise the reader that by the end of the lesson they'll write `===` without thinking and know the rare moments to break that rule.

Keep it 3–4 sentences total. No bullet list, no headers in the intro.

## How `===` compares the two kinds of value

**Goal:** restate Lesson 1's binding split as the rule that determines what `===` does.

Open with the one-rule formulation: `===` asks "are these the same value?" — and the answer depends on whether the value is a primitive or a reference (the Lesson 1 split). Recall the binding diagram in one sentence; don't re-render it.

The two cases:

- **Primitives** — `===` compares the value itself. `'ada' === 'ada'` is `true`. `42 === 42` is `true`. There's no notion of identity separate from the value; primitive values are themselves.
- **Objects** — `===` compares the reference (the arrow in the binding diagram). Two object literals with identical contents are two separate allocations — two different boxes — so `===` is `false`. The same object accessed through two names (the `user` / `alias` pattern from Lesson 1) is `===` to itself, because both names point at the same box.

Show the contrast in a single fenced `ts` block with three `console.log` calls and their outputs as comments:

```ts
console.log('ada' === 'ada');                       // true
console.log({ id: 1 } === { id: 1 });               // false
const user = { id: 1 };
const alias = user;
console.log(user === alias);                        // true
```

Close with the senior framing in one sentence: `===` answers "are these the same value?" for primitives and "are these the same allocation?" for objects — never "do they have the same shape?" Structural equality is a separate thing the language doesn't ship (named in its own section below).

## Why the course never writes `==`

**Goal:** retire `==` once and never revisit it.

One short subsection. State the rule: the course writes `===` everywhere; `==` is forbidden.

The reasoning in one paragraph: `==` applies a coercion table (numbers to strings, objects to primitives, `null` to `undefined`) that nobody on a team remembers correctly under deadline pressure. The only defensible use case (`x == null` to match both `null` and `undefined` at once) is unnecessary in the course's stack — Lesson 5 of Chapter 002 will teach the `??` operator and explicit nullish checks that read better. The lesson does not enumerate the coercion table; that knowledge has no payoff.

Name the tooling backstop in one sentence: Biome's recommended `noDoubleEquals` rule flags every `==` and `!=` at lint time, so a slip is a build-time error in the course's project setup rather than a willpower problem. (Side note for downstream agents: Biome's rule allows `x == null` by default — the course's canonical `biome.json` sets `ignoreNull: false` so even that form is blocked, because the `??` operator covers the same ground more legibly.)

Use an `<Aside type="caution">` with a single line: "If you see `==` in legacy or AI-generated code, change it to `===` and re-test — the behavior will change, but it'll change to the behavior you actually want."

## The two edge cases `===` gets wrong

**Goal:** plant `NaN === NaN` is `false` and `+0 === -0` is `true` as muscle-memory facts the student will eventually need to recognize.

Open with the observable behavior in a tight code block (use `<PredictOutput>` here — the surprise is the point):

```ts
console.log(NaN === NaN);   // ?
console.log(+0 === -0);     // ?
console.log(0 === -0);      // ?
```

Expected output: `false`, `true`, `true`. The `<PredictWhy>` reveal explains both:

- **`NaN === NaN` is `false`** because IEEE 754 specifies that `NaN` is not equal to anything, including itself. That spec choice is what makes `NaN` a useful "this calculation was invalid" marker — once a value is `NaN`, no equality check accidentally "matches" it. The depth of the IEEE 754 story comes in Lesson 3; for this lesson the rule is observable: never compare a value to `NaN` with `===`.
- **`+0 === -0` is `true`** because the spec defines `===` that way. Signed zero matters for graphics, scientific computing, and hash keys; in everyday SaaS code it's invisible until it isn't.

Forward-link in one sentence: Lesson 3 of this chapter explains *why* IEEE 754 produces `NaN` in the first place; this lesson just installs the recognition.

## `Object.is`: same as `===`, except for the two edge cases

**Goal:** name the rare escape hatch so the student recognizes it in real codebases — especially React's source — without recommending it as a default.

One short subsection. State what `Object.is` does in one sentence: it behaves exactly like `===` for everything *except* the two edge cases — `Object.is(NaN, NaN)` is `true`, and `Object.is(+0, -0)` is `false`.

Show the contrast in a small `ts` block:

```ts
console.log(Object.is(NaN, NaN));    // true   — diverges from ===
console.log(Object.is(+0, -0));      // false  — diverges from ===
console.log(Object.is('ada', 'ada')); // true  — same as ===
console.log(Object.is({}, {}));      // false  — same as ===
```

Name the two real-world use cases tersely:

- **Custom memoization keys** where bit-pattern identity matters (a memoizer that treats `NaN` as a valid input distinct from "no value").
- **React's reactivity bailout.** When you call a state setter with the same value, React uses `Object.is` to decide whether to skip the re-render. Forward link in one sentence: this is why setting state to a new object literal (`setUser({ ...user })`) re-renders even when the contents look identical, and Chapter 023 will return to this rule when teaching `useState`.

The senior reflex: default to `===`. Reach for `Object.is` only when one of those two cases applies — and when it does, add a comment explaining why, because the reader will assume it's a typo for `===`.

## `Number.isNaN` over the global `isNaN`

**Goal:** install the namespaced `Number.is*` family as the senior reach and the global coercing forms as the legacy to recognize.

Open with the bug: the global `isNaN(x)` coerces its argument to a number first, so `isNaN('hello')` is `true` — because `'hello'` becomes `NaN` when coerced, not because `'hello'` *is* `NaN`. That coercion almost never matches what the caller meant.

Show the divergence in a small live block. Use a `<ScriptCoding>` exercise where the student runs both forms against five inputs and writes one assertion per case. The starter and tests:

```ts
// starter: predict and assert how each form behaves for these inputs.
// Fill in the asserted outcomes below; the tests verify your answers.
const inputs = [NaN, 'hello', '42', undefined, 0];

// Replace the `???` with your predictions.
const globalResults = inputs.map(isNaN);          // [???]
const namespacedResults = inputs.map(Number.isNaN); // [???]
```

Tests assert:

- `globalResults` equals `[true, true, false, true, false]` — the coercion poisons four of the five.
- `namespacedResults` equals `[true, false, false, false, false]` — only the actual `NaN` value reports `true`.

The lesson is the divergence on `'hello'` and `undefined`: the global form lies, the namespaced form tells the truth.

Close with the rule and the companion: prefer `Number.isNaN(x)` always. The same logic applies to `Number.isFinite(x)` over the global `isFinite(x)` — the global coerces, the namespaced doesn't. The pattern: when checking a number's properties, reach for `Number.*`; the unprefixed globals are coercing legacy.

Don't show `Number.isInteger` or `Number.isSafeInteger` here — those are Lesson 3 territory (the integer-cents rule).

## Structural equality isn't in the language

**Goal:** name the gap so the student doesn't waste time looking for a built-in, and point at the patterns the course uses to avoid the question.

One short paragraph. JavaScript has no built-in operator or function that compares two objects for "same shape, same values." Comparing `{ id: 1, name: 'Ada' }` to another object with those exact fields requires either a library (`fast-deep-equal`, `lodash.isEqual`) or a hand-written walk. The course does not pull in a library for this in the first units — it teaches the patterns that avoid the need: compare by primary key (`a.id === b.id`), derive a stable string key from the relevant fields, or use discriminated unions where each variant has its own shape (the pattern Chapter 005 covers).

One sentence forward link: when the lesson reaches Zod (Unit 6) and Drizzle (Unit 5), the comparisons that matter at the wire and DB boundary are ID-based by construction, and the structural-equality question rarely surfaces in well-shaped code.

No exercise here. The point is the absence of a built-in; the student just needs to know the gap exists.

## Check yourself

**Goal:** confirm the student picks the right operator for each scenario without re-deriving the rule.

A single `<MultipleChoice>` in multi-select mode (per the multi-select trigger of two-or-more `correct` marks). The question: "Which of these expressions should you write in 2026 SaaS code? Select all that apply." Five fenced-code options:

- `userA == userB` — incorrect (forbidden operator).
- `userA === userB` — correct (the default).
- `Number.isNaN(parsedValue)` — correct (the senior reach for `NaN` checks).
- `isNaN(parsedValue)` — incorrect (coerces, lies on non-numeric strings).
- `Object.is(prevState, nextState)` — incorrect *in the absence of context* (default to `===`; `Object.is` is the rare reach).

The `<McqWhy>` reveals each: the `==` answer is rejected on principle (and by Biome), the `===` and `Number.isNaN` answers are the senior defaults, the global `isNaN` answer is rejected for coercion, and the `Object.is` answer is rejected as the wrong reflex unless the student is writing memoization or framework reactivity code (with the React bailout as the one real exception).

The multi-select forces the student to evaluate each option against the rule individually rather than picking one "best" answer; that's the senior-reflex install. Per the component's "answers shouldn't be exact prose" rule, the option text uses unique variable names (`userA`/`userB`, `parsedValue`, `prevState`/`nextState`) rather than the variable names used in lesson prose.

## Terms requiring `<Term>` tooltips

Use sparingly — the lesson explains most terms inline.

- **IEEE 754** — at first use in the `NaN === NaN` subsection. Definition: "The standard that defines how JavaScript's `number` type stores and computes floating-point values. The cause of every floating-point surprise; covered in depth in Lesson 3 of this chapter."
- **structural equality** — at first use in the gap-naming section. Definition: "Comparing two objects by whether their fields and values match, recursively. JavaScript has no built-in operator for this; compare by ID or shape it out at the boundary instead."

Skip tooltips for terms the lesson defines in prose (`reference`, `coercion`, `identity`, `bailout`) — those are defined where they appear.

# Scope

**This lesson covers:** `===` semantics for primitives (value compare) and objects (reference compare); why `==` is forbidden; the two `===` edge cases (`NaN === NaN`, `+0 === -0`); `Object.is` as the rare escape hatch; `Number.isNaN`/`Number.isFinite` over the global coercing forms; the absence of structural equality in the language.

**Out of scope (explicit, with destinations):**

- **The full `==` coercion table.** The lesson explicitly does not enumerate what `[] == false` or `'1' == 1` evaluate to. The takeaway is "`==` is forbidden," not "here's how to predict it." If the student sees coerced equality in legacy code, the fix is to change it to `===`, not to defend the existing behavior.
- **Why IEEE 754 produces `NaN` and approximate fractions.** Owned by Lesson 3 of this chapter (`Store cents, not dollars`). This lesson installs the observable rule (`NaN === NaN` is `false`); Lesson 3 teaches the floating-point representation that causes it.
- **`Number.isInteger`, `Number.isSafeInteger`.** Lesson 3 territory (integer-cents rule and the safe-integer boundary).
- **`BigInt` equality** (`1n === 1`, `1n == 1`). Lesson 3 names `BigInt` and its arithmetic incompatibility with `number`; equality follows the same pattern (`===` cross-type is always `false`). Not surfaced here.
- **Comparing `Date` objects.** `dateA === dateB` is reference identity; `.getTime()` comparison is the senior reach. Surfaced where it earns its weight in the Temporal pivot (Chapter 009).
- **TC39 Records and Tuples proposal.** Stage 2 in May 2026; not in the 2026 stack; the lesson does not mention it.
- **`valueOf` / `Symbol.toPrimitive` hooks.** Niche; the course never customizes them.
- **React's `useState` and `useMemo` bailout mechanics in depth.** Lesson 1 of Chapter 023 owns that; named here in one sentence as the canonical `Object.is` real-world use.
- **Structural-equality libraries** (`fast-deep-equal`, `lodash.isEqual`). Named in one sentence as "the option that exists," not taught.

**Prerequisite reactivation (concise):** The student has Lesson 1's binding model — primitives copy by value, objects share a reference — and knows `const` locks the binding but not the value. Don't re-teach the binding diagram; reference it in one sentence. The student has not been taught the `??` operator, optional chaining, or any TypeScript narrowing patterns; do not reach for them here.

# Code conventions notes

- All snippets are `.ts`. Use `const` only (Lesson 6 owns `let`).
- Inference-led; no `: number` or `: object` annotations on locals.
- Semantic, domain-tied names — `user`, `userA`/`userB`, `parsedValue`, `prevState`/`nextState`. Never `foo`/`bar`/`x`/`y` outside of one-line illustrations of primitive comparison (where `'ada' === 'ada'` carries domain enough on its own).
- Use `console.log` with comment-tail expected output (`// true`) for read-along snippets per Lesson 1's convention. Use `<PredictOutput>` only where the surprise is load-bearing (the `NaN`/signed-zero edge cases).
- **Deliberate divergence:** the lesson briefly shows `==` in the "Why the course never writes `==`" section as a *what-not-to-write* citation, inside an `<Aside type="caution">`. That's the only `==` in any code block in the lesson; the rest is `===` exclusively. Downstream agents: don't normalize this away — the citation is the install.
- No arrow functions in this lesson. The exercise has the student writing only assertions and predictions, not authoring functions.

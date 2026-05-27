# Lesson title

- **Title (h1):** Store cents, not dollars
- **Sidebar label:** Store cents, not dollars

# Lesson framing

Lesson 2 closed by naming `NaN === NaN` as an IEEE 754 consequence and promised this lesson would explain *why*. The promise is paid here: every JavaScript `number` is a 64-bit float, that representation lies for most decimal fractions, and a senior SaaS engineer leans on one structural rule (integer cents for money) and one boundary discipline (`Number.isFinite` + `Number.isInteger`) to prevent the bug class from ever reaching production. The student leaves able to predict that `0.1 + 0.2 !== 0.3`, knows the conversion form (`Number()` plus a finite-number guard), and can sort whether any given value is `number`, integer cents, or `BigInt` territory.

**Conclusions from brainstorming that apply lesson-wide:**

- **One structural rule, not a stack of mitigations.** The lesson's spine is the integer-cents rule. Floating-point tolerance comparisons (`Math.abs(a - b) < EPSILON`) and decimal-string libraries are dead-ends in a SaaS context — name them in one line, never recommend them. The student should leave thinking "money is integers, period," not "money is hard, here are five techniques."
- **Failure-first per pedagogical filter.** Open with the canonical `0.1 + 0.2` console output. The student should see the wrong answer printed before any explanation lands. Three SaaS sites where this bites — invoice totals, quantity × price, dollars → Stripe cents — are named in one sentence each so the failure has stakes.
- **Stripe and Drizzle as the proof.** The integer-cents rule isn't a course preference — it's the rule the production stack already enforces (Stripe stores `amount` in minor units; Drizzle's `numeric`/`bigint` money columns are integers). Name those two so the rule reads as "the stack already decided this," not "your instructor's opinion."
- **`number` until it overflows; `BigInt` when it actually does.** The senior call is to use `number` as the default — money fits in regular integers, normal counts fit, durations fit. Reach for `BigInt` only at three named sites: 64-bit external IDs (Snowflakes, BIGINT columns), large counters that genuinely cross 2^53, and crypto/hash arithmetic. Name the friction (no `Math.*` interop, doesn't mix with `number`, JSON needs a custom replacer) so the student doesn't reach for it casually.
- **Boundary > downstream branch.** `NaN` propagates silently. The fix is one `Number.isFinite` check at every entry point that turns a string into a number — not a branch on every arithmetic call site. This pattern is the same one Zod (Unit 6) absorbs at the wire boundary; plant the reflex here.
- **`Number(input)` is the default conversion.** `parseInt`/`parseFloat` are forgiving parsers for dimension-string cases (`'12px'`), almost always wrong for "convert user input to a number." The unary `+input` is identical to `Number(input)` but less legible; the course writes `Number(input)`.
- **Cognitive load discipline.** Three concepts: the IEEE 754 consequence, the integer-cents rule with one worked example, and the conversion + validation surface (`Number()`, `Number.isFinite`, `Number.isInteger`, `Number.isSafeInteger`). `BigInt` is a fourth beat but tightly bounded. Do not teach the IEEE 754 bit layout; teach the *consequence*.
- **Forward links land in one sentence.** Stripe integration (Unit 11), Zod number schemas (Unit 6), Drizzle money column types (Unit 5), and `Intl.NumberFormat` for display (later unit) each get a single sentence — no detours.

Estimated student time: 35–40 minutes.

# Lesson sections

## Introduction (no h2)

Open with the failure observable in two lines — `console.log(0.1 + 0.2)` printing `0.30000000000000004`. Name the diagnosis in one sentence: every JavaScript `number` is a 64-bit float, and most decimal fractions can't be represented exactly in binary. Name the three SaaS sites the bug visits — summing line items on an invoice, multiplying a quantity by a unit price, converting a user-entered dollar amount to Stripe's API — in one tight sentence. Promise the student that by the end of the lesson they'll have one structural rule (integer cents) and one conversion discipline that closes the bug class for good.

Keep it 3–4 sentences total. No bullet list, no headers in the intro.

## Why `0.1 + 0.2` doesn't equal `0.3`

**Goal:** install the IEEE 754 consequence at exactly the depth the student needs — not the bit layout.

Open with a `<PredictOutput>` on three subtle cases. The surprise is the lesson:

```ts
console.log(0.1 + 0.2);
console.log(0.1 * 3);
console.log(1995 / 100);
```

Expected output:

```
0.30000000000000004
0.30000000000000004
19.95
```

`<PredictWhy>` reveals the rule in one paragraph: every JavaScript `number` is a 64-bit double-precision float per the <Term definition="The IEEE 754 standard defines binary floating-point representation. JavaScript's `number` type is the 64-bit double-precision variant — 53 bits of mantissa, 11 bits of exponent. Most decimal fractions can't be represented exactly in binary.">IEEE 754</Term> standard. That representation is **exact** for integers up to ±2^53−1 and **approximate** for fractions whose binary expansion is non-terminating — which is most decimal fractions, including `0.1`. The third line shows the flip side: `1995 / 100` is exact because `1995` is an integer and `100` is exact in binary. That asymmetry is the entire reason the rest of the lesson exists.

Close with one terse paragraph: the student does not need to memorize the mantissa bit count or the rounding modes. They need to recognize the consequence — fractional arithmetic in `number` is approximate — and know the structural rule that sidesteps it.

Forward-link in one sentence: this is also why `NaN === NaN` is `false` (Lesson 2's edge case) — the IEEE 754 spec makes `NaN` the marker for "this calculation was invalid," and a value not even equal to itself is the cleanest way to mark that.

## The integer-cents rule

**Goal:** install the one structural rule that closes the money bug class.

State the rule plainly in one paragraph: **store money as the integer count of the smallest unit.** Cents for USD, pence for GBP, the appropriate minor unit per <Term definition="The ISO 4217 standard codes every currency and its minor unit. USD has 2 minor-unit decimals (cents); JPY has 0; BHD has 3 (fils). The minor-unit count is what determines how many integer units make up one major unit of the currency.">ISO 4217</Term> for the currency. Convert to and from a human display string only at the boundaries — when accepting input from a form and when rendering for display. Never store, sum, multiply, or compare dollars-as-floats.

Anchor the rule in the production stack — one tight paragraph: Stripe's API takes `amount` as an integer in the currency's minor units (e.g. `1000` to charge $10.00, `10` to charge ¥10); that's not an arbitrary choice — every modern payment processor does the same. Drizzle's money column types (covered in Unit 5) store integers, not floats. The entire production stack already agreed; this lesson is teaching the rule the stack assumes. Forward-link in one sentence: Unit 11 (Payments) builds the full Stripe integration on this rule; Unit 6 (Zod) wires the wire-boundary validation that enforces it; Unit 5 (Drizzle) names the column types.

Show one full worked example as a single fenced `ts` block — the dollars-to-cents-and-back roundtrip a senior writes:

```ts
const userInput = '19.95';
const dollars = Number(userInput);                  // 19.95
const cents = Math.round(dollars * 100);            // 1995

// store `cents` as an integer; pass `cents` to Stripe; sum cents in SQL.

const displayDollars = (cents / 100).toFixed(2);    // '19.95'
const displayString = `$${displayDollars}`;         // '$19.95'
```

Walk the snippet in three short prose beats, not a `<AnnotatedCode>` — it's small enough to read top-to-bottom: `Number()` parses the input into a float; `Math.round(dollars * 100)` converts to integer cents and rounds away any floating-point noise from the multiplication; division and `toFixed(2)` recover the display string. The integer is the storage form; the strings are the boundary forms.

Name one watch-out tersely (a `<Aside type="caution">`): `Math.round` is not the same as `Math.floor` or `Math.trunc`. `Math.round` rounds toward positive infinity (so `Math.round(0.5)` is `1` and `Math.round(-0.5)` is `0` — slightly asymmetric for negatives, but for currency the input is always non-negative). `Math.floor` would silently lose cents on every conversion; `Math.trunc` does the same toward zero. Pick `Math.round`. (For multi-currency systems where exact "round half to even" matters, reach for a decimal library — out of scope here.)

Mention `Intl.NumberFormat` in one sentence — the right tool for formatting currencies for display (locale-aware symbols, grouping, decimals). Not taught here; surfaced where it earns its weight in a later unit.

## The `Number.is*` family the integer-cents rule leans on

**Goal:** install the boundary-check vocabulary so the rule has a way to be enforced at runtime.

State the trigger first: the integer-cents rule is only as good as the values you actually store. A string from a form, a JSON payload from another service, or a number coerced from a calculation — each one needs to be confirmed as a finite integer before it's allowed to land in the database. The `Number.is*` family is the namespace for those checks.

Three predicates, one trigger each — show them in a tight fenced `ts` block:

```ts
Number.isFinite(parsed);       // upstream sanity check — not NaN, not ±Infinity
Number.isInteger(parsed);      // the integer-cents rule's runtime check
Number.isSafeInteger(parsed);  // boundary check past 2^53 — only matters for huge ints
```

Walk the three in prose:

- **`Number.isFinite(x)`** — the first check at any boundary that produces a number. Returns `false` for `NaN`, `Infinity`, and `-Infinity`. Catches the silent `NaN` that would otherwise propagate through every downstream calculation. The senior reflex: every `Number(input)` is followed by a `Number.isFinite` guard.
- **`Number.isInteger(x)`** — the integer-cents enforcement at the database boundary. Confirms the value is a whole number (no fractional part). Pair with `Number.isFinite` because `Number.isInteger(NaN)` is `false` but a senior reads the intent more clearly when the finiteness check is named separately.
- **`Number.isSafeInteger(x)`** — the boundary past which a regular `number` can't be trusted. Returns `false` for integers larger than `Number.MAX_SAFE_INTEGER` (2^53−1 = `9_007_199_254_740_991`). Money in cents up to ~$90 trillion fits comfortably; this check is the upstream guard for values coming from 64-bit external systems where a `BigInt` may be the right type.

Watch-out tersely (one paragraph): `Number('')` returns `0`, not `NaN` — so `Number.isFinite(Number(''))` is `true`. If "empty input" should be rejected, check the trimmed string before converting: `if (input.trim() === '') throw …`. That's a real footgun and the reason Zod's `z.string().min(1)` exists.

Show a small validation pattern as one fenced `ts` block — the kind of function that lives at a wire boundary:

```ts
const parseCentsInput = (input: string): number => {
  if (input.trim() === '') throw new Error('Empty input');
  const dollars = Number(input);
  if (!Number.isFinite(dollars)) throw new Error('Not a number');
  const cents = Math.round(dollars * 100);
  if (!Number.isSafeInteger(cents)) throw new Error('Amount too large');
  return cents;
};
```

This is the **only** function-form snippet in the lesson body. The annotation: the empty-string guard catches the `Number('') === 0` footgun; `Number.isFinite` catches `NaN` and `Infinity` from malformed input; `Math.round` converts to integer cents and erases the multiplication's floating-point noise; `Number.isSafeInteger` is the upper guard for "this value won't survive an unsafe-int calculation later." Forward-link in one sentence: Unit 6's Zod schemas absorb this pattern into a declarative `z.string().min(1).pipe(z.coerce.number().int().finite())` form — the runtime checks survive but the boilerplate disappears.

Companion mention in one sentence: `Number.isNaN` (taught in Lesson 2) is the namespaced reach for "is this exactly the `NaN` value?" — but at boundaries `Number.isFinite` is usually what the caller actually means.

## When `BigInt` earns its weight

**Goal:** name the three sites where `BigInt` is the right reach, name its friction, and make clear it is **not** the money type.

Open with the rule that does *not* trigger `BigInt`: money. Integer cents under ±2^53 covers any individual transaction up to ~$90 trillion (well past anything Stripe will let you charge in a single API call — Stripe caps individual `amount` values at 8 digits, ~$1M USD per call), and any single customer balance the SaaS will plausibly see. `BigInt` is the wrong reach for money because regular `number` already covers it.

Three sites where `BigInt` is the senior reach — one sentence each:

- **64-bit external IDs.** Twitter Snowflake IDs and some database BIGINT columns the application reads as a JS value exceed `Number.MAX_SAFE_INTEGER` and silently corrupt when parsed as `number`. Read them as `BigInt` (or as strings, if no arithmetic is needed).
- **Large counters that genuinely cross 2^53.** Rare in SaaS; nanosecond timestamps over multi-decade ranges, cumulative event counters in high-volume telemetry.
- **Crypto and hash arithmetic.** Modular exponentiation, large-prime work, hash construction — places where overflow is not acceptable and the values are deliberately huge.

Show the literal and the friction in one tight fenced `ts` block:

```ts
const snowflake = 1234567890123456789n;   // `n` suffix is the BigInt literal
const next = snowflake + 1n;              // BigInt arithmetic — works
// const broken = snowflake + 1;          // TypeError: cannot mix BigInt and number
```

State the friction tersely (a `<Aside type="caution">`):

- `BigInt` does not mix with `number` in expressions — `1n + 1` throws `TypeError`. Cross-conversion is explicit: `Number(bigint)` and `BigInt(number)`.
- `Math.*` does not accept `BigInt`. `Math.round`, `Math.sqrt`, all of it — number-only.
- `JSON.stringify` throws on `BigInt`. Serializing it across the wire needs a custom replacer (usually to a string).
- TypeScript's `bigint` type is distinct from `number`; the type system enforces the no-mixing rule at compile time.

The senior call in one sentence: use `number` until a real overflow forces the switch. The cost of `BigInt` is real; pay it only where the overflow risk is real.

## Converting strings to numbers

**Goal:** retire `parseInt`/`parseFloat` as the default reach and install `Number()` + `Number.isFinite` as the senior pattern.

Open with the rule: at every entry point that takes a string and treats it as a number — form input, query parameter, JSON field, environment variable — the conversion is `Number(input)` and the validation is `Number.isFinite(result)` (plus the empty-string guard from the previous section). Anything else is a specialized reach.

Walk the four conversion forms in a `<CodeVariants>` block — same input (`'19.95'` and one trailing-garbage variant `'12px'`), four different outputs.

- **Variant 1 — `Number(input)` (the default):** Strict; returns `NaN` if the whole string isn't a number. `Number('19.95')` is `19.95`; `Number('12px')` is `NaN`. Pair with `Number.isFinite` (plus the empty-string guard) and the boundary check is done.
- **Variant 2 — `parseInt(input, 10)` (the dimension-string reach):** Parses the leading digits and ignores trailing garbage. `parseInt('19.95', 10)` is `19` (lossy on fractions!); `parseInt('12px', 10)` is `12`. Useful for parsing CSS dimension strings; the radix argument is required so old engines don't guess. Almost always wrong for user-entered numbers.
- **Variant 3 — `parseFloat(input)` (rare):** Same forgiving behavior, returns a float. `parseFloat('19.95')` is `19.95`; `parseFloat('12px')` is `12`. The senior reach is rare; `Number()` with validation reads more clearly.
- **Variant 4 — `+input` (the shortcut):** Same behavior as `Number(input)`. `+'19.95'` is `19.95`; `+'12px'` is `NaN`. Legible enough in one-line callbacks but `Number(input)` reads better in shared code; the course writes `Number(input)`.

Per-pane mark colors: green on Variant 1 (the default), orange on Variants 2 and 3 (forgiving — usually wrong), blue on Variant 4 (acceptable but redundant). The pane prose names the rule in one line each — exactly as above, no longer.

Close with one paragraph on `NaN` propagation: every arithmetic operation involving `NaN` yields `NaN`. A single bad input poisons every downstream calculation silently; the user sees `$NaN` on the invoice or a `null` in the database. The fix is the boundary check (`Number.isFinite` right after `Number()`, with the empty-string guard upstream), not a downstream branch on every arithmetic call site.

Name one piece of deprecated/redundant surface in one sentence: `Number.parseInt` and `Number.parseFloat` are namespaced aliases with identical behavior to the globals — neither preferred over the other.

## Where each value lives

**Goal:** confirm the student can sort real SaaS values into the right type without re-deriving the rule.

A `<Buckets>` exercise sorting six values into three buckets. This is the senior-decision confirmation — the integer-cents rule, the `BigInt` triggers, and the regular-`number` default all collapse into one sorting task.

Buckets:

- **`number`** — fits in a regular `number`, no special handling.
- **integer cents** — a count of the smallest currency unit, stored as a `number` integer.
- **`BigInt`** — needs the `BigInt` type to avoid overflow or precision loss.

Items:

- A user's shopping cart total in USD → **integer cents**
- A Twitter Snowflake ID from an external API → **`BigInt`**
- A product's quantity in stock → **`number`**
- A price in EUR shown on a checkout page → **integer cents**
- An exponential backoff delay in milliseconds → **`number`**
- A database row count returned from `SELECT COUNT(*)` → **`number`**

The sort forces the student to recognize each value's bug class and pick the type that prevents it. Use `twoCol={false}` (default) — three buckets is fine in one column, the items are short.

## Practice: write the boundary function

**Goal:** practice the conversion-plus-validation pattern as the boundary discipline.

A `<ScriptCoding>` exercise where the student implements `dollarsToCents(input)`. Use `runner="vanilla"` (no TS, no imports needed; pure JS).

Starter:

```js
function dollarsToCents(input) {
  // 1. Reject empty/whitespace input by throwing 'Invalid amount'.
  // 2. Parse the input string into a number using Number().
  // 3. Reject NaN and Infinity by throwing 'Invalid amount'.
  // 4. Multiply by 100 and round to the nearest integer.
  // 5. Reject unsafe integers by throwing 'Amount too large'.
  // 6. Return the integer cents.
}
```

Tests:

```js
test('converts a typical dollar amount', () => {
  expect(dollarsToCents('19.95')).toBe(1995);
});
test('handles whole dollars', () => {
  expect(dollarsToCents('20')).toBe(2000);
});
test('handles zero', () => {
  expect(dollarsToCents('0')).toBe(0);
});
test('rounds away floating-point noise', () => {
  // 19.95 * 100 in floats is 1995.0000000000002 — Math.round saves us.
  expect(dollarsToCents('19.95')).toBe(1995);
});
test('throws on non-numeric input', () => {
  expect(() => dollarsToCents('twenty')).toThrow('Invalid amount');
});
test('throws on empty input', () => {
  // Number('') === 0 — without an explicit empty-string guard, this would
  // silently return 0 and the user gets a $0.00 charge in their database.
  expect(() => dollarsToCents('')).toThrow('Invalid amount');
});
test('throws on whitespace input', () => {
  // Number('   ') === 0 too. Same footgun.
  expect(() => dollarsToCents('   ')).toThrow('Invalid amount');
});
test('throws on Infinity', () => {
  expect(() => dollarsToCents('Infinity')).toThrow('Invalid amount');
});
```

The empty-string and whitespace tests are load-bearing — `Number('')` returns `0`, and `Number('   ')` returns `0`, not `NaN`. That's an edge the student will trip on the first attempt if they skip step 1 and is the lesson's point: rely on an explicit emptiness check plus `Number.isFinite`, not `!isNaN`. Tests reveal the gotcha on the first wrong run; the student fixes by adding the `input.trim() === ''` guard from the worked example.

The instructions framing prompts the student to use `input.trim()`, `Number()`, `Number.isFinite`, `Math.round`, and `Number.isSafeInteger` in that order.

**Deliberate divergence from code conventions:** the runner is `vanilla`, so the starter is a `function` declaration in `.js` shape, not a `const` arrow in `.ts`. This is the only function form in the lesson; the integer-cents rule (the lesson) does not depend on TypeScript types to land. Downstream agents: don't switch to `runner="sandpack"` just to get TypeScript — the runtime check is the point, and the vanilla runner boots instantly.

## Terms requiring `<Term>` tooltips

Use sparingly — the lesson defines most terms inline.

- **IEEE 754** — at first use in the "Why `0.1 + 0.2` doesn't equal `0.3`" section. Definition: "The IEEE 754 standard defines binary floating-point representation. JavaScript's `number` type is the 64-bit double-precision variant — 53 bits of mantissa, 11 bits of exponent. Most decimal fractions can't be represented exactly in binary."
- **ISO 4217** — at first use in the integer-cents rule. Definition: "The ISO 4217 standard codes every currency and its minor unit. USD has 2 minor-unit decimals (cents); JPY has 0; BHD has 3 (fils). The minor-unit count is what determines how many integer units make up one major unit of the currency."

Skip tooltips for terms defined in prose (`integer cents`, `boundary`, `Snowflake`, `mantissa` — none used heavily enough to need it).

# Scope

**This lesson covers:** the IEEE 754 consequence at the depth that bites; the integer-cents rule for money with one full worked example; the `Number.is*` family (`isFinite`, `isInteger`, `isSafeInteger`) as the boundary-check surface; the `Number('') === 0` footgun and the empty-string guard pattern; when `BigInt` earns its weight (three sites) and the friction of using it; string-to-number conversion (`Number()` as the default, `parseInt`/`parseFloat`/`+x` named with one-line triggers); `NaN` propagation and the boundary-check fix; references to Stripe, Drizzle, and Zod as the production stack that enforces the rule.

**Out of scope (explicit, with destinations):**

- **The IEEE 754 bit layout.** No mantissa/exponent/sign-bit diagram, no rounding-mode taxonomy. The student needs the consequence, not the encoding.
- **`Intl.NumberFormat` and currency display formatting.** Named in one sentence as the right tool when display lands; full treatment in a later unit where the first money display happens.
- **Floating-point tolerance comparisons (`Math.abs(a - b) < EPSILON`).** Mentioned only as the rare scientific-computing reach; never recommended for SaaS code (the integer-cents rule supersedes it).
- **Decimal128 and the TC39 decimal proposal.** Stage 1 in May 2026; not in the stack; not mentioned.
- **Decimal-string libraries (`decimal.js`, `big.js`, `currency.js`).** Named in one line at most — the integer-cents rule plus Drizzle's money column is the 2026 default; libraries are not the senior reach.
- **`Number.parseInt` / `Number.parseFloat` namespacing.** Named in one sentence as identical to the globals.
- **The `Math.*` surface in depth.** Only `Math.round` (and `Math.floor`/`Math.trunc` named to contrast) appear here; the rest of `Math.*` is implicitly Chapter 003 territory.
- **`Number.isNaN` vs. the global `isNaN`.** Owned by Lesson 2; named in one sentence as the cousin pattern. Don't re-teach.
- **`BigInt` equality, comparison, and JSON-serialization patterns in depth.** Named tersely as friction; no deep treatment.
- **Currency conversion, exchange rates, multi-currency accounting.** Out of the lesson's scope; the integer-cents rule applies per currency.
- **Date and time arithmetic.** Owned by the Temporal pivot (Chapter 009); `number` for ms-durations is named here but not built out.
- **Banker's rounding (round half to even) and rounding-mode taxonomy.** `Math.round`'s asymmetric-for-negatives behavior is named in one watch-out and dropped; the lesson does not detour into ECMA-262 rounding semantics.

**Prerequisite reactivation (concise):** The student has Lesson 1's binding model (primitives vs. references) and Lesson 2's `===` semantics, the namespaced `Number.is*` reach as the senior pattern over coercing globals, and the `NaN === NaN` is `false` observation with the promise that this lesson explains *why*. The student has **not** been taught Zod schemas, Drizzle column types, the Stripe API, or any unit-currency or i18n patterns — keep forward links to one sentence and do not detour into them. The student knows `const` and inference-led typing from Lesson 1; no need to re-teach.

# Code conventions notes

- All snippets in the lesson body are `.ts` (per the chapter's "TypeScript-flavored, taught as the form they'll write" rule), with one deliberate exception called out below.
- Inference-led; the only return-type annotation is `parseCentsInput`'s `: number` (a boundary function — the signature is the lesson, per the conventions doc's carve-out for exported functions).
- Naming: semantic and domain-tied (`userInput`, `dollars`, `cents`, `snowflake`, `parsed`). Never `x`/`y`/`foo`/`bar`. Money variables use the unit in the name (`dollars` vs. `cents`) so the rule is visible at every read site.
- `const` only; no `let`. Lesson 6 owns `let`.
- Function form: arrow functions bound to `const` (per conventions: "the default"). The exercise starter is the deliberate exception — see below.
- Use `console.log` with comment-tail expected output where the surprise is the point; `<PredictOutput>` for the IEEE 754 surprises (the three subtle cases).
- `Math.round` is the only `Math.*` shown in the worked example; `Math.floor` and `Math.trunc` are named in prose to contrast, never shown in code.
- `Number()` is the canonical conversion form across the lesson; never `+input` in shipped examples (named once in `<CodeVariants>` as the legible-but-redundant shortcut, never used elsewhere).
- **Deliberate divergence — exercise runner:** The `<ScriptCoding>` exercise uses `runner="vanilla"` and ships a `function` declaration in `.js` shape. The conventions doc favors arrow-functions-bound-to-const in `.ts`; this lesson's exercise diverges because (a) the vanilla runner boots instantly with no TypeScript parsing overhead, (b) the integer-cents lesson is runtime-shaped, not type-shaped, and TypeScript adds nothing here, and (c) `function` declarations are explicitly allowed in the conventions for hoisting and standalone callable shapes. Downstream agents: keep the runner as `vanilla` and the starter as `function dollarsToCents(input)`.
- **`Number` boundary discipline as the pattern, not types.** Zod absorbs this into a typed schema in Unit 6; the lesson teaches the runtime predicate, not the type. Don't reach for `as const`, `satisfies`, or branded types here — they belong to Chapter 004 and would distract from the integer-cents install.

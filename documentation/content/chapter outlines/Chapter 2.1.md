# Chapter 2.1 — The JavaScript value model

## Chapter framing

Unit 1 landed the student on a running Next.js 16 scaffold with a strict `tsconfig.json` and a validated env. This chapter is the first lesson of Unit 2 and the place the course finally treats the language itself. It teaches the **value semantics every later unit assumes** — what a primitive is and isn't, what a reference is, when `===` lies, why floating-point math destroys money, what `.length` actually counts, what template literals can carry beyond interpolation, and what `const` does and does not promise. The chapter is not a JavaScript tour. It is the senior-depth treatment of the six value-model concepts that bite in production SaaS code and that the rest of the course will lean on without re-explaining.

Threads that must run through every lesson:

- **One language, TypeScript-flavored.** Per the pedagogical filter "teach the form they will write," every example is `.ts`, types are inference-led, and the JavaScript primitive is named at the call site. No standalone JavaScript chapter exists outside this unit; the language is taught as the form the student ships.
- **Decisions before syntax.** Each lesson opens with the production failure mode the concept prevents — a mutation that bled across two components, a `0.1 + 0.2 !== 0.3` that overcharged a customer, an emoji that broke a 280-character counter, a `let` that shouldn't have been a `let`. The syntax follows the failure.
- **No surveys.** The course never enumerates every method on `String.prototype` or every primitive type "for completeness." Each lesson cuts to the surface a senior reaches for regularly in 2026 SaaS code, and the long tail is dropped.
- **Forward links land softly.** `structuredClone` foreshadows Server Action serialization (Unit 5.2.4), the integer-cents rule foreshadows the Stripe/money chapter (Unit 16), `Intl.Segmenter` foreshadows input length validation with Zod (Unit 7), the `sql` tagged template foreshadows Drizzle's raw escape hatch (Unit 6). Each link is one sentence, no more.
- **The chapter does not re-teach.** TypeScript syntax, the type system surface, and the `any`/`unknown`/`never` corners get their own chapters (2.4 and 2.5). This chapter touches types only where the value semantics force a type-system observation (`Object.is` and `NaN`, `const` not narrowing literal types).

The student finishes the chapter able to predict the behavior of any small program that copies, compares, computes on, slices, interpolates, or rebinds a value — and able to defend the choices the rest of the course makes about money types, ID brands, string length checks, and the `const`-everywhere reflex.

---

## Lesson 2.1.1 — Bindings, not boxes

Teaches what assignment actually does: primitive copy vs. shared object references, function-call pass-by-value-vs-reference, and shallow vs. deep copy with `structuredClone`.

Topics to cover:

- The senior question. A teammate's PR mutated an object the calling component still held a reference to; two pieces of UI drifted out of sync until the next refresh. The bug class: treating `=` as "duplicates the value" when it actually "binds the name to a value." The fix is not a defensive copy reflex; it is a clear mental model of which values are shared and which aren't.
- The split that drives everything. Primitives (`string`, `number`, `boolean`, `bigint`, `symbol`, `null`, `undefined`) are values themselves; assignment copies the value. Objects (including arrays and functions) are reference values; assignment copies the reference, not the contents. Draw the binding diagram once — two boxes for primitives, one box with two arrows for objects — and the rest of the lesson reads against that diagram.
- Pass-by-value-vs-reference at the call site. Restated: JavaScript is always pass-by-value, but the value being passed for an object **is** a reference. Concrete consequence: a function that reassigns its parameter (`x = newObject`) does not change the caller's binding; a function that mutates a property (`x.foo = 1`) does. The two cases are different and every senior has shipped both bugs.
- Shallow copy as the daily reach. The three forms with one-line triggers: spread (`{ ...obj }`, `[ ...arr ]`) for the common object/array case, `Object.assign({}, obj)` for the rare cases where spread doesn't fit (older targets, mixing with `Object.defineProperty` semantics — named once and dropped), `Array.prototype.slice()` only for arguments-like objects you can't spread. Why these are "shallow": nested objects keep their references; mutating `copy.address.street` still mutates `original.address.street`.
- `structuredClone` as the deep copy default for 2026. One paragraph: built into Node 17+ and every browser the course targets, supports cyclical references, faster than `JSON.parse(JSON.stringify(x))` and preserves more types (`Date`, `Map`, `Set`, `ArrayBuffer`, typed arrays, `RegExp`). The failure modes named tersely: functions throw `DataCloneError`, class instances become plain objects (prototype chain dropped), `Error` objects are not cloneable in older runtimes, getters/setters and property descriptors flatten. The senior rule: if `structuredClone` throws, the value carries behavior, and behavior shouldn't be cloned anyway.
- The JSON cousin and when it earns its weight. `JSON.parse(JSON.stringify(x))` is the only deep-copy form that strips `undefined`, `Date` (becomes ISO string), `Map`/`Set`, and `BigInt` along the way. That is sometimes useful (forced wire-format normalization), almost always a bug. Named in one paragraph so the student recognizes it in legacy code and reaches for `structuredClone` by reflex.
- The forward link. Server Actions and `'use server'` boundaries serialize their arguments through a superset of the structured-clone algorithm (Unit 5.2.4). The mental model the student installs here is the one Unit 5 reuses without re-explanation; that's why the lesson uses `structuredClone` as the canonical "what can cross a serialization boundary" frame.
- Immutability as the React-shaped reflex, named once. The course's React chapters (Unit 4.7.4, 4.8.2) treat state as immutable; the senior reflex is to copy-then-modify, not to mutate. React detects state changes by reference equality — mutating an array or object in place doesn't change its reference, so the reconciler skips the re-render and the UI silently drifts from the data. This lesson plants that reflex at the language level so React doesn't have to re-derive it.

What this lesson does not cover:

- The full `Object.*` static surface (Chapter 2.3.1 owns it).
- Immer or any other "structurally enforced immutability" library — not the 2026 default, named in a single line at most.
- The internal V8 hidden-class representation of objects. Not relevant to the senior mental model.
- Freezing values with `Object.freeze` — surfaced briefly in 2.1.6 where `const` is distinguished from `freeze`.
- Symbol primitives in depth (Chapter 2.4.1 owns the seven-primitive enumeration).

Pedagogical approach:

Concept archetype. Open with the two-components-drift bug in two sentences, then the binding diagram (hand-authored SVG: two named bindings, one with two value boxes, one with two arrows into a single object box). Walk shallow copy with a small `react-coding`-style or `script-coding` live block where the student mutates `copy.address.street` and watches `original.address.street` change. Introduce `structuredClone` with a side-by-side `CodeVariants` block: spread on the left, `structuredClone` on the right, both operating on a nested record. Close with a `PredictOutput` exercise: four short snippets ("the function reassigns the parameter," "the function mutates a property," "the spread copies one level," "`structuredClone` copies all levels") with the student picking what the caller sees after each. No sandbox.

Estimated student time: 30 to 35 minutes.

---

## Lesson 2.1.2 — What `===` actually compares

Teaches value vs. reference equality, `Object.is` for `NaN` and signed zero, `Number.isNaN` over the coercing global, and why the course never writes `==`.

Topics to cover:

- The senior question. Two bugs the student will ship at least once: comparing two objects with `===` and being surprised they're not equal, and writing `if (x == null)` because someone on the team called it idiomatic and not knowing what else `==` covers. Both are equality bugs and both are decided by one rule: **the language has three equality operators, and a senior reaches for exactly one of them by default.**
- `===` semantics, terse. For primitives, compares by value; for objects, compares by reference (same allocation, not same shape). The student should leave able to answer "are these the same value?" and "are these the same object?" without ambiguity.
- Why the course never writes `==`. One paragraph: the loose-equality operator applies a coercion table that no one memorizes correctly, and the only honest use case (`x == null` matching both `null` and `undefined`) is better written as `x == null` reads — but the course's `??` and explicit null checks (Chapter 2.2.5) make that idiom unnecessary. Biome's `noDoubleEquals` rule (already enabled by 1.3.2's config) makes this a build-time check, not a discipline.
- The two edge cases `===` gets wrong. `NaN === NaN` is `false` (because IEEE 754 says so — the depth landed in 2.1.3). `+0 === -0` is `true` (because the spec says so), which sometimes matters for graphics, scientific computing, or hash keys.
- The `Object.is` escape hatch. Same as `===` except `Object.is(NaN, NaN) === true` and `Object.is(+0, -0) === false`. Named here as the rare reach when the student needs strict identity-of-bit-pattern (most often: writing a custom memoization key, writing a React-like reactivity equality check). The course names it because React itself uses `Object.is` for its bailout check (Chapter 4.7.1 forward link, one sentence).
- The `NaN`-checking surface. `Number.isNaN(x)` is the senior reach — checks if the value is the `NaN` value, returns `false` for anything else. The global `isNaN(x)` coerces first (`isNaN('hello') === true`), which is almost never what the caller meant. Companion: `Number.isFinite` over the global `isFinite` for the same reason. The pattern: prefer the `Number.*` namespaced forms; the globals are coercing legacy.
- Structural equality is not in the language. One paragraph: comparing two objects for "same shape" requires a library (`fast-deep-equal`, `lodash.isEqual`) or a hand-written walk. The course does not pull in a library for this in the first units; it names the gap and points to the patterns that avoid the need (deriving keys, comparing IDs, using discriminated unions per Chapter 2.5).
- Forward link to type-system equality. Reference equality is what React uses to decide whether to re-render (Chapter 4.7.1, 4.7.4). Knowing that `useState({})` creates a new object reference on every render is a value-semantics observation, not a React-specific quirk; this lesson installs the foundation.

What this lesson does not cover:

- The TC39 records-and-tuples proposal. Still Stage 2 in May 2026; not in the 2026 stack.
- Comparing `Date` objects by `.getTime()`. Surfaced where it earns its weight (Chapter 2.9.3, the Temporal pivot).
- Custom `valueOf` / `[Symbol.toPrimitive]` hooks. Niche, not on the course's senior path.
- The full coercion table. The student does not need to memorize what `[] == false` evaluates to; they need to know `==` is forbidden.

Pedagogical approach:

Mechanics archetype with a Decision opening. Open with two snippets (one comparing two object literals with `===`, one comparing two `NaN` values) and the surprising results in adjacent output blocks. Then the three-operator table (`==`, `===`, `Object.is`) in prose with one-line triggers. Use a small `script-coding` live block where the student runs `Number.isNaN(x)` against five inputs and compares with the global `isNaN(x)` — the divergence on `'hello'` lands inline. Close with one `MultipleChoice` exercise asking which of five equality forms is correct for each of five scenarios (object identity check, `NaN` test, finite-number guard, primitive value compare, the wrong answer that uses `==`). The exercise is the senior-reflex install.

Estimated student time: 25 to 30 minutes.

---

## Lesson 2.1.3 — Store cents, not dollars

Teaches IEEE 754 at the depth that bites, the integer-cents money rule, the `Number.is*` family, when `BigInt` earns its weight, and the `parseInt` vs. `Number` conversion choice.

Topics to cover:

- The senior question. The classic `0.1 + 0.2 === 0.30000000000000004` shows up in three places a SaaS team will hit: summing line-item totals on an invoice, multiplying a quantity by a unit price, and converting a user-entered dollar amount to cents for Stripe. Each of those is a real bug; each is fixed by the same rule.
- IEEE 754 at the depth that matters. One paragraph: every JavaScript `number` is a 64-bit double-precision float. That representation is exact for integers up to ±2^53−1 and approximate for fractions whose binary expansion is non-terminating (which is most decimal fractions, including 0.1). No deeper into the bit layout than that; the student needs the consequence, not the encoding.
- The integer-cents rule for money. State it plainly: store money as the integer count of the smallest unit (cents for USD, pence for GBP, the appropriate minor unit per ISO 4217 for the currency). Convert to and from a human display string at the boundary; never store, sum, or multiply dollars-as-floats. Stripe stores amounts as integer minor units; Drizzle's money columns store integers; the entire production stack agrees. This is the rule the chapter's name encodes.
- The `Number.is*` family the integer-cents discipline leans on. `Number.isInteger(x)` (the runtime check at a boundary), `Number.isFinite(x)` (the upstream sanity check before any math), `Number.isSafeInteger(x)` (the boundary check past which a regular `number` can't be trusted — at 2^53). One worked example: validating a user-submitted integer cents value with these checks before it hits the database.
- When `BigInt` earns its weight. Three sites named: 64-bit IDs from external systems (Twitter Snowflakes, some database BIGINT columns the application reads as a JS value), large counters that genuinely cross 2^53, cryptographic and hash-arithmetic code. Not for money in the SaaS sense — money fits in a regular `number` as integer cents for amounts under ~$90 trillion, which covers every customer. The cost of `BigInt` named: slower than `number`, doesn't mix with `number` in expressions (`1n + 1` throws), no `Math.*` interop, JSON serialization needs a custom replacer. The senior call is "use `number` until a real overflow forces the switch."
- String-to-number conversion. The senior surface and the trap.
  - `Number(input)` — strict; returns `NaN` if the whole string isn't a number. Default reach.
  - `parseInt(input, 10)` — parses the leading digits, ignores trailing garbage. Useful for parsing dimension strings like `'12px'`; almost always wrong for "convert this user input to a number." The radix argument is required; without it old engines guessed.
  - `parseFloat(input)` — same forgiving behavior, returns a float. Rarely the right answer.
  - `+input` — the unary-plus shortcut. Same behavior as `Number(input)`. Acceptable; the course writes `Number(input)` for legibility.
  - The rule: `Number(input)` plus a `Number.isFinite` guard at every entry point that takes a string and treats it as a number. Validation by Zod (Unit 7) absorbs this discipline later.
- The `NaN` propagation reflex. Every arithmetic operation involving `NaN` yields `NaN`. The bug class: a single bad input poisons every downstream calculation silently; the user sees `$NaN` on the invoice. The fix is the boundary check, not a downstream branch.
- Forward link. Unit 16 (Payments) lands the full Stripe integration on the integer-cents discipline this lesson installs; Unit 7 (Validation) wires Zod schemas that enforce it at the wire boundary; Unit 6 (Drizzle) names the column types that respect it. One sentence each.

What this lesson does not cover:

- The `Intl.NumberFormat` API for formatting currencies for display. Surfaced where it earns its weight, likely Unit 16 or wherever the first money display lands.
- The deprecated `Number.parseInt`/`Number.parseFloat` namespacing. Named in one line; identical behavior to the globals, no reason to prefer either.
- Decimal128 and the TC39 decimal proposal. Stage 1 in May 2026; not in the stack.
- Floating-point tolerance comparisons (`Math.abs(a - b) < EPSILON`). Niche; named in one sentence as the rare reach for scientific use cases.
- `Math.*` in depth (Chapter 2.3 implicitly covers the surfaces; this lesson references only `Math.round`/`Math.floor` for dollar-to-cents conversion).

Pedagogical approach:

Pattern archetype. The lesson teaches a failure mode (the silent `0.1 + 0.2` corruption) and the structural rule that prevents it (integer cents). Open with the `0.1 + 0.2` snippet and its output. State the rule. Show one full worked example: a user enters `$19.95`, the application multiplies by 100, rounds with `Math.round`, stores `1995` as an integer, formats on display by dividing and using `toFixed(2)`. Use a `predict-output` exercise on three subtle cases: `0.1 + 0.2`, `0.1 * 3`, and `1995 / 100`. Then a small `script-coding` block where the student writes the `dollarsToCents(input: string)` boundary function with `Number()` and `Math.round`, and the test cases validate the rule. Close with one `Buckets` exercise sorting six values ("a user's cart total," "a 64-bit external ID," "a quantity in stock," "a price in EUR," "an exponential backoff delay in ms," "a database row count") into "`number` is fine," "integer cents," "`BigInt`." That sorting is the senior-decision confirmation. Offer a `SandboxCallout` with a scratch dollars/cents converter so the student can play with edge inputs.

Estimated student time: 35 to 40 minutes.

---

## Lesson 2.1.4 — Why `.length` lies

Teaches code units vs. code points vs. grapheme clusters, `Intl.Segmenter` for user-perceived counts, `normalize` for visually-identical inputs, and the senior string-method surface.

Topics to cover:

- The senior question. A bio field has a 280-character limit. The user types 280 emojis and gets a "too long" error. Or the user pastes a name with combining marks and the duplicate-name check passes when the name is visually identical to one already in the database. Both are real bugs and both come from the same root: `string.length` in JavaScript counts **UTF-16 code units**, not characters the user perceives.
- The three units of length, with the example a senior remembers. The flag emoji 🇺🇸 has length 4 (two surrogate pairs). The emoji "👨‍👩‍👧‍👦" (family with zero-width joiners) has length 11. A "café" with a combining acute accent has length 5 even though the user sees four characters. The student doesn't need to memorize Unicode internals; they need to know that `.length` is a serialization detail, not a count of anything human.
- The three counts a senior chooses between.
  - **Code units** — `string.length`. The right answer when the value is a key, a serialized payload size constraint, or any other byte-shaped quantity.
  - **Code points** — `[...string].length` or `Array.from(string).length`. Counts Unicode code points (correctly handles surrogate pairs). Better than `.length` for most counts; still wrong for grapheme clusters.
  - **Grapheme clusters** — `new Intl.Segmenter(locale, { granularity: 'grapheme' })` then count the segments. The right answer for "how many characters does the user see." The 2026 senior reach for any length validation on user-facing fields.
- `Intl.Segmenter`, the 2026 surface. One paragraph: shipped in every modern runtime (Node 16+, every browser), locale-aware (Thai and Khmer have grapheme rules different from Latin scripts; the segmenter handles them). Show the canonical pattern in one short snippet — `const count = [...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(input)].length`. The companion granularities (`word`, `sentence`) named in one sentence as the reach for word-counting features.
- Normalization at the wire boundary. `'café' === 'café'` returns `false` when one string uses the combining mark and the other uses the precomposed character. Use `string.normalize('NFC')` to canonicalize before comparison or storage. The four forms (`NFC`, `NFD`, `NFKC`, `NFKD`) named with one-line triggers: `NFC` for storage and comparison (the senior default), `NFD` for decomposition-based search, the `K` forms for compatibility folding (rare). The rule: normalize at the database boundary, not at every comparison site.
- The senior string-method surface, terse. The methods the course will reach for and one-line triggers:
  - `includes` / `startsWith` / `endsWith` — substring tests, prefer over `indexOf !== -1`.
  - `at(-1)` — last-character access without `string[string.length - 1]` boilerplate.
  - `slice(start, end)` — substring extraction. Prefer over `substring` (no surprise argument-swap) and over `substr` (deprecated).
  - `split` and `join` — the array-of-segments boundary, paired.
  - `replaceAll(needle, replacement)` — the modern reach over `.replace` with a global regex when the needle is literal.
  - `trim` / `trimStart` / `trimEnd` — whitespace cleanup at input boundaries.
  - `padStart` / `padEnd` — formatting fixed-width columns; rare in SaaS UI, occasional in logs.
  - `localeCompare` — locale-aware sorting; the right answer for any user-visible sort.
- What does not earn a place. `substr` (deprecated). `escape`/`unescape` (deprecated). HTML-related methods on `String.prototype` (`bold`, `italics`, etc. — never use). `String.raw` (covered in 2.1.5, the tagged-templates lesson, where it belongs).
- Forward link. Zod string validations (Unit 7) accept a `.length` predicate that defaults to `.length` (code units). The senior call for user-facing fields is to write a custom refinement using the segmenter. One sentence; the pattern is recovered in Unit 7.

What this lesson does not cover:

- Unicode internals (planes, BMP, encoding forms). Not on the course's path.
- Regex Unicode flags (`u`, `v`) and property escapes — covered in 2.3.6 where regex earns its lesson.
- Internationalization broadly. The course defaults to English-only UI; `next-intl` is named in passing in later units.
- Collation rules in depth. `localeCompare`'s second argument and options object are mentioned once; the deep treatment lives in `Intl.Collator` documentation.

Pedagogical approach:

Mechanics archetype with one Concept beat at the front. Open with the bio-280-emojis bug in two sentences and the surprising `'🇺🇸'.length === 4` in an output block. Walk the three counts (`.length`, spread, `Intl.Segmenter`) in adjacent code blocks with the same input ("👨‍👩‍👧‍👦") and three different counts, so the divergence is unavoidable. The senior method surface lands as a tight prose list. Close with one `script-coding` exercise: implement `countCharacters(input: string)` that returns the user-perceived count using `Intl.Segmenter`, with tests covering the flag emoji, the family emoji, the combining-mark café, and an ASCII string. The test pass is the lesson's confirmation.

Estimated student time: 25 to 30 minutes.

---

## Lesson 2.1.5 — Backticks and tagged templates

Teaches template literals as the default for interpolation and multi-line strings, the tag-function mechanics, and `sql` and `dedent` as the canonical tagged-template cases.

Topics to cover:

- The senior question. Two failure modes the lesson prevents. First: hand-written string concatenation for URLs and SQL queries leaves the door open to injection and to off-by-one missing slashes. Second: writing multi-line strings as `'line 1\n' + 'line 2\n'` reads worse than the alternative and breaks when a translator moves the strings to a JSON file. The fix is one syntax form (template literals) and one extension (tagged templates) the student should reach for by default.
- Template literals as the default for interpolation. The shape: backticks, `${expression}` placeholders, the expression can be anything (a variable, a function call, a ternary). The rule: any string built from variables uses template literals; concatenation with `+` is a smell. Show the three or four shapes a senior writes daily — a URL with a path parameter, a heading with a count, a CSS class string built from a variant, a log message with a user ID.
- Multi-line strings without escapes. Backticks preserve newlines and leading whitespace. The watch-out: leading whitespace becomes part of the string, which is sometimes ugly inside an indented function body. That's where `dedent` enters (see below). One small note on `String.raw` — included here for completeness because it lives in the template-literal family — used to author strings with Windows paths or regex source where backslashes shouldn't be interpreted. Named in one sentence.
- Tagged templates: the mechanics. A tagged template is a function call where the syntax is `tag\`...\``. The tag receives the static-string segments (as a `TemplateStringsArray`) and the dynamic expression values (as the rest parameters). The tag can do whatever it wants with them — escape, interpolate, validate, build a parameterized query — before returning. One small example: a `currency` tag that converts an integer-cents value to a formatted dollar string inline. The student does not need to write tag functions daily; they need to recognize the shape so the canonical 2026 cases below read as natural.
- The two canonical 2026 cases.
  - **`sql\`SELECT * FROM users WHERE id = ${id}\`** — every modern SQL client and ORM ships a tagged template that parameterizes the dynamic expressions automatically. Drizzle exposes `sql` as the escape hatch when the query builder doesn't fit (Unit 6.x). Postgres.js and `@vercel/postgres` use the same shape. The senior framing: **the tagged template is what makes SQL safe by default in modern TypeScript** — the dynamic values are parameterized, not interpolated as strings; SQL injection requires the developer to deliberately step outside the tagged form.
  - **``dedent`...`** — the npm package the course uses to author multi-line strings (system prompts, email templates, fixture data, OpenAPI fragments) without indentation noise. The tag strips the common leading whitespace at runtime; the source reads aligned with its surroundings. Named here because it appears in later chapters (the email templates in Unit 8, the LLM prompts if they appear, the markdown content in fixtures) and the student should recognize the shape.
- Forward links. Drizzle's `sql` tagged template (Unit 6.x), email body authoring with `dedent` (Unit 8), and the broader principle that tagged templates are how the TypeScript ecosystem handles "string that's actually a structured query / structured document." One paragraph total.

What this lesson does not cover:

- Authoring custom tagged-template functions for production use. The mechanics are shown once; the course never asks the student to write one from scratch.
- The `String.raw` API at depth — niche.
- HTML templating with tagged templates (lit-html, Hono's `html`). Out of the SaaS stack the course teaches; not covered.
- CSS-in-JS via styled-components or Emotion. Stack-incompatible (course is Tailwind-only); not covered.

Pedagogical approach:

Mechanics archetype with a small Reference moment for the canonical cases. Open with the two failure modes (concatenated SQL, concatenated multi-line) in two short snippets. Walk the template-literal surface in a tight prose-plus-code section: interpolation, multi-line, leading whitespace caveat. Introduce tagged templates with one annotated diagram or `AnnotatedCode` block showing how the segments-and-expressions arguments are passed to the tag function — that diagram is the chapter's only mechanics moment. Show `sql\`...\`` against a Drizzle-style example and `dedent\`...\`` against a multi-line email body. Close with one `Matching` exercise pairing four template forms ("plain interpolation," "multi-line with indentation," "parameterized SQL," "aligned multi-line string with stripped indentation") to their tag (none, none, `sql`, `dedent`). The match is the recognition install; the student doesn't need to author the tags.

Estimated student time: 20 to 25 minutes.

---

## Lesson 2.1.6 — `const` binds, it doesn't freeze

Teaches `const` vs. `let` and when each earns its weight, block scope, the Temporal Dead Zone, hoisting demystified, and why `const` alone doesn't narrow types.

Topics to cover:

- The senior question. Two bugs the lesson prevents. First: a teammate writes `const config = { feature: true }` and is surprised when another module mutates `config.feature` to `false`. Second: a `let` that should have been `const` invites a reassignment six months later that breaks a function downstream. Both come from misunderstanding what `const` actually promises.
- The one-sentence rule. `const` is a binding that cannot be reassigned; it says nothing about whether the value the binding points to is mutable. Pair this with the binding diagram from 2.1.1 — `const` locks the arrow, not the box.
- `const` as the 2026 default; `let` as the conditional. Use `const` for every binding by default. Reach for `let` only when the binding must be reassigned — loop counters that aren't `for...of`, accumulator patterns the language doesn't provide better forms for, and a handful of imperative refactor cases. The senior reflex: if you wrote `let` and never reassigned, change it to `const`. Biome's `useConst` rule (already in 1.3.2's config) catches this automatically.
- `var` is dead. Stated once. The course never writes it; if the student sees it in legacy code, it's a `let` (block-scoped) or a `const` candidate. The function-scoping behavior of `var` is named in one sentence so the student recognizes the bug class in old code (`var` declared inside an `if` block leaks to the function scope).
- Block scope, terse. `let` and `const` are scoped to the nearest `{}` block — `for` loops, `if` branches, arbitrary block expressions, function bodies, arrow-function bodies. The scope is lexical, determined at write time, not at execution time.
- The Temporal Dead Zone, demystified. From the start of the block to the line where the binding is declared, the binding exists (the parser saw it) but accessing it throws a `ReferenceError`. Why this matters: the language is protecting the student from `var`-style "use before declaration silently returns undefined" bugs. One small example with `console.log(x); const x = 1;` failing at runtime; the senior reflex is to declare bindings at the top of the scope where they're used.
- Hoisting, demystified. Function declarations hoist their full body. Class declarations hoist their name but not their body (TDZ until the declaration line). `let` and `const` hoist their name but not their value (TDZ). `var` hoists its name and initializes it to `undefined`. The student does not need to memorize the table; they need to know that the 2026 forms (`const`, `let`, `class`) are TDZ-protected and `var` is the legacy form with surprising behavior. One paragraph, one small example.
- `Object.freeze` as the only way to make the value immutable. One paragraph: `Object.freeze(obj)` makes top-level properties read-only at runtime; further nesting is unfrozen (shallow, like the copies in 2.1.1). The course does not reach for `Object.freeze` in production code — TypeScript's `readonly` modifier and `as const` (Chapter 2.4.7) provide compile-time guarantees that catch the bug earlier without runtime cost. Named here so the student knows the distinction; the typing tools are the real story.
- `const` does not narrow types. The senior observation that bridges to the TypeScript chapters: `const greeting = 'hello'` gives TypeScript the literal type `'hello'` only for primitives; `const config = { feature: true }` gives the wider type `{ feature: boolean }`, not `{ feature: true }`. The fix — `as const` — is covered in Chapter 2.4.7. Named here because the senior reflex to add `as const` starts at the value-model level, not at the type-system level.
- Forward links. `readonly` field modifiers (Chapter 2.4.2), `as const` and `satisfies` (Chapter 2.4.7), closures and lexical capture (Chapter 2.2.7), and React state immutability (Unit 4.7.4 and 4.8.2). One sentence each.

What this lesson does not cover:

- Function declarations vs. function expressions in depth (Chapter 2.2.1).
- Scope chains and closures (Chapter 2.2.7).
- The `with` statement, `eval`, or anything strict-mode forbids. Not in the 2026 stack.
- Module scope vs. global scope. Modules are the only scope the course writes against; the global object is named in one line.

Pedagogical approach:

Concept archetype with a small Decision close. Open with the two bugs (`const` value mutated, `let` that should have been `const`) in short snippets. Restate the rule in one sentence and refer back to the binding diagram from 2.1.1. Walk block scope and TDZ with a small live block — a `script-coding` block where the student writes `console.log(x); const x = 1;` and reads the `ReferenceError`. Hoisting is a one-paragraph clarification, not a deep dive. The `Object.freeze` and "doesn't narrow types" beats are short bridges to the typing chapters. Close with one `Buckets` exercise sorting eight binding situations ("a configuration object the file reads once," "a loop counter in a `for` loop," "a `for...of` loop variable," "a sum being accumulated," "an HTTP response that depends on the result of a previous request," "an array being built incrementally with `.push`," "a constant primitive value," "a function reference") into "`const`," "`let`," or "could be either, prefer `const` because the body doesn't reassign." The sorting is the senior-reflex install.

Estimated student time: 30 to 35 minutes.

---

## Lesson 2.1.7 — Quizz

Top 10 topics to quiz:

1. Primitive vs. reference values and what `=` does to each.
2. Shallow copy via spread vs. deep copy via `structuredClone`, and which types `structuredClone` rejects.
3. `===` semantics for objects (reference identity, not structural).
4. The `NaN === NaN` and `+0 === -0` edge cases and the `Object.is` / `Number.isNaN` reach.
5. The integer-cents money rule and why floats fail at summation.
6. When `BigInt` earns its weight (64-bit external IDs, large counters) and when it doesn't (money, regular counts).
7. `string.length` counts UTF-16 code units; `Intl.Segmenter` is the user-perceived count.
8. Unicode normalization with `string.normalize('NFC')` at the storage boundary.
9. Tagged templates as the safe-SQL and aligned-multi-line surfaces (`sql`, `dedent`).
10. `const` binds, it doesn't freeze; TDZ; and why `const` doesn't narrow types without `as const`.

---

## Total chapter time

Roughly 165 to 195 minutes across the six content lessons plus the quiz. The chapter splits naturally across two evenings — 2.1.1 + 2.1.2 + 2.1.6 (the binding-and-comparison spine) as one sitting, 2.1.3 + 2.1.4 + 2.1.5 (the numbers-strings-templates triad) as the second. The quiz is the closing 15 to 20 minutes. At the end the student has the value-model fluency every later unit assumes — and the senior reflexes (integer cents for money, segmenter for user-facing lengths, `const` by default, `structuredClone` for deep copies, tagged templates for queries) that the rest of the course never re-explains.

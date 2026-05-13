# Chapter 2.1 — Values, references, and equality

## Chapter framing

This chapter opens Unit 2. The student lands on the codebase Chapter 1.4 scaffolded — Next.js 16, React 19, strict TypeScript, `env.ts` gating the build — and starts learning the language the rest of the course is written in. The frame is **JavaScript and TypeScript as one language.** The student writes types from the first snippet; TypeScript is the language they author, the JavaScript runtime is what executes.

The senior framing for the chapter: **every bug in this chapter's surface is one a returning dev has shipped at least once.** The accidental object alias that mutates state through two references. The `if (totalCents === 0.1 + 0.2)` that's false. The `string.length` that returns 4 for `"é"` or 12 for an emoji family. The `const config = { ... }` that mutates anyway because `const` binds, it doesn't freeze. The chapter doesn't survey the spec; it names the bug class for each primitive and shows the senior reflex that prevents it.

Threads that must run through every lesson:

- **Adult depth without ceremony.** The student knows what a variable is. They don't know what `Object.is(NaN, NaN)` returns, why `0.1 + 0.2` is `0.30000000000000004`, or why a `Set` of strings deduplicates user input but a `Set` of objects doesn't. The lessons start at the surprises and the senior fixes, not at "a number is a value."
- **Types from the first snippet.** Every code block is TypeScript. Annotations appear where they teach (function parameters, exported APIs, the rare case where inference is wrong); locals stay inferred. The student sees the TS error in their editor inline, not as a separate "TypeScript section" later. No JSDoc, no `any`, `unknown` named the moment a `catch` binding earns it (the full treatment is in 2.8).
- **The runtime under the syntax.** The lessons name what's actually happening — the binding vs. the value it points to, the IEEE 754 representation, the UTF-16 code unit sequence — only as deep as a SaaS engineer needs to read a stack trace and write the right guard. No academic detours into the spec.
- **The 2026 standard library.** ES2025 / ES2026 methods that ship in Node 24+ are the default surface. `Object.is`, `Number.isInteger`, `Number.isNaN`, `Number.EPSILON`, `String.prototype.normalize`, `Intl.Segmenter`, `structuredClone` — named at their call sites, with the old workaround dismissed in one line. Lodash and underscore are never named.
- **Naming for intent is seeded here, formalized in 2.2.2.** When this chapter writes `totalCents` instead of `total` (Numbers) or `userInput` instead of `s` (Strings), the discipline is being modeled. The student doesn't yet know it's Architectural Principle #4 — that name lands in the next chapter. They see the pattern operating first.

This chapter ships small standalone snippets, no application code. Lessons run inside live-coding components (`ScriptCoding`, `TypeCoding`) for immediate practice. The student finishes the chapter able to predict the result of any equality, any numeric, any string-length question on a senior code review, and able to name what binding a variable actually means.

The chapter ordering reflects the dependency between lessons. Values and references come first because every later lesson references the model. Equality comes second because `===` is meaningless without knowing whether two operands are the same value or two references to the same object. Numbers and strings are the two primitive types most likely to embarrass a returning dev. Template literals are last among the teaching lessons because they're a small, self-contained syntax beat that closes the chapter cleanly. Variables — `let`/`const`/TDZ — comes near the end because `const` only makes sense after the values-vs-references mental model is locked in; on a fresh reading "`const` doesn't make the object immutable" is the senior reflex the lesson finally explains.

---

## Lesson 2.1.1 — Values, references, and what assignment actually does

Topics to cover:

- The senior question: when you write `const b = a`, what just happened. The returning dev's intuition is "I made a copy." The truth is "I made a second binding to whatever `a` already pointed at — which for primitives is a copy, and for objects is a shared reference." The chapter turns on this distinction; it is the load-bearing model.
- The two categories in JavaScript: primitive types (`string`, `number`, `bigint`, `boolean`, `symbol`, `null`, `undefined`) and objects (everything else, including arrays, functions, dates, regexes, maps, sets, class instances). Primitives are immutable values; objects are mutable, and variables hold references to them.
- The variable-as-binding model. A variable name is a label that points at a value. Assignment changes what the label points at — it doesn't change the value the previous label was pointing at. Demonstrated with a tight pair of snippets: primitives where the two bindings diverge cleanly, and objects where the two bindings observe each other's mutations.
- Function calls follow the same rule. Pass a primitive, the function gets a copy of the value. Pass an object, the function gets a reference to the same object — mutating its properties is visible to the caller. This is the surprise that ships the accidental-mutation bug in mapper functions and reducers.
- The shallow vs. deep copy distinction, named for what each prevents. `{ ...obj }` and `Object.assign({}, obj)` make a shallow copy — top-level properties are duplicated, nested objects are still shared. `structuredClone(obj)` (built into Node 22+, the 2026 standard) is the deep copy when the senior needs one — handles `Date`, `Map`, `Set`, typed arrays, circular references; rejects functions, DOM nodes, prototype chains. The trigger that earns `structuredClone`: nested state the caller and callee both intend to mutate independently. Default is to design APIs that don't need deep copies — immutability by convention beats copying by reflex.
- `Object.freeze` named once as the conditional. Locks the top-level properties of an object against mutation (still shallow — nested objects remain mutable). TypeScript's `readonly` and `as const` (taught in 2.4.3 and 2.4.8) cover the compile-time half; `Object.freeze` covers the runtime half when the runtime guarantee is load-bearing (a frozen config object, a module-level constant other modules must not mutate). For most cases, the discipline lives in the type system, not in `Object.freeze`.
- The TypeScript view, woven in. Primitives map to the lowercase type names (`string`, `number`, etc.); object literals map to their structural shape. The `readonly` modifier on a property prevents reassignment of that property at the type level — a one-line preview of 2.4.3 so the student knows the compile-time tool exists. The lesson does not teach `readonly` in depth here.

What this lesson does not cover:

- Equality (handled in 2.1.2).
- `let` vs. `const` and the rebinding-vs-mutation distinction at the variable level — that's the lesson where it fires (2.1.6).
- Symbols and BigInts beyond naming them as primitives (BigInt earns a beat in 2.1.3 alongside Numbers; Symbol is a 2.4.1 mention).
- `Object.freeze` in depth (one sentence here, the conditional flag named).
- Deep-equality checks (`fast-deep-equal`, `node:util.isDeepStrictEqual`) — out of scope; this lesson is about what assignment does, not about comparing two values for structural equality.

Pedagogical approach:

Concept archetype. The mental model is everything in this lesson — without it, 2.1.2's equality semantics are mysterious. Open with the "when you write `const b = a`, what just happened" question in one paragraph, then a tight pair of `ScriptCoding` blocks: one with two number bindings (mutate one, watch the other stay), one with two object bindings (mutate one, watch the other change). The student sees the cause and effect with their own keystrokes before any prose explanation. A small interactive diagram — `ArrowDiagram` inside a `Figure`, or a custom widget — visualizes a variable-as-label-on-a-box: the boxes are values in memory, the labels are the variable names, and the student can click "reassign `b`" to see the label move while the box stays. This is the load-bearing model; the diagram is where it gets installed. After the model, walk function-call pass-by-value-vs-reference with one short snippet (a `pushItem(list, item)` that mutates its argument vs. a `withItem(list, item)` that returns a new array — name the senior preference plainly). Show `structuredClone` once with a nested-object example. Close with a `PredictOutput` exercise: four short snippets, the student predicts what each prints, each one isolating a specific surprise (shared reference, shallow copy gotcha, function-arg mutation, `structuredClone` of a `Date`). No sandbox: the lesson has enough live coding inline.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.1.2 — Equality semantics

Topics to cover:

- The senior question: what does `===` actually compare. For primitives, it compares values (with two special cases below). For objects, it compares references — two object literals with identical contents are not `===` because they're two different objects in memory. The lesson cashes in 2.1.1's mental model: `===` on objects asks "same box?", not "same contents?".
- The four equality operators ranked by when a senior reaches for them:
  - `===` — the default. Value comparison for primitives, reference comparison for objects. The course uses it everywhere.
  - `==` — never the default in 2026. Type-coercing equality has predictable rules but the bug class it produces (`0 == ""`, `[] == false`, `null == undefined`) costs more than the keystroke it saves. Named once, dismissed; the course doesn't write `==`. The exception, `value == null` to catch both `null` and `undefined`, is a real idiom in older codebases — the modern replacement is `value === null || value === undefined` or `value == null` accepted as the one allowed `==` (some style guides allow it; the course writes the explicit form).
  - `Object.is(a, b)` — the conditional power tool past two named triggers. Trigger one: distinguishing `+0` from `-0` (`+0 === -0` is `true`; `Object.is(+0, -0)` is `false`). Trigger two: testing for `NaN` (`NaN === NaN` is `false`; `Object.is(NaN, NaN)` is `true`). Both triggers are rare but real — `Object.is` is also what React uses internally for its bail-out comparison in `useState` setters, named here as a forward reference so the student isn't surprised when 4.7 names the algorithm.
  - `Number.isNaN(x)` — the senior way to test for `NaN`. The global `isNaN(x)` coerces its argument (`isNaN("hello")` is `true` because the string coerces to `NaN` and then `NaN` is `NaN`), which is almost never what the caller wants. `Number.isNaN` only returns `true` for the actual `NaN` value. The lesson states the rule plainly: use `Number.isNaN`, never the global.
- The three values that produce surprises with `===`: `NaN !== NaN`, `+0 === -0`, and the object-identity case. The student writes a short snippet that exhibits each. The "why" for `NaN`: IEEE 754 defines `NaN` as not equal to anything including itself, because two computations that both fail to produce a number are not meaningfully the same failure. The "why" for object identity: it's the same model from 2.1.1 — two different boxes are different even with identical contents.
- TypeScript's narrowing fires here. `if (x === null) { ... }` narrows `x`'s type below the guard; the student should see this in their editor on every snippet. The `Object.is` and `Number.isNaN` paths narrow the same way (`Number.isNaN` is a type guard that narrows `number` to `number` minus `NaN`, which TS doesn't model — the lesson names this as the one place the type system is weaker than the runtime).
- One sentence on deep / structural equality. Comparing two objects for "same shape and same values" is a different question from `===`. The course doesn't ship a deep-equal helper by default — when the question comes up (e.g. `useEffect` dependency comparison, taught in 4.9), the answer is usually "restructure so the question doesn't arise" rather than "ship a helper." Named once so the student knows where it goes.

What this lesson does not cover:

- The `==` coercion table in detail (one line; the course doesn't write `==`).
- `SameValueZero` (the algorithm `Set` / `Map` use to dedupe) — named in 2.3.4 where it earns its weight. One sentence here pointing forward.
- Object structural equality (out of scope; one-sentence acknowledgment).

Pedagogical approach:

Mechanics archetype with a Decision opening. Open with the "`===` compares what?" question — one paragraph, primitives vs. objects. Use a `ScriptCoding` with three blocks the student runs in order: primitive equality (works as expected), object identity (two literals with identical contents are not equal), and the same object aliased through two variables (now they are equal). That progression walks the model from "obvious" to "the senior reflex." Then a `CodeVariants` for the three surprises (`NaN`, signed zero, object identity), each tab showing the broken expression and the `Object.is` or `Number.isNaN` fix immediately following. A `Term` for `NaN` in prose, hovering reveals the one-line definition. Close with a `Buckets` exercise sorting eight expressions into "use `===`," "use `Object.is`," "use `Number.isNaN`," "never use `==`" — the student earns the reflex of picking the right operator before they write one. No sandbox needed.

Estimated student time: 25 to 35 minutes.

---

## Lesson 2.1.3 — Numbers, BigInt, and money

Topics to cover:

- The senior question: when is the JavaScript `number` type wrong for the job. Answer: any time the value represents money, large integer IDs, high-precision counters, or arithmetic where rounding errors compound. The lesson teaches the floor of numeric awareness a SaaS engineer needs to avoid shipping a billing bug or a counter overflow.
- The IEEE 754 double-precision floating-point representation, at the depth that bites. Every JavaScript `number` is a 64-bit float — 53 bits of mantissa, 11 bits of exponent. The consequences named without the spec detour: integers are exact only up to `Number.MAX_SAFE_INTEGER` (`2^53 - 1`, roughly `9.007 × 10^15`); decimal fractions like `0.1` and `0.2` are not exactly representable, so `0.1 + 0.2 === 0.30000000000000004`. The lesson does not derive the format; it names what to expect and what to do.
- The money rule, stated plainly. **Don't store currency in floats.** Store the smallest unit as an integer (cents for USD, smallest-fractional-unit for the currency) and format for display only. The senior reflex: a Drizzle `numeric` column or a Postgres `bigint` cents column; never a float. (The schema treatment is in 6.2.3.) Stripe's API works in cents end-to-end (Unit 14); the student sees the pattern at the boundary later.
- `Number.EPSILON` for "close enough" comparisons when float arithmetic is unavoidable (e.g. graphics, sensor data). `Math.abs(a - b) < Number.EPSILON` for values near 1; for larger magnitudes the comparison needs to scale by magnitude. The course doesn't lean on this — money is the integer rule above — but the technique is named because the student will hit it in any non-financial calculation.
- The modern numeric type-guards on the `Number` namespace, each named for what it catches: `Number.isInteger(x)` (true integers only — `Number.isInteger(2.0)` is true, `Number.isInteger(NaN)` is false); `Number.isFinite(x)` (excludes `NaN` and the infinities, unlike the global `isFinite` which coerces); `Number.isSafeInteger(x)` (within `MAX_SAFE_INTEGER`). The senior rule: prefer the `Number.is*` family over the globals, for the same reason as `Number.isNaN` in 2.1.2 — no coercion surprises.
- `BigInt` for arbitrary-precision integers. The `100n` literal syntax, the type, the runtime semantics. The senior question: when does `BigInt` earn its weight. Two triggers named. One: large integer IDs that exceed `MAX_SAFE_INTEGER` (some external APIs return Snowflake IDs in this range; database row counts in long-running tables can too). Two: high-precision counters where the cents trick doesn't fit (rare in SaaS). The cost of `BigInt`: no JSON support without `toString` (revisited in 2.9.1), no mixing with regular `number` arithmetic without an explicit conversion. The default in SaaS code is regular `number`; `BigInt` is the conditional.
- Numeric conversions and the three traps. `parseInt(s, 10)` — the `radix` argument is mandatory in the course's style, because skipping it is the canonical "parsed '08' as octal" bug class even though modern engines default to base 10. `parseFloat(s)`. `Number(s)` — strict, rejects partial garbage that `parseInt` would accept (`Number("12px")` is `NaN`, `parseInt("12px", 10)` is `12`); the senior call is `Number(s)` for "the whole string must be a number" and `parseInt` for "extract a leading integer." `+s` as the implicit conversion — works, but reads as a typo; the course prefers explicit `Number(s)`.
- One forward reference. Zod (Unit 7) handles user-input string-to-number conversion at the boundary in production code — the student doesn't write `Number(formData.get('amount'))` in a real handler. The mechanics matter because Zod is built on them.

What this lesson does not cover:

- The full IEEE 754 derivation, denormals, NaN payloads — out of scope.
- `Math` library tour — assumed knowledge; specific methods (`Math.floor`, `Math.round`, `Math.max`, `Math.random`) are named at the call sites where they earn their weight, not as a survey here.
- Locale-aware number formatting (`Intl.NumberFormat`) — surfaced in 4.5 (typography/i18n) or wherever currency formatting first ships.
- Decimal128 / TC39 decimal proposal — Stage 1 in 2026, not shippable. One-line mention if at all, but probably cut.

Pedagogical approach:

Concept archetype with one Pattern beat for the money rule. Open with the `0.1 + 0.2` snippet in a `ScriptCoding` — the student runs it, sees `0.30000000000000004`, and from that one fact the rest of the lesson follows. The IEEE 754 framing comes after the snippet, in one tight paragraph, because the student now wants the explanation. Then the money rule as a labeled callout (`Aside type="caution"`) — "store cents, format dollars" — followed by a small `CodeVariants` showing the broken `total = 0.1 + 0.2` summing against a target of `0.3`, vs. the fixed `totalCents = 10 + 20` summing against `30`. The student sees the senior fix is a data-modeling decision, not a numeric trick. Walk the `Number.is*` family in a short `ScriptCoding` block — four assertions side by side. `BigInt` gets one `ScriptCoding` with the `n` suffix and the no-mixing rule. Conversions get one `CodeVariants` comparing `parseInt`, `parseFloat`, and `Number` on the same three inputs (a clean integer, "12px", "12.5"), so the student internalizes which one to reach for. Close with a `MultipleChoice` exercise on a billing-system scenario — given five lines of code, the student picks the one that ships the rounding bug. No sandbox.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.1.4 — Strings, Unicode, and the length problem

Topics to cover:

- The senior question: what does `"é".length` return, and why is it not 1. The lesson opens on the embarrassing answer (it's 2 in some encodings, 1 in others depending on the input; for `"é"` written as a single Unicode code point U+00E9 it's 1, but `"é"` written as `e` + the combining acute accent U+0301 it's 2 — visually identical strings, different lengths). For emoji and family clusters, `.length` ranges from 2 to 14 for a single user-perceived character. The chapter cashes in this fact: `string.length` is the count of UTF-16 code units, not characters; for any input that includes user content (names, comments, social posts, anything from a non-English locale), `.length` is the wrong number to ship to a validator or a truncator.
- The three units of a string, named so the student has the vocabulary. **Code units** — `string.length`, `string[i]`, `string.charCodeAt(i)` operate on these (UTF-16 16-bit units). **Code points** — full Unicode scalar values, what `for...of`, `[...string]`, and `string.codePointAt(i)` iterate; a non-BMP code point (emoji, ancient scripts) is two UTF-16 code units. **Grapheme clusters** — user-perceived characters, what `Intl.Segmenter` iterates; one grapheme can be many code points (combining marks, ZWJ sequences, flags, skin tones).
- The senior reflex for each question:
  - "Count characters as a user sees them" — `Intl.Segmenter` with `granularity: 'grapheme'`. Available in Node 22+ unflagged, ECMA-402 stable. The course never reaches for `.length` for user-perceived counts.
  - "Iterate code points" — `for...of` or `[...string]`. Modern, correct for non-BMP. The course never reaches for `for (let i = 0; i < s.length; i++)` on user content.
  - "Compare two visually-identical strings that might be encoded differently" — `s.normalize('NFC')` before the comparison. Catches the "is `'café' === 'café'`?" bug when one is precomposed and the other is decomposed.
- The common string-method surface a SaaS engineer reaches for. Named in a grouped reference with one line each on the senior trigger. Search and test — `includes`, `startsWith`, `endsWith`, `indexOf`. Slice and split — `slice` (vs. the deprecated `substr` and the legacy `substring` — `slice` is the modern choice), `split` (named groups in 2.3.6 regex). Whitespace — `trim`, `trimStart`, `trimEnd`. Case — `toLowerCase`, `toUpperCase`, `toLocaleLowerCase` / `toLocaleUpperCase` for locale-aware case folding (Turkish dotless-i is the canonical bug). Padding — `padStart`, `padEnd`. Repeat — `repeat`. Replace — `replace`, `replaceAll` (ES2021; the all-occurrences method that removed the legacy `replace(regex, ...)` workaround). The lesson does not survey every method; it names which ones earn the senior's first reach.
- One sentence on `String.raw` — the only `String` static method worth naming here. Reads a template literal without interpreting backslash escapes; useful in Windows paths and the few places a raw regex source matters. The full template-literal treatment is in 2.1.5.
- TypeScript's view. Strings are `string` everywhere; literal-string types (`'paid' | 'open' | 'void'`) are a 2.4.1 preview. The lesson does not teach literal types here, but every code block uses `string` annotations on function parameters so the student writes the form they'll see in 2.4.

What this lesson does not cover:

- Regex (handled in 2.3.6).
- Template literals (handled in 2.1.5).
- `Intl.NumberFormat`, `Intl.DateTimeFormat`, and the rest of the `Intl` namespace — only `Intl.Segmenter` is named here, at the call site where it earns its weight.
- Encoding / decoding (`TextEncoder`, `TextDecoder`) — surface for working with binary data, named in Unit 3 (browser platform) where the fetch and stream APIs use it.
- Locale-aware sorting (`Intl.Collator`) — out of scope here; named in passing if a later chapter needs it.

Pedagogical approach:

Concept with a Reference / survey middle. The lesson hangs on one fact (`"👨‍👩‍👧‍👦".length` is 11) and one tool (`Intl.Segmenter`). Open with a `ScriptCoding` where the student runs `.length` on three inputs — a simple ASCII string, a string with a combining accent, and a family emoji — and sees three surprising numbers. The senior question — "which of these is right?" — is the bridge into the three-units vocabulary. Show the vocabulary with a small `DiagramSequence`: tab one shows the same string with code units highlighted, tab two with code points, tab three with graphemes; the student scrubs and watches the boundaries change on the same visual. Then a `ScriptCoding` that iterates the same string three ways (`for (let i...)`, `for...of`, `Intl.Segmenter`) and prints the counts side by side. The common-method surface comes after the model in a compact reference block — no `CodeVariants`, just a tight prose list with senior triggers, because surveying the whole API tab by tab would inflate the lesson. Close with a `PredictOutput` exercise: four `.length` results on a mixed input, the student predicts the surprising number for each. Optional `SandboxCallout` with a pre-seeded `Intl.Segmenter` and a string field — the student types emoji and watches the grapheme count update.

Estimated student time: 35 to 45 minutes.

---

## Lesson 2.1.5 — Template literals and tagged templates

Topics to cover:

- The senior question: when does a template literal earn its weight over string concatenation. Two cases. One: any string that interpolates one or more values — template literals are unambiguously the form (`+` for string concatenation is fine for two operands, ugly past three, and never the senior's first reach in 2026). Two: any multi-line string — escape sequences for newlines are a code smell; the literal carries the line breaks. The course writes template literals as the default for both cases.
- The mechanics. Backticks, `${expr}` for interpolation, the expression can be any JavaScript expression (a call, a ternary, another template). Multi-line literals preserve whitespace exactly — the senior watch-out: indented code that wraps a template can leak the indentation into the string. Named once with the dedent fix (a tagged template, below).
- Tagged template literals — the conditional power tool. A tag is a function that receives the literal's static parts and its interpolated values; what it returns can be a string, an object, or anything. The mechanism named with a trivial example (a `highlight` tag that wraps each interpolation in `<mark>`), then the three real-world tags the course uses or names:
  - `sql\`SELECT * FROM users WHERE id = ${userId}\`` — Drizzle's escape hatch into raw SQL with proper parameterization (the named treatment is in 6.3.10). The student should recognize the syntax when they meet it.
  - The CSS-in-JS tags (`styled\`...\``, `css\`...\``) — the course doesn't ship a CSS-in-JS library (Tailwind is the surface), but every senior recognizes the form. Named in one line, dismissed.
  - A `dedent` tag for multi-line literals that need their leading indentation stripped — the small utility the student will write or import a hundred times in a career, named here so they recognize the pattern. (The course doesn't ship its own `dedent`; it names the trigger.)
- The runtime mechanics, one paragraph deep. The tag function receives the strings as a `TemplateStringsArray` (a frozen array with a `raw` property that holds the unescaped source — used for things like regex literals built from templates). The values arrive as a separate variadic argument list. The senior watch-out: tag functions are called once per *string literal site* with the same `strings` array reference across invocations — useful for memoizing static work like parsing the static parts, taught in passing because it shows up in any sophisticated tag.
- TypeScript's view. Template literals have type `string` by default. **Template literal types** (`\`/users/${string}\``) are a separate type-level feature that lets a type encode a string's structure; named here as a one-line forward reference because the student will see them used in route-typed APIs (Next.js typed routes in Unit 5) and inferred-key utilities. The course doesn't teach template literal types here; the runtime mechanics are the lesson.

What this lesson does not cover:

- The full taxonomy of template literal types (Unit 2.4 / 2.5 surface them where they earn their weight).
- Writing a CSS-in-JS or styled-components implementation — out of scope, not the course's stack.
- The exact `sql` tag implementation in Drizzle — 6.3.10 owns it.
- HTML templating engines (`lit-html`, etc.) — not in the stack.

Pedagogical approach:

Mechanics archetype. The plain template literal half of the lesson is short — most returning devs know the syntax — so the lesson's center of gravity is tagged templates and what they earn. Open with a `CodeVariants` of the same multi-line interpolation written three ways: concatenation, template literal, and a tagged template that dedents. The student sees the three forms in one shot and the senior preference is obvious. For the tag mechanics, walk one toy tag in an `AnnotatedCode` — `function highlight(strings, ...values) { ... }` — with each annotation pointing at one moving part (the `strings` array, the `raw` property, the variadic values, the return). Then a `ScriptCoding` where the student writes a tiny `sql` tag that returns an object `{ text, params }` — the simplest possible parameterization sketch — and runs it on one interpolated value. The exercise is the lesson's confirmation; the student understands the shape Drizzle relies on without having to wait for Unit 6. Close with one `Matching` exercise pairing four tag use cases ("dedent multi-line strings," "parameterize SQL," "syntax-highlight code in a CMS," "build a typed URL") to "tagged template," "regular template," or "neither, use a function." No sandbox.

Estimated student time: 25 to 35 minutes.

---

## Lesson 2.1.6 — Variables — `let`, `const`, scope, and the TDZ

Topics to cover:

- The senior question: what does `const` actually prevent. The returning dev's intuition is often "the value can't change." The truth is "the binding can't be reassigned — but if the value is an object, its properties are still mutable." This is the question 2.1.1 set up: `const config = { port: 3000 }` means `config = somethingElse` is a `TypeError`, but `config.port = 4000` is fine. The lesson cashes in the values-vs-references model from 2.1.1 and names the senior reflex.
- The two bindings and when each earns its weight. `const` is the default in 2026 SaaS code; every binding gets `const` unless the lesson can name a reason it can't. The reason is almost always "this binding is reassigned inside a loop or a branch, and the reassignment is the point" — a counter, an accumulator at module scope, a `let` for a value that's narrowed and then assigned in one branch. The course writes `let` deliberately, never reflexively. `var` is named once as deprecated and never used — function-scoped, hoisted-as-`undefined`, ignores the TDZ — the bug surface it carries is exactly why `let` and `const` exist.
- Block scope. `let` and `const` are block-scoped (every `{ ... }`); `var` is function-scoped. The practical consequence the student will hit: a `for` loop's iteration variable as `let` is freshly bound each iteration (so a closure captures the iteration's value, not the final value), where `var` would capture the function-scoped variable and produce the canonical "all the callbacks see the final value" bug. The closure treatment is 2.2.3; this lesson names the scoping rule that makes it work.
- The Temporal Dead Zone, named for what it prevents. `let` and `const` bindings exist in their scope from the start of the block but are uninitialized until the declaration line — accessing them before the declaration is a `ReferenceError`, not `undefined`. This is the structural enforcement that catches the use-before-declare bug that `var` would silently produce as `undefined`. The lesson shows the contrast in a tight `CodeVariants` and moves on.
- Hoisting, named once and demystified. Function declarations hoist their full definition (a `function foo() {}` at the bottom of a file is callable from the top — useful, often surprising). `var` declarations hoist as `undefined`. `let` and `const` declarations hoist but are in the TDZ until reached. Class declarations hoist but, like `let`/`const`, are in the TDZ until evaluated. The lesson does not lean on hoisting — modern code declares things before it uses them — but the student needs the vocabulary to read a stack trace and to understand why ESLint flags the few places hoisting bites.
- `const` and TypeScript. `const` does not narrow an object's type the way `as const` does (taught in 2.4.8). A `const foo = { status: 'open' }` still has type `{ status: string }`, not `{ status: 'open' }` — the binding is constant, but the type is wide. The narrowing tool is `as const`, named here as a forward reference so the student doesn't expect `const` alone to do the type-narrowing work.
- The senior style summary. Use `const` everywhere it fits. Reach for `let` deliberately, with the senior question "is this binding being reassigned, or am I about to mutate something I should have written immutably?" One paragraph closes the lesson.

What this lesson does not cover:

- Closures in depth (2.2.3).
- `as const` and literal-type narrowing (2.4.8).
- Function-scope deep dive — function-scope is named in the `var` dismissal and the closure preview.
- Destructuring binding patterns (2.2.5).
- `with` statements, `eval` scope — out of scope.

Pedagogical approach:

Mechanics with a small Decision beat at the top. Open with the `const config = { port: 3000 }` snippet — try to reassign, watch the `TypeError`; try to mutate `config.port`, watch it succeed. That one snippet is the senior reflex the lesson is building, and showing the surprise in code first is faster than explaining it in prose. After the snippet, the one-paragraph clarification of binding-vs-value (a callback to 2.1.1's mental model, which the student now has). Then a `CodeVariants` for the TDZ — one tab with `var x = 1; console.log(x)` reordered so the access precedes the declaration (silent `undefined`), and one tab with the same shape using `let` (the `ReferenceError`). Show the closure-loop preview in a `ScriptCoding`: a `for` loop with `let` printing the captured value at the end of each tick (correct), and the same with `var` (all the final value). The student sees the bug that block-scope prevents without needing to wait for 2.2.3. Close with a `Tokens` exercise: a small annotated snippet where the student clicks every binding that should be `const` and every binding that should be `let` — the discipline check the lesson is building toward. No sandbox; the live coding blocks have already done that work.

Estimated student time: 30 to 40 minutes.

---

## Lesson 2.1.7 — Quizz

Top ten topics to quiz:

1. Predicting the result of assigning an object to two variables and mutating one — does the other observe the change.
2. Distinguishing primitive copy vs. object reference in a function parameter.
3. When `===` returns `false` on values that look the same (object identity, two different literals).
4. The `NaN === NaN` surprise and the correct test (`Number.isNaN` or `Object.is`).
5. The `0.1 + 0.2` floating-point result and the senior fix (store smallest unit as integer).
6. The money rule — currency in cents, not floats.
7. `string.length` on an emoji or accented input vs. `Intl.Segmenter` grapheme count.
8. The three units of a string — code units, code points, grapheme clusters — and which method maps to which.
9. What `const` prevents (rebinding) vs. what it doesn't (mutation of the object's properties).
10. The Temporal Dead Zone — accessing a `let`/`const` binding before its declaration throws, not returns `undefined`.

---

## Total chapter time

Roughly 185 to 245 minutes across the six teaching lessons plus the quiz. The chapter splits naturally across three or four evenings — values/equality (2.1.1 + 2.1.2) as one sitting, numbers and strings (2.1.3 + 2.1.4) as the second, template literals and variables (2.1.5 + 2.1.6) as the third, and the quiz as a short fourth. The student finishes able to predict the result of any value-or-reference, equality, numeric, or string-length question on a senior code review, and Chapter 2.2 (Functions, naming, and control flow) lands directly on this floor.

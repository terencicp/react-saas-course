# Chapter 2.2 — Functions, naming, and control flow

## Chapter framing

Chapter 2.1 installed the value model. This chapter teaches the **shape of the code that operates on those values** — how functions are declared, how signatures stay readable past a couple of parameters, how names communicate intent, how control flow stays flat, how nullish operators replace defensive branching, how destructuring becomes the API call-shape, and how closures capture lexically by reference. These are the daily-write surfaces of a 2026 SaaS codebase. The student will reach for every one of them on the first React component, the first Server Action, and the first Drizzle query in later units, and the course never re-teaches the form.

Threads that must run through every lesson:

- **Decisions before syntax.** Each lesson opens with the production failure mode the form prevents — a mutated callback that fires after a route change, a six-positional-argument call site no reviewer can read, a `||` that swallowed `0`, a destructure that forwarded a stale `id`. The syntax follows the failure.
- **One language, TypeScript-flavored.** Every example is `.ts` with inference-led typing. The JavaScript primitive is named at the call site; the type-system depth (predicates, narrowing) is referenced but parked until Chapter 2.4 and 2.5.
- **Senior reflexes, not surveys.** The course never enumerates every loop form or every operator. Each lesson commits to the default and names the one or two alternatives with the trigger that flips the choice.
- **Forward links land softly.** Closures foreshadow `useEffect` cleanups and Server Action capture (Unit 4.8 and 5.2.4). Destructuring foreshadows React props (Unit 4.6) and Server Action `FormData`. The options-object pattern foreshadows the wrapper idioms in 2.5.7. One sentence each.
- **Biome is doing half the work.** Rules from Chapter 1.3.2 — `useConst`, `noDoubleEquals`, `useArrowFunction`, `noUselessElse`, `useExhaustiveDependencies` — turn many of these reflexes into build-time checks. Each lesson names the rule that enforces it where one exists, so the student knows the linter is the safety net, not vibes.

The student finishes the chapter able to write a function any reviewer in 2026 would accept the first time — clear signature, intent-revealing name, flat control flow, no falsy defaults, destructured parameters, closures used deliberately — and to recognize the bug class each form prevents. Containers (objects, arrays, maps) arrive in 2.3; the type-system depth that backs these forms lands in 2.4 and 2.5.

---

## Lesson 2.2.1 — Arrow by default, declaration on demand

Teaches the three function forms, the senior rule that arrow expressions bound to `const` are the 2026 default, and the narrow triggers (hoisting, named recursion, type-guard signatures) that earn a `function` declaration.

Topics to cover:

- The senior question. Three function forms exist in 2026 TypeScript — arrow expressions, `function` declarations, and `function` expressions. The team picks one default and one trigger that flips it; rotating between forms randomly is the smell. The lesson installs the default and the triggers, not the full mechanics of `this` and prototypes (which 2.9.2 will revisit at the narrow surface where classes still matter).
- The default: `const name = (args) => body` bound to `const`. Why this wins as a default — concise at the call site, no `this` rebinding surprise inside callbacks (the historical 2018-era arrow-vs-`function` debate that returning devs remember), reads like data when assigned to a variable, and pairs with `const`-by-default from 2.1.6. Biome's `useArrowFunction` rule auto-fixes the obvious cases.
- Implicit return vs. block body. The single-expression form (`(x) => x * 2`) for one-liners; the block form (`(x) => { ... return ...; }`) the moment a statement is needed. The watch-out: the `({ key: value })` object-return form requires the parens around the literal — without them the braces parse as a block. One short snippet of the mistake and the fix.
- The three triggers that earn a `function` declaration.
  - **Hoisting.** Top-of-file helper used by code declared above it. `function` declarations hoist their full body; arrow `const`s are in the Temporal Dead Zone until the line they're declared on. Rare in 2026 (most code is import-first and module-scoped), but real for in-module recursion helpers and a small set of organizational layouts.
  - **Named recursion.** A recursive helper that wants to refer to itself by name without aliasing through the outer `const`. `function walk(node) { ... walk(child) ... }` is the cleaner form than an arrow that has to capture its own binding.
  - **TypeScript type-guard signatures and assertion functions.** `function isUser(x: unknown): x is User { ... }` and `function assertUser(x: unknown): asserts x is User { ... }` (where `unknown`, the predicate `x is T`, and the assertion `asserts x is T` are introduced in 2.4.1 / 2.4.6 / 2.5.3 — named here only so the student recognizes the shape that earns a `function` declaration). Both forms require the `function` keyword today — the predicate and assertion syntax does not parse against arrow expressions. The course's narrowing chapter (2.4.6) and exhaustiveness chapter (2.5.3) lean on these.
- Method shorthand inside object literals (`{ greet() { ... } }`) — named in one paragraph as the third form that earns its place inside config objects, Drizzle relation definitions, and route handler exports. Not a separate trigger; a syntactic shortcut when the function lives inside an object literal.
- One paragraph on `function` expressions (the `const fn = function name() { ... }` form). Useful only when the expression form needs an internal name for recursion or debugging; almost always replaced by either an arrow or a declaration. Named once so the student recognizes it.
- The `this` rule, stated and dropped. Arrow functions inherit `this` from the enclosing lexical scope; `function` forms get their own `this` based on the call site. Inside the React + Server Components stack the course teaches, the student writes essentially no `this` — components are functions, Drizzle calls are functions, server actions are functions. The rule is named so the student isn't surprised when they see it in third-party class-based code (some SDKs, the rare `Error` subclass authored in 2.9.2).
- Forward links. Components in Unit 4 are arrow expressions bound to `const`. Server Actions in Unit 5.2 are async arrow expressions exported by name. Type predicates and assertion functions appear in 2.4.6 and 2.5.3. One sentence total.

What this lesson does not cover:

- Generator functions (`function*`) and `yield`. The course writes them once at most, in the iteration-helpers lesson 2.3.5, if at all; mentioned in one line as the rare reach for custom iterables.
- `this`, `bind`, `call`, `apply` in depth. Not relevant to functional 2026 SaaS code; named in one paragraph for recognition.
- `arguments` and `caller`/`callee`. Replaced by rest parameters (taught in 2.2.2); named in one sentence as the legacy form to recognize in old code.
- IIFE patterns. Replaced by modules; not written in modern code.
- Decorators. Stage 3 and Next.js-irrelevant for the SaaS surface this course teaches.

Pedagogical approach:

Decision archetype. Open with one short snippet of each form (arrow `const`, declaration, method shorthand) and the senior framing in two sentences: arrow `const` is the default, declaration earns its place at three triggers. Walk the implicit-return and object-return-parens gotcha in a tight code beat. The three triggers each get a single short `react-coding`-style or `type-coding` snippet — type guards land especially well with a `type-coding` block where the student sees the predicate signature only resolve under `function`. Close with a `Buckets` exercise sorting eight function situations (a click callback, a `.map` projection, a recursive tree walker, a `x is Foo` predicate, a method on a config object, a React component, a top-of-file helper used above its declaration, a Server Action) into `arrow const` or `function declaration`. The sort is the senior-reflex install.

Estimated student time: 25 to 30 minutes.

---

## Lesson 2.2.2 — Signatures that stay readable past two parameters

Teaches the two-positional-parameter rule and the options-object pattern, parameter defaults firing only on `undefined`, rest parameters and call-site spread, and the TypeScript ordering of required vs. optional parameters.

Topics to cover:

- The senior question. A function with five positional booleans (`createUser('alex', 'a@x.com', true, false, true)`) is unreadable at the call site, unsafe to reorder, and impossible to extend without breaking every caller. The bug class isn't syntax — it's API design at the function level. The lesson teaches the two-rule shape that prevents it.
- The two-positional-parameter rule. Two is the threshold past which positional arguments stop reading clearly. Past two, switch to an options object. The exception named once: arity-meaningful functions (e.g. a comparator `(a, b) => number`, a reducer `(acc, x) => acc`) keep their positional shape because the positions are semantic. The rule is a tool, not dogma.
- The options-object pattern. `(options: { name: string; email: string; admin?: boolean })` (inline object-type literals and the `?` optional modifier are covered at depth in 2.4.2; here the student reads the shape) is the shape Server Actions, Drizzle query builders, React component props, and the entire 2026 senior surface use. Two payoffs: call sites self-document (`createUser({ name, email, admin: true })`), and adding a parameter never breaks existing callers because object fields are unordered. The companion: destructure at the signature (covered in 2.2.6) — `({ name, email, admin = false })` — so the body reads like the call site.
- Parameter defaults. The exact rule: defaults fire only when the argument is `undefined`. Passing `null` does not trigger the default. Passing `0` or `''` or `false` does not trigger the default (this is the right behavior, but the returning student often expects falsy-coercion semantics from older codebases). One short snippet showing the four cases.
- The TypeScript ordering rule. Required parameters before optional. `function fetch(url: string, options?: Options)` is legal; `function fetch(options?: Options, url: string)` is not. The fix is the options object — when everything is on one parameter, the field-level `?` ordering doesn't exist as a constraint. One sentence on the conditional escape hatch: TypeScript 5.0+ accepts an optional positional before a required one if the optional has a default value, but the course doesn't reach for it.
- Rest parameters at the signature and spread at the call site. `(...ids: string[])` collects trailing arguments into an array; `fn(...ids)` spreads the array back into positional arguments at the call site. The mental model: rest binds positions to an array on receive; spread unpacks an array to positions on send. The most common 2026 use is forwarding arguments to a wrapped function (`(...args) => baseFn(...args)`), and the typed form covered in 2.5.7's generics chapter is what makes that wrapper preserve the original signature.
- Default values inside the options-object pattern. The composition is `({ pageSize = 20, sort = 'asc' } = {})` — defaults at the field level for individual fields, and the trailing `= {}` so the function is callable with no argument at all. Show this once because every paginated list function in the course will use this exact shape.
- The "too many params" smell as a refactor signal. If a function reaches four or five positional parameters, the senior reads that as "this function does too many things" before "this function needs an options object" — sometimes the right answer is to split. Named in one sentence as the deeper refactor heuristic; the lesson's primary teach is the options-object pattern.
- Forward links. Server Actions take a single options-shaped argument (Unit 5.2). Drizzle's query-builder accepts options at every chain step (Unit 6). React component props are an options object spelled with JSX (Unit 4.6). One sentence total.

What this lesson does not cover:

- Function overloads (multiple call signatures for one implementation). Niche; the course names them once in 2.5.7 if at all, where generics replace most overload uses.
- `arguments` legacy object — superseded by rest parameters.
- Currying and partial application as patterns. Not in the 2026 SaaS senior daily reach; named in one line if at all.
- The `this` parameter declaration in TypeScript (`function foo(this: Element)`). Class-adjacent, not part of the functional surface this chapter installs.

Pedagogical approach:

Pattern archetype. Open with the unreadable five-positional-arg call site in one snippet and its options-object replacement adjacent. State the two-param rule plainly. Walk the parameter-default fires-only-on-`undefined` semantics in a `predict-output` exercise — four cases (`undefined`, `null`, `0`, `''`) with the expected default-vs-passed-value behavior shown in adjacent output blocks. Show the rest/spread duality in one `type-coding` block where the student types a wrapper that forwards `...args` and watches the inferred signature. Close with a `code-review` exercise: present a five-positional-arg function and ask the student to refactor to the options-object shape, with the test passing on the refactored form. The refactor is the lesson's confirmation.

Estimated student time: 25 to 30 minutes.

---

## Lesson 2.2.3 — Name for intent, not implementation

Teaches Architectural Principle #4 across the four naming surfaces (variables, functions, parameters, types), the boolean-prefix convention, and the three bad-name classes (implementation-leaking, vague abstractions, negated booleans).

Topics to cover:

- The senior question. Three real bugs that start at the name. A variable `data` that nobody knows the shape of without reading three files of context. A function `processOrder` that the next reader has to open and read end-to-end to learn what "process" means in this codebase. A boolean `notDisabled` that a future reader misreads when they negate it with `!notDisabled` six months later. Names are a documentation surface; getting them wrong is a coordination cost paid by every future reader.
- The principle, stated once. **A name says what the value is or what the function does, not how it's computed.** This is Architectural Principle #4 in the course's running list. The principle is asymmetric: a vague name that fits the value (`user`, `total`, `isAdmin`) is acceptable; an implementation-leaking name that pins a future reader to today's implementation (`userArray`, `totalReducer`, `adminCheckResult`) is the smell.
- The four naming surfaces and the senior reach on each.
  - **Variables.** Nouns. Concrete over abstract. `pendingInvoices` over `data`; `activeUser` over `obj`. Length proportional to scope — a one-line callback parameter can be `x`; a module-level constant cannot.
  - **Functions.** Verbs or verb phrases. `loadInvoice`, `formatCurrency`, `parseExpiration`. The verb signals the kind of operation (`load`/`fetch` for I/O, `parse`/`validate` for transformation, `format`/`render` for output). The course does not standardize a verb glossary, but the team's codebase should; consistency is the rule.
  - **Parameters.** Same rules as variables but with one tighter constraint — parameter names appear in the function's public surface (TypeScript shows them on hover, in errors, in IDE tooltips). `createUser(name, email)` reads from the call site; `createUser(a, b)` does not.
  - **Types and type members.** PascalCase nouns for the type, camelCase for fields. `Invoice` over `InvoiceType` (the `Type` suffix is the noise the TypeScript world dropped years ago); `Status` and `state` over `StatusEnum` and `statusValue`. The course never writes `IInvoice`-style Hungarian prefixes.
- The boolean-prefix convention. Boolean values and predicates get a verbal prefix that makes the truth condition unambiguous: `is*` (state), `has*` (membership/possession), `can*` (permission), `should*` (conditional intent), `will*` (future state). `isAdmin`, `hasUnpaidInvoices`, `canEdit`, `shouldRetry`. The rule is a recognition pattern — when the reader sees `is`, they know the value is a boolean before they read its type annotation.
- The three bad-name classes.
  - **Implementation-leaking.** `userArray`, `customerMap`, `loadingFlag`. The container or representation appears in the name, which means renaming the type forces renaming the variable. The fix: name what's in the container, not the container. `customers` (a plural noun), not `customerArray`.
  - **Vague abstractions.** `data`, `info`, `result`, `manager`, `helper`, `util`. Names that could attach to anything attach to nothing. The fix: replace with the concrete thing — `data` → `weeklyMetrics`, `result` → `validatedInput`, `manager` → split the file because no class earns the name.
  - **Negated booleans.** `notDisabled`, `isNotLoading`, `noErrors`. Negation in the name compounds with negation at the use site (`!notDisabled` is a double-negative that reads as "enabled" but doesn't say so). The fix: name the positive condition. `isEnabled`, `isLoading`, `hasErrors`.
- Abbreviations and the senior call. The course's discipline: don't abbreviate unless the abbreviation is more common than the spelled-out form in the domain (`url`, `id`, `db`, `api`, `http`, `jwt`, `ms` for milliseconds). Never invent abbreviations (`usr`, `prfl`, `qty`). The reader-cost of disambiguating an unfamiliar abbreviation is higher than the writer-cost of typing the full word, especially in 2026 where every editor autocompletes.
- One paragraph on consistency over correctness. Two acceptable names — `fetchUser` and `loadUser` — both communicate intent. The rule: pick one across the codebase and stick to it. Drift between synonyms in the same repo is the smell, not the choice itself.
- Forward links. Type names in 2.4. Component and hook naming in Unit 4 (`use*` prefix as a structural enforcement React understands). Server Action names in 5.2. Drizzle table and column names in Unit 6. One sentence each.

What this lesson does not cover:

- Hungarian notation. Named once as the historical practice this principle replaces.
- Specific verb glossaries (`get` vs. `fetch` vs. `load`). The course doesn't legislate one; the team's codebase does.
- File naming conventions and folder structure. Lives in Unit 22 (project documentation) and is enforced by Next.js's routing conventions for the app surface.
- Linguistic discussions of plurality, gender, casing across languages. The course writes English-only identifiers.

Pedagogical approach:

Concept archetype with a heavy exercise close. The lesson's center is recognition — the student should leave able to spot a bad name in a code review reflex, not just rewrite one. Open with three short before/after snippets from the bad-name classes (one each of leaking, vague, negated). State the principle in one sentence. Walk the four surfaces with one example each, then the boolean-prefix convention in a tight list. The three bad-name classes get their own beat with a `code-review` exercise on a small file containing five named values, three of which violate one of the classes — the student spots and renames. Close with a `matching` exercise pairing five abbreviations (`url`, `usr`, `qty`, `id`, `prfl`) to "acceptable" or "not acceptable" with the rule named. No sandbox — naming is a discipline, not a thing to play with.

Estimated student time: 25 to 30 minutes.

---

## Lesson 2.2.4 — Guard clauses, ternaries, and exhaustive `switch`

Teaches flat control flow through early-return guards, expression-level ternaries, `switch` with `noFallthroughCasesInSwitch` and `assertNever`, the lookup-map alternative, and the loop forms a 2026 senior reaches for.

Topics to cover:

- The senior question. The two-paragraph function with five nested `if/else` branches is the daily failure mode. Every level of nesting compounds the reader's cognitive load (which condition is currently true, which else branch am I in, what does the function return on this path), and the bug shape is the missed branch that fails silently. The lesson teaches three structural forms that keep control flow flat — guard clauses, expression ternaries, and exhaustive `switch` — plus the loop reflex that prefers `for...of` over `for (let i = 0; ...)`.
- Guard clauses, the senior default for early exits. The shape: check the invalid/edge case first, return immediately, then the happy path runs unindented. `if (!user) return null;` over `if (user) { ... happy path ... }`. The payoff: one return path per condition, the function reads top-to-bottom, the happy path lives at the outer indentation level. Show one before/after of a four-level nested function flattened to four guards plus a body.
- The "no `else` after `return`" rule. Biome's `noUselessElse` rule enforces it. Once a branch returns, the `else` block is dead weight — drop it, dedent the rest. Named because it's the most common code-review nudge a senior writes on junior PRs.
- Ternaries at the expression level. The rule: use a ternary when the result is a value being assigned, returned, or passed as an argument. Don't use a ternary for side effects (`condition ? doA() : doB()` reads worse than the equivalent `if`). One paragraph on nested ternaries — acceptable when they form a small decision tree (`status === 'paid' ? 'green' : status === 'pending' ? 'yellow' : 'red'`), unacceptable when they hide a complex branch.
- `switch` for discriminated-value branching. The right reach when the branch count is fixed and the dispatch value is a literal (a discriminant field on a union, an event type, a status enum). Two pieces of structural enforcement the course leans on:
  - **`noFallthroughCasesInSwitch`** in `tsconfig.json` (already enabled in Chapter 1.4.3) — makes a missing `break` a compile error. The classic C-style fallthrough bug becomes structurally impossible.
  - **`assertNever`** in the default case — the function `function assertNever(x: never): never { throw new Error('unhandled: ' + JSON.stringify(x)); }` placed in `default:` makes a missing case a *compile* error, not a runtime one (the `never` bottom type that powers the compile-error claim is taught in 2.4.1; here it's named for shape recognition). When the union grows a new variant, every `switch` that doesn't handle it fails to compile. This is the discriminated-union exhaustiveness pattern the course's state-machine chapter (2.5.3) lands fully; this lesson plants the `switch`-shaped use.
- The lookup-map alternative. When `switch` is dispatching to expression-level results, an object literal often reads better — `const color = { paid: 'green', pending: 'yellow', failed: 'red' }[status]`. The trigger: the cases are uniform value-to-value mappings with no logic per case. The watch-out: under `noUncheckedIndexedAccess` (already on per 1.4.3), the lookup returns `T | undefined` and the student has to handle the miss with `??` or a narrowed type. Named in one paragraph.
- Loops in 2026. The four forms ordered by reach.
  - **`.map` / `.filter` / `.reduce` array methods** for transformation pipelines. The default for any list-to-list operation. Covered in depth in 2.3.3.
  - **`for...of`** for side-effecting iteration (writes, async work, breaks). The senior reach when the operation can't or shouldn't be a `.map`. Use `.entries()` when the index is needed; use `for (const [key, value] of Object.entries(obj))` for objects.
  - **`for (let i = 0; i < n; i++)`** the C-style loop. The narrow trigger: numeric ranges where the index is the data (matrix indexing, custom step sizes, reverse iteration without `.toReversed`). Rare in 2026 SaaS code.
  - **`for...in`** named once as the legacy form that iterates *enumerable string keys including inherited ones*. Almost always wrong; use `Object.keys` or `Object.entries`. The course never writes `for...in`.
- The `break` and `continue` reflex inside `for...of`. Allowed and clean for early termination. `Array.prototype.some` / `Array.prototype.every` are the array-method equivalents when the loop is searching; the trigger to drop into `for...of` is when the body has multiple statements or async work.
- Forward link. Discriminated-union exhaustiveness gets the full type-system treatment in 2.5.3 (`assertNever`, `satisfies never`, type predicates, assertion functions). This lesson installs the runtime + `switch` shape; the type-level safety net is named, not derived.

What this lesson does not cover:

- Pattern matching (TC39 proposal). Stage 1 in May 2026; not in the stack.
- `do { ... } while (...)` and `while (...)` loops. Rare enough to not earn a line; the student recognizes them.
- Labeled statements (`outer: for (...) { break outer; }`). Niche; named in one line if at all.
- `try`/`catch` as control flow — covered in Chapter 2.8.

Pedagogical approach:

Pattern archetype. The lesson's center is the failure mode (nested-if soup) and the structural forms that prevent it. Open with one before/after of a deeply nested function flattened to guard clauses. State the "early return, no else after return" rule. Walk ternaries with a tight prose-plus-code beat. Show `switch` with `noFallthroughCasesInSwitch` and `assertNever` in one full snippet — the *whole point* lands when the student watches a missing variant become a red squiggle. Use a `predict-output` exercise on three `switch` examples (one with fallthrough caught by the flag, one with `assertNever` catching a missing case, one correct). The lookup-map alternative gets one short snippet and a one-line trigger. The loop section is a tight prose list with one `script-coding` block where the student rewrites a `for...in` mistake to `Object.entries` + `for...of`. Close with a `code-review` exercise: a 12-line function with two nested-if levels and a `for...in`, refactored to guard clauses plus `for...of` plus a `switch`. The refactor is the lesson's confirmation.

Estimated student time: 35 to 40 minutes.

---

## Lesson 2.2.5 — The null-safe operator trio

Teaches `?.` for nullable access at each chain link, `??` over `||` for defaults (with the `0` / `''` / `false` trap), and `??=` for lazy initialization, plus the operator-precedence rules that force parentheses.

Topics to cover:

- The senior question. Two bugs from the same root. First, a defensive chain `if (user && user.profile && user.profile.address) { ... }` that the team writes once per page until someone reaches for optional chaining. Second, a `const pageSize = input.pageSize || 20` that silently overrides a deliberately-set `0`. Both are nullish-vs-falsy bugs and both get fixed by reaching for the right operator out of a trio of three.
- `?.` for safe property and call access. The full surface: `user?.profile?.address?.city` short-circuits to `undefined` at the first nullish link. `user?.greet()` calls only if `user` is not nullish; `arr?.[0]` indexes only if `arr` is not nullish. The rule: each `?.` checks the value before it for null/undefined; placing it once at the start is not enough — `a?.b.c` still throws if `b` is nullish. The senior reflex: question-dot at every link that could be missing.
- The watch-out on overuse. `?.` sprinkled across a chain that should never have a missing link silently swallows the bug. If `user.profile` is required by the type, writing `user.profile?.address` invites a bug where `profile` becomes nullable later and the chain quietly returns `undefined` instead of failing fast. The rule: use `?.` where the type acknowledges the nullable; let TypeScript fail at the call site otherwise. Forward link to 2.4.6 narrowing.
- `??` over `||` for defaults. The exact distinction: `||` returns the right operand for any *falsy* left (`0`, `''`, `false`, `null`, `undefined`, `NaN`); `??` returns the right operand only for *nullish* (`null` or `undefined`). The senior rule, stated once: **for "use a default when the value is missing," reach for `??`. `||` is for "use the right value when the left is truthy" — different semantics, narrower reach.**
- The three concrete `||`-vs-`??` traps. `pageSize || 20` swaps `0` for `20`. `name || 'Anonymous'` swaps the empty string for `'Anonymous'`. `enabled || true` swaps `false` for `true`. Each is a real bug the student will ship once if they reach for `||` by reflex. The fix in all three is `??`.
- `??=` for lazy initialization. The shape: `cache[key] ??= computeExpensiveValue(key)` assigns to `cache[key]` only if it's currently nullish. The payoff: one line, one read, one conditional write — the cache-or-compute pattern in three characters. The companion forms `||=` and `&&=` named in one sentence each; the course writes `??=` by reflex because nullish-not-falsy is almost always what the caller wants.
- The operator-precedence rule that forces parentheses. JavaScript intentionally rejects `??` mixed with `||` or `&&` without parens — `a || b ?? c` is a syntax error. The reason the language did this: the precedence was ambiguous enough to ship bugs, and the spec authors picked "require explicit grouping" over "pick one and let half the readers get it wrong." The fix is one set of parens; the lesson states the rule once and moves on.
- The `??` and Zod default interaction. Forward note in one sentence: Zod schemas with `.default(value)` apply the default during parse, before the value reaches the application. Most "default to 20 if missing" decisions should live at the schema boundary (Unit 7), not at the call site. `??` at the call site is the right reach for values that aren't passing through a schema — local state, derived values, lazy initialization.
- Forward links. Zod `.default()` in Unit 7. React state initialization with `?? initialValue` in Unit 4.7. The `useState((init) => ...)` lazy form pairs with the `??=` mental model. One sentence each.

What this lesson does not cover:

- The full operator-precedence table. The student does not memorize it; they reach for parens when in doubt.
- The TC39 short-circuit-with-side-effects subtleties. Not relevant to the senior surface.
- The `void` operator. Named in one line as the legacy form to recognize; not used.
- Truthiness as a broader concept — already named in 2.1.2 where `==` was forbidden.

Pedagogical approach:

Mechanics archetype with a strong Decision beat. Open with the two bugs (defensive chain and `pageSize || 20` swap) in adjacent snippets. State the trio: `?.` for nullable access, `??` for nullish-default, `??=` for lazy init. Walk each with one short snippet and one watch-out. The `||`-vs-`??` distinction lands as a `predict-output` exercise with six left-side inputs (`0`, `''`, `false`, `null`, `undefined`, `'value'`) crossed against both operators — the table makes the semantic difference unavoidable. Close with one `script-coding` block where the student writes a `getConfig(input)` function that uses `??` for three defaults and `?.` for an optional nested access, with tests catching the `0`-vs-undefined case. Offer a `SandboxCallout` for the operator-precedence rule — the student types `a || b ?? c` and watches the parser reject it.

Estimated student time: 25 to 30 minutes.

---

## Lesson 2.2.6 — Destructuring as the API call-shape

Teaches object and array destructuring with rename, defaults, and rest, the signature-level destructure that React and server actions consume, and the destructure-then-rebuild pattern that prevents accidental field forwarding.

Topics to cover:

- The senior question. Two bugs from one root. First: a function takes an `options` object and forwards `options` wholesale to a downstream call (`callDownstream(options)`), and a new field added upstream silently leaks to a third-party API. Second: a React component prop destructure misses a field on rename, and the renamed variable shadows an outer binding the developer didn't realize they were using. Destructuring is the call-site shape; the lesson teaches the form *and* the failure modes the form prevents.
- Object destructuring, the daily reach. The shape: `const { name, email } = user`. The four extensions:
  - **Rename.** `const { name: customerName } = user` — pulls `user.name` into the local binding `customerName`. The trigger: the local context wants a different name than the field's name, often because the wider scope already has a `name`.
  - **Default.** `const { pageSize = 20 } = options` — fires only when the field is `undefined` (the same semantics as parameter defaults from 2.2.2, since signature destructure is parameter default at the field level).
  - **Combined rename and default.** `const { pageSize: limit = 20 } = options` — the senior form when the local binding wants a different name *and* a default. The order matters and reads in two passes: rename first, then default on the renamed binding.
  - **Rest.** `const { id, ...rest } = user` — pulls `id` out into its own binding, collects every other field into `rest`. The senior reach for the destructure-then-rebuild pattern (below).
- Array destructuring. `const [first, second] = arr`. The two daily reaches: positional unpacking (a `useState` tuple in React, an `Object.entries` pair), and skipping with the hole form (`const [, second] = arr`). The companion: `const [head, ...tail] = arr` for the head-and-rest split. Less common than object destructuring in SaaS code (most data is shaped, not positional), but load-bearing for `useState` and `useReducer` returns.
- Signature-level destructure. The form most 2026 functions write: `function createUser({ name, email, admin = false }: { name: string; email: string; admin?: boolean })` (the inline object-type literal syntax, including the `?` optional modifier, is covered in 2.4.2; here the student reads the canonical shape). The payoff: the function's body reads the same names as the call site uses, the defaults live at the signature, and the type annotation reads adjacent. This is the shape Server Actions consume (`async function createInvoice({ customerId, amountCents }: CreateInvoiceInput)`), the shape React components consume (`function InvoiceRow({ invoice, onDelete }: InvoiceRowProps)`), and the shape every options-object function from 2.2.2 writes. Show it once as the canonical form.
- The destructure-then-rebuild pattern. The "no accidental forwarding" reflex. When passing data to a downstream call, destructure exactly the fields needed and rebuild the object literal that goes downstream — never forward the original object wholesale. Example: a function receives `{ name, email, password, ...rest }` from a form submission and passes `{ name, email }` to the database (not `{ name, email, password }`, not the full object). The pattern is structural — a new field added upstream cannot reach the downstream call without the developer choosing to destructure it. Forward link to Server Actions and SQL injection: the same principle applies to which fields are passed to Drizzle's `insert()`.
- The watch-out on nested destructure. `const { profile: { address: { city } } } = user` throws if `profile` or `address` is nullish. The fix isn't more nesting; it's `const city = user.profile?.address?.city` or destructuring with intermediate defaults. The course writes shallow destructures by default and reaches for optional chaining for nullable paths.
- One sentence on the "destructure inside the body vs. signature" call. Both are legal. Signature destructure is the senior default for API-shaped functions. Body destructure (`const { x, y } = options;` on the first line) is the right reach when the same options object is used multiple times in the body and the parameter name itself needs to stay (`options`) for forwarding or logging.
- Forward links. React props in 4.6. Server Action input parsing in 5.2.4. The `useState` array destructure in 4.7.1. One sentence each.

What this lesson does not cover:

- Destructuring inside complex assignment patterns (`({ a, b } = obj)`). The parens-required form is named in one line; rare in modern code.
- Property descriptors and the destructure interaction. Not relevant.
- Symbol-keyed destructuring. Niche.

Pedagogical approach:

Mechanics archetype with a Pattern close. Open with the two bugs (wholesale forward, missed rename shadow) in short snippets. Walk the four extensions (rename, default, combined, rest) as four small adjacent code blocks with the same input object — the variation across the blocks is the lesson. Show the signature-level destructure in one full snippet labeled as the canonical Server Action / React prop shape. Walk the destructure-then-rebuild pattern with a before/after: a `createUser` that forwards wholesale (and leaks `password` to the audit log) versus one that destructures exactly the fields the audit log needs. The before/after lands the structural-enforcement point. Close with a `script-coding` block where the student writes `function summarize({ user, invoices })` taking a signature destructure, with rename and default applied, and tests confirming the behavior. Then one `Buckets` exercise sorting six destructure forms into "valid," "syntactically wrong," "throws at runtime if input field is nullish."

Estimated student time: 25 to 30 minutes.

---

## Lesson 2.2.7 — Closures: lexical capture by reference

Teaches closures as lexical capture by reference (not by value), the stale-closure trap in async code, and the three production sites the model later explains: Server Actions, `useEffect` cleanups, and route-handler factories.

Topics to cover:

- The senior question. The student will ship the stale-closure bug at least once. The shape: a `setTimeout` callback fires with a `count` value from when the timer was set, not when it fired. A React `useEffect` cleanup runs with the props from the *previous* render. A Server Action references a `user` binding that the route handler captured at module load. All three are the same bug — a function captured a binding lexically, and the binding's value changed before the function ran. The lesson installs the mental model that makes those bugs predictable and the fix obvious.
- The mechanics, stated once. A closure is a function paired with the lexical environment where it was defined. When the function runs, it sees the bindings (not the values) that were in scope at definition. The key word is **bindings** — the closure holds a reference to the variable, not a snapshot of its value. When the variable changes, the closure sees the new value. This is the same binding-vs-box distinction from 2.1.1, applied to scope chains.
- The three components of the model.
  - **Lexical.** Determined at write time, not at call time. The closure's captured scope is the scope it was *written in*, not the scope it's called from.
  - **By reference, not by value.** The closure holds a reference to the binding. Reassigning the binding in the outer scope is visible to the closure on its next call. (`const` prevents the reassignment of the binding itself; mutation of the value the binding points to is still visible, which is the same rule as 2.1.6.)
  - **The full environment, not just one variable.** A closure captures the whole enclosing scope's bindings, which means even bindings the function doesn't visibly use can keep memory alive — the GC won't reclaim them until the closure is dropped. This is the closures-and-memory-leak shape, named once.
- The stale-closure trap in async code. One worked example: a function takes a list of items and sets a timeout per item. The naive version with `var i` (or a shared mutable counter) prints the same final value for every timeout. The fix is the `let`/`const` block-scope-per-iteration of `for...of` (which the language gives for free) — or, in older patterns, an IIFE per iteration. Show the bug, show the fix, name the rule: each callback wants its own captured binding.
- The three 2026 production sites the model explains. Each is one paragraph, foreshadowing later units.
  - **`useEffect` cleanups.** The cleanup function runs with the props and state from the render that *created* the effect, not the next one. When state changes between effect-create and cleanup-fire, the cleanup sees the old value. The senior reflex: reach for `useRef` for values the cleanup needs to read mutably, or include the value in the dependency array so the effect re-runs with fresh capture. Full treatment in Unit 4.8.
  - **Server Action closures over request-time data.** A Server Action defined at module scope can't capture per-request state (no `user` from this request, no `cookies()` from this call) because the binding is captured at module load. The senior reflex: read request-time data *inside* the action, not before. Full treatment in Unit 5.2.4.
  - **Route-handler factories.** Higher-order functions that return route handlers — `const withAuth = (handler) => (req) => { ... handler(req) }` — close over the `handler` parameter and any factory-time config. The pattern is the foundation for the wrapper idioms in 2.5.7 (`safeAction`, `requireRole`). Full treatment in Unit 5.4 and the wrappers chapter.
- One paragraph on closures as a deliberate design tool. Closures are *the* mechanism for hiding state behind a function boundary (a counter that returns a value and increments internally), composing higher-order functions (`pipe`, `compose`, `memoize`), and building partially-applied helpers. The course's reaches are functional, not OOP — most "private state" in 2026 SaaS code lives in a module's lexical scope, not in a class field, and that works because closures make it work.
- The cleanup discipline. Closures keep their environment alive — when the closure is dropped (no more references), the GC reclaims. The two sites this matters: long-lived event listeners and timers that capture large objects (covered fully with `AbortController` in 2.7.4 and 3.5.3), and React effects that don't run their cleanup (covered in 4.8). The student doesn't need to memorize GC mechanics; they need to know that a forgotten closure is a forgotten memory leak.
- Forward links. `useEffect` and cleanup in 4.8.2. Server Action capture in 5.2.4. The `AbortController` cleanup idiom in 2.7.4. Higher-order wrappers in 2.5.7. One sentence each.

What this lesson does not cover:

- The execution-context internals (lexical environment record, scope chain at the spec level). Not the right mental model for the student; the binding-with-reference framing is enough.
- The interaction of closures with `this` in classes. Class-adjacent and outside the functional surface.
- Closure-based encapsulation patterns from pre-module JS (the revealing module pattern). Superseded by ES modules.
- Performance-tuning around closure allocation. Microoptimization; not on the senior path.

Pedagogical approach:

Concept archetype. The lesson is a model — the diagram and the trap come first, the production sites land second. Open with the stale-closure-in-setTimeout snippet and its output, then the model in three sentences (lexical, by reference, full environment). Use a hand-authored SVG or Mermaid diagram showing one function definition with arrows to two outer bindings, then a call-site arrow into the function, with a callout on the binding-not-value point. Walk the stale-closure trap with a `script-coding` block where the student rewrites a `var`-based loop to `let`-based and watches the output change. The three production sites get one paragraph each — short, forward-linked, not deeply worked. Close with a `predict-output` exercise on four small closure scenarios (a counter factory, a delayed-fire timer set inside a loop, a Server-Action-shaped function that tries to capture per-request data at module scope, a `useEffect`-shaped function that references stale state). The predictions confirm the model installed.

Estimated student time: 30 to 35 minutes.

---

## Lesson 2.2.8 — Quizz

Top 10 topics to quiz:

1. Arrow `const` as the 2026 default and the three triggers that earn a `function` declaration (hoisting, named recursion, type-guard / assertion signatures).
2. The two-positional-parameter rule and the options-object pattern with field-level defaults.
3. Parameter defaults fire only on `undefined` — not on `null`, `0`, `''`, or `false`.
4. Rest parameters at the signature vs. spread at the call site.
5. The four naming surfaces (variable, function, parameter, type) and the boolean-prefix convention (`is*`, `has*`, `can*`, `should*`).
6. The three bad-name classes (implementation-leaking, vague abstractions, negated booleans).
7. Guard clauses plus "no else after return" as the senior flat-control-flow form.
8. `switch` with `noFallthroughCasesInSwitch` and `assertNever` as the compile-time exhaustiveness pattern.
9. `??` over `||` and the `0` / `''` / `false` trap; `?.` at every nullable link; `??=` for lazy initialization.
10. Closures as lexical capture by reference, the stale-closure trap, and the three production sites (Server Actions, `useEffect` cleanups, route-handler factories).

---

## Total chapter time

Roughly 190 to 225 minutes across the seven content lessons plus the quiz. The chapter splits naturally across two evenings — 2.2.1 + 2.2.2 + 2.2.3 (the function-shape spine) as one sitting, 2.2.4 + 2.2.5 + 2.2.6 + 2.2.7 (the operator and capture surface) as the second. The quiz is the closing 15 to 20 minutes. At the end the student writes functions any 2026 reviewer would accept the first time — arrow `const` by default, options-object past two params, intent-revealing names, flat control flow, `??` over `||`, signature-level destructure, closures used deliberately — and recognizes the bug class each form prevents.

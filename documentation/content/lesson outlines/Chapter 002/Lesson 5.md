# Lesson 5 — The null-safe operator trio

- **Title (h1):** `The null-safe operator trio: ?., ??, and ??=`
- **Sidebar label:** `Null-safe operators`

---

## Lesson framing

Lessons 1–4 picked the function's **form**, **shape**, **labels**, and **branching skeleton**. This lesson plants the three operators that handle the most common reason a function body branches at all: **the value might be missing.** Before these operators existed (pre-ES2020), the only tools were defensive `if (a && a.b && a.b.c)` chains and `value || default` fallbacks. Both ship bugs — the chain is verbose enough that developers skip the inner links, and `||` swallows legitimate `0` / `''` / `false`. The trio (`?.`, `??`, `??=`) replaces both reflexes with three-character forms that are precise about *nullish* (null or undefined) vs. *falsy* (a much wider set, already covered in Ch 001 L2 where `==` was banned).

The pedagogical archetype is **Mechanics** with a strong **Decision** beat on `??` vs. `||`. The center of gravity is the falsy-vs-nullish distinction: returning students from older codebases reach for `||` by reflex, and the `pageSize || 20` overwrite of a deliberately-set `0` is the single bug this lesson is here to prevent. The whole-table `<PredictOutput>` (six left-side inputs × two operators) is the lesson's confirmation moment — once the student has *typed* the table's output, the semantic difference is unforgettable.

Three threads from the chapter framing run through this lesson:

- **Decisions before syntax.** Open with the two bugs (defensive chain and `pageSize || 20` swap) in adjacent snippets before naming the trio. The operators follow the failure.
- **Senior reflexes, not surveys.** Commit to one default per situation — `?.` at every nullable link, `??` for missing-value defaults, `??=` for lazy initialization. `||` keeps its narrow lane (boolean shortcircuit truthiness check) and is named once; `||=` and `&&=` get one sentence each for recognition.
- **Biome is doing half the work.** `useOptionalChain` is the recommended Biome rule that nudges defensive `&&` chains toward `?.`. Named in one sentence at the relevant beat — the linter catches the reflex the senior is trying to install.

Two non-obvious calls the lesson makes:

- **`?.` is taught with its overuse trap, not as "sprinkle it everywhere."** The naive teaching ("add `?.` whenever you're not sure") encourages exactly the wrong reflex — silently swallowing bugs by making required fields nullable at the call site. The lesson plants the discipline: `?.` where the *type* acknowledges nullable, and let TypeScript fail at the call site otherwise. The forward link to Ch 004 L6 narrowing names the lesson that owns the depth.
- **The Zod-`.default()` boundary is named in one sentence, not derived.** Many "default to 20 if missing" decisions properly live at the schema boundary (Unit 6), not the call site. The lesson names this once so the student doesn't generalize `??` into the wrong layer — but the schema-boundary story belongs to the Zod lesson, not this one.

The lesson does **not** teach the full operator-precedence table, the TC39 short-circuit-with-side-effects subtleties, the `void` operator (legacy, recognition-only if at all), or truthiness as a broader concept (already named in Ch 001 L2 where `==` was forbidden). It also does not re-teach the parameter-default `undefined`-only firing rule from Ch 002 L2 — it references it as the prior anchor for "why `??` semantics feel familiar."

Estimated student time: 25 to 30 minutes.

---

## Section: Intro (no h2)

Three short paragraphs. Plant the two bugs, the trio, and the lesson's shape.

- **Para 1 — the two bugs.** Open with two failures from the same root: defensive chains and falsy-coercion defaults. Show them inline as prose code, not in a separate snippet block (the worked snippets land in the body sections).
  - **Bug 1:** `if (user && user.profile && user.profile.address) { … }` — the defensive chain that the team rewrites once per page until a senior reaches for `?.`.
  - **Bug 2:** `const pageSize = input.pageSize ?? 20` written instead as `const pageSize = input.pageSize || 20` — and the day a caller passes `pageSize: 0` to mean "show no rows" the function silently shows 20 rows.
  Both are about **the value might be missing**, both have a three-character fix from a trio of operators that ship in every browser since 2020.
- **Para 2 — the trio, named.** State the three reaches plainly:
  - **`?.`** — optional chaining, for nullable property and call access.
  - **`??`** — nullish coalescing, for "use a default when the value is missing."
  - **`??=`** — nullish coalescing assignment, for lazy initialization.
  Plus one sentence flagging the operator-precedence rule: JavaScript intentionally rejects `??` mixed with `||` / `&&` without parens (covered in the closing section).
- **Para 3 — the lesson's shape.** Four sections after the intro: `?.` for nullable access (with the overuse trap); `??` for nullish-default (with the `||` distinction as the lesson's payoff); `??=` for lazy init; and the precedence rule. Reference Ch 001 L2's `==` ban as the prior anchor for "the language distinguishes nullish from falsy on purpose." Reference Ch 002 L2's "parameter defaults fire only on `undefined`" as the same semantic in a different operator.

---

## Section: `?.` for nullable property and call access

The first operator. Single h2. Plant the syntax surface, the per-link semantics, and the overuse trap.

- **The shape.** Open with the canonical chain — the same shape from the intro's bug 1, refactored.
  ```ts
  const city = user?.profile?.address?.city;
  ```
  Prose: "Each `?.` checks the value to its **left** before stepping right. The first nullish link short-circuits the entire expression to `undefined`. No more nested `&&` chains; no more `Cannot read property 'address' of undefined` at runtime."

- **The three forms.** Tight `<CodeVariants>` with three tabs — each tab one nullable-access form — to plant the recognition pattern. Use the seed domain (`user`, `invoice`, `customer`) continued from Lessons 2–4.
  - **Tab 1: Property access.** `const city = user?.profile?.address?.city;`
    Prose: "Property access. The chain short-circuits at the first nullish link."
  - **Tab 2: Method call.** `const greeting = user?.greet?.();`
    Prose: "Method call. The `?.()` form checks that `user.greet` is not nullish before calling. Useful for optional callbacks and feature-flagged methods."
  - **Tab 3: Indexed access.** `const first = invoices?.[0];`
    Prose: "Indexed access. The `?.[…]` form checks `invoices` before indexing. Reads at every nullable array-or-object access."

- **The per-link rule, stated once.** The senior reach: **a `?.` at one link doesn't protect later links.** State this with a tiny `<CodeTooltips>` block or two adjacent `Code` blocks showing the trap:
  ```ts
  // Throws if user.profile is nullish — only `user` is guarded.
  const city = user?.profile.address.city;

  // Each link is guarded — the chain short-circuits at the first nullish step.
  const city = user?.profile?.address?.city;
  ```
  Prose: "The first form looks defensive but isn't. Question-dot at every link that could be missing, not just the first."

- **The overuse trap.** A single short paragraph plus one `Code` snippet. The naive reflex is to sprinkle `?.` whenever the developer is unsure — but that *silences* the type system. If `user.profile` is required by the type, writing `user.profile?.address` makes a future bug invisible: the day someone marks `profile` as nullable, every call site silently returns `undefined` instead of failing loudly. The rule: **`?.` where the type acknowledges nullable; let TypeScript fail at the call site otherwise.** Forward link to Ch 004 L6 narrowing in one sentence. Name **Biome's `useOptionalChain` rule** (recommended-default) as the linter that nudges defensive `&&` chains toward `?.` — the linter handles the *form*, the senior handles the *discipline*.

- **One `<MultipleChoice>` exercise to confirm the per-link rule.** Single-correct. Stem: "Given `type Order = { customer?: Customer; lines: Line[] }; type Customer = { address?: Address }; type Address = { city: string };` — which of these correctly fetches `order.customer.address.city` without throwing?" Four `<McqChoice>` snippets:
  - `order.customer?.address.city` — wrong; `address` is also optional.
  - `order.customer?.address?.city` — **correct**; both nullable links guarded.
  - `order?.customer?.address?.city` — wrong (subtle): `order` is non-nullable per the type; over-protecting it silences future type errors. The `McqWhy` calls out that this is the **overuse** the lesson just flagged.
  - `order.customer.address.city` — wrong; throws on a missing `customer`.

---

## Section: `??` for "use a default when the value is missing"

The second operator and the lesson's biggest payoff. Single h2 with the falsy-vs-nullish distinction as the centerpiece.

- **The semantic, stated once.** Open with the rule plainly: **`??` returns the right operand only when the left is `null` or `undefined`. `||` returns the right operand for any falsy left.** That's the entire distinction. One sentence on what "nullish" means, defined inline via a `<Term>`:
  > <Term definition="The two values JavaScript treats as 'missing': null and undefined. Distinct from the larger 'falsy' set, which also includes 0, '', false, and NaN.">Nullish</Term> is the right concept for "the value is missing"; falsy is the right concept for "the value is missing **or** the value is one of several legitimate-but-empty things." `??` picks the first; `||` picks the second.

- **The three concrete traps.** A `<CodeVariants>` block with three tabs, each showing one real bug `||` ships. Use `<div data-mark-color="orange">` on each fence to flag the anti-pattern.
  - **Tab 1: `pageSize || 20` swallows `0`.**
    ```ts
    // Bug: a deliberate pageSize: 0 silently becomes 20.
    const pageSize = input.pageSize || 20;

    // Fix: ?? only fires on null/undefined.
    const pageSize = input.pageSize ?? 20;
    ```
    Prose: "If a caller passes `pageSize: 0` to mean 'no rows', `||` overwrites it. `??` keeps the zero and only defaults on a *missing* field."
  - **Tab 2: `name || 'Anonymous'` swallows the empty string.**
    ```ts
    // Bug: an empty submitted name silently becomes 'Anonymous'.
    const displayName = form.name || 'Anonymous';

    // Fix: ?? respects the empty string as a deliberate value.
    const displayName = form.name ?? 'Anonymous';
    ```
    Prose: "An empty string is often a legitimate value the user typed (or deliberately cleared). `||` treats it as missing; `??` doesn't."
  - **Tab 3: `enabled || true` swallows `false`.**
    ```ts
    // Bug: enabled: false silently becomes true.
    const enabled = settings.enabled || true;

    // Fix: ?? defaults only when the field was actually omitted.
    const enabled = settings.enabled ?? true;
    ```
    Prose: "The senior tell that `||` is in the wrong lane: the right operand is a boolean literal. If the left is also boolean, falsy-vs-nullish is the entire question."

- **The whole-table `<PredictOutput>`.** This is the lesson's confirmation exercise. The student types stdout for a six-row table where each row prints both `value || default` and `value ?? default` for one left-side input. Use a small runnable program:
  ```ts
  const cases = [0, '', false, null, undefined, 'value'];
  for (const v of cases) {
    console.log(`${JSON.stringify(v)} || 'D' = ${v || 'D'}`);
    console.log(`${JSON.stringify(v)} ?? 'D' = ${v ?? 'D'}`);
  }
  ```
  `expected` as a 12-line template string covering all 12 outputs. The `<PredictWhy>` calls out the four rows where the operators *diverge* (`0`, `''`, `false`, and the absence-versus-presence of `null` vs. `undefined`) as the four bugs the senior catches by reflex. Withholding the answer on the first wrong attempt forces the student to actually reason through the table.

- **The senior rule, restated.** One short paragraph at the close of the section: **for "use a default when the value is missing," reach for `??`. Reach for `||` only when "any truthy value short-circuits" is exactly what you want** — which in 2026 SaaS code is rare enough that the senior writes `??` by reflex and uses `||` deliberately when it appears. Reference the Ch 002 L2 parameter-default rule (defaults fire only on `undefined`) as the same semantic in a different operator.

- **The Zod boundary, named once.** One sentence as a forward note: many "default to 20 if missing" decisions properly live at the schema boundary — Zod 4's `.default(20)` applies during parse, before the value reaches the function. Unit 6 owns the full story. The implication: `??` at the call site is the right reach for values that *aren't* passing through a schema — local state, derived values, lazy initialization. Don't let `??` become the place schema defaults live.

---

## Section: `??=` for lazy initialization

The third operator. Single h2. Short and dense — the shape, the trigger, and the companion-forms one-liner.

- **The shape.** State it plainly: **`x ??= y` assigns `y` to `x` only when `x` is currently nullish.** Show the canonical use:
  ```ts
  const cache: Record<string, number> = {};

  const getOrCompute = (key: string) => {
    cache[key] ??= computeExpensive(key);
    return cache[key];
  };
  ```
  Prose: "One line, one read, one conditional write. The cache-or-compute pattern in three characters. The first call for a key writes; every subsequent call reads. The senior reach for any 'initialize once, reuse' pattern that doesn't need a full memoization library."

- **The right-hand side is evaluated lazily.** One short paragraph. `??=` only evaluates its right operand when the left is nullish — so `computeExpensive(key)` doesn't run on cache hits. Contrast briefly with a naive `cache[key] = cache[key] ?? computeExpensive(key)` written long-hand, which *also* short-circuits (`??` is itself lazy), but reads more verbose and re-reads `cache[key]` twice. The `??=` form expresses the intent in one read.

- **The two companions, one sentence each.** `||=` assigns when the left is *falsy* (the same `0`/`''`/`false` trap as `||`); `&&=` assigns when the left is *truthy*. The course writes `??=` by reflex because nullish-not-falsy is almost always what the caller wants. Name them once for recognition.

- **One short `<ScriptCoding>` exercise (vanilla runner): write `getConfig`.** This is the lesson's hands-on confirmation. The student writes a small function that uses **all three operators** from the trio. Starter:
  ```js
  // Implement getConfig(input).
  // - Read input.user.preferences.pageSize, defaulting to 20 when missing
  //   (treat 0 as a legitimate user choice, not "missing").
  // - Read input.user.preferences.theme, defaulting to 'light' when missing
  //   (treat '' as a legitimate cleared value, not "missing").
  // - Return { pageSize, theme }.
  const getConfig = (input) => {
    // your code here
  };
  ```
  Tests (4 cases, all on `vanilla` runner since the code is plain JS):
  1. Returns defaults when `input` has no `user`.
  2. Returns defaults when `input.user.preferences` is missing.
  3. **Pins the bug:** when `pageSize: 0` is passed, returns `0` (not `20`). This test fails the `||` reflex and passes only with `??`.
  4. **Pins the second bug:** when `theme: ''` is passed, returns `''` (not `'light'`). Same shape.
  The expected solution uses `?.` for the nested access and `??` for the two defaults. No `??=` in this exercise — its production sites (cache, lazy init) are too heavy for a 4-test confirmation; the lesson's exposition snippet is enough.

---

## Section: Mixing operators — the parens rule

The closing mechanics section. Short — one snippet, one explanation, one optional `<TSPlaygroundCallout>` for the student to verify the error in-browser.

- **The rule.** JavaScript intentionally **rejects** `??` mixed with `||` or `&&` without explicit parentheses. `a || b ?? c` is a syntax error, not a precedence quirk. The reason: the precedence was ambiguous enough (does `||` bind tighter than `??`? the answer is "they were specced to not mix") that the spec authors picked "require explicit grouping" over "pick one and let half the readers get it wrong."

- **The fix.** One set of parens, either way the author meant it:
  ```ts
  // Syntax error:
  const value = a || b ?? c;

  // Either of these is valid — pick what the author actually meant:
  const value = (a || b) ?? c;
  const value = a || (b ?? c);
  ```
  Prose: "Two readings, two meanings. The language refuses to guess. State which you meant with parens; the parser accepts either."

- **A `<TSPlaygroundCallout>` to verify.** Optional but high-leverage — the student pastes `a || b ?? c` and watches the parser reject it in their own browser. Pre-built URL with the snippet baked in (use the `code` form since the snippet is one line). One-sentence framing: "Type the expression without parens, watch TypeScript's error; add parens, watch it disappear." Keep `height={400}`.

- **One paragraph on the broader precedence reflex.** The student doesn't memorize the full operator-precedence table — they reach for parens when in doubt. Even when not strictly required, parens around a `??` chain that sits inside a larger expression document the author's intent to the next reader. This is the same discipline as `(a ?? b) + 1` reading better than `a ?? b + 1` (which the spec parses as `a ?? (b + 1)` — usually not what's meant). Parens are cheap; mis-parsed precedence is a runtime bug.

---

## Section: External resources (optional `<ExternalResource>` cards)

Optional, two cards max. Both should be evergreen references the student can return to.

- **Card 1: MDN — Nullish coalescing operator (`??`).** Canonical reference for the operator's behavior, the falsy-vs-nullish table, and the mixing-without-parens rule. `href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Nullish_coalescing"`, `icon="simple-icons:mdnwebdocs"`.
- **Card 2: Biome — `useOptionalChain` rule.** Direct link to the rule page so the student knows the lint backstop is inspectable. `href="https://biomejs.dev/linter/rules/use-optional-chain/"`, `icon="simple-icons:biome"`.

Wrap both in a `<CardGrid>` for the 2-column responsive layout.

No `<VideoCallout>` — the topic doesn't have a canonical short-form explainer that adds to the lesson's worked snippets and the `<PredictOutput>` table. The table *is* the explainer.

---

## Terms to wrap in `<Term>`

Strategic candidates — terms that support the lesson's goals and are unfamiliar (or worth pinning) at this point in the course:

- **"Nullish"** — defined inline in the `??` section: "The two values JavaScript treats as 'missing': `null` and `undefined`. Distinct from the larger 'falsy' set, which also includes `0`, `''`, `false`, and `NaN`."
- **"Short-circuit"** — defined inline at the first `?.` snippet: "The expression stops evaluating at the first link that returns the early value. For `?.`, that's the first nullish link returning `undefined`; for `??`, that's a non-nullish left returning itself."
- **"Optional chaining"** — defined inline at the section opening: "The `?.` operator family — `?.`, `?.()`, `?.[…]` — for accessing a property, calling a method, or indexing when the receiver might be `null` or `undefined`."

Three terms is the right number — more would clutter the prose. `||`, `&&`, `??=`, and the operator names themselves are self-defining once `<Term>`'d the *concepts*.

---

## Components used

- `<CodeVariants>` + `<CodeVariant>` — for the three `?.` forms (3 tabs), for the three `||`-vs-`??` traps (3 tabs, all `data-mark-color="orange"` on the buggy fences).
- `<Code>` (Expressive Code fences) — for standalone snippets (the `?.` per-link trap, the `??=` lazy init, the `a || b ?? c` syntax error, the parens fix).
- `<CodeTooltips>` — optional, for the per-link `?.` snippet if the lesson author wants hover definitions on `?.` and short-circuit inline.
- `<MultipleChoice>` (single-correct, four choices) — for the `?.` per-link confirmation.
- `<PredictOutput>` (12-line `expected`) — for the falsy-vs-nullish whole-table confirmation. The lesson's centerpiece exercise.
- `<ScriptCoding>` (vanilla runner, 4 tests) — for the `getConfig` write-it-yourself confirmation.
- `<TSPlaygroundCallout>` — optional, for the `a || b ?? c` syntax-error verification.
- `<Term>` — for the three terms listed above.
- `<ExternalResource>` (2 cards, wrapped in `<CardGrid>`) — for the closing reading.

No diagrams. The trio's semantics are best shown in code and in the falsy-vs-nullish table; a flowchart would re-state in pictures what the code already says. The whole-table `<PredictOutput>` is the visual aid this lesson needs — a 6×2 truth table emerging from the student's own answer.

---

## Scope

**Taught in this lesson:**
- `?.` for nullable property access (`?.`), method call (`?.()`), and indexed access (`?.[…]`); per-link semantics (each `?.` guards only the link to its left); the overuse trap (using `?.` where the type doesn't acknowledge nullable silences future bugs).
- Biome's `useOptionalChain` recommended rule as the build-time backstop that nudges `&&`-chain defensiveness toward `?.`.
- `??` for "use a default when the value is missing"; the precise falsy-vs-nullish distinction; the three concrete traps (`0`, `''`, `false`) that `||` ships and `??` fixes.
- `??=` for lazy initialization; the cache-or-compute pattern; the lazy right-hand-side evaluation; `||=` / `&&=` named once for recognition.
- The mixing-operators parens rule: `??` with `||` / `&&` is a syntax error without explicit parens; either grouping is legal once stated.
- The reach hierarchy: `??` by reflex for missing-value defaults; `||` deliberately when "any truthy value short-circuits" is exactly the intent.

**Explicitly out of scope (covered elsewhere):**
- Narrowing depth — how TypeScript flows nullability through `?.` and `??` chains — **Ch 004 L6**. This lesson uses the operators and references the type-system story; the depth lands later.
- The `never` type and `assertNever` — **Ch 004 L1, Ch 005 L3** (and observed-and-used in Ch 002 L4). Not relevant here.
- Zod `.default(value)` at the schema boundary — **Unit 6**. Named in one sentence so the student doesn't generalize `??` into the wrong layer; not derived.
- React `useState` lazy initializers and `?? initialValue` patterns — **Ch 023**. The mental-model overlap with `??=` is named in one sentence; not derived.
- The full operator-precedence table — never memorized; the lesson plants the parens reflex instead.
- TC39 short-circuit-with-side-effects subtleties (e.g. `?.()` not invoking the function when the receiver is nullish but still evaluating the argument list in certain edge cases) — outside the senior surface.
- The `void` operator — legacy, not used.
- `try` / `catch` for nullish handling — Ch 008.
- Defensive programming as a broader concept — touched but not derived; the operators *are* the lesson's take.

**Prerequisites (briefly re-stated, not re-taught):**
- Arrow `const` function form (Ch 002 L1) — every snippet here is `const fn = (args) => …`.
- Options-object parameters and the `undefined`-only defaults rule (Ch 002 L2) — referenced as the prior anchor for "why `??` semantics feel familiar."
- Intent naming and the boolean-prefix convention (Ch 002 L3) — every variable in the snippets uses it.
- Guard clauses + flat control flow (Ch 002 L4) — the lesson's `?.` and `??` reflexes are the structural alternative to defensive guards on every nullable read.
- Falsy values and the `==` ban (Ch 001 L2) — the original prior anchor for "the language distinguishes nullish from falsy on purpose."
- Inline object-type literals and the `?` optional modifier (Ch 004 L2, named-but-not-derived in Ch 002 L2 / L6) — appears in the `<MultipleChoice>` stem; the student already reads the shape.

---

## Continuity notes (post-write)

To be added to `Continuity notes.md` after the lesson ships. Sketch for the writing agent:

- **Taught** — `?.` (property, call, index) at each nullable link; `useOptionalChain` Biome rule as backstop; overuse trap (silencing TS by over-protecting non-nullable fields); `??` vs `||` precise semantics with the three traps (`0`, `''`, `false`); `??=` for lazy init / cache-or-compute; `||=` / `&&=` named once; parens-required rule when mixing `??` with `||` / `&&`.
- **Debts** — Narrowing depth and `?.`/`??` flow through types → Ch 004 L6; Zod `.default()` boundary → Unit 6; `useState` lazy initializer (`?? initialValue`) → Ch 023; full precedence reflex stays "parens when in doubt," not a memorized table.
- **Terminology** — "nullish" (Term), "short-circuit" (Term), "optional chaining" (Term), "the trio" as the shorthand for `?.` / `??` / `??=`, "per-link rule" for `?.`, "overuse trap" for over-protecting non-nullable fields, "falsy-vs-nullish" as the semantic distinction.
- **Patterns and best practices** — `??` by reflex for missing-value defaults; `||` deliberately when truthy-short-circuit is the intent; `?.` at every nullable link, not just the first; `?.` only where the type acknowledges nullable; `??=` for cache-or-compute; parens whenever `??` shares an expression with `||` or `&&`.
- **Misc.** — `<PredictOutput>` 12-line table is the centerpiece confirmation; `<ScriptCoding>` vanilla runner with 4 tests on `getConfig` pins the `0` and `''` traps directly; `<MultipleChoice>` single-correct on the per-link rule includes the over-protection distractor; optional `<TSPlaygroundCallout>` for the parens-required syntax error. Seed domain continues invoices/orders/customers from L2–L4. `<CodeVariants>` color convention: `data-mark-color="orange"` on the buggy `||` fences. No video, no diagram — the table is the visual.

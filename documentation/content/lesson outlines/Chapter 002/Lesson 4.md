# Lesson 4 — Guard clauses, ternaries, and exhaustive switch

- **Title (h1):** `Flat control flow: guards, ternaries, and exhaustive switch`
- **Sidebar label:** `Flat control flow`

---

## Lesson framing

After Lessons 1–3 picked the **form** (arrow `const`), **shape** (options object), and **labels** (intent names) of a function, this lesson picks the **branching skeleton** that lives inside the function body. The failure mode is universal: a two-paragraph function with five nested `if/else` branches, where each level of nesting compounds the reader's cognitive load and the bug shape is the missed branch that fails silently. This lesson installs three structural forms that keep control flow **flat** — guard clauses for early exits, expression-level ternaries for value selection, exhaustive `switch` for discriminated dispatch — plus the loop reach a 2026 senior makes (`.map/.filter/.reduce` and `for...of`, not `for...in` or `for (let i=0)`).

The pedagogical archetype is **Pattern** (three concrete structural forms that replace nested-if soup) with one strong **Mechanics** beat on `switch` exhaustiveness via `noFallthroughCasesInSwitch` + `assertNever`. The lesson's center of gravity is the **refactor reflex**: the student should leave able to *see* nested-if soup as a smell and *reach for* the right flattening form by category (early exit → guard, value selection → ternary, discriminated dispatch → exhaustive `switch`). The closing `<CodeReview>` is where that reflex gets exercised — a 12-line function with two nested-if levels, a `for...in`, and a missing `switch` case, refactored to the flat forms.

Three threads from the chapter framing run through this lesson:

- **Decisions before syntax.** Open with the nested-if soup failure (a worked example, four levels deep, in one snippet) before naming any of the three forms. The structural rules follow the failure.
- **Senior reflexes, not surveys.** The lesson commits to **one default per situation** — guard clauses for early exits, ternaries only at the expression level (never for side effects), `switch` only when the branch count is fixed on a literal discriminant. Alternatives (lookup map, `if/else if` chain) are named with one trigger sentence, not surveyed.
- **Biome is doing half the work.** `noUselessElse` enforces "no `else` after `return`"; `noFallthroughCasesInSwitch` (the `tsconfig` flag from Ch 024 L4) makes missing `break` a compile error; `assertNever` makes a missing union variant a compile error. Each rule is named at the moment it backs the reflex.

Two non-obvious calls the lesson makes:

- **`assertNever` is shape-named, not type-derived.** The function's payoff (compile-time exhaustiveness across discriminated unions) leans on the `never` bottom type and the union narrowing model — both taught in Ch 004 L1 and Ch 005 L3. This lesson **uses the function and observes its behavior** without deriving why `never` works the way it does. The student sees the red squiggle on a missing case; the type-system story lands later.
- **Loops are a tight prose pass, not a full section per form.** `.map`/`.filter`/`.reduce` gets its full lesson in Ch 003 L3; here we name the default reach and the one trigger that flips to `for...of`. `for...in` is named once as the legacy form the course never writes. The lesson doesn't earn a "loops" h2 of its own — they land as a single subsection.

The lesson does **not** teach `try`/`catch` (Ch 008), pattern matching (TC39 Stage 1, not in the 2026 stack), labeled statements (niche), `do/while` or `while` loops (named once for recognition only), or the type-system depth behind `assertNever` (Ch 004 L1 + Ch 005 L3).

Estimated student time: 35 to 40 minutes.

---

## Section: Intro (no h2)

Three short paragraphs. Plant the failure mode, the three structural forms, and the lesson's shape.

- **Para 1 — the failure.** Open with the nested-if soup as the daily reality. Four-level-deep `if/else` is the function any reviewer has to read twice and any debugger has to step through with breakpoints to trace. The bug class isn't "the wrong condition" — it's the **missed branch that fails silently**, the implicit `undefined` return at the bottom of a tree that nobody noticed was reachable. Name the failure in one paragraph; don't show the snippet yet (it lives in the first body section as a worked before/after).
- **Para 2 — the three forms, named.** State the three reaches plainly:
  - **Guard clauses** for early exits — check the invalid case first, return immediately, run the happy path unindented.
  - **Expression-level ternaries** for value selection — when the branch is choosing *what value* to assign/return/pass, not *what to do*.
  - **Exhaustive `switch`** for discriminated dispatch — when the branch count is fixed on a literal field and the compiler should catch a missing case.
  Plus one paragraph on loops at the close. Reference Lesson 1's arrow-`const` form — every snippet here is `const fn = (args) => …`. Reference Lesson 3's intent naming — every variable in the refactors will use it.
- **Para 3 — the lesson's shape.** Four sections after the intro: guards + "no `else` after `return`"; ternaries with the side-effect carve-out; `switch` with `noFallthroughCasesInSwitch` + `assertNever` (plus the lookup-map alternative); loops in 2026. Closing `<CodeReview>` refactor exercises all three forms on one source file.

---

## Section: Guard clauses flatten the happy path

The first structural form. Single h2. The lesson's most-used reflex and the one Biome backs with `noUselessElse`.

- **The before/after, worked.** Open with a `<CodeVariants>` block: **orange** for the nested-if version, **green** for the guard-clause refactor. Use a realistic shape — a function like `chargeCustomer` or `renderInvoiceRow` that has four conditions (auth check, feature flag, input validation, business rule) and returns one of four values plus a happy-path result.
  - **Orange tab** (label `Nested ifs`):
    ```ts
    const chargeCustomer = (input: ChargeInput) => {
      if (input.user) {
        if (input.user.canCharge) {
          if (input.amountCents > 0) {
            if (!input.user.isFrozen) {
              return processCharge(input);
            } else {
              return { ok: false, reason: 'frozen' };
            }
          } else {
            return { ok: false, reason: 'amount' };
          }
        } else {
          return { ok: false, reason: 'permission' };
        }
      } else {
        return { ok: false, reason: 'unauthenticated' };
      }
    };
    ```
    Prose: "Four nesting levels, the happy path buried at indentation 4. The reader has to track which `else` belongs to which `if` to know what fires on which path. The bug shape: drop a `return` and the implicit `undefined` leaks through one of the branches without a compile error."
  - **Green tab** (label `Guard clauses`):
    ```ts
    const chargeCustomer = (input: ChargeInput) => {
      if (!input.user) return { ok: false, reason: 'unauthenticated' };
      if (!input.user.canCharge) return { ok: false, reason: 'permission' };
      if (input.amountCents <= 0) return { ok: false, reason: 'amount' };
      if (input.user.isFrozen) return { ok: false, reason: 'frozen' };
      return processCharge(input);
    };
    ```
    Prose: "Each invalid case checks-and-returns at the top. The happy path lives unindented at the bottom. The function reads top-to-bottom; the reader doesn't track nesting because there is none."

- **The pattern, stated once.** State the shape plainly: **check the invalid/edge case first, return immediately, then the happy path runs unindented.** The pattern flips the polarity — instead of "if everything is good, do the work, else handle errors," it's "if anything is wrong, exit; then do the work." One return path per condition, one happy path at the outer indentation level.

- **The "no `else` after `return`" rule.** Single paragraph plus one tiny snippet. Once a branch returns (or throws), the `else` block is dead weight — drop it, dedent the rest. Show the smallest possible before/after in a single `Code` block with `del=` / `ins=` markers:
    ```ts del={3,5} ins={4,6}
    const greet = (user: User | null) => {
      if (!user) {
        return 'hi, stranger';
      } else {
        return `hi, ${user.name}`;
      }
      return `hi, ${user.name}`;
    };
    ```
    Wait — actually use two adjacent fenced blocks instead, the diff form gets confusing here. Show "before" and "after" as two `Code` blocks under a one-line "Drop the dead `else`:" intro. Name **Biome's `noUselessElse` rule** in one sentence as the build-time backstop: lint catches every accidental `else { return … }` and offers the fix.

- **One paragraph on the "early return, happy path last" reflex.** When a senior reads a function, the eye scans down the left margin. Every early `return` at the leftmost indent is a "this path is handled" signal. The happy-path return at the bottom is the function's purpose. Indentation deeper than two levels in a 2026 SaaS function is a smell — the reflex is to refactor into guards before reading further.

No exercise in this section — the closing `<CodeReview>` exercises the guard-clause reflex on a realistic function.

---

## Section: Ternaries at the expression level only

The second structural form. Single h2. Short and dense — the rule, the side-effect carve-out, the nested-ternary policy.

- **The rule.** State it plainly: **use a ternary when the result is a value being assigned, returned, or passed as an argument. Don't use a ternary for side effects.** The ternary's job is *value selection*, not *control flow*. When the branch is "do A or do B," an `if` reads better and lints better; when the branch is "this value or that value," the ternary reads like the data.

- **Three "good" ternary snippets.** Tight `<CodeVariants>` with three tabs — each tab one ternary in a different value-selection context — to plant the recognition pattern.
  - **Tab 1: Assignment.** `const label = isPaid ? 'Paid' : 'Pending';`
    Prose: "A value being computed and bound. The two branches are the two possible values of `label`."
  - **Tab 2: Return.** `return user.isAdmin ? user.adminBadge : null;`
    Prose: "A value being returned from a function. Same shape — two possible return values."
  - **Tab 3: JSX prop / argument.** `<Button variant={isDestructive ? 'danger' : 'primary'}>Delete</Button>`
    Prose: "A value being passed as an argument (here as a JSX prop). The ternary is the right reach because the destination wants a *value*, not a statement."

- **The side-effect anti-pattern.** One `Code` block, marked as the smell:
    ```ts
    // Anti-pattern: ternary for side effects.
    user.isAdmin ? logAdmin(user) : logUser(user);
    ```
    Prose: "This works, but it reads as 'pick a value' when what's happening is 'choose which function to call.' Use an `if` — the verb-shaped branching reads as control flow, which is what it is."
    ```ts
    if (user.isAdmin) logAdmin(user);
    else logUser(user);
    ```

- **Nested ternaries: acceptable when small, refactor when large.** One paragraph plus two short snippets adjacent (no `<CodeVariants>` — too much weight for a small contrast).
  - **Acceptable.** A small decision tree where each branch is a one-token literal:
    ```ts
    const color = status === 'paid' ? 'green'
      : status === 'pending' ? 'yellow'
      : 'red';
    ```
    Note the layout: one branch per line, the `:` lined up. Reads as a small lookup. (Forward link in one sentence: when this pattern shows up with four+ cases on a single field, the lookup-map form below often reads better.)
  - **Refactor.** A nested ternary where the inner branches have non-trivial expressions:
    ```ts
    // Smell: each branch is itself an expression a reader has to parse.
    const fee = type === 'card' ? amount * 0.029 + 30 : type === 'ach' ? amount * 0.008 : 0;
    ```
    The fix is either a `switch` (next section) or a helper function (`computeFee(type, amount)`). The trigger: when a reader can't see the structure at a glance, the ternary has outgrown its form.

- **One sentence on Biome.** Biome doesn't enforce "no ternaries for side effects" — that's a human review reflex. It does enforce `noUselessTernary` (`x ? true : false` collapses to `x`), which is the trivially-wrong shape the linter does catch.

No exercise in this section — the recognition lands in the closing `<CodeReview>` (one of the seeded issues is a side-effect ternary).

---

## Section: Exhaustive switch for discriminated dispatch

The third structural form and the lesson's biggest payoff. Single h2 with two structural enforcement points (`noFallthroughCasesInSwitch` and `assertNever`) and the lookup-map alternative as a subsection.

- **The reach.** State when `switch` is the right form: **fixed branch count, literal discriminant value, each case has its own logic.** The classic shape is a discriminated union (a `status` field on a `Payment`, an `event.type` on a webhook payload, a `kind` field on a state-machine state) where each variant gets its own handling. When the branches are uniform value-to-value mappings, the lookup map below reads better; when the branches have logic per case, `switch` is the reach.

- **The full pattern in one `<AnnotatedCode>`.** This is the lesson's centerpiece snippet. Author the full pattern once, walk it in 4-5 steps. Use a realistic discriminated union — a `Payment` status or a `WebhookEvent` type.
    ```ts
    type Payment =
      | { status: 'pending'; createdAt: Date }
      | { status: 'paid'; paidAt: Date; amountCents: number }
      | { status: 'failed'; reason: string };

    const assertNever = (x: never): never => {
      throw new Error(`Unhandled variant: ${JSON.stringify(x)}`);
    };

    const describePayment = (payment: Payment): string => {
      switch (payment.status) {
        case 'pending':
          return `Pending since ${payment.createdAt.toISOString()}`;
        case 'paid':
          return `Paid ${payment.amountCents} cents at ${payment.paidAt.toISOString()}`;
        case 'failed':
          return `Failed: ${payment.reason}`;
        default:
          return assertNever(payment);
      }
    };
    ```
  - **Step 1** (highlight: `{1-4}`, color `blue`): "The discriminated union. Each variant has a `status` field with a unique literal value. The `status` is the **discriminant** — the field the `switch` will dispatch on."
  - **Step 2** (highlight: `{6-8}`, color `violet`): "`assertNever` is the compile-time exhaustiveness helper. It takes a parameter typed `never` — the empty type — and throws at runtime if it's ever called. We'll see in the next step why this earns the `function` keyword and how the `never` parameter type does the compile-time work."
  - **Step 3** (highlight: `{10-12} "switch"`, color `green`): "The function signature destructures nothing — `Payment` is the input, `string` is the output. The `switch` dispatches on `payment.status`. Each `case` matches one literal value of the discriminant."
  - **Step 4** (highlight: `{13-19} "return"`, color `green`): "Every case returns — there's no `break` because `return` exits the function. The TypeScript compiler narrows `payment` inside each case: in the `'paid'` branch, `payment` is known to be the `{ status: 'paid'; paidAt; amountCents }` variant, so accessing `payment.amountCents` is type-safe. Narrowing depth lives in Ch 004 L6; here the student sees it work."
  - **Step 5** (highlight: `{20-21} "assertNever"`, color `orange`): "The `default` case calls `assertNever(payment)`. Because every other variant has been handled, TypeScript has narrowed `payment` to `never` here — the type that represents 'no possible value.' If a new variant is added to `Payment` and this `switch` doesn't handle it, `payment` won't narrow to `never` and the call becomes a **compile error**. A missing case becomes structurally impossible."

- **`noFallthroughCasesInSwitch`, named.** One short paragraph plus a tiny snippet. The `tsconfig.json` flag from Ch 024 L4 makes a missing `break` (or `return`/`throw`/`continue`) a compile error. The classic C-style fallthrough bug — case A falls into case B by accident — becomes impossible to ship. One short snippet showing the red squiggle the flag generates:
    ```ts
    // Compile error under noFallthroughCasesInSwitch:
    switch (kind) {
      case 'a':
        doA();  // falls through to 'b' — flag catches it
      case 'b':
        doB();
        break;
    }
    ```

- **`assertNever`, the pattern reused.** One paragraph reinforcing the compile-time-exhaustiveness payoff. The function lives in `lib/` once per codebase — the course's repo will have it in `lib/assert-never.ts` and import it everywhere. State the rule: **every `switch` over a discriminated union ends with `default: return assertNever(value);` (or `throw assertNever(value)`).** Forward link in one sentence to Ch 005 L3 where the discriminated-union exhaustiveness story gets its full type-system treatment (`satisfies never`, type predicates, assertion functions).

- **A `<PredictOutput>` exercise to confirm the model.** Three short `switch` examples in one card — the student predicts whether the program compiles, runs, or throws.
  Actually: `<PredictOutput>` compares stdout of a runnable program. For "predicts which variant compiles vs. doesn't," reach for `<MultipleChoice>` (one question, multiple correct shapes) or `<TrueFalse>` (three statements about switch behavior). Use **`<MultipleChoice>` with `correctMulti`**: one stem ("Which of these `switch` blocks compile under `noFallthroughCasesInSwitch` + `assertNever`?"), four candidate snippets as choices, two correct. The student picks the compiling shapes.

- **Subsection h3: The lookup-map alternative.** Single h3 under this section.
  - **The trigger.** When the cases are *uniform value-to-value mappings* with **no logic per case**, an object literal lookup reads better than a `switch`. Show the same `status → color` mapping in both forms with a `<CodeVariants>`:
    - **Tab 1: `switch`.** Verbose for a flat mapping — five lines for three cases.
    - **Tab 2: Lookup map.** `const color = { paid: 'green', pending: 'yellow', failed: 'red' }[status];` One line.
  - **The `noUncheckedIndexedAccess` watch-out.** One paragraph. Under `noUncheckedIndexedAccess` (enabled per Ch 024 L4), the lookup returns `T | undefined` because TypeScript doesn't know the key exists. Handle the miss with `??` (taught next lesson, Lesson 5):
    ```ts
    const color = { paid: 'green', pending: 'yellow', failed: 'red' }[status] ?? 'gray';
    ```
    Or tighten the lookup's type to a record indexed by the union: `const colors: Record<Payment['status'], string> = { … }; const color = colors[status];` (forward link to Ch 003 records, one sentence).
  - **The trade.** State the trade in one sentence: lookup map is shorter and cleaner for uniform mappings; `switch` + `assertNever` is the right reach when each case has logic and the compiler should enforce exhaustiveness.

---

## Section: Loops in 2026

The loop reflex section. Single h2 — tight, no subsections. The full `.map`/`.filter`/`.reduce` treatment lives in Ch 003 L3; here we plant the default reach and the one trigger that flips it.

- **The four forms, ranked by reach.** A short ordered list, one paragraph per form, no separate h3 per form (keeps the section dense).
  1. **`.map` / `.filter` / `.reduce` array methods.** The default for any list-to-list transformation. Expression-shaped, no mutable accumulator, the type system threads through. Ch 003 L3 owns the depth.
  2. **`for...of`** for side-effecting iteration — writes to a database, async work, early `break`, anything the array methods aren't shaped for. Use `for (const [i, value] of arr.entries())` when the index is needed; use `for (const [key, value] of Object.entries(obj))` for objects.
  3. **`for (let i = 0; i < n; i++)`** — the C-style loop. The narrow trigger: numeric ranges where the index *is* the data (matrix indexing, custom step sizes, reverse iteration when `.toReversed` isn't available). Rare in 2026 SaaS code.
  4. **`for...in`** — named once as the legacy form. Iterates *enumerable string keys, including inherited ones from the prototype chain*. Almost always wrong; use `Object.keys` / `Object.entries` instead. **The course never writes `for...in`.**

- **`break` and `continue` inside `for...of`.** One short paragraph. Clean and allowed for early termination. When the loop is *searching* for an item (or testing a predicate over the list), `Array.prototype.some` / `Array.prototype.every` are the array-method equivalents — drop into `for...of` when the body has multiple statements or async work that those methods can't host.

- **One `<ScriptCoding>` exercise: rewrite `for...in` to `Object.entries` + `for...of`.** Vanilla runner. The starter has a function using `for...in` over an object — show the bug (it picks up inherited keys when the object's prototype has been extended) — and ask the student to rewrite it. Tests verify the rewritten form only iterates own keys.
    ```ts
    // Starter
    const sumValues = (obj) => {
      let total = 0;
      for (const key in obj) {
        total += obj[key];
      }
      return total;
    };
    ```
    Tests pin both behaviors: (1) sums the own keys of a plain object correctly; (2) does *not* include inherited values when called on an object whose prototype has a numeric property. The rewrite (`for (const [key, value] of Object.entries(obj))`) passes both; the `for...in` version fails the second.

---

## Section: Refactor — flatten this function

The closing exercise. Single h2 with one `<CodeReview>`. This is where the three forms (guard, ternary, exhaustive `switch`) and the loop reflex (`for...in` → `for...of`) get exercised together on one realistic source file.

- **The exercise framing.** One short paragraph: "Here's a function that does three jobs — validates input, dispatches on a discriminated `kind`, and aggregates a result. Each smell from this lesson appears at least once. Mark each line where the reviewer should flag a structural issue."

- **The source file.** A single `<ReviewFile>` with a ~20-line function. Plant 4 issues across the lines:
  1. **Nested-if soup that should be guard clauses.** Two levels of `if/else` at the top wrapping the dispatch.
  2. **Ternary used for side effects.** A `condition ? doSideEffectA() : doSideEffectB();` statement that should be an `if`.
  3. **`switch` missing `assertNever` in `default`.** Three cases of a discriminated union dispatch, no `default` — or a `default: throw new Error('unknown');` that doesn't get compile-time exhaustiveness.
  4. **`for...in` over an object.** Used to aggregate values; should be `for (const [k, v] of Object.entries(obj))`.

  Author the file so the four issues are independent — the student can flag any of them without depending on understanding the others. Each `<ReviewIssue>` has a tight `kernel` (the rubric phrase the AI grader uses) and a senior reveal paragraph for the after-submit panel.

- **`<ReviewWhy>` closing debrief.** One short paragraph naming the three reflexes the exercise was exercising: **guard clauses for early exits, ternaries only at the expression level, `switch` + `assertNever` for discriminated dispatch.** Reference the chapter framing's "decisions before syntax" thread — each smell is a *shape* the senior recognizes before reading the implementation.

---

## Section: External resources (LinkCards)

Optional, two cards max. Both should be evergreen references the student can return to.

- **Card 1: Biome `noUselessElse` and `noFallthroughCasesInSwitch` rule docs.** Direct links to the rule pages on biomejs.dev — the student should know lint rules are inspectable.
- **Card 2: TypeScript handbook section on "Discriminated unions" / "Exhaustiveness checking with `never`."** The official TS handbook page covering the pattern this lesson plants the runtime shape for.

---

## Terms to wrap in `<Term>`

Strategic candidates — terms that support the lesson's goals and are unfamiliar at this point in the course:

- **"guard clause"** — define inline: "A check at the top of a function that exits early when an invalid or edge case is detected, so the rest of the function can assume the happy path."
- **"discriminant"** (in the `switch` section) — "The literal-typed field shared across the variants of a discriminated union that the dispatch reads to pick a case."
- **"`never` type"** (in the `assertNever` section) — "TypeScript's bottom type — the type with no values. Useful as a parameter type to force a compile error when an unhandled union variant could reach the function. Full treatment in Ch 004 L1."
- **"`noFallthroughCasesInSwitch`"** — "A TypeScript compiler flag enabled in the course's `tsconfig.json` (from Ch 024 L4) that makes a `switch` case without a terminating statement (`break`, `return`, `throw`, `continue`) a compile error."
- **"`noUncheckedIndexedAccess`"** — "A TypeScript compiler flag (enabled per Ch 024 L4) that adds `| undefined` to the type of any indexed access (`arr[i]`, `obj[key]`) where the key isn't statically known. Forces the caller to handle the miss."

---

## Components used

- `<CodeVariants>` + `<CodeVariant>` — for the nested-if vs. guard-clause before/after; for the three good-ternary snippets; for the `switch` vs. lookup-map comparison.
- `<Code>` (Expressive Code fences) — for standalone code blocks (the dead-`else` drop, the side-effect-ternary anti-pattern, the small nested-ternary).
- `<AnnotatedCode>` + `<AnnotatedStep>` (5 steps, colors green/blue/violet/orange per step semantics) — for the full `switch` + `assertNever` pattern walkthrough. This is the lesson's centerpiece snippet.
- `<MultipleChoice>` (multi-select, two correct) — for the compile-vs-noncompile `switch` predictions.
- `<ScriptCoding>` (vanilla runner) — for the `for...in` → `for...of` rewrite.
- `<CodeReview>` + `<ReviewFile>` + `<ReviewIssue>` + `<ReviewWhy>` (4 plants on 1 file) — the closing refactor exercise.
- `<Term>` — for the five terms listed above.
- `<ExternalResource>` (2 cards) — for the closing reading.

No diagrams in this lesson — the structural shapes are best shown as code (before/after, annotated walkthrough). A flowchart of "which form to reach for when" is tempting but would re-state in pictures what the lesson states in prose; the recognition reflex installs better from worked code than from a decision tree.

No video — the topic doesn't have a canonical short-form explainer that adds to the lesson's worked snippets.

---

## Scope

**Taught in this lesson:**
- Guard clauses as the senior default for early exits; the "no `else` after `return`" rule (Biome `noUselessElse`).
- Ternaries at the expression level only (assignment, return, argument); never for side effects.
- Nested ternaries: acceptable for small flat decision trees with literal branches; refactor signal when branches are non-trivial.
- `switch` for discriminated-union dispatch; `noFallthroughCasesInSwitch` `tsconfig` flag as the runtime-fallthrough safety net.
- `assertNever` in `default:` as the compile-time exhaustiveness pattern — observed and used, not type-derived.
- The lookup-map alternative for uniform value-to-value mappings, with the `noUncheckedIndexedAccess` watch-out.
- Loop reach ranking in 2026: `.map`/`.filter`/`.reduce` → `for...of` → `for (let i …)` → never `for...in`.
- `break`/`continue` clean inside `for...of`; `some`/`every` as the searching-array-method alternative.

**Explicitly out of scope (covered elsewhere):**
- The `never` bottom type derivation, type predicates `x is T`, and assertion functions `asserts x is T` — **Ch 004 L1, L6 and Ch 005 L3** own these. This lesson uses `assertNever` and observes the compile error; the type-system story lands later.
- Discriminated union narrowing depth (how TypeScript narrows `payment` inside each `case`) — **Ch 004 L6**. This lesson states "TypeScript narrows the variant inside each case" and moves on.
- Full `satisfies never` / type-level exhaustiveness patterns — **Ch 005 L3**.
- `.map` / `.filter` / `.reduce` mechanics, transformation pipelines, immutable patterns — **Ch 003 L3**. This lesson names them as the default and stops.
- `Record<K, V>` typed lookup maps — **Ch 003** (containers and records). This lesson uses an object literal lookup with the `??` fallback but doesn't formalize `Record`.
- `??` operator semantics (nullish-vs-falsy distinction) — **Lesson 5 of this chapter**. The lookup-map subsection uses `??` as a forward reference; one-sentence note is enough.
- `try`/`catch` and error-flow control — **Ch 008**.
- Pattern matching (TC39 proposal) — Stage 1 in May 2026, not in the 2026 stack.
- `do { ... } while`, `while`, labeled statements — named once for recognition if relevant; not taught.
- Object literal lookups as a broader pattern (memoization tables, dispatch dictionaries) — Ch 003 covers containers.

**Prerequisites (briefly re-stated, not re-taught):**
- Arrow `const` function form (Lesson 1) — every snippet in this lesson uses `const fn = (args) => …`.
- Options-object parameters and `undefined`-only defaults (Lesson 2) — referenced in passing.
- Intent naming and the boolean-prefix convention (Lesson 3) — every variable in the refactors uses it; `isFrozen`, `canCharge`, `hasUnpaidInvoices` show up naturally.
- `tsconfig.json` strict flags `noFallthroughCasesInSwitch` and `noUncheckedIndexedAccess` (Ch 024 L4) — named as already enabled, not configured here.
- Biome `noUselessElse` rule (Ch 024 L5) — named as the lint backstop for the dead-`else` rule.

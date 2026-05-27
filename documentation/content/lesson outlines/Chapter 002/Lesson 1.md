# Lesson 1 — Arrow by default, declaration on demand

- **Title (h1):** `Arrow by default, declaration on demand`
- **Sidebar label:** `Arrow vs function`

---

## Lesson framing

This lesson opens Chapter 002 by picking the **shape** the student will write for every function in the rest of the course: an arrow expression bound to `const`. Chapter 001 installed `const`-by-default; this lesson rides that reflex one step further — if every binding is `const`, then every function is a value bound to a `const`, which spells `const fn = (args) => …`.

The lesson is not a survey of function forms. It installs a senior decision: **one default, three triggers**. The default wins because (a) it composes naturally with the chapter's `const` discipline, (b) it removes the historical 2018-era `this`-rebinding surprise in callbacks (which returning devs remember and dread), and (c) it pairs with Biome's `useArrowFunction` rule that auto-fixes the obvious cases. The three triggers — hoisting, named recursion, type-guard / assertion signatures — are the **only** cases where `function` earns its keyword in 2026 SaaS code. Two ancillary forms (method shorthand inside object literals, `function` expressions) get named in one paragraph each so the student recognizes them; they're not separate triggers.

The pedagogical archetype is **Decision** with a tight **Mechanics** moment for the implicit-return parens gotcha and three short **Pattern** snippets for the triggers. The closing exercise is a sorting drill — eight real situations, two buckets, the sort is the senior-reflex install. The `this` rule is named, dropped, and parked: the student writes essentially no `this` in this course's stack (components are functions, Drizzle calls are functions, Server Actions are functions), so a deep tour is wasted depth.

Two soft forward links land at the end of relevant beats:

- **Components are arrow `const`s.** When the student writes their first component in Unit 3, the form was decided here.
- **Type predicates and assertion functions need (or strongly prefer) `function`.** The shape is named here for recognition; the depth lives in Ch 004 L1 / L6 and Ch 005 L3.

Estimated student time: 25 to 30 minutes.

---

## Section: Intro (no h2)

The opener. Three short paragraphs. Plant the decision in the first lines, name the rule, preview the lesson's shape.

- **Para 1 — the smell.** A file with three function forms scattered across it: a `function declareUser() { … }` at the top, a `const handleClick = function(e) { … }` in the middle, a `(name) => …` callback in a `.map`. Each one is legal. The team rotated between them without a rule. That rotation is the smell — not any one form. A reviewer can't tell if `function` was chosen for a reason or by reflex.
- **Para 2 — the rule, in one sentence.** Pick one default, name the triggers that flip it. The course's default is `const fn = (args) => …`. Three triggers earn a `function` declaration. Everything else is `const` + arrow.
- **Para 3 — the lesson's shape.** Why arrow `const` wins (the `const`-by-default thread from Ch 001 L6 + no `this` surprise + Biome backstop), the implicit-return parens gotcha, the three triggers worked one at a time, the two ancillary forms named in passing, the `this` rule stated and dropped, and a sorting drill to close. Reference Ch 001 L6's `const`-by-default rule explicitly — this lesson rides that decision into function form.

---

## Section: Why arrow `const` is the 2026 default

The decision section. Single h2. This is where the lesson states the rule and the three reasons behind it.

- **The form, named once.** Show the canonical shape in a single `<Code lang="ts">` block:
  ```ts
  const greet = (name: string) => `Hello, ${name}`;
  ```
  One short caption: "An arrow expression bound to `const`. This is the form every function in the rest of the course will take, unless one of three triggers flips it."

- **Three reasons it wins as a default.** A short bulleted list with one sentence each:
  1. **Continues the `const` reflex from Ch 001 L6.** Functions are values; `const`-by-default means `const fn = …` by default, and the right-hand side that fits a `const` is an arrow expression.
  2. **No `this` rebinding surprise in callbacks.** The 2018-era arrow-vs-`function` debate is a returning-dev memory; arrow functions inherit `this` lexically, which is exactly what callbacks (`.map`, event handlers, `setTimeout`) want by default. Named here once; the `this` rule gets its own short beat later in the lesson.
  3. **Biome's `useArrowFunction` rule auto-fixes the obvious cases.** The student doesn't have to police it — the lint is the backstop, same as `useConst` from Ch 001 L6. The rule converts non-`this`, non-generator `function` expressions into arrow form; it deliberately leaves top-level `function` declarations alone (those are the triggers the next section covers). One sentence forward-pointing to the project's `biome.json` (set up in Unit 1).

- **One paragraph on what "default" means here.** Not "always" — defaults exist so the student can think about the exceptions. The lesson's job is to install the default *and* the three named cases where it flips. Anything outside those three is `const` + arrow.

No exercise here — the rule lands in the closing sort.

---

## Section: Implicit return, block body, and the parens trap

The single Mechanics beat. Single h2. Short — this is one gotcha and its fix.

- **Two body shapes.** Use `<CodeVariants>` with two tabs:
  - **Implicit-return tab** (green, label `Single expression`):
    ```ts
    const double = (x: number) => x * 2;
    ```
    Caption: "One expression, no braces, no `return`. The expression value is what the function returns."
  - **Block-body tab** (blue, label `Statements needed`):
    ```ts
    const double = (x: number) => {
      const result = x * 2;
      return result;
    };
    ```
    Caption: "Braces and `return` the moment a statement is needed (intermediate `const`, an `if`, a loop, a side effect). The form scales up; the implicit-return form does not."

- **The senior reflex.** One sentence: reach for the implicit-return form for one-liners; switch to the block body the moment the body needs a statement. Don't twist a `return` into a comma expression to keep one-line form.

- **The object-literal parens trap.** This is the lesson's only "gotcha" — and the one a beginner hits in their first week. Use `<AnnotatedCode lang="ts">` with two steps so the student sees the mistake and the fix on the **same** block of code:
  ```ts
  const wrong = (id: string) => { id, role: 'admin' };
  const right = (id: string) => ({ id, role: 'admin' });
  ```
  - **Step 1** (`meta={`{1}`}` color `orange`): "The braces here parse as a **block body**, not an object literal. `id, role: 'admin'` becomes a statement (an invalid one — TypeScript flags it). The function returns `undefined`."
  - **Step 2** (`meta={`{2}`}` color `green`): "Parens around the object literal disambiguate. The braces are an object; the function returns it. The senior reflex: wrap object-literal returns in parens."

- **One short `<Aside type="note">`** noting that this is the one syntax gotcha in arrow-`const`-land — every other form is straight-line. The lesson doesn't dwell on it; the visual is the lesson.

---

## Section: The three triggers that earn a `function` declaration

The decision section's other half. Single h2 with **three subsections (h3)**. Each subsection is a tight pattern beat: one snippet, two sentences of framing, no exercise. The closing sort is where the student practices the recognition.

### Subsection (h3): Hoisting — top-of-file helpers used above their declaration

- **The trigger, in one sentence.** A `function` declaration hoists its full body to the top of the scope — it's callable from any line in the module, including lines above it. An arrow `const` is in the Temporal Dead Zone (Ch 001 L6) until the line it's declared on — it cannot be referenced before that line.
- **Worked example.** One short `<Code lang="ts">` block where a top-of-file `render(node)` function calls a `formatLabel(node)` declared below it. Caption: "`formatLabel` is callable on line 2 because the `function` form hoists. An arrow `const` would throw a `ReferenceError` if written below."
- **The honest framing.** Rare in 2026. Most code is import-first and module-scoped — helpers come from other modules, not from below in the same file. The trigger is real but you'll see it most often in **recursive helpers** (the next subsection) and small in-module utilities. One paragraph.

### Subsection (h3): Named recursion — a helper that refers to itself

- **The trigger.** A recursive function that needs a stable name to call itself by. `function walk(node) { walk(child); }` is the cleaner form than an arrow expression aliased through an outer `const` (which works, but means the recursion goes through the binding, not the function itself — if the binding is reassigned or shadowed, the recursion breaks).
- **Worked example.** One `<Code lang="ts">` block:
  ```ts
  function walk(node: TreeNode): void {
    for (const child of node.children) {
      walk(child);
    }
  }
  ```
  Caption: "`walk` refers to itself by name. The name is part of the function's own scope — independent of the outer `const` binding."
- **The honest framing.** Tree walkers, parsers, and a handful of recursive algorithm helpers. One paragraph. The student will see this in Drizzle relation walkers (Unit 5) and the AST visitors that show up in any custom Zod transform (Unit 6) — named in one sentence, not deeply linked.

### Subsection (h3): Type-guard and assertion signatures — TypeScript-shaped triggers

- **The trigger.** TypeScript's **assertion** signature `asserts x is User` does not parse on arrow expressions at all — it is a long-standing language constraint that requires `function`. The **predicate** signature `x is User` has more nuance: TypeScript 5.5+ can now *infer* a predicate from a simple-bodied arrow (e.g. `const isUser = (x: unknown) => typeof x === 'object' && x !== null && 'id' in x`), but the moment the body is anything more than one expression or the team wants the contract **declared**, not inferred, `function` is the canonical form. The senior reach in 2026: declare both shapes with `function` so the predicate is part of the signature a reviewer reads at a glance — and so the assertion form (which has no inference fallback) is consistent with its sibling.
- **Worked example.** One `<TypeCoding>` block where the student sees both shapes side-by-side and confirms narrowing fires. Concrete shape:

  ````mdx
  <TypeCoding
    instructions="The assertion `asserts x is User` only parses on `function`. The predicate `x is User` can be inferred on simple arrows since TS 5.5, but the canonical declared form for both is `function` — the signature reads the contract, no inference required."
    starter={`type User = { id: string; email: string };

  function isUser(x: unknown): x is User {
    return typeof x === 'object' && x !== null && 'id' in x && 'email' in x;
  }

  function assertUser(x: unknown): asserts x is User {
    if (!isUser(x)) throw new Error('not a user');
  }

  const value: unknown = { id: 'u_1', email: 'a@x.com' };
  if (isUser(value)) {
    value;
  //^?
  }
  `}
    expectedQueries={[
      { line: 12, contains: 'User' },
    ]}
  />
  ````

  The `^?` query confirms `value` narrowed to `User` after the predicate fires. The student sees the form that earns `function` and watches it pay off in narrowed types.
- **The honest framing.** One paragraph. The predicate and the assertion are deep TypeScript topics — they get full treatment in Ch 004 L1 (`unknown`), Ch 004 L6 (`x is T` narrowing), Ch 005 L3 (`asserts x is T` exhaustiveness). Here, the student needs to **recognize the shape that earns a `function` declaration** — not master narrowing. One forward-link sentence and move on.

---

## Section: Two forms to recognize, not reach for

Bridge section. Single h2 with two tight subsections. These are the ancillary forms the student should know on sight but never write by reflex.

### Subsection (h3): Method shorthand in object literals

- **The form.** `const config = { greet(name) { return …; } }` — the function lives inside an object literal without a colon or `function` keyword. Show in one short `<Code lang="ts">` block.
- **Where it shows up.** Config objects, Drizzle relation definitions (Unit 5), Zod transforms (Unit 6), route-handler exports. Named in one paragraph as "the third form that earns its place inside object literals" — not a separate trigger, just a syntactic shortcut when the function is a method on an object literal.
- **One sentence on why it's fine.** Method shorthand binds `this` the same way `function` does (own `this` based on call site), which is correct for the object-method shape. The student doesn't need to memorize this — they need to recognize the form and not "fix" it to an arrow.

### Subsection (h3): `function` expressions

- **The form.** `const fn = function name() { … }` — the rare third form: a `function` expression assigned to a `const`. The internal name (`name`) is only visible inside the function body, useful for self-reference in a recursive expression that for some reason can't be a declaration.
- **The honest framing.** Almost always replaced by an arrow expression or a `function` declaration. Named in one paragraph so the student recognizes it in older code or third-party libraries — not a form the course writes.

No exercises here. These two forms are recognition-only.

---

## Section: The `this` rule, stated and dropped

Short single h2. Three paragraphs. This section's job is to defuse a returning-dev anxiety and park the topic, not to teach `this`.

- **Para 1 — the rule.** Arrow functions inherit `this` from the enclosing lexical scope. `function` forms (declarations, expressions, method shorthand) get their own `this` based on the call site. State it once.
- **Para 2 — why this used to be a debate.** Pre-2015 JavaScript and early-class-component React forced the developer to `.bind(this)` callbacks constantly because `function` expressions in those callbacks got their own `this` that was undefined or the wrong thing. Arrow functions removed that footgun — the lexical-`this` rule is exactly what callbacks want. Returning devs remember this pain; it's the historical reason arrow functions felt liberating in 2015. Today it's the boring default.
- **Para 3 — why the course barely uses `this`.** The stack the course teaches is functional. Components are functions. Drizzle queries are functions. Server Actions are functions. The only `this` the student will encounter is in third-party class-based code (some SDKs) and the rare `Error` subclass (Ch 009 L2). The rule is named so the student isn't surprised when they see it; not derived because the student won't write it.

- **One small `<Aside type="note">`** to close: "If you find yourself reaching for `.bind(this)` or wondering what `this` resolves to, you've drifted into class-OOP territory the course doesn't teach. Step back, write a function that takes what it needs as parameters, and the question disappears."

No exercise.

---

## Section: Check yourself

The lesson's closing exercise. Single h2.

- **`<Buckets>` exercise** with two buckets:
  - `arrow const` (description: "`const fn = (args) => …` — the 2026 default.")
  - `function declaration` (description: "`function name(args) { … }` — earned by one of the three triggers.")

- **Items (8 chips).** Each is one short situation the student decides for. The pedagogical goal: the **type predicate**, the **recursive walker**, and the **top-of-file helper used above its declaration** are the only `function` cases. Everything else is arrow `const`. To keep the sort clean and the two-bucket framing honest, the chips are:
  1. A `onClick` callback inside a button. → `arrow const`
  2. A `.map` projection that builds a row. → `arrow const`
  3. A recursive tree walker that calls itself by name. → `function declaration`
  4. A `function isInvoice(x: unknown): x is Invoice` predicate. → `function declaration`
  5. A React component. → `arrow const`
  6. A top-of-file `format(node)` helper called by `render(node)` declared above it. → `function declaration`
  7. A Server Action exported by name. → `arrow const`
  8. A short utility `const isAdult = (age) => age >= 18`. → `arrow const`

- **Two-column layout** (`twoCol`), two buckets side by side on desktop, stack on mobile.

- **Instructions prop:** "Sort each function into the form a 2026 senior would reach for. Three of these earn a `function` declaration — the other five are arrow `const`."

- **The pedagogical goal.** After the sort, the student should:
  - Recognize the **three** `function`-earning chips (3, 4, 6) on sight.
  - Not be fooled by chip 5 (React components feel structural enough that some devs reach for `function` — they shouldn't).
  - Not be fooled by chip 7 (Server Actions are async arrow `const`s exported by name; the `export async` is a tell some students miss).
  - Have the senior reflex installed: **default arrow, three triggers earn `function`**.

The grader marks each chip green or red after the student clicks "Check." No follow-up multiple choice — the sort is the assessment.

---

## Section: External resources

`<CardGrid>` with 2 `<ExternalResource>` cards. Short and curated.

- **MDN — Arrow function expressions** — `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Functions/Arrow_functions` — icon `simple-icons:mdnwebdocs`. Description: "The canonical reference for arrow-function syntax and the lexical-`this` rule."
- **Biome `useArrowFunction` rule** — `https://biomejs.dev/linter/rules/use-arrow-function/` — icon `simple-icons:biome`. Description: "The build-time backstop that auto-fixes `function` expressions to arrow form where the conversion is safe (skips top-level declarations, `this`-using functions, and generators)."

No video for this lesson. The topic is short, the parens trap is best learned visually inside the editor (the AnnotatedCode block carries it), and the lesson is already dense enough without a 5-minute embed.

---

## Scope

### Included

- The three function forms named once: arrow expression, `function` declaration, `function` expression.
- The senior default: `const fn = (args) => …` bound to `const`.
- Three reasons the arrow default wins: continues `const` reflex from Ch 001 L6, lexical `this` is what callbacks want, Biome `useArrowFunction` auto-fix.
- Implicit-return vs. block-body shapes, with the one-expression / statement-needed trigger.
- The object-literal return parens trap (`(name) => ({ key: value })`).
- The three triggers for a `function` declaration: hoisting, named recursion, type-guard / assertion signatures (with the 2026-accurate framing that `asserts x is T` requires `function`, and that `x is T` declared on `function` is the canonical contract form even though TS 5.5+ can infer the predicate from simple arrows).
- Method shorthand inside object literals — named in one paragraph for recognition.
- `function` expressions — named in one paragraph for recognition.
- The `this` rule stated in one paragraph and parked (arrow inherits lexically, `function` gets its own).
- Forward-link mentions: components in Unit 3, Server Actions in Ch 030 L4, predicates and assertions in Ch 004 L6 / Ch 005 L3.
- Biome `useArrowFunction` rule named as the build-time backstop.

### Explicitly excluded

- **`this` mechanics in depth** (binding rules, `.bind` / `.call` / `.apply`, the `this` parameter declaration in TypeScript). Class-adjacent; not on the functional path this chapter installs. Named in one paragraph for recognition.
- **Generator functions (`function*` and `yield`).** Niche; the course writes them at most once in Ch 003 L5 if at all. Not named here.
- **`arguments`, `caller`, `callee`.** Replaced by rest parameters (Ch 002 L2). Named in one line at most as legacy to recognize in old code.
- **IIFE patterns.** Replaced by ES modules. Not named.
- **Decorators.** Stage 3 and not in the Next.js SaaS surface this course teaches. Not named.
- **Rest parameters and default parameter values.** Owned by **Ch 002 L2** (signatures past two parameters). Forward-linked in one sentence at most; not taught here.
- **Parameter destructuring at the signature.** Owned by **Ch 002 L6**. Not taught here.
- **Closures.** Owned by **Ch 002 L7**. Not named here.
- **Function overloads** (multiple call signatures for one implementation). Niche; owned by **Ch 005 L7** if at all. Not named.
- **Async functions and `await`.** The lesson uses `async` arrow expressions in one chip of the sort (the Server Action chip) but does not teach async semantics — owned by the relevant async lesson.
- **TypeScript narrowing depth.** The predicate `x is T` and assertion `asserts x is T` shapes are named for **recognition only**. The narrowing and exhaustiveness mechanics live in Ch 004 L6 and Ch 005 L3. The TypeCoding block confirms the predicate narrows, but does not derive *why* — that's the depth Ch 004 L6 owns.
- **TS 5.5 predicate inference depth.** Acknowledged in one sentence as the reason the predicate-form caveat exists, but the lesson's recommendation is the declared `function` form. The inference mechanics and the `.filter(x => x != null)` payoff land in Ch 004 L6.

### Prerequisites the student already has from Chapter 001

- **Lesson 1 — binding-vs-value model.** The lesson uses the framing "a function is a value bound to a `const`" — that framing was established in L1.
- **Lesson 6 — `const`-by-default.** The arrow-`const` default is the natural continuation. Reference it explicitly in the intro; do not re-teach it.
- **Lesson 6 — Temporal Dead Zone.** The hoisting trigger references the TDZ as the reason arrow `const`s can't be called above their declaration. Do not re-teach; one-sentence reference.

---

## Code conventions applied

- All snippets `.ts` except where a constraint forces otherwise (none in this lesson).
- Single quotes for strings.
- `const`-bound arrow functions everywhere except in the four `function`-declaration snippets (the hoisting helper, the recursive walker, the two type-guard / assertion examples) — those are the lesson's topic.
- 2-space indent, trailing commas where multiline, semicolons on.
- Inference-led; no return-type annotations except in the type-predicate and assertion examples (where the signature is the topic) and in the `walk(node: TreeNode): void` recursive example (where the recursive `void` return is part of the shape worth showing).
- Variable names carry intent: `greet`, `walk`, `isUser`, `assertUser`, `format`, `render` — no `foo`/`bar`.
- `<CodeVariants>` color convention continues the chapter: green = senior default (implicit-return arrow), blue = acceptable (block-body arrow), orange = anti-pattern (the parens-trap mistake before the fix).
- The `<Buckets>` chip text uses inline backticks for code identifiers (`onClick`, `.map`, `function isInvoice(x: unknown): x is Invoice`) — matches Ch 001 L6's Buckets style.

---

## Component checklist for the writer agent

- `<Term>` (×1 minimum) — `Temporal Dead Zone` reference in the hoisting subsection (re-using Ch 001 L6's definition; do not re-define, just hover-explain on the reference). Optional second on `lexical scope` in the `this` paragraph if the writer thinks it earns it.
- `<Code lang="ts">` blocks for short single-purpose snippets (canonical arrow form, hoisting helper, recursive walker, method shorthand, `function` expression).
- `<CodeVariants>` ×1 — implicit-return vs. block-body (green / blue).
- `<AnnotatedCode lang="ts">` ×1 — the object-literal parens trap, 2 steps (orange / green), `maxLines` not needed (the block is 2 lines).
- `<TypeCoding>` ×1 — the type-predicate + assertion example with `^?` query confirming narrowed type. One `expectedQueries` entry.
- `<Aside type="note">` ×2 — one closing the parens-trap section, one closing the `this` section.
- `<Buckets twoCol>` ×1 — the closing 8-item, two-bucket sort.
- `<CardGrid>` + `<ExternalResource>` ×2 — MDN arrow functions and Biome `useArrowFunction`.
- No `<VideoCallout>` — intentional; the lesson is dense enough and the parens trap lands visually.
- No new lesson-specific component required.

# Lesson 6 — const binds, it doesn't freeze

- **Title (h1):** `const binds, it doesn't freeze`
- **Sidebar label:** `const vs let`

---

## Lesson framing

This lesson closes Chapter 001 by binding (pun intended) the chapter's binding-vs-value model to the daily reflex the student will write in every later file: `const` by default, `let` only when the binding must change. Two production bugs anchor it:

1. **`const` mistaken for "frozen value."** A teammate writes `const config = { feature: true }` and is surprised when another module mutates `config.feature = false`. The fix isn't `Object.freeze` — it's understanding the binding diagram from Lesson 1: `const` locks the **arrow**, not the **box**.
2. **`let` that should have been `const`.** A binding is declared `let` "just in case," never reassigned, and six months later someone reassigns it inside an unrelated function and breaks downstream code. Biome's `useConst` rule (already shipped in the chapter project) catches this at build time, but the student needs the **why** so they don't fight the lint.

The lesson is **Concept archetype** (the binding-locks-arrow mental model) with two short **Mechanics** moments (block scope + TDZ) and one **Decision** close (the `const`/`let` sorting exercise). It deliberately stays terse on hoisting — the student needs the 2026 consequence (`const`/`let`/`class` are TDZ-protected; declare at top of scope and you never hit it), not a tour of every TDZ subtlety. `var` is named once for legacy recognition and dropped.

Two outward-facing bridges land softly at the end:

- **`Object.freeze` is the runtime-immutability tool, but the course doesn't ship it.** Why: TypeScript's `readonly` and `as const` (Chapter 004) catch the bug at compile time without runtime cost. Named here so the student knows it exists and why we skip it.
- **`const` doesn't narrow types.** `const greeting = 'hello'` narrows to `'hello'` (primitive special case), but `const config = { feature: true }` widens to `{ feature: boolean }`. The reflex to add `as const` starts at the value-model level, paid forward to Chapter 004 Lesson 7.

The lesson reuses the binding diagram from Lesson 1 (the `BindingDiagram.astro` already in the repo) — pedagogically, this is the chapter's one shared visual anchor and recalling it tightens the chapter's spine. No new lesson-specific component required.

Estimated student time: 30 to 35 minutes.

---

## Section: Intro (no h2)

The opener, ~3 short paragraphs total. Plant the two failure modes in the first 6 lines, name the one-sentence rule, preview where the lesson lands.

- **Para 1 — the surprise.** A teammate writes `const config = { feature: true }` and another module mutates `config.feature = false` later in the request. The user-facing flag flips silently. `const` did not protect the value; it never promised to.
- **Para 2 — the second bug.** A `let` was used "just in case" and got reassigned six months later by an unrelated PR. Half the rendering pipeline relied on the original binding. Both bugs come from the same root: misunderstanding what `const` actually promises.
- **Para 3 — what the lesson lands.** The one-sentence rule (`const` locks the arrow, not the box), block scope, the TDZ as the language's guardrail against use-before-declaration, why `Object.freeze` exists but the course doesn't reach for it, and the value-model observation that `const` alone doesn't narrow object types. Reference back to Lesson 1's binding diagram explicitly — that diagram is the spine of this lesson too.

---

## Section: `const` locks the arrow, not the box

The conceptual core. Single h2.

- **The one-sentence rule.** State it plainly: `const` is a binding that cannot be **reassigned**; it says nothing about whether the **value the binding points to** is mutable. Use `<Term definition="...">binding</Term>` for the word `binding` here (re-using the Lesson 1 terminology). Definition: "A name that points to a value. In `const x = 1`, `x` is the binding."
- **Reuse the binding diagram from Lesson 1.** Import `BindingDiagram.astro` from `src/components/lessons/001/1/`. The same two-panel SVG (primitive copy on the left, shared reference on the right) anchors the explanation: `const` locks the **name binding** in both panels; mutating `*.street` on the right panel still works because the object box itself is unfrozen. No new diagram needed — the recall is the point.
- **Worked example: the mutation that surprises.** A short `<Code>` block in `ts`:
  ```ts
  const config = { feature: true };
  config.feature = false; // allowed — mutation, not reassignment
  // config = { feature: false }; // TypeError — reassignment
  ```
  Two-line caption explaining which line throws and which doesn't, mapped back to the diagram.
- **Why this matters for the student.** One paragraph: in a module-scoped or component-scoped object, `const` does not protect the contents from being mutated by any module that imports it. The student's defense is the immutability reflex from Lesson 1 (copy-then-modify with spread or `structuredClone`) plus TypeScript's compile-time guards (covered in Chapter 004). Forward-link in one sentence.

No exercise here — this section is short and the binding diagram does the lifting. The sorting exercise at the end of the lesson is where the student's reflex gets tested.

---

## Section: `const` by default, `let` when the binding must change

The decision section. Single h2. This is the senior-reflex install.

- **The 2026 default.** `const` for every binding by default. Reach for `let` only when the binding must be reassigned. List the legit `let` cases tersely:
  - Accumulator patterns the language doesn't provide better forms for (e.g., `let total = 0;` in a manual loop — though `.reduce` is the senior reach when shape allows).
  - A binding whose value depends on a branch that can't be expressed as a ternary (rare; usually a refactor smell).
  - Loop counters in a classic `for (let i = 0; ...)` — `for...of` and `.map`/`.filter`/`.reduce` cover most cases.
- **The senior reflex.** "If you wrote `let` and never reassigned, change it to `const`." Reference Biome's `useConst` rule (set up in the chapter project's `biome.json` in Unit 1 of the course) — the lint catches it automatically at build time, the student doesn't have to police it manually. One-sentence forward link.
- **`var` is dead.** One paragraph. The course never writes it. Two reasons to recognize it in legacy code: (a) it's function-scoped, not block-scoped, so a `var` inside an `if` block leaks to the surrounding function; (b) it doesn't have a TDZ — accessing before declaration silently returns `undefined`, which is the bug class TDZ was designed to kill. The student should never write it; should recognize it in old code; should convert it to `let` or `const`.
- **One small `<Code>` block** showing the same accumulator written three ways: `var` (bad, leaks scope), `let total = 0` with manual loop (acceptable when `.reduce` doesn't fit), and the `.reduce` form (the senior reach when applicable). Use `<CodeVariants>` with three tabs:
  - Orange tab — `var` form, captioned as legacy.
  - Blue tab — `let` accumulator, captioned as the rare-but-fine reach.
  - Green tab — `.reduce` form, captioned as the senior default when the shape fits.
  Color convention continues from Lessons 1, 3, 5 (orange = anti-pattern, blue = acceptable, green = senior default).

---

## Section: Block scope and the Temporal Dead Zone

The mechanics section. Single h2 with no subsections (the two concepts are tightly linked and a senior thinks of them together).

- **Block scope, terse.** `let` and `const` are scoped to the nearest `{}` block — `for` loops, `if` branches, function bodies, arrow-function bodies, arbitrary block expressions. The scope is **lexical** (determined at write time), not dynamic. One short `<Code>` block showing a `const` declared inside an `if` block that's invisible outside it.
- **The TDZ, demystified.** Define `<Term definition="The period between entering a scope and reaching a let/const declaration. The binding exists (the parser saw it) but accessing it throws a ReferenceError.">Temporal Dead Zone</Term>` (TDZ) inline. The framing: the language is **protecting the student** from `var`-style "use before declaration silently returns `undefined`" bugs. Without the TDZ, `let` and `const` would have the same footgun as `var`.
- **One small live moment — `<ScriptCoding runner="vanilla">` block.** The student types or runs:
  ```js
  console.log(x);
  const x = 1;
  ```
  Tests assert the call throws a `ReferenceError`. The runtime error is the lesson — seeing the engine refuse the access lands the concept harder than a paragraph. Keep the test to one case; this is a 30-second moment, not a deep exercise. Use `runner="vanilla"` (no need for TS/Sandpack here — this is plain JS semantics).
  - **Test shape:** `expect(() => { /* student's code */ }).toThrow(ReferenceError)`. The starter is the two lines above with a comment prompt to run them as-is.
- **The senior reflex.** Declare bindings at the **top of the scope** where they're used. The TDZ rewards readers who scan top-down: if a binding is referenced, its declaration is above the reference. One sentence on this.
- **Hoisting, in one paragraph.** No table, no deep dive. The 2026 forms (`const`, `let`, `class`) hoist their name but not their value — accessing them before declaration throws (TDZ). `var` hoists name **and** initializes to `undefined` (the legacy bug class). Function declarations hoist their full body (which is why a function can be called above its declaration). The student should know the 2026 forms are TDZ-protected; the rest is recognition for legacy code.
- **One `<Aside type="note">`** on the hoisting takeaway: "You almost never need to think about hoisting in 2026 code. Declare bindings before you use them and the TDZ never fires. The forms that surprise (`var`, function declarations called above their definition) are not in the course's senior path."

---

## Section: `Object.freeze`, `readonly`, and why the course skips runtime freezing

Bridge section to the typing chapters. Single h2. Short — ~3 paragraphs plus one tiny code sample.

- **What `Object.freeze` actually does.** One paragraph: `Object.freeze(obj)` makes top-level properties read-only **at runtime**. Assigning to a frozen property silently fails in non-strict mode and throws in strict mode (which modules and class bodies use by default). Nested objects are **not** frozen — the freeze is shallow, same shape as the spread copies from Lesson 1.
- **Tiny `<Code>` block** showing `Object.freeze({ feature: true })` rejecting a top-level reassignment but accepting a nested mutation. Comment-tail the outputs.
- **Why the course doesn't reach for it.** One paragraph: TypeScript's `readonly` modifier (Chapter 004 Lesson 2) and `as const` (Chapter 004 Lesson 7) provide the same guarantee at **compile time**, with **zero runtime cost**. The bug becomes a build error the developer sees in their editor, not a silent failure in production. `Object.freeze` exists for the rare runtime-API case where a value must be tamper-proof at runtime (e.g., a module exporting a config object that third-party code receives), but in 2026 SaaS code the typing tools win.
- **The senior reach.** "Reach for `readonly` and `as const` for compile-time immutability; reach for `Object.freeze` only when a runtime guarantee is genuinely required (rare)." One sentence forward-link to Chapter 004.

---

## Section: `const` doesn't narrow types

The value-model-to-type-system bridge. Single h2. Short, but pedagogically important — it plants the `as const` reflex that pays off in Chapter 004.

- **The observation.** Two short `<Code>` blocks side by side via `<CodeVariants>`:
  - Blue tab — `const greeting = 'hello';` — TypeScript infers the **literal type** `'hello'` (primitive special case: `const` on a primitive narrows to the literal).
  - Orange tab — `const config = { feature: true };` — TypeScript infers the **widened type** `{ feature: boolean }`, not `{ feature: true }`. The `const` binding promise (no reassignment) doesn't carry into the object's property types — TypeScript widens them because the object is mutable.
  - Use `<CodeTooltips>` on each block to surface the inferred type on hover (the green tab in the spread-vs-clone Lesson 1 example used this pattern). Tooltip on `greeting` shows `'hello'`; tooltip on `config.feature` shows `boolean`.
- **Why TypeScript does this.** One sentence: the object is mutable, so its property could be reassigned to any boolean later; TypeScript widens conservatively to reflect that.
- **The fix is `as const`.** Named here in one sentence as the chapter-004 forward link. Show one `<Code>` line as the preview:
  ```ts
  const config = { feature: true } as const;
  // type: { readonly feature: true }
  ```
  The student doesn't need to fully understand `as const` yet — they need to know **the reflex starts here**, at the value-model level, and the deep treatment lives in Chapter 004 Lesson 7.

---

## Section: Check yourself

The lesson's closing exercise. Single h2.

- **`<Buckets>` exercise** with three buckets — the chapter outline's eight-item sorting drill, slightly tightened. Buckets:
  - `const` (description: "Binding never changes; default reach.")
  - `let` (description: "Binding genuinely must be reassigned.")
  - `prefer-const` (description: "Could be either; choose `const` because the body doesn't reassign.")
- **Items (8 chips):**
  1. A configuration object the file reads once at module top. → `const`
  2. A loop counter in `for (... ; ... ; i++)`. → `let`
  3. A `for...of` loop variable. → `const` (each iteration re-binds; the body never reassigns)
  4. A sum being accumulated across a manual loop. → `let`
  5. An HTTP response object the handler reads but doesn't reassign. → `const`
  6. An array being built incrementally with `.push`. → `prefer-const` (`.push` mutates, doesn't reassign the binding)
  7. A constant primitive value like a request timeout in ms. → `const`
  8. A function reference imported from another module. → `const`
- **Two-column layout** (`twoCol`), 3 buckets fit horizontally on desktop, stack on mobile.
- **Instructions prop:** "Sort each binding into where you'd reach for `const`, `let`, or 'prefer `const`' (could be either, but `const` is correct because the body doesn't actually reassign)."
- **The pedagogical goal** is that the student internalizes:
  - Items 1, 5, 7, 8 are obvious `const` cases.
  - Items 2, 4 are the legit `let` cases (genuine reassignment).
  - Items 3, 6 are the subtle "looks like it changes but the binding doesn't" cases — `for...of` rebinds per iteration (each iteration creates a new binding scoped to the body); `.push` mutates the array but never reassigns the binding pointing to it. These two items are the senior-reflex install.

The grader will mark each chip green or red after the student clicks "Check." No follow-up multiple choice — the sorting is the assessment.

---

## Section: External resources

`<CardGrid>` with 2 `<ExternalResource>` cards. Keep the list short and curated — these are the canonical references a senior would bookmark, not a survey.

- **MDN — `let` / `const` / TDZ** — `https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/const` — icon `simple-icons:mdnwebdocs`. Description: "The canonical reference, including the precise TDZ semantics."
- **Biome `useConst` rule** — `https://biomejs.dev/linter/rules/use-const/` — icon `simple-icons:biome`. Description: "The build-time backstop that catches the `let`-that-should-be-`const` reflex automatically."

No video for this lesson. Hoisting/TDZ explainer videos exist on YouTube but the topic is short enough that the live `<ScriptCoding>` moment + the inline definitions cover it without the cognitive-load tax of an embedded video. The lesson is already dense; no need to add 5+ minutes of viewing.

---

## Scope

### Included

- `const` vs. `let` decision rule + the senior reflex of "default to `const`."
- `var` named once for legacy recognition; never written in the course.
- Block scope (lexical, `{}`-bounded).
- The Temporal Dead Zone — what it is, why the language has it, the senior reflex (declare at top of scope).
- Hoisting in one paragraph: `const`/`let`/`class` hoist name only and are TDZ-protected; `var` hoists name and initializes to `undefined`; function declarations hoist their full body. No deep dive.
- `Object.freeze` mentioned and explained (shallow runtime freeze) **only** to contrast with `const` and to motivate why TypeScript's `readonly` / `as const` is the 2026 reach.
- The value-model-to-type-system bridge: `const` narrows primitive literals but widens object property types; `as const` is the fix (forward-linked, not taught here).
- Biome `useConst` rule named as the build-time backstop.

### Explicitly excluded

- **Closures and lexical capture.** Owned by Chapter 002 Lesson 7. Mentioned in the chapter outline's forward links list only; the current lesson doesn't teach scope chains or closure mechanics.
- **Function declarations vs. function expressions in depth.** Owned by Chapter 002 Lesson 1. This lesson only mentions function-declaration hoisting in the one-paragraph hoisting beat, for recognition.
- **The `with` statement, `eval`, strict-mode forbidden surfaces.** Not in the 2026 stack; not named.
- **Module scope vs. global scope.** The course writes against ES modules only. The global object (`globalThis`) gets one parenthetical mention at most; no exploration.
- **`as const` mechanics.** Owned by Chapter 004 Lesson 7. The current lesson previews **why** the reflex exists (object property widening) and shows one preview line, but does not explain the inference algorithm.
- **`readonly` field modifiers.** Owned by Chapter 004 Lesson 2. Forward-linked in one sentence.
- **React state immutability mechanics.** Owned by Chapter 023 Lesson 4 + Chapter 024 Lesson 2. Forward-linked in one sentence; the underlying value-model reflex was already planted in Lesson 1.
- **A deep TDZ tour (class TDZ, `typeof` exception on TDZ bindings, TDZ within destructuring defaults).** The student needs the one-line consequence and the runtime demo, not the edge-case catalog.
- **Variable shadowing within nested scopes.** Niche enough to skip; the chapter doesn't earn it.
- **Performance characteristics of `const` vs. `let`.** Identical in modern engines; not worth a paragraph.

### Prerequisites the student already has from this chapter

- **Lesson 1 — the binding diagram.** The lesson reuses the `BindingDiagram.astro` component. The student already knows "binding," "reference," primitive vs. object semantics, and the copy-then-modify reflex. The current lesson does **not** re-teach these — it leans on them as the foundation of "`const` locks the arrow."
- **Lesson 2 — `===` for primitives and references.** The current lesson does not teach equality; only references it where the immutability reflex needs it.
- **Lesson 3 — `Number()` boundary discipline.** No reuse needed in this lesson.
- **Lesson 4 — strings.** No reuse needed.
- **Lesson 5 — template literals.** No reuse needed.

---

## Code conventions applied

- All snippets `.ts` except the `<ScriptCoding runner="vanilla">` TDZ demo, which is plain `.js` (the vanilla runner doesn't parse TS). This is a **deliberate divergence** matching Lesson 3's `dollarsToCents` precedent — the runtime semantics is the point and the vanilla runner is the right tool.
- Single quotes for strings.
- `const`-bound arrow functions where any function form appears (no `function` declarations except in the one-paragraph hoisting beat where the form itself is the topic).
- 2-space indent, trailing commas where multiline, semicolons on.
- Inference-led — no return type annotations except where they'd be required by the lesson's convention (none needed here).
- Variable names carry intent: `config`, `total`, `greeting`, never `foo`/`bar`.
- `<CodeVariants>` color convention continues the chapter: orange = anti-pattern (`var`), blue = acceptable (`let` accumulator, primitive widening preview), green = senior default (`.reduce`).
- The `<Buckets>` chip text uses inline backticks for `const` / `let` / `for...of` / `.push` etc. — matches Lesson 1's Buckets style.

---

## Component checklist for the writer agent

- `<Term>` (×2 minimum) — `binding` and `Temporal Dead Zone`. Optional third on `block scope` if the writer thinks it earns it.
- `<Code>` blocks for short single-purpose snippets.
- `<CodeVariants>` ×2 — the three-form accumulator (orange/blue/green) and the `const`-narrowing comparison (blue/orange).
- `<CodeTooltips>` ×1 — inferred-type tooltips on the `const` narrowing comparison.
- `<ScriptCoding runner="vanilla">` ×1 — the TDZ runtime demo, one test asserting `ReferenceError`.
- `<Aside type="note">` ×1 — the "you almost never need to think about hoisting in 2026" close to the block-scope/TDZ section.
- `<Buckets twoCol>` ×1 — the closing 8-item sorting exercise with three buckets.
- `<CardGrid>` + `<ExternalResource>` ×2 — MDN reference and Biome `useConst` rule.
- `BindingDiagram` imported from `src/components/lessons/001/1/BindingDiagram.astro` — reused in the first section.
- No `<VideoCallout>` — intentional; the lesson is dense enough without one.
- No new lesson-specific component required.

# Lesson 8 outline

- **Title (h1):** Annotate the boundaries, infer the inside
- **Sidebar label:** Annotate at the boundaries

## Lesson framing

This is the chapter's posture lesson. Seven lessons installed the type vocabulary; this one installs the **rule about where to use it**. The student leaves with two reflexes: annotate at the seams (function parameters, exported APIs), let inference do the rest (locals, callbacks, internal returns); and reach for `import type` whenever the imported name never appears in the emitted JavaScript, because `verbatimModuleSyntax` makes the difference load-bearing.

The lesson resolves the tension every prior lesson has built up — every example showed the student writing types, but production code does not annotate every line. Without an explicit rule, the student leaves the chapter either over-annotating (noise, fights with inference, brittle to refactors) or under-annotating (`any` creeping in via parameters, exported surfaces that don't document themselves). The senior call is asymmetric: contracts at the seams, freedom inside.

Core pedagogical decisions:

- **Open with the two anti-extremes paired.** The student has likely seen both in legacy code — a file with explicit return types on every function (including one-line helpers), and a file with no annotations anywhere (parameters included). Show both as failure modes. The rule emerges as the resolution, not as a top-down prescription.
- **Frame annotations as contracts, inference as concision.** The mental model is the seam: at the boundary of a module or function, an annotation is the API you publish; inside, the value is its own type. This generalizes — it's the same logic Drizzle's `$inferSelect`, Zod's `z.infer`, and TanStack's typed query keys all use.
- **Two distinct topics, one chapter.** The annotation rule and the `import type` discipline are independent but share the "boundary" frame. Order them: annotation rule first (the bigger payoff), then `import type` as a smaller second beat (specific to the strict tsconfig). Don't bury `import type` — it lands its own h2 and earns the closing exercise category.
- **Code conventions land here.** The course's `Code conventions.md` already states "annotate parameters and return types of exported functions; let inference handle locals." This lesson is where that rule gets explained. Every subsequent lesson in the course relies on the student having internalized it.
- **The `isolatedDeclarations` direction, one line.** TypeScript 5.5 introduced the flag; TypeScript 6.0 (March 2026) marked it stable. It remains opt-in — not a default — but the 2026 direction is clear: monorepos and library publishers enable it so downstream tools emit `.d.ts` without invoking the full type checker. Name the flag once as the trajectory; don't teach the mechanics — it doesn't fire in the course's single-app setup.
- **The `verbatimModuleSyntax` failure modes are the load-bearing part of section two.** Without the failure modes named, `import type` is just syntax the student copies. With them named, the student understands why the strict tsconfig forces the discipline — value imports with type-only uses get bundler-erased, breaking side-effect modules; circular type-imports as value-imports deadlock initialization. The student should leave able to defend the rule.
- **The closing exercise is the canonical chapter test.** A `Buckets` sort across ten declaration sites maps the boundary rule onto concrete code positions. This is the muscle-memory install the chapter has been building toward — by the end of this exercise the student picks "annotate, infer, or `import type`" in milliseconds.

Mental model the student leaves with: **types live at the API; values live inside.** Annotations document the contract at the call site; inference is what the compiler does well, and what saves the student from typing every local. `import type` is the per-line marker that says "this name never reaches runtime."

## Lesson sections

### Introduction (no heading)

Open with the two anti-extremes in two short snippets, no commentary between them.

```ts
// Over-annotated: every local restated
const sum: number = items.reduce((acc: number, item: Item): number => acc + item.price, 0);
const isPaid: boolean = invoice.status === 'paid';
```

```ts
// Under-annotated: parameters typed as implicit any
function processInvoice(invoice) {
  return invoice.total * 1.1;
}
```

Then the prose. Both files compile. Both are wrong for different reasons. The first is documentation that the value already provides — TypeScript reads `items.reduce(...)` and infers `number` correctly; the explicit annotations are restating what the compiler already knows, and they break the moment the reducer's return type changes. The second is the implicit-any error in strict mode — `invoice` is untyped, so every property access slips through type checking. Both are vocabulary failures: the first uses annotations where they don't earn their weight; the second skips them where they're load-bearing.

State the rule plainly: **annotate at the boundaries; infer everywhere else.** Boundaries are function parameters and exported APIs — the places another part of the codebase reads your signature without opening the body. Inside the function, the value is its own type and inference does the work. The first half of the lesson installs this rule across the cases the student writes daily. The second half installs the per-import discipline `verbatimModuleSyntax` enforces: every type-only import is marked `import type` so the compiler erases it cleanly.

One forward sentence: this lesson is the chapter's posture lesson — every code sample in the rest of the course follows this rule without comment.

### Where annotations earn their weight

The first of three subsections under the boundary rule. State the principle and walk the three sites.

State the principle in one sentence: **a type annotation is a contract with someone who won't read your code.** That's the test — if a future caller will read the signature without opening the body, the signature needs a type. If the value is local and the body is the documentation, the annotation is noise.

Walk three sites where annotations earn their weight. Each gets one short prose paragraph and one snippet.

1. **Function parameters.** Always. The function signature is the contract with the caller; TypeScript can't infer parameter types from inside the function because the function might be called from anywhere. Without an annotation, TypeScript infers `any` for parameters — the implicit-any error in strict mode. Show a `processInvoice(invoice: Invoice)` snippet — the parameter type is the only thing that makes the function callable safely.

2. **Exported APIs.** Functions, type aliases, constants exported from a module. The consumer reads the signature in tooltips, in `.d.ts` files, in API docs — without opening the implementation. Even when inference would produce the right type, the annotation is the **documentation surface** for the export. Show an `export function createInvoice(input: CreateInvoiceInput): Promise<Result<Invoice>>` snippet. The return type is the API contract.

3. **Return types where inference produces an unintended type.** Rare. The senior reaches for an explicit return type when the function's intent is to satisfy a wider interface (a callback that returns `void`), when the inferred return is a complex conditional the consumer shouldn't depend on, or when a recursive function would otherwise infer `any`. Show one example — a function returning `Result<T>` where the explicit annotation locks the contract and makes the discriminated union narrowing predictable at the call site.

Component choice: three `<Code>` blocks in sequence, one per site. Not `<CodeVariants>` — the three sites are independent reaches, not parallel forms of the same mechanism.

Tooltip terms: `implicit any` (one-line `Term` — "the error TypeScript fires under `noImplicitAny` when a parameter has no annotation and no contextual inference, defaulting to the unsafe top type").

### Where inference wins

The counterpart subsection. State the principle, walk three sites.

State the principle in one sentence: **let the compiler read the value when it can, and stay out of its way.** Inference is concision plus refactoring resilience — when the value changes, the inferred type changes with it; an annotation has to be updated by hand and goes stale silently.

Three sites where inference wins. Each gets one short paragraph and one snippet.

1. **Local variables.** `const total = items.reduce((acc, item) => acc + item.price, 0)` — TypeScript reads the reducer's return type and types `total` as `number`. Annotating `const total: number = ...` is noise that breaks if the reducer's return type ever needs to change. The exception that proves the rule: when narrowing is the point (`const status: 'draft' | 'sent' = ...` to lock the inferred type), but that's already `as const`-shaped territory from the previous lesson.

2. **Inline callbacks.** `items.map(item => item.price)` — the parameter type flows from the array's element type via contextual inference. Annotating the callback parameter `(item: Item) => item.price` breaks the inference and forces a redundant type. This is the most common annotation noise in junior codebases — every `.map`, `.filter`, `.reduce` callback over-typed because the student didn't realize the context already provided the type.

3. **Return types of internal functions.** When the function isn't exported and the body is small, the inferred return type is correct and stays in sync as the body changes. The senior reflex: annotate the return type only when the function is exported, when inference would be wrong, or when the function's signature itself is the lesson. Show a small internal helper `const formatPrice = (cents: number) => (cents / 100).toFixed(2)` — the inferred return type `string` is what the consumer needs; restating it would add nothing.

Component choice: three `<Code>` blocks in sequence, mirroring the previous section's shape. Symmetry helps the student see the rule as a pair, not as two unrelated lists.

Then state the trade-off plainly in one closing paragraph: **annotations are documentation and structural enforcement; inference is concision and refactoring resilience. The boundary rule gives both — contracts at the seams, freedom inside.** One forward link to `isolatedDeclarations` in a single sentence — TypeScript 6.0 marked the flag stable in March 2026; it's opt-in (not a default) and is the trajectory monorepos and library publishers enable so downstream tools emit `.d.ts` files in parallel without running the full type checker. The boundary rule the lesson installs lines up with where the language is heading.

Tooltip terms: `contextual inference` (one-line `Term` — "TypeScript inferring a parameter's type from the surrounding call site rather than from the function body").

### Annotate, infer, or both: the senior call

A small consolidation section before pivoting to the second half. Two paragraphs and one diagram.

The diagram is a simple HTML + CSS visual: a horizontal "module" rectangle with three regions left-to-right — "Exports (annotate)" on the left edge, "Internal body (infer)" in the middle, "Parameters of every function (annotate)" along the right edge. The pedagogical goal: install the spatial mental model that types live at the **perimeter** of a unit and inference fills the interior. Use color to differentiate the annotated edges (a contract color — blue) from the inferred interior (a value color — neutral or green).

Wrap the diagram in `<Figure caption="Types live at the module's perimeter; inference fills the interior.">`. The diagram itself is plain HTML + CSS (per the diagrams index: "Annotated illustration — HTML + CSS"). No complex engine needed — three nested divs with semantic labels.

Then one paragraph naming the rule's payoff: when the boundary is annotated and the inside isn't, refactoring is cheap (the body changes, the contract doesn't), the public surface is documented (the consumer reads tooltips), and the codebase reads consistently across files. This is the asymmetric posture every senior TypeScript codebase converges on.

### `import type` and the strict tsconfig

The second half of the lesson. Pivot with one paragraph naming the topic shift. The annotation rule covers the **declaration** side of the boundary; `import type` covers the **import** side. Both are the same posture — type information at the seams, runtime values everywhere else — applied at different surfaces.

State the rule in one sentence: **with `verbatimModuleSyntax: true`, every import that's used only as a type must use `import type`.** Under the flag, imports and exports are emitted exactly as written — TypeScript drops its old "import elision" heuristic that quietly stripped imports it thought were type-only. Now the modifier is the developer's responsibility: `import type` declarations are erased entirely (the compiler emits nothing, the bundler never sees them, the runtime never executes them), while bare `import { ... }` declarations are preserved verbatim in the emitted JavaScript. Mixed imports (some names are types, some are values) use the per-name form: `import { type Foo, bar }`.

Two snippets in `<CodeVariants>`:

1. **Wrong shape — value import used only as a type.**
   ```ts
   import { User } from './user'; // imported as value, used only in a parameter type
   const greet = (user: User) => `Hello, ${user.name}`;
   ```
   Under `verbatimModuleSyntax: true`, this is a compile error. The compiler refuses to emit a value-style import for a name that never appears at runtime.

2. **Right shape — type-only import.**
   ```ts
   import type { User } from './user';

   const greet = (user: User) => `Hello, ${user.name}`;
   ```
   The `import type` is erased by the compiler. The bundler never sees it. No runtime cost, no bundle weight, no module-graph edge at runtime.

Then the mixed form in a single `<Code>` block:

```ts
import { type CreateInvoiceInput, createInvoice } from './invoice-actions';
// type-only:                ^^^^^^^^^^^^^^^^^^^   ^^^^^^^^^^^^^ value
```

One per-name `type` modifier marks the type imports; the value imports stay bare. The compiler erases the typed names from the emitted import and keeps the value names. The student should leave able to read both forms at a glance.

Component choice rationale: `<CodeVariants>` for the wrong-vs-right contrast because the same `User` import is shown in two forms and the swap is the point. A single `<Code>` block for the mixed form because there's no comparison — the syntax stands alone.

Tooltip terms: `verbatimModuleSyntax` (one-line `Term` — "TypeScript flag that emits each import statement exactly as written and requires `import type` for type-only imports, removing the compiler's old type-elision heuristic").

### Why the strict tsconfig forces the discipline

A focused subsection naming the two failure modes the rule prevents. Without these named, `import type` is just syntax the student copies; with them named, the student understands the load-bearing reason.

Two failure modes in two short paragraphs, each with one short snippet.

1. **Side-effect modules silently tree-shaken.** A module that runs initialization at load (Drizzle's relation declarations, a `lib/auth.ts` that wires `Better Auth`, a feature-flag module that registers handlers on import) can be erased by the bundler if every import from it is used only as a type. Under the pre-`verbatimModuleSyntax` behavior, TypeScript's import-elision heuristic would silently drop an import it thought was type-only — and the module's side effects would never fire. `verbatimModuleSyntax` removes that guess: every bare import preserves the module-graph edge, and every `import type` declaration is the developer being **explicit about intent** — "this name never reaches runtime, but I'm not asking for the module's side effects either." For side-effecting modules without a value name to grab, a bare `import './auth'` is the canonical reach; any name pulled from a side-effecting module stays a value import.

   Show one snippet: a side-effecting module (`db/relations.ts` with relation declarations) imported as `import type { Relations } from './relations'` — the relations never register, and a query that depends on them fails at runtime. The fix is to add a value import alongside the type one, or to add a bare `import './relations'` for the side effect.

2. **Circular type-imports that masquerade as value-imports.** Two modules that reference each other's types at the type level only — `User` imports `Invoice`'s type for one field; `Invoice` imports `User`'s type for one field. At the type level the cycle is sound; the type checker walks it without trouble. At the value level the cycle can **deadlock module initialization** — module A's top-level code runs before module B's exports are defined, and the value reference reads `undefined`. `import type` declarations are erased before the bundler sees them, so a type-level cycle stays type-level and never becomes a runtime cycle. The student who writes the type cycle as value imports has built a latent bug that fires only when both modules execute side effects at load.

   Show one schematic snippet: two files cross-importing each other's types as values, with a comment indicating the runtime cycle. State the fix in one line — use `import type` on both sides.

Then one closing sentence linking forward: the full module-graph mechanics live in chapter 006; this lesson installs the per-import-line discipline that keeps the module graph honest.

Component choice: two `<Code>` blocks in sequence, one per failure mode. The two failure modes are independent, not parallel forms — `<CodeVariants>` would imply comparison.

### Practice: annotate, infer, or `import type`

The closing `<Buckets>` exercise. The canonical posture test for the lesson's two rules.

Exercise spec:

- **Format:** `<Buckets twoCol={true}>` with three buckets and ten items. The two-column layout fits the three-bucket spread on wide viewports and collapses cleanly to one column on narrow.
- **Buckets:**
  - `Annotate` — "The declaration site is the contract."
  - `Infer` — "Let the compiler read the value."
  - `import type` / mixed import — "The name never reaches runtime."
- **Items (ten declaration sites — final list):**
  1. Exported function parameter — `export function getInvoice(id: string)` → **Annotate**.
  2. Internal helper parameter — `const formatPrice = (cents: number) => ...` → **Annotate** (parameters always, even on internal helpers).
  3. Local sum variable — `const total = items.reduce(...)` → **Infer**.
  4. Inline `.map` callback parameter — `items.map(item => item.price)` → **Infer**.
  5. Exported type alias — `export type Invoice = { ... }` → **Annotate** (the type alias is the contract).
  6. Internal function return type — `const computeTax = (cents: number) => cents * 0.21` → **Infer**.
  7. Exported function return — `export function createInvoice(...): Promise<Result<Invoice>>` → **Annotate**.
  8. Exported `const ROUTES = { ... } as const satisfies Record<RouteName, string>` → **Annotate** (the `satisfies` is the contract at the exported boundary; framed as "explicit type information at the seam").
  9. `import { User } from './user'` where `User` is used only as `(user: User) => ...` → **`import type` / mixed import** (the rewrite is `import type { User } from './user'`).
  10. `import { type CreateInvoiceInput, createInvoice } from './invoice-actions'` → **`import type` / mixed import**.

  Balance: five Annotate items (1, 2, 5, 7, 8), three Infer items (3, 4, 6), two import items (9, 10).

- **Pool order:** shuffled at render time per the component default.
- **Grading:** each `<Item bucket="X">` matches a `<Bucket name="X">` exactly; the runtime grades on **Check**.

Component: `<Buckets twoCol={true}>` with one `<Bucket>` per category and ten `<Item>` chips.

This exercise is **the chapter's closing posture install**. After this, the student picks "annotate, infer, or `import type`" in milliseconds for every declaration site in the rest of the course.

### External resources

Three `<ExternalResource>` cards in a `<CardGrid>`. Suggested picks:

- **TypeScript Handbook on `verbatimModuleSyntax`** (https://www.typescriptlang.org/tsconfig/verbatimModuleSyntax.html) — the official reference for the flag and the `import type` requirement.
- **Total TypeScript on the inference-vs-annotation choice** — Matt Pocock's writeup or video on the boundary rule; senior-voice reinforcement.
- **TypeScript Handbook on `isolatedDeclarations`** (https://www.typescriptlang.org/tsconfig/isolatedDeclarations.html) — the 2026 direction the lesson body names in one sentence; reference for the curious student.

Optionally one `<VideoCallout>` if a short Matt Pocock or Andrew Burgess video exists on **the boundary annotation rule** or **`import type` and `verbatimModuleSyntax`** under ~10 minutes. Per the continuity notes, every prior chapter 004 lesson has used a `<VideoCallout>`; this lesson should match. Prefer a video on the import discipline (concrete, easy to demonstrate) over the broader annotation philosophy (which the lesson already walks at depth).

### Tooltip terms list

Strategic `<Term>` tooltips, used inline once each at first mention:

- **implicit any** — at the function parameters bullet. Definition: "the error TypeScript fires under `noImplicitAny` when a parameter has no annotation and no contextual inference, defaulting to the unsafe top type."
- **contextual inference** — at the inline callbacks bullet. Definition: "TypeScript inferring a parameter's type from the surrounding call site rather than from the function body."
- **`verbatimModuleSyntax`** — at the `import type` rule's first mention. Definition: "TypeScript flag that emits each import statement exactly as written and requires `import type` for type-only imports, removing the old type-elision heuristic."
- **`isolatedDeclarations`** — at the one-line forward link. Definition: "opt-in TypeScript flag (stable as of TS 6.0) that requires exported APIs to declare their types explicitly so downstream tools can build `.d.ts` files without running the type checker on the implementation."

Re-use the chapter's `Term` styling — single sentence, plain text, no markup inside the tooltip body.

## Scope

What this lesson **does not** cover (deferred to named locations):

- **The full strict tsconfig build-out.** `verbatimModuleSyntax` is named as the flag that enforces `import type`; the rest of the strict baseline (`strict`, `noUncheckedIndexedAccess`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`, `target`/`lib`, `module`/`moduleResolution`, the transpiler-alignment trio, `jsx: "preserve"`, `noEmit`, the Next.js plugin) is the project owner of chapter 028 lesson 4. Don't redefine — refer to the strict baseline as "the strict tsconfig of chapter 028" and move on.
- **`isolatedDeclarations` mechanics.** Named in one sentence as the 2026 direction (stable in TS 6.0, March 2026; remains opt-in). The full treatment lives wherever an exported-API lesson surfaces it — the curious student follows the external resource.
- **Module graph mechanics in depth.** Live bindings, depth-first evaluation, dynamic `import()`, `"use client"` boundaries, `import 'server-only'` — all chapter 006's territory. This lesson installs the per-import-line discipline; chapter 006 walks the graph.
- **Module augmentation via `declare module`.** Chapter 006 lesson 4.
- **`import type * as X`** and **`export type { X }` re-export forms.** Niche; named in one line if at all, and the canonical pattern remains `import type { X }`.
- **Project references and monorepo TypeScript topology.** Not in scope — the course is a single-app SaaS.
- **The implicit-any rule's full surface.** `noImplicitAny` is on as part of `strict`; the lesson names the rule's fire at function parameters but does not enumerate every other site (return types in some configurations, members of generic type parameters with no default, etc.). The chapter's posture lesson installs the most-bitten case.
- **TanStack Query, Drizzle, Zod, Better Auth specifics that follow the boundary rule.** Forward links only — the rule the student installs here is what every later chapter assumes.

Prerequisites the lesson **assumes** the student has from earlier lessons (single-sentence redefinitions are acceptable if absolutely needed):

- The seven primitives, literal unions, the four corners (lesson 1) — referenced when sketching parameter and return types.
- `type` as the default (lesson 2) — every example uses `type` aliases; no `interface`.
- The `Record<LiteralUnion, V>` completeness check (lesson 4) — referenced once in the exported config example.
- Discriminated unions and the `Result<T>` shape (lesson 5) — used in the return-type example.
- Control-flow narrowing as the senior default (lesson 6) — referenced when justifying explicit return types on functions returning discriminated unions.
- `as const satisfies T` for typed config (lesson 7) — used in the exported config example in the closing exercise. One-line refresher acceptable.

## Code conventions alignment notes

- Arrow functions bound to `const` for every function-shaped example. Reserve `function` declarations only for type-guard signatures — none in this lesson.
- `type` aliases everywhere; no `interface`.
- The boundary rule the lesson installs **is** the `Code conventions.md` § TypeScript rule "annotate parameters and return types of exported functions; let inference handle locals, intermediate values, and internal-helper returns." Quote the rule in one line during the senior-call paragraph so the student recognizes the convention's language.
- The under-annotated counterexample in the introduction uses a `function` declaration on purpose (the implicit-any failure mode reads the same against a `function` or an arrow); this is a one-shot violation of "arrows by default" and should be commented inline as the failure case the rule prevents. Every correct-shape snippet uses `const`-bound arrows.
- `import type` per-line discipline lands here. Mixed imports use the `{ type Foo, bar }` form. Both forms appear in the lesson.
- Side-effecting imports (`import 'server-only'`, `import './globals.css'`) appear before group 1 in the canonical layout — named in passing in the side-effect failure mode but not the lesson's focus.
- `SCREAMING_SNAKE_CASE` for true module-level compile-time constants only (the `ROUTES` example follows this; non-constant module-level state stays `camelCase`).
- Single quotes for strings; trailing commas multiline; semicolons on.
- Component usage: `<Code>` for plain single-snippet examples; `<CodeVariants>` for the wrong-vs-right `import type` contrast; one HTML+CSS `<Figure>` for the "perimeter" diagram; one `<Buckets>` exercise for the closing posture install. No `<AnnotatedCode>` — the lesson's snippets are short and independent; the focus stays on the rule, not on stepped walkthroughs.
- No comments in code except where information depends on them: the wrong/right `import type` snippets carry a single-line comment naming the type-only use; the mixed-import snippet underlines which names are types and which are values.

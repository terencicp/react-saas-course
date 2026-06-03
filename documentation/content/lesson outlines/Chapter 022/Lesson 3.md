# Lesson title

- Title: `Polymorphism with Slot and CVA`
- Sidebar label: `Slot and CVA`

# Lesson framing

This lesson turns the running `<Button>` (built across L1/L2 with `ComponentProps<'button'>` + `variant`/`size` + `leftIcon` + `cn(buttonClasses({ variant, size }), className)` + `{...rest}`) into the real shadcn-style polymorphic primitive.
Two distinct senior moves, taught in order:

1. **`cva` replaces the hand-rolled `buttonClasses` stand-in.** L1/L2 left `buttonClasses({ variant, size })` deliberately unbuilt — a function that "returns a class string for a variant combination." This lesson cashes that debt: `cva` *is* that function, declared as a variant table, with `VariantProps` deriving the prop types the student hand-wrote in L1. This is the lower-risk half — it's a refactor of something the student already understands, so it goes first and builds confidence.
2. **`Slot` + `asChild` makes the element polymorphic.** This is the genuinely new idea and the harder one. The student already has the discriminated-union button-vs-link from L1 (the *typed* answer) and the "compose, don't configure" instinct from L2. The seam was explicitly named in both lessons: "L3 solves it by composition." This lesson delivers — `<Button asChild><Link>` — and contrasts it head-to-head with the generic `as` prop it rejects.

The mental model the student leaves with: **a 2026 component is a typed function whose *classes* come from a variant table (`cva`) and whose *element* the consumer can substitute (`Slot`/`asChild`), with the caller's `className` always winning the merge (`cn`/`tailwind-merge`).** Every shadcn primitive in Ch 027 is this exact shape; this lesson teaches the reader of those files to write them.

Pedagogical spine:
- **Trigger before tool, twice.** Open each half with the pain it removes. `cva`'s trigger: the 4×3 = 12-combination explosion the student can feel coming from the L1 variant unions. `Slot`'s trigger: the three losing ways to make a button render as a link (duplicate `<LinkButton>`, brittle `as` generics, invalid `<a><button>` nesting).
- **Lead with the senior decision, not the API.** `asChild` is framed as "the consumer brings the element, the component contributes behavior and classes" — a composition principle — before any Radix import appears.
- **One running artifact.** Do not introduce a new component. Every code block extends the *same* `<Button>` from L1/L2. The lesson's payoff is the final canonical Button that consolidates `cva` + `Slot` + `cn` + `asChild` + ref-as-prop, which the student then sees unchanged in every Ch 027 file.
- **Cognitive load management.** `Slot`'s internal merging (className concat, handler composition, ref forwarding) is shown as a *black box with a contract* first; the "what it does to each prop kind" detail lands only after the consumer-facing `asChild` form is solid. Refs-through-Slot is named as "it just works" and pointed at L4, not explained here.
- **Accessibility as a senior rule, not a footnote.** The `asChild` accessibility implication ("vary the element, not fake one") is the conceptual guardrail that prevents the most common real-world misuse, so it gets its own section with a concrete screen-reader/Cmd-click consequence.
- **Visualize the two invisible mechanisms.** Two diagrams carry the lesson: a `Slot` prop-merge diagram (what goes in vs. what comes out on the child) and a `cva` variant-table-to-class-string lookup. Both make an opaque transform legible.

This is a teaching (non-project) chapter; close with a recall checkpoint, not a build.

# Lesson sections

## Introduction (no heading)

Warm, brief, ~2 short paragraphs. Open on the concrete senior question from the outline: a `<Button>` is sometimes a real `<button>` (an action) and sometimes an `<a>` (navigation) — and the variant table that styles it shouldn't have to be rebuilt per element.
Connect explicitly to where the student already is: "In L1 you gave `<Button>` a typed `variant`/`size` contract and left `buttonClasses` as a placeholder; in L2 you learned to compose instead of configure. This lesson builds the two tools that finish the job — a variant table that *is* `buttonClasses`, and a slot that lets the caller swap the element."
Preview the end state in one line: the exact `<Button>` shape every shadcn component in the project (Ch 027) is built from. No code yet.

## From a hand-rolled class function to a variant table

**Goal:** install `cva` as the direct replacement for the L1/L2 `buttonClasses` stand-in. Lowest-risk half first.

Open with the combinatorics trigger: the L1 variant unions (`variant: 'primary' | 'secondary' | 'destructive' | 'outline'`, `size: 'sm' | 'md' | 'lg'`) imply 12 class strings. Writing that as a nested ternary or a lookup object by hand is the smell `cva` removes. Frame `cva` as "a typed builder for exactly the `buttonClasses(args) => string` function L1 promised."

Show the `cva` call with **`AnnotatedCode`** (the call has 4 distinct parts the student must register separately: base string, `variants` object, `defaultVariants`, and the returned callable). Steps:
1. `{1}` the base class string — applies to every button regardless of variant. Tint blue.
2. the `variants` object — keyed by prop name (`variant`, `size`), each key maps a union member to its classes. This *is* the L1 union, now carrying its styling. Tint green; highlight the `variant` block.
3. `defaultVariants` — the runtime fallback when a prop is omitted, mirroring the L1 destructure defaults (`variant = 'primary'`). Tint orange.
4. the call site `buttonVariants({ variant, size })` returns the joined string — the same call shape as the old `buttonClasses({ variant, size })`, so the consuming JSX is untouched.

Use the **established project token vocabulary** in the class strings (semantic tokens: `bg-primary text-primary-foreground`, `bg-destructive`, `border`, `hover:bg-primary/90`), not raw primitives — this is the three-tier model from Ch 019 cashing in, and Ch 027 expects it. Keep each variant's class string short and illustrative; this is not a design-system tutorial.

Note for the writer: name the export `buttonVariants` (shadcn convention), not `buttonClasses` — call out in one sentence that this *is* the L1 placeholder, now built, so the student maps old→new cleanly. Convention requires CVA version `0.7.x`, import `import { cva, type VariantProps } from 'class-variance-authority'`.

**Diagram — the variant lookup (Figure + HTML/CSS, or DiagramSequence if showing the call resolving).** Pedagogical goal: make `cva` legible as a *table lookup*, not magic. A small 2-axis grid: rows = `variant` values, columns = `size` values; the cell at (`destructive`, `lg`) lights up when the caption says `buttonVariants({ variant: 'destructive', size: 'lg' })`, and the resolved class string (base + that row's classes + that column's classes) appears below. Prefer a 2-step **DiagramSequence**: step 1 shows the empty table with base classes; step 2 lights one cell and shows the concatenated output. Keeps it a "lookup + concat" mental model. Cap height; this is a small aid, not a system graph.

## Typing the variants for free with VariantProps

**Goal:** show that `cva` removes the second piece of L1 hand-work — the prop *types*.

Recall: in L1 the student wrote `type Props = ComponentProps<'button'> & { variant?: 'primary' | ...; size?: 'sm' | ... }` by hand. `VariantProps<typeof buttonVariants>` derives exactly those optional union props from the `cva` call. Show the before/after with **`CodeVariants`**:
- Variant "Hand-typed (L1)": the explicit `variant?`/`size?` unions, with a note "two sources of truth — the union here and the class strings elsewhere drift."
- Variant "Derived (VariantProps)": `type Props = ComponentProps<'button'> & VariantProps<typeof buttonVariants> & { asChild?: boolean; leftIcon?: ReactNode }`, note "one source of truth — add a variant to the `cva` call and the type updates."

Keep `leftIcon?: ReactNode` (added in L2) and preview `asChild?: boolean` (next section) in the type so the props line is the real, final one. Use **`CodeTooltips`** on this block for `VariantProps` ("Derives the variant prop types from the cva call — `variant?` and `size?` here") and on `typeof buttonVariants` if helpful.

Watch-out to fold in (not a separate section): `VariantProps` types each variant as `'x' | null | undefined` — the `null` "unset" branch is real; `defaultVariants` resolves it at runtime. One sentence; this is the only non-obvious wrinkle.

## The asChild problem: when a button needs to be a link

**Goal:** motivate `Slot` by exhausting the alternatives. This is the conceptual heart; spend the most care here.

Pose the need from the outline: this `<Button>` styles an action, but the "Open dashboard" button must *navigate* — it needs to be an `<a>`/`<Link>` so Cmd-click, middle-click, "open in new tab," and screen-reader "link" semantics all work. Then walk the three losing options with **`CodeVariants`** (each tab is one rejected approach, framing in the first sentence):
- **Duplicate component** (`<LinkButton>`): "Rebuilds the entire variant table for a second element. Every new variant now ships twice." Show a stub that re-declares the same `cva` classes — the duplication is the point.
- **Generic `as` prop** (`<Button as={Link} href="...">`): "Works until the types don't. `as` must retype every prop to the target element via conditional types; the inferred props collapse and the errors are unreadable." Show the signature sketch only, with a note that the *implementation* is the seven-layer TS gymnastics the course rejects. Do **not** build it.
- **Wrapper nesting** (`<a><Button/></a>` or `<Button><a/></Button>` naively): "Produces invalid interactive HTML — an `<a>` wrapping a `<button>` (or vice versa) nests two interactive elements. Browsers and screen readers choke." Tie to semantic-HTML knowledge from earlier units.

Land the senior reframe explicitly: all three fail because they make the *component* responsible for the element. The composition move — the same instinct from L2 — is to **let the consumer bring the element and have the component merge its behavior and classes onto it.** That is `asChild`. Transition straight into the next section's solution.

This section is the payoff of the L1 discriminated-union debt and the L2 `cloneElement`/`Children.map` seam ("prop-injection done with a typed contract"). Name both call-backs in one sentence each so the student feels the through-line close.

## Slot: merging props onto the consumer's element

**Goal:** teach what `Slot` does, as a contract, then show the consumer surface.

Introduce `Slot` as "a component that takes exactly one child and merges its own props onto that child." Black-box framing first: `<Slot className="btn" onClick={f}><X/></Slot>` renders `<X className="btn" onClick={f}/>`. Install line: `npm i @radix-ui/react-slot`.

**Important currency note for the writer (verified June 2026):** modern shadcn imports `Slot` from the unified `radix-ui` package as `import { Slot } from 'radix-ui'` and uses `Slot.Root`. The standalone `@radix-ui/react-slot` package still exists and `import { Slot } from '@radix-ui/react-slot'` still works. Teach the **standalone import** (`@radix-ui/react-slot`) as the primary form — it matches the chapter outline, the L1/L2 continuity, and is the form most repos and the Radix docs still show — but add a one-sentence Aside: "Newer shadcn pulls `Slot` from the consolidated `radix-ui` package (`import { Slot } from 'radix-ui'`, used as `Slot.Root`); same component, newer packaging." This prevents the student from being confused when they open a fresh shadcn file in Ch 027. Do not make the lesson's running code depend on `Slot.Root`.

**Diagram — Slot prop merge (Figure + `ArrowDiagram` or HTML/CSS).** Pedagogical goal: make the invisible merge concrete by showing the three prop kinds and their merge rule, side by side. Left box "Slot (parent props)": `className="...button classes..."`, `onClick={parentHandler}`, `ref`. Right box "child `<Link>`": `className="text-blue-600"`, `onClick={childHandler}`, `href="/x"`. Center/output box "rendered `<a>`": `className="...button classes... text-blue-600"` (concatenated), `onClick` = both fire (composed, child wins precedence), `ref` forwarded to the `<a>`, `href` passes through untouched. Annotate each row with its merge rule: **className → concatenated**, **handlers → composed**, **ref → forwarded**, **other props → child's own pass through**. This is the single most clarifying visual in the lesson — it answers "what actually happens to my props" in one glance.

Keep the merge rules at recognition depth in prose; the diagram carries the detail. Explicitly defer the ref mechanics: "Slot also forwards the parent ref onto the child — L4 covers refs as props; here, just know it works end-to-end."

## Wiring asChild into the Button

**Goal:** the author-side implementation — the 3-line branch every shadcn primitive uses.

Show the canonical branch with **`AnnotatedCode`** on the *whole updated Button*:
1. `{...}` the props line — `ComponentProps<'button'> & VariantProps<...> & { asChild?: boolean; leftIcon?: ReactNode }`, destructured `({ asChild = false, variant, size, className, leftIcon, ...rest })`.
2. `const Comp = asChild ? Slot : 'button'` — the polymorphic switch. One line. Tint green. Explain: when `asChild`, render `Slot` (which delegates to the child); otherwise render a real `<button>`.
3. `className={cn(buttonVariants({ variant, size }), className)}` — the merge, **className last** so the caller wins (the L1 `...rest`-ordering rule and the Ch 018 `cn` contract cashing in together). Tint orange.
4. `{...rest}` spread and `ref` (ref-as-prop, wired but not dwelt on — point at L4) on `<Comp>`.
5. (optional) `data-slot="button"` — note in one sentence that current shadcn stamps a `data-slot` attribute for styling hooks (Ch 018 `data-*` variants); not load-bearing here.

Then show the **consumer** result with a short **`Code`** block: `<Button asChild><Link href="/dashboard">Open</Link></Button>` and, as a comment or adjacent prose, the rendered DOM `<a class="...button classes..." href="/dashboard">Open</a>`. Make the "the `<button>` element is *gone*, an `<a>` rendered with the button's classes" outcome explicit.

**Convention divergence to flag for the writer:** current shadcn folds className into the cva call — `cn(buttonVariants({ variant, size, className }))`. This lesson deliberately teaches the **separate-argument** form `cn(buttonVariants({ variant, size }), className)` because it keeps the L1 "merge `className` last" rule *visible* in the call — the override is a distinct, legible argument. Add one sentence noting shadcn's folded form as equivalent so the student recognizes it in Ch 027. This is an intentional pedagogical staging, documented so downstream agents don't "fix" it.

Fold in the two author-side watch-outs here, inline:
- `Slot` expects **one** child element — a fragment or two children throws. (Name `Slot.Slottable` in a half-sentence as the escape for multi-child cases; recognition only.)
- When `asChild` is true the component's own `<button>` (and its default `type`, `data-slot`) does **not** render — the child element owns its semantics.

## tailwind-merge and the variant collision

**Goal:** close the loop on *why* `cn` (not bare string concat) is mandatory once a caller can override variant classes.

Concrete case: `buttonVariants` emits `bg-primary`; the caller writes `<Button variant="primary" className="bg-destructive">`. With plain concatenation both `bg-primary bg-destructive` ship and the winner depends on CSS source order — brittle. `cn` (= `twMerge(clsx(...))`, from Ch 018 L3) resolves the conflict: the caller's `bg-destructive` wins and `bg-primary` is dropped from the string. Show with a tiny **`CodeVariants`** A/B: "Bare concat — both classes ship, cascade decides" vs. "`cn` — caller wins deterministically", using `ins`/`del`-style marks or two short result strings.

Keep this tight — Ch 018 L3 owns `tailwind-merge` internals; this is the *application* of that rule to the variant table, which is new context. One **`Term`**/tooltip on `tailwind-merge` ("Resolves conflicting Tailwind utilities, last-wins by class — drops `bg-primary` when `bg-destructive` follows").

## Match the element to the behavior, not the look

**Goal:** the accessibility guardrail that prevents the #1 real-world `asChild` misuse. Senior rule, its own section.

State the rule up front: **use `asChild` to vary the element to match the *semantics* of the behavior — never to fake one element as another.** Two contrasting consequences, concrete:
- `<Button asChild><a href="/x">…</a></Button>` → an anchor that *looks* like a button but *is* a link: Cmd/middle-click open it, it appears in the new-tab menu, screen readers announce "link." Correct when the action is navigation.
- A `<button onClick={() => router.push('/x')}>` styled to look like a link → *is* a button: no Cmd-click, no new-tab, screen readers announce "button," keyboard users can't open it in a tab. A real accessibility regression.

Then the inverse misuse to forbid: don't reach for `asChild` to swap *kinds* (button→`<div>`) just to dodge default styles — that strips semantics and keyboard behavior. The element choice must follow behavior: action → `<button>`, navigation → `<a>`/`<Link>`.

Small **`MultipleChoice`** (or `TrueFalse` round) checkpoint here: give 3-4 scenarios ("a card that navigates to a detail page", "a toolbar action that deletes a row", "a 'learn more' that goes to a docs page") and ask which element the component should render. Grades the behavior→element instinct directly. This is the highest-value comprehension check in the lesson because the mistake is invisible until a keyboard/AT user hits it.

## Why not a generic `as` prop

**Goal:** explicitly seal the rejected alternative so the student can defend the choice (and recognize it in other libraries).

Brief, decision-focused. Name the libraries that ship `as` (Chakra, Mantine, MUI's `component`) so the student recognizes it in the wild. The senior cut, stated as a contrast table or tight prose:
- **`as` prop:** component owns the polymorphism; types via conditional generics; inferred child props degrade; unreadable errors; one extra typed surface to maintain.
- **`asChild` + `Slot`:** consumer owns the element (it's just their own JSX, fully typed by *its* own props); component contributes classes + behavior; types stay clean because nothing is retyped.

One line connecting to the through-line: this is the same "compose, don't configure" call the chapter has made since L2 — here applied to the *element* axis. Optionally a 2-row **`TabbedContent`** or a small comparison block; prose is sufficient. Do not re-show the `as` implementation.

## The canonical Button (consolidation)

**Goal:** the single artifact the student takes to Ch 027. Everything assembled, once, clean.

Full final `button.tsx` in a single **`Code`** block (or **`AnnotatedCode`** if a final guided pass helps): imports (`cva`, `VariantProps`, `Slot`, `cn` from `@/lib/utils`, `import type { ComponentProps, ReactNode } from 'react'`), the `buttonVariants` cva call, the `Button` function with `asChild`/`Comp`/`cn(...)`/`{...rest}`/`ref`/`leftIcon`. This must be the *exact* shape continuity demands — same `variant`/`size` axes from L1, same `leftIcon` from L2, now `cva`- and `Slot`-powered. Filenames **kebab-case** (`button.tsx` exports `Button`), per the L1 continuity override.

Close with one sentence: "This is the file you'll see, nearly character-for-character, behind every shadcn primitive in Ch 027 — `cva` for the variant table, `Slot`/`asChild` for the element, `cn` for the merge, `ref` as a prop." Reinforce the mental model stated in the framing.

A small **`Sequence`** or **`Tokens`** exercise could verify assembly understanding (order the steps the Button takes for a given call, or click the className-merge / Slot-switch / variant-lookup tokens) — optional; the MultipleChoice in the accessibility section is the required check. Prefer one light recall exercise here over none.

## External resources (optional)

1-2 **`ExternalResource`** cards: the CVA docs (`cva.style`) and the Radix `Slot` primitive page. Keep to the two primary sources for this lesson.

# Scope

**Prerequisites to restate concisely (do not re-teach):**
- The typed props contract, `ComponentProps<'tag'>`, variant unions, default-destructure, discriminated unions, `className`+`...rest` ordering — **L1**. Restate only as the starting point the lesson refactors.
- `children`/`ReactNode`, compound vs. prop-as-slot, the `cloneElement` seam pointed here — **L2**. One-line callbacks only.
- `cn` = `twMerge(clsx(...))`, the defaults-then-`className`-last override, `tailwind-merge` conflict resolution — **Ch 018 L3**. Use it; explain only its *application* to the variant table, not its internals.
- Semantic design tokens (`bg-primary`, `text-primary-foreground`) and the three-tier model — **Ch 019**. Use as imported vocabulary.
- Semantic-HTML / interactive-element knowledge (why `<a>` vs `<button>`) — earlier units. Assume it.

**Explicitly out of scope (defer, do not teach):**
- **Refs through `Slot`, ref-as-prop mechanics, `forwardRef`** — **L4**. Slot's ref forwarding is named as "works end-to-end," never explained.
- **The shadcn component *library* surface** (installing components, `components.json`, the CLI, the fork threshold, `data-slot` as a system) — **Ch 027**. This lesson teaches how to *write* one primitive; it does not survey the library.
- **`tailwind-merge`/`clsx` internals, Tailwind variant ordering, arbitrary values** — **Ch 018**. Owned there.
- **Compound components with shared state via context** — **Ch 025 L5**. The Card carve-out (no `asChild`) was settled in L2; do not revisit.
- **CSS-in-JS (styled-components, Emotion)** — out of scope; Tailwind-only project.
- **Polymorphic generic-`as` typing with conditional types** — named once and rejected; never implemented.
- **The project payoff** (CVA card variants, the polymorphic button in a real surface) — **Ch 028 L8**. This lesson ships the primitive, not its application.
- **Render model / re-render implications of the variant switch** — **Ch 023**. Treat the component as a pure function of props; no re-render language.

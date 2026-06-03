# Lesson 1 — The typed props contract

- **Title (h1):** The typed props contract
- **Sidebar label:** The typed props contract

---

## Lesson framing

This is the first lesson in the course where the student stops writing styled *elements* (Chapters 017–021) and writes a reusable *component* — a function that takes props and returns JSX.
Everything before this point styled tags the student owned at the call site; from here on they author the thing other code calls.
The lesson installs the **shape a 2026 senior reaches for**: an arrow function bound to `const`, props destructured in the parameter with a `type Props`, defaults at the destructure, a deliberate API surface (variant unions over boolean piles), and the `ComponentProps<'tag'>` + `className`-plus-`...rest` discipline that every shadcn component in Chapter 027 is built on.

**Single spine.** Build one canonical `<Button>` across the whole lesson and refactor it forward at each step. The student should feel each move as a fix to a smell they just saw, not as a feature checklist. The closing `<Button>` is the exact template Lesson 3 layers `cva` + `Slot` onto — leave that seam visible but unbuilt.

**The render model is off-limits.** This chapter (per chapter framing) treats components as pure functions of props; *when and why a component re-runs* is Chapter 023. Do not mention re-rendering, memoization, `useMemo`, state, or hooks. If a student wonders "what happens when the prop changes," the honest answer here is "the function runs again with new props — Chapter 023 makes that precise." Name that forward-reference once, in passing, and move on.

**Lead with decisions.** Per the pedagogical pillars, every move is framed as a senior judgment call: *why a variant union beats three booleans*, *why `ComponentProps` beats hand-typing handlers*, *why `className` stays open*. Code samples illustrate the decision; they are not the point.

**What the student leaves able to do.** Write a typed, reusable component that (1) accepts every native attribute of the element it wraps, (2) exposes a small variant-union API, (3) defaults sensibly, (4) merges a caller `className` last, and (5) knows when to reach for a discriminated union or a generic. They should also *recognize* the patterns the course rejects (`any` props, boolean piles, `forwardRef`, `PropTypes`) without being able to confuse them for the default.

**Mental model to land.** A React component is a typed function from props to JSX. Its props are a *contract* — TypeScript is the enforcement, the variant union is the vocabulary, `ComponentProps` is the inheritance, `className` + `...rest` is the escape hatch that keeps the component reusable instead of a walled garden.

**Cognitive-load staging.** Strictly additive. Each section adds exactly one concept to the running `<Button>`:
function+inline-type → named `type Props` → defaults → variant union (the payoff moment) → `...rest` + `ComponentProps` → wrapper-typing family → `className` discipline → discriminated union (a different component, briefly) → generics (light, a `<List>`, briefly) → file conventions. Watch-outs live in the section that teaches the concept they qualify, never bundled at the end.

---

## Lesson sections

### Introduction (no heading)

Open with the senior question made concrete, not abstractly. Show two call sites of the *same* button side by side and let the reader feel which one they'd rather maintain:

```tsx
<Button isPrimary isLarge withIcon iconName="save" iconPosition="left" loading={false}>Save</Button>
<Button variant="primary" size="lg">Save</Button>
```

Name the first a "coffin" — every prop is a boolean or a stringly-typed flag, the combinations don't constrain each other (`isPrimary` + `isSecondary` both `true`?), and the list grows with every design tweak.
State the lesson's job: install the form a senior writes a React component in 2026, and the four disciplines that keep it small (typed contract, variant unions, native-attribute inheritance, open `className`).
Connect to what they know: they can already write JSX (Ch 017), type unions and discriminated unions (Unit 1), and merge classes with `cn()` (Ch 018.3) — this lesson is where those three meet on a function boundary.
Preview the deliverable: by the end they'll have written the canonical `<Button>` that the rest of the chapter extends.
Keep it warm and brief (pedagogical §3).

Use a `<CodeVariants>` here with two tabs ("Coffin" / "Contract") rather than two loose blocks, so the A/B contrast is the first thing the reader interacts with. First sentence of each tab carries the framing ("every prop independent, nothing constrains anything" vs. "two named axes, mutually exclusive options").

### A component is a typed function of props

Teach the base shape before any sophistication. A React component is a function from props to JSX; the 2026 form is an arrow function bound to `const`, PascalCase name, props destructured in the parameter, return type inferred.

Start at the absolute simplest — a component with one prop, typed inline:

```tsx
const Greeting = ({ name }: { name: string }) => <p>Hello, {name}</p>;
```

Then introduce the named-`type` form as the form they'll actually write, and state the convention plainly: **`type Props` for component props, not `interface`** (cross-ref Ch 004.2 where they met the type-vs-interface call; the rule here is the same one Code Conventions encodes — `type` by default, `interface` only for declaration merging). Note PascalCase is load-bearing, not style: a lowercase component name makes React treat the tag as a literal DOM element and silently drop the props (this is the "PascalCase or React ignores props" watch-out — teach it *here*, where the naming rule is introduced, with a one-line concrete consequence).

Use `<AnnotatedCode>` on a small two-prop component to direct attention across three things in one block: the `const` + arrow binding, the destructured parameter, the inline-vs-named `type Props`. Three steps, `color="blue"`. Keep the example domain-real (a `<Badge label tone>` or similar), not `foo`.

Watch-out folded in: don't annotate the return type — inference handles `JSX.Element` and annotating it is noise (ties to Code Conventions "infer the inside"). One sentence.

**Tooltip candidates here:** `JSX.Element` (Term: "the type a component returns — a single rendered React element; you almost never write it, inference supplies it").

### Typing props: strings, unions, and function signatures

Now the contract's vocabulary. Walk the primitives a props type is built from, fast, because the student already knows TS types — this is application, not instruction:

- strings / numbers / booleans
- **unions of string literals for finite domains** (`variant: 'primary' | 'secondary' | 'destructive'`) — flag this as the workhorse and the thing the next section pays off
- optional props with `?`
- **function props typed by their signature** — `onClick: (event: MouseEvent<HTMLButtonElement>) => void`. This is the one genuinely new piece: the typed event parameter. Show where `MouseEvent` (the React synthetic-event type, imported from `react`, not the DOM global) comes from and why the generic argument (`HTMLButtonElement`) matters — it types `event.currentTarget`.

Use `<CodeTooltips>` on a single `type Props` block that contains all four shapes, with tooltips on: `MouseEvent` ("React's synthetic event type — not the DOM `MouseEvent` global; import from `react`"), `?` ("optional prop — the value may be `undefined`"), and the union ("a finite set of allowed strings; TS rejects any other value"). This keeps definitions inline without breaking the read.

Watch-out folded in: **never type a prop `any`** — reach for the specific shape, or `unknown` and narrow at the boundary (cross-ref Ch 004.6 "narrow, don't assert"). One sentence; it's a reflex they already have from Unit 1, just restated on the props surface.

### Defaults belong at the destructure

Short, sharp section — one idea. Default values go in the parameter destructure: `({ variant = 'primary', size = 'md' }: Props)`. State the two things a senior knows here:

1. `defaultProps` is **gone** for function components (removed in React 19) — name it once for recognition, don't dwell.
2. Defaulting at the destructure beats a falsy check in the body (`const v = variant || 'primary'`) because the falsy check mis-fires on legitimate falsy values and scatters the default away from the signature. Tie back to Ch 002.5 (the `??` vs `||` `0`/`''` trap) — the same trap, now on props.

A `Code` block (simple, no annotation needed) showing the destructure-with-defaults form is enough. Reinforce that defaults fire only on `undefined` (Code Conventions / Ch 002.2), so passing `size={undefined}` still gets the default but `size=""` would not — relevant once `size` is a union and `''` isn't a member anyway, which is itself an argument for the union.

### From boolean piles to a variant union

This is the conceptual payoff of the lesson's first half — give it room. Take the coffin's `isPrimary` / `isDestructive` / `isGhost` and collapse them into one `variant: 'primary' | 'destructive' | 'ghost'`. Spell out *why* this is strictly better, as senior reasoning:

- **Mutually exclusive by construction.** Three booleans encode 2³ = 8 states, most nonsensical (`isPrimary && isGhost`). The union encodes exactly 3. Unrepresentable states are unrepresentable (cross-ref Ch 005.1 — this is that principle on a props boundary).
- **Exhaustive.** A `switch`/lookup over the union can be checked for completeness (cross-ref Ch 005.3 exhaustiveness); adding a `'link'` variant surfaces every place that must handle it.
- **One axis, one prop.** Same logic for `size: 'sm' | 'md' | 'lg'`.

Then name the forward seam explicitly: these unions are *the source of the variant table* `cva` consumes in Lesson 3. The student is building the input CVA will later read — say so in one sentence so the chapter coheres.

**Diagram — the state-space collapse.** A small HTML+CSS figure (`<Figure>`, per diagrams INDEX: "color-coded segments" → HTML+CSS) contrasting the two encodings: left panel a grid of 8 boolean combinations with the invalid ones struck through / greyed; right panel a clean 3-chip strip (primary / destructive / ghost). Pedagogical goal: make "8 representable, 3 valid → 3 representable, 3 valid" *visible* rather than asserted. Cap height modest; horizontal layout. Caption: "Three booleans can express eight states; the variant union expresses exactly the three that are real."

**Exercise — `Buckets`.** Sort a pool of prop ideas into "variant union" vs. "stays a boolean." Goal: train the judgment, since the rule isn't "always collapse." Items for the union bucket: `variant`, `size`, `tone`, an alignment like `align: start|center|end`. Items that legitimately stay boolean (independent on/off, not mutually exclusive): `disabled`, `loading`, `fullWidth`. Instructions: "A union is for one axis with mutually-exclusive options; a boolean is for an independent on/off flag." This directly inoculates the over-correction beginners make (turning *everything* into a union, including genuinely orthogonal flags).

### Inheriting native attributes with ComponentProps

The centerpiece reach. Motivate from pain: a `<Button>` wrapping a native `<button>` should accept `disabled`, `type`, `aria-label`, `onClick`, `onFocus`, `form`, every native attribute — hand-typing each in `Props` is endless and always incomplete.

Introduce the two moves together because they're one idea:

1. `type Props = ComponentProps<'button'> & { variant?: ...; size?: ... }` — `ComponentProps<'button'>` pulls *everything* the JSX `<button>` accepts (attributes, event handlers, and in React 19 `ref` too) under one alias.
2. `({ variant, size, className, ...rest }: Props) => <button className={cn(...)} {...rest} />` — destructure the props the component *consumes*, spread the `...rest` (everything native) straight onto the element.

This is the moment to teach the `className` + `...rest` discipline mechanically, then nail the ordering watch-out, because they're causally linked:

- **Spread `{...rest}` first is wrong if it can carry `className`.** Since `ComponentProps<'button'>` *includes* `className`, you must destructure `className` out explicitly and apply your computed `cn(...)` result — otherwise `{...rest}` re-injects the raw caller `className` and clobbers your merge, or sets it twice. The senior form: pull `className` out of `...rest`, compute `cn(componentClasses, className)`, set it on the element. (Cross-ref Ch 018.3: `className` is always the *last* `cn()` argument so the caller wins. This lesson reuses that exact rule on the new `...rest` surface.)

**`<AnnotatedCode>` is the right tool** for the canonical Button-so-far — one block, attention directed across four spots:
1. the `ComponentProps<'button'> & { ... }` intersection,
2. the `className` pulled out of the destructure,
3. `cn(...)` with `className` last,
4. `{...rest}` spread onto `<button>`.
Four steps, `color="green"` on the additive parts. This block is the running `<Button>` and the reader should recognize it as "the shape."

**Disambiguation subsection content (no separate h3 unless it reads better): `ComponentProps<'button'>` vs `ButtonHTMLAttributes` vs `HTMLAttributes`.** One short paragraph + a tiny `<CodeVariants>` (three tabs) so the student who greps older code or shadcn-pre-2025 recognizes the alternatives and knows the 2026 default:
- `ComponentProps<'button'>` — the default; pulls everything including `ref`. One alias, no element-type to name.
- `ButtonHTMLAttributes<HTMLButtonElement>` — the older per-element form; works, more verbose, you name the element twice.
- `HTMLAttributes<HTMLButtonElement>` — the *base* attributes only (no button-specific ones like `type`/`disabled`); a common subtle bug when someone reaches for it expecting button props.
First sentence of each tab states the verdict. Keep prose ≤6 lines per tab (component constraint).

**Tooltip candidates:** `ComponentProps` (Term: "a React utility type — `ComponentProps<'button'>` is every prop the JSX `<button>` accepts; `ComponentProps<typeof X>` is every prop component `X` accepts"), `...rest` (Term: "rest destructuring — gathers every prop you didn't name into one object you can spread").

**Exercise — `ReactCoding` (tests mode, `hidePreview`).** Give the student a `<Button>` that hand-types only `onClick` and `variant`, and a failing test that passes `disabled` and `type="submit"` through. Task: retype props with `ComponentProps<'button'>` and spread `...rest` so native attributes reach the DOM `<button>`. Tests assert: the rendered button has `disabled` true and `type` `submit` when those props are passed, *and* that a caller `className="w-full"` survives onto the element (catching the clobber bug). Instructions: "Make the button forward every native attribute and let a caller className through." This is the single most important muscle of the lesson, so it earns a coding exercise, not a quiz item.

### Typing wrappers and component references

Two related utility types, taught as a pair because they're duals and students conflate them. Keep it tight — this is reach-level, flagged as "you'll need this when…".

- **`ComponentProps<typeof Button>` — typing a wrapper.** A `<SubmitButton>` that wraps `<Button>` types its props as `ComponentProps<typeof Button> & { ... }`, inheriting every variant *and* native attribute the inner Button exposes — without restating them. Concrete reach: a `<ConfirmButton>` that wraps a destructive Button and adds a `confirmLabel`. Show ~6 lines.
- **`ComponentType<P>` — the dual.** Where `ComponentProps<typeof X>` extracts a component's *props*, `ComponentType<P>` is the type of *a component itself* — a function/class accepting `P`, returning JSX. Two reaches: storing components in a registry (`const widgets: Record<string, ComponentType<WidgetProps>>`) and **accepting a component as a prop** (`icon: ComponentType<{ className?: string }>`), which is how you pass an icon component (e.g. a Lucide icon) into a button without instantiating it at the call site. Name that this is used at depth much later (Ch 071 L3) — recognition now, mastery later.

**Diagram — the extraction/dual relationship.** A minimal `<ArrowDiagram>` (or simple HTML two-box figure) showing: `Button` (a component) → `ComponentProps<typeof Button>` arrow pointing to its props object; and `WidgetProps` (a props type) → `ComponentType<WidgetProps>` arrow pointing back to a component box. Pedagogical goal: cement that one helper goes component→props and the other goes props→component, so the student stops guessing which to use. Keep it tiny. Note: if using `<ArrowDiagram>`, set `expandable={false}` per the Figure doc (leader-line constraint).

Use `<CodeVariants>` (two tabs: "Wrap a component" / "Accept a component") rather than two separate blocks, to keep the dual visible.

This section is genuinely secondary; signal that with a single sentence up top ("Two type helpers you'll reach for less often, worth recognizing now") so a time-pressed reader knows it's not the spine.

### className is the styling contract, not an option

Short principle section, but it deserves its own heading because it's a *discipline*, not a mechanic. The rule: **every component the project ships accepts an optional `className` and merges it `cn(..., className)` at the outermost element.** Never lock styling down.

Frame it as the senior reasoning: a component that doesn't accept `className` forces a fork or a wrapper-div the first time a consumer needs one different margin. Accepting `className` last (so it wins, per Ch 018.3) costs one line and keeps the component reusable across every layout. This is already half-shown in the Button — here it's *named as a rule* so the student applies it to every component, not just buttons.

One `Code` block is enough (it reuses the Button's `cn(buttonClasses, className)` line). No new exercise; the earlier `ReactCoding` test already guards the className-survives behavior — reference that.

### Discriminated unions for mutually-exclusive props

A different, sharper tool for a specific shape: when two props *must not* both be set. Canonical case: a thing that's either a link or a button — `{ href: string } | { onClick: () => void }`. Two optionals plus a runtime guard is the smell; a discriminated union makes the illegal combo a *compile* error (cross-ref Ch 005.2 states-plus-transitions / Ch 004.5 union composition — same machinery, now on props).

Show the union and demonstrate that TS rejects `<Action href="/x" onClick={fn} />` and rejects supplying neither. Be honest about the ergonomic cost: discriminated-union props need a discriminant or careful narrowing in the body, so reach for it only when the mutual exclusion is real — most props are happily independent. Name that this is the typed alternative to polymorphism *before* `asChild`/`Slot` enter in Lesson 3 (which solves the button-vs-link case differently, by composition). One forward sentence.

**Exercise — `TypeCoding`.** Best fit: this is a *type* lesson, no runtime needed. Give a `type Props` written as two optionals (`href?`, `onClick?`) and a body that mis-narrows; task: rewrite as a discriminated union so the should-fail call sites error. Use the `// @ts-expect-error` idiom (per TypeCoding doc) on a line that passes *both* `href` and `onClick`, so the student's job stays "make the red go away" — when their union is correct, that line correctly errors and the directive is satisfied. Optionally an `expectedQueries` `^?` to confirm the narrowed branch type. Instructions: "Rewrite `Props` so passing both `href` and `onClick` — or neither — is a type error."

**Watch-out folded in:** the `onClick`-and-`href`-on-one-`<Button>` anti-pattern (from chapter framing) lives here — it's the exact shape the discriminated union fixes. State it as "don't ship both on one flat API; model the exclusion or pick one."

### Generic components, lightly

Last technical section, explicitly scoped as "you'll write this rarely, recognize it always." The canonical case: a data-driven `<List>` that takes `items: Item[]` and `render: (item: Item) => ReactNode` and works for *any* item type.

The one piece of genuinely new syntax: the type parameter in a `.tsx` file needs a trailing comma — `<Item,>(props: ListProps<Item>) => ...` — because bare `<Item>` parses as a JSX tag. Teach exactly that gotcha and why; it's the thing that trips people who know TS generics but not in TSX. (Cross-ref Ch 005.7 generics-with-constraints; reuse the `<T extends ...>` instinct.)

Show the `<List>` and one call site that infers `Item` from the `items` array, so the payoff (full type-safety in `render` with zero annotation at the call site) is visible.

`<CodeTooltips>` on the generic block: tooltip on `<Item,>` ("the trailing comma disambiguates a type parameter from a JSX tag in `.tsx` files"), `ReactNode` ("anything React can render — JSX, strings, numbers, arrays, null; the wide return type, taught in depth next lesson"). Keep `ReactNode` shallow here — Lesson 2 owns it; just enough to read the signature.

Keep this section short. It's a recognition target and a "the type system can do this" confidence builder, not a generics tutorial.

### One component per file (and the one exception)

Close on file conventions — concrete and brief, so the student knows where this lives. Rules:

- One component per file by default; filename **kebab-cased**, matching the export (`button.tsx` exports `Button`) — per Code Conventions naming. (Note for the writer: chapter framing says `Button.tsx`, but the course's Code Conventions mandate kebab-case filenames — `button.tsx`. Follow Code Conventions; this is a deliberate divergence from the framing's casual phrasing. Flag nothing to the student; just write `button.tsx`.)
- Internal sub-components used by only this file live in the same file.
- **The exception:** tightly-coupled compound sets ship as one file exporting the surface — `<Card>`, `<CardHeader>`, `<CardContent>`, `<CardFooter>` from `card.tsx`. Name this as the canonical shadcn pattern and hand it forward to Lesson 2, which teaches *how* compound components work. Recognition only here.

A small `<FileTree>` (per diagrams INDEX: file listings → `<FileTree>`) showing `components/ui/button.tsx` and `components/ui/card.tsx` side by side — the default (one component) and the exception (a compound set in one file). No prose-heavy treatment; the tree carries it.

### Recognize the patterns the course leaves behind (no heading — fold into closing or a single `Aside`)

Not a content section — handle as a compact closing `Aside` (caution/note) so it doesn't become a watch-out dumping ground. Name, each in one clause, the things the student will see in old code and should *recognize but not write*:
- `forwardRef` — the old way to accept a ref; React 19 makes `ref` a regular prop (Lesson 4). One line.
- `PropTypes` — runtime prop validation, retired; **TypeScript is the contract** now.
- HOCs (higher-order components) — a wrapping pattern hooks and composition retired; named once, no airtime.
- class components — out of scope for the whole course; function components only.

Then close the lesson by pointing forward: the `<Button>` they built is the literal foundation Lesson 2 (children/composition) and Lesson 3 (`Slot` + `cva`) extend. End on the mental model one more time: a component is a typed function of props; the contract is the design.

**External resources (optional `ExternalResource` cards):** React docs "Passing Props to a Component" and "TypeScript with React Components" (react.dev), and the TS handbook on utility types if a clean anchor exists. Keep to 2–3.

---

## Scope

**This lesson covers:** the component-as-typed-function shape; `type Props` (over `interface`) with primitives, string-literal unions, optional props, and signature-typed function props; defaults at the destructure; the variant-union-over-booleans refactor; `ComponentProps<'tag'>` for native-attribute inheritance and the `className` + `...rest` discipline; `ComponentProps<typeof X>` (wrapper typing) and `ComponentType<P>` (component-reference typing); `className` as an always-open styling contract; discriminated-union props for mutual exclusion; light generic components and the `<Item,>` TSX comma; one-component-per-file conventions and the compound-file exception.

**Explicitly out of scope — do not teach (redefine prerequisites in one clause max, no more):**

- **The render model** — when/why a component re-runs, render triggers, `Object.is` on props, memoization, the React Compiler. Chapter 023. *Do not mention re-rendering at all* except the single forward-reference noted in the framing.
- **State and hooks** — `useState`, `useEffect`, any hook. Chapters 024–025. Components here are pure functions of props; no state.
- **`children` and `ReactNode` at depth** — Lesson 2 owns them. This lesson may *name* `ReactNode` shallowly only where a generic `render` prop's return type needs it (the `<List>`); do not teach `children`, compound-component internals, render props, or the `0`-falsy trap.
- **Polymorphism via `asChild` / Radix `Slot`** — Lesson 3. The discriminated-union and `ComponentProps<typeof X>` sections may *gesture* that Lesson 3 solves the button-vs-link case by composition, but must not teach `Slot` or `asChild`.
- **`class-variance-authority` (`cva`, `VariantProps`, `compoundVariants`)** — Lesson 3. This lesson builds the variant *union* that `cva` will later consume and may say so in one sentence; it does **not** build a variant table.
- **Refs as props** — Lesson 4 owns the ref-as-prop model, `Ref<T>`, ref callbacks. This lesson may note that `ComponentProps<'button'>` *includes* `ref` in React 19 (one clause, as evidence the alias is complete) but must not teach how to wire or forward a ref.
- **`cn()` / `clsx` / `tailwind-merge` internals** — Chapter 018.3 owns them; the student already has `cn()`. Reuse it as a known tool (import from `@/lib/utils` per Code Conventions); do not re-teach the merge or the `className`-last rule's mechanics beyond a one-line callback.
- **Tailwind variant ordering, arbitrary values, dark mode** — Chapter 018 owns them. Class strings in examples should be plausible but the lesson is about the *props boundary*, not the classes.
- **Generic type machinery at depth** — conditional types, mapped types, variance. Unit 1 (Ch 005.6–005.7) owns generics; this lesson does the *minimum* generic-component syntax only.
- **Class components, HOCs, `PropTypes`, `forwardRef`** — recognition-only, one clause each in the closing `Aside`. No teaching.

---

## Code conventions notes for downstream agents

Skimmed the relevant Code Conventions sections; align the lesson's code with these (diverging only where pedagogy demands, flagged inline above):

- **Components & JSX:** typed props as the function parameter, no `any`; `ComponentProps<'button'>` for native props; `children: ReactNode` (not used here, but if referenced, that's the type); default-destructure at the parameter; `cn()` with `className` **last**; refs are a regular prop typed `Ref<T>` (not taught here — Lesson 4 — but never show `forwardRef` as current).
- **Function form:** arrow functions bound to `const` for components — the default. Named exports everywhere (components are not framework-named files, so no default export). Two positional params max (not a factor for single-props components).
- **TypeScript:** `type` over `interface` for props; discriminated unions over flag booleans (the lesson teaches exactly this); annotate exported boundaries, infer the inside (so: no return-type annotation on components); never `any`; `<T extends ...>` for constrained generics if the `<List>` example adds a constraint.
- **Naming:** components and types PascalCase; **filenames kebab-case** (`button.tsx`, not `Button.tsx` — overrides the chapter framing's casual `Button.tsx`); booleans read as predicates (`disabled`, `fullWidth`, `isLoading`), negated booleans forbidden (so `disabled`, never `notEnabled`).
- **Imports:** `cn` from `@/lib/utils` (shadcn convention per Code Conventions, not the `@/lib/cn` phrasing in the Ch 018 outline — use `@/lib/utils`). React type imports (`ComponentProps`, `ComponentType`, `MouseEvent`, `ReactNode`) via `import type` from `'react'` (`verbatimModuleSyntax`).
- Lesson MDX display: strip imports/boilerplate per Pedagogical guidelines §4 where it aids focus; mark added lines with EC `ins=` in the before/after refactors.

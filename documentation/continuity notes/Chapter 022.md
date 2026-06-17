# Chapter 022 — Components and composition

## Lesson 1 — The typed props contract

**Taught:** the React component as a typed arrow function of props (`type Props`, PascalCase, destructured params, inferred return) with `ComponentProps<'tag'>` for native-attribute inheritance, the variant-union-over-booleans refactor, defaults at the destructure, the `className`+`...rest` discipline, discriminated-union props, `ComponentProps<typeof X>`/`ComponentType<P>`, light generic components, and one-component-per-file conventions.

**Cut:** none of substance — the lesson covered the full chapter-outline scope. The `key`/`ref`-not-in-`Props` watch-outs from the outline were dropped (key→Ch 023, ref→L4); `ref` is mentioned only as evidence `ComponentProps<'button'>` includes it.

**Debts:**
- `buttonClasses({ variant, size })` is a deliberate stand-in; **L3 builds it as `cva`** (the variant unions defined here are its source table). Left visible but unbuilt — L3 must layer `cva` + `Slot` onto this exact `<Button>`.
- The render model ("the function runs again with new props") forward-referenced once to **Ch 023**; no re-render/memo/hook language used.
- `ReactNode` named shallowly (generic `<List>` render prop only); **L2 owns it** at depth, plus `children`.
- Discriminated-union button-vs-link is the *typed* answer; **L3 solves it by composition (`asChild`/`Slot`)** — seam named.
- `ComponentType<P>` mastery deferred to **Ch 071 L3**.
- Compound-file exception (`card.tsx` exporting Card family) named as recognition; **L2 teaches how compound components compose.**
- `forwardRef` named legacy; **L4 owns ref-as-prop.**

**Terminology:** "coffin vs contract" (boolean-pile API vs small named surface); "make-illegal-states-unrepresentable" applied to props; "one axis, one prop"; "pull `className` out, merge it last, spread the remainder" as the `...rest` ordering rule; `<Item,>`/`<Item extends ...>` TSX-vs-JSX disambiguation; `JSX.Element` (inferred return), React synthetic `MouseEvent<HTMLButtonElement>` imported from `react`.

**Patterns and best practices (for project chapters):**
- `type Props` (never `interface`); no return-type annotation; never `any` on a prop.
- `ComponentProps<'tag'>` for wrapped-element props — never `ButtonHTMLAttributes`/`HTMLAttributes` (latter silently omits `type`/`disabled`).
- Defaults at the destructure, never `||` falsy checks; `defaultProps` is gone in React 19.
- Every shipped component accepts optional `className` and merges `cn(componentClasses, className)` (caller last) at its outermost element.
- Variant unions for mutually-exclusive axes; booleans only for independent flags (`disabled`, `loading`, `fullWidth`).
- Filenames **kebab-case** (`button.tsx` exports `Button`) — deliberate override of the chapter-framing's `Button.tsx`. One component per file; compound sets are the one exception.
- `cn` imported from `@/lib/utils`; React type imports via `import type`.

**Misc.:** The running `<Button>` (`ComponentProps<'button'>` + `variant`/`size` + `cn(buttonClasses(...), className)` + `{...rest}`) is the canonical spine the whole chapter extends — keep it identical in L2–L4. Recognize-don't-write list closed the lesson: `forwardRef`, `PropTypes`, HOCs, class components.

## Lesson 2 — Children and compound components

**Taught:** `children: ReactNode` as the universal content slot (destructured like any prop, placed via `{children}`); `ReactNode` (wide, renderable) vs `ReactElement` (narrow, single element — recognition only); the shadcn compound-component family (`Card` › `CardHeader` › [`CardTitle`, `CardDescription`, `CardAction`], `CardContent`, `CardFooter`) as coordinated thin wrappers in one file; prop-as-slot for single named regions (`Button leftIcon={...}`); the decision rule (0/1 region → prop/`children`, 2+ → compound, freedoms override); conditional-render reflexes (`&&`/ternary) and the `0`-falsy trap; fragments (`<>` shorthand + keyed `<Fragment>`); render props as recognition-only; composition as the first answer to prop drilling (preview).

**Cut:** outline's `<Section>` alternate wrapper example folded into the single `<Card>` spine; `rightIcon` on Button dropped (only `leftIcon` shown). No substantive scope loss.

**Debts:**
- `buttonClasses({ variant, size })` still the unbuilt stand-in — **L3 builds it as `cva`** (Button got `leftIcon?: ReactNode` added here; L3 must not refactor variant handling).
- `Card` container is a plain `<div>`, intentionally **no `asChild`** — it is the carve-out that cannot be retargeted; **L3 owns `asChild`/`Slot` polymorphism.** `cloneElement`/`Children.map` prop-injection explicitly pointed at L3's `asChild`, not taught.
- *Why* lists need `key` (and keyed fragments) forward-referenced to **Ch 023 L2**; only syntactic facts stated, no reconciliation/re-render language.
- Render props named as recognition-only; their modern replacement is **custom hooks (Ch 026)**.
- Prop-drilling preview defers the four homes for state to **Ch 024 L3/L4** and Context to **Ch 025 L5** ("prop drilling is not automatically a Context bug; try composition first").
- Context-coupled compound components (shared state between Card parts) named as a real-but-later pattern (**Ch 025 L5**); deliberately NOT added — Card parts are styling-only.

**Terminology:** "composition over configuration"; "the prop list is the smell" / "config blob"; compound parts as a "family" of thin wrappers; "prop-as-slot" (named single `ReactNode` region); the load-bearing rule "**zero or one named region → prop-as-slot (or `children`); two or more → compound**" with the reorder/omit/restyle corollary; the "`0`-falsy trap" (bare number/string on left of `&&` renders); "fragment" / `<>` shorthand; "render prop"; "siblings at the call site" (composition framing for drilling).

**Patterns and best practices (for project chapters):**
- `children: ReactNode` always — never `JSX.Element`/`ReactElement` for children.
- Left side of `&&` in JSX must be a real boolean: `count > 0 &&`, `Boolean(x) &&`, `x != null &&` — never a bare number/string.
- Compound family ships in one file, exported as a set (the sanctioned one-component-per-file exception); each part owns its region's classes, forwards `className` via `cn()` and `...rest`. `children` rides in `...rest` onto the wrapped element unless deliberately placed.
- Semantic elements live in the subcomponent (`CardTitle` renders `<h3>`, not a styled `<div>`).
- A new region = a new exported subcomponent, never a new prop on the container.
- No compile-time enforcement that compound parts nest correctly — document the family; do not add Context for styling-only families (over-engineering).
- Use `<Fragment key={...}>` only for mapped list items; `<>` everywhere else; never `key` on a non-list fragment.

**Misc.:** Use the **verified 2026 shadcn `Card` anatomy including `CardAction`** (top-right header slot) — do not ship a stale 5-part family. The `<Card>` family and `<Button>` (now with `leftIcon`) remain the continuous spine for L3/L4. The `0`-trap assessment shipped as the outline's `MultipleChoice` fallback (not `PredictOutput`); the Card-family build is a tests-graded `ReactCoding` (wire `cn()` merge + `...rest` on stubbed `CardHeader`/`CardFooter`). All sample code is fully built — no unbuilt authoring TODOs.

## Lesson 3 — Polymorphism with Slot and CVA

**Taught:** `cva` as the variant table (base string + `variants` object keyed by prop name + `defaultVariants`) that *is* the L1 `buttonClasses` stub, returning a class-string function called as `buttonVariants({ variant, size })`; `VariantProps<typeof buttonVariants>` deriving the prop types from the table (one source of truth); the `asChild`/`Slot` polymorphism pattern (`const Comp = asChild ? Slot : 'button'`) with the three rejected alternatives (duplicate component, generic `as` prop, invalid `<a><button>` nesting); Radix `Slot` merge rules (className concatenated, handlers composed, ref forwarded, rest passes through); `cn(buttonVariants(...), className)` with caller's `className` last so `tailwind-merge` resolves variant collisions deterministically; the accessibility rule "match the element to the behavior, not the look." Ships the final canonical `button.tsx`.

**Cut:** `compoundVariants` dropped to a one-line ExternalResource mention (outline had it as a topic) — the rare combination-specific-tweak escape valve; later lessons should not assume it was taught. `data-slot` attribute (outline floated it as optional) omitted — deferred to Ch 027 as a system.

**Debts:**
- **Refs through `Slot` / ref-as-prop** named as "just works end-to-end," pointed at **L4** twice; never explained here.
- `Slot.Slottable` (multi-child `asChild`) named as recognition-only for the day it's needed.
- The **shadcn library surface** (CLI, `components.json`, `data-slot` system, fork threshold) deferred to **Ch 027**; this lesson teaches writing one primitive, not the library.
- The **project payoff** (cva card variants, polymorphic button in a real surface) deferred to **Ch 028 L8**.
- `tailwind-merge`/`clsx` internals owned by **Ch 018 L3** — only their *application* to the variant table is new here.

**Terminology:** `cva` = class-variance-authority, export named `buttonVariants` (shadcn convention, maps onto L1's `buttonClasses`); "variant table" / "lookup, then concat" mental model for `cva`; `VariantProps` "derives, not written"; `asChild` / `Slot` (the "consumer brings the element, component contributes classes + behavior" framing); "compose, don't configure, applied to the *element* axis"; the `null` "explicitly unset" branch in `VariantProps` that `defaultVariants` resolves; `Comp` (capitalized polymorphic-switch variable, required for JSX to treat it as a component).

**Patterns and best practices (for project chapters):**
- Every variant component uses `cva` for its class table + `VariantProps<typeof xVariants>` for its variant prop types — never hand-write the variant unions alongside the table.
- Polymorphism via `asChild`/`Slot` only — never a generic `as`/`component` prop.
- This lesson teaches `cn(buttonVariants({ variant, size }), className)` (className as **separate last argument**) deliberately, to keep "caller wins, last" visible; **shadcn folds it into the cva call** (`cn(buttonVariants({ variant, size, className }))`) — equivalent, recognize both. Project codebase may use either but the separate-arg form is the taught discipline.
- Teach the **standalone import** `import { Slot } from '@radix-ui/react-slot'`; newer shadcn uses `import { Slot } from 'radix-ui'` as `<Slot.Root>` — same component, recognize it.
- `asChild` defaults to `false`; `Slot` requires exactly one child element (fragment/siblings throw); when `asChild` is true the component's own element and its defaults (`type`, etc.) do not render — child owns its semantics.
- Accessibility rule is load-bearing: action → `<button>`, navigation → `<a>`/`<Link>`; never use `asChild` to make one element impersonate another or to swap to a `<div>` to dodge styles/behavior.

**Misc.:** The canonical `button.tsx` here is the **final** form of the running `<Button>` — `cva` + `VariantProps` + `Slot`/`asChild` + `cn` merge + `...rest` + `leftIcon` + ref-as-prop. Stated repeatedly as "nearly character-for-character behind every shadcn primitive in Ch 027"; Ch 027/028 must keep this shape. Three variants shipped (`primary`/`destructive`/`ghost`) and three sizes (`sm`/`md`/`lg`) — the chapter-outline's fourth `outline` variant was used only as a hypothetical "add a variant" example, never built. Uses Ch 019 semantic tokens (`bg-primary`, `text-primary-foreground`, `hover:bg-primary/90`, `bg-destructive`, `text-destructive-foreground`, `bg-accent`, `text-accent-foreground`), not raw color primitives.

## Lesson 4 — Refs as a regular prop

**Taught:** React 19 ref-as-prop — a function component destructures `ref` from props and forwards it to a DOM node, no `forwardRef`; `ComponentProps<'tag'>` already carries `ref` typed against the element, so no `ref` field is hand-added; the `Ref<T> = RefObject<T> | RefCallback<T> | null` type trio and the decision rule (element-props alias → free; hand-written props → annotate `ref?: Ref<T>`); React 19 `RefObject<T>` has a **writable** `.current` (`MutableRefObject` deprecated); ref callbacks (`ref={(node) => ...}`) for DOM-node-at-mount work; the React 19 ref-callback **cleanup return** (mini-effect scoped to one node, no second `null` call); merging two refs onto one node via a callback ref (the `Ref<T>` union paying off) + `mergeRefs` utility; `useImperativeHandle` named once with the "prefer exposing the node" guardrail; refs flowing through `asChild`/`Slot` for free (closes the L3 debt).

**Cut:** none of substance — full outline scope shipped. The `Dropdowns` and `Sequence` reinforcement exercises were optional; only the `Dropdowns` ref-type check was kept, the lifecycle `Sequence` dropped (a lesson-local `RefCallbackLifecycle` diagram component carries the mount→cleanup lifecycle instead).

**Debts:**
- `useRef` at depth (`.current` mechanics, instance values, DOM access) deferred to **Ch 024 L6**; here `useRef(null)` is only "the thing that produces the ref to pass."
- The **render model** (why a new inline callback ref re-runs, when components re-render) deferred to **Ch 023**; `useCallback` named once as the stabiliser for an expensive callback ref, no memo teaching.
- `useEffect`/effects deferred to **Ch 025**; only the "mini-`useEffect`" cleanup *analogy* used.
- `IntersectionObserver` (and observer APIs) named/one-line-defined as the *reason* for callback refs; depth deferred to later-Unit lazy-loading + **Ch 026** custom hooks.
- `useImperativeHandle` at depth (third-arg dependency array, real custom-hook patterns) deferred to **Ch 026**.
- The "less magic, more contract" framing forward-references the `'use client'`/`'use server'` directives at **Ch 030**.
- The **shadcn primitive surface** built on ref-as-prop + `Slot` forwarding deferred to **Ch 027**.

**Terminology:** "ref as a regular prop" / "ref crosses the component boundary"; `forwardRef` as "the old ceremony" (legacy-recognition only, deprecated-but-functional in React 19); codemod `npx codemod react/19/remove-forward-ref`; "callback ref" (function-form ref, fired with the node on attach); "return a cleanup" = "a mini-effect scoped to the life of one DOM node"; `mergeRefs` / `react-merge-refs` (`react-best-merge-refs` for React 19 cleanup fidelity); `useImperativeHandle` handle type (`Ref<FancyInputHandle>`, not the node); "less magic, more contract" (React 19 direction).

**Patterns and best practices (for project chapters):**
- `ref` is always a destructured prop forwarded to the inner element (`const C = ({ ref, ...props }: ComponentProps<'tag'>) => <tag ref={ref} {...props} />`); **never author `forwardRef`**.
- Annotate a ref type by hand only when props are not a `ComponentProps<'tag'>` alias: `ref?: Ref<T>` (the full union, not `RefObject`/`MutableRefObject`).
- Write only `RefObject<T>` (writable `.current`); recognise but never copy `MutableRefObject`.
- Callback refs that allocate (observer/listener) **must return a cleanup**; React 19 no longer re-calls with `null`.
- Ref callbacks use a **block body** (`(node) => { ... }`) when assigning, never an implicit-return arrow (TS rejects a returned non-cleanup post-React-19).
- Merge multiple refs with a maintained `mergeRefs` helper over hand-branching every time (libraries thread the cleanup; hand-rolled five-liners usually don't).
- Prefer exposing the DOM node via ref-as-prop; reach for `useImperativeHandle` only for a genuinely curated method surface.

**Misc.:** Continues the same `<Input>`/`<Button>` spine — the `<Button>` in the `Slot` section is unchanged from L3 (ref now rides in `{...props}`, no refactor). ReactCoding exercise (`<TextField>` forward) is the load-bearing assessment, tests-graded. The arrow-bound-to-`const` form is shipped as primary; `function` declaration noted as equivalent once (deliberate divergence from the chapter-outline draft's `function` form, per conventions).

## Lesson 5 — Portals and the layout escape

**Taught:** the three layout traps that motivate portals (containing-block trap — `transform`/`filter`/etc. ancestor steals `fixed` from the viewport; overflow clip; stacking-context burial) and the single fix that escapes all three — render the DOM outside the trapping subtree; `createPortal(children, domNode, key?)` from `react-dom` (`document.body` the 95% target, `key` named for list-of-portals only, throws on `null` target); the central "**DOM moves, React tree doesn't**" model — context flows through, state lives where declared, events bubble through the *React* tree not the DOM tree (with the click-outside-to-close gotcha + `stopPropagation`/`document`-listener fixes); the WAI-ARIA APG modal contract as an 8-item *audit checklist* (role/`aria-modal`, labelledby/describedby, move-focus-in, focus trap, restore focus, `Esc`, backdrop-click-except-destructive, body-scroll lock); the three canonical reaches (modals → shadcn `Dialog`/`AlertDialog`/`Sheet`; toasts → `sonner` `<Toaster />`; popovers/dropdowns/tooltips → `@floating-ui/react` or CSS anchor positioning); the 2026 platform alternatives (native `<dialog>`+`showModal()` rendering into the **top layer**, `::backdrop`; CSS anchor positioning) with the senior decision rule (native `<dialog>` for lean/standard cases, shadcn `Dialog` for animated exit choreography + framework-controlled state).

**Cut:** the `useEffect`/`useState` mount-flag SSR guard (outline's named pattern) is **not shown as code** — the lesson lands `'use client'` as the boundary and states "a file touching `document` needs it," trusting shadcn to handle SSR internally; later lessons should not assume the mount-flag idiom was demonstrated. `typeof window !== 'undefined'` guard dropped entirely. `isolation: isolate` compressed to one clause (fixes z-index burial, not the containing-block trap). The three-shapes summary strip diagram dropped (the `CardGrid` carries it).

**Debts:**
- **shadcn `Dialog`/`Sheet`/`AlertDialog`/`Popover`/`Tooltip`/`Sonner` surfaces** named throughout as "what you import, never write" → **Ch 027** owns the library (CLI, the component surface).
- **From-scratch focus trap + `useLockBodyScroll` (incl. iOS `position: fixed` scroll-pin)** named as checklist items only → built from primitives in the **project chapter Ch 028 L8**.
- The minimal `Modal` shipped here is **deliberately a11y-incomplete** (no focus handling, `Esc`, scroll lock) — staging for the contract section + Ch 028 L8; later lessons must treat it as a teaching stub, not a usable component.
- `'use client'` / client-server boundary named as a fact → **Ch 030** owns directives.
- `useState`/`useEffect` proper → **Ch 024 L1 / Ch 025 L2**; the render model (`key` 3rd arg, reconciliation) → **Ch 023** (said "the component renders," no re-render language).
- CSS anchor positioning at depth + `@floating-ui/react` API → **Ch 027** (recognition only here).
- `data-state` exit-animation + `tw-animate-css` referenced (toast/animated-exit point) → owned by **Ch 021 L5**, not retaught.
- Stacking contexts / containing blocks / `z-index` recalled in a clause → **Ch 020 L9** owns them.

**Terminology:** "the component belongs in the tree where you wrote it; only its DOM needs to move" (the load-bearing bridge sentence); "containing-block trap" / "overflow clip" / "stacking-context burial" (the three traps); "portal target" (2nd arg); "DOM moves, React doesn't" (the duality, the #1 misconception to defuse); "the responsibilities you inherit when you cover the page" / "you opted out of the platform's safety net" / "a portal hands you a contract" (a11y reframe); "WAI-ARIA APG" / "focus trap" (`Term`s); "top layer" / "`::backdrop`" (`Term`s, native `<dialog>`); "you read this, you don't write it" / "know the checklist so you can audit, not reimplement" (the chapter-wide recognition refrain).

**Patterns and best practices (for project chapters):**
- Portal-touching component files carry `'use client'` (they read `document`); import `createPortal` from `react-dom`, never `react`.
- Default portal target is `document.body`; reach for a named `#portal-root` only with a concrete reason (`.dark` on `<html>` already reaches `<body>`-attached portals, so theme tokens flow for free).
- Page-level overlays (modals/toasts/popovers) are **imported from shadcn/sonner, never hand-rolled** — the portal + full a11y contract are inside.
- `sonner` `<Toaster />` mounts once in the root layout; `toast()` called from anywhere — container on `<body>` survives route changes.
- The accessible-modal contract is the audit standard: any project modal must satisfy all 8 items (shadcn `Dialog`/Radix already does).
- Native `<dialog>`+`showModal()` is the lean alternative when standard styling suffices; shadcn `Dialog` when animated exit choreography or framework-wired open state is needed.

**Misc.:** Closing lesson of Ch 022 — completes the 2026 component API surface (`createPortal` is the last piece after props/children/`cva`+`Slot`/ref-as-prop). Opener reuses the chapter's hover-lift `<Card>` (`transform: translateY(-2px)`) as the trap, pairing with Ch 020 L9 / Ch 021. The minimal `Modal` uses `cn()`, arrow-bound `const`, kebab-case `modal.tsx` — consistent with the chapter spine. Lesson is fully built: three lesson-local diagram components shipped (`src/components/lessons/022/5/` — `TrapIllustration` HTML/CSS trap figure, `DomVsReactTree` and `StackingVsTopLayer` `TabbedContent` panels), plus the `ReactCoding` target-match opener (CSS-can't-fix-it), the event-bubbling `PredictOutput` (highest-value check), and the contract-audit `MultipleChoice` (missing focus-trap + `Esc`). No outstanding TODOs.

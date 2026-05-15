# Chapter 4.6 — Pedagogical approach

## Concept 1 — The boolean-prop coffin and the variant union

**Why it's hard.** Students from React+CSS-Modules backgrounds default to one boolean per visual state (`isPrimary`, `isLarge`, `isLoading`), then discover at the fourth boolean that `<Button isPrimary isDestructive>` typechecks but renders nonsense. The reflex to reach for a string union instead of a boolean stack is not natural; it must be installed.

**Ideal teaching artifact.** A side-by-side "two APIs, one button" comparison. On the left, a live `<Button>` whose props panel exposes six booleans (`isPrimary`, `isDestructive`, `isGhost`, `isSmall`, `isLarge`, `isLoading`); the student is invited to set `isPrimary` and `isDestructive` simultaneously and watch the rendered button do something incoherent (last-wins, both classes applied, whatever). On the right, the same button rebuilt with `variant: 'primary' | 'destructive' | 'ghost'` plus `size: 'sm' | 'md' | 'lg'`; the props panel becomes two `<select>`s and the bad state is unreachable. The artifact carries the "exhaustive, mutually exclusive, type-safe" frame because the right-hand control literally cannot express the contradiction the left-hand one allows. (Pattern archetype — broken-by-design vs. structurally-correct.)

**Engagement.** A short `Buckets` round after the artifact: sort eight prop shapes from real component libraries into "boolean-stack smell" vs. "variant-union clean" vs. "discriminated union (mutually exclusive)" — the last bucket previews the `{ href } | { onClick }` case the lesson lands.

**Components.**
- `Figure` wrapping a small bespoke component **PropsPanelDuel** (two columns, each with a checkbox/select row driving a live `<Button>` preview). Inputs: two prop schemas (booleans-only and variant-union). What it shows: that the variant-union form makes contradictory states unrepresentable.
- `Buckets` for the post-artifact sort.

**Project link.** The `FeatureCard` and `Button` in 4.12.3 are both `cva`-driven; the variant-union reflex installed here is what makes those components readable instead of boolean-stacked.

---

## Concept 2 — `ComponentProps<'tag'>` and the `className` + `...rest` discipline

**Why it's hard.** Students re-declare `onClick`, `disabled`, `aria-label`, `type` on every wrapper component, then discover after writing three wrappers that they've reimplemented half of `HTMLButtonAttributes`. The cut — `ComponentProps<'button'> & { variant?: ... }` plus the spread discipline (`className` merged with `cn()`, `...rest` spread *before* the merged class) — is the single piece of typing that makes 2026 components readable.

**Ideal teaching artifact.** A guided puzzle: a deliberately under-typed `<Button>` component on the left, a panel of test invocations on the right (`<Button onClick={...}>`, `<Button disabled>`, `<Button aria-label="...">`, `<Button className="bg-red-500">`). Each invocation either fails TypeScript or renders wrong; the student's job is to evolve the props type and the body across four checkpoints — (1) add `ComponentProps<'button'>`, (2) destructure `className` and spread `...rest`, (3) merge with `cn()`, (4) fix the order so `className` isn't clobbered by `...rest`. Each checkpoint flips an indicator from red to green. (Pattern archetype as wrong-by-default sandbox — the student repairs a contract, doesn't write it from scratch.)

**Engagement.** The artifact carries the assessment; follow with a single `Tokens` exercise pinpointing, in a finished `<Button>`, the four load-bearing pieces (`ComponentProps`, the destructure, `cn()`, the `...rest` position) to confirm recall.

**Components.**
- `ReactCoding` in tests mode for the four-checkpoint puzzle. The tests assert each invocation now typechecks and renders the right merged class.
- `Tokens` for the recall pin.

**Project link.** Every shadcn component in 4.12 (Button, Card, Sheet) opens with exactly this typing shape; the puzzle is the canonical template.

---

## Concept 3 — Compound vs. prop-as-slot: the decision rule

**Why it's hard.** Students reach for prop-as-slot (`<Card title="..." footer={...}>`) because it looks tidy at three regions, then discover at the fifth region that the props list has become a JSX-in-strings API. The senior decision rule — *zero or one named region → prop-as-slot; two or more → compound* — is the kind of cut students can recite but not deploy without a forcing function.

**Ideal teaching artifact.** A "build the card" scrollytelling sequence with two parallel implementations advancing in lockstep. As the student scrolls, requirements get added one at a time — first a title, then a body, then a footer with two buttons, then an optional badge, then a `className` override on the footer specifically. The left column evolves the prop-as-slot version (`title`, `body`, `footer`, `badge`, `footerClassName`, `bodyClassName`...); the right column evolves the compound version (`<Card><CardHeader><CardTitle>`...). By the fifth requirement the left column's API has visibly bloated and the right column's call site is still just JSX. The threshold *visualizes itself*. (Concept archetype — make the decision rule self-evident by showing the curve.)

**Engagement.** After the sequence: a `MultipleChoice` round with five real component briefs (a `Toast` with icon + message, a `DataTable` with header + rows + footer + toolbar + empty state, a `Tooltip` with content only, an `Alert` with title + description + action, a `Menu` with trigger + content + items) — the student picks prop-as-slot or compound for each and the answer surfaces the decision rule.

**Components.**
- `DiagramSequence` driving the side-by-side evolution; each step holds two `Code` blocks (one per implementation) with a one-line "now needed:" caption.
- `MultipleChoice` for the decision drill.

**Project link.** The `FeatureCard` in 4.12.3 ships as a compound (`Card`/`CardHeader`/`CardContent`/`CardFooter`) precisely because of this rule.

---

## Concept 4 — The `&&` zero-falsy conditional-render trap

**Why it's hard.** It's a single-character bug that ships to production. `{count && <List items={items} />}` renders a bare `0` when the list is empty — the surprise is that `0` is falsy *and* renderable, while `false`, `null`, and `undefined` are falsy and *not* renderable. Students who know JS truthiness still trip on this because they expect React to mirror the JS conditional, not the JSX rendering rule.

**Ideal teaching artifact.** A misconception-first ambush: a `PredictOutput`-style prompt with a small JSX block — `<div>{cart.length && <CartList items={cart} />}</div>` paired with `cart = []`. The student predicts the rendered output (most pick "nothing"); the reveal shows a literal `0` rendered into the DOM with a circle around it. Then a four-row truth table flips into view — `true`, `false`, `0`, `''`, `null`, `undefined`, `NaN` against "what JSX renders" — making `0` and `NaN` the only "falsy but rendered" cells. Close with the three fixes (`count > 0 && ...`, `!!count && ...`, ternary). (Concept archetype — misconception-first.)

**Engagement.** The `PredictOutput` itself is the assessment; follow with a one-question `TrueFalse` round on whether `<>{value && <X />}</>` is safe for each of: `boolean`, `number`, `string`, `null`, `array`.

**Components.**
- `PredictOutput` for the ambush.
- `Figure` wrapping a small static SVG truth table (hand-authored) for the renders-or-not grid.
- `TrueFalse` for the recall round.

**Project link.** No direct project link — the trap is general; mention it lands every time `4.12.3`'s feature grid checks `features.length` before mapping.

---

## Concept 5 — `Slot` and `asChild`: the polymorphic component

**Why it's hard.** Two misconceptions stack. First, students don't see why polymorphism is needed at all until they hit the "button that's actually a link" problem and the temptation to nest `<a><button>` (invalid HTML) or duplicate the variant table on a `<LinkButton>`. Second, when `asChild` is introduced, students treat it as magic — they don't see that the parent's classes and handlers literally walk through `<Slot>` onto the child.

**Ideal teaching artifact.** Two artifacts; this is the chapter's flagship pattern and the second beat earns its space.

*Beat one — the X-ray.* A visualization of the `<Slot>` merge. The student sees `<Button variant="primary" asChild onClick={parentClick}><Link href="/dashboard" onClick={childClick}>Open</Link></Button>` on the left and the rendered DOM on the right — an `<a>` element with `class="...primary-classes..." href="/dashboard"`. Lines animate from the `<Button>`'s `className` and `onClick` onto the `<a>`; the child's `onClick` stays put and a small "both fire" badge appears. The student toggles `asChild` off and watches the wrapping `<button>` reappear around the link (with a red "invalid nested interactive" warning).

*Beat two — the rejected alternative.* A short side-by-side: the same component reimplemented with a generic `as` prop (`<Button as={Link} href="/dashboard">`), the resulting TypeScript error wall (15 lines of conditional-generic noise), and the `asChild` version (one line, types intact). The student doesn't need to read the error; the visual contrast is the lesson.

(Pattern archetype with a Decision second beat.)

**Engagement.** A `Sequence` drill: given the source `<Button variant="primary" asChild onClick={A}><a onClick={B} href="/x" className="underline">Go</a></Button>`, drag five DOM-attribute claims into the right column (which prop ends up on the `<a>`, which one wins on `className` collision, whether `A` runs, whether `B` runs, whether the `<button>` element appears at all).

**Components.**
- `Figure` wrapping a small bespoke component **SlotMergeViewer** (inputs: a JSX expression with `asChild`, a list of props on both parent and child; output: animated arrows showing where each prop lands on the DOM). The `asChild` toggle is part of the widget.
- `CodeVariants` for the generic-`as` vs. `asChild` contrast.
- `Sequence` for the recall drill.

**Project link.** 4.12.3 uses `<Button asChild><Link>` for the hero CTAs — the X-ray is what makes that line legible.

---

## Concept 6 — The CVA variant table and `VariantProps`

**Why it's hard.** Students see a finished `buttonVariants = cva(...)` call and read it as configuration soup — a base string, a variants object, a defaults object, optional compound variants. They miss that it's a function from props to a class string and that `VariantProps<typeof buttonVariants>` is what stitches it back into the component's TypeScript types. The "one place" principle (variants declared once, types follow) doesn't land without seeing the round trip.

**Ideal teaching artifact.** A controllable variant-table playground. On the left, a `cva` declaration the student edits — base classes, a `variant` family, a `size` family, `defaultVariants`. On the right, three things update live: (a) the rendered button preview, (b) the actual class string `buttonVariants({ variant, size })` returns, (c) the inferred type of `VariantProps<typeof buttonVariants>` shown as a small TS hover card. The student adds a third `variant` entry (`outline`) and watches the type widen automatically; adds a `compoundVariants` row and watches the class string change for one specific combination. (Mechanics archetype as explorable.)

**Engagement.** A `Dropdowns` exercise on a near-finished Button file: fill in the `variants`, `defaultVariants`, the `cn(buttonVariants({ ... }), className)` call, and the `VariantProps<typeof ...>` in the type. Four blanks, one canonical answer each.

**Components.**
- Bespoke **CvaPlayground** (inputs: an editable `cva` config; outputs: live button preview, returned class string, inferred-variant-type panel). Wrap in `Figure`.
- Alternative if the playground proves too ambitious for v1: a `ReactCoding` exercise where the student writes the `cva` call against a tests panel that probes specific `variant`/`size` combinations. This is the leanest fallback and still teaches the round trip.
- `Dropdowns` for the recall round.

**Project link.** The 4.12.3 `FeatureCard` is built on `cva`; this is the artifact that makes that file readable.

---

## Concept 7 — Refs as a regular prop (the React 19 cut)

**Why it's hard.** Every codebase, tutorial, and StackOverflow answer the student has ever read uses `forwardRef`. The React 19 form — `function Input({ ref, ...props }) { return <input ref={ref} {...props} /> }` — looks deceptively trivial. The teaching task isn't the new syntax; it's *uninstalling the old reflex* so the student doesn't reach for `forwardRef` out of habit.

**Ideal teaching artifact.** A time-travel before/after with the same component rendered twice. Tab one: the React 18 form — `const Input = forwardRef<HTMLInputElement, Props>((props, ref) => ...)` with the typed second parameter, the wrapper, the generics. Tab two: the React 19 form — `function Input({ ref, ...rest }: ComponentProps<'input'>) { return <input ref={ref} {...rest} /> }`. A small "what changed" panel beside them annotates: no wrapper, `ref` in destructuring, type comes from `ComponentProps`. Then a third tab: legacy `forwardRef` in a 2026 codebase with the eslint warning highlighted — recognition only. (Decision archetype, but in service of installing a default.)

**Engagement.** A small `ReactCoding` puzzle: convert a `forwardRef` component to the React 19 shape. Tests run the parent's `inputRef.current?.focus()` and assert focus moved. The artifact carries the assessment of the conversion mechanic; the follow-up is a one-question `MultipleChoice` on which of four legacy patterns survive in React 19 (`forwardRef` — deprecated; `useImperativeHandle` — rare-but-alive; ref objects — alive with writable `.current`; the `ref` as a magic prop — gone, now ordinary).

**Components.**
- `CodeVariants` for the three-tab time-travel.
- `ReactCoding` for the conversion drill.
- `MultipleChoice` for the legacy-pattern survey.

**Project link.** No direct ref work in 4.12, but the mobile drawer in 4.12.5 (shadcn `Sheet`) relies on Radix internals that pass refs as props throughout — the student needs to read the React 19 shape to follow shadcn source.

---

## Concept 8 — Ref callbacks with the React 19 cleanup return

**Why it's hard.** Most students have only seen object refs (`useRef`). The callback form is rarer; the React 19 addition (returning a cleanup function from the callback) is rarer still. The misconception to flush: students think "callback ref + cleanup" is an alternative spelling of `useEffect`, when in fact it fires *on the node's mount/unmount* (DOM-keyed) rather than on the component's render-cycle effects.

**Ideal teaching artifact.** A guided puzzle around the canonical use case — observing an element with `IntersectionObserver`. The student starts with a `useEffect`-based implementation (set up observer, observe `ref.current`, return disconnect) and is shown the failure mode: when the underlying node changes (a list re-keying), the effect doesn't re-run because the dependency is just the ref *object*, not the node. The fix is a ref callback that observes on mount and returns `() => observer.disconnect()` on unmount — DOM-keyed by construction. The student writes the callback; the test asserts the observer fires when the node enters the viewport and is disconnected when it leaves the tree. (Mechanics archetype, but framed around the failure mode the new form fixes.)

**Engagement.** The puzzle is the assessment; follow with a one-question `TrueFalse` on whether each of three teardowns belongs in a ref callback or a `useEffect` (observer attached to a specific node → callback; subscription to a context value → effect; timer scheduled on mount of a node → either, but callback is leaner).

**Components.**
- `ReactCoding` in tests mode with a small IntersectionObserver test harness.
- `TrueFalse` for the recall split.

**Project link.** No direct use in 4.12; cross-reference forward to 4.10's custom-hook chapter where `useIntersectionObserver` reaches for this pattern.

---

## Concept 9 — Portals: layout escape that doesn't escape React

**Why it's hard.** Two surprises bundled. (1) A modal trapped inside a transformed ancestor (the 4.4.9 bug) needs to escape *DOM ancestry* — `createPortal(<Dialog />, document.body)` does that. (2) The portal does *not* escape the React tree — events still bubble through React parents, context still flows. Students who internalize (1) tend to over-apply it and assume (2) follows, then get bit when their card's `onClick` fires on clicks inside the portaled tooltip.

**Ideal teaching artifact.** A dual-tree visualizer. The left pane shows the DOM tree (the `<Dialog>` sitting under `<body>` next to the `<App>` subtree); the right pane shows the React tree (the `<Dialog>` still nested inside the `<Card>` inside the `<Page>`). The student clicks a button inside the rendered dialog and two animations fire simultaneously — in the DOM pane, the event bubbles up through `<body>` (short path); in the React pane, the synthetic event walks back up through `<Card>` and `<Page>` (long path). A toggle lets the student turn the portal off and watch both panes collapse into one. (Concept archetype — the model has two trees, the artifact makes both visible.)

A second beat — short — covers the trapped-modal fix from 4.4.9. A small static diagram (hand SVG) showing a `transform`'d ancestor with a `position: fixed` modal inside it, the modal correctly being trapped by the new containing block, and the portal-to-body fix moving the modal outside the trap. This lands the "why portals at all" frame before the dual-tree visualizer lands the "but events still bubble" surprise.

**Engagement.** After the visualizer, a `PredictOutput`-style multi-prompt: given a `<Card onClick={handleCard}>` containing `{createPortal(<Tooltip onClick={handleTooltip}>...</Tooltip>, document.body)}`, the student predicts (a) where the tooltip lives in the DOM, (b) whether `handleCard` fires when the tooltip is clicked, (c) whether a CSS rule `.card:hover .tooltip` would target the portaled tooltip.

**Components.**
- Bespoke **DualTreeVisualizer** (inputs: a small React tree spec with one portaled node; outputs: side-by-side DOM tree and React tree, with a "click here" affordance that animates event bubbling through both). Wrap in `Figure`.
- `Figure` with a hand-authored SVG for the stacking-context-trap diagram (no bespoke component — single-use static).
- `PredictOutput` for the three-question round.

**Project link.** The 4.12.5 mobile drawer (shadcn `Sheet`) uses a portal internally; the student needs the dual-tree mental model to understand why the drawer's events still propagate through their `<Header>` even though the DOM has moved.

---

## Concept 10 — The accessible-modal contract

**Why it's hard.** Students who reach `createPortal` think they've built a modal. They haven't. A real modal is eight items: `role="dialog"`, `aria-modal`, label/describe wiring, focus-on-open, focus-trap-while-open, focus-restore-on-close, `Esc` close, scroll lock. Each one is invisible when present and obvious when missing — a checklist that students nod through and then ship missing four items.

**Ideal teaching artifact.** A "what's broken" replica. The student is dropped onto a page with a deliberately broken bespoke modal — render-into-body works, the dialog looks right, but: tab key escapes to the page behind, `Esc` does nothing, the body scrolls under the dialog, the title isn't announced, opening with the keyboard puts focus on `<body>` not the dialog. Eight checkboxes line the right side; as the student interacts (tries to tab, presses Esc, scrolls), the checkboxes update — each one ticks when its condition is verifiable in the current state. The job is to reach all-eight-green by clicking "apply fix" buttons (each pre-written; the student isn't writing the focus-trap code, they're recognizing what each fix does). A toggle at the end flips the whole modal to "use shadcn `Dialog` instead" and all eight light up at once — the senior reach. (Pattern archetype with a real replica as the failure surface.)

**Engagement.** The replica's eight-checkbox state is itself the assessment. Follow with a `Matching` drill — eight contract items in the left column, eight failure modes in the right column ("user can tab to a button behind the dialog" matches "focus trap missing"; "page jumps when modal opens" matches "scroll lock missing").

**Components.**
- Bespoke **A11yModalReplica** (inputs: a list of contract items with verification logic; output: a deliberately broken modal sandbox with a live checklist that the student watches turn green as they interact and apply fixes). Wrap in `Figure`.
- Alternative if the replica is too ambitious for v1: a `Figure` with a static SVG of the eight-item contract plus a video walkthrough of one broken modal — and a `Buckets` exercise sorting eight modal-behavior clips into "compliant" vs. "broken." This loses the manipulation but keeps the checklist.
- `Matching` for the recall round.

**Project link.** 4.12.5 builds the mobile drawer with `useLockBodyScroll` plus shadcn `Sheet` — the contract installed here is the one that drawer satisfies, and it's the explicit "Done when" check the project verifies.

---

## Component proposals

- **PropsPanelDuel** — side-by-side live preview of one component under two prop-shape regimes (booleans-only vs. variant union), each driven by an auto-generated controls panel.
  - Uses in this chapter: Concept 1.
  - Forward-links: 4.12.3 (`FeatureCard` variants), 4.11.1 (shadcn variant surface) — both could reuse the duel form for "API smell vs. clean API" framing.
  - Leanest v1: hardcode the two prop schemas (boolean stack and variant union) for the `Button` example only; render two `<Button>` previews driven by hand-written control rows. No schema introspection. v1 still carries the teaching.

- **SlotMergeViewer** — animated visualization of how `<Slot>` merges parent props (className, onClick, ref) onto a single child element.
  - Uses in this chapter: Concept 5.
  - Forward-links: 4.11.1 (shadcn `asChild` surface) — the same visualization clarifies every shadcn primitive.
  - Leanest v1: a static `Figure` with two hand-authored SVG arrows (className-merge, onClick-compose) and a toggle that swaps between `asChild={true}` and `asChild={false}` showing the rendered HTML diff. No animation, no live JSX input. Drop the animation; keep the toggle.

- **CvaPlayground** — editable `cva` config on the left; live button preview, returned class string, and inferred `VariantProps` type on the right.
  - Uses in this chapter: Concept 6.
  - Forward-links: 4.11.1 (every shadcn component is `cva`-driven), 4.12.3 (`FeatureCard` variants) — the playground would be the canonical "read a shadcn variants file" tool for the rest of Unit 4.
  - Leanest v1: a non-editable `cva` config with three `<select>`s on top driving the three outputs (preview, class string, type panel). The student doesn't author the `cva` call; they manipulate the inputs. This still teaches the round trip; the editor comes in v2.

- **DualTreeVisualizer** — side-by-side DOM tree and React tree with one portaled node, animating event bubbling along both paths on click.
  - Uses in this chapter: Concept 9.
  - Forward-links: 4.7.6 (synthetic events and delegation — the React-tree-bubbling story compounds), 4.11.4 (focus management with portals), 5.1.6 (intercepting routes that surface modal-as-URL).
  - Leanest v1: two static SVG trees side-by-side with a single "click" button that traces the event paths via CSS-keyframe arrows. No interactive tree editing. The dual-tree contrast is what teaches; the animation is the bonus.

- **A11yModalReplica** — broken-by-default modal sandbox with a live eight-item contract checklist and pre-written "apply fix" buttons.
  - Uses in this chapter: Concept 10.
  - Forward-links: 4.11.4 (focus management), 4.12.5 (the project chapter that builds the drawer), 4.11.5 (the four-states component contract).
  - Leanest v1: only four of the eight contract items implemented (focus trap, `Esc` close, scroll lock, focus restore), each with one apply-fix button. The other four ship as static checklist items with "shadcn handles this" text. The teaching survives at half the checklist.

## Build priority

The two highest-leverage proposals are **CvaPlayground** and **SlotMergeViewer**: both compound directly into Chapter 4.11 (the shadcn surface) and the 4.12 project, and they together carry the chapter's flagship lesson (4.6.3). Build CvaPlayground first — its v1 (non-editable, three selects driving outputs) is small, and every later chapter that touches a shadcn component can reuse it.

**A11yModalReplica** is the third-priority build. It carries the chapter's most failure-prone concept (every term the student has to *recognize as missing* rather than write) and forward-links into three later chapters. Build the four-item v1; defer the rest.

**DualTreeVisualizer** and **PropsPanelDuel** are useful but narrower. Defer DualTreeVisualizer if 4.7.6 doesn't end up depending on it; defer PropsPanelDuel to the alternative bullet (a static `Figure` with two hand-written `Button` examples) if build budget tightens — the teaching survives.

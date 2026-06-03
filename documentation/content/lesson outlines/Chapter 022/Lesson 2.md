# Children and compound components

**Title (h1):** Children and compound components
**Sidebar label:** Children and compound

---

## Lesson framing

This is L2 of Ch 022. L1 installed the typed-props contract and the canonical `<Button>` spine. L2 turns the next corner: a component is not just props in, JSX out — its most powerful input is *other JSX*. The senior throughline is **composition over configuration**: when a component grows a prop for every region it might hold (`title`, `body`, `footer`, `action`...), the prop list is a smell; the senior reach is to let the consumer hand the component JSX and place it. The lesson installs four composition shapes in priority order — `children` (the universal slot), compound components (the shadcn multi-region shape), prop-as-slot (the single-named-region shape), and render props (recognition-only) — plus the conditional-render reflexes and the one bug everyone ships: the `0`-falsy trap.

Pedagogical decisions that apply lesson-wide:

- **Lead with the pain, not the API.** The student already knows props from L1. The hook for every section is "watch the prop list grow until it collapses," then show composition dissolving it. This is the "decisions before syntax" filter — the senior question (does this region deserve a prop or a slot?) is the lesson.
- **Anchor on two running components.** The shadcn `<Card>` family is the compound exemplar (it is *the* shadcn shape and the student will read it verbatim in Ch 027). `<Button>` from L1 is reused for the prop-as-slot example (`leftIcon`). Keeping both anchors continuous with L1/Ch 027 means the student is building the real surface, not toys.
- **`Card` is the right compound anchor precisely because it does not expose `asChild`.** Per code conventions, `Card`'s container is a plain `<div>` and is the carve-out that *cannot* be retargeted — so it never tempts us into `asChild`/`Slot`, which belongs to L3. Compound components and polymorphism are orthogonal; this lesson teaches the former with a component that has none of the latter.
- **A clean decision rule is the load-bearing takeaway.** "Zero or one named region → prop-as-slot; two or more → compound." Most beginners reach for props reflexively and never discover composition, or over-engineer everything into compound sets. The rule is the mental model the student should leave with; give it a `StateMachineWalker` so they *apply* it, not just read it.
- **Render props are recognition-only.** They are not deprecated, but in 2026 nearly every case that used them is a custom hook (Ch 026). One canonical example, framed honestly as "you will read this, rarely write it," then a forward pointer. Spending more airtime would mis-weight a dying pattern — fails the minimum-viable-stack filter.
- **Hold the render model.** Ch 023 owns *when a component re-runs*. This lesson treats components as functions of props/children only. When discussing `key` on fragments, name it as a list-identity prop and forward-reference Ch 023 L2 rather than explaining reconciliation. No re-render/memo language.
- **Cognitive-load order:** universal slot (simplest, builds on L1's destructuring) → multi-region composition (the big idea) → the single-region exception → conditional rendering reflexes + the trap (cashes in JSX rules from Ch 017 L1) → the recognition-only render prop → the composition-vs-drilling preview (motivates Ch 024/025 without teaching them). Each section adds exactly one new idea.

---

## Lesson sections

### Introduction (no header)

Warm, brief, ~2 short paragraphs. Open on the concrete problem: a `<Card>` written as `<Card title="…" body={<p>…</p>} footer={<Button>…</Button>} />` works today, but tomorrow design wants a badge, then an action menu, then a divider — each is a new optional prop, and the call site reads as a config blob, not as UI. Contrast the same card written as nested JSX that *reads like HTML*. State the goal: by the end, the student can decide between a prop and a slot, build a shadcn-style compound component, and avoid the conditional-render bug that ships to production constantly. Connect back to L1 ("you typed the props contract; now we type the *content* contract") and forward ("this is the exact shape every shadcn component in Ch 027 uses").

No code block here beyond maybe a one-line inline contrast; save real code for the sections.

### `children` is the universal content slot

**Concept:** `children` is just another prop, typed `children: ReactNode`, destructured like any other. It is what makes `<Card>Anything here</Card>` work.

**How to convey:**
- Start from L1 muscle memory: props are destructured in the parameter. `children` is no different — `({ children }: { children: ReactNode })`. The novelty is purely *where the value comes from*: not an attribute, but whatever sits between the tags.
- Use a small `Code` block: a `<Section>` or `<Card>` wrapper that renders `<div className={cn(...)}>{children}</div>`. Reuse the `cn(componentClasses, className)` discipline from L1 verbatim so the styling contract stays identical across the chapter — show `className` and `children` destructured together with `...rest`. Note (for downstream agents) this is deliberate continuity with L1's spine.
- Teach `ReactNode` as the deliberately wide type: it accepts JSX, strings, numbers, arrays, fragments, portals, and `null`/`undefined`/`boolean` (the last three render as nothing). Frame the width as a feature — it is why `{condition && <Thing/>}` and `{items.map(...)}` both "just work" as children. This sets up the conditional-rendering section.
- **`ReactNode` vs `ReactElement`:** name the distinction once. `ReactNode` = anything renderable (the 99% default, and the code-conventions rule: `children: ReactNode`, never `JSX.Element`/`ReactElement`). `ReactElement` = a single JSX element, narrow, only when a component must inspect or clone its child — rare in 2026, named for context, and flagged as a watch-out (a `children: ReactElement` breaks on strings and fragments). Do not teach `cloneElement` mechanics; just say it exists and that L3's `asChild` is the typed way to do what `cloneElement` did by hand.

**Component:** `Code` (single simple block — one focus point, no need for `AnnotatedCode`). A `CodeTooltips` pass on the `<Card>` block could surface the inferred type of `children` (`ReactNode`) on hover to reinforce the type without a prose detour — optional, use if it reads cleanly.

**Terms (Tooltip via `<Term>`):** `ReactNode` (definition: the wide "anything renderable" type — JSX, strings, numbers, arrays, fragments, null/undefined/booleans render as nothing). `ReactElement` (a single JSX element — the narrow type; only needed when a component inspects or clones its child).

### Compound components: regions as JSX, not props

**Concept:** the shadcn pattern. A `<Card>` ships as a tightly-coupled *family* — each member a thin `<div>` (or semantic element) wrapper with its own classes and its own `className`. The consumer composes them with JSX instead of passing region props. Teach the **verified, current (2026) shadcn anatomy** so the student writes exactly the family they will import in Ch 027:

```
Card
├── CardHeader
│   ├── CardTitle
│   ├── CardDescription
│   └── CardAction        (top-right header slot — e.g. a button or badge)
├── CardContent
└── CardFooter
```

**How to convey:**
- Open the section by rendering that anatomy tree as a small visual — a Starlight `<FileTree>` (or plain nested `<ul>` in a `<Figure>`). Pedagogical goal: the student sees the *shape* of the family before the code, and it mirrors the "composition diagram" shadcn itself now ships in its docs (the April 2026 component-composition update added exactly these trees so coding agents compose the parts without missing wrappers — name this in the senior frame below; it is concrete evidence the pattern is the 2026 default).
- Motivate with the prop-list-collapse: open with the `<Card title body footer />` form from the intro and literally show it accreting props (`badge`, `actions`, `divider`). Then the pivot: instead of the *component* enumerating every region, let the *consumer* place regions as children.
- Show the before/after with `CodeVariants`: **Variant "Prop-as-slot card"** (the config-blob `<Card>` with `header`/`body`/`footer` props and the JSX branching inside) vs **Variant "Compound card"** (the call site nesting the subcomponents). Use `del=`/`ins=` framing where it sharpens the contrast. First sentence of each variant's prose carries the verdict ("scales by editing the component" vs "scales by adding a subcomponent"). This is the canonical use of `CodeVariants` — two versions of the same UI.
- Then walk the *implementation* of the compound family with `AnnotatedCode` (one block, multiple focus points — exactly its use case). The single `code` is the `card.tsx` file exporting the family. Steps:
  1. `{1}` the file exports a *set* of components, not one — the one-component-per-file rule's sanctioned exception (continuity: L1 named this exception; this is where it is taught).
  2. highlight `Card` — the outer `<div>` wrapper, `children`, `cn(base, className)`, `...rest`. Same spine as every component this chapter.
  3. highlight `CardHeader`/`CardTitle` — thin wrappers, each owns its classes, each accepts `className` and `...rest`. Point out `CardTitle` renders a semantic heading (e.g. `<h3>`), not a styled `<div>` — accessibility belongs in the subcomponent, foreshadows Ch 027.
  4. highlight `CardAction` — the header-region slot positioned top-right; it is the cleanest proof that "a new region is a new subcomponent, not a new prop on `<Card>`."
  5. highlight one subcomponent's `ComponentProps<'div'>` props type — every subcomponent is itself an L1-style typed component; nothing new, just repeated.
  Keep the block within `AnnotatedCode`'s 18-line visible-height cap by showing two or three representative subcomponents in full and eliding the rest with a comment; the pattern is identical across them.
- **Why compound beats prop-as-slot — make the payoff explicit:** (a) it scales — adding a region like `CardAction` is a new export, not a new optional prop on `<Card>`; (b) the consumer controls ordering and can omit slots; (c) the consumer can wrap/restyle a subcomponent (`<CardHeader className="bg-muted">`) because each forwards `className`. Tie each benefit back to a concrete edit the student can imagine making.
- **Honest limitation (teach inline, not as a tip dump):** there is no compile-time enforcement that `<CardFooter>` only renders inside `<Card>` — they are just exported components; the coupling is convention + docs, not the type system. Name this so the student does not go hunting for a guarantee that is not there, and so they document the surface. (Explicitly note for downstream agents: do NOT introduce React Context to share state between Card parts — Card parts are styling-only here; context-coupled compound components are Ch 025 L5 territory and out of scope.)
- Land the senior frame: this is the form *every* modern library uses (shadcn, Radix, Ariakit) — so much so that shadcn now ships composition trees in its docs specifically so humans and AI agents assemble the parts correctly. The student is learning to *write* the thing they will *consume* unmodified in Ch 027.

**Component:** `<FileTree>` (anatomy tree), `CodeVariants` (before/after prop-blob vs compound), then `AnnotatedCode` (stepped walkthrough of the `card.tsx` family implementation). The family lives in one file — no multi-file tree needed for the implementation itself.

**Exercise:** `ReactCoding`, tests-graded, placed right after the implementation walkthrough. Give the student a started `<Card>` family where `CardHeader` and `CardFooter` are stubbed (return `null` or a bare `<div>` missing the `children`/`className` merge); they wire `children`, the `cn(base, className)` merge, and `...rest` on each, then the harness renders a composed card. Tests assert: the composed DOM contains the header text and footer button, a caller-passed `className` on `<CardHeader>` lands on the rendered element, and arbitrary children render in order. Grading criteria for the agent: (1) each subcomponent renders `children`; (2) `className` override is present on the output node; (3) order is preserved. This makes the student *build* the spine, not just read it.

### One region? Reach for a prop, not a subcomponent

**Concept:** prop-as-slot. When a component owns exactly one named region, a `ReactNode` prop beats a subcomponent.

**How to convey:**
- Reuse the L1 `<Button>`. Contrast `<Button leftIcon={<TrashIcon/>}>Delete</Button>` against the over-engineered `<Button><ButtonIcon><TrashIcon/></ButtonIcon>Delete</Button>`. The point: a button has *one* icon slot; spinning up a `<ButtonIcon>` subcomponent is ceremony with no payoff.
- Show the `<Button>` extension as a small `Code` block: add `leftIcon?: ReactNode` (and maybe `rightIcon?`) to the props type, render `{leftIcon}{children}` inside, keep the L1 spine (`cn(buttonClasses(...), className)`, `...rest`) intact. Note for downstream agents: this layers onto L1's exact `<Button>` — keep it identical, just add the icon slot prop; do not refactor the variant/size handling (that is L3's `cva` job).
- State both forms accept `ReactNode` and both forward `className` via `cn()` — the difference is *cardinality of regions*, nothing else.

**The decision rule — the load-bearing takeaway:**
- State it plainly: **zero or one named region → prop-as-slot; two or more → compound.** Add the corollary: if regions need to be reordered, omitted, or independently restyled by the consumer, that pushes toward compound even at two regions.
- Give the student a `StateMachineWalker` (decision-tree mode, ends on a recommendation) so they *apply* the rule to fresh cases. Steps/questions: "How many distinct content regions?" → 0/1 → "Does the consumer need to reorder or omit it?" → recommendation. Concrete leaf scenarios to walk: a `<Tooltip content={...}>` (one region → prop), a `<Dialog>` with header/body/footer (many → compound), a `<Badge>` wrapping text (just `children` → universal slot), a `<Toolbar>` with arbitrary left/right groups (compound or `children`). The walker turns a rule-of-thumb into a reflex; better than an MCQ because the student traverses the actual decision.

**Component:** `Code` (the `leftIcon` `<Button>` extension), `StateMachineWalker` (decision tree). `StateMachineWalker` provides its own card chrome — do not double-wrap it in `<Figure>`.

### Conditional rendering and the `0`-falsy trap

**Concept:** rendering children conditionally — `&&` for on/off, ternary for pick-one — and the single bug everyone ships: `{count && <List/>}` renders a literal `0`.

**How to convey:**
- This cashes in the JSX rendering rules from Ch 017 L1 (booleans/null/undefined render as nothing) — reference it briefly, do not re-teach. The new framing: *why* `ReactNode` accepting `boolean`/`null`/`undefined` is what makes `{cond && <Node/>}` work — when `cond` is `false`, the expression is `false`, which renders nothing.
- Show the two reflexes as a small `Code` block: `{isOpen && <Panel/>}` and `{isError ? <Alert/> : <Content/>}`.
- **The trap, taught as the centerpiece of the section, not a footnote:** `{count && <List/>}` when `count === 0`. `0` is falsy so `&&` short-circuits to `0` — but `0` is a *number*, and numbers are renderable `ReactNode`, so React prints `0` to the DOM. The empty string `''` does the same. This is the canonical beginner production bug (a stray `0` next to an empty list).
- The fixes, per code conventions (Components and JSX rule: never `0 && <Node/>`): `{count > 0 && <List/>}` (compare to a boolean), `{Boolean(count) && <List/>}`, or for nullable values `{value != null && <Node/>}`. State the rule: the left side of `&&` in JSX must be a *real boolean*, never a bare number/string.

**Exercise:** `PredictOutput`, placed immediately after introducing the trap, *before* the fix. Program renders `<div>{count && <span>items</span>}</div>` with `count = 0`. Expected output is the rendered text containing `0`. `<PredictWhy>`: `0` is falsy, so `&&` evaluates to `0`; `0` is a number and numbers render, so React prints it. Fix: `count > 0 && …`. This is the perfect "gotcha" drill — the student predicts, gets surprised, internalizes. (If `PredictOutput`'s stdout model fits awkwardly to rendered DOM, fall back to a `MultipleChoice`: "What does this JSX render when `count` is `0`?" with the `0` answer correct and `<McqWhy>` carrying the explanation — author the wrong options so they are not verbatim prose. Prefer `PredictOutput` if the rendered-text-as-output framing reads cleanly.)

**Component:** `Code` (the two reflexes + the trap + the fixes), `PredictOutput` (or `MultipleChoice` fallback).

### Fragments group without a wrapper

**Concept:** `<>...</>` returns multiple children without an extra DOM node; `<Fragment key={...}>` is the keyed form for list items.

**How to convey:**
- Short section. Motivate: a component must return one parent, but you do not always want a `<div>` polluting the DOM (breaks flex/grid layouts, adds noise). The fragment is the no-op wrapper.
- `Code` block: a component returning `<><dt>…</dt><dd>…</dd></>` (a definition-list row is a clean motivation — the parent `<dl>` requires bare `<dt>`/`<dd>` siblings, a wrapping `<div>` would be invalid). The `<>` shorthand is the daily reach.
- Name the keyed form: when fragments are *list items* (you map a list and each iteration emits two sibling elements), you cannot put `key` on `<>` — use `<Fragment key={item.id}>`. Forward-reference Ch 023 L2 for *why* lists need keys; here just establish the syntactic fact and the watch-out: do not put `key` on a fragment unless it is part of a list — fragments are otherwise key-free.

**Component:** `Code` (the `<dl>` fragment, plus a one-line keyed-`Fragment` snippet).

**Term:** `fragment` (definition: groups sibling elements without adding a DOM node; `<>...</>` is the shorthand).

### Children as a function: the render prop you will recognize but rarely write

**Concept:** the render-prop / children-as-a-function form, framed honestly as recognition-only.

**How to convey:**
- One canonical example, `Code` block: `<DataLoader>{(data) => <List items={data}/>}</DataLoader>`. The component owns some value (state, a subscription) and *calls* its `children` with that value, letting the consumer control the render. `children` here is typed `(data: T) => ReactNode`.
- Be explicit and senior about the weighting: this pattern is **not deprecated**, but in 2026 nearly every case that historically reached for it is a **custom hook** (forward-reference Ch 026). The reason render props survive at all: a component that *also* renders chrome around the consumer's render (a layout, a boundary) — but those are few.
- The takeaway sentence: "Read it without flinching; reach for a custom hook before you write one." Do not build an exercise here — over-investing in a recognition-only pattern mis-weights the lesson.
- Mention `React.Children` utilities (`Children.map`, `Children.toArray`) in one breath as the even-rarer cousin: the 2026 senior reach is to *not* iterate children — expose a data prop instead. `Children.toArray` exists for the case where a component genuinely must inspect its children (a custom `<Tabs>` reading `<Tab>` elements) and wants stable keys. Name it, flag it rare and intentional, and pair it with the watch-out: do not reach for `cloneElement`/`Children.map` to inject props into children — L3's `asChild` does that with a typed contract. (Forward seam to L3, do not teach `asChild` here.)

**Component:** `Code` (the `DataLoader` example).

**Terms:** `render prop` (definition: a prop — often `children` — that is a function the component calls to let the consumer control what renders, passing it data the component owns).

### Composition is the first answer to prop drilling

**Concept:** preview only. When a prop must reach a deeply nested component, the reflex is to thread it through every layer (prop drilling). Composition is often the cheaper fix *before* reaching for context.

**How to convey:**
- Keep this short and forward-looking — it motivates Ch 024/025 without teaching them. Show the problem: `<Layout>` → `<Page>` → `<Header>` → `<Toolbar>` where only `<Toolbar>` needs `user`, but every intermediate component has to accept and pass `user`. That is drilling.
- The composition fix: let `<Layout>` accept the toolbar *as a `children`/slot prop*, so the consumer wires `user` to `<Toolbar user={user}/>` at the call site and hands the finished element down. The intermediate layers pass an opaque `ReactNode` and never see `user`. This is "the component that needs the prop and the component that has the prop become siblings at the call site."
- Be explicit this is a *preview*: the full treatment of where state lives (Ch 024 L3, the four homes) and context as the other tool (Ch 025 L5) come later. The senior point to plant now: **prop drilling is not automatically a context bug** — composition dissolves a lot of it for free, and reaching for context too early is itself a smell (continuity with Ch 024 L3's "prop-drilling-is-not-a-context-bug" framing). Forward-reference both lessons.

**Component:** a small box-and-arrow visual contrasting the two paths, presented in a `TabbedContent` with two panels ("Drilling" / "Composition"). Drilling panel: 4 stacked boxes with `user` threaded through every one. Composition panel: `user` injected at the top into `<Toolbar>`, an opaque `children` passed down, intermediate boxes never touching `user`. The diagram's pedagogical goal: make "siblings at the call site" *visible* — the student sees the prop skip the intermediate layers. Plain HTML+CSS boxes are simplest here and stay inspectable; if box-to-box arrows are wanted use `<ArrowDiagram>` with `expandable={false}` inside a `<Figure>` (its leader lines break when relocated). Keep it under the height cap; horizontal/compact.

### External resources (optional)

One or two `ExternalResource` cards: React docs "Passing JSX as children" / "Passing props to a component"; the shadcn `Card` docs (its composition tree is the canonical compound-component reference the student will consume in Ch 027). Optional `VideoCallout` only if a tight, current, still-accurate video on composition vs configuration surfaces — do not force one; the concepts are well-served by code here.

---

## Scope

**This lesson teaches:** `children: ReactNode`; the `ReactNode` vs `ReactElement` distinction (recognition); the compound-component (shadcn) pattern and its implementation, using the current `Card` anatomy (`Card` › `CardHeader` › [`CardTitle`, `CardDescription`, `CardAction`], `CardContent`, `CardFooter`); prop-as-slot and the decision rule; conditional rendering reflexes and the `0`-falsy trap; fragments and the `<>` shorthand; render props (recognition-only) and a one-line `Children.toArray` mention; and a *preview* of composition as the answer to prop drilling.

**Explicitly NOT in this lesson (prerequisites — redefine in one line only, do not re-teach):**
- The typed-props contract, `type Props`, `ComponentProps<'tag'>`, variant unions, defaults-at-destructure, the `cn(componentClasses, className)` + `...rest` discipline, kebab-case filenames — **all from L1.** Reuse the `<Button>` and the spine verbatim; assume mastery.
- `cn()`/`tailwind-merge` internals — Ch 018 L3. Use `cn` as a known tool.
- JSX rendering rules (what renders as nothing) — Ch 017 L1. Reference, do not re-teach; the *new* angle is conditional patterns and the trap.

**Reserved for later lessons (name the seam, do not teach):**
- `asChild` + Radix `Slot` polymorphism, `cva`/`VariantProps`, the generic-`as` rejection — **L3.** This is the hard boundary: do not solve "Button renders as a link" here, do not refactor the icon `<Button>` into `cva`, do not teach `cloneElement` as prop injection (point at `asChild`).
- Refs threaded through children / `Slot` ref forwarding — **L4.**
- The render model: *when* a component re-runs, reconciliation, *why* lists need `key` — **Ch 023** (esp. L2 for keys). Only state the syntactic key facts for fragments/lists; never explain re-rendering.
- Context as the alternative to prop drilling, context-coupled compound components — **Ch 025 L5.** The drilling section is preview-only; do not introduce `createContext`/`useContext`.
- Lifting state up, the four homes for state — **Ch 024 L3/L4.** State management beyond "the consumer composes static UI" is out of scope.
- Custom hooks (the modern replacement for most render props) — **Ch 026.** Forward-reference only.
- HOCs — named once as legacy in L1; not revisited.
- Next.js parallel-route slots / `@slot` — same word, different concept; Ch 029 territory; do not conflate.

---

## Notes for downstream agents (cross-lesson continuity)

- Keep the `<Card>` family and the `<Button>` identical in shape to L1's spine and to what L3/L4 will extend. The chapter's win condition is one continuous component evolving across four lessons.
- Use the **verified 2026 shadcn `Card` anatomy** (includes `CardAction`, the top-right header slot). Do not ship a stale 5-part family that omits it.
- The `<Card>` here is **styling-only / context-free** by design (matches the code-conventions carve-out that `Card` has no `asChild` and is a plain `<div>`). Do not add shared state.
- Use `cn` imported from `@/lib/utils`; React type imports via `import type`. `children: ReactNode` always — never `JSX.Element`/`ReactElement` for children.
- Conditional render in all sample code obeys the rule: real boolean on the left of `&&` (`count > 0 && …`, `Boolean(x) && …`, `x != null && …`), never a bare number/string. The trap section is the one place a *wrong* version is shown — and it is explicitly labelled as the bug.

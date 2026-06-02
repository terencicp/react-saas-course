# Display modes and the hide decision tree

- **Title (h1):** Display modes and the hide decision tree
- **Sidebar label:** Display modes

---

## Lesson framing

This is the second axis of the chapter. Lesson 1 installed the box model and the inline/block axis under `border-box`. This lesson installs the property that decides *which* box-model rules even apply: `display`. It splits cleanly into two teaching arcs that share one organising idea — **`display` is the master switch for how an element participates in layout** — so the lesson is one coherent topic, not two stapled together.

**Arc 1 — the display modes** as a *choice a senior makes*, not a catalogue to memorise. The pedagogical spine is the chapter-framing decision: `flex` for a row/column, `grid` for a 2D structure, `block` for stacking, `inline` for in-text spans, `contents` for the rare unwrap. The student should leave able to look at a piece of UI and name the display mode before writing a class.

**Arc 2 — the hide decision tree.** Three mechanisms (`display: none`, `visibility: hidden`, `aria-hidden`) hide an element in three different ways across two trees — the **layout tree** and the **accessibility tree**. The senior insight is that "hide" is ambiguous until you say *hide from what*. This is the payoff section and the source of the lesson title.

Senior-mindset framing (per pedagogical pillar 1): every mode is taught through *when you reach for it* and *what breaks when you pick wrong*, never as syntax-first. Lead each concept with the decision.

**Cognitive-load staging.** The modes are introduced in dependency order, simplest first: block/inline/inline-block (the normal-flow trio the student already half-knows from HTML defaults) → flex/grid as "container modes" (named only, algorithms deferred to L3/L4) → `contents` as the odd unwrapper → `none` as the bridge into the hide arc. Don't front-load all eleven modes; build the picture.

**The hook (senior question, stated implicitly in the intro).** A `<span>` ignores `width` and `padding-top`; the same content in a `<div>` honours both. Same CSS, different result — because the *display mode* decides which box-model rules apply. This directly cashes in Lesson 1: the student just learned padding/width compose under `border-box`, and now learns that whether they apply *at all* is a display decision. Open here.

**What already exists (assume, don't re-teach).** The student knows: HTML element semantics and which element is which (Ch017 L3/L4 — landmarks, `<button>`, `<a>`, lists), `aria-label` on icon-only buttons (Ch017 L4), JSX/`className`/conditional render with the `&&` zero-trap (Ch017 L1), Tailwind utility+variant syntax and `cn()` (Ch018), the box model + inline/block axis + `border-box` + the spacing scale (Ch020 L1). Conditional rendering as a React technique is known; this lesson contrasts it with CSS hiding.

**Visual-continuity contract (from L1 continuity notes).** Reuse the established conventions: `Term` for re-explaining prerequisite/unfamiliar terms inline; `ParamPlayground` with hard-coded accent colors in previews (deliberate non-token divergence for illustrations — do not route through `@theme`); examples authored at a single breakpoint (no responsive variants — those are Ch021); the "senior question" cold open; exercises placed inline at the moment of relevance, never bundled at the end. Match L1's warm-but-terse adult register.

**Mental model the student leaves with.** (1) `display` is the master switch — it sets the element's *outer* participation (block-level vs inline-level vs none) and its *inner* formatting context (flow / flex / grid). (2) "Pick the semantic element first, then set its display" — `display` never changes meaning, only layout. (3) Hiding is a two-tree decision: layout tree × accessibility tree → three tools.

---

## Lesson sections

### Intro (no header)

Open on the senior question: the `<span>` that ignores `width`/`padding-top` vs the `<div>` that honours them. State plainly that the difference is `display`, and that `display` is the single property deciding which box-model rules apply, which sizing utilities work, and how an element sits relative to its siblings. Connect explicitly back to L1 ("you just learned how padding and width *compose*; this lesson is about whether they *apply*"). Preview the two arcs: the modes a senior reaches for, then the three ways to hide. Keep it to two short paragraphs, warm and brief (pedagogical structure §3).

### Display sets two things: outer role and inner formatting

The load-bearing mental model that makes every later mode legible — teach it *before* the catalogue so the modes slot into a frame instead of arriving as a flat list.

Content:
- Every `display` value answers two questions at once: **outer** — how does this element behave *toward its siblings*? (block-level = own line, fills inline axis; inline-level = flows in the text line). **inner** — what layout context does it establish *for its children*? (normal flow / flex / grid).
- `block` and `inline` are pure outer roles with normal-flow inner. `flex`/`grid` set inner to flex/grid. `inline-flex`/`inline-grid` are the cross-product: inline outer + flex/grid inner. This is *why* `inline-flex` exists and what it's for — the student should see the table, not memorise eight magic words.
- Frame the modern CSS two-value syntax (`display: block flow`, `display: inline flex`) as name-recognition only — the single-keyword forms are what they write; the two-value form just makes the outer/inner split *visible*. One sentence, don't dwell.

Component: a small **`<Figure>` with a hand-coded HTML+CSS or SVG matrix** — a 2×N grid with outer role (block / inline) on one axis and inner context (flow / flex / grid) on the other, each cell labelled with the keyword that produces it (`block`, `inline`, `flex`, `inline-flex`, `grid`, `inline-grid`). Pedagogical goal: collapse eight keywords into one 2-axis idea so the student never again wonders "what's the difference between `flex` and `inline-flex`." Per diagrams INDEX, this is an "annotated illustration / color-coded segments" → HTML+CSS is the top pick (and it renders with real CSS, DevTools-inspectable). Cap height; horizontal layout.

`Term` candidates: **formatting context** (define as "the layout rules a container imposes on its direct children — normal flow, flex, or grid"), **normal flow** (re-explain briefly; defined in L1 but re-anchor here as the default inner context).

### Block, inline, and inline-block in normal flow

The trio the student already meets as HTML defaults — make the *layout consequences* explicit and name the narrow modern reach for `inline-block`.

Content:
- **`block`**: starts a new line, fills the parent's inline axis, honours every box-model property (`width`, `height`, all margins/padding). The default for `<div>`, `<p>`, headings, sectioning/landmark elements, lists, `<form>`. This is *why* the `<div>` in the opening honoured `width`.
- **`inline`**: flows inside the text line, **ignores `width`/`height`**, and — the subtle trap — vertical margin/padding *render* but don't push surrounding lines apart (they visually overlap adjacent lines and don't reserve block-axis space). Default for `<span>`, `<a>`, `<strong>`, `<em>`, label-level text. This is *why* the `<span>` failed.
- **`inline-block`**: the bridge — flows in the text line *like* inline, but accepts `width`/`height` and reserves vertical space *like* block. Frame the 2026 reach as **narrow**: a status dot or badge sitting mid-sentence. Then the senior redirect: most "I want width on a span" instincts are really "this should be a flex item" — reach for `flex` on the parent, not `inline-block` on the child. This pre-empts the most common misuse.

Component: **`ParamPlayground`** with a `select` for `display` (`block` / `inline` / `inline-block`) driving a preview box that has a `width`, vertical `padding`, and a visible `background`, sitting *inside a line of surrounding text* (so the inline line-flow behaviour is visible). Optional sliders for width and vertical padding. `Readout` chips echoing the current mode and a one-word verdict on "honours width?" / "reserves vertical space?" via `expr`. Pedagogical goal: let the student *feel* the moment `width` starts working and vertical space starts reserving as they flip the mode — the cause/effect that prose can't deliver (this is exactly the `ParamPlayground` "feel it by sliding" use case). Hard-coded accent color in the preview per the divergence note. Keep the box inside real flowing text so `inline` reads as inline.

`Term` candidate: **inline-level / block-level** if not already covered by the matrix section's tooltips.

### Flex and grid are container modes

Name the two workhorses and their inline variants — explicitly *defer the algorithms* to L3/L4 so this lesson stays about the choice, not the mechanics.

Content:
- **`flex`** makes a one-dimensional container (a row or a column); children become flex items. **`grid`** makes a two-dimensional container (rows *and* columns); children become grid items. One sentence each — the chapter framing says "algorithms at depth land in L3 and L4," so explicitly tell the student that and move on.
- **`inline-flex` / `inline-grid`**: same inner formatting, but the container itself flows inline. The canonical reach is the **icon-and-text button** — a `<button>` whose contents (icon + label) need flex alignment but that itself should sit inline among other inline content. This is the most-used inline variant in real SaaS code.
- The senior reframe to plant for the rest of the chapter: **`flex` for a row or column, `grid` for a 2D structure.** Most SaaS UIs are a grid of flex compositions. State it as a forward-looking default; L3/L4 cash it in.

Component: none needed beyond a tiny inline `Code` block showing `inline-flex items-center gap-2` on a button — but keep it minimal; the alignment utilities (`items-center`, `gap`) are L3 territory, shown here only to motivate `inline-flex`, not taught. Add a one-line note that the alignment classes are explained in the flexbox lesson.

`Term` candidate: none new.

### display: contents, the layout-tree unwrapper

The one genuinely surprising mode — teach it as a precise tool with a real a11y caveat.

Content:
- **`contents`** removes the element's *own box* from the layout tree, but its children stay and participate in the **grandparent's** layout as if the wrapper weren't there. The element is "transparent" to layout while still existing in the DOM.
- Two concrete reaches: (1) a semantic wrapper (e.g. a `<section>` or a component's outer `<div>`) that you want for meaning/structure but that's breaking a parent `flex`/`grid` because it became the single flex/grid item instead of the cards inside it — `contents` makes the *cards* the items again. (2) Component composition where a real DOM element must exist but its layout box is unwanted.
- The watch-out, stated honestly: `contents` historically *removed semantics too* (a `display:contents` `<ul>` stopped being a list to screen readers). Modern browsers fixed this for most semantic elements, but it's not universal — **test with a screen reader, and prefer a React Fragment (`<>...</>`) when you don't need a real DOM node at all.** This connects to known JSX (fragments, Ch017 L1): the senior order is Fragment first, `contents` only when a DOM element is mandatory.
- The easy-to-miss mechanic to call out explicitly (chapter watch-out): `contents` makes the **children** the flex/grid items, not the wrapper — easy to forget when scanning a tree in DevTools.

Component: **`CodeVariants`** (before/after) — Tab "Without `contents`" showing a `<section>` wrapping three cards inside a `flex` parent, where the section is the lone flex item and the cards stack wrong; Tab "With `contents`" adding `contents` to the section so the three cards become the flex items and lay out correctly. Each tab's prose explains what the layout tree looks like. This is the canonical before/after use case for `CodeVariants` (group related/contrasting versions of the same code). Optionally pair with a small `Figure` (HTML+CSS or ArrowDiagram) showing the layout tree collapsing — the wrapper node greyed/removed, children promoted to the parent — but only if it adds clarity beyond the code; the code contrast may suffice.

`Term` candidate: **layout tree** (define as "the tree of boxes the browser actually lays out and paints — distinct from the DOM tree; `display:none` and `display:contents` both remove an element's box from it").

### The Tailwind display utilities

Anchor every mode to the exact class the student types — short reference section so the catalogue is concrete and complete.

Content:
- One-to-one table: `block`, `inline-block`, `inline`, `flex`, `inline-flex`, `grid`, `inline-grid`, `contents`, `hidden` (→ `display: none`). Then the recognition-only tail: `flow-root`, `table` / `table-row` / `table-cell` (rare cases — flow-root for establishing a new block-formatting context; table-* for the rare non-data alignment need). Name them, don't drill them.
- Two senior notes folded in here (chapter watch-outs, placed at the concept they qualify):
  - **`<button>` defaults are inconsistent across browsers.** Preflight does *not* normalise `display` — `<div>` is still block, `<button>` still carries quirky browser defaults. So for an icon-and-text button you write `inline-flex items-center gap-2` explicitly rather than trusting the default. (Cashes in the `inline-flex` reach from the earlier section.)
  - **Tailwind's `hidden` ≡ the HTML `hidden` attribute in effect** — both resolve to `display: none`. Bridge into the next section.
- One sentence: responsive display toggling (`hidden md:block`, `md:flex`) is real and common but lives in Ch021 L6 — name it, defer it. (Chapter framing explicitly defers responsive variants.)

Component: a compact `Code` block or a small two-column table (plain MDX table) mapping utility → `display` value. Keep it scannable.

`Term` candidate: **Preflight** (re-anchor with a one-line `Term` — defined in L1, but reused here for the "doesn't reset display" point).

### Three ways to hide, two trees to hide from

The payoff arc and the lesson's namesake. Teach the *model* (two trees) before the *tools*, then the decision.

Content (model first):
- Establish the two trees the browser maintains: the **layout tree** (drives what's painted and what takes space) and the **accessibility tree** (drives what assistive tech — screen readers — announces). An element can be present or absent in each, independently. That 2×2 is the whole framework, and it dissolves the ambiguity in the word "hide": *hide from sight* and *hide from screen readers* are different operations.
- Then the three tools, each mapped to its effect on both trees:
  - **`display: none`** (Tailwind `hidden`, or simply not rendering the element in JSX): removed from **both** trees. No box, no space, not announced. The reach: genuinely-absent content — a closed dialog, an inactive tab panel, an unmounted route. In React the *more idiomatic* form is usually **conditional render** (`isOpen && <Panel />`) — note the equivalence and that conditional render also drops it from both trees, with the bonus of unmounting React state. Tie to known `&&` zero-trap reflex from Ch017.
  - **`visibility: hidden`** (Tailwind `invisible`): **keeps the box and its space** in the layout tree but paints nothing and removes it from the a11y tree. Frame as **rare** and usually a symptom — "I'm using `invisible` to reserve space" is often really a grid/`min-h`/`aspect-ratio` sizing problem (forward-glance to L5). Name it so the student recognises it; discourage reaching for it.
  - **`aria-hidden="true"`**: the mirror image — element stays **fully visible** and takes space, but is removed from the a11y tree only. The canonical reach: a **decorative icon sitting next to a redundant text label**, so a screen reader doesn't announce the icon twice. Connect to Ch017 L4 (icon-only buttons got `aria-label`; here the icon is *not* icon-only — there's already a visible label — so it gets `aria-hidden` instead). State the critical guardrail: **never put `aria-hidden` on a focusable or interactive element** — it creates a "phantom" control that's reachable by keyboard but invisible to screen readers.
- The decision, stated as a tree (this is the literal "decision tree" of the title):
  - Hiding driven by *state/route change*, content genuinely not present right now → **conditional render** (or `display: none`/`hidden`).
  - Visually hidden but must stay announced (e.g. a label for screen-reader users only) → **`sr-only`** — named here as the right tool, with its mechanics and the full ARIA discipline deferred to **Ch027 L3** (which owns the `sr-only`/`aria-hidden`/`hidden` decision at depth, live regions, `role="status"` vs `role="alert"`). Do not re-teach `sr-only` internals; point to it.
  - Visible but must *not* be announced → **`aria-hidden`**.

Components (two, working together):
- **`StateMachineWalker`** (`kind="decision"`) implementing the hide decision tree as a click-through. Root question: "What do you need to hide, and from what?" Branches walk: *Is the content present right now?* → No → leaf **conditional render / `hidden`** (removed from both trees). Yes → *Does it need to stay announced to screen readers?* → branch into: visually gone but announced → leaf **`sr-only`** (with a one-line "the deep treatment is in the accessibility chapter"); visible but silent to AT → leaf **`aria-hidden`**; needs to reserve its box while invisible → leaf **`visibility: hidden` (`invisible`) — and reconsider, this is usually a sizing problem**. Each `Leaf` verdict names the tool; the body gives the one-line reason and the canonical example. This is the textbook `StateMachineWalker` use ("trigger before tool" decision filter — forces the student through the *order a senior asks the questions*: present-or-not first, then which tree). Do **not** wrap in `<Figure>` (it provides its own card).
- A small **`Figure` with a 2×2 grid** (HTML+CSS) — rows = "in layout tree? yes/no", columns = "in a11y tree? yes/no" — with each of the four cells labelled by the mechanism that lands there: (in both) *visible & default*, (layout only / not a11y) *`aria-hidden`*, (a11y... — note the empty/degenerate cell), (neither) *`display:none` / conditional render*, and `visibility:hidden` as the "in neither tree but *reserves space*" special case called out separately. Pedagogical goal: make the two-tree model spatial and memorable, so the decision tree's leaves have a home. Place it just before the walker so the model precedes the drill. (If the 2×2 is awkward because the cells aren't all clean, fall back to a simple labelled table; clarity over cleverness.)

`Term` candidates: **accessibility tree** (define: "the parallel tree the browser exposes to screen readers and other assistive tech; what gets announced, derived from the DOM but prunable with `aria-hidden`/`display:none`"), **assistive technology / AT** (one-liner if used as shorthand).

### Recall check: name the mode, choose the way to hide

A consolidation exercise covering both arcs — placed last in the body, before external resources, as an active-recall checkpoint (not a passive summary).

Content + components — two short exercises:
- **`Buckets`** (classification) — sort a set of UI scenarios into display-mode buckets. Buckets: `block`, `inline`, `inline-flex`, `grid`, `contents`. Items (chips): "a paragraph of body copy" (block), "a keyword highlighted mid-sentence" (inline), "an icon-and-label button" (inline-flex), "a responsive card gallery, rows and columns" (grid), "a semantic `<section>` wrapper that shouldn't break the parent flex row" (contents). Goal: verify the student can map real UI to the *choice*, which is the lesson's thesis. `Buckets` is purpose-built for this classification drill.
- **`ReactCoding`** (tests-graded, `hidePreview` not set — the visual matters) OR a **`MultipleChoice`**/`Dropdowns` for the hide decision. Prefer a small guided `ReactCoding`: starter has a decorative `<Icon>` next to a visible "Settings" label and a separate "secret debug panel" that should not be in the DOM when a flag is off. Task: add `aria-hidden` to the decorative icon and conditionally render (or `hidden`) the panel. Tests assert the icon carries `aria-hidden="true"`, the icon is *not* focusable, and the panel is absent/`display:none` when the flag is off. Goal: exercise the *decision* (which tool for which intent) in code, not just recognition. Grading criteria: icon has `aria-hidden`; panel removed from layout+a11y; no `aria-hidden` on anything interactive. If a clean tests-graded version is hard to author, fall back to a `Dropdowns` fill-in over a short prose scenario ("the decorative icon gets ___; the closed dialog gets ___; the screen-reader-only label gets ___").

Reasoning: per pedagogical guidelines, check understanding with interactive exercises at the point of relevance; two complementary formats cover the two arcs (recognition for modes, application for hiding). Guided over sandbox.

### External resources

Optional `ExternalResource` cards (mirror L1's closing pattern, `CardGrid`). Strong candidates:
- MDN — `display` (the outer/inner two-value model and the full keyword set).
- MDN — `display: contents` (the a11y caveat and current browser support).
- web.dev or MDN — the accessibility tree / `aria-hidden` (anchors the hide arc; defer depth to Ch027).
- Optionally a Kevin Powell or web.dev short video via **`VideoCallout`** on the outer/inner display model *if* a tightly-scoped one is found during fact-check — only embed if it earns its place (don't pad).

Keep to 3–4 cards; two references + one explainer is the L1-established shape.

---

## Scope

**This lesson teaches:** the `display` property as outer-role × inner-context; the modes a senior reaches for (`block`, `inline`, `inline-block`, `flex`, `inline-flex`, `grid`, `inline-grid`, `contents`, `none`) and the recognition-only tail (`flow-root`, `table`/`table-row`/`table-cell`); the matching Tailwind utilities including `hidden`; that Preflight does *not* reset `display`; the two-tree (layout × accessibility) model; the three hide mechanisms (`display:none`/`hidden`, `visibility:hidden`/`invisible`, `aria-hidden`) and the decision among them, plus their relationship to React conditional rendering.

**Out of scope — defer, do not teach:**
- **Flexbox at depth** (`flex-direction`, `flex-grow`, `justify-content`, `items-*`, `gap` mechanics) — Ch020 L3. Here `flex`/`inline-flex` are named as *modes only*; alignment classes shown only to motivate `inline-flex`, with an explicit pointer.
- **Grid at depth** (tracks, `fr`, `grid-cols-*`, areas, subgrid) — Ch020 L4. `grid`/`inline-grid` named as modes only.
- **`sr-only` internals, the full `sr-only`/`aria-hidden`/`hidden` decision, live regions, `role="status"` vs `role="alert"`, the live-region pre-mount rule** — **Ch027 L3 owns these.** This lesson names `sr-only` as a leaf in the decision tree and hands off; it teaches `aria-hidden` and `display:none`/conditional-render only to the depth the *layout* decision needs. Be careful not to drift into ARIA discipline.
- **The semantic-element choice** (when to write `<section>` vs `<div>`, landmark roles) — Ch017 L3/L4 own it; this lesson *assumes* it and states "pick the element first, then the display."
- **`aria-label` on icon-only buttons** — Ch017 L4; referenced as contrast (icon-only → `aria-label`; labelled-decorative-icon → `aria-hidden`), not re-taught.
- **Tables for real tabular data** (`<th scope>`, `<caption>`) — Ch017 L6; `table` display values are recognition-only here.
- **Responsive display variants** (`hidden md:block`, `md:flex`) — Ch021 L6; named once, deferred.
- **`position`** (which overrides flow participation but not `display`) — Ch020 L7. If a student wonders how `position:absolute` interacts, point forward; do not cover.
- **Sizing utilities** (`width`/`height`/`min-h`/`aspect-ratio`) — Ch020 L5; the `visibility:hidden` "reserve space" anti-pattern glances forward to it without teaching it.
- **`useLockBodyScroll` / scroll-locking a hidden-overlay's background** — Ch028; not relevant here.

**Prerequisites to redefine concisely (one line each, via `Term` where inline):** normal flow (re-anchor from L1), Preflight (re-anchor from L1), accessibility tree and layout tree (new, define on first use), formatting context (new). React fragments and conditional `&&` rendering are assumed from Ch017 L1 — reference, don't re-explain.

---

## Code-convention notes for downstream agents

- **Tailwind v4, CSS-first** (Code conventions §Styling): utilities are the form the student writes; `display:none` appears as `hidden`, `visibility:hidden` as `invisible`. Show CSS property names (`display: contents`) only when teaching the underlying model, then immediately name the utility.
- **JSX shape** (§Components and JSX): conditional render examples use `flag && <Node />` *only when `flag` is a real boolean* — if the example flag could be nullish, use `Boolean(flag) &&` or `flag != null &&` per the convention (and per the Ch017 zero-trap the student knows). Components are arrow functions; the `ReactCoding` starter must `export function App()` (component-doc requirement) — this is the sanctioned exception to the arrow-function default for exercise scaffolds.
- **Accessibility** (§Accessibility, "Semantic HTML first; ARIA is the fallback"): frame `aria-hidden` as the fallback *after* the semantic choice, consistent with the doc. Never show `aria-hidden` on an interactive element; the exercise actively tests against it.
- **Illustration colors** (L1 continuity divergence): `ParamPlayground`/SVG/HTML-CSS preview accents are hard-coded, *not* `@theme` tokens — deliberate, matches L1. Don't flag as a convention violation.
- **Single-breakpoint examples** (L1 continuity): author all examples at one breakpoint; responsive variants are Ch021. Deliberate divergence — note it so a reviewer doesn't "fix" it.
- **Tailwind v4 `hidden` source-order edge (fact-checked Jun 2026):** in v4 the `hidden` utility moved to the *middle* of the display-utility cascade (after `block`, before `inline-block`/`inline-flex`), so a class string like `hidden ... inline-flex` may not let `inline-flex` win over `hidden` the way it did in v3 (source order decides ties). This only bites responsive show/hide reorderings (`hidden md:inline-flex`), which are Ch021 — but don't ship any example that relies on `hidden` overriding a later inline-level display utility on the same element.

---

## Fact-check log (Jun 2026)

- **Two-value `display` syntax** (`display: block flow`, `inline flex`) reached **Baseline Widely Available in January 2026** — safe to name as recognition-only. Defaulting confirmed: outer-only (`block`/`inline`) → inner defaults to `flow`; inner-only (`flex`/`grid`) → outer defaults to `block`. (MDN; web-platform-dx web-features explorer.)
- **`display: contents` a11y caveat is still live.** MDN still documents that *some* browsers strip a `display:contents` element from the accessibility tree and labels it "incorrect behavior according to the CSS specification." The outline's hedged framing (mostly fixed, not universal, test with a screen reader, prefer Fragment) is accurate — keep the hedge; do not claim it's fully resolved.
- **Tailwind v4 utility names confirmed:** `hidden` (`display:none`), `invisible` (`visibility:hidden`, reserves space), `contents`, `inline-flex`, `inline-grid` — all current.

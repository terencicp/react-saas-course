# Grid, the 2D primitive

**Sidebar label:** Grid

---

## Lesson framing

Fourth lesson of Chapter 020 (layout and sizing), immediately after flexbox (L3). Grid is the 2D primitive — the senior reaches for it when the layout has *both* rows and columns that must align, exact column counts, or items that snap into a defined structure. The lesson's job is to install the explicit-track mental model, name the Tailwind v4 utilities that compile to it, and end on the flex-vs-grid decision that retroactively justifies the whole chapter's two-primitive split.

Pedagogical spine, carried from L3 so the chapter reads as one voice:

- **Container × item frame.** Same shape the student learned for flex: `display: grid` makes a *grid container*; direct children become *grid items*. The difference is the container now defines a 2D scaffold (tracks) and items occupy cells, auto-placed unless they say otherwise. Open by explicitly bridging from flex ("flex *distributes* leftover space along one axis; grid *defines* a structure on two and items snap in").
- **The senior question drives the intro.** A responsive card grid (3 cols desktop / 2 tablet / 1 mobile, consistent gaps, equal-width columns) is the canonical case `flex flex-wrap` gets *almost* right and grid nails. Lead with the failure (flex items shrink to content → ragged widths, orphaned last row stretches) and land on `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`. This is the most common real production grid in SaaS, so it earns the opening.
- **Tracks first, placement second, alignment third, decision last.** Sequence: container + explicit tracks (`grid-cols-*`/`grid-rows-*`) → the `fr` unit and why `grid-cols-3` is really `repeat(3, minmax(0,1fr))` → responsive without breakpoints (`auto-fit`/`minmax`) → named template areas for page shells → `subgrid` for cross-card alignment → placement (`col-span`/`col-start`) → alignment shorthands (`place-items`) → flex-vs-grid. Each concept builds on the last; cognitive load stays low because every new utility maps to one named track/placement/alignment job.
- **Minimize cognitive load via progressive complexity.** Start with the simplest grid that works (`grid grid-cols-3 gap-4`, fixed equal columns), *then* add `fr`/`minmax`, *then* responsive, *then* areas/subgrid. Never open with `grid-template-areas`.
- **Live manipulation over static figures.** Grid track sizing is a *feel* concept — `fr` vs fixed, `auto-fit` collapsing tracks as the viewport narrows. ParamPlayground (a column-count / track-template slider) is the right primitive, mirroring L3's use. DevTools grid overlay is the senior debugging reflex (named, screenshot optional).
- **Production stakes.** Frame every pattern as a real SaaS surface: pricing card grid, dashboard stat tiles, app shell (header / sidebar / main / footer), centered auth hero. The student should leave able to build a responsive card grid and a page shell from memory, and to *decide* flex vs grid on sight.

Mental model the student ends with: **flex is for one axis where the algorithm distributes space among variable-content items; grid is for two axes where I define the structure and items snap to it. Most SaaS UIs are a grid of flex compositions.**

Conventions inherited from L1–L3 (keep consistent): hard-coded accent colors inside `ParamPlayground`/SVG previews (illustrations, not project code — do not route through `@theme`); `Term` for first-use jargon; lesson components under `src/components/lessons/020/4/`; `ReactCoding` starters/targets use `export function App()`. **Deliberate divergence:** the chapter convention is single-breakpoint examples (responsive variants are Ch021), but the card-grid canonical pattern *is* `md:`/`lg:` variants — grid's headline use case is meaningless without them. Author the responsive card grid with `md:`/`lg:` and add a one-line aside that the variant *syntax* is covered in Ch021; here they read as "more columns on wider screens." Flag this in continuity notes so downstream agents don't strip the variants.

---

## Lesson sections

### Introduction (no header)

Warm, brief, problem-first. Recall flexbox from L3 (the 1D primitive, distributes leftover space). Pose the senior question: a product card grid that must be 3 columns on desktop, 2 on tablet, 1 on mobile, with *equal* column widths and consistent gaps. Show (in prose + a small `Figure`) why `flex flex-wrap gap-6` disappoints: items size to content so widths go ragged, and a lone card on the last row stretches or sits oddly. Land on the one-liner answer — `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6` — and promise the lesson installs the model behind it plus the page-shell, centering, and dashboard patterns. State the end state: build a responsive card grid and an app shell from memory, and decide flex vs grid on sight.

No component beyond a small `Figure` contrasting ragged-flex vs even-grid (two side-by-side mini card rows, real CSS so it's DevTools-inspectable — HTML+CSS per the diagrams guide). Keep it to a visual hook, not a full teach.

### A grid is a container of tracks

Install the core model. `display: grid` (Tailwind `grid`) makes a grid container; direct children become grid items, auto-placed left-to-right, top-to-bottom into cells. The container's job is to define **tracks** — the columns and rows — via `grid-template-columns` / `grid-template-rows`. Define `Term` for *track* (a single column or row), *grid item*, *grid container*, *cell*. Explicitly reuse the container×item frame from L3 so the student sees the symmetry with flex.

Show the simplest possible grid first: `grid grid-cols-3 gap-4` over six cards → two rows of three, equal widths, auto-placement. Keep this example dead simple (fixed equal columns) before any `fr`/`minmax` nuance.

Track sizing menu: fixed lengths (`px`/`rem`), the `fr` unit (next section), content keywords (`auto`, `min-content`, `max-content`, `fit-content()` — name them, mark `min-content`/`max-content` as escape hatches rare in component code / common in data tables), and `minmax(min, max)`.

Fold the DevTools grid overlay in here as a short paragraph (not a standalone section — it's a tool, not a concept): Chrome's Elements panel shows a `grid` badge beside grid containers; clicking it overlays track lines, and the Layout tab toggles line numbers, line names, and area names independently. Frame as the senior reflex — inspect the overlay before guessing utilities when an item isn't where expected (mirrors L3's DevTools framing). Screenshot optional.

Code handling: a single `Code` block for the `grid grid-cols-3 gap-4` example with its JSX. Pair it with a small SVG or HTML+CSS `Figure` showing the 3×2 track grid with cells numbered in auto-placement order — pedagogical goal: make "items flow into cells" visible. Do **not** over-annotate; this is the gentle on-ramp.

`Term` candidates: track, grid item, grid container, fr unit (defer full definition to next section).

### The fr unit and why grid-cols-3 already shrinks

Teach `fr`: one fraction of the *leftover* space after fixed and content-sized tracks are subtracted. This is the load-bearing v4 detail (**fact-checked Jun 2026 against the official Tailwind docs — confirmed**): Tailwind's numeric `grid-cols-N` compiles to `grid-template-columns: repeat(N, minmax(0, 1fr))`, **not** `repeat(N, 1fr)`. The `minmax(0, …)` lower bound is what lets a long word or wide image shrink instead of blowing the track out. So `grid-cols-2` gives two columns that share space equally *and* can shrink below their content width. Connect to the L3 `min-w-0` story (flex items had the same min-content-blowout problem; grid's default utility already fixes it for you).

The watch-out lands *here*, in the concept it qualifies: raw `repeat(3, 1fr)` (bracket form `grid-cols-[repeat(3,1fr)]`) overflows on narrow viewports because each track refuses to go below its content's min width; `minmax(0, 1fr)` (and therefore plain `grid-cols-3`) fixes it. Frame as "the utility already does the right thing; only the hand-written `1fr` form bites you."

Best vehicle: a **ParamPlayground**. One slider for column count (2–5) plus a toggle `1fr` vs `minmax(0,1fr)`, preview renders cards with one deliberately long unbreakable string. Student slides columns down / narrows and *sees* the `1fr` track overflow while `minmax(0,1fr)` clamps. Mirrors L3's ParamPlayground convention (hard-coded accent, no `@theme`). A `Readout expr` can echo the compiled template string. Pedagogical goal: make the abstract `minmax(0,1fr)` rule a felt cause-and-effect, the single most common grid bug.

`Term` candidates: leftover space (reuse L3's "leftover space as a layout tool" phrasing for continuity).

### Tailwind's grid utilities at a glance

Brief reference section grounding the rest of the lesson — a compact map so later patterns read fluently. Cover, grouped by job:

- Tracks: `grid-cols-*`, `grid-rows-*` (numeric + bracket arbitrary `grid-cols-[200px_1fr]`).
- Spacing: `gap-*`, `gap-x-*`, `gap-y-*` (the unified row+column gap; reuse L3's gap-is-the-default stance, no per-item margins — one sentence, defer the full gap-vs-legacy comparison to L6).
- Placement: `col-span-*` / `row-span-*`, `col-start-*` / `col-end-*` / `row-start-*` / `row-end-*`.
- Implicit tracks: `auto-cols-*` / `auto-rows-*`, `grid-flow-row` / `grid-flow-col` / `grid-flow-dense` (auto-placement direction; mark `dense` with the same a11y caveat as L3's `flex-row-reverse` — reorders visually, not in source/tab order).

Vehicle: a small `Code` block per group is overkill — use one tight reference table (markdown table) or a single `Code` block listing representative utilities with `// comment` job labels. Keep it skimmable; this is a lookup, not a teach. The teaching happens in the pattern sections that follow.

### Responsive card grids without media queries

The `repeat(auto-fit, minmax(<min>, 1fr))` pattern: create as many equal tracks as fit, each at least `<min>` wide, growing to fill. The grid reflows the column *count* itself as the container resizes — no breakpoints. Bracket form in Tailwind: `grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]`.

Contrast the two responsive strategies side by side (this is the decision, not just a feature):

- **`auto-fit` + `minmax`** — "however many cards fit, each at least this wide." Container-driven, no breakpoints. Reach when the exact column count doesn't matter, only a minimum card size.
- **Responsive variants** `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` — "exactly N columns at this breakpoint." Reach when the design specifies counts. (This is the senior-question pattern from the intro.)

`auto-fit` vs `auto-fill`: `auto-fit` collapses empty trailing tracks so present items stretch to fill; `auto-fill` keeps phantom empty tracks. `auto-fit` is the card-grid reach — state it as the default and `auto-fill` as the rare "I want the gaps reserved" case. This watch-out lives here, in the section teaching the pattern.

Vehicle: `CodeVariants` with two tabs — Tab 1 "Auto-fit (no breakpoints)" with the `auto-fit minmax` bracket form, Tab 2 "Breakpoint counts" with `md:`/`lg:` variants — each tab's prose names *when* to reach for it. This is the purpose-built component for a two-approach comparison of the same UI. Follow with one line pointing forward: container queries (`@container`) are the component-scoped cousin of `auto-fit` and are covered in Ch021 (name only, do not teach).

Add the Ch021 aside about responsive-variant *syntax* here (one sentence): `md:`/`lg:` are breakpoint prefixes covered next chapter; today read them as "applies at this screen width and up."

`Term` candidates: media query (brief — the thing `auto-fit` avoids), breakpoint (brief).

### Page shells with named template areas

`grid-template-areas` for the header / sidebar / main / footer app shell — the canonical SaaS layout skeleton. Define the tracks, then a template that reads as ASCII art; each child names which area it occupies via `grid-area`.

**Tailwind v4 reality (fact-checked Jun 2026 — this corrects the chapter outline).** Core Tailwind v4 ships **no** `grid-areas-*` / `area-*` utilities; those come only from third-party plugins (`tailwindcss-grid-areas`, savvywombat), which the course's minimum-viable-stack thesis rules out. The senior-default v4 form is the **arbitrary/bracket utility**:

- On the container: `grid-cols-[200px_1fr] grid-rows-[auto_1fr_auto] [grid-template-areas:'header_header''sidebar_main''footer_footer']`.
- On each child: `[grid-area:header]`, `[grid-area:sidebar]`, etc.

Teach the bracket form as *the* way, not a fallback. Two load-bearing authoring gotchas to call out explicitly (both are common copy-paste breakers):

1. **Spaces become underscores** inside a bracket value — Tailwind reads `_` as a space. So `'header_header'` is one grid row of two `header` cells. The row strings sit directly adjacent (`'header_header''sidebar_main'`) with no separator between rows.
2. The named areas in `grid-template-areas` and the `grid-area` names on children must match exactly, and the template must be rectangular (every row the same number of cells).

Pedagogical goal: show that the template *is* the layout, readable at a glance, and mobile rearrangement is a single template swap (sidebar moves below main → rewrite the area strings, e.g. a single-column mobile template `'header''main''sidebar''footer'`). Mention as the senior alternative that a simple shell (header/main/footer, no sidebar split) is often cleaner with plain `col-span-full` on header/footer than with named areas — reach for areas when the 2D arrangement genuinely earns the named template.

Vehicle: **`AnnotatedCode`** over the page-shell JSX (utilities inline on the elements) — this is the one block in the lesson complex enough to warrant stepped attention (container tracks → the `grid-template-areas` template string → each child's `[grid-area:…]` assignment → the gap). Step the student through it. Then a `Figure` (HTML+CSS, real grid so it's inspectable) rendering the actual shell with regions labeled, presented via `TabbedContent` (or `DiagramSequence`) with a "Desktop" tab and a "Mobile" tab showing the two templates side by side, to make "one template change rearranges everything" concrete.

`Term` candidates: app shell / page shell (one definition — the fixed-chrome-around-scrolling-content skeleton).

### Subgrid for cross-card alignment

The problem subgrid solves: a card grid where each card has its own internal rows (header / image / body / footer), and you want those rows to align *horizontally across the whole row* regardless of each card's content length — without subgrid, a card with a longer title pushes its image down out of step with its neighbors. Putting `grid-rows-subgrid` (or `grid-cols-subgrid`) on the card makes the card's tracks adopt the parent grid's tracks, so every card's header/image/body lines up.

Keep this gentle and scoped — it's the most advanced concept and easy to overcook. Teach the *when* (cross-item alignment of internal sections) more than the full mechanics. `grid-cols-subgrid` / `grid-rows-subgrid` are confirmed first-class Tailwind v4 utilities (fact-checked Jun 2026). Subgrid is Baseline (supported across all current major browsers), so it's production-safe in 2026 — state this so the student doesn't reach for a fallback.

Vehicle: `CodeVariants` or `TabbedContent` with a before/after — "without subgrid" (ragged internal rows) vs "with subgrid" (aligned), each a small live `Figure` or rendered card row so the misalignment is visible. The visual contrast carries the concept better than prose. Mark the mechanic the student must get right: the card spans the parent's rows (the card is itself a grid item that must span the relevant tracks, e.g. `row-span-4`) *and* declares `grid-rows-subgrid` so its children land on the inherited lines.

`Term` candidates: subgrid, Baseline (brief — "supported across all current major browsers"; reuse if defined earlier in chapter).

### Centering and aligning the whole grid

Alignment shorthands. `place-items-*` (shorthand for `align-items` + `justify-items`, item alignment *within* each cell) — `grid place-items-center min-h-dvh` is the most concise full-centering pattern in CSS, the auth-hero / empty-state reach. `place-content-*` (shorthand for `align-content` + `justify-content`, positions the *track group* when tracks don't fill the container). `place-self-*` overrides one item. Name the longhands once at the call site (`items-*`/`justify-items-*`/`content-*`) per the "underlying primitive at the call site" guideline.

Cross-reference: this is the grid counterpart to L3's flex `justify-*`/`items-*`, and `min-h-dvh` is the viewport-fill unit that L5 owns (name only, used here).

Pedagogical goal: give the student the single most-reached-for grid one-liner (`grid place-items-center`) and disambiguate items-alignment (within cells) from content-alignment (the track group as a whole) — the pair students reliably confuse.

Vehicle: a `Code` block for the `grid place-items-center min-h-dvh` hero, plus a small `Figure` (two-panel HTML+CSS) contrasting `place-items-center` (item centered in its cell) vs `place-content-center` (whole track group centered in an oversized container) — the visual is what makes the distinction stick.

### Placing items across tracks

Item placement for layouts where auto-placement isn't enough. `col-span-*` / `row-span-*` (span N tracks — covers most cases, e.g. a featured dashboard tile spanning 2 columns), `col-span-full` (span the whole row — the clean way to make a header/footer full-width in a multi-column grid), explicit line numbers `col-start-* col-end-*` (precise placement), and a brief name-check of named grid lines (bracket form, line names declared in the track definition — useful in complex shells, mark as advanced/optional). Grid lines are numbered from 1; a quick SVG/HTML `Figure` of a grid with its line numbers (1..N+1) demystifies start/end.

Watch-out in place: `col-span-N` in a grid with fewer than N columns clamps to the available columns (no overflow, but not what you drew). One sentence.

Pedagogical goal: the student can build a dashboard where one tile is bigger than the rest (`col-span-2 row-span-2`) — a concrete, motivating use.

Vehicle: `Code` for a stats-dashboard snippet with one `col-span-2` featured tile, plus the line-number `Figure`. This section also feeds the exercise below.

### The canonical grid layouts a senior reaches for

Consolidation section naming the five production patterns so the student leaves with a reusable vocabulary (mirrors L3's five-canonical-layouts close):

1. Card grid, fixed counts at breakpoints — `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`.
2. Card grid, no breakpoints — `auto-fit minmax`.
3. Page shell — sidebar track + full-width header/footer via named template areas (or `col-span-full`).
4. Centered hero / empty state — `grid place-items-center min-h-dvh`.
5. Dashboard with a featured tile — `col-span-2 row-span-2` on one item.

Vehicle: a `TabbedContent` figure with five tabs, each rendering the live pattern (real grid, inspectable) with the utility string as caption — built via a lesson component `src/components/lessons/020/4/GridLayout.astro` (mirrors L3's `FlexLayout.astro`, renders a pattern by `pattern` prop). Pedagogical goal: a single scannable gallery the student returns to as a cheat sheet. Reuse the component if a later lesson wants a live grid pattern.

### Flex or grid — the decision

The chapter payoff. The rule, stated cleanly:

- **Flex** = one dimension. A row or a column of variable-content items where you want the algorithm to distribute leftover space. Navs, toolbars, button clusters, form rows, vertical stacks.
- **Grid** = two dimensions. A rows-and-columns structure where items snap to tracks, columns must be equal/exact, sections must align across items (subgrid), or you want responsive column *counts*. Card grids, page shells, dashboards.
- **The synthesis:** most SaaS UIs are *a grid of flex compositions* — grid lays out the page regions and card galleries; flex arranges the contents inside each region/card. They compose, they don't compete.

Heuristics to resolve the gray zone: "Do I care about aligning a second axis? → grid." "Is it a single row/column distributing space? → flex." "Equal-width columns or exact counts? → grid." "Content-sized items hugging their content? → flex."

Vehicle: a **`StateMachineWalker`** (`kind="decision"`) — the "which primitive do I reach for?" decision tree. Root question: "One axis, or do rows *and* columns both matter?" → branches to follow-ups (equal columns? align sections across items? distribute leftover space?) → leaves recommending flex or grid with a one-line reason and the canonical utility. This component is purpose-built for "trigger before tool" senior-decision filters and forces the student through the *order* a senior asks the questions. Pedagogical goal: convert the rule into an internalized reflex. Follow the walker with one tight summary sentence (the synthesis above) so the decision has a verbal anchor too.

Immediately after the walker, drill the decision cheaply with a `Buckets` exercise: two buckets ("Reach for flex" / "Reach for grid"), items like "horizontal nav bar," "pricing card grid," "icon + label button," "dashboard with a featured tile," "vertical settings list," "app shell with sidebar," "toolbar with a spacer." Classification is the right exercise shape for a binary decision, and it cements the lesson's payoff. Prefer this guided drill over any sandbox.

`Term` candidates: none new; this section is synthesis.

### Hands-on: build the responsive card grid (exercise)

Place this practice exercise right after "The canonical grid layouts" (interleave per pedagogy — not bolted on at the very end). A `ReactCoding` exercise, **target-match** mode (`target` + `live`), `export function App()` scaffold: starter renders six product cards with no grid container; target shows them as `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6`. Student adds the grid utilities to match. `instructions`: "Make the cards a responsive grid — one column on mobile, two on tablet, three on desktop, with a consistent gap." Visual target-match is right here because the win is *seeing* the layout, and AI feedback compares their TSX to the reference. Optionally a second tests-graded micro-exercise for the dashboard featured tile (`col-span-2`) checking the computed grid via `getComputedStyle`/`getBoundingClientRect` — keep optional; the target-match card grid is the must-have.

### External resources (optional, end)

One or two `ExternalResource` cards: MDN CSS Grid Layout guide and/or the Tailwind v4 grid-template-columns reference. Optional `VideoCallout` only if a high-quality, current (≤ a few months old or evergreen-canonical) grid explainer surfaces during the build — L3 shipped one, so a grid video keeps the chapter consistent, but only include if a genuinely good one exists; don't force it.

---

## Scope

**Assumes from prior lessons (redefine in one line max, do not re-teach):**
- `display: grid`/`inline-grid` and the outer-role × inner-formatting-context frame — L2 (picked up in intro, one sentence).
- Container × item model, main/cross axis, "name the axis," `gap` as spacing default, `min-w-0` content-blowout story, five-canonical-layouts pattern — L3 (explicitly bridged in intro; reuse, don't relitigate).
- Box model, `border-box`, `--spacing` scale feeding `gap-*` — L1.
- Sibling-margins-forbidden / `gap` is the spacing tool — L1/L3/conventions (assumed, one sentence; full gap-vs-legacy comparison is L6).
- Tailwind utility + variant syntax, `className`, arbitrary/bracket values — Ch018.

**Does NOT cover (defer explicitly):**
- The `gap` decision vs legacy `space-x`/margin tricks — L6 (this lesson assumes `gap`).
- Sizing utilities at depth (`w-*`, `min-h-*`, `aspect-*`, the `dvh` family) — L5. `min-h-dvh` is *used* in the centering pattern but named only, not taught.
- Responsive-variant *syntax* and the breakpoint model (`sm:`/`md:`/`lg:`) — Ch021 L6. This lesson *uses* `md:`/`lg:` for the card grid (deliberate divergence, see framing) but defers the syntax teach with a one-line aside.
- Container queries (`@container`, `@sm:`) — Ch021 L7. Named once as the component-scoped cousin of `auto-fit`; not taught.
- Stacking context / `z-index` inside grid items — L9.
- Position/inset (`absolute` items, sticky inside grid) — L7.
- Overflow / scroll containers inside grid regions — L8.
- Animating grid track changes — out of scope (chapter doesn't ship it).
- Multi-column layout (`columns-3`) — recognition only elsewhere, not here.
- `min-content`/`max-content`/`fit-content()` at depth — named as escape hatches, full treatment is data-table territory, not this lesson.
- Logical grid placement edge cases / RTL track direction — keep the RTL story honest (one line if natural) but logical inset utilities are L7; don't open that here.

---

## Notes for downstream agents

- **Fact-check results (Jun 2026), already folded into the sections above — do not regress them:**
  - `grid-cols-N` / `grid-rows-N` compile to `repeat(N, minmax(0, 1fr))` — **confirmed** against official Tailwind v4 docs. The `minmax(0,…)`-vs-`1fr` teaching point is solid.
  - `grid-cols-subgrid` / `grid-rows-subgrid` are **confirmed** first-class v4 utilities; subgrid is Baseline.
  - **Correction to the chapter outline:** core Tailwind v4 has **no** `grid-areas-*` / `area-*` utilities (third-party plugins only). The lesson teaches the bracket form `[grid-template-areas:'…']` + `[grid-area:…]` as the canonical v4 approach, with the underscore-for-spaces gotcha. Do not reintroduce the plugin utilities.
- **Deliberate convention divergence:** responsive `md:`/`lg:` variants appear in the card-grid pattern despite the chapter's single-breakpoint convention. Intentional — grid's headline use case requires them. Do not strip; do add the one-line "syntax covered in Ch021" aside.
- **Lesson components to build:** `src/components/lessons/020/4/GridLayout.astro` (renders the five canonical patterns by `pattern` prop, mirrors L3's `FlexLayout.astro`; reuse for any later live-grid need). Optionally a small `GridTracks.astro` SVG/HTML figure for the numbered-cells and line-number visuals if a plain `Figure` + CSS grid doesn't suffice.
- Keep ParamPlayground accents hard-coded (illustration divergence, per L1–L3). Keep `ReactCoding` scaffolds on `export function App()`.

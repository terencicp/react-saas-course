# Lesson title

- **Title:** Flexbox, the 1D primitive
- **Sidebar label:** Flexbox

# Lesson framing

This is the first lesson where the student *composes* a layout instead of describing a single box. Chapters before this gave them the box model (L1), display modes including `flex`/`inline-flex` as keywords (L2), and the spacing scale. This lesson cashes `display: flex` in: the algorithm that distributes leftover space across a row or column of variable-content items.

**The senior mental model to install (in this order, gradually layered):**
1. A flex container has **two axes** — main and cross. Every flex property is named for one of them. The student's reflex must become: *name the axis first, pick the property second.* This is the single highest-leverage idea in the lesson; `justify-*` vs `items-*` confusion is the #1 beginner failure, and it evaporates once the axes are concrete.
2. Items **grow, shrink, and have a basis.** The 2026 senior writes one of three named shorthands (`flex-1`, `flex-auto`, `flex-none`) plus `shrink-0`, almost never the three longhand values.
3. **`gap` does the spacing.** Already the course default (conventions: "sibling margins are forbidden"); here it's just assumed and used.
4. The **`min-w-0` companion fix** for `flex-1` — the most common flex bug in 2026, and the thing that separates someone who "knows flexbox" from someone who ships it.

**Pedagogical spine.** This is a *visual, spatial, kinesthetic* topic. Prose alone fails it. The dominant vehicle is **live, devtools-inspectable CSS** — `ParamPlayground` for "feel the parameter move the layout" and `ReactCoding` (live/target-match) for "build the layout yourself." Real CSS layout over absolute-positioned approximations everywhere, per the HTML+CSS diagram doc, so the student can open devtools on any figure and see the real flex overlay. Cap on diagrams: no static box-and-arrow figure where a live playground carries the same idea better.

**Framing stance (per pedagogical guidelines).** Lead every section with the senior question / production stakes, not the syntax. The lesson opens on a concrete artifact every SaaS has — the top nav bar (logo left, links center-ish, sign-in right) — and resolves it to `flex items-center justify-between`. The five canonical layouts at the end are the "what you can now build" payoff and double as the systems-design framing: a senior reaches for a *known small set* of flex patterns, not ad-hoc CSS each time.

**Mirror L1/L2 conventions.** Sentence-case `## ` headers that are *claims/skills*, not topic-dumps. Warm two-paragraph intro stating goal + what it cashes in from prior lessons + the concrete artifact built. `Term` for non-obvious vocab. Hard-coded accent colors inside `ParamPlayground`/SVG previews are a sanctioned divergence from the OKLCH-token convention (illustrations, not project code) — already established in L1/L2 continuity notes; do the same here. Single breakpoint only — responsive flex (`md:flex-row`) is Chapter 021, do not author responsive variants. `ReactCoding` starters use `export function App()`.

**Reuse opportunity.** L2 built the "outer role × inner formatting context" frame and named `flex`. This lesson should open by explicitly picking that thread up ("you flipped on `flex` in the last lesson; now here's what the algorithm does with it") — continuity, not re-teaching.

---

# Lesson sections

## Intro (no header)

Two paragraphs, warm and terse. Open on the canonical artifact: the app's top navigation bar — logo pinned left, nav links, a sign-in button pinned right, everything vertically centered. State plainly that the 2026 reach is `flex items-center justify-between` and that by the end of the lesson the student will read that line and know exactly what each utility does — and build four more layouts like it. Connect back: L2 turned `flex` on as a display mode; this lesson is what the flex *algorithm* does with the children once it's on. Preview the payoff: name the axis, and `justify` vs `items` stops being a coin flip; learn `min-w-0` and your flex rows stop overflowing.

Reasoning: satisfies "decisions before syntax" and "connect to what they know." The nav bar is the most universal flex artifact and recurs as the closing canonical layout, bookending the lesson.

## A flex container has two axes

The load-bearing section. Install the container + two-axis model before any property.

- `display: flex` (Tailwind `flex`) makes the element a **flex container**; its direct children become **flex items** (automatically — no per-child opt-in). Name `<Term>` for "flex item" and "flex container" if not already glossed.
- **Main axis** = the direction items lay out (row by default, left-to-right in LTR — note it follows `direction`, foreshadowing logical behavior without diving in). **Cross axis** = perpendicular.
- The reflex to drill: *every flex property targets one axis.* `justify-*` works the main axis; `items-*` / `align-*` work the cross axis. The student names the axis, then picks the property.

**Diagram (HTML+CSS, real flex, inside `<Figure>`):** a horizontal flex row of 3 labeled item boxes with a thick arrow along the main axis ("main axis →") and a perpendicular arrow ("cross axis ↓"). Goal: make the two axes concrete and spatial *before* any utility name. Keep it compact (short viewport rule). Add `margin: 0` to every inner element (prose-margin gotcha). Then a second tab or adjacent figure showing the *same* boxes after `flex-direction: column` so the student sees the axes **rotate** — the key insight that main isn't "horizontal," it's "the layout direction." Use `TabbedContent` (Row / Column tabs) to hold both so they read as one idea, OR a `DiagramSequence` (row → column) if the rotation animation reads better; prefer `TabbedContent` for simplicity.

`Tooltip` candidates: "flex item", "flex container", "main axis", "cross axis" via `Term` (define once, reuse).

Reasoning: this is where beginners fail. Spending the first real section purely on axes — before growth, before alignment — is the deliberate cognitive-load investment that pays off in every later section.

## Direction and wrapping

- `flex-row` (default) and `flex-col`. The `-reverse` cousins are **recognition only**: name them, then immediately land the watch-out — *visual reorder ≠ source/tab order*; keyboard navigation follows source. The senior reach when one item must move is `order-*` on that single item, not a reverse on the container. Keep this brief; it's a trap-flag, not a feature to drill.
- `flex-wrap` enables multi-line wrapping. Note `gap-y-*` becomes the row gap once items wrap. Keep light — wrap gets its full workout in the grid lesson's alternatives and in the canonical layouts; here just establish it exists and what it does.

**Optional micro-playground:** a `ParamPlayground` with a `select` for `flex-direction` (row / row-reverse / column / column-reverse) over 3 numbered boxes, so the student *sees* reverse flip visual order while a `Readout` could note "source order unchanged." Only include if it doesn't bloat the lesson — the axes playground may already carry direction. Decision: fold direction into the **axes** section's column tab instead and keep this section prose-light, to control length.

Reasoning: direction is cheap once axes are understood; the only thing worth real ink is the a11y trap on `-reverse`, which is a senior-mindset point.

## Sizing items: grow, shrink, basis

The second pillar. Frame as the production question: *when the container is wider (or narrower) than the items need, who absorbs the slack?*

- The three underlying properties named once at the call site (per "underlying primitive at the call site"): `flex-grow`, `flex-shrink`, `flex-basis`, and that `flex` is their shorthand. Then immediately pivot to the **three named shorthands the student will actually write**:
  - `flex-1` → grow and shrink from a zero basis; equal shares of available space. The reach for inputs/main content that should fill leftover room.
  - `flex-auto` → grow and shrink but from the **content** basis (respects intrinsic size). Subtle but real difference from `flex-1`; show side by side.
  - `flex-none` → don't grow, don't shrink; size is the content/declared width. 
  - `shrink-0` → the canonical reach for sidebars, fixed-width avatars, icons, anything whose width *is the design*. Pair with the watch-out that items shrink by default.

**Component: `ParamPlayground`.** A row of 3 boxes; a `select` lets the student apply `flex-1` / `flex-auto` / `flex-none` to the middle box (or all), plus a width slider on the container. Goal: *feel* how leftover space gets distributed and how a `flex-none` box holds its size while neighbors flex. This is the section where "manipulate the decision" (the component's stated USP) is exactly right.

**Component: `CodeVariants`** (or `AnnotatedCode`) to contrast `flex-1` vs `flex-auto` on the same 3-item row — one paragraph each on the basis difference. Tightest way to show the distinction the playground hints at.

Reasoning: the three-shorthand framing is the 2026 senior form (per chapter outline). Teaching the longhand triplet at depth would violate "teach the form they will write" — name it, move on.

## Aligning items on both axes

Now the axes pay off: every alignment utility is "pick the axis, pick the value."

- **Main axis — `justify-*`:** `start` / `end` / `center` / `between` / `around` / `evenly`. Anchor `justify-between` as the nav-bar workhorse.
- **Cross axis — `items-*`:** `stretch` (default — call out that this is why a flex child fills the cross axis unless told otherwise) / `start` / `end` / `center` / `baseline`.
- `items-baseline` watch-out, taught *in place*: for a row mixing font sizes (a heading next to a timestamp), `items-center` centers the *boxes* and the text looks misaligned; `items-baseline` aligns the text baselines. This is a senior-eye detail worth a sentence and a tiny visual.
- `self-*` (`align-self`) overrides one item's cross-axis alignment — name it, one-line reach (a single avatar pinned top in an otherwise-centered row).
- `align-content` (`content-*`) controls the *lines* of a wrapped container — explicitly down-rank: "rarely needed; `gap-y-*` usually does the job." One sentence, recognition only.

**Component: the centerpiece `ParamPlayground`.** Two `select` controls — one for `justify-content` (the 6 values), one for `align-items` (the 5 values) — driving a flex row of 3 boxes in a tall-ish container (so cross-axis movement is visible). Two `Readout` chips echoing the current `justify`/`items` value, OR just let the live preview speak. Goal: the student sweeps both dropdowns and *builds the muscle memory* that justify = horizontal-ish (main), items = vertical-ish (cross) in the default row. This single widget is the lesson's spine — it makes the axes→property mapping kinesthetic.

**Exercise (`Buckets`, two-column):** sort a set of utilities into **Main axis (justify-\*)** vs **Cross axis (items-\*)** buckets — `justify-between`, `justify-center`, `items-center`, `items-baseline`, `items-stretch`, `justify-evenly`, `self-end`(trick: cross), etc. Goal: cement the axis classification that the whole lesson hinges on. Grading: chip turns green/red on Check. This is the right check because the misconception is *categorical* (which axis?), which is exactly what `Buckets` tests.

Reasoning: alignment is where the two-axis investment compounds. The playground + bucket drill together attack the central misconception from the "feel" side and the "classify" side.

## Spacing items with gap

Short section — `gap` is already the course default and was forward-referenced from L1.

- Every flex container with multiple items uses `gap-*`. It adds space **between** items only — no leading/trailing edge collision with the parent's padding (contrast with what margins would do). `gap-x-*` / `gap-y-*` for asymmetric, and `gap-y-*` is the row gap when wrapping.
- One sentence cross-referencing that the full gap-vs-margin / `space-x` comparison is its own later lesson (L6) — here, `gap` is simply assumed. Do **not** re-teach or re-litigate; conventions forbid sibling margins and L6 owns the comparison.

**No new component needed** — `gap` shows up live in the playgrounds and the canonical layouts. Optionally a one-line `gap` slider could be added to the alignment playground, but keep scope tight.

Reasoning: respects scope boundary with L6. The student already met the *forbidden margins* rule; this is reinforcement, not a new fight.

## The min-w-0 fix every flex row needs

A dedicated section because this is *the* production flex bug and the senior-mindset highlight of the lesson. Frame in real stakes.

- The setup: a `flex` row with a `flex-1` text region (e.g. a long file name, an email subject, a URL) next to a fixed control. The long text **blows the row wider than its container** and overflows / pushes the neighbor — instead of truncating.
- The why: flex items default to `min-width: auto`, which clamps an item to its **min-content** width (it refuses to shrink below its longest unbreakable content). `flex-1` does *not* override this. `<img>` and form controls have implicit min-content widths too — same blowout.
- The fix: add `min-w-0` (or `min-w-fit` when content width must be respected) to the flexing item so it can shrink below content width; the text then truncates/wraps as intended (pair with `truncate` for the common ellipsis case — name it lightly, it's a text utility from later, but it's the natural partner).

**Component: `CodeVariants` (before/after, `del`/`ins` marks).** Tab 1 "Overflows" — the `flex-1` row without `min-w-0`, long string spilling. Tab 2 "Fixed" — same row with `min-w-0 truncate` added (`ins`). One paragraph each. This before/after is the ideal `CodeVariants` use (the doc explicitly calls out `del`/`ins` for before/after framing).

**Exercise (`ReactCoding`, target-match, `live`):** give the student a broken `flex` row (avatar `shrink-0`, a long-text `flex-1` middle, a button) that overflows; target shows it fixed. Student adds `min-w-0` (+ `truncate`). Grading: target-match visual compare (per `ReactCoding` target mode). Goal: the student *experiences* the bug and the one-class fix — the thing they'll hit in week one of real work. Could also be tests-graded (assert the middle element's `scrollWidth`/`getBoundingClientRect` width ≤ parent), but target-match is simpler and the visual is the point.

`Tooltip`/`Term` candidate: "min-content" (define: the smallest width an element can take without its content overflowing — roughly its longest unbreakable word).

Reasoning: chapter outline flags this as "the most common flex bug in 2026." Giving it its own section (not a buried watch-out) is the senior-mindset move and the lesson's memorable takeaway.

## Five flex layouts you'll reach for

The synthesis / payoff section — the systems-design framing that a senior composes from a *known vocabulary* of patterns. Each is a tiny labeled code block (`Code`, or grouped under one `TabbedContent`) with the utility string and a one-line "when." Keep each terse; these are reference patterns, not deep dives.

1. **Top nav bar** — `flex items-center justify-between` with `gap-*` on each cluster. Closes the loop opened in the intro. Show the logo / links / sign-in structure.
2. **Form row** — a `shrink-0` label + a `flex-1` input. Ties `shrink-0` and `flex-1` together in one line.
3. **Vertical card stack** — `flex flex-col gap-*`. The everyday list/stack.
4. **Toolbar with a spacer** — two clusters pushed apart by a `flex-1` spacer (or `justify-between`); show the `ml-auto`-free way. Demonstrates "leftover space as a layout tool."
5. **Card with a bottom-pinned footer** — `flex flex-col h-full` on the card + `flex-1` on the body region so the footer sticks to the bottom regardless of body length. The "aha" pattern that shows flex-col + grow solving vertical distribution.

**Component choice:** a single `TabbedContent` with 5 tabs (one per pattern), each tab = a live HTML+CSS mini-rendering of the pattern **plus** the class string beneath, so the student sees pattern↔code together and can devtools-inspect each. Captions name the "when." This is `TabbedContent`'s exact use (alternatives/variants of one idea: "the senior's pattern shelf"). Cross-reference lightly that sizing utilities (`h-full`, `max-w-*`) get their own lesson (L5) — don't teach them here.

**Closing exercise (`ReactCoding`, target-match, `live`):** rebuild the top nav bar from scratch — given logo/links/button markup unstyled, match the target (`flex items-center justify-between gap-*`). The capstone that proves the whole lesson. Goal: student produces the artifact the lesson opened on, unaided.

Reasoning: "five canonical patterns" is straight from the chapter outline and embodies the course thesis (a senior reaches for a settled set, not ad-hoc CSS). Bookending with the nav bar gives the lesson narrative closure.

## DevTools: the flex overlay

Short, mirrors L1's box-model-panel section (recurring "debug it for real" beat).

- In Chrome/Firefox Elements panel, a `flex` badge next to a flex container toggles a colored **overlay** showing the main/cross axes, the gaps, and item bounds. The senior move when alignment "looks wrong": turn on the overlay and *read* which axis the items are sitting on, instead of guessing utilities.
- Tie back to the two-axis model: the overlay literally draws the two axes the lesson has been teaching.

No screenshot required (prose carries it, matching L1's choice to skip the box-model screenshot); a downstream screenshot via `Screenshot` component could land it later if desired — note as optional.

Reasoning: consistency with the chapter's DevTools beat; reinforces the axes model with the real tool.

## External resources

`CardGrid` of `ExternalResource` cards, mirroring L1's closer. Candidates (downstream agent to verify links live):
- **CSS-Tricks — A Complete Guide to Flexbox** (the canonical reference; every property visualized).
- **MDN — Basic concepts of flexbox** (the two-axis model, authoritative).
- **Flexbox Froggy** (interactive game — excellent for kinesthetic reinforcement of `justify`/`items`).
- Optional: **Josh Comeau — An Interactive Guide to Flexbox** (deep interactive explainer; strong for the growth/shrink algorithm).

Optional `VideoCallout`: a short, current flexbox explainer if the resourcer finds one ≤ a few minutes that reinforces the axes model — only if it adds over the interactive resources; do not force it.

---

# Scope

**Assumed from prior lessons (redefine in one phrase max, do not re-teach):**
- `display: flex` / `inline-flex` as display keywords and the outer-role × inner-formatting-context frame (L2). This lesson *uses* `flex`; it does not re-explain what a display mode is.
- The box model, `border-box`, and that widths compose by addition (L1).
- The `--spacing` scale feeding `gap-*` (L1).
- Sibling margins forbidden / `gap` is the spacing tool (L1 forward-ref + conventions) — assumed, used, not litigated.
- Utility + variant syntax, `cn()`, Tailwind v4 (Chapter 018).

**Explicitly out of scope (defer, with a one-line forward pointer where natural):**
- **Grid** and any 2D layout, and the full flex-vs-grid decision — L4 owns it. This lesson may say "grid is the 2D primitive, next lesson" once, no more.
- **Sizing utilities** at depth — `w-*`, `h-*`, `h-full`, `max-w-*`, `aspect-*`, `min-h-dvh` — L5. Use `h-full`/`max-w-*` in canonical layouts only as needed, flagged as "sizing lesson covers this."
- **The gap-vs-`space-x`-vs-margin comparison** — L6 owns it. Assume `gap`.
- **Responsive variants** — `md:flex-row`, breakpoint-driven direction changes — Chapter 021. Author at a single breakpoint only.
- **Layout animation / transitions** — Chapter 021 L5.
- **`position: absolute` children inside flex items** — recognition only at most; L7 owns positioning. Do not cover stacking/z-index (L9).
- **`order-*`** beyond the one-line `-reverse` alternative mention — not a focus.
- **`place-items`/`place-content`** — those are grid shorthands; do not introduce here (L4).
- Multi-line `align-content` at depth — recognition only.

---

# Code conventions notes

- `gap` for spacing in flex containers; **no sibling margins** — already the canonical rule (conventions §Styling). Every example obeys it.
- Logical properties are the project default (`ps-*`/`pe-*`), but this lesson is physical/axis-neutral by nature (flex utilities aren't directional); no action needed beyond noting main axis "follows `direction`" so the RTL story stays honest. Do not introduce logical *inset* utilities (L7/L1 territory).
- Hard-coded accent colors in `ParamPlayground`/SVG illustrations are a **deliberate divergence** from the OKLCH three-tier token convention (illustrations, not shippable project code) — sanctioned in L1/L2 continuity. Downstream agents: keep illustration colors inline, do not route through `@theme`.
- `ReactCoding` starters/targets use `export function App()` (sanctioned exception to the arrow-fn default, per L2 continuity).
- Single breakpoint, no responsive variants (Chapter 021 boundary) — deliberate staging, noted so downstream agents don't "improve" examples by adding `md:`.

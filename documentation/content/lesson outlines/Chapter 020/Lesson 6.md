# Lesson 6 — Gap, the universal spacing default

- **Title (h1):** Gap, the universal spacing default
- **Sidebar label:** Gap and spacing

---

## Lesson framing

This is a short, decision-heavy lesson, not a syntax dump. The conceptual surface is tiny — `gap` is a single property on a flex/grid parent — but the senior payload is a *reflex* and a *mental model*, not a utility list. By Chapter 020 the student has met `gap` repeatedly (L1 forward-referenced it, L3 and L4 already used `gap-*` as the assumed spacing default). This lesson is where that debt is paid in full: it names *why* `gap` is the default, names the legacy alternatives (`margin-bottom`-on-every-child, the `* + *` owl, Tailwind's `space-x`/`space-y`) with the precise failure mode that makes each obsolete, and installs the three-word spatial model the student carries for the rest of the course.

The spine of the lesson is the **padding / gap / margin parallel**: padding = space *inside* an element, gap = space *between* siblings, margin = space *outside* an element (push away from things in a different container). This is the mental model the student should leave with. Once it lands, "where does this spacing go?" stops being three competing options and becomes one obvious answer per situation. The senior conclusion the whole lesson drives toward: in 2026 a developer writes `padding` and `gap` constantly and `margin` almost never (the `mx-auto` centering case from L1 is the rare survivor).

Pedagogical decisions for the lesson as a whole:

- **Lead with the evolution narrative, told once, briefly.** The chapter outline frames `gap` historically (2018 `margin-bottom`, 2021 `space-y`, 2026 `gap`). This is the single best motivator — the student *feels* the pain `gap` relieves only if they see the per-child bookkeeping it replaced. But the course thesis forbids historical detours, so this is one tight beat in the intro, not a section. The legacy patterns are taught at **recognition depth only** (you will see these in old code / AI output trained on old code; you will not write them).
- **The pain is best *felt*, not described.** Two of the three `gap`-wins arguments (wrap breakage, conditional-child breakage) are visual/behavioral failures that a static paragraph undersells. Make them interactive or at minimum show the broken render side-by-side with the fixed one. This is the lesson's highest-leverage pedagogical move.
- **Minimize cognitive load via the parallel.** Introduce padding/gap/margin as one coherent system early (a single diagram), then spend the body deepening the "gap" slot of it. The student already knows padding and margin from L1; this lesson slots `gap` between them and reframes margin's role as narrow.
- **Don't re-teach flex/grid.** `gap` lives *inside* containers the student already built in L3/L4. Examples reuse `flex flex-col` and `grid grid-cols-*` shells without re-explaining them. Keep the focus strictly on the spacing property.
- **`divide-*` is the one genuinely new utility.** It earns a proper (small) section because it solves a real, distinct problem (visible hairlines between items) that `gap` does not, and the two compose. Frame it as "gap spaces, divide separates — sometimes you want both."
- Component reuse: follow the established L1–L5 conventions (hard-coded accent colors inside `ParamPlayground`/SVG previews are illustrations, not project code — do not route through `@theme`; single-breakpoint examples, no `md:` variants — those are Chapter 021; `ReactCoding` scaffolds use `export function App()`).

---

## Lesson sections

### Introduction (no header)

Warm, brief, per the pedagogical structure. Open on the concrete senior question from the chapter outline: you have a vertical stack of cards (or a row of buttons) and you need even space between them. State the three-era arc in two or three sentences — `margin-bottom` on every child but the last (2018), Tailwind's `space-y-*` (2021), and today's reflex: put `flex flex-col` (or `grid`) on the parent and add one `gap-*`. The parent declares the layout, `gap` does the spacing, and no child carries a per-item spacing rule. Preview the payload: by the end you will (1) reach for `gap` automatically inside any flex/grid container, (2) know the one narrow case where `margin` still earns its place, and (3) recognize the legacy patterns when AI or an old codebase hands them to you. Connect explicitly back to L1 (you already know padding and margin and the `--spacing` scale that feeds them) and L3/L4 (you've already been *using* `gap-*` — this lesson explains why it was always the right call).

No code-heavy intro; one short before/after snippet (the `margin-bottom: last-child` chore vs. the one-line `gap`) is enough to set the stakes.

### Padding, gap, margin — one spatial model

**Goal:** install the three-slot mental model that the rest of the lesson (and the course) hangs on. This is the conceptual anchor; everything else is detail on the middle slot.

Teach the parallel as three answers to one question — "where does this space go relative to the element?":

- **Padding** — *inside* the element, between its border and its content. Pushes the element's own content inward. (Already known from L1; one-line refresher.)
- **Gap** — *between* sibling items inside a flex/grid container. Belongs to the parent, not the children. Adds space *only between* items — never a leading edge before the first item or a trailing edge after the last (that edge spacing is the parent's `padding`'s job — this is a load-bearing distinction, reinforced in the watch-outs).
- **Margin** — *outside* the element, pushing it away from neighbors that are *not* its flex/grid siblings. In 2026 this is the rare slot.

**Diagram (the lesson's centerpiece visual): hand-coded SVG or HTML+CSS annotated illustration**, wrapped in `<Figure>`. Show one parent box containing two child boxes, with the three spacing regions color-coded and labeled: padding (parent's inner inset, all around), gap (the channel *between* the two children), margin (an arrow from the parent pushing away from an outside sibling). Pedagogical goal: make "between vs. inside vs. outside" spatial and instantly memorable. Per the diagrams index, this is an "annotated illustration" → HTML+CSS or SVG is correct. **Reuse L1's box-model color mapping where regions overlap** (padding = green per the continuity notes' intentional coupling) so the student's box-model intuition carries over; assign gap and margin distinct, non-conflicting colors. Note for the author: keep it short (cap height; laptop viewports are short).

Land the senior takeaway in prose right after the diagram: a 2026 developer writes `padding` and `gap` constantly; `margin` is reserved for pushing an element away from something outside its container (and the `mx-auto` centering case from L1). If you find yourself writing `margin` *between siblings inside a flex/grid container*, that is the smell — the fix is `gap` on the parent.

**`Term` candidates here:** none new strictly required; "flex container" / "grid container" are defined in L3/L4 — assume them. If a refresher tooltip helps, a single `Term` on "siblings" (direct children of the same parent) is the only candidate.

### Gap, the universal spacing default

**Goal:** teach `gap` properly as the default and give the student the live feel of it.

Cover, concisely:

- `gap` works in flex, grid, and multi-column. One property on the parent. Tailwind `gap-*` compiles to `gap: calc(var(--spacing) * n)` — same `--spacing` scale from L1, so spacing stays consistent with padding and margin (reinforce the L1 scale, don't re-teach it).
- It adds space *between* items only — restate the no-edge-collision point from the model section, now in the context of `gap` specifically.
- Reflows correctly when items wrap or when the item count changes (this is the property that makes the legacy patterns obsolete — foreshadow the next section).
- Two-axis variants: `gap-x-*` (column-gap) and `gap-y-*` (row-gap) for the rare asymmetric case. Mention once that `gap` is CSS shorthand for `row-gap` + `column-gap` — **name-recognition only**; the student writes the Tailwind utility.
- Production-safety note (fact-checked Jun 2026): `gap` on flex containers is universally supported (95%+, every major browser since 2021). Ship it without fallbacks — no caveat needed. State this in one sentence so the student doesn't carry stale "gap doesn't work in flexbox" advice from older tutorials.

**Interactive: `ParamPlayground`.** A small flex (or grid) container with 3–4 child chips. Controls: a `gap` slider (`suffix="px"`, range ~0–48, default ~16) and ideally a second control toggling `flex-row` vs `flex-col` (a `select` piping into `flex-direction: var(--dir)`) so the student sees `gap` work identically on both axes. Optional: an item-count is overkill — keep it to gap + direction. A `<Readout>` echoing the gap value. Pedagogical goal: the student *slides spacing* and watches every channel update at once, with zero per-child edits — the visceral argument for `gap`. Hard-coded accent colors on the chips per the L1 convention (illustration, not project code).

### Why gap wins over the legacy patterns

**Goal:** this is the persuasion core — the student must leave *convinced*, not just informed, so that they correct AI output and old code on reflex. Each legacy pattern gets named, shown, and then shown *failing* against the case `gap` handles cleanly.

First, name the mechanism that all the legacy patterns share, because every failure below derives from it. **Fact-checked Jun 2026 — get this detail right:** Tailwind v4's `space-x-*`/`space-y-*` compile to a `:where(& > :not(:last-child))` selector that puts `margin-bottom` (or `margin-right`) on every child *except the last*. (This is a v4 change from v3, which targeted all-but-the-*first* with `margin-top` — do **not** describe the v3 form.) The load-bearing point for the student is the shape, not the exact pseudo-class: spacing is computed *per child by DOM position*, so it is fragile to which child is structurally last and to source order. `gap`, by contrast, is one property on the *parent* with no per-child selector and no position math. Every failure mode below is a symptom of that one difference.

Then structure as the concrete failure modes from the chapter outline. For each: name the pattern, then expose the break.

1. **Wrap breakage.** `space-x-*` (sibling horizontal margin) produces inconsistent spacing when items wrap to a second row — the margin is applied per item regardless of where rows break, so wrapped items misalign and there is no vertical spacing between rows at all. `gap` gives even spacing on *both* axes automatically when items wrap (this is precisely what `gap-x`/`gap-y` unify).
2. **Conditional-child breakage.** Because `space-y-*` margins live on "every child except the last," hiding or conditionally rendering the *last* child (`flag && <Item/>` — the React pattern from Ch017, assumed; or a `null` render) leaves a now-trailing item still carrying its bottom margin, so an extra phantom gap appears below the visible list. Reorder the children with `order-*` and the DOM-last child (which is no longer visually last) loses its separator. `gap` operates on the parent, not on child selectors, so it is immune to both. **This is the most important argument for a React course** — conditional and reordered children are everywhere in real components. Tie it explicitly to the watch-out: `space-y` mis-spaces around conditionally-rendered children; `gap` doesn't (it spaces the *layout*, not a selector match).
3. **Margin collapse (current v4 sharp edge, fact-checked Jun 2026).** `space-y-*` uses real margins, and adjacent margins *collapse* (the L1 box-model behavior) — a known v4 regression where `space-y` spacing collapses against a child's own vertical margin and silently under-spaces. `gap` is not a margin and never collapses, so the spacing you ask for is the spacing you get. Keep this to two or three sentences; it reinforces L1's margin-collapse lesson and lands a *current* reason, not just a historical one.
4. **RTL fragility.** Physical sibling margins don't flip for right-to-left layouts the way the layout does; `gap` is direction-agnostic. One or two sentences — connect to the logical-properties thread the chapter runs (L1 taught `ps-*`/`pe-*`; L7 owns logical insets). Do not deep-dive RTL.

**Component choice: `CodeVariants`** for the wrap and conditional-child cases — a "Legacy (`space-x`/`space-y`)" tab and a "Modern (`gap`)" tab, each with a short fenced block and one sentence of framing. Use `del=`/`ins=` framing where it sharpens the contrast. This is exactly the before/after comparison `CodeVariants` is built for.

**Strongly consider one `ReactCoding` (target-match, `live`)** to make the conditional-child break *tangible* rather than asserted. Setup: a starter list using `space-y-4` whose **last** item is wrapped in `{show && <li>…}` toggled off (so a phantom trailing gap is visibly present); the target shows the same list with `gap-4` on a `flex flex-col` parent rendering correctly with no trailing gap. The student converts `space-y` → `flex flex-col gap`. Target-match (visual + AI feedback) is the right mode — this is a "make it look right" task, not a brittle-assertion task. If a second exercise feels heavy for a short lesson, fold this conviction into the `CodeVariants` + a static `Screenshot`/figure of the broken render instead; author's judgment. Recommend including it — the conditional-child failure is the lesson's keystone and is far more convincing when the student triggers it.

Close the section with the rule, stated flatly: `space-x-*`/`space-y-*` exist only for the rare parent you can't convert to flex/grid without side effects; the cleaner fix is almost always `flex flex-col` (or `flex`) on the parent. The `* + *` "lobotomized owl" selector and `space-y` are **recognition-only** — dead for new code, alive in legacy and in AI output trained on it.

### Borders between items with divide

**Goal:** give the student the one new utility that `gap` does *not* cover, and show the two compose.

- `divide-x-*` / `divide-y-*` add a border between direct children — the visible-separator counterpart to `gap`'s invisible spacing. **Fact-checked Jun 2026:** in Tailwind v4 `divide-y` puts `border-bottom` on every child *except the last* (same `:where(& > :not(:last-child))` mechanism as `space-*`, and same v4 change from v3) — so the rule sits *between* items, not around the container. The student writes the utility, not the selector; mention the mechanism only so the conditional-child caveat below makes sense.
- Canonical reaches: a settings list with hairline rules between rows, a horizontal nav with vertical dividers between clusters, a list-card. Pair `divide-color-*` and reference that it composes with the parent's `border` + `rounded-*` for the classic bordered-list-card (a row of items inside one rounded, bordered container, hairlines between them).
- The key framing: **`divide-*` is not a substitute for `gap`** — `divide` draws a line, `gap` adds space. They answer different questions and frequently appear together (space between items *and* a rule between them). Show one example combining `gap` (or padding) with `divide`.

**Component:** a simple `Code` block (or short `AnnotatedCode` if highlighting the `divide-y` + child structure helps) for the bordered-list-card, plus optionally a small static `Figure`/`Screenshot` of the rendered result so the student sees the hairlines. Keep it light — this is a 2026-real but secondary utility, not the lesson's core.

Watch-out to fold in here: because `divide-*` is the same per-child sibling selector as `space-*`, it carries the *same* sensitivity to conditionally-rendered last children and to `order-*` reordering (the DOM-last child loses its separator even if it isn't visually last). It's accepted anyway because a *visible separator between dynamic items* is a much rarer need than spacing, and there is no `gap`-equivalent that draws borders. Name this honestly so the student isn't surprised; don't dwell.

### When margin still earns its place

**Goal:** close the loop on the spatial model by precisely scoping margin's surviving role, so the student stops reaching for it reflexively.

Short section. The gap-vs-margin decision, stated as a rule the student can apply mechanically:

- **Use `gap`** between siblings inside a flex/grid container — ~90% of spacing.
- **Use `margin`** to push an element away from something *outside* its flex/grid container, or in a context with no flex/grid parent to own a `gap`. The honest rare cases: `mx-auto` for centering a lone block (from L1 — name it, don't re-teach), and pushing one element away from a non-sibling neighbor.
- **Never** use `margin` between siblings inside a flex/grid container.

Reinforce the headline conclusion: padding and gap cover almost everything; margin is the exception, not a co-equal third tool. This is the senior mental shift — juniors reach for margin first out of habit; seniors reach for gap.

**Exercise (recommended here or as the lesson capstone): `Buckets`.** Two buckets — "Reach for `gap`" and "Reach for `margin`" (or a three-way padding/gap/margin sort). Items are concrete spacing situations: "even space between cards in a flex column" → gap; "center a 600px article in the viewport" → margin (`mx-auto`); "space between an avatar and a name in a row" → gap; "push a 'Danger zone' section away from the form above it" → margin; "space inside a button between its border and label" → padding (if three-way). Pedagogical goal: force the student to *apply* the decision rule to fresh cases, which is what cements a reflex better than re-reading the rule. `Buckets` is the right fit — this is exactly a classification drill. Grading is built into the component.

### External resources (optional)

One or two `ExternalResource` cards if they add value: MDN `gap` / CSS box alignment, or a short interactive explainer. Optional `VideoCallout` only if a genuinely on-topic, current `gap`-vs-`space` explainer surfaces (do not force one — this lesson's interactivity already carries the load; the resourcer can search). Lower priority than for L3/L4 given the lesson's brevity.

---

## Scope

**Assumed from prior lessons (redefine in one line max, do not re-teach):**

- Padding and margin, the four boxes, `border-box`, the `--spacing` scale (`calc(var(--spacing) * n)`), and **margin collapse** — L1. This lesson reuses the scale and the box-model color mapping, and the margin-collapse argument leans on L1's treatment; it does not re-derive any of them.
- `mx-auto max-w-*` centering — L1. Named as margin's surviving case; not re-taught.
- `flex`, `flex-col`, `flex-row`, `order-*`, and that flex/grid have a container × direct-children-items model — L3 (`display: flex`/`inline-flex` from L2). Examples use these shells without explanation; `order-*` is named in L3 (recognition-only) and reused here for the reordering break.
- `grid`, `grid-cols-*` — L4. Used in examples without explanation.
- `gap-*` itself has already been *used* as the assumed default in L3 and L4 — this lesson is where it's finally *explained*. Frame it that way.
- Conditional rendering (`flag && <Node/>`) — Ch017 L1. Used as the setup for the conditional-child failure mode.
- Tailwind utility/variant syntax, the `--spacing` token, `@theme` — Ch018.
- `truncate`, sibling-margins-forbidden as a convention — already in play from L1/L3; cited, not litigated.

**Explicitly out of scope (defer, do not teach):**

- `padding` and `margin` utilities at depth, and margin collapse *as a topic* — **L1 owns the box model.** This lesson references margin through the spatial model and invokes collapse only as one `gap`-wins argument; it does not re-teach the collapse rules.
- Flex item sizing/alignment (`flex-1`, `justify-*`, `items-*`, `min-w-0`) — **L3.** `gap` examples must not drift into teaching alignment.
- Grid track sizing and item placement (`fr`, `auto-fit`, `col-span-*`, `subgrid`) — **L4.**
- Responsive variants for spacing (`md:gap-6`) — **Ch021 L6.** All examples single-breakpoint.
- `<hr>` as the semantic thematic-break element vs. `divide-*` decorative rules — **Ch017 L6 territory.** If `<hr>` comes up, one line distinguishing semantic break (`<hr>`) from decorative hairline (`divide`) and move on.
- Multi-column layout (`columns-3` + `column-gap`) — niche, **recognition-only at most**; `gap` works there but it's not a 2026 component pattern. Mention in a half-sentence if at all.
- Logical/RTL depth — the RTL-fragility point is one beat; **L1 owns logical padding/margin, L7 owns logical insets.** Do not expand.
- Position/inset, overflow, stacking — later lessons (L7/L8/L9).

---

## Notes for downstream agents

- **Convention divergences (deliberate, do not "fix"):** hard-coded accent colors in `ParamPlayground`/SVG/figure previews (illustrations, per L1–L5 continuity); single-breakpoint examples (no `md:` — Chapter 021 territory); `ReactCoding` scaffolds use `export function App()`.
- **Tailwind v4 selector fact (fact-checked Jun 2026, load-bearing — do not regress to v3):** `space-*` and `divide-*` both compile to `:where(& > :not(:last-child))` → `margin-bottom`/`border-bottom` on all-but-the-last child (v4 changed this from v3's all-but-the-first / `margin-top` form for performance). Two consequences the lesson depends on: the conditional-child failure surfaces on hiding the **last** child (phantom trailing gap), and `order-*` reordering breaks both `space-*` and `divide-*` (DOM-last ≠ visually-last). Don't author examples or claims that assume the v3 behavior.
- **New lesson components likely needed** under `src/components/lessons/020/6/`: the padding/gap/margin spatial-model figure (SVG or HTML+CSS — author's call which renders cleaner; HTML+CSS has the advantage of being devtools-inspectable per the diagrams index). The `ParamPlayground`, `CodeVariants`, `ReactCoding`, and `Buckets` are all pre-built — no new components needed for those. If the broken-render demos are shown statically, a small `Screenshot` or plain figure suffices; prefer the live `ReactCoding` for the conditional-child break.
- **Keep it short.** This is a single-concept lesson with a small new surface (`gap` + `divide`) wrapped in a strong mental model and a persuasion argument. Resist padding it out — the brevity is correct. The interactivity (one playground, the before/after variants, one coding target-match, one buckets drill) is the right weight; don't stack more.

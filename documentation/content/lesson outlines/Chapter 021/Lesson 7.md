# Container queries for component-level layout

- Title (h1): `Container queries for component-level layout`
- Sidebar label: `Container queries`

---

## Lesson framing

This is the **last teaching lesson of chapter 021** and the **second half of responsive design** — lesson 6 owned the viewport half (media queries, mobile-first, the breakpoint scale) and closed by *posing* the problem this lesson resolves: the same `<ProductCard>` looks right in a wide feed and cramped in a narrow sidebar, but both share one viewport, so `md:` can't disambiguate. **Open by paying off that exact debt** — reuse lesson 6's `ContextlessCard` framing (wide-feed-vs-narrow-sidebar) verbatim as the hook so the chapter reads as one arc. The card needs *its own width*, not the screen's.

**The senior question** (per pedagogy, stated implicitly in the intro, never as a section): how do you build a component that adapts to *the slot it's dropped into* instead of the browser window — so one `<ProductCard>` is authored once and renders correctly in the dashboard grid, the sidebar, and the full-width feed without the parent passing down a `variant` prop? The 2026 answer is container queries: `@container` on the wrapper, `@md:flex-row` on the children.

**The spine** (carry it through every section): **media query = "how big is the *screen*"; container query = "how big is this *box*".** Lesson 6 planted this as a Term and a closing `Buckets`; this lesson makes it the organizing mental model and resolves the decision rule it deferred. Reinforce the chapter-wide *primitive-then-utility* pattern: teach the CSS primitive (`container-type: inline-size`, `@container (width >= …)`), then name the Tailwind v4 utility that compiles to it (`@container`, `@md:`), so the student recognizes either form in the wild (shadcn blocks, AI output, legacy CSS).

**The mental model the student should leave with:** a container query is a contract between a component and its slot. A parent *opts in* to being measurable (`container-type`), and descendants ask *that container's* size — not the viewport's. The component becomes genuinely portable: drop it anywhere and it lays itself out from the space it's given. This is the CSS-layer expression of *component reusability*, which is why the lesson forward-points to chapter 022 (component composition).

**What the student should be able to do by the end:** (1) decide viewport-vs-container for any responsive requirement using a crisp rule; (2) make a card adapt to its slot with `@container` + `@md:flex-row`; (3) reach for `cqi` + `clamp()` for fluid component typography with zero breakpoints; (4) name a container so a deep child can query the right ancestor; (5) recognize and avoid the two beginner footguns (forgetting `@container` on the parent; `cqi` resolving to 0 with no container in the tree).

**Pedagogical strategy — minimize cognitive load by staging:**
1. **Lead with the decision, not the syntax** (pedagogy filter "decisions before syntax"). The viewport-vs-container call is the senior skill; the syntax is small. But land *one* concrete win first (the card flipping layout) so the decision rule has something to attach to, then generalize.
2. **One simplified model first, complexity added gradually.** Start with the simplest possible case — one container, one descendant query, `inline-size` only. Only after that lands do named containers and units enter. Explicitly defer `container-type: size`, style queries, and `cqb` as edges, not as part of the core model.
3. **This is mostly a *visual cause-and-effect* topic.** Container queries are felt by resizing a box, not read off a page. The centerpiece must be a **live, resizable container** (a `ParamPlayground` driving a real container's width) where the student slides the width and watches the card flip from stacked to side-by-side and the title scale fluidly. A static figure freezes the one thing the student needs to feel. This mirrors lesson 6's `ViewportSimulator` but for the *box*, not the *screen* — the contrast is itself pedagogical.
4. **Browser support is a non-issue in 2026** — state it once (Baseline widely available, universal, no polyfill) so the student reaches without checking caniuse, then move on. Don't dwell.

**Tone:** adult, terse, senior-framed, no bootcamp scaffolding (per pedagogy §2). Assume the student is fluent in everything from chapters 018–021: Tailwind v4 CSS-first `@theme`, the variant grammar (`hover:` ≈ `&:hover`), the breakpoint scale and `@media` desugaring, `clamp()` (ch020 L5), `auto-fit`/`minmax` (ch020 L4), semantic tokens, flex/grid.

**Centerpiece + components plan** (detail in sections): one `ParamPlayground` "container lab" (the headline interactive); one `ReactCoding` target-match (make the card adapt — *must be live* because the effect only exists at real widths); a `StateMachineWalker` *or* closing `Buckets` for the decision rule (lean `Buckets` to mirror L6's consolidation and keep it light); `AnnotatedCode` for the `@container`/`@md:` → CSS desugaring; a small `Figure` (HTML+CSS) contrasting media-query-axis vs container-query-axis; one optional `VideoCallout`. **Tailwind Play CDN caveat applies** (see Scope): the live `ReactCoding` runs on the CDN, which *does* support `@container`/`@md:` (they're core utilities, not `@theme`-dependent) — so unlike most ch021 exercises, this one can use the real utilities. Flag that as a deliberate, welcome divergence for downstream agents: **container-query utilities work on the CDN; named-container `@theme` size customization does not.**

---

## Lesson sections

### Intro (no header)

Per pedagogy: warm, brief, problem-first. Reopen lesson 6's cliffhanger — reuse the `ContextlessCard` image (same `<ProductCard>`, wide feed vs narrow sidebar, one viewport). State the gap in one breath: media queries read the *viewport*, but this component's problem is its *own width*, which the viewport can't report. Name the fix (container queries) and the one-line shape (`@container` on the wrapper, `@md:flex-row` on the inside). Preview the payoff: by the end, one card authored once that lays itself out from whatever slot it lands in — and a crisp rule for *when* this beats a media query. Tease the centerpiece ("you'll drag a container narrower and watch the card decide its own layout"). Keep to ~5 sentences.

Recall hook: explicitly reference the L6 decision rule planted verbatim ("page-level structure → viewport query; component-level adaptation → container query") — this lesson is where the second half gets built.

---

### A component that adapts to its slot, not the screen

**Goal:** land the *one concrete win* immediately so the abstract decision rule has a referent. This is the "canonical pattern" the chapter outline calls for, taught first as motivation.

**Content:**
- Show the target: a `<ProductCard>` that is **vertical** (image on top, text below) when its slot is narrow, and **horizontal** (image left, text right) when its slot is wide — *without the parent telling it which*. Stress the senior payoff: no `variant="compact"` prop threaded down, no `useState`, no measuring in JS. The component owns its own breakpoint.
- Introduce the two-piece shape minimally:
  1. The **parent opts in**: `<div className="@container">` — "I am a thing whose width can be queried."
  2. The **child queries it**: `<div className="flex flex-col @md:flex-row">` — "stack by default; go side-by-side once *my container* passes the `@md` width."
- Emphasize the mental shift from L6: in `md:flex-row` the `md` is the *screen*; in `@md:flex-row` the `@md` is *this container*. The `@` prefix is the entire tell. This single contrast is the most important sentence in the lesson — make it unmissable.
- Note the payoff explicitly: drop this same card in a 3-col dashboard grid (each cell narrow → vertical), in a sidebar (narrow → vertical), in a full-width feed row (wide → horizontal). One component, three correct layouts, parent none the wiser. This is *component reusability* at the CSS layer (forward-nod to ch022, one clause only).

**Component — the centerpiece interactive (`ParamPlayground`, "the container lab"):**
- **This is the single most important visual in the lesson.** A width slider drives a *real container's* width via a CSS custom property; the card inside reacts through genuine container-query CSS (authored in a scoped `<style>` block in the `<Preview>`, using raw `@container (width >= …)` — pedagogically correct here, it teaches the primitive).
- Controls: `Param id="w" kind="slider" label="Container width" min={200} max={640} default={280} suffix="px"`.
- Preview: an outer wrapper with `width: var(--w)` and `container-type: inline-size`; inside, a `<ProductCard>` mock (image block + title + price + button) whose layout switches at a `@container (width >= 28rem)` rule (matching Tailwind's `@md` = 28rem/448px) and whose title font-size uses `clamp(1rem, 6cqi, 1.5rem)` so the student *also* sees fluid type move on the same slider (seeds the `cqi` section).
- `Readout label="Container width" of="w" suffix="px"`; second `Readout label="Layout" expr="w >= 448 ? 'horizontal (@md)' : 'vertical'"` so the verdict is explicit; optional third `Readout label="Title size" expr="Math.round(Math.min(24, Math.max(16, w * 0.06)))" suffix="px"` echoing the clamped title size to make `cqi` tangible before it's named.
- Caption: "Drag the container — not the window. The card flips layout at its own `@md` width and the title scales with `cqi`." 
- Pedagogical goal: collapse the entire lesson into one tactile loop — *I changed the box's width and the component re-laid-itself-out*. Everything after this is naming what just happened.
- **Note for downstream agent:** raw `@container`/`clamp()`/`cqi` CSS and inline `style` here are *pedagogical* (teaching the primitive and the unit), not smells — do not "correct" to Tailwind utilities inside the playground preview. (Consistent with L2/L3/L5 divergence notes.)

**Tooltip terms (Term):** `inline-size` (the element's width axis in writing-mode-aware terms — for LTR Latin, the horizontal axis; ties to the logical-properties reflex from L1/L3). Keep this brief; depth comes in the next section.

---

### The model: a parent opts in, descendants ask

**Goal:** name the primitive precisely now that the student has felt it. Build the simplified mental model (one container, `inline-size`, one query) before any complexity.

**Content:**
- **`container-type` is the opt-in.** A container query can't query an arbitrary element — an ancestor must first *declare itself queryable* by setting `container-type`. Frame it as a contract: "measuring a box costs the browser layout work, so you opt in per-subtree rather than paying it everywhere." This explains *why* the parent declaration exists (decisions-before-syntax) and pre-empts the #1 beginner bug.
- **`container-type: inline-size` is the 99% reach** (the chapter's senior default). It makes the container queryable on its **inline (width) axis only**; the container's *block size (height) stays content-driven*. Explain the asymmetry concretely: you almost always want "respond to how wide my slot is" while letting height grow with content — exactly what `inline-size` gives. Tailwind utility: **`@container` compiles to `container-type: inline-size`** (state the compiled CSS explicitly).
- **Descendants query the nearest container, not the viewport.** Once an ancestor is a container, any descendant rule written as `@container (width >= 28rem) { … }` measures *that ancestor*. Tailwind: `@md:flex-row` etc., where the `@`-prefixed variants compile to `@container (width >= <size>)`. The `@` distinguishes container variants from viewport variants — this is the grammar payoff of L6's variant model.
- **Containers are always ancestors — a query never reads the element it's on.** Call this out explicitly; it's a common confusion. The container is up the tree; the query lives on a descendant. (This kills the "I put `@container` and `@md:` on the same div, why doesn't it work" mistake.)
- **The two edges, named and deferred (don't expand them):**
  - `container-type: size` queries *both* axes but requires the container to have a *defined height* — rare and footgun-prone (the content can't size the box that's measuring it → easy to collapse to zero). Tailwind exposes it as `@container-size`. One sentence: reach for it almost never; the chapter recommends `inline-size`. (Fact-checked: the v4 utility is `@container-size`, not a differently-named class.)
  - `container-type: normal` removes containment — recognition only.

**Component — desugaring (`AnnotatedCode`):**
- One small block showing the two-piece pattern in Tailwind form, walked step-by-step to reveal the compiled CSS underneath. Code (single source on the parent):
  ```tsx
  <article className="@container">
    <div className="flex flex-col gap-4 @md:flex-row">
      <img className="rounded-md @md:w-40" />
      <div className="@md:flex-1">…</div>
    </div>
  </article>
  ```
- Steps (each `color="blue"`, one short paragraph):
  1. `"@container"` → "compiles to `container-type: inline-size` — this `<article>` is now measurable on its width axis."
  2. `"flex flex-col"` → the default (narrow) layout: stacked.
  3. `"@md:flex-row"` → "compiles to `@container (width >= 28rem) { flex-direction: row }` — flips to side-by-side once *the article* is ≥ 28rem wide, regardless of screen size."
  4. `"@md:w-40 @md:flex-1"` → per-element overrides inside the same query (image gets a fixed width, text takes the rest).
- Pedagogical goal: make the Tailwind↔CSS mapping explicit so the student reads either form fluently and understands the `@` is "container, not viewport."

**Browser support (one sentence, inline — not its own section):** size container queries and container units are **Baseline** — cross-browser since early 2023, Baseline *widely available* since 2025 — so in 2026 they're universal, no polyfill, reach without checking caniuse. (Fact-checked Jun 2026: Chrome 105 / Safari 16 / Firefox 110; Baseline newly-available Feb 2023, widely-available Aug 2025.) Mirror L4's `:has()` Baseline framing for consistency; keep it to one sentence — do not write a paragraph on support.

**Watch-out (inline, in this section because it qualifies the concept taught here):** the #1 container-query bug is **forgetting `@container` on an ancestor** — the `@md:` variants then silently do nothing (no error, the rule just never matches). Debug move: confirm some ancestor has `container-type` set. Phrase as a reflex ("if your `@md:` isn't firing, you forgot the `@container`").

**Tooltip terms (Term):** `containment` (the browser isolating a subtree's layout so it can be measured/queried independently); `Baseline` (re-tooltip lightly per chapter convention — "a web feature supported across all major current browsers").

---

### The container breakpoint scale is smaller than the viewport scale

**Goal:** give the student the actual `@`-variant scale and the crucial insight that container breakpoints are *not* the viewport breakpoints — a component's "medium" is much smaller than a screen's "medium."

**Content:**
- **The numbers differ from L6 on purpose.** A sidebar widget at 400px is *wide* for its slot but *tiny* for a viewport. So Tailwind ships a separate, smaller container scale. Make the contrast vivid: viewport `md` = 768px; container `@md` = **448px (28rem)**. Same name, different yardstick — because the thing being measured is a box, not a screen.
- Present the scale compactly (a `Figure` or a small table — see below). Fact-checked exact values:
  - `@3xs` 16rem/256px · `@2xs` 18rem/288px · `@xs` 20rem/320px · `@sm` 24rem/384px · `@md` 28rem/448px · `@lg` 32rem/512px · `@xl` 36rem/576px · `@2xl` 42rem/672px · `@3xl` 48rem/768px · `@4xl` 56rem/896px · `@5xl` 64rem/1024px · `@6xl` 72rem/1152px · `@7xl` 80rem/1280px.
- Don't make the student memorize the table — the reflex (carried from L1/L3/L6) is **stay on the scale; find the breakpoint by resizing until the layout breaks** (content-driven, exactly like L6's headline correction, now applied to the *container* not the viewport). Name the escape hatches briefly: arbitrary one-offs `@min-[475px]:` / `@max-[960px]:` (fact-checked syntax), and customizing/extending the scale via the `--container-*` theme namespace in `@theme` (e.g. `--container-8xl: 96rem` mints `@8xl`). Frame `@min-[…]:` as the same "grow the scale, don't litter brackets" ladder from ch018 L1 / L6.
- **`max-*` and ranged container variants** exist (`@max-md:`, `@sm:@max-md:` for a single band) — recognition only, one sentence, mirroring L6's treatment of `max-*` viewport variants.

**Component — the scale `Figure` (HTML + CSS, inside `<Figure>`):**
- A horizontal strip (per diagram guidelines: horizontal, short) showing the container scale `@3xs…@7xl` as labeled ticks, visually *under* a faded ghost of the viewport scale (`sm`/`md`/`lg`…) so the size offset is immediate — e.g. `@md` (448) sits well left of viewport `md` (768). Pedagogical goal: the student *sees* that a container's "medium" is a screen's "small-ish," cementing why the two scales can't be interchanged. Reuse/echo L6's `BreakpointRuler` visual language for continuity (this is its container-scale sibling). Cap height; HTML+CSS so it's devtools-inspectable.

**Tooltip terms (Term):** none new here (`rem` already defined ch020 L5; don't re-tooltip per L6 note).

---

### Fluid component typography with cqi and clamp()

**Goal:** the *other* half of container queries — not just discrete breakpoints but **continuous** sizing via container units. This is a high-value 2026 pattern and the chapter outline flags it specifically.

**Content:**
- **Container query units measure the container, the way `vw`/`vh` measure the viewport.** Map them onto what the student already knows from ch020 L5 (viewport units): `1cqi` = 1% of the container's **inline size** (width); `1cqb` = 1% of block size; `cqw`/`cqh` are the explicit width/height forms; `cqmin`/`cqmax` = the smaller/larger of the two. **`cqi` is the 2026 reach for almost everything** — width drives most component sizing, exactly like `inline-size` for `container-type`. (Keep the full unit list to a single line; only `cqi` earns depth.)
- **The headline pattern: one rule, no breakpoint.** A card title that scales smoothly from ~16px in a small card to ~24px in a large one is **one declaration**: `font-size: clamp(1rem, 6cqi, 1.5rem)`. Walk the three `clamp()` args (min floor / preferred fluid value / max ceiling) — cash in the `clamp()` primitive from ch020 L5, now fed a *container* unit instead of `vw`. Contrast with the breakpoint approach: no `@md:text-2xl` step, no jump — the title grows *continuously* with the slot. This is the moment to connect back to the centerpiece (the title already moved on the slider).
- **In Tailwind, container units live in arbitrary values.** Important divergence to flag (fact-checked): there are no first-class `cqi` utilities — you write `text-[clamp(1rem,6cqi,1.5rem)]` or `p-[3cqi]` in bracket form. This is a legitimate, correct use of the arbitrary-value escape hatch (not the "smell" L1 warned about), because the *value itself* is the fluid expression — there's no scale step that expresses it. Name this explicitly so the student doesn't think they're breaking the "stay on the scale" rule.
- **Reaches beyond type:** padding that scales with the card (`p-[3cqi]`), an image/aspect block whose height follows the card's width. One line each; `cqi` for width-driven sizing is the through-line.

**Watch-out (inline — it qualifies units):** **container units resolve to 0 if no ancestor is a container.** `cqi` with no `container-type` up the tree silently collapses (a `6cqi` title becomes 0px → invisible text). Same root cause as the previous watch-out (no container declared) — reinforce the single mental model: *container features need a declared container above them, full stop.* This pairing of the two bugs under one cause is deliberate cognitive-load reduction.

**Component:** the centerpiece `ParamPlayground` already demonstrates this live (the title's `clamp(1rem, 6cqi, 1.5rem)` and its `Readout`). **Do not build a second interactive** — instead, *refer back* to the lab ("the title you watched scale on the slider was one `clamp(1rem, 6cqi, 1.5rem)` rule"). Optionally a tiny static `Code` block of the one rule. Keeps the lesson tight and avoids redundant widgets.

**Tooltip terms (Term):** `cqi` (container query inline-size unit — 1% of the queried container's width). Acronym is non-obvious → good Term candidate.

---

### Naming a container so deep children query the right one

**Goal:** add the *first* layer of complexity onto the simplified model — only now, after the core lands. Named containers solve nesting.

**Content:**
- **The problem nesting creates:** an unnamed `@container` query always resolves to the *nearest* container ancestor. When containers nest (a card inside a panel that's also a container), a deep child that wants to react to the *outer* panel can't reach past the inner one. Frame as: "by default a query binds to the closest container; sometimes you need to address a specific one."
- **The fix — name the container and query it by name.** CSS: `container-name: panel` (often written via the `container` shorthand `container: panel / inline-size`), then `@container panel (width >= 28rem) { … }`. Tailwind (fact-checked syntax): **`@container/panel`** on the ancestor and **`@md/panel:flex-row`** on the descendant — the `/panel` suffix on both the declaration and the variant. Note `@container/name` still implies `inline-size`.
- **The reach is narrow** — most components have exactly one container and never need a name. Teach naming as the tool you pull out *when structure nests*, not a default. (Defaults-before-conditionals, per pedagogy: name the trigger — "more than one container in the tree" — before the tool.)
- **Nested-container behavior, stated once:** an inner unnamed `@container` *shadows* an outer one for unnamed queries (the inner wins for the nearest-ancestor resolution). The remedy is exactly naming. Keep to one or two sentences — this is the edge, not the core.

**Component (`AnnotatedCode` or `CodeVariants`):**
- Prefer a small `CodeVariants` with two tabs to make the *before/after* of nesting tangible:
  - **Tab "Unnamed (ambiguous)":** nested containers, a deep `@md:` that binds to the wrong (inner) container — prose explains it silently targets the nearest ancestor.
  - **Tab "Named (explicit)":** same markup with `@container/panel` on the outer and `@md/panel:` on the child — prose explains the query now reaches the intended ancestor.
- Pedagogical goal: show that the *syntax delta is tiny* (`/panel`) but the *targeting changes*, so the student internalizes naming as a precision tool. (Per CodeVariants doc: one fence + ≤6 lines prose per tab.)
- **Downstream note:** if authored as `ReactCoding`, the named-container utilities (`@container/panel`, `@md/panel:`) *do* work on the Tailwind Play CDN (they're core, not `@theme`); only `--container-*` *theme customization* fails on the CDN. So a live demo is possible — but a static `CodeVariants` is sufficient and lighter for this edge case.

**Tooltip terms (Term):** none new (`shadow`/shadowing is plain English here; avoid overloading with the CSS `shadow` term from L3 — phrase as "the inner container *wins*" to dodge ambiguity).

---

### Choosing between viewport and container queries

**Goal:** resolve the decision rule L6 deferred. This is the *senior takeaway* of the whole responsive arc — per pedagogy, decisions are the senior contribution. Place it near the end so the student has both tools in hand.

**Content:**
- **The rule, stated crisply (carry L6's verbatim wording):** **page-level structure → viewport query (`md:`); component-level adaptation → container query (`@md:`).** Most real SaaS UIs use *both at once* — the page shell is viewport-driven (mobile nav vs desktop nav, one-column vs two-column page), the components inside are container-driven (a card that adapts to its grid cell, a sidebar widget that collapses with its parent). This is the headline mental model the lesson closes on.
- **The diagnostic question** that picks the tool: *"Does this element's right layout depend on the screen, or on the space it happens to be in?"* Screen → `md:`. Slot → `@md:`. Give 2–3 worked examples: top-level app nav (screen → viewport); a `<ProductCard>` reused across feed/sidebar/grid (slot → container); a stat tile in a dashboard that's 4-across on wide and 1-across on narrow *because the grid changed*, not the screen (slot → container).
- **`auto-fit` + `minmax` vs container queries — both are "responsive without breakpoints," they solve *different* halves** (cross-reference ch020 L4, which the student knows). Make the distinction sharp:
  - `grid-cols-[repeat(auto-fit,minmax(280px,1fr))]` makes the **container** responsive to the *items* — the track *count* flexes to fit; each item stays the same internally.
  - `@container` + `@md:flex-row` makes the **items** responsive to the *container* — each item re-lays-itself-out based on the space it got.
  - They compose beautifully: `auto-fit` decides *how many cards per row*; each card's own `@container` decides *its internal layout* given the resulting cell width. This is the senior combo for a truly fluid card grid — name it as the 2026 reflex.
- **Don't reach for container queries when viewport is simpler.** The page shell rarely needs them; over-containerizing adds layout cost and indirection. (Watch-out, inline.)

**Component — the decision, made interactive:**
- **Primary recommendation: a closing `Buckets` (two-column)** to consolidate, mirroring L6's closing `Buckets` (which already pre-seeded viewport-vs-container) — this gives chapter-level symmetry and is light. Items = real scenarios ("the top app navigation bar", "a `ProductCard` used in both the sidebar and the feed", "the page splitting from one column to two on desktop", "a stat tile whose inner layout changes when the dashboard grid drops to one column", "a marketing hero's font shrinking on phones", "a comment card that goes avatar-left on wide and avatar-top on narrow"); buckets = **Viewport query (`md:`)** / **Container query (`@md:`)**. Grading: each item maps to one bucket; explanation on reveal restates the diagnostic question. Pedagogical goal: force the student to *apply* the rule, not just read it — the exact skill being assessed.
- **Alternative considered (note for agent):** a `StateMachineWalker` in decision-tree mode (single question "screen or slot?" → recommendation) is viable but heavier than the rule deserves; the `Buckets` exercises the rule across more cases. Prefer `Buckets`. (If the writer wants both, the `StateMachineWalker` could replace the inline diagnostic-question prose — but one is enough.)

**Tooltip terms (Term):** none new (`auto-fit`/`minmax` known from ch020 L4 — reference, don't re-teach).

---

### Practice: make the card adapt to its slot (`ReactCoding`, live, target-match)

**Goal:** the student writes the canonical pattern themselves. This is the "do" of the lesson's "be able to do" — placed as its own consolidation beat (not at the very end; followed by the brief close + resources).

**Content / exercise spec:**
- **Mode:** `ReactCoding` with `target={…}` (target-match) and **`live`** — *mandatory*, because the layout switch only exists at real container widths and the student must see Target | Your output react. (Per `ReactCoding` doc: target-match + live.)
- **Setup:** the App renders the *same* `<ProductCard>` twice — once in a **narrow** wrapper (`w-64`) and once in a **wide** wrapper (`w-full max-w-2xl`) — so a single correct card definition produces *vertical* on the left and *horizontal* on the right simultaneously. This makes the "one component, two layouts, parent-agnostic" thesis literally visible in the output, and is the strongest possible demonstration of the win.
- **Starter:** a `<ProductCard>` with a `flex flex-col` inner layout and **no** container setup — renders vertical in both slots (wrong: the wide slot should be horizontal).
- **Task (instructions):** "Make the card lay itself out from its slot: add `@container` to the card root and `@md:flex-row` (plus `@md:w-40` on the image, `@md:flex-1` on the body) to the inner layout. The same component should render stacked in the narrow slot and side-by-side in the wide slot — without either wrapper telling it which."
- **Target:** the correct version (vertical narrow / horizontal wide).
- **Grading:** target-match is visual (no auto-test per doc) + AI feedback comparing student TSX to reference. (Acceptable — the visual diff *is* the check, and the two-slot setup makes correctness obvious.)
- **CDN note (downstream, important):** `@container`/`@md:`/`@md:w-40`/`@md:flex-1` are **core Tailwind v4 utilities and resolve on the Play CDN** — so unlike most ch021 live exercises, this one uses the *real app utilities*, no CDN-literal substitution needed. State this in the outline so the agent doesn't reflexively swap in placeholder classes. (The only thing that wouldn't work on the CDN is `--container-*` `@theme` customization — not used here.)
- Pedagogical goal: muscle-memory for the two-piece pattern + a visceral proof of slot-driven adaptation.

---

### Close + external resources (no header / minimal)

- **One-paragraph close** that lands the chapter-level mental model: the visual surface (ch021) is complete — type, color, decoration, interaction state, motion, and now *adaptation*, viewport-wide and component-wide. The senior reflex: **author components that lay themselves out from the space they're given.** Forward-nod (one clause) to ch022 (composing these adaptive components) per the chapter's forward references. Since this is the last *teaching* lesson, optionally tee up the chapter quiz (L8).
- **External resources (`ExternalResource` cards):** MDN container queries reference; the Tailwind v4 responsive-design / container-queries docs; optionally web.dev's container-queries explainer. (Keep to 2–3.)
- **Optional `VideoCallout`:** one short, current (≤ ~15 min) container-queries walkthrough if a good one exists (e.g. a Kevin Powell container-queries video — he was used in L6). One sentence of framing. Mark optional — the live lab + exercise already carry the concept; video is supplementary. (Resourcer to source/verify the ID; do not invent one.)

---

## Scope

**This lesson covers:** `container-type: inline-size` as the senior default and what `@container` compiles to; the parent-opts-in / descendants-query model; the `@`-prefixed Tailwind container variants and the smaller container breakpoint scale (`@3xs…@7xl`, exact values) vs viewport scale; arbitrary container thresholds (`@min-[…]:`) and `--container-*` theme extension; container query units (`cqi` lead, others named) with `clamp()` for fluid component typography; named containers (`@container/name`, `@md/name:`) for nesting; the viewport-vs-container decision rule and its composition with `auto-fit`/`minmax`; Baseline support stated once; the two canonical footguns (missing `@container`; units→0 without a container).

**Explicitly NOT covered (defer, do not re-teach or pre-teach):**
- **Media queries, mobile-first, the viewport breakpoint scale, `prefers-*` family, `@media (hover: hover)`** → **ch021 L6** (the viewport half). This lesson *references* the decision rule and the breakpoint-scale contrast but does **not** re-teach media queries. Redefine "media query = how big the screen is" in one clause only as the contrast partner.
- **The viewport-unit family (`vh`/`dvh`/`svh`/`lvh`) and `clamp()` itself** → **ch020 L5**. `clamp()` is a *prerequisite* here — restate its three args in one line when introducing `clamp(1rem, 6cqi, 1.5rem)`, don't re-teach. Container units are taught *by analogy* to viewport units the student already has.
- **`auto-fit` + `minmax` grid mechanics** → **ch020 L4** (prerequisite). Reference for the "both solve responsive-without-breakpoints" contrast; don't re-teach the grid syntax.
- **`container-type: size` / `cqb`/`cqh` (block-axis / height-driven adaptation)** → named as a footgun-prone edge, recognition only. The chapter recommends `inline-size`; one sentence on `@container-size` existing, no depth.
- **Style queries (`@container style(--x: …)`)** → recognition only, one or two sentences max: queries a custom property (e.g. a theme flag) rather than a size. Accurate support framing (fact-checked Jun 2026): **Chrome and Safari 18 ship it; Firefox is landing it in 2026 (Interop 2026)** — so it's "nearly there but not yet a universal cross-browser reach," NOT "limited" or "experimental." Recognition only; do not teach syntax in depth.
- **Component composition / variants-vs-queries / design-system practice** → **ch022** and **ch027**. Forward-nod only (one clause each) — container queries *enable* reusable components, but composing them and the variants-vs-queries decision are later. Do not pre-teach CVA or composition patterns.
- **Mobile-nav / drawer components** → **ch028 L8** (project chapter).
- **Responsive images / `<picture>` / `next/image`** → out of scope here (ch017 / Image territory).
- **JS-side size measurement (`ResizeObserver`, `useMediaQuery` for containers)** → not introduced; container queries are the CSS-native answer, which is the whole point. Mention only if needed as the "what you'd have hand-rolled before" contrast (≤1 sentence), not implemented.

**Prerequisites the student already has (assume, redefine only in a clause if used):** Tailwind v4 variant grammar and `@`/desugaring intuition (ch018 L4, ch021 L6); the breakpoint scale + `@media` desugaring + content-driven-breakpoints reflex (ch021 L6); `clamp()` + viewport units (ch020 L5); `auto-fit`/`minmax` (ch020 L4); logical-axis intuition for `inline-size` (ch021 L1/L3); semantic tokens + flex/grid layout; CSS-first `@theme` token authoring with no `tailwind.config` (ch018 L1/L2); Baseline as a concept (ch021 L4).

---

## Notes for downstream agents (consolidated)

- **Intentional code divergences (do NOT "correct"):**
  1. Raw `@container (width >= …)`, `clamp()`, `cqi`, and inline `style` inside the `ParamPlayground` preview are pedagogical (teaching the *primitive* and the *unit*), not Tailwind-utility smells.
  2. Bracket/arbitrary form for container units in *app* code (`text-[clamp(1rem,6cqi,1.5rem)]`, `p-[3cqi]`) is the **correct** shape — these have no scale step, so the escape hatch is right, not a violation of "stay on the scale." Say so in-prose.
  3. The live `ReactCoding` uses **real** `@container`/`@md:` utilities (they resolve on the Tailwind Play CDN) — **no CDN-literal substitution** (this is the welcome exception to the ch021 CDN caveat). Only `--container-*` `@theme` customization fails on the CDN; it's shown as a static `@theme` fragment only, never a live exercise.
- **Code-convention alignment:** matches the conventions doc line "Container queries (`@container`, `@sm:`, `@md:`) over viewport breakpoints for component-level layout" — this lesson *is* the teaching of that rule. App-code samples use semantic tokens and `@theme` fragments (never whole files), consistent with L2–L6 staging.
- **Continuity hooks that must stay verbatim-compatible:** L6's decision rule ("page-level structure → viewport query; component-level adaptation → container query; most SaaS UIs use both"); L6's "media query = how big the *screen*; container query = how big this *box*" line; the `ContextlessCard` wide-feed-vs-narrow-sidebar framing as the intro hook; `@md` = 28rem/448px vs viewport `md` = 768px as the scale-contrast anchor.
- **Single-breakpoint convention ended at L6** — this lesson is multi-breakpoint by nature; not a divergence.

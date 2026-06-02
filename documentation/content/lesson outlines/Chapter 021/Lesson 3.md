# Borders, radius, and the elevation scale

**Sidebar label:** Borders, radius, shadows

---

## Lesson framing

This is the third decoration lesson of the chapter. Lesson 1 installed the reading surface (type), lesson 2 the color surface (OKLCH tokens). This lesson installs the **decoration surface**: the three utilities a senior actually reaches for to make a box read as a distinct, layered object — `border`, `border-radius`, and `box-shadow` — plus the focus-ring family (`outline` / `ring-*`) and the glass-morphism reach (`backdrop-filter`).

**The one mental model to install: elevation is a scale, not a decoration.** The spine of the lesson is that these utilities are not per-component ad-hoc choices — they are the design system's *layering language*. Every surface sits at a tier (flush base → bordered card → hover lift → floating modal/dialog → tooltip), and each tier maps to a known shadow step (and usually one shared radius). The senior reach is "one elevation step per surface tier"; the junior smell is `shadow-2xl` on a card that should read as one step up, or mixing `rounded-md` and `rounded-2xl` cards in the same view. This reframes a pile of utilities (`shadow-sm`…`shadow-2xl`) as a single ordered ladder the student reads top-to-bottom.

**Why this framing minimizes cognitive load.** The naive way to teach this is a flat catalogue of every utility (border widths, every radius step, every shadow step, drop-shadow, backdrop-filter). That's a menu, and menus don't transfer. Instead each utility is introduced through the *decision* it encodes: a border is the cheapest separation (1px hairline); radius is a single design-system constant reused everywhere; shadow is the depth axis. The student leaves able to answer "what makes this card read as one step above the page, and this dialog read as floating?" — not able to recite the shadow scale.

**Recall hooks (must stay consistent with lessons 1–2).** Reuse the established framings verbatim where possible:
- *"Reflex framing = which utility on which surface"* (L1) — the lesson's recurring sentence shape. Every utility lands as a surface→utility pairing.
- *"Write off the scale; arbitrary `[...]` is a smell, grow the scale in `@theme` instead"* (L1) — applies directly to radius and shadow.
- *Semantic tokens over primitives* (L2, ch018 L5) — borders use `border-border` / `border-input`, not `border-zinc-200`; the card uses `bg-card`, not `bg-white`.
- *Preflight's `--default-border-color`* (ch019 L3) — the reason bare `border` is a working hairline and not the raw-CSS `currentColor` surprise.
- *`/N` alpha compiling to `color-mix`* (L2) — reused for `ring-ring/50` and `shadow-blue-500/50` and the `bg-background/70` glass header. Do not re-teach the mechanism; reference it.
- *Stacking context* (ch020 L9) — `drop-shadow` and `backdrop-filter` are filters; they create a stacking context. One-line callback, not a re-teach.
- *OKLCH* (L2) — Tailwind v4 shadows carry OKLCH-based color with built-in alpha so they tint correctly in dark mode. One sentence, cashes in L2.

**The shadcn anchor.** `--radius` is the central knob shadcn exposes and most projects tune once; `ring-*` is the form shadcn buttons/inputs/selects actually ship. Ground the lesson in this so the student recognizes the code they'll read in `components/ui/`. The student is a *token consumer* here (L2's spine), reading the shipped surface, occasionally tuning `--radius`.

**Cross-lesson boundary to hold.** `:focus-visible` (the pseudo-class) is **owned by lesson 4**. This lesson teaches the *decoration mechanics* of the focus ring — why `outline` is the right primitive (no layout shift) and how `ring-*` composes with rounded corners and offset — and always shows it through the `focus-visible:` variant at the call site (never bare `outline`), but does **not** teach the pseudo-class itself. Name it at the call site, trust lesson 4 for the model.

**Format mix.** Decoration is inherently visual, so the lesson is preview-heavy: one centerpiece `ParamPlayground` (the elevation lab — consistent with L1/L2 having a centerpiece playground), targeted before/after `Figure`s for the outline-vs-border layout-shift point and the drop-shadow-vs-box-shadow shape point, an `AnnotatedCode` walkthrough of a real shadcn-style card + focus-ring composition, and one `ReactCoding` target-match exercise plus a consolidating `Buckets`/`MultipleChoice` pair. Diagrams are simple CSS-rendered artifacts (the point is the *rendered* difference, devtools-inspectable), not system graphs.

---

## Lesson sections

### Introduction (no header)

Open on the senior question, concrete and visual. A card with `rounded-lg border bg-card shadow-sm` reads as one step above the page; swap `shadow-sm` for `shadow-2xl` and the same markup reads as a floating modal — nothing else changed. State the lesson's claim: borders, radius, and shadows are the design system's elevation language, and a senior reaches for them as an ordered scale, not as one-off decoration. Preview the end state: by the end the student can dress any box to sit at the right tier (flush, card, hover, dialog), add a themable focus ring, and reach for a glass-morphism header — all off the token scale, no arbitrary values.

Connect to what they know: lessons 1 and 2 dressed the *content* of a box (type, color); this lesson dresses the *box itself*. Keep it warm and brief (per pedagogical guidelines — the senior question is implicit, not a section).

### Borders: the cheapest separation

Teach `border` / `border-*` / `divide-*` as the lightest way to separate two surfaces.

- **The bare `border` utility.** `border` = `1px solid var(--color-border)`. Make the token explicit: the color comes from `@theme`'s `--color-border`, and the *reason* bare `border` "just works" (instead of the raw-CSS `border-color: currentColor` surprise) is Preflight's `--default-border-color` — one-line callback to ch019 L3, do not re-teach Preflight. This is the senior default hairline.
- **Width and sides.** `border-2`, `border-4` for emphasis; side-specific `border-t` / `border-b` / `border-x` / `border-y`; logical `border-s` / `border-e` for RTL-safe code (consistent with the logical-properties reflex established in L1 for `text-start/end` and in the code conventions). Frame the reflex: reach for logical sides by default.
- **Color overrides via semantic tokens.** `border-input` (form fields), `border-destructive` (error state), `border-primary`. Hammer the L2 reflex: semantic tokens, never `border-zinc-200`. A translucent hairline is `border-white/10` (cash in the `/N` alpha from L2 — the canonical dark-surface divider).
- **Style.** `border-dashed` / `border-dotted` — rare in production, named here because exactly one place earns dashed borders in 2026: empty-state placeholders and drag-drop drop zones. `border-double` and the rest are recognition only. Frame dashed honestly: it's a specific signal ("nothing here yet / drop here"), not decoration.
- **`divide-*` — borders between siblings.** `divide-y` puts a hairline between every stacked child (list rows, settings panels) without writing per-row borders or fighting the first/last edge. `divide-x` for horizontal. Note `divide-*` color works like `border-*` color (`divide-border`). Frame the reflex: a stacked list of rows is `divide-y divide-border`, not a border on each row.

**Code handling.** Simple `Code` blocks for the utility forms. A short `CodeVariants` for the divide-y win: tab A shows the junior approach (border on each `<li>`, plus the awkward `last:border-0` or `border-t` dance), tab B shows `divide-y divide-border` on the parent — the before/after makes the ergonomic win obvious. This is a genuine before/after, which is what `CodeVariants` is for.

**Tooltip terms:** `hairline` (1px border), `RTL` (right-to-left scripts; why logical sides matter).

### One radius, reused everywhere

Teach the `rounded-*` scale and, more importantly, the discipline of picking one or two values.

- **The scale.** `rounded-xs` (2px), `rounded-sm` (4px), `rounded-md` (6px), `rounded-lg` (8px), `rounded-xl` (12px), `rounded-2xl` (16px), `rounded-3xl` (24px), `rounded-4xl` (32px), `rounded-full`, `rounded-none`. (The bare `rounded` still maps to the base value; teach the explicit steps.) Per-corner (`rounded-t-lg`, `rounded-bl-md`) and logical (`rounded-s-lg`, `rounded-e-lg`, plus `rounded-ss-*`/`rounded-ee-*` for start-start/end-end corners) variants exist; name them, don't dwell. Scale fact-checked against current Tailwind v4 docs.
- **The senior discipline (the real lesson here).** A design system picks one or two radius values and reuses them; mixing `rounded-md` cards with `rounded-2xl` cards in the same surface is a smell. This is the exact same shape as L1's "write off the scale" — call that hook explicitly. The central knob is shadcn's `--radius` token: components derive their corners from it (the shadcn primitives compute `rounded-lg`/`-md`/`-sm` as offsets from `--radius`), so tuning one variable in `globals.css` re-rounds the whole app. The student is a token consumer; tuning `--radius` is the one authoring move, shown as a fragment of `globals.css` (never a whole file — consistent with L2's fragment convention).
- **`rounded-full` mechanics and the avatar pattern.** `rounded-full` on a non-square element makes a *pill*, not a circle — this is the #1 beginner surprise. The circle pattern is `aspect-square rounded-full` (cross-ref the aspect-ratio utility; the student met sizing in ch020). Pills (`rounded-full` on a wider-than-tall badge/button) are a legitimate, common reach — frame both as intentional outcomes of the same utility.

**Component:** a small live `ParamPlayground` is tempting here, but consolidate radius into the centerpiece elevation lab (next section) to avoid two adjacent playgrounds. Here, use a compact `Figure` with a single CSS-rendered strip showing the same card at `rounded-sm` → `rounded-lg` → `rounded-2xl` → `rounded-full`, captioned to make the "pick one, reuse it" point — a static visual reference, low cognitive cost.

**Tooltip terms:** `pill` (fully-rounded rectangle vs. circle).

### Shadows: the elevation ladder

The conceptual heart of the lesson. Teach `box-shadow` as the depth axis and tie each step to a surface tier.

- **The scale as a ladder.** `shadow-2xs`, `shadow-xs`, `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`, `shadow-none`. Inset (pressed/well) surfaces use the separate v4 family `inset-shadow-2xs` / `inset-shadow-xs` / `inset-shadow-sm` — **not** the v3 `shadow-inner` (renamed in v4; do not show `shadow-inner`). (Fact-checked: Tailwind v4 renamed the v3 bare `shadow` → `shadow-sm` and v3 `shadow-sm` → `shadow-xs`; teach the v4 names above and never show the bare `shadow`. v4 also split inset shadows into the `inset-shadow-*` family and added `inset-ring-*`, allowing up to four stacked shadow layers on one element — that capability is what makes the multi-layer-depth point below true.)
- **The surface-tier mapping (the senior reach).** Present this as an explicit ladder, because it's the transferable model:
  - base / page surface → no shadow
  - resting card → `shadow-sm`
  - hover-lifted card → `shadow-md` (paired with a `transition`, forward-ref to lesson 5 of ch021 for the motion; here just name `transition-shadow`)
  - dropdown / popover → `shadow-md`
  - dialog / modal → `shadow-lg` or `shadow-xl`
  - tooltip → `shadow-md`
  Frame the discipline: one step per tier; `shadow-2xl` on a card is almost always wrong because it reads as a modal. This is the lesson's headline watch-out.
- **Why shadows tint correctly in dark mode.** Tailwind v4 shadows use OKLCH-based color with built-in alpha (cash in L2's OKLCH + `/N` alpha in one sentence). The student doesn't hand-tune shadow color per theme; the scale already does it.
- **Realistic depth is multi-layer.** Each `shadow-*` step is not one shadow but several stacked `box-shadow` values (a tight contact shadow plus a soft ambient one) — that layering is what makes depth read as real. The student doesn't author this; Tailwind ships it in the scale. One sentence, so the student understands *why* a single `box-shadow` they hand-write looks flat compared to the utility.
- **Colored shadows — the brand-glow reach.** `shadow-blue-500/50` colors the shadow itself (cash in `/N` alpha). Reaches: a highlighted/active state, a brand-tinted hover glow on a feature card. Frame the watch-out honestly: every colored shadow is a deliberate brand decision, not a default — the default shadow is neutral.
- **The clipping gotcha.** `box-shadow` is **not** clipped by `overflow: hidden` — the shadow extends past a clipped parent. This bites students who wrap a shadowed card in an `overflow-hidden` container expecting the shadow to be contained. Name it where they'll hit it.

**Centerpiece component — the elevation lab (`ParamPlayground`).** This is the lesson's centerpiece interactive (consistent with L1/L2 each having one). A single card preview driven by controls:
- `radius` — a slider in px piped to `border-radius` via `suffix="px"` (more "feel-the-knob" than a select; consolidates the live radius manipulation here so the radius section's visual can stay static).
- `elevation` — a `select` over the named tiers (`none`, `xs`, `sm`, `md`, `lg`, `xl`, `2xl`) mapping to the box-shadow scale. Implement by reading the param into a `data-`/class hook on the preview, or by piping a CSS var that selects among prebuilt shadow values in a scoped `<style>`. (Preview reacts in pure CSS — within ParamPlayground's constraints.)
- `border` — a toggle (`on`/`off`) so the student feels border + shadow as independent layers.
- A `Readout` echoing the resulting class string (e.g. an `expr` composing `'rounded-[' + radius + 'px] ' + (border ? 'border ' : '') + 'shadow-' + elevation`) so the manipulation maps back to the code they'd write. The pedagogical goal: the student *feels* the elevation ladder and sees a card cross from "flush" to "floating" by changing one control, and reads off the exact utilities.

**Tooltip terms:** `inset` / inset shadow (`inset-shadow-*` — shadow on the inside, for pressed/well surfaces); `ambient shadow` vs `contact shadow` (the two layers, defined briefly to explain multi-layer depth).

### `outline` vs `border`: the focus ring without layout shift

Teach the decoration mechanics of the focus ring. **Boundary: teach the mechanics and the `focus-visible:` call-site form; do not teach the `:focus-visible` pseudo-class — that's lesson 4.** State this explicitly to the writer so they don't drift into pseudo-class territory.

- **The core distinction.** `outline` does **not** occupy layout space; `border` does. So a ring drawn with `border` on focus *shifts every neighboring element* the instant it appears; a ring drawn with `outline` (or `ring-*`) appears without reflowing anything. This is *the* reason focus rings are outlines, not borders. This is the must-teach idea of the section.
- **Why a ring at all / why not bare `outline`.** A focus ring must be visible (accessibility — cross-ref the WCAG reflex from L2, lean on lesson 4 / ch027 for the discipline) but only on keyboard focus, which is why it's always written as the `focus-visible:` variant, never a bare `outline` on the element (a bare `outline` shows on every mouse click — annoying). Show the canonical form: `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring`. Name `outline-offset` (pushes the ring off the element so it doesn't hug the edge) and `outline-ring` (the themable ring color token). Do **not** explain *what* `:focus-visible` matches beyond "keyboard focus" — defer to lesson 4.
- **`ring-*` — the shadcn shorthand.** `ring-2 ring-ring/50 ring-offset-2 ring-offset-background` produces a haloed ring with a themable gap color. Explain why shadcn ships `ring-*` over a raw `outline`: it composes with `border-radius` (the ring follows rounded corners), supports a themable offset color (`ring-offset-background`), and stacks as a `box-shadow`-style halo. Mechanically, `ring-*` is implemented via box-shadow layers — name that so the student isn't surprised it interacts with `shadow-*` (a reason shadcn components sometimes need care combining ring and shadow). Cash in `/N` alpha for `ring-ring/50`. **v4 fact to keep coherent:** the bare `ring` utility is now a **1px** stroke whose default color is `currentColor` (v4 changed both — v3's 3px blue focus ring is now `ring-3`). So always write an explicit width *and* color (`ring-2 ring-ring/50`); never lean on bare `ring` expecting the old blue halo. This is why every example here specifies the width and the token.
- **The reflex.** Every interactive element (button, link, input, select) gets a `focus-visible:` ring. The student writes the variant, never the bare `outline`. This is the headline watch-out of the section.

**Centerpiece visual — the layout-shift before/after (`Figure` or `TabbedContent`).** The pedagogical goal is to make "outline doesn't shift, border does" *visible*. Two side-by-side rows of three buttons each, rendered live in CSS:
- Row A: focus simulated with a `border` ring → the focused button is visibly wider/taller and its neighbors have nudged.
- Row B: same focus with `outline`/`ring` → nothing moves.
Use `TabbedContent` (tab "border — shifts" / tab "outline — stable") or a two-panel `Figure`. Since `:focus-visible` can't be triggered statically, simulate the focused state with a permanent class on the middle button (a deliberate teaching simplification — note for the writer that this is staged, not production shape, consistent with L1/L2 staging notes). Caption: this is the whole reason focus rings are outlines.

**Code handling.** An `AnnotatedCode` walkthrough of a realistic shadcn-style button or card className string that combines this lesson's full surface — `rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-offset-2`. Step through it: the radius, the hairline border, the resting elevation, the hover lift, the focus ring. This is the payoff — every utility from the lesson in one real className, focused one part at a time (exactly AnnotatedCode's purpose). Use `color` tints per step (blue default per the component doc). Keep `focus-visible:` steps to "the keyboard focus ring," deferring the pseudo-class.

**Tooltip terms:** `reflow` / layout shift (re-running layout when an element's size changes); `halo` (the offset ring with a gap).

### `drop-shadow` vs `box-shadow`: shadow that follows the shape

Teach the second shadow primitive and when it beats `box-shadow`.

- **The distinction.** `box-shadow` follows the element's rectangular bounding box. `drop-shadow` (a `filter`) follows the element's *rendered shape* — transparent regions, rounded corners on irregular SVGs, notches. So a star icon or a logo with transparency casts a shadow shaped like the star with `drop-shadow`, and a shadow shaped like a rectangle with `box-shadow`. (Tailwind utility names: `drop-shadow-xs` … `drop-shadow-xl`; verify the current step names in the fact-check pass alongside box-shadow.)
- **The reach.** `drop-shadow-*` for icons and irregular/transparent shapes (SVG glyphs, cut-out images); `box-shadow` for everything rectangular (cards, dialogs, buttons) — which is almost everything. Frame it as: reach for `box-shadow` by default; reach for `drop-shadow` only when the shape is irregular and the rectangular shadow would look wrong.
- **The costs.** Two honest watch-outs: (1) `drop-shadow` is a `filter`, so it creates a stacking context — one-line callback to ch020 L9, don't re-teach. (2) `drop-shadow` is more expensive to paint than `box-shadow` — use it when the shape demands it, not by default.

**Centerpiece visual — the shape comparison (`Figure`).** The pedagogical goal: make the bounding-box-vs-shape difference *obvious*. One transparent shape (a CSS triangle via `clip-path`, or an inline SVG star) shown twice side by side: left with `box-shadow` (a rectangular shadow halo around the invisible box — looks broken), right with `drop-shadow` (a shadow tracing the actual shape — looks right). Live CSS render; the rendered difference is the entire point (same rationale as L2's `in oklch` vs `in srgb` Figure). One sentence caption.

**Tooltip terms:** `filter` (CSS filter functions — the family `drop-shadow` belongs to).

### `backdrop-filter`: the glass-morphism header

Teach the glass effect as a single, specific, common reach — the sticky translucent header.

- **What it does.** `backdrop-blur-*` (plus `backdrop-saturate-*`, `backdrop-brightness-*`) blurs and tints the content *behind* a semi-transparent element — not the element's own content. Make the "behind, not inside" distinction explicit; it's the common confusion.
- **The canonical reach.** A sticky site header that's `bg-background/70 backdrop-blur` (cash in `/N` alpha from L2): page content scrolls *under* it, gets blurred, and the header text stays legible over the frosted blur. This is *the* place glass-morphism earns its weight in a 2026 SaaS — name it as the one reach, not a decorative toy.
- **The costs (honest framing).** (1) `backdrop-filter` is GPU-composited on every paint — fine for one sticky header, slow if applied to many elements; budget it. (2) It's a `filter`-family property → creates a stacking context (ch020 L9 callback). (3) No effect if the content behind has nothing to blur (a flat background under it) — the GPU cost is paid regardless, so don't apply it where there's nothing to frost.

**Component.** A `Figure` rendering a small mock: a scrollable strip of content with a sticky `bg-background/70 backdrop-blur` bar pinned over it, so the student sees the frosted-blur effect with content visible-but-blurred underneath. If a pure-CSS sticky-within-figure mock is fiddly, fall back to a `Screenshot` of a real frosted header. Goal: the student recognizes the effect and the `bg-*/70 backdrop-blur` recipe.

**Tooltip terms:** `glass-morphism` / frosted glass (the translucent-blurred-surface UI style); `GPU compositing` (why it has a paint cost).

### Practice: dress a card to its tier

A consolidation section placing the exercises (per pedagogical guidelines, exercises live where they belong, not bundled at the end — but a single applied exercise that synthesizes the whole lesson legitimately sits last as the payoff).

- **`ReactCoding` target-match (primary).** Give the student a bare `<div>` card with content and a target render of a finished card: radius, hairline border, resting elevation `shadow-sm`, a `hover:shadow-md transition-shadow` lift, and a `focus-visible:ring-2 focus-visible:ring-offset-2` ring on an inner button. Use `target` + `live` (target-match mode, per the ReactCoding doc — visual comparison, instant feedback). Instructions: "Match the target — give the card its radius, hairline border, resting elevation, a hover lift, and a keyboard focus ring on the button." This exercises the full surface in the form the student will actually write. (Note for the writer: ReactCoding runs Tailwind v4 Play CDN and can't ingest a custom `@theme`, so semantic tokens like `bg-card`/`ring-ring` and `--radius`-derived corners may not resolve — same constraint L2 hit. Author the target against CDN-resolvable utilities — e.g. `rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-white/10 shadow-sm hover:shadow-md transition-shadow`, and an inner button with `focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-2` — and add a one-line note that app code uses semantic tokens. Prefer this CDN-resolvable target so auto-feedback works; flag the divergence as intentional.)
- **`Buckets` (consolidation).** Sort utilities/scenarios into the right elevation tier or the right primitive. Two good framings: (a) drag surfaces (`resting card`, `dialog`, `tooltip`, `page background`, `hover state`) onto shadow steps; or (b) two-column sort: "use `box-shadow`" vs "use `drop-shadow`" with items (a card, a dialog, an SVG star icon, a button, a transparent logo). Pick (b) — it drills the highest-value decision. Consistent with L2 closing on a `Buckets`.
- **`MultipleChoice` (recall checks).** One or two targeted questions on the headline traps: e.g. "Why are focus rings drawn with `outline`/`ring-*` instead of `border`?" (correct: outline doesn't occupy layout space so it doesn't shift neighbors) and "A card should read as one step above the page — which shadow?" (correct: `shadow-sm`; distractor `shadow-2xl` = reads as a modal).

### External resources (optional)

One or two `ExternalResource` cards: the Tailwind v4 docs pages for box-shadow / border-radius / borders (current v4, not v3), and optionally the MDN `backdrop-filter` page. Keep to genuinely useful references.

---

## Scope

**This lesson teaches:** `border` / `border-*` (width, sides incl. logical, color via semantic tokens, dashed/dotted) and `divide-*`; the `rounded-*` scale and the one-or-two-radius discipline anchored on shadcn's `--radius`; `box-shadow` as the elevation ladder mapped to surface tiers (base/card/hover/dialog/tooltip), the v4 `inset-shadow-*` form, colored shadows, the `overflow` clipping gotcha; the `outline` vs `border` layout-shift distinction and `ring-*` as the multi-layer focus-ring shorthand (decoration mechanics only, incl. the v4 1px/`currentColor` `ring` default); `drop-shadow` vs `box-shadow`; `backdrop-filter` for the glass-morphism sticky header.

**Explicitly out of scope — do not teach (defer):**
- **The `:focus-visible` pseudo-class itself** (what it matches, `:focus` vs `:focus-visible`, `:focus-within`) → lesson 4 of ch021. This lesson uses the `focus-visible:` variant at the call site as the canonical form and explains only the *decoration* (outline vs border, ring composition), not the pseudo-class semantics.
- **`hover:` / `active:` as pseudo-class concepts** → lesson 4. `hover:shadow-md` appears as a call-site form for the elevation lift; the pseudo-class is not taught here.
- **`transition-*` / motion** → lesson 5 of ch021. `transition-shadow` is *named* at the hover-lift call site so the lift isn't janky, but transitions, durations, easing, and `motion-reduce:` are lesson 5's. One word, no teaching.
- **OKLCH, `color-mix()`, the `/N` alpha mechanism, semantic-token authoring, dark-mode token flipping** → already taught in lesson 2 of ch021. *Use* them freely (`border-white/10`, `ring-ring/50`, `bg-background/70`, neutral OKLCH shadows tinting in dark mode); do not re-teach. One-line callbacks only.
- **Preflight / the reset** → ch019 L3. Reference `--default-border-color` as the reason bare `border` works; do not re-teach Preflight.
- **Stacking context** → ch020 L9. `drop-shadow`/`backdrop-filter` create one; one-line callback, no re-teach.
- **Other `filter` functions** (`blur`, `grayscale`, `sepia`, `hue-rotate`) and the full `backdrop-*` family beyond blur/saturate/brightness → recognition only, no dedicated space.
- **`clip-path` / `mask-image`** → niche, out of scope (a `clip-path` triangle may appear only as the *vehicle* for the drop-shadow shape demo, not taught).
- **SVG-specific decoration** (`stroke-width`, `stroke-dasharray`, `fill`/`stroke`) → ch027 L1 (icons). Out of scope here.
- **Material Design elevation theory** → not the design system the course ships; teach the shadcn/Tailwind scale only.
- **`aspect-ratio` / sizing** → ch020. `aspect-square` is *referenced* for the avatar pattern (`aspect-square rounded-full`) as prior knowledge, not taught.
- **The full Tailwind shadow/radius coordinate tables** → reference material, not lesson material.

**Prerequisite concepts to redefine concisely (one line each, not re-teach):** semantic vs primitive tokens (use semantic — `border-border`, `bg-card`); the `/N` alpha suffix (compiles to a `color-mix`, sets per-property opacity); "write off the scale" (arbitrary `[...]` is a smell; grow the scale in `@theme`); logical properties (`-s`/`-e` for RTL); stacking context (filters create one).

---

## Notes for downstream agents

- **Centerpiece is the elevation `ParamPlayground`** (radius slider + elevation tier select + border toggle + class-string readout). Consolidate radius manipulation here so there aren't two adjacent playgrounds; keep the radius section's visual static.
- **Intentional code divergences (do not "correct"):** (1) simulated focus state via a permanent class on a button in the outline-vs-border Figure — `:focus-visible` can't be triggered statically; this is staged. (2) `clip-path`/inline SVG used purely as the vehicle for the drop-shadow shape demo, not as taught content. (3) ReactCoding target uses CDN-resolvable utilities (`bg-white dark:bg-zinc-900`, `border-zinc-200`, `ring-blue-500/50`) instead of semantic tokens / `--radius`-derived corners because Tailwind Play CDN can't ingest `@theme` — note in-lesson that app code prefers semantic tokens. (4) Raw inline-style box-shadow/border values inside ParamPlayground previews are pedagogical, not production smells.
- **Verified v4 facts to keep coherent (do not regress to v3 forms):** shadow scale is `shadow-2xs`→`shadow-2xl` + `shadow-none`; inset is `inset-shadow-*`, never `shadow-inner`; the v3 bare `shadow`/`shadow-sm` were renamed (`shadow`→`shadow-sm`, `shadow-sm`→`shadow-xs`); radius scale runs `rounded-xs`(2px)→`rounded-4xl`(32px) + `rounded-full`/`-none`; bare `ring` is now 1px / `currentColor` (the old 3px blue focus ring is `ring-3`), so focus examples always specify width + token (`ring-2 ring-ring/50`).
- **Lesson-specific components** likely needed under `src/components/lessons/021/3/`: an outline-vs-border layout-shift before/after (if not done with TabbedContent + CSS), a drop-shadow-vs-box-shadow shape comparison, and possibly the glass-header mock. Mirror the L1/L2 convention of small `.astro` before/after components.
- **Closing line** should tease lesson 4: having dressed the box at rest and named the focus-ring *decoration*, next the student learns the *interaction states* (`:focus-visible`, `:hover`, `:has()`) that drive when these styles apply.

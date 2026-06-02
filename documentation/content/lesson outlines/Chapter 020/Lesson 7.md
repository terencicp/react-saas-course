# Lesson 7 — Position and inset utilities

**Title (h1):** Position and inset utilities
**Sidebar label:** Position & inset

---

## Lesson framing

This is the lesson where elements **leave normal flow**. Chapters/lessons 1–6 taught how boxes sit *with* their neighbors (box model, display, flex, grid, sizing, gap) — every element so far participated in normal flow and pushed its siblings around. `position` is the escape hatch: it lets a badge sit on a corner, a header stick to the top of a scroll, a toast pin to the viewport. The senior framing is that positioning is a **small, surgical tool** — most layout is still flex/grid, and you reach for `position` only for the handful of elements that must escape flow.

**The mental model the student should end with:** there are two questions to ask, in order. (1) *Does this element stay in flow or leave it?* — `static`/`relative` stay (relative just shifts visually + opens a coordinate space), `absolute`/`fixed` leave, `sticky` is the hybrid (in flow until a scroll threshold). (2) *If it leaves flow, what am I positioning it against?* — that's the **containing block**, and it's the concept that demystifies every "why is my badge in the wrong corner" bug. The load-bearing reflex the whole lesson drives toward: **`relative` parent + `absolute` child** is the unit of corner-positioning, and `inset-0` is "fill the parent."

**Where beginners struggle (the pain points this lesson must relieve):**
- The #1 real-world position bug: `absolute` child with no positioned ancestor silently positions against the viewport. The fix (`relative` on the parent) is a reflex once installed, baffling until then. This is the lesson's spine.
- `sticky` "doesn't work" — almost always because there's no scrollable ancestor, or no offset (`top-0`) was set, or the parent is too short. Three distinct failure modes that all read as "sticky is broken."
- `fixed` "doesn't escape" — a `transform`/`filter`/`perspective` ancestor silently becomes the containing block. This is the same trap that L9 (stacking context) cashes in; here we install the *containing-block* half, L9 installs the *z-index* half. Name it, point forward, don't fully unpack.
- The five modes blur together. The fix is to teach them by **what they're positioned against** (nothing / self-offset / nearest positioned ancestor / viewport / scroll-threshold), not as five vocabulary words.

**Pedagogical spine.** Lead with the senior question (toast pinned bottom-right). Build the two-axis model (in-flow-vs-out + containing block) with a *real-CSS* interactive playground so the student can *feel* each mode shift the same box. Then teach the `inset-*` utility family (physical, axis-pair, logical) as the vocabulary for the offsets. Then a gallery of the ~5 canonical layouts a senior actually ships (badge, sticky header, toast, drawer, full-cover overlay) shown as real rendered CSS. Close with the forward references (anchor positioning + Popover API) framed as "the platform is taking over the floating-UI job — recognize the names, shadcn wraps them."

**Cognitive-load management.** Simplified model first: "every element so far has been `static` — it goes where flow puts it." Add `relative` (small visual nudge + coordinate space) → `absolute` (leaves flow, needs an anchor) → `fixed` (anchor is the viewport) → `sticky` (the hybrid, taught last because it's the trickiest). Don't introduce `z-index` numerics beyond naming `z-50` once at the toast (L9 owns stacking); don't introduce overflow mechanics beyond "sticky needs a scroll container" (L8 owns it). Single breakpoint throughout (Ch021 owns responsive variants) — consistent with the whole chapter.

**Interactivity weight.** One `ParamPlayground` (the position-mode explorer — the centerpiece), one `StateMachineWalker` (the "which position mode?" decision tree), a set of real-CSS `<Figure>` galleries for the canonical layouts (the USP: devtools-inspectable), one `ReactCoding` target-match capstone (build a card with an absolutely-positioned badge inside a `relative` parent), and one `VideoCallout`. A `Buckets` drill to sort modes by in-flow-vs-out-of-flow is optional reinforcement.

---

## Lesson sections

### Introduction (no heading — lead-in prose)

Open with the **senior question** the chapter outline names: you need to pin a "Saved" toast to the bottom-right of the screen. `margin: auto` fails (the parent isn't tall enough to push it down). The 2026 answer is `fixed bottom-4 right-4 z-50` — but *why* `fixed` and not `absolute`, and what's that `z-50` doing? State the lesson's promise: by the end the student owns the five `position` modes, knows what each one is positioned *against*, and can build badges, sticky headers, toasts, and drawers without the "it's in the wrong place" bug.

Connect to prior knowledge in one sentence: every element so far (flex items, grid items, stacked blocks) has lived in **normal flow** — it took up space and pushed siblings around. `position` is how a few special elements opt out. Keep it warm and brief (per pedagogical guidelines).

Define `Term`: **normal flow** (re-explain concisely — the default top-to-bottom, left-to-right layout where each element reserves space; assumed from L1/L2 but worth a one-line refresher since it's the thing being escaped).

### Five ways an element can be positioned

Teach the five `position` values, but **frame them by what they're positioned against**, not as a vocabulary list — this is the load-bearing framing that keeps them from blurring. Present as a compact table or short definition list:

- `static` — the default. No offsets apply. The element goes exactly where normal flow puts it. (Every element so far has been `static`.)
- `relative` — **stays in flow** (its original space is preserved), but `top`/`left`/etc. shift it *visually* from that spot. Its real 2026 job isn't the visual nudge — it's to **open a coordinate space** (a containing block) for `absolute` descendants. This dual role is the thing to emphasize: students think `relative` = "move it a bit"; seniors reach for it as "anchor my absolute children here."
- `absolute` — **leaves flow** (reserves no space; siblings collapse as if it's gone). Positioned against the nearest *positioned* ancestor. This is the badge/overlay tool.
- `fixed` — leaves flow, positioned against the **viewport**, and stays put during scroll. The toast/floating-action-button tool.
- `sticky` — the hybrid: behaves like `relative` (in flow) until the user scrolls it to a defined offset, then behaves like `fixed` *within its parent's bounds*. The sticky-header tool. Flag here that it's the trickiest and gets its own section.

Tailwind utilities: `static`, `relative`, `absolute`, `fixed`, `sticky` (1:1 with the CSS values, name them inline).

`Term`: **in flow / out of flow** (reserves space vs. reserves no space — the binary that splits the five modes).

**Optional reinforcement exercise — `Buckets`:** sort `static` / `relative` / `absolute` / `fixed` / `sticky` into two columns: "stays in flow" (static, relative, sticky-until-threshold) vs "removed from flow" (absolute, fixed). Goal: lock in the in-flow/out-of-flow split before the containing-block section. Keep it small; skip if the section already reads cleanly.

### The position-mode playground

A **`ParamPlayground`** (the lesson centerpiece). One box inside a bordered "parent" container; a `select` control drives the box's `position` between `static` / `relative` / `absolute` / `fixed` / `sticky`, plus sliders for `top` and `left` offsets (suffix `px`). Surrounding sibling boxes stay static so the student *sees* flow collapse when the box goes `absolute`.

Pedagogical goal: let the student **feel** the difference between the modes on one element — watch the siblings reflow when it leaves flow, watch `relative` keep its slot while shifting, watch `absolute` snap to the parent's corner. This is the "static `Figure` would freeze the comparison" case the ParamPlayground doc names. Author note: the playground preview is pure CSS (no JS branching), so ParamPlayground is the right primitive. `fixed`/`sticky` are awkward inside a small preview frame (fixed pins to the whole page, sticky needs scroll) — restrict the playground select to `static`/`relative`/`absolute` and demonstrate `fixed`/`sticky` in the canonical-layouts galleries instead. Note this divergence so downstream doesn't try to cram all five into the playground.

`Readout` chips: echo the current `position` value and a one-line "reserves space? yes/no" computed via `expr`.

### What an absolute element is positioned against

The conceptual heart of the lesson. Teach the **containing block**: for an `absolute` element, the offsets (`top`/`left`/etc.) are measured from the **nearest ancestor that is itself positioned** (`relative`, `absolute`, `fixed`, or `sticky`). If no ancestor is positioned, it falls all the way back to the **initial containing block** (≈ the viewport).

Frame the **single most common position bug** here, explicitly: you drop an `absolute` badge into a card, and it lands in the top-left of the *page* instead of the card — because nothing in the card is positioned, so the badge climbed all the way to the viewport. The fix is one class: `relative` on the card. Install the reflex: **`relative` parent + `absolute` child** is the atomic unit of corner-positioning.

Show this as a **`CodeVariants`** before/after: tab 1 "Badge escapes to the page" (`absolute` child, plain parent — `del`/`ins` mark the missing class), tab 2 "Badge pinned to the card" (add `relative` to the parent). Two short JSX snippets. The prose under each names the cause and the fix in one sentence. This before/after is the highest-leverage moment in the lesson — it's the bug every student will hit in real code.

Then the **`fixed` exception, named once and pointed forward:** `fixed` normally anchors to the viewport — *except* when an ancestor has `transform`, `filter`, or `perspective` set, which silently makes that ancestor the containing block instead. This is why a `fixed` modal can end up positioned relative to a transformed parent. Say plainly: "this is the same trap that L9 unpacks for `z-index`; the fix in both cases is to portal the element to `<body>` (L9 / Ch022 L5)." Don't over-explain — install the recognition, defer the depth.

Diagram (optional, if it earns its weight): a small **hand-coded SVG or HTML+CSS** annotated illustration showing nested boxes, with an arrow from an `absolute` child to its containing block in two cases (no positioned ancestor → arrow shoots up to the viewport edge; `relative` parent → arrow stops at the parent). Pedagogical goal: make "climbs up the tree until it finds a positioned ancestor" visual. Use HTML+CSS so it's devtools-inspectable (per diagrams guidance). Keep it compact (~ under the 800px height cap).

`Term`: **containing block** (the rectangle an out-of-flow element's offsets are measured from), **initial containing block** (the viewport-sized fallback).

### Offsets — the inset utility family

Now the vocabulary for *placing* a positioned element. Teach the `inset-*` family in tiers:

- **Single-edge physical:** `top-*` / `right-*` / `bottom-*` / `left-*` — on the `--spacing` scale (reuse L1's scale; `top-4` = `1rem`), plus `top-full`, fractions, arbitrary values, and **negative offsets** (`-top-4`, `-left-2`) which pull the element *outside* its containing block — the canonical reach for a badge that overhangs a card corner.
- **Axis pairs:** `inset-x-*` (left+right), `inset-y-*` (top+bottom).
- **All four:** `inset-*`, and the headline pattern **`inset-0`** = top/right/bottom/left all `0` = "fill the containing block exactly." This is *the* full-cover pattern — pair it with `absolute`/`fixed` for backdrops and overlays.
- **Logical:** `inset-s-*` / `inset-e-*` (inline-start/end) and `inset-bs-*` / `inset-be-*` (block-start/end) — the i18n-aware form that flips under `direction: rtl`. Tie back to L1's logical `ps-*`/`pe-*` story: same idea, now for offsets. **Fact-checked (Jun 2026):** these landed in Tailwind v4.2 and **replaced the now-deprecated `start-*`/`end-*` shorthands** (both still compile, but author `inset-s-*`/`inset-e-*` for API consistency with the block-axis pair). Code conventions mandate logical over physical from day one in any RTL-bound project — state that as the senior default, note physical is fine in LTR-only with mechanical migration later (consistent with L1's framing).

Show the tiers with a small **`Code` block** or a compact reference table mapping Tailwind utility → CSS property → effect. A `CodeTooltips` pass on one snippet could surface the underlying CSS property (`inset-x-0` → `left: 0; right: 0`) inline if it reads cleanly — optional.

`Term`: **inset** (the shorthand for the four offset properties as a group).

### Five layouts you'll actually reach for

A gallery of the canonical production patterns, each a **real-CSS `<Figure>`** (devtools-inspectable per the HTML+CSS diagram doc — this is the format's USP for a layout lesson). Group them with **`TabbedContent`** (one tab per pattern) or render as a vertical sequence of small figures, each with a 2–3 line code caption. For each: the shape, the one-line "when," and the gotcha.

1. **Badge on a card** — `relative` parent + `absolute -top-2 -right-2` child. The atomic unit from the containing-block section, now shown rendered. Gotcha: the negative offsets need the parent to *not* clip (`overflow-hidden` would cut the overhang — forward-nod to L8).
2. **Sticky section header** — `sticky top-0` on a heading inside a scrolling region. The "stays visible as you scroll its section" pattern. Gotcha: needs the offset (`top-0`) and a scroll container — covered in the next section.
3. **Toast pinned bottom-right** — `fixed bottom-4 right-4 z-50`. This closes the loop on the opening question. Name `z-50` as "put it above page content — L9 explains the number." Mention `pb-[env(safe-area-inset-bottom)]` for bottom-anchored chrome on iOS so it clears the home indicator (one-line watch-out, the chapter outline calls for it).
4. **Side drawer** — `fixed inset-y-0 right-0 w-72`. Full-height panel pinned to one edge; `inset-y-0` stretches it top-to-bottom, fixed width sets the rest. The off-canvas-nav / settings-panel shape.
5. **Full-cover overlay / backdrop** — `absolute inset-0` (or `fixed inset-0` for a modal backdrop). The `inset-0` fill pattern. Mention the `pointer-events-none` variant for a click-through hover overlay (decorative layer that doesn't block clicks underneath).

Pedagogical goal: move from *concept* (containing block, inset) to *muscle memory* (the shapes a senior types without thinking). The real-CSS rendering lets the student open devtools and confirm each behaves as taught.

Author note: `fixed` patterns (toast, drawer) inside a Figure card pin to the *page*, not the card — render these as visually-faithful mockups using `absolute inset-0` inside a explicitly-`relative` framed container so they *look* like the real thing within the figure, and say in the caption "in your app this is `fixed`; here it's framed so you can see it." Flag this divergence for downstream so the rendered figure doesn't actually pin to the viewport and break the page.

### Sticky: in flow until it isn't

`sticky` earns its own section because it's the mode that confuses students most and has three distinct failure modes. Teach it as: the element behaves like `relative` (occupies its normal slot) **until** scrolling would carry it past the offset you set (`top-0`), at which point it sticks at that offset — but only **within its parent's bounds**; once the parent scrolls fully past, the sticky element leaves with it. It never escapes its parent (unlike `fixed`).

The three "sticky is broken" failure modes, each with the fix:
1. **No offset set.** `position: sticky` with no `top`/`bottom`/etc. does nothing — it needs to know *where* to stick. Fix: add `top-0` (or whichever edge).
2. **No scrollable ancestor.** Sticky needs an ancestor that scrolls on the relevant axis (or the page itself). If nothing scrolls, nothing sticks. (L8 owns overflow — name the dependency, point forward.)
3. **Parent too short.** Sticky only sticks within its parent's height; if the parent is barely taller than the sticky element, there's no scroll room and it appears not to work.

Pedagogical goal: convert "sticky is flaky" into "sticky has three preconditions — check them." Consider a tiny **`StateMachineWalker`** branch or a `Steps` checklist for "sticky isn't sticking — which precondition is missing?" — but a short numbered list in prose is likely enough; reserve the walker for the all-modes decision (next section).

`VideoCallout` candidate here or at the lesson's mode-overview: a Kevin Powell or similar explainer on `position: sticky` / the position modes (resourcer to source the videoId; one-sentence framing on what angle it covers and runtime). Sticky is a strong video topic because the scroll behavior is motion that prose struggles to convey.

### Choosing a position mode

A **`StateMachineWalker`** (`kind="decision"`) that walks the student through picking a mode the way a senior asks the questions, in order. This is the synthesis exercise — the lesson lives in the *order* of questions, not any single leaf (per the walker doc's "when to reach for it").

Proposed branch structure:
- Root: **"Does this element need to leave normal flow?"**
  - "No, it just anchors absolute children" → Leaf `relative` ("`relative` — opens a containing block; no offsets needed").
  - "No, normal flow is fine" → Leaf `static` ("you don't write `position` at all — this is the default").
  - "Yes" → next question.
- **"Should it stay put while the page scrolls?"**
  - "Yes, always pinned to the screen (toast, FAB)" → Leaf `fixed` ("`fixed` + `inset` offsets + `z-50`; portal out if a transformed ancestor traps it").
  - "It should pin only after scrolling to it (section header)" → Leaf `sticky` ("`sticky top-0` — needs a scroll container and an offset").
  - "No, it just sits at a spot relative to a parent (badge, overlay)" → Leaf `absolute` ("`absolute` inside a `relative` parent; `inset-0` to fill").

Pedagogical goal: give the student a repeatable decision procedure that collapses the five modes into a 2-question funnel. Place it after sticky so every leaf is fully understood.

### Capstone — build a notification card

A **`ReactCoding`** target-match (`live`, `target` set — visual match + AI feedback, no brittle pixel asserts, consistent with L4/L5's capstone style). The student builds a card with: a `relative` container, an avatar (reuse `size-*` from L5), a text region (`flex-1 min-w-0` from L3), and an **unread badge** absolutely positioned at the top-right corner (`absolute -top-1 -right-1`). The target shows the badge correctly pinned; the common failure (forgetting `relative` on the parent) makes the badge fly to the corner of the preview — the student *sees* the bug and fixes it.

Starter uses `export function App()` (sanctioned exercise-scaffold exception per chapter convention). Instructions: "Pin the unread badge to the card's top-right corner. The badge should overhang the edge slightly." Grading is visual target-match + AI feedback comparing the student's TSX to the reference.

Pedagogical goal: the student *experiences* the `relative`-parent reflex by hitting and fixing the canonical bug in a live editor — the strongest possible reinforcement of the lesson's spine.

### The platform is taking over floating UI

The forward-reference close. Two emerging-but-shipping platform features that are absorbing the job of JS positioning libraries — framed as **recognize the name, shadcn wraps it, don't hand-roll it**:

- **CSS Anchor Positioning** — lets an element position itself relative to *any* other element on the page (via `anchor-name` / `position-anchor`), not just its containing-block ancestor. The native answer to "tether this tooltip to that button." **Fact-checked (Jun 2026): Baseline 2026 — Chrome 125+, Firefox 147+, Safari 26+.** Production-usable now.
- **The Popover API** — the native `popover` HTML attribute + `popovertarget` button wiring (and the `showPopover()` JS API) give top-layer popovers, dropdowns, and menus with light-dismiss and focus handling built in — no JS positioning library, no manual `z-index`. The native primitive that anchor positioning pairs with.

Frame: these two together are why a 2026 senior reaches for far less custom positioning code than a 2021 one. The student won't implement them from scratch — **shadcn's Popover / Dropdown / Tooltip (Ch027 L1) wrap them**, and those components also solve the stacking-context trap by portaling to `<body>` (L9 / Ch022 L5). The takeaway: know the names, know the platform is doing the heavy lifting, reach for the wrapped component.

Keep this short — it's orientation, not instruction. One `ExternalResource`/`LinkCard` to MDN's anchor-positioning or Popover API docs is appropriate.

`Term`: **top layer** (the browser-managed layer above all page content where popovers/dialogs render, escaping every stacking context — one-line, supports the Popover framing).

### External resources (optional LinkCards)

- MDN `position` reference.
- MDN CSS anchor positioning (or a current explainer) — for the forward-reference section.
- The chosen `VideoCallout` is in-body, not here.

---

## Scope

**This lesson teaches:** the five `position` values framed by what they're positioned against; in-flow vs out-of-flow; the containing block + the `relative`-parent reflex for `absolute` children; the `fixed`-breaks-under-`transform`/`filter` trap (recognition only, fix = portal, deferred); the `inset-*` utility family (physical single-edge + negative, axis pairs, `inset-0` fill, logical `inset-s-*`/`inset-e-*`/`inset-bs-*`/`inset-be-*` replacing deprecated `start-*`/`end-*`); the three sticky preconditions; the five canonical layouts (badge, sticky header, toast, drawer, full-cover overlay); `pb-[env(safe-area-inset-bottom)]` as a one-line iOS watch-out; anchor positioning + Popover API as forward references.

**Explicitly out of scope (defer, don't teach):**
- **Stacking context and `z-index` at depth** — L9 owns it. This lesson names `z-50` exactly once (at the toast) and the `transform`/`filter` containing-block trap exactly once (pointing at L9). Do not explain what creates a stacking context, the trapped-modal bug, or z-index tiers.
- **Overflow and scroll containers** — L8 owns it. Name "sticky needs a scrollable ancestor" and the `overflow-hidden`-clips-the-badge nod; do not teach overflow modes, `overscroll-behavior`, or `scrollbar-gutter`.
- **React Portals** (`createPortal`) — Ch022 L5 owns it. Name "portal to `<body>`" as the fix for the `fixed`/`transform` trap; do not implement it.
- **shadcn Popover / Dropdown / Tooltip** — Ch027 L1 owns them. Name them as the wrappers; do not build or configure them.
- **CSS `transform` for visual motion** (`translate-x-*`, `translate-y-*`) — Ch021 L5 owns motion. Mention `transform` only as a containing-block trigger.
- **Scroll-locking the background when a modal opens** (`useLockBodyScroll`) — project Ch028 L8.
- **Responsive variants** (`md:fixed`, `lg:sticky`) — Ch021 L6. Single breakpoint throughout.
- **Drag-and-drop / programmatic positioning** — out of scope entirely.

**Prerequisites to redefine concisely (assume, refresh in one line each):** normal flow (L1/L2 — the thing being escaped); the `--spacing` scale feeding `top-*`/`inset-*` (L1); logical-property concept `ps-*`/`pe-*` (L1 — extend to insets); `size-*` (L5), `flex-1 min-w-0` (L3) used in the capstone without re-teaching; `cn()` / utility+variant syntax (Ch018). Do not re-litigate any of these.

---

## Code conventions alignment

- **Logical over physical** offsets are the senior default (`inset-s-*` over `left-*`) per the styling conventions — taught explicitly, with physical named as the LTR-only acceptable form (mirrors L1's stance so the chapter stays coherent).
- **`gap` not margins** for sibling spacing inside the capstone's flex regions (re-affirm, don't re-teach).
- **Semantic HTML first** — the capstone card and the canonical-layout examples use the right elements (`<article>`/`<button>` etc.), not `<div>` soup; the badge example notes a visually-hidden text label or `aria-label` would carry the unread count to AT (one-line nod, Ch027 owns a11y depth).
- **`export function App()`** in `ReactCoding` starters/targets — sanctioned scaffold exception (chapter-wide).
- **Stay on the `--spacing` scale**; arbitrary offsets (`top-[37px]`) are a smell — except documented cases like `pb-[env(safe-area-inset-bottom)]` and arbitrary `inset` for genuine one-offs (note the divergence is deliberate).
- **Single-breakpoint** examples (no `md:`), consistent with the chapter convention (L4's grid divergence does not extend here).
- **Hard-coded accent colors** in `ParamPlayground`/SVG illustrations remain a deliberate divergence from the OKLCH-token convention (illustrations, not project code) — reuse the chapter's established practice.

---

## Notes for downstream agents

- **Reuse, don't reinvent:** L3's `flex-1 min-w-0` recipe and L5's `size-*` recipe appear in the capstone — cite, don't re-explain.
- **New lesson components** likely needed under `src/components/lessons/020/7/`: a `PositionModePlayground` is just a `ParamPlayground` (no new component), but a `ContainingBlockDiagram.astro` (HTML+CSS, the absolute-child-climbs-the-tree illustration) and a `PositionLayouts.astro` (renders the five canonical patterns by `pattern` prop — mirrors L3's `FlexLayout.astro` / L4's `GridLayout.astro`; reuse if a later lesson wants live position patterns) are candidates. Confirm against what already exists before building.
- **`fixed`/`sticky` inside figure cards** must be faked (framed `absolute inset-0` containers) so they don't pin to the viewport and break the page — this is flagged in two sections above; honor it.
- **VideoCallout** needs a real videoId from the resourcer (Kevin Powell position/sticky explainer is the natural pick) — do not invent an ID.

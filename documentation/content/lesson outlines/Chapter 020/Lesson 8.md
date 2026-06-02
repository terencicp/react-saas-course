# Lesson 8 — Overflow and scroll containers

**Title (h1):** Overflow and scroll containers
**Sidebar label:** Overflow & scroll

---

## Lesson framing

This is the lesson where content **stops fitting**. Lessons 1–7 sized and placed boxes assuming everything fit; this lesson asks the question every real app eventually hits: *what happens when there's more content than space?* The CSS answer is `overflow`, and the senior framing is that `overflow` does two jobs at once — it decides whether overflowing content is **clipped** or **scrollable**, and (for the non-`visible` values) it **creates a scroll container**, a box that owns its own scrolling. Almost every confusing scroll bug in a 2026 SaaS UI — a sidebar that scrolls the whole page on iOS, a modal whose backdrop scrolls when you reach the bottom, a sticky header that won't stick, a horizontal card row that squashes instead of scrolling — traces back to *who the scroll container is* and *what happens at its edge*.

**The mental model the student should end with:** two questions, asked in order. (1) *Who is the scroll container here?* — the page (`<body>`) by default, or an inner element the moment you give it `overflow-auto`/`overflow-y-auto` plus a height it can exceed. (2) *What happens when scrolling reaches that container's edge?* — by default the scroll **chains** to the parent (and on touch devices triggers bounce / pull-to-refresh); `overscroll-contain` stops the chain at the boundary. The load-bearing reflex the lesson drives toward: a scrollable inner region is `overflow-y-auto overscroll-contain` on a height-constrained box — and `sticky` children only stick *inside* such a box.

**Where beginners struggle (the pain points this lesson must relieve):**
- **The scroll-chain / pull-to-refresh bug.** You scroll a modal or drawer to its bottom, keep dragging, and the page underneath scrolls — or iOS fires pull-to-refresh. The cause (scroll chaining) is invisible until named; the fix (`overscroll-contain`) is one class. This is the highest-value takeaway in the lesson.
- **`overflow: hidden` is not just "clip."** It silently *creates a scroll container*, which (a) becomes the scrollable ancestor a `sticky` child needs, and (b) clips an overhanging badge from L7. Students reach for `hidden` to clip and get side effects they didn't ask for. `clip` is the side-effect-free clipper, new to most.
- **"Sticky doesn't stick."** L7 named the precondition; this lesson cashes it in — `sticky` needs a *scroll container* on the relevant axis, and the page counts. The sidebar-with-sticky-header pattern is where this clicks.
- **Horizontal scrollers squash.** Drop wide cards in a `overflow-x-auto` row and they shrink to fit instead of overflowing, because flex items shrink by default (L3's `min-w-0` story, mirrored). The fix is `shrink-0` on the children — non-obvious until you've hit it.
- **The scrollbar jolt.** A list that's sometimes short, sometimes long, shifts horizontally when the scrollbar appears. `scrollbar-gutter-stable` reserves the space. Small but constantly visible.
- **The architectural fork no one tells juniors about.** Page-scroll vs. app-shell-scroll is a real decision with real consequences (back/forward, scroll restoration, deep-linking) — not a styling whim. Naming it is half the lesson's senior value.

**Pedagogical spine.** Lead with the senior question (the modal/sidebar that scrolls the page behind it). Install the five `overflow` modes with the *scroll-container-creation* fact foregrounded, not buried — that fact is the hinge for sticky, clipping, and `overscroll-behavior`. Then `overscroll-behavior` as the edge-of-container control (the iOS fix). Then cash in L7's sticky precondition with the canonical sidebar pattern (`DiagramSequence` to show the scroll). Then `scrollbar-gutter-stable`. Then the page-vs-app-shell architectural decision (a `StateMachineWalker` or comparison). Close with `scroll-snap-*` as the modern carousel primitive — the payoff that replaces a JS library. A `ReactCoding` capstone builds the scroll-container sidebar.

**Cognitive-load management.** Simplified model first: "every page has had exactly one scroll container so far — the page itself." Then: `overflow` on an inner box makes a *second* one. Build the modes around that single idea before layering `overscroll-behavior` (what happens at the edge), then `scrollbar-gutter` (the cosmetic edge), then the architectural choice. Keep `position: sticky` mechanics light — L7 taught the mode; this lesson only supplies the missing scroll-container half. Single breakpoint throughout (Ch021 owns responsive variants) — consistent with the whole chapter.

**Interactivity weight.** One `ParamPlayground` (the overflow-mode explorer — the centerpiece, real CSS), one `DiagramSequence` (scrolling a sidebar to show sticky-inside-overflow + the scroll-chain), one `CodeVariants` (the scroll-chain bug / fix, and/or the horizontal-scroller `shrink-0` bug/fix), one `StateMachineWalker` or `TabbedContent` for the page-vs-app-shell decision, one `Buckets` (sort overflow values by "creates a scroll container?" / "clips?"), one `ReactCoding` capstone, and one `VideoCallout`. Real-CSS `<Figure>` galleries for the canonical scroll-container shapes (devtools-inspectable — the format's USP for a layout lesson).

---

## Lesson sections

### Introduction (no heading — lead-in prose)

Open with the **senior question** the chapter outline names: a long modal is open, the user scrolls its body to the bottom, keeps dragging — and the page *behind* the modal starts scrolling (on iOS, pull-to-refresh fires). Or: a tall sidebar makes the whole page scroll when the user only meant to scroll the sidebar. Both are the same root issue — *who owns this scroll, and what happens when it hits the end?* State the lesson's promise: by the end the student can create a scroll container on purpose, stop scroll from leaking to the page, make a header stick inside a scrolling panel, and build a snap carousel — without the iOS bugs.

Connect to prior knowledge in one sentence: L7 said `sticky` "needs a scrollable ancestor" but deferred *what that is* — this lesson supplies it, and it turns out the same concept (the scroll container) explains a half-dozen unrelated-looking bugs. Keep it warm and brief (per pedagogical guidelines).

`Term`: **scroll container** (a box that clips its overflowing content and lets the user scroll to reveal the rest — the lesson's central noun; define it up front, everything hangs off it).

### Five things overflow can do

Teach the five `overflow` values, but **lead with the scroll-container-creation fact** — it's the hinge, not a footnote. Frame each value by *two* questions: does it clip? does it create a scroll container? Present as a compact table (value → clips? → creates scroll container? → when you reach for it):

- `visible` — the default. Content spills past the box, no clipping, no scroll container. (Every box so far has been `visible`.)
- `hidden` — clips overflowing content, no scrollbars, **creates a scroll container**. The hidden side effect: this is what gives a `sticky` child something to stick to, and what clips L7's overhanging badge. Reach: clip decorative overflow when you *also* want a scroll container (rare to want both deliberately).
- `clip` — clips like `hidden` but does **not** create a scroll container and ignores programmatic scrolling. The 2026 reach when you want pure clipping with zero side effects (won't accidentally become a sticky ancestor or swallow a badge). New to most students — contrast it directly with `hidden`.
- `auto` — scrollbars appear **only when content overflows**, creates a scroll container. The senior default for any region meant to scroll.
- `scroll` — always-visible scrollbars even when content fits. Rare in 2026 (looks heavy on macOS overlay scrollbars anyway); name it and move on.

Then the **per-axis variants**: `overflow-x-*` / `overflow-y-*`. The two canonical pairings: `overflow-x-auto overflow-y-hidden` (horizontal scroller — a card row), `overflow-y-auto overflow-x-hidden` (vertical panel — a sidebar). **Watch-out (chapter outline):** you cannot set one axis to `visible` and the other to a scrolling value — the spec forces the visible axis to `auto`, so `overflow-x-hidden overflow-y-visible` does not behave as written. State this once; it surprises people.

Tailwind utilities: `overflow-visible` / `overflow-hidden` / `overflow-clip` / `overflow-auto` / `overflow-scroll`, plus the `overflow-x-*` / `overflow-y-*` families (1:1 with CSS, name inline).

`Term`: **scroll chaining** (foreshadow — define fully in the next section, but the word can appear here).

**Reinforcement exercise — `Buckets` (two-column):** sort the five overflow values into "creates a scroll container" (hidden, clip is the *exception* — flag it as the odd one, auto, scroll) vs. one of two questions. Better framing: a `twoCol` Buckets with buckets "Creates a scroll container" vs "Doesn't" — items: `visible`, `hidden`, `clip`, `auto`, `scroll`. Goal: lock in that `hidden` creates a container but `clip` doesn't (the single most useful distinction in the section) before sticky depends on it.

### The overflow-mode playground

A **`ParamPlayground`** (a lesson centerpiece). A fixed-size bordered box with more content than fits (a column of lines, or a wide row); a `select` control drives `overflow` between `visible` / `hidden` / `clip` / `auto` / `scroll`. The student watches content spill (`visible`), get cut off with no way to reach it (`hidden`/`clip`), or become scrollable (`auto`/`scroll`).

Pedagogical goal: let the student **feel** the difference between clipping and scrolling on one box — especially that `hidden` and `clip` look identical but differ in scroll-container creation (surface that difference in a `Readout`, since it's invisible in the preview). This is the "static `Figure` would freeze the comparison" case the ParamPlayground doc names. Author note: the preview is pure CSS (no JS branching), so ParamPlayground is the right primitive. Hard-coded accent colors in the preview follow the chapter's illustration divergence.

`Readout` chips: echo the current `overflow` value and a computed "creates a scroll container? yes/no" via `expr` (yes for hidden/auto/scroll, no for visible/clip) — making the invisible distinction visible is the whole point.

### What happens at the edge: overscroll-behavior

The conceptual heart of the lesson. Now that an inner box can be a scroll container, teach what happens when the user scrolls *past* its edge. By default the scroll **chains**: a flick at the bottom of a scrolled modal continues into the parent, and ultimately the page — and on touch devices that same chain triggers the browser's bounce and **pull-to-refresh** gestures.

Teach `overscroll-behavior` as the control:
- `overscroll-contain` — stop the scroll chain at this container's boundary, but keep the platform's bounce/glow inside it. The reach for **every modal, drawer, dialog body, and inner-scrolling sidebar**.
- `overscroll-none` — stop the chain *and* kill the bounce/glow. Reach when even the rubber-band feels wrong (full-screen app surfaces).
- `overscroll-auto` — the default chaining behavior.
- Per-axis: `overscroll-y-*` / `overscroll-x-*` for one-axis containers.

Frame the **canonical bug** explicitly with a **`CodeVariants`** before/after: tab 1 "Scroll leaks to the page" (a `overflow-y-auto` modal body with no overscroll control — `del`/`ins` mark the missing class), tab 2 "Scroll stays in the modal" (add `overscroll-contain`). The prose under each names cause and fix in one sentence. This is the highest-leverage moment in the lesson — it's the bug every student ships at least once.

**Watch-out (chapter outline, fact-checked):** `overscroll-behavior` is Baseline universal in 2026 — no polyfill, no fallback, ship it directly. Also note the legacy `-webkit-overflow-scrolling: touch` hack is dead in 2026 (iOS scrolls inner containers smoothly without it) — name it once so students recognize and delete it in old code.

**Scroll-locking the page when a modal opens — name the harder problem, defer the build.** `overscroll-contain` stops the *chain*, but fully locking the background (so the page can't scroll *at all* while a modal is open) is a separate, genuinely hard problem on iOS: naïve `body { overflow: hidden }` works on desktop but iOS touch scrolling ignores it. The senior reach pairs body locking with touch handling, wrapped into a `useLockBodyScroll` hook — **the project chapter (Ch028 L8) builds it; name the pattern and the reason it's hard, don't implement it here.** One short paragraph, forward-pointed.

`Term`: **scroll chaining** (define fully here — scroll momentum continuing from a boundary into an ancestor scroll container), **pull-to-refresh** (the touch gesture scroll chaining can accidentally trigger — one line).

### Sticky needs a scroll container

Cash in L7's deferred precondition. L7 taught that `sticky` is "relative until a scroll threshold, then fixed within its parent's bounds" but said the scroll-container dependency lived here. Now the student has the concept. Teach the **canonical 2026 pattern** that combines this lesson and L7: a sidebar that scrolls *internally* with a header that stays pinned at its top.

The shape: a height-constrained box (`h-dvh` from L5) with `overflow-y-auto overscroll-contain` (this lesson) containing a `sticky top-0` header (L7). Spell out the dependency chain: without the `overflow-y-auto`, the box isn't a scroll container, so the `sticky` header has nothing to stick *to* and just scrolls away with the page; without `sticky`, the header scrolls off as you scroll the sidebar. The two are a pair.

Teach this with a **`DiagramSequence`** (real CSS or faithful mock): step through the sidebar scroll — step 1 top of scroll (header at top, content below), step 2 mid-scroll (header pinned, content scrolled under it), step 3 the scroll staying *inside* the sidebar (the page behind it unmoved, visualizing `overscroll-contain`). Pedagogical goal: make the sticky-inside-overflow relationship and the contained scroll *visible as motion* — the thing prose and static figures struggle to convey. (Author note: if a real scrolling sidebar is awkward inside a figure card, fake the scroll states as discrete frames per step — flag this for downstream, consistent with L7's framed-`fixed` convention.)

`VideoCallout` candidate here: a Kevin Powell or similar explainer on `position: sticky` / scroll containers / `overscroll-behavior` (resourcer to source the videoId; one-sentence framing on angle and runtime). Scroll behavior is motion that video conveys better than prose.

### Reserving room for the scrollbar

Teach `scrollbar-gutter` — the fix for the layout jolt when a scrollbar appears. The bug: a container that's sometimes short (no scrollbar) and sometimes tall (scrollbar present) shifts its content horizontally by the scrollbar's width when the bar appears — visible flicker on every filter/search/expand interaction (and on classic non-overlay scrollbars on Windows especially).

- `scrollbar-gutter-stable` — reserve the gutter space whether or not the scrollbar is showing, so content never shifts. The reach for any container that *conditionally* overflows on interaction (search-results list, modal body, expandable panel).
- `scrollbar-gutter-auto` — the default (gutter appears only with the scrollbar).
- `scrollbar-gutter-both` — reserve on both sides for symmetry (rarer).

**Fact-checked (Jun 2026) — corrects the chapter outline:** the chapter outline says `scrollbar-gutter` needs Tailwind bracket form. That is now **outdated** — **Tailwind v4.3 (released May 8, 2026) shipped first-party `scrollbar-gutter-stable` / `scrollbar-gutter-auto` / `scrollbar-gutter-both` utilities**, alongside scrollbar-*styling* utilities (`scrollbar-thin` / `scrollbar-none` for width, `scrollbar-thumb-*` / `scrollbar-track-*` for color). **Teach the first-party `scrollbar-gutter-stable` utility, not the bracket form.** Mention the styling utilities exist for dashboard chrome (one line) but the senior default is to leave native scrollbars alone (chapter outline watch-out) — custom scrollbars are a dashboard nicety, not a baseline.

`Term`: **scrollbar gutter** (the reserved strip a scrollbar occupies — one line).

### Page scroll or app-shell scroll

The architectural decision the chapter outline calls the senior payoff — and the one juniors are never told is a *decision*. Two models:

- **Page scroll** (the `<body>` is the scroll container) — the 2026 **default**. The browser gives you back/forward scroll position, scroll restoration on navigation, anchor-link jumps, and deep-linking for free. Reach: content sites, marketing pages, most CRUD app pages, anything document-shaped.
- **App-shell scroll** (an inner `<main>` scrolls while the chrome — top bar, sidebar — stays fixed) — the reach for **dashboards and tool-style UIs** where persistent chrome must not scroll away. The cost: you take over scroll restoration manually (Next.js `experimental.scrollRestoration` or a custom hook), and you can break native anchor/deep-link behavior if you're not careful. A deliberate trade, not a default.

Teach the decision with a **`StateMachineWalker`** (`kind="decision"`) or a two-column **`TabbedContent`** comparison (DOM shape + consequences side by side). Proposed walker spine:
- Root: **"Does any chrome (top bar, sidebar) need to stay put while the body scrolls?"**
  - "No — it's a page of content" → Leaf **Page scroll** ("let `<body>` scroll; you get restoration, back/forward, and anchors for free").
  - "Yes — it's a dashboard / tool shell" → next question.
- **"Are you ready to own scroll restoration yourself?"**
  - "Yes" → Leaf **App-shell scroll** ("inner `<main>` scrolls with `overflow-y-auto` + `min-h-0`; wire up scroll restoration manually").
  - "Not sure" → nudge back to Page scroll as the safer default.

Pedagogical goal: convert an invisible default into a conscious decision with named consequences — the senior-mindset core of the lesson. **Watch-out:** the app-shell inner-scroll pattern needs `min-h-0` on the flex/grid child that scrolls (the same min-size floor as L3's `min-w-0` and L4's `minmax(0,…)` — a flex/grid item won't shrink below content height without it, so the inner region never becomes scrollable). Tie this back explicitly — it's the third appearance of the same min-size trap, and naming the pattern across all three is high-value.

### Snap scrolling: carousels without a library

The payoff section — `scroll-snap-*` replaces most JS carousel libraries with pure CSS. Teach the minimal set:
- On the scroll container: `snap-x` (snap on the horizontal axis) + `snap-mandatory` (always settle on a snap point) — or `snap-proximity` (settle only when already near one).
- On each child: `snap-start` (align the item's start edge to the container's snap port) / `snap-center` / `snap-end`.
- `scroll-padding` on the container to offset snap points past a sticky header or inset (name it; one line).
- **Critical companion fix (chapter outline):** horizontal snap children need `shrink-0` (or a fixed width), or flex shrinks them to fit and there's nothing to scroll. This is L3's `min-w-0` / flex-shrink story again, in the horizontal-scroll context — name the parallel explicitly.

The shape for a card carousel: `flex gap-4 overflow-x-auto snap-x snap-mandatory` on the row, `shrink-0 snap-start` on each card. Reach: image carousels, horizontal card scrollers, story-style UIs. Replaces most JS carousel libraries (chapter outline).

Show it as a **real-CSS `<Figure>`** (devtools-inspectable, actually snaps when scrolled) with a 3–4 line code caption, or a small `ReactCoding` exploration if a live editor reads better. Pedagogical goal: the student sees that a production-feeling carousel is ~4 utilities, no dependency — a concrete "the platform replaced the library" win.

`Term`: **snap port** (the region of a scroll container snap points align to — one line, only if it reads cleanly; otherwise skip).

### Capstone — build an internally scrolling sidebar

A **`ReactCoding`** target-match (`live`, `target` set — visual match + AI feedback, no brittle pixel asserts, consistent with the chapter's capstone style). The student builds the canonical app-shell pattern: a fixed-height layout where a sidebar scrolls internally with a `sticky top-0` header pinned at its top and a main region beside it, while the page itself doesn't scroll. The required pieces: a height-constrained scroll container (`overflow-y-auto`), `overscroll-contain` so the scroll doesn't leak, a `sticky top-0` header inside it, and `min-h-0` on the flex child so it actually scrolls. The target shows the header pinned and the page steady; the common failures (forgetting `overflow-y-auto` → header scrolls away; forgetting `min-h-0` → the region never scrolls) are exactly the bugs the lesson taught.

Starter uses `export function App()` (sanctioned exercise-scaffold exception per chapter convention). Instructions: "Make the sidebar scroll on its own with its header pinned to the top — the page itself shouldn't scroll." Grading is visual target-match + AI feedback comparing the student's TSX to the reference.

Pedagogical goal: the student *assembles* the scroll-container + sticky + overscroll + min-h-0 stack in one place — the synthesis of the whole lesson, and the single most common dashboard layout they'll build for real.

### External resources (optional ExternalResource cards)

- MDN `overflow` reference.
- MDN `overscroll-behavior` reference (the iOS scroll-chain fix).
- An interactive `scroll-snap` explainer or MDN `scroll-snap-type` (for the carousel section).
- The chosen `VideoCallout` is in-body, not here.

---

## Scope

**This lesson teaches:** the five `overflow` modes framed by clips?/creates-a-scroll-container? (`visible`, `hidden`, `clip`, `auto`, `scroll`) and the per-axis variants; the spec's force-the-other-axis-to-`auto` rule; `overscroll-behavior` (`contain` / `none` / `auto`, per-axis) as the scroll-chain / pull-to-refresh fix; the sticky-inside-overflow canonical pattern (cashing in L7's deferred precondition); `scrollbar-gutter-stable` (first-party Tailwind v4.3, **not** bracket form) plus a one-line nod to scrollbar styling utilities; the page-scroll vs. app-shell-scroll architectural decision with the `min-h-0` companion fix; `scroll-snap-*` for carousels with the `shrink-0` companion fix; the dead `-webkit-overflow-scrolling: touch` hack (recognition only).

**Explicitly out of scope (defer, don't teach):**
- **Stacking context and `z-index`** — L9 owns it. A scrolling overlay may need `z-*`; name it at most once if a figure requires it, do not teach stacking.
- **`position` modes themselves** — L7 owns them. This lesson supplies the *scroll-container* half of `sticky`'s precondition and reuses `sticky`/`fixed` as already-known; do not re-teach the five modes or the containing block.
- **React Portals** (`createPortal`) — Ch022 L5. Modals scroll-lock and portal in real apps; name neither's implementation.
- **The `useLockBodyScroll` hook implementation** — project Ch028 L8. Name the pattern and *why iOS makes it hard*; do not build it.
- **shadcn Dialog / Drawer / ScrollArea** — Ch027 L1. These wrap the scroll/overscroll patterns; do not introduce them here.
- **IntersectionObserver / scroll-driven animations** (`animation-timeline`, scroll progress) — Ch021 L5 has a brief touch; advanced scroll-driven animation is out of scope.
- **Custom scrollbar styling at depth** (`scrollbar-thumb-*` theming, cross-browser quirks) — name the utilities exist (one line); the senior default is native scrollbars.
- **`content-visibility: auto`** for off-screen render-skipping — niche performance tool, not chapter material.
- **Responsive variants** (`md:overflow-auto`) — Ch021 L6. Single breakpoint throughout.

**Prerequisites to redefine concisely (assume, refresh in one line each):** `position: sticky` / `fixed` and the "sticky needs a scrollable ancestor" precondition (L7 — the thing being cashed in); height sizing `h-dvh` / `min-h-dvh` and the intrinsic-vs-extrinsic / `min-w-0` min-size story (L5/L3 — `min-h-0` is the same trap on the block axis, re-explained through that lens, not re-taught from scratch); `flex` / `flex-col` and flex-items-shrink-by-default (L3 — `shrink-0` reused for horizontal scrollers); `gap` for spacing inside the scroller (L6); `--spacing` scale feeding `scroll-padding`/insets (L1); `cn()` / utility+variant syntax (Ch018). Do not re-litigate any of these.

---

## Code conventions alignment

- **`gap` not margins** for spacing inside the scroll-container and carousel examples (re-affirm L6, don't re-teach).
- **Logical-first stance carries** — where insets/scroll-padding appear, prefer logical (consistent with L1/L7); but overflow/overscroll utilities are axis-physical by nature (`overflow-x`/`overflow-y` map to viewport axes, not inline/block) — state once that these are the physical exception so the student isn't confused by the inconsistency.
- **Semantic HTML first** — the app-shell capstone uses `<aside>` for the sidebar and `<main>` for the content region, not `<div>` soup; the sidebar's scroll region is a real landmark.
- **Accessibility nod (one line each, Ch027 owns depth):** a scroll container with `overflow-auto` should be keyboard-focusable so keyboard users can scroll it (browsers do this for genuinely scrollable regions, but flag it); horizontal carousels need keyboard reachability for their items. Don't go deep — name the concern, point at Ch027.
- **`export function App()`** in `ReactCoding` starters/targets — sanctioned scaffold exception (chapter-wide).
- **Stay on the `--spacing` scale**; arbitrary heights/offsets are a smell. `h-dvh`/`min-h-0` are the load-bearing reaches, not arbitrary values.
- **Single-breakpoint** examples (no `md:`), consistent with the chapter convention (L4's grid divergence does not extend here).
- **Hard-coded accent colors** in `ParamPlayground` / figure illustrations remain a deliberate divergence from the OKLCH-token convention (illustrations, not project code) — reuse the chapter's established practice.

---

## Notes for downstream agents

- **Fact-check correction is load-bearing:** the chapter outline's "`scrollbar-gutter` via bracket form" is stale. Tailwind **v4.3 (May 8, 2026)** ships first-party `scrollbar-gutter-stable`/`-auto`/`-both` and scrollbar styling utilities. Author `scrollbar-gutter-stable`. Verify the current Tailwind minor at write-time in case a later version moved anything.
- **The `min-h-0` / `min-w-0` / `minmax(0,…)` through-line** is the chapter's recurring min-size trap (L3 inline axis, L4 grid, here block axis for app-shell scroll). Name it as "the same floor you saw in flex and grid, now on the vertical axis" — reinforcing the pattern across lessons is high pedagogical value; don't re-derive it from scratch.
- **`hidden` vs `clip`** is the section-one payoff and the highest-confusion point — make the scroll-container-creation difference *visible* (the `ParamPlayground` `Readout`, the `Buckets` drill). Don't let it stay a footnote.
- **Reuse, don't reinvent:** L7's framed-`fixed`/`sticky` figure convention applies — a real scrolling sidebar inside a figure card may be awkward; faking scroll states as `DiagramSequence` frames is the sanctioned fallback. L5's `h-dvh`, L3's `shrink-0` / `min-w-0`, L6's `gap` all appear — cite, don't re-explain.
- **New lesson components** likely needed under `src/components/lessons/020/8/`: the overflow-mode explorer is just a `ParamPlayground` (no new component); a `ScrollContainerDiagram.astro` or the `DiagramSequence` content for the scrolling-sidebar sequence is a candidate; a `ScrollLayouts.astro` rendering canonical scroll shapes by `pattern` prop would mirror L3's `FlexLayout.astro` / L4's `GridLayout.astro` / L7's `PositionLayouts.astro` (reuse if a later lesson wants live scroll patterns). Confirm against what already exists before building.
- **VideoCallout** needs a real videoId from the resourcer (a Kevin Powell `overflow` / `overscroll-behavior` / sticky-scroll explainer is the natural pick) — do not invent an ID.
- **The capstone is the chapter's most-used real layout** (internally scrolling dashboard sidebar) — invest in making its target and AI-feedback rubric solid; it's the synthesis the student will reach for constantly.

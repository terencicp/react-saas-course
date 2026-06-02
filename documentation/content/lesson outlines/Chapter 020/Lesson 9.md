# Stacking context and z-index

Sidebar label: Stacking & z-index

## Lesson framing

This is the final teaching lesson of Chapter 020 — "the trap that wraps the others." Every prior lesson laid out *where* things sit in 2D; this one owns the **z-axis** and the single most confusing CSS bug a junior hits in production: a `z-index` that visibly "doesn't work" (a `z-100` element rendering *behind* a `z-50` element). The senior payoff is not memorizing z-index numbers — it's owning the **stacking context** mental model, recognizing what silently creates one, and reaching for the three durable fixes (portal, `isolation: isolate`, restructure).

Target student: a junior from another field who now knows `position`, `transform` (named, L7/forward), `opacity`, flex/grid, and has shipped `fixed bottom-4 right-4 z-50` toasts in L7 without yet understanding the `z-50`. L7 explicitly deferred the `z-50` numeric and the "`transform`/`filter` ancestor captures `fixed`" trap to *here*; this lesson pays both off. The lesson is the conceptual sibling of the containing-block model (L7): both are "an ancestor silently changes the coordinate system your descendant resolves against." Lean on that parallel — the student already has the muscle.

Core pedagogical decisions:

- **Lead with the bug, not the definition.** The senior question (a tooltip at `z-100` hiding behind a modal backdrop at `z-50`, or a dropdown clipped behind a fixed header) is the hook. The student has *felt* this. The whole lesson is the answer to "why doesn't the bigger number win?"
- **Build the mental model in two simplified stages, then add the trap.** Stage 1: z-index orders siblings *within one context* (the easy, intuitive model — bigger wins). Stage 2: contexts nest, and z-index is **scoped** — a child's z-index never escapes its parent's context, so the comparison the student *thinks* they're making (100 vs 50) isn't the comparison the browser makes (parent's `auto`≈0 vs sibling's 40). This staged reveal is the lesson's spine and the highest-leverage cognitive-load reduction: the "bug" becomes obvious once the scope rule lands.
- **Two prerequisite facts gate everything and must come first:** (1) `z-index` only applies to *positioned* elements (and flex/grid items / `opacity<1` etc.) — on a `static` element it's inert; (2) a fresh **stacking context** is a self-contained "z-index universe" — its descendants are sorted internally and then the *whole context* is placed as one unit in its parent. Without these two, the bug can't be reasoned about.
- **The trigger list is recognition, not memorization.** Frame it as "things that look purely cosmetic but secretly create a context" — `opacity < 1` is the headline villain (most surprising, hides in fade transitions), then `transform`/`filter`/`backdrop-filter`, then `position: fixed/sticky` (always), then `isolation: isolate` (the *deliberate*, side-effect-free one — the hero of the list). Give the student a *diagnostic reflex* ("walk up the DOM looking for opacity/transform/filter/fixed/sticky/isolate"), not a list to recite.
- **The senior fix is architectural, not numeric.** `z-9999` is the junior reflex and a code smell — "you can't beat a trap from inside it." The three real fixes: **portal to `<body>`** (escape the context entirely — the 2026 default for modals/popovers/tooltips, and what shadcn Dialog/Popover/Tooltip already do under the hood), **`isolation: isolate`** (deliberately create a context to *contain* layering inside a card/section), and **restructure the DOM** (lift the floating element above the trapping ancestor). Portal and isolate are forward-references (React Portals = Ch022 L5; shadcn = Ch027 L1) but the *concept* must land here so the student recognizes why those components exist.
- **End with conventions that make layering legible.** A small named z-tier scale (`z-10`/`z-20` content, `z-30`/`z-40` chrome, `z-50` overlays) beats ad-hoc numbers. This is the "senior mindset over syntax" filter: the deliverable is a *team convention*, not a magic number.

Interactivity weight (mirrors the chapter's per-lesson budget): one live `ParamPlayground` (real CSS, the centerpiece that lets the student *feel* opacity create a context and break z-index), one `DiagramSequence` (the staged stacking-context model + the canonical-bug walk-through), one `CodeVariants` (broken vs three-fix, `syncKey`), one `StateMachineWalker` (kind="decision", the diagnostic walker "my z-index doesn't work → which fix?"), one `Buckets` (creates-a-context vs doesn't), one `ReactCoding` target-match capstone (reproduce-then-fix the trapped overlay), one `VideoCallout`. Reuse the chapter conventions: hard-coded-accent `ParamPlayground`/SVG illustration divergence (illustrations, not project code — don't route through `@theme`), `export function App()` exercise scaffolds, single-breakpoint examples (no `md:` — Ch021), the L7 framed-figure honesty caption ("in your app this is `fixed`; here it's framed") wherever a fixed/sticky overlay would otherwise pin to the real viewport and break the page.

## Lesson sections

### Introduction (no header)

Open on the bug, in prose, in production framing. Concrete scenario the student recognizes: you ship a modal at `z-50`; inside it a tooltip needs to sit above the modal, so you give it `z-100`. The tooltip renders *behind the modal's dim backdrop*. You bump it to `z-9999`. Still behind. You've now spent twenty minutes fighting a number that should obviously win. (Alternative framing to weave in: a dropdown menu clipped behind a `fixed` header with a `backdrop-blur`.)

State the reframe plainly: `z-index` is not a global "bring to front" dial. It's a *local* ordering scoped to a **stacking context**, and the reason `9999` loses is that the tooltip is trapped inside a context that, *as a whole*, sits below the thing it's fighting. Name the connection to L7 explicitly: this is the same shape as the containing-block surprise (an ancestor silently changed what your offsets resolve against) — now an ancestor silently changed what your `z-index` competes against. Preview the deliverable: by the end the student owns the stacking-context model, can find the trapping ancestor in seconds, and reaches for the portal / `isolate` fix instead of escalating numbers.

Keep it warm and brief (~3 short paragraphs). End by paying off L7's promise — "remember the `z-50` on that toast we never explained? This is that lesson."

### Two facts before z-index makes sense

The gate. Two prerequisite facts, each one short subsection of prose + a tiny inline example. These are non-negotiable prerequisites for everything downstream, so they come first and stay tight.

**Fact 1 — z-index only bites on positioned (and a few other) elements.** On a `static` element, `z-index` is silently ignored. It applies to `relative`/`absolute`/`fixed`/`sticky` elements, and (a useful surprise) to flex and grid *items* even when `static`. Tie back to L7: this is why every canonical overlay paired a `position` value with its `z-*`. Show a 3-line `Code` snippet: a `z-50` on a `static` div does nothing; add `relative` and it sorts. This pre-empts the "I set z-index and nothing happened" sub-bug, which is distinct from the stacking-context bug and worth separating so the student doesn't conflate them.

**Fact 2 — every page is a tree of stacking contexts.** Define a `Term` "stacking context" = a self-contained group whose members are sorted on the z-axis *among themselves*, and which is then placed as a single unit inside its parent context. The root context is the `<html>` element. Critically: **z-index values only compete inside the same context.** A `z-100` in context A and a `z-40` in context B never compare directly — what compares is the *contexts'* own positions in their shared parent. This is the load-bearing sentence of the lesson; state it, bold it, and signal it's about to be made visual. Defer the "what creates a context" trigger list to its own section (next) — here only establish *that* contexts nest and scope z-index.

Use a `Term` for "stacking context" (reused throughout). Keep both facts free of the trigger list — that's deliberate sequencing to avoid front-loading the surprising part.

### How elements stack: the paint order, simplified then nested

The model, built in two stages via a single `DiagramSequence` (the chapter's preferred "build complexity gradually" vehicle; reuses the L8 `DiagramSequence` pattern). Each step is a small HTML+CSS layered illustration (devtools-inspectable; hand-coded boxes, hard-coded accents per the chapter divergence). Pedagogical goal: make "scoped to a context" *visible* so the canonical bug in the next section is self-evident rather than memorized.

`DiagramSequence` steps:

1. **One context, three siblings.** Three overlapping positioned boxes in the root context with `z-10`/`z-20`/`z-30`. Caption: higher number paints later (on top). This is the intuitive model the student already half-holds — establish it as the baseline so the twist lands.
2. **Same boxes, swap two z-indexes.** Show the reorder. Reinforces "within one context, the number is the whole story."
3. **Introduce a nested context.** Wrap the middle box in a parent that creates a context (label it generically "context-creating parent"; the *why* is the next section). Give the child inside it a huge z-index. Caption: the child's big number sorts it *inside* its parent, but the parent-as-a-unit only carries its own place in the root.
4. **The reveal — big number loses.** A sibling in the root context with a *small* z-index now paints on top of the trapped child. Caption states the rule in plain words: "the child's `z-index` never left its parent's box; what competes in the root is the parent's place, not the child's number." This is the moment the bug becomes obvious.

Follow the sequence with a tight prose recap naming the two-step sort the browser does: (1) sort each context's members internally; (2) place each context as a unit in its parent. Reuse phrasing the canonical-bug section can point back to.

### Why your z-index "doesn't work": the trapped overlay

The canonical bug, now made concrete and *live*. This is the section the whole lesson exists for. Two vehicles: a live `ParamPlayground` (feel it) and a `CodeVariants` broken/fixed pair (read it).

**The setup, in prose first.** A parent `<div>` with `opacity-95` (a "purely cosmetic" fade — the student would never suspect it) wraps a child with `relative z-50`. A *sibling* of that parent has `relative z-40`. Naively `50 > 40`, so the child should win. It doesn't: the parent's `opacity < 1` created a stacking context, scoping the child's `z-50` inside it; the parent itself participates in the root context with z-index `auto` (≈0). The sibling at `z-40` beats `auto`/0, so it paints over the *entire* parent context — child included. Walk it explicitly against the two-step sort from the previous section.

**`ParamPlayground` (centerpiece, real CSS).** Controls: a slider for the parent's `opacity` (1 → 0.95 → lower), and maybe a toggle to add/remove `isolation: isolate` on the sibling-vs-parent or a select for the trigger property (`opacity` / `transform` / `none`). Preview: the parent-with-child and the sibling, overlapping, rendered with real CSS reading `var(--*)`. `Readout`: a chip that reports "parent creates a context? yes/no" computed from the opacity value (`expr`), and/or which element is on top. Pedagogical goal: the student *drags opacity from 1 to 0.99 and watches the child snap behind the sibling* — cause and effect they can feel, which a static figure cannot deliver (the exact gap `ParamPlayground` exists to fill). Hard-coded accents per chapter divergence. Caption notes opacity is the most surprising trigger precisely because it reads as cosmetic.

**`CodeVariants` (broken → fixed), `syncKey="zindex-trap"`.** Tab 1 "Broken": the JSX/markup above with `opacity-95` parent, `z-50` child, `z-40` sibling — prose explains the trap. Tabs 2–4 are the three fixes (or fold into a single "Fixed" tab cross-referencing the next section; prefer showing the *portal* fix here since it's the 2026 default, and let the fixes section enumerate all three). Use `tsx`/markup. Keep each variant's prose to the delta.

Add a short `:::caution` (Aside) on the specific gotcha from the chapter: a `transition: opacity` fade *briefly* creates a context mid-animation, so a z-indexed child can flicker behind during the fade — the fix is to portal the floating element, or pair opacity with `transform: scale()` (which already creates a context, so no *extra* trap appears). This is a real production bite worth flagging where the concept is fresh.

### What secretly creates a stacking context

The trigger list, framed as recognition + a diagnostic reflex, not memorization. Lead with the senior framing: most of these look purely cosmetic, which is exactly why they bite. Group them so the student remembers the *shapes*, not 12 separate facts:

- **Always:** `position: fixed` and `position: sticky` (no z-index needed). Pays off L7's deferred "`transform`/`filter` ancestor captures `fixed`" trap — now the student knows *why*: those ancestors created a context (and a containing block) the `fixed` element can't escape.
- **Positioned + a real z-index:** `relative`/`absolute` with any `z-index` other than `auto`. Note the subtle pair from the chapter: `relative` alone does *not* create a context, but `relative z-0` *does* — `z-0` ≠ no z-index.
- **The cosmetic villains:** `opacity < 1`, `transform` (any non-`none`), `filter`/`backdrop-filter`, `mix-blend-mode` other than `normal`, `will-change` set to a context-creating property, `contain: layout/paint/strict`. These are the surprising ones; `opacity` is the headline.
- **The deliberate, side-effect-free one:** `isolation: isolate` (Tailwind `isolate`). Flag it as the *good* trigger — the only one whose entire purpose is to create a context with no visual change. It replaces the old `transform: translateZ(0)` hack. This sets up the fixes section.
- **One-clause nods (don't dwell):** `container-type: size`/`inline-size` (a container-query container also creates one — forward-ref Ch021 L7, name it so it isn't a surprise there) and **top-layer** elements (native `popover` / `<dialog>` / fullscreen) which escape *every* stacking context by rendering above the whole page — this is the deeper reason portaling and native popovers "just work," and it sets up fix 1.

Fact-check held (Jun 2026, MDN "Stacking context"): the trigger list is current. Confirmed exactly: `position: fixed`/`sticky` create a context with **no** z-index needed; `relative`/`absolute` need a z-index **other than `auto`** (so `relative z-0` creates one, bare `relative` does not); `opacity < 1`, `transform`/`filter`/`backdrop-filter` (non-`none`), `mix-blend-mode` (non-`normal`), `isolation: isolate`, `will-change` of a context property, `contain: layout/paint`, `container-type: size/inline-size`, and top-layer elements all qualify.

Two interactive checks here:

- **`Buckets` (two-column), drag-to-classify.** "Does this declaration create a new stacking context?" Items: `opacity: 0.99`, `opacity: 1`, `transform: none`, `transform: translateX(10px)`, `position: relative` (alone), `position: relative; z-index: 0`, `position: fixed`, `position: sticky`, `isolation: isolate`, `filter: blur(2px)`, `position: static; z-index: 50`. Buckets: "Creates a context" / "Doesn't." This drills the exact distinctions that cause bugs (the `relative` vs `relative z-0`, `opacity:1` vs `0.99`, `static`+z-index inertness). Grading: standard bucket correctness.
- **The diagnostic reflex, in prose:** when z-index "doesn't work," don't bump the number — walk *up* the DOM from the floating element and find the first ancestor with `opacity<1` / `transform` / `filter` / `fixed` / `sticky` / `isolate`. That ancestor is the trap. Mention Chrome DevTools' **Layers** panel (Cmd+Shift+P → "Show Layers") as the senior tool: compositing layers roughly map to stacking contexts; find the element, walk the tree. This is the transferable debugging skill — name it as the takeaway.

Use `Term` for "compositing layer" if introduced (optional; keep light — it's a *rough* correspondence, say so).

### Three ways out of the trap

The fixes, ordered by 2026 frequency. Prose-led, each with a one-line "reach for it when." This is the section that converts the model into action.

1. **Portal to `<body>` — the default for floating UI.** Move the modal/popover/tooltip's DOM node out of the trapping subtree and render it as a direct child of `<body>` (or a dedicated portal root), where it lives in the root context and competes fairly. Name `createPortal` (React) but **do not teach it** — forward-reference Ch022 L5. The crucial landing: **shadcn's Dialog, Popover, Tooltip, and Dropdown all portal to `<body>` for exactly this reason** (forward-ref Ch027 L1). The student should leave recognizing portaling as the reason those components "just work" across stacking contexts, and as what they'd reach for when hand-rolling. This also closes L7's deferred "portal is the fix for the `fixed`-captured-by-`transform` trap."
2. **`isolation: isolate` — deliberately scope a context.** Tailwind `isolate`. Use when you *want* layering contained: a card or section whose internal badges/overlays must never escape into the page. One utility, zero visual side effects. Show a tiny `Code` example: `isolate` on a card so an `absolute -z-10` decorative layer stays behind the card content but the card's `z-10` badge can't punch through a sibling card. Frame as the inverse of fix 1: portal *escapes* a context, isolate *creates* one on purpose.
3. **Restructure the DOM.** Lift the floating element above the trapping ancestor in source order so it's no longer trapped. The bluntest fix; right when the trapping ancestor is incidental and movable, wrong when the parent's `opacity`/`transform` is load-bearing (a fade animation you can't delete). Note the tradeoff so the student picks deliberately.

Close with the **anti-pattern, stated bluntly:** `z-9999` (or any arbitrary mega-number) is not a fix — *a trap can't be defeated from inside it.* Bumping the number changes ordering *within* the trapped context and never lifts the context as a whole. This is the single most common junior mistake; name it as a smell a reviewer flags.

Consider an `AnnotatedCode` here only if the isolate example needs multi-part attention; otherwise plain `Code` blocks per fix keep cognitive load lower. Lean toward `Code` + the `CodeVariants` from the prior section carrying the broken/fixed weight.

### A z-index scale your team can read

Conventions — the "senior mindset" deliverable. Short section. The problem: ad-hoc z-index numbers (`z-12`, `z-300`, `z-9999`) across a codebase become unreadable and unwinnable. The fix is a small, named tier scale everyone shares. Present Tailwind's scale as the senior tier set:

- `z-0` / `z-10` / `z-20` — content-level layering (a raised card, a sticky table cell over body rows).
- `z-30` / `z-40` — page chrome (sticky header, sidebar).
- `z-50` — modals, drawers, dialogs, the dim backdrop. (Pays off the L7 toast's `z-50` once more, explicitly.)
- Higher / arbitrary (`z-[100]`) — only for non-portaled toasts/tooltips, which are *rare* because the right move is to portal them and let DOM order carry it.

The senior reframe to state: once floating UI is portaled, you barely need high z-index at all — portaling replaces the number race with DOM order. A tidy tier scale plus portaling is the whole game. Negative `z-index` (`-z-10`) gets one line: puts a child *behind its parent's background* — the right reach for a decorative layer, paired with `isolate` so it doesn't fall behind unrelated content.

Small `Code` block or a compact reference table (plain HTML/markdown) listing the tiers and their use — this is reference material, so a table beats prose.

### Reproduce the bug, then fix it

The capstone, a `ReactCoding` exercise. Pedagogical goal: the student must *create* the trap (proving they understand the trigger) and then *fix* it (proving they own the model). Doing both cements it far better than fix-only.

Format: prefer **target-match** (`target` + `live`, visual comparison + AI feedback — the chapter's established capstone mode, avoids brittle pixel asserts on stacking which is hard to assert via DOM tests). `export function App()` scaffold per chapter convention; Tailwind on.

- **Starter:** a small scene — a card with `opacity-95` (or a `transform`) wrapping a "badge"/"tooltip" child at `relative z-50`, and a sibling panel at `relative z-40` that wrongly covers the child. Visually the badge is hidden behind the sibling.
- **Target:** the badge correctly on top.
- **Task (instructions prop):** "The badge should sit above the neighboring panel, but it's stuck behind it. Find the ancestor creating a stacking context and fix the layering without using a giant z-index." Accept either the `isolate`-on-the-right-parent fix or the restructure fix or removing the offending trigger — the AI feedback judges against the reference and the no-mega-number constraint.
- Keep it single-component, single-breakpoint, framed (not a real `fixed` overlay) per the L7 figure-honesty convention if any fixed/sticky is involved.

If a second, lighter check is wanted earlier, a `StateMachineWalker` (kind="decision") fits well as the diagnostic walker and could live at the end of "Three ways out of the trap" or here:

- **`StateMachineWalker`** "My z-index doesn't work — what now?" Root question → branches: "Did you set `position` (or is it a flex/grid item)?" → No → Leaf "z-index is inert on `static`; add `relative`." Yes → "Walk up the DOM — any ancestor with `opacity<1`/`transform`/`filter`/`fixed`/`sticky`?" → No → Leaf "Same context — just raise the number (sparingly) or check source order." Yes → "Is the floating element a modal/popover/tooltip?" → Yes → Leaf "Portal it to `<body>` (shadcn does this)." No → "Is the trapping ancestor's `opacity`/`transform` load-bearing?" → Yes → Leaf "`isolation: isolate` to scope deliberately, or restructure." No → Leaf "Remove the incidental trigger / restructure the DOM." This encodes the diagnostic reflex as a reusable funnel and is the natural "trigger before tool" decision tree for the lesson. Place it once — recommend at the close of the fixes section so the capstone is the final beat.

### External resources (optional)

One `VideoCallout` — a focused stacking-context / z-index explainer (Kevin Powell or Josh Comeau territory; the resourcer picks the id). Place it near the canonical-bug or model section where a moving visual reinforces "context scopes z-index." One or two `ExternalResource`/`LinkCard`s to MDN "Stacking context" and the CSS-Tricks / Josh Comeau stacking-context piece as deeper references. Optional — keep the lesson self-contained.

## Tooltips (`Term`) candidates

- **stacking context** — the load-bearing term; defined in "Two facts," reused throughout.
- **z-axis / paint order** — brief, so "stacks on top" isn't hand-wavy.
- **compositing layer** — only if the DevTools Layers panel is mentioned; flag it's a *rough* correspondence to stacking contexts, not identical.
- **portal** — short definition at first mention (render a node elsewhere in the DOM tree, here `<body>`), since the full treatment is Ch022 L5.
- **`isolation` / `isolate`** — one-line ("create a stacking context with no other visual effect").
- **top layer** — one-line if mentioned (browser-managed layer above all content where native popovers/dialogs/fullscreen render, escaping every stacking context); reuse L7's definition if it landed there.
- Reuse, don't redefine: `position`/`relative`/`absolute`/`fixed`/`sticky`, containing block, normal flow, viewport, `transform`/`opacity`/`filter` (all from L1–L7 / forward) — reference them, link the mental model, but keep definitions to a clause.

## Scope

**Prerequisites (assume, refresh in a clause only):** the five `position` modes and the in-flow/out-of-flow binary + containing-block model (L7 — heavily leaned on; the `z-50` toast and the `transform`-captures-`fixed` trap are *paid off* here, not re-taught); `transform`/`opacity`/`filter` exist as CSS properties (L7 named `transform` as a containing-block trigger; motion depth is Ch021 L5); flex/grid items (L3/L4); `--spacing` scale and Tailwind utility/variant/bracket syntax (Ch018); `relative`/`absolute` mechanics (L7); the chapter's logical-property stance (no new logical surface here — z-index has no axis).

**Out of scope (defer, name once at most):**

- **React Portals / `createPortal` implementation** — Ch022 L5. Named as *the* fix and as why shadcn floating UI works; never implemented or syntax-taught here.
- **shadcn Dialog/Popover/Tooltip/Dropdown internals** — Ch027 L1. Named as portaling-by-default exemplars; not built.
- **CSS `transform`/`translate-*` and animation/transition mechanics** — Ch021 L5. `transform` and `transition: opacity` appear only as stacking-context triggers; no motion teaching.
- **CSS Anchor Positioning / Popover API / top layer at depth** — L7 already oriented these as forward-refs (Ch027). The top layer is *why* portaled/native popovers escape every context; mention in one clause at most, do not re-teach.
- **The browser rendering/compositing pipeline at depth** — out of scope (Unit 19 territory). Teach observable *behavior* (paint order, context scope), not the engine. DevTools Layers panel is named as a tool, not explained internally.
- **3D transforms / `transform-style: preserve-3d` / `perspective`** — niche, cut. (`perspective` may get a one-word nod in the trigger list at most.)
- **`will-change` performance tuning, `content-visibility`, `contain` / `container-type` at depth** — named in the trigger list only; performance and container-query treatment is out of scope (container queries are Ch021 L7).
- **`accent-color` and unrelated properties** — cut (chapter outline lists them as out of scope).
- **Responsive variants (`md:z-*`)** — Ch021 L6; single-breakpoint throughout.
- The **quiz** (L10) assesses this; this lesson teaches, doesn't pre-quiz.

## Notes for downstream agents

- **Honor the chapter conventions already locked:** hard-coded-accent `ParamPlayground`/SVG illustrations (illustrations, not project code — do not route through `@theme`); `export function App()` exercise scaffolds; single-breakpoint examples; the L7 framed-figure honesty caption ("in your app this is `fixed`; here it's framed") for any `fixed`/`sticky` overlay that would otherwise pin to the real viewport.
- **New lesson components** likely needed under `src/components/lessons/020/9/`: a `StackingContextStack.astro` (the layered before/after illustration powering the `DiagramSequence` — discrete `step` frames, mirrors L8's `StickySidebarScroll` pattern; reuse for any later z-axis visual). The trapped-overlay `ParamPlayground` can likely be authored inline in MDX with real CSS (no new component) — verify against the `ParamPlayground` JS-branching limitation (pure CSS reactions only; opacity→context is pure CSS, so it fits).
- This lesson **closes Chapter 020's teaching arc** — it should feel like the capstone that retroactively explains the unexplained `z-50`s of L7/L8. Make that payoff explicit.

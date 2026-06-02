sources:
  20.1: The box model and the inline/block axis
  20.2: Display modes and the hide decision tree
  20.3: Flexbox, the 1D primitive
  20.4: Grid, the 2D primitive
  20.5: Sizing, viewport units, and aspect-ratio
  20.6: Gap, the universal spacing default
  20.7: Position and inset utilities
  20.8: Overflow and scroll containers
  20.9: Stacking context and z-index

questions:
  - source: 20.1
    question: |
      A card has `class="w-64 p-4 border-2"` and renders **exactly** `256px` wide (`w-64` = `16rem` = `256px`). A teammate adds `p-8` to give it more breathing room. What happens to the card's rendered outer width?
    choices:
      - text: |
          It stays `256px` — the larger padding eats into the content box, because Preflight set `box-sizing: border-box`.
        correct: true
      - text: |
          It grows to `256px` plus the extra padding on each side, pushing the outer edge wider.
        correct: false
      - text: |
          It stays `256px`, but only if you also add `box-sizing: border-box` yourself in a global reset.
        correct: false
    why: |
      Under `border-box` — Preflight's universal default — `width` sizes the border box, so padding and border are folded *inside* the declared width and the content box shrinks to absorb them. The outer size you named doesn't move. (The "add it yourself" option is the trap: it's already set globally, and overriding Preflight's `box-sizing` is exactly what you should *not* do.)

  - source: 20.6
    question: |
      You have a vertical list of rows spaced with `space-y-4`, and the **last** `<li>` is toggled off with the `hidden` class (it stays in the DOM). A faint extra gap hangs below the visible rows. Why — and what's the 2026 fix?
    choices:
      - text: |
          `space-y-*` puts a bottom margin on every child *except the structural last one*; the hidden row is still last in the DOM, so the visible last row keeps a between-rows margin. Switch the parent to `flex flex-col gap-4`.
        correct: true
      - text: |
          `space-y-*` adds a trailing margin after the final item; remove it by adding `last:mb-0` to every row.
        correct: false
      - text: |
          `hidden` reserves the row's vertical space; swap it for `invisible` so the row collapses.
        correct: false
    why: |
      `space-y-*` compiles to a per-child margin keyed to DOM position (`:not(:last-child)`). A `display: none` row is still the structural last child, so it soaks up the skip while the now-visible last row keeps its between-rows margin. `gap` lives on the parent and only spaces items actually laid out, so a `hidden` row contributes nothing — no phantom gap.

  - source: 20.3
    question: |
      A flex row holds an avatar, a `flex-1` middle region showing a long file URL, and a button. Instead of the URL truncating, the whole row blows past its container and shoves the button off the edge. What's going on?
    choices:
      - text: |
          Flex items default to `min-width: auto`, which forbids shrinking below the content's min-content width; add `min-w-0` to the `flex-1` item so it can shrink and truncate.
        correct: true
      - text: |
          `flex-1` only grows, never shrinks; switch it to `flex-auto` so the middle region can give space back.
        correct: false
      - text: |
          The button needs `shrink-0`; without it the row can't compute its width and overflows.
        correct: false
    why: |
      `flex-1` says "shrink freely," but the item's default `min-width: auto` floor clamps it at the width of its longest unbreakable run (the URL), so it pushes everything else out instead. `min-w-0` lowers that floor; pair it with `truncate` for the ellipsis. The complete recipe for a flexible text region is `flex-1 min-w-0`, not `flex-1` alone.

  - source: 20.4
    question: |
      You want a card grid that creates **as many equal columns as fit**, each at least `16rem` wide, with no breakpoints. Which approach matches that intent?
    choices:
      - text: |
          `grid-cols-[repeat(auto-fit,minmax(16rem,1fr))]` — the grid measures its own width and picks the column count.
        correct: true
      - text: |
          `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3` — let the breakpoints decide the count.
        correct: false
      - text: |
          `flex flex-wrap gap-6` with `min-w-[16rem]` on each card.
        correct: false
    why: |
      `repeat(auto-fit, minmax(16rem, 1fr))` is the breakpoint-free, container-driven reach: the column count falls out of the available width. Breakpoint variants are the right tool when the design names *exact* counts — a different intent. And `flex flex-wrap` sizes items to content, giving ragged columns, which is the problem grid exists to solve.

  - source: 20.5
    question: |
      A full-screen hero uses `h-screen` (`100vh`). On iPhone Safari, the call-to-action at the bottom is hidden behind the address bar. What's the reflex fix and why?
    choices:
      - text: |
          Use `h-dvh` (or `min-h-dvh`): `vh` is measured against the *largest* viewport (address bar collapsed), so a `100vh` box runs past what's visible while the bar shows. `dvh` tracks the live viewport.
        correct: true
      - text: |
          Use `h-lvh`: it's the mobile-aware unit that always accounts for the address bar.
        correct: false
      - text: |
          Add `overflow-hidden` to the hero so the part behind the address bar gets clipped.
        correct: false
    why: |
      `100vh` equals `lvh` — the largest (chrome-collapsed) viewport — so while the bar is showing the box overflows by exactly the bar's height. `dvh` re-measures as the bar moves, always filling what's visible; `min-h-dvh` is the everyday reflex. `lvh` is the value that *causes* the bug, and clipping just hides the symptom, not the overflow.

  - source: 20.2
    question: |
      Inside a `<button>`, a decorative trash icon sits next to a visible "Delete" label. You want a screen reader to announce only "Delete," not the icon. Which is correct?
    choices:
      - text: |
          Put `aria-hidden="true"` on the icon — it stays visible on screen but is pruned from the accessibility tree.
        correct: true
      - text: |
          Put `aria-hidden="true"` on the `<button>` — the label is redundant anyway.
        correct: false
      - text: |
          Give the icon `class="invisible"` so it's hidden from assistive tech.
        correct: false
    why: |
      `aria-hidden="true"` on the *decoration* keeps it painted while removing it from the a11y tree — exactly right when a real text label is already present. Putting it on the button itself strands keyboard users on a silent control. `invisible` (`visibility: hidden`) hides the icon *visually* and reserves its box — the opposite of what's wanted here.

  - source: 20.7
    question: |
      You add an `absolute` "New" badge inside a product card with `top-2 right-2`, but it lands in the top-right corner of the **whole page** instead of the card. What's the one-class fix?
    choices:
      - text: |
          Add `relative` to the card — an `absolute` element anchors to its nearest *positioned* ancestor, and with none, it falls back to the viewport.
        correct: true
      - text: |
          Add `relative` to the badge so its offsets resolve against itself.
        correct: false
      - text: |
          Change the badge to `fixed top-2 right-2` so it pins to the card.
        correct: false
    why: |
      An `absolute` element measures its offsets from the nearest positioned ancestor; with nothing positioned in the card, the browser walks up and anchors to the viewport. `relative` on the *card* gives the badge an anchor to stop at — the atomic unit of corner positioning. `fixed` would pin to the viewport, which is even further from what you want.

  - source: 20.8
    question: |
      You want to clip a card's overflow at its edge **without** turning the card into a scroll container (so it never accidentally becomes a `sticky` ancestor or swallows an overhanging badge). Which value fits?
    choices:
      - text: |
          `overflow-clip` — it clips visually but does not create a scroll container.
        correct: true
      - text: |
          `overflow-hidden` — it clips and is the clean, side-effect-free way to chop overflow.
        correct: false
      - text: |
          `overflow-auto` — it clips and only shows a scrollbar when needed.
        correct: false
    why: |
      `clip` and `hidden` look identical on screen, but only `clip` avoids creating a scroll container. `hidden` *silently* creates one (which can host a `sticky` header or shave a programmatically-scrolled badge), and `auto` always creates one and is meant for scrollable regions, not clipping. When you just want to chop overflow cleanly, `clip` is the 2026 reach.

  - source: 20.9
    question: |
      A modal at `z-50` contains a tooltip you've set to `z-[9999]`, yet the tooltip renders **behind** a sibling panel at `z-40`. The modal wrapper has `opacity-95`. Which statements are true? (Select all that apply.)
    choices:
      - text: |
          `opacity` less than `1` created a stacking context on the wrapper, scoping the tooltip's z-index *inside* it.
        correct: true
      - text: |
          The wrapper competes in the parent context at roughly `0`, so the sibling at `z-40` paints over the whole wrapper — tooltip included.
        correct: true
      - text: |
          Bumping the tooltip higher (`z-[99999]`) would finally lift it above the sibling.
        correct: false
      - text: |
          Portaling the tooltip to `<body>` would let it compete in the root context and render on top.
        correct: true
    why: |
      `opacity < 1` is a stacking-context trigger, so the tooltip's z-index is sealed inside the wrapper's "envelope." That envelope sits at ~0 in the root, and `z-40` beats it, taking the trapped tooltip down with it. A bigger number only reorders *within* the trap — it can't lift the envelope. The real fixes are escaping the context (portal to `<body>`) or scoping deliberately (`isolate`), never a four-digit z-index.

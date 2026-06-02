sources:
  21.1: Type, scale, and the reading surface
  21.2: OKLCH, color-mix(), and the alpha syntax
  21.3: Borders, radius, and the elevation scale
  21.4: Pseudo-classes and the :has() parent selector
  21.5: Motion — transitions, keyframes, and tw-animate-css
  21.6: Breakpoints and the mobile-first reflex
  21.7: Container queries for component-level layout

questions:
  - source: 21.1
    question: |
      A card title sits in a flex row beside a price, wrapped in `truncate` so a long title clips to one line with an ellipsis. But long titles refuse to clip — instead they push the price off the edge of the card. What's the missing piece?
    choices:
      - text: |
          Add `min-w-0` to the title — a flex item defaults to `min-width: auto`, so it won't shrink below its content and `truncate` can't take effect.
        correct: true
      - text: |
          Add `whitespace-nowrap` to the title — `truncate` doesn't keep the text on one line by itself.
        correct: false
      - text: |
          Replace `truncate` with `line-clamp-1` — `truncate` doesn't work on flex items.
        correct: false
    why: |
      `truncate` already bundles `overflow-hidden`, `text-overflow: ellipsis`, *and* `whitespace-nowrap` — so the missing piece isn't any of those. The blocker is the flex default `min-width: auto`, which clamps the item at its content width and forbids the shrink that clipping needs. `min-w-0` lowers that floor; the canonical flexible-text recipe is `flex-1 min-w-0 truncate`. (`line-clamp-1` would hit the exact same floor.)

  - source: 21.1
    question: |
      You're picking the modern `text-wrap` reflex for two surfaces: a three-line `<h2>` and a long body paragraph. Which assignment is right?
    choices:
      - text: |
          `text-balance` on the heading, `text-pretty` on the paragraph.
        correct: true
      - text: |
          `text-pretty` on the heading, `text-balance` on the paragraph.
        correct: false
      - text: |
          `text-balance` on both — it's the general-purpose orphan fix.
        correct: false
    why: |
      `text-balance` evens out line lengths but the browser only runs it on short blocks (a few lines), so it's the heading tool and a no-op on a long paragraph. `text-pretty` runs a lighter pass that avoids a stranded last line, which is the body-copy tool. Swapping them wastes both; using `balance` everywhere does nothing on the paragraph.

  - source: 21.2
    question: |
      You bump a brand token from `oklch(0.6 0.18 255)` to `oklch(0.7 0.18 255)` — only the L channel moved. What does the swatch do?
    choices:
      - text: |
          Brightens while staying exactly as blue and as saturated as before.
        correct: true
      - text: |
          Brightens, but also drifts a little toward purple.
        correct: false
      - text: |
          Brightens, and visibly washes out toward grey-blue.
        correct: false
    why: |
      OKLCH's three channels are independent, which is the whole reason it's the token storage form: raising L moves brightness and nothing else. The hue-drift and desaturation options describe HSL, where pushing lightness drags hue and chroma along — the exact bug that made hand-built hover palettes look muddy.

  - source: 21.2
    question: |
      You're building a full-page dialog backdrop: a dark dimming layer with a crisp, fully-opaque "Saving…" message centered on top. Which utility belongs on the backdrop?
    choices:
      - text: |
          `bg-black/50` — per-property alpha fades only the background color, so the text on top stays solid.
        correct: true
      - text: |
          `opacity-50` — it makes the backdrop half-transparent in one class.
        correct: false
      - text: |
          `bg-black` plus `opacity-50` — combine a solid color with a fade for a reliable dim.
        correct: false
    why: |
      `opacity-*` composites the *whole subtree*, so it fades the backdrop and the message together — the message goes muddy. `bg-black/50` (per-property alpha, compiled to a `color-mix()` toward `transparent`) fades only that one declaration, leaving the text crisp. The rule: fade the whole thing → `opacity-*`; fade one layer and keep content sharp → `/N` alpha. `opacity-50` is reserved for the disabled-button case, where you *do* want everything dimmed.

  - source: 21.3
    question: |
      You draw a keyboard focus indicator with a 2px `border` that only appears on `:focus`. Tabbing through a form, the whole layout twitches at every step. Why — and what should you have used?
    choices:
      - text: |
          A `border` occupies layout space, so adding it on focus grows the element 2px per side and reflows its neighbors; use `outline` (or `ring-*`), which paints on top of the layout and takes no space.
        correct: true
      - text: |
          The `border` color can't read a theme token, so the browser recomputes it each frame; use `ring-*`, which is themable.
        correct: false
      - text: |
          `:focus` fires too often; switching to `:focus-visible` would stop the layout from shifting.
        correct: false
    why: |
      The jolt is pure geometry: a border is part of the box's size, so toggling it on focus changes the element's dimensions and pushes everything around it. An `outline` (and `ring-*`, which is `box-shadow` layers) is drawn outside the box and reserves no space, so it appears and vanishes without moving a pixel. `:focus-visible` is also correct discipline — but it fixes *when* the ring shows, not the layout shift, which is caused by `border` regardless of the trigger.

  - source: 21.4
    question: |
      An option card keeps `const [isChecked, setIsChecked] = useState(false)`, flipped by an `onChange` on the radio it wraps, read by one conditional class that adds a border when selected. What single change deletes all of that state?
    choices:
      - text: |
          Put `has-[:checked]:border-primary` on the card — it reads the `:checked` of the radio it contains, so the state, the handler, and the conditional all come out.
        correct: true
      - text: |
          Use `peer-checked:border-primary` from the sibling before the radio.
        correct: false
      - text: |
          Keep the `onChange`, but have it set a `data-checked` attribute and style with `data-[checked]:`.
        correct: false
    why: |
      A parent reacting to a control it *contains* is exactly what `:has()` is for; `has-[:checked]:` reads the wrapped radio at the source, so the `useState`, the `onChange`, and the branch all disappear. `peer-*` reads a *sibling*, not a contained child, so it can't see a radio the card wraps. Setting `data-checked` from an `onChange` keeps the very handler and JS round-trip the change was meant to remove — the DOM already holds `:checked`, so there's nothing to copy.

  - source: 21.4
    question: |
      Why is `focus-visible:ring-2` the reflex on interactive elements rather than `focus:ring-2`?
    choices:
      - text: |
          `:focus` fires on mouse clicks too, so a `focus:` ring flashes on every click; `:focus-visible` uses the browser's heuristic to show the ring for keyboard/programmatic focus and hide it on a plain click.
        correct: true
      - text: |
          `:focus-visible` is the only one that works through a theme token, so `focus:` rings break in dark mode.
        correct: false
      - text: |
          `:focus` doesn't fire for keyboard users at all, so it leaves them with no indicator.
        correct: false
    why: |
      Both match keyboard focus; the difference is that bare `:focus` *also* fires on a mouse click, producing a ring that looks like a glitch — which gets "fixed" by deleting the ring, an accessibility regression. `:focus-visible` resolves the keyboard-vs-mouse tension for you: clean look for mouse users, a visible ring for everyone who needs it.

  - source: 21.5
    question: |
      For motion that holds a smooth 60fps even on a low-end phone, which properties are the cheap, composite-only lane to animate? (Select all that apply.)
    choices:
      - text: |
          `transform`
        correct: true
      - text: |
          `opacity`
        correct: true
      - text: |
          `height`
        correct: false
      - text: |
          `background-color`
        correct: false
    why: |
      `transform` and `opacity` are composite-only: the element is already painted to its own layer, so the GPU just moves or fades that finished layer — no per-frame layout or paint. `height` triggers layout (the most expensive stage, often reflowing neighbors too) and `background-color` triggers paint. This is why the dialog pattern fades and *scales* rather than growing its box.

  - source: 21.5
    question: |
      A dialog's content carries `data-[state=closed]:animate-out fade-out-0`, but when you flip your own `isOpen` boolean to `false` the dialog vanishes instantly — not one frame of the exit plays. What's the 2026 fix?
    choices:
      - text: |
          Stop unmounting on the boolean — let the dialog primitive flip `data-state` to `closed`, hold the element in the DOM while the exit plays, and unmount only after it finishes.
        correct: true
      - text: |
          Wrap the unmount in a `setTimeout` whose delay matches `duration-200` so the element survives long enough.
        correct: false
      - text: |
          Move the exit animation onto the overlay instead of the content.
        correct: false
    why: |
      Flipping `isOpen` to `false` rips the element out of the DOM before a single exit frame can render — the unmount-timing problem the data-state pattern retires. The primitive (Radix) sets `data-state="closed"`, your CSS reads it and runs `animate-out`, and the primitive delays the unmount until the animation ends. The `setTimeout` is the fragile hand-rolled version this exists to replace; moving the exit to the overlay leaves the content unmounting instantly all the same.

  - source: 21.6
    question: |
      In `<nav className="flex flex-col md:flex-row">`, what is `md:flex-row` doing below the 768px breakpoint?
    choices:
      - text: |
          Nothing — below `md` the rule isn't in play, so the base `flex-col` is the only rule in effect; mobile-first prefixes only *add* from their width up.
        correct: true
      - text: |
          Unsetting `flex-col` so the nav has no direction until the breakpoint activates a row.
        correct: false
      - text: |
          Targeting tablets specifically, since `md` is the tablet device bucket.
        correct: false
    why: |
      `md:` compiles to `@media (min-width: 48rem)`, so below 768px the rule simply doesn't exist and the base `flex-col` stands — nothing is unset or removed. And `md` is a *content* breakpoint (a min-width), not a device category: it means "from 768px and wider," never "tablets."

  - source: 21.6
    question: |
      A card's "edit" button is styled `opacity-0 hover:opacity-100` — invisible until you hover the card. It works on desktop. What happens on a phone, and why?
    choices:
      - text: |
          The button stays invisible and unreachable — Tailwind v4 wraps `hover:` in `@media (hover: hover)`, so on a touch device the rule never fires and the button stays at `opacity-0`.
        correct: true
      - text: |
          It works fine — Tailwind v4 falls back to firing `hover:` on tap for touch devices.
        correct: false
      - text: |
          It flickers visible on first tap and then sticks — the classic sticky-hover bug.
        correct: false
    why: |
      Tailwind v4 gates `hover:` behind `@media (hover: hover)`, so a touchscreen never triggers it and `opacity-0` is permanent — the action is undiscoverable. That gating is exactly what *eliminated* the old sticky-hover bug (which the flicker answer describes), so there's no tap-fallback either. The reflex: any affordance must be reachable without hover; hover is enhancement only — `opacity-60 hover:opacity-100`, never `opacity-0 hover:opacity-100`.

  - source: 21.7
    question: |
      Sort each layout change by whether it should respond to the screen (`md:`) or to the box the element sits in (`@md:`). (Select every item that belongs to the **container query** group.)
    choices:
      - text: |
          A `<ProductCard>` reused in both the narrow sidebar and the wide feed.
        correct: true
      - text: |
          A stat tile whose inner layout changes when the dashboard grid drops to one column.
        correct: true
      - text: |
          The top app navigation switching from a hamburger to a full bar.
        correct: false
      - text: |
          The page splitting from one column to two on desktop.
        correct: false
    why: |
      Ask: does the right layout depend on the *screen* or the *slot*? A card reused across slots and a tile reacting to its grid cell both depend on the space they land in — container queries (`@container` + `@md:`). The top nav and the page-shell column split depend on the screen — viewport queries (`md:`). Most real SaaS UIs use both: viewport-driven shell, container-driven components inside it.

  - source: 21.7
    question: |
      You add `@md:flex-row` to a card's inner layout to make it go side-by-side in wide slots, but it stays stacked at every width — no error in the console. What's the most likely cause?
    choices:
      - text: |
          No ancestor declares `container-type` — without `@container` somewhere up the tree, `@md:` variants silently never match.
        correct: true
      - text: |
          `@md` fires at 768px like the viewport `md`, and the card's slot never gets that wide.
        correct: false
      - text: |
          `@md:flex-row` must go on the same element as `@container`; you split them across two elements.
        correct: false
    why: |
      Container variants need a queryable ancestor; with no `container-type` (Tailwind's `@container`) above them they fail silently and the base layout stands. The container `@md` is 448px, *not* the viewport's 768px — they're separate, smaller scales. And the opt-in and the query must be on *different* elements: a query only ever looks upward, so `@container` and `@md:` on the same div does nothing.

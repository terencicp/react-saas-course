# Lesson title

- Title: Sizing, viewport units, and aspect-ratio
- Sidebar label: Sizing and viewport units

# Lesson framing

This is the chapter's sizing axis: after box model (L1), display (L2), flex (L3), and grid (L4) decided *where* an element sits and *how it relates to neighbors*, L5 decides *how big it is*.

**The spine is one mental model: intrinsic vs. extrinsic sizing.** Every sizing bug the student will hit ("why is my width auto", "why did my flex item blow out", "why is `height: 100%` doing nothing") resolves to *which axis is being computed which way*. Teach the model first, then hang every utility off it. This is the senior reframe that turns sizing from trial-and-error into a decision.

**Three concrete payoffs anchor the lesson, each a real production bug the tech relieves:**
1. The iOS `100vh` gap — `h-screen` leaves dead space under a hero because `vh` is the *largest* viewport. `dvh`/`svh`/`lvh` fix it; `min-h-dvh` is the reflex. This is *the* most important sizing fix to install and should open the lesson as the senior question.
2. Layout shift on media — an `<img>` with no reserved height shoves content down when it loads (CLS, a Core Web Vitals failure). `aspect-ratio` reserves the box before bytes arrive. Replaces the legacy `padding-bottom: 56.25%` hack.
3. Magic-number sizing — `mt-[37px]` everywhere is a smell; the spacing scale and `clamp()` are the disciplined answers.

**Target student:** has programming experience, met flex/grid in this chapter, knows Tailwind utility syntax, `--spacing`, `border-box`, and the `min-w-0` flex-collapse story from L3. They are *not* new to "width" as a concept — skip CSS-101 framing. The cut is senior framing: defaults, triggers, the bug each primitive prevents.

**Pedagogical strategy — minimize cognitive load by staging:**
- Lead with the iOS bug (visceral, concrete) before any taxonomy.
- Introduce the intrinsic/extrinsic model with a *simplified* two-word frame (content-driven vs. forced) and only later layer in the keyword vocabulary (`min-content`, `max-content`, `fit-content`).
- Group utilities by *job*, not by alphabet: forcing a size, constraining a size, sizing one axis from the other (aspect-ratio), letting content decide (intrinsic).
- Lean on `ParamPlayground` for the things the student must *feel* by sliding (viewport-unit behavior, aspect-ratio, clamp). Static figures freeze comparisons the student needs to scrub.
- `clamp()` gets a single honest section that names it, shows the one canonical form, and forward-points to Ch021 L7 for the deep dive — don't over-teach a tool the next chapter owns.

**Mental model the student leaves with:** "Before I write a size, I ask: is this dimension content-driven or forced? Block elements are forced on width, content on height — that asymmetry is why `width: 100%` and `height: 100%` behave so differently. `min-*`/`max-*` clamp *after* the algorithm runs. On mobile, `dvh` not `vh`. Media gets `aspect-ratio` so it never shifts. Stay on the scale; reach for `clamp()` when a size should breathe between two bounds."

# Lesson sections

## When a full-height hero breaks on iPhone

**Role:** Introduction. Opens with the senior question (no "Introduction" header — this *is* it). State the goal, connect to prior lessons, motivate with the concrete bug.

Content:
- The bug: a hero styled `h-screen` (= `100vh`) looks perfect in desktop devtools but leaves a strip of dead space at the bottom of iOS Safari — or content hides *behind* the address bar. Show it as a `Screenshot` (TabbedContent: "what you expect" vs "what iOS renders") or a hand-coded HTML/CSS `Figure` of a phone frame with the gap shaded. Goal: make the pain visceral in 5 seconds.
- The one-line reason (full mechanism deferred to the viewport-units section): `100vh` is measured against the *largest* possible viewport (address bar collapsed), so when the bar is showing, `100vh` is taller than what you can see.
- Frame the lesson: sizing in 2026 is a small set of primitives plus one mental model. Preview the three payoffs (iOS fix, zero-CLS media, fluid sizing). Connect back: L1 gave `w-*`/`max-w-*` on the `--spacing` scale and `border-box`; L3 gave the `min-w-0` collapse fix; this lesson completes the picture with the *why* (intrinsic/extrinsic) and the mobile-and-media reflexes.
- Keep it warm and brief — one screen.

**Terms (`Term`):** `CLS` (Cumulative Layout Shift — Core Web Vitals metric for unexpected content jumps), `viewport` (the visible area of the page in the browser, excluding chrome). Define these here since they're load-bearing across the lesson.

## Content-driven vs. forced: the sizing mental model

**Role:** Install the spine. This section is the lesson's conceptual core; everything after hangs off it. Place it early, right after the intro, before any utility tables.

Content:
- The simplified frame first (low cognitive load): every dimension of every box is computed one of two ways — **intrinsic** (the content decides: the box is as big as what's inside) or **extrinsic** (something outside forces it: a fixed length, `100%`, a flex/grid track). Use plain words "content-driven" / "forced" before the jargon.
- The asymmetry that explains the most confusion: **a block element is extrinsic on width (fills its parent's inline axis) but intrinsic on height (grows to fit content).** This single fact is why `width: 100%` is usually redundant on a `<div>` and why `height: 100%` so often "does nothing" (the parent has no height to be a percentage *of*). Call this out explicitly — it's the highest-leverage insight in the lesson.
- Then layer the keyword vocabulary onto the "intrinsic" half: `auto`, `min-content` (narrowest the content allows — the longest word), `max-content` (widest the content wants — no wrapping), `fit-content` (max-content capped at the available space). Keep it to recognition depth; the student writes Tailwind, not these keywords, but needs to read them in devtools and grasp `w-fit`/`w-min`/`w-max`.
- How the layout contexts differ (one-liner each, building on L3/L4): block = extrinsic width / intrinsic height; inline = intrinsic both (ignores width/height — callback to L2); flex/grid items = extrinsic on the main/sizing axis, content-driven on the cross. Frame this as "the display mode chose which axis is forced — sizing utilities only bite where the algorithm lets them."
- The senior payoff, stated as the reflex: **"When a size is wrong, don't guess utilities — ask which axis is being computed which way."**

**Component:** A custom diagram, `IntrinsicExtrinsicAxes.astro` (build under `src/components/lessons/020/5/`). Pedagogical goal: show the width/height axes of a block, an inline, and a flex item, color-coded by intrinsic (one color) vs extrinsic (another), with a one-word label per axis. Use **HTML + CSS** (real boxes, devtools-inspectable, per the diagrams guide's "layout concepts rendered with real CSS"). Reuse L1's box-model color discipline only if it doesn't clash; this is a new axis-coloring, so pick two clear hues and keep them consistent across the lesson's later figures. Wrap in `<Figure>`.

**Optional exercise:** a `Buckets` drill — sort a handful of declarations (`width: 100%`, `w-fit`, `h-screen`, `flex-1`, default `<p>` height, `<span>` width) into "content-driven" vs "forced". Cheap reinforcement of the model; only include if it doesn't bloat the section.

**Terms (`Term`):** `intrinsic size`, `extrinsic size`, `min-content`, `max-content`, `fit-content` — short definitions, reused later.

## Forcing a size: w, h, and the size-* shortcut

**Role:** The extrinsic primitives. The student's daily width/height utilities.

Content:
- `w-*` / `h-*` on the `--spacing` scale (callback to L1 — same scale that feeds `p-*`/`gap-*`), plus the special values: `w-full` (100% of parent), `w-1/2`/`w-1/3`/`w-2/3` (fractions), `w-px`, arbitrary `w-[640px]` for rare one-offs. Name `h-full` and its parent-height dependency (forward-linked to the watch-out).
- `w-screen` (= `100vw`) flagged as **recognition-only / rarely the right reach** — it ignores the scrollbar gutter and overflows; the trigger to ever want it is rare. State the senior default is `w-full` inside a constrained container.
- **`size-*` — the v4 width-and-height shortcut.** One utility for square elements: avatars (`size-10`), icons (`size-4`), status dots, square icon-buttons. This is the headline v4 ergonomics win in this section. Make the reach explicit: square → `size-*`; rectangle → `w-*` + `h-*` separately. Show a tiny before/after (`h-10 w-10` → `size-10`) with `CodeVariants` or inline `Code`.
- Keep the worked examples concrete and component-shaped (an avatar, an icon button) so the student sees production code, not abstract boxes.

**Component:** inline `Code` blocks suffice here — these are simple, single-purpose utilities. No heavy figure needed; the mental model section already carried the conceptual weight.

## Constraining a size: min and max, and the reading-width cap

**Role:** The `min-*`/`max-*` clamps — the most senior-flavored sizing tool because it works *with* the algorithm rather than fighting it.

Content:
- The key idea: `min-*`/`max-*` don't *set* a size — they **clamp the size the layout algorithm already computed**. This is why they compose so well with intrinsic sizing and flex/grid: you let the box be content- or container-driven, then bound it. Tie back to the mental model.
- The canonical reaches (these are the ones a senior writes weekly):
  - `max-w-3xl` / `max-w-prose` / `max-w-[65ch]` on a centered article — caps *reading width* at the optimal character count (~65ch). Pair with `mx-auto` (callback to L1). Explain `max-w-prose` and `max-w-[65ch]` are the same idea, and *why* a cap matters: long lines hurt readability. The `ch` unit = width of the "0" glyph; perfect for measuring text.
  - `min-w-0` on a `flex-1` item that must shrink below content — explicit callback to L3's collapse story, now explained through the model: flex items default to `min-width: min-content` (intrinsic floor), `min-w-0` removes that floor so the extrinsic flex sizing can win. Reframing L3's recipe with the L5 model is the payoff of teaching the model.
  - `min-h-dvh` on the page shell, `max-h-screen overflow-y-auto` on a tall panel (overflow forward-linked to L8, named not taught).
- `w-fit` revisited as the intrinsic escape hatch: a content-width button inside a `flex-col` parent that would otherwise stretch to full width (because `items-stretch` is the flex default — callback L3). `w-fit` opts that one child back to content-driven. Concrete reach.

**Component:** A `ParamPlayground` for reading width. Pedagogical goal: let the student *feel* why a max reading-width matters. Controls: a `max-width` slider (in `ch`, e.g. 20–100, `suffix="ch"`), maybe a font-size slider. Preview: a paragraph of lorem at `max-width: var(--maxw)` with `margin-inline: auto`. Readout: echo the ch value. The student drags and watches lines get uncomfortably long past ~75ch and cramped below ~45ch, landing the 65ch sweet spot experientially.

**Terms (`Term`):** `ch` unit (width of the "0" character in the current font — used to size by character count).

## Viewport units and the dvh reflex

**Role:** Pay off the opening bug fully. Highest-priority *fix* in the lesson.

Content:
- The full mechanism now (the intro only gave the one-liner). On mobile, the browser chrome (address bar, toolbar) shrinks and grows as you scroll, so "the viewport height" isn't a single number. CSS gives three answers:
  - `lvh` — **largest** viewport (chrome collapsed). `vh` equals this.
  - `svh` — **smallest** viewport (chrome fully shown).
  - `dvh` — **dynamic**, tracks the current state live and resizes as the bar moves.
- The decision, framed by intent (defaults-before-conditionals):
  - "Fill at least the screen, content can be taller" → **`min-h-dvh`** on the page/section shell. *This is the reflex.* It's what `min-h-screen` should have been.
  - "Exactly the visible height, no more" (a full-bleed hero, a snap section) → `h-dvh`.
  - `svh` when you must guarantee something fits even with the bar showing (rare; e.g. a CTA that must never be hidden); `lvh` almost never deliberately.
- Name the legacy trap plainly: `h-screen`/`min-h-screen` (= `100vh`) is the form that breaks on iOS — and it's still everywhere in tutorials and old codebases, so the student *will* meet it. The fix is mechanical: `screen` → `dvh`.
- Tailwind utility coverage: `h-dvh`/`min-h-dvh`/`max-h-dvh`, `h-svh`/`min-h-svh`, `h-lvh`, and the `*-screen` legacy forms. Note the `*-dvw` cousins exist but are far rarer (horizontal chrome is uncommon).
- Subtle but honest watch-out: `dvh` *resizes* as the bar animates, which can cause the layout to reflow/jump mid-scroll. For a hero that's usually fine; for content that must stay rock-steady, `svh` avoids the movement. Give the student the tradeoff, not just the reflex.

**Component:** A `ParamPlayground` simulating the three units. Pedagogical goal: make `dvh` vs `svh` vs `lvh` legible without an actual phone. Build a phone-frame preview (custom CSS) with a "browser bar" whose height is driven by a slider/toggle ("address bar: shown / hidden"); a colored box sized by a `select` (`dvh`/`svh`/`lvh`/`vh`) fills the simulated viewport. The student toggles the bar and watches which box leaves a gap, which overflows, which tracks. This is the single most valuable interactive in the lesson — it teaches a device-specific behavior on a laptop. If `ParamPlayground`'s CSS-only model can't express the simulated-viewport math cleanly, fall back to a small custom `ViewportUnitSim.astro` under `020/5/` (describe: toggle bar visibility, four labeled bars, gap/overflow shaded). Prefer the playground if a pure-CSS expression works.

**Optional video:** if Resourcer finds a tight, current (post-2024) clip on `dvh`/`svh`/`lvh` from a reputable source (e.g. a short web.dev / Kevin Powell explainer), add a `VideoCallout`. Don't force one — the interactive carries the concept. Leave a note for Resourcer to source `videoId` and verify recency; do not invent an ID.

**Terms (`Term`):** `dvh` / `svh` / `lvh` (dynamic / small / large viewport-height units) — short gloss; the section defines them in depth but a hover recap helps.

## aspect-ratio: sizing one dimension from the other

**Role:** The zero-CLS media reflex. Second-priority payoff.

Content:
- The bug, concrete: an `<img>` or video iframe with width but no height occupies *zero* height until its bytes load, then suddenly pushes everything below it down — that jump is CLS, a measurable Core Web Vitals failure that hurts SEO and feels broken. (Callback to the `CLS` Term from the intro.)
- The fix: `aspect-ratio` derives the missing dimension from a ratio, so the box reserves its space *before* the media loads. Set width (or let it be `w-full`), give an `aspect-*`, and the height is computed — no layout shift.
- Tailwind utilities: `aspect-square` (1/1), `aspect-video` (16/9), `aspect-auto` (default/reset), arbitrary `aspect-[3/2]` / `aspect-[4/3]`. The reach map: thumbnails (`aspect-square`), video/hero embeds (`aspect-video`), card hero images where every card's image area must be identical height regardless of source dimensions (`aspect-[4/3]` + `object-cover`). Name `object-cover`/`object-contain` lightly as the companion that controls how the image fills the reserved box (full treatment is image-handling territory, not here — keep to one line).
- Explicitly retire the legacy: the old `padding-bottom: 56.25%` "aspect-ratio hack" (a wrapper with percentage padding + absolutely-positioned child). Show it as recognition-only — the student *will* see it in old code — and state `aspect-ratio` replaced it entirely. One `CodeVariants` (legacy hack vs `aspect-video`) makes the upgrade vivid and earns the "no historical detours except to recognize legacy" framing.
- The flex/grid interaction watch-out (callback to L3/L4 collapse): an `aspect-ratio` element inside a flex/grid container can collapse the same way `flex-1` items do; `min-w-0` or constraining the other dimension fixes it. Tie to the model — same root cause, same fix.

**Component:** A `ParamPlayground`. Pedagogical goal: feel the ratio control the box. Controls: a `select` for the ratio (`1/1`, `16/9`, `4/3`, `3/2`) and a `width` slider. Preview: a box `width: var(--w); aspect-ratio: var(--ratio)` with a placeholder image background. Readout: echo the computed... actually echo the ratio string and width; optionally an `expr` computing the derived height (`width / (ratioNum)`). Lands the "set one dimension, the other follows" idea kinesthetically.

**Terms (`Term`):** none new beyond `CLS` (already defined); optionally `object-cover` glossed inline rather than as a Term to avoid over-tooltipping.

## clamp(): fluid sizes without breakpoints

**Role:** Name the fluid-sizing tool once, honestly, with one canonical form — then forward-point. Do NOT over-teach; Ch021 L7 owns the deep dive.

Content:
- The trigger: between two breakpoints you often want a size to *scale smoothly* with the viewport rather than jump at a media query — a hero heading that's 2rem on mobile and 4rem on desktop, fluid in between. `min()`/`max()`/`clamp()` express this in one declaration with no breakpoints.
- The one form worth memorizing: `clamp(min, preferred, max)` — the value tracks `preferred` (usually viewport-relative, e.g. `5vw`) but never drops below `min` or exceeds `max`. Show exactly one example via Tailwind bracket form, e.g. `w-[clamp(16rem,50vw,32rem)]` or a fluid font-size teaser (font-size is Ch021 territory, so prefer a width/size example to stay in-lane). `min()` and `max()` named as the one-bound cousins in a single sentence.
- The conceptual link that makes it stick: `clamp()` is to a single property what grid's `repeat(auto-fit, minmax(...))` (L4 callback) is to columns — responsive without media queries. The student already met that pattern, so this lands as "the same idea, applied to one value."
- Forward-point clearly: fluid *typography* and the `cqi`/container-query pairing are Ch021 L7 — name it and stop. Resist showing more than one clamp example.

**Component:** inline `Code` only. One example, no playground — keeping this section deliberately small signals it's a pointer, not a destination. (If a playground is wanted, a single `clamp` width slider-vs-viewport demo could work, but default to restraint.)

## Choosing the right unit

**Role:** Synthesis — the unit decision table the student consults. Closes the lesson by converting everything into a reach-for-X reference.

Content:
- A compact decision table (the chapter's "unit zoo", trimmed to what a 2026 dev actually writes):
  - `rem` — spacing and type; the default, via the Tailwind scale (callback L1's `--spacing`).
  - `dvh` (and rarely `dvw`) — viewport-fill.
  - `ch` — reading/measure widths.
  - `px` — hairlines, borders, focus rings (things that shouldn't scale with font size).
  - `fr` — grid tracks only (callback L4).
  - `%` — rare; a flex/grid `1fr` or `w-full` is usually the better substitute. State the trigger to actually want `%`.
  - `em` — very rare (sizing relative to *own* font-size, e.g. an icon that scales with its button's text).
- Frame as senior defaults: "reach for `rem` and the scale by default; the others have a specific job." This reinforces the course's stay-on-the-scale discipline and the magic-number-is-a-smell rule (`mt-[37px]` → use the scale or rescale `@theme --spacing`, callback L1).
- End with the consolidated reflex list (not a separate "tips" section — these are the section's content): square→`size-*`; reading width→`max-w-prose`; fill viewport→`min-h-dvh`; media→`aspect-*`; fluid→`clamp()`; shrinking flex text→`flex-1 min-w-0`.

**Component:** a `Card`/`CardGrid` or a plain markdown table for the unit reference. A `Matching` exercise (unit ↔ its job) is a strong fit here to close with active recall — match `dvh`/`ch`/`fr`/`rem`/`px` to "viewport fill / reading width / grid track / spacing & type / hairlines". Include it.

## Build a zero-shift media card (capstone exercise)

**Role:** Consolidation through doing. One `ReactCoding` exercise that forces the student to combine the lesson's primitives in a realistic component.

Content / spec for the exercise-building agent:
- **Mode:** target-match (`target` + `live`), so the student matches a reference visually and gets AI feedback comparing their TSX to the reference.
- **Task:** build a media card — a fixed-`size-*` avatar in a header row, a hero image area with a fixed `aspect-video` (so it never shifts), a body that caps at `max-w-prose`, and the whole card living inside a section that's `min-h-dvh grid place-items-center` (callback L4 centering). The student writes `size-*`, `aspect-video`, `max-w-*`, and `min-h-dvh` — the four headline primitives — in one component.
- **Why target-match not tests:** sizing is visual; pixel-asserting `getBoundingClientRect` is brittle and the failure messages are opaque. Visual match + AI feedback is the right grading shape here (the AI sees both TSX sources).
- **Starter:** an unsized version (avatar with no `size-*`, image with no aspect-ratio that visibly jumps/collapses, full-width unreadable text). The contrast between starter and target *is* the lesson.
- Use `export function App()` (the chapter's sanctioned exercise-scaffold exception to the arrow-fn default — consistent with L2/L3/L4 starters).
- Tailwind on (default). Keep the starter ≤ ~25 lines so the editor stays legible.

**Component:** `ReactCoding`.

# Scope

**This lesson teaches:** intrinsic vs. extrinsic sizing as the mental model; `w-*`/`h-*` (scale, `-full`, fractions, arbitrary) and `w-screen` recognition-only; the v4 `size-*` square shortcut; `min-*`/`max-*` as post-algorithm clamps with the `max-w-prose`/`max-w-[65ch]` reading-width and `min-w-0` flex-collapse reaches; the `vh`/`dvh`/`svh`/`lvh` family with `min-h-dvh` as the iOS reflex and the legacy `h-screen` trap; `aspect-ratio` (`aspect-square`/`aspect-video`/arbitrary) for zero-CLS media, replacing the `padding-bottom` hack; `clamp()`/`min()`/`max()` named once with one canonical form; the unit-choice decision (`rem`/`dvh`/`ch`/`px`/`fr`/`%`/`em`).

**Assumed from prior lessons (redefine in one line max, don't re-teach):**
- `border-box`, the four boxes, the `--spacing` scale feeding `w-*`, `mx-auto` centering — Ch020 L1.
- Inline elements ignore width/height — Ch020 L2.
- `min-w-0` as the `flex-1` companion, `items-stretch` default, main/cross axes — Ch020 L3 (this lesson *re-explains* `min-w-0` *through the model*, which is new value, not re-teaching).
- `grid place-items-center`, `repeat(auto-fit, minmax(...))`, `fr` unit, `min-h-dvh`/`dvh` *named* but not taught — Ch020 L4 (L4 explicitly deferred the dvh definition to here).
- Tailwind utility/variant/bracket syntax, `cn()` — Ch018.

**Explicitly NOT in this lesson (defer, name-and-point only if it comes up):**
- `gap` and the spacing utilities at depth — Ch020 L6.
- `position`/`inset`/`top`/`left` — Ch020 L7.
- `overflow-*`/`overscroll`/scroll containers — Ch020 L8 (named only, e.g. `max-h-screen overflow-y-auto`).
- Stacking context / z-index — Ch020 L9.
- Responsive variants (`md:w-1/2`, `lg:grid-cols-3`) — Ch021 L6. **Author every example at a single breakpoint** (chapter convention; the L4 card-grid `md:`/`lg:` divergence does NOT apply here — sizing examples don't need responsive variants to be meaningful).
- Container queries, `@container`, `cqi`, and **fluid typography with `clamp()`** — Ch021 L7. This lesson names `clamp()` and stops.
- Typography sizing (`text-*`/`leading-*`/`tracking-*`), `text-wrap: balance`/`pretty`, `truncate`/`line-clamp` — Ch021 L1. Prefer width/size examples for `clamp()` to stay out of this lane.
- OKLCH/color tokens — Ch021 L2 (illustration accents in playgrounds may be hard-coded, per the chapter's flagged divergence — these are illustrations, not project code; don't route through `@theme`).
- Image-handling depth (`object-cover`/`object-contain` beyond a one-line mention, `next/image`, responsive `srcset`) — out of scope here; name `object-cover` once as the aspect-ratio companion and move on.
- `field-sizing: content` for auto-growing inputs — niche; Unit 6 (forms) if it earns its weight. Not here.
- The browser layout/rendering engine internals — out of scope; teach behavior, not implementation.

# Notes for downstream agents

- **Reuse the chapter's component conventions:** new lesson components go under `src/components/lessons/020/5/`; `ParamPlayground`/SVG previews may use hard-coded accent colors (flagged divergence from the OKLCH-token convention — illustrations only); `ReactCoding` starters use `export function App()`.
- **Color discipline:** L1 fixed a box-model color mapping (content=blue/padding=green/border=yellow/margin=orange). This lesson's intrinsic/extrinsic axis coloring is a *new* mapping — pick two distinct hues that don't collide with the box-model four, and keep them consistent across this lesson's figures.
- **Video:** `VideoCallout` only if Resourcer sources a current, reputable `videoId`; do not invent one. The interactives are the primary vehicle.
- **`ParamPlayground` is the workhorse here** (reading-width, viewport-units sim, aspect-ratio). Verify each preview's reactions are expressible in pure CSS (the component's constraint) before committing; the viewport-unit simulation is the riskiest — fall back to a custom `020/5/` component if the CSS-only math is awkward.

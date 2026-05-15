## Concept 1 — The visual surface as a token-driven system

**Why it's hard.** The student arrives expecting CSS to be a bag of properties applied per element; the 2026 reality is that typography, color, shadows, motion, and breakpoints all read from the same token cascade installed in 4.2–4.3. Without that frame, every later lesson reads as another isolated utility scale rather than as one design system speaking through different surfaces.

**Ideal teaching artifact.** A *Concept* opener that puts a single shadcn-style Card on the page and lets the student swap one knob — radius, brand hue, shadow elevation tier, or motion duration — and watch the change propagate to every other surface in view (a button, a heading, a focus ring, a backdrop). The point is not interactivity for its own sake; it is to make visible that the chapter's seven lessons are all sliders on one console. The student leaves the demo holding the mental model "I am editing tokens, not elements."

**Engagement.** A `Buckets` round that sorts a list of CSS values (`#4f46e5`, `oklch(0.62 0.22 263)`, `var(--brand)`, `bg-blue-500/50`, `shadow-lg`) into "literal", "primitive token", "semantic token" — confirms the student can name the storage layer of each value.

**Components.**
- **New: `TokenConsole`** — a controlled card preview with sliders for `--radius`, `--brand-hue`, shadow tier, and a motion-duration multiplier; renders a small panel composed of Button, Heading, and a translucent backdrop, all reading from the swapped tokens.
- Alternative: a `TabbedContent` with three hand-coded panels (light/dark/brand-shifted) wrapped in `Figure`. Lower fidelity, no live sliders, but acceptable v1 if `TokenConsole` slips.

## Concept 2 — Typography as a fixed scale plus three reflexes

**Why it's hard.** Junior devs reach for `text-[17px]` and arbitrary `leading-7.5` the moment a design "almost matches." The senior move is the opposite — stay on the scale, and instead reach for the three modern wrap properties (`text-balance`, `text-pretty`, `max-w-prose`) that make headings and body text read well without leaving the system.

**Ideal teaching artifact.** A *Mechanics* split-pane on a real h1+paragraph block. Left pane: a heading with a stubborn one-word orphan at `text-3xl font-semibold`; right pane: the same heading after toggling `text-balance`. A second row underneath shows a 120-character-wide paragraph against the same paragraph capped at `max-w-prose`, with the eye-travel difference visible. A toggle for `text-pretty` reveals the end-of-paragraph orphan fix. The student manipulates the toggles and sees the wrap algorithm choose differently in real time — the kind of cause-and-effect a static screenshot cannot carry.

**Engagement.** A `Tokens`-style click on a sample heading utility chain — the student picks which classes a senior keeps and which are smells (`text-[17px]` vs `text-base`, `leading-[1.6]` vs `leading-relaxed`).

**Components.**
- Primary: `HtmlCssCoding` with `tailwind: true`, `live: true`, and a starter that includes the toggleable classes pre-written in commented form — the student uncomments to see the effect. Sufficient because the lesson is utility-class fluency.
- `Tokens` for the smell-detection round.

## Concept 3 — OKLCH as the color storage form

**Why it's hard.** The student has years of muscle memory in hex and `rgb()`. OKLCH looks alien (`oklch(0.62 0.22 263)`) and the perceptual-uniformity argument is abstract — "10% lighter actually stays blue" doesn't land without seeing the failure case it fixes.

**Ideal teaching artifact.** A *Concept* side-by-side comparator. Two horizontal strips: one shows a brand color lightened in 10% steps via HSL, the other the same color lightened in OKLCH. The HSL strip drifts purple-then-pink as lightness rises; the OKLCH strip stays the same hue. Below, a second pair: the OKLCH version showing P3 colors a wide-gamut display can render that hex cannot. A small lightness/chroma/hue triad of sliders lets the student build a color from scratch and watch the three channels behave independently — the load-bearing affordance is moving L without C or H sliding under it.

**Engagement.** A short `MultipleChoice` round: given four candidate hover-shade definitions (mix in oklch, mix in srgb, hardcoded hex two steps darker, `opacity-90`), pick the one a senior writes.

**Components.**
- **New: `ColorChannelLab`** — three sliders (L, C, H) driving a live swatch, with an optional "lighten in N steps" mode that renders an HSL-vs-OKLCH strip pair side by side. Inputs: a base OKLCH color. Output: the rendered swatch, the computed CSS string, and the comparison strips.
- Alternative: hand-coded SVG inside `Figure` showing two pre-rendered 10-step strips with annotations. Loses the hands-on channel exploration but proves the perceptual-uniformity claim.

## Concept 4 — `color-mix()` and the `/N` alpha syntax

**Why it's hard.** The student writes `bg-blue-500/50` daily without knowing it compiles to `color-mix(in oklab, var(--color-blue-500) 50%, transparent)`. The reflex needs to be visible — that the same `color-mix()` primitive powers hover/active variants, tinted backgrounds, and the alpha syntax they already use — so they reach for it directly when the design needs `var(--brand) mixed with white 8%`.

**Ideal teaching artifact.** A *Mechanics* "translate-this-utility" sequence. A `DiagramSequence` walks four steps: (1) `bg-blue-500/50` in JSX, (2) the compiled CSS rule with the `color-mix()` call, (3) the same `color-mix()` written by hand to mix brand with white for a hover state, (4) the senior shape — semantic token + `color-mix` for a runtime-derived variant. The student sees each form is the same machinery dressed differently.

**Engagement.** A `Matching` exercise pairing four utilities (`bg-blue-500/50`, `hover:bg-accent`, `bg-[color-mix(in_oklch,var(--brand),black_10%)]`, `opacity-50`) with the compiled `color-mix` or `opacity` rule each becomes.

**Components.**
- `DiagramSequence` with `Code` panels in each step.
- `Matching` for the recall round.

## Concept 5 — `opacity` vs per-property alpha, and the stacking-context cost

**Why it's hard.** Both `opacity-50` and `bg-black/50` look semi-transparent on a swatch but behave differently: `opacity` fades the entire subtree (right for disabled buttons), per-property alpha only fades the one declaration (right for translucent overlays where inner text must stay opaque), and `opacity` quietly creates a stacking context that breaks z-index intuition (cross-reference to 4.4.9).

**Ideal teaching artifact.** A *Decision* side-by-side. Two identical Card components — each holds a heading, body text, and a small icon — one wrapped in `opacity-50`, the other given `bg-card/50`. The contrast is obvious: the first fades the heading and icon too, the second only fades the background. A third panel beneath both shows a tooltip child that escapes correctly in one case and gets trapped in the other because of the stacking context — the misconception ambush the student needs to hit once and not forget.

**Engagement.** A `MultipleChoice`: given four UI scenarios (disabled button, glassy header, translucent modal backdrop, ghost placeholder), pick `opacity` vs `/N` for each.

**Components.**
- `TabbedContent` with three hand-coded panels (subtree fade, surface fade, stacking-context trap) wrapped in `Figure`. The stacking-context panel reuses any visual idiom already established in 4.4.9 if available.
- `MultipleChoice` for the recall round.

## Concept 6 — `prefers-color-scheme` vs `.dark` — OS preference vs site preference

**Why it's hard.** Two color-scheme signals coexist: the OS-level `prefers-color-scheme` media query, and the `.dark` class `next-themes` writes on `<html>` based on user choice. The student needs to know that the site preference wins, that the `dark:` variant reads the class (not the media query directly), and that semantic tokens flip values inside `.dark` — so they never write `dark:bg-zinc-900` next to `bg-white`.

**Ideal teaching artifact.** A *Mechanics* live demo with two toggles stacked. Toggle one: a mocked OS preference (light/dark/auto). Toggle two: the site preference exposed by `next-themes` (light/dark/system). A small Card renders below, with its rendered token values (`--background`, `--foreground`, `--card`) printed next to it. The student watches that flipping OS-only does nothing when site is set to a specific theme, and that the same JSX (`bg-card text-foreground`) renders correctly under every combination. The truth-table is built by play, not memorized from a slide.

**Engagement.** A `TrueFalse` round of four claims: "writing `dark:bg-zinc-900` next to `bg-white` is the senior form" (false), "the `.dark` class on `<html>` wins over `prefers-color-scheme`" (true), etc.

**Components.**
- **New: `ThemeToggleMatrix`** — two independent toggles (OS-pref simulated via a CSS class on a scoped iframe, site-pref via a class on a target wrapper), a target panel that reads tokens, and a live token-value readout. Targets the `next-themes` mental model specifically.
- Alternative: a 2×3 truth-table figure (hand-coded HTML inside `Figure`) showing all six OS×site combinations with rendered swatches. Loses the play loop but lands the precedence rule.

## Concept 7 — Elevation as a language: borders, radius, shadow tiers

**Why it's hard.** A senior reaches for `shadow-sm` on a card, `shadow-md` on a hover state, `shadow-lg` on a dialog — and never `shadow-2xl` on a body card, because that reads as a floating modal. The student needs to internalize that the shadow scale is a *surface-tier vocabulary*, not a "more dramatic = better" slider, and that radius and border choices belong to the same vocabulary.

**Ideal teaching artifact.** A *Concept* surface-tier ladder. Five Card components stacked: base surface (no shadow), card (`shadow-sm`), hovered card (`shadow-md`), popover (`shadow-md` + ring), dialog (`shadow-xl`). Each is labeled with the design role it plays. Beside the ladder, a "wrong-by-default" Card with `shadow-2xl rounded-3xl border-4` — the student reads it and instantly feels the mismatch; a chip below reveals "why this reads as a floating modal, not a feature card." Radius and border get the same ladder treatment in a second pass.

**Engagement.** A `Buckets` exercise: drag eight UI roles (toast, tooltip, sidebar nav, settings card, sign-in dialog, header, dropdown menu, page background) onto the elevation tier that fits.

**Components.**
- Hand-coded HTML cards wrapped in `Figure` for the ladder visual.
- `Buckets` for the role-to-tier sort.

## Concept 8 — Focus rings: `outline` vs `border` vs `ring`, gated by `:focus-visible`

**Why it's hard.** The student knows `:focus` from any tutorial; they don't know that `:focus` fires on click too (and so produces an annoying ring on mouse users), that `:focus-visible` is the discipline, that `outline` doesn't shift layout while `border` does, and that `ring-*` is the multi-layer shorthand shadcn ships with offset and themable colors.

**Ideal teaching artifact.** A *Pattern* triad. Three buttons in a row: one with `focus:border-2`, one with `focus:outline-2 focus:outline-offset-2`, one with `focus-visible:ring-2 ring-ring/50 ring-offset-2`. The student is asked to (1) click each button with a mouse and (2) Tab to each with the keyboard. The first shifts neighbors when focused (layout cost). The second shows a ring on every mouse click (mouse noise). The third behaves like a senior implementation — invisible to mouse users, crisp on keyboard. Each row labels the failure mode that earned the right answer.

**Engagement.** The artifact itself carries the assessment — the student predicts the failure before pressing Tab, then confirms. A short follow-up `MultipleChoice` ("which utility chain is the canonical 2026 focus reflex?") locks the syntactic recall.

**Components.**
- `HtmlCssCoding` with `tailwind: true` — three pre-built buttons the student tabs through; the iframe is same-origin so DevTools and keyboard work.
- `MultipleChoice` for the recall confirmation.

## Concept 9 — `:has()` retired a generation of JS class toggles

**Why it's hard.** The student's instinct, formed in the 2022 React world, is to wire a `useState` plus `onChange` handler whenever a parent's styling depends on a child's state ("is the input invalid? add a red border to the row"). `:has()` makes that observer disappear into one CSS selector, and the realization needs to be visceral — they should see the same outcome with and without React state.

**Ideal teaching artifact.** A *Pattern* before/after toggle. Two implementations of the same Form Row component side by side: the left one tracks `inputValid` with React state and conditionally applies `border-destructive`; the right one is purely declarative — `has-[input:invalid]:border-destructive` on the wrapper. The student types into both, watches both behave identically, then reads the diff — fifteen lines of state plumbing collapse to one variant. A second mini-demo shows `has-[:checked]:bg-accent` on a label-wrapped radio card.

**Engagement.** A `CodeVariants` "spot the cleaner version" — three implementations of the same parent-of-checked pattern (Refs, state observer, `:has()`); the student picks the senior form and reads the rationale on each tab.

**Components.**
- `CodeVariants` for the before/after.
- `ReactCoding` in target-match mode for the live form-row demo, with the `:has()` solution shipped as the target output.

## Concept 10 — What's cheap to animate: `transform` and `opacity`

**Why it's hard.** Animating `width`, `height`, `top`, or `margin` looks fine on a Mac in development and chugs on a mid-tier phone in production. The student needs to understand that `transform` and `opacity` are GPU-composited (60fps free) while layout and paint properties cost a recompute on every frame — and to absorb that as the reflex *before* they ship a janky modal.

**Ideal teaching artifact.** A *Concept* fps simulator. A button labeled "animate 200 cards" with two modes: "cheap" (translate + opacity) and "expensive" (top + width). The student presses each and the demo reports the dropped-frame count over a 1-second window. The expensive run visibly stutters; the cheap run is butter. A small annotation strip beneath names the pipeline stage each property triggers — layout, paint, composite — so the cost has a mechanism, not just a label.

**Engagement.** A `Buckets` round sorting twelve CSS properties (`transform`, `opacity`, `top`, `height`, `background-color`, `color`, `filter`, `border-radius`, `box-shadow`, `padding`, `margin`, `clip-path`) into "cheap (composite)", "medium (paint)", and "expensive (layout)" columns.

**Components.**
- **New: `AnimationCostBench`** — a click-to-run benchmark widget that animates N elements with a chosen property set, measures `requestAnimationFrame` deltas, and reports dropped frames. Inputs: property list, element count, duration.
- Alternative: a hand-coded SVG inside `Figure` showing the rendering pipeline (style → layout → paint → composite) with each property pinned to the earliest stage it triggers. Loses the visceral fps demo but lands the mechanism.
- `Buckets` for the property sort.

## Concept 11 — Data-state choreography: `tw-animate-css` and `data-[state=open]:animate-in`

**Why it's hard.** The student arrives believing "animation in React" means installing Framer Motion. The 2026 form is the opposite: Radix sets `data-state="open"` on the wrapper, `tw-animate-css` ships the entrance/exit utility classes, and CSS variants drive the choreography. State lives in React, motion lives in CSS — and the student needs to see that division of labor in one worked artifact.

**Ideal teaching artifact.** A *Pattern* worked example built around a shadcn Dialog. The student watches a side-by-side: left pane shows the JSX (a few lines with `data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95`), right pane shows the Dialog opening and closing. A "show me the data attribute" toggle exposes the `data-state` attribute live as it flips. The accordion-down pattern with `--radix-accordion-content-height` gets the same treatment — the student sees that the custom property is what makes `auto` height animatable.

**Engagement.** A `Sequence` ordering drill: drag the four mental steps in order — "React sets state", "Radix writes `data-state` to the DOM", "CSS variant matches the attribute", "`tw-animate-css` keyframes run". Confirms the student has the division-of-labor right.

**Components.**
- `AnnotatedCode` walking the dialog JSX one variant chain at a time, paired with a live shadcn Dialog rendered in an adjacent `Figure`.
- `Sequence` for the order-the-pipeline recall.

## Concept 12 — `prefers-reduced-motion` as a discipline-level guard

**Why it's hard.** Reduced-motion is one of those rules the student reads once, nods at, and forgets — until an accessibility audit flags every entrance animation in the app. It needs to be installed as a *reflex on every non-essential animation*, not as a checklist item at QA time.

**Ideal teaching artifact.** A *Concept* OS-preference simulator. A toggle simulates the user's "Reduce motion" setting; below it, a small UI strip (modal opening, card hover-lift, page-load fade-in, loading spinner) plays each animation. With the toggle off, everything moves. Flip the toggle: the decorative animations stop, but the loading spinner — which carries information — keeps spinning. The student reads the distinction directly: "non-essential motion is the one I gate."

**Engagement.** A `TrueFalse` round of five claims about reduced-motion (does the spinner stop? does `motion-reduce:transition-none` work on hover? does shadcn handle this for me? does `prefers-reduced-motion` read OS settings?).

**Components.**
- Reuse the `ThemeToggleMatrix` proposal's class-on-wrapper trick to simulate the media-query state, scoped to a small demo strip composed of hand-coded animated panels inside `Figure`. Single-use, no forward-link in this chapter — keep as `Figure` + class-toggle button; do not propose a new component.
- `TrueFalse` for the claim round.

## Concept 13 — Mobile-first and content-driven breakpoints

**Why it's hard.** "Mobile-first" gets repeated as a slogan; the student writes `lg:hidden md:flex sm:grid-cols-2` and produces something that works *and* fights the cascade. The senior form is to write the base for the smallest viewport, layer `sm:`/`md:`/`lg:` overrides upward, and pick breakpoints based on where the *layout* breaks rather than which device category they target.

**Ideal teaching artifact.** A *Mechanics* resize-the-frame demo. A three-card grid renders in a resizable iframe; a width slider above lets the student drag the viewport from 320px to 1600px. As the slider moves, the grid reflows from one column to two to three; the active breakpoint chip lights up in a strip above (`sm`, `md`, `lg`, `xl`). The student finds the *content* breakpoint by widening until two cards fit, then notes that 768px is *where the layout earned the change*, not where some device sits. A "desktop-first" variant of the same grid (written with `max-md:`) sits beside it so the student feels the cascade fighting them.

**Engagement.** A `Tokens` click on a Tailwind utility chain — pick the senior form among `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, `max-lg:grid-cols-2 max-md:grid-cols-1 grid-cols-3`, and a few smells.

**Components.**
- **New: `ResponsiveFrame`** — a resizable iframe (drag handle on the right edge, optional width slider, live width readout, active-breakpoint badge) hosting any Tailwind-aware preview. Inputs: starter JSX or HTML; output: the rendered preview at any width.
- `Tokens` for the utility-chain pick.

## Concept 14 — Container queries and the viewport-vs-container decision

**Why it's hard.** Once the student has media queries, they reach for them for every responsive problem — including the case where a `<ProductCard>` renders in a 200px sidebar and a 600px feed at the same viewport width. The 2026 form is `container-type: inline-size` on the wrapper and `@md:flex-row` on the child; the decision rule — *viewport for page structure, container for components* — needs to land alongside `cqi` + `clamp()` for fluid component typography.

**Ideal teaching artifact.** A *Pattern* "same card, two slots" demo, paired with a fluid-typography micro-widget. The card demo: one `<ProductCard>` component rendered twice on the page — once inside a sidebar slot, once inside a wide feed slot — both adapting their layout (`@md:flex-row`) without anyone telling them which slot they're in. The student drags a handle on either slot to resize it and the card reflows independently of the other. Beneath, a second small card has its title set with `clamp(1rem, 2.5cqi, 1.5rem)` and a single slot-width slider — the title scales smoothly with the slot, no breakpoint, no React. The decision rule lands on a one-line annotation between the two: "viewport for the page shell, container for the card inside it."

**Engagement.** A `MultipleChoice` decision round — given five UI cases (mobile nav vs. desktop nav, product card in two contexts, sidebar widget that collapses, two-column page shell, dashboard card that adapts to dashboard width), pick viewport query or container query for each.

**Components.**
- Reuse `ResponsiveFrame` for the two slots if the resize handles are first-party; otherwise a hand-coded `Figure` with two iframe-styled slots driven by simple `<input type="range">` widgets bound to slot width via CSS variables.
- **New (small): `ContainerSlot`** — a single resizable slot (width drag handle, optional `container-type` toggle, live `cqi` readout) hosting arbitrary children. Inputs: starter children, min/max widths, default width. Used twice in this concept and once again for the `clamp()` micro-demo.
- `MultipleChoice` for the decision round.

**Project link.** Container queries are not strictly required by the 4.12 themed product surface (the chapter ships a viewport-driven shell), but the FeatureCard in 4.12.3 and the pricing cards in 4.12.4 are exactly the components that benefit if the project's stretch goal is to reuse them in the sidebar of a later unit.

---

## Component proposals

- **`TokenConsole`** — controlled-knobs Card preview: sliders for `--radius`, `--brand` hue, shadow tier, motion-duration multiplier; renders a small composed panel reading from those tokens.
  - **Uses in this chapter:** Concept 1.
  - **Forward-links:** Chapter 4.11 (shadcn surface and design tokens) for the token-driven theming intro; Chapter 4.12 (themed product surface) for the project's `@theme` block walkthrough.
  - **Leanest v1:** two sliders (radius and brand hue), one Card preview, one Button — drops shadow tier and motion. Still teaches the throughline.

- **`ColorChannelLab`** — three sliders (L, C, H) driving a live OKLCH swatch with a computed-CSS readout and an optional HSL-vs-OKLCH lighten strip.
  - **Uses in this chapter:** Concept 3.
  - **Forward-links:** Chapter 4.11 if it teaches the shadcn palette generator; Chapter 4.12.2 for reading the `@theme` color block.
  - **Leanest v1:** L/C/H sliders + swatch + CSS readout; no comparison strip. The comparison ships as a static `Figure` adjacent.

- **`ThemeToggleMatrix`** — two independent toggles (OS pref simulated, site pref via class) over a small composed target panel that reads tokens, with a live token-value printout.
  - **Uses in this chapter:** Concept 6 (primary); informs the class-toggle pattern reused in Concept 12 for reduced-motion.
  - **Forward-links:** Chapter 4.12.4 (flicker-free theme toggle) — the same precedence model is the lesson there.
  - **Leanest v1:** the two toggles plus one Card target plus three printed token values. No truth-table view.

- **`AnimationCostBench`** — click-to-run benchmark widget that animates N elements with a chosen property set, measures `requestAnimationFrame` deltas, reports dropped frames.
  - **Uses in this chapter:** Concept 10.
  - **Forward-links:** None — single-use in this chapter. Demoted in the per-concept Components bullet to alternative; the primary recommendation is a hand-coded `Figure` SVG of the rendering pipeline. If the bench is built, it would also serve a future Unit 11 lesson on perceived performance.
  - **Leanest v1:** a single fixed-element-count run with one toggle (transform vs. width) and a dropped-frame counter.

- **`ResponsiveFrame`** — resizable iframe with width handle, width readout, active-breakpoint badge; hosts any Tailwind-aware preview.
  - **Uses in this chapter:** Concept 13 (primary), Concept 14 (reused).
  - **Forward-links:** Chapter 4.11 (shadcn responsive components), Chapter 4.12.6 (verify reflow at 360/768/1280), Chapter 5.1 (app-router responsive layouts). High reuse.
  - **Leanest v1:** drag handle + width readout, no breakpoint badge. The badge ships in v2.

- **`ContainerSlot`** — single resizable slot with width drag handle, optional `container-type` toggle, live `cqi` readout; hosts arbitrary children.
  - **Uses in this chapter:** Concept 14 (used twice — card-adapts demo and fluid-typography demo).
  - **Forward-links:** Chapter 4.11 (shadcn components with container-aware variants); useful any time a later lesson teaches per-component responsive design.
  - **Leanest v1:** drag handle + container-type toggle on a fixed-width slot; drop the `cqi` readout for v1, add when fluid typography needs it.

## Build priority

`ResponsiveFrame` carries the most teaching load and the most forward-link weight — it's the primary artifact for one concept, reused in another, and the verification surface for the unit project and at least one later unit. Build it first.

`TokenConsole` is second: it opens the chapter, frames every later lesson, and forward-links cleanly to the design-tokens material in 4.11 and 4.12. The leanest v1 (two sliders) already earns its weight.

`ThemeToggleMatrix` is third: it's the only artifact that makes the OS-vs-site precedence visible, and the same class-toggle mechanic gets reused in Concept 12. It also pays back in 4.12.4.

`ContainerSlot`, `ColorChannelLab`, and `AnimationCostBench` are lower priority. `ContainerSlot` is worth building if its v1 is genuinely small (a drag handle on a div); `ColorChannelLab`'s static-strip alternative is acceptable and the chapter survives without the bespoke version; `AnimationCostBench` is single-use in this chapter and demoted by design — only build it if the pipeline `Figure` reads as too abstract in author testing.

## Open pedagogical questions

- The Concept 1 throughline ("token-driven visual surface") risks reading as preamble if the `TokenConsole` slips to v0. Decision: if the artifact is text-only, fold this concept into Concept 7 (elevation language) where tokens become tangible, and let Concept 1 become a one-paragraph chapter framing in the first lesson instead of a standalone concept.
- Concept 14 bundles the container-queries decision *and* `cqi`+`clamp()` fluid typography into one teaching beat. If author testing shows the two ideas resist landing together, split into 14a (decision rule + adapting card) and 14b (fluid typography with `clamp(cqi)`), accepting a concept count of 15.

# Lesson 5 — Motion: transitions, keyframes, and tw-animate-css

**Title (h1):** Motion: transitions, keyframes, and tw-animate-css
**Sidebar label:** Motion and animation

---

## Lesson framing

This is the motion lesson of chapter 021's visual surface. The four prior lessons taught *static* surface (type, color, elevation) and the *instant state flips* of pseudo-classes. L4 closed by teasing "making these instant state flips move." This lesson makes them move — and does so the 2026 way: motion lives in CSS, state lives in React, no JS animation library on the SaaS surface.

**The spine (carry through every section): cheap-by-default, CSS-not-JS, reduced-motion-as-discipline.** Three mental models the student must leave with:
1. **The compositor budget.** `transform` and `opacity` animate on the GPU at 60fps; everything else (`width`, `height`, `top`, `background-color`) costs layout or paint. This is *the* senior reflex — it decides which animations are even allowed. Teach it early and refer back.
2. **State lives in React, motion lives in CSS.** Radix/shadcn sets `data-state="open"|"closed"` on a wrapper; CSS variants (`data-[state=open]:animate-in`) read that attribute and run the entrance/exit. This is the direct extension of L4's "the DOM already knows; the React state was always a mirror" — here the data-attribute *is* the mirror, and CSS reads it directly. The student writes zero animation JS.
3. **`tw-animate-css` is a surface you read, not reimplement.** New shadcn projects ship it; the student installs once (`@import`), then composes its `animate-in`/`fade-in-0`/`zoom-in-95`/`slide-in-from-*` utilities. It replaced the deprecated `tailwindcss-animate`.

**Pedagogical arc — three escalating tiers of motion, simplest first** (minimize cognitive load by building complexity in layers):
- **Tier 1 — transitions:** the cheapest motion, driven by a *property change* (hover/active/data-state). Student already has the triggers from L4; this just makes the flip tween. Ground every transition in the compositor-budget rule.
- **Tier 2 — keyframes:** motion that runs *on its own* (spinners, skeletons, pulses) without a state change. Tailwind ships four (`animate-spin/pulse/ping/bounce`); custom ones are authored in `@theme`.
- **Tier 3 — choreographed entrance/exit:** the `tw-animate-css` + data-state pattern that powers real shadcn dialogs/sheets/accordions. This is the payoff tier — it's where all three mental models combine on a component the student will actually ship.

Then the cross-cutting closers: the transform surface (the raw material Tier 1 and 3 both animate), `prefers-reduced-motion` as the non-negotiable guard, and View Transitions as recognition-only horizon.

**Reflex framing continues from L1–L4:** every motion utility is taught as *which utility, on which surface, with which duration*. The duration band (150 / 200–300 / 400ms+) is the motion analogue of L3's "one elevation step per tier." Establish canonical reaches the student can copy: `transition-colors` on buttons, `hover:scale-105` card lift, `active:scale-95` press, `animate-spin` loader, the dialog `fade-in-0 zoom-in-95` choreography.

**Centerpiece interactives:** (1) a `DiagramSequence` that *is* the data-state choreography — scrub open→closed and watch the data-attribute flip drive the CSS animation, the single most important concept made tangible; (2) a `ParamPlayground` motion lab (duration + easing + transform-property select) so the student *feels* the duration band and easing curves rather than reading numbers; (3) live `ReactCoding` target-match for hover-lift and press-feedback (these states can't render statically — must be live). Consolidation is `Buckets` (cheap vs. expensive to animate) + `MultipleChoice`.

**Two intentional code divergences (do not "correct" downstream):** (a) `ReactCoding` runs on the Tailwind Play CDN, which cannot ingest a custom `@theme` block or the `tw-animate-css` import — so live exercises use built-in `animate-spin`/`transition`/`hover:scale-*`/`active:scale-*` and CDN-resolvable colors, never custom keyframes or `animate-in`; the choreography pattern is taught via the `DiagramSequence` + static annotated code, with an in-prose note that real shadcn ships the import. (b) `@keyframes` + `@theme` blocks are shown as fragments of `app/globals.css`, never whole files (continues the L2/L3 convention).

---

## Section-by-section outline

### Introduction (no header)

Open on the senior question, concretely. A modal that snaps open with zero animation reads as broken; reaching for Framer Motion to fade-and-scale one dialog is a sledgehammer (bundle weight, a second mental model, JS on the main thread). The 2026 answer is `data-[state=open]:animate-in data-[state=closed]:animate-out fade-in-0 zoom-in-95` — pure CSS utilities reading a Radix data-attribute. State that the lesson installs the motion surface in three tiers (transitions → keyframes → choreography), names the package shadcn depends on, and makes `prefers-reduced-motion` a discipline-level guard, not an afterthought. Connect back: L4 gave instant state flips; this lesson makes them move. Keep it warm and brief (per pedagogical guidelines — the senior question is implicit framing, not a labeled section).

Reasoning: leads with a decision + concrete before/after per "decisions before syntax." Names the threshold the platform default (CSS) crosses before the power tool (Framer Motion) — and the verdict is *stay on the default*.

---

### The compositor budget: what is cheap to animate

**Goal:** install the single most load-bearing rule *before* teaching any utility, so every later animation choice is grounded in it.

Content:
- The browser rendering pipeline in one compressed pass: a property change can force **layout** (geometry recompute: `width`, `height`, `top`, `left`, `margin`, `padding`), **paint** (re-rasterize pixels: `background-color`, `color`, `box-shadow`), or only **composite** (GPU moves an already-painted layer: `transform`, `opacity`). Animating runs this pipeline ~60×/second — so the per-frame cost is what decides whether motion is smooth.
- **The reflex:** animate `transform` (translate/scale/rotate) and `opacity`. These two are GPU-composited on every modern browser and hit 60fps with no per-frame layout or paint. Everything else is suspect; reach for it only when the design truly demands it and the element count is low.
- The trap stated plainly: animating `height`, `top`, or `left` *works* but jank-risks on lower-end devices and long lists. Translate instead of `top`; scale instead of `width` where the design allows.

**Diagram — the three-lane pipeline (HTML+CSS `Figure`, devtools-inspectable).** A horizontal strip: a property change enters and lights up one of three lanes — Layout → Paint → Composite (expensive), Paint → Composite (medium), Composite-only (cheap). Color-code: red (layout), orange (paint), green (composite-only). Pedagogical goal: make "cheap vs. expensive" *spatial* — the green lane is short, the red lane is long. Per diagrams INDEX, a sequential phase strip / annotated illustration is HTML+CSS's sweet spot; wrap in `<Figure>`. Keep it short (height cap) and horizontal.

Reasoning: this is the chapter outline's "what's cheap to animate" bullet, promoted to its own opening section because every subsequent reflex (`transition-transform` over `transition-all`, `hover:scale-105` over width changes, the choreography using `fade`+`zoom` not `height`) depends on it. Teaching it first means later sections can *refer* to the budget instead of re-deriving it — lower cumulative cognitive load.

`Term` candidates: **compositing** (GPU combining painted layers into the final frame), **layout/reflow** (recall hook to L3's reflow term — keep the definition consistent), **paint**.

---

### `transition-*`: tweening a state flip

**Goal:** Tier 1. The student already has the triggers (hover/active/data-state from L4); this makes the flip animate instead of snapping.

Content:
- The model: a transition watches named properties and tweens them over a duration when their value changes. The change is still triggered by the same pseudo-class/variant from L4 — transition only adds the *in-between frames*.
- The utility family:
  - **Property scope:** `transition` (a sensible curated set — color, background, border, opacity, box-shadow, transform, filter, backdrop-filter — *not* literally `all`, clarify this v4 default), `transition-colors`, `transition-transform`, `transition-opacity`, `transition-shadow`, `transition-none`. The reflex: **name the property** — `transition-colors` on a button whose color shifts, `transition-transform` on a card that lifts. `transition-all` is reserved for tiny components where every animating property is intentional (it pays paint cost on every property that happens to change).
  - **Duration:** `duration-*` (ms). Establish the **senior duration band** explicitly — `duration-150` for snappy state changes (hover, press), `duration-200`/`duration-300` for entrances/exits, `400ms+` only for long-form choreography. Frame as the motion analogue of L3's elevation discipline: a band, not a free dial. Long durations feel sluggish.
  - **Easing:** `ease-linear` / `ease-in` / `ease-out` / `ease-in-out`. The reflex: `ease-out` for things entering/appearing (fast-in, settle), `ease-in` for things leaving, `linear` for spinners/progress. `ease-out` is the default reach for UI.
  - **Delay:** `delay-*`, named briefly — used for staggered list reveals; not dwelt on.
- The canonical reach, read verbatim: a button's `transition-colors hover:bg-accent active:scale-95` — color tweens on hover, scale snaps the press. Cross-reference the L4 button string (`hover:bg-accent ... active:scale-[0.98]`) — this lesson adds the `transition-*` that makes that string *move*. Keep consistent with L4's canonical button string.

**Interactive — the motion lab (`ParamPlayground`).** Controls: `duration` slider (0–600ms, suffix `ms`), `easing` select (`linear`/`ease-in`/`ease-out`/`ease-in-out`), and a `property` select (`translate`/`scale`/`opacity`) OR a toggle that flips the preview box between two states. Preview: a box that transitions between two states (e.g. translated + faded) using `transition-duration: var(--duration); transition-timing-function: var(--easing)`. The student slides duration to *feel* where motion turns sluggish (past ~400ms) and snappy (~150ms), and swaps easing to feel the curve. `Readout` echoing the resolved `transition` shorthand string. Pedagogical goal: the duration band and easing curves are *felt*, not memorized — a static figure would freeze exactly the comparison the student needs to scrub through (the explicit "when to reach for ParamPlayground" case).

**Live exercise — press + lift (`ReactCoding`, target-match, `live`).** Target: a card/button with `transition-transform hover:scale-105 active:scale-95`. Starter: the same element with no motion. Student matches the hover-lift and press-feedback. Must be live + target-match because these states (`:hover`, `:active`) cannot render in a static panel — this is the same constraint L4 documented. Tailwind Play CDN handles `transition`/`hover:scale-*`/`active:scale-*` natively (built-in utilities, no `@theme` needed). In-prose note: app code pairs this with semantic tokens; CDN literals here are the deliberate divergence.

Reasoning: transitions are the lowest-complexity tier and reuse L4's triggers directly, so they come first. The duration band and the name-the-property rule are the two senior reflexes; everything else is utility enumeration kept terse. The ParamPlayground is justified because duration/easing are quintessential "feel it by sliding" parameters.

`Term` candidates: **easing / timing function** (the curve mapping elapsed time to progress), **tween** (the interpolated in-between frames).

---

### `animate-*`: motion that runs on its own

**Goal:** Tier 2. Distinguish *transition* (needs a state change to fire) from *animation* (runs from keyframes, no trigger needed) — the conceptual line the student must draw.

Content:
- The distinction up front: a **transition** interpolates between an old and new value when something changes; an **animation** plays a `@keyframes` timeline on its own (loop or once), independent of any state change. Loaders, skeletons, and pulses are animations because nothing "changes state" — they just run.
- **The four shipped keyframes** Tailwind v4 provides (declared in the default theme as `--animate-*`): `animate-spin` (loader icon — the daily reach), `animate-pulse` (skeleton placeholders — recall the four-states discipline: `<Skeleton>` over spinners where appropriate), `animate-ping` (notification dot ripple), `animate-bounce` (empty-state attention arrow). Map each to its canonical surface (reflex framing).
- **Authoring a custom keyframe — the Tailwind v4 CSS-first path.** Two pieces in `app/globals.css`: (1) a `@keyframes <name> { ... }` block, (2) inside `@theme`, `--animate-<name>: <duration> <timing> <name>;`. Then `animate-<name>` is a usable utility in JSX. Show as a `globals.css` fragment (not whole file). This is the v4 mechanism that replaced the old JS-config `keyframes`/`animation` keys — name that it's CSS-first, no `tailwind.config.ts` (recall the L2/L3 v4 convention).

**Code — the custom-keyframe shape (`AnnotatedCode`, lang `css`).** One small `globals.css` fragment with two-three steps:
1. highlight the `@keyframes` block — "the timeline: what the property is at 0% and 100%."
2. highlight the `@theme` `--animate-*` line — "register the name + duration + easing as a theme token; this is what turns it into the `animate-*` utility."
3. (optional) highlight a JSX usage line — "consume it like any other utility."
Use `color="blue"`. AnnotatedCode is the right pick: one short block, attention directed to the two distinct pieces (keyframes vs. theme registration) that beginners conflate.

Reasoning: separating "transition vs. animation" is the core conceptual work here — beginners use the words interchangeably. The four built-ins are enumerated fast (they're copy-reach utilities); the custom-keyframe authoring path gets the AnnotatedCode because the `@keyframes` + `@theme` split is the one genuinely new mechanism, and it's the foundation the accordion pattern builds on next.

`Term` candidates: **keyframes** (the `0%`→`100%` timeline of property values).

---

### Choreographing entrance and exit: `tw-animate-css` and data-state

**Goal:** Tier 3, the payoff. Combine all three mental models on a real shadcn component. This is the heart of the lesson.

Content:
- **The problem this tier solves.** A dialog needs to *animate in* when it opens and *animate out* before it unmounts. Plain CSS transitions can't easily run an exit animation on an element that's about to be removed; and writing this by hand in React (track open state, delay unmount, toggle classes) is the exact JS-mirror pattern L4 retired. The 2026 solution pushes the state to a *data-attribute* and lets CSS + a utility library do the rest.
- **`tw-animate-css` — the dependency.** What it is: a CSS-first Tailwind v4 utility pack (the successor to the deprecated `tailwindcss-animate`). New shadcn projects ship it; install is one line — `@import "tw-animate-css";` in `app/globals.css` (after the Tailwind import). It provides:
  - `animate-in` / `animate-out` — the enter/exit primitives.
  - Modifiers that compose onto them: `fade-in-0` / `fade-out-0`, `zoom-in-95` / `zoom-out-95`, `slide-in-from-top-2` / `slide-in-from-bottom` / `slide-in-from-left` / etc.
  - Plus duration/easing utilities (`duration-200`, `ease-out`) shared with core.
  - The ready-made `accordion-down`/`accordion-up`/`caret-blink` keyframes shadcn's components rely on.
  - Frame it as **read, don't reimplement**: install once, compose the utilities, never hand-roll the keyframes.
- **The data-state choreography pattern — the 2026 component-motion idiom.** Radix (under shadcn) sets `data-state="open"` or `data-state="closed"` on the content wrapper as the component opens/closes. CSS variants target each state and run the matching direction:
  - `data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95`
  - `data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95`
  - **The mental model line (carry verbatim-compatible from L4):** the state lives in React, the motion lives in CSS — the data-attribute is the seam between them. Radix even holds the element in the DOM through the exit animation so `animate-out` has time to play. This is *why* the pattern works without unmount-timing JS.
- Connect to the budget: notice the dialog choreography uses `fade` (opacity) + `zoom` (scale) — both compositor-cheap by design. The library's defaults respect the budget; the student inherits that for free.

**Centerpiece diagram — the choreography seam (`DiagramSequence`, ~4 steps).** Scrub a Dialog through its lifecycle. Each step shows two synced panels: the **React/DOM state** (the wrapper element with its current `data-state="..."` attribute) and the **rendered frame** (the dialog at that point in the fade+zoom). Steps:
1. Closed — `data-state="closed"`, dialog absent/faded; overlay trigger visible.
2. Opening — `data-state="open"` just set; `animate-in fade-in-0 zoom-in-95` mid-play (dialog at ~95% scale, partial opacity).
3. Open — `data-state="open"`, dialog settled at full scale/opacity.
4. Closing — `data-state="closed"` set again; `animate-out fade-out-0 zoom-out-95` mid-play; caption notes Radix keeps it mounted until the animation ends, *then* removes it.
Pedagogical goal: make the seam *visible* — the student watches the data-attribute flip in one panel and the CSS animation respond in the other, internalizing "state in React, motion in CSS" as a concrete cause→effect they can scrub. This is the single most important visual in the lesson. DiagramSequence is the exact fit (a temporal sequence the student scrubs) and sidesteps the live-render limitation (real open/close animation can't be captured in a static panel).

**Code — the dialog className, annotated (`AnnotatedCode`, lang `tsx`).** A trimmed `DialogContent` className string (the real shadcn shape, partial component — intentional staging note). Steps walk: (1) the base layout/positioning classes, (2) `data-[state=open]:animate-in ... fade-in-0 zoom-in-95` — "the entrance, fired by the open state," color green, (3) `data-[state=closed]:animate-out ... fade-out-0 zoom-out-95` — "the exit, fired by the closed state," color orange, (4) the `duration-200` — "tied to the snappy/entrance band from earlier." AnnotatedCode because this one className is dense and the open vs. closed halves must be visually separated for the pattern to click.

**The accordion special case (subsection-level prose, no h3 needed unless it reads better as one).** Why height animation is the exception: `height: auto` can't be animated by spec (the browser has no numeric target to tween toward). shadcn's Accordion sidesteps it with a CSS custom property Radix measures and sets — `--radix-accordion-content-height` — fed into the `accordion-down`/`accordion-up` keyframes (which `tw-animate-css` ships). The student copies this pattern; the lesson names what each piece does (Radix measures and sets the var; the keyframe animates `height` from 0 to that var). 
**Forward reference + fact-corrected note:** the native fix on the horizon is `interpolate-size: allow-keywords` (with `calc-size()`), which lets `height` animate to `auto` directly. **State accurately: Chromium-only as of early 2026 (no Safari, no Firefox) — NOT Baseline yet, so not a senior reach; the measured-custom-property pattern remains the production answer.** This corrects the chapter-outline draft that called it "Baseline 2026" — downstream agents must not claim Baseline.

Reasoning: this section is where the lesson's thesis (CSS-not-JS motion) lands on a component the student ships weekly. The DiagramSequence carries the abstract seam concept; the AnnotatedCode grounds it in the literal className they'll read in shadcn. The accordion is included because it's the canonical "height can't animate" gotcha and shadcn's solution is non-obvious — but it's kept tight (the student copies, doesn't author). The `interpolate-size` correction is a genuine fact-check catch worth flagging loudly.

`Term` candidates: **choreography** (coordinated multi-property enter/exit motion), **Radix** (the headless primitive library shadcn wraps — recall hook to L4/L3 where shadcn/Radix appeared), **data-attribute** (only if not already a live recall term from L4; L4 taught `data-*` variants, so likely a light recall rather than full Term).

---

### The transform surface

**Goal:** name the raw material that Tier 1 and Tier 3 both animate — the four transforms — and their canonical reaches. Placed after choreography because the student has now *seen* transforms animate (scale in zoom, translate in slide) and can name the underlying utilities.

Content:
- The four transform utilities: `translate-x-*` / `translate-y-*` (move), `scale-*` (e.g. `scale-105`, `scale-95`), `rotate-*` (`rotate-12`, `-rotate-3`), `skew-*` (rare, named). All four are compositor-cheap (callback to the budget — this is *why* they're the animation primitives).
- Canonical reaches (reflex framing): `hover:scale-105` = the card-lift; `active:scale-95` (or `active:scale-[0.98]` per the L4 button string) = the press-feedback; `-translate-y-1` on hover = the subtle raise; `rotate` for chevron/caret flips on `data-[state=open]:` (ties accordion/dropdown indicators back to data-state).
- `transform-gpu` named as the explicit compositing hint — note the browser usually promotes transforms automatically, so it's a rare manual reach, not a default.
- **The stacking-context watch-out (recall hook to ch020 L9, reinforced from L2/L3):** `transform` (like `filter`, `opacity`) creates a new stacking context. A scaled card with a tooltip/menu child can clip or mis-layer; the fix is a portal (forward ref to ch022 L5 portals) or `isolation: isolate`. State it as a known gotcha, not a deep dive.

Reasoning: deferring the transform enumeration until after the student has watched transforms animate (in the lab and the choreography diagram) means the utilities attach to motion they already understand, rather than arriving as a cold list. The stacking-context note is a required recall thread the chapter runs through every lesson — kept to a watch-out.

`Term` candidates: **stacking context** (recall from ch020 L9 / L2 / L3 — keep the definition consistent across the chapter).

---

### `prefers-reduced-motion`: motion you can turn off

**Goal:** the discipline-level guard. Frame as non-negotiable (the code convention says "No exceptions"), not an accessibility footnote.

Content:
- The user setting: OS-level "Reduce motion" (vestibular disorders, motion sensitivity, focus needs). The browser exposes it as `@media (prefers-reduced-motion: reduce)`; Tailwind's variant is `motion-reduce:`.
- **The reflex:** every animation noticeable above the fold gets a `motion-reduce:` escape — `motion-reduce:transition-none`, `motion-reduce:animate-none`, or a shortened/cross-fade alternative. The code convention's exact line: *`motion-reduce:` on every animation visible enough to notice. No exceptions.* Quote the spirit.
- The nuance that prevents over-application: reduced-motion ≠ *no* motion. Essential feedback (loading spinners signaling progress, focus rings) can stay; you opt out of **decorative** motion (parallax, large slides, attention bounces), not functional motion. Teach the judgment, not a blanket `* { animation: none }`.
- Who handles it for you: shadcn/Radix components ship sensible reduced-motion behavior already; the `motion-reduce:` discipline is the student's job on **bespoke** animations (the custom keyframe from Tier 2, the hover-lift from Tier 1). 
- There's also a `motion-safe:` variant (the inverse — apply only when motion is *allowed*); name it as the opt-in framing for animations you'd rather add than subtract.
- Cross-reference ch027 (accessibility baseline) as the discipline-level home; this lesson installs the reflex.

**Mini-check — consolidation exercises here or at lesson end:**
- `Buckets` (two columns): "Cheap to animate (compositor)" vs. "Expensive (layout/paint)" — items: `transform`, `opacity`, `width`, `height`, `top`, `background-color`, `scale`, `margin`. Reinforces the budget — the lesson's foundational rule.
- `MultipleChoice`: a scenario asking which is the correct dialog-exit approach (data-state + `animate-out` vs. unmount-on-close vs. JS timer) — reinforces the choreography seam.
- Optionally a second `MultipleChoice`: "which animation keeps running under `prefers-reduced-motion`?" → the loading spinner (functional), not the decorative bounce — reinforces the nuance.

Reasoning: reduced-motion is explicitly a chapter thread and a hard code-convention rule, so it earns its own section rather than a watch-out. The decorative-vs-functional nuance is the part beginners get wrong (they nuke all motion or ignore the setting entirely) — teaching the judgment is the senior move. Placing consolidation exercises at the end of the conceptual body lets the student self-check the two foundational ideas (budget + seam) before the recognition-only horizon.

`Term` candidates: **vestibular** (the inner-ear/balance system motion can disturb — one-line, justifies *why* the setting exists), **above the fold** (only if the audience needs it — likely a recall, judge at write time).

---

### Beyond CSS: when motion gets bigger (recognition only)

**Goal:** name the horizon so the student knows what exists without leaving the CSS lane. Keep brief — this is boundary-setting, not teaching.

Content:
- **View Transitions API** — the browser-level primitive for animating *between two states of the page*, including route changes. `document.startViewTransition(() => updateDOM())` snapshots before/after and cross-fades the difference. Next.js 16 integrates it behind `experimental.viewTransition: true` in `next.config.js`, paired with React 19.2's `<ViewTransition>` component (imported from `react`). **Fact-checked:** Chromium + Safari 18 support same-document transitions; Firefox is behind a flag as of early 2026 — verify support before relying on it. Recognition only here; a future app-router/animated-navigation lesson owns it if the project demands it. Frame the *decision*: reach for View Transitions when the animation spans a navigation or a large DOM swap that per-element CSS can't choreograph.
- **Framer Motion / Motion** — the React animation library. One sentence: it exists, it's powerful for spring physics and gesture-driven motion, and it's **overkill for the SaaS surface this course ships** — CSS + `tw-animate-css` covers the cases. Names the threshold so the student knows when (rarely) to cross it; not taught.
- Optionally an `ExternalResource`/`LinkCard` to the Next.js View Transitions guide and the `tw-animate-css` docs for the curious.

Reasoning: the chapter outline explicitly scopes View Transitions and JS libraries to recognition-only. Naming them (and *why they're out*) prevents the student from either reinventing them in CSS or reaching for Framer Motion by default. The Next.js 16 config detail is fact-checked and current. Decision-framing (when you'd cross the threshold) keeps it senior-minded rather than a bare "not covered" list.

---

### External resources (optional)

`ExternalResource` cards: the `tw-animate-css` docs/npm, the Tailwind v4 transitions/animation docs, the Next.js View Transitions guide. Per pedagogical structure, optional closing resources.

---

## Scope

**This lesson covers:** `transition-*` (property scope, `duration-*`, `ease-*`, `delay-*`) with the compositor budget as the governing rule; the distinction between transitions and keyframe animations; Tailwind's four built-in `animate-*` and authoring custom keyframes via `@keyframes` + `@theme` in `globals.css`; `tw-animate-css` (install, `animate-in`/`animate-out` + `fade`/`zoom`/`slide` modifiers, the shipped accordion/caret keyframes); the data-state choreography pattern for dialogs/sheets/accordions; the accordion height-animation gotcha and Radix's measured-custom-property workaround; the transform surface (`translate`/`scale`/`rotate`/`skew`) and the stacking-context gotcha; `prefers-reduced-motion` / `motion-reduce:` / `motion-safe:` as discipline; View Transitions API and Framer Motion as recognition-only.

**Out of scope — do not teach (defer or omit):**
- **React animation libraries at depth** (Framer Motion/Motion, React Spring) — recognition only; one sentence naming the threshold. CSS + `tw-animate-css` is the course's motion stack.
- **View Transitions API at depth** — recognition only here (Next.js 16 `experimental.viewTransition` + React `<ViewTransition>` named, not implemented). A future Unit 4 / app-router animated-navigation lesson owns it if the project demands it.
- **Scroll-driven animations** (`animation-timeline: scroll()`, `view()`) — niche; omit or one-line recognition at most.
- **SVG animation** (`<animate>`, SMIL), **Lottie/JSON-driven motion** — out of scope entirely.
- **`IntersectionObserver`-driven scroll reveals** — Unit 6 territory if it earns its weight; not here.
- **Page-load / FOUC mitigation** — ch018 L6 owns the dark-mode FOUC; not this lesson.

**Prerequisites to redefine concisely (taught elsewhere — recall, don't re-teach):**
- **Pseudo-class & variant triggers** (`hover:`, `active:`, `data-[state=...]:`, `group-*`/`peer-*`) — owned by ch018 L4 (variant grammar) and ch021 L4 (pseudo-class semantics). This lesson *uses* them as the things motion fires on; one-line recall of "the DOM already knows; the data-attribute is the mirror" links it to L4.
- **The L4 canonical button string** (`hover:bg-accent ... active:scale-[0.98] ...`) — reuse it; this lesson adds the `transition-*` that animates it. Stay consistent with L4's exact string.
- **Tailwind v4 CSS-first config** (`@theme`, `@import "tailwindcss"`, no `tailwind.config.ts`) — owned by ch018 L1/L2; recall when authoring keyframes in `@theme`.
- **Semantic tokens over primitives** — ch018 L5 / ch021 L2; app code uses tokens, exercises diverge to CDN literals (flagged).
- **Stacking context** — ch020 L9 (and reinforced in L2/L3); recall, keep the definition consistent.
- **`/N` alpha, `bg-card`, `shadow-*`, `ring-*`** — earlier ch021 lessons; the dialog/card examples lean on them without re-teaching.
- **Reflex framing & duration-band-as-discipline** — the "which utility on which surface" pattern (L1–L4) and the "one step per tier" elevation discipline (L3) are the templates the duration band mirrors.

---

## Notes for downstream agents

- **Live-render constraint:** `:hover`, `:active`, `data-state` open/close animations cannot render in a static panel. Anything demonstrating these must be a *live* `ReactCoding` (target-match) or a `DiagramSequence` — never a static screenshot claiming to show motion. (Same constraint L4 documented.)
- **Tailwind Play CDN limits (hard):** no custom `@theme` keyframes, no `tw-animate-css` import. Live exercises are restricted to built-in `animate-*`, `transition-*`, `hover/active:scale-*`, and CDN-resolvable colors. The choreography pattern and custom keyframes are taught via DiagramSequence + AnnotatedCode (static), with in-prose notes pointing at the real app-code shape.
- **Code as fragments:** `@keyframes`/`@theme` and the dialog className are shown as partial `globals.css` / component fragments (continues L2/L3 staging convention) — flag as intentional, not production-incomplete.
- **Fact-check flags baked in:** (1) `transition` in v4 is a curated property set, not literal `all` — state precisely. (2) `tw-animate-css` is current and replaces deprecated `tailwindcss-animate` — do not mention the old package except as "the deprecated predecessor." (3) `interpolate-size: allow-keywords` is **Chromium-only / NOT Baseline** as of early 2026 — must not be called Baseline. (4) Next.js 16 View Transitions = `experimental.viewTransition: true` + React `<ViewTransition>` from `react`; Firefox behind a flag.

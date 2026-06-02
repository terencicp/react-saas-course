# Breakpoints and the mobile-first reflex

- Title: Breakpoints and the mobile-first reflex
- Sidebar label: Breakpoints and mobile-first

## Lesson framing

This lesson installs the **viewport** half of responsive design: the media query as the primitive, Tailwind's mobile-first breakpoint scale as the form the student writes, and the senior reflexes that go with both. It is the second-to-last lesson of Chapter 021's visual-surface arc; lesson 7 cashes in the *container* half. The lesson must land a clean split so lesson 7 has a sharp boundary to build on: **media queries answer "how big is the viewport"; container queries answer "how big is this container."** This lesson ends by *posing* the container-query question, not answering it.

Pedagogical spine (single, load-bearing): **base styles are the smallest screen; `sm:`/`md:`/`lg:`/`xl:`/`2xl:` only ever *add* at wider widths.** Every other idea hangs off this. The student already wrote single-breakpoint layouts through all of Chapter 020 (flexbox, grid, sizing, gap, position) — this lesson is the moment those layouts learn to *respond*. The headline payoff: one card grid declaration, `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`, that was three CSS media-query blocks in legacy code. The student has already seen this exact line once — it is the **deliberate `md:`/`lg:` divergence flagged in Chapter 020 lesson 4's card-grid pattern** (Continuity notes call it out explicitly: "do not strip, the Ch021-syntax aside is intentional"). This lesson is where that aside gets paid off. Open by reaching back to it.

Target student: has programming experience, has spent a whole chapter on layout primitives at one width, has never thought about *which* width. Two things beginners get wrong in the real world, and the lesson is built to pre-empt both:
1. **Desktop-first muscle memory.** They design at 1440px in their head, then bolt on `max-md:` overrides to "fix mobile." The lesson must make mobile-first feel like the path of *less* code, not a moral imperative — the argument is mechanical (fewer overrides to discard, the cascade layers cleanly, mobile is the larger traffic share), never preachy.
2. **Device-named breakpoints.** They read `md` as "tablet" and `lg` as "desktop" and start reasoning about hardware. The senior reframe — **breakpoints are where the *layout* breaks, not where a device sits** — is the single most important mental-model correction in the lesson, because it's the one that ages well and the one that AI-generated boilerplate gets wrong.

Three secondary threads, each cashing in a debt from an earlier lesson rather than introducing net-new surface:
- The **`prefers-*` media-feature family** as one idea. `prefers-color-scheme` (L2 + ch018 L6), `prefers-reduced-motion` (L5), `prefers-contrast` / `forced-colors` (L2, named recognition-only) were all *used* via Tailwind variants but never unified as "these are all media queries the OS sets, your CSS reads." This lesson is their explicit home as a family. Keep it short — the student already has the reflexes; this is the connective tissue.
- **`@media (hover: hover)` and the touch-input reality** — explicitly deferred *to this lesson* from L4 (Continuity: "iOS sticky-hover + `@media (hover: hover)` → ch021 L6"). The correction that matters in 2026: Tailwind v4 already wraps `hover:` in `@media (hover: hover)`, so the old iOS *sticky*-hover bug is gone — but the consequence flips: **hover styles now simply do not fire on touch devices at all**, so a hover-only affordance is invisible to a phone user. The senior lesson is *design hover as enhancement*, not *worry about the sticky bug*.
- The **`hidden md:block` / `md:hidden` visibility pattern** vs. conditional rendering — cashes in ch020 L2's hide decision tree (the "is it even present?" question). CSS visibility-by-breakpoint keeps the node mounted (good for SEO/simple cases); conditional render unmounts it (good for a11y/perf/state). Land it as a decision, not a default.

Decision the lesson must *plant but not resolve*: viewport vs. container. Resolution is lesson 7. Here it is a closing teaser with one concrete motivating example (a card that looks wrong in a narrow sidebar even though the viewport is wide).

Interactivity strategy: the cause-and-effect of "drag the viewport, watch the layout reflow" is the thing the student must *feel*, and no static figure carries it. A custom **viewport-width simulator** is the centerpiece (a resizable preview frame that re-runs Tailwind breakpoints against a real card grid — the harness has no `PreviewFrame` with a width-drag handle yet, so this is a proposed lesson-specific component). The mobile-first-vs-desktop-first contrast is best taught with `CodeVariants` (same layout, two authoring directions). The visibility pattern and the hover-on-touch reality each get a small live `ReactCoding` or a focused figure. Consolidation is a `Buckets` (viewport-driven vs. container-driven decisions, pre-seeding lesson 7) plus a `StateMachineWalker`-free `MultipleChoice` pair.

Code-divergence inheritance (all flagged by prior lessons, keep consistent, do not "correct"): `ReactCoding` runs on the Tailwind Play CDN which **cannot ingest a custom `@theme` block** — so any custom-breakpoint demo (`--breakpoint-*`) is shown as a *static* `app/globals.css` fragment, never a live exercise; live exercises use only the default scale and CDN-resolvable literals. `ParamPlayground` previews use hard-coded accent colors (illustrations, not project code). Single-breakpoint examples were the Chapter 020 norm; this lesson is the first that is *meant* to be multi-breakpoint everywhere — that's the whole point, not a divergence.

## Lesson sections

### Introduction (no header)

Open on the concrete `md:`/`lg:` card grid the student already met in ch020 L4, and name the debt being paid: "you've written this line; now you'll understand what it compiles to and why it's written smallest-first." State the goal in one breath — by the end the student writes responsive layouts mobile-first without thinking, reads any `md:`/`lg:` chain as a stack of `min-width` rules, and knows when the answer is a viewport query vs. (teased) a container query. Keep it warm and short per the pedagogical structure. Preview the practical artifact: a card grid that goes 1→2→3 columns and a nav that goes column→row, both authored once.

Reasoning: the lesson's strongest hook is that the student has *already* used the syntax under protest of not understanding it. Leading with the familiar line collapses the "why am I learning this" gap instantly and honors "connect to what the learner already knows."

### Mobile-first: write the small screen, layer up

Teach the spine. The mental model: **unprefixed utilities apply at every width; a `md:` prefix means "from 768px up, *also* apply this."** Prefixes never subtract — they layer. Walk one element through it: `<div class="flex flex-col md:flex-row">` is column everywhere, and *additionally* row from `md` up. Hammer the watch-out the chapter outline flags: `md:flex-row` does not "unset" `flex-col` below `md`; below `md` there simply is no `md` rule, so the base wins. This is the single most common beginner confusion and deserves an explicit callout.

Then the *why*, framed mechanically so it never reads as preference (the pedagogical doc forbids preachy fundamentals):
- Fewer overrides: mobile-first writes the base once and adds; desktop-first writes the base then *discards* it at every smaller screen. Less CSS shipped, less to reason about.
- The cascade layers cleanly: `min-width` queries stack in source order, each adding on top. `max-width` (desktop-first) queries fight the base.
- Traffic reality: mobile is the larger share for most SaaS surfaces; the default should be the common case.

Name desktop-first as the *rare, legitimate* escape hatch (`max-md:` for the case where the small-screen rule genuinely is the override), not a forbidden pattern — seniors reach for it occasionally.

Components: a short `Code` block for the column→row element. Then **`CodeVariants`** (`syncKey="mobile-vs-desktop-first"`) — tab A "Mobile-first" authors `flex-col md:flex-row gap-4`, tab B "Desktop-first" authors `flex-row max-md:flex-col gap-4` to produce the *identical* rendered result; the prose in each tab makes the point that A adds and B subtracts, and B ships more overrides. Use `ins=`/`del=` framing isn't needed here; the one-paragraph-per-tab prose carries it. This is the right component because it's a true A/B of the *same* outcome authored two ways — exactly what `CodeVariants` is for.

`Term` candidates here: **mobile-first** (definition: author base styles for the narrowest viewport, add wider-screen rules with `min-width` breakpoints). Reuse the ch020 `Term` for **media query** if it reads naturally — but it's defined in ch020 L4, so a one-line refresh in prose is enough; don't over-tooltip.

Reasoning: mobile-first is the lesson's thesis and must come first so every later section is "now apply the reflex." The mechanical framing is deliberate — the student is an adult engineer; "fewer bytes, cleaner cascade" persuades where "best practice" doesn't.

### The Tailwind breakpoint scale and the media query underneath

Two moves in one section: name the scale, then reveal the primitive it compiles to.

The scale (state exact values — fact-checked Jun 2026): `sm` 40rem/640px, `md` 48rem/768px, `lg` 64rem/1024px, `xl` 80rem/1280px, `2xl` 96rem/1536px. Five steps, `2xl` is the largest default (no `3xl` in core). The reflex: **stay on the scale**; mirror the chapter's recurring "write off the scale" discipline (ch021 L1 typography, L3 elevation) — the same instinct, now for breakpoints. A project that needs a custom point edits `@theme` (`--breakpoint-md: 800px`, or add `--breakpoint-xs: 30rem`), it doesn't litter arbitrary `min-[823px]:` values.

The primitive: **every responsive prefix compiles to `@media (min-width: <breakpoint>) { ... }`.** Show the desugaring once so the model is concrete — `md:grid-cols-2` becomes `@media (min-width: 48rem) { .md\:grid-cols-2 { grid-template-columns: ... } }`. The student rarely writes raw media queries (Tailwind owns that), but recognizing the output is what lets them read third-party CSS and reason about cascade/source-order.

The `max-*` cousins and ranges: `max-md:` flips direction (a `max-width` query — applies *below* the breakpoint), the desktop-first tool from the previous section. Stacking `md:max-lg:` targets a single range (768–1023px) — name it as available, flag it as rare in production. Keep ranges to recognition; over-teaching them dilutes the mobile-first reflex.

Components: a compact **HTML+CSS phase-strip diagram** (per the diagrams index, "sequential phase strips" → plain HTML+CSS) inside a `<Figure>` — a horizontal ruler of the five breakpoints with their px/rem values, showing the mobile-first "adds from here →" direction with an arrow. Pedagogical goal: make "min-width, layering rightward" *visual* in one glance. Cap height per the diagrams constraint. Then an **`AnnotatedCode`** on the `md:grid-cols-2` → `@media` desugaring (two steps: highlight the Tailwind prefix, then the compiled media block) — `AnnotatedCode` is right because the focus must move between the utility and its compiled form on one block.

Optionally a `Dropdowns` micro-check (fenced block with `___` for the breakpoint values) if the section feels light — but the scale is reference, not a deep skill, so a single `MultipleChoice` later may cover it instead. Lean toward not adding a drill here.

`Term` candidates: **breakpoint** (the viewport width at which a responsive rule activates) — likely already defined ch020 L4; refresh in prose, tooltip only if it reads as new. `rem` is defined ch020 L5; do not re-tooltip.

Reasoning: naming the scale and revealing the `min-width` compilation together keeps the "Tailwind form + underlying primitive" pairing the pedagogical doc mandates ("underlying primitive named at the call site"). Putting `max-*`/ranges here (not in their own section) keeps them subordinate to the mobile-first default, which is the senior framing.

### Breakpoints are where the layout breaks, not where a device sits

The mental-model correction, given its own section because it's the idea that ages best and the one boilerplate gets wrong. The old advice was "phone / tablet / desktop" — three device buckets. The 2026 reframe: **a breakpoint is the width at which *this specific layout* stops working.** A two-card row breaks when a third card would be too cramped — that width is the breakpoint, whatever it is. `md` 768px is a *pragmatic default*, not "the tablet line."

Make the abstract concrete: a card grid where two cards stop fitting comfortably at ~640px gets `sm:grid-cols-2`; a different component whose content breaks at ~900px might justify a one-off custom `--breakpoint`. The *content* dictates the point. The watch-outs from the outline land here: `min-width: 768px` means "768px and up," nothing about hardware; don't name breakpoints for devices.

The senior workflow nudge (decisions-over-syntax): you find a breakpoint by *resizing the browser until the layout looks wrong*, then setting the breakpoint just before that — not by looking up a device's resolution. This is the natural lead-in to the centerpiece simulator.

Components: this section's teaching is best *felt*, so it flows directly into the **viewport-width simulator** (next section / same flow). A small static `Figure` could show the same card grid at three widths side by side with the breakpoint annotated where columns change — but prefer to spend the interactivity budget on the live simulator rather than a static triptych. If a still is wanted, an HTML+CSS three-up at 375 / 768 / 1280 with a caption "the break is where the cards cramp, not where a phone ends."

Reasoning: this is the lesson's highest-leverage *mindset* shift and earns a dedicated header per the rule that sections are content-driven. It must precede the simulator so the student manipulates the simulator already knowing "I'm hunting for the break."

### Feel it: dragging the viewport (centerpiece)

The interactive heart of the lesson. The student drags a viewport width and watches a real Tailwind-styled card grid reflow 1→2→3 columns and a nav reflow column→row, with the active breakpoint and the live width surfaced.

Proposed custom component — **`ViewportSimulator`** at `src/components/lessons/021/6/ViewportSimulator.astro` (the harness has no width-draggable `PreviewFrame`; `ParamPlayground` can drive a width via a slider but cannot re-run real Tailwind responsive variants inside its preview, since those need the actual viewport — so this needs a bespoke build):
- **UI:** a bordered preview pane whose *inner* width is controlled by a slider (or drag handle) labeled in px, from ~320 to ~1440. Inside the pane: a small card grid using real responsive classes and a nav bar. A readout strip shows the current width and which named breakpoint is active (`base` / `sm` / `md` / `lg` / `xl` / `2xl`), and ideally echoes the line responsible (`grid-cols-1 md:grid-cols-2 lg:grid-cols-3`).
- **Mechanics (the load-bearing constraint downstream agents must solve):** Tailwind's `md:` variants key off the *real* viewport, not a container's width. To make breakpoints fire against the *simulated* width, the component must either (a) render the demo content inside an `<iframe>` whose actual width is the slider value (cleanest — the iframe *is* a real viewport, so real `md:` classes fire correctly), or (b) re-implement the breakpoint logic in JS and swap classes manually. Prefer the **iframe approach** — it keeps the demo using genuine Tailwind responsive utilities, which is the whole pedagogical point; document this choice in the component. Flag clearly: this is *not* a container query (the iframe has its own viewport); the distinction is exactly what lesson 7 will exploit.
- **Goal:** the student *sees* columns snap at 640/768/1024 and connects "I crossed a breakpoint" to "a new `min-width` rule activated." The width readout makes the abstract scale tangible.

Reasoning: the pedagogical doc and the `ParamPlayground` doc both flag live cause-and-effect as the biggest expressiveness win; "responsive reflow" is the canonical case where a static figure freezes the exact thing the student needs to scrub. The iframe-real-viewport mechanic is non-obvious and must be specified so the builder doesn't ship a fake (JS-class-swap) that contradicts lesson 7's container-query distinction.

If the bespoke component is out of scope for the build, the documented fallback is a `DiagramSequence` with discrete steps at 375 / 640 / 768 / 1024 / 1280 showing the grid at each (real CSS frames, mirroring ch020's `*Layout.astro` step-frame pattern) — less ideal because the student can't scrub continuously, but acceptable. State this fallback explicitly for the builder.

### The responsive utilities you reach for daily

The practical vocabulary, framed as a *pattern* not a list. The senior pattern: **change the layout primitive at the breakpoint, then scale the visual values inside.** Two tiers:
- **Layout switches:** `md:flex`, `md:grid-cols-2`, `flex-col md:flex-row` (the column-on-mobile, row-on-desktop workhorse), `md:items-center`. These change *structure*.
- **Value scaling:** `text-base md:text-lg` (typography grows), `p-4 md:p-8` and `gap-4 md:gap-8` (denser on mobile, looser on desktop). These tune *within* the chosen structure.

Show the canonical responsive card/nav: base is a stacked column with tight spacing; at `md` it becomes a row with looser spacing and larger text. One worked example that combines both tiers in one component is worth more than six isolated utilities.

The watch-out from the outline: responsive prefixes **stack with state prefixes** — `md:hover:bg-accent` is valid (hover, but only from `md` up). Order matters in v4 (variant order follows source order in compiled CSS); name it, don't dwell. Cross-reference L4 for the pseudo-classes and L5 for the transition that often rides along.

Components: an **`AnnotatedCode`** walking the responsive card className in 3–4 steps (base layout → `md:` structure switch → `md:` value scaling → the combined result), because the focus must move across several parts of one className string — `AnnotatedCode`'s exact job. Then a **live `ReactCoding` target-match** (`live`, `target` set): student is given a stacked card and must add `md:` utilities to match a target that's row-on-desktop with looser spacing. Target-match (not tests) because the win is *visual reflow*; the student resizes the preview pane to verify both states. Use CDN-resolvable literals only (`bg-white`, `border-slate-200`, etc.) per the inherited divergence; in-prose note flags that app code uses semantic tokens (`bg-card border-border`).

`Term` candidates: none new — all utilities lean on ch020 vocab (`flex`, `grid-cols`, `gap`, `items`) already defined.

Reasoning: the "switch the primitive, then scale the values" framing is the durable skill; a flat utility list isn't. The `ReactCoding` is target-match because responsive correctness is something you *see* by resizing, and brittle pixel/width tests would fight the harness.

### Hover, focus, and the rest: the prefers-* and input-device queries

Collect the *non-width* media features as one family, because they're all "the OS/device sets a signal, your CSS reads it" — the same shape as `min-width`, different axis. Two groups.

**The `prefers-*` family (cashing in earlier debts, keep brief).** These were each used via a Tailwind variant already; here they're unified:
- `prefers-color-scheme: dark` → the `dark:` variant + `next-themes` (ch018 L6, L2). The nuance the outline flags and the student must retain: `prefers-color-scheme` is the *OS* preference; the `.dark` class is the *site* preference; `next-themes` resolves precedence (site wins). One sentence, it's already taught.
- `prefers-reduced-motion: reduce` → the `motion-reduce:` variant (L5). Named as a member of the family.
- `prefers-contrast: more` → `contrast-more:` and `forced-colors: active` → `forced-colors:` (Windows High Contrast Mode) — recognition-only, as L2 left them. The point is "these exist and are media queries," not how to override them.

Frame the takeaway: **the same `@media` machinery that powers `md:` also powers every accessibility/preference variant** — one primitive, many feature axes. This connective-tissue framing is the section's reason to exist.

**The input-device queries — the touch reality (the L4 debt, the meatier half).** `@media (hover: hover)` and `@media (pointer: fine)` ask "can this device hover / is the pointer precise." The 2026 correction that must be stated precisely (fact-checked Jun 2026): **Tailwind v4 already wraps the `hover:` variant in `@media (hover: hover)` by default.** Consequences:
- The old iOS *sticky-hover bug* (tap fires `:hover`, style sticks until the next tap) is **gone** for Tailwind `hover:` — the variant simply doesn't apply on touch.
- But the flip side now bites: **a hover-only affordance is invisible on touch.** If the *only* way to discover an action is hovering, phone users never find it. The senior reflex: **design hover as an enhancement on top of an always-visible affordance, never as the sole entry point.** (e.g., a card's "edit" button that only appears on hover must also be reachable on touch — show it always on small screens, or make it a persistent control.)
- Raw hand-written CSS does *not* get this gating for free — only if the author wraps `:hover` in `@media (hover: hover)` themselves. Tailwind users get it automatically; this is one more reason to write the variant, not raw CSS.
- `pointer: fine` (mouse, precise) vs. `pointer: coarse` (touch, imprecise) — recognition; the reach is "don't put 16px click targets behind a coarse pointer." Name, don't drill.

**`@media print`** — the `print:` variant. Recognition + one reach: most SaaS apps don't ship a print stylesheet, but invoices/reports do (`print:hidden` on nav, `print:block` on collapsed detail, force black-on-white). One paragraph, no exercise.

**`orientation: landscape/portrait`** — one sentence, recognition-only; `min-width` captures the same intent more reliably.

Components: an **`AnnotatedCode`** or small `Code` showing `hover:opacity-100` on a normally-`opacity-0` action button *and* the always-visible fallback for touch, so the "enhancement not sole entry point" rule is concrete. Optionally a tiny `MultipleChoice`: "A button only appears on `hover:` — what happens on a phone?" (answer: it's never visible; provide an always-on affordance). The `prefers-*` family is prose + cross-references; no exercise — the reflexes are already built in L2/L5.

`Term` candidates: **`prefers-color-scheme`** isn't needed as a tooltip (taught at length L2). Define **`@media (hover: hover)`** inline in prose rather than a `Term` (it's the section's subject, not an aside). Consider a `Term` for **Windows High Contrast Mode / `forced-colors`** if the acronym HCM appears — a good non-obvious-term candidate.

Reasoning: bundling all non-width media features here is correct because the *unifying idea* is the lesson content ("same primitive, different axis"), which satisfies the "no section unified only by being watch-outs" rule — this section teaches a concept (media features beyond width), with the touch reality as its substantive core. The hover-on-touch correction is the lesson's most important *production* gotcha and is explicitly this lesson's to own (deferred from L4).

### Showing and hiding by breakpoint

The `hidden md:block` / `md:hidden` pattern and its decision against conditional rendering. Cashes in ch020 L2's hide decision tree.

The two canonical forms:
- `hidden md:block` — hidden on mobile, shown from `md` up (the "desktop-only" element, e.g. a sidebar).
- `md:hidden` — shown on mobile, hidden from `md` up (the "mobile-only" element, e.g. a hamburger trigger).

The decision the outline flags — **CSS visibility-by-breakpoint vs. React conditional rendering:**
- `hidden md:block` keeps the node **in the DOM** at all widths; CSS just toggles `display`. The element renders on the server, is in the markup, costs nothing to toggle. Right for simple show/hide where the hidden content is cheap and harmless.
- Conditional rendering (`isDesktop && <Sidebar/>`) **unmounts** the node — it leaves the DOM and the a11y tree entirely, and tears down its state (the ch020 L2 frame: "is it even present?"). Right when the off-screen content should *not* exist for assistive tech, or is expensive, or must reset state.
- The trap: shipping *both* a `md:hidden` mobile nav and a `hidden md:block` desktop nav means both are in the DOM and a screen reader may announce duplicated navigation — a real a11y cost. Name it; the fix (one nav, or conditional render) lives in the project chapter (ch028 L8 mobile nav).

Components: a **`CodeVariants`** (`syncKey="hide-by-breakpoint"`) — tab A "CSS visibility" (`hidden md:block`) vs. tab B "Conditional render" (`useMediaQuery`-gated, named not implemented), each tab's prose stating what stays in the DOM. This is the right component: two authoring approaches to the same intent, with the tradeoff in the prose. A `Buckets` could sort scenarios (cheap static element / expensive widget / must-reset-state / SEO-critical) into "CSS hide" vs "conditional render" — strong consolidation candidate, place it here or fold into the closing `Buckets`.

`Term` candidates: **accessibility tree** is defined ch020 L2 — refresh in prose, don't re-tooltip.

Reasoning: this is a genuine senior *decision* (the pedagogical doc's "decisions before syntax"), not just two utilities. Framing it against the ch020 L2 decision tree makes it a continuation, not a new topic. The duplicated-nav a11y trap is the concrete production stake.

### When the viewport is the wrong question (the container-query teaser)

Close by *planting* the lesson-7 boundary without resolving it. The motivating example (straight from the outline): a `<ProductCard>` looks right in the wide main feed but cramped in a narrow sidebar — yet **both share the same viewport.** A `md:` query can't tell the card which context it's in, because the viewport is identical in both. So the card needs to respond to *its own width*, not the screen's.

State the decision rule cleanly (this is the line lesson 7 builds on):
- **Page-level structure** (mobile nav vs. desktop nav, one-column vs. two-column page shell) → **viewport queries** (`md:`). This lesson.
- **Component-level adaptation** (a card that adapts to its slot, a sidebar widget that collapses based on its parent) → **container queries** (`@md:`). Next lesson.
- Most real SaaS UIs use both: the page shell is viewport-driven, the components inside are container-driven.

Do **not** teach `@container`, `container-type`, or `cqi` here — name the term, point forward, stop. The outline is explicit: container queries are lesson 7's to own.

The viewport meta tag — one-line cross-reference (ch017 L2): `<meta name="viewport" content="width=device-width, initial-scale=1">` is what makes mobile-first behave at all; Next.js ships it via the metadata API; the student *recognizes* it, doesn't write it. One sentence, no depth.

Components: a small **HTML+CSS `Figure`** or `ArrowDiagram` showing the same card in two slots (wide feed / narrow sidebar) under one viewport, with a "?" over the card — pedagogical goal: make the "viewport can't disambiguate" problem visceral in one image, setting up lesson 7's payoff. Then a **`Buckets`** consolidation: sort scenarios into "viewport query (`md:`)" vs "container query (`@md:`)" — e.g., "mobile hamburger menu" / "two-column page shell" → viewport; "card that's vertical in a sidebar, horizontal in the feed" / "widget that collapses with its panel" → container. This `Buckets` does double duty: it consolidates *this* lesson's viewport reflex and pre-seeds lesson 7's container intuition, which is exactly the bridge the chapter wants.

Close with a one-line tease ("Next: how a component responds to its own size, not the screen's") mirroring the chapter's lesson-to-lesson teaser convention (L1→L2, L3→L4, etc.).

Reasoning: ending on the unresolved viewport-vs-container question is mandated by the chapter framing (this lesson "lands the decision; lesson 7 cashes in container queries"). Posing it with a concrete broken example is far stickier than an abstract statement, and the `Buckets` turns the teaser into an active check.

### External resources (optional)

One or two `ExternalResource` cards: MDN "Using media queries" (the primitive) and the Tailwind "Responsive design" docs page (the form). Optional `VideoCallout` — only if a short, current (≤6 min) mobile-first explainer is found during fact-check; do not pad with a long video. The chapter has leaned on Kevin Powell videos in ch020; a Powell responsive/mobile-first clip would fit the established voice if one is current.

## Scope

**This lesson teaches:** mobile-first as the default authoring direction; the Tailwind breakpoint scale (`sm`–`2xl`, exact values) and its `@media (min-width)` compilation; `max-*` and ranged variants as the desktop-first/range escape hatches (recognition); breakpoints as content-driven not device-driven; the `prefers-*` media-feature family as a unified idea (recognition-depth, cashing in L2/L5); `@media (hover: hover)` / `pointer` input-device queries and the touch-hover reality (the substantive half — Tailwind v4 gates `hover:` by default, hover is enhancement-only on touch); `@media print` and `orientation` (recognition); the `hidden md:block` / `md:hidden` visibility pattern and its decision against conditional rendering; the viewport-vs-container decision *as a posed question* with the decision rule stated.

**This lesson does NOT teach (reserve for elsewhere):**
- **Container queries** — `@container`, `container-type: inline-size`, `@sm:`/`@md:` container variants, `cqi`/`cqb` units, named containers, `clamp()` fluid component typography. All lesson 7. Here: named and teased only.
- **The viewport meta tag** at any depth — ch017 L2 owns it; one-line recognition cross-reference only.
- **Viewport unit details** (`vh`/`dvh`/`svh`/`lvh`) — ch020 L5; do not re-teach. May be *used* in an example (`min-h-dvh`) but reference the L5 definition.
- **`next/image` and responsive images** (`<picture>`, `srcset`, art direction) — ch017 L6 / Next.js Image territory. Out of scope.
- **Mobile navigation patterns** (drawer, slide-out, hamburger implementation) — ch028 L8 (project chapter). Here the *visibility utilities* are taught; the *nav component* is not.
- **`useMediaQuery` / JS-side breakpoint detection** implementation — named in the conditional-render contrast, not implemented. CSS is the default; JS gating is the exception.
- **Server-side device detection** (`User-Agent` sniffing) — out of scope; CSS handles responsiveness.
- **Adaptive-vs-responsive design philosophy** — out of scope; the chapter is opinionated on responsive.
- **`dark:` / `next-themes` wiring**, **`motion-reduce:` authoring**, **WCAG contrast** at depth — owned by L2 / L5 / ch027 respectively; this lesson only *collects* `prefers-*` as a family and cross-references.

**Prerequisites to refresh concisely (do not re-teach):** Tailwind utility + variant syntax and `cn()` (ch018 L1); `@theme` and the `--*` token namespaces (ch018 L2); **media query** and **breakpoint** as terms + the `md:`/`lg:` card-grid line (ch020 L4 — the explicit hook to reopen); the box-model/flex/grid/gap layout vocabulary the responsive examples restyle (ch020 throughout); the hide decision tree and **accessibility tree** (ch020 L2); the `dark:` / `motion-reduce:` / `contrast-more:` / `forced-colors:` variants as already-met tools (L2, L5); `:hover` as a pseudo-class and the one-line "does nothing on touch" aside (L4 — this lesson pays it off).

## Notes for downstream agents

- **Keep the viewport/container line sharp.** Everything in this lesson is viewport-driven; container queries are named and teased exactly once (the closing section). Do not let `@container`/`cqi`/`container-type` leak in — lesson 7 owns them and needs the clean boundary.
- **Reopen the ch020 L4 hook in the intro.** The `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` line is the deliberate forward-divergence ch020 L4 planted for this lesson; the intro should explicitly cash it in.
- **The hover-on-touch correction is load-bearing and current** (fact-checked Jun 2026): Tailwind v4 wraps `hover:` in `@media (hover: hover)` *by default* — frame it as "the sticky-hover bug is gone, but hover is now enhancement-only on touch," not as "watch out for the sticky bug." This is the inverse of pre-v4 advice; do not regress.
- **Breakpoint values are exact** (Jun 2026): `sm` 40rem/640, `md` 48rem/768, `lg` 64rem/1024, `xl` 80rem/1280, `2xl` 96rem/1536; `2xl` is the largest core step.
- **`ViewportSimulator` must use a real-viewport iframe** (or equivalent) so genuine Tailwind `md:` classes fire against the simulated width — a JS-class-swap fake would contradict lesson 7's container-query distinction. Documented `DiagramSequence` step-frame fallback if the bespoke component is descoped.
- **Inherited code divergences (do not "correct"):** `ReactCoding` uses CDN-resolvable literals, not `@theme` semantic tokens (Play CDN can't ingest `@theme`); custom `--breakpoint-*` shown only as static `app/globals.css` fragments; `ParamPlayground`/illustration accents are hard-coded, not token-routed. Flag the app-code semantic equivalent in prose each time.
- **This lesson is multi-breakpoint by design** — the Chapter 020 single-breakpoint convention ends here; that's the point, not a divergence to note.

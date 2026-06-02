# What flows down the DOM tree

- **Title (h1):** What flows down the DOM tree
- **Sidebar label:** CSS inheritance

---

## Lesson framing

**What this lesson owns.** CSS inheritance: the second of the four cascade behaviors (L1 owned origin/layer/specificity/source-order; this lesson owns "what happens when *no* rule applies to an element"). The senior payoff is a placement rule the student will apply every day on a Tailwind project: **typography and color go on `<body>` (they inherit); box-model and layout go per element (they don't).** That single rule is the lesson's destination — everything else exists to justify and de-risk it.

**The mental model to install.** Inheritance is a *per-property* flag baked into the CSS spec, not a global behavior. For each property, the spec says "inherited: yes" or "inherited: no." When the cascade (L1) leaves an element with no declared value for a property, the browser substitutes either the parent's *computed* value (inheriting properties) or the property's spec-defined *initial* value (non-inheriting). So inheritance flows down the **DOM tree** (parent → child rendered elements), which on a React app is *not* the JSX component tree — a styling decision lives on the DOM node, and a child component's root element is the DOM child. Name this distinction once, early; it's the thing seniors-in-training get wrong when they expect a prop or a wrapper component to "pass styles down."

**Why this matters for Tailwind specifically (the senior frame).** Tailwind is an atomic-utility system: one class, one declaration, on one element. That fits the cascade's non-inheriting half perfectly (box-model/layout are per-element anyway) and *relies* on the inheriting half for the rest (you set `font-sans text-foreground` once on `<body>` and never repeat it on every `<p>`). Inheritance is the reason the utility list on a leaf element is short. Frame the whole lesson as: *understanding inheritance is what lets you know which utilities to hoist to an ancestor and which to keep local* — a real architecture decision, not trivia.

**Cognitive-load staging.** Build in this order: (1) one-sentence definition + the parent-computed-value mechanic; (2) the two families (inherits / doesn't) taught as a *classification* the student can predict, not a list to memorize — with a heuristic ("text-ish inherits, box-ish doesn't"); (3) the DOM-tree-not-JSX-tree caveat; (4) the override keywords as recognition-only (the student writes the utility form, not the raw keyword); (5) form elements as the famous exception, which both pays off L1's deferred opening-bug debt and front-loads L3 (Preflight); (6) `currentColor` as the one inheritance-powered pattern they'll write by hand; (7) the synthesis placement rule + the gotchas that look like inheritance but aren't (opacity, visibility, transparent backgrounds, `em` compounding).

**Debt repayment & handoffs.** Continuity notes (L1) flagged that the opening heading bug's *full* resolution defers to L3, and that "what flows down when no rule applies" is *this* lesson. So: this lesson explains *why* a bare `<button>` ignores `body` text styles (user-agent stylesheet sets `font-family`/`color` directly on the control, defeating inheritance), and explicitly hands the *fix* (`font: inherit`) to L3 as Preflight's job — name it, show it's coming, don't re-teach Preflight here. Custom-property inheritance is named and motivated (it's *why* a `.dark` swap on `<html>` reaches everything) but the token model is L4 — cross-ref, don't open it.

**Reading instrument.** Keep L1's DevTools thread alive but shift the target: the Computed panel's "Inherited from `<ancestor>`" attribution and the Styles panel's `Inherited from <selector>` sections. The three-click move from L1 becomes: Computed → find the property → read which ancestor it inherited from. One short DevTools section, recognition-level.

**Tone/format.** Adult, terse, decision-first per the guidelines. Heavy on one interactive widget (the inheritance playground) and one classification exercise (Buckets) because "which family does this property belong to" is exactly the recall this lesson must build. Code samples are Tailwind/JSX-shaped (the form the student writes), with the underlying CSS named at the call site. Lesson components, if any custom SVG/HTML is built, live at `src/components/lessons/019/2/`.

---

## Lesson sections

### Introduction (no header)

Open with the concrete surprise that motivates the whole lesson and repays L1's debt. Show a tiny root layout: `<body className="font-sans text-foreground">` wrapping a paragraph and a `<button>`. The paragraph picks up the font and color; the `<button>` renders in the browser's default font and (often) blue/black text — it *ignores* the body. State the senior question implicitly: *which styles flow down to descendants automatically, and why does this one element opt out?* Promise the payoff: by the end, a rule for where every utility belongs (ancestor vs. element), and the reason form controls are special. Keep it to a few sentences; do not yet explain the fix — name that the button case returns later.

Use a small **`Code`** block (TSX) for the layout snippet. Do not over-annotate; the surprise is the point, not the syntax.

### Inheritance is a per-property flag

Teach the core mechanic in the smallest correct form, then stop.

- **One-sentence definition:** inheritance is a property-by-property rule defined in the CSS spec. Some properties inherit, some don't; it's not a global on/off.
- **The substitution mechanic (the load-bearing sentence):** when the cascade leaves an element with no value for a property, the browser fills it in — for an *inheriting* property it copies the **parent's computed value**; for a *non-inheriting* property it uses the property's **initial value** from the spec. Stress "computed value of the parent," not "the value you wrote on the parent" — set the seed for the `em`-compounding gotcha later.
- **The reach:** a property set on `<html>` or `<body>` reaches *every* descendant unless some rule overrides it on the way down. This is why `font-sans` on `<body>` is enough.
- **DOM tree, not JSX tree (call out explicitly, one short paragraph):** inheritance walks the rendered DOM parent→child. In React, the JSX component nesting is not the DOM nesting — a `<Card>` component contributes whatever DOM element it renders at its root, and *that* node is the DOM child. You don't "pass styles via props"; you set them on an ancestor DOM node and they flow to descendant DOM nodes. This pre-empts the most common beginner mistake. Keep it crisp; no deep React-tree digression (that's owned elsewhere).

**Component use:** a single **`AnnotatedCode`** is overkill here — prefer plain prose with one inline **`Code`** illustration (a `<html>`/`<body>`/`<p>` skeleton) showing the value "falling" from body to paragraph. Optionally a small **`<Figure>` + hand-coded SVG or HTML/CSS** "drip" diagram: a vertical DOM chain (`html → body → main → p`) with a `color`/`font` value cascading down on the left rail and a `width`/`padding` value visibly *not* descending on the right rail. Pedagogical goal: make "per-property, flows down the DOM chain" visible in one glance, and plant the two-families split before it's named. Keep height compact (horizontal-ish, short). If the SVG cost is high, defer to the next section's interactive widget which carries the same idea live.

**Tooltips (`Term`):** `computed value` (the final resolved value the browser actually uses for an element, after the cascade and relative-unit resolution); `initial value` (the property's spec-defined default, used when nothing else supplies a value); `user-agent stylesheet` (the browser's built-in default CSS — define here since the button section leans on it).

### What inherits, and what doesn't

This is the spine of the lesson. Teach it as a *predictable classification with a heuristic*, not two lists to memorize. The student should leave able to guess correctly for a property they've never seen.

- **The heuristic first:** "If it describes **text**, it inherits. If it describes the **box** — its size, position, background, or visual effects — it doesn't." Give the *why*: text styling is something you almost always want to flow to a whole subtree (set the font once); box geometry is intrinsically per-element (no two elements share the same width by accident). Framing the rule as *designed*, not arbitrary, is what makes it stick and is the senior-mindset move.
- **Inherits (by family):** typography — `color`, the full `font-*` set, `line-height`, `letter-spacing`, `word-spacing`, `text-align`, `text-indent`, `text-transform`, `white-space`, `direction`; lists — `list-style*`; `cursor`; `visibility`; and **CSS custom properties** (`--*`). Senior takeaway: *text styles flow from `<body>`; tokens flow from `:root`.*
- **Custom properties inherit — flag it and motivate, don't open it:** the reason a `.dark { --color-foreground: … }` override on `<html>` reaches every component is that custom properties are inheriting. One sentence, then cross-ref L4 for the token model. This is a deliberate hook, not a digression.
- **Doesn't inherit (by family):** box-model — `padding`, `margin`, `border`, `width`/`height`, `min/max-*`; layout — `display`, `position`, `top/right/bottom/left`, `z-index`, `flex`, `grid`, `gap`; background — `background-color`, `background-image`; visual effects — `box-shadow`, `opacity`, `transform`, `filter`. The reach: these are **always per-element** — which is exactly the atomic-utility fit.
- **The Tailwind payoff (state it here, reinforce in synthesis):** the inheriting half is why typography utilities hoisted to `<body>` cover the whole app; the non-inheriting half is why box/layout utilities are written on each element and Tailwind never tries to "cascade" them.

**Diagram — `Buckets` or `TabbedContent` two-column figure:** present the families side by side. A simple **two-column `Figure` (HTML/CSS color-coded)** — "Inherits (text-ish)" vs. "Doesn't (box-ish)" — with the heuristic as the column captions. Goal: one visual the student can photograph mentally. (This figure and the Buckets exercise below are complementary: figure teaches, exercise tests — don't collapse them.)

**Exercise — `Buckets` (load-bearing):** two buckets, "Inherits" / "Doesn't inherit." ~8–10 `Item` chips of CSS properties drawn from both families, including at least one deliberate near-miss that tests the heuristic rather than rote memory (e.g. `cursor` and `visibility` inherit but *feel* box-ish; `text-shadow` is a visual effect and does **not** inherit despite being text-adjacent — good discriminators). Use `instructions` to frame it as "predict using the text-vs-box heuristic." Grading is the built-in green/red. This is the primary check that the classification landed.

**Tooltips (`Term`):** none new strictly required; `text-shadow` non-inheritance can be a one-line aside or `PredictWhy`-style note rather than a Term.

### Try it: change a parent, watch the children

An interactive widget where the student *manipulates the parent* and watches inheritance happen (and not happen) live. This is the single highest-value teaching moment — inheritance is a behavior you understand by *feeling* the flow, which a static figure can't deliver.

**Component — `ParamPlayground`** (self-contained figure; do **not** wrap in `<Figure>`). Mechanics:

- The `<Preview>` is a small DOM subtree: a parent box containing two or three nested children (e.g. a heading + a paragraph + a nested `<span>`), styled so the parent reads the params.
- **Params (controls):** `color` (kind `color`, default a foreground tone) → applied to the *parent* as `color: var(--color)`; `fontSize` (slider, `suffix="px"`, e.g. 12–28) → parent `font-size`; a `select` for `font-family` (sans / serif / mono). These are all **inheriting** — the student watches every child change when the parent changes.
- **The contrast control (the "aha"):** add a `padding` slider (`suffix="px"`) applied to the *parent*, and visually show that the **children do not gain padding** — only the parent's box grows. This is the non-inheriting demonstration in the same widget. Optionally a `border` slider on the parent for the same effect.
- **`Readout` chips:** echo the current `color`/`fontSize` so the student ties the control to the value. Optionally a chip noting "children inherit: yes" vs "children inherit padding: no" is better expressed as preview labels than a computed `expr`.

Pedagogical goal: collapse the entire "what inherits" section into a manipulable artifact. The student drags font-size up and *every* text node grows; drags padding up and *only the parent* moves. The dissociation is the lesson. Caption states the takeaway: typography flows to children, box-model stays put.

Place this immediately after the families section so the student validates the classification kinesthetically right after learning it (and before the Buckets test, or right after — author's call; recommend figure → playground → Buckets so the test comes last).

### Telling a property to inherit on purpose: the four keywords

Recognition-level only. The student rarely writes these raw in a 2026 Tailwind codebase; name them so they're recognized in others' CSS and in DevTools, and point to the utility form they *will* write.

- **The four (plus one) global keywords:** `inherit` (force the parent's computed value), `initial` (force the spec initial value), `unset` (inherit if the property is inheriting, else initial — "do the default thing"), `revert` (roll back to the user-agent/user stylesheet value, *keeping* the browser default rather than the spec initial), and a one-line mention of `revert-layer` (roll back to the previous cascade layer — ties to L1's layer model). Keep `revert` vs `initial` distinction to one crisp sentence: `initial` wipes to the spec default (often *not* what the browser shows); `revert` returns to what the browser would have shown.
- **The Tailwind reality (the senior frame):** you write the *utility* form. `text-inherit` (→ `color: inherit`), `bg-transparent`, `border-transparent`, and the rare `[all:revert]` arbitrary value cover essentially every case. The raw keyword in a hand-written rule is a yellow flag worth a second look — usually a sign someone is fighting a cascade they should have organized (callback to L1's "layer, not bang").

**Component:** a single **`CodeTooltips`** block is ideal — show a 4–5 line CSS snippet using each keyword once, with each keyword as a tooltip key giving its one-line meaning. Avoids breaking prose to define four terms. Then a one-line **`Code`** (TSX) showing the Tailwind utility equivalents (`text-inherit`, `bg-transparent`) so the student sees the form they'll actually type. Do **not** build an exercise here — recognition-only depth doesn't warrant graded practice; budget the exercise spend on the families (Buckets) and the form-element prediction below.

### Why form controls don't listen: the inheritance rebels

The famous exception, and the repayment of the opening hook. This section both explains the surprise and front-loads L3.

- **The mechanism:** `<button>`, `<input>`, `<textarea>`, `<select>` carry **user-agent stylesheet rules that set `font-family` and `color` directly on the control.** Because there's now a *declared* value on the element itself, the cascade never falls through to inheritance — a directly-set value always beats an inherited one (an inherited value is the *absence* of a declaration, the weakest possible source). So body typography never reaches them. This is not a bug in inheritance; it's inheritance working exactly as specified — the control simply isn't relying on it.
- **Why browsers do this:** historically form controls were OS-native widgets; the UA stylesheet pins their typography so they look like controls. Name it in one sentence — the *why* matters for the senior framing (it's a deliberate platform decision, like Preflight).
- **The fix is Preflight's job (hand off, don't teach):** Tailwind's Preflight ships exactly one rule that defeats this — `button, input, select, optgroup, textarea { font: inherit; color: inherit; … }` — re-opting the controls into inheritance so your `<body>` font reaches them. Name that the *next lesson* (L3) owns Preflight in full; here, just show that the fix exists and *is* re-enabling inheritance. This closes the opening loop and motivates L3 cleanly.
- **The senior takeaway:** on a real Tailwind project you don't fight Preflight on form controls and you don't hand-set their fonts — Preflight already inherited them, and shadcn's `<Button>`/`<Input>` wrap them (cross-ref Ch027, recognition only). The rare browser-specific holdout gets a per-element utility.

**Component — `CodeVariants`** (before/after, the natural fit): Tab 1 "Without Preflight" shows the bare `<button>` rendering in UA font (with a one-line note: UA stylesheet set `font-family` on it, so inheritance never fired); Tab 2 "With Preflight" shows the `font: inherit; color: inherit` rule and the button now matching body text. Each tab's prose explains the variant. This visually completes the opening hook. Keep the CSS minimal and labeled as Preflight's, with the explicit "full treatment in the next lesson" pointer.

**Exercise — `PredictOutput` is wrong here (no stdout); use a short `ReactCoding` target-match or a `MultipleChoice`.** Recommended: a **`MultipleChoice`** that tests the *mechanism* (not memorization): "A `<button>` inside `<body className='text-red-500'>` renders with black text. Why?" with distractors covering common misconceptions (specificity, `!important`, Tailwind not applying) and the correct answer naming the UA-stylesheet declared value defeating inheritance. This checks the conceptual core. (Skip a coding exercise here — the fix belongs to L3; testing the *concept* is the right depth.)

**Tooltips (`Term`):** reuse `user-agent stylesheet` if not already shown; otherwise none new.

### currentColor: the one inheritance trick you'll write by hand

The single inheritance-powered pattern the student authors directly. Worth its own short section because it's a daily reflex for icons.

- **What it is:** `currentColor` is a CSS keyword that resolves to the **computed value of `color`** on the element. Because `color` inherits, `currentColor` effectively lets *any* property piggyback on the inherited text color.
- **The canonical use — SVG icons:** an inline SVG with `fill="currentColor"` (or `stroke="currentColor"`) takes the text color of wherever it's placed. Drop a Lucide/Heroicons icon next to text and it matches automatically; set `text-blue-500` on a button and both the label and the icon turn blue with one utility. This is exactly how shadcn/Lucide icons behave (cross-ref Ch027 L1, recognition only — don't teach the icon component pattern here).
- **The other use:** `border-color` defaults to `currentColor` in many resets (Preflight's `border: 0 solid currentColor` — name it, it's why `border` utilities tint to text color until you set `border-*`). One sentence linking forward to L3.
- **The Tailwind form:** `fill-current` / `stroke-current` utilities map to `fill: currentColor`. So in practice you write `<Icon className="..." />` with `fill-current`, or rely on Lucide's default `currentColor`, and color the *parent*.

**Component — `ReactCoding` (target-match, `live`)** is the strongest fit: a tiny exercise where the student is given a button with an inline SVG and must make the icon follow the text color by adding `fill="currentColor"` (or by coloring the parent with `text-*`). Target pane shows the icon matching the label color; the student matches it. This is hands-on, low-friction, and cements the one pattern they'll actually type. Keep the SVG trivial (a single `<path>`). Alternatively, if a coding exercise is too heavy for the section budget, a **`ParamPlayground`** with a `color` control on a parent containing both a text label and a `fill="currentColor"` SVG — slide the color, both move together — delivers the same "aha" with less authoring risk. Recommend the `ReactCoding` target-match for the active-recall value; fall back to the playground if build cost is a concern.

**Tooltips (`Term`):** `currentColor` if useful as an inline reinforcement, though the section defines it in prose so a Term may be redundant — author's discretion.

### When the page lies: inheritance look-alikes

The gotcha section, attached to the concept it qualifies (not a bin of tips). These are the cases where the *visual* result mimics inheritance but the mechanism is different — getting these wrong produces real bugs.

- **`opacity` is not inherited — but it looks like it is.** Setting `opacity: 0.5` on a parent fades the children, so beginners "learn" opacity inherits. It doesn't: the parent forms a single composited group and the *group* is made translucent, so children fade as a side effect of compositing, not inheritance. The tell: a child cannot set `opacity: 1` to become opaque again — the group is already half-transparent. Contrast with a genuinely inherited property a child *can* override.
- **`visibility: hidden` *is* inherited — but a child can reverse it.** Unlike `display: none`, `visibility` inherits, so hiding a parent hides children; but a child may set `visibility: visible` and reappear (the element still occupies layout space). Pair this with the `display: none` contrast: `display` does **not** inherit and removes the element from layout entirely — a child cannot bring back a `display: none` ancestor's subtree the way it can with visibility. (Note: the `display`/`visibility`/`aria-hidden` *decision tree* is Ch020 L2 — name the inheritance facts only, don't open the decision tree.)
- **Transparent backgrounds are passthrough, not inheritance.** `background-color` doesn't inherit; a child with no background simply shows the parent's background *through* it because the default is `transparent`. It looks inherited; it's just see-through. The tell: changing the parent's background changes what shows, but the child's own `background-color` is still `transparent`, not the parent's color.
- **`em` font-size compounds (prefer `rem` and the Tailwind scale).** Because each element inherits the parent's *computed* `font-size`, nesting elements that each set `font-size: 1.25em` multiplies the size at every level — a runaway the student will hit. The senior fix and the course default: use `rem` (relative to the root, no compounding) or, in practice, Tailwind's `text-*` scale (which emits `rem`). Callback to the "computed value of the parent" mechanic from section 2 — this is *why* it compounds. (Typography scale depth is Ch021 L1 — name the `rem`-over-`em` reflex only.)

**Component:** these are best as tight prose with one or two micro-demos. A **`TabbedContent`** with two small panels — "Looks inherited" (opacity fading children) vs. "Actually inherited" (color flowing to children, child overrides it) — makes the opacity distinction visceral; the others are one-liners. Optionally a single **`PredictOutput`** is *not* a fit (no stdout); instead a **`MultipleChoice`** or a **`TrueFalse`** round of four statements (one per gotcha: "opacity inherits — false"; "visibility inherits — true"; "a child can override an inherited color — true"; "a child can opaque-out a faded parent group — false") is an efficient end-of-section check. Recommend a short **`TrueFalse`** round here — it maps perfectly to four crisp myth/fact statements and reinforces the discriminating tells.

### The placement rule: typography up, box-model down

The synthesis. Short, declarative, the thing the student takes to every project. This is the lesson's destination — make it explicit and memorable.

- **The rule:** put **typography and color utilities on `<body>`** (or a high ancestor) — they inherit, so they reach the whole app for free. Put **box-model and layout utilities on each element** — they don't inherit, so they must be local. Custom-property tokens go on `:root`/`.dark` (they inherit) — that's the theming substrate (cross-ref L4).
- **Show the project shape:** a `Code` (TSX) of the root layout `<body className="font-sans text-foreground antialiased">` and a leaf component using only box/layout utilities (`flex items-center gap-2 px-4 py-2 rounded-lg`) — zero typography repetition because it inherits from body. Annotate which utilities live where and *why* (inherits vs. doesn't). This mirrors the real `globals.css`/layout shape established in Ch017–018.
- **The senior reframe to close on:** inheritance isn't a quirk to memorize — it's the lever that decides *where a style lives*. Knowing what flows down is what keeps your utility lists short and your styling decisions in the right place. One element's job, one element's utilities; the whole app's typography, one ancestor's utilities.

**Component — `AnnotatedCode`** is the right fit for the layout-plus-leaf snippet: write the two-file shape once, step through "this is on body because it inherits" / "this is on the element because it doesn't" / "notice no font class on the leaf." 3–4 steps, blue tint. This crystallizes the rule against real code. Optionally pair with a final **`Buckets`** "where does this utility go: `<body>` or the element?" — but that risks redundancy with the earlier Buckets; prefer the AnnotatedCode walkthrough as the single closing artifact unless an extra check is wanted.

### DevTools: reading inheritance (short, recognition-level)

Keep L1's DevTools thread alive, retargeted to inheritance. One compact section, no exercise.

- **The Styles panel:** inherited declarations appear in dimmed `Inherited from <selector>` sections below the element's own rules — the browser shows you the ancestor each inherited value came from.
- **The Computed panel:** expand any property to see its trace; inherited properties are flagged with the ancestor they resolved from. The move: Computed → find `color`/`font-family` → read "Inherited from `body`."
- **The recognition:** if a property you expect isn't taking effect and it's an inheriting one, the Computed panel tells you whether it inherited or got overridden on the way down — same three-click muscle from L1, new target.

**Component:** a single **`<Figure>` + `Screenshot`** of the Computed/Styles panel showing an `Inherited from body` section would be ideal *if* a clean screenshot is available; otherwise a **hand-coded HTML/CSS mock** of the panel (a small styled list mimicking the "Inherited from `<body>`" group) — consistent with L1's `ComputedPanelTrace` approach (reuse its visual language; consider a sibling component at `src/components/lessons/019/2/` if a mock is built). Goal: the student recognizes the panel section in their own DevTools. Keep it to one figure.

### External resources (optional)

One or two `ExternalResource` cards, recognition-level: MDN "Inheritance" (the Learn CSS / Cascade page) and optionally MDN's `currentColor` or the CSS spec's per-property "Inherited: yes/no" reference. Keep to durable references; no blog churn.

---

## Scope

**This lesson teaches:** CSS inheritance as a per-property spec flag; the parent-computed-value vs. initial-value substitution; the inheriting families (typography, color, `list-style`, `cursor`, `visibility`, custom properties) and non-inheriting families (box-model, layout, background, visual effects) with the text-vs-box heuristic; DOM-tree-not-JSX-tree flow; the `inherit`/`initial`/`unset`/`revert`/`revert-layer` keywords at recognition level plus their utility equivalents (`text-inherit`, `bg-transparent`); form controls as inheritance rebels (UA-declared `font`/`color` defeating inheritance) and that Preflight re-enables it; `currentColor` for SVG icons and borders; the inheritance look-alikes (`opacity`, `visibility`/`display`, transparent backgrounds, `em` compounding); and the synthesis placement rule (typography on `<body>`, box-model per element).

**This lesson does NOT teach (and must not drift into):**

- **The cascade resolution algorithm, layers, specificity, source order, `!important`** — owned by Ch019 L1 (the prior lesson). Inheritance is *only* invoked here as "what fills in when the cascade leaves no declared value." Reference the L1 model (e.g. "a declared value beats an inherited one") as established, don't re-derive it. Reuse L1 terminology ("the cascade leaves no winner," the three-click DevTools move) for continuity.
- **Preflight's full reset surface and where it lives (`@layer base`)** — owned by Ch019 L3 (next lesson). Here: name *only* the one form-control `font: inherit` rule, as the fix for the rebels, and explicitly hand the rest forward. Do not enumerate what Preflight strips.
- **CSS custom properties at depth, the three-tier token model, reading/writing tokens from JS, `@property`** — owned by Ch019 L4. Here: state *only* that custom properties inherit (one sentence) and that this is why a `.dark` token swap on `<html>` reaches everything. Cross-ref, don't open.
- **Typography utilities at depth** (`text-*`, `font-*`, `leading-*`, the type scale, `rem`-over-`em` system) — owned by Ch021 L1. Here: name the `rem`-over-`em` reflex as the fix for `em` compounding, nothing more.
- **Color spaces, OKLCH, `color-mix()`, alpha syntax** — owned by Ch021 L2. Use existing semantic tokens (`text-foreground`) as opaque names; don't explain how they're stored.
- **The box model and `box-sizing`** — owned by Ch020 L1. Box-model properties are named here only as the non-inheriting family; don't explain how the boxes compose.
- **`display: none` / `visibility: hidden` / `aria-hidden` decision tree** — owned by Ch020 L2. Name only the *inheritance* facts about `visibility` and `display`; don't teach the hiding decision.
- **SVG icon component patterns / shadcn `<Button>`, `<Input>`** — owned by Ch027. `currentColor` and the form-rebel fix are taught at the CSS level; the shadcn wrappers are recognition-only cross-refs.
- **`cn()` / `tailwind-merge`** — established Ch018 L3; not relevant here, do not reach for it.

**Prerequisites the student already has (redefine in one line at most, only at point of use):** the cascade and that a declared value outranks an inherited one (Ch019 L1); Tailwind utility classes, the theme scale, semantic tokens like `text-foreground`, and `@theme`/`.dark` (Ch018); `className` on JSX, the root `<body>` in `app/layout.tsx` (Ch017); DevTools Styles/Computed panels (Ch019 L1).

---

## Code conventions alignment

- **Semantic tokens, not primitives:** every color in examples uses a semantic token (`text-foreground`, `bg-background`) per the three-tier rule, not raw palette values — even though primitives would "work," using them is the smell the conventions name. The one exception: illustrative `text-red-500` etc. in the form-rebel `MultipleChoice` is acceptable as a throwaway demo value (note this is deliberate).
- **CSS-first / no JS config:** any CSS shown lives conceptually in `globals.css` with `@import "tailwindcss"`; never reference `tailwind.config.ts`.
- **Tailwind form is the form taught:** lead with utilities (`text-inherit`, `fill-current`, `bg-transparent`); name the underlying CSS declaration at the call site (e.g. "→ `color: inherit`"). The raw-keyword CSS appears only in the recognition-level keywords section and the Preflight rule.
- **Logical-properties / `gap` conventions** are not exercised by this lesson's examples (no layout taught); if a leaf-component example uses spacing, prefer `gap` and `px-*`/`py-*` shapes consistent with the conventions, but don't make a point of it.
- **Deliberate divergences to flag for downstream agents:** examples here intentionally show *raw* `font: inherit`/`color: inherit` CSS (Preflight's rule) and the bare-`<button>`-without-Preflight state — these are pedagogical, not project code; label them as such so no agent "corrects" them into utility form. The `.dark { --color-foreground }` snippet mirrors Ch018's shipped `@custom-variant dark (&:is(.dark *))` shape (per L1 continuity notes) — keep that form, don't "fix" it to the docs' `:where()` variant.

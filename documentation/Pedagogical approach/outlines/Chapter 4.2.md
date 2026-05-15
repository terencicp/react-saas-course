## Concept 1 — Utility-first is a decision, not a syntax preference

**Why it's hard.** Returning devs read long class strings as a code smell. They reach for `.card-header { ... }` because that's what "clean CSS" looked like in their last job. They miss that React already gives the element its name — the CSS class would duplicate it for no reading benefit.

**Ideal teaching artifact.** A side-by-side *Decision* comparison: the same `<Card>` component shown twice — once styled with a bespoke `.card` CSS file plus a `className`, once with utilities on the JSX tag. Beneath each, three production scenarios play out: rename the component, add a hover state, add a responsive override. The student watches the bespoke version pay edit-distance tax each time while the utility version edits in place. The threshold is named beside the comparison, not as a separate aside — bespoke CSS earns its weight only for prose content, animations, and third-party widget overrides.

**Engagement.** A `Buckets` sort: ten styling problems (a product card's spacing, a long-form blog post's typography, a CSS keyframe shimmer, a `.prose` Markdown wrapper, a hover ring on a button, a third-party calendar widget restyle, etc.) sorted into "utilities" vs. "bespoke CSS." Confirms the threshold is internalized, not just read.

**Components.**
- `TabbedContent` (existing) wrapping two panels — the bespoke-CSS pane and the utility pane — each with a `Code` block and a small rendered preview. The three edit scenarios run as captioned tabs or short before/after blocks.
- `Buckets` (existing) for the sort.
- Alternative: a hand-SVG inside `Figure` showing the same `<Card>` JSX with two CSS surfaces stacked beneath it, if the live preview isn't worth the cost.

**Project link.** The Chapter 4.12 themed surface ships with utility classes on every JSX tag and no per-component CSS file; the project starter assumes this concept has landed.

---

## Concept 2 — The variant model: a prefix-and-colon is a selector wrapper

**Why it's hard.** Students treat `hover:`, `md:`, `dark:`, `data-[state=open]:` as magic strings. They memorize a few common ones, miss that they all compile to the same selector-or-media-query wrapper, and then can't reason about stacking order (`md:hover:bg-primary`) or compose new variants from CSS state.

**Ideal teaching artifact.** A *Concept* reveal — a small input box where the student types any Tailwind class, and the widget renders the generated CSS rule below it. `hover:bg-primary` reveals `&:hover { background-color: var(--color-primary) }`. `md:hover:bg-primary` reveals the nested `@media` + `:hover`. `data-[state=open]:rotate-180` reveals `&[data-state="open"] { ... }`. The student sees that variants are not memorized, they are *named selectors with a `:` syntax*. Stacking is left-to-right because that's the wrapping order.

**Engagement.** A `Dropdowns` drill: five Tailwind class strings, each with a blank that's either the variant prefix or the utility. The student picks each from a list to produce the described behavior ("rotate the chevron only when the parent's `data-state` is `open` at `md` and up").

**Components.**
- New: `ClassToSelector` (sketched below) — a focused interactive that maps any class to its compiled selector.
- `Dropdowns` (existing) for the drill.
- Alternative: a static `Figure` with three or four worked examples in an `ArrowDiagram` (class on the left, selector on the right) if the bespoke widget is deferred.

---

## Concept 3 — The theme scale, and what an arbitrary value signals

**Why it's hard.** Students either over-reach for arbitrary values (`w-[42rem]`, `bg-[#bada55]`) because the scale feels constraining, or they refuse to use them and fight the scale instead. They don't read `p-4` as "the design system says 1rem and you're agreeing to it."

**Ideal teaching artifact.** A *Mechanics* worked example, brief: render the same button with `p-4` and again with `p-[1rem]`. Same pixels. The lesson states the rule — the named token is a *promise*, the arbitrary value is a *break in the promise*. Every arbitrary value in a real diff is a code-review prompt: *should this be a new token?* The rule lands as a one-sentence threshold beside the example, not in a callout.

**Engagement.** A `MultipleChoice` ambush: a snippet has three arbitrary values, two of which should clearly be tokens and one of which is legitimately one-off. Pick the legitimate one.

**Components.**
- `Code` (existing) for the side-by-side.
- `MultipleChoice` (existing) for the ambush.

---

## Concept 4 — CSS-first config: globals.css is the configuration surface

**Why it's hard.** Students with v3 muscle memory reach for `tailwind.config.ts` and waste an evening before learning v4 deleted it. The four directives (`@theme`, `@utility`, `@custom-variant`, `@container`) are unfamiliar, and the student doesn't yet know which problem each solves.

**Ideal teaching artifact.** A *Setup/wiring* walkthrough through a single annotated `app/globals.css`, broken into stepped highlights — line 1 is `@import "tailwindcss"`, then a `@theme` block setting brand color and a custom spacing token, then a `@utility scroll-snap-x` block, then a `@custom-variant pointer-coarse` block. Each highlight pairs with one sentence: *what it replaces in v3, what utility surface it produces, when you reach for it.* The student sees the whole file once and understands what each region buys them, rather than meeting the directives as four disconnected APIs.

**Engagement.** A `Matching` drill: four problems on the left ("I need a brand color utility," "I need a `pointer-coarse:` variant," "I need a custom `scroll-snap-x` utility," "I need container-query layout"), four directives on the right.

**Components.**
- `AnnotatedCode` (existing) — the canonical fit for this artifact. One `globals.css` block, stepped highlights, one sentence per directive.
- `Matching` (existing) for the drill.

**Project link.** The project's `globals.css` ships with all four directives populated; this lesson is the student's map to it.

---

## Concept 5 — The token-namespace contract: prefix decides utility family

**Why it's hard.** Students define `--brand-color: oklch(...)` in `@theme`, get no `bg-brand` utility, and waste twenty minutes before discovering the namespace is `--color-*`, not arbitrary. The mapping is deterministic but invisible.

**Ideal teaching artifact.** A *Reference* interactive — a token-namespace explorer. The student types or picks a token name (`--color-brand`, `--spacing-section`, `--radius-card`, `--font-display`, `--breakpoint-3xl`); the widget renders the generated utility family beside it (`bg-brand`, `text-brand`, `border-brand`, `ring-brand`, etc. for color). The student sees that the prefix *is* the contract — change `--color-` to `--brand-` and the family disappears. The escape-the-default trick (`--color-*: initial`) gets its own row.

**Engagement.** A `Dropdowns` drill: four "I want this utility family" goals; the student picks the namespace prefix from a list. Confirms the mapping flows the right way (namespace → family, not the reverse).

**Components.**
- New: `TokenNamespaceExplorer` (sketched below) — token name on the left, generated utility family on the right, with a "reset defaults" toggle.
- `Dropdowns` (existing) for the drill.
- Alternative: a static `Figure` with a `Code` block listing the five namespaces and their families, paired with a `MultipleChoice` ambush. Cheaper but loses the "type and see" reflex.

---

## Concept 6 — The naive class-concat bug: silent, build-dependent, and the reason `cn()` exists

**Why it's hard.** The bug is invisible. Template-literal concat `\`${defaults} ${className}\`` produces a string with two conflicting `px-*` utilities; the browser applies whichever Tailwind emitted last, which is build-determined and not stable. Students don't see the bug until a consumer override silently fails on a Friday, and they blame specificity instead.

**Ideal teaching artifact.** A *Pattern* archetype where the wrong code comes first and the failure mode is the demo. A small `<Button>` component that template-concats its className with the consumer's. The student renders `<Button className="px-8">` and inspects: `px-4` *and* `px-8` both in the class string. The page shows which one wins, and a one-line note states the cascade rule that decided it. Then `cn()` lands, and the same component re-renders with `px-8` alone in the DOM. The bug visible, the fix visible, the diff visible.

**Engagement.** A `PredictOutput`-style drill recast for CSS: three template-concat snippets, the student predicts which utility wins, then runs them. The "expected output" reveals only after a wrong attempt.

**Components.**
- `CodeVariants` (existing) — the wrong-then-right tabbed comparison. Tab one: template-concat with DOM-class output and rendered button. Tab two: `cn()` with the deduped output and rendered button.
- `ReactCoding` (existing) in target-match mode for the prediction drill — the student writes the component and the test asserts that consumer overrides win.

---

## Concept 7 — `cn()` composition order: defaults, then variants, then `className` last

**Why it's hard.** Even with `cn()`, students get the order wrong. They put `className` first because they read left-to-right, or they put it in the middle. `tailwind-merge` is *last-wins*, so `className` must be the final argument for consumer overrides to actually win.

**Ideal teaching artifact.** A *Pattern* with a controllable demo. A `<Button>` component is rendered live; three controls let the student drag the order of three argument slots (`defaults`, `variantClasses`, `className`) inside the `cn(...)` call. The rendered button updates instantly. Drag `className` to position one and consumer overrides stop winning; drag it to position three and they win again. The rule is felt, not memorized — argument order *is* the rule.

**Engagement.** A `Sequence` drill: four `cn()` arguments (defaults, size variant, state variant, consumer `className`) to drag into the canonical order. Locks the "consumer last" reflex.

**Components.**
- New: `CnComposer` (sketched below) — three or four draggable argument slots, a live `cn()` output line, and a rendered preview element. Single most teaching-heavy widget in this chapter.
- `Sequence` (existing) for the recall drill.
- Alternative: `ReactCoding` in target-match mode where the student writes the `cn()` call and tests assert the override survives. Skips the drag affordance but earns its weight.

**Project link.** Every `<Card>`, `<Button>`, and `<FeatureCard>` in the Chapter 4.12 project applies this pattern; the project would fail review without it.

---

## Concept 8 — Read state from the DOM; don't mirror it in React

**Why it's hard.** This is the load-bearing reflex of the entire variant lesson, and it cuts against every habit. Returning devs reach for `useState` reflexively. They see "the chevron rotates when open" and think *open* is a piece of React state, when in reality Radix has already written `data-state="open"` on the trigger and the DOM is the source of truth. Mirroring it into React is duplicated state.

**Ideal teaching artifact.** A *Concept* reveal in two beats. Beat one is a side-by-side: the same disclosure widget built twice. Left, the naive version — `useState` for `open`, a handler on the trigger, a ternary in `className` to set `rotate-180`. Right, the senior version — no `useState`, no handler, `data-[state=open]:rotate-180` on the chevron, and Radix's `data-state` doing the work. The student opens both, sees identical behavior, and reads the React DevTools state panel — naive has state, senior has none. Beat two states the reflex as a question the student asks at every styling decision: *can the DOM already tell me this?* If yes, write a variant. If no, `useState` with `cn()`.

**Engagement.** A `Buckets` sort: eight UI state changes ("chevron rotates on open," "input border turns red on invalid," "submit button disables when no fields are dirty," "card highlights on hover," "tab pill slides when active server-fetched value changes," "label lifts when input is focused," etc.) sorted into "DOM can tell me — write a variant" vs. "DOM can't — useState + cn()."

**Components.**
- `TabbedContent` (existing) for the side-by-side, with both versions rendering live. Mount React DevTools state panel as a small inline screenshot beside each.
- `Buckets` (existing) for the sort.

---

## Concept 9 — The variant catalog as a reach order, not a memorize list

**Why it's hard.** Eight or nine variant families (`data-*`, `aria-*`, `group-*`, `peer-*`, `has-*`, `*:`, `not-*`, positional, `open:`) presented as a list flatten into noise. The student doesn't learn *when to reach for each one*; they learn that there are a lot of them.

**Ideal teaching artifact.** A *Reference* organized by the relationship the variant expresses, not by the variant's name. Five rows, each a small live example pair: self-state (`hover:`, `aria-expanded:`, `data-[state=open]:`), parent-state (`group-*`), sibling-state (`peer-*`), descendant-state (`has-*`), structural (`first:`, `last:`, `odd:`, `*:`). Each row pairs one real SaaS pattern (the disclosure chevron, the icon-button hover ring, the form-level error highlight when any input is invalid, the striped table) with the smallest snippet that produces it. The catalog is a decision tree, not a list — *which element holds the state, which element wants the style?*

**Engagement.** A `Matching` drill: five "which element holds the state, which element gets styled" scenarios, matched to the variant family that reaches across that gap.

**Components.**
- `Figure` (existing) wrapping a five-row layout. Each row holds a small `Code` block and a rendered preview side by side. Or `TabbedContent` with one tab per relationship if vertical space is tight.
- `Matching` (existing) for the drill.

---

## Concept 10 — Semantic tokens vs. per-utility `dark:`: a threshold

**Why it's hard.** Students who've seen Tailwind dark mode before reach for `dark:` on every utility. The chapter's job is to argue against that and install semantic tokens (`bg-card text-card-foreground`) as the default, with `dark:` carved out for one-offs only. The argument has to land *before* the wiring lesson, or the wiring feels arbitrary.

**Ideal teaching artifact.** A *Decision* with a quantified comparison. Same `<Card>` built twice. Left, naive: every utility carries a `dark:` twin — `bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 text-gray-900 dark:text-zinc-100`. Class string length and the implicit per-component dark palette are visible. Right, semantic: `bg-card text-card-foreground border-border`. Same rendered result in both themes; one class string instead of two. Beneath, the threshold names the carve-out — a tuned shadow that flips, a gradient that doesn't have a token, an illustration overlay. If the same `dark:` pair shows up in two components, promote it to a token.

**Engagement.** A `TrueFalse` round of five statements: *"every theme-aware color should be a `dark:` pair"* (false), *"a one-off card shadow in dark mode is fine with `dark:shadow-...`"* (true), and so on. Calibrates the threshold.

**Components.**
- `CodeVariants` (existing) — tabbed comparison of the two `<Card>` source forms.
- `TrueFalse` (existing) for the threshold calibration.

---

## Concept 11 — `@custom-variant dark` and `.dark` overrides: the mechanism

**Why it's hard.** The student now wants semantic tokens to work but can't see *how* `bg-card` produces a different color in dark mode. The answer is two layered files: `@custom-variant dark (&:where(.dark, .dark *))` declares the variant; `@theme` defines light tokens; `.dark { ... }` overrides those tokens; the `dark` class on `<html>` activates the override. Four pieces, one effect, and the student has to hold all four in mind.

**Ideal teaching artifact.** A *Concept* with a four-layer diagram and a live toggle. The diagram stacks four labeled rows from bottom to top: `:root` light tokens, `.dark` overrides, the `<html>` class, the `bg-card` utility on a JSX element. The student clicks a toggle that adds or removes `dark` from a simulated `<html>`. A trace highlights the path the `bg-card` utility takes: it reads `var(--color-card)`, which resolves under the current class context. Removing the `dark` class re-resolves to the light value. The mechanism is a value-substitution chain, not magic.

**Engagement.** A `Sequence` drill: four pieces (`@custom-variant dark` declaration, `@theme` light tokens, `.dark` override block, `class="dark"` on `<html>`) dragged into the load order required for the substitution to work. Validates the four-layer mental model.

**Components.**
- New: `DarkTokenTrace` (sketched below) — a stacked diagram with a `dark`-class toggle, a small JSX element rendered in the current theme, and a highlighted trace through the variable resolution. Forward-link to Chapter 4.3.4 (custom properties at depth) keeps it from being single-use.
- `Sequence` (existing) for the drill.
- Alternative: a static `Figure` with a four-layer hand-SVG annotated with the trace at one chosen frame, plus a small `ReactCoding` live preview of the theme toggle. Cheaper and probably enough if the bespoke widget slips.

**Project link.** The Chapter 4.12 project's `globals.css` carries exactly this four-layer setup; this concept is the map to it.

---

## Concept 12 — The FOUC problem: why the class must be set before paint

**Why it's hard.** The student has never thought about the *order* of script execution relative to first paint. A `useEffect` reading `localStorage` runs after hydration, and by then the user has already seen the wrong theme. The bug is timing, not logic.

**Ideal teaching artifact.** A *Concept* timeline with two parallel traces. Top trace, naive: SSR renders the document with the default theme, browser paints, JS hydrates, `useEffect` runs, `localStorage` is read, `dark` class is added, browser repaints. The student sees the white flash at the second-to-last step. Bottom trace, with `next-themes`: SSR renders, the synchronous inline `<head>` script runs *before* `<body>` parses, the class lands on `<html>`, browser paints once with the correct theme. The traces are stacked on the same timeline axis with paint frames marked. The fix is positional, not algorithmic.

**Engagement.** A `MultipleChoice` ambush: four candidate fixes for FOUC (a `useEffect` that runs early, a `useLayoutEffect`, a synchronous `<head>` script, a cookie read on the server). Two are correct, two are common wrong answers. The right pair is the script and the cookie read.

**Components.**
- `DiagramSequence` (existing) — the two timelines stacked, scrubbed step-by-step. The paint frame and the script position carry the lesson.
- `MultipleChoice` (existing) for the ambush.

**Project link.** Chapter 4.12.4's "Done when" check includes "no FOUC on hard reload" — this concept is the prerequisite for understanding why the check exists.

---

## Concept 13 — The hydration-safe toggle: CSS-only or mount-gate

**Why it's hard.** First render on the server doesn't know the theme; first render on the client does. If the toggle renders a sun icon on the server and a moon icon on the client, React fires a hydration-mismatch error, and naive fixes (suppress the warning, `useEffect` flip) trade one bug for another. Two correct paths exist — students need to know which earns its weight when.

**Ideal teaching artifact.** A *Pattern* with two correct fixes and one wrong-by-default. Three live `<ThemeToggle>` panels. Panel one is the naive version that renders `theme === 'dark' ? <Moon /> : <Sun />` on first render — hydration error visible in DevTools. Panel two is the mount-gated version with a same-size placeholder during the unmounted phase — no error, but a brief invisible state. Panel three is the CSS-only version with both icons in the DOM and `hidden dark:inline` / `inline dark:hidden` deciding visibility — no React state read, no mismatch. The student toggles each and watches the DevTools console. The senior reach is named at the end: CSS-only for simple icon swaps, mount-gate for anything that depends on the resolved theme value beyond the icon.

**Engagement.** A `CodeReview`-style ask: a PR diff contains a hydration-unsafe toggle. The student leaves an inline comment pointing at the mismatch and naming one of the two fixes. AI-graded against a kernel phrase like "renders different markup on server and client."

**Components.**
- `TabbedContent` (existing) with three tabs, each holding a `Code` block and a live `<ThemeToggle>` instance. The DevTools console mismatch can be a captured screenshot or a one-line annotation.
- `CodeReview` (existing) for the recall.

**Project link.** The Chapter 4.12 toggle is a CSS-only icon swap by default; the project's success criteria assume this concept has landed.

---

## Component proposals

- **`ClassToSelector`** — input box accepts a Tailwind class string; output renders the generated CSS rule (selectors, media queries, custom properties resolved). Pre-seeded examples for the variant families.
  - Uses in this chapter: Concept 2.
  - Forward-links: Chapter 4.3.1 (cascade and specificity — same selectors at higher resolution), Chapter 4.5.4 (`:focus-visible`, `:has()`, pseudo-class details). Compounds.
  - Leanest v1: pre-seeded dropdown of ten canonical classes instead of a free-form input; renders the selector and a single CSS rule beneath. Skips the parser; still teaches that variants are selectors.

- **`TokenNamespaceExplorer`** — pick a token name from a list (or type one); see the generated utility family on the right. Toggle for "Tailwind defaults: on/off" demonstrating `--color-*: initial`.
  - Uses in this chapter: Concept 5.
  - Forward-links: Chapter 4.3.4 (CSS custom properties and the three-tier token model — same namespace contract at depth), Chapter 4.5.2 (color tokens and OKLCH at depth). Compounds.
  - Leanest v1: a static `Figure` with a five-row table (namespace → family → example) and a one-line note on the `initial` trick. Cheap, recognition-level, and probably sufficient if the bespoke widget slips.

- **`CnComposer`** — three or four draggable argument slots (`defaults`, `variants`, `state`, `className`) feeding a live `cn(...)` call; output shows the deduped class string and the rendered element below.
  - Uses in this chapter: Concept 7. The single highest-leverage widget in this chapter — `cn()` ordering is the bug students will write most often.
  - Forward-links: Chapter 4.6.3 (CVA — same composition order with a variant table), Chapter 4.11.1 (shadcn templates that all follow this order). Heavy compounding.
  - Leanest v1: two slots only — `defaults` and `className` — with a single toggle to flip their order. Renders the merged class and the styled button. Drops the variants slot but still teaches the load-bearing rule.

- **`DarkTokenTrace`** — stacked four-layer diagram (`:root` tokens, `.dark` overrides, `<html>` class, JSX utility) with a toggle that flips the `dark` class and animates the variable-resolution trace.
  - Uses in this chapter: Concept 11.
  - Forward-links: Chapter 4.3.4 (custom properties at depth — same trace, deeper resolution). Compounds.
  - Leanest v1: a hand-SVG `Figure` of the four-layer stack annotated with the trace at the "dark on" state, paired with a tiny `ReactCoding` preview that toggles a class on a wrapper. Loses the animated trace but keeps the four-layer model. Acceptable downgrade.

## Build priority

`CnComposer` carries the most load. The `cn()` ordering rule is the chapter's most-repeated production reflex, every shadcn component the student will copy in Chapter 4.11 obeys it, and CVA in Chapter 4.6.3 layers directly on top. Build this first; even the leanest two-slot v1 outperforms a static comparison for this concept.

`DarkTokenTrace` is second. The four-layer mental model is the bridge between Concept 10 (semantic tokens as a decision) and Concept 12 (FOUC). Without a visual trace the student carries four disconnected files in their head and can't debug a broken theme. Forward-link to Chapter 4.3.4 makes this a multi-chapter asset.

`TokenNamespaceExplorer` is third. Useful but the static-`Figure` v1 covers most of the teaching at much lower cost; defer the live widget unless Chapter 4.3.4's needs raise the bar.

`ClassToSelector` is fourth. Pedagogically valuable but the leanest v1 (a pre-seeded dropdown instead of a parser) is dramatically simpler than the full proposal, and the dropdown form covers Concept 2's teaching. Build the leanest v1 only.

## Open pedagogical questions

- Concept 8 (read state from the DOM) and Concept 9 (the variant catalog) sit in the same lesson (4.2.4) and could collapse into one concept with the catalog as a sub-beat. Kept separate because the reflex (Concept 8) is load-bearing on its own and worth its own assessment, but a single combined treatment would be defensible.
- Concept 12 (FOUC) and Concept 13 (hydration-safe toggle) both live in lesson 4.2.6 and could fold; kept separate because the failure modes are distinct (one is paint timing, one is React reconciliation) and students conflate them in production.

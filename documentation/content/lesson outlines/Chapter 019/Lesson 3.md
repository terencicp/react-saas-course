# Preflight, the deliberately blank canvas

**Sidebar label:** Preflight

---

## Lesson framing

This is the chapter's payoff lesson on the *base layer*. Lessons 1 and 2 left two explicit debts this lesson repays:
L1 deferred "why does a bare `<h2>` have no large default to fight the utility?" to here;
L2 named, but did not explain, Preflight's one `font: inherit; color: inherit` rule on form controls and the `border: 0 solid` reset.
Both debts get paid in full here.

The senior frame, stated once and reinforced throughout: **Preflight is not a bug and not a loss — it is a deliberate design decision that makes utilities the single source of visual weight.**
A junior meeting Tailwind for the first time sees "Tailwind broke my HTML" — headings look like body text, lists lose bullets, buttons look like plain text.
The mental flip this lesson installs: that flattened look is *correct and intentional*. The blank canvas is the feature. You are not meant to restore the browser defaults; you are meant to paint with utilities on a surface where nothing competes.

Why this matters on a real 2026 stack: every component library the course later adopts (shadcn) assumes Preflight ran.
A heading with browser margins, a button with native typography, a list with default indentation — these are *unpredictable across browsers* and *un-tokenized* (they're not on your spacing/type scale).
Preflight deletes them so that what you see is what your design system declared, byte for byte, in every browser.

The lesson is **recognition-first, not API-first.** The student will almost never write a Preflight override.
What they must be able to do at the end: (1) look at a flattened element and *correctly diagnose* it as Preflight working, not a bug; (2) find a Preflight rule in DevTools, in `@layer base`, and read it as "the reset did its job, the utility is now my job"; (3) know the *two* legitimate carve-outs — `prose` for content they don't author element-by-element (Markdown/CMS), and scoped `@layer base` overrides for third-party widgets that depend on browser defaults; (4) reject the three wrong fixes a junior reaches for (strip Preflight globally, `@apply h1 {}` to "restore" headings, `!important`).

This lesson leans heavily on the chapter's instruments already established in L1/L2:
the `@layer` model (Preflight lives in `base`, so utilities in `utilities` always win — this is *why* you never fight it),
the cascade ("an inherited/UA value is the weakest source"),
DevTools' Styles panel reading rules in `@layer base`.
Reuse that vocabulary; do not re-teach it.

The single load-bearing diagram is the **before/after Preflight sequence** (chapter framing's named diagram) — a `DiagramSequence` walking one realistic snippet of markup from "raw browser defaults" to "Preflight applied," element by element, so the student *sees* each default getting deleted and understands it as subtraction, not breakage.
This is the lesson's emotional turn from "broke my HTML" to "blank canvas," so it must be vivid.

**Critical correctness note for the writer (verified against current v4 Preflight source, June 2026):** the chapter outline lists `button, [role="button"] { cursor: pointer }` as a Preflight reset. **This is outdated.** Tailwind v4 *removed* that rule; v4 buttons use the browser default `cursor: default` to match native behavior. Do **not** teach `cursor: pointer` as a Preflight rule. If buttons-feel-unclickable comes up, the senior note is that *you* add `cursor-pointer` (or shadcn's `<Button>` does). Likewise placeholder color in v4 is `color-mix(in oklab, currentColor 50%, transparent)` (current text color at 50%), **not** `gray-400` — only mention if relevant; don't over-index on it.

Tone: adult, terse, senior, no celebratory bootcamp voice — match L1/L2 exactly. Reuse their established terminology ("gate"/"layer gate decides", "the reset is doing its job; the utility is your job", "weakest source in the cascade").

---

## Lesson sections

### Introduction (no header)

Open with the L1/L2-style concrete puzzle, written as prose + one small `Code` block, no header (matches both prior lessons).
The hook: a developer drops plain semantic HTML into a fresh Tailwind app and everything looks *wrong*.
Show a tiny realistic snippet — a card with an `<h1>`, a `<ul>` of features, a `<button>` — and describe the rendered result in prose: the `<h1>` is the same size as the paragraph, the `<ul>` has no bullets and no indent, the `<button>` looks like underlined-free plain text sitting inline.
Name the reflexive junior reaction in the student's own voice: *"Tailwind broke my HTML."*

Then the pivot that frames the whole lesson: nothing broke. Tailwind shipped a small, deliberate reset called **Preflight** that ran the instant you wrote `@import "tailwindcss"`, and it *deleted the browser's default styling on purpose*.
State the lesson's promise: by the end you'll see that flattened look as a blank canvas you *want*, know exactly what got deleted and why, recognize it instantly in DevTools, and know the two times a senior deliberately brings some defaults back.
Tie back to L1/L2 explicitly: this is the rule that lives in `@layer base` (L1's layer model) and the reason a bare `<h2>` has nothing for your `text-2xl` to fight (L1's deferred debt), and the same `font: inherit` that re-opened form controls to inheritance (L2's deferred debt).

Reasoning: both prior lessons open cold with a rendered-result puzzle and resolve it across the lesson. Same shape keeps the chapter coherent and motivates via concrete pain (pedagogy filter: "motivate the topic with a concrete problem").

`Term` candidates in this section: **Preflight** (define inline: "Tailwind's small built-in CSS reset, loaded by `@import \"tailwindcss\"`, that normalizes browser default styles"), **user-agent stylesheet** (re-explain concisely — L2 defined it but the term recurs heavily here; a fresh `Term` keeps flow).

---

### Preflight is the base layer, loaded for free

Goal: pin *what Preflight is and where it lives* before listing what it strips, so the student has the mental slot to file every reset into.
Keep it to a few tight paragraphs.

Content:
- Preflight in one line: a small set of CSS rules Tailwind v4 ships, injected into `@layer base` automatically by `@import "tailwindcss"`. The student wrote the import in Ch018; they never wrote Preflight, but it's there.
- Show the expansion of `@import "tailwindcss"` so the student sees Preflight's actual provenance and its layer. Use a `Code` block (CSS) of the conceptual expansion:
  ```css
  @layer theme, base, components, utilities;
  @import "tailwindcss/theme.css" layer(theme);
  @import "tailwindcss/preflight.css" layer(base);   /* ← Preflight */
  @import "tailwindcss/utilities.css" layer(utilities);
  ```
  Highlight the `preflight.css ... layer(base)` line. This is the single most important structural fact in the lesson.
- The senior consequence, stated as a one-liner the student carries out: **Preflight lives in `layer(base)`; your utilities live in `layer(utilities)`; the layer gate (L1's gate 2) means utilities always win.** That is *why* you never fight Preflight and never need `!important` against it — you just write the utility, and the layer order hands it the victory. Cross-ref L1 by name ("the layer gate, from *How the browser picks a winning rule*").
- The purpose, in the course's "decisions before syntax" register: Preflight normalizes away browser defaults so that **all visual weight comes from utilities you wrote** — predictable, tokenized, identical across browsers. Contrast the alternative implicitly: without a reset, your design system would be fighting forty years of accumulated, browser-divergent UA defaults on every element.

Reasoning: the chapter's whole thesis is that the cascade machinery is *predictable* and Tailwind names it. Showing Preflight's layer placement first turns "what it strips" (next section) from a list-to-memorize into a set of consequences of one decision. Also pre-empts the L1 debt cleanly.

No diagram here — the `Code` expansion is the visual. A diagram would over-weight a structural fact that one highlighted code block conveys better.

`Term` candidates: none new; reuse `@layer` understanding from L1 (optionally one `Term` on **base layer** if it reads as jargon, but L1 already taught it — prefer not to).

---

### What Preflight strips, element by element

Goal: the substantive "what gets deleted" content, delivered as the chapter framing demands — *named, not exhaustively walked*. The student should leave able to *predict* the flattened look of common elements and recognize each reset, not recite the full stylesheet.

Lead-in prose: frame this as subtraction. Every item below is the browser default being *removed* (or normalized), and in each case the replacement is "now it's a utility's job."

Primary vehicle: the **before/after `DiagramSequence`** (the chapter's named load-bearing diagram). See its own subsection below — it carries the *experience* of the strip. This section's prose + a compact reference grouping carry the *catalog*.

Catalog — group by family, present as prose with a small `Code` snippet per reset showing the actual Preflight rule (these raw-CSS snippets are pedagogical, mirroring L2's choice to show Preflight's literal rules; note for the writer: show real CSS, do not "correct" to utility form). Keep the verified v4 rules:
- **Margins gone, everywhere.** `*, ::before, ::after { margin: 0; padding: 0 }` (also resets padding). No more default space above an `<h1>`, between `<p>`s, around lists/blockquotes/`<figure>`/`<hr>`. The consequence: spacing is *yours*, on your `--spacing` scale, via `gap`/`p-*`/`m-*` — never an accidental UA value. (Cross-ref forward lightly: the course forbids sibling margins and prefers `gap`, Ch018 convention — but don't re-teach.)
- **Headings flattened.** `h1–h6 { font-size: inherit; font-weight: inherit }`. A bare `<h1>` is body-sized and body-weight. **This is L1's repaid debt** — say so explicitly: there is no large default for `text-2xl font-bold` to fight, because Preflight already set it to inherit. The heading's size and weight are now *entirely* whatever utility you put on it.
- **Lists unstyled.** `ol, ul, menu { list-style: none }` (and the margin/padding reset removes indentation). No bullets, no numbers, no indent. The senior note: most "lists" in a SaaS UI (nav menus, command palettes, option lists) are semantically `<ul>` but visually not bulleted, so this default is what you want 90% of the time; when you *do* want a styled bullet list, that's `prose` (next section).
- **Form controls re-inherit typography.** `button, input, select, textarea { font: inherit; color: inherit; … }`. **This is L2's repaid debt** — name it: this is the exact rule that re-opens the inheritance-rebels to the body font/color. Buttons stop looking like native OS widgets and inherit your typography. Cross-ref L2 by name (*What flows down the DOM tree*).
  - **Writer correction (load-bearing):** do **NOT** state Preflight sets `cursor: pointer` on buttons. v4 removed that; bare buttons use the browser default `cursor: default`. If you mention the pointer at all, it's "you add `cursor-pointer` or shadcn's `<Button>` does" — not a Preflight rule.
- **Box-sizing + borders.** `*, ::before, ::after { box-sizing: border-box; border: 0 solid }`. Two effects: every box measures padding+border *inside* its width (the sane model — Ch020 owns the box model, name only), and **every element's border starts at 0-width, solid style, current text color.** The second half is L2's other repaid debt and a load-bearing dependency: the `border` utility only renders because Preflight pre-set `border-style: solid` — `border` sets *width*, not style, so with no Preflight a `border` utility produces nothing (style defaults to `none`). Flag this as a watch-out; it's the most surprising "no-Preflight breaks utilities" case.
- **Images/media become block + constrained.** `img, svg, video, … { display: block; vertical-align: middle }` and `img, video { max-width: 100%; height: auto }`. Kills the inline-image baseline gap and the overflow-past-container problem in one move.
- **Links.** Underline removed; `color` inherits (so a bare `<a>` is body-colored, not browser-blue, until you style it). Note: this is a normalization the student will usually override per-design with `text-primary underline-offset-*` etc., or via shadcn.
- (Mention only in passing, not as separate items: tables `border-collapse`, `[hidden]` enforcement, placeholder color = current color at 50% in v4. These are real but low-value; one sentence total.)

Presentation choice: do **not** dump nine `Code` blocks in a row — that's a wall. Group the *high-value four* (margins, headings, form controls, borders/box-sizing) with their literal rule snippets and the "now it's your job" consequence; compress the rest (lists, media, links, misc) into tighter prose with at most an inline rule.
Consider an `AnnotatedCode` over a single consolidated Preflight excerpt (8–10 lines covering the headline rules) instead of scattered blocks: one block, stepped highlights, each step naming the reset + its consequence + which debt it repays. This is the cleaner choice — it keeps the literal CSS in one place and directs focus, exactly `AnnotatedCode`'s purpose. **Recommend `AnnotatedCode` as the primary, with the `DiagramSequence` for the rendered before/after.**

Reasoning: chapter framing says "named, not exhaustively walked" — so structure must resist completeness-for-its-own-sake. Grouping by the *consequence* ("now it's a utility's job") keeps the senior frame front-and-center and ties each reset to a debt or a downstream pattern. `AnnotatedCode` is the right tool because the focus needs directing across multiple parts of one canonical excerpt.

`Term` candidates: **`box-sizing: border-box`** (one-line: "padding and border count *inside* an element's declared width, not added on top" — full model deferred to Ch020, so a `Term` keeps flow without a tangent).

#### The before/after Preflight sequence (DiagramSequence)

The chapter's named load-bearing diagram. Pedagogical goal: convert "broke my HTML" into "blank canvas" *viscerally*, by showing the same markup rendered with raw UA defaults, then watching each Preflight reset subtract a default until the canvas is flat.

Build as a `DiagramSequence` (it provides its own card — not wrapped in `<Figure>`). Each step renders the **same small HTML fragment** (a card: `<h1>` title, a short `<ul>`, a `<p>`, a `<button>`) styled with real inline CSS so it's DevTools-inspectable and unambiguous, per the html-css diagram guidance. Steps:
1. **Raw browser defaults** — the fragment with *no* reset: big bold heading with top margin, bulleted indented list, native-looking button in UA font, spacing everywhere. Caption: "What the browser ships. Forty years of defaults — and they differ between browsers."
2. **Margins zeroed** — same fragment, margins/padding collapsed. Caption: "Preflight removes default margins. Spacing is now yours, on your scale."
3. **Headings flattened** — the `<h1>` drops to body size/weight. Caption: "Headings inherit body size and weight. Nothing for `text-2xl` to fight."
4. **Lists unstyled** — bullets and indent gone. Caption: "Lists lose bullets and indent — what you want for nav and option lists."
5. **Form control re-inherited** — the button takes the body font/color, loses native chrome. Caption: "`font: inherit; color: inherit` re-opens controls to your typography."
6. **The blank canvas** — final flat state, everything body-styled. Caption: "Not broken — blank. Every pixel of weight now comes from a utility you write."
Optionally a 7th "now painted" step layering utilities back (`text-2xl font-bold`, `space-y-*`, a real `<Button>` look) to show the *intended* end state and close the emotional arc on a high note — recommended.

Reasoning: a temporal subtraction is exactly `DiagramSequence`'s shape (the INDEX example is literally a pipeline scrub). Real CSS in the steps honors the "layout concepts rendered with real CSS, devtools-inspectable" html-css guidance and avoids fake screenshots. The arc *is* the lesson's thesis, so it earns the chapter's marquee diagram.

#### Recognize the reset, not a bug (exercise)

Goal: drill the *diagnosis* skill — the single most important takeaway. Given a flattened symptom, the student must classify it as "Preflight working as intended" vs an actual mistake.

Use `MultipleChoice` (or a short `TrueFalse` round) with realistic symptoms:
- "Your `<h1>` renders at body size — bug or Preflight?" → Preflight (intended).
- "Your `border` utility renders nothing because you disabled Preflight" → an actual problem caused by removing Preflight (the border-style dependency).
- "Your `<button>` no longer shows the OS native look" → Preflight (intended).
- Distractor that's a *real* bug: a typo'd utility class that genuinely didn't apply.
Each choice carries a `McqWhy`/`TfWhy` reinforcing "the reset is doing its job; the utility is your job" and the layer reasoning.

Reasoning: the chapter's stated terminal skill is reading a flattened element correctly. A classification exercise is the most direct check. Prefer `MultipleChoice` for the symptom-diagnosis framing; `TrueFalse` is an acceptable alternative if the writer wants more statements.

---

### Reading Preflight in DevTools

Goal: the recognition instrument, retargeted from L1/L2 (which already taught the Styles/Computed panels). Short section — this is muscle reuse, not new tooling.

Content:
- The move: select a flattened element, open the **Styles** panel, scroll to the bottom — Preflight's rule appears in a section labeled `@layer base`. Seeing it *in the base layer* is the whole recognition: it's beneath everything, it's a reset, and any utility you add (in `@layer utilities`) sits above it and wins.
- The mental sentence to attach to that sighting: **"the reset is doing its job; the utility is my job."** (Reuse L1/L2's phrasing.)
- Tie to the cascade trace from L1: if your `text-2xl` *is* there in `@layer utilities` and the heading is *still* body-sized, the bug isn't Preflight — trace it the L1 way (Computed → which layer → which rule). Preflight being visible in `base` is confirmation it's behaving, not the culprit.

Visual: a small custom lesson component is the right call here (matches L1's `ComputedPanelTrace` and L2's `InheritedFromPanel` pattern — both lessons built bespoke DevTools-panel mock components rather than screenshots). Propose a `PreflightInBaseLayer` lesson component at `src/components/lessons/019/3/`: a stylized Styles-panel fragment showing an element's own utility rule on top and, below it, a dimmed `@layer base` section with the Preflight rule (e.g. the `h1,h2,…{font-size:inherit;font-weight:inherit}` rule), with the `@layer base` label visually emphasized. Pedagogical goal: train the eye to spot the `@layer base` band and read it as "reset, beneath my utilities."

Reasoning: consistency with the chapter's established DevTools-component approach; screenshots are brittle and the prior two lessons deliberately avoided them. Keep it light — one component, a few lines of prose.

`Term` candidates: none new.

---

### When a senior brings defaults back: the two carve-outs

Goal: the *deliberate* exceptions. The senior doesn't strip Preflight; they make narrow, scoped additions in exactly two situations. This section also inoculates against the wrong fixes.

Frame first with the rule and its two carve-outs as a tight thesis, then take each carve-out.

**Carve-out 1 — `prose` for content you don't author element-by-element.**
The motivating case: Markdown- or CMS-rendered content. You receive a blob of HTML (`<h2>`, `<p>`, `<ul>`, `<blockquote>`, `<code>`…) you didn't write class-by-class, so you *can't* utility each element — and you *want* the typographic defaults back (real heading sizes, bulleted lists, link styling) for readable long-form text.
The tool: the `@tailwindcss/typography` plugin and the `prose` class. Show the install (verified current v4 syntax):
```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";
```
and the usage:
```tsx
<article className="prose dark:prose-invert max-w-prose">
  {/* rendered Markdown */}
</article>
```
Name the family for recognition only: `prose`, `prose-sm`/`prose-lg`, `prose-invert` (dark), `max-w-prose`/`max-w-none`.
The senior recognition: **`prose` is the *legitimate* way to re-style content you don't own — it's not "undoing Preflight," it's a scoped, tokenized type system applied where it belongs.** Mention `prose` is themeable via `@theme` tokens (`--prose-body`, `--prose-headings`, …) for one sentence — Ch027 L5 cashes this in for empty-state UI; name only.
Forward cross-ref: Ch027 L5 (empty-state prose). Do not teach the full typography API (chapter framing scope-cut).

**Carve-out 2 — scoped `@layer base` overrides for third-party widgets.**
The case: you embed a third-party widget (a payment iframe's host element, an embedded editor, a legacy script's DOM) that *expects* browser defaults and breaks without them. You bring defaults back **scoped to that widget's container**, inside `@layer base`, so it stays beneath your utilities and doesn't leak.
Show the shape:
```css
@layer base {
  .third-party-widget :where(h1, h2, h3) {
    font-size: revert;
    font-weight: revert;
  }
}
```
Note the `revert` keyword tie-back to L2 (rolls back to the UA value — exactly the right tool) and the `@layer base` + `:where()` choice tie-back to L1 (keep it in base so utilities win; `:where()` keeps specificity at zero). This is the rare moment L2's `revert` and L1's layer discipline pay off together.

Then the **rejected fixes** (inline as watch-outs in this section, per the no-orphan-tips rule — they belong with the carve-out they qualify):
- **Don't strip Preflight globally** to "fix" the flattened look. You'd lose `border-box`, the border-style reset (borders stop rendering), the form-control inheritance — and you'd be back to browser-divergent defaults. The cost is everywhere; the problem is local.
- **Don't `@apply h1 { … }` or write a global `h1 { font-size: … }`** to "restore" headings. That re-introduces an *unlayered or base* rule fighting your utilities — the exact anti-pattern L1 warned against. If you want default-looking headings on owned markup, just put the utilities on them; if it's un-owned content, that's `prose`.
- **Don't reach for `!important`.** There is nothing to beat — Preflight is in `base`, your utility in `utilities` already wins. `!important` here is L1's "bug smell" with no bug.

**The rare third case (recognition only):** omitting Preflight entirely. Legitimate *only* when shipping utilities into an environment that already has its own reset — a widget embedded in a third-party site, or a CMS with its own base styles, where two resets would collide. Name the mechanism (Tailwind lets you import layers selectively / omit `preflight.css`) at recognition depth; for a standard standalone SaaS app, **Preflight always loads.** Chapter framing scope-cuts the how.

Reasoning: this is where the lesson earns its senior framing — the discipline is "scope narrowly, stay in `base`, prefer `prose`/`revert` over brute force," and it directly reuses L1 (layers, `:where()`, `!important` smell) and L2 (`revert`). Bundling the rejected fixes *here*, attached to the carve-outs, satisfies the no-orphan-watch-outs rule and lands the "never strip it globally" thesis at the moment of maximum relevance.

`Term` candidates: **`prose`** (one-line: "the typography plugin's class that restyles raw HTML content with tokenized typographic defaults"); reuse `revert` understanding from L2 (a one-clause reminder, not a fresh `Term`, since L2 owns it).

#### Match the situation to the fix (exercise)

Goal: lock in *which lever* for *which situation* — the section's decision skill.

Use `Matching` (two-column drill — the component INDEX lists it; L1/L2 both used classification/matching-style drills). Left column = situations; right column = correct response:
- "Bare `<h1>` on markup you wrote looks like body text" → "Working as intended — add `text-2xl font-bold`."
- "A blob of rendered Markdown needs readable headings, lists, links" → "Wrap it in `prose`."
- "An embedded third-party widget breaks without browser defaults" → "Scoped `@layer base` override with `revert`."
- "A utility class isn't applying and Preflight is visible in `@layer base`" → "Not Preflight — trace the cascade (L1)."
- Decoy-adjacent: "Headings look small across the app" → (correct) "Intended — style them" / (wrong, surfaced in review) "Disable Preflight."

Reasoning: `Matching` fits a situation→response mapping cleanly and is a fresh exercise modality for the chapter (L1 used `Sequence`/`Buckets`/`Dropdowns`, L2 used `Buckets`/`TrueFalse`/`MultipleChoice`), keeping variety. Alternative if a richer branch is wanted: a small `StateMachineWalker` ("is it content you authored? → yes: style it / no: is it long-form? → prose / is it a third-party widget? → scoped revert"), but `Matching` is lighter and sufficient — prefer it unless the writer wants the decision-tree affordance.

---

### Preflight and the components you'll actually ship (closing)

Goal: the senior reframe to close on, tying Preflight to the rest of the stack the student is heading toward — short, no new mechanics.

Content:
- The practical reality: on a real project you almost never touch a bare `<button>`/`<input>`/`<h1>`. shadcn's `<Button>`, `<Input>`, and your own components are built *on top of* the blank canvas Preflight provides — they assume the reset ran and add tokenized styling. Cross-ref Ch027 (shadcn primitives) and Ch017 L5 (form element surface) for recognition only.
- The closing thesis (mirror L2's strong close): Preflight isn't a quirk to work around — it's the **clean foundation that every later styling decision in this course stands on.** You don't fight the blank canvas; you paint on it with utilities and components. The one time you bring defaults back, you do it scoped and intentional — `prose` for content you don't own, a narrow `@layer base` override for a widget that needs them — never globally, never with `!important`.
- One sentence forward to L4: the same `@layer`/inheritance substrate that makes Preflight predictable is what makes *design tokens* work — the next lesson, *Custom properties and the three-tier token model*.

Reasoning: L1 and L2 both close on a senior reframe that elevates the mechanic to an architecture decision; matching that shape keeps the chapter's voice consistent and sets up L4. Naming shadcn/forms as the real-world cash-in grounds the abstraction in the course's actual stack (pedagogy: production stakes).

---

### External resources (optional LinkCards)

A small `CardGrid` of `ExternalResource` cards, matching L1/L2's closing pattern:
- Tailwind docs — Preflight (`https://tailwindcss.com/docs/preflight`).
- Tailwind docs — `@tailwindcss/typography` plugin / `prose` (`https://github.com/tailwindlabs/tailwindcss-typography` or the official plugin page).
- Optional: a "modern CSS reset" explainer for the *why a reset exists at all* context (e.g. a current reset guide) — only if it adds durable value; don't pad.

Optional `VideoCallout`: only if a current, high-quality short video specifically on Tailwind Preflight surfaces during writing. L1 and L2 each embedded one well-targeted video; if a good Preflight-specific one exists, place it in *What Preflight strips* (the visual-payoff section). Do not force one — a generic Tailwind-intro video is not worth the embed. (Resourcer pass can fill this; leave a clear slot.)

---

## Scope

**Prerequisites (redefine in one clause max, do not re-teach):**
- The cascade four-gate model and `@layer` order — owned by **L1**. Here: only *use* the fact that `base` < `utilities`, and reuse the gate vocabulary. Do not re-derive the cascade.
- CSS inheritance and the weakest-source rule — owned by **L2**. Here: only *cite* that Preflight's `font: inherit` re-opens form controls (L2's debt) and that `border-color` defaults to `currentColor` via inheritance. Do not re-teach inheritance.
- `@import "tailwindcss"`, `@theme`, `@plugin` directives — owned by **Ch018 L2**. Here: show `@plugin "@tailwindcss/typography"` at the call site; don't re-explain the directive system.
- `revert`/`:where()` keywords — named at recognition in **L2/L1**; reuse with a one-clause reminder, not a fresh teach.

**This lesson does NOT cover (defer, with the owning lesson named so the writer redirects rather than teaches):**
- The cascade algorithm and specificity in general — **L1**. (Preflight's layer is named here; the model is L1's.)
- CSS inheritance as a model — **L2**. (Preflight's `font: inherit` choice is *cited*, not derived.)
- CSS custom properties and the three-tier design-token model — **L4 of this chapter**. Do not teach tokens here; the `--prose-*` tokens get a one-sentence name-drop only.
- The full `@tailwindcss/typography` API — cashed in lightly; **Ch027 L5** owns the prose-for-empty-state cash-in. Name `prose`/`prose-invert`/`max-w-prose` for recognition; no deep API.
- The box model and `box-sizing` semantics — **Ch020 L1**. Preflight *sets* `border-box`; that's all that's said. Use a `Term`, don't tangent.
- Form-element styling at depth and shadcn `<Button>`/`<Input>`/`<Form>` — **Ch027** + Unit 6's form pattern. Named for recognition in the closing; not taught.
- Typography sizing, line-height, the type scale — **Ch021 L1**. (`text-2xl`/`font-bold` used as throwaway demo utilities; the scale itself is L1 of Ch021.)
- OKLCH / color — **Ch021 L2**. (Placeholder's `color-mix` is mentioned in one clause max; don't open color spaces.)
- The `@tailwindcss/forms` plugin — **named for recognition only** (one sentence): the course does *not* ship it because shadcn's form components don't depend on it. Do not install or teach it.
- The actual `cursor: pointer` reset — **does not exist in v4**; do not teach it as Preflight (see framing's correction note).
- `cn()`/`tailwind-merge` — **Ch018 L3**; not relevant here, don't mention.

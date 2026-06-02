# How the browser picks a winning rule

- Title: How the browser picks a winning rule
- Sidebar label: The cascade

## Lesson framing

This is lesson 1 of Chapter 019, the *why* under Chapter 018's *what*. The student already writes utility classes, composes them with `cn()`, and ships semantic tokens swapped by a `.dark` block — but treats the result as a black box. This lesson opens the box: when two rules touch the same property on the same element, **how does the browser decide which one paints?** The answer is the cascade resolution algorithm, and the senior payoff is that it is *mechanical and predictable* — not a mystery to be brute-forced with `!important`.

The whole lesson is built around a single durable claim the student should leave with: **on a Tailwind v4 project, the layer step decides almost every conflict, so the senior fix for a losing rule is almost never specificity or `!important` — it's naming the right layer.** Everything else (the four-step algorithm, specificity tuples, `:where()`, DevTools) exists to support that claim and to let the student *recognize* the rarer cases where a different step decides.

Pedagogical spine, optimized for low cognitive load:

- **Lead with a concrete bug, resolve it with the model.** The lesson is bookended: it opens on a heading rendering at the wrong size (Preflight's `h2` reset vs. a `text-2xl` utility — a real conflict the student will hit), and closes by tracing that exact bug in DevTools to the layer that decided it and fixing it without `!important`. The model is the thing that turns the bug from scary to boring.
- **Build the algorithm as a waterfall, one gate at a time.** Four steps run *in order*; each only matters if the previous step tied. Teach them as a short-circuiting funnel, not four equal factors. This is the single most important mental model and gets the load-bearing diagram.
- **Reframe what the student already knows.** They've *seen* `@layer`, `@custom-variant dark (&:is(.dark *))`, the `!` modifier, and `cn()` in Chapter 018 — but as syntax, not as cascade mechanics. This lesson re-explains each as a cascade move: layers are step 2, the `:is/:where` wrap is a specificity-zero trick (step 3), `!` is the importance flag (step 1), `cn()` makes the source-order step (step 4) trustworthy. Connect, don't re-teach.
- **Senior framing throughout: `!important` is a bug smell, layers are the fix.** Beginners coming from other-field CSS reach for `!important` reflexively. The lesson's job is to install the reflex *layer, not bang* — and to name the two narrow cases where `!important` (via Tailwind's `!` modifier) is actually correct, so "never" doesn't become a lie the student catches the course in.
- **DevTools is the reading instrument, taught as a repeatable move.** Not a feature tour — one concrete three-click procedure (Computed → expand property → see which rule won and which layer it's in) the student can run on any conflict for the rest of their career.

The student should finish able to: state the four steps in order; predict which rule wins a Tailwind-vs-custom-CSS conflict (and know it's the layer step that usually decides); explain why unlayered custom CSS silently beats every utility; read a specificity tuple and know `:where()` zeroes it; justify why `!important` is a smell and name the two carve-outs; and trace any cascade conflict in DevTools.

Estimated length: a substantial lesson (~50-60 min), exercise-heavy per the chapter plan. Three load-bearing visuals (the cascade waterfall SVG, a layer-stack figure, a specificity-tuple figure) and a spread of exercises (`PredictOutput`, `Buckets`, `Dropdowns`, `CodeReview`, `MultipleChoice`, one `HtmlCssCoding`).

## Lesson sections

### Introduction (no header)

Per the pedagogical guidelines, open warm and brief with the concrete senior problem — no h2.

Open on the bug: a `<h2 className="text-2xl">` that renders smaller than expected, or a custom `.btn` class that mysteriously loses to a utility (pick the heading-size framing from the chapter outline as primary — it sets up Preflight, lesson 3's topic, without teaching it). State plainly: two rules both set `font-size` on this element; one wins; today's lesson is *the rule the browser uses to pick*. Name the deliverable: by the end, the student can trace any "why is this style not applying?" conflict to the exact step that decided it, and fix it the senior way.

Connect to prior knowledge in one sentence: the student has been *writing* `@layer`, the `!` modifier, and `cn()` since Chapter 018 — this lesson explains the machine those were quietly feeding.

Keep it to ~4-6 sentences. No diagram here; the first diagram lands in the algorithm section where it does work.

### The cascade is a four-gate waterfall

The core section. Teach the algorithm as the spine of the whole lesson.

Content:

- State the four steps **in the order the browser runs them**, named not derived (the chapter outline is explicit: "named in the order the browser runs them, not derived"): (1) **origin and importance**, (2) **cascade layer**, (3) **specificity**, (4) **source order**.
- The key mental model: it's a **short-circuiting waterfall**. The browser collects every declaration that targets the element and sets the same property, then drops them through the gates in order. The first gate that produces a single winner stops the process; each later gate only adjudicates the ties the previous gate left. Make explicit that most conflicts are decided by gate 1 or 2 and never reach specificity — this directly contradicts the instinct (from school-CSS or Stack Overflow) that "specificity is how CSS conflicts get resolved."
- Briefly gloss each gate at the depth needed to understand the waterfall (each gets its own deeper section after):
  - **Origin and importance**: who wrote the rule (browser/user-agent, user, author-you) crossed with whether it's `!important`. For a SaaS app, author styles are essentially everything; the gate mostly matters because `!important` *inverts* the normal order. Defer detail to the `!important` section.
  - **Cascade layer**: which `@layer` the rule lives in; later-declared layers win; **unlayered beats every layer**. Flag this as *the* gate that decides Tailwind conflicts.
  - **Specificity**: the familiar tuple, but explicitly demoted — it only breaks ties *within* one layer.
  - **Source order**: last rule in the file wins; the final tiebreaker.
- The 2026 reality callout (from the chapter outline): on a Tailwind v4 project the bug is almost always the **layer** step (custom CSS left unlayered, so it beats utilities) or the **source-order** step (two conflicting utilities not run through `cn()`). Specificity wars are rare because utilities are nearly all single-class (specificity 0,1,0). Plant this now; the rest of the lesson pays it off.

**Diagram — the cascade waterfall (the chapter's load-bearing SVG).** Hand-coded SVG inside `<Figure>` (engine: SVG per the diagrams INDEX — "picture of a specific thing", a custom vertical artifact). Pedagogical goal: make the *short-circuit* visible — that a winner can fall out at any gate and skip the rest. Shape: a vertical stack of four labeled gates (Origin & importance → Layer → Specificity → Source order), a cluster of candidate declarations entering at the top, and a visual cue (a side exit / "decided here" tag) at each gate showing a winner can drop out early. Annotate each gate with its one-line tiebreak rule. Keep it horizontal-friendly and compact per the SVG guidance (cap height, `currentColor` for primary strokes, fixed mid-gray for secondary leader labels, `viewBox` cropped tight). Caption: one sentence naming it as the algorithm every browser runs, top to bottom, stopping at the first gate with a single winner.

Consider `Term` tooltips here for **cascade** ("the algorithm the browser uses to resolve which CSS declaration wins for each property on each element"), **declaration** ("a single `property: value` pair inside a rule"), **user-agent stylesheet** ("the browser's built-in default styles").

**Exercise — `Sequence`.** Right after the diagram, a `Sequence` drill: shuffle the four gates, student drags them into the order the browser applies them. Cheap, fast reinforcement of the single most important takeaway (the order). Source order in the component = correct order.

### Tailwind v4's four layers, and the trap of leaving CSS unlayered

Deepen gate 2 (layer), the gate that decides most real conflicts. This is where the lesson earns its keep.

Content:

- Name the four layers Tailwind v4 emits, in declared order: **`theme`, `base`, `components`, `utilities`** — generated by the single `@import "tailwindcss"` (cross-ref Chapter 018 lesson 2, which installed that import; do not re-teach it). Later layer wins, so a `utilities` rule beats a `base` rule **regardless of specificity** — that's *why* `text-2xl` (utilities) beats Preflight's `h2` reset (base), which is the answer to the opening bug. Call that back explicitly here.
- The load-bearing surprise (verified against current Tailwind v4 behavior): **unlayered CSS beats all four layers.** Any rule you write at the top level of `globals.css` *outside* an `@layer` block sits above `utilities` in the cascade and silently wins over every utility — even a bare `h2 { font-size: ... }` beats `text-2xl`. This is the single most common Tailwind styling bug. In v4 specifically, external/unlayered stylesheets now resolve *after* `@layer components`, so a third-party CSS file or an unlayered custom rule overrides component-layer and utility-layer styles. State this as the headline watch-out.
- When each layer earns its weight (the senior reflex — *every custom CSS rule names its layer*):
  - **`@layer base`** for global element-level styling — resets and element baselines (`h2`, `code`, `kbd`, links). This is where the student's own global element rules belong so utilities can still override them per-element.
  - **`@layer components`** for the rare bespoke-component case utilities genuinely can't express. Threshold framing: reach for it only when no utility composition works; most "components" are React components with utility class strings, not CSS classes.
  - `theme` and `utilities` are Tailwind-managed; the student authors into `base` and `components`.
- `@import` order determines layer declaration order (watch-out, named): the layer statement at the top of the generated CSS fixes the order; where your `@import`s sit relative to it matters.

**Diagram — the layer stack (HTML+CSS Figure).** A vertical stack figure (engine: plain HTML+CSS per INDEX — color-coded segments with a callout; devtools-inspectable is a bonus here since the topic *is* the cascade). Goal: show the five tiers in cascade order bottom-to-top — `theme`, `base`, `components`, `utilities`, then an **Unlayered (your stray CSS)** tier sitting *on top* of utilities, visually flagged (warning tint) as "wins by accident." Reinforces both the order and the trap in one glance. Wrap in `<Figure>`; apply the `margin: 0` prose-margin fix to every inner div per the HTML+CSS guidance. Caption names the unlayered tier as the usual culprit.

**Code — the fix pattern.** A short before/after using `CodeVariants` (two related versions of the same `globals.css` snippet — the natural fit per the component index): **"Bug"** tab = a bare `.btn { background: ... }` written unlayered, losing... wait, *winning* over a utility the consumer passed; **"Fix"** tab = the same rule moved into `@layer components { .btn { ... } }` so utilities can override it again. Use `ins=`/`del=` marks. One paragraph of prose per tab. This is the worked-example pattern from the chapter outline (unlayered `.btn` fighting utilities, fixed by moving into `@layer components`). Keep the CSS minimal — the lesson is the `@layer` wrapper, not the button.

**Exercise — `Buckets`.** Two buckets: **`@layer base`** ("global element baselines") and **`@layer components`** ("bespoke component CSS utilities can't reach"). Items to sort: a global `h2` size reset; a link-underline default; a `kbd` chip style; a complex multi-element `.timeline` widget rule; a `.card` with a pseudo-element decoration; an element-level `::selection` color. Plus a deliberate third bucket or a watch-out item — actually keep it two-column, two-bucket for clarity; classification of base-vs-components is the assessable skill. `instructions` should remind them: utilities live above both, so anything you want a utility to override goes in a *layer*.

### Specificity, and the `:where()` zero-specificity trick

Cover gate 3, explicitly demoted relative to layers.

Content:

- The four-part specificity tuple: **(inline styles, ID selectors, class/attribute/pseudo-class selectors, element/pseudo-element selectors)**. Compared left-to-right; higher first component wins outright. Concrete reads: a single utility class = `(0,0,1,0)`; `#header` = `(0,1,0,0)` beats any number of classes; inline `style={{}}` = `(1,0,0,0)` beats everything class-based (but still loses to `!important` and to layer order — foreshadow). `*` (universal) contributes `(0,0,0,0)`.
- The crucial demotion (the recognition the chapter outline asks for): **specificity only adjudicates ties within a single layer.** Across layers, layer order has already decided before specificity is consulted. So on a Tailwind project, specificity matters mainly *inside* `@layer base` (where your element rules and Preflight coexist) — almost never between a utility and your custom CSS, because the layer gate fired first.
- **`:where()` — the specificity-zero wrapper.** Anything inside `:where(...)` contributes **zero** to specificity, no matter how complex the selector inside is. Re-explain the Chapter 018 dark-mode line through this lens: the student wrote `@custom-variant dark (&:is(.dark *))` (note: the shipped course code uses `:is`, while Tailwind's own docs show the `:where(.dark, .dark *)` form — flag both, see Scope). The point that matters here: wrapping a selector in `:where()` lets a framework match elements *without* inflating specificity, so author utilities stacked on top still win the specificity tie. `:is()` by contrast takes the specificity of its most specific argument — that's the one behavioral difference worth naming. Keep this tight; the student doesn't *write* `:where()` directly in app code, they *recognize* why Tailwind uses it.
- Inline `style={{}}` always beats class-based rules (watch-out from the chapter outline) — `(1,0,0,0)` outranks `(0,*,*,*)`. The senior consequence: don't reach for inline styles to "win" a conflict; that's the same anti-pattern as `!important`, just spelled differently. (The legitimate use of `style={{}}` for *dynamic* values — e.g. CSS custom properties — is lesson 4's territory; name the boundary, don't teach it.)

**Diagram — the specificity tuple (small SVG or HTML+CSS Figure).** A compact figure showing the four-slot tuple as four labeled boxes `(inline, ID, class/attr/pseudo, element)` with two or three example selectors scored beneath, lined up column-by-column so the student sees how the comparison reads left-to-right. Goal: make the tuple concrete and show `:where(...)` collapsing its contents to `(0,0,0,0)`. Small, horizontal, capped height. Prefer HTML+CSS for column alignment (use fixed-width wrapper per the alignment guidance) or a tight SVG. Caption: "Compared left to right; the first non-tie slot decides — but only after layer order has already had its say."

**Exercise — `Dropdowns` (fenced-code mode).** Show three or four tiny selector pairs and have the student pick which wins via dropdowns, OR fill in the computed tuple slot values. A clean fit: a fenced block listing selectors (`.btn`, `#cta`, `a:hover`, `:where(.dark) .btn`) with `___` blanks for their specificity tuples, `answers` supplying the correct tuples. Tests the read-the-tuple skill directly. Keep options as the literal tuple strings.

### `!important` is a smell, and the two times it isn't

Cover the importance half of gate 1, and install the senior reflex.

Content:

- Why `!important` is a bug smell on a 2026 stack: it short-circuits the *entire* normal cascade (it's adjudicated at gate 1, before layers, specificity, or source order). Reaching for it means abandoning the predictable machine instead of fixing the actual problem — which on a Tailwind project is *almost always* "my CSS is in the wrong layer (or no layer)." The senior fix for a losing rule is to **move it to a later layer or into `@layer base`/`components` correctly**, not to bang it. Make the causal chain explicit: `!important` is what you reach for when you don't understand the layer gate; once you do, you stop needing it.
- The genuinely subtle bit worth teaching (verified): with cascade layers, `!important` **inverts** the layer order. A normal declaration in a *later* layer beats a normal declaration in an *earlier* one — but an `!important` declaration in an *earlier* layer beats an `!important` (and normal) declaration in a later one. This is why `!important` is doubly confusing in a layered codebase, and another reason to avoid it. Name it as a recognition, not a tool ("important inversion is real but rare").
- The two legitimate carve-outs (so "never" is honest):
  1. **Overriding third-party inline styles** you don't control (a widget that ships `style="..."` on its root). Tailwind's `!` postfix modifier (`bg-white!`, from Chapter 018 lesson 1) is the idiomatic spelling — it emits an `!important` utility. This is the SaaS-relevant case.
  2. **User-stylesheet accessibility overrides** — a user's own stylesheet forcing high contrast or larger text. Out of scope for the project (it's the *user's* CSS, not yours); named for completeness only.
- Worked pattern (the chapter outline's): an unlayered `.btn` fighting utilities — the *wrong* fix is `.btn { background: ...; !important }`; the *right* fix is `@layer components { .btn { ... } }`. (This pairs with / reinforces the `CodeVariants` block from the layers section — cross-reference rather than duplicate; here the contrast is "bang it vs. layer it," there it was "unlayered vs. layered." Consider folding into one richer `CodeVariants` with three tabs: Bug / Banged / Layered — but keep it readable; if three tabs crowds the prose, keep them split across the two sections and cross-reference.)

**Exercise — `MultipleChoice` (single-correct).** A scenario question: "A custom `.btn`'s background keeps losing to a `bg-primary` utility a consumer passed. What's the senior fix?" Options: add `!important`; raise specificity with `#id`; move `.btn` into `@layer components`; reorder the class string. Correct: the layer move. `McqWhy` ties it back to the waterfall (the layer gate decides before specificity; `!important` and IDs are fighting the machine). Per the MCQ doc, phrase options so they're not verbatim from prose — make the student reason.

### Source order, and why `cn()` makes it trustworthy

Cover gate 4 and connect to the Chapter 018 `cn()` tool the student already has.

Content:

- Source order is the final tiebreaker: when two declarations survive all earlier gates tied (same origin/importance, same layer, same specificity), the one that appears **later in the generated CSS** wins. For utilities this is the common case — `px-4` and `px-8` are both single-class `(0,0,1,0)` in the same `utilities` layer, so it comes down to whichever Tailwind emitted last.
- The trap (chapter outline's "source-order trap"): **the order of classes in your `className` string does NOT decide the conflict.** `className="px-8 px-4"` and `className="px-4 px-8"` produce the *same* result, because the winner is fixed by Tailwind's emission order in the compiled stylesheet, not by your string. This is build-dependent and silent — exactly the bug Chapter 018 lesson 3 introduced.
- The fix the student already owns: **`cn()` (clsx + tailwind-merge)** resolves the conflict *before it reaches the cascade* by deduplicating to a single surviving class. `cn('px-8', 'px-4')` → `'px-4'` — only one `px-*` ever reaches the DOM, so the source-order gate has nothing to adjudicate. Frame the senior reflex: "for utility conflicts, don't reason about source order at all — run them through `cn()` and the ambiguity disappears." Cross-ref Chapter 018 lesson 3 explicitly; do **not** re-teach `cn()`'s internals (that's that lesson's job) — here it's named as the thing that makes gate 4 a non-issue.

**Exercise — `PredictOutput`.** A small framing where the *prediction* is which value wins. Either: a `PredictOutput` whose "program" is a tiny snippet logging the computed `padding` of an element with `className="px-8 px-4"` (answer: the value tailwind-merge/source-order yields, demonstrating the string order is irrelevant) — or, cleaner given `PredictOutput`'s console framing, reframe as a short JS snippet that reads `getComputedStyle(el).paddingLeft`. `PredictWhy` explains: the class-string order didn't matter; emission order did, and `cn()` removes the ambiguity. If the console framing feels forced, substitute a `MultipleChoice`: "Which padding renders?" with the same payload. Author's choice — prefer whichever reads most honestly without contorting the snippet.

### Reading the cascade in DevTools

The reading-instrument section. Teach one repeatable procedure, not a feature tour.

Content:

- The **Styles panel** shows every rule targeting the selected element in cascade order, with **overridden declarations struck through** — the immediate visual signal that "this rule lost." Losing declarations are crossed out; the winner is the one that isn't.
- The **Computed panel** is the authoritative view: it shows the *final* value of every property, and expanding a property reveals the **trace** — which rule supplied the winning value, and (in modern Chrome/Firefox) which **cascade layer** it came from. The **Cascade Layers** indicator (Chrome 99+, Firefox 97+ — both long-since shipped and universal in 2026) labels each rule with its layer, so "unlayered vs. `@layer utilities`" is visible at a glance. The `!important` flag is shown on declarations that carry it.
- **The three-click move** (the durable skill — state it as a numbered procedure the student keeps forever): (1) select the element, open **Computed**; (2) expand the misbehaving property to see its **trace**; (3) read **which rule won and which layer it sits in** — if the winner is unlayered or a later layer than you expected, you've found the bug. This procedure resolves "why isn't my style applying?" without guessing.

**Diagram / visual — annotated DevTools screenshot.** Use `Screenshot` (per component index, for embedding a real UI capture) of the Computed panel with a property expanded showing the trace + layer label, with a short caption pointing at the struck-through loser and the winning layer. If a clean capture isn't feasible at authoring time, fall back to a small HTML+CSS *mock* of the panel rows (a faux Computed-panel list with one struck-through row and one winner row tagged with its layer) inside `<Figure>` — the mock is enough to teach the *where to look*, and is theme-safe. Author should prefer the real screenshot if available, mock otherwise. Goal: the student knows exactly which panel and which affordance reveals the deciding layer.

`Term` tooltip candidate: **Computed panel** ("DevTools view showing each property's final resolved value and the rule that supplied it").

### Closing the loop: trace the opening bug and fix it

Short synthesis section — pays off the opening, models the end-to-end senior workflow the chapter is building toward (the chapter ends with the student tracing a real bug to a Preflight rule and fixing it with a layered override, no `!important`). This lesson seeds that habit.

Content:

- Return to the opening heading bug (or the `.btn` bug). Walk the full loop in prose, tightly: symptom → open Computed → trace shows `text-2xl` (utilities) is actually winning *or* an unlayered rule is stealing the win → the deciding gate is **layer** → fix by putting the offending custom rule in the right `@layer` (or, for the heading case, recognizing the cascade is working correctly and the real issue is elsewhere — which sets up Preflight in lesson 3). Keep this to a few sentences; it's a victory lap, not new material.
- One-paragraph synthesis of the mental model the student leaves with: **the cascade is a four-gate waterfall (origin/importance → layer → specificity → source order); on a Tailwind v4 app the layer gate decides almost everything; the senior fix for a losing rule is naming its layer, not `!important` or a higher-specificity selector; and DevTools' Computed trace tells you which gate decided in three clicks.**

**Capstone exercise — `HtmlCssCoding` (with `tailwind`).** A small guided fix-it. Per the live-coding index, `HtmlCssCoding` with `tailwind={true}` wires the Play CDN — suitable for a utility-vs-CSS cascade demo without spinning up `ReactCoding`. Setup: an `<h2 class="text-2xl">` (or a `.btn` with both a custom CSS rule and a utility) where an **unlayered** custom rule in the CSS pane is beating the utility; the student's task is to wrap the custom rule in `@layer components { ... }` (or `@layer base`) so the utility wins again. `live` preview shows the size/color flip the moment they layer it. Add `tests` asserting the computed property matches the utility's value (e.g. `getComputedStyle(h2).fontSize` equals the `text-2xl` size, proving the layer move worked). Instructions frame it as: "This rule is winning by accident because it's unlayered. Move it into a layer so the utility can override it." This is the hands-on payoff and the single best assimilation vehicle for the lesson's core claim.

Alternatively, if the Play-CDN `@layer` interaction proves finicky in the iframe at authoring time, downgrade to a `CodeReview` on a `globals.css` diff (student flags the unlayered rule with `kernel="custom CSS left unlayered beats every utility; move it into @layer base/components"`). Author should try the live exercise first — it's far stronger pedagogically — and fall back to `CodeReview` only if the CDN can't render layered output reliably.

### External resources (optional)

A small `CardGrid` of `ExternalResource` cards at the very end (per pedagogical structure, optional LinkCards):

- MDN — "Cascade, specificity, and inheritance" (the canonical reference; inheritance is lesson 2's topic but the cascade half is on-point here).
- MDN — `@layer` / cascade layers.
- Tailwind v4 docs — functions and directives (`@layer`, the `!` modifier), to ground the layer model in the official source.

Keep to 2-3 cards; this is supplementary, not required reading.

## Scope

**Prerequisites to restate concisely (do not re-teach):**

- That `@import "tailwindcss"` brings in the utilities and emits the layers (installed Chapter 018 lesson 2) — name it, don't re-explain the CSS-first config.
- That `cn()` = `clsx` + `tailwind-merge` and resolves utility conflicts (installed Chapter 018 lesson 3) — name it as the source-order fix, point back, don't re-teach internals.
- That `@custom-variant dark (&:is(.dark *))` exists in `globals.css` (installed Chapter 018 lesson 5) — reuse it only as the `:is/:where` specificity example.
- The `!` important modifier on utilities (`bg-white!`, Chapter 018 lesson 1) — reuse as the `!important` carve-out spelling, don't re-introduce.
- Basic utility-class syntax, variants, semantic tokens — all assumed from Chapter 018.

**Explicitly out of scope (belongs to other lessons — do not teach here):**

- **CSS inheritance** and the `inherit`/`initial`/`unset`/`revert`/`revert-layer` keywords — lesson 2 of this chapter. The cascade decides *which rule wins*; inheritance decides *what flows down the tree when no rule applies*. Keep them separate; if inheritance comes up, defer.
- **Preflight's specific reset rules** — what exactly it strips (heading sizes, list bullets, form typography) — lesson 3. This lesson uses "Preflight sets an `h2` baseline in `@layer base`" only as a *conflict participant* to motivate the layer gate; it does not enumerate what Preflight resets.
- **CSS custom properties at depth and the three-tier design-token model** — lesson 4. The `--color-*` tokens are mentioned only as "what utilities compile to"; the runtime-reactive binding model, `getComputedStyle`/`setProperty`, `@property`, and primitive/semantic/component tiers are all lesson 4.
- **`cn()` / `tailwind-merge` internals** — Chapter 018 lesson 3 owns them; cross-referenced only.
- **`@custom-variant` and `@utility` authoring** — Chapter 018 lesson 2 owns them.
- **The browser layout engine and box model** (how the cascade feeds layout/paint) — Chapter 020.
- **CSS-in-JS / styled-components history** — out of scope; the course pins Tailwind. No historical detour into how cascade problems were solved pre-Tailwind.
- **Typography and color systems at depth** (`text-*` scale internals, OKLCH) — Chapter 021.

## Code conventions note

`documentation/code standards/Code conventions.md` has no CSS-cascade/layer section — the canonical conventions there cover server/data/schema concerns (Drizzle FK `cascade`, RLS), which are unrelated to this lesson's CSS `@layer`. So there's nothing to align to or diverge from; the cascade material is genuinely new surface for the course. CSS code samples should follow the project's existing `globals.css` shape from Chapter 018 (single `@import "tailwindcss"`, `@custom-variant dark (&:is(.dark *))`, `@theme`/`.dark` token blocks) so the student sees continuity. Use the **shipped** `:is(.dark *)` form in any code that mirrors the project file, and only mention the docs' `:where(.dark, .dark *)` form in prose as the specificity-0 textbook variant (see Scope flag below).

**Authoring flag for downstream agents:** there is a real, deliberate discrepancy to handle carefully. The course's shipped `globals.css` (Chapter 018) uses `@custom-variant dark (&:is(.dark *))`, but Tailwind's own v4 docs present `(&:where(.dark, .dark *))` as the specificity-zero form. For the *specificity lesson* the `:where()` form is the better teaching example (it actually zeroes specificity; `:is()` inherits its argument's specificity). Recommended handling: teach `:where()` as the concept ("wrap in `:where()` to contribute zero specificity"), then note in one line that the course's dark variant happens to use `:is(.dark *)` — whose specificity comes from `.dark` (a single class, `(0,1,0)` on the wrapper) — and that this is fine in practice because the `.dark` toggle lives on `<html>` and the token swap doesn't fight utility specificity. Don't silently "correct" the shipped code; explain the nuance. This is the one place the lesson must be precise or it will teach a subtly wrong fact.

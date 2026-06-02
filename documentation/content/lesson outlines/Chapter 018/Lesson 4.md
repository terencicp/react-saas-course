# Variants that read DOM state

- Title (h1): `Variants that read DOM state`
- Sidebar label: `DOM-state variants`

---

## Lesson framing

**The one idea.** A Tailwind variant is a CSS-selector wrapper. Lesson 1 taught the *plain* variants (`hover:`, `focus-visible:`, `checked:`, `sm:`) and pinned the model: `hover:bg-primary` ≈ `&:hover { background: … }`. This lesson cashes that model for the variants that read *richer* state — state the DOM already tracks (`:has()`, `:invalid`, parent/sibling state) or that JSX already sets (`data-*`, `aria-*`). The senior payload is one reflex: **before reaching for `useState` to drive a style, ask "can the DOM already tell me this?" If yes, write a variant — no state, no handler, no re-render.**

**Why this matters now / the pain it relieves.** The student has React on the horizon (state lands in Chapter 024) but hasn't met it yet. That's the perfect moment to install the discipline *before* the `useState` hammer exists, so they never learn the anti-pattern of mirroring DOM facts into React state. The naive React dev wires `onMouseEnter`/`onMouseLeave` + `useState(false)` to highlight a card on hover, or tracks "is this accordion open" in three places. The senior writes `group-hover:` and `data-[state=open]:` and ships zero JS. Framing this as "the styling you *don't* write" is the hook.

**Mental model to leave them with.** Every variant compiles to a selector. The variant families are organized by *whose* state the selector reads:
1. **My own state** — pseudo-classes (`hover:`, `:invalid`, `:disabled`) and JSX-set attributes (`data-*`, `aria-*`) on the same element.
2. **My parent's state** — `group-*` (parent marked `group`).
3. **My sibling's state** — `peer-*` (mark an earlier sibling `peer`; a later sibling reads it).
4. **My descendants' state** — `has-*` (the `:has()` parent selector).
5. **My position among siblings** — `first:`, `last:`, `odd:`, `empty:`.

That five-way "whose state?" taxonomy is the spine of the lesson. It's what turns a memorized list of prefixes into a recognition skill.

**Cognitive-load staging.** Start from the already-known plain variant (the selector-wrapper model from L1), then add one axis at a time: self-attributes (`data-*`/`aria-*`) → parent (`group`) → sibling (`peer`) → descendant (`has`) → position. Each new family is "same selector-wrapper idea, just a wider selector." Never introduce two new axes in one breath. The `data-state` Radix convention is named but explicitly *forward-pointed* (Radix lands at lesson 1 of chapter 027) — here it's just "a value some libraries set; you can style by it."

**Real production stakes.** Every shadcn primitive the student will paste in Chapter 027 ships these variants pre-wired (`data-[state=open]:`, `aria-[invalid=true]:`, `peer-disabled:`). This lesson is the literacy that makes that generated code readable instead of magic. The `aria-*` framing carries an accessibility dividend the lesson should name once: an `aria-expanded` attribute serves *two* readers at once — assistive tech announces it and Tailwind styles by it. One source of truth, no drift. (a11y depth is deferred to Chapter 027.)

**Code-sample stance.** Heavy on live `ReactCoding` target-match exercises — this is a tactile, "watch the chevron rotate" topic and the CDN resolves every built-in variant used here (`data-*`, `aria-*`, `group`, `peer`, `has`, positional) with no custom `@theme` needed (the L2 constraint about custom tokens does not bite us). Lean on `target` + `live` so the student slides classes in and watches state-driven paint without writing a single handler. Diagrams carry the selector-desugaring (the "variant → CSS" reveal) and the decision reflex (a `StateMachineWalker`). Keep prose terse; the student is past bootcamp framing.

**Token discipline (carry-forward).** Use semantic role-named tokens in every sample — `bg-card`, `text-muted-foreground`, `border-destructive`, `bg-primary` — never `bg-blue-500`. This chapter pre-wires L5's token model and the convention is already established in L1–L3. Apply `focus-visible:` rings on interactive elements and `motion-reduce:` on the one rotating chevron, per the chapter's standing rules.

---

## Lesson sections

### Introduction (no heading)

Open on the four concrete UI moments from the chapter outline, framed as the senior question: a disclosure chevron rotates when its panel opens; an inline error turns the field red when the input is invalid; a card lifts on hover; a submit button dims when any field inside it is invalid. Name the naive reach (a `useState` + handler for each) and the cost (state that mirrors a DOM fact, can desync, and re-renders). Then the turn: **all four facts are already in the DOM.** The browser knows hover and validity; the open panel sets `data-state="open"`; `:has()` sees the invalid descendant. This lesson teaches the variants that read those facts so the styling writes itself.

Preview the deliverable skill: by the end they can style any state-driven UI change by choosing the right variant family, and they own the reflex of checking the DOM before reaching for state. Connect explicitly back to L1's selector-wrapper model (the load-bearing prerequisite) and forward to React state as the *fallback*, not the default. Keep it to ~4 short paragraphs, warm and brief.

**Why first:** the whole lesson is one reflex; the intro must plant it before any syntax so every family reads as an instance of it.

### A variant is a selector around the utility

Re-establish (concisely — it's L1's model, not new) the desugaring with the dense canonical example the chapter reuses: `hover:bg-primary` → `&:hover { … }`, `md:p-6` → `@media … { … }`. Then extend it one step: if a variant is *any* selector wrapper, then **anything a CSS selector can target, a variant can express** — including attribute selectors (`[data-state="open"]`), pseudo-classes the browser maintains (`:invalid`, `:disabled`), and the relational selectors (`:has()`, sibling combinators). That single generalization is the lesson's engine; state it explicitly.

Introduce the **"whose state?" taxonomy** here as the organizing frame (self / parent / sibling / descendant / position). Render it as a compact diagram so it anchors the section order that follows.

**Diagram — "Variant desugars to a selector" (DiagramSequence).** 3–4 steps, each a two-row panel: top row the JSX class string, bottom row the emitted CSS rule, with the active variant→selector pair highlighted.
- Step 1: `hover:rotate-180` → `&:hover { rotate: 180deg }` (known, the anchor).
- Step 2: `data-[state=open]:rotate-180` → `&[data-state="open"] { rotate: 180deg }` (new: attribute selector).
- Step 3: `group-hover:opacity-100` → `.group:hover & { opacity: 1 }` (new: the selector reaches *up* to an ancestor).
- Step 4: `has-[:invalid]:border-destructive` → `&:has(:invalid) { border-color: … }` (new: the selector reaches *down*).
Pedagogical goal: make "variant = selector" literal and show that the *only* thing changing across families is the shape of the selector. This is the single most important visual in the lesson — it converts five prefixes into one rule.

**Diagram — the "whose state?" map (Figure + HTML/CSS).** A small element-relationship sketch: a center "this element," an ancestor box above (`group`), a sibling box beside (`peer`), a child box inside (`has`), and a self-label, each tagged with its variant family. Goal: a one-glance spatial mental model the reader can map every later prefix onto. Caption ties each arrow to its section. Keep under ~400px tall, horizontal.

**Why here / why these diagrams:** the desugaring is the conceptual key; teaching it once, visually, lets every subsequent family be introduced in two sentences. The relationship map gives the section order a spine.

### Styling by `data-*` attributes

Teach the form `data-[attr=value]:utility` and the bare-attribute form `data-loading:` (presence test, no `=value`). Anchor on the fact (established lesson 6 of chapter 017) that `data-*` is a custom attribute JSX writes verbatim — this lesson adds *reading it back as a style*, not the attribute itself. Three use-cases, in order:
1. **Library-set state** — `data-state` with values `open`/`closed`/`active`/`inactive`. Frame as "a convention some component libraries (the ones you'll meet in Chapter 027) stamp on their elements; you style by it." Canonical example: the disclosure chevron — `data-[state=open]:rotate-180 transition-transform motion-reduce:transition-none`. Explicitly say `data-state` is the *library's* convention, not Tailwind's and not something the student invents arbitrarily.
2. **Project-defined `data-*`** — `data-[variant=ghost]:`, `data-loading:` on the student's own elements when a JS value needs to drive a style. The bridge: set the attribute from a value, style by the attribute, skip the conditional class.
3. **Toggle state** — `data-theme="dark"` named as the forward hook to L5/L6 (one line, no depth).

**Sample handling.** A short `Code` block for the chevron pattern, then an `AnnotatedCode` on a small disclosure markup (a `<button>` + panel both carrying `data-state`) to show the attribute and the variant in the same file, highlighting (a) where the attribute lives, (b) the `data-[state=open]:` variant, (c) the `transition` + `motion-reduce:` pairing. Keep ≤12 lines.

**Live exercise — `ReactCoding` (target-match, `live`).** Give a chevron `<svg>` (or a Lucide-style glyph) on a button that hard-codes `data-state="open"`; the student adds `data-[state=open]:rotate-180` (+ transition) to match the rotated target. No React, no handler — the attribute is static in the starter, proving the point that the *style* needs no JS. Grading: target visual match. This is the "feel the variant" beat.

**Tooltip (`Term`):** "disclosure widget" (a button that shows/hides a panel — accordion, dropdown, collapsible).

**Why here:** `data-*` is the most general attribute variant and the one shadcn leans on hardest; leading with it makes the rest of the families feel familiar.

### Styling by `aria-*` attributes

Two flavors of ARIA variant — **draw the line clearly, it's the trap in this section:**
- **Built-in shorthands** ship only for the boolean ARIA attributes, and each targets the `="true"` case: `aria-busy:`, `aria-checked:`, `aria-disabled:`, `aria-expanded:`, `aria-hidden:`, `aria-pressed:`, `aria-readonly:`, `aria-required:`, `aria-selected:`. So `aria-expanded:rotate-180` ≈ `&[aria-expanded="true"] { … }`.
- **Arbitrary form** `aria-[attr=value]:` for everything else — value-bearing attributes and any attribute without a shorthand. **`aria-current` and `aria-invalid` have no built-in shorthand** (verified against the v4 docs, June 2026); write `aria-[current=page]:` and `aria-[invalid=true]:`. Call this out explicitly — a student will assume `aria-current:` exists because `aria-expanded:` does, and the class will silently emit nothing.

The headline idea — state it once, plainly: **an ARIA attribute is read by two audiences at the same time.** Assistive tech announces it; Tailwind styles by it. One attribute, one source of truth, no chance of the visual and the announced state drifting. That's the senior reason to prefer `aria-[current=page]:bg-accent` on a nav link over a `useState`-tracked "active" boolean.

Two worked examples:
- `aria-current="page"` on the active nav link → `aria-[current=page]:font-semibold aria-[current=page]:text-foreground` (the rest of the nav stays muted). Note the arbitrary form: `current` takes a value (`page`/`step`/`true`/…), so there is no shorthand.
- `aria-[invalid=true]:border-destructive aria-[invalid=true]:ring-destructive/20` on an input — preview of the form pattern that L5 will cross with semantic tokens; name it as such.

Watch-out, named inline (not a separate section): **ARIA values are strings, not booleans.** `aria-expanded` is `"true"`/`"false"`; `aria-pressed` likewise. The built-in `aria-expanded:` shorthand specifically targets the `="true"` case — `aria-[expanded=false]:` is the explicit form when needed. This trips people who expect JS truthiness.

Forward-point ARIA depth (roles, live regions, the first rule of ARIA) to lesson 3 of chapter 027 in one line — this lesson is the *styling* seam only.

**Sample handling.** `CodeVariants` with two tabs — a nav link styled by `aria-[current=page]:` (tab 1) and an input styled by `aria-[invalid=true]:` (tab 2) — each tab's prose naming the dual-audience payoff and (tab 1) why the arbitrary form is required here. Keeps the two canonical shapes side by side without a wall of prose.

**Tooltip (`Term`):** "assistive technology" (screen readers and other tools that read the page to users who can't see it); "ARIA" (a set of `aria-*` attributes that describe an element's role and state to assistive tech).

**Why here:** pairs naturally with `data-*` (both are self-attributes) and lets the accessibility-as-free-dividend point land while the attribute model is fresh.

### Reading a parent's state with `group`

The mechanic: mark a parent with the `group` utility, then children read the parent's state via `group-hover:`, `group-focus:`, `group-data-[state=open]:`, `group-aria-expanded:`, etc. The selector reaches *up*: `group-hover:opacity-100` desugars to `.group:hover &`. Canonical example: a card where hovering the whole card reveals a previously-invisible action button (`opacity-0 group-hover:opacity-100`) — the button reads the *card's* hover, not its own.

Named groups: `group/item` on the parent, `group-hover/item:` on the child, to disambiguate when groups nest. Show the failure it fixes (a child reading the *nearest* group when you meant a specific ancestor) in one sentence; demo the `/name` fix in a short block.

**Live exercise — `ReactCoding` (target-match, `live`).** A card containing a title and a "Delete" button that starts at `opacity-0`. Student marks the card `group` and the button `group-hover:opacity-100` (+ `transition-opacity`) so hovering anywhere on the card reveals the button; the target shows the revealed state. Reinforces "child styles from parent state, zero JS."

**Why here:** `group` is the first family that crosses the element boundary; it's the natural next widening of the selector after self-attributes, and the reveal-on-hover pattern is ubiquitous in SaaS UIs.

### Reading a sibling's state with `peer`

The mechanic: mark an element `peer`, and a *later* sibling reads its state via `peer-invalid:`, `peer-checked:`, `peer-focus:`, `peer-placeholder-shown:`, `peer-disabled:`. The hard constraint, stated up front and as a watch-out: **the `peer` marker only works on a *previous* sibling — so only a later sibling can read it; source order matters.** This is a CSS limitation (the subsequent-sibling combinator `~` only looks forward), not a Tailwind choice. Concretely: mark the input `peer`, and the error message that reads it must come *after* the input in the JSX.

Canonical example: a native inline form error. An `<input required>` marked `peer`, followed by a `<p>` error message with `peer-invalid:block hidden` — the message appears only when the input is `:invalid`, driven entirely by the browser's Constraint Validation, no JS. Name that the full Constraint Validation API treatment is lesson 7 of chapter 044; here it's just "native `:invalid` exists and `peer` can read it." Pair with `peer-placeholder-shown:` as the trick for float-label / "only show once they've typed" patterns, briefly.

Named peers (`peer/email`, `peer-invalid/email:`) named for parity with groups, one line.

**Sample handling.** `AnnotatedCode` on the input-plus-error markup: highlight (a) `peer` on the input, (b) the `required`/`type` that make `:invalid` meaningful, (c) `peer-invalid:` on the message, (d) the source-order dependency (message *after* the input). ≤10 lines. This is the clearest payoff in the lesson — a live-validating error with no state — so give it the stepped treatment.

**Watch-out, inline:** `peer` is single-direction; if the markup forces the message *before* the field, `peer` can't reach it — restructure so the field comes first, or fall back.

**Tooltip (`Term`):** "Constraint Validation" (the browser's built-in form validity tracking — `required`, `type="email"`, `pattern` set the `:invalid` pseudo-class for free).

**Why here:** sibling state is the third widening; the `:invalid` example also seeds the form-validation thread the course pays off later, and it's the most "wow, no JS?" moment.

### Reading descendants with `has-`

`has-[...]:` wraps the CSS `:has()` parent selector — an element styles itself based on what it *contains*. The form takes any selector: `has-[:invalid]:`, `has-[:checked]:`, `has-[[data-state=open]]:`, `has-[a]:`. Lead with the headline: **`:has()` is the selector that finally lets a parent react to a child** — historically impossible in CSS, the reason so much of this used to need JS state. Three use-cases (chapter outline):
1. A `<form>` or fieldset that highlights when **any** child input is invalid — `has-[:invalid]:border-destructive`. This is the chapter-outline's "submit-area dims when any field is invalid" payoff; show it.
2. A label/option row that highlights when it **contains** a `:checked` input — `has-[:checked]:bg-accent` (the senior radio-card pattern).
3. A list item that bolds when its link is current — `has-[[aria-current=page]]:font-semibold` (note the attribute selector inside the brackets, consistent with the `aria-*` section's "no `aria-current` shorthand" point).

State plainly: `has-*` replaces a large class of `useState` mirroring — the parent no longer needs to be told what changed inside it; it reads it.

**Live exercise — `ReactCoding` (target-match, `live`).** A radio-card group: three label "cards" each wrapping a radio `<input>` and text. Student adds `has-[:checked]:border-primary has-[:checked]:bg-accent` so the selected card highlights — clicking a radio (native, no React) repaints the card. The target shows one card selected. This is the strongest demonstration that DOM state alone drives the UI; the student clicks and sees it work with no code they wrote running.

**Watch-out, inline:** `:has()` is Baseline-stable across modern browsers in 2026 — not a concern for a 2026 SaaS; name it so the student isn't second-guessing. `:has()` performance is a non-issue at component scale (one sentence).

**Why here:** `has-*` is the climax of the "whose state?" progression (the hardest direction — downward) and the one that most dramatically deletes React state, so it earns the most exercise weight.

### Direct-children, negation, and positional variants

Group three smaller families that round out the surface. Keep each tight — recognition over drill.

- **`*:` direct-children.** `*:py-2` styles every direct child. Frame the use-case precisely: ad-hoc styling of children the parent *doesn't* control as components (a list of arbitrary elements, a slot of unknown content). Watch-out inline: easy to over-apply — prefer styling the children directly when you own them.
- **`not-*` negation.** `not-disabled:`, `not-first:`, `not-data-[state=open]:` — "every element *not* in this state," composes with the other families. Quick example: `not-last:border-b` for dividers between rows but not after the last. Name that `:not()` depth is lesson 4 of chapter 021.
- **Positional variants.** `first:`, `last:`, `odd:`, `even:`, `only:`, `empty:`. Use-cases: rounded outer corners on a grouped list (`first:rounded-t-lg last:rounded-b-lg`), striped rows (`odd:bg-muted`), collapsing an empty container (`empty:hidden`). These read the element's *position among siblings* — the fifth axis of the taxonomy.
- **`open:`** for native `<details>`/`<dialog>` — reads the native `open` attribute. One line, named for recognition; note Radix is the senior reach for richer disclosures (lesson 1 of chapter 027), so `open:` is rare in modern SaaS.

**Sample handling.** One compact `Code` block: a vertical list using `first:`/`last:` for corners, `odd:` for stripes, `not-last:border-b` for dividers, `empty:hidden` on the container — a single realistic snippet that exercises four positional/negation ideas at once. Annotate lightly in prose, no stepped walkthrough needed.

**Why here:** these are lower-frequency than the relational families but complete the taxonomy; bundling them prevents three thin sections and keeps the position axis together.

### Stacking variants and the order that reads best

Variants compose left-to-right and the order is the student's choice. The senior convention (from L1, restated and extended): **constraint outermost** — the broadest gate (breakpoint or theme) goes leftmost, the state innermost. So `md:group-hover:dark:bg-accent` reads "at md and up, when the group is hovered, in dark mode." Show two or three stacked combinations from the families just taught: `group-data-[state=open]:rotate-180`, `peer-focus:not-disabled:text-foreground`, `md:has-[:invalid]:border-destructive`. Goal: the student can read and write a multi-prefix class without parsing anxiety.

**Exercise — `Dropdowns` (fenced mode).** A short markup block where the student fills `<select>` blanks to assemble the right stacked variant for three scenarios ("rotate when the parent group is open", "red border at md+ when a descendant is invalid", "bold only when not disabled and focused"). Drills reading-order comprehension without freeform typing. Lighter-weight than another `ReactCoding`, appropriate for a syntax-assembly check.

**Why here:** stacking is a cross-cutting skill that only makes sense *after* the families exist; placing it last lets it draw on every prefix taught.

### Read state, don't mirror it

The synthesis section — the lesson's thesis made explicit and turned into a reusable decision. State the reflex as a rule: **every state-driven style change starts with "can the DOM already tell me this?"** If yes (hover, focus, validity, checked, a library's `data-state`, an ARIA attribute, a parent/sibling/descendant fact) → write a variant. If no — the value is server-fetched, a derived computation, or otherwise *not* expressible as a selector — *then* React state and a conditional class via `cn()` (L3) is the right tool. Name the boundary clearly so the student doesn't over-rotate into thinking variants replace state entirely; they replace state *that mirrors the DOM*.

Make the point that React (`useState`) is still in their future (Chapter 024) and that's deliberate — they're learning the no-state path *first*, so it's the default, and state becomes the considered exception.

**Diagram — the decision reflex (`StateMachineWalker`, `kind="decision"`).** The senior's question order as a click-through:
- Root: "What drives this style change?"
  - Branch "Pointer/focus/validity/checked/disabled" → Leaf: **pseudo-class variant** (`hover:`, `focus-visible:`, `:invalid`, `checked:`, `disabled:`).
  - Branch "A library or my own code set an attribute (`data-state`, `aria-expanded`)" → Leaf: **attribute variant** (`data-[…]:`, `aria-…:` shorthand or `aria-[…=…]:` arbitrary).
  - Branch "A parent / sibling / descendant element's state" → sub-question "Which relation?" → Leaves: **`group-*` / `peer-*` / `has-*`** (each leaf names the constraint: peer = later siblings only, etc.).
  - Branch "A value from the server, or a computed/derived value" → Leaf: **`useState` + conditional class via `cn()`** (the fallback; forward-points Chapter 024).
Pedagogical goal: encode the *order the senior asks the questions in* and make the `useState` fallback feel like the last branch, not the first. This is the durable takeaway the student should keep after the syntax fades.

**Exercise — `Buckets` (twoCol).** Sort ~8 UI scenarios into two buckets: **"DOM already knows — write a variant"** vs **"needs React state."** Items: "chevron rotates when accordion opens" (variant — `data-state`), "card highlights on hover" (variant), "error shows when input is invalid" (variant), "nav link bold on current page" (variant — `aria-[current=page]:`), "submit area dims when any field invalid" (variant — `has`), "show a banner after data loads from the server" (state), "filtered count from a search box" (state), "a wizard's current step" (state). Grades the core reflex directly — this is the assessment that matters most in the lesson.

**Why here / why last:** the lesson is *about* this reflex; every family was a means to it. Ending on the decision diagram + the sorting exercise leaves the student with the senior judgment, not just a prefix catalogue.

---

## Scope

**Prerequisites to restate concisely (don't re-teach):**
- The selector-wrapper model of a variant and the prefix-and-colon grammar (L1) — restated in one diagram, used as the engine, not re-derived.
- Plain variants `hover:`/`focus-visible:`/`active:`/`disabled:`/`checked:`/`invalid:` and responsive `sm:`/`md:` (L1) — used freely, not re-explained beyond a reminder.
- `data-*` and `aria-*` as *attributes* (kebab in JSX, the `data-*` script-hook role) — established lesson 6 of chapter 017; this lesson adds only the *styling-by-attribute* dimension and must not re-teach the attribute concept, `dataset` reader, or the delegation use-case.
- `cn()` + conditional classes (L3) — named once as the *fallback* path; not re-taught.
- Semantic tokens (`bg-card`, `border-destructive`) — used as the established convention; the token *model* is L5.

**Explicitly out of scope (defer, with one-line pointers where the outline already places them):**
- The `dark:` variant wiring and semantic-token theme swap → L5; `next-themes` React wiring → L6. `data-theme` named only as a forward hook.
- The full Radix UI surface and shadcn components that ship these variants pre-wired → lesson 1 of chapter 027. `data-state` is named as a library convention, not taught as Radix.
- ARIA at depth — roles, live regions, the first rule of ARIA, focus management → lesson 3 of chapter 027 / lesson 4 of chapter 027. Only the *styling* seam here.
- The Constraint Validation API (`required`/`pattern`/custom validity, `:invalid` semantics at depth) → lesson 7 of chapter 044. Here `:invalid` is just "a pseudo-class the browser sets, which `peer-`/`has-` can read."
- `:not()` / `not-*` at depth and pseudo-class details (`:focus-visible` internals) → lesson 4 of chapter 021.
- Motion/animation variants (`motion-safe:`, keyframes, `transition` tuning) beyond the single `motion-reduce:`-guarded chevron rotation → lesson 5 of chapter 021.
- Container queries (`@container`, `@sm:`) → lesson 7 of chapter 021 (and the `@container` *directive* was L2).
- React state itself (`useState`, handlers, controlled inputs) → Chapter 024+; named only as the deliberate fallback the student doesn't yet have.
- CVA variant matrices → lesson 3 of chapter 022 (out of frame entirely here).
- The cascade/specificity mechanics behind these selectors and the `:where()` wrap → Chapter 019 (facts asserted, mechanics forward-pointed).

---

## Notes for downstream agents

- **CDN constraint is favorable here.** Unlike L2, every variant this lesson teaches (`data-*`, `aria-*`, `group`, `peer`, `has`, `*:`, `not-*`, positional, `open:`) is a *built-in* Tailwind v4 variant that resolves under the `ReactCoding` Play-CDN runtime with no custom `@theme`. Lean into live target-match exercises freely.
- **Deliberate divergence from final shadcn code shape:** examples here intentionally use *static* attributes (`data-state="open"` hard-coded, a hard-coded `aria-current`) so the "no JS drives this style" point lands. Production code would have a library or React set these; that's correct and forward-pointed, not an omission to fix.
- **Don't introduce `useState` syntax.** The student hasn't met it. Refer to it by name as the future fallback only; never show a hook call.
- **v4 syntax to honor (verified against the official v4 docs, June 2026):**
  - Trailing `!` important modifier (not the v3 leading `!`).
  - `data-[attr=value]:` bracket form; bare `data-loading:` tests presence.
  - Built-in `aria-*` shorthands exist **only** for boolean attributes (`aria-busy/checked/disabled/expanded/hidden/pressed/readonly/required/selected`), each targeting `="true"`. **`aria-current` and `aria-invalid` have NO shorthand** — use `aria-[current=page]:` / `aria-[invalid=true]:`. Do not write `aria-current:` or `aria-invalid:` anywhere in the lesson.
  - `peer` reads only *forward*: mark the earlier sibling `peer`, the later sibling reads it. Never put a `peer-*` reader before its `peer` source.
  - Arbitrary-variant brackets in `has-[…]:` / `group-[…]:` take a full selector (`has-[:invalid]`, `has-[[aria-current=page]]`).
- Lesson-specific components, if any are built, live at `src/components/lessons/018/4/`.

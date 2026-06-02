# Utility-first on JSX

- Title (h1): `Utility-first on JSX`
- Sidebar label: `Utility-first on JSX`

---

## Lesson framing

This is the first styling lesson of the course. Chapter 017 left the student writing fluent semantic JSX with every element unstyled; this lesson paints those elements, and the senior frame is **where the styling lives**: utility classes on the JSX tag, co-located with the markup, not in a sibling `.css` file. The deliverable is *grammar fluency* — the student should leave able to read and write a class string like `md:hover:bg-primary/80` and know exactly what each segment does, recognize the utility *families* (not memorize lists), reach for the theme scale before arbitrary values, and name the moment bespoke CSS earns its weight.

Central mental model to install, stated early and reused: **a utility class is one pre-named, single-purpose CSS declaration; the class string is the element's style, and variants/modifiers are selector and value transformers layered onto that declaration.** Once the student sees a class as `selector-wrapper × utility × value-modifier`, the entire surface (the families, the `:` variants, the `/` opacity, the `[...]` escape hatch) becomes one legible system instead of hundreds of magic strings. This is the cognitive-load win: teach the *grammar* once, the vocabulary follows.

Where beginners struggle, and where this lesson must be deliberate:
- **"Long class strings are ugly / a code smell."** The instinct from traditional CSS is that a wall of classes is mess. Reframe: the alternative is a bespoke named class holding the *same* declarations one indirection away. The class string keeps style and structure in one place. Name this explicitly — it's the #1 emotional objection to utility-first.
- **The dynamic-class trap.** `bg-${color}-500` silently emits nothing because Tailwind's compiler scans source files as *plain text* and never runs the template literal. This is the single most common real-world Tailwind bug for newcomers and it must land hard, with the safe pattern (full class names, lookup map). It also foreshadows lesson 3's `cn()`.
- **Reaching for arbitrary values too fast.** `w-[37rem]` everywhere instead of the scale. Frame every `[...]` as a *signal*, not a sin — but a signal the theme scale should probably grow (lesson 2 owns growing it).
- **Confusing "utility-first" with "no CSS ever."** Name the thresholds where bespoke CSS still wins: prose/long-form content, keyframe animations, deep pseudo-element work, third-party overrides. Decisions-before-syntax: the lesson opens on the *decision*, not the class list.

Tone: adult, terse, decision-led. No "what is CSS." The student knows CSS fundamentals from earlier units; what is new is the *delivery mechanism* (utilities on JSX) and Tailwind's grammar. Underlying CSS named at the call site (`p-4` → `padding: 1rem`), never as preamble.

Scope discipline (the seam that matters most): this lesson teaches the variant *model* plus the **plain** variants — pseudo-class state (`hover:`, `focus-visible:`, `active:`, `disabled:`), form-state (`checked:`, `invalid:`), responsive (`sm:`, `md:`, mobile-first), and accessibility (`print:`, `motion-reduce:`, `contrast-more:`). The **DOM-state and structural** variants (`data-*`, `aria-*`, `group-*`, `peer-*`, `has-*`, `*:`, `not-*`, positional) are lesson 4's job and must only be *named as forthcoming*, not taught. `dark:` is named (its wiring is lessons 5–6). `cn()` and class composition are lesson 3 — foreshadow the no-template-literal rule, don't teach the helper. The CSS-first config and `@theme` are lesson 2 — the student *consumes* tokens like `bg-primary` here without learning to *define* them.

The lesson leans on three live `ReactCoding` exercises (the surface is muscle memory — the student must type class strings and see boxes change), one anatomy diagram (the grammar visual), one before/after `CodeVariants` (what utility-first replaces), and one classification exercise (the bespoke-CSS-vs-utility decision). Code-heavy, visual where the grammar needs decomposition.

---

## Lesson sections

### Introduction (no header)

Open on the senior question, concretely: a single primary button needs padding, a background, rounded corners, a border, a hover state, a visible focus ring, and a different size on small screens. Two paths exist — write a named class in a `.css` file and pair it with the JSX, or stack utility classes directly on the `<button>`. State the course's default in one sentence (**utility-first for component-internal styling**) and the one-line *why* (the component is already a named unit in React; a parallel CSS class re-names what's already named and splits one decision across two files). Preview what the lesson delivers: by the end, the student reads and writes any Tailwind class string fluently and knows when to step outside utilities. Connect to Chapter 017: every semantic element they just learned to choose now gets its visual layer — and the visual layer rides on the same tag. Keep it to ~3 short paragraphs, warm and brief. Do **not** enumerate utilities here.

Reasoning: pedagogy demands the decision before the syntax; this is the "trigger before tool" beat. The student needs the *why utility-first* before any class appears, or the long-class-string objection festers.

### What utility-first replaces

Teach by contrast. Show the two ways to style the same button side by side so the student *feels* the indirection utility-first removes.

- Use **`CodeVariants`** with two tabs:
  - **Tab "Named-class CSS"** — a `.card-header { ... }` style block (4–6 declarations) in one file plus `<div className="card-header">` in the JSX. Prose names the cost: two files, a name invented purely to bridge them (`card-header` describes *nothing* the browser cares about), and the indirection you traverse on every edit.
  - **Tab "Utility-first"** — the same declarations as a utility string directly on the element. Prose: style and structure are one decision in one place; the class names describe what the element *does* visually (`flex items-center gap-2 p-4`), not an invented identity.
- Follow with prose making the core argument explicit: **React components are already named.** A `<CardHeader>` component duplicating its name as a `.card-header` class adds an indirection and a naming burden with no payoff. Utilities describe behavior, not identity.
- Address the objection head-on in this section (don't defer it): long class strings are not a code smell — the alternative is a bespoke class with the *same* declarations, just hidden behind a name and a file boundary. This is where the student's resistance lives; name it now.

Reasoning: the "what it replaces" framing is the pedagogical hook — utility-first only makes sense against the named-class baseline the student already knows. `CodeVariants` is purpose-built for this A/B.

Tooltip candidates (use `Term`): **utility class** ("a single-purpose CSS class that sets one declaration, e.g. `p-4` sets `padding`"), **utility-first** ("composing UI from many single-purpose classes on the element rather than writing bespoke named classes").

### A utility class is one CSS declaration

Install the atomic mental model before any breadth. This is the conceptual spine of the whole lesson.

- Prose + a small **`Figure`** (HTML+CSS, per the diagrams index — a simple mapping table rendered as real DOM, low height) showing three utilities mapped to the CSS they emit:
  - `p-4` → `padding: 1rem;`
  - `bg-primary` → `background-color: var(--color-primary);`
  - `rounded-lg` → `border-radius: var(--radius-lg);`
  - Caption: "A utility name *is* its declaration — no indirection, nothing to look up."
- Make two points in prose:
  - The numbers and names aren't arbitrary — `4`, `lg`, `primary` are **theme tokens** (the scale), covered in the next section. Mention `p-4` resolving through `var(--spacing-4)` to `1rem` but do **not** open the token-definition model — that's lesson 2; here the student is a *consumer* of tokens that already exist in the scaffold's `globals.css`.
  - Why this composes well: each class is independent and order-free in the string (the cascade resolves conflicts predictably — but conflict *resolution* across duplicate utilities is a lesson-3/Chapter-019 concern; here just assert "one declaration each, they don't fight unless two set the same property," and move on).

Reasoning: every later section (families, variants, modifiers, arbitraries) is a transformation of "one class = one declaration." Anchoring it first is the cognitive-load reduction the guidelines demand — simplified model first, complexity layered after.

### The utility families you write daily

A *tour*, not a reference. The senior skill is recognizing the families and the naming convention, so a forgotten exact name is a one-keystroke IntelliSense lookup — never a memorized list.

- Organize the families as a compact grouped reference. Prefer a **`Figure`** (HTML+CSS, a tight multi-column grid) or a Starlight `Card`/table grouping, one row per family with 2–3 representative utilities each:
  - **Layout** — `flex`, `grid`, `block`, `hidden`, `items-center`, `justify-between`
  - **Spacing** — `p-4`, `px-6`, `m-2`, `gap-4` (`gap` is the spacing primitive for flex/grid — call this out per conventions; sibling margins are discouraged)
  - **Sizing** — `w-full`, `h-screen`, `size-10` (note `size-*` sets width+height together — the modern shorthand, driven by the same `--spacing` scale as `p-*`/`m-*`)
  - **Color** — `bg-card`, `text-foreground`, `border-border` (use the **semantic** token names, not raw `blue-500`, so the examples model the senior default and pre-wire lesson 5's token model; mention primitives like `bg-blue-500` exist but are a smell in app code per conventions)
  - **Typography** — `text-sm`, `font-medium`, `leading-tight`, `tracking-tight`
  - **Border & radius** — `border`, `border-2`, `rounded-md`, `divide-y`
  - **Effects** — `shadow-sm`, `opacity-90`, `transition`, `ring-2`
- Frame in prose: you are learning ~8 *families* and one naming convention (`{property-abbreviation}-{scale-or-value}`), not hundreds of strings. The names are guessable once the convention clicks; IntelliSense fills the rest.
- **Mention the Tailwind IntelliSense VS Code extension here** as the daily instrument that makes the surface ergonomic (autocomplete, the resolved-CSS hover preview, color swatches, class linting). One sentence + recognition; not a setup tutorial. Use an `ExternalResource` card linking the extension at the section end (optional).

Live practice — **`ReactCoding`** (target-match, `live`): give a plain `<div>Card</div>` starter and a target that's a small card (padding, `bg-card`, `rounded-lg`, `border`, `shadow-sm`, some `text-*`). Student composes the class string to match. Instructions: "Match the target card using utility classes — padding, background, rounded corners, a border, a subtle shadow." This is the families-in-anger rep; target-match gives instant visual feedback without brittle assertions.

Reasoning: breadth must be framed as *pattern recognition* to avoid the "memorize 500 classes" dread. Semantic token names in every example quietly establish the convention lesson 5 formalizes — coherence across the chapter. The live target-match is the lowest-friction way to build class-string muscle memory.

Tooltip candidate (`Term`): **theme scale / token** ("a named value in the design system, e.g. spacing `4` = `1rem`, that utilities reference so the UI stays consistent"). Keep it light — lesson 2 owns the depth.

### Reading a class string: the prefix-and-colon grammar

The grammar section — the highest-value visual in the lesson. Teach the variant model so the student can *decompose* any class.

- Lead with the model in one line: **a variant is a selector or media-query wrapper around the utility.** `hover:bg-primary` compiles to roughly `&:hover { background-color: var(--color-primary) }`; `md:p-6` compiles to `@media (min-width: 48rem) { padding: 1.5rem }`. The utility is the declaration; the prefix is *when/under what selector* it applies.
- **Anatomy diagram** — a **`Figure`** (HTML+CSS, or hand-coded SVG if cleaner) decomposing one rich class into labeled segments, left-to-right with callouts:
  - `md:` → responsive variant (the breakpoint gate)
  - `hover:` → state variant (the selector gate)
  - `bg-primary` → the utility (the declaration)
  - `/80` → the opacity modifier (value transform)
  - i.e. dissect `md:hover:bg-primary/80` into [breakpoint][state][utility][modifier], with a one-line gloss under each: "at md and up, when hovered, set background to primary at 80% opacity." Caption: "Every Tailwind class reads as this same grammar — gates on the left, declaration in the middle, value modifier on the right."
- Then teach the **plain variant families in scope for this lesson** (be explicit these are the start; the DOM-driven ones come in lesson 4):
  - **Pseudo-class state** — `hover:`, `focus-visible:` (note `focus-visible:` is the senior default over `focus:` for keyboard-only rings — conventions require visible focus on every interactive element), `active:`, `disabled:`.
  - **Form-state** — `checked:`, `invalid:` (native input states; the *structural* read of these via `peer-`/`has-` is lesson 4).
  - **Responsive** — `sm:`, `md:`, `lg:` etc., **mobile-first**: an unprefixed utility is the base, prefixes apply *at that breakpoint and up*. This is the single most-misunderstood Tailwind rule for beginners — state it plainly and show `p-2 md:p-6` = "2 by default, 6 from md up." (Responsive *design* at depth is Chapter 021; here just the grammar.)
  - **Accessibility** — `motion-reduce:` (conventions mandate it on noticeable motion), `print:`, `contrast-more:`. Name `motion-reduce:` as a habit to build now.
  - **`dark:`** — name it as the dark-theme gate; its proper use (semantic tokens, not per-utility `dark:`) and wiring are lessons 5–6. One sentence, forward-ref.
- **Stacking** — variants compose left-to-right and the order is read as nested gates (`md:hover:` = "at md, when hovered"). The senior reach is "constraint outermost" (breakpoint/theme leftmost, interaction state inner) — name it lightly.
- **Explicit forward-reference** (one short paragraph or `Aside`): variants can also read state the DOM already tracks — a parent's hover, a sibling's invalid input, a `data-state="open"` attribute — without any React state. That family (`group-*`, `peer-*`, `has-*`, `data-*`, `aria-*`) is **lesson 4**. Naming it here closes the "is that all variants do?" loop without teaching it.

Live practice — **`ReactCoding`** (target-match, `live`): a `<button>` starter; target adds a hover background change, a `focus-visible` ring, a `disabled:opacity-50 disabled:pointer-events-none`, and a responsive padding bump (`px-3 md:px-6`). Instructions name each behavior to reproduce. Lets the student *type* the prefix-colon grammar and watch it fire.

Optional reinforcement — **`Dropdowns`** (fenced mode) on a class string with `___` blanks where the student picks the right *prefix* for a described behavior (e.g., "ring only on keyboard focus" → `focus-visible`; "padding only from medium screens" → `md`). Cheap recall check on the grammar.

Reasoning: the anatomy diagram is the lesson's keystone — once a student can parse `md:hover:bg-primary/80` into gates+declaration+modifier, the surface stops being magic. Teaching the grammar with the *plain* variants keeps lesson 4's structural surface clean. Mobile-first gets called out because it's the canonical beginner stumble. The live exercise turns grammar into reflex.

### Opacity, arbitrary values, and the escape hatches

The "when the scale doesn't fit" toolkit — taught in strict order of preference so the student internalizes "scale first, escape hatch last."

- **The `/` opacity modifier** — `bg-foreground/10`, `text-primary/80`, `ring-ring/50`. A postfix on color/ring utilities that sets the channel's alpha without writing `rgba(...)`. Canonical use: translucent overlays and subtle borders. Small **`Code`** block with 2–3 examples; one line on *why* (it reads off the token, stays theme-correct, no hardcoded color).
- **Arbitrary values — `[...]`** — the escape hatch when the theme scale has no fitting token: `w-[37rem]`, `bg-[#1a1a2e]`, `grid-cols-[200px_1fr_200px]` (note underscores stand in for spaces inside the brackets). Teach the *framing* as the load-bearing part: **every arbitrary value is a signal** — fine for genuine one-offs, but if the same `[...]` appears two or three times it wants to become a theme token (lesson 2 owns adding tokens). Small `Code` block.
- **Arbitrary properties — `[property:value]`** — when *no utility exists at all*, e.g. `[mask-type:luminance]` or `[scrollbar-width:none]`. Rare; named for recognition only, one example.
- **CSS variables in utilities** — for properties a script or inline `style` sets at runtime feeding a utility. **Teach the v4 shorthand as the default:** `bg-(--card-overlay)`, `w-(--sidebar-width)` — parentheses, which auto-wrap the value in `var()`. Note the full bracket form `bg-[var(--card-overlay)]` is the older, still-valid fallback (and what you use when the bracketed value is more than a bare variable). Do **not** show the deprecated v3 form `bg-[--card-overlay]` (brackets without `var()`). One line: this is the seam between JS-set values and utilities; CSS custom properties at depth are Chapter 019. (Verified June 2026 — the `(--var)` shorthand is the current v4 form.)
- **The `!` important modifier** — **trailing** `!` (`text-red-500!`, and `hover:bg-primary!` with the `!` always last, after every variant prefix) forces `!important`. Note this is the v4 syntax; the v3 *leading* `!` form (`!text-red-500`) is gone — do not teach it. Rare; its only good use is overriding stubborn third-party CSS. Flag it as a last resort — the cascade and why `!important` is usually the wrong reach are Chapter 019. One example, one caution.

Reasoning: ordering these as preference-descending (scale → opacity-on-token → arbitrary value → arbitrary property → `!`) builds the senior instinct of escalating only as far as needed. The "arbitrary value = signal to grow the scale" frame is the durable takeaway and the clean handoff to lesson 2.

Tooltip candidate (`CodeTooltips` on the arbitrary-values block): `[37rem]` ("arbitrary value — any CSS value in brackets when no scale token fits"), `1fr` ("CSS grid fraction unit — one share of the free space"), the `_` ("underscore = space inside arbitrary brackets, since class names can't contain spaces").

### Where utilities stop, and the daily traps

Close the decision loop and inoculate against the real-world bugs. Two distinct beats: the *boundary* (when bespoke CSS wins) and the *traps* (what silently breaks).

- **When bespoke CSS earns its weight** — name the thresholds the utility-first default crosses:
  - **Long-form prose** — article/Markdown body content (the `prose` class / typography plugin territory, Chapter 021) — utilities per element don't scale to author-written content.
  - **Keyframe animations** — multi-step `@keyframes` (lesson 5 of Chapter 021).
  - **Deep pseudo-element work** — `::before`/`::after` with `content` beyond the trivial.
  - **Third-party overrides** — styling markup you don't control.
  - State the rule: utility-first by default for component-internal styling; reach for bespoke CSS at these named boundaries, not by taste.
  - Name and dismiss **`@apply`** in one or two sentences: it folds utilities back into a named class — it reintroduces exactly the indirection utility-first removed, so it's *not* the senior default; legitimate but rare (e.g. styling a third-party-injected element you can't put classes on). (`@apply` and `@layer` mechanics are Chapter 019.)
- **The dynamic-class trap** — the section's most important warning. Tailwind's compiler scans source files as **plain text** and never executes them, so a constructed class name like `bg-${color}-500` is *never seen* and *never emitted* — the style silently vanishes. Teach with **`CodeVariants`**:
  - **Tab "Broken"** (`del`-marked) — `className={`bg-${color}-500`}` with prose: the compiler never runs this template; the class isn't in the output CSS; the element renders unstyled with no error.
  - **Tab "Safe"** (`ins`-marked) — a lookup map of *complete* class strings (`const styles = { red: 'bg-red-500', green: 'bg-green-500' }`) indexed by the variable, so every class appears literally in source for the scanner to find.
  - One line forward-referencing lesson 3: conditional/variant class composition has a dedicated helper (`cn()`) — and the same "no string-built Tailwind class names" rule holds there.
- **Two more named watch-outs** (brief, in prose — each is a one-liner):
  - **Don't template-literal-concat Tailwind classes for conditional styling.** It produces conflicting duplicates whose winner is build-order-dependent. Lesson 3's `cn()` is the fix — named here, taught there.
  - **Enable IntelliSense** (restate from the families section if not already) — without it the surface feels harder than it is.

- **The reading instrument** — short prose, no asset: open DevTools → Elements, select the element, read the literal class string in the markup, then the **Computed** panel for the resolved declarations (and which utility set each). The recognition move: "is the style missing? check whether the class is actually in the DOM — if it's absent, the compiler never emitted it (the dynamic-class trap) or, later, `cn()` merged it out." One short paragraph; optionally an `Aside` (tip).

Reasoning: the boundary list keeps "utility-first" from being misread as dogma — seniors choose, they don't obey. The dynamic-class trap is the single highest-ROI warning in the lesson because it's silent, common, and confusing on first encounter; it earns a full `CodeVariants`. The reading-instrument beat gives the student a debugging reflex they'll use immediately.

### Practice: utility or bespoke CSS? (decision exercise)

A standalone classification checkpoint on the lesson's core *decision* (distinct from the live coding which drilled syntax).

- **`Buckets`** (`twoCol`), instructions "Sort each styling job into where it belongs." Two buckets: **"Utility classes"** and **"Bespoke CSS"**. Items (mix, ~6–8): a card's padding and border; a button hover state; the body text of a blog article; a three-keyframe loading spinner animation; an icon-only button's focus ring; overriding a third-party widget's stubborn `!important` styles; a one-off `::before` decorative quote mark with `content`; a responsive grid that changes columns at `md`. Grading: each item maps to exactly one bucket per the thresholds taught above.

Reasoning: the live exercises test *can you write the syntax*; this tests *do you know when to reach for it* — the senior-mindset assessment the course prioritizes. `Buckets` is the right fit for a binary "which side of the boundary" sort.

### External resources (optional)

One or two `ExternalResource` cards: the Tailwind v4 docs (utility/variant reference as the lookup the lesson tells them to use instead of memorizing), and the Tailwind CSS IntelliSense extension. Keep minimal; the lesson is self-contained.

---

## Scope

**In scope:** the utility-first decision and its thresholds; what utility-first replaces (named-class CSS); the atomic "one class = one declaration" model; the daily utility families and naming convention; the prefix-and-colon variant grammar and stacking; the **plain** variants only — pseudo-class (`hover:`, `focus-visible:`, `active:`, `disabled:`), form-state (`checked:`, `invalid:`), responsive (`sm:`/`md:`, mobile-first), accessibility (`motion-reduce:`, `print:`, `contrast-more:`), and `dark:` *named only*; the `/` opacity modifier; arbitrary values `[...]`; arbitrary properties `[property:value]`; CSS variables in utilities (the v4 `(--var)` shorthand and the `[var(--var)]` fallback); the `!` important modifier (v4 trailing form); the bespoke-CSS boundaries; the dynamic-class-name trap; the Elements/Computed reading instrument; IntelliSense as the daily tool.

**Explicitly NOT in scope (redirect, do not teach):**
- **CSS-first config, `@import "tailwindcss"`, `@theme`, `@utility`, `@custom-variant`, `@container`, token *definition*** — lesson 2. Here the student *consumes* existing tokens (`bg-primary`, `p-4`); they do not learn to define or grow them. Reference the scale only as a thing that exists in the scaffold's `globals.css`.
- **`cn()`, `clsx`, `tailwind-merge`, conditional class composition** — lesson 3. Foreshadow the "no template-literal concat for Tailwind classes" rule; do not introduce the helper or its signature.
- **DOM-state and structural variants — `data-*`, `aria-*`, `group-*`, `peer-*`, `has-*`, `*:`, `not-*`, positional (`first:`/`last:`/`odd:`), `open:`** — lesson 4. Name the *family* once as "variants that read DOM state" and defer entirely.
- **Dark mode — semantic-token swap, `@custom-variant dark`, `.dark` overrides, `next-themes`** — lessons 5–6. `dark:` is named as a gate only.
- **The cascade, specificity, `@layer`, `@apply` mechanics, `!important` at depth, Preflight** — Chapter 019. Assert conflict behavior only as much as the lesson needs ("two utilities setting the same property, one wins"); do not explain the cascade.
- **CSS custom properties at depth** — Chapter 019. The `(--var)`/`[var(--x)]` utility forms are shown as a seam, not explained.
- **The full layout model — flex, grid, sizing, spacing at depth** — Chapter 020. Families are *named*, not taught as a layout system.
- **Typography, color theory, OKLCH, motion, responsive design at depth, container queries** — Chapter 021. Responsive variants here are grammar only.
- **shadcn/ui and the copy-paste model** — Chapter 027.
- **The `style` prop for dynamic CSS** — covered in Chapter 017; mention only if contrasting with the `(--var)` utility form.
- **Tailwind v3 and the v3→v4 migration, the legacy `tailwind.config.ts`** — out of scope; the course pins v4. Name `tailwind.config.ts` once at most, for recognition, never taught.

**Prerequisites to restate concisely (one line each, do not re-teach):** `className` is the JSX prop for the HTML `class` attribute (Chapter 017); JSX `{}` interpolation puts a JS expression in a prop value (Chapter 017) — relevant when showing the dynamic-class trap; components are already named units (Chapter 022 owns components, but the "already named" point is needed for the utility-first argument and can be asserted without forward-loading component depth).

---

## Notes for downstream agents / continuity

- **`cn()` location discrepancy to flag for lesson 3:** the chapter-018 outline (lesson 3 bullet) says `src/lib/cn.ts` imported as `@/lib/cn`, but `documentation/code standards/Code conventions.md` (Styling + shadcn sections) pins `cn()` at `lib/utils.ts` imported as `@/lib/utils` (shadcn convention, required for primitive composition). Lesson 3 should follow the conventions file (`@/lib/utils`). This lesson only foreshadows `cn()`, so it is unaffected, but record it in Continuity notes so lessons 3 and onward stay consistent.
- **Semantic token names in examples** (`bg-card`, `text-foreground`, `border-border`, `bg-primary`) are used deliberately throughout this lesson to model the senior default and pre-wire lesson 5's token model — keep them consistent across the chapter rather than reaching for raw `blue-500` primitives in app-code examples.
- **v4 syntax verified June 2026** (carry forward so later lessons stay consistent): CSS-variable utilities use the `(--var)` parenthesis shorthand (auto-`var()`-wrapped); the bracket `[var(--x)]` form is the fallback; the deprecated `[--x]` form is not taught. The `!important` modifier is **trailing** (`utility!`, after all variant prefixes), not the v3 leading `!`. `size-*` is the current width+height shorthand on the `--spacing` scale.

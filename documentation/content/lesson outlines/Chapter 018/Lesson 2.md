# CSS-first config in globals.css

- **Title (h1):** CSS-first config in globals.css
- **Sidebar label:** CSS-first config

---

## Lesson framing

This is the **consumer → definer** lesson. Lesson 1 left the student fluent at *reading and writing* utility class strings and explicitly seeded the handoff: `p-4` resolves through `var(--spacing-4)`, the scale "already exists in the project's `globals.css`," and "every arbitrary value `[...]` is a signal the scale should grow — growing the scale is the next lesson's job." Lesson 2 cashes that debt. The student stops trusting the scale and starts owning it.

The senior frame (lead the intro with it implicitly, per pedagogical filter 1): you need a brand color, a custom spacing step, a one-off utility, and a layout that responds to a component's own width. In the Tailwind the rest of the web learned, all four lived in a JavaScript `tailwind.config.ts` whose `theme.extend` object mapped opaquely to utilities. **In v4 all four live in `app/globals.css`, in CSS, through four directives — and a token there *is* a CSS variable whose name deterministically mints its utilities.** That determinism is the single load-bearing idea of the lesson; everything else orbits it.

The **one concept that must land cleanly**: the namespace → utility-family mapping. `--color-brand` mints `bg-brand`, `text-brand`, `border-brand`, `ring-brand`. `--spacing-gutter` mints `p-gutter`, `m-gutter`, `gap-gutter`. The student should leave able to predict, from a `@theme` line, exactly which utilities now exist — and to debug the #1 beginner failure (defined a token, the utility doesn't exist) by checking the namespace prefix. Build the whole lesson so this mapping is visible, drilled, and reflexive.

Keep cognitive load down by **layering the four directives in order of how often they're reached for**: `@import` (always, line 1) → `@theme` (the daily one, ~70% of the lesson) → `@utility` and `@custom-variant` (the occasional extenders) → `@container` (component-relative layout, kept shallow). Then a short "supporting cast for recognition" pass (`@source`, `@plugin`, `@config`, the compile pipeline, the layout import). Resist deepening `@container` — Chapter 021 lesson 7 owns it; here it's "first-class in v4, here's the shape, recognize it."

Tone and house style match Lesson 1: warm decision-first intro, dense narrative prose with the syntax named at the call site, lesson-specific Astro diagram components inside `<Figure>`, `Term` for inline definitions, non-coding interactive checks placed *where the concept is taught* (never bundled at the end), a `## Recap` that reduces the lesson to its core idea, and a `## External resources` `CardGrid`. Reuse Lesson 1's terminology verbatim where it recurs ("a variant is a selector or media-query wrapper around the utility"; "theme token"; "the scanner reads source as text").

**Live-coding constraint to flag for downstream agents:** `ReactCoding` renders an `App` component against the Tailwind **Play CDN** — it cannot ingest a custom `app/globals.css` `@theme` block, so a "define a token and use it" exercise will *not* resolve the custom utility in that harness. Do not author a ReactCoding exercise that depends on student-defined `@theme` tokens. The assessable concepts in this lesson (namespace→family prediction, directive→job mapping) are conceptual and are best checked with `Dropdowns`, `Matching`, and `Buckets`. Use those.

---

## Lesson sections

### Introduction (no header)

Open by reconnecting to Lesson 1's cliffhanger: the student already knows `p-4` is `padding: var(--spacing-4)` and that `bg-card` asks the design system for a color. Pose the four concrete needs (brand color, custom spacing step, custom utility, container-relative layout) as the work this lesson unlocks. Name the shift in one sentence: the place that answers "what is `--spacing-4`? what is `bg-card`?" is **one file, `app/globals.css`, written in CSS** — not a JavaScript config object. State the end state: by the lesson's end the student can author the token scale they consumed last lesson, predict which utilities any token mints, and recognize the full v4 directive surface. Keep it to ~3 short paragraphs, warm and terse.

Briefly name (one sentence, for recognition, not taught) that older Tailwind projects keep this in a `tailwind.config.ts` — so the student recognizes it in the wild — and that v4's senior default is CSS-first. This is the "trigger before tool / name the alternative" beat; do not dwell.

### The config moved into CSS

Establish the model before any directive detail. The pedagogical goal: install the *mental relocation* (JS config object → CSS file) and the v4 baseline, so every directive that follows has a home.

Content:
- The one-line shift: **v4 configures Tailwind in CSS.** `app/globals.css` is the project's design-system control panel. There is no `tailwind.config.ts` in a new 2026 project.
- The 2026 v4 baseline, terse and named-for-recognition (do not deep-dive any): the **Lightning CSS** engine (fast, no separate PostCSS step), **OKLCH** as the default color space (name only — color space depth is Chapter 021; here just "the default palette is authored in OKLCH"), container queries first-class, JS config optional.
- The single import: `@import "tailwindcss";` as **line 1** of `globals.css`. One line replaces v3's three `@tailwind base/components/utilities` directives (name the v3 form once, for recognition). State what the import *brings in* at a high level — the utility classes, the default theme tokens (the scale the student consumed last lesson), and a base reset called **Preflight** — but defer Preflight's mechanics with a forward pointer to Chapter 019. Use a `Term` on **Preflight** ("Tailwind's built-in base reset that normalizes browser default styles; covered in Chapter 019").
- Where the file is wired in: `import './globals.css';` at the top of `app/layout.tsx` (a side-effecting import — cross-reference the import-ordering rule lightly: side-effecting imports come first). This already ships in the project scaffold; the student is editing a file that's already imported, not creating a new pipeline.

Component/diagram:
- A minimal `Code` block showing the **skeleton of `globals.css`** — `@import "tailwindcss";` on line 1, then comment placeholders for `@theme { … }`, `@custom-variant …`, `@utility …` to preview the shape the lesson fills in. This is the structural map the rest of the lesson populates. Keep it short; it's an orientation device, not a full file.

Watch-out to fold in here (inline, not bundled): the default theme still applies even after you add your own tokens — `@theme` *extends* the defaults; you only lose a default if you explicitly reset it (forward-pointer to the `initial` reset subsection). (Verified June 2026: `@import "tailwindcss"` pulls in the default theme from `tailwindcss/theme.css`, and `@theme` blocks extend it.)

### `@theme`: tokens that mint their own utilities

The heart of the lesson — budget the most time and the strongest visual here. Pedagogical goal: the student can author a token and predict, deterministically, which utilities it creates; and can debug the inverse (utility missing → wrong namespace).

Content, layered:
1. **A `@theme` token is a CSS variable that mints utilities.** Show a tight `@theme` block defining, say, `--color-brand: oklch(0.62 0.19 256);`, `--spacing-gutter: 1.75rem;`, `--radius-card: 0.75rem;`. Then show the JSX that consumes them: `bg-brand`, `text-brand`, `border-brand`, `p-gutter`, `gap-gutter`, `rounded-card`. The reveal: you didn't register those utilities anywhere — the variable's **namespace prefix** generated the whole family automatically.
2. **The naming rule.** Token names are `--{namespace}-{name}`. The namespace is the part Tailwind recognizes; it decides which utility family the token joins. The `{name}` is what you type after the family prefix in the utility (`--color-**brand**` → `bg-**brand**`).
3. **The namespace → family reference.** This is the load-bearing table. Cover the families the student will actually define (namespaces verified against the v4 theme docs, June 2026 — keep them precise so the writer/component agent don't conflate them): `--color-*` → `bg-*` / `text-*` / `border-*` / `ring-*` / `fill-*` / `stroke-*` / etc.; `--spacing-*` → `p-*` / `m-*` / `gap-*` / `size-*` / `w-*` / `h-*` / etc.; `--radius-*` → `rounded-*`; `--font-*` → `font-*` (font **family** only — note that `--font-weight-*` → `font-bold`, `--tracking-*` → letter-spacing, and `--leading-*` → line-height are *separate* namespaces; do not imply `--font-*` covers weight/tracking); `--text-*` → `text-*` (font **size**; a size token can carry a paired line-height via a `--{name}--line-height` double-dash suffix, e.g. `--text-tag` + `--text-tag--line-height`); `--breakpoint-*` → responsive variant prefixes (`sm:` / `md:` / …); `--container-*` → the `@`-prefixed **container-query** variants (`@sm:` / `@md:`) plus `max-w-*` sizes — flag this row, it's the explicit bridge into the `@container` section later; `--shadow-*` → `shadow-*`; and **name-only** `--animate-*` → `animate-*` (forward-pointer: Chapter 021 lesson 5 owns animation). Keep the table to the families above; the longer namespace list (`--inset-shadow-*`, `--drop-shadow-*`, `--blur-*`, `--tab-size-*`, …) is recognition-tier — do not enumerate it. Connect `--breakpoint-*` explicitly back to Lesson 1's responsive prefixes — the student used `md:`; now they know where `md` is defined and that they can add their own breakpoint.
4. **Disabling defaults — `--color-*: initial`.** The senior reach for a tightly-scoped design system: setting a whole namespace to `initial` clears Tailwind's defaults so IntelliSense only suggests project tokens. Frame as an opt-in discipline for design-system-strict teams, not a default move. One short example (`--color-*: initial;` then redefine the project palette). Name (one line, recognition-only) that `--*: initial` nukes *every* default namespace — the nuclear option, rarely the right call.

**Forward note for the writer (do not teach here):** a token that *references another CSS variable* (e.g. `--font-sans: var(--font-inter)`) must be defined in a `@theme inline { … }` block, not a plain `@theme`. This matters in Lesson 5's shadcn dark-mode model, which uses `@theme inline` to point semantic tokens at `.dark`-swappable variables. Mention `@theme inline` here in **at most one sentence** for recognition only if it fits naturally; otherwise leave it entirely to Lesson 5. The plain-`@theme` examples in this lesson assign literal values, so plain `@theme` is correct for them — don't let an example contradict the `inline` rule.

Components/diagrams (this section carries the lesson's primary visual):
- **`@theme`→utilities mapping diagram** (lesson-specific Astro component, e.g. `ThemeTokenMap`, inside `<Figure>`). This is the analog of Lesson 1's `UtilityToCssMap`. Pedagogical goal: make the determinism *visible* — left column a `@theme` line, right column the family of utilities it mints, with the shared `{name}` segment highlighted in both so the eye tracks how `--color-brand` becomes the `brand` in `bg-brand`. Two or three rows (a color token, a spacing token, a radius token). Caption: "One token in, a whole utility family out — the namespace decides which family." This is the single most important asset in the lesson; describe it precisely so the component agent nails the highlight-the-shared-segment behavior.
- A `CodeTooltips` block on the `@theme` example to gloss `oklch(...)` ("OKLCH color — perceptually-uniform; the v4 default. Color spaces are Chapter 021.") and the `--spacing-*` token, so the student isn't derailed by unfamiliar syntax inside the code.

Exercise (placed right after the mapping diagram, while the rule is hot):
- **`Dropdowns` (fenced-code mode)** drilling the #1 misconception directly: give a `@theme` block with the namespace prefixes blanked (`___-brand: oklch(...)`, `___-gutter: 1.75rem`, `___-card: 0.75rem`) and a comment on each line stating which utility must exist (`/* must produce bg-brand, text-brand */`, `/* must produce p-gutter, gap-gutter */`, `/* must produce rounded-card */`). The student fills the namespace that mints the named utilities. This is the exact reverse-direction drill that cements the mapping. Author the `answers` array with plausible decoys (`--bg`, `--brand`, etc.).

Watch-outs folded in (inline, at the point each bites):
- **Token doesn't mint a utility → wrong namespace prefix.** The canonical bug: you wrote `--brand-color` and `bg-brand` doesn't exist, because `brand` isn't a recognized namespace. The fix is `--color-brand`. State this as the first debugging question, mirroring Lesson 1's "is the class in the DOM?" reflex.
- The text-scan rule from Lesson 1 still governs: a token mints a utility, but the utility only ends up in the output CSS if the scanner *sees the class string literally* in your source. Restate in one sentence; cross-reference Lesson 1.
- `@theme` tokens are global (they resolve on `:root`). Name this in one line as the reason a token is available everywhere — but defer the *why* (custom properties, inheritance, the cascade) to Chapter 019 with a forward pointer. Do not explain `:root` or inheritance mechanics here.

### `@utility` and `@custom-variant`: extending the surface

Pedagogical goal: the student recognizes the two directives that add to the utility/variant surface when a single `@theme` token can't express the pattern, and knows the threshold for reaching for them. Keep this lighter than `@theme` — these are occasional tools.

Content:
- **The gap `@theme` leaves.** `@theme` defines *values* that plug into *existing* utility families. It can't create a brand-new utility for a property Tailwind doesn't expose, and it can't create a new variant prefix. Those are what the next two directives are for.
- **`@utility` — author a custom utility in CSS.** For a cross-cutting visual pattern that doesn't map onto a single existing utility (the threshold: it shows up in three+ components — reuse Lesson 1's "every arbitrary value is a signal" instinct, now applied to "this repeated arbitrary-property string wants to be a named utility"). Show the static form (e.g. a `scroll-snap-x` utility wrapping the handful of scroll-snap declarations a horizontal snap container needs). Mention the **functional form** briefly for recognition — `@utility tab-* { tab-size: --value(integer); }` generates `tab-2`, `tab-4`, … — without making the student author one (functional `--value()` form verified current in v4, June 2026). Cross-reference Lesson 1's `@apply` discussion: `@utility` is the *right* way to name a reusable utility (it stays in the utility layer and composes), whereas `@apply` folding utilities into a named *component* class is the form Lesson 1 told them to avoid. This distinction is worth one clear sentence.
- **`@custom-variant` — author a new variant prefix in CSS.** New `variant:` gates beyond the built-ins. Two forms, both named:
  - *selector / media form* — e.g. a `pointer-coarse` variant wrapping `@media (pointer: coarse)`, used as `pointer-coarse:p-4`.
  - *DOM-state / attribute form* — e.g. a `theme-blue` variant for `[data-theme=blue]` (the documented shorthand shape is `@custom-variant theme-blue (&:where([data-theme=blue] *));`).
  - **Forward-link the dark variant explicitly:** the dark-mode gate the student will wire two lessons from now is itself a `@custom-variant` — `@custom-variant dark (&:where(.dark, .dark *));`. Show this line as the concrete payoff and the bridge to Lesson 5. Name (one sentence, no mechanics) that the `:where(...)` wrap keeps specificity neutral and that the *why* is Chapter 019 — do **not** explain specificity here.

Component/diagram:
- A `CodeVariants` (or `TabbedContent`) with two-or-three tabs, one per extender directive, each showing the directive in `globals.css` and the resulting usage in JSX, with a one-paragraph "reach for this when…" framing per tab. `CodeVariants` is the right fit (it's code-vs-code with per-pane prose). Tabs: **`@utility` (static)**, **`@custom-variant` (selector)**, **`@custom-variant` (attribute → the dark bridge)**. Use `ins=`/highlight meta to spotlight the directive line.

Exercise (placed after the extenders, before `@container`):
- **`Matching`** pairing each directive to the job only it can do: `@theme` ↔ "add a value to an existing utility family (a brand color, a spacing step)"; `@utility` ↔ "create a brand-new utility for a property no built-in utility covers"; `@custom-variant` ↔ "create a new variant prefix that gates utilities on a selector or media query"; `@import "tailwindcss"` ↔ "turn the framework on — utilities, default theme, and Preflight." This is the directive-discrimination check — the lesson's second core assessable. (A `Buckets` is an acceptable alternative if the chosen exercise agent prefers sorting usage examples under directive headers, but `Matching` reads tighter for a 1:1 job mapping.)

### `@container`: layout that reads the component's width

Pedagogical goal: recognition + the shape, not mastery. The student should leave knowing container queries exist, are first-class in v4, and *why* they beat viewport breakpoints for reusable components — but the depth is Chapter 021 lesson 7. Keep this section short.

Content:
- **The problem viewport breakpoints can't solve.** Lesson 1's `md:` prefixes gate on the *viewport* width. A reusable component (a card) might sit full-width in one place and in a narrow sidebar in another — same viewport, different available width. Viewport breakpoints style it identically; the component should adapt to *its own* box.
- **The shape.** Mark an ancestor a container with the `@container` utility (on the JSX element — tie back: this is a class on the tag, same as everything in Lesson 1). Query it with **`@`-prefixed variants**: `@sm:p-6`, `@lg:grid-cols-3`. Optionally **named** containers (`@container/sidebar` on the parent, `@sm/sidebar:p-6` on the child) to disambiguate nesting, and **max-width** queries (`@max-md:hidden`). Name these forms; don't drill them. Tie back to the `@theme` table: the `@sm`/`@md` breakpoints come from the `--container-*` namespace — same mint-a-utility model the student just learned, now producing container-query variants.
- **The required ancestor.** A `@`-variant only works inside a `@container` ancestor — the canonical setup mistake (forgot to mark the container). State as a one-line watch-out.
- Forward pointer: Chapter 021 lesson 7 owns container queries (which breakpoints, the responsive discipline, the full variant set). Here it's the shape and the *why*.

Component/diagram (optional but valuable; keep it cheap):
- A small visual contrasting **viewport breakpoint vs container query**: the same card placed in a wide column and a narrow sidebar, where viewport breakpoints leave both identical but the container query lets the sidebar card collapse to one column. A lesson-specific Astro component or a simple two-panel HTML `<Figure>` (annotated illustration shape — HTML+CSS per the diagram index). Pedagogical goal: make "adapts to its own width, not the screen's" concrete in one glance. If the diagram budget is tight, a `ReactCoding` **target-match** showing a `@container` card collapsing is an acceptable substitute *because the `@container` utility and `@sm:` variants are built into Tailwind v4 and resolve under the Play CDN* (unlike custom `@theme` tokens) — but keep the starter and target tiny. Prefer the static contrast figure; reach for ReactCoding only if it reads clearer.

### The rest of the v4 surface, for recognition

Pedagogical goal: complete the directive map so the student recognizes the remaining surface in real codebases without mistaking any of it for daily work. Keep each to one or two sentences — this is a recognition pass, not instruction. Group them so the section doesn't read as a list of watch-outs (it teaches "here is the rest of the surface and when each earns its weight").

Content:
- **`@source`** — point the scanner at content paths it doesn't auto-detect (e.g. a shared UI package in a monorepo: `@source "../packages/ui/src/**/*.tsx";`). The senior reach for monorepos; restate that scanning is text-based (Lesson 1 rule, now explaining *which files* get scanned).
- **`@plugin`** — load an official plugin in CSS: `@plugin "@tailwindcss/typography";` ships the `prose` class for rendered Markdown; `@plugin "@tailwindcss/forms";` ships form-element defaults. Name both for recognition only — `prose` is cited at Chapter 021, forms at Chapter 044. Do not teach either plugin's surface.
- **`@config`** — the bridge to a legacy `tailwind.config.ts`. v4 can still load a JS config via `@config "../tailwind.config.ts";`. This is the recognition hook for older projects mid-migration; the course's own projects are CSS-first and never use it.
- **The compile pipeline.** Tie the whole lesson together: `app/globals.css` (your directives) **plus** the scanned source files feed **Lightning CSS**, which emits a **single** CSS file containing **only the utilities your source actually used**. No PostCSS, no separate build step — Turbopack runs it. This closes the loop on the text-scan rule and explains *why* unused tokens cost nothing and why a dynamically-built class name (Lesson 1's trap) never makes it into the output.

Component/diagram:
- **Compile-pipeline flow** (`<Figure>` with a lesson-specific Astro component or simple HTML flow; the diagram index calls this a sequential phase strip / annotated flow → HTML+CSS). Three-to-four nodes left-to-right: **`globals.css` + source files** → **Lightning CSS** → **one CSS file, used utilities only**. Pedagogical goal: make the build's input→output concrete and reinforce that the output is *scan-derived*, not config-derived. Cap height per the diagram index's horizontal-layout guidance. A `DiagramSequence` is overkill here — a static flow figure is enough; reserve the sequence widget for genuinely temporal step-throughs.

### Recap

Reduce the lesson to its core, mirroring Lesson 1's recap shape. Hit: config moved into CSS (`globals.css`, no `tailwind.config.ts`); `@import "tailwindcss"` is line 1 and brings utilities + default theme + Preflight; **`@theme` tokens are CSS variables whose namespace deterministically mints a utility family** (the one idea to remember — `--color-brand` → `bg-brand`/`text-brand`/…; the debugging reflex is "utility missing → check the namespace"); `@utility` and `@custom-variant` extend the surface when a value isn't enough (and `@custom-variant dark` is the dark-mode bridge coming up); `@container` lets a component query its own width; `@source`/`@plugin`/`@config` round out the surface; Lightning CSS emits one scan-derived CSS file. End with the forward hook to Lesson 3: the student can now *define* tokens and *consume* them — next they'll learn to *compose* class strings safely when components accept overrides (`cn()`), and the lesson after that, the DOM-state variants.

### External resources

`CardGrid` of `ExternalResource` cards. Candidates (the resourcer agent verifies/curates):
- Tailwind v4 **theme variables** docs (the `@theme` reference) — the canonical namespace→family lookup.
- Tailwind v4 **functions and directives** docs (`@import`, `@utility`, `@custom-variant`, `@source`, `@plugin`, `@config`).
- Tailwind **container queries** docs (the `@container` deep reference the lesson defers to).
- Optionally the Tailwind v4 announcement/upgrade page for the CSS-first model framing (recognition of *why* it changed) — keep if it adds signal beyond the docs.

---

## Terms for `Term` tooltips

Be strategic — only terms that support the lesson's goals and aren't already defined in prose:
- **Preflight** — "Tailwind's built-in base reset that normalizes browser default styles. Covered in depth in Chapter 019." (Named in *The config moved into CSS*; mechanics deferred.)
- **OKLCH** — "A perceptually-uniform color space; Tailwind v4's default palette is authored in it. Color spaces are covered in Chapter 021." (Gloss inside the `@theme` example via `CodeTooltips`, or a `Term` on first prose mention — pick one, don't double-define.)
- **Lightning CSS** — "The Rust-based CSS engine Tailwind v4 uses to parse, transform, and minify CSS — replacing the old PostCSS pipeline." (Named in the baseline and the pipeline section.)
- **container query** — "A CSS query that styles an element based on the size of an ancestor container, rather than the viewport." (In the `@container` section; reinforces the concept beyond the utility syntax.)

Do **not** add Terms for: `@theme`, `@utility`, `@custom-variant`, `@import`, `@source`, `@plugin`, `@config` (these are taught directly in prose, not glossed), or `theme token` / `utility class` / `variant` (defined in Lesson 1; reuse, don't re-gloss).

---

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- Utility classes are single-declaration classes on the JSX tag; the prefix-and-colon variant grammar; the `{property}-{value}` naming convention (Lesson 1). Assume fluent.
- `p-4` resolves through `var(--spacing-4)`; the student consumed tokens like `bg-card`, `p-section`, `rounded-card` last lesson (Lesson 1). This lesson defines them.
- The scanner reads source as text; dynamically-built class names never emit (Lesson 1). Restate in one sentence where the pipeline/`@source` makes it concrete; do not re-derive.
- Semantic role-named color tokens (`bg-card`, `text-foreground`) are the course default over raw `bg-blue-500` (Lesson 1 continuity note). Keep using them in examples.

**Explicitly out of scope (reserved for later — do not teach):**
- The `cn()` helper, `clsx`, `tailwind-merge`, conditional class composition → **Lesson 3**. (Touch only via the cross-reference that `@apply`-into-a-component-class is the wrong reach, already established Lesson 1.)
- DOM-state and structural variants (`group-*`, `peer-*`, `has-*`, `data-*`, `aria-*`) → **Lesson 4**. The `@custom-variant` *attribute form* is shown as a directive mechanism (e.g. `[data-theme=blue]`), **not** as the DOM-state-variant family — keep them distinct.
- Dark mode: semantic-token swap, `.dark` overrides → **Lesson 5**; `next-themes` React wiring, `suppressHydrationWarning`, FOUC → **Lesson 6**. Show `@custom-variant dark (...)` only as the bridge artifact; do not wire it.
- **The cascade, `@layer` (`theme`/`base`/`components`/`utilities`), source-order resolution, `:where()` specificity mechanics, why `!important` is a smell → Chapter 019 lesson 1.** This is the firmest boundary. When `@custom-variant dark`'s `:where()` wrap or `@theme`'s `:root` globality comes up, name the fact and forward-point; never explain the cascade or specificity.
- **CSS inheritance** (which properties inherit; `:root` → descendants) → Chapter 019 lesson 2. The student is told `@theme` tokens are "global"; the *inheritance mechanism* is not this lesson's.
- **Preflight's specific reset rules** (what it strips, `@layer base`) → Chapter 019 lesson 3. Named here only as "what `@import` brings in."
- **How `@theme` compiles to `:root` custom properties at depth; the three-tier token model (primitive/semantic/component); `@property` typed properties; runtime-reactive token writes from JS** → Chapter 019 lesson 4. This lesson teaches `@theme` as *authoring tokens and predicting utilities*, not the custom-property substrate beneath them. (The three-tier model is a Chapter 019 / project-standard concept — do not introduce primitive-vs-semantic tiering here.)
- **Animations and `@theme --animate-*`** → Chapter 021 lesson 5. `--animate-*` is named in the namespace table for completeness with a forward pointer; no keyframe authoring.
- **Container queries at depth** (breakpoint choices, the full `@`-variant set, responsive discipline) → Chapter 021 lesson 7. This lesson gives the shape and the *why* only.
- **The Typography (`prose`) and Forms plugins' surfaces** → cited at Chapter 021 / Chapter 044. `@plugin` is shown as the *loading mechanism*; the plugins' classes are not taught.
- **The v3 → v4 migration story** — out of scope; the course pins v4. The v3 `tailwind.config.ts` and the three `@tailwind` directives are named once each, purely for recognition.

---

## Code-convention alignment notes (for downstream agents)

- Per `Code conventions.md` §Styling — Tailwind v4: CSS-first config, no `tailwind.config.ts`; all theme tokens in `app/globals.css` under `@theme`; colors in OKLCH; spacing tied to `--spacing`. The lesson's examples must obey this — never show a JS config as a *recommended* form (only as the named-for-recognition legacy via `@config`).
- Use **semantic role-named** tokens in examples (`--color-brand`, `--color-card`) over raw palette names, consistent with the Lesson 1 continuity note and the conventions file. Do **not** introduce the three-tier primitive/semantic naming taxonomy (Chapter 019 territory) — just keep examples role-named.
- v4 syntax verified in the Lesson 1 continuity note and re-verified in this lesson's fact-check (June 2026): namespace→family mappings, `@theme` extends-by-default + `--namespace-*: initial` reset, the `@utility` functional `--value()` form, and the `@custom-variant name (&:where(...))` shorthand are all current. The CSS-variable-in-utility shorthand is `bg-(--token)` (parenthesis, auto-`var()`-wrapped) and the `!important` modifier is **trailing** — these are Lesson 1's surface, not re-taught here, but any incidental example must match.
- Deliberate pedagogical divergence to note: examples are shown as **fragments** of `globals.css` (a `@theme` block in isolation, a single directive) rather than a complete file, to keep focus on one directive at a time. The *skeleton* `Code` block in "The config moved into CSS" is the one place the whole-file shape is shown. This staging is intentional — flag it so a reviewer doesn't "fix" it by inlining every fragment into one giant file.

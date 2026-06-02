# Chapter 018 — Tailwind v4 inside the React component

## Lesson 1 — Utility-first on JSX

**Taught** — utility-first as the default for component-internal styling (vs named-class CSS); the atomic "one utility = one CSS declaration" model; ~8 utility families + `{property-abbrev}-{value}` naming convention; the prefix-and-colon variant grammar (`[breakpoint][state][utility][modifier]`, broadest gate leftmost) covering the *plain* variants only — pseudo-class (`hover:`, `focus-visible:`, `active:`, `disabled:`), form-state (`checked:`, `invalid:`), responsive (mobile-first `sm:`/`md:`/...), accessibility (`motion-reduce:`, `print:`, `contrast-more:`); `/` opacity modifier; the escape-hatch ladder (scale → opacity → `[...]` arbitrary value → `[property:value]` arbitrary property → trailing `!`); bespoke-CSS boundaries; the dynamic-class trap; the Elements/Computed reading reflex.

**Cut** — `before:`/`after:` pseudo-element variants (named only as a bespoke-CSS boundary, not taught as variants); none else significant.

**Debts** —
- Theme-token *definition* / growing the scale → Lesson 2 (`@theme` in `globals.css`). This lesson treats the student as a token *consumer*.
- `cn()` helper + conditional class composition → Lesson 3. Foreshadowed the "no template-literal concat for Tailwind classes" rule; helper not introduced.
- DOM-state/structural variants (`group-*`, `peer-*`, `has-*`, `data-*`, `aria-*`) → Lesson 4. Named as a forthcoming family via an `Aside`.
- `dark:` wiring + semantic-token theme swap → Lessons 5–6. `dark:` named as a gate only.
- Cascade / specificity / `@apply` / `@layer` / `!important` at depth → Chapter 019. Conflict behavior only asserted ("two utilities on same property, one wins").
- CSS custom properties at depth → Chapter 019. The `(--var)`/`[var(--x)]` utility forms shown as a JS-set seam, not explained.
- Responsive design discipline → Chapter 021 (grammar only here).

**Terminology** —
- Variant model: "a variant is a selector or media-query wrapper around the utility" — `hover:bg-primary` ≈ `&:hover { ... }`, `md:p-6` ≈ `@media (min-width: 48rem) { ... }`.
- Class anatomy framed as "gates on the left, declaration in the middle, value modifier on the right." Canonical dense example reused throughout: `md:hover:bg-primary/80`.
- "Every arbitrary value `[...]` is a signal the scale should grow" — the handoff frame to Lesson 2.
- `focus-visible:` is the course's default over `focus:` for focus rings.
- `gap-*` is the spacing primitive for flex/grid; sibling margins discouraged. `size-*` = width+height shorthand on the `--spacing` scale.

**Patterns and best practices** (for project chapters) —
- Semantic role-named color tokens only in app code — `bg-card`, `text-foreground`, `border-border`, `bg-primary` — never raw `bg-blue-500`. Used deliberately across this chapter to pre-wire Lesson 5's token model.
- Every interactive element gets a visible `focus-visible:` ring.
- `motion-reduce:` required on any noticeable motion.
- Never assemble a Tailwind class name from a string; use a full-string lookup map keyed by the variable. No template-literal conditional concatenation.
- Escape hatches reached for in strict order; treat repeated `[...]` as a prompt to add a token.
- `@apply` is not the senior default (reintroduces named-class indirection); bespoke CSS only at named boundaries (prose, keyframes, deep pseudo-elements, third-party overrides).

**Misc.** —
- **`cn()` path discrepancy to resolve in Lesson 3:** chapter-018 outline says `src/lib/cn.ts` imported as `@/lib/cn`, but `Code conventions.md` pins `cn()` at `lib/utils.ts` imported as `@/lib/utils` (shadcn convention). Lesson 3 should follow the conventions file (`@/lib/utils`).
- **v4 syntax verified June 2026** (carry forward): CSS-variable utilities use the `(--var)` parenthesis shorthand (auto-`var()`-wrapped); `[var(--x)]` is the fallback; the deprecated `[--x]` form is not taught. `!important` modifier is **trailing** (`utility!`, after all variant prefixes), not the v3 leading `!`.
- Components named/assumed as "already named units" for the utility-first argument; component depth itself deferred (Chapter 022).
- Lesson-specific components live at `src/components/lessons/018/1/`: `UtilityToCssMap`, `UtilityFamilies`, `ClassAnatomy`, `CardUtilities`, `ButtonVariants`.

## Lesson 2 — CSS-first config in globals.css

**Taught** — the relocation (v4 configures Tailwind in CSS, in `app/globals.css`, no `tailwind.config.ts` in a new 2026 project); `@import "tailwindcss"` as line 1 (replaces v3's three `@tailwind base/components/utilities`), bringing utilities + default theme + Preflight; the load-bearing rule **a `@theme` token is a CSS variable whose `--{namespace}-{name}` deterministically mints a utility family** (`--color-brand` → `bg-/text-/border-/ring-brand`); the namespace→family reference (`--color-*`, `--spacing-*`, `--radius-*`, `--font-*` = family only with `--font-weight-*`/`--tracking-*`/`--leading-*` as separate namespaces, `--text-*` = size with paired `--name--line-height` double-dash suffix, `--breakpoint-*`, `--container-*`, `--shadow-*`); the canonical bug (utility missing → wrong namespace prefix, `--brand-color` vs `--color-brand`); namespace reset `--color-*: initial` (closed-palette opt-in) plus the `--*: initial` nuclear option; `@utility` (static + functional `tab-* { --value(integer) }` form) for cross-cutting patterns repeated in ≥3 components; `@custom-variant` (media/feature form + attribute/class form), with `@custom-variant dark (&:where(.dark, .dark *))` shown as the dark-mode bridge; `@container` shape (mark with `@container`, gate with `@`-variants, named/`@max-*` forms named only); recognition pass on `@source` (monorepo paths), `@plugin` (`@tailwindcss/typography`→`prose`, `@tailwindcss/forms`), `@config` (legacy bridge); the compile pipeline (globals.css + scanned source → Lightning CSS → one scan-derived stylesheet, no PostCSS/separate build, Turbopack drives it).

**Cut** — v3→v4 plugin compatibility lag watch-out (outline-listed, dropped); `--animate-*` namespace row (outline listed it name-only; the delivered table omits it entirely — animation deferred to Chapter 021 L5). Neither plausibly needed downstream.

**Debts** —
- `@theme inline { … }` (token references another variable) → Lesson 5's shadcn dark-mode model. Named in one parenthetical here; not taught.
- `cn()` composition → Lesson 3 (forward hook in recap).
- DOM-state variants (`group-*`, `data-*`, etc.) → Lesson 4. The `@custom-variant` attribute form is kept deliberately distinct from that family.
- `dark:` wiring + semantic-token swap → Lessons 5–6. `@custom-variant dark` shown as the bridge artifact only, not wired.
- Cascade / specificity / `:where()` mechanics / `@layer` / why `@theme` tokens are "global" on `:root` → Chapter 019. Facts asserted, mechanics forward-pointed.
- Preflight's reset rules → Chapter 019 L3. OKLCH color-space depth → Chapter 021. Container queries at depth → Chapter 021 L7. `prose`/forms plugin surfaces → Chapter 021 / Chapter 044.

**Terminology** —
- Namespace/name framing: "the namespace decides which utility family, the name you choose travels into the utility unchanged." Reverse direction is the debug reflex: "does the token start with a real namespace?" (mirrors L1's "is the class in the DOM?").
- "A `@theme` token is permission for a utility to exist; the class string in your JSX is what makes it real" — restates L1's text-scan rule.
- `@theme` *extends* defaults (additive); clear a namespace only with `--namespace-*: initial`.
- The four-directive job split (drilled via `Matching`): `@import` turns it on / `@theme` adds a value to an existing family / `@utility` invents a new utility / `@custom-variant` invents a new variant prefix.
- Container-query framing: "ask how wide is *my own box*, not the screen"; `@`-variants only fire inside a `@container` ancestor; `@`-breakpoints come from `--container-*`.

**Patterns and best practices** (for project chapters) —
- All Tailwind config is CSS-first in `app/globals.css`; never a `tailwind.config.ts` (`@config` is legacy-recognition only, never in course projects).
- Tokens are role-named/semantic (`--color-brand`, `--color-background`), OKLCH for colors, spacing on the `--spacing` scale.
- `globals.css` wired via a side-effecting `import './globals.css';` at the top of `app/layout.tsx` (side-effecting imports go first in import order — already in the scaffold).
- Promote a repeated arbitrary-property cluster (≥3 components) to a named `@utility`, not `@apply` into a component class (L1 boundary). `@utility` stays in the utility layer and takes variants for free.
- Closed-palette discipline (`--color-*: initial`) is opt-in for design-system-strict teams, not a default.

**Misc.** —
- Examples are deliberately shown as **fragments** of `globals.css` (one directive/block at a time), except the single whole-file *skeleton* in "The config moved into CSS". Intentional staging — don't inline fragments into one file.
- Live-coding constraint (carry forward): `ReactCoding` runs against the Tailwind Play CDN and **cannot** ingest a custom `@theme` block, so student-defined-token exercises won't resolve there; assessables here are conceptual (`Dropdowns` for namespace prediction, `Matching` for directive→job). Built-in `@container`/`@sm:` *do* resolve under the CDN if ever needed.
- Lesson-specific components at `src/components/lessons/018/2/`: `ThemeTokenMap` (token→family, shared-name segment highlighted), `NamespaceFamilies` (the namespace reference table), `ContainerVsViewport` (same card, wide column vs narrow sidebar), `CompilePipeline` (globals+source → Lightning CSS → one stylesheet).

## Lesson 3 — Composing classes with cn()

**Taught** — the override bug (naive `` `...px-4 ... ${className}` `` concat leaves both `px-4` and consumer `px-8` on the element; the cascade — Tailwind's fixed emit order, not string order — silently/unpredictably picks the winner); the two-job split taught in pipeline order — `clsx` (tiny, Tailwind-blind: flattens conditionals/strings/objects/arrays, drops falsy) **then** `tailwind-merge` (`twMerge`, Tailwind-aware: groups by CSS property, keeps the **last** conflicting class, deletes the rest; understands variant/responsive prefixes and shorthand/longhand partial overlap like `p-4 px-8`); the canonical helper `export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }`; the headline rule **consumer `className` is always the last `cn()` argument** (defaults → conditionals → `className`) because last-conflicting-wins; the corrected `<Button>` (`ComponentProps<'button'>` + own prop, `{ className, ...rest }`, `{...rest}` passthrough); the four conditional forms (`&&` canonical / object / ternary / array); `tailwind-merge` blind spots (bespoke/third-party/non-utility classes — both survive); boundaries (don't `cn()` static strings, don't call off the render path, don't memoize — sub-ms cost).

**Cut** — the v4 `!important` modifier × `tailwind-merge` interaction (outline-listed; dropped — the trailing `!` participates in conflict resolution by base group, but not stated in the lesson). Not plausibly needed downstream.

**Debts** —
- CVA (`class-variance-authority`) for orthogonal size × style × state variant matrices, pairing with `cn()` → Chapter 022 L3. Named twice (forward pointer + closing `Aside`), never shown.
- `extendTailwindMerge` to teach conflict groups for custom `@utility` outputs → named once for recognition only, no config.
- DOM-state styling via `disabled:`/variants vs the plain `isPending && 'opacity-50'` boolean used here → Lesson 4. The `<Button>` deliberately uses a boolean conditional, not `disabled:`.
- `useEffect`/non-render paths → Chapter 025 (named only as "don't call `cn()` there").
- Cascade/specificity/emit-order mechanics → Chapter 019 (asserted "last rule wins, Tailwind controls emit order", not derived).
- React 19 `ref`-as-prop / forwarding `className` through `ref` → Chapter 022 L4. The `<Button>` here is plain, no `ref`.

**Terminology** —
- Mental model: **`cn() = clsx then tailwind-merge`** — "first decide which classes are present, then resolve which conflicting one survives."
- "last conflicting class wins" → therefore "`className` last" is the override rule. Stated as non-negotiable.
- `ClassValue` = clsx's exported input type; `cn(...inputs)` accepts everything clsx accepts.
- `clsx` object form: "key is the class, value is the condition" (`{ 'opacity-50': isPending }`).
- New debug suspect extending L1's "is the class in the DOM?": "did `cn()` merge it out?" (a later conflicting class deleted it).

**Patterns and best practices** (for project chapters) —
- **`cn()` lives at `lib/utils.ts`, imported as `@/lib/utils`** (shadcn convention, ships in scaffold; the path discrepancy flagged in L1/L2 Misc. is now **resolved in favor of `@/lib/utils`** — the outline's `src/lib/cn.ts`/`@/lib/cn` is overridden). Students import it; never redefine.
- Every reusable component that accepts overrides routes its class string through `cn()` with consumer `className` **last**.
- Reach for `cn()` only when there's a conditional or a consumer `className` to merge; a static class string stays a plain string.
- `&&` left side must be a **real boolean** — `Boolean(count) && '...'` or `value != null && '...'` for numbers/strings/nullable, never a bare `0`/`''` (leaks a falsy value into the string). Carries forward L1's rule.
- `tailwind-merge` must stay version-compatible with the installed Tailwind v4; ships pinned in scaffold — don't bump one without the other.
- Stay on the utility surface so `tailwind-merge` can dedupe; bespoke classes are a named boundary it can't see.

**Misc.** —
- `<Button>` uses `isPending` as its own-prop example (submitting state → `opacity-50`), chosen over `disabled` to avoid pre-empting Lesson 4's variant styling.
- Lesson-specific components at `src/components/lessons/018/3/`: `CnPipeline` (4-step `clsx → tailwind-merge` pill-row animation, used inside a `DiagramSequence`), `FeelTheBug` (the "feel the bug" interactive — naive-concat badge the student can't reliably override).

## Lesson 4 — Variants that read DOM state

**Taught** — the reflex **"before reaching for state to drive a style, ask: can the DOM already tell me this?"** (variant if yes, `useState` only as the considered exception); the "whose state?" five-family taxonomy organized by *which element holds the state* (self / parent / sibling / descendant / position), all unified as "same selector-wrapper idea, just a wider selector"; **self-attribute variants** — `data-[attr=value]:` (bracket value form) + bare `data-loading:` (presence test), with the three use-cases (library-set `data-state`, project-set `data-*`, container toggle), and `aria-*` (built-in shorthands for the nine boolean attributes each targeting `="true"`, arbitrary `aria-[attr=value]:` for everything else); **`group-*`** (mark parent `group`, child reads up the tree via `.group:hover &`, named groups `group/card`→`group-hover/card:`); **`peer-*`** (mark earlier sibling `peer`, *later* sibling reads forward only via `~`, named peers `peer/email`); **`has-[…]:`** (parent reads descendants via `:has()`, the only downward selector); **positional/structural** (`*:` direct-children, `not-*` negation e.g. `not-last:border-b`, `first:`/`last:`/`odd:`/`even:`/`only:`/`empty:`, `open:` for `<details>`/`<dialog>`); variant stacking with **constraint-outermost** order (breakpoint/theme left, state right); the closing decision walker that lands `useState + cn()` as the *last* branch.

**Cut** — nothing significant; the outline's full surface was delivered.

**Debts** —
- React `useState`, handlers, controlled inputs → Chapter 024+. Named throughout as the deliberate fallback; never shown (no hook call appears).
- Full Radix surface + shadcn components shipping these variants pre-wired → Chapter 027 L1. `data-state` named as "a library convention," not taught as Radix.
- ARIA at depth (roles, live regions, first rule of ARIA, focus management) → Chapter 027 L3/L4. Only the *styling* seam taught here.
- Constraint Validation API (`required`/`pattern`/custom validity, `:invalid` at depth) → Chapter 044 L7. Here `:invalid` is just "a pseudo-class the browser sets that `peer-`/`has-` can read."
- `:not()` / `not-*` at depth → Chapter 021 L4. `:focus-visible` internals / pseudo-class details → Chapter 021 L4.
- `dark:` wiring + `data-theme` toggle → Lessons 5–6. `data-theme="dark"` named as the forward hook only.
- `aria-invalid` + semantic-token form pattern (`border-destructive`, `ring-destructive/20`) → crosses with Lesson 5's token model (explicitly forward-pointed in the `aria-*` section).
- Cascade/specificity behind these selectors + `:where()` wrap → Chapter 019.

**Terminology** —
- "Whose state does the selector read?" is the lesson's spine — the five-arrow map (self / parent `group` / earlier-sibling `peer` / descendant `has` / position).
- Each family restated as "same selector-wrapper idea, just a wider selector," extending L1's "a variant is a selector around the utility."
- Desugaring shapes drilled: `data-[state=open]:` ≈ `&[data-state="open"]`; `group-hover:` ≈ `.group:hover &`; `peer-invalid:` ≈ `~` forward combinator; `has-[:invalid]:` ≈ `&:has(:invalid)`.
- "An ARIA attribute is read by two audiences at once" — assistive tech announces it, Tailwind styles by it; one source of truth, no drift. The senior reason to style off ARIA over an `isActive` boolean.
- **`aria-current` and `aria-invalid` have NO shorthand** — write `aria-[current=page]:` / `aria-[invalid=true]:`. `aria-current:`/`aria-invalid:` silently emit nothing.
- "ARIA values are strings, not booleans" — `aria-expanded` is `"true"`/`"false"`; the shorthand matches `="true"`, the false case needs `aria-[expanded=false]:`.
- `peer` is single-direction (forward `~` only); source order is load-bearing — the reader must come *after* the `peer` source.
- "`:has()` is the selector that finally lets a parent react to a child" — the move that deletes the most state-mirroring.
- "Disclosure widget" (`Term`): a button that shows/hides a panel — accordion, dropdown, collapsible; `data-state` is how nearly all of them expose open/closed.
- `Term`s defined: "assistive technology," "ARIA," "Constraint Validation."

**Patterns and best practices** (for project chapters) —
- Read DOM-tracked state with a variant; never mirror a DOM fact into React state. `useState + cn()` is the considered exception, only when no selector can match (server value, derived/computed value).
- Style off `aria-*` attributes that already exist for accessibility — one attribute serves screen reader + styling, can't drift.
- Pair any state-driven transform with a `transition-*` and guard it with `motion-reduce:transition-none` (carries forward L1's motion-reduce rule; applied to the rotating chevron).
- Continue semantic role-named tokens (`border-destructive`, `bg-accent`, `text-muted-foreground`) in every sample (L1/L2 convention).
- Use named groups/peers (`group/card`, `peer/email`) to disambiguate when nesting.
- `not-last:border-b` is the canonical divider idiom (separators between rows, no trailing line).

**Misc.** —
- **Deliberate divergence from final shadcn code shape:** examples use *static* hard-coded attributes (`data-state="open"`, `aria-current="page"`) so the "no JS drives this style" point lands. Production code has a library or React set these — correct and forward-pointed, not an omission.
- CDN-favorable: every variant taught (`data-*`, `aria-*`, `group`, `peer`, `has`, `*:`, `not-*`, positional, `open:`) is a *built-in* v4 variant that resolves under the `ReactCoding` Play-CDN with no custom `@theme` — so the lesson leans on live `target`-match exercises (chevron rotate, card reveal-on-hover, radio-card `has-[:checked]:`).
- v4 syntax honored: `data-[attr=value]:` bracket form; the nine boolean `aria-*` shorthands only (`aria-busy/checked/disabled/expanded/hidden/pressed/readonly/required/selected`); `peer` reads forward only; `has-[…]:`/`group-[…]:` brackets take a full selector (`has-[[aria-current=page]]`).
- Lesson-specific components at `src/components/lessons/018/4/`: `DesugarPanel` (4-step variant→CSS desugaring, used in a `DiagramSequence`), `WhoseStateMap` (the five-family spatial relationship map).

## Lesson 5 — Dark mode via semantic tokens

**Taught** — dark mode reframed as a **semantic-token swap**, not per-utility `dark:` (the naive form's three costs: maintenance/re-derive, drift, weight); a **semantic token** = color named for its *role* (`background`, `card`, `primary`, `border`, `muted`), a **theme** = one set of values for those names; the shadcn role set grouped Surfaces (`background`/`card`/`popover`) / Brand-intent (`primary`/`secondary`/`accent`/`destructive`) / Supporting (`muted`/`border`/`input`/`ring`), each surface + a paired `-foreground` (the legible-contrast unit, the pair is the unit); the headline payoff **the component's class string is byte-identical in light and dark — only the variable values change**; token definition staged simple→production: **Step A** (light values in `@theme`, `.dark { … }` overrides same `--color-*` names — works, taught as the mental model) → **Step B** (the shadcn production shape: palette as *plain* vars in `:root`/`.dark` — `--card` not `--color-card` — bridged into utilities via `@theme inline { --color-card: var(--card) }`); the load-bearing cascade insight (`bg-card` compiles to `background-color: var(--card)`, a variable *read*, so re-pointing the var re-themes everything at once, the class was never the color); **why `inline`** (a plain `@theme` resolves `var(--card)` at `:root` scope in the light value and freezes it; `inline` emits the `var(--card)` reference into the utility so the lookup happens on the element where `.dark` is in scope); the `@theme inline`-vs-plain-`@theme` rule (inline when the token points at another per-theme-overridden var; plain when the token *is* the value); `@custom-variant dark (&:is(.dark *))` as the one directive that makes `.dark` meaningful (powers explicit `dark:` + the `.dark { … }` subtree overrides); `:is()` vs `:where()` named as a specificity choice only; OKLCH at surface depth (`oklch(L C H)`, L 0–1, perceptually-uniform lightness → "lower L keep H" for darks, `oklch(1 0 0)`=white / `oklch(0.145 0 0)`=near-black, `0 0`=neutral); the one-off `dark:` carve-out (shadow/gradient/overlay) and the **two-component promotion threshold** (one use = exception, two = promote to token); tokens compose orthogonally with L4 state variants (`aria-invalid:border-destructive aria-invalid:bg-destructive/10` — one string carries every theme × state); named-only extensions (non-color tokens via `--radius-*` calc rows, hue-shifted darks, multi-theme via `data-theme`).

**Cut** — `chart-*`/`sidebar-*` shadcn token groups (omitted to reduce load); explicit "testing both themes / visual regression" beyond a one-liner pointer (deferred to Unit 18); the `--radius-*` subtractive form. None plausibly needed downstream.

**Debts** —
- React-side wiring — `next-themes`, `<ThemeProvider>`, `<Providers>`, `useTheme()`, `suppressHydrationWarning`, the pre-paint script, the FOUC fix, the actual toggle → Lesson 6. This lesson **never sets `.dark`, never imports React, never names FOUC**; the whole lesson assumes "something put `.dark` on `<html>`."
- `prefers-color-scheme` / OS-preference→class wiring → Lesson 6; media-query syntax → Chapter 021 L6. Only "system preference exists" is named.
- Cascade / specificity / `:is()` vs `:where()` mechanics / `@layer` → Chapter 019 L1. Asserted ("`.dark` wins the cascade", "`:where()` is zero-specificity"), not derived.
- CSS custom properties + how `@theme` compiles to `:root` at depth → Chapter 019 L4.
- OKLCH color space at depth / color theory / authoring a palette → Chapter 021 L2. Student only *reads* shadcn's values here.
- Color-contrast / WCAG AA discipline → Chapter 027 L2 (the playground's contrast chip only *previews* the stakes).
- shadcn copy-paste model / where this `globals.css` comes from → Chapter 027 L1.

**Terminology** —
- The one-sentence mental model: **"components ask for a role; the active theme answers; flipping the `.dark` class re-answers every question at once."**
- "Name the role, not the value" is the lesson's pivot; "the pair is the unit" for surface + `-foreground`.
- Step A / Step B naming for the two `globals.css` forms; **Step B is canonical** ("write Step B") because it's the exact shape pasted from shadcn and cleanly separates *the palette* (`:root`/`.dark`) from *the Tailwind binding* (`@theme inline`).
- `Term`s defined: **semantic token**, **foreground** ("the on-surface color: text + icons"), **OKLCH**.
- "the class was never the color — it was always a reference to a variable, and the theme owns the variable."

**Patterns and best practices** (for project chapters) —
- **The canonical `globals.css` order:** `@import "tailwindcss";` → `@custom-variant dark (&:is(.dark *));` → `:root { … }` (light, plain `--token`s, OKLCH) → `.dark { … }` (same names, swapped values) → `@theme inline { … }` (`--color-*: var(--token)` bridge + `--radius-*` calc derivations). Directive before use; bridge after the palette it reads.
- **`:root`/`.dark` hold plain vars (`--card`); the `--color-` prefix appears *only* in `@theme inline`** — mixing them is the common typo.
- Use `@theme inline` for any token that points at a per-theme-overridden variable; plain `@theme` only when the token *is* a fixed value (brand color, theme-invariant spacing step).
- Course uses **`@custom-variant dark (&:is(.dark *))`** (shadcn's current form, verified June 2026) as canonical — **this overrides the chapter outline's `&:where(.dark, .dark *)`**; `:where()` named only as the zero-specificity alternative.
- Components write theme-agnostic role-named strings (`bg-card text-card-foreground border border-border`) — no `dark:` for systematic color; this cashes in the chapter-wide token-only discipline from L1/L2.
- Inline `dark:` is correct only for genuinely one-off adjustments (shadow/gradient/overlay); promote to a token the moment the same adjustment recurs in a 2nd component.
- shadcn token set used: `--background/--foreground/--card/--popover/--primary/--secondary/--muted/--accent/--destructive/--border/--input/--ring` (+ `-foreground` pairs) and scalar `--radius`; `--radius-*` use the **multiplicative** `calc(var(--radius) * 0.8 | 0.6)` form (current shadcn, not the older `- 2px`/`- 4px`).

**Misc.** —
- `globals.css` blocks are shown as deliberate **fragments**; the full file appears once, collapsed in a `<details>` skeleton — mirror L2's fragment discipline, don't inline.
- Live-coding constraint (carry forward, same as L2): `ReactCoding`'s Play-CDN **cannot ingest a custom `@theme`/`@custom-variant`/`:root`**, so no live `globals.css` authoring — token-definition assessment is conceptual (`Dropdowns`, `Sequence`). The one CDN-safe live exercise uses built-in `dark:` utilities (with an inline `@custom-variant dark (&:is(.dark *))` in a `<style type="text/tailwindcss">`) to *feel* the naive cost.
- Lesson-specific components at `src/components/lessons/018/5/`: `BgCardResolution` (4-step `DiagramSequence` panels showing the `bg-card` → `var(--card)` → light/dark cascade walk), `OklchTokenLab` (the OKLCH lightness-slider + light/dark toggle playground with a live WCAG contrast chip — the L2-flagged `ParamPlayground`-style CSS-var preview that sidesteps the CDN limit).

## Lesson 6 — Theme switching without FOUC

**Taught** — FOUC reframed as a **timing bug**: server can't read `localStorage`/OS, emits default theme, first paint happens before React runs, so any React-side theme fix (effect/provider-on-mount) is structurally too late; the fix is a synchronous `<head>` script that writes `.dark` onto `<html>` *before the body paints* (no wrong frame = no flash); `next-themes` (~3KB) is that script packaged — it injects the pre-paint script, persists to `localStorage`, listens to `prefers-color-scheme` for `"system"`, and exposes `useTheme()`; install `npm i next-themes`; the two moving parts (`<ThemeProvider>` + `useTheme()`); the `<Providers>` wiring (provider is a Client Component, root layout stays a Server Component → fill the existing `<Providers>` wrapper with `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`); each prop's job (`attribute="class"` = the exact hook L5's `@custom-variant dark` reads; `defaultTheme="system"` = OS pref for first-timers; `enableSystem` = makes `"system"` selectable + activates OS listener; `disableTransitionOnChange` = kills transitions during swap, opt-in senior default); **`suppressHydrationWarning` on `<html>` derived** (the pre-paint script mutates `<html>`'s class before hydration → React sees a mismatch → the prop acknowledges that *one intentional, external* mutation; it's **shallow** (own attributes only, can't mask descendant mismatches) and **not** a general silencer); the toggle where the same mismatch returns one level down (a current-theme icon differs server vs client) with two outs — **CSS-only icon swap** (both icons always render, `dark:hidden`/`dark:inline` keys off the class; markup byte-identical so no mismatch; `useTheme()` used only for the post-hydration *write*; the recommended default) and **mount-gated read** (`mounted` flag flipped in `useEffect`, same-size placeholder until mounted; only when the control's *content* branches on theme); **`theme` vs `resolvedTheme`** (`theme` = user's setting, can be `"system"`; `resolvedTheme` = always concrete `"light"`/`"dark"`; flip toggles off `resolvedTheme` or they break at `"system"`); the two-check verify reflex (inspect `<html>` class flips on toggle; hard-reload dark and watch first frame) doubling as triage (**class present + no color change ⇒ L5/Tailwind side; no class ⇒ this lesson's provider side**); multi-theme extension named-only (`attribute="data-theme"` + `themes={[...]}` + per-`[data-theme=x]` token blocks).

**Cut** — `storageKey`/`localStorage` persistence-key detail (outline-listed; only "persists to localStorage" stated, key not shown); explicit `attribute="data-theme"` pairing-with-equivalent-selector mechanics (named, not shown). Neither plausibly needed downstream.

**Debts** —
- `useState` / `useEffect` as skills → Chapters 024/025. Named for recognition in the mount-gate variant only; no hook is taught (the mount-gate appears but the student isn't expected to author it).
- Deep Server/Client two-render model + why hydration mismatches happen mechanically + the `<Providers>` client boundary at depth → Chapter 030. This lesson *uses* the boundary and gives a working hydration picture, doesn't derive it.
- `prefers-color-scheme` media-query syntax → Chapter 021 L6. Only "the query exists and next-themes reads it" named.
- Server-side theme reading via cookies (for SSR theme-dependent markup) → named once as the boundary in an `Aside`, not taught.
- Cascade / specificity behind `.dark` → Chapter 019 (carried from L5).
- Visual-regression testing both themes → Unit 18 / Chapter 095 (one-line pointer).

**Terminology** —
- Lesson spine / mental model: **"the flash is a timing bug — default theme paints, then JS corrects it; next-themes wins the race by writing the class in a blocking `<head>` script before the body paints."**
- `Term`s defined: **FOUC** ("flash of the wrong-themed content before the right theme applies"), **hydration** (one-line refresher: React's second browser pass over the server's HTML, attaching handlers; deep model deferred), **`next-themes`**, **`prefers-color-scheme`**, **hydration mismatch** ("React's first browser pass produces HTML differing from the server's").
- "the mismatch is not a bug — it's the fix working as designed" — the framing that licenses `suppressHydrationWarning` *here and only here*.
- `attribute="class"` and L5's `@custom-variant dark (&:is(.dark *))` are "two ends of the same wire."
- The triage split: **class present but no color change ⇒ L5's problem; no class at all ⇒ this lesson's problem.**

**Patterns and best practices** (for project chapters) —
- **Single consolidated `<Providers>` Client Component** holds *all* app-wide providers (`<ThemeProvider>`, later the query client + i18n provider) in one `'use client'` boundary — deliberately **diverges from shadcn's per-provider `theme-provider.tsx`**; an `Aside` flags this so students map the two when copying shadcn.
- `'use client'` lives only at the top of the providers file, never the root layout; `<html>`/`<body>` stay server-rendered.
- `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>` is the canonical prop set (verified June 2026).
- `suppressHydrationWarning` goes on `<html>` and only there; never used to silence a real mismatch elsewhere.
- **CSS-only icon swap is the default toggle** (both icons render, `dark:hidden`/`dark:inline`); reach for the mount-gate only when the control's *content* (not just styling) branches on theme.
- Toggles flip off **`resolvedTheme`**, never `theme`.
- Continue semantic role-named tokens in styled examples (chapter-wide discipline).

**Misc.** —
- **Providers path resolved to `app/_components/providers.tsx`** (the delivered MDX), **superseding the outline's `app/providers.tsx`** and the chapter outline's `src/components/providers.tsx`. The MDX presents it as already existing from "the previous chapter" (Ch.017 forecast) and merely fills in `<ThemeProvider>`'s props. The outline's flagged discrepancy (curator may prefer strict `_components` alignment vs. forward-referencing the private-folder convention) is therefore decided in favor of `_components`; Chapter 030 L2 is the relocation/boundary-deepening point if any.
- **Last teaching lesson of Chapter 018**; the quiz (L7) follows. This lesson cashes in L5's entire handoff ("something puts `.dark` on `<html>`") — open lessons after the quiz can assume the full light/dark stack (Tailwind tokens + next-themes wiring) is in place.
- next-themes version verified **0.4.x (0.4.6, June 2026)**; pin in scaffold, import only as `from 'next-themes'`. React-19 inline-`<script>` dev warning downgraded to a one-line recognition `Aside` (not a 2026 concern).
- Live-coding constraint (carried from L2/L5, hard): `ReactCoding`'s Play-CDN **cannot ingest a real next-themes provider / `app/layout.tsx` / `localStorage` race** — the one live exercise is the **CSS-only icon swap** using the `<style type="text/tailwindcss">@custom-variant dark (&:is(.dark *));</style>` shim with a `.dark` ancestor; FOUC/provider/`suppressHydrationWarning` assessment stays conceptual (`Sequence` ordering drill, `MultipleChoice`). Glyphs (☀/☾) used instead of an icon import to keep the exercise about the `dark:` variant.
- Lesson-specific component at `src/components/lessons/018/6/`: `FirstPaintRace` (the twin naive-vs-fixed first-paint timeline, 6 steps, used inside a `DiagramSequence` — the lesson's primary visual).
- `VideoCallout` present (Dave Gray, `7zqI4qMDdg8`); flagged Tailwind v3 config but next-themes mechanics identical.

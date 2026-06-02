# Dark mode via semantic tokens

**Title (h1):** Dark mode via semantic tokens
**Sidebar label:** Dark mode tokens

---

## Lesson framing

This is the Tailwind/CSS half of dark mode. Lesson 6 owns the React wiring (`next-themes`, FOUC, the toggle). This lesson stops at "the `.dark` class is on `<html>`" — it never sets the class, never imports React. State the boundary in the intro so the student doesn't expect a working toggle yet.

**The one decision this lesson sells.** Dark mode is *not* `dark:` sprinkled per utility. It's a **semantic-token swap**: components write one theme-agnostic class string (`bg-card text-card-foreground border-border`), and the *theme* — not the component — decides what those tokens resolve to. The student arrives able to write `dark:bg-slate-800` (Lesson 1 taught `dark:` as a gate). The lesson's whole job is to make them *not* reach for that as the default, and to install the token model instead. Lead with the pain (the naive form), then relieve it.

**Pedagogical spine — build the model in one direction, simple → production.** The student should not meet the full shadcn `globals.css` cold. Stage it:

1. **Naive `dark:` per utility** — make them feel the cost (every component re-derives the dark palette; darks drift; class strings double).
2. **The idea**: name colors by *role* (`background`, `foreground`, `card`), not by *value* (`slate-800`). A token is a variable; a theme is a set of values for those variables.
3. **Simplest working form**: tokens in `@theme`, overridden in `.dark`. This is the outline's original model and it *works* — teach it as the mental model.
4. **The production form (what you actually copy from shadcn)**: tokens live in `:root`/`.dark` as plain CSS variables; `@theme inline { --color-background: var(--background) }` bridges them into utilities; `@custom-variant dark (&:is(.dark *))` is the one directive that makes `.dark` win. Explain *why* the indirection exists (the `inline` keyword and the cascade) rather than presenting it as boilerplate.

Step 3→4 is the lesson's hardest move; budget the most care there. The payoff sentence: **the component's class string is identical in both themes — only the variable values change.**

**Why this matters in production stakes.** Frame it as a maintenance/consistency problem, not an aesthetics one. A real SaaS ships light + dark from day one (users expect it). The `dark:` approach means every new component is a second design problem and the two palettes silently diverge. The token swap means a designer changes one `.dark` block and the whole app re-themes. This is the senior reason, and it generalizes: the same indirection later powers brand themes, high-contrast mode, per-tenant theming (named, not taught).

**Tie to prior chapters.** Chapter 018 has *already been pre-wiring this*: every sample since Lesson 1 used role-named tokens (`bg-card`, `text-foreground`, `border-border`) instead of `bg-blue-500` (continuity notes, L1/L2/L4 patterns). Cash that in explicitly — "you've been writing the consumer side of this model all chapter; now you'll write the definition side." Lesson 2 taught `@theme` and named `@custom-variant dark (&:where(.dark, .dark *))` as "the dark-mode bridge" and flagged `@theme inline` as a debt owed here. This lesson pays both debts.

**Why OKLCH, kept shallow.** Colors are in OKLCH because lightness is perceptually uniform — a `0.1` lightness step looks the same magnitude at any hue, so building a dark variant is "lower the L, keep H." No color theory; OKLCH depth is Chapter 021. Form is `oklch(L C H)`. This is the one genuinely new syntax in the lesson; give it a moment but don't dwell.

**Live-coding constraint (carry forward from L2 continuity notes).** `ReactCoding` runs Tailwind off the Play CDN and **cannot ingest a custom `@theme`/`@custom-variant`/`:root` block** — student-defined tokens won't resolve there. So: do **not** ask the student to author `globals.css` in a live editor. The one built-in that *does* resolve under the CDN is the `dark:` variant itself (and `.dark` class toggling). Lean the interactive budget on (a) `ParamPlayground` (pure CSS-var preview, no Tailwind compile needed — perfect fit), and (b) one `ReactCoding` target-match that uses *built-in* dark utilities to feel the naive cost. Concept checks (`Buckets`, `Dropdowns`) carry the token-model assessment.

**Diagrams over prose for the indirection.** The `:root`/`.dark` → `@theme inline` → utility → DOM resolution chain is the concept students miss. Make it a `DiagramSequence` (resolution walk) — that single visual is worth more than three paragraphs.

---

## Lesson sections

### Two themes, and the naive way to get there

**Goal:** establish the problem and make the naive solution's cost *felt*, not asserted.

Open with the concrete senior question: the app needs a light and a dark theme. The student already knows `dark:` from Lesson 1 (named as a gate). Show the obvious first reach — a card styled with `dark:` on every color utility:

```tsx
<div className="bg-white text-slate-900 border-slate-200 dark:bg-slate-800 dark:text-slate-50 dark:border-slate-700">
```

Use a single `Code` block. Then name the three costs in prose (keep tight, one line each):
- **Maintenance** — every component re-derives the dark palette by hand.
- **Drift** — `slate-800` here, `slate-900` there; the darks diverge across components and nobody notices.
- **Weight** — six-to-ten extra utilities per element; the class string doubles.

Land the reframe: the component shouldn't *know* the dark palette at all. It should ask for a *role* ("the card surface", "the muted text") and let the theme answer. That sentence is the pivot into the next section.

**Optional interactive — feel the cost.** A `ReactCoding` in `target`/`live` mode: a small two-card row where the target is correct in both themes but the starter only has the light `dark:` utilities half-written, so the student hand-adds the `dark:` duplicates and *feels* the doubling. Keep it short (this is a "feel it", not a drill). Built-in utilities only — no custom theme — so it resolves under the CDN. If this proves awkward, cut it; the section stands on the code block + prose. Mark as nice-to-have for the writer.

`Term`: **FOUC** is *not* introduced here (Lesson 6). Do not define it.

---

### Naming colors by role, not by value

**Goal:** install the semantic-token mental model before any new syntax.

The core idea, stated plainly: a **semantic token** is a color named for *what it's for* (`background`, `foreground`, `card`, `primary`, `border`, `muted`) rather than *what it is* (`white`, `slate-800`). A **theme** is one set of values for those token names. Two themes = two value sets, same names.

Introduce the canonical shadcn role set and the **`*` / `*-foreground` pairing convention** — this is the single most useful idea to anchor: every surface token has a matching foreground token for the text/icons that sit on it (`card` + `card-foreground`, `primary` + `primary-foreground`, `muted` + `muted-foreground`, `destructive` + `destructive-foreground`). The pair guarantees legible contrast in *both* themes because the designer tunes them together.

Present the role set as a small reference — a `Card`/`CardGrid` or a plain table. Group by tier so it's scannable, don't just list:
- **Surfaces:** `background`, `card`, `popover` (+ their `-foreground`)
- **Brand/intent:** `primary`, `secondary`, `accent`, `destructive` (+ their `-foreground`)
- **Supporting:** `muted` (+ `muted-foreground`), `border`, `input`, `ring`

Make the payoff concrete by rewriting the naive card from the previous section into token form, side by side. **Use `CodeVariants`** (before/after is its purpose) — tab "Per-utility `dark:`" vs tab "Semantic tokens":

```tsx
// tokens
<div className="bg-card text-card-foreground border border-border">
```

The one-sentence framing in the token tab: **this class string is the same in light and dark — the theme changes the values, not the markup.** That's the whole lesson in one diff.

Connect back: "you've written exactly these utilities all chapter (`bg-card`, `text-foreground`) — Lesson 1 had you consume them before they were defined. This is where they come from."

`Term` candidates: **semantic token** (define inline via `Term` the first time, since the whole lesson rides on it), **foreground** (clarify it means "the on-surface color: text + icons", a usage students won't guess).

`Dropdowns` exercise (concept check, CDN-safe — no compile): a short snippet of JSX with `___` blanks where the student picks the right *role* token from a `<select>` for each element — e.g. a muted timestamp → `text-muted-foreground`, a primary button's label → `text-primary-foreground`, the card's hairline → `border-border`. This drills "pick the role", which is the daily skill. Grades the *naming reflex*, not syntax.

---

### Defining the tokens in globals.css

**Goal:** teach how the two value sets get defined and how `.dark` swaps them. This is the syntax core. Stage it simple → production.

**Step A — the simplest form that works (mental model).** Show that tokens are just `@theme` entries (Lesson 2: a `--color-*` token mints `bg-*`/`text-*`/`border-*`). Light values go in `@theme`; the `.dark` class overrides the same variable names:

```css
@theme {
  --color-background: oklch(1 0 0);
  --color-foreground: oklch(0.145 0 0);
  --color-card: oklch(1 0 0);
  --color-card-foreground: oklch(0.145 0 0);
}

.dark {
  --color-background: oklch(0.145 0 0);
  --color-foreground: oklch(0.985 0 0);
  --color-card: oklch(0.205 0 0);
  --color-card-foreground: oklch(0.985 0 0);
}
```

Explain the cascade in one move: the utility `bg-background` compiles to `background-color: var(--color-background)`; when `.dark` is on an ancestor, the cascade resolves `--color-background` to the dark value; every dependent utility updates at once. **This is the load-bearing insight** — the utility reads a *variable*, so re-pointing the variable re-themes everything. Make this the `DiagramSequence` (below). Tell the writer: present Step A as a working model the student fully understands before complicating it.

**Step B — the production form (what shadcn actually ships, what you'll copy).** Now introduce the real shape and motivate the one difference. In shadcn's `globals.css` the tokens live in `:root` and `.dark` as *plain* CSS variables (`--background`, not `--color-background`), and a separate **`@theme inline`** block bridges them into Tailwind:

```css
@custom-variant dark (&:is(.dark *));

:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  /* …primary, secondary, muted, accent, border, input, ring, destructive… */
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  /* …dark overrides for the rest… */
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --radius-lg: var(--radius);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-sm: calc(var(--radius) * 0.6);
}
```

**Use `AnnotatedCode`** on this block (it has multiple parts that each need focus). Steps:
1. `@custom-variant dark (&:is(.dark *))` — defines what "dark" *means* as a selector (covered in its own section next; here just name it as line 1).
2. `:root` — the **light** theme: plain CSS variables, one per role, OKLCH.
3. `.dark` — the **dark** theme: same variable names, different values. Nothing else.
4. `@theme inline` — the bridge: maps each Tailwind color token (`--color-card`) to the CSS variable (`var(--card)`). *This* is what makes `bg-card` exist as a utility.

**Why `inline` (the question students actually have).** Spell it out because it's the lesson's subtlest point and Lesson 2 owes it. Plain `@theme` *resolves* a token's value at compile time. If you wrote `--color-card: var(--card)` inside a plain `@theme`, Tailwind would try to resolve `var(--card)` to its *current* (light) value and freeze it — dark would never apply. The **`inline` keyword tells Tailwind to emit the `var(--card)` reference *as-is* into the utility** (`background-color: var(--card)`), so the cascade — not the compiler — picks the value, and `.dark` rewriting `--card` flows through. One-sentence rule: **`@theme inline` when the token points at another variable you intend to override; plain `@theme` when the token *is* the value.**

Then resolve Step A vs Step B honestly (don't pretend A was wrong): Step A also works because plain `@theme`'s `var(--color-card)` output happens to be overridable too. Both reach the same cascade. **Step B is canonical because it's the shape you copy from shadcn** (Chapter 027) and it cleanly separates "the palette" (`:root`/`.dark`) from "the Tailwind binding" (`@theme inline`) — and it's the form that lets `--radius`-style scalar tokens drive `calc()`-derived utilities. Teach B as the one to write.

**Whole-file skeleton.** Close with one collapsed `<details>` or a single `Code` block showing the full `globals.css` order: `@import "tailwindcss"` → `@custom-variant dark` → `:root` → `.dark` → `@theme inline`. The student needs to see the assembly once. (Note for writer: this is the only place the whole file appears; the teaching blocks above are deliberate fragments — mirror L2's fragment discipline.)

**Watch-outs, inline where they bite** (not a bucket section):
- Token missing as a utility → it's not in `@theme inline` (or wrong `--color-` prefix). Extends L2's "does the token start with a real namespace?" debug reflex.
- Colors don't change when `.dark` is present → the `@custom-variant dark` line is wrong or absent (next section), or you defined the value in plain `@theme` and it froze.
- `:root`/`.dark` define *plain* variables (`--card`); the `--color-` prefix appears *only* in `@theme inline`. Mixing them is the common typo.

`Term`: **OKLCH** — define inline the first time it appears in the CSS (`oklch(L C H)`: lightness 0–1, chroma, hue; perceptually-uniform lightness). One sentence; depth is Chapter 021.

#### Diagram — `DiagramSequence`: how `bg-card` resolves

Pedagogical goal: make the variable-cascade *visible* so the student trusts that one class string yields two colors. This is the concept the whole lesson depends on; a static figure can't show the swap.

Steps (each a simple HTML/CSS panel inside `DiagramStep`, horizontal, capped height — this is a small visual aid, not a system graph):
1. **JSX:** `<div className="bg-card">` — highlight `bg-card`.
2. **Compiled CSS:** `.bg-card { background-color: var(--card); }` — the utility reads a *variable*, not a color.
3. **Light:** `:root { --card: oklch(1 0 0) }` resolves → white surface swatch.
4. **Dark:** `<html class="dark">` → `.dark { --card: oklch(0.205 0 0) }` wins the cascade → dark surface swatch. Same node, same class, swapped value.

Caption the through-line: "the class never changed — only which `--card` value won." Wrap per the diagrams index (DiagramSequence is its own card; do **not** wrap in `<Figure>`).

#### `ParamPlayground` — feel the swap and the contrast pair

Pedagogical goal: let the student *manipulate* the model — slide OKLCH lightness and toggle light/dark — to internalize "tokens are values you tune per theme" and to feel the `*`/`*-foreground` contrast relationship. `ParamPlayground` is a perfect fit (pure CSS-var preview, no Tailwind compile, sidesteps the CDN limit; the component doc explicitly flags token-console/OKLCH-lab as its showcase use).

Design:
- `Param` sliders for surface lightness `L` (0–1) and foreground lightness; a `select` or `toggle` for a hue; a `toggle` for light/dark that swaps which value set the preview reads.
- `Preview`: a mock card (`background: oklch(var(--surfaceL) ... )`, text using the foreground value) so changing the slider re-themes the card live.
- `Readout` with the `wcagContrast`/`wcagPasses` env helpers: show the live contrast ratio between the surface and its foreground, with a pass/fail chip. This quietly previews the accessibility stakes (contrast is theme-dependent — Chapter 027 owns it) without teaching WCAG here.

Keep it one playground; don't overload controls. The takeaway chip: a token pair must pass contrast in *both* themes — which is exactly why surfaces ship with their own `-foreground`.

---

### Telling Tailwind what "dark" means

**Goal:** isolate the one directive that makes the swap fire, and explain its selector + specificity so it isn't magic.

`@custom-variant dark (&:is(.dark *));` (Lesson 2 introduced `@custom-variant`'s class form; this is its highest-value instance). Break it down:
- It defines `dark` as a variant whose selector is "this element, when it has a `.dark` ancestor" (`&:is(.dark *)`).
- Two jobs at once: it powers any *explicit* `dark:` utility you still write (the carve-out below), **and** — because the whole `.dark` subtree matches — it's the switch under which the `.dark { ... }` variable overrides take effect on every descendant.
- The class goes on `<html>` (Lesson 6 wires that). Here the student only needs to know: *something* puts `.dark` on the root, and this directive is what Tailwind reads.

**`:is()` vs `:where()` — name the choice, don't belabor.** shadcn ships `(&:is(.dark *))`. The Tailwind-core default is `(&:where(.dark, .dark *))`. The only difference is **specificity**: `:where()` contributes zero, `:is()` contributes its argument's specificity. The senior reading: `:where()` keeps dark rules maximally overridable (safest default); shadcn uses `:is()` and it's the form you'll copy. Teach `:is()` as the canonical shape (because the student will paste shadcn's file in Chapter 027) and mention `:where()` as the zero-specificity alternative in one line. Don't make this a decision the student must agonize over — note it and move on. Specificity mechanics are Chapter 019; forward-point, don't teach.

`Sequence` exercise (CDN-safe, no compile): give the student the four `globals.css` blocks (`@import`, `@custom-variant dark`, `:root`, `.dark`, `@theme inline`) shuffled and have them order the file correctly. Reinforces assembly order and that `@custom-variant` must precede its use. Low-stakes, high-retention.

---

### When per-utility `dark:` still earns its weight

**Goal:** prevent the over-correction. The lesson spent its energy saying "don't use `dark:`" — now carve out where it's right, so the student doesn't contort a one-off into a token.

The token model is for *systematic* color (every surface, text, border). But some adjustments are genuinely one-off and don't belong in the global palette:
- a shadow tuned differently in dark (`dark:shadow-none`),
- a hero gradient that flips,
- an illustration/image overlay that only appears in dark.

For these, inline `dark:` *is* the senior reach — promoting them to a token would pollute the palette with single-use values.

**The threshold (the actual rule):** if the same `dark:` adjustment shows up in *two* components, it's no longer one-off — promote it to a token. State it as the decision boundary. This mirrors L1/L2's "repeated arbitrary value/property → make a token/utility" reflex; cash that continuity in.

Tie to L4: the `aria-invalid` + token pattern (`aria-invalid:border-destructive aria-invalid:bg-destructive/10`) is the model in the wild — one theme-agnostic class string carries through every theme *and* every state. Show it as a one-liner (L4 forward-pointed this crossing explicitly). Reinforces that tokens compose with the state variants from L4: state and theme are orthogonal, both read off the same token set.

`MultipleChoice` (or fold into the chapter quiz instead — writer's call): "which of these belongs in a token vs an inline `dark:`?" with a one-off shadow, a card surface used app-wide, a repeated muted-text color. Checks the threshold judgment, which is the actual senior skill here.

---

### What the model gives you next

**Goal:** brief consolidation + honest forward boundary. Keep short (a few sentences, maybe a `CardGrid`), not a heavy recap.

Land the mental model in one line: **components ask for a role; the active theme answers; switching the `.dark` class re-answers every question at once.**

Name what the model scales to *without* teaching it (one line each, so the student sees the ceiling):
- **Non-color tokens** swap the same way — `--radius`, shadows, even font sizes can differ by theme/surface (the `@theme inline` `--radius-*: calc(var(--radius) * …)` rows already showed this).
- **Hue-shifted dark themes** (dark mode that shifts hue, not just lightness) are free — the values per theme are independent.
- **Beyond light/dark** — brand themes, high-contrast, per-tenant — extend via a `data-theme` attribute strategy and more value sets. Named only.

Then the explicit handoff to Lesson 6: everything here assumed "`.dark` is on `<html>`." It isn't yet — nothing sets it. **Lesson 6** wires `next-themes`, sets the class before paint (the FOUC fix), and builds the toggle. This lesson is the *what changes*; Lesson 6 is the *what flips the switch*.

Optional `ExternalResource`: shadcn Theming docs (the canonical `globals.css` the student will copy in Chapter 027). One card, end of lesson.

---

## Scope

**This lesson covers** (Tailwind/CSS side only): the cost of per-utility `dark:`; the semantic-token model and the `*`/`*-foreground` pairing; defining tokens in `globals.css` two ways (simple `@theme`+`.dark`, then the canonical `:root`/`.dark` + `@theme inline` shadcn form) and *why* `inline`; `@custom-variant dark (&:is(.dark *))` and the `:is`/`:where` specificity choice; OKLCH at surface depth (`oklch(L C H)`, perceptual lightness); the one-off `dark:` carve-out and the two-components promotion threshold; non-color tokens, hue-shifted and multi-theme as named-only extensions.

**Explicitly NOT this lesson:**
- **The React side — `next-themes`, `<ThemeProvider>`, `<Providers>`, `useTheme()`, `suppressHydrationWarning`, the FOUC inline script, the `<ThemeToggle>`** → Lesson 6. This lesson never sets `.dark`, never imports React, never mentions FOUC by name. Stop at "assume `.dark` is on `<html>`."
- **`prefers-color-scheme` / system mode at depth** → the OS-preference→class wiring is Lesson 6; media-query syntax is Chapter 021 L6. Mention "system preference exists" only as a thing Lesson 6 handles; don't write the media query.
- **The cascade, specificity, `:where()`/`:is()` mechanics, `@layer`** → Chapter 019 L1. Assert "`.dark` wins via the cascade" and "`:where()` is zero-specificity"; do not derive.
- **CSS custom properties / design tokens at depth, how `@theme` compiles to `:root`** → Chapter 019 L4. Use variables; don't teach the variable model itself.
- **OKLCH color space at depth, color theory, building a palette** → Chapter 021 L2. Read shadcn's values; don't teach how to author a palette.
- **Color-contrast / WCAG AA discipline** → Chapter 027 L2. The `ParamPlayground` contrast chip *previews* the stakes; don't teach the standard.
- **Visual-regression testing both themes** → Unit 18 (Chapter 089/095). Name "test both themes" as a one-liner at most.
- **`@theme`, `@utility`, `@custom-variant` basics, the namespace→family rule** → already taught Lesson 2; restate in one clause when reused (e.g. "`@theme` mints utilities, from L2"), don't re-teach.
- **`cn()`, the override pattern** → Lesson 3; not needed here (no className composition in these samples).
- **The L4 state variants** (`data-*`, `aria-*`, `group/peer/has`) → taught; reused only as the one `aria-invalid` + token crossing one-liner, forward-pointed by L4.
- **shadcn component templates / the copy-paste model / Radix** → Chapter 027. Reference shadcn as "where this `globals.css` comes from"; don't install or teach components.
- **Tailwind v3 `darkMode: 'class'` config / the v3→v4 migration** → out of scope; course pins v4. Don't mention the JS-config dark-mode form.

**Prerequisite one-liners (restate, don't re-teach):** a Tailwind utility is a selector wrapper that often reads a CSS variable (L1); a `--color-*` token in `@theme` mints `bg-*`/`text-*`/`border-*` (L2); `@custom-variant` defines a new variant prefix, class-attribute form (L2); `dark:` is a variant gate (L1); role-named tokens (`bg-card`, `text-foreground`) have been the course default all chapter (L1 patterns).

---

## Notes for downstream agents (deliberate divergences from the chapter outline, verified June 2026)

1. **`:is()` not `:where()`.** The chapter outline mandates `@custom-variant dark (&:where(.dark, .dark *))`. **Current shadcn (verified June 2026) ships `(&:is(.dark *))`** — taught as canonical because it's the form the student copies in Chapter 027; `:where()` named as the zero-specificity alternative. This is intentional, not an error to "fix."
2. **`@theme inline` + `:root`/`.dark`, not direct `@theme` light + `.dark` overrides.** The outline describes the older simplified model (tokens in `@theme`, overridden in `.dark`). The lesson teaches that as the *stepping-stone* (Step A) but lands on the **current shadcn production shape** (Step B): plain vars in `:root`/`.dark`, bridged via `@theme inline`. This pays the `@theme inline` debt L2's continuity notes explicitly owed to this lesson. Verified against shadcn theming/manual-install docs, June 2026.
3. **Token names** follow current shadcn: `--background/--foreground/--card/--popover/--primary/--secondary/--muted/--accent/--destructive/--border/--input/--ring` (+ `-foreground` pairs), `--radius`. (`chart-*`/`sidebar-*` exist in shadcn but are out of scope — omit to reduce load.) Note: current shadcn gives `destructive` a `-foreground` and uses `oklch` throughout. The `--radius-*` derivations in `@theme inline` use the **multiplicative** form current shadcn ships (`--radius-md: calc(var(--radius) * 0.8)`, `--radius-sm: calc(var(--radius) * 0.6)`, `--radius-lg: var(--radius)`), verified June 2026 — not the older subtractive `- 2px`/`- 4px` form.
4. **No live `globals.css` authoring exercise** — `ReactCoding`'s Play-CDN can't ingest custom `@theme`/`:root`. Token-definition assessment is conceptual (`Dropdowns`, `Sequence`, `Buckets`); the live budget is `ParamPlayground` (CSS-var preview) + at most one built-in-`dark:` `ReactCoding`.

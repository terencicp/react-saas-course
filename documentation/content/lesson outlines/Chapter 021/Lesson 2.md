# Lesson outline — Chapter 021, Lesson 2

## Lesson title

- Title: `OKLCH, color-mix(), and the alpha syntax`
- Sidebar label: `Color`

## Lesson framing

Second lesson of Chapter 021 (the visual surface), the color layer that sits on the typography layer from lesson 1.
The student arrives already fluent in the *consumption* of color: they write `bg-card text-card-foreground border-border` semantic tokens (ch018 L5), know the three-tier token model (ch019 L4), have `next-themes` toggling `.dark` on `<html>` with the FOUC handled (ch018 L6), and have *seen* `oklch(L C H)` literals at surface depth (ch018 L5 — L is 0–1, perceptually uniform, `0 0` is neutral) without ever being told why that color space.
This lesson is the **why and the authoring layer**: it teaches OKLCH as the space tokens are *stored* in, `color-mix(in oklch, …)` as the runtime mixer a senior reaches for, the `/N` alpha syntax and how it compiles to `color-mix(in oklab, …)`, `opacity` vs. per-property alpha as two different tools, WCAG contrast as the discipline, and `prefers-color-scheme` vs. the `.dark` site preference.

Pedagogical conclusions that shape the whole lesson:

- **The student is a token *consumer* becoming a token *author*.** The single highest-leverage shift: they already type `bg-card`; now they learn what value lives behind it and how to *derive new values from it at runtime* instead of pre-computing a palette. Frame every section as "you already use this — here is the machinery, and here is the reach it unlocks."
- **Lead with the pain OKLCH relieves — make the student *feel* the HSL drift.** The core "aha" is that in HSL/hex, nudging lightness silently shifts the perceived hue and saturation, so a "10% lighter blue" looks like a different, washed-out color. OKLCH fixes this by construction. This must be *seen* on sliders, not asserted — a `ParamPlayground` comparing an OKLCH lightness ramp against an HSL lightness ramp side by side is the centerpiece. This is the senior-vs-junior differentiator of the lesson.
- **`color-mix()` is the payoff, not a footnote.** The 2026 reflex the lesson installs: hover/active/disabled/tinted-surface variants are *derived* with `color-mix(in oklch, var(--token), white 8%)`, not stored as separate `-hover` tokens. This directly cashes in the ch019 L4 rule ("express states with opacity modifiers, not new `-hover` tokens") and extends it to lightness mixing. Connect explicitly.
- **The alpha syntax is the bridge between what they type and the mixer.** The student already types `bg-blue-500/50` (named in ch018 L1). The reveal — it compiles to `color-mix(in oklab, var(--color-blue-500) 50%, transparent)` — is the moment "the `/N` modifier" stops being magic and becomes "you were calling `color-mix()` all along." The `oklab`-vs-`oklch` precision matters and is fact-checked: Tailwind's internal alpha mix uses `in oklab`; the manual mixer a senior writes for tints uses `in oklch`. State both honestly; do not flatten them into one.
- **`opacity` vs. alpha is a *decision*, not two synonyms.** The trap: `opacity-50` fades the element *and all its children* (a compositing operation that also creates a stacking context — recall ch020 L9 / the ch019 L2 "look-alike"); `bg-black/50` fades only that one declaration so text on top stays crisp. Teach it as "which one matches the design intent" with the disabled-button (opacity) vs. dialog-backdrop (alpha) as the two canonical reaches.
- **Minimize cognitive load: simple → complex, machinery before reach.** Order: the senior question (concrete hover-derivation problem) → OKLCH channels + why (the model) → `color-mix()` (the mixer the model enables) → the `/N` alpha syntax (what they already type, now demystified) → `opacity` vs. alpha (the decision) → semantic tokens cashed in with these values (tie back to ch018 L5) → `prefers-color-scheme` vs. `.dark` (the precedence) → WCAG contrast (the discipline that judges every color choice) → the remaining color surface (`currentColor`, arbitrary values, the hex-is-read-only rule). Watch-outs live inline in the section teaching the concept they qualify, never bundled.
- **Connect to prior knowledge relentlessly, one sentence each.** OKLCH literals seen in ch018 L5; semantic tokens + `-foreground` pairs from ch018 L5; three-tier model + "states via opacity not new tokens" from ch019 L4; `/N` modifier named in ch018 L1; `.dark`/`next-themes` from ch018 L6; `opacity` compositing look-alike from ch019 L2; stacking context from ch020 L9.
- **Honor the deferral boundaries (next lesson is *next door*).** `prefers-color-scheme` *media-query syntax* is owned by L6 of this same chapter — here name only the precedence story (OS preference vs. site preference, `next-themes` resolves it) and the `dark:` cash-in, do not teach `@media` mechanics. WCAG as a *discipline-level commitment* is ch027 L2 — here teach the 4.5:1 / 3:1 numbers and the DevTools tool as a working reflex, cross-ref ch027 for the commitment.
- **End state.** The student can read any OKLCH triple and predict the color; reaches for `color-mix(in oklch, …)` to derive a hover/tint instead of inventing a token; knows `bg-blue-500/50` *is* a `color-mix()` call and picks `opacity-*` vs. `/N` by design intent; stores tokens in OKLCH and never ships a new hex literal; checks contrast against the 4.5:1 reflex; and understands that the OS preference and the site preference are two different signals `next-themes` reconciles.

## Lesson sections

### Introduction (no header)

Open with the senior question, concretely (mirror the chapter outline's framing): a 2024 token written `--brand: #4f46e5` renders identically everywhere but cannot be brightened 8% for a hover state without pulling in a JS color library and pre-computing every step; the 2026 form is `--brand: oklch(0.62 0.22 263)` and the hover state is one line of CSS — `color-mix(in oklch, var(--brand), white 8%)`.
State the goal: install the color authoring layer a 2026 senior writes — OKLCH as the storage space, `color-mix()` as the runtime mixer, the alpha syntax demystified, `opacity` vs. per-property alpha as a decision, and the contrast and theme-precedence reflexes.
Connect to what they know in one or two sentences: they already type `bg-card` and `bg-blue-500/50` and have seen `oklch(...)` values flash by in the dark-mode lesson; this lesson is the machinery behind all three.
Keep it warm and brief (Pedagogical guidelines §3). No "what is a color" scaffolding, no color-theory preamble.

### OKLCH: the color space tokens live in

The model section. Teach the three channels precisely, building on the surface exposure from ch018 L5 (recall hook: "you saw `oklch(L C H)` in the dark-mode tokens — here is what each number does").

- **L — lightness**, `0`–`1` (often written as a percentage `0%`–`100%`), *perceptually uniform*: equal numeric steps look like equal brightness steps to the eye. `oklch(1 0 0)` is white, `oklch(0 0 0)` is black (tie back to the ch018 L5 examples).
- **C — chroma**, `0` (gray) to ~`0.4` (most saturated the gamut reaches). Unbounded in spec; practical max depends on L and H.
- **H — hue**, `0`–`360` degrees on the color wheel (same wheel the student may know from HSL).

Then the **two senior reasons it is the 2026 default**, each stated as a concrete payoff:
1. **Channel independence.** Changing one channel does not drift the others — a 10%-lighter blue *stays blue* and stays equally saturated. In HSL, raising lightness desaturates and shifts perceived hue; this is the bug that made hand-built hover palettes look muddy. This is the load-bearing point and is *demonstrated* (see playground below), not just claimed.
2. **Wide gamut.** OKLCH can express the P3 colors modern displays show, which hex/`rgb()` (sRGB) cannot reach. The browser maps an out-of-sRGB OKLCH color to the nearest sRGB on older monitors automatically — "write OKLCH, let the browser map down."

Close the section with the ecosystem fact: Tailwind v4 ships its *entire* default palette in OKLCH, and shadcn stores its semantic tokens in OKLCH — so the student is already shipping OKLCH whether or not they typed it. Hex still appears in legacy code; the student *reads* hex, *writes* OKLCH.

Components:
- `ParamPlayground` — **the centerpiece interactive of the lesson.** Three sliders (`L` 0–1 step 0.01, `C` 0–0.4 step 0.005, `H` 0–360 step 1) drive a preview swatch via `background: oklch(var(--L) var(--C) var(--H))`. A `Readout expr` echoing the assembled `oklch(...)` string (so the student sees the exact value they could paste into a token). Pedagogical goal: build intuition for what each channel does in isolation. Caption: "Move one channel — watch only that dimension change."
- A **second `ParamPlayground` (or a `TabbedContent` of two swatch ramps)** is the highest-value visual: an **OKLCH-vs-HSL lightness drift** comparison. One slider for lightness drives *two* swatches simultaneously — one rendered `oklch(var(--Lp) 0.18 250)`, one rendered `hsl(250 70% var(--Lp%))` — so the student sees the OKLCH swatch hold its hue while the HSL swatch washes toward gray/violet as lightness rises. Pedagogical goal: *feel* the HSL drift that OKLCH fixes — the single most persuasive moment for "why OKLCH." This is exactly the "manipulate the decision to feel it" case the playground exists for. Caption: "Same lightness change, two color spaces — watch HSL drift."

Tooltips/Term: `OKLCH` (re-defined briefly even though seen before — "a perceptually-uniform color space: L lightness, C chroma, H hue"); `gamut` ("the range of colors a display or color space can physically show"); `P3` ("the wide-gamut color space modern screens support, larger than sRGB").

### Deriving colors at runtime with color-mix()

The payoff section — the mixer the OKLCH model makes worthwhile. Teach `color-mix()` as the 2026 way to *derive* a related color instead of storing it.

Syntax, taught on one canonical example: `color-mix(in oklch, var(--brand), white 8%)` — "take `--brand`, blend in 8% white." Explain the three parts: the **interpolation space** (`in oklch` — and *why it matters*: mixing `in oklch` keeps the path perceptually even and the result vivid; mixing `in srgb` produces the muddy gray midpoint every legacy color library shipped — show `color-mix(in oklch, blue, red)` = vivid purple vs `in srgb` = dull). The two colors and the optional percentage on the second.

The senior reaches, each with the concrete use case:
- **Hover / active states:** `color-mix(in oklch, var(--primary), black 8%)` darkens on hover; mixing toward `white` lightens. This *derives* the state — directly cashing in the ch019 L4 rule "express states without minting a new `-hover` token." Make the connection explicit: ch019 L4 used opacity for this; `color-mix()` extends the same principle to lightness.
- **Tinted surfaces:** mix a brand color a few percent into the surface token for a subtly branded background (`color-mix(in oklch, var(--card), var(--primary) 4%)`).
- **Token-driven semitransparent values:** mix toward `transparent` (the bridge to the next section).

Name the reach-back: Tailwind v4 uses `color-mix()` *internally* for the `/N` opacity modifier — so the student has been calling it indirectly since ch018 L1. This sentence sets up the next section.

Browser-support framing (fact-checked June 2026 — state honestly): `color-mix()` is **Baseline Widely Available** (Chrome 111+, Firefox 113+, Safari 16.2+). The senior reaches for it without checking caniuse.

Components:
- `CodeVariants` (or a `TabbedContent` of two preview swatches) contrasting **`in oklch` vs `in srgb`** for the *same* mix — e.g. `color-mix(in oklch, blue, red)` vs `color-mix(in srgb, blue, red)`, with the rendered result visible. Goal: the student *sees* why the project default is `oklch` and treats `in srgb` as the smell. Use `data-mark-color` to highlight the interpolation keyword. If a live rendered swatch is needed (not just code), prefer a small `Figure` with two CSS swatches over a code-only block — the rendered difference is the whole point.
- `Code` blocks for the hover/tint reaches (short, in context).

Watch-out (inline): the interpolation space is not optional decoration — `in oklch` is the project default; an un-prefixed or `in srgb` mix produces the gray middle and is a smell.

Tooltips/Term: `interpolation space` ("the color space the browser travels through when blending two colors — it changes the path and the midpoint").

### The alpha syntax: bg-blue-500/50 is a color-mix() call

The demystification section — connect what the student already types to the mixer they just learned. Recall hook: the `/N` opacity modifier was named in ch018 L1 as part of the variant grammar; here it gets its mechanism.

Teach: every color utility takes a `/N` suffix for alpha — `bg-blue-500/50`, `text-foreground/70`, `border-border/40`. The reveal: this compiles to `color-mix(in oklab, var(--color-blue-500) 50%, transparent)`. Two load-bearing consequences:
1. **It composes correctly even when the base is a token** — `bg-primary/50` works because the modifier mixes the *resolved* token value with `transparent`, so theme swaps and the alpha both apply. (This is why the old "you can't put opacity on a CSS-variable color" problem is gone in v4 — fact-checked.)
2. **The interpolation space here is `oklab`, not `oklch`** — be precise. Tailwind's *internal* alpha mix uses `in oklab` (the Cartesian sibling of OKLCH, no hue channel, ideal for straight-line mixes toward transparent); the *manual* mixer a senior writes for tints uses `in oklch`. State both; do not claim they are the same. One sentence on why this is fine: mixing toward `transparent` has no hue to preserve, so `oklab` and `oklch` give the same visual result for the alpha case.

The canonical reaches: glass-morphism backdrops, dialog backdrops (`bg-black/50`), translucent borders (`border-white/10` on dark surfaces). These set up the `opacity`-vs-alpha decision in the next section.

Components:
- `AnnotatedCode` — a single block (lang `tsx`/`html`) showing a `bg-black/50` overlay class and, as a comment or paired CSS, the compiled `color-mix(in oklab, ...)` output. Steps: (1) the utility the student writes; (2) what it compiles to; (3) why the base can be a token. 3 steps, blue tint. Goal: collapse the gap between the typed form and the generated CSS.

Watch-out (inline): `bg-transparent` is *not* `bg-none` — `bg-none` removes a background *image*, not the color. A frequent confusion; name it here.

Tooltips/Term: `OKLAB` ("the Cartesian form of the same color space behind OKLCH — no separate hue axis, used for straight-line color mixing like fading to transparent").

### opacity vs. alpha: two tools, one decision

The decision section. Both make things see-through; they are *not* interchangeable. Teach the distinction as a senior call driven by design intent.

- **`opacity-*`** (`opacity-50`) makes the **entire element semi-transparent, including all its children** — it is a compositing operation on the whole subtree. The right reach for **disabled buttons** and **pending/loading UI** where the *whole control* should read as inactive. Recall hook: this is the `opacity` "look-alike" from ch019 L2 (it looks like it changes color but it composites the rendered pixels) and it **creates a stacking context** (recall ch020 L9 — relevant when a tooltip or dropdown child needs to escape).
- **Per-property alpha** (`bg-black/50`, the `color-mix` form from the last section) fades **only that one declaration**. The right reach for a **dialog backdrop or overlay** where the dimmed layer is translucent but any **text or icon on top must stay fully opaque**. Putting `opacity-50` on the overlay would fade the text too — the bug.

The decision rule, stated once: *fade the whole thing → `opacity-*`; fade one layer and keep content crisp → `/N` alpha.*

Components:
- `CodeVariants` — two tabs, **same overlay+text markup**, one using `opacity-50` (text fades — wrong) and one using `bg-black/50` (text stays crisp — right), with the rendered difference described in the prose. Use `del=`/`ins=` framing or `data-mark-color` red/green. Goal: the student sees the two produce *different* results on identical markup, cementing that they are not synonyms.
- Optionally a small `Figure` rendering both overlays side by side so the faded-vs-crisp text is *seen*, not just read — high payoff for an abstract point if the height budget allows.

Watch-out (inline): `opacity` on a parent fades every descendant and opens a stacking context; reach for it only when fading the *whole* subtree is the intent.

### Semantic tokens, now in OKLCH

The cash-in section — tie the new color values back to the token model the student already ships. Keep it tight; this is synthesis, not new model.

Restate the rule (recall hook: ch018 L5 + ch019 L4): components reference **semantic role tokens**, never primitives — `bg-card text-card-foreground border-border`, not `bg-white text-zinc-900`. What this lesson adds: the *values* behind those tokens are OKLCH triples, and they flip inside `.dark` by re-pointing the same variable to a darker-L value (e.g. `--card: oklch(1 0 0)` light → `oklch(0.18 0 0)` dark — note only L changed, exactly the "lower L, keep H" move from ch018 L5, now explained by channel independence).
Make the synthesis explicit: the reason the dark-mode swap from ch018 L5 was clean — re-point one variable, every `bg-card` re-themes — *works because* OKLCH's perceptual uniformity lets you derive the dark value by lowering L without re-tuning the others. The two lessons click together here.
Cash in `color-mix()` on tokens: a hover on a semantic surface is `color-mix(in oklch, var(--card), var(--foreground) 5%)` or, more commonly in shadcn, a dedicated `--accent` token — name both, recommend the token when the state recurs (ch019 L4 promotion threshold).

Components:
- Plain `Code` block showing a semantic token defined in OKLCH in `:root` and re-pointed in `.dark` (fragment of `globals.css`, consistent with the ch018/ch019 fragment discipline — *do not* show a whole file). Highlight that only the L channel moved between the two. Keep it short.

Watch-out (inline): never write `dark:bg-zinc-900` next to `bg-white` — that re-introduces the per-utility dark mode the token model retired (recall ch018 L5). Reach for the semantic token; let its OKLCH value flip.

### prefers-color-scheme vs. the .dark class

The precedence section. The student has `next-themes` wired (ch018 L6) and `.dark` flipping; this section disambiguates the *two* dark-mode signals without re-teaching either. **Defer the `@media` syntax to L6 of this chapter** — name only the precedence.

Two signals:
- **`prefers-color-scheme`** reads the **OS-level** preference (the user's system-wide light/dark setting).
- **The `.dark` class on `<html>`** reads the user's **site-level** preference (what they picked in *this app's* toggle).

The reconciliation: `next-themes` resolves the precedence — `defaultTheme="system"` follows the OS preference until the user overrides it with the in-app toggle, after which the site preference wins and persists (recall hook: ch018 L6 `defaultTheme="system"` + `enableSystem`). One sentence, no re-derivation.
The Tailwind cash-in: the `dark:` variant compiles to a class-based selector (the `@custom-variant dark (&:is(.dark *))` from ch018 L5 / ch019 L1) wrapped so it carries `.dark`'s single-class specificity and does not fight utility order — so the student writes `bg-card text-foreground` *once* and both themes work; the only legitimate `dark:` use left is a genuine one-off (a shadow or overlay), per the ch018 L5 promotion threshold.

Briefly name two further media-feature variants as **recognition only** (most projects do not override their defaults; this is for accessibility audits):
- `contrast-more:` — for users who enable high-contrast mode in OS settings (`prefers-contrast: more`).
- `forced-colors:` — for Windows High Contrast Mode, which replaces every color with a system palette (`forced-colors: active`).
Keep these to two sentences total; they re-appear in L6 as part of the `prefers-*` family. Cross-ref L6 for the media-query mechanics.

Components: prose-led; a single short `Code` line showing `bg-card text-card-foreground` working in both themes with no `dark:` is enough. No heavy component — this is a precedence clarification, not new machinery.

Tooltips/Term: `prefers-color-scheme` ("a media feature reporting the user's OS-level light/dark preference"); `forced-colors` ("a mode, e.g. Windows High Contrast, that overrides page colors with a user-chosen system palette").

### WCAG contrast: the 4.5:1 reflex

The discipline section — the standard that judges every color choice the student just learned to make. Teach it as a working reflex, not the full accessibility commitment (that is ch027 L2 — cross-ref it).

The numbers, stated plainly:
- **Body text needs 4.5:1** contrast against its background (WCAG AA, normal text).
- **Large text and UI text (icons, borders of controls) need 3:1** (WCAG AA, large/non-text).
- (AAA is 7:1 / 4.5:1 — name once for the audit-strict case.)

Why this lands in the color lesson: every `color-mix()` tint and every OKLCH lightness choice the student now makes can quietly drop below threshold — the `-foreground` pair exists (ch018 L5) precisely to guarantee the on-surface text passes, and OKLCH's perceptually-uniform L makes "is this text dark enough" a readable single number.
The tools: Chrome DevTools' color picker shows the live contrast ratio and the AA/AAA pass badges; the Tailwind palette shadcn ships is already contrast-audited, which is part of *why* a senior stays on semantic tokens instead of hand-picking values.

Components:
- `ParamPlayground` — reuse the OKLCH sliders but add a **live contrast readout** using the built-in `wcagContrast` / `wcagPasses` expr helpers. Foreground text rendered on a background swatch; an L (and optionally C/H) slider drives the foreground (or background); a `Readout expr="wcagContrast(fg, bg)"` shows the ratio and a second `Readout expr="wcagPasses(fg, bg, 'AA') ? 'AA pass' : 'AA fail'"` shows the verdict. Pedagogical goal: the student *watches the ratio cross 4.5:1* as they drag lightness — contrast becomes a felt constraint, not an abstract rule. This is the playground's documented "token console with a live WCAG contrast chip" use case. Caption: "Drag the text lightness — find where it passes AA."

Watch-out (inline): a color that looks fine to you may fail for low-vision users — trust the ratio, not the eye; the `-foreground` token pairing exists so you do not have to re-check every surface by hand.

Tooltips/Term: `WCAG` ("Web Content Accessibility Guidelines — the standard that defines, among much else, minimum text-contrast ratios"); `contrast ratio` ("the luminance difference between two colors, 1:1 identical to 21:1 black-on-white").

### The rest of the color surface

A short toolbox tour of the remaining color utilities, so the student leaves with the full reflex map. Keep each to a line or two.

- **`currentColor`** (`text-current`, `bg-current`, `border-current`, Tailwind's `*-current`) — the inherit-the-text-color form. An icon or border set to `currentColor` tracks the element's `color` automatically (recall hook: ch019 L2 used `currentColor` for SVG icons and borders). The reach: icons that recolor with their text, borders that match the text without a second token.
- **Arbitrary color values** (`bg-[oklch(0.6_0.2_180)]`) — the one-off escape hatch for a genuine design need, on the same escape-hatch ladder as the rest of Tailwind (ch018 L1). Reach for it rarely; a repeated arbitrary color is a signal to add a token (the same "every `[...]` is a prompt to grow the scale" rule from ch018 L1/L2).
- **The hex-is-read-only rule, restated as the lesson's closing discipline:** do not ship hex literals in new code — OKLCH is the token storage form. The only exceptions that compile to themselves are `transparent` and `currentColor`. The student *reads* the hex still in legacy code and in copied snippets; they *write* OKLCH.

Components: plain `Code` lines suffice; this is a reflex tour, not new machinery.

Watch-out (inline): Display-P3 OKLCH colors fall back to the closest sRGB on older monitors automatically — write the OKLCH value and let the browser map it down; do not hand-author an sRGB fallback.

### Check your understanding

A short consolidation beat for the two highest-leverage ideas: the OKLCH/`color-mix()` model and the `opacity`-vs-alpha decision.

Components — pick the two best fits:
- `Buckets` (primary, two-column) — sort scenarios onto the right tool: *disabled button*, *whole pending card*, *whole panel dimmed* → `opacity-*`; *dialog backdrop with crisp text*, *translucent border on dark surface*, *glass header tint* → `/N` alpha. Goal: cement the decision rule from the `opacity`-vs-alpha section. `Buckets` fits because the task is pure classification.
- `MultipleChoice` or `PredictOutput` — give an OKLCH triple change ("L 0.6 → 0.7, C and H unchanged") and ask what visually changes (correct: lighter, *same* hue and saturation; decoys: "more saturated," "shifts toward purple" — the HSL-drift misconceptions the lesson dismantled). Goal: verify the channel-independence model stuck.

Note on live-coding: the `ReactCoding` runtime uses the Tailwind Play CDN and **cannot ingest a custom `@theme` block** (carried-forward constraint from ch018 L2/L5) — so a token-authoring live exercise will not resolve. The built-in `bg-blue-500/50` alpha utilities *do* resolve under the CDN; a small target-match `ReactCoding` (build a dialog backdrop with `bg-black/50` and crisp centered text) is viable if a coding exercise is wanted, but the `Buckets` + `MultipleChoice` pair is the safer primary. Do not author a `@theme`-dependent live exercise.

### External resources (optional)

One or two `ExternalResource` cards (Pedagogical guidelines §3): the MDN `color-mix()` page and an OKLCH explainer/interactive (e.g. oklch.com or the web.dev modern-color article). Prefer the canonical, current sources surfaced during fact-check. Keep to two cards max.

## Scope

Prerequisites to redefine in one line each (do not re-teach):
- Semantic role tokens and the `-foreground` pair (`bg-card text-card-foreground`) — ch018 L5; this lesson supplies the OKLCH *values*, not the model.
- The three-tier token model and "express states with opacity, not new tokens" — ch019 L4.
- The `/N` opacity modifier as part of the variant grammar — ch018 L1; this lesson supplies its *mechanism*.
- `next-themes` toggling `.dark` on `<html>`, `defaultTheme="system"`, `@custom-variant dark` — ch018 L5/L6; this lesson supplies only the OS-vs-site *precedence*.
- OKLCH literals at surface depth (`oklch(L C H)`, L 0–1, neutral `0 0`) — ch018 L5; this lesson supplies the *channel meaning and the why*.
- `currentColor` for icons/borders — ch019 L2.
- `opacity` as a compositing "look-alike" and stacking-context trigger — ch019 L2 / ch020 L9.

This lesson does **not** cover:

- The cascade and how the `.dark` swap reaches every descendant — ch019 L1/L4 own the mechanics; cross-ref only.
- `next-themes` wiring at depth (`<ThemeProvider>`, `suppressHydrationWarning`, the FOUC pre-paint script) — ch018 L6.
- `prefers-color-scheme` / `prefers-contrast` / `forced-colors` **media-query syntax** and the `prefers-*` family at depth — ch021 L6 (next lesson). Name the precedence and the variant names only.
- WCAG as a discipline-level commitment, the full audit workflow, ARIA — ch027 L2/L3.
- The complete Tailwind OKLCH palette and its per-step coordinates — reference material, not lesson material.
- Color theory (complementary, analogous, triadic harmonies) — out of scope; the design system ships a palette.
- SVG `fill` / `stroke` mechanics at depth and icon components — ch027 L1 (`currentColor` named here as the inherit form only).
- Gradients (`bg-linear-to-*` / `bg-gradient-to-*`, `from-*`/`via-*`/`to-*`) — recognition only; the chapter does not dedicate space. If mentioned, one sentence noting they interpolate in a color space too (`in oklch` for vivid stops), no utility tour.
- Borders, radius, shadows (including shadow color and colored glows) — ch021 L3 (next-next lesson).
- Print color modes and CMYK — out of scope.

## Code conventions notes

- All examples Tailwind v4, CSS-first; tokens live in `@theme` / `:root` / `.dark` in `app/globals.css` (no `tailwind.config.ts`). Colors in **OKLCH** per the conventions file. Token fragments shown as fragments, never whole files (ch018/ch019 fragment discipline).
- Components reference **semantic** tokens, never primitives; primitive utilities (`bg-blue-500`) appear only as anti-examples or when teaching the raw `/N` mechanism on a known palette step.
- `cn()` from `lib/utils.ts` with `className` last in any example that accepts overrides; single quotes, 2-space indent, semicolons (Biome) in TSX.
- Logical properties where natural per the RTL rule; color utilities have no physical/logical split, so this mostly applies if a bordered example appears — keep examples color-focused.
- Deliberate divergences to flag for downstream agents:
  - Raw `oklch(...)`, `hsl(...)`, and `color-mix(...)` CSS shown directly (not via utilities) is **pedagogical** — the lesson is teaching the color values and the mixer, so showing the literal CSS is the point, not a smell. The `ParamPlayground` previews legitimately use raw `oklch()`/`hsl()` in inline styles to drive swatches.
  - Hex and `hsl()` appear deliberately as the *contrast* / *anti-pattern* (the thing the student reads but does not write) — do not "correct" them to OKLCH; their wrongness is the teaching point.
  - Primitive `bg-blue-500/50` is used to teach the alpha mechanism on a concrete, CDN-resolvable palette step — correct for the teaching context even though app code prefers semantic tokens; note it as intentional.

# Lesson 7 — Hero with a flicker-free theme-aware image

## Lesson title

Chapter-outline title fits. Keep: **Hero with a flicker-free theme-aware image**.
Sidebar (short): **Hero & theme-aware image**.

## Lesson type

`Implementation`

(The test-coder runs for this lesson. `tests/lessons/Lesson 7.test.ts` ships as a `describe.todo` stub — the harness and `data-testid` hooks exist, assertions TBD; the test-coder writes the assertions against the `[tested]` requirements.)

## Lesson framing

The student installs the senior reflex behind a no-FOUC theme swap: render *both* theme assets server-side and let CSS — driven by the `.dark` class `next-themes` flips — pick the visible one, so no JavaScript runs before the right image paints. They ship the hero (the page's single `<h1>`, supporting copy, two `asChild` CTAs) and the reusable `ThemeAwareImage` primitive, closing the project's no-flash commitment for image content on the first frame.

## Codebase state

**Entry.** The provided Next.js 16 + Tailwind + shadcn scaffold with the toolchain understood (Lessons 2-5) and the site header shipped (Lesson 6). `src/app/page.tsx` already renders `<Hero />` between `<SiteHeader />` and the middle sections. `src/components/hero.tsx` and `src/components/theme-aware-image.tsx` are TODO(L7) scaffolds: `hero.tsx` returns a bare `<section data-testid="hero">` with a placeholder `<h1>`; `theme-aware-image.tsx` exports the correct `ThemeAwareImageProps` type but returns `<span data-testid="theme-aware-image" />`. `next-themes` `<ThemeProvider attribute="class" defaultTheme="system">` is mounted in `providers.tsx`; the `.dark` class flips on `<html>` from the OS theme (no manual toggle until Lesson 11). Hero assets `public/hero-light.png` and `public/hero-dark.png` are provided. `Button` (with `asChild` via `Slot`) and `cn()` are available.

**Exit.** `hero.tsx` renders a responsive two-column `<section>` (copy left, image right at `lg`, stacked below) with one `<h1>`, a paragraph, and two `<Button asChild size="lg">` CTAs wrapping `next/link`. `theme-aware-image.tsx` renders both `<img>` sources as siblings — `data-testid="hero-image-light"` (`block dark:hidden`) and `data-testid="hero-image-dark"` (`hidden dark:block`) — sharing `alt`/`width`/`height`, merging `className` through `cn()`. The correct image matches the active theme on first paint with no flash and no layout shift. `pnpm verify` (Biome + `tsc --noEmit` + build) passes.

## Lesson sections

Render the `Implementation` section list.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: a hero band whose marketing image already matches the visitor's theme the instant the page paints. Then a short paragraph (or `Screenshot` via `Figure`) of the finished feature: at `lg` copy sits left and image right; below `lg` they stack; flipping the OS theme swaps the image with no flash. Keep to one paragraph plus at most one figure.

### Your mission

Prose-only brief, no implementation hints, woven as the contract specifies. Lead with why the hero carries weight: it owns the page's single `<h1>` (heading hierarchy from Ch.017) and is where the theme story first becomes visible, so it must honor both heading discipline and the no-FOUC commitment from the first frame. Name the senior decision the brief surfaces — ship both theme assets and let CSS choose, never a JS branch — without prescribing the markup. State the constraint that shapes the solution: the swap must track the site's `.dark` class (what `next-themes` controls), not the raw OS `prefers-color-scheme` signal. Out of scope (one line): a `<picture>` + `prefers-color-scheme` approach (tracks the wrong signal here) and `next/image` optimization (Unit 4).

Then the requirements checklist (`Checklist` id `mission`, no chips here; chips appear in *Moment of truth*). Each item is one verifiable user-facing outcome, phrased as the outcome, never a file/export. Tag for the downstream test-coder:

1. The hero renders exactly one `<h1>`, the supporting copy, and two working CTA buttons that navigate. `[tested]`
2. The marketing image shown matches the active theme. `[tested]`
3. Toggling the theme swaps the image with no flash and no layout shift. `[untested]` — the no-flash/no-shift property is observable only in a real browser via a DevTools Performance recording; the test asserts presence of both sources, not the absence of a flash frame.
4. At `lg` the copy and image sit side by side; below `lg` they stack with no horizontal scroll. `[untested]` — responsive reflow is a visual/layout property, verified by hand at three widths.
5. Tabbing reaches both CTAs in order, each with a visible focus ring. `[untested]` — keyboard traversal and focus-ring visibility are manual a11y checks.

Note for test-coder: `[tested]` coverage should assert against observable behavior via the provided `data-testid` hooks (`hero`, `hero-image-light`, `hero-image-dark`) and the rendered DOM — exactly one `<h1>`, two CTA links with `href`s, both `<img>` sources present in SSR output with the light source defaulting visible (`.dark:hidden` on light, `.dark` toggle hiding it) and matching `alt`/`width`/`height`. Do not assert on class strings, file paths, or imports. Self-contained test file (inline any helpers).

### Coding time

One-line build prompt: implement `src/components/hero.tsx` and `src/components/theme-aware-image.tsx` against the brief and tests, then read the solution. The writer wraps the solution in `<details>` (collapsed by default).

Reference implementation, organized as it appears in the repo — present `theme-aware-image.tsx` first (the primitive the hero consumes), then `hero.tsx`.

`theme-aware-image.tsx` — use **`AnnotatedCode`** (this is the lesson's real teaching point; direct the student's focus across the two `<img>` siblings and the swap classes). Source is the full provided solution (lines 1-42 of the solution file). Steps:
- The `ThemeAwareImageProps` type: `{ light; dark; alt; width; height } & ComponentProps<'img'>` — `width`/`height` required (reserve layout to prevent shift), `light`/`dark` are the two `src`s.
- The destructure pulling `className` out so it merges per-`<img>`, spreading the rest with `{...props}`.
- The light `<img>`: `data-testid="hero-image-light"`, `cn('block dark:hidden', className)` — visible by default, hidden once `.dark` is on.
- The dark `<img>`: `data-testid="hero-image-dark"`, `cn('hidden dark:block', className)` — the mirror.
- The fragment wrapper: both ship to the client; CSS alone picks the visible one.

`hero.tsx` — use **`Code`** (a single readable block, no per-line direction needed; the only subtle parts are covered in the rationale callouts). Full provided solution (lines 1-39). The `<section data-testid="hero">` is a `container mx-auto … lg:grid-cols-2` grid; left `<div>` holds the single `<h1>` (`text-balance`, fluid sizing via `sm:`/`lg:` steps), the `text-muted-foreground` paragraph, and two `<Button asChild size="lg"><Link/></Button>` CTAs (second `variant="outline"`); right slot is `<ThemeAwareImage light="/hero-light.png" dark="/hero-dark.png" … />`.

Decision rationale (one or two sentences each, covering the `[untested]` requirements):
- **Both `<img>` ship to the client** — the no-FOUC mechanism. SSR emits both; the correct one is chosen by the `.dark` class before any JS, so the first paint already matches. A JS-gated single image would flash on hydration.
- **Honors `.dark`, not OS `prefers-color-scheme`** — `next-themes` sets the class from `system` *or* a future manual toggle (Lesson 11); the CSS `dark:` variant keys off that class, so the image obeys the toggle once it exists, not just the OS.
- **`width`/`height` on both `<img>`** — reserves layout box so the swap and the image load cause no shift (covers req 3's "no layout shift" and the responsive cut in req 4).
- **`asChild` Button → `Link`** — the canonical Slot polymorphism reused for every CTA on the page; link the owning lesson rather than re-explaining.
- **Single `<h1>`** — heading hierarchy; the feature grid's `<h2>` (Lesson 8) must not skip a level. Link the semantic-heading rule rather than re-explain.
- **Raw `<img>` is deliberate** — `noImgElement` is off in `biome.json` (Lesson 5) because `next/image` is Unit 4; note this so the absence of `next/image` doesn't read as an oversight.

Callout the one thing that looks unusual at a glance: shipping two `<img>` tags for one visual slot is intentional, not redundant — name it so a reviewer doesn't "fix" it into one.

Links (don't re-explain): Button/`asChild`/`Slot` shape → Ch.022 L3; `dark:` variant and the `.dark` class flip → Ch.018 L5; `next-themes` no-FOUC wiring → Ch.018 L6; semantic landmarks/heading rules → Ch.017 L3; `cn()` → Ch.018 L3.

External resources slot: none authored; the resourcer appends after the `<details>` if any.

### Moment of truth

Test command: `pnpm test:lesson 7`, plus `pnpm verify` for the Biome + typecheck + build gate. Show the expected pass output (a green vitest summary for the lesson's suite). Note the suite is currently a `describe.todo` stub the test-coder fills — once filled, the `[tested]` requirements go green; until then, `pnpm verify` plus the by-hand checklist is the real gate.

Manual-verification `Checklist` (id `verify`), chipping each `[untested]` requirement, phrased as a hands-on check:
- `untested` — Set the OS theme to dark, then light; the correct hero image is showing each time.
- `untested` — Record a DevTools Performance reload in each theme and confirm no flash frame as the image resolves.
- `untested` — At `lg` the copy and image sit side by side; below `lg` they stack with no horizontal scroll.
- `untested` — Tab from the URL bar reaches both CTAs in order, each with a visible focus ring; Enter navigates.

## Code samples — handling summary

- `theme-aware-image.tsx` → **`AnnotatedCode`** (multi-part focus on the two siblings + swap classes; the teaching core).
- `hero.tsx` → **`Code`** (single coherent block; subtleties live in rationale prose).
- No `CodeVariants` (no before/after pairing earns it), no `CodeTooltips` (types are explicit, not inferred), no `FileTree` (only two known files touched).
- No diagram: the FOUC mechanism is carried by the annotated dual-`<img>` walkthrough; prose plus the DevTools Performance check covers the flow. Adding a diagram would duplicate the code annotation.

## Scope

This lesson does not cover:
- The manual theme toggle UI (`useTheme` + sun/moon Button) — **Lesson 11**.
- `next/image` optimization, `<picture>`/`prefers-color-scheme`, and image CDN concerns — **Unit 4 (Chapters 029-035)**.
- The `next-themes` provider wiring and the pre-paint script that kills FOUC for the *whole document* — taught in **Ch.018 L6**; this lesson consumes that wiring, it does not re-establish it.
- The feature grid `<h2>` and CVA card variants that follow the hero — **Lesson 8**.

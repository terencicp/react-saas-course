# Lesson title

- **Title:** Self-hosted fonts with next/font
- **Sidebar label:** Fonts

# Lesson framing

This is the third platform-primitive lesson (after `next/image` l2, before `next/script` l5), and it mirrors l2's spine exactly: a plain HTML tag (`<link>` to Google Fonts) silently regresses a Core Web Vital and leaks privacy; `next/font` is the platform default that encodes the careful-engineer discipline as a build-time pipeline. **Reuse l2's framing device wholesale** — "the discipline of a careful engineer, encoded as a default" — and lean on the CLS Term the student already met in l2 (do not re-teach CLS from scratch; one-line refresher only).

The lesson's spine, the one sentence the student must leave with: **`next/font` downloads the font at build, serves it from your own origin, and pre-computes a fallback-font metric so the swap from fallback to real font is invisible — no external request, no IP leak, no layout jump.** Every section maps back to one of those three wins (self-host / privacy / zero-CLS).

Three things drive the pedagogy:

1. **Failure-mode-first.** Open on the naive `<link rel="preconnect">` + `<link href="fonts.googleapis.com">` snippet most tutorials still show, and name its three concrete failures (render-block, IP leak to Google = a real GDPR finding, CDN single-point-of-failure) before showing the fix. The student should *feel* the failures so the primitive reads as relief, not ceremony — exactly l2's move.

2. **The Tailwind v4 bridge is the load-bearing correction.** The chapter outline says "reference in Tailwind config (`fontFamily.sans: ['var(--font-sans)']`)" — that is the **legacy v3 JS-config shape and is wrong for this course.** Code conventions mandate Tailwind v4 CSS-first, `@theme` in `globals.css`, no `tailwind.config.ts`. The real 2026 bridge is: `variable: '--font-sans'` on the font → render the variable's `className` on `<html>` → map it in `globals.css` via `@theme inline { --font-sans: var(--font-geist-sans); }`. The student already met `@theme` and the three-tier token model in chapters 018–019, so frame the font variable as *just another design token* flowing through the same `@theme` seam they already know. This is the single highest-value, most-likely-to-be-gotten-wrong concept in the lesson.

3. **Module-scope is the subtle gotcha that bites in real code.** `Inter({...})` must be called once at module top level, never inside a component body. Frame it with the *why* (each call re-runs the loader / re-initializes at render) and tie it to the React render-model knowledge from ch.023. This is the one mistake an AI-assisted junior actually ships.

Continuity anchors to honor (from the Continuity notes + l2/l3 MDX):
- **`@acme/*` vendor convention.** The marketing display face is a local font; name it something like `Acme Display` / `Cal Sans`-style, file `acme-display.woff2`.
- **The blue continuity-anchor `next.config.ts`** is **not** extended here — `next/font` needs zero config (call that out explicitly as a contrast with l2/l3, it's a feature). The artifact this lesson extends is instead the **root layout** and **`app/globals.css`**, which become recurring artifacts.
- **Geist as the create-next-app default** is the connective tissue — the student's scaffolded project already has Geist Sans + Geist Mono wired; this lesson explains the code they already have, then shows how to add a third (local) face. Strong "you already have this, here's what it's doing" hook.

Verified version facts (Next.js 16.2, docs dated 2026-03-14 — downstream agents must stay consistent):
- Variable fonts **omit** `weight`; non-variable fonts **require** `weight`. Geist is variable.
- `display: 'swap'` is the **default** — teach it as "the platform already does the right thing," name the other values once, do not instruct the student to set it manually for the common case.
- `adjustFontFallback` defaults to **`true` (ON)** for `next/font/google`. The chapter outline's "Off by default; leaving it on prevents CLS" is **backwards** — it's ON by default and *that on-by-default is what kills CLS*. Frame it as "the zero-CLS magic, on by default, you basically never touch it." Disabling it is the rare power-tool.
- `subsets: ['latin']` appears in every official example. **Precision correction:** omitting it is a build-time **warning** (not a hard error) — the docs say "Failing to specify any subsets while `preload` is `true` will result in a warning." Teach it as "the platform warns you and you should always declare it," not "the build fails." (Same nuance-class as l2's silent-`quality`-coercion: name the real behavior, don't overstate.)
- `adjustFontFallback` default differs by loader: **`true`** for `next/font/google` (boolean), **`'Arial'`** for `next/font/local` (a string naming the fallback face; `false` disables). Both mean "on by default." Don't write `true` for the local font.
- `display: 'swap'` appears in every official example explicitly even though it's the default — so showing it in a code block is idiomatic, not redundant. Fine to include it in examples; just don't *teach* it as something the student must remember to set.
- Self-host at build, zero runtime Google request — confirmed verbatim in docs.
- `localFont({ src: './acme-display.woff2', variable: '--font-display' })`; `src` can be a string or an array of `{ path, weight, style }` for multi-file families.
- Geist Mono import is `Geist_Mono` (underscore for multi-word font names — docs rule: "Use an underscore (`_`) for font names with multiple words").
- **Verified Tailwind v4 bridge (docs version 16.2.7, exact):** the official "With Tailwind CSS" section shows precisely `@import 'tailwindcss';` then `@theme inline { --font-sans: var(--font-inter); }` — confirming the outline's bridge verbatim. A separate, explicitly-labeled "Tailwind CSS v3" section shows the legacy `tailwind.config.js` `fontFamily` array — confirming it as the legacy shape to flag, not teach.

Tone: adult, terse, decision-first, warm-but-brief intro. ~30–40 min. No quiz (that's l9).

# Lesson sections

## Introduction (no header)

Open with the failure, l2-style. Concrete scene: you need a brand font on your SaaS. The tutorial answer everyone copies is two `<link>` tags in `<head>` — a `preconnect` to `fonts.gstatic.com` and a stylesheet `<link>` to `fonts.googleapis.com`. Show that snippet inline (small fenced `html` block, no component) as the before-state, then name its three failures in a tight list:
1. **Render-blocking.** The stylesheet `<link>` is a render-blocking request to a third-party origin; the browser can't paint text until it resolves (or it paints invisible text — FOIT — then swaps, causing a jump).
2. **Privacy / legal.** Every visitor's browser hits Google's servers, handing Google their IP and a referrer on every page load. A German court already ruled embedded Google Fonts a GDPR violation — for a SaaS this is a real compliance finding, not a theoretical one.
3. **Availability.** Your typography now depends on a CDN you don't control; if it's slow or blocked (corporate firewalls, some regions), your brand face silently fails to a system font.

Then the claim: `next/font` makes all three go away by **downloading the font at build time and serving it from your own origin**, with a pre-computed fallback metric so the text never jumps. And the hook: *your scaffolded project already uses it* — `create-next-app` wired Geist through `next/font` in your root layout. This lesson explains that code, then teaches you to extend it.

One-line CLS refresher (Term-link, do not re-teach): remind that CLS = the layout-jump metric from the images lesson; a font swapping from a wrong-width fallback to the real font is a classic CLS source, and the fallback-metric trick is how `next/font` prevents exactly that.

Preview the path: (1) what the pipeline does, (2) the Google path + `subsets` + variable fonts, (3) the local path for a brand face, (4) the Tailwind v4 bridge that makes it all usable, (5) loading discipline.

## What next/font actually does: the build-time pipeline

Pedagogical goal: install the mental model *before* any API, so every later option reads as "a knob on this pipeline." Keep it conceptual — no `className`/`variable` mechanics yet.

Walk the four things it does, each tied to a failure from the intro:
- **Downloads the font at build.** Fetches the font files (or reads your local ones) during `next build`, emits them as static assets under your own domain. Kills the privacy + availability failures — zero runtime request to Google.
- **Generates `@font-face` for you.** You never hand-write `@font-face`; the loader emits it pointing at the self-hosted files.
- **Computes a fallback-font metric.** This is the zero-CLS core and deserves the most care. Explain in plain terms: the browser shows a *fallback* font instantly (e.g. Arial) while the real font streams in. Normally, when the real font arrives and it's a different width/height, the text reflows — that's the jump. `next/font` measures the real font's metrics at build and synthesizes an *adjusted* fallback (`size-adjust`, `ascent-override`, etc. on a `@font-face`) sized to match the real font almost exactly. So when the swap happens, nothing moves. Name that this is `adjustFontFallback`, on by default, and that this is the single feature doing the CLS-elimination.
- **Wires preload automatically.** Adds the `<link rel="preload">` for the font files — you don't manage it.

**Diagram — DiagramSequence (build → serve → swap).** This is the lesson's anchor visual; its goal is to make "self-host + invisible swap" literal, the way l2's CLS strip made the layout jump literal. Author as `DiagramSequence` (scrubbable, no `<Figure>` wrapper). Suggested steps, compressed horizontally, well under 800px tall, saturated mid-tone fills with white text so it reads in both themes, `margin:0` reset on inner elements:
1. **Build time.** Box "your project" with `next build`; an arrow reaches out to Google Fonts *once*, pulling font files + reading their metrics back into a "self-hosted /_next assets" box. Caption: at build, the font is fetched once and baked into your own origin — the only time Google is ever contacted.
2. **First paint (runtime).** A browser frame requesting *only your origin* (draw the Google server greyed-out / disconnected — "never contacted at runtime"). Text renders immediately in the adjusted fallback font. Caption: the visitor's browser only ever talks to your domain; text paints instantly in a metric-matched fallback.
3. **Swap.** Same browser frame, the real font has loaded; show the text in the real face with a green "no shift" badge and the line of text holding its exact position (contrast with a faint ghost of where a *naive* swap would have pushed it). Caption: when the real font arrives the swap is invisible — the fallback was pre-sized to match, so nothing reflows. That invisible swap is `display: 'swap'` + the computed fallback metric working together.

Terms to define here (`Term`): **FOUT** (Flash of Unstyled Text — fallback shows, then swaps), **FOIT** (Flash of Invisible Text — text hidden until font loads). Name both once so the student recognizes them; the pipeline avoids the bad version of each.

## Loading a Google font: subsets and the variable-font default

Pedagogical goal: the happy path, minimal surface. The student writes their first `next/font` call and learns the two decisions that matter (subset, variable-vs-static).

Lead with the canonical call applied to the root layout. Small `tsx` fenced block (`Code`, not annotated — it's short), titled `app/layout.tsx`, the Geist example the student already half-recognizes:

```tsx
import { Geist } from 'next/font/google';

const geist = Geist({ subsets: ['latin'] });

export const metadata = { /* ... */ };

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html lang="en" className={geist.className}>
    <body>{children}</body>
  </html>
);
```

Explain the three load-bearing pieces in prose right under it:
- **Called at module scope, once.** `Geist({...})` runs at the top of the file, not inside the component. (Forward-reference: *why* this matters gets its own treatment later — flag it now, pay it off in the module-scope section.)
- **It returns an object,** the three useful fields being `className`, `style`, `variable`. Here we use `className` — apply it to `<html>` and every element inherits the font.
- **`subsets: ['latin']` — always declare it.** Why: a full Google font ships every script (Cyrillic, Greek, Vietnamese…); `subsets` slices it to just the characters you serve, often a fraction of the bytes, and tells the platform which slice to *preload*. Omitting it (while `preload` is on, the default) triggers a **build-time warning**, not a hard failure — but you always declare it anyway, because the warning is the platform telling you you're about to ship an un-subset, un-preloaded font. Frame it as a non-negotiable habit. Declare every subset you actually render (most SaaS = `['latin']`; add `['latin', 'latin-ext']` if you show accented European text). (Downstream agents: do not write "build error" — the docs say warning.)

### Variable fonts ship every weight in one file

Pedagogical goal: the one real decision — variable vs static — and the senior default.

Explain the distinction simply: a **variable font** packs the whole weight axis (100→900) into a single file; a **static font** is one file per weight. Counterintuitive payoff to state plainly: a variable font is often *smaller* than two static weights, and you get every weight in between for free. So the senior default is **variable when the family has one** (Geist, Inter, Roboto Flex all do), static-with-explicit-weights only when it doesn't.

The API consequence, taught as a contrast (`CodeVariants`, two tabs, both `ts`, titled `app/layout.tsx`):
- Tab "Variable (default)": `const geist = Geist({ subsets: ['latin'] });` — green pane. Prose: **Omit `weight` entirely.** The variable font carries every weight; Tailwind's `font-bold`, `font-medium` etc. all resolve from the one file. The senior pick whenever the family is variable.
- Tab "Static (when no variable axis)": `const roboto = Roboto({ weight: ['400', '700'], subsets: ['latin'] });` — orange pane, highlight the `weight` array. Prose: **List only the weights you use** — each weight + style is a separate downloaded file, so `['400','700']` ships two files; adding `'300'` you never render is pure waste. Required for non-variable families; forbidden-by-omission for variable ones.

Add a one-line `style` note in prose (not its own subsection): same rule for italics — for a static font, list `style: ['normal', 'italic']` only if you render italics; variable fonts handle it without.

Watch-out to fold into prose here: loading too many weights/styles inflates the payload — the discipline is "declare what you render, nothing more."

## Loading a brand face with next/font/local

Pedagogical goal: the second loader, same pipeline, for the asset you own. Short — it's the same model with a different source.

Motivate: a design system ships a custom display face (a `.woff2` in your repo) — it's not on Google Fonts, but you want the identical self-host + zero-CLS treatment. That's `next/font/local`.

Small `tsx` fenced block (`Code`), titled `app/layout.tsx`, using the `@acme/*` convention:

```tsx
import localFont from 'next/font/local';

const acmeDisplay = localFont({
  src: './fonts/acme-display.woff2',
  variable: '--font-display',
});
```

Teach in prose:
- `src` is **relative to the file calling `localFont`** — co-locate the font next to the layout, or point at `app/fonts/`. The font lives in your repo; same build pipeline, same self-hosting.
- For a multi-file family, `src` takes an **array of `{ path, weight, style }`** objects (one entry per file). Show this as a short collapsible (`<details>`) or a second tiny block so it doesn't bloat the happy path — name it, don't dwell.
- **`.woff2` only.** It's the smallest, universally-supported format in 2026; shipping `.ttf`/`.otf`/`.woff` is strictly larger bytes for no gain. (Watch-out folded in.)
- Note we set `variable` here, not `className` — because this face is going to be a *named* Tailwind token, which is the next section. Bridge into it.

Term here: **`woff2`** (Web Open Font Format 2 — compressed, the only font format worth shipping on the modern web).

## The Tailwind bridge: a font is just another theme token

Pedagogical goal: **the most important section.** Connect `next/font` to the Tailwind v4 CSS-first system the student already knows (ch.018 `@theme`, ch.019 three-tier tokens). The payoff: `font-sans` / `font-display` Tailwind utilities resolve to your self-hosted fonts. Correct the legacy-config trap explicitly.

Frame: in ch.019 you learned every design token flows through `@theme` in `globals.css`. A font family is no different — it's a token whose *value* happens to come from a `next/font` call. The bridge is three steps, and the whole trick is that the font call and the CSS meet at a **CSS custom property**.

**Diagram — ArrowDiagram (or a small HTML strip) inside a Figure: the three-hop bridge.** Goal: make the data-flow (`next/font` → DOM attribute → `@theme` → utility class) one glanceable picture, because the student's bug is always a broken hop. Three boxes left-to-right with arrows:
1. `next/font` call → produces `--font-display` (its `.variable` className sets `--font-display: '__acmeDisplay_abc';` on the element it's applied to).
2. `<html className={acmeDisplay.variable}>` → the custom property is now live on the document root, inherited everywhere.
3. `@theme inline { --font-display: var(--font-display); }` in `globals.css` → Tailwind reads it and generates the `font-display` utility. Caption: the font call and your Tailwind theme meet at one CSS variable — set it on `<html>`, alias it in `@theme`, use `font-display` anywhere. `expandable={false}` only if using ArrowDiagram (leader-line constraint); a plain HTML strip in `<Figure>` is fine and simpler — prefer the HTML strip.

Then the canonical multi-font setup, the artifact the student keeps. Use `CodeVariants` to show the **two files that must agree** (this is a "related files" use, the doc's sanctioned case — or use `AnnotatedCode` per file if one is complex; CodeVariants of the two files is cleaner here):

- Variant/file `app/layout.tsx`: all three faces, each with `variable`, applied together on `<html>`:
```tsx
import { Geist, Geist_Mono } from 'next/font/google';
import localFont from 'next/font/local';

const geistSans = Geist({ subsets: ['latin'], variable: '--font-sans' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-mono' });
const acmeDisplay = localFont({ src: './fonts/acme-display.woff2', variable: '--font-display' });

const RootLayout = ({ children }: { children: ReactNode }) => (
  <html
    lang="en"
    className={`${geistSans.variable} ${geistMono.variable} ${acmeDisplay.variable}`}
  >
    <body>{children}</body>
  </html>
);
```
  Prose: each font exposes its own `--font-*` variable; concatenate the three `.variable` classNames on `<html>` so all three custom properties are live on the root. Note: still `className` on the element, but now it's the `variable` className (sets the CSS var) rather than the bare `className` (sets `font-family` directly) — call out that distinction because mixing them is a documented footgun.

- Variant/file `app/globals.css`: the `@theme` mapping:
```css
@import "tailwindcss";

@theme inline {
  --font-sans: var(--font-sans);
  --font-mono: var(--font-mono);
  --font-display: var(--font-display);
}
```
  Prose: `@theme inline` aliases each font variable into a Tailwind theme token, which generates the matching utility — `font-sans`, `font-mono`, `font-display`. `--font-sans` is special: Tailwind uses it as the **default body font**, so setting it makes Geist the app-wide default with no class needed. The others you apply explicitly: `<h1 className="font-display">`.

Critical correction, stated outright (this is the discrepancy-fix the lesson exists to deliver): **There is no `tailwind.config.ts` in this course.** Older tutorials (and the Tailwind v3 era) put `fontFamily: { sans: ['var(--font-sans)'] }` in a JS config file. Tailwind v4 is CSS-first — the font token lives in `@theme` in `globals.css`, alongside your colors and spacing, exactly as you learned in the tokens chapter. If you see a `tailwind.config.ts` with a `fontFamily` array in someone's project, it's the legacy shape; the v4 equivalent is the `@theme` mapping above.

Tiny dropdown exercise to lock the bridge (`Dropdowns`, fenced-code mode) over a 2-blank `globals.css` + a usage line: blank 1 = the `@theme inline` directive / the `var(--font-display)` value; blank 2 = the `font-display` utility class on an `<h1>`. Instructions name the goal ("wire the brand face so `font-display` works"). Keep it to two blanks.

Why `className`-of-`variable` over the bare-`className` approach: state the senior rule once — **for a Tailwind app, always use `variable` + the `@theme` bridge, not the bare `className`.** The bare-`className` route hard-codes one font and can't be referenced by utilities; the variable route makes the font a first-class token. (This is the "mixing class and variable usage wires the wrong family" watch-out, framed as a positive rule.)

## Where each font loads, and why module scope matters

Pedagogical goal: two adjacent disciplines — *scope of loading* (which layout) and *scope of the call* (module top level). Both are about not paying for fonts you don't need / not re-initializing.

### Load the body font once, the marketing face only where it's seen

Frame the cost: every font family is bytes the browser downloads. The discipline:
- **Body font (the default sans) in the root layout** — it's on every route, so it belongs at the root.
- **A marketing/display face only in the layout that renders it** — e.g. the `acme-display` face wired in `app/(marketing)/layout.tsx`, not the root, if only marketing pages use it. App-dashboard routes never download the marketing font.
- **Never four families on every route.** The reflex: a font's loading scope should match where it's actually rendered.

Tie to the route-group knowledge from ch.029 (the student knows `(marketing)` layouts). Keep it short — this is placement discipline, not new API.

### Declare the font at module scope, never inside a component

Pedagogical goal: the gotcha that actually bites in AI-assisted code. This is worth a clear treatment.

State the rule and the why, leaning on ch.023 render-model knowledge: the `Geist({...})` / `localFont({...})` call must live at **module top level**, evaluated once when the module loads. Put it *inside* a component body and it's re-evaluated on every render — re-running the loader machinery, defeating the build-time optimization, and (for local fonts) re-reading the source each time. The component re-renders constantly; the font initialization must not ride along.

Show it as a before/after (`CodeVariants`, two tabs, `tsx`):
- Tab "Wrong — inside the component": `del`-marked, red pane, the `const inter = Inter(...)` call sitting inside the component function. Prose: **Re-initializes the font on every render.** The loader is meant to run once at build/module-load; calling it per render throws that away and can warn or misbehave. The render-model lesson's rule applies: nothing that should happen once goes in a render body.
- Tab "Right — module scope": `ins`-marked, green pane, the call hoisted above the component. Prose: **Runs once, at module load.** The font object is created a single time and the component just references its `className`/`variable`. This is the only correct shape.

Also fold in here (one sentence each, not subsections): **don't load a font in a Client Component** — fonts are an SSR/build concern; loading inside a `'use client'` file forfeits the server-side optimization. Keep the `next/font` call in the (server) layout. And: the font object's fields (`className`, `variable`, `style`) are the only things you pass around — don't try to serialize the font object across the server/client boundary.

**The `app/fonts.ts` definitions-file pattern (name it, briefly).** When the same font is referenced from more than one file, the idiomatic shape (straight from the docs) is to call the loaders once in a single module — `app/fonts.ts` exporting `geistSans`, `geistMono`, `acmeDisplay` — and import those objects wherever needed. This is module-scope discipline taken one step further: one instance per font for the whole app, imported, never re-called. Show a tiny `app/fonts.ts` (`Code`, ~5 lines) and mention the layout imports from it. Keep it light — it's the natural payoff of the module-scope rule, not a new concept. (This also keeps the multi-font layout block in the Tailwind-bridge section tidy if downstream prefers to source fonts from `fonts.ts` rather than inline them — author's call; either is correct.)

## What next/font does not do

Pedagogical goal: bound the tool so the student reaches for the right thing at the edges. Short, prose, no components.

- **No runtime CDN fetches.** Everything is build-time; there's no "load this font on demand from Google at request time" mode, by design.
- **No silent guessing of subsets** (Google) — it warns rather than picking for you, by design; restate the always-declare habit as a boundary.
- **Not for icon fonts.** Icon fonts (FontAwesome-style glyph fonts) are an anti-pattern in 2026 — they ship a whole font for a handful of glyphs and break accessibility. Use SVG icons (the project's Lucide components from ch.027) instead. Name this so the student doesn't try to `next/font` an icon font.
- Forward-reference, one line: deeper Tailwind typography (type scale, `prose`) was ch.021; this lesson is only the *font-family wiring*.

## The discipline, restated

Pedagogical goal: l2-style collapse to the one frame + the carry-out reflexes. Mirror l2's closing structure.

The one frame: **`next/font` turns a render-blocking, privacy-leaking `<link>` into a self-hosted, zero-CLS, build-time asset — and the variable bridge turns each font into a Tailwind token you reference like any other.**

The carry-out rules (tight list, the review reflexes):
1. **`subsets` on every Google font** — the platform warns otherwise, and it's where the byte savings (and the preload) live.
2. **Variable fonts omit `weight`; static fonts list only what they render.** Prefer variable.
3. **Wire through `variable` + `@theme` in `globals.css`, never a `tailwind.config.ts`** — a font is a design token like a color.
4. **Call the loader at module scope, once** — never inside a component.
5. **`next/font` needs zero `next.config.ts`** — unlike images and redirects, the whole pipeline is just the import. (Callback to l2/l3's config artifact — a satisfying contrast.)

End with `ExternalResource` cards in a `CardGrid` (2): the `next/font` API reference and the Font Optimization getting-started guide (URLs in Scope/fact-check below). Close with `<CourseProgressBar />`.

# Components and code-handling summary

- **`Code` (fenced):** the intro `<link>` before-state (`html`); the first Geist call; the `next/font/local` call; the multi-file `src` array (in a `<details>`).
- **`CodeVariants`:** variable-vs-static (2 tabs); the two-files-that-agree layout+globals.css bridge (2 tabs, the "related files" sanctioned use); the module-scope wrong/right (2 tabs). Use `del`/`ins` + per-pane `data-mark-color` (red for wrong/wildcard, green for right) per l2's established palette.
- **`DiagramSequence`:** build → serve → swap (3 steps) — the anchor visual. Not wrapped in `<Figure>`.
- **`Figure` + HTML/CSS strip:** the three-hop Tailwind-bridge data-flow diagram. Prefer a plain HTML strip over `ArrowDiagram` (no leader-line expandable constraint).
- **`Dropdowns`:** one small fenced-code exercise on the `@theme` bridge (2 blanks).
- **`Term`:** CLS (refresher link only — already defined in l2), FOUT, FOIT, woff2. Keep strategic — 4 terms.
- **`AnnotatedCode`:** optional, only if the bridge layout block is shown standalone rather than in CodeVariants; CodeVariants is preferred.
- **`ExternalResource` + `CardGrid`:** closing two cards.

Frontmatter to match l2/l3: `title`, optional `tagline`, `chapter-id: 34`, `course-progress` (continue the chapter's value), `sidebar: { order: 4, label: Fonts }`.

# Scope

**Prerequisites to lean on (already taught — recap in one line max, do not re-teach):**
- **CLS** and **Core Web Vitals** — defined in ch.034 l2 (images). Refresher Term-link only; the font-swap-as-CLS-source is the new angle.
- **`next/image` as the sibling primitive / "careful-engineer discipline as a default" frame** — ch.034 l2. Reuse the frame; the student should feel the parallel.
- **`@theme`, CSS-first Tailwind v4, `globals.css`** — ch.018 l2. The bridge *uses* this; don't re-teach the directive, apply it.
- **Three-tier design tokens (custom properties)** — ch.019 l4. A font variable is "just another token" — lean on this hard.
- **Route groups / nested layouts `(marketing)`** — ch.029. Used for loading-scope placement; assume known.
- **React render model (render runs repeatedly)** — ch.023. The module-scope *why* rests on it.
- **`next.config.ts` is read once at startup** — ch.034 l1. Referenced only to contrast (`next/font` needs no config).

**Explicitly out of scope (do not teach here):**
- **Tailwind typography depth** — type scale, line-height, `prose`, the reading surface — owned by ch.021. This lesson wires *font-family* only.
- **Icon libraries / Lucide setup** — ch.027. Named once as the right tool *instead of* icon fonts; no how-to.
- **Design tokens / the token system itself** — ch.019. Applied, not taught.
- **Tailwind font configuration in depth** — chapter outline defers to "ch.021"; this lesson covers exactly the `@theme` font-variable bridge and no more.
- **CLS measurement / thresholds / field data** — ch.094. One-line refresher only.
- **`opengraph-image.tsx` custom fonts in `ImageResponse`** — that's a *different* font mechanism (Satori, runtime `fetch`), owned by ch.034 l6. Do not conflate `next/font` with OG-card fonts; if a student might confuse them, one disambiguating sentence max, but ideally leave it for l6.
- **`preload`/`display` deep tuning, `fallback`/`preload: false` power-tool options** — name `display`'s other values once; don't build out a strategy table. The defaults are the lesson.
- **Self-hosted-deploy specifics for fonts** — `next/font` self-hosts identically everywhere (no Vercel-optimizer dependency like images had), so there's no off-Vercel caveat to make; do not invent one.

# Conventions notes for downstream agents

- **Tailwind v4 CSS-first is non-negotiable** (Code conventions §Styling): `@theme` in `globals.css`, **no `tailwind.config.ts`**. The lesson actively corrects the legacy JS-config shape — do not let any example reintroduce `tailwind.config.ts`.
- Code conventions: `import` ordering (external `next/font/*` first), single quotes, 2-space, arrow-function components bound to `const`, named exports except the framework-default `RootLayout` (layouts are default-exported — show `export default RootLayout` or inline `export default` per the project's layout convention; l2/l3 used arrow-const for non-framework components — match the layout default-export rule from §Function form).
- `ReactNode` for `children` (not `JSX.Element`), per §Components.
- Font variable naming: semantic (`--font-sans`, `--font-mono`, `--font-display`), matching the create-next-app + course token convention — not `--font-geist`. (Deliberate: keeps the token semantic, swappable when the brand face changes, per the three-tier model.)
- `@acme/*` vendor + `acme-display.woff2` local-font convention carried from l1/l2.
- Deliberate simplification to flag to downstream agents: examples may inline `export const metadata` as `{ /* ... */ }` placeholder in the layout to keep focus on fonts — Metadata is l6, don't expand it here.

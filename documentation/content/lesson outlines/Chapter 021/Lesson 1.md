# Lesson outline — Chapter 021, Lesson 1

## Lesson title

- Title: `Type, scale, and the reading surface`
- Sidebar label: `Typography`

## Lesson framing

This is the first lesson of Chapter 021 (the visual surface) and the first deep dive into typography after Chapter 018 named the `--font-*` / `--text-*` Tailwind namespaces in passing.
The student already writes utility classes, knows the theme-scale concept (`p-4` → token), composes with `cn()`, has a clean Preflight slate, and ships semantic tokens for light/dark.
This lesson cashes in the typography surface a senior writes daily: the font stack, the rem-based type scale, the `leading-*`/`tracking-*` paired-scale reflexes, the 2026 `text-wrap` properties (`balance`/`pretty`), `max-w-prose` reading width, and the workhorse text utilities (`truncate`, `line-clamp-*`, `tabular-nums`, etc.).

Pedagogical conclusions that shape the whole lesson:

- **Decisions over syntax, framed as reflexes.** The student already knows utilities *exist*; the value here is the senior reflex — *which* utility goes on *which* surface and *why*. Frame each property as a default reflex pair ("body wants X, headings want Y") rather than an exhaustive utility menu. The thesis filter: teach the form a 2026 dev writes, not the historical CSS landscape.
- **The type scale is a system, not a menu — make the student feel that.** The single most load-bearing mental model: staying on the scale is the cost of consistency; `text-[17px]` is a smell. A live `ParamPlayground` that lets the student scrub the scale and immediately see `text-3xl` vs `text-[29px]` cements it better than prose.
- **The 2026 differentiator is `text-wrap: balance`/`pretty` and `max-w-prose`.** These are modern properties the student likely has never seen; they are the highest-leverage "looks junior vs looks senior" reflexes in the lesson. A before/after visual is mandatory here — the orphan-word problem must be *seen*, not described. (`balance` is Baseline; `pretty` is a graceful progressive enhancement — see the section for the exact support framing.)
- **Minimize cognitive load by ordering simple→complex.** Font stack (one decision) → the scale (the core system) → weight/style (small) → line-height + tracking (the two paired-scale overrides) → text-wrap reflexes (the new senior move) → reading width → the daily utilities (a toolbox tour) → Preflight payoff (the foundation, named last as the "why none of this fights the browser"). Watch-outs live inline in the section that teaches the concept they qualify — never bundled.
- **Connect to prior knowledge.** Repeatedly tie back: the type scale is the same theme-scale idea as spacing (Chapter 018); the utilities ride on Preflight's clean slate (chapter 019 lesson 3); `truncate` needs the same `min-w-0` flex companion the student met in chapter 020 lesson 3; tokens flow from `@theme` (chapter 019 lesson 4). These are recall hooks, kept to one sentence each.
- **`next/font` is named, not wired.** The student should end knowing the *shape* of the font stack (system default from Preflight + one branded face via `next/font` exposed as a `@theme` variable) and the variable-font reach, trusting chapter 034 lesson 7 for the actual setup. Do not teach subsetting, preload, or weight axes.
- **End state.** The student can compose a heading and a body paragraph with the correct scale step, line-height, tracking, balance/pretty, and reading width; can truncate and clamp text correctly (with the `min-w-0` gotcha); and reaches for `tabular-nums` in dashboards by reflex. They hold the mental model that typography on the web is a settled, token-driven system they write off-the-scale.

## Lesson sections

### Introduction (no header)

Open with the senior question, concretely: a heading rendered `text-3xl font-semibold tracking-tight` already looks sharp, but one line breaks to leave a single orphan word dangling — and the fix is one class, `text-balance`, not a designer's manual line break.
State the goal: install the typography surface a 2026 senior writes — the font stack, the type scale, the line-height/letter-spacing reflexes, the modern `text-wrap` properties, reading width, and the text utilities written daily.
Connect to what they know in one or two sentences: they already write utilities on a clean Preflight slate with theme tokens; this is the typography layer of that same system.
Keep it warm and brief (Pedagogical guidelines §3). No "what is a font" scaffolding.

### The font stack: system first, one branded face

Teach the two-layer stack model.
Layer one: Preflight already wires a `font-family` of `ui-sans-serif, system-ui, ...` as the default, so unstyled text renders in the OS UI font with zero network cost (recall hook: Preflight, chapter 019 lesson 3).
Layer two: a SaaS usually ships **one** branded face (Inter, Geist, Manrope are the 2026 defaults) loaded via `next/font/google`, exposed as a CSS variable, and bound in `@theme` so `font-sans` resolves to it.
Show the *shape* only — the three moving parts (the `next/font` declaration, the CSS variable, the `@theme` binding) — with a short annotated snippet; explicitly defer the real wiring to chapter 034 lesson 7.

Components:
- `AnnotatedCode` (lang `tsx`/`css`, one block showing the three pieces: `Inter({ subsets, variable })` call → `className={inter.variable}` on `<html>` → `--font-sans: var(--font-inter)` in `@theme`). 3 steps, blue tint. Goal: the student recognizes each piece without being asked to wire it. Keep each step ≤6 lines of prose; the last step links forward to chapter 034 lesson 7.

Within this section, teach the **variable-font reach** as the 2026 default: one file exposes every weight 100–900, so `font-thin`…`font-black` all work with no extra requests and no FOUT-per-weight. One sentence on `font-display: swap` being the `next/font` default (render-blocking avoided; the swap is imperceptible with a subset variable font) — framed as the reflex, not a deep dive.

Watch-out (inline): the system stack is the fallback *during* the swap and for users who block the font — never assume the branded face is the only font that renders.

Tooltips/Term: `FOUT` (flash of unstyled text — the brief moment a fallback font shows before the web font loads).

### The Tailwind type scale

The core system of the lesson. Teach `text-xs` through `text-9xl` as **one rem-based scale where each step pairs a `font-size` with a sensible default `line-height`** (recall hook: the `--text-*` namespace named in chapter 018 lesson 2, and the same theme-scale idea as spacing in chapter 018 lesson 1).
The senior rule, stated plainly: write off the scale; an arbitrary `text-[17px]` is a smell that says either pick the nearest step or grow the scale in `@theme`.
Mention the scale is editable via `@theme` for projects wanting a denser or larger system — one sentence, this is the "you can change the system, you just change it in one place" point.

Components:
- `ParamPlayground` — **the centerpiece interactive**. A select `Param` for the scale step (`text-sm`…`text-5xl`) driving a preview line of sample text, plus a slider `Param` for an arbitrary px size, with a toggle `Param` to switch the preview between "on the scale" and "arbitrary." A `Readout` echoing the resolved size. Pedagogical goal: the student *feels* that the scale steps are deliberate jumps and that arbitrary values land awkwardly between them. (Because the preview reads values as CSS custom properties, drive `font-size` directly; if the scale-step select needs the rem values, map them in the `Param` option labels.) Caption: "Scrub the scale, then try an arbitrary size — feel the difference."

Watch-out (inline): `text-base` is the body default (1rem); the scale is a system, not a menu — staying on it is the cost of consistency.

### Weight, style, and the variable-font range

Short section. `font-thin` through `font-black` map to `font-weight` 100–900; with a variable font the whole range is available from one file (callback to the prior section).
`italic` for `font-style`; `not-italic` to reset.
Name `underline` explicitly as a `text-decoration` utility, with the recall that Preflight strips the default link underline (chapter 019 lesson 3) — so the JSX student who expects links underlined "for free" needs to opt back in. Cross-reference once: link *element* styling lives in chapter 017 lesson 4; this lesson covers `underline` as a utility only.

Components: plain `Code` blocks suffice (`font-medium`, `font-semibold`, `italic`, `underline`). No heavy component — this is a quick reflex tour.

### Line-height and letter-spacing: the paired-scale overrides

Teach these together because both override a default the `text-*` step already set.

`line-height` via `leading-*`: every `text-*` ships a sensible default; `leading-*` overrides it. The reflexes: body text wants `leading-relaxed` (or `leading-7`); headings want `leading-tight` (or `leading-none`); long-form prose at `leading-loose` reads slowly *on purpose*.

`letter-spacing` via `tracking-*`: tight on large headings (`tracking-tight`, `tracking-tighter`), normal on body, loose on small all-caps eyebrow labels (`tracking-wide`, `tracking-widest`). Negative values exist via the bracket form for display type — name once.

Components:
- `CodeVariants` contrasting a heading block vs a body block vs an eyebrow label, each tab showing the *paired* `text-*`/`leading-*`/`tracking-*` choices with a one-line rationale. Goal: the student internalizes the three canonical pairings as a unit rather than memorizing each utility separately. Use `data-mark-color` blue.

Watch-out (inline): don't fight the default — reach for `leading-*`/`tracking-*` only to *change* the paired default, not to restate it.

### Balance and pretty: the 2026 line-wrap reflex

The highest-leverage new material. Teach `text-wrap: balance` and `text-wrap: pretty` as the senior reflex the student probably hasn't seen.
`text-balance` (Tailwind `text-balance`): on short headings it balances line breaks so no single orphan word sits alone on the last line — the reach on every `h1`/`h2`/`h3`. The browser only balances blocks up to a small line cap (~6 lines in Chromium, ~10 in Firefox) for performance, which is exactly why it's a *heading* tool, not a body tool.
`text-pretty` (Tailwind `text-pretty`): on body paragraphs it runs a slower wrapping pass that avoids end-of-paragraph orphans (and short last lines) — the reach on every long-form paragraph.

Browser-support framing (fact-checked June 2026 — state it honestly, do not oversell):
- `text-balance` is **Baseline** (since 2024): Chrome/Edge/Firefox/Safari all support it. Reach without checking caniuse.
- `text-pretty` is **not Baseline yet** — Chromium and Safari support it; Firefox still does not (as of early 2026). It is a *progressive enhancement*: unsupported engines fall back to normal wrapping with no visual breakage, so the senior still applies it by default. The factual trap to avoid: do not claim Firefox supports `pretty`, and do not call `pretty` "Baseline."

Components:
- A **before/after visual** is mandatory. Use a `Figure` wrapping a `TabbedContent` (two tabs: "Default wrap" vs "`text-balance`") each rendering the *same* heading text at a constrained width, so the orphan word in the default tab and its disappearance in the balanced tab are visible side-by-side. Pedagogical goal: the orphan problem must be *seen* — prose cannot convey it. Add a second pair for `text-pretty` on a paragraph if it fits the height budget; otherwise one `TabbedContent` with three tabs (Default / balance / pretty). Cap height per the diagram guideline (~800px max).

Watch-out (inline): don't reach for `text-justify` on the web — it produces uneven "rivers" of word spacing; `text-pretty` is the modern fix for ragged-but-clean text.
Watch-out (inline): `text-balance` is for *short* headings, not long body copy — the browser caps how many lines it will balance; `text-pretty` is the body-copy tool.

### Reading width: max-w-prose and the 65ch rule

Teach the measure (line length) heuristic: body text reads best at ~60–75 characters per line; wider columns lose the eye on the return sweep to the next line.
`max-w-prose` (= `max-w-[65ch]`) is the senior reflex on any long-form text column.
Tie to the `ch` unit (the width of the "0" glyph in the current font) so the student understands *why* it tracks the font.

Components:
- `ParamPlayground` — a slider `Param` for column `max-width` in `ch` (range ~30–120), preview rendering a paragraph of sample text at `max-width: var(--measure)`, with a `Readout` echoing the ch value and ideally an `expr` flagging when the value sits in the comfortable 60–75 band. Pedagogical goal: the student feels the column get too wide (eye-strain) and too narrow (choppy) and lands on why ~65ch is the default. Caption: "Drag the measure — find the comfortable band."

This `ParamPlayground` and the type-scale one are the two "manipulate the decision to feel it" cases the playground is built for (per component doc's intended use).

### The text utilities you write daily

A toolbox tour of the workhorse utilities, grouped so the student leaves with a reflex map rather than a flat list.

- **Alignment:** `text-left` / `text-center` / `text-right` (logical `text-start`/`text-end` get a one-line mention for RTL, consistent with the code-conventions logical-properties rule).
- **Overflow ellipsis — the two reaches:**
  - `truncate` — one-line ellipsis (`overflow: hidden; text-overflow: ellipsis; white-space: nowrap`).
  - `line-clamp-*` — multi-line ellipsis; the canonical reach for card descriptions and list previews. Arbitrary line counts via `line-clamp-[8]` and the CSS-var form `line-clamp-(--teaser-lines)` exist — name once, don't dwell.
- **Whitespace and wrapping:** `whitespace-nowrap` / `whitespace-pre-wrap`; `break-words` for long URLs and emails that would otherwise blow out the container.
- **Case:** `uppercase` / `lowercase` / `capitalize`.
- **Numeric and mono:** `font-mono` for code; `tabular-nums` (`font-variant-numeric`) for digit alignment in tables, stat cards, and dashboards.

Components:
- `AnnotatedCode` for a single realistic **card component** (`tsx`) that uses several of these at once: a clamped description, a truncated title in a flex row, a `tabular-nums` price. Step through the utilities in context (4–5 steps). Goal: the student sees the utilities *where they actually appear* rather than in isolation, which is how reflexes form.

Watch-outs (inline, each at the utility it qualifies):
- `truncate` (and `line-clamp-*`) on a flex item needs `min-w-0` on that item or the text overflows the container — the *same* trap the student met in chapter 020 lesson 3 (flex items default to `min-width: auto`). Call out the recall explicitly.
- `line-clamp-*` compiles to `-webkit-line-clamp` under the hood — production-safe in 2026, cross-browser by convention.
- `tabular-nums` is the reflex for any aligned column of numbers; without it the digit `1` is narrower than `8` and columns visibly misalign. (Worth a tiny visual — see below.)

Optional small visual: a two-row `Figure` (proportional vs tabular) showing a column of right-aligned numbers misaligning then snapping into a grid. Cheap HTML+CSS; high payoff for an abstract point. Include if height budget allows.

### Why none of this fights the browser: the Preflight payoff

Close by naming the foundation explicitly (placed last as the "here's why all of the above just worked"): Preflight removed heading margins, stripped list bullets, removed the default link underline, and made form elements inherit font properties (recall hook: chapter 019 lesson 3, and the form-element inheritance-rebel point from chapter 019 lesson 2).
Every typography utility in this lesson sat on that clean slate — the student never fought a browser default to get here.
Keep it short; this is a synthesis beat, not new material.

### Check your understanding

A short exercise beat to consolidate the two highest-leverage reflexes (scale + balance/pretty + the `min-w-0`/`tabular-nums` gotchas).

Components — pick the two best fits:
- `ReactCoding` (target-match, `live`) — give a target heading+paragraph card rendered with the correct `text-balance` on the heading, `text-pretty` + `max-w-prose` on the paragraph, and `tabular-nums` on a stat; starter has the raw text with no typography utilities. Student matches visually. Goal: apply the lesson's reflexes end-to-end. This is the primary exercise (guided, target-driven — preferred over a sandbox per the guidelines).
- `Buckets` as a quick reflex check: sort utilities onto surfaces — `text-balance`/`leading-tight`/`tracking-tight` → heading; `text-pretty`/`leading-relaxed`/`max-w-prose` → body paragraph; `tabular-nums` → dashboard number column; `line-clamp-2` → card description. `Buckets` fits because the task is classification. Goal: cement the reflex map from "the daily utilities" section.

Prefer the `ReactCoding` target-match as the main check; add the `Buckets` drill if the section isn't already long.

### External resources (optional)

One or two `ExternalResource` cards at the end (Pedagogical guidelines §3): the Tailwind typography utilities docs page, and an MDN or web.dev explainer on `text-wrap: balance`/`pretty`. Keep to the canonical, current sources surfaced during fact-check.

## Scope

Prerequisites to redefine in one line each (do not re-teach): utility-class syntax and the prefix-and-colon variant model (chapter 018 lesson 1); the theme-scale concept where utility numbers are tokens (chapter 018 lesson 1); `@theme` tokens and the `--font-*`/`--text-*` namespaces (chapter 018 lesson 2); Preflight's reset (chapter 019 lesson 3); the `min-w-0` flex companion (chapter 020 lesson 3).

This lesson does **not** cover:

- `next/font` setup at depth — subsetting, preload, weight axes, the `display` strategy. Named for shape only; owned by chapter 034 lesson 7.
- Heading semantics and the document outline (`h1`–`h6` choice). Owned by chapter 017 lesson 3 — this lesson *styles* headings, doesn't choose them.
- Link styling and `text-decoration` for `<a>` as an element. Owned by chapter 017 lesson 4 — this lesson covers `underline` as a utility only.
- Color of text (`text-*` color utilities, OKLCH, tokens) — owned by chapter 021 lesson 2. Use semantic color tokens in examples without teaching them.
- `font-feature-settings` / OpenType features at depth — recognition only, do not dwell.
- Custom `@font-face` declarations — `next/font` covers the cases; out of scope.
- Text inputs and form-element typography quirks — chapter 017 lesson 5 / Preflight.
- Internationalization-driven font stacks (CJK, Arabic) — out of scope; assume Latin script.
- The cascade, specificity, and `@theme` token mechanics at depth — chapter 019.

## Code conventions notes

- All examples Tailwind v4, CSS-first; tokens live in `@theme` in `app/globals.css` (no `tailwind.config.ts`). Type scale and font binding shown as `@theme` edits.
- Components are React 19 function components, arrow-bound to `const`, named exports, typed props; `className` composed via `cn()` with `className` last when an example accepts overrides.
- Use **logical** alignment utilities where natural (`text-start`/`text-end`) per the RTL rule, but lead with the physical `text-left`/`text-center`/`text-right` the student will read most often — note this is the common form, not a divergence.
- Examples reference **semantic** color tokens (`text-foreground`, `text-muted-foreground`) rather than primitives, consistent with the three-tier token rule — but defer *teaching* color to chapter 021 lesson 2.
- Single quotes, 2-space indent, semicolons (Biome) in any TSX shown.
- Deliberate divergence to note for downstream agents: snippets may strip imports and show partial components for focus (per Pedagogical guidelines §4) — this is intentional staging, not production-shape code.

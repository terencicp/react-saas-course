# Theme switching without FOUC

- Title (h1): `Theme switching without FOUC`
- Sidebar label: `Theme switching`

---

## Lesson framing

This is the React/Next.js half of dark mode and the **last teaching lesson of Chapter 018** before the quiz.
Lesson 5 built the entire Tailwind/CSS side: semantic tokens, `@custom-variant dark (&:is(.dark *))`, light values in `:root`, dark overrides in `.dark`.
Lesson 5 ended by *assuming* "something put `.dark` on `<html>`" and explicitly deferred the toggle, the OS-preference read, and "the bit of code that runs before the page paints" to this lesson.
**This lesson is that "something."** Open by cashing in exactly that handoff: we now build the switch, and we build it so the user never sees the wrong theme flash.

The senior question is the spine: *the `.dark` class must land on `<html>` before the first paint, or the user watching the page load sees a flash of the wrong theme.*
Everything in the lesson is downstream of that one constraint. FOUC is not a cosmetic afterthought — it is the entire reason `next-themes` exists and the reason its setup looks the way it does (an inline `<head>` script + a client provider + one weird-looking prop on `<html>`).
The pedagogical através line: **don't present the canonical setup as a recipe to copy; derive each piece from the flash it prevents.** The student should leave able to *explain why* `suppressHydrationWarning` is there, not just that shadcn told them to add it.

Target student: junior dev who, by end of Chapter 017, can write a Next.js root layout (`app/layout.tsx` is a Server Component owning `<html>`/`<body>`; `'use client'` poisons the tree so it belongs on a `<Providers>` child; hydration = "React walks the same tree client-side and attaches handlers"). They have NOT yet had the deep Server/Client render model (Chapter 030) or `useState`/`useEffect` (Chapters 024/025). This sets three hard constraints:

1. **Teach hydration mismatch concretely but lightly.** It is the crux of both the FOUC fix and the toggle, but the deep two-render model is Chapter 030's job. Give the student a *working* mental picture ("server renders one HTML, the browser must produce the same HTML on its first pass, a difference is a mismatch") without claiming to own the model. A `DiagramSequence` or `RequestTrace`-style timeline carries this better than prose.
2. **`useState`/`useEffect` are not yet taught.** The mount-gate pattern needs both. Name them for recognition only, lean on the **CSS-only icon swap** as the lesson's primary, recommended toggle (it needs *neither* hook and produces no mismatch by construction), and present the mount-gate as the "when you need richer logic" alternative — boxed, not drilled.
3. **The student is a *consumer* of `next-themes`, not its author.** Don't explain the library's internals beyond "it injects a synchronous `<head>` script + persists to `localStorage` + listens to `prefers-color-scheme`." One paragraph, then move to wiring.

Mental model the student should end with: **"The flash is a timing bug — default theme paints, then JS corrects it. `next-themes` wins the race by writing the class in a blocking `<head>` script before the body paints. The provider + `suppressHydrationWarning` + the toggle are the React-side plumbing around that one script."**

End-state capability: wire `<Providers>` with `<ThemeProvider>`, add `suppressHydrationWarning` to `<html>` and explain why, and build a hydration-safe `<ThemeToggle>` (CSS-only icon swap as default; mount-gated `useTheme()` read as the alternative), then verify in DevTools that the class is present and that there is no flash on reload.

Live-coding constraint (carry forward from L2/L5): `ReactCoding` runs against the Tailwind Play CDN and **cannot ingest a real `next-themes` provider, `localStorage` race, or an `app/layout.tsx`** — so there is no faithful live "build the FOUC fix" exercise. The CDN *can* render the CSS-only icon swap if `.dark` is toggled on an ancestor with a `<style type="text/tailwindcss">@custom-variant dark (&:is(.dark *));</style>` shim (same trick L5 used). Use that for the one hands-on exercise (build the icon swap); keep FOUC/provider/`suppressHydrationWarning` assessment **conceptual** (`Sequence` for the pre-paint timeline, `MultipleChoice`/`Dropdowns` for the prop/placement decisions). State this constraint to downstream agents so they don't author a doomed provider exercise.

Code conventions honored, with deliberate divergences flagged:
- **`<Providers>` consolidation.** Conventions pin one `<Providers>` Client Component for the whole app; this lesson establishes it (Chapter 017 L2 forecast it; Chapter 076/030 cash it in). Diverge from shadcn's per-provider `theme-provider.tsx` file — we use a single `app/providers.tsx`. Note this so the student isn't confused when they copy shadcn later and see a different filename.
- **Providers path = `app/providers.tsx`.** Conventions' QueryClient note says `app/_components/providers.tsx`, but the `_components` private-folder convention (Chapter 029 L1) and the deep Client-boundary model (Chapter 030) are **not taught yet**. Use the simpler `app/providers.tsx` here and add one forward-pointer that Chapter 030 L2 relocates it under `_components`. **Flag for human curator** (see Scope + final feedback).
- **Provider props** (verified June 2026, shadcn + Dec-2025 guides agree): `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>`. `attribute="class"` pairs with L5's `&:is(.dark *)` variant.
- `'use client'` at the **top** of the providers file only, never the root layout.
- Continue semantic role-named tokens in any styled example (`bg-background`, `text-foreground`) — chapter-wide discipline.

---

## Lesson sections

Section order follows the senior derivation, not the package's API order: **problem (the flash) → why the obvious fix fails → the package as the fix → wire it → the new mismatch the fix creates (`suppressHydrationWarning`) → the toggle (where mismatch bites again) → verify.** Each section is a link in one causal chain.

### Introduction (no header)

Pick up Lesson 5's exact thread in the first two sentences: "Last lesson, you styled a component to render correctly in both themes — *assuming* something had already put `.dark` on `<html>`. This lesson builds that something." Then state the stake concretely: a user with dark mode set opens your app; for a fraction of a second they see a white flash before it goes dark. That flash is the FOUC bug, and it is the whole subject. Preview the deliverable: a working theme toggle that switches instantly with no flash, plus understanding *why* every piece of the setup is there. Keep it to ~4 sentences, warm, no celebration.

Define `Term`: **FOUC** ("flash of unstyled content — here, a flash of the *wrong-themed* content before the right theme applies"). This is a non-obvious acronym and the title term; defining it up front earns its keep.

### Why the theme can't wait for React

**Goal:** make the flash *mechanical* and inevitable, so the fix feels earned. This is the most important section — if the student internalizes the timing here, the rest is plumbing.

Walk the naive timeline the student would build with what they know:
1. Server renders the page. **The server does not know the user's theme** — theme preference lives in the browser (`localStorage`) and in the OS setting, neither readable on the server. So the server emits HTML with the *default* theme (no `.dark`).
2. Browser receives that HTML and **paints it** — default theme on screen. This is the first paint, and it happens *before* React runs.
3. React hydrates, some `useEffect` reads `localStorage`, sees "dark", adds `.dark` to `<html>`.
4. The page **repaints** dark. The user saw light-then-dark: the flash.

Name the root cause in one line: **the correction runs after the first paint.** Any fix that reads the theme in React (`useEffect`, a provider's effect) is structurally too late — by the time React runs, the wrong pixels are already on screen.

State the fix shape before naming the tool: **the class has to be set by code that runs *before* the body paints.** The only thing that runs that early is a synchronous `<script>` in `<head>` — the browser executes it inline, blocking parse, before it paints `<body>`. That script reads `localStorage`/the OS preference and writes `.dark` onto `<html>` *first*. No flash, because the first paint is already correct.

**Diagram — `DiagramSequence` "The race against first paint" (primary visual of the lesson).** Two parallel timelines (naive vs. fixed) as a horizontal strip, scrubbed step by step. Reuse the L1/L5 lesson-component pattern; new component at `src/components/lessons/018/6/FirstPaintRace.astro`.
- Steps (naive lane): Server renders (no theme known) → HTML arrives → **first paint: LIGHT** (flash marker) → React hydrates → effect reads localStorage → **repaint: DARK**.
- Steps (fixed lane): Server renders → HTML arrives **with inline `<head>` script** → script runs, sets `.dark` → **first paint: DARK** (no flash) → React hydrates (already correct).
Pedagogical goal: locate the flash *in time* — between "HTML arrives" and "first paint" — and show the inline script slotting in exactly there. The horizontal twin-timeline makes "before vs after first paint" spatial. Cap height per diagram guidance; conveyed by text/aria too.

This section is where Chapter 017 L2's seeded fact ("`next-themes` uses `suppressHydrationWarning` on `<html>` because the theme class is set by an inline script before hydration") finally pays off — call back to it lightly so the student feels the through-line.

`Term`: **hydration** (re-define concisely for recognition — "React's second pass in the browser over the server's HTML, attaching event handlers; the deep model is Chapter 030"). The student met it in 017 L2; one-line refresher keeps flow.

### next-themes: the script plus a provider

**Goal:** introduce the tool as *the inline script, packaged* — not as a magic dark-mode box. Keep it to a paragraph of "what it is" then move to setup.

One-paragraph framing: `next-themes` is a ~3KB package whose entire job is the thing the previous section described. It (a) injects that synchronous `<head>` script for you, (b) persists the choice to `localStorage`, (c) listens to the OS `prefers-color-scheme` so `"system"` mode tracks the OS live, and (d) exposes a React hook (`useTheme()`) to read and set the theme from components. You install it (`npm i next-themes`) and configure it once; you never write the inline script yourself.

State the two moving parts the rest of the lesson wires:
- **`<ThemeProvider>`** — wraps the app, holds the config, injects the script.
- **`useTheme()`** — the hook your toggle calls.

Brief `Code` block: `npm i next-themes` (bash). Note current version line for downstream agents: **0.4.x (0.4.6 latest, June 2026)** — pin in scaffold; do not show a version-locked import beyond the bare `from 'next-themes'`.

`Term`: **`prefers-color-scheme`** ("the CSS media query that exposes the OS light/dark setting; next-themes reads it so `system` mode follows the OS"). Named here, syntax depth deferred (Chapter 021 L6).

### Wiring the provider into the root layout

**Goal:** place the provider correctly given the Server/Client boundary the student already knows — the provider is a Client Component, the root layout must stay a Server Component.

Re-state the constraint from 017 L2 as the reason for the file split: `<ThemeProvider>` uses React context and effects, so it is a Client Component; but `app/layout.tsx` owns `<html>`/`<body>` and must stay a Server Component (it should not become a client subtree). The resolution the student was promised in 017 L2: a thin **`<Providers>` Client Component** in its own file that the server layout renders as a child.

Show the two files with **`CodeVariants`** (two related files, the component's primary use case), labels `app/providers.tsx` and `app/layout.tsx`:

- **`app/providers.tsx`** — `'use client'` at the top; default-export `Providers({ children }: { children: React.ReactNode })` returning `<ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>{children}</ThemeProvider>`. Prose: this is the single client-provider wrapper for the whole app; later chapters add the query client and i18n provider *here* alongside `<ThemeProvider>` (forward-point Chapter 076/084 lightly).
- **`app/layout.tsx`** — Server Component (no directive). `<html lang="en" suppressHydrationWarning>` → `<body>` → `<Providers>{children}</Providers>`. Highlight (`ins=`) the two deltas vs the 017 L2 layout: the `suppressHydrationWarning` on `<html>` and the `<Providers>` wrap. Prose: `<html>`/`<body>` stay on the server; the client boundary is `<Providers>`, the smallest wrapper that needs it.

Then unpack the four provider props with **`AnnotatedCode`** on the `<ThemeProvider …>` line (focus attention on each prop in turn; component at `src/components/lessons/018/6/` not needed — AnnotatedCode is enough). Steps, one prop each:
- `attribute="class"` — "sets `class="dark"` on `<html>`; this is the exact hook L5's `@custom-variant dark (&:is(.dark *))` reads." Call back to L5 explicitly. Mention the one-line alternative `attribute="data-theme"` for multi-theme apps (named, not taught) → ties to the `themes` prop later.
- `defaultTheme="system"` — first-time visitors get the OS preference, not a hardcoded light.
- `enableSystem` — makes `"system"` a real theme value (so `defaultTheme="system"` is valid and the OS listener is active).
- `disableTransitionOnChange` — momentarily kills CSS transitions during the swap so `transition-colors` utilities don't animate the whole page when toggling (looks janky otherwise). Defaults `false`; we opt in. Senior default. (Verified current June 2026.)

Color the `suppressHydrationWarning` step distinctly or pull it into its own subsection (next) — it is the prop that needs the most justification and the student will otherwise treat it as noise.

`CodeTooltips` candidate: on `app/layout.tsx`, tooltip `suppressHydrationWarning` with a one-liner pointing forward to the next subsection rather than explaining inline (avoids duplicating the explanation).

#### Why `suppressHydrationWarning` belongs on `<html>` — and only there

**Goal:** this is the lesson's "aha" — the fix from the first section *creates* a new problem that this prop answers. Derive it; don't assert it.

The chain: the inline script mutates `<html>`'s class **before React hydrates**. So when React does hydrate, the `<html>` it finds in the DOM (`class="dark"`) does not match the `<html>` the server sent (no class). React flags that as a hydration mismatch and warns. **The mismatch is not a bug — it is the fix working as designed.** `suppressHydrationWarning` tells React "I know this one element's attributes were changed before hydration on purpose; don't warn." 

Three precise watch-outs the student must not miss:
- It belongs on **`<html>`** because that is the element the script mutates.
- It is **shallow** — it only suppresses warnings for that one element's own attributes, *not* its descendants. So it does not mask real mismatches elsewhere in your tree. This is why it's safe to use here and why you don't sprinkle it.
- It is **not** a general "make hydration errors go away" tool — using it to silence a real mismatch hides a real bug. It is specifically licensed here because the mutation is intentional and external.

Small **`MultipleChoice`** (single, 2 correct → multi-select) to check the mental model: "Why is `suppressHydrationWarning` on `<html>` here correct?" with correct answers ("the inline script changed `<html>`'s class before hydration, so a mismatch is expected" / "it only affects `<html>`'s own attributes, not the rest of the tree") and decoys ("it makes React skip hydrating `<html>`" / "it's required on every element that uses theme tokens"). Use `McqWhy` for rationale.

### Building the theme toggle

**Goal:** the user-facing control. Here the *same* hydration-mismatch problem returns one level down (a toggle that renders "the current theme's icon" can't know the theme on the server either), and the lesson resolves it with the CSS-only swap as the primary answer.

Frame the problem first: a toggle naturally wants to render the icon for the *current* theme (sun in light, moon in dark). But the server doesn't know the theme (same root cause as the flash), so rendering the current-theme icon on the server produces a hydration mismatch on the button. Two ways out — lead with the one that needs no React state.

Present both with **`CodeVariants`**, labels `CSS-only swap` (recommended) and `Mount-gated read`:

- **`CSS-only swap` (the senior default for a simple toggle).** Render *both* icons inside one `<button>`; let the `dark:` variant decide which is visible: `<SunIcon className="inline dark:hidden" />` next to `<MoonIcon className="hidden dark:inline" />`. The button calls `setTheme` on click via `useTheme()`. Why it sidesteps the mismatch entirely: the *markup* is identical on server and client (both icons always render); only CSS visibility differs, and CSS keys off the `.dark` class the inline script already set before paint. No React state reads the theme for display, so there is nothing to mismatch. Show it using `useTheme()` only for the *write* (`setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')`), which runs on click (post-hydration) and is therefore safe. Prose: "This is the reflex for a plain light/dark toggle."
  - Use `AnnotatedCode` *inside or after* this variant if the click handler + `resolvedTheme` read needs its own focus — but prefer keeping the variant tight (6-line prose cap) and putting the `resolvedTheme` explanation in the dedicated subsection below.

- **`Mount-gated read` (when the toggle needs richer logic).** For a toggle that must *render text/branching* off the theme (e.g. a three-way light/dark/system menu showing the active label), you must read the theme in React, which means waiting until after mount. Pattern: a `mounted` boolean flipped to `true` in `useEffect`; render a same-size placeholder until `mounted`, then render the real control. Show the shape but **explicitly name `useState`/`useEffect` as Chapter 024/025 territory** — the student is recognizing this pattern, not mastering the hooks here. Prose: "Reach for this only when the button's *content* depends on the theme; the placeholder must match the final size so the layout doesn't jump."

This CSS-only-first ordering is the lesson's senior stance and matches the chapter outline: CSS swap for simple toggles, mount-gate for richer logic.

#### `theme` vs `resolvedTheme`

**Goal:** the one `useTheme()` subtlety that bites everyone — separated out so it lands.

`useTheme()` returns `{ theme, setTheme, resolvedTheme, systemTheme, themes }`. The trap: `theme` can be `"system"` (the *setting*), while `resolvedTheme` is always the concrete `"light"` or `"dark"` (the *result* after resolving `system` against the OS). A toggle that flips based on `theme` breaks when `theme === "system"` (there's no opposite of "system"); read **`resolvedTheme`** to decide the next theme. Tiny table or two-line `Code` contrasting the two values when the OS is dark and the user picked "system" (`theme = "system"`, `resolvedTheme = "dark"`). Keep the rest of the hook's surface (`systemTheme`, `themes`) named-only — out of scope per chapter outline.

`Term`: none new needed; this is a value-distinction, carried by the table.

### Verifying it works

**Goal:** install the daily debugging reflex (mirrors L1's "is the class in the DOM?" and L5's cascade-walk reflexes), and give the student a concrete pass/fail check for their own build.

Two checks, framed as a `Steps` procedure:
1. **Open DevTools, inspect `<html>`.** Toggle the theme: the `class` attribute should flip between absent/`"dark"`. If the class never appears: the provider isn't wrapping the tree, or `attribute` is misconfigured. If the class appears but colors don't change: the problem is on the *Tailwind* side — `@custom-variant dark` / tokens in `globals.css` (L5), not here. This split is the key triage: **class present + no color change ⇒ L5's problem; no class ⇒ this lesson's problem.**
2. **Hard-reload with dark active and watch for a flash.** No flash ⇒ the inline script is running before paint (the whole point). A flash ⇒ the script isn't injected (provider missing/misplaced) or you added a competing `useEffect`-based theme setter.

Short **`Sequence`** (ordering drill) assessment: scramble the pre-paint timeline steps ("server renders default" / "inline `<head>` script runs and sets `.dark`" / "first paint, already dark" / "React hydrates" / "user clicks toggle → `setTheme`") and have the student order them. This re-tests the lesson's spine (the timing model) without needing live code, respecting the CDN constraint. Optionally pin the relevant snippet above the steps.

### Beyond light and dark (brief)

**Goal:** name the multi-theme extension for recognition without teaching it — rounds out the lesson and pre-empts "what about my marketing site's five themes?" Keep to a few sentences + one `Aside`.

For apps with more than light/dark (blue, high-contrast, brand themes), switch `<ThemeProvider>` to `attribute="data-theme"`, pass `themes={['light','dark','blue','high-contrast']}`, and add per-theme `[data-theme=blue] { … }` token blocks in `globals.css` (the L5 token model, keyed by attribute instead of class). Rare in SaaS, common in marketing/agency sites. Named only — the chapter outline marks this light-treatment. One `Aside` (note) is enough; do not build it out.

### Watch-outs distributed into their sections

Per the no-orphan-watchouts rule, these live in the sections above, not in a trailing list. Mapping for downstream agents:
- `'use client'` on `<Providers>`, never the root layout → *Wiring the provider*.
- `suppressHydrationWarning` non-negotiable on `<html>`, shallow, not a silencer → its own subsection.
- Don't render theme-dependent *content* on first render without a mount gate or CSS swap → *Building the theme toggle*.
- `theme` vs `resolvedTheme` → its subsection.
- `next-themes` is React-side only — SSR-rendered theme-dependent content (e.g. a server-read theme) needs a cookie, out of scope → one-line `Aside` in *Building the theme toggle* (cite as the boundary, don't teach).
- class belongs on `<html>`, not `<body>`/a wrapper → *Wiring the provider* (it's what `attribute="class"` targets).
- The React-19 inline-`<script>` dev warning: **downgraded to a single recognition-only line** (a brief `Aside`) — 2026 sources no longer foreground it; named so the student doesn't chase it, nothing more.

### External resources (optional, end)

One or two `ExternalResource` cards: the `next-themes` GitHub readme (the canonical API), and shadcn's "Dark mode / Next.js" page (so the student recognizes the per-provider `theme-provider.tsx` shape they'll meet there and maps it to our consolidated `<Providers>`). Optional `VideoCallout` only if a current (<6mo) high-signal walkthrough exists; do not force one — the lesson is short and self-contained, and the topic is more conceptual-timing than visual.

---

## Scope

**Prerequisites (redefine in one line each, don't re-teach):**
- Root layout is a Server Component owning `<html>`/`<body>`; `'use client'` poisons the tree (Chapter 017 L2 — assume known, restate only the one-line reason the provider gets its own file).
- Hydration = React's browser pass over server HTML (Chapter 017 L2 — one-line refresher only).
- `@custom-variant dark (&:is(.dark *))`, semantic tokens, `.dark` overrides (Lesson 5 — assume fully known; this lesson never re-defines tokens, only references that `.dark` triggers them).

**This lesson does NOT cover (hand off explicitly):**
- The Tailwind-side dark-mode model — tokens, `@custom-variant dark`, OKLCH (Lesson 5 owns; this lesson is strictly the React side and *sets* `.dark`, never defines what it does).
- The deep Server/Client two-render model, why hydration mismatches happen mechanically, the `<Providers>` boundary at depth (Chapter 030 — this lesson uses the boundary, doesn't derive it).
- `useState` / `useEffect` as skills (Chapters 024/025 — named for recognition in the mount-gate variant only; the student is not expected to author hooks here).
- The full root-layout surface — metadata, fonts, `next/font` (Chapter 017 L2 owns; this lesson touches `app/layout.tsx` only to add `suppressHydrationWarning` + `<Providers>`).
- The full `useTheme()` API beyond `theme`/`setTheme`/`resolvedTheme` (`systemTheme`, `themes`, `forcedTheme`, etc.) — named-only.
- Server-side theme reading via cookies (named once as the boundary for SSR theme-dependent content; not taught).
- `prefers-color-scheme` media-query syntax (Chapter 021 L6 — named, not drilled).
- Visual-regression testing both themes (Unit 18 / Chapter 095 — one-line pointer at most).
- Multi-theme apps beyond light/dark (light-treatment `Aside` only — `attribute="data-theme"` + `themes` named).

**Open discrepancy flagged for the human curator (and downstream agents):**
- **Providers file path.** Code conventions' QueryClient note pins `app/_components/providers.tsx`, but the `_components` private-folder convention (Chapter 029 L1) and the deep client-boundary model (Chapter 030) are taught *after* this chapter. This outline uses **`app/providers.tsx`** to avoid forward-referencing an unexplained folder convention, and adds a one-line forward-pointer that Chapter 030 L2 relocates it under `_components`. The chapter outline's `src/components/providers.tsx` is overridden in favor of an `app/`-relative path consistent with the conventions file's intent. If the curator prefers strict alignment, switch to `app/_components/providers.tsx` and add a brief note explaining the private-folder prefix.
- **`<Providers>` vs shadcn's `theme-provider.tsx`.** We consolidate into one `<Providers>` (course convention, Chapter 017 L2 forecast). shadcn ships a per-provider `theme-provider.tsx`. The lesson notes the difference so the student maps the two when copying shadcn. Deliberate; not a bug.

---

## Notes for downstream agents

- **Derive, don't recipe.** The failure mode here is dumping the shadcn copy-paste setup. Every piece (`suppressHydrationWarning`, the inline script, the file split) must trace back to the flash. The `FirstPaintRace` `DiagramSequence` is the spine — author it first.
- **Lesson-specific component to build:** `src/components/lessons/018/6/FirstPaintRace.astro` — the twin naive/fixed first-paint timeline used in the `DiagramSequence`. (No other custom component is required; `AnnotatedCode`/`CodeVariants`/`MultipleChoice`/`Sequence` cover the rest.)
- **CDN constraint is hard:** no live provider/`next-themes`/`app/layout.tsx` exercise. The single live `ReactCoding` exercise = the CSS-only icon swap, using the L5 `<style type="text/tailwindcss">@custom-variant dark (&:is(.dark *));</style>` shim with a `.dark` ancestor toggled in the harness so the student can *see* the `dark:hidden`/`dark:inline` swap. Everything else is conceptual (`Sequence`, `MultipleChoice`, `Dropdowns`).
- **Frontmatter** (match L5's shape): `title: Theme switching without FOUC`, `description` (one sentence on shipping a no-flash theme toggle), `chapter-id: 18`, `sidebar: { order: 6, label: "Theme switching" }`.
- **Verified June 2026:** next-themes 0.4.x (0.4.6); provider props `attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange`; `suppressHydrationWarning` on `<html>` (shallow); `disableTransitionOnChange` default `false`, we opt in; `resolvedTheme` resolves `system`. React-19 inline-script warning is no longer foregrounded in current guides — keep it to a one-line recognition `Aside`.

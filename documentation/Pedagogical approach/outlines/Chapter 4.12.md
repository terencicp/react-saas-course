## Concept 1 — The "Done when" bar is the brief

**Why it's hard.** Project chapters tempt students to negotiate quality at verify time ("99 is basically 100", "one keyboard trap is fine"). The bar has to be stated up front, in concrete clauses, before a single line is written — otherwise the verify pass becomes a negotiation, not a check.

**Ideal teaching artifact.** A Decision-style verification contract: seven clauses, each pinned to a specific check (no-FOUC reload, Lighthouse 100, keyboard tab traversal, reflow at 360/768/1280, drawer focus trap, drawer scroll lock, Esc closes). Render the three target widths as static screenshots side-by-side so the student sees the destination before the path. Each clause names the lesson that builds it — so the brief doubles as a map of the chapter.

**Engagement.** A short match drill: pair each "Done when" clause to the build lesson that earns it (4.12.3 / 4.12.4 / 4.12.5). Forces the student to internalize the chapter as a clauses-to-builds map, not a linear tour.

**Components.**
- `Figure` containing three side-by-side hand-authored screenshot stills (1280 / 768 / 360 with drawer open).
- `Matching` pairing each "Done when" clause to its owning lesson.
- The verification table itself renders cleanly as a regular markdown table; no new component needed.

---

## Concept 2 — Reading a configured starter as a single shape

**Why it's hard.** A modern Next.js + Tailwind v4 + shadcn starter is many files that only make sense as one shape: `@theme` tokens, `.dark` overrides, `ThemeProvider` props, `suppressHydrationWarning`, `components.json`, the typed `data.ts`. The student who reads them as isolated files misses that they are one wiring decision repeated across the tree.

**Ideal teaching artifact.** A walk-the-shape diagram: a single annotated `Figure` showing the starter's file tree on the left and arrows pointing from each provided file to the contract it enforces ("`@theme` block → utility class names like `bg-background`", "`ThemeProvider attribute='class'` → `.dark` flip on `<html>`", "`components.json` Radix engine → what `pnpm dlx shadcn add` installs"). The student reads the diagram once, then opens each file in order and confirms the arrow. Setup/wiring archetype with a pre-paint trace.

**Engagement.** A `Tokens` drill on the provided `app/layout.tsx` snippet: click the props on `<ThemeProvider>` that the chapter depends on (`attribute="class"`, `defaultTheme="system"`, `disableTransitionOnChange`) and the attribute on `<html>` (`suppressHydrationWarning`). Decoys: a hardcoded color, a `<link>` to a font stylesheet. Locks the wiring vocabulary before the student writes the toggle in 4.12.4.

**Components.**
- `FileTree` for the layout.
- `ArrowDiagram` inside a `Figure` wiring `globals.css` → utility names, `layout.tsx` → `.dark` flip, `components.json` → installed primitives, `data.ts` → typed copy.
- `Tokens` for the wiring-prop drill.
- `AnnotatedCode` on the `@theme` block — step 1 light tokens, step 2 `.dark` overrides, step 3 utility consumers.

---

## Concept 3 — CSS-only theme-aware swaps beat JS branches

**Why it's hard.** The reflex move is `const theme = useTheme(); return <img src={theme === 'dark' ? dark : light} />`. That reflex causes the hydration mismatch, the FOUC flash, and the loading waterfall the chapter is paid to prevent. The student needs to see *why* the dual-`<img>` + `dark:hidden` shape is correct, not just be told it is.

**Ideal teaching artifact.** A `CodeVariants` wrong-then-right: tab A is the JS-branch reflex with an inline trace ("at SSR `theme` is undefined → server renders the light source → client hydrates to dark → flash"); tab B is the dual-`<img>` shape with the trace ("server renders both → CSS hides one → the `.dark` class flip is the only switch, no JS decision"). The trace lines are the lesson; the snippets are illustrations of the trace. Pattern archetype, named for what it prevents (FOUC + hydration mismatch).

**Engagement.** A two-frame `DiagramSequence`: frame 1 is the SSR HTML (both `<img>` tags present, both with `alt`); frame 2 is the post-paint DOM with one `hidden` via CSS. The student scrubs and confirms no JS ran between frames. Follow with one `TrueFalse` statement to lock the principle: "The theme decision happens in CSS, not in React."

**Components.**
- `CodeVariants` for wrong/right with inline trace annotations.
- `DiagramSequence` for the SSR-to-paint frames — hand-SVG inside each frame, or a `Figure` with two captioned stills if SVG is overkill.
- `TrueFalse` (single round) for the recall snap.

---

## Concept 4 — The cva variant table makes invalid states unrepresentable

**Why it's hard.** The student arrives with the boolean reflex from earlier React work: `isBrand`, `isMuted`, `isLoud`. Three booleans permit eight states, two of which are nonsense (`isBrand && isMuted`). The cva variant table is *also* an exercise in modeling — the discipline only sticks when the student feels the boolean version break.

**Ideal teaching artifact.** A wrong-by-default repair sandbox. The student opens a `ReactCoding` cell pre-populated with the three-boolean `FeatureCard` and a row of cards in the preview that includes the contradictory combination. The task: refactor to `cva` with `tone: { default, brand, muted }` and `emphasis: { quiet, loud }` plus `VariantProps`, then confirm the type error fires when a parent passes `tone="brand" tone="muted"` (now syntactically impossible). Pattern archetype. The sandbox carries the assessment because the type checker fails open until the refactor is correct.

**Engagement.** The compilation step is the assessment. Follow with one `MultipleChoice`: which prop shape lets `<FeatureCard>` accept a tone from `data.ts` typed correctly? Answers vary on `VariantProps<typeof featureCardVariants>` placement.

**Components.**
- `ReactCoding` in target-match mode with the wrong shape as starter and the cva shape as target.
- `MultipleChoice` follow-up.
- The cva signature itself renders in a `Code` block; no new component needed.

---

## Concept 5 — The hydration-mismatch dance for the theme toggle

**Why it's hard.** `next-themes` cannot know the client theme on the server. If the toggle reads `resolvedTheme` during the first render, SSR renders one icon, the client hydrates to the other, React screams. The fix — `mounted` state via `useEffect` plus a placeholder-sized button — looks like ceremony until the student has seen the broken version.

**Ideal teaching artifact.** A wrong-then-right with a console pane. Tab A renders `<Sun />` or `<Moon />` directly from `resolvedTheme` — the preview shows the hydration warning in a fake console block below. Tab B introduces the `mounted` gate and the placeholder button — the warning disappears, the dimensions of the button stay stable across the SSR → mounted swap. Pattern archetype, named for what it prevents (hydration warning + layout shift on mount).

**Engagement.** A `Sequence` exercise: order the five steps of the toggle's first paint (server renders placeholder → HTML streams → React hydrates → `useEffect` fires → `setMounted(true)` triggers re-render with real icon). Locks the *why* of the placeholder shape — it's not aesthetic, it's the only stable thing to render before `mounted`.

**Components.**
- `CodeVariants` for wrong/right with simulated console output as plain `Code` blocks underneath each tab.
- `Sequence` for the first-paint ordering.

---

## Concept 6 — Reduced-motion is a pair, not an afterthought

**Why it's hard.** The student writes `md:scale-105` for the featured pricing card and moves on. The discipline the project enforces is that every decorative transform ships *with* its `motion-reduce:` companion, written in the same line. Adding it later means it gets forgotten; pairing it at write-time means it can't.

**Ideal teaching artifact.** A side-by-side controllable demo: two pricing tables rendered identically except one author wrote `md:scale-105` and the other wrote `md:scale-105 motion-reduce:scale-100`. A toggle simulates the user's `prefers-reduced-motion` setting. The student flips the toggle and watches one table keep scaling while the other flattens. The lesson is the *pairing*, not the utility. Concept archetype.

**Engagement.** A `Tokens` drill on a pricing card class string with several decorative transforms (`scale-105`, `hover:rotate-1`, `transition-transform`) — the student clicks the ones missing a `motion-reduce:` companion. Decoys: non-decorative utilities like `gap-6` that don't need pairing.

**Components.**
- Existing components don't cover the live `prefers-reduced-motion` simulator. Proposal: `MotionPreferenceToggle` (see proposals).
- Alternative if the bespoke component is deferred: a `TabbedContent` with two captioned video stills (motion on / motion off) wrapped in `Figure`.
- `Tokens` for the pair-recognition drill.

---

## Concept 7 — The custom hook is the only owned primitive

**Why it's hard.** The student who learned `useEffect` and custom hooks in 4.9 and 4.10 wants to write one for everything in the drawer — focus trap, Escape key, return focus, scroll lock. The senior cut is the opposite: Radix's `Sheet` owns three of those; the project owns exactly one (`useLockBodyScroll`) and only because iOS Safari needs the belt-and-suspenders. Knowing what *not* to write is the lesson.

**Ideal teaching artifact.** A responsibility map: a two-column `Figure` listing the drawer's behaviors on the left and the owner on the right (focus trap → Radix; Esc-to-close → Radix; return focus to trigger → Radix; visual transition → Radix + tw-animate-css; body scroll lock on iOS → your hook). Then a `ScriptCoding` exercise to implement `useLockBodyScroll(locked: boolean)` with the subtle requirement: restore the *prior* `overflow` value on cleanup, not `''`. Tests cover the prior-value case and the `typeof document === 'undefined'` SSR no-op. Pattern archetype.

**Engagement.** The test suite carries the assessment. Follow with one `MultipleChoice`: "Which of these behaviors should you write yourself for the mobile drawer?" Correct: scroll lock (with the iOS caveat). Decoys: focus trap, return focus, Esc handler — all Radix.

**Components.**
- `Figure` with a hand-SVG two-column ownership map.
- `ScriptCoding` (or `ReactCoding` if a render harness is easier) for the hook implementation with tests for prior-value restore and SSR guard.
- `MultipleChoice` for the responsibility recall.

---

## Concept 8 — Single-source navigation across breakpoints

**Why it's hard.** The naïve mobile-drawer build duplicates the `navLinks` array into two `<nav>`s — one desktop, one inside the `Sheet`. Now there are two sources of truth, and a copy update misses one. The cut is `navLinks` lives in `data.ts`, both surfaces consume it, and the visibility switch is one CSS pair: `hidden md:flex` on the desktop nav, `md:hidden` on the mobile trigger.

**Ideal teaching artifact.** A toggleable-viewport demo: a header preview with a width slider (or three preset buttons: 360, 768, 1280). The student watches which `<nav>` is in the DOM at each width — both are *always* in the DOM; only one is visible. A side panel shows the rendered class strings on each surface. Concept archetype with manipulation. The takeaway lands when the student sees the same `navLinks` array threaded through both surfaces, with no JS branching.

**Engagement.** A `Buckets` sort: drag a list of mixed visibility utility classes (`hidden md:flex`, `md:hidden`, `lg:block`, `sm:hidden md:block`) into "shows on mobile" / "shows on desktop" / "shows on both" buckets. Locks the breakpoint-flip reading reflex.

**Components.**
- Proposal: `ViewportToggle` — a wrapper that renders a child component at a chosen width (preset buttons or slider), useful any time a responsive cut is the lesson. See proposals.
- Alternative if deferred: a `TabbedContent` with three tabs (360 / 768 / 1280) each containing a captioned screenshot of the header at that width.
- `Buckets` for the visibility-class sort.

---

## Concept 9 — The drawer's a11y contract is the primitive's job

**Why it's hard.** The student knows from 4.11 that focus traps are hard. The project asks them to *not* write one. The discipline is: name what Radix's `Sheet` gives you (focus trap, return focus, Esc close, ARIA roles), then identify the one contract the primitive *requires from you* — `<SheetTitle>` as the accessible name, even when visually hidden. Omit it and Radix logs a console error; the audit will catch it; the verify lesson will fail.

**Ideal teaching artifact.** A real-artifact-replica: a working `Sheet` instance the student opens in the lesson page, with a `Tokens`-style overlay highlighting which parts of the drawer are Radix's responsibility (the focus ring on the active link, the dimmed overlay, the slide-in animation, the `Esc` handler) and which one piece is the student's contract (`<SheetTitle>`, possibly `sr-only`). The student clicks the Radix-owned parts to dismiss them, leaving the one piece they must write. Pattern archetype.

**Engagement.** A `CodeReview` cell: a `MobileNav` snippet with `<SheetTitle>` omitted and an icon-only `<SheetTrigger>` missing `aria-label`. The student leaves inline comments naming both omissions; the rubric checks for "missing accessible name on the dialog" and "missing aria-label on icon-only trigger".

**Components.**
- A live `Sheet` in MDX is feasible — shadcn's `Sheet` is React; the demo page can render one. Wrap in `Figure` for caption.
- Proposal: `ResponsibilityHighlight` overlay component — given a child render and a list of `{ selector, owner, note }`, render dimmable hotspots. Useful any time the lesson is "what does the framework do vs. what do you do". See proposals.
- Alternative if deferred: a static `Figure` with a hand-SVG of the drawer annotated with owner labels.
- `CodeReview` for the omission-spotting drill.

---

## Concept 10 — Verify clause-by-clause is a rehearsal of failure modes

**Why it's hard.** Verification at the end of a project tends to collapse into "looks good, ship it." The discipline the chapter installs is the inverse: each clause is a rehearsal of the bug it catches. Lighthouse 100 is necessary, not sufficient — axe DevTools catches what Lighthouse misses, and the keyboard pass is the hardest bar. The student needs to feel each verify step as a specific failure mode they're confirming absent.

**Ideal teaching artifact.** A two-column `Figure`: left column lists each "Done when" clause; right column states the bug it confirms absent ("FOUC on reload" → "the inline pre-paint script and `suppressHydrationWarning` are wired correctly"; "drawer doesn't lock body scroll on iOS" → "the `useLockBodyScroll` hook restores prior overflow and the SSR guard is in place"). The student walks the list as a self-audit. Reference archetype.

Pair the audit with a small misconception ambush at the top: a `PredictOutput`-style question — "You ran Lighthouse and got 100. What can still be wrong?" — with the correct answer naming the keyboard-only pass and the axe rule coverage gap. Lands the necessary-not-sufficient principle before the student walks the list.

**Engagement.** A `Sequence` exercise: order the seven verify steps by which fails first if the wiring is broken at a specific layer (e.g. if `suppressHydrationWarning` is removed, the no-FOUC clause fails first; if `<SheetTitle>` is omitted, the axe pass fails first). Trains the student to read a verify failure backwards to its broken wire.

**Components.**
- `Figure` with the clause → failure-mode table (regular markdown table inside is fine).
- `PredictOutput` for the Lighthouse-100-but-broken ambush.
- `Sequence` for the failure-cascade ordering.

---

## Component proposals

**`MotionPreferenceToggle`** — a wrapper that renders its child inside a context where `prefers-reduced-motion` is forced to a chosen value via CSS class or media-query simulation. UI: a single toggle ("Motion on / Motion reduced"). The child is any normal preview component.
- Uses in this chapter: Concept 6.
- Forward-links: Unit 5 (route transitions and view transitions API), Unit 11 (production polish), anywhere the lesson contrasts decorative vs. essential motion. Compounds.
- Leanest v1: a `<div className={reduced ? 'motion-reduce-forced' : ''}>` wrapper plus a single Tailwind utility override that fakes `prefers-reduced-motion` for descendants. No real OS-level simulation needed — the CSS forcing is enough to demonstrate the pair.

**`ViewportToggle`** — a wrapper that renders a child component at a chosen viewport width using an iframe or a `transform: scale` + fixed-width container. UI: preset buttons (360 / 768 / 1280) plus optional slider.
- Uses in this chapter: Concept 8.
- Forward-links: any chapter teaching responsive cuts (4.5.6 has already shipped without it; Unit 5 layouts; Chapter 13's CSV/export UI; any project chapter with responsive verify). Strong compounding.
- Leanest v1: three preset buttons, fixed-width container with `transform: scale` to fit the lesson column; no slider, no iframe — DOM rendering at the chosen width is enough.

**`ResponsibilityHighlight`** — an overlay component that takes a child render and a list of `{ selector, owner, note }` entries; renders dimmable hotspots over the child so the student can identify which parts the framework owns vs. which the developer owns.
- Uses in this chapter: Concept 9.
- Forward-links: any "framework vs. you" lesson — server actions error boundaries (Unit 7), TanStack Query cache layer (Unit 16), Drizzle relations (Unit 6). Strong compounding wherever the cut is "the library does X, you do Y".
- Leanest v1: static SVG overlay with labeled callout pins inside a `Figure` — no interactivity, no selectors. The interactive version is v2 if the demand pattern repeats. Concept 9's primary recommendation should default to the static version unless `ViewportToggle` and `MotionPreferenceToggle` build first and earn the precedent.

---

## Build priority

`ViewportToggle` carries the most forward-link weight: every responsive-cut lesson and every project-verify pass can use it, and 4.5.6 already shipped without one. Build it first.

`MotionPreferenceToggle` is the second pick — narrower scope but the `motion-reduce:` pair is a discipline the course preaches in 4.5.5 and enforces here and in every later UI chapter; one simulator pays back across the curriculum.

`ResponsibilityHighlight` is the most ambitious and the most speculative. Defer it. Concept 9 lands fine with a static annotated `Figure` for v1; if the framework-vs-you cut keeps recurring in Units 6/7/16, revisit and build the interactive version then.

## Open pedagogical questions

- Concept 4 asks the student to refactor cva inside `ReactCoding`, but the cva package + Tailwind v4 + `VariantProps` toolchain inside the in-browser runtime may not be fully wired. If it isn't, fall back to a static `CodeVariants` wrong/right with a `Dropdowns` exercise that picks the right `VariantProps<>` placement.
- Concept 9's live `Sheet` instance assumes shadcn primitives can render inside the Astro/Starlight MDX page. If Radix's portal targeting or the `cn()` import path doesn't resolve cleanly in the lesson runtime, the artifact degrades to a captioned video or static screenshots — confirm before committing.

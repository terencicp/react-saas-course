## Concept 1 — Source-in-repo as a trade, not a feature

**Why it's hard.** Students arrive thinking of UI libraries as one slider: ergonomic (MUI) vs. headless (Radix). shadcn does not sit on that slider — it changes who owns the file. The misconception is "shadcn is just another component library with a CLI"; the consequence is treating `components/ui/` as untouchable and missing every reason the model exists.

**Ideal teaching artifact.** A side-by-side **ownership comparison** (Decision archetype): three columns — "MUI/Mantine," "Radix headless," "shadcn" — and a fixed set of rows the student already cares about (where does the source live, who owns design changes, who ships the a11y fix, what does an upgrade look like, what happens when design diverges). The student reads across rows, not down columns; the columns are not "features" but "consequences of who owns the file." A short follow-up scenario sequence ("design wants a custom dialog anchor — which library lets you do it without a PR upstream?") forces them to apply the model.

**Engagement.** A `Buckets` round after the comparison: drop six everyday team scenarios ("the Radix maintainer ships a focus-trap fix," "design wants to fork the Select positioning," "we want to keep upgrade noise low," "we want to read the source while debugging") into "favors shadcn" / "favors styled library" / "either works." Confirms the student internalized the trade rather than the brand.

**Components.**
- `TabbedContent` or a hand-SVG-inside-`Figure` for the three-column comparison — the rows are short text, the columns are short text, no bespoke widget needed.
- `Buckets` for the scenario sort.

**Project link.** Chapter 4.12 ships against this trade — the project relies on the student owning `components/ui/` files and reading them when the dialog or sheet misbehaves; the comparison is the lens that makes 4.12.2's `components.json` tour feel like inheritance, not surveillance.

---

## Concept 2 — The shadcn install loop and `components.json`

**Why it's hard.** The CLI looks like every other scaffolder, so students treat it as one-shot. The senior reality is that `add` is the daily command, the config file is the persistent contract, and re-running `add` overwrites — that last fact bites teams that hand-edited.

**Ideal teaching artifact.** A **terminal-and-tree walkthrough** (Setup/wiring archetype): the student watches `init` produce `components.json`, the `cn()` utility, and the Tailwind tokens, then sees `add button dialog` populate `components/ui/`. The `components.json` fields a senior touches (`style`, `tsx`, `tailwind.cssVariables`, `aliases`, `iconLibrary`, `registries`) are highlighted in place, each with a one-line "what flips when you change this." The walkthrough closes with re-running `add button` on a file the student edited — and showing the overwrite.

**Engagement.** A `PredictOutput`-style ask before the overwrite reveal: "you edited `components/ui/button.tsx` to add a `tertiary` variant, then ran `pnpm dlx shadcn add button` — what's in the file now?" The wrong-by-default prediction makes the overwrite rule land harder than narration would.

**Components.**
- `AnnotatedCode` on `components.json` (each field a step with its consequence).
- `Code` blocks for the terminal sequence; `FileTree` for the before/after `components/ui/`.
- `PredictOutput` for the overwrite trap.

---

## Concept 3 — `asChild` and compound components as the shadcn shape

**Why it's hard.** Every shadcn primitive is compound (`Dialog`, `DialogTrigger`, `DialogContent`...) and every trigger uses `asChild` to inject the team's own element. Students who skip the pattern end up nesting a `<button>` inside a `<DialogTrigger>` (a button-inside-button accessibility bug) or styling `DialogTrigger` directly and losing the trigger contract. The misconception is treating `DialogTrigger` as a styled wrapper rather than a slot.

**Ideal teaching artifact.** A **two-pane DOM diff** (Pattern archetype): on the left, the JSX the student writes — once without `asChild`, once with. On the right, the rendered HTML for each. The student sees that without `asChild` the result is `<button><button>...</button></button>` (with the inner one carrying the trigger props), and that with `asChild` the trigger props merge onto the team's `<Button>` — one element, correct semantics. The artifact names the pattern out loud once because every dialog, dropdown, popover, and menu in the rest of the course writes it.

**Engagement.** A `Tokens` round on a compound-component snippet — click every element in `<Dialog><DialogTrigger asChild><Button>...</Button></DialogTrigger><DialogContent>...</DialogContent></Dialog>` that is a *slot* (correct: `Dialog`, `DialogTrigger`, `DialogContent`; decoy: `Button`). Forces the student to separate "slots in the compound API" from "the element they injected."

**Components.**
- `CodeVariants` with two tabs (without `asChild`, with `asChild`), each tab showing the JSX and the resulting HTML output.
- `Tokens` for the slot-vs-injected round.

**Project link.** 4.12.3 wires `<Button asChild>` around CTAs in the hero and 4.12.5 wires the mobile drawer's `Sheet` trigger with `asChild`; the pattern is the load-bearing one for the whole project.

---

## Concept 4 — Semantic tokens are where contrast lives

**Why it's hard.** Students learn `bg-blue-500 text-white` in Chapter 4.2 and try to keep designing at that level inside shadcn. The senior frame is the opposite: shadcn ships `bg-primary text-primary-foreground` and the *theme* (the CSS variables) is the single audit surface — fix contrast once at the token, not per component. Dark mode is the same names with different values. Students who don't grasp this audit per page and miss the centralization.

**Ideal teaching artifact.** A **live token playground** (Concept archetype): a small panel of rendered shadcn primitives (a `Button`, a `Card`, a `Badge`, a piece of body text on a surface) sits next to sliders for `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted`, `--border`. The student drags `--primary` toward `--background` and watches the components dim — and watches a contrast-ratio readout next to each pair turn red as it drops below 4.5:1. A `.dark` toggle flips the same variables to the dark palette; the same readouts re-audit instantly. The student leaves with one durable fact: *contrast is a property of the theme*.

**Engagement.** After the playground, a `MultipleChoice` triage: "your `--primary` fails AA on `--background` only in dark mode. Where do you fix it?" with answers (a) per-page override on every page, (b) on the affected button, (c) the `.dark` block in `globals.css`, (d) the light theme's primary. Pins the centralization frame.

**Components.**
- New component: **`TokenPlayground`** — semantic-token sliders driving live shadcn primitives with inline contrast readouts. Forward-links into Chapter 4.2.5 (semantic tokens), 4.3.4 (three-tier token model), and Chapter 17.2 (security/compliance baseline) where the audit surface recurs.
- `MultipleChoice` for the centralization triage.

**Project link.** 4.12.2 walks the student through reading the project's `@theme` block; the playground is the model that turns that walk-through into recognition rather than recitation.

---

## Concept 5 — Accessibility as four standing commitments

**Why it's hard.** "Accessibility" feels like an unbounded list — students either retreat to "we'll do it at QA" or try to learn every WCAG criterion at once. The senior frame is four commitments the team holds *while* writing screens: keyboard, contrast, motion, target size. Without them named as commitments, accessibility never gets prioritized over the next feature.

**Ideal teaching artifact.** A **commitment card-set** (Concept archetype, four parallel mini-cards) rather than running prose. Each card is short and identically shaped: the commitment in one sentence, the WCAG line that backs it, the one-line senior test ("unplug your mouse for five minutes," "the design tokens pass at the palette level," "Tailwind's `motion-reduce:` is in your animation utilities," "`min-h-11 min-w-11` on touch-primary buttons"), and the link to the call-site lesson that owns the mechanics. Reading the four cards as a set is the artifact — the parallel structure is what makes "four commitments" sticky.

**Engagement.** A `Buckets` sort where ten everyday WCAG violations ("submit button is 28px tall on mobile," "focus ring removed for design polish," "marquee text auto-plays," "`--primary` is `oklch(0.7 0.1 250)` on `--background` `oklch(0.95 0)`") drop into the four commitment buckets. Forces the student to *categorize* by commitment, which is the operating mode the chapter wants.

**Components.**
- `CardGrid` of four `Card`s for the commitment set.
- `Buckets` (four-column) for the categorization round.

**Project link.** 4.12.6 verifies each "Done when" clause against these commitments — the cards are the rubric the student walks during the audit pass.

---

## Concept 6 — "First rule of ARIA": semantic HTML moves first

**Why it's hard.** Junior instinct is to *add* attributes when something is broken. The ARIA-first instinct produces `<div role="button" tabindex="0" onClick={...} aria-label="Save">` and the maintainer thinks they've solved accessibility — but the div is still inert to keyboard, ARIA does not change behavior. The fix is to delete the ARIA and use `<button>`. This rule is more important than any single ARIA attribute.

**Ideal teaching artifact.** A **wrong-by-default sandbox** (Pattern archetype): the student lands on a small page with three "almost-right" custom widgets — a `<div role="button">`, a `<span onClick>` styled as a link, and a `<div role="dialog">` with no focus management. Each one *looks* fine. The student tries them with the keyboard (tab, enter, esc) and discovers they're all broken. The reveal: the correct fix is not "add more ARIA" but "use the native element." The student edits each to its semantic version and the keyboard contract starts working without adding a single ARIA attribute.

**Engagement.** The sandbox carries assessment in-line (each widget either works under keyboard or doesn't), confirmed by a `Sequence` after: order the four steps of the "fix this widget" reflex — *(1) does a native element do this? (2) if yes, use it; (3) if no, layer the role on a focusable native element; (4) test keyboard*. The sequence pins the priority order; the sandbox proves it.

**Components.**
- `ReactCoding` in target-match mode for the broken-widgets sandbox (the student rewrites each to a semantic equivalent; tests pass when keyboard events fire on the right element).
- `Sequence` for the reflex steps.

---

## Concept 7 — ARIA's load-bearing reaches: icon-only labels and the `sr-only` decision

**Why it's hard.** Once semantic HTML is in place the remaining ARIA is small but high-stakes — and `sr-only` vs. `aria-hidden` vs. `hidden` are easy to confuse. Students reach for `display: none` on icons (hidden from screen readers, the icon's meaning is lost on icon-only buttons) or stack `aria-label` *and* visible text (screen reader reads neither cleanly).

**Ideal teaching artifact.** A **decision tree with a live screen-reader transcript** (Decision archetype): one branching diagram asking "who needs to perceive this content?" with leaves `sr-only` / `aria-hidden` / `hidden` / native. Next to it, a small audio-free transcript panel showing what a screen reader announces for each of four canonical cases: an icon-only `<X />` button with no label, with `aria-label="Close"`, with an `sr-only` span child, and with a decorative `<Mail />` next to "Send" with and without `aria-hidden`. The transcript is the artifact — it makes the abstract attribute tangible.

**Engagement.** A `Matching` round: four code snippets on the left (icon-only button, decorative icon, skip-link target, visually hidden help text); four screen-reader announcements on the right. Links them, confirming the student can predict what each reach produces.

**Components.**
- Hand-SVG-inside-`Figure` for the decision tree (single-use, no forward-link beyond Chapter 7.3, demoting bespoke widget to alternative).
- New small component: **`ScreenReaderTranscript`** — a labeled panel showing what NVDA/VoiceOver would announce for a given snippet; reusable any time a lesson contrasts ARIA reaches. Forward-links to Chapter 7.3 (forms, `aria-invalid` / `aria-describedby` announcements), Chapter 11.1 (list-view announcements), Chapter 4.11.3 itself for live-region examples in Concept 8.
- `Matching` for the snippet-to-announcement round.
- Alternative: skip the bespoke transcript and use plain prose blocks styled as transcript-quotes if the build cost is too high; the matching round still works.

**Project link.** 4.12.5's mobile drawer close button is an icon-only `<X />` in a `SheetTrigger` — the canonical case this concept fixes.

---

## Concept 8 — Live regions and the pre-mount rule

**Why it's hard.** Live regions are the load-bearing ARIA surface for async UIs and they have a non-obvious failure mode: a region that *appears* in the DOM with its content already inside does not reliably announce. The mental model required is that screen readers *monitor* a region — they don't react to its first mount. Without seeing this, students write `{error && <div role="alert">{error}</div>}` and silently lose announcements.

**Ideal teaching artifact.** A **side-by-side announcer simulator** (Mechanics archetype, two paragraphs because the failure mode needs both visualization and the polite/assertive distinction). Left pane: the broken pattern — a button toggles an error state, the `<div role="alert">` mounts with content, and the simulated screen-reader transcript stays silent. Right pane: the fixed pattern — the `<div role="alert">` is always mounted (empty), the button injects content, and the transcript reads the message. The student toggles the button and watches both transcripts in parallel; the difference is the lesson.

A second beat layers the polite/assertive cut: a second control flips `aria-live` between `polite` and `assertive` on a routine status update ("Saved"), and the simulator demonstrates that `assertive` interrupts a synthetic in-flight announcement. The student learns the rule by feeling it — polite by default, assertive only for genuine errors.

**Engagement.** A `MultipleChoice`-with-two-correct round after the simulator: "which of these live-region setups will reliably announce?" with four code snippets, two correct (pre-mounted regions, `role="status"` for routine state) and two broken (conditional mount, `role="alert"` for routine state). The student must select both correct ones.

**Components.**
- Extends **`ScreenReaderTranscript`** from Concept 7 into a controlled, paired-pane simulator — same component, now driven by toggleable state. The single-component-with-evolving-capability is intentional: the v1 transcript and the simulator share rendering surface.
- `MultipleChoice` (multi-select mode) for the post-simulator quiz.

---

## Concept 9 — Modal focus trap and route-change focus

**Why it's hard.** Two distinct focus problems share one teaching moment because they share one mental model: focus has a location and it is the engineer's job in a SPA. The modal trap is *solved by Radix* — the student must recognize what the primitive is doing so they don't break it. The route-change reflex is *not solved by Next.js* — the student must write it themselves. Both are invisible to a sighted mouse user, which is why they get skipped.

**Ideal teaching artifact.** A **focus-shadow walkthrough** (Concept archetype, two paragraphs): a static-but-scrubbable scene where a small UI (header with nav, a "Delete" button, a dialog) renders with a visible "focus ring" overlaid on whichever element holds focus. The student scrubs through steps — click "Delete" (focus is on the button), dialog opens (focus moves to dialog), Tab three times (focus cycles inside, never reaches the header), press Esc (dialog closes, focus returns to the button). The scrubbing is the artifact; the visible shadow makes invisible state visible.

A second beat repeats the form for route change: scrub through a `<Link>` click — focus is on the link, the new page mounts, focus is *still on the (now-unmounted) link*, the next Tab does something arbitrary. Then re-scrub the same sequence with a `<RouteFocus />` component active — focus moves to the new page's `<h1 tabindex="-1">` on mount. The contrast is the lesson.

**Engagement.** A `CodeReview`-style pass: the student reviews a small PR that adds a custom dialog (not using Radix). Three problems are present (no focus on open, no Esc handler, no return focus). The student leaves inline comments naming each — graded against a short kernel rubric. The exercise locks in the contract by making the student *name* the violations.

**Components.**
- `DiagramSequence` with hand-SVG frames showing focus location at each step — exists, recurs everywhere focus is taught.
- `CodeReview` for the dialog-PR review.
- Alternative if `DiagramSequence` feels too static for the live-feel goal: the same sequence in a small interactive widget where the student presses simulated Tab/Esc keys and the focus indicator moves. Demoted because the static scrub already teaches the contract and the widget would be single-use.

**Project link.** 4.12.5 ships the mobile drawer with `Sheet` (focus trap, Esc, return focus) and 4.12.4 ships the theme toggle inside a header that participates in tab order — the walkthrough is the model behind both.

---

## Concept 10 — Four states, one discriminated union

**Why it's hard.** Students design the populated state and bolt on loading/empty/error at QA — the standard `if (loading) ... else if (error) ...` chain reflects this and produces ordering bugs and orphaned states (loading-with-stale-data). The senior fix is structural: a discriminated union forces every state to be named once and rendered once. Without it the four-state contract degrades into ad-hoc booleans by week three of a real project.

**Ideal teaching artifact.** A **broken three-booleans sandbox with a refactor target** (Pattern archetype). The student lands on a `DataPanel` driven by `isLoading`, `isError`, and `data` — three independent booleans. The component renders four scenarios via a small toolbar (load fresh, load empty, load error, refetch with stale data). The student clicks through and discovers two visible bugs — the empty state renders while loading (wrong order), and the refetch state blanks the populated UI back to a skeleton (lost intermediate state). They then refactor to a discriminated-union `state` field and watch every scenario render correctly. The artifact is the refactor; the bugs are the motivation.

**Engagement.** The sandbox carries assessment in-line — the refactored code must pass the four scenarios. A follow-up `Sequence` confirms recall: order the four states a senior designs ("populated, loading, empty, error") and then the second cut ("which announces via `role="status"`? which announces via `role="alert"`? which gets a `Skeleton`? which gets an `Empty` with CTA?") via a short `Matching` round.

**Components.**
- `ReactCoding` in tests mode for the refactor sandbox; tests assert each of the four scenarios renders the right markup and announces correctly.
- `Sequence` and `Matching` for the recall round.

**Project link.** Chapter 11.1 builds on this directly (URL-state list views with full data lifecycle); 4.12 does not exercise all four states (the surface is static), but the discriminated-union mental model gets first reach here so it's cheap by 11.1.

---

## Component proposals

- **`TokenPlayground`** — sliders for `--background`, `--foreground`, `--primary`, `--primary-foreground`, `--muted`, `--border` driving a small panel of live shadcn primitives, with inline contrast-ratio readouts per text/surface pair and a `.dark` toggle that flips to the dark palette.
  - **Uses in this chapter:** Concept 4.
  - **Forward-links:** Chapter 4.2.5 (semantic tokens), Chapter 4.3.4 (three-tier token model), Chapter 17.2 (compliance baseline), reusable any lesson that wants to demonstrate token-driven design.
  - **Leanest v1:** six sliders, three primitives (`Button`, `Card`, body text on a surface), one contrast readout, no dark toggle — adding the dark toggle is the second build step but the core teaching point (contrast is a property of the theme) lands with light alone.

- **`ScreenReaderTranscript`** — a labeled panel that renders a synthetic NVDA/VoiceOver announcement for a given snippet of JSX/HTML. Accepts a snippet input and a "play" trigger; in the simulator variant (Concept 8) it accepts paired inputs and a state toggle.
  - **Uses in this chapter:** Concept 7 (static, per-snippet) and Concept 8 (paired-pane simulator with state toggle).
  - **Forward-links:** Chapter 7.3 (form validation announcements with `aria-invalid` / `aria-describedby`), Chapter 11.1 (list-view "showing N results" announcements), Chapter 17.1 (error-boundary announcements).
  - **Leanest v1:** a static transcript panel that takes a pre-authored announcement string per snippet — no real screen-reader integration, the author writes what the screen reader would say. The simulator (Concept 8) layers a state toggle and paired panes on top.

## Build priority

`ScreenReaderTranscript` carries the most teaching load — it appears in two concepts here, evolves cleanly from static panel to controlled simulator, and forward-links into three later chapters where ARIA-driven announcement is the lesson. Build the static v1 first; the simulator variant is a small extension once the rendering surface is in place.

`TokenPlayground` is the second build. It is single-chapter for direct usage but the forward-links into 4.2.5, 4.3.4, and 17.2 are credible — semantic tokens recur every time the course audits design or compliance. The leanest v1 (six sliders, one contrast readout, no dark toggle) is dramatically thinner than the full proposal and still teaches the centralization point; build v1 and only extend if 17.2 reaches for it.

## Open pedagogical questions

- Concept 8's pre-mount rule depends on a synthetic screen-reader announcer being convincing enough to land the difference between mounted-empty and conditional-mount. If `ScreenReaderTranscript` v1 ships as a static author-written panel, the simulator's "I toggled and heard nothing" punch is weaker than a real announcer would give. Decision: is the synthetic panel enough, or does the chapter need a real `aria-live` echo region wired to the simulator?
- Concept 4's contrast readouts assume an OKLCH-aware contrast formula in the playground (WCAG 2.2 uses APCA-adjacent thresholds in practice, though 2.2 AA still cites the older formula). Worth confirming which contrast formula the readouts compute before build.

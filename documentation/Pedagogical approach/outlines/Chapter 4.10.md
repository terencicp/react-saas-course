## Concept 1 — Custom hooks share code, not state

**Why it's hard.** Students who learned hooks as "stateful primitives" assume calling `useCounter()` in two components synchronizes the counters. The right model is that a custom hook is a recipe re-executed per consumer — same wiring, independent state slots. Without this, students reach for custom hooks expecting global behavior and reach for context or stores expecting isolation.

**Ideal teaching artifact.** A side-by-side **two-instance comparator** (Concept archetype). The student sees the same `useCounter` hook called inside two `<Counter />` cards rendered next to each other. A row of buttons increments each independently; a "decompose" toggle reveals the per-instance `useState` slot underneath each card, so the student literally sees two separate state cells light up. A second toggle re-runs the same scene with a *lifted* state hoisted into a parent — both counters now move together — making the contrast explicit: shared code, separate state vs. shared state via lifting.

**Engagement.** After the comparator, a `MultipleChoice` asking "two components each call `useLocalStorage('draft', '')` — what happens when one writes?" with distractors covering the global-share misconception, the cross-tab `storage` event nuance, and the correct independent-but-keyed-by-`localStorage` answer.

**Components.**
- Primary: new component `HookInstanceCompare` — renders two consumer cards calling the same custom hook with a reveal panel showing each instance's internal hook slots, and a toggle that lifts state into a shared parent. Earns its bespoke status via the forward-link weight: the same "isolation vs sharing" visual recurs for context in Unit 4 review, Zustand vs hook in Unit 16, and TanStack Query's per-component cache identity in Chapter 11.
- Alternative: a hand-SVG inside `Figure` showing two component trees with their own state cells, paired with a static `ReactCoding` block running both counters. Loses the live toggle but keeps the contrast.

**Project link.** The 4.12 project consumes `useLockBodyScroll` once, but the mental model lands when the student understands that wrapping the hook in a parent `<MobileNav>` doesn't accidentally leak overflow lock to siblings.

---

## Concept 2 — When extraction earns its weight

**Why it's hard.** The "DRY reflex" trained into juniors says any repeated three-line block becomes a function. Custom hooks compound that reflex: students wrap `useState(false)` in `useToggle` and call it cleanup. The senior threshold has three conditions (reuse with non-trivial wiring, clarity inside a tangled component, or external-system encapsulation) — none of which is "I typed this twice."

**Ideal teaching artifact.** A **decision-gauntlet** (Decision archetype). The student is shown six candidate extractions, one card at a time, each a short code snippet: `useToggle` wrapping a two-line `useState`, `useIntersection` encapsulating an `IntersectionObserver` ref+effect+state, a 40-line component with three intertwined effects ripe for `useDashboardWidgets`, a "hook" that calls no hooks and just returns a number, etc. For each, the student picks *extract* or *inline* before the verdict and the matching threshold condition (or anti-pattern) is revealed.

**Engagement.** The gauntlet itself is the assessment. A short follow-up `Buckets` sort confirms recall by placing the six candidates into three bins: *reused-non-trivial / clarifies-tangle / encapsulates-external* vs. *premature*.

**Components.**
- Primary: `MultipleChoice` cards in sequence, one per candidate, each with an explainer that names the matched threshold condition.
- Follow-up: `Buckets` for the bucket-sort.
- Alternative: a single `Buckets` with all six candidates dropped into four bins (the three conditions plus "leave inline"); cheaper but loses the predict-then-reveal beat.

---

## Concept 3 — The canonical custom-hook shape

**Why it's hard.** Once a student decides to extract, the shape choices (tuple vs. object return, when to take a callback, how to type the generic, how to handle a callback dep without forcing the consumer to memoize) are where hooks become either ergonomic or hostile. The non-obvious one is the `useEffectEvent`-inside trick: without it, a hook that accepts a callback re-fires its internal effect on every parent render because the callback identity changes.

**Ideal teaching artifact.** Two beats. First, a **shape-comparator panel** (Pattern archetype): a single hook — `useFetch` — shown four ways across tabs (tuple return, object return, with and without generics). Each tab shows the call site below so the student sees how the shape reads at the consumer end; the prose names which fits when.

Second, a **broken-by-default `useOnClickOutside` repair**. The student sees a `useOnClickOutside(ref, handler)` hook in a runnable editor, with a `console.count('effect ran')` inside the effect. The parent re-renders every second and the counter climbs every tick. The student's job is to wrap `handler` with `useEffectEvent` and watch the counter freeze. The fix is one line; the lesson is the failure mode.

**Engagement.** The repair exercise is itself the assessment for the callback trap. For the shape choices, a short `Dropdowns` over a code skeleton: "this hook returns `data`, `loading`, `error` — pick `[…]` / `{…}` / `<T>`" with the consumer call site visible so the student picks based on call-site readability.

**Components.**
- Primary: `TabbedContent` (or `CodeVariants` if the four tabs are pure code) for the shape comparator.
- Primary: `ReactCoding` in target-match mode for the `useOnClickOutside` repair — pre-seeded with the bug, success criterion is the counter staying at 1 after parent re-renders.
- `Dropdowns` for the shape choice.

**Project link.** `useLockBodyScroll` in 4.12 has no callback prop, but the *generic shape* discipline (verb-free naming, single signature held across the codebase) lands when the student adds it to a hooks barrel that will hold more in later projects.

---

## Concept 4 — What the compiler auto-memoizes

**Why it's hard.** Students arrive with one of two priors: either "the compiler is magic, I don't need to think about memoization at all" or "compilers can't actually understand my code, I'll keep my `useMemo`s." Both miss the contract: the compiler auto-memoizes a specific, listable surface — derived values, object/array literals as props, inline callbacks, provider values, and JSX subtrees — by inserting compiler-managed memo slots that behave identically to manual wrappers. It is not magic; it is a known transform.

**Ideal teaching artifact.** A **before-and-after diff viewer** (Concept archetype). The student sees a small component on the left with three obvious memoization opportunities (a derived `filteredItems`, an inline `<Child config={{ theme }} />`, an inline `onClick`). On the right, the compiled output reveals the auto-inserted memo slots — values cached, references stabilized — annotated with which compiler rule fired for each. Toggling rows on the left (e.g., changing a dep) lights up which slots invalidate on the right, so the student watches the memoization decision graph live, not as folklore.

**Engagement.** A `Tokens` round over a fresh component: the student clicks every expression the compiler will auto-memoize, with decoys for things the compiler does *not* touch (effect bodies, ref reads, hook-internal state).

**Components.**
- Primary: new component `CompilerDiff` — left pane shows source, right pane shows the compiled memoization sketch, with annotation chips on each auto-memoized site. Worth proposing — recurs in Concept 5 (skipped components reveal *nothing* on the right) and forward-links to 20.3 Profiler work.
- Fallback: a static `TabbedContent` with three tabs (source / compiled / what-changed-when) and a hand-SVG annotation overlay, plus `Tokens` for the assessment.

---

## Concept 5 — The compiler is the messenger

**Why it's hard.** When the compiler skips a component, students blame the compiler. The actual cause is a purity violation the manual-memoization codebase had been papering over — a mutation during render, a side-effectful initializer, a conditional hook call. The mental shift is to treat the missing `Memo ✨` badge as *diagnostic output*, not a bug report.

**Ideal teaching artifact.** A **three-component clinic** (Pattern archetype). Three small components are displayed, each with a subtle rules-of-React violation — one mutates a prop, one pushes to a module-level array during render, one calls a hook inside an `if`. Each is shown alongside its DevTools Components-panel screenshot: two are missing the `Memo ✨` badge; one shows a console warning. The student's job is to read each pair and write the diagnosis: *what's the violation, and what's the fix?* The hook turn is realizing the compiler skipped them on purpose; the fix is never `'use no memo'`.

**Engagement.** A `Matching` exercise: three component snippets on the left, three purity-violation labels on the right (mutation-during-render / hooks-out-of-order / side-effectful-render). After matching, a follow-up `TrueFalse` round on the messenger framing — including the trap "`'use no memo'` fixes the underlying issue" (false).

**Components.**
- Primary: `Figure`-wrapped paired panels (source + DevTools screenshot mockup as hand-SVG or static image) for the three clinic cases.
- `Matching` for the diagnosis pairing.
- `TrueFalse` for the messenger-mindset confirmation.

---

## Concept 6 — The four cases manual memoization still earns

**Why it's hard.** After the compiler lesson, students over-correct: "delete every `useMemo`." The four residual cases are narrow but real — a `useEffect` dep that needs reference stability, a library that reads by reference equality, a measured-expensive computation the compiler skipped, a leaf component on a truly hot path needing a `React.memo` guarantee — and missing any of them produces real bugs (re-subscription thrash, broken integrations, frame drops).

**Ideal teaching artifact.** A **case-by-case scenario walkthrough** (Decision archetype). Four small vignettes, each presenting a real symptom first: an SDK re-subscribing every render, `react-hook-form` `watch` callbacks firing wrong, a Profiler trace showing 40ms in a fuzzy-match every render, a virtualized list dropping frames. For each, the student is shown the code without the manual wrapper and asked: *would the compiler save you here?* The reveal walks through why not — the reference-equality contract crosses the compiler's analysis boundary — and lands the targeted `useMemo`/`useCallback`/`memo` with the mandatory comment naming the consumer.

**Engagement.** A `Buckets` exercise sorting eight code samples into *manual memo still earns it* vs. *delete, the compiler handles it*, with the four canonical-case examples mixed among four 2020-reflex distractors. Sorting wrong on a distractor is the cheap miss; sorting wrong on a real case is the dangerous one — the explainer marks the distinction.

**Components.**
- Primary: `DiagramSequence` of four scenario panels, each with symptom → diagnosis → fix.
- Primary: `Buckets` (two-column) for the residual-vs-cut sort.
- Optional: a single `ReactCoding` exploration on case 2 (library integration) so the student writes the `useMemo` wrap themselves and confirms the integration unbreaks.

---

## Concept 7 — The cuts: what to stop hand-tuning

**Why it's hard.** This is the politically loaded part of the chapter. Students who have invested in `useMemo`-everywhere discipline read "stop" as criticism, and students migrating legacy code don't know where to start. The cuts cover four reflexes: blanket `useMemo` / `useCallback` / `memo`, premature `dynamic()`, and blanket `<Suspense>` boundaries. Each was a defensible 2020 default; each is now noise.

**Ideal teaching artifact.** A **2020-vs-2026 codebase diff** (Pattern archetype). A single 60-line component file is shown in two panels: the 2020 version dripping with `useMemo`, `useCallback`, `React.memo`, a `dynamic(() => import('./Modal'))` import, and a `<Suspense>` around a 2KB child. The 2026 version is the same file with every cut applied — same behavior, half the lines. The student reads them side by side; each removed wrapper carries a margin annotation naming the reason ("compiler handles", "modal is 2KB, dynamic round-trip costs more than it saves", "Suspense belongs at route segment, not child"). The intent is *catharsis*: showing how much ceremony was actually noise.

**Engagement.** A `CodeReview` exercise: a PR diff where a junior has added `useMemo` "for safety" to four spots. The student leaves an inline comment on each explaining whether it stays or goes, graded against the kernel "names the residual-case condition or names the cut."

**Components.**
- Primary: `CodeVariants` with two tabs (2020 / 2026) for the diff, prose between them carrying the cut rationale.
- Primary: `CodeReview` for the active assessment.
- Alternative: `AnnotatedCode` walking the 2020 file one cut at a time — slower and more scripted, useful if the diff comparison feels too dense.

---

## Concept 8 — The measure-then-memoize workflow

**Why it's hard.** Even after the cuts and the four cases, students will still memoize *speculatively* — adding a `useMemo` because a function "looks expensive" instead of because a Profiler trace named it. The discipline is the order: enable the compiler, profile, find a measured hot spot, apply the targeted escape hatch, write the one-line comment that documents the cause. Without the comment, the next reader assumes 2020 reflex and deletes — and the integration breaks again.

**Ideal teaching artifact.** A **migration script** (Pattern archetype, Setup-flavored). A `Steps`-driven walkthrough of converting one file from manual-memoization to compiler-managed: (1) flip annotation mode on, (2) add `'use memo'` to the file, (3) load DevTools and confirm the `Memo ✨` badges appear, (4) delete the `useMemo`/`useCallback`/`memo` ceremony, (5) re-profile and confirm renders are stable, (6) leave behind only the comment-annotated residual cases. Each step shows the file's state and the DevTools panel state side by side, so the student sees the badge appear, the wrappers vanish, and the profile flatten in sequence.

**Engagement.** A `Sequence` drill: six steps from the workflow in scrambled order, plus two decoys ("delete all manual memo first" and "turn on full coverage immediately on the legacy codebase"). The student drags into the correct senior order. The decoys are the common shortcuts that bite.

**Components.**
- Primary: `Steps` with paired file/DevTools panels per step (DevTools panels as static `Figure` mockups or hand-SVG sketches of the Components panel showing the badge).
- Primary: `Sequence` for the workflow drill.
- Optional: `Aside` callout reinforcing the comment-discipline rule with a one-line template.

---

## Component proposals

- **`HookInstanceCompare`** — renders two consumer cards calling the same custom hook side by side, with a togglable reveal showing each instance's state slots and a second toggle that lifts state into a shared parent for contrast.
  - Uses in this chapter: Concept 1.
  - Forward-links: 4.9.5 context-vs-hook recap, Unit 16 (Zustand vs hook isolation), revisits whenever "shared code, separate state" needs to be re-anchored.
  - Leanest v1: two hardcoded `<Counter />` instances using one `useCounter` hook, a single toggle switching between "two instances of the hook" and "one lifted state in a parent." Skip the auto-decompose state-slot reveal in v1 — describe it in prose. Still teaches the misconception.

- **`CompilerDiff`** — side-by-side source/compiled panes with annotation chips marking each auto-memoization site, and dep-edit controls that light up which compiler memo slots invalidate.
  - Uses in this chapter: Concept 4 (primary), Concept 5 (the "skipped — no chips" variant), Concept 7 (the residual chips on the 2026 panel).
  - Forward-links: Chapter 20.3 (Profiler), any future React Compiler deep dive; the visual of "what the compiler did to my code" recurs whenever auto-memoization behavior matters.
  - Leanest v1: static two-pane diff with annotation chips, no interactive dep-edit. The chips alone teach the surface; the live invalidation is a v2 upgrade. Authored as compiled-output-shaped pseudo-code, not real compiler output.

## Build priority

`CompilerDiff` is the heavier teaching investment but pays back across three concepts in this chapter (4, 5, 7) and forward-links into Profiler work in Chapter 20.3 — build it first, even at v1 fidelity. `HookInstanceCompare` is narrower in this chapter (one concept) but its mental model — "same code, separate state" — is foundational enough that it will be re-referenced whenever isolation-vs-sharing comes back up; build v1 (two counters + lift toggle) and resist scope creep on the state-slot reveal.

## Open pedagogical questions

- Concept 5's DevTools-screenshot mockups could be real captured screenshots or hand-SVG approximations. Real screenshots age faster (DevTools UI shifts); SVG approximations stay correct but lose the "this is the actual tool you'll use" anchoring. Default to SVG with a note, but worth a deliberate call.
- Concept 7's `CodeReview` assumes the AI-graded `kernel` can reliably distinguish "names the residual case" from "names the cut" with the same prompt. If grading proves noisy, fall back to a `MultipleChoice` per diff hunk.

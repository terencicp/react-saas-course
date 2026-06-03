# The React Compiler

- Title: The React Compiler
- Sidebar label: The React Compiler

## Lesson framing

This is the conceptual pivot of the chapter's compiler arc. Lesson 1 foreshadowed it in one Aside; lesson 3 ("Memoization as escape hatch") spends the *whole* lesson on the four residual cases. This lesson sits between: it lands **what the compiler is, what it does, how to turn it on in Next.js 16, and how to confirm it's working** — but stops short of the manual-memoization threshold discussion (that's lesson 3) and the Profiler at depth (Chapter 094).

The senior framing from the chapter outline drives the whole lesson: **memoization is no longer something the engineer writes.** The student arrives having been told twice already that the compiler "retires most manual memoization" (ch023 L1) and that the purity contract is "why the React Compiler depends on it" (ch023 L3). This lesson cashes those promissory notes. It is not a "new API to learn" lesson — there is almost no API surface. It is a **mental-model + config + verification** lesson. The deliverable mindset: by the end the student can enable the compiler on a Next.js 16 project, articulate what it auto-memoizes, read the `Memo ✨` badge, and understand why a purity violation makes the compiler skip a component rather than break it.

Pedagogical spine, optimizing for low cognitive load:

1. **Lead with the pain, then the relief.** Open on the 2024-era codebase drowning in `useMemo`/`useCallback`/`memo` — the senior question. The student has *just* learned (ch023–025) about render triggers, `Object.is` on props, inline-literal identity churn, and provider re-render storms. The compiler is the thing that makes all that manual defense unnecessary. Frame it as deletion, not addition.
2. **Simplified model first, then complexity.** Start with one sentence: "the compiler reads your components at build time and inserts the memoization you'd have written by hand." Then layer: *what* it memoizes (four concrete cases the student already recognizes from ch023/024/025), *how* it's plumbed (SWC picks files, Babel transforms), *what it refuses to touch* (effects, rules of hooks, impure code).
3. **It's a build-time tool, not a runtime one.** The single most important corrected misconception: the output is *ordinary memoized React*, not a runtime engine. Nothing magical ships. Reinforce with the "explicit over magic" course value — the student opts in deliberately and understands the transform.
4. **The compiler is a messenger, not a magician.** The second key reframe: when the compiler skips a component, that's a *signal* about a latent purity bug, not a compiler failure. This connects directly back to ch023 L3's purity contract — the price of admission. Teach the student to treat a missing badge as "audit my code," never "the compiler is wrong."
5. **Two subtle traps that separate a junior from a senior here.** (a) The `Memo ✨` badge means "processed," not "never re-renders" — an unstable prop reference flowing *in* from an un-compiled or skipped parent still causes re-renders. (b) The compiler optimizes *within* a component; it can't fix a parent above its visibility that keeps churning identity. Both are confirmed by current (June 2026) docs and are exactly where beginners misread the tool.

Cross-references to honor (recap concisely, do not re-teach): purity contract + DevTools badge (ch023 L3), render triggers and `Object.is` on props (ch023 L1), inline literals as identity churn (ch023 L1), provider value re-render storm (ch025 L5), `useEffectEvent` non-reactive seam (ch025 L3), rules of hooks + the two ESLint rules (ch025 L8), refs as a normal prop in React 19 (ch024 L5, ch023). Forward-refs (do not teach): manual-memoization thresholds and `dynamic()`/`<Suspense>` cuts (lesson 3 of this chapter), Profiler at depth (Chapter 094), shadcn/Better Auth/Drizzle/TanStack compatibility (named only, those chapters own depth).

Tone: adult, terse, decision-first per the pedagogical guidelines. No celebratory "isn't this amazing." The win is framed as *less code to write and maintain*, which is the senior value. Keep code samples minimal — this lesson's "code" is mostly two config snippets and a few tiny before/after component fragments that the student can already read. The heavy lifting is done by one diagram, one render-tracking widget, and one decision-walker for the verification workflow.

## Lesson sections

### Introduction (no header)

Open with the senior question, concretely. A 2024 React codebase: every derived value wrapped in `useMemo`, every handler in `useCallback`, every leaf in `React.memo` — and it *still* re-renders too much because the wrapping has gaps and one inline `style={{...}}` prop tanks a whole subtree. Name the cost: this hand-tuning is noise the engineer writes, reads in review, and maintains forever. Then the turn: the React Compiler — stable since React Compiler 1.0 (Oct 2025) and a stable Next.js 16 config option — reads components at build time and inserts that memoization automatically, at the boundaries that actually matter.

State the lesson goal plainly: by the end you can enable the compiler on a Next.js 16 project, say what it does and doesn't do, and verify it in DevTools. Connect to prior knowledge in one or two sentences — the student has spent ch023–025 learning *why* renders happen (the three triggers, `Object.is` on props, identity churn) and how to defend against waste manually; this lesson is where that manual defense gets handed to the compiler. Keep it to ~3 short paragraphs. End on the mental shift one-liner: **memoization stops being something you write.**

No `Aside` needed here; the framing carries it.

### What the compiler actually does

The core mental model, taught simplest-first. Three beats:

1. **One-sentence model.** "The React Compiler is a build-time tool that analyzes your component and hook bodies and inserts memoization equivalent to the `useMemo` / `useCallback` / `memo` you would have written by hand." Establish *build-time* immediately.
2. **The output is ordinary React.** The most important correction: nothing magical runs at runtime. The compiler rewrites your source into regular memoized code driven by its data-flow analysis; the runtime behaves exactly as if a human had memoized perfectly. Tie to the course's "explicit over magic" value — the transform is inspectable, deterministic, not a black box. This is where to pre-empt the "I don't trust auto-magic" junior reflex.
3. **Static analysis, not heuristics at runtime.** It traces which values feed which outputs and memoizes on that basis. The student doesn't need compiler internals — just the shape: inputs change → recompute; inputs stable → reuse the previous reference.

**Diagram — the build-time transform pipeline.** Use a `DiagramSequence` (provides its own card; do **not** wrap in `Figure`) with 3–4 steps showing one tiny component flowing through: (1) **your source** — a plain component with a derived value and an inline callback, no memoization; (2) **SWC selects** — Next.js's SWC pass picks this file because it contains JSX/hooks (greys out a non-React file beside it to show selection); (3) **Babel transforms** — the React Compiler's Babel plugin rewrites the body, with auto-inserted memo slots highlighted; (4) **shipped output** — "ordinary memoized React," same runtime behavior. Pedagogical goal: cement *build-time*, cement *SWC picks / Babel transforms* (the exact pipeline confirmed in current Next.js 16 docs), and kill the "runtime magic" misconception visually. Author the panels as plain HTML/CSS boxes inside each `DiagramStep` (per the diagrams INDEX, HTML+CSS is the pick for sequential phase strips). Keep each step's caption to one line. Cap height — this is a horizontal flow.

Code: the "your source" fragment in step 1 should be a 5–6 line component the student can read at a glance (a derived `total` from `items`, an `onClick` arrow). Show it as plain text inside the diagram box, not a live `Code` block, to keep the diagram self-contained. No annotation needed — the highlight in step 3 carries the focus.

### What gets auto-memoized

Make the abstract concrete by mapping each thing the compiler memoizes to a render-waste pattern the student *already met* in ch023–025. This is the "linking to prior knowledge" move — every item here is a footgun they were taught to fear, now neutralized. Present as a short tour (prose + a tight `Code` fragment per item, or a single `CardGrid` of four), covering:

- **Derived values in render.** The in-render computations from ch024 L2 ("derive, don't mirror") and ch025 L4. The compiler memoizes the expensive ones so re-deriving on every render is no longer a concern.
- **Object/array literals passed as props.** `<Child config={{ theme, size }} />` — the canonical inline-literal identity churn from ch023 L1 that re-renders the child every time. The compiler stabilizes the literal's reference when its contents are unchanged.
- **Callbacks defined in the component.** `<Child onClick={() => doThing(id)} />` — stable across renders when its captured deps don't change. This is the `useCallback` reflex, gone.
- **Provider values.** `<ThemeContext value={{ user, theme }}>` — the exact re-render storm from ch025 L5, where an unstable provider value re-renders every consumer. The compiler auto-stabilizes it. Call this out explicitly as the fix for that lesson's footgun.
- **JSX subtrees.** A subtree that doesn't depend on what changed gets reused rather than re-rendered.

**Interactive widget — `RenderTracking` with an `Implementation` toggle.** This is the centerpiece of the lesson and the best vehicle for "which boxes light up." Build a small tree: a parent `App` holding a counter, with a `<Sidebar>` child that receives an inline `config={{...}}` object prop (and renders an expensive-looking subtree). Two `Implementation` tabs:
  - **"Without the compiler"** (default): trigger `bump counter in App` → `renders="app,sidebar"` (the sidebar re-renders because the inline object prop is a fresh reference every render — identity churn).
  - **"With the compiler"**: same trigger → `renders="app"` only (the compiler stabilized the `config` reference, so `Sidebar` bails out).
Pedagogical goal: the student *sees* the asymmetry that the prose describes — the compiler's win is the boxes that stop lighting up. This component simulates counts from the author's mapping (note for the building agent: the render count is authored, not observed), which is exactly right for an illustrative before/after. Provides its own card; do **not** wrap in `Figure`. Place it immediately after the prose tour so the abstract list lands as a visible effect.

`Term` candidates in this section: **auto-memoization** (define inline: "memoization the compiler inserts, vs. memoization you write by hand"), **referential identity / reference equality** (re-explain concisely without breaking flow — "two objects with identical contents are still different references; `Object.is` says they differ" — student met this in ch023 but a refresher tooltip earns its place here).

### Enabling it in Next.js 16

The full wiring, taught as the deliberate senior opt-in ("explicit over magic" — you turn it on, you know what changed). Two steps only, so a `Steps` block is the right container:

1. Install the Babel plugin as a dev dependency: `pnpm add -D babel-plugin-react-compiler`. Explain in one clause *why a Babel plugin when Next.js is Rust/SWC-based*: the compiler itself runs as a Babel plugin, but Next.js wraps it in a custom SWC optimization that runs it only on files containing JSX/hooks — so you keep fast builds and don't compile everything. This is the exact mechanism in the current (June 2026) Next.js 16 docs and answers the obvious "wait, Babel?" question before it's asked.
2. Set `reactCompiler: true` in `next.config.ts`.

Show step 2 with a `Code` block (TS, the canonical `next.config.ts` shape with `NextConfig` typing per code conventions). That's the entire wiring for full-coverage mode — emphasize there is *no per-file annotation* needed for greenfield. State the senior default explicitly: **for a new SaaS project in 2026, full coverage from day one** (this matches the code-conventions rule that `reactCompiler: true` is the project default and "skip the manual reflex").

One `Aside` (note): build cost. The SWC-scoped path keeps the cost small and localized; a raw Babel-on-every-file setup (non-Next projects) is noticeably slower. Next.js's integration is why the senior reaches for it without worrying about build time. Keep to two sentences — this is a forward-ref-light aside, not a section.

Code-convention alignment to flag for the writing agent: `next.config.ts` uses `import type { NextConfig } from 'next'` and a typed `const nextConfig: NextConfig`, default-exported (framework-named file, the sanctioned default-export carve-out). Single quotes, 2-space indent, trailing commas.

### Incremental adoption for legacy codebases

Short section — recognition-level for this audience, since the course's projects are greenfield. The student should *know the mode exists and when it's for*, not drill it. Teach:

- **Annotation mode** via `reactCompiler: { compilationMode: 'annotation' }`. In this mode the compiler only touches functions that begin with the `'use memo'` directive. Show the config object and a 3-line component with `'use memo'` as its first statement. The use case: migrating a large legacy codebase — validate on a small audited subset, expand file by file, then flip to full coverage.
- The greenfield contrast, stated once: a new 2026 SaaS project skips annotation mode entirely and runs full coverage from the start.

Use `CodeVariants` here with two tabs — **"Full coverage (greenfield default)"** showing `reactCompiler: true`, and **"Annotation (legacy migration)"** showing the `{ compilationMode: 'annotation' }` object plus the `'use memo'` directive in a component. The A/B framing makes the "which do I pick" decision crisp in one glance; prose under each tab names the trigger (new project vs. migrating). This is the cleanest use of the component — same config file, two shapes, the decision is the lesson.

Note for the writing agent: the lesson-3 migration *workflow* (the file-by-file cleanup order) is owned by lesson 3 — here, only name annotation mode as the entry mechanism, do not walk the full migration sequence.

### What the compiler will not do

Critical boundary-setting section — prevents the student from over-attributing powers to the compiler. Frame as "the compiler has a narrow, well-defined job." Cover, each in a sentence or two:

- **It does not rewrite effects.** `useEffect` and its dependency array are untouched. The effect contract from ch025 L2 still holds in full.
- **It does not change the rules of hooks.** Top-level, same order every render — still the law (ch025 L8). The two ESLint rules stay on.
- **It does not eliminate dependency arrays.** You still write effect deps; the compiler doesn't infer them away.
- **It does not memoize impure code.** This is the hinge to the next section — if the analysis detects a Rules-of-React violation (mutation during render, a conditional hook call, a side-effectful initializer), it **skips** that component and emits a warning rather than producing wrong output.

Reinforce the division of labor with **`useEffectEvent`**: no conflict — `useEffectEvent` carves the non-reactive seam inside an effect (ch025 L3), the compiler handles memoization elsewhere; together they cover the two halves of the effect problem. One clause, recognition only.

And **refs**: React 19 made `ref` a normal prop (no `forwardRef`); the compiler reads components that take `ref` from props transparently. One clause — the student saw this in ch024 L5.

Consider a small **`Buckets`** exercise here (two columns: "The compiler handles this" / "Still your job"). Items to sort: inline object prop stabilization, effect dependency arrays, provider value stability, calling hooks in order, derived-value memoization, cleanup functions, callback prop stability, not mutating props during render. Pedagogical goal: force the student to actively draw the boundary the prose just set, catching the over-attribution misconception. Two-column classification is exactly what `Buckets` is for, and this is the highest-leverage place to check understanding before the "messenger" reframe.

`Term` candidate: **Rules of React** (define: "React's purity + hook-ordering contract — pure render, no mutation during render, hooks at the top level"; the student knows the pieces from ch023/ch025 but the umbrella term is worth a tooltip).

### When the compiler skips a component

The "compiler as messenger" reframe — the senior-mindset payload of the lesson. This is where a junior says "the compiler broke my component" and a senior says "the compiler found my bug." Teach:

- Codebases that "worked" only because manual memoization papered over impurity reveal their latent bugs under the compiler. A component that mutates a prop, an initializer that pushes to a module-level array, a render that calls a side-effectful function — the compiler refuses to optimize it and surfaces a warning.
- **Frame this as a feature, not friction.** The compiler is the messenger; the fix is the violation, not silencing the message. Connect explicitly to ch023 L3: the purity contract is *the price of admission* to auto-memoization. The student was told this would matter — here's where it does.
- **The `'use no memo'` escape hatch.** A directive at the start of a function body that tells the compiler to skip it. Reach for it *only* as a **temporary** escape while you fix the underlying violation (or for a confirmed compiler bug) — never a permanent waiver. Per code conventions: pair it with a `TODO` linking the issue. Make the watch-out sharp: `'use no memo'` silences the warning but ships the original (unoptimized, possibly buggy) behavior — treat it as a TODO, not a fix.

Show a tiny **before/after** with `CodeVariants` (two tabs): **"Skipped — mutates during render"** (a component that does `props.items.sort()` in the body — an in-render mutation, the violation) vs. **"Fixed — copy before sort"** (`[...props.items].sort()`). Prose under tab 1: "the compiler skips this and warns — the mutation is the bug." Prose under tab 2: "pure now; the compiler optimizes it and the badge appears." This makes the messenger concept concrete with a violation the student can already recognize as impure from ch023, and shows the *fix* is trivial and correct. Use `del=`/`ins=` markers or per-pane mark colors (red for the skipped pane, green for the fixed pane) to underline the one changed line.

Mention the **ESLint angle** in one sentence with a forward/lateral ref: the React Compiler's diagnostics ship as rules in `eslint-plugin-react-hooks` (v7), so violations like in-render mutation and bad memoization surface in the editor *before* you even check DevTools. (Per code conventions §Supply chain: `eslint-plugin-react-hooks@7.x` runs alongside Biome precisely because it carries the compiler diagnostics.) Recognition only — ch025 L8 owns the lint rules; don't re-teach.

`Term` candidate: **escape hatch** (define if not already a course-established term: "a deliberate, documented opt-out of a default — used sparingly, never as a habit").

### Verifying it's working

The senior workflow — the lesson's practical close. Two tools, two roles:

- **The `Memo ✨` badge (the contract).** Open React DevTools → Components panel. Auto-memoized components show a `Memo ✨` badge next to their name (the same badge manual `memo` produces — the student can't tell hand-written from compiler-inserted, which is the point). Badge present = the compiler processed the component.
- **The crucial nuance.** The badge means "the compiler *processed* this component," **not** "this component never re-renders." A component can carry the badge and still re-render every cycle if an **unstable reference flows into it as a prop** from a parent the compiler didn't (or couldn't) optimize. (This is confirmed in current React docs and is the single most common misread of the badge — teach it explicitly.) Tie back to the `RenderTracking` widget: the compiler stabilizes references it *owns*; it can't fix churn injected from above its visibility.
- **The Profiler (the proof).** React DevTools Profiler records a render and shows which components rendered and why. The senior loop: record an interaction → look for a component that rendered when its props didn't change → audit. **Recognition only** — name it as the proof tool and the workflow shape; Chapter 094 owns the full Profiler surface. Do not teach flame graphs or timings here.
- **A missing badge in compiled code is a signal, not a mystery.** No `Memo ✨` on a component you expected the compiler to handle = the file is being skipped (purity issue) — go audit, per the previous section.

**Decision widget — `StateMachineWalker` (`kind="decision"`).** A short diagnostic funnel: "I turned on the compiler — is it working?" Branches:
  - "Do components show the `Memo ✨` badge?" → No → "Is it just *some* components missing it?" → "those specific ones are skipped — audit for purity violations (mutation in render, conditional hooks)" / "none have it — check `reactCompiler` is set and `babel-plugin-react-compiler` is installed."
  - Yes → "Does a child still re-render when an unrelated parent state changes (check the Profiler)?" → Yes → "an unstable reference is flowing in from above — the compiler optimizes within a component, not churn injected from a parent it can't see." / No → "working as intended — the badge is the contract, the Profiler is the proof."
Pedagogical goal: encode the *order* a senior asks these questions (badge first, then Profiler, then locate the boundary), and route the two big misconceptions (skipped-on-purity, badge-doesn't-mean-no-rerender) to their correct diagnosis. The walker forces a committed path through the diagnostic rather than a wall of prose. Provides its own card; do **not** wrap in `Figure`. Each leaf names the concrete next action.

`Term` candidate: **Profiler** (define: "a React DevTools panel that records renders and reports which components rendered and why" — recognition support, since depth is deferred to ch094).

### Performance — what to actually expect

Short, expectation-calibrating section — pre-empts the "I turned it on and my app isn't 10× faster" disappointment, and reframes the real win. Cover:

- **Typical SaaS apps:** modest baseline wins — fewer wasted re-renders, snappier interactions (roughly 5–15% fewer re-renders is a reasonable expectation, not a guarantee). Frame as a range, hedged.
- **Apps with measurable wasted-render problems:** larger wins, because there's more waste to eliminate.
- **Already-hand-memoized apps:** little change at runtime — the compiler is doing what the human already did.
- **The real win is not always speed — it's the deletion of memoization ceremony.** This is the senior reframe and the bridge to lesson 3: the durable value is fewer lines to write, read in review, and maintain, plus the elimination of the gaps that hand-memoization always leaves. Performance is a bonus; *less code that's also correct* is the prize.

End the section (and lesson) with a one-line bridge to lesson 3: with the compiler carrying the default, the remaining question is *when does an engineer still reach for `useMemo` / `useCallback` / `memo` by hand* — the narrow escape-hatch surface, next lesson. Do not enumerate the four cases here (lesson 3 owns them).

Optionally a `VideoCallout` if the resourcer finds a current (2026), high-signal React Compiler talk or the React team's own explainer — placed in this section or as an external resource. Mark as optional: only include if a vetted video covering React Compiler 1.0 / Next.js 16 specifically exists; an outdated RC-era video is worse than none. Note for the resourcer: must post-date the 1.0 stable release (Oct 2025).

### External resources (optional)

`ExternalResource` cards for: the React docs "React Compiler" section (react.dev/learn/react-compiler), the Next.js 16 `reactCompiler` config page, and the React directives reference (`'use memo'` / `'use no memo'`). These are the canonical, current sources and let the student go deeper on config without bloating the lesson.

## Scope

**Prerequisites to recap briefly (do not re-teach):**
- Render triggers (own state / parent / context), `Object.is` on props, inline literals as identity churn — ch023 L1. One-line refreshers only; tooltips for reference equality.
- The purity contract and the DevTools badge as audit signal — ch023 L3. This lesson *uses* it as the price of admission; restate in one clause, don't re-derive.
- Provider value re-render storm — ch025 L5. Named as the footgun the compiler fixes; one sentence.
- `useEffect` lifecycle + dependency-array contract — ch025 L2. Named as untouched-by-compiler; no re-teaching.
- `useEffectEvent` non-reactive seam — ch025 L3. One clause, recognition.
- Rules of hooks + the two ESLint rules — ch025 L8. Named as untouched; the compiler-diagnostics-in-eslint-plugin-react-hooks point is recognition-only.
- `ref` as a normal prop in React 19 — ch024 L5 / ch023. One clause.
- What a custom hook is — ch026 L1 (just taught). If referenced, assume known; the compiler treats hooks like any function.

**Explicitly out of scope (reserved for later lessons):**
- The four cases where manual `useMemo` / `useCallback` / `React.memo` still earn their weight, their signatures, and the `memo` comparator — **lesson 3 of this chapter**. This lesson must not enumerate them; it ends by *pointing* at the question lesson 3 answers.
- What to stop hand-tuning (blanket memoization, premature `dynamic()`, blanket `<Suspense>`) and the measure-then-memoize workflow — **lesson 3**.
- The full migration workflow (file-by-file cleanup order, comment discipline for residuals) — **lesson 3**. This lesson names annotation mode as the entry mechanism only.
- React DevTools Profiler at depth (flame graphs, render timings, the full record-and-read workflow) — **Chapter 094**. Recognition only here: named as "the proof tool" with the basic loop shape.
- `dynamic()` / `next/dynamic`, bundle splitting, treemap analysis — **Chapter 094**. Not mentioned beyond the lesson-3 forward-ref.
- `<Suspense>` boundary placement — **Chapter 031**. Not touched.
- Server Component bundle elimination — **Chapter 030**. Not touched.
- Deep purity mechanics, Strict Mode double-invocation — **ch023 L3 / ch025 L1**. Recap the purity *requirement*; don't re-explain the mechanism.
- Rules-of-hooks indexed-slot internals — **ch025 L8**. Not re-derived.
- Library compatibility specifics (shadcn, Better Auth, Drizzle via Server Components, TanStack Query) — those chapters own them. This lesson may state in one sentence that the compiler is compatible across the 2026 stack and incompatibilities surface as warnings (not silent breakage), but does not detail any integration.

**Code-convention notes for the writing agent (deliberate divergences flagged):**
- No manual `useMemo` / `useCallback` / `React.memo` appears in any *recommended* sample — this lesson is the justification for that course-wide rule (code conventions §Hooks). The only memoization-shaped code shown is in the "what gets auto-memoized" mapping (illustrating the *before* the compiler removes) and the `'use no memo'` opt-out example.
- `next.config.ts` samples follow the conventions exactly: `import type { NextConfig }`, typed `const nextConfig`, default export (sanctioned framework carve-out), single quotes, 2-space indent, trailing commas.
- Component fragments use arrow-function-bound `const` components, typed props, and the React 19 ref-as-prop shape per conventions — but stay deliberately minimal (5–6 lines) for readability; downstream agents should not expand them into full production files.
- The impure-component example (`props.items.sort()` in render) is *intentionally* a violation for teaching — flag it clearly in prose as the anti-pattern, never as a shape to copy.

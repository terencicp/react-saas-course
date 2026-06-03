# Memoization as escape hatch

- Title: `Memoization as escape hatch`
- Sidebar label: `Memoization escape hatch`

## Lesson framing

This is the closing lesson of Unit 3's hook arc and the payoff of the chapter.
L1 taught custom hooks; L2 turned the React Compiler **on** and established that auto-memoization makes manual `useMemo`/`useCallback`/`memo` unnecessary by default.
L3 answers the question L2 deliberately deferred: *with the compiler on, when does a 2026 engineer still reach for manual memoization by hand — and which 2020-era performance reflexes should they delete entirely?*

The single mental model the student must leave with is the title: **memoization is an escape hatch, not a discipline.**
The default is no wrapper. A manual `useMemo`/`useCallback`/`memo` is a deliberate, *documented* reach justified by a cause the compiler cannot serve — never a reflex applied "for safety."

The hard part of this lesson is not the API.
The student may have seen `useMemo` in older tutorials or watched an AI agent emit it, and AI models trained on pre-compiler code will over-memoize.
The senior skill being taught is **recalibration of instinct + measurement discipline**: the reach is the exception, the cut is the rule, and "performance work" without a Profiler reading is decoration.
Frame this in production stakes throughout — the largest cleanup opportunity in a legacy SaaS codebase is deleting memoization ceremony, and every residual escape hatch that ships *must* carry a one-line comment naming its cause or the next reader (correctly) assumes a 2020 reflex and deletes it.

This lesson is also the **first and only** place in the course the student sees how to *write* `useMemo`/`useCallback`/`memo`.
The course convention (and L2) keep them out of every recommended sample, so the signatures get a compact, correct reference here — but framed as "the escape hatch you will rarely pull," never as a daily tool. Resist any temptation to make the syntax feel central.

The lesson splits into two pedagogically distinct halves, and the writer must signal the seam:
1. **The four memoization cases that still earn their weight** — concrete, teachable, each with a code example and its mandatory comment. This half is *taught*.
2. **The broader "stop hand-tuning" cut** — extends past memoization into `next/dynamic` and `<Suspense>`, which the student has **not** yet learned (Unit 4). This half is *recognition only*: name the reflex, name why 2026 defaults make it wrong, forward-ref where the right answer lives. Do not deep-teach App Router primitives here.

Reconciliation note for downstream agents: the canonical code convention (`Code conventions.md` "Hooks and the React Compiler") names **three** reach-cases — (a) measured bottleneck, (b) referential equality required by a third-party hook, (c) precise control the compiler can't infer.
The chapter outline names **four**. They are the same surface: this lesson teaches the four (they are more concrete) and the writer should map them onto (a)/(b)/(c) so the lesson and the convention never appear to disagree. Cases 1 and 2 below are both flavor-(b); case 3 is (a); case 4 is (c).

Tone: adult, terse, decision-first, no celebratory framing (per pedagogical guidelines). Keep cognitive load low — establish the mental shift before any syntax, then the four cases one at a time, then the cut.

## Lesson sections

### Introduction (no header)

State the lesson goal and the senior question implicitly, warmly and briefly (3–5 sentences).
Hook: the compiler is on (L2) and you have stopped writing `useMemo`/`useCallback`/`memo` everywhere — so is manual memoization gone for good? No. There is a narrow residual surface where you still reach for it by hand, and a larger pile of older performance habits you should now actively delete.
Connect to what they know: L2's auto-memoization (five cases), the purity contract (ch023) as the compiler's price of admission.
Preview the payoff skill: by the end the student can look at any `useMemo`/`useCallback`/`memo` in a 2026 codebase and decide *keep with a comment* or *delete*, and knows the measure-then-memoize order that gates the reach.

### Memoization went from discipline to escape hatch

The organizing idea, established **before** any syntax so it frames everything after.

Content:
- Name the historical shift plainly. Pre-compiler React performance work was a *discipline*: wrap every derived value in `useMemo`, every handler in `useCallback`, every leaf in `memo`, and try never to re-render unnecessarily. The wrapping was constant and the brain wrote ceremony instead of code.
- 2026: the compiler does that work (recap in one line — it auto-memoizes derived values, object/array literal props, in-component callbacks, provider values, and JSX subtrees; cross-ref L2). So manual memoization is now an **escape hatch**: a deliberate, documented opt-out you reach for when you need a *specific* guarantee the compiler cannot provide.
- Define the rule crisply: **the default is no wrapper; the reach is justified by a measured or contractual cause, and it carries a comment.** This sentence is the spine of the lesson — state it explicitly and refer back to it.
- Reuse the chapter's `Term`-style phrasing if helpful: an "escape hatch" is a deliberate, documented departure from the default, not a habit.

Visual — **simple two-column figure** (HTML + CSS inside `<Figure>`, per the diagrams INDEX "annotated illustration / color-coded segments" row; low effort, high clarity). Left column "2020 reflex — memoization as discipline": a stack of chips (`useMemo` everywhere, `useCallback` on every handler, `memo` on every leaf, `dynamic()` for anything 'heavy', `<Suspense>` around everything). Right column "2026 default — escape hatch": mostly empty with a single small chip ("reach only on a measured/contractual cause + comment"). Pedagogical goal: the *visual emptiness* of the right column is the lesson — the recalibration is felt, not just read. Keep under ~400px tall.

### The four cases where manual memoization still earns its weight

The taught core of the lesson. Open by stating these are the *entire* residual surface — if a manual memoization isn't one of these four, it's dead weight. Then teach each case as its own `### h3` subsection (below) so each gets a focused code example and the comment discipline is shown inline, not summarized.

Before the subsections, place the **decision walker** as the spine of senior reasoning here. Use `StateMachineWalker` (`kind="decision"`, the default — it is purpose-built for "trigger before tool" and forces the *order* the senior asks questions in). Do **not** wrap in `<Figure>`.
Walk:
- Root question: "You're about to write `useMemo`/`useCallback`/`memo`. Is the compiler on?" → branch "No" → Leaf "Turn the compiler on first (L2). Almost every manual memo you're reaching for is then unnecessary." → branch "Yes, compiler is on" → next question.
- "Why do you need it?" branches map to the four cases:
  - "An effect's dep array depends on this object/function's *identity*" → Leaf case 1 (`useMemo`/`useCallback` for a stable ref feeding `useEffect`).
  - "A third-party library reads this value by reference equality" → Leaf case 2 (stable ref at the integration point).
  - "The Profiler shows this computation runs every render and costs real time" → Leaf case 3 (`useMemo` on the measured hot computation).
  - "A hot-path leaf must not re-render unless specific props change" → Leaf case 4 (`React.memo`, rarely with a comparator).
  - "I just want to be safe / it might be slow" → Leaf "Delete it. No measured or contractual cause = 2020 reflex. Measure first (Profiler), then decide."
Pedagogical goal: the student internalizes that *measurement or a library contract* gates every reach, and that "for safety" is never a branch that ends in a wrapper. The lesson lives in the order, not any single leaf.

#### Case 1 — a stable reference an effect depends on

The first flavor of "referential equality required" (convention case b).
- The problem: an effect's dep array contains an object or function whose *identity* drives the effect (e.g. an SDK client that re-subscribes whenever the options object's reference changes). If that object is rebuilt every render, the effect re-fires every render even though its content is unchanged.
- Why the compiler may not save you: the compiler memoizes within its analysis, but when an effect's correctness *depends* on a guaranteed-stable reference you make that guarantee explicit with `useMemo`/`useCallback` rather than hoping the analysis matched.
- The fix: wrap the object/callback in `useMemo`/`useCallback` keyed on the values that should trigger re-subscription, so the effect's dep array sees a stable reference.
- Show a small `Code` (tsx) example: an effect subscribing to an SDK with a memoized `options`/handler, the dep array referencing the memoized value, and the **mandatory comment** (`// stable ref: SDK re-subscribes on options identity change`). The comment is part of the example, not an afterthought.
- Code-review red flag to name: `useMemo` here *without* a comment naming the consuming effect — the reviewer can't tell reflex from necessity.

#### Case 2 — a library that reads by reference equality

The second flavor of convention case (b) — the most common real reach in a 2026 app.
- The problem: some libraries' contracts demand a stable reference and re-run / re-render when identity changes — name concrete ones at one line each: `react-hook-form` watch/field-array callbacks, certain chart libraries' options objects, some Zustand selectors. The compiler cannot know a library reads by reference, so it won't necessarily stabilize what the library needs.
- The fix: wrap the value/callback with `useMemo`/`useCallback` *at the integration point* — the boundary where your code hands the value to the library.
- Show a compact `Code` (tsx) example at a library boundary (a memoized options/config object passed to a third-party hook) with the comment (`// <library> reads this by reference equality`).
- Watch-out (inline): memoizing around a library quirk *without* a comment leaves the next reader to re-discover the constraint the hard way. Tie back to comment discipline.
- Forward-ref lightly: react-hook-form is Chapter 045, Zustand is Unit 15 — recognition only, do not teach them.

#### Case 3 — a measured expensive computation the compiler skipped

Convention case (a) — the only case gated strictly by measurement.
- The problem: a genuinely heavy in-render computation — a large sort, a tokenizer, a fuzzy-match index build — and the Profiler confirms it runs on renders where its inputs did not change. The compiler can skip memoizing when it can't prove purity or when inputs are too complex to analyze.
- The fix: `useMemo` keyed on the real inputs, applied *after* the Profiler shows the cost. Order is non-negotiable: measure, then memoize.
- Show the `useMemo` signature here as the natural teaching moment (see signature subsection — or fold the brief signature into this example). Example: `const ranked = useMemo(() => expensiveRank(items, query), [items, query]);` with the comment (`// Profiler: 18ms ranking on every keystroke`).
- Stress the cheapness test: most "expensive-looking" computations are cheap; only a Profiler reading earns this. A non-measured `useMemo` "because it looks heavy" is the reflex this lesson cuts.
- Forward-ref the Profiler workflow to Unit 19 / performance vigilance (recognition only — see Profiler primer subsection).

#### Case 4 — a hot-path leaf that must not re-render

Convention case (c) — the rarest, most code-smelly reach.
- The problem: a truly hot path — a virtualized list row, a canvas drawing component, a chart that repaints expensively — where you need a hard guarantee the component skips re-render unless specific props change.
- The fix: `React.memo` at that one measured boundary. Show the `memo(function Row({ item }) { … })` shape with a comment naming the measurement.
- The comparator (second arg) — show `memo(Row, (prev, next) => prev.item.id === next.item.id)` and immediately frame it as *rare and usually a smell*: reaching for a custom comparator typically means the props are shaped wrong, and the better fix is to pass the primitive the component actually cares about rather than an object where only one key matters. Name the comparator so the student recognizes it, but steer toward restructuring props.
- Pedagogical caution for the writer: keep this short. The student has no virtualization/canvas context yet; the goal is recognition that `memo` is a *targeted instrument at a measured boundary*, not the old blanket reflex.

### Writing the three escape hatches — a compact reference

The single place in the course the student sees the syntax. Frame as a reference card for the rare reach, not a tutorial to internalize.

Use `CodeVariants` (three tabs — `useMemo`, `useCallback`, `React.memo` — they are three versions of one idea; the component is built for exactly this A/B/C glance). Each variant: one tight fenced `tsx` block + one paragraph (six lines max) stating what it guarantees and its residual escape-hatch role.
- `useMemo`: `const memoized = useMemo(() => compute(a, b), [a, b]);` — returns the *same reference* when deps are unchanged by `Object.is`. The compiler beats it for plain in-render derived values; the residual role is reference-stability for a downstream consumer (cases 1–3).
- `useCallback`: `const handler = useCallback((e) => doThing(e, value), [value]);` — sugar for `useMemo` returning a function; same compiler-eaten default, same residual role.
- `React.memo`: `const Row = memo(function Row({ item }) { … });` — skips re-render when props are shallowly equal; the explicit guarantee at a measured boundary (case 4).

`CodeTooltips` candidates inside these blocks (short inline definitions on hover): `Object.is` (the equality React uses for deps and shallow prop comparison — stricter than `===` only for `NaN`/`±0`), "shallowly equal" (compares each prop by reference, one level deep). Use `CodeTooltips` so the definitions don't interrupt the reference card's flow.

Keep an `Aside` (note) immediately after: every one of these in a 2026 codebase carries a one-line comment naming its cause; without it, the next reader assumes 2020 reflex and deletes — *correctly*. This is the comment-discipline payoff and it belongs right where the syntax is shown.

### Stop hand-tuning: the 2020 reflexes to delete

The second half. Open with the seam signal: the four cases are what to *keep*; this section is what to *cut*. Three of these are pure memoization (taught above, now negated); two reach beyond memoization into bundle/loading habits the student hasn't formally learned — frame those as recognition + forward-ref, not new teaching.

Cover as prose with tight inline examples; this is a list of negations, so keep each crisp.
- **`useMemo` on every value.** The biggest cleanup opportunity in legacy code. Wrapping every derived value adds noise, can interfere with the compiler's analysis, and trains ceremony over code. `const fullName = firstName + ' ' + lastName;` needs no wrapper.
- **`useCallback` on every handler.** Same reflex, same cut. `onClick={() => setOpen(true)}` is fine bare; the compiler stabilizes it where stability matters.
- **`memo` on every component.** A pre-compiler pattern. The compiler memoizes JSX subtrees automatically; `memo` is now the targeted instrument of case 4, not a default wrapper.
- **Premature `next/dynamic`.** Recognition + forward-ref. The 2020 reflex was `dynamic()` for anything imagined "heavy." 2026 defaults differ: Server Components ship zero client JS (Chapter 030), and route-level code splitting is automatic (App Router). The real trigger is narrow — a *measured* client bundle that includes a component the user rarely renders (a modal opened by 5% of sessions, a chart used on one tab). Depth lives in performance vigilance (Unit 19). Do not teach `dynamic()` syntax here.
- **Blanket `<Suspense>` boundaries.** Recognition + forward-ref. Wrapping every "slow-looking" component in `<Suspense>` is the same reflex. Boundaries belong at meaningful UX seams — a route segment, a parallel-route slot, a region with its own loading state — taught in Chapter 031. Do not teach Suspense placement here.

Visual proof — a small `RenderTracking` (it provides its own card; do **not** wrap in `<Figure>`). One `<Implementation>` "blanket `memo` everywhere", one "compiler on, no manual `memo`", with the *same* trigger (state change in an unrelated sibling). Both implementations light up the *same* boxes — i.e. the manual `memo` bought nothing the compiler didn't already give. Keep the tree tiny (3–4 nodes). Pedagogical goal: make "blanket memo is dead weight" a thing the student *sees*, reinforcing the cut rather than only asserting it. (This is a deliberately different use from L2's RenderTracking, which contrasted re-render counts; here both columns are identical to prove redundancy.)

### The dangerous lookalike: useMemo is not a cache

A standalone short section because it's a specific, high-cost misconception that deserves isolation, not a buried watch-out.
- The trap: `const data = useMemo(() => fetch(url).then(r => r.json()), []);` looks like request caching. It is not. It's a closure trick that breaks under Suspense and concurrent rendering — the memo can be discarded and re-run, the promise isn't integrated with React's data flow, and it does not survive remounts or share across components.
- The right tools, named (recognition only): React's `cache()` for request-scoped deduplication (Unit 4 / Chapter 032), and TanStack Query for client-side server-state caching (Chapter 11/076). `useMemo` memoizes a *value*; caching a *fetch* is a different problem with different tools.
- Deliver as an `Aside` (caution) with the one-line bad example and the redirect. Do not teach `cache()` or TanStack here.

### Measure, then memoize — the workflow that gates every reach

The discipline that ties the four cases together. State the order as non-negotiable.
- The senior order: (1) compiler on, (2) run the Profiler on a real interaction, (3) find the actual hot spot — a component rendering when its props didn't change, a computation running on unchanged inputs, (4) apply the *targeted* escape hatch with a comment. Never the reverse. Memoization before measurement is the inverse of senior practice.
- **Profiler primer — recognition only.** One short paragraph: React DevTools' Profiler records renders and shows which components rendered, why, and for how long; the senior loop is record an interaction → look for components rendering when their inputs didn't change → audit. State explicitly that depth (flame graphs, full record-and-read loop) lives in the performance-vigilance unit (Unit 19) — this lesson only needs the student to know the tool exists and gates the reach. Optionally a single `Term` on "Profiler."
- **Comment discipline (restate as a rule, not a tip).** Every residual manual memoization carries a one-line comment naming its cause — "SDK requires stable ref," "Profiler: 18ms in ranking," "react-hook-form reads by reference." This is what separates a justified escape hatch from a reflex in code review. Without the comment the memoization is indistinguishable from 2020 noise and should be deleted.

Optional small `CodeVariants` (two tabs) here if it strengthens the point: "Reflex (no comment) — gets deleted" vs "Escape hatch (commented) — survives review", showing the *same* `useMemo` line, the only difference being the comment. This makes the comment the load-bearing artifact. Author's choice; keep it tight if used.

### The legacy cleanup order

Short, procedural — closes the lesson on the production migration the chapter has been building toward. The student arriving at a manual-memoization codebase needs the *order*.

Use `Steps` (numbered procedure the reader follows). The enabling/annotation-mode mechanics were taught in L2 — reference L2 and focus here on the *cleanup* sequence:
1. Enable the compiler in annotation mode (`compilationMode: 'annotation'`) — cross-ref L2 for the wiring.
2. Add `'use memo'` to one small, audited file.
3. Delete that file's manual `useMemo`/`useCallback`/`memo` ceremony; run tests; profile the touched interaction.
4. Expand file by file.
5. Flip to full coverage (`reactCompiler: true`).
6. Final pass: delete remaining ceremony, leaving only the four-case residual — each survivor carrying its comment.

Pedagogical goal: turn "delete your memoization" from a slogan into a safe, test-and-profile-gated procedure. Emphasize *don't mass-delete blind* — leaving a manual memo in place can subtly change the compiler's output and effects relying on a reference can over-fire; the cleanup is deliberate, file by file.

### Assessment — sort the reflex from the reach

Place a `Buckets` exercise as the section that checks the lesson's core skill: recalibrated instinct. This is the single best fit — the whole lesson is a classification skill (keep vs delete), and `Buckets` drills exactly that.
- Two buckets: **"Keep — earns its weight"** and **"Delete — 2020 reflex"** (use the `twoCol` layout, custom `instructions`: "Sort each manual memoization into keep-with-a-comment or delete.").
- Items (chips, inline code/prose — 6–8 total, balanced):
  - Keep: `useMemo` for an options object an SDK re-subscribes on (case 1); `useCallback` passed to a `react-hook-form` field that reads by reference (case 2); `useMemo` on a sort the Profiler shows at 20ms/keystroke (case 3); `React.memo` on a measured virtualized list row (case 4).
  - Delete: `useMemo(() => firstName + ' ' + lastName, [...])`; `useCallback` on an `onClick` attached to one button; `React.memo` on a leaf whose parent never re-renders; `useMemo(() => fetch(url), [])` (the not-a-cache trap — delete *and* reach for the right tool).
- Grading: each chip's `bucket` is the correct category. Goal: the student can't pass by pattern-matching the API (every API appears in both buckets) — only by reading the *cause*.

`MultipleChoice` is an acceptable lighter alternative if `Buckets` proves awkward, but `Buckets` is preferred for the classification shape.

### External resources (optional)

One or two `ExternalResource` cards at the very end (per lesson structure): the React docs pages for `useMemo`, `useCallback`, and `memo` (each documents "you might not need this" / "should you add it everywhere? No" guidance that reinforces the lesson). Optional: the React Compiler docs page on what it memoizes. Keep to genuinely authoritative sources; do not pad.

### Tooltip / `Term` candidates (lesson-wide)

- `Object.is` — the equality React uses for deps and shallow prop comparison (`CodeTooltips`, in the signature reference).
- "shallowly equal" / "shallow comparison" — one level deep, by reference (`CodeTooltips` or `Term`).
- "escape hatch" — a deliberate, documented departure from the default (define once in the mental-shift section; reuse the chapter's phrasing).
- "Profiler" — React DevTools panel that records renders (`Term`, in the workflow section).
- "referential equality" / "reference equality" — same object identity, not same content (`Term`, in cases 1–2).
Be strategic — these support the lesson's goals; do not over-tooltip.

## Scope

**Prerequisites to recap in one line each (do not re-teach):**
- The compiler is on and auto-memoizes five cases (derived values, object/array literal props, in-component callbacks, provider values, JSX subtrees) — owned by L2.
- The purity contract is the compiler's price of admission — owned by ch023 L3.
- `Object.is` / reference equality — define inline where `memo`/deps need it (the student has met state-update equality earlier in the hook unit; this is a targeted recap, not a lesson).

**This lesson does NOT cover (owned elsewhere):**
- Custom hooks — L1 of this chapter.
- React Compiler config, enabling, annotation-mode wiring, `'use no memo'`, the `Memo ✨` badge — L2 of this chapter. This lesson *uses* the compiler-is-on premise and references L2 for any enabling detail; it does not re-teach the compiler.
- Rules of hooks and the two ESLint rules — ch025 L8 (recap only).
- Effects and the dependency-array contract / `useEffectEvent` — ch025 (recap only; case 1 references an effect dep but does not teach effects).
- React DevTools Profiler at depth (flame graphs, timings, full loop) — performance vigilance (Unit 19). Recognition only here. (Note for continuity: the chapter outline pins this to "Chapter 094," but the current TOC's Chapter 094 has no dedicated Profiler lesson; forward-ref to the performance-vigilance unit generally rather than a specific lesson number.)
- `next/dynamic`, bundle analysis, tree-shaking — performance vigilance (Unit 19) and Chapter 030. Named as a reflex to stop; syntax not taught.
- `<Suspense>` boundary placement, the four async files, streaming — Chapter 031. Named as a reflex to stop; placement not taught.
- Server Components shipping zero client JS — Chapter 030 (one-line reason inside the `dynamic()` cut; not taught).
- React `cache()` and `use cache` — Chapter 032 / Unit 4. Named as the right tool for the not-a-cache trap; not taught.
- TanStack Query / server-state caching — Chapter 076 (Unit 15). Named as the right tool for client-side fetch caching; not taught.
- react-hook-form, Zustand — Chapter 045, Unit 15. Named at one line as reference-equality-sensitive integrations; not taught.

**Deliberate divergences from convention (flagged for downstream agents):**
- The course convention keeps manual memoization out of all recommended samples; this lesson *must* show `useMemo`/`useCallback`/`memo` syntax because it is the one place that teaches the residual escape hatch. Every shown instance carries its mandatory comment and is framed as the rare reach — this is the convention's own carve-out ((a)/(b)/(c)), not a contradiction.
- The `useMemo`-as-fetch-cache and the comparator-on-`memo` examples are intentional anti-patterns shown to be *named and avoided*, not shapes to copy. Flag them as such in prose so downstream agents don't lift them into production files.

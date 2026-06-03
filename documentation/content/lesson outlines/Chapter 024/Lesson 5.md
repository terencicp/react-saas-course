# useRef as the non-rendering escape hatch

**Sidebar label:** useRef

## Lesson framing

This lesson installs `useRef` as the one React primitive for values that *persist across renders* but *do not drive UI*. It is the fifth of six hooks in Ch 024; the chapter's spine is "where does this value live, decided before the API." Here the answer is: not in state at all.

**The one mental model the lesson must land:** a ref is a mutable box — `{ current }` — that React keeps stable across renders and *never watches*. Writing `.current` is invisible to React: no re-render, no reconciliation, nothing. That single property is what makes it both useful (cheap mutable memory) and dangerous (mutating it during render makes the component impure). Everything else in the lesson is a corollary.

**The decision rule is the headline, not the API.** The chapter's reflex from L1-L3 ("colocate first, relocate on evidence" / "reach for `useState` last") gets a sibling here: **"does the JSX read this value?"** Yes → state. No → ref. This is the senior cut that prevents the two equal-and-opposite beginner errors: (1) reaching for `useState` for a timer ID / scroll position / previous value that never appears in JSX (a needless re-render on every tick), and (2) reaching for a ref to read a controlled input or toggle a class, re-implementing what state and props already do. Teach the rule first, then both failure modes.

**Pedagogical sequencing (minimize cognitive load):** start from a concrete pain the student already feels — "I need to remember the `setTimeout` ID between renders so I can clear it; `useState` re-renders on every keystroke, a plain `let` resets every render." That dead-end motivates the box. Then: the signature and the box, the decision rule, the two uses (instance values, then DOM nodes — instance-value first because it's the purer illustration of "memory without rendering"; DOM refs add lifecycle timing on top), the lifecycle-timing trap (`.current` is `null` until after commit), the don't-read-or-write-during-render rule with its one lazy-init exception, and a short compiler note. Refs-are-not-for-what-React-does is woven into the DOM section as the senior cut, not a separate watch-out dump.

**This lesson cashes in prior chapters, doesn't re-teach them.** Purity (Ch 023 L3) is the *reason* the during-render rule exists — assert it, link it. `ref` as a React 19 prop and `useImperativeHandle` were taught in Ch 022 L4 — recognition-only here, cross-reference, do not re-teach `forwardRef` (gone). Snapshot/commit vocabulary (Ch 023) is reused. Effect cleanup is Ch 025 L2 — name the cleanup obligation for a ref-held timer, defer the mechanism. The four-homes map and "reach for the hook at its threshold" framing carry from L1-L4.

**Tone & shape:** adult, terse, decision-first (Pedagogical guidelines §2). Small disposable snippets, no continuous-example character (matches L1/L2; L3/L4 had running examples but this lesson's reaches are too varied — debounce, focus, scroll, previous-value — to force one). Reuse the established mark convention: orange = smell (state-in-disguise, ref-read-in-render), green = correct, red = a genuine bug/null-deref. Continue the "reach for the tool at its threshold, not prophylactically" chapter refrain.

## Lesson sections

### Introduction (no header)

Per Pedagogical guidelines §3: warm, brief, decision-first. Open on the concrete pain (the senior question, stated implicitly). A debounced search input needs to remember its pending `setTimeout` ID so the next keystroke can clear the previous one. Try it with the tools the student already has and watch both fail: a module-level / local `let timerId` resets to `undefined` on every render (the component body is a function that re-runs — Ch 023); a `useState` works but re-renders the component every time you store the ID, for a value the UI never shows. The student needs a *third* kind of memory: survives renders like state, invisible to React like a plain variable. Name it: `useRef`. Preview the payoff — by the end they will reach for the right one of {state, ref} on reflex via a single question, and know the four things refs are actually for. Connect back: this is the fifth home-for-state question of the chapter, and the first whose answer is "not state."

### A ref is a mutable box React never watches

The signature and the core property. `const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)` returns `{ current: T }` — a plain object. Three facts, taught as the load-bearing trio:

1. **The object is stable.** Same `{ current }` reference every render, for the component's whole life. (Contrast `useState`'s *value* which is a fresh snapshot each render — the ref *box* is the thing that's stable, like the `setState` setter from L1.)
2. **`.current` is freely mutable.** Read it, assign it, mutate it — it's just a property.
3. **Writing `.current` does not re-render.** This is the whole point. React does not subscribe to the box.

The initial argument is used once, on first render only (same as `useState`'s initial value — reuse that vocabulary, don't re-derive it).

Use **`CodeTooltips`** on a 4-5 line snippet to gloss `useRef`, `.current`, and `ReturnType<typeof setTimeout>` (why not `number` — Node vs browser timer types; one-line tooltip) without breaking flow. This is the ideal `CodeTooltips` case: short inline type/meaning definitions on a tiny block.

Then the visceral contrast — **`RenderTracking`** with an `Implementation` toggle, two variants over the same 2-box tree (`Parent` → `Widget`):
- Variant "useState(0)": trigger "store value" renders `widget`.
- Variant "useRef(0)": trigger "write ref.current" renders nothing (empty `renders`).
This makes "writing a ref does not re-render" a thing the student *sees in the badges*, not a sentence they read. Pedagogical goal: lock in fact 3 before any nuance. Wrap-note: `RenderTracking` brings its own card, no `<Figure>`.

Typing note (brief, conventions-aligned): annotate the ref's generic at the seam — `useRef<T | null>(null)` for anything that starts empty, exactly as L1 annotated `useState<User | null>(null)`. Inference handles `useRef(0)`.

### The question that decides: does the JSX read it?

The senior rule, stated once and made the spine of the rest of the lesson. **State is for values the render output reads. Refs are for values only handlers and effects read.** If changing the value should change what the user sees, it's state. If changing it should be invisible until something *else* triggers a render, it's a ref.

Frame both equal-and-opposite errors here so the rule has teeth:
- **State-in-disguise (the common one):** a `useState` + setter where the value never appears in JSX — a timer ID, a scroll offset read in a handler, a "has the user interacted yet" flag checked only in an effect. Every set fires a needless render. The tell (orange mark): trace the state variable; if it appears in no JSX expression, it wants to be a ref.
- **Ref-where-state-belongs (covered fully in the DOM section, named here):** reading a value the UI must reflect out of `.current` — the screen goes stale because nothing re-rendered.

Pedagogical aid: a small **`Buckets`** exercise (`twoCol`), "Where does each value live?" — sort ~8 chips into **State (JSX reads it)** vs **Ref (only handlers/effects)**. Chips: current input text shown in the field → state; the `setTimeout` ID for debouncing → ref; number of items in a visible cart badge → state; the previous value of a prop, for comparison → ref; whether a panel is open → state; a scroll position read on "scroll to top" click → ref; the count to display → state; an `IntersectionObserver` instance → ref. This is the cheapest, highest-signal check for *the* concept of the lesson; it forces the student to apply the rule rather than recognize it. Goal: the decision becomes reflex.

Slogan to coin (and reuse in the conclusion): **"if the JSX doesn't read it, it doesn't belong in state."**

### Remembering a value across renders: instance refs

The first of the two uses — the purer one, taught first because it's just "memory without rendering," no DOM lifecycle yet. A ref as a mutable box for any cross-render value the JSX ignores.

Resolve the introduction's debounce dead-end here — this is the payoff, so make it the worked example. Show the debounced search handler storing the timer ID in `timerRef.current`, clearing the previous timeout on each keystroke. Use **`AnnotatedCode`** (single block, attention directed to multiple parts in sequence): step 1 = the ref declaration (`color="blue"`), step 2 = read-and-clear the previous ID in the handler (`color="green"`), step 3 = store the new ID (`color="green"`), step 4 = (named, not yet built) the cleanup obligation — a real app clears the pending timer when the component unmounts; that lives in an effect cleanup, owned by Ch 025 L2 (`color="orange"` to flag the open thread). One AnnotatedStep per part keeps each glance tight (6-line max per the component contract). All ref reads/writes are inside the handler — silently models the during-render rule before it's stated.

Name the other canonical instance-value reaches briefly (recognition, not full treatments):
- **Previous value:** `const prevValue = useRef(value)`, updated in an effect *after* render so the next render can compare. Note it's common enough to become a `usePrevious` custom hook — forward-ref Ch 026 L1, don't build it.
- **Render-count / debug:** `const renders = useRef(0); renders.current++` — a debugging tool, mentioned in one line.

Tie back to the box: none of these touch the DOM; the ref is pure JS memory React happens to keep alive.

### Reaching into the DOM: element refs and commit timing

The second use, and the one with a timing trap. Attach a ref to an element via the `ref` prop — `<input ref={inputRef} />` — and React assigns the live DOM node to `.current` **after it commits to the screen**. Reuse Ch 023's commit vocabulary.

This is where the **lifecycle-timing trap** lives, and it's the section's hardest idea — give it a **`DiagramSequence`** (scrubbable, self-contained card, no `<Figure>`). Steps walk one render→commit cycle:
1. **First render runs.** Component function executes; `inputRef.current` is still `null` (the JSX that *creates* the `<input>` hasn't been committed). Caption: reading the ref *here* gets `null`.
2. **React commits the DOM.** The `<input>` is now in the document.
3. **React sets `inputRef.current = <the node>`.** After commit.
4. **Effects / handlers run.** Now `inputRef.current` is the live node — `.focus()`, `.scrollTo()`, `getBoundingClientRect()` all work.
Pedagogical goal: the student internalizes *why* reading a DOM ref in the render body is wrong (it's `null` on first render, stale after) and *where* it's safe (effects, handlers). This temporal gap is exactly what a scrubbable sequence teaches better than prose.

Then the **four canonical DOM-ref reaches** — frame as "capabilities the DOM has that React's props/state don't expose," not as a grab-bag list:
1. **Focus management** — `inputRef.current?.focus()` (in a handler, or an effect when focusing on mount).
2. **Measurement** — `boxRef.current?.getBoundingClientRect()`.
3. **Imperative media / element APIs** — `videoRef.current?.play()` from a Play-button handler.
4. **Scrolling** — `listRef.current?.scrollTo({ top: 0 })`.
Always optional-chain the read (`?.`) — the node can be `null` (not yet committed, or conditionally rendered). Conventions note: this matches the project's `value != null` discipline.

The **senior cut — refs are not for what React already does** (this is the second beginner error, paid off here). Use **`CodeVariants`** (before/after, the component's sweet spot) on one example: reading a controlled input's text via `inputRef.current.value` (orange pane — defeats the controlled pattern, the value is already in state) vs reading it from state (green pane). One paragraph each. The senior rule in one line: reach for a ref only for a capability the DOM exposes and React doesn't — focus, measurement, media, scroll, imperative selection/clipboard targets — never to re-read or re-implement what props and state already own (toggling a class, hiding via `style.display`, reading input values).

Cross-reference (one sentence each, recognition-only, do **not** re-teach):
- `ref` is a plain prop in React 19 (`forwardRef` no longer needed, slated for deprecation — do not present it as already removed) — passing a ref *down* to a child element was Ch 022 L4; this lesson is about owning a ref via `useRef`, the same-component case.
- When a parent legitimately needs to call a child's method, `useImperativeHandle` (Ch 022 L4) — rare in 2026; usually lifting state or a `key` reset is the better reach.
- **Ref callbacks** (`ref={node => {…}}`, with a React 19 cleanup return) for measuring-on-mount and merging refs — Ch 022 L4 owns it; name it as the door to dynamic/multiple refs, don't open it.

### Never read or write a ref during render

The purity rule, stated explicitly now that both uses are on the table. Reading or writing `.current` in the render body makes the component impure (Ch 023 L3 — the compiler's contract) and reintroduces exactly the unpredictability hooks exist to prevent. Refs are touched in **handlers and effects only**.

Then the **one sanctioned exception — lazy ref initialization:** when the initial `.current` needs an expensive object built once (a class instance, a parser), `useRef(null)` followed by `if (ref.current === null) { ref.current = createOnce() }` at the top of the body is allowed *because the write is idempotent and self-guarding* — it sets the box exactly once and is otherwise a read. Contrast with `useRef(createOnce())`, which builds the object on *every* render and throws all but the first away (the exact parallel to L1's eager-vs-lazy `useState` story — call that connection out; it reinforces a pattern the student already owns). Keep this tight: it's the *only* during-render ref write the lesson sanctions.

A short **`PredictOutput`** or **`TrueFalse`** beat could check the lifecycle understanding ("a component logs `inputRef.current` in its body on first render; what prints?" → `null`), but prefer folding this into the `DiagramSequence` captions and keeping the section lean unless the build agent finds it lands flat. If used, `TrueFalse` with 3 statements (ref write re-renders → false; reading a DOM ref in render gives the committed node → false/null; the ref box is stable across renders → true) is the lighter touch.

### Refs and the React Compiler

Short, forward-aware section (the compiler is owned by Ch 026 L2 — recognition-only here, but it's the *consequence* of the purity rule so it belongs in this lesson). The compiler treats `.current` as opaque mutable state it cannot track; reading or writing a ref during render means it can't safely invalidate its cache, so the safe assumption it makes is that you obey the rule. **The detection mechanism to name is the lint rule, not a runtime badge:** the `react-hooks/refs` rule (shipped in `eslint-plugin-react-hooks` v6/v7, the compiler-powered rule set the conventions doc requires) flags a ref read/write during render at author time. *Accuracy note for the build agent:* there is a known compiler issue ([facebook/react#29161](https://github.com/facebook/react/issues/29161)) where the compiler itself does **not** reliably bail out on this — so the lesson must present the **lint rule** as what catches it, not "the compiler bails out and shows a badge." The senior takeaway, one line: a ref touched during render is a correctness smell the linter will flag — move the access into a handler or effect. Reinforces conventions §"Hooks and the React Compiler" (no manual memo; let the compiler work; obey the hook rules so it can). Forward-ref Ch 026 L2 for the compiler surface at depth.

### Putting it together: pick the box by what the JSX reads

Brief synthesis (not a generic recap — a decision close). Restate the lesson's spine as a clean either/or the student now owns:
- **State** when the render reads the value and a change should repaint.
- **Ref** when only handlers and effects read it and a change should stay invisible — the two flavors being instance memory (timers, previous values) and DOM handles (focus, measure, media, scroll).

Place `useRef` on the chapter's running "reach for the hook at its threshold" framing: `useState` for UI-driving values (L1), derive instead of store (L2), lift/URL/server by home (L3), `useReducer` for coordinated transitions (L4), **`useRef` for cross-render values the UI ignores (here)** — one slot left, `useId` (L6). Optionally a compact **`Buckets`** or `Matching` is overkill if the earlier `Buckets` already ran — prefer closing on the slogan ("if the JSX doesn't read it, it doesn't belong in state") plus the one-question reflex, and a single `ReactCoding` practice exercise.

**Practice — `ReactCoding`, tests mode.** A small focus-on-mount + debounce task that exercises both flavors in one component (the lesson's two uses, applied): a `<SearchBox>` whose input auto-focuses on mount (DOM ref) and whose `onChange` debounces a callback by 300ms using a stored timer ID (instance ref). Starter gives the JSX and a stubbed handler. Tests (DOM-queried, per `ReactCoding`'s assertion surface): the input is `document.activeElement` after mount; typing twice within the window does not fire the debounced callback twice (assert via a rendered counter the test reads). Keep the timer logic the focus — the grader checks behavior, not implementation. Disposable component, not coupled to any chapter running example (matches L4's separate-practice-component choice). Goal: the student writes both ref flavors once, under grading, before leaving the lesson.

### External resources (optional)

One or two `ExternalResource` cards, current React docs:
- react.dev "Referencing Values with Refs" and "Manipulating the DOM with Refs" (the two canonical pages — pick the better-fitting one or link both).
- Optionally react.dev "useRef" API reference.

## Terms for Tooltip / `Term`

Strategic, lesson-supporting only:
- **`ref` / mutable ref object** — the `{ current }` box; React-specific meaning vs the English word.
- **commit** — re-assert from Ch 023 (the point React writes changes to the DOM; when DOM refs get set). One-line.
- **imperative** — "telling the element to *do* something (focus, play) vs describing what it should be" — supports the DOM-ref framing.
- **purity / pure** — re-assert from Ch 023 L3 as the reason for the during-render rule (one line, recognition).
- **debounce** — likely unfamiliar to a career-changer; one-line gloss ("wait until input stops before acting") at first use in the intro.
- **`ReturnType<typeof setTimeout>`** — why this over `number` (Node vs DOM timer types) — best as a `CodeTooltips` entry on the signature block rather than prose.

## Scope

**Prerequisites to redefine briefly (do not re-teach):**
- Component body is a function that re-runs every render; a plain `let` resets each time (Ch 023 — one clause in the intro).
- Snapshot / commit / render vocabulary (Ch 023 — reuse, assert).
- Purity contract and why the compiler depends on it (Ch 023 L3 — one line, link).
- `useState` signature, initial-value-used-once, setter stability, eager-vs-lazy initializer (Ch 024 L1 — the lazy-ref exception explicitly parallels lazy `useState`; reference, don't reprove).
- `value != null &&` / optional-chaining discipline (carried from L4).

**Explicitly out of scope — owned elsewhere:**
- `ref` as a prop, ref forwarding, `forwardRef` (gone in 19), `useImperativeHandle` at depth — **Ch 022 L4, already taught.** Recognition cross-references only.
- `useEffect` signature, dependency arrays, and **cleanup mechanics** — Ch 025 L2. This lesson *names* the cleanup obligation for a ref-held timer and shows ref access happening "in an effect/handler" but does not teach how effects or cleanup work. Keep effect code minimal and unexplained, or phrase as "in a handler."
- React Compiler config, the memoization badge, bailout diagnostics surface — Ch 026 L2. Recognition only (one short section on the *consequence*).
- `usePrevious`, `useEventListener`, and other ref-wrapping custom hooks — Ch 026 L1. Name `usePrevious` as a forward pointer; don't build it.
- `IntersectionObserver` / `MutationObserver` / `ResizeObserver` and `ref`-callback measurement at depth — Ch 025 (effects) territory. May appear as a one-line "instance value + DOM node" combo example in the decision exercise, not taught.
- Drag-and-drop, gesture, and animation libraries (Framer Motion / `motion`) — out of scope; not even recognition here.
- Sharing a ref across components by prop is recognition-only (it's the Ch 022 L4 "ref as prop" surface); storing refs in module scope is named once as a leak/anti-pattern, not explored.
- Forms, `useId`, controlled-input theory in full — Unit 6 and L6. The controlled-input *example* here exists only to show what a ref should **not** do; it does not teach forms.

**Deliberate divergences from code conventions (flag for downstream agents):**
- Effect code shown for "focus on mount" or "timer cleanup" is intentionally minimal / hand-waved because `useEffect` is not yet taught (Ch 025). Prefer handler-based examples where possible; when an effect is unavoidable, keep it to the shape only and annotate that it's previewed.
- Snippets are small and disposable; no `import` blocks unless load-bearing (Pedagogical guidelines §4 stripping).

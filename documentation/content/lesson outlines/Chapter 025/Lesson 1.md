# Strict Mode is the messenger

- Title (h1): `Strict Mode is the messenger`
- Sidebar label: `Strict Mode`

---

## Lesson framing

This is lesson 1 of Chapter 025 (Effects, context, and concurrent hooks). It is deliberately sequenced *before* `useEffect` (lesson 2): the student meets the tool that **diagnoses** effect bugs before learning the tool that **causes** them. That ordering is the whole pedagogical bet — by the time they write their first `useEffect` in lesson 2, "code that breaks under Strict Mode is broken" is already installed as a reflex, and the double-mount is a familiar friend instead of a confusing "why does my effect run twice?" panic.

The senior framing, per the chapter: **Strict Mode is the messenger, not the bug.** Double-invocation does not *introduce* bugs; it makes latent impurity and missing cleanups visible in dev, on day one, instead of in prod after a user navigates fast enough. The mental model the student must leave with: Strict Mode runs pure things twice and runs effects through a full mount → unmount → mount cycle, *on purpose*, because real React 19 production behavior (transitions, prefetching, the Activity API) already mounts/unmounts/remounts components — so code that survives the double-mount is code that survives production.

The single most important behavioral outcome: when an effect "runs twice," the student fixes the **cleanup**, never reaches for a `useRef(false)` guard to suppress the second run. This "don't fight Strict Mode" rule is the lesson's emotional core and the thing juniors get most wrong. Everything else (what exactly gets double-invoked, the purity angle, the Server Component interaction) serves this.

Cognitive-load management: the student knows React renders are pure functions (chapter 023 lesson 3, the purity contract) and knows `useState` lazy initializers (chapter 024 lesson 1) and `useRef` (chapter 024 lesson 5). It does **not** yet know `useEffect`'s API. So the lesson must teach the *effect lifecycle shape* (setup/cleanup/setup) at a recognition level — enough to see why a missing cleanup doubles a subscription — without teaching the `useEffect` signature, dependency arrays, or the four cleanup pairings (all lesson 2). Keep effect code samples minimal and self-explanatory; the focus is the *symptom and the fix-shape*, not the API. Treat `useEffect(setup, [])` as a black box: "setup runs, optional cleanup runs."

Diagrams carry heavy weight here because the mount/unmount/mount cycle and the "two leaked subscriptions" failure are inherently temporal and invisible in code. A `DiagramSequence` animating the lifecycle and a side-by-side leaked-vs-clean comparison are the two anchors. A `PredictOutput` exercise on a double-firing initializer cements the purity angle by making the student *feel* the doubling. A short live `ReactCoding` cleanup-the-leak exercise lets them apply the fix-shape.

Facts verified June 2026: React 19 Strict Mode double-invokes component bodies, `useState`/`useReducer`/`useMemo` initializers AND state-updater functions, **ref callbacks** (setup+cleanup, new in React 19), and the full effect setup→cleanup→setup cycle — all dev-only, zero production cost. It does **not** double-invoke event handlers, `setTimeout`, or `setInterval` callbacks. Next.js App Router enables Strict Mode by default (since 13.5.1; inherited in Next 16). `useEffectEvent` is stable since React 19.2 (Oct 2025) — relevant only as a forward reference.

---

## Lesson sections

### Introduction (no heading)

Open with the senior question as a concrete production incident, per the chapter outline: a component looks fine in dev, ships, and a user reports stale data (or a doubled network request, or a duplicated toast) after navigating away and back. Root cause: a missing effect cleanup. The twist: Strict Mode would have surfaced this on the developer's machine the first time they ran the page — *if* they hadn't ignored or disabled it. Frame the lesson's promise: by the end, the student treats Strict Mode as a free, always-on correctness test, and reads "my effect runs twice" as a signal to fix, not a bug to suppress.

Connect to prior knowledge in one breath: chapter 023 established that render is a pure function; Strict Mode is how React *checks* that you kept that promise, plus a new check for the cleanup discipline they're about to learn in lesson 2. Keep it warm and short. Preview the practical skill: recognizing the four double-invocation symptoms and applying the cleanup fix-shape.

Do **not** open with a section header — this is the lesson intro per pedagogical structure.

### What Strict Mode is and where it already lives

Goal: install the component and the crucial fact that the student **already has it** — it is not something they opt into, it is something Next.js handed them.

- `<StrictMode>` is a wrapper component that opts its subtree into dev-time checks. Show the minimal shape with a `Code` block: `<StrictMode><App /></StrictMode>`. Emphasize it wraps a *subtree* — you can scope it, though in practice it wraps the whole app.
- The inheritance fact: Next.js App Router wraps the app in Strict Mode by default (since Next 13.5.1, so the student's Next 16 project has it on). The student writes no `<StrictMode>` tag themselves — they inherit it. Mention `reactStrictMode` in `next.config` exists but defaults on; turning it off is a smell (forward-ref the "don't disable globally" point to the last section, don't expand here).
- The zero-cost guarantee, stated plainly: **every check is development-only and stripped from production builds.** No double renders ship, no runtime cost. This is what makes it "free" — there is no perf argument against leaving it on. This fact must land early because it preempts the junior instinct to disable it for performance.

Use a short `Aside type="note"` for the "you already have this on" fact so it stands apart — it's the single most surprising thing for a student who's been confused by double renders.

No diagram needed here; this is orientation. Keep tight.

### What gets run twice

Goal: the precise inventory of what Strict Mode double-invokes, organized by the *why* (purity check vs. cleanup check), not as a flat list.

Split the inventory into two buckets, because they exist for two different reasons — this framing is the lesson's spine and pays off in the next two sections:

1. **Pure things run twice** (the impurity check): the component function body (top-level only — *not* code inside event handlers), and the functions passed to `useState`, `useReducer`, `useMemo`, and state-updater (`set`) functions. The contract: anything that's supposed to be pure runs twice, and if it's truly pure, running twice is invisible. Connect explicitly to chapter 024 lesson 1 (the lazy initializer they just learned runs twice) and chapter 023 lesson 3 (purity contract).
2. **Effects run through a full cycle** (the cleanup check): every effect runs setup → cleanup → setup on mount in dev (instead of just setup). React 19 also runs an extra setup+cleanup cycle for **ref callbacks** (callback refs from chapter 024 lesson 5) — mention briefly as a recognition note, since they just learned refs.

Then the explicit negative, which juniors constantly get wrong: Strict Mode does **not** double-invoke event handlers, `setTimeout` callbacks, or `setInterval` callbacks. Only render-time code and the effect/ref lifecycle. State this as a bright line — it resolves the common confusion "why does my click handler not double-fire but my effect does?"

Component choice: a `Buckets` exercise is the ideal cement here — give the student a pool of code locations ("component body", "`useState(() => …)` initializer", "an `onClick` handler", "the body of `setInterval`", "effect setup", "a state updater function") and two buckets: **Runs twice in dev** vs. **Runs once**. This directly drills the bright line and the inventory in one interaction. Put it at the end of this section. Author the items from the verified list above.

For the prose inventory itself, a simple two-column visual (the two buckets of *why*) is clearer than prose. A small `Figure` wrapping plain HTML/CSS two-column table ("Pure → runs twice to check purity" | "Effects → mount/unmount/mount to check cleanup") works; keep it lightweight. Optional — the `Buckets` exercise may suffice. Author's call; prefer the exercise as the primary device and skip a redundant static figure if it adds nothing.

### The mount, unmount, mount cycle

Goal: the centerpiece. Make the effect lifecycle *visible* and show exactly how a missing cleanup produces a leaked, double-firing subscription. This is the section that makes lesson 2's cleanup discipline feel necessary.

Teach the lifecycle at recognition level only (lesson 2 owns the API):
- An effect has a **setup** (runs after the component mounts) and an optional **cleanup** (runs before the next setup and on unmount). Treat `useEffect(setup, [])` as a black box that "runs setup once, runs cleanup on the way out." Do not explain dependency arrays, the signature, or resync-on-deps — explicitly note in a one-line author aside that those are lesson 2.
- In dev, Strict Mode runs **setup → cleanup → setup** on first mount. If setup *subscribes* to something external (starts an interval, adds an event listener, opens a connection) and there's no cleanup to *unsubscribe*, the first setup's subscription is never torn down, the second setup adds a *second* one, and now the component holds two live subscriptions firing in parallel.

Primary diagram — **`DiagramSequence`** animating the dev mount of an interval effect, with and without cleanup. This is the best vehicle because the failure is temporal and accumulative. Author two passes or a single pass that shows both; recommended steps (single effect, an interval that logs a tick):
1. **Setup #1 runs** — `setInterval` registered, one timer live.
2. **Cleanup runs** (no cleanup written → nothing happens) — highlight the timer *still live*. Contrast caption: "With a cleanup, this is where `clearInterval` would fire."
3. **Setup #2 runs** — second `setInterval` registered, **two timers live**.
4. **Result** — the tick fires twice per second; the bug is visible. Caption lands "the doubling is the symptom; the leak is the disease."
Then a short second arc or a paired clean version showing cleanup firing at step 2, leaving exactly one timer. Per the component doc, plan for the tallest step; keep each step's body to a compact box-and-counter visual (e.g. a "live timers" count badge). Captions carry the narration.

Pair the diagram with a **`CodeVariants`** block: tab "Leaks (no cleanup)" vs. tab "Clean (returns cleanup)", same effect, `del`/`ins` not needed — just the two shapes side by side. The leak tab: `setInterval` with no return. The clean tab: returns `() => clearInterval(id)`. One-sentence framing per tab per the component's six-line limit: "Leaks — Strict Mode's second setup stacks a second timer." / "Clean — cleanup clears the first timer before the second setup runs; survives any number of mounts." Keep both samples tiny (≤6 lines). Do not annotate the `useEffect` signature; the spotlight is the presence/absence of the returned cleanup.

Name the three canonical reproductions from the outline in prose (one line each, no full code — lesson 2 codes them): an interval not cleared (fires twice), a fetch not aborted (two requests in flight), a listener not removed (handler fires twice per event). These three are the student's mental checklist for "what kind of leak is this."

### Why double rendering catches impurity

Goal: the second arm of Strict Mode — the purity check — and why running render/initializers twice surfaces side-effectful code. Shorter than the effect section; the student already holds the purity contract from chapter 023.

- The mechanism: if render or an initializer does something *observable* — pushes to a module-level array, increments a counter, writes to `localStorage` — running it twice produces a visible wrong result (doubled array, counter at 2, corrupted stored value). If it's pure, twice is identical to once and invisible. Strict Mode doesn't *cause* the corruption; it *reveals* a latent impurity that would also misbehave under any future re-render.
- The `useState` initializer gotcha, called out specifically because they just learned it (chapter 024 lesson 1): `useState(() => expensiveCompute())` runs twice — harmless if `expensiveCompute` is pure, a bug if it has a side effect (a `localStorage` write, an analytics ping, a counter bump). Same rule for `useReducer`'s `init` argument. The fix is not "stop using lazy init" — it's "keep the initializer pure"; side effects belong in an effect or a handler.
- The side-effect-in-render case: an analytics call placed in the render body fires twice. Fix: move it to an effect or an event handler (forward-ref lesson 4's "you might not need an effect" only lightly — here the point is *render must be pure*, not *which tool*).

Exercise — **`PredictOutput`** is the perfect device to make the doubling *felt*. Give a tiny program: a module-level `let count = 0`, a component whose `useState` initializer does `count++` and logs, rendered under `<StrictMode>`. Ask what it logs. The expected output shows the initializer log twice (and/or `count` ending at 2). `PredictWhy`: "Strict Mode runs the initializer twice in dev to check it's pure. It isn't — it mutates a module variable — so the doubling is visible. A pure initializer would log nothing observable twice." This turns the abstract "runs twice" into a concrete, surprising result the student predicts and verifies. Keep the program small enough that the output is unambiguous; favor logging over relying on `count` if console output reads cleaner.

### Don't fight the messenger

Goal: the behavioral payload of the whole lesson. The junior anti-fix and why it's wrong, framed against real React 19 production behavior.

- The anti-pattern, named explicitly: a junior sees the effect run twice, reaches for `const didRun = useRef(false)` and `if (didRun.current) return;` to suppress the second setup. Show this in a `Code` block flagged clearly as the **wrong** fix (use an `Aside type="danger"` or a `del`-marked variant). It silences the symptom and leaves the leak: the first subscription is still never cleaned up; the guard just hides the second one.
- Why it's actively dangerous in 2026: React 19's concurrent features — transitions, prefetching, and the **Activity API** (`<Activity>`, which hides and later re-shows a subtree, cleaning up and re-running effects) — legitimately mount, unmount, and remount components *in production*, not just under Strict Mode. A guard that assumes "setup runs exactly once forever" is wrong against real production behavior. Strict Mode isn't a dev fiction; it's a *preview* of what production already does.
- The rule, stated as the lesson's thesis sentence: **write cleanups that make the second mount safe, not guards that prevent it.** The correct fix to "runs twice" is always "add/fix the cleanup," after which the double-mount is harmless — which is exactly what Strict Mode is verifying.
- The Activity API foreshadow is **recognition only** per the chapter outline — one sentence, "Unit 4 covers `<Activity>`; for now, know that production remounts components and your cleanups must handle it." Do not teach the API.

This section earns a live exercise — **`ReactCoding`** (tests mode). Give the student a component with a leaking effect (an interval that increments a counter, or an event listener that's never removed) running under the in-iframe React (Strict Mode behavior modeled). Instruction: "This effect leaks — fix it so it survives remounting." Starter exports an `App` whose effect has no cleanup. Tests assert the cleanup is wired correctly (e.g. after unmount/remount simulation the timer count is 1, or `clearInterval` is observably called — pick an assertion the runner can verify against the DOM/behavior; if a clean Strict-Mode double-mount assertion is awkward in the runner, assert the *behavioral* outcome: the displayed count increments once per tick, not twice). Author note for the building agent: if the runner can't reliably reproduce Strict Mode's double-mount, frame the exercise as "return a cleanup so the interval is cleared" and test that the component renders the expected single-rate behavior — the pedagogical point (write the cleanup) survives either way. Provide a reference solution behind a `<details>` summary. This is the moment the student *does* the fix-shape, not just reads it.

### The signals you'll see from real code

Goal: round out the dev-signal surface so the student recognizes Strict Mode / dev-mode warnings from legacy libraries without learning to author them. Keep brief — recognition tier.

- The Server Components interaction (important, not just trivia): Server Components do **not** run under Strict Mode's double-invocation — they execute once per request on the server. Strict Mode's checks apply at every `'use client'` boundary and below. One-line takeaway: "the doubling is a Client Component phenomenon." This matters because the student's Next 16 app is Server Components by default; they won't see doubling until they cross into client code. Forward-ref the boundary mechanics to Unit 4 (chapter 030) — don't teach `'use client'` here, just name where doubling does and doesn't happen.
- Other dev signals, one sentence: console warnings for deprecated APIs, unsafe legacy lifecycles, and string refs surface in dev. The student won't write these, but should recognize the *warning shape* when an old third-party library triggers one. No examples needed beyond naming them.

Use a compact `Aside type="note"` for the Server Component fact so it's findable; keep the legacy-warning note to a sentence in prose.

### External resources (optional)

One or two `ExternalResource` cards: the official `react.dev` `<StrictMode>` reference and, if it adds value, the React docs "Keeping Components Pure" page (reinforces chapter 023's contract). Optional — include only if genuinely useful; do not pad.

---

## Terms for `Term` tooltips

Strategic, only where a definition unblocks flow without a detour:

- **Strict Mode** — first prose mention, if not already obvious from context: "React dev-only wrapper that double-runs pure code and cycles effects to surface impurity and missing cleanups."
- **cleanup (function)** — since lesson 2 owns the full treatment, a tooltip on first use keeps this lesson moving: "Function an effect returns; React runs it before the next setup and on unmount to tear down what setup created."
- **callback ref** — brief re-jog of chapter 024 lesson 5: "A function passed to `ref={}` that React calls with the DOM node on mount and `null` on unmount."
- **Activity API** — non-obvious name: "React 19 feature (`<Activity>`) that hides a subtree and later restores it, cleaning up and re-running its effects."

Do **not** tooltip `useState`, `useRef`, render, or purity — those are owned, recently-taught concepts the student holds.

---

## Scope

**Prerequisites to redefine concisely (one line each, do not re-teach):**
- Render is a pure function of props/state (chapter 023 lesson 3) — invoke as the contract Strict Mode checks.
- `useState` lazy initializer `useState(() => …)` (chapter 024 lesson 1) — invoke as a thing that now runs twice.
- `useRef` / callback refs (chapter 024 lesson 5) — invoke for the ref-callback double-cycle and the (wrong) `useRef` guard.

**This lesson does NOT cover (defer, do not teach):**
- The `useEffect` signature, dependency arrays, resync-on-deps, the four cleanup pairings, abort/ignore-flag patterns — **lesson 2 of this chapter.** Treat effects as a black box (setup + optional cleanup) here.
- `useEffectEvent` — lesson 3. (May name once as "stable since React 19.2" only if a forward reference is natural; not required.)
- The "you might not need an effect" five-quadrant audit — lesson 4. Resist the urge to expand "move the side effect out of render" into the full catalog.
- `useContext`, concurrent primitives (`useTransition`/`useDeferredValue`), `use()` — lessons 5–7.
- Rules of hooks and the ESLint plugin — lesson 8. (Strict Mode is a runtime check; the lint is static — don't conflate.)
- The Activity API and prerendering surface — Unit 4 (recognition only here).
- The `'use client'` boundary mechanics and Server Components data path — Unit 4 / chapter 030 (only name *where* doubling happens).
- Hydration mismatches — chapter 030 lessons 5–6.
- The React Compiler's purity analysis — chapter 026 lesson 2.

---

## Code conventions notes

- `useEffect` samples here are intentionally minimal black-box shapes (`useEffect(setup, [])`, optional returned cleanup) — a deliberate divergence from the full convention treatment, since lesson 2 owns the proper API. Downstream agents: do not expand these into annotated dependency-array examples.
- Per Code conventions, effects are for synchronization with external systems; the interval/listener/connection examples chosen all model genuine external subscriptions (correct framing), not derived-state or event misuses.
- TS+JS as one language, JSX components — standard. Keep all samples TSX where a component is shown.

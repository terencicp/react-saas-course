# Rules of hooks and the lint that enforces them

Title: `Rules of hooks and the lint that enforces them`
Sidebar label: `Rules of hooks`

---

## Lesson framing

Capstone of chapter 025. Every hook the student met across chapters 024–025 (`useState`, `useRef`, `useReducer`, `useEffect`, `useEffectEvent`, `useContext`, `useTransition`, `useDeferredValue`) rests on two unstated rules. This lesson names them, explains the *one* mechanic that makes both self-evident, and lands the lint that enforces them in every Next.js project by default.

**Core pedagogical bet: teach the mechanic, not the commandments.** A junior memorizes "no hooks in `if`" as arbitrary ritual and is helpless the moment they hit a novel shape (a hook in a `try`, a hook after a `return`, a hook in a `.map`). A senior holds one model — *React identifies each hook by the order it's called in, not by name* — and every rule, every violation, every lint error derives from it. The lesson is built so the student leaves able to *re-derive* the rules from the indexed-slot mechanic, not recite them. This is the course's "explicit over magic" filter applied directly: the rules feel like magic until you see the array of slots underneath.

**Framing the stakes.** These aren't style preferences — a violation produces *silently wrong state*: `useState` hands back another hook's value, an effect fires with the wrong deps. The bug doesn't throw at the violation site; it surfaces as corrupted UI three components away. That's why the rule is mechanical and the enforcement is automated: humans can't reliably spot call-order drift in review, lint can, every save.

**Tone and depth.** The student already *uses* hooks correctly by muscle memory from prior lessons (they've never written one in an `if`). So this lesson is not "here's how to call a hook" — it's the *why it had to be that way* and *what catches you when you slip*. Lead with the mechanic, then the two rules fall out of it, then the lint chapter is mostly "trust it, here's the narrow set of times you'd think about overriding it and why you almost never should."

**The `use()` loose end.** Lesson 7 already told the student `use()` may be called conditionally — "the one deliberate exception." This lesson is where that exception gets *explained* (tracked by reference/tree-position, not by a call-order slot, so there's no slot to desync) and firewalled (do **not** generalize to other hooks). Closing this loop is a named obligation from the lesson-7 continuity notes.

**Compiler relationship.** The student knows from convention (and chapter 026 forward-refs) that the React Compiler is on and auto-memoizes. Be precise: the Compiler reduces how often `exhaustive-deps` *matters* (it inserts deps for the memoization it generates) but `rules-of-hooks` stays absolutely load-bearing — the compiler *relies* on call-order stability to do its analysis. Keep both rules on. Avoid overclaiming the compiler removes the need to understand any of this.

**Scope discipline.** Custom hooks are the natural "where do I apply this?" payoff, but they're chapter 026's surface — touch them only as far as the naming contract requires (a `use*` function may call hooks; that's the lint's signal), forward-ref the rest. Don't pre-teach custom-hook composition.

Running spine: a single tiny component (a couple of `useState` + a `useEffect`) whose slot table the student can hold in their head, mutated to demonstrate each violation. Keep examples deliberately minimal — the lesson is about call structure, not realistic features.

Code handling: most snippets are short structural before/after pairs → `CodeVariants` with `del=`/`ins=` and red/green mark colors (violation pane red, fix pane green). The indexed-slot mechanic is the one place a static block can't carry it → `DiagramSequence` scrubbing the hook-index pointer across renders. The naming/lint-config facts are prose + small `Code` blocks. One `AnnotatedCode` to dissect a multi-violation component if a single block accumulates several distinct flags.

---

## Lesson sections

### Introduction (no header)

Open on the senior question, concretely: a component renders fine, then a user toggles a panel and the counter next to it resets to a stale value — no error, no stack trace, just wrong state. The cause is a `useState` placed inside an `if`. Name the through-line: hooks work *because* they obey two rules — same hooks, same order, every render — and the rules are simple to state, trivial to violate, and fully enforceable by lint. Preview the arc: (1) the mechanic that makes the rules necessary, (2) the two rules themselves, (3) the `use()` exception explained, (4) the two ESLint rules that catch violations before they ship. Connect to prior knowledge: every hook they've used this chapter is governed by this — this lesson is the contract underneath all of them. Keep warm and short.

### How React tells your hooks apart

The conceptual heart. Goal: install the indexed-slot model so every rule becomes self-evident.

Teach it as a story about what React does *not* have: it doesn't track hooks by name or by variable. There's no map from `"count"` to a value. Instead, each render walks the component top to bottom, and React keeps an internal pointer that advances by one on every hook call: 1st call → slot 0, 2nd call → slot 1, 3rd → slot 2. The *position in the call sequence* is the hook's only identity. On the next render, React replays the same walk and expects call N to land on slot N again — that's how `useState` on the second render knows to return the value the first render stored.

Then the payoff: if the *number or order* of calls changes between renders, the pointer misaligns. Call that used to be slot 1 is now slot 2; it reads another hook's state. React has no way to detect this by intent — the slots are positional.

This is the lesson's primary diagram. **`DiagramSequence`** (custom HTML inside steps, not a graph engine — this is a "picture of a specific thing": an array of labeled slots + a moving pointer). Pedagogical goal: make the invisible call-order tracking *visible and scrubable* so the abstract rule becomes a concrete mechanism the student can replay mentally.

Sequence design (~5 steps), two-render walkthrough of a stable component (`const [a] = useState`; `const [b] = useState`; `useEffect`):
- Step 1: Render 1 begins. Slot array empty, pointer at 0.
- Step 2: `useState` for `a` runs → fills slot 0, pointer → 1.
- Step 3: `useState` for `b` → slot 1, pointer → 2.
- Step 4: `useEffect` → slot 2, pointer → 3. Caption: "React recorded three hooks in this order."
- Step 5: Render 2 — same walk, pointer lands each call on the same slot, state restored correctly. Caption: same hooks, same order ⇒ each call finds its own slot.

Keep slot cells as styled HTML `<div>`s with the hook name + stored value; the active slot and pointer tinted. Wrap requirement noted: `DiagramSequence` is its own card, do not wrap in `<Figure>`.

`Term` tooltips here: **hook** (a function that lets a component tap React features — state, effects — across renders), **render** (re-defined briefly: React calling the component function to produce UI; happens many times over a component's life).

End the section by stating the two rules *as consequences* of the mechanic, one sentence each, then expand each in its own section. Framing line to pin: "The rules aren't React being fussy — they're the only way positional slots can work."

### Rule 1 — call hooks at the top level, every render

Goal: the structural rule and its four violation shapes, each tied back to the slot mechanic.

State it: hooks run at the top level of the function body — never inside conditionals, loops, nested functions, or after an early `return`. Every render must reach every hook call, in the same order.

Then walk the violation shapes. For each, the teaching move is the same: *show the slot drift*, don't just label it illegal. Use **`CodeVariants`** (violation pane `red` with `del=`, fix pane `green` with `ins=`) for the canonical two — they're genuine before/after refactors:

- **Hook in a conditional.** `if (show) { const [x] = useState(0); }`. First render with `show=false` skips the call — slot 0 is whatever runs next; flip `show=true` and `useState` now claims slot 0, stealing the next hook's slot. Fix: call `useState` unconditionally at top, branch on the *value* (`if (show) { …use x… }`), not on the call.
- **Hook after an early return.** `if (!data) return <Spinner />; const [x] = useState()`. This is the one juniors hit constantly because the early-return guard *feels* like clean code. The return makes the hook conditional on `data` — loading renders run fewer hooks than loaded renders. Fix: move *all* hooks above *every* early return. This is the highest-value fix in the section — call it out as the pattern they'll actually trip on, the others are rarer.

For the remaining two, prose + a short `Code` block each (lower frequency, don't need full A/B cards):
- **Hook in a loop.** `items.map(() => useEffect(...))` — call count changes when the array length changes. Fix: lift one hook per item into a child component (`<Row key={item.id} />`), each child owns its own stable hook. Forward-ref nothing; this is just the shape.
- **Hook in a nested function / callback.** Not a handler (that's Rule 2's territory) but e.g. inside a `useMemo` factory or an inline helper defined in render — same problem, the call isn't on the top-level path.

Pin the reframe that unlocks all four: **the fix is almost never to remove the hook — it's to make the *call* unconditional and move the *condition* onto the value or into a child.** Conditionals decide what to do with a hook's result, never whether the hook runs.

`Term` tooltip: **early return** (returning JSX before the function reaches its end — short-circuits the rest of the body, including any hooks below it).

### Rule 2 — call hooks only from components or other hooks

Goal: the caller rule, and the naming convention that makes it enforceable.

State it: hooks may be called only from (a) the body of a React function component, or (b) another hook (a function named `use*`). Not from event handlers, not from plain utility functions, not from class methods. Reason back to the mechanic: the slot pointer only exists *during a render of a component*. Call a hook from a click handler and there's no render in progress — no slot array, nothing to index into.

Then the naming contract — frame it as the bridge between the human rule and the machine that enforces it. React (and the lint) decide whether a function is "allowed to call hooks" purely by its name: a function whose name starts with `use` followed by an uppercase letter is treated as a hook and may call other hooks; any other function may not. So `getUser()` calling `useState` is a violation *by name alone* — rename to `useUser()` and the lint accepts it. This is "explicit over magic": the prefix is a load-bearing signal, not decoration.

Short `Code` blocks for the violation shapes (these are recognition, not refactor drills):
- `function handleClick() { const [x] = useState() }` — hook in a handler. Fix: the hook goes in the component body; the handler reads/sets the *result*.
- `function formatPrice() { useMemo(...) }` — hook in a plain util. Fix: name it `use*` if it genuinely needs render-time React features, otherwise it's just a function and shouldn't call hooks at all.

Critical senior nuance to land (don't skip): **naming is a contract the lint trusts, not a guarantee it verifies.** Rename a rule-breaking utility to `useThing` and the lint goes quiet — but the function still runs outside a render and still breaks. The prefix promises the function obeys the rules; it doesn't make it obey them. So the prefix is for functions that *are* hooks, never a trick to silence a warning. This is the watch-out that separates understanding from cargo-culting.

Forward-ref custom hooks in one sentence: writing your own `use*` functions to share stateful logic is chapter 026's subject — here the only thing that matters is that such a function is a legitimate place to call hooks, and the `use*` name is why.

`Term` tooltips: none new needed (component, handler already known); optionally **utility function** if the cohort is shaky — skip if not.

### The one exception: `use()`

Goal: explain (not just restate) why `use()` is exempt, and firewall the generalization. Pays off the lesson-7 promise.

Recall from lesson 7: `use(promise)` and `use(Context)` may be called conditionally, after early returns, in loops — the only React API that may. Now give the *reason*, which this lesson is uniquely positioned to deliver because the student now holds the slot model: regular hooks need call-order stability because they're tracked by *positional slot*. `use()` isn't — a promise is tracked by its *reference identity* and a context by its *position in the component tree*. There's no slot being assigned, so there's no slot to misalign when the call is conditional. The mechanic the other rules protect simply doesn't apply to it.

Contrast crisply (a tight `CodeVariants` or side-by-side `Code`): `if (!ready) return null; const [x] = useState()` is **illegal** (slot misalign) while `if (!ready) return null; const v = use(ctx)` is **legal** (no slot). Same shape, opposite verdict — and the student can now *explain the difference* rather than memorize two facts.

Land the firewall hard, it's the whole risk of this section: **this is exactly one exception, and it generalizes to nothing.** A student who internalizes "well, sometimes conditional hooks are fine" will write a conditional `useState` and ship a slot bug. The exemption is a property of how `use()` is tracked, not a relaxation of the rules. The lint encodes precisely this: it permits conditional `use()` and flags conditional everything-else.

Pin the line: "`use()` is exempt because it has no slot to lose — not because the rules got softer."

`Term` tooltip: **referential identity / by reference** (a value tracked by *which object it is* in memory, not by call position — re-defined briefly; the student met `Object.is`/reference identity in chapters 023–024).

### The lint that enforces this: `eslint-plugin-react-hooks`

Goal: the practical payoff — the two rules ship as lint, on by default, and you trust them. This is where the lesson turns from theory to daily practice.

Frame it as: you will never have to *spot* these by eye — the plugin runs on every save and in CI, and it's already in your project. `eslint-plugin-react-hooks` ships in the default Next.js ESLint config; the student inherits it (cross-ref the project-setup chapter at recognition depth — they don't configure it here). Two rules:

- **`react-hooks/rules-of-hooks`** — enforces Rules 1 and 2 (top-level calls, `use*`-only callers). Structural. Catches hook-in-`if`, hook-after-return, hook-in-loop, hook-in-handler, hook-in-non-`use*`. Frame as: **this one is never disabled, ever** — a violation is a real bug by construction, not a false positive. There is no legitimate "I know better" case, because the slot mechanic is not negotiable.
- **`react-hooks/exhaustive-deps`** — the dependency-array rule the student already met as a "correctness oracle" in lessons 2–3. Re-anchor briefly (don't re-teach deps): it flags reactive values read inside `useEffect`/`useMemo`/`useCallback` but missing from the array; the fix is almost always "add the dep." Note what it *correctly* leaves alone so the student doesn't fight it: `useEffectEvent`-wrapped callbacks (lesson 3), refs (`ref.current`), and stable `useState`/`useReducer` setters — the lint knows these are stable and won't demand them.

Small `Code` block showing the two rule entries in a flat-config `eslint.config` (or the Next.js preset that includes them) — recognition only, so the student knows what they're looking at, not so they hand-author it.

**When (almost never) to disable, and why it's a smell.** This is the senior-judgment beat. Be honest that `exhaustive-deps` has rare legitimate overrides — but raise the bar high and demand a reason in a comment every time:
- A genuinely one-time effect where adding the dep would cause unwanted re-runs *and* `useEffectEvent` doesn't fit — extremely rare in 2026, and `useEffectEvent` (lesson 3) is the right tool for almost all of it.
- A library hook with non-standard dep semantics the lint can't model.

The rule to pin: **a bare `// eslint-disable-next-line react-hooks/exhaustive-deps` with no explanation is a code-review red flag** — disabling the oracle silences a correctness signal. If you disable it, the comment must say why, and "to make the warning go away" is not a why. And `rules-of-hooks` is *never* the one you disable.

Use a small `Aside` (caution) for the disable-is-a-smell rule so it stands out from the surrounding "trust the lint" prose — but the teaching of *which* rule and *why* stays in the section body, not buried in the aside.

`Term` tooltips: **ESLint** (the linter that flags problematic code patterns before they run — re-defined briefly, met in project setup), **CI** (continuous integration — the automated checks that run on every push; skip if already a known term to the cohort).

### Why the rules exist holds even under the React Compiler

Goal: pre-empt the "doesn't the compiler handle all this now?" objection the student will have, given conventions say the compiler is on and removes the manual-memo reflex. Short section, but load-bearing for not misleading.

Be precise about the split:
- The Compiler **reduces how much `exhaustive-deps` matters** for *manual* memoization — since you stop hand-writing `useMemo`/`useCallback`, there are fewer dep arrays for you to get wrong, and the compiler inserts correct deps for the memoization it generates.
- The Compiler **does not touch `rules-of-hooks`.** It *depends on* call-order stability to do its analysis — it reads your component assuming hooks run unconditionally in order. Violate Rule 1 and the compiler's reasoning is invalidated too. So `rules-of-hooks` is, if anything, *more* important under the compiler.

Pin: **keep both rules on. The compiler makes one rule less of a daily worry; it makes the other non-negotiable.** Explicitly rebut the misconception "the compiler means I don't need to understand the rules of hooks" — recognition-depth forward-ref to chapter 026 lesson 2 for compiler mechanics; do not pre-teach.

No new components; prose + the pinned line.

### When it slips past the lint

Goal: the runtime safety net, so the student recognizes the error when (rarely) a violation reaches the browser.

When a rules-of-hooks violation evades lint — a hot-reload edge, a dynamically-shaped call the static analyzer couldn't see, a misnamed library function — React throws at render time: **"Rendered fewer hooks than expected"** (or "more hooks than during the previous render"). Teach the student to *read* this error: it's the slot mechanic complaining at runtime — one render reached a different number of hook calls than the last. The error names the component; the fix is auditing that component for a conditional or early-returned hook call. Tie it straight back to the opening mechanic — this is the same misalignment, now caught a layer later than lint.

Short `Code` block: a minimal component with an early-returned hook and the exact error string in a comment, so the student pattern-matches the message to the cause.

### Check your understanding

Goal: confirm the student can *re-derive* the rules from the mechanic, not just recall them — the lesson's whole bet. Place exercises at the section they reinforce where natural; this is the consolidated check.

- **`MultipleChoice` (single answer)** — the "which is the bug" diagnostic. Present a component with a hook after an early `return` (loading-spinner pattern) and ask what goes wrong; distractors include plausible-but-wrong causes (stale closure, missing dep) so the student must reason from the slot model, not pattern-match prose. `McqWhy` ties it to slot drift. Per component guidance, phrase answers so they're not verbatim lesson text.
- **`MultipleChoice` (multi-select)** — "which of these may be called conditionally?" with `useState`, `useEffect`, `use(promise)`, `use(Context)`, `useRef`. Two correct (`use(...)` forms). Forces the exception/firewall distinction to stick.
- **`Buckets` (twoCol)** — "Legal at this call site" vs "Rules-of-hooks violation." Chips: hook at top level; hook in `if`; `use(ctx)` after early return; `useState` in a handler; hook in `.map`; `use(promise)` in a branch; hook in a `use*` custom hook; hook in `getThing()`. Sorts the whole rule surface in one drill and re-exercises the exception. `instructions` frame: "Sort each call site by whether the rules of hooks allow it."

One hands-on coding exercise is the high-value consolidation:

- **`ReactCoding` (tests-graded, `hidePreview`)** — give a component that renders a spinner via early return *above* a `useState`, so it's a live rules-of-hooks violation; task: restructure so all hooks sit above the early return and the component still short-circuits its render. `instructions`: "This component calls a hook after an early return. Move the hooks so every render reaches them in the same order, keeping the loading short-circuit." Grade source-shaped (the deterministic backbone, since the violation is structural): assert via rendered-DOM probes that both the loading and loaded states render correctly across a state flip, and — since tests run against the DOM — drive a state change that previously triggered the misalignment and assert the counter holds its value. Because diagnostic text is hidden, test *names* must carry the fix ("hooks run before the early return", "counter keeps its value after toggling"). Reference solution behind `<details>`. Keep starter tiny — this is about call placement, nothing else.

### External resources (optional)

`ExternalResource` cards: React docs "Rules of Hooks" page and the `eslint-plugin-react-hooks` page. Optionally the React docs "Render and Commit" / hooks-rules deep dive. No video unless a tight, current (<6 mo relevance) explainer surfaces — do not invent one; the mechanic is better served by the in-lesson `DiagramSequence`.

---

## Scope

**Prerequisites to redefine concisely (not re-teach):**
- *Hook / render* — one-line `Term` each; the student has used hooks all chapter.
- *Reactive value, dependency array, `exhaustive-deps` as correctness oracle* — established in chapter 025 lessons 2–3; re-anchor in one sentence when the lint section needs it, do not re-teach the dep-array contract.
- *`useEffectEvent` exclusion from deps* — lesson 3 owns it; name it here only as one of the things `exhaustive-deps` correctly leaves alone.
- *`use()` conditional-call capability* — lesson 7 introduced the *fact*; this lesson owns the *explanation* and firewall. Don't re-teach the Server→Client streaming pattern.
- *Reference identity / `Object.is`* — chapters 023–024; one-line re-anchor when explaining why `use()` has no slot.
- *React Compiler is on, no manual memo by default* — code convention + chapter 026 forward-ref; state the fact, don't teach compiler internals.

**Explicitly out of scope (belongs elsewhere):**
- **Custom hooks at depth** — authoring `use*` functions to share logic, return-shape conventions (tuple vs object), composing effects inside them → chapter 026 lesson 1. Here: only the naming contract (a `use*` function may call hooks) as far as Rule 2 needs.
- **React Compiler mechanics** — how it analyzes, what it memoizes, `'use no memo'` → chapter 026 lesson 2. Here: only the compiler-vs-lint division of labor.
- **`useMemo`/`useCallback`/`memo` thresholds** — when to hand-memoize → chapter 026 lesson 3. Here: named only as the (now-rare) sites where `exhaustive-deps` applies.
- **Full project ESLint configuration** — flat config setup, plugin install, CI wiring → project-setup chapter (recognition only here; the rules ship in the Next.js default config).
- **`useEffect` mechanics, cleanup, race patterns** — lesson 2. Not re-taught; the running example uses a bare effect as a slot occupant only.
- **The DevTools Profiler / render debugging** → chapter 026 lesson 3.
- Do **not** generalize the `use()` exception into any broader "conditional hooks are sometimes ok" claim — actively firewalled.
- Do **not** teach the legacy `experimental_useEffectEvent` import or any pre-stable API surface.

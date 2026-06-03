# Remounting with key

- **Title:** Remounting with key
- **Sidebar label:** Remounting with key

---

## Lesson framing

This is the lesson where reconciliation stops being a thing that happens *to* the student and becomes a tool the student *wields*. L2 taught the mechanism — a change of type, position, or `key` at a slot remounts (full reset: state gone, refs reset, effect cleanup→rerun). L5 cashes that one fact in as a deliberate state-management move: **change the `key` on purpose to throw away local state when the identity behind a component changes.**

Senior framing, the spine of the lesson: `key` is not list cosmetics, it is **identity** — and identity is something you *choose*. When the thing a stateful component represents changes (the selected record, the current message, a reset click), you tell React "this is a different instance now" by giving it a different key. That's the whole idea. Everything else is knowing when this is the right reach versus when it's papering over a structural problem.

The load-bearing pain point this relieves: the **record-bound form that shows the previous record's edits**. The student has built (Ch 022) and will build (Unit 6) forms; the bug where switching the selected user leaves Alice's half-typed edits sitting on top of Bob's data is visceral, common, and the canonical motivation. The naive fix the student would reach for — a `useEffect` that watches the id and clears every field — is the *wrong* fix: brittle, forgotten the moment a field is added, and a preview of the "you might not need an effect" smell (Ch 025 L4). The `key` reset is one attribute and it can never go stale. That contrast — `key` line vs. clear-fields effect — is the lesson's central "senior would do X" moment.

Pedagogical strategy, cognitive-load-first:

1. **Lead with the bug, not the API.** Open on the broken record-bound form (the senior question). Let the student *see* stale edits survive a selection change. Only then name the cause (reconciliation kept the instance — callback to L2) and the fix (one `key`).
2. **One mechanism, three faces.** The mechanism is identical to L2's remount; the lesson's job is pattern-recognition, not new theory. Teach the canonical record-bound form fully, then show the same trick wearing two other costumes (animation replay, button-bump reset) *fast* — they're variations, not new lessons. Resist re-deriving the mechanism each time.
3. **The decision is the lesson.** The durable skill is the *judgment*: reset-by-key vs. lift-to-parent vs. derive-in-render vs. controlled-component. A junior who learns only "bump the key" will overuse it. Frame `key` as one of several tools and give an explicit decision filter (a `StateMachineWalker`) so the student leaves with the *when*, not just the *how*.
4. **Name the costs honestly.** A remount is not free — effects tear down and re-run, refs re-attach, DOM nodes recreate, animations replay, scroll/expanded state is lost. The senior reach is deliberate. Surface the two foot-guns hard: an unstable key (`Math.random()`/`Date.now()` inline) = remount-every-render loop; a key reset that nukes state the user wanted to keep.

Mental model the student should leave with: *"Local state lives at `position + key`. Keep both stable and React reuses the instance; change the key and React hands you a fresh one. So when a stateful component's identity changes, change its key — and reach for it only when the state has a natural owner the parent already tracks."*

What the student should be able to do: spot the stale-edits-on-record-switch bug class; fix it with `key={record.id}`; implement a button-driven form reset with a bumped key; explain why an unstable key loops; and choose correctly between key-reset, lifting state, derived state, and a controlled component for a given scenario.

This lesson sits late in Ch 023, after the student has the full render model (L1), reconciliation + the remount rule (L2), purity (L3), and state-as-snapshot (L4). It leans on all four but teaches no new React primitive — it's an *application* lesson. Keep the `useState` surface at the L3/L4 primer level; the full API is Ch 024.

Tone: terse, senior, decisions-first (per pedagogical guidelines). No "what is a form." Code samples illustrate decisions, not syntax drills.

---

## Lesson sections

### Introduction (no header)

Warm, brief, problem-first. Open with the concrete scene: a master-detail screen — a list of users on the left, an editable form on the right. Pick Alice, type a new email but don't save, click Bob. Bob's name loads… but your half-typed email is still sitting there. State leaked across the selection change.

Connect to what they know: in L2 they learned React keeps the same component instance at a slot across renders and just updates props — that's *exactly* why the form's local state survived. Here that "feature" is a bug. Preview the fix in one line — `<UserForm key={selectedUser.id} … />` — and promise that by the end they'll know not just this trick but *when* to reach for it versus three alternatives. Name the spine: **a `key` is identity, and you get to choose it.**

Keep it to ~4-6 sentences. Do not explain the mechanism yet — that's the next section's payoff.

### A key change is a remount, on purpose

**Goal:** re-anchor the L2 mechanism and reframe it as a deliberate tool. This is the conceptual core; everything after is application.

Content:
- Restate the L2 rule in one tight sentence: state and refs belong to `position + key`; keep type, position, and key the same and React *reuses* the instance, change any one and React **remounts** (unmount old → mount fresh). Reuse `Term` for **remount** if L2's definition isn't assumed inline; otherwise a one-line callback.
- The reframe: L2 met remount as something that *happens* (and a bug source). Here we *cause* it. Same component, new key = "treat this as a different instance." It's reconciliation used as a state-reset switch.
- Spell out precisely what a remount discards/does, so the cost is concrete from the start: local `useState` resets to its initial value, refs reset, `useEffect` cleanup runs then fresh effects run, DOM nodes are recreated (not patched). This is the same list as L2's remount — reinforce, don't re-derive.
- Anchor to the chapter's phase strip (`Trigger → Render → Reconcile → Commit`): the key change is decided in **Reconcile** (React matches the new element to *no* previous instance at that slot, so it builds a new one). Keeps the chapter's spine consistent.

**Diagram — DiagramSequence, "same slot, key changes":** 3-4 steps showing one slot in the tree across two renders.
- Step 1: Render A — slot holds `<Form key="alice">` with internal state badge `email: "a@…(edited)"`.
- Step 2: parent switches selection; Render B produces `<Form key="bob">` at the *same slot*.
- Step 3: Reconcile — React compares keys (`alice` ≠ `bob`), finds no match, so it **unmounts** the alice instance (state discarded, shown crossed out) and **mounts** a fresh bob instance (state back to initial).
- Step 4 (optional): Commit — old DOM node torn down, new one built; the form shows Bob's data with empty edits.
Pedagogical goal: make "key change = new instance = state reset" *visual*, not just asserted. Hand-coded HTML/CSS boxes inside `DiagramStep` (small labeled component boxes with a state badge), consistent with the chapter's hand-built diagram style. Cap height; horizontal layout.

**Term candidates:** `remount` (if not assumed from L2). Keep it to one — this section is mostly callback.

No exercise here; the payoff exercise lives after the canonical pattern.

### The record-bound form, fixed with one line

**Goal:** the canonical pattern, taught fully. This is the section the whole lesson orbits. Show the bug, the wrong fix, and the right fix side by side.

Content:
- Set up the minimal master-detail: a parent owns `selectedUser` (one of a small list); a child `<UserForm user={user} />` keeps `name`/`email` in local `useState`, initialized from props. Selecting a different user re-renders the parent with a new `user` prop.
- The bug: because the `<UserForm>` instance is reused across the selection change (same type, same slot, no key), its local state *survives* — the form still shows the previously selected user's typed-but-unsaved edits. This is the L2 "state belongs to the slot, not the item" rule biting in production.
- The wrong fix (name it, show it, reject it): a `useEffect(() => { setName(user.name); setEmail(user.email); }, [user.id])` that re-syncs every field when the id changes. Why it's wrong: it's one `setState` per field (forgotten the instant someone adds a `phone` field), it runs *after* an extra render so there's a flash of stale state, and it's the textbook "derive/reset state with an effect" smell. Flag forward to Ch 025 L4 ("you might not need an effect") in one line — don't teach effects here.
- The right fix: `<UserForm key={user.id} user={user} />`. Changing the key on selection remounts the form; local state resets to the new user's data with zero per-field bookkeeping. One attribute, can't go stale, scales to any number of fields for free.

**Component — CodeVariants, the three-way comparison** (this is the lesson's centerpiece; CodeVariants is purpose-built for incorrect/correct framing):
- Tab "Stale (buggy)": parent renders `<UserForm user={user} />` with no key. Prose: state survives the switch → previous edits leak onto the next record. Use a `<div data-mark-color="red">` wrapper or `del`-style emphasis on the missing-key line.
- Tab "Effect re-sync (don't)": the `useEffect`-clears-fields variant. Prose (first sentence carries the verdict): works, but brittle and effect-smelly — one setter per field, an extra render, breaks when a field is added. Color orange.
- Tab "key reset (do)": `<UserForm key={user.id} user={user} />`. Prose: one attribute, declarative, scales for free — the senior default. Color green; `ins`-mark the `key`.
Keep each tab's prose to the six-line ceiling; the surrounding decision detail goes in body prose, not the tabs.

Show the `<UserForm>` body once (above or below the variants) as a plain `Code` block so the reader knows where the local state lives — `const [name, setName] = useState(user.name)` etc. Keep it to the L3/L4 `useState` primer surface. Note for downstream: initializing state from props here is the *exact* shape that makes the bug exist; that's deliberate, don't "fix" it with a controlled pattern — the controlled alternative is discussed in its own section.

**Exercise — ReactCoding, exploration or target-match, `live` on:** the student fixes the leaking form by adding the `key`.
- Starter: a working master-detail (two or three hard-coded users, a list of buttons to select, a `<UserForm>` child with local state from props) that exhibits the bug — type in a field, switch user, edits persist.
- Task (instructions): "Switching users leaves the previous user's edits in the form. Add one attribute so each user gets a fresh form." 
- Grading: prefer a `tests` block asserting behavior over visual match — e.g., simulate selecting user A, the form is pre-filled with A's data; this is hard to assert via DOM events in this runner, so the realistic shape is **exploration mode** (no tests/target) with a `<details>` reference solution showing the `key={user.id}` line, OR a **target-match** where the target is a correctly-keyed version and the student matches behavior by clicking. Choose exploration + reference solution if test-driving the click flow is unreliable in the iframe; the one-line edit is self-evidently checkable by the student playing with it. Downstream agent: pick the mode that grades reliably given the runner's event-simulation limits; the pedagogical point is the *single-line fix*, keep the starter tiny so the diff is one attribute.

**Term candidates:** `master-detail` (the UI pattern — junior from another field may not know the term).

### When the form should be controlled instead

**Goal:** the first and most important alternative — prevent the student from reaching for `key` when the cleaner answer is "the child shouldn't own this state at all." Decisions-first.

Content:
- The cut: a `key` reset is for a child that *legitimately owns* local state but needs an identity-driven reset. If the parent could own every field instead (a **controlled** form: parent holds the values, passes them down, the child is presentational and writes back via callbacks), there's *no local state to reset* — switching records just rewrites the props and the form follows. No key needed.
- The senior heuristic, stated plainly: **if you find yourself reaching for `key` resets on every prop change, the state probably wants to live in the parent.** A key reset is the right tool when local state has a real home in the child (a draft the parent shouldn't track keystroke-by-keystroke) but must reset on identity change.
- Concretely contrast the two designs for the same form: (a) uncontrolled-ish child owns the draft → reset via `key`; (b) controlled child, parent owns values → reset is automatic. Neither is universally right; the choice is *who owns the draft*. Forms-as-controlled is Unit 6's territory — name it, don't teach the form surface here.

**Component — CodeVariants or TabbedContent, "two designs, same form":** two tabs.
- "Child owns the draft → key reset": the section's prior shape, `key={user.id}`.
- "Parent owns the values → controlled": parent holds `useState` for the fields, passes `value`/`onChange` down, no key — switching `selectedUser` just sets the parent's state. Prose names the trade: parent re-renders per keystroke, but state has one source of truth and resets fall out for free.
Keep it short; this is a judgment contrast, not a forms tutorial. Cross-reference Unit 6 for the real form patterns and Ch 024 L4 for lifting state.

**Term candidates:** `controlled component` (`Term` — value lives in React state / the parent, not the DOM; the student met uncontrolled inputs in L2 and full controlled inputs are Unit 6, so a one-line bridge is warranted).

### The same trick, two more faces

**Goal:** pattern-recognition breadth. Show the identical mechanism in two other common situations *quickly*. These are variations — do not re-derive the mechanism; lean on "same as the form, different costume."

#### Replaying an animation on content change

Content:
- A toast/alert that should *re-play* its entrance animation whenever its message changes. Without a key, React updates the text in place — the component never remounts, so the mount-time animation runs only once and subsequent messages slide in silently.
- Fix: `<Toast key={messageId} message={message} />`. Each new message id is a fresh mount → the entrance animation fires again. The animation "knows" nothing about messages; the *remount* is what replays it.
- Tie back: this is the same "new key = fresh instance" fact; here the thing being reset isn't form state, it's the not-yet-played mount animation (CSS animation runs on mount of a new DOM node).
- Code: a small `Code` block — the keyed `<Toast>` plus a one-line note that the entrance is a CSS/`motion-reduce`-guarded animation (keep styling minimal; the lesson is the key, not the animation). Respect `motion-reduce` per code conventions.

#### A reset button that bumps the key

Content:
- The scenario: a "Reset form" / "Start over" button (multi-step wizard, search panel) that should clear the child without unmounting the parent or threading a reset through every field.
- The pattern: hold a counter in the parent, render `<Form key={resetKey} … />`, and `setResetKey(k => k + 1)` on click. Bumping the key remounts the form → clean slate. Note the **updater form** `k => k + 1` (callback to L4 — next-depends-on-prev) so this stays consistent with the chapter.
- Why this over a manual clear: same argument as the record-bound form — one mechanism resets *all* descendant state at once, no per-field bookkeeping, can't drift as fields are added.

**Component — AnnotatedCode** for the reset-button pattern (small enough that one annotated block beats two tabs): walk the three load-bearing lines — (1) `const [resetKey, setResetKey] = useState(0)`, (2) `<Form key={resetKey} />`, (3) `onClick={() => setResetKey(k => k + 1)}`. One step each, colored, 6-line prose cap. Pedagogical goal: the student sees that the *only* moving part is an integer whose change forces the remount.

Group the two faces under this single h2 with the two h3s so it reads as "the same idea, applied twice," reinforcing that no new mechanism is being introduced.

**Term candidates:** none new — `remount` already defined.

### Choosing the right reset: key, lift, derive, or control

**Goal:** the durable senior skill — the decision filter. This is what separates "knows the trick" from "knows when." Make the *when* explicit and interactive.

Content:
- Lay out the four reaches plainly, each with its trigger:
  - **`key` reset** — the child legitimately owns local state (a draft) that must reset when a specific identity (record/message/session the parent already tracks) changes.
  - **Lift state to the parent** (Ch 024 L4, named) — a sibling needs to read the state, or the parent should be the single source of truth; the child becomes controlled.
  - **Derive in render** (Ch 024 L2 / Ch 025 L4, named) — the value is *computable from props/other state*; don't store it at all, compute it during render. The antidote to "store a copy of a prop in state."
  - **Persist (do nothing)** — the state should *survive* the identity change (scroll position, expanded sections the user opened); resetting would be a bug.
- The anti-reach, stated as a rule: don't reach for `key` when derived state or lifting is cleaner; don't reset state the user wants kept.
- Honest cost recap so the decision is informed: a remount runs every effect's cleanup then re-runs them (subscriptions/sockets tear down and re-establish), refs re-attach, animations replay, DOM recreates. Imperceptible for most components; measurable for a heavy subtree with expensive mount logic — name it as the trade-off, not a prohibition. Also: **key the smallest subtree that owns the state** — put the key on the top component of the reset target, not a deep leaf (resets only that leaf) and not a too-high ancestor (nukes more than intended).

**Diagram/exercise — StateMachineWalker (`kind="decision"`):** "Which reset reach?" The walker forces the student through the *order a senior asks the questions*, which is the actual lesson.
- Root question: "Does the state need to survive when the identity changes?" → Yes → Leaf **Persist / don't reset** (resetting would lose scroll/expanded state the user expects).
- No → "Can the value be computed from props or other state?" → Yes → Leaf **Derive it in render** (don't store a copy; cross-ref Ch 024 L2).
- No → "Does a sibling need to read this state, or should the parent be the single source of truth?" → Yes → Leaf **Lift to the parent** (child becomes controlled; cross-ref Ch 024 L4).
- No → "Does the child legitimately own a draft that should reset when a specific identity changes?" → Yes → Leaf **`key` reset** (key the owning subtree by that identity).
Each leaf's body: one line on *why* and the canonical example. Pedagogical goal: install the decision *order* (persist? → derive? → lift? → key) so `key` is correctly the last reach, not the first. This is the section's centerpiece — prefer the walker over a static prose list.

**Term candidates:** `derived state` (`Term` — state computed from existing props/state rather than stored; recognition-level, full treatment Ch 024).

### Two ways to break a key reset

**Goal:** the two foot-guns, taught as the failure modes of *this lesson's* tool (per guidelines — watch-outs live with the concept they qualify, and these are specific to key resets, so they earn a short section).

Content:
- **Foot-gun 1 — the unstable key (remount-every-render loop).** `<Form key={Math.random()} />` or `key={Date.now()}` generated inline in render: the key changes on *every* parent render, so the form remounts every render — state can never persist, effects thrash, focus is lost, it's effectively unusable. The rule: **the key must change only when the reset is intended** — derive it from the identity (`user.id`) or a deliberately-bumped counter, never from a fresh random/time value each render. This is the L2 `Math.random()`-as-key bug seen from the reset angle.
- **Foot-gun 2 — resetting state the user wanted kept.** A `key` change discards *all* local state in the subtree, including state the user expects to survive — scroll position, an expanded/collapsed panel, an in-progress sub-selection. Be deliberate about *what* the key wraps and *when* it changes. If only part of the subtree should reset, key only that part.
- One more practical note, brief: a remounted child starts from `useState`'s *initial* value — if the new instance should be pre-filled, pass it via props and initialize from them (`useState(user.email)`), which is exactly the record-bound-form shape; lazy-init `useState(() => …)` is named once for the expensive-initializer case (forward to Ch 024 L2), not taught.

**Component — CodeVariants, "unstable vs. stable key":** two tabs.
- "Loops (broken)": `key={Math.random()}` inline; prose: new key every render → remounts every render → unusable. Red.
- "Stable": `key={user.id}` (or `key={resetKey}`); prose: changes only on the intended identity switch. Green.
Short, A/B glance.

**Exercise — PredictOutput** to make the loop visceral and deterministic: a tiny component that logs in `useEffect(() => console.log('mounted'), [])` (named as "runs on mount"), rendered as `<Child key={Math.random()} />` inside a parent that re-renders N times (e.g., a parent counter bumped a couple times). Ask what it prints. Expected: "mounted" once per render (a fresh mount each time) rather than once total — the visceral signal that the component is remounting on every render. `<PredictWhy>`: an inline `Math.random()` key changes every render, so React unmounts and remounts the child each time, re-running the mount effect; a stable key would print "mounted" only once. This drill reuses the chapter's "effects run on mount" recognition (named, not taught) and the deterministic-stdout fit for PredictOutput. Downstream: keep the program's render count small and deterministic so the expected output is unambiguous.

**Term candidates:** none new.

### External resources (optional)

Optional `ExternalResource` cards to React's official docs — the two pages that own this material:
- "Preserving and Resetting State" (react.dev) — the canonical treatment of position+key identity and the key-reset pattern; the single best follow-up.
- "You Might Not Need an Effect" (react.dev) — reinforces why the effect-clears-fields fix is the wrong reach (resetting state when a prop changes is one of its named anti-patterns).
Resourcer-optional; a `VideoCallout` is *not* prioritized for this lesson — the concept is better served by the interactive diagram/walker and the live edit than by video. Mention as low-priority only.

---

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- The remount rule from L2 (type/position/key change → unmount old, mount fresh, full reset) — restate in one sentence as the foundation; L2 owns the mechanism derivation, the heuristics, and index-as-key.
- `useState` only at the L3/L4 primer surface: `const [v, setV] = useState(init)`; read = this render's snapshot; `setV(next)` schedules a re-render; updater form `setV(c => …)` when next-depends-on-prev. Use it; don't expand it.
- The phase strip `Trigger → Render → Reconcile → Commit` (chapter spine) — anchor to it, don't redraw it from scratch.
- Inline JSX literal identity / `Object.is` (L1) — assumed; not re-explained.

**Explicitly out of scope (defer, do not teach):**
- `useState` full API, typing, lazy initialization, props-as-initial-state mechanics — Ch 024 L1/L2 (lazy init named in one line only).
- Derived state and the "you might not need an effect" rule as *taught* surface — Ch 024 L2 and Ch 025 L4 (named as decision branches, with one-line cross-refs; the effect-clears-fields anti-pattern is *shown and rejected*, not taught as how-to).
- Lifting state up — Ch 024 L4 (named as a decision branch only).
- `useEffect` signature/lifecycle/cleanup/deps — Ch 025 L2 (remount "effects clean up then re-run" is *named* as a cost; the effect anti-fix is shown only to reject it; "mounted" log in the PredictOutput is recognition-level, not an effects tutorial).
- Reconciliation mechanics, the two heuristics, index-as-key, fragments-and-keys — Ch 023 L2 owns them; this lesson assumes them.
- `useImperativeHandle` / imperative `reset()` methods — recognition only at most; the course default is the declarative `key` reset. (Ch 022 L4 owns the API.) Mention in one line under the decision section *only* if it fits without bloat; otherwise omit — it's a named-and-rejected alternative, not core.
- Controlled-input mechanics, `value`/`onChange` wiring, form submission, Server Actions — Unit 6. The "controlled instead" section names the *design choice* and the ownership cut, not the form surface.
- Suspense-boundary remount behavior (fallback re-shows on key change) — Ch 031 territory; omit or one-line at most.
- Server-side identity / keys across SSR — Unit 4 (Ch 030+) territory; out of scope.
- The React Compiler — out of scope here (Ch 026); no memoization discussion.

---

## Notes for downstream agents

- **Hold the L2 boundary in reverse:** L2 deliberately did *not* teach the key-as-reset tactic so this lesson could own it. Do not spend prose re-deriving the remount mechanism — one tight callback sentence, then apply it. The reader arrives knowing *that* a key change remounts; the lesson teaches *when to make it happen on purpose*.
- **Deliberate "anti-pattern" code shipped on purpose** (flag for reviewers, mirroring the chapter's house style): the no-key buggy form, the `useEffect`-clears-fields fix, and the `key={Math.random()}` loop are *exposed to be rejected*, not to be "fixed" inline by importing Ch 024 machinery. The convention-correct shape is the `key={record.id}` / `key={resetKey}` variant in each comparison.
- **`useState` discipline:** initializing state from props (`useState(user.email)`) is the shape that *creates* the record-bound-form bug — keep it; it's intentional, not a smell to correct. Stay within the L3/L4 primer; no lazy-init expansion beyond the one-line name.
- **Code conventions to honor:** arrow components bound to `const`; `key` tied to data identity (`user.id`), never array index; updater form `setResetKey((k) => k + 1)` (parenthesized arrow, Biome); `motion-reduce:` on the toast animation; React 19 refs as plain props if a ref appears (no `forwardRef`). Two-space indent, single quotes.
- **Exercise mode call:** for the record-bound-form `ReactCoding`, pick exploration-mode + `<details>` reference solution if simulating the select→type→switch flow in the iframe runner is unreliable; the one-attribute fix is self-evident to a student playing with the live preview. Keep the starter minimal so the fix diff is a single `key` attribute.
- **MDX is being authored from this outline** — no existing L5 MDX or L2 MDX file to inherit from (only L2 continuity notes exist); rely on the continuity notes' established terminology (`remount`, the phase strip, "state belongs to the slot") for consistency, not on a file.

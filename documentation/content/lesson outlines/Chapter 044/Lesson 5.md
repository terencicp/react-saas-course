# useOptimistic with implicit rollback

**Title (h1):** Instant UI with useOptimistic
**Sidebar label:** useOptimistic

---

## Lesson framing

Brainstorm conclusions that shape the whole lesson:

- **This is a *decision* lesson first, a *mechanics* lesson second.** The single most important takeaway is the threshold: **the 2026 default is NO optimism.** `useOptimistic` is a conditional power-tool, and the senior skill is knowing the small set of mutations that earn it. Lead the lesson with the trigger, not the hook. A student who leaves able to type the hook but who reaches for it on a payment form has learned the wrong thing.
- **The pain it relieves is concrete and felt:** the user clicks "Like", the action round-trips 200ms, the UI sits frozen, the click feels broken, the user clicks again. The student has *already lived* the pending-state answer to this from L3 (`isPending`) and L4 (`<SubmitButton>` spinner). Frame `useOptimistic` as the next rung: pending state says "working on it"; optimistic UI says "done" — and shows the result *now*, before the server confirms. The lesson must position it relative to the pending-state tools the student already owns, not as a replacement for them.
- **The headline feature is *implicit rollback*** (it's in the lesson title). The whole reason React shipped this hook instead of leaving you to `useState` it yourself is that React owns the rollback. The student's prior mental model — "optimistically `setState`, then `try/catch` and manually revert on error" — is exactly the burden this hook removes. Make the contrast explicit: show the manual version's bookkeeping (snapshot, apply, revert, reconcile temp→real id) as the strawman, then show React doing all of it. The "you don't write rollback logic" beat is the lesson's emotional payoff.
- **The hardest *conceptual* hurdle is the data-flow loop**, not the hook signature. The signature is two lines. What trips students: *where does `actualState` come from, why does the optimistic value "fall away", and what makes it reconcile correctly?* The answer is the Server-Component-owns-truth / Client-owns-optimism boundary plus the `revalidatePath` refresh from ch.043. This must be visualized — a timeline diagram is the load-bearing teaching asset of this lesson.
- **The "transition" gotcha is the #1 trap.** `addOptimistic` must be called *inside a transition*. Called outside one, React shows a console warning — *"An optimistic state update occurred outside a Transition or Action. To fix, move the update to an Action, or wrap with `startTransition`."* — and the optimistic value briefly renders then reverts (it does **not** persist). For the form case the transition is automatic (the `action` prop / `formAction` wraps the submit in a transition). For the imperative case (a like button outside a form), the student must wrap the call in `startTransition` themselves. This is the chapter's analogue to L2's "function reference is the contract" and L3's "bound formAction is the whole point" — name it sharply and drill it. (Verified against the React docs, Feb 2026: a *warning* + brief-render-then-revert, not a silent no-op — teach the real symptom.)
- **Mental model the student should end with:** "The server owns the truth; the client *borrows the future* for one render. I describe the borrowed state with a pure reducer, fire it inside a transition, and React snaps back to the truth — whether the action succeeds or fails — when the transition settles. I write zero rollback code." 
- **Two worked vehicles.** (1) The canonical **add-to-a-list** form case (an "add comment" flow) — this pairs `useOptimistic` with `useActionState` and demonstrates the client-UUID reconcile. (2) The **imperative toggle** (a "star"/like button outside a form) — this isolates `startTransition`. Teaching both is justified because they are the two genuinely different call shapes; the watch-outs differ between them.
- **Cognitive-load staging:** simplest-first. Start with the threshold (no code). Then the *imperative toggle* is actually the simpler mechanical case to introduce the hook (single boolean, no list keys, no FormData) — but the chapter's narrative entity is the comment list and the form pairing is the production-shaped one. Resolve this by: introduce the hook's shape on the **toggle** (boolean reducer, the `startTransition` requirement laid bare), *then* graduate to the **list add** where the reducer appends and the UUID-reconcile + `useActionState` pairing enter. Add complexity in layers; never show the full list+UUID+two-hook version cold.
- **Worked entity:** continue the chapter's `invoices` domain where natural, but the optimistic *list* example is cleaner as **comments on an invoice** (`addComment` / a `comments` list) — a low-stakes, high-success-rate, visible, small-UI-change mutation, which is precisely the textbook trigger. This is consistent with the chapter outline (it names "add comment" as the canonical case) and with ch.047 (the project uses it "once for the create-comment optimistic flow"). The toggle example can be a "star this invoice" flag on the same domain. Flag for continuity: downstream/project should keep `addComment` + `comments` as the optimistic vehicle.
- **Exercises:** the threshold deserves a `StateMachineWalker` decision filter (the senior order of questions). The hook mechanics deserve one hands-on `ReactCoding` exercise — but with the same carve-out L3/L4 established: the action is **mocked client-side** (ReactCoding runs in an iframe, no server), graded on rendered-DOM behavior, with an explicit aside that this is pedagogical staging, not a production action. A `Sequence` or `PredictOutput` drill can lock in the rollback timeline.
- **Tooltips:** be strategic. `transition` and `UUIDv7` are the two terms worth a `Term`. Do NOT re-Tooltip terms the student owns by now (`useActionState`, `isPending`, `Result`, `'use client'`, `revalidatePath`, `Server Component`).

---

## Lesson sections

### Introduction (no h2 — lesson preamble)

Open on the felt problem, in the student's own recent experience. They just built (L3/L4) a form that disables its button and shows "Saving…" while the action runs. That's honest for a *create-invoice* submit. But picture a "Like" on a comment, or flipping a "starred" flag, or a cart quantity stepper: a 200ms freeze on a one-tap interaction reads as *broken*, and the user taps again. Pending state ("working on it") is the wrong register here; the user wants to see it *done now*. State the lesson goal: meet `useOptimistic`, React 19's hook for the narrow-but-real set of mutations where the UI should update immediately and reconcile with the server after — *with rollback React handles for you.* Preview the two things they'll leave with: (1) a sharp **decision rule** for when optimism earns its weight, and (2) the **hook + transition + reconcile** mechanics for the cases that pass the bar. Keep it to ~2 short paragraphs. Plant the anchor line for the lesson: **"the server owns the truth; the client borrows the future for one render."**

### When optimism earns its weight

**This section comes first and carries the lesson's primary lesson.** Rationale: pedagogical guidelines mandate "trigger before tool" for conditional power-tools — and `useOptimistic` is exactly that. The default the student must internalize is **no optimism**; this section names the threshold the default crosses.

Teach the decision as three coordinates that must *all* hold:
- **High success rate.** The mutation almost always succeeds. Toggles, reorders, like/unlike, "mark as read", cart-quantity nudges. A rollback should be a rare exception, not a routine outcome.
- **Visible to the user.** The user is *watching the thing change*. Optimism buys perceived performance only if the user's eyes are on the affected UI at click time.
- **Small UI change.** A flag flips, an item appends, a count increments. Cheap to render optimistically, cheap to snap back.

Then the *anti*-triggers, stated as the mutations to keep on plain pending state (the L3/L4 tools):
- **Failure-prone submits** — validation-heavy create/edit forms, anything with cross-resource business rules (plan limits, uniqueness). A rollback here feels like a bug; the user typed data and watched it vanish.
- **Payments / irreversible / high-stakes** — never optimistic. The user must see the real confirmation.
- **Result the user isn't watching** — a background autosave, a delete behind a long undo window. Nothing to gain; the immediate frame buys no perceived speed.

Land the rule as a memorable formula: **high success rate + visible to the user + small UI change = optimistic. Miss any one → pending state, not optimism.** Reinforce: this is *additive UX polish* on top of a correct action — the action, its Zod parse, its `Result`, and its `revalidatePath` are identical whether or not you add optimism (anchor forward to L7: optimism is a JS-only enhancement).

**Exercise — `StateMachineWalker` (`kind="decision"`).** This is the ideal component for "the order a senior asks the questions." Force the walk: *Does the user see the change happen?* → *Does it (almost) always succeed?* → *Is the UI change small/local?* Leaves: "Optimistic — `useOptimistic`" for the path that clears all three; "Pending state — `useActionState` / `<SubmitButton>`" for the others (with the reason naming *which* coordinate failed). Include leaves for the textbook cases: like-button (optimistic), payment submit (pending), background autosave (pending — user isn't watching). The lesson lives in the *order*, not any single leaf. No `diagram` slot needed (decision tree, not a cyclic machine).

### The cost of doing it by hand

Short motivating section *before* the hook — establishes what `useOptimistic` removes, so the hook lands as relief rather than as one more API. Rationale: the senior framing is "why does this hook exist?"; the answer is the manual bookkeeping it deletes.

Show, as a strawman, the pre-React-19 reflex for an optimistic toggle in plain `useState`: keep a local `starred` state, flip it on click, fire the action, and on failure `try/catch` and revert — plus, for the *list* case, snapshot the array, append a temp item, and on success swap the temp id for the real one (or refetch). Use a single `Code` block (not AnnotatedCode — the point is the *volume* of bookkeeping, seen at a glance) with terse comments marking each chore: `// snapshot`, `// apply`, `// revert on error`, `// reconcile temp → real`. Keep it ~12–16 lines, deliberately a little tedious.

Then the turn: every one of those chores — apply, revert-on-success, revert-on-failure, discard-after-reconcile — is what React 19 now owns. The student writes the *desired* state via a pure reducer and fires it; React does the rest. Transition straight into the next section.

### The useOptimistic hook

Teach the signature and the imperative toggle as the *first, simplest* mechanical case. Rationale (from framing): a single boolean reducer, no list keys, no FormData — the cleanest surface to expose the hook and the `startTransition` requirement before list complexity enters.

**Signature.** `const [optimisticState, addOptimistic] = useOptimistic(actualState, reducer)`.
- `actualState` — the server-confirmed value (here, a `starred` boolean passed as a prop from a Server Component, or read from `useActionState`'s `state`). Name the boundary: this comes from the server's truth.
- `reducer` — `(current, optimisticValue) => nextState`, a **pure** function computing the optimistic state. For the toggle: `(_, next) => next`.
- `addOptimistic(value)` — fire an optimistic update. **Must be called inside a transition.**
- Read `optimisticState` (not `actualState`) in your JSX — it's the actual value, *overlaid* with any in-flight optimistic update.

**The imperative toggle, end to end.** Build a "Star this invoice" button outside any `<form>`. Use `AnnotatedCode` here — the focus needs to move across distinct parts (the hook call, the `startTransition` wrapper, the `await action`, the JSX reading `optimisticStarred`). Steps:
1. The hook call — `actualState` is the `starred` prop, reducer is `(_, next) => next`.
2. The click handler — wrap in `startTransition(async () => { addOptimisticStarred(!starred); await toggleStar(invoice.id); })`. **Color this step to flag the transition as load-bearing.**
3. The JSX — the button's filled/outline state and `aria-pressed` read `optimisticStarred`, so it flips on click instantly.
4. What happens on settle — when the transition completes, React discards the optimistic overlay and re-renders against `actualState` (refreshed by the action's `revalidatePath`); on failure `actualState` is unchanged so the star snaps back. **No rollback code.**

**Name the transition requirement as the trap, sharply.** A `Term` on **transition** (a React update React can interrupt/coordinate; optimistic state only lives inside one — `startTransition`, or the automatic transition the `action`/`formAction` prop opens). State the failure mode precisely: `addOptimistic` outside a transition → React logs the console warning *"An optimistic state update occurred outside a Transition or Action…"* and the optimistic value **renders for a frame then reverts** (it doesn't persist). Unlike the chapter's earlier *silent*-pass traps (L2 arrow wrapper, L3 raw vs bound action), this one *does* warn — but the visible symptom (a flash that snaps back) is the tell, so teach both. Put it in a caution `Aside` quoting the warning verbatim.

### Optimistic items in a list

Graduate to the production-shaped case: an "add comment" form whose new comment appears in the list instantly. This is where the reducer *appends*, where list **keys** and the **client-UUID reconcile** enter, and where `useOptimistic` **pairs with `useActionState`**. Layered on top of the toggle — don't restate the signature, build on it.

**The data flow — this is the section's hard concept; teach it with the timeline diagram (below) before the code.** The list of comments is rendered by a **Server Component** reading the DB; it crosses the boundary as a `comments` prop into a Client Component that owns the optimism. The Client Component:
- `const [optimisticComments, addOptimisticComment] = useOptimistic(comments, (current, newComment) => [...current, newComment]);`
- pairs with `const [state, formAction, isPending] = useActionState(addComment, null);` — same form, two hooks, one lifecycle.
- on submit (the `action` prop's automatic transition), calls `addOptimisticComment({...})` with the typed body — the comment shows immediately, rendered with a subtle "sending…" affordance (e.g. dimmed) keyed off a `pending: true` field on the optimistic object.

**Build the component with `AnnotatedCode`.** Distinct foci: the two hook declarations side by side, the reducer (`[...current, newComment]`), the form-action handler that both fires `addOptimisticComment` *and* is the bound `formAction`, the list `.map` rendering `optimisticComments` with keys, and the pending affordance. Keep the action mocked/forward-pointed (server lives in ch.043/047). One paragraph max per step.

**Pairing semantics — make the division of labor explicit.** A small two-column visual or just tight prose: `useActionState` owns *pending + Result + field errors* (the failure path the user reads); `useOptimistic` owns *the list during the in-flight window*. Both fire on the same submit; React coordinates them. On failure, `useActionState`'s `state.ok === false` surfaces the error banner **and** the optimistic add vanishes automatically — the form layer writes the banner read, never the removal.

### Reconciling the optimistic item: the id problem

The optimistic comment has no DB id yet, but React reconciles a list by `key`. Teach the two reaches; name the senior default.

Use `CodeVariants` (two related approaches, before/after-style comparison):
- **Tab 1 — client-generated UUID (senior default).** Generate `crypto.randomUUID()` (a `Term` on **UUIDv7** — note the course standardizes on v7 PKs per conventions, and a client-generated id reconciles cleanly with that convention) and pass it to the action as the entity's id; the action persists *that* id. The optimistic item and the server-returned row share the same key → React reconciles in place, **no flicker**. Tie to the codebase convention: this is the same client-UUID-hidden-input pattern the conventions name for both `useOptimistic` and TanStack optimistic mutations — one discipline, reused.
- **Tab 2 — temp id (quick reach).** `id: \`temp-${Date.now()}\``. On revalidation the temp item unmounts and the real-id item mounts → brief visual flicker. Cheap to write; fine for a prototype, not the project default.

Land the rule: **client-generated UUID is the default; temp ids are the prototype shortcut.** Forward-point: the same UUID-by-key reconcile reappears with TanStack Query's cached optimistic mutations (ch.081) — this is the foundation.

**Watch-out woven in:** an optimistic item that depends on data the client doesn't have (a server-generated `createdAt`, a computed total) renders incomplete on the optimistic frame — leave those fields blank or show a placeholder; the real values arrive with the revalidated render. Put this as a short caution near the reconcile discussion, not a separate section.

### How React rolls back for you

Dedicated section for the title concept — the rollback semantics, made precise. Rationale: it's the lesson's headline and the thing students most misremember ("does it roll back on error only? what about success?").

State the rule crisply: when the surrounding **transition settles — success *or* failure — React discards the optimistic overlay and re-renders against `actualState`.**
- **On success:** `actualState` *already* reflects the change, because the action's `revalidatePath` (ch.043) triggered a fresh server render and the new `comments` prop flowed in. The optimistic item falls away and the real one is already there — seamless when keys match.
- **On failure:** `actualState` is unchanged (the mutation didn't commit), so the optimistic overlay simply vanishes — the list returns to its pre-click state. The student reads `state.ok === false` from `useActionState` to show *why*; the *removal* is automatic.

**Diagram — the load-bearing asset of the lesson. `DiagramSequence`** (a temporal scrub through the optimistic lifecycle). This earns the slider because the whole concept *is* the sequence of states over time. Steps (each a simple HTML/CSS panel: a small "comment list" box + a state label + a "server truth vs optimistic overlay" indicator):
1. **Idle** — list shows server truth `[A, B]`. `actualState = [A,B]`, no overlay.
2. **Click submit** — transition opens; `addOptimisticComment(C*)` fires. List shows `[A, B, C*]` (C dimmed/"sending"). Caption: optimistic overlay applied; `actualState` still `[A,B]`.
3. **Action in flight** — server is parsing/mutating. UI still `[A, B, C*]`. Caption: the borrowed future is on screen; truth hasn't moved.
4a. **Success branch** — `revalidatePath` → fresh `actualState = [A,B,C]`; transition settles; overlay discarded; list shows `[A,B,C]` (C solid). Caption: optimistic C and real C share a key → snaps in place, no flicker.
4b. **Failure branch** — action returns `ok:false`; `actualState` still `[A,B]`; transition settles; overlay discarded; list shows `[A,B]` again + error banner. Caption: rollback is just "render the unchanged truth" — zero rollback code.

Because `DiagramSequence` is a single linear scrub, present the success branch as steps 4 and failure as step 5 (a "rewind to step 2, this time the action fails" framing in the caption) rather than a real fork — keep it linear. The pedagogical goal: the student *sees* that "rollback" is not a special operation but the natural consequence of React re-rendering against an `actualState` that never moved.

**Drill — `Sequence` exercise (ordering).** Give the student the shuffled lifecycle beats (server truth shown → click fires `addOptimistic` in a transition → optimistic overlay renders → action runs on server → `revalidatePath` refreshes truth / or action fails → transition settles, overlay discarded → final render against truth) and have them order them. Locks in the timeline the diagram taught. Alternative if a code-output angle is preferred: a tiny `PredictOutput` ("after the action fails, what does the list render?") — but `Sequence` maps the lifecycle better.

### Practice: make a toggle feel instant

Hands-on consolidation. **`ReactCoding`**, tests-graded, with the chapter's established carve-out: the action is **mocked client-side** (an async function that resolves after a timeout, inside the iframe), because ReactCoding has no server. Add a one-line `Aside` stating this is pedagogical staging — the real call is a Server Action.

Exercise shape: give the student a "star" button wired to a mocked async `toggleStar` and a `starred` prop, but with the optimistic update **missing** — the button only updates after the await resolves (the frozen-feel they read about). Task: add `useOptimistic` and wrap the call in `startTransition` so the star flips instantly. 

Grading (tests against rendered DOM, per the component's assertion surface): after a simulated click, the button's pressed state (`aria-pressed` / a class) reflects the new value *before* the mock resolves (assert the immediate-frame change), and settles correctly after. Because diagnostic text is hidden from the student, write test *names* that communicate the goal ("star flips immediately on click, before the action resolves"; "without startTransition the optimistic update would not stick"). Keep starter ≤ the component's height; instructions one paragraph.

### Optimism without a form

Brief closing section generalizing the imperative shape and bounding scope. The toggle in the practice exercise *was* the non-form shape; name it explicitly so the student abstracts the pattern: any `<button onClick>` mutation where the visual change matters — `startTransition(() => { addOptimistic(next); await action(); })`. Contrast once with the form case (where `action`/`formAction` opens the transition for you) so the student knows *when they must supply `startTransition` themselves*: forms → automatic; imperative handlers → manual. This is the single rule that decides whether their optimistic update sticks.

Close by re-seating optimism in the chapter's toolset and forward-pointing:
- It's a JS-only enhancement — no JS, the optimistic frame never renders; the action still runs and the post-`revalidatePath` server render shows the result (full PE story → L7).
- Past the native pattern, optimistic updates *into a client cache* (cross-view, with rollback into cached queries) are TanStack Query's job → ch.081. `useOptimistic` is the native default; TanStack is the conditional trigger past it.

Optional **`ExternalResource`** card to the React `useOptimistic` reference doc.

---

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- `useActionState` → `[state, formAction, isPending]`; bound `formAction` on the form; `state.ok === false` discriminator gating the error banner/field errors (L3). Used here as the pairing partner; not re-explained.
- `<SubmitButton>` / `useFormStatus` pending UX (L4) — referenced as "the pending-state tools you already have"; the lesson positions optimism *relative* to them.
- `Result` shape, `revalidatePath`, the five-seam Server Action (ch.043) — named as the truth-refresh mechanism; not re-taught. **Use `revalidatePath` (ch.043's canonical primitive), not `revalidateTag`/`updateTag`.**
- Uncontrolled inputs, `name` contract, `'use client'` (L1/L2) — assumed.
- Server-Component-owns-data / props-cross-the-boundary (ch.030) — restated in one line for the data-flow section.

**Out of scope — do not teach here:**
- `useActionState` internals, `Result` failure shape, field-error rendering mechanics → owned by L3 / ch.043. Show only the *read* (`state.ok === false`) needed to pair the hooks.
- Constraint Validation API, shadcn `Form` layout primitives → **L6** (next lesson). The optimistic form's inputs stay plain; no client-validation taught here.
- Progressive enhancement (no-JS submit lifecycle, the five disciplines, the manual JS-disabled test) → **L7**. Name only the one fact: optimism is a JS-only enhancement; the action still works without it.
- TanStack Query optimistic mutations (`onMutate`/`onError`/`onSettled`, rollback into cached queries) → **ch.081**. Named once as the conditional trigger past the native hook; not built.
- Full undo/redo for destructive ops; soft-delete → **ch.061**. Not this lesson.
- The real Server Action body for `addComment`/`toggleStar` (transaction, persistence) → **ch.043 / project ch.047**. Actions here are mocked or forward-pointed; the lesson teaches the *client* half.
- `useTransition` as a general concurrency tool / `useDeferredValue` → out of scope; introduce `startTransition` only as the wrapper `useOptimistic` requires, not as a concurrency lesson.

---

## Notes for downstream agents

- **Deliberate divergences from conventions, flagged:** actions in code samples are **mocked client-side** for ReactCoding/AnnotatedCode (no server in the iframe) — this is the chapter's established L3/L4 staging, always paired with an `Aside` saying so. This is *not* a production pattern.
- **Revalidation primitive:** use `revalidatePath` to stay coherent with ch.043 and ch.044 L1–L4. The conventions' `updateTag`/`revalidateTag` belong to the tag-based caching lessons (ch.032/072) — do not introduce them here; it would fork the chapter's mental model.
- **Worked entities:** `addComment` + `comments` list (optimistic add) and `toggleStar` (optimistic toggle), both on the chapter's `invoices` domain. Keep these names if the project (ch.047) continues the optimistic flow, per the chapter outline's "create-comment optimistic flow" note.
- **Component conventions to honor:** hooks at top level; `useOptimistic` reducer is **pure**; conditional render with proper booleans (`pending` is a real boolean — `pending && <…/>` is safe); client UUID via `crypto.randomUUID()`; lists keyed by data identity (the reconcile depends on it — never index keys).

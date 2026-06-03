# Refs as a regular prop

**Title (h1):** Refs as a regular prop
**Sidebar label:** Refs as a prop

---

## Lesson framing

This is the fourth lesson of Chapter 022 (Components and composition). The student already writes the canonical `<Button>` (`ComponentProps<'button'>` + `variant`/`size` + `cva` `buttonVariants` + `cn(..., className)` + `{...rest}` + `leftIcon`, polymorphic via `asChild`/`Slot`) and the `<Card>` family. This lesson adds the last prop of the chapter's component contract: `ref`.

**The one idea.** In React 19 `ref` is a regular prop — the same shape as `onClick` or `className`. A child component destructures `ref` from its props and forwards it to a DOM node. No `forwardRef`, no wrapper, no ceremony. Everything else in the lesson (ref types, ref callbacks, merging, `useImperativeHandle`) hangs off that single reframe.

**Senior framing, lead with it (decisions-before-syntax filter).** The lesson opens on the pain `forwardRef` caused — a six-line ceremony per component, a magic prop the runtime reserved like `key`. The senior point is *why* React 19 removed the magic: `ref` becoming an ordinary prop means the React Compiler (already enabled in this course's stack) can reason about it like any other prop, and the component contract gets smaller. This is the same "less magic, more contract" move as the `'use client'`/`'use server'` directives (forward-ref to Ch 030). Frame `forwardRef` as legacy-recognition only: the student reads it in pre-2025 code and shadcn history, never writes it. Name the codemod as the migration path so the student knows old code is mechanically convertible.

**Scope discipline — this is the *prop* lesson, not the *hook* lesson.** `useRef` (creating a ref, reading `.current`, instance values, DOM access at depth) is owned by Ch 024 L6. This lesson teaches only how a ref *travels through a component*: parent owns a ref, passes it as the `ref` prop, child forwards it to a DOM element. Keep `useRef` to the minimum needed to have something to pass — introduce it as "the parent makes a ref with `useRef(null)`" and immediately move focus to the prop. Do not teach effects, instance values, or `.current` mutation patterns; point them at Ch 024 L6. The render model stays held off (Ch 023) — name re-render only where ref-callback stability genuinely demands it, and even then lightly.

**Why this matters / the payoff.** The student leaves able to write a focusable `<Input>`, a `<Button>` whose ref reaches the rendered `<a>` through `asChild`/`Slot`, and to recognise when a ref must be split across two consumers. This is the exact surface every shadcn primitive in Ch 027 uses; the chapter framing states "the lessons here teach the reader of those components how to write them."

**Where beginners get this wrong (call these out inline).** (1) Reaching for `forwardRef` out of habit / from stale AI output and tutorials. (2) `useImperativeHandle` cargo-culting — wrapping a node in a handle when they could just expose the node. (3) Spreading `{...rest}` and expecting `ref` to ride along after they've destructured it. (4) Forgetting a ref callback that allocates (observer, listener) needs teardown, and not knowing React 19 now gives them a clean return-a-cleanup path. (5) Assuming a ref on a component that doesn't accept one "just works" — it's silently ignored at runtime (the type system is the guard).

**Pedagogical spine.** Continue the running `<Input>`/`<Button>` rather than inventing new components — minimises cognitive load, cashes in prior lessons. Build complexity in one direction: (a) ref-as-prop on a leaf that forwards to one DOM node → (b) the ref types so the student can annotate a custom ref prop → (c) ref *callbacks* (the function form) → (d) the React 19 cleanup return → (e) merging two refs onto one node → (f) `useImperativeHandle` named once as the rare escape valve → (g) the `Slot`/`asChild` ref story closing the chapter loop. A before/after CodeVariants (forwardRef vs ref-as-prop) is the highest-leverage single visual; a DiagramSequence carries the ref-callback mount→cleanup lifecycle; one ReactCoding exercise lets the student write the forward themselves.

**Tone.** Adult, terse, no bootcamp scaffolding. Assumes the component contract from L1–L3 is fluent.

---

## Lesson sections

### Introduction (no h2 — lesson intro per Pedagogical guidelines §3)

Open on the concrete problem: the running `<Input>` (or imagine the `<Button>`) needs the parent to focus it on mount, or scroll it into view, or measure it. The parent has a ref; it needs to land on the actual `<input>` DOM node *inside* the component. State the senior question implicitly: how does a ref cross the component boundary? Name that before React 19 this required `forwardRef` and a per-component ceremony, and that React 19 deleted that ceremony by making `ref` a regular prop. Preview the practical end state: a focusable input, a ref that reaches through `asChild`, and the callback form for wiring observers. Keep it to ~2 short paragraphs, warm and brief. Do **not** open with a heading; flow straight into the first h2.

Connect to prior knowledge explicitly in one clause: "you already pass `onClick`, `className`, and `...rest` to the inner element — `ref` is now just one more of those."

---

### h2 — `ref` is a regular prop now

**Goal:** install the core reframe and the canonical forward, and retire `forwardRef` to recognition-only.

Content:
- State the model in one sentence: a function component accepts `ref` as an ordinary prop; destructure it, hand it to the inner DOM element.
- The canonical `<Input>`:
  ```tsx
  function Input({ ref, ...props }: ComponentProps<'input'>) {
    return <input ref={ref} {...props} />;
  }
  ```
  Note the deliberate use of a `function` declaration here is fine, but the course default is arrow-bound-to-const (Code conventions §Function form). Show the arrow form as the shipping shape: `const Input = ({ ref, ...props }: ComponentProps<'input'>) => <input ref={ref} {...props} />;`. Pick the arrow form as the primary; mention the `function` form is equivalent. **Note to writer:** the chapter-outline draft shows a `function` declaration — diverge to the arrow-const form to stay consistent with the established Button/Card shape and the conventions doc; this is deliberate.
- The key payoff line: `ComponentProps<'input'>` **already includes** `ref`, typed against `HTMLInputElement`. The student does not add a `ref` field to the props type — it rides in for free with the element-props alias they already use. This connects directly to L1 (where `ComponentProps<'button'>` was shown to include `ref`).
- The parent side, minimal: `const inputRef = useRef<HTMLInputElement>(null);` then `<Input ref={inputRef} />`, then (foreshadowing only) `inputRef.current?.focus()`. State plainly that `useRef` is taught at depth in Ch 024 L6; here it is only the thing that produces the ref to pass. Do not explain `.current` mechanics beyond "the DOM node lands on `.current` once mounted."
- **`forwardRef` is legacy.** One tight passage: every codebase before 2024, every shadcn file before mid-2025, every pre-React-19 tutorial used `forwardRef`. It still works in React 19 but logs a deprecation warning and is slated for removal in a future major. The student reads it, never writes it. Name the official codemod `npx codemod react/19/remove-forward-ref` as the mechanical migration path, and that ESLint flags redundant `forwardRef`. Keep it recognition-level; do not teach the `forwardRef((props, ref) => ...)` signature beyond what the before/after pane shows.

**Component — CodeVariants (before/after), highest-leverage visual of the lesson.** Two tabs:
- Tab "React 18 — `forwardRef`": the old ceremony — `const Input = forwardRef<HTMLInputElement, Props>(({ ...props }, ref) => <input ref={ref} {...props} />); Input.displayName = 'Input';` — use `del=`-style framing to mark the `forwardRef` wrapper, the second `ref` parameter, the explicit generic, and the `displayName` line as the ceremony being deleted.
- Tab "React 19 — ref as a prop": the four-line arrow form, `ins=` on the `ref` in the destructure. First sentence of the prose carries the framing ("Same behaviour, the wrapper and the second parameter are gone").
Six-line prose cap per tab per the component contract.

**Why React 19 made this change (fold into this section, not its own h2).** Short senior paragraph: `forwardRef` existed because `ref` was *reserved* by the runtime, like `key` — props couldn't carry it. Making it ordinary removes the special case, shrinks the contract, and lets the React Compiler treat it like any prop. One sentence linking to the broader React 19 "less magic, more contract" direction with a forward-ref to the `'use client'`/`'use server'` directives (Ch 030) as the same principle in another shape. This answers the "why should I trust this" question a senior asks.

**Tooltips (`Term`):** `forwardRef` (one line: "Legacy React API that wrapped a component so it could receive a forwarded ref; unnecessary in React 19."). `codemod` if used in prose ("an automated source-transform that rewrites code mechanically").

**`CodeTooltips`** on the canonical `<Input>` block: tooltip `ref` ("Now an ordinary prop. React assigns the DOM node to it after mount."), `...props` ("Every native `<input>` attribute — `value`, `onChange`, `placeholder` — minus the destructured `ref`."), `ComponentProps<'input'>` ("All props the JSX `<input>` accepts, including `ref` typed as `Ref<HTMLInputElement>`.").

---

### h2 — Typing a ref: `Ref`, `RefObject`, and `RefCallback`

**Goal:** give the student the three types so they can annotate a *custom* ref prop when `ComponentProps<'tag'>` isn't doing it for them, and clear up the React 19 mutability change so older code doesn't confuse them.

Content:
- Frame the trigger: most of the time you never write a ref type, because `ComponentProps<'tag'>['ref']` resolves it. You reach for the explicit type only when the props type isn't an element-props alias — e.g. a component whose props you wrote by hand that should still accept a ref to its root.
- **`Ref<T>`** — the type an element's `ref` prop accepts. It is the union `RefObject<T> | RefCallback<T> | null`. The form when you must write it: `ref?: Ref<HTMLInputElement>`. This is the one the student writes most when annotating by hand.
- **`RefObject<T>`** — the object a `useRef` call returns; `.current` holds the value (`HTMLInputElement | null`). **The React 19 change, stated to prevent confusion:** historically `RefObject<T>` meant "`.current` is readonly" and `MutableRefObject<T>` meant "writable `.current`". React 19 collapsed this — `RefObject<T>` now has a **writable** `.current`, and `MutableRefObject` is deprecated. The student only writes/reads `RefObject`; flag `MutableRefObject` purely so it's recognised in older types and not copied. Mention the `refobject-defaults` codemod exists for the `useRef(null)` argument change, one line, recognition-only.
- **`RefCallback<T>`** — the function form: `(node: T | null) => void` (React 19: may also return a cleanup function — forward to the next section). Setting up the next h2.
- Keep this section tight and reference-shaped — it's a small types interlude, not a deep dive. The student's takeaway is the decision rule: *element-props alias → ref types come for free; hand-written props → annotate `ref?: Ref<T>`.*

**Component — `Code` block(s), small.** A compact annotated snippet showing the three types side by side as the union expansion of `Ref<T>`. Consider a single fenced block with `CodeTooltips` over `RefObject`, `RefCallback`, `Ref`, each with the one-line definition above — cheaper and more in-flow than a diagram here. A diagram is overkill for three type aliases.

**Exercise — `Dropdowns` (fill-in-the-blank), optional but recommended.** A small `<select>`-driven block: "A component with hand-written props that should accept a ref to its `<div>` types it as `ref?: ___`" → options `Ref<HTMLDivElement>` (correct), `RefObject<HTMLDivElement>`, `MutableRefObject<HTMLDivElement>`, `HTMLDivElement`. One or two blanks max; this checks the decision rule without heavy lifting. If it feels like filler next to the later ReactCoding exercise, cut it — the ReactCoding is the load-bearing assessment.

**Tooltips (`Term`):** none new beyond the `CodeTooltips` above; the types are better probed in-code.

---

### h2 — Ref callbacks: running code when a node mounts

**Goal:** teach the function-form ref and *why* you reach for it — running setup against the actual DOM node at mount.

Content:
- The form: `ref={(node) => { ... }}`. React calls it with the DOM node when the element mounts. (Historically, and still without a cleanup return: it calls again with `null` on unmount.)
- The trigger / when a senior reaches for this: you need the DOM node itself to do something at mount — wire up an `IntersectionObserver`, measure the element, focus conditionally, attach a non-React listener. A plain object ref (`useRef`) gives you the node *later* via `.current`; a callback ref gives you the node *at the moment it attaches*, which is what observers and measurements want.
- Canonical example, kept minimal and tied to a real reach the course revisits: attaching an `IntersectionObserver` to a node. Define `IntersectionObserver` in one clause (a browser API that fires when an element enters/leaves the viewport — used later in Unit 3 for lazy-loading) via a `Term`, so the focus stays on the ref mechanism, not the observer API. Do **not** teach the observer in depth here.
- Stability footnote, lightly (render model held off): an inline callback ref is a new function each render; without a cleanup return React runs it again (null, then node) on re-render. State this as a fact, note `useCallback` stabilises it when the setup is expensive, and explicitly defer the *why-it-re-runs* mechanics to Ch 023. Do not let this balloon — one or two sentences.

**This section flows directly into the cleanup h2** — keep them adjacent so the mount/cleanup pair reads as one story. Consider whether to merge them under one h2 with the cleanup as the natural continuation; **recommended: keep cleanup as its own h2** because the React 19 return-a-cleanup addition is a distinct, examinable idea worth its own header.

**Tooltips (`Term`):** `IntersectionObserver` ("Browser API that runs a callback when an element enters or leaves the viewport. Covered for lazy-loading later in the course."). `callback ref` ("A `ref` set to a function; React calls it with the DOM node on mount instead of storing it on `.current`.").

---

### h2 — Returning a cleanup from a ref callback

**Goal:** land the React 19 addition — the ref callback can return a teardown, scoped to the node's life, like a mini-`useEffect`.

Content:
- The addition: in React 19 a ref callback may `return` a cleanup function. React runs it when the node unmounts (or before the callback re-runs). **Behavioural detail, state it precisely:** when a cleanup is returned, React **no longer** calls the callback again with `null` — the returned function is the unmount signal instead. (Verified against React 19 release notes and follow-up writeups.)
- The mental model: "a mini-`useEffect` perfectly scoped to the life of this one DOM node" — setup on attach, teardown on detach, no `useEffect` + `useRef` dance.
- The canonical example, continuing the observer: 
  ```tsx
  <div ref={(node) => {
    const observer = new IntersectionObserver(/* ... */);
    observer.observe(node);
    return () => observer.disconnect();
  }} />
  ```
- **TypeScript watch-out (verified):** TS in React 19 rejects a ref callback that returns anything other than a cleanup function, `undefined`, or `null`. The trap: a one-line arrow body that *implicitly returns* the result of the last expression (e.g. `ref={(node) => (map.current = node)}` returns the assignment value) now errors. Fix: use a block body so it returns nothing — `ref={(node) => { map.current = node; }}`. This is a real, common compile error post-upgrade; worth a short callout.

**Component — DiagramSequence, the second key visual.** Three to four steps scrubbing the node lifecycle, pedagogical goal = make "setup at attach / cleanup at detach" tangible and tie it visually to the `useEffect` lifecycle the student will formalise later:
- Step 1 "Mount": element renders → React calls the ref callback with the node → `IntersectionObserver` created and `observe(node)` runs. Highlight the setup line.
- Step 2 "Observing": the node is live; the observer is watching it (small visual of the node + an "observer attached" badge).
- Step 3 "Unmount": element leaves the tree → React calls the **returned cleanup** → `observer.disconnect()`. Highlight the cleanup line; annotate "the callback is **not** re-called with `null` — the cleanup runs instead."
- Optional Step 0/caption contrasting the pre-React-19 path (callback re-invoked with `null`) so the change is legible.
Build each step as simple labelled HTML boxes (a node box + an observer box + an arrow), per the diagram guidance that any simple visual aid counts. Wrap is built-in to `DiagramSequence` (no `<Figure>`).

**Exercise — `PredictOutput` or `Sequence`, optional.** A `Sequence` ordering drill: drag the four events into order — "element mounts", "callback runs, observer attached", "element unmounts", "cleanup runs, observer disconnected". Cheap reinforcement of the lifecycle; good companion to the diagram. Use only if it doesn't crowd the section; the diagram already carries the concept.

**Tooltips (`Term`):** `cleanup function` ("A function returned from a ref callback (or effect) that React runs on teardown — here, when the DOM node unmounts.").

---

### h2 — Putting two refs on one node

**Goal:** the genuinely tricky case — a component needs *its own* ref on a node *and* must forward the caller's ref to the same node. Teach the callback-ref merge, then name the utility.

Content:
- The problem, concretely: an `<Input>` keeps an internal ref (to focus itself on some event) **and** accepts the parent's `ref`. Both must point at the *same* `<input>`. You can't pass two refs to one `ref` attribute.
- The 2026 reach — a callback ref that writes both:
  ```tsx
  const Input = ({ ref, ...props }: ComponentProps<'input'>) => {
    const internalRef = useRef<HTMLInputElement>(null);
    return (
      <input
        ref={(node) => {
          internalRef.current = node;
          if (typeof ref === 'function') ref(node);
          else if (ref) ref.current = node;
        }}
        {...props}
      />
    );
  };
  ```
  Walk the branch: `ref` may be a callback (`typeof ref === 'function'`) or an object (`ref.current = node`) or `null` — that's exactly the `Ref<T>` union from the types section paying off. This is why `Ref<T>` is a union and not just an object.
- Then name the ergonomic escape: this branching is boilerplate, so teams import a `mergeRefs` / `useMergeRefs` helper (a ~5-line function, or the `react-merge-refs` package; note `react-best-merge-refs` for full React-19-cleanup fidelity as recognition). Show the call site only: `ref={mergeRefs([internalRef, ref])}`. The student should recognise the pattern and reach for a utility rather than hand-write the branch every time.
- Keep the cleanup-return story consistent: a fully correct merge in React 19 also threads cleanup — name that the library handles it; hand-rolled merges often don't. One sentence, recognition-level.

**Component — AnnotatedCode, the right tool here** because the merge block has multiple parts the student's attention must move across in sequence. Single block = the callback-ref merge above; steps:
- Step 1 `{2}` (blue): the internal ref the component owns.
- Step 2 the `ref` callback line range (blue): "one callback, fired with the node, writes every ref that needs it."
- Step 3 `"internalRef.current = node"` (green): wire the component's own ref.
- Step 4 the `typeof ref === 'function'` + `else if` lines (orange): handle the caller's ref whether it's a callback or an object — the `Ref<T>` union in action.
Keep each step ≤6 lines of prose. This directs focus better than a plain `Code` block for a branch-heavy snippet.

**Tooltips (`Term`):** `mergeRefs` ("Helper that fans one DOM node out to several refs — write it in ~5 lines or import `react-merge-refs`.").

---

### h2 — `useImperativeHandle`: the rare escape valve

**Goal:** name it once, show the shape, and — most importantly — install the rule "prefer exposing the node." This is recognition-plus-a-guardrail, not a deep dive.

Content:
- The trigger: a component wants to expose *methods* to the parent (`ref.current.focus()`, `ref.current.scrollToBottom()`, `ref.current.open()`) rather than a raw DOM node — useful when the imperative surface is curated (a `<Dialog>` exposing `open()`/`close()`), or when the real node shouldn't be handed out wholesale.
- The shape, shown once:
  ```tsx
  const FancyInput = ({ ref, ...props }: ComponentProps<'input'> & { ref?: Ref<FancyInputHandle> }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    useImperativeHandle(ref, () => ({
      focus: () => inputRef.current?.focus(),
      clear: () => { if (inputRef.current) inputRef.current.value = ''; },
    }));
    return <input ref={inputRef} {...props} />;
  };
  ```
  Point out that the ref's `T` is now the *handle type*, not the DOM element — the parent's `ref` is `Ref<FancyInputHandle>`.
- **The load-bearing rule, stated firmly:** prefer exposing the DOM node via plain ref-as-prop. Reach for `useImperativeHandle` only when you genuinely need a *curated method surface* and exposing the node is wrong. The common beginner mistake is wrapping `{ focus }` in a handle when the parent could just receive the `<input>` ref and call `.current.focus()` directly — strictly more code for less capability. Most cases that reach for it shouldn't.
- Defer depth explicitly: this lesson shows the shape and the rule; the API at depth is Ch 026 territory if a custom hook earns it. Do not teach dependency arrays / the third argument here.

**Component — `Code` block** (single, with a short caption) plus an `Aside type="caution"` carrying the "prefer exposing the node" rule so it reads as a guardrail, not a feature pitch. No diagram — the concept is a rule, not a process.

**Tooltips (`Term`):** `useImperativeHandle` ("React hook that lets a component expose a custom object of methods on its `ref`, instead of a DOM node. Rarely the right reach.").

---

### h2 — Refs through `asChild` and `Slot`

**Goal:** close the chapter loop — show that refs reach the rendered element end-to-end when a component is built on `Slot`, with no extra work. This is the debt L3 explicitly pointed here ("refs through `Slot` named as 'just works', pointed at L4 twice").

Content:
- Recall from L3: the canonical `<Button>` switches `Comp = asChild ? Slot : 'button'` and spreads `{...props}` (which now includes `ref`). Radix `Slot` *forwards the parent's ref onto the single child element* as part of its merge (alongside className concat and handler composition — the merge rules taught in L3).
- The payoff, shown concretely: `<Button asChild ref={btnRef}><Link href="/dashboard">Open</Link></Button>` lands `btnRef` on the rendered `<a>` (the `<Link>`'s element). The student writes nothing extra — ref-as-prop on the `<Button>` flows through `{...props}` into `Slot`, and `Slot` puts it on the child. Show the `<Button>` already-written form unchanged from L3, with `ref` riding in `...props`, to make "you already built this" land.
- Reinforce the senior takeaway: because `ref` is now an ordinary prop, it travels through `{...props}` spreads and through `Slot`'s merge with zero special-casing — the exact benefit of removing the magic. This ties the chapter's `asChild`/`Slot`/`cva`/ref-as-prop machinery into one coherent contract.
- One-line forward reference: every shadcn primitive in Ch 027 relies on precisely this — ref-as-prop + `Slot` forwarding — so refs work through their `asChild` surfaces for free.

**Component — `Code` block** (small) showing the call site and a one-line reminder of the `Comp = asChild ? Slot : 'button'` line from L3 with `ref` visible in `...props`. Optionally a `CodeTooltips` over `Slot` ("Forwards the parent's ref onto its single child, alongside merging className and handlers.") and `asChild`. No new diagram — reuse the student's L3 mental model.

**Tooltips (`Term`):** `Slot` (only if not freshly defined in prose) — "Radix component that merges a parent's props, classes, handlers, and ref onto its single child."

---

### h2 — Practice: make the input focusable

**Goal:** the load-bearing assessment — the student writes the forward themselves, proving the core skill (ref-as-prop on a leaf forwarding to a DOM node).

**Component — `ReactCoding`, tests-graded.** 
- `instructions`: "Make `<TextField>` forward its `ref` to the inner `<input>` so the parent can focus it. The parent already creates the ref and focuses on mount — your job is the forward."
- `starter`: an `App` that creates `const ref = useRef<HTMLInputElement>(null)`, focuses in an effect or on a button click, and renders `<TextField ref={ref} />`; `TextField` is given as a component that renders `<input className="..." {...props} />` but **drops `ref`** (i.e. it destructures `{ ...props }` without forwarding `ref`, or doesn't accept it). The student must add `ref` to the destructure and put `ref={ref}` on the `<input>`. Keep Tailwind on (default) so it looks like the course's components.
- `tests`: assert the rendered `<input>` receives focus after mount (e.g. a button labelled "Focus" that calls `ref.current?.focus()`, then the test clicks it and checks `document.activeElement` is the input), or simpler: assert that after mount `document.activeElement?.tagName === 'INPUT'` when the starter auto-focuses. Write the test name to communicate the goal since diagnostic text is hidden from the student (per the component doc): `test('clicking Focus moves focus into the TextField input', ...)`.
- Provide a reveal-on-demand solution via `<details>` under the exercise with the four-line forwarding `TextField`.

This is preferable to a sandbox (guided > sandbox per the task brief) and directly grades the lesson's central skill.

---

### External resources (optional, end of lesson per Pedagogical guidelines §3)

`CardGrid` of two–three `ExternalResource` cards:
- React docs — *Passing refs to components* / the React 19 release post section on ref-as-prop (icon `simple-icons:react`, `iconColor="#61DAFB"`).
- React docs — *ref callback cleanup* (the `react.dev` reference for refs, noting the cleanup return).
- Optionally the `react/19/remove-forward-ref` codemod page as the migration reference.
Each with a one-line description; these are supplementary, not required reading.

---

## Scope

**This lesson covers:** React 19's ref-as-prop model on function components; `ComponentProps<'tag'>` already carrying the `ref`; the `Ref<T>` / `RefObject<T>` / `RefCallback<T>` types and the React 19 mutability/`MutableRefObject`-deprecation note; ref callbacks (function-form refs) and *why* they're used (DOM-node-at-mount work like observers/measurement); the React 19 ref-callback cleanup return and its precise behaviour (no second `null` call); merging two refs onto one node via a callback ref and the `mergeRefs` utility; `useImperativeHandle` named once with the "prefer exposing the node" rule; and how refs flow through `asChild`/`Slot` end-to-end. `forwardRef` is recognition-only (the before/after pane + the codemod), never authored.

**Explicitly out of scope (do not teach; redefine prerequisites concisely only):**
- **`useRef` at depth** — creating refs, `.current` mechanics, instance (non-DOM) values, DOM access patterns. Owned by **Ch 024 L6**. Here `useRef(null)` appears only as "the thing that produces the ref to pass"; do not expand it. Redefine in one clause when first used.
- **The render model** — when/why a component re-runs, reconciliation, memoization. Owned by **Ch 023**. Touch re-render only for ref-callback stability, and even then defer the *why* to Ch 023. No `memo`/`useMemo`/`useCallback` teaching beyond naming `useCallback` once as the stabiliser for an expensive callback ref.
- **`useEffect` / effects** — the cleanup *analogy* is allowed ("a mini-`useEffect`"), but do not teach effects, dependency arrays, or synchronization. Owned by **Ch 025**. Stale-refs-in-closures is Ch 025 territory — out.
- **`IntersectionObserver` / `ResizeObserver` at depth** — named and one-line-defined as the *reason* for callback refs and cleanup; the observer APIs themselves are later-Unit material (lazy-loading) and custom-hook material (**Ch 026**). Do not teach observer options, thresholds, or roots.
- **`useImperativeHandle` at depth** — the third-argument dependency array and advanced handle patterns are **Ch 026** territory if a custom hook earns it. Recognition + the guardrail rule only here.
- **Class components and their refs** — the course never teaches class components; mention only that they can't receive `ref` as a prop, for reading older code. Do not expand.
- **`Slot`'s merge internals / `Slot.Slottable`** — owned by **Ch 022 L3** (already taught: className concat, handler composition, rest passthrough). This lesson only adds the *ref* half of that merge. Do not re-teach the `asChild` switch or `cva`.
- **`cva` / `VariantProps` / `cn` / `tailwind-merge`** — fully owned by L3 and Ch 018. The `<Button>` shown here is unchanged from L3; do not refactor or re-explain its styling.
- **Portals and `createPortal`** — **Ch 022 L5** (next lesson). No portal content here.
- **React DevTools ref inspection** — introduced in Ch 006; not revisited here.

**Prerequisite one-liners the writer may restate concisely (do not re-teach):** `ComponentProps<'tag'>` = all props the JSX element accepts (from L1); the `className` + `...rest` discipline (from L1); `cn(buttonVariants(...), className)` and the `asChild ? Slot : 'button'` switch (from L3, shown unchanged); `children: ReactNode` (from L2, not central here). `useRef(null)` returns an object whose `.current` holds the node after mount (full treatment Ch 024 L6).

---

## Notes for downstream agents

- **Continuity is load-bearing.** Reuse the exact `<Input>`/`<Button>` shapes the chapter established; do not invent parallel example components. The `<Button>` in the `Slot` section must be character-compatible with L3's final `button.tsx` (`cva` + `VariantProps` + `Slot`/`asChild` + `cn` + `...rest` + `leftIcon`, now with `ref` riding in `...props`). Filenames kebab-case (`input.tsx`, `button.tsx`); arrow-bound-to-`const` components.
- **Deliberate divergence from the chapter-outline draft:** the draft's canonical `Input` uses a `function` declaration; ship the **arrow-const** form as primary to match conventions §Function form and the chapter spine. Note the `function` form as equivalent once.
- **Verified facts to preserve (do not soften or invert):** `forwardRef` is deprecated-but-functional in React 19 (logs a warning, slated for removal); codemod is `npx codemod react/19/remove-forward-ref`. Ref callbacks may return a cleanup; when they do, React does **not** re-call them with `null`. React 19 `RefObject<T>` has a **writable** `.current`; `MutableRefObject` is deprecated; `useRef<T>(null)` returns `RefObject<T | null>`. TypeScript now rejects ref-callback return values other than a cleanup/`undefined`/`null`, so implicit-return one-liner ref callbacks are a compile error — use a block body. `react-merge-refs` exists; `react-best-merge-refs` covers React 19 cleanup fidelity.
- **Keep the lesson focused.** It is short by design — one reframe with five small consequences. Resist expanding `useRef`, effects, or the observer APIs.

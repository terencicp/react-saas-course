# Four states, not one

- **Title (h1):** Four states, not one
- **Sidebar label:** Loading, empty, error states

## Lesson framing

This is lesson 5 of 5 (the last teaching lesson) in Chapter 027 (shadcn/ui and the accessibility baseline); the quiz is L6.
It closes the chapter's "live state must be perceivable" thread by turning it into a concrete, repeatable component contract.

The senior question driving the lesson: **every list, table, card, and widget exists in four states, not one — which are you forgetting to design?**
Juniors design the populated (happy-path) state and bolt loading/empty/error on at QA time; seniors design all four up front, as part of the component's contract.
The lesson lands the trio that surrounds the populated case — **loading, empty, error** — the shadcn primitives that ship for each, the discipline of pairing each *visual* state with its *accessibility* state (the L3 live-region dividend, applied), and the **discriminated-union state model** that replaces the three-boolean tangle.

Two framings are load-bearing and should be stated explicitly:
1. **Why this is a Chapter 027 lesson, not a data-fetching lesson.** The four-state contract is a *component-level* discipline — every leaf component needs it regardless of where the data comes from. Later chapters (Suspense/route loading, URL-state list views, TanStack Query) lay these states over *server* data; this lesson establishes the component-level pattern they all build on. Say this once so the student doesn't expect `fetch`/`await` here — the data source is abstracted to a state value.
2. **The shadcn dividend, applied one last time.** L1/L2/L3/L4 established it (the primitive owns its surface). Here the dividend is concrete primitives — `Skeleton`, `Spinner`, `Empty`, `Alert` — that ship the visual shell; *your* job is choosing the right state, matching skeleton dimensions to the real layout, writing the empty-state copy and CTA, and pairing each state with the right `role`. The primitive gives you the box; the contract is yours.

Pedagogical spine — **the bug, then the model, then the primitives.**
Lead with the canonical failure (the three-boolean ladder: `if (isLoading) … else if (error) … else if (data.length === 0) … else …`) because the student has almost certainly written exactly this, and felt it rot.
Then introduce the **discriminated union** as the cure — one `status` field, every state named once, rendered once, impossible-state-impossible.
*Then* tour the four states, each with its primitive and its a11y pairing.
This order is the "simplest model first, complexity added gradually" move (cognitive load): the union is the spine, the four states hang off it.

Target student: a junior from another field who can write a React component, has met discriminated unions and `satisfies` (TS, Ch 003-area), `useState`, Tailwind, and — critically — the shadcn primitives (L1), live regions / `role="status"` / `role="alert"` / `sr-only` / AT (L3), and the four accessibility commitments (L2).
Where they struggle the first time:
(a) they conflate **empty** with **loading** (both show "nothing"), and don't realize empty is a *loaded* state that needs its own design and a CTA;
(b) they write the three-boolean ladder and get the *order* wrong, or lose intermediate states (loading-with-stale-data) entirely;
(c) they reach for a **spinner** for everything, when a skeleton matched to the layout is the 2026 default for content with a known shape;
(d) they ship `"Something went wrong"` with no retry and no error id — the error state that helps nobody;
(e) they forget the AT pairing entirely — a screen-reader user perceives *none* of a silent skeleton.

Mental model the student should end with:
- **Four states are a contract, not a checklist.** Before writing the populated view, name loading / empty / error / populated. A component that can't render all four is unfinished.
- **One status, not three booleans.** Drive the UI from a single discriminated union. The compiler then forces you to handle every state and forbids the impossible combinations three booleans allow.
- **Each visual state has an accessibility twin.** Loading → `role="status"` "Loading…"; empty → a real heading + CTA the screen reader can hear; error → `role="alert"` + a focusable, labeled Retry. The L3 pairing is not optional polish.
- **Match the loading affordance to what you know.** Known shape → `Skeleton` sized to the real layout (no layout shift). Unknown shape / short indeterminate op → `Spinner`. Known progress → `Progress`. Never fake progress; never flash a skeleton for a sub-200ms load.

Real production stakes to foreground (no moralizing; quality-bar framing consistent with L2/L4): the missing-state bug is the single most common "looks done in the demo, breaks in prod" class — the empty list with no CTA is a dead end, the un-dimensioned skeleton makes the page jump on every load, the generic error hides the failure from support. These are the bugs that make a SaaS feel amateur, and they're all designed-away by holding the contract from the first commit.

Tone and depth: adult, terse, decisions-first (Pedagogical guidelines §2). No celebratory framing.
Heavy reuse of established chapter vocabulary — do **not** redefine *the shadcn dividend*, *live region*, *`role="status"`/`role="alert"`*, *`sr-only`*, *assistive technology / AT* (all `<Term>`-defined L2/L3). Reference them by name.

Forward references to plant (named, not taught): Suspense + route-level `loading.tsx` → Ch 031; URL-state list view with the full server-data loading lifecycle → Ch 060; form-field validation errors + `aria-invalid` → Ch 044; optimistic mutations at depth → Ch 043/060 and the TanStack Query chapter (Unit 4, "Ch 16" in the outline's older numbering — refer to it as "the server-state / TanStack Query chapter," not a number, since the exact chapter id isn't pinned here); React error boundaries / `error.tsx` (render errors, distinct from data errors) → Ch 080; toast notifications → L3 (this chapter, already taught — name, don't re-teach).

Code-component strategy overall: this lesson is **one big CodeVariants** (three-booleans vs discriminated-union, the lesson's spine), **a TabbedContent of the four states** (the visual tour — each tab a primitive + its a11y pairing), **one StateMachineWalker** (the state machine as a navigable diagram, `kind="machine"` with a Mermaid topology), **one DrizzleSchemaCoding-style ReactCoding** exercise (refactor three booleans into a union and render all four), and small `Code`/`AnnotatedCode` blocks for the per-primitive shapes. Close with a **MultipleChoice** (which empty-variant copy) and a **TrueFalse** recall round. One **Buckets** drill near the top to make the empty-vs-loading distinction concrete. Diagrams stay short (laptop viewport, ≤800px).

---

## Lesson sections

### Introduction (no header — opening prose)

Open with the concrete demo-to-prod failure, not a definition.
Scenario: the invoices table looks finished — rows render, it's pixel-perfect in the demo with seeded data. Ship it. Then a real user opens it on a fresh account (empty: the table renders a bare header and a void, no "create your first invoice"), on hotel wifi (loading: a blank rectangle, then a jarring jump as rows pop in), and during an API blip (error: nothing, or a frozen spinner forever).
The component was only ever designed for *one* of its four states.
State the lesson goal: by the end, the student designs all four states of any data surface as a contract, drives them from a single discriminated union instead of a pile of booleans, and pairs each visual state with the accessibility state a screen-reader user needs.
Connect to what they know: they've already got the primitives (L1) and the live-region vocabulary (L3); this lesson is the discipline that *composes* them into a complete component.
Keep it ~5-6 sentences, warm and brief.

Reasoning: the demo-looks-done-prod-breaks framing is *the* hook because it names a failure every junior has shipped, which motivates the contract better than "components have states." Leading with the senior question implicitly (Pedagogical guidelines §2, filter 1).

### The four states are a contract

Purpose: name the four states crisply and establish *empty is a loaded state* before any code — the single most common conceptual confusion. This is the conceptual frame the rest of the lesson hangs on.

Teach:
- **Name the four.** **Loading** — the data is in flight, nothing to show yet. **Empty** — the data *loaded successfully* and there is genuinely none. **Error** — the data didn't load. **Populated** — the happy path, data in hand. Four mutually exclusive states; exactly one renders at a time.
- **Empty is not loading.** Hammer this: loading and empty both "show nothing," but they're opposite states — loading is *before* the answer, empty is *the answer is "none."* They need different UI (a skeleton vs an onboarding CTA) and different a11y ("Loading…" vs a heard heading + action). Conflating them is why so many apps show a spinner forever on an empty account.
- **The component-level framing (the "why this lesson lives here" note).** State plainly that this contract is a property of the *component*, independent of where data comes from — a Server Component awaiting a query, a Client Component reading TanStack Query, a `use(promise)` boundary all surface the same four states. This lesson teaches the *shape*; later chapters wire it to real server data (name Suspense/`loading.tsx` → Ch 031, URL-state list views → Ch 060, the TanStack Query chapter — by description, not number). So: no `fetch` here; the data source is abstracted to a `status` value.
- **The senior reflex, stated once:** before you write the populated view, name the other three. A component that can only render populated is unfinished, not done.

Component: a small **Buckets** drill (two buckets: "Loading" / "Empty") to force the distinction concrete and early. Chips are short scenarios:
- Loading: "The request is still in flight", "We don't know yet whether there are rows", "The skeleton placeholders are showing".
- Empty: "The query succeeded and returned zero rows", "A brand-new account with no invoices", "Filters matched nothing".
Use `instructions` to frame: "Sort each into the state it describes." This externalizes misconception (a) immediately, before the student sees any code that might cement it.

`<Term>` candidates: none new here — *populated*, *empty state* are plain enough; defer the `<Term>` budget to the union and primitives sections.

Reasoning: naming the four and isolating empty-vs-loading *before* any code is the cognitive-load move — get the categories crisp so the later code/primitives are just attachments to known slots. The Buckets drill is deliberately placed up front (not as end-of-section assessment) because misconception (a) actively corrupts how the student reads the rest of the lesson if left unaddressed.

### Three booleans is the bug; one status is the cure

Purpose: **the conceptual spine of the lesson.** Show the canonical anti-pattern the student has written, feel why it rots, then introduce the discriminated union as the structural fix. Everything after this renders *off* the union.

Teach:
- **The three-boolean ladder — the canonical bug.** `const [isLoading, setIsLoading] = useState(true); const [error, setError] = useState(null); const [invoices, setInvoices] = useState([]);` then a render ladder: `if (isLoading) … else if (error) … else if (invoices.length === 0) … else …`. Walk the failure modes concretely:
  - **Order-dependence:** the ladder's correctness depends on check order; reorder two branches and you render error-under-loading or empty-under-error. Easy to get subtly wrong.
  - **Impossible states are representable:** `isLoading: true` *and* `error: set` *and* `invoices: [3 rows]` is a valid combination of three booleans the types permit but the domain forbids. Three independent booleans = 2³ = 8 representable combinations for 4 real states. The extra 4 are bugs waiting.
  - **Lost intermediate states:** "loading while showing stale data" (a refetch over already-loaded rows) has no clean home — `isLoading` true blows the list back to a skeleton, or you add a *fourth* boolean and the ladder gets worse.
- **The cure — a discriminated union.** One state value, a `status` discriminant: `{ status: 'loading' } | { status: 'empty' } | { status: 'error'; error: AppError } | { status: 'populated'; data: Invoice[] }`. Each state is **named once**, **carries exactly the data that state needs** (and no other — `error` has no `data`, `populated` has no `error`), and the four are mutually exclusive *by construction*. Cross-ref the Code-conventions rule directly ("prefer discriminated unions over flag booleans") — this is that rule made visible.
- **The compiler dividend.** A `switch (state.status)` over the union: TypeScript narrows each branch (inside `case 'populated'`, `state.data` is `Invoice[]`, no `?`), and with the union closed, the impossible combinations simply can't be constructed. The student already knows discriminated-union narrowing from TS; this is its highest-value UI application. Name `satisfies`/exhaustiveness lightly — a `default` branch with a `never` assertion makes "did I handle every state?" a *compile* error (recognition; don't drill the `never`-assertion mechanic).
- **Scope honesty:** this lesson models the union as plain `useState<DataState>` for teaching clarity — how the `status` actually *transitions* (loading→populated on resolve, populated→loading on refetch) is owned by the data-fetching chapters; here it's hand-set so the focus stays on *rendering* each state. Name this boundary so the writer doesn't grow a `useReducer`/fetch machine.

Component: **CodeVariants** (2 tabs), the lesson's spine.
- Tab 1 "Three booleans": the three `useState` + the if/else-if ladder; prose (one paragraph, the CodeVariants limit) names the rot — "order matters, impossible states are representable, stale-data has no home." Use `data-mark-color="red"` on the ladder.
- Tab 2 "One discriminated union": the `DataState` union type + a `switch` rendering each branch; prose names the win — "every state named once, narrowed by the compiler, impossible states unrepresentable." Use `data-mark-color="green"` on the `status` discriminant.
Keep both tabs honest tsx (typed props, arrow functions, `const`) but stripped of fetch plumbing.

Optionally follow with a tiny **CodeTooltips** pass on the union type alone if the narrowing needs a closer look — tooltip the `status` field ("the discriminant: TS narrows the rest of the object by its value") and one payload field (`data: Invoice[]` — "only present in the populated variant"). Use only if the CodeVariants prose doesn't already carry it; don't double up.

`<Term>` candidates: *discriminant* (define: "the literal-typed field — here `status` — whose value tells TypeScript which variant of the union you're in"). *Discriminated union* itself is prior knowledge (TS chapters) — reuse by name, light or no Term.

Reasoning: this is the lesson's single most transferable takeaway, so it gets the strongest component (CodeVariants A/B) and the most careful walk. Leading with the *bug the student has written* (three booleans) before the cure is the decisions-first filter and maximizes the "oh, that's why" payoff. The "8 representable combinations for 4 states" framing makes "impossible states" concrete and quantitative rather than hand-wavy. Pinning the scope (no transition machine) is essential — this chapter must not grow a data-fetching lesson.

### The loading state: skeletons, spinners, and what you know

Purpose: teach the loading affordance *decision* (skeleton vs spinner vs progress), the shadcn primitives for each, the no-layout-shift principle, and the loading a11y pairing.

Teach:
- **`Skeleton` is the 2026 default for known-shape content.** shadcn's `Skeleton` (a `<div>` with `animate-pulse bg-muted rounded`; note it's Radix-free — pure Tailwind + `cn`) is what you reach for when the layout's shape is known: table rows, card grids, lists, dashboard widgets. Install via `pnpm dlx shadcn@latest add skeleton` (recognition; L1 owns the CLI).
- **The load-bearing principle — match the populated dimensions.** A skeleton must occupy the *same box* the real content will — same row heights, same column widths, same card grid. Why: a skeleton sized differently from the real content makes the page **jump** when data arrives (layout shift), which is exactly the jank the skeleton was supposed to prevent. The discipline: build the skeleton from the populated layout, not as a generic grey blob.
- **Spinner is for short, indeterminate, unknown-shape work.** shadcn now ships a dedicated **`Spinner`** primitive (renders a spinning Lucide loader with `animate-spin`). Reach for it on a button submitting, a quick indeterminate action, or content whose shape you genuinely don't know. The cut, stated as a one-liner the student can keep: **a spinner says "something is happening"; a skeleton says "*this* is coming."** Skeleton when you know the shape; spinner when you don't.
- **The sub-200ms trap.** A skeleton (or any loading UI) on a load that finishes in under ~200ms *flashes* — it appears and vanishes before the eye settles, adding perceived jank instead of removing it. The fix: for very fast loads, show no loading UI, or delay the skeleton's mount (~200ms) so it only appears if the wait is real. Name this as a watch-out (`:::caution`); don't build the delay hook (it's a Ch 026-catalog shape — forward-ref lightly).
- **Known progress → `Progress`; never fake it.** Long operations with *measurable* progress (file upload, bulk import) use shadcn's `Progress` (a Radix primitive) driven by a real percentage. Unknown progress → indeterminate `Progress` or a single honest status line ("Importing…"). The rule: never animate a fake progress bar to look busy — it lies, and it desyncs from reality.
- **The loading a11y pairing (the L3 dividend, applied).** A screen-reader user perceives *nothing* of a silent skeleton. Pair the loading visual with a `role="status"` live region announcing "Loading invoices" (polite — L3's default). Reuse *live region* / *`role="status"`* / *AT* by name (L3 owns them). One sentence: the skeleton is for sighted users, the live region is for the rest — both ship, always.

Component: **AnnotatedCode** of an `InvoiceTableSkeleton` (~10-12 lines) stepping through:
1. the component maps over a fixed count of placeholder rows (`Array.from({ length: 5 })`) — step explains "shape matches the real table: 5 rows, same columns";
2. each cell is a `<Skeleton className="h-4 w-…" />` sized to the real column — color this step, prose ties widths to the populated layout;
3. the wrapping element carries `role="status"` + an `sr-only` "Loading invoices" — color this step, prose names the L3 pairing.
AnnotatedCode is right here: one compact file with three distinct things the student must attend to in sequence (shape-match, sizing, a11y pairing), and the a11y step lands best highlighted on the exact lines that carry it.

Optionally, a **StateMachineWalker** (`kind="decision"`) "Which loading affordance?" if the skeleton-vs-spinner-vs-progress choice wants externalizing — but only one walker in this lesson; this section's decision is simpler than the state-machine one below, so prefer to teach it inline as the "known shape? → skeleton; unknown short op? → spinner; measurable progress? → Progress" one-liner and **reserve the StateMachineWalker for the state-machine view**. (Flag for the writer: don't ship two walkers.)

`<Term>` candidates: *layout shift* (define: "content moving on screen after first paint as late-arriving elements push it around; jarring and a Core Web Vitals penalty"). *`animate-pulse`* — plain enough, no Term.

Reasoning: the loading state carries the most *decisions* (three affordances) and the most-skipped *principle* (dimension-matching), so it earns the AnnotatedCode walk. Leading with skeleton-as-default then carving spinner/progress as the conditional is the "defaults before conditionals, trigger before tool" filter. The sub-200ms trap and fake-progress rule map directly to chapter watch-outs and are exactly where juniors go wrong. Verified June 2026: shadcn ships a first-class `Spinner` primitive now (not just a hand-rolled `Loader2`) — teach the primitive.

### The empty state: a CTA, not a void

Purpose: teach the empty state as a first-class component with the shadcn `Empty` primitive, its real composition, the four empty *variants* (the copy differs), and the empty a11y pairing.

Teach:
- **The empty state is a job, not a blank.** A useful empty state has four parts: an icon or illustration, a heading naming what's missing, a one-line description, and — the discriminator — a **primary CTA that resolves the empty state.** "No invoices yet" + "Create your first invoice to get started" + a `New invoice` button. The CTA is what separates a useful empty state from a polite shrug; an empty state with no action is a dead end (chapter watch-out).
- **shadcn's `Empty` primitive — the real composition.** shadcn ships a composed `Empty` (verified June 2026): `Empty` > `EmptyHeader` > (`EmptyMedia variant="icon"` holding a Lucide icon + `EmptyTitle` + `EmptyDescription`), then `EmptyContent` holding the CTA button(s). Imports from `@/components/ui/empty`. Show the canonical minimal shape; the student should recognize the parts, not memorize them. (This corrects the chapter outline's vaguer "Empty block" — the 2026 primitive is this specific composition.)
- **The four empty variants — copy differs by cause.** The *same* primitive, four different messages, because the right next action differs:
  1. **First-run empty** (no data ever) — onboarding CTA ("Create your first invoice").
  2. **Filtered empty** (data exists, the active filter matched none) — "No invoices match your filters" + a "Clear filters" action. *Not* an onboarding CTA — the data exists, the filter is the problem.
  3. **Search empty** (a query returned nothing) — echo the query, offer to broaden or correct it.
  4. **Permission empty** (data exists but this user can't see it) — explain *access*, not absence ("You don't have access to this workspace's invoices"), never imply there's nothing there.
  Name all four because shipping the first-run CTA into a filtered-empty state (the common mistake) tells the user to "create your first invoice" when they have 200, just behind a filter.
- **The empty a11y pairing.** A screen-reader user must *hear* the empty state: a real semantic heading (`EmptyTitle` renders one) and a focusable, labeled CTA button. Because empty is a settled state (not an async change), it generally doesn't need a live region — it's normal page content with proper heading + button semantics. Contrast with loading/error, which *are* async changes and so *do* use live regions. (This contrast is itself instructive — say it.)

Component: **CodeVariants** (or **TabbedContent** if the visual matters more than the code) showing two of the four variants side-by-side to make the copy-differs point land: "First-run" vs "Filtered". Each tab is an `<Empty>` composition with different `EmptyTitle`/`EmptyDescription`/`EmptyContent` (onboarding button vs "Clear filters" button). Prose (one paragraph per tab) names which variant and why the CTA differs. Use shadcn imports and a Lucide icon in `EmptyMedia`.

Exercise: a short **MultipleChoice** (multi-select if >1 correct) — "A user has 200 invoices but the 'Overdue' filter matches none. Which empty-state copy is right?" with options spanning the first-run CTA (wrong — implies no data), the filtered-empty + "Clear filters" (right), a bare "No results" (weak — no recovery action), and a permission message (wrong cause). Externalizes the variant-confusion misconception with a realistic stake.

`<Term>` candidates: *CTA* (define: "call to action — the primary button or link that moves the user toward resolving the state, e.g. 'Create your first invoice'"). Worth a Term — it's used throughout and a junior from another field may not have it crisp.

Reasoning: empty is the state juniors most under-design (it *looks* like nothing needs doing), so it gets a full section and a realistic exercise. The four-variants framing is the senior content — anyone can write "No results," but knowing the copy must differ by *cause* (and shipping the onboarding CTA into a filtered list is the classic miss) is the transferable insight. Teaching the real `Empty` composition (verified) keeps the lesson honest to the 2026 primitive. The "empty doesn't need a live region, loading/error do" contrast reinforces the a11y model by negative example.

### The error state: retry, don't apologize

Purpose: teach the component-level (inline) data-error pattern with shadcn `Alert variant="destructive"`, the retry action, the support-id discipline, the error a11y pairing, and the crucial *error boundaries are a different layer* distinction.

Teach:
- **Component-level data errors get an inline, recoverable card.** When a *leaf* component fails to load its data (a dashboard card whose query errored), it shows a compact error card with three things: a clear message, a **Retry** action, and (optionally) an error code or correlation id for support. shadcn's **`Alert variant="destructive"`** is the canonical container — composition `Alert` > (icon + `AlertTitle` + `AlertDescription`); the Retry button sits alongside (an `AlertAction` slot in current shadcn, or a `<Button>` in the description — keep it light, the point is *a focusable retry exists*).
- **"Something went wrong" helps nobody.** The chapter watch-out, stated as a rule: a generic message with no retry and no id is the error state that wastes everyone's time — the user can't recover, support can't diagnose. Give a *recovery* (Retry) and a *diagnostic handle* (an error code / copyable correlation id). Keep the *user* message human and the *operator* detail (the id) terse and copyable — name that the user-message-vs-operator-detail split (Code-conventions §Error handling owns the depth; here it's just "show a retry and an id"). Don't surface a raw stack trace to the user.
- **The error a11y pairing.** The error message lives in a `role="alert"` region (L3: assertive, atomic — this *is* the genuine-error case `alert` exists for) so AT announces it immediately, and the **Retry button is focusable and labeled**. Reuse *`role="alert"`* / *AT* by name. One line on the L3 severity cut: a failed load is a real `alert`, not a `status` — this is exactly where `alert` is justified.
- **Error boundaries are a different layer — name it, don't teach it.** Distinguish the *data-fetch error* this lesson handles (the query rejected; you catch it and render the four-state error UI) from a **React error boundary** / Next.js `error.tsx`, which catches *render-time exceptions* at a tree boundary. They're different mechanisms for different failures: data errors flow through your `status` union as state; render errors are thrown and caught by the framework boundary. Name this so the student doesn't think `Alert` replaces `error.tsx` or vice versa; forward-ref the boundary depth → Ch 080. This is a recognition-only distinction.

Component: **Code** block (tsx) of the `case 'error'` branch from the union switch — an `<Alert variant="destructive">` with `AlertTitle` ("Couldn't load invoices"), `AlertDescription` (a human message + the correlation id), and a focusable `<Button onClick={retry}>Retry</Button>`, the whole thing in `role="alert"`. ~10 lines. Tie it back to the union: "this is what `case 'error'` renders." Keep `retry` as an abstracted prop/callback (the lesson doesn't own refetch mechanics — name that).

`<Term>` candidates: *correlation id* (define: "a unique id attached to a failed operation that the user can quote to support so an engineer can find the exact failure in the logs"). Worth a Term — it's a senior habit the student likely hasn't met and it carries the "diagnostic handle" point.

Reasoning: the error state is where juniors do the *least* (a `try/catch` that renders "error") so the section's job is to raise the bar to retry + id + announced-alert. The error-boundary-vs-data-error distinction is genuinely confusing the first time and is exactly the kind of layer-confusion a senior must hold — naming it cleanly (without teaching boundaries) prevents the student from conflating two mechanisms. Using the real `Alert` composition (verified) and reusing L3's `alert`-is-the-exception rule keeps continuity tight.

### The state machine behind the contract

Purpose: lift the four states from a static list into a *machine* — show the transitions (including the stale-data-while-refetching refinement) as a navigable diagram, and name the reusable `<DataPanel>`-style composition. This is the synthesis section.

Teach:
- **The four states are a state machine.** Render the transitions: `loading → (populated | empty | error)`, and the senior refinement — `populated → loading` on **refetch** (and `error → loading` on **retry**). The shape is small but the *transitions* are the point: a component doesn't just *have* four states, it *moves* between them on events (resolve, reject, refetch, retry).
- **The "stale while refetching" refinement.** Once data has loaded once, a *subsequent* fetch should usually **not** blow the populated view back to a full skeleton — that flashes the user back to a loading shell they've already passed. Instead, keep showing the stale data with a *subtle* loading indicator (a thin `Progress` bar at the top, a small `Spinner` in the refresh button). Frame as the senior move: the naive `isLoading`-true-resets-everything is the jank; "show stale, indicate refresh" is the fix. Name that the server-state libraries (TanStack Query, the data chapters) do this *by default* — the discipline starts here, the tooling automates it later (forward-ref, don't teach).
- **The reusable shape — a `<DataPanel>`.** Name (recognition) the pattern of a small wrapper component that takes the four slots (`loading`, `empty`, `error`, `children`/populated) and a `status`, and renders the right one — so a screen doesn't re-implement the ladder per component. Every data surface in later projects is one of these. Keep it recognition-level (show its *signature*/prop shape, not a full impl) — the student should know the shape exists and recognize it when a project writes it.
- **Optimistic state — the fifth state, named once.** The briefest mention: a mutation can show its *after* state immediately while the request is in flight, rolling back on failure (with a `role="alert"` announcement on rollback — "Failed to save, reverted"). This is the fifth state the senior recognizes; it's owned by the optimistic-mutations / TanStack Query chapters. One sentence + forward-ref. Don't teach it.

Component: **StateMachineWalker** (`kind="machine"`) — the lesson's one real diagram — paired with a Mermaid `stateDiagram-v2` in the `diagram` slot. States: `loading`, `populated`, `empty`, `error` (and the refetch/retry transitions back to `loading`). Each `<Question>` is a state whose body says what renders there (the primitive + the a11y pairing, tying the whole lesson together) and whose branches are the *events* (`resolved with rows` → populated, `resolved empty` → empty, `rejected` → error, `refetch` → loading). This is the synthesis: walking the machine re-touches every state's primitive and a11y twin in one artifact, and the synced topology diagram makes "it's a machine, not a list" visible. Per the diagrams guide, a state machine is D2/Mermaid territory; `kind="machine"` + Mermaid topology is the documented pairing for the walker.
- Authoring note for the writer: keep state ids that read both in MDX and Mermaid (`loading`, `empty`, `error`, `populated` — no hyphen normalization issues). Cap the diagram height (≤800px); four states + a few edges is compact.

`<Term>` candidates: *stale data* (define: "previously-loaded data still shown on screen while a fresh copy is being fetched in the background"). Worth a Term — it carries the refetch refinement.

Reasoning: ending on the state-machine view is the synthesis move — it re-frames the four static states the lesson taught as a *dynamic* machine, which is the mental model the chapter framing asked for ("render this as a small state diagram… drive the UI from a single discriminated union"). The walker is justified specifically because it lets the student *traverse* the states and re-encounter each primitive + a11y pairing in context, consolidating the lesson in one interactive artifact. The stale-while-refetching refinement is the one genuinely senior transition (and the most common refetch jank), so it earns naming here even though the tooling that automates it is later. Keeping `<DataPanel>` and optimistic-state at recognition depth holds the scope line.

### Refactor to four states (exercise)

Purpose: the one hands-on rep — take the three-boolean component and refactor it to a discriminated union that renders all four states with the right primitives. This is the lesson's load-bearing skill, so it gets a graded exercise.

**ReactCoding**, tests-graded, `hidePreview` *off* (the student should see the four states render).
- Instructions: "This component uses three booleans and renders only some of its states. Refactor it to a single `status` discriminated union, and render all four states: a `Skeleton` for loading, an `Empty` (with a CTA) for empty, an `Alert` for error, and the table for populated. Wire `role` on the loading and error regions."
- Starter: an `App` taking a `status`-ish prop *or* (simpler) a hard-coded state value the student can flip; the body is the three-boolean ladder, missing the empty and a11y branches. Provide minimal stand-in `Skeleton`/`Empty`/`Alert` (inline, since ReactCoding has no shadcn — a few-line local stub each, clearly marked "stands in for the shadcn primitive") so the exercise is about the *state logic and a11y wiring*, not importing the library.
- Tests assert (write each test name to communicate the miss):
  1. loading state renders a `role="status"` region ("loading must announce: role=status");
  2. empty state renders a heading *and* a button/CTA ("empty needs a heading and an action");
  3. error state renders a `role="alert"` region *and* a Retry control ("error must announce and offer retry");
  4. populated state renders the rows;
  5. (structural) the component switches on a single `status` value, not three booleans — assert by behavior: flipping `status` to each of the four values renders exactly that state and not the others (this catches the "still using booleans / impossible-state" failure).
- Grading: pass requires all five. The highest-value assertions are #1/#3 (the a11y pairing juniors skip) and #2 (the CTA), and #5 (proves the union actually drives the render).
Keep the starter ≤ ~18 lines so the refactor is focused.

Reasoning: this is the chapter's "do it once for real" — the union refactor *plus* the four renders *plus* the a11y pairing in one component, which is exactly the contract the lesson teaches. Tests-graded over a sandbox per the brief's "guided exercises always preferable." Inlining stub primitives keeps the exercise about the *discipline* (states + roles) rather than library wiring, which ReactCoding can't provide anyway. Test #5 (behavioral proof the union drives render) targets the exact misconception the lesson's spine attacks.

### Recall check (TrueFalse — end of lesson)

A short **TrueFalse** round (6-8 statements) consolidating the load-bearing facts. Candidate statements (writer refines):
- "Empty and loading are the same state — both show nothing." → **False** (empty is a *loaded* state; opposite of loading).
- "Three independent booleans can represent combinations the four real states never allow." → **True** (2³ = 8 vs 4; the extra are impossible states).
- "A skeleton should match the dimensions of the content it's standing in for." → **True** (else the page jumps on load).
- "A spinner is the right default for content whose layout shape is known." → **False** (skeleton is; spinner is for short/indeterminate/unknown-shape work).
- "An empty state should always show the same onboarding 'create your first…' CTA." → **False** (filtered/search/permission empties need different copy).
- "A failed data load should be announced with `role="status"`." → **False** (`role="alert"` — a genuine error).
- "A React error boundary (`error.tsx`) and a data-fetch error state are the same mechanism." → **False** (render-exceptions vs state).
- "When refetching data you've already loaded, you should replace the populated view with a full skeleton." → **False** (show stale data + a subtle indicator).

Reasoning: the lesson's value is a set of crisp, counter-intuitive facts (empty ≠ loading, booleans hide impossible states, skeleton-not-spinner, error-not-status). TrueFalse is the right low-friction format to verify those binary recalls, consistent with L2/L4 closing on a `TrueFalse`.

### External resources (optional, end)

1-2 **ExternalResource** cards, recognition-level:
- shadcn/ui `Empty` component docs (the composition the lesson uses) — or the shadcn `Skeleton`/`Spinner` page.
- The classic "stop using spinners" / skeleton-screens UX writeup (NN/g or a comparable authoritative source), *or* a "making impossible states impossible" piece for the discriminated-union framing.
Keep to genuinely authoritative sources; no listicles.

---

## Scope

**This lesson teaches:** the four-state component contract (loading / empty / error / populated) as a discipline held up front; the empty-is-a-loaded-state distinction; the three-boolean anti-pattern and the discriminated-union cure (one `status` discriminant, impossible-states-impossible, compiler-narrowed branches); the loading affordance decision (`Skeleton` for known shape and matched to populated dimensions / `Spinner` for short-indeterminate / `Progress` for measurable, never faked; the sub-200ms flash trap) with the `role="status"` pairing; the empty state as a `Empty`-composition with a CTA and the four copy-variants (first-run / filtered / search / permission); the error state as inline `Alert variant="destructive"` with Retry + correlation id and the `role="alert"` pairing, plus the data-error-vs-error-boundary layer distinction (recognition); and the state-machine view of the four states (with the stale-while-refetching refinement and the `<DataPanel>` shape, both recognition).

**Explicitly out of scope (redefine prerequisites tersely, do not re-teach):**
- **Server-data fetching, `fetch`/`await`, Suspense, route-level `loading.tsx`** — Ch 031 owns. This lesson abstracts the data source to a `status` value and hand-sets it; **no real fetching**. Name Suspense/`loading.tsx` as where these states meet server data; don't teach it.
- **The URL-state list view with the full server-data loading lifecycle** — Ch 060 owns. Referenced as where the contract scales to a real list view; not taught.
- **Server-state libraries (TanStack Query) and automated stale-while-refetch / cache states** — the server-state chapter (Unit 4) owns. Name that the library does stale-while-refetch by default; don't teach the library. Refer to it by description, not a chapter number (the id isn't pinned here).
- **State *transitions* / the fetch state machine in code (`useReducer`, async effects, transition wiring)** — the data chapters own. This lesson hand-sets `status` to teach *rendering* each state; it ships **no transition machine**.
- **Optimistic mutations at depth** — Ch 043/060 + the TanStack Query chapter own. Named once as "the fifth state" with a rollback `role="alert"` line; not taught.
- **React error boundaries / `error.tsx` / `global-error.tsx` (render-time exceptions)** — Ch 080 owns. Named only to *distinguish* it from data-error state; not taught.
- **Form-field validation errors, `aria-invalid`, `aria-describedby` field wiring, the `Result` error tree** — Ch 044 owns. This lesson's error state is a *data-load* failure, not field validation. Don't wire a form.
- **ARIA roles / live regions / `sr-only` at depth, the polite-vs-assertive cut** — L3 (this chapter) owns. Reuse `role="status"`/`role="alert"`, *live region*, *AT*, *`sr-only`* by name; this lesson only *applies* them as each state's a11y twin.
- **shadcn install / the CLI / `asChild` / the dividend framing** — L1 owns. Use `pnpm dlx shadcn add <primitive>` and the primitives as recognition; don't re-explain the model.
- **Focus management (post-submission focus, focus-the-error)** — L4 (this chapter) owns. The error state here is component-level data error, not a form submission; no focus-move pattern (that's L4/Ch 044).
- **Toast notifications / Sonner** — L3 (this chapter) owns (live regions). Mention only as "the toast surface you already met"; don't re-teach.
- **The error-handling `Result<T>` type, user-message-vs-operator-detail at depth, logging the correlation id** — Code-conventions §Error handling + later observability chapters own. Here it's only "show a human message, a Retry, and a copyable id"; don't build the `Result` plumbing.
- **A delayed-skeleton / `useDelayedShow` hook implementation** — Ch 026 custom-hook catalog owns. The sub-200ms trap is named as a watch-out; the hook is a forward-ref, not built.

---

## Code-conventions alignment notes (for downstream agents)

- All tsx follows Code conventions §Components/JSX and §TypeScript: arrow-function components bound to `const`; typed props, no `any`; **discriminated unions over flag booleans** (this lesson is the canonical demonstration of that rule — `{ status: 'populated'; data } | { status: 'error'; error } | …`, never `{ isLoading, error?, data? }`); class composition via `cn()` with `className` last; `'use client'` only where state/effects are actually used (the state-value examples can stay server-renderable in principle, but since they model interactive states, marking the example components `'use client'` is fine — don't over-explain it).
- The union type is the lesson's spine — name the `status` field the *discriminant*, give variants exactly the data each state needs (no optional-everything bags), and prefer a `switch (state.status)` render. A `never`-asserting `default` for exhaustiveness is recognition-only (don't drill it).
- shadcn primitives used **as imported** from `@/components/ui/*` (§shadcn primitives): `Skeleton`, `Spinner`, `Empty` (+ `EmptyHeader`/`EmptyMedia`/`EmptyTitle`/`EmptyDescription`/`EmptyContent`), `Alert` (+ `AlertTitle`/`AlertDescription`), `Progress`. Don't fork them; the lesson only *composes* them. Lucide icons inside `EmptyMedia` are already `aria-hidden` by default (L3) — don't hand-add it.
- §Accessibility, the four-states bullet, is literally this lesson: `<Skeleton>` over spinners, `<Empty>` with a CTA, `<Alert>` with retry, `role="status"` for loading, `role="alert"` for error, live regions mounted before content. Keep the lesson's claims aligned to that bullet verbatim where they overlap.
- §Naming: booleans-as-predicates only where a boolean genuinely remains (the lesson's *point* is to replace them); kebab-case filenames if any are shown (`data-panel.tsx`, `invoice-table-skeleton.tsx`); components are noun phrases (`InvoiceTableSkeleton`, not `LoadingWrapper`).
- Tailwind §Styling: `Skeleton`'s `animate-pulse` and any `Progress`/`Spinner` motion follow `motion-reduce:` discipline where the animation is noticeable (L2) — note it lightly on the skeleton if shown.
- **Deliberate divergences to flag in prose so they read as intentional, not unfinished:**
  - The data source is abstracted (a hand-set `status`), **not** fetched — this lesson teaches *rendering* the four states; fetching/transitions are Ch 031/Ch 060/the data chapters. Mark the boundary.
  - The ReactCoding exercise uses **inline stub** `Skeleton`/`Empty`/`Alert` (a few lines each) because the live runtime has no shadcn — mark them clearly as standing in for the real primitives so the student doesn't think that's the import shape.
  - The `retry` callback and the correlation id are **abstracted props**, not real refetch/logging plumbing (owned by the data + observability chapters) — note it.

---

## Currency / fact-check notes (verified June 2026, for downstream agents)

- **`Spinner` is a first-class shadcn primitive now** (added 2026) — teach `Spinner`, not a hand-rolled `Loader2` icon. The chapter outline's "`Loader2` icon in the refresh button" is stale; use the `Spinner` primitive (or, if an icon is genuinely needed, the current Lucide name is **`LoaderCircle`** / `loader-circle` — `Loader2` is the deprecated alias).
- **`Empty` is a specific composition**, not a loose "block": `Empty` > `EmptyHeader` > (`EmptyMedia variant="icon"` + `EmptyTitle` + `EmptyDescription`) + `EmptyContent`, from `@/components/ui/empty`. The chapter outline's "Empty block (and many in the registry)" undersells it — teach the real primitive composition.
- **`Alert` composition** is `Alert variant="destructive"` > (icon + `AlertTitle` + `AlertDescription`); current shadcn also exposes an `AlertAction` slot where the Retry button can live (keep light — the point is a focusable retry, not the exact slot name).
- **`Skeleton` is Radix-free** (pure Tailwind + `cn`), unlike most primitives — worth a one-clause note since L1 framed primitives as Radix-backed.
- **CLI is shadcn v4** (consistent with L1 continuity notes); install reads `pnpm dlx shadcn@latest add skeleton spinner empty alert progress`. Component doc URLs are engine-namespaced (`/components/radix/<name>`) — cosmetic, but if a writer links the docs, use the current path.
- WCAG **2.2 AA** floor (consistent with L2/L3/L4) — keep, don't revert to 2.1.

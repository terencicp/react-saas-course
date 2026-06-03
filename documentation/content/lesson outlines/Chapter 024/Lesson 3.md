# The four homes for state

- Title: The four homes for state
- Sidebar label: Four homes for state

## Lesson framing

This is the chapter's *placement* lesson. L1 and L2 taught what `useState` does and when **not** to use it (derive instead). This lesson answers the question that comes *before* you type `useState`: **where should this value live?** The four-homes thread runs L1 → here → L4 and connects forward to URL state in Ch 033 / Ch 060. L1 already planted a four-homes Mermaid map labeling each leaf with its owning lesson; this lesson is the owner of that "lift / URL / server" branch, so it must cash that map out — keep the leaf labels consistent.

The senior framing (from `Code conventions.md` §Hooks): *"`useState` for local UI state. Lift to a parent only when a sibling needs to read it. URL state lives in the URL via `nuqs`, not `useState`."* The whole lesson is the elaboration of that one sentence. The reflex to install is **"colocate first, relocate on evidence"** (the slogan L1 established — reuse it verbatim). Lifting too eagerly is as wrong as lifting too late; both are failures of the same judgment.

Target student: a junior dev who knows `useState` mechanically but reaches for it reflexively for *everything* and, when prop-drilling hurts, reaches for context as a reflex. The two real-world failures to inoculate against: (1) **lift-on-prediction** (lifting state "in case a sibling needs it later," which prop-drills and re-renders the world), and (2) **`useState`-as-the-wrong-tier** (server data in `useState` that goes stale the moment a second tab opens; filters in `useState` that vanish on refresh and can't be shared). The senior payoff: shareable/bookmarkable URLs, refresh-survival, and a single source of truth — all *placement* decisions, not API decisions.

Pedagogical spine:
- **One running scenario** — a `SearchableTable` / product-list filter UI — carries the whole lesson. Same UI gets re-placed across all four homes so the student feels the *consequences* of each placement (does refresh keep it? can I share the link? does a second tab desync?), not just the mechanic. This minimizes cognitive load: one domain, four placements.
- **Build complexity gradually.** Start local (the default, smallest), introduce lifting only when a concrete second-consumer trigger appears, escalate to URL only when a concrete share/refresh expectation appears, name server as the fourth tier last. Never present all four at once before motivating them.
- **Lead with the decision, not the syntax.** Lifting mechanics are mostly review (controlled inputs from Ch 023 L4); the *new* content is the decision tree and the smells. The interactive decision walker is the centerpiece artifact.
- **Mechanics that ARE taught hands-on:** lifting (move state to common parent, pass value + typed `onChange` callback down) gets a code walkthrough + a live exercise, because the typed-callback contract is a real convention students get wrong (they pass setters across boundaries). URL state is *recognition only* — show the shape, name `nuqs`, forward-reference; do not teach the `useSearchParams` API (that's Ch 033/060).
- **Two smells as the assessment hook:** the "multiple `useState`s tracking one conceptual value + a sync effect" smell (lift-not-done) and its inverse "state lifted too high" smell. These are the diagnostic skills the lesson certifies.

Mark-color convention (continued from L1/L2): orange = smell (under-lifted sync, over-lifted bloat), green = correct placement. Keep consistent.

## Lesson sections

### Where does this value live?

**Role:** Introduction (warm, brief, per pedagogical structure). Open with the running scenario as the senior question — *don't* label it "senior question," state it implicitly. A `SearchableTable`: a search `<input>` at the top, a list of product rows below. The `query` string has to live *somewhere*. Pose the three plausible homes as a live tension: local to the input? lifted to the parent that owns the rows? in the URL as `?q=shoes`? State that the choice is invisible in a 10-line demo but decides shareability, refresh behavior, back-button undo, and SSR in a real app. Preview the four-homes framing and the "colocate first, relocate on evidence" reflex. Connect back: L1 said `useState` holds UI-driving values and named four homes; L2 said don't store what you can derive; this lesson decides *which home*.

Keep it to a few short paragraphs. No code yet — the scenario is described, shown in the next section.

**Tooltip (`Term`) candidates introduced here:** ((source of truth)) — the single authoritative location a value is read from and written to; everything else reads a copy.

### Home 1 — local, the default

**Role:** Establish the baseline. State that belongs to a single component and no one else cares about — a dropdown's `isOpen`, a hovered row, an uncontrolled accordion section. This is where *every* piece of state starts; you relocate only on evidence.

Show the `SearchableTable` in its simplest honest form: `query` as local `useState` *in the parent that renders both the input and the list* — because the list already needs to read `query` to filter, so even the baseline here is "lifted to the nearest common owner." Use this to make the subtle point early: **colocation means the closest common ancestor of everyone who needs the value**, which is often *not* the leaf. A `useState` in the `<input>` itself would strand the list. Frame this as colocation done right, not as "lifting."

**Code:** a single `Code` block (simple, not annotated) — `SearchableTable` with `const [query, setQuery] = useState('')`, a controlled `<input>`, and `products.filter(...)` derived in render (callback to L2 — the filtered list is derived, not stored). Keep it ~15 lines. This is the artifact the rest of the lesson mutates.

**Reflex to land:** "colocate first" = put state at the *narrowest* component that still sits above everyone who reads it. Premature lifting above that is the over-lift smell (covered later); stranding it below is the under-lift smell.

**Tooltip:** ((colocation)) — placing state in (or just above) the component that uses it, rather than high in the tree by default.

### Home 2 — lifted, when a sibling needs it

**Role:** Teach the lift mechanic and, more importantly, its *trigger*. This is the only mechanic taught hands-on because the typed-callback contract is a real convention.

Motivate with a concrete second consumer: a `<ResultCount>` sibling beside the input must show "12 results for 'shoes'", and a "Clear" button in a third spot must reset the query. Now two-plus components need `query`. *That* is the lift trigger — not prediction. The state moves to the common parent (it's already there in our baseline, so frame the generalized rule: when two siblings need a value, it moves to their closest common ancestor and flows down as **props + a typed callback**).

Land the three canonical lift triggers explicitly:
1. Two siblings need the same value (filter input + results list + count).
2. An ancestor must *react* to a child's state (form fields driving a Save button's `disabled`).
3. State must survive one child's unmount (a value that outlives a tab switch — note `key` resets often handle this better, cross-ref Ch 023 L5, one line).

**The single-source-of-truth point:** the lifted component owns the value; children become *controlled* (render purely from props, report changes up). This is review from Ch 023 L4 (controlled inputs) — assert, don't re-teach.

**The typed-callback contract (the real new convention, from `Code conventions.md`):** children receive `onQueryChange: (next: string) => void`, **not** the raw `setQuery` setter. Reasoning to give the student: a named callback is a stable contract you can refactor (add validation, debounce, logging) without touching the child; passing the setter across the boundary leaks the parent's storage choice and couples the child to `useState`. Booleans-as-predicates and `set`+noun naming carry over from L1.

**Code (`CodeVariants`, before/after):**
- Tab "Setter passed down" (orange marks) — child typed `{ setQuery: Dispatch<SetStateAction<string>> }`, prose: works, but leaks the storage mechanism and is awkward to type/refactor.
- Tab "Typed callback" (green marks) — child typed `{ query: string; onQueryChange: (next: string) => void }`, prose: the contract the course uses. One paragraph each, ≤6 lines.

Follow with an `AnnotatedCode` walkthrough of the green version's full `SearchableTable` → `<SearchBar>` + `<ResultsList>` split: step 1 highlight the lifted `useState` in the parent (the source of truth), step 2 the props+callback passed to `<SearchBar>`, step 3 `<ResultsList>` reading `query` purely from props, step 4 the derived filter (L2 callback). This is the one place the student needs attention directed across multiple parts of one file.

**Exercise (`ReactCoding`, tests mode):** give the student a `SearchableTable` where `query` is *stranded* in the `<SearchBar>` leaf (local `useState` inside the input component) so the `<ResultsList>` can't filter. Task: lift `query` to `SearchableTable`, pass it down as `query` + `onQueryChange`. Tests assert: typing in the input filters the visible rows (DOM row count drops), and the input remains controlled (its `value` reflects state). This certifies the lift mechanic + the callback contract hands-on. Provide a reference solution in a `<details>` below.

### Home 3 — the URL, when it should survive refresh or be shared

**Role:** Introduce the third tier as a *placement upgrade*, recognition-level only. The deep API is Ch 033/060 — this lesson lands the **decision rule**, not the mechanic.

Re-place the same `query`: if a user filters to "shoes", refreshes, and expects "shoes" to still be there — or copies the URL to a teammate and expects them to see the same filtered view — then `query` belongs in the URL as `?q=shoes`, not in `useState`. The URL *is* the source of truth; components read from it. Land the senior framing: **"the URL is global state with a free synchronization mechanism."** Canonical URL-state values: search filters, pagination, sort order, the selected tab, a linkable modal/detail ID.

**The two-question test** (the durable takeaway): (1) If the user reloads, do they expect this to stick? (2) If they share the link, should the recipient see the same view? Either *yes* → URL. Both *no* → local/lifted is fine.

**`nuqs` — named once as the 2026 reach.** When URL state grows past one or two params, `nuqs` wraps the raw `searchParams` reads with typed parsers, defaults, batching, and history mode. Show a *recognition-only* snippet (`Code`, ~3 lines): `const [query, setQuery] = useQueryState('q', parseAsString.withDefault(''))` — note how the call site *looks* like `useState` on purpose, which is the whole point. Explicitly forward-reference: the full `useSearchParams` / `nuqs` surface is Ch 033 and Ch 060; here we only place the value. One `Aside` (note) caveat: **URL state must be parsed/validated on read** (Zod) because users edit URLs — forward-ref Ch 033, one line. Do not teach the validation here.

**Disambiguate from the prior decision tree:** Ch 012 L4 already taught a cookie / `localStorage` / URL / server / `useState` tree from the *storage* angle. One sentence: that lesson asked "which browser storage?"; this one asks "which React-state home?" — URL is the overlap, same conclusion from the component side.

**Tooltips:** ((nuqs)) — a typed search-params library for React; treats URL query params like `useState`. ((searchParams)) — the `?key=value` portion of the URL, React's source of truth for URL state.

### Home 4 — the server, when it's the canonical record

**Role:** Name the fourth tier, recognition only. Inoculate against the single most expensive `useState` misuse.

Server state = data backed by a database: the user's saved products, the team's settings, invoices. It does **not** belong in `useState` long-term. Concrete failure to make visceral: load a list into `useState`, edit it in tab A, and tab B still shows the stale list — `useState` has no idea the server changed. Plus refetch-on-every-mount and lost optimistic updates. The fix is to read it in a Server Component (Ch 032) or cache it with a server-state library (Ch 076 / TanStack Query) — both forward-referenced, neither taught. From `Code conventions.md`: *"Server Components and Server Actions own server state by default."*

Keep this short — it's the tier the student will spend whole later chapters on. The job here is only to *reserve the slot* in the mental model so `useState` doesn't claim it.

**One-line `Aside` (caution):** "Server state in `useState` looks like it works until the user opens a second tab." (Reuse the chapter-outline phrasing — it's sharp.)

### The decision: a tree you run top-down

**Role:** The synthesis centerpiece. Consolidate the four homes into one ordered decision the student runs *before* reaching for `useState`. Order matters — ask the most-constraining question first.

**The tree (state it once, in prose, as the canonical order):**
1. Is it canonical data backed by the server? → server (Server Component / cache).
2. Should it survive refresh or be shareable? → URL.
3. Do two or more components need it? → lift to the closest common ancestor.
4. Otherwise → local `useState`.

This top-down order is deliberate and worth a sentence of justification: server and URL are *global* concerns that override locality; only after ruling them out do you ask the lift question; local is the fallthrough default. (Note this inverts the "start at the leaf" *narrative* — reconcile explicitly: you *default* to local and *relocate* outward, but when *auditing* a value you check the global tiers first because they're the most consequential to get wrong. Same reflex, two directions. Call this out so the student isn't confused by the apparent contradiction with "colocate first.")

**Primary artifact — `StateMachineWalker` (`kind="decision"`).** This is the best vehicle: it forces the student through the senior's question *order* one branch at a time, which is exactly the skill. Author it against the running `query` example and a couple of foils so the leaves feel concrete.
- `Question id="server"` prompt "Is this the server's canonical record (saved data backed by a DB)?" → branch "Yes" to `leaf-server`; "No" to `share`.
- `Question id="share"` prompt "Should it survive a refresh or be shareable via the URL?" → "Yes" to `leaf-url`; "No" to `siblings`.
- `Question id="siblings"` prompt "Do two or more components need to read or change it?" → "Yes" to `leaf-lift`; "No, just one" to `leaf-local`.
- `Leaf id="leaf-server"` verdict "Server Component or query cache" — body: name Ch 032 / TanStack, the stale-tab failure.
- `Leaf id="leaf-url"` verdict "URL state (`nuqs`)" — body: the two-question test, batching/sharing.
- `Leaf id="leaf-lift"` verdict "Lift to the closest common ancestor" — body: props + typed callback, single source of truth.
- `Leaf id="leaf-local"` verdict "Local `useState`" — body: colocate at the narrowest common owner.
Do **not** wrap in `<Figure>` (the walker is its own card). Caption-style framing goes in the prose intro above it.

**Reinforce with the chapter-map `Figure` (Mermaid `flowchart LR`).** Reuse L1's four-homes leaf-label-with-owning-lesson convention so the chapter map stays consistent across lessons: leaves = local `useState` (this ch L1), lift (this lesson), URL/`nuqs` (Ch 033), server (Ch 032 / Unit 18). Pedagogical goal: one glance that ties the decision tree to *where in the course* each home gets its full treatment — a wayfinding aid, not new content. Wrap in `<Figure>` with a caption. If this duplicates the walker too closely, prefer keeping the walker as the interactive primary and the flowchart as the static map; they serve different modes (walk vs. overview).

### Two smells: under-lifted and over-lifted

**Role:** The diagnostic payload — the senior skill of *recognizing misplaced state in existing code*. This is the section the quiz will draw from.

**Smell 1 — under-lifted (duplicated state + sync effect).** The shape: a `searchInput` `useState` in the input component, a separate `searchQuery` `useState` in the list, and a `useEffect` syncing one to the other. This is "lifting not done." It's also a callback to L2's anti-pattern (a `useState` watched by a `useEffect` that sets it) — name the overlap. The fix: delete both copies and the effect; one `useState` at the common parent flows down. Show with `CodeVariants`:
- "Duplicated + synced" (orange) — two states + sync effect, prose: two sources of truth, a stale frame, a dependency-array bug surface.
- "One source, lifted" (green) — single lifted state, prose: the fix.

**Smell 2 — over-lifted (state hoisted above its only consumer).** The shape: a tab's `activeTab` lifted all the way to the root layout when only one route's component reads it — every tab click now re-renders the whole app (callback to Ch 023's render model: state change re-renders the owner and its subtree, so a high owner = a big subtree). The fix: push it down to the smallest component that actually needs it. Frame as the mirror image of smell 1: *"lifting too eagerly is as wrong as lifting too late."*

**The form-draft canonical case (lands the lift judgment positively).** End on the textbook *correct* lift: form state lives on the **form component**, never on the individual inputs. The form owns submit, validation, and dirty-tracking; inputs are presentational and controlled. This is the "one form, many inputs, one piece of state" pattern — the single most common legitimate lift in a SaaS app. Recognition only; Unit 6 owns forms. One short paragraph + a tiny `Code` sketch of a form holding a `values` object with inputs wired via callbacks.

**Exercise (`MultipleChoice` or `Buckets`) — placement diagnosis.** Prefer `Buckets`: give ~6 concrete values from a SaaS UI (e.g., "modal open/closed", "active search filter", "the logged-in user's saved profile", "which sidebar accordion is expanded", "current page number in a paginated list", "an unsaved form draft") and four buckets (Local / Lifted / URL / Server). Student sorts each into its home. This certifies the whole-lesson decision skill in one drill. Goal/grading: each value maps to exactly one defensible home (filter & page → URL; saved profile → server; modal & accordion → local; form draft → lifted). Add a one-line rationale per item in the component's feedback.

### Prop-drilling is not a context bug

**Role:** Close the most common over-correction. The student who just learned to lift will hit prop-drilling and reach for context as a reflex — head this off.

When lifted state traverses several layers, passing it as a prop through intermediates is *prop-drilling*, and it is **not automatically a problem**. Two or three layers of an explicit prop is fine and refactor-friendly. The instinct to "fix" it with context is sometimes right (genuinely cross-cutting state: auth user, theme, locale) and often premature — context has its own re-render cost. Land the rule from `Code conventions.md` framing: **context is for cross-cutting concerns, not for skipping intermediate components.** Forward-reference Ch 025 L4 (context + the perf footgun) as the owner of that decision — do not teach context here, name it.

**One-sentence mention of the compound-component alternative:** when the drilling comes from *layout* nesting (a `Card` → `CardHeader` → `CardBody`), compound components (Ch 022 L2, already taught) often wire children implicitly and remove the need to drill at all. Recognition only, one line, cross-ref.

**Aside (tip):** "Reaching for context to avoid passing a prop two layers deep trades a visible, typed contract for a hidden one. Pass the prop." 

### External resources

LinkCards (`ExternalResource`), optional, 1–3:
- React docs — "Sharing State Between Components" (the lifting-state mechanic, canonical).
- React docs — "Choosing the State Structure" (placement and single-source-of-truth).
- `nuqs` docs homepage — the 2026 URL-state reach (recognition; deep use is later chapters).

## Scope

**Prerequisites to assert briefly, not re-teach:**
- `useState` signature, snapshot/setter-stability, the four-homes map — Ch 024 L1 (assert the map, this lesson owns its lift/URL/server branches).
- Derive-don't-mirror, the sync-effect anti-pattern — Ch 024 L2 (the under-lifted smell is a callback; restate the shape in one clause).
- Controlled inputs (value + onChange flowing through a parent) — Ch 023 L4 (assert as known; the lift mechanic *is* making children controlled).
- `key`-reset for prop-seeded state — Ch 023 L5 (one-line cross-ref under lift trigger 3).
- Render model (state change re-renders owner + subtree) — Ch 023 (callback in the over-lift smell; don't re-explain reconciliation).
- `useEffect` runs-after-commit one-clause primer — already established L2; do not expand.

**Explicitly NOT covered (forward-referenced, named once max):**
- The `useSearchParams` / `nuqs` API surface, parsers, batching, history mode — **Ch 033 L4–5 and Ch 060** (Unit 10). This lesson is recognition-only on URL mechanics.
- Zod validation of URL params — Ch 033 (named as a caveat, not taught).
- `useContext`, context providers, and the context re-render footgun — **Ch 025 L4**. Named as the prop-drilling non-fix; the decision lives there.
- Server-side data fetching / Server Components as the server-state home — **Ch 032**.
- Server-state caching (TanStack Query, the four triggers) — **Ch 076 / Unit 18**.
- Forms at depth (validation, submission, server actions, `useActionState`, uncontrolled inputs) — **Unit 6**. The form-draft case is recognition only.
- `useReducer` (the "12 useStates → reducer" threshold) — **Ch 024 L4** (next lesson; do not preempt).
- `useRef`, `useId` — Ch 024 L5/L6.
- Global stores (Zustand, Jotai) — Unit 15, not even named here unless one clause distinguishes "URL/server are the 2026 defaults before a global store."
- Compound components at depth — Ch 022 L2 (one-line recognition only).
- File-system colocation patterns — Ch 029 L1 (different sense of "colocation"; do not conflate).

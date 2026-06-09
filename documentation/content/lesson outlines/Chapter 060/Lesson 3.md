# Typed input, committed URL

**Sidebar label:** Search input rhythm

---

## Lesson framing

This is lesson 3 of chapter 060. The student already has the list-view anatomy (L1: read-on-server / write-on-client, the `nuqs` parser module at `app/invoices/searchParams.ts`, the share-and-refresh contract) and the filter/sort vocabulary (L2: filter shapes, `-key` sort, the **cursor-reset invariant**). The `q` search param and its parser (`searchParser = parseAsString.withDefault('')`) already exist in the module; L1 left a stub `<SearchInput initialQuery={q} />` in `page.tsx`. This lesson builds that component and answers one question: **how do you wire a free-text search box so it filters a server-rendered list without firing a query, a URL write, and a history entry on every keystroke?**

The single mental model the lesson must install: **typed vs. committed.** The text in the box (typed) is component state; the text the server is querying against (committed) is the URL. They diverge while the user types and reconverge a beat later. Everything else in the lesson hangs off this split — `useDeferredValue` decides *when* to converge, `useTransition` keeps the box responsive *while* converging, `shallow: false` is *what makes the convergence reach the server*, `limitUrlUpdates` *bounds the URL writes*, and the cursor-reset invariant fires *on convergence*.

Why this is a senior-mindset lesson, not a syntax lesson: the naive version (controlled input whose `onChange` writes the URL directly) *works in dev* and *fails in production* — one server round-trip per character, one history entry per character, a back button that rewinds the search letter by letter. The student must leave able to name that failure before they see the fix. The "decisions before syntax" framing: the lesson is a sequence of rhythm decisions (where does typed state live? when does it commit? does the commit hit the server? how often can it hit?), each with a default and a named trigger for the alternative.

Pedagogical spine, minimizing cognitive load: start from the naive direct-write component and *let it be wrong*, name the three symptoms concretely (round-trip spam, history spam, server load), then introduce the typed/committed split as the structural fix, then layer the React-side rhythm (`useDeferredValue` + `useTransition`) and the URL-side rhythm (`nuqs` `limitUrlUpdates`) as two independent knobs that solve two different problems — students conflate them, so the lesson must keep "keep the *input* responsive" (React) separate from "bound the *URL writes*" (nuqs). Build the final 30-line component once, in pieces.

Key 2026-accuracy corrections the writer MUST honor (verified against nuqs docs, June 2026):
- **`throttleMs` is deprecated as of nuqs 2.5.0.** Do NOT teach it. Use `limitUrlUpdates: throttle(ms)` or `limitUrlUpdates: debounce(ms)` (both imported from `nuqs`). For a search box the senior pick is `debounce` (wait until typing settles), not `throttle`.
- **`shallow: false` is load-bearing and was implicit in earlier lessons.** A `nuqs` write defaults to `shallow: true` (client-only, no server notify). A search box that drives a *server-rendered* list MUST set `shallow: false` on the `q` write so the Server Component re-renders with the new query. This is the single most important option in the lesson and the chapter outline omits it — surface it explicitly.
- **`history` defaults to `'replace'` in nuqs** (not `'push'`). So the "use replace" advice is "don't override the default to push," not "remember to set replace." Frame accordingly.
- **`scroll` defaults to `false` in nuqs setters** (unlike raw `router.replace`, which scrolls). One less thing to pass.

Tone: adult, terse, decision-first. No "what is state." Reuse L1/L2 terminology verbatim (the reset invariant, read-on-server/write-on-client, share-and-refresh).

---

## Lesson sections

### Introduction (no header)

Two short paragraphs. Open on the concrete problem: the invoices list now filters and sorts; the last pillar is free-text search, and a search box is where the naive implementation bites hardest. Pose the senior question (every keystroke must not = a query + a URL write + a history entry) and name the deliverable: the `<SearchInput />` the L1 page stubbed, wired with the React 19 input rhythm. Connect to prior knowledge in one sentence — same read-on-server/write-on-client division, same parser module, same reset invariant; the new idea is the **typed-vs-committed split.** End by previewing the mental model so the student reads the rest looking for it.

### The naive search box, and the three ways it breaks

Lead with the wrong version so the fix has stakes. Show a minimal controlled input whose `onChange` calls the `nuqs` setter directly (`setQuery(e.target.value)`), with `shallow: false` so it actually drives the server list. State plainly: this works in a demo with 12 rows. Then name the three production symptoms precisely — this is the section's payload:

1. **Server round-trip per character.** With `shallow: false`, every keystroke re-renders the Server Component and re-runs the query. Typing "overdue" = 7 queries, 6 of them thrown away.
2. **History-entry spam.** Even though nuqs defaults to `history: 'replace'` (so the *back button* survives), the deeper problem is the rapid-fire URL writes themselves and the wasted renders — and if a writer *did* reach for `history: 'push'` here, the back button would rewind the search one letter at a time. Name push-on-keystroke as the canonical anti-pattern.
3. **Input lag on the write.** Tying the input's `value` to a state that only updates after a server round-trip can make the box feel sticky on slow devices/connections — the field shouldn't wait on the query.

Use **CodeVariants** here is premature (the fixed version comes later); instead use a single small **Code** block for the naive component and a tight prose list for the three symptoms. Optionally reinforce symptom #1 with a small **diagram** (see below) — but the diagram's natural home is this section because it visualizes the per-keystroke round-trip storm.

Diagram — **"one keystroke, one round-trip" storm (DiagramSequence).** Goal: make the wasted-work concrete and motivate deferral. A `DiagramSequence` of ~4 steps scrubbing through the user typing `p` → `pa` → `pai` → `paid`. Each step shows a simple horizontal strip: `keystroke → URL write → Server re-render → query → table` lighting up, with a small counter "queries run: N" incrementing. The last step's caption: "Four characters, four full round-trips — three of them discarded the instant the next key landed." This is a *simple visual aid*, hand-built HTML inside `DiagramStep`s (boxes + a tick counter), not a system graph. Keep it under the height cap. Rationale: the storm is temporal, so a scrubbable sequence beats a static figure; it sets up "deferral lets React skip the intermediate renders."

### Typed vs. committed: two states, two homes

The conceptual core. Define the two states crisply and assign each a home:
- **Typed** — the current value of the input, what's in the box this instant. Lives in **component state** (`useState`). Changes on every keystroke. Drives the input's `value` (controlled).
- **Committed** — the value the server is querying against, what's in the URL's `q`. Lives in the **URL** (`nuqs`). Changes only when typing settles. Drives the database query (read on the server, L1).

The decision rule, stated as a callout-worthy line: *the input is controlled by typed state; the server is controlled by committed state; the job of the rhythm is to move typed → committed at the right moment.* Tie back to the L1 URL-vs-state rule ("would the user expect this back after a refresh?") — the *committed* query passes that test (a shared `?q=overdue` link reproduces the search), the *half-typed* `ov` does not, which is exactly why typed stays in the component and only the settled value reaches the URL.

Diagram — **the typed/committed timeline (Figure + hand-coded HTML/SVG, or DiagramSequence).** Goal: show divergence-then-reconvergence over time. A horizontal timeline: top track = "typed" updating every keystroke (`o, ov, ove, over, overd, overdu, overdue`), bottom track = "committed (URL)" flat-lining at the old value, then snapping to `overdue` after a settling gap, with the gap shaded "deferred / debounced." A single annotated **Figure** with a hand-built two-track HTML diagram is enough and reads in one glance (prefer this over a sequence here — the whole point is seeing both tracks *at once*). Rationale: students who hold "the input and the URL are the same value" can't reason about the rhythm; this picture is the unlock.

Small check here — **MultipleChoice** (1 question): "The user has typed `ove` but the URL still says `?q=over`+nothing. Which is the bug?" with options that force the student to recognize that *typed ≠ committed mid-stroke is correct, not a bug.* This catches the most common misread (see L1 watch-out: "the URL's `q` and the typed state can momentarily disagree — that's correct"). Keep it to one question, inline.

### Letting React choose the rhythm: useDeferredValue

Now the React-side rhythm, isolated. Introduce `useDeferredValue` as the 2026-native replacement for a hand-rolled `setTimeout` debounce *of the render*. Build it in two moves:

1. `const [typed, setTyped] = useState(initialQuery)` — input value; `onChange` sets it. The box is now instant and fully decoupled from the URL.
2. `const deferred = useDeferredValue(typed)` — a value that *lags* `typed` during heavy work; React keeps showing the old `deferred` until it can catch up, and crucially **skips intermediate values** when updates pile up (type fast, React may jump straight from `over` to `overdue`).

State the mental model from the code conventions verbatim in spirit: **`useDeferredValue` is a priority marker, not a speed boost** — it tells React "this update is non-urgent, deprioritize re-rendering against it." That's why it's adaptive: fast device commits almost immediately, slow device lets more keystrokes coalesce. Contrast with `setTimeout` debounce: fixed delay regardless of device; `useDeferredValue` has no number to tune.

Note React 19's `useDeferredValue(value, initialValue)` second arg in one sentence — lets the deferred value start at a given value on first render (useful when the initial `q` comes from the URL). Mention lightly; don't make it load-bearing.

Important precision (this is a documented trap — L3 watch-out): **the deferred value drives the URL write; the typed value drives the input.** Deferring the URL write itself (instead of deferring a value you then write) defeats the purpose. The pattern: `useEffect`/transition watches `deferred`, writes `deferred` to the URL. Get the direction right.

Use **AnnotatedCode** for this build — the component is now ~3 hooks and the student's attention needs to land on each in turn (the `useState`, the `useDeferredValue`, the write driven by `deferred`). Color the deferred-value line distinctly. Keep each step ≤6 lines of prose.

### Keeping the box responsive while the list catches up: useTransition and isPending

The second React knob, solving a *different* problem than `useDeferredValue` — the lesson must keep them distinct or students will think they're redundant. Frame: `useDeferredValue` decides *when* the URL commits; `useTransition` is about *what the user sees while the resulting server re-render is in flight.*

- `const [isPending, startTransition] = useTransition()`; wrap the URL write in `startTransition(() => setQuery(deferred))`. This marks the navigation + Server Component re-render as a non-urgent transition, so React keeps the input (and the current table) interactive instead of blocking on the new render.
- `isPending` is a boolean that's `true` while the transition's work is pending — drive a **subtle** loading affordance with it: a small spinner inside the input or a dimming/fade on the table. Senior anchor (from the outline): *never block the input on the search query; typing is always instant; the table may lag and should say so quietly.*

Make the division explicit with a one-line table or callout: **`useDeferredValue` → keeps the *render* non-urgent and coalesces keystrokes; `useTransition` → keeps the *input* responsive during the commit and gives you `isPending` for the loading state.** Note they compose — you use both. (nuqs setters also return a transition-aware pending in some setups, but teach the React primitives as the durable skill; the code conventions list both hooks as priority markers.)

Optional reinforcement — **RenderTracking** is overkill here; skip. A short **Code** snippet showing the `isPending`-driven `aria-busy` / spinner on the input is enough.

Tooltip terms in this section: `isPending`, "transition" (Term: a non-urgent state update React can interrupt to keep the UI responsive).

### Bounding the URL writes: nuqs limitUrlUpdates

The URL-side rhythm — the third knob, again a distinct concern. Even with React deferring renders, the *deferred value can still change several times* as typing settles, and each change is a URL write. `limitUrlUpdates` bounds the writes at the nuqs layer.

Teach the **current** API (this is the key 2026 correction):
- `useQueryState('q', searchParser.withOptions({ shallow: false, limitUrlUpdates: debounce(300) }))` — import `debounce` (and `throttle`) from `nuqs`.
- **`debounce` vs `throttle` for search:** `debounce(ms)` waits until writes *stop* for `ms` before committing — ideal for a search box (don't query `o`, `ov`, `ove`…; wait for the pause). `throttle(ms)` commits at most once per `ms` window — better for continuously-dragged inputs (sliders). The senior pick for free-text search is **debounce**, ~300ms.
- **Call out the deprecation explicitly in a caution:** `throttleMs` was removed-in-favor-of `limitUrlUpdates` in nuqs 2.5.0; code or tutorials using `{ throttleMs: 200 }` are pre-2.5 and should migrate to `{ limitUrlUpdates: throttle(200) }`. This protects the student from copying stale snippets.

The two-layer rhythm, named: **React defers the *render* (input stays smooth, keystrokes coalesce); nuqs debounces the *URL write* (history stays clean, server load stays bounded).** A student might ask "if I have `useDeferredValue`, why also debounce the URL?" — answer in one line: deferral is about *render priority on this device*; debounce is about *not writing the URL / hitting the server on partial input*, which is a separate, externally-meaningful threshold. They're complementary, not redundant. (Honest senior note: for a small in-memory list you might lean entirely on `useDeferredValue` and skip the debounce; the debounce earns its weight precisely because `shallow: false` means each write is a real server query.)

Now restate the other options that are *defaults* and therefore *don't* need passing — students over-configure:
- `history` defaults to `'replace'` → back button already survives; don't set `'push'` on a search box.
- `scroll` defaults to `false` in nuqs → no `{ scroll: false }` needed (unlike raw `router.replace`).
- The only options the search write actually needs: **`shallow: false`** (reach the server) and **`limitUrlUpdates: debounce(300)`** (bound the writes).

Use **CodeVariants** here: tab 1 "Deprecated (pre-2.5)" with `{ throttleMs: 200 }` struck through in prose, tab 2 "Current" with `{ limitUrlUpdates: debounce(300), shallow: false }`. The A/B makes the migration unmistakable. Six-line prose cap per tab.

Tooltip terms: "debounce" (Term: wait until activity stops for N ms, then act once), "throttle" (Term: act at most once per N-ms window).

### The empty query and the cursor reset

Two short, sharp rules that complete the contract — both are reuses of established chapter patterns, so keep them brief.

**Empty query omits the param.** An empty box must produce no `?q=` in the URL, not `?q=`. `parseAsString.withDefault('')` + nuqs default-stripping (L1 rule: a value equal to the parser default is stripped from the URL) handles this for free — clearing the box returns the URL to the home view, and a shared "nothing searched" link matches the default list. One paragraph; reference the L1 default-stripping rule by name rather than re-teaching it.

**`q` change resets the cursor — the reset invariant, applied to search.** Changing the query changes *what is shown*, so it invalidates any pagination cursor (a cursor encodes a position in the *current* ordered, filtered, searched result; a new `q` is a new result). Per L2's named **cursor-reset invariant**, the `q` write must bundle `cursor: null` in the *same* setter call — `useQueryStates({ q, cursor }, …)` then `setQuery({ q: next, cursor: null })`. State that this is the same structural rule L2 applied to filter/sort and L4 will apply to the pagination edges — consistency across every param that changes the result set. nuqs does not auto-clear it. Keep this tight; it's a callback, not a new concept.

Small check — **Sequence** or **Dropdowns**: order the events of one settled keystroke burst, e.g. (typed updates → React defers → debounce window elapses → setQuery({q, cursor:null}) with shallow:false → Server re-renders → table updates → isPending clears). Reinforces that the cursor reset rides *with* the committed write, not separately. Prefer **Sequence** (drag-to-order) since the ordering is the lesson.

### The search input, end to end

The payoff: assemble the full ~30-line `<SearchInput />` exactly as L1's stub promised — `app/invoices/_components/search-input.tsx`, `'use client'`, prop `initialQuery: string` (L1 named the prop `initialQuery`), and a native `type="search"` input. Show every piece together now that each was built in isolation:

- `useState(initialQuery)` for typed; input `value={typed}`, `onChange` sets it.
- `useDeferredValue(typed)`.
- `useQueryStates({ q: searchParser, cursor: cursorParser }, { shallow: false, limitUrlUpdates: debounce(300) })` for the merge-setter (note: per-key vs whole-hook options — put `shallow`/`limitUrlUpdates` where nuqs's current API expects them; the writer should verify the exact option placement for `useQueryStates` against nuqs docs at build time).
- `useTransition` for `isPending`.
- An effect (or transition-wrapped write) that, when `deferred` changes, calls `startTransition(() => setQuery({ q: deferred || null, cursor: null }))` — `|| null` so empty clears the param.
- `isPending`-driven spinner + `aria-busy`.

Use **AnnotatedCode** for the final assembly (single source of truth, step through the 5 concerns the student now recognizes). Keep `maxLines` near the cap and let it scroll. After it, one paragraph on the server side — *unchanged from L1*: the page already does `const { q, … } = await searchParamsCache.parse(props.searchParams)` and passes `q` to `listInvoices(...)`; this lesson didn't touch the server, which is the point of the typed/committed split. Then a one-line note that *what the query does with `q`* (substring `ilike` vs Postgres full-text search) is a database concern covered in chapter 038 — name the spectrum, don't teach it; the URL-state side is shape-agnostic.

Brief **accessibility** paragraph (contract only, per outline; chapter 027 owns depth): native `type="search"` (or `role="searchbox"`), `aria-controls` pointing at the results table's `id`, and an `aria-live="polite"` region announcing the result count ("5 results") when the table updates so screen-reader users learn the search resolved. One paragraph; reference chapter 027.

**Cannot use ReactCoding for an editable nuqs sandbox** (project memory: the ReactCoding iframe loads only the React family, not nuqs/RHF/Zod). Two acceptable substitutes for hands-on practice, choose per the writer's judgment:
- A **ReactCoding** exercise on the *React-only* slice — give the student a janky controlled input wired straight to a fake `onSearch` prop and have them add `useState` + `useDeferredValue` + `useTransition` so the box stays responsive and a `data-pending` flag flips during a simulated slow filter (mock the "server" with a deliberately expensive synchronous filter over a seeded array, asserted via tests on `data-pending` / rendered rows). This exercises the durable React primitives, which is the transferable skill, without needing nuqs.
- If the React-only exercise is too contrived, fall back to a **Sandpack** embed (memory: library sandboxes use Sandpack) prefilled with nuqs + `NuqsAdapter` so the student can see real URL writes — but guided ReactCoding is preferred over an open sandbox; only reach for Sandpack if the real-nuqs experience is pedagogically necessary.

Optionally close with a **VideoCallout** if the resourcer finds a focused (<12 min), current (2025–2026) clip on React 19 `useDeferredValue`/`useTransition` for search inputs — supplementary, one sentence of framing. Do not invent a video id; leave a marker for the resourcer.

### The blur/Enter alternative — when typing-as-you-go is wrong

Short closing section naming the one alternative the default doesn't cover (per outline: "name a case, don't override the default"). For a slow/expensive/rate-limited data source, or a deliberately search-on-submit UX, commit on **blur** or **Enter** instead of as-you-type: drop `useDeferredValue`, write the URL from `onBlur` and from `onKeyDown` (Enter), still `shallow: false`, still reset the cursor. One short paragraph + a tiny **Code** snippet of the `onKeyDown`/`onBlur` handler. Frame as a deliberate product choice (the older "form that submits to the URL on Enter" is fine), with the React 19 deferred-value flow as the 2026 default for filter-as-you-type. This gives the student the decision, not just the recipe.

---

## Scope

**Prerequisites — assume taught, restate in one line max, do not re-teach:**
- `useRouter`/`useSearchParams`/`router.replace` mechanics (ch. 033 L5); reading `searchParams` on the server (ch. 033 L4).
- The list-view anatomy: read-on-server/write-on-client, the `searchParams.ts` parser module, `searchParamsCache.parse`, `<NuqsAdapter>`, the share-and-refresh contract, value-as-prop + setter-from-hook control pattern, default-stripping (ch. 060 L1).
- Filter shapes, `-key` sort encoding, `useQueryStates` merge-setter (`null` clears / `undefined` leaves), and the **cursor-reset invariant** by name (ch. 060 L2).
- `useState`, controlled inputs, the React Compiler (no manual memoization) — earlier units.

**Explicitly out of scope (defer, name only where the outline says to):**
- Postgres full-text search / `ilike` / FTS ranking mechanics — ch. 038 L8 (name the spectrum, point there).
- The N+1 risk if search joins line items — ch. 039 L2.
- Cursor *encoding* internals and cursor-vs-offset (this lesson only *resets* the cursor; it does not build it) — ch. 060 L4.
- Typeahead/autocomplete dropdown, real-time results — separate UX, out of scope.
- Rate-limited external search (Algolia/Typesense) — name as alternatives only.
- Server Actions that mutate/revalidate the list — ch. 043 / project ch. 062.
- Accessibility primitives at depth — ch. 027 (state the contract only).
- Tenant scoping of the query — Units 8–9 (treat the list query as already tenant-scoped, do not re-teach).
- `showArchived`/soft-delete-as-filter wired into the base query — ch. 061.

**Deliberate divergences from code conventions (note for downstream agents):**
- Conventions say "no `useEffect` for deriving state / handling events." The deferred→URL sync may read as an effect; prefer the transition-wrapped write in the change/derive path over a `useEffect` watching `deferred` where possible, but if an effect is the cleanest expression of "when the deferred value settles, write the URL," it's the documented exception (synchronizing component state with an external system — the URL). Writer should pick the simplest correct shape and add a one-line comment naming why if an effect is used.
- The naive component in section 2 is *intentionally wrong* and must be visibly labeled as such so it isn't copied.

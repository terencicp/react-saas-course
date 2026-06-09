# Filter shapes and sort encoding

- **Title:** Filter shapes and sort encoding
- **Sidebar label:** Filter shapes and sort

## Lesson framing

This is the "fill the filter/sort stubs" lesson of the chapter.
Lesson 1 shipped the architecture (read-on-server / write-on-client, one shared `searchParams.ts` parser module, the share-and-refresh contract) and built **one** control in full — `StatusFilter`, a single-value enum.
Lesson 2's job is to (a) generalize that one shape into a small **catalog of filter shapes** the student can reach for by reflex, (b) build the `<SortControl />` stub left by lesson 1 and teach the `-key` sort encoding with its enum-gated-by-indexes rationale, (c) teach two cross-cutting rules that recur in every later lesson: writing one parameter must not trample its siblings, and **any change to what-is-shown must reset pagination**, and (d) give the user the affordances to *see and undo* filters — active-filter chips and clear-all.

Pedagogical spine: the student already has the canonical single-enum shape from lesson 1, so this lesson teaches by **extension, not from scratch**. Each new filter shape is framed as "same idea as `status`, different parser." Lead every shape with the URL the user sees (`?tags=billing,urgent`), then the parser that reads it, then the control that writes it — concrete artifact first, mechanism second. This matches lesson 1's house style.

The two highest-value ideas to land, because they are where beginners ship bugs:
1. **Sort must be an enum, not a free string** — this is the senior decision of the lesson. A free sort string is both an injection-shaped surface and a performance cliff (unindexed sorts). The enum is gated by the composite indexes that exist. Frame it as a real production stake, not a syntax rule.
2. **The cursor-reset invariant** — changing a filter, sort, or search term while a stale `cursor` sits in the URL produces nonsense pages. This is *the* canonical bug of URL-state list views. It recurs in lesson 3 (search) and lesson 4 (pagination), so this lesson must name it crisply and give the structural fix (bundle `cursor: null` into the same setter call). Lessons 3–4 will reference it by name.

Target student: junior dev, comfortable with TypeScript unions and `as const` (course conventions), has lesson 1's mental model fresh. They will *not* be writing nuqs code in a sandbox (the ReactCoding iframe can't load nuqs — see Scope), so checks-for-understanding use Dropdowns / Buckets / MultipleChoice, which fit the actual skill: pick the right shape, remember the invariant. No live nuqs coding.

Cognitive-load management: introduce shapes one at a time, simplest first (single enum recap → multi → range → boolean), each ~one screen with one code artifact. Defer the two cross-cutting rules (no-trample, reset) until *after* the four shapes exist, because both rules only make sense once there are multiple parameters to coordinate. Then the chips/clear-all section is the satisfying payoff that uses everything.

All code reuses lesson 1's `app/invoices/searchParams.ts` module and its conventions verbatim: `as const` value arrays with derived types, individually-exported `xParser`, `value`-as-prop + setter-from-hook control pattern, `replace` default. This lesson **widens** the module (adds `customer` to the sort enum, exports `SORT_VALUES`, adds `tagsParser`, `createdFromParser`/`createdToParser`, `showArchivedParser`) — the continuity note flags this is expected. Keep the descending-`-` convention and the `as const` + derived-type pattern when widening.

## Lesson sections

### Introduction (no header)

Warm, brief, lesson-1-style. Open on the concrete scene: the invoices screen from lesson 1 now needs more than a single status dropdown — the user wants to narrow to *several* tags at once, see only invoices created in Q1, flip a "show archived" toggle, and re-order by amount or customer. Recall what lesson 1 left: one control built (`StatusFilter`), three stubs commented in `page.tsx` (`SortControl`, plus search/pagination owned by later lessons), and the shared parser module both sides read from.
State the lesson's promise: by the end the student holds a **catalog of four filter shapes** they can reach for by reflex, can encode sort as a `-key` string gated by indexes, and knows the one invariant that keeps filters and pagination from trampling each other. Preview that everything plugs into lesson 1's exact page shape — no new architecture, just new shapes filling the stubs.
Reinforce the throughline sentence from lesson 1 (the page reads/validates/queries/renders; controls take their value as a prop and write via a setter; one parser module defines the shape for both sides) so the student anchors the new material on it.

### The single-value enum, recapped as the template

Brief — this is a *bridge*, not new teaching. Restate the `status` shape from lesson 1 as the template every other shape is a variation of: URL fragment `?status=paid`, parser `parseAsStringEnum(STATUS_VALUES).withDefault(null)`, control reads `value` prop and writes via the `useQueryState('status', statusParser)` setter. Name the three moving parts explicitly (**URL fragment → parser → control**) because the next three sections each fill in those same three slots with a different shape. The pedagogical goal: give the student a fixed mental scaffold so each new shape is "swap the parser, the rest is the same."
Code: a single short `Code` (ts) block showing just the one `statusParser` line plus its URL fragment as a comment — minimal, it's a recall cue not a new lesson. No need to re-show the full control; reference lesson 1.

### Multi-value filters: arrays in one parameter

Teach the multi-select shape. URL: `?tags=billing,urgent`. Parser: `parseAsArrayOf(parseAsString).withDefault([])`. Explain that `nuqs` defaults to **comma-separated** values in a single key. The separator is the parser's optional **second positional argument** — `parseAsArrayOf(parseAsString, ';')` switches to semicolons (verified against the nuqs 2.x parsers docs; do not write it as a `.withOptions({ separator })` call). Note the repeated-key web-platform form (`?tag=billing&tag=urgent`) is a different encoding convention, not nuqs' default. This is the repeated-key-vs-comma discussion the lesson-1 continuity note explicitly deferred here.
Frame the choice as a **senior decision** with a clear default: comma-separated is shorter and more readable in the address bar, repeated-key is more orthodox HTML-form behavior — pick comma unless interoperating with an external system (an existing API, a backend) that expects repeated keys. Give the reflex: default to comma.
Name the one real watch-out inline (not in a separate tips section): comma-separated breaks when a value itself can contain a comma — pick a separator the values can't contain, or stick to comma only when the value space is safe (slugs, ids, enum-like tags). This is a genuine production footgun.
Code: `CodeVariants` with two tabs comparing the two encodings (comma vs repeated-key), each ~6 lines: the parser line + the resulting URL as a comment + the one-line setter call (`setTags(['billing', 'urgent'])`). Tab prose: comma tab = "shorter, the default"; repeated-key tab = "web-orthodox, reach for it only when an external consumer needs it." Strip imports. This is a true A/B of the same idea, which is exactly `CodeVariants`' job.
Control note (prose, brief): a multi-select control (checkbox list or a multi-select dropdown) reads the `value: string[]` prop and calls `setTags(next)` — same value-as-prop + setter pattern as lesson 1, just an array. Don't fully build the control UI; the shape is the point. Mention the array setter clears the param when passed `[]` (the default), so an empty selection produces a clean URL.

### Range filters: two parameters, not one blob

Teach date/number ranges. URL: `?createdFrom=2026-01-01&createdTo=2026-03-31`. Parsers: `parseAsIsoDate.withDefault(null)` for each bound (two separate parsers, `createdFromParser` and `createdToParser`).
The senior decision here: **two parameters beats one combined blob.** Explain why — a single parameter encoding both bounds (a JSON blob, a custom `from..to` string) is brittle, hard to read in the address bar, and can't be cleared one-side-at-a-time. Two named parameters are self-describing and each clears independently. This mirrors the lesson-1 principle "don't put anything in the URL the user couldn't reasonably understand by reading it."
Show how the parsed values feed the query: the query function receives `createdFrom`/`createdTo` and applies `gte`/`lte` predicates (reference only — the Drizzle `where` mechanics are Chapter 038, out of scope; just show the values flowing in). Keep this to one or two lines so the student sees the round-trip without re-teaching Drizzle.
Watch-out (inline): a range parsed without timezone normalization confuses cross-region users — handle dates as UTC at the URL boundary and format in the user's timezone in the UI. Name it briefly and point forward (Unit 17 owns timezone discipline / the course's `Temporal` default). Do **not** teach Temporal here — one sentence, a forward pointer.
Code: a single `Code` (ts) block — the two parser lines + the URL fragment as a comment. Optionally a one-line comment showing the query predicate shape (`gte(invoices.createdAt, createdFrom)`) so the student sees where the value lands, clearly marked as Chapter-038 territory.
Add a `Term` on `parseAsIsoDate` if the name isn't self-evident (define: a nuqs parser that reads an ISO-8601 date string from the URL and hands back a Date, falling back to the default on a malformed value).

### Boolean toggles and the omitted-default rule

Teach the boolean shape. URL: `?showArchived=true`. Parser: `parseAsBoolean.withDefault(false)`.
The teaching point that matters most here is the **omitted-default rule** the student met abstractly in lesson 1 (`.withDefault` strips the param from the URL) now made concrete and load-bearing: because the default is `false`, the URL carries `?showArchived=true` *only* when the toggle is on, and is clean otherwise. The home view's URL stays short. Tie this back to lesson 1's "pick defaults matching the most common view so the empty URL is the home state."
Explicitly flag this as the shape **Chapter 061 builds on** for the soft-delete visibility toggle — name it as a forward reference so the continuity holds (don't wire soft-delete into the base query; that's Chapter 061).
Watch-out (inline): a boolean parameter left in the URL at its default value (`?showArchived=false`) is clutter — `withDefault(false)` plus nuqs' default-stripping is what prevents it; never write the `false` value explicitly. Also surface the `null` vs `undefined` setter nuance lightly here since it first bites on toggles: passing `null`/the default clears the param, passing `undefined` leaves it untouched (full treatment in the no-trample section).
Code: one short `Code` (ts) block: the parser line + the two possible URL states as comments (`?showArchived=true` when on, no param when off).

After the four shapes, insert a **Buckets** check-for-understanding. This is the natural consolidation point and the exercise type fits perfectly (classify by shape):
- `instructions`: "Each list-view requirement needs a filter shape. Sort each into the parser it maps to."
- Four buckets, one per parser: `parseAsStringEnum` (single enum), `parseAsArrayOf` (multi), `parseAsIsoDate` ×2 / "two range params" (range), `parseAsBoolean` (boolean). Label buckets by the shape name with the parser as the description.
- Items (requirements in plain English): "Show only one status at a time" → enum; "Filter by any of several tags" → multi; "Invoices created between two dates" → range; "Include archived rows or not" → boolean; "Pick one priority level" → enum; "Match several assignees" → multi; "Amount above a minimum and below a maximum" → range; "Toggle 'only my invoices'" → boolean.
- Goal: cement the shape→parser mapping as a reflex before moving to sort. Keep ~8 items, 2 per bucket.

### Sort: one string, a leading minus, and why it must be an enum

This is the lesson's center of gravity — the `<SortControl />` stub from lesson 1 gets built and the key senior decision gets made.
Teach the encoding first: sort is a **single string** parameter, `?sort=-total` (descending) or `?sort=total` (ascending), with a leading `-` meaning descending. Parser: `parseAsStringEnum(SORT_VALUES).withDefault('-createdAt')`, where `SORT_VALUES` is the array lesson 1 declared (`createdAt`, `-createdAt`, `total`, `-total`) **widened here to add `customer`/`-customer`** (the continuity note anticipates this; export `SORT_VALUES` now). The query function splits the string on the leading `-` to build the Drizzle `orderBy` clause (reference only — Chapter 038).
Then the senior decision, given its own emphasis because it's the most-skippable-yet-most-important idea: **why sort is an enum, not a free string.** Two distinct reasons, both production stakes:
1. **It's a shape-injection surface.** The sort value flows into the query's `orderBy`. Even though Drizzle parameterizes *values*, the *column being ordered on* is structural — a free string lets a hand-typed `?sort=passwordHash` (or any column) reach the planner. The enum constrains to a known, safe set. (This connects directly to lesson 1's self-check #2 about `?sort=passwordHash` — reuse that framing.)
2. **It's a performance cliff.** An unindexed sort forces the database to sort the whole result set in memory; at 50k rows it falls over. The enum is **gated by the composite indexes that exist** — every value in `SORT_VALUES` corresponds to a composite index `(orgId, sortKey, id)` so the query plan stays an index scan.
Land the senior anchor as a memorable rule: **the sort enum is gated by the indexes; a new sort option ships with its migration.** Adding a sort value without the matching index is the easy regression. Reference Chapter 039 (composite indexes) as already-taught background — restate the `(orgId, sortKey, id)` shape in one line, don't re-teach it.
Briefly dismiss the alternative encoding (separate `sortKey` + `sortDir` params) — two params, more bytes, no benefit; the course picks the single `-key` string. One sentence.
Sort UI affordances (prose + brief): two canonical choices, both calling the same setter — clickable column headers with up/down chevrons (cycle asc → desc → none/default; denser, table-native) vs a dropdown listing the options (more discoverable, works for non-table layouts like card grids). Name the choice as UX-driven; the lesson builds the dropdown form for `<SortControl />` since it's the simpler artifact and matches lesson 1's `<select>`-based `StatusFilter`.
Code: `AnnotatedCode` (ts/tsx) is the right component here — `<SortControl />` is the one fully-built control of this lesson and walking attention through its parts is exactly what AnnotatedCode is for. Steps:
1. the `'use client'` + import of the shared `sortParser` and `SORT_VALUES` from `../searchParams` (blue) — write, read, and option-list all trace to the parser module, same discipline as lesson 1's `StatusFilter`.
2. `value`-as-prop signature `({ value }: { value: Sort })` (blue) — server is the single read-source, restating lesson 1's contract.
3. the setter from `useQueryState('sort', sortParser)` (green) — only the setter is taken; the current value comes from the prop.
4. the `onChange` calling `setSort(...)` (green) — **but flag here that the real version bundles a `cursor: null` reset, fully built in the next section** so the student doesn't think this is complete. Mark with a comment pointing to the reset section. Deliberate staging.
5. the `<option>` list rendered from `SORT_VALUES` with human labels (orange) — the enum is the single source for the dropdown's options too, so a new sort value automatically appears in the UI.
Keep `maxLines` ≤ 18. Add `CodeTooltips` afterward (optional, if it doesn't bloat) on the parsed `sort` value to show the inferred union `'createdAt' | '-createdAt' | 'total' | '-total' | 'customer' | '-customer'` — the type proves the constraint, echoing lesson 1's tooltip payoff.
`Term` candidates in this section: `orderBy` (define: the SQL/Drizzle clause that sets row order; the sort string is translated into it server-side) if it reads as unexplained jargon.

### Writing one parameter without trampling the others

Now that multiple parameters coexist, teach the coordination rule. The problem: a list view has `status`, `tags`, `createdFrom/To`, `showArchived`, `sort`, plus `q` and `cursor` from later lessons. A naive write that rebuilds the query string can wipe siblings. The hand-rolled fix (clone the current `URLSearchParams`, set one key, leave the rest) is the one lesson 1 showed degrading — restate that it works but is the boilerplate nuqs exists to erase.
The nuqs answer: `useQueryStates(parsers)` returns a **single merge-setter** — `setState({ status: 'paid' })` updates only `status` and leaves every other parameter untouched. Contrast with `useQueryState` (single param) used so far: when a control needs to write *several* parameters atomically (which the reset rule will require), `useQueryStates` is the tool. Introduce it here because the next section needs it.
Teach the `null` vs `undefined` setter semantics precisely, because it's a real footgun and the continuity/outline both flag it: in a nuqs setter object, **`null` clears the parameter** (removes it from the URL, falls back to default), while **`undefined` leaves it untouched** (no change). `setState({ status: null })` removes `status`; `setState({ status: undefined })` is a no-op for `status`. This distinction is load-bearing for both clear-all and the reset rule.
Code: a small `Code` (tsx) block — `const [, setQuery] = useQueryStates({ status: statusParser, sort: sortParser, cursor: cursorParser })` then two illustrative setter calls with comments: `setQuery({ status: 'paid' })` (only status changes) and `setQuery({ status: null })` (status cleared, rest intact). Highlight the merge behavior.
Insert a **Dropdowns** (fenced-code mode) check here — it fits the "fill in the right setter argument" skill exactly:
- A short fenced `ts` block with `___` blanks where the student picks `null` vs `undefined` (and maybe the right key) for two scenarios: "clear the status filter" → `null`; "leave sort alone while changing status" → `undefined` (or omit the key).
- `answers` array maps each blank. `instructions`: "Fill in each setter argument: which value clears a parameter, which leaves it untouched?"
- Goal: make the `null`/`undefined` distinction stick through application, not recognition.

### The reset invariant: changing what's shown clears the page

The most important new concept in the lesson, given its own section and strong emphasis because it recurs in lessons 3 and 4 and is the canonical bug.
State the rule plainly first: **whenever a filter, sort, or search term changes, the cursor (or page) must be cleared in the same write.** Then explain *why* with the concrete failure: a `cursor` encodes a position in the *current* ordered, filtered result set (lesson 4 makes the cursor opaque; here just say "it points at a row's place in this exact ordering"). Change the sort and the old cursor decodes against a different ordering → nonsense pages, rows repeating or skipped. Shrink the filter and the old cursor may point past the new result's end → an empty or wrong page. This is *the* production bug of URL-state list views.
The structural fix (not a vigilance fix): **bake `cursor: null` into the setter for every parameter that changes the result set.** Using `useQueryStates`, the sort control's real `onChange` is `setQuery({ sort: next, cursor: null })` — one atomic write updates the sort and resets the page together. This is why the previous section introduced `useQueryStates` and the `null`-clears semantics; they pay off here. Complete the `<SortControl />` from the sort section by showing this final `onChange`.
Generalize: the same bundle applies to changing a filter (`setQuery({ status: 'paid', cursor: null })`), and lesson 3 will apply it to search (`q`) and lesson 4 to pagination edges. Name it as the **chapter invariant** so lessons 3–4 can reference "the reset invariant from lesson 2" by name. Reuse the continuity-note terminology.
**Diagram** — this is the section that most needs a visual. An HTML+CSS before/after illustration (wrap in `<Figure>`) of the stale-cursor failure. Pedagogical goal: make the abstract "cursor decodes against a different ordering" concrete and visceral.
- Layout: two side-by-side mini result-lists (or stacked on narrow viewports via flex-wrap), styled like compact tables matching lesson 1's mockup aesthetic (muted card, hairline borders, theme tokens).
- Left panel "Sort: newest first, cursor points here": a short list of rows ordered by date, with an arrow/marker on the cursor row (e.g. "after row D").
- Right panel "User flips to: amount, high→low — cursor unchanged": the *same rows reordered by amount*, with the now-meaningless cursor marker landing on a random row, and a couple of rows visibly highlighted as "skipped" / "shown twice" to show the breakage.
- Bottom caption (rich slot): the cursor encoded a position in the date ordering; under the amount ordering it points nowhere meaningful — which is why every result-set change clears the cursor. State the fix sentence in the caption.
- Use saturated mid-tone fills for the "broken" rows (red-ish) so the signal survives both themes; `margin: 0` on every inner element (prose-margin gotcha); escape any `<`/`{` in labels.
Follow the diagram with a **MultipleChoice** (single-correct) check — the reasoning, not the recall:
- Question: a user has `?sort=-createdAt&cursor=abc123` in the URL and clicks the "Amount" sort header. What must the click write to the URL?
- Choices: (correct) `{ sort: '-total', cursor: null }` — change the sort *and* clear the now-invalid cursor in one write; (wrong) `{ sort: '-total' }` — leaves the stale cursor, producing nonsense pages; (wrong) push a new history entry to `/invoices?sort=-total` so the cursor is dropped — that pushes history and triggers a full re-render, use the setter; (wrong) nothing special, nuqs clears the cursor automatically on any change — it does not, the reset is the author's responsibility.
- `McqWhy`: the cursor points at a position in the old ordering; under a new sort it's meaningless. The fix is structural — bundle `cursor: null` into the same setter call, never rely on remembering to clear it later.

### Showing and undoing filters: active chips and clear-all

The payoff section — the affordances that make all the above usable, and a satisfying synthesis.
Teach **active-filter chips**: above the table, render a row of chips reflecting the active filters — "Status: Paid ✕", "Tags: Billing, Urgent ✕", "Created: Jan–Mar ✕". Each chip's ✕ clears that one filter via the setter (`setQuery({ status: null, cursor: null })` — note the reset invariant applies here too: clearing a filter changes the result set). The user can see what's filtered and undo any piece independently.
Key architectural point (reuse lesson 1's discipline): the chip list reads the **parsed server-side state passed as props**, not a second client read via `useQueryStates`. Pure-prop is simpler, renders without waiting on hydration, and keeps the server as the single read-source — exactly lesson 1's "controls render from a server-derived prop, not a second client read." The chips' ✕ buttons are the only client part (they need the setter). Explain this division explicitly; it's a recurring best practice.
Teach **clear-all**: a "Clear filters" button calls one setter resetting every filter parameter to its default plus the cursor: `setQuery({ status: null, tags: [], createdFrom: null, createdTo: null, showArchived: false, q: '', cursor: null })`. nuqs strips all the defaults, returning the user to the canonical empty-URL home view. Senior reach (name it): **never `router.push('/invoices')` to clear** — that pushes a history entry and triggers a full segment re-render; use the setter so it's a `replace` and only the params change. Tie back to lesson 1's `replace`-over-`push` policy.
Code: `CodeVariants` (two tabs) or a single `Code` block — show the clear-all setter call and one chip's onClick. If `CodeVariants`: tab A "clear one (a chip)" = `setQuery({ status: null, cursor: null })`; tab B "clear all" = the full reset object. Prose contrasts: a chip clears one parameter, clear-all resets them together; both go through the setter, both reset the cursor.
Optionally a small static HTML+CSS mockup (in `<Figure>`) of the chip row above the table for visual grounding — low effort, high clarity, matches lesson 1's `ListViewMockup` aesthetic. Show 2–3 chips with ✕ affordances and a "Clear filters" link. Keep it compact. This is optional; prioritize the reset diagram if time-constrained.

### What this lesson built, and what comes next

Lesson-1-style closer. Summarize the takeaways as a compact list:
- The four filter shapes (single enum, multi array, range as two params, boolean with omitted default) — a catalog reachable by reflex, each a variation of the same URL→parser→control template.
- Sort as a `-key` enum string, gated by the composite indexes that exist — a new sort option ships with its migration.
- `useQueryStates`' merge-setter writes one parameter without trampling siblings; `null` clears, `undefined` leaves untouched.
- The reset invariant: every change to what's shown bundles `cursor: null` into the same write — the chapter's recurring rule.
- Chips and clear-all read server-derived props and write through the setter, never `router.push`.
Restate the share-and-refresh litmus from lesson 1 (if a click changes the result but not the URL, the contract is broken) as the acceptance test the student should run against the filter row they just built.
Forward pointers (mirror lesson 1's): the next lesson builds `<SearchInput />` with the typed-vs-committed split and React 19 input rhythm — and applies *this lesson's* reset invariant to the search term; the lesson after builds `<Pagination />` and makes the cursor-by-default call, finally showing what's inside the opaque cursor this lesson kept abstract. Same `searchParams.ts`, same page shape — keep filling the stubs.
Close with one or two `ExternalResource` cards in a `CardGrid`: the nuqs docs section on `parseAsArrayOf` / `useQueryStates` / batch setters, and optionally the nuqs parsers reference. Match lesson 1's external-resource style.

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- The whole lesson-1 architecture: read-on-server/write-on-client, the `searchParams.ts` module, `replace` + `{ scroll: false }`, the share-and-refresh contract, `NuqsAdapter`, `searchParamsCache`, the `value`-as-prop + setter control pattern. Reference by name; one-line reminders only.
- `as const` value arrays with derived types, string-literal-union-over-enum (course conventions) — assume known, use without explaining.
- Composite indexes `(orgId, sortKey, id)` and that the list query is tenant-scoped — restate in one line each as already-taught (Chapter 039 / Units 8–9); do not re-teach index mechanics or tenancy.

**Out of scope — owned by other lessons (name and defer, never teach):**
- The search parameter `q`, the debounce/defer/typed-vs-committed pattern, `useDeferredValue`/`useTransition`/`throttleMs` → Lesson 3. The reset invariant *mentions* `q` as a future application but does not build search.
- The pagination cursor's internal encoding (opaque base64, sort-key + tiebreaker), `hasNext`, offset-vs-cursor, "position not snapshot" → Lesson 4. This lesson treats the cursor as an opaque "position in the current ordering" black box — exactly enough to motivate the reset invariant, no more.
- Drizzle `where`/`orderBy`/`gte`/`lte` query mechanics → Chapter 038. Show parsed values flowing *toward* the query; never write the query.
- Composite-index design and `EXPLAIN` → Chapter 039. Cite the index/sort pairing as a rule; don't teach index creation.
- `showArchived` soft-delete *wired into the base query* → Chapter 061. This lesson teaches the boolean *shape* and names it as the toggle Chapter 061 builds on; it does not wire visibility into the query.
- Multi-tenancy `organizationId` filter that's always applied → Units 8–9. Referenced as already-built ("tenant-scoped"); not taught.
- The Server Action that mutates and revalidates the list → Chapters 043 / 062.
- Saved views / named filter presets → explicitly out of scope for the chapter; do not introduce.
- Accessibility primitives for the controls (full ARIA treatment) → Chapter 027. Keep controls semantic (`<select>`, `<button>`) per code conventions but don't teach accessibility at depth.

**Component / authoring constraints:**
- No nuqs live-coding sandbox: the ReactCoding iframe cannot load nuqs (third-party npm). All interactive checks use Dropdowns, Buckets, MultipleChoice — which match the real skill (choose the shape, remember the invariant). Do not propose a ReactCoding/Sandpack exercise that imports nuqs.
- Diagrams are HTML+CSS in `<Figure>` (reset-invariant before/after; optional chip-row mockup) — follow the prose-margin (`margin: 0` everywhere) and MDX-escaping gotchas. No box-and-arrow engine needed.
- Code components: `Code` for single-shape snippets; `CodeVariants` for the comma-vs-repeated-key A/B and the clear-one-vs-clear-all comparison; `AnnotatedCode` for the one fully-built `<SortControl />`; `CodeTooltips` (optional) for the inferred sort union. Strip imports except the shared-parser import that teaches the single-source-of-truth discipline.

# Lesson title

- Title: When TanStack Query earns its weight
- Sidebar label: When TanStack Query earns it

# Lesson framing

This is the chapter's load-bearing decision lesson. It teaches **zero TanStack Query code** — no `useQuery`, no API surface (lesson 2 owns that), no wiring (lesson 3), no worked screen build (lesson 4). Its single job: install the senior reflex that gates the entire chapter. By the end the student can look at any SaaS feature and answer "does this earn a client-side server-state library, or does a platform default already cover it?" — and justify the answer out loud.

Pedagogical spine — **defaults before conditionals, trigger before tool** (the course's third filter). The student arrives having spent Units 1-14 pushing read state to Server Components, write state to Server Actions, transient UI state to `useState`, and shareable view state to the URL with `nuqs`. Those four already cover the SaaS surface a senior ships day to day. TanStack Query is the *conditional reach past them*. So the lesson must open by naming what already works, and only then name the narrow band where it stops working. If the student leaves thinking "TanStack Query is how you fetch data in React," the lesson failed — that was the 2022 mental model, and the whole chapter exists to replace it.

Mental model the student should end with: **TanStack Query is a second cache for client-owned server-state, scoped to the leaf that needs it.** Two ideas inside that sentence, both load-bearing:
1. *Second cache* — it sits alongside the Server Component / `use cache` cache, not instead of it. Two caches means two invalidation surfaces (`invalidateQueries` vs `updateTag`), two mental models for "where does this live," a real cost ledger. This framing is what stops the student from reaching for it reflexively.
2. *Scoped to the leaf* — the page stays a Server Component; only the interactive leaf (the polling thread, the infinite list) crosses into Client + TanStack. Never "the page is now a client app."

The four named triggers are the spine of the body. The course accepts **four and only four** justifications: (1) polling / frequent refetches, (2) complex client-side caching across views, (3) optimistic mutations with rollback into cached queries, (4) infinite scroll with cache reuse. Each must be taught against the default it beats — the trigger is only legible as "the point where *this specific default* stops pulling its weight." Polling vs `router.refresh()` on an interval; cross-view cache vs the Router Cache; optimistic-into-cache vs `useOptimistic`; infinite scroll vs Server-Component cursor pagination. Teaching the trigger without its foil produces a checklist the student memorizes but can't apply.

Equally important — and where beginners get it wrong — is the **negative space**: what does NOT clear the bar. A filtered list view (that's `nuqs` + Server Components, Chapter 060). A form that submits and revalidates (Server Actions + `useActionState`, Chapter 044). A single optimistic toggle (`useOptimistic`, ch044 L5). Reading the session (`auth()` in a Server Component). The senior move is *enumerate which default the workload would otherwise use; only if every default is wrong does the library earn its weight.* The "what doesn't clear it" content deserves as much weight as "what does" — it's the more common real-world error.

Cognitive-load management: build the funnel incrementally. First establish the four defaults the student already owns (recap, fast). Then introduce ONE trigger fully worked (polling — most intuitive). Then the other three by the same template. Then the cost ledger (why the bar is high). Then the negative cases. Then the integration shape (one paragraph — the page stays a Server Component, prefetch + hydrate, the library only powers the live parts; this is a *preview* that lesson 3 builds, named here so the threshold has a concrete landing). Then SWR comparison (one paragraph). The funnel diagram and a sorting exercise consolidate; close on the in-app pointer (the comment thread) that the rest of the chapter drills into.

Real production stakes to thread: the cost of *over*-reaching is a permanent tax on a codebase — every junior who sees TanStack Query in one screen assumes it's the house pattern and sprinkles it everywhere; six months later there are forty `useQuery`s where Server Components would have been faster and simpler. The senior who sets the threshold is protecting the codebase's future, not just shipping today's screen. Frame the decision as architecture, not preference.

Tone: adult, terse, no bootcamp scaffolding. The student is an experienced dev meeting a *decision*, not a beginner meeting an API. Lead with reasoning everywhere.

# Lesson sections

## What's left after the four defaults

The introduction (no header above it — standard lesson intro prose) and this opening section. Goal: state the senior question and recap the four defaults so the conditional has a baseline.

The senior question, stated plainly: Server Components fetch and stream data. Server Actions mutate and invalidate for read-your-writes. `useState` holds transient UI state. `nuqs` puts shareable view state in the URL. **What's left?** When does a SaaS feature genuinely need a *client-side server-state library*, and what's the threshold the four defaults stop covering?

Recap the four defaults as a compact mapping — the student has met all of these, so this is fast retrieval, not re-teaching. A short two-column **`Buckets`-free** plain mapping works here, but prefer a small `<Figure>` with a simple HTML 4-row table or a labeled list: each default → the state shape it owns → the chapter it was taught. Keep it to four rows. The pedagogical point of the recap: make the student *feel* how much ground the defaults already cover, so the upcoming "what's left" lands as a genuinely narrow band, not a big gap.

Land the framing sentence the whole lesson hangs on: **TanStack Query is conditional, not default.** Name that this lesson defines the threshold; lessons 2-4 assume it landed. Preview the four triggers by name only (one line) — they get full treatment next.

Define the key term the first time it appears: **client-side server-state** — data that lives on the server (rows in your database) but whose *cache and refetch lifecycle* the client owns because the interaction is too live, too cache-heavy, or too optimistic for the server round-trip to drive it. Distinguish from *client state* (UI toggles, form inputs, theme) which is not the server's at all. This distinction is the seed of the "do we even own this on the client?" check later.

`Term` candidates in this section: **server-state** (data whose source of truth is the server/database, as opposed to ephemeral UI state), **client-side server-state library** (a library that caches server-state in the browser and manages its refetch/invalidation lifecycle — TanStack Query, SWR).

## The four triggers that cross the threshold

The body's core. Goal: teach the four (and only four) justifications, each against the default it beats. This is the content the student must be able to *recall and apply*, so structure it for retention: one shared template per trigger — *the workload → the default that almost covers it → why the default breaks → the trigger met.*

Open by stating the rule hard: the course accepts **four justifications, no more.** Anything outside them, the answer is a default. Listing them up front primes the four-slot mental schema.

Teach **polling / frequent refetches first** and fully worked, because it's the most intuitive (everyone understands "check for new messages"). The workload: a comment thread, a notification badge, a job-status panel — anything where the client learns about *server* changes on a tight cadence *without a user action*. The default that almost covers it: Server Components + `router.refresh()` on a button, or even a `setInterval` calling `router.refresh()`. Why it breaks: every refresh re-runs the full segment's data fetching and re-renders the whole route segment — a sledgehammer for "did one new comment arrive." Once the cadence drops below user-initiated, that's the wrong shape. Trigger met. Establish the template visibly here so the next three read as variations.

Then the remaining three by the same template, more compact:

- **Complex client-side caching across views.** Workload: a detail page and a list page reading the same row; a sidebar that mounts/unmounts the same data; a tab strip switching views of one query — navigating between them should not refetch from the network. Default that almost covers it: the Next.js Router Cache (prefetched soft navigations) and `use cache` (server side). Why it breaks: those cover *navigations*, not a deeply interactive client tree that repeatedly mounts/unmounts the same data within one view. An explicit client cache keyed by query is the right tool there. Trigger met (note: this is the *weakest* of the four — flag it as "real but rarely the sole justification").

- **Optimistic mutations with rollback into cached queries.** Workload: an action that must show instantly, roll back on failure, *and* whose optimistic value has to flow into one or more cached queries (the new row must appear in a cached list immediately), or persist across a navigation, or coordinate with other in-flight mutations. Default that almost covers it: `useOptimistic` (Chapter 044 lesson 5) — handles the single-list, immediate, implicit-rollback case beautifully. Why it breaks: `useOptimistic` is scoped to one component's render; it does not write into a separate cache, doesn't survive navigation, doesn't coordinate across mutations. When the rollback *target* is a cached query, you need the cache's own optimistic machinery. Trigger met. (Be precise: the distinction is not "optimism" — `useOptimistic` does optimism fine — it's "optimism *into a separate cache*.")

- **Infinite scroll with cache reuse.** Workload: a long thread, a feed, a chat — scroll down to load more, scroll back up, the already-loaded pages are still there. Default that almost covers it: the Server-Component cursor pagination from Chapter 060 lesson 4 — produces the right opaque-cursor URL, correct `hasNext`. Why it breaks: cursor pagination is a *replace* UX — each "Next" navigates and the previous pages are gone; scrolling back refetches. Infinite scroll is an *accumulate* UX with a different cache contract: pages stay in the client cache for the session. Different UX, different contract. Trigger met.

Diagram for this section — a small **HTML+CSS four-card grid** (`<Figure>` wrapping a 2x2 card layout, or `<CardGrid>`) where each card is one trigger: title, the one-line workload, and the beaten default as a struck-through or "instead of" line. Pedagogical goal: give the four triggers a single glanceable visual the student can photograph in memory. This is a *simple visual aid* (the diagrams doc reminds us a diagram need not be a system graph) — it consolidates the four-slot schema. Keep it under ~400px tall, horizontal/grid.

`Term` candidates: **Router Cache** (Next.js's client-side cache of prefetched route segments for soft navigations), **cursor pagination** (paging by an opaque pointer to the last row rather than an offset — recap, taught ch060), **read-your-writes** (the guarantee that a user immediately sees their own mutation reflected — recap).

## Why the bar is high — the cost of a second cache

Goal: justify *why* only four triggers clear it. This is the section that prevents over-reach, and over-reach is the more common real-world failure, so give it real weight, not a throwaway aside.

Frame as a cost ledger. Bringing TanStack Query in adds, concretely:
- A **second cache** to reason about (the Server Component cache is still there; now there are two).
- A **second invalidation surface** — `queryClient.invalidateQueries` for the client cache vs `updateTag` / `revalidateTag` for the Server Component cache. The two are *separate on purpose* and a mutation that touches data both layers hold must invalidate *both*. Preview the canonical bug: invalidate one, forget the other → list paints fresh, detail stays stale. (Full treatment in lessons 3-4; named here as a cost.)
- A **second mental model** for "where does this query live and when does it refetch" — `staleTime`, `gcTime`, refetch-on-focus — none of which the Server Component world made you think about.
- A **runtime dependency** — well-maintained, but a dependency that ships in the client bundle.
- A **forced Client Component boundary** wherever a `useQuery` lives — every query pulls its subtree out of Server-Component-land.

The senior reading of the ledger: each line *shrinks* the surface you should be willing to apply the library on. The library is *right* for the four triggers and *wrong* for everything else — not because it's bad, but because the cost is only worth paying where a default genuinely fails.

Production-stakes paragraph (the durable-skill payload): the real cost isn't in your screen, it's in the codebase's future. Drop TanStack Query into one screen and the next dev assumes it's the house pattern; six months later there are forty `useQuery`s doing work Server Components would do faster and simpler, and now every reviewer has to reason about two caches on every PR. Setting the threshold *is* the senior contribution here — it's architecture, the thing that's decided before code and keeps the system changeable. This is the lesson's "senior mindset over syntax" beat; make it land.

Use an `Aside` (caution) for the sharpest version of the watch-out: **"We've always used React Query" is not a trigger.** That was 2022; the defaults moved (Server Components, Server Actions, `useOptimistic`, `nuqs` are all post-2022). Restate the actual trigger or push back to a default.

## What does not clear the bar

Goal: drill the negative space — the enumerate-the-default reflex — because recognizing a *non*-trigger is the skill the student will exercise far more often than recognizing a trigger.

Teach the reflex as a procedure: **enumerate which default the workload would otherwise use; only if every default is wrong does TanStack Query earn its weight.** Then run it against four concrete non-cases, each resolving to a named default:
- A list view with filter / sort / search / cursor pagination → **`nuqs` + Server Components** (Chapter 060). The URL is the state; sharing and refresh must work; that's not a client cache job.
- A form that submits and revalidates → **Server Actions + `useActionState`** (Chapter 044). The action owns the mutation contract.
- A single optimistic toggle (a star, a checkbox) → **`useOptimistic`** (ch044 L5). One component, one rollback, no separate cache.
- Reading the current session / user → **`auth()` in a Server Component**. Server state, but read once on the server, not cached on the client.

Also fold in the **"do we even own this on the client?" pre-check** here (it belongs with the negative space, not as its own section): before *any* of the four triggers, ask whether the state is actually the server's. URL state, form-input state, theme preference, "is the dropdown open" — none of those are server-state, so none of them are a TanStack Query question regardless of how live or optimistic they feel. The optimistic-with-rollback trigger especially only earns its weight when the *rollback target is server-state*. This check keeps the library scoped to its actual job and catches the most common category error (using `useQuery` as a generic state manager — that's `useState` / Zustand, ch078).

**Exercise — `Buckets` sort, two columns.** This is the section's consolidation and the lesson's primary understanding-check. Two buckets: **"TanStack Query earns it"** and **"A default already covers it."** ~8-10 chips, each a one-line SaaS workload the student must classify:
- Earns it: "A job-status panel that polls every 5s until the job finishes" (polling); "A chat thread the user scrolls deep into, then back up" (infinite + reuse); "Posting a comment that must appear instantly at the top of a cached, paginated thread" (optimistic into cache); "A live notification badge that updates without a click" (polling).
- A default covers it: "An invoices table with filter, sort, and a shareable URL" (`nuqs`); "An edit-invoice form that submits and shows field errors" (Server Action + `useActionState`); "A single 'mark as favorite' star with instant feedback" (`useOptimistic`); "Showing the signed-in user's name in the header" (`auth()` in a Server Component); optionally "A theme toggle persisted to localStorage" (client state — not server-state at all, so not TanStack regardless).
Grading: chip turns green/red on Check; the `description` on each bucket should name the discriminating question ("Is this live/optimistic-into-cache/infinite — or would a default already handle it?"). Pedagogical goal: force the enumerate-the-default move on realistic prompts, which is exactly the senior reflex the lesson installs. Add a short note steering the student to ask *which* default, not just "is it a default."

## The funnel a senior runs before reaching for the library

Goal: give the student a reusable, *ordered* decision procedure — the order the questions get asked in is the actual lesson, more than any single answer.

Use a **`StateMachineWalker`** (`kind="decision"`, the default) — this component is purpose-built for "trigger before tool" funnels and forces the student to walk one branch at a time rather than seeing the whole tree at once, which is the point: a senior asks these questions *in order*. Do NOT wrap it in `<Figure>` (it provides its own card).

The funnel order (each "no" falls through to the next gate; the first gate that the workload needs flips to a Leaf recommending the matching trigger; falling through *all* gates lands on the Server-Component/default leaf):

1. Root question: **"Is this even server-state?"** — branches: "No, it's UI / URL / form state" → Leaf: *Not a TanStack Query question — `useState` / `nuqs` / theme store.* | "Yes, it's server data" → next gate.
2. **"Does the client need to learn about server changes on a tight cadence without a user action?"** → "Yes" → Leaf: *Polling — TanStack `refetchInterval`.* | "No" → next.
3. **"Does an optimistic update need to flow into a cached query (or survive a navigation)?"** → "Yes" → Leaf: *Optimistic-into-cache — `useMutation` with cache update.* | "No, single-list optimism is enough" → Leaf: *`useOptimistic` — no library needed.* (This branch terminates early on the default, modeling that not every optimism needs the library.)
4. **"Is this infinite-scroll where already-loaded pages must stay cached on scroll-back?"** → "Yes" → Leaf: *Infinite scroll — `useInfiniteQuery` with `maxPages`.* | "No" → next.
5. **"Is this a deeply interactive client tree re-mounting the same data across views?"** → "Yes" → Leaf: *Cross-view client cache — TanStack `useQuery`.* | "No" → Leaf: *Server Components (+ `nuqs` / `router.refresh()`) — TanStack Query doesn't earn its weight here.*

Each `<Leaf verdict>` names the tool; the reason body (one or two sentences) restates *why this gate, this answer*. The fall-through leaf is the most important one — it's the default outcome and the lesson's thesis (most things don't clear the bar). Pedagogical goal: the student internalizes the *sequence* — server-state first, then cadence, then optimism-into-cache, then infinite reuse, then cross-view — so in the wild they ask the gates in order instead of pattern-matching "feels like a fetch."

Caption / surrounding prose: note this funnel is the gate the whole chapter sits behind, and that lessons 2-4 only matter for workloads that reach a TanStack leaf.

## Server Components own the first paint, TanStack owns the live cache

Goal: a single-paragraph preview of the integration shape, so the threshold has a concrete landing and the student isn't left imagining "TanStack means client-only fetching with a spinner on load." This is a *preview*, not a build — lesson 3 wires it. Keep it tight; do not show wiring code.

The non-negotiable shape for this course: even when a feature clears the bar, the page stays a **Server Component** that *prefetches* the same data the client will read, then hands it through a hydration boundary so the **first paint is server-rendered** and the client cache starts populated. No `useQuery` fires a cold request on initial load — the network round-trip happens in the RSC payload. *Subsequent* interactions (polling, optimistic mutations, scroll-fetching the next page) use the client cache. The win, stated as the senior reading: you pay TanStack Query's price *only* for the parts of the surface that need it; the static and initial parts stay Server-Component-fast. This reinforces the "scoped to the leaf" half of the mental model.

Optionally a tiny **HTML+CSS two-band figure** (`<Figure>`): a horizontal strip split into "Initial paint — Server Component (prefetch → hydrate)" and "Live interactions — TanStack client cache (poll / mutate / scroll)." Pedagogical goal: visualize that the two systems own *different phases* of the same screen, not compete. Keep it minimal and short; it's reinforcing one sentence, not carrying the section.

`Term` candidate: **hydration** (the client re-attaching interactivity to server-rendered HTML — recap, met earlier in the React unit; here specifically rehydrating a prefetched cache).

## Why TanStack Query and not SWR

Goal: one short section (the chapter outline asks for one paragraph) answering the obvious "isn't there another library?" so the student knows the choice was made deliberately, not by default.

SWR is the older, smaller alternative from the Vercel team; it works for simple stale-while-revalidate read patterns. The course picks **TanStack Query** as its canonical client-side server-state library because the four triggers need its richer surface: the mutation lifecycle with optimistic patterns, infinite queries with a `maxPages` memory cap, shared mutation state across components, stronger devtools, broader ecosystem reach. SWR doesn't have the mutation/infinite story the chapter's worked screen requires. The honest caveat: if a codebase already runs SWR for these workloads, that's fine — the *mental model* (the threshold, the four triggers, the two-cache reality) transfers unchanged; the course just doesn't teach SWR's API. Keep this factual and brief; do not turn it into a feature war.

`Term` candidate: **stale-while-revalidate** (serve the cached value immediately, refetch in the background, swap in the fresh value — the pattern both libraries are built on).

## The screen this chapter builds toward

Goal: close the lesson by naming the one concrete in-app surface that clears the bar, so the threshold isn't abstract and the rest of the chapter has a target. Brief — naming, not building.

The chapter's worked case: a **per-invoice comment thread** on every invoice detail page (`/invoices/[id]`) — read it, scroll back through it, add to it. Product motivation (one line): invoice disputes, internal notes, customer correspondence — the SaaS standard. Run the four-trigger funnel against it in compressed form to show it genuinely clears the bar: polling (a coworker posts from another session, you see it without refreshing), optimistic-into-cache (your new comment appears instantly at the top of the cached thread, rolls back on a 500), infinite scroll with reuse (hundreds of comments deep, scroll back without refetch), and a weak cross-view case (peeked from a recent-activity sidebar). Three strong triggers met — the strongest case in the course for the library being right.

Forward pointers (one line each): lesson 2 teaches the primitives this screen reaches for; lesson 3 wires them against the App Router without leaking the cache; lesson 4 runs the full funnel against this exact screen and frames the Chapter 077 project that builds it end to end. Note explicitly that *most* of that invoice page (header, customer card, line items, totals) stays Server Components — only the comment thread crosses into TanStack — to re-seal the "scoped to the leaf" mental model one last time.

# Scope

This lesson is **decision-only**. It teaches the threshold and the reflex; it teaches no TanStack Query code, API, or wiring.

Explicitly out of scope (and where it lives):
- The TanStack Query primitives — `useQuery`, `useMutation`, `useInfiniteQuery`, query keys, `staleTime`/`isPending`/`isFetching`, `invalidateQueries`/`setQueryData`, `refetchInterval`. **Lesson 2.** This lesson may *name* `refetchInterval`, `useInfiniteQuery`, `maxPages`, `useOptimistic` etc. as the tool a trigger points to (in funnel leaves and the cost ledger), but never shows their syntax or signatures.
- Provider wiring, the per-request `getQueryClient()` / `cache()` trap, `<HydrationBoundary>`, `dehydrate`/`prefetchQuery`, the senior `staleTime`/`gcTime`/`refetchOnWindowFocus` defaults, the dual fetcher split, devtools setup. **Lesson 3.** This lesson previews the *shape* ("page stays a Server Component, prefetch + hydrate, client cache for live parts") in prose only — no code, no file names, no API.
- The full worked screen end to end (the exact optimistic updater, the route handler, the two-system invalidation in code, the polling cadence wiring). **Lesson 4** (framing) and **Chapter 077** (build).
- Zustand and global client state — **Chapter 078** (named once as the home for "generic client state," to contrast with server-state).
- `useOptimistic` and React 19's optimistic primitive — **Chapter 044 lesson 5** (prerequisite; recap in one line as the default the optimistic trigger beats).
- The Server Component cache (`use cache`, `cacheTag`, `cacheLife`) and the `tags.ts` scheme — **Chapter 032 / Chapter 072** (prerequisite; referenced as "the other cache" and "the other invalidation surface," not re-taught).
- Cursor pagination mechanics (opaque base64 cursors, `hasNext`) — **Chapter 060 lesson 4** (prerequisite; recap in one line as the default the infinite-scroll trigger beats).
- Real-time via WebSockets or Server-Sent Events — **out of scope for the entire course**; if a student wonders "why not push?", a one-line aside is acceptable but no treatment.

Concise prerequisite redefinitions this lesson should carry (one line each, no re-teaching): server-state vs client/UI state; what `useOptimistic` does (single-component optimistic value with implicit rollback); what `router.refresh()` does (re-runs the current route segment's server render); what cursor pagination is (opaque-pointer paging, replace-not-accumulate); the existence of two caches (Server Component cache from Unit 12, distinct from the client cache TanStack would add).

# Code conventions notes

This lesson has no code blocks, so most of `Code conventions.md` does not apply. The relevant section — **"Client server state (TanStack Query)"** (lines 187-209) — is fully consistent with the chapter outline and confirms the load-bearing claims this lesson asserts at a conceptual level: the four triggers (line 189), the conditional "otherwise, don't install it" framing, the two-system invalidation discipline (line 204), and the senior defaults including `refetchOnWindowFocus: false` (line 203). No divergence to flag; this lesson states these as principles and defers all syntax to lessons 2-4.

One naming detail for downstream awareness (not this lesson's concern): conventions place the providers file at `app/_components/providers.tsx` (line 191) while the chapter outline's lesson-3 notes say `src/components/providers.tsx`. This lesson shows no file paths, so it's unaffected; lesson 3 must reconcile.

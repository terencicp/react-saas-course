## Concept 1 — The inspector as the on-page cache reader

**Why it's hard.** Next.js gives user code no hit/miss signal. Students who have never seen a cache without instrumentation default to refreshing and squinting, and they confuse "the page rendered fast" with "the cache served this." Without a stable reading surface, every later verification step degenerates into vibes.

**Ideal teaching artifact.** A short scrollytelling capture of the finished inspector — five frames showing what the student will see by the end of the chapter, scrubbable in place. Frame 1: first visit, two `fetchedAt` strings labeled. Frame 2: five refreshes, both strings unchanged, the log tail empty. Frame 3: post-edit redirect, list and summary strings both advance, three log entries fan out. Frame 4: post-task redirect, summary string unchanged (the stale-while-revalidate beat). Frame 5: next refresh, summary string advances. The inspector is the artifact the rest of the chapter will read; framing the artifact as the diagnostic *before* the student writes any code reframes every later instruction as "make the strip read X." (Concept archetype.)

**Engagement.** A `PredictOutput`-style four-row checklist immediately after the scrub: given each frame's user action, predict whether `listFetchedAt` advances, stays stable, or stays stable-this-render-and-advances-next. Wrong picks reveal the reasoning, not just the answer.

**Components.**
- `DiagramSequence` with five `DiagramStep` panels, each carrying a screenshot of the inspector plus a one-line caption naming the user action.
- `PredictOutput` (or `MultipleChoice` × 4) for the post-scrub prediction round.

**Project link.** This concept *is* the project's verification surface — every later "Done when" clause reads through this strip.

---

## Concept 2 — `tags.ts` as the single source of tag strings

**Why it's hard.** Cache tags look like strings, and strings get inlined. The bug surfaces months later when a read site emits `org:${id}:invoices` and a write site emits `org:${orgId}:invoice` (singular typo) — the cache silently never invalidates. Centralizing the strings looks like over-engineering until you've seen the bug.

**Ideal teaching artifact.** A wrong-by-default `CodeReview` PR diff: a junior dev's hypothetical commit that scatters raw tag strings across four files — the action emits one shape, the read site emits a near-duplicate shape, one shape has the org slug instead of the id. The student leaves inline comments naming each drift; the AI grades against a rubric of "noted the singular/plural drift," "noted the id-vs-slug drift," "proposed the helper." Then the corrected diff lands a single `tags.ts` module — three pure functions, scope-first, lowercase, colon-delimited — and grep proves the strings exist nowhere else. (Pattern archetype.)

**Engagement.** A `Tokens` round on the corrected `tags.ts` source: click every part of `\`org:${orgId}:invoices\`` the student would flag as load-bearing convention (lowercase, scope-first order, the colon delimiter, the `orgId` interpolation, the absence of trailing punctuation). Decoys highlight the function name itself.

**Components.**
- `CodeReview` for the wrong-by-default diff with the four drift-bugs.
- `Tokens` on the corrected helper to lock the convention.

**Project link.** The student writes `tags.ts` first in 15.2.3; every action and cached read in the rest of the project imports from this single module.

---

## Concept 3 — `fetchedAt` as the cache-state proxy

**Why it's hard.** The diagnostic discipline only clicks once the student sees that the timestamp is *inside* the cached function's return — frozen with the cache entry, not computed at read time. Students intuitively expect `new Date()` to be "now," and the realization that *this* `new Date()` is "whenever the entry was last produced" is the actual lesson.

**Ideal teaching artifact.** A side-by-side time-travel pair of two identical-looking React Server Components. The left one returns `{ rows, fetchedAt: new Date().toISOString() }` with `'use cache'` at the top of the body; the right one does the same without `'use cache'`. Both render the timestamp on the page. The student clicks "Refresh" five times on each panel and watches the left timestamp stay frozen while the right advances every click. The mechanism — closure capture into the cache entry — is the whole point. (Mechanics archetype.)

**Engagement.** A `MultipleChoice` follow-up: "You see `listFetchedAt` advance on a refresh you didn't expect. Which of the following are plausible causes?" with four correct (filter changed → new cache key; `cacheLife` expired; mutation fired `updateTag`; background task fired `revalidateTag` last visit) and two distractors (the user's clock drifted; React 19 rebuilt the tree).

**Components.**
- New `CacheReadComparison` (sketched below — see Component proposals) for the side-by-side refresh comparison.
- Alternative if not built: a `TabbedContent` with two annotated source snippets plus a `DiagramSequence` of five identical refreshes on each side.
- `MultipleChoice` for the diagnostic-reading drill.

---

## Concept 4 — The closure rule: arguments in, ambient state out

**Why it's hard.** Server Components routinely call `auth()` inline. Cached functions look like Server Components. The student's muscle memory is to read the session right where they need the `orgId`, which silently breaks the cache by closing over a value the framework can't see in the key.

**Ideal teaching artifact.** A two-tab `CodeVariants` block. Tab one: a cached `listInvoices` that calls `auth()` inside the body to get `orgId`. Tab two: the same function with `orgId` lifted to an explicit argument and the caller reading the session. Each tab carries the same surrounding prose: "what does the cache key contain?" — and the punchline is that tab one's key is identical for every user, which is the leak. Then a short live `ReactCoding` (or `TypeCoding`) exercise: the student edits a broken cached function to satisfy the signature contract (`(args: { orgId: string }) => Promise<...>`) and remove the ambient read. (Pattern archetype.)

**Engagement.** The live edit *is* the engagement — the test fails until ambient reads disappear and the arg is in the signature. Follow with a one-question `MultipleChoice`: "Which of these can appear inside a `'use cache'` function body?" with `cookies()`, `headers()`, `auth()` as wrong and `args.orgId`, `db.query.invoices.findMany(...)`, `cacheTag(orgInvoicesTag(args.orgId))` as right.

**Components.**
- `CodeVariants` for the two-tab wrong-then-right contrast.
- `TypeCoding` or `ScriptCoding` for the signature-fix exercise (type-only is enough — the closure rule is enforceable at the signature).
- `MultipleChoice` for recall.

---

## Concept 5 — Union-of-tags reads

**Why it's hard.** Every read tags itself with what *could* invalidate it. The detail page is invalidated by both the org-level list shift (a bulk import) and the record-level edit (this invoice changed). Students who only tag with the read's primary identity miss whole classes of invalidation; students who tag with everything dilute the signal. The decision needs framing.

**Ideal teaching artifact.** A small static decision diagram: three read sites down the left (list, summary, detail), four write sites across the top (update one, archive one, bulk import, summary task), grid cells filled with the tags each read emits crossed against the tags each write invalidates. The X marks where the invalidation lands. The detail row has two cells lit because it carries both tags. The student traces with the cursor; the senior reading is "tag the read with every tag any affecting write will emit." A `Figure`-wrapped hand-SVG handles this — the matrix is small and fixed. (Decision archetype.)

**Engagement.** A `Matching` drill: left column lists six hypothetical reads ("the current user's profile," "the team-member dropdown for an org," "an invoice detail," "the public landing page's stats"); right column lists tag sets the student must pair. Wrong matches reveal the affecting writes the student missed.

**Components.**
- `Figure` wrapping a hand-authored SVG matrix (single-use, single-chapter — keep it static).
- `Matching` for the recall round.

---

## Concept 6 — Picking `cacheLife` against UX intent

**Why it's hard.** The profile names look like time budgets but they encode a UX promise. `'minutes'` for the list reads as "the list can be a few minutes stale if the invalidation chain breaks"; `'hours'` for the summary reads as "the task owns refreshing this, and the user only sees the summary on the dashboard." The decision is about user expectation, not table size or query cost.

**Ideal teaching artifact.** A `Buckets` exercise framed as the senior-call drill. Top of the screen lists six hypothetical reads from a SaaS product (the invoices list, the per-org summary, the team-member list, a marketing testimonials block, the public pricing page, the current user's notifications). Two buckets: `'minutes'` and `'hours'`. Below the buckets, the user-expectation question is printed: "How fresh must this be on the next user-facing read after a mutation?" The student sorts; each placement reveals the senior reasoning (notifications: nope, that's a different problem — `'use cache: private'` named, deferred; pricing: `'max'` if it has its own bucket later). The artifact ambushes the wrong intuition that this is a performance dial. (Decision archetype.)

**Engagement.** The bucket sort *is* the engagement. Follow with a single `TrueFalse` statement: "Picking a longer `cacheLife` is appropriate when the underlying query is expensive." (False — the trigger is UX freshness, not query cost. The follow-up reveals the actual triggers.)

**Components.**
- `Buckets` for the senior-call sort.
- `TrueFalse` for the misconception ambush.

---

## Concept 7 — After-commit → invalidate → redirect ordering

**Why it's hard.** The sequence reads naturally as "commit and tell the cache and send the user home," but each pair has a distinct failure mode. Invalidate-then-commit risks invalidating a write that rolls back. Redirect-then-invalidate produces one stale render at the destination. Students who don't see the failure modes will reorder by aesthetic preference.

**Ideal teaching artifact.** A `Sequence` (ordering drill) with the four steps shuffled: `await db.transaction(...)`, `await updateTag(orgInvoicesTag(...))`, `await updateTag(invoiceTag(...))`, `redirect('/invoices')`. The student drags into the correct order. On submit, each wrong adjacency reveals the failure mode of *that specific swap*: "transaction last → you may have invalidated a write that rolled back"; "redirect before invalidation → the destination renders the stale list once." This is a guided puzzle where the teaching surface is in the feedback on the wrong arrangements. (Pattern archetype.)

**Engagement.** The drag-into-order *is* the engagement. Follow with a tiny `CodeReview` round on a Server Action where the order is inverted; the student leaves one comment naming the swap and the consequence.

**Components.**
- `Sequence` for the ordering puzzle with per-adjacency error feedback (existing component handles ordering; the per-adjacency feedback can be approximated with a single combined "why" on submit if the existing API doesn't support adjacency-level reveals — see open questions).
- `CodeReview` for the recall round on the inverted action.

---

## Concept 8 — The fan-out: every affected read invalidated

**Why it's hard.** One mutation, three (sometimes four) tags. Students stop after one `updateTag` because the action "worked" — but the summary still shows the old totals on the next page load, and the bug is invisible until someone checks the dashboard. The discipline is to enumerate every read the write touches before writing the action.

**Ideal teaching artifact.** A "wrong-by-default" sandbox. The student lands on a working `updateInvoice` action that already calls `updateTag(orgInvoicesTag(...))` after commit — the list refreshes correctly. The inspector is live next to the editor; the student clicks edit and sees the list timestamp advance. Then the test panel runs a second check: does `summaryFetchedAt` advance? It does not. The student must add the missing two calls to make both checks pass. The artifact teaches by withholding — the action looks correct until the verification surface reveals the missing tags. (Pattern archetype.)

**Engagement.** The sandbox's test panel *is* the engagement. Follow with a single `Buckets` round: ten hypothetical mutations on the left (e.g., "user changes their display name," "admin removes a member from an org," "background job ingests 200 invoices"), and the student drops each into the bucket of tags it must invalidate. Misses reveal the affected reads.

**Components.**
- New `CacheInvalidationLab` (sketched below) — a constrained editor + inspector pair where the student adds invalidation calls and the verification surface runs in-page. Forward-links to 14 (Trigger.dev project work), 17.2 (security baseline), 19.3 (integration tests).
- Alternative if not built: a `ReactCoding`-style edit on the action source with a small in-iframe inspector mock, or — simpler — `CodeVariants` showing one-tag, two-tag, three-tag versions side by side with a single explainer paragraph per tab.
- `Buckets` for the fan-out recall.

**Project link.** This is the work 15.2.4 asks for in the actual codebase; the sandbox is the contained rehearsal before the student edits the four real actions.

---

## Concept 9 — `updateTag` vs. `revalidateTag`: who's watching?

**Why it's hard.** The two functions look interchangeable. The student picks `revalidateTag` because the name says "revalidate" and that's what they want. The framework restricts `updateTag` to Server Actions for a reason: read-your-writes requires the in-band redirect path, and the user is sitting on the next render. `revalidateTag` is stale-while-revalidate by design — fine when nobody specific is waiting.

**Ideal teaching artifact.** Two anthropomorphic actors walking through the same edit, drawn as a code-cartoon sequence diagram. Actor 1: "the user who just clicked save" — needs to land on a page that reflects their edit. Actor 2: "the daily summary task" — runs at 3am; nobody is watching. Each actor reaches the same decision point ("invalidate the org summary tag") and picks a different function. The diagram shows the consequence side by side: actor 1's redirect lands on fresh data; actor 2's invalidation lands on the *next* visitor's read. The "who's watching" question is the lens. (Concept archetype.)

A second short beat: the same diagram with actor 1 misusing `revalidateTag` — the redirect lands on the stale render. The framework's restriction (throws if `updateTag` is called outside an action) is the API enforcing the architectural rule the diagram just made visible.

**Engagement.** A `MultipleChoice` round of five scenarios; for each, pick `updateTag` or `revalidateTag` and name the user-expectation question's answer. ("Stripe webhook fires after a successful payment — which call?" → `revalidateTag`; the user is no longer on the checkout page.) Wrong picks reveal the watcher.

**Components.**
- New `WatcherSequenceDiagram` (sketched below) — two-track sequence diagram with side-by-side actors; the two-actor framing recurs across Unit 14 (webhooks vs. action paths) and Unit 17 (auth context vs. background job).
- Alternative if not built: a `Figure` containing a Mermaid `sequenceDiagram` with two participants; the side-by-side comparison is approximated with two separate Mermaid blocks in a `TabbedContent`.
- `MultipleChoice` for recall.

---

## Concept 10 — The misuse demo: why the restriction exists

**Why it's hard.** Restrictions feel arbitrary until you've seen the failure they prevent. The student who reads "use `updateTag` from actions only" without experiencing the stale-redirect-render will eventually flip to `revalidateTag` in an action because it's "more flexible" — and ship a bug that's invisible to the developer (who refreshes) but visible to the user (who doesn't).

**Ideal teaching artifact.** A toggle-driven before/after in the inspector itself, embedded as a short capture in the lesson. The toggle flips between `updateTag` (correct) and `revalidateTag` (the misuse). Same user action: edit one invoice. Same redirect. The student watches `listFetchedAt` advance with the toggle off and stay stale with the toggle on, while the edited amount on the redirected page is correct in one case and stale in the other. The artifact carries the failure mode visually; the toggle makes the bug deterministic. (Concept archetype.)

**Engagement.** A short `MultipleChoice`: "After flipping the toggle on and editing once, which of these will be true on the next manual refresh?" with the correct answer (the list catches up — stale-while-revalidate finishes its revalidate on the second read) versus distractors that conflate stale-while-revalidate with permanent staleness.

**Components.**
- `DiagramSequence` with four screenshots: toggle off + edit + redirect (fresh); toggle on + edit + redirect (stale).
- `MultipleChoice` for the SWR-mechanics follow-up.

---

## Concept 11 — Cross-org isolation at the cache layer

**Why it's hard.** Tenancy is a data-layer discipline by the time students reach Unit 15. The leap to "the cache key is org-scoped too, and a write in org A doesn't touch org B's entries" lands quietly but needs to be said — otherwise a student deploys and worries that one org's edit could pollute another's view.

**Ideal teaching artifact.** A short two-panel `Figure` with the two cache entries side by side: `org:A:invoices → [...rows for A...]` and `org:B:invoices → [...rows for B...]`. An action in org A fires `updateTag(orgInvoicesTag('A'))`; the diagram shows the A entry crossed out, the B entry untouched. The senior reading: tenancy at the cache layer mirrors tenancy at the data layer because the same `orgId` participates in both. (Concept archetype.)

**Engagement.** A single `TrueFalse` round of three statements: "An admin in org A editing an invoice can stale org B's list cache" (false); "Switching the active org in session does not invalidate the previous org's cache" (true); "The same cache entry serves both orgs as long as the filters match" (false). The follow-up names the org-scoped tag as the structural enforcement.

**Components.**
- `Figure` with a hand-authored SVG (two cache-entry rectangles, one with a strikethrough on the org-A invalidation).
- `TrueFalse` for the recall round.

---

## Component proposals

- **`CacheReadComparison`** — side-by-side two-panel iframe widget. Each panel renders the same component (a list with a timestamp); the left panel wraps the data fetch in `'use cache'` and the right doesn't. A shared "Refresh" button bumps both. The widget surfaces the inner timestamp so the reader sees one freeze and one advance.
  - Uses in this chapter: Concept 3.
  - Forward-links: 15.3 (rate-limiter "what does the limiter see" comparison), 19.3 (test harness mock vs. real-cache comparison). Plausibly recurs whenever a teaching beat needs "with the directive vs. without."
  - Leanest v1: two iframes with hard-coded fixture data plus a single shared refresh button. No real `'use cache'` runtime needed — fake the freeze by memoizing the timestamp in-component on one side. The teaching point is "the timestamp on the left is captured at function-run-time" and the fake is honest about that.

- **`CacheInvalidationLab`** — a single-screen editor + inspector pair. Left: a constrained editor showing a Server Action body where the student adds `updateTag` calls. Right: a mock inspector mirroring the real one (list `fetchedAt`, summary `fetchedAt`, invalidation log tail). The editor wires through a small in-page test runner that fires the action, observes the timestamps, and reports which tags advanced. Pass criteria: all three affected reads refreshed.
  - Uses in this chapter: Concept 8 (rehearsal before the real 15.2.4 edits).
  - Forward-links: 14.x (action-side webhook fan-out lab), 15.3 (rate-limiter outcome lab), 19.3 (assertion-driven testing of cache invalidation). The "editor + verification surface" shape compounds.
  - Leanest v1: drop the editor entirely. A constrained `Buckets`-style picker — the student selects which `updateTag` calls to fire from a fixed list of seven options; the mock inspector runs and shows which timestamps advanced. Cuts the editor surface; keeps the teaching point that the fan-out is *which set of tags*, not *what code to write*.

- **`WatcherSequenceDiagram`** — a two-track sequence diagram component. Two columns ("user actor," "background actor"); each column renders a vertical lifeline with labeled steps and arrows. The two actors face the same decision point (a shared horizontal band) and branch to different framework calls. Inputs: an array of step objects per column, plus optional shared decision bands.
  - Uses in this chapter: Concept 9.
  - Forward-links: 14.x (sync webhook vs. async retry-queue), 17.2 (auth'd request path vs. cron path), 19.3 (test under user load vs. test under background load). The "two actors making the same decision differently" framing is reusable wherever the difference is the watcher, not the operation.
  - Leanest v1: a static SVG inside `Figure` with the two columns hand-drawn for this lesson only. If the chapter is the only consumer when 15.2 ships, that's the right v1; promote to a real component only when 14.x lands the second use.

## Build priority

`CacheInvalidationLab` carries the most teaching load — Concept 8 is the chapter's heaviest beat (15.2.4 is the chapter's heaviest lesson by stated student time) and the forward-links into Unit 14 webhook fan-out and Unit 19 invalidation tests are real. Build the v1 first (the `Buckets`-shaped picker with a mock inspector); only escalate to the full editor surface if the v1 reads as too thin in playtesting.

`WatcherSequenceDiagram` is second. The two-actor framing compounds into Units 14 and 17 where the same "who's watching" question drives different decisions. Hold to the `Figure`+SVG v1 for this chapter and only build the real component when the second use lands.

`CacheReadComparison` is third — useful here but its forward-links are speculative. Defer until a clear second use surfaces.

## Open pedagogical questions

- Does `Sequence` support per-adjacency feedback on submission, or only a single combined "why"? Concept 7's teaching value depends on the student seeing the specific failure mode of *each* swap, not just "this is the right order." If the existing component only supports one feedback block, the lesson should compensate by structuring the post-submit prose around each swap rather than asking the component to do the work.
- Concept 6's bucket set includes one "trick" item (current user's notifications → `'use cache: private'`, deferred). The scope cuts in 15.2.1 explicitly defer private caches. The trick teaches the cut, but it could read as confusing — flag for the lesson author whether to include it or strip to two clean buckets.

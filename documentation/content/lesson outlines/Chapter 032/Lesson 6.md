# Lesson outline — Chapter 032, Lesson 6

## Lesson title

- Title: Invalidating after a mutation
- Sidebar label: Invalidating after a mutation

## Lesson framing

This lesson closes the cache lifecycle. Chapters/lessons before this taught the student how to *store* a value (`'use cache'`, L3), *time it out* (`cacheLife`, L4), *name it* (`cacheTag` + `tags.ts`, L4), and *dedupe per-request* (`cache()`, L5). What's missing is the **push** side: when the data behind a cached entry changes, how does the student knock the stale copy out so the next render is correct? L4 deliberately left this as a stand-in — `cacheTag` wired inert handles and `invalidate(...)` was an un-explained placeholder. This lesson makes invalidation real and imports the canonical `src/lib/tags.ts` helper L4 planted.

The lesson is a **decision, not an API tour**. Four tools exist (`updateTag`, `revalidateTag`, `revalidatePath`, `router.refresh`) and listing them is trivial; the senior skill is picking the right one. The whole lesson hangs on one question: **does the user expect to see their own change the instant the mutation finishes?** That question is the hinge that splits `updateTag` (read-your-writes, blocking-fresh) from `revalidateTag` (stale-while-revalidate, eventual). Everything else layers off that split. Teach the question first, the tools as answers to it.

Lead with the pain. The motivating bug is concrete and one every SaaS dev hits: user edits an invoice, the action redirects to the list, the list is cached, so the user lands on their *old* invoice and assumes the save failed. That "did it even work?" moment is the stake. Read-your-writes is the fix, and `updateTag` is the tool. Frame the whole lesson around making that bug impossible.

Keep the cognitive load low by building one canonical Server Action shape and reusing it. The student already knows (from the five-seam shape named in Code conventions, and previewed here only as scaffolding) that an action goes `parse → authorize → mutate → revalidate → return`. This lesson owns exactly **one seam: revalidate**. Everything around it (Zod parse, auth, the DB write, `redirect`) is shown as greyed scaffolding with `// Chapter 043` markers and must NOT be fleshed out — Server Actions proper are Chapter 043, forms are Chapter 044. The student should leave able to drop the correct invalidation call into that slot and justify the choice.

Mental model to install: **`cacheLife` is the clock (a timeout safety net); the invalidation surface is the push (the upstream telling the cache "this changed, now").** L4 set up this timeout-vs-push hinge; this lesson delivers the push half. Production = both: `cacheLife('max')` + precise tags + an invalidation call at every mutation site.

Three corrections to current Next.js 16 (16.2.x) API are load-bearing and diverge from the chapter outline's pre-release description — see Scope and each section. Downstream agents must follow the corrected model.

No live Next.js runtime is available in the lesson iframe (same constraint as L3/L4/L5), so all exercises are **guided** (StateMachineWalker, MultipleChoice, Dropdowns, CodeReview, Buckets) — no sandboxes.

## Lesson sections

### Introduction (no header)

Open on the bug, not the API. Walk the timeline in prose: user clicks "Save", the Server Action writes the row, `redirect`s to `/invoices`, the list page is a cached `'use cache'` read — so it re-serves the pre-edit snapshot. The user sees stale data and re-clicks Save. Name the failure: **a cached read does not know the database changed underneath it.** The fix is to invalidate the cached entry as part of the mutation. State the lesson goal: pick the right invalidation tool, call it in the right place, and make stale-after-write impossible. Connect back: tags from L4 are the handles; this lesson is the API that pulls them. One sentence preview of the four tools and the question that picks between them.

Keep warm and brief, ~4 sentences plus the timeline. No section header (per pedagogical structure — intro is unheaded).

**Visual — the stale-after-write timeline.** A `DiagramSequence` (4–5 steps) showing the bug, then the fix. This is the keystone motivator; build it first.
- Step 1: User submits the edit form → Server Action runs.
- Step 2: DB row updated (show invoice #42 status flip draft→sent).
- Step 3: `redirect('/invoices')` → list page renders from the **cached** entry (highlight the entry as a stale blue box, label "served from cache, pre-edit").
- Step 4 (the bug): user sees the old row, red callout "looks like the save failed."
- Step 5 (the fix): same flow but with `updateTag(invoiceTags.list(orgId))` before the redirect → cache entry struck, list re-renders fresh, user sees their change. Green callout "read-your-writes."
Pedagogical goal: make the abstract "invalidation" concept visceral — the student *sees* the stale box and the moment it gets struck. Color convention: cached/stale = blue (chapter convention from L2–L4), the strike/fresh = green. Wrap in DiagramSequence (self-carding, do not wrap in Figure). Caption each step.

### The question that picks the tool: read-your-writes or eventual

The conceptual spine. Before any API, install the decision. There is one question: **does the user expect to see their own change immediately after the action completes?**
- **Yes — read-your-writes.** Form submissions in the same session. The user did the thing and is looking right at the result. Anything less than instant freshness reads as a bug. → demands synchronous, blocking-fresh invalidation.
- **No — eventual is fine.** The change came from somewhere the user isn't watching: a webhook (Stripe updates a subscription), a scheduled job, an admin editing another tenant's data, a background sync. A few seconds of staleness is invisible and acceptable. → tolerates stale-while-revalidate.

Explain *why this is the right question*: it maps directly onto the two `*Tag` APIs, which differ on exactly this axis — timing and whether stale content is served in the meantime. Frame as a senior reframe: beginners ask "which function invalidates the cache?" (all of them do); seniors ask "what does the user expect to see, and when?" The tool falls out of the answer.

Introduce the two `Term`-glossed semantics here so the later sections can use the shorthand:
- **read-your-writes** — after you write, your very next read reflects the write. No stale window for the actor.
- **stale-while-revalidate (SWR)** — recap from L4: serve the old value now, refresh in the background, next reader gets fresh. Zero user-facing wait, brief staleness.

No code yet — this section is pure model. Close by previewing: the two `*Tag` tools answer this question; `revalidatePath` and `router.refresh` are narrower tools for two specific situations covered after.

### updateTag — read-your-writes from a Server Action

The tool for the "yes, immediately" branch. New in Next.js 16.

**Signature and semantics (precise — corrects the pre-release outline).** `updateTag(tag: string): void`, imported from `next/cache`. It takes **only the tag string — no value argument.** Use `AnnotatedCode` or `CodeTooltips` to nail this; the chapter outline's pre-release description ("called with a tag and a new value, replaced synchronously with that value") is **wrong** and must not be taught. Correct semantics, per the shipped docs: `updateTag` **immediately expires** the cached entries for that tag; **the next request waits (blocks) to fetch fresh data** rather than serving stale. That blocking-fresh-on-next-read is precisely what delivers read-your-writes: the redirect's target render is the next request, and it gets fresh data. (Author note in MDX: do NOT add a second `value` argument — it does not exist in the API.)

**Server-Action-only.** `updateTag` throws if called from a Route Handler, Client Component, or anywhere outside a `'use server'` function. State why: read-your-writes is a same-request-session concept; a webhook has no "next render the user is about to see," so the API is fenced to the one context where the semantics make sense. Show the throw as a brief `CodeVariants` rejected case (calling it in `route.ts`) → the fix is `revalidateTag`.

**The canonical placement — the revalidate seam.** Show the one Server Action shape this lesson reuses. Use `AnnotatedCode` (one block, stepped) on an `editInvoice` action:
```
'use server';
// parse + authorize + DB write → Chapter 043 (greyed scaffolding, do NOT flesh out)
export async function editInvoice(/* ... */) {
  // ... validated input, authorized, row written above ...
  updateTag(invoiceTags.list(orgId));      // the list any dashboard renders
  updateTag(invoiceTags.record(orgId, id)); // the detail page for this invoice
  redirect(`/invoices/${id}`);
}
```
Steps: (1) the `'use server'` + scaffolding context, greyed, marked Ch 043; (2) highlight the two `updateTag` calls — *this* is the seam the lesson owns; (3) the tags come from `tags.ts` (L4), never inline strings — point at `invoiceTags.list`/`invoiceTags.record`; (4) `redirect` fires after invalidation, before return — invalidate-then-redirect ordering matters: the redirect target render is the blocking-fresh read. Color the two `updateTag` lines green (the fix). Emphasize: invalidation lives **after the DB write, before the return/redirect, never inside a transaction** (Code conventions §Forms).

**Coarse + fine — fire both tags.** When the user edits one invoice, two cached surfaces are now wrong: the detail page (`invoiceTags.record(orgId, id)`) and any list rendering the collection (`invoiceTags.list(orgId)`). Both are cheap. The senior pattern: attach both tags at the cache site (L4) and invalidate both at the mutation site. Granularity is free at the invalidation layer — the cost is what you cache and tag, not what you invalidate. Reinforces the L4 two-level `entity` / `entity:id` scheme paying off here.

`Term` glosses: **read-your-writes** (reuse), **Server Action** (a `'use server'` function the client can invoke — full coverage Ch 043, gloss only).

### revalidateTag — eventual freshness for webhooks and background jobs

The tool for the "no, eventual is fine" branch.

**Signature and semantics (precise — corrects the pre-release outline).** `revalidateTag(tag: string, profile: string | { expire?: number }): void` from `next/cache`. The **second argument is required**; `'max'` is the senior default and gives stale-while-revalidate. Critical correction vs the chapter outline and Code conventions §Caching note: the **single-argument form `revalidateTag(tag)` is deprecated** and is a TypeScript error / suppressed-only legacy that expires immediately (effectively `updateTag` behavior). Always pass a profile. Show `revalidateTag(tag, 'max')` as the canonical form. Note the precise `'max'` behavior from the docs: it marks the tag **stale**, and fresh data is fetched only when a page using that tag is **next visited** — it does **not** trigger a fan-out of revalidations at call time. This is the property that makes it safe to call from a webhook handling thousands of entities.

**Where it's allowed.** Server Actions **and** Route Handlers (and other server code) — unlike `updateTag`. This is the whole reason it exists alongside `updateTag`: webhooks and cron jobs live in route handlers, which `updateTag` forbids.

**The canonical reach — the asymmetric webhook pattern.** The user is *not in the loop*: a Stripe webhook updates a subscription; the user was redirected to a Stripe-hosted page or emailed. There's no "next render the user is staring at," so blocking-fresh buys nothing — `revalidateTag(subscriptionTags..., 'max')` is right. Next time the user opens billing, they see fresh state; the stale read in between is invisible. Show a tiny route-handler skeleton with the call in the right slot, scaffolding (signature verify, event claim) greyed and marked **Chapter 063** (webhooks proper). Pull the timing pattern only; do not teach webhook ingestion.

**The `{ expire: 0 }` escape hatch — named, not dwelt on.** For the rare webhook that genuinely needs immediate expiration (an external system requires it), `revalidateTag(tag, { expire: 0 })` blocks the next read for fresh. One sentence; the docs explicitly steer most cases to `updateTag` in actions instead.

`Term` glosses: **stale-while-revalidate** (reuse from L4), **webhook** (a server-to-server HTTP callback a third party fires when something changes on their side — full coverage Ch 063, gloss only).

### Choosing between the two: the decision walk

The keystone exercise/diagram. A `StateMachineWalker` (`kind="decision"`) that forces the student through the senior's question order. This is where the lesson's value concentrates — the model lives in the *order* of questions, not in any single leaf.

Topology (root → branches → leaves):
- Root question: **"Does the user expect to see their own change immediately after this action?"**
  - Branch "Yes — they submitted a form and are looking at the result" → next question.
  - Branch "No — the change is from a webhook / cron / out-of-band" → Leaf: **`revalidateTag(tag, 'max')`** (eventual, SWR, works in route handlers).
- Second question (Yes branch): **"Are you in a Server Action?"** (reinforces the context fence)
  - Branch "Yes" → Leaf: **`updateTag(tag)`** (read-your-writes, blocking-fresh next read).
  - Branch "No — I'm in a route handler" → Leaf: **`revalidateTag(tag, { expire: 0 })`** with a note that this is the rare immediate-expire-from-handler case, and that you should prefer moving the mutation into a Server Action.
- Optional third branch off root: **"Is the cache keyed by URL, not by a tag?"** → Leaf: **`revalidatePath(path)`** (forward-reference to the next section).

Each `<Leaf>` verdict = the function call; body = one-line justification + the timing it buys. Pedagogical goal: the student internalizes that the *question* drives the *tool*, and that `updateTag`/`revalidateTag` are not interchangeable. Do not wrap StateMachineWalker in Figure (self-carding).

Follow with a compact `Figure` (plain HTML+CSS table or a `TabbedContent`) summarizing the contrast — a small at-a-glance card:

| | `updateTag(tag)` | `revalidateTag(tag, 'max')` |
| --- | --- | --- |
| Timing | next read blocks for fresh | serve stale, refresh in background |
| User-facing wait | one render | none |
| Context | Server Action only | Server Action + Route Handler |
| Use when | user awaits their own write | webhook / job / out-of-band change |

Keep raw second-counts out (consistent with L4). This table is reference, the walker is the teaching.

### revalidatePath — when the URL is the unit, not the entity

The narrower tool, taught briefly and with its boundary clear.

**Signature.** `revalidatePath(path: string, type?: 'page' | 'layout'): void` from `next/cache`. A literal path (`/invoices/42`) needs no `type`; a route pattern with a dynamic segment (`/invoices/[id]`) **requires** `type: 'page'` (or `'layout'`). Show both forms in a small `Code` block.

**When it's the right reach — tags name entities, paths name URLs.** This is the senior distinction (L4 previewed it). Tag the *data*, invalidate by tag everywhere it appears — one `invoiceTags.list(orgId)` refreshes the dashboard, the search page, and the admin view without enumerating URLs. `revalidatePath` is for the genuine **URL-as-resource** cases where there's no entity to tag: a generated sitemap, an OG image route, a static export page, a route handler whose output *is* the cached unit. Name these; don't build them.

**Why not reach for it by default.** It's coarser and route-coupled: it only refreshes entries rendered by that exact path, and it currently has a documented over-invalidation quirk (in Server Functions it also refreshes previously-visited paths on next navigation — temporary, but a reason to prefer tags). Senior default: **tags first, `revalidatePath` only for path-as-resource.** Also the migration note: pre-16 codebases leaned on path invalidation; the modern reach is tag-the-data-once. One `CodeVariants` (path-based vs tag-based) showing the same goal — invalidate the invoice list — done both ways, with the tag version labeled the senior default and the path version labeled "only when the URL is the unit."

`Term` gloss: **path-as-resource** (the cached thing *is* the URL's output — a file, an image, a feed — with no underlying entity to tag).

### router.refresh — the client-side re-pull (and what it does not do)

The fourth tool, framed by its single most-misunderstood property.

**What it is.** `router.refresh()` from `useRouter()` (`next/navigation`), called in a Client Component. It re-requests the current route's Server Components and merges the new RSC payload into the page **without a full reload** — client state (`useState`), focus, and scroll survive. The reach: a Client-Component interaction that should re-pull server-rendered content (a manual "Refresh" button, a polling indicator).

**What it does NOT do — the load-bearing watch-out.** `router.refresh()` **clears the client router cache and re-renders Server Components, but it does not invalidate the `'use cache'` server store.** If the data behind the route is cached with `'use cache'`, a bare `router.refresh()` re-runs the render and gets the **same cached value** — the user sees no change and assumes it's broken. This is the canonical mistake. Make it vivid with a `CodeVariants` (broken vs fixed):
- Broken: button `onClick={() => router.refresh()}` over a `'use cache'`-backed list → no-op, stale persists.
- Fixed: the button calls a Server Action that does `revalidateTag(tag, 'max')` (server-side invalidation), then `router.refresh()` re-pulls so the route picks up the now-fresh entry.
The pairing is the lesson: **invalidate on the server, then refresh on the client.** `router.refresh` is a re-render trigger, not a cache buster.

**Also a no-op on fully-dynamic routes with nothing cached** — there's nothing stale to clear; it just re-fetches. Mention briefly. Mention `router.refresh()` is debounced (rapid double-calls run once) as a one-liner.

**Sibling, named only:** Next.js 16 added a `refresh()` from `next/cache` callable from inside a Server Action to refresh the client router post-action (the server-side twin of `router.refresh`). One sentence — the student should recognize it; full use is beyond this lesson.

`Term` gloss: **RSC payload** (the serialized Server-Component render the client merges — recap from Ch 030, gloss only).

### The complete post-mutation shape

Synthesis section. Pull the canonical Server Action together one more time, now whole, so the student sees the invalidation slot in context. Reuse the five-seam vocabulary as a labeled scaffold (`parse → authorize → mutate → revalidate → return`) — Code conventions §Forms — with **only the `revalidate` seam written by this lesson** and the rest greyed/marked Ch 043. `AnnotatedCode`, stepping the seams, spotlighting revalidate. End on the rule of thumb: **every mutation that touches a cached entity ends with an invalidation call at the revalidate seam; pick the call with the read-your-writes question; tags come from `tags.ts`.**

Then a `CodeReview` exercise (PR-style, the student leaves inline comments graded against a kernel rubric) on a planted-bug action. Plants:
- Uses a bare inline tag string `'invoices'` instead of `invoiceTags.list(orgId)` (drift risk — kernel: "tags must come from tags.ts, not inline strings").
- Calls `revalidateTag('invoices')` with **no profile** (deprecated single-arg — kernel: "revalidateTag requires a cacheLife profile; use 'max'").
- Uses `revalidateTag` where the user submitted the form and awaits the result (wrong tool — kernel: "read-your-writes case wants updateTag, not revalidateTag").
- Puts the invalidation call **inside** the `db.transaction` block (kernel: "invalidate after the write, outside the transaction").
Pedagogical goal: the student diagnoses the exact failure classes the lesson taught, in realistic code.

### Practice (distributed, not a trailing section)

Place exercises in-section per pedagogy (never bundled at the end). Inventory:
- **MultipleChoice** after "The question that picks the tool" — give a scenario (e.g. "admin bulk-imports 5,000 products via a cron job"), ask which tool. Tests the read-your-writes vs eventual judgment.
- **StateMachineWalker** is the "Choosing between the two" section's centerpiece (above).
- **Dropdowns** (inline-prose or fenced `___`) in the `updateTag` section — fill in the correct call + correct `tags.ts` helper in a Server Action body. Tests both the API and the tags discipline.
- **Buckets** classification — sort a set of mutation scenarios (form edit / Stripe webhook / "Refresh" button click / sitemap regeneration / cron sync) into `updateTag` / `revalidateTag` / `router.refresh + revalidateTag` / `revalidatePath`. Two-column or four-bucket. Tests the whole decision surface at once.
- **CodeReview** in "The complete post-mutation shape" (above).

### External resources

`ExternalResource` cards (fact-check URLs at build): Next.js docs for `updateTag`, `revalidateTag`, `revalidatePath`, and `useRouter`/`refresh`. These are the four primary surfaces; the student will return to them.
- https://nextjs.org/docs/app/api-reference/functions/updateTag
- https://nextjs.org/docs/app/api-reference/functions/revalidateTag
- https://nextjs.org/docs/app/api-reference/functions/revalidatePath
- https://nextjs.org/docs/app/api-reference/functions/use-router

## Scope

### Prerequisites (recap concisely, do not re-teach)

- `'use cache'` directive and the cross-request store (L3) — recap in one clause: cached entries persist across requests until invalidated or timed out.
- `cacheTag` + the `src/lib/tags.ts` four-scope helper (`invoiceTags.list`, `invoiceTags.record`, `orgTags.all`, `userTags.all`) (L4) — **import and use; do not redefine.** State once that tags are named string handles attached at the cache site; this lesson is the API that targets them. The `tags.ts` artifact is assumed to exist (L4 planted it as a hard debt).
- `cacheLife` and the timeout-vs-push hinge (L4) — recap one sentence: `cacheLife` is the clock; this lesson is the push.
- `revalidateTag`'s required second-arg profile — L4 named it as L6's; deliver it here.
- Stale-while-revalidate semantics (L4) — gloss, don't re-derive.
- React `cache()` (L5) — not relevant here; do not mention beyond a possible one-line "this is about cross-request caches, not per-request memoization" if disambiguation helps.
- Server/client boundary, `'use server'` / `'use client'` (Ch 030) — assumed.

### Out of scope (defer, name owner)

- **Server Actions in full** — Chapter 043. This lesson owns only the **revalidate seam** of the `parse → authorize → mutate → revalidate → return` shape. The parse/authorize/mutate/return seams appear as greyed scaffolding with `// Chapter 043` markers and must NOT be completed. Do not teach `useActionState`, `Result` types, Zod parsing, the `authedAction` wrapper, or `db.transaction` mechanics here.
- **Form wiring** (`<form action={...}>`, `useFormStatus`, `<SubmitButton>`) — Chapter 044.
- **Optimistic UI** (`useOptimistic`) — Chapter 044 (lesson 6 of ch 044 per outline). Do not preview optimistic reconciliation.
- **Webhook ingestion** (signature verification, `processed_events` claim, idempotency) — Chapter 063. Pull only the **timing pattern** (eventual freshness via `revalidateTag(tag, 'max')`); show the handler body greyed and marked Ch 063.
- **TanStack Query client-cache invalidation** and the "two-system invalidation discipline" (`queryClient.invalidateQueries`) — Code conventions names it but it belongs to the later client-data unit; out of scope here. This lesson is server-cache invalidation only.
- **`cacheTag` / `cacheLife` authoring** — L4 owns it; this lesson consumes tags, does not create them.
- **Path-based static generation** (`generateStaticParams`) — lesson 8 of chapter 034. `revalidatePath` is taught as an invalidation tool only, not as an SSG mechanism.
- **Async request APIs** (`params`, `searchParams`, `cookies()`, `headers()`, `connection()`) and **legacy segment config** — L7 (the chapter's 7-lesson numbering, per Continuity notes).

### Corrections to bake in (diverge from the pre-release chapter outline)

These three are verified against Next.js 16.2.x docs (March 2026) and must override the chapter outline's pre-release wording. Add author-note comments in the MDX so downstream agents don't "fix" them back:
1. **`updateTag(tag)` takes no value argument.** Outline says "called with a tag string and a new value … replaced synchronously with that value." Wrong. Signature is `updateTag(tag: string): void`. It expires the tag; the next read blocks for fresh. Read-your-writes comes from blocking-fresh-on-next-render, not from passing a value.
2. **`revalidateTag` requires the profile second argument.** `revalidateTag(tag, 'max')` for SWR. Single-arg form is deprecated (TS error / legacy immediate-expire). `'max'` marks stale and refreshes on next visit — no call-time fan-out.
3. **`router.refresh()` does not invalidate the `'use cache'` store.** It clears the client router cache and re-renders Server Components, but a cached read returns the same cached value. Must pair with a server-side `revalidateTag`/`updateTag` to actually get fresh data.

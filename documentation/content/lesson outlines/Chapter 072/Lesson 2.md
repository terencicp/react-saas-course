# Picking the right invalidation call

- Title: Picking the right invalidation call
- Sidebar label: Picking the invalidation call

## Lesson framing

This is the second of two teaching lessons in Chapter 072. Lesson 1 landed the route-class framework and the `lib/tags.ts` helper (canonical shape: `invoiceTags.list(orgId)`, `invoiceTags.record(orgId, id)`, `orgTags.all(orgId)`, `userTags.all(userId)`). This lesson answers the next question: a mutation just landed — which of the four invalidation calls fires? The student already has every tag string they need; the only open decision is *which call* and *from where*.

**Senior-mindset framing (the whole point of the lesson).** This is a decisions lesson, not a syntax lesson. The four calls are individually one-liners; the value is the *order of questions* a senior asks to land the right one, and the reasoning that makes the answer obvious instead of memorized. Every code sample exists to illustrate a decision, never to teach an API surface the student can read in the docs.

**The mental model the student should end with.** Two axes collapse to one question almost every time:
- Axis 1 (primary): **does the user who triggered this mutation expect to see their own change on the very next view?** Read-your-writes vs. eventual.
- Axis 2 (secondary): **can the affected surface be named by a tag, or only by a path?** Tag-precise vs. path-coarse.

The four-corner map:
- `updateTag(tag)` — read-your-writes, tag. Server-Action-only.
- `revalidateTag(tag, profile)` — eventual, tag. Actions + route handlers + background jobs.
- `revalidatePath(path)` — eventual, path. The rare escape hatch when no tag captures the surface.
- `router.refresh()` — read-your-writes, no tag (coarse, re-renders the current route). Client-only.

**The durable insight to hammer.** *The call you can reach for is decided by where you are*, and *which one you should reach for is decided by who is watching*. "Where you are" (Server Action vs. route handler vs. client vs. background job) is not a constraint to fight — it's a signal that already narrows the choice. `updateTag` throwing outside a Server Action is the API telling you read-your-writes isn't physically possible there, because the in-band redirect that makes it work only exists inside an action.

**Where beginners go wrong (the lesson must pre-empt these).**
1. Reaching for `router.refresh()` to "refresh the cache" — it re-runs the route render but does **not** invalidate cached entries with valid TTLs; their tags must be invalidated. This is the single most common confusion and deserves explicit, visual correction.
2. Using `revalidateTag` from a Server Action where the user is staring at the redirect — produces a one-render flash of stale data the user perceives. Use `updateTag`.
3. Calling `updateTag` from a webhook/route handler — runtime throw; the bug surfaces in webhook tests. Switch to `revalidateTag`.
4. Wrong ordering: redirect-then-invalidate, or invalidate-inside-transaction. The sequence is commit → invalidate → redirect, always.
5. Forgetting that one mutation usually touches several cached reads — must fire each affected tag (the fan-out).

**Pedagogical spine.** Lead with the at-a-glance four-call table and the two-axis model, make the decision tree the on-page centerpiece as an interactive `StateMachineWalker` (the chapter outline calls the tree "the lesson's center of gravity"), then trace five worked SaaS cases through it. The worked cases are where the abstract tree becomes muscle memory; each one is a short scenario + the exact calls + *why those calls*. Close with the ordering rule and the fan-out discipline, both restated from patterns the student met earlier (after-commit dispatcher rule, Ch070; transaction rule, Ch043). Finish with a decision drill that forces the student to run the tree on novel cases.

**Cognitive-load management.** Introduce the two axes one at a time (axis 1 carries ~80% of decisions; present it as "the only question you usually need," then add axis 2 as the tiebreaker). Don't front-load all five worked cases — interleave the walker after the first two so the student has a tool to think with before the harder cases (webhook, background job, the multi-recipient membership case).

**A precision point surfaced by fact-check (must be reflected in the prose).** `revalidateTag(tag, 'max')` marks the entry stale but does **not** eagerly refetch — it only refreshes on the *next visit* to a page using that tag. This sharpens the "eventual" framing: with `'max'`, the very next viewer eats one render of stale data, then it's fresh. This is correct and desirable when nobody is waiting. Do not describe `revalidateTag` as "refreshes in the background immediately"; it's "marks stale, refreshes on next read."

## Lesson sections

### Introduction (no header)

Open with the concrete senior moment, connecting to what the student just built: in Lesson 1 they tagged every cached read; in Unit 6 they shipped Server Actions; in Ch063 a webhook; in Ch066 a background job. A mutation lands from one of those surfaces — the row is edited, Stripe fires a plan change, a nightly job rebuilds a summary. Now what invalidates the cache, and how does the team decide consistently as it grows? State the goal: by the end, the student runs a two-axis decision on any mutation site and reaches for the right call without guessing. Keep it to ~4-5 sentences, warm and terse. No "what is caching" — the student has the mechanics from Ch032.

### The four calls at a glance

Purpose: give the student the full vocabulary up front so the decision tree later has names to resolve to. This is reference, kept tight — the *reasoning* comes after.

Present the four calls as a compact comparison. Use a `CardGrid` of four `Card`s (one per call) OR a single `Code`-adjacent table; prefer the CardGrid for scannability, each card titled with the call name and a one-line "use when." Content per call:
- `updateTag(tag)` — Server-Action-only. Immediately expires the entry; the next read blocks for fresh data. For read-your-writes (the user expects their change now). Takes a tag only — no profile argument.
- `revalidateTag(tag, profile)` — actions, route handlers, background jobs (anywhere server-side; **not** Client Components or `proxy.ts`). Marks the entry stale; the next visit to a page using that tag serves stale once, then refreshes. `profile` is a `cacheLife` preset — `'max'` is the senior default. Single-argument form is deprecated (TypeScript error in Next.js 16).
- `revalidatePath(path)` — invalidates by URL path/route pattern. Coarser than tags. The escape hatch when the affected surface has no clean tag.
- `router.refresh()` — client-side. Re-fetches the current route's server render from the browser. Does **not** invalidate cached entries directly. For fresh server renders after a non-action client interaction.

Critical correction to embed right here (it's the lesson's most common misconception): add an `Aside` (caution) clarifying that `router.refresh()` re-renders the route but leaves cached reads cached — only tag invalidation expires them. Plant the flag early; the worked cases reinforce it.

`Term` candidates in this section: **stale-while-revalidate** (define: serve the cached value once more while the next read recomputes), **read-your-writes** (the user sees their own mutation reflected on the immediate next view).

### Two axes, then one question

Purpose: the conceptual core. Teach the model that makes the decision tree feel inevitable rather than arbitrary.

Build it in stages to keep load low:
1. Introduce **axis 1 — read-your-writes vs. eventual** as the primary axis. Frame it as a single human question: *"Is a specific user sitting on the redirect, expecting to see this exact change?"* Yes → read-your-writes (`updateTag` / `router.refresh`). No → eventual (`revalidateTag` / `revalidatePath`). Give the intuition pairs: editing your own profile, posting a comment, changing your plan = watching. A webhook flipping an invoice status, a nightly summary rebuild, an admin in another org touching shared data = nobody specific waiting.
2. Introduce **axis 2 — tag vs. path** as the tiebreaker. Tags are precise (one entity's reads); paths are coarse (a whole route/subtree). In a disciplined codebase with `lib/tags.ts`, the answer is almost always "tag"; path is the rare fallback.
3. Collapse to the four-corner map. Present as a 2×2 table or a small `Figure` with an HTML/CSS 2×2 grid (rows = read-your-writes / eventual; columns = tag / path), each cell naming its call. The visual makes the orthogonality click. The pedagogical goal: the student sees the four calls are not a flat list to memorize but the product of two binary decisions.

State the headline rule explicitly: **axis 1 decides most calls; reach for axis 2 only to break the tag-vs-path tie.** Reinforce that "where am I?" (action / handler / client / job) often pre-answers axis 1 for you — a webhook is never read-your-writes for a specific watcher, so it's `revalidateTag` before you even finish the question.

`Term` candidate: **in-band redirect** (the action mutates, invalidates, then `redirect()`s in the same request, so the redirect's render sees fresh data — the mechanism `updateTag` depends on).

### Why updateTag is Server-Action-only

Purpose: turn the restriction from a gotcha into a principle. This is a high-leverage "why" that makes the whole tree memorable.

Explain the mechanism: read-your-writes requires the framework to sequence mutate → invalidate → fresh render in one request. A Server Action provides exactly that path — it can `redirect()` and the redirect's render reads the freshly-expired tag. A route handler, background job, or client callback has no such in-band redirect the framework controls, so `updateTag` can't guarantee the guarantee — it throws. Frame as the chapter outline does: *the API tells you where you are.* When `updateTag` throws, the lesson it's teaching is "read-your-writes isn't available here — you want eventual, use `revalidateTag`."

Small code illustration with `CodeVariants` (two tabs): tab 1 "Server Action — works" showing `updateTag` after the write, before `redirect`; tab 2 "Route handler — throws" showing the same call rejected at runtime with the fix (`revalidateTag(tag, 'max')`) inline. This is the canonical mistake-then-fix shape `CodeVariants` is built for. Keep both snippets to ~8 lines; elide DB/auth with comments. Source the snippet shapes from Code conventions: action follows `parse → authorize → mutate → revalidate → return`; the route handler is the webhook shape.

### Worked case: list view after an edit

Purpose: the first and simplest end-to-end trace — read-your-writes, multiple tags, same user. Establishes the pattern the harder cases vary from.

Scenario: a user edits an invoice's amount on the detail page; the Server Action updates the row and `redirect`s to the list. The cached list read carries `invoiceTags.list(orgId)`; the cached detail read carries `invoiceTags.record(orgId, id)`. After the DB write, the action calls `await updateTag(invoiceTags.list(orgId))` and `await updateTag(invoiceTags.record(orgId, id))`, then `redirect`s. Read-your-writes works because the editor is the viewer.

Teach the *fan-out* here for the first time: one mutation, two affected cached reads, two `updateTag` calls — the list (so the new amount shows) and the record (so a back-button to the detail is fresh too). The `lib/tags.ts` helper makes listing the affected tags mechanical.

Use `AnnotatedCode` on the full action body (the single best use of it in the lesson — direct attention sequentially through the five seams). Steps:
1. Highlight the `'use server'` + signature — this is an action, so `updateTag` is on the table.
2. Highlight the transaction / DB write — `color="blue"`.
3. Highlight the two `updateTag` lines — `color="green"` — "after commit, before redirect; one per affected cached read."
4. Highlight `redirect(...)` — the in-band render that sees fresh data.
Keep the action faithful to the conventions (`authedAction` wrapper context exists; you may show a slightly unwrapped body for clarity but note it). `maxLines` ~14-16.

### Worked case: an admin changes another member's role

Purpose: the multi-recipient pattern — the trigger is a user, but the *audience* of the change is a different user. Sharpens axis 1 ("who is watching?" ≠ "who triggered it?").

Scenario: an admin demotes a member. The Server Action runs in the admin's session. Two distinct cached reads are affected, each scoped to a different audience:
- `orgTags.all(orgId)` — the org's membership/settings read (Lesson 1 classified `/settings/members` as partial, `orgTags.all`, `'hours'`). The admin may be looking at the member list, so this is plausibly read-your-writes for the admin.
- `userTags.all(memberUserId)` — the demoted member's own "orgs I'm in" / role-derived cached read. The demoted member is **not** watching the admin's redirect — but they don't need to be: `updateTag` expires the entry, and the *next time the member loads a page*, the cached read is gone and the new role is in effect.

The senior takeaway: still `updateTag` for both (we're in an action, and the admin reads-their-writes on the list), but the second tag protects a *different* user's future read. This is the "one action, multiple tags, each scoping its own audience" pattern. Note that the demoted member's *session/authorization* resolves separately (cookie-cache window, taught in Ch057) — the cache tag handles their cached data reads, not their session. Brief one-line pointer, don't re-teach.

Code: a `Code` block (not AnnotatedCode — the pattern is now familiar) showing the two `updateTag` calls with comments naming each audience. ~6 lines.

### The decision tree

Purpose: the on-page centerpiece. Everything before this built the vocabulary and intuition; this is the runnable artifact the student takes to every mutation site. Per the chapter outline, "the diagram is the lesson's center of gravity; the worked cases trace paths through it."

Build it as an interactive `StateMachineWalker` (`kind="decision"`). The walker forces the student through the *order* a senior asks the questions, one commit at a time — exactly its intended use. Node design:

- Root `Question` "Where does the mutation run?" → branches:
  - "In a Server Action" → `Question` "Does the triggering user expect to see the change on the next view?"
    - "Yes — they're on the redirect" → `Question` "Can a tag name the affected reads?"
      - "Yes (almost always)" → `Leaf` verdict **`updateTag(tag)`** — read-your-writes, fired once per affected tag, after commit, before redirect.
      - "No clean tag" → `Leaf` verdict **`router.refresh()` (rare)** — coarse route re-render; note this is a smell, the work usually wants a tag.
    - "No — nobody specific is waiting" → `Leaf` verdict **`revalidateTag(tag, 'max')`** — eventual is the right UX even inside an action.
  - "In a webhook or route handler" → `Leaf` verdict **`revalidateTag(tag, 'max')`** — `updateTag` would throw here; stale-while-revalidate is correct, no specific user waits.
  - "In a background job (Trigger.dev / cron)" → `Leaf` verdict **`revalidateTag(tag, 'max')`** — same reasoning; jobs import `revalidateTag` from `next/cache` and call it directly.
  - "On the client, after a non-action interaction" → `Leaf` verdict **`router.refresh()`** — re-renders the current fully-dynamic route; does not touch cached-with-TTL entries.

Add a parallel side-question for axis 2 only where it matters (the "no clean tag" branch and a `revalidatePath` leaf): include a `Leaf` **`revalidatePath(path)`** reachable from an eventual branch tagged "the surface is a route pattern, not an entity (rare — means the tag scheme has a gap)."

Each `Leaf` reason body: one or two sentences naming *why* this corner, plus the one-line code shape. Keep leaves terse — the walker's value is the path, not the prose.

Reinforce in surrounding prose: the worked cases above and below are paths through this tree; invite the student to re-walk the first two cases mentally and confirm they land on `updateTag`.

### Worked case: a webhook updates an invoice's status

Purpose: the canonical eventual/route-handler shape. The first case where `updateTag` is *not* available, and that's correct.

Scenario: Stripe sends `invoice.payment_succeeded` (Ch063 — webhook is the single writer). The route handler verifies, claims the event, updates the invoice row, then calls `await revalidateTag(invoiceTags.record(orgId, id), 'max')` and `await revalidateTag(invoiceTags.list(orgId), 'max')`. Walk the reasoning explicitly against the tree: we're in a route handler → eventual → `revalidateTag`. No specific user is staring at the screen; the next viewer of the invoice or list sees the updated status after at most one render of stale data. `updateTag` here would throw (the API enforcing the boundary).

Embed the precision point: with `'max'`, the tag is marked stale and the refresh happens on the *next visit*, not eagerly — so "eventual" literally means "the next reader pays one stale render." This is the right trade when nobody is waiting.

Briefly name the immediate-expiry escape hatch surfaced by the docs — `revalidateTag(tag, { expire: 0 })` — for the rare webhook that must hard-expire from a route handler, but flag that the senior default is `'max'` and that read-your-writes immediacy belongs in a Server Action with `updateTag`. One sentence; don't over-weight a niche.

Code: `Code` block showing the invalidation tail of the webhook handler (post-claim, post-write), the two `revalidateTag` calls. Connect to the Ch063 webhook checklist — invalidation is a step on it.

`Term` candidate: **single writer** (the rule from Ch063 that exactly one code path owns writes to an entity — here it justifies why the webhook, not an action, invalidates).

### Worked case: a nightly job rebuilds the org summary

Purpose: the background-job shape, and the rule "background work uses `revalidateTag`." Short — it's a variation on the webhook case with a different trigger.

Scenario: a Trigger.dev nightly job (Ch066) recomputes per-org analytics summaries. The job updates the summary row and calls `await revalidateTag(orgTags.all(orgId), 'max')` (or a dedicated summary tag if the project defines one — keep it consistent with Lesson 1's helper). No user waits; the next dashboard view serves yesterday's summary stale, then fresh. The job imports `revalidateTag` from `next/cache` and calls it directly — the framework supports cross-process invalidation via the deployment's cache backend (name this, don't go deep — backend semantics are out of scope).

Keep this to a paragraph + a 3-line `Code` snippet. Reinforce the tree path: background job → eventual → `revalidateTag`.

### Worked case: the post-purchase plan flip and the polling exception

Purpose: the one case where `router.refresh()` earns its weight in a client component, and the only legitimate client-side entry in the tree. Also the case that ties the chapter to the billing chapters.

Scenario: the user clicks "Upgrade to Pro," goes through Stripe Checkout, and lands on the success page. The actual plan flip happens in the **webhook** (Ch064 — single writer), which calls `await revalidateTag(orgTags.all(orgId), 'max')` (or the plan-entitlement tag). But the redirect and the webhook **race**: by the time the user sees the success page, the webhook may not have landed. The success page is a client component that polls with `router.refresh()` (the read-and-poll pattern from Ch063 L3) until the entitlement flips. Here `router.refresh()` is correct because: (a) we're on the client after a navigation, not in an action; (b) we need to re-run the *server render* to pick up the freshly-invalidated cached read once the webhook lands.

Critical clarification to embed (reinforces the early `Aside`): `router.refresh()` does not itself invalidate the cache — the *webhook* did that via `revalidateTag`. `router.refresh()` re-runs the route so the now-stale-then-fresh read is re-fetched on the client's behalf. The two work together: webhook invalidates, client re-renders to observe it. This dispels the "`router.refresh` refreshes the cache" myth in the exact context where it's most tempting.

The senior smell to name: if you reach for `router.refresh()` outside this redirect-race pattern, the work probably belongs in a Server Action where `updateTag` is cleaner.

Use a `DiagramSequence` to make the race + poll legible (a sequence diagram in static Mermaid would also work, but the temporal scrub fits the "watch the race resolve" goal better). Steps (~4):
1. User submits Checkout → redirected to success page; webhook not yet arrived; cached entitlement read still says "Free."
2. Success page mounts, renders "Activating…", fires first `router.refresh()`; webhook still in flight; server render still "Free."
3. Webhook lands: handler writes the entitlement row and calls `revalidateTag(orgTags.all(orgId), 'max')` → the cached read is now stale.
4. Next `router.refresh()` re-runs the server render; the stale read recomputes; page shows "Pro." Poll stops.
Each step a short caption naming who acts and what the cache state is. Pedagogical goal: show that `router.refresh` and `revalidateTag` are complementary, not alternatives, and that the poll bridges an inherent race — not a bug.

### Invalidate after commit, then redirect

Purpose: the ordering rule, restated for caches. The student met the principle as the dispatcher after-commit rule (Ch070 L2) and the transaction no-external-calls rule (Ch043); this applies it to invalidation.

State the canonical sequence inside a Server Action (from Code conventions, `parse → authorize → mutate → revalidate → return`): the transaction **commits**, *then* the `updateTag`/`revalidateTag` calls fire, *then* `redirect`. Two failure modes to make concrete:
1. **Invalidate inside the transaction** → if the transaction rolls back, the cache is now expired-against-state-that-never-committed; the next read repopulates with the old value and the invalidation was wasted (or worse, briefly serves an inconsistent view). Invalidation belongs after commit.
2. **Redirect before invalidate** (or relying on the redirect alone to "refresh") → the destination's cached read still has a valid tag and serves the old value. *The redirect is not an invalidation signal.* Invalidate, then redirect.

This is a frequent code-review catch — frame it that way. Use a small `Sequence` exercise (ordering drill) OR a `CodeVariants` before/after; prefer the `Sequence` exercise here since the lesson's point is literally the order. Steps to order: `mutate inside transaction` → `transaction commits` → `updateTag(list)` → `updateTag(record)` → `redirect`. Decoy the student into placing redirect early. Optional fixed code block above the steps showing the labeled action body.

### Listing the cached reads a mutation touches

Purpose: operationalize the fan-out as a repeatable discipline so the student doesn't ship the silent-stale bug (mutation fires one tag, forgets another).

The discipline: before writing the invalidation tail, list every cached read whose underlying data this mutation changes, then fire the narrowest tag for each. The `lib/tags.ts` helper makes the list short and the strings mechanical. Worked mini-example: editing an invoice line item changes (a) the invoice record read and (b) the org's invoice list read → two tags. A missed tag = a cached read that silently stays stale until its TTL expires; because `'max'`-profiled reads effectively never expire on their own, "silently stale" can mean "stale forever until someone edits again."

Reinforce the read-generous / write-precise split from Lesson 1: reads attach the *union* of applicable tags; the write fires the *narrowest set* that covers the change. Connect to the `tags.ts` single-source-of-truth: because both sides import the same helper, the write-site string can't typo away from the read-site string.

Keep this section tight (it's discipline, not new API). A `MultipleChoice` or `Buckets` check fits well: given a mutation ("admin removes a member"), select/sort which tags must fire from a list including decoys (e.g., an unrelated `invoiceTags.list`).

### Run the tree on novel cases

Purpose: end-of-lesson synthesis — force active recall of the whole decision model on cases not yet seen, so the student leaves with a runnable skill, not just a read one.

A short decision drill. Best fit: a small set of `MultipleChoice` / `TrueFalse` items, OR (preferred, higher engagement) a second compact `StateMachineWalker`-style scenario list where each scenario asks "which call, and why?" Since the main tree is already a walker, use a `MultipleChoice` battery here (3-4 questions) to vary the modality and verify recall:
1. "A user edits their own display name in a settings form Server Action and stays on the same page." → `updateTag` (read-your-writes). Distractors: `revalidateTag` (one-render flash), `router.refresh` (doesn't invalidate).
2. "Your identity provider pushes a profile change via webhook." → `revalidateTag(tag, 'max')` from the route handler. Distractor: `updateTag` (throws here).
3. "A third-party map SDK's `onSave` callback (not a Server Action) mutated client state and you need the fully-dynamic route re-rendered." → `router.refresh()`. Distractor: `updateTag` (not in an action; also doesn't apply to a dynamic route with no cached read).
4. "A sitewide footer config changes and the affected surface is every route under `/(marketing)` with no per-entity tag." → `revalidatePath` (the rare path case). Distractor: `revalidateTag` (no tag names a whole route tree).
Each answer's explanation re-walks the two axes so the student internalizes the *reasoning*, not the answer key.

Note in the section that the same mutation can resolve to different calls depending on the trigger (the profile-edit-by-user-vs-by-webhook contrast) — this is the framing that lets the student handle anything the course didn't explicitly cover.

### Observability: counting invalidations (brief)

Purpose: the senior habit of making the invisible visible; the chapter outline includes it but defers the dashboard to Unit 19. Keep to a short paragraph — do not build it out.

Each invalidation call earns a structured log line: `{ event: 'invalidate', call: 'updateTag' | 'revalidateTag', tag, source }`. The signal: a flatline on a tag whose entity is actively being edited means the wiring is wrong (the write fires a different tag than the read carries, or fires none); a spike means a hot mutation path. Frame as the first diagnostic for any "my change isn't showing" bug — check whether the invalidation log line for the expected tag fired. Defer the dashboard surface to Unit 19 with a one-line forward pointer. Optionally an `Aside` (tip).

### External resources (optional)

`ExternalResource` cards to the Next.js docs for `updateTag` and `revalidateTag` (the two are the load-bearing references and both carry the read-your-writes vs. stale-while-revalidate framing). Keep to two cards.

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- `'use cache'`, `cacheTag`, `cacheLife` presets and the cached-function closure rules — owned by Ch032 L3/L4. Assume fluent.
- The `lib/tags.ts` helper and its four shapes (`invoiceTags.list`, `invoiceTags.record`, `orgTags.all`, `userTags.all`), the route-class table, read-generous/write-precise, the `orgId`-as-argument rule — owned by Ch072 L1 (the immediately prior lesson). Use the helpers freely; do not re-derive the scheme.
- The five-seam Server Action shape, `authedAction` wrapper, transaction rule — owned by Unit 6 / Ch057. Reference the shape; don't teach it.
- `tenantDb(orgId)` — Ch056 L2. Name it where org-scoped tags mirror it; don't re-explain.

**Explicitly out of scope (do not cover):**
- Designing the tag scheme itself — Ch072 L1.
- `'use cache'` mechanics, `cacheLife` three-number profiles, PPR shells/holes — Ch032.
- Webhook signature verification, idempotency/claim-once, out-of-order guards — Ch063 (name the webhook as a caller of `revalidateTag`; the invalidation is one step on its checklist).
- The Trigger.dev task/queue/schedule API and job invocation — Ch066 (name jobs as callers of `revalidateTag`).
- Stripe object graph, Checkout, the entitlement projection — Ch064 (use the plan-flip only as the polling scenario).
- **The two-system (TanStack Query) invalidation discipline** — when a list is *also* read on the client via TanStack Query, the action must additionally call `queryClient.invalidateQueries(...)`. This lesson is about the **Next.js server cache only**. Name the existence of the client-cache twin in one sentence with a forward pointer (the TanStack chapter owns it), so the student isn't surprised later, but do not teach `invalidateQueries` here.
- Implementation on the live Unit 10 invoices list, the `fetchedAt` verification surface — Ch073 project.
- Vercel/CDN edge-cache layers, cross-region cache backend semantics — out of scope; name the deployment cache backend once (background-job case) without depth.
- `'use cache: private'` and per-user cache variants — named once in Lesson 1 as a deferred power tool; do not reintroduce.
- Custom `{ stale, revalidate, expire }` `cacheLife` profiles beyond the one-line mention of `{ expire: 0 }` as the webhook hard-expire escape hatch.

## Notes for downstream agents

- **Code-shape fidelity:** all Server Action examples follow `parse → authorize → mutate → revalidate → return`; invalidation calls go **after** the DB write/commit and **before** `return`/`redirect`, never inside a transaction (Code conventions §Forms and Server Actions). `revalidateTag` **must** use the two-argument form `revalidateTag(tag, 'max')` — the single-argument form is a TypeScript error in Next.js 16. `updateTag` takes **only** a tag (no profile arg). Both import from `next/cache`; `router.refresh` is `useRouter().refresh()` from `next/navigation` in a client component.
- **Tag helpers:** use the Lesson 1 canonical shapes exactly — `invoiceTags.list(orgId)`, `invoiceTags.record(orgId, id)`, `orgTags.all(orgId)`, `userTags.all(userId)`. Never inline tag string literals in any example.
- **Deliberate simplification:** worked-case action bodies may show a lightly-unwrapped body (explicit auth/DB lines instead of the full `authedAction` wrapper) to keep attention on the invalidation tail — note this is intentional so the reviewer doesn't "fix" it; the wrapper is taught in Unit 10 and assumed.
- **The `router.refresh` ≠ cache-invalidation point** must appear at least twice: once in the early `Aside` (four-calls section) and once in the polling worked case. It's the lesson's top misconception.
- **`revalidateTag('…','max')` is mark-stale-on-next-visit, not eager refetch** — phrase the webhook/background cases accordingly ("the next reader pays one stale render"), per the Next.js 16.2 docs (2026-03-03).
- Verified against Next.js 16.2.9 docs (updateTag, revalidateTag), dated 2026-03-03, and the Apr-2026 "updateTag vs revalidateTag" community write-up; API surface and deprecations confirmed current as of the writing date.

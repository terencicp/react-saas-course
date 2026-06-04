# Lesson 4 — Lifetimes and tags

- Title (h1): Lifetimes and tags
- Sidebar label: Lifetimes and tags

## Lesson framing

This lesson is the **second half of the anatomy of a cached function**. Lesson 3 taught `'use cache'` (the placements, the cache key, the serialization contract) and deliberately left two calls as a one-line teaser comment inside a fetcher: `// cacheLife + cacheTag → next lesson`. This lesson pays off that teaser. Open by reminding the student that a bare `'use cache'` function caches *forever* under a sensible default — and ask the two questions a senior asks next: **how long should this live, and how does the upstream tell it the data changed?** Those two questions are `cacheLife` and `cacheTag`.

Two distinct topics, taught in order, both calls made *inside* the cached function body after the directive:

1. **`cacheLife`** — the freshness window. The single most important reframe in the lesson: **a lifetime is a UX decision, not a performance decision.** The three numbers (`stale`, `revalidate`, `expire`) each map to something the *user* experiences. Beginners reach for "long cache = fast" and get burned by stale data; the senior reaches for "how stale can this data be before a user is misled?" Teach the presets first (the 95% path), custom profiles second (the escape hatch).
2. **`cacheTag`** — the named handle. This lesson only teaches how to **attach and name** tags well; the API that *pulls* the handle to invalidate (`updateTag` / `revalidateTag`) is Lesson 6. Make that split explicit and repeated, or the student will expect invalidation to "just happen" here. The payoff is deferred but the naming discipline is set now.

The keystone mental model to leave the student with: **a cached entry has two ways to become fresh again — a timeout (`cacheLife`, the pull policy: "refresh on a clock") and a push (`cacheTag` + an invalidation call, "refresh because the source said so").** Production SaaS uses both together: `cacheLife('max')` (the longest preset — revalidate ~30 days, so the clock rarely fires) plus precise tags (refresh exactly when the data changes). State this combined shape early as the destination, then build up to it.

**Accuracy note for downstream agents (verified against Next.js 16.2.7 docs):** `'max'` is the *longest* preset, NOT infinite — its profile is `stale: 5min, revalidate: 30 days, expire: 1 year`. Only the `default` profile has `expire: never`. Do not write "`'max'` never expires/refreshes." The correct framing: `'max'` means "this rarely changes on a clock, so I'll drive freshness with tags instead." `cacheLife` profiles (verified exact values): `default` (5min/15min/never), `seconds` (30s/1s/1min), `minutes` (5min/1min/1hr), `hours` (5min/1hr/1day), `days` (5min/1day/1week), `weeks` (5min/1week/30days), `max` (5min/30days/1yr). Quote use-cases, not raw numbers, in the lesson.

Target student: a junior who now understands `'use cache'` mechanically but has no instinct for *freshness as a product property*. The lesson's job is to install that instinct, give them the syntax to express it, and set the tag-naming convention the rest of the chapter (and the chapter-035 project) depends on. Code is central but small — this lesson is about the two extra lines you add to an already-cached function, and the reasoning behind the numbers and strings you put in them.

Cognitive-load staging: introduce `stale`/`revalidate`/`expire` one number at a time against a single timeline, not as a triple dropped at once. Presets before custom profiles. Colon-string tags (`invoice:42`) as the mental model before the production `tags.ts` helper. Keep `cacheLife` and `cacheTag` as separate sections joined by the "timeout vs push" bridge — do not interleave them.

Domain continuity: stay in the established CMS/dashboard/invoices/catalog domain from Lessons 1–3 (`getPost(slug)`, `listOrgInvoices`, a `getProductCatalog()`). Cached color = **blue** throughout (chapter convention, set in L2/L3). Use single-quoted `'use cache'` (directive family convention).

## Lesson sections

### A bare cached function caches forever

Short opening section that re-grounds the student in Lesson 3 and motivates both topics at once. Do NOT re-teach `'use cache'` — one-sentence recap only (it marks a function cacheable, the compiler keys it by args + captured vars + source). Show the L3 teaser fetcher with the literal `// cacheLife + cacheTag → next lesson` comment, then state the problem: with no `cacheLife`, the entry uses the `default` profile (sensible, but you didn't choose it); with no `cacheTag`, nothing can ever invalidate it on demand — it only refreshes when its lifetime elapses or the code changes on the next deploy. Name the two questions (how long / how does it get told) and the two answers (`cacheLife` / `cacheTag`). Preview the destination shape: `cacheLife('max')` + tags is the canonical production pairing, and we build to it.

Use a small `Code` block for the recap fetcher (the L3 teaser, now with the comment about to be filled in). Keep it to ~6 lines.

Reasoning: the lesson must connect to prior knowledge immediately and frame both topics under one senior question rather than two disconnected APIs. The "caches forever" hook is the pain point that makes both tools feel necessary.

### cacheLife is a UX decision, not a performance decision

The conceptual heart of the lesson. Lead with the reframe in the header itself. The student's prior instinct ("cache longer = faster, so cache as long as possible") is the thing to dismantle. Replace it with: caching trades freshness for speed, and **how much freshness you can trade is a product question about the user**, not a performance knob. A pricing page can be a day stale; a notification count cannot be a minute stale; an invoice total the user just edited cannot be one second stale. The number you pick is an answer to "how wrong is the user allowed to be when they look at this?"

Then introduce the three-number contract, **one number at a time**, anchored to a single cache entry's life:

- `stale` — how long a client may reuse the value with **no revalidation at all** (the client-side / browser-cache window). The user sees an instant value; the server isn't even consulted.
- `revalidate` — after this point, the next request still serves the cached value **immediately** but kicks off a **background refresh**. The user never waits; the next user gets fresh. This is stale-while-revalidate.
- `expire` — after this long **with no requests**, the value is considered too old to serve; the next request **blocks** until fresh content is fetched. This is the line where staleness becomes unacceptable.

Frame `revalidate` as "best-effort freshness, zero user impact" and `expire` as "the hard ceiling — better to make one user wait than show data this old." This pairing is the senior intuition.

**Keystone diagram — the stale-while-revalidate timeline.** A `DiagramSequence` walking one cache entry across its lifetime, one phase per step, each step's caption stating *what the user sees* (not just the cache state):
1. **Fresh** (t=0 to `stale`) — entry just written; served instantly from client/edge cache, server not hit.
2. **Past `stale`, before `revalidate`** — server is consulted but the stored value is still considered current; served as-is.
3. **Past `revalidate`** — request served the **stale value instantly**, a **background refresh** fires (show the two parallel arrows: response out + refetch in). User waits zero. Next request gets fresh.
4. **Past `expire`** (no traffic in the interim) — the entry is too old; the next request **blocks** on a fresh fetch (show the user waiting / fallback). 
Build a single horizontal timeline strip (HTML+CSS, blue = cached/fresh, fading toward orange/grey as it ages) reused across steps with a moving "now" marker, so the stage doesn't reflow. Pedagogical goal: make the three abstract numbers concrete by binding each window to a user-perceptible outcome — this is what converts "cache config" into "UX contract" in the student's head.

Then **the call site**: `cacheLife` is called **inside the function body, after `'use cache'`** — never at module scope (that throws). Show with an `AnnotatedCode` walkthrough of a fetcher: step 1 highlights `'use cache'`, step 2 highlights `cacheLife('max')` immediately under it (note the pairing — directive + lifetime sit together so the contract is local and readable), step 3 the import `import { cacheLife } from 'next/cache'`. Keep `cacheTag` out of this block — it arrives in its own section.

Reasoning: leading with the reframe (and putting it in the header) is the "decisions before syntax" filter applied hard. The one-number-at-a-time build against a single reused timeline is the cognitive-load minimization the brief demands. `DiagramSequence` is the right engine because this is inherently temporal and the student benefits from scrubbing back and forth between phases.

`Term` candidates in this section: **stale-while-revalidate** (serve the old value now, refresh in the background — the user never waits), **revalidation** (re-running the cached function to replace the stored value).

### The preset profiles cover the common cases

Teach the named presets as the 95% path, reinforcing "trigger before tool" — you reach for a custom profile only when no preset fits. List the presets and what each is *for* (not just their raw numbers, which the student should not memorize): `'seconds'` (real-time data), `'minutes'` (frequently updated — feeds, news), `'hours'` (multiple daily updates — inventory), `'days'` (daily — blog posts), `'weeks'` (weekly — newsletters), `'max'` (stable, rarely changes — legal/archived pages), plus `default` (what a bare `'use cache'` gets — 15-min background revalidate, never expires). Emphasize `'max'`: the longest preset (background-revalidates on a ~30-day clock) — **the right reach for any data you invalidate explicitly with tags** (catalog, CMS content, settings), because you're driving freshness with the tag, not the clock. This is the bridge to the tags section. (Do not claim `'max'` never refreshes — see the accuracy note in the framing.)

**The explicit-lifetime discipline (verified watch-out).** The docs strongly recommend always calling `cacheLife` explicitly rather than relying on `default`, and there's a concrete reason worth teaching: when a `'use cache'` function nests another cached function, an inner cache with a *shorter* lifetime can silently shorten the outer cache's `default` lifetime (and a very-short inner cache — `'seconds'` — even errors at prerender because it would propagate and turn the outer cache into a dynamic hole). Stating the lifetime explicitly means you can read any cached function and know its behavior without tracing nested caches. Frame as: "name the lifetime for any cache holding business data — it's documentation and it prevents action-at-a-distance." This is a genuine senior-mindset point, not boilerplate. (The `'seconds'`/short-cache → dynamic-hole behavior is a light callback to L2's PPR shell/holes — mention in one clause, don't re-teach PPR.)

Present the presets in a `Figure` containing a compact HTML table: column 1 preset name, column 2 the user-facing freshness it buys, column 3 a canonical example from the SaaS domain (e.g. `'minutes'` → a dashboard metric that can lag a little; `'days'` → a marketing/pricing page; `'max'` → product catalog refreshed by admin edits). Keep raw second-counts out — the point is matching data-shape to profile, not arithmetic.

**Custom profiles** as the escape hatch: when the data has an unusual freshness need (e.g. "30 min stale, refresh every 5 min, expire after a day"), define a **named profile in `next.config.ts`** under `cacheLife` and reference it by name in the function. Two reasons to name it in config rather than inline a `{ stale, revalidate, expire }` object: the whole team audits freshness policy in one file, and the name documents intent at the call site. Show a tiny `CodeVariants`: tab A the `next.config.ts` profile definition, tab B the `cacheLife('blogPost')` call referencing it. Mention an inline object literal is *possible* but the named-profile path is the senior default for anything reused.

**Exercise — preset selection as a senior decision.** A `StateMachineWalker` (`kind="decision"`, default) that walks the student through choosing a profile by asking freshness questions in the order a senior asks them: "Does a stale read mislead the user?" → "Will an explicit event tell you when it changed?" → leaves recommending `'max'` + tags, `'minutes'`/`'hours'`, or "leave it dynamic (don't cache)." Pedagogical goal: the lesson lives in the *order of the questions*, not the leaf — install the decision procedure, not a lookup table. Each leaf names the profile and the one-line reason.

Reasoning: presets-first respects the platform-default-first filter. The decision-walker is the strongest available component for "teach the senior's question order" and directly serves the lesson's thesis that freshness is a decision. The table keeps the reference scannable without inviting rote memorization of numbers.

`Term` candidate: **profile** (a named `{ stale, revalidate, expire }` triple).

### A timeout is not the same as a push

Short but load-bearing bridge section between `cacheLife` and `cacheTag`. This is the conceptual hinge of the whole lesson. Establish the two independent ways a cached entry becomes fresh again:

- **Timeout (pull) — `cacheLife`.** The entry refreshes on a clock, whether or not the data actually changed. Good when you don't get told about changes (third-party data, content with no edit hook) or when approximate freshness is fine.
- **Push — `cacheTag` + an invalidation call.** The entry refreshes **because the source said so**, exactly when the data changed, regardless of how long the lifetime says. The mutation already knows the data changed (the admin saved a product, the user edited an invoice) — so tell the cache directly instead of waiting out a clock.

State the senior production shape plainly: **`cacheLife('max')` + precise tags.** The lifetime is set to effectively-never (so you're not paying for needless background refreshes on unchanged data), and tags do the real work of refreshing exactly on change. The clock becomes a safety net, not the mechanism.

Crucially, flag the forward reference: **this lesson attaches and names the tag; Lesson 6 is where you pull it** (`updateTag` / `revalidateTag`). Tagging here does nothing observable on its own — it's wiring you complete next lesson. Repeat this so the student doesn't expect invalidation to happen in this lesson's examples.

Visual: a small two-column `Figure` (HTML+CSS) — left "Timeout / pull" (a clock icon, `cacheLife`, "refreshes whether or not data changed"), right "Push" (a signal/bolt icon, `cacheTag` + invalidation, "refreshes exactly when data changed"), with a footer band reading "Production: `cacheLife('max')` + tags — use both." Pedagogical goal: cement that these are orthogonal mechanisms the student combines, not competing options to choose between.

Reasoning: students conflate "cache duration" and "cache invalidation" constantly; this explicit hinge prevents that. Naming the destination shape (`'max'` + tags) before teaching tag syntax gives the next section a clear purpose.

### cacheTag names a cache entry so it can be invalidated

Teach `cacheTag` mechanically and then the naming discipline. `cacheTag('product-catalog')` called **inside** a `'use cache'` function body attaches that string as a named handle on the entry. A function may attach **multiple** tags; the entry can later be invalidated by **any** of them. Like `cacheLife`, it's a named import from `next/cache` and must be called inside the cached function (not module scope). Show with a `Code` block: a `getProductCatalog()` fetcher now complete with `'use cache'` + `cacheLife('max')` + `cacheTag('products')`, finally filling the L3 teaser comment.

**Tag naming — the senior shape.** This is the durable skill of the section. Two-level convention:
- `entity-type` for a **collection** (`products`, `invoices`) — invalidate "the list."
- `entity-type:id` for a **single record** (`product:abc`, `invoice:42`) — invalidate "this one."

Explain *why* the two levels exist by pointing at the consumer: a mutation in Lesson 6 needs to express both "invalidate this one invoice's detail" and "invalidate every list that contains it." The two-level namespace is what makes both expressible against the same cached data.

**Tags scoped by argument** — the pattern that makes per-record tags work: ``cacheTag(`product:${id}`)`` computes the tag at call time from the function's argument. The student combines coarse + fine on one entry: a fetcher attaches both `cacheTag('products')` and ``cacheTag(`product:${id}`)``, so the same cached value can be invalidated either by the collection tag or by its record tag. Show this with an `AnnotatedCode` walkthrough: step over the directive, the lifetime, the collection tag, the computed record tag — four lines, each its own focus.

**The interaction with `cacheLife`, restated concretely.** A tag-targeted invalidation marks the entry stale **immediately, regardless of `cacheLife`**. `cacheLife` is the timeout policy when no invalidation arrives; the tag + invalidation is the push policy when the upstream knows. (Reinforces the previous section against a concrete entry.)

**Tags vs paths — the senior reach.** Tags name **entities**; paths name **URLs**. Tag the cached *data*, not the page it appears on — the same `products` tag invalidates the homepage, the search page, and the admin list in one call without enumerating URLs. Path-based invalidation (Lesson 6, `revalidatePath`) is for the rare case where the URL itself is the cached unit (a generated sitemap, an OG image route). Name this distinction but keep it brief — the API is L6's.

Reasoning: naming conventions are exactly the kind of "patterns inline, at the moment they're taught" the guidelines call for. Grounding the two-level scheme in its L6 consumer (rather than as arbitrary style) is the senior-mindset framing. `AnnotatedCode` is right for the multi-tag fetcher because the student's focus needs directing to each call in turn.

`Term` candidates: **tag** (a string handle attached to a cache entry that the invalidation API targets), **invalidate** (mark a cached entry stale so the next read refreshes it).

### Centralize tag strings so read and write never drift

The production hardening of the naming section, and a debt this lesson must plant for Lesson 6. The problem: tags are **plain strings, untyped at every call site**, and a tag is written in two places — the cached fetcher (read side) and the future mutation (write side). A typo on either side is a **silent no-op**: no error, the invalidation just misses and the user sees stale data. The senior fix: never write tag strings inline — funnel them through one helper module so both sides import the same source of truth.

Introduce the project's `tags.ts` helper as the canonical shape (this is the artifact Lesson 6 will import to invalidate). Show the four-scope structure the codebase uses:

```ts
invoiceTags.list(orgId)         // entity / collection
invoiceTags.record(orgId, id)   // single record
orgTags.all(orgId)              // everything for an org
userTags.all(userId)            // everything for a user
```

Teach this as a progression from the bare colon-strings: `invoice:42` was the mental model; `invoiceTags.record(orgId, id)` is the same idea made typo-proof, multi-tenant-aware (org-scoped), and greppable. Note the **org/user scopes** exist because a multi-tenant SaaS must be able to invalidate "everything for this org" in one call (e.g. after a billing-plan change) — a need the simple two-level scheme doesn't cover. Show the read side using it: ``cacheTag(invoiceTags.list(orgId))`` inside `listOrgInvoices`. Mention the file lives at the conventional `src/lib/tags.ts` location.

Show a `CodeVariants`: tab A "inline strings (fragile)" — the same tag typed by hand in a fetcher, with a deliberate typo planted (`'invoces'`) and a note that nothing catches it; tab B "centralized helper (senior)" — both sides importing `invoiceTags`. Pedagogical goal: make the fragility visceral, then show the fix.

**Watch-outs woven into this section** (do not bundle elsewhere): tags are **case-sensitive**; user-supplied IDs in tags need to come from **validated** input (derive tags from validated IDs, never raw user input — cache-namespace pollution otherwise); the `'max'` profile **with no tag** is a footgun — the entry then only refreshes on its slow ~30-day clock (or on the next deploy), so pair `'max'` with at least one tag whenever the data can change on demand.

Reasoning: the Code conventions mandate `tags.ts` helpers and the four scopes — teaching the bare colon-string without landing the helper would teach a shape the student must immediately unlearn. Staging colon-string → helper keeps cognitive load low while ending on the production form. This section also discharges a concrete debt: L6 imports `tags.ts`, so it must exist by the end of L4.

### Putting it together

Short synthesis section. Show the **canonical complete cached fetcher** the student should now be able to write, end to end: `'use cache'` + `cacheLife('max')` + a collection tag + a record tag (using the `tags.ts` helper), in the invoices domain (`listOrgInvoices(orgId)` or `getInvoice(orgId, id)`). This is the destination shape promised in the framing — the full anatomy, both halves, assembled. Use `AnnotatedCode` so each line's role is recapped in one pass, or a single annotated `Code` block if tighter. Close with one sentence pointing forward: the tags are wired and waiting; Lesson 6 pulls them after a mutation so the user sees their change immediately.

**Exercise — assemble the contract.** A `Dropdowns` exercise (fenced-code mode) over a cached fetcher skeleton with blanks at: the directive (`'use cache'`), the lifetime call (`cacheLife`), the preset (`'max'`), and the two tag calls. Goal: the student demonstrates they can place all four pieces in the right order inside the body. Grading is exact-string match per blank.

Optionally also a `Buckets` drill earlier-or-here: sort a set of data descriptions into the right preset bucket (`'minutes'` / `'days'` / `'max'` / "don't cache — leave dynamic"), reinforcing the UX-decision framing from §2. Place whichever single exercise best fits; avoid stacking too many.

Reasoning: a synthesis section gives the student the whole shape in one place after building it piecemeal, satisfying the "what should the student be able to do at the end" question. The `Dropdowns` exercise checks exactly that assembly skill.

### External resources

Optional `ExternalResource` cards to the official Next.js docs for `cacheLife` and `cacheTag` (the `next/cache` API reference) and the Cache Components / `use cache` directive guide. Verify URLs and currency during fact-check.

## Scope

This lesson owns **`cacheLife` and `cacheTag`** — the two calls made inside a `'use cache'` body — and the tag-naming discipline up to and including the `tags.ts` helper.

Prerequisites (recap in one line each, do not re-teach):
- `'use cache'` directive, its three placements, the compiler-generated cache key, and the closure-capture model (outer-scope vars are captured and folded into the key; request data must not be) — **Lesson 3**. Reference, don't re-derive.
- Dynamic-by-default under `cacheComponents: true`, `'use cache'` as opt-in — **Lesson 1**.
- PPR shell/holes and the Suspense seam — **Lesson 2**. Touch only if a stale-while-revalidate phase needs the streaming vocabulary.
- Serialization contract — **Lesson 3**. Tags are strings, so not a focus here.

Explicitly **out of scope** (name the owning lesson when deferring):
- **The invalidation API** — `updateTag`, `revalidateTag`, `revalidatePath`, `router.refresh` — **Lesson 6**. This lesson attaches and names tags only; it must repeatedly defer "how you pull the handle." Do not show an invalidation call's mechanics, the read-your-writes vs stale-while-revalidate split, or the `revalidateTag(tag, profile)` two-argument requirement (mention only that invalidation exists and lives next lesson).
- **React `cache()`** for per-request memoization — **Lesson 5**. Different layer; do not contrast in depth here (L5 owns the contrast).
- **Async request APIs** (`params`, `searchParams`, `cookies()`, `headers()`, `connection()`) and legacy segment config (`export const revalidate`) — **Lesson 7**. Do not teach the `revalidate` segment export here even though it overlaps conceptually with `cacheLife`; L7 owns the migration.
- **Cache backends / self-hosting** (Redis, cache handler API, `'use cache: remote'`) — named once in L3, not taught.
- **`generateStaticParams`** and seeding the cache for known segments — **Chapter 034 L8**.
- **Webhooks as invalidation triggers** — **Chapter 063**. The webhook → `revalidateTag` timing pattern is L6/Ch063, not here.
- **Multi-tenant org-switch cache discipline** (`queryClient.clear()` etc.) — later units; mention org-scoped tags only as the reason the `tags.ts` `orgTags.all` scope exists.

## Notes for downstream agents

- The L3 lesson ends with the literal teaser comment `// cacheLife + cacheTag → next lesson` inside a fetcher. Open by paying that off explicitly — continuity matters.
- Follow the **corrected closure model** from L3 (continuity notes): outer-scope variables ARE captured and folded into the cache key. Do not reintroduce the "closures forbidden" error if recapping L3.
- Cached color convention = **blue** (chapter-wide). `'use cache'` is single-quoted.
- `revalidateTag`'s required second-argument `cacheLife` profile belongs to **L6** — do not preempt it here beyond noting invalidation exists.
- Keep code samples small: this lesson is about the two extra lines on an already-cached function. Resist re-showing full `'use cache'` anatomy.
- Verified import line: `import { cacheLife, cacheTag } from 'next/cache'`. Both are called **inside** the cached scope, never at module scope (throws). Only one `cacheLife` may execute per invocation (conditional branches allowed, but one per request).
- Canonical reference shape from the official docs (use as a model, adapt to the invoices/catalog domain): a fetcher that calls `cacheTag(...)`, then sets `cacheLife` — optionally *conditionally* (e.g. a missing/draft record gets `'minutes'`, a published one gets `'days'`). Conditional `cacheLife` is a legitimate pattern worth a brief mention but not a focus; keep the canonical examples single-lifetime.
- Light L2 callback only: very-short caches (`'seconds'`, or `revalidate: 0`) are excluded from the prerender and become dynamic holes. One clause, do not re-teach PPR.

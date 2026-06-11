# Lesson outline — Chapter 072, Lesson 1

## Lesson title

- **Title:** Route classes and the tag scheme
- **Sidebar label:** Route classes and tags

## Lesson framing

This lesson is **decisions over syntax** in its purest form. The student already owns every mechanic — `'use cache'`, `cacheLife`, `cacheTag`, the four invalidation calls, `cacheComponents: true`, the request-data closure rule — from Chapter 032. They have also shipped `tenantDb(orgId)` (Ch056), the org-scoped data layer, Server Actions, webhooks, and the list view. What they lack is the senior judgment that sits *upstream* of typing a single `'use cache'`: **which routes earn caching at all, and what tag does each cached read carry so a mutation invalidates exactly the right entries.** Teach almost no new API. Teach a discipline.

Two load-bearing artifacts are the lesson's output, and every section should drive toward them:

1. **A one-page route-classification table** — each route labeled fully dynamic, partially cached, or fully static, with its cached subtrees, tag set, and `cacheLife` profile. The senior move is writing this *before* the cache code, as an architecture doc next to `next.config.ts`.
2. **`lib/tags.ts`** — a single helper file that is the only place tag strings exist, so read-side and write-side strings can never drift.

The strongest mental model to leave the student with: **caching is opt-in and the burden of proof is on caching.** Under Cache Components the default is dynamic, and for authenticated, per-user, per-org SaaS surfaces that default is *correct* — a per-user cached read has a hit rate near zero and is effectively uncached complexity. Caching earns its weight only where read frequency far exceeds write frequency and the value is shared across users. The second model: **the tag is the named contract between a cached read and the mutation that changes its data, and it must mirror the same org scoping the data layer already enforces** — `tenantDb(orgId)` on the read side, `invoiceTags.list(orgId)` on the cache side, the same orgId running through both.

Where beginners go wrong, and what each section should pre-empt:
- They cache reflexively ("cache everything to be fast") and invert the default, creating a permanent staleness-audit burden. Counter early and hard with the read-to-write ratio.
- They write tag strings inline at call sites; a one-character drift between read and write means the cache silently never invalidates and the bug is invisible until a user complains about stale data. The `tags.ts` helper is the structural fix.
- They close over `orgId` from `auth()`/the session *inside* a cached function. It compiles, but it bakes one org's data into a cross-request entry shared across all orgs — a tenancy leak. This is the most dangerous mistake in the lesson and deserves its own treatment; it's the Ch032 closure rule with multi-tenant stakes.
- They tag a list read at record granularity, forcing every mutation to defensively fire dozens of record tags. Teach: tag at the granularity the *read* needs.

Tone: adult, terse, senior-to-junior. Frame everything in production stakes (stale invoices, leaked tenant data). This is a ~50–60 min lesson; the classification and the tag scheme are the chapter's foundation that Lesson 2's decision tree and Ch073's project both build on.

**Critical conventions note for downstream agents:** the tag-helper shape is **canonical in the code conventions** and differs from the loose names in the chapter outline. Use the namespaced-object form, not flat functions:
```ts
invoiceTags.list(orgId)        // org-scoped list/entity tag
invoiceTags.record(orgId, id)  // record tag
orgTags.all(orgId)             // whole-org tag
userTags.all(userId)           // user-scoped tag
```
File lives at `lib/tags.ts`. Do **not** use `invoicesTag()` / `invoiceTag(id)` / `orgInvoicesTag(orgId)` (the chapter-outline names) — they are superseded. Note that in this shape `orgId` is baked into the entity/record tag, which makes every invoice tag org-scoped by construction — this is deliberate and reinforces the data-layer/cache-layer alignment thread.

---

## Lesson sections

### Introduction (no header)

Open with `<CourseProgressBar>` (match Ch032 lesson frontmatter pattern). State the senior question concretely: open the app's `app/` directory after eleven units of building — the dashboard, the invoices list, the invoice detail, settings, the marketing pages. For each route, what is the right caching posture, and once a route caches anything, what tag does each cached read carry? Make explicit that this lesson assumes all the Ch032 mechanics and adds *only judgment*: the classification a team agrees on up front, and a tag scheme that scales with the data model. Preview the two artifacts (classification table, `tags.ts`). Keep it warm and brief; one short paragraph plus the question.

Connect to prior knowledge in one line: they have `'use cache'` and the four invalidation calls; what's missing is *where* to point them.

### Caching is opt-in, and dynamic is the right default

**Goal:** establish the burden-of-proof framing before any classification, so the student doesn't reflexively cache.

Content:
- Restate from Ch032: under `cacheComponents: true`, every route is dynamic until a `'use cache'` boundary is added. Nothing is cached by accident.
- The senior reflex for an authenticated, per-user, per-org surface is to **leave it dynamic.** Reasoning the student must internalize: the data changes often, the audience is frequently a single user, so the cached payload's hit rate approaches zero — you pay the complexity and staleness risk of a cache and get almost no hit-rate benefit.
- Name the rule plainly: **prove the cache is worth it; don't assume it.** The question that admits a candidate is **read frequency ÷ write frequency** (the read-to-write ratio). High ratio (read by many, written rarely) → cache. Low ratio → stay dynamic.
- This reframes "is it slow?" into "is it *shared and stable*?" — caching the app chrome shared by every user beats caching a deep per-user widget even when the widget is slower.

Components: prose only here. Keep a single inline `Code` block showing a bare dynamic Server Component (no `'use cache'`) labeled "this is correct, not unfinished" to disarm the instinct that uncached = incomplete.

`<Term>` candidates: **hit rate** (definition: share of reads served from cache vs. recomputed; near-zero means the cache rarely helps), **read-to-write ratio**.

### The three route classes

**Goal:** give the student a checklist they run on every new route. This is the first artifact's vocabulary.

Content — define each class with concrete SaaS examples drawn from the course's own app so it's not abstract:
- **Fully dynamic** — every read at request time, no `'use cache'` anywhere. The dashboard, the inbox, the settings page, the invoices list *as the student built it in Unit 10* (URL-driven filters, per-org). Anything that changes per-user-per-second.
- **Partially cached** — a dynamic outer shell wraps cached subtrees behind Suspense boundaries (the PPR shape from Ch032 L2). Examples: a detail page whose entity mutates rarely (cache the entity, stream the dynamic chrome), a page with a cached reference-data sidebar alongside dynamic content.
- **Fully static** — no dynamic signal anywhere; the whole page prerenders at build. Marketing pages, the pricing page (plan content is build-time copy), the docs site.

Teaching approach: present as a **gradient from "all request-time" to "all build-time,"** with partially-cached as the middle. Emphasize this is a *per-route* checklist, and that most authenticated routes land on fully-dynamic — that's healthy, not a failure to optimize.

Components:
- A **`<Figure>` with a horizontal three-band HTML/CSS diagram** (per diagrams INDEX, "sequential phase strip" / color-coded segments → plain HTML+CSS; horizontal to respect the vertical-space constraint). Three columns left→right: Fully dynamic / Partially cached / Fully static. Under each, 2–3 example route chips and a one-line "what renders when." The partially-cached column visually shows a static shell with a streamed hole (a cached band + a dynamic band) to connect to PPR. **Pedagogical goal:** make the gradient spatial and memorable, and visually link "partial" to the shell-and-holes picture they already know. Keep under ~800px tall; this is a simple visual aid, not a system graph.

### The cacheable shortlist, and the not-cacheable list

**Goal:** turn the abstract ratio into two concrete lists the student can pattern-match against, so classification is fast in practice.

Content:
- **Cacheable shortlist** (high read-to-write ratio, shared across users): plan entitlements (Unit 11), org membership lists / role definitions, feature flags (read every request, edited rarely), public marketing + pricing + docs pages, OG image generators, route-shell metadata. The unifying property: *the same value is read by many users many times between writes.*
- **Not-cacheable list** (the senior reflex says "don't bother"): personalized lists where the URL state owns the filter (Unit 10 — each filter combo is a different payload, hit rate fragments to nothing), real-time dashboards, inbox feeds, anything behind `cookies()`/`headers()` that depends on the request, anything whose payload includes `now()` or a per-action counter.
- Drive home: trying to cache the not-cacheable list wastes effort *and* adds staleness bugs.

Components:
- A **`<Buckets twoCol>` classification exercise** is the right fit here — sort ~8 concrete surfaces into "Cache it" vs "Keep it dynamic." This is exactly the senior judgment the lesson teaches, made interactive. Item examples: "The org's plan entitlements row, read on every page" (cache), "The invoices list with `?status=overdue&sort=-amount`" (dynamic), "The pricing page" (cache), "The signed-in user's inbox feed" (dynamic), "Feature flags read every request, toggled weekly" (cache), "The dashboard's live revenue counter" (dynamic), "Public docs pages" (cache), "Per-user notification list" (dynamic). Use `instructions` to frame it as "decide the caching posture." **Goal:** active recall of the ratio heuristic, not passive reading. Bucket items must paraphrase, not echo, the prose lists (per MCQ/exercise guidance against pattern-matching).

`<Term>` candidates: **feature flag** (if not already defined earlier — brief: a config toggle that turns a feature on/off without a deploy), **entitlements** (the plan-derived row saying what an org is allowed to do).

### `cacheLife` is a product decision

**Goal:** reframe profile selection from a perf knob to a UX/product question. Short section — mechanics are known, only the *judgment* is new.

Content:
- Restate the three numbers (stale, revalidate, expire) describe *how long the user tolerates slightly-old data* — a product question, not a performance one.
- The 2026 built-in profiles span "barely cached" to "effectively static": `'seconds'`, `'minutes'`, `'hours'`, `'days'`, `'weeks'`, `'max'`.
- Worked judgment calls (this is the value-add): a list of orgs a user belongs to → `'hours'` (membership changes rarely); a feature-flag read → `'minutes'` (rollouts are minute-scale); plan entitlements read in an action path → `'minutes'` *with explicit invalidation on plan change* (the profile is the floor, the tag is the push). The senior shape from Ch032 — `'max'` plus precise tags — is for data that only ever changes through a known mutation you can tag.
- The watch-out, stated inline: `'seconds'` on a frequently-read public page barely lifts hit rate and pays constant revalidation churn — pick `'hours'`/`'days'` when the data permits.

Components: a compact `Code` snippet or small `CodeVariants` showing the same cached fetcher with two different profiles and a one-line product justification per tab (e.g., "membership: 'hours'" vs "feature flags: 'minutes'"). Keep prose tight.

### The tag scheme is the contract between read and write

**Goal:** motivate *why* a scheme exists before showing its shape. This is the conceptual heart.

Content:
- A cached read declares tags via `cacheTag(...)`. A mutating write calls `updateTag`/`revalidateTag` with the *same string*. The scheme is the team's commitment that those two strings always line up.
- The failure mode without a scheme: tags are free-form strings typed at each call site. The write site picks `'invoices'`, the read site tagged `'invoice-list'` — no error, no warning, the entry just never invalidates and serves stale data indefinitely. Frame as the **invisible bug**: nothing crashes, a user eventually reports "I edited it but it still shows the old value."
- With a scheme, the tag is a *function of the entity and its scope* — mechanical, not invented per call.

Components: a small **before/after `<CodeVariants>`** — "Free-form strings (drifts silently)" vs "Through the scheme (can't drift)". Use `del=`/`ins=` framing. The "before" tab shows a read tagging `'invoices'` and a write calling `updateTag('invoice-list')` with a comment marking the silent mismatch; the "after" tab routes both through `invoiceTags.list(orgId)`. **Goal:** make the cost of no-scheme visceral before presenting the solution.

### Four tag scopes — entity, record, org, user

**Goal:** teach the scope taxonomy and the union-of-tags rule a cached read attaches.

Content — define the four shapes the scheme produces, using the canonical helper names:
- **Org-scoped list/entity tag** — `invoiceTags.list(orgId)`: invalidates every cached invoice-list read *for one org*. (In a multi-tenant SaaS, the "entity" tag is already org-scoped — there is no useful global "all invoices everywhere" tag, since reads are always tenant-bound.)
- **Record tag** — `invoiceTags.record(orgId, id)`: invalidates a single invoice's cached read.
- **Whole-org tag** — `orgTags.all(orgId)`: a coarse switch invalidating everything cached for an org (org rename, plan change cascading across surfaces).
- **User-scoped tag** — `userTags.all(userId)`: user-private data (a user's "orgs I'm in" list, personal notifications) — but flag immediately that user-scoped *caches* are usually low-value (near-zero hit rate) and this tag mostly exists to invalidate the rare shared-but-user-keyed read.
- **The union rule:** a cached read attaches *all* tags by which any writer might want to invalidate it. A single-invoice detail read tags itself with both `invoiceTags.record(orgId, id)` *and* `invoiceTags.list(orgId)` so that either a record-level writer or a list-level writer reaches it. Write sites then pick the *narrowest* tag that captures their change.

Teaching approach: build complexity gradually — start with just record + list (the two the student will use most), then add org-wide and user as the two situational scopes. Don't front-load all four as equal.

Components:
- An **`<AnnotatedCode>`** stepping through one cached `getInvoice` read that attaches its union of tags, highlighting each `cacheTag(...)` line with its scope explained per step (record tag step, list tag step). `maxLines` ~12, blue/green colors. **Goal:** focus attention on which tags a single read carries and why, one scope at a time.

`<Term>` candidates: **tag union** (a cached entry can carry several tags; invalidating any one of them invalidates the entry).

### Tag-string conventions and the `lib/tags.ts` helper

**Goal:** the second artifact. Conventions first (so the helper's shape is justified), then the helper as the structural enforcement.

Content:
- **String conventions:** lowercase, colon-delimited, scope-first/entity-next/id-last (e.g. `org:${orgId}:invoices`, `invoice:${orgId}:${id}`). No interpolated user input that isn't already a validated id; no PII in tags; under the framework's 256-char cap (never an issue in practice). State these as the *output* the helper produces — the student rarely writes raw strings.
- **The helper:** `lib/tags.ts` exports namespaced objects whose methods return the strings. Cached reads import them; write sites import the same functions. **The string exists in exactly one file.** Refactoring a tag is a function-body edit, not a project-wide grep. A typo becomes a *type error* (wrong function name) instead of a silent miss.
- Show the file's actual shape and a read site + a write site both importing from it.

Components:
- **`<CodeVariants>`** grouping the related files (this is the canonical use of CodeVariants — multiple related files): tab 1 = `lib/tags.ts` (the helper definitions), tab 2 = the cached read importing `invoiceTags.list(orgId)`, tab 3 = the Server Action write importing the same. **Goal:** show the one-file-source-of-truth concretely across the three sites that share it.
- A `<FileTree>` is optional and probably overkill; mention `lib/tags.ts`'s location inline instead, referencing the repo's `lib/` layout.

The `tags.ts` content downstream agents should produce (align exactly to code conventions):
```ts
export const invoiceTags = {
  list: (orgId: string) => `org:${orgId}:invoices`,
  record: (orgId: string, id: string) => `org:${orgId}:invoice:${id}`,
};
export const orgTags = {
  all: (orgId: string) => `org:${orgId}`,
};
export const userTags = {
  all: (userId: string) => `user:${userId}`,
};
```
(Branded `OrgId`/`InvoiceId` types from `lib/branded.ts` may be used for the params if the agent wants to reinforce Ch005 — optional, note it as a nice-to-have, don't require it.)

### Org-scoped tags mirror the org-scoped data layer

**Goal:** land the lesson's deepest design principle — the same scope shape runs through both the data layer and the cache layer.

Content:
- Recall `tenantDb(orgId)` (Ch056 L2): it injects the org predicate on every read/write so the missing-`where` bug can't compile. The org-scoped tag is the *cache-layer mirror* of that same boundary: `org:${orgId}:invoices` matches exactly the scope `tenantDb(orgId)` reads.
- The payoff: a mutation inside an org's scope calls `updateTag(invoiceTags.list(orgId))`, and only that org's cached list reads invalidate — other orgs' cached reads survive untouched. One scope shape, enforced on both sides, no cross-tenant invalidation.
- State as a design principle the student can carry: **when you scope the data, scope the cache the same way.**

Components: a small **`<Figure>` with a simple two-column HTML/CSS or `<ArrowDiagram>`** showing the parallel: left column "Data layer: `tenantDb(orgId)` → rows for org A only"; right column "Cache layer: `org:A:invoices` tag → cached reads for org A only"; a connecting note that orgId is the shared key. **Goal:** make the mirror-symmetry visual. Keep it minimal. (If using `<ArrowDiagram>`, remember `expandable={false}` per Figure docs.) A plain HTML two-panel is simpler and safer — prefer it.

### The closure rule, with tenancy stakes

**Goal:** restate the Ch032 "no request data in a cached closure" rule, but elevate it to the lesson's most dangerous mistake because of multi-tenancy.

Content:
- The rule (Ch032 L3 / L7): a `'use cache'` function's captured outer-scope values are folded into the cache key and must be serializable; it cannot read `cookies()`/`headers()`/session inside. Therefore **the tags it emits can only be functions of its arguments.**
- The implication for tags: org scoping must be an **explicit `orgId` argument** to the cached function, never read from `auth()`/the session inside it.
- The danger, spelled out: a cached `getInvoices()` that closes over `orgId` from `auth()` *compiles fine* but caches **one org's data into a single cross-request entry shared across every org** — the next org to hit the route reads the first org's invoices. This is a **tenant data leak**, the highest-stakes failure in the chapter.
- Rule the student carries: **tags are arguments, not ambient state.** Pass `orgId` in.

Components:
- A **`<CodeVariants>` "Leaks across tenants" vs "Scoped correctly"** comparison — the only good place for the incorrect/correct framing the docs recommend. Tab 1: `getInvoices()` reading `orgId` from `await auth()` inside the cached body (mark it, explain the shared-entry leak in the first sentence). Tab 2: `getInvoices(orgId: string)` taking it as an argument and tagging `invoiceTags.list(orgId)`. **Goal:** the student *sees* the leak shape so they recognize it in review. This is a code-review catch they will actually encounter.

`<Term>` candidates: **cache key** (the compiler-built identity of a cached entry; same key = same shared entry across requests).

### The granularity decision — tag for the read, not the finest grain

**Goal:** the last judgment call — choosing scope granularity.

Content:
- An invoice **list** read should tag `invoiceTags.list(orgId)`, because *any* invoice in the org changing should refresh the list.
- An invoice **detail** read should tag `invoiceTags.record(orgId, id)`, because only *that* invoice matters to it.
- The senior call: **tag at the granularity the cached read needs, not at the finest available.** Over-narrow tags (tagging a list with per-record tags) force every mutation to remember and fire every record tag the list depends on — the exact bug that makes lists go stale when a new record is added but no per-record tag existed to fire.
- This sets up Lesson 2's "narrowest tag that captures the change" on the *write* side — note the symmetry: reads tag at the grain they need, writes fire the narrowest tag that covers the change.

Components: prose plus a tight `Code` example of the two reads side by side (or reuse the earlier annotated read). A one-question `<MultipleChoice>` checks the judgment: "A new invoice is created in an org. The list read is tagged `invoiceTags.list(orgId)`. Which is true?" with distractors about needing record tags. Answers must paraphrase, not echo. **Goal:** verify the student grasps why list-grain tags survive record inserts.

### The `fetchedAt` discipline — proving the cache works

**Goal:** give the student the diagnostic they'll use to verify any cache decision. Connects to Ch073's verification surface.

Content:
- Every cached read emits `fetchedAt: new Date().toISOString()` *inside* the cached function. The render surfaces it (dev always; behind a flag in prod).
- Reading it: `fetchedAt` **stable across loads → cache hitting**; `fetchedAt` **advancing → entry refreshed/invalidated**. It's the first thing a senior looks at for any cache bug — "is this even caching?"
- Note it's a deliberate small divergence from "don't put `now()` in a cached function" — here the timestamp is captured *once when the entry is computed* and is exactly the signal we want (it tells you *when this entry was built*), not a freshness read. Call this out so the student understands it's intentional.

Components: a small `Code` snippet of a cached fetcher returning `{ ...data, fetchedAt }`. Note for downstream: Ch073 wires this as the live verification surface, so keep it concrete and reusable.

### The classification document

**Goal:** name the first artifact explicitly and close the lesson on the "write it down first" senior move.

Content:
- Each route gets a row: **path · class (dynamic/partial/static) · cached subtrees (if partial) · tag set · `cacheLife` profile.**
- It lives next to `next.config.ts` as part of the project's architecture docs.
- The senior call: **write it before the cache code.** Classifying after the fact is when wrong decisions calcify into the codebase and the audit never happens.
- Tie back: this table plus `lib/tags.ts` are the two things Ch073 implements on the invoices list.

Components:
- A **filled example classification table** as a Markdown table (or `Code` block) for the course app: rows for `/dashboard` (dynamic), `/invoices` (dynamic — Unit 10 list), `/invoices/[id]` (partial — cached entity behind a dynamic shell, `invoiceTags.record(orgId,id)`, `'max'`), `/pricing` (static), `/settings/members` (partial — cached membership list, `orgTags`/membership tag, `'hours'`). **Goal:** the student sees the artifact fully worked for an app they know, ready to copy as a template.
- Optionally close with an `<ExternalResource>` LinkCard to the Next.js caching / `use cache` docs for reference (keep to one).

### Optional closing recap

A 3–4 line summary reinforcing the two carry-home rules: (1) dynamic is the default, cache only proven high-ratio shared reads; (2) tags are scoped arguments funneled through `lib/tags.ts`, mirroring the data layer. Lead into Lesson 2: "now that reads are tagged, which of the four invalidation calls does each mutation fire?"

---

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- `'use cache'`, `cacheLife`, `cacheTag` mechanics and the three placements — Ch032 L3/L4. Assume fluent; recall in one line each where needed.
- `cacheComponents: true` flipping the default to dynamic — Ch032 L1. One-line recall.
- The PPR shell-and-holes shape (static shell + Suspense holes) — Ch032 L2. Recall only to anchor the "partially cached" class.
- The closure/serialization rule for cached functions — Ch032 L3/L7. *Restated and elevated* in this lesson because it's load-bearing for tenancy; this is deliberate re-teaching, not overlap.
- `tenantDb(orgId)` and org-scoped data layer — Ch056 L2. Recall its purpose in one line to draw the data-layer/cache-layer parallel.
- Branded IDs — Ch005. Optional reinforcement only.

**Explicitly out of scope (defer):**
- **The four invalidation calls applied to worked cases** (`updateTag` vs `revalidateTag` vs `revalidatePath` vs `router.refresh`, the two-axis decision tree, post-edit/webhook/background-job flows) — **Lesson 2 of this chapter.** This lesson defines the tag *scheme*; Lesson 2 decides which call fires. The student may see `updateTag(invoiceTags.list(orgId))` in passing in examples, but do **not** teach the decision tree or the read-your-writes-vs-eventual axis here.
- **Implementation on the Unit 10 invoices list** — Ch073 project. This lesson produces the mental model and conventions; the project wires them.
- **Trigger.dev / webhooks as invalidation callers** — named only as future callers of `revalidateTag` (Ch063/Ch066); not taught here.
- **Edge/CDN cache, Vercel data cache, browser cache** — out of scope; this lesson is strictly the Next.js cache layer.
- **`'use cache: private'` / per-user cache variants** — name once at most as a deferred power tool when discussing user-scoped tags; not part of the SaaS shortlist.
- **The full `cacheLife` custom-profile config syntax** — covered in Ch032 L4; here only profile *selection* as a product judgment.
- **Rate limiting / Upstash** — later in Unit 14 (Ch074), unrelated.

---

## Notes for downstream agents

- **Canonical tag-helper shape is non-negotiable:** namespaced objects (`invoiceTags.list`, `invoiceTags.record`, `orgTags.all`, `userTags.all`) at `lib/tags.ts`, per the code conventions. Ignore the chapter outline's flat `invoicesTag()`/`orgInvoicesTag()` names.
- `revalidateTag` requires a second `cacheLife`-profile argument in Next.js 16 (single-arg form deprecated); if any example shows it, use `revalidateTag(tag, 'max')`. (Mostly Lesson 2's concern, but keep examples correct.)
- This lesson is judgment-heavy: keep new syntax near zero, lean on the classification table, the `tags.ts` helper, the `<Buckets>` exercise, and the two `<CodeVariants>` (free-form-vs-scheme, leaks-vs-scoped) as the load-bearing teaching surfaces.
- Respect the vertical-space constraint on all figures (horizontal layouts, ≤~800px).

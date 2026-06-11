# Chapter 072 — Cache decisions as architecture

## Lesson 1 — Route classes and the tag scheme

**Taught.** Established the classification framework (fully dynamic / partially cached / fully static), the read-to-write ratio as the only admission test for caching, and the `lib/tags.ts` namespaced-helper pattern as the structural contract between cached reads and invalidating writes.

**Cut.** The chapter outline's "caching mutations themselves — the trap" bullet (no `'use cache'` inside actions) was not covered; this is plausibly useful context for Lesson 2.

**Debts.**
- Lesson 2 owns the full four-way invalidation decision tree (`updateTag` / `revalidateTag` / `revalidatePath` / `router.refresh`); Lesson 1 shows `updateTag(invoiceTags.list(orgId))` in a write-side example without teaching the choice.
- Ch073 project implements the classification table and `lib/tags.ts` on the live invoices list; `fetchedAt` discipline is explicitly deferred to Ch073 as its verification surface.

**Terminology.**
- **read-to-write ratio** — read frequency ÷ write frequency; high ratio is the green light for caching.
- **hit rate** — share of reads served from cache; near-zero means caching that read buys nothing.
- **tag union** — a cached entry carries several tags; invalidating any one invalidates the entry; reads are generous (attach all applicable tags), writes are precise (fire the narrowest).
- **cache key** — compiler-built identity of a cached entry derived from function arguments and captured variables; same key = same shared entry across all requests.
- **`fetchedAt` discipline** — `fetchedAt: new Date().toISOString()` returned inside the cached function; stable across loads = cache hitting, advancing = cache invalidated or refreshed.

**Patterns and best practices.**
- `lib/tags.ts` is the single source of truth for all tag strings; both read sites and write sites import from it — no inline string literals.
- Canonical helper shape (non-negotiable for Ch073 project):
  ```ts
  export const invoiceTags = {
    list: (orgId: string) => `org:${orgId}:invoices`,
    record: (orgId: string, id: string) => `org:${orgId}:invoice:${id}`,
  };
  export const orgTags = { all: (orgId: string) => `org:${orgId}` };
  export const userTags = { all: (userId: string) => `user:${userId}` };
  ```
- Tag strings: lowercase, colon-delimited, scope:entity:id; no PII; no unvalidated user input.
- `orgId` must arrive as an explicit argument to every `'use cache'` function — reading it from `auth()` inside the cached body bakes one org's data into a cross-request entry (tenant data leak that compiles fine).
- Tag at the granularity the *read* needs: list reads use `invoiceTags.list(orgId)` (org-grain); detail reads use `invoiceTags.record(orgId, id)`; don't tag a list with per-record tags (new-insert miss).
- The org-scoped tag mirrors `tenantDb(orgId)`: same `orgId` scopes both the data layer and the cache layer — mutation fires `invoiceTags.list(orgId)`, only that org's cache invalidates.
- Write the route-classification table (path · class · cached subtrees · tag set · `cacheLife`) before writing cache code; it lives next to `next.config.ts`.
- `cacheLife` is a product question ("how long can the user tolerate stale data?"); `'max'` + precise tags is the senior shape for data that only changes via known mutations.

**Misc.**
- `revalidateTag` requires a second `cacheLife` profile argument in Next.js 16 (single-arg form deprecated); canonical form `revalidateTag(tag, 'max')` — mostly Lesson 2's concern but keep correct in any examples.
- The lesson's classification table rows for this app: `/dashboard` dynamic, `/invoices` dynamic, `/invoices/[id]` partial (`invoiceTags.record` + `invoiceTags.list`, `'max'`), `/pricing` static, `/settings/members` partial (`orgTags.all`, `'hours'`).
- `userTags.all(userId)` mostly exists for invalidating rare shared-but-user-keyed reads; user-scoped *caches* have near-zero hit rate — flag this in any lesson that might tempt caching per-user data.

---

## Lesson 2 — Picking the right invalidation call

**Taught.** Delivered the two-axis decision model (read-your-writes vs. eventual; tag vs. path) mapping to all four invalidation calls, worked through five SaaS cases, and established the fan-out discipline and commit-before-invalidate ordering rule.

**Cut.** Chapter outline's "observability — counting invalidations dashboard" bullet was trimmed to a single paragraph advising a structured log line only; no metric surface or dashboard was built (explicitly deferred to Unit 19).

**Debts.**
- Ch073 project implements the invalidation calls on the live invoices list; the `fetchedAt` verification surface (promised in Lesson 1) lands there.
- TanStack Query client-cache invalidation (`queryClient.invalidateQueries`) is a named forward pointer to the TanStack chapter (Unit 15); this lesson covers Next.js server cache only.

**Terminology.**
- **read-your-writes** — the triggering user sees their change on the very next view, no stale flash.
- **stale-while-revalidate** — cached value served one more time while the next read recomputes in the background; first reader after invalidation sees stale once.
- **in-band redirect** — action mutates → `updateTag` → `redirect()` all within one request; the redirect's render reads freshly-expired data; the mechanism that makes `updateTag`'s guarantee possible and the reason it is Server-Action-only.
- **single writer** — exactly one code path owns writes to a given entity (from Ch063); justifies why the webhook, not an action, holds the `revalidateTag` call for billing state.
- **fan-out** — firing one invalidation call per affected cached read after a mutation; one mutation can touch multiple cached reads requiring multiple tag calls.

**Patterns and best practices.**
- Invalidation call selection: Server Action + user watching + tag → `updateTag(tag)`; Server Action + nobody watching → `revalidateTag(tag, 'max')`; route handler or background job → `revalidateTag(tag, 'max')`; client non-action interaction → `router.refresh()`.
- `updateTag` throws outside a Server Action — that throw is the API signaling read-your-writes is unavailable; fix by switching to `revalidateTag`.
- `router.refresh()` re-runs the route render but does **not** invalidate cached entries with valid TTLs; it is complementary to, not a substitute for, tag invalidation.
- Canonical Server Action sequence: `parse → authorize → mutate (transaction commits) → updateTag calls → redirect`; invalidation never inside the transaction, redirect never before invalidation.
- Before writing the invalidation tail, list every cached read the mutation changes and fire the narrowest tag for each; missing a tag means that read silently stays stale until the next mutation on the same entity.
- Emit a structured log line per invalidation call (`{ event: 'invalidate', call, tag, source }`); a flatline on an active tag = write/read tag mismatch; a spike = hot mutation path.
- `revalidateTag` from a background job (Trigger.dev / cron) works cross-process — the framework routes invalidation through the deployment's shared cache backend; no extra wiring required.
- Post-purchase webhook/redirect race: success page polls via `router.refresh()` until the entitlement flips; the webhook's `revalidateTag` invalidates, `router.refresh()` re-renders to observe it — the two are complementary.

**Misc.**
- `revalidateTag(tag, 'max')` marks stale on next visit, not an eager refetch; the very next page visitor pays exactly one stale render.
- Narrow escape hatch `revalidateTag(tag, { expire: 0 })` hard-expires from a route handler; the senior default remains `'max'`.
- `updateTag` import: `next/cache`. `revalidateTag` import: `next/cache`. `router.refresh()`: `useRouter()` from `next/navigation` in a Client Component.
- Multi-recipient pattern: one action can expire tags scoped to different users (`orgTags.all(orgId)` for the admin's view + `userTags.all(memberUserId)` for the demoted member's next load); "who triggered it" ≠ "whose cached data changed."
- Expiring a member's cached data via `updateTag(userTags.all(memberUserId))` is independent of session/authorization revocation (session staleness window handled by the auth chapter).

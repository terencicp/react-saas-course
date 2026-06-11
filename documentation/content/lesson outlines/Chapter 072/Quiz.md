sources:
  72.1: Route classes and the tag scheme
  72.2: Picking the right invalidation call
questions:
  - source: 72.1
    question: |
      You're deciding whether to add `'use cache'` to a route. One candidate is the per-user invoices list with `?status=overdue` URL filters; another is the app chrome (nav, plan badge) that every user loads on every page. Which is the better caching candidate, and why?
    choices:
      - text: |
          The app chrome — it's a shared, stable value read by many users many times between writes, which is exactly the high read-to-write ratio that earns a cache.
        correct: true
      - text: |
          The filtered invoices list — it does the most database work per request, so caching it saves the most server time.
        correct: false
      - text: |
          Neither — authenticated SaaS surfaces should always stay dynamic regardless of read frequency.
        correct: false
    why: |
      The deciding question is "is this value shared and stable?", not "is this slow?". The chrome is read by everyone on every page and rarely changes — high read-to-write ratio. The filtered list fragments into a different payload per filter combination, so its hit rate drops near zero. Caching the heaviest read is the trap; shared-and-stable beats slow-but-personal.
  - source: 72.1
    question: |
      An invoice **detail** read and an invoice **list** read both live in the same org. At what tag granularity should each one tag itself?
    choices:
      - text: |
          Detail tags the record (`invoiceTags.record(orgId, id)`); list tags the org-scoped list (`invoiceTags.list(orgId)`) — each tags at the grain the read actually needs.
        correct: true
      - text: |
          Both tag every record they reference, so a single edited row invalidates the most precisely.
        correct: false
      - text: |
          Both tag only `orgTags.all(orgId)`, so any org change refreshes everything at once.
        correct: false
    why: |
      Tag at the granularity the read needs. The list cares about *any* invoice in the org changing, so an org-scoped list tag covers it — including brand-new rows that didn't exist when the entry was built. Tagging the list per-record has a hole exactly there: a freshly created invoice has no record tag yet, so the list silently goes stale.
  - source: 72.1
    question: |
      This cached function compiles, type-checks, and works in dev with one logged-in user. What goes wrong in production?

      ```ts
      export async function listInvoices() {
        'use cache';
        const { orgId } = await auth();
        cacheLife('max');
        cacheTag(invoiceTags.list(orgId));
        return tenantDb(orgId).select().from(invoices);
      }
      ```
    choices:
      - text: |
          The session read inside the cached body bakes the first org's data into one shared entry with no org in the key — every other org then reads org A's invoices. A cross-tenant data leak.
        correct: true
      - text: |
          `auth()` throws because request data can never be read anywhere inside a cached function's call stack.
        correct: false
      - text: |
          Nothing — `cacheTag(invoiceTags.list(orgId))` scopes the entry per org, so each org gets its own cache key.
        correct: false
    why: |
      A `'use cache'` function's identity is built from its arguments, not from request-scoped values read inside it. `orgId` came from `auth()` inside the body, so it isn't part of the cache key — the first org to compute the entry has its invoices served to everyone. The fix is to pass `orgId` in as an argument so it keys the entry. Tags are arguments, not ambient state.
  - source: 72.1
    question: |
      You're picking a `cacheLife` profile for a cached read. What are the three numbers behind a profile actually describing?
    choices:
      - text: |
          How long the user tolerates slightly-old data — a product question about freshness, not a server-performance knob.
        correct: true
      - text: |
          How much server CPU the recompute is allowed to consume before the cache gives up.
        correct: false
      - text: |
          How many concurrent readers can share one cached entry before it's recomputed.
        correct: false
    why: |
      The stale/revalidate/expire numbers all answer one question: "how fresh does this need to feel to the user?" That's a product decision. Membership tolerates `'hours'` because it changes rarely; feature flags want `'minutes'` because rollouts move fast. And `'seconds'` on a hot public page barely lifts the hit rate while paying constant revalidation churn.
  - source: 72.2
    question: |
      The single most common misconception in this topic: what does `router.refresh()` actually do to a cached read whose tag is still valid?
    choices:
      - text: |
          Nothing — it re-runs the route's server render, but a cached read with a valid tag serves the same value again. Only invalidating the tag expires the read.
        correct: true
      - text: |
          It expires every cached read on the current route, forcing all of them to refetch.
        correct: false
      - text: |
          It expires only the cached reads whose tags match the current URL path.
        correct: false
    why: |
      `router.refresh()` re-renders; it does not invalidate. The render is fresh but any cached-with-valid-TTL read inside it serves the same value. This is exactly why the plan-flip success page polls: it's the *webhook's* `revalidateTag` that expires the read, and `router.refresh()` only re-renders so the client gets a chance to observe the now-fresh value.
  - source: 72.2
    question: |
      The same mutation — a user's display-name change — can resolve to a different invalidation call depending on context. A Server Action where the user just edited their own name versus a webhook from an external identity provider pushing the change. Which calls, in that order?
    choices:
      - text: |
          `updateTag` for the action (read-your-writes, the user is watching the redirect), `revalidateTag` for the webhook (eventual, nobody's waiting).
        correct: true
      - text: |
          `updateTag` for both — the user's data changed in both cases, so read-your-writes applies either way.
        correct: false
      - text: |
          `revalidateTag` for both — display names are reference data, so stale-while-revalidate is always correct.
        correct: false
    why: |
      Axis one is "is a specific person watching this exact change land?" In the action the editor is sitting on the redirect — read-your-writes, `updateTag`. The webhook has no watcher, so eventual is correct — and `updateTag` would throw there anyway, because there's no in-band redirect to keep the read-your-writes promise. Name the trigger, name who's watching, pick the corner.
  - source: 72.2
    question: |
      Inside a Server Action that edits an invoice and its line items in a `db.transaction`, then redirects to the detail page, where does the `updateTag` invalidation belong?
    choices:
      - text: |
          After the transaction commits, before the redirect.
        correct: true
      - text: |
          Inside the transaction, right after the row updates, so the cache and the database change atomically.
        correct: false
      - text: |
          After the redirect — the redirect's fresh render is what triggers the cache to refresh.
        correct: false
    why: |
      Invalidation describes a committed fact, so it runs after the commit. Fire it inside the transaction and a rollback leaves the cache expired against a change that never happened. Fire it after the redirect — or trust the redirect to "refresh" — and the destination's cached read still has a valid tag and serves the old value. Invalidate, then redirect.
  - source: 72.2
    question: |
      A Trigger.dev nightly job rebuilds an org's analytics summary in a separate process from the web server, then needs to invalidate the dashboard's cached read. Which call, and does cross-process work?
    choices:
      - text: |
          `revalidateTag(orgTags.all(orgId), 'max')` — imported from `next/cache` and called directly; the framework routes it through the deployment's shared cache backend.
        correct: true
      - text: |
          `updateTag(orgTags.all(orgId))` — the freshest possible read is best for the morning's first dashboard view.
        correct: false
      - text: |
          Neither works from a background process; the job must POST to a Next.js route handler that does the invalidation.
        correct: false
    why: |
      Background jobs use `revalidateTag` — no user is waiting at 3am, so stale-while-revalidate is exactly right, and `updateTag` would throw outside a Server Action anyway. The job imports `revalidateTag` from `next/cache` and calls it directly; the framework routes the invalidation through the shared cache backend, so a tag expired by a background process is expired for web requests too.

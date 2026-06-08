sources:
  56.1: Standing up organizations and the active-org slot
  56.2: Making the missing org filter not compile with tenantDb
  56.3: The threshold where RLS earns its cost
  56.4: Wiring RLS on audit_logs with policies and SET LOCAL

questions:
  - source: 56.1
    question: |
      A founder reviews their consultancy's invoices in one browser tab while triaging Acme's in another — two tabs, two different active orgs, same person. This is the deciding reason `activeOrganizationId` lives on the `session` row rather than the `user` row. What breaks if you put it on `user` instead?
    choices:
      - text: |
          Both tabs share one slot, so switching org in one tab silently changes which company the other tab is operating inside.
        correct: true
      - text: |
          The active org would survive sign-out, so the next person to sign in on that machine inherits the previous user's company.
        correct: false
      - text: |
          Better Auth's `setActive` can only write to the `session` table, so the value on `user` would never update.
        correct: false
    why: |
      One person can hold several sessions at once — that's the multi-device session model from Unit 8 extended by one column. The active org is per-*device*, so it rides on the independent `session` row, not the shared `user` row. Putting it on `user` collapses every device onto one slot and makes a switch in one tab yank the rug out from under the others. (Sign-out clears the session either way, and `setActive` writing the session row is the *mechanism*, not the reason.)

  - source: 56.1
    question: |
      Your switch-org Server Action calls `auth.api.setActiveOrganization(...)` and returns. Switching to Acme works, but the dashboard keeps streaming the *previous* org's invoices until you happen to reload. What's missing?
    choices:
      - text: |
          `revalidatePath('/', 'layout')` after the switch — the cached layout and pages were computed under the old org and are now stale.
        correct: true
      - text: |
          A shorter cookie-cache `maxAge` — the decoded session is cached for a few minutes, so the new org isn't visible until that window lapses.
        correct: false
      - text: |
          A second `getSession` call after the switch to force the new `activeOrganizationId` to be re-read from the database.
        correct: false
    why: |
      Switching is two moves that always travel together: change the active org *and* invalidate the cache keyed to the old one. `setActive` already rewrites the cookie immediately, so the cookie-cache window is irrelevant here — the stale data comes from the route cache, which `revalidatePath('/', 'layout')` clears (with `router.refresh()` on the client completing the picture).

  - source: 56.2
    question: |
      The whole point of `tenantDb(orgId)` is summed up by one uncomfortable sentence. Which framing is the one the lesson insists on?
    choices:
      - text: |
          Forgetting the org filter stops being something you can express — the unscoped call shape no longer typechecks.
        correct: true
      - text: |
          If you forget the org filter, the helper notices the missing predicate and adds it back for you at runtime.
        correct: false
      - text: |
          The helper logs a warning whenever a tenant query runs without an org predicate, so review catches the leak before it ships.
        correct: false
    why: |
      A guard you have to remember to call is not a guard — it doesn't run if you don't call it. `tenantDb` doesn't "save you when you forget"; it removes the unscoped call shape from the surface entirely, so the missing filter is a type error, not a runtime rescue and not a review checklist item. Optional correctness is the bug.

  - source: 56.2
    question: |
      A genuine cross-org need arrives: a nightly job that rolls up revenue across every organization. A teammate proposes adding a `tenantDb({ allOrgs: true })` mode so the same helper covers it. Why does the lesson reject that and route the job through the raw `db` in a separate `scripts/` file instead?
    choices:
      - text: |
          A built-in bypass turns "reach for a different, scary client" into "pass a flag," and the guarantee erodes one innocent flag at a time; a separate client in a separate file keeps every cross-org read a visible, deliberate decision.
        correct: true
      - text: |
          `tenantDb` is typed to a single `orgId` string and can't be widened to accept a boolean flag without breaking the mapped-type registry.
        correct: false
      - text: |
          Cross-org reads are slower, and isolating them in `scripts/` keeps the request-path bundle from importing the heavier unscoped query builder.
        correct: false
    why: |
      The absence of an escape valve *inside* the helper is the feature. A flag normalizes skipping the scope and lets the guarantee rot quietly; "different client, different file" makes the raw-`db` import the loud, reviewable signal that you're in cross-org territory. The type system could be made to accept a flag — the objection is about discipline, not feasibility.

  - source: 56.3
    question: |
      Your `audit_logs` table now has an RLS policy. A teammate suggests dropping the `tenantDb` scoping for that table — "the database enforces isolation now, the app filter is redundant." Are they right?
    choices:
      - text: |
          No — on an RLS table the app still scopes with `tenantDb`; the two are independent layers, and removing one means a single bug (a policy typo, a forgotten `FORCE`) can leak.
        correct: false
      - text: |
          Yes — the policy runs on every query and every connection, so the application-layer filter genuinely adds nothing once RLS is on.
        correct: false
      - text: |
          No — and the reason is defense in depth: a bug in the app is caught by the policy, a bug in the policy is caught by the app, so a leak now has to defeat *both* layers at once.
        correct: true
    why: |
      RLS joins `tenantDb`, it doesn't replace it. The value is in the *independence*: the helper catches the 99% request-path case, the policy catches what the helper can't span (raw SQL, external writers), and each layer catches the other's bugs. Drop either and you're back to a single point of failure on data where one leak is unrecoverable.

  - source: 56.3
    question: |
      Three triggers can push a table past application-layer scoping into "this one earns RLS." Which of these is a real trigger from the lesson? Select all that apply.
    choices:
      - text: |
          The data is highest-stakes — one missed scope is a regulatory or legal incident, not just a bug (PHI, financial PII, subpoenable audit logs).
        correct: true
      - text: |
          The table is read or written by paths the request-path helper can't span — admin tools, batch jobs, external integrations holding DB credentials.
        correct: true
      - text: |
          The table is large enough that adding an org predicate to every query measurably slows reads.
        correct: false
      - text: |
          The app server could be compromised and made to set any org id it wants.
        correct: false
    why: |
      Any one of highest-stakes data, many-paths-the-helper-can't-span, or you're-not-the-only-writer is enough to flip the call. Row count is a performance concern, not an isolation trigger. And RLS defends against application *bugs*, not application *compromise* — a compromised server can `SET` any org id and read freely; that's a least-privilege / DB-role problem for a later chapter.

  - source: 56.4
    question: |
      The `withTenant` helper sets the tenant id with `tx.execute(sql\`select set_config('app.org_id', ${orgId}, true)\`)` inside an explicit transaction. Two choices here are load-bearing. Which reasoning is correct?
    choices:
      - text: |
          The `true` third argument makes it transaction-local (like `SET LOCAL`) so it clears on commit and can't leak to the next request on a pooled connection; `set_config` is used over raw `SET LOCAL` because it accepts `orgId` as a bind parameter.
        correct: true
      - text: |
          The `true` argument enables RLS on the connection, and `set_config` is used because raw `SET` can't run inside a transaction.
        correct: false
      - text: |
          The transaction exists to roll back the audit write if the policy rejects it, and `set_config` is interchangeable with `SET` — either works on a pooled connection.
        correct: false
    why: |
      `set_config(name, value, is_local)` with `is_local = true` is the function form of `SET LOCAL`: scoped to the transaction, auto-cleared on commit, so a pooled connection returns clean. It's preferred over raw `SET LOCAL` precisely because a runtime value like `orgId` must be a bound parameter, never string-concatenated. Plain `SET` (session-scoped) is the footgun — it persists across requests on the same connection and leaks one tenant into the next.

  - source: 56.4
    question: |
      `drizzle-kit generate` emits the RLS migration. Before shipping, you read the generated SQL — which the lesson calls a reflex, not a suggestion. What's the specific thing the codegen leaves out that you must add by hand?
    choices:
      - text: |
          `ALTER TABLE audit_logs FORCE ROW LEVEL SECURITY` — codegen emits `ENABLE` but not `FORCE`, so the table owner (and owner-run tests and migrations) silently bypasses the policy until a non-owner request hits it.
        correct: true
      - text: |
          The `WITH CHECK` predicate — codegen only emits `USING`, so inserts for the wrong org would slip through until you add the write filter manually.
        correct: false
      - text: |
          The `current_setting('app.org_id', true)` call — codegen hardcodes a literal org id that you must replace with the session-variable lookup.
        correct: false
    why: |
      `ENABLE ROW LEVEL SECURITY` turns the policy on but leaves the table *owner* bypassing it — and migrations, admin tooling, and naive tests all run as the owner. So an owner-run test passes for the wrong reason and the protection isn't real until a paying customer's non-owner request exercises it. `drizzle-kit` has no `force` option, so you add `FORCE` in a follow-up `--custom` migration and verify it in the generated SQL.

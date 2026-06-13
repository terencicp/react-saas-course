sources:
  57.1: Owner, admin, member
  57.2: The authedAction wrapper
  57.3: The authedRoute twin
  57.4: The five member-management flows
  57.5: The append-only audit log
  57.6: API keys for machine callers

questions:
  - source: 57.2
    question: |
      Of the three checks every privileged Server Action owes — valid session, sufficient role, parsed input — the lesson argues the **role check** is the dangerous one to leave inline in the action body. Why is *that* check the one most likely to ship missing?
    choices:
      - text: |
          Nothing downstream depends on it: drop it and the code still compiles, still runs, still looks right. The missing session is noticed because the action obviously needs a user, and the missing parse fails to type-check below it — but an unused role check leaves no trace.
        correct: true
      - text: |
          The role check is the slowest of the three, so developers delete it to speed the action up and forget to put it back.
        correct: false
      - text: |
          TypeScript can't represent roles, so the role check can only ever be a runtime string comparison the compiler ignores.
        correct: false
    why: |
      The session and parse checks are *self-revealing*: skip the session and you notice (the action plainly needs a user), skip the parse and the typed input below it won't compile. The role check is invisible when absent — nothing reads its result, so removing it produces no error, no warning, no failing test. That's exactly why `authedAction` lifts it to a required positional argument: the bug becomes "wrong number of arguments," which the compiler counts, instead of a body line a tired reviewer can miss.

  - source: 57.1
    question: |
      Two claims about *where a role lives* and *when it's safe to trust*. Select every statement that is **correct**.
    choices:
      - text: |
          The role belongs on the `member` row, keyed by `(orgId, userId)`, so the same person can be an owner in one org and a plain member in another.
        correct: true
      - text: |
          `requireOrgUser` should read the role fresh from the database each request, so a demotion takes effect within seconds rather than waiting for the session to refresh.
        correct: true
      - text: |
          Storing the role as `isAdmin: true` on the `user` record is fine, since it travels with the person everywhere they go.
        correct: false
      - text: |
          Once baked into the session cookie at sign-in, the role is safe to trust until the user signs out.
        correct: false
    why: |
      Both correct answers are the chapter's anti-traps. A role is per-*membership*, not per-person — a flag on `user` can't express "owner in Acme, member in Beta," so it lives on the `member` row keyed by `(orgId, userId)`. And a role can change mid-session: an owner can demote an admin at any moment. Trusting a role frozen in the cookie is *stale authority* — the demoted admin keeps their powers until the cookie refreshes. Reading it fresh per request via `getActiveMember` closes that hole.

  - source: 57.3
    question: |
      A `GET /api/invoices/:id` runs through `authedRoute`. The caller has a valid session and a sufficient role, but the id names an invoice that belongs to a **different org**, so the tenant-scoped read returns nothing. What should the handler send back?
    choices:
      - text: |
          `404 Not Found` — to this caller the row doesn't exist, which reveals nothing about whether it exists for someone else.
        correct: true
      - text: |
          `403 Forbidden` — the caller is authenticated but isn't allowed to see this particular row.
        correct: false
      - text: |
          `200 OK` with an empty body — the query didn't error, so the request technically succeeded.
        correct: false
    why: |
      Prefer 404 over 403 on cross-tenant access. A 403 confirms the row *is* there, just out of reach — it leaks the existence of another org's data. A 404 says "doesn't exist for you" and reveals nothing. The 200-with-empty-body answer is the nastiest trap: it tells the caller "this exists and is empty," which is wrong and quietly leaks the shape of your data — precisely where one tenant probes another's. A tenant-scoped read that finds nothing for a *named* entity is a 404.

  - source: 57.4
    question: |
      The member-management actions write the `member` row directly through Drizzle inside `withTenant`, instead of calling Better Auth's `auth.api.removeMember` / `updateMemberRole`. What's the reason for owning the write?
    choices:
      - text: |
          Better Auth's org methods run their `after` hooks *after* their internal transaction has committed, so the audit row would land in a different transaction than the membership change — breaking the "audit row exists iff the work landed" contract.
        correct: true
      - text: |
          `auth.api` calls are much slower than a direct Drizzle write, and member management is a latency-sensitive path.
        correct: false
      - text: |
          Better Auth refuses to write the `member` table when row-level security is enabled, so a direct Drizzle write is the only option.
        correct: false
    why: |
      The chapter's contract is that the mutation and its audit row commit together — the audit row exists if and only if the work landed. Better Auth's org methods write through the plugin's own adapter and (since 1.5) fire their `after` hooks once that internal transaction has already committed, so an audit write hooked there would be in a *separate* transaction — the exact partial state the contract forbids. Owning the write puts the `member` change and `logAudit(tx, …)` in one `withTenant` transaction. The trade — losing the plugin's built-in role and last-owner guards — is fine, because the app now owns the gate (`authedAction`) and the invariant (`isLastOwner`).

  - source: 57.5
    question: |
      A bug slips past review and a request handler, connected as the **app role**, actually fires `UPDATE audit_logs SET payload = …` at Postgres. Of the three append-only layers, which one stops the rows from changing *at that moment*?
    choices:
      - text: |
          The deny-update RLS policy — its `USING (false)` predicate matches no row, so the `UPDATE` touches zero rows.
        correct: true
      - text: |
          The `tx: Transaction` type on `logAudit`, which rejects the call before it runs.
        correct: false
      - text: |
          The absence of an `updated_at` column, which leaves the query no field to write to.
        correct: false
    why: |
      The query is already past the type system and past application discipline — it's a real `UPDATE` arriving at the database. Only the deny-update policy acts *at runtime*: its `USING` predicate is a literal `false`, so no row ever qualifies and the statement changes nothing. The missing `updated_at` column and the no-mutation-in-app-code rule are the other two layers, but both are *prevention* (they stop the query from being written in the first place); the policy is the backstop that catches the one that wasn't. "The database refuses; the application never asks."

  - source: 57.6
    question: |
      Your `api_keys` table stores each key's `prefix` and `keyHash`, and the create action returns the raw `prefix.secret` to the admin exactly once. A teammate pushes back: hash the secret with bcrypt — "the same slow hash we trust for passwords" — and keep the raw key encrypted so it can be shown again if someone loses it. What's the senior response?
    choices:
      - text: |
          Store only `sha256(secret)` and show the raw key once: a stolen `api_keys` table then yields nothing usable. A *fast* hash is right precisely because the secret is 32 bytes of CSPRNG entropy — unguessable at any hash speed — so bcrypt's deliberate slowness, which exists to protect low-entropy human passwords, buys nothing here and only taxes every verify.
        correct: true
      - text: |
          Use bcrypt — any credential stored in the database deserves the same slow hash a password gets, no matter how the credential was generated.
        correct: false
      - text: |
          Keep the raw key encrypted at rest so it can be re-displayed later; losing a key shouldn't force the user to mint a new one.
        correct: false
    why: |
      Two senior calls collide. The store: only the hash lands in the table and the raw key leaves server memory once — into the create response — so a stolen table reconstructs no working key (the same store-the-hash, show-once posture the next chapter reuses for invitation tokens). The hash *speed*: bcrypt and argon are deliberately slow to make *guessing* a low-entropy human password expensive; an API key is 32 bytes of CSPRNG randomness, already unguessable, so a fast SHA-256 is correct and a slow hash only adds latency to every request. And re-displaying a lost key would mean storing it reversibly — reintroducing exactly the plaintext-at-rest the hash exists to remove. The recovery story is *revoke and mint a new one*, never decrypt-and-show.

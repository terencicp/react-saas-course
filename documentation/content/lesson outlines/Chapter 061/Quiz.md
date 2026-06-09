sources:
  61.1: Two timestamps, three actions
  61.2: Making the missing filter impossible
  61.3: Version columns and the honest 409

questions:
  - source: 61.1
    question: |
      You're deciding the deletion strategy for four record types. Which ones should be *hard*-deleted? (Select all that apply.)
    choices:
      - text: |
          Expired password-reset tokens — transient artifacts no user or auditor ever re-references.
        correct: true
      - text: |
          A paid invoice — re-referenced by reports and casts a compliance shadow.
        correct: false
      - text: |
          Draft autosaves the user never named and never sees again.
        correct: true
      - text: |
          A customer's comment on a thread that other users have replied to.
        correct: false
    why: |
      The trigger is re-reference and consequences, not taste. Hard-delete the ephemera nobody ever points at again — reset tokens, unnamed draft autosaves. Soft-delete anything woven into the rest of the system or carrying a compliance shadow: invoices and comments both get pointed at again, so the row stays and gets stamped. "The more a record is woven in, the more it tilts toward soft delete."

  - source: 61.1
    question: |
      A user soft-deletes a project named "Acme," then tries to create a new project also named "Acme" in the same org. The database rejects it with a unique-constraint violation. What's the fix?
    choices:
      - text: |
          Make `(organizationId, slug)` a partial unique index with `WHERE deleted_at IS NULL`, so uniqueness is enforced only among live rows and the soft-deleted "Acme" becomes invisible to the constraint.
        correct: true
      - text: |
          Drop the unique constraint and enforce uniqueness in the Server Action by querying for an existing slug before insert.
        correct: false
      - text: |
          Hard-delete the old "Acme" row instead of soft-deleting it, so its slug is freed.
        correct: false
    why: |
      The soft-deleted row is still in the table, so a plain unique constraint still sees its slug and blocks reuse. A *partial* unique index scoped `WHERE deleted_at IS NULL` enforces uniqueness only among live rows — exactly where it belongs. Enforcing in application code reintroduces a race the database used to close; hard-deleting throws away the recovery and audit trail that soft delete exists to keep. Note the Drizzle gotcha: `.unique()` can't carry a `WHERE`, so this is `uniqueIndex().on(...).where(sql\`...\`)` with a raw `sql` predicate.

  - source: 61.2
    question: |
      The lifecycle helper's `active()` returns `db.select().from(invoices).where(...).$dynamic()` instead of awaiting a finished query. Why a chainable builder rather than a completed query?
    choices:
      - text: |
          So each call site can chain `.orderBy(...)`, `.limit(...)`, and pagination onto a pre-scoped query — without `$dynamic()`, Drizzle locks those clauses to one invocation and chaining onto a pre-filtered query is a compile-time error.
        correct: true
      - text: |
          A finished query would execute eagerly inside the helper, running the query before the caller adds a `where`, so the filters wouldn't apply.
        correct: false
      - text: |
          A builder lets the caller chain a second `.where()` to merge in extra conditions, which is how the org and lifecycle filters get combined.
        correct: false
    why: |
      Returning a builder lets every page add its own ordering and paging on top of the org+lifecycle filters the helper already baked in; `$dynamic()` is the load-bearing call that lifts Drizzle's one-shot restriction so that chaining compiles. A finished query wouldn't have run "before the where" — the filters are already in the helper. And the third option is the trap the lesson warns against: a second `.where()` does *not* merge cleanly, which is why extra conditions are passed *into* the method as an `extra` predicate that gets `and`-ed into the single `where`.

  - source: 61.2
    question: |
      You're reviewing a PR with a hand-written join from `invoices` to `invoice_lines`. The `where` reads `and(eq(invoices.organizationId, orgId), activeFilter(invoices))`. The single-table helper is used everywhere else, so a teammate says the join is fine. Is it?
    choices:
      - text: |
          No — a join touches two tables, and the filter only covers `invoices`. Live invoices come back stapled to soft-deleted line items; the fix is `activeFilter(invoiceLines)` in the same `and(...)`.
        correct: true
      - text: |
          Yes — once the driving table is filtered, the join inherits the lifecycle filter for every joined table through the `innerJoin` condition.
        correct: false
      - text: |
          No — joins should never be hand-written; this should be expressed as `scoped.active().withLines()` on the helper so the filter is automatic.
        correct: false
    why: |
      The lifecycle filter has to be applied to *each* joined table explicitly, reusing the shared `activeFilter` predicate — filtering only the driving table leaks soft-deleted children. The course deliberately does *not* bolt join-awareness onto the helper (every join shape would need its own method and the helper would sprawl); instead joins live in named functions in `db/queries/<entity>.ts` and apply the shared predicate to each table, reviewed once.

  - source: 61.3
    question: |
      Two users editing the same invoice in separate tabs is the realistic case. For ordinary web request/response editing, what's the senior default for stopping one from silently clobbering the other, and why?
    choices:
      - text: |
          Optimistic concurrency — no lock; the client sends back the version it read and the server checks it still matches at write time. Collisions are rare, so you pay nothing on the common path and handle the rare miss explicitly.
        correct: true
      - text: |
          Pessimistic locking — `SELECT ... FOR UPDATE` holds a row lock from read to save, guaranteeing no other writer can interfere while the form is open.
        correct: false
      - text: |
          A database `BEFORE UPDATE` trigger that serializes all writes to the row, so the second save always queues behind the first.
        correct: false
    why: |
      Optimistic is the SaaS default: web editing means waiting on a human to type, and a pessimistic lock held across that think-time blocks every other editor and lingers if the request dies. Optimistic takes no lock, bets (correctly, usually) that collisions are rare, and turns the rare collision into a recoverable 409. Pessimistic earns its weight only in narrow batch/ledger paths the course doesn't reach.

  - source: 61.3
    question: |
      An action's UPDATE includes `WHERE version = :clientVersion` but the developer forgets `version = version + 1` in the `SET`. What breaks?
    choices:
      - text: |
          The counter never moves, so every save's precondition matches and no conflict is ever detected — you're back to silent last-write-wins despite having the check in place.
        correct: true
      - text: |
          Every save fails with a 409, because the version in the row never matches the incremented value the client expects back.
        correct: false
      - text: |
          Nothing — the precondition in the `WHERE` is what detects conflicts; the increment in the `SET` is only there to keep the displayed version current.
        correct: false
    why: |
      The precondition and the increment are a pair: the `WHERE` detects a moved version, the `SET version = version + 1` is what *moves* it for the next writer. Forget the bump and the version stays put, so every precondition keeps matching and no race is ever caught — the silent data loss the whole mechanism exists to stop. Doing the `+ 1` in SQL also keeps the increment atomic, so no second writer slips between read and write.

  - source: 61.3
    question: |
      You've learned the version-column pattern and are tempted to add it everywhere. Which of these writes genuinely needs a version precondition?
    choices:
      - text: |
          A multi-field invoice edit form: the user loads the row, edits over time, then saves the whole form back.
        correct: true
      - text: |
          A per-user "show archived" toggle that only its owner ever flips.
        correct: false
      - text: |
          A view-counter bumped with `SET count = count + 1` directly in SQL.
        correct: false
    why: |
      The single question is "is there a stale client read in the write loop?" The invoice form is a read-modify-write through a human on a shared record — exactly where a second writer can clobber a fresh value, so it needs the version column. The single-user toggle has no second writer to lose to (last-write-wins is the *correct* semantics). The SQL-side increment reads and writes atomically in the database with no client holding a stale value. Over-applying the pattern is friction on every save for zero safety.

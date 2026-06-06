sources:
  43.1: The "use server" seam
  43.2: Parse on entry, every time
  43.3: Result, or throw
  43.4: Thin actions, pure /lib
  43.5: After the write

questions:
  - source: 43.1
    question: |
      A delete button in a Client Component already has the loaded invoice in hand and calls `await archiveInvoice(invoice)`, passing the whole Drizzle row. The build is fine; the call fails at runtime. Why, and what's the fix?
    choices:
      - text: |
          A Server Action argument is **serialized** across the wire, and a Drizzle row carries a custom prototype that won't serialize — so the call throws. Pass the plain `invoice.id` and let the action re-read what it needs.
        correct: true
      - text: |
          The row is too large to fit in the POST body, so the framework rejects it. Trim it to the columns you need and the same row object will serialize.
        correct: false
      - text: |
          Passing the full row is fine to send, but the action can't trust it — the failure is the action re-reading a stale row. Pass the row *and* a version field so the action can detect staleness.
        correct: false
    why: |
      Every argument to a Server Action crosses the wire as the RSC payload, which serializes through the structured-clone-plus-React superset. A Drizzle row *looks* plain in the debugger but carries a custom prototype, and that's exactly what serialization rejects — this is the single most common bug at this seam. The fix is to pass the primitive `id` and re-read inside the action; the rare full-row case uses `JSON.parse(JSON.stringify(row))` to strip the prototype, but that's an escape hatch, not a default.

  - source: 43.2
    question: |
      You're sorting validation rules for `createInvoice` into "lives in the Zod schema" versus "lives in the action body, after the parse." One rule keeps feeling like schema work but isn't: "this invoice number isn't already taken." Where does it go, and what's the deciding question?
    choices:
      - text: |
          The action body. The deciding question is whether answering the rule needs IO — a database read, an external call, request state. "Already taken" needs a database lookup, so it can't live in Zod; a schema that needs a live database can't be unit-tested or run at the edge.
        correct: true
      - text: |
          The schema, via an async `.refine` that runs the database lookup during parse — keeping every check in one place is the whole point of deriving the schema from the table.
        correct: false
      - text: |
          The schema, because "uniqueness" is a shape rule like `max` or `email`; only rules that compare *two* submitted fields belong in the action body.
        correct: false
    why: |
      Zod proves the *shape*; the action body proves the *business rules*. The one question that settles every case is "does answering this require IO?" — a database row, a service, request state. Uniqueness needs a `SELECT`, so it lives after the parse, in the body. Stuffing a DB-querying `.refine` into the schema welds your validation layer to your data layer: the schema can no longer parse without a live connection, so you lose isolated tests and edge-friendliness for no benefit.

  - source: 43.3
    question: |
      A user fills out a long invoice form and submits; the slug collides with an existing row and Postgres raises a unique violation. If the action `throw`s on that instead of returning a `Result`, what does the user experience — and what's the rule?
    choices:
      - text: |
          The throw sails past the form to the nearest `error.tsx`, so the user lands on a full-page error screen with everything they typed gone — to fix a one-word collision. The rule: return the expected, throw the unexpected. A fixable conflict is expected, so it returns a `Result`.
        correct: true
      - text: |
          The form's `useActionState` catches the throw and renders its message inline, so the experience is fine either way — `throw` and `return` are interchangeable for failures the form shows.
        correct: false
      - text: |
          Next.js automatically converts a thrown unique violation into a 409 the form renders as a banner, so throwing is actually the cleaner path for conflicts.
        correct: false
    why: |
      A throw inside an action propagates to the route's nearest `error.tsx` and the user gets the global error page — their form state is wiped, and a recoverable collision becomes a start-over. The house rule is "return the expected, throw the unexpected," and the one-question shortcut is "can the user fix this from where they are?" A conflict, a validation failure, a plan limit — yes, so they return a `Result`. Throw is reserved for the framework edge: `notFound()`, `redirect()`, and genuine programmer/infrastructure errors with no in-form recovery.

  - source: 43.4
    question: |
      After writing the same parse-authorize-return preamble for the third action, a teammate proposes a generic `safeAction(schema, fn)` wrapper to remove the boilerplate. The course says don't. Why is `safeAction` rejected while the `authedAction` auth wrapper is allowed?
    choices:
      - text: |
          `safeAction` bundles several unrelated concerns and hides the action's seams behind a custom DSL the framework can't statically analyze. The auth wrapper clears the bar a carve-out must clear: a single concern, identical at every call site, where a *missed* check is a security incident, not a style nit.
        correct: true
      - text: |
          `safeAction` is rejected only because it's slower at runtime; `authedAction` is allowed because auth checks are cached, so the wrapper overhead disappears.
        correct: false
      - text: |
          They're judged the same — both are wrappers, so both are banned. The auth check in the later chapter is written inline in every action body, not as a wrapper.
        correct: false
    why: |
      Principle #5 says use the framework's convention, don't build a parallel mechanism. A generic `safeAction` blurs what the compiler sees (it sits between `export` and `'use server'`), hides the five seams from a reviewer, and is a mini-DSL a new hire must learn. An exception has to clear a three-part bar: one concern, byte-for-byte identical everywhere, and getting it wrong is an incident. Authorization clears it (and the billing SDK interface is the only other carve-out); parse, validate, and revalidate stay inline.

  - source: 43.5
    question: |
      To stop a double-clicked "Create invoice" from writing two rows, you add an idempotency key. A colleague suggests deriving the key on the server by hashing the submitted fields, so you don't need a form change. Why is that wrong?
    choices:
      - text: |
          A content hash treats two *legitimately distinct* submissions that happen to be identical — two real invoices, same customer, amount, and day — as duplicates and silently drops the second. The key identifies *intent*, not *content*, so it must be generated once on the form (a `crypto.randomUUID()` in a hidden input) and ride the same submission on retry.
        correct: true
      - text: |
          A server-side hash is fine for correctness but too slow to compute per request; the form-generated UUID is preferred purely because it avoids the hashing cost.
        correct: false
      - text: |
          Hashing the inputs is actually the recommended approach — it guarantees that any two identical payloads collapse to one row, which is exactly what idempotency means.
        correct: false
    why: |
      An idempotency key marks one *intent*, so a real second invoice that happens to match the first must still get through. A server-derived hash of the inputs can't tell a retry apart from a genuine duplicate submission and swallows the legitimate one. Generating the key when the form renders means a retry of the *same* submission carries the *same* key, while a fresh submission carries a new one. Today you write just the form-side seam — one hidden input — and the dedup ledger lands in a later chapter.

sources:
  46.1: When to reach past Server Actions
  46.2: Wire contracts as Zod schemas
  46.3: Methods, status codes, and idempotency
  46.4: 'List endpoints: filter, sort, search, paginate'

questions:
  - source: 46.1
    question: |
      You are deciding which of these endpoints stay Server Actions and which earn a `route.ts`. Select every case that should be a **route handler**.
    choices:
      - text: |
          A Stripe webhook POSTs a signed event to a fixed URL on your app.
        correct: true
      - text: |
          The dashboard's "edit invoice" form submits its changes.
        correct: false
      - text: |
          An in-app page needs to read a list of invoices to render a table.
        correct: false
      - text: |
          The iOS app fetches the signed-in user's invoice list over HTTP.
        correct: true
    why: |
      The deciding axis is *who calls it plus whether the protocol is the contract* — not the verb or the entity. A webhook provider and a mobile app are non-React callers that can't `import` an action, so both need a handler. The edit form is a React component on this same app — the action is shorter, typed, and revalidates for free. The in-app table is the trap: a Server Component reads the database directly, in-process, with no HTTP round-trip — writing a GET handler for data your own page could just read is the wrong reach.

  - source: 46.2
    question: |
      Your handler guards the *request* body with `safeParse` (branch, never throw). For the *response*, the lesson says to pass your data through the schema with `parse` — which throws:
      ```ts
      return NextResponse.json(invoiceResponseSchema.parse(data));
      ```
      Why is the throwing `parse` the right call on the way out?
    choices:
      - text: |
          Outbound data is something your own code built, so a shape mismatch is a server bug — it should throw, surface as a 500, and the schema acts as an allowlist that keeps stray DB columns off the wire.
        correct: true
      - text: |
          `parse` is faster than `safeParse`, and response serialization is the hot path where the extra speed matters most.
        correct: false
      - text: |
          The response is trusted, so validation is purely documentation — `parse` versus `safeParse` makes no functional difference here.
        correct: false
    why: |
      It's the same rule read in the other direction. Inbound data is untrusted and a bad shape is the *client's* mistake, so you answer with a deliberate status — `safeParse`. Outbound data is something your handler constructed; if it doesn't match the schema that's *your* bug, and a programmer error should throw, get caught at the framework boundary, and become a 500. The throw isn't decoration — the schema is the allowlist, so a stray `internalNotes` or `costBasis` column throws in review instead of leaking to a client in production.

  - source: 46.3
    question: |
      A teammate's PR adds `POST /api/invoices/[id]/status` whose body is `{ "status": "cancelled" }` — it just sets the `status` field to the given value. What should the reviewer say?
    choices:
      - text: |
          Reject it — setting a field to a value is a state-diff, so it's a `PATCH` on the invoice resource. `POST` carrying `{ status }` is a `PATCH` wearing a `POST` costume.
        correct: true
      - text: |
          Approve it — any operation that changes the database is a side effect, and side effects are exactly what `POST` is for.
        correct: false
      - text: |
          Reject it — a status change has consequences (it might email the customer), so it must be a `PUT` with the invoice's full body.
        correct: false
    why: |
      The discriminator is state-diff versus non-idempotent action. "Make this field have this value" is a state-diff, which is `PATCH` (or `PUT` for a full replace) — and since it targets the whole resource, no `/status` sub-path is needed. A `POST` action endpoint like `POST /invoices/[id]/cancel` is correct *when cancel has real side effects* (emails, webhooks), but that's a separate operation, not the field-setting one here. "Changes the database" is not the test — the method declares intent, and a plain field-set declares `PATCH`.

  - source: 46.4
    question: |
      A list handler reads `?status=sent&status=overdue` and builds the object it hands to Zod like this:
      ```ts
      const raw = Object.fromEntries(searchParams);
      return listInvoicesQuerySchema.safeParse(raw);
      ```
      What goes wrong, and what's the fix?
    choices:
      - text: |
          `Object.fromEntries` keeps only the last value of a repeated key, so `sent` is silently dropped. Read multi-valued keys with `searchParams.getAll('status')` and let that overwrite the collapsed value.
        correct: true
      - text: |
          `Object.fromEntries` throws on a repeated key, returning a 500. Wrap the call in a try/catch and fall back to the first value.
        correct: false
      - text: |
          Nothing — `Object.fromEntries` returns `status` as an array of both values, so the schema sees `['sent', 'overdue']` correctly.
        correct: false
    why: |
      This is the canonical query-parsing bug. `Object.fromEntries` is right for single-valued keys (`sort`, `q`, `limit`, `cursor`), but for a repeated key it keeps only the *last* value — `{ status: 'overdue' }` — and `sent` vanishes with no error. `getAll('status')` returns the full array, and overwriting the collapsed value with it is the one line that honours the multi-value filter. It never throws, and it never auto-arrays for you.

sources:
  38.1: "CRUD and the four chain methods"
  38.2: "Joining tables"
  38.3: "Nested reads with the relational API"
  38.4: "Aggregations and grouping"
  38.5: "Upserts and RETURNING"
  38.6: "Cursor pagination"
  38.7: "Subqueries and CTEs"
  38.8: "Full-text search in Postgres"
  38.9: "Reading and writing JSONB columns"
  38.10: "The raw SQL escape hatch"

questions:
  - source: 38.5
    question: |
      A webhook handler must add a delivery row, then run the downstream work (provision the subscription) only the *first* time it sees an event — and do nothing on a redelivery. Which write shape lets the handler tell a first delivery from a repeat?
    choices:
      - text: |
          `onConflictDoNothing({ target: deliveryId }).returning()`, then branch on whether the returned array is empty.
        correct: true
      - text: |
          A plain `insert(...).returning()`, catching the unique-violation error to detect the repeat.
        correct: false
      - text: |
          `onConflictDoUpdate(...)` setting a `seenCount` from `excluded`, then reading it back with a follow-up select.
        correct: false
    why: |
      `onConflictDoNothing` makes the redelivery a harmless no-op, and `.returning()` is what makes the skip *observable*: a real insert hands back `[row]`, a skipped one hands back `[]`. So an empty result is the signal to skip the downstream work. Catching the thrown error is the read-then-write instinct you adopted upsert to avoid, and `onConflictDoUpdate` would do real work on every redelivery — the opposite of idempotent.

  - source: 38.2
    question: |
      You ship "every invoice with the name of its assignee" as an `innerJoin` from `invoices` to `users` on `assignedToId`. QA reports the list is missing rows — specifically the brand-new, unassigned invoices. What happened, and what's the fix?
    choices:
      - text: |
          `assignedToId` is nullable, and `innerJoin` drops any left row whose predicate finds no match — so unassigned invoices vanish. Switch to `leftJoin` and the assignee comes back `User | null`.
        correct: true
      - text: |
          The `on` predicate is wrong; with the correct predicate an `innerJoin` keeps the unassigned invoices too.
        correct: false
      - text: |
          `innerJoin` is fine — the unassigned rows are missing because they need a separate `where assignedToId is null` branch unioned in.
        correct: false
    why: |
      An inner join keeps only matched pairs, so an invoice whose `assignedToId` is null (no partner in `users`) is silently dropped — and those are exactly the rows a user most needs to act on. `leftJoin` keeps every left row and types the right side as `User | null`, surfacing the "did this match?" question instead of hiding it. No predicate fix or extra union recovers what inner-join semantics deliberately discard.

  - source: 38.4
    question: |
      A dashboard groups `organizations` left-joined to `invoices` to show each org's invoice count. A brand-new org with zero invoices shows a count of **1**, not 0. Which projection caused it, and what's the correct one?
    choices:
      - text: |
          It used `count()`. The left join pads the empty org with one all-null row, and `count()` counts rows — so it counts the padding. Use `count(invoices.id)`, which counts non-null ids and returns 0.
        correct: true
      - text: |
          It used `count(invoices.id)`; that counts the join key including its null, giving 1. Switch to `count()` to count real rows only.
        correct: false
      - text: |
          The join should be an `innerJoin` — the extra row is a duplicate the left join introduced, and inner join removes it.
        correct: false
    why: |
      A left join keeps the org with no invoices by padding it with a single all-null row. `count()` counts rows regardless of contents, so it scores that padding as 1; `count(invoices.id)` counts only non-null values of a column from the joined side, so the padding scores 0 — the right answer. Switching to `innerJoin` would "fix" the count by dropping the zero-invoice org entirely, which is precisely the org a dashboard must still show.

  - source: 38.3
    question: |
      Two relational reads share the same predicate but place it differently:

      ```ts
      // A
      db.query.invoices.findMany({
        with: { lineItems: { where: { amountDue: { gt: '100' } } } },
      });
      // B
      db.query.invoices.findMany({
        where: { lineItems: { amountDue: { gt: '100' } } },
      });
      ```

      How do their results differ?
    choices:
      - text: |
          A returns every invoice, each with its `lineItems` array trimmed to the over-$100 items (possibly `[]`); B returns only invoices that *have* an over-$100 line item.
        correct: true
      - text: |
          They're equivalent — both drop invoices with no over-$100 line item; the position is just style.
        correct: false
      - text: |
          A returns only invoices with an over-$100 line item; B returns every invoice but trims the `lineItems` array.
        correct: false
    why: |
      A `where` *inside* `with` filters the child array and never drops the parent — an invoice with no matching line item still returns, just with `lineItems: []`. A relation *as a key* in the top-level `where` is an existence filter, so only parents that have a matching child survive. Same predicate, opposite jobs: inside `with` shapes the children, in the parent `where` decides whether the parent exists.

  - source: 38.6
    question: |
      You're building cursor pagination for a multi-tenant invoice list. A teammate proposes packing `organizationId` into the encoded cursor token alongside `createdAt` and `id`, "so the next page stays scoped to the right org." Why is that the wrong call?
    choices:
      - text: |
          The cursor is client-controlled input; baking the tenant id in lets a user decode it, swap in another org's id, and read across tenants. The org scope must come from server auth context, and the cursor carries only `{ createdAt, id }`.
        correct: true
      - text: |
          It bloats the token past the base64url length limit, so deep pages would fail to encode.
        correct: false
      - text: |
          It breaks the tiebreaker — a cursor can hold at most two columns, so adding `organizationId` drops `id` and reintroduces row-skipping.
        correct: false
      - text: |
          Nothing is wrong with it — carrying the org in the cursor saves re-deriving it from auth on every page.
        correct: false
    why: |
      A cursor is a token the client hands back, so anything inside it is attacker-controllable. Put `organizationId` there and a user can decode, edit, and re-send it to page through another tenant's data — a horizontal access-control leak handed out by design. Tenant scope rides on the authenticated request; the cursor carries only the sort key and tiebreaker. There's no length limit or two-column cap at play — the issue is purely trust.

  - source: 38.8
    question: |
      A search box runs `to_tsquery('english', term)` with `term` straight from the input. It works in your single-word tests, then throws the first time a user types `overdue payment`. What's the correct fix?
    choices:
      - text: |
          Use `websearch_to_tsquery` — it parses raw Google-style input (bare words AND-ed, quoted phrases, `-exclude`) without throwing, and is the function you point at a search box.
        correct: true
      - text: |
          Keep `to_tsquery` but pre-replace spaces with `&` before passing the term in.
        correct: false
      - text: |
          Switch the match to `ILIKE '%term%'` so multi-word input stops being parsed as query syntax.
        correct: false
    why: |
      `to_tsquery` expects operator syntax (`&`, `|`, `!`), so a bare space between words is a syntax error — it's for queries you build yourself from trusted parts. `websearch_to_tsquery` parses human-typed input safely and never throws on arbitrary text, which is why it's the only function to point at a raw search box. Hand-replacing spaces with `&` is a brittle reimplementation of what `websearch_to_tsquery` already does, and `ILIKE` throws away the word-aware matching that motivated full-text search in the first place.

  - source: 38.9
    question: |
      This filter is meant to return JSONB payloads with an amount above 100, but it also returns a payload whose amount is `90`:

      ```ts
      where(sql`${deliveries.payload}->>'amount' > '100'`)
      ```

      Why, and what's the fix?
    choices:
      - text: |
          `->>` returns text, so `> '100'` is a lexical string comparison and `'90'` sorts after `'100'`. Cast first: `(${deliveries.payload}->>'amount')::numeric > 100`.
        correct: true
      - text: |
          The `'100'` is bound as text but the column is numeric, so Drizzle widens both to text; pass the bound value as a number — `> 100` — to fix it.
        correct: false
      - text: |
          `->>` returns JSON, which compares by key order; switch to `->` so the value is extracted before comparing.
        correct: false
    why: |
      `->>` always returns text, so the comparison runs character by character — `'9'` beats `'1'` at the first character, and the `90` row wrongly passes. The fix is to cast the extracted text to a real numeric *in SQL* before comparing. It's not about how the literal is bound, and `->` returns a still-JSON value (the opposite of what you want for a leaf comparison), so neither alternative addresses the lexical-comparison trap.

  - source: 38.10
    question: |
      A reviewer sees `orderBy(sql.identifier(sortParam))`, where `sortParam` comes from the request query string, on a fully patched Drizzle. Is this safe?
    choices:
      - text: |
          No — `sql.identifier`'s quoting is a seatbelt, not the control. Request input must be validated against a fixed allow-list of column names *before* it reaches the identifier helper.
        correct: true
      - text: |
          Yes — on a patched Drizzle `sql.identifier` quotes and escapes the name correctly, so passing request input straight through is fine.
        correct: false
      - text: |
          Yes — `orderBy` only sorts, so even a malicious identifier can't read or modify data; the risk applies only to `where` and mutations.
        correct: false
    why: |
      Patched quoting reduces the blast radius if you slip, but the actual defense is the allow-list: you confirm the requested name is one of a fixed set you wrote, and only then build the identifier — so request input never reaches the helper directly. The historical CVE through `sql.identifier` was exactly the naive dynamic-sort pattern, and "it only sorts" is no comfort, since an injected identifier can carry a subquery that exfiltrates data.

  - source: 38.1
    question: |
      Two reads look almost identical:

      ```ts
      await db.select().from(invoices).limit(0);  // A
      await db.select().from(invoices);            // B
      ```

      What comes back?
    choices:
      - text: |
          A returns an empty array; B returns every row in the table.
        correct: true
      - text: |
          Both return every row — `limit(0)` means "no limit," the same as omitting it.
        correct: false
      - text: |
          A throws (zero is an invalid limit); B returns every row.
        correct: false
    why: |
      `limit(0)` is a real cap of zero, so it returns an empty array — it does *not* mean "unlimited." Omitting `limit` entirely is what returns everything. Reaching for `limit(0)` thinking it means "no limit" is the trap; the two reads behave oppositely.

  - source: 38.7
    question: |
      You want the top three tags per org, so you write a single grouped query and add `where(rank <= 3)` referencing a `row_number()` you computed in the same `select`. Postgres rejects it. Why does this report need two layers (a CTE feeding the final query)?
    choices:
      - text: |
          SQL evaluates window functions *after* `where`, so the rank doesn't exist yet when `where` runs. Compute the rank in one layer, then filter it in the next.
        correct: true
      - text: |
          `row_number()` can't appear in the same `select` as a `groupBy`, so the count and the rank must live in separate queries.
        correct: false
      - text: |
          Window functions can't be aliased, so the outer query has no name to filter on — the CTE exists only to give the rank a name.
        correct: false
    why: |
      A window function is evaluated after the `where` clause, so a `where` can never reference `row_number()` directly — at that point the rank column doesn't exist. The structural fix is to materialize the rank in a CTE, then filter on it in the next layer where it's a real column. That ordering is precisely why "filter on a ranking" always pairs a CTE with a window function.

# Cursor pagination

- Title (h1): `Cursor pagination`
- Sidebar label: `Cursor pagination`

---

## Lesson framing

The chapter's list-iteration lesson. L1 taught `limit`/`offset` as "the simple default with a ceiling" and drilled the **tiebreaker reflex** (pair any non-unique sort column with the PK for deterministic order). This lesson cashes both debts in: it shows *where* offset's ceiling is, then builds cursor pagination — which is the tiebreaker reflex from L1 turned into a load-bearing mechanism rather than a nicety. By the end the student can choose between offset and cursor on real criteria, write a forward cursor query (SQL builder *and* RQB), encode/decode an opaque cursor token safely, detect "has next page" with the fetch-n+1 trick, and name the composite index the whole thing rests on.

**Senior question driving the lesson** (state implicitly in the intro, do not label it): *When a list could grow past a few hundred rows, or shows data that's changing while the user pages through it, how do I iterate pages without getting slow at depth and without showing duplicated or skipped rows?*

**The spine — one sentence to carry the whole lesson:** **a cursor remembers the last row you saw and asks for the rows after it; an offset counts from the front and re-counts every time.** Every property — performance at depth, stability under inserts, the mandatory tiebreaker, the index — falls out of that one contrast. Lead with it and return to it.

**The mental models the student should leave with:**
- **Offset re-scans; cursor seeks.** `OFFSET 10000` makes Postgres walk and discard 10,000 rows before returning the next page — cost grows with depth. A cursor's `WHERE (sort, id) > (lastSort, lastId)` jumps straight to the boundary via an index — cost is flat regardless of page depth. This is the *performance* half.
- **Offset is positional; cursor is anchored.** Offset says "rows 41–60" — if a row is inserted at the top between page loads, every later page shifts by one and the user sees a row twice or misses one. A cursor says "rows after *this specific row*" — inserts and deletes above the cursor don't move the boundary. This is the *correctness/stability* half, and it's the one that actually bites in production (the slowness is annoying; the skipped rows are a bug report).
- **The tiebreaker is not optional — it's the load-bearing part.** Sorting by a non-unique key (`createdAt`) alone means rows that tie on that key have no defined order, so the cursor boundary is ambiguous and rows get skipped or repeated at every page seam. The compound cursor compares `(sortKey, id)` as a pair; the `orderBy` sorts by the same pair. This is the exact reflex L1 seeded — here it stops being good hygiene and becomes the thing that makes the feature correct.
- **A cursor is an opaque token, and it's untrusted input.** The server encodes `{ sortKey, id }` to a `base64url` string the client treats as a black box (so clients can't build their own and depend on the encoding), and decodes + *validates* it on the way back in (a malformed cursor is a 400, not a crash). Same defense posture as any other request parameter.
- **Cursor pagination is only fast with the right index.** The `(sortKey, tiebreaker)` columns need a composite index in the cursor's sort direction, or the seek degrades to a sequential scan and the whole win evaporates. The mechanic lives in Ch 039 L1; this lesson *names the dependency and shows the index shape* so the student knows correctness here and speed there are a pair.

**Why this matters / pain it relieves:** "list view that paginates" is in every SaaS app, and the naive `?page=3` offset version is a latent double-bug — it gets slow exactly when the table gets big enough to matter, and it shows wrong rows exactly when the data is live (an inbox, a feed, an activity log). Cursor pagination is the senior default for any growing or live list; offset is the deliberate carve-out for small stable admin tables. Getting that decision and the cursor mechanics into reflex is what makes list endpoints correct and fast by default.

**Where beginners go wrong (address these head-on):**
- **Omitting the tiebreaker.** Sorting `createdAt` only and building the cursor from `createdAt` only. Works in dev (no ties), silently skips/dupes rows in production where timestamps collide. The #1 watch-out — make it the section's center of gravity.
- **Sorting by a mutable column.** Cursoring on `updatedAt` (or any column a row can change) means a row can hop pages mid-pagination — touched while you page, it jumps the boundary and shows up twice or vanishes. Cursor lists sort by *stable* keys (creation time, an immutable sequence).
- **Trusting the cursor.** Decoding the base64 blob and feeding it to the query without validating its shape — a hand-crafted or stale cursor then throws deep in the query layer. Validate the decoded object (Zod, named — Ch 042 owns it) → 400 on bad input.
- **Putting `organizationId` in the cursor.** The tenant scope belongs in the request (from auth context), not in a client-held token a user could tamper with. A tenant id inside an opaque-but-decodable cursor is a horizontal-access-control leak waiting to happen. Call this out explicitly.
- **Forgetting the index.** Shipping the cursor query with no composite index → sequential scan → *slower* than offset would have been. The win is conditional on the index; verify with `EXPLAIN ANALYZE` (Ch 039 L3, named).
- **Reusing a cursor across a sort change.** If the order key changes (a column added/removed from the sort), old cursors decode to the wrong shape and break silently. Mentioned as a watch-out; the fix is versioning the encoding (one clause, not drilled).

**Teaching approach (whole-lesson):**
- **Lead with offset's two failure modes, shown, not asserted.** Open by recapping offset from L1 (one paragraph, it's known), then make its two ceilings *visceral* before introducing the cursor: a **`DiagramSequence`** for the *stability* failure (a row inserted at the top shifts the page window so page 2 repeats a row), and a tight **`Figure`** (HTML+CSS) for the *performance* failure (offset scans-and-discards the skipped rows; cursor seeks past them). This honors "decisions before syntax / trigger before tool": the student should feel both ceilings before meeting the cursor.
- **Build the cursor query incrementally to manage cognitive load.** Stage it: (1) the naive single-key cursor (`gt(createdAt, last)`) and immediately break it with a tie; (2) add the tiebreaker → the compound `or(gt, and(eq, gt))` predicate; (3) pair it with the matching `orderBy`. Use `AnnotatedCode` to color the three logical pieces of the compound `where` (the "strictly after on sort key" branch, the "tie on sort key, after on id" branch, the `or` that unions them) — this is the one block dense enough to step, and the place students' eyes glaze over.
- **Encoding is a separate, smaller idea — teach it after the query works.** Once the query is correct given a `{ createdAt, id }` cursor object, show how that object becomes a URL token: `base64url(JSON.stringify(...))` out, validate-then-decode in. Keep it crisp; it's plumbing around the real idea (the predicate).
- **Fetch-n+1 for "has next page," not a count query.** Show `limit(pageSize + 1)`, slice to `pageSize`, the presence of the extra row *is* the "next page exists" signal and its key is the next cursor. Frame as cleaner than a second `count()` round-trip. A tiny `Figure` (a row of `pageSize+1` cells, the last one tinted as "the probe") makes it click.
- **Show both API surfaces — the model is identical.** Write the cursor once with the SQL builder (`db.select`), then show the same shape through RQB (`db.query.invoices.findMany`) using the **v2 object syntax from L3** (`orderBy: [desc(...), desc(...)]`, and the `where` callback/`RAW` escape for the `or(gt, and(eq, gt))` predicate). A `CodeVariants` (tab "SQL builder" / tab "Relational query builder") side-by-sides them — pedagogical point: cursor pagination is a *query shape*, not an API feature, so it rides on whichever read API the feature already uses.
- **Index named, shown, deferred.** Show the composite index DDL shape (`index(...).on(org, desc(createdAt), desc(id))`) inline so the columns-and-direction correspondence is concrete, but state plainly that *declaring and tuning* indexes is Ch 039 L1 — this lesson owns "correct," that lesson owns "fast." One `Aside`.
- **Total counts and bidirectional cursors — named, scoped out.** One short section: cursor pagination drops the "page 3 of 12" affordance (most 2026 SaaS lists show "200+" or skip the count); previous-page is usually a re-anchor, true bidirectional cursors rarely earn their cost. Keep it to recognition.
- **Code components.** `Code` for each shape as introduced; `AnnotatedCode` for the compound `where` (the dense block); `CodeVariants` for **offset (positional) vs. cursor (anchored)** conceptually and again for **SQL builder vs. RQB**; `CodeTooltips` on the cursor-decode line to define `base64url` / the `{ sortKey, id }` shape inline; `DiagramSequence` for the offset-shift failure.
- **Assessment.** One `DrizzleCoding` exercise on the compound cursor `where` (the load-bearing skill — see §Scope for PGlite staging). A `MultipleChoice` or `Buckets` to drill the offset-vs-cursor *decision* (which scenario gets which). A `Sequence` is optional reinforcement for the fetch-n+1 flow; lean on the coding exercise as the primary check.
- Estimated 50–60 min, matching the chapter outline. Load-bearing for every list view in later units.

---

## Lesson sections

### Introduction (no header)

Open by connecting to L1: you already page with `limit`/`offset`, and L1 flagged that offset is "the simple default with a ceiling" and that the tiebreaker habit would matter "later in this chapter." This is later. Motivate with a concrete screen — an invoice list or an activity feed that grows and changes while a user scrolls it. Pose the senior question implicitly: when a list could grow large *or* changes under the user, how do you page without getting slow at depth and without showing duplicated or skipped rows? Name the destination: cursor pagination, the senior default for growing/live lists, with offset as the deliberate small-stable carve-out. Preview the build — choose the right one, write the compound cursor query, encode it as an opaque URL token, detect the next page. Warm, 3–4 sentences. Reuse the running `invoices` domain with no re-introduction.

Tooltip (`Term`) candidates: **cursor** (an opaque token marking the last row a page returned; the next page asks for rows *after* it, rather than counting from the front), **pagination** (serving a long list in bounded chunks instead of all at once) — only if not already defined earlier in the chapter; check L1 before redefining.

### Where offset breaks

The motivation section. No cursor syntax yet — make offset's two ceilings concrete so the cursor lands as the fix, not as trivia. Recap offset in one paragraph (it's known from L1): `orderBy(...).limit(20).offset(40)` is page 3, intuitive, and genuinely right for small fixed lists. Then the two failure modes, each shown:

- **Failure 1 — it gets slow at depth (re-scan).** `OFFSET 10000` doesn't skip cheaply: Postgres still computes and walks the first 10,000 ordered rows, then throws them away to return rows 10,001–10,020. Cost scales with how deep you page. A list nobody pages deep into is fine; a list with real depth pays this on every deep page. Visualize with a tight **`Figure`** (HTML+CSS, height-capped): a horizontal strip of row cells — the offset variant shades the first N cells "scanned then discarded" (muted/struck) and the page window in accent; a cursor variant below shows the same window reached by a single arrow that *jumps* to the boundary, no discarded cells. Pedagogical goal: make "re-scans vs. seeks" a picture, not a claim.
- **Failure 2 — it shows wrong rows on live data (positional shift).** Offset addresses rows *by position* in the current ordering. If a new invoice is inserted at the top between the user loading page 1 and page 2, every row shifts down one position, so the first row of the old page 2 is now the last row of page 1 — the user sees it **twice** (or, on a delete, misses one). Visualize with a **`DiagramSequence`** (4–5 steps, height-capped): step through page 1 loaded (rows 1–3 of an ordered list) → a new row inserted at the top → page 2 requested at `offset 3` → the window now lands on a row already shown on page 1 (highlight the duplicate). Pedagogical goal: make the *shift* visible so "offset is unstable under writes" stops being abstract.
- Close the section by naming the fix in one sentence and handing to the next: instead of addressing rows by position, address them *relative to the last row you actually saw* — that's a cursor, and inserts/deletes above it can't move the boundary. State the spine here for the first time: **a cursor remembers the last row you saw and asks for the rows after it; offset counts from the front and re-counts every time.**

Tooltip candidates: **offset** (skip-the-first-N pagination — `OFFSET 40 LIMIT 20` returns rows 41–60 of the current ordering) — if not already a Term from L1.

### When offset is the right call

Short, deliberate "trigger before tool" section — name the threshold so the student doesn't over-apply cursors. Offset is fine, even preferable, when **all three** roughly hold: the list is small and bounded (an admin table of a few hundred rows that won't grow unboundedly), the data is read-mostly/stable (not mutating under the user), and the UI genuinely wants random page access or a "page 3 of 12" total-count affordance (offset pairs naturally with a known page count; cursor doesn't). The switch-to-cursor triggers: any list that could grow past low thousands, *or* any list users see while it's being written to (a feed, an inbox, an activity log). Frame as a decision, not a rule — most SaaS list endpoints cross at least one trigger, so cursor is the default and offset is the justified exception. Reinforce with a quick `MultipleChoice` (or a two-bucket `Buckets`: "Offset is fine" / "Reach for cursor") sorting 4–6 concrete scenarios (e.g. "internal admin table of ~200 feature flags" → offset; "customer-facing activity feed, thousands of rows, live" → cursor; "report with a fixed 'page N of M' control over a static export" → offset; "invoice list that grows monthly and shows newly created rows" → cursor). Pedagogical goal: drill the *decision* before the mechanics, so the cursor build feels earned.

### The cursor query

The lesson's center of gravity — build the forward cursor query incrementally so the tiebreaker arrives as the resolution of a concrete break, not as a rule handed down.

- **Stage 1 — the naive single-key cursor, and why it's tempting.** Start from the spine: "give me rows after the last one I saw." With a single sort key the obvious shape is `where(cursor ? lt(invoices.createdAt, cursor.createdAt) : undefined).orderBy(desc(invoices.createdAt)).limit(pageSize)` (descending = newest first, so "after" is "older than", hence `lt`). Show it, note it reads correctly, and that the very first page passes `undefined` for the cursor (no boundary yet). Then break it.
- **Stage 2 — the tie that skips rows, and the tiebreaker fix.** Make the break concrete: two invoices share a `createdAt` (bulk import, traffic burst). The page boundary lands *between* two rows with the *same* `createdAt`; `lt(createdAt, boundary)` excludes **both** tied rows (they're not strictly less than the boundary value), so the row that should have started the next page is silently skipped. The fix is the L1 reflex made structural — compare the **pair** `(createdAt, id)`, not just `createdAt`. The compound predicate:
  ```ts
  where(
    cursor
      ? or(
          lt(invoices.createdAt, cursor.createdAt),
          and(eq(invoices.createdAt, cursor.createdAt), lt(invoices.id, cursor.id)),
        )
      : undefined,
  )
  ```
  Read it aloud: "rows strictly older than the cursor's timestamp, OR rows with the *same* timestamp but a smaller id." The `id` tiebreaker is unique, so the pair `(createdAt, id)` is a total order — every row has a defined position relative to the cursor, no ambiguity at the seam. This is the exact `or(gt, and(eq, gt))` shape Drizzle's own cursor guide recommends (direction flipped to `lt` here because the list is descending). Explicitly tie back to L1: *this is why you drilled the tiebreaker.*
- **Stage 3 — the `orderBy` must match the cursor pair, same direction.** The predicate and the sort have to agree or the boundary logic is nonsense: `orderBy(desc(invoices.createdAt), desc(invoices.id))`. Same two columns, same directions as the comparisons in the `where`. State the rule: **the cursor predicate and the `orderBy` are one design — the columns and directions must line up.**
- **Walk the compound `where` with `AnnotatedCode`** (the one block dense enough to warrant stepping), colored steps on the full query:
  - the `lt(invoices.createdAt, cursor.createdAt)` branch — "rows strictly past the cursor on the sort key." Color blue.
  - the `and(eq(createdAt), lt(id))` branch — "the tie-break: same timestamp, past the cursor on the unique id. Without this branch, rows sharing a timestamp at the page seam get skipped." Color orange (it's the watch-out).
  - the `or(...)` wrapping them — "union the two: strictly-after on the sort key, *or* tied-on-sort-key-but-after-on-id." Color green.
  - the matching `orderBy(desc(createdAt), desc(id))` — "same columns, same direction as the predicate — the boundary only makes sense if the sort agrees." Color violet.
- **Stable sort keys only — the mutable-column trap.** A short, firm paragraph: cursoring works only when the sort key doesn't change for a row mid-pagination. Sort by `createdAt` (immutable) — never `updatedAt`, because a row touched while the user pages can hop the boundary and appear twice or vanish. Name it as a distinct bug from the missing tiebreaker.
- **Tenant scope rides on the request, not the cursor.** The multi-tenant `where` still carries `eq(invoices.organizationId, orgId)` (from L1's org-scope reflex) — but `orgId` comes from auth context, **not** from the cursor. State the rule and the reason in one beat: the cursor is a client-held token; putting the tenant id in it is a leak vector (a user could decode and tamper). The cursor carries only the sort key and tiebreaker; the request carries the tenant. Keep it tight but explicit — it's a named watch-out.

Tooltip candidates: **keyset pagination** (the formal name for cursor pagination — paging by the *value* of the last row's sort key(s) rather than by position) — name it once so the student recognizes the term in docs.

#### Practice: the compound cursor

`DrizzleCoding` exercise — the compound cursor `where`, the lesson's load-bearing skill.

- **Task:** an `invoices` table is seeded for one org, ordered newest-first, with **two rows sharing the same `created_at`** straddling a page boundary. Given a cursor object (a `created_at` + `id` of the last row of "page 1", provided as in-scope `const`s or literals in the starter), write the `where` that returns the next page correctly — i.e. the student must produce the compound `or(lt(createdAt), and(eq(createdAt), lt(id)))` predicate. Grade on the returned rows being exactly the correct next page **including** the tied row a single-key cursor would skip.
- **Grading:** pin `id` (and `status`/`amountDue` if a tighter check helps) per expected row; `ordered: true` (the query has a deterministic `orderBy(desc, desc)`, so order is graded — and the tied rows' relative order is the whole point). The trap being checked: a naive `lt(invoices.createdAt, cursor.createdAt)` drops the tied row, so the result is short by one and the checklist fails; only the compound predicate returns the full correct page.
- **PGlite staging (carry the Ch 038 rules from L1–L5):** integer PKs with explicit seeded ids, explicit `snake_case` column-name strings, `numeric` for money (comes back as a string), plain `text` for status, no `casing` client, no `uuidv7()`. Crucially, **seed the two tied rows with an identical `created_at` literal** and give them ids that make the tiebreaker observable (the row with the larger id sorts first under `desc(id)`, so it belongs to the earlier page; the smaller-id tied row must appear on the page under test). Provide the cursor as explicit `const cursor = { createdAt: '...', id: N }` in the starter so the student focuses purely on the predicate. `limit` can be set so the page boundary lands exactly on the tie. Confirm in the continuity notes that the tied-row seed survives PGlite ordering.

### Turning the cursor into a URL token

The encoding section — a separate, smaller idea taught after the query is correct. The query needs a `{ createdAt, id }` object; this is how that object travels in the URL and comes back trustworthy.

- **Why opaque.** The cursor ships to the client (in the URL/response) and comes back on the next request. Encode it as an opaque token so clients treat it as a black box and *don't* build their own or depend on the field names — that keeps you free to change the sort/encoding later without breaking callers. Opaque, but reversible: the *server* must decode it.
- **Encoding out.** Serialize the cursor object to JSON, then `base64url`-encode it into a URL-safe string: `Buffer.from(JSON.stringify(cursor)).toString('base64url')`. Note `base64url` (not plain `base64`) — it's URL-safe (no `+`/`/`) and drops padding, so it drops cleanly into a query param: `?cursor=eyJ...`. The page size travels alongside as its own param (`?pageSize=20`) with a server-side cap (typical 100) and a default living in a constants file, not scattered through queries (ties to the Code-conventions `parseCursor`-in-`/lib` pattern — name a `parseCursor` / `encodeCursor` helper home, don't over-build it).
- **Decoding + validating in — the cursor is untrusted input.** On the next request, decode (`Buffer.from(raw, 'base64url').toString()` → `JSON.parse`) and then **validate the shape** before using it — a malformed, stale, or hand-crafted cursor must produce a 400, not a crash deep in the query. Name Zod as the validation tool (`Ch 042` owns it; one clause + a `safeParse`-shaped mention, don't teach Zod here). The mental model, stated plainly: a cursor is just another request parameter, so it gets the same "validate at the boundary" defense as a query string or body field. Reuse the parameterization reassurance from L1 in one clause (the decoded values still flow through `eq`/`lt` as `$1` placeholders — decoding a cursor doesn't reintroduce injection).
- Use `CodeTooltips` on the encode/decode lines to define `base64url` inline and to spell out the `{ sortKey, id }` shape the token wraps. Keep the code to the two one-liners plus the validate step — it's plumbing; the predicate is the lesson.

Tooltip candidates: **base64url** (a URL-safe Base64 variant — `-`/`_` instead of `+`/`/`, padding omitted — so an encoded value drops straight into a query string), **opaque token** (a value the client passes back unchanged and isn't meant to parse — the server owns its meaning).

### Knowing there's a next page

The fetch-n+1 trick — how the page tells the UI "there's more" without a second query.

- **The trick.** Ask for one more row than the page needs: `limit(pageSize + 1)`. If you get `pageSize + 1` rows back, there's a next page; slice off the extra row and the page is the first `pageSize`. If you get `pageSize` or fewer, this is the last page. The **next cursor** is the key (`{ createdAt, id }`) of the *last row you actually return* (not the probe row). One extra row beats a separate `count()` round-trip just to answer a yes/no.
- **Show it.** `Code` block: fetch `pageSize + 1`, compute `hasNextPage = rows.length > pageSize`, `const page = rows.slice(0, pageSize)`, `nextCursor = hasNextPage ? encodeCursor(page.at(-1)) : null`. Return `{ items: page, nextCursor }` — the shape the Code conventions call "an array, possibly with cursor metadata" (`listInvoices` returns this).
- **Visualize** with a small **`Figure`** (HTML+CSS, single row, height trivial): `pageSize + 1` cells in a row, the first `pageSize` in accent labeled "returned", the final cell tinted/dashed labeled "probe — its existence means 'next page'". Pedagogical goal: make "fetch one extra, slice it off" a one-glance picture.
- A `Sequence` (optional reinforcement) could drag the steps into order: request `pageSize+1` → check length → slice to `pageSize` → take last returned row's key as next cursor → return items + nextCursor. Keep it optional; the coding exercise is the primary check.

### The index this depends on

Short section — name the dependency, show the shape, defer the mechanic. Cursor pagination is fast **only** when an index covers the cursor's `(sortKey, tiebreaker)` columns in the cursor's sort direction — otherwise the "seek to the boundary" degrades into a sequential scan and the cursor is *slower* than the offset it replaced. Show the index shape inline so the column/direction correspondence is concrete:
```ts
index('invoices_org_created_at_id_idx').on(
  invoices.organizationId,
  desc(invoices.createdAt),
  desc(invoices.id),
)
```
Point out the correspondence beat by beat: the tenant scope column first (it's an equality filter), then the two cursor columns in the same descending order the `orderBy` uses — so Postgres can satisfy the filter, the sort, and the boundary seek from one index. Then draw the line firmly with an `Aside` (note): **this lesson owns "correct," Ch 039 L1 owns "fast"** — declaring, choosing, and tuning indexes (and reading `EXPLAIN ANALYZE` to confirm the seek, Ch 039 L3) is the performance chapter's job. Here you just need to know the cursor query has a hard index dependency and what the index looks like, so the two never ship apart. One short paragraph + the snippet + the Aside.

### The same query through the relational API

Show that cursor pagination is a query *shape*, not an API feature — it rides on whichever read API the feature already uses. The model is identical; only the surface differs.

- Reuse the v2 RQB object syntax from L3: `db.query.invoices.findMany({ where: ..., orderBy: [desc(...), desc(...)], limit: pageSize + 1 })`. The compound cursor predicate uses the RQB `where` form — show the `RAW` / callback escape that L3 established for an `or(lt, and(eq, lt))` that the bare object syntax can't express directly (L3 taught `RAW: (t) => sql\`...\`` and the operator-object form; pick whichever L3 actually shipped — **check L3's MDX before writing this** so the syntax matches exactly, per L3's continuity note that the course teaches v2 only).
- Side-by-side with `CodeVariants` (tab "SQL builder" / tab "Relational query builder") so the student sees the *same* `(createdAt, id)` pair, the *same* `desc/desc` order, the *same* `pageSize + 1` probe — just expressed in the two APIs. First sentence of each tab names the trade-off: SQL builder when the read is flat/already `db.select`; RQB when the page rows are a *tree* (invoice + its line items, from L3) and you're paginating the parents.
- One sentence on the decision: you don't choose your pagination API — you paginate whatever read the feature already does. The cursor mechanics are the same either way.

### What cursors give up

Short "name it, scope it" section so the student isn't surprised by the trade-offs and doesn't over-engineer.

- **No total count / "page 3 of 12."** Cursor pagination doesn't know how many pages exist — it only knows "is there a next one." Most 2026 SaaS lists lean into this: they show "200+", an approximate count, or no count at all, and a "Load more" / infinite-scroll affordance rather than numbered pages. An exact total needs a separate `count()` query (sometimes cached) — pay for it only if the product genuinely needs the number. One paragraph.
- **Forward-only by default; "previous page" is a re-anchor.** The cursor built here pages forward. "Previous" is usually handled by keeping the user's prior anchor (or just the browser's own back), not by a separate backward cursor. True bidirectional cursors (a reversed predicate + reversed order, then re-reverse the rows) exist but rarely earn their implementation cost in early SaaS — name the shape in one sentence, don't build it.
- **The URL-state pairing is named, owned later.** The cursor lives in the URL search params so a page is shareable/refreshable; the full URL-state-sync pattern is owned by **Ch 041 L4** ("URL state with searchParams and route params" — which the TOC confirms explicitly covers "opaque base64 cursors" and Zod-at-the-boundary) and applied in **Unit 10** (the list-view chapters, `nuqs` as the production layer). The chapter outline's Ch 033 / Ch 060 guess is superseded — point at Ch 041 L4 / Unit 10. One clause pointer.
- Close the lesson by tying back to the spine and to L1: you now have the senior default for any list that grows or moves — the tiebreaker reflex from L1, turned into a cursor that seeks instead of scans and anchors instead of counts. Every list view in the units ahead is built on this shape.

### Keep these close (External resources)

A `CardGrid` of `ExternalResource` cards (match L1's pattern). Candidates:
- **Drizzle — Cursor-based pagination guide** (`https://orm.drizzle.team/docs/guides/cursor-based-pagination`) — the official compound-cursor recipe this lesson follows.
- **Drizzle — Select** (`https://orm.drizzle.team/docs/select`) — `where`/`orderBy`/`limit` reference, already linked in L1; include only if it adds value here.
- Optionally an "Use the index, Luke" / keyset-pagination explainer if a durable, vendor-neutral one is found — verify it's current before including; skip if nothing clean surfaces. Keep the grid to 2–3 cards.

---

## Scope

**Prerequisites to redefine concisely (taught earlier, do not re-teach):**
- `limit`/`offset`, `orderBy(asc/desc(col))`, the **tiebreaker reflex** (non-unique sort column + PK), the operator helpers (`eq`, `lt`, `gt`, `and`, `or`), single-row reads, and the multi-tenant org-`where` reflex — **L1**. This lesson *builds on* the tiebreaker (it's the spine of the cursor) and *contrasts with* offset; restate offset in one paragraph, don't re-teach the operators.
- Drizzle's automatic parameterization (values → `$1`, injection-safe) — **L1**. Reuse in one clause when decoded cursor values flow into the predicate; the full raw-SQL/`sql\`\`` story is L10.
- `numeric` → `string` money reflex, `Invoice` inferred type, the `invoices`/`organizations` schema — **Ch 037**. Honor; never redeclare.
- The relational query API (`db.query.<table>.findMany`) and its **v2 object `where`/`orderBy` syntax** (including the `RAW`/callback escape) — **L3**. This lesson *reuses* the RQB surface for the parallel cursor query; do not re-teach RQB, and **match L3's exact v2 syntax** (check L3's MDX). The course teaches v2 only — do not introduce v1 callback `db.query` or `relations()`.

**Deliberately excluded (reserved for later or out of scope):**
- **The composite index mechanic** — *declaring* it, choosing columns, the `desc` index direction detail, and `EXPLAIN ANALYZE` to confirm the seek — **Ch 039 L1 / L3**. This lesson *names the dependency and shows the index shape* so correctness and speed don't ship apart; it does not teach index design. Hard boundary.
- **URL-state synchronization** for the cursor (syncing the `?cursor=` param with client navigation, shareable URLs, `nuqs`) — **Ch 041 L4** (owns opaque-base64-cursor URL state per the TOC) and **Unit 10** (the list-view chapters apply it). Named in one clause; not built here. (Supersedes the chapter outline's Ch 033 / Ch 060.)
- **Tenant scoping at the query layer in depth** (the `tenantDb(orgId)` factory that folds the org-`where`) — **Unit 10**. This lesson carries the org-`where` by hand (per L1) and states the "tenant rides on the request, not the cursor" rule; the factory is later.
- **Zod validation of the decoded cursor** — **Ch 042**. Named as the boundary defense (a bad cursor → 400) in one clause + a `safeParse`-shaped mention; Zod itself is not taught here.
- **Bidirectional / previous-page cursors and total-count strategies at depth** — named-for-recognition only (one paragraph in "What cursors give up"); implementation deliberately cut.
- **Page-size / list-endpoint API design beyond the cursor** (envelope shapes, `Link` headers, GraphQL connections) — out of scope; the lesson shows the `{ items, nextCursor }` shape the Code conventions name and stops there.
- **Offset's deep-page performance fix via index/keyset hybrids and `OFFSET` alternatives** beyond cursor — out of scope; cursor is the taught answer.

---

## Notes for downstream agents

- **Drizzle version neutrality:** the cursor query is plain `db.select`/`db.query` + operator helpers (`or`, `and`, `eq`, `lt`/`gt`, `asc`/`desc`) — **identical across Drizzle 0.45 and 1.0**, write version-neutrally. The *only* version-sensitive surface is the **RQB v2 object `where`/`orderBy`** in "The same query through the relational API" — mirror L3's shipped v2 syntax exactly (including how L3 wrote the `RAW`/callback escape for an `or(...)` predicate); do not normalize to v1.
- **Verified June 2026 (Drizzle official cursor guide):** the recommended compound-cursor shape is `or(gt(sortKey, c.sortKey), and(eq(sortKey, c.sortKey), gt(id, c.id)))` + matching `orderBy` + `limit`, primarily on the SQL builder, with a composite index called out as required. This lesson uses the *descending* form (`lt` instead of `gt`) because the running `invoices` list is newest-first — keep that direction consistent across the `where`, the `orderBy`, and the index snippet, and say so.
- **Encoding:** `Buffer.from(JSON.stringify(cursor)).toString('base64url')` / `Buffer.from(raw, 'base64url').toString()` — `base64url` is native to Node's Buffer (URL-safe, padding omitted). Use `base64url`, not `base64`, so the token is query-string-safe without escaping.
- **Cognitive-load order is fixed:** offset's two failures (shown) → offset's carve-out → build the cursor incrementally (naive → tie breaks it → tiebreaker → matching orderBy) → encode/validate → fetch-n+1 → index dependency → RQB parallel → trade-offs. Don't lead with the compound predicate.
- **Schema discipline:** reuse Ch 037 `invoices`/`organizations` by import/reference, never redeclare. The cursor sorts on `createdAt` + `id`; tenant scope is `organizationId`.
- **Cross-refs verified against the TOC (June 2026):** URL-state-for-cursors is **Ch 041 L4** (TOC names "opaque base64 cursors" there) + **Unit 10** list-view chapters — **not** the chapter outline's Ch 033 / Ch 060 (corrected in-place above). Zod is **Ch 042** (confirmed). The composite index is the next chapter, Ch 039 L1; `EXPLAIN ANALYZE` is Ch 039 L3. Prefer in-chapter relative cross-refs ("the indexing lesson in the next chapter") where a hard number isn't load-bearing.
- **DrizzleCoding verification:** confirm the two tied-`created_at` seed rows order deterministically under PGlite's `desc(created_at), desc(id)` so the skipped-row trap is reproducible; record which exact seed/cursor shipped in the continuity notes (same diligence as L3/L4/L5 PGlite-staging confirmations).

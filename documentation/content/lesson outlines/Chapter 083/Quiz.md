sources:
  83.1: "Storage, domain, edge"
  83.2: "Calendar days, not midnight instants"
  83.3: "Timezone on the profile"
  83.4: "DST and recurring jobs"
  83.5: "Arithmetic with Temporal"

questions:
  - source: 83.2
    question: |
      A teammate models an invoice's `dueDate` — the day the customer agreed to pay by — as a `timestamptz` set to midnight UTC, "to keep our options open." Every test passes on the team's UTC machines. What ships?
    choices:
      - text: |
          A customer in Sydney who picks "due the 15th" stores their local midnight as `2026-05-14T14:00:00Z` — the 14th — and reads the invoice back as due a day early. The fix isn't careful midnight handling; it's a `date` column plus `Temporal.PlainDate`, where the time-of-day has nowhere to live and there's no zone to offset.
        correct: true
      - text: |
          Nothing visible — midnight UTC is a fine canonical anchor for a calendar day, as long as every read formats it back with the same UTC offset it was written with.
        correct: false
      - text: |
          A precision bug only: `WHERE due_date = '2026-05-15'` misses rows on the dropped-microsecond tail, which `precision: 3` on the column resolves.
        correct: false
    why: |
      Midnight is a different instant in every zone, so a `timestamptz`-at-midnight column quietly drifts the calendar day for any non-UTC user — the Sydney customer's chosen "15th" round-trips to the 14th. Formatting back in UTC doesn't save you, because the user never agreed to a UTC day; they agreed to a calendar day. The cure is structural, not vigilance: a `date` column rejects the time-of-day and `Temporal.PlainDate` rejects the timezone, so the bug becomes impossible to express. (The microsecond tail is a real footnote of the instant pair, but it isn't what makes the Sydney invoice wrong.)

  - source: 83.1
    question: |
      Your `instantColumn` hands back a `Temporal.Instant` automatically on every read, and `Instant.from(...)` parses it on every write. So you return one straight from a route handler: `return Response.json({ createdAt: invoice.createdAt })`. It breaks. Why — and what's the rule?
    choices:
      - text: |
          The database boundary converts in both directions for you, but the *wire* doesn't — a `Temporal.Instant` is a class instance that JSON (and the RSC boundary) can't carry. You encode it explicitly with `.toString()` at the edge: Temporal in memory, ISO 8601 on the wire.
        correct: true
      - text: |
          `Response.json` needs the raw Postgres text, so you should read the column with `mode: 'string'` instead of the custom column and pass that through untouched.
        correct: false
      - text: |
          It works fine — `JSON.stringify` calls `Instant.prototype.toJSON()`, so the explicit `.toString()` is redundant either way.
        correct: false
    why: |
      The asymmetry is the thing to internalize: the column codec automates the *database* direction both ways, but the *wire* is manual. A bare `Temporal.Instant` is a class instance the JSON and React Server Component boundaries reject, so you encode to the ISO string at the edge (`.toString()`, or let `JSON.stringify` invoke `toJSON()`) and parse back on the other side. Switching the read to `mode: 'string'` just drags Postgres's non-canonical `+00` text back into your domain — the exact thing the custom column exists to quarantine.

  - source: 83.3
    question: |
      You validate the profile timezone select with `z.string().refine((tz) => Intl.supportedValuesOf('timeZone').includes(tz))`. It rejects a value users legitimately submit, and the same list leaves a hole in your dropdown. Which value, and what's the robust fix?
    choices:
      - text: |
          `'UTC'` — Chromium and Node omit the `Etc/*` zones from `supportedValuesOf`, so the membership check rejects your column's own default. Validate by *acceptance* instead: try `new Intl.DateTimeFormat('en-US', { timeZone: tz })` and accept any zone that constructs without throwing.
        correct: true
      - text: |
          `'America/New_York'` — `supportedValuesOf` lists only canonical zone IDs, so DST-observing aliases fail; normalize to the offset form `-05:00` before validating.
        correct: false
      - text: |
          None — the membership check is exactly right; the real fix is storing an offset like `-05:00` so DST math stays stable across the year.
        correct: false
    why: |
      `Intl.supportedValuesOf('timeZone')` famously drops the `Etc/*` family on Chromium and Node, so `'UTC'` — the very default your column ships with — fails the membership check and is missing from a select built off the same list. The robust validator asks the only question that matters, *can the runtime actually format with this zone?*, by constructing an `Intl.DateTimeFormat` in a try/catch; it can never drift from the platform's true capability. Storing an offset is the opposite of a fix — an offset throws away the DST rules entirely.

  - source: 83.4
    question: |
      Sort each recurring job to where it belongs. (Select every job that should name an IANA timezone rather than run in UTC.)
    choices:
      - text: |
          A B2B customer's "9 AM weekday summary" email, fired on their local clock.
        correct: true
      - text: |
          The monthly invoice stamped with a San Francisco company's issue date.
        correct: true
      - text: |
          The nightly retention sweep that deletes rows older than 30 days.
        correct: false
      - text: |
          The hourly metric rollup that feeds the analytics dashboard.
        correct: false
    why: |
      The binary is one question: would a human be upset if this ran an hour off? A 9 AM summary and a company-stamped invoice date are wall-clock-meaningful, so they name a zone — the user's for the summary, the org's for the invoice — and let the scheduler ride spring-forward and fall-back. The retention sweep and the metric rollup are pure cadence: no human reads the clock, only the frequency matters, so they run in UTC (stated explicitly, so the runtime default is never load-bearing). Naming a zone on a cadence job buys nothing; omitting one on a wall-clock job is the twice-a-year drift bug.

  - source: 83.4
    question: |
      A user moves from New York to Tokyo and updates their profile timezone. What should happen to a one-shot "remind me at 5 PM next Friday" job that was scheduled while they were still in New York?
    choices:
      - text: |
          Nothing automatic — it was collapsed to a fixed `Temporal.Instant` at scheduling time, so past intent is honored and it fires at the New-York-derived moment. Offer an explicit "rebase your 1 reminder?" prompt if anything, never a silent shift.
        correct: true
      - text: |
          It re-registers with the new zone, exactly like the user's recurring daily summary — any pending work that depended on the old zone tracks the profile change.
        correct: false
      - text: |
          It throws on the next read, because the stored instant now disagrees with the profile zone and must be recomputed before it can fire.
        correct: false
    why: |
      The trap is treating "their scheduled stuff" as one bucket. A *recurring* schedule is still wall-clock-meaningful and pending, so you re-register it (`schedules.update` with the new zone) — skip that and you get the "profile says Tokyo, reports still fire on New York's clock" bug. But a *one-shot* was already converted to a fixed `Instant` when it was scheduled; that instant is a settled fact, and silently rebasing it would drag the reminder an hour off without consent. The default is "past intent is honored"; a rebase, if offered at all, is explicit and opt-in.

  - source: 83.5
    question: |
      `anchor` is the `PlainDate` for January 31. Predict the difference:

      ```ts
      const a = anchor.add({ months: 1 }).add({ months: 1 });
      const b = anchor.add({ months: 2 });
      ```
    choices:
      - text: |
          `a` is March 28 and `b` is March 31. Adding a month twice clamps at each hop (Jan 31 → Feb 28 → Mar 28), losing the "31st" after the first clamp; one larger call clamps only once, and March has a 31st.
        correct: true
      - text: |
          Both are March 31 — `add` is associative, so iterating one month twice and adding two months in one call always land on the same day.
        correct: false
      - text: |
          `a` throws a `RangeError` on the Feb 31 step; `b` is March 31. You need `overflow: 'reject'` on `a` to avoid the throw.
        correct: false
    why: |
      Month arithmetic isn't associative near month-end. The default `overflow: 'constrain'` clamps an impossible date to the last valid day rather than throwing, so the first hop turns Jan 31 into Feb 28 — and the information that you started on a 31st is gone, so the second hop lands on Mar 28. A single `add({ months: 2 })` clamps only once and finds a real March 31. When the month boundary matters, prefer one larger call; reach for `overflow: 'reject'` only when an impossible date should blow up loudly instead of clamping.

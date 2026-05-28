sources:
  9.1: JSON at the wire boundary
  9.2: Classes, narrowly
  9.3: Date's problems and the Temporal pivot
questions:
  - source: 9.1
    question: |
      A Server Action receives this JSON body and reads `data.amount` to charge a customer:

      ```ts
      const raw = await req.text();
      const data = JSON.parse(raw);
      return chargeInvoice(data.invoiceId, data.amount);
      ```

      What is wrong with this shape?
    choices:
      - text: |
          `JSON.parse` returns `any` by convention; the value must be typed `unknown` and narrowed by a Zod schema before any field is read.
        correct: true
      - text: |
          The `SyntaxError` from `JSON.parse` isn't caught at the call site — wrap the parse in a `try`/`catch` and return a 400 from inside the catch.
        correct: false
      - text: |
          `req.text()` is the wrong method — use `req.json()` so the runtime parses and types the body for you.
        correct: false
    why: |
      The bug class is "I read the response and trusted the shape." `JSON.parse` hands back whatever the wire sent; the TypeScript signature says `any`, the discipline says `unknown`. Reading `data.invoiceId` and `data.amount` off the raw parse lets a malformed webhook poison the database. The cure is the two-step seam: `JSON.parse` to `unknown`, then `schema.parse` to the domain type — usually behind the `parseJson(raw, schema)` helper. The `SyntaxError` catch belongs once at the transport-layer wrapper, not at every call site. And `req.json()` returns `Promise<any>` — same discipline, different syntax.

  - source: 9.1
    question: |
      Which of these `JSON.stringify` outputs are correct? (Select all that apply.)
    choices:
      - text: |
          `JSON.stringify({ a: 1, b: undefined })` → `'{"a":1}'`
        correct: true
      - text: |
          `JSON.stringify([1, undefined, 3])` → `'[1,null,3]'`
        correct: true
      - text: |
          `JSON.stringify({ id: 42n })` → `'{"id":"42"}'`
        correct: false
      - text: |
          `JSON.stringify({ ratio: NaN })` → `'{"ratio":null}'`
        correct: true
    why: |
      Three of the four serialization holes show up here. Object properties with `undefined` are *dropped*; array slots become `null` (positions matter, so the value can't simply vanish). `NaN`, `Infinity`, and `-Infinity` all serialize as `null` — indistinguishable from a real `null` on the receiver. The `BigInt` case is the odd one out: `JSON.stringify` *throws* `TypeError` on a `bigint`, it doesn't coerce to a string. The senior reach is to model 64-bit IDs as strings in the schema so no `bigint` ever reaches the serializer.

  - source: 9.2
    question: |
      Which of these declarations earn a `class` on the 2026 SaaS stack? (Select all that apply.)
    choices:
      - text: |
          A `UserService` grouping `getUser`, `listUsers`, and `requireUser` as `static` methods.
        correct: false
      - text: |
          A `BillingClient` wrapping the Stripe SDK to hide the vendor type and centralize the `apiKey` and `apiVersion`.
        correct: true
      - text: |
          A `ValidationError extends Error` with a literal `name` discriminant and a `cause` passthrough.
        correct: true
      - text: |
          A `User` record paired with a `formatName(user)` function exported from the same module.
        correct: false
    why: |
      Two of the three legitimate triggers are here: the SDK adapter wrapper (carries vendor state behind an application-shaped surface) and the custom `Error` subclass (the runtime contract for `throw` and `catch` requires an `Error`). The `UserService` is the canonical anti-pattern — "group related functions" is what a module is for; a class adds nothing. The `User` plus `formatName` is the default shape this stack reaches for everywhere a trigger doesn't fire: a typed record plus functions over it.

  - source: 9.2
    question: |
      A teammate writes this class to hold a Stripe API key:

      ```ts
      class SecretHolder {
        private secret = 'sk_live_xxx';
      }
      ```

      What's the senior critique?
    choices:
      - text: |
          TypeScript's `private` is erased at compile time — the field is reachable at runtime via `(holder as any)['secret']` or reflection. Use `#secret` for runtime-enforced privacy.
        correct: true
      - text: |
          The field should be `readonly` so it can't be reassigned after construction.
        correct: false
      - text: |
          Hardcoded secrets belong in environment variables — move the value to `process.env.STRIPE_KEY` and the class is fine.
        correct: false
    why: |
      The point of the class is privacy, and TS `private` doesn't deliver it. The keyword is a compile-time hint that's erased before the engine sees the code; bracket access, `Reflect.get`, `Object.entries`, and `JSON.stringify` all reach the field at runtime. `#secret` is enforced by the JavaScript runtime — invisible to bracket access, skipped by `JSON.stringify`, scoped per-class. `readonly` is a different axis (mutation, not visibility) and the env-var move is true but orthogonal to the privacy bug. The fix is `#secret`.

  - source: 9.3
    question: |
      Match each scenario to the Temporal type a 2026 SaaS senior would reach for.

      1. An invoice's due date
      2. The exact moment a Stripe webhook arrived at the route handler
      3. "Every Monday at 9 AM in the user's timezone" recurring job
      4. The 30-day SLA window used in arithmetic
    choices:
      - text: |
          1 — `Temporal.PlainDate`, 2 — `Temporal.Instant`, 3 — `Temporal.ZonedDateTime`, 4 — `Temporal.Duration`
        correct: true
      - text: |
          1 — `Temporal.Instant`, 2 — `Temporal.ZonedDateTime`, 3 — `Temporal.PlainDateTime`, 4 — `Temporal.Duration`
        correct: false
      - text: |
          1 — `Temporal.PlainDate`, 2 — `Temporal.ZonedDateTime`, 3 — `Temporal.PlainDateTime`, 4 — `Temporal.Instant`
        correct: false
    why: |
      The type tells you what the value is *for*. A due date is calendar-day semantics — the same May 15 in Sydney, Tokyo, and Madrid — so `PlainDate`, no time and no timezone. A webhook's arrival is a UTC point in real time — `Instant`. A wall-clock-aware recurring schedule needs the IANA tz baked into the type so "9 AM" survives DST — `ZonedDateTime`. A duration used in arithmetic carries named components (`{ days: 30 }`) that know "+1 day" is a calendar concept — `Duration`, not a millisecond count.

  - source: 9.3
    question: |
      A teammate adds this to `lib/billing/stripe.ts`:

      ```ts
      import { Temporal } from 'temporal-polyfill';

      export const createdAt = (sub: Stripe.Subscription): Temporal.Instant =>
        Temporal.Instant.fromEpochMilliseconds(sub.created * 1000);
      ```

      What's the senior critique?
    choices:
      - text: |
          Import `Temporal` from `@/lib/temporal`, never from `temporal-polyfill` directly. Two `Temporal` instances in the same process break `instanceof` and cross-instance `from()` silently.
        correct: true
      - text: |
          `Temporal.Instant.fromEpochMilliseconds` is the wrong factory for Unix seconds — call `Temporal.Instant.fromEpochSeconds(sub.created)` instead.
        correct: false
      - text: |
          The conversion belongs in `lib/temporal.ts` so the SDK adapter never touches `Temporal` at all.
        correct: false
    why: |
      One seam, one import path. `lib/temporal.ts` is the only file in the codebase that imports the polyfill; every other file imports `Temporal` from there. Mixing the polyfill `Temporal` with the native `Temporal` (or two polyfill copies) in one process produces values that look identical from the outside but fail `instanceof` and `Temporal.X.from()` cross-checks — silent breakage. The other options are wrong on facts: there is no `fromEpochSeconds` factory (Stripe's seconds get multiplied by 1000 at the seam), and the conversion legitimately lives at the SDK adapter — that's exactly what "Date stays at the seam" means.

  - source: 9.3
    question: |
      True or false: `new Date('2026-05-15')` and `new Date('2026-05-15 00:00')` produce the same `Date` on every server.
    choices:
      - text: |
          False — the ISO date-only form parses as UTC; the space-separated form parses as the runtime's *local* timezone. The two strings produce the same instant only when the server is on UTC.
        correct: true
      - text: |
          True — both strings describe midnight on May 15, 2026; the parse normalizes them to the same millisecond count.
        correct: false
    why: |
      A single character — the space versus the `T` — flips the timezone semantics. `'2026-05-15'` is the ISO date-only form, specified to parse as UTC. `'2026-05-15 00:00'` is the space-separated form, parsed as local time then converted back to UTC for storage. Code that ingests date strings from third parties passes its tests on a UTC server (Vercel, CI) and breaks the moment it runs in a non-UTC environment. This is the "format-determined timezone parse" bug — one of the eight structural flaws Temporal exists to retire.

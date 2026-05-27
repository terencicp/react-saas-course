sources:
  1.1: Bindings, not boxes
  1.2: What === actually compares
  1.3: Store cents, not dollars
  1.4: Why .length lies
  1.5: Backticks and tagged templates
  1.6: const binds, it doesn't freeze

questions:
  - source: 1.6
    question: |
      Which of these lines throws a `TypeError` at runtime?

      ```ts
      const config = { feature: true, env: { tier: 'pro' } };

      config.feature = false;          // A
      config.env.tier = 'free';        // B
      config = { feature: false };     // C
      ```
    choices:
      - text: |
          Only line A.
        correct: false
      - text: |
          Only line C.
        correct: true
      - text: |
          Lines A and C.
        correct: false
      - text: |
          All three.
        correct: false
    why: |
      `const` locks the binding (the arrow), not the value (the box). Lines A and B are property mutations through the existing reference — `const` has nothing to say about those. Line C is the one true reassignment: it tries to repoint `config` at a different object, which is exactly what `const` forbids.

  - source: 1.1
    question: |
      You spread a nested object to make a "copy" before mutating it:

      ```ts
      const original = { name: 'Ada', address: { city: 'London' } };
      const copy = { ...original };
      copy.address.city = 'Paris';
      ```

      What does `original.address.city` hold after this runs?
    choices:
      - text: |
          `'London'` — the spread copied the whole structure, so the mutation stays on `copy`.
        correct: false
      - text: |
          `'Paris'` — spread is shallow; `copy.address` and `original.address` are the same object.
        correct: true
    why: |
      `{ ...original }` copies the top level only. Nested objects keep their references — both `copy.address` and `original.address` point at the same allocation, so mutating through one is visible through the other. When the data shape is genuinely nested, `structuredClone` is the deep-copy default.

  - source: 1.3
    question: |
      For which of these values would a senior reach for `BigInt` rather than a regular `number`?
    choices:
      - text: |
          A user's shopping cart total in USD.
        correct: false
      - text: |
          A 64-bit Snowflake ID coming back from an external API.
        correct: true
      - text: |
          The number of unread notifications on a user's account.
        correct: false
      - text: |
          A nanosecond-resolution counter accumulated across a multi-year telemetry pipeline.
        correct: true
    why: |
      `BigInt` earns its weight only when values genuinely exceed `Number.MAX_SAFE_INTEGER` (2^53 − 1) — external 64-bit IDs and rare large counters are the canonical cases. Money is stored as integer cents in a regular `number` (covers amounts up to ~$90 trillion), and ordinary counts comfortably fit. `BigInt` carries real friction (no mixing with `number`, no `Math.*`, JSON serialization breaks) — pay it only when overflow is real.

  - source: 1.4
    question: |
      A bio field has a "280-character" limit. The user types 280 emoji, each of which they perceive as one character, and gets rejected as "too long." Which check belongs in the validator?
    choices:
      - text: |
          `input.length <= 280`
        correct: false
      - text: |
          `[...input].length <= 280`
        correct: false
      - text: |
          `[...new Intl.Segmenter('en', { granularity: 'grapheme' }).segment(input)].length <= 280`
        correct: true
    why: |
      `.length` counts UTF-16 code units (a flag emoji is 4, a family emoji is 11). Spreading counts Unicode code points — better, but a family emoji still comes out as 7. Only `Intl.Segmenter` with grapheme granularity counts what the user actually perceives, and it's the 2026 default for any length check on a user-facing field.

  - source: 1.2
    question: |
      Two database rows come back with identical contents:

      ```ts
      const a = { id: 1, name: 'Ada' };
      const b = { id: 1, name: 'Ada' };
      console.log(a === b);
      ```

      What prints, and why?
    choices:
      - text: |
          `true` — `===` walks the object and compares each property.
        correct: false
      - text: |
          `false` — `===` on objects compares the reference (the allocation), not the shape; `a` and `b` are two separate allocations.
        correct: true
      - text: |
          `false` — `===` only works on primitives; comparing objects always returns `false`.
        correct: false
    why: |
      For objects, `===` asks "are these the same allocation?" not "do they have the same shape?" Two object literals are two separate allocations, so the answer is `false`. JavaScript ships no structural-equality operator — the patterns the course uses instead are comparing by primary key, deriving a string key from the relevant fields, or discriminated unions.

  - source: 1.5
    question: |
      Why does Drizzle's `` sql`SELECT * FROM users WHERE id = ${userId}` `` resist SQL injection, while `` `SELECT * FROM users WHERE id = '${userId}'` `` does not?
    choices:
      - text: |
          The `sql` tag escapes the value as a string before splicing it into the query text.
        correct: false
      - text: |
          The `sql` tag receives the static segments and the dynamic values separately, and sends the values to the database as bound parameters — they never become part of the SQL text.
        correct: true
      - text: |
          Plain backticks evaluate `${userId}` at runtime; `sql`-tagged backticks evaluate it lazily, so injection can't happen.
        correct: false
    why: |
      A tagged template is a function call: the tag receives the array of static string segments and the interpolated values as separate arguments. Drizzle's `sql` tag uses that to bind each value to a numbered placeholder (`$1`, `$2`, ...) — the database driver handles the dynamic value as data, not as SQL text. The plain template literal concatenates the value straight into the query string, leaving the injection door open.

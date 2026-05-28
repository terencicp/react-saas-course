# Lesson 1 — JSON at the wire boundary

## Title and sidebar

- **Title (h1):** JSON at the wire boundary
- **Sidebar label:** JSON at the boundary

The chapter-outline title names the lesson's center of gravity (JSON is a *boundary* codec, never a domain type). Keep verbatim.

## Lesson framing

This lesson is a **Discipline archetype**. The student knows `JSON.parse` and `JSON.stringify` exist; what they don't yet have is the reflex that says *the parsed value is `unknown` until a schema narrows it* and the mental list of the four serialization holes that bite once the wire carries values the JSON grammar can't represent. The lesson installs both, plus the small set of `reviver` / `replacer` reaches that earn their weight.

Pedagogical conclusions from brainstorming:

- **Lead with the four directions and the one codec.** The student has seen `fetch` in chapter 007 but hasn't yet seen Server Actions, route handlers, or webhooks. The opener names the four sites JSON crosses (Server Action body, route-handler response, third-party webhook POST, `localStorage` round-trip) at altitude only, then collapses them: *one codec, four directions*. The point is that the wire boundary is everywhere, and the discipline is the same at every site.
- **Build the senior reflex in two beats.** Beat one: `JSON.parse` produces a value of *unknown* shape — the runtime type is `any` by convention, but the senior pretends it's `unknown` and never reads fields off the raw parse. Beat two: a Zod schema (named, not deep-dived) narrows the parsed value to a domain type before it reaches business logic. This two-step is the lesson's load-bearing reflex; everything else (the holes, the reviver, the replacer) hangs off it.
- **Holes get named once, illustrated with one snippet each.** Four holes, four small wrong-then-fix beats. The student should leave with the *list* memorized; the depth on each one (e.g. `Date` round-trip downgrades) is shallow because the cure is the same in every case: validate at the seam.
- **The reviver/replacer pair lives in a tight section, not the lesson's spine.** Beginners over-reach for `reviver` to "rehydrate" `Date`s and end up with a brittle parallel type system. Show one snippet for each *legitimate* reach (`replacer` for log redaction; `reviver` for prototype-pollution stripping — a real 2025 attack vector) and point everywhere else at Zod's `transform`. The framing is: prefer schema-level codecs; reach for these only at the two named sites.
- **The `parseJson<T>(s, schema): T` helper is the lesson's structural payoff.** One small `lib/json.ts` helper that combines `JSON.parse` and `schema.parse`, throws on either step, and lives at the seam. Every wire boundary in the codebase imports it. The student should leave with this shape in their muscle memory.
- **Recall, not re-teach, the prior chapters' substrate.** Discriminated unions and `unknown` narrowing come from chapter 005; `Result` and the error channels come from chapter 008; `structuredClone` for deep-clone comes from chapter 001. Name each as a one-line forward/back-link at the moment it would be re-taught.
- **The mental model: JSON is a transport format, not a value model.** The student should leave with the picture of JSON as a *narrow grammar* (six value types: object, array, string, number, boolean, null) that necessarily lossy-encodes everything richer (`undefined`, `Date`, `BigInt`, `Map`, class instance, function, `Symbol`). The discipline follows from the model: every domain-rich value gets *re-constructed* on the receiving side via a schema, not assumed to round-trip.
- **The bandwidth tangent is one sentence.** Beginners ask "but JSON is so verbose, shouldn't we use MessagePack / Protobuf?" Answer once, dismissively: in 2026 SaaS, JSON over HTTP/3 with brotli is fast enough until the profiler says otherwise. Move on.
- **Beginners' biggest trap: trust the parse.** The junior shape — `const data = JSON.parse(req.body); processInvoice(data.amount)` — silently lets every wire-format lie through to the domain. The senior reframing names the bug class ("I read the response and trusted the shape") and installs the two-step seam. Name this explicitly.
- **Beginners' second trap: `JSON.parse(JSON.stringify(x))` for deep-clone.** It misses `Date`, `Map`, `Set`, `Symbol`, `undefined`, `BigInt`, and cycles. `structuredClone` from chapter 001 is the right reach. One sentence, no dwell.
- **Practice the discipline, not the syntax.** The exercises check the *discipline* (route holes correctly; identify which call sites are unsafe) rather than the syntax (the student already knows how to spell `JSON.parse`). A `PredictOutput` for the holes; a `CodeReview` for unsafe call sites.

## Lesson sections

### Opening (no h2 — intro paragraphs only)

Two short paragraphs. Goal: name the four directions, install the *one codec* framing, and preview the lesson's two-step reflex.

- **The senior question.** Frame in prose: every SaaS sends and receives JSON at four sites — a Server Action receives a JSON body, a route handler returns one, a third-party webhook POSTs one, and `localStorage` round-trips one. Different *transports*; one codec. The naive shape is one line: `const data = JSON.parse(req.body); processInvoice(data.amount)`. The senior reads that line and asks one question — *what is the type of `data`?* — and the answer (it's `unknown`, no matter what `JSON.parse`'s signature says) splits the codec into two steps. Frame Server Actions / route handlers / webhooks at altitude only ("the wire boundaries you'll meet in later chapters"); don't preview their mechanics.

  No code block — the signature is the payoff.

- **Chapter framing in one sentence.** Chapter 009 closes Unit 1 by installing the three "value-shape" disciplines at the boundary between in-memory values and the outside world: this lesson owns the JSON wire, lesson 2 owns when to reach for `class`, lesson 3 owns the `Date` → `Temporal` pivot. All three answer one *trust* question — what is the value's shape *after* it crossed?

### One codec, four directions

The first technical beat. Goal: install the boundary as a structural fact before any mechanics land.

Content:

- **One framing sentence.** Every JSON crossing has the same shape: a string on the wire, a JavaScript value in memory, a codec (`JSON.parse` / `JSON.stringify`) between them.

- **The four directions, as a small visual.** Author this as a `<Figure>` wrapping a small horizontal HTML+CSS diagram — four lanes, all converging on a single "JSON codec" box in the middle. Each lane labels a wire site and arrows show the direction. The figure is the lesson's single visual anchor.

  Lane labels:
  - **Server Action body** — request comes in as JSON (chapter 043 owns the action wrapper).
  - **Route handler response** — response goes out as JSON (chapter 015 / chapter 046 own route handlers).
  - **Webhook POST** — third party sends JSON to your route handler.
  - **`localStorage` round-trip** — browser-side persistence; string in, string out.

  Centerpiece label: `JSON.parse` / `JSON.stringify` (one codec).

  Pedagogical goal: the student sees that the four sites *share a codec*. Whatever discipline you install at one site applies at every site.

- **One framing sentence after the figure.** The four directions don't share a *mechanism* (they share a codec), but they share a *discipline*: the parsed value is unknown until a schema narrows it. The next section installs that discipline.

`<Term>` candidates in this section:
- *wire* — "The serialized bytes that cross a process boundary — over HTTP, over a webhook, or into and out of `localStorage`. The codec sits between the wire and the in-memory value."

### `JSON.parse` produces `unknown`

The lesson's load-bearing reflex. Goal: name the type the parse returns, install the two-step seam, and forward-link Zod.

Content:

- **One framing sentence.** `JSON.parse(s)` returns a JavaScript value the JSON string described. The TypeScript signature returns `any` — but `any` is a lie at the boundary; the senior treats the result as `unknown` and narrows with a schema before reading fields.

- **The wrong-then-right shape, one `<CodeVariants>` block (`syncKey="parse-shape"`, two tabs).**

  - **Tab 1: wrong.** `data-mark-color="red"`.
    ```ts
    const raw = await req.text();
    const data = JSON.parse(raw); // typed `any` — every field read is unchecked
    return chargeInvoice(data.invoiceId, data.amount); // hopes the wire is honest
    ```
    Prose: "`JSON.parse` returns `any` by convention. The compiler will let you read `data.invoiceId` and `data.amount` without complaint — and the runtime will hand back whatever the wire sent. A malformed webhook, a missing field, a string where a number was expected — none of it is caught until something deeper in the stack breaks."

  - **Tab 2: right.** `data-mark-color="green"`.
    ```ts
    const raw = await req.text();
    const parsed: unknown = JSON.parse(raw);     // (1) parse to unknown
    const body = invoiceWebhookSchema.parse(parsed); // (2) narrow with Zod
    return chargeInvoice(body.invoiceId, body.amount); // body is typed and validated
    ```
    Prose: "Two steps. First, parse to `unknown` (annotate explicitly so the `any` doesn't leak through). Then narrow with a Zod schema (chapter 042 owns the schema surface). The body that reaches business logic is typed and *validated* — the runtime shape matches the static type."

- **One short paragraph: the discipline, restated.** The compiler's view of the parse result is `any`, the senior's view is `unknown`, the project's discipline is to wrap every parse in a helper whose return type is `unknown` so the only path forward is the schema. The discipline is one sentence: **the wire is `unknown` until validated.**

- **`SyntaxError` on malformed input, one sentence.** `JSON.parse` throws `SyntaxError` when the string isn't valid JSON. The catch lives at the *transport* layer (route handler wrapper, Server Action wrapper) — not at every call site. Empty string and missing body throw too; guard before parsing if the source allows them.

- **`Response.json()` / `Request.json()`, one short paragraph.** The fetch API's body methods call `JSON.parse` under the hood and return `Promise<any>`. The same `unknown`-by-discipline rule applies — pair every `.json()` with a Zod parse in the same expression. The canonical request-handler shape is `const body = invoiceWebhookSchema.parse(await req.json())`. Chapter 015 owns route-handler mechanics; this lesson installs the shape.

`<Term>` candidates in this section:
- *Zod* — Don't deep-define here. One-line hover: "The course's runtime validation library — schemas narrow `unknown` to a typed domain shape. Chapter 042 owns the full surface."

### The four serialization holes

Goal: name the four ways the JSON grammar can't carry a JS value, and the cure for each. Quick, structured, list-shaped.

Content:

- **One framing sentence.** JSON's grammar carries six value types: object, array, string, number, boolean, null. JavaScript carries richer values — `undefined`, `Date`, `BigInt`, `NaN` / `Infinity`, `Map`, `Set`, `Symbol`, functions, class instances. When `stringify` meets a value the grammar can't carry, it either *drops* it or *coerces* it. Four holes bite often enough to memorize.

- **The four holes, as a `<TabbedContent>` block.** Four tabs, one hole per tab. Each tab carries a short snippet showing what `stringify` does, one paragraph naming the cure. Group them visually so the student remembers them as a *set*.

  - **Tab 1: `undefined`.**
    ```ts
    JSON.stringify({ a: 1, b: undefined });    // '{"a":1}'         — property dropped
    JSON.stringify([1, undefined, 3]);         // '[1,null,3]'      — element nulled
    ```
    Prose: "Object properties with `undefined` values are *dropped* from the output. Array elements become `null`. The asymmetry breaks `{ a: undefined }` round-trip (the receiver sees `{ }`). Senior reflex: use `null` for 'explicitly absent in JSON', `undefined` for 'not set in TS'."

  - **Tab 2: `Date`.**
    ```ts
    const wire = JSON.stringify({ createdAt: new Date() }); // '{"createdAt":"2026-05-28T..."}'
    const back = JSON.parse(wire);
    typeof back.createdAt; // 'string' — not a Date
    ```
    Prose: "`stringify` calls the value's `toJSON()` method, which for `Date` returns an ISO 8601 string. `parse` returns the *string*, not a `Date`. The round-trip *downgrades* the type. Lesson 3 of this chapter installs the Temporal codec — the wire stays ISO 8601, the in-memory type is `Temporal.Instant`."

  - **Tab 3: `BigInt`.**
    ```ts
    JSON.stringify({ id: 9_007_199_254_740_993n }); // TypeError: Do not know how to serialize a BigInt
    ```
    Prose: "`stringify` throws `TypeError` on a `BigInt`. Two senior reaches: (a) model the value as a *string* at the schema boundary (every Stripe ID and every 64-bit Postgres id is a string in the domain type), or (b) provide an explicit `replacer` that calls `.toString()`. The first is the default; the second is the carve-out for value types that genuinely need `bigint` arithmetic."

  - **Tab 4: `NaN` / `Infinity` / `-Infinity`.**
    ```ts
    JSON.stringify({ ratio: NaN, max: Infinity }); // '{"ratio":null,"max":null}'
    ```
    Prose: "Non-finite numbers serialize as `null`. The bug class is 'an analytics field came back null after the math overflowed'. The cure is to validate at the math site, not at the serializer — a Zod `.refine(Number.isFinite)` on numeric fields stops the bad value before it reaches the wire."

- **The silent-drop table, one short paragraph + tight list.** Beyond the four holes, three more silent drops worth naming once (no per-snippet depth):
  - **Functions, `Symbol` keys, `Symbol` values** — dropped from objects; functions become `null` in arrays.
  - **`Map` and `Set`** — serialize as `{}` (empty object), not as their entries. Reaching for `JSON.stringify(map)` and expecting a `Map` back is a category error.
  - **Cyclic references** — throw `TypeError: cyclic object value`. Lesson 1 of chapter 001 introduced `structuredClone` as the deep-clone reach — that's the right tool for clone, not `JSON.parse(JSON.stringify(...))`.

- **Class instances, one sentence.** `stringify` writes the instance's *own enumerable properties*; methods, getters, and `#private` fields disappear. Lesson 2 of this chapter covers when to reach for `class` and how to expose a `toJSON()` method when the wire shape matters. Forward-link, no dwell.

### `reviver` and `replacer`, narrowly

Goal: name the two hooks, the one legitimate use case each, and Zod's `transform` as the preferred type-reconstruction path. Tight section, not a deep dive.

Content:

- **One framing sentence.** `JSON.parse(s, reviver)` and `JSON.stringify(value, replacer, space)` both accept a second-argument hook that walks the value bottom-up. Both are reach-for-narrowly tools: they live at the boundary, not in domain code.

- **The senior rule.** Prefer Zod's `transform` over `reviver` for type *reconstruction*. The schema owns the contract; the reviver lives apart and drifts. Two cases where each hook still earns its weight:

- **`reviver` — the prototype-pollution defense.** One short `<Code>` block:
  ```ts
  const safeReviver = (key: string, value: unknown): unknown => {
    if (key === '__proto__' || key === 'constructor') return undefined; // strip
    return value;
  };
  const parsed: unknown = JSON.parse(rawJson, safeReviver);
  ```
  Prose: "Crafted JSON can include `__proto__` and `constructor` keys; an unguarded `Object.assign({}, parsed)` into a target object then mutates the prototype chain. The reviver strips those keys *before* any consumer sees the parsed value. In 2025, this attack vector hit major SDKs (notably Axios's `parseReviver` gadget) — defensive parsing is the cheap fix. Inside the project, `parseJson` (next section) wraps the safe reviver once, so every call site is protected."

- **`replacer` — log-site field redaction.** One short `<Code>` block:
  ```ts
  const redact = (key: string, value: unknown): unknown =>
    /password|token|secret|authorization/i.test(key) ? '[REDACTED]' : value;

  logger.info('webhook received', JSON.stringify(payload, redact));
  ```
  Prose: "The replacer walks every key and substitutes redacted strings before serialization. This is the right reach when logging untrusted payloads — the redaction lives at the *log site*, not scattered across the codebase. Chapter 092's pino wiring centralizes redaction at the logger; this snippet is the inline form."

- **Everything else: Zod `transform`.** One sentence. "When the goal is *type reconstruction* — parsing an ISO string back to `Temporal.Instant`, a number-as-string back to `BigInt`, a date-string back to `PlainDate` — the contract belongs on the schema. Chapter 042 owns the `z.iso.datetime().transform(s => Temporal.Instant.from(s))` shape; reaching for `reviver` to do the same is duplicating the contract."

### The `parseJson` helper

Goal: install the lesson's structural payoff — the one helper every wire boundary in the codebase imports.

Content:

- **One framing sentence.** The two-step seam (parse to `unknown`, narrow with Zod) lives once in `lib/json.ts`. Every wire boundary imports it; no caller writes `JSON.parse` and a schema parse separately.

- **The shape, one labeled `<AnnotatedCode>` block, three steps.**

  ```ts
  // lib/json.ts
  import type { ZodType } from 'zod';

  const safeReviver = (key: string, value: unknown): unknown => {
    if (key === '__proto__' || key === 'constructor') return undefined;
    return value;
  };

  export const parseJson = <T>(raw: string, schema: ZodType<T>): T => {
    const parsed: unknown = JSON.parse(raw, safeReviver);
    return schema.parse(parsed);
  };
  ```

  Step 1 (highlight the `safeReviver` lines, `color="orange"`): **The prototype-pollution defense lives at the seam.** Every parse runs through the same reviver — `__proto__` and `constructor` keys are stripped before the schema sees the value. No call site can forget.

  Step 2 (highlight the `JSON.parse(raw, safeReviver)` line, `color="blue"`): **Parse to `unknown`.** Explicit `: unknown` annotation refuses the `any` leak. Throws `SyntaxError` if `raw` isn't valid JSON — the caller (route handler, Server Action wrapper) catches at the transport layer.

  Step 3 (highlight the `schema.parse(parsed)` line, `color="green"`): **Narrow with the schema.** `schema.parse` throws on shape mismatch (chapter 042 covers `safeParse` for the recoverable form). The returned `T` is typed and validated — business logic reads `body.amount` with full guarantees.

- **One short paragraph: the call sites.** Every wire boundary in the codebase reaches for this. A route handler: `const body = parseJson(await req.text(), webhookSchema)`. A `localStorage` read: `const draft = parseJson(localStorage.getItem('draft') ?? '{}', draftSchema)`. A Server Action body (chapter 043 wraps `FormData` differently — name once, do not preview). The seam is one import; the discipline is uniform.

- **Forward-link, one sentence.** Chapter 042 owns the Zod schema surface — `z.iso.datetime()`, `z.coerce.number()`, `.transform()`, `.safeParse()`. This lesson installs the *seam*; chapter 042 fills in the schemas.

### Watch-outs

Goal: collect the small traps that don't fit elsewhere into one tight list. Each item is one line.

Content:

- **One framing sentence.** A handful of small footguns the lesson hasn't fit elsewhere. Memorize the list.

- **The list, as a small bulleted block.**
  - **`JSON.parse(JSON.stringify(x))` is not deep-clone.** It misses `Date`, `Map`, `Set`, `Symbol`, `undefined`, `BigInt`, and cycles. `structuredClone(x)` from lesson 1 of chapter 001 is the reach.
  - **Catching `SyntaxError` at every call site is noise.** The transport-layer wrapper (route handler, Server Action wrapper) owns it. Domain code calls `parseJson` and lets the throw bubble.
  - **`JSON.stringify(value, null, 2)` pretty-prints, but only in dev.** Production responses and log payloads use no `space` argument — pretty-printed JSON inflates payload size 1.5–2×.
  - **Don't `JSON.stringify` as a content-hash input.** Key order matches insertion order (V8's rule), but it's not specified — different runtimes can disagree. Reach for `fast-json-stable-stringify` or a sorted-keys canonicalizer when the hash is the lesson.
  - **JSON is fast enough.** The bandwidth tangent: in 2026 SaaS, JSON over HTTP/3 with brotli is the default. MessagePack / Protobuf / BSON are real wins at the profiler's altitude, not at the lesson's. Named once, dismissed.

### Practice

Two exercises, in this order. The first checks the holes (the lesson's center-of-gravity recall); the second checks the discipline (do you spot the unsafe parse).

#### Exercise 1 — What does `stringify` do?

A `<PredictOutput>` exercise. Five short snippets, each calling `JSON.stringify`. The student predicts the output. Use the exercise to *cement* the four holes plus one silent-drop case.

Snippets (the writing agent fills in the exact output strings):

1. `JSON.stringify({ a: 1, b: undefined, c: 3 })` → `'{"a":1,"c":3}'` (property dropped).
2. `JSON.stringify([1, undefined, 3])` → `'[1,null,3]'` (element nulled).
3. `JSON.stringify({ ratio: NaN })` → `'{"ratio":null}'` (non-finite → null).
4. `JSON.stringify(new Map([['a', 1]]))` → `'{}'` (Map → empty object).
5. `JSON.stringify({ createdAt: new Date('2026-05-28T00:00:00Z') })` → `'{"createdAt":"2026-05-28T00:00:00.000Z"}'` (Date → ISO string via `toJSON`).

Format: each snippet is its own card; the student types the predicted output; the grader checks string equality (whitespace-trimmed). The exercise withholds the expected output on the first wrong attempt — typical `<PredictOutput>` behavior.

Optional `instructions`: `"For each snippet, type the exact string JSON.stringify returns. Expect serialization holes."`

Pedagogical goal: the holes become *recallable*, not just recognized.

#### Exercise 2 — Spot the unsafe parse

A `<CodeReview>` exercise. The student reviews three small files, each containing one defect at the JSON wire boundary. Inline review comments are graded against a short `kernel` rubric phrase.

Three files:

- **File 1: `app/api/stripe/webhook/route.ts`** — trusts the parse. The handler reads `data.amount` and `data.invoiceId` off a raw `JSON.parse` with no schema validation.
  ```ts
  export const POST = async (req: NextRequest) => {
    const raw = await req.text();
    const data = JSON.parse(raw);              // returns any
    await chargeInvoice(data.invoiceId, data.amount); // shape unchecked
    return new Response(null, { status: 200 });
  };
  ```
  `kernel`: "trusts the parse — `JSON.parse` returns `any`, the shape must be narrowed with a Zod schema before reading fields".
  `<ReviewIssue>` slot reveal: "Wrap the parse with `parseJson(raw, webhookSchema)` — the wire is `unknown` until validated. Reading `data.invoiceId` off a raw parse lets a malformed webhook poison the database."

- **File 2: `lib/billing/audit.ts`** — `JSON.parse(JSON.stringify(x))` for deep-clone of an invoice with a `Date` field.
  ```ts
  const archived = JSON.parse(JSON.stringify(invoice)); // loses Date type
  archived.createdAt.getFullYear(); // runtime error — string has no getFullYear
  ```
  `kernel`: "JSON round-trip for deep-clone — downgrades `Date` to string; reach for `structuredClone` instead".
  `<ReviewIssue>` slot reveal: "`JSON.parse(JSON.stringify(...))` is not deep-clone. It downgrades `Date` to a string, drops `undefined`, drops methods, and throws on cycles. Use `structuredClone(invoice)` (chapter 001) — the platform's structured-clone algorithm preserves `Date`, `Map`, `Set`, `BigInt`, and typed arrays."

- **File 3: `lib/integrations/legacy.ts`** — `JSON.stringify` of an object containing a `BigInt` (a Stripe-style 64-bit ID).
  ```ts
  const payload = { id: 9_007_199_254_740_993n, status: 'paid' };
  const body = JSON.stringify(payload); // TypeError at runtime
  ```
  `kernel`: "`JSON.stringify` throws on `BigInt` — model the ID as a string in the schema, or pass an explicit `replacer`".
  `<ReviewIssue>` slot reveal: "`JSON.stringify` throws `TypeError` on a `bigint`. The senior reach is to model Stripe IDs (and any 64-bit Postgres id) as strings in the domain type — the schema validates the format, the wire stays as text. Fallback when arithmetic is needed: a `replacer` that calls `.toString()`."

Add a `<ReviewWhy>` at the end: "The three defects are the three traps this lesson named — trusting the parse, JSON-as-deep-clone, and `BigInt` at the serializer. The cure for all three lives at the seam: parse with a schema, clone with `structuredClone`, model 64-bit IDs as strings."

Pedagogical note for the writing agent: the `kernel` strings are what the AI grader reads — keep each as a single sentence naming the defect; the slot text is the fuller reveal.

### Closing

One short paragraph that returns to the senior question and ties off.

- Restate: every JSON crossing has the same shape — a string on the wire, an `unknown` after the parse, a typed domain value after the schema. **The wire is `unknown` until validated.** The reading reflex is one question — *what is the shape of the parsed value?* — and the answer is always: it's `unknown` until a schema narrows it. The `parseJson` helper makes the discipline a one-import seam.
- Forward, one sentence: lesson 2 of this chapter turns to the *receiving* side — what `class` is good for once records and functions own most of the surface; lesson 3 closes the chapter with the `Date` → `Temporal` pivot, which is one of the schemas the next chapter wires through `parseJson`.

### External resources

`CardGrid` with two `ExternalResource` cards. Keep tight.

- **MDN — `JSON.parse`** (`https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse`). The canonical reference for the parse signature, the reviver hook, and the `SyntaxError` behavior.
- **fastify/secure-json-parse** (`https://github.com/fastify/secure-json-parse`). Production-grade drop-in replacement with prototype-poisoning protection — the writing agent should describe it as "the library form of the safe reviver shown in this lesson; reach for it when the threat model is strict, otherwise the inline reviver is enough".

Optional: a `<VideoCallout>` only if the writing agent finds a 2024+ talk on JSON-at-the-boundary discipline. Skip otherwise — the lesson's altitude is discipline + recall.

## Components, diagrams, exercises — summary roll-up

- **Code blocks.** Plain `<Code>` for the safe reviver, the replacer, the `parseJson` call sites. `<AnnotatedCode>` for the `parseJson` helper shape (3 steps, orange / blue / green). `<CodeVariants>` once — the parse wrong/right shape (2 tabs, `syncKey="parse-shape"`). `<TabbedContent>` for the four serialization holes (4 tabs). No `<CodeTooltips>` needed.
- **Diagrams.** One `<Figure>` wrapping a small horizontal HTML+CSS diagram of the four wire directions converging on one codec. The figure is the lesson's single visual anchor.
- **No custom component required.** The lesson is snippet-heavy and recall-heavy; no widget needs building.
- **Exercises.** One `<PredictOutput>` (five `stringify` snippets) and one `<CodeReview>` (three unsafe wire-boundary files). The `PredictOutput` cements the holes; the `CodeReview` cements the discipline.
- **Tooltips (`<Term>`).** *wire* (in the four-directions section), *Zod* (in the `unknown`-narrow section; one-line hover, full surface deferred to chapter 042). Two tooltips, both introduced in the lesson's first half. Recall `unknown` from chapter 005, `structuredClone` from chapter 001, `Result` from chapter 008 — plain inline mentions, no re-tooltip.
- **Video.** None planned. Lesson's altitude is discipline + recall; a video would dilute.

## Scope

What this lesson does **not** cover:

- **Zod schema authoring, `z.iso.datetime()`, `z.coerce`, `.transform()`, `safeParse` vs `parse`.** Chapter 042 owns the full Zod surface. This lesson uses `schema.parse(parsed)` as one line and forward-links the rest.
- **`Request.json()` / `Response.json()` mechanics, content-type discrimination, status codes.** Lesson 1 of chapter 015 owns route-handler mechanics. This lesson uses `.json()` once and moves on.
- **Server Action body parsing and the `safeAction` wrapper.** Chapter 043. The Server Action site is named in the opener as one of the four directions, no deeper.
- **Structured logging, pino, redact-at-the-logger.** Chapter 092. The replacer example is the inline form; pino wiring lands later.
- **`structuredClone` and shared-reference semantics.** Lesson 1 of chapter 001. Named once as the deep-clone reach.
- **`BigInt` arithmetic and Postgres's `bigint` column type.** Lesson 3 of chapter 001 (`bigint` type), chapter 037 (Postgres column type). Named once at the `bigint` hole.
- **`localStorage` and storage round-trips at depth.** Lesson 4 of chapter 016. Named as one wire direction, no deeper.
- **The `Date` → `Temporal` pivot at depth.** Lesson 3 of this chapter. The `Date` hole is named with the round-trip downgrade shape; the codec lands in lesson 3.
- **Custom `toJSON()` on class instances.** Lesson 2 of this chapter. One forward-link sentence.
- **RFC 9457 Problem Details and JSON error bodies.** Lesson 2 of chapter 011 / lesson 2 of chapter 046. Out of scope; this lesson is about success-path codecs.
- **Streaming JSON parsers (`oboe`, `stream-json`).** Niche; named only as the "JSON larger than memory" carve-out — not deep-dived.
- **JSON5, JSONC, NDJSON, MessagePack, Protobuf, BSON.** Named once in the bandwidth tangent and dismissed.

## Code conventions alignment

Skimming the relevant sections of `Code conventions.md` (TypeScript, Function form, Schemas with Zod 4, Logging):

- **TypeScript.** Snippets are `.ts` shape. `strict: true` assumed. The `JSON.parse` return value gets an explicit `: unknown` annotation — this is a *deliberate divergence* from `any` to signal the senior discipline. The `parseJson<T>` helper uses a generic constrained by `ZodType<T>` — matches the convention's generic-constraint preference.
- **Function form.** Arrow functions bound to `const` for every helper (`parseJson`, `safeReviver`, `redact`). No `function` keyword.
- **Schemas with Zod 4.** The lesson defers the schema surface to chapter 042 but uses the convention's vocabulary — `schema.parse` for trusted server-internal calls, `schema.safeParse` named once for recoverable validation (forward-link). Format-builder names (`z.iso.datetime()` etc.) appear only as one-line forward references in the `reviver`/`replacer` section.
- **Naming.** `parseJson` matches verb-led pure-helper convention. `safeReviver`, `redact` are intent-named. `webhookSchema`, `draftSchema`, `invoiceWebhookSchema` match the `<entity>Schema` convention. No `helper`, `util`, `data2`.
- **Error handling.** The route-handler snippet uses `parseJson(await req.text(), schema)` without local catch — the transport wrapper owns the catch. This matches lesson 1 of chapter 008's catch-placement rule.

Pedagogical divergences from conventions:

- The lesson uses placeholders (`chargeInvoice`, `invoiceWebhookSchema`, `draftSchema`) where production code would have full implementations. The lesson is about the JSON seam, not the schemas it composes with — keep snippets terse.
- The `logger` in the redaction example is hypothetical; pino wiring lands in chapter 092. The placeholder is fine for the boundary-discipline lesson.
- The Server Action / route-handler / webhook references are *altitude-only* — the student hasn't met them yet. Forward-links are explicit (chapter 043, chapter 015, chapter 046) so the writing agent doesn't drift into preview territory.

## Estimated student time

35 to 45 minutes (matches the chapter outline estimate). The four directions + `unknown`-narrow + the four holes are the time sinks; the reviver/replacer section, the `parseJson` helper, and the watch-outs move quickly. The two exercises (PredictOutput + CodeReview) add another 10–15 minutes of practice.

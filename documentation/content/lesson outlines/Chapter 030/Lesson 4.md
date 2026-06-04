# Lesson 4 — What crosses the RSC wire

**Title:** What crosses the RSC wire
**Sidebar label:** What crosses the wire

---

## Lesson framing

This lesson cashes the cheque written twice already: L1 ("what actually crosses that wire... is a lesson of its own, two ahead") and L3 ("exactly what crosses the wire → L4").
The student can already place `'use client'` / `'use server'` / `server-only` and knows *where* the boundary is.
This lesson teaches *what passes through it* — the contract on the data that flows Server → Client as props.

**The one mental model to leave with:** the RSC wire is `structuredClone` + a short list of React extensions.
The student already met `structuredClone` in Ch 001 L1 (copying objects, what it can and can't clone) — this lesson is that exact algorithm resurfacing as a network protocol, plus four React-specific additions (Promises, JSX, Client/Server Component references, Server Action references).
Anchoring to the prior `structuredClone` knowledge is the single highest-leverage pedagogical move; the student isn't learning a new rule, they're recognizing an old one in a new place. Lead with this.

**Two senior payoffs frame the whole lesson (state both up front):**
1. **The error you'll hit on day one** — passing a callback (`onClick={handleClick}`) from a Server Component fails immediately. Students hit this within an hour of writing their first interactive page. The lesson makes that error legible *before* they meet it, and names the two correct moves (Server Action reference, or move the handler inside the Client Component).
2. **The leak that has no error** — secrets/over-wide objects in props ship to the browser silently and are readable in DevTools. L1 planted this ("server code is a vault; props are a postcard"); this is where it gets shown in full with the actual fix (slice the object to the fields the UI needs). This is the highest-stakes idea in the chapter; the asymmetry from L1 (loud failures vs. silent leaks) pays off here — the wire **rejects** functions loudly but **accepts** an over-wide object silently.

**Teaching stance.** Pure recognition + reasoning, no live App-Router coding (Ch 029/030 iframe constraint persists — see Misc). The wire is invisible plumbing, so the lesson's job is to make it *visible*: one diagram of what the payload physically is, one categorized reference of what crosses, and exercises that drill the sort "does this value survive the wire?" plus "is this prop a leak?". `PredictOutput`-style "what error / what crosses" checks fit perfectly because the rules are deterministic.

**Cognitive-load order:** (1) what the payload *is* (concrete, demystify) → (2) the baseline = structured clone (anchor to known) → (3) React's four extensions (add complexity) → (4) the rejection list + the two function moves (the failures) → (5) the secrets/wide-data leak (the stakes). Each section adds one layer to the model.

**Domain continuity:** stay in invoices. Reuse `getInvoice(id)` / `listInvoices()` data stubs (`// data layer: Unit 5`), the `mark-paid-button.tsx` client leaf, and the server=cool / client=warm colour language from L1/L2/L3. The canonical leak example is passing a full invoice row (with internal/financial fields) when the button only needs `{ id }`.

**Forward-pointers to honor (do not teach here):** Server Actions in full → Ch 043 (the action reference is named as "the only function-like value that crosses," body stays a stub); `React.use()` + Suspense + the Promise-streaming pattern → Ch 031 (Promises-cross is taught as *what*, the *consumption* is deferred); Error serialization / `error.tsx` → Ch 031 + Ch 080; full caching → Ch 032; hydration → L5 (next).

---

## Lesson sections

### Introduction (no header)

Open with the day-one scene, in invoices terms: the student has a server-rendered invoice page (from L1) and a `MarkPaidButton` client leaf (from L2/L3). They wire the obvious thing — pass an `onClick` handler from the page down to the button — and the build throws.
Show the shape of the failure in prose, name that this lesson is the contract that explains it, and connect back: "L1 told you props sent to the client are a postcard, not a vault; L3 told you `'use client'` marks the boundary but never checks what crosses it. This lesson is what crosses it."
Preview the two payoffs (the day-one error, the silent leak) and the one model (structured clone + React extensions). Keep warm and brief per pedagogical guidelines.

Reasoning: the senior question ("what can these props contain, and why does passing a callback fail?") is stated implicitly through the concrete failure, satisfying "decisions before syntax."

---

### What the RSC payload actually is

**Goal:** demystify the wire from "magic" to "a serialized data stream" before any rules land. Without this, the serialization rules feel arbitrary.

Content:
- The server renders the Server Component tree to a **payload** (the RSC payload, named once in L1, now opened). It is not HTML alone — it's a stream of instructions: "render this Client Component (referenced by an ID) with these props," "here's resolved JSX," "resolve this Promise with this value."
- The Client Component placeholders in that stream carry **their props serialized into the payload format**. That serialization step is the whole subject of the lesson — props have to be turned into something that survives a network trip and rebuilds on the other side.
- The browser receives HTML (for instant paint) **plus** this payload (to reconcile the React tree). The payload is a regular network response — **visible in DevTools**. Plant this fact here; the leak section cashes it.
- `Term`-define **RSC payload** (the serialized React tree the browser uses to reconcile, distinct from the HTML). Keep it to the depth needed; the streaming/flush mechanics are Ch 031.

**Component:** a `Figure` wrapping a simple **annotated illustration (HTML + CSS)**, NOT a system graph. Three stacked lanes leaving the server box toward a browser box: lane 1 "HTML" (→ instant paint), lane 2 "RSC payload" (→ reconcile the tree), and a callout on the payload lane reading "props serialized here — this lesson." Server box cool-tinted, browser box warm-tinted (chapter colour language). Pedagogical goal: locate *where in the request* serialization happens, so the rules feel like they describe a real artifact. Keep height compressed, horizontal layout (laptop-viewport rule).

Reasoning: students struggle with serialization rules because the payload is invisible. Making it a concrete, DevTools-visible artifact first turns the rest of the lesson into "rules about this thing you can see."

---

### Structured clone: the baseline you already know

**Goal:** collapse most of the "what crosses" rules into one already-owned concept.

Content:
- State the headline: the set of values the wire carries is **`structuredClone` plus React extensions**. The student met `structuredClone` in **Ch 001 L1** — explicitly call this back ("the same algorithm that deep-copies an object, minus functions and DOM nodes — it's back, now as a network format").
- Enumerate the structured-clone-compatible values that cross (sourced from `react.dev/reference/rsc/use-client`, current): primitives — `string`, `number`, `boolean`, `null`, `undefined`, `bigint`, and `symbol` **only** when registered via `Symbol.for` (a `Symbol('x')` does not cross); iterables of serializable values — `String`, `Array`, `Map`, `Set`, `TypedArray`, `ArrayBuffer`; `Date`; **plain objects** (object-initializer / `{}` shapes with serializable properties).
- Two notes that prevent the common wrong mental model:
  - **`Map` and `Set` cross directly.** Older RSC required converting them to arrays; current React serializes them natively. Senior reach (note, don't belabour): still prefer a plain array/object when the consumer doesn't need the `Map`/`Set` API — one fewer moving part. (Aligns with code conventions: prefer plain shapes.)
  - **"Plain object" is load-bearing.** It means `{}`/object-literal shape. A Drizzle row read from the DB is a plain object → crosses fine. The instant an object carries a custom prototype, it's out — which is the next section.

**Component:** `Buckets` exercise (the chapter's recurring recognition check; iframe-safe). Two buckets: **"Crosses the wire"** vs **"Does not cross."** Items mix this section's accepted values with the rejection list from the next section, so the drill spans both (place the exercise here OR at the end of the rejection section — author's call; one consolidated `Buckets` is cleaner than two). Items: `string`, `Date`, `Map`, `new Uint8Array([...])`, a `{ id, total }` object literal, `BigInt(10n)` / `bigint`, `() => {}` (function), a `new Invoice()` class instance, `Symbol('x')`, `Symbol.for('x')`, `document.body` (DOM node), a Drizzle invoice row. Use inline-code chips. This is the lesson's primary understanding check.

`CodeTooltips` candidate: a short `tsx` snippet of a Server Component passing a spread of legal props (`<MarkPaidButton id={invoice.id} createdAt={invoice.createdAt} tags={new Set(...)} />`) with tooltips on `createdAt` ("Date — crosses, structured-clone built-in") and `tags` ("Set — crosses natively, no array conversion needed"). Keeps the definitions inline without breaking flow.

Reasoning: anchoring to `structuredClone` is the lesson's core teaching move — minimizes new load by reframing as recognition. The `Buckets` drill is the cheapest high-signal check that the student can now *sort* values, which is the practical skill.

---

### React's four extensions on top

**Goal:** add the React-specific values that structured clone alone doesn't cover, so the model is complete.

Content — four extensions, each one sentence of *what* + where the full treatment lives:
- **Promises.** A Server Component can pass a `Promise<T>` as a prop; the Client Component consumes it (the "start the fetch on the server, render the client shell now, resolve later" pattern). Name `React.use()` + Suspense as the consumption mechanism but **defer to Ch 031** — here it's only "Promises cross."
- **JSX / Component elements.** Already-rendered Server output can be passed as a prop or `children` to a Client Component, which renders it opaquely (it never sees the source). This is the **"wrap, don't import"** pattern from L1 viewed from the wire side: the Server tree crosses as serialized JSX inside the payload. Reuse the L1 one-liner.
- **Client/Server Component references.** The payload carries *references* (IDs) to Client Components, not their code — the code was already bundled for the browser; the payload just says "mount component #N here." (This is the mechanism behind the illustration in the first section.)
- **Server Action references.** A `'use server'` function crosses as an **opaque ID**, not as a function body. This is the bridge to the next section's "two ways to pass a function." Full action surface → Ch 043; here it's named as the one function-like value the wire carries.

**Component:** `AnnotatedCode` over one Server Component that passes one of each extension to a client shell — e.g. an `<InvoicePanel>` (client) that receives `dataPromise={getInvoice(id)}` (Promise), `header={<InvoiceHeader id={id} />}` (JSX, server-rendered), and `onMarkPaid={markPaidAction}` (Server Action reference). Steps: (1) the Promise prop, blue — "crosses as a Promise, resolved client-side (Ch 031)"; (2) the JSX prop, blue — "server-rendered tree, passed opaquely — wrap-don't-import from the wire side"; (3) the action prop, green — "a `'use server'` reference, the only function-like value the wire carries." Keep action body a stub (`// mutation logic: Ch 043`). `maxLines` ~14. Goal: one concrete artifact shows all four extensions live, with the student's focus directed to each in turn.

Reasoning: extensions are the genuinely React-specific part — they need their own beat after the structured-clone baseline, but each only needs naming + a forward-pointer, not depth (depth lives in Ch 031/043). `AnnotatedCode` is the right tool: one block, attention steered to multiple parts.

---

### What gets rejected, and the two ways to "pass a function"

**Goal:** the failure list and the canonical day-one fix. This is the section the introduction's broken `onClick` pays off in.

Content:
- **The rejection list** (what does NOT cross): functions/closures (a server closure can't meaningfully run in the browser); **class instances** and any object with a **custom prototype** or **null prototype** (the class lives on the server; the wire has no constructor to rebuild it); DOM nodes; non-globally-registered `Symbol`s; `WeakMap`/`WeakSet`. Errors cross only partially (message survives, not the full object) → defer error handling to Ch 031 + Ch 080, just name it.
- **The two canonical error messages** (the legibility payoff). The writer must surface the *real, current* error strings — verify against a live `next build` / React 19 rather than hard-coding, but the known shapes are:
  - Functions → an error stating a function that isn't a Server Function / not exported from a `'use client'` module can't be passed.
  - Class instances → **"Only plain objects, and a few built-ins, can be passed to Client Components from Server Components. Classes or null prototypes are not supported."** Note the wording differs by direction — the **Server Action** args variant reads "...passed to Server Actions..." — so quote the *Client-Component* form for this lesson's prop examples. (Historical churn to avoid: an old variant said "Date objects are not supported" before Date became serializable; null-prototype objects once triggered a false warning. Don't reproduce either.)
  Teach the student to *read* these, not memorize them — the message names the offending prop.
- **The two ways to pass a function** (the centrepiece resolution, framed as a decision):
  - **Wrong:** a regular function defined in the Server Component passed as `onClick`/`onSomething` → immediate error (this is the intro's failure).
  - **Right, option A — move the handler into the Client Component.** If the behaviour is pure client interaction (toggle, open a modal), it belongs in the `'use client'` leaf, defined with `useState`/local handlers — nothing needs to cross. This is the *most common* correct answer and students over-reach for Server Actions when this suffices. State it first.
  - **Right, option B — make it a Server Action.** If the function must run on the server (a mutation), define a `'use server'` action and pass its **reference**; the wire carries the opaque ID, the client invokes it via a generated fetch. Full mechanism → Ch 043.
- **Class instances — the canonical data failure**, in invoices terms: a Drizzle invoice row is a plain object → fine; a `new Date(...)` is fine (built-in); but a custom `Invoice` class instance with methods, or a `dayjs()` / `Temporal.*` value (a class instance), fails. **Senior pattern** (durable): shape data into plain objects at the DB boundary; keep behaviour on the server where the instance was created. Per code conventions: `Temporal.*` is in the rejected bucket — encode as an ISO string / epoch number at the boundary; do not assume a future React adds Temporal serialization. (Date is fine; `dayjs.Dayjs` / Temporal are not → forward-link Ch 083/087 for time handling.)

**Components:**
- `CodeVariants` for the two-ways-to-pass-a-function decision: Tab "Pass a callback (fails)" — Server Component with `onClick={handleClick}`, `del`-marked, prose names the error; Tab "Handler in the client leaf" — `mark-paid-button.tsx` with the handler local, `ins`-marked, "no crossing needed — the common answer"; Tab "Server Action reference" — page passes `markPaidAction` (stub), `ins`-marked, "for server-side work; reference crosses, body runs on the server (Ch 043)." Three tabs = the full decision in one A/B/C glance. Use red/green `data-mark-color` per pane.
- `PredictOutput`-style check is awkward here (no stdout); instead a `MultipleChoice` or short `Dropdowns`: "This Server Component passes `formatInvoice` (a function) as a prop. What happens, and what's the fix?" with the correct pairing (build error + one of the two right moves). Reinforces reading the error → choosing the move.

Reasoning: this is the section students *feel* (everyone hits the function error). Framing it as a decision with the client-leaf option **first** corrects the common over-reach for Server Actions, satisfying "what beginners get wrong in the real world." The class-instance rule is the second-most-common failure and the senior data-shaping pattern is the durable takeaway.

---

### Props are a postcard: the silent leak

**Goal:** cash L1's planted caution in full, with the fix. Highest-stakes idea in the chapter.

Content:
- The asymmetry, stated sharply (reuses L1/L3 framing): the wire **rejects** a function **loudly** (build error) but **accepts** an over-wide object **silently**. Nothing warns you. The framework guards the type contract, not the *contents*.
- Because the payload is a network response (planted in section 1), **every prop on a Client Component is readable in DevTools** — open the Network tab, find the RSC response, read the props. Demonstrate the shape with a screenshot-style description or a short illustrated payload snippet showing a leaked field in plain text.
- The invoices leak, concretely: passing the **whole invoice row** to `MarkPaidButton` when the button only needs `{ id }`. The row may carry internal fields the UI must never expose (think: internal notes, a customer's full record, an unrelated token on a joined object). Even fields that *seem* harmless widen the wire and the attack surface.
- **Never pass secrets in props** (durable rule, restates conventions line 137): DB connection strings, API tokens, password hashes, full user records. Anything reachable from a Client Component is reachable from the browser. Tie to L1's `NEXT_PUBLIC_` rule — secrets live on the server; the only env vars meant for the browser carry the `NEXT_PUBLIC_` prefix on purpose.
- **The senior pattern — pick the slice.** Pass `{ id }` (or `{ id, status }`), not the row. Two reasons, both senior: security (nothing private crosses) and wire size (smaller payload = faster). "Narrow on data," the L2 one-liner, now has its security teeth shown.

**Components:**
- `CodeVariants`, two tabs, the leak and the fix: Tab "Leaks the row" — `<MarkPaidButton invoice={invoice} />` passing the full Drizzle row, prose "the whole row is now in the browser, readable in DevTools — including fields the button never reads"; Tab "Pass the slice" — `<MarkPaidButton invoiceId={invoice.id} />`, prose "only the id crosses; the rest stays on the server." red/green panes. This is the durable artifact of the section.
- A `Figure` with an **illustrated RSC-payload snippet** (HTML + CSS, styled like a DevTools Network response body) showing the leaked-row version with a sensitive field highlighted/circled in the warm "this is in the browser now" tint. Pedagogical goal: make the abstract "it's visible" viscerally concrete — the student *sees* the secret sitting in a network response. Higher impact than prose.
- Recognition check: `Buckets` OR `Matching` — "safe to pass as a prop" vs "leak / keep on server": items like `invoice.id`, `invoice.status`, `process.env.STRIPE_SECRET_KEY`, the full `user` record, `{ id, name, email }` slice, a Drizzle row with internal fields. Drills the slice instinct.

Reasoning: this is the chapter's top-stakes lesson moment and the reason the lesson exists alongside the function-error. Framing in production stakes (a security incident in your public JS, per L1's language) matches the senior-mindset pillar. The DevTools-visible illustration is the emotional anchor that makes the rule stick.

---

### Recap / what you can now do (short)

Bulleted close (mirrors L1/L2/L3 recap style). The model in one line: **structured clone + four React extensions; functions and class instances rejected; secrets and wide objects leak silently.** The three capabilities the student now has: (1) sort any value into crosses/doesn't-cross; (2) read the two boundary errors and pick the right fix (handler-in-leaf vs Server Action); (3) catch a leak by slicing the object to the fields the UI needs.
One-sentence bridge to **L5 (hydration)**: the HTML and the payload are two transports that both reach the browser — next lesson is what happens when the browser re-runs a Client Component over that HTML and the two must agree.

---

## Tooltips (`Term` / `CodeTooltips`)

- **RSC payload** (`Term`) — the serialized React tree the browser uses to reconcile, sent alongside the HTML. (Defined in section 1.)
- **structured clone** (`Term`, brief) — the algorithm that deep-copies values across a boundary (Ch 001 callback); name it so the connection is explicit even for a student who half-remembers Ch 001.
- **Server Action** (`Term`, one line, defer to Ch 043) — a server function exposed to the client as a callable reference; named only as "the one function-like value the wire carries."
- `CodeTooltips` inline defs on `Date` / `Set` / a Server Action reference in the section-2/3 snippets (per those sections).

Avoid over-tooting: `'use client'`, `'use server'`, `server-only`, "the boundary," `Promise`, JSX are all already-owned from prior lessons/chapters — do not re-`Term` them.

---

## Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- Server vs Client Components, the default, the three composition moves, "wrap don't import" (Ch 030 L1).
- The boundary / `'use client'` marks the entry into the client subgraph (Ch 030 L2/L3).
- `'use server'` marks a Server Action; `server-only` slams the door (Ch 030 L3) — named for contrast, not re-explained.
- `structuredClone` and what it can/can't clone (Ch 001 L1) — the anchor; recall it, don't re-derive it.
- `NEXT_PUBLIC_` env rule, "secrets live on the server" (Ch 030 L1).

**This lesson does NOT cover (forward-pointers):**
- **Server Actions in full** — declaration sites, validation, `Result` shape, errors, form wiring → **Ch 043**. Every `'use server'` here is a stub; the action is named only as the function-like value that crosses.
- **`React.use()`, Suspense, streaming, the Promise-resolution pattern** → **Ch 031**. Promises-cross is taught as *what crosses*; how the client consumes them is deferred.
- **Error serialization, `error.tsx`, error boundaries** → **Ch 031 + Ch 080**. "Errors cross only partially" is named, not developed.
- **Caching / `use cache` / `cacheLife` / `cacheTag`** → **Ch 032**.
- **Hydration and mismatch failure modes** → **Ch 030 L5** (the very next lesson). The wire and the HTML are named as two transports; what happens when the browser re-renders over the HTML is L5's subject.
- **`structuredClone` in browser contexts** (`postMessage`, `IndexedDB`) → out of scope (Ch 016 in passing).
- **Time/date library handling** (`dayjs`, `Temporal` encoding patterns) → named as a class-instance failure with the ISO-string fix; depth → **Ch 083/087**.
- **`taint` APIs** (`taintObjectReference` / `taintUniqueValue`) — out of scope; the slice-the-object pattern is the taught defence. (Optional single `ExternalResource` link at most; do not teach.)

---

## Misc / constraints for downstream agents

- **Iframe constraint persists** (Ch 029/030): NO live App-Router coding exercise. Checks are recognition components only — `Buckets` (the primary crosses/doesn't-cross sort), `Matching`/`MultipleChoice`/`Dropdowns`. This is a hard constraint, not a preference.
- **Colour language:** server = cool, client = warm, reused in every figure (chapter spine from L1's `ServerBrowserSplit`).
- **Domain:** invoices throughout. Data stubs `getInvoice(id)` / `listInvoices()` flagged `// data layer: Unit 5`. Client leaf is `app/invoices/_components/mark-paid-button.tsx`. Server action stub `app/invoices/_actions.ts` (`// mutation logic: Ch 043`).
- **Error strings are load-bearing** (the legibility payoff) — the writer MUST verify the *current* React 19 / Next.js 16 error text against a live build before quoting; the strings in this outline are the known shapes as of mid-2026, not guaranteed verbatim. The teaching point is "read the message, it names the prop," which survives wording changes.
- **No custom `.astro` component is required** for this lesson — the two illustrated figures (payload lanes; DevTools-style payload snippet) are plain HTML+CSS inside `<Figure>`, consistent with the diagrams INDEX "annotated illustration → HTML+CSS." If the payload-snippet figure proves reusable, it could live at `src/components/lessons/030/4/`, but inline is acceptable.
- **External resources** (optional `ExternalResource` cards): `react.dev/reference/rsc/use-client` (the serializable-types list — the canonical source), and the Next.js docs page on Server/Client composition. One or two max.

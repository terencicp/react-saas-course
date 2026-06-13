# Lesson title

- **Title:** MSW mechanics in practice
- **Sidebar label:** MSW mechanics

# Lesson framing

This is the **mechanics** lesson that pays off the decision made in Lesson 4 ("mock the wire, not the SDK"). L4 settled *why* and *where* the boundary sits; this lesson is pure *how* — the MSW v2 API the student types every time production code makes an outbound HTTP call. The student already owns: the transaction-rollback wrapper (L1), per-worker DBs + the `setupFiles`/`globalSetup` lifecycle (L2 — and L2 already listed `server.listen()` as a `setupFiles` task, deferring mechanics here), the `signedInAs` fixture (L3), and the boundary rationale + the SDK-tower mental model + `onUnhandledRequest: 'error'` as policy (L4). This lesson does not re-argue any of that; it builds the `src/test/msw/` directory and teaches the handler/override/capture loop.

**Target student.** A junior dev who has written `fetch` and read JSON but has never stood up a request-interception layer. Strong programming instincts, weak on the specifics of "where does the body go," "why is the response empty," "why did my override leak." The lesson's job is to make MSW a *day-one reflex* with no mystery: a flat map of API surface → when to reach for it, anchored to three scenarios the student can feel (happy path, error path, retry sequence).

**Mental model to install.** A `setupServer` instance is a **switchboard for outbound requests**, living once per worker. Default handlers are the *contract* (the happy paths the suite assumes); `server.use` overrides are *exceptions* stacked for one test and stripped by `resetHandlers()`; an unhandled request is a *bug*, not a fallthrough (`onUnhandledRequest: 'error'`). Every request is a real `Request`; reading its body consumes it, so capture means `clone()`-first. The student should leave able to: stand up the server + lifecycle, write a per-third-party default-handler file, override for one test without leaking, sequence responses with `{ once: true }`, and recover + assert on an intercepted request body/headers/params after the act.

**Pedagogical spine — three scenarios, escalating.** The senior question gives three concrete needs against *one* endpoint (`POST /v1/checkout/sessions`): canned happy URL, a 400 with a specific `error.code`, three 503s then a 200. The whole lesson resolves those three in order. This keeps every API surface tied to a felt need rather than a catalog. The running domain stays Stripe `createSubscription` / `createInvoice` (chapter convention) so the student sees the same example deepen.

**Cognitive-load management.** Build the model in layers: (1) the singleton + lifecycle (the plumbing, taught once), (2) one happy handler (`http.post` + `HttpResponse.json`), (3) per-test override, (4) sequencing, (5) capture-and-assert. Each layer is the smallest runnable increment over the last. Failure injection (`HttpResponse.error()`, status codes, slow upstream) is folded into the override/sequencing sections where it belongs, not isolated as a "failures" appendix.

**Runtime constraint (important for downstream agents).** MSW needs npm + a Node test runtime and **cannot run in the `ReactCoding`/`HtmlCssCoding` same-origin iframes** (react-only). Do **not** propose a live in-browser MSW sandbox. Exercises are non-runtime, guided: `Dropdowns` over a handler skeleton, `Sequence` for the lifecycle order, `PredictOutput` for the body-consumption gotcha, `MultipleChoice` for the leak/anti-pattern reflex. All code samples are read-only Expressive Code blocks (the student runs nothing here — they internalize the shape).

**External video.** This is a hands-on API lesson where a short screencast of MSW v2 intercepting a request reinforces the loop; the resourcer should source one (see the resources section). Optional, not load-bearing.

# Lesson sections

## Three things one endpoint has to do

Introduction. Open with the senior question verbatim from the outline as a concrete, felt problem: a Stripe checkout test needs `POST /v1/checkout/sessions` to return a canned URL; a duplicate-customer test needs the *same* endpoint to return `400` with a specific `error.code`; a retry test needs three `503`s followed by a `200`. State the reach in one line: **handlers per scenario, matchers per shape, per-test overrides that don't leak** — under the discipline that the `server` lives in one place, handlers reset between tests, and an unhandled request fails loud.

Briefly recall (one sentence each, no re-teaching) the two L4 facts this lesson builds on: we mock at the network boundary so the real SDK serializer/signer/retry/parser stay under test, and `onUnhandledRequest: 'error'` is policy. Then promise the payoff: by the end, those three scenarios are three small, named blocks the student can write from memory. Preview that the lesson stands up `src/test/msw/` and resolves the three scenarios in order.

Keep warm and short. No component here.

## Standing up the server: install and lifecycle

Teach the plumbing once, so every later section can assume it.

- **Install.** `pnpm add -D msw`. One line in a `Code` block. Note MSW is dev-only — it never ships to production. (`Term` candidate: MSW — expand acronym.)
- **The server module.** `src/test/msw/server.ts` exports `export const server = setupServer(...defaultHandlers)`, spreading the default-handler arrays (next section). This is the *one place* the instance lives — emphasize the singleton: importing `server` anywhere else returns the same switchboard. (`Term` candidate: `setupServer` — Node-side request interceptor, the server-equivalent of the browser service worker.)
- **The lifecycle wiring.** In the integration `setupFiles` (the file L2 established): `server.listen({ onUnhandledRequest: 'error' })` in `beforeAll`, `server.resetHandlers()` in `afterEach`, `server.close()` in `afterAll`. Teach each line's job in one clause: `listen` boots interception; `resetHandlers` strips per-test overrides back to the defaults so nothing leaks; `close` tears down. Call out `'error'` as **the senior reach already argued in L4** — a request without a handler is a bug, not a silent 200; here it becomes the live setting.

**Component — `AnnotatedCode`** over the `setupFiles` block (the three lifecycle hooks plus the `server` import). Four steps, blue tint: (1) import the singleton `server`; (2) `beforeAll` → `listen({ onUnhandledRequest: 'error' })`, the "fail-loud" line; (3) `afterEach` → `resetHandlers()`, the "no-leak" line — flag this is the single most important line for flake prevention (forward-crumb to L8); (4) `afterAll` → `close()`. This directs attention to each hook's role without three separate blocks. `maxLines` ~12.

Note for the agent: L2 already shows this `setupFiles` registering migrations + the `withRollback` plumbing + the auth `vi.mock`. Show only the MSW additions here; reference the rest as "alongside the L2 migration setup and the L3 auth mock" rather than re-printing them.

**`Aside` (caution).** The `server` instance is a module singleton **per worker** (ties back to L2's per-worker model): two tests in the same file share it — that is exactly why `resetHandlers()` in `afterEach` is non-negotiable; across workers each has its own `server`, so files never cross-contaminate.

## Default handlers: the happy-path contract

The first of the three scenarios — the canned happy URL — and the structural home for all happy paths.

- **Per-third-party files.** `src/test/msw/handlers/` with one file per provider: `stripe.ts`, `resend.ts`, `posthog.ts`. Each exports an array of handlers covering only the happy paths the suite actually uses. Spread into the `setupServer(...)` constructor. Frame the *why*: the default array **is the contract** — "here's what we assume these services do on success." Overrides (next section) are the exceptions.
- **The `http.*` surface.** `http.get` / `post` / `put` / `patch` / `delete` / `all`. URL is a string with pathname matchers: `http.post('https://api.stripe.com/v1/checkout/sessions', resolver)` and capture segments `https://api.stripe.com/v1/customers/:customerId`. Stress: **pin the exact base URL and full path** — a pathname that doesn't match falls through to `onUnhandledRequest: 'error'` and the test fails loud (good), but a *wrong host* (regional/sandbox endpoint) silently misses.
- **The resolver and `HttpResponse`.** The resolver is `async ({ request, params }) => HttpResponse.json(body, { status })`. Show the v2 shape returning `HttpResponse` *directly* (not `(req, res, ctx) => res(ctx.json())`). Cover the response constructors the suite needs: `HttpResponse.json(body, { status })` (default 200), `HttpResponse.text(...)`, `HttpResponse.error()` for a network-level failure (used in the retry section), and the raw `new HttpResponse(body, { headers })` escape hatch — mention binary in one clause, don't dwell.

**Component — `CodeVariants`** to make the v2-vs-legacy shift concrete, because the internet is full of legacy MSW snippets the student will copy and the signature change is the #1 confusion. Two tabs:
- **`Legacy (v1)`** — `rest.post(url, (req, res, ctx) => res(ctx.json({...})))`, marked with `del=` framing. Prose: "Most pre-2024 tutorials look like this — `rest`, the `(req, res, ctx)` triple, `res(ctx.json(...))`."
- **`v2 (what we write)`** — `http.post(url, () => HttpResponse.json({...}))`, `ins=` framing. Prose: "`http` replaced `rest`; the resolver returns an `HttpResponse` directly. Translate any snippet you find to this shape."

This single A/B inoculates against the most common copy-paste failure. (`Term` candidate: MSW v2 — note the Oct-2023 `rest`→`http` rewrite so the student knows the cutoff when reading docs.)

Then a `Code` block showing `src/test/msw/handlers/stripe.ts` exporting the happy checkout handler array, and `server.ts` spreading it — the canned-URL scenario, resolved.

## Overriding for one test: server.use and unhappy paths

The second scenario — the 400 with a specific `error.code` — and the general override mechanism.

- **`server.use(...)`.** Stacks handlers on top of the defaults *for the current test*; `resetHandlers()` (already wired in `afterEach`) strips them before the next test. Teach the reflex: **happy paths live in defaults; reach for `server.use` only for the unhappy path this one test needs.** Show the duplicate-customer override returning `HttpResponse.json({ error: { code: 'resource_already_exists' } }, { status: 400 })` and the test asserting the SDK surfaced that as the mapped error.
- **The "every handler, somewhere" reflex.** A per-test `server.use` that overrides an endpoint with **no default** is a smell — it means the contract is incomplete. State this as a reviewer reflex: the default array is the contract; an override with nothing underneath it is a missing contract entry, not an exception.
- **Failure injection, folded in here.** Three failure shapes, each one line: status codes (`{ status: 503 }`) exercise the SDK's *real* retry path (the whole point of mocking the wire); `HttpResponse.error()` is a network-level failure (connection refused) that also engages SDK retry; a *slow* upstream is `await new Promise((r) => setTimeout(r, 5000))` inside the resolver — and must pair with `vi.useFakeTimers()` + `advanceTimersByTimeAsync` (cross-reference L3 of **chapter 087**, the clock seam). Keep the slow-upstream case brief; it leads into the MSW-plus-fake-timers watch-out later.

**Component — `Dropdowns` (fenced mode)** as the first check. A `server.use` override skeleton for the duplicate-customer test with three blanks: the method (`http.post` vs `http.get`), the response helper (`HttpResponse.json` vs `HttpResponse.text`), and the status (`400` vs `200`). Goal: the student assembles a correct override from the surface just taught. Low-stakes, immediate.

**`Aside` (tip).** `server.use` overrides are *additive and last-wins* — the most recently pushed matching handler answers. This is what lets a one-test override shadow a default without deleting it.

## Sequenced responses: { once: true } for retries

The third scenario — three 503s then a 200 — isolated because `{ once: true }` is the one piece of MSW behavior students reliably get wrong.

- **The handler option.** `{ once: true }` is the **third argument** to `http.*` (a handler *option*, not a method like a fictional `.once()`). A `once` handler answers exactly one matching request, then retires. Stack them for a sequence:
  ```
  server.use(
    http.post(url, () => new HttpResponse(null, { status: 503 }), { once: true }),
    http.post(url, () => new HttpResponse(null, { status: 503 }), { once: true }),
    http.post(url, () => new HttpResponse(null, { status: 503 }), { once: true }),
    http.post(url, () => HttpResponse.json({ id: 'sub_123' })),
  );
  ```
  The first three calls drain the `once` handlers in order; the fourth (and any after) hits the sticky non-`once` fallback. This models a flaky upstream and lets the test assert the SDK retried to success.
- **Why a non-`once` tail matters.** Without the final sticky handler, the fourth request falls through to `onUnhandledRequest: 'error'`. Name `restoreHandlers()` in one clause as the inverse (re-arms used `once` handlers) — mention only, don't build a scenario on it.

**Component — `AnnotatedCode`** over the four-handler stack. Steps, orange tint: (1) the three stacked `once: true` 503s — emphasize order = response order; (2) the option object `{ once: true }` as the *third arg* — call out explicitly this is not `.once()`; (3) the sticky success tail and why it must be there; (4) one line on the SDK's real retry being what's under test (callback to L4). `maxLines` ~14.

**Component — `Sequence`** with a fixed code block: the four-handler stack above as context, and steps the student orders = the response each retry attempt receives (`503` → `503` → `503` → `200 sub_123`). Reinforces the drain-in-order mental model. Keep it short (4 steps).

## Recovering the request: the clone-and-capture pattern

The capstone mechanic — asserting on what the SDK *actually sent*, which is the entire reason for boundary mocking (callback to L4: assert the wire, never the SDK method call).

- **The `seen` pattern.** Declare a capture array *inside the test* (not module scope — that would be shared mutable state, a flake source; forward-crumb L8): `const seen: Request[] = []`. In the override resolver, `seen.push(request.clone())`, then return the canned response. After the act, recover: `const body = await seen[0].text()` (or `.json()`), then assert.
- **The clone trap — taught as a hard rule.** A `Request` body is a one-shot stream. The framework (and the SDK round-trip) may consume it; reading it twice throws **"body already consumed."** `request.clone()` *before* reading is mandatory. This is the lesson's highest-value gotcha — most students hit "empty body" or the consumed-body throw on their first capture.
- **Reading the body by content type.** Stripe v1 sends `application/x-www-form-urlencoded`, so `await request.text()` (a form string like `metadata[userId]=u_1&metadata[orgId]=o_1`), **not** `.json()`. JSON APIs use `await request.json()`. Tie back to L4's point that the SDK's form-encoding is invisible to a function-level mock and only checkable here.
- **Matchers — params, search, headers.** `({ params })` for captured URL segments (`:customerId`); `new URL(request.url).searchParams.get(...)` for query strings; `request.headers.get('Idempotency-Key')` / `request.headers.get('Stripe-Version')` for SDK-generated headers (the exact headers L4 promised only the wire could verify). Assert after the test body, never inside the resolver (keep resolvers about *responding*, assertions about *verifying*).

**Component — `AnnotatedCode`** over a full capture-and-assert test for `createSubscription`: arrange (`signedInAs` from L3, inside `withRollback` from L1), the `seen`-capturing `server.use` override, the act (`await createSubscription(...)`), and the post-act assertions on body fields + `Idempotency-Key` header. Steps, green tint: (1) `const seen: Request[] = []` declared *in the test*, with a one-line note on why not module scope; (2) `seen.push(request.clone())` — the clone is load-bearing, name the "body already consumed" error it prevents; (3) `await seen[0].text()` and parsing the form body; (4) `request.headers.get('Idempotency-Key')` assertion — the payoff of mocking the wire. This is the lesson's centerpiece; it composes L1+L3 fixtures with the MSW capture so the student sees the full integration shape (a deliberate preview of L7's assembly). `maxLines` ~16.

**Component — `PredictOutput`** for the clone trap. A tiny program: a resolver that does `await request.text()` then the test does `await request.text()` again on the *same* (un-cloned) reference, logging the second result. Expected output = the thrown `TypeError: Body is already consumed` (or the empty string, depending on the minimal repro the agent lands — agent picks the cleanest demonstrable behavior and matches `expected` exactly). `PredictWhy`: a `Request` body is a single-use stream; `clone()` before the first read is the fix. This makes the gotcha stick by having the student feel the failure before being told the rule.

## When MSW fights fake timers, and when it's the wrong tool

The two interaction/decision watch-outs that don't belong to any single mechanic, taught as their own short section because they qualify the *whole* MSW setup, not one API.

- **MSW + fake timers.** MSW resolves requests through microtasks/real timers internally; a naive `vi.useFakeTimers()` that fakes everything (including `queueMicrotask`) **stalls the request forever** — the resolver never settles. Three fixes, in order of robustness (agent: verify current Vitest 4 surface before writing, this is the one moving part): (1) keep fake timers **inside the test body only** (real timers around setup/teardown); (2) `vi.useFakeTimers({ shouldAdvanceTime: true })` so the fake clock still lets real time pass; (3) the most reliable for MSW v2 — exclude `queueMicrotask` from the faked set via the `toFake` option so MSW's internals run on the real microtask queue while everything else is faked. Pair with `advanceTimersByTimeAsync` for the slow-upstream case from the sequencing section. Cross-reference L3 of chapter 087 for the clock seam itself; this section only covers the *interaction*. Frame this honestly as a known sharp edge, not a one-liner — students *will* hit a hung test here.
- **MSW vs `nock`, and don't double-mock.** One paragraph: the course pins MSW; `nock` is named once as the alternative the student will see in older codebases. MSW's edge: same API across node/jsdom/browser, declarative request matching, `onUnhandledRequest: 'error'` built in. Then the hard rule: **never combine `vi.spyOn(global, 'fetch')` or `vi.mock('node:https')` with MSW** — two interception layers is two sources of truth and produces baffling double-mock behavior. Pick MSW. (Note for agent: respects L4's accuracy constraint that the default Stripe SDK routes through `node:https`, not `fetch` — so "spy on fetch" wouldn't even catch it; the `/lib/clients` wrapper's `createFetchHttpClient()` is a Ch 13 concern and stays out of this lesson.)

**Component — `MultipleChoice`** (multi-select, ≥2 correct) as the closing reflex check: "Which of these are bugs in an MSW integration setup?" Correct: a per-test `server.use` with no `afterEach` reset; `onUnhandledRequest: 'warn'` (hides URL typos as silent 200s); combining `vi.spyOn(global, 'fetch')` with MSW; reading `request.text()` without `clone()` when also capturing. Distractor (correct *practice*, so NOT a bug): keeping happy-path handlers in the default array. This consolidates the watch-outs scattered through the lesson into one decision.

## Wrap and external resources

One short paragraph: MSW is the **day-one reflex for every outbound HTTP call** in the integration suite. Recap the loop in one breath — singleton server + lifecycle, default-handler contract, `server.use` for the unhappy path, `{ once: true }` for sequences, `clone()`-and-capture to assert the wire. Forward-crumb the immediate consumers: L6 (webhook receivers — *inbound*, a different shape), L7 (the full Server Action assembly where this capture pattern lands inside a real action test), and L8 (handler-leak as a named flake taxon).

**`ExternalResource` cards** (LinkCards): the official MSW docs `http` API page and the `setup-server` / `use()` pages (resourcer verifies current URLs). **`VideoCallout`** if the resourcer finds a current (<12 mo) MSW v2 Node-testing screencast that shows the intercept-and-assert loop — one-sentence framing, optional.

# Scope

**Prerequisites — redefine in one line each, do not re-teach:**
- Boundary-mocking rationale, the SDK-tower model, `onUnhandledRequest: 'error'` as *policy*, the ownership rule — **L4 of this chapter**. This lesson assumes them and only operationalizes the wiring.
- `withRollback` + `tx` seam — **L1**. Used in the capture-and-assert test; not explained.
- Per-worker DBs, `globalSetup` vs `setupFiles`, the integration `setupFiles` file itself — **L2**. This lesson *adds* the MSW lifecycle hooks to that file; it does not re-show migrations or pool setup.
- `signedInAs` / `anonymous` auth fixture — **L3**. Used in the centerpiece test arrange step; not explained.
- `vi.useFakeTimers()` / `advanceTimersByTimeAsync` clock seam — **L3 of chapter 087**. This lesson covers only the *MSW interaction*, not fake timers from scratch.

**Explicitly out of scope (defer, name the owner):**
- **Why** mock the wire over the SDK — L4 (this is the *how*).
- **Inbound webhook receiver testing** — signature verification, raw-body signing, `processed_events` dedupe, calling exported `POST(request)` — **L6**. Do not conflate inbound with outbound; this lesson is outbound-only. State the boundary explicitly when wrapping.
- **Full Server Action assembly** — auth fixture + tx + MSW + `revalidatePath` + `Result` assertions woven into one action test across all branches — **L7**. The centerpiece here shows the MSW *slice*; L7 owns the complete shape.
- **jsdom / browser MSW** (service-worker mode, `setupWorker`) — **chapter 089**. This lesson is Node `setupServer` only.
- **Playwright network mocking** — **chapter 090**.
- **Contract testing** (scheduled runs against the live provider sandbox) — out of scope for the chapter; name once as the thing boundary mocks are *not*.
- **The typed `/lib/clients` wrapper** and `Stripe.createFetchHttpClient()` — **chapter 13**. Mention only as the reason MSW interception is reliable in production wiring; do not build it.
- **Flake taxonomy / `resetHandlers` as flake prevention at depth** — **L8**. Forward-crumb only.
- **The `revalidateTag(tag, 'max')` two-arg Next.js 16 form** — not relevant to this lesson; ignore.

# Notes for downstream agents

- **Code conventions divergences (deliberate, flagged):** the Code-conventions Testing section still says integration tests live in `tests/integration/` — **superseded** by the chapter-086 colocation glob `src/**/*.int.test.ts` (per L1 continuity notes). All MSW test files and the `src/test/msw/` directory follow the colocated convention. The conventions' "mock the wire, not the SDK; MSW (`setupServer` + `http.*`)" line is exactly what this lesson implements — stay aligned with it.
- **Canonical names already fixed by earlier lessons** (reuse verbatim, do not reinvent): `server` from `src/test/msw/server.ts`; integration `setupFiles` from L2; `withRollback` from `src/test/db/with-rollback.ts`; `signedInAs` / `anonymous` from `src/test/fixtures/auth.ts`; `DbOrTx`. Handler files: `src/test/msw/handlers/{stripe,resend,posthog}.ts`.
- **Running domain:** `createSubscription` (Stripe outbound, introduced in L4) for the capture test; `createInvoice` / `invoices` remains the DB-side primary. Keep the one-example-deepens convention.
- **MSW v2 API verified (June 2026):** `setupServer`, `http.{get,post,…}`, resolver signature `async ({ request, requestId, params, cookies }) => HttpResponse`, resolver returns `HttpResponse` directly, `HttpResponse.json/text/error`, `server.use`, `server.listen({ onUnhandledRequest })`, `server.resetHandlers()`, `server.restoreHandlers()`, `{ once: true }` as the **third handler-option argument** (`RequestHandlerOptions`), `request.clone()`. The `rest`→`http` rewrite landed Oct 2023. Verify the exact package version against the project's lockfile before pinning any version number in prose; prefer not stating a minor version unless necessary.
- **MSW + Vitest fake-timers fix (verified June 2026):** the durable fix for the hung-request interaction is excluding `queueMicrotask` from the faked timer set (MSW v2 cannot have `queueMicrotask` faked); `{ shouldAdvanceTime: true }` is the lighter fallback. Confirm the exact `toFake`/`shouldAdvanceTime` option names against the project's pinned Vitest 4 before writing the snippet.
- **No live MSW sandbox** — `ReactCoding`/`HtmlCssCoding` iframes are react-only and cannot load `msw`. All exercises are the non-runtime guided components specified above.

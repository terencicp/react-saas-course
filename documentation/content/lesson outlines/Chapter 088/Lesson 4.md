# Mock the wire, not the SDK

Title: Mock the wire, not the SDK
Sidebar label: Mock the wire

## Lesson framing

This is a **decision lesson**, not a mechanics lesson. Its whole job is to install one principle in the student so deeply it becomes a reviewer reflex: when an integration test touches a third-party service, **mock at `fetch` (the network boundary), never at the SDK's function or class**. The mechanics of *how* (MSW `setupServer`, `http.*`, handlers) are the next lesson; this lesson owns the *why* and the *where the line sits*. The chapter outline pegs it at 30–40 min, the shortest in the chapter. Keep it tight and argument-driven — no setup ceremony, no MSW API surface beyond a single illustrative handler.

The senior question that opens it: a test does `vi.mock('stripe', ...)`, asserts the mocked `checkout.sessions.create` was called with `{ line_items: [...] }`, goes green, and ships a bug to production anyway. Why? Because the mock asserted *the function call*, not *the wire shape* — and the wire is the only contract Stripe actually enforces. The lesson's emotional hook is that **green-but-wrong test**: the most expensive kind, because it buys false confidence.

Pedagogical spine — build the argument as a descent down the stack, one layer at a time (minimize cognitive load by adding complexity gradually):
1. Establish the mental model first: every outbound HTTP call in a Node SaaS — Stripe, Resend, AI providers, internal RPC — bottoms out at one network call (an outgoing HTTP request). A diagram makes this concrete (the SDK is a tower of code sitting on top of one network call). See the accuracy constraint below — say "the network," not literally `fetch`.
2. Walk *up* that tower naming what each layer does (serialize → sign/add headers → retry → parse the response) — these are exactly the things a function-mock or class-mock throws away untested.
3. Show the two anti-patterns (mock the function, mock the SDK class) and pin a concrete shipped-bug to each.
4. Land the boundary: mock at the network, the SDK runs unchanged, the test sees what Stripe sees. (MSW intercepts the outgoing HTTP request whether the client used `fetch` or Node's `https`.)
5. Generalize into the chapter's load-bearing rule: **mock what you don't own (the network to a third party), roll back what you do own (your Postgres)** — tying this lesson back to L1's rollback pattern so the two halves of integration isolation click together.

Continuity to honor (from chapter framing + L1–L3 continuity notes):
- **Running example is `createInvoice` / `invoices`**, and the canonical third party is **Stripe** (`stripeClient.checkout.sessions.create`). Reuse, don't invent a new toy. The subscription/checkout flavor is the natural fit since it's an outbound HTTP call.
- **The seam-depth heuristic was already taught in L3** ("mock the boundary your code calls — `auth.api.getSession` — not the library's guts"). This lesson is the *same instinct applied to the network*. Explicitly call back to L3: "same reflex you used for the session stub, now for the wire." This is a powerful reuse — the student already owns the instinct, this lesson just relocates it one boundary outward.
- **MSW is named here as the tool, mechanics deferred to L5.** Show at most one tiny handler so the student can picture the destination; do not teach `server.use`, `resetHandlers`, `{ once: true }`, capturing, etc. — all L5.
- **The "mock the boundary you do own = roll back instead" half** points back to L1's `withRollback`/`tx`. The student knows it; the payoff here is unifying both into a single decision rule.
- **Stripe v1 uses URL-encoded form bodies, not JSON** (verified: Stripe's API takes `application/x-www-form-urlencoded`). This is a load-bearing, surprising detail — it's *the* example of something a function-mock can never catch and a wire-mock catches for free. Feature it.

**CRITICAL ACCURACY CONSTRAINT — read before writing the "fetch" framing.** "Bottoms out at `fetch`" is a useful *mental model* but is **not literally true of the default Stripe Node SDK**, which sends requests through Node's `node:https` module, not the Web Fetch API. Two consequences the prose must respect so it doesn't teach a falsehood:
- Frame the boundary as **"a network primitive"** (the SDK's real exit — `fetch` *or* Node's `http`/`https`), and say MSW intercepts **at that primitive**. MSW v2 (via `@mswjs/interceptors`' `ClientRequestInterceptor`) patches Node's `http`/`https` *as well as* `fetch` — so "MSW only mocks `fetch`" is wrong and must not be written. The single-exit intuition is right; the specific primitive is "the network," not literally `fetch`.
- **The default Stripe SDK's `node:https` requests are not reliably intercepted by MSW** (stripe-node issue #2211). The course-correct fix is to construct the Stripe client with `Stripe.createFetchHttpClient()` so it routes through `fetch`, which MSW intercepts cleanly. This is a property of the **typed `/lib/clients` Stripe wrapper** (Ch 13), not something this lesson configures — but the lesson's "mock the wire" claim *depends* on it. Downstream agents: keep prose true by speaking of "the network boundary," and if the project's Stripe client is shown anywhere, it must use the fetch-based HTTP client. Do **not** show the default `new Stripe(key)` and then claim MSW intercepts it — that combination silently does not work.

Mental model the student should leave with: "An SDK is just a typed convenience layer over one network call. The test's job is to verify what crosses the wire to a system I don't control. So I freeze the wire and let everything above it — my real production code, the real SDK — run. Anything *I* own (my DB), I don't freeze; I roll it back."

Tone: terse, senior, adult. No "what is an SDK." Assume the student shipped Stripe Checkout (Unit 12 / Ch 091 forward) and has written `vi.mock` (Unit 087). Lead every claim with the decision and its production stake.

## Lesson sections

### The test that passes while production breaks

Open cold on the failure, not on theory. Concrete scenario in prose: a `createSubscription` action (sibling of `createInvoice`) calls `stripeClient.checkout.sessions.create(...)`. The first instinct — and what most tutorials show — is:

```ts
vi.mock('stripe')
// ...assert the mocked .create was called with { line_items: [...] }
```

The test is green. Then Stripe rotates a field name, or the SDK starts sending a new required header, or the action passes a malformed `metadata` shape — and production 400s while CI stays green. Name *why* in one sentence the student will remember: **the mock asserted that the function was called, not that the right bytes reached Stripe.** A mock is a stand-in *you* wrote; it can only ever confirm your own assumptions, never the third party's contract.

Use a **CodeVariants** block (anti-pattern vs. the shape we're building toward) is premature here — instead keep this section to a single small **Code** block of the naive mock plus prose. Save the side-by-side for the anti-patterns section once the student understands the boundary. The goal of this opening is purely motivational: make the student feel the false confidence before we diagnose it.

Frame the senior stance explicitly: a passing test that can't fail when production fails is **worse than no test** — it costs the same to maintain and actively misleads. This is the through-line of the lesson.

Terms for `Term` tooltip in this section: **SDK** (re-explain briefly even though assumed — "a typed client library wrapping a provider's HTTP API"), **wire / on the wire** (the actual bytes — headers, method, URL, body — sent over the network; the only thing the third party observes).

### An SDK is a tower on top of one network call

The core mental-model section. Goal: replace "Stripe is a magic object with methods" with "Stripe is a stack of code whose bottom rung is a single network call." (Keep the rung labeled "the network," not literally `fetch` — see the accuracy constraint in the framing.)

**Diagram (primary teaching artifact of the lesson).** A vertical stack / annotated illustration, **HTML + CSS inside a `<Figure>`** (the "annotated illustration" shape from the diagrams index — geometric layers with callouts, not a system graph; keep it under ~800px tall). Layers top to bottom, each with a one-line callout naming what it does and (crucially) *what a function-mock skips*:

- `stripeClient.checkout.sessions.create({ ... })` ← your call (typed ergonomics)
- **Serialize** → turns the JS object into a URL-encoded form body (`application/x-www-form-urlencoded`, **not JSON** — call this out as the surprise)
- **Sign / headers** → adds `Authorization: Bearer`, `Idempotency-Key`, `Stripe-Version`
- **Retry** → on 429/5xx, retries with backoff
- **The network call** (an HTTP request — `fetch` or Node's `https`) ← the real process boundary (highlight this rung — "this is the only thing Stripe sees"). Label it "HTTP request to api.stripe.com," not literally `fetch()`, to stay accurate per the framing constraint.
- **Parse** → decodes the response body, maps error JSON to a thrown `StripeError`

Annotate the diagram with two bracket labels down the side: a bracket spanning serialize→network→parse labeled **"under test only if you mock at the network"**, and a bracket spanning the same layers labeled **"thrown away if you mock the function/class"**. The pedagogical goal: the student *sees* the surface area lost by mocking high, and sees that mocking at the network rung is the lowest point that still leaves all the SDK's real work running.

Prose after the diagram: generalize past Stripe — every outbound HTTP client in the stack (Resend SDK for email, AI provider SDKs, an internal RPC client) is the same tower over one outgoing HTTP request. The boundary is universal precisely because *the network* is the one exit every one of them shares. This is *why* a single tool (MSW, next lesson) covers all of them — MSW intercepts at that network layer regardless of which client made the call.

Consider a small **AnnotatedCode** as an alternative/companion if the diagram alone feels abstract: take the *real* shape the SDK produces and walk it — `POST https://api.stripe.com/v1/checkout/sessions`, `Content-Type: application/x-www-form-urlencoded`, body `line_items[0][price]=price_x&...`, headers `Idempotency-Key`, `Stripe-Version`. Each annotation step highlights one piece and says "the SDK generated this; your call site never wrote it; a function-mock never produces it." This makes the abstract "wire" tangible. Recommend including it — the form-encoded body especially lands harder as real text than as a diagram label.

Term tooltips: **Idempotency-Key** (a header the SDK auto-generates so a retried request doesn't double-charge), **`application/x-www-form-urlencoded`** (the form-style body encoding browsers use for HTML forms; Stripe's API speaks this, not JSON).

### Two ways to mock too high

Now diagnose the two anti-patterns precisely, side by side. **CodeVariants** with three tabs is the right component here — the student chooses between versions of the same test and reads the cost of each:

- **Tab "Mock the function"** — `vi.mock` the method / `vi.spyOn(stripeClient.checkout.sessions, 'create')`. Cost callout: asserts the call shape *you* passed in; the serializer, signer, retry, parser never run; if the SDK changes its call site the stale assertion still passes.
- **Tab "Mock the SDK class"** — `vi.mock('stripe', () => ({ default: class FakeStripe { ... } }))`. Cost callout: same trap one rung deeper. Request building, idempotency-key generation, error mapping are now all fictional. The test ships against a Stripe that doesn't exist.
- **Tab "Mock the wire"** — a *single* tiny MSW handler intercepting `POST https://api.stripe.com/v1/checkout/sessions`, returning a canned `{ url, id }`, with a one-line note "the real SDK ran; we asserted on the request it actually sent." Keep this minimal — it's a teaser for L5, not a tutorial. The point is the contrast: real code above the line, frozen bytes below it.

For each anti-pattern, pin **one concrete shipped-bug class** (the chapter outline lists them — use the strongest):
- Function-mock: SDK adds a required header (`Stripe-Version` bump) → real request rejected, mock unaware.
- Class-mock: idempotency-key generation regressed → a retried checkout double-charges in production; the fake class never generated the key, so no test could see it.

Then state the diagnostic the student carries forward, verbatim-quotable: **"if my assertion is about *which SDK method ran with what arguments*, I'm mocking too high. If it's about *what request crossed the wire*, I'm at the boundary."**

This is also the right place for a short **callback to L3's seam-depth heuristic**: same shape of mistake as mocking the JWT verifier instead of `auth.api.getSession` — too deep / too shallow are both "wrong boundary." One sentence, no re-teaching.

### Mock what you don't own, roll back what you do

The unifying rule of the chapter — the section that makes this lesson load-bearing for everything after it. Goal: collapse "two different isolation techniques" (rollback from L1, network mocking from L4–L5) into **one decision** keyed on ownership.

State the rule plainly and put it in an `Aside` (`tip`) so it's visually anchored:
> **Mock the boundary you don't own** (Stripe, Resend, AI providers, any third-party HTTP). **Roll back the boundary you do own** (your Postgres). The deciding question: *is this test exercising a contract I write, or one someone else writes?*

Then the reasoning, two halves:
- **Don't own → mock the wire.** You can't run Stripe in CI; you also shouldn't *try* to (network flake, rate limits, real charges). You freeze the wire and assert on the request. The thing under test is *your* code producing the right request — the contract you're responsible for.
- **Do own → roll back, never mock.** Your Postgres you *can* run (L1–L2 set this up). Mocking your own DB (`vi.mock` Drizzle) reintroduces exactly the class of bug L1 opened the chapter on — column renames, constraint violations, the real SQL — go invisible. So for the boundary you control, the move is the opposite: run the real thing, contain it with `tx` rollback.

**Diagram (optional, recommended): the ownership boundary.** A simple **`<ArrowDiagram>` inside `<Figure>`** (or HTML+CSS two-zone illustration): the action box in the center; an arrow down to a **Postgres** box inside a shaded "you own — roll back (`tx`)" zone; an arrow right to a **Stripe** box inside a shaded "you don't own — mock the wire (MSW)" zone. Pedagogical goal: one glance fuses the chapter's two isolation strategies onto a single picture of the action's two boundaries. This is the image the student should retain from the whole chapter.

Small **MultipleChoice** or **Buckets** exercise here to check the rule landed (see exercise note below). This section is the assessable kernel of the lesson, so a check belongs here rather than at the end.

Term tooltips: none new; reuse `tx` / rollback understanding from L1 (one-clause reminder in prose, not a tooltip).

### Assert on the request, not on the SDK

Make the principle operational so the student knows what a *correct* boundary test asserts. Keep it conceptual (full mechanics — capturing, `request.clone()`, `await request.text()` — are L5); the goal is the *assertion target*, not the API.

The shape, in prose with one illustrative (not runnable-complete) snippet: "When the user subscribes, the action must POST to Stripe with `metadata.userId`, `metadata.orgId`, and an `Idempotency-Key` header." The test:
- arranges (`signedInAs` from L3 — name it, the auth fixture is already the student's),
- acts (calls the real action),
- asserts **on the intercepted request** — its URL, method, headers, decoded body — *not* on any SDK internal call.

Contrast one more time, crisply: `expect(stripeClient.checkout.sessions.create).toHaveBeenCalledWith(...)` ❌ vs. asserting the captured request had `Idempotency-Key` and the right `metadata` ✓. Point forward: "the *how* of capturing that request — the handler, cloning the body, reading the form fields — is the next lesson."

Two boundary policies that belong with "what to assert," each a short prose beat (these are watch-outs that qualify *this* concept, so they live here, not in a tips bin):
- **`onUnhandledRequest: 'error'`** — a request with no handler must fail loud, never silently return 200. A silent 200 is the failure mode that recreates "green but wrong." (Mechanics/where-to-set-it is L5; here it's stated as the *policy* a boundary test depends on.)
- **No hand-rolled `fetch` outside `/lib/clients`** — production HTTP goes through a typed client; a raw `fetch` buried in a route handler resists clean interception and assertion. It's a **refactor target before it's a test target**. (Ties to the Code conventions data/clients layering; `/lib/clients` depth is Ch 13.)

### Boundary mocks are assumptions; contract tests catch drift

Short closing section — important for intellectual honesty and the senior frame, but keep it brief (a few sentences + one `Aside`). Goal: pre-empt the sharp student's objection — "if I hand-write the canned Stripe response, what stops it drifting from real Stripe?"

The honest answer: a boundary mock encodes *what you assume the third party does*. That assumption can rot. The senior containment is a **contract test** — a separate, scheduled (nightly) run against the provider's live sandbox that detects drift. It's far too slow and flaky for the per-test loop, so it lives outside it; one nightly run is the reach. Frame it as a deliberate trade, not a gap: fast per-test mocks for the inner loop, one slow real-network check on a schedule for drift. State plainly that **building contract tests is out of scope** for this chapter (named, not taught) so the student knows the term and the shape without expecting mechanics.

One related note in the same breath: **hand-write fixtures, don't record them.** The course default is five lines of explicit `HttpResponse.json({...})` asserting field-by-field. Recorded fixtures (HAR-style capture) bloat with fields you never assert on and rot silently. (One sentence; the *how* of writing handlers is L5.)

### Section-level component & exercise summary (guidance for downstream agents)

- **Primary diagram:** the SDK-tower (HTML+CSS annotated illustration, `<Figure>`) in "An SDK is a tower…". Non-negotiable — it carries the lesson's core model.
- **Secondary diagram:** the ownership-boundary two-zone (`<ArrowDiagram>`/HTML+CSS, `<Figure>`) in "Mock what you don't own…". Strongly recommended — it's the chapter's retain-this image.
- **AnnotatedCode** (recommended) on the real Stripe wire shape (form-encoded body + auto headers) in the tower section — makes "the wire" tangible.
- **CodeVariants** (3 tabs) in "Two ways to mock too high" — the load-bearing contrast.
- **Code** (small) for the naive `vi.mock('stripe')` in the opener and the single teaser MSW handler.
- **Exercise — recommended, one, placed in "Mock what you don't own, roll back what you do":** a **Buckets** drill. Two buckets: *"Mock the wire (MSW)"* vs. *"Run it, roll back (`tx`)"*. Items to sort: `Stripe checkout.sessions.create`, `your invoices table insert`, `Resend send-email`, `a Drizzle query against your schema`, `an OpenAI completion call`, `reading your own session row`. Grading: each item to the correct bucket; the misclassification that matters most is putting "your Postgres" into "mock" — the exact L1 anti-pattern. This drill is the cleanest possible check that the ownership rule transferred. *Alternative if a second check is wanted:* a single **MultipleChoice** — "A `vi.mock('stripe')` test asserting `.create` was called with the right `line_items` goes green. Which production failure can it still NOT catch?" with distractors (a typo in `line_items` — no, the mock sees that; **a missing `Idempotency-Key` header the SDK should have added** ✓; **the SDK switching to a new `Stripe-Version` Stripe rejects** ✓ → two correct → multi-select). Tests the exact gap the lesson names.
- **No live-coding component.** Reason (and note explicitly for downstream agents so they don't reach for one): writing a real boundary test needs MSW + the Stripe SDK in the iframe, and per the project constraint the React/Script sandboxes can't load third-party npm. This is a decision lesson; the assessable content is the *judgment*, which Buckets/MCQ check correctly. Any runnable MSW test belongs in L5's environment, not here.
- **No video** unless a resourcer finds a tight (<6 min) "mock the network boundary, not the client" talk; the argument is self-contained and the lesson is short. Treat as optional `ExternalResource`/`VideoCallout` only if a high-quality fit exists.
- **ExternalResource** (optional, end-of-lesson): MSW's "Philosophy / why intercept at the network" doc page, since it argues the same thesis from the tool author's side. One card max.

## Scope

**Prerequisites — redefine in one clause each, do not re-teach:**
- `vi.mock` / `vi.spyOn` exist (Unit 087, unit-test mocking) — assumed; this lesson shows them as the *wrong tool here*, not as new syntax.
- `withRollback` / `tx` / "run real Postgres, roll back per test" (L1) — assumed; referenced as the "you own it" half of the rule.
- `signedInAs` auth fixture (L3) — assumed; named once in the assertion section as the arrange step, not explained.
- The seam-depth heuristic ("mock the boundary your code calls, not the library's guts") was introduced in L3 — assumed; this lesson reuses it, doesn't re-derive it.
- Student has shipped a Stripe Checkout / subscription flow (Unit 12 / Ch 091 forward, and the chapter's running example) — assumed; the SDK call is familiar.

**Explicitly NOT in this lesson (defer, with pointer):**
- **MSW API surface** — `setupServer`, `http.get/post`, `HttpResponse`, `server.use`, `resetHandlers`, `{ once: true }`, request capture (`request.clone()`, `await request.text()`), failure injection, the worker-singleton model, MSW-vs-nock, MSW v2-vs-legacy. **All L5.** Show at most one tiny handler as a destination teaser; teach none of the API.
- **Where to put `onUnhandledRequest: 'error'` / the listen/reset/close lifecycle** — stated here only as a *policy*; the wiring is L5.
- **Webhook receiver (incoming) testing** — signing raw bodies, `processed_events`, idempotency replay — **L6.** This lesson is *outbound* HTTP only; do not blur inbound/outbound.
- **Server Action end-to-end assembly** (auth fixture + `tx` + MSW + `revalidatePath` + `Result` assertions in one test) — **L7.** This lesson names the assertion *target* (the request) but does not assemble the full action test.
- **Contract testing mechanics** — named as the drift-catching companion and declared out of scope; do not teach how to write one.
- **Recording fixtures / HAR capture mechanics** — mentioned only to reject in favor of hand-written; no how-to.
- **Typed `/lib/clients` design** (the Stripe/Resend/RPC client layer) — Ch 13; referenced only as "where production HTTP lives."
- **DI for `/lib` pure logic** — Ch 087; named once to contrast (DI wins for pure logic, boundary-mocking wins for integration) but not taught.
- **Browser / Playwright network mocking** — Ch 089 (jsdom) / Ch 090 (E2E); out of scope.
- **The full list of chapter-outline watch-outs that are MSW-mechanical** (`vi.spyOn(global,'fetch')` ergonomics, double-mocking MSW+fetch, pathname matcher pitfalls, regional-endpoint host mismatch) — these are L5 mechanics; here keep only the two *policy*-level ones (`onUnhandledRequest:'error'`, no hand-rolled `fetch`) because they qualify the boundary *decision*, not the API.

**Convention note for downstream agents:** the global Code conventions say integration tests live in `tests/integration/`, but Ch 086's `integration` project glob and the chapter continuity notes supersede that — integration tests **colocate** as `src/**/*.int.test.ts`. Any file path shown in this lesson follows the colocated convention (e.g. `src/server/actions/createSubscription.int.test.ts`). This lesson shows little to no file path, but if one appears, use the colocated form.

**Stripe-client accuracy flag (repeat — do not drop):** the default `new Stripe(key)` client uses Node's `node:https` and is **not reliably intercepted by MSW** (stripe-node #2211). The lesson's entire "mock the wire" thesis relies on the Stripe client being constructed with `Stripe.createFetchHttpClient()` (the typed `/lib/clients` wrapper, Ch 13). Never depict the default client and claim MSW catches it. Keep the prose at the "the network" abstraction so it stays true regardless. This is the single factual trap in the lesson; treat it as load-bearing.

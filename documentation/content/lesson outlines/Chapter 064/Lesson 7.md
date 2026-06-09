# Lesson 7 outline — When an SDK adapter earns its weight

## Lesson title

- Title: `When an SDK adapter earns its weight`
- Sidebar label: `SDK adapters`

## Lesson framing

The chapter's capstone architecture lesson and the shortest substantive one (~30–40 min). Almost no new code ships — this is a **judgment lesson**. By now the student has built two wrappers: the `billing.*` interface (L6) and `authedAction` (ch057 L2). The course also uses Resend (already met, Unit 7) and will later use Trigger.dev (ch066) and Cloudflare R2 (ch068) — three SDKs it deliberately does **not** wrap. The junior instinct is "wrap them all, for consistency." This lesson replaces that instinct with a **decidable test** so the decision is engineering, not aesthetics.

Core deliverables, in priority order:

1. **The three-question threshold.** A wrapper earns its weight only when (a) the SDK shape is read-hostile at the call site, (b) the swap cost across realistic changes is real, and (c) a discipline must be centralized. Three-of-three → an *interface* in `/lib`. Two-of-three → a *helper* at the call site. Fewer → call the SDK directly.
2. **Helper vs. interface — the line that actually matters.** This is the lesson's load-bearing nuance and where students conflate two different things. A helper simplifies *one call*; the SDK stays importable everywhere. An interface owns a *public surface*; the SDK is **forbidden** outside one directory. The discipline question — "is other code allowed to touch the SDK?" — is what separates them.
3. **The rule, applied.** Run the test across all five integrations and land the matrix: auth + billing pass three-for-three (the two carve-outs to Architectural Principle #5); Resend, Trigger.dev, R2 each fail at least one test, so they get helpers or direct calls.
4. **Why symmetry is a false goal.** Every wrapper is a maintenance surface and an indirection the reader must follow. Decision quality, not uniformity, is the bar.
5. **The dividend.** Close the open debts: the testing-seam argument forwarded from L6, plus API-version pinning, observability gravity, and the class-based-adapter thread (ch009). These are what the *two* wrappers buy that the three helpers don't — the concrete payoff that justified centralizing the discipline.

Mental model the student leaves with: **"Name the principle once, apply it twice, withhold it three times."** Wrapping is a cost you pay only when a discipline must be enforced from one place; everything else is a helper or a direct call. The student should be able to look at any new third-party SDK and run the three questions to a yes/no — and articulate *why* "for consistency" never appears in that reasoning.

Pedagogical strategy:

- **Lead with the decision, not the code.** The senior question is the whole lesson; code samples are evidence, not the subject. Keep every code block short — a representative line or two, never a full implementation (those shipped in L6 / ship in ch065).
- **Anchor on the known yes-case (billing) and the known no-case (Resend)** before generalizing. The student built both; reasoning from artifacts they own beats abstract criteria.
- **The forward-referenced SDKs (Trigger.dev, R2) appear only as call-site *shapes*** for comparison. The lesson must not teach them — one representative line each, framed as "you'll meet this properly later; here we're only reading its shape." This keeps L7 free of ch066/ch068 prerequisites.
- **Make "forbidden vs. coexist" spatial.** The helper/interface distinction is abstract until the student sees the SDK *buried* in one case and *reachable* in the other. A side-by-side layers figure carries this.
- **The interactive is the reasoning order.** A `StateMachineWalker` (decision kind) forces the student through the three questions *in the order a senior asks them* — shape, then swap cost, then discipline. The lesson lives in the order, not in any single leaf.

## Lesson sections

### Introduction (no header)

State the senior question directly. The student has shipped two wrappers (`billing.*`, `authedAction`) and uses at least one un-wrapped SDK (Resend's `sendEmail`). Frame the tension: a teammate opens a PR that wraps Resend "to match `billing`," and it looks tidy. Is it right? Name the cost of guessing — every wrapper is code to maintain and an indirection to read — and promise a test that turns the choice from taste into a decidable call. Connect to L6's closing line ("two carve-outs, silence around everything else") and tell the student this lesson names the rule behind that silence. Keep it to a few sentences; preview the three questions and the matrix.

### The three questions a wrapper has to answer

The threshold itself — the spine of the lesson. Teach the three tests precisely, each with a crisp definition and the **billing yes-case** as the anchor (the student built it in L6, so it grounds every test):

1. **Is the SDK shape read-hostile at the call site?** Does calling it directly bury the intent under structural noise? `stripe.checkout.sessions.create({ mode, customer, line_items: [{ price, quantity }], success_url, cancel_url, subscription_data: {...} })` is ~six lines of structure to express "upgrade this org to Pro." That harms the call site → yes for billing. Contrast preview: `resend.emails.send({ from, to, subject, react })` already reads as the intent → no.
2. **Is the swap cost real?** Across *realistic* changes — pricing experiments, a vendor migration — how many call sites churn? Billing call sites get rewritten every pricing experiment, and a vendor swap touches the session-creation shape everywhere → high. Name the nuance: swap cost is about *how many call sites move when the thing changes*, not whether a swap is theoretically possible.
3. **Must a discipline be centralized?** Is there a rule that has to hold at *every* call — and would otherwise be re-implemented or forgotten? Billing centralizes "must have an org," "must have a Customer," "must satisfy `requirePlan`" — and the gate (`requirePlan`) is the real payoff, the missing-call class L6 made into a single lint. → yes.

State the cut explicitly: **three-of-three → interface in `/lib`; two-of-three → helper at the call site; fewer → call the SDK directly.** This is the decidable output.

Place the **`StateMachineWalker` (`kind="decision"`)** here as the centerpiece interactive. It walks the three questions in order and ends on one of three leaves. Spec:

- `Question id="shape"`, prompt "Does the SDK's shape harm the call site?" → branches "Yes, it's structural noise" → `swap`; "No, it reads as the intent" → `swap-low` (a parallel swap-cost node framed for the low-shape path, or reuse `swap` — author may collapse to one `swap` node and let the leaf logic fall out; keep it to three real decision points).
- `Question id="swap"`, prompt "When the vendor or pricing changes, how many call sites move?" → "Many" → `discipline`; "Few / one helper covers it" → `leaf-helper`.
- `Question id="discipline"`, prompt "Is there a rule that must hold at *every* call site?" → "Yes — auth, gating, scoping" → `leaf-interface`; "No, or the SDK already enforces it" → `leaf-helper`.
- `Leaf id="leaf-interface" verdict="Interface in /lib"` — all imports route through the module; the SDK is forbidden elsewhere. Examples: `billing.*`, `authedAction`.
- `Leaf id="leaf-helper" verdict="Helper at the call site"` — a named function that simplifies the call; the SDK stays importable. Examples: `sendEmail`, `presignedPut`.
- `Leaf id="leaf-direct" verdict="Call the SDK directly"` — when the SDK is already terse *and* is itself the discipline-bearing layer. Example: a Trigger.dev `task.trigger(payload)`.

Goal of the walker: internalize that the questions have an *order* and that the answer is mechanical once you ask them. The reasoning is the lesson; the leaf is the receipt.

### Helper or interface — the line that actually matters

The load-bearing conceptual section. This is where students conflate two different things, so spend the most care here. The distinction is **not** "small function vs. big module" — it's about *enforcement*:

- A **helper** is a function (in `/lib` or co-located) that simplifies *one call*. The underlying SDK stays importable everywhere; the helper and direct calls coexist. `sendEmail` calls `resend.emails.send` directly inside itself, but nothing stops another file from importing `resend` too.
- An **interface** is a module with a stable public surface where the SDK is **forbidden outside one directory**. App code imports `billing.*`, never `stripe`. The SDK is a *transitive* dependency reached only through the seam — relevant when audit (every Stripe touch) or security (the secret-bearing client) demands it.

The decidable question: **"Is other code *forbidden* from touching the SDK?"** For Stripe and the auth library, yes (audit, secret handling, gating). For Resend and R2, no — the helper and direct calls coexist without harm.

Use a **`CodeVariants`** block (two tabs) to make the contrast concrete — both short:

- Tab "Helper — `sendEmail`": a ~4-line helper body that calls `resend.emails.send(...)` directly (plus the pre-flight discipline, e.g. a suppression check, in one line). Prose: *the SDK is still importable elsewhere; this is convenience, not a boundary.*
- Tab "Interface — `billing.upgrade`": the *signature* and one line noting the `import { stripe } from './stripe'` lives inside `/lib/billing/`. Prose: *app code never imports `stripe`; the only path is `billing.*`.*

Keep both tabs at signature/one-call depth; the full implementations shipped in L6 / ship in ch065 — do not reproduce them. Reference L6 for the `/lib/billing/` directory shape rather than re-teaching it.

Pair the variants with a **side-by-side layers figure** (`<Figure>` wrapping simple HTML/CSS, two columns) to make "forbidden vs. coexist" spatial:

- Left panel "Wrapped (Stripe)": three stacked layers — `app code` → `billing.*` (highlighted seam) → `stripe SDK` (buried, tinted as "import-restricted to /lib/billing"). A single arrow from app code stops at `billing.*`; no arrow reaches the SDK directly.
- Right panel "Un-wrapped (Resend)": `app code` with *two* arrows — one through `sendEmail` helper → `resend SDK`, and one straight to `resend SDK`. Both legal. The helper sits beside the direct path, not gatekeeping it.

Pedagogical goal of the figure: the seam in the left panel is a *wall*; the helper in the right panel is a *shortcut that coexists with the open door*. This image is what makes the rest of the matrix click. Caption it with the one-line rule: *a helper simplifies a call; an interface forbids the call from happening anywhere else.*

### Running the test on the course's five integrations

Apply the threshold to each integration and land the matrix. Walk the three un-wrapped cases first (they're the surprising ones), then confirm the two wrapped cases:

- **Resend — fails deliberately.** Shape: terse (`send({ from, to, subject, react })`) → no. Swap cost: low (every transactional-email vendor exposes the same handful of fields) → low. Discipline: a thin suppression/template pre-flight lives in the `sendEmail` helper → helper, not interface. Verdict: **helper.** The student met `sendEmail` in Unit 7; name it as the artifact.
- **Trigger.dev — fails deliberately.** Forward reference (ch066) — show only the call-site *shape* `myTask.trigger(payload)` and state the point: the SDK's own primitives (`task`, `schemaTask`) *are* the discipline-bearing layer; the Zod schema and idempotency key live in the task definition, not an outer wrapper. Wrapping the abstraction again adds nothing. Verdict: **direct call.** Flag clearly: "you'll learn Trigger.dev properly in a later chapter; here we only read its shape."
- **R2 — fails deliberately.** Forward reference (ch068) — show the shape `new PutObjectCommand({ Bucket, Key, Body, ContentType })`. Shape is partly read-hostile (verbose) → "partly." Swap cost is real (S3/R2/Backblaze/Tigris interchangeable) → medium. *But* the call sites don't multiply — two of them (presigned put, presigned get). A helper named for intent (`presignedPut(key)`) wraps the verbosity at each call; the SDK call is one line below. Verdict: **helper.** Same flag: shape-only, not taught here.
- **Auth (ch057) — passes three-for-three.** Read-hostile (the authz check is structural), swap cost real (auth-provider change), discipline central (authz at every action). `authedAction` is the first carve-out. → **interface.**
- **Billing (this chapter) — passes three-for-three.** The anchor from §1. → **interface.**

Then the **matrix table** (plain markdown, reproduce faithfully — this is the lesson's reference artifact):

| Test | Resend | Trigger.dev | R2 | Auth (ch057) | Billing (ch064) |
|------|--------|-------------|----|--------------|-----------------|
| Read-hostile shape | no | no | partly | yes | yes |
| Swap cost real | low | medium | medium | high | high |
| Discipline lives in wrapper | helper does it | SDK already does | helper does it | yes (authz) | yes (gating, scoping) |
| **Verdict** | helper | direct call | helper | **interface** | **interface** |

State the reading of the table: three-of-three is an interface; two-of-three (R2 — verbosity + swap cost, no central discipline) is a helper; Resend and Trigger sit lower still. Name the headline: **applied twice, withheld three times.**

Place the **`Buckets` exercise** here as the assessment — sort integrations/scenarios into where they belong. This is the most on-target check because the whole lesson is a classification skill. Spec:

- Three buckets: `interface` ("Interface in /lib — SDK forbidden elsewhere"), `helper` ("Helper at the call site — SDK still importable"), `direct` ("Call the SDK directly").
- Items (mix the five integrations with a couple of fresh scenarios so it's reasoning, not recall):
  - `billing.*` (Stripe checkout + portal + gating) → `interface`
  - The auth authz wrapper → `interface`
  - Transactional email send with a suppression check → `helper`
  - Two presigned-URL calls to object storage → `helper`
  - A durable-task SDK whose primitives already carry the schema and idempotency → `direct`
  - A fresh scenario: an SMS vendor with a one-line `send({ to, body })` used in three places, no cross-cutting rule → `direct` (or `helper` — author picks one and makes the description disambiguate; recommend `direct` since it's terse with no discipline)
  - A fresh scenario: a feature-flag SDK that must be checked at every gated route with a consistent fallback rule → `interface` (central discipline)
- Use `twoCol` if the three buckets crowd; add `instructions` naming the task ("Sort each integration by how it should be reached from app code").

Goal: the student demonstrates they can run the three questions to a verdict on cases they haven't been handed the answer to.

### Why "wrap it for consistency" is the wrong instinct

Name the failure mode head-on — it's the most common real-world pull and the reason the lesson exists. The "let's wrap Resend too, for symmetry" request is *aesthetic*, not decision-driven. State the costs precisely:

- Every wrapper is a **maintenance surface** — a module that must be kept in sync with the SDK it hides.
- Every call site that routes through a wrapper instead of the SDK is an **indirection the reader has to follow** — one more hop to understand what actually happens.
- Symmetry buys *uniformity*; uniformity is not a goal. **Decision quality is.** Only the carve-outs that pay back their indirection earn the layer.

Land the senior reframing: the absence of a wrapper around Resend/Trigger/R2 is a *decision*, not an oversight — and a reviewer who asks "why isn't this wrapped like billing?" should get the three-question answer, not a shrug.

Optional reinforcement (author's discretion, budget permitting): a small **`CodeReview`** exercise on a PR that introduces a pointless `resend` wrapper (`billing`-style module that just re-exports `resend.emails.send` with no added discipline). One plant — `kernel`: "pure indirection — wraps the SDK without centralizing any discipline; a helper or direct call is correct here." If included, keep it to a single file; if the lesson is running long, the `Buckets` exercise alone suffices for assessment and this can be cut.

### The dividend — what the two wrappers buy

Close the open debts and make the payoff concrete. This section answers "so what did centralizing the discipline actually get us?" — the dividend that justified the two interfaces. Four payoffs, each tied to the *seam existing*:

- **A single test seam** (the argument L6 forwarded here explicitly). Because every billing call routes through `billing.*`, integration tests mock *three methods*, not the whole Stripe SDK scattered across the app. Un-wrapped SDKs get mocked at the helper or the call site. State the payoff; reference Unit 18's testing thread at a high level — do not drill test code.
- **API-version pinning lives in one place.** Stripe pins an `apiVersion` (the chapter pinned `2025-03-31.basil` in L1). Because the client is instantiated once inside `/lib/billing/stripe.ts`, the version-bump conversation is one file, one place to test. A scattered SDK would make the version a global concern. (Verify the pinned version string against L1 — see Scope.)
- **Observability gravity.** The seam is the natural home for structured logs (`billing.upgrade` logs org + plan + session id) and metrics (`requirePlan` failures increment a counter). Wrappers *attract* observability — a feature, not a bug. Un-wrapped calls get it at the helper or call site instead.
- **Class-based adapters** (closes the ch009 thread: classes earn their weight in a few sites, one being "adapters wrapping a class-based SDK"). Stripe's Node SDK exposes a class; `billing.*` is exactly that adapter — the class instance hidden inside `lib/billing/stripe.ts`, the public surface is functions. Restate briefly; the point is that "wrap the class behind functions" is the same decision viewed from the OOP side.

End the section by stating the rule one final time as the chapter's whole architectural posture toward third-party SDKs: **don't wrap unless (a) the shape harms the call site, (b) the swap cost is real, (c) a discipline must be centralized — helpers for everything else.** Named once, applied twice, withheld three times.

### External resources (optional)

One or two `ExternalResource` cards if a genuinely durable reference fits — e.g. a well-regarded write-up on the adapter/anti-corruption-layer pattern, or the "wrapping third-party libraries" discussion in a respected architecture source. Skip rather than pad with vendor marketing. Do **not** link Stripe/Resend SDK docs here — those belong to the lessons that teach those SDKs.

### Terms for `Term` tooltips

Strategic inline definitions only — re-explain prerequisite concepts without breaking flow:

- **SDK** — "Software Development Kit: the vendor's official client library for calling their API from your code."
- **Adapter** — "A thin module that exposes your own stable interface over a third-party library, so call sites depend on your shape, not the vendor's."
- **Transitive dependency** — "A package your code reaches only *through* another module, never by importing it directly."
- **Anti-corruption layer** (only if the term is used in prose) — "A boundary that keeps a vendor's shapes from leaking into your domain code."
- Do **not** tooltip `helper`, `interface`, `wrapper` — these are defined in the running prose and are the lesson's subject, not background.

## Scope

**This lesson teaches:** the three-question threshold for wrapping an SDK; the helper-vs-interface distinction framed by *enforcement* (is the SDK forbidden elsewhere); the matrix applied to the course's five integrations; why symmetry is a false goal; and the dividend the two interfaces pay (test seam, version pinning, observability, class-based adapter). It is a decision lesson — it ships essentially no new production code.

**Prerequisites to restate briefly, not re-teach:**

- The `billing.*` interface and `/lib/billing/` directory (L6) — referenced as the worked yes-case; do not re-teach its implementation, `requirePlan` body, or `BillingError` definition.
- `authedAction` (ch057 L2) — referenced as the first carve-out; do not re-teach authz wrapping.
- Architectural Principle #5, "use the framework's conventions, don't invent a call wrapper" (ch043 L4) — name it as the principle both carve-outs are exceptions to; the full principle list is surfaced at chapter level there and audited in Unit 21.
- `sendEmail` / Resend (Unit 7) — referenced as the canonical helper; do not re-teach email sending.
- The pinned Stripe `apiVersion` (`2025-03-31.basil`, L1) — quote it once for the version-pinning payoff; do not re-derive it.

**Explicitly out of scope (defer, do not teach here):**

- **Trigger.dev** task primitives, durable execution — *ch066*. Show only a one-line call-site shape for comparison; flag it as not-yet-taught.
- **R2 / presigned URLs** — *ch068*. Show only a one-line shape for comparison; flag it as not-yet-taught.
- The full `requirePlan` / `BillingError` / `Result` contract — *L6* and *ch065*.
- `billing.reactivate()` / `billing.confirmTrial()` — named at most in passing if at all; *ch065*.
- The testing-seam *implementation* (mocks, fixtures, test files) — only the *argument* lands here; mechanics are *Unit 18*.
- The full architectural-principle list and its audit — *ch043 L4* / *Unit 21*.
- Any new billing feature, schema, status logic, or webhook code — all owned by L1–L6 and *ch065*.

This is the last teaching lesson of the chapter; L8 is the quiz (no new content). Keep the lesson tight — its value is the decidable rule, not breadth.

## Code conventions notes

- All shown code stays at **signature / single-call depth** — representative, not runnable implementations. This is a deliberate divergence from "ship complete code"; the lesson's subject is the *decision*, and the implementations live in L6 / ch065. Downstream agents: do not expand these into full modules.
- Function form: helpers and the interface methods follow the course default — `export const name = async (...) => {...}` arrow form bound to `const`; the `billing.upgrade` signature may be shown as `export async function` to match L2's declaration form (L2 used the declaration form for `upgrade`). Either is valid per conventions; match whatever L6 shipped to avoid contract drift — prefer not to introduce a new form here.
- `import 'server-only'` tops any file in `/lib/billing/`; if the helper/interface figure shows file headers, include it on the interface side per Module-boundaries conventions.
- Naming: helpers are verb-led, intent-named (`sendEmail`, `presignedPut`); the interface surface is the noun namespace (`billing.upgrade`). Reproduce these exactly — they're cross-referenced from earlier lessons.
- Forward-referenced SDK shapes (Trigger.dev, R2) are shown verbatim enough to read the *shape* but are not held to project conventions (they're illustrative vendor surfaces, not course code).

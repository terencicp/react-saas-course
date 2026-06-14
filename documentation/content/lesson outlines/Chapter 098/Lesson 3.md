# Region, runtime, and Fluid Compute

Title: Region, runtime, and Fluid Compute
Sidebar label: Region, runtime, compute

## Lesson framing

This is the platform-tuning lesson. By now the student's code is on the internet (L2) and they understand that a push is a deploy (L1). Three settings now govern the three things a senior cares about at deploy time — **cold start, latency, and bill**: which **region** the function runs in, which **runtime** (Node.js vs. Edge) it ships on, and the **Fluid Compute** execution model underneath it.

The senior-mindset spine of this lesson is the **defaults-vs-diff** frame, taught explicitly because it is the durable skill: of these three knobs, **exactly one needs a deliberate change on day one (region → match the database)** and the other two are correct-by-default (Node.js runtime, Fluid Compute on). The lesson's job is not to enumerate every platform setting; it is to teach the student to recognize which platform defaults are load-bearing and which are noise. This is the antidote to the junior reflex of "turn Edge on for speed" cargo-culting.

Pedagogical decisions that apply lesson-wide:
- **Lead with the one knob that's wrong-by-default (region), because it's the only one that produces a silent, measurable production regression.** Cross-region DB round trips are invisible in `pnpm dev` (everything's local) and only show up as p95 latency in production. This is a concrete, money-adjacent stake the student can feel.
- **Reframe two outline claims that are stale as of 2026 — this is the lesson's highest-value correction.** (1) The Fluid Compute *manual concurrency knob* (`maxConcurrency`, "default 1, raise to 5–20") no longer exists as a user-facing setting; in-function concurrency is **automatic**. Teach the *automatic* model and keep the load-bearing payload of that section — the **shared module-scope state** watch-out — which is more relevant than ever now that concurrency is on by default and invisible. (2) `middleware.ts` is no longer "Edge by default"; in Next.js 16 it's renamed `proxy.ts` and runs **Node.js-only** (setting `runtime` throws). The "Edge runtime is for middleware" mental model is dead. Downstream agents must not teach it. See Scope.
- **Minimize cognitive load by teaching runtime as a binary decision the student almost never makes.** Present Node.js as the default that needs no thought, then present Edge as a measured, per-route opt-in with a short, honest list of what it costs you. The deliverable is a *decision rule*, not a feature tour. A `StateMachineWalker` is the right vehicle — it forces the student through the question order a senior actually uses.
- **Keep code minimal.** This is a configuration/decision lesson, not a coding lesson. The few code artifacts are tiny: a `vercel.json` region/fluid stub, a one-line `export const runtime = 'edge'`, and a before/after of an unsafe module-scope cache. No live-coding exercise earns its weight here (the concepts are decisions and platform state, not syntax the student types); checks are MCQ + Buckets + a decision-tree walker.
- **Mental model the student should leave with:** *The function is a process that runs somewhere, near or far from my data, on one of two engines, and now quietly handles many requests at once. I move it next to the database, I leave it on Node.js, and I stop putting per-request state at module scope.*

## Lesson sections

### Introduction (no header)

Open with the senior question, framed as a moment in the workflow: the first deploy is green and live (L2), so what does a senior actually configure before walking away? Name the three knobs (region, runtime, compute model) and the payoff up front: **one deliberate change, two informed leave-it-alones.** Set the stake concretely — a server action that reads the database pays a network round trip on every call; if the function and the database are on opposite coasts, that round trip is the difference between a 30 ms query and a 110 ms query, on every request, forever, and it never shows up in local dev. Keep it to ~4 sentences. Connect back to L1's "the deploy ships code; everything stateful is yours" — region/runtime/compute are the platform-state decisions that ride alongside the code.

### Match the function region to the database

The load-bearing section; teach it first because it's the only wrong-by-default knob.

Content to convey:
- **Vercel Functions run in a single region by default — `iad1` (Washington, D.C., US East).** Configurable. This is fine *if* the database is also there; it's a latency tax if not.
- **The rule for a single-database SaaS: the function region must match the database region.** The Neon database from Unit 5 (Chapter 036) was provisioned in a specific region; the function must sit next to it. Every server action, route handler, and RSC data fetch opens a connection to Postgres — co-location turns a cross-country round trip into a same-datacenter hop.
- Why this is invisible until production: in local dev the function and a local/branch DB are effectively co-located or the latency is masked; the regression only appears as elevated p95 once deployed. This is *the* reason to set it deliberately rather than discover it.
- **Where to set it:** Project Settings → Functions → Region (dashboard), or `region` in `vercel.json`. One-time.
- **Multi-region functions** (Pro: up to 3; Enterprise: all) are for global SaaS with regional database replicas — explicitly out of scope; name once and move on so the student knows the escape hatch exists but doesn't reach for it.
- Tie forward lightly: the launch checklist (L8) re-verifies region-matches-DB and pooled connections as one row — name it, don't teach it.

How to teach it:
- **Diagram (the section's anchor).** A simple two-state comparison built as a `TabbedContent` with two `<Figure>`-wrapped panels (or a single side-by-side HTML+CSS figure inside one `<Figure>`). Panel A "Mismatched": a `User → Function (sfo1)` box with a long bold arrow crossing to `Database (iad1)`, the arrow labeled `~80ms each way`. Panel B "Matched": `User → Function (iad1) → Database (iad1)`, the function-to-DB arrow short and labeled `~1ms`. Pedagogical goal: make the cross-region tax *spatial* — the student should see distance = latency. Keep it horizontal, well under the 800px height cap. This is a hand-authored HTML+CSS or `ArrowDiagram` figure (geometric, callout-driven) — not a system graph, so D2/Mermaid aren't needed. If `ArrowDiagram` is used, recall it needs `expandable={false}` on its `<Figure>`.
- A one-paragraph "how to find your DB's region" pointer: it's whatever region the Neon project was created in (Neon console), back-reference Chapter 036 without re-teaching Neon.
- `Term` candidates: **cold start** (first-mention, define briefly), **p95** (define: "the latency 95% of requests come in under — the tail users actually feel").

### Node.js is the runtime default — and you keep it

Teach Node.js as the no-decision default. The goal is to *justify the default* so the student trusts it, not to make runtime feel like an open question.

Content to convey:
- **Vercel Functions ship on the Node.js runtime by default.** Full Node.js API surface, all npm packages, native modules, streaming, the writable `/tmp` scratch space. This is what every server action, route handler, and RSC fetch in the course's SaaS uses.
- Why this is the right default for SaaS: the app's server code talks to Postgres (Drizzle), Stripe, Resend, R2 — all of which assume the Node.js runtime and its package ecosystem. The default removes a decision the student would otherwise get wrong.
- **Updated platform facts (the outline's numbers are stale — use these):** under Fluid Compute the **default function duration is 300s (5 minutes) on every plan, including Hobby**; max 800s on Pro/Enterprise, with an extended 1800s in beta. Read-only filesystem plus a writable `/tmp` up to 500 MB. State these as the envelope, then immediately give the senior framing below so the student doesn't read "300s" as "it's fine to run a 4-minute request."
- **The timeout is a canary, not a budget.** Anything plausibly slow — a large export, a third-party batch call, image processing — goes to a background job (Trigger.dev, Unit 12), not a long-running request. The generous 300s ceiling exists to absorb spikes, not to host slow work. Back-reference Unit 12's `after()`/Trigger.dev decision without re-teaching it.
- **Large uploads never traverse the function.** Files route through R2 presigned URLs (Chapter 069) — the byte stream goes browser→R2 directly, so the function's request-body limit is irrelevant to the upload path. One sentence, back-reference only.

How to teach it:
- Mostly prose. A small `Code` block showing a minimal `vercel.json` that sets the region and shows Fluid as on (so the student sees the shape of the file even though most projects need none of it):
  ```json
  { "$schema": "https://openapi.vercel.sh/vercel.json", "region": "iad1", "fluid": true }
  ```
  Caption: most SaaS projects ship with no `vercel.json` at all — Node.js runtime, `iad1`, and Fluid are already the defaults; this file only exists to *override* a default, and the one override worth making is the region.
- `Term` candidates: **runtime** (the engine + API surface a function executes against), **RSC** (re-define tersely if not assumed solid).

### When Edge earns its weight (and when it doesn't)

The decision-rule section. Frame Edge honestly: a real tool with a narrow, measured use case, not a speed button.

Content to convey:
- **The Edge runtime is V8 isolates running close to the user, with a much lower cold start than a Node.js container.** That's the upside, and it's real.
- **The costs, stated plainly:** no full Node.js API, no native modules, most npm packages unavailable, no general filesystem, and only HTTP-based DB drivers work (Neon's HTTP driver is one of the few that fit). For a SaaS route that touches Postgres via the pooled driver, Stripe, or any Node-only dependency, Edge is a downgrade — you lose more on capability than you gain on cold start.
- **The decision rule:** stay on Node.js unless you have *measured* latency on a specific path *and* that path is stateless / POP-proximity-shaped (e.g., a tiny geolocation or redirect endpoint with no Node dependencies). Per-route opt-in is `export const runtime = 'edge'` on a route handler or page segment — still valid in Next.js 16.
- **The middleware correction — teach this explicitly.** The chapter outline (and a lot of pre-2026 writing) says "middleware is Edge by default — use it for geolocation/A-B." **That is no longer true.** In Next.js 16, `middleware.ts` is renamed `proxy.ts` and **runs on the Node.js runtime only — setting the `runtime` option in `proxy.ts` throws a build error; the Edge runtime is not available there.** So "Edge is where middleware lives" is a dead mental model. Next.js further positions `proxy.ts` as a last-resort tool. State the rename, the Node.js-only fact, and that the course handles request-edge concerns (auth gating, headers/CSP) in `proxy.ts` on Node.js — back-reference, the auth/CSP wiring is owned elsewhere.
- **Convention divergence flag for downstream agents:** the chapter outline writes `middleware.ts`; per the course Code conventions and Next.js 16, the correct filename is **`proxy.ts`** (named export `proxy`, or default export). Any code or prose in this lesson uses `proxy.ts`. Do not introduce `middleware.ts`.
- Clarify, to prevent a different confusion: the Edge *runtime* is not deprecated — what was retired (mid-2025) is the old "Edge Functions / Edge Middleware" product framing, now folded into Vercel Functions. The student doesn't need the history; one sentence so they don't trip over old docs that say "Edge Functions are deprecated" and conclude Edge is gone.

How to teach it:
- **`StateMachineWalker` (`kind="decision"`) — the section's centerpiece.** It forces the student through the senior's question order and ends on a verdict. Sketch:
  - Root `Question` "What does this route do?" → Branch "Reads Postgres / calls Stripe / uses an npm SDK" → Leaf **"Node.js (the default)"** (reason: Node-only dependencies; Edge can't load them). Branch "Tiny, stateless, no Node deps (geo redirect, simple rewrite)" → `Question` "Have you *measured* cold start or latency hurting this path?" → Branch "No" → Leaf **"Node.js — don't optimize a problem you haven't measured."** → Branch "Yes, it's a real, measured POP-proximity win" → Leaf **"Edge runtime, per-route `export const runtime = 'edge'`."**
  - Add one decoy-correcting branch off the root: "It's request-edge logic — auth gate, redirects, headers" → Leaf **"`proxy.ts` on Node.js — not Edge. Middleware isn't an Edge thing in Next.js 16."** This bakes the correction into the interactive.
  - Pedagogical goal: the lesson lives in the *order* (capability before performance, measurement before optimization), exactly what `StateMachineWalker` is designed for. Do not wrap it in `<Figure>` (it's a self-contained card).
- A one-line `Code` block for the per-route opt-in (`export const runtime = 'edge'`) so the student recognizes the syntax, with a caption that it's the rare exception.
- `Term` candidates: **V8 isolate** (lightweight JS sandbox, no container/VM — much faster to start, far less capable), **POP** (point of presence — an edge location near the user).

### Fluid Compute: one instance, many requests

The "what changed under you" section. The student didn't turn this on — it's on by default — so the job is to make the invisible model visible, then deliver the one real consequence.

Content to convey (the *accurate* 2026 model — supersedes the outline's manual-knob framing):
- **Fluid Compute is Vercel's default execution model for Node.js functions, on by default for new projects since April 2025.** Same Node.js runtime; different way of running it.
- **The shift, in one sentence:** classic serverless ran *one request per instance* (and spun up a new instance — a cold start — for each concurrent request); Fluid lets **one warm instance handle multiple concurrent requests**, reusing the idle time during external waits (DB query, `fetch`, Stripe call) to serve other requests on the same instance.
- **Why this is free money for SaaS:** SaaS workloads are I/O-bound — most of a request's wall-clock time is spent *waiting* on Postgres or an API. Fluid fills that idle time with other requests, so the same traffic needs fewer instances → fewer cold starts → lower latency and lower bill, with **zero code changes.**
- **Concurrency is automatic — there is no manual concurrency dial to set.** (Explicit correction: do not teach a `maxConcurrency` `vercel.json` knob or a "default 1, raise to 5–20" recipe — that is not the current model. Vercel manages in-function concurrency, prioritizing idle capacity before allocating new instances.) The student's job is not to tune a number; it's to **write code that's safe to run concurrently in one process** — which is the next section.
- **Error isolation, briefly:** an unhandled error in one request no longer takes down the others sharing the instance — Fluid logs it and lets in-flight requests finish. Reassuring, and it sets up the contrast in the next section: errors are isolated, but *memory is not*.

How to teach it:
- **Diagram (the model made visible) — a `DiagramSequence`.** Three scrubbable steps contrasting old vs. new:
  1. *Classic, one-per-instance:* three incoming requests spawn three separate instances, two of them showing a "cold start" badge; a timeline shows each instance mostly idle while waiting on the DB.
  2. *Fluid, shared instance:* the same three requests land on one warm instance; show request B's DB-wait window overlapped by request A executing — the idle gaps are filled.
  3. *The payoff callout:* "fewer instances, fewer cold starts, lower bill — no code change."
  Pedagogical goal: turn an abstract scheduling change into something the student can watch, specifically the *idle-time reuse* that makes it work. Step-through (vs. a static figure) earns its weight because the value is temporal — requests overlapping in time. `DiagramSequence` content can be simple HTML+CSS timeline bars; keep each step horizontal and short.
- `Term` candidates: **I/O-bound** (time dominated by waiting on external systems, not CPU — define inline since the whole section hinges on it), **cold start** (reuse the L-earlier definition; reinforce).

### Shared state is the trap concurrency sets

The load-bearing payoff of the whole compute discussion, and the one place a student can actually ship a bug. Promote it to its own h3 (per guidelines, the watch-out *is* the concept here, not a footnote on the previous section).

Content to convey:
- **The shift in mental model:** when one instance served one request at a time, module-level state was effectively per-request. Under Fluid, **module-scope state is shared across all concurrent requests on that instance.** Anything you put at the top level of a module is now a shared resource.
- **The safe case (so the student isn't scared off):** the Drizzle/Neon database client created once at module scope is *fine* — it's a connection pool, designed for concurrent use and thread-safe. Module-scope singletons that are *stateless* or *internally concurrency-safe* are correct. This is most module-level code, and the student should keep doing it.
- **The unsafe case (the bug):** a module-scope mutable value that holds *request-specific* data. The canonical example: a hand-rolled in-memory cache or a `let currentUser` / `let currentOrg` at module scope. Request A writes it, request B (running concurrently on the same instance) reads A's value → **data bleed across users**, the worst class of bug in a multi-tenant SaaS. Frame the production stake explicitly: this is a cross-tenant data leak, not a cosmetic glitch, and it's invisible in single-request local testing.
- **The fixes:** per-request state lives in **function locals** (the default — just don't hoist it to module scope) or, when it must thread through a call stack without prop-drilling, **`AsyncLocalStorage`** (Node's per-request context store — name it, one-line definition, point forward; the org-context plumbing is owned by other units). Module scope is only for things that are safe to share.
- Connect to the Next.js `proxy.ts` guidance the student just saw: the docs themselves warn proxy code "should not rely on shared modules or globals" — same principle, same reason.

How to teach it:
- **`CodeVariants` — before/after, the right tool for an unsafe-vs-safe comparison.** Two tabs:
  - Tab "Bug: request-scoped state at module scope" — a module with `let currentOrgId: string | null = null` (or a tiny `Map` used as a per-request cache) mutated inside a request handler, with the explanatory text naming the bleed: under concurrency, request B reads request A's `currentOrgId`.
  - Tab "Safe: state stays in the request" — same logic with the value as a function local (and the Drizzle client left at module scope to show *that's* the correct kind of module-level singleton). Text: function locals are per-invocation; the pooled DB client is safe to share.
  Keep both snippets ~10 lines, illustrative not production. Pedagogical goal: the student sees the exact line that turns module-scope into a tenant leak, and the one-line move that fixes it.
- **Exercise — `Buckets` (classification), the section's check.** Title: "Safe at module scope, or request-scoped?" Two buckets: **"Fine to share (module scope)"** and **"Must stay per-request"**. Items: the Drizzle/Neon pool client → share; a Stripe SDK client instance → share; a compiled regex / constant config object → share; `let currentUserId` → per-request; an in-memory `Map` cache of "the current request's computed totals" → per-request; a per-request `requestId` → per-request. Grading: each chip matches its bucket. Goal: the student practices the actual judgment call this section teaches — *which kind of state is which* — rather than restating the rule. This is higher value than an MCQ because the skill is classification.

### A quick recap of the three knobs

Short consolidation tied to the lesson's spine; not a new concept, a compression aid.

Content to convey:
- One compact restatement: **Region — change it once to match the database. Runtime — leave it on Node.js; Edge is a measured per-route exception. Compute — Fluid is on automatically; your job is concurrency-safe code, not a concurrency dial.**
- Name the one thing each gets wrong: region mismatch = silent latency tax; Edge-by-reflex = lost capability; module-scope request state = cross-tenant bleed.
- Point forward to L8 (launch checklist) where region-match-DB + pooled connection is verified as a row, and to L5 (preview Neon branches) which is the next deploy-platform piece. One sentence each.

How to teach it:
- **Exercise — `MultipleChoice` (single, click-and-reveal), the lesson-level check.** Author the stem as a scenario so the student reasons rather than pattern-matches (per component guidance, don't echo prose verbatim): e.g., *"A teammate's PR adds `export const runtime = 'edge'` to a route handler that runs a Drizzle query against the pooled Postgres connection, citing 'faster cold starts.' What's the senior review note?"* Correct: the route uses a Node-only DB driver, so Edge will break it (or force the HTTP driver) and the cold-start win doesn't justify losing the pooled connection — keep it on Node.js. Distractors: "Approve, Edge is always faster"; "Edge is fine, just move the query to `proxy.ts`" (wrong — proxy is Node-only too, and that's not where queries go); "Approve but raise `maxConcurrency`" (wrong — no such knob; tests the corrected fact). `McqWhy` reinforces the capability-before-performance rule.
- Optionally a second `MultipleChoice` on the region knob: scenario where p95 spiked after launch despite no code change near a query path → correct answer is function/DB region mismatch.

### External resources (optional)

`ExternalResource` cards, only if they add value beyond the lesson:
- Vercel Fluid Compute docs (`vercel.com/docs/fluid-compute`) — the authoritative source for the automatic-concurrency model and the per-plan duration table.
- Vercel Functions Runtimes docs (`vercel.com/docs/functions/runtimes`) — Node.js vs. Edge, region/`iad1` default.
- Next.js `proxy.ts` reference — the Node.js-runtime-only fact, for students who'll otherwise hit stale "middleware is Edge" content.

No YouTube embed proposed: the concepts are platform-state decisions and a scheduling model best served by the custom diagrams and the decision-tree walker; a video would add length without sharpening the one decision rule that matters.

## Scope

**This lesson covers:** region selection and the match-the-database rule; the Node.js runtime as the committed default and the per-route Edge exception with its decision rule; the corrected Next.js 16 `proxy.ts` (Node.js-only) middleware fact; the Fluid Compute execution model (automatic in-function concurrency, I/O-bound payoff, error isolation); and the module-scope-shared-state hazard with its function-locals / `AsyncLocalStorage` fixes. Updated platform numbers (300s default duration, `/tmp` 500 MB) are stated as context for the "timeout is a canary" framing.

**Prerequisites (redefine in one line each, do not re-teach):**
- Neon database provisioned in a region, copy-on-write branching, and the **pooled vs. unpooled connection string** + serverless driver — Unit 5 / Chapter 036. This lesson assumes the student knows the DB lives in a specific region and is reached over a connection; it only adds "put the function next to it."
- Server actions / route handlers / RSC as the server-side call sites that hit the DB — prior units. Named as the things that pay the round trip.
- `proxy.ts` as the request-edge file (auth gating, headers) — its *authoring* is owned elsewhere; here it's referenced only to correct the runtime fact.

**Explicitly out of scope (defer, name once at most):**
- **First-deploy mechanics, the Import flow, `vercel.json` as a general topic** — L2 (done). This lesson only touches `vercel.json` for `region`/`fluid`.
- **The deployment/alias model, build-vs-runtime env split** — L1 (done).
- **Custom domains, SSL, Cloudflare-in-front** — L4.
- **Per-PR Neon preview branches and running migrations against them** — L5. Do not teach branch-per-preview here; region is about *production* placement.
- **Env var scoping, `NEXT_PUBLIC_*`, the Zod validator, OIDC** — L6.
- **Rollback** — L7. **The full launch checklist** (region-match + pooling verification rows) — L8; name the two rows, don't build the checklist.
- **Background jobs / `after()` / Trigger.dev** — Unit 12; referenced as the home for slow work, not taught.
- **R2 presigned uploads** — Chapter 069; referenced as why uploads bypass the function.
- **`instrumentation.ts` / Sentry / OpenTelemetry startup wiring** — Unit 19 (Chapter 092). The chapter outline lists `instrumentation.ts` here; **cut it from this lesson** — it's a startup-hook topic that belongs with observability, and including it dilutes the three-knobs spine. If named at all, one sentence: "server-startup work has its own entry point, wired in the observability unit."
- **Multi-region functions, failover regions, Secure Compute, Active CPU pricing internals** — named once as escape hatches; not taught.
- **`maxConcurrency` / manual concurrency tuning** — does not exist as a user knob in the current model; explicitly *not* taught, and the corrected fact is used as an MCQ distractor.

## Notes for downstream agents

- **Two deliberate corrections to the chapter outline, both verified against 2026 Vercel/Next.js docs (June 2026):** (1) Fluid Compute in-function concurrency is **automatic** — there is no `functions.<glob>.maxConcurrency` knob and no "default 1, raise to 5–20" recipe; teach the automatic model + shared-state hazard instead. (2) Next.js 16 middleware is **`proxy.ts`, Node.js-runtime-only** (setting `runtime` throws) — the outline's "middleware is Edge by default" is dead; do not teach it.
- **Stale numbers in the outline, corrected here:** function default duration is **300s on all plans** (not Hobby 10s/Pro 60s); writable `/tmp` is **500 MB**. Use the corrected figures.
- **Filename convention:** use `proxy.ts` everywhere, never `middleware.ts`. Edge per-route opt-in is `export const runtime = 'edge'` (valid in Next 16 for route handlers/pages, *not* for `proxy.ts`).
- **`iad1`** is the current default region — verify against the dashboard if a figure shows a specific code, but `iad1` is correct as of June 2026.
- Keep code samples tiny and illustrative; this is a decision lesson. Don't add a live-coding sandbox — the three checks (decision-tree walker, Buckets, MCQ) are sufficient and better matched to the material.

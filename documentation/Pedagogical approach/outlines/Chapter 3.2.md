## Concept 1 — Safety and idempotency as the two axes

**Why it's hard.** Students arrive thinking methods differ by tradition or convention ("GET is for fetching"). The senior frame is two orthogonal properties — *safe* (no observable side effect) and *idempotent* (same final state after a replay) — that together decide whether a retry is allowed. The method is just a label for a cell in that 2×2.

**Ideal teaching artifact.** Concept archetype. The student first sees the 2×2 grid empty, axes labeled, four cells named (safe+idempotent, unsafe+idempotent, unsafe+non-idempotent, and the empty safe+non-idempotent cell). Prose defines each axis crisply with a one-line failure illustration ("a 'safe' GET that writes shows up duplicated when the browser prefetches"). The five-method palette is introduced *as placements* into the cells, not as a list. HEAD and OPTIONS get one line each as forward-references (Ch. 13.4, Ch. 3.3).

**Engagement.** Buckets drag-and-drop: shuffle GET / POST / PUT / PATCH / DELETE / HEAD into the four cells. A second pass — same exercise — asks the student to sort six real operations ("charge a card", "fetch a user", "rename a project", "delete an invoice", "look up DNS records", "increment a like counter") into safe/idempotent properties first, *then* infer the method.

**Components.**
- `Figure` wrapping a hand-SVG 2×2 grid with axes labeled and methods placed.
- `Buckets` for the method-placement drill (four-cell layout).
- `Buckets` again for the operations-to-properties drill.

---

## Concept 2 — The retry problem and the `Idempotency-Key` pattern

**Why it's hard.** The student understands idempotency as a definition but not as the property a *retry policy actually reads*. The misconception is that retries are universally safe; the production bite is the double-charge or duplicate-org-creation when a POST is retried after a network blip. The pattern itself — client-generated UUID, server-stored `(key, response)` cache — is the canonical fix.

**Ideal teaching artifact.** Pattern archetype, taught misconception-first. The student sees a payment flow: client → POST `/charges` → network blip → retry. Two parallel sequences run side by side. In the left ("naive") track, the second POST hits the server fresh and charges twice. In the right ("with `Idempotency-Key`") track, the server consults its key store, finds the prior response, and returns it verbatim — no second charge. The student scrubs through both timelines and predicts the final account balance at each step. The reveal is that idempotency isn't a property of the *method* here — POST stays non-idempotent — it's a property the *application layer* installs on top, by storing the response under a stable key.

**Engagement.** A PredictOutput drill after the simulator: the student sees a sequence of `(request, network outcome, idempotency-key present?)` rows and predicts the final balance. Misses force a return to the simulator. Follow-up MultipleChoice on which of four surfaces in this course will operationalize the pattern (forward-refs to Ch. 7.2, 7.5, 12.1, 13.2).

**Components.**
- `IdempotencyReplaySimulator` (new) — side-by-side timeline of two POST flows, scrubbable, with a key-store panel that visibly accumulates `(key, cached response)` entries on the right track. Inputs: a scripted sequence of `(method, path, body, network: success | timeout | retry, idempotencyKey?)`. Shows: client state, network state, server state, key-store contents, and the resulting business effect (account balance, orgs count).
- `PredictOutput` for the prediction round.
- `MultipleChoice` for the forward-ref recognition.

---

## Concept 3 — PUT replaces, PATCH diffs (merge-patch vs. json-patch)

**Why it's hard.** Students often treat PUT and PATCH as interchangeable "update" verbs. The senior frame: PUT is a full replacement (idempotent because the body fully determines the post-state), PATCH is a diff (idempotent only if the diff is absolute). The wire shape of a PATCH body also matters — merge-patch (RFC 7396) is the 2026 default; json-patch (RFC 6902) is the reach when ops semantics need to be explicit.

**Ideal teaching artifact.** Decision archetype. A single starting resource (`{ name: "Acme", plan: "pro", seats: 10 }`) is shown three times, each under a different verb: PUT with the full new body, merge-patch with `{ plan: "team" }`, json-patch with `[{ op: "replace", path: "/plan", value: "team" }]`. Each tab shows wire body, resulting resource, and what happens when the request is retried twice. The student sees that PUT and merge-patch land in the same post-state; that a relative json-patch op (`{ op: "add", path: "/seats", value: 1 }`) drifts on retry; and that merge-patch can't represent "remove this key" without the `null` sentinel.

**Engagement.** `Dropdowns` drill: given a starting resource and a verb+body, fill in the resulting state across two consecutive applications. The drift trap is the load-bearing cell.

**Components.**
- `TabbedContent` with three tabs (PUT / merge-patch / json-patch), each panel showing wire body, post-state, and the two-replay outcome.
- `Dropdowns` for the post-state drill.

---

## Concept 4 — Status-code classes as the on-call paging contract

**Why it's hard.** Junior instinct treats status codes as a flat lookup table. The senior reads the *class digit* first: 4xx means client fault and does not page; 5xx means the server failed and pages on-call. A 200 carrying `{ error: "..." }` in the body is the canonical anti-pattern that breaks every alerting rule downstream.

**Ideal teaching artifact.** Concept archetype with an ambush. The lesson opens with a triage scenario: three production incidents, each shown as a Network panel screenshot or response anatomy. The student is asked, before any framing, whether to page the on-call engineer. One incident is a 200 with `{ error: "invalid email" }` in the body — the ambush. The reveal frames the five classes as semantic buckets the *infrastructure* reads (alerting rules, load balancers, retry middleware), then names the senior reflex: the response line is the contract; the body is for humans.

**Engagement.** Two-pass `Buckets`. Pass one: sort six response samples (status line + body excerpt) into 2xx / 3xx / 4xx / 5xx buckets. Pass two: same samples, sorted into page / don't-page. The pass-two list re-uses the pass-one samples deliberately so the student feels the class doing the work.

**Components.**
- `Figure` wrapping a hand-SVG that shows three response anatomies (status line + headers + body excerpt) side by side for the ambush.
- `Buckets` (×2) for the triage and paging sorts.

---

## Concept 5 — The 4xx discriminations that bite

**Why it's hard.** Three confusions account for most of the wrong status codes a junior ships: 400 vs. 422 (parse fail vs. validation fail), 401 vs. 403 (no credentials vs. credentials-but-not-allowed), and 403 vs. 404 (legitimately not found vs. tenancy-scoped and intentionally hidden). 409 also slides in as the unique-constraint signal. These have to be decided at the route-handler boundary, not muddled.

**Ideal teaching artifact.** Decision archetype, structured as a decision tree the student walks. The lesson presents the canonical 4xx flowchart: can we parse the body? → no → 400. Can we authenticate? → no → 401. Is the request body schema-valid? → no → 422. Is the caller allowed to touch this resource? → no → 403 (or 404 if existence would leak tenancy). Does the operation conflict with another row? → 409. The tree is annotated with one production example per leaf, drawn from later units (auth, RBAC, soft-delete unique-constraint races).

**Engagement.** `Matching` drill: ten production scenarios on the left ("user POSTs `/orgs` with `{ name: '' }`", "user from Org A asks for an invoice that exists in Org B", "user replays a Stripe checkout that already paid") matched to the right status code. After matching, a single `MultipleChoice` cements the 403-vs-404 tenancy rule with one tricky case.

**Components.**
- `Figure` wrapping a hand-SVG decision tree of the 4xx flow, with leaf annotations.
- `Matching` for the scenarios drill.
- `MultipleChoice` for the tenancy 404 trap.

---

## Concept 6 — Redirects that preserve the method

**Why it's hard.** The 301/302 → 307/308 generational shift is invisible to most juniors. The original codes do not guarantee the method survives the redirect, which silently turns a POST into a GET and drops the body. 303 is the deliberate POST-Redirect-GET reflex — different semantics, same era.

**Ideal teaching artifact.** Decision archetype, light touch. A single hand-SVG figure shows five small request panels — one per redirect code — each visualizing the second hop's method ("POST → 301 → GET", "POST → 307 → POST", "POST → 303 → GET, by design"). Senior defaults are stated plainly: reach for 307/308; reach for 303 only when the post-redirect resource is genuinely a different read.

**Engagement.** `Dropdowns` fill-in: complete a small table mapping `(original method, status code) → next-hop method`. Misses surface the 301-loses-method trap directly.

**Components.**
- `Figure` wrapping a hand-SVG of five labeled request panels (one per code).
- `Dropdowns` for the method-preservation table.

---

## Concept 7 — Problem Details as the error-body shape

**Why it's hard.** Error bodies are a wild west by default — every team invents a shape. RFC 9457 (`application/problem+json`) is the 2026 default the rest of the course's API surfaces will ship. The student has to internalize the five core fields (`type`, `title`, `status`, `detail`, `instance`), the role of `type` as the version-stable identifier the client codes against, and the extension-member pattern for typed error arrays.

**Ideal teaching artifact.** Pattern archetype. The lesson dissects a real 422 response — status line, `Content-Type: application/problem+json`, JSON body — annotated field by field. The student walks the annotation in sequence: first `type` (URI, stable contract), then `title` / `status` / `detail` / `instance`, then the extension `errors: [{ path, code, message }]` Zod-issue carrier. A second annotated example shows a 409 unique-constraint Problem Details body to make the pattern stick across status classes.

**Engagement.** `Tokens` on a fresh Problem Details body: the student clicks the five required fields, the `application/problem+json` content type, and the extension member. Decoys include `body`, `message`, and `code` (the wrong-shape attractors). A follow-up `MultipleChoice` on the `type` URI's stability contract — what the client may rely on, what it may not.

**Components.**
- `AnnotatedCode` stepping through the 422 example, field by field.
- A second `AnnotatedCode` (or compact code block with side notes) for the 409 example.
- `Tokens` for the field-spotting drill.
- `MultipleChoice` for the `type` URI contract.

---

## Concept 8 — Headers route by audience

**Why it's hard.** Students treat headers as one undifferentiated bag. The senior reads each header as addressed to *one of three audiences* — the browser (security, cookies), the infrastructure layer (CDN, proxy, load balancer — caching, encoding, vary), or the application (auth, idempotency, conditionals). The audience determines where the header is set in the Next.js stack: `next.config.ts` for static, `proxy.ts` for per-request, route handler for response-specific.

**Ideal teaching artifact.** Concept archetype, anatomy-first. A single annotated response shows a realistic header block (12–14 headers from a real authenticated SaaS response). Each header is color-coded and badge-tagged with its audience. A parallel small diagram maps the three audiences to the three Next.js setting locations, so the student sees the *physical* path each kind of header travels. The lesson then walks the four header families covered later in the chapter (content negotiation, caching, auth, security baseline) and tags each by audience as it appears.

**Engagement.** `Buckets` three-column sort: drop ~12 real headers (`Set-Cookie`, `Cache-Control`, `Vary`, `Authorization`, `Idempotency-Key`, `Content-Security-Policy`, `Strict-Transport-Security`, `If-None-Match`, `Content-Encoding`, `Stripe-Signature`, `RateLimit`, `Origin`) into browser / infrastructure / application. A follow-up `Matching` ties each header to the Next.js file where it gets set.

**Components.**
- `Figure` wrapping a hand-SVG response anatomy with audience-tagged headers + an audience-to-Next.js-location mapping.
- `Buckets` (three-bucket layout) for the audience sort.
- `Matching` for the header-to-setter-location drill.

---

## Concept 9 — Cache-Control: `no-store` vs. `no-cache`, and the senior defaults

**Why it's hard.** The two most-confused directives (`no-store` forbids storage; `no-cache` allows storage but forces revalidation) sound interchangeable and aren't. Compounding it, each response class has a *different* senior default — `private, no-store` for authenticated HTML, `public, max-age=31536000, immutable` for hashed assets, `s-maxage=N, stale-while-revalidate=M` for CDN-cacheable pages. The student needs the defaults reflexively and the directive semantics underneath.

**Ideal teaching artifact.** Mechanics + Decision archetype. A compact directives reference (one-line "reach for it when…" per directive) is paired with a three-row decision table: response class → senior `Cache-Control` value → one-line rationale. The `no-store` vs. `no-cache` confusion gets its own inset: two side-by-side mini-figures showing the cache's state machine under each directive — same request, different storage outcomes.

**Engagement.** `Matching` drill: response class → `Cache-Control` value (six scenarios, three correct values used twice with subtle differences). Followed by `Tokens` on a `Cache-Control: private, no-store, must-revalidate` string — the student clicks the load-bearing tokens and flags the redundant one.

**Components.**
- `Figure` wrapping a hand-SVG showing the two cache state machines (no-store vs. no-cache).
- `Matching` for the response-class-to-directive drill.
- `Tokens` for the directive parsing drill.

---

## Concept 10 — Cookies for browsers, Bearer for programmatic clients

**Why it's hard.** The student has seen `Authorization: Bearer` in API docs and assumes it's the universal auth header. The 2026 rule: cookie-based sessions for first-party browser traffic (the Better Auth path in Unit 9), `Authorization: Bearer <token>` for programmatic clients (CLI, SDK, M2M). Mixing them — putting a session token in `Authorization` for browser code — invites XSS-exfiltration risk and breaks Server Action CSRF assumptions.

**Ideal teaching artifact.** Decision archetype. A single side-by-side comparison shows two real requests to `/api/me`: one from a browser (`Cookie: __Host-session=...`), one from a CLI (`Authorization: Bearer ek_live_...`). The prose names the senior rule plainly — cookies for browsers, Bearer for everything else — and explains why: `HttpOnly` cookies are unreadable to JavaScript, which is the property browser apps need; Bearer tokens are easier to attach in code, which is what programmatic clients need. Forward-ref to Unit 9 for the cookie attribute deep-dive and Ch. 9.4 for CSRF.

**Engagement.** `MultipleChoice` with three client profiles (web app, mobile app calling REST API, CI runner hitting the admin API) — pick the auth surface for each. Two distractors per question to surface the "Bearer is universal" assumption.

**Components.**
- `TabbedContent` (or a `Figure` with two annotated request blocks) for the side-by-side comparison.
- `MultipleChoice` for the client-profile drill.

---

## Component proposals

- **`IdempotencyReplaySimulator`** — side-by-side scrubbable timeline showing two POST flows under network failure, one without `Idempotency-Key` and one with. Inputs: a scripted sequence `[{ method, path, body, network: 'ok'|'timeout'|'retry', idempotencyKey? }]`, plus a business-effect projector (account balance, org count). Shows: client state, network state, server state, key-store contents on the right track.
  - **Uses in this chapter** — Concept 2.
  - **Forward-links** — Ch. 7.2 (Server Action retries), Ch. 7.5 (public route handler), Ch. 12.1 (Stripe webhook `event.id`), Ch. 13.2 (Trigger.dev idempotency keys). Four direct forward uses make this the highest-compounding new component in the chapter.
  - **Leanest v1** — one fixed scripted scenario (charge-a-card with one timeout-and-retry), two timeline columns, a numeric balance readout per step, scrub via prev/next buttons. No custom scripting API — the scenario is hard-coded. Even the leanest v1 still carries the misconception fix because the side-by-side balance divergence is the load-bearing reveal.

## Build priority

`IdempotencyReplaySimulator` is the only proposed bespoke component and is the build priority. It carries Concept 2 (the chapter's hardest production-mode misconception) and forward-links four times into later units, retiring an otherwise-recurring need for sequence-diagram redraws of the same pattern. Everything else in this chapter rides on the existing component toolkit — primarily `Buckets`, `Matching`, `Dropdowns`, `AnnotatedCode`, `Tokens`, and hand-SVG inside `Figure` — which keeps the build surface small and concentrates the new-component cost where it compounds.

## Open pedagogical questions

- Concept 4's ambush works only if the student hasn't already seen the 200-with-error-body anti-pattern in Unit 2's error-handling lesson (2.8.x). If 2.8 already names it, the ambush loses its bite and Concept 4 should restructure around the paging-rule decision rather than the misconception reveal.
- The chapter has no project — Concept 2's `IdempotencyReplaySimulator` therefore has no in-unit application beat. The build cost is justified only by the forward-link count; if Unit 7 or Unit 12 lands the simulator differently (e.g., a real `processed_events` table walkthrough), revisit whether the simulator earns its build here vs. in Ch. 12.1.

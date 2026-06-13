# Shipping logs with Vercel Drains

- Title: `Shipping logs with Vercel Drains`
- Sidebar label: `Shipping logs with Drains`

---

## Lesson framing

This is the payoff lesson for the chapter thesis planted in lesson 1: **errors and logs are two surfaces of one incident, joined by `requestId`.** Lessons 2-3 built the structured logger (`lib/logger.ts`, the ALS context, the redact config) but those JSON lines currently die in Vercel's function-logs UI — short retention, free-text-only search, no joins, no dashboards. This lesson is the *wire*: a one-way fan-out (a **Drain**) from the Vercel runtime to a long-lived, queryable destination (Axiom), plus the on-call workflow that cashes in the shared `requestId`.

Pedagogical stance:
- **Almost no new code.** The logger is done. New artifacts are config/UI: a Vercel marketplace integration, a saved query, and an indexed-field verification. This is a *setup-and-workflow* lesson, not a coding lesson. Resist the urge to re-show the logger; reference it.
- **Trigger before tool, as a senior decision.** Don't open with "install Axiom." Open with the senior question — what the Vercel UI *can't* do — and name the concrete threshold that flips a team from the built-in viewer to a real log destination (paged ~once a week). The student must leave able to *decide* when a drain earns its weight, not just click the integration.
- **The load-bearing payoff is the post-incident drill, not the setup.** The setup (install integration, pick dataset) is three clicks and ages fast. The durable skill is the Sentry → `requestId` → drain → narrative pivot. Give the drill the most weight, model it concretely (a single-org webhook 500), and make it the lesson's emotional core: "this is what 3am looks like, and this is why the last three lessons existed."
- **Defaults before conditionals.** Axiom is *the* default (Vercel-native integration, generous free tier, auto-parses nested JSON). Better Stack / Datadog / Grafana Loki get one line each as conditional alternatives with explicit triggers. The manual HTTP-drain path is the conditional escape hatch for off-marketplace destinations — one short section, clearly flagged as "only if."
- **Cognitive-load shaping.** Start with the *why* (gap in the platform), then the *one-way pipe* mental model (a diagram), then the concrete setup, then field discovery (does the inner JSON survive the wire?), then the first query, then the full drill. Each step answers a question the previous step raised.
- **Honesty about boundaries.** The drain is best-effort operational telemetry, not the durable audit log (ch081) and not a compliance store. Vercel's stdout buffer can drop lines on function timeout. Name this so the student never reaches for the drain where a transactional write is required. This also closes the chapter's recurring "operational vs. audit" distinction.
- **Screenshots over prose for UI steps.** The Vercel marketplace install and the Axiom query UI are visual; lean on `<Screenshot>` inside `<Figure>` rather than describing menus in prose. Flag these as capture-needed for the screenshotter agent (no real Axiom/Vercel-Pro provisioned — see Scope for the capture note).

Mental model the student ends with: *Vercel captures my pino stdout → the Drain POSTs batches to Axiom → Axiom indexes the inner JSON keys → I query by `requestId`/`orgId` and join to Sentry on the shared tag. Three tools (Sentry, the drain destination, Vercel's own UI), one workflow.*

---

## Lesson sections

### Introduction (no header)

Warm, brief, concrete. Open on the senior question: the structured `info`/`error` lines the student wired in lessons 2-3 are real and correct — but right now they land *only* in Vercel's function-logs viewer, which keeps roughly the last hour, searches by free text, and offers no joins or dashboards. When a webhook silently 500s for one org overnight, that viewer can't answer "what were the last successful steps before the throw, across the whole incident window." State the lesson goal: stand up a **Drain** to ship those lines to a queryable destination, verify the fields survive the wire, and walk the Sentry-to-logs pivot that resolves a real incident. Preview the payoff: by the end, the student can go from a user-facing error toast to the per-request narrative in three clicks. Connect back: this is the wire that finally makes "errors and logs are two surfaces of one incident" (the chapter thesis) operational.

No code here. One sentence naming that the logger and Sentry wiring from the prior three lessons are the prerequisites and stay untouched.

### Why Vercel's built-in log viewer isn't the destination

Establish the gap concretely so the drain reads as the answer to a felt cost, not a checkbox.

Content:
- The Vercel runtime logs viewer (Observability → Logs): what it *is* good for — eyeballing the last hour during an active deploy, a quick free-text grep on a known string. Short retention window; query is substring, not field-typed (`orgId:"org_123" AND level:error` isn't a query there); no saved dashboards; no cross-request joins; no retention you control.
- Name the threshold explicitly (trigger-before-tool): the moment a team is paged for production incidents on a recurring basis (rule of thumb: ~once a week), eyeballing the last hour stops scaling and a real log destination earns its weight. Before that threshold, the built-in viewer plus Sentry is genuinely enough — say so, so the student doesn't over-build a side project.
- Frame the drain as a *fan-out*, not a replacement: Vercel keeps capturing stdout for its own UI; the drain additionally forwards a copy to a destination that does retention, indexing, joins, and dashboards.

Components:
- A small `<Figure>` with a Mermaid `flowchart LR` (decision-tree shape, the engine's strength) is overkill here; instead use a compact **two-column comparison** as prose-with-a-small-table is fine, OR a tiny HTML+CSS capability table. Prefer a short Markdown table: columns "Vercel logs viewer" vs "Log destination (Axiom)", rows: retention, query model, joins, dashboards, alerting. Keep it to ~5 rows. This is a *visual aid*, not a system graph — its goal is to make the gap legible at a glance.

Tooltip terms: `Drain` (Term: "A one-way export pipe from the Vercel runtime to an external destination; forwards a copy of logs/traces, doesn't intercept them").

### How a Drain moves a log line off Vercel

The one-way-pipe mental model, end to end, before any setup. This is the conceptual spine; get the data path clear so the later "verify indexed fields" step has a referent.

Content:
- Vercel Drains in 2026: the primitive was renamed from "Log Drains" to **Drains** because the same export mechanism now also carries traces and other observability data; for this lesson we use the *Logs* drain. Name the rename once so the student isn't confused by older "Log Drains" docs/blog posts.
- The data path, step by step: pino writes a JSON line to `stdout` (sync, no transport — the Vercel worker-thread footgun from lesson 2, referenced not re-taught) → Vercel captures stdout per invocation → Vercel batches lines and POSTs each batch to the drain's destination over HTTP → the destination receives a payload that *wraps* each line in platform metadata, with the original pino JSON carried as an inner field.
- The wrapper shape (verified against the Vercel Logs drain reference, last updated 2025-11-24): Vercel delivers a JSON array (or NDJSON) of log objects. Each object carries Vercel's own envelope fields — `id`, `timestamp`, `deploymentId`, `projectId`, `host`, `source` (`lambda`/`edge`/`build`/…), `environment`, plus Vercel's *own* `level` (`info`/`warning`/`error`/`fatal`) and `requestId` — **and** a `message` field that is a **string** (capped ~256 KB, may be truncated) carrying the application's stdout, i.e. the raw pino JSON line. This is the key subtlety the next section depends on: there are *two* layers, and they are not the same fields. Vercel's `level`/`requestId` on the envelope are platform-derived; the student's `orgId` (and the pino-emitted `requestId`, which equals Vercel's only because the app echoed `x-request-id` per lesson 2) live **inside** the `message` string. The destination must parse that inner JSON for `orgId`/`level`/`requestId` to become real queryable fields. Precision note for the builder: don't tell the student the envelope's top-level `requestId`/`level` *are* their pino fields — frame the inner `message` parse as the thing that surfaces the app's keys.
- Plan requirement: Drains are a Pro/Enterprise feature; the course assumes Pro for the production scenario. State it plainly so a Hobby-tier student isn't stuck.
- Per-environment: a drain is scoped to environments (production / preview / development). Default to production-only; preview/dev drains add noise and burn the free tier. (Watch-out, taught here at the concept it qualifies, not bundled later.)

Components:
- A **`<DiagramSequence>`** (4-5 steps) is the right vehicle — it's a temporal data path the student scrubs through, and the engine sizes to the tallest step. Each step is a simple HTML+CSS box-row (pino → stdout → Vercel capture → batch POST → destination index), highlighting the active hop. Per-step captions carry the one-sentence explanation. Pedagogical goal: make the "two JSON layers" idea concrete and spatial before the student has to verify it in the Axiom UI. The final step shows the envelope vs. inner-`message` split visually (a box labeled "Vercel envelope" containing a nested box labeled "pino JSON (message)").
- Note for the builder: keep boxes to short labels; this is an annotated illustration of a pipe, not an architecture graph. Do NOT wrap `<DiagramSequence>` in `<Figure>` (it's its own card).

Tooltip terms: `stdout` (only if not already heavily used by ch092 lesson 2 — likely skip, it was taught there).

### Installing the Axiom integration

The default-path setup. Keep it tight — this ages fast and is genuinely a few clicks.

Content:
- Why Axiom as the course default (defaults-before-conditionals, stated as a decision): Vercel-native marketplace integration (creates the drain *for* you, no manual HTTP endpoint or auth header to manage), generous free ingest tier that covers a course-scale app, schema-on-read JSON (it auto-parses the inner pino `message`, so keys become fields without a pipeline), dataset-per-environment, usable query UI.
- The install walkthrough as a `<Steps>` list: open the Vercel Marketplace → add Axiom → authorize the connection → select the project → pick/confirm the dataset (one per environment). Name what the integration *writes for you*: it provisions the drain and wires ingest auth through the integration, so you do **not** hand-manage an `AXIOM_TOKEN`/`AXIOM_DATASET` env for the integration path (contrast with the manual path below, where you would). Keep this factual and short.
- One line on alternatives with triggers (named once, not taught): **Better Stack** (formerly Logtail) — similar shape, smaller free tier, reach for it if you prefer its alerting/uptime bundle; **Datadog** — when the team *already* runs Datadog for infra, accept the heavier UI and price; **Grafana Cloud Loki / Logflare** — when you want open-source-friendly/self-hostable and will do more setup. Default stays Axiom.

Components:
- `<Steps>` for the ordered install procedure.
- One or two `<Screenshot>` (inside `<Figure>` for captions): the Vercel Marketplace Axiom integration page, and the post-install confirmation showing the drain/dataset. Flag as capture-needed. Builder note: these are UI-state captures of a third-party flow — see Scope for the no-real-account capture guidance.
- A small `<CardGrid>` of `<ExternalResource>` cards could hold the Axiom + Vercel integration docs, but defer external links to the closing resources section to avoid mid-lesson detours. Mention here only that the integration docs are linked at the end.

Tooltip terms: `schema-on-read` (Term: "The destination infers fields from the JSON at query time instead of requiring a fixed schema up front — new keys become queryable automatically").

### The manual drain, for destinations off the marketplace

The conditional escape hatch. Clearly flagged as "only when the integration path doesn't exist." Keep short.

Content:
- When you'd reach for it: a custom or self-hosted destination with no Vercel marketplace integration (your own collector, a Loki endpoint, an internal HTTP sink).
- The shape: Vercel project Settings → **Drains** → New Drain → source **Logs** → format **JSON** → destination URL → optional secret/auth header. Vercel then POSTs each batch to that URL. The destination is responsible for parsing the envelope and the inner `message`.
- The cost you take on vs. the integration: you manage the endpoint, the auth header (store it as a project env/secret), and the parsing pipeline yourself. That's why the marketplace integration is the default.

Components:
- A short `<Steps>` mirroring the manual config path.
- Optionally one `<Screenshot>` of the New Drain form. Lower priority than the Axiom captures; include only if cheap to capture.
- An `<Aside type="note">` making explicit: "Most readers use the Axiom integration above and can skip this section."

### Confirming your fields survived the wire

The verification step the whole querying workflow rests on. This is where the "two JSON layers" idea from the data-path section pays off. Senior posture: *don't trust that it worked because the wizard said so* — assert the shape.

Content:
- The thing that can silently go wrong: the destination indexes Vercel's envelope fields fine but treats the inner pino `message` as one opaque string, so `level` / `requestId` / `orgId` never become queryable fields. Axiom auto-parses nested JSON; Datadog needs a parsing pipeline; Better Stack auto-parses — so this check is destination-specific and must be done after setup.
- The check, concretely: trigger one real log line (the student already emits `info` lines on normal app actions from lessons 2-3 — e.g. sign in, or hit any instrumented server action), open the dataset, and confirm that `level`, `requestId`, and `orgId` appear as **top-level indexed fields**, not buried in a `message` blob. Show what "parsed correctly" looks like vs. "stuck as a string."
- If they're stuck as a string (the destination didn't parse the inner JSON): the fix is destination-side (enable/define a JSON parser on the inner `message` field). Name it, don't deep-dive — Axiom (the default) needs no action.

Components:
- A **`<TabbedContent>`** with two tabs: "Parsed (queryable)" showing a record where `level`/`requestId`/`orgId` are columns, and "Unparsed (broken)" showing the same data trapped inside `message`. Each tab is a `<Screenshot>` (capture-needed) or, if captures are impractical, a hand-built HTML+CSS mock of the destination's record view. Pedagogical goal: give the student a concrete visual target for "correct" so they can self-verify. Prefer the HTML+CSS mock here over a screenshot — it renders the JSON-field distinction cleanly and isn't dependent on a live Axiom account (see Scope capture note).
- Builder note: this is a strong candidate for a small **HTML+CSS figure** rather than a screenshot, because the contrast (top-level fields vs. nested blob) is the teaching point and a mock controls it precisely.

### Your first useful query

The smallest query that does real on-call work — the bridge from "fields are indexed" to "I can answer a question."

Content:
- The query, in Axiom's query language (APL) and described in plain field-filter terms so it transfers to any destination: "errors for one org in the last 24 hours" → filter `level == "error"` and `orgId == "org_123"` over the last 24h. Show the literal APL and translate each clause. Keep it to one query.
- Saving it as a view: pin it so the on-call doesn't retype it at 3am. One sentence; the full dashboard is built in the ch095 project (forward pointer, don't build it here).
- Reinforce the cardinality lesson without re-teaching it: this query only works because `orgId` and `level` are low-to-bounded-cardinality indexed fields — the discipline from lessons 2-3 is what makes the destination queryable. One sentence linking back.

Components:
- A `<Code>` block for the APL query (Expressive Code; APL/SQL-ish, fence as `sql` or plain for highlighting). If two clauses need attention, a short `<AnnotatedCode>` could walk filter-by-filter, but a single annotated `<Code>` with a sentence per clause is lighter and preferred for a one-line query — use plain `<Code>` plus prose.
- Optionally a `<Screenshot>` of the query result list (capture-needed, low priority).

Tooltip terms: `APL` (Term: "Axiom Processing Language — Axiom's query language; the field-filter idea transfers to any log destination's query syntax").

### The Sentry-to-logs pivot

The conceptual heart that the chapter has been deferring to this lesson (debts in lessons 1-3 all point here). The shared `requestId` is the join key.

Content:
- Recall the setup that makes the pivot possible (one or two sentences, reference not re-teach): lesson 1 placed `requestId` on the Sentry event via `Sentry.getCurrentScope().setContext('request', { requestId })`; lesson 2 threaded the *same* `requestId` through the ALS context onto every log line. Same value, two systems. (Note the continuity precision: it's in Sentry **context**, not a tag — high-cardinality, readable on an open event, not a filter dimension. State this correctly.)
- The pivot, as the core workflow: on-call opens the Sentry event (grouped, stack trace, release, user/org tags) → reads the `requestId` from the request context → switches to the drain destination → filters by that `requestId` → reads the full per-request narrative (the `info` lines leading up to the `error` line, with the cause chain). "Three clicks from the user-facing error message to the per-request story."
- The two surfaces answer different questions, said explicitly: **Sentry = what threw** (stack trace, grouping, release); **the drain = what happened** (the ordered narrative of steps, inputs, outcomes for that one request). Neither alone is enough; together they reconstruct the incident without redeploying.
- Deep-linking: Sentry can deep-link to the destination via the Sentry-Axiom integration; for Datadog/Better Stack the link is manual (copy-paste the `requestId`) but the workflow is identical. One line.

Components:
- An **`<ArrowDiagram>`** inside `<Figure expandable={false}>` (LeaderLine needs expandable off — note this for the builder) is ideal: two custom HTML "panels" side by side — a stylized Sentry event card (left) and a drain query view (right) — with an arrow labeled `requestId` flowing from the Sentry context field to the destination's filter box. Pedagogical goal: make the *join* visceral — one value bridges two tools. This is the lesson's signature visual.
- Alternatively, if the two-panel mock is too heavy, a `<DiagramSequence>` of the three clicks (Sentry event → copy requestId → filtered drain view) works and is simpler to author. Builder's choice; the ArrowDiagram is the stronger teaching artifact if feasible.

### Reading production logs in anger: a webhook 500 at 2am

The load-bearing drill. Model the full workflow end to end on a concrete, named incident so the discipline reads as a lived procedure, not an abstract list. This is the lesson's payoff and the chapter's emotional close.

Content — the modeled incident (walk it, don't list it):
- Setup: a Stripe webhook handler 500s for a *single* org for ~3 hours starting 02:00 UTC. Sentry shows 47 grouped events, all the same fingerprint, all tagged `orgId: org_xxx`.
- The workflow, step by step:
  1. Open the Sentry event group; confirm it's one fingerprint; copy a sample `requestId` from the request context. (Sentry tells you *what threw* — a signature-verification failure — but not *why now*.)
  2. Open the drain destination, filter by that `requestId`; read the per-request narrative — the `webhook received` `info` line, the `signature verified` step is *missing*, the `error` line with the cause chain.
  3. Widen the filter to `orgId` over the 02:00-05:00 window; confirm the blast radius — *this org only*, not all orgs (rules out a global outage / your own bad deploy).
  4. Read the `info` lines just before the divergence across several requests; the pattern: every request for this org started failing signature verification at the same minute → the org rotated its webhook signing secret upstream and the new secret was never applied on your side.
  5. The fix path (named, not implemented): update the stored signing secret for that org; the missing-signature errors stop. Note the durability caveat that ties to the audit-log distinction below.
- The meta-point: each surface answered a different question and the order matters — Sentry (what + scope by tag) → logs (the narrative + the divergence) → (if still stuck) the debugger (lesson 5, forward pointer: "when the narrative still doesn't explain *why a predicate returned false*, you attach the inspector"). This drill recurs in ch095 with a seeded failure.

Components:
- A **`<Sequence>`** ordering exercise is the right interactive check here: give the student the five workflow steps shuffled and have them reorder into the correct on-call sequence (Sentry event → copy requestId → filter logs by requestId → widen to orgId for blast radius → read pre-divergence info lines). Pedagogical goal: cement the *order* of the pivot, which is the transferable skill. Source order = correct order; `instructions` prop frames it as "order the on-call steps for the 2am webhook page." This is preferred over a passive read because the order is the thing worth testing.
- Consider a `<DiagramSequence>` that visually walks the same five steps (Sentry card → requestId highlighted → drain filtered → widened → divergence line highlighted) as the *teaching* artifact, with the `<Sequence>` exercise *after* it as the check. Don't duplicate — if the ArrowDiagram in the pivot section already carries the visual, keep this section's teaching in prose + the `<Sequence>` exercise to avoid figure fatigue. Builder's judgment on figure budget.

### What stays on Vercel, and what the drain is not for

Boundaries. Prevents over-draining and closes the operational-vs-audit recurrence. Taught here because these are the watch-outs that qualify *the drain's role*, so they belong with the concept.

Content:
- Vercel-native checks that don't need a drain: build logs, deploy events, function-duration p95 / cold-start metrics — Vercel surfaces these in its own Observability UI. Don't drain everything; the drain carries *application JSON*, the platform stays platform-native.
- The minimum viable observability stack, named as the chapter's synthesis: **Sentry** (errors + stack traces) + **the drain destination** (structured per-request logs) + **Vercel's UI** (platform metadata). Three tools, one workflow. Anything beyond — APM, full distributed tracing, custom dashboards — must earn its weight against this baseline (forward pointer: ch094 perf traces, ch093 product analytics).
- The drain is *not* the audit log (the chapter's recurring distinction, now closed): the drain is best-effort *operational* telemetry — Vercel's stdout buffer can drop lines on function timeout, retention is ~30 days, and it's not a compliance store. The audit log (ch081) is a transactional DB write, durable, retained per legal basis, and is the path for anything that *must not be lost* (e.g., the record that the signing secret was rotated). Cross-reference, don't re-teach.
- Retention/cost shape in one line: free tier covers course traffic; Axiom's free Personal tier is **500 GB ingest per month** (monthly, not cumulative — on overage Axiom *pauses new ingest* rather than deleting older data, so a noisy deploy can blind you to *new* events mid-incident); Vercel bills Drains egress at ~$0.50/GB on top. So production-only drains and level discipline (no `info` on hot reads, from lesson 3) protect both the bill and your visibility. Tie back to cardinality/level discipline rather than re-teaching it. (Figures verified June 2026 — keep them soft/approximate in prose since vendor tiers move.)

Components:
- An `<Aside type="caution">` for the "drain is not the audit log / stdout can drop lines on timeout" point — this is a genuine danger worth setting apart, and it qualifies the drain's role directly.
- A compact `<Figure>` with a small HTML+CSS three-box diagram of the "Sentry + drain + Vercel UI" stack could close the lesson visually, but only if it adds over prose — likely a simple three-pill row labeled by what each answers ("what threw" / "what happened" / "platform health"). Optional; keep if the lesson needs a visual anchor for the synthesis.

### External resources (closing, optional)

A small `<CardGrid>` of `<ExternalResource>` cards: Vercel Drains docs, the Axiom Vercel integration docs/guide, and (one line) the Better Stack / Datadog log-management docs as alternative-destination references. Brand icons via `simple-icons:*` (Vercel, Axiom if available, else `lucide:*`). Keep to 3-4 cards. Per pedagogy, external links live at the end, not mid-flow.

---

## Scope

**Prerequisites to redefine concisely (1 sentence each, do not re-teach):**
- The structured logger (`lib/logger.ts`, pino, sync stdout, the worker-thread footgun) — built in ch092 lesson 2; this lesson only *ships* its output.
- The ALS `requestId` thread and the fixed key set (`level`, `requestId`, `orgId`, etc.) — ch092 lesson 2; referenced as the fields the destination indexes.
- The redact config / PII exclusion — ch092 lesson 3; referenced only to say "the lines are already safe to ship."
- Sentry's `requestId` in event *context* (not tag) — ch092 lesson 1; referenced as the join key.
- The audit log (`logAudit(tx, event)`) as a separate durable store — ch081; referenced for the operational-vs-audit boundary.

**Out of scope (owned elsewhere — do not teach):**
- Logger setup, child loggers, ALS, level semantics, the fixed key set — **ch092 lesson 2**.
- The 3am rule, the PII exclusion list, the `redact` config, structural redaction — **ch092 lesson 3**.
- Sentry install, the wizard, `onRequestError`, `captureException`, breadcrumbs, source maps, releases, `beforeSend` — **ch092 lesson 1**.
- VS Code debugger / `next dev --inspect` / breakpoints — **ch092 lesson 5** (forward-pointer only: "when logs still don't explain *why*").
- The audit log's retention timers and deletion, IP-specific shorter retention — **ch081 lessons 3-4**.
- Vercel Speed Insights / Web Analytics drains, product analytics — **ch093**; performance traces / APM at depth — **ch094**.
- Building the saved dashboard and running a seeded failure drill hands-on — **ch095 project** (this lesson *models* the drill; the project *executes* it).
- OpenTelemetry / full distributed tracing — out of scope for the chapter (name once at most, as the "beyond the baseline" pointer).
- Custom drain destinations beyond the one short "manual drain" section — named once, not deep-dived.

**Capture note for the screenshotter agent:** no real Axiom account or Vercel Pro project is provisioned for this course (consistent with prior chapters' constraints). Prefer **hand-built HTML+CSS mocks** for the field-discovery contrast and the Sentry→logs pivot panels, since those are the teaching points and a mock controls the exact JSON-field distinction. For the marketplace-install and query-UI steps, if live captures aren't feasible, fall back to faithful HTML+CSS mocks of the relevant screen rather than blank/placeholder images. Flag any screen that genuinely needs a real capture so the curator can decide.

---

## Notes for downstream agents (code conventions alignment)

- Env handling: the integration path needs **no** app-side env vars; if the manual-drain section shows an auth header, store it as a Vercel project secret (Vercel's "sensitive" flag), consistent with the security baseline — do not put it in `env.ts` client surface. No `NEXT_PUBLIC_*`.
- No new application code ships in this lesson. Any code block is either (a) the existing pino line that produces the log (shown for reference only, must match lesson 2's `logger.child(...)` shape and the fixed key set) or (b) the destination's query language (APL), which is not application code and isn't bound by the TS/Drizzle conventions.
- Keep `requestId` terminology exact: it lives in Sentry **context** (not a tag) and on every pino line via the ALS child logger — this matches the continuity notes for lessons 1-2. Do not call it a Sentry "tag."
- Logger level discipline (`info` for state changes, never hot reads) is referenced as the cost-control reason production-only + level discipline protect the free-tier bill — consistent with the Logging section of the conventions; don't re-teach it.

# The launch checklist

Title: The launch checklist
Sidebar label: The launch checklist

---

## Lesson framing

This is the final teaching lesson of Chapter 098 and the capstone of the chapter's "is the URL defensible" thread. Lessons 1–7 each wired one platform surface; this lesson is the **structural gate** that confirms every safety net the course already installed is actually live in production before the URL goes public. It is the chapter quiz's last big topic (L9).

**The senior diff this lesson teaches is the posture, not new tech.** A junior calls the app "launched" when the homepage renders (true since L4). A senior calls it launched only when, on the day something breaks, the team *sees* it, can *roll back*, can *audit* what happened, and *doesn't lose data*. The lesson's job is to convert that posture into a one-minute-per-row verification list the student can run against their own deploy. Almost nothing here is authored from scratch — each row is a `curl`, a SQL query, a dashboard glance, or a deliberate test error against machinery shipped in an earlier unit.

**Pedagogical spine: the checklist IS the lesson.** The load-bearing artifact is an interactive `<Checklist>` of nine rows (eight hard + one soft), each row = (what it protects, the exact verification command/step, where it was wired, the failure mode if skipped). Teach it as a *reference the student executes*, not prose to read. The cognitive-load move: front-load a 60-second framing of *why a live URL is not a launched product*, then make every row self-contained so the student can jump to the one they're unsure about. Resist re-teaching the underlying tech — each row cross-references its origin unit and stops. Where the chapter outline implied this lesson authors a snippet that another unit already owns (security headers), the lesson **verifies presence and cross-references**, it does not re-author.

**The one genuinely new artifact this lesson owns: the `/api/health` endpoint.** It does not exist anywhere in the codebase yet (verified). It is ~10 lines, and it is the hook Row 8's external uptime monitor pings. This is the only real code the student writes here, so it gets a proper `AnnotatedCode` treatment.

**Two cross-cutting senior ideas threaded through the rows, stated once and reused:**
- *A safety net nobody reads is not a safety net.* Three of the rows (monitoring, audit, uptime) are worthless without a human on the other end — so the lesson elevates the "is anyone watching?" question to its own short section, covering alert routing and on-call.
- *The checklist is not a one-time ritual.* It is re-run quarterly and watched daily in week one. Name this so the student doesn't treat the green checklist as permanent.

**Continuity constraints carried from earlier lessons (hard):**
- All Vercel/Neon UI references are HTML/CSS mocks or `curl`/SQL transcripts — **never real screenshots** (chapter-wide convention from L2–L7).
- Pro-tier gating is named at first mention of any Pro feature (chapter rule). Relevant here: deployment-protection / preview password is a Pro **add-on** (not free) — but L8 only *references* it, so keep gating to a single clause and let L5 own the detail.
- L4 already shipped a five-command domain-verification checklist and `curl -I` header verification; L8 **cross-references, does not duplicate** (continuity note from L4).
- Ch081 L1 already shipped the six security headers, the `next.config.ts`/`proxy.ts` split, the `curl -I` check, and securityheaders.com. Row 5 **verifies and points back**, it does not re-derive the header set or re-author the snippet.
- `proxy.ts`, not `middleware.ts`, everywhere (Next.js 16 rename, established in L3).

**Estimated student time:** 45–55 minutes. Reference/survey + Pattern. The nine-row interactive checklist with concrete verification steps is the deliverable.

---

## Lesson sections

### Introduction (no header)

Open on the gap, concretely. The first production URL has been live since L4 and every platform knob is tuned (L1–L7). Pose the senior question implicitly: *the homepage renders — is the product launched?* Answer: no, and give the one-sentence definition the rest of the lesson operationalizes — **launched means the URL is defensible: it degrades gracefully on errors, doesn't leak data, doesn't fall over under load, and has a human watching when it does.** Preview the deliverable: a nine-row checklist the student runs against their own deploy, where almost every row verifies machinery shipped in an earlier unit, plus one new health endpoint they'll write here. Keep it to ~4 short paragraphs. Include the `<CourseProgressBar>` at the top (chapter convention — copy the frontmatter `course-progress` pattern from sibling lessons).

Reasoning: the pedagogical guidelines require the introduction to motivate with a concrete problem and connect to prior knowledge; "your URL is live but not launched" is the exact tension that makes a checklist feel necessary rather than bureaucratic.

### Launch is a posture, not a URL

Short section (do not over-write — this is the framing, the rows are the substance). Establish the mental model before any row:

- The shift from "does it render" to "is it defensible." Use a one-line analogy: the URL going live is *opening the doors*; the checklist is *confirming the smoke detectors, locks, and fire exits work* — a building passes occupancy inspection, it isn't just "the lights turn on."
- State the two cross-cutting principles here so the rows can lean on them by name later: (1) **a safety net nobody reads is not a safety net** — wiring is necessary but not sufficient; (2) **the checklist is structural and recurring** — every row maps to a concrete one-minute check, and an unchecked row means *not launched*, regardless of how the homepage looks.
- Name what the checklist explicitly does *not* claim, to set honest expectations: not feature-complete, not bug-free, not architecturally final. It claims only that the safety nets are wired so failures are *survivable*. Surface this as a short `Aside` (note) rather than prose, so it reads as a caveat.

**Diagram (small, HTML+CSS via `<Figure>`):** a simple two-state strip — left card "URL is live" (homepage icon, green) vs right card "URL is defensible" (the nine safety-net glyphs around it). Pedagogical goal: make spatial that "live" is a *subset* of "launched," and that the rows fill the gap. Keep it under ~300px tall, horizontal. This is a low-effort visual aid, not a system graph — exactly the kind the diagram guidelines encourage. Mark as a TODO stub for the component builder.

Reasoning: a tiny amount of framing buys the right reading posture for the checklist; the diagram converts the abstract "defensible" into something concrete in one glance, lowering cognitive load before the dense row list.

### The nine-row launch checklist

This is the heart of the lesson. Render the rows as an interactive `<Checklist id="launch">` with `<ChecklistItem chip="untested">` for the eight hard rows and one soft row — the student literally ticks each as they verify it against their deploy. **But the checklist component alone is not enough teaching** — each item text must stay to one observable outcome (component constraint). So pair the checklist with prose: introduce the checklist, then walk the rows in a structured form below it where each row gets its (protect / verify / origin / failure-if-skipped) detail.

Recommended structure to keep this scannable and avoid a wall of text: present each row as a compact unit — a bolded row title, a one-line "what it protects," a fenced verification command or step, a "wired in: <unit>" cross-reference, and a one-line "skip it and:" failure mode. Use `Code` blocks for the `curl`/SQL/shell verification snippets (these are simple, single-focus blocks — no need for AnnotatedCode except the health endpoint). Consider grouping the rows under a single h3 each only if budget allows; otherwise keep them as bolded sub-units under this one h2 to avoid header sprawl. Lead the writer toward bolded sub-units (lighter weight) unless a row needs a diagram.

The nine rows, with the exact content each must carry:

**Row 1 — Env validation green in production.**
Protects: the app booting with every required secret present. Verify: the production build log shows the env validator passed, and `SKIP_ENV_VALIDATION` is *not* set in the production environment. Wired in: L6 (this chapter) + Unit 5 / Ch081 L7 (`@t3-oss/env-nextjs` + Zod in `env.ts`). Skip it and: a missing var surfaces as an opaque runtime crash on the first request instead of a caught build failure. Cross-reference L6; do not re-derive the validator schema.

**Row 2 — Error monitoring wired and receiving.**
Protects: the team seeing exceptions the app reports. Verify: Sentry is initialized in `instrumentation.ts`; throw a deliberate test error in production and confirm it appears in the Sentry dashboard within seconds; source maps uploaded so the stack trace is readable. Wired in: Unit 19 (Ch092). Skip it and: errors are invisible and compound silently. Note `instrumentation.ts` as the Next.js 16 server-startup hook (one clause) — it was named but not built in this chapter's L3, and wired in Unit 19; do not teach it here.

**Row 3 — Rate limits live on the abuse surface.**
Protects: auth endpoints from credential-stuffing on day one. Verify: sign-in / sign-up / password-reset / magic-link are rate-limited via the Upstash `safeLimit` wrapper; hammer one endpoint and confirm `429`s after the threshold. Give the verification command using **`oha`** as the modern default (`oha -n 50 -c 5 <URL>`), and name `hey` or a `curl` loop as equivalents — `oha` is the current Rust-based successor with a live TUI. Wired in: Unit 14 (Ch074–075). Skip it and: unrated auth endpoints are a credential-stuffing target immediately. Tooltip candidates: *rate limiting*, *credential stuffing* (define both succinctly).

**Row 4 — Audit logs writing.**
Protects: compliance and incident-response visibility into privileged actions. Verify: every privileged action (org-membership / role / billing / data-export changes) writes a row via `logAudit`; run `select * from audit_logs order by created_at desc limit 10` and see recent rows. Wired in: Unit 9 (Ch057). Skip it and: compliance and post-incident forensics fly blind. Note the table is `audit_logs` (plural, matches the shipped schema) and writes go through `logAudit(tx, event)` inside a transaction — recall only, do not re-teach.

**Row 5 — Security headers set.**
Protects: the browser refusing clickjacking, MIME-sniffing, downgrade, and script injection. Verify: `curl -sI https://app.example.com` returns the six headers — `Strict-Transport-Security`, `Content-Security-Policy`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, and `X-Frame-Options` — and optionally paste the URL into securityheaders.com for a letter grade. Wired in: Ch081 L1 (`next.config.ts` for the five static headers; `proxy.ts` for the per-request nonce CSP). **Critical: this row verifies presence and cross-references Ch081 — it does NOT re-author the header snippet or re-derive the CSP.** This corrects the chapter outline, which framed an owned snippet here; Ch081 L1 already ships the canonical version and the same `curl -I` check. Skip it and: a correct-looking response leaves the page frameable, sniffable, and downgradable. State plainly that Vercel adds none of these by default.

**Row 6 — Pooled DB connection with matching region.**
Protects: the database surviving load and queries not paying cross-region latency. Verify: Drizzle uses Neon's **pooled** connection string (the `-pooler` segment in the hostname); the production function region matches the Neon DB region. Wired in: L3 (this chapter, region) + Unit 5 (the `db` client's pooled/unpooled split). Skip it and: unpooled connections exhaust Postgres under load; a cross-region function pays ~80ms per query, invisible in local dev. Cross-reference L3 twice as the continuity notes require.

**Row 7 — Restore history on and a test restore performed.**
Protects: recoverability from data loss. Verify: Neon's **instant-restore history window** is set to an adequate retention (1 day default on paid plans; raise toward 7+ days for production), and you have performed at least one **test restore** to a Neon branch and confirmed it. Wired in: Unit 5 (Neon) + L5 (branching, this chapter). Skip it and: a never-exercised restore is hope, not a backup. **Correction over the chapter outline:** Neon's terminology in 2026 is *instant restore / restore history window* (copy-on-write history), not "automated backups, 7-day default." For a true off-platform copy, name `pg_dump` in one clause as the belt-and-suspenders option. Tooltip candidate: *point-in-time / instant restore*.

**Row 8 — External uptime monitor that pages a human.**
Protects: catching the app being *down entirely* — the failure Sentry can't report because the app never runs. Verify: an external monitor hits `/api/health` every ~1 minute and pages on failure, and the page reaches a real human. Name **Better Stack** as the current default (uptime + on-call scheduling + escalation in one), with Pingdom / UptimeRobot / OnlineOrNot as alternatives. Wired in: owned partly here (the health endpoint) + the monitor is an external SaaS. Skip it and: the app can be hard-down with zero alerts because nothing inside it is alive to report. **Make the two-layers point explicit:** Sentry catches errors the app *reports*; uptime catches the app being *unreachable*. Both required, neither substitutes for the other. Critically, the monitor must run on infrastructure *external* to the app — a monitor on the same platform dies with it.

**Row 9 (soft) — Runbooks for the top three incidents.**
Protects: the 2 AM responder who needs a checklist, not a memory test. Verify: `docs/runbooks/` holds a sub-one-page markdown for each of (1) production rollback, (2) database restore, (3) credential rotation. Wired in: named in L7 (rollback runbook) and Ch081/L6 (rotation); templates owned by Unit 21. Mark this as soft (chip it or label it) because the *templates* are Unit 21's job — this row verifies the files exist, not their authorship. Skip it and: incidents become improvisation under stress.

**`<Buckets>` exercise (after the rows, comprehension check):** the strongest fit for this content. Present a set of failure scenarios and have the student sort each into the checklist row that would have *prevented or caught* it. Two buckets won't be enough; use a small set of well-chosen rows as buckets (e.g., "Uptime monitor" / "Error monitoring" / "Rate limit" / "Audit log") and ~6–8 scenario chips ("a deploy 500s for every user at 3 AM and nobody notices for two hours", "an attacker scripts 10k sign-in attempts", "you can't prove who changed a customer's role last month", "the database is up but the app process is hung"). Pedagogical goal: force the student to map symptom → safety net, which is exactly the diagnostic reflex the checklist instills. This is higher-value than an MCQ because it drills the *mapping*, not recall of a single fact. Grading: each chip matches exactly one bucket.

Reasoning: the checklist component gives persistence and a real do-this-now affordance; the prose rows carry the teaching that the component's one-line items can't. Simple `Code` blocks (not AnnotatedCode) suit single-focus `curl`/SQL snippets. The Buckets drill converts passive reading into active symptom-to-net mapping, which is the transferable skill.

### The health endpoint the monitor pings

The one section with real new code the student authors. Frame it tightly: Row 8's uptime monitor needs *something to hit*, and "the homepage returns 200" is a weak signal because the page can render while the database is unreachable. So ship a dedicated `/api/health` route handler that does one meaningful check — confirms the DB is reachable — and returns 200, no auth.

**`AnnotatedCode` walkthrough** of the ~10-line route handler. This is the right component because the focus needs to move across a few distinct parts (the named `GET` export, the lightweight DB ping, the 200-vs-503 return). Code shape to give the writer, aligned with code conventions (route handler section: one handler file per route, named `GET` export; the `db` client from `@/db`):

- File: `src/app/api/health/route.ts`.
- `export const GET = async () => { ... }` — named export (route handlers use named exports; framework permits the `route.ts` default-export carve-out but `GET` is a named export regardless).
- A minimal DB liveness probe — a trivial `select 1`-style query through the Drizzle `db` client wrapped so a failure is caught.
- Return `200` with a tiny JSON body (`{ status: 'ok' }`) on success; on a caught DB error return `503` with `{ status: 'degraded' }`. This is the senior touch: a health endpoint that *only* checks the process is alive (always-200) is weaker than one that checks its critical dependency.
- Keep it unauthenticated and cheap — the monitor hits it every minute.

Annotated steps (3–4): (1) the named `GET` handler signature + why a route handler not a Server Action (a non-browser client — the monitor — calls it, which is exactly trigger #1 in the route-handler conventions); (2) the DB liveness query and the try/catch that turns an exception into a refusal (tie to the error-handling convention: a check that throws is treated as failure → return 503); (3) the 200/503 split and why a dependency-aware health check beats a bare 200.

Note for the writer: keep the probe query simple and avoid leaking internals in the body — the response is public. Do not over-engineer (no auth, no detailed component breakdown — that's beyond a launch baseline). Mention in one clause that richer health checks (per-dependency status, readiness vs liveness split) exist but are past the baseline.

Reasoning: this is the lesson's only genuinely owned code, so it earns AnnotatedCode rather than a plain block; routing the student's attention across the handler signature, the dependency probe, and the status split is exactly what AnnotatedCode is for. Grounding it in the route-handler and error-handling conventions keeps it consistent with the rest of the course.

### Is anyone watching?

Short but load-bearing section — the elevation of cross-cutting principle (1). Three of the nine rows (error monitoring, audit logs, uptime) are *inert without a human on the other end*. Make the point that wiring an alert is half the job; the alert reaching someone who acts is the other half.

Cover concisely:
- **Routing:** error and uptime alerts must land somewhere a human actually looks — a Slack channel someone reads within the hour during business hours, and an on-call page that wakes someone outside hours. Name that uptime tools like Better Stack bundle on-call scheduling and escalation so the "page a human" step is built in.
- **Escalation must be explicit:** who is on-call, and what happens if they don't ack — name escalation-to-the-team as the backstop.
- **Alert fatigue is the failure mode of over-tuning:** a monitor that pages on every blip trains the team to ignore it. Tune to *actionable* signals. Surface this as an `Aside` (caution).
- **First-week practice:** for the first ~72 hours daily-check the new-error count (Sentry), audit-log growth, the rate-limit dashboard for unusual spikes, and the function-error rate — most launch problems surface in the first three days. Frame as "budget the time," not a permanent burden.

Reasoning: this is where the chapter outline's strongest senior insight lives ("a safety net nobody reads is not a safety net"). Pulling it out of the rows and into its own section prevents it from being lost as a per-row footnote, and ties the otherwise-mechanical checklist back to the human system that makes it real.

### Re-run it, don't frame it (closing)

Brief close (a few sentences, can fold into the last section if budget is tight). Reinforce principle (2): the checklist is not a launch-day trophy. Re-run it quarterly; watch the dashboards daily in week one; treat a row that *was* green but isn't anymore as a regression. Then the standard forward/backward seam: this lesson closes the chapter's "ship and make it defensible" arc; the next chapter (099) takes the one thing this checklist treats as a black box — schema migrations — and teaches the expand-migrate-contract cadence that lets a live database change without an outage. End with the recall that the student can now run the launch question against their own deploy.

`ExternalResource` cards (2–3, optional, at the end): OWASP / a production-readiness checklist reference, the Better Stack uptime docs, and Vercel's production-checklist doc. Keep to genuinely useful, current sources.

Reasoning: the pedagogical guidelines call for a brief warm close that previews what's next; the migration black-box hand-off to Ch099 is the natural seam and was flagged as a deferred boundary throughout the chapter.

---

## Scope

**This lesson covers:** the launch-readiness *posture*; the nine-row verification checklist (env validation, error monitoring, rate limits, audit logs, security headers, pooled+region-matched DB, restore-history+test-restore, external uptime monitoring, runbooks); the `/api/health` route handler (the one new artifact); alert routing / on-call / "is anyone watching"; and the re-run cadence. It is verification-first: each row is a check the student *runs*, not a system the student *builds* (except the health endpoint).

**Explicitly out of scope — defer, cross-reference, do not teach:**
- The instant-rollback mechanic and `vercel promote` / two-layer rollback — L7 (this chapter). Row 9 references the rollback runbook only.
- Region/runtime/Fluid Compute selection — L3 (this chapter). Row 6 references the region match, doesn't re-teach how to set it.
- Env-var scoping mechanics, the `NEXT_PUBLIC_*` split, OIDC, the validator schema — L6 (this chapter) + Unit 5 / Ch081 L7. Row 1 verifies the validator passed, nothing more.
- The six security headers, the CSP nonce mechanism, the `next.config.ts`/`proxy.ts` split, `curl -I` header verification, securityheaders.com — **fully owned by Ch081 L1.** Row 5 verifies presence and points back; it does not re-derive or re-author. (Corrects chapter-outline framing of an owned snippet here.)
- Sentry / Pino / `instrumentation.ts` wiring — Unit 19 (Ch092–095). Row 2 verifies receipt; `instrumentation.ts` named in one clause.
- Rate-limit wiring (`safeLimit`, dual-key, Upstash setup) — Unit 14 (Ch074–075). Row 3 verifies behavior with a load command.
- Audit-log schema and `logAudit` internals — Unit 9 (Ch057). Row 4 verifies rows are written.
- Full CSP authoring, the Report-Only rollout — Ch081 L1. Out entirely.
- Runbook *templates* and postmortems — Unit 21. Row 9 verifies the files exist (soft row).
- Schema migrations / expand-migrate-contract — Ch099. The checklist treats migrations as a black box; the close hands off to Ch099.
- The five-command domain-verification checklist and DNS/SSL — L4 (this chapter). Not repeated here.
- Preview password / deployment protection detail — L5 (this chapter). Referenced in a single Pro-gated clause if at all.

**Prerequisites to redefine concisely (one clause each, not full re-teaches):** what the env validator does (build fails on a missing required var); that Sentry is the error monitor wired in Unit 19; that `safeLimit` wraps Upstash rate limiting; that `logAudit` appends to `audit_logs` inside a transaction; that the six security headers and CSP nonce live in `next.config.ts` + `proxy.ts` from Ch081; that Neon's `db` client exposes a pooled connection string. Keep each to a sentence — the student has met all of these.

**Tooltip (`Term`) candidates — strategic only:** *rate limiting*, *credential stuffing*, *point-in-time / instant restore*, *on-call / escalation*, *liveness check* (for the health endpoint). Skip terms already defined upstream (CSP, nonce, clickjacking — defined in Ch081; cold start, p95, region — defined in L3) unless a one-line refresher genuinely aids flow.

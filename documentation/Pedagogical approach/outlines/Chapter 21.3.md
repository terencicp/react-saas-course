## Concept 1 — Git events map to immutable deployments

**Why it's hard.** Students arrive thinking "deploy" is a verb a human runs and a server gets *mutated*. The Vercel model is the opposite: every push is an immutable artifact at its own URL, and production is just an alias swapping which artifact the domain points to. Without that flip, lessons on rollback, previews, and env scoping all feel like loose mechanics instead of consequences of one model.

**Ideal teaching artifact.** A scrubbable timeline (Concept archetype). The student moves through a sequence of git events on a small team's history: `push feat/a`, `push feat/a` again, `open PR`, `push main`, `merge feat/b`, etc. For each event two layers update in lockstep: a stack of immutable deployment cards (each pinned to its own `*.vercel.app` URL, never overwritten) and an "aliases" panel showing which deployment `app.example.com` currently points at, which deployments hold preview URLs, and what the production-branch pointer says. The student sees the aliases move while the deployment cards stay where they are. The crucial reveal is the seventh frame: a deploy "rolls out a fix" by re-aliasing — no card moves, no rebuild — making the rollback story in Concept 12 a single line later.

**Engagement.** After the scrub, a short `Sequence` exercise: "Reorder these six events so the production alias ends pointing at the green deployment after a hotfix" — locks in that the alias is the moving piece, not the deployment.

**Components.**
- `DiagramSequence` carrying 6–8 frames; each frame is a hand-SVG composition with two stacked panels (deployments, aliases). Single-purpose visual, but `DiagramSequence` already owns the scrubbing affordance.
- `Sequence` for the assessment.

**Project link.** Chapter 21.5's three-PR plan is literally three deployment cards plus alias moves; this timeline is the rehearsal of what the student will then re-enact for real.

---

## Concept 2 — The three-environment scope (dev, preview, production)

**Why it's hard.** Students collapse "environment" into "place the code runs" and miss that it's a *variable scope*. The same code in preview and prod behaves differently because env vars differ, not because the runtime differs. Until this is internalized, every later mistake (Stripe live key leaking into preview, production secrets visible to PR builds) reads as an unrelated bug instead of a scope violation.

**Ideal teaching artifact.** A three-column anatomy figure (Concept archetype) showing the three environments side by side: triggering event (push to `main` / push to any branch / `pnpm dev`), URL shape (`app.example.com` / `*-git-branch-*.vercel.app` / `localhost:3000`), variable set (live Stripe key / test Stripe key / test Stripe key), and database (prod Neon `main` / per-PR Neon branch / dev Neon branch). The columns share one row each so the eye reads horizontally — what changes across environments, what stays the same. A small inset under each column shows the same line of code (`charge(stripeKey, amount)`) executing with the column-scoped value highlighted.

**Engagement.** `Buckets` drill: 10 cards (`STRIPE_LIVE_KEY`, `vercel dev`, `app.example.com`, `pnpm dev`, `*-git-feat-x-*.vercel.app`, a Neon `main` branch, etc.) sorted into the three environment columns. Wrong placements get a one-line reason ("preview never sees the live Stripe key").

**Components.**
- `Figure` wrapping a hand-SVG three-column anatomy. Single chapter use; hand-SVG is correct.
- `Buckets` (three-column layout) for the sort.

**Project link.** 21.5.2 wires this exact triple on the project starter — the student fills three rows of env vars and watches the columns light up live.

---

## Concept 3 — Build pipeline at deploy time

**Why it's hard.** "What actually happens between `git push` and the URL going green?" Students treat the deploy as a black box, then can't reason about: why `NEXT_PUBLIC_*` changes need a rebuild, why a build-time env validator catches misconfiguration before users do, why CI runs in parallel to (not before) the deploy. The pipeline isn't long, but its *time-ordering* of which env vars get baked in vs. read at runtime is load-bearing for Concepts 8 and 9.

**Ideal teaching artifact.** A horizontal anatomy diagram (Mechanics archetype) of the deploy pipeline as a six-station belt: GitHub commit → Vercel webhook → Linux build container provisioned (env vars for *this* environment injected) → `pnpm install` → `next build` → Functions packaged → globally deployed → alias updated (only for `main`). Two callouts hang off the belt: a "baked in" badge attached to `next build` (env validator runs here, `NEXT_PUBLIC_*` inlined here, static pages pre-rendered here), and a "read fresh" badge attached to the deployed function (server-only secrets read per-invocation). CI is drawn as a parallel rail above the belt with no merge point — the visual conveys "they don't gate each other unless you wire that."

**Engagement.** `PredictOutput`-style question: "You change `NEXT_PUBLIC_API_URL` in the dashboard. Does the next user request see the new value? Does a `git push` of an unrelated change?" — forces the build-time vs. runtime distinction.

**Components.**
- `Figure` wrapping a hand-SVG horizontal belt diagram. Single-use, hand-SVG is the right call.
- `PredictOutput` for the assessment.

---

## Concept 4 — Region must match the database

**Why it's hard.** The default region (`iad1`) is invisible — the project ships and "works." But every cross-region server action eats 80ms of round-trip latency on top of whatever the query costs, and the student has no way to *feel* this from a code reading. The decision is one click in Settings; the cost of getting it wrong compounds across every request for the project's lifetime.

**Ideal teaching artifact.** A two-pane latency comparison (Decision archetype). Left pane: a map-like figure showing a function in `iad1` and a Neon DB in `eu-west-1`, with a labeled arrow ("≈ 80ms each way") tracing one request's path; total request latency stacked as a bar at the bottom. Right pane: the same diagram with both in `eu-west-1`, the arrow now intra-region ("≈ 1ms"), the bar visibly shorter. A small chained-query inset ("3 sequential queries → 480ms vs 6ms") drives the multiplier home — the senior diff is recognizing that latency compounds per round-trip, not per request.

**Engagement.** `MultipleChoice` (two-correct): given a SaaS with Neon in `eu-west-1`, which platform settings are senior-correct? — function region `eu-west-1`, function region `iad1`, multi-region functions, edge runtime. The wrong picks each map to a misconception the lesson dismantled.

**Components.**
- `Figure` with hand-SVG side-by-side region diagrams. Single-use, hand-SVG.
- `MultipleChoice`.

**Project link.** 21.5.2 forces the student to read which region their Neon DB sits in and set Vercel to match — the artifact is the reason they bother.

---

## Concept 5 — Node.js as the default, Edge as the niche

**Why it's hard.** Edge sounds faster (it's at the POP, the cold start is lower, the marketing pages all say "edge"), and students reach for it as the modern default. In a 2026 SaaS the Edge runtime forfeits Node packages, native modules, the file system, and most DB drivers — every constraint the typical server action hits. The senior reflex is the inverse of the marketing: Node by default, Edge only for `middleware.ts` and tiny POP-proximity endpoints.

**Ideal teaching artifact.** A constraint-matrix table (Decision archetype) with two columns (Node.js, Edge) and rows for what actually decides the call: payload size (4.5 MB vs 1 MB), npm packages (all vs HTTP-only), DB driver (any vs HTTP-only), cold start (~100ms vs ~5ms), timeout (60s+ vs short), use case ("everything else" vs "middleware, geolocation, tiny stateless"). Below the matrix, three real route examples — a Stripe webhook, a `middleware.ts` for geo-routing, an RSC fetching from Postgres — with the correct runtime call annotated and the one-line reason ("uses Stripe Node SDK," "needs request geo at the POP," "needs the Drizzle Postgres driver").

**Engagement.** `Buckets` (two-column): 8 route descriptions sorted into Node vs Edge. Wrong picks reveal the constraint that flips the choice (e.g., "this one uses `fs` — Edge doesn't have a filesystem").

**Components.**
- `Figure` wrapping a static matrix + three annotated route examples (hand-SVG or HTML table).
- `Buckets` two-column for the sort.

---

## Concept 6 — Fluid Compute and the module-scope hazard

**Why it's hard.** Fluid Compute is on by default and feels invisible — until a student raises `maxConcurrency` and one in fifty users sees another user's cached data. The mental model students arrive with is "one request, one function instance, fresh memory" (the pre-2025 serverless model). Fluid Compute changes this silently: one instance serves many concurrent requests, and module-level state is now *shared* across them. Per-request data parked at module scope leaks across users.

**Ideal teaching artifact.** A wrong-by-default sandbox (Pattern archetype). The student opens a route handler with a module-level `let currentUser` cache "for performance" and runs it. The exercise simulates two concurrent requests: request A signs in as Alice and caches her into `currentUser`; request B (concurrent, same instance) reads `currentUser` and sees Alice instead of Bob. The bug shows up as the rendered output for user B saying "Welcome, Alice." The student then moves the state into function-local scope (or `AsyncLocalStorage`) and reruns — the cross-talk disappears. The artifact carries the misconception ambush: students don't believe module state leaks until they see Alice's name on Bob's screen.

**Engagement.** The artifact carries the assessment; follow with a one-question `MultipleChoice`: which of these declared at module scope is *safe* under Fluid Compute concurrency? (Drizzle client / Stripe SDK client / per-request user cache / shared LRU keyed by user ID) — confirms the rule generalizes beyond the demo.

**Components.**
- `ReactCoding` in target-match mode with a two-request simulation. The simulated dual-request runner is new behavior — but `ReactCoding` already supports custom evaluator setups; the smallest viable version is a `ScriptCoding` that runs two `handleRequest()` calls back-to-back with module state surviving between them, asserting the second call's output is contaminated by the first.
- Alternative if the dual-request simulation proves too bespoke for single-chapter use: hand-SVG sequence (request A timeline / request B timeline with shared module memory) inside a `Figure`, paired with `Tokens` over a code block to identify which lines are module-scope vs. function-scope.
- `MultipleChoice` for the follow-up recall.

---

## Concept 7 — Custom domain wiring and automatic SSL

**Why it's hard.** DNS is its own mental model students don't carry — A records vs CNAMEs, apex vs `www`, TTL propagation, what Vercel does automatically (Let's Encrypt provisioning) vs. what it doesn't (HSTS header). The Cloudflare-in-front trap is specifically nasty: SSL mode "Flexible" looks like it works in the browser, terminates TLS at Cloudflare with plain HTTP to Vercel, and silently breaks every security guarantee.

**Ideal teaching artifact.** A two-beat artifact. Beat one — a hand-SVG anatomy of the records the student sets (Setup/wiring archetype): registrar row showing `A @ 76.x.x.x` and `CNAME www → cname.vercel-dns.com`, Vercel row showing both domains added with one marked canonical, a third lane showing the Let's Encrypt cert auto-provisioned once DNS resolves. Each element annotated with the one-line reason it exists. Beat two — a small Cloudflare-mode comparison (Decision archetype) showing the TLS path under "Flexible" (encrypted browser→CF, **plaintext CF→Vercel**, marked red), "Full" (encrypted both legs, **cert unvalidated**, marked amber), and "Full (strict)" (encrypted both legs, cert validated end-to-end, green). The mode names are dry; the visual makes the security difference unambiguous.

**Engagement.** `TrueFalse` round on five claims (e.g., "Vercel renews the cert automatically — true," "Apex CNAMEs work everywhere — false," "Cloudflare 'Full' validates Vercel's cert — false," "HSTS is automatic with Let's Encrypt — false," "Lowering TTL before cutover speeds propagation — true").

**Components.**
- Two `Figure`s with hand-SVG: DNS-records anatomy and the three-mode Cloudflare TLS comparison.
- `TrueFalse`.

---

## Concept 8 — Previews share production DB by default (the unsafe state)

**Why it's hard.** This is a *misconception-first* concept. Students assume Vercel "just figures it out" — that previews must somehow be isolated by magic. They aren't. Out of the box, every preview deployment reads the same `DATABASE_URL` as production, and the first migration in a feature branch's preview applies to the production database. The hazard is invisible from the dashboard; nothing flags it. The lesson must make the failure mode *visible* before the fix lands.

**Ideal teaching artifact.** A wrong-by-default replica (Pattern archetype). A simulated screenshot/console pair: a developer opens a PR named `feat/add-soft-delete-cascade`; the preview deployment boots and runs `pnpm db:migrate` against `DATABASE_URL`; the console shows `DROP TABLE customers_legacy` succeeding "in preview"; a separate "production app users" pane in the same artifact shows real users hitting the live URL and getting 500s because the production `customers_legacy` table is gone. The student is meant to feel the bridge: the preview's migration *did* run on production because they share one DB. This is the ambush. The Native Vercel-Neon Integration lands in the next beat as the *only* sane fix — copy-on-write branch per PR, isolated reads and writes, auto-deleted on close.

**Engagement.** After the ambush, a one-question `MultipleChoice`: a PR named `feat/drop-orphaned-rows` opens against a Vercel project *without* the Neon integration installed. What does the preview deploy do? — options include "fails to boot (no DB)," "runs against an isolated copy" (the wrong-but-plausible answer), "shares production DB and migrations apply to it" (correct), "is blocked by Vercel."

**Components.**
- `Figure` wrapping a hand-SVG composite "split-screen disaster" frame (preview console on left, production users hitting 500s on right). Single-use but the visual *is* the load-bearing teaching beat — hand-SVG inside `Figure` is the right scope.
- `MultipleChoice` for the recall.

**Project link.** 21.5.3's "rehearse the migration on the preview branch" exists *because* of this concept — the rehearsal only works once the integration replaces the shared DB.

---

## Concept 9 — Copy-on-write branching as the safety primitive

**Why it's hard.** Once Concept 8 lands the threat, students need the *why* of Neon's solution before they trust it. "Branch per PR" sounds like it must cost a full data copy each time (slow, expensive). Neon's copy-on-write storage is the load-bearing primitive — branches share storage with the parent until a write happens, then diverge. Without this model, the integration looks like magic; with it, the student can reason about branch limits, latency, and PII inheritance.

**Ideal teaching artifact.** A controllable simulator (Concept archetype). The student sees a `main` branch with a small set of rows (3 customers). They click "open PR" → a `preview/feat-a` branch appears, pointing at the same storage (visualized as one shared block underneath both labels). They click "preview reads customer 1" → the read serves from shared storage; no divergence. They click "preview inserts customer 4" → the branch *diverges*, showing a small wedge of new storage attached only to `preview/feat-a`; `main` is unchanged. They click "PR closes" → the branch disappears, the wedge with it, `main` untouched. The student manipulates the lifecycle and watches storage actually diverge — the *instant and nearly free* claim becomes self-evident.

**Engagement.** Sequence the lifecycle: `Sequence` exercise with 6 events (PR opened, preview boots, migration runs on branch, push to PR, preview rebuilds, PR merged) drag-ordered with two distractor events that don't belong (a "production runs migration" card, a "branch data copied" card). Sorting forces the student to internalize what does and doesn't happen.

**Components.**
- New component: `BranchingSimulator` — a small interactive widget (Astro island) with state `{ branches: [{ name, parent, writes: [] }], events: [] }`, buttons to open/close PRs and trigger reads/writes, visualizes shared vs. diverged storage. Forward-link strong: Chapter 21.4 ("Rehearsing on a Neon preview branch") and 21.5.3–21.5.5 (the three-PR project) lean on exactly this mental model. Worth building.
- `Sequence` for the lifecycle drill.

**Project link.** Direct — 21.5.3's "rehearse on preview branch" gesture *is* this simulator played for real against the student's own DB.

---

## Concept 10 — Env validator as structural enforcement

**Why it's hard.** Every dev has shipped a missing-env-var bug. The standard response — "be more careful, check the README, copy `.env.example`" — fails because discipline is humans-forgetful. The senior diff is making the bug *uncompilable*: a Zod schema declares the env shape, fails the build if a required var is missing, fails type-check if a server-only secret is declared under `client:`. The student needs to feel that the validator transforms a runtime crash into a build error — the kind of error you can't ship.

**Ideal teaching artifact.** A side-by-side `CodeVariants` (Pattern archetype). Tab one — "without validator": a server action reads `process.env.STRIPE_SECRET_KEY`; the variable is missing in production; the production build succeeds, the user's first checkout 500s, the error reaches Sentry an hour later. Tab two — "with validator": same code, same missing var; `pnpm build` exits non-zero with `ZodError: STRIPE_SECRET_KEY is required`; the deploy never reaches users. Tab three — the truly nasty bug: `STRIPE_SECRET_KEY` declared under `client:` in the validator schema; `pnpm typecheck` flags it because the client-exposed branded type won't accept a `string` typed as a secret. Three failure modes, three structural fixes.

**Engagement.** `Tokens` on a `client: { ... } server: { ... }` schema block — the student clicks every variable that's *misplaced* (e.g., `STRIPE_SECRET_KEY` under `client:`, `NEXT_PUBLIC_APP_NAME` under `server:`). Locks in the prefix-and-placement rule mechanically.

**Components.**
- `CodeVariants` (3 tabs) for the wrong-then-right-then-also-typed-wrong walkthrough.
- `Tokens` for the placement drill.

---

## Concept 11 — OIDC vs. long-lived cloud credentials

**Why it's hard.** Students who've used AWS at all know the pattern: generate an IAM access key, paste it into the platform's env vars. It works. The 2026 senior reflex says don't. A long-lived IAM key in Vercel's env vars is a static credential with broad blast radius — anyone who reads it (compromised dep, leaked log line, ex-employee with stale access) has cloud access for as long as the key exists. OIDC federation flips this: Vercel issues a short-lived JWT per function invocation; the cloud provider trusts Vercel's OIDC IdP; the function exchanges the JWT for short-lived cloud creds. The student needs to feel why "short-lived" is the load-bearing word.

**Ideal teaching artifact.** A side-by-side sequence comparison (Decision archetype). Left lane — "long-lived key": setup (one-time, generate key in IAM, paste into Vercel), invocation (function reads key from env, calls AWS, key stays valid forever), threat (key leaks → attacker has AWS access until rotation, which nobody runs). Right lane — "OIDC federation": setup (one-time, configure trust between AWS and Vercel's OIDC IdP), invocation (function receives a per-request JWT, exchanges it for 1-hour AWS creds, expires automatically), threat (JWT leaks → expires in minutes). Each lane shown as a 4-step horizontal sequence with the credential's lifetime visualized as a shaded duration bar — the *length* of the bar is the teaching.

**Engagement.** `MultipleChoice` (two-correct): which of these are correct senior moves in 2026? — store the IAM key in a Vercel env var / configure OIDC trust once per provider / rotate the IAM key quarterly / let the function exchange a JWT for 1-hour creds per invocation. The wrong picks map to common-but-stale practices.

**Components.**
- `Figure` with hand-SVG side-by-side lanes, with explicit credential-lifetime bars. Single-use here, but the credential-lifetime visualization could compound with Chapter 17.2 (rotation playbook) — flag as a candidate.
- `MultipleChoice`.

---

## Concept 12 — Two-layer rollback (alias first, revert second)

**Why it's hard.** Under stress, juniors confuse the two layers and produce one of two failure modes: (a) they `git revert` and wait six minutes for CI while production keeps bleeding, ignoring that the alias swap is *seconds*; or (b) they swap the alias and forget the revert, so the next merge to `main` re-ships the broken code. The two-layer model — alias swap for speed, `git revert` for durability — must be drilled as one unit, not two.

**Ideal teaching artifact.** A guided incident simulator (Pattern archetype). The student is dropped into a fake incident: Sentry dashboard panel on the right showing error rate climbing, production URL showing 500s. The student picks the next action from four options (`git revert` on `main`, promote previous deployment, freeze deployments, page on-call). After each choice, the simulator advances the clock: pick `revert` and the simulator shows 6 minutes of CI elapsing while errors compound; pick `promote previous` and traffic flips at 0:15, errors fall, the simulator advances and asks "now what?" → the next correct move is `revert`. The full correct sequence (promote → communicate → revert → re-enable auto-assignment → postmortem) emerges from the student's own picks, with timestamps making the speed cost of wrong-ordering visible.

**Engagement.** The simulator is the assessment. Follow with one `MultipleChoice` to confirm the rule generalized: "Production rolled back via alias swap at 02:14. At 02:30, before the revert PR is merged, a teammate pushes an unrelated fix to `main`. What happens?" — answers force the student to articulate "the broken commit is still on `main`, the next push re-ships it" or "deployments are frozen until re-enabled."

**Components.**
- New component: `IncidentSimulator` — a small interactive flow widget with `state = { time, errorRate, productionDeploymentSha, alertsActive }`, action buttons that mutate state, a transcript that builds as the student plays. Forward-link: 21.5.6 ("Rollback rehearsal") wires this *on real Vercel*; the simulator is the rehearsal-before-the-rehearsal. Also potentially used in Unit 22 (postmortems / runbooks). Worth building.
- Alternative if the simulator slips: `Sequence` over 6 cards (the correct response order) with a hand-SVG timeline below visualizing time-to-recovery for each pick. Lighter, still teaches the model, loses the felt cost of wrong-ordering.
- `MultipleChoice` for the follow-up.

**Project link.** Direct — 21.5.6 has the student promote a previous deployment against the live contract PR; the simulator is the dry run.

---

## Concept 13 — What rollback doesn't reset (the data-state caveat)

**Why it's hard.** Once "instant rollback" enters the student's vocabulary, it tends to over-cover — they assume it undoes *everything*. It doesn't. Rollback resets the code, the function bundle, the static HTML, the bundled env vars. It does *not* reset: rows the broken deploy inserted, rows it updated, rows it deleted, emails it sent, Stripe charges, webhooks dispatched, schema migrations it ran. The data-state caveat is what makes the expand-migrate-contract cadence (Chapter 21.4) necessary in the first place.

**Ideal teaching artifact.** A two-column "what survives the rollback" sorter (Concept archetype). Column headers: "Reset on alias rollback" and "Untouched by rollback." The student is given a list of 10 side effects from the broken deploy — `users.deleted_at` set to now for 4 rows, a Stripe charge to customer 87, the new function bundle, the new HTML for `/pricing`, a `DROP COLUMN` migration that ran, two emails sent via Resend, a row in `audit_log`, an entry in the Vercel deployment log, the `NEXT_PUBLIC_APP_NAME` value baked into the bundle. The student drags each into the right column. The artifact is the assessment — getting it wrong is itself the lesson.

**Engagement.** The sort is the assessment. Brief follow-up: after the student finishes, a one-line callout per row explains the rule (the *code* layer rolls back; the *world* layer doesn't), then a single `MultipleChoice` to confirm the principle generalizes: "Which of these is the only durable fix for data the broken deploy mutated?" — forward-fix migration, a second rollback, manual SQL repair, restoring from backup.

**Components.**
- `Buckets` two-column for the sort.
- `MultipleChoice` for the recall.

**Project link.** 21.5.6's specific punchline is rolling back the contract PR's deployment and discovering the `DROP COLUMN` migration didn't roll back with it — this concept primes the punchline.

---

## Concept 14 — The launch checklist as structural artifact

**Why it's hard.** A checklist *looks* like a survey — the kind of lesson the course's filters cut. It earns its weight only if the student walks away believing each row is a real verification gesture (a specific `curl`, a specific dashboard panel, a specific log line) and not a vibe. The failure mode is the student treats the list as aspirational and ships anyway. The teaching has to be: *one minute per row, here's the exact command, you run it now*.

**Ideal teaching artifact.** A real-artifact replica of the checklist itself (Reference/survey archetype, executed as a working tool). The student sees the eight rows rendered as a checklist UI; each row expands to reveal the exact verification command and what the green-pass output looks like. For row 5 (security headers): expand reveals `curl -sI https://app.example.com | grep -E '^(Strict-Transport|Content-Security|X-Content-Type|Referrer|Permissions)'` and the expected 5-line output, with a one-line note on what each header prevents. For row 7 (backups): expand reveals the Neon dashboard panel screenshot with the retention setting and a "test-restore to branch" gesture. The artifact's design choice is critical: the checklist is *the same artifact the student will keep open during their own first launch* — it's a deliverable, not a slide.

**Engagement.** After the student walks the artifact, a final `Sequence` exercise: an empty version of the checklist with 8 rows shuffled; the student orders them by "blocks launch if missing" (the answer reveals there is no order — every row blocks launch, which is the whole point of a *structural* checklist).

Then one `MultipleChoice` ambush: "A teammate proposes shipping with row 7 (tested backups) unchecked because the app hasn't accepted any real user data yet — defer to next week." Correct senior response: still blocks launch; the time to verify the restore path is *before* the data exists, not after. Locks in that the checklist isn't aspirational.

**Components.**
- New component: `LaunchChecklist` — expandable rows, each row has `{ title, verifyCommand, expectedOutput, rationale, crossRef }`. Forward-link: Chapter 21.5.2 ("From green repo to a live production URL") reuses it as a working artifact, and Unit 22's runbooks reference its rows by name. Worth building — but the leanest v1 is *just* nested `Aside`s with `Code` blocks under each row, which is honestly enough.
- Alternative as the v1: a series of 8 `Aside` blocks (one per row), each containing the verify command in `Code` and the rationale in prose, plus a `Steps` block for the order. Lighter, teaches the same thing, ships in an afternoon.
- `Sequence` and `MultipleChoice` for the assessment beats.

**Project link.** Direct — 21.5.2 has the student walk this checklist *on the project* before declaring the production URL launched.

---

## Component proposals

- **`BranchingSimulator`** — interactive widget: branches array with parent/writes, buttons to open/close PRs and trigger reads/writes, visualizes copy-on-write divergence as shared-vs-wedge storage blocks.
  - Uses in this chapter: Concept 9.
  - Forward-links: Chapter 21.4 (rehearsing on preview branch — the same mental model), Chapter 21.5.3–21.5.5 (the three-PR project executes the lifecycle the simulator models). Strong reuse.
  - Leanest v1: a `DiagramSequence` with 6 hand-SVG frames of the same lifecycle (open PR → branch appears → read → write → diverge → close → branch gone). Loses the free play; keeps the model. The full interactive version pays for itself once 21.4 lands.

- **`IncidentSimulator`** — guided flow widget: clock + error-rate panel + action buttons (`promote`, `revert`, `freeze`, `page`); the student's choices build a transcript and advance simulated time; wrong-ordering visibly costs minutes.
  - Uses in this chapter: Concept 12.
  - Forward-links: Chapter 21.5.6 (rollback rehearsal), Unit 22 (postmortems and runbook tabletop). Real reuse.
  - Leanest v1: a `Sequence` over 6 correct-order cards plus a hand-SVG timeline graphic showing time-to-recovery delta between right and wrong ordering. Loses the dynamic feedback; keeps the two-layer rule. The full simulator earns its keep once Unit 22 tabletops are written.

- **`LaunchChecklist`** — expandable-row checklist component: each row has title, verifyCommand, expectedOutput, rationale, crossRef; persists the student's checked state in localStorage so it's usable as a real working artifact during launch.
  - Uses in this chapter: Concept 14.
  - Forward-links: Chapter 21.5.2 (student walks it on the project), Unit 22 (runbooks reference rows by name). Compounds because the *artifact ships*, not just the lesson.
  - Leanest v1: 8 `Aside` blocks with `Code` for the verify command and prose for the rationale, fronted by a `Steps` block. Drops the localStorage and the working-tool framing; keeps the teaching. If only 21.3.8 and 21.5.2 ever consume it, v1 is enough.

## Build priority

Three proposals, in priority order:

1. **`BranchingSimulator`** is the one to build first. Neon-branching is the chapter's load-bearing safety primitive (Concept 9), and it gets re-used in Chapter 21.4 and three of the four 21.5 sub-lessons. Highest reuse + clearest payoff in subsequent chapters. The v1 fallback (`DiagramSequence`) is also acceptable if budget is tight, but the interactive version unlocks the rehearsal teaching in 21.4 in a way frames can't.

2. **`IncidentSimulator`** is second-priority because the felt-cost-of-wrong-ordering teaching beat (Concept 12) is hard to deliver any other way, and Unit 22 has runbook-tabletop content that will reach for the same widget. If Unit 22 ends up cut or restructured, downgrade to the `Sequence`+timeline v1.

3. **`LaunchChecklist`** is the lowest priority and most likely to be replaced by its v1 (stacked `Aside`s + `Steps`). Build the full version only if the working-artifact framing — the student keeps the page open during their first real launch — turns out to be a recurring course pattern beyond Unit 21.

## Open pedagogical questions

- Concept 6's two-concurrent-request simulation is the most bespoke runtime ask in the chapter; if `ScriptCoding` can't be coaxed into running two `handleRequest()` calls back-to-back with shared module state, the hand-SVG-plus-`Tokens` alternative is acceptable but loses the misconception-ambush punch.
- Concept 14 leans on the assumption that students will actually keep the `LaunchChecklist` open during a real launch outside the course. If usage telemetry from earlier units suggests interactive components are treated as one-time lesson props, the v1 (`Aside`s + `Steps`) is the correct cut.
- Concept 11's credential-lifetime visualization (shaded duration bars) might generalize to the rotation playbook in Chapter 17.2. Decision deferred to whichever chapter is authored first.

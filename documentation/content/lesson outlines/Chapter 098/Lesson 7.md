# Two-layer rollback when prod breaks

**Title:** Two-layer rollback when prod breaks
**Sidebar label:** Rolling back prod

---

## Lesson framing

This is the payoff lesson for the immutability model L1 promised. L1 taught that every push is an immutable deployment and that production is just an *alias* (pointer) re-aimed at one deployment at a time; L1 explicitly forward-referenced rollback as the reason that matters. This lesson cashes that in.

**The one durable idea: rollback is two layers, and both must move.** The single most common production-incident mistake from beginners is re-aliasing prod to a good deployment, breathing out, and then watching the *next* push to `main` silently re-ship the broken code — because the bad commit is still on `main`. The whole lesson is organized around drilling this: **alias first for speed, `git revert` second for durability.** If the student leaves with only one sentence, it's that.

**Second durable idea: rollback is not a time machine.** It resets code/bundle/static HTML/build-time env, and nothing else. Database rows the bad deploy wrote, emails it sent, Stripe charges it made, webhooks it fired — all survive. This is where "I rolled back, why is the data still wrong" comes from. The data-state problem is a *separate* problem with its own (forward-only) fix.

**Framing stance (per pedagogical guidelines):** decisions and reflexes over mechanics. The dashboard click-path is two sentences; the senior content is *sequencing* (what order, why alias before revert), *blast radius* (what rollback can't touch), and *the escape hatch hierarchy* (a feature-flag flip beats a rollback beats a forward-fix migration). Frame everything in production-incident stakes — "prod is on fire, what's the fastest safe path back" — because that pressure is exactly when people skip the second layer.

**Cognitive-load plan:** build the model in stages. (1) Recall the alias model from L1 (one diagram, no new concepts). (2) Layer 1 alone — the instant alias flip. (3) Layer 2 alone — `git revert`. (4) Compose them into one ordered runbook (the centerpiece). (5) Only *then* add the complications: what doesn't reset, the auto-assignment trap, the DB caveat, the flag escape hatch. Don't front-load the caveats; they only make sense once the happy-path runbook exists.

**Continuity locks (do not drift):**
- Call middleware `proxy.ts`, never `middleware.ts` (L3 correction). Not central here but may surface.
- Preview deployments are **not** rollback-eligible — only deployments that were previously aliased to production. (L5 established prod = Neon `main` branch; previews are ephemeral.)
- Drizzle migrations are **forward-only**; expand-migrate-contract is Ch099's job — treat it as a black box here, scope it out in an Aside.
- `git revert <sha>` (taught in Ch096 L2 as "creates a new commit applying the inverse") is a recall, not a re-teach. Ch096 L2 already forward-referenced this exact lesson ("Vercel re-promotes previous deployment; `git revert` undoes the code").
- The CI gate (Ch097 branch rulesets) gates the revert PR too — name it, reuse the established "four-job / ~four-minute build" framing.
- Feature flags = PostHog (Ch093 L4) — recall only.
- Pro-tier gating at first mention (continuity rule from L1): full rollback history is Pro+; Hobby is immediately-previous-only.
- All Vercel dashboard figures are **HTML/CSS mocks, not real screenshots** (chapter-wide convention from L2).

**What the student can do at the end:** given a broken prod deploy, (1) flip the alias to the last-known-good in under a minute via dashboard or `vercel promote`, (2) explain precisely what that did and didn't undo, (3) land the `git revert` on `main` through the normal gated PR, (4) re-enable auto-assignment in the right order, and (5) reach for the flag-flip escape hatch when the bad code was flag-gated.

---

## Lesson sections

### Introduction (no header)

Open on the scenario, in the present tense: a merge to `main` just shipped, Sentry's error rate is climbing, customers are hitting 500s. State the senior question plainly — *what is the fastest path back to a known-good state, what does that path not undo, and how does the code side close the loop?* Connect immediately to L1: "You already know production is an alias pointing at one immutable deployment. Rolling back is re-aiming that pointer — the previous deployments never went away." Preview the two-layer model in one sentence and the promise that by the end they'll have an ordered runbook they could run at 2 AM. Keep it to ~4 sentences; warm, terse, no celebration.

### Production is a pointer you can re-aim

Re-establish the L1 mental model as the foundation rollback rests on — this is recall framed for the new use, not new teaching. Reason: the entire rollback story is trivial once "alias = reassignable pointer, deployments = immutable values that stay alive" is loaded; students who half-remember L1 will otherwise think rollback "rebuilds" the old code.

Key points:
- Every prod deploy left a permanent, still-running artifact on its own `<hash>-<project>.vercel.app` URL. None were overwritten. "The last-known-good is still up right now, on its own URL."
- "Deploy" = re-alias the production domain. "Rollback" = re-alias it *backwards*. Same operation, opposite direction. **No rebuild** on rollback — that's why it's instant.
- Therefore rollback eligibility = "was this deployment ever aliased to production?" Preview deployments never were, so they're never rollback targets. (Forward-link the "eligibility" detail to a later subsection; just plant it here.)

Diagram (small, horizontal): reuse/echo L1's binding analogy visually. A single `production` pointer (label `app.example.com`) and a horizontal row of three immutable deployment boxes (`v1`, `v2`, `v3-BROKEN`), the pointer arrow currently on `v3-BROKEN`. Caption: deploys add boxes on the right and slide the arrow; rollback slides the arrow left — the boxes never move or disappear. Engine: **HTML+CSS inside `<Figure>`** (it's an annotated illustration with one moving pointer, not a system graph). Keep height small. Pedagogical goal: make "previous deployments are still alive and addressable" visually obvious, which is the whole basis for instant rollback.

`Term` candidates here: **alias** (production-domain pointer Vercel re-aims at one deployment), **artifact** (packaged build output: server functions + static assets) — both were defined in L1; re-surface as Terms rather than re-explaining in prose.

### Layer 1: flip the alias back

Teach the instant-rollback mechanic in isolation — the fast, first move. Reason for isolating it: it's the action under time pressure, and conflating it with the code fix is precisely the bug this lesson exists to prevent. Establish "this buys you minutes; it is not the end of the incident."

Content:
- **The dashboard path** (two sentences, not a tutorial): from the production deployment tile click **Instant Rollback** (or in the Deployments list, ⋮ menu → **Instant Rollback**), then pick the last-known-good deployment and confirm. On Pro+, "Choose another deployment" lists *every* eligible deployment, not just the immediate predecessor. Traffic flips within seconds; allow <30s for edge cache to settle. No rebuild. (UI labels per current Vercel docs: the rollback action is "Instant Rollback"; the re-enable action later is "Undo Rollback" — keep these exact, they're the real button names.)
- **The CLI primitives** (the senior reaches for these in an incident script or when the dashboard is slow):
  - `vercel rollback` — re-aliases to the *immediately previous* prod deployment. Fast but blunt: only works if the bad deploy is the latest.
  - `vercel promote <deployment-url>` — re-aliases to a *specific* deployment. The durable, precise move — use this to jump back to a known-good that isn't the immediate predecessor.
  - `vercel ls` — list deployments to find the target URL.
  - Decision rule to state explicitly: *bad deploy is the latest → `vercel rollback`; need a specific older good one → `vercel promote <url>`.* This rule reappears as a watch-out (people run `vercel rollback` when the bad commit isn't latest and roll back to the wrong thing).
- **Eligibility, stated cleanly:** only previously-prod-aliased deployments are eligible; previews are not. Pro+ allows promoting any prod-aliased deployment in history; Hobby is limited to the immediately previous one (Pro-gating at first mention).

Code handling: a small `Code` block (bash) showing the three CLI commands with one-line `#` comments. This is procedural shell, not application code — a plain block is right; no AnnotatedCode (nothing to walk through line-by-line). Keep flags minimal. Apply conventions only loosely — these are terminal commands, not TS.

`Term` candidates: **promote** (re-alias the prod domain to a chosen deployment).

### Layer 2: undo the bad commit on main

Now the slower, durable layer. Reason it comes second in teaching *and* in practice: the alias flip stopped the bleeding, but `main` still contains the bad commit, so the next merge re-ships it. This is the lesson's thesis made concrete.

Content:
- Recall (one sentence, link to Ch096 L2): `git revert <bad-sha>` creates a *new* commit that applies the inverse of the bad one — history is preserved, nothing is rewritten. Do **not** re-teach revert mechanics; the student met them in Ch096 L2 (and that lesson explicitly pointed here).
- The PR flows through the **normal gated process** (Ch097): open the revert PR, the four-job CI runs, it merges to `main`, that merge produces a new prod deployment with the fix baked in. Reuse the established "~four-minute build" framing.
- **The senior tension, stated and resolved:** under incident pressure, the CI gate feels like it's in the way — why wait four minutes to ship a revert? Resolve it firmly: *don't bypass the gate on reverts.* A revert can itself be wrong (reverts a revert, conflicts, drags an unrelated change); the gate is cheap insurance, and "skip CI when it's urgent" is exactly the habit that causes the next incident. The alias flip already bought the time the gate costs — that's *why* you flip first. This is a senior-mindset beat; give it real weight.

Code handling: a one-line `Code` (bash) `git revert <bad-sha>` for concreteness only. No deep dive.

Aside (`note`): make the ordering explicit and quotable — "Layer 1 (alias) stops the bleeding in seconds. Layer 2 (`git revert`) makes the fix durable so the next deploy doesn't undo your rollback. Alias first, revert second — always."

### What rollback resets, and what it can't touch

The blast-radius section — the second durable idea. Reason this is its own section: it's the highest-value misconception correction in the lesson ("I rolled back, why is the data still broken / why did the customer still get charged"). Students model rollback as a time machine; it is a *code* pointer flip and nothing more.

Teach via an explicit two-column contrast — this is a classification, so make it visual:

- **Resets (snaps back to the old deployment's build):** application code, the server function bundle, static/pre-rendered HTML, and the env-var *values that were inlined at that deployment's build time* (recall L6: `NEXT_PUBLIC_*` and other build-time reads are frozen into the artifact).
- **Does NOT reset:** database rows the bad deploy created or mutated; external side effects already out the door (emails sent, Stripe charges, webhooks dispatched, files written to R2); and the project's *current* env-var config in the dashboard (rollback runs the old build, but the dashboard's live values are unchanged — a subtlety worth one sentence).

Diagram: **HTML+CSS two-column card inside `<Figure>`** — left column "Rollback resets" (green-tinted, list), right column "Rollback can't touch" (amber-tinted, list). Compact, horizontal. Pedagogical goal: burn the boundary in visually so the "data is still wrong after rollback" surprise never lands. (A `Buckets` exercise is the natural comprehension check for this same split — see the exercise placement below; the diagram teaches, the exercise tests.)

Land the takeaway: *the data-state problem is a separate problem.* Rolling back the code does not roll back the data. Bridge directly into the migration caveat.

`Term` candidates: **side effect** (an action with consequences outside the app's own state — an email, a charge, a webhook — that can't be undone by changing which code runs).

### The migration trap rollback won't save you from

A focused subsection on the worst-case interaction: the bad deploy ran a *destructive* schema migration. Reason it earns its own section: it's the most dangerous gap in the naive rollback model, and it's where students reach for "just roll back" and make it worse.

Content:
- The alias flip restores old *code*; the database schema is already migrated. Old code against a new (or destructively-changed) schema can be *more* broken than before.
- **Drizzle migrations are forward-only.** You don't "un-migrate." The fix is a *forward-fix* migration — write a new migration that repairs the state — not a rewind.
- Why this rarely bites in a well-run project: the **expand-migrate-contract** cadence (Ch099) is designed so each migration step is safe for the *previous* deploy's code, which means a code rollback stays compatible with the new schema. Name it as the structural prevention; do not teach it.

Aside (`caution`): "Rollback un-aliases code, never schema. Migrations are forward-only — if a destructive migration shipped, the fix is a new migration, not a rewind. The cadence that keeps rollback safe (expand-migrate-contract) is Ch099." This Aside is also the scope fence for the migration topic.

### Re-enabling auto-assignment without re-shipping the bug

The operational trap that bites people *after* they think the incident is over. Reason for a dedicated section: it's non-obvious, it's a silent failure mode, and it interacts with the two-layer model.

Content:
- After a manual rollback, Vercel **turns off auto-assignment** of the production alias to new pushes — a deliberate safety so a teammate's push to `main` doesn't instantly re-ship the broken code on top of your rollback.
- The consequence beginners miss: while auto-assignment is off, **pushes to `main` build but don't take the prod alias.** Your `git revert` merges, a new deployment builds green — and silently does *nothing* to production until you re-enable assignment. People stare at a "successful" deploy that isn't live.
- The correct order: (1) revert lands on `main`, (2) the new prod deployment builds and you *verify it on its own deployment URL*, (3) **then** re-enable auto-assignment by **promoting the verified fix** — the dashboard surfaces this as the **Undo Rollback** button on the production tile, or `vercel promote <url>` from the CLI; promoting is exactly the act that turns auto-assignment back on. Never re-enable before the fix is verified, or you re-arm the auto-ship of whatever's next.

This section is mostly prose; no code. It feeds directly into the runbook's step ordering — cross-reference it there.

### The incident-response runbook

The centerpiece: compose Layers 1 and 2 plus the operational steps into one ordered sequence. Reason this is the climax: the individual pieces are now taught; the senior skill is *the order under pressure*, and an ordered artifact is what someone actually opens at 2 AM.

Present the canonical seven-ish-step shape as a `<Steps>` list (numbered procedure the reader follows in order — exactly the component's purpose):
1. **Detect** — alert fires (Sentry error spike / uptime page).
2. **Triage** — confirm it's real and identify the bad deployment in the Deployments list.
3. **Roll back the alias** (Layer 1) — promote the last-known-good; verify traffic flipped (hit the prod URL).
4. **Communicate** — status page / Slack / customer comms. (Named; owned by Unit 21.)
5. **Revert the code** (Layer 2) — `git revert`, gated PR, merge to `main`.
6. **Re-enable auto-assignment** — only after the reverted-`main` deployment is built and verified.
7. **Postmortem** — what got past CI, what's the structural fix. (Named; owned by Unit 21.)

Note the runbook *lives in `docs/runbooks/`* and is named/owned by Unit 21 and verified as a launch-checklist row in L8 — name these cross-refs, don't expand them.

Exercise — **`Sequence`** (the lesson's primary comprehension check): give the student the runbook steps *shuffled* and have them drag into the correct order. Reason this is the right exercise: the lesson's load-bearing content is literally *ordering* (alias before revert; verify before re-enable assignment), and `Sequence` tests exactly that. Use the seven steps above as source order (source order = correct order). Add 1-2 deliberately tempting mis-orderings the shuffle can produce: "revert the code" before "roll back the alias" (the thesis violation) and "re-enable auto-assignment" before "verify the fix" (the trap). Pass `instructions` framing it as a live incident. Place it right after the `<Steps>` so the student immediately self-tests the ordering they just read.

### The escape hatch: flip the flag instead

The "what a senior actually does first" beat, deliberately placed last so it reframes everything: the fastest rollback is the one that touches no deployment at all. Reason for ending here: it elevates the lesson from "how to recover" to "how to make recovery cheap," which is the senior-mindset payoff.

Content:
- If the bad behavior is gated behind a **feature flag** (PostHog, Ch093 L4), flipping the flag off is faster than any rollback — no new deployment, no alias change, no DNS, no edge-cache wait. It's a config read, live in seconds.
- The reflex this should install: **ship risky features behind a flag**, so the rollback story for new behavior is "flip the flag," not "scramble the alias." The flag is the strongest, cheapest layer — preventive, not reactive.
- Position it in the hierarchy explicitly: *flag flip (if available) > alias rollback > forward-fix migration.* Cheapest and safest first.

Recall only — feature flags were taught in Ch093; do not re-teach PostHog. `Term`: **feature flag** (a runtime switch that turns behavior on/off without deploying).

### When rollback becomes a smell (brief close)

A short closing beat, not a full section — fold into the escape-hatch section or a final paragraph. Reason: pedagogical honesty and senior framing. State it plainly: *frequent rollbacks mean CI is failing its job.* Rollback is the recovery primitive, not a release strategy. If you're rolling back weekly, the fix is upstream — tests, the gate, staged rollout — not faster rollback fingers. One short paragraph; optionally an Aside (`tip`). Name Vercel's gradual/percentage rollout (Pro+) in a single sentence as the higher-traffic preventive tool, then scope it out — full cutover with fast rollback is the course default below ~100k MAU.

### Downstream caches and incident hygiene (optional, brief)

Only include if budget allows; this is secondary. One short paragraph: if Cloudflare (or any CDN) sits in front of Vercel (L4's named pattern), instant rollback at Vercel does **not** purge that cache — include a purge step in the runbook or keep short TTLs on dynamic content. Also name "freeze pushes" (Deployment Protection) during an incident so a teammate's fix-attempt doesn't race the rollback. Keep terse; these are completeness items, not core. If cutting for length, drop this entirely — the two-layer model and the runbook are the load-bearing content.

---

## Scope

**Recall briefly, do not re-teach (prerequisites):**
- Immutability / production-as-alias / `<hash>-<project>.vercel.app` deployment URLs — established L1; this lesson uses them, re-states in ~3 sentences max.
- `git revert <sha>` mechanics — taught Ch096 L2; one-sentence recall only.
- Feature flags / PostHog — taught Ch093 L4; one-sentence recall only.
- `NEXT_PUBLIC_*` / build-time env inlining — taught L6; one clause when explaining what rollback "resets."
- CI gate / branch rulesets / four-job build — taught Ch097; name it, reuse its framing.

**Out of scope (belongs elsewhere — name once, link, move on):**
- **Migration safety / expand-migrate-contract** — Ch099. This lesson establishes only "migrations are forward-only; rollback doesn't touch schema; the fix is a forward-fix migration." The *cadence* and the gated CI migrate job are Ch099's.
- **`git revert` deep mechanics, conflict resolution** — Ch096 L2.
- **Sentry / error-monitoring setup** — Ch092 / observability unit. This lesson *uses* "Sentry error rate" as the detect/verify signal; it does not wire Sentry.
- **Postmortems, runbook templates, on-call/escalation, status pages** — Unit 21. Named as runbook steps 4 and 7 only.
- **Feature-flag implementation** — Ch093.
- **The launch checklist (where "runbooks exist" is verified)** — L8. Cross-ref, don't duplicate.
- **Env-var scoping mechanics** — L6.
- **Domains / Cloudflare-in-front setup** — L4. Only the *cache-purge consequence* appears here, briefly.
- **Gradual/percentage rollouts** — named in one sentence as a Pro+ preventive tool, then explicitly deferred; not taught.
- **Deployment Checks (holding un-aliased until CI passes)** — named in L1; not this lesson's mechanic.

---

## Components & artifacts summary (for downstream agents)

- **Figures (HTML+CSS in `<Figure>`, both compact/horizontal):** (1) the pointer-and-immutable-deployments illustration (alias slides left/right, boxes stay); (2) the two-column "resets vs can't touch" classification card.
- **`<Steps>`:** the incident-response runbook (seven steps).
- **`Sequence` exercise:** primary comprehension check — reorder the shuffled runbook steps; source order = correct; bake in the two thesis-violating mis-orderings as the tempting wrong answers.
- **`Buckets` exercise (optional second check):** sort items into "rollback resets" vs "rollback can't touch" (code/bundle/static HTML/build-time env vs DB rows/sent emails/Stripe charges/webhooks/current dashboard env). Use only if the lesson wants a second interactive beat; the `Sequence` is higher-value and required.
- **`Code` blocks (bash, plain):** the three CLI primitives with `#` comments; the one-line `git revert <bad-sha>`. No AnnotatedCode/CodeVariants — nothing here needs line-walking or before/after comparison.
- **Asides:** `note` (alias-first-revert-second ordering); `caution` (migration trap / forward-only); optional `tip` (rollback-as-smell). 
- **`Term`s:** alias, artifact, promote, side effect, feature flag.
- **No DiagramSequence, no StateMachineWalker** — considered and rejected. DiagramSequence (animated alias-flip) is tempting but the static pointer figure plus the `Sequence` exercise already cover temporality without the build cost; flag it as an optional upgrade only if a builder has spare budget. StateMachineWalker was considered for the runbook but the runbook is a linear procedure, not a branching decision — `<Steps>` + `Sequence` fit better.
- **No video** — the content is platform-/CLI-specific and procedural; a generic YouTube clip would age out or mismatch the exact dashboard. Skip.

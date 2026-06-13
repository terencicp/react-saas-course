# Lesson outline — Chapter 081, Lesson 6

## Lesson title

- **Title:** Where secrets live and how they rotate
- **Sidebar label:** Secrets and rotation

## Lesson framing

This is a **policy / operations lesson, not a build lesson**. The student already has type-safe env (`@t3-oss/env-nextjs`, ch037 L2) and a wall of real secrets accumulated across the course (`DATABASE_URL`, `STRIPE_SECRET_KEY`, `BETTER_AUTH_SECRET`, `RESEND_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `SENTRY_AUTH_TOKEN`, …). Nothing new is architected. The job is to name the five senior rules that govern where a secret may exist and how it changes over its life, each tied to the concrete failure it prevents, and to wire the two pieces not yet in code: `.env.example` discipline and a pre-commit secret scanner.

The pedagogical spine is **the lifecycle of one secret** — born in a provider dashboard, declared, stored, scoped to an environment, scanned for at commit, rotated on offboarding, retired. Beginners treat secrets as a static config detail; the senior framing is that a secret is a *liability with a lifetime*, and every rule is about shrinking its blast radius. Lead each rule with the bug it kills (grep target), not the abstraction.

Two threads from the chapter run through: **one place per rule** (the typed `env` import is the single read path; `.env.example` is the single contract; the runbook is the single rotation procedure) and **fail-closed** (the build fails when a secret is missing rather than booting half-configured; the scanner blocks the commit rather than warning).

The single hardest concept — and the one a junior most reliably gets wrong — is **rule 2: a secret read from a Client Component ends up in the browser bundle**. This deserves the most pedagogical weight (a before/after the build can't catch, plus the `NEXT_PUBLIC_` naming trap). The most operationally novel concept is **rotation order** (update the platform *before* invalidating at the provider), which is a sequence and should be visualized as one.

Cognitive-load management: present the five rules as a numbered progression that follows the secret's life, not a flat checklist. Each rule is self-contained — bug, rule, mechanism, where-it-lives. The deliverable (a leak audit) is the synthesis at the end, so the student leaves with a repeatable procedure, not just facts.

Keep scope tight: env-schema *internals* are L7's job (this lesson uses `env` as an established tool and points forward); CI integration of the scanner is ch097 L4; KMS/Vault are explicitly out. This is the shortest lesson in the chapter (~35–45 min) — resist re-teaching `@t3-oss/env-nextjs`.

## Lesson sections

### Introduction (no header)

Open with the concrete inventory: a `curl`-free, plain-language reckoning — "by this point your app holds a dozen live secrets, each one a key to money, data, or identity." State the senior question implicitly: *where is each one allowed to exist, and what happens to it when a developer leaves?* Frame a secret as a liability with a lifetime, not a config value. Preview the five rules as the secret's life stages and the one bug each prevents. Name the two things this lesson wires (`.env.example`, pre-commit scanner) versus the rest it codifies. Warm, ~5 lines.

Include a small **lifecycle strip diagram** here as the lesson's spine (HTML+CSS sequential phase strip, per diagrams INDEX — sequential phases, no parallelism). Boxes left-to-right: `Created (provider)` → `Declared (env schema)` → `Stored (platform)` → `Scoped (3 envs)` → `Guarded (commit scan)` → `Rotated (on event)` → `Retired`. Pedagogical goal: give the student a mental skeleton so each rule has a home. Wrap in `<Figure>` with a caption naming it the through-line. Reference back to it as each rule maps onto a stage.

### Rule 1 — A secret never lives in source code

Lead with the bug, shown not told: a hard-coded `const STRIPE_SECRET_KEY = 'sk_live_…'` in a `.ts` file. State the grep target the student runs in their own repo: search for `sk_live`, `sk-`, high-entropy string literals.

The reflex to teach: the only correct shape is the typed `env.STRIPE_SECRET_KEY` import — established in ch037, used here as a known tool. "Trust the build to fail when it's missing" is the senior posture (forward-ref L7 for *why* the build fails; do not re-teach the schema).

Why source is the worst place: git history is forever — a secret committed once and "deleted" in the next commit still lives in `git log` and every clone. This motivates the scanner (rule introduced later) and the history-scan audit step.

Use a small `<Code>` block for the bad line and the good line side by side is overkill here — a single fenced block with `del=`/`ins=` framing is enough. Keep it tight.

**Term candidates:** *high-entropy string* (random-looking secret a scanner flags by Shannon entropy, not by pattern).

### Rule 2 — A secret never reaches the browser bundle

This is the load-bearing section — give it the most weight. The failure is invisible to a junior: code compiles, app runs, and the secret is sitting in the page's JavaScript for anyone with devtools. The build does **not** error on a `process.env.SECRET` read from a Client Component that Next.js inlines.

Teach the mechanism with a **before/after using `CodeVariants`** (this is the canonical multi-file/before-after use):
- Variant "Leaks" — a `'use client'` component reading a secret (via `process.env` or a careless import); prose: this string is now in the client bundle, readable in devtools → Network → JS.
- Variant "Safe" — the secret stays in a Server Component / server module; the client receives only the *result*, never the key.
Use `del=`/`ins=` marks. Prose per variant ≤6 lines (component constraint).

Then the structural defense: `@t3-oss/env-nextjs`'s server/client partition makes this *hard to do by accident* — importing a `server` var into a client module is a build-time error (the one place the build does catch it). Pair with the `import 'server-only'` guard (code conventions line 133: turns a leaked import into a build error). Frame both as "make the wrong thing impossible, not just discouraged."

The naming trap, given its own beat: `NEXT_PUBLIC_*` is the *only* channel to the client, and the prefix is a promise that the value is public. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` is correct (publishable keys are public by design). `NEXT_PUBLIC_STRIPE_SECRET_KEY` is a self-contradiction and a real bug — the name lies. Grep target: `NEXT_PUBLIC_*` whose name contains `SECRET`/`TOKEN`/`KEY` without a legitimate "publishable/public" reason.

Add a **`Buckets` exercise** here — the single best fit for the publishable-vs-secret confusion, which is exactly a classification problem. Two buckets: "Safe as `NEXT_PUBLIC_`" / "Server-only — never `NEXT_PUBLIC_`". Items (chips): `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `DATABASE_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_POSTHOG_KEY`, `RESEND_API_KEY`, `UPSTASH_REDIS_REST_TOKEN`, `NEXT_PUBLIC_APP_URL`, `SENTRY_AUTH_TOKEN`, `NEXT_PUBLIC_SENTRY_DSN`. Grading is bucket-membership. Goal: cement that "publishable/DSN/URL = client-safe; anything granting write/read authority = server-only," and that the Sentry DSN and PostHog key are deliberately public while their auth tokens are not.

**Term candidates:** *publishable key* (a public-by-design API key that only identifies your account to a third party, granting no privileged access — safe in the browser); *DSN* (Sentry's public ingest URL; identifies the project, accepts events, grants no read access).

### Rule 3 — Secrets live in the platform's secret store, marked sensitive

Where production secrets actually belong: the deployment platform's encrypted env store — Vercel project settings for this stack. The senior detail: the **"sensitive" flag** on every secret. Non-sensitive env vars are readable back through the dashboard and CLI; sensitive vars are write-only after creation — they can be reset but never re-read. (Fact-checked: `vercel env add` now *defaults* to sensitive for production/preview/custom environments — so the default is good; the audit is about catching vars created *before* this default or by integrations that opt out.)

The concrete failure mode, worth naming as the senior watch-out: third-party Vercel **integrations can create non-sensitive secret vars** for you — the Sentry integration shipping `SENTRY_AUTH_TOKEN` as readable is a documented real case. So the rule isn't only "set the flag when you add a var," it's "audit what integrations wrote." This is the value of the explicit check over trusting the default.

Frame the trade-off honestly (this is the senior-mindset beat): the sensitive flag means you *cannot* retrieve a forgotten value, only overwrite it — so a break-glass copy belongs in a password manager. Cost vs. benefit named, not hidden.

Backfilling the flag on already-created vars is a one-time audit step: a sensitive var can't be edited in place — remove and re-add it with the flag on.

Local dev secrets: `.env.local` (gitignored), sourced from a password manager (1Password / Bitwarden), **never** pasted into Slack/email/a ticket. Doppler / Infisical named as the team-of-3+ upgrade; Vercel's UI is sufficient before that. Keep these as named alternatives, not a tutorial.

Small `<Code>` block illustrating `.env.local` shape (gitignored) is optional; prefer prose + a one-line `.gitignore` reminder. No diagram needed.

**Term candidates:** *break-glass access* (an emergency-only credential copy, stored apart from normal flow, used when the primary store can't return a value).

### Rule 4 — Three environments, three separate sets of secrets

The rule: Local, Preview, Production each get their *own* keys — production keys only in production. Map to concrete pairs the student knows: Stripe live vs. test, Resend production vs. sandbox, separate Upstash instance, separate Postgres database per environment.

The bug this kills, named as the canonical 2026 breach vector: **reusing a production secret in preview/local**. A leaked preview deploy, a laptop, or a screenshot then exposes production. Preview environments are the soft underbelly — they're numerous, short-lived, and often less guarded.

Connect to a stage of the lifecycle strip (`Scoped`). A tiny **3-column comparison** is the right visual — `TabbedContent` or a plain HTML 3-column table inside `<Figure>` showing, per environment, which flavor of each key it holds (Local → dev/test, Preview → sandbox/staging, Production → live). Pedagogical goal: make "three sets" concrete rather than abstract. Keep it to ~4 representative secrets, not the full inventory.

**Term candidates:** *preview deployment* (a per-branch/per-PR deploy Vercel spins up automatically; ephemeral, numerous, and the reason it must never hold production keys).

### The `.env.example` contract

This is the first thing the lesson *wires* (vs. codifies). `.env.example` is checked into git, lists every variable name with a placeholder or a `# source:` comment, and is the contract between the README and a runnable app — a new developer (or an AI agent) copies it to `.env.local` and fills it in.

The invariant: the env schema and `.env.example` must list the **same** variables (forward-ref: enforced in CI, owned by L7's parity rule — name it, don't build it). Drift causes silent onboarding failure: the app boots, then crashes at first request on a var nobody knew to set.

Show a representative `.env.example` with `<AnnotatedCode>` — one block, stepped to focus attention on (1) placeholder values never real ones, (2) the `# source:` comment pointing at the provider dashboard, (3) `NEXT_PUBLIC_` vars grouped/visible, (4) grouping by service (database / auth / billing / email). `AnnotatedCode` is the right pick because the file is one artifact whose several conventions each deserve a separate callout. Use `color="blue"` steps. Keep prose ≤6 lines/step.

**Term candidates:** none new.

### Rule 5 — Rotation is a documented operation, run on events not the calendar

The senior question this answers: *a developer with prod access just left — now what?* The rule: every secret they could see gets rotated. Rotation is triggered by **events** (offboarding, suspected leak, vendor-forced reset), not a calendar cadence — calendar rotation is theater that burns effort without matching real risk.

The load-bearing operational detail, given its own visualization: **order matters**. Update the new credential in Vercel *first*, redeploy/confirm it's live, *then* invalidate the old credential at the provider. Reverse the order and you have a window where the old key is dead but the new one isn't deployed — a self-inflicted outage.

Use a **`DiagramSequence`** to walk the correct rotation order step-by-step (the canonical use for step-by-step code/ops execution). Steps:
1. Generate the new secret in the provider dashboard (old one still active).
2. Add/overwrite it in Vercel (sensitive flag), all relevant environments.
3. Redeploy and verify the app is healthy on the new value.
4. *Now* revoke the old secret at the provider.
5. Update `.env.local` from the password manager; note the rotation in the runbook.
Pedagogical goal: the overlap window is the whole point — the diagram makes the "both valid briefly" safety margin visible. Contrast against a wrong-order step (could be a final caption or a one-line caution): revoke-first = downtime.

The runbook artifact: a checked-in doc listing each secret, its provider, its rotation steps, and its Vercel location. Name it; it feeds the deliverable.

Add a **`Sequence` exercise** (ordering drill) right after — give the student the five rotation steps shuffled and have them order them correctly. This is the ideal check: rotation is *literally* an ordering problem and getting the order wrong is the failure mode. Reinforces the Vercel-before-provider rule by making them reconstruct it.

**Term candidates:** *rotation* (replacing a live credential with a new one and invalidating the old, shrinking the blast radius of any past exposure); *runbook* (a checked-in, step-by-step operational procedure a teammate can follow under pressure without prior context).

### Catching leaks before they ship: pre-commit scanning

The second thing the lesson *wires*. Motivation ties back to rule 1's "git history is forever": the cheapest place to stop a secret is before it's ever committed. A pre-commit hook scans staged files for high-entropy strings and known secret patterns and **blocks the commit** on a hit (fail-closed).

Tooling: Gitleaks (or Trufflehog) as the scanner. **Husky** is the standard Git-hook manager and is introduced here at first use — walk the setup concretely with a `<Steps>` block:
1. `pnpm add -D husky`.
2. `pnpm dlx husky init` scaffolds `.husky/` and adds the `prepare` script (so the hook auto-installs on every teammate's `pnpm install` — name this; it's why Husky over a raw `.git/hooks` script).
3. Replace `.husky/pre-commit` with the Gitleaks scan.
Show the resulting `.husky/pre-commit` as a small `<Code>` bash block. The canonical staged-only command is **`gitleaks protect --staged`** (fact-checked: `protect --staged` scans exactly the `git diff --cached`, sub-second; do not use the deprecated full-history `detect` for the hook). Note the same scan runs in CI as a second belt (forward-ref ch097 L4 — named, not built; rule-set tuning lives there too).

Keep this practical and short — it's a wiring recipe, not a deep dive on Gitleaks internals.

**Term candidates:** *pre-commit hook* (a script Git runs before finalizing a commit; can abort the commit — here, the gate that stops a secret from entering history); *Husky* (the standard tool for managing Git hooks in a JS project, keeping them versioned in-repo).

### The leak audit: four places secrets escape

Synthesis section — converts the five rules into a repeatable procedure the student runs against any codebase (this is the chapter's "audit pass" thesis, and the input to ch082). Present as four concrete checks, each a grep or a tool, each tied to the rule it enforces:

1. **`process.env.X` outside the env schema file** — bypasses type safety and the server/client partition. Exception: `process.env.NODE_ENV` and rare framework internals (forward-ref L7 for the full invariant).
2. **`NEXT_PUBLIC_*` matching secret patterns** — a name containing `SECRET`/`TOKEN`/`KEY` with no publishable/public justification (rule 2's trap).
3. **`.env*` in `git log`** — history scan; if a real secret is found, rotate it (rule 5) *and* purge history with BFG Repo-Cleaner. Naming the tool is enough.
4. **Secrets reaching log drains / Sentry / PostHog** — env-shaped strings in telemetry; the ch080 L2 redactor is the defense (reference, don't re-teach).

Present this as a `<Checklist>` (the component built for tickable audit/verification lists, used by project briefs) so the student can literally run it — each item phrased as a check with the grep/tool inline. Goal: the student leaves with a runnable audit, not a list of facts. This is the lesson's deliverable.

A brief closing line: KMS / HSM / Vault are out of scope through Series A — Vercel's encrypted store is sufficient at this stage (trigger-before-tool: name the scale that would justify the heavier tool, don't teach it).

**Term candidates:** *log drain* (a pipe that forwards your app's logs to an external service; a place env-shaped strings can leak if not redacted).

### External resources (optional)

`ExternalResource` cards if a clean canonical source exists: Vercel's "Sensitive Environment Variables" docs, the Gitleaks repo. Optional — only if current and authoritative.

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- `@t3-oss/env-nextjs` gives a typed `env` object, Zod-validated, with a server/client split that fails the build on a missing var (ch037 L2). Used here as an established tool; *internals and the four invariants are L7*.
- Secrets the app already holds were introduced across prior units (Stripe, Better Auth, Resend, Upstash, Sentry, PostHog) — reference by name, assume familiarity.
- `import 'server-only'` (code conventions) — name as the per-module guard; assume known from earlier server/client lessons.

**Explicitly out of scope (defer or name-only):**
- Env-schema internals, the four invariants, `SKIP_ENV_VALIDATION`, `NODE_ENV`-conditional vars, `getAppUrl()` helper → **L7** (next lesson). This lesson must not pre-teach them; point forward.
- CI integration of the secret scanner, Gitleaks rule-set tuning → **ch097 L4**. Wire the local pre-commit hook only; name CI as the second belt.
- KMS, HSM, Vault, Doppler/Infisical at depth → out of scope or named as scale-gated upgrades.
- Consent / cookies (L5), audit-log policy (L3), retention/erasure (L4), headers (L1), rate-limit matrix (L2), dep hygiene (L8) → other lessons in this chapter; do not bleed into them. The ch080 L2 redactor is referenced (leak via telemetry) but not re-taught.
- BFG Repo-Cleaner / git-history surgery → named as the remediation tool, not a tutorial.

**Canonical shapes for downstream agents (align with code conventions):**
- The env schema file is **`env.ts` at the project root** (code conventions file tree, line 117) — *not* `lib/env.ts` as the chapter outline wrote. Use `env.ts`. Note this divergence is deliberate (matches the canonical convention).
- Typed access is `env.X`; the only sanctioned `process.env` read outside `env.ts` is `process.env.NODE_ENV`.
- `__Host-` cookie prefix + `HttpOnly; Secure; SameSite=Lax` is the cookie default (conventions) — only relevant if cookies come up; not a focus here.
- pnpm 11+, `pnpm add -D`, `pnpm dlx` for tooling commands (conventions); never `npm`/`yarn`.
- `.env.local` is gitignored; `.env.example` is committed.

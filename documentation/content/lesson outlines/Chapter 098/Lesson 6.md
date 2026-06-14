# Env vars across dev, preview, and prod

Sidebar label: Env vars across environments

---

## Lesson framing

**The distinct job of this lesson vs. what's already taught.** This is the single most important scoping decision and the writer must internalize it before writing a word. The *code-side* env story is already fully taught and must NOT be re-derived here:

- **Ch041 L2** ("Type-safe env vars") shipped `env.ts`, `@t3-oss/env-nextjs`, the `server`/`client`/`runtimeEnv` blocks, Zod 4 validation, build-fails-on-missing-var, `.env` vs `.env.example`, and named `SKIP_ENV_VALIDATION`.
- **Ch081 L7** ("The env schema") owns the four invariants (everything through typed `env`, the server/client firewall as build-error, schema↔`.env.example` lockstep, `SKIP_ENV_VALIDATION` as escape-hatch), the per-environment URL helper (`getAppUrl`), the `NODE_ENV`-conditional production-only var pattern, and the `VERCEL_URL`-has-no-scheme gotcha.

**What is left for THIS lesson** is the *platform* dimension the code side assumes but never wires: the variable values don't live in `env.ts` — they live in Vercel, **scoped to three environments**. The schema is one file; the *fills* are three. The senior question: *the same `STRIPE_SECRET_KEY` schema field is satisfied by a different value in each environment — where does each value live, who can read it, and how does scope become a security boundary?* The lesson's spine is therefore: **one schema, three fills**, plus the dashboard mechanics, managed vars, `vercel env pull`, secret rotation, and OIDC as the senior reflex that removes long-lived cloud keys entirely.

**Mental model to leave the student with.** A Vercel env var is a triple `(key, value, scope)`. The same key can carry a different value (or be absent) in each of Production / Preview / Development. `env.ts` validates whatever the active environment hands it; Vercel decides what that is. Scope is not organization — it is a **blast-radius wall**: a preview build literally cannot read a Production-scoped secret, which is why a stranger's PR can't exfiltrate your live Stripe key.

**Load-bearing diffs (the senior takeaways).** (1) The dominant pattern is *different value per environment*, not the same value everywhere — and the classic catastrophe is one scope's value bleeding into another (live Stripe key answering a preview, or a test key in production). (2) `vercel env pull` is the on-clone source of truth for dev values, not a hand-filled `.env`. (3) OIDC federation replaces long-lived cloud access keys (the R2 keys from Ch068 are the concrete "before") with short-lived per-invocation tokens — no static cloud secret in Vercel at all.

**Tone & target student.** Adult, terse, decision-first (per pedagogical guidelines). The student has built the whole app and just imported their repo to Vercel (L2), wired region/runtime (L3), domains (L4), and per-PR Neon branches (L5). They know what `env.ts` is and why secrets never get `NEXT_PUBLIC_`. Do not re-explain the validator's internals, the firewall mechanism, or `.env` file basics — *reference* them and build the platform layer on top. Lead every section with the decision/stakes, not the click path.

**Continuity constraints (from sibling lessons — honor exactly).**
- `proxy.ts`, never `middleware.ts` (Ch098 L3 correction). Only relevant if middleware/proxy is mentioned in passing.
- Pro+ gating must be named at first mention of any Pro feature (env-var audit log, sensitive flag visibility, preview password protection) — L1 cut tier details, downstream lessons own first-mention gating.
- The Neon integration manages `DATABASE_URL` in Preview as a locked/"managed" var (Ch098 L5) — this lesson references managed vars as an already-seen concept, does not re-teach the integration.
- Course pin is `pnpm@11.x`, Node 24, Zod 4, Next.js 16.
- `vercel env pull .env.local` pulls **Development**-scoped vars (named in L2 and L5 as forward-ref to here — this lesson owns the depth).
- Three-env / three-Neon-branch model already established in L5: dev branch (local), per-PR branch (preview), `main` branch (prod). Reuse, don't recontextualize.
- All Vercel/Neon dashboard figures are HTML/CSS mocks, NOT real screenshots (established L2-L5).

**Visual & exercise strategy.** Two anchor visuals: (1) the "one schema, three fills" diagram tying the single `env.ts` to three scoped value-sets — the lesson's spine made concrete; (2) the OIDC token-exchange sequence (long-lived key vs. short-lived federated token, before/after). One comprehension exercise: a `Buckets` drill sorting variables by *which scoping pattern they follow* (same-everywhere / different-per-env / present-in-some-only) — this is the load-bearing decision and Buckets is the right fit (mirrors Ch081 L7's variable-sorting drill the student already met, now along the scope axis instead of the firewall axis). A short `TrueFalse` round optionally reinforces the security-boundary claims. Code is light: dashboard mocks, two shell commands (`vercel env pull`, `vercel env add`), and the OIDC `awsCredentialsProvider` snippet (illustrative, deferred-to-use).

---

## Lesson sections

### Introduction (no header)

Open with the concrete stakes. The schema is done — `env.ts` has validated the app since Ch041 and the Ch081 baseline confirmed it holds. But the schema only says *what shape* a value must be; it never said *which value*. Land the problem with the dominant real case: `STRIPE_SECRET_KEY` is one field in the schema, but it must be the **test** key when you're developing or previewing a PR, and the **live** key in production — three environments, one schema field, three different secrets. Get that wrong one direction and a preview deploy charges real cards; the other direction and production silently runs on a test key that declines every payment. State the lesson promise: by the end the student knows where each value lives across Vercel's three scopes, why scope is a security wall, how `vercel env pull` syncs dev, and the rotation + OIDC reflexes a senior reaches for. Keep it to ~2 short paragraphs; warm, no scaffolding. Connect explicitly back to "the schema you wrote in the invoicing project."

### One schema, three fills

The conceptual spine — establish the core model before any mechanics.

- Restate crisply: `env.ts` is **one file, validated identically in every environment**. What differs is the *values* Vercel injects. Reframe a Vercel env var as the triple `(key, value, scope)`.
- The three scopes, defined by the git/runtime event that selects them (reuse L1's mapping, don't re-teach it): **Production** — `main` deployments. **Preview** — every other branch's deployments. **Development** — `vercel dev` or local `pnpm dev` reading `.env.local`. Same code, same schema, different injected values.
- Anchor visual here — see the "one schema, three fills" Figure described below. The pedagogical goal: collapse the abstraction into a single picture so the rest of the lesson hangs off it.
- Name the payoff up front: because the schema is constant and only values change, "configure the app for production" is never a code change — it's setting values in the right scope. This is the same single-source-of-truth discipline the student already knows from `env.ts` and the AI model-handle, now extended to the platform.

**Figure — "One schema, three fills" (`ArrowDiagram` inside `Figure`, or HTML+CSS in a `Figure`).** One `env.ts` box on the left (showing 2-3 representative schema fields: `DATABASE_URL`, `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_APP_URL`). Three columns on the right — Development / Preview / Production — each showing the *same keys* with *different values* (dev Neon branch URL + test Stripe key + `localhost:3000`; preview branch URL + test key + per-branch `*.vercel.app`; `main` branch URL + live key + real domain). Arrows from the schema to each column labeled "validated against." Pedagogical goal: the student sees one schema constraining three distinct value-sets — the entire lesson in one frame. Keep horizontal, cap height. Mark as TODO stub for the component builder if values need finalizing.

### The three scoping patterns

The decision content — *how* a given variable should be scoped. This is the load-bearing skill.

- **Pattern 1 — same value across all three.** Rare. e.g. `NEXT_PUBLIC_APP_NAME`, a public publishable key that's identical everywhere. Set once, apply to all scopes.
- **Pattern 2 — different value per environment.** The **dominant** pattern; spend the most ink here. Every external service ships test/sandbox credentials and live credentials: Stripe (test vs live secret key), Resend (test vs live sending domain/key), PostHog (dev project vs prod project). Dev and preview use the test set; production uses the live set. The variable is set *thrice*, once per scope, with the right value each time.
- **Pattern 3 — present in some, absent in others.** A pre-launch feature flag that exists only in Preview to dogfood before it goes live; a `SENTRY_AUTH_TOKEN` required in production but genuinely absent in dev (cross-ref Ch081 L7's `NODE_ENV`-conditional schema pattern — reference, do not re-teach).
- **Why this matters concretely.** Restate the two failure directions from the intro as a general rule: a value in the wrong scope is a silent, environment-specific bug that local dev never reveals (echoes L3's "cross-region mismatch invisible in dev" framing — same shape of bug). The fix is mechanical discipline: decide the pattern per variable, set each scope deliberately.

**Exercise — `Buckets` (sort by scoping pattern).** Three buckets: "Same value everywhere" / "Different value per environment" / "Present in some environments only". Items (~7-9), drawn from the app's real env inventory so it reinforces prior lessons: `STRIPE_SECRET_KEY` (different), `RESEND_API_KEY` (different), `NEXT_PUBLIC_POSTHOG_KEY` (different — dev vs prod project), `DATABASE_URL` (different — and managed by the Neon integration in preview, worth a note in the explanation), `NEXT_PUBLIC_APP_NAME` (same everywhere), `SENTRY_AUTH_TOKEN` (present-in-prod-only), a preview-only feature flag (present-in-preview-only). Grading: each item to its pattern. The post-submit explanation should reinforce *why* each lands where it does — especially that "different per environment" is the default, and that getting `DATABASE_URL` here connects to the per-PR Neon branch from L5. This mirrors the Ch081 L7 Buckets drill the student already did (firewall axis); doing it now along the *scope* axis cements that these are two independent questions about every variable.

### Setting variables in the Vercel dashboard

The primary mechanic. Keep procedural but lead with the decisions, not the clicks.

- Path: Project Settings → Environment Variables. Each variable carries: key, value, and an **environment checkbox set** (Production / Preview / Development), plus an optional **Git branch filter** (a value scoped to one specific preview branch — mention briefly, niche).
- The **"sensitive" flag** (Code conventions §security-baseline calls this out explicitly: "Vercel's 'sensitive' flag on production secrets"). A sensitive var is stored encrypted and its value can **never be read back** in the dashboard or via `vercel env ls` after save — even by an admin — yet it is still available to builds and at runtime. **Verified current behavior (fold in):** Vercel now **defaults new Production/Preview vars to sensitive**; the senior reflex of "flag every prod secret sensitive" is therefore largely the platform default, and the lesson should frame it as *confirm it's on* rather than *remember to turn it on*. **Development-scoped vars cannot be sensitive** (Vercel's API disallows it) — and that's deliberate: dev values must stay readable so `vercel env pull` can write them into `.env.local`. This nuance is the clean bridge to the next section. This flag is the platform-level belt complementing the code-level `server-only` + firewall.
- **Variables apply to new deployments only.** Setting or changing a value does nothing to deployments already built — you must redeploy to pick it up. This is the platform-side restatement of the build-vs-runtime point (next section); name it here because it's the #1 dashboard confusion ("I changed the var, why is it still wrong?").
- **Managed variables** — reference the Neon integration from L5: it injects `DATABASE_URL` into Preview as a locked/managed var you can't hand-edit (lock icon). Don't fight managed vars — they're correct by construction, overwritten per deployment. One sentence; the student already met this in L5.

**Figure — Vercel Environment Variables panel (HTML/CSS mock in `Figure`).** Show the add-variable row with the three environment checkboxes and the sensitive toggle, plus a couple of existing rows including one locked/managed `DATABASE_URL` (Preview) with a lock glyph. Pedagogical goal: make the scope-checkbox UI and the managed-var lock concrete without a real screenshot. Mark TODO stub. (Reuse the established mock convention from L2-L5.)

### Build-time vs. runtime, and why a public var needs a rebuild

Short, sharp section — the one genuinely platform-specific subtlety about *when* a value is read. The student knows `NEXT_PUBLIC_*` is inlined (Ch041/Ch081); the new content is the **deploy consequence**.

- **Build-time vars** are read during `next build`: the env validator runs, static pages pre-render, and `NEXT_PUBLIC_*` values are **inlined** (frozen into the JS bundle). **Runtime vars** (server-only secrets read inside a Server Action / route handler) are read fresh on each invocation.
- The consequence that bites: **changing a `NEXT_PUBLIC_*` value requires a rebuild** — the old value is baked into the existing bundle; updating the dashboard value alone changes nothing until you redeploy. A server-only secret, by contrast, is picked up on the next deployment (or function cold start) without re-baking the client. Tie back to L1's build-vs-runtime thread (forward-referenced there) — this lesson closes that debt.
- Keep to ~3-4 sentences plus maybe one `Aside` (caution) stating the redeploy rule as a one-liner. No need for a code block.

### Syncing dev with `vercel env pull`

The developer-workflow mechanic. L2 named the command; this lesson owns the why and the team workflow.

- `vercel env pull .env.local` writes the **Development**-scoped variables into a gitignored `.env.local`. This is the **on-clone ritual** for every developer — Vercel's Development scope is the source of truth for local values, replacing the historical "copy `.env.example` and hand-fill secrets" dance. Re-run it whenever a teammate adds a dev var. (Verified: `vercel env pull` requires a linked project — `vercel link` first, from L2.)
- **Forward-link to OIDC (verified):** `vercel env pull` also writes the `VERCEL_OIDC_TOKEN` into `.env.local`, so local dev can use OIDC federation against a cloud provider without storing a long-lived key locally. Plant one sentence here; the OIDC section below picks it up. This is a real, satisfying tie between the two halves of the lesson — the same command that syncs dev values also delivers the short-lived federated token.
- The relationship to `.env.example` (cross-ref Ch041/Ch081, keep brief): `.env.example` stays committed as *documentation* — the list of keys a contributor without Vercel access needs to know exist. `vercel env pull` supplies the *actual values*. Two files, two jobs; the student already knows this split, here it's "the values now come from Vercel, not from you."
- `vercel env add <KEY>` to push a new var up from the CLI (names the scope interactively) — mention as the inverse, briefly.
- Show the command as a simple `Code` block with the expected "Downloaded `.env.local`" output. No `AnnotatedCode` needed — it's one line.

**Code block (`Code`, bash).** `vercel env pull .env.local` and its one-line success output; optionally `vercel env add` on a second tab via `Tabs` if showing both. Keep minimal.

### Scope is the security boundary

Elevate scope from "organization" to "security wall." This is a senior-mindset beat and deserves its own section.

- The structural claim: **a Preview deployment can only read Preview-scoped variables. Production secrets are never injected into a preview build.** Therefore a malicious or careless PR — including from an external contributor — *cannot* exfiltrate the live Stripe key, the production DB URL, or any prod secret via its preview build. The wall is enforced by Vercel, not by reviewer vigilance.
- Connect to the supply-chain thread from L1/Ch097 (SHA-pinned actions, `minimumReleaseAge`): those guard what runs at *build*; scope isolation guards what *secrets* that build can see. Two complementary defenses.
- The reflex this produces: **never attach a production secret to the Preview scope** to "make a preview work" — that quietly demolishes the wall. If a preview needs a credential, it gets the *test* credential in the Preview scope.
- **Env-var audit trail** (Pro+; name the gating per continuity rule): Vercel logs who changed which env var and when, in the team audit log. After any suspected credential exposure, this is where you reconstruct the change-and-rotate timeline. One sentence.

**Optional exercise — `TrueFalse` (3-4 statements).** Reinforce the boundary claims. e.g. "A PR's preview build can read the production `STRIPE_SECRET_KEY`" (false); "Changing a `NEXT_PUBLIC_*` value in the dashboard updates already-deployed previews" (false — needs rebuild); "The Neon integration's managed `DATABASE_URL` in Preview points at production data" (false — per-PR branch, from L5); "Marking a var sensitive means even an admin can't read its value back in the UI" (true). Use `TfWhy` for the explanation on each. Cuttable if the lesson runs long — the Buckets drill is the primary check.

### OIDC: short-lived tokens instead of long-lived cloud keys

The senior reflex that earns the lesson its "Decision" weight. Named and explained here, hands-on deferred (per chapter outline). This is the one place the lesson reaches *beyond* current app state.

- **The "before" the student already shipped.** In Ch068 the app stored `R2_ACCESS_KEY_ID` and `R2_SECRET_ACCESS_KEY` as long-lived server secrets in env. That's the historical default for talking to any cloud (AWS/GCP/Azure/R2): copy a static, long-lived access key into an env var. The problem framed as blast radius: a long-lived key is a standing liability — if it ever leaks (a log, a compromised build, a stray commit) it grants its full access until someone notices and rotates it.
- **The 2026 pattern — OIDC federation.** Explain the mechanism step by step (simplified first), all **verified against Vercel docs (last updated 2026-05-28)**: (1) Vercel acts as an OIDC Identity Provider and mints a **short-lived, RSA-signed JWT** identifying the project/environment. In builds it's the `VERCEL_OIDC_TOKEN` env var; in a running Function it arrives as the `x-vercel-oidc-token` request header. (2) You configure a trust relationship once in the cloud provider (an AWS IAM role whose trust policy trusts Vercel's OIDC issuer URL). (3) At runtime the SDK exchanges the JWT for **short-lived** cloud credentials (AWS: `AssumeRoleWithWebIdentity`). No long-lived cloud secret is stored in Vercel. (Verified token lifetime detail, optional to include: 60-min TTL, cached ~45 min — the writer can simplify to "expires in under an hour, so a leak is near-worthless.")
- The senior diff: the credential's *lifetime* is the security property. Static keys have unbounded lifetime; federated tokens are ephemeral.
- **Tie to the lesson's scope theme (verified as a documented OIDC benefit):** the cloud provider's trust policy can grant *different* permissions per Vercel environment — dev/preview/production can each map to a different cloud role. OIDC's per-environment access mirrors env-var scoping: the scope wall extends all the way into the cloud account. Make this connection explicit — it's why OIDC belongs in *this* lesson and not elsewhere.
- State the deferral plainly: the course wired R2 with API keys (Ch068); the OIDC upgrade is the named senior reflex, full wiring out of scope here. Local dev is also supported (the `VERCEL_OIDC_TOKEN` from `vercel env pull`).
- Code: a short **illustrative** snippet (verified API): import `awsCredentialsProvider` from `@vercel/functions/oidc`, pass it as the AWS SDK client's `credentials`, with `roleArn: process.env.AWS_ROLE_ARN` — note there is **no** `accessKeyId`/`secretAccessKey` pair, which is the whole point. `AnnotatedCode` fits (2-3 steps: the missing key pair, the `roleArn`, the implicit token exchange). Label clearly "what it looks like, not something you wire today." Contrast directly with the Ch068 `R2_ACCESS_KEY_ID`/`R2_SECRET_ACCESS_KEY` credentials block the student wrote — same SDK shape, credentials sourced from a federated provider instead of static env secrets.

**Figure — OIDC token exchange (`DiagramSequence` or two-panel `TabbedContent`/`ArrowDiagram`).** Before/after: Panel A — long-lived key path: env stores `R2_SECRET_ACCESS_KEY` (standing secret) → function uses it directly → "valid until rotated." Panel B — OIDC path: Vercel mints short-lived `VERCEL_OIDC_TOKEN` per invocation → function exchanges it with the cloud provider (which trusts Vercel's issuer) → short-lived credentials → "expires in minutes." Pedagogical goal: make "lifetime is the security property" visual. If `DiagramSequence`, three steps for Panel B (mint → exchange → use). Mark TODO stub.

### Rotating a secret without downtime

The operational reflex — how you replace a leaked or expiring secret safely. The student knows secrets exist in three scopes; this is the *change* workflow. Keep tight; the full rotation playbook is Ch081/runbooks (cross-ref).

- The naive mistake: edit an existing var's value in place and assume it's done. Why it bites: existing deployments built against the old value keep using it until redeployed, and an in-place swap gives no overlap window — there's a moment where new and old are inconsistent.
- The safe shape (the senior pattern, ~3 steps): (1) generate the new secret at the provider (both old and new now valid provider-side). (2) Add it to Vercel and deploy code that reads it (overlap window — both work). (3) Remove the old var and revoke the old secret at the provider. Each scope rotated deliberately.
- One-sentence pointer: this is the platform mechanic; the org-wide rotation runbook (what to rotate, cadence, the credential-rotation runbook from the launch checklist L8) lives in Ch081 / Unit 21.
- No code needed; a `Steps` component for the 3-step procedure is a clean fit.

### External resources (optional `ExternalResource` cards)

- Vercel — Managing environment variables across environments (`https://vercel.com/docs/environment-variables/manage-across-environments`) — per-environment scoping, sensitive flag. Verified live.
- Vercel — OIDC Federation (`https://vercel.com/docs/oidc`) and the AWS guide (`https://vercel.com/docs/oidc/aws`) — `VERCEL_OIDC_TOKEN` + provider trust setup. Verified live (updated 2026-05-28).
- Vercel — System environment variables (the `VERCEL_*` family, already cross-ref'd in Ch081 for `getAppUrl`).

---

## Tooltips (`Term`)

Be strategic — only terms that support this lesson's goals and aren't already defined in earlier lessons the student just read:

- **OIDC (OpenID Connect)** — the identity-federation protocol; non-obvious acronym, central to the OIDC section.
- **JWT** — short-lived signed token; define inline at first use in the OIDC section (the student may not have a crisp definition).
- **IdP (identity provider)** — if used in the OIDC explanation; Vercel-as-IdP is the key idea.
- **Blast radius** — the scope of damage if a credential leaks; used as the framing for both scope-isolation and OIDC. Define on first use.
- **Publishable key** — if referenced in the scoping-patterns section as a "same everywhere / public by design" example (Ch081 used a `Term` here; reuse the definition).

Do NOT add tooltips for terms the student just learned (immutable deployment, alias, managed variable, preview deployment, copy-on-write, `NEXT_PUBLIC_`, `env.ts`) — reference them plainly.

---

## Scope

**This lesson does NOT cover (already taught — reference only, never re-derive):**
- The `env.ts` validator internals, `createEnv`, the `server`/`client`/`runtimeEnv` block structure, Zod 4 schemas for env — **Ch041 L2**.
- The server/client firewall *mechanism* (build-error on importing a server var into a client component), `import 'server-only'`, the four invariants, schema↔`.env.example` lockstep, `SKIP_ENV_VALIDATION` deep rules, the `getAppUrl` per-environment URL helper, the `VERCEL_URL`-has-no-scheme gotcha, `NODE_ENV`-conditional production-only vars — **Ch081 L7**. (May reference any of these in one line as established; the dominant-pattern Buckets reuses the *shape* of L7's drill along a new axis.)
- The `.env` vs `.env.local` vs `.env.example` file roles at the basic level — Ch041 (restate the one-sentence division of labor only).
- The deployment model / git-event→scope mapping / immutable deployments / build-vs-runtime *concept* — **Ch098 L1** (reuse the mapping; this lesson closes L1's build-vs-runtime debt with the redeploy-on-`NEXT_PUBLIC_`-change consequence).
- The Import flow, `vercel link`, first appearance of `vercel env pull` — **Ch098 L2** (this lesson owns `vercel env pull` depth + team workflow).
- Region/runtime — Ch098 L3. Custom domains — Ch098 L4. The Native Vercel-Neon integration and per-PR branching (managed `DATABASE_URL` in Preview) — **Ch098 L5** (reference managed vars as known).
- Instant rollback / `git revert` two-layer model — Ch098 L7.
- The launch checklist (which verifies env validation is green in prod) — Ch098 L8 (one forward-ref only).
- Schema migrations on deploy — Ch099.
- Stripe webhook secret specifics — Unit 11. The full credential-rotation runbook and org-wide rotation cadence — Ch081 / Unit 21.
- Full OIDC wiring / IAM role trust-policy authoring — **deferred**; named and mechanism-explained only.

**Prerequisites to restate concisely (one line each, not re-teach):** `env.ts` is the single typed boundary that validates config at build time; `NEXT_PUBLIC_*` = inlined into the browser bundle, no prefix = server-only; the three environments map to git events (main→prod, other branches→preview, local→dev) per L1; the Neon integration manages `DATABASE_URL` in Preview per L5.

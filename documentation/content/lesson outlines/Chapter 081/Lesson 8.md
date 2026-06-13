# Lesson 8 outline — Supply-chain defaults after Shai-Hulud

**Title (h1):** Supply-chain defaults after Shai-Hulud
**Sidebar label:** Supply-chain defaults

---

## Lesson framing

This is the eighth and final teaching lesson of Chapter 081 (the security baseline); the quiz (L9) follows. Its job: land the irreducible dependency-hygiene discipline a 2026 senior wires before shipping, framed by the 2025–26 OSS supply-chain incidents (the Shai-Hulud self-replicating npm worm, first disclosed Sept 2025, V2 in Nov–Dec 2025 and 2026 variants; the `chalk`/`debug` maintainer compromises; weekly typosquats). The thesis the whole lesson serves: **after Shai-Hulud, supply-chain attacks are among the most likely SaaS breach vectors — alongside XSS and credential stuffing — and the defense is config, not vigilance.** The student already has every header, limiter, audit, GDPR, consent, secrets, and env control from L1–L7; this lesson closes the catalog with the dependency layer.

**Critical fact-check correction (read before authoring): pnpm 11 moved these settings to `pnpm-workspace.yaml` and changed the API. The chapter outline and the project's Code conventions doc both predate this and describe the pnpm 10 / `.npmrc` shape — they are stale here. Teach the pnpm 11 reality below; the conventions doc divergence is deliberate and noted at the end of this outline.**

Pedagogical conclusions that apply lesson-wide:

- **Threat-first, then the one-line config that neutralizes it.** Every control is introduced by the concrete attack it stops, then resolved to a single `pnpm-workspace.yaml` / `package.json` / lockfile fact. This is the course's "trigger before tool, decisions before syntax" stance: the student must leave able to *explain why each line exists*, not just paste it. A supply-chain control nobody understands gets disabled the first time it blocks a release — the watch-out the lesson keeps returning to.
- **Config is load-bearing; vigilance is not.** The senior mental model to install: you cannot read 200+ transitive packages, so the defense must be structural — a 24-hour quarantine window, a registry-only contract, an install-script allow-list, a pinned lockfile. Humans reviewing every dep is the *failed* model; this reframing is the lesson's spine.
- **These are pnpm 11 *defaults*, not exotic hardening.** Frame `minimumReleaseAge`, `blockExoticSubdeps`, and `strictDepBuilds` as the 2026 baseline the student inherits *out of the box* by choosing pnpm 11 — they are on by default, not config the student adds. The senior move is *keeping them on* under deadline pressure and reaching for the **narrowest scoped exception** rather than disabling the default globally.
- **The carve-out is scoped, never a global off-switch.** A recurring, load-bearing rule: when a control blocks a legitimate need (e.g. a critical patch younger than 24h), the escape hatch is the **narrowest possible scoped exception, committed and reviewed in the PR** — a single package added to `minimumReleaseAgeExclude`, a single entry in `allowBuilds` — never `minimumReleaseAge: 0` or otherwise disabling the protection for the whole tree. This is the single most common way teams self-sabotage these controls; the lesson hammers it in three places. (Note: pnpm 11 does **not** ship a per-command CLI flag to bypass the age check — the scoped exclude list *is* the mechanism, which is good: it's reviewable in the diff, not invisible in someone's shell history.)
- **Tone:** terse, adult, senior-to-junior. No celebration. The student has shipped seven security controls already; this is the eighth checklist item, delivered as a catalog pass that ends in a grep-able deliverable (the dep-hygiene report) feeding ch082's audit.
- **Code's role:** the artifacts here are small and declarative (`pnpm-workspace.yaml` settings, `package.json` fields, lockfile presence, a CI command). Code blocks are short config snippets, not application logic. The teaching weight goes on (a) the attack diagram that makes the threat legible and (b) classification/decision exercises that drill the judgment calls. No live-coding sandbox — workspace-config/lockfile behavior isn't reproducible in ReactCoding/Sandpack; use static `Code` + `AnnotatedCode` + non-coding exercises instead.
- **Naming hygiene (avoid alarm fatigue):** name Shai-Hulud and the `chalk`/`debug` events as the framing motivation, but keep the body engineering-shaped — mechanism and defense, not breach theater. One vivid incident walked end-to-end (typosquat → `postinstall` → exfiltration) earns its space because it makes every later control concrete; beyond that, incidents are named, not narrated.

---

## Lesson sections

### Introduction (no header)

Open with the senior question made concrete: after `pnpm install`, the app has a handful of direct dependencies but **200+ transitive packages** the student has never read — any one of which runs code on the dev's machine and in CI. Name the 2025–26 reality in two sentences: the recent incidents (the Shai-Hulud self-replicating worm across npm, Sept 2025 and following; the `chalk`/`debug` maintainer compromises) put supply-chain among the *most likely* breach vectors for a SaaS, alongside the XSS and credential-stuffing vectors L1–L2 hardened. State the lesson's promise: the irreducible set of dependency controls — most of them pnpm 11 defaults the student already has — that make this layer structurally safe, ending in a dep-hygiene report that joins the chapter's audit catalog.

Connect to prior knowledge in one line: L6 wired Husky + Gitleaks (commit-time secret scanning), L7 the env schema — both *commit-time* and *runtime* gates; this lesson adds the *install-time* gate, the third leg. Reuse the L6 Husky reference so the student sees the pre-commit hook is already there to extend.

Reasoning: the intro must reframe the problem from "audit your deps" (impossible at 200+) to "configure structural defenses" (a dozen lines). That reframing is the whole lesson; everything after is filling in the dozen lines.

### How a supply-chain attack actually runs

**Goal:** make the threat legible before any defense, so each later control lands on a concrete mechanism. This is the one incident walked end-to-end.

Walk the canonical typosquat-to-exfiltration kill chain as the worked example, because it is the simplest attack that touches install-scripts, freshly-published versions, and the lockfile all at once — so it motivates three of the lesson's controls in one story:

1. Attacker publishes `axois` (typo of `axios`) — or compromises a real maintainer's npm account via phishing and pushes a malicious patch to a *legitimate* popular package (the `chalk`/`debug` shape).
2. A dev (or an AI agent generating a `package.json`) installs it; resolution pulls the brand-new malicious version.
3. The package's `postinstall` script runs automatically during `pnpm install` — on the dev's laptop and in CI — with full filesystem and network access.
4. The script reads `.env.local` / CI secrets and exfiltrates them; the Shai-Hulud variant *also* re-publishes itself into other packages the victim maintains, self-replicating.

Diagram — **`DiagramSequence`** (the kill chain), one step per stage above (~4–5 steps), each step highlighting the active stage of a horizontal pipeline (Publish → Resolve → `postinstall` runs → Exfiltrate → Self-replicate). Author the pipeline as simple HTML nodes (`is-on` class on the active node, mirroring the render-pipeline pattern in the DiagramSequence doc). Pedagogical goal: the student *sees* that the attack executes at **install time**, before any of their code runs and before any test — which is exactly why commit-time and runtime gates (L6/L7) don't catch it, and why this lesson exists. Per-step captions name which later control breaks that stage (the 24h `minimumReleaseAge` quarantine breaks step 2; the `allowBuilds` / `strictDepBuilds` script gate breaks step 3; the committed lockfile breaks the "whatever's latest" resolution). Keep caption forward-refs to a few words.

After the diagram, state the structural conclusion in one line: you cannot review 200+ packages, so the defense is to make the dangerous stages (fresh versions, install scripts, unpinned resolution) structurally unreachable.

`Term` candidates in this section: *Shai-Hulud* (self-replicating npm worm, spring 2026; named for the Dune sandworm — it spread by re-publishing itself through compromised maintainer tokens), *transitive dependency* (a package your dependencies depend on, not one you installed directly), *typosquatting* (publishing a package whose name is a near-miss of a popular one to catch typos and AI hallucinations), *`postinstall` script* (an npm lifecycle script that runs automatically after a package is installed, with full machine access), *exfiltration* (covertly shipping stolen data — secrets, tokens — off the machine).

### The 24-hour quarantine: `minimumReleaseAge`

**Goal:** the single highest-leverage default — teach it first and deepest.

Lead with the threat from the diagram: a malicious version is most dangerous in the **first hours** after publish, before the community detects and yanks it. The defense is to refuse any version published less than 24 hours ago, so the quarantine window outlasts the typical detect-and-yank cycle.

Establish the config home up front (do this once, it applies to every setting in the lesson): in pnpm 11 these supply-chain settings live in **`pnpm-workspace.yaml`**, not `.npmrc` — `.npmrc` now holds only auth and registry settings. Show the YAML as a small `Code` block (`lang="yaml"`):

```yaml
minimumReleaseAge: 1440
```

Explain: `1440` is minutes (24h); **pnpm 11 ships this on by default** — the student inherits it, they aren't adding it; show it explicitly so they recognize it and know not to remove it. A version younger than the window simply won't resolve — install picks the newest version *older* than the cutoff. Make explicit it is **not** "never update" — it's "let everyone else be the canary for a day."

The carve-out (load-bearing, repeated): a genuine critical security patch younger than 24h is unblocked by adding **that one package** to `minimumReleaseAgeExclude` (a list in `pnpm-workspace.yaml`), committed in the same PR so a reviewer sees it — *never* by setting `minimumReleaseAge: 0`, which disables the quarantine for the entire tree. Show the scoped exclude as a 2–3 line YAML snippet. Frame the distinction as the senior tell: a scoped exclude entry is one named package, visible in the diff, reverted when the patch ages out; `minimumReleaseAge: 0` silently removes the defense for every dependency forever. Note explicitly that pnpm 11 offers **no per-command CLI bypass flag** — the exclude list is deliberately the only path, because it lives in the reviewed config rather than an invisible shell invocation. Use an `Aside` (caution) for this carve-out so it's visually pinned to the rule.

Reasoning: this is the control most likely to be disabled under deadline pressure ("the fix is right there, just turn off the age check"), so it gets the most explicit scoped-exclude-vs-global-off-switch treatment and its own section rather than being bundled.

### The registry-only contract: `blockExoticSubdeps`

**Goal:** close the side door — transitive deps that bypass the registry entirely.

Threat: a sub-dependency declared as a **git URL or a tarball URL** instead of a registry package skips every protection the registry layers on (provenance, the age window, yanking). It's how a compromised intermediate package smuggles arbitrary code past the controls.

Show the line (also `pnpm-workspace.yaml`):

```yaml
blockExoticSubdeps: true
```

Explain: **pnpm 11 default** (on out of the box); it enforces a **registry-only contract** for the whole transitive tree — every package must resolve from a configured registry, not an arbitrary URL. The student's *own* direct deps are still allowed exotic sources if they explicitly choose them; what's blocked is a *transitive* dep dragging in a URL the student never vetted.

Keep this section short — it's a one-line default with a clear rationale. Reasoning for brevity: it's important but uncontroversial; over-explaining a sensible default wastes the student's attention budget that the install-script gate and lockfile need more.

`Term` candidate: *exotic dependency* (a dep resolved from a git repo or tarball URL rather than a package registry).

### Install scripts run with no sandbox: the approval gate

**Goal:** the control that breaks step 3 of the kill chain — the one most students don't know exists.

Restate the diagram's sharpest fact: `postinstall` (and `preinstall`, `install`) scripts run **automatically, unsandboxed**, during install — this is the actual code-execution primitive every install-time attack uses. Historically `npm`/`yarn` ran them for *every* package by default.

The pnpm 11 posture, in three parts:

1. **Skipped by default.** pnpm does **not** run a dependency's lifecycle scripts unless that package is explicitly allowed. Packages not listed are treated as **unreviewed** and their scripts don't run.
2. **An explicit allow-map: `allowBuilds`.** This is the pnpm 11 mechanism (it *replaces* the removed pnpm 10 `onlyBuiltDependencies` array — flag this in one line so a student who has seen the old form recognizes the change). `allowBuilds` is a **map of package matcher → boolean**: `true` permits that package's build scripts, `false` explicitly denies. The few packages that *legitimately* compile native code at install (`esbuild`, `@swc/core`, `sharp` are the canonical trio) get `true`; everything else stays unreviewed.
3. **`strictDepBuilds: true` (the enforcement).** This pnpm 11 default makes the install **exit non-zero** when any dependency has unreviewed build scripts — so an unvetted `postinstall` doesn't silently slip past, it *fails the install* and forces a human decision. This is the teeth behind the allow-map; name it as the reason the gate can't be ignored.

Show the `allowBuilds` map with **`AnnotatedCode`** (`lang="yaml"`, `pnpm-workspace.yaml`), 2–3 steps:
- Step 1 — the `allowBuilds` map; "these and only these may run install scripts; everything else is unreviewed."
- Step 2 — color a representative entry (`esbuild: true`); explain *why* it's `true` (compiles a native binary), so the student learns the test: "does this package have a real native build step?" Optionally show one `false` entry to make the deny case concrete.
- Step 3 — the consequence with `strictDepBuilds`: a fresh dep with a `postinstall` not in the map fails the install until a human reviews and adds it.

The discipline rule (the senior contribution): **adding a package to `allowBuilds` is a code-review decision**, because it grants that package the right to run arbitrary code on every machine and in CI. Tie back to the kill chain: with the gate on, the typosquat's `postinstall` never fires — it's unreviewed, `strictDepBuilds` fails the install, the attack's code-execution primitive is structurally dead.

`Term` candidates: *lifecycle script* (`preinstall`/`install`/`postinstall` — npm scripts run automatically at install phases), *sandbox* (here: an isolated execution context; install scripts have *none* — full machine access).

### The lockfile is the contract

**Goal:** establish the committed, frozen lockfile as the thing that makes every other control deterministic.

The senior question: without a lockfile, `install` pulls "whatever satisfies the range" — which on a fresh CI machine can be a version published five minutes ago. The lockfile pins **every** package (direct and transitive) to an exact version *and* an integrity hash of the exact tarball.

Two rules:

1. **`pnpm-lock.yaml` is committed.** It's not a build artifact; it's the contract. Integrity hashes mean every install verifies it got the *exact* bytes that were vetted — a swapped tarball fails the hash.
2. **CI runs `pnpm install --frozen-lockfile`.** This *fails the build* if `package.json` and the lockfile disagree, instead of silently regenerating the lockfile and pulling new versions. Connect directly to the kill chain: not committing / not freezing reopens the "whatever's latest" resolution that step 2 depends on.

Show both as a small two-line `Code` block (the committed file + the CI command). Mention `packageManager` in `package.json` + `only-allow pnpm` in `preinstall` in one line — this pins the *tool* so a stray `npm install` can't regenerate a `package-lock.json` and bypass every pnpm control. Reasoning to include it here: the lockfile contract is only airtight if the package manager itself can't be swapped; the two facts belong together.

Small exercise candidate — **`Dropdowns`** (fenced code block with `___` placeholders) on a `pnpm-workspace.yaml` + CI command, blanking `minimumReleaseAge`, `blockExoticSubdeps`, `allowBuilds`, and `--frozen-lockfile`, so the student recalls the exact knobs *and their correct file*. Place it after this section since it spans the config-level controls taught so far. Reasoning: a fast no-stakes recall check on the literal config the deliverable will ask for; blanking the filename context too reinforces the `pnpm-workspace.yaml`-not-`.npmrc` correction.

`Term` candidates: *lockfile* (a file pinning every dependency to an exact resolved version + integrity hash), *integrity hash* (a cryptographic digest of a package's tarball; install rejects a tarball whose bytes don't match), *`--frozen-lockfile`* (install mode that fails rather than updating the lockfile — the CI-correct mode).

### Scanning for known-vulnerable versions: `pnpm audit`

**Goal:** distinguish *known* CVEs/advisories (audit's job) from *novel* malicious packages (the config defenses above) — students conflate them.

Open with the distinction explicitly: the controls above stop **novel/unknown** attacks (fresh versions, install scripts, unpinned resolution); `pnpm audit` catches **already-known** vulnerabilities by checking installed versions against an advisory database. Both layers are needed; neither replaces the other. This contrast is the section's reason to exist.

Cover:
- `pnpm audit` checks the dependency tree against the **GHSA** advisory database (pnpm moved from CVE-keyed to GHSA in the 2025–26 line).
- **`pnpm audit --prod`** filters out dev-only deps — the filter exists precisely so a high-severity advisory in a build-time-only package doesn't block a release the way a production-dep advisory should. Name the watch-out: ignoring a *production* high-severity "because it's transitive" is the misread `--prod` is built to prevent.
- **`pnpm audit --fix`** updates the lockfile toward a non-vulnerable version when one exists. (Fact-checked detail worth a one-line aside: in pnpm 11 `--fix` also adds the minimum patched version of each advisory to `minimumReleaseAgeExclude` — so a security fix isn't itself blocked by the 24h quarantine. This is a nice closing-the-loop moment: the two controls cooperate.)
- The **posture** (the senior contribution — a policy, not a command): zero high-severity in production deps as a release gate; mediums triaged within a sprint; lows tracked. State that CI wiring of this as a gate is L3 of ch097's job — here it's the local-before-merge habit and the posture.

Keep code minimal: one or two `Code` lines for the commands. The teaching weight is the *known-vs-novel* distinction and the severity posture, not command syntax.

`Term` candidates: *CVE* (Common Vulnerabilities and Exposures — the legacy public vulnerability ID scheme), *GHSA* (GitHub Security Advisory — the database pnpm now keys audits against), *advisory* (a published report that a specific package version range is vulnerable).

### Is this dependency worth adding?

**Goal:** the human judgment that no config can automate — the pre-install gate before a package ever enters `package.json`.

Frame as the question a senior asks *before* `pnpm add`, because the cheapest supply-chain defense is one fewer dependency. The three-question maintained check:

1. **Last release in the past ~6 months?** Abandoned packages are the typosquat/takeover vector — attackers acquire dormant namespaces precisely because nobody's watching.
2. **Downloads consistent with its reputation?** A "popular" package with oddly low or suddenly spiking downloads is a flag.
3. **Maintainer responsive?** (open issues triaged, recent commits) — a sign someone would notice a hijack.

Add the senior meta-point: every dependency is attack surface and maintenance debt; "can I do this with the platform / a few lines instead?" is the first question. Ties to the course's minimum-viable-stack thesis.

Exercise — **`Buckets`** (`twoCol`): "Add it" vs "Investigate / avoid", sorting ~6 realistic dependency vignettes (e.g. "12M weekly downloads, last release 3 weeks ago, 40 maintainers" → Add; "last release 2021, one maintainer, name one char off a popular lib" → Avoid; "new package, solves your exact need, 200 downloads, published last week" → Investigate). Pedagogical goal: drill the judgment into a fast pattern-match rather than a checklist the student forgets. Reasoning for Buckets over MCQ: classification across multiple realistic cases builds the *pattern*, which is the actual skill, where a single MCQ only tests one instance.

`Term` candidate: *attack surface* (every entry point an attacker could exploit; each dependency adds to it).

### Keeping deps current without losing the human gate: Renovate

**Goal:** the maintenance loop — staying patched *is* a security control, but automation must not bypass the senior decision.

Cover:
- Outdated deps accumulate known vulnerabilities; staying current is itself part of the baseline (closes the loop with the audit posture).
- **Renovate** as the 2026 senior default over Dependabot — better grouping and scheduling. Pattern: group patch/minor updates into a weekly batched PR; majors as individual PRs (they carry breaking changes that need a human read).
- The **load-bearing constraint**: updates land as PRs gated by the full CI suite (tests + `pnpm audit` + `--frozen-lockfile`) — never auto-merged blindly. Auto-merging every bot PR re-creates the very supply-chain risk these controls exist to manage: a malicious patch could ride a green auto-merge straight to main. The 24h quarantine and audit gate still apply to bot PRs.
- One line: **Socket / Snyk** as a deeper layer that scans for *behavioral* indicators (a package newly making network calls, reading env, touching the filesystem) rather than known CVEs — named, with the threshold (team of ~5+ flips the trigger), not wired.

`Code`: none needed, or a one-line illustrative `renovate.json` group rule at most. Keep prose-led.

`Term` candidates: *Renovate* (a bot that opens dependency-update PRs, with grouping/scheduling rules), *Socket* (a tool that flags packages by suspicious *behavior* — new network/fs/env access — rather than known vulnerabilities).

### The deliverable: your dependency-hygiene report

**Goal:** convert the lesson into the grep-able artifact ch082 audits against, consistent with how every other L1–L7 lesson ends.

Present as a **`Checklist`** (`id="dep-hygiene"`) the student runs against their own repo, each item one observable fact:
- `pnpm-lock.yaml` committed.
- `minimumReleaseAge` not zeroed out in `pnpm-workspace.yaml` (default 1440 intact); any `minimumReleaseAgeExclude` entry justified.
- `blockExoticSubdeps` left on (not set to `false`).
- `allowBuilds` map reviewed — every `true` entry justified by a real native build; `strictDepBuilds` not disabled.
- CI runs `pnpm install --frozen-lockfile`.
- `pnpm audit --prod` clean (no high-severity) or every finding triaged.
- `packageManager` pinned + `only-allow pnpm` in `preinstall`.
- Renovate (or Dependabot) enabled, with auto-merge off for non-trivial updates.
- Unmaintained / suspicious direct deps flagged (three-question check applied).

Use `chip="untested"` where the item is a manual inspection rather than a CI-verified fact. Close with one sentence: this report joins the chapter's catalog (headers, rate-limit matrix, audit-event catalog, retention catalog, consent reject-path, env audit, leak audit) that ch082 audits a seeded codebase against — naming this lesson's place as the eighth and final control.

Reasoning: every sibling lesson ends in a deliverable feeding ch082; the Checklist component is the established vehicle (per L6/L7 continuity notes), and persistence lets the student tick it against their real repo.

### Consolidation exercise (place within or after the deliverable)

A **`Matching`** drill pairing each **threat** to the **control that neutralizes it** — the lesson's spine made into one check:
- malicious fresh release → `minimumReleaseAge` (24h quarantine)
- transitive git/tarball URL → `blockExoticSubdeps`
- `postinstall` exfiltration → `allowBuilds` + `strictDepBuilds` (unreviewed scripts fail the install)
- "whatever's latest" in CI → committed lockfile + `--frozen-lockfile`
- known CVE in a dep → `pnpm audit`
- abandoned-package takeover → the three-question maintained check
- malicious patch riding an auto-merge → Renovate PRs gated by CI, no blind auto-merge

Pedagogical goal: the entire lesson is "threat → config"; this matching exercise verifies the student holds *that mapping*, which is the precise skill the quiz and ch082 will test. Reasoning for Matching over a quiz-style MCQ: it tests the whole set of pairings at once, reinforcing the lesson's one-to-one threat/control structure.

### External resources (optional, end of lesson)

One or two `ExternalResource` cards: pnpm's official supply-chain-security guide (`https://pnpm.io/supply-chain-security`) and/or the settings reference (`https://pnpm.io/settings`, for `minimumReleaseAge`, `allowBuilds`, `blockExoticSubdeps`), and optionally a primary write-up of the Shai-Hulud incident from a reputable security source (e.g. the Wiz, StepSecurity, or CISA advisory — verified in fact-check). No YouTube video proposed — this topic is config-and-judgment, better served by the docs links and the in-lesson exercises than by a talk; a video would add length without adding the hands-on recall the exercises already provide.

---

## Scope

**Prerequisites to restate concisely (do not re-teach):**
- pnpm as the package manager — known since the toolchain setup; one line. Do *not* assume the student knows which config file holds these settings: state once that pnpm 11 reads supply-chain settings from `pnpm-workspace.yaml` (`.npmrc` is auth/registry only). This is the correction, so make it explicit rather than assumed.
- Husky + Gitleaks pre-commit scanning and the env schema — established in L6/L7 of *this* chapter; reference as the commit-time and runtime gates this lesson complements, in one sentence. Reuse the existing Husky reference rather than re-teaching hook setup.
- CI exists and runs install — assume; this lesson states *what* CI must run (`--frozen-lockfile`, audit), not how CI is wired.

**Explicitly out of scope (defer or name-only):**
- **CI wiring** of `pnpm audit` as a blocking gate and Gitleaks rule-set tuning → ch097 L3/L4. Forward-reference once in the audit section; do not build CI config here.
- **Renovate config at depth / Socket / Snyk at depth** → named with their trigger thresholds, not configured.
- **Internal package signing (Sigstore, cosign), SBOM generation, npm provenance attestations** → out of scope entirely; do not introduce. (If provenance comes up via `blockExoticSubdeps` rationale, keep it to the registry-only-contract framing, one phrase.)
- **The Node runtime / `.ts` execution paths** (native vs `tsx` vs `tsc`) from the conventions' tooling section → not this lesson's topic; do not pull in.
- **`@t3-oss/env-nextjs` internals** → L7; this lesson only references that `.env.local` is what a `postinstall` exfiltrates, motivating the secrets-never-in-the-tree point — do not re-teach env validation.
- **Secrets rotation / Vercel sensitive flag** → L6; the kill chain shows secrets being stolen but the *defense framed here* is the dep controls, not secret storage (which L6 owns). Keep the boundary clean.
- **Breach narrative depth** — name Shai-Hulud and `chalk`/`debug` as motivation and walk *one* generic kill chain; do not turn the lesson into incident retrospectives.

**Naming consistency with chapter:** this is the eighth deliverable feeding ch082; list the seven siblings by name once (per the L7 continuity note's enumeration) so the catalog reads consistently across lessons. On the carve-out distinction: the chapter outline phrased it as "per-command flag, never config" — that phrasing is **stale** (pnpm 11 has no such flag). The lesson teaches the corrected distinction (*scoped, reviewed exclude entry* vs *global off-switch*); the L9 quiz and the continuity notes for this lesson must use the corrected form, not the chapter-outline phrasing.

---

## Code-convention alignment notes

- **The conventions doc's Supply-chain section is stale on the pnpm-11 surface.** It documents the pnpm 10 shape: `.npmrc` as the config home, `minimumReleaseAge=1440` and `blockExoticSubdeps=true` as `.npmrc` keys, and `onlyBuiltDependencies` as primary with `allowBuilds` as "the acceptable pnpm 11+ alternative." Fact-check (June 2026) confirms pnpm 11 **moved these to `pnpm-workspace.yaml`, removed `onlyBuiltDependencies` entirely, made `allowBuilds` (a map) the sole form, and added `strictDepBuilds: true` as a default.** The lesson teaches the current pnpm 11 reality; this divergence from the conventions doc is **deliberate and correct** — flag it to downstream agents so nobody "fixes" the lesson back to the stale `.npmrc`/`onlyBuiltDependencies` form. (A separate ticket to update the conventions doc is warranted but out of this lesson's scope — surface it as feedback.)
- Settings that *are* still valid per conventions and unchanged: committed `pnpm-lock.yaml`, CI `pnpm install --frozen-lockfile`, `pnpm audit --prod` as a signal job, Renovate or Socket for dep PRs, `packageManager` pin + `only-allow pnpm` in `preinstall`. `auto-install-peers=true` genuinely is an `.npmrc`-or-workspace setting — mention only if a fuller config is shown, and don't make it load-bearing.
- `pnpm audit --prod` is described as a CI **signal** job per conventions (non-blocking there); the *blocking* release-gate posture is the senior policy this lesson adds and explicitly forward-refs to ch097 for the CI gate. This divergence is deliberate: the conventions describe the wired CI state, the lesson teaches the policy that motivates it.
- Any `package.json` snippet uses the project's established shape (no invented fields); keep snippets to the lines under discussion, stripped of unrelated config.
- No application TypeScript here, so the TS/function-form/naming rules don't bind; the only "code" is declarative config (YAML for `pnpm-workspace.yaml`) and shell commands.

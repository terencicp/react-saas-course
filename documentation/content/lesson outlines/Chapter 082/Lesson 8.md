# Lesson 8 — Finding 7: the dep-hygiene gap

## Lesson title

Chapter-outline title fits. Keep **Finding 7: the dep-hygiene gap**.
Sidebar short title: **Finding 7: dep hygiene**.

## Lesson type

`Implementation`

The deliverable is a documented finding (`findings/007-dep-hygiene.md`), not code in the target. The test-coder fills `tests/lessons/Lesson 8.test.ts` to assert the finding-file shape plus a source-shape probe that the seeded defect (the three disabled flags) is still present.

## Lesson framing

The student installs the senior distinction this whole category turns on: `minimumReleaseAge` is the only *pre-install* defense, and Dependabot / `pnpm audit` are *post-install* signals — so a team that "just enabled Dependabot" is still exposed in the 24-hour window where a compromised release lands and yanks. They walk it deterministically (read `pnpm-workspace.yaml`, no install), corroborate with `pnpm audit --prod`, and write the seventh finding naming the three overridden flags as the load-bearing gap, the build allow-list and `packageManager` pin as healthy-and-not-the-gap, and the fix as a config change rather than a version bump.

## Codebase state

**Entry.** The audit target boots unchanged. `findings/001`–`006` are written (lessons 2–7). `findings/007-dep-hygiene.md` is the start skeleton: four empty section headers plus the `TODO(L8)` comment. `pnpm-workspace.yaml` ships the three overridden flags (`minimumReleaseAge: 0`, `blockExoticSubdeps: false`, `strictDepBuilds: false`) with a healthy `allowBuilds`/`onlyBuiltDependencies` list; `.npmrc` holds only `engine-strict` / `auto-install-peers`; `package.json` pins `packageManager: pnpm@11.3.0`. `pnpm test:lesson 8` is a `describe.todo` (skipped/green).

**Exit.** `findings/007-dep-hygiene.md` has all four template sections filled — rule (pnpm 11+ supply-chain defaults, ch081 L8), location (`pnpm-workspace.yaml` lines + the discovery commands + the `pnpm audit --prod` corroboration), consequence (pre-install vs post-install distinction, no hedging), fix (restore the three flags, keep `allowBuilds`, bump advisory deps, gate CI). The audit target is byte-for-byte unchanged — the three flags are still disabled. `pnpm test:lesson 8` passes.

## Lesson sections

Implementation type — sections in contract order.

### Goal + Finished result (intro, no header)

One-sentence goal in the project's terms: document the disabled pnpm 11+ supply-chain defaults as `findings/007-dep-hygiene.md` against the rule-location-consequence-fix template. Then a one-paragraph description (or a `Code` block excerpt of the finished finding's section headers) of the deliverable: the finding names the three overridden flags, the read-only discovery, and the keep-the-defaults-on fix. Reuse the audit rhythm already set in lesson 2 — open the source, walk one category, write the finding before moving on. No new screenshot needed; this finding has no running-app fingerprint (it is a deterministic file read), which is itself worth one sentence here.

### Your mission

Prose paragraph (no subsection headers, no implementation hints) weaving:

- **Feature** (user/project terms): surface and document the supply-chain gap — the project disabled the pnpm 11+ defaults that hold a malicious release out of an install.
- **The senior distinction the finding turns on** (the trap inexperienced teams fall into): "but we just enabled Dependabot" is the wrong defense. `minimumReleaseAge` is the *pre-install* window (the ~24h the community needs to catch and yank a poisoned release); Dependabot/Renovate raise PRs and `pnpm audit` reports *after* the bad version is already in the registry/tree. Frame the rule against the real threat — typosquats and maintainer-compromise vectors like Shai-Hulud — so the finding reads as a missing control, not a version-bump chore.
- **Constraints** (shape the discovery): the audit step is a deterministic read with **no install** — read `pnpm-workspace.yaml` and confirm `minimumReleaseAge`, `blockExoticSubdeps`, `strictDepBuilds` are off (the seeded values), that `allowBuilds` is a reviewed allow-list (healthy here), that pnpm settings do *not* live in `.npmrc` (the common misread), that `packageManager` is pinned in `package.json` (healthy here), and run `pnpm audit --prod` as the corroborating *post-install* signal, not the defense.
- **Out of scope:** patching the target (the fix is a paragraph, not a diff); wiring the CI `--frozen-lockfile`/audit gate (named as the forward thread to ch097 L3, not done here).

Then the **Functional requirements** numbered checklist (the only list in the section), each phrased as a verifiable outcome, tagged `[tested]` / `[untested]`:

1. `findings/007-dep-hygiene.md` has all four template sections populated and names the rule as the pnpm 11+ supply-chain defaults (ch081 L8). `[tested]`
2. The location records the disabled state of `minimumReleaseAge`, `blockExoticSubdeps`, `strictDepBuilds`, names `pnpm-workspace.yaml` as where the settings live (not `.npmrc`), and names the discovery command + the `pnpm audit --prod` corroboration. `[tested]` (file-shape: a command/file string appears in Location)
3. The finding records the healthy-and-not-the-gap pieces: the `allowBuilds`/`onlyBuiltDependencies` allow-list and the `packageManager` pin. `[untested]`
4. The consequence reads as a malicious release installing the day it ships with no window, and explicitly distinguishes `pnpm audit`/Dependabot as post-install signals from `minimumReleaseAge` as the pre-install defense — no "could potentially" hedging. `[untested]`
5. The fix names keeping the three flags on in `pnpm-workspace.yaml` (`minimumReleaseAge: 1440`, `blockExoticSubdeps: true`, `strictDepBuilds: true`), keeping `allowBuilds` as the reviewed allow-list, bumping the advisory-bearing deps, and gating CI (ch097 L3 forward thread). `[untested]`
6. A severity is assigned and justified in two lines. `[untested]`
7. The audit target still runs unchanged — the three flags are still disabled (proves documented, not patched). `[tested]` (source-shape probe)

Note for the test-coder: assertions target observable file shape (sections populated, rule string present, a command/file token in Location) plus a source-shape probe that the seeded flags remain disabled in `pnpm-workspace.yaml`. The nuanced requirements (pre/post-install framing, the fix's exact reach, severity) are `[untested]` — covered only in the reference solution and the by-hand checklist.

### Coding time

One line directing the student to write the finding against the template and brief, then read the worked solution. Wrap the solution body in `<details>` (writer renders collapsed).

The hidden solution reproduces `findings/007-dep-hygiene.md` as it lands in the repo (source: `projects/Chapter 082/solution/findings/007-dep-hygiene.md`) and walks it section by section. Code-sample handling:

- The finished finding file: present as **`Code` (markdown)** — it is the deliverable, read top to bottom; no need to spotlight parts in isolation.
- The discovery commands block (the two `rg` greps + `pnpm audit --prod`): a small **`Code` (shell)** block; one sentence each on what grep 1 returns (the three disabled flags), why grep 2 on `.npmrc` returns zero hits (settings live in the workspace file — the misread), and that `pnpm audit --prod` is the corroborating post-install signal (real transitive advisories already in the tree via `@trigger.dev/sdk` and `better-auth > drizzle-kit`).
- The fix's YAML snippet (the three flags restored + `allowBuilds`): **`Code` (yaml)** — a structural illustration, not a full diff, matching the template's "short illustrative snippet allowed" rule.

Decision rationale to state (one or two sentences each): why the read is the load-bearing evidence and the audit only corroborates (pre-install vs post-install); why the build allow-list staying correct is exactly what lets the defect ship green under `pnpm verify` (`strictDepBuilds: false` does not break `next build`); why the fix is a config change not a version bump (restoring `minimumReleaseAge` protects the *next* release; bumping advisory deps is the follow-on cleanup the window then guards). Cover the `[untested]` requirements here: the healthy `packageManager` pin and `allowBuilds` list (named present-and-not-the-gap), severity justification, the CI gate as the forward thread.

Link, don't re-explain: the pnpm 11+ supply-chain defaults and the 24-hour window (ch081 L8); the CI `--frozen-lockfile`/audit gate (ch097 L3); the audit method and grep rhythm (lesson 2 of this chapter).

External resources slot: appended after the `<details>` with no header (resourcer adds later) — e.g. pnpm settings docs for `minimumReleaseAge`/`allowBuilds`, a Shai-Hulud writeup.

No diagram. The pre-install/post-install timeline is carried by prose; a box-and-arrow would not add over the two-sentence contrast.

### Moment of truth

The test command and expected pass output, plus the by-hand checklist for the `[untested]` requirements.

- Command: `pnpm test:lesson 8`. Show the expected passing output (the Lesson 8 gate green — finding-shape assertions pass and the source-shape probe confirms the flags are still disabled).
- By-hand checklist (the test cannot judge these): the consequence distinguishes pre-install from post-install defenses (not just "outdated deps"); the location records the `pnpm-workspace.yaml` state *and* the `pnpm audit` corroboration; the fix names the three `pnpm-workspace.yaml` flags, not just a version bump; the finding records the healthy `allowBuilds` list and `packageManager` pin as not-the-gap; the severity justification holds up read aloud. Render as a `Checklist`/`ChecklistItem` with `untested` chips.

## Scope

- Does not cover the pnpm 11+ supply-chain defaults themselves, the threat model, or the rotation/allow-list mechanics — owned by ch081 L8; link, don't re-teach.
- Does not wire the CI `--frozen-lockfile` / `pnpm audit` gate — that is ch097 L3; named only as the fix's forward thread.
- Does not patch `pnpm-workspace.yaml` or bump the advisory deps — the audit is a read-only documentation pass; fixing is the next sprint's work, out of scope for the chapter.
- The other seven in-scope findings and the two bonus findings belong to their own lessons (2–7, 9) and the self-grade (lesson 10).

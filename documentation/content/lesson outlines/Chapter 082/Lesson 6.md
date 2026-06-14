# Lesson 6 outline — Finding 5: the secret in NEXT_PUBLIC_*

## Lesson title

Chapter-outline title fits. Keep: **Finding 5: the secret in `NEXT_PUBLIC_*`**.
Sidebar (short): **Finding 5: leaked secret**.

## Lesson type

`Implementation`.

## Lesson framing

The student installs the senior reflex that a variable's *name* is a security boundary: the `NEXT_PUBLIC_` prefix is the one path into the browser bundle, so naming a secret with it silently disarms the `@t3-oss/env-nextjs` server/client split that would otherwise have made the leak a build error. They ship `findings/005-secret-next-public.md` documenting a live Resend key shipped to every visitor — and crucially learn that the fix is *structural plus rotation* (move to the `server` partition behind a Server Action, then rotate the already-leaked key), not a one-line rename. The payoff is recognizing that a leaked secret in production is compromised the instant it ships, and a lint rule is a follow-up belt, never the fix.

## Codebase state

**Entry.** Audit target runs locally (Postgres up, seeded, dev server on `:3000`, signed in as `alice@example.com`). `findings/` holds the template plus eight skeleton placeholders; findings `001`–`004` are written (lessons 2–5). `005-secret-next-public.md` is still the 4-section skeleton with its `TODO(L6)` comment. The seeded defect is live: `NEXT_PUBLIC_RESEND_API_KEY` sits in `src/env.ts`'s `client` partition (line 50) and `ResendClientTest` in `src/app/(protected)/settings/resend-test.tsx` reads it to `fetch` Resend from the browser. The target is read-only and stays green under `pnpm verify`.

**Exit.** `005-secret-next-public.md` has all four template sections populated — rule (no-secrets-in-`NEXT_PUBLIC_*` + the server/client split), location (the three leak greps + DevTools fingerprint), consequence (key in bundle → domain abuse), fix (delete from `client`, move send to a Server Action, rotate Vercel-before-provider). The audit target is unchanged: the defect is still present, `pnpm test:lesson 6` passes. Findings `006`–`008` remain skeletons for later lessons.

## Lesson sections

Implementation contract: intro (no header) → **Your mission** → **Coding time** (`<details>`) → **Moment of truth**.

### Goal + Finished result (intro, no header)

One sentence: document the Resend API key shipped to the browser via a `NEXT_PUBLIC_*` variable. One short paragraph on the finished result — `005-secret-next-public.md` carrying the four sections, with the load-bearing detail being that the fix is structural-plus-rotation, not a rename. Note this is the secrets + env-validation pass of the audit (finding 5 of 8). Reference the running-app fingerprint (DevTools Network tab on `/settings`) the student will reproduce. No new code is written into the target; the deliverable is a Markdown finding. Optionally a single `Screenshot` of the DevTools Network entry showing the `POST https://api.resend.com/emails` request leaving the browser — only if the writer can source it cleanly; otherwise prose describes it.

### Your mission

Coherent prose paragraph, then the requirements `Checklist`. No implementation hints, no subsection headers.

Prose to weave (user/audit terms, no hints):
- This is a *naming* finding — the developer reached for `NEXT_PUBLIC_` to silence a build error, and that one prefix is what bypassed the env schema's `server` partition that would have caught it.
- The category combines secrets (chapter 081 lesson 6) and env validation (chapter 081 lesson 7) because both ride the one `src/env.ts` schema (imported as `@/env`).
- Audit method continues the established rhythm: grep-driven discovery, then a running-app confirmation. The three secret-leak greps are `NEXT_PUBLIC_` in `src/env.ts`, `process.env.` outside `src/env.ts`, and where the leaked var is actually read; plus a check for any `SKIP_ENV_VALIDATION` escape hatch.
- Some grep hits are legitimate and recorded as non-findings, not defects: four of the five `NEXT_PUBLIC_*` keys are genuinely public (`NEXT_PUBLIC_APP_*`, `NEXT_PUBLIC_POSTHOG_*` — a PostHog *project* key is public by design), and the `process.env.` hits are framework exceptions (`NODE_ENV`, `LOG_LEVEL`). Naming why each is safe is part of the audit.
- Running-app confirmation: open `/settings`, open DevTools Network, click "Send test email" — a request leaves the browser carrying the key in the `Authorization` header, and the key string is searchable in the client bundle. The response status is irrelevant (a fake key 401s); the fingerprint is the key in the bundle and the request leaving the browser.
- Constraints / traps to pre-empt (state as framing, not steps): the fix is structural, not configurational — a rename in place is not enough; and the key is *already in production*, so rotation is mandatory and pretending the leaked key is still safe is itself a fail. A lint rule banning `NEXT_PUBLIC_*` names matching `KEY|SECRET|TOKEN` is a follow-up belt, not the fix.
- Out of scope: patching the target (the fix is a paragraph, not a diff) and the bonus consent-gate finding on the same PostHog key (scored in lesson 10).

Requirements `Checklist` (the only list; each phrased as a verifiable outcome, tagged tested/untested per the test below):
1. `[tested]` `findings/005-secret-next-public.md` has all four template sections (Rule, Location, Consequence, Fix) populated.
2. `[tested]` The finding names the rule — no secrets in `NEXT_PUBLIC_*` plus the server/client env split the prefix bypassed — citing chapter 081 lessons 6 and 7 by section.
3. `[tested]` The Location section names a discovery command (the leak greps) and the call-site file (`resend-test.tsx`) — i.e. the location is evidence-backed, not an opinion.
4. `[tested]` The seeded defect is still present in the target (`NEXT_PUBLIC_RESEND_API_KEY` in `src/env.ts`'s client partition, read by `resend-test.tsx`) — the audit is read-only.
5. `[untested]` The defect is confirmed against the running app: the DevTools Network tab shows the key leaving the browser in the `Authorization` header.
6. `[untested]` The legitimate grep hits are recorded as non-findings with the reason each is public-safe (four public `NEXT_PUBLIC_*`, the framework `process.env.` exceptions, no open `SKIP_ENV_VALIDATION`).
7. `[untested]` The Consequence reads in user-visible terms — key in the bundle, an attacker mailing from the verified domain, SPF/DKIM/DMARC-passing phishing, domain-reputation collapse breaking real transactional mail.
8. `[untested]` The Fix names the structural change: delete from the `client` partition, move the send to a Server Action calling `sendEmail` (the existing `server-only` boundary), so the env split now enforces server-side residency.
9. `[untested]` The Fix includes rotating the already-leaked key via the chapter 081 lesson 6 runbook in Vercel-before-provider order, with the lint rule noted as a follow-up belt rather than the fix.
10. `[untested]` A severity is assigned and justified in two lines (critical — live key in every visitor's bundle, Client Component already wired to fire it).

### Coding time

One line directing the student to write the finding against the template and brief before reading the solution. Writer wraps the solution in `<details>` (collapsed).

Solution content — reproduce `findings/005-secret-next-public.md` as it lands in `projects/Chapter 082/solution/findings/`, then walk the non-obvious decisions:
- The full finding file (Category, Severity, Rule, Location, Consequence, Fix). Render the finding body as `Code` (markdown block) so it reads as the committed artifact.
- Location evidence — the three leak greps as a shell `Code` block (`rg -n 'NEXT_PUBLIC_' src/env.ts`; `rg -n 'process\.env\.' --glob '!src/env.ts' src`; `rg -Rn 'NEXT_PUBLIC_RESEND_API_KEY' src/app`) with their hit counts narrated: grep 1 returns five keys (four public-safe non-findings + the one secret-shaped fail), grep 2 returns only framework exceptions, grep 3 lands the call site. Covers untested req 6.
- The seeded shape — show the offending pair side-by-side with `CodeVariants` (tab "Leaked: client partition" = `src/env.ts` lines 42–51 showing `NEXT_PUBLIC_RESEND_API_KEY` beside the genuinely-public keys; tab "Healthy copy: server partition" = the `RESEND_API_KEY: z.string().min(1)` already at line 24 read only behind `server-only` in `src/lib/email.ts`). Decision rationale: the secret exists twice — once correctly server-side, once leaked client-side — so the fix is a deletion, not a relocation. Covers untested req 8.
- The call site — `AnnotatedCode` over `resend-test.tsx` directing focus to (a) the `'use client'` directive, (b) `env.NEXT_PUBLIC_RESEND_API_KEY`, (c) the `Authorization: Bearer ${...}` header on the browser `fetch` to `https://api.resend.com/emails`. One sentence: the prefix is what let a Client Component import the key at all.
- The fix snippet — the structural reach as a short `Code` block: a `'use server'` action (`settings/actions.ts`) that calls `sendEmail(...)` from `src/lib/email.ts`, keeping the key behind the existing `server-only` boundary; the client component keeps its button and calls the action. State that once the `client`-partition copy is deleted, importing the `server`-partition key from a client file becomes a build-time error — the split now *enforces* the rule. (Snippet only — no full diff per the audit's no-patch rule.)
- Rotation — one or two sentences: the key shipped to production, so rotation is mandatory; run the chapter 081 lesson 6 runbook Vercel-before-provider (new key → set in Vercel + redeploy → revoke old) so no deploy breaks on a dead credential; treat as event-driven (suspected leak). Covers untested req 9.
- Severity rationale — two lines (covers untested req 10).
- Link rather than re-explain: the secrets rules (chapter 081 lesson 6), the server/client env partitions (chapter 081 lesson 7), and the typed `env` seam (chapter 037 lesson 2). Use cross-ref slugs to the built chapters; do not restate their content.
- The writer appends external resources here after the `<details>` (no header) — leave for the resourcer.

### Moment of truth

Test command and expected pass output, then a by-hand `Checklist` for the untested requirements.

- Command: `pnpm test:lesson 6`. Expected: the suite passes — assertions confirm `005-secret-next-public.md` carries the four populated sections, names the secrets rule, names a discovery command + the call-site file, and a source-shape probe confirms the seeded `NEXT_PUBLIC_RESEND_API_KEY` is still present (a passing gate proves the student documented rather than patched the defect). Render expected output as `Code`.
- By-hand `Checklist` (the items the test cannot judge — map to untested reqs 5–10): the DevTools fingerprint was reproduced (key in the `Authorization` header on the outbound request); the legitimate grep hits are recorded as non-findings with reasons; the consequence reads in user-visible / domain-reputation terms, no hedging; the fix names the rename-and-move-to-Server-Action *and* rotation; the lint rule is noted as a follow-up, not the fix; severity is justified in two lines.

## Scope

This lesson documents only finding 5 (the leaked secret), not the env-validation invariants or secrets rules themselves — those are taught in chapter 081 lessons 6 and 7 (link, do not re-teach). It does not patch the target (fixes are paragraphs; out of scope by the audit's read-only rule). The PostHog `NEXT_PUBLIC_POSTHOG_KEY` appears in the greps as a legitimate non-finding here; its consent-gate defect (bonus finding 9) is surfaced and scored in lesson 10. The committing and self-grading of all findings happens in lesson 10. The CSP nonce / `next.config.ts` work referenced as adjacent belongs to finding 4 (lesson 5).

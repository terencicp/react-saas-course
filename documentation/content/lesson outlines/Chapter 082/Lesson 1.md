# Chapter 082 — Lesson 1 outline

## Lesson title

- Full: **Project overview** (chapter-outline title fits; keep it — the contract mandates "Project Overview" verbatim for the first project lesson).
- Sidebar: **Project overview**

## Lesson type

`Project overview`

(First project lesson. No feature built; no test-coder runs for this lesson. Writer renders the Project-overview section list.)

## Lesson framing

The student installs the senior reflex that a launch review is a *read-only* discipline: you take a running SaaS target and surface its defects without touching its code, because the deliverable that matters is a documented finding — rule, location, consequence, fix — not a patch. By the end they have the seeded audit target running locally and the `findings/` deliverable scaffolded, ready to write finding 1. The payoff is the framing itself: an audit is coverage of every category against a precise rule, graded later against an answer key the student does not peek at — not an ad-hoc "code review opinion."

## Codebase state

First lesson — no Entry/Exit deltas. State the starting point and the exit:

- **Start of lesson**: nothing running; the student holds the `start/` tree (seeded audit target plus empty `findings/` skeletons).
- **End of lesson**: the audit target runs on `:3000`, the student is signed in as the seeded admin, and `findings/` holds `template.md`, eight numbered placeholders (each a 4-section skeleton + per-lesson TODO comment), and empty `out-of-scope.md` / `SUMMARY.md`. No finding written yet.

## Lesson sections

Follow the Project-overview contract order exactly.

### What we're building (intro, no header)

One paragraph: a pre-launch security and error-handling audit of a real SaaS codebase (the course's own running project, forked into an audit target). The deliverable is a committed `findings/` directory — one Markdown file per finding, each on the rule-location-consequence-fix template — **not** patches to the target. The target ships ten planted defects (eight across eight categories plus two bonus), all green under `pnpm verify`, because an audit reads a *running* target; the skill is finding and documenting them, then self-grading against the answer key once committed.

- One figure: a `Screenshot` (or `Figure`) showing the finished deliverable — one filled finding file (`solution/findings/001-fail-closed.md`) beside the `findings/` directory layout. Use `TabbedContent` only if both the rendered finding and the dir listing are worth showing; otherwise a single `Figure` is enough.

### What we'll practice

Bullet list (skills, not features). Pull from the chapter outline's "What we'll practice":

- Reading a running app and its source side-by-side to surface defects an inexperienced dev misses.
- Naming a defect against a precise rule — the load-bearing audit skill.
- Writing a defect's consequence in user-visible or legal terms, never "code smell."
- Reaching for the senior fix, named by the helper/wrapper it lives in.
- Working under a real audit's constraint: coverage over depth, no peeking at an answer key.

### Architecture

Labeled list (the contract allows diagram *or* labeled list; prose carries this fine — no diagram needed). Convey shape only:

- The **audit target** — the course's running project with ten seeded defects (eight in scope, two bonus) — is **read-only**; it runs unchanged at the end of every lesson.
- The **`findings/` directory** — the student's editable deliverable — sits at the project root beside `src/`.
- The **eight audit categories** split across two passes: an error-discipline pass (rules from chapter 080) and a security-baseline pass (rules from chapter 081). One finding per category is the floor.
- The **answer key** lives in `solution/findings/` (real-course framing: a `v1.0-answer-key` git tag), consulted only after commit — honor system.

Optionally a `Card`/`CardGrid` with two tiles (error-discipline pass / security-baseline pass) naming the categories each pass owns, to make the 8-category split legible. Keep it shape-only.

### Starting file tree

Use `FileTree`. Annotate the top-level layout from the chapter framing's starter file tree. Comment **only** the files the audit reads against or that lessons touch; leave the rest uncommented. Bold-highlight `findings/` as the focus — the only directory the student edits.

- Mark `findings/` (bold) as the highlighted focus; list `template.md`, the eight numbered placeholders, `out-of-scope.md`, `SUMMARY.md`.
- Comment the defect-carrying files at one line each, naming the finding number, e.g.:
  - `next.config.ts` — five static headers, no CSP (finding 4)
  - `pnpm-workspace.yaml` — supply-chain defaults disabled (finding 7)
  - `src/env.ts` — `NEXT_PUBLIC_RESEND_API_KEY` in the client partition (finding 5)
  - `src/proxy.ts` — presence-only cookie guard, no per-request nonce (finding 4)
  - `src/lib/admin/transfer-ownership.ts` — try/catch around `requireRole` (finding 1)
  - `src/lib/billing/transfer-ownership.ts` — ownership transfer with no `logAudit` (finding 3)
  - `src/lib/account/delete-account.ts` — deletes the user row only (finding 8)
  - `src/app/(protected)/invoices/[id]/notes.tsx` — note body as raw HTML (finding 2)
  - `src/app/(protected)/settings/resend-test.tsx` — Client Component reading the public key (finding 5)
  - `src/app/api/auth/reset-password/route.ts` — Resend trigger, no limiter (finding 6)
  - `src/app/api/exports/trigger/route.ts` — bare `.limit()`, bypasses `safeLimit` (bonus finding 10)
  - `src/app/_components/providers.tsx` — `opt_out_capturing_by_default: false`, no consent gate (bonus finding 9)
  - `trigger/delete-user.ts` — healthy async GDPR deletion job (finding-8 reference impl)
- Comment the canonical seams the findings read *against* (so the student calibrates the eye on the seam before hunting the bypass): `src/lib/auth/authed-action.ts`, `src/lib/auth/require-role.ts`, `src/lib/safe-limit.ts`, `src/db/audit-log.ts`, `src/db/tenant.ts`, `src/env.ts`. One line each. Defer their deep per-file reading to the finding lessons.
- Leave `src/components/ui/`, `src/emails/`, the auth flow folders, etc. uncommented or collapsed with a `…` placeholder — they are read, not central.

Aside (note): `start/` and `solution/` are identical except `findings/` — `start/findings/` carries empty skeletons + TODOs, `solution/findings/` carries the answer key.

### Roadmap

`CardGrid` of `Card`s — one per lesson (2–10), lesson number + title + one sentence naming what it adds. Source from the chapter outline:

- L2 — Finding 1: the fail-closed bypass. Models the audit method end-to-end; first finding is the reference shape.
- L3 — Finding 2: the XSS HTML sink. Surfaces user content rendered as raw HTML.
- L4 — Finding 3: the missing audit-log write. Surfaces the silent ownership transfer.
- L5 — Finding 4: the CSP header omission. Surfaces the missing defense-in-depth header.
- L6 — Finding 5: the secret in `NEXT_PUBLIC_*`. Surfaces the API key shipped to the browser.
- L7 — Finding 6: the missing rate limit on password-reset. Surfaces the unthrottled Resend trigger.
- L8 — Finding 7: the dep-hygiene gap. Surfaces the missing pnpm 11+ supply-chain defaults.
- L9 — Finding 8: the GDPR deletion gap. Surfaces the deletion that leaves PII behind.
- L10 — Commit and self-grade. Commits the findings and scores them against the answer key.

### Setup

`Steps` component, exact commands in order, then dev server, then expected result. Use `Code` for command blocks.

1. Get the starter codebase from the [project repository](https://github.com/terencicp-react-saas-course-projects), under `Chapter 082/start/`. (Real-course framing: cloned via `degit`; here open the `start/` tree.)
2. `cp .env.example .env` — env file in place.
3. `pnpm install` — completes clean.
4. `docker compose up -d` — local Postgres 18 running.
5. `pnpm db:migrate && pnpm db:seed` — schema applied; deterministic seed loaded (admin Alice, a second org, an invoice carrying the planted XSS note, suppression rows, the audit tail).
6. `pnpm dev` — app on `:3000`; sign in at `/sign-in` as `alice@example.com` / `inspector-password-12`.

Env vars (list as a short table or bullets — name, purpose, how the value is obtained). The `.env.example` ships **dummy** third-party keys so env validation passes with no network round-trip — no external accounts needed to run the target read-only:

- `DATABASE_URL` / `DATABASE_URL_UNPOOLED` — local Postgres connection (from `docker-compose.yml`).
- `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` — session signing + base URL (dummy local values).
- `RESEND_API_KEY` (and the seeded-defect `NEXT_PUBLIC_RESEND_API_KEY`) — dummy `re_*`; never reached at run time.
- `STRIPE_SECRET_KEY` (`sk_test_*`), `STRIPE_WEBHOOK_SECRET` (`whsec_*`) — dummy; satisfy env validation only.
- `TRIGGER_SECRET_KEY` (`tr_*`), `TRIGGER_PROJECT_REF` (`proj_*`) — dummy.
- `UPSTASH_REDIS_REST_URL` / `_TOKEN` — dummy; rate-limit findings are confirmed by source read, not a live limiter.
- `NEXT_PUBLIC_POSTHOG_KEY` / `_HOST` — dummy; the consent-gate finding is confirmed by source read.
- `SEED` — deterministic seed value.

State the browser-invisible fingerprints (curl headers, DevTools network, repeated submits, the PostHog request) are confirmed by static source reads plus each lesson's by-hand checklist, not by live integration.

Name the answer-key location (`solution/findings/`; real-course framing: the `v1.0-answer-key` tag) and the honor-system rule: not consulted until the findings are committed in lesson 10. Use an `Aside` (caution) for the honor-system rule.

Expected result (close the section): the dashboard loads on `:3000` as the seeded admin, and `findings/` holds `template.md` plus eight numbered placeholders (each a 4-section skeleton + TODO) and the empty `out-of-scope.md` / `SUMMARY.md`. Note explicitly: the lesson ends when the starter runs locally — **no finding is written yet**.

Optionally include the finding template (`findings/template.md`) here as a `Code` block so the student sees the shape they will fill, since every finding lesson copies it. Keep it brief — the four sections (Rule / Location / Consequence / Fix) plus the Category + Severity header.

## Scope

- **No finding is written or graded here** — finding 1 and the audit method are lesson 2's job; grading is lesson 10.
- **No technology rationale** — why fail-closed, why CSP, why `minimumReleaseAge`, etc., are owned by chapters 080 and 081; this lesson links, never re-teaches.
- **No deep per-file reading** of the defect call sites or the seams — each finding lesson opens its own file when it surfaces the defect.
- **No patching the target** — the audit is read-only; fixing the findings is the next sprint's work, out of scope for the whole chapter.
- **No diagram** — the architecture is a labeled list per the contract; no flow here needs one.

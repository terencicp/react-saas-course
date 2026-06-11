# Lesson 1 — Project overview

## Lesson title

Chapter-outline title "Project Overview" fits the contract (the first project lesson is always titled this). Use as-is.

- **Page title:** `Project overview`
- **Sidebar title:** `Overview`

## Lesson type

`Project overview` — no feature built; the student leaves with the chapter-065 starter fork running locally and `/inspector` + `/inbox` loading (fire buttons error with `dispatch not implemented`).

## Lesson framing

The student leaves seeing the whole notification dispatcher as one named seam before writing a line of it: every call site and every channel routes through a single `dispatch(event)`, the registry is the source of truth for what can be notified, and three tables back the behavior (inbox feed, per-category prefs, dedup window). The payoff is the mental model — adding an event is one registry entry, adding a channel is one function with a fixed signature, and notifications fire only after the action commits — plus a running starter they will fill in over three implementation lessons.

## Lesson sections

This is the first lesson, so no Codebase-state Entry/Exit block. Render the Project-overview section list in order.

### What we're building (intro, no header)

One paragraph: three product events (an invite sent, a member's role changed, a billing past-due) fan out across two channels (email + in-app inbox) through one dispatcher. Name the demo loop the student will reproduce: `Fire invite-sent` (inbox +1, email +1), `Rapid-fire 5x` (inbox +1, dedup badge reads "4 deduped"), then toggle email off and refire (inbox grows, email counter does not). State plainly that the student builds the dispatcher, registry, channels, prefs, dedup, three tables, and three call sites — the inspector and email templates are provided.

- **Figure:** one `Screenshot` of `/inspector` working — three fire buttons, inbox panel populated, email counter at 3, prefs panel visible. Wrap in `<Figure>` with a caption. (Screenshot captured downstream; brief it as the finished-state anchor.)

### What we'll practice (h2 — "What we'll practice")

Bulleted list, skills the student develops (not tech rationale). Pull from the chapter outline's six bullets, kept terse:

- The dispatcher seam — one named entry point every call site and channel routes through; the canonical shape later notification features copy.
- The registry as source of truth — adding an event is one entry; adding a channel later is one function with the same signature.
- Preference resolution read once per dispatch, default-on, with the critical-channel override that keeps billing email flowing.
- Time-windowed dedup keyed per recipient, so a burst collapses to one notification.
- Fire-after-commit discipline at three real call sites, so rolled-back work never notifies.
- Channel independence under per-channel `try/catch`, so one failing channel never kills the other.

### Architecture (h2)

Shape only. Lead with a labeled list of the seam (the contract allows diagram or labeled list); add one `ArrowDiagram` inside a `<Figure>` to carry the left-to-right flow prose can't: **Call sites** → **`dispatch(event)`** → (registry lookup, batched prefs read, per-recipient: resolve channels → dedup → fan-out) → **Channel functions** (`sendEmailChannel`, `writeInboxChannel`), with the **three tables** (`notifications`, `user_notification_preferences`, `notification_dedup`) shown as the backing store. Cap diagram height per the diagram guidance; horizontal layout.

Labeled list (the authoritative shape, matching the chapter outline):

- **Call sites** (`sendInvitation`, `changeMemberRole`, the billing webhook) build a `NotificationEvent` and `await dispatch(...)` after their transaction commits.
- **`dispatch(event)`** looks up the registry entry, reads preferences once for all recipients, then per recipient resolves channels, claims dedup, and fans out.
- **Channel functions** (`sendEmailChannel`, `writeInboxChannel`) share `({ recipient, event, payload, rendered })` and run behind per-channel `try/catch`.
- **The registry** maps each event type to its `preferenceCategory`, channels, dedup window, templates, and optional critical channel.
- **Three tables** back the seam: `notifications` (inbox feed), `user_notification_preferences` (per-category channel toggles), `notification_dedup` (the time window).
- **`/inspector`** drives every behavior; **`/inbox`** is the server-rendered read of `notifications`.

Keep this descriptive — no signatures, no SQL. Those land in the implementation lessons.

### Starting file tree (h2)

A `FileTree` of the starter, annotated top-level. Comment one line each only on files the lessons touch or that changed from the chapter-065 fork; leave the rest uncommented. Mark the TODO-bearing files as the highlighted focus.

- **Highlighted focus (the files the student fills):** `lib/notifications/registry.ts`, `dispatcher.ts`, `dedup.ts`, `prefs.ts`, `get-user-email.ts`, `channels/email.ts`, `channels/inbox.ts`; the three stub tables in `db/schema.ts` (commented-out block under `// TODO(L2)`); the three call sites — `lib/invitations/send.ts`, `lib/invitations/manage.ts`, the Stripe webhook past-due branch (`lib/webhooks/stripe.ts` + `app/api/webhooks/stripe/route.ts`).
- **Provided, not authored (call out briefly):** `lib/notifications/types.ts`, `errors.ts`, `index.ts` (barrel); the three React Email templates in `src/emails/`; `lib/email.ts` with `EMAIL_MOCK` mode; the entire `/inspector` page (page, actions, `_data`, `_components`); `/inbox/page.tsx`; the chapter-065 carry-in (auth tables, `audit_logs`, `plan_entitlements`, `processed_events`).
- Source the exact tree from the chapter outline's "Starter file tree" section — do not re-derive it. Render at the granularity that fits one screen; collapse deep leaf detail the lessons don't touch.

### Roadmap (h2)

`CardGrid` with one `Card` per implementation lesson. Title = lesson number + title; body = one sentence naming what it adds.

- **Lesson 2 — Registry, dispatcher, and dedup.** Define the three events, write `dispatch()` with stub channels, and prove the 60-second dedup window from the inspector.
- **Lesson 3 — Channels and preferences live.** Replace the stubs with the inbox writer, the email channel, and a batched preferences read with default-on and the critical-channel override.
- **Lesson 4 — Wire the three call sites.** Add `dispatch()` after commit in `sendInvitation`, `changeMemberRole`, and the Stripe past-due webhook branch.

### Setup (h2)

`Steps` component, exact commands in order. First step must direct to the project repo. Use `Code` blocks for the commands; an `Aside` for the `EMAIL_MOCK` note.

1. Get the starter codebase from the [project repository](https://github.com/terencicp/react-saas-course-projects), under `Chapter 071/start/` (clone via `degit`).
2. `pnpm install`.
3. `docker compose up -d` (Postgres 18).
4. Copy `.env.example` to `.env`; generate `BETTER_AUTH_SECRET` and `INVITATION_SIGNING_SECRET` with `openssl rand -base64 32`; leave `EMAIL_MOCK=1`.
5. `pnpm db:migrate && pnpm db:seed`.
6. `pnpm dev`.

Env var list (name / purpose / how to obtain):

- `DATABASE_URL` (+ `DATABASE_URL_UNPOOLED`) — Postgres connection; values from `docker-compose.yml`.
- `BETTER_AUTH_SECRET` — session signing; `openssl rand -base64 32`.
- `INVITATION_SIGNING_SECRET` — invitation token signing; `openssl rand -base64 32`.
- `RESEND_API_KEY` — mocked under `EMAIL_MOCK=1`; any non-empty value works locally.
- `STRIPE_WEBHOOK_SECRET` — from chapter 065's `stripe listen`; needed only for the live billing-past-due path.
- `APP_URL` / `NEXT_PUBLIC_APP_URL` — `http://localhost:3000`.
- `EMAIL_MOCK=1` — short-circuits Resend and bumps the inspector's deterministic email-sent counter.

Expected result: `pnpm dev` serves the chapter-065 dashboard; `/inspector` loads (notification reads return empty at scaffold) but every fire button errors with `dispatch not implemented`; `/inbox` renders empty. One short note: the starter forks chapter 065 working and this project layers the dispatcher on top rather than rewriting; `EMAIL_MOCK` is the verification proxy because real Resend round-trips are slow and rate-limited, and the student never edits `lib/email.ts`. Note that `stripe listen` (inherited from chapter 065) enables the live billing-past-due path; without it the inspector's `Fire billing-past-due` button stands in.

The lesson ends when the starter runs locally. No technology rationale here — that belongs to chapter 070's teaching lessons.

## Scope

- No implementation — the dispatcher, registry, channels, prefs, dedup, schema, and call sites are built in Lessons 2-4. This lesson only installs the mental model and a running starter.
- No technology rationale (why a dispatcher seam, why a registry, why time-windowed dedup) — that is chapter 070's four teaching lessons; reference, do not re-teach.
- No signatures, SQL, or code-level detail in Architecture or the file tree — those surface in the implementation lessons that own them.
- Forward references the dispatcher hands off (chapter 073 cache, 075 Upstash dedup, 066 Trigger.dev channel queue) are named in Lesson 4's close, not here.

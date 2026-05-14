# TOC — Chunks (Units 7-23 outline build)

Parallel work tracker for agents building lesson outlines for units 7 through 23. Units 1-6 outlines are already complete (see `documentation/outlines/`).

## How to use this document (agents read this first)

1. **Claim a chunk.** Pick a chunk below whose "Claimed by" line is empty. Edit this file: put your agent ID/handle on the `Claimed by:` line and tick `[x]` on `Claimed`. Save and proceed.
2. **One chunk per agent.** Do not split a chunk across agents and do not claim more than one at a time. If a chunk is already claimed, pick another.
3. **Work order inside the chunk.** Follow chapters in the order listed (matches the TOC). Earlier chapters install primitives that later chapters reuse — going out of order will force rework.
4. **Tick chapter checkboxes as you finish each one.** Tick `[x]` on the chapter line the moment its outline file is written and saved. This is the signal to other agents that the chapter is done.
5. **Tick `Completed` when every chapter in the chunk is ticked.** Add a one-line note on the `Notes:` line if anything downstream needs to know (e.g., assumption made, dependency gap surfaced).

## Output location and file naming

- Write each outline to `documentation/outlines/Chapter X.Y.md` (one file per chapter, matching the convention used for units 1-6).
- Follow the structure and density of the existing outlines (see `documentation/outlines/Chapter 6.6.md` for the most recent project-chapter example and `documentation/outlines/Chapter 6.1.md` for a concept-chapter example).

## Required reading before drafting

- `documentation/Table of contents.md` — the canonical scope and ordering for your chapters. Treat it as the source of truth; do not invent topics it doesn't list.
- `documentation/Pedagogical approach.md` — teaching style, lesson shape, and tone.
- `documentation/Projects.md` — for any "Project:" chapter, the project spec lives here.
- `documentation/components/INDEX.md` — the component vocabulary you may invoke in outlines (Figure, AnnotatedCode, Quiz, etc.).
- Existing outlines for the units immediately before your chunk (so you carry forward the same conventions and vocabulary).

## Cross-chunk coordination

- If your chunk depends on a primitive named in an earlier chunk, assume the canonical TOC name and behavior — do not block on the other agent.
- If you find a TOC contradiction or a missing dependency, **do not silently fix it**. Note it on the chunk's `Notes:` line and continue with the most defensible reading.

---

## Chunk A — Units 7-10 (18 chapters)

**Theme:** Forms, Server Actions, Email, Auth, Multi-tenancy and RBAC.

- Status: `[ ]` Claimed  `[ ]` Completed
- Claimed by:
- Notes:

### Unit 7 — Forms, Validation, and Server Actions (6 chapters)

- [ ] Chapter 7.1 — Schema-first validation with Zod 4
- [ ] Chapter 7.2 — Server Actions
- [ ] Chapter 7.3 — The native React 19 / Next.js 16 form pattern
- [ ] Chapter 7.4 — When the platform isn't enough — RHF (conditional)
- [ ] Chapter 7.5 — Route handlers and API contracts
- [ ] Chapter 7.6 — Project: CRUD via Server Actions

### Unit 8 — Email — Transactional Mail with Resend + React Email (3 chapters)

- [ ] Chapter 8.1 — Sender identity and deliverability
- [ ] Chapter 8.2 — Composing email
- [ ] Chapter 8.3 — Project: transactional email send

### Unit 9 — Authentication with Better Auth (5 chapters)

- [ ] Chapter 9.1 — Auth concepts
- [ ] Chapter 9.2 — Better Auth setup
- [ ] Chapter 9.3 — Sign-in flows
- [ ] Chapter 9.4 — Auth at request time and account management
- [ ] Chapter 9.5 — Project: email+password auth with verification

### Unit 10 — Multi-Tenancy, Organizations, and RBAC (4 chapters)

- [ ] Chapter 10.1 — Organizations as the tenancy model
- [ ] Chapter 10.2 — RBAC and the audit trail at the action boundary
- [ ] Chapter 10.3 — Invitations and seat management (SaaS pattern #3)
- [ ] Chapter 10.4 — Project: org, RBAC, and invitations

---

## Chunk B — Units 11-15 (16 chapters)

**Theme:** Lists and URL state, Webhooks and Stripe billing, Background work and object storage, Notifications, Cache and rate limiting.

- Status: `[ ]` Claimed  `[ ]` Completed
- Claimed by:
- Notes:

### Unit 11 — SaaS Building Blocks I: Lists, URL State, Soft Delete (3 chapters)

- [ ] Chapter 11.1 — URL-state list views (SaaS pattern #7)
- [ ] Chapter 11.2 — Soft delete, archive, and concurrency
- [ ] Chapter 11.3 — Project: URL-state list with soft delete and concurrency

### Unit 12 — Webhooks and Stripe Billing (3 chapters)

- [ ] Chapter 12.1 — Webhook ingestion (SaaS pattern #5)
- [ ] Chapter 12.2 — Stripe billing (SaaS pattern #4)
- [ ] Chapter 12.3 — Project: Stripe webhook to plan entitlements

### Unit 13 — Conditional Infrastructure: Background Work and Object Storage (4 chapters)

- [ ] Chapter 13.1 — Background work — defaults and Trigger.dev
- [ ] Chapter 13.2 — Project: Trigger.dev durable export job
- [ ] Chapter 13.3 — Object storage (conditional)
- [ ] Chapter 13.4 — Project: presigned R2 upload

### Unit 14 — Notifications (2 chapters)

- [ ] Chapter 14.1 — Notifications as a centralized layer (SaaS pattern #10)
- [ ] Chapter 14.2 — Project: notification dispatcher

### Unit 15 — Cache and Rate Limiting (4 chapters)

- [ ] Chapter 15.1 — Cache decisions as architecture (SaaS pattern #8)
- [ ] Chapter 15.2 — Project: cacheTag-driven invalidation
- [ ] Chapter 15.3 — Rate limiting and shared session-shaped data (Upstash)
- [ ] Chapter 15.4 — Project: Upstash rate limit on auth endpoints

---

## Chunk C — Units 16-19 (16 chapters)

**Theme:** Conditional client-state tools, Errors and security baseline, Time and internationalization, Testing.

- Status: `[ ]` Claimed  `[ ]` Completed
- Claimed by:
- Notes:

### Unit 16 — Conditional Client-State Tools (4 chapters)

- [ ] Chapter 16.1 — TanStack Query (conditional)
- [ ] Chapter 16.2 — Project: TanStack Query on optimistic comments
- [ ] Chapter 16.3 — Zustand (conditional)
- [ ] Chapter 16.4 — Project: Zustand for a multi-step wizard

### Unit 17 — Errors and the Security Baseline (SaaS patterns #6 and #12) (3 chapters)

- [ ] Chapter 17.1 — Error discipline
- [ ] Chapter 17.2 — The security baseline
- [ ] Chapter 17.3 — Project: error and security baseline audit

### Unit 18 — Time and Internationalization (3 chapters)

- [ ] Chapter 18.1 — Time, dates, and timezones (SaaS pattern #13)
- [ ] Chapter 18.2 — Internationalization (SaaS pattern #14)
- [ ] Chapter 18.3 — Project: localized, tz-aware list view

### Unit 19 — Testing (6 chapters)

- [ ] Chapter 19.1 — The shape of a test suite
- [ ] Chapter 19.2 — Unit tests for `/lib`
- [ ] Chapter 19.3 — Integration tests at the seams
- [ ] Chapter 19.4 — Component tests (conditional)
- [ ] Chapter 19.5 — E2E (conditional)
- [ ] Chapter 19.6 — Project: integration + E2E tests for the Stripe checkout flow

---

## Chunk D — Units 20-23 (17 chapters)

**Theme:** Observability and performance, Git/CI/deploy/migrations, Documentation and code review, AI integration.

- Status: `[ ]` Claimed  `[ ]` Completed
- Claimed by:
- Notes:

### Unit 20 — Observability and Performance (4 chapters)

- [ ] Chapter 20.1 — Error monitoring and structured logs
- [ ] Chapter 20.2 — Product analytics
- [ ] Chapter 20.3 — Performance vigilance (SaaS pattern #15)
- [ ] Chapter 20.4 — Project: observability and performance audit

### Unit 21 — Git, CI, Deployment, and Schema Migrations (5 chapters)

- [ ] Chapter 21.1 — Git and version control
- [ ] Chapter 21.2 — CI on GitHub Actions
- [ ] Chapter 21.3 — Vercel deployment and going live
- [ ] Chapter 21.4 — Schema migrations against a live app (SaaS pattern #11)
- [ ] Chapter 21.5 — Project: deploy and a live expand-migrate-contract migration

### Unit 22 — Documentation and Code Review (4 chapters)

- [ ] Chapter 22.1 — Documentation that lives next to code
- [ ] Chapter 22.2 — Comments, TSDoc, and team discipline
- [ ] Chapter 22.3 — Code review
- [ ] Chapter 22.4 — Project: PR review and one ADR

### Unit 23 — AI Integration with the Vercel AI SDK (conditional) (4 chapters)

- [ ] Chapter 23.1 — When AI features earn their weight
- [ ] Chapter 23.2 — Generating text and structured output
- [ ] Chapter 23.3 — Tools, agents, and generative UI
- [ ] Chapter 23.4 — Project: LLM-backed invoice Q&A with tool calling

---

## Totals

| Chunk | Units | Chapters |
|-------|-------|----------|
| A | 7-10 | 18 |
| B | 11-15 | 16 |
| C | 16-19 | 16 |
| D | 20-23 | 17 |
| **Total** | **7-23** | **67** |

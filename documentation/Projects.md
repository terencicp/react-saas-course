# Small focused projects — Web Dev Course (2026)

Each project is a chapter at the end of its unit, broken into 3–7 lesson-sized sub-bullets that respect the `<1h` grain rule from §5. The canonical shape is brief → starter walkthrough → one or more "build it" lessons split at natural break points → verify. Lighter projects (1.5–2h) fold the starter walkthrough into the brief. Audit projects (17, 20, 22) replace "build it" with "audit it" / "wire it" / "review it" and start with a guided walkthrough that models one finding end-to-end. The deploy project (21) splits into one lesson per PR plus a rollback rehearsal.

**Where they live.** Starters and solutions ship from a separate `react-saas-course-projects` monorepo, one directory per project with `starter/` and `solution/` siblings — not in the Starlight repo (different toolchain, different cadence) and not one repo per project (the stack moves across the course's lifetime and downstream starters need atomic updates when an upstream unit's schema or API shifts). Lessons link to each starter via a `degit` command so students fetch a single folder, never the whole monorepo. The `solution/` folder is the source of truth for the "Done when" spec; for audit projects (17, 20, 22) it doubles as the answer key, released under a tag after the student commits their findings.

**Infrastructure prereqs.** Projects assume the student creates accounts on the third-party services that earn their weight in real flows: Resend (with a verified domain — a cheap Namecheap or similar is fine), Stripe (test mode), Trigger.dev (cloud), Cloudflare R2, Upstash Redis, Sentry, PostHog, Vercel, and Neon. All have free tiers sized for course work; the verified domain is the only line item that costs money. Listed here so the student can plan account creation in Unit 0 rather than mid-unit.

---

### Unit 4 — Themed product surface

**What you're building.** A static product/marketing page with a header, a hero section, a three-column feature grid, a pricing table, and a footer. The header collapses into a mobile nav drawer below the `md` breakpoint — opening it locks body scroll and traps focus, closing it (button, `Esc`, or backdrop click) restores both. The page uses the shadcn primitives, the `cn()` helper, design tokens through `@theme`, and a working theme toggle that survives reload without FOUC. The accessibility baseline (keyboard navigation, focus rings, color contrast, semantic landmarks, heading hierarchy) is non-negotiable and verified.

**Concepts demonstrated.** Tailwind v4 with `@theme`, `cn()` + CVA composition, dark mode through `dark:` and `next-themes`, layout (flex + grid), responsive design with breakpoint utilities, shadcn primitives and the slot/asChild pattern, the a11y baseline. The mobile drawer exercises `useState`, `useEffect` (body-scroll lock cleanup), `useRef` (focus management), and one custom hook (`useLockBodyScroll`). Architectural Principle #4 (name things for intent) at design-token naming.

**Done when.** The page renders identically on first paint regardless of system theme, passes a Lighthouse a11y pass at 100, keyboard tab order traverses the page top-to-bottom hitting only visible interactive elements, the layout reflows correctly at 360 / 768 / 1280 px widths, and the mobile drawer (below `md`) traps focus, locks scroll, and closes on `Esc`.

**Scaffold spec.** *Pre-built starter:* the Next.js app, Tailwind v4 config with `@theme`, shadcn registry initialized, `next-themes` wired into the root layout, the `cn()` helper. *Pre-built UI surface:* a page shell (`app/(marketing)/page.tsx`) with section placeholders and TODO comments. *Student fills in:* the hero copy, feature cards with CVA variants, the pricing table, theme-aware images, the theme toggle, the mobile nav drawer with the `useLockBodyScroll` custom hook and focus trap. *Fixtures:* copy and pricing data in a typed `data.ts` module. *Verify behavior:* Lighthouse a11y pass, no-FOUC reload, keyboard-only navigation through every interactive element, layout integrity at 360 / 768 / 1280 widths, drawer focus trap and scroll lock.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — the UI layer is now sufficient to ship a real page.

**Estimated time.** 2.5–3h.

**Chapter 4.12 — Project: themed product surface.**

- 4.12.1 Project brief
- 4.12.2 Starter walkthrough — what the scaffold ships, what's stubbed
- 4.12.3 Build it — header, hero, and the feature grid with CVA variants
- 4.12.4 Build it — pricing table, footer, and the theme toggle without FOUC
- 4.12.5 Build it — mobile nav drawer with the `useLockBodyScroll` custom hook and focus trap
- 4.12.6 Verify — Lighthouse a11y, keyboard-only nav, no-FOUC reload, responsive reflow at 360/768/1280, drawer scroll lock + focus trap + `Esc` close

---

### Unit 5 — List-plus-detail with parallel routes

**What you're building.** The canonical list-plus-detail SaaS surface — invoices, list on the left, selected invoice's detail on the right — implemented with parallel routes (`@list` and `@detail`) and an intercepting-route modal for "new invoice" that has a real URL, refreshes properly, and survives a `Cmd+click`. The list reads a `?status=` filter from `searchParams` server-side so the URL captures the view. Both slots stream independently under their own Suspense boundaries. The page works without JavaScript.

**Concepts demonstrated.** Parallel routes with `default.tsx` fallbacks, intercepting routes paired with non-intercepting `page.tsx`, layouts vs. pages, Server Components with async data, server-side `searchParams` reads for a status filter, Suspense + `loading.tsx` at the segment, the RSC prop-serialization boundary. Architectural Principle #6 (explicit over magic) at `"use client"`.

**Done when.** Direct visit to `/invoices/new` renders the full page; soft navigation to it shows the modal; refresh on the modal still shows the modal; both slots show their own skeleton while loading; `?status=paid` filters the list server-side and survives a hard reload and a `Cmd+click`.

**Scaffold spec.** *Pre-built starter:* the App Router scaffold, an in-memory `invoices` fixture with 30 records (Drizzle/Postgres land in Unit 6), typed `getInvoices(filters)`/`getInvoice(id)` server functions where `getInvoices` accepts a status filter. *Pre-built UI surface:* empty `@list/default.tsx`, `@detail/default.tsx`, and `layout.tsx` with two slots. *Student fills in:* the slot pages (the list page reads `searchParams.status` for the filter), the intercepting `(.)new/page.tsx` modal route and paired `new/page.tsx`, the Suspense boundaries with slot-specific skeletons. *Fixtures:* the in-memory invoice records, an artificial 600 ms delay on `getInvoice` to make streaming visible. *Verify behavior:* direct visit, soft navigation, refresh, `Cmd+click` all behave per spec; both slots show skeletons independently; `?status=paid` filters server-side and survives reload.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — App Router primitives only come alive in a surface that uses them together.

**Estimated time.** 2–3h.

**Chapter 5.7 — Project: list-plus-detail with parallel routes.**

- 5.7.1 Project brief
- 5.7.2 Starter walkthrough — App Router scaffold, in-memory invoice fixture, typed server functions
- 5.7.3 Build it — the two parallel slots with `default.tsx` fallbacks and the server-side `?status=` filter from `searchParams`
- 5.7.4 Build it — the intercepting modal route and its paired non-intercepting `page.tsx`
- 5.7.5 Build it — Suspense boundaries with slot-specific skeletons
- 5.7.6 Verify — direct visit, soft nav, refresh, `Cmd+click`, and `?status=paid` survives reload

---

### Unit 6 — Org-scoped relational schema

**What you're building.** The Drizzle schema for an org-scoped invoicing domain — `organizations`, `users` (Better Auth tables stubbed), `org_members`, `invoices`, `invoice_lines`, `customers` — with the right primary keys, foreign keys with sensible `ON DELETE`, unique constraints, indexes for the queries you'll write, and a seed script that fills a realistic test dataset. You'll also write the canonical reads: list invoices for an org with cursor pagination and a status filter, and load one invoice with its lines and customer in a single round trip.

**Concepts demonstrated.** Architectural Principle #2 (the schema is the source of truth) anchors the project. Postgres types (`uuid`, `numeric`, `timestamptz`, `jsonb`), surrogate vs. natural keys, junction tables, the relational query API, joins, cursor pagination, `$inferSelect`/`$inferInsert`, Drizzle Kit migrations + seed workflow.

**Done when.** `drizzle-kit migrate` runs cleanly on an empty database, the seed script populates two orgs with overlapping members and 50+ invoices each, and the inspector page can paginate one org's invoices and load one invoice with all relations in a single query.

**Scaffold spec.** *Pre-built starter:* the Next.js + Drizzle wiring, an empty `db/schema.ts`, the Drizzle Kit config, a Docker Postgres compose file. *Pre-built inspector UI:* a server-rendered page with a button to run the seed and a paginated list that calls the student's query helpers. *Student fills in:* the schema, the migration, the seed script, the two query helpers. *Fixtures:* the seed data. *Verify behavior:* inspector page shows correct relational data; running the seed twice doesn't duplicate rows.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — schema design only earns its weight running against real Postgres.

**Estimated time.** 2–3h.

**Chapter 6.6 — Project: org-scoped schema and queries.**

- 6.6.1 Project brief
- 6.6.2 Starter walkthrough — empty `db/schema.ts`, Drizzle Kit config, Docker Postgres
- 6.6.3 Build it — the schema and the generated migration
- 6.6.4 Build it — the seed script with two orgs and 50+ invoices each
- 6.6.5 Build it — paginated list query and the single-round-trip detail query
- 6.6.6 Verify — inspector page, idempotent seed, `EXPLAIN ANALYZE` on the detail query

---

### Unit 7 — CRUD via Server Actions + Zod

**What you're building.** A working CRUD surface for invoices — create, edit, delete — using `<form action={serverAction}>` as the default pattern, `useActionState` for pending state and result, and Zod parsing at the action boundary. The create action uses `useOptimistic` so the new row appears immediately and rolls back if the server returns a failure. Every action returns the canonical Result shape; the form renders inline field errors from the result, not from client-side state. The delete action is wrapped in a Drizzle transaction.

**Concepts demonstrated.** SaaS pattern #6 (canonical Server Action Result shape). Architectural Principle #3 (pure `/lib`, side effects at named boundaries) — Zod schemas in `/lib`, Server Actions as the seam. Principle #6 at `"use server"`. Zod 4 (`z.strictObject`, top-level format APIs, `z.infer`), `FormData` contract, `useActionState`/`useFormStatus`, progressive enhancement, drizzle-zod's `createInsertSchema`. Idempotency-keys foreshadowed. Route handlers (Chapter 7.5) are deferred to the Unit 12 webhook and Unit 16a comments thread, where they earn their weight against an external caller or a client polling loop.

**Done when.** The form submits without JavaScript, field errors display on validation failure, the optimistic UI rolls back on action failure, and the delete confirmation submits through a form action — not a `fetch` call.

**Scaffold spec.** *Pre-built starter:* the schema and queries from the Unit 6 project, `<Form>` primitives from shadcn. *Pre-built UI surface:* the page shell with the Unit 6 list view and a "new invoice" button. *Student fills in:* the Zod schemas, the three Server Actions, the form components, the result-driven error rendering. *Fixtures:* seeded invoices. *Verify behavior:* disable JavaScript in DevTools and confirm create/edit/delete still work; submit invalid data and confirm inline field errors render.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — forms and actions only resolve into one seam in a real mutation flow.

**Estimated time.** 2–3h.

**Chapter 7.6 — Project: CRUD via Server Actions.**

- 7.6.1 Project brief
- 7.6.2 Starter walkthrough — Unit 6 schema, shadcn `<Form>` primitives, page shell
- 7.6.3 Build it — Zod schemas and the three Server Actions returning the canonical Result
- 7.6.4 Build it — form components with `useActionState` and inline field errors driven by the Result
- 7.6.5 Build it — `useOptimistic` on create with rollback on action failure
- 7.6.6 Build it — the delete confirmation wrapped in a Drizzle transaction
- 7.6.7 Verify — JS-disabled flow, invalid-data field errors, optimistic rollback on failure

---

### Unit 8 — Transactional email send

**What you're building.** Wire Resend on a verified domain — DKIM/SPF/DMARC set up, the API key in env, a `lib/email.ts` adapter that takes a React Email template and recipient — and trigger a transactional welcome email from a Server Action. The email renders correctly in Resend's preview, ships with a plain-text fallback, and never sends to a suppressed address.

**Concepts demonstrated.** Resend + verified-domain setup, DKIM/SPF/DMARC, React Email components, the `email_suppressions` read-side check (the webhook handler that writes it lands in Unit 12). Type-safe env (`@t3-oss/env-nextjs`). Architectural Principle #3 — the send is a named seam in `/lib/email.ts`. Principle #5 reminder: Resend is explicitly NOT wrapped in a custom adapter beyond the thin call site.

**Done when.** Hitting the inspector "Send welcome" button produces an email in the recipient's inbox with the React Email template rendered, headers showing DKIM=pass and SPF=pass, and a plain-text fallback.

**Scaffold spec.** *Pre-built starter:* Resend setup instructions for a verified domain (the prereq paragraph above flags that students need a cheap Namecheap-or-similar domain to complete DNS — Resend's sandbox sender is rejected for this project because deliverability is the point), an `email_suppressions` table migration, the React Email package and a starter `WelcomeEmail.tsx`. *Pre-built inspector UI:* a one-button "Send to {your email}" page that fires the student's send function and renders the send ID, success/failure, and any suppression hit. *Student fills in:* `lib/email.ts`, the env schema entries, the suppression read, and the Server Action that composes and sends the welcome email. *Fixtures:* one pre-suppressed email row to verify the suppression path. *Verify behavior:* successful send produces a real inbox arrival on the student's verified domain; the suppressed-address path returns `{ ok: false, reason: 'suppressed' }` without calling Resend.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — deliverability and composition only land in a real verified-domain send.

**Estimated time.** 1.5–2h.

**Chapter 8.3 — Project: transactional email send.**

- 8.3.1 Project brief — verified domain, the Resend setup, the suppression read
- 8.3.2 Build it — `lib/email.ts`, the env entries, and the suppression read
- 8.3.3 Build it — the Server Action that composes and sends the welcome email
- 8.3.4 Verify — real-inbox arrival on the student's verified domain, DKIM/SPF pass, suppression path returns `{ ok: false }` without calling Resend

---

### Unit 9 — Email+password auth flow

**What you're building.** Better Auth wired with the email+password provider, the email-verification gate, and a session-revoking sign-out. Sign-up sends a verification email through the Unit 8 Resend send; the verification link confirms the email and marks the user verified; the `/dashboard` route reads the session from the layout and redirects unverified users back to a "check your email" screen.

**Concepts demonstrated.** Better Auth Drizzle adapter and the tables it owns, server-stored sessions, session reads in middleware/layout/action, the email-verification token flow, `proxy.ts` auth gating, the rate-limited sign-in surface (Upstash wiring later). Cookie security defaults (`Secure`, `HttpOnly`, `SameSite`).

**Done when.** A new account can be created, the verification email arrives and the link verifies the user, a protected route redirects to sign-in when signed out, and signing out invalidates the session row in the database.

**Scaffold spec.** *Pre-built starter:* the Better Auth instance config skeleton, Drizzle migrations for Better Auth's tables, the Unit 8 email-sending function. *Pre-built UI surface:* sign-up, sign-in, "check your email", and `/dashboard` page shells with form layouts and field names matching what `auth.api.signUpEmail`/`signInEmail` expect. *Student fills in:* the auth instance configuration, the email-verification template + the send call, the `proxy.ts` matcher and session check, the sign-out action, the `/dashboard` layout's session read. *Fixtures:* none beyond the seed user. *Verify behavior:* full sign-up → verify → sign-in → protected route → sign-out cycle works end-to-end; protected route refuses an unverified user; sign-out deletes the session row.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — auth only proves itself in a working end-to-end flow.

**Estimated time.** 2.5–3h.

**Chapter 9.5 — Project: email+password auth with verification.**

- 9.5.1 Project brief
- 9.5.2 Starter walkthrough — Better Auth instance skeleton, migrations, Unit 8 send
- 9.5.3 Build it — Better Auth instance config and first sign-up working (unverified)
- 9.5.4 Build it — email-verification template, send through Unit 8, and the token-handling callback
- 9.5.5 Build it — `proxy.ts` matcher, session reads in the layout, and the sign-out action
- 9.5.6 Verify — sign-up → verify → sign-in → protected route → sign-out cycle

---

### Unit 10 — Org, RBAC, and the invitation handshake

**What you're building.** Add organizations to the auth schema, an active-org slot in the session, role-based access via the `authedAction(role, schema, fn)` wrapper, and the invitation handshake — invite by email, signed accept link with expiry, idempotent re-invite, accept-with-existing-account flow. Every role change writes an `audit_logs` row. A tenant-aware query helper makes missing-`organizationId` filters structurally hard.

**Concepts demonstrated.** SaaS pattern #1 (tenant-aware query helper), #2 (`authedAction` wrapper) — the named carve-out to Principle #5. SaaS pattern #3 (invitations). Architectural Principle #3 reinforced. `audit_logs` table append-only discipline. RLS is named but not the default — application-layer scope is the year-1 choice.

**Done when.** Two seeded users belong to the same org with different roles; an `authedAction` with `requireRole('admin')` rejects the member with a typed error and accepts the admin; an invite email arrives and accepting it adds the new member with the right role; an audit-log entry is written for every role change.

**Scaffold spec.** *Pre-built starter:* the Better Auth setup from Unit 9, the Unit 8 send-email function, the existing schema. *Pre-built inspector UI:* a dashboard page with sections — members list, "invite member" form, role-change buttons, and an audit-log panel that streams from the table. The inspector deliberately renders the role-change button for every role (no client-side hide) so the student can verify the server-side refusal — defense-in-depth, not a missed UX hide. *Student fills in:* the `organizations`/`org_members`/`invitations`/`audit_logs` schema, the `authedAction` wrapper, the `tenantDb(orgId)` helper, the invite send + accept actions. *Fixtures:* two seeded orgs, four seeded users distributed across them. *Verify behavior:* the inspector member list filters by active org; clicking the role-change button as a member returns a typed refusal (button is intentionally visible to all roles); accepting an invite from another email session adds the member; the audit panel updates after each privileged action.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — tenancy, RBAC, and invitations only resolve into one seam together.

**Estimated time.** 3–3.5h.

**Chapter 10.4 — Project: org, RBAC, and invitations.**

- 10.4.1 Project brief
- 10.4.2 Starter walkthrough — Unit 9 auth, Unit 8 send, the existing schema
- 10.4.3 Build it — `organizations` + `org_members` schema and migration
- 10.4.4 Build it — `invitations` + `audit_logs` schema and migration
- 10.4.5 Build it — the `authedAction(role, schema, fn)` wrapper and the `tenantDb(orgId)` helper
- 10.4.6 Build it — the invite send and accept actions, with audit-log writes
- 10.4.7 Verify — role refusal, invite accept across email sessions, audit panel updates

---

### Unit 11 — URL-state list with soft delete and concurrency

**What you're building.** Take the Unit 7 invoices CRUD surface and turn it into a real list view — URL-driven filter, sort, and cursor pagination — with soft delete (and an Archive button as a distinct state) plus optimistic concurrency control on edits. A stale write returns HTTP 409 and surfaces inline. A base-query helper makes "I forgot the `deletedAt IS NULL` clause" impossible to write.

**Concepts demonstrated.** SaaS pattern #7 (URL-state list views), #9 (soft delete + archive), plus the concurrency control that pairs with both. Architectural Principle #3 — the base-query helper is the seam. Cursor encoding from Chapter 6.3. `searchParams` server-side reads, `useSearchParams` client-side reads, the navigation hooks. Optimistic concurrency control with a `version` column.

**Done when.** Filter + sort + page changes update the URL; refresh and share both reproduce the view; deleting an invoice removes it from the default list but it appears under "show deleted"; editing a row from two tabs makes the second submit return 409 with an inline message.

**Scaffold spec.** *Pre-built starter:* the Unit 7 CRUD surface, the schema with `deletedAt` and `version` columns already added in a migration. *Pre-built UI surface:* the page shell with filter/sort controls wired only to local state and TODO markers. *Student fills in:* lifting filter/sort/cursor to `searchParams`, the base-query helper, the soft-delete and restore actions, the version precondition on update + the 409 handling. *Fixtures:* 60+ seeded invoices with a mix of statuses and one already-soft-deleted row. *Verify behavior:* share the URL with a colleague (or another browser) and it shows the same filtered view; open the same invoice in two tabs, save from the first, then save from the second — the second receives 409.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — list views are the bread-and-butter SaaS surface.

**Estimated time.** 2–3h.

**Chapter 11.3 — Project: URL-state list with soft delete and concurrency.**

- 11.3.1 Project brief
- 11.3.2 Starter walkthrough — Unit 7 CRUD surface, `deletedAt` + `version` already in schema
- 11.3.3 Build it — lift filter, sort, and cursor to `searchParams`
- 11.3.4 Build it — the base-query helper, soft-delete action, restore action
- 11.3.5 Build it — the `version` precondition on update and the 409 surface
- 11.3.6 Verify — share-and-refresh URL, soft-deleted visibility toggle, two-tab 409 race

---

### Unit 12 — Stripe webhook to plan entitlements

**What you're building.** The Stripe webhook handler ingesting `checkout.session.completed`, `customer.subscription.updated`, and `customer.subscription.deleted` — signature-verified with constant-time comparison, deduped via `processed_events`, wrapped in one outer transaction — and a derived `plan_entitlements` row the app reads from. The Stripe customer portal opens from a server action wired to a button on the inspector. The flow is exercised end-to-end with `stripe listen` against a local dev URL.

**Concepts demonstrated.** SaaS pattern #5 (webhook ingestion), #4 (Stripe billing + plan entitlements). Web Crypto HMAC closes from Chapter 3.7. Idempotency consolidation pattern. The thin internal billing interface (`billing.upgrade`, `billing.openPortal`, `billing.requirePlan`) — the second named carve-out to Principle #5. Principle #3 again at the route-handler boundary.

**Done when.** `stripe listen` forwards a test checkout completion to the dev server; the inspector panel shows the event landed once even when Stripe retries; the derived `plan_entitlements` row reflects the new plan; replaying the same event ID does not produce a second `audit_logs` row or a duplicate state change; clicking the portal button opens the Stripe customer portal in a new tab.

**Scaffold spec.** *Pre-built starter:* Stripe test-mode setup, Stripe CLI install instructions, a `pnpm seed:stripe` script that creates three test-mode products + prices in the student's Stripe test account and writes the resulting IDs into the project (test product IDs are per-account, so the seed can't ship hardcoded), and a stub `route.ts` for `app/api/webhooks/stripe/route.ts`. *Pre-built inspector UI:* a page showing the current `plan_entitlements`, a "checkout" button that opens a Stripe Checkout session, a "portal" button stub, and a live `processed_events` panel that streams as events land. *Student fills in:* the signature verification, the event handlers, the outer transaction, the plan-entitlement derivation, the `billing.*` interface in `/lib/billing.ts`, and the portal-button wiring that calls `billing.openPortal`. *Fixtures:* the three test-mode products created by the seed script, mapped to plans. *Verify behavior:* `stripe listen` + `stripe trigger checkout.session.completed` produces an entitlement update; running the same event twice shows it in `processed_events` but doesn't mutate twice; the portal button opens the Stripe customer portal; signature tampering returns 400.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — webhooks and billing only converge in a real Stripe-test-mode flow.

**Estimated time.** 3–3.5h.

**Chapter 12.3 — Project: Stripe webhook to plan entitlements.**

- 12.3.1 Project brief
- 12.3.2 Starter walkthrough — Stripe test mode, the CLI, `pnpm seed:stripe` for products, route handler stub
- 12.3.3 Build it — signature verification with constant-time compare
- 12.3.4 Build it — the outer transaction and `processed_events` dedup
- 12.3.5 Build it — the three event handlers and the derived `plan_entitlements` row
- 12.3.6 Build it — the `billing.upgrade` / `openPortal` / `requirePlan` interface and the inspector portal button
- 12.3.7 Verify — `stripe trigger` lands once, replay doesn't mutate twice, portal opens, signature tampering returns 400

---

### Unit 13 (a) — Trigger.dev durable export job

**What you're building.** A multi-step durable job that exports an organization's invoices to CSV, uploads it somewhere (just `console.log` the URL for now — R2 comes in 13b), and sends an email when done using the pre-built `ExportReadyEmail.tsx` template. The task uses `schemaTask` with a Zod payload, splits the export into pages with `wait.for` between pages so the run survives a worker restart, declares `idempotencyKey` per page, and uses a code-defined queue with per-org concurrency 1.

**Concepts demonstrated.** Trigger.dev v4 — `schemaTask`, runs, code-defined queues, concurrency limits, waitpoints, the durable-execution model with retries + backoff, `idempotencyKey` at every trigger. The threshold that fires the unit (durability past Vercel Cron). Architectural Principle #3 at the job boundary.

**Done when.** Firing the inspector "Export invoices" button kicks off a run that visibly progresses across pages in the Trigger.dev dashboard; killing the local dev worker mid-run (Ctrl-C on `npx trigger.dev@latest dev`) resumes after restart; firing the same export twice for the same org enqueues the second behind the first.

**Scaffold spec.** *Pre-built starter:* the Trigger.dev v4 project skeleton with the cloud project linked, the API key in env, an empty `tasks/exportInvoices.ts`, and a pre-built `ExportReadyEmail.tsx` React Email template the final step renders. The kill/resume verification uses the local dev CLI (`npx trigger.dev@latest dev`) since the cloud worker can't be killed by hand. *Pre-built inspector UI:* a button per seeded org that fires the task and a status panel polling the run via the Trigger.dev API, plus a link to the dashboard run page. *Student fills in:* the task — payload schema, pagination with `wait.for`, the idempotency keys, the queue declaration, the final "send email" step that renders `ExportReadyEmail` and calls the Unit 8 send. *Fixtures:* three seeded orgs with 200+ invoices each. *Verify behavior:* run progresses through pages; mid-run local-worker kill resumes; two parallel triggers per org are serialized by the queue.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — durability only proves itself by surviving a real failure scenario.

**Estimated time.** 2.5–3h.

**Chapter 13.2 — Project: Trigger.dev durable export job.**

- 13.2.1 Project brief
- 13.2.2 Starter walkthrough — Trigger.dev v4 project, the cloud link, the local dev CLI for the kill/resume verification, the empty task file, the pre-built `ExportReadyEmail.tsx` template
- 13.2.3 Build it — the `schemaTask` with payload schema and the code-defined queue declaration
- 13.2.4 Build it — paginate the export with `wait.for` between pages and idempotency keys per page
- 13.2.5 Build it — the final send-email step rendering `ExportReadyEmail` and calling the Unit 8 send
- 13.2.6 Verify — visible run progress, mid-run local-worker kill resumes, parallel triggers per org serialize

---

### Unit 13 (b) — Presigned R2 upload

**What you're building.** A direct-browser-to-R2 upload — the server action issues a presigned PUT URL, the client uploads the file directly to R2 without the bytes touching your function, and the server then writes a `file_metadata` row with the object key, content type, size, and `uploadedBy`. The Unit 13a export job is updated to push the CSV to R2 and email the presigned download link instead of `console.log`-ing it.

**Concepts demonstrated.** R2 + the S3-compatible API, presigned URLs for direct uploads, the `file_metadata` table pattern, the Blob/File/`URL.createObjectURL` primitives from Chapter 3.7. Architectural Principle #3 — the upload-issue endpoint is the seam. Principle #5 reminder — R2 SDK is not wrapped beyond the call site.

**Done when.** A 5 MB file uploaded through the page lands in the R2 bucket and a `file_metadata` row is written referencing it; a `Files` list page renders image rows by setting `<img src>` to a fresh presigned GET URL at small CSS size (no server-side resize) and other rows by filename, each with a working download link resolved through a fresh presigned GET URL.

**Scaffold spec.** *Pre-built starter:* R2 bucket setup instructions, the credentials env schema entries, the S3-compatible SDK install. *Pre-built UI surface:* an upload page shell with `<input type="file">` and a progress bar wired to local state but missing the actual upload call. *Student fills in:* the `presignedPut` server action, the client-side upload code, the `file_metadata` migration, the metadata-save action, the `Files` page that lists rows with presigned GET URLs, and the wire-back to the Unit 13a export job so the CSV goes to R2 and the email carries the presigned link. *Fixtures:* none; first run uploads create them. *Verify behavior:* file appears in R2; the `file_metadata` row matches the object; the download link works on first refresh and again 10 minutes later (presigned URL regenerated, not cached); running the Unit 13a export job produces an email whose link downloads the CSV from R2.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — uploads only earn their weight in a real R2 send.

**Estimated time.** 2.5–3h.

**Chapter 13.4 — Project: presigned R2 upload.**

- 13.4.1 Project brief
- 13.4.2 Starter walkthrough — R2 bucket, credentials env, S3-compatible SDK, upload page shell
- 13.4.3 Build it — the `presignedPut` server action and the env entries
- 13.4.4 Build it — the client-side direct-to-R2 upload and the `file_metadata` migration + save
- 13.4.5 Build it — the `Files` list page rendering rows with fresh presigned GET URLs
- 13.4.6 Build it — wire back to the Unit 13a export job so it uploads the CSV to R2 and the email carries the presigned download link
- 13.4.7 Verify — file lands in R2, metadata matches, download works after the GET URL window, Unit 13a job emails a working R2 link

---

### Unit 14 — Notification dispatcher

**What you're building.** The centralized dispatcher — one event in, multiple channels out. Define a `notifiable_events` registry, a dispatcher function that resolves an event's channels against `user_notification_preferences`, fans out to email (via Unit 8) and the in-app inbox (a `notifications` table), and dedupes rapid duplicate events on a 60-second window keyed by `(event_type, subject_id)`. Call sites — invite sent, role changed, billing past-due — fire one event; channel-specific code lives only in the dispatcher.

**Concepts demonstrated.** SaaS pattern #10 (notifications as a centralized layer). Architectural Principle #3 — the dispatcher is the named seam. The notifiable-vs-logged-event distinction — `audit_logs` is operator-truth, `notifications` is user-facing.

**Done when.** Firing the inspector "Trigger invite-sent" button sends an email to the invitee (where prefs allow) and writes one inbox row; rapidly firing the same event five times produces one of each, not five. Disabling email in prefs prevents the email but keeps the inbox row.

**Scaffold spec.** *Pre-built starter:* the Unit 8 email send, the Unit 10 schema with `users` and `org_members`, an `invitations` row to seed test events. *Pre-built inspector UI:* three buttons (one per event type), a panel showing the user's current prefs with toggles, a live `notifications` inbox panel, and a counter showing how many emails were actually sent. *Student fills in:* the `notifiable_events` registry, the dispatcher with dedup window, the `user_notification_preferences` schema and read, the channel send functions, the call-site wiring. *Fixtures:* one seeded user with default prefs. *Verify behavior:* toggle the email pref off and re-fire — inbox grows, email-sent counter doesn't; rapid-fire produces dedup; firing an event with no preference defaults to "on".

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — the dispatcher pattern only proves itself when more than one channel is wired.

**Estimated time.** 2–2.5h.

**Chapter 14.2 — Project: notification dispatcher.**

- 14.2.1 Project brief
- 14.2.2 Starter walkthrough — Unit 8 send, Unit 10 schema, a seeded invitation row
- 14.2.3 Build it — the `notifiable_events` registry and the dispatcher with the 60-second dedup window keyed by `(event_type, subject_id)`
- 14.2.4 Build it — the email channel send, the in-app inbox writer, and the `user_notification_preferences` read
- 14.2.5 Build it — wire three call sites (invite sent, role changed, billing past-due)
- 14.2.6 Verify — pref toggle, rapid-fire dedup, default-on for missing pref

---

### Unit 15 (a) — `cacheTag` across a mutation flow

**What you're building.** Take the Unit 11 invoices list and instrument it with `use cache` + `cacheTag` keyed by `org:{orgId}:invoices`. After an invoice update, the action calls `updateTag('org:X:invoices')` so the user sees their change immediately. A second non-interactive path — a Trigger.dev daily summary job that mutates aggregates — uses `revalidateTag` (stale-while-revalidate) instead. The inspector renders the `fetchedAt` timestamp baked into each cached function's return so the student can read cache state directly: the same timestamp across requests means the read hit the cache, a new timestamp means it missed (Next.js doesn't expose hit/miss to user code, so the rendered timestamp is the proxy signal).

**Concepts demonstrated.** SaaS pattern #8 (cache decisions as architecture). Cache Components, `use cache`, `cacheLife`, `cacheTag`, the `updateTag` vs. `revalidateTag` decision tree from Chapter 5.4. Cache invalidation named at the seam, not sprinkled.

**Done when.** A first visit to the list view shows one `fetchedAt`; refresh shows the same `fetchedAt` (cache hit); editing an invoice and returning to the list shows a fresh `fetchedAt` and the new value (`updateTag` path); firing the background job leaves `fetchedAt` unchanged on the current visit but the next visit shows the new aggregate with a fresh `fetchedAt` (`revalidateTag` path).

**Scaffold spec.** *Pre-built starter:* the Unit 11 list + soft delete + concurrency surface and a stub Trigger.dev job. *Pre-built inspector UI:* a header strip on the list page showing the `fetchedAt` timestamp from each cached read, plus buttons "Edit one invoice (use updateTag)" and "Run background summary (use revalidateTag)". *Student fills in:* the `use cache` directives, the `fetchedAt: new Date().toISOString()` line inside each cached function, the cache-tag scheme, the two invalidation calls at their seams. *Fixtures:* seeded invoices from Unit 11. *Verify behavior:* the strip's `fetchedAt` values behave per spec across the four scenarios; misusing `revalidateTag` from the server action shows a stale `fetchedAt` (and stale value) on the request that submitted the change.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — cache decisions only earn their weight at a real mutation flow.

**Estimated time.** 1.5–2h.

**Chapter 15.2 — Project: cacheTag-driven invalidation.**

- 15.2.1 Project brief
- 15.2.2 Starter walkthrough — Unit 11 list, stub Trigger.dev summary job
- 15.2.3 Build it — annotate the list with `use cache`, lay down the cache-tag scheme, and emit `fetchedAt` from inside each cached function
- 15.2.4 Build it — call `updateTag` from the edit action and `revalidateTag` from the background job
- 15.2.5 Verify — `fetchedAt` stays stable across cache hits, refreshes after `updateTag`, and refreshes only on the next visit after `revalidateTag`

---

### Unit 15 (b) — Upstash rate limit on the auth endpoints

**What you're building.** Install `@upstash/ratelimit` on the sign-in, sign-up, and password-reset endpoints. Sign-in is rate-limited per-IP and per-email separately (so one attacker can't lock out a victim by attempting their email). The limiter returns proper `RateLimit-*` headers and HTTP 429 with a user-safe message; the inspector lets you hammer the endpoint and watch tokens drain.

**Concepts demonstrated.** Upstash Redis primitives, `@upstash/ratelimit` algorithms (sliding window default), per-IP vs. per-key strategies, the trigger ("the moment the project ships to a public URL, this is non-negotiable"). SaaS pattern #12 (security baseline) foreshadowed for Unit 17. Principle #3 — the limiter is a named seam.

**Done when.** Hammering sign-in with 11 requests from the same IP in a minute returns the 11th as 429; using the same email from a different IP also gets throttled separately; the response includes `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`.

**Scaffold spec.** *Pre-built starter:* the Better Auth flows from Unit 9, the Upstash Redis project. *Pre-built inspector UI:* a panel with three buttons ("Spam sign-in", "Spam sign-up", "Spam reset"), a live counter of remaining tokens per limiter, and a log of recent responses with status codes and headers. *Student fills in:* the limiter declarations, the wrapping of the three endpoints (or actions), the per-IP and per-email keys for sign-in, the 429 response shape. *Fixtures:* none. *Verify behavior:* inspector reaches 429; tokens reset after the configured window; the Upstash dashboard shows the keys.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — rate limiting only proves itself by being exercised against real Redis state.

**Estimated time.** 1.5–2h.

**Chapter 15.4 — Project: Upstash rate limit on auth endpoints.**

- 15.4.1 Project brief
- 15.4.2 Starter walkthrough — Unit 9 auth flows, the Upstash Redis project
- 15.4.3 Build it — declare the three sliding-window limiters (sign-in, sign-up, reset)
- 15.4.4 Build it — wrap sign-in with per-IP and per-email keys; wrap sign-up and reset; emit `RateLimit-*` headers
- 15.4.5 Verify — 11th request returns 429 with headers, window resets release tokens, Upstash dashboard shows the keys

---

### Unit 16 (a) — TanStack Query on an optimistic comments thread

**What you're building.** A real-time-ish comments thread under an invoice — polling at 5 s, optimistic add with rollback on failure, infinite scroll up the history. The trigger is met: frequent refetches plus optimistic UX with rollback is the threshold past Server Components. The data is fetched by an existing route handler; this project lives strictly in client components.

**Concepts demonstrated.** TanStack Query — queries, mutations, optimistic updates with `onMutate`/`onError` rollback, infinite queries, `QueryClientProvider` + `HydrationBoundary` for SSR-hydrated initial data, the threshold criterion. Why this earns its weight past the platform default.

**Done when.** New comments from another browser session appear within the poll window; submitting a comment shows immediately and rolls back if the server returns an error; scrolling up loads older pages without re-fetching the already-loaded head.

**Scaffold spec.** *Pre-built starter:* the Unit 11 invoices surface and route handlers `GET /api/invoices/:id/comments?cursor=…` plus `POST /api/invoices/:id/comments`, both real and hitting Postgres. *Pre-built UI surface:* the comment-thread component shell with input box and message list wired to local state and TODO markers. *Student fills in:* the `QueryClient` provider in the layout, the `useInfiniteQuery` for the thread, the `useMutation` with optimistic + rollback, the hydration boundary. *Fixtures:* 50+ seeded comments per invoice. *Verify behavior:* the optimistic add shows immediately; a forced server 500 (toggle in inspector) rolls back; opening two browser windows shows the new comment within 5 s.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — TanStack Query only earns its weight in the screen that meets its trigger.

**Estimated time.** 2–2.5h.

**Chapter 16.2 — Project: TanStack Query on optimistic comments.**

- 16.2.1 Project brief
- 16.2.2 Starter walkthrough — Unit 11 invoices, the comments route handlers, seeded comments
- 16.2.3 Build it — `QueryClientProvider` + `HydrationBoundary` for SSR-hydrated initial data
- 16.2.4 Build it — `useInfiniteQuery` for the thread with cursor paging and the polling interval
- 16.2.5 Build it — `useMutation` with optimistic add and rollback on `onError`
- 16.2.6 Verify — cross-session arrival within the poll window, optimistic visibility, forced 500 rollback

---

### Unit 16 (b) — Zustand for a multi-step wizard

**What you're building.** A four-step "new customer" wizard — step 1 contact, step 2 billing, step 3 preferences, step 4 review — with state in a Zustand store that survives back/forward navigation across four routes. The final step calls a Server Action that takes the full payload and creates the customer. The trigger is met: shared state across deeply nested components across more than one route.

**Concepts demonstrated.** Zustand — store creation, slices, selector usage, store reset on submit-success. The trigger threshold past `useState` + URL state. Architectural Principle #6 — the store is named and per-feature, not global ambient state. Why URL state isn't the right tool here (sensitive billing data shouldn't sit in the URL).

**Done when.** Filling step 1, navigating to step 2, then hitting back returns to step 1 with the filled data intact; submit on step 4 fires the action with the full payload; after a successful submit, navigating back to step 1 shows the wizard reset.

**Scaffold spec.** *Pre-built starter:* the four route segments, Zod schemas per step. *Pre-built UI surface:* each step's page shell with form fields wired to local state and TODO markers, plus a Next/Back navigation strip. *Student fills in:* the Zustand store with per-step slices, the form-to-store wiring, the validation gate that blocks Next until the current step is valid, the submit action, the reset. *Fixtures:* none. *Verify behavior:* refresh in the middle of step 3 loses state (the senior call — confirms why URL state would persist but doesn't fit here); back/forward through the wizard keeps state; double-submit on step 4 doesn't fire the action twice.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — Zustand only earns its weight in the case that meets its trigger.

**Estimated time.** 2–2.5h.

**Chapter 16.4 — Project: Zustand for a multi-step wizard.**

- 16.4.1 Project brief
- 16.4.2 Starter walkthrough — four route segments, per-step Zod schemas
- 16.4.3 Build it — the Zustand store with per-step slices and a typed selector surface
- 16.4.4 Build it — wire each step's form to the store and the Next-gate validation
- 16.4.5 Build it — the final submit action, the success-reset, and back/forward navigation
- 16.4.6 Verify — back/forward preserves, refresh loses (the senior call), no double-submit on step 4

---

### Unit 17 — Error + security baseline audit

**What you're building.** Walk a seeded SaaS codebase (a fork of the running course project with planted issues) against the error discipline and the security baseline. Produce an audit report — one finding per row — that names the rule, the location, the consequence, and the fix. The audit covers fail-closed checks in `authedAction`, the user-vs-operator message split, security headers in `next.config.ts`, rate limits on the abusable endpoints, audit-log writes on privileged actions, GDPR deletion, the cookie consent gate, secrets in client bundles, and `pnpm audit`.

**Concepts demonstrated.** SaaS pattern #12 (security baseline). The error commitments from 17.1 — fail-closed, user/operator split. Many prior patterns revisited through the audit lens.

**Done when.** The audit report surfaces all eight seeded findings with rule, location, consequence, and proposed fix; missing findings are quantified at the bottom. The answer key is published only after the student commits their report, so the audit is self-graded against a fixed ground truth.

**Scaffold spec.** *Pre-built starter:* the audit target repo, a `findings/template.md` with the rule-location-consequence-fix structure, a checklist of audit categories. *Pre-built inspector UI:* none beyond the running app to navigate. *Audit target:* eight seeded issues — an `authedAction` that silently allows on thrown error (fail-closed violation), a `dangerouslySetInnerHTML` in a user-content render, an audit-log write missing on role-transfer, a CSP header omission, a public env var leaking a server secret, a missing rate limit on password-reset, an outdated dep with a known CVE, a GDPR delete that leaves rows behind. *Fixtures:* the seeded findings list, published as the answer key after submission. *Verify behavior:* the student's findings document is compared to the published answer key and overlap is the score; partial credit is awarded for naming the rule and location even when the proposed fix differs.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — the audit pass only proves itself when walked against a seeded target.

**Estimated time.** 2.5–3h.

**Chapter 17.3 — Project: error and security baseline audit.**

- 17.3.1 Audit brief — the eight categories, the rule-location-consequence-fix template
- 17.3.2 Audit target walkthrough — the seeded codebase, the running app, one modeled finding end-to-end
- 17.3.3 Audit it — error discipline pass (fail-closed checks, user/operator message split, `dangerouslySetInnerHTML`)
- 17.3.4 Audit it — security baseline pass (headers, rate limits, audit-log gaps, secrets, GDPR posture, dep hygiene)
- 17.3.5 Verify — match findings against the published answer key, quantify any misses

---

### Unit 18 — Localized, tz-aware list view

**What you're building.** Take the Unit 11 invoices list and localize it for `en-US`, `en-GB`, and `fr-FR` with `next-intl` — translated UI strings via ICU MessageFormat for pluralized counts, currency-aware `Intl.NumberFormat` per locale, dates rendered with Temporal + Intl in the viewer's profile timezone (not the request's). The locale comes from the user's profile first, `Accept-Language` second. `hreflang` tags ship in the metadata.

**Concepts demonstrated.** SaaS pattern #13 (time/dates/timezones), #14 (i18n). `next-intl` (the 2026 library), `Intl.*` APIs, ICU plurals, locale negotiation order, Temporal arithmetic for "due in N days", `hreflang` and per-locale sitemap entries. Profile-stored timezone over derived-per-request as the senior call.

**Done when.** Switching the user's profile language to `fr-FR` re-renders the list with French strings, comma decimal separator, and `EUR` currency; due dates straddling the European DST boundary render with the correct zone abbreviation (`BST` in summer, `GMT` in winter) and the corresponding wall-clock hour; the rendered HTML emits `<link rel="alternate" hreflang="…">` for all three locales.

**Scaffold spec.** *Pre-built starter:* the Unit 11 list view, the user profile with `locale` and `timezone` columns added in a migration, `next-intl` installed. *Pre-built UI surface:* the list page exists and works in English only; a language switcher dropdown wired to local state with a TODO. *Student fills in:* the `next-intl` config, message catalogs for three locales (with ICU plurals on the "N items" counter), the date rendering through Temporal in profile tz, the metadata `alternates.languages`, the locale negotiation in the layout. *Fixtures:* three locale message files seeded with English; student fills French and British variants. *Verify behavior:* switch profile locale and refresh; switch profile timezone to `Europe/London` and confirm an invoice timestamped `2026-07-01T18:00:00Z` renders as `7:00 PM BST` while one timestamped `2026-01-01T18:00:00Z` renders as `6:00 PM GMT` (same UTC offset, different wall-clock display because the user's tz observes DST in summer but not in winter); inspect the page source for `hreflang` tags.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — time and i18n only converge in one localized, tz-aware surface.

**Estimated time.** 2.5–3h.

**Chapter 18.3 — Project: localized, tz-aware list view.**

- 18.3.1 Project brief
- 18.3.2 Starter walkthrough — Unit 11 list, profile `locale` + `timezone` columns, `next-intl` installed
- 18.3.3 Build it — `next-intl` config, locale negotiation in the layout, and three message catalogs with ICU plurals
- 18.3.4 Build it — date rendering with Temporal in profile tz and currency via `Intl.NumberFormat`
- 18.3.5 Build it — `alternates.languages` metadata and per-locale sitemap entries
- 18.3.6 Verify — locale switch reflow, DST-spanning render, `hreflang` tags in source

---

### Unit 19 — Server Action integration + E2E tests

**What you're building.** Integration tests for the Unit 12 Stripe checkout-completed flow against a real test Postgres (not mocked). The suite uses transaction-rollback per test, shared auth fixtures, MSW at the network boundary for outgoing email (Resend) calls, and asserts the typed Result return shape, the database state, and the audit-log write. One Playwright test covers the full money-path checkout flow end-to-end against Stripe test mode.

**Concepts demonstrated.** Vitest setup, the honeycomb shape, integration tests against real Postgres with transaction rollback, shared auth fixtures, MSW for the network boundary, the unhappy-path assertions, Playwright on a money path. Behavior-over-implementation as the rule. Principle #7 reinforced — the typed Result is part of what's asserted. Unit tests for `/lib` (Chapter 19.2) are exercised in chapter material rather than this project — the project budgets time for the integration + E2E layers, which only earn their weight against real code and a real money path.

**Done when.** `pnpm test` runs the integration suite green; `pnpm test:e2e` runs the Playwright suite green; the integration tests pass against a clean DB and again on a second run without any "leftover state" issues.

**Scaffold spec.** *Pre-built starter:* the Unit 12 surface, the Vitest config with a separate `vitest.integration.config.ts`, the Playwright config with one auth fixture worker, the MSW handlers stubbed for Resend, the test-DB lifecycle scripts. *Pre-built UI surface:* N/A (this project ships tests, not UI). *Student fills in:* three integration tests (happy path entitlement update, duplicate-event idempotency, signature-tampered rejection) and one Playwright test (sign-in → upgrade → Stripe test-card → land on dashboard with new plan). *Fixtures:* seeded auth fixtures factory; pre-stubbed Resend handler that records calls; Stripe test-card numbers from Stripe docs. *Verify behavior:* flip the webhook handler to skip the idempotency check and watch the duplicate-event test fail; mutate the email send to throw and confirm the test isolates the failure to the boundary.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — tests only earn their weight by being written against real code and a real money path.

**Estimated time.** 2.5–3h.

**Chapter 19.6 — Project: integration + E2E tests for the Stripe checkout flow.**

- 19.6.1 Project brief
- 19.6.2 Starter walkthrough — Vitest config, MSW handlers, auth fixture factory, test-DB lifecycle
- 19.6.3 Build it — happy-path integration test against real test Postgres with transaction rollback
- 19.6.4 Build it — duplicate-event idempotency test and signature-tampered rejection test
- 19.6.5 Build it — Playwright money-path test (sign-in → Stripe Checkout test card → plan updated)
- 19.6.6 Verify — suite green twice in a row; deliberate handler mutations fail the expected tests only

---

### Unit 20 — Observability + performance audit

**What you're building.** Audit a seeded SaaS for observability and performance issues, using the same audit-target fork as Unit 17 (now layered with observability and performance issues; Unit 17's findings are pre-fixed in this branch so the student starts from a clean error/security baseline). Walk the eight seeded findings: Sentry not wired (no source maps, no release tag, no breadcrumbs), a structured log dumping a secret, missing correlation IDs on requests, a Server Component awaiting sequential queries (RSC waterfall), a route importing the whole `lucide-react` barrel, a missing `priority` on the LCP image, an N+1 in the Drizzle relational query, and a missing consent gate around the existing PostHog wiring. Produce a findings report with the fix sketch and `@next/bundle-analyzer` before/after screenshots.

**Concepts demonstrated.** SaaS pattern #15 (performance vigilance). Sentry + source maps + breadcrumbs + release tagging, PostHog wiring gated by consent (which also exercises the Unit 17 consent-gate finding), structured logs with correlation IDs, the 3am-rule with PII exclusion, Core Web Vitals (LCP/INP/CLS), `@next/bundle-analyzer`, RSC waterfalls and the `Promise.all` rewrite, N+1 at the Drizzle layer.

**Done when.** Sentry catches a deliberately thrown error from the audit target with the correct release tag and breadcrumbs; PostHog records a captured event only after consent is granted; the findings report lists all eight seeded issues with location, consequence, and fix; bundle-analyzer output is attached.

**Scaffold spec.** *Pre-built starter:* the same audit-target repo as Unit 17 (Unit 17's seeded findings are pre-fixed in this branch), now layered with the eight observability and performance issues; Sentry-org-ready creds; PostHog project creds with the existing wiring in place but ungated; `@next/bundle-analyzer` already in deps. *Pre-built inspector UI:* none beyond the running app. *Audit target:* eight seeded findings — Sentry not wired, log leak, missing correlation ID, RSC waterfall, barrel import, missing image priority, N+1, missing consent gate around PostHog. *Fixtures:* the seeded findings list, published as the answer key after submission. *Verify behavior:* the student's findings document covers the seeded set when scored against the answer key; bundle-analyzer screenshot shows the icon bundle shrinking before/after; Sentry dashboard shows the captured error; PostHog dashboard shows the event captured post-consent.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — observability and performance only land by being inspected on a real running app.

**Estimated time.** 2.5–3h.

**Chapter 20.4 — Project: observability and performance audit.**

- 20.4.1 Project brief — Sentry + PostHog wiring plus the seeded performance findings
- 20.4.2 Audit target walkthrough — the seeded codebase, one modeled finding
- 20.4.3 Wire it — Sentry with source maps, release tagging, and breadcrumbs
- 20.4.4 Wire it — PostHog events gated by the cookie consent gate
- 20.4.5 Audit it — performance pass (RSC waterfall, barrel import, missing `priority`, N+1, bundle analyzer)
- 20.4.6 Verify — Sentry captures a deliberate throw, PostHog records post-consent, bundle before/after attached, findings match the seeded list

---

### Unit 21 — Deploy + expand→migrate→contract

**What you're building.** Push the course project to Vercel against a Neon-branched preview, get a real production URL, then execute one expand→migrate→contract schema migration that would otherwise break a live deploy — splitting the `invoices.customer_name` text field into a foreign key to `customers.id`. Expand adds the FK column nullable; migrate backfills and dual-writes from the app; contract drops the old text column and makes the FK non-null. A rollback of the contract PR is rehearsed.

**Concepts demonstrated.** SaaS pattern #11 (schema migrations against a live app). The Vercel + Neon preview-branch deploy model, environment management, the production rollback path, the launch checklist. The three-step migration cadence applied to the migration class that actually needs it.

**Done when.** A live production URL serves the app with the new schema; the migration ran in three PRs (each green in CI, each deployed) without any moment when the app and DB schemas were incompatible; the contract PR rollback is documented and rehearsed.

**Scaffold spec.** *Pre-built starter:* the project from prior units, a Vercel account hookup script, the Neon project, a CI workflow file. *Pre-built UI surface:* none specific (the app itself). *Student fills in:* the three PRs and migrations (`drizzle-kit generate` per step), the dual-write logic during the migrate phase, the deploy verification on each preview, the contract-phase removal, a documented rollback of the contract. *Fixtures:* pre-existing `customer_name` data in the seed. *Verify behavior:* between PRs 1 and 2, production keeps working; between PRs 2 and 3, production keeps working; the contract PR can be rolled back without data loss.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — shipping cadence and live migrations only learn by being executed.

**Estimated time.** 3h (can be sliced across two sittings).

**Chapter 21.5 — Project: deploy and a live expand-migrate-contract migration.**

- 21.5.1 Project brief — the migration class that demands the cadence; the rollback expectation
- 21.5.2 First deploy — connecting the repo to Vercel, the first production URL, environment scoping
- 21.5.3 PR 1 (Expand) — add the FK column nullable, ship to preview, verify production keeps working
- 21.5.4 PR 2 (Migrate) — backfill and dual-write, ship to preview, verify production keeps working
- 21.5.5 PR 3 (Contract) — drop the old text column, make the FK non-null, ship
- 21.5.6 Rollback rehearsal — promote the previous deployment, document the steps

---

### Unit 22 — PR review + ADR

**What you're building.** Review a seeded pull request against the course's architectural principles (#1–#7) and SaaS patterns (#1–#15), leaving line-level comments that distinguish suggesting from blocking. The PR contains five seeded review-worthy issues — a missing `authedAction` wrapper, a side-effect imported into a server component, a `Date` arithmetic call, a derivable state synced with an effect, a missing audit-log write — plus one design decision worth an ADR. Author that ADR using the Michael Nygard template.

**Concepts demonstrated.** Architectural Principles #1–#7 and SaaS patterns surfaced through review. The suggesting-vs-blocking distinction. ADRs in `/docs/adr/`, the Nygard template (Context / Decision / Consequences), one decision per file, written as the decision is being made.

**Done when.** Five line-level comments on the PR, each citing the principle/pattern violated and the fix; one ADR file in `/docs/adr/` with the three Nygard sections filled, named after the decision (not "ADR-005").

**Scaffold spec.** *Pre-built starter:* a seeded PR branch + diff in the audit target repo, an `/docs/adr/` directory with an `0001-example.md` template, the course's principles + patterns cheatsheet. *Pre-built inspector UI:* none. *Audit target:* the five seeded review issues + one design decision (caching the entitlement read with `cacheTag` vs. reading from DB each request). *Fixtures:* the seeded review-issue list and the ADR rubric (held by the grader). *Verify behavior:* the student's review comments map cleanly to the seeded issues; the ADR has all three Nygard sections with a real "Decision" line, not a hedged one.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — review and ADR-writing are disciplines that only practice against a real PR.

**Estimated time.** 2–2.5h.

**Chapter 22.4 — Project: PR review and one ADR.**

- 22.4.1 Project brief — the seeded PR diff, the principles/patterns cheatsheet, the Nygard template
- 22.4.2 Audit target walkthrough — read the diff once, model one review comment end-to-end
- 22.4.3 Review it — five line-level comments on the seeded issues; distinguish suggesting from blocking
- 22.4.4 Write it — the ADR for the one decision in the diff, all three Nygard sections, named after the decision
- 22.4.5 Verify — comments map to seeded issues; ADR has a real `Decision` line, not a hedged one

---

### Unit 23 — LLM-backed invoice Q&A with tool calling

**What you're building.** An "ask the invoices" surface — a chat box on the invoices dashboard where the user types a question ("how many invoices are overdue?") and an LLM answers grounded in the org's invoice data via tool calling. The AI SDK route handler runs the chat loop, the LLM calls a `getInvoiceStats(orgId, filters)` tool the student defines with Zod, and the response streams back through `useChat`. A per-user daily token quota is enforced.

**Concepts demonstrated.** AI SDK v5 — `streamText` + tool calling with `stopWhen`, `useChat` with the `UIMessage` parts array and the `sendMessage`/`regenerate` API, Zod-typed tool definitions, the agentic loop with `stepCountIs(5)`. Token accounting + per-user quotas + abuse mitigation as the user-facing-LLM discipline. Provider abstraction. `generateObject` (structured output, Chapter 23.2) and generative UI primitives (Chapter 23.3) are exercised in chapter material rather than this project — the project focuses on the tool-calling agentic loop because that's the senior decision the unit hinges on for SaaS surfaces.

**Done when.** Typing a question about the user's own org's invoices streams a grounded answer that cites a number you can verify against the database; a question about another org's invoices returns a refusal (the tool authz check holds); a user hitting the daily quota gets a typed refusal.

**Scaffold spec.** *Pre-built starter:* the Unit 10/11 multi-tenant invoices project, the AI SDK installed, an API key for one provider. *Pre-built UI surface:* the chat-box component with `useChat` wiring stubbed and a TODO marker, plus a token-usage panel in the corner. *Student fills in:* the route handler with `streamText` + the tool definition, the `getInvoiceStats` tool with `authedAction`-equivalent org-scoping inside the tool, the daily-quota check in Postgres, the streaming UI updates from the `parts` array. *Fixtures:* seeded invoices from prior units; a pre-seeded quota row at 90/100 to make the limit easy to hit. *Verify behavior:* answers cite numbers that match Drizzle queries; a forged `orgId` in the tool args is refused; the 11th question hits the quota.

**Why this earns a project.** §8: lets the student "apply the unit's concepts in a realistic workflow" — an LLM-backed surface is the deliverable the unit is about.

**Estimated time.** 2.5–3h.

**Chapter 23.4 — Project: LLM-backed invoice Q&A with tool calling.**

- 23.4.1 Project brief
- 23.4.2 Starter walkthrough — Unit 10/11 surface, AI SDK installed, provider key
- 23.4.3 Build it — the route handler with `streamText` and the agentic loop via `stopWhen(stepCountIs(5))`
- 23.4.4 Build it — the `getInvoiceStats` tool with Zod and org-scoped authz inside the tool, plus the daily-quota check
- 23.4.5 Build it — wire `useChat` to render the `UIMessage` `parts` array and the token-usage panel
- 23.4.6 Verify — grounded answers cite real Drizzle numbers; forged `orgId` refused; 11th question hits the quota

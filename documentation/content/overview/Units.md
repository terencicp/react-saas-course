# Units at a glance

> A one-line compressed view of the [full Table of contents](../Table%20of%20contents.md). Each line names the tech, libraries, APIs, and architectural patterns introduced in that unit's teaching chapters (project chapters excluded — they apply what the teaching chapters cover).

- **Unit 1 — Setup and Toolchain**: Node 24 LTS, pnpm, mise, TypeScript strict, Biome, Next.js 16, React 19, Tailwind v4, `@t3-oss/env-nextjs`, Zod
- **Unit 2 — JavaScript and TypeScript**: TypeScript (generics, narrowing, discriminated unions, branded types), ES modules, Promises, async/await, AbortController, Temporal, JSON
- **Unit 3 — HTTP and the Browser Platform**: HTTP semantics, fetch, DOM, event handling, Server-Sent Events, Web Storage, cookies and `Set-Cookie` attributes
- **Unit 4 — React, JSX, and Tailwind**: React 19, JSX, Tailwind v4, shadcn/ui, Radix UI, class-variance-authority, OKLCH design tokens, dark mode, container queries, responsive design
- **Unit 5 — Next.js and the App Router**: App Router, Server/Client Components, Cache Components, Partial Prerendering, Suspense streaming, `proxy.ts`, `next/image`, `next/font`, `next/script`, metadata API
- **Unit 6 — Postgres and Drizzle**: Postgres on Neon, Drizzle ORM, Drizzle Relations v2, Drizzle Kit migrations, UUIDv7, indexes, transactions, `$inferSelect`/`$inferInsert`
- **Unit 7 — Forms, Validation, and Server Actions**: Zod 4, Server Actions, `useActionState`, native HTML forms, FormData, drizzle-zod, route handlers, `authedAction` wrapper, Result types
- **Unit 8 — Transactional Email**: Resend, React Email, sender identity (SPF/DKIM/DMARC), deliverability
- **Unit 9 — Authentication with Better Auth**: Better Auth, Drizzle adapter, email+password, session cookies, email verification, password reset, CSRF
- **Unit 10 — Organizations and RBAC**: Better Auth organizations plugin, RBAC, invitations, seat-handoff lifecycle, audit log, multi-tenancy
- **Unit 11 — Lists, URL State, and Soft Delete**: URL state with `searchParams` + nuqs, soft delete / archive / restore, lifecycle columns, optimistic concurrency
- **Unit 12 — Webhooks and Stripe Billing**: Stripe (Checkout, Customer Portal, subscriptions, signing), webhook ingestion pattern, `processed_events` idempotency, plan entitlements
- **Unit 13 — Background Work and Object Storage**: Vercel `after()`, Vercel Cron, Trigger.dev v4 (queues, schedules, waitpoints, idempotency keys), Cloudflare R2, presigned URLs
- **Unit 14 — Notifications**: Notification dispatcher pattern, multi-channel send (email + inbox), notification preferences, dedup window
- **Unit 15 — Cache and Rate Limiting**: Tag-driven cache invalidation (`updateTag` / `revalidateTag` / `revalidatePath`), Upstash Redis, `@upstash/ratelimit`, Vercel WAF, dual-keyed limiters
- **Unit 16 — TanStack Query and Zustand**: TanStack Query v5 (`useQuery`, `useMutation`, `useInfiniteQuery`), Zustand v5 (`createStore`, slices), optimistic updates with rollback, polling
- **Unit 17 — Errors and Security**: Fail-closed error discipline, CSP with nonces, security headers, rate-limit coverage, audit log schema, GDPR retention, consent gating, pnpm 11+ supply-chain defaults
- **Unit 18 — Time and Internationalization**: Temporal API, `timestamptz`/`date` codecs, IANA timezones, DST scheduling, `Intl.*` formatters, ICU MessageFormat, next-intl, BCP 47 locale negotiation, hreflang
- **Unit 19 — Testing**: Vitest 4, `expectTypeOf`, transaction-rollback integration tests against real Postgres, MSW v2, Playwright, React Testing Library, coverage thresholds
- **Unit 20 — Observability and Performance**: Sentry, Pino + AsyncLocalStorage, Vercel Drains, Vercel Analytics, PostHog (events, flags, replay), Core Web Vitals, `@next/bundle-analyzer`, Lighthouse CI
- **Unit 21 — Git, CI, Deployment, and Migrations**: Git (rebase, bisect, cherry-pick), GitHub Actions, branch rulesets, Dependabot, Vercel, Fluid Compute, Vercel-Neon integration, OIDC federation, expand-migrate-contract migrations
- **Unit 22 — Documentation and Code Review**: Diataxis, README discipline, AGENTS.md, ADRs (Nygard template), TSDoc, five-layer review stack, comment severity labels
- **Unit 23 — AI with the Vercel AI SDK**: Vercel AI SDK v5, AI Gateway, multi-provider model handles (Claude/OpenAI/Gemini), tool calling, `streamText` chat, RAG, per-user token quotas

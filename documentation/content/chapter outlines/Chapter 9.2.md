# Chapter 9.2 — Better Auth setup

## Chapter framing

Chapter 9.1 installed the conceptual ground — authn versus authz, session-id-in-cookie as the 2026 default, the OAuth/PKCE flow. Chapter 9.2 lands the running setup: Better Auth as the implementation, the Drizzle adapter wired to the existing Postgres backplane from Unit 6, the four canonical tables (`user`, `session`, `account`, `verification`) generated and migrated, the cookie surface configured at the senior defaults, and the session-read call shape used identically across `proxy.ts`, Server Components, Server Actions, and route handlers. The student leaves with an `auth` instance, an `authClient`, a catch-all route handler, a typed env entry, four tables in Postgres, the cookie cache enabled, and a `getCurrentUser()` helper that downstream chapters (9.3 sign-in surfaces, 9.4 request-time gating, 10.x organizations) call without re-deciding anything taught here.

The threads that run through every lesson: the schema is still the source of truth (Architectural Principle #2 from 6.2.1) — Better Auth's CLI generates Drizzle definitions that ship in the same `src/db/schema/` directory as the app's domain tables, and migrations go through the same Drizzle Kit pipeline from Chapter 6.5; the default session shape is server-stored opaque tokens in `__Host-`-prefixed cookies (9.1.2's call honored at the call site), with the cookie cache as the only performance reach this chapter takes; Better Auth's API is consumed directly per Architectural Principle #5 (use the framework's conventions, no wrapper) — the only thin module the chapter writes is `lib/auth.ts` for the server instance and `lib/auth-client.ts` for the browser; every session read returns the same `{ user, session } | null` shape regardless of where it's called, and authorization decisions never live in this chapter (they belong at the action boundary, Unit 10); environment variables follow the `lib/env.ts` Zod-validated pattern from Chapter 5.6.1, with `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` joining `DATABASE_URL` and `RESEND_API_KEY`. Four teaching lessons plus a quiz.

---

## Lesson 9.2.1 — Wiring the `auth` instance

Installs `better-auth`, defines the server `auth` instance with `nextCookies`, mounts the `[...all]` catch-all route handler, sets up the browser `authClient`, and adds the two required env entries.

Topics to cover:

- **The senior question.** Better Auth is "the library" Chapter 9.1 named once. What's the minimum surface — install, instance, route, client, env — that the rest of Unit 9 calls into, and what shape does that wiring take in a Next.js 16 App Router codebase? The lesson installs the package, defines the server `auth` instance with the `nextCookies` plugin, mounts the catch-all route handler, sets up the browser `authClient`, and validates the new env entries. No sign-in surface yet — that's 9.3.
- **Install — the single dependency.** `pnpm add better-auth`. The package ships with its own TypeScript types, the Drizzle adapter (covered in 9.2.2), the Next.js helpers, and the React client. No peer-dependency dance, no separate `@better-auth/react` or `@better-auth/drizzle` packages — the surface is one import path with sub-paths.
- **The two env entries — `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`.** `BETTER_AUTH_SECRET` is the HMAC key the library uses to sign cookie caches, verify state tokens, and bind PKCE verifiers; minimum 32 bytes of random, generated via `openssl rand -base64 32` or Better Auth's `npx @better-auth/cli secret`. `BETTER_AUTH_URL` is the public origin (`https://app.example.com` in prod, `http://localhost:3000` in dev) — used to compute redirect URLs and the cookie `Domain` scope. Both land in `src/lib/env.ts` as `.min(32)` and `.url()` Zod entries; the env-validation layer refuses to boot without them. Per-environment values via Vercel project envs (preview/production split).
- **`src/lib/auth.ts` — the server `auth` instance.** The single source of truth for the server-side library config. Skeleton:
  - `import { betterAuth } from 'better-auth';`
  - `import { drizzleAdapter } from 'better-auth/adapters/drizzle';`
  - `import { nextCookies } from 'better-auth/next-js';`
  - `export const auth = betterAuth({ database: drizzleAdapter(db, { provider: 'pg' }), plugins: [nextCookies()], secret: env.BETTER_AUTH_SECRET, baseURL: env.BETTER_AUTH_URL });`
  - The Drizzle adapter wiring is taught in 9.2.2; named here so the import resolves. The `nextCookies()` plugin is non-negotiable in Next.js 16: it auto-attaches `Set-Cookie` headers emitted from Server Actions onto the Action response. Without it, sign-up and sign-in succeed server-side but the cookie never reaches the browser — the canonical "I called signUp and nothing happened" failure mode.
  - Email/password and any provider config land in 9.3; this lesson configures only the database, plugins, secret, and base URL.
- **`src/app/api/auth/[...all]/route.ts` — the catch-all handler.** The single route file that exposes every Better Auth endpoint (`/api/auth/sign-up/email`, `/api/auth/sign-in/email`, `/api/auth/callback/google`, etc.). Body:
  - `import { auth } from '@/lib/auth';`
  - `import { toNextJsHandler } from 'better-auth/next-js';`
  - `export const { POST, GET } = toNextJsHandler(auth);`
  - `[...all]` is the Next.js catch-all segment (Chapter 5.1.3) — it matches any path under `/api/auth/`, and Better Auth's internal router dispatches by the rest of the path. The senior reflex: never write individual `route.ts` files for sign-in, sign-up, callback — the catch-all is the contract the client and the framework agree on.
- **`src/lib/auth-client.ts` — the browser client.** The React client used by sign-in forms, session-listing UI, and any "trigger an auth action from the browser" surface. Skeleton:
  - `import { createAuthClient } from 'better-auth/react';`
  - `export const authClient = createAuthClient({ baseURL: process.env.NEXT_PUBLIC_APP_URL });`
  - The client provides `authClient.signIn.email(...)`, `authClient.signUp.email(...)`, `authClient.signOut()`, `authClient.useSession()`, and the rest of the browser-callable surface (full enumeration in 9.3). It POSTs to the catch-all handler under the hood.
  - The `baseURL` defaults to the current origin if omitted; named explicitly so the configuration is legible. In a single-origin deployment, omitting is fine.
- **Where to call what — the server-vs-client split.** Server-side: `auth.api.*` for direct API calls inside Server Components/Actions/route handlers (e.g., `auth.api.getSession({ headers: await headers() })`). Client-side: `authClient.*` for browser-initiated flows from React Client Components. The names mirror — `auth.api.signUpEmail` and `authClient.signUp.email` hit the same endpoint via different transport. The senior reflex: never import `authClient` in a Server Component (it's a React-client-only module); never import `auth` directly in a Client Component (it would bundle the server library into the browser, which `server-only` prevents).
- **The `server-only` reflex on `lib/auth.ts`.** The first line of `lib/auth.ts` is `import 'server-only';` (Chapter 5.2.3's pattern). The import is a compile-time guard: any accidental import from a Client Component fails the build with a clear error rather than ballooning the bundle. Same reflex used for `db/index.ts` in Chapter 6.1.
- **The `BetterAuthOptions` shape — what this chapter touches versus defers.** The full options surface is large; this lesson and the next touch `database`, `secret`, `baseURL`, `plugins`, and `session` (in 9.2.3). `emailAndPassword`, `socialProviders`, `emailVerification`, and `account` lands in 9.3. `trustedOrigins` (CSRF allowlist for non-same-origin clients) is named once here, defaulted to the `baseURL` origin, and revisited only if the app adds a mobile client.
- **Smoke test — the verify step that proves the wiring.** Hit `GET /api/auth/ok` (Better Auth ships a health endpoint) or `GET /api/auth/session` — should return `null` for an unauthenticated request, `{ user, session }` once a session cookie is present. No sign-in surface yet, so the result is `null` — the point is the handler responds and the env entries resolve.
- **Watch-outs.** Forgetting `nextCookies()` in the plugin array — Server Actions return 200 but no cookie sets, and every downstream auth feature appears to silently fail; importing `auth` from a Client Component file (even transitively through a shared helper) — `server-only` catches it but the error message is opaque if the student hasn't seen the pattern; using the same `BETTER_AUTH_SECRET` across environments — a leaked staging secret invalidates production sessions on rotation, split from day one; mounting the handler under a non-`/api/auth` path without updating the client `baseURL` — the client posts to a 404 and the failure is silent in the UI; embedding the secret in `NEXT_PUBLIC_*` so it ends up in the browser bundle — Better Auth doesn't read `NEXT_PUBLIC_*` for secrets but the senior reviews every env entry's prefix.

What this lesson does not cover:

- The Drizzle adapter wiring details and the four tables (9.2.2).
- Session config (`expiresIn`, `updateAge`, fresh sessions, cookie cache) (9.2.3).
- `getSession` call shape in middleware/layouts/actions (9.2.4).
- Email/password sign-up and sign-in (Chapter 9.3).
- Social-provider OAuth wiring (Chapter 9.3.8).
- The `proxy.ts` matcher pattern for protected routes (Chapter 9.4.1, with the setup hook here in 9.2.4).
- Better Auth CLI for schema generation (9.2.2 owns the install and the migration).

Estimated student time: 35 to 45 minutes. Setup-archetype lesson — terminal commands, file scaffolds, a smoke test at the end.

---

## Lesson 9.2.2 — Schema and the four core tables

Wires the Drizzle adapter, generates the canonical `user`, `session`, `account`, and `verification` tables via the Better Auth CLI, walks their load-bearing columns and cascades, and ships the first migration through Drizzle Kit.

Topics to cover:

- **The senior question.** Better Auth needs persistence. The app already has Postgres through Drizzle from Unit 6 — the schema is the source of truth (Principle #2). How does the library plug into that backplane without inventing its own ORM, what tables does it own, what columns matter, and what's the migration ceremony that lands them in the database next to the app's domain tables? The lesson wires the Drizzle adapter, generates the four canonical tables via the Better Auth CLI, reviews the schema column by column, and ships the first migration.
- **The Drizzle adapter — one line, four arguments that matter.** `drizzleAdapter(db, { provider: 'pg' })`. The adapter takes the existing Drizzle instance from `src/db/index.ts` (Chapter 6.1.4) and the database provider (`'pg' | 'mysql' | 'sqlite'`). Optional `schema` argument lets the library find tables under a custom export name; the default expects `user`, `session`, `account`, `verification` exported from the schema module. Optional `usePlural: true` if the codebase uses pluralized table names — the default is singular, which matches Better Auth's docs.
- **Why the schema is generated, not hand-written.** Better Auth needs specific columns to exist with specific names and types; hand-writing them is a recipe for "the library expects `emailVerified` and your schema has `email_verified_at`" debugging sessions. The CLI generates a Drizzle schema file that the student reads, reviews, and migrates — not a runtime introspection contract.
- **The CLI — `npx @better-auth/cli generate`.** Pointed at `lib/auth.ts`, the CLI reads the config (knows it's Drizzle, knows it's Postgres, knows which plugins are loaded), and writes a Drizzle schema file with the required tables. The output file lands in `src/db/schema/auth.ts` (or wherever the project conventions put schema modules). The senior reflex: regenerate every time a plugin is added or removed — the `organization` plugin in Unit 10 adds `member`, `invitation`, `organization` tables; the `passkey` plugin in 9.3.7 adds `passkey`; each regeneration is a code review, not a black box.
- **The four canonical tables — column by column.**
  - **`user`.** `id` (text, PK; UUIDv7 or cuid2 — the app's existing convention from Chapter 6.2.5), `name` (text), `email` (text, unique, not null), `emailVerified` (boolean, default false — the boolean gate Chapter 9.3.3 reads at sign-in), `image` (text, nullable — profile picture URL from OAuth providers), `createdAt`/`updatedAt` (timestamp, default now). The unique index on `email` is enforced at the database, not just the application — duplicate emails fail the constraint instead of producing a half-created row.
  - **`session`.** `id` (text, PK), `userId` (text, FK to `user.id` with `onDelete: 'cascade'` — when a user is deleted, sessions follow), `token` (text, unique — the opaque session-id from Chapter 9.1.2, sent in the cookie), `expiresAt` (timestamp), `ipAddress`/`userAgent` (text, nullable — the columns Chapter 9.4.3's active-sessions list reads), `createdAt`/`updatedAt`. The unique index on `token` is the lookup path on every request — index quality is load-bearing.
  - **`account`.** Maps a `user.id` to one or more external identities or credential records. Columns: `id`, `userId` (FK), `accountId` (the provider's user ID for OAuth, or the user's own ID for email/password), `providerId` (`'credential'` for email/password, `'google'` / `'github'` / `'apple'` for OAuth), `password` (text, nullable — the bcrypt hash for `'credential'` accounts), `accessToken`/`refreshToken`/`idToken` (text, nullable — populated for OAuth accounts when the app needs to call provider APIs later), `accessTokenExpiresAt`/`refreshTokenExpiresAt`, `scope`, `createdAt`/`updatedAt`. One user can have multiple `account` rows — one for email/password and one for each linked OAuth provider — which is the account-linking mechanism Chapter 9.3.9 exploits.
  - **`verification`.** Short-lived tokens for email verification, password reset, magic links, and OAuth `state`/PKCE. Columns: `id`, `identifier` (the email being verified, or a synthetic key for state tokens), `value` (the token itself or the hash), `expiresAt`, `createdAt`/`updatedAt`. Rows are deleted after consumption; a cleanup job (or a `WHERE expires_at > now()` filter) prevents stale-row accumulation.
- **The `password` column lives on `account`, not `user`.** A senior recognizes this as the correct decomposition: the user identity (`user`) is one row regardless of how many ways they prove it; each proof method (password, Google, GitHub) is its own `account` row. The "change password" flow updates one `account` row; "link Google" inserts another; "unlink Google" deletes one. The model survives every Chapter 9.3 flow without re-shaping.
- **Foreign-key cascades and the deletion semantics.** `session.userId` and `account.userId` cascade on delete — removing a user is one statement that takes their sessions and provider links with it (Chapter 6.2.6's `ON DELETE CASCADE` decision applied at the call site). `verification` doesn't reference `user.id` (the row exists *before* the user does, in sign-up-verification flows) — it's keyed by `identifier` (email) instead.
- **Customizing field and table names — when it earns the call.** Better Auth accepts a `user: { fields: { ... }, modelName: '...' }` option to remap column or table names. Reach for it only when the existing schema can't change (migrating from another auth system, naming-convention conflicts with the rest of the schema). The default is fine for greenfield; the senior call is "don't remap unless forced."
- **Adding additional fields to `user` — the extension pattern.** The schema can grow with app-specific columns: `role` (when not using the organization plugin), `timezone` (Chapter 18.1), `locale` (Chapter 18.2). Two options: extend the generated Drizzle table directly (the CLI preserves manual additions on re-run if marked), or use Better Auth's `additionalFields` config so the library types and validates them. The latter integrates with the `useSession` hook's typed return; the former is fine when the field is read by the app but never touched by Better Auth.
- **The migration — Drizzle Kit, same workflow as Chapter 6.5.** `pnpm drizzle-kit generate` produces a SQL migration with the four `CREATE TABLE` statements, the unique indexes on `user.email` and `session.token`, and the foreign keys. `pnpm drizzle-kit migrate` applies it. The senior reflex: review the generated SQL before applying — Drizzle is reliable, but a review catches dropped-not-null mistakes early. In production, the migration runs through the same CI pipeline (Chapter 21.2) and follows the expand-migrate-contract discipline (Chapter 21.4) when the schema changes after launch.
- **Better Auth's own `migrate` CLI — when it earns the call.** `npx @better-auth/cli migrate` exists for projects that don't want a separate migration tool. In this stack, Drizzle Kit owns migrations end-to-end (the schema is the source of truth) — using two migration tools fragments the history. The senior call: stick with Drizzle Kit, regenerate the schema via the CLI when plugins change, migrate via Drizzle Kit always.
- **Indexing the lookup paths.** The CLI adds the load-bearing unique indexes (`user.email`, `session.token`) but the senior reviews the result against the access patterns: `session WHERE userId` for the active-sessions list (Chapter 9.4.3) wants a non-unique index on `userId`; `account WHERE providerId AND accountId` for OAuth callback lookups wants a composite. Chapter 6.4.1's index discipline applies here; the CLI is a starting point, not the final word.
- **Watch-outs.** Hand-editing the generated schema in ways the CLI overwrites on regenerate (mark customizations or move them to a sidecar file); forgetting to migrate before testing sign-up — the first call to `signUpEmail` fails on a missing `user` table with an opaque Postgres error; running Better Auth's `migrate` CLI in parallel with Drizzle Kit — one tool's history doesn't see the other's, schema drift follows; relying on application-level uniqueness checks instead of the unique index on `email` — race conditions slip through; missing the cascade on `session.userId` — deleted users leave orphan session rows that can't be cleaned without manual SQL.

What this lesson does not cover:

- The session config and cookie tuning (9.2.3).
- Reading the session at request time (9.2.4).
- The organization, member, invitation tables added by the Unit 10 plugin (Chapter 10.1.1).
- Passkey, two-factor, and admin plugin schemas (Chapter 9.3.6, 9.3.7, and beyond).
- The expand-migrate-contract discipline for live schema changes (Chapter 21.4).
- Drizzle Kit fundamentals — owned by Chapter 6.5.

Estimated student time: 40 to 50 minutes. Setup + reference hybrid — the schema walkthrough does the teaching weight; the migration is mechanical.

---

## Lesson 9.2.3 — Session lifetimes and cookie hardening

Configures `expiresIn`, `updateAge`, and `freshAge`, sets the `__Host-` cookie prefix and SameSite defaults, weighs the cookie-cache staleness trade, and names `secondaryStorage` and `trustedOrigins` as deferred reaches.

Topics to cover:

- **The senior question.** The session table exists; the cookie carries the token. Now the operational questions: how long does a session live, when does the token rotate, what's "a fresh session" and what gates require it, does every request hit the database or does the cookie carry a cached copy, and is the cookie configured with the `__Host-` prefix and the SameSite defaults Chapter 9.1.2 named? This lesson configures Better Auth's `session` and `advanced` options to honor those defaults at the call site and names the cookie cache as the one performance reach this chapter takes.
- **The `session` config block — the four numbers that matter.**
  - `expiresIn` — the session's absolute lifetime. Default 7 days; the senior call for SaaS is 7 to 30 days depending on the data sensitivity. Past `expiresIn`, the session is invalid and the user re-authenticates. Stored on the `session.expiresAt` column.
  - `updateAge` — the sliding-renewal cadence. Default 1 day; when a request arrives and `session.updatedAt` is older than this, the library extends `expiresAt` by another full `expiresIn` window. Trade-off: shorter `updateAge` = more frequent UPDATEs (write amplification), longer = users get logged out mid-task if their last activity was near the absolute expiry.
  - `freshAge` — the "this session is freshly authenticated" window. Default 1 day. Inside this window, sensitive actions (change password, change email, disable 2FA) proceed; outside it, Better Auth requires re-authentication first. The elevation tier from Chapter 9.1.1 lives here; Chapter 9.4.2 reads it.
  - `disableSessionRefresh` — opt-out for the sliding renewal. Default false; flip to true only when external requirements demand strict absolute expiry (compliance regimes that mandate "re-login every 24h regardless of activity").
- **The session-rotation move and what it defends.** Each refresh of the session can also rotate the token (`session.fresh.token` becomes a new opaque value, old one invalidated). Defense-in-depth against session fixation (named in 9.1.2) and against a leaked cookie surviving past the next active window. Better Auth handles this on sign-in by default (issuing a fresh token, never reusing a pre-auth ID); the rotation cadence on refresh is configurable.
- **The cookie surface — `advanced.cookies` and the `__Host-` prefix defaults.** Better Auth's `advanced` config block exposes the cookie attributes Chapter 9.1.2 named:
  - `useSecureCookies` — auto-detected from `baseURL` (HTTPS = true, HTTP localhost = false); the senior reviews that production resolves to true.
  - `cookiePrefix` — default `'better-auth'` produces cookies like `better-auth.session_token`; the senior reach is the `__Host-` prefix for production (`cookiePrefix: '__Host-better-auth'`) which the browser enforces as `Secure`, `Path=/`, no `Domain=`. Configured per environment so dev (HTTP localhost) doesn't choke on the `Secure` requirement.
  - `crossSubDomainCookies` — defaulted off; flip on only when the app spans multiple subdomains (`app.example.com` and `admin.example.com` sharing a session). Incompatible with `__Host-`; the senior weighs the trade.
  - `defaultCookieAttributes` — `sameSite` (default `'lax'`, matching 9.1.2's call), `httpOnly` (always true for the session token), `path` (`/`).
- **The session cookie versus the cookie cache — two separate things.** The session *token* cookie carries the opaque ID and is non-negotiable. The cookie *cache* is an optional second cookie (`better-auth.session_data`) that holds a signed copy of the `{ user, session }` payload so `getSession` calls can skip the database lookup. Both default to enabled in 2026 templates; the senior reviews whether the cache is right for the app.
- **The cookie cache — when it earns the call.**
  - **Enable** via `session: { cookieCache: { enabled: true, maxAge: 5 * 60 } }`. Default 5-minute TTL. Inside the TTL, `auth.api.getSession` reads from the cookie (verify signature, deserialize) — zero database round-trips. Past the TTL, fetches fresh from the DB and refreshes the cache.
  - **The trade.** Faster reads (no DB query per request) versus delayed propagation of server-side changes — if an admin revokes a session or a user changes their email, the cookie cache still says the old data for up to 5 minutes. The senior reflex: cookie cache on for read-heavy routes (every page load triggers a session read); shorten the `maxAge` when revocation latency matters; turn off entirely if instant revocation is non-negotiable.
  - **What the cache contains.** Defaults to the core `{ user, session }` shape; custom fields on `user` require the `additionalFields` config (from 9.2.2) so the cache knows to include them. Stale-cache-versus-source-of-truth bugs hide here.
  - **The encoding.** Better Auth defaults to a `compact` HMAC-SHA256-signed base64url payload (smaller than JWT, same tamper-resistance); JWT and JWE encodings exist for interop. Defaults are correct; the senior recognizes the names when reading the config.
- **The `secondaryStorage` slot — when Redis/Upstash earns the call.** Better Auth accepts a `secondaryStorage` config (Redis-shaped KV) that takes session reads off Postgres entirely. The threshold: thousands of session reads per second, where the DB lookup is a measured bottleneck. Named once here; the actual wiring lands in Chapter 15.3 alongside Upstash rate limiting since the same Redis instance serves both. The senior call for early-stage SaaS: don't reach yet — the cookie cache alone closes most of the gap.
- **The JWT plugin — conditional, named not configured.** Better Auth ships a `jwt()` plugin that issues JWTs for cross-service calls (the SaaS calls a separate API that needs to verify identity without hitting the auth DB). Threshold: a second service that the browser session can't reach directly. The implementation is one plugin line plus a key-rotation config; the senior call: don't enable until the second service exists, and never replace the session cookie with a JWT for the browser flow (the revocation property from 9.1.2 is non-negotiable for browser sessions).
- **Multi-session — multi-account, not multi-device.** Better Auth's `multiSession()` plugin lets one browser hold sessions for multiple user accounts simultaneously (Gmail-style account switching). Different from "multi-device" — the active-sessions list across browsers/devices is built-in and needs no plugin; multi-session is the "I want to be logged in as `personal@gmail.com` and `work@gmail.com` in the same tab" feature. Named here; full coverage deferred to Chapter 9.4.3.
- **`trustedOrigins` — the CSRF allowlist.** Better Auth refuses to set auth cookies on requests from origins not on the `trustedOrigins` list. Defaults to `[baseURL]`. Add origins explicitly when the browser-side client lives on a different domain (mobile app webview, browser extension); leave default for the standard same-origin Next.js SaaS. The senior reflex: never `['*']` — that opens the door to every CSRF vector SameSite is closing.
- **Sign-out semantics — `signOut` revokes the row.** `auth.api.signOut` deletes the `session` row server-side and clears the cookie via the `nextCookies` plugin. "Sign out everywhere" (Chapter 9.4.3) deletes every session row for the user. The library default is the secure path; the senior recognizes that the row-deletion is what makes the cookie's stale token harmless.
- **Watch-outs.** Setting `expiresIn` to "forever" / 365 days for UX convenience — Sessions that never expire are sessions that never rotate; pick a finite window and lean on `updateAge` for sliding renewal; enabling cookie cache for a destructive-actions surface (admin panel, billing changes) — the elevation check from `freshAge` and the up-to-5-minute staleness can collide, force-refresh the session at the action boundary; flipping `crossSubDomainCookies` on with `__Host-` prefix configured — the browser silently rejects the cookie; configuring `trustedOrigins: ['*']` to "fix" a CORS issue — the real fix is adding the specific origin; running production with `cookiePrefix: 'better-auth'` instead of `__Host-better-auth` — the structural defense from 9.1.2 is missing; assuming the cookie cache updates instantly on a user-data change — email change, profile update, or org switch each need either a session refresh call or a `maxAge`-bounded wait.

What this lesson does not cover:

- The sign-up/sign-in code that creates sessions (Chapter 9.3.1, 9.3.2).
- The active-sessions list and "sign out everywhere" UI (Chapter 9.4.3).
- The Redis secondary-storage wiring (Chapter 15.3).
- The full JWT plugin config and cross-service token contracts (referenced only).
- CSRF in detail and the `dangerouslySetInnerHTML` opt-out (Chapter 9.4.4).
- Rate limiting and brute-force defenses on the cookie surface (Chapter 15.3).
- The elevation re-prompt UI flow (Chapter 9.4.2 reads `freshAge`).

Estimated student time: 35 to 45 minutes. Decision-archetype lesson — every config knob is "default versus threshold-to-flip"; a small comparison table for "cookie cache on versus off" and one for "session expiresIn / updateAge / freshAge" earn their weight.

---

## Lesson 9.2.4 — `getCurrentUser` across the five surfaces

Establishes the one `auth.api.getSession({ headers: await headers() })` call shape used in proxy, layouts, Server Components, Server Actions, and route handlers, wraps it in `React.cache`-backed `getCurrentUser`/`requireUser` helpers, and stands up the minimum `proxy.ts` gate.

Topics to cover:

- **The senior question.** Setup is done; sessions exist. Now every request that needs to know "who is this user?" reads the session — in middleware, in layouts, in Server Components, in Server Actions, in route handlers. What's the single call shape that works in all five, what does it return, where does request-scoped memoization fit, and what's the proxy.ts pattern for protected routes that Chapter 9.4.1 will expand into the full request-time gate? The lesson nails the `getSession` shape, writes the `getCurrentUser()` helper everyone downstream uses, and stands up the minimal `proxy.ts` so a route gate is in place.
- **The one call — `auth.api.getSession({ headers })`.** Returns `Promise<{ user, session } | null>`. `user` is the typed `user` row (plus any `additionalFields`); `session` is the typed `session` row including `ipAddress`, `userAgent`, `expiresAt`. `null` means no valid session cookie (anonymous request). The call is async and reads either the cookie cache (if 9.2.3 enabled it) or the database — the call shape is identical either way.
- **Why `headers()` is the argument.** Server Components in App Router don't have direct access to the cookie store the way old `getServerSession`-style helpers did; instead, the request's headers are passed explicitly. `headers()` from `next/headers` returns the incoming `Headers` object; Better Auth reads the `Cookie` header off it. In Next.js 16 `headers()` is async — `await headers()` is the canonical form. The pattern looks the same in every call site:
  - `const session = await auth.api.getSession({ headers: await headers() });`
- **Where the call lives — five surfaces, same call.**
  - **`proxy.ts` middleware** (formerly `middleware.ts` in Next.js 15 and earlier — renamed in Next.js 16 per Chapter 5.5.2). Runs before the route renders. The protected-routes pattern: `getSession`, if `null` redirect to `/sign-in`. Chapter 9.4.1 expands this into the full gate; the minimum form ships here so the smoke test in 9.2.1 has somewhere to redirect to.
  - **Server Components and layouts.** Read the session to drive identity-aware UI: show the user's name in the header, hide an admin link if `user.role !== 'admin'`. The senior reflex: layouts that depend on the session opt the entire route subtree into dynamic rendering (Chapter 5.4.1's dynamic signal) — fine, intended.
  - **Server Actions.** Read the session at the top of every mutating action: "who is doing this, and is there a session at all?" Returns the `unauthenticated` Result discriminant (Chapter 7.2.3) when null. Authz (role check, org scope) layers on top — that's Chapter 10.2's `authedAction` wrapper, but the read happens here.
  - **Route handlers.** Same call, same shape. Returns 401 when null. The contract from Chapter 7.5.2 (RFC 9457 Problem Details on errors) wraps the response.
  - **Server-side data loaders consumed by Client Components.** When a Client Component needs the user, fetch it server-side and pass it as a prop — never call the auth client just to know "who is logged in" on the server side.
- **The request-scoped memoization reflex — `React.cache`.** Every route render likely reads the session multiple times: the layout, a header server component, the page body, and maybe a sidebar all want `user`. Without memoization, each call hits the cookie cache (or the DB). The fix: wrap the read in `cache()` from React (Chapter 5.4.5):
  - `import { cache } from 'react';`
  - `export const getCurrentUser = cache(async () => { const s = await auth.api.getSession({ headers: await headers() }); return s?.user ?? null; });`
  - Now every call inside the same request returns the same `Promise`, evaluated once. The `cache()` here is request-scoped, not cross-request (that's `use cache` from Chapter 5.4.3, which would cache *across* requests — wrong reach for per-user data).
- **The `getCurrentUser` and `requireUser` helpers — the modules downstream calls.** `lib/auth.ts` exports two helpers built on the cached `getSession`:
  - `getCurrentUser(): Promise<User | null>` — the safe read, returns null for anonymous.
  - `requireUser(): Promise<User>` — the assert form, calls `redirect('/sign-in')` when null. Used in layouts and pages that demand a session.
  - The shape mirrors `lib/db.ts` from Chapter 6: a thin domain-shaped wrapper over the library, named once, called everywhere.
- **The minimum `proxy.ts` — the smoke-test gate.** `src/proxy.ts` (project root, not `src/app/`):
  - Imports `auth`, `NextResponse`, `headers`.
  - Reads the session via `auth.api.getSession`.
  - Redirects to `/sign-in` when null on matched routes.
  - The `matcher` config (Chapter 5.5.2) selects the protected paths — `['/dashboard/:path*']` for now; Chapter 9.4.1 expands.
  - The proxy runs on the Node runtime in Next.js 16, which lets it call Better Auth and Drizzle directly — the Edge-runtime limitation that plagued auth middleware in earlier Next.js is gone.
- **The `useSession` hook on the client — the Client Component read.** `authClient.useSession()` returns `{ data, isPending, error }` — reactive, refetches on focus, perfect for header avatars and "you're signed in as X" UI. Never a substitute for the server-side read at the action boundary; the client value can be stale or forged by a debugger, the server value is the truth. The senior reflex: client reads drive UI, server reads drive decisions.
- **Why not call `auth.api.getSession` from a Client Component.** It would require importing `auth` (server-only); even if it didn't, the call needs the request's cookies, which the client doesn't pass to itself. The right path is `authClient.getSession()` or `authClient.useSession()` from the browser; on the server, always `auth.api.getSession` with `await headers()`.
- **Performance — the cookie cache plus `React.cache` ladder.** Within a single request: `React.cache` dedupes the call. Across requests: the cookie cache (9.2.3) skips the DB lookup when the cache is fresh. Beyond the cookie cache: `secondaryStorage` to Redis (Chapter 15.3) for absolute thousands-per-second throughput. The senior knows all three layers and reaches in that order.
- **The dynamic-rendering implication.** `getSession` reads `headers()`, which is a dynamic signal under Cache Components (Chapter 5.4.1). Any route or layout that reads the session opts into dynamic rendering for that surface. The senior reflex: read the session at the highest layout where the gate makes sense (not in every leaf), and lean on Partial Prerendering (Chapter 5.4.2) so the static shell still ships from the CDN.
- **`databaseHooks` — the lifecycle-extension point for session-creation side effects.** Better Auth's `betterAuth({ databaseHooks: { session: { create: { before: ... } } } })` config block exposes `before`/`after` hooks on the core `user`/`session`/`account`/`verification` lifecycles — the canonical place to stamp an `activeOrganizationId` onto a new session, mirror a user into an external system on creation, or run a tenant-bootstrapping step at sign-up. Named here at recognition level; Chapter 10.1.1 wires the session-creation hook for the organization-context default.
- **Watch-outs.** Calling `getSession` without `await headers()` — the call silently sees no cookies and returns null, "I'm signed in but the layout says I'm not" emerges; reading the session inside a `use cache`-wrapped function — the cache key doesn't include the cookie, so user A sees user B's session-derived UI; reading the session in a `useEffect` on the client to gate UI — the gate is server-side, the client read is for display only; running the proxy on the Edge runtime out of habit — Better Auth needs Node for DB access, the runtime is `'nodejs'` (the default in Next.js 16's `proxy.ts`); duplicating the `getSession` import path across files instead of going through the `getCurrentUser`/`requireUser` helpers — the helpers carry the `React.cache` wrapping, the raw call doesn't dedupe.

What this lesson does not cover:

- The full `proxy.ts` matcher pattern for protected routes — the minimum gate is here, the full surface is Chapter 9.4.1.
- The `authedAction` wrapper that adds role/org-scope authz (Chapter 10.2).
- The active-sessions list, "sign out everywhere," and per-session revocation (Chapter 9.4.3).
- The credential-change re-authentication tier reading `freshAge` (Chapter 9.4.2).
- The 401-versus-403 wire shape on route handlers (Chapter 7.5.3 and 9.4.4).
- The `useSession` hook in depth and the client-side patterns that hang off it (Chapter 9.3 covers as it builds sign-in surfaces).
- The CSRF / SameSite mitigation surface (Chapter 9.4.4).

Estimated student time: 35 to 45 minutes. Pattern + setup hybrid — the `getCurrentUser`/`requireUser` helpers are the load-bearing pattern, the proxy.ts gate is the structural enforcement, the smoke test at the end proves the wiring end-to-end.

---

## Lesson 9.2.5 — Quizz

Top 10 topics to quiz:

- The `lib/auth.ts` skeleton — `betterAuth`, the Drizzle adapter, the `nextCookies` plugin, `secret`, and `baseURL` — and why `nextCookies` is non-negotiable in Next.js 16.
- The catch-all route handler — `app/api/auth/[...all]/route.ts`, `toNextJsHandler(auth)`, and what the `[...all]` segment guarantees.
- The server-versus-client split — `auth.api.*` from server code, `authClient.*` from Client Components, why importing either across the boundary fails (and the `server-only` reflex).
- The four canonical tables (`user`, `session`, `account`, `verification`) — the load-bearing columns of each, why `password` lives on `account` (not `user`), and the foreign-key cascades on session/account.
- The Better Auth CLI for schema generation, and why migrations still ship through Drizzle Kit (one migration history, schema as source of truth).
- The `session` config — `expiresIn`, `updateAge`, `freshAge` — and which downstream feature reads each (sliding renewal, elevation tier).
- The cookie surface — the `__Host-` prefix, `HttpOnly`, `Secure`, `SameSite=Lax`, and the `trustedOrigins` allowlist.
- The cookie cache versus the DB lookup — when the cache earns the call, the staleness trade, when to shorten `maxAge` or disable, the `secondaryStorage` threshold.
- The single `getSession` call shape — `auth.api.getSession({ headers: await headers() })` — and the five surfaces it works in (proxy, Server Components, layouts, Server Actions, route handlers).
- The `getCurrentUser`/`requireUser` helpers and the `React.cache` request-scoped memoization — why per-request deduping matters, and why `use cache` is the wrong reach for per-user reads.

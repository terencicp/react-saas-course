# Wiring the auth instance

- **Title (h1):** Wiring the auth instance
- **Sidebar label:** Wiring the auth instance

---

## Lesson framing

First code lesson of Unit 8. Chapter 051 was pure concept — no Better Auth API appeared. This lesson is the opposite archetype: a **setup lesson** that lands the running wiring. By the end the student has installed `better-auth`, written the server `auth` instance, mounted one catch-all route handler, created the browser `authClient`, added two validated env entries, and proven the wiring with a smoke test that returns `null` (no sessions exist yet).

Core pedagogical decisions for the lesson as a whole:

- **Frame as "the minimum surface the rest of Unit 8 calls into."** The senior question is: what's the smallest set of files — install, instance, route, client, env — that everything downstream (sign-in surfaces in 053, request gating in 054, orgs in Unit 9) imports without re-deciding? Keep the student oriented on *surface area*, not feature count. This lesson deliberately ships an instance that does almost nothing yet (no email/password, no providers, no session tuning) — that restraint is the lesson.
- **The mental model to leave with:** Better Auth is one server instance (`lib/auth.ts`) plus one browser client (`lib/auth-client.ts`), bridged by one HTTP endpoint (`[...all]`). Server code talks to the instance directly (`auth.api.*`); browser code talks over HTTP through the client (`authClient.*`); both hit the same catch-all route. The `[...all]` route is the contract the two sides agree on.
- **The single biggest beginner failure this lesson must inoculate against:** omitting `nextCookies()`. Without it, sign-up/sign-in succeed server-side but the `Set-Cookie` never reaches the browser — "I called signUp and nothing happened." The student won't hit this until Chapter 053, so the lesson has to *plant the why* now, at the moment the plugin is added, not as a detached warning.
- **The second reflex to build:** the server/client boundary. `auth` is `server-only`; `authClient` is browser-only. Importing either across the line is the recurring confusion with this library. Teach the split as a positive rule ("server reads with `auth.api`, browser triggers with `authClient`") and let `server-only` be the compile-time backstop.
- **Code-forward, decision-annotated.** This is a scaffold lesson, so real file contents carry the weight — but every file gets a *why each line is here* treatment, not a copy-paste dump. Use `AnnotatedCode` for the two config files (instance, client) where attention must land on specific options; plain `Code` for the two-line route and the env additions.
- **Honor the "no real API until 052" promise from 051.** Chapter 051's continuity notes flag that all its code was conceptual sketch. This lesson is where the real `betterAuth(...)` / `createAuthClient(...)` / `toNextJsHandler(...)` calls finally appear. Connect back explicitly: "the opaque session in a `__Host-` cookie you modeled last chapter — here's the library that issues it."
- **Connect to prior infra, don't re-teach it.** The student already has: a Drizzle `db` client with `server-only` (Unit 5), env validation via `@t3-oss/env-nextjs` + Zod in `src/env.ts` (Ch 034), catch-all route segments (Ch 029), and Server Actions / `proxy.ts` (Ch 033). Each is a one-line callback, not a re-explanation.
- **Cognitive load:** the lesson touches five files. Sequence them in dependency order (env → instance → route → client) and gate the payoff behind a `Steps` install/run block so the student always knows where they are. Resist pulling in the Drizzle adapter internals (053→ owns them) — name the adapter line so the import resolves, defer the *why*.

---

## Lesson sections

### Five files and one endpoint

Opening section. State the goal and the map before any code. Motivate with the concrete arc: "last chapter you learned what a session is and why it lives in a `__Host-` cookie; this chapter you make a real one exist." Then lay out the five artifacts this lesson produces and how they relate.

Include a small **orientation diagram** (the lesson's one load-bearing visual): three boxes — `lib/auth.ts` (server instance), `lib/auth-client.ts` (browser client), `app/api/auth/[...all]/route.ts` (the endpoint) — with the relationships drawn:
- Server Components / Actions → `auth.api.*` → instance (direct, in-process call, no HTTP).
- Browser (Client Components) → `authClient.*` → HTTP POST/GET → `[...all]` route → instance.

Goal of the diagram: cement that there are **two ways in** to the same instance, split by where the caller runs, and that the catch-all route is only on the browser path. Build with **`ArrowDiagram`** inside a `<Figure>` — nodes are real labeled boxes (file names + role), two arrows showing the in-process path vs. the HTTP path, color-coded (one tint for server-direct, another for browser-over-HTTP). Keep it horizontal, well under the height cap. This diagram is referenced again in the server/client-split section, so place it early and call back rather than redrawing.

Close the section by naming what this lesson deliberately does **not** add (email/password, providers, session config) and why — the surface comes first, the features bolt onto it in later lessons. Sets honest expectations for the `null` smoke-test result.

`Term` candidates in this section: **catch-all segment** (brief: a `[...all]` dynamic route that matches every path below it). **instance** can stay plain prose.

### Installing Better Auth

The install. One command: `pnpm add better-auth`. Use a `Steps` block or a single `Code` (bash) — keep it tight.

The teaching point is *what arrives in that one package*, because students coming from the NextAuth/Passport era expect a constellation of adjuncts. Enumerate, in prose or a tight `CardGrid`, that the single `better-auth` package ships: the server `betterAuth` function, the built-in database adapters (including the Drizzle adapter used next lesson), the framework helpers (`better-auth/next-js`), the React client (`better-auth/react`), and its own TypeScript types. The senior takeaway: **no peer-dependency dance** — no separate `@better-auth/react` or `@better-auth/drizzle`; it's one install, many sub-paths.

Show the sub-path map concretely since every later file imports from one of these:
- `better-auth` → `betterAuth`
- `better-auth/adapters/drizzle` → `drizzleAdapter` (next lesson)
- `better-auth/next-js` → `nextCookies`, `toNextJsHandler`
- `better-auth/react` → `createAuthClient`

A small `Code` block listing these import lines (no bodies) earns its weight — it's the index the rest of the lesson fills in.

Reasoning: pre-loading the import surface here means each subsequent file's imports read as "oh, that one" rather than novel. Low-cost, high-orientation.

### The two env entries

Add `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. This section must do two things: (1) explain what each value *is* and *does*, and (2) wire them into the existing validated env layer rather than reaching for raw `process.env`.

Teach the values:
- **`BETTER_AUTH_SECRET`** — the key Better Auth uses for **encryption, signing, and hashing** (per the docs' own wording): signing the cookie cache, binding PKCE verifiers and OAuth `state`, etc. Must be ≥32 high-entropy chars. Canonical generation: `openssl rand -base64 32` (show this command). Mention the Better Auth docs page also offers a one-click generator. *Do not* assert a specific `@better-auth/cli secret` subcommand — the verified, durable path is `openssl`. Senior aside (one line): Better Auth also reads `BETTER_AUTH_SECRETS` (plural, comma-separated) for **secret rotation** — roll a new secret in without invalidating existing sessions; name it, don't configure it.
- **`BETTER_AUTH_URL`** — the public origin of the app (`http://localhost:3000` in dev, `https://app.example.com` in prod). Better Auth uses it to compute redirect URLs and cookie scope. It's the same value that becomes the server instance's `baseURL`.

Wire into env validation — **this is the code-conventions alignment point.** The project validates env through **`@t3-oss/env-nextjs` + Zod in `src/env.ts`** (Ch 034), *not* raw Zod in `lib/env.ts` as a naive reading might suggest. Show the additions to the existing `env.ts`:
- `BETTER_AUTH_SECRET` joins the **server** schema as `z.string().min(32)`.
- `BETTER_AUTH_URL` joins the **server** schema as `z.string().url()`.

Use **`CodeVariants`** or `AnnotatedCode` to show these slotting into the existing `server: { ... }` block alongside `DATABASE_URL` and `RESEND_API_KEY` (already present from earlier units) — the pedagogical point is *they go in the server half, never `NEXT_PUBLIC_*`*. Annotate that the build refuses to boot without them, the same guarantee `DATABASE_URL` already gives.

Senior watch-out, stated inline (not bundled): never prefix the secret `NEXT_PUBLIC_*` — that ships it to the browser bundle. The `server`/`client` split in `env.ts` is the structural guard; the `@t3-oss/env-nextjs` layer throws if a server var is read from client code.

Per-environment values: one line that prod/preview/dev each get their own secret via Vercel project envs — a leaked staging secret must not be able to forge prod sessions. (Full rotation/ops is out of scope; this is the "split from day one" seed.)

`Term` candidate: **HMAC** is *not* needed (the docs say "encryption, signing, hashing" — keep it at that level, don't over-specify the primitive). **entropy** could get a `Term` if it reads as jargon to this audience.

### The server auth instance — `lib/auth.ts`

The center of the lesson. This file is the single source of truth for server-side auth config; everything else references it.

Lead with the file's two non-config lines that the student must adopt as reflexes:
- `import 'server-only';` as the **first line** (side-effecting import, per the import-ordering convention). Re-teach in one sentence (Ch 030's pattern, same as `db/index.ts`): it's a compile-time guard that turns an accidental client import into a build error instead of a leaked server bundle. This is the same reflex they already apply to the DB client — frame it as "auth gets the same treatment, for the same reason."

Then the instance itself. Use **`AnnotatedCode`** — this is the canonical "one complex block, direct attention to each part" case. Walk the config option by option:

```ts
import 'server-only';

import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { nextCookies } from 'better-auth/next-js';

import { db } from '@/db';
import { env } from '@/env';

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: 'pg' }),
  plugins: [nextCookies()],
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.BETTER_AUTH_URL,
});
```

`AnnotatedStep` sequence:
1. `import 'server-only';` — the guard (color: red/violet to mark "boundary").
2. The three `better-auth/*` imports — map each to its sub-path (callback to the install section's index).
3. The `@/db` and `@/env` imports — reusing existing infra; the instance composes the db client and the validated env, doesn't invent its own.
4. `database: drizzleAdapter(db, { provider: 'pg' })` — **named, not taught.** State plainly: this is how Better Auth persists into the existing Postgres; the adapter's mechanics and the four tables it needs are **next lesson**. It's here so the import resolves and the instance is complete. (color: grey/neutral to signal "deferred").
5. `plugins: [nextCookies()]` — **the load-bearing line.** This is where the lesson plants the inoculation. Explain: in Next.js, `Set-Cookie` headers emitted from inside a Server Action don't automatically attach to the action's response. `nextCookies()` intercepts them and attaches them via Next's `cookies()` helper. Without it, sign-up and sign-in run, the session row gets created, but **the cookie never reaches the browser** — the canonical "I called signUp and nothing happened" failure, which surfaces in Chapter 053. Color this step prominently (orange/red). One sentence on *why it's a plugin and not default*: Better Auth is framework-agnostic; the Next.js cookie behavior is opt-in via the plugin. Also state the ordering rule (verified against current docs): **`nextCookies()` must be the *last* plugin in the array** — it has to run after other plugins so it captures every `Set-Cookie` they emit. It's the only plugin in this lesson, but the habit matters because Unit 9's organization plugin and others will sit *before* it later.
6. `secret: env.BETTER_AUTH_SECRET` and `baseURL: env.BETTER_AUTH_URL` — pulled from validated env. Note (one line): Better Auth would auto-read these from the `BETTER_AUTH_SECRET`/`BETTER_AUTH_URL` env vars even if omitted, but passing them explicitly from `env` makes the config legible and routes through the validation layer — the senior call is explicit over implicit-magic.

After the walkthrough, name the **`SESSION_COOKIE_PREFIX` export** as a forward reference: per project convention `lib/auth.ts` will also export a `SESSION_COOKIE_PREFIX` constant so `proxy.ts` and any cookie reader match the configured prefix without restating the literal — but the cookie prefix itself (`__Host-`) is configured in **lesson 3** (cookie hardening), so it doesn't appear here yet. One sentence; don't pre-build it. (Rationale: the code-conventions file mandates this export; flag its existence so the file shape is honest, but keep lesson 1 minimal.)

Close with the **`BetterAuthOptions` scope statement** — a short prose list (or tiny two-column layout) of what the options surface holds and what this chapter touches when:
- This lesson: `database`, `secret`, `baseURL`, `plugins`.
- Lesson 3: `session`, `advanced` (cookie tuning).
- Chapter 053: `emailAndPassword`, `socialProviders`, `emailVerification`, `account`.
- Named once, defaulted: `trustedOrigins` — Better Auth's CSRF allowlist, defaults to the `baseURL` origin; only widened if a non-same-origin client (mobile/extension) appears. Don't configure it here.

Goal: the student sees the instance as a small, growable config object and knows the growth schedule — defuses "is this all of it?" anxiety.

`Term` candidates: **plugin** (Better Auth term: a module that extends the instance's behavior and schema), **adapter** (the layer that maps Better Auth's storage calls onto a specific database/ORM).

### The catch-all route — `app/api/auth/[...all]/route.ts`

Short section, big concept. The whole file is two meaningful lines:

```ts
import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { GET, POST } = toNextJsHandler(auth);
```

Use plain **`Code`** (the block is small and the teaching is about the *route*, not line-by-line config). The `{ GET, POST }` order matches the current docs verbatim (destructuring is order-independent, but match the canonical shape). Then teach:

- **What `[...all]` guarantees** (callback to Ch 029's catch-all segments, re-stated in one sentence): the segment matches *every* path under `/api/auth/` — `/api/auth/sign-in/email`, `/api/auth/sign-up/email`, `/api/auth/callback/google`, `/api/auth/session`, and dozens more. Better Auth's internal router dispatches on the rest of the path. **One file exposes the entire auth API.**
- **`toNextJsHandler(auth)`** returns an object with `GET` and `POST` handlers; the destructuring export is the canonical two-line Better Auth shape (per code conventions: "two-line body, the canonical Better Auth shape").
- **The senior reflex:** never hand-write individual `route.ts` files for sign-in / sign-up / callback. The catch-all *is* the contract the client and framework agree on; the browser `authClient` POSTs to paths under this mount, and they only resolve because the catch-all is there.

Optional small **list/table** enumerating a handful of the endpoints the single file serves (sign-up, sign-in, sign-out, session, OAuth callback) so the "one file, whole API" claim lands concretely. Keep it short — full endpoint enumeration is Chapter 053's job.

Watch-out, inline: mounting under a non-`/api/auth` path without updating the client `baseURL`/`basePath` means the client POSTs to a 404 and the UI fails silently. Keep the default path.

`Term` candidate: **route handler** (App Router file that exports HTTP-method functions — re-teach in the tooltip, one line).

### The browser client — `lib/auth-client.ts`

The fourth file. The React client that browser-side surfaces (sign-in forms, session UI) call.

```ts
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient();
```

Use **`Code`** (small block). Teach:

- **What it provides** (named, full enumeration deferred to 053): `authClient.signIn.email(...)`, `authClient.signUp.email(...)`, `authClient.signOut()`, `authClient.useSession()`, and the rest of the browser-callable surface. Each one POSTs/GETs to the catch-all route under the hood — the client is a typed wrapper over HTTP calls to `/api/auth/*`.
- **`baseURL` is optional.** It defaults to the **current origin**, which is correct for this single-origin Next.js SaaS, so the call is bare. State the rule: omit `baseURL` for same-origin; set it explicitly only when the auth server lives on a different origin than the browser app. (This corrects the chapter-outline draft that passed `process.env.NEXT_PUBLIC_APP_URL` — unnecessary for single-origin and adds a config surface that can drift. Note for downstream agents: bare `createAuthClient()` is the deliberate, simpler shape.)
- **No `'use client';` on this file, but no `server-only` either** — it's a plain module importable from Client Components. Contrast with `lib/auth.ts`'s `server-only` to reinforce the boundary. (Per code conventions: "No Node-only code.")

`Term` candidate: none new needed here.

### Where to call what — `auth.api` on the server, `authClient` in the browser

The reflex-building section. This is the conceptual payoff that prevents the most common misuse of the library. Lead with the rule, then justify it.

**The rule:**
- **Server side** (Server Components, Server Actions, route handlers, `proxy.ts`): call `auth.api.*` — e.g. `auth.api.getSession({ headers: await headers() })`. In-process, no HTTP.
- **Browser side** (Client Components): call `authClient.*` — e.g. `authClient.signIn.email(...)`. Goes over HTTP to the catch-all route.

Show the **mirror** concretely — the names parallel each other because they hit the same endpoints via different transport. A tiny two-column **`TabbedContent`** or a `CodeVariants` "Server | Client" pairing:
- Server: `await auth.api.signUpEmail({ ... })`
- Client: `await authClient.signUp.email({ ... })`

Both reach `POST /api/auth/sign-up/email`; the difference is *who's calling and how*. (Note: keep these as illustrative shape — the actual sign-up call is Chapter 053; mark it so downstream agents don't treat it as the teaching target here.)

**Why the boundary is hard, not soft:**
- Importing `auth` into a Client Component would bundle the server library (and its DB access, and the secret-reading env) into the browser — `server-only` turns this into a build error. Callback to the orientation diagram: the server path is in-process; the client physically cannot make an in-process call into server code.
- Importing `authClient` into a Server Component is the inverse mistake — it's a browser-transport module; on the server you already have the direct `auth.api` path, so reaching for the HTTP client server-side is both wrong and slower.

The senior framing to leave them with: **"server reads identity with `auth.api`; the browser triggers auth actions with `authClient`."** This is the durable mental model; the specific method names come later.

Forward-reference (one line each, don't expand): the `getSession` call shape and the `getCurrentUser`/`requireUser` helpers that wrap it are **lesson 4**; the full `useSession` client hook story is **Chapter 053**. This section establishes *which side calls which object*, not the call signatures.

**Exercise — `Buckets` classification.** This concept is exactly what a sort-into-categories drill checks. Two buckets: "Call `auth.api`" and "Call `authClient`." Items to sort: a Server Action reading the current user; a sign-in form button handler in a `'use client'` component; `proxy.ts` checking for a session; a header avatar in a Client Component; a route handler returning the session; a Server Component layout gating on sign-in. Grading: each item maps to one bucket by *where it runs*. This is a high-value, low-friction check that directly rehearses the lesson's central reflex. (Rationale: the boundary is the #1 confusion with this library; an interactive sort beats a passive warning.)

`Term` candidates: **transport** (how a call travels — in-process function call vs. HTTP request) if it reads as jargon.

### Proving the wiring — the smoke test

The closer. The whole lesson has produced files but no observable behavior; this section makes the wiring *visible*.

Use a **`Steps`** block:
1. Ensure env vars are set (`BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`).
2. Run the dev server (`pnpm dev`).
3. Hit **`GET /api/auth/session`** — in the browser, or `curl http://localhost:3000/api/auth/session`.
4. Observe the response: **`null`** (no session cookie present → no session).

**Correction baked in:** the smoke test endpoint is **`/api/auth/session`**, *not* `/api/auth/ok`. (Research note: the chapter-outline draft offered `/api/auth/ok` as a health endpoint, but it isn't reliably documented; `GET /api/auth/session` is the dependable, documented probe. Downstream agents: use `/api/auth/session`.)

Teach what the `null` *proves*: the catch-all route is mounted and dispatching, the env vars resolved (the instance constructed without throwing), and the server/client wiring is sound. The `null` is the *correct* answer — there's no sign-in surface yet, so there's no session to find. Frame it as a green light, not an anticlimax: "the plumbing is connected; Chapter 053 turns on the water."

Note the dependency on next lesson honestly: the *first time a session is actually created* (sign-up), the `user`/`session` tables must exist — that's lesson 2's migration. The smoke test here only exercises the read path on an empty/anonymous request, which doesn't require the tables, so it works now. (One sentence — prevents a student from expecting sign-up to work yet.)

Optional `Aside` (caution): if `/api/auth/session` 404s, the catch-all file is misplaced or misnamed (`[...all]`); if the server crashes on boot, an env var is missing — the `@t3-oss/env-nextjs` error names which one.

### Recap and what comes next

Brief close. Bullet the four files + two env entries the student now has, restate the two reflexes (`nextCookies()` is non-negotiable; `auth.api` server / `authClient` browser), and preview lesson 2: the Drizzle adapter named here gets wired for real, and the four canonical tables (`user`, `session`, `account`, `verification`) get generated and migrated so sign-up has somewhere to write.

Optional `ExternalResource` LinkCards: the Better Auth **Installation** and **Next.js integration** docs pages. Keep to two, official only.

---

## Scope

**This lesson covers:** installing `better-auth`; the server `auth` instance with `server-only`, the Drizzle adapter line (named only), `nextCookies()`, `secret`, `baseURL`; the catch-all route handler via `toNextJsHandler`; the browser `authClient`; the two env entries in the validated `env.ts`; the server-vs-client call split; a `GET /api/auth/session` smoke test.

**Explicitly deferred (do not teach here):**
- **The Drizzle adapter internals and the four tables** (`user`/`session`/`account`/`verification`), the Better Auth CLI schema generation, and the first migration — **lesson 2 of this chapter.** Lesson 1 names the adapter line so the instance compiles; it does *not* explain how the adapter maps storage, what tables it needs, or run any migration.
- **Session config** — `expiresIn`, `updateAge`, `freshAge`, the cookie cache, and `advanced.cookies` / the `__Host-` `cookiePrefix` — **lesson 3 of this chapter.** The instance here has no `session` or `advanced` block. The `SESSION_COOKIE_PREFIX` export is *named* as part of the file's eventual shape but its value (the prefix) is set in lesson 3.
- **`auth.api.getSession({ headers })` call shape, `React.cache`-wrapped `getCurrentUser`/`requireUser` helpers, and the minimum `proxy.ts` gate** — **lesson 4 of this chapter.** This lesson establishes *which object each side calls*; lesson 4 establishes the *call signature and the helpers*.
- **Email/password and social-provider config, `useSession` in depth, the full browser-callable method surface** — **Chapter 053.** The `signIn`/`signUp` method names appear here only as illustrative shape for the server/client mirror, marked not-the-teaching-target.
- **`trustedOrigins` configuration, secret rotation ops, the production proxy matcher** — named once at recognition level; configured elsewhere (053/054, ops chapters).

**Prerequisites to redefine concisely (one line each, don't re-teach):**
- **Catch-all route segment** (`[...all]`) — Ch 029. A dynamic segment matching every path below it.
- **`import 'server-only';`** — Ch 030. Compile-time guard; accidental client import becomes a build error.
- **Validated env via `@t3-oss/env-nextjs` + Zod in `src/env.ts`** — Ch 034. The `server`/`client` split; build fails on missing/invalid vars.
- **The Drizzle `db` client** — Unit 5 (Ch 036). Already exists with its own `server-only`.
- **Server Actions and `proxy.ts`** (renamed from `middleware.ts` in Next.js 16) — Ch 033/034. Named, not explained.
- **Opaque session in a `__Host-` cookie** — Ch 051 L2. The concept this lesson's instance will (eventually) implement; connect back, don't re-derive.

---

## Notes for downstream agents (corrections from fact-check)

- **Smoke test endpoint is `GET /api/auth/session`**, returning `null` when unauthenticated. Do **not** use `/api/auth/ok` — it isn't reliably documented.
- **Secret generation:** `openssl rand -base64 32` is the canonical command. The Better Auth installation docs page also has a one-click generator. Do **not** assert a `npx @better-auth/cli secret` subcommand — unverified.
- **`createAuthClient()` is called bare** (no `baseURL`) for this single-origin app — deliberately simpler than the chapter-outline draft's `baseURL: process.env.NEXT_PUBLIC_APP_URL`.
- **Env lives in `src/env.ts` via `@t3-oss/env-nextjs` + Zod**, both vars in the **server** schema — not raw Zod in `lib/env.ts`.
- **Server `betterAuth()` legitimately accepts both `secret` and `baseURL`** (verified against the options reference); passing them from validated `env` is the chosen explicit form.
- **`secrets` (plural) / `BETTER_AUTH_SECRETS`** is the rotation mechanism — name it, don't configure it.
- All real Better Auth API (`betterAuth`, `createAuthClient`, `toNextJsHandler`, `nextCookies`, `drizzleAdapter`) **first appears in this lesson** — Chapter 051 was conceptual sketch only. The `signUp`/`signIn` method names used in the server/client mirror are illustrative shape (real usage is Chapter 053); mark them so they aren't mistaken for this lesson's teaching target.

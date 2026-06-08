# Lesson 5 — Gate the protected surface

## Lesson title

Chapter-outline title "Gate the protected surface" fits — it names the senior payoff (the gate) and the surface it protects. Keep it.

- Page title: `Gate the protected surface`
- Sidebar (short): `Protected surface`

## Lesson type

`Implementation`

(Final lesson of the chapter. The test-coder runs and fills `tests/lessons/Lesson 5.test.ts`; the writer renders the Implementation section list.)

## Lesson framing

The student installs the two-layer request-time gate that turns the auth spine into a real access boundary: a cookie-presence check at the proxy that runs on every matched request without touching the database, and a validating session read in the protected layout that catches the stale cookie the proxy waves through. They wire the inverse gate (signed-in users bounced off the auth pages) and a sign-out Server Action that deletes the `session` row — making the opaque-server-session model from Ch051 concrete: the row's absence *is* the revocation. The senior decision installed is *why two layers, not one* — the proxy must stay cheap (no DB read per prefetch), so the authoritative check lives one layer deeper. This closes the flow end to end; the project's promised runnable state is reached here.

## Codebase state

### Entry

The full auth spine works through sign-in. `lib/auth.ts` exports the configured `auth` instance, `SESSION_COOKIE_PREFIX`, and the `getCurrentUser()` / `requireUser()` read ladder (written in L2, exercised for the first time here). Sign-up creates rows and redirects to `/verify-email` (L2); the verification email verifies and auto-signs-in (L3); sign-in refuses unverified users and sanitizes `?next=` via `safeNext` (L4). But `/dashboard` is still ungated: `src/proxy.ts` is an empty stub, `src/app/(protected)/layout.tsx` returns `<>{children}</>` with no nav or gate, `dashboard/page.tsx` renders a static `<h1>Dashboard</h1>`, and `src/app/(protected)/sign-out-action.ts` is an empty stub. `tests/lessons/Lesson 5.test.ts` is a `describe.todo` placeholder. Provided and unchanged: `src/lib/redirects.ts` (`safeNext`), the `(protected)/dashboard/loading.tsx` skeleton, the shadcn `Button`.

### Exit

The gate is live. `proxy.ts` reads `getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX })` and exports the `config.matcher`; signed-out `/dashboard` hits redirect to `/sign-in?next=%2Fdashboard`, signed-in `/sign-in` and `/sign-up` hits bounce to `/dashboard`. The protected `layout.tsx` runs `requireUser('/dashboard')` inside an async `AppNav` under `<Suspense>`, renders the user's email beside a `<form action={signOutAction}>` sign-out button, and wraps `{children}` in `<main>`. `dashboard/page.tsx` reads `getCurrentUser()` (a React-`cache` hit, no second DB round trip) and greets the user by name. `sign-out-action.ts` calls `auth.api.signOut({ headers })` then `redirect('/sign-in')`. The chapter's runnable end state is reached. No further deferrals.

## Lesson sections

Implementation section order from the contract: intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: `/dashboard` is reachable only when signed in, signed-in users are kept out of the auth pages, and signing out deletes the session row. Then a short paragraph (or screenshot strip via `Screenshot` in `TabbedContent` if shots exist under `public/screenshots/055/`) describing the working end state: a signed-out `/dashboard` visit redirects to `/sign-in?next=%2Fdashboard`; signing in lands on `/dashboard` with a nav showing the user's email and a sign-out button; a signed-in `/sign-in` visit bounces to `/dashboard`; sign-out deletes the `session` row, clears the cookie, returns to `/sign-in`. Name that this is the runnable end state the project promised.

### Your mission

Prose-only brief, no implementation hints, no subsection headers. Weave the capability and the constraints into a coherent paragraph:

- **Feature** (user terms): protect `/dashboard` so only signed-in users reach it, keep signed-in users off the auth pages, and give them a working sign-out.
- **Constraints to surface** (the senior decisions, not the code):
  - The proxy runs on *every* matched request including prefetches, so it must stay cheap — cookie-presence only, never a `getSession` DB read. Collapsing the two layers is the exact mistake the Ch054 two-layer rule exists to prevent.
  - The authoritative validating read lives one layer deeper, in the protected layout, as defense-in-depth: a stale cookie the proxy honors still gets caught when the session is genuinely gone.
  - Sign-out is a `<form action={…}>` Server Action, not an `onClick` fetch — progressive enhancement holds and the redirect lands cleanly without JS.
  - The `session` row's deletion is the revocation — the opaque-server-session model from Ch051 made real.
  - The matcher stays explicit; every protected segment added later needs both a matcher entry and a `requireUser()` call in its layout.
- **Out of scope:** nothing new is deferred — this is the final lesson and it closes the flow end to end. (Pre-ship hardening is *named* in Coding time, not built.)

Then the **Functional requirements** as a numbered list, each tagged `[tested]` / `[untested]`. Phrase each as an observable outcome, never as a file or export. Render with `Checklist` / `ChecklistItem` carrying the `tested`/`untested` chip.

1. A signed-out request to `/dashboard` redirects to `/sign-in?next=%2Fdashboard`, and signing in returns to `/dashboard`. `[tested]`
2. A signed-in request to `/sign-in` or `/sign-up` is redirected to `/dashboard` without rendering the form. `[tested]`
3. Clicking sign-out deletes the `session` row for that token from Postgres and redirects to `/sign-in`; refreshing `/dashboard` afterward redirects again. `[tested]`
4. A signed-in `/dashboard` renders a nav strip showing the user's email alongside a sign-out button, with the user's name in the page body. `[untested]`
5. Sign-out clears the `__Host-` session cookie (DevTools shows it gone). `[untested]`
6. `proxy.ts` performs cookie-presence only — it never imports or calls `auth.api.getSession`. `[untested]`

(Note for the test-coder: assertions target observable behavior — the redirect Location/landing path, the inverse-gate bounce, and the `session`-row count dropping to zero after sign-out. Requirements 4–6 are structural or UI-shape and stay solution-only.)

### Coding time

One line directing the student to implement against the brief and the tests, then the reference solution hidden in `<details>` (the writer wraps it). Organize as it appears in the repo. Use `Code` for each file; reach for `AnnotatedCode` on `proxy.ts` to spotlight the three load-bearing parts (the `cookiePrefix` arg, the two branch conditions, the `config.matcher`). No `CodeVariants` needed.

Reference implementation, in repo order:

- **`src/proxy.ts`** — `import { getSessionCookie } from 'better-auth/cookies'`, `import { type NextRequest, NextResponse } from 'next/server'`, `import { SESSION_COOKIE_PREFIX } from '@/lib/auth'`. `export async function proxy(request: NextRequest)`: read `getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX })`; compute `path = request.nextUrl.pathname`, `isProtected = path.startsWith('/dashboard')`, `isAuthPage = path === '/sign-in' || path === '/sign-up'`; if `isProtected && !cookie` redirect to `/sign-in?next=` + `encodeURIComponent(path + request.nextUrl.search)`; if `isAuthPage && cookie` redirect to `/dashboard`; else `NextResponse.next()`. `export const config = { matcher: ['/dashboard/:path*', '/sign-in', '/sign-up'] }`.
  - Rationale callouts: the named export must be `proxy` (Next.js 16 dispatches on the exact name). The `cookiePrefix` arg is **mandatory** — the `better-auth` default silently misses the `__Host-` cookie and bounces signed-in users in production; this is the canonical silent failure to pre-empt. Importing `SESSION_COOKIE_PREFIX` from `lib/auth` rather than re-typing the literal prevents drift between where the cookie is set and where it is read.
- **`src/app/(protected)/layout.tsx`** — keep the default-exported `ProtectedLayout` body sync; put the request-time read in an inner async `AppNav` rendered under `<Suspense>` so the co-located `loading.tsx` covers the children, not the gate. `AppNav` calls `const user = await requireUser('/dashboard')`, then renders the nav strip with `{user.email}` and `<form action={signOutAction}><Button type="submit">Sign out</Button></form>`. `<main>{children}</main>` follows.
  - Rationale callout: the layout is the validating read (defense-in-depth for a stale cookie cache the proxy waved through). The `<Suspense>` boundary keeps the gate out of the streamed-children fallback.
- **`src/app/(protected)/dashboard/page.tsx`** — read `getCurrentUser()` and render the name + email greeting. Callout: this is a second `getSession` in the same request, served from the React-`cache` — no extra DB round trip.
- **`src/app/(protected)/sign-out-action.ts`** — `'use server'`; `export const signOutAction = async () => { await auth.api.signOut({ headers: await headers() }); redirect('/sign-in'); }`. Callout: `signOut` clears the cookie and deletes the `session` row in one call; the row's absence is the revocation.

Cover the `[untested]` requirements in prose: req 4 (nav-strip shape: email in the nav, name in the body), req 5 (sign-out clears the `__Host-` cookie via `auth.api.signOut`), req 6 (the proxy's cookie-only discipline and why no `auth` import appears in `proxy.ts`). Explain the two-layer split and its defense-in-depth payoff, why sign-out is a form action not an `onClick` fetch, and the matcher-plus-`requireUser` rule for future protected segments. Add the observability callout: inspecting the Drizzle query log on a signed-in `/dashboard` request shows one session read per request, served from the cookie cache inside the 5-minute window most of the time.

For the two-layer-gate rationale, the matcher pattern, and the open-redirect reasoning behind `?next=`, link to Ch054 L1 (and Ch051 L2 for the opaque-session model) rather than re-explaining.

After the solution `<details>` (no header — this is the chapter's last lesson, so place the forward-looking close here): name the pre-ship checklist as *named, not built* — rotate `BETTER_AUTH_SECRET` on a cadence and on staff turnover; wire Resend bounce/complaint webhooks (Ch065 owns the handler) to write `email_suppressions`; add rate limits to sign-in / sign-up / verify-resend (Ch074) before a public URL. Then point forward: Ch053's chapter material layers magic links, TOTP, passkeys, and OAuth on this same schema; Ch054 L2's credential-change tier reads the `freshAge` knob set in L2; Ch054 L3's active-sessions list reads the `ipAddress` / `userAgent` columns `session` already populates; Unit 9 wraps `requireUser` with org scoping; Unit 10's list views call `requireUser()` in their server reads. (Use an `Aside` or plain prose; the resourcer appends external resources here later.)

**Diagram (optional but warranted).** A small `flowchart LR` (Mermaid, per the diagram index for decision/flowchart shape) inside a `<Figure>` clarifies the two-layer request path that prose carries awkwardly: an incoming request → proxy cookie check (branch: protected+no-cookie → redirect `/sign-in?next=`; auth-page+cookie → redirect `/dashboard`; else continue) → layout `requireUser()` validating read (branch: no session → redirect `/sign-in`; else render). Keep it horizontal and capped in height. Place it in Coding time alongside the `proxy.ts` and `layout.tsx` walkthrough. Optional — drop if the prose + `AnnotatedCode` already carry the flow.

### Moment of truth

- Test command: `pnpm test:lesson 5`. Expected: all pass, covering the signed-out redirect with `?next=`, the inverse gate, and the sign-out session-row deletion.
- By-hand checklist (the requirements the tests don't cover), rendered with `Checklist`:
  - Signed out, `/dashboard` redirects to `/sign-in?next=%2Fdashboard`; signing in lands back on `/dashboard`.
  - Signed in, visiting `/sign-in` bounces to `/dashboard`.
  - After sign-out, Studio shows the `session` row gone, DevTools shows the cookie cleared, and refreshing `/dashboard` redirects again.
  - `proxy.ts` imports `getSessionCookie` only — no `auth` import, no `auth.api.getSession` call.
  - With two browsers signed in as the same user, signing out of one and refreshing the other redirects to `/sign-in` once the cookie-cache window lapses (the Ch054 L3 trade-off).

## Scope

- Does not introduce or re-derive the two-layer gate concept, the matcher pattern, or the open-redirect closure on `?next=` — Ch054 L1 owns those; this lesson *applies* them and the L4 `safeNext` guard.
- Does not implement rate limiting on the auth endpoints — Ch074 owns it (named in the pre-ship close).
- Does not implement bounce/complaint webhook ingestion into `email_suppressions` — Ch065 owns the handler.
- Does not add org scoping or the `authedAction` authz wrapper around `requireUser` — Unit 9 owns it.
- Does not build the credential-change elevation tier (`freshAge`) or the active-sessions list — Ch054 L2 / L3 own them; this lesson only ships the read ladder and session row they later consume.

sources:
  52.1: Wiring the auth instance
  52.2: Schema and the four core tables
  52.3: Session lifetimes and cookie hardening
  52.4: Reading the session everywhere with one call shape

questions:
  - source: 52.1
    question: |
      A teammate's sign-up Server Action runs cleanly — it returns a `200`, and the `user` and `session` rows appear in Postgres — but the user is never actually signed in: the next request is anonymous again. Their `auth.ts` is below.

      ```ts
      export const auth = betterAuth({
        database: drizzleAdapter(db, { provider: 'pg', schema }),
        secret: env.BETTER_AUTH_SECRET,
        baseURL: env.BETTER_AUTH_URL,
      });
      ```

      What's the fix?
    choices:
      - text: |
          Add the `nextCookies()` plugin (`plugins: [nextCookies()]`). Without it, the `Set-Cookie` header an action emits never attaches to the action's response, so the session cookie is created server-side and silently dropped — the rows exist, but the browser never gets the cookie.
        correct: true
      - text: |
          The `session` rows shouldn't be written by a Server Action at all — move the `signUp` call into the catch-all route handler so the cookie is set on a normal HTTP response.
        correct: false
      - text: |
          `baseURL` is being read from validated env instead of letting Better Auth auto-detect the request origin, so the cookie's `Domain` is wrong — drop `baseURL` and the cookie will attach.
        correct: false
    why: |
      This is the canonical "I called signUp and nothing happened" failure, and it's exactly what `nextCookies()` exists to prevent. In Next.js a `Set-Cookie` header produced inside a Server Action doesn't automatically ride the action's response — the plugin intercepts those headers and attaches them through Next's `cookies()` helper. Every individual piece looks like it worked, which is what makes it so baffling. (It also must be the *last* entry in the plugin array, so it captures the headers every other plugin emits.)

  - source: 52.1
    question: |
      You need to read the current user in each of these places. Pick **the two** that should call `authClient.*` rather than the server-side `auth.api.*`.
    choices:
      - text: |
          A sign-in form's submit handler inside a `'use client'` component.
        correct: true
      - text: |
          A header avatar in a Client Component that shows who's signed in.
        correct: true
      - text: |
          `proxy.ts` deciding whether to bounce a signed-out visitor.
        correct: false
      - text: |
          A Server Action reading the current user before a mutation.
        correct: false
    why: |
      The split is decided by one thing only: where the code runs. Browser tabs can't reach the server instance in memory, so Client Components go over HTTP through `authClient.*` — that's the sign-in form and the header avatar. Everything that runs in the server process — Server Actions, route handlers, layouts, and `proxy.ts` — holds the instance directly and calls `auth.api.*` in-process. Importing `auth` into client code would also fail the build, because `lib/auth.ts` leads with `server-only`.

  - source: 52.2
    question: |
      Better Auth stores no `password` column on the `user` table — the password hash lives on `account` instead, and it's nullable. Why is that the right decomposition?
    choices:
      - text: |
          A `user` is one identity; each `account` row is one way to prove it. A password is one proof method (alongside Google, GitHub, …), so it belongs on the proof row and is null for OAuth-only accounts. "Change password" updates one `account` row, "link Google" inserts one — and the `user` row never moves.
        correct: true
      - text: |
          Hashes are large, so splitting them onto `account` keeps the `user` table narrow and faster to scan — it's a storage-layout optimization, and the column is nullable only to save space on OAuth rows.
        correct: false
      - text: |
          The `password` lives on `account` so it can cascade-delete independently of the user; making it nullable lets a user temporarily detach their password without deleting their identity.
        correct: false
    why: |
      The model is "one identity, many proofs." The `user` row is who you are and stays fixed; each `account` row is one way to prove it. A credential account carries the (scrypt-hashed) password; a Google account has none, so `password` is null. That's why the column is nullable and why it can't live on `user` — putting it there would assume every identity has exactly one proof, which breaks the moment someone links a second login method. It's not a storage trick, and `account.userId` cascades from `user`, not the other way around.

  - source: 52.2
    question: |
      Better Auth ships its own `npx @better-auth/cli migrate` that can create the four tables directly. This stack never uses it — generate the schema with the CLI, but migrate with Drizzle Kit, always. What breaks if you let both tools touch the database?
    choices:
      - text: |
          You'd have two tools writing schema with two separate, conflicting ideas of the database's current state — so the migration history lies and the schema drifts out of sync with what's checked in. One generator, one migrator, no overlap.
        correct: true
      - text: |
          Better Auth's `migrate` skips the unique index on `session.token`, so the per-request session lookup loses its index and the hot path slows down.
        correct: false
      - text: |
          The two tools hash passwords differently, so credential accounts created before the switch can no longer sign in.
        correct: false
    why: |
      Drizzle Kit owns migrations end to end precisely so there is one ordered history that describes every change the database has undergone — and that history is only trustworthy if nothing else writes schema behind its back. Run Better Auth's `migrate` alongside it and you get two conflicting sources of truth, a history that lies, and silent drift. The contract is: generate with the Better Auth CLI (it writes the table definitions the library demands), migrate with Drizzle Kit, never both.

  - source: 52.3
    question: |
      A user signed in this morning and has been clicking around the app all afternoon. When they click "change password," the action re-prompts for their password even though they're plainly active. With `freshAge` set to 10 minutes, why?
    choices:
      - text: |
          `freshAge` is measured from when the session was *created* — sign-in this morning — not from the last activity. The session is well past its 10-minute fresh window, so the destructive action demands a re-authentication regardless of how recently the user clicked something.
        correct: true
      - text: |
          The session crossed its `updateAge` boundary, which expired the fresh window; any click after `updateAge` forces a re-prompt on sensitive actions until the session is renewed.
        correct: false
      - text: |
          The `expiresIn` wall is approaching, and Better Auth re-prompts for the password on sensitive actions once the session is within `freshAge` of absolute expiry.
        correct: false
    why: |
      There are three independent clocks, and `freshAge` is the one beginners miss. Freshness is timed from `createdAt` — when the session was created — not from the user's last action. So an all-afternoon-active user whose session was created this morning is *not* fresh, and destructive actions (change password, change email, disable 2FA) re-prompt. `updateAge` is the unrelated sliding-renewal clock that pushes `expiresIn` out; it has nothing to do with the freshness check.

  - source: 52.3
    question: |
      The course configures the production session cookie with `cookiePrefix: '__Host-better-auth'`. What does naming the cookie with the `__Host-` prefix actually buy you?
    choices:
      - text: |
          The browser refuses to store the cookie unless it's `Secure`, has `Path=/`, and carries no `Domain` — turning tight scoping from something you must remember into something the platform enforces. It's a browser contract, not a Better Auth feature.
        correct: true
      - text: |
          Better Auth signs the cookie value with a host-bound key, so the opaque token can only be replayed from the same host that issued it.
        correct: false
      - text: |
          It enables cross-subdomain session sharing, so one login works across `app.example.com` and `admin.example.com` without extra config.
        correct: false
    why: |
      `__Host-` is a contract the *browser* enforces: it will simply not store a `__Host-`-named cookie unless it's `Secure`, scoped to `Path=/`, and has no `Domain` attribute. That makes a whole class of attacks impossible by construction — nobody can downgrade it to non-`Secure` or widen its scope to a sibling domain. It's the opposite of cross-subdomain sharing: sharing across subdomains needs a `Domain` attribute, which `__Host-` forbids, so the two are mutually exclusive. (It's also why dev relaxes to a plain prefix — `__Host-` can't be set over `http://localhost`.)

  - source: 52.4
    question: |
      To dedupe the per-request session read, a developer wraps it like this:

      ```ts
      const getSession = async () => {
        'use cache';
        return auth.api.getSession({ headers: await headers() });
      };
      ```

      What's wrong with it?
    choices:
      - text: |
          `'use cache'` persists across requests and across users, and its key is built from arguments and captured values — the cookie isn't one of them. So user B can be handed the entry computed for user A: an account-takeover bug. Per-request session reads belong in `React.cache`, which is request-scoped and discarded when the request ends.
        correct: true
      - text: |
          `'use cache'` can't wrap an `async` function, so the read never resolves — switching to `React.cache` is required only because it supports Promises.
        correct: false
      - text: |
          Nothing is functionally wrong, but `'use cache'` is slower than `React.cache` for per-request work, so it's just a performance regression.
        correct: false
    why: |
      `React.cache` and `'use cache'` look similar and are catastrophically different here. `React.cache` is request-scoped: it dedupes within one request and throws the result away when the request ends, so the next request reads its own cookie. `'use cache'` is cross-request and cross-user, and its cache key is derived from arguments and captured values — the request's cookie isn't captured, so the cached `{ user, session }` for one user can be served to another. That's not a slow page; it's account takeover. Session reads always use `React.cache`.

  - source: 52.4
    question: |
      `proxy.ts` gates `/dashboard` by calling `getSessionCookie(request, { cookiePrefix: SESSION_COOKIE_PREFIX })` and bouncing when no cookie is found — it never calls `auth.api.getSession` to validate the session, even though the Node-runtime proxy could. Why is that the deliberate, correct design?
    choices:
      - text: |
          The proxy is an optimistic, cheap presence check — a bouncer confirming you're *holding* a ticket, not that it's genuine. Real validation and every authorization decision happen later against the database (e.g. `requireUser()` in the layout), which also avoids trusting the cookie cache, which can be stale for minutes after a revocation.
        correct: true
      - text: |
          The proxy runs on the edge runtime, which can't reach Postgres, so a full `getSession` read is impossible there — cookie-presence is the only option available.
        correct: false
      - text: |
          A presence check is more secure because it can detect a forged cookie that `auth.api.getSession` would mistakenly accept as valid.
        correct: false
    why: |
      The proxy is a fast, optimistic UX redirect, not the security boundary. It only asks "is a session cookie present?" and bounces if not; the genuine validation and all authorization happen downstream against the database, where the answer is never stale. This matters because the cookie cache from the previous lesson can hand back a stale session for a few minutes after a revocation — fine for an optimistic redirect, fatal if the proxy were the lock. (The Node runtime *could* run the full read; the old edge limitation is gone — and a presence check explicitly does *not* detect a forged cookie, which is why `requireUser` still runs inside.)

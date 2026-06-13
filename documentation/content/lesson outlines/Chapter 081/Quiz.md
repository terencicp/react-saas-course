sources:
  81.1: "Security headers"
  81.2: "Abusable-endpoint matrix"
  81.3: "The audit log policy"
  81.4: "Retention & erasure"
  81.5: "Consent gate"
  81.6: "Secrets and rotation"
  81.7: "The env schema"
  81.8: "Supply-chain defaults"

questions:
  - source: 81.1
    question: |
      The protected app shell ships a nonce-based CSP from `proxy.ts`, but the public marketing site (`example.com`) ships a *nonceless* CSP with every third-party origin listed by hand. Why does the marketing site get a different policy instead of the same nonce treatment?
    choices:
      - text: |
          A fresh per-request nonce forces a page to render dynamically, which would forfeit the static prerendering the marketing site wants for SEO and speed. The app shell is already dynamic (session, org, tenant), so the nonce costs it nothing — but on a static page it's a real loss, so you trade it for an explicit-origin list.
        correct: true
      - text: |
          `proxy.ts` only runs for authenticated routes, so it physically cannot attach a CSP to the public marketing pages — a nonceless policy in `next.config.ts` is the only mechanism available there.
        correct: false
      - text: |
          Marketing pages load third-party scripts and app pages don't, and `'strict-dynamic'` is incompatible with any external origin, so the marketing site must drop nonces to allow them.
        correct: false
    why: |
      The nonce is the one header in the lesson with a real cost: because the value differs on every request, a nonced page can't be served as one shared prerendered file. App pages were never static candidates (they read session and tenant data), so the nonce rides along free; marketing pages genuinely want to be static, so there you opt out and list origins explicitly instead. It isn't a `proxy.ts` limitation, and `'strict-dynamic'` is exactly the mechanism that lets a nonced root load further scripts.

  - source: 81.2
    question: |
      You're walking the endpoint inventory deciding which routes need a dedicated rate limiter. An authenticated, tenant-scoped `GET /invoices` list read costs nothing per call and can't be aimed at a victim. What's the correct call?
    choices:
      - text: |
          Leave it on the wrapper's coarse per-user/per-org default — no dedicated limiter. It matches none of the three triggers, and "a limiter on every endpoint" is the over-application mistake.
        correct: true
      - text: |
          Add a per-IP limiter — every public-facing route should be rate-limited, and per-IP is the safe default for reads.
        correct: false
      - text: |
          Add a dedicated per-user limiter in `lib/rate-limit.ts`, because any endpoint that touches the database is abusable.
        correct: false
    why: |
      A dedicated limiter is mandatory only when an endpoint matches at least one trigger: it costs money per call, it can attack a third party, or it touches state addressable without auth. An authenticated cheap list read hits none of those, so the coarse default is the whole defense — and a hand-rolled limiter here is noise that fragments analytics. A per-IP limit would be doubly wrong: on an *authenticated* action it trips whole offices behind one NAT address.

  - source: 81.3
    question: |
      A platform operator opens the cross-tenant audit-log view during an incident — gated by the `superadmin` role. According to the policy, what else must happen?
    choices:
      - text: |
          The read itself writes an `admin.audit-log-queried` row — reading the most sensitive table is a privileged action, so it gets audited like any other.
        correct: true
      - text: |
          Nothing extra — a read never earns an audit row, and the `superadmin` gate is the entire control.
        correct: false
      - text: |
          The operator's `pino` session is flagged, but no audit row is written, because writing one would violate the append-only rule.
        correct: false
    why: |
      The general rule "don't audit reads" has a sharp exception: a *privileged* read is itself the security event. An operator crossing tenant boundaries into the audit log writes its own `admin.audit-log-queried` entry, so there's no class of person who reads the table invisibly. The gate and the row are two halves of one control — and writing that row is an ordinary append, not a violation of append-only.

  - source: 81.4
    question: |
      A user invokes their right to erasure. Their account also has invoices you're legally required to retain for seven years. A teammate sets `deletedAt` on the invoice rows so they vanish from the user's views and calls the erasure satisfied. Why is that wrong?
    choices:
      - text: |
          Soft delete is a visibility tool, not an erasure tool — the email, name, and other PII are still sitting in the row. A legally-retained record must be soft-deleted *and* anonymized: hidden from view, with the PII scrubbed.
        correct: true
      - text: |
          The invoices should have been hard-deleted instead — legal retention doesn't override a verified erasure request.
        correct: false
      - text: |
          Setting `deletedAt` is fine for erasure; the only mistake is forgetting to also delete the rows from the nightly backup snapshots immediately.
        correct: false
    why: |
      Soft delete answers "should this still show up?", never "is the personal data gone?" A row with `deletedAt` set still holds every PII column. A row that has legal value (so it can't be hard-deleted) but must also leave the user's view needs both shapes: anonymize to strip the PII, soft-delete to hide it. Hard delete would destroy a legally-required record, and backups are allowed to catch up on their own bounded rotation — they're not deleted by hand.

  - source: 81.5
    question: |
      Sort each cookie or tracker by whether it can be set before the user has made any consent choice. (Select every one that is *essential* — set without consent.)
    choices:
      - text: |
          The cookie that records the user's consent choice itself.
        correct: true
      - text: |
          The Better Auth session cookie.
        correct: true
      - text: |
          PostHog product analytics.
        correct: false
      - text: |
          A marketing/ad pixel.
        correct: false
    why: |
      The test is "strictly necessary for the service the user explicitly asked for." The session cookie keeps them logged in, and the consent-choice cookie has to exist to remember the decision (you can't ask consent to store the record of consent — that's circular), so both are essential. Analytics and marketing pixels help the *business*, never the user's requested service, so they're never essential — no matter how useful they feel. In doubt, default to consent-required.

  - source: 81.6
    question: |
      A developer with production access leaves, so you rotate the `RESEND_API_KEY` they could see. Put the load-bearing ordering rule plainly: when do you revoke the old key at Resend?
    choices:
      - text: |
          Only after the new key is added to Vercel, deployed, and verified healthy. Updating Vercel first leaves a deliberate window where *both* keys are valid, so there's never an instant with no working key.
        correct: true
      - text: |
          First, before touching Vercel — invalidating the leaked key immediately is the priority, and the brief outage while the new key deploys is acceptable.
        correct: false
      - text: |
          At the same moment you add the new key to Vercel, so the two keys are never both valid at once.
        correct: false
    why: |
      Revoke-first is the classic self-inflicted outage: the old key is dead but the new one isn't deployed yet, so every request needing that secret fails. Vercel before provider, always — the overlap where both keys work is the safety margin, not a hazard. Rotation runs on events (offboarding, suspected leak, vendor-forced reset), not on a calendar.

  - source: 81.7
    question: |
      A production build fails because a required variable is missing. A teammate "fixes" it by setting `SKIP_ENV_VALIDATION=1` in the production runtime environment — the build goes green. What's the real consequence?
    choices:
      - text: |
          The env gate is now switched off in production for good: a genuinely missing variable no longer fails at deploy on the terminal — it surfaces as a 3am 500 on the first request that needs it, which is exactly the outage the schema existed to prevent.
        correct: true
      - text: |
          Nothing harmful — `SKIP_ENV_VALIDATION` only skips the *type* generation, so runtime values are still validated on first access.
        correct: false
      - text: |
          It's fine in production but breaks local builds, because the flag is only meant to be read in development.
        correct: false
    why: |
      `SKIP_ENV_VALIDATION` has exactly two legitimate homes — the Docker/container build (secrets injected at runtime) and a type-check/lint CI job. Setting it in the production runtime makes the escape hatch permanent: the whole gate is off, so a missing variable moves from a loud build failure to a silent first-request 500. It also skips Zod `.default()` values entirely. If the build says a variable is missing, the variable is missing — set it, don't silence it.

  - source: 81.8
    question: |
      A critical security patch for one package lands and it's only three hours old, so pnpm's 24-hour quarantine (`minimumReleaseAge: 1440`) is blocking the install. What's the correct way to get the patch in?
    choices:
      - text: |
          Add just that one package to `minimumReleaseAgeExclude` in `pnpm-workspace.yaml`, committed in the same PR so a reviewer sees it and it can be reverted once the version ages past the window.
        correct: true
      - text: |
          Set `minimumReleaseAge: 0` for this install — it's the documented way to pull a fresh release when you genuinely need one.
        correct: false
      - text: |
          Run the install with a one-off `--allow-fresh` flag so the bypass stays out of committed config.
        correct: false
    why: |
      A scoped exclude unblocks exactly one named package, is visible in the diff, and gets reverted later. `minimumReleaseAge: 0` removes the quarantine for *every* dependency in the tree, forever, and nobody remembers to restore it. pnpm 11 deliberately offers no per-command bypass flag precisely so the carve-out lands in reviewed config instead of one person's shell history — the exclude list is the only path, by design.

  - source: 81.8
    question: |
      A teammate argues that with `minimumReleaseAge`, `blockExoticSubdeps`, the install-script approval gate, and a frozen lockfile all on, running `pnpm audit` is redundant. What's the flaw in that reasoning?
    choices:
      - text: |
          Those config controls defend against *novel* attacks — versions nobody has flagged yet, unreviewed install scripts, drifting resolution. `pnpm audit` catches *already-known* vulnerabilities by checking installed versions against the advisory database. Different layers; a codebase needs both.
        correct: true
      - text: |
          It's a fair point — the config controls are a strict superset of what `pnpm audit` checks, so audit only matters before pnpm 11.
        correct: false
      - text: |
          The flaw is only that `pnpm audit` is needed for dev dependencies, which the config controls ignore.
        correct: false
    why: |
      Config defends against the unknown; audit defends against the known. The quarantine and script gate stop fresh, unflagged, or self-executing packages; `pnpm audit` (GHSA-keyed in 2026) finds packages whose versions have *since* been reported vulnerable — something no install-time default can know about. They cover disjoint threats, so neither replaces the other.

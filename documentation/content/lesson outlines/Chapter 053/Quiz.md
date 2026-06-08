sources:
  53.1: Password sign-up
  53.2: Password sign-in
  53.3: Email verification
  53.4: Password reset
  53.5: Magic links
  53.6: TOTP and recovery codes
  53.7: Passkeys and WebAuthn
  53.8: Social sign-in with OAuth
  53.9: Account linking

questions:
  - source: 53.1
    question: |
      You're configuring `emailAndPassword` and want users verified before they ever hold a session. A teammate suggests `requireEmailVerification: true` together with `autoSignIn: true` so people "land in the app faster." Why is that a broken state?
    choices:
      - text: |
          The two contradict each other: verification says "don't trust them until they confirm the inbox," while `autoSignIn` issues a session immediately — so the right pairing is `autoSignIn: false`.
        correct: true
      - text: |
          `autoSignIn` only works with OAuth providers, so it's silently ignored on an email-and-password sign-up.
        correct: false
      - text: |
          It's fine — `requireEmailVerification` overrides `autoSignIn`, so the user still won't get a session until they verify.
        correct: false
    why: |
      Verification on means auto-sign-in off. The whole point of `requireEmailVerification` is "credential stored, verification email queued, no session" — handing out a session at the same time defeats it. It also happens to be the same flag that keeps the taken-email path enumeration-safe.

  - source: 53.2
    question: |
      A sign-in endpoint needs to survive an attacker who rotates IP addresses to guess one known account's password. Which statement about Better Auth's out-of-the-box defenses is correct?
    choices:
      - text: |
          Core Better Auth ships only a per-IP rate limit — there is no built-in per-account lockout counter, so the per-email limit is a second key you add yourself.
        correct: true
      - text: |
          Better Auth ships both a per-IP limit and a per-account failed-attempt lockout, so an IP-rotating attacker is already stopped by default.
        correct: false
      - text: |
          Better Auth ships a per-account lockout but no per-IP limit, so credential stuffing from a single IP slips through until you add rate limiting.
        correct: false
    why: |
      The fact people get wrong: core Better Auth's brute-force story is the per-IP limiter and nothing more. IP rotation slips under it completely, which is exactly why the course adds a per-email key. Never strip that per-email limit "because users complain" — clear copy plus a reset link is the answer, not removing the defense.

  - source: 53.3
    question: |
      A user clicks the verification link and `emailVerified` flips to `true`. What does that flag actually grant?
    choices:
      - text: |
          It proves the user controls that inbox — a capability floor. Every per-action authorization check (org membership, role, ownership) still runs on top of it.
        correct: true
      - text: |
          It authorizes the user for everything a normal member can do, so per-action checks can be skipped for verified users.
        correct: false
      - text: |
          It marks the account as fully trusted, which is why the verify endpoint can safely return distinct copy for "expired" versus "never existed."
        correct: false
    why: |
      `emailVerified: true` is necessary but not sufficient — a floor, never a ceiling. Treating it as authorization is the conflation that separates someone who has shipped auth from someone about to. (And the verify endpoint must still collapse all failure causes into one message, or it reopens enumeration.)

  - source: 53.4
    question: |
      You wire the password-reset happy path: the link arrives, the new password saves, the user lands signed in, every test passes. Yet a security reviewer calls it a back door. What's the most likely cause?
    choices:
      - text: |
          `revokeSessionsOnPasswordReset` was left at its default `false`, so an attacker holding a pre-reset session keeps their access after the reset.
        correct: true
      - text: |
          The reset token lived in the URL, which is never acceptable and always an account-takeover hole.
        correct: false
      - text: |
          The reset link used a 10-minute expiry instead of matching the verification link's one hour.
        correct: false
    why: |
      A reset exists because the old credential may already be compromised, so every session minted under it must die. Better Auth does NOT invalidate on reset by default — you opt in. The happy path passes every test while the back door stays open, which is exactly what makes the omission so dangerous. (A token in the URL is fine here, paired with short expiry and one-time-use-by-deletion.)

  - source: 53.5
    question: |
      You're enabling the `magicLink()` plugin. Which configuration line is the single most important one to get right, and why?
    choices:
      - text: |
          `storeToken: 'hashed'` — the plugin defaults to `'plain'`, so without it a leaked `verification` row is a live, working sign-in link.
        correct: true
      - text: |
          `disableSignUp: true` — leaving it `false` lets anyone create an account, which is the main risk of magic links.
        correct: false
      - text: |
          `expiresIn: 60 * 60` — matching the verification link's one-hour fuse keeps the UX consistent across the chapter.
        correct: false
    why: |
      Unlike the verification and reset flows that hashed the token for you, `magicLink()` defaults `storeToken` to `'plain'` and stores the raw token. The omission is invisible until a breach surfaces it. (`disableSignUp: false` is the right default — the first click is the verification — and a magic link gets a *shorter* fuse than verification, five minutes, because the click itself is the credential.)

  - source: 53.6
    question: |
      During enrollment a user calls `authClient.twoFactor.enable({ password })`, scans the QR, and the screen shows their recovery codes. Is two-factor now active on the account?
    choices:
      - text: |
          No — `enable()` only generates and shows the secret. 2FA arms only after `verifyTotp` confirms the user typed a working code, which is what flips `twoFactorEnabled` to true.
        correct: true
      - text: |
          Yes — `enable()` succeeding is the commit; `verifyTotp` afterward is just an optional sanity check.
        correct: false
      - text: |
          Yes, but only if `trustDevice` was passed; otherwise the account stays unprotected.
        correct: false
    why: |
      Enrollment is deliberately two-phase — generate-and-show, then prove-and-commit — so a misconfigured authenticator can't lock the user out before they've confirmed it works. `twoFactorEnabled` flips on the `verifyTotp` match, not on `enable()`. (`trustDevice` belongs to the sign-in challenge, not enrollment.)

  - source: 53.7
    question: |
      Your app runs at `app.example.com`, but you set `rpID: 'example.com'` in the `passkey()` config. What symptom should you expect?
    choices:
      - text: |
          Registration succeeds, but every sign-in (assertion) silently fails, because the passkey was scoped to a domain the request never comes from.
        correct: true
      - text: |
          Registration fails immediately with an origin error, so you catch the mistake before any passkey is stored.
        correct: false
      - text: |
          Everything works at `app.example.com`, but the passkey also wrongly works at `marketing.example.com`, widening the attack surface.
        correct: false
    why: |
      `rpID` must be the registrable domain the app actually runs on. Scope a key to `example.com` while serving from `app.example.com` and the browser happily registers it, then refuses every assertion because the origins don't match — the same origin-binding that stops phishing, now tripping you. When passkeys register but die at sign-in, check `rpID` first.

  - source: 53.8
    question: |
      You register `http://localhost:3000/api/auth/callback/google` in the Google console, but staging keeps failing the OAuth round-trip. Which of these would silently break it?
    choices:
      - text: |
          A trailing slash or scheme difference — `…/callback/google/` or an `https` vs `http` mismatch — because redirect URIs are matched exactly, with no wildcards.
        correct: true
      - text: |
          Reusing the same `client_id` across dev and staging, which Google rejects at the redirect step.
        correct: false
      - text: |
          Omitting `redirectURI` from the `socialProviders` block, which means Better Auth never tells Google where to return.
        correct: false
    why: |
      OAuth 2.1 matches redirect URIs exactly — scheme, host, port, path, trailing slash and all — with no wildcards, so each environment registers its own exact URL. A stray slash is the classic "one environment works, another mysteriously doesn't." (Leaving `redirectURI` unset is correct: it defaults to the catch-all path. Separate per-environment clients are a good practice, not a failure cause.)

  - source: 53.9
    question: |
      A teammate wants to add a provider to `trustedProviders` "because lots of our users have it." Why is that reasoning unsafe?
    choices:
      - text: |
          A trusted provider auto-links onto a matching-email account with no `email_verified` backstop, so the list itself IS the trust — popularity says nothing about whether its email claim is one you'd stake an account on.
        correct: true
      - text: |
          It's safe — Better Auth still requires the provider to assert `email_verified: true` before any trusted auto-link, so a weak provider can't actually link.
        correct: false
      - text: |
          The real risk is the empty `trustedProviders` list, which trusts every provider by default until you populate it.
        correct: false
    why: |
      Being on `trustedProviders` is the entire trust decision — there's no `email_verified` check behind it for trusted providers. If a listed provider's identity for an email falls into the wrong hands (a domain takeover, a Workspace edge), an attacker links into the account without the password. The empty list is safe-but-inert (it refuses); the over-trusting list is the account-takeover lever.

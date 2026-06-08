sources:
  54.1: The two-layer gate in proxy.ts
  54.2: Changing the password and the email
  54.3: Active sessions and revoke-across-devices
  54.4: "CSRF and XSS: the defaults and the footguns"

questions:
  - source: 54.1
    question: |
      Most of your app sits behind auth; only a landing page, `/sign-in`, and `/sign-up` are public. You pick the matchall-minus-public matcher and a teammate asks why you didn't just allowlist the protected sections. What's the load-bearing reason?
    choices:
      - text: |
          Matchall-minus-public fails *closed* — forget to exclude a new public page and it's locked, which you notice in seconds; an allowlist fails *open*, so a protected section you forget to add ships ungated and silent.
        correct: true
      - text: |
          Matchall-minus-public is the only strategy that lets the proxy skip the database, so an allowlist would force a `getSession` call on every matched request.
        correct: false
      - text: |
          An allowlist can't express the auth pages, so the inverse gate that bounces signed-in users off `/sign-in` only works under matchall-minus-public.
        correct: false
    why: |
      Both strategies are correct — the choice is about which direction they fail. Allowlist fails open: a forgotten entry leaves a route public, a silent leak. Matchall-minus fails closed: a forgotten exclusion locks a page, a visible break you catch immediately. With most of the app gated, you want the safer failure direction. (Neither strategy changes whether the proxy reads the DB — that's always cookie-presence-only — and both can match the auth pages.)

  - source: 54.2
    question: |
      You enable `changeEmail` with `enabled: true` and nothing else, then wire `sendChangeEmailConfirmation` to send the verification link to the user's **current** address rather than the new one. Why send it to the address they're leaving?
    choices:
      - text: |
          It proves the requester controls the account *right now* — closing the path where an attacker with a briefly-stolen session changes the email to one they own and locks the real owner out.
        correct: true
      - text: |
          The new address can't receive mail until `user.email` has already been flipped, so the current address is the only inbox able to receive the token.
        correct: false
      - text: |
          Sending to the new address would leak the existence of the account to whoever owns it, reopening user enumeration.
        correct: false
    why: |
      Verifying the *new* inbox only proves control of the destination — which a session-stealing attacker has trivially. Confirming the *old* address proves current control of the account, blocking the takeover-by-email-change. It's also the case where the library default (verify the new address) is the *less* secure option, so the opt-in callback to the current address is a deliberate fix. Pair it with a "your email was changed" notice to both addresses carrying a "wasn't you?" escape hatch.

  - source: 54.3
    question: |
      On `/settings/security/sessions`, a user is signed in on a phone, a laptop (the one they're using), and a desktop. Which statements about the revoke buttons and their effects are true? Select all that apply.
    choices:
      - text: |
          "Sign out other devices" (`revokeOtherSessions`) drops the phone and desktop but leaves the laptop signed in — the same revocation a password change can fire automatically.
        correct: true
      - text: |
          "Sign out everywhere, including this device" (`revokeSessions`) clears the current cookie too, so the laptop also lands on `/sign-in`.
        correct: true
      - text: |
          Right after the phone is revoked, its still-open tab can keep loading pages for a few minutes before it's bounced.
        correct: true
      - text: |
          The instant the `delete` runs, every revoked device is signed out — `revokeSession` takes effect immediately on all of them.
        correct: false
    why: |
      The copy has to spell out whether *this* device goes, because that's the only difference the user feels: `revokeOtherSessions` spares the current session (and is the same endpoint `changePassword({ revokeOtherSessions: true })` triggers), while `revokeSessions` kills it too and clears the cookie. And revocation is eventually consistent: with the cookie cache on, a revoked device reads its cached decode until the window lapses — so the toast must say so, or you `disableCookieCache` on the sensitive subtree.

  - source: 54.4
    question: |
      You need to render rich text from a CMS, so you reach for `dangerouslySetInnerHTML`. Which discipline actually keeps it from becoming an XSS hole?
    choices:
      - text: |
          Sanitize with an allowlist (e.g. DOMPurify) on the **server**, so the un-sanitized HTML never reaches the browser — and sanitize even "trusted" sources.
        correct: true
      - text: |
          Sanitize in the client component right before the prop receives it, so the cleaning happens as late as possible against the freshest input.
        correct: false
      - text: |
          Blocklist the dangerous tags — `<script>`, `<iframe>`, `<object>` — and let everything else through, since those are the tags that execute.
        correct: false
    why: |
      `dangerouslySetInnerHTML` bypasses React's auto-escaping, so the input must be sanitized first — server-side, in the Server Component, so the raw string never crosses the wire (sanitizing client-side already shipped the dangerous payload). Use an allowlist, not a blocklist: you'll never finish enumerating every dangerous tag, and the attacker only needs the one you forgot. Sanitize even trusted sources, since any input may become reachable.

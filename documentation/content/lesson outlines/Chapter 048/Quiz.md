sources:
  48.1: Resend and the first verified send
  48.2: 'Authenticating the sender: SPF, DKIM, DMARC'
  48.3: The transactional subdomain split
  48.4: The suppression list as a send-time chokepoint

questions:
  - source: 48.1
    question: |
      A password-reset Server Action times out; the framework retries it while the user also clicks "resend." Three send attempts are now in flight for one request. What stops three reset emails from going out?
    choices:
      - text: |
          Attaching the reset request's stable id as the `idempotencyKey` on every attempt, so Resend recognizes the repeats and collapses them into one send.
        correct: true
      - text: |
          Generating a fresh random `idempotencyKey` per attempt so each send is uniquely tracked.
        correct: false
      - text: |
          Checking the suppression list before each send, which dedupes the duplicate attempts.
        correct: false
    why: |
      The key has to be *stable* — built from the id the event already carries (`password-reset/req_abc`) — so all three attempts carry the identical key and Resend sends once. A fresh random key per attempt defeats the whole point: each retry looks like a brand-new event. The suppression list is real but solves a different problem — sends to bounced or complained addresses, not duplicate sends.

  - source: 48.2
    question: |
      A spammer sets up flawless SPF and DKIM on `evil.com`, then sends mail with the visible `From:` set to `security@yourbank.com`. Both SPF and DKIM pass at the receiver. Why does this still get caught when DMARC is in force?
    choices:
      - text: |
          DMARC requires at least one passing check to be *aligned* with the visible `From:` domain — both checks passed on `evil.com`, not `yourbank.com`, so nothing aligns and DMARC fails.
        correct: true
      - text: |
          DMARC re-runs SPF and DKIM with stricter cryptography that the spammer's keys can't satisfy.
        correct: false
      - text: |
          DMARC blocks any message whose envelope sender and visible `From:` belong to different domains, which is always true for spoofed mail.
        correct: false
    why: |
      SPF and DKIM pass independently of the visible `From:` — that's the exact hole. DMARC closes it with alignment: a passing check only counts if the domain that passed matches the domain the human reads. The spammer's checks are perfectly valid *for evil.com*, so they pass but don't align, and DMARC fails. DMARC doesn't re-run the crypto, and it isn't about envelope-vs-From mismatch in general — legitimate relaxed alignment allows subdomains to differ.

  - source: 48.2
    question: |
      You want your domain protected by `p=reject`. What's the correct way to get there?
    choices:
      - text: |
          Publish `p=none` first, watch the `rua` aggregate reports to find and authenticate every legitimate sender, then ramp through `quarantine` to `reject` on evidence — not the calendar.
        correct: true
      - text: |
          Publish `p=reject` immediately — it's the most secure setting, and any mail it bounces was unauthenticated and shouldn't have been sent anyway.
        correct: false
      - text: |
          Publish `p=quarantine` and leave it there permanently; `reject` is only needed for banks and is overkill for a SaaS.
        correct: false
    why: |
      `p=reject` is a destination reached on evidence, not a switch you flip. Going straight to `reject` hard-bounces every legitimate sender you forgot to authenticate — the billing tool, the CRM, a founder's mail-merge — silently, the moment DNS propagates. The staged rollout exists precisely because the failure isn't graceful. The gate at every step is what the reports show, never how much time has passed.

  - source: 48.3
    question: |
      A "your free trial ends in 3 days — upgrade now" email is account-specific and time-sensitive. Which subdomain should it send from, and why?
    choices:
      - text: |
          `marketing.yourapp.com` — a timer fired it, not the user, and its purpose is to sell, so it's marketing no matter how account-specific the body reads.
        correct: true
      - text: |
          `send.yourapp.com` — it's about the user's specific account and carries a real deadline, which makes it transactional.
        correct: false
      - text: |
          The apex `yourapp.com` — billing-adjacent mail belongs with the human support correspondence.
        correct: false
    why: |
      The two tests are: did the user *trigger* it, and is it pure account-need or promotion? A timer fired this, and the headline is "upgrade now" — a scheduled send whose purpose is to sell is marketing, however account-specific it looks. Routing it through the transactional subdomain would let its complaint churn poison the reputation that keeps password resets in the inbox. And the apex is reserved for human mail, not automated sends.

  - source: 48.4
    question: |
      Inside `sendEmail`, the suppression-list query throws — the database connection timed out. What should the wrapper do, and what's the principle?
    choices:
      - text: |
          Fail closed — return a failure `Result` and surface the error — because a missed send is recoverable but a send to a suppressed address is not.
        correct: true
      - text: |
          Fail open — send the email anyway, since a real user is waiting and the timeout is probably transient.
        correct: false
      - text: |
          Skip suppression for this one send and proceed, logging that the check was bypassed.
        correct: false
    why: |
      The two failure modes cost wildly different amounts. A send that doesn't go out can be retried once the database recovers — nothing is lost. A send that reaches a suppressed address can't be taken back; the bounce or complaint hits your reputation the instant it happens. Every gate that controls access treats an exception in the check as a refusal, so suppression fails closed, just like authorization, tenancy, and signature verification.

  - source: 48.4
    question: |
      A new sign-up's first verification email goes to an address that hard-bounced two months ago. Select the statements that are correct about how the system should handle this.
    choices:
      - text: |
          The verification send should pass `bypassSuppression: true`, because the user may have just fixed the mailbox and the flow exists to find that out.
        correct: true
      - text: |
          The recipient address must be normalized — lowercased and trimmed — before the suppression lookup, or the query can miss the stored row.
        correct: true
      - text: |
          Because the address is suppressed, the wrapper should silently return success without sending, to protect reputation.
        correct: false
      - text: |
          `bypassSuppression` should default to `true` for all sends so legitimate users are never blocked by stale bounces.
        correct: false
    why: |
      Verification is one of the two flows that justify bypass — blocking it on an old bounce makes the account unrecoverable. And normalization must precede the lookup, since the table stores normalized addresses; skip it and `User@x.com` misses the `user@x.com` row. But bypass is a privilege granted explicitly per flow and auditable in review — never a default — and silently returning success would hide a real failure from the caller.

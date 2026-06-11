sources:
  70.1: One seam, many channels
  70.2: Email and inbox, independent channels
  70.3: Preferences, read once, default-on
  70.4: Dedup the rapid duplicates

questions:
  - source: 70.1
    question: |
      An org admin changes a member's role from member to admin. Following the dispatcher's "who reads it?" rule, what writes happen?
    choices:
      - text: |
          An inbox notification to the affected member **and** an audit-log row on the org.
        correct: true
      - text: |
          Only an audit-log row on the org — a role change is an operator concern, not something the user needs in their inbox.
        correct: false
      - text: |
          Only an inbox notification to the affected member — the audit log is for security events like failed logins, not routine role changes.
        correct: false
    why: |
      A role change has two audiences: the affected member should be told (an inbox row), and the org needs the immutable operator record (an audit row). It writes both. The audit log isn't reserved for security events — it's the operator-facing record for any event worth keeping; and notifications aren't only for the user-facing half of "both" events.

  - source: 70.1
    question: |
      Inside an `authedAction`, where does the `await dispatch(...)` call belong relative to the database write?
    choices:
      - text: |
          After the transaction commits — `dispatch` is an external call and a notification for an action that rolled back is worse than one never sent.
        correct: true
      - text: |
          Inside the `db.transaction` callback, so the notification and the state change are written atomically together.
        correct: false
      - text: |
          Before the write, so the user is told the moment the action starts and latency stays low.
        correct: false
    why: |
      Fire after the state change is durable. Calling `dispatch` inside the transaction both holds a connection open across a network round-trip and risks announcing a state that later rolls back. Firing before the write announces something that may never happen. The atomic-write instinct is real, but the answer to it is the transactional-outbox pattern (named, deferred), not a dispatch inside the transaction.

  - source: 70.2
    question: |
      During a dispatch, the inbox row is inserted successfully but the email send hits a Resend 5xx. What does the dispatcher do?
    choices:
      - text: |
          Logs the email failure and continues — the inbox row stands, and the `DispatchResult` still reports what went out. Channels are independent.
        correct: false
      - text: |
          Throws, rolling back the inbox row too, so the notification is all-or-nothing across channels.
        correct: false
      - text: |
          Immediately retries the email send a few times before giving up, since a 5xx is transient.
        correct: false
    why: |
      The dispatcher wraps each channel in its own try/catch: a failed channel is logged and the loop moves on, leaving the other channel's work intact. It never throws on a per-channel failure — that would let a flaky email provider break the user action that triggered the notification. Retries don't live in v1 either; they belong to the durable-queue upgrade. (No option here is correct as stated — the first is closest but omits that there are no retries.)

  - source: 70.3
    question: |
      A user wants to stop receiving billing emails. Compare the per-category **preference** toggle with **email suppression**. Which statements are true?
    choices:
      - text: |
          A preference opt-out short-circuits *before* the email channel runs — `resolveChannels` drops `email` from the array.
        correct: true
      - text: |
          Email suppression is enforced *inside* the email wrapper — the send is attempted but the wrapper refuses a suppressed address.
        correct: true
      - text: |
          They are redundant: once a user toggles the preference off, the suppression list serves no further purpose.
        correct: false
      - text: |
          The preference opt-out is implemented by adding a `List-Unsubscribe` header to the notification email.
        correct: false
    why: |
      The two pathways live in different layers and both end at "no email," but they aren't redundant. Preferences are the user's product choice, resolved before the channel runs; suppression is the deliverability/compliance backstop (hard bounce, spam complaint), enforced inside the wrapper. Transactional notifications carry no `List-Unsubscribe` header at all — the opt-out is the per-category preference, not an email header.

  - source: 70.4
    question: |
      Jane posts five *different* comments on the same invoice within a minute, and the recipient finds five separate inbox rows noisy. Is this a job for the dispatcher's 60-second dedup?
    choices:
      - text: |
          No — these are distinct events, so dedup would wrongly drop real comments; the right pattern is coalesce (summarize into one), which is deferred.
        correct: true
      - text: |
          Yes — widen the dedup window so all five collapse into a single notification.
        correct: false
      - text: |
          Yes — dedup on `eventType` alone so any burst of comments folds into one.
        correct: false
    why: |
      Dedup *drops* repeats of the *same* logical event (a resent invitation, a retried webhook). Five distinct comments are different events; dedup would silently swallow real notifications. Collapsing distinct-but-noisy events into one summary is coalesce — a different mechanism (bucket and flush) deferred until noisy event types ship. Keying on `eventType` alone is the classic too-broad key that makes unrelated notifications vanish.

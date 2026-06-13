sources:
  80.1: "Refuse by default"
  80.2: "Two audiences, two messages"
  80.3: "Walking the six error seams"

questions:
  - source: 80.1
    question: |
      A reviewer flags this authorization helper as fail-open, even though it returns `false` (a refusal) when the membership query throws:

      ```ts
      const isAdmin = async (): Promise<boolean> => {
        try {
          const { role } = await requireOrgUser();
          return roleAtLeast(role, 'admin');
        } catch {
          return false;
        }
      };
      ```

      At its own call site this denies correctly. So what's the real problem the reviewer is pointing at?
    choices:
      - text: |
          `false` now collapses "proven not-admin" and "the check broke" into one value — the next caller who reads `isAdmin()` as a plain yes/no inherits a sentinel that lies, and the swallowed error means the operator never learns the gate is broken. Let the check throw and let one wrapper refuse.
        correct: true
      - text: |
          Returning `false` *is* the fail-open bug — a broken check should return `true` so the request continues while the outage is investigated, and the `catch` should re-throw.
        correct: false
      - text: |
          The helper is fine; the only fix needed is to log the error inside the `catch` before returning `false`, which restores the operator's visibility.
        correct: false
    why: |
      Returning `false` on exception looks like fail-closed and at this one site it is — but the value has lost the distinction between a proven "no" and "the check never finished," so any future caller can misread it, and the empty `catch` ate the error the operator needed. The fix isn't a louder log; it's structural: the check throws on its own failure, a single wrapper catches and refuses, so "denied" and "don't know" stay distinct (a returned `Result` vs. a thrown error).

  - source: 80.1
    question: |
      You've internalized "refuse when in doubt." Which of these reads on a Redis miss are genuinely a *fail-closed* decision? (Select all that apply.)
    choices:
      - text: |
          A feature-flag read that defaults to `off` — the flag gates a feature, so `off` is the safe side of an access decision.
        correct: true
      - text: |
          A signature-verify step that returns `false` on both a bad signature and an HMAC library exception.
        correct: false
      - text: |
          A theme-preference read that defaults to `'system'`.
        correct: false
    why: |
      Fail-closed is a rule about *access decisions* — who can read, who can write, which tier is allowed past a gate. A feature flag gating a feature defaults to `off`: that's the safe, fail-closed side. A theme preference has no security boundary, so `'system'` is just a sensible product default — neither fail-open nor fail-closed; don't strain to fit it into the access frame. The signature verify is the trap: returning `false` on a *library exception* hides "the check broke" as "bad signature," which is fail-open with extra steps — it should throw on exception and only return a mismatch for a genuine bad signature.

  - source: 80.2
    question: |
      The two-message rule says the operator record should be rich — cause chain, ctx, the parsed input. A teammate logs `input: redact(input.data)` uniformly in the wrapper's catch and calls it done. For which action is that still a leak?
    choices:
      - text: |
          A sign-in or password-change action — the *parsed* input object still holds the password, so for those actions you log the action name and `userId` and nothing of the input.
        correct: true
      - text: |
          A cross-tenant read — the parsed input would carry another organization's `orgId`, which the operator is never allowed to see.
        correct: false
      - text: |
          None — once the input is the Zod-parsed object and run through `redact`, it is safe to log for every action.
        correct: false
    why: |
      Logging the *parsed* (not raw) input is the right default, but it's not a free pass: for a sign-in or password-change action the password is a legitimate field of the parsed object, so a blanket `input:` log writes it straight to the operator record. Those actions log the action name and `userId` only. (The operator side is *supposed* to see the org context — richness is the goal there; the one short list it must never carry is passwords, tokens, full PII the action didn't need, and third-party keys.)

  - source: 80.3
    question: |
      A request to `/invoices/[id]` hits an invoice that exists but belongs to another tenant. The route wrapper's status table returns **404**, not 403. Why is 404 the more secure answer?
    choices:
      - text: |
          A 403 admits the resource exists and the caller simply isn't allowed it — that confirms the ID is valid, which is itself a leak. A 404 is indistinguishable from "doesn't exist," so the attacker learns nothing; the operator log still records a `cross_tenant_attempt` with the truth.
        correct: true
      - text: |
          403 is wrong because the caller *is* authenticated — 404 is the correct status for any authenticated-but-unauthorized request regardless of tenancy.
        correct: false
      - text: |
          404 lets the framework's `not-found.tsx` render instead of the error boundary, which is the only reason to prefer it; security-wise the two are equivalent.
        correct: false
    why: |
      The message-split rule adapts the user-facing artifact so it doesn't leak: a 403 on a cross-tenant resource confirms the ID is real and owned by *someone*, handing an attacker a valid handle to probe. Returning 404 makes "not yours" indistinguishable from "doesn't exist," so the user learns nothing — while the operator log captures the real event (`cross_tenant_attempt`, the user, the org, the requested ID) for security review. User sees the generic truth-hiding status; operator sees the truth.

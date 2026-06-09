sources:
  64.1: The Stripe object graph
  64.2: Starting subscriptions with Checkout
  64.3: Managing subscriptions with the Portal
  64.4: Plan entitlements as a derived view
  64.5: Subscription status as first-class state
  64.6: The thin billing interface
  64.7: When an SDK adapter earns its weight

questions:
  - source: 64.4
    question: |
      A teammate gates the Pro analytics panel by calling `stripe.subscriptions.retrieve(...)` at the top of the Server Component, reasoning "Stripe is the source of truth, so this is always correct." The code is correct. Why is it still the wrong design?
    choices:
      - text: |
          It puts a network round-trip to Stripe on the hot path of every render — adding latency, burning rate limits under load, and making Stripe's uptime your app's uptime. Read the local `plan_entitlements` projection instead; call Stripe only off the request path.
        correct: true
      - text: |
          `stripe.subscriptions.retrieve` returns a stale cached object, so the gate can show the wrong plan; you need the local row because it's fresher than Stripe.
        correct: false
      - text: |
          Server Components aren't allowed to make outbound network calls during render, so the call throws at runtime; the local read is the only thing that works there.
        correct: false
    why: |
      The objection isn't correctness — reading Stripe live is the *freshest* possible value. It's that a third-party call on the render path makes that service's latency and availability yours: every dashboard goes blank when Stripe blips, and a traffic spike blows the rate limit exactly when you can least afford it. The fix is the derived view — read your local row on the hot path, refresh it only when a webhook says something changed. The local row isn't fresher than Stripe; it's just always-available and fast.

  - source: 64.1
    question: |
      You stamp `metadata: { organization_id: org.id }` onto the Stripe Customer (and Subscription) at creation. What problem does this specifically solve?
    choices:
      - text: |
          When a webhook event later arrives, the metadata rides along on the event payload, so your handler reads `organization_id` straight off it and knows which org's row to update — no lookup table mapping `cus_…` back to an org.
        correct: true
      - text: |
          It lets the app store org-specific billing data on Stripe instead of in its own database, keeping the local schema smaller.
        correct: false
      - text: |
          It lets Stripe enforce one Customer per organization, rejecting a second Customer create for the same `organization_id`.
        correct: false
    why: |
      Metadata is the carry-channel: Stripe echoes it back on every webhook event for that object, so the fact you need at receipt time — which org this is — arrives on the event itself, with no DB round-trip and no reverse-mapping table. It is not a general data store (app data belongs in your tables), and Stripe doesn't enforce uniqueness on metadata — the "one Customer per org" discipline is enforced by your own `stripeCustomerId` lookup-and-reuse.

  - source: 64.2
    question: |
      Right after Checkout, the user lands on `/billing/success?session_id=...`. It would be easy to read the session id, confirm it's paid, and write the Pro entitlement from the success page. Why does the chapter forbid this?
    choices:
      - text: |
          It makes the success page a *second writer* racing the webhook for the same row — the dual-writer hazard the webhook design exists to remove. The page must only read-and-poll; the webhook is the single writer that provisions the entitlement.
        correct: true
      - text: |
          The `session_id` in the URL is forgeable, so the success page can never tell whether the user actually paid and must wait for an email confirmation instead.
        correct: false
      - text: |
          Writing from the success page is slower than the webhook, so the user would see "Finalizing…" for longer than necessary.
        correct: false
    why: |
      The browser redirect and the webhook race each other, and there is no guarantee the webhook wins — but that's the reason the page *polls*, not the reason it mustn't write. The deeper rule is single-writer: if the page can write the entitlement, two writers contend for one row and you've reintroduced the exact corruption the webhook design removed. The session id being forgeable is a real, separate reason not to trust it as proof of payment — but even a server-verified session shouldn't make the page a writer.

  - source: 64.3
    question: |
      After a customer returns from the Customer Portal to your `return_url`, a developer wants the billing page to "sync" by calling `refreshEntitlementFromStripe(org.id)` on render. What's wrong with treating the return as a signal to update state?
    choices:
      - text: |
          The `return_url` fires no matter what the customer did — changed plan, browsed, or nothing — so it proves only that they came back. Acting on it either double-writes a row the webhook already owns, or reads a projection the webhook hasn't updated yet. Do nothing stateful on return; read and poll.
        correct: true
      - text: |
          The return URL omits the subscription id, so `refreshEntitlementFromStripe` can't know which subscription changed and updates the wrong row.
        correct: false
      - text: |
          Stripe rate-limits the return redirect, so calling Stripe again on render risks a 429 that breaks the billing page.
        correct: false
    why: |
      A redirect is a navigation event, never a transaction-completion signal — the twin of the Checkout success URL not being proof of payment. The return fires regardless of what happened in the Portal, so a refresh-on-return either races the webhook as a second writer or paints stale state when the webhook hasn't landed. The structural fix is to do nothing stateful on return: read the entitlement, and if it isn't finalized, poll until the webhook catches up.

  - source: 64.5
    question: |
      Given the five statuses your row stores, for which one does `hasActiveAccess` return `false` even though, mid-cycle, the customer might still be inside a period they've paid for?
    choices:
      - text: |
          `canceled` — and the "paid through the end of the month after cancelling" case never reaches it, because Stripe keeps that subscription `active` (with `cancelAtPeriodEnd: true`) until the period actually ends. By the time the status reads `canceled`, access is genuinely over.
        correct: true
      - text: |
          `canceled` — so the gate must special-case it, granting access while `currentPeriodEnd` is still in the future and only denying once that date passes.
        correct: false
      - text: |
          `past_due` — a failed renewal means the paid period has lapsed, so access is denied while Stripe retries the card.
        correct: false
    why: |
      It's tempting to hear "canceled still has access until the period ends" and special-case it — but with this projection that's wrong. The wind-down is carried entirely by `active` + `cancelAtPeriodEnd`; Stripe only flips to `canceled` once the paid period is truly over, so `canceled` always means no access, full stop, with no date math in the gate. `past_due` is the opposite mistake: it *grants* access (dunning grace) so a customer Stripe is mid-recovering isn't locked out.

  - source: 64.6
    question: |
      A Pro-only export runs inside a Server Action. When `requirePlan('pro')` throws a `BillingError` for an org that's `canceled`, how should the action respond, and what `Result` code does it use?
    choices:
      - text: |
          Catch the `BillingError`, return `err('forbidden', error.message)`, and re-throw anything that isn't a `BillingError`. There's no `payment_required` code — a tier refusal maps to `forbidden`, and the billing-specific reason already lives on `BillingError.code`.
        correct: true
      - text: |
          Let the `BillingError` propagate so the segment's `error.tsx` boundary catches it and renders the upgrade screen — the same as a Server Component.
        correct: false
      - text: |
          Catch it and add a new `payment_required` member to the `Result` error union so the form can distinguish a paywall from an ordinary forbidden.
        correct: false
    why: |
      A form is waiting on the action, so throwing through it would blow up the submission and lose the user's input — that's why the Server Component path (throw → `error.tsx`) is wrong here. The action catches, maps to the existing fixed `Result` union, and the only member that fits "authenticated but not permitted at this tier" is `forbidden`. You don't invent a `payment_required` code; the nuance (inactive vs. insufficient plan) is already carried by `BillingError.code` for logs and telemetry. Non-billing errors get re-thrown to the framework boundary.

  - source: 64.7
    question: |
      Run the three-question wrapper test on Cloudflare R2's storage SDK: the call is verbose (`PutObjectCommand({ Bucket, Key, Body, ContentType })`), R2/S3/Backblaze are interchangeable, and it's used in exactly two places with no cross-cutting rule. What's the verdict?
    choices:
      - text: |
          A helper. The shape is read-hostile and the swap cost is real (two yeses), but there's no discipline that must be centralized and the call sites don't multiply — so a `presignedPut(key)` helper wraps the verbosity while the SDK stays importable. An interface needs three-of-three.
        correct: true
      - text: |
          An interface in `/lib`. Verbose shape plus a real swap cost is enough to forbid the SDK outside one directory, the same as billing.
        correct: false
      - text: |
          A direct call. With only two call sites there's nothing worth wrapping, so app code should construct `PutObjectCommand` inline at each site.
        correct: false
    why: |
      R2 collects two yeses — verbose shape, real swap cost — but fails the third question: no rule has to hold at every call, and there are only two sites, so nothing needs the SDK *forbidden* elsewhere. Two-of-three is a helper (convenience, SDK still importable); only three-of-three earns an interface (a wall), which is why just billing and auth clear that bar. A direct call would leave the verbosity un-tamed at each site — the helper exists precisely to fix that.

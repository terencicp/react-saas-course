# Lesson 6 outline — Harden the webhook against forged tenancy

## Lesson title

Chapter-outline title fits: **Harden the webhook against forged tenancy**. Keep it.

- Sidebar (short) title: **Harden against forged tenancy**

## Lesson type

`Implementation` — the student adds the metadata cross-check to `onCheckoutCompleted`, builds against the lesson 6 test file, and verifies with `pnpm test:lesson 6` plus a by-hand Stripe-CLI probe. (The test-coder runs for this lesson.)

## Lesson framing

The student installs the senior reflex that closes the chapter: **never trust tenancy that arrived in an attacker-influenceable channel.** The Subscription's `metadata.organization_id` is a carry-channel any malicious-or-buggy `upgrade` could set, so it cannot be the authority on which org gets the entitlement. The student adds an explicit cross-check that the Customer-resolved org (which the app owns and cannot be forged through the payload) and the metadata-claimed org agree, and makes a mismatch a hard, loud failure that rolls the transaction back — turning a silent cross-tenant write into a 500 that surfaces a bug or an attack. The payoff is the multi-tenancy isolation invariant: a forged event cannot write a paid plan onto someone else's organization.

## Codebase state

### Entry

After lesson 5 the loop is closed end-to-end: the webhook verifies (L2), claims in one transaction (L3), projects the three subscription events into `plan_entitlements` with the ordering predicate and audit rows (L4), and the `upgrade`/`openPortal`/`requirePlan` interface drives Checkout, Portal, and the paywall gate (L5). `onCheckoutCompleted` in `src/lib/webhooks/stripe.ts` already retrieves the Subscription once and calls `resolveOrgIdFromCustomer(tx, customerId)` to get the authoritative org, but it does **not** yet read `sub.metadata.organization_id` or compare it — a `TODO(L6)` marks the spot between the org resolution and the projection/UPSERT. The `forgeMetadata` inspector debug exists and is wired but is the only safety property not yet enforced.

### Exit

`onCheckoutCompleted` reads `sub.metadata.organization_id` and, when present, requires it to equal the Customer-resolved `orgId`; a mismatch logs `metadata_org_mismatch` and throws `BillingError('unknown_customer')`, rolling the transaction back so the route 500s with no `plan_entitlements` write and no `audit_logs` row. The `TODO(L6)` is removed. A legitimate Checkout (metadata agrees or is absent) still flips the entitlement to Pro exactly as before. The chapter's webhook is complete; nothing else changes.

## Lesson sections

Implementation type. Section order per the contract: intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: the webhook can no longer be tricked into writing a paid entitlement onto the wrong organization. Then a one-paragraph description of the feature working: the inspector's **Forge metadata** probe fires a Checkout whose `metadata.organization_id` names org B while the Customer belongs to org A; the handler rejects it — nothing written, a logged `metadata_org_mismatch`, a 500 the `stripe listen` terminal surfaces — while a legitimate Checkout still lands Pro cleanly. No screenshot needed; a one-line description of the two outcomes (rejected forge vs. clean legitimate landing) suffices. Frame the threat concretely: metadata is set client-adjacent in `upgrade`, so it is exactly the kind of value a junior trusts and a senior cross-checks.

### Your mission (header: "Your mission")

Prose paragraph weaving the brief, **no implementation hints, no subsection headers**. Cover, in the project's terms:

- **Feature:** harden `onCheckoutCompleted` so a forged `organization_id` in the Subscription's metadata cannot write an entitlement to an org other than the one that owns the Stripe Customer.
- **The threat model that motivates it:** `sub.metadata.organization_id` is the carry-channel set during `upgrade` (lesson 5) and is attacker-influenceable; `resolveOrgIdFromCustomer` (lesson 4) is authoritative because the app created the Customer and owns the Customer↔org mapping, which cannot be forged through the event payload. Metadata is at most a corroborating signal, never the decision.
- **Constraints (non-functional, shape the solution):** a mismatch is a *hard* failure, not a "pick a winner" — reject loudly rather than silently favoring one source; the rejection must roll back the whole transaction (no partial write, no audit row), which it does by throwing inside the `tx` callback; the cross-check belongs only where metadata is read (`onCheckoutCompleted`) — the update/delete handlers resolve the org from the matched row's own `subscriptionId` and need no metadata trust; reuse `BillingError('unknown_customer')` and the existing `metadata_org_mismatch` log key rather than inventing new failure surface.
- **Out of scope:** the webhook-secret-rotation drill (forward reference to Unit 16); any new schema, projection, or handler surface — this is a small addition on one existing path.

Then the requirements checklist (the only list in the section), each item one verifiable outcome, every item tagged `[tested]` or `[untested]`. Use the `Checklist`/`ChecklistItem` component with `tested`/`untested` chips. Phrase as outcomes, never files/exports:

1. A Checkout event whose `metadata.organization_id` names a different org than the Customer's owner is rejected: no `plan_entitlements` write and no `audit_logs` row are produced. `[tested]`
2. The rejection rolls back the transaction and surfaces as a thrown `BillingError('unknown_customer')` (the route 500s; Stripe sees the failure). `[tested]`
3. A mismatch emits a structured `metadata_org_mismatch` log line keyed by the event id. `[untested]` (log assertion is brittle; covered in the solution walkthrough, confirmed by-hand against the `stripe listen` output.)
4. A legitimate Checkout — metadata equals the Customer-resolved org, or metadata is absent — still flips the entitlement to Pro and writes its audit row exactly as in lesson 4. `[tested]`
5. An event for a Stripe Customer the app never created resolves to no org and is rejected by `resolveOrgIdFromCustomer`'s existing `BillingError('unknown_customer')` throw, rather than creating or mutating any row. `[tested]`

Note for the test-coder: the lesson 6 test file should exercise `onCheckoutCompleted` (or `dispatch`) directly inside a transaction with a seeded org/Customer mapping and a forged-metadata Subscription fixture, asserting the throw and the absence of `plan_entitlements`/`audit_logs` rows; it must inline its fixtures and depend only on the shared runner and the student's `src/lib/webhooks/stripe.ts`. Assertions target observable behavior (throw + no rows + the agree/absent happy path), not the log line. It must also re-confirm the legitimate-landing path so the hardening doesn't regress lesson 4.

### Coding time (header: "Coding time")

One-line build prompt directing the student to implement the cross-check against the brief and the lesson tests, then read the reference solution. The writer wraps the solution in `<details>` (collapsed). Contents:

- The reference cross-check from `src/lib/webhooks/stripe.ts`, shown as it sits in `onCheckoutCompleted` between the `resolveOrgIdFromCustomer` call and the projection/UPSERT:
  - read `const claimedOrgId = sub.metadata.organization_id;`
  - the guard: `if (claimedOrgId && claimedOrgId !== orgId) { log.warn({ eventId, orgId, claimedOrgId, customerId }, 'metadata_org_mismatch'); throw new BillingError('unknown_customer', '...'); }`
  - Use `AnnotatedCode` over the surrounding ~25-line slice of `onCheckoutCompleted` (the `resolveOrgIdFromCustomer` line, the new cross-check guard, the downstream UPSERT) to direct focus to the three moments: authoritative resolve → cross-check → write. The full file is too long to dump; show only the relevant region and note the rest is unchanged from lesson 4.
- Decision rationale (one or two sentences each):
  - Why a mismatch is a hard failure, not "prefer the Customer-resolved org" — a present, mismatched value signals either a bug in `upgrade` or an attack; silently overriding it hides both. (Covers `[untested]` requirement 3's intent.)
  - Why `claimedOrgId &&` — absent metadata is legitimate (the Customer reverse-lookup is the safety net), so only a *present-and-mismatched* value rejects; this keeps requirement 4's metadata-absent case passing.
  - Why throwing inside the `tx` callback is the whole rollback mechanism — no manual cleanup; the open transaction discards the (never-reached) UPSERT and audit write.
  - Why the cross-check lives only in `onCheckoutCompleted` — it is the only handler that reads metadata; update/delete resolve org from the matched row's `subscriptionId`, so there is no metadata to distrust there.
  - Why reuse `BillingError('unknown_customer')` rather than a new code — both "no org owns this Customer" and "metadata names the wrong org" are the same caller-visible class (a Customer→org resolution failure the route turns into a 500).
- Callout: note that the solution file's inline comments label this hardening "S5"; the lesson sequencing here makes it lesson 6 — the cross-check is intentionally its own lesson because trusting upstream metadata is precisely the trap inexperienced devs fall into.
- For `resolveOrgIdFromCustomer` itself (authored in lesson 4), link to lesson 4 of chapter 065 rather than re-explaining; for the `BillingError`/`error.tsx` interop, link to lesson 5 of chapter 065 and chapter 043.

No diagram needed — the change is a single guard on a path lesson 4 already diagrammed; a new diagram would be redundant.

### Moment of truth (header: "Moment of truth")

- Test command and expected pass output:
  - `pnpm test:lesson 6`
  - Expected: the lesson 6 suite passes — the forged-metadata Checkout throws and writes nothing, the legitimate/absent-metadata Checkout lands Pro, the unknown-Customer event throws. Show the green pass summary shape (file + passing test count), not invented per-assertion text.
- By-hand checklist (`Checklist`/`ChecklistItem`) for the requirements the tests don't fully cover — the live `metadata_org_mismatch` log line and the end-to-end inspector probe, which the student ticks off:
  - With `stripe listen` forwarding and `pnpm dev` running, click the inspector's **Forge metadata** debug; follow its note to trigger a Checkout stamping a mismatched `organization_id` in `subscription_data.metadata` against a Customer owned by another org. Confirm: the `stripe listen` terminal shows a 500 for that delivery, no new `plan_entitlements` change in the panel, no new `audit_logs` row, and a `metadata_org_mismatch` line in the dev log.
  - Run a normal **Upgrade to Pro** Checkout (metadata agrees) and confirm the entitlement still flips to Pro with its `billing.subscription.activated` audit row — the hardening did not break the happy path.
  - Note the `forgeMetadata` action returns an instruction note rather than shelling out (the CLI may be absent in some environments), so this probe is genuinely by-hand via the Stripe CLI.

## Scope

- This lesson does not touch signature verification, claiming, the projection, the ordering predicate, or the billing interface — those are lessons 2–5 of this chapter; the cross-check is the only new code.
- It does not add webhook-secret rotation, replay-attack hardening beyond the existing `processed_events` dedup, or any new failure code — secret rotation is a forward reference to Unit 16.
- It does not change the update/delete handlers — they resolve the org from the matched row's `subscriptionId` and carry no metadata trust (covered in lesson 4 of chapter 065).

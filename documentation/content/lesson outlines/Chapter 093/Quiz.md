sources:
  93.1: 'The cookieless floor: Vercel Analytics and Speed Insights'
  93.2: When PostHog earns its weight
  93.3: Wiring PostHog through the consent gate
  93.4: Events, properties, and the identify handshake
  93.5: Flags, rollouts, and experiments on one primitive
  93.6: Session replay with masking by default
questions:
  - source: 93.1
    question: |
      You're wiring up the consent banner and your instinct, fresh off the security chapter, is to wrap `<Analytics />` and `<SpeedInsights />` in the same `useConsent()` gate as everything else. What does the lesson say to do, and why?
    choices:
      - text: |
          Leave both ungated — they're cookieless and collect no personal data, so gating them only throws away the bulk of your traffic for zero compliance benefit.
        correct: true
      - text: |
          Gate both — any tool that sends data off the page is non-essential and must wait for an explicit accept.
        correct: false
      - text: |
          Gate Speed Insights but not Web Analytics — performance sampling reads device signals, so only it needs consent.
        correct: false
    why: |
      The rule is "gate by what the tool collects," not "gate analytics by reflex." Vercel Web Analytics and Speed Insights set no cookies and don't fingerprint, so they fall under essential/legitimate-interest and run for everyone — including the majority who never click accept. Gating them would discard exactly the traffic data you installed them for. PostHog is the opposite case: it handles personal data, so it does go through the gate.
  - source: 93.2
    question: |
      A team already runs Mixpanel for events, LaunchDarkly for flags, and FullStory for replay — all best-in-class. The lesson argues PostHog's one-platform play still wins. Which cost is the one that "quietly breaks everything"?
    choices:
      - text: |
          The four tools each give the same user a different identity, so the cross-tool question — "did the variant-B users finish the funnel, and can I watch one struggle?" — needs a join across three vendors that nobody maintains.
        correct: true
      - text: |
          Four SDKs in the bundle slow down first paint, sinking the Core Web Vitals you just measured.
        correct: false
      - text: |
          Four separate invoices and four security reviews make the spend hard to justify.
        correct: false
    why: |
      All three are real costs, but the bundle weight and the contracts are merely additive annoyances. The identity split is the one that makes the most valuable question structurally unanswerable: the same person is a different ID in each tool, so a query spanning events, flags, and replay can't be expressed without a fragile cross-vendor join. PostHog folds the four primitives onto one identity, so that question is a single query.
  - source: 93.3
    question: |
      A teammate puts `import posthog from 'posthog-js'` at the top of the module and sets `opt_out_capturing_by_default: true`, reasoning that the SDK loads but stays silent until consent. Why does the lesson call this a production bug?
    choices:
      - text: |
          A top-level import means the SDK code is already in the page on first load, consent or not — "present but quiet" is already more than the gate promised. The import must live inside the consented branch.
        correct: true
      - text: |
          `opt_out_capturing_by_default` doesn't actually exist on `posthog.init`, so the SDK captures from the first render.
        correct: false
      - text: |
          A static import can't be tree-shaken, so the bundle is larger — a performance issue, not a consent one.
        correct: false
    why: |
      This is the two-belt distinction. Belt one (`opt_out_capturing_by_default`) governs a module that's already loaded; belt two is the dynamic `import('posthog-js')` living inside the `if (analytics)` branch so the code never enters the page before consent. Trusting belt one alone leaves the SDK present on first load — the gate promised absent, not silent.
  - source: 93.4
    question: |
      Your app calls `posthog.identify()` correctly on every sign-in, and the data still gets corrupted: on shared machines, separate people's events fuse into one profile. What's missing?
    choices:
      - text: |
          A `posthog.reset()` on sign-out — without it the distinct ID survives the logout, so the next person to sign in inherits the previous user's identity.
        correct: true
      - text: |
          A second `identify()` call with the new user's ID, which overrides the stale one when someone else signs in.
        correct: false
      - text: |
          A `group()` call on sign-in, which scopes events to the org and keeps users from colliding.
        correct: false
    why: |
      `identify` has a mandatory other half. `reset()` on sign-out clears the distinct ID, super-properties, and the identity link so the next session starts fresh and anonymous. A second `identify()` with a different ID actually *fails* — PostHog refuses to re-identify an already-identified distinct ID without a `reset()` first. And `group()` solves org-level attribution, not cross-user pollution.
  - source: 93.5
    question: |
      A `new_onboarding` flag has hit 100% and is stable. You want to remove it cleanly. Put these steps in the right order to avoid an outage. (Order the choices; the lesson's sequence is the correct one.)
    choices:
      - text: |
          Remove the `if (flag)` fork in code (keep the winning branch), merge and deploy, then delete the flag in PostHog.
        correct: true
      - text: |
          Delete the flag in PostHog first, then remove the fork in code and deploy.
        correct: false
      - text: |
          Leave the flag in PostHog set to 100% permanently and just delete the code fork — the live flag is harmless.
        correct: false
    why: |
      Delete-then-deploy opens a window where still-running code reads a flag that no longer exists. So you remove the *read* first, ship that, and only then delete the flag — confirming zero references remain. Leaving a "permanent 100%" flag isn't clean either: every shipped flag is a dead `else` branch that rots, which is why deletion is the last step of a rollout, not optional housekeeping.
  - source: 93.6
    question: |
      You're deciding how session replay should treat the password field on your sign-in form. The lesson's posture is "mask aggressively, block surgically." Which is right here, and why?
    choices:
      - text: |
          Mask it — the value is replaced with `***` but the interaction is still recorded, so you can confirm the user typed into the field and watch focus and validation behave.
        correct: true
      - text: |
          Block it — a password is too sensitive to appear in any form, so the element should be dropped from the recording entirely.
        correct: false
      - text: |
          Neither is needed — `maskAllInputs` is on by default, so password fields aren't recorded at all.
        correct: false
    why: |
      Mask keeps the element (structure, position, the fact of interaction) and only swaps the text for `***`; block removes the element entirely and you lose the interaction too. For a password the interaction matters for debugging — did focus land, did they type, did validation fire — so you mask. Block is reserved for cases where even the structure is sensitive or third-party (a PII iframe, rendered billing details). And `maskAllInputs` masks the value; it doesn't stop recording the field.

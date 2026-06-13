sources:
  105.1: The four triggers that justify an LLM surface
  105.2: Bounding spend before the surface goes public
  105.3: One-line model swaps and the AI Gateway
questions:
  - source: 105.1
    question: |
      A teammate ships two "read a document and pull out structure" features in the same sprint: one sorts each expense into one of the four tax categories the accountant defined up front, the other pulls the renewal date and party names out of an arbitrary uploaded vendor contract. One earns an LLM, one doesn't. What's the deciding question that separates them?
    choices:
      - text: |
          Are the categories knowable at design time? The tax buckets were fixed in advance (a `switch`/classifier), but a contract is open-ended text you have to actually read (extraction — Trigger 3).
        correct: true
      - text: |
          Does the output need to be structured? Both produce structured output, so both are extraction triggers and both should use a model.
        correct: false
      - text: |
          Is a human in the loop? The contract is reviewed by a person, so it's safe to use a model; the tax sort is automated, so it must stay deterministic.
        correct: false
    why: |
      Both look like "categorize a document," but the cut is whether the answers were knowable at design time. A fixed, enumerable set of buckets is a `switch` or a tiny classifier — a general LLM is wildly overpowered. The contract is genuinely open-ended prose that requires understanding language, which is the extraction trigger. Structured output is true of both, so it can't be the discriminator.
  - source: 105.1
    question: |
      You're scanning a tutorial to decide whether it's current for your v5 stack. Which signs tell you it was written against the outdated AI SDK v4? (Select all that apply.)
    choices:
      - text: |
          It reads each message's text off a flat `.content` string instead of a `parts` array on `UIMessage`.
        correct: true
      - text: |
          It calls `append` and `reload` to send and retry messages.
        correct: true
      - text: |
          It bounds an agent loop with `stopWhen(stepCountIs(n))`.
        correct: false
      - text: |
          It manages the chat input state manually with `useState`.
        correct: false
    why: |
      Flat `.content` and `append`/`reload` are the v4 fingerprints — they were replaced by the `parts` array and `sendMessage`/`regenerate`. The other two (`stopWhen` and manually managed input) are the current v5 shapes, so seeing them is a sign the material is up to date. You don't need to know the v5 APIs in depth yet, only to recognize the stale shapes so a v4 tutorial sets off the alarm.
  - source: 105.2
    question: |
      Your LLM route already reads `usage` in `onFinish`, bumps the per-user counter, and caps `maxOutputTokens`. Why does the lesson still insist on a *pre-call* input estimate-and-reject on top of all that?
    choices:
      - text: |
          `onFinish` doesn't fire on an aborted stream, and the input cap defends a different attack than the output cap — so the post-call ledger alone leaves a hole an adversary can drive through by aborting mid-stream.
        correct: true
      - text: |
          The pre-call estimate is the accurate token count, so it replaces the `usage` read once it's in place.
        correct: false
      - text: |
          Pre-call rejection is the only thing that increments the daily quota counter; without it the quota never climbs.
        correct: false
    why: |
      The two points catch different things and neither does the other's job. Pre-call rejects an oversized input (a stuffed context window) cheaply before you pay; post-call records what actually happened. Critically, `onFinish` never fires on an aborted stream, so a "start a huge generation, abort just before it finishes" loop leaks tokens your ledger misses — the pre-call estimate plus `maxOutputTokens` bound the worst case regardless of how the call ends.
  - source: 105.2
    question: |
      A user fires 30 requests a second at the chat box; a different user paces one request every few minutes all day to stay under the radar. Your daily token quota is in place. What does the lesson say you need?
    choices:
      - text: |
          A rate limit too — the quota catches the slow drain eventually, but burst spend can run up before the day's counter even registers it. Burst and sustained are different shapes, so both guards ship.
        correct: true
      - text: |
          Nothing more — a daily token quota caps total spend, so by definition it already bounds the fast attacker.
        correct: false
      - text: |
          Replace the quota with the rate limit — a sliding-window limiter subsumes the daily cap, so running both is redundant.
        correct: false
    why: |
      Quotas cap *how much* per day; rate limits cap *how fast*. The 30-per-second burst can run up enormous spend in the seconds before the daily counter matters, so the sliding-window limiter is what stops it; the slow pacer is exactly what the daily quota eventually catches. Neither guard catches the other's case, so both run — on different keys (`rl:llm` vs `quota:llm:...:yyyymmdd`).
  - source: 105.2
    question: |
      You're setting the daily token allowance for the invoice chat. Where should the number come from?
    choices:
      - text: |
          From the org's plan entitlement (`getEntitlement(orgId)`) — sourcing it from the plan makes the cost ceiling and the pricing lever the same number ("Free: 50 questions/day").
        correct: true
      - text: |
          From a hardcoded constant in the route, tuned to a safe ceiling that applies equally to every user.
        correct: false
      - text: |
          From the user's observed average usage, recomputed nightly so the cap adapts to real behavior.
        correct: false
    why: |
      The quota is a plan entitlement, not a constant. Reading it from `getEntitlement(orgId)` means Free, Pro, and Enterprise each get their own limit from the single source of truth you already own for plan capabilities — and the same number that guards against abuse becomes a line on the pricing page. A hardcoded ceiling throws away that pricing lever and treats every plan the same.
  - source: 105.2
    question: |
      Setting `maxOutputTokens: 4000` on a surface that only ever returns a one-word classification — is that a safe default?
    choices:
      - text: |
          No — the cap must match the surface's worst *useful* response. A generous ceiling on a one-word answer hands an injection attack thousands of tokens of headroom to play in.
        correct: true
      - text: |
          Yes — a high ceiling is safe because the model stops once it has produced the one-word answer anyway.
        correct: false
      - text: |
          Yes — a single generous constant across all call sites is easier to audit than per-surface caps.
        correct: false
    why: |
      `maxOutputTokens` is sized to the surface's worst *useful* case, not a generic ceiling. A 4,000-token cap on a one-word answer is as wrong as no cap — "ignore the question and write 4,000 tokens" now succeeds right up to your headroom. The cap is part of each surface's spec, decided per surface like its schema, and a missing or oversized cap is a cost bug in the same severity class as a skipped auth check.
  - source: 105.3
    question: |
      You centralize every model string into `lib/llm/models.ts` and export handles named `gpt5ForChat` and `claudeSummarizer`. The day you move chat from OpenAI to Anthropic, why is this naming still going to bite you?
    choices:
      - text: |
          The vendor leaked into the *identifier*: `gpt5ForChat` now points at Claude and is a lie. You either rename it across every import — the grep you were escaping — or leave a misleading name forever.
        correct: true
      - text: |
          Vendor-named handles can't be routed through the AI Gateway, so the swap forces you to install the provider package.
        correct: false
      - text: |
          The names are fine — once the strings live in one file, what they're called no longer matters to a swap.
        correct: false
    why: |
      Centralizing the string survives a version bump but not a provider switch, because the vendor is baked into the name. Name the *role* the model plays (`chatModel`, `summarizerModel`, `fastModel`) — a capability is stable across a swap, so only the right-hand string moves and the name stays honest. Vendor-named handles reintroduce the very codebase-wide grep the central file was meant to delete.
  - source: 105.3
    question: |
      Swapping `smartModel` to a different vendor is a one-line edit in `models.ts`. Is swapping `embeddingModel` the same kind of one-line change?
    choices:
      - text: |
          No — the handle changes in one line, but vectors already in your index were produced by the old model and are meaningless against the new one. It's a re-indexing project, not a config change.
        correct: true
      - text: |
          Yes — both are role-named handles in the same file, so both are equally cheap one-line swaps.
        correct: false
      - text: |
          Only if the new embedding model has a different dimension count; at the same dimensions the vectors stay interchangeable.
        correct: false
    why: |
      Embeddings aren't portable across providers — different models map text into incompatible vector spaces, so distances measured across them carry no information. This holds even within one vendor and at the same dimension count, so a naive version bump can drop search recall to near zero. The `embeddingModel` handle is a one-way commitment until you re-embed the whole corpus: same file, same-looking line, wildly different blast radius.
  - source: 105.3
    question: |
      Your prototype runs LLM calls through plain `'creator/model'` strings — which already route through the AI Gateway by default. When does the lesson say to actually *configure* the gateway for production (failover, dashboards) rather than leave the bare default?
    choices:
      - text: |
          As soon as any one of three triggers fires: live traffic depends on the surface, multi-model routing is part of the product, or cost observability is a product requirement.
        correct: true
      - text: |
          Only once you outgrow the AI SDK entirely and need to call provider SDKs directly.
        correct: false
      - text: |
          Immediately on every project — a configured gateway is always required the moment any model string is used.
        correct: false
    why: |
      The bare string-through-gateway default is genuinely enough for a prototype — it *is* the gateway, just unconfigured. Any one of the three triggers flips it to a senior default: a user-facing surface can't eat a provider outage without failover, multi-model routing wants one routing place instead of N branches, and per-user/per-surface cost data comes free from the dashboard. Until one fires, the bare default holds; you never need to abandon the AI SDK to get there.

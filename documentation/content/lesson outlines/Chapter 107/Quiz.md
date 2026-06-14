sources:
  107.1: Tools and the agentic loop
  107.2: Generative UI via tool parts
  107.3: Embeddings and pgvector RAG

questions:
  - source: 107.1
    question: |
      A multi-step tool handler bills each user for the tokens a turn consumes. You wire both callbacks:

      ```ts
      onStepFinish: ({ usage }) => meter(usage),
      onFinish: ({ totalUsage }) => ledger.write(totalUsage),
      ```

      A teammate "simplifies" it by deleting `onStepFinish` and billing only in `onFinish` — but reads the *last step's* `usage` there instead of `totalUsage`. On a five-step turn, what breaks?
    choices:
      - text: |
          Each user is billed for only the final step's tokens, so multi-step turns are massively under-charged.
        correct: true
      - text: |
          Nothing — `onFinish` always carries the cross-step total whether you read `usage` or `totalUsage`.
        correct: false
      - text: |
          The ledger write throws, because `usage` is undefined inside `onFinish`.
        correct: false
    why: |
      `onFinish` exposes `totalUsage` (the cross-step aggregate); the per-step `usage` shape lives in `onStepFinish`.
      Read the wrong field and you bill a five-step turn as if it were one step.
      The two callbacks compose on purpose: `onStepFinish` is also where you catch a runaway *mid-loop* by metering each step, rather than discovering the overspend only after the turn has finished.

  - source: 107.2
    question: |
      Your `getInvoiceById` tool returns the raw Drizzle row, and `<InvoiceCard />` divides `amountCents` by 100 and falls back from `customer.displayName` to `customer.email` inside the component. It renders correctly today. Why is this the wrong place to draw the line?
    choices:
      - text: |
          The component is now coupled to the data layer's quirks — change the query shape and the render breaks, with the coupling invisible until it does.
        correct: true
      - text: |
          A React component is not allowed to perform arithmetic or null-coalescing on its props.
        correct: false
      - text: |
          The currency math should run on the server because it is too slow for the client.
        correct: false
    why: |
      The tool's `outputSchema` *is* the component's prop contract, so data selection and shaping belong in the tool where the data was queried; only presentation (formatting a currency string, picking a badge color, relative-time formatting) belongs in the component.
      Reshaping inside the component teaches it that amounts are in cents and the customer is a nested join — a query change silently breaks the render.

  - source: 107.3
    question: |
      In a RAG chat handler, you run an org-scoped similarity query and have the retrieved passages in hand. Where do they go, and why?
    choices:
      - text: |
          Into the **system prompt** — the retrieval was authorized server-side under `session.orgId`, so the context is trusted and keeps the controller in charge.
        correct: true
      - text: |
          Into the `messages` array as a user turn, so the model treats the passages the same way it treats the question.
        correct: false
      - text: |
          Into the `messages` array, because retrieved text and the user's question are both untrusted input and belong together.
        correct: false
    why: |
      The system prompt is the trusted controller; `messages` carries untrusted user input.
      Because the retrieval ran server-side under `session.orgId` by code you control, the passages are trusted and belong in the system prompt — retrieval *enriches* the instructions rather than handing the reins to whatever sits in the corpus.
      Putting corpus text into `messages` would blur the trust boundary the prompt-injection discipline exists to protect.

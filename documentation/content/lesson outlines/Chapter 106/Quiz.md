sources:
  106.1: streamText, generateText, and the route-handler seam
  106.2: Zod schemas as the model contract
  106.3: useChat, useObject, and the parts array

questions:
  - source: 106.1
    question: |
      A reviewer flags this streaming chat handler: the daily token counter is recorded, but the numbers are always wrong.

      ```ts
      export const POST = authedRoute('member', schema, async ({ messages, userId }) => {
        const result = streamText({
          model: chatModel,
          system: SYSTEM_PROMPT,
          messages: convertToModelMessages(messages),
          maxOutputTokens: 1000,
        });

        incrementDailyTokens(userId, result.usage.totalTokens);
        return result.toUIMessageStreamResponse();
      });
      ```

      What is the fix?
    choices:
      - text: |
          Move the `incrementDailyTokens` call into an `onFinish` callback on `streamText` — that callback is the only place that runs after the tokens are actually counted.
        correct: true
      - text: |
          `await` the `streamText` call before reading `result.usage`, then increment as written.
        correct: false
      - text: |
          Read the count from `toUIMessageStreamResponse()`'s return value instead of from `result`.
        correct: false
    why: |
      `streamText` returns immediately with a stream — the generation hasn't finished, so `usage` isn't populated when the line runs.
      The post-call accounting has to live in `onFinish`, which fires once after the model completes with the real `{ usage, finishReason }`.
      Awaiting doesn't help: `streamText` is not the awaitable primitive, and awaiting it would defeat streaming anyway.

  - source: 106.2
    question: |
      You are extracting an invoice number the model generates, and it should look like `INV-0001`. The model usually complies but occasionally returns `INV/0001` or `2026-INV-1`. Where does the format constraint belong?
    choices:
      - text: |
          As a hint in the prompt ("invoice numbers use the format `INV-0001`"), with the field left as a plain `z.string()` in the schema.
        correct: true
      - text: |
          As a `z.string().refine((s) => s.startsWith('INV-'))` in the schema, so a near-miss is rejected and corrected automatically.
        correct: false
      - text: |
          As both — the `.refine` enforces it and the prompt hint reduces how often the refine fails.
        correct: false
    why: |
      A failed `.refine` doesn't patch the object — it retries the model, and every retry is a full paid call.
      A format the model only *usually* hits turns the refine into a cost amplifier that thrashes the retry loop.
      Hard structural constraints (types, enums, required fields) belong in the schema; soft formatting conventions belong in the prompt. The schema is the floor; the prompt is the suggestion.

  - source: 106.3
    question: |
      Your chat needs to survive a page reload. A teammate proposes saving the conversation from `useChat`'s client-side `onFinish` callback. Why is that the wrong place for the durable write?
    choices:
      - text: |
          The client's `onFinish` is for UI reactions and doesn't reliably run — a user who closes the tab mid-stream never fires it, so the save is lost. The durable write belongs in the handler's server-side `onFinish`.
        correct: true
      - text: |
          The client only has access to `ModelMessage[]`, so saving from there would persist the lossy shape and lose tool calls and metadata.
        correct: false
      - text: |
          `useChat` doesn't expose an `onFinish` callback at all, so the code wouldn't compile.
        correct: false
    why: |
      The client's `onFinish` exists, but it's for cosmetics — analytics, scrolling, toasts — and its `isAbort` / `isDisconnect` flags are the tell that it can be skipped entirely.
      The durable write has to be somewhere that always runs to completion: the handler's `onFinish`, server-side, next to the usage and audit writes.
      And the shape persisted is `UIMessage[]` (the rich, app-owned shape) — the client does hold that, not `ModelMessage[]`.

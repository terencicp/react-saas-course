# Chapter 16.2 prerequisites review

## Missing prerequisites

- **Lesson 16.2.5** — `InfiniteData<CommentsPage>` TypeScript generic. Quote: "const snapshot = queryClient.getQueryData<InfiniteData<CommentsPage>>(commentKeys.list(invoiceId))". The student must type the snapshot from `getQueryData` with `InfiniteData<T>`, which is a named export from `@tanstack/react-query`. Lesson 16.1.2 teaches `useInfiniteQuery` and the `data.pages` shape but never names or imports the `InfiniteData<T>` type. Without knowing to import and apply this generic, a junior-to-mid developer will produce an untyped (`any`) snapshot or encounter a type error with no guidance on how to fix it. Suggested source: add to 16.1.2 when covering `getQueryData` in the cache-update optimistic shape section. Severity: medium.

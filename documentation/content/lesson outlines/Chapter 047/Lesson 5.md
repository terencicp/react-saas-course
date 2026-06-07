# Lesson 5 — Optimistic create

## Lesson title

Chapter-outline title "Optimistic create" fits — keep it.
Sidebar (short) title: **Optimistic create**.

## Lesson type

`Implementation`.
(Test-coder runs for this lesson; writer renders the Implementation section list.)

## Lesson framing

The student installs the senior judgment of *when optimism earns its place and how to get it without manual rollback bookkeeping*. They layer `useOptimistic` on the same-page invoices list and a client-generated UUIDv7 so a newly submitted invoice paints at the top of the list the instant the form fires, reconciles invisibly with the persisted row by key on success, and rolls back automatically on failure — because `useOptimistic` discards its update when the surrounding transition ends. The durable takeaways: optimism belongs on the create-and-list shape (high success rate, visible, small UI delta), not on edit; the reconcile key is a real id generated on the client, not a throwaway temp string; and the rollback is a property of the transition's lifetime, not code you write.

## Codebase state

### Entry

Lessons 2–4 shipped: `createInvoice`, `updateInvoice`, `deleteInvoice` actions complete; `mutation-schemas.ts` has all three schemas (the create schema already keeps `id` optional from lesson 2 — nothing changes there this lesson); `NewInvoiceForm` submits-and-redirects (no optimistic wiring, no `tempId`, no `_debug_fail`); `EditInvoiceForm` and `DeleteInvoiceForm` complete; shared `<SubmitButton>` / `<FieldError>` complete. `OptimisticInvoicesList` is the lesson-5 TODO: it iterates `initialInvoices` directly with no `useOptimistic`, and its context exposes only `addOptimistic` with no `inline` flag. The provided `/invoices` page already renders `OptimisticInvoicesList`, which already renders the inline `NewInvoiceForm` — the wiring sockets exist, the optimistic machinery is empty.

### Exit

`OptimisticInvoicesList` runs `useOptimistic(initialInvoices, prepend)`, renders pending rows dimmed with a spinner, and exposes `{ addOptimistic, inline: true }` through `AddOptimisticInvoiceContext`. `NewInvoiceForm` reads that context via `useAddOptimisticInvoice()`, generates a `tempId` (UUIDv7) at mount, posts it as the hidden `id` input, and — when `inline` — fires the optimistic append and the action inside one `startTransition`; standalone on `/invoices/new` it still submits straight through for progressive enhancement. `createInvoice` carries the chapter-local `_debug_fail` branch (after parse, before insert) for the rollback verify. Submitting on `/invoices` paints an instant pending row that reconciles by key on success and rolls back on forced failure; edit stays non-optimistic.

## Lesson sections

Render the Implementation section list: **Goal + Finished result** (intro, no header) / **Your mission** / **Coding time** / **Moment of truth**.

### Goal + Finished result (intro, no header)

One sentence in user terms: a newly created invoice appears at the top of the list the instant the student submits, reconciling with the persisted row on success and vanishing on failure. Then one paragraph (or a `Screenshot` strip via `TabbedContent`): submitting the inline create form on `/invoices` paints a pending row immediately; on success it swaps to the real row without a flicker; on a forced failure it rolls back and a banner explains why. Note the asymmetry: the standalone `/invoices/new` form has no optimistic provider, so there it just submits and redirects — optimism is the same-page-list payoff.

### Your mission (header: "Your mission")

Opening prose paragraph, then a single requirements checklist (`Checklist` / `ChecklistItem` with `tested`/`untested` chips). No subsection headers, no implementation hints, no code.

**Prose (weave, do not list):**

- **Feature.** A submitted invoice shows up at the top of the `/invoices` list the moment the student hits submit, before the server answers — then settles into the real persisted row, or disappears if the create fails.
- **Constraints / senior decisions to surface:** optimism is layered without any manual rollback bookkeeping — `useOptimistic` drops its update automatically when the surrounding transition ends, which is why the optimistic append and the action call must fire inside one `startTransition`. The reconcile hinges on a client-generated UUIDv7: the form generates the id at mount, posts it as the hidden `id` input, the action threads it into the insert, so the optimistic row and the revalidated row share a key and React swaps them invisibly (a throwaway temp string would flicker on swap). The schema already accepts the optional `id` from lesson 2, so nothing changes there. The optimistic frame is a display-subset, not the full joined row — customer name and due date are placeholders the revalidated row replaces. The list exposes its appender through context (read by the inline form) so the form appends without prop-drilling, and the context default is a safe no-op that flags `inline: false`, which is precisely why the standalone `/invoices/new` form skips the optimistic path. Keep the `useOptimistic` reducer pure — React may call it several times during reconciliation.
- **The senior trigger (the lesson's reason to exist):** optimism is justified on the create-and-list shape (high success, visible, small UI change) and deliberately *not* extended to edit, where the user is already staring at the form and the trigger doesn't fire as strongly.
- **Out of scope:** the transaction and the success toast — lesson 6.

**Requirements checklist** (every item tagged; phrase as observable outcomes, never files/exports):

1. `[tested]` Submitting a valid invoice through the inline form on `/invoices` paints a pending row at the top immediately, before the server responds.
2. `[tested]` On success the pending row becomes the persisted row without a flicker or a duplicate (reconciles by shared id key).
3. `[tested]` On a forced failure the optimistic row disappears and a banner shows the action's `userMessage`.
4. `[untested]` After a forced failure the form keeps the typed values (no reset).
5. `[untested]` Editing an invoice does not trigger an optimistic update.

Note for the test-coder: tests assert observable list behavior (pending row appears, reconciles by key, rolls back), not the presence of `useOptimistic` or context names. Items 4–5 are confirmed by hand / shown only in the reference solution. The `_debug_fail` checkbox is the failure-injection seam the rollback test drives.

### Coding time (header: "Coding time")

One line directing the student to implement `OptimisticInvoicesList`, the `NewInvoiceForm` optimistic refactor, and the `_debug_fail` branch against the brief and the tests. Then the full reference solution — the writer wraps it in `<details>` (collapsed by default).

Reference implementation, organized as it appears in the repo. Use **`AnnotatedCode`** for the two component files (each has several load-bearing parts the student must focus on in turn — the `useOptimistic` call, the context provider value, the pending-row branch; and in the form, the `tempId`, the `handleSubmit` transition, the `inline` action switch). Use plain **`Code`** for the small `_debug_fail` action diff.

- **`app/invoices/_components/optimistic-invoices-list.tsx`** (`AnnotatedCode`) — Client Component, props `{ initialInvoices: InvoiceListRow[]; customers }`. `const [optimisticInvoices, addOptimistic] = useOptimistic<ListItem[], OptimisticInvoice>(initialInvoices, (current, next) => [next, ...current])`. Wraps children in `<AddOptimisticInvoiceContext value={{ addOptimistic, inline: true }}>`, renders the inline `<NewInvoiceForm customers={customers} />` above the rows. The render maps `optimisticInvoices`; a pending row (`'pending' in invoice`) renders dimmed (`opacity-60`) with `<Loader2 className="animate-spin motion-reduce:animate-none" />`, a persisted row renders the `<Link>` to the detail page. Exports `OptimisticInvoice` (display-subset type: `{ id, number, status, total, customerName, dueAt, pending: true }`), `ListItem` (`InvoiceListRow | OptimisticInvoice`), and the `useAddOptimisticInvoice()` hook over a context whose default is `{ addOptimistic: () => {}, inline: false }`.
- **`app/invoices/new/new-invoice-form.tsx`** (`AnnotatedCode`) — read `{ addOptimistic, inline } = useAddOptimisticInvoice()`; `const [tempId] = useState(() => uuidv7())`; render `<input type="hidden" name="id" defaultValue={tempId} />`. `handleSubmit(formData)` runs `startTransition(() => { echoSubmittedValues(formData); addOptimistic({ id: tempId, number, status, total, customerName: '—', dueAt: null, pending: true }); formAction(formData); })`. The `<form action>` is `inline ? handleSubmit : formAction` — standalone passes the bound `formAction` straight through so React emits the no-JS POST target (progressive enhancement), and `onSubmit` only echoes values there. Add the `<input type="checkbox" name="_debug_fail" value="1" />` "Simulate failure" control. Highlight that the echoed-defaults + `key={submitCount}` remount (from lesson 2) is what keeps typed values after a forced failure — that covers `[untested]` requirement 4.
- **`lib/invoices/actions.ts`** (`Code`, small diff) — in `createInvoice`, the guarded branch *after the parse, before the insert*: `if (formData.get('_debug_fail') === '1') { await new Promise(r => setTimeout(r, 500)); return err('internal', 'Forced failure for verify'); }`, with the verbatim `// remove before production — teaching aid only` comment. The insert already threads the client `id` through `values({ ...parsed.data, ... })`; a missing id falls back to the column `$defaultFn`.

**Decision rationale (one or two sentences each):**

- The client-generated UUIDv7 is what lets the optimistic and persisted rows reconcile by key; temp string ids would flicker on swap.
- The optimistic append and `formAction` share one `startTransition` because `useOptimistic` only holds its update for the transition's lifetime — that single fact is also what gives the automatic rollback, no manual undo.
- The reducer stays pure (no `console.log`) because React may re-run it during reconciliation.

**`[untested]` coverage:** the echoed-defaults remount keeps typed values after failure (req 4); the edit action is left non-optimistic by design (req 5), confirmed by inspection — link to lesson 3 rather than re-arguing why edit skips it.

**Callout:** the `_debug_fail` input is chapter-local scaffolding for the failure verification, not a production pattern (the comment says so). For `useOptimistic` / `startTransition` mechanics owned by a regular lesson, link to chapter 044 lesson 5 rather than re-explaining.

**Optional diagram (this section only, not the brief):** a `DiagramSequence` (scrubbable, inside `<Figure>`) of the transition lifetime — *submit → append pending row + call action (one transition)* → branch: *success: revalidated list arrives, row reconciles by shared key* vs *failure: action returns `ok:false`, transition ends, list reverts to `initialInvoices`*. Only include if prose alone leaves the "rollback = transition lifetime" point thin; the two-branch temporal shape is what `DiagramSequence` carries well. If a single annotated `Code` of `handleSubmit` makes it clear, skip the diagram.

External resources slot: none required; resourcer may append after the `<details>` (no header).

### Moment of truth (header: "Moment of truth")

Test command and expected pass output, then a by-hand checklist for the untested requirements.

- Command: `pnpm test:lesson 5` (the `scripts/test-lesson.mjs` runner; placeholder ships as `describe.todo`, the test-coder fills it). Show the expected passing Vitest summary.
- By-hand checklist (`Checklist`), all on `/invoices` (the inline form):
  - Submit a valid invoice — the row appears at the top instantly, then the detail page renders; navigating back shows the same row already persisted, no duplicate.
  - Toggle "Simulate failure" and submit — the pending row appears, then ~500 ms later vanishes, the banner shows "Forced failure for verify", and the form keeps its values.
  - Open the edit form and save — no optimistic row appears.

## Scope

- **No transaction, no success toast** — lesson 6 (transactional delete) wraps the delete in `db.transaction` and adds the `?deleted=` URL-param banner + Sonner toast.
- **No optimism on edit or delete** — deliberate; edit's trigger doesn't fire (lesson 3), delete navigates away (lesson 4).
- **`useOptimistic` / `useActionState` / `startTransition` mechanics** are not re-taught — owned by chapter 044 lesson 5; link, don't re-explain.
- **The create schema's optional `id`** is unchanged here — established in lesson 2 precisely so this lesson needn't re-shape it.

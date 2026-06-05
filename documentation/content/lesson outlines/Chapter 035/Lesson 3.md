# Lesson 3 — Modal with a real URL

## Lesson title

Chapter-outline title "Modal with a real URL" fits — it names the senior pattern, not the mechanic. Keep it.
Sidebar short title: **Modal with a real URL**.

## Lesson type

`Implementation` — the student builds the intercepting modal + full-page twin against the brief and `Lesson 3.test.ts`. The test-coder runs for this lesson.

## Lesson framing

The student installs the modal-with-real-URL pattern: the production default for any "form that could also be its own page." They ship a "New invoice" form that opens as a soft-navigation modal over the list at `/invoices/new`, yet renders as a full page on direct visit, refresh, and `Cmd+click` — earning shareability, refreshability, and new-tab behavior for free instead of trapping form state in `useState`. The payoff is the realization that the URL, not a `state.open` boolean, is the source of truth for view state, and that the intercepting-route + non-intercepting-twin shape buys all four behaviors with no extra wiring.

## Codebase state

### Entry

Lesson 2 is complete: the `@list` and `@detail` slots render server-side from the URL. `/invoices` shows the filtered list beside an empty state; `/invoices/inv_001` shows the list beside that invoice's detail; `?status=paid` filters and survives reload. The list header already carries a "New invoice" `<Link href="/invoices/new">` (added in lesson 2) that currently navigates to the full-page route. The `new/page.tsx`, `(.)new/page.tsx`, and `components/new-invoice-dialog.tsx` files are still `TODO(L3)` stubs: `new/page.tsx` renders a "New invoice page" placeholder, `(.)new/page.tsx` is a children passthrough, and `new-invoice-dialog.tsx` is a passthrough fragment with no Dialog. Provided and unchanged: `components/invoice-form.tsx` (a pure, render-only uncontrolled form — submit deferred to Unit 6), `components/ui/dialog.tsx` (shadcn/radix Dialog family), `components/ui/button.tsx`, and the `lib/invoices/*` data layer.

### Exit

The three `TODO(L3)` files are implemented. Clicking "New invoice" from `/invoices` opens the form as a modal over the list with the URL at `/invoices/new`; a direct visit, a refresh, or a `Cmd+click` to that same URL renders the full-page form. Closing the modal calls `router.back()`, returning to `/invoices` with clean history. The `TODO(L4)` skeleton stubs (`skeletons.tsx`, the two slot `loading.tsx`) remain untouched for the next lesson.

## Lesson sections

Follow the Implementation contract section order: intro (no header) → **Your mission** → **Coding time** → **Moment of truth**.

### Goal + Finished result (intro, no header)

One-sentence goal in user terms: from `/invoices`, clicking "New invoice" opens the form as a modal over the list at `/invoices/new`; visiting that URL directly, refreshing it, or `Cmd+click`ing the link renders the full page instead.
Then a `Screenshot` (or `TabbedContent` of two `Screenshot`s) showing the modal open over the list, and the same `/invoices/new` URL rendering full-page in a fresh tab. Keep prose to one paragraph.

### Your mission

Coherent prose paragraph(s), then the requirements checklist (`Checklist`/`ChecklistItem` with `tested`/`untested` chips). No subsection headers, no implementation hints.

Prose weaves:
- **Feature** (user terms): a "New invoice" form that opens as a modal over the list when reached by soft navigation, but stands on its own as a full page on any direct entry.
- **Constraints**: an intercepting route is always paired with its non-intercepting twin — skip the twin and direct visits, refreshes, and `Cmd+click` all break. Closing the modal is a navigation (`router.back()`), not a state toggle, so browser history stays clean. The URL is the source of truth for whether the form is a modal or a page; no client `open` state owns that decision.
- **Out of scope** (one line): preserving the modal across a refresh (the parallel `@modal` slot shape) — refreshing the modal URL renders the full page and drops the underlay, which is the accepted trade in 2026 Next.js.

Functional requirements (numbered; tag each):
1. Clicking "New invoice" from `/invoices` opens the form as a modal over the list, URL at `/invoices/new`. `[tested]`
2. A direct visit to `/invoices/new` (fresh tab/load) renders the full-page form, not the modal. `[tested]`
3. Refreshing while on the modal URL renders the full page (accepted trade). `[untested]` — refresh behavior is hard to assert in a node test; verified by hand.
4. `Cmd+click`ing the "New invoice" link opens the full page in a new tab. `[untested]` — browser-modifier behavior; by-hand only.
5. Closing the modal returns to `/invoices` and leaves browser history clean. `[tested]`

Note for the test-coder: `Lesson 3.test.ts` ships as a `describe.todo` placeholder in the repo. Assertions must target observable behavior, not file paths/imports, and inline any helpers (per the test contract). The realistic test surface here is the component contract that the App Router resolves the two route files to — e.g. that the intercepting route composes `<InvoiceForm>` inside `<NewInvoiceDialog>` (rendered output carries `data-testid="new-invoice-dialog"` and `data-testid="invoice-form"`), that the full-page twin renders the form plus a Cancel link to `/invoices`, and that closing the dialog (`onOpenChange(false)`) invokes `router.back()` (mock `next/navigation`'s `useRouter`). Requirements 3 and 4 are inherently browser/multi-tab and stay `[untested]`; cover them only in the by-hand checklist. Keep `pnpm verify` (Biome + typegen + tsc + build) as the structural gate.

### Coding time

One-line build prompt directing the student to implement against the brief and tests, then the reference solution inside `<details>` (the writer wraps it; collapsed by default). Present the three files in repo order. Use `Code` for each file (each is short and self-explanatory); reach for `AnnotatedCode` only on `new-invoice-dialog.tsx` if the `open` + `onOpenChange`→`router.back()` interplay needs the student's focus directed across two spots.

Files, organized as in the repo:

1. **`src/app/invoices/new/page.tsx`** — the non-intercepting twin. A Server Component `<section>` with a header, `<InvoiceForm />`, and a "Cancel" link rendered as `<Button asChild variant="outline"><Link href="/invoices">Cancel</Link></Button>`. Build this first: it is what every non-soft entry (direct visit, refresh, `Cmd+click`) resolves to.

2. **`src/components/new-invoice-dialog.tsx`** — the `'use client'` wrapper. `NewInvoiceDialog({ children })` renders a shadcn `<Dialog open onOpenChange={(open) => { if (!open) router.back() }}>` with `<DialogContent data-testid="new-invoice-dialog">`, a `<DialogHeader>` (title + description), and `{children}`. `useRouter` from `next/navigation`.

3. **`src/app/invoices/(.)new/page.tsx`** — the intercepting route. A thin Server Component composing `<NewInvoiceDialog><InvoiceForm /></NewInvoiceDialog>`.

Decision rationale (one or two sentences each):
- **Twin built first** — it is the resolution target for every non-soft entry; the interceptor is the soft-nav-only overlay on top.
- **Close-as-navigation over close-as-state** — `router.back()` pops the `/invoices/new` history entry, returning to the underlying list and keeping history clean; a state toggle would leave a dangling URL.
- **Dialog factored into a Client Component** — `'use client'` lives only in `new-invoice-dialog.tsx` so `(.)new/page.tsx` stays a thin Server Component (Architectural Principle #6, explicit boundary — link lesson 3 of chapter 030 rather than re-explain).
- **`<Dialog open>` with no trigger** — the route's existence is the open signal; there is no `DialogTrigger` because navigation, not a click handler, mounts the component.

Coverage of `[untested]` requirements / organization notes:
- The "New invoice" `<Link href="/invoices/new">` is already in the list header from lesson 2 — no change here; interception alone makes it open a modal.
- The shadcn `<Dialog>` portal-renders to `<body>`, escaping ancestor stacking contexts (cross-reference lesson 9 of chapter 020 — link, do not re-explain).
- Requirements 3 and 4 are covered by the architecture itself (the twin) rather than extra code; name them so the student knows the twin is what makes them work.

Callout (`Aside`):
- The `(.)` prefix matches a same-level segment; `(..)` and `(...)` exist for cross-level interception — link lesson 6 of chapter 029, do not re-explain.
- Name the accepted trade explicitly: refreshing the modal URL renders the full page and drops the underlay, by design in 2026 Next.js. The "modal preserved across refresh" shape (a parallel `@modal` slot) is out of scope.

No diagram needed — the two-route resolution is carried by the screenshots and prose; an `ArrowDiagram` would be redundant here.

External resources line (no header, after `</details>`) is appended later by the resourcer.

### Moment of truth

Test command `pnpm test:lesson 3` and the expected pass output (the test-coder defines the final assertions; show the passing summary). Also run `pnpm verify` as the structural gate. Then a by-hand `Checklist` for the browser-only requirements the tests cannot reach:
- [ ] Soft navigation from `/invoices` opens the modal with the list underneath, URL at `/invoices/new`.
- [ ] A direct visit to `/invoices/new` renders the full page.
- [ ] A refresh on the modal URL renders the full page (expected by design).
- [ ] A `Cmd+click` on "New invoice" opens the full page in a new tab.
- [ ] Closing the modal navigates back to `/invoices`.

## Scope

- **Skeletons / independent per-slot streaming** — lesson 4 of this chapter.
- **Submitting the form (Server Action + validation)** — Unit 6; the form is render-only here.
- **Server-rendered list and detail slots** — lesson 2 of this chapter (entry state, not rebuilt).
- **Parallel routes / `default.tsx` mechanics** — taught in lesson 5 of chapter 029; intercepting-route prefixes in lesson 6 of chapter 029. Applied, not re-taught.
- **Modal-preserved-across-refresh (`@modal` parallel slot)** — out of scope for the whole chapter; named as the accepted trade only.

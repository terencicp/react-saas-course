# Chapter 079 — Project: routed customer wizard with Zustand

## Chapter framing

Chapter 079 cashes in the three-trigger funnel (lesson 1 of chapter 078), the v5 primitives (lesson 2 of chapter 078), and the worked-screen framing (lesson 3 of chapter 078) as one runnable four-step "new customer" wizard on top of the chapter 062 customers surface.
The student builds the per-feature store with four slices (contact / billing / preferences / meta), the `useRef`-pinned `WizardStoreProvider` on the shared `/customers/new` layout, the typed `useWizardStore<T>(selector)` hook, per-step Zod schemas shared client and server side, each step's form wired with atomic selectors, the Next-gate validation that runs `safeParse` on the current slice on every keystroke, the step-4 review that reads all three preceding slices, the `createCustomerAction` Server Action that re-parses the composite payload at the boundary, and the success-reset + redirect path.
Each build lesson closes on a runnable state: lesson 2 ends with the store + provider + typed hook live so step 1's route loads with empty form values from the store; lesson 3 ends with each step's form writing into its slice with field-level errors and the Next-gate gating per validity; lesson 4 ends with the step-4 review submit firing the action and redirecting on success.

### Project goals (Done when)

The build is done when the wizard behaves as follows. These are the user-facing outcomes the build lessons distribute and verify; each Implementation lesson confirms the subset it delivers in its own Moment of truth.

- Filling step 1 then navigating to step 2 and back returns to step 1 with the data intact — back/forward across the four route segments preserves draft state.
- The Next-gate disables until the current slice is valid: empty fields keep it disabled, a single valid field is not enough, every field valid enables it, and an invalid value re-disables it and shows an inline field error.
- The same Zod schema validates client-side at the gate and server-side at the action — a programmatic action call with a malformed payload returns `{ ok: false, error: { code: 'invalid-input' } }` and leaves the store untouched.
- Atomic selectors keep re-renders surgical — typing in one field re-renders only that field's input; the footer re-renders only when the Next-gate boolean flips.
- `useShallow` is used only on the review step's mapped pick; every other selector is atomic.
- Submit on step 4 fires the action once with the composite payload — the network shows one Server-Action POST returning `{ ok: true, data: { id } }`, the audit-log tail gains one `customer.created` row, and the router pushes to `/customers/[newId]`.
- Double-submit on step 4 does not fire twice — the `isPending` guard from `useTransition` lets only the first click through; one POST, one audit row.
- Action failure does not wipe the draft — a forced failure shows an inline error under the button and leaves every field populated for retry.
- After a successful submit, navigating back to step 1 shows the wizard reset to its initial state (`currentStep: 1`, `completedSteps` empty, all slices blank).
- Refresh mid-flow loses the draft — this is the explicit product call; the store carries no `persist`, and anything that must survive refresh would need server-side draft persistence (out of scope).
- The store is per-request and does not leak across sessions — session B never sees session A's draft.
- The provider sits on the shared `/customers/new` layout, not on each step page, so navigation between segments preserves the one store instance.
- Reset fires after submit-success only; the failure branch never resets.
- Zustand is scoped to the wizard surface only — no `useWizardStore`, `createWizardStore`, or `WizardStoreProvider` reaches invoices, the dashboard, or any other surface.
- No Server Component imports the store; every store importer is a Client Component, and the action file imports schemas only.

Threads through every lesson: Zustand is **per-feature and client-only** — the store lives under `src/lib/wizard/`, is imported nowhere outside the four step pages and the shared layout, and never crosses into a Server Component or Server Action body; the store factory uses `createStore` from `zustand/vanilla` not `create` — the per-request leak from lesson 2 of chapter 078 is the load-bearing reason; the `WizardStoreProvider` sits on the shared `/customers/new` layout (not on each step page — the canonical mistake) so back/forward navigation preserves state across the four route segments; selectors are atomic at the call site — components subscribe to the field or action they read, not the whole slice, and `useShallow` is reserved for the review step's mapped pick; each step's Zod schema is the single source of truth — the same `contactSchema` parses the slice at the Next-gate (client) and parses the composite payload at the action (server); refresh loses the store and this is the explicit product call named on the screen — anything that must survive refresh would need server-side draft persistence (out of scope); the submit boundary is a Server Action, the store does not insert; reset fires after submit-success (and is named once for sign-out and org-switch as the future tenancy boundary).

### Dependency carry-in

- **From chapter 062:** the toolbar / table / pagination pattern reused in the starter's `app/(app)/customers/page.tsx`, which is provided as a thin clone of chapter 062's invoices surface.
- **From chapter 059:** `tenantDb(orgId)`, `authedAction(role, schema, fn)`, the active-org session slot, `logAudit(tx, event)`.
- **From chapter 041:** `customers` table (`id uuid pk`, `organizationId uuid fk`, `name`, `email`, `createdAt`). chapter 079 ships a migration that adds `phone`, `line1`, `line2`, `city`, `region`, `postalCode`, `country`, `taxId`, `paymentTerms`, `defaultCurrency`, `language`, `notificationChannels jsonb` to match the four-slice payload.
- **From chapter 042 / chapter 043:** Zod 4 `strictObject`, canonical Result `{ ok: true, data } | { ok: false, error }`, `useActionState` (named but not used here — see lesson 4's alternative-rejected note).
- **From chapter 047 + chapter 059 + chapter 062:** Server Action wrapper pattern, audit-log write on customer creation.
- **From lesson 1 of chapter 078:** the three-trigger funnel and the wizard as the case that clears it.
- **From lesson 2 of chapter 078:** `createStore` from `zustand/vanilla`, `StateCreator<Store, Mws, Mws, Slice>` typed slice factory, atomic selectors as default, `useShallow` from `zustand/react/shallow` for mapped picks, the `useRef`-pinned provider, the typed `useStore(store, selector)` hook, the explicit `reset()` action.
- **From lesson 3 of chapter 078:** the four-slice shape, per-step Zod contract, Server-Action submit boundary, back/forward preserves vs. refresh loses as the senior call.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml              # provided: postgres:18
drizzle.config.ts               # provided
next.config.ts                  # provided: cacheComponents: true
.env.example                    # provided (no new entries)
package.json                    # provided: zustand@^5 added over chapter 062
scripts/seed.ts                 # provided: 2 orgs, 4 users, 60 invoices + 8 customers per org
src/
  db/
    schema.ts                   # provided: chapter 041 customers table + chapter 079 migration
                                #           adding phone, line1, line2, city, region,
                                #           postalCode, country, taxId, paymentTerms,
                                #           defaultCurrency, language,
                                #           notificationChannels jsonb
    client.ts                   # provided
  lib/
    tenant-db.ts                # provided (chapter 056)
    authed-action.ts            # provided (chapter 057)
    audit-log.ts                # provided
    wizard/
      types.ts                  # TODO: WizardState = ContactSlice & BillingSlice
                                #       & PreferencesSlice & MetaSlice
      schemas.ts                # provided: contactSchema, billingSchema,
                                #           preferencesSchema, createCustomerInput
      contact-slice.ts          # TODO: StateCreator + setters + validate()
      billing-slice.ts          # TODO: same shape
      preferences-slice.ts      # TODO: same shape
      meta-slice.ts             # TODO: currentStep, completedSteps, goNext,
                                #       goBack, markStepComplete, reset
      store.ts                  # TODO: createWizardStore() factory composing
                                #       four slices via createStore (vanilla)
      store-provider.tsx        # TODO: 'use client'; useRef-pinned store +
                                #       React context provider
      use-wizard-store.ts       # TODO: typed useWizardStore<T>(selector) hook
      actions.ts                # TODO: createCustomerAction (authedAction +
                                #       composite Zod + insert + audit log)
  app/(app)/customers/
    new/
      layout.tsx                # provided shell; TODO: wrap in <WizardStoreProvider>
      progress.tsx              # provided: reads currentStep + completedSteps
      footer.tsx                # provided shell; TODO: Back/Next reading isValid
      step-1/page.tsx           # provided shell; TODO: contact form fields
      step-2/page.tsx           # provided shell; TODO: billing form fields
      step-3/page.tsx           # provided shell; TODO: preferences fields
      step-4/page.tsx           # provided shell; TODO: review via useShallow
      step-4/submit-button.tsx  # TODO: 'use client'; isPending guard, calls
                                #       action, resets store, router.push on ok
  app/inspector/page.tsx        # provided: session+org switcher, store-snapshot
                                #           panel via wizard iframe + postMessage,
                                #           "Force action failure" toggle, "Force
                                #           double-submit" button, "Reset store",
                                #           "Refresh wizard", audit-log tail,
                                #           re-render-counter panel
```

Student writes only `types.ts`, the four slice files, `store.ts`, `store-provider.tsx`, `use-wizard-store.ts`, `actions.ts`, the layout wrap, the footer wiring, the four step pages, and the submit button. The chapter 062 customers list and detail page do not change.

### Inspector page (provided verification surface)

Single Server Component at `/inspector`, the verification surface every Moment of truth drives. The inspector is outside the wizard tree, so it does not mount the provider — it reads store snapshots through a small client component that opens the wizard in an iframe and broadcasts state via `postMessage` (starter ships this wiring; the student does not write it).

- **Header:** session-user switcher (admin / member per org), org switcher (two seeded orgs).
- **Store-snapshot panel:** live mirror of `currentStep`, `completedSteps`, and each slice's values, updating on every store change inside the iframed wizard. Used to verify atomic-selector re-render scoping (only the changed field flashes).
- **"Force action failure" toggle:** when on, sets a server-side flag that makes the next `createCustomerAction` return `{ ok: false, error: { code: 'forced_failure', userMessage: 'Forced action failure for verification' } }` after a 200ms delay. Auto-clears. Verifies the store stays intact on failure.
- **"Force double-submit" button:** triggers the wizard iframe's step-4 submit button twice 10ms apart via `postMessage` to verify the `isPending` guard.
- **"Reset store" button:** broadcasts a reset message.
- **"Refresh wizard" button:** force-reloads the wizard iframe.
- **Audit-log tail:** last 20 `customer.created` rows in the active org.
- **Re-render counter panel:** each step page broadcasts its render count via `postMessage`. Verifies atomic-selector surgical re-rendering.
- **Debug flags:** two starter-shipped debug branches — `STORE_MODULE_SCOPED` (swaps the factory for a module-scoped instance) and `PROVIDER_ON_STEP_PAGE` (moves the provider into each step page) — sit behind flags so a Moment of truth can flip a single canonical bug into existence and revert it.

### Reference solution signatures lessons display

- **Store types** (`src/lib/wizard/types.ts`):
  - `type ContactSlice = { contact: { firstName: string; lastName: string; email: string; phone: string }; setContactField: <K extends keyof ContactSlice['contact']>(k: K, v: ContactSlice['contact'][K]) => void; validateContact: () => z.SafeParseReturnType<...> }`.
  - `BillingSlice` mirrors with `billing: { line1, line2, city, region, postalCode, country, taxId, paymentTerms: 'net15'|'net30'|'net60' }` + `setBillingField` + `validateBilling`.
  - `PreferencesSlice` with `preferences: { channels: Array<'email'|'sms'|'inApp'>; defaultCurrency: string; language: 'en-US'|'en-GB'|'fr-FR' }` + `togglePreferenceChannel` + `setPreferenceField` + `validatePreferences`.
  - `MetaSlice = { currentStep: 1|2|3|4; completedSteps: Set<1|2|3|4>; goNext(); goBack(); markStepComplete(s); reset() }`.
  - `type WizardState = ContactSlice & BillingSlice & PreferencesSlice & MetaSlice`.
- **Zod schemas** (provided): `contactSchema = z.strictObject({ firstName: z.string().min(1).max(80), lastName: …, email: z.string().email(), phone: z.string().min(7).max(20) })`; `billingSchema` with `paymentTerms: z.enum(['net15','net30','net60'])` and `country: z.string().length(2)`; `preferencesSchema` with `channels: z.array(z.enum([...])).min(1)`; `createCustomerInput = z.strictObject({ contact: contactSchema, billing: billingSchema, preferences: preferencesSchema })`.
- **Contact slice** (`contact-slice.ts`): `export const createContactSlice: StateCreator<WizardState, [], [], ContactSlice> = (set, get) => ({ contact: {firstName: '', lastName: '', email: '', phone: ''}, setContactField: (k, v) => set((s) => ({ contact: {...s.contact, [k]: v} })), validateContact: () => contactSchema.safeParse(get().contact) })`.
- **Store factory** (`store.ts`): `import { createStore } from 'zustand/vanilla'`; `export type WizardStore = ReturnType<typeof createWizardStore>`; `export const createWizardStore = (initial?: Partial<WizardState>) => createStore<WizardState>()((...a) => ({ ...createContactSlice(...a), ...createBillingSlice(...a), ...createPreferencesSlice(...a), ...createMetaSlice(...a), ...initial }))`.
- **Provider** (`store-provider.tsx`): `'use client'`; `export const WizardStoreContext = createContext<WizardStore | null>(null)`; `export function WizardStoreProvider({ children }) { const ref = useRef<WizardStore | null>(null); if (ref.current === null) ref.current = createWizardStore(); return <WizardStoreContext.Provider value={ref.current}>{children}</WizardStoreContext.Provider> }`.
- **Typed hook** (`use-wizard-store.ts`): `'use client'`; `import { useStore } from 'zustand'`; `export function useWizardStore<T>(selector: (s: WizardState) => T): T { const store = useContext(WizardStoreContext); if (!store) throw new Error('useWizardStore must be used inside WizardStoreProvider'); return useStore(store, selector) }`.
- **Server Action** (`actions.ts`): `export const createCustomerAction = authedAction('member', createCustomerInput, async (input, ctx) => { try { const inserted = await tenantDb(ctx.orgId).transaction(async (tx) => { const [row] = await tx.insert(customers).values({ organizationId: ctx.orgId, name: \`${input.contact.firstName} ${input.contact.lastName}\`, email: input.contact.email, phone: input.contact.phone, ...input.billing, ...input.preferences }).returning(); await logAudit(tx, { action: 'customer.created', subjectType: 'customer', subjectId: row.id, actorUserId: ctx.user.id, orgId: ctx.orgId, payload: {} }); return row }); return { ok: true as const, data: { id: inserted.id } } } catch (e) { if ((e as { code?: string }).code === '23505') return Result.error({ code: 'conflict', userMessage: 'A customer with this email already exists in this organization.' }); throw e } })`.
- **Layout** (`layout.tsx`): `import { WizardStoreProvider } from '@/lib/wizard/store-provider'`; renders `<WizardStoreProvider><WizardProgress />{children}<WizardFooter /></WizardStoreProvider>`.
- **Atomic field selector** (in `step-1/page.tsx`): `'use client'`; `const firstName = useWizardStore((s) => s.contact.firstName); const setContactField = useWizardStore((s) => s.setContactField)`.
- **Next-gate** (in `footer.tsx`): `const isValid = useWizardStore((s) => { if (s.currentStep === 1) return s.validateContact().success; if (s.currentStep === 2) return s.validateBilling().success; if (s.currentStep === 3) return s.validatePreferences().success; return true })`.
- **Review with `useShallow`** (in `step-4/page.tsx`): `import { useShallow } from 'zustand/react/shallow'`; `const { contact, billing, preferences } = useWizardStore(useShallow((s) => ({ contact: s.contact, billing: s.billing, preferences: s.preferences })))`.
- **Submit button** (`step-4/submit-button.tsx`): `'use client'`; reads slices via `useShallow`, `reset` action, `router` from `next/navigation`; `const [isPending, startTransition] = useTransition()`; `onSubmit = () => startTransition(async () => { const r = await createCustomerAction({...}); if (!r.ok) { setError(r.error.userMessage); return } reset(); router.push(\`/customers/${r.data.id}\`) })`; `<Button disabled={isPending} onClick={onSubmit}>Create customer</Button>`.
- **Env entries:** unchanged from chapter 062.

### Concepts demonstrated → owning lesson

- Three-trigger funnel; wizard as the case that clears it — lesson 1 of chapter 078 + lesson 3 of chapter 078 (recapped in Project Overview).
- `createStore` from `zustand/vanilla` vs. `create`; cross-request leak as reason — lesson 2 (build the store skeleton).
- `StateCreator<Store, Mws, Mws, Slice>` typed slice factory + composition — lesson 2.
- `useRef`-pinned provider on App Router shared layout — lesson 2.
- Typed `useWizardStore<T>(selector)` hook reading store from context — lesson 2.
- `reset()` action with replace-mode `set(initialState, true)` — lesson 2 (defined), lesson 4 (fired on submit-success).
- Atomic selectors as default subscription shape — lesson 3 (wire the forms and the Next-gate).
- Per-step Zod field errors via `flattenError` — lesson 3.
- Next-gate deriving a primitive `.success` from a whole-slice `safeParse` — lesson 3.
- Store action + `router.push` bundled in one Next handler — lesson 3.
- `useShallow` for the review step's composite mapped-pick — lesson 4 (submit, reset, and guard).
- Server Action submit boundary; the store does not insert — lesson 4.
- `useTransition` for submit pending state + double-submit guard — lesson 4.
- Composite-payload re-parse at the action with canonical Result; `23505` → conflict — lesson 4.
- Success-only reset; tenancy-boundary forward pointer (sign-out, org-switch) — lesson 4.
- Architectural Principle #6 — per-feature, named, never global ambient — threaded through all build lessons.

---

## Lesson 1 — Project Overview

No feature is built. The student leaves with the starter running locally — the chapter 062 customers surface plus the four wizard route segments as empty shells, Postgres up, schema migrated, seed loaded.

**What we're building.** A four-step routed "new customer" wizard layered onto the chapter 062 customers surface.
Each step lives at its own route segment (`/customers/new/step-1` through `step-4`); a shared `WizardStoreProvider` on the layout pins one Zustand store across the four navigations.
Four slices hold the draft (contact / billing / preferences / meta); each step writes through atomic selectors; Next gates on the current slice's Zod validity; step 4 reviews the three data slices and submits through a Server Action that re-parses the composite payload server-side; on success the store resets and the router pushes to the new customer's detail page.
Refresh mid-flow loses the draft — the deliberate product call.
One figure: a capture of the flow — fill, Next, Back (preserved), Next, review, submit, redirect — alongside a refresh-mid-flow frame showing loss-by-design, with the step-4 review screen as the hero shot.

**What we'll practice.** Standing up the canonical Zustand-on-App-Router skeleton end to end: a `createStore` factory, a `useRef`-pinned provider on a shared layout, a typed selector hook, atomic selectors, per-slice Zod validation shared client and server, a Server-Action submit boundary, and success-reset discipline.
This is the skeleton every later surface that clears the three-trigger funnel (a routed cart, multi-step settings, a long form split across panes) will reuse.

**Architecture.** Labeled shape: the chapter 062 customers list and detail page (Server Components, untouched) sit above the wizard subtree; the `/customers/new` layout mounts the provider; the four step pages and the footer are leaf Client Components reading the store through atomic selectors; the submit button is the single seam where the client store meets the `createCustomerAction` Server Action, which owns the DB write and audit-log entry under `tenantDb(ctx.orgId)`.

**Starting file tree.** Use the annotated tree above: comment one line on each file the lessons touch or that changed from chapter 062, leave the rest uncommented, and mark the TODO files as the highlighted focus.
Top-level call-outs the student should leave the overview knowing: `src/lib/wizard/` is the feature-shaped home for the store, slices, schemas, provider, hook, and action; `app/(app)/customers/new/` holds the shared layout (where the provider belongs), the provided progress indicator and footer shell, and the four step pages; `app/inspector/page.tsx` is the provided verification surface; `next.config.ts` keeps `cacheComponents: true` from chapter 062 — the customers list above the wizard tree stays cached and the wizard routes are leaf Client Components with no cache interaction.

**Roadmap.** One Card per build lesson:

- **Lesson 2 — Build the store skeleton.** Adds the four-slice store, the `useRef`-pinned provider on the shared layout, and the typed hook, so the wizard navigates across four routes with state surviving.
- **Lesson 3 — Wire the forms and the Next-gate.** Adds field bindings with inline Zod errors and the footer Next-gate, so each step writes into its slice and Next enables only when that slice is valid.
- **Lesson 4 — Submit, reset, and guard.** Adds the composite-payload Server Action, the `useShallow` review, and the submit button with its pending/double-submit guard, success-reset, and redirect.

**Setup.** Command sequence (Steps component): `degit` the starter, install dependencies, bring up Postgres via `docker-compose`, run the Drizzle migration, run the seed, start the dev server.
Env var list: none new over chapter 062 (`.env.example` carries no new entries); note that the chapter 062 `DATABASE_URL` and auth/session variables are reused, copied from `.env.example`.
Expected result on success: `/customers` renders the seeded list; `/customers/new/step-1` renders the step-1 shell with empty fields and no provider wrapped yet, so the footer Next is always disabled and the fields are unwired; `/inspector` loads with an empty store-snapshot panel.

The lesson ends when the starter runs locally.

---

## Lesson 2 — Build the store skeleton

Define the four-slice `WizardState`, write the typed slice factories, compose them through a vanilla `createStore` factory, mount the `useRef`-pinned provider on the shared layout, and expose the typed `useWizardStore<T>(selector)` hook.
Finished result: navigating to `/customers/new/step-1` shows the progress indicator reading live store state ("1 of 4", first pip highlighted) and the inspector snapshot mirroring the initial store; the wizard navigates across all four routes with the store surviving each navigation — though every field is still unwired and Next stays disabled, the deliberate runnable midpoint.

### Your mission

This is the heaviest mechanics lesson in the chapter: you are standing up the store that every later lesson reads from, and two structural calls here are what keep the whole wizard correct.
The store factory must use `createStore` from `zustand/vanilla`, not `create` from `zustand` — `create` puts a module-scoped store in the server bundle's memory, and the per-request leak surfaces the first time two users hit the layout in the same Node process (the load-bearing reason from lesson 2 of chapter 078).
The provider belongs on the shared `/customers/new` layout, never on a step page — placing it under a step page is the canonical mistake that destroys the premise, because every navigation would re-mount the provider, re-create the store, and wipe the draft.
Pin the store in a `useRef` with lazy `if (ref.current === null)` init rather than `useState(() => createWizardStore())`: React's strict-mode double-invoke can otherwise create two stores on first mount in dev, and `useRef` with lazy init is React's documented pattern for refs holding initialized values.
Parameterize every `StateCreator` on the full `WizardState` intersection so `set`/`get` see the whole store from inside any slice; the middleware generics are empty tuples here because this chapter uses no `persist`, `devtools`, or `subscribeWithSelector` (named in lesson 2 of chapter 078, skipped here — they would fill the generics if they entered).
Give `reset()` the replace-mode flag — `set(initialState, true)` — so a future slice field added without updating `initialState` still gets wiped; plain `set({})` would partial-merge to a no-op, and the typed hook's `if (!store) throw` is the runtime contract that catches a component reaching outside the provider's subtree.
Out of scope: any form wiring, the Next-gate, and the submit — fields stay unwired at the end of this lesson by design.

Requirements checklist:

- [ ] Navigating to `/customers/new/step-1` loads the step with the progress indicator reading "1 of 4" and the first pip highlighted — the provided progress component resolves the hook against the mounted store.
- [ ] The inspector store-snapshot panel mirrors the initial store: empty slices, `currentStep: 1`, `completedSteps` empty, and it stays in sync across renders while the iframe is mounted.
- [ ] Navigating forward and back across `/customers/new/step-1` through `step-4` keeps the one store instance alive — the snapshot does not reset on navigation.
- [ ] A component that reads the store from outside the provider's subtree throws a clear `useWizardStore must be used inside WizardStoreProvider` error rather than failing silently.
- [ ] The store is per-request: with the provider on the shared layout and the vanilla `createStore` factory, a second session opening the wizard sees its own empty store, not the first session's state.

### Coding time

Implement against the brief above; there is no test for this lesson's runnable midpoint beyond the inspector snapshot, so confirm by hand.
Hidden `<details>` solution walkthrough, framed as material to read after attempting the work:

- Full reference implementation organized as it appears in the repo: `types.ts` (the four slice types and the `WizardState` intersection — each slice lists its data, per-field setter signatures, and, for the first three, `validate...()` returning `z.SafeParseReturnType`; `MetaSlice` lists `currentStep`, `completedSteps` as a `Set<1|2|3|4>`, `goNext`, `goBack`, `markStepComplete`, `reset`); the four slice files (contact/billing/preferences mirror the contact shape, preferences adds `togglePreferenceChannel` toggling array membership; meta's `goNext` reads `currentStep` via `get()`, calls `markStepComplete(currentStep)`, then `set({ currentStep: currentStep + 1 })`, `goBack` decrements, `reset: () => set(initialState, true)`); `store.ts` (vanilla `createStore` factory composing the four slices via the `((...a) => ({ ...createA(...a), ... }))` spread); `store-provider.tsx`; `use-wizard-store.ts`; and the one-line `layout.tsx` wrap.
- Decision rationale, one or two sentences each, for: `createStore` over `create` (the named import is where the per-request leak is prevented); `useRef` over `useState` for pinning; `set(initialState, true)` replace-mode over plain `set`; the empty middleware generics.
- Coverage of the untested requirements: the throw-on-missing-provider contract, the provider's single placement on the shared layout, and why the progress indicator (provided) already consumes the store through two atomic selectors.
- Callout on the `((...a) => ...)` slice spread, which looks unusual at a glance — it is the standard `StateCreator` composition.
- For the App Router Server/Client boundary and `'use client'`, link to the owning regular lesson rather than re-explaining.

### Moment of truth

Confirm by hand against the inspector (no automated test covers the empty-fields midpoint):

- [ ] `/customers/new/step-1` shows "1 of 4" with the first pip highlighted; form fields render but are unwired; footer Next is disabled.
- [ ] The inspector store-snapshot shows the initial state (empty slices, `currentStep: 1`, `completedSteps` empty) and stays in sync as the iframe re-renders.
- [ ] Navigating step 1 → 2 → 3 → 4 and back leaves the snapshot's accumulated state intact — the store survives every navigation.
- [ ] Reading `layout.tsx` confirms `<WizardStoreProvider>` wraps `<WizardProgress />`, `{children}`, and `<WizardFooter />` one level above the step children.
- [ ] Flipping the `PROVIDER_ON_STEP_PAGE` debug branch and navigating step 1 → 2 → 1 clears the store on each navigation (the canonical bug); flip it back.
- [ ] Flipping the `STORE_MODULE_SCOPED` debug flag and repeating a two-session test leaks session A's draft into session B; flip it back.

---

## Lesson 3 — Wire the forms and the Next-gate

Bind every step-1/2/3 field through atomic selectors and slice setters, render inline Zod errors, and wire the footer so Next gates on the current slice's `safeParse` and advances both store and URL together.
Finished result: typing in any field writes into its slice and re-renders only that field; invalid input shows an inline error and keeps Next disabled; filling every field on a step enables Next, which advances both the store's `currentStep` and the URL; Back returns with prior data intact; step 4 still renders the review stub.

### Your mission

Every field on steps 1 through 3 binds through one atomic selector to one slice setter — `const firstName = useWizardStore((s) => s.contact.firstName)` paired with `const setContactField = useWizardStore((s) => s.setContactField)` — because the atomic-selector default is what keeps re-renders surgical; a naive whole-slice read like `useWizardStore((s) => ({ ...s.contact, setContactField: s.setContactField }))` returns a fresh object every state change, the default `Object.is` check fails, and the component re-renders on every keystroke (the re-render counter is the demo).
Field errors come from a whole-slice selector that runs `validateContact()` and returns `flattenError(result.error).fieldErrors` on failure — resist per-field `validateField` scoping; whole-slice validation is right because tracking "touched" fields per input complicates the model, and this surface keeps the single-selector shape for clarity.
The footer's Next-gate derives a primitive from a complex computation: the `isValid` selector branches on `currentStep` and returns the relevant `validate...().success` boolean (step 4 returns `true`), so although `validate...()` runs `safeParse` and returns a fresh result on every store change, the `.success` boolean is primitive and `Object.is(true, true)` short-circuits the re-render — the button re-renders only when validity flips.
Next's `onClick` bundles two things in one handler — the store action `goNext` and `router.push` to the next segment — which is canonical for routed wizards; splitting them (a `useEffect` watching `currentStep` to fire the push) is the effects-as-orchestrators pattern the course rejects (AP #6, explicit over magic).
Keep the gate framed as UX, not the security boundary: the action re-parses the composite schema server-side, so a bypass that calls the action with malformed data still returns `{ ok: false, error }`; the client gate is defense against UX confusion only.
Render errors as short red text under the field per the Unit 3 UX baseline, no toast; `paymentTerms` is a three-option select and `country` a 2-letter input (a country picker in production, kept lean here), and `channels` is three checkbox toggles bound to `togglePreferenceChannel`.
Out of scope: the step-4 review (still a stub) and any submit.

Requirements checklist:

- [ ] Typing in a step-1/2/3 field updates that field's value and persists it in the slice — leaving and returning to the step shows the typed value.
- [ ] An invalid value renders an inline error under its field (for example "Invalid email") and a valid value clears it.
- [ ] The footer Next button is disabled while any field on the current step is invalid or empty, and enables only when the whole current slice parses.
- [ ] Clicking Next advances both the URL to the next segment and the store's `currentStep`, and the progress indicator highlights the new pip.
- [ ] Clicking Back returns to the prior segment with that step's previously typed data still populated.
- [ ] Typing ten characters into one field re-renders only that field's input (and the footer at most once, when the Next-gate boolean flips), leaving sibling fields and the progress indicator unchanged.

### Coding time

Implement against the brief and the lesson's test suite.
Hidden `<details>` solution walkthrough, framed as material to read after attempting the work:

- Full reference implementation organized as it appears in the repo: `step-1/page.tsx` (four fields, each an atomic-selector + setter pair, with a whole-slice error selector); `step-2/page.tsx` (billing fields via `setBillingField`, `paymentTerms` select, `country` input); `step-3/page.tsx` (`defaultCurrency` and `language` selects, `channels` checkbox toggles); `footer.tsx` (the `currentStep` selector, the `isValid` branch selector, `goNext`/`goBack`, the Next button bundling `goNext` + `router.push`, Next shown only when `currentStep < 4`).
- Decision rationale: the atomic-selector default vs. whole-slice read; deriving the primitive `.success` inside the `isValid` selector; bundling the store action and router push in one handler; whole-slice validation over per-field.
- Coverage of the untested requirements: error-text placement and styling (Unit 3 baseline), `markStepComplete` firing inside `goNext` to populate `completedSteps` for the progress indicator, and the Next-button-hidden-on-step-4 branch.
- Callout that the gate is UX-only and the action is the real contract — link to the chapter 042/043 Zod-and-Result regular lessons rather than re-explaining.
- Note on not pre-optimizing: `safeParse` on every store change is cheap at this schema size; debouncing or memoizing would be a future move for very large schemas.

### Moment of truth

Run the lesson's test suite (the command and expected pass output the runner prints); the tests cover field writes, inline-error appearance, the Next-gate disabled/enabled transitions, and that Next advances the store's `currentStep`.
Confirm by hand the outcomes the tests do not cover:

- [ ] Clicking Next pushes the URL to the next `step-N` segment and the progress indicator highlights the new pip (URL/route behavior).
- [ ] Clicking Back returns to the prior segment with that step's data intact.
- [ ] On the re-render counter, focusing step-1 firstName and typing ten characters increments only firstName's counter by ten, leaves siblings flat, and re-renders the footer at most once.
- [ ] Temporarily changing one field's selector to a whole-slice read `useWizardStore((s) => s.contact)` makes all four fields re-render on every keystroke; revert.

---

## Lesson 4 — Submit, reset, and guard

Build the composite-payload Server Action with its audit-log write, read the three slices on step 4 through `useShallow`, and wire the submit button with `useTransition` for the pending and double-submit guard, the success-reset, and the redirect.
Finished result: completing all four steps and clicking "Create customer" fires one Server-Action POST that inserts the customer and an audit row, then redirects to the new customer's detail page with the wizard reset behind it; a forced failure shows an inline error and leaves the draft intact for retry; a double-click fires the action only once.

### Your mission

This lesson closes the loop, and the architectural seam is the point: the store owns the draft in memory, the action owns the DB write, and the submit button is the only place they meet (AP #3 — pure `/lib`, side effects at named boundaries, applied to the client/server split).
The action re-parses the composite `createCustomerInput` at the boundary, wraps the insert and the `logAudit` call in one `tenantDb(ctx.orgId).transaction` so they commit or roll back together, maps the four-slice payload into the `customers` row (concatenating `firstName`+`lastName` into `name`, spreading billing and preferences directly because the column names match), and maps Postgres `23505` (the `unique (organizationId, email)` violation) to a `conflict` Result mirroring chapter 047's `createInvoice`, rethrowing other errors; the action never imports the store and the store never imports the action.
Tenancy lives entirely server-side — `authedAction`'s session resolution, the `organizationId` column, and `tenantDb` — and the store knows nothing about `orgId`; this is defense in depth.
The step-4 review is the one place `useShallow` belongs, because it genuinely reads three slice objects into one new object each render; the senior reflex is that a selector returning a fresh literal object/array wants `useShallow`, while a selector returning a primitive or an existing reference is fine on the default `Object.is` — reaching for `useShallow` everywhere is the over-reach.
The submit button uses `useTransition`: `isPending` both drives the "Creating…" label and guards double-submit (the first click disables the button so the second click fires no handler), which is the right pending-state shape for a Server Action call over a plain `useState<boolean>` because it keeps the transition's concurrency behavior.
On success, call `reset()` before `router.push` — order is the discipline: although the wizard layout unmounts on navigation to `/customers/[id]` (so the next visit mounts a fresh provider regardless), reset-first is required in surfaces where the layout stays mounted across reset (a cart in a header), and this is the named senior call that generalizes.
On failure, set local error state and return without resetting — wiping the draft on a network blip (`if (!result.ok) { reset(); ... }`) is the common bug this lesson exists to prevent; the transient error belongs in component `useState`, not the store, which is for the draft the user owns.
Choose the explicit button-handler calling the action programmatically over `<form action={createCustomerAction}>` with `useActionState`: the data already lives parsed in the client store, so serializing it back through `FormData` is ceremony with no upside — the senior call is that programmatic call is right when data lives in a client store, and `<form action>` is right when data is in form fields the user just typed.
Out of scope: writing the new customer's id into the store (it is server state the redirect transitions to, and storing it is role creep), and `crypto.randomUUID()`/idempotency keys (the DB generates the id, and one user/one transition/one submit is naturally idempotent at this layer; `processed_events` lands when retries are external, Unit 11).

Requirements checklist:

- [ ] Completing all four steps with valid data and clicking "Create customer" fires exactly one Server-Action POST whose response is `{ ok: true, data: { id } }`.
- [ ] The new customer and one `customer.created` audit row are written together in the active org — the audit-log tail shows the new row, and a rolled-back insert (for example a duplicate email) leaves the audit log unchanged.
- [ ] On success the router pushes to `/customers/[newId]` and the real customer detail page renders.
- [ ] After a successful submit, navigating back to `/customers/new/step-1` shows the wizard reset to its initial state.
- [ ] With the inspector "Force action failure" toggle on, submitting shows an inline error under the button and leaves every field populated for retry — the draft survives the failure.
- [ ] A double-click (or the inspector "Force double-submit") fires the action only once — one POST, one audit row — because `isPending` blocks the second handler.
- [ ] The step-4 review renders the contact, billing, and preferences slices read through the single `useShallow` selector, and `useShallow` appears nowhere else in the project.
- [ ] A programmatic action call with a malformed payload returns `{ ok: false, error: { code: 'invalid-input' } }` and leaves both the store and the audit log untouched.

### Coding time

Implement against the brief and the lesson's test suite.
Hidden `<details>` solution walkthrough, framed as material to read after attempting the work:

- Full reference implementation organized as it appears in the repo: `actions.ts` (`createCustomerAction` via `authedAction('member', createCustomerInput, …)` with the transactional insert + `logAudit`, the `23505` → `conflict` mapping, and the plain `submitCustomer` wrapper — or a shared `createCustomerImpl(input, ctx)` — that the button calls because `authedAction`'s return type is `(prev, formData) => Promise<Result>`); `step-4/page.tsx` (the single `useShallow` selector and the three `<dl>` review subsections with `<SubmitButton />` below); `step-4/submit-button.tsx` (`useTransition`, local `error` state, the `onSubmit` calling `submitCustomer`, the reset-then-push success branch, the disabled/labelled button, and the error paragraph).
- Decision rationale: store/action separation as the seam; `useShallow` only for this composite read; `useTransition`'s `isPending` over plain `useState`; reset-before-push ordering; the transactional audit write; the `23505`→`conflict` mapping.
- Alternative-rejected note on `<form action>` + `useActionState`: native and progressive-enhancement-friendly, but the payload would have to be re-encoded as `FormData` from already-parsed in-memory slices — ceremony with no upside; programmatic call wins when data lives in a client store.
- Coverage of the untested requirements: local error state vs. store, not storing the new id, and the org-switch/sign-out `reset()` forward pointer (named once, not implemented — the active-org-switch action lives in chapter 056 and the hook is a single line).
- For Server Actions, the canonical Result, and `useTransition`, link to the chapter 043/044 regular lessons rather than re-explaining.

### Moment of truth

Run the lesson's test suite (the command and expected pass output the runner prints); the tests cover the happy-path action call and Result shape, the audit row written in the transaction, the double-submit guard reducing two clicks to one POST, the forced-failure path leaving the draft intact, and the malformed-payload rejection.
Confirm by hand the outcomes the tests do not cover:

- [ ] After submit the router lands on `/customers/[newId]` and the real chapter 062 detail page renders.
- [ ] Navigating back to `/customers/new/step-1` after a successful submit shows empty fields and an initial snapshot; temporarily removing `reset()` from the success branch leaves the previous customer's data, confirming reset closed the loop; revert.
- [ ] Temporarily adding `reset()` to the failure branch wipes the draft on a forced failure; revert.
- [ ] Forcing a unique-constraint violation (an email already in the seed) returns `{ ok: false }` and leaves the audit log unchanged, proving the insert and audit row roll back together.
- [ ] A session in org X completing the wizard creates the customer in org X's list, not org Y's — tenancy holds at the action.
- [ ] Grepping `useShallow` returns a single hit on the review step; grepping `useWizardStore`, `createWizardStore`, and `WizardStoreProvider` returns hits only under `src/lib/wizard/` and `app/(app)/customers/new/`; grepping imports of `/lib/wizard/store` and `/lib/wizard/use-wizard-store` shows only Client Components, with the action file importing schemas only.
- [ ] Refreshing mid-flow (inspector "Refresh wizard") reloads the wizard at step 1 with an empty snapshot, confirming refresh-loses; `store.ts` carries no `persist`.

Forward references the lesson closes on:

- Chapter 080 — error discipline at seams; the action-failure error rendering is one audited finding (user/operator message split).
- Chapter 082 — security baseline audit; the wizard's tenancy at the action is one audited finding.
- Chapter 071 — notifications dispatcher; a "customer created" notification routes through the dispatcher after the audit-log write, not from the submit button.
- Chapter 089 — component tests; Next-gate validity transitions and submit pending/error states are mechanical against a mocked action.
- Chapter 056 — active-org-switch action; production calls the wizard `reset()` from inside the org-switch flow as a tenancy-boundary discipline.
- Chapter 092 — structured logs; the `customer.created` audit entry is the operator-truth side, the in-app "Customer created" notification (Unit 13) the user-facing side.

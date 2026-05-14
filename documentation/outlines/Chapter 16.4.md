# Chapter 16.4 — Project: routed multi-step wizard with Zustand

## Chapter framing

Chapter 16.4 cashes in the three-trigger funnel (16.3.1), the v5 primitives (16.3.2), and the worked-screen framing (16.3.3) as one runnable four-step "new customer" wizard on top of the Unit 11.3 customers surface. The student builds the per-feature store with four slices (contact / billing / preferences / meta), the `useRef`-pinned `WizardStoreProvider` on the shared `/customers/new` layout, the typed `useWizardStore<T>(selector)` hook, per-step Zod schemas shared client and server side, each step's form wired with atomic selectors, the Next-gate validation that runs `safeParse` on the current slice on every keystroke, the step-4 review that reads all three preceding slices, the `createCustomerAction` Server Action that re-parses the composite payload at the boundary, and the success-reset + redirect path. Each build slice closes on a runnable state: 16.4.3 ends with the store + provider + typed hook live so step 1's route loads with empty form values from the store; 16.4.4 ends with each step's form writing into its slice with field-level errors and the Next-gate gating per validity; 16.4.5 ends with the step-4 review submit firing the action and redirecting on success; 16.4.6 walks the "Done when" clause-by-clause.

Threads through every lesson: Zustand is **per-feature and client-only** — the store lives under `src/lib/wizard/`, is imported nowhere outside the four step pages and the shared layout, and never crosses into a Server Component or Server Action body; the store factory uses `createStore` from `zustand/vanilla` not `create` — the per-request leak from 16.3.2 is the load-bearing reason; the `WizardStoreProvider` sits on the shared `/customers/new` layout (not on each step page — the canonical mistake) so back/forward navigation preserves state across the four route segments; selectors are atomic at the call site — components subscribe to the field or action they read, not the whole slice, and `useShallow` is reserved for the review step's mapped pick; each step's Zod schema is the single source of truth — the same `contactSchema` parses the slice at the Next-gate (client) and parses the composite payload at the action (server); refresh loses the store and this is the explicit product call named on the screen and in the verify recipe — anything that must survive refresh would need server-side draft persistence (out of scope); the submit boundary is a Server Action, the store does not insert; reset fires after submit-success (and is named once for sign-out and org-switch as the future tenancy boundary).

### Dependency carry-in

- **From 11.3:** `app/(app)/customers/page.tsx` Server Component listing customers, `getCustomerDetail`, the toolbar / table / pagination shells, the active-org session slot.
- **From 10.4:** `tenantDb(orgId)`, `authedAction(role, schema, fn)`, the active-org session slot, `writeAuditLog(tx, event)`.
- **From 6.6:** `customers` table (`id uuid pk`, `organizationId uuid fk`, `name`, `email`, `phone`, address columns, `taxId`, `paymentTerms`, `defaultCurrency`, `language`, `notificationChannels jsonb`). Column shape matches the four-slice payload; no new migration.
- **From 7.1 / 7.2:** Zod 4 `strictObject`, canonical Result `{ ok: true, data } | { ok: false, error }`, `useActionState` (named but not used here — see 16.4.5's alternative-rejected note).
- **From 7.6 + 10.4 + 11.3:** Server Action wrapper pattern, audit-log write on customer creation.
- **From 16.3.1:** the three-trigger funnel and the wizard as the case that clears it.
- **From 16.3.2:** `createStore` from `zustand/vanilla`, `StateCreator<Store, Mws, Mws, Slice>` typed slice factory, atomic selectors as default, `useShallow` from `zustand/react/shallow` for mapped picks, the `useRef`-pinned provider, the typed `useStore(store, selector)` hook, the explicit `reset()` action.
- **From 16.3.3:** the four-slice shape, per-step Zod contract, Server-Action submit boundary, back/forward preserves vs. refresh loses as the senior call.

### Starter file tree (stubs marked with TODO)

```
docker-compose.yml              # provided: postgres:18
drizzle.config.ts               # provided
next.config.ts                  # provided: cacheComponents: true
.env.example                    # provided (no new entries)
package.json                    # provided: zustand@^5 added over 11.3
scripts/seed.ts                 # provided: 2 orgs, 4 users, 60 invoices + 8 customers per org
src/
  db/
    schema.ts                   # provided: existing customers table from 6.6
    client.ts                   # provided
  lib/
    tenant-db.ts                # provided (10.1)
    authed-action.ts            # provided (10.2)
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
- **Server Action** (`actions.ts`): `export const createCustomerAction = authedAction({ role: 'member', schema: createCustomerInput, fn: async ({ ctx, input }) => { const inserted = await tenantDb(ctx.orgId).transaction(async (tx) => { const [row] = await tx.insert(customers).values({ organizationId: ctx.orgId, name: \`${input.contact.firstName} ${input.contact.lastName}\`, email: input.contact.email, phone: input.contact.phone, ...input.billing, ...input.preferences }).returning(); await writeAuditLog(tx, { event: 'customer.created', subjectId: row.id }); return row }); return { ok: true as const, data: { id: inserted.id } } } })`.
- **Layout** (`layout.tsx`): `import { WizardStoreProvider } from '@/lib/wizard/store-provider'`; renders `<WizardStoreProvider><WizardProgress />{children}<WizardFooter /></WizardStoreProvider>`.
- **Atomic field selector** (in `step-1/page.tsx`): `'use client'`; `const firstName = useWizardStore((s) => s.contact.firstName); const setContactField = useWizardStore((s) => s.setContactField)`.
- **Next-gate** (in `footer.tsx`): `const isValid = useWizardStore((s) => { if (s.currentStep === 1) return s.validateContact().success; if (s.currentStep === 2) return s.validateBilling().success; if (s.currentStep === 3) return s.validatePreferences().success; return true })`.
- **Review with `useShallow`** (in `step-4/page.tsx`): `import { useShallow } from 'zustand/react/shallow'`; `const { contact, billing, preferences } = useWizardStore(useShallow((s) => ({ contact: s.contact, billing: s.billing, preferences: s.preferences })))`.
- **Submit button** (`step-4/submit-button.tsx`): `'use client'`; reads slices via `useShallow`, `reset` action, `router` from `next/navigation`; `const [isPending, startTransition] = useTransition()`; `onSubmit = () => startTransition(async () => { const r = await createCustomerAction({...}); if (!r.ok) { setError(r.error.message); return } reset(); router.push(\`/customers/${r.data.id}\`) })`; `<Button disabled={isPending} onClick={onSubmit}>Create customer</Button>`.
- **Env entries:** unchanged from 11.3.

### Inspector page spec

Single Server Component at `/inspector`, the verification surface. The inspector is outside the wizard tree, so it does not mount the provider — it reads store snapshots through a small client component that opens the wizard in an iframe and broadcasts state via `postMessage` (starter ships this wiring; the student does not write it).

- **Header:** session-user switcher (admin / member per org), org switcher (two seeded orgs).
- **Store-snapshot panel:** live mirror of `currentStep`, `completedSteps`, and each slice's values, updating on every store change inside the iframed wizard. Used to verify atomic-selector re-render scoping (only the changed field flashes).
- **"Force action failure" toggle:** when on, sets a server-side flag that makes the next `createCustomerAction` return `{ ok: false, error: { code: 'forced_failure', message: 'Forced action failure for verification' } }` after a 200ms delay. Auto-clears. Verifies the store stays intact on failure.
- **"Force double-submit" button:** triggers the wizard iframe's step-4 submit button twice 10ms apart via `postMessage` to verify the `isPending` guard.
- **"Reset store" button:** broadcasts a reset message.
- **"Refresh wizard" button:** force-reloads the wizard iframe.
- **Audit-log tail:** last 20 `customer.created` rows in the active org.
- **Re-render counter panel:** each step page broadcasts its render count via `postMessage`. Verifies atomic-selector surgical re-rendering.

Student writes only `types.ts`, the four slice files, `store.ts`, `store-provider.tsx`, `use-wizard-store.ts`, `actions.ts`, the layout wrap, the footer wiring, the four step pages, and the submit button.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Filling step 1 then navigating to step 2 and back returns to step 1 with data intact | Type contact fields in step 1, Next to step 2, fill billing, Back. Step 1 still populated. Snapshot panel shows both slices. The provider on the shared layout is the structural reason — confirm in `layout.tsx`. |
| Submit on step 4 fires the action with the composite payload | Complete all four steps with valid data. Click "Create customer". Network shows one Server-Action POST; response is `{ ok: true, data: { id } }`. Audit-log tail shows new `customer.created` row. Router pushes to `/customers/[newId]`. |
| After submit, navigating back to step 1 shows the wizard reset | Click "New customer" or navigate to `/customers/new/step-1`. Fields empty. Snapshot shows initial slices, `currentStep: 1`, `completedSteps: empty`. Success-reset closed the loop. |
| Refresh mid-flow loses state (the senior call) | Fill steps 1+2, advance to step 3, fill some. Inspector "Refresh wizard". Wizard reloads at step 1; snapshot empty. Confirm in `store.ts`: no `persist`. Refresh-loses is the explicit product decision. |
| Double-submit on step 4 does not fire twice | Inspector "Force double-submit". Network shows one Server-Action POST, not two. Audit-log shows one `customer.created` row. The `isPending` from `useTransition` is the guard. |
| The Next-gate disables until the current slice is valid | On step 1 with empty fields, Next disabled. Type valid firstName; still disabled. Fill every field; enables. Type invalid email; disables; field shows inline error. The selector subscribing to `validateContact().success` re-evaluates per keystroke. |
| Same Zod schema validates client-side at gate and server-side at action | `step-1/page.tsx`'s field errors call `contactSchema.safeParse` via `validateContact`; `actions.ts` parses `createCustomerInput` which embeds `contactSchema` again. Single source in `schemas.ts`. Bypass: programmatic action call with malformed payload → `{ ok: false, error: { code: 'invalid_input' } }`. Store unchanged. |
| Action failure does not wipe the draft | Inspector "Force action failure" ON. On step 4, click "Create customer". 200ms spinner then inline error banner under the button. Navigate back to step 1 — fields still populated, store intact. Compare to hypothetical `reset()`-in-`onError` bug: deliberately add `reset()` to error branch, repeat, observe wipe — revert. |
| Atomic selectors keep re-renders surgical | Re-render-counter panel: focus step-1 firstName; type ten characters. firstName mirror counter increments by ten; siblings stay flat. Footer's `isValid` re-renders only when boolean flips. |
| `useShallow` is used only on the review step | Grep `useShallow`. One hit: `step-4/page.tsx` (and possibly `submit-button.tsx` if combined). All other selectors atomic. |
| Store is per-request and does not leak across sessions | Session A: fill step 1+2. Switch to session B; `/customers/new/step-1` empty. Then flip `STORE_MODULE_SCOPED` debug flag (swaps factory for module-scoped instance); repeat → session B sees session A's draft. Revert. |
| Provider sits on shared layout, not each step page | `<WizardStoreProvider>` only in `layout.tsx`. Flip `PROVIDER_ON_STEP_PAGE` debug branch (moves into each `step-N/page.tsx`); navigate step 1 → 2 → 1; each navigation creates a fresh provider and the store resets. Revert. |
| Reset fires after submit-success only | `submit-button.tsx`: `reset()` inside the success branch after `router.push`. Failure branch has no `reset()` — draft preserved on failure. |
| Zustand scoped to the wizard surface only | Grep `useWizardStore`, `createWizardStore`, `WizardStoreProvider` across the codebase. Hits only under `src/lib/wizard/` and `app/(app)/customers/new/`. No leak into invoices, dashboard, or any other surface. |
| No Server Component imports the store | Grep imports of `/lib/wizard/store` and `/lib/wizard/use-wizard-store` — only Client Components. The action file imports schemas, never the store. |

### Concepts demonstrated → owning lesson

- Three-trigger funnel; wizard as the case that clears it — 16.3.1 + 16.3.3.
- `createStore` from `zustand/vanilla` vs. `create`; cross-request leak as reason — 16.3.2.
- `StateCreator<Store, Mws, Mws, Slice>` typed slice factory + composition — 16.3.2.
- Atomic selectors as default subscription shape — 16.3.2.
- `useShallow` for mapped picks (review step composite read) — 16.3.2.
- `useRef`-pinned provider on App Router shared layout — 16.3.2 + 16.3.3.
- Typed `useFooStore<T>(selector)` hook reading store from context — 16.3.2.
- Zod-per-step contract; same schema at client gate and server action — 7.1 + 16.3.3.
- Server Action submit boundary; the store does not insert — 7.2 + 16.3.3.
- `useTransition` for submit pending state + double-submit guard — 7.3.
- `reset()` action and success-only reset; tenancy-boundary forward pointer — 16.3.2 + 16.3.3 + 10.1.
- Architectural Principle #6 — per-feature, named, never global ambient — 16.3.1 + 16.3.2.
- Zod parse at action boundary with canonical Result — 7.1 + 7.2.

---

## Lesson 16.4.1 — Project brief

Goals:

- Frame the build: take the 11.3 customers surface and add a four-step routed wizard at `/customers/new/step-1` through `step-4`. Each step has its own route segment; a shared `WizardStoreProvider` on the layout pins a Zustand store across the four navigations. Four slices (contact / billing / preferences / meta). Each step writes via atomic selectors; Next gates on the current slice's Zod validity; step 4 reviews three slices and submits via a Server Action that re-parses the composite payload server-side. On success, the store resets and the router pushes to the new customer's detail page. Show one screenshot of step 4's review screen.
- State the "Done when" in one paragraph: filling step 1 then navigating away and back preserves data; submit on step 4 fires the action with the composite payload; success-reset and redirect close the loop; refresh loses state (the senior call); double-submit does not fire twice; Next enables only when the slice's Zod parse succeeds.
- Scope cuts: no server-side draft persistence (refresh-loses is the product call); no per-step animations; no `persist` middleware autosave (named in 16.3.2, skipped here); no skip-to-step navigation; no edit-existing-customer flow; no `useActionState` shape on submit (see 16.4.5's alternative-rejected note).
- Senior payoff: canonical Zustand-on-App-Router shape for the rest of the course. Future surfaces clearing the three-trigger funnel (routed cart, multi-step settings, long form split across panes) reuse the skeleton — `createStore` factory + `useRef`-pinned provider on shared layout + typed hook + atomic selectors + per-slice Zod + Server-Action submit + success-reset. Placement of the provider on the *shared layout* (not step pages) and use of `createStore` (not `create`) are the two structural calls that prevent the canonical bugs.
- Show the end UX: a capture of the wizard — fill, Next, Back (preserved), Next, review, submit, redirect — plus a refresh-mid-flow showing loss-by-design.
- Link the starter via `degit`.

Senior calls and watch-outs:

- Starter ships 11.3 end-to-end plus four route segments, shared layout shell, progress indicator, footer shell, and schemas in full. The 11.3 surface stays untouched — every change lives under `src/lib/wizard/` and `app/(app)/customers/new/`.
- The TOC's split (store + slices vs. form wiring + Next-gate) is preserved because the runnable midpoint matters: 16.4.3 ends with the provider mounting and the wizard navigating empty across four routes; 16.4.4 ends with each form writing into its slice and the Next-gate working.
- The submit lives in 16.4.5 with the success-reset because the action and the reset are the same architectural call.

Codebase state at entry: empty repo (student runs `degit`).
Codebase state at exit: starter cloned, Postgres up, schema migrated, seed loaded; `/customers` lists customers; `/customers/new/step-1` shows the step-1 shell with empty fields and no provider, Next always disabled; `/inspector` loads with empty store-snapshot.

Estimated student time: 10 to 15 minutes.

---

## Lesson 16.4.2 — Starter walkthrough

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on the eight student files (`types.ts`, four slice files, `store.ts`, `store-provider.tsx`, `use-wizard-store.ts`, `actions.ts`) plus the seven consumer files (`layout.tsx` shell, `footer.tsx` shell, four `step-N/page.tsx` shells, `step-4/submit-button.tsx`).
- Read `src/lib/wizard/schemas.ts` — three step schemas and the composite. Same schemas parse the slice client-side at the Next-gate and parse the composite server-side at the action. Single source of truth.
- Read the `customers` table columns — already shipped from 6.6, no migration. The action maps `{ contact: {firstName, lastName} }` into `name: \`${firstName} ${lastName}\`` plus email / phone / billing / preferences columns directly.
- Read `progress.tsx` (provided) — reads `currentStep` + `completedSteps` via two atomic selectors and renders the four-pip indicator. The student doesn't write this but reads it to understand the consumer pattern.
- Read `footer.tsx` shell — Back/Next placeholders present; the student wires `currentStep`, per-step `validate...().success`, `goBack`/`goNext` in 16.4.4.
- Read each step shell — every field has empty `value` and no `onChange`; TODO markers indicate the atomic-selector wires. Step 4's review is a stub.
- Read the inspector end-to-end — store-snapshot panel, "Force action failure" toggle, "Force double-submit" button, "Reset store", "Refresh wizard", audit-log tail, re-render-counter. Two starter-shipped debug branches (`STORE_MODULE_SCOPED`, `PROVIDER_ON_STEP_PAGE`) live behind flags for the verify lesson.
- Read `next.config.ts`: `cacheComponents: true` from 11.3; the customers list above the wizard tree stays cached; the wizard routes are leaf Client Components, no cache interaction.
- Run the app: `/customers` renders the seeded list; `/customers/new/step-1` renders the step-1 shell but the layout doesn't yet wrap in the provider so the hook would throw if invoked — fields are unwired, no throw fires.

Senior calls and watch-outs:

- `src/lib/wizard/` is feature-shaped (Architectural Principle #4): the directory groups store, slices, schemas, provider, hook, action. Future routed wizards get their own sibling directory; per-feature, never global.
- Eight student files + seven consumer files is the entire build surface. The 11.3 customers list and detail page do not change.
- The shared-layout placement of the provider is the load-bearing structural choice. Naming it on the file-tree read so the student notices the layout's role before writing the wrap in 16.4.3.
- The `customers` table is already org-scoped via `organizationId`; the submit action uses `tenantDb(ctx.orgId)`. The store knows nothing about `orgId` — server concern only.
- Seeded customers mean the redirect-to-`/customers/[id]` after submit lands on a meaningful detail page.

Codebase state at entry: starter cloned, Postgres running, schema migrated, seed loaded.
Codebase state at exit: every provided file read, inspector clicked through, wizard routes navigated as empty shells. No code written.

Estimated student time: 15 to 25 minutes.

---

## Lesson 16.4.3 — Store, slices, provider, and the typed hook

Goals:

- Fill `types.ts`: define `ContactSlice`, `BillingSlice`, `PreferencesSlice`, `MetaSlice`, and `WizardState = ContactSlice & BillingSlice & PreferencesSlice & MetaSlice`. Each slice lists its data, per-field setter signatures, and (first three) `validate...()` returning `z.SafeParseReturnType`. `MetaSlice` lists `currentStep`, `completedSteps` (a `Set<1|2|3|4>`), `goNext`, `goBack`, `markStepComplete`, `reset`. The intersection is the single state shape every `StateCreator` is parameterized on, so `set`/`get` see the whole store from inside any slice.
- Fill the four slice files. Each: `export const createContactSlice: StateCreator<WizardState, [], [], ContactSlice> = (set, get) => ({ contact: {firstName: '', lastName: '', email: '', phone: ''}, setContactField: (k, v) => set((s) => ({ contact: {...s.contact, [k]: v} })), validateContact: () => contactSchema.safeParse(get().contact) })`. Billing/preferences mirror; preferences also exposes `togglePreferenceChannel` toggling array membership. Meta: `goNext` reads `currentStep` via `get()`, calls `markStepComplete(currentStep)`, then `set({ currentStep: currentStep + 1 })`; `goBack` decrements; `markStepComplete` adds to `completedSteps`; `reset: () => set(initialState, true)` — the `true` flag is the rare replace-mode; name why `set({}, true)` would be wrong (loses the action methods).
- Fill `store.ts`: `import { createStore } from 'zustand/vanilla'` (not `create` from `zustand` — the load-bearing call). `export type WizardStore = ReturnType<typeof createWizardStore>`. `export const createWizardStore = (initial?: Partial<WizardState>) => createStore<WizardState>()((...a) => ({ ...createContactSlice(...a), ...createBillingSlice(...a), ...createPreferencesSlice(...a), ...createMetaSlice(...a), ...initial }))`. The factory returns a fresh vanilla store on every call; the provider calls it once per mount.
- Fill `store-provider.tsx`: `'use client'`. Create `WizardStoreContext = createContext<WizardStore | null>(null)`. The provider: `const ref = useRef<WizardStore | null>(null); if (ref.current === null) ref.current = createWizardStore(); return <WizardStoreContext.Provider value={ref.current}>{children}</WizardStoreContext.Provider>`. `useRef` (not `useState`) is deliberate — exactly one creation per component instance, never on re-render. The lazy `if (ref.current === null)` is React's documented pattern for refs holding initialized values.
- Fill `use-wizard-store.ts`: `'use client'`. Import `useStore` from `zustand` (the React-binding hook). `export function useWizardStore<T>(selector: (s: WizardState) => T): T { const store = useContext(WizardStoreContext); if (!store) throw new Error('useWizardStore must be used inside WizardStoreProvider'); return useStore(store, selector) }`. The generic gives call sites like `const firstName = useWizardStore((s) => s.contact.firstName)` an inferred `string` return.
- Edit `layout.tsx`: import `WizardStoreProvider`; wrap `<WizardProgress />` + `{children}` + `<WizardFooter />` in `<WizardStoreProvider>`. The provider sits on the shared layout so all four step children share the same store instance.
- The progress indicator's consumption is already shipped — reads `currentStep` + `completedSteps` via two atomic selectors. The student confirms the hook resolves and the first pip highlights on step 1.
- Run the app: navigate to `/customers/new/step-1`. Progress shows "1 of 4" with first pip highlighted. Form fields render unwired. Footer Next is disabled (the `isValid` selector isn't wired yet — 16.4.4). Inspector's store-snapshot shows initial state: empty slices, `currentStep: 1`, `completedSteps: new Set()`. The snapshot stays in sync across renders while the iframe is mounted.

Senior calls and watch-outs:

- `createStore` from `zustand/vanilla` + provider is the App Router-correct shape. The default-tutorial `create((set) => ({...}))` puts a module-scoped store in the server bundle's memory; the per-request leak surfaces the first time two users hit the layout in the same Node process. The bug is named at the import.
- `useRef`-pinned store is mandatory. `useState(() => createWizardStore())` technically works but React's strict-mode double-invoke can create two stores on first mount in dev; documented pattern is `useRef` with lazy init.
- The provider lives on the shared layout, not on each step page. Surfaced twice — at file location and at wrap call — because misplacing under a step page is the canonical bug that destroys the entire premise (every navigation re-mounts provider, re-creates store, wipes state). Verify lesson exercises this as deliberate-misuse demo.
- `reset()` uses `set(initialState, true)` (replace-mode flag). Plain `set({})` would partial-merge (no-op); `set(initialState)` without `true` would also work because the merged result equals initial; `set(initialState, true)` is the explicit "wipe and replace" that future-proofs against new slice fields being added without updating `initialState`.
- The slices composition `((...a) => ({ ...createA(...a), ...createB(...a) }))` is the standard `StateCreator` spread. The `[]`-`[]`-`Slice` middleware generics are empty tuples — this chapter doesn't use `persist`, `devtools`, `subscribeWithSelector` (named in 16.3.2, skipped). When middlewares enter, the generics fill out.
- The typed hook's `if (!store) throw` is the runtime contract catching the most common usage bug — a component reaches outside the provider's subtree.
- Fields are still unwired after this lesson — the deliberate runnable midpoint. Provider mounts, store survives navigation, progress reads from it; next lesson connects inputs.

Codebase state at entry: empty `wizard/` directory, empty layout, unwired form fields, footer disabled.
Codebase state at exit: `types.ts`, four slice files, `store.ts`, `store-provider.tsx`, `use-wizard-store.ts` filled. Provider wraps the wizard layout. Progress reads `currentStep`. Wizard navigates between four routes (back/forward) but every field is empty and Next is permanently disabled. **Runnable — provider mounts on shared layout, store survives navigation, inspector snapshot mirrors live state.**

Estimated student time: 60 to 75 minutes. The chapter's heaviest mechanics lesson.

---

## Lesson 16.4.4 — Form wiring, atomic selectors, and the Next-gate

Goals:

- Wire `step-1/page.tsx` field by field. Each field: one input bound to one slice setter through one atomic selector: `const firstName = useWizardStore((s) => s.contact.firstName); const setContactField = useWizardStore((s) => s.setContactField); <Input value={firstName} onChange={(e) => setContactField('firstName', e.target.value)} />`. Repeat for `lastName`, `email`, `phone`. The atomic-selector default is the load-bearing choice — typing in email re-renders only the email input. The re-render counter panel verifies.
- Render field-level errors. Below each field: `const contactErrors = useWizardStore((s) => { const result = s.validateContact(); return result.success ? null : z.flattenError(result.error).fieldErrors })`. Display `contactErrors?.email?.[0]` below the email input. The selector returns a new object only when the parse moves success↔failure or the error map shape changes — adequate for this surface. For finer control (per-field error subscription), one selector per field's error would be the move; this surface keeps the single-selector shape for clarity.
- Repeat for `step-2/page.tsx`: each billing field bound via `setBillingField`; errors via `validateBilling` + `flattenError`. `paymentTerms` is a select with three options; `country` is a 2-letter input (in production a country picker; course keeps the surface lean).
- Repeat for `step-3/page.tsx`: `defaultCurrency` and `language` are selects; `channels` is a multi-select via three checkbox toggles bound to `togglePreferenceChannel`.
- Wire `footer.tsx`: `const currentStep = useWizardStore((s) => s.currentStep)`. The `isValid` selector branches on `currentStep` (validateContact / validateBilling / validatePreferences `.success`; step 4 returns `true`). `const goNext = useWizardStore((s) => s.goNext); const goBack = useWizardStore((s) => s.goBack)`. Next: `<Button disabled={!isValid} onClick={() => { goNext(); router.push(\`/customers/new/step-${currentStep + 1}\`) }}>`. `goNext` mutates `currentStep`; `router.push` advances the URL. Both fire on click. Back mirrors with `goBack` + `router.push` to prior step. On step 4 the Next button is replaced by the submit button rendered by the step-4 page itself — footer's Next only shown when `currentStep < 4`.
- Run the app: navigate `/customers/new/step-1`. Type firstName; Next stays disabled while other fields empty. Re-render counter shows only firstName field's count incrementing. Type invalid email → "Invalid email" inline; Next disabled. Fix → Next enables. Fill remaining → click Next. URL advances to `/step-2`; store's `currentStep` becomes `2`; progress highlights pip 2; step-2 renders empty. Click Back; URL returns to step-1; previously typed values still there. Click Next; step-2 empty (its slice never touched). Fill step 2 → step 3 → step 4 (renders the review stub).

Senior calls and watch-outs:

- Atomic selectors are mandatory for re-render scoping. A naive `const { firstName, lastName, ... } = useWizardStore((s) => ({ ...s.contact, setContactField: s.setContactField }))` returns a new object every state change; default `Object.is` fails; component re-renders on every keystroke. Re-render counter is the demo. If a step genuinely needs a composite read (review), `useShallow` is the right tool — 16.4.5.
- The Next-gate `isValid` calls `validate...()` on every store change. Returns fresh `SafeParseResult` each time; the `.success` boolean is primitive — `Object.is(true, true)` short-circuits re-render. Button re-renders only when boolean flips. Pattern: derive a primitive from a complex computation inside the selector.
- The Next-gate is UX. The action on submit re-parses the composite schema server-side; the *contract* is the action's parse. A bypass (calling the action with malformed data) returns `{ ok: false, error }`; client gate is defense against UX confusion, not malformed data.
- Next button's `onClick` does two things: store action `goNext` + router push. Bundling into one handler is canonical for routed wizards. Splitting (e.g., a `useEffect` watching `currentStep` and firing `router.push`) is wrong — effects-as-side-effect-orchestrators is the pattern the course rejects (AP #6 — explicit over magic).
- `validate...()` runs `safeParse` on every store change. For tiny schemas this is cheap; for very large schemas, debouncing or memoizing would be a future move. Don't pre-optimize at this size.
- Errors render conditionally and unobtrusively. Course UX baseline (Unit 4) — short red text under the field, no toast for validation errors.
- Resist per-field `validateField` for finer error scoping. Whole-slice `validateContact` is right: form-state machines tracking "touched" fields complicate the model.
- `markStepComplete` inside `goNext` populates `completedSteps`; progress indicator distinguishes completed pips from upcoming.

Codebase state at entry: provider mounted, four-slice store, hook works; no form wired, Next permanently disabled.
Codebase state at exit: every input on steps 1, 2, 3 writes into its slice via atomic selector; every field error renders inline; footer Next-gate enables only when current slice is valid; clicking Next advances both store and URL; clicking Back returns and prior step's data is intact. **Runnable — wizard navigates with state across all four routes; step 4 review still a stub; no submit yet.**

Estimated student time: 50 to 65 minutes.

---

## Lesson 16.4.5 — Review, submit action, success-reset, and the double-submit guard

Goals:

- Fill `actions.ts`: `createCustomerAction = authedAction({ role: 'member', schema: createCustomerInput, fn })`. Inside `fn`, wrap the insert in `tenantDb(ctx.orgId).transaction`: map the four-slice payload into the `customers` row (concatenate firstName + lastName into `name`; spread billing + preferences directly because column names match), insert + `returning()`, call `writeAuditLog(tx, { event: 'customer.created', subjectId: row.id })`. Return `{ ok: true, data: { id: row.id } }`. Parse failure or DB error returns `{ ok: false, error }` via the wrapper. The action does not know about the store; the store doesn't import the action either; the submit button is the seam.
- Wire `step-4/page.tsx`: review reads three preceding slices via `useShallow` because rendered JSX combines three slice objects into one component. `import { useShallow } from 'zustand/react/shallow'; const { contact, billing, preferences } = useWizardStore(useShallow((s) => ({ contact: s.contact, billing: s.billing, preferences: s.preferences })))`. Render three subsections (Contact, Billing, Preferences) as `<dl>`s. Mount `<SubmitButton />` below. This is the **only** `useShallow` use in the project. Reason: this component genuinely reads three slice objects, returns one new object each render; step 4 isn't mounted during steps 1-3 (route segments exclusive), so re-renders during typing don't apply. On step 4, re-renders fire only if a slice reference changes — but step 4 is read-only by design.
- Fill `submit-button.tsx`. `'use client'`. Reads three slices via `useShallow`, the `reset` action, `router` from `next/navigation`. Use `useTransition`:
  - `const [isPending, startTransition] = useTransition()`.
  - `const [error, setError] = useState<string | null>(null)`.
  - `const onSubmit = () => startTransition(async () => { setError(null); const result = await createCustomerAction({ contact, billing, preferences }); if (!result.ok) { setError(result.error.message); return } reset(); router.push(\`/customers/${result.data.id}\`) })`.
  - `<Button disabled={isPending} onClick={onSubmit}>{isPending ? 'Creating…' : 'Create customer'}</Button> {error && <p className='text-destructive'>{error}</p>}`.
  - `isPending` prevents double-submit: first click sets pending, button disables, second click fires no handler.
- Submit is the Server Action call, not `<form action>` with `useActionState`. Alternative-rejected note:
  - **Chosen path:** explicit button-handler calling the action programmatically. Right because submit composes three slices read via `useShallow` and the post-success path is store reset + router push (not the redirect-and-revalidate pattern `useActionState` is built for).
  - **Considered and rejected:** `<form action={createCustomerAction}>` with `useActionState`. Native and progressive-enhancement-friendly, but payload would have to be encoded as `FormData` (hidden input per slice field serialized to JSON). The read side already has parsed slices in memory; serializing back through `FormData` is ceremony with no upside. Senior call: when data already lives in a client store, programmatic call is right; reach for `<form action>` when data is in form fields the user just typed.
- Wire success-reset and redirect: on `{ ok: true }`, call `reset()` first (clears four slices, `currentStep: 1`, `completedSteps: empty`), then `router.push(\`/customers/${result.data.id}\`)`. Order matters — `router.push` triggers navigation that may unmount the wizard layout; resetting before pushing guarantees the next mount sees fresh state. The wizard layout *is* unmounted on navigation to `/customers/[id]` so the next visit to `/customers/new/step-1` mounts a fresh provider anyway. `reset()` is belt-and-suspenders here — but the discipline of "reset at submit-success" is the named senior call that generalizes to other Zustand surfaces where the provider stays mounted across reset (a cart inside a layout that doesn't unmount, for example).
- Run the app: complete four steps with valid data. Step 4 review shows three filled slices. Click "Create customer". Button shows "Creating…" for ~100ms. Router pushes to `/customers/[newId]`. New customer detail renders. Navigate back to `/customers/new/step-1` — form empty (success-reset fired). Audit-log tail shows new `customer.created` row.
- Verify action-failure path: inspector "Force action failure" toggle ON. Complete four steps; submit. Button shows "Creating…" for ~200ms; error banner under button; wizard stays on step 4 with data intact. Navigate back to step 1 — still populated. User can edit and retry.
- Verify double-submit guard: complete four steps; click "Create customer"; click again within 10ms (or inspector "Force double-submit"). Network shows one POST. Audit-log shows one row.

Senior calls and watch-outs:

- Action org-scoped via `authedAction`'s session resolution; store knows nothing about `orgId`. Tenancy lives at the action, the `organizationId` column, and `tenantDb`. Defense in depth.
- Store/action separation is the architectural seam. Store owns the draft in memory; action owns the DB write. Submit button is the only place they meet. Architectural Principle #3 (pure /lib, side effects at named boundaries) applied to the client/server split.
- `useShallow` is right *only* for this composite read. Senior reflex: if selector returns a fresh literal object/array, equality check is `useShallow`; if it returns a primitive or existing reference, default `Object.is` is fine. Reaching for `useShallow` everywhere is the over-reach.
- `useTransition`'s `isPending` is the right pending-state shape for a Server Action call. Plain `useState<boolean>` works but loses the transition's automatic suspension/concurrency benefits.
- `reset()` fires *before* `router.push`. Order documented; push-first/reset-after still works because wizard layout unmounts on navigation. Keep reset-first to teach the discipline: in surfaces where the layout stays mounted (cart in header), reset-first is required.
- Action failure leaves the wizard intact deliberately. Common bug: `if (!result.ok) { reset(); setError(...) }` — wiping draft on a network blip. Verify recipe catches this.
- The `error` state is local `useState`, not in store. Transient UI error state belongs in component state (16.3.1's "useState is fine" default); store is for draft data the user owns.
- `crypto.randomUUID()` not used (DB generates id); idempotency keys deferred to Unit 12. Customer-create is naturally idempotent at the application layer because one user, one transition, one submit (the `isPending` guard); `processed_events` pattern lands when trigger is external retries.
- Redirect to `/customers/${newId}` lands on the real customer detail page (11.3). Seamless landing is the UX payoff.
- Resist writing the new customer's id into the wizard store. Store is for draft; new id is server state; redirect transitions client from one to the other. Storing the id is role creep the per-feature discipline rejects.

Codebase state at entry: forms wire steps 1-3, Next-gate works, step 4 a stub, no submit, no action.
Codebase state at exit: `createCustomerAction` writes row + audit log + returns canonical Result. Step 4 reviews three slices via `useShallow`. Submit button uses `useTransition` for pending + double-submit guard, calls action, on success resets store and redirects, on failure shows error and leaves draft intact. **Runnable — full happy and unhappy paths live; ready for verify pass.**

Estimated student time: 50 to 65 minutes.

---

## Lesson 16.4.6 — Verify

Goals:

- Walk every "Done when" clause from the framing's verify recipe in order. The recipe lists the steps; this lesson is the execution plus surrounding senior commentary.
- **Back/forward preserves:** fill step 1; advance; fill step 2; Back; step-1 fields show original values. Next; step 2 intact. Use browser back (not wizard Back) to land on step 1; same result. Snapshot panel shows both slices populated throughout. Confirm `<WizardStoreProvider>` is one level above `{children}` in `layout.tsx`.
- **Refresh loses (the senior call):** complete steps 1-2, advance to step 3. Inspector "Refresh wizard". Wizard reloads at step 1 empty. Snapshot empty. Confirm `store.ts` has no `persist`. Compare to hypothetical persist wiring: deliberately wrap factory in `persist((set, get) => ({...}), { name: 'wizard-v1', storage: createJSONStorage(() => sessionStorage) })`; refresh; wizard resumes mid-flow. Revert.
- **Submit fires with composite payload:** complete four steps; click "Create customer". Network shows one POST; response `{ ok: true, data: { id } }`. Router pushes to `/customers/[newId]`. Audit-log shows new row in active org.
- **Success-reset fires only after success:** after redirect, navigate to `/customers/new/step-1`. Empty. Snapshot at initial. Then deliberately remove `reset()` from success branch; complete fresh customer; back to step 1 — fields show previous customer's data. Revert.
- **Action failure leaves draft intact:** "Force action failure" ON. Complete four steps; submit. Error banner; wizard stays on step 4. Back to step 1 — all fields populated. Then deliberately add `reset()` to error branch; repeat; observe wipe. Revert.
- **Double-submit fires once:** "Force double-submit" (or manual rapid click). Network shows one POST. Audit-log one new row. `isPending` from `useTransition` is the guard.
- **Next-gate per-step:** empty step-1 → Next disabled. Valid email but empty firstName → still disabled (whole-slice validity). Fill all → enables. Invalid phone → disables; inline error renders. Next re-renders only when boolean flips — verify via re-render counter.
- **Atomic selectors keep re-renders surgical:** focus step-1 firstName; type ten characters. Counter shows: firstName + 10, siblings unchanged, footer + 1 (boolean stayed false), progress + 0. Then deliberately change one selector to `useWizardStore((s) => s.contact)` (slice-object read); type ten characters; counter shows all four fields re-rendering ten times each. Revert.
- **`useShallow` reserved for review step:** grep `useShallow`. One hit in `step-4/page.tsx` (and possibly `submit-button.tsx` if combined). Then deliberately replace step-4's reads with three separate atomic selectors and remove `useShallow`; page still renders correctly. The rule isn't "you must use `useShallow`"; it's "use `useShallow` when read is genuinely a composite mapped-pick."
- **Store per-request, no leak:** session A: fill step 1. Switch to session B. `/customers/new/step-1` empty. Then flip `STORE_MODULE_SCOPED` debug flag (swaps factory for module-scoped instance); repeat cross-session test; session B sees session A's draft. Flip back.
- **Provider on shared layout:** read `layout.tsx` — provider wraps four step children. Then flip `PROVIDER_ON_STEP_PAGE` (moves provider into each `step-N/page.tsx`); navigate step 1 → 2 → 1; form clears every navigation. Flip back.
- **Same Zod schema parses at gate (client) and action (server):** read `step-1/page.tsx` — calls `contactSchema.safeParse` via `validateContact`. Read `actions.ts` — parses `createCustomerInput` which embeds `contactSchema`. Single import, both ends. Then in devtools, fetch the action with a malformed body bypassing the form; action returns `{ ok: false, error: { code: 'invalid_input' } }`; audit-log unchanged.
- **Zustand scoped to wizard only:** grep `useWizardStore`, `createWizardStore`, `WizardStoreProvider`. Hits only under `src/lib/wizard/` and `app/(app)/customers/new/`.
- **No Server Component imports the store:** grep imports of `/lib/wizard/store` and `/lib/wizard/use-wizard-store`. Every importer has `'use client'`. The action file imports schemas, not the store. RSC body remains store-free.
- **Audit log inside the action's transaction:** force-fail the insert by introducing a unique-constraint violation (e.g., email already in seed); action returns `{ ok: false }`; audit-log unchanged because transaction rolled back insert + audit row together. Revert.
- **Tenancy at the action:** session A (org X) completes the wizard; submit; new customer appears in org X's list, not org Y's. `authedAction`'s session resolution + `tenantDb(ctx.orgId)` scopes the insert.
- Name the senior calls one more time:
  - Library scoped to the leaf that meets the threshold; the rest stays Server-Component / Server-Action.
  - Store factory uses `createStore` from `zustand/vanilla` so each provider mount creates a fresh instance — the per-request pattern.
  - Provider on shared layout, never on step pages.
  - Atomic selectors default; `useShallow` reserved for genuine composite mapped picks.
  - Zod schema is the contract — same parse at client gate and server action.
  - Store owns the draft; action owns the DB write; submit button is the seam.
  - Success-reset fires after success; action-failure leaves draft intact.
  - Refresh-loses is the explicit product call — anything that must survive refresh needs server-side draft persistence (out of scope).
  - `isPending` from `useTransition` prevents double-submit.
- Forward references:
  - Chapter 17.1 — error discipline at seams; action-failure error rendering is one audited finding (user/operator message split).
  - Chapter 17.3 — security baseline audit; wizard's tenancy at the action is one audited finding.
  - Unit 14.1 — notifications dispatcher; a "customer created" notification routes through the dispatcher after the audit-log write, not from the submit button.
  - Unit 19.4 — component tests; Next-gate validity transitions and submit pending/error states are mechanical against a mocked action.
  - Chapter 10.1 — active-org-switch action; production should call wizard `reset()` from inside the org-switch flow as a tenancy-boundary discipline (named once as forward pointer).
  - Unit 20.1 — structured logs; `customer.created` audit-log entry is operator-truth side, in-app "Customer created" notification (Unit 14) is user-facing side.

Senior calls and watch-outs:

- Verify lesson rehearses every failure mode the chapter exists to prevent. If a verification fails, point at the owning build lesson.
- Deliberate failure demos (remove `reset()` from success, add `reset()` to error, flip `STORE_MODULE_SCOPED`, flip `PROVIDER_ON_STEP_PAGE`, wrap factory in `persist`, replace atomic with slice-object selector) must run as named single-flag changes. Verify each in isolation, then revert.
- Org-switch reset is a forward pointer, not implementation. The chapter does not ship it because the active-org-switch action lives in 10.1 and the reset hook is a single line — name where it goes, don't reach in.
- Refresh-loses is the load-bearing product decision named throughout. The chapter does not turn this into a feature flag — anything that must survive refresh would force a server-side draft table, garbage collection, surfacing-on-return UX, and tenancy on drafts. Senior call: accept refresh-loses as the product trade and call out the cost of the alternative.

Codebase state at entry: full wizard + submit + success-reset + double-submit guard wired.
Codebase state at exit: every "Done when" clause verified clause-by-clause; the student can articulate every primitive (`createStore` factory, `useRef`-pinned provider on shared layout, typed `useWizardStore<T>(selector)` hook, atomic selectors, `useShallow` for composite reads, Zod-per-step gate, Server-Action submit boundary, success-reset discipline, `useTransition` double-submit guard, refresh-loses as product call) and which forward unit will lean on it.

Estimated student time: 30 to 45 minutes.

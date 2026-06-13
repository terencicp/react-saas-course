# Chapter 079 — Project: routed customer wizard with Zustand

## Chapter framing

Chapter 079 cashes in the three-trigger funnel (lesson 1 of chapter 078), the v5 primitives (lesson 2 of chapter 078), and the worked-screen framing (lesson 3 of chapter 078) as one runnable four-step "new customer" wizard on top of the chapter 062 customers surface.
The student builds the per-feature store with four slices (contact / billing / preferences / meta), the `useRef`-pinned `WizardStoreProvider` on the shared `/customers/new` layout, the typed `useWizardStore<T>(selector)` hook, per-step Zod schemas shared client and server side, each step's form wired with atomic selectors, the named selectors in `selectors.ts` (`selectIsStepValid` / `selectStepErrors`) that run `safeParse` on the current slice on every keystroke, the step-4 review that reads all three preceding slices, the `createCustomer` Server Action that re-parses the composite payload at the boundary, and the success-reset + redirect path.
Each build lesson closes on a runnable state: lesson 2 ends with the store + provider + typed hook live so step 1's route loads with empty form values from the store; lesson 3 ends with each step's form writing into its slice with field-level errors and the Next-gate gating per validity; lesson 4 ends with the step-4 review submit firing the action and redirecting on success.

### Project goals (Done when)

The build is done when the wizard behaves as follows. These are the user-facing outcomes the build lessons distribute and verify; each Implementation lesson confirms the subset it delivers in its own Moment of truth.

- Filling step 1 then navigating to step 2 and back returns to step 1 with the data intact — back/forward across the four route segments preserves draft state.
- The Next-gate disables until the current slice is valid: empty fields keep it disabled, a single valid field is not enough, every field valid enables it, and an invalid value re-disables it and shows an inline field error.
- The same Zod schema validates client-side at the gate and server-side at the action — a programmatic action call with a malformed payload returns `{ ok: false, error: { code: 'validation' } }` and leaves the store untouched.
- Atomic selectors keep re-renders surgical — typing in one field re-renders only that field's input; the footer re-renders only when the Next-gate boolean flips.
- `useShallow` is used only for composite mapped picks — the review step's read and the submit button's payload pick — and never for an atomic or primitive selector.
- Submit on step 4 fires the action once with the composite payload — the network shows one Server-Action POST returning `{ ok: true, data: { id } }`, the audit-log tail gains one `customer.created` row, and the router pushes to `/customers/[newId]`.
- Double-submit on step 4 does not fire twice — the `isPending` guard from `useTransition` lets only the first click through; one POST, one audit row.
- Action failure does not wipe the draft — a forced failure shows an inline error under the button and leaves every field populated for retry.
- After a successful submit, navigating back to step 1 shows the wizard reset to its initial state (`currentStep: 1`, `completedSteps` empty, all slices blank).
- Refresh mid-flow loses the draft — this is the explicit product call; the store carries no `persist`, and anything that must survive refresh would need server-side draft persistence (out of scope).
- The store is per-request and does not leak across sessions — session B never sees session A's draft.
- The provider sits on the shared `/customers/new` layout, not on each step page, so navigation between segments preserves the one store instance.
- Reset fires after submit-success only; the failure branch never resets.
- Zustand is scoped to the wizard surface only — no `useWizardStore`, `createWizardStore`, or `WizardStoreProvider` reaches the customers list, the inspector, or any other surface; everything store-related lives under `app/(app)/customers/new/_lib/wizard/` and `app/(app)/customers/new/_components/`.
- No Server Component imports the store; every store importer is a Client Component, and the action file imports schemas only.

Threads through every lesson: Zustand is **per-feature and client-only** — the store lives under `app/(app)/customers/new/_lib/wizard/` (with the provider and hook under the sibling `_components/`), is imported nowhere outside the four step pages, the footer, the progress header, and the shared layout, and never crosses into a Server Component or Server Action body; the store factory uses `createStore` from `zustand/vanilla` not `create` — the per-request leak from lesson 2 of chapter 078 is the load-bearing reason; the `WizardStoreProvider` sits on the shared `/customers/new` layout (not on each step page — the canonical mistake) so back/forward navigation preserves state across the four route segments; selectors are atomic at the call site — components subscribe to the field or action they read, not the whole slice, and `useShallow` is reserved for the composite mapped picks (the review step and the submit button's payload); each step's Zod schema is the single source of truth — the same `contactSchema` parses the slice at the Next-gate (client, via `selectIsStepValid`) and parses the composite payload at the action (server); refresh loses the store and this is the explicit product call named on the screen — anything that must survive refresh would need server-side draft persistence (out of scope); the submit boundary is a Server Action, the store does not insert; reset fires after submit-success (and is named once for sign-out and org-switch as the future tenancy boundary).

### Dependency carry-in

- **From chapter 062:** the toolbar / table / pagination pattern reused in the starter's `app/(app)/customers/page.tsx` and `[id]/page.tsx` customers surface (keyset list + detail driven by nuqs `customerListSearchParams`).
- **From chapter 059:** `authedInputAction(role, schema, fn)` (the direct-object sibling of `authedAction`), the cookie-backed session (`getSession` → `{ userId, orgId, role }`), org-scoped reads/writes, `logAudit({ orgId, actorUserId, action, subjectId })`.
- **From chapter 041:** the `Customer` shape (`id`, `orgId`, `firstName`, `lastName`, `email`, `phone`, `line1`, `line2`, `city`, `region`, `postalCode`, `country`, `taxId`, `paymentTerms`, `defaultCurrency`, `language`, `notificationChannels: string[]`, `createdAt`). There is no live Postgres in this project: the data layer is an in-memory `globalThis`-pinned store (`src/server/store.ts`) standing in for the database, so the four-slice payload maps straight onto the `Customer` row with no migration.
- **From chapter 042 / chapter 043:** Zod 4 `strictObject`, canonical Result `{ ok: true, data } | { ok: false, error }` with the `ok`/`err`/`conflict` helpers, `useActionState` (named but not used here — see lesson 4's alternative-rejected note).
- **From chapter 047 + chapter 059 + chapter 062:** Server Action wrapper pattern, audit-log write on customer creation.
- **From lesson 1 of chapter 078:** the three-trigger funnel and the wizard as the case that clears it.
- **From lesson 2 of chapter 078:** `createStore` from `zustand/vanilla`, `StateCreator<WizardStore, [], [], Slice>` typed slice factory, atomic selectors as default, `useShallow` from `zustand/react/shallow` for mapped picks, the `useRef`-pinned provider, the typed `useStore(store, selector)` hook, the explicit `reset()` action.
- **From lesson 3 of chapter 078:** the four-slice shape, per-step Zod contract, Server-Action submit boundary, back/forward preserves vs. refresh loses as the senior call.

### Starter file tree (stubs marked with TODO)

The `start/` and `solution/` trees hold the same file set — there is no `degit` step and no extra scaffolding to download. The difference is that the files below carry `TODO(Lx)` stubs in `start/` that the student fills in; everything else is identical in both. No Postgres, Docker, Drizzle, migration, seed script, or `.env` — `src/server/store.ts` is the in-memory `globalThis`-pinned "database" and `src/server/session.ts` is a cookie-backed dev session with no auth wall.

```
next.config.ts                  # provided: cacheComponents, typedRoutes, reactCompiler
package.json                    # provided: zustand@^5 over the chapter 062 deps
src/
  server/
    store.ts                    # provided: in-memory globalThis AppStore (users,
                                #           invoices, auditLogs, customers); reseed,
                                #           pushCustomer (throws code 23505 on dup email)
    session.ts                  # provided: cookie-backed getSession + setActingIdentity
    types.ts                    # provided: Role, Customer, AuditLog, Invoice types
  lib/
    result.ts                   # provided: Result<T>, ok/err/conflict helpers
    authed-action.ts            # provided: authedAction + authedInputAction
    audit-log.ts                # provided: logAudit (sync, over store pushAudit)
    force-failure.ts            # provided: arm/consumeForceFailure (per-user)
    debug-flags.ts              # provided: readDebugFlags/setDebugFlag (cookie)
    customers/                  # provided: queries.ts + search-params.ts (chapter 062)
  app/(app)/customers/
    page.tsx                    # provided: chapter 062 customers list (RSC)
    [id]/page.tsx               # provided: chapter 062 customer detail (RSC)
    new/
      layout.tsx                # provided: async RSC, reads debug flags, mounts
                                #           <WizardStoreProvider> + progress + footer
      wizard-progress.tsx       # provided: reads currentStep + completedSteps
      footer.tsx                # TODO(L3): Back/Next reading selectIsStepValid
      step-1/page.tsx           # TODO(L3): contact field components
      step-2/page.tsx           # TODO(L3): billing field components
      step-3/page.tsx           # TODO(L3): preferences controls
      step-4/page.tsx           # TODO(L4): review via useShallow
      step-4/submit-button.tsx  # TODO(L4): isPending guard, calls action,
                                #           resets store, router.push on ok
      _lib/wizard/
        wizard-types.ts         # provided (read-only): WizardState/WizardStore +
                                #           initialWizardData
        schemas.ts              # provided: contactSchema, billingSchema,
                                #           preferencesSchema, createCustomerInput
        contact-slice.ts        # TODO(L2): StateCreator + setContactField
        billing-slice.ts        # TODO(L2): same shape
        preferences-slice.ts    # TODO(L2): + togglePreferenceChannel
        meta-slice.ts           # TODO(L2): currentStep, completedSteps, goNext, goBack
        store.ts                # TODO(L2): createWizardStore() composing four slices
                                #           via createStore (vanilla) + reset
        selectors.ts            # TODO(L3): selectIsStepValid, selectStepErrors,
                                #           atomic contact selectors
        actions.ts              # TODO(L4): createCustomer (authedInputAction +
                                #           composite Zod + pushCustomer + audit log)
      _components/
        wizard-store-provider.tsx  # TODO(L2): 'use client'; useRef-pinned store +
                                   #           context (+ debug-flag branches)
        use-wizard-store.ts        # TODO(L2): typed useWizardStore<T>(selector)
        use-broadcast-snapshot.ts  # provided: postMessage snapshot to inspector
        use-broadcast-render.ts    # provided: postMessage render events to inspector
  app/inspector/                # provided: session+org switcher, store-snapshot
                                #           panel via wizard iframe + postMessage,
                                #           "Arm force-failure", "Force double-submit",
                                #           "Reset store", "Refresh wizard", debug
                                #           flags, audit-log tail, re-render counter
lesson-verification/            # provided: Lesson 2/3/4 (describe.todo placeholders)
```

Student writes only the four slice files, `store.ts`, `selectors.ts`, `actions.ts`, `wizard-store-provider.tsx`, `use-wizard-store.ts`, the footer wiring, the four step pages, and the submit button. `wizard-types.ts` and `schemas.ts` are provided in full (read-only), and the chapter 062 customers list and detail page do not change.

### Inspector page (provided verification surface)

Server Component at `/inspector` (plus the `inspector-panel.tsx` client bridge and `actions.ts`), the verification surface every Moment of truth drives. The inspector is outside the wizard tree, so it does not mount the provider — it reads store snapshots through a client component that opens the wizard in an `<iframe src="/customers/new/step-1">` and mirrors state broadcast via `postMessage` (starter ships this wiring through the provided `use-broadcast-snapshot.ts` / `use-broadcast-render.ts`; the student does not write it).

- **Header:** acting-identity switcher and org switcher, both backed by the four seeded users (`org-acme` / `org-globex`, admin + member each).
- **Store-snapshot panel:** live mirror of `currentStep`, `completedSteps`, and each slice's values, updating on every store change inside the iframed wizard. Used to verify atomic-selector re-render scoping (only the changed field flashes).
- **"Arm force-failure" button:** arms the acting user's next `createCustomer` to return `{ ok: false, error: { code: 'internal', userMessage: 'Forced action failure for verification' } }` after a ~200ms delay and write no audit row. Read-and-clear, so it auto-clears after one submit. Verifies the store stays intact on failure.
- **"Force double-submit" button:** triggers the wizard iframe's step-4 submit twice 10ms apart via `postMessage` to verify the `isPending` guard.
- **"Reset store" button:** broadcasts a reset message into the iframe.
- **"Refresh wizard" button:** force-reloads the wizard iframe to `/customers/new/step-1`.
- **"Reset and re-seed" button:** rebuilds the in-memory store.
- **Audit-log tail:** last 20 `customer.created` rows in the active org.
- **Re-render counter panel:** each field/footer broadcasts its render count via `postMessage` (the provided `useBroadcastRender`). Verifies atomic-selector surgical re-rendering.
- **Debug flags:** two starter-shipped branches inside `WizardStoreProvider` — `STORE_MODULE_SCOPED` (reuses a module-scoped singleton) and `PROVIDER_ON_STEP_PAGE` (re-pins the store per pathname, equivalent to mounting the provider on each step page) — read per request from cookies so a Moment of truth can flip a single canonical bug into existence and revert it.

### Reference solution signatures lessons display

All wizard files live under `app/(app)/customers/new/` — `_lib/wizard/` for the store, slices, schemas, selectors, and action; `_components/` for the provider and hook. The slices hold data + setters only; validity is **derived in `selectors.ts`**, never stored on a slice, and `completedSteps` is a serializable `number[]` (never a `Set`) so the inspector snapshot survives `postMessage`.

- **Store types** (`_lib/wizard/wizard-types.ts`, provided read-only):
  - `type ContactSlice = { contact: { firstName: string; lastName: string; email: string; phone: string }; setContactField: <K extends keyof ContactSlice['contact']>(key: K, value: ContactSlice['contact'][K]) => void }`.
  - `BillingSlice` mirrors with `billing: { line1, line2, city, region, postalCode, country, taxId, paymentTerms: 'net15'|'net30'|'net60' }` + `setBillingField`.
  - `PreferencesSlice` with `preferences: { channels: Array<'email'|'sms'|'inApp'>; defaultCurrency: string; language: 'en-US'|'en-GB'|'fr-FR' }` + `setPreferenceField` + `togglePreferenceChannel`.
  - `MetaSlice = { currentStep: number; completedSteps: number[]; goNext(): void; goBack(): void }`.
  - `type WizardState = ContactSlice & BillingSlice & PreferencesSlice & MetaSlice`; `type WizardStore = WizardState & { reset(): void }`; plus `const initialWizardData: Pick<WizardState, 'contact'|'billing'|'preferences'|'currentStep'|'completedSteps'>`.
- **Zod schemas** (`_lib/wizard/schemas.ts`, provided): `contactSchema = z.strictObject({ firstName: z.string().min(1).max(80), lastName: …, email: z.email(), phone: z.string().min(7).max(20) })`; `billingSchema` with `country: z.string().length(2)` and `paymentTerms: z.enum(['net15','net30','net60'])` (and `line2: z.string()` — the only optional-in-spirit field); `preferencesSchema` with `channels: z.array(z.enum(['email','sms','inApp'])).min(1)` and `defaultCurrency: z.string().length(3)`; `createCustomerInput = z.strictObject({ contact, billing, preferences })`.
- **Contact slice** (`contact-slice.ts`): `export const createContactSlice: StateCreator<WizardStore, [], [], ContactSlice> = (set) => ({ contact: { firstName: '', lastName: '', email: '', phone: '' }, setContactField: (key, value) => set((s) => ({ contact: { ...s.contact, [key]: value } })) })`. No `validate...` on the slice.
- **Meta slice** (`meta-slice.ts`): `goNext` increments `currentStep` and appends the current step to `completedSteps` (de-duped) in one `set`; `goBack` clamps with `Math.max(1, currentStep - 1)`. No separate `markStepComplete`.
- **Store factory** (`store.ts`): `import { createStore } from 'zustand/vanilla'`; a `composeSlices: StateCreator<WizardStore, [], [], WizardStore>` spreads the four slice factories and adds `reset: () => a[0]({ ...composeSlices(...a), ...initialWizardData }, true)` (replace-mode flag); `export const createWizardStore = () => createStore<WizardStore>()(composeSlices)`; `export type WizardStoreApi = ReturnType<typeof createWizardStore>`.
- **Provider** (`_components/wizard-store-provider.tsx`): `'use client'`; `export const WizardStoreContext = createContext<WizardStoreApi | null>(null)`; `WizardStoreProvider({ children, storeModuleScoped = false, providerOnStepPage = false })` pins the store in `useRef` (lazy `if (storeRef.current === null …)`), keyed on `pathname` only when `providerOnStepPage` is on, and calls `getModuleScopedStore()` vs `createWizardStore()` per the `storeModuleScoped` flag; it also calls the provided `useBroadcastSnapshot(store)` and renders `<WizardStoreContext value={store}>`.
- **Typed hook** (`_components/use-wizard-store.ts`): `'use client'`; `import { useStore } from 'zustand'`; `export function useWizardStore<T>(selector: (s: WizardStore) => T): T { const store = useContext(WizardStoreContext); if (store === null) throw new Error('useWizardStore must be used within a WizardStoreProvider'); return useStore(store, selector) }`.
- **Selectors** (`_lib/wizard/selectors.ts`): atomic `selectCurrentStep`, `selectContactFirstName/LastName/Email/Phone`; a `steps` array pairing each schema with its slice; `selectIsStepValid(state) => steps[state.currentStep - 1]?.schema.safeParse(slice).success ?? true`; `selectStepErrors(state) => z.flattenError(result.error).fieldErrors` on failure, `{}` otherwise.
- **Server Action** (`_lib/wizard/actions.ts`): `'use server'`; `export const createCustomer = authedInputAction('member', createCustomerInput, async (input, ctx) => { if (consumeForceFailure(ctx.userId)) return err('internal', 'Forced action failure for verification'); let row; try { row = pushCustomer({ orgId: ctx.orgId, firstName: input.contact.firstName, lastName: input.contact.lastName, email: input.contact.email, phone: input.contact.phone, ...input.billing, defaultCurrency: input.preferences.defaultCurrency, language: input.preferences.language, notificationChannels: input.preferences.channels }) } catch (e) { if (isUniqueViolation(e)) return conflict('A customer with this email already exists in this organization.', null); throw e } logAudit({ orgId: ctx.orgId, actorUserId: ctx.userId, action: 'customer.created', subjectId: row.id }); revalidatePath('/customers'); return ok({ id: row.id }) })`. `firstName`/`lastName` are separate columns (not concatenated into a `name`); `pushCustomer` throws a `{ code: '23505' }`-shaped error on duplicate `(orgId, email)`; there is no transaction wrapper.
- **Layout** (`new/layout.tsx`): async RSC reading `readDebugFlags()`, importing `WizardStoreProvider` from `@/app/(app)/customers/new/_components/wizard-store-provider`; renders `<WizardStoreProvider providerOnStepPage={flags.PROVIDER_ON_STEP_PAGE} storeModuleScoped={flags.STORE_MODULE_SCOPED}><WizardProgress />{children}<WizardFooter /></WizardStoreProvider>`.
- **Atomic field component** (in `step-1/page.tsx`): each field is its own `'use client'` component — `const firstName = useWizardStore((s) => s.contact.firstName); const setContactField = useWizardStore((s) => s.setContactField); const error = useWizardStore((s) => selectStepErrors(s).firstName?.[0]); useBroadcastRender('firstName')`.
- **Next-gate** (in `footer.tsx`): `const currentStep = useWizardStore(selectCurrentStep); const isValid = useWizardStore(selectIsStepValid); const goNext = useWizardStore((s) => s.goNext)`; `onNext` calls `goNext()` then `router.push(\`/customers/new/step-${currentStep + 1}\`)`; Next is `disabled={!isValid}` and rendered only while `currentStep < 4`.
- **Review with `useShallow`** (in `step-4/page.tsx`): `import { useShallow } from 'zustand/react/shallow'`; `const { contact, billing, preferences } = useWizardStore(useShallow((s) => ({ contact: s.contact, billing: s.billing, preferences: s.preferences })))`.
- **Submit button** (`step-4/submit-button.tsx`): `'use client'`; reads the same three slices via `useShallow` (its own pick) plus `reset = useWizardStore((s) => s.reset)`, `router` from `next/navigation`; `const [isPending, startTransition] = useTransition()`, `const [error, setError] = useState<string | null>(null)`; `onSubmit = () => { setError(null); startTransition(async () => { const result = await createCustomer({ contact, billing, preferences }); if (!result.ok) { setError(result.error.userMessage); return } reset(); router.push(\`/customers/${result.data.id}\`) }) }`; `<Button disabled={isPending} onClick={onSubmit}>{isPending ? 'Creating…' : 'Create customer'}</Button>`.
- **Env entries:** none — the project has no `.env` and uses no environment variables.

### Concepts demonstrated → owning lesson

- Three-trigger funnel; wizard as the case that clears it — lesson 1 of chapter 078 + lesson 3 of chapter 078 (recapped in Project Overview).
- `createStore` from `zustand/vanilla` vs. `create`; cross-request leak as reason — lesson 2 (build the store skeleton).
- `StateCreator<Store, Mws, Mws, Slice>` typed slice factory + composition — lesson 2.
- `useRef`-pinned provider on App Router shared layout — lesson 2.
- Typed `useWizardStore<T>(selector)` hook reading store from context — lesson 2.
- `reset()` action with replace-mode (`a[0]({ ...composeSlices(...a), ...initialWizardData }, true)`) — lesson 2 (defined), lesson 4 (fired on submit-success).
- Atomic selectors as default subscription shape — lesson 3 (wire the forms and the Next-gate).
- Per-step Zod field errors via `selectStepErrors` (`z.flattenError`) — lesson 3.
- Next-gate deriving a primitive `.success` from a whole-slice `safeParse` inside `selectIsStepValid` — lesson 3.
- Store action + `router.push` bundled in one Next handler — lesson 3.
- `useShallow` for the composite mapped picks (review step + submit-button payload) — lesson 4 (submit, reset, and guard).
- Server Action submit boundary; the store does not insert — lesson 4.
- `useTransition` for submit pending state + double-submit guard — lesson 4.
- Composite-payload re-parse at the action with canonical Result; `23505` → `conflict()` — lesson 4.
- Success-only reset; tenancy-boundary forward pointer (sign-out, org-switch) — lesson 4.
- Architectural Principle #6 — per-feature, named, never global ambient — threaded through all build lessons.

---

## Lesson 1 — Project Overview

No feature is built. The student leaves with the starter running locally — the chapter 062 customers surface plus the four wizard route segments as shells, served off the in-memory seeded store with no database or env to configure.

**What we're building.** A four-step routed "new customer" wizard layered onto the chapter 062 customers surface.
Each step lives at its own route segment (`/customers/new/step-1` through `step-4`); a shared `WizardStoreProvider` on the layout pins one Zustand store across the four navigations.
Four slices hold the draft (contact / billing / preferences / meta); each step writes through atomic selectors; Next gates on the current slice's Zod validity; step 4 reviews the three data slices and submits through a Server Action that re-parses the composite payload server-side; on success the store resets and the router pushes to the new customer's detail page.
Refresh mid-flow loses the draft — the deliberate product call.
One figure: a capture of the flow — fill, Next, Back (preserved), Next, review, submit, redirect — alongside a refresh-mid-flow frame showing loss-by-design, with the step-4 review screen as the hero shot.

**What we'll practice.** Standing up the canonical Zustand-on-App-Router skeleton end to end: a `createStore` factory, a `useRef`-pinned provider on a shared layout, a typed selector hook, atomic selectors, per-slice Zod validation shared client and server, a Server-Action submit boundary, and success-reset discipline.
This is the skeleton every later surface that clears the three-trigger funnel (a routed cart, multi-step settings, a long form split across panes) will reuse.

**Architecture.** Labeled shape: the chapter 062 customers list and detail page (Server Components, untouched) sit above the wizard subtree; the `/customers/new` layout mounts the provider; the four step pages and the footer are leaf Client Components reading the store through atomic selectors; the submit button is the single seam where the client store meets the `createCustomer` Server Action, which owns the write (`pushCustomer`) and the `customer.created` audit entry, org-scoped from `ctx.orgId`.

**Starting file tree.** Use the annotated tree above: comment one line on each file the lessons touch or that changed from chapter 062, leave the rest uncommented, and mark the TODO files as the highlighted focus.
Top-level call-outs the student should leave the overview knowing: `app/(app)/customers/new/_lib/wizard/` is the feature-shaped home for the store, slices, schemas, selectors, and action, with the provider and hook in the sibling `_components/`; the `/customers/new` layout (where the provider belongs) sits alongside the provided progress indicator and footer shell and the four step pages; `app/inspector/` is the provided verification surface; `src/server/store.ts` is the in-memory `globalThis` store standing in for Postgres; `next.config.ts` keeps `cacheComponents: true` from chapter 062 — the customers list above the wizard tree stays cached and the wizard routes are leaf Client Components with no cache interaction.

**Roadmap.** One Card per build lesson:

- **Lesson 2 — Build the store skeleton.** Adds the four-slice store, the `useRef`-pinned provider on the shared layout, and the typed hook, so the wizard navigates across four routes with state surviving.
- **Lesson 3 — Wire the forms and the Next-gate.** Adds field bindings with inline Zod errors and the footer Next-gate, so each step writes into its slice and Next enables only when that slice is valid.
- **Lesson 4 — Submit, reset, and guard.** Adds the composite-payload Server Action, the `useShallow` review, and the submit button with its pending/double-submit guard, success-reset, and redirect.

**Setup.** Command sequence (Steps component): open the `start/` project, install dependencies (`pnpm install`), and start the dev server (`pnpm dev`). No `degit`, no Docker/Postgres, no migration, no seed, and no env file — `src/server/store.ts` boots fully seeded (two orgs, four users, invoices and customers per org) on first import.
Expected result on success: `/customers` renders the seeded customers list; `/customers/new/step-1` renders the step-1 shell with the contact fields visible but inert (the slice setters are no-op stubs until Lesson 2), so the footer Next stays disabled; `/inspector` loads with the wizard iframe and the store-snapshot panel mirroring the initial empty store (the provider and the `useBroadcastSnapshot` bridge are provided and already wired).

The lesson ends when the starter runs locally.

---

## Lesson 2 — Build the store skeleton

Author the four typed slice factories (each slice's per-field setters and the preferences channel toggle, plus the meta slice's `goNext`/`goBack`) and the store-wide `reset` in `store.ts`. The slice *types* and `initialWizardData` (`wizard-types.ts`), the `createStore` slice composition (`store.ts`), the `useRef`-pinned provider, and the typed `useWizardStore<T>(selector)` hook are provided — the provider also carries the inspector's scaffold-only debug branches, so you study these as the per-request boundary rather than authoring them.
Finished result: with the slices and `reset` implemented, the store's data layer is complete. The provided `useRef`-pinned provider already makes the inspector snapshot mirror the initial store and keeps the one store instance alive as the wizard navigates across all four routes; every field is still unwired and Next stays disabled — the deliberate runnable midpoint, with the form-writing payoff arriving in Lesson 3 when the forms call your setters.

### Your mission

This is the heaviest mechanics lesson in the chapter: you are standing up the store that every later lesson reads from, and two structural calls here are what keep the whole wizard correct.
The store factory must use `createStore` from `zustand/vanilla`, not `create` from `zustand` — `create` puts a module-scoped store in the server bundle's memory, and the per-request leak surfaces the first time two users hit the layout in the same Node process (the load-bearing reason from lesson 2 of chapter 078).
The provider belongs on the shared `/customers/new` layout, never on a step page — placing it under a step page is the canonical mistake that destroys the premise, because every navigation would re-mount the provider, re-create the store, and wipe the draft (the provided provider is already mounted on the shared layout; this lesson explains why that single placement is load-bearing, and the inspector's `PROVIDER_ON_STEP_PAGE` flag flips the broken arrangement into existence so you can watch the draft clear on each navigation).
The provided provider pins the store in a `useRef` with lazy `if (storeRef.current === null …)` init rather than `useState(() => createWizardStore())`: React's strict-mode double-invoke can otherwise create two stores on first mount in dev, and `useRef` with lazy init is React's documented pattern for refs holding initialized values — read it as the reference for the next surface you stand up.
Parameterize every `StateCreator` on the full `WizardStore` type so `set`/`get` see the whole store (including `reset`) from inside any slice; the middleware generics are empty tuples here because this chapter uses no `persist`, `devtools`, or `subscribeWithSelector` (named in lesson 2 of chapter 078, skipped here — they would fill the generics if they entered).
Give `reset()` the replace-mode flag — `a[0]({ ...composeSlices(...a), ...initialWizardData }, true)` — so the write produces a complete store (fresh action identities overlaid with blank `initialWizardData`) rather than a partial merge; the provided hook's `if (store === null) throw` is the runtime contract that catches a component reaching outside the provider's subtree.
Out of scope: any form wiring, the Next-gate, and the submit — fields stay unwired at the end of this lesson by design.

Requirements checklist:

- [ ] Navigating to `/customers/new/step-1` loads the step with the progress indicator reading "1 of 4" and the first pip highlighted — the provided progress component resolves the hook against the mounted store.
- [ ] The inspector store-snapshot panel mirrors the initial store: empty slices, `currentStep: 1`, `completedSteps` empty, and it stays in sync across renders while the iframe is mounted.
- [ ] Navigating forward and back across `/customers/new/step-1` through `step-4` keeps the one store instance alive — the snapshot does not reset on navigation.
- [ ] A component that reads the store from outside the provider's subtree throws a clear `useWizardStore must be used within a WizardStoreProvider` error rather than failing silently.
- [ ] The store is per-request: with the provider on the shared layout and the vanilla `createStore` factory, a second session opening the wizard sees its own empty store, not the first session's state.

### Coding time

Implement against the brief above; the `lesson-verification/Lesson 2.ts` file is a `describe.todo` placeholder (no automated test), so confirm the runnable midpoint by hand against the inspector.
Hidden `<details>` solution walkthrough, framed as material to read after attempting the work:

- Full reference implementation organized as it appears in the repo: the four slice files under `_lib/wizard/` (contact/billing/preferences expose data + a per-field setter that merges one key onto the slice object; preferences adds `togglePreferenceChannel` toggling array membership; `meta-slice.ts`'s `goNext` increments `currentStep` and appends to `completedSteps` de-duped in one `set`, `goBack` clamps with `Math.max(1, …)` — there is no `validate...` on any slice and no `markStepComplete`); `store.ts` (vanilla `createStore` factory composing the four slices via the `composeSlices = (...a) => ({ ...createContactSlice(...a), … })` spread, with `reset` defined there); `_components/wizard-store-provider.tsx`; `_components/use-wizard-store.ts`; and the layout that mounts the provider. `wizard-types.ts` (types + `initialWizardData`) is provided read-only — read it, don't write it.
- Decision rationale, one or two sentences each, for: `createStore` over `create` (the named import is where the per-request leak is prevented); `useRef` over `useState` for pinning; the replace-mode `reset` over a partial `set`; the empty middleware generics; `completedSteps` as a `number[]` (not a `Set`) so the inspector snapshot serializes over `postMessage`.
- Coverage of the untested requirements: the throw-on-missing-provider contract, the provider's single placement on the shared layout, and why the provided progress indicator already consumes the store through two atomic selectors (`currentStep` + `completedSteps`).
- Callout on the `composeSlices = (...a) => ({ ...createX(...a), … })` slice spread, which looks unusual at a glance — it is the standard `StateCreator` composition.
- For the App Router Server/Client boundary and `'use client'`, link to the owning regular lesson rather than re-explaining.

### Moment of truth

Confirm by hand against the inspector (no automated test covers the empty-fields midpoint):

- [ ] `/customers/new/step-1` shows "Step 1 of 4" with the first pip highlighted; form fields render but are unwired; footer Next is disabled.
- [ ] The inspector store-snapshot shows the initial state (empty slices, `currentStep: 1`, `completedSteps` empty) and stays in sync as the iframe re-renders.
- [ ] Navigating step 1 → 2 → 3 → 4 and back leaves the snapshot's accumulated state intact — the store survives every navigation.
- [ ] Reading `layout.tsx` confirms `<WizardStoreProvider>` wraps `<WizardProgress />`, `{children}`, and `<WizardFooter />` one level above the step children.
- [ ] Flipping the `PROVIDER_ON_STEP_PAGE` debug branch and navigating step 1 → 2 → 1 clears the store on each navigation (the canonical bug); flip it back.
- [ ] Flipping the `STORE_MODULE_SCOPED` debug flag and repeating a two-session test leaks session A's draft into session B; flip it back.

---

## Lesson 3 — Wire the forms and the Next-gate

Write `selectors.ts` (the atomic contact selectors plus `selectIsStepValid` / `selectStepErrors`), bind every step-1/2/3 field through atomic selectors and slice setters, render inline Zod errors from `selectStepErrors`, and wire the footer so Next gates on `selectIsStepValid` and advances both store and URL together.
Finished result: typing in any field writes into its slice and re-renders only that field's component; invalid input shows an inline error and keeps Next disabled; filling every field on a step enables Next, which advances both the store's `currentStep` and the URL; Back returns with prior data intact; step 4 still renders the review stub.

### Your mission

Each field on steps 1 through 3 is its own client component that binds through one atomic selector to one slice setter — `const firstName = useWizardStore((s) => s.contact.firstName)` paired with `const setContactField = useWizardStore((s) => s.setContactField)` — because the atomic-selector default is what keeps re-renders surgical; a naive whole-slice read like `useWizardStore((s) => ({ ...s.contact, setContactField: s.setContactField }))` returns a fresh object every state change, the default `Object.is` check fails, and the component re-renders on every keystroke (the re-render counter is the demo). Decomposing the step into per-field components is what makes "only the changed field re-renders" literally true.
Validity and field errors are **derived in `selectors.ts`, not on the slices**: `selectStepErrors(state)` runs `safeParse` on the current step's slice and returns `z.flattenError(result.error).fieldErrors`, and each field reads its own error primitive with `useWizardStore((s) => selectStepErrors(s).firstName?.[0])`. Keep validation whole-slice (indexed by `currentStep`) rather than per-field "touched" tracking — it keeps the model simple and the single-selector shape clear.
The footer's Next-gate derives a primitive from a complex computation: `selectIsStepValid` indexes a `steps` array by `currentStep - 1` and returns `schema.safeParse(slice).success` (step 4 has no entry, so it returns `true`), so although `safeParse` runs and returns a fresh result on every store change, the `.success` boolean is primitive and `Object.is(true, true)` short-circuits the re-render — the button re-renders only when validity flips.
Next's `onClick` bundles two things in one handler — the store action `goNext` and `router.push` to the next segment — which is canonical for routed wizards; splitting them (a `useEffect` watching `currentStep` to fire the push) is the effects-as-orchestrators pattern the course rejects (AP #6, explicit over magic).
Keep the gate framed as UX, not the security boundary: the action re-parses the composite schema server-side, so a bypass that calls the action with malformed data still returns `{ ok: false, error }`; the client gate is defense against UX confusion only.
Render errors as short `text-destructive` text under the field per the Unit 3 UX baseline, no toast; `paymentTerms` is a three-option select and `country` a 2-letter input (a country picker in production, kept lean here), and `channels` is three checkbox toggles bound to `togglePreferenceChannel`.
Out of scope: the step-4 review (still a stub) and any submit.

Requirements checklist:

- [ ] Typing in a step-1/2/3 field updates that field's value and persists it in the slice — leaving and returning to the step shows the typed value.
- [ ] An invalid value renders an inline error under its field (for example "Invalid email") and a valid value clears it.
- [ ] The footer Next button is disabled while any field on the current step is invalid or empty, and enables only when the whole current slice parses.
- [ ] Clicking Next advances both the URL to the next segment and the store's `currentStep`, and the progress indicator highlights the new pip.
- [ ] Clicking Back returns to the prior segment with that step's previously typed data still populated.
- [ ] Typing ten characters into one field re-renders only that field's input (and the footer at most once, when the Next-gate boolean flips), leaving sibling fields and the progress indicator unchanged.

### Coding time

Implement against the brief; `lesson-verification/Lesson 3.ts` is a `describe.todo` placeholder, so verify by hand against the inspector.
Hidden `<details>` solution walkthrough, framed as material to read after attempting the work:

- Full reference implementation organized as it appears in the repo: `selectors.ts` (atomic contact selectors, the `steps` array, `selectIsStepValid`, `selectStepErrors`); `step-1/page.tsx` (four per-field components, each an atomic-selector + setter + atomic error read); `step-2/page.tsx` (eight billing field components via `setBillingField`, `paymentTerms` select, `country` input); `step-3/page.tsx` (`defaultCurrency` and `language` selects, `channels` checkbox toggles); `footer.tsx` (`selectCurrentStep`, `selectIsStepValid`, `goNext`/`goBack`, the Next button bundling `goNext` + `router.push`, Next shown only when `currentStep < 4`).
- Decision rationale: the atomic-selector default vs. whole-slice read; deriving validity/errors in `selectors.ts` rather than on the slices; deriving the primitive `.success` inside `selectIsStepValid`; bundling the store action and router push in one handler; whole-slice validation over per-field.
- Coverage of the untested requirements: error-text placement and styling (Unit 3 baseline), `goNext` appending to `completedSteps` inline (de-duped) to drive the progress pips, and the Next-button-hidden-on-step-4 branch.
- Callout that the gate is UX-only and the action is the real contract — link to the chapter 042/043 Zod-and-Result regular lessons rather than re-explaining.
- Note on not pre-optimizing: `safeParse` on every store change is cheap at this schema size; debouncing or memoizing would be a future move for very large schemas.

### Moment of truth

There is no automated test (`lesson-verification/Lesson 3.ts` is a `describe.todo` placeholder); confirm every outcome by hand against the inspector and the browser:

- [ ] Typing in a step-1/2/3 field writes into its slice (the inspector snapshot updates) and the value persists across leave-and-return.
- [ ] An invalid value renders an inline error under its field (for example "Invalid email"); a valid value clears it; Next stays disabled until the whole current slice parses.
- [ ] Clicking Next pushes the URL to the next `step-N` segment, advances `currentStep`, and the progress indicator highlights the new pip.
- [ ] Clicking Back returns to the prior segment with that step's data intact.
- [ ] On the re-render counter, focusing step-1 firstName and typing ten characters increments only firstName's counter by ten, leaves siblings flat, and re-renders the footer at most once.
- [ ] Temporarily changing one field's selector to a whole-slice read `useWizardStore((s) => s.contact)` makes all four contact fields re-render on every keystroke; revert.

---

## Lesson 4 — Submit, reset, and guard

Write the composite-payload Server Action with its audit-log write, read the three slices on step 4 through `useShallow`, and wire the submit button with `useTransition` for the pending and double-submit guard, the success-reset, and the redirect.
Finished result: completing all four steps and clicking "Create customer" fires one Server-Action POST that writes the customer and an audit row, then redirects to the new customer's detail page with the wizard reset behind it; a forced failure shows an inline error and leaves the draft intact for retry; a double-click fires the action only once.

### Your mission

This lesson closes the loop, and the architectural seam is the point: the store owns the draft in memory, the action owns the write, and the submit button is the only place they meet (AP #3 — pure `/lib`, side effects at named boundaries, applied to the client/server split).
The action re-parses the composite `createCustomerInput` at the boundary (via `authedInputAction`, the direct-object wrapper — the button can call it as `await createCustomer({ contact, billing, preferences })`, so no `FormData` round-trip is needed), maps the four-slice payload onto the `Customer` row (`firstName`/`lastName` are their own columns — there is no `name` concatenation; billing spreads directly and preferences maps `defaultCurrency`/`language`/`notificationChannels`), calls `pushCustomer` then `logAudit`, and maps the `{ code: '23505' }` duplicate-email throw to a `conflict()` Result, rethrowing other errors. There is no real Postgres and no transaction here: `pushCustomer` throws *before* `logAudit` is reached on a duplicate, so a conflict leaves the audit log untouched — the ordering, not a `tx` wrapper, is what keeps the two consistent (the real-Postgres transactional version is named as the production move). The action never imports the store and the store never imports the action.
Tenancy lives entirely server-side — `authedInputAction`'s session resolution and the `orgId` carried into `pushCustomer` / `logAudit` — and the store knows nothing about `orgId`; this is defense in depth.
`useShallow` belongs on both composite mapped picks — the step-4 review and the submit button's payload pick — because each genuinely reads three slice objects into one fresh literal each render; the senior reflex is that a selector returning a fresh literal object/array wants `useShallow`, while a selector returning a primitive or an existing reference is fine on the default `Object.is` — reaching for `useShallow` on an atomic selector is the over-reach.
The submit button uses `useTransition`: `isPending` both drives the "Creating…" label and guards double-submit (the first click disables the button so the second click fires no handler), which is the right pending-state shape for a Server Action call over a plain `useState<boolean>` because it keeps the transition's concurrency behavior.
On success, call `reset()` before `router.push` — order is the discipline: although the wizard layout unmounts on navigation to `/customers/[id]` (so the next visit mounts a fresh provider regardless), reset-first is required in surfaces where the layout stays mounted across reset (a cart in a header), and this is the named senior call that generalizes.
On failure, set local error state and return without resetting — wiping the draft on a network blip (`if (!result.ok) { reset(); ... }`) is the common bug this lesson exists to prevent; the transient error belongs in component `useState`, not the store, which is for the draft the user owns.
Choose the explicit button-handler calling the action programmatically over `<form action={createCustomer}>` with `useActionState`: the data already lives parsed in the client store, so serializing it back through `FormData` is ceremony with no upside — the senior call is that programmatic call is right when data lives in a client store (and `authedInputAction` is the direct-object wrapper that fits it), and `<form action>` + `useActionState` is right when data is in form fields the user just typed.
Out of scope: writing the new customer's id into the store (it is server state the redirect transitions to, and storing it is role creep), and `crypto.randomUUID()`/idempotency keys (the store generates the id, and one user/one transition/one submit is naturally idempotent at this layer; `processed_events` lands when retries are external, Unit 11).

Requirements checklist:

- [ ] Completing all four steps with valid data and clicking "Create customer" fires exactly one Server-Action POST whose response is `{ ok: true, data: { id } }`.
- [ ] One new customer and one `customer.created` audit row land in the active org — the audit-log tail shows the new row, and a duplicate-email submit (`dupe@acme.test`) returns a `conflict` and leaves the audit log unchanged (because `pushCustomer` throws before `logAudit` runs).
- [ ] On success the router pushes to `/customers/[newId]` and the real customer detail page renders.
- [ ] After a successful submit, navigating back to `/customers/new/step-1` shows the wizard reset to its initial state.
- [ ] With the inspector "Arm force-failure" on, submitting shows an inline error under the button and leaves every field populated for retry — the draft survives the failure.
- [ ] A double-click (or the inspector "Force double-submit") fires the action only once — one POST, one audit row — because `isPending` blocks the second handler.
- [ ] The step-4 review and the submit button each read the contact, billing, and preferences slices through a `useShallow` pick, and `useShallow` appears nowhere outside those two files.
- [ ] A programmatic action call with a malformed payload returns `{ ok: false, error: { code: 'validation' } }` and leaves both the store and the audit log untouched.

### Coding time

Implement against the brief; `lesson-verification/Lesson 4.ts` is a `describe.todo` placeholder, so verify by hand against the inspector.
Hidden `<details>` solution walkthrough, framed as material to read after attempting the work:

- Full reference implementation organized as it appears in the repo: `actions.ts` (`createCustomer` via `authedInputAction('member', createCustomerInput, …)`, the `consumeForceFailure` early-return, `pushCustomer` then `logAudit`, the `isUniqueViolation`/`code === '23505'` → `conflict()` mapping, and `revalidatePath('/customers')`; the direct-object wrapper means the button calls it straight, no `FormData`/`prev` shape to bridge); `step-4/page.tsx` (the `useShallow` pick and the three review subsections with `<SubmitButton />` below); `step-4/submit-button.tsx` (`useTransition`, local `error` state, its own `useShallow` payload pick, the `onSubmit` calling `createCustomer`, the reset-then-push success branch, the disabled/labelled button, and the error paragraph).
- Decision rationale: store/action separation as the seam; `useShallow` for both composite reads; `useTransition`'s `isPending` over plain `useState`; reset-before-push ordering; the ordering (throw-before-audit) standing in for a transaction; the `23505`→`conflict` mapping.
- Alternative-rejected note on `<form action>` + `useActionState`: native and progressive-enhancement-friendly, but the payload would have to be re-encoded as `FormData` from already-parsed in-memory slices — ceremony with no upside; the programmatic `authedInputAction` call wins when data lives in a client store.
- Coverage of the untested requirements: local error state vs. store, not storing the new id, the audit ordering (not a `tx`) and the note that real Postgres would wrap both in one transaction, and the org-switch/sign-out `reset()` forward pointer (named once, not implemented — the active-org-switch action lives in chapter 056 and the hook is a single line).
- For Server Actions, the canonical Result, and `useTransition`, link to the chapter 043/044 regular lessons rather than re-explaining.

### Moment of truth

There is no automated test (`lesson-verification/Lesson 4.ts` is a `describe.todo` placeholder); confirm every outcome by hand against the inspector and the browser:

- [ ] Completing all four valid steps and submitting fires exactly one POST returning `{ ok: true, data: { id } }`; the audit-log tail gains one `customer.created` row.
- [ ] After submit the router lands on `/customers/[newId]` and the real chapter 062 detail page renders.
- [ ] Navigating back to `/customers/new/step-1` after a successful submit shows empty fields and an initial snapshot; temporarily removing `reset()` from the success branch leaves the previous customer's data, confirming reset closed the loop; revert.
- [ ] With "Arm force-failure" on, submitting shows the inline error and leaves the draft intact; temporarily adding `reset()` to the failure branch wipes the draft on a forced failure; revert.
- [ ] "Force double-submit" produces one POST and one audit row — `isPending` blocks the second handler.
- [ ] Submitting `dupe@acme.test` (the seeded duplicate) returns a `conflict` and leaves the audit log unchanged — `pushCustomer` throws before `logAudit` runs.
- [ ] A session in org X completing the wizard creates the customer in org X's list, not org Y's — tenancy holds at the action.
- [ ] Grepping `useShallow` returns two hits (the review step and the submit button); grepping `useWizardStore`, `createWizardStore`, and `WizardStoreProvider` returns hits only under `app/(app)/customers/new/_lib/wizard/` and `_components/` (and the step pages, footer, and layout); grepping imports of the store and hook shows only Client Components, with the action file importing schemas only.
- [ ] Refreshing mid-flow (inspector "Refresh wizard") reloads the wizard at step 1 with an empty snapshot, confirming refresh-loses; `store.ts` carries no `persist`.

Forward references the lesson closes on:

- Chapter 080 — error discipline at seams; the action-failure error rendering is one audited finding (user/operator message split).
- Chapter 082 — security baseline audit; the wizard's tenancy at the action is one audited finding.
- Chapter 071 — notifications dispatcher; a "customer created" notification routes through the dispatcher after the audit-log write, not from the submit button.
- Chapter 089 — component tests; Next-gate validity transitions and submit pending/error states are mechanical against a mocked action.
- Chapter 056 — active-org-switch action; production calls the wizard `reset()` from inside the org-switch flow as a tenancy-boundary discipline.
- Chapter 092 — structured logs; the `customer.created` audit entry is the operator-truth side, the in-app "Customer created" notification (Unit 13) the user-facing side.

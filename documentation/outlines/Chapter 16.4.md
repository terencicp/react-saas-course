# Chapter 16.4 — Project: routed multi-step wizard with Zustand

## Chapter framing

Chapter 16.4 cashes in the three-trigger funnel (16.3.1), the v5 primitives (16.3.2), and the worked-screen framing (16.3.3) as one runnable four-step "new customer" wizard on top of the Unit 11.3 customers surface. The student builds the per-feature store with four slices (contact / billing / preferences / meta), the `useRef`-pinned `WizardStoreProvider` on the shared `/customers/new` layout, the typed `useWizardStore<T>(selector)` hook, per-step Zod schemas shared client and server side, each step's form wired with atomic selectors and `useShallow` only where the senior call demands it, the Next-gate validation that runs `safeParse` on the current slice on every keystroke, the step 4 review screen that reads all three preceding slices, the `createCustomerAction` Server Action that re-parses the composite payload at the boundary, and the success-reset + redirect path. Each build slice closes on a runnable state: 16.4.3 ends with the store, the provider, and the layout mounting so step 1 loads with empty fields from the store; 16.4.4 ends with each form writing into its slice with field-level errors and the Next-gate disabling/enabling per validity; 16.4.5 ends with step 4 review submit firing the action and redirecting on success; 16.4.6 walks the "Done when" clause-by-clause.

Threads through every lesson: Zustand is per-feature and client-only — the store lives under `src/lib/wizard/` and never crosses into a Server Component or Server Action body; the store factory uses `createStore` from `zustand/vanilla` not `create` so each provider mount creates a fresh instance (the per-request leak from 16.3.2 is the reason); `WizardStoreProvider` sits on the shared `/customers/new` layout — not on each step page (the canonical mistake) — so back/forward across the four route segments preserves state; selectors are atomic at the call site, and `useShallow` is reserved for the review step's composite mapped pick; each step's Zod schema is the single source of truth, parsing the slice at the Next-gate (client) and parsing the composite at the action (server); refresh loses the store and this is the explicit product call — server-side draft persistence is out of scope; the submit boundary is a Server Action, the store does not insert; reset fires after submit-success (org-switch and sign-out resets are named as forward pointers to 10.1).

### Dependency carry-in

- **From 11.3:** `app/(app)/customers/page.tsx` list, `getCustomerDetail({ orgId, id })`, active-org session slot.
- **From 10.4:** `tenantDb(orgId)` in `src/lib/tenant-db.ts`, `authedAction(role, schema, fn)` in `src/lib/authed-action.ts`, `writeAuditLog(tx, event)`.
- **From 6.6:** `customers` table (`id`, `organizationId`, `name`, `email`, `phone`, address columns, `taxId`, `paymentTerms`, `defaultCurrency`, `language`, `notificationChannels jsonb`). Columns match the four-slice payload — no migration this project.
- **From 7.1 / 7.2:** Zod 4 `strictObject`, canonical Result shape, `useActionState` (named but not used — see 16.4.5 alternative-rejected).
- **From 16.3.1:** the three-trigger funnel and the wizard as the worked case.
- **From 16.3.2:** `createStore` from `zustand/vanilla`, `StateCreator<Store, Mws, Mws, Slice>`, atomic selectors, `useShallow` from `zustand/react/shallow`, `useRef`-pinned provider, typed `useStore(store, selector)`, the explicit `reset()` action.
- **From 16.3.3:** the four-slice shape, per-step Zod contract, Server-Action submit boundary, back/forward-preserves vs. refresh-loses as the senior call.

### Starter file tree (stubs marked with TODO)

```
src/
  lib/
    tenant-db.ts                # provided (10.1)
    authed-action.ts            # provided (10.2)
    audit-log.ts                # provided
    wizard/
      types.ts                  # TODO: WizardState = Contact & Billing & Preferences & Meta
      schemas.ts                # provided: contactSchema, billingSchema, preferencesSchema,
                                #           createCustomerInput (composite)
      contact-slice.ts          # TODO: StateCreator factory + setters + validate()
      billing-slice.ts          # TODO: same shape
      preferences-slice.ts      # TODO: same shape
      meta-slice.ts             # TODO: currentStep, completedSteps, goNext, goBack, reset
      store.ts                  # TODO: createWizardStore(initial?) factory composing slices
                                #       via createStore from zustand/vanilla
      store-provider.tsx        # TODO: 'use client'; useRef-pinned store + React context
      use-wizard-store.ts       # TODO: typed useWizardStore<T>(selector) hook
      actions.ts                # TODO: createCustomerAction (authedAction + composite Zod
                                #       + insert + writeAuditLog)
  app/
    (app)/
      customers/
        new/
          layout.tsx            # provided shell; TODO: wrap in <WizardStoreProvider> +
                                #                       <WizardProgress/> + children + <WizardFooter/>
          progress.tsx          # provided: reads currentStep + completedSteps
          footer.tsx            # provided shell; TODO: Back/Next with isValid + goBack/goNext
          step-1/page.tsx       # provided shell; TODO: contact fields, atomic selectors
          step-2/page.tsx       # provided shell; TODO: billing fields
          step-3/page.tsx       # provided shell; TODO: preferences fields
          step-4/page.tsx       # provided shell; TODO: review via useShallow + <SubmitButton/>
          step-4/submit-button.tsx  # TODO: 'use client'; isPending guard, action, reset, push
    inspector/page.tsx          # provided: session/org switcher, store snapshot, force-failure
                                #           toggle, force-double-submit, reset, refresh-wizard,
                                #           audit-log tail, re-render counter, debug flags
                                #           (STORE_MODULE_SCOPED, PROVIDER_ON_STEP_PAGE)
```

### Reference solution signatures lessons display

- **Types** (`types.ts`): `ContactSlice = { contact: { firstName, lastName, email, phone }; setContactField: <K>(k, v) => void; validateContact: () => z.SafeParseReturnType<...> }`; `BillingSlice` (address fields + `taxId` + `paymentTerms: 'net15' | 'net30' | 'net60'`); `PreferencesSlice` (`channels: Array<'email'|'sms'|'inApp'>`, `defaultCurrency`, `language`, plus `togglePreferenceChannel`); `MetaSlice = { currentStep: 1|2|3|4; completedSteps: Set<1|2|3|4>; goNext; goBack; markStepComplete; reset }`; `WizardState = ContactSlice & BillingSlice & PreferencesSlice & MetaSlice`.
- **Schemas** (`schemas.ts`, provided): `contactSchema = z.strictObject({ firstName: z.string().min(1).max(80), lastName: z.string().min(1).max(80), email: z.string().email(), phone: z.string().min(7).max(20) })`; `billingSchema` (address + `taxId` + `paymentTerms` enum); `preferencesSchema` (`channels` non-empty, `defaultCurrency` 3-char, `language` enum); `createCustomerInput = z.strictObject({ contact, billing, preferences })`.
- **Contact slice**: `export const createContactSlice: StateCreator<WizardState, [], [], ContactSlice> = (set, get) => ({ contact: { firstName: '', ... }, setContactField: (k, v) => set((s) => ({ contact: { ...s.contact, [k]: v } })), validateContact: () => contactSchema.safeParse(get().contact) })`.
- **Store** (`store.ts`): imports `createStore` from `zustand/vanilla`. `export type WizardStore = ReturnType<typeof createWizardStore>`; `export const createWizardStore = (initial?) => createStore<WizardState>()((...a) => ({ ...createContactSlice(...a), ...createBillingSlice(...a), ...createPreferencesSlice(...a), ...createMetaSlice(...a), ...initial }))`.
- **Provider**: `'use client'`; `const WizardStoreContext = createContext<WizardStore | null>(null)`; `WizardStoreProvider` uses `const storeRef = useRef<WizardStore | null>(null); if (storeRef.current === null) storeRef.current = createWizardStore();` then provides context.
- **Hook**: `'use client'`; `useWizardStore<T>(selector): T { const store = useContext(WizardStoreContext); if (!store) throw new Error('useWizardStore must be used inside <WizardStoreProvider>'); return useStore(store, selector) }`.
- **Action** (`actions.ts`): `createCustomerAction = authedAction({ role: 'member', schema: createCustomerInput, fn: async ({ ctx, input }) => { const inserted = await tenantDb(ctx.orgId).transaction(async (tx) => { const [row] = await tx.insert(customers).values({ organizationId: ctx.orgId, name: \`${input.contact.firstName} ${input.contact.lastName}\`, ...input.contact (sans name fields), ...input.billing, ...input.preferences }).returning(); await writeAuditLog(tx, { event: 'customer.created', subjectId: row.id }); return row }); return { ok: true as const, data: { id: inserted.id } } } })`.
- **Layout**: `import { WizardStoreProvider } ...; export default function Layout({ children }) { return <WizardStoreProvider><WizardProgress />{children}<WizardFooter /></WizardStoreProvider> }`.
- **Atomic selector at a field**: `const firstName = useWizardStore((s) => s.contact.firstName); const setContactField = useWizardStore((s) => s.setContactField); <Input value={firstName} onChange={(e) => setContactField('firstName', e.target.value)} />`.
- **Next-gate** (`footer.tsx`): `const isValid = useWizardStore((s) => { if (s.currentStep === 1) return s.validateContact().success; if (s.currentStep === 2) return s.validateBilling().success; if (s.currentStep === 3) return s.validatePreferences().success; return true })`; Next button `disabled={!isValid}`, on click calls `goNext()` + `router.push(/customers/new/step-${currentStep+1})`.
- **Review** (`step-4/page.tsx`): `import { useShallow } from 'zustand/react/shallow'; const { contact, billing, preferences } = useWizardStore(useShallow((s) => ({ contact: s.contact, billing: s.billing, preferences: s.preferences })))`.
- **Submit button**: `'use client'`; `const [isPending, startTransition] = useTransition(); const [error, setError] = useState<string|null>(null); const onSubmit = () => startTransition(async () => { setError(null); const r = await createCustomerAction({ contact, billing, preferences }); if (!r.ok) { setError(r.error.message); return } reset(); router.push(\`/customers/${r.data.id}\`) })`; button `disabled={isPending}`.
- **Env entries:** unchanged from 11.3.

### Inspector page spec

Server Component at `/inspector`, outside the wizard tree. Opens the wizard in an iframe and broadcasts state via `postMessage` (the starter ships this wiring).

- **Header:** session-user switcher (admin/member per seeded org), org switcher (two seeded orgs).
- **Store snapshot panel:** live mirror of `currentStep`, `completedSteps`, and each slice — flash animation on update for visual verification of atomic re-render scoping.
- **"Force action failure" toggle:** flag that makes the next `createCustomerAction` invocation return `{ ok: false, error: { code: 'forced_failure', message: 'Forced action failure for verification' } }` after a 200 ms delay. Auto-clears on first invocation.
- **"Force double-submit" button:** triggers the wizard's submit button twice 10 ms apart via `postMessage`.
- **"Reset store" button:** broadcasts a reset message.
- **"Refresh wizard" button:** force-reloads the iframe.
- **Audit-log tail:** last 20 `customer.created` rows in the active org.
- **Re-render counter panel:** each step's mirror shows a render count badge from a `useRef`-counter broadcast via `postMessage`.
- **Debug flags:** `STORE_MODULE_SCOPED` (swaps the factory for a module-scoped instance) and `PROVIDER_ON_STEP_PAGE` (moves the provider into each step page). Both flag-gated, both used in 16.4.6 as deliberate-misuse demos.

Student writes only: `types.ts`, four slice files, `store.ts`, `store-provider.tsx`, `use-wizard-store.ts`, `actions.ts`, the layout wrap, the footer wiring, the four step pages, the submit button.

### Verify recipe mapped to "Done when"

| Done-when clause | Verify step |
| --- | --- |
| Filling step 1 then step 2 and back returns to step 1 with data intact | Type into step 1, advance, type into step 2, Back. Step 1 fields show original values. Snapshot panel shows both slices populated. Provider on shared layout is the structural reason. |
| Submit on step 4 fires the action with the composite payload | Complete all steps; click Create customer. One Server-Action POST. Response `{ ok: true, data: { id } }`. Audit-log tail shows `customer.created`. Router pushes to `/customers/[newId]`. |
| After successful submit, back to step 1 shows wizard reset | Navigate to `/customers/new/step-1` after redirect. Fields empty. Snapshot panel shows initial state. |
| Refresh in the middle of step 3 loses state (the senior call) | Fill steps 1-2, advance to step 3. "Refresh wizard" button. Wizard reloads at step 1 empty. No `persist` middleware in `store.ts`. Compare to deliberate `persist` wrap: refresh resumes mid-flow. Revert. |
| Double-submit on step 4 does not fire twice | "Force double-submit" button. One POST, one audit-log row. `useTransition`'s `isPending` is the guard. |
| Next-gate disables until current slice is valid | Step 1 empty → disabled. Fill one field → still disabled. Fill all valid → enables. Invalid email → disables, inline error renders. |
| Same Zod schema validates at the gate (client) and the action (server) | `validateContact` calls `contactSchema.safeParse`; action parses `createCustomerInput` embedding `contactSchema`. Bypass action with malformed payload → `{ ok: false, error: { code: 'invalid_input' } }`. Audit-log unchanged. |
| Action failure does not wipe the draft | "Force action failure" toggle on. Submit. Error banner; wizard intact on step 4; navigating back shows fields populated. Compare: deliberately add `reset()` to error branch → wizard wipes. Revert. |
| Atomic selectors keep re-renders surgical | Type ten chars in firstName: firstName counter +10, lastName/email/phone +0, footer +1 (boolean stayed false). Deliberately switch a selector to `(s) => s.contact` → counters all +10. Revert. |
| `useShallow` is reserved for the review step | Grep `useShallow` → only `step-4/page.tsx` (and possibly `submit-button.tsx`). Atomic selectors elsewhere. |
| Store is per-request and does not leak | Session A fills step 1; switch to session B; step 1 empty. Flip `STORE_MODULE_SCOPED` → session B sees session A's draft. Flip back. The per-request rule's bug is the demo that justifies it. |
| Provider sits on the shared layout, not on step pages | Read `layout.tsx` — `<WizardStoreProvider>` wraps children. Flip `PROVIDER_ON_STEP_PAGE` → navigation re-mounts provider, store wipes every step change. Flip back. |
| Reset fires after submit-success only | `reset()` in success branch only; failure branch keeps the draft. |
| Zustand is scoped to the wizard surface only | Grep `useWizardStore`, `WizardStoreProvider`, `wizard/store` → only `src/lib/wizard/` and `app/(app)/customers/new/`. Per-feature, never global. |
| No Server Component imports the store | Grep imports → only `'use client'` files import. The action imports `schemas.ts`, never the store. |
| Audit-log write is part of the action's transaction | Force unique-constraint violation (seeded email) → action returns `{ ok: false }`, audit-log unchanged (transaction rolled back). |
| Tenancy at the action | Submit in session A (org X) → new customer in org X's list only. `authedAction` + `tenantDb` do their job. |

### Concepts demonstrated → owning lesson

- Three-trigger funnel + wizard as the case that clears it — 16.3.1 + 16.3.3.
- `createStore` from `zustand/vanilla` vs. `create` from `zustand`; cross-request leak as the reason — 16.3.2.
- `StateCreator<Store, Mws, Mws, Slice>` typed slice factory + slices composition — 16.3.2.
- Atomic selectors as the default subscription shape — 16.3.2.
- `useShallow` for mapped picks (review step's composite read) — 16.3.2.
- `useRef`-pinned provider on the App Router shared layout — 16.3.2 + 16.3.3.
- Typed `useFooStore<T>(selector)` hook reading store from context — 16.3.2.
- Zod-per-step contract; same schema at the client gate and the server action — 7.1 + 16.3.3.
- Server Action submit boundary; the store does not insert — 7.2 + 16.3.3.
- `useTransition` for submit pending state and double-submit guard — 7.3.
- `reset()` action and success-only reset discipline; tenancy boundary forward pointer — 16.3.2 + 16.3.3 + 10.1.
- Architectural Principle #6 — per-feature, named, never global ambient state — 16.3.1 + 16.3.2.
- Zod parse at the action boundary with the canonical Result — 7.1 + 7.2.

---

## Lesson 16.4.1 — Project brief

Goals:

- Frame the build: take the 11.3 customers surface and add a four-step routed wizard at `/customers/new/step-1` through `step-4`. Each step is its own route segment; a shared `WizardStoreProvider` on the layout pins a Zustand store across the four navigations. Four slices (contact / billing / preferences / meta). Each step's form writes into its slice via atomic selectors; the Next button gates on the current slice's Zod validity; step 4 reviews all three preceding slices and submits via a Server Action that re-parses the composite payload server-side. On success, the store resets and the router pushes to the new customer's detail page. Show one screenshot of step 4's review screen with the three filled slices and the "Create customer" button.
- State the "Done when": filling step 1 then navigating away and back preserves the data; submit on step 4 fires the action with the composite payload; success-reset and redirect close the loop; refresh in the middle loses state (the senior call); double-submit on step 4 does not fire twice; the Next-gate enables only when the current slice's Zod parse succeeds.
- Scope cuts: no server-side draft persistence (refresh-loses is the product call); no per-step animations; no `persist` to `sessionStorage` (named in 16.3.2 but explicitly skipped); no skip-to-step forward jumps (linear advance via Next); no edit-existing-customer flow (this is a *create* wizard); no `useActionState` shape (see 16.4.5 alternative-rejected).
- Senior payoff: this is the canonical Zustand-on-App-Router shape — `createStore` factory + `useRef`-pinned provider on the shared layout + typed hook + atomic selectors + per-slice Zod + Server-Action submit + success-reset. The two structural calls that prevent the canonical bugs: provider on the *shared layout* (not step pages — store-resets-on-navigation), and `createStore` (not `create` — cross-request leak).
- Show the end UX: a short capture — fill step 1, Next, fill step 2, Back (data preserved), forward, fill, fill, review, submit, land on customer detail; then refresh-mid-flow showing the loss-by-design.
- Link the starter via `degit`.

Senior calls and watch-outs:

- The starter ships 11.3 working end-to-end plus the four route segments, the shared layout shell, progress indicator, footer shell, and schemas in full. 11.3 stays untouched — every change in this project lives under `src/lib/wizard/` and `app/(app)/customers/new/`.
- The TOC suggests "store + slices + selectors" and "form wiring + Next-gate" as two lessons; the outline keeps this split because each runnable midpoint matters: 16.4.3 ends with the provider mounting and the wizard navigating empty across four routes; 16.4.4 ends with each form writing into its slice and the Next-gate working.
- Submit lives in 16.4.5 with the success-reset path because the action and the reset are the same architectural call (store owns the draft, action owns persistence, success closes the loop with reset + redirect).

Codebase state at entry: empty repo.
Codebase state at exit: starter cloned, Postgres up, schema migrated, seed loaded; `pnpm dev` shows `/customers` list; `/customers/new/step-1` renders the step-1 shell unwired; `/inspector` loads with empty snapshot panel.

Estimated student time: 10 to 15 minutes.

---

## Lesson 16.4.2 — Starter walkthrough

Goals:

- Walk the file tree, calling out provided vs. stubbed. Linger on the eight student files (`types.ts`, four slice files, `store.ts`, `store-provider.tsx`, `use-wizard-store.ts`, `actions.ts`) plus the seven consumer files (`layout.tsx` wrap, `footer.tsx` wiring, four step pages, `submit-button.tsx`).
- Read `schemas.ts` — three step schemas plus the composite. Same schemas parse client-side at the Next-gate and server-side at the action. Single source of truth.
- Read `customers` table columns from 6.6 — already shipped, no migration. Action maps `{ contact: {firstName, lastName} }` to `name: \`${firstName} ${lastName}\``, spreads `billing` and `preferences` directly (column names match).
- Read `progress.tsx` (provided): reads `currentStep` and `completedSteps` via two atomic selectors, renders four-pip indicator. Consumer pattern reference.
- Read `footer.tsx` shell — Back/Next placeholders waiting for the wiring in 16.4.4.
- Read each step page shell — every field rendered with empty value and no `onChange`; TODO markers. Step 4 review is a stub.
- Read the inspector end-to-end — every panel, button, debug flag (`STORE_MODULE_SCOPED`, `PROVIDER_ON_STEP_PAGE`). These exist solely for the verify lesson's deliberate-misuse demos.
- Read `next.config.ts`: `cacheComponents: true` from 11.3; the customers list above stays cached; the wizard routes are leaf Client Components, no cache interaction.
- Run the app: `/customers` renders the seeded list. `/customers/new/step-1` renders the form shell; the layout doesn't yet wrap in the provider; fields are unwired so the typed hook isn't called yet.

Senior calls and watch-outs:

- `src/lib/wizard/` is feature-shaped per Principle #4 — directory groups store, slices, schemas, provider, hook, action. Per-feature, never global. Future routed wizards get sibling directories.
- Eight student files + seven consumer files = the entire build surface. The 11.3 customers list and detail page do not change at all; the addition to the tree is the `new/` segment.
- The shared layout placement of the provider is the load-bearing structural choice. The lesson establishes it on the file-tree read so the student sees the layout's role before writing the wrap in 16.4.3 — and so the `PROVIDER_ON_STEP_PAGE` debug flag in 16.4.6 is recognizable as deliberate misuse.
- The `customers` table is org-scoped via `organizationId` from 6.6; the action calls `tenantDb(ctx.orgId)`. The store knows nothing about `orgId` — that's a server concern resolved by `authedAction`.

Codebase state at entry: starter cloned, Postgres running, schema migrated, seed loaded.
Codebase state at exit: every provided file read, inspector clicked through, wizard routes navigated as empty shells. No code written.

Estimated student time: 15 to 25 minutes.

---

## Lesson 16.4.3 — Store, slices, provider, and the typed hook

Goals:

- Fill `types.ts`: `ContactSlice`, `BillingSlice`, `PreferencesSlice`, `MetaSlice`, and `WizardState = ContactSlice & BillingSlice & PreferencesSlice & MetaSlice`. The intersection type is what every slice's `StateCreator` is parameterized on, so `set` and `get` see the whole store from any slice.
- Fill the four slice files. Each follows the same shape: `export const createContactSlice: StateCreator<WizardState, [], [], ContactSlice> = (set, get) => ({ contact: { firstName: '', ... }, setContactField: (k, v) => set((s) => ({ contact: { ...s.contact, [k]: v } })), validateContact: () => contactSchema.safeParse(get().contact) })`. Preferences adds `togglePreferenceChannel: (c) => set((s) => ({ preferences: { ...s.preferences, channels: s.preferences.channels.includes(c) ? s.preferences.channels.filter(x => x !== c) : [...s.preferences.channels, c] } }))`. Meta exposes `goNext` (advances `currentStep`, calls `markStepComplete`), `goBack`, `markStepComplete`, `reset: () => set(initialState, true)` — the `true` flag is replace-mode so the wipe is exact (the lesson names why `set({}, true)` would be wrong: it would lose the action methods).
- Fill `store.ts`: import `createStore` from `zustand/vanilla` (**not** `create` from `zustand` — load-bearing). `export type WizardStore = ReturnType<typeof createWizardStore>`. `createWizardStore = (initial?) => createStore<WizardState>()((...a) => ({ ...createContactSlice(...a), ...createBillingSlice(...a), ...createPreferencesSlice(...a), ...createMetaSlice(...a), ...initial }))`. The factory returns a fresh vanilla store on every call; the provider calls it once per mount.
- Fill `store-provider.tsx`: `'use client'`. `const WizardStoreContext = createContext<WizardStore | null>(null); export { WizardStoreContext }`. `WizardStoreProvider`: `const storeRef = useRef<WizardStore | null>(null); if (storeRef.current === null) storeRef.current = createWizardStore(); return <WizardStoreContext.Provider value={storeRef.current}>{children}</WizardStoreContext.Provider>`. `useRef` (not `useState`) is deliberate — `useRef` creates exactly once per component instance; strict-mode double-invoke of `useState` initializers would create two stores on first mount. The `if (storeRef.current === null)` guard is the canonical lazy-init pattern.
- Fill `use-wizard-store.ts`: `'use client'`. Import `useStore` from `zustand` (the React-binding hook). `useWizardStore<T>(selector: (s: WizardState) => T): T { const store = useContext(WizardStoreContext); if (store === null) throw new Error('useWizardStore must be used inside <WizardStoreProvider>'); return useStore(store, selector) }`. The generic on the signature gives the call site `const firstName = useWizardStore((s) => s.contact.firstName)` the inferred `string` return.
- Edit `layout.tsx`: import `WizardStoreProvider`; wrap `<WizardProgress />` + `{children}` + `<WizardFooter />` in it. One import, one wrap. Provider sits on the shared layout so all four step children share the same store instance.
- Confirm progress indicator (already shipped) reads from the store via two atomic selectors and renders the first pip highlighted on `/customers/new/step-1`.
- Run the app: navigate to `/customers/new/step-1`. Progress indicator shows "1 of 4". Form fields render but unwired. Footer's Next is disabled (selector lands in 16.4.4). Inspector's snapshot panel shows initial state.

Senior calls and watch-outs:

- `createStore` from `zustand/vanilla` + the provider is the App Router-correct shape. The default-tutorial `create((set) => ({...}))` from `zustand` puts a module-scoped store in the server bundle's memory; the per-request leak surfaces the first time two users hit the layout in the same Node process. The lesson names the bug at the import.
- The `useRef`-pinned store is mandatory. `useState(() => createWizardStore())` would technically also work for the initial render, but strict-mode double-invoke can create two stores; the documented pattern is `useRef` with lazy init.
- `<WizardStoreProvider>` on the shared layout, not on step pages. Misplacing it under a step page wipes state every navigation — exercised as `PROVIDER_ON_STEP_PAGE` in 16.4.6.
- `reset: () => set(initialState, true)` — the rare replace-mode flag. `set({}, true)` would wipe action methods; `set(initialState)` without `true` would partial-merge to the same result for now but future-proof against new slice fields requires the `true`. The choice is pedagogical clarity.
- The slice composition `((...a) => ({ ...createA(...a), ...createB(...a) }))` is the standard `StateCreator` spread. `[]`-`[]`-`Slice` middleware generics are empty tuples — this chapter uses no middlewares. When `persist` / `devtools` enter, the generics fill out.
- The hook's `if (store === null) throw` is the runtime contract that catches the most common usage bug — using the hook outside the provider. The error message names the fix.
- Fields stay unwired after this lesson — that's the deliberate runnable midpoint. The wizard renders, the provider holds the store, the progress indicator reads from it.

Codebase state at entry: empty `wizard/` directory, empty layout providers, unwired fields, Next-gate permanently disabled.
Codebase state at exit: `types.ts`, four slice files, `store.ts`, `store-provider.tsx`, `use-wizard-store.ts` filled. `<WizardStoreProvider>` wraps the wizard layout. Progress indicator reads `currentStep`. Wizard navigates between the four routes but fields are empty and Next is disabled. **Runnable — provider mounts on shared layout, store survives navigation, snapshot panel mirrors live state.**

Estimated student time: 60 to 75 minutes. The chapter's heaviest mechanics lesson.

---

## Lesson 16.4.4 — Form wiring, atomic selectors, and the Next-gate

Goals:

- Wire `step-1/page.tsx` field by field. Each field is one input bound through one atomic selector: `const firstName = useWizardStore((s) => s.contact.firstName); const setContactField = useWizardStore((s) => s.setContactField); <Input value={firstName} onChange={(e) => setContactField('firstName', e.target.value)} />`. Repeat for `lastName`, `email`, `phone`. Atomic selectors are the load-bearing default — typing in email re-renders only the email input. The re-render counter panel verifies this.
- Render field-level errors. Below each field: `const contactErrors = useWizardStore((s) => { const r = s.validateContact(); return r.success ? null : z.flattenError(r.error).fieldErrors })`; display `contactErrors?.email?.[0]` under the email input. The selector returns a new object only when the error map's shape changes; default `Object.is` re-renders the component on those transitions, adequate for this surface. For finer control (per-field error subscription), one selector per field's error would be the move — name once, skip.
- Repeat for `step-2/page.tsx` (billing fields, `validateBilling`, `setBillingField`; `paymentTerms` is a select; `country` a 2-letter input) and `step-3/page.tsx` (`defaultCurrency` and `language` selects; `channels` three checkbox toggles bound to `togglePreferenceChannel`).
- Wire `footer.tsx`: `const currentStep = useWizardStore((s) => s.currentStep)`. `isValid` selector branches on `currentStep` and returns the per-step `validate...().success` boolean. `goNext` and `goBack` action selectors. Next button: `<Button disabled={!isValid} onClick={() => { goNext(); router.push(\`/customers/new/step-${currentStep + 1}\`) }}>`. Back button: `<Button onClick={() => { goBack(); router.back() }}>`. On step 4 the Next button is replaced by the submit button rendered by the step-4 page; footer's Next only shows when `currentStep < 4`.
- Run the app: navigate to step 1. Type firstName; Next stays disabled while other fields are empty. Re-render counter shows only the firstName counter incrementing — neighbors flat. Invalid email → inline error, Next disabled. Fix the email; Next enables. Fill remaining; click Next. URL advances to step 2; `currentStep: 2`; progress pip updates. Click Back; URL returns to step 1; inputs show prior values (store survived because the provider is on the shared layout). Forward again; step 2 empty (slice untouched). Fill, advance, fill, advance — step 4 renders the review stub.

Senior calls and watch-outs:

- Atomic selectors are mandatory for re-render scoping. A naive `const { firstName, lastName, email, phone, setContactField } = useWizardStore((s) => ({ ...s.contact, setContactField: s.setContactField }))` returns a new object every state change; default `Object.is` fails; the component re-renders on every keystroke. The re-render counter panel is the demo. For composite reads (the review step), `useShallow` is the right tool — see 16.4.5.
- The Next-gate's `isValid` selector calls `validate...()` on every store change. The function returns a fresh `SafeParseResult` each time, but the selector returns the `success` boolean primitive — `Object.is(true, true)` short-circuits. The button re-renders only when the boolean flips. Senior call: derive a primitive from the complex computation inside the selector.
- Next-gate validation is UX; the action's parse is the contract. A bypass call to the action with malformed data returns `{ ok: false }`; client-side gate is defense against UX confusion, not against malformed data. Same shape as every Server Action in the course.
- The Next button's `onClick` bundles store action `goNext` + `router.push`. Splitting via `useEffect` watching `currentStep` would be wrong — effects-as-side-effect-orchestrators is rejected (5.5 / Principle #6 — explicit over magic).
- `validate...()` runs `safeParse` on every store change. Cheap for tiny schemas; for very large schemas, debouncing/memoizing would be a future move. Don't pre-optimize.
- Errors are short red text under the field, no toast — UX baseline from Unit 4.
- Resist per-field `validateField` for finer error scoping. Whole-slice `validateContact` is the right shape; per-field "touched" state machines complicate the model.
- `markStepComplete` called inside `goNext` populates `completedSteps`; the progress indicator uses it to distinguish completed pips.

Codebase state at entry: provider mounted, store works, no form wired, Next-gate permanently disabled.
Codebase state at exit: every input on steps 1-3 writes into its slice via atomic selectors; field-level errors render inline from each slice's `validate...()`; the Next-gate enables only when the current slice is valid; clicking Next advances both store and URL; Back returns and the prior step's data is intact. **Runnable — the wizard navigates with state across all four routes; step 4's review is still a stub; no submit yet.**

Estimated student time: 50 to 65 minutes.

---

## Lesson 16.4.5 — Review, submit action, success-reset, and the double-submit guard

Goals:

- Fill `actions.ts`: `createCustomerAction = authedAction({ role: 'member', schema: createCustomerInput, fn })`. Inside `fn`, `tenantDb(ctx.orgId).transaction`: map the four-slice payload to the row shape (concatenate name; spread billing + preferences directly because the column names match), insert and `returning()`, `writeAuditLog(tx, { event: 'customer.created', subjectId: row.id })`. Return `{ ok: true, data: { id } }`. Zod parse failure or DB error returns `{ ok: false, error }` via the wrapper. The action does **not** know about the store; the store does not import the action; the form's submit button is the seam.
- Wire `step-4/page.tsx`: the review reads the three preceding slices via `useShallow` because the rendered output combines three slice objects in one component's JSX. `import { useShallow } from 'zustand/react/shallow'; const { contact, billing, preferences } = useWizardStore(useShallow((s) => ({ contact: s.contact, billing: s.billing, preferences: s.preferences })))`. Render three `<dl>` subsections. Mount `<SubmitButton />` below. This is the **only** use of `useShallow` in the project; every other surface uses atomic selectors. The reason: the review genuinely reads three slice objects and returns one new object each render; on step 4 the user isn't typing, re-render cost is irrelevant; this is the correct idiomatic shape for the mapped-pick read.
- Fill `step-4/submit-button.tsx`. `'use client'`. Read the three slices via `useShallow`, the `reset` action, and `router` from `next/navigation`. `const [isPending, startTransition] = useTransition(); const [error, setError] = useState<string | null>(null); const onSubmit = () => startTransition(async () => { setError(null); const r = await createCustomerAction({ contact, billing, preferences }); if (!r.ok) { setError(r.error.message); return } reset(); router.push(\`/customers/${r.data.id}\`) })`. Button `disabled={isPending}`, label flips to "Creating…". The `isPending` guard prevents double-submit — the second click during the in-flight transition finds the button disabled.
- The submit boundary is a Server Action call, not a `<form action>` with `useActionState`. The alternative-rejected note, plainly:
  - **The chosen path:** explicit button-handler calling the action programmatically. Right for this surface because the data already lives in the store (read via `useShallow`) and the post-success path is store-reset + router-push (not the redirect-and-revalidate pattern `useActionState` is built for).
  - **The alternative considered and rejected:** `<form action={createCustomerAction}>` with `useActionState`. Progressive-enhancement-friendly but the payload would need `FormData` encoding — hidden inputs per field, JSON serialized — ceremony with no upside when the data is already parsed in memory. Reach for `<form action>` when the data is in form fields the user just typed.
- Wire the success-reset + redirect: `reset()` first, then `router.push(\`/customers/${r.data.id}\`)`. Order matters as a discipline — in surfaces where the layout stays mounted across the navigation (a cart in a header), reset-first is required. Here the wizard layout unmounts on the navigation anyway; reset-first is belt-and-suspenders but the discipline is the named senior call.
- Run the app: complete the four steps with valid data. Step 4 review shows the three filled slices. Click Create customer → button shows "Creating…" ~100 ms → router pushes to `/customers/[newId]` → customer detail page renders. Back to `/customers/new/step-1` → form is empty (success-reset fired). Audit-log tail shows the new row.
- Verify the action-failure path: toggle "Force action failure" → submit → error banner; wizard intact on step 4; navigating back shows fields populated.
- Verify the double-submit guard: "Force double-submit" → one POST, one audit row.

Senior calls and watch-outs:

- Action is org-scoped via `authedAction`; store knows nothing about `orgId`. Tenancy lives at the action, the table's `organizationId`, and `tenantDb`. Defense in depth.
- Store-action separation is the architectural seam. Store owns draft on the client; action owns the database write on the server; submit button is the only place they meet. Principle #3 applied to the client/server split.
- `useShallow` is the right tool **only** for this composite read. Senior reflex: fresh-literal selectors → `useShallow`; primitive or existing-reference selectors → default `Object.is` is fine. Reaching for `useShallow` everywhere is over-reach.
- `useTransition` `isPending` is the right pending shape for a Server Action call — canonical pattern for actions that will redirect. Plain `useState<boolean>` works but loses the transition's automatic suspension/concurrency benefits.
- Action failure leaves the wizard intact deliberately. A common bug is `if (!result.ok) { reset(); setError(...) }` — wiping the user's draft on a network blip. The verify recipe catches it.
- The `error` state is local `useState`, not in the store. Transient UI error state belongs in component state — wizard store is for draft data the user owns.
- Idempotency keys (Unit 12) are not used here — customer-create is naturally idempotent at the application layer because the form is one user, one transition, one submit (the `isPending` guard). The `processed_events` pattern lands when external retries are the trigger (webhooks, queued jobs).
- Resist writing the new customer's id into the wizard store after creation — that's server state; the redirect is how the client transitions from draft to canonical. Storing the id would mean the wizard store knows about post-submit results — role creep the per-feature discipline rejects.

Codebase state at entry: steps 1-3 wired, Next-gate works, step 4 stub, no submit, no action.
Codebase state at exit: `createCustomerAction` writes row + audit log + returns the canonical Result. Step 4 reviews via `useShallow`. Submit button uses `useTransition` for pending + double-submit guard, calls the action, on success resets + redirects, on failure shows the banner with the draft intact. **Runnable — happy and unhappy paths live; ready for verify.**

Estimated student time: 50 to 65 minutes.

---

## Lesson 16.4.6 — Verify

Goals:

- Walk every "Done when" clause from the framing's verify recipe in order.
- **Back/forward preserves:** fill step 1, advance, fill step 2, Back. Step 1 intact. Use browser back too. Snapshot panel shows both slices populated. Provider on shared layout is the structural reason.
- **Refresh loses (the senior call):** fill steps 1-2, advance to step 3. "Refresh wizard" → reloads at step 1 empty. No `persist` in `store.ts`. Compare to hypothetical: wrap factory in `persist((set, get) => ({...}), { name: 'wizard-v1', storage: createJSONStorage(() => sessionStorage) })`; refresh resumes mid-flow. Revert — the product call is refresh-loses.
- **Submit fires with composite payload:** complete steps; submit; one POST; `{ ok: true, data: { id } }`; router pushes; audit-log row appears.
- **Success-reset fires after submit-success only:** navigate to step 1 after redirect → empty. Deliberately remove `reset()` from success branch → previous customer's data appears on revisit. Revert.
- **Action failure does not wipe the draft:** Force failure toggle → submit → error banner; wizard on step 4 with fields intact; navigating back shows step 1 populated. Deliberately add `reset()` to error branch → wizard wipes. Revert. The anti-pattern is the bug to recognize.
- **Double-submit:** Force double-submit → one POST, one audit row. `useTransition`'s `isPending` is the guard.
- **Next-gate per-step:** empty step 1 → disabled. Valid email but firstName empty → still disabled. All valid → enables. Invalid phone → disables with inline error.
- **Atomic selectors keep re-renders surgical:** type ten chars in firstName → firstName counter +10, others +0, footer +1, progress +0. Deliberately switch selector to `(s) => s.contact` → all four field counters +10. Revert. The atomic-selector discipline is the perf payoff.
- **`useShallow` reserved for review:** grep → one hit in `step-4/page.tsx`. Deliberately replace with three atomic selectors and remove `useShallow` → still renders correctly. The rule: `useShallow` when the read is a composite mapped-pick; atomic is fine here too, this is the more idiomatic shape.
- **Per-request store does not leak:** session A fills step 1; switch to session B; step 1 empty. Flip `STORE_MODULE_SCOPED` → session B sees session A's draft (module-level instance shared across requests). Flip back. The bug justifies the rule.
- **Provider on shared layout:** read `layout.tsx`. Flip `PROVIDER_ON_STEP_PAGE` → each navigation re-mounts provider, wipes state. Flip back. Shared-layout placement is the structural fix.
- **Same Zod schema parses at gate and action:** `validateContact` → `contactSchema.safeParse`; action → `createCustomerInput` embeds `contactSchema`. Bypass action with malformed payload → `{ ok: false, error: { code: 'invalid_input' } }`; audit-log unchanged.
- **Zustand scoped to the wizard surface:** grep `useWizardStore`, `WizardStoreProvider`, `wizard/store` → only `src/lib/wizard/` and `app/(app)/customers/new/`. Per-feature, never global.
- **No Server Component imports the store:** grep imports → only `'use client'` files. The action imports `schemas.ts`, never the store. The layout (a Server Component) imports only the provider component — fine because importing a Client Component into a Server Component is the standard composition.
- **Audit-log in the action's transaction:** force unique-constraint violation (seeded email) → action returns `{ ok: false }`, audit-log unchanged (transaction rolled back).
- **Tenancy at the action:** submit in session A (org X) → new customer in org X's list only. `authedAction` + `tenantDb` do their job.
- Senior calls one more time:
  - Scope the library to the leaf that meets the threshold; the rest of the app stays Server-Component / Server-Action.
  - `createStore` from `zustand/vanilla` so each provider mount is fresh — per-request.
  - Provider on the shared layout, never on step pages.
  - Atomic selectors by default; `useShallow` reserved for composite mapped picks.
  - Zod schema is the contract — same parse at client gate and server action.
  - Store owns the draft; action owns the database write; submit button is the seam.
  - Success-reset after submit-success; action-failure leaves the draft intact.
  - Refresh-loses is the explicit product call.
  - `useTransition` `isPending` prevents double-submit.
- Forward references:
  - Chapter 17.1 — error discipline at the seams; the action-failure rendering is an audited finding.
  - Chapter 17.3 — security baseline audit; tenancy at the action is an audited finding.
  - Unit 14.1 — notifications dispatcher; a "customer created" notification routes through the dispatcher after the audit-log write.
  - Unit 19.4 — component tests for the wizard; Next-gate transitions and submit pending/error states are mechanical against a mocked action.
  - Chapter 10.1 — active-org-switch action; production should call wizard `reset()` from inside the org-switch flow (forward pointer, not implemented here).
  - Unit 20.1 — structured logs; the `customer.created` audit-log entry is the operator-truth side, the in-app notification (Unit 14) is the user-facing side.

Senior calls and watch-outs:

- Verify rehearses every failure mode the chapter exists to prevent. If a verification fails, point at the owning build lesson.
- Deliberate failure demos (remove `reset()` from success, add `reset()` to error, flip `STORE_MODULE_SCOPED`, flip `PROVIDER_ON_STEP_PAGE`, wrap factory in `persist`, replace atomic with slice-object selector) must run as named single-flag changes — flipping multiples muddies the diagnosis. Verify in isolation, then revert.
- The org-switch reset is a forward pointer, not implemented here. The active-org-switch action lives in 10.1; the reset hook is a single line — name where it goes, don't reach in.
- Refresh-loses is the load-bearing product decision. The chapter does not turn this into a flag — anything that must survive refresh forces a server-side draft table, garbage collection, surfacing-on-return UX, tenancy on drafts. The senior call is to accept refresh-loses and call out the cost of the alternative.

Codebase state at entry: full wizard + submit + success-reset + double-submit guard wired.
Codebase state at exit: every "Done when" clause verified; the student can articulate every primitive and which forward unit will lean on it.

Estimated student time: 30 to 45 minutes.

# Lesson 2 outline — Primitives and the per-request provider

- **Title (h1):** Primitives and the per-request provider
- **Sidebar label:** Primitives and the provider

---

## Lesson framing

This is the **mechanics-plus-wiring lesson**. Lesson 1 settled the *threshold* (the decision funnel, the three triggers, the per-feature rule) and introduced *zero* API. This lesson is the API tour plus the App Router setup: by the end the student can write a typed, sliced Zustand store and wire it into a Next.js 16 App Router SaaS without leaking one request's state into the next response. Chapter 079 builds the wizard for real and needs every primitive shown here before it can start, so primitives and wiring belong in one place.

**The load-bearing idea — and the lesson's emotional center — is the per-request leak**, the exact same shape the student already met for the TanStack `QueryClient` (ch076 L3), with a *different* fix. A module-scoped `create(...)` store is invisible on a single-user toy app; on a multi-tenant SaaS that runs SSR it is a **data-isolation bug** — request B renders with request A's wizard draft. Anchor hard on that recognition: the student already owns "server module scope is shared across every request"; only the fix differs (TanStack branches on `isServer` inside one helper; Zustand uses a per-request *provider* that pins a fresh store with `useRef`). Frame it in production stakes, not as a style nit.

**The mental model the student must leave with:** a Zustand store is a tiny function-call subscription primitive (`getState`/`setState`/`subscribe`) that lives *outside* React; the React binding is just a `useStore(store, selector)` hook that re-renders the caller only when the *selected slice* changes. On App Router you never let that store be module-scoped on the server — you create it per request in a `'use client'` provider and read it through a typed hook. Three files carry the whole pattern: the vanilla **store factory**, the **provider**, the **typed hook**.

**Two threads to keep visible the whole way:**
1. *Selectors are the contract.* Every call site subscribes to the slice it renders or the action it calls — never the whole store. This is the L1 `selector` term made literal; it is also the re-render mechanism that justified trigger 3.
2. *`create` is fine for non-SSR React; `createStore` + provider is the App Router default.* Name the split once and never waver — the leak is why.

**Pedagogical shape.** This is the chapter's heaviest lesson; manage cognitive load by **building the simplest store first, then layering.** Order: (1) the store as a primitive (one tiny counter store, `create`, to anchor `set`/`get`/selector with the *least* ceremony), (2) the `create` vs `createStore` split and *why SSR forces the provider* (the leak, in production terms), (3) the three-file provider pattern, (4) slices + `StateCreator` typing, (5) selectors + `useShallow`, (6) reset discipline, (7) the middleware lineup named once. Lead every file with the decision it encodes. The student has the *justification* from L1; here they need the *plumbing* and the *why* behind each piece. Reference L1's `selector` term and per-feature rule as known; do not re-argue the threshold.

**Canonical file-layout decision (resolves a chapter-outline / Code-conventions tension).** The chapter outline drafts the store at `/lib/wizard/store.ts`. Code conventions forbid **React imports in `lib/`** (§File layout) — and the provider and hook both use React. So the React-touching files cannot live in `lib/`. The wizard is one feature on one route subtree, so co-locate the whole store under the route's private folder, mirroring the TanStack precedent (provider in `_components`, helpers in `_lib`/`lib`):

- `src/app/(app)/customers/new/_lib/wizard/wizard-types.ts` — the slice types + composed `WizardStore` type (no React, pure types).
- `src/app/(app)/customers/new/_lib/wizard/contact-slice.ts` — one slice factory (others mirror it). Pure, no React.
- `src/app/(app)/customers/new/_lib/wizard/store.ts` — the `createWizardStore(initialState)` factory using `createStore` from `zustand/vanilla`. Type-only React-adjacent import (`StateCreator`); no runtime React.
- `src/app/(app)/customers/new/_components/wizard-store-provider.tsx` — `'use client'`, `createContext` + `useRef`-pinned store.
- `src/app/(app)/customers/new/_components/use-wizard-store.ts` — the typed `useWizardStore<T>(selector)` hook (`'use client'`-adjacent; it imports React hooks and `useStore`).

Record this as the canonical placement for L3 and chapter 079. In *prose* keep paths readable (e.g. "the wizard store at `customers/new/_lib/wizard/store.ts`"). Flag for downstream agents: this is a **deliberate divergence from the chapter outline's `/lib/wizard/` shorthand**, forced by the no-React-in-`lib/` rule; the chapter-outline path was shorthand, not a contract.

---

## Lesson sections

### Introduction (no header)

Open on the handoff from L1, concretely: "Last lesson settled *when* a SaaS feature earns a Zustand store — genuinely shared client state across disjoint or cross-route trees, with selectors keeping re-renders surgical. This lesson is the *how*: the v5 API a senior actually writes, and the one App Router wiring step that, skipped, turns the library into a multi-tenant data leak." State the senior question implicitly: *once the threshold is crossed, what's the minimal API surface, and how do you wire the store into the App Router so one request's state never bleeds into the next?* Preview the spine in one sentence — store-as-primitive, the `create`/`createStore` split, the three-file per-request provider, slices, selectors — and name that the per-request rule is the one that gates correctness. Warm, brief, ~4 sentences.

### Install

- Terminal: `pnpm add zustand`. One `Code` block, bash. Name v5 as the May 2026 baseline in one clause; no version table.

### The store is a subscription primitive

The anchor. Build the *simplest possible* store first, so `set`/`get`/selector land with zero ceremony before any SSR or slices complexity.

- **What a store is, plainly.** A Zustand store holds a state object and exposes `getState()`, `setState()`, `subscribe()`. There are no reducers, no action types, no dispatcher — the state and the actions that mutate it live in one closure. React reads it through a `useStore`-style hook that re-renders the calling component **only when the selected slice changes**. This is the whole model; everything else is typing and wiring.
- **The smallest store.** Show a 6-line counter with `create` (the React-bound form) so the primitive is visible without the provider. A `Code` block (tsx):
  ```ts
  import { create } from 'zustand';

  const useCounterStore = create<{ count: number; inc: () => void; reset: () => void }>()((set) => ({
    count: 0,
    inc: () => set((state) => ({ count: state.count + 1 })),
    reset: () => set({ count: 0 }),
  }));
  ```
  Use this *only* to teach the primitive; flag in one sentence that `create` is the form for a non-SSR React app and the next section replaces it for App Router. (Avoids the student bonding to `create` then being told it's wrong with no reason.)
- **The `set`/`get` API.** Cover precisely:
  - `set((state) => ({ count: state.count + 1 }))` — functional update, derive from current state.
  - `set({ count: 5 })` — absolute write, partial merge into existing state (Zustand shallow-merges top-level by default).
  - `set(partial, true)` — the rare **replace** flag wipes the whole state object; almost never what you want (it's the L1/L3 reset-the-right-way watch-out; name it here, use it only in `reset`-to-`initialState` later). Note in one clause: v5 type-checks this — `set({}, true)` with an *incomplete* object is now a compile error (v5 requires a complete state when `replace: true`), so the typechecker enforces "replace means a full `initialState`."
  - `get()` — the inside-the-store read, used when an action derives from current values: `addItem: (item) => { if (get().items.some(i => i.id === item.id)) return; set((s) => ({ items: [...s.items, item] })); }`. Show this canonical action shape: each action is a method on the state object, colocated with the values it touches.
- **The selector, named as the contract (forward to its own section).** Read with `useCounterStore((s) => s.count)`; this subscribes to `count` only. One sentence: this is the L1 *selector* made literal — the dedicated section below covers why selecting the whole store defeats the model.
- **Component to teach this:** a small `AnnotatedCode` (blue, `maxLines` ~10) walking the counter store — step 1 the `create<...>()` typed call, step 2 the `set` functional update, step 3 the `set` absolute write, step 4 the selector read at the call site. Keep each step ≤ 6 lines of prose.
- **Tooltip terms:** `set` (the store's state-update function, passed into the creator), `get` (reads current store state from inside an action).

### `create` vs `createStore` — why SSR forces a provider

The heart of the lesson. Build the model in stages, lead with the *failure*, not the fix — same rhythm that worked for the TanStack leak.

- **Stage 1 — name the bug in production terms.** `create<...>(...)` returns a React-bound hook backed by a **module-scoped** store instance. On the server, module scope is shared across every request the process serves. So a module-scoped wizard store means request B's render can read request A's draft — name, email, billing address. Frame it explicitly: on a multi-tenant SaaS that runs SSR this is a **data-isolation bug**, the same class of failure as the module-scoped `QueryClient` from ch076 L3 — *recognize it, don't meet it new.* This is why the rule exists; it is not a performance tweak.
- **Stage 2 — the v5 split that fixes it.** v5 ships two entry points:
  - `create` (from `zustand`) → a ready-to-use React hook **bound to one module-scoped store**. Correct for a non-SSR React SPA where there's one user per process anyway.
  - `createStore` (from `zustand/vanilla`) → a **vanilla store** (`getState`/`setState`/`subscribe`, no React) that *you* wrap in React Context and read with the generic `useStore` hook from `zustand`.
  The App Router rule, stated once and never waivered: **`createStore` + a per-request provider.** The provider creates a *new* store per request, so SSR can't share one tenant's store across responses. Show both forms side by side, name the rule.
- **The contrast, made unmissable.** `CodeVariants` (two tabs), `maxLines` ~8 — *Leaks across requests* vs *Per-request*. Tab A (`del`, red marks): `export const useWizardStore = create<WizardState>()(...)` at module top — prose first sentence "One store for the whole server process — tenant A's draft renders in tenant B's request." Tab B (`ins`, green marks): the `createWizardStore()` factory + `<WizardStoreProvider>` shape — prose "A fresh store per request, pinned for the browser session — no cross-request bleed." This A/B is the single most important takeaway; the component exists to burn it in. Tie back in one clause to ch076 L3's identical Leaks/Per-request A/B so the student sees the *pattern*, not a one-off.
- **Diagram — the cross-request leak, two requests sharing one box.** A small `<Figure>` with hand-authored HTML/CSS (per the diagrams index: sequential/box concept → HTML+CSS). Layout: a single "Server process — module scope" box in the center holding one "wizard store" instance; two request lanes ("Request A — tenant Acme", "Request B — tenant Globex") both arrowing into the *same* store box, with A's write ("email: ada@acme") visibly readable by B's render. Pedagogical goal: make "one box, many requests" concrete so the leak is spatial, not abstract. Keep it static, well under the height cap. (`ArrowDiagram` is the fallback if leader lines read better; set `expandable={false}` per its constraint.)
- **Tooltip terms:** `createStore` (Zustand's vanilla store factory from `zustand/vanilla` — no React binding), `module scope` (top-level module state, shared across every request a server process handles).

### The three-file per-request provider

The canonical App Router pattern. Present it as three small files, each with its one job; this is the project's wiring center of gravity.

- **The shape, stated first.** Three files: the **factory** (`createWizardStore(initialState)` using `createStore`), the **provider** (`'use client'`, `createContext` + `useRef`-pinned store), the **typed hook** (`useWizardStore<T>(selector)` that reads the store from context and calls `useStore(store, selector)`). One sentence on each before the code.
- **File 1 — the factory.** `Code` (ts) for `customers/new/_lib/wizard/store.ts`. `createWizardStore` takes an optional `initialState`, returns `createStore<WizardStore>()((set, get) => ({ ...initial, ...actions }))`. Keep it minimal here (full slice composition is the next section); show the factory *signature* and that it returns a vanilla store. Note: this file has **no runtime React** — only a type-only `StateCreator`/`WizardStore` import — so it's allowed to sit beside the route even though it's not `'use client'`.
- **File 2 — the provider.** `AnnotatedCode` (blue) for `customers/new/_components/wizard-store-provider.tsx`. The block (tsx):
  ```tsx
  'use client';
  import { createContext, useRef, type ReactNode } from 'react';
  import { createWizardStore, type WizardStore } from '../_lib/wizard/store';

  export const WizardStoreContext = createContext<WizardStore | null>(null);

  export function WizardStoreProvider({ children }: { children: ReactNode }) {
    const storeRef = useRef<WizardStore | null>(null);
    if (storeRef.current === null) {
      storeRef.current = createWizardStore();
    }
    return (
      <WizardStoreContext.Provider value={storeRef.current}>
        {children}
      </WizardStoreContext.Provider>
    );
  }
  ```
  Steps (one each, blue): (1) `'use client'` — context and refs only exist in Client Components; without it you get the canonical `createContext is not a function` build error (state it here as the single most common setup mistake). (2) `createContext<WizardStore | null>(null)` — the channel that carries *this request's* store down the tree. (3) `useRef<WizardStore | null>(null)` + `if (storeRef.current === null)` — create the store **exactly once per component instance** (React 19 requires the explicit `null` arg; the `=== null` check is the React-Compiler-safe form the official docs now use). (4) provider wraps `children`, value is the pinned store.
- **Why `useRef`, not a module const — and not `useState`.** Two sentences: a module-scoped `const wizardStore = createStore(...)` is the *exact leak* from the prior section; `useRef` creates the store once per *component instance* (one per request on the server, one per session in the browser). Note in one clause that `const [store] = useState(() => createWizardStore())` (lazy initializer) is the equivalent form in the official guide — both create exactly once; this course uses `useRef` with the Compiler-safe `=== null` guard. (This reconciles the official-docs `useState` example with the chapter outline's `useRef` insistence — name both, pick one, move on.)
- **File 3 — the typed hook.** `AnnotatedCode` (blue) for `customers/new/_components/use-wizard-store.ts`. The block (tsx):
  ```ts
  import { useContext } from 'react';
  import { useStore } from 'zustand';
  import { WizardStoreContext } from './wizard-store-provider';
  import type { WizardState } from '../_lib/wizard/wizard-types';

  export function useWizardStore<T>(selector: (state: WizardState) => T): T {
    const store = useContext(WizardStoreContext);
    if (store === null) {
      throw new Error('useWizardStore must be used within a WizardStoreProvider');
    }
    return useStore(store, selector);
  }
  ```
  Steps: (1) read the store from context — this is *this request's* instance. (2) the `null` guard throws a clear error if a consumer renders outside the provider (the senior touch — a readable failure beats `undefined.getState()`). (3) `useStore(store, selector)` from `zustand` — the generic hook that binds a vanilla store to React and subscribes only to the selected slice.
- **Where the provider mounts — the load-bearing placement.** The provider goes on the **shared route-segment layout** that wraps the four wizard steps (`customers/new/layout.tsx`), *not* on each step page. One sentence on why: the layout persists across the four step navigations, so the store (held in `useRef`) survives back/forward between steps; mounting per-page would reset the store on every navigation — the canonical mistake (L3 drills it on the concrete screen). Note the divergence from the official guide's "mount in root layout": app-wide stores mount at root, *feature-scoped* stores mount on the feature's segment layout — exactly the L1 per-feature rule made structural. Tiny `Code` (tsx) of `customers/new/layout.tsx` wrapping `{children}` in `<WizardStoreProvider>`.
- **`<FileTree>` of the three (well, five) files** so the boundary placement reads visually — which file is `'use client'`, which is pure, where the provider sits relative to the step pages. Bold the provider + hook (the `'use client'` boundary).
- **Tooltip terms:** `useStore` (Zustand's generic React hook — binds a vanilla store to a component via a selector), `createContext` (React API that creates a provider/consumer channel; only runs in Client Components).

### Composing the store with slices

Now layer the real shape: multiple feature areas in one store via the slices pattern, with the load-bearing `StateCreator` typing.

- **Why slices.** A four-area wizard (contact, billing, preferences, meta) in one flat creator becomes an unreadable wall. A *slice* is a self-contained factory for one area; the store composes them. The senior win: each slice is its own file with a narrow type surface, the store assembly is a thin composition file, and adding an area is adding a file — not editing a god-object.
- **The slice factory + the `StateCreator` generic — the load-bearing TS move.** A slice is `StateCreator<WizardStore, [], [], ContactSlice>`. `AnnotatedCode` (blue) for `contact-slice.ts`:
  ```ts
  import type { StateCreator } from 'zustand';
  import type { WizardStore } from './wizard-types';

  export interface ContactSlice {
    contact: { firstName: string; email: string; phone: string };
    setContactField: <K extends keyof ContactSlice['contact']>(key: K, value: string) => void;
  }

  export const createContactSlice: StateCreator<WizardStore, [], [], ContactSlice> = (set) => ({
    contact: { firstName: '', email: '', phone: '' },
    setContactField: (key, value) =>
      set((state) => ({ contact: { ...state.contact, [key]: value } })),
  });
  ```
  Steps: (1) `ContactSlice` is this area's shape — values + actions. (2) `StateCreator<WizardStore, [], [], ContactSlice>` — the four generics; explain only the two that matter: **first** = the *full* store type (so `set`/`get` see every slice, not just this one), **fourth** = what *this* slice returns. The two middle `[]` are the middleware mutator tuples — empty here, named once. (3) the setter spreads its own sub-object so unrelated slices aren't touched. **Emphasize:** every slices tutorial that skips the `StateCreator` generic ends in `any` later — typing it once per slice is the whole point. (Continuity: L1 promised the slices pattern lands in L2.)
- **Composing the slices in the factory.** Update `store.ts` to compose: `createStore<WizardStore>()((...a) => ({ ...createContactSlice(...a), ...createBillingSlice(...a), ...createPreferencesSlice(...a), ...createMetaSlice(...a), reset: () => set(initialWizardState, true) }))`. `Code` (ts), ~10 lines. Spell out the spread-of-creators move and the `(...a)` forwarding (each slice receives the same `set`/`get`/`store` triple). Note `WizardStore = ContactSlice & BillingSlice & PreferencesSlice & MetaSlice` is the single source-of-truth type composed from slice types — show the one-line `wizard-types.ts` intersection.
- **The type flow, stated as a rule.** One `WizardState` (the data) / `WizardStore` (data + actions) type, composed by intersection from the slice interfaces; each slice's `StateCreator` is parameterized on the *full* store so `set`/`get` are correctly typed everywhere. The lesson shows the four-line type setup; chapter 079 applies it across all four slices.
- **Component note:** prefer `AnnotatedCode` for the one slice (focus on the `StateCreator` generic) and a plain `Code` for the composition file (the move is the spread, read as one unit). Do **not** print all four slices — one slice + the composition is the teaching set; L3/ch079 carry the full four.
- **Tooltip terms:** `StateCreator` (Zustand's type for a store/slice initializer; its generics wire `set`/`get` to the full store), `slice` (a self-contained factory for one feature area of a store, composed into the whole).

### Selectors — the subscription contract

The re-render model made literal. This is where trigger 3 from L1 pays off and where the most common performance footgun lives.

- **The contract.** A component calls `useWizardStore((s) => s.contact.email)` and re-renders **only** when `contact.email` changes — a write to `billing.taxId` doesn't touch it. Selecting the whole store (`useWizardStore((s) => s)`) subscribes to *every* change and re-renders on all of them — it defeats the entire model. State the rule: **subscribe to the slice you render, never the whole store.**
- **The `RenderTracking` widget — the selector asymmetry, shown not told.** This is the lesson's primary interactive figure (the component is purpose-built for Unit 16 Zustand selectors). Tree: `WizardLayout` → `ProgressHeader`, `ContactStep`, `NextButton` (3 consumers). Two `<Implementation>` tabs:
  - `useWizardStore(s => ({ step, contact, valid }))` (whole-ish slice, fresh object each call): each trigger (`set contact.email`, `set billing.taxId`, `set currentStep`) re-renders **all three** consumers.
  - `useWizardStore(s => s.contact.email)` per field (atomic): `set contact.email` re-renders **only** `ContactStep`; `set currentStep` re-renders only `ProgressHeader`/`NextButton`.
  Pedagogical goal: make "selector scope = re-render scope" something the student *watches the badges prove*, not a paragraph they take on faith. Ties back to L1's RenderTracking Context-vs-Zustand demo — same widget, now showing Zustand's *win*. (Don't wrap in `<Figure>`; it brings its own card.)
- **Named selectors in their own file.** The senior pattern: a `selectors.ts` beside the store exporting named selectors (`selectContactEmail = (s: WizardState) => s.contact.email`) so call sites stay terse and the selector logic is reusable and testable. Small `Code` (ts) of two or three named selectors. For *derived* values combining slices, the selector is a plain function; React re-runs it on every state change but only re-renders if the **returned value** changes (referential equality by default — the bridge into `useShallow`).
- **`useShallow` and the equality trap.** Default selector equality is `Object.is`. Returning a *new* object/array each call — `useWizardStore((s) => ({ a: s.a, b: s.b }))` — re-renders on every state change because the literal is a fresh reference every time. `CodeVariants` (two tabs) showing the trap and the two fixes:
  - **Trap** (`del`/red): the inline-object selector → "re-renders on every store change — the returned literal is a new reference each call."
  - **Fix A — atomic selectors** (`ins`/green): `const a = useWizardStore(s => s.a); const b = useWizardStore(s => s.b);` → "two subscriptions, each `Object.is`-stable."
  - **Fix B — `useShallow`** (`ins`/green): `import { useShallow } from 'zustand/react/shallow';` then `useWizardStore(useShallow((s) => ({ a: s.a, b: s.b })))` → "one subscription, shallow-compared." (`useShallow` is a third tab or a second variant block.)
  State the senior default: **separate atomic selectors for two or three fields; `useShallow` when the selection is a list/object mapped from a slice.** Name the import path explicitly (`zustand/react/shallow`) — it's a common miss.
- **Action access — the read/write split at the call site.** Actions are *stable* references (defined once in the creator), so selecting one is just `const setContactField = useWizardStore((s) => s.setContactField)` — no subscription cost, the function reference never changes. Establish the call-site discipline: a component selects the read slices it renders **and** the actions it calls, nothing more. Short `Code` (tsx) of a field component: one atomic read selector + one action selector + the `onChange` wiring.
- **Tooltip terms:** `useShallow` (wraps a selector to compare its result shallowly, so object/array returns don't re-render on every change), `Object.is` (JS strict-identity comparison; Zustand's default selector equality).

### Resetting at the tenancy and submit boundaries

Short but non-negotiable; the natural parallel to the TanStack `queryClient.clear()` discipline (L1 drew the parallel, here it's implemented).

- **The reset action.** Every feature store exposes `reset()` that puts state back to `initialWizardState`. Implement it with the **replace flag**: `reset: () => set(initialWizardState, true)` — full replace so no stale sub-objects survive (the `set(partial, true)` from the primitive section, finally used correctly; using `set({})` instead breaks selectors that assume slice presence — the L3 watch-out, named here, and in v5 a *compile error* since `replace: true` now requires a complete state object).
- **When to call it — three boundaries.** The store does **not** auto-reset on navigation (that would defeat cross-route persistence); *the developer* resets when product semantics demand it: after **submit-success** (so "create another" doesn't show the prior customer's data), on **sign-out**, and on **org-switch** (ch056). State the principle: a populated client store at a tenant boundary is the *same* data-isolation failure as the server leak, now triggered by a user action. This is the exact shape of the TanStack `queryClient.clear()` discipline from ch076 L3 — name the parallel so it reads as one cross-chapter pattern, not a new rule.
- **Tooltip terms:** none new (`org switch` known from ch056).

### The middleware lineup — named once, reached for rarely

Name the four middlewares the student will encounter, with the senior call on *when* each earns its place. Keep this a reference beat, not four deep dives — the wizard project uses *none* of them, and that restraint is the lesson.

- **`persist` — survive refresh, deliberately.** `persist((set) => ({ ... }), { name: 'cart-v1', storage: createJSONStorage(() => sessionStorage) })`. The senior calls: `sessionStorage` over `localStorage` for ephemeral session data (cart, or a wizard if product wants refresh-survives); **never** persist server state, auth tokens, or anything an org-switch invalidates. The trap is **hydration mismatch** — server renders empty state, client rehydrates persisted state, React complains; gate the first render on a `hasHydrated` flag (or `onRehydrateStorage`). State plainly: **the course's wizard does *not* persist — refresh-loses is the explicit product call (L3 names why)** — but the middleware lives in the surface so the student recognizes it. `Code` (ts) of the one-line `persist` wrap, plus one sentence on the hydration gate. Tie to L1's "persist only when product semantics demand it."
- **`subscribeWithSelector` — imperative subscriptions outside React.** For non-React listeners (a `useEffect` firing a side effect on a slice change, an analytics subscriber): `store.subscribe((s) => s.slice, (val, prev) => {...})`. Name it once for the analytics-on-cart-change case; the wizard doesn't need it. One sentence + a one-line snippet.
- **`devtools` — dev-only debugging.** Wraps the creator and exposes the store to the Redux DevTools extension. Gate on `process.env.NODE_ENV !== 'production'` so it doesn't ship — same discipline as the TanStack devtools (ch076 L3). One sentence; mention it's the easiest way to watch actions fire while building.
- **`combine` / `redux` — named in passing, not used.** One clause: the slices pattern already covers the composition need, so these don't earn space; mention they exist so the student isn't surprised by them in the wild. (Continuity: chapter outline says name in passing.)
- **Component note:** a compact `Code` per middleware (one line each) or a single `Aside`-framed reference list — do *not* build a worked example per middleware; the point is recognition + the senior "reach for it only when…" gate. Keep the whole section tight.
- **Tooltip terms:** `persist` (middleware that mirrors store state to storage so it survives refresh), `sessionStorage` (per-tab browser storage cleared when the tab closes — narrower than `localStorage`).

### Putting the store together — the skeleton

The synthesis: the wizard store in skeleton form, the five-file shape the chapter 079 project starts from.

- **`<FileTree>`** of the canonical layout (the five files), each with its one-line job and which carry `'use client'`:
  - `customers/new/_lib/wizard/wizard-types.ts` — slice types + composed `WizardStore`/`WizardState` (pure types).
  - `customers/new/_lib/wizard/contact-slice.ts` — one slice (others mirror it).
  - `customers/new/_lib/wizard/store.ts` — `createWizardStore` factory + `reset`.
  - `customers/new/_components/wizard-store-provider.tsx` — **`'use client'`**, context + `useRef`.
  - `customers/new/_components/use-wizard-store.ts` — the typed hook.
  Plus the mount point: `customers/new/layout.tsx` wraps children in the provider. Bold the two `'use client'` files. Pedagogical goal: the student leaves with the *file map* memorized, so chapter 079 is filling it in, not discovering it.
- **Ordering exercise — `Sequence`.** Lock the request-time order, since "how does the store reach a component without leaking" is the lesson's trickiest mental model. Steps to order (scrambled): (1) a request arrives and the wizard `layout.tsx` renders `<WizardStoreProvider>`; (2) the provider's `useRef` creates a fresh store for *this* request via `createWizardStore()`; (3) the store is placed on `WizardStoreContext`; (4) a step component calls `useWizardStore((s) => s.contact.email)`; (5) the hook reads the request's store from context and `useStore` subscribes to the `email` slice; (6) a `setContactField` call writes via `set`, re-rendering only the `email` consumer. Grading: exact order. Goal: confirm the student can reconstruct the per-request flow unaided.
- **Optional `MultipleChoice` — the leak model.** Only if the section isn't already long: "Which line leaks one tenant's wizard draft into another request's render?" with module-scoped `export const useWizardStore = create(...)` as the correct pick and the `createStore`-in-a-`useRef`-provider among distractors. Reinforces the load-bearing idea. At most one quick check here; the chapter quiz (L4) carries the rest.
- Close with a one-line forward pointer: the primitives and wiring are in place; **lesson 3** runs the full three-trigger funnel against the concrete four-step customer wizard and names every product call (back/forward preserves, refresh loses, the Server-Action submit boundary); **chapter 079** builds it file by file.

---

## Scope

**This lesson covers:** the store-as-subscription-primitive model (`getState`/`setState`/`subscribe`, `set`/`get`, the action shape); `create` vs `createStore` and *why App Router SSR forces `createStore` + a provider* (the cross-request leak in production terms); the three-file per-request provider (factory, `useRef`-pinned provider, typed hook) and its mount on the shared route-segment layout; the slices pattern with `StateCreator` typing and the composed-type rule; selectors as the subscription contract, atomic-vs-`useShallow`, named-selector files, the read/write call-site split; the `reset()` action and the three reset boundaries; the middleware lineup (`persist`, `subscribeWithSelector`, `devtools`, `combine`/`redux`) named once with the senior "reach for it only when…" gate; the five-file wizard-store skeleton.

**Explicitly out of scope (do not re-teach / reserve for later):**
- **The threshold decision** — the funnel, the three triggers, the per-feature rule, the cost ledger, the alternatives comparison (Redux/Jotai/Valtio) — all **L1**. Reference the `selector` term and per-feature rule as known; do not re-argue *when* to use Zustand.
- **The worked screen end-to-end** — the four-step customer wizard run against the funnel, the per-step Zod gates, the Server-Action submit boundary, back/forward-preserves vs refresh-loses as *product calls*, reset wired to the org-switch handler on the concrete screen — **L3**, then built file-by-file in **chapter 079**. This lesson shows the store *skeleton* and the provider *mechanics*, not the full wizard or its forms.
- **The full four-slice store** — show **one** slice (`contact`) + the composition; the billing/preferences/meta slices and their Zod schemas are **L3/ch079**.
- **Zod-per-step validation, the `validate()` action, the Next-gate** — **L3**. Mention only that actions can call into validation; don't build it.
- **TanStack Query and client-side server state** — **ch076**. Referenced *only* as the per-request-leak precedent and the `queryClient.clear()` reset parallel; do not re-teach its API.
- **Server Components reading from a Zustand store** — not a thing; Zustand is client-only by definition (hooks + context). Mention only as a watch-out if a student might try it.
- **Cross-tab sync** via `BroadcastChannel`/storage events — out of scope; don't raise.
- **The full `persist` hydration-gating UI** (a `hasHydrated` boolean wired to a skeleton) — name the trap and the one-line gate; the worked implementation isn't this lesson's job (and the wizard doesn't persist anyway).

**Prerequisites to redefine in one line each (concise, not re-taught):** *selector* (L1 — a function reading just the store slice a component needs; re-stated in one clause as the subscription contract); the **per-feature scoping rule** (L1 — one store per feature, co-located, never a global `useAppStore`); the **module-scoped `QueryClient` cross-request leak** (ch076 L3 — the anchor for the Zustand leak; one sentence: "same leak, different fix"); `queryClient.clear()` on org switch (ch076 L3 — the reset-discipline parallel); **`'use client'`** and the smallest-leaf boundary (Unit 4 / code conventions); **`_components/`/`_lib/`** co-location and the no-React-in-`lib/` rule (code conventions — justifies the file placement); **org switching / `activeOrganizationId`** (ch056 — a reset boundary); React's **`useRef`/`useContext`/`createContext`** (Unit 4 — the provider primitives; React 19's required `useRef` initial arg is the only new wrinkle).

---

## Code-conventions alignment notes (for downstream agents)

- **Store file placement is co-located under the route, NOT `lib/`.** The chapter outline's `/lib/wizard/store.ts` is shorthand; Code conventions forbid React imports in `lib/` (§File layout) and the provider+hook are React. Canonical: `customers/new/_lib/wizard/{wizard-types,contact-slice,store}.ts` (pure/type-only) + `customers/new/_components/{wizard-store-provider.tsx,use-wizard-store.ts}` (the `'use client'` boundary). This mirrors the TanStack precedent (provider in `_components`, helper outside React). **Deliberate divergence — flag it, don't "fix" it back to `lib/`.** Carry this exact layout into L3/ch079.
- **`'use client'` lives only on the provider** (and on the step components that consume the hook in L3) — never on the factory, types, slices, or the layout. Smallest-leaf boundary (§Module boundaries).
- **Filenames kebab-case** (`wizard-store-provider.tsx`, `use-wizard-store.ts`, `contact-slice.ts`). One concept per file. **No barrel files** — import the slice/selector you need.
- **`useRef<WizardStore | null>(null)` with `if (storeRef.current === null)`** — React 19 requires the explicit initial arg; `=== null` (not `!storeRef.current`) is the React-Compiler-safe form the official Zustand docs now use. Name `const [store] = useState(() => createWizardStore())` as the equivalent official alternative in one clause; the course standardizes on `useRef`.
- **`createStore` from `zustand/vanilla`; `useStore` from `zustand`; `useShallow` from `zustand/react/shallow`; `StateCreator` (type) from `zustand`.** Get the import paths exact — wrong paths are the most common copy-paste failure.
- **`reset: () => set(initialWizardState, true)`** — the replace flag, not `set({})` (which breaks slice-presence assumptions). Reset boundaries: submit-success, sign-out, org-switch.
- **Senior defaults framing matches the TanStack section** — set store-wide behavior in one place; the middleware lineup is "reach for it only when a named trigger applies," same restraint as "don't install TanStack unless one of four triggers."
- **`devtools` gated behind `process.env.NODE_ENV !== 'production'`** — same discipline as TanStack devtools (§Client server state).
- **v5 baseline** — `pnpm add zustand` (5.x current as of June 2026). No `create`-bound store in App Router code anywhere; `createStore` + provider only.

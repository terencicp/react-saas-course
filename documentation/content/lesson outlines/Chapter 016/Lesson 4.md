# Web Storage: where localStorage earns its weight

- Title (h1): `Web Storage: where localStorage earns its weight`
- Sidebar label: `Web Storage`

---

## Lesson framing

Closing lesson of Chapter 016 (Browser capability APIs) and of Unit 2.
The four prior browser-capability lessons each named a concrete *trigger before tool*; this one keeps that spine but inverts the usual order: the load-bearing idea is **where a piece of state should live**, and `localStorage` is a *leaf* of that decision, not the headline. The API itself is tiny (five methods, strings only) — the senior value is the decision tree that gates it and the two Next.js-16 hazards (SSR `ReferenceError`, hydration mismatch) that make a five-line API non-trivial in a server-rendered app.

Target student: experienced-in-another-field junior, fluent now in the platform request/page/network substrate (Ch 014–015) and the three prior Ch 016 capability APIs. Has *not* yet learned React state/hooks at depth (Unit 3, Ch 024–025 own `useState`/`useEffect`/`useSyncExternalStore`) nor SSR/Server-vs-Client at depth (Unit 4, Ch 033). So: hooks appear as **shape and reach only**, never taught as API. This matches exactly how L2 and L3 handled the same boundary — keep that calibration.

Core pedagogical decisions:

- **Lead with the decision tree, not the API.** The chapter framing is explicit that the lesson "installs the decision tree first so the API is taught against a threshold." Open with the dismissed-banner problem, walk the five homes, *then* teach `localStorage` as the answer for one specific state shape. This is the lesson's senior-mindset payload; the API is almost an afterthought by comparison.
- **One mental model to leave with:** "Walk the homes top-to-bottom, take the highest match. `localStorage` is per-device UI scratch state that's cheap to lose and not worth a round-trip — never a default, never a secret store." The student should be able to (a) place any given piece of state in the right home, (b) write a leak-free, SSR-safe `localStorage` read in a Next.js client island, and (c) say why an auth token in `localStorage` is the canonical footgun.
- **The two Next.js hazards are the technical crux.** Where the API is trivial, the SSR safety dance is not. Beginners reach for `localStorage.getItem(...)` in render and get a server `ReferenceError`, then "fix" it and get a silent hydration mismatch. Both are non-obvious and both are this lesson's real teaching weight. Visualize the server/client split so the *why* lands before the *how*.
- **Continuity — cleanup through-line.** Ch 016 has drilled "every resource you open in the browser, you close" (AbortController Ch 014 L3 → cleared `setTimeout` L2 → `revokeObjectURL` L3). The `storage` event listener continues it: subscribe → unsubscribe in cleanup. Name this lineage explicitly; it's a chapter-wide reflex paying off a fourth time.
- **Continuity — corrections carried.** L1 established secure context gating; L3 already corrected that Blob/File/object-URLs are *not* gated. Web Storage is likewise **not** secure-context gated (works on `http://`) but **is** browser-only (breaks in Server Components). Same shape as L3's correction — state it the same way: "not gated, just browser-only." Reuse the `client-only` import idea once.
- **Continuity — cross-references already owned.** Cookies (Ch 013) own the session/auth surface and `HttpOnly`; this lesson points at them as the right home for tokens, does not re-teach. `'use client'` boundary discipline is L2's "smallest interactive leaf fed data as props" — reuse the phrase, don't re-teach. `JSON.stringify`/`parse`, `??`, optional chaining are assumed fluent.
- **Code-shape calibration (sanctioned simplifications, do not "fix"):** bare semantic elements, minimal/no Tailwind, no shadcn, hooks shown as shape only, no full component wiring — identical to L2/L3. Note these so downstream agents and reviewers don't "upgrade" them. `'use client'` as literal first line; arrow-function components on `const`; typed props.
- **Visual/interactive budget:** one `StateMachineWalker` (the decision tree — the lesson's centerpiece, ships the senior order-of-questions), one `DiagramSequence` lesson component for the SSR-render/hydrate split (the technical crux), one `Buckets` classification exercise (place-the-state recall), one `PredictOutput` (the strings-only footgun). No `ReactCoding` — the `localStorage`/SSR runtime is poorly suited to the in-iframe React runner (no real SSR pass to demonstrate the mismatch), and the decision-tree skill is better assessed by `Buckets` than by code. Flag this deviation from L3's `ReactCoding` shipment as deliberate.
- One `VideoCallout` optional — only if fact-check surfaces a current, on-topic clip; do not block on it.

---

## Lesson sections

### Intro (no header)

Open in the chapter's established voice: concrete SaaS problem, the "obvious thing," then the bolded senior question.

- Concrete trigger: a dismissible UI hint — reuse a chapter-consistent surface. Suggest the **"command palette tip" banner** (chapter outline's example) or tie to the running invoices table from L2/L3 (e.g. a dismissed "drag columns to reorder" coachmark). Pick one; the banner closes and must *stay closed across reloads*.
- The "obvious thing" fails in a revealing way: `useState(false)` for the dismissed bit — works until reload, then the banner is back, because component state evaporates on unmount/reload. That failure is the hook: the bit needs to **outlive the component and the page load but belongs to this one browser**.
- Then name the trap: it's tempting to reach straight for `localStorage`, but a senior asks *where does this bit actually belong?* first — because the same instinct that reaches for `localStorage` here also (wrongly) reaches for it to stash an auth token. **Bolded senior question:** roughly — *"Before you reach for any storage API: of all the places a piece of state can live, which one does this bit belong in — and what makes `localStorage` the right home for some bits and a footgun for others?"*
- Preview the payoff: by the end you'll have a decision you can run on any piece of state, plus a banner-dismissed bit that survives reloads without breaking server rendering.
- Keep warm and brief (~3 short paragraphs), matching L3's intro length.

### The four-home decision tree

The lesson's centerpiece and senior payload. Teach the *order a senior asks the questions in*, not just the list.

- Establish the five homes with the trigger that picks each. Present top-to-bottom as a priority ladder ("take the highest match"), because the failure mode juniors hit is treating `localStorage` as a default rather than a last resort:
  1. **Component state (`useState`)** — ephemeral; never needed after unmount; lost on reload is *fine*. (open/closed of a dropdown, unsent input text.) Forward-ref Unit 3.
  2. **URL state (search params / `nuqs`)** — must be shareable, bookmarkable, survive a link paste; it's navigation state. (active filter, current page, selected tab you want in the URL.) Forward-ref Unit 10 / `nuqs`.
  3. **Server state** — account-level; must be queryable; must survive a logout and follow the user across devices. (saved preferences that sync, the real cart in a real SaaS, anything another user/session must see.)
  4. **Cookie** — must be sent to the server on *every* request (auth session, theme-picked-before-hydration), or must be `HttpOnly` so JS can't read it. Cross-ref Ch 013 (owns the cookie trust model) — do not re-teach, point.
  5. **`localStorage` / `sessionStorage`** — per-device UI scratch: dismissed banners, draft form values, last-used filter (when you *don't* want it in the URL), "tip seen," recently-viewed. The leaf. The defining test: **cheap to lose, not worth a server round-trip, and meaningful only on this one device.**
- The senior reflex to state explicitly: *walk top-to-bottom, take the highest match; `localStorage` is where state lands when it falls through every higher home.*

**Component — `StateMachineWalker` (`kind="decision"`).** This is the ideal use: it forces the student through the *order* the senior asks questions in, one branch at a time, ending on a recommended home. Author the questions as the priority ladder:
  - Q1 "Does this bit need to outlive the component / a page reload?" No → Leaf `useState`. Yes → Q2.
  - Q2 "Does the server need it — must it be queryable, survive logout, or follow the user across devices?" Yes → Q3 (cookie vs server-state split). No → Q4.
  - Q3 "Is it sent to the server on every request, or must JS be unable to read it (auth)?" Yes → Leaf Cookie (point to Ch 013). No → Leaf Server state.
  - Q4 "Should it be shareable / bookmarkable in a link?" Yes → Leaf URL state (`nuqs`, Unit 10). No → Q5.
  - Q5 "Is it meaningful beyond this one tab's lifetime?" Yes → Leaf `localStorage`. No → Leaf `sessionStorage`.
  - Leaves carry a one-line verdict + a reason body naming a concrete example and the forward-ref unit. Keep branch labels natural-language (per the component's authoring note). This wiring also folds in the `sessionStorage` distinction (its own subsection below can stay short because the walker already drew the line).
  - Pedagogical goal: the lesson "lives in the order, not in any single leaf" — exactly the `StateMachineWalker` sweet spot from its doc. The student internalizes the question sequence, not a lookup table.
- After the walker, land the dismissed-banner bit explicitly through the tree (outlives reload? yes; server need? no; shareable? no; beyond this tab? yes) → `localStorage`. This re-anchors the abstract tree to the opening concrete problem.

`Term` candidates here: none new strictly required — these are state-location concepts, better as prose + the walker than tooltips. (`nuqs` can be a one-line parenthetical, not a Term.)

### The API in one paragraph

Now — and only now — the API, taught against the threshold the tree established.

- Two near-identical objects on `window`: `localStorage` (persists across browser sessions, scoped per origin) and `sessionStorage` (cleared when the tab closes, scoped per tab+origin). Same five-method surface.
- Methods: `setItem(key, value)`, `getItem(key)` (returns the string or `null`), `removeItem(key)`, `clear()`, plus the iteration surface (`length`, `key(i)`) named once.
- **Strings only** — the headline constraint. Objects must be `JSON.stringify`-ed in and `JSON.parse`-ed out. `setItem('count', 0)` stores the *string* `"0"`; `getItem('count')` returns `"0"`, not `0`. This is the most common day-one surprise — give it a `PredictOutput` (below).
- **Synchronous** — every call blocks the main thread; fine for small reads, never inside a hot render loop; batch reads.
- **Quota** — per-origin, roughly 5–10 MB browser-dependent. Assume small, write defensively (sets up the `try/catch` subsection).
- **Per-origin scope** (scheme + host + port). Call out the dev-trap immediately: `localhost:3000` and the prod URL are different stores, and Next's dev server changing ports moves your keys with it. This bites students locally, so name it where they'll feel it.

**Code:** a small plain `Code` block (not `AnnotatedCode` — the surface is simple) showing the safe read/write round-trip with the JSON dance and a typed default:

```ts
// write
localStorage.setItem('palette-tip-dismissed', JSON.stringify(true));
// read with a safe default
const dismissed = JSON.parse(
  localStorage.getItem('palette-tip-dismissed') ?? 'null',
) as boolean | null;
```

State the `?? 'null'` pattern as the safe-default idiom: `getItem` returns `null` for a missing key, and `JSON.parse(null)` coerces that `null` to the string `"null"` and *happens* to return `null` — but the deliberate `?? 'null'` makes the intent explicit and guards the shape. (Per Code conventions: single quotes, `as` only at this boundary where parse output is genuinely `unknown`-shaped.)

**Exercise — `PredictOutput`** (the strings-only footgun, placed right here). A tiny program: `localStorage.setItem('count', 1); console.log(localStorage.getItem('count') + 1);` → prints `"11"` (string concat), not `2`. `<PredictWhy>`: Web Storage stores strings only — `setItem` coerced `1` to `"1"`, `getItem` returned `"1"`, and `+` then string-concatenated. The fix is `Number(getItem('count'))` or a `JSON.parse`. Pedagogical goal: make the single most common day-one surprise land as muscle memory before they hit it in their own code.

`Term` candidates: `origin` (brief re-def — scheme+host+port; introduced earlier in Unit 2 but worth a one-line tooltip refresher here since the dev-port trap hinges on it). Keep it terse.

### The SSR safety dance

The technical crux. This is where a five-line API becomes non-trivial under Next.js 16, and where the real teaching weight sits.

- **The break.** Next.js 16 renders Server Components on the server, where there is no `window` and no `localStorage`. Reading `localStorage.getItem(...)` at module top level or inside a Server Component throws `ReferenceError: localStorage is not defined` — at build/SSR time, not in the browser. **Nail the non-obvious bit students always hit:** adding `'use client'` does *not* make this go away — a Client Component still *pre-renders on the server* during SSR and only then hydrates, so any read in the component body (outside an effect or event handler) runs server-side first and throws. The "I added `'use client'` and it still crashes" moment is worth pre-empting by name. This is the same "browser-only, not the server" line L3 drew for object URLs; say so explicitly and carry the correction: **Web Storage is *not* secure-context gated (works on plain `http://`) — it's browser-only.** Reuse the `import 'client-only'` idea (Code conventions §Module boundaries) as the guardrail that turns a leaked import into a build error: one line, recognition.
- **The three guarded read forms, each with its trigger** (the chapter framing wants all three with the trigger for each):
  1. **`typeof window !== 'undefined'` inline guard** — the one-liner for a read outside React reactivity (an event handler, a utility called from a click). Cheapest; no reactivity.
  2. **`useEffect` deferred read** — read in an effect after mount, set local state. The component renders the server default first, then patches on the client. React reactivity comes free. The 2026 default for "read once on mount and show it."
  3. **`useSyncExternalStore`** — the React-aware subscription: handles SSR initial state *and* cross-tab `storage` updates correctly. Signature `useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)`. `subscribe` adds the `storage` listener + returns cleanup; `getSnapshot` reads+parses; `getServerSnapshot` returns the SSR default and **must return the same value the first client render produces** or you get a mismatch. Named as **the API a `next-themes`-style library wraps** — recognition + minimal shape only; Ch 025 / Unit 15 own it at depth. Do not teach the hook mechanics.
- **The hydration-mismatch reflex** (give this its own short beat — it's the second, subtler hazard). Reading `localStorage` on the client and rendering the result in JSX *without a matching server render* produces a hydration mismatch: server renders "Welcome", client renders "Welcome back", React warns and may discard/re-render the client tree. Two fixes: (a) render the server default, patch on mount in `useEffect`; (b) `useSyncExternalStore` with a correct `getServerSnapshot`. Cross-ref Ch 014 L2 (attributes-vs-properties hydration-mismatch class) and forward-ref Unit 4 (SSR). On `suppressHydrationWarning`: name it once as the narrow escape hatch `next-themes` *has* to put on `<html>` because it mutates that element before React hydrates — **not** the general fix for storage mismatches. Current best-practice framing to convey: for state that must be correct on the *first server render* (theme-before-paint is the canonical case), the right home is a **cookie** (the server reads it and renders the matching value, so there's nothing to patch), not `localStorage` read after mount — which is exactly why the decision tree routes theme-before-hydration to the cookie leaf. Recognition only; do not present `suppressHydrationWarning` as a way to silence storage mismatches.

**Component — `DiagramSequence` lesson component** `src/components/lessons/016/4/SsrStorageTimeline.astro` (`step` prop, mirror the L1/L2/L3 build/import convention: lesson component rendered inside `<DiagramStep>` with per-step `<Fragment slot="caption">`). Pedagogical goal: make the invisible server→client handoff visible so the *why* of the dance lands before the *how*. Suggested 4 steps along a horizontal server|client split:
  1. **Server render**: `localStorage` absent → a naked read here throws; the safe component renders the *default* ("banner shown"). Show the box marked "no `window`".
  2. **HTML to browser + hydrate**: client React attaches to server HTML; at this instant `localStorage` *says dismissed* but the DOM still shows the default — if you read-and-render now, server and client disagree → mismatch (highlight the divergence).
  3. **Post-mount read** (`useEffect` / `getSnapshot`): client reads `localStorage`, state updates, banner correctly hides — the divergence resolves *after* commit, no mismatch.
  4. **Cross-tab `storage` event**: another tab writes the key → `storage` fires here → `useSyncExternalStore` re-reads → UI syncs. (Ties into the next section.)
  Keep height capped (~horizontal split, two short columns). The leak-being-a-block-with-no-arrow trick from L3 has an analogue here: the *mismatch* is the moment the two columns show different values.

**Code:** `CodeVariants` is the right tool here — a **wrong → right** pair makes the hazard visceral (the component doc calls this out as its sweet spot, and the wrong/right pair pattern runs across the chapter):
  - Variant "Reads in render (breaks)": `const dismissed = JSON.parse(localStorage.getItem(key) ?? 'null')` at the top of a client component body → `del`-mark the line; prose: throws on the server / mismatches on hydrate.
  - Variant "Deferred read (`useEffect`)": `useState(null)` default + `useEffect(() => setDismissed(read()), [])` → `ins`-mark; prose: server renders default, client patches after mount, no mismatch. Hooks shown as shape only (sanctioned simplification — note it).
  - Optionally a third variant "`useSyncExternalStore` (the library path)" showing the three-arg shape with `getServerSnapshot` returning the default — labeled recognition-only.

### Cross-tab sync with the `storage` event

Short section; continues the chapter cleanup through-line.

- `window.addEventListener('storage', (event) => …)` fires on **other** tabs of the same origin when a value changes — **not** in the tab that wrote it. The reach: a logout in one tab clears the auth flag and other tabs react and redirect; a theme change in one tab updates the rest.
- The event object carries `key`, `oldValue`, `newValue`, `storageArea`, `url` — name `key`/`newValue` as the ones you branch on; a `null` `key` means `clear()` was called.
- The same-tab gap: because the writer doesn't get its own event, in-tab listeners need either a self-dispatched custom event or `useSyncExternalStore`'s snapshot re-read on the next React tick. State this as the one non-obvious wrinkle; don't over-engineer it.
- **Cleanup through-line:** subscribe → `removeEventListener` in the cleanup return (or `AbortController` `signal` on `addEventListener`, the Ch 014 L3 pattern — reuse it, recognition). Explicitly name the lineage: "the `storage` listener joins AbortController, the cleared `setTimeout`, and `revokeObjectURL` — every resource you open in the browser, you close." This is the fourth and final payoff of the chapter reflex; make it land as a closing-of-the-loop.
- `BroadcastChannel` named once as the adjacent richer cross-tab API — recognition only, out of scope.

**Code:** small `Code` block — `addEventListener('storage', …)` with the `signal`-based cleanup, hook-shape-only wrapper. No `AnnotatedCode` needed; the surface is small.

`Term` candidate: `storage event` (one-line: fires in *other* same-origin tabs when a key changes; never in the writing tab).

### `sessionStorage` — when it earns the swap

Very short — the walker already drew the line, so this is a one-beat confirmation, not a full section. Consider merging into "The API in one paragraph" if the outline feels top-heavy; keep separate only if it reads cleaner.

- Identical API, scoped per tab; cleared when the tab closes.
- Trigger: the value is meaningful *only inside this tab's lifetime* — a multi-step "compose new invoice" wizard's draft that shouldn't bleed into a second tab the user opened to copy something; a one-time per-session onboarding flag.
- Default to `localStorage` when unsure; reach for `sessionStorage` only when per-tab isolation is the actual requirement.

### What `localStorage` is explicitly not for

The senior boundary section — pairs with the opening trap (the auth-token instinct) and closes the loop on *why* the decision tree matters.

- **Auth tokens / session JWTs** — the canonical 2022-era footgun. `localStorage` is readable by **any** JavaScript on the page, so a single XSS turns into full token theft. The session lives in an `HttpOnly` **cookie** (Ch 013), and **Better Auth (Unit 8) owns that surface** — you will not hand-roll it. State this as the hardest non-negotiable in the lesson.
- **Sensitive PII** — same XSS exposure; sensitive data stays server-side.
- **The real cart / anything another session must see** — server state; `localStorage` is per-device, so phone and laptop see two different values (the cross-device blind spot).
- **Large or structured blobs** — quota is small and I/O is synchronous (blocks the main thread). **IndexedDB** is the platform answer for large structured client data — named once, recognition only, out of scope for 2026 SaaS UI.
- The unifying line: each "not for" maps back to a *higher* home in the tree — token→cookie, PII/cart→server, big data→IndexedDB. The decision tree isn't bureaucracy; it's the thing that keeps the token out of `localStorage`.

**Exercise — `Buckets`** (place-the-state recall, the lesson's primary assessment). Pedagogical goal: verify the student can *run the decision tree* on concrete state, which is the whole lesson. Buckets = four homes (`useState`, URL, server/cookie, `localStorage`) to keep classification unambiguous; items are concrete pieces of SaaS state to sort. Suggested items: "Whether a modal is open" (useState), "The active table filter you want shareable in a link" (URL), "The signed-in user's saved email-notification preference" (server), "The auth session token" (cookie/HttpOnly — the trap item), "A dismissed onboarding banner" (localStorage), "Recently-viewed product ids on this device" (localStorage). Use `twoCol`, custom `instructions` framing it as running the tree. Ensure every item has exactly one defensible home given the bucket set (avoid genuine ambiguity — tighten item wording; e.g. don't include "draft comment text" which could fall in two homes).

### The defensive write: `try/catch` and schema drift

Short closing practical beat — the production-honest reflexes a first draft omits.

- **`setItem` can throw** — `QuotaExceededError` when the origin is full; Safari/Firefox **private/incognito** modes can throw or silently no-op. So every `setItem` for non-trivial data is wrapped in `try/catch` with a graceful fallback (in-memory cache, refetch from server, or degrade silently — a dismissed banner that fails to persist is not a crash). Reads can fail on locked-down browsers too; `getItem` returning `null` is *normal*, not an error.
- **`clear()` wipes the whole origin** — never call it from feature code; only from an explicit user "log out" / "reset settings" flow. Name this as a sharp edge.
- **Schema drift is on you** — when the stored value's shape changes between deploys, the *old* value is still sitting in the user's browser and will `JSON.parse` into the wrong shape. The senior pattern: store a `{ v: 1, … }` version key and migrate (or discard) on read. Name the pattern; don't build a migration framework.

**Code:** one small `Code` block — `setItem` wrapped in `try/catch` with a one-line fallback comment. Keeps the section concrete.

### External resources (optional, end)

One or two `ExternalResource` cards: MDN Web Storage API, and the React docs `useSyncExternalStore` page (for students who want the depth this lesson defers). Optionally a `VideoCallout` only if fact-check turns up a current, on-topic clip — do not block.

---

## Scope

**Prerequisites to assume (redefine in ≤1 line if at all):**
- `JSON.stringify`/`parse`, optional chaining, `??` — fluent.
- `origin` = scheme+host+port — one-line Term refresher only (Unit 2 introduced it).
- Secure context (Ch 016 L1), `'use client'`/smallest-island discipline (L2), the cleanup-on-teardown reflex (L2/L3) — *owned*, referenced not re-taught.
- Cookies / `HttpOnly` / session trust model — **Ch 013 owns it**; point, never re-teach.

**Explicitly out of scope (do not teach):**
- `useState` / `useEffect` mechanics — Unit 3 (Ch 024–025). Shown as shape only.
- `useSyncExternalStore` at depth — Ch 025 / Unit 15. Recognition + minimal three-arg shape only.
- SSR / Server-vs-Client Components at depth — Unit 4 (Ch 033). This lesson names the boundary and the `ReferenceError`/hydration consequences only.
- Cookies at depth — Ch 013.
- URL state / `nuqs` — Unit 10.
- **IndexedDB** — niche for SaaS UI; named once as the home for large structured client data, recognition only.
- **Service Workers / Cache API** — out of scope.
- **`BroadcastChannel`** — adjacent to the `storage` event; named once, recognition only.
- The `Storage` constructor / custom `Storage` implementations — not a 2026 SaaS reach.
- Encrypted-`localStorage` wrapper libraries — not endorsed; sensitive data stays server-side. Do not suggest them.
- Full webhook/route-handler machinery, Drizzle, Better Auth setup — other units; only *named* as the right homes.

**Boundary with siblings:** L1 (crypto), L2 (clipboard), L3 (Blob/File/object URLs) are done — reference their *reflexes* (secure-context correction, client-island discipline, cleanup) but never re-teach their APIs. This is the final teaching lesson before the Ch 016 quiz (L5); it should feel like the chapter's decision-tree capstone and explicitly close the "every resource you open, you close" through-line.

---

## Code conventions notes (applied)

- Single quotes; 2-space indent; semicolons; trailing commas — all code blocks.
- `'use client'` as literal first line of any client-island snippet; arrow-function components on `const`; typed props via `type` alias; named exports.
- `import 'client-only'` named once as the browser-only guardrail (§Module boundaries).
- `as` cast used *only* at the parse boundary (`JSON.parse(...) as T | null`) where output is genuinely unknown-shaped — not as a general pattern.
- Render/JSX guards use explicit `!= null` / `=== null`, not bare-truthy (matches L3's stated convention).
- **Deliberate divergences (flag for downstream agents — do not "fix"):** hooks shown as shape only (no real state wiring, no `useState`/`useEffect` teaching); bare semantic elements, minimal/no Tailwind, no shadcn; no full Server Component parent wired; no `ReactCoding` (the SSR/hydration hazard can't be demonstrated in the in-iframe runner, and the decision-tree skill is assessed by `Buckets`). These mirror the L2/L3 sanctioned simplifications exactly.

## New lesson components to build

- `src/components/lessons/016/4/SsrStorageTimeline.astro` — `DiagramSequence` step component (`step` prop, 4 steps), server|client split visualizing the SSR render → hydrate → post-mount read → cross-tab sync handoff; the hydration *mismatch* is the two-columns-disagree moment. Mirror the L1/L2/L3 build + import convention.
- (No second custom component required — the decision tree uses the pre-built `StateMachineWalker`.)

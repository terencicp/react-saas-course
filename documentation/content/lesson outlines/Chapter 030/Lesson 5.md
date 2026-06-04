# Lesson title

- Title: Hydration and its mismatch failure modes
- Sidebar label: Hydration mismatches

# Lesson framing

This is the chapter's capstone teaching lesson (L6 is the quiz). The whole chapter has built one mental geography — **the boundary**, server=cool / client=warm — and hydration is the seam where the two sides meet. The student does **not** arrive cold: L2 already `<Term>`-defined hydration and taught its contract ("a Client Component runs twice — once on the server for HTML, once in the browser to attach listeners/state — and both renders must produce the same output"). L2 deliberately stopped there. **This lesson owns the other half: WHY the two renders diverge in real code, how to read the error when they do, and the three fixes a senior reaches for.** Open by cashing the L2 debt explicitly, do not re-derive the two-render model from scratch — recap it in two sentences and a reused diagram beat, then move straight to "here is the error you will actually hit."

The senior framing that must thread through: hydration is **the cost of admission for SSR**. Pure client-side rendering ships a blank page then fills it (no hydration, bad first paint); pure static HTML interacts with nothing (no hydration, no interactivity); the App Router gives you instant server HTML **and** client interactivity, and hydration is the bill for getting both. Mismatches are not a framework bug to route around — they are the predictable consequence of writing render output that can't be reproduced identically on two machines (a UTC server and a Pacific browser, a server with no `Math.random` seed and a browser with another). Frame every cause as "this value can't be the same in both places," and every fix as "make the first render deterministic, then correct it after mount."

The student-facing payoff, stated up front: after this lesson you can read the React 19 hydration error, name the cause from a short list, and apply the right fix — `useEffect` deferral, `useId`, or a *narrow* `suppressHydrationWarning` — without reaching for the band-aid that hides real bugs. A second durable payoff: you can tell a **hydration** bug from a **server** bug by one glance at whether the failing file has `"use client"` — Server Components do not hydrate, so they cannot cause a hydration mismatch.

Pedagogical spine, low cognitive load: (1) recap the two renders, (2) show the error, (3) build the one-sentence model of *why* ("the two renders saw different inputs"), (4) enumerate the small closed set of causes grouped into **your non-determinism** vs **the browser's noise**, (5) teach the fix ladder in priority order, (6) close with the two diagnostic reflexes (is-it-even-hydration, and the stale-`.next` cache). Causes and fixes are taught **together per cause**, never as a causes-section followed by a fixes-section — the student should never hold an unfixed problem in working memory.

Iframe constraint from Ch 029 still holds: no live App-Router coding exercise, because a real mismatch needs a Next.js server + bundler that the in-browser runtime can't supply. But hydration-mismatch *reasoning* is pure determinism logic and exercises cleanly without a running App Router — use `PredictOutput`-style "will the two renders agree?" drills, a `Buckets` deterministic-vs-not sort, and the `RequestTrace` `hydrate` phase. Reuse the chapter's server=cool / client=warm colour language in every custom visual for continuity with L1/L2 diagrams.

Domain stays **invoices** (chapter through-line). Reuse the L2 centerpiece `MarkPaidButton` client leaf and the invoice-detail page as the demo surface; the canonical mismatch example is a "paid 3 minutes ago" relative timestamp rendered in that leaf.

# Lesson sections

## Introduction (no header)

Warm, brief, problem-first. Open on the lived moment: the invoice page renders perfectly on first paint, then the console throws **"Hydration failed because the server rendered HTML didn't match the client."** The student shipped a Client Component that shows "Paid 3 minutes ago" — a relative timestamp — and it worked locally until it didn't. State the lesson goal in one line (read the error, name the cause, apply the fix) and the durable payoff (tell a hydration bug from a server bug at a glance). Connect back: L2 taught that a Client Component *runs twice and both renders must agree* — this lesson is what happens when they don't, and what a senior does about it. Keep it to ~4 sentences; do not start teaching causes yet.

## The two renders have to agree

Cash the L2 debt and re-establish the model just enough to make divergence legible — this is recap, not first teaching. Two sentences of prose: the server runs the Client Component to produce the initial HTML (instant paint), ships it alongside the RSC payload; React in the browser then re-runs the *same* component over that existing HTML to attach event listeners and take over the DOM — this second pass is **hydration**. The rule the student already knows, restated as the lesson's pivot: hydration **adopts** existing HTML, it does not redraw it; so if the browser render computes different output than the server render baked into the HTML, React can't reconcile and bails on that subtree. Name the senior frame here: hydration is **the cost of SSR** — the price for getting server HTML *and* client interactivity is that your render must be reproducible on two different machines.

Reuse a `<Term>` for **hydration** (definition consistent with L2: "the browser-side second render that re-runs a Client Component over server-sent HTML to attach listeners and adopt the DOM"). Add a `<Term>` for **reconciliation** (React's diff of what it would render against what's already there).

Visual — reuse, don't reinvent. A compact `RequestTrace` scoped to the hydrate story makes the "runs on server, then wakes in browser" beat concrete and ties to L1/L2's identical component. Use `phases="request,server-render,wire,hydrate"` on the invoice page: a server `InvoiceList` (kind=server, await="db: invoices") and the `MarkPaidButton` client leaf. Author `<Phase id="server-render">` to say every component — the client leaf included — runs on the server first to produce HTML, and `<Phase id="hydrate">` to say only the client leaf wakes up and attaches listeners; the server list shipped zero client JS and never hydrates. Pedagogical goal: anchor *which* node hydrates (the warm leaf) before we break it, and pre-load the "Server Components don't hydrate" point we cash at the end. This is the same figure type L1/L2 used, scoped tighter — continuity, not novelty.

## Why the two renders diverge

The one-sentence model, then the closed set of causes. State the model plainly: **a mismatch means the two renders saw different inputs.** The component code is identical; the *environment* isn't. The server is one machine at one instant in one timezone with no DOM; the browser is another machine a few hundred milliseconds later in the user's timezone with a DOM that extensions may have touched. Any value that depends on *which machine* or *which instant* will differ, and that difference lands in the HTML.

Group the causes into two buckets the student will reuse for the rest of the lesson — this grouping is the load-reducing move, because the *fix* differs per bucket:

- **Your non-determinism** (your code asked for a value that can't be identical in both places): time (`Date.now()`, `new Date().toLocaleTimeString()`, "3 minutes ago" relatives), randomness (`Math.random()`, random IDs/keys), locale and timezone formatting (server renders `1/6/2026` in UTC, the browser renders `06/01/2026` in the user's locale/zone), and reading a browser-only source during render (`typeof window !== 'undefined' ? ... : ...`, `localStorage.getItem(...)`, `navigator.language`) — the server branch and the browser branch differ by construction. **You own these; they are real bugs in your render.**
- **The browser's noise** (you didn't write it, the user's environment injected it): browser extensions mutating the DOM *before* React hydrates — Grammarly adds `data-gr-*`, password managers add `data-1p-*` / `data-lpignore`, Colorzilla adds `cz-shortcut-listen`. The server HTML never had those attributes; the browser DOM does. **Not your bug — but it still throws the same error, so you must recognize it to avoid chasing a phantom.**

Make the distinction explicit and durable: the first bucket you *fix*, the second bucket you *acknowledge and suppress narrowly*. Hold the fixes for the next sections — here the student only learns to *classify*.

One more cause, named once so the "closed set" isn't misleading but **not** folded into either bucket: **invalid HTML nesting** (a `<div>` inside a `<p>`, a `<p>` inside a `<p>`) also throws a hydration mismatch, because the browser's HTML parser silently *repairs* the malformed markup into a different DOM than the one React's server render produced. This one is neither your non-determinism nor the browser's noise — it's a structural bug in your JSX, and none of this lesson's three fixes apply: the fix is correcting the markup. One sentence, then move on — it's a footnote, not a third bucket.

Visual — a small custom HTML+CSS `<Figure>` (server=cool / client=warm tints) showing the same `<span>Paid {when}</span>` rendered twice side by side: server lane prints `Paid 14:32:07 UTC`, browser lane prints `Paid 09:32:09` — the diff highlighted. Caption: "Same code, two machines, two strings — React refuses to adopt the mismatch." Keep it static and horizontal (vertical-space budget). Pedagogical goal: make "different inputs → different HTML" visible in one glance, not prose.

Exercise — `Buckets`, two columns, sorts *render expressions* into **Same on server and client** vs **Differs between server and client**. Items: `<p>{invoice.total}</p>` (same — prop from server), `<p>Updated {Date.now()}</p>` (differs), `useId()` value (same — teased, taught next), `<p>{Math.random()}</p>` (differs), `<p>{user.name}</p>` (same), `new Intl.NumberFormat().format(total)` without an explicit locale (differs — runtime locale), `<time>{isoString}</time>` where `isoString` is a prop (same). Goal: drill the *classification* skill before the fixes; the `useId` and `Intl` items pre-load later beats. Place it right after the figure.

`<Term>` candidates: **non-deterministic** (a value that can differ between two evaluations of the same code), **hydration mismatch** (React's term for the two-render disagreement, quoting the error string).

## Fix it after mount: the useEffect deferral

The default reach, taught first because it's the right answer most often. The principle: if a value can't be the same on both machines, **don't render it during the first (server) render at all** — render a deterministic placeholder, then swap in the real value *after* hydration, inside a `useEffect`. `useEffect` runs only in the browser, only after mount, so the value it sets is never part of the server HTML and never part of the hydration comparison. The two renders agree on the placeholder; React adopts cleanly; then a client-only re-render paints the real value.

Teach the canonical pattern on the `MarkPaidButton` / invoice "Paid {relative time}" surface with `CodeVariants`, before/after:

- **Variant "Mismatch"** — a `"use client"` component that renders `Paid {formatRelative(paidAt)}` directly in the body. Mark the offending line; first prose sentence: "Throws on hydration — the relative string is computed at render time and differs by the round-trip latency." Use `del`-style emphasis on the bad line.
- **Variant "Deferred"** — `const [label, setLabel] = useState<string | null>(null); useEffect(() => setLabel(formatRelative(paidAt)), [paidAt]); return <span>{label ?? formatStatic(paidAt)}</span>;` — server and first client render both produce the stable fallback (an absolute date, or "—"); effect fills the relative label after mount. `ins`-style emphasis on the effect + fallback. First sentence: "Server and client agree on the fallback; the relative label appears a tick later, client-side only."

Reinforce the conventions the student already carries (do not re-teach): `useEffect` is for synchronizing with something *outside* React (here, wall-clock time / the browser's locale), which is exactly its legitimate job — not the deriving-state or data-fetching misuse L-prior lessons warned against. One caution, inline, not a section: the first paint shows the fallback, so pick a fallback that reads fine on its own (an absolute timestamp, a skeleton, or a dash) — never a value that looks broken. This "render a stable placeholder, hydrate, then enrich" shape is the same idea behind a mounted-flag gate; show the minimal `useState(false)` + `useEffect(() => setMounted(true), [])` variant in one extra `CodeVariant` labelled "Mounted gate" for the case where an entire client-only subtree (e.g. one reading `localStorage` for a saved filter) must wait for the browser — first sentence names it as the generic form of the same fix.

Pedagogical goal: the student leaves with one reflex — *non-deterministic value → defer to `useEffect`, render a stable placeholder first* — applied to the chapter's own `MarkPaidButton` surface so it's concrete, not abstract.

## Stable IDs across renders: useId

A second, narrower fix for one specific cause: when you need a unique ID string (a `<label htmlFor>` ↔ `<input id>` pair, an `aria-describedby` target), the *naive* solutions — `Math.random()`, a module-level counter, `crypto.randomUUID()` — are all non-deterministic and produce different IDs on server and client, which is a mismatch. `useId()` is React's purpose-built answer: it derives a stable, unique string from the component's *position in the tree*, so the server and the browser compute the **same** ID for the same element. Show a tight `Code` block: `const id = useId();` then `<label htmlFor={id}>` / `<input id={id} aria-describedby={`${id}-hint`} />`. Name that this is the same `useId` they'll meet again for forms/ARIA depth (Ch 024) — here it earns its place purely as the *hydration-safe* ID source. One sentence on the constraint: don't slice or concatenate raw `Math.random` into IDs anywhere in a Client Component subtree — the counter/random reflex is the trap `useId` exists to remove.

Keep this section short — it's one tool for one cause. `<Term>` for **useId** (React hook returning a stable unique string identical on server and client). Pedagogical goal: install the "never random for IDs, always `useId`" rule and disarm the most common *self-inflicted* mismatch after timestamps.

## When you can't defer: suppressHydrationWarning, narrowly

The escape hatch — taught last, framed as last resort, with guardrails, because misuse is the predictable junior mistake. What it is: a boolean prop on a single element that tells React to *skip the mismatch check for that element's own text content / attributes only* — not its children, not the rest of the tree. Two legitimate uses, both already set up:

- **Intentionally client-different values you can't or won't defer for UX reasons** — e.g. a timestamp that *must* paint immediately and is allowed to differ by a second. Put `suppressHydrationWarning` on that one `<time>` and let the post-hydration render correct it; the user never sees a flash.
- **The browser's noise from the second bucket** — extension-injected attributes. Here the canonical placement is the **document `<body>`** (the element extensions mutate), so the injected `data-gr-*` / `cz-*` attributes don't trip the warning for the whole app.

Critical disambiguation the student must not get wrong (this is a real continuity landmine — reconcile it explicitly): the course's `next-themes` dark-mode setup puts `suppressHydrationWarning` on **`<html>`**, because the theme script sets the `class`/`style` on `<html>` before React hydrates; the *browser-extension* case targets **`<body>`**. Same prop, two different elements, two different reasons — state both so the student isn't confused when they see `<html suppressHydrationWarning>` in the root layout later. Show the root-layout `Code` snippet with both lines and a comment on each.

Hard guardrails, inline: it suppresses *only that element*, one level deep — children below still hydrate strictly, so it is **not** a way to silence a mismatch you don't understand; if you find yourself adding it to make a `useEffect`-fixable bug go away, you're hiding a real divergence that will resurface. The senior rule: reach for `useEffect`/`useId` first; `suppressHydrationWarning` is for values that are *correctly* different by design, plus the body-level extension noise.

`<Term>` for **suppressHydrationWarning** (per-element opt-out of the mismatch check, one level deep). Pedagogical goal: give the tool *and* the fence so the student doesn't reach for it as a default.

Exercise — `Dropdowns` over a short fenced snippet (or inline prose) asking the student to pick the right fix per scenario from a `<select>`: scenario "relative `Date.now()` label in a card" → `useEffect` deferral; scenario "`htmlFor`/`id` pair for a form field" → `useId`; scenario "Grammarly injects `data-gr-*` on the page" → `suppressHydrationWarning` on `<body>`; scenario "`Math.random()` used as a list `key`" → `useId` / stable key (not random). Goal: force the student to *select the matching fix*, which is the lesson's terminal skill. Place at the end of this section so all three fixes are in hand.

## Two diagnostics before you debug

Close on the two reflexes that save the most time, both framed as "check this *before* you start changing render code."

**Is it even a hydration bug?** Only Client Components hydrate. A Server Component ships HTML plus reconciliation data and never runs a second time in the browser, so it *cannot* throw a hydration mismatch. The one-glance diagnostic: open the failing file — does it have `"use client"` at the top (directly, or is it imported transitively from one)? If not, the bug is in your server render (wrong data, a thrown error, a bad `await`), not hydration, and the fixes in this lesson don't apply. This cashes the `RequestTrace` beat from the opening: the warm leaf hydrates, the cool tree doesn't. Reuse the chapter's loud-vs-silent framing only lightly here; the point is *correct diagnosis*, not a new rule.

**The stale `.next` cache.** A 2026 source of real frustration that earns explicit naming: sometimes the error points at HTML you genuinely cannot find in your source, because the dev build cache (`.next`) served stale HTML from before your last edit. The senior reflex when the error makes no sense against the current code: stop the dev server, `rm -rf .next`, restart. Show the two-line `bash` `Code` block. Frame it honestly — this is a tooling wart, not a concept; naming it spares the student an hour of chasing a bug that isn't in their code.

Brief mental-model close (2–3 sentences, no new header): hydration is the seam of the Server-plus-Client model; its failure modes are a *small, closed, recognizable set*, and every one resolves to either "make the first render deterministic" (your bucket → `useEffect` / `useId`) or "acknowledge an environment difference you don't control" (the browser's bucket → narrow `suppressHydrationWarning`). Restate the durable payoff: read the error, classify the cause, pick the fix. Optionally end with the bigger-picture line that this seam is the cost of getting instant HTML *and* interactivity — the bill the App Router pays for SSR.

Exercise — final recognition check, `MultipleChoice` (single correct, or multi if natural): "A teammate adds `suppressHydrationWarning` to the root `<html>` to silence a 'Paid 2 minutes ago' mismatch deep in an invoice card. What's wrong with this fix?" Correct: it's both too broad (whole document) and at the wrong level (the mismatch is in a leaf, not on `<html>`); the real fix is deferring the timestamp to `useEffect`. Distractors cover plausible misreadings. Goal: confirm the student internalized the *narrow*, *right tool* discipline, not just the tool's existence.

## External resources (optional)

One or two `ExternalResource` cards: the Next.js "Hydration error" docs page (canonical error + common causes), and optionally the React docs `useId` reference. Keep to authoritative primary docs.

# Scope

**Already taught — recap concisely, do not re-teach:**
- The two-render model and the hydration *contract* ("runs twice, both must agree") — L2 owns the derivation; this lesson recaps it in ~2 sentences and the `RequestTrace` opener, then builds *on* it.
- `"use client"` as the boundary marker and the directive's full semantics — L2/L3 own it; used here only as the one-glance "is this file client?" diagnostic.
- The RSC payload / what crosses the wire — L4 owns it; mentioned only to note HTML and the payload are two transports that both must be consistent (one sentence, no re-teaching).
- Server Components are the default, ship zero client JS, don't hydrate — L1 owns it; reused as the closing diagnostic.
- `useEffect` is for synchronizing with external systems — established earlier; reused as the *legitimate* use here (wall-clock/locale), not re-explained from scratch.

**Out of scope — defer, do not pull forward:**
- Suspense, streaming, `loading.tsx`, how server-rendered async content arrives, error boundaries, `error.tsx` / `global-error.tsx` → **Chapter 031**. Do not teach streaming as a hydration topic.
- Static vs. dynamic rendering, `'use cache'`, Cache Components, PPR → **Chapter 032**. The stale-`.next` cache diagnostic is a *dev-tooling* note, not a caching lesson — keep it to `rm -rf .next`, no cache-model theory.
- Time / timezone / locale handling in depth, `Intl`, `Temporal`, date libraries → **Chapters 084 / 087**. Timezone/locale appear here *only* as mismatch causes; teach the *fix* (defer/stabilize), not correct i18n date handling.
- `useId` semantics for forms/ARIA at depth → **Chapter 024**. Here it's purely the hydration-safe ID source.
- `next-themes` setup and dark-mode tokens → its own later lesson; the `<html suppressHydrationWarning>` line is *referenced* to disambiguate from the `<body>` extension case, not taught as theming.
- Server Actions / `"use server"` → Chapter 043; not relevant here, do not surface.
- `React.use()` consuming a streamed Promise → Chapter 031; out of scope (this lesson is about the HTML/JS handshake, not async data arrival).

**Constraints to honor (from continuity notes):**
- No live App-Router coding exercise (iframe constraint) — a real mismatch needs a Next.js server + bundler. Checks are recognition/reasoning only: `Buckets`, `Dropdowns`, `MultipleChoice`, plus the `RequestTrace` `hydrate` phase. Do **not** propose a `ReactCoding` exercise that claims to reproduce a server/client mismatch.
- Reuse the chapter's server=cool / client=warm colour language in every custom figure for visual continuity with L1's `ServerBrowserSplit` and L2's `BoundaryDepth`.
- Stay in the **invoices** domain; reuse `MarkPaidButton` and the invoice-detail page as the demo surface; canonical example is the "Paid N minutes ago" relative timestamp.
- The "Mismatch" code variant is a labelled anti-pattern (the "before"), not course-standard code — mark it as such, consistent with how L1/L2 framed their anti-pattern snippets.

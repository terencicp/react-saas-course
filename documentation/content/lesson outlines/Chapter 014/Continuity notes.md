# Chapter 014 — The DOM and event substrate

## Lesson 1 — The DOM as a live tree of typed nodes

**Taught** — DOM as a live, typed, in-memory tree the parser builds once and JS/browser/React mutate after; the `Node → Element → HTMLElement → tag-specific subclass` hierarchy; non-element nodes (`Text`, `Comment`, `Document`, `DocumentFragment`, `DocumentType`) for recognition; the four-method access surface (`getElementById`, `querySelector`/`All`, `closest`, `matches`); element- vs node-flavored tree-walking; live vs static collections + the iterate-while-mutating bug and `[...]`/`Array.from` snapshot fix; the five React leak sites; DevTools Elements panel as live-tree reader with `$0`/`temp0`.

**Cut** — none of significance; outline scope delivered in full.

**Debts (forward refs this lesson promised)**:
- Attribute-vs-property split, including why a `value` property/attribute disagree → L2 (named as the opening hook only, not explained here).
- Event delegation, `closest`/`matches` in handlers → L3 (named as lookup methods only here).
- `useRef<HTMLInputElement>(null)` — the ref type borrows this lesson's hierarchy → Chapter 022.
- Portals built on `DocumentFragment` → Chapter 022 L5.
- Hydration mismatch = the snapshot-vs-live gap reported as error → Unit 4 / server rendering.
- `dangerouslySetInnerHTML` / XSS surface of `innerHTML` → Unit 4 security.

**Terminology / mental models (later lessons must reuse these exact framings)**:
- Spine of the chapter: "HTML source is a byte snapshot the parser saw once; the DOM is live program state." Phrased as "photograph (source) vs running program's state (DOM)."
- "Trigger-before-tool" framing: every DOM primitive filed as "rare reach, recognize it," NOT a daily tool — React owns the tree, you reach for primitives only when the abstraction can't reach a platform-owned use case (focus, measurement, scroll, library glue).
- Hierarchy taught as "each level adds members on top of the one below; type against the level that introduces the member you need."
- "Element-flavored" (`*Element*` props, skip text/comments — the default) vs "node-flavored" (`parentNode`/`childNodes`, include text nodes — recognition only).
- `textContent` = safe text-only; `innerHTML` = "a knife" / XSS surface (named once, not taught).
- DevTools: Elements panel "is the live tree serialized"; trust it over View-Source when debugging.

**Misc.**:
- Chapter is **substrate-only**: code samples are vanilla JS/TS, zero JSX/hooks. L2/L3 must hold this line.
- Running example markup used: a `<nav id="main-nav">` with `<ul>`/`<li>`/`<a>` links (access-surface walkthrough) and a `<ul id="menu">`/`<ul id="list">` for tree-walking and collection-drift demos.
- Reused the prior `010 L2` "parser builds the DOM" box and `010 L3` DevTools/`$0` as established prerequisites — do not re-teach.
- Code conventions in samples: single quotes, 2-space indent, `const` + arrow functions.

## Lesson 2 — Attributes vs. properties: parsed state vs. live state

**Taught** — the two-slots-per-node model (attribute = parsed string captured at load time via `getAttribute`/`setAttribute`/`has`/`removeAttribute`; property = live typed value via `element.propName`); the four relate-patterns (identical-name synced, renamed, default-vs-current, one-side-only); boolean-attribute presence semantics + the coercion footgun; enumerated-attribute canonicalization; the `data-*`/`dataset` rename bridge; reading both sides in DevTools (Elements markup = attributes, Properties subpanel = properties, `$0` probe); the four React leak sites (JSX prop names, `defaultValue` vs `value`, hydration mismatch, controlled-input server-`value` warning).

**Cut** — `style`-string-vs-`CSSStyleDeclaration` as an attribute/property type example was dropped (deferred whole to Chapter 019); outline scope otherwise delivered.

**Debts (forward refs this lesson promised)**:
- Controlled vs uncontrolled inputs; `defaultValue` writes attribute (uncontrolled), `value` writes property (controlled) → Unit 6 forms.
- Hydration-mismatch full story (server HTML = attribute side, client DOM = property side) → Unit 4 / App Router. **This closes the L1 "hydration mismatch = snapshot-vs-live gap" debt — now made exact.**
- Event delegation routing on `data-*` discriminators via `closest()` → L3 (named as the bridge; `data-*` is the discriminator).
- ARIA `aria-*` semantics → Chapter 017 L6 (named here only as the attribute-only, no-property-mirror case).
- Tailwind state-driven styling `data-[state=open]:…` reads DOM `data-*` state → Unit 3.

**Terminology / mental models (later lessons must reuse these exact framings)**:
- "Two storage slots, one node" — attribute shelf (parsed strings) vs property shelf (live typed values). Anchored by the `TwoSlotsNode` figure.
- **reflect** = when writing one side auto-updates the other. `id`/`type`/`title` reflect; `value`/`checked`/`selected` deliberately do not. "Does this pair reflect?" is the core classifier.
- The four buckets (exact labels used in the `Buckets` exercise): "Identical / synced", "Renamed property", "Default vs. current", "One side only".
- **Key reframe (must stay consistent in Unit 3):** `className`/`htmlFor`/`tabIndex` are DOM *property* names, NOT React inventions — JSX assigns to properties, so JSX prop names follow the property side. Knowledge transfers both directions.
- Boolean attributes: "presence is the value" — `disabled="false"` still disables; `"false"` is a *double trap* (non-functional AND invalid markup per WHATWG; only valid values are `""` or a repeat of the name).
- Attribute = "the raw bytes the parser saw"; property = "the resolved/engineered value the runtime acts on" (enumerated-attribute angle: `type="numbr"` → `.type` is `'text'`).
- `dataset` rename rule: strip `data-`, kebab→camelCase; values always strings. "Write `data-*` in JSX, read `dataset.*` in handlers."

**Patterns and best practices** (for the project chapter):
- Raw-DOM boolean reflex: set the typed property (`el.disabled = false`) or `removeAttribute`; never `setAttribute('disabled', 'false')`. Never coerce an attribute string to boolean.
- For identical-name synced pairs, prefer the property (`el.id = 'x'`) over `setAttribute`.
- Senior debugging move: when one side looks right but the page misbehaves, check the *other* side — the bug is the attribute/property divergence.

**Misc.**:
- Substrate-only line held: samples are vanilla imperative DOM (`getAttribute`/`.value`/`.disabled`/`dataset`) — this is **deliberate**, the imperative DOM surface IS the subject; downstream agents must not "modernize" into JSX. The few JSX snippets (`<label htmlFor className>`, `disabled={isLoading}`) are illustrative prose-level recognition only, never wired into runnable exercises.
- Custom lesson components built: `TwoSlotsNode.astro` and `typing-divergence/TypingDivergence.astro` (the `DiagramSequence` typing demo) under `src/components/lessons/014/2/`.
- Reused L1's `$0` and "Elements panel = live tree" without re-teaching.

## Lesson 3 — The event model: capture, bubble, delegate

**Taught** — the three-phase event trip (capture down `window→target's parent`, target, bubble up to `window`); `addEventListener` defaults to bubble, `{ capture: true }` opts into capture; `focus`/`blur` don't bubble, use `focusin`/`focusout`; `target` (deepest hit, fixed) vs `currentTarget` (node the handler is bound to, changes); event delegation (one listener on a stable ancestor + `event.target.closest('[data-action]')` + null guard + `dataset`-routed `switch`); `preventDefault` (cancels default action, event keeps traveling) vs `stopPropagation` (halts trip, no default cancel) as two orthogonal axes, plus `stopImmediatePropagation`; the four `addEventListener` options (`capture`/`once`/`passive`/`signal`); the one-`AbortController`-per-setup-site cleanup pattern (signal threaded into every listener, one `abort()` teardown); what React owns (`SyntheticEvent` at the root container) and the three `addEventListener` escape-hatch sites.

**Cut** — none of significance; outline scope delivered in full.

**Debts (forward refs this lesson promised)**:
- React events/`onClick`/`SyntheticEvent` at depth, and that React delegates at the root container → Chapter 022 (recognition only here; "React's `onClick` is delegation under the hood").
- `useEffect`/ref-callback cleanup mechanics — the cleanup branch React calls for you, *identical* `AbortController` shape inside → Chapter 022.
- Hydration / SSR event wiring → Unit 4.
- `pointer*` event family at depth → out of scope; named only as the unifying primitive to default to for raw pointer input.
- `KeyboardEvent` key/code surface, keyboard shortcuts at depth → later chapter (022/027); here only "`keydown` on `window` is an escape-hatch site" and "`click` covers keyboard activation (Enter/Space)".
- Closed the L1 `closest()` debt (delegation climb) and the L2 `data-*`→`dataset` reading-side debt (delegation routing).

**Terminology / mental models (later lessons must reuse these exact framings)**:
- Spine sentence: "an event makes two trips through the tree — down (capture) to the target, back up (bubble)"; the V-shape (outer→inner down, inner→outer up). Anchored by the `EventPhaseWalk` `DiagramSequence`.
- Memorize-line: "`target` is what was clicked; `currentTarget` is what the handler is on."
- Delegation defined as "one listener on a stable ancestor handling events for any number of descendants — present or future — by inspecting where the event came from."
- `preventDefault` vs `stopPropagation` framed as "two independent axes" (horizontal = browser default action, vertical = the trip); flip either, both, or neither.
- Cleanup mental model: "one signal, many listeners, one shutdown switch" — one `AbortController` per setup site.
- `default action` = the browser's built-in reaction (link navigates, form submits/reloads, checkbox toggles, context menu).
- `SyntheticEvent` = React's cross-browser wrapper exposing the same `preventDefault`/`stopPropagation`/`target`/`currentTarget` surface (so substrate knowledge transfers).

**Patterns and best practices** (for the project chapter):
- Delegation: always climb with `closest()`, never trust `event.target` directly (it's the deepest hit node, often a descendant); the `if (!actionEl) return;` null guard is non-optional.
- Build delegated activation on `click` (covers keyboard Enter/Space for free on `<button>`), not `mousedown`/`mouseup`.
- `stopPropagation` is a design smell — it silently breaks ancestor delegation with no error; reach for `preventDefault` instead. Seniors almost never call `stopPropagation`.
- `{ passive: true }` is the explicit reflex on scroll/wheel/touch listeners on any non-document-level element (browser auto-default only covers `window`/`document`/`document.body`, and not in Safari); opt out with `{ passive: false }` only when you genuinely must `preventDefault`.
- `AbortController`/signal is the canonical cleanup — never the `removeEventListener` ceremony (anonymous handlers can't be removed; N-target bookkeeping leaks). Same cancellation primitive as `fetch` aborts.
- Default to `pointerdown`/`pointermove`/`pointerup` over `mousedown`/`touchstart` to avoid double-handling on touchscreens.

**Misc.**:
- Substrate-only line held: all runnable code is vanilla JS (delegation handler, `AbortController` cleanup, `ScriptCoding` exercises). React mentions (`onClick`, `SyntheticEvent`, `useEffect`/ref-callback cleanup shape, root-container delegation, `e.persist()` no-op) are prose-level recognition forward-refs only — downstream agents must not wire them into runnable code.
- Fact-checked claims stated and safe to reuse: React delegates at the **root container** (not `document`) since React 17; `e.persist()` is a no-op since React 17 (event pooling removed); `passive` auto-defaults to `true` for `wheel`/`mousewheel`/`touchstart`/`touchmove` on `window`/`document`/`document.body` in modern browsers except Safari.
- Custom lesson components built: `EventPhaseWalk.astro` (capture/target/bubble `DiagramSequence`) and `DefaultVsPropagationGrid.astro` (the 2×2 orthogonality figure) under `src/components/lessons/014/3/`.
- The three escape-hatch sites named (use exact framing in Chapter 022): global targets (`window`/`document`), third-party DOM libraries (Stripe Elements, maps, charts), non-JSX browser APIs (`MediaQueryList.change`, `BroadcastChannel.message`, `WebSocket.message`).
- Reused L1's `<ul id="menu">` markup and `closest()`; reused L2's `data-*`/`dataset` bridge.
- L4 is the chapter quiz (no new teaching).

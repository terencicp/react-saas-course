# `RequestTrace` + `TraceNode` + `WireProp` + `Phase`

A scrubbable figure that animates one request through the Next.js App Router — server render → RSC payload across the wire → static shell → streamed Suspense holes → client hydration. The author declares a marked-up component tree; a fixed six-phase engine derives what happens to each node at each phase. The learner scrubs a phase slider and watches the tree change state.

The behaviour is **simulated** deterministically from the author's markup. It does not run Next.js, RSC, or a bundler — the simulation encodes the correct model so lesson markup stays correct by construction.

Provides its own outer card — do **not** wrap in `<Figure>`.

## Imports

```ts
import RequestTrace from '../../../components/figures/request-trace/RequestTrace.astro';
import TraceNode from '../../../components/figures/request-trace/TraceNode.astro';
import WireProp from '../../../components/figures/request-trace/WireProp.astro';
import Phase from '../../../components/figures/request-trace/Phase.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## The phase model

A fixed, ordered vocabulary of six **canonical phases**. The engine always computes cumulative node state through all six in order; the `phases` prop only controls which become **scrub stops** the learner can land on.

| id | Label | Active lane | What it shows |
| --- | --- | --- | --- |
| `request` | Request | Server | A request arrives. All nodes idle, role tags visible. |
| `server-render` | Server render | Server | Server Components execute; async nodes await; cached nodes resolve hit/miss; client nodes pre-render to HTML. |
| `wire` | The wire | Network | The RSC payload + HTML serialize and cross the network; the wire panel enumerates props per boundary. |
| `shell` | Shell flush | Browser | The static shell paints in the browser; dynamic regions show Suspense fallbacks. |
| `stream` | Stream | Browser | Suspense boundaries resolve; holes stream in, in document order. |
| `hydrate` | Hydrate | Browser | Client Components hydrate; islands become interactive. |

Typical lesson presets:

- Boundary / wire / hydration: `phases="request,server-render,wire,hydrate"`
- Streaming: `phases="server-render,shell,stream"`
- Cache + PPR: all six (default)

Omitting a phase never breaks a later one — the engine still applies the omitted phase's rules silently so the end state stays consistent.

## Props

### `RequestTrace`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `title` | `string` | no | — | Short heading above the scrubber. Plain text. |
| `phases` | `string` | no | all six | Comma-separated subset of phase ids, e.g. `"server-render,shell,stream"`. Rendered in canonical order. |
| `url` | `string` | no | — | Optional request URL shown next to the lane strip (e.g. `/invoices?status=open`). Cosmetic. |

### `TraceNode`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | `string` | yes | — | Unique within one `RequestTrace`. |
| `label` | `string` | yes | — | Component label, rendered as `<Label />` inside the node row. |
| `kind` | `'server' \| 'client' \| 'suspense'` | no | `server` | Role tag. `suspense` = a `<Suspense>` boundary wrapping streamed children. |
| `cache` | `'dynamic' \| 'static' \| 'cached'` | no | `dynamic` | PPR placement / cache backing. |
| `cacheState` | `'hit' \| 'miss'` | no | — | Scenario for `cache="cached"`. |
| `await` | `string` | no | — | Async data-read label for a server node (e.g. `"db: invoices"`). |
| `fallback` | `string` | no | — | Fallback UI text for a `kind="suspense"` node. |

Recursive: nested `<TraceNode>` children become tree children.

### `WireProp`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `name` | `string` | yes | — | Prop name. |
| `value` | `string` | no | — | Display value (e.g. `"() => …"`, `"{ id, name }"`). |
| `status` | `'ok' \| 'rejected' \| 'leak'` | yes | — | Wire outcome. `ok` = serializable, crosses cleanly. `rejected` = non-clonable (function, class instance) — Next throws at render. `leak` = serializable but sensitive (API key, full user row, session token) — crosses successfully, security bug. |
| `note` | `string` | no | — | One-line explanation shown beneath the row. |

Declared as a **direct child of the receiving `kind="client"` `<TraceNode>`**.

### `Phase`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | one of the six phase ids | yes | — | Which canonical phase this caption belongs to. |
| `caption` | `string` | no | — | Plain-text caption. Overridden by the default slot when both are present. |

## Slots

- **`RequestTrace` default** — any mix of `<TraceNode>` and `<Phase>` children, in any order. The script reads the placeholders at mount and builds the visible UI.
- **`TraceNode` default** — nested `<TraceNode>` children, plus `<WireProp>` children if the node is `kind="client"`. Any other content ignored.
- **`Phase` default** — rich caption (MDX: inline code, links). Takes precedence over the `caption` prop.

## Authoring

Boundary / wire / hydration trace:

```mdx
<RequestTrace title="Where does FilterBar run?" url="/invoices"
              phases="request,server-render,wire,hydrate">
  <TraceNode id="page" label="InvoicePage" kind="server">
    <TraceNode id="list" label="InvoiceList" kind="server" await="db: invoices" />
    <TraceNode id="filter" label="FilterBar" kind="client" />
  </TraceNode>

  <Phase id="server-render">
    Every component runs on the server first — including `FilterBar`. `"use client"` does
    not mean "skip the server"; it marks where **hydration** will later attach.
  </Phase>
  <Phase id="hydrate">
    Only now does `FilterBar` become interactive. `InvoiceList` shipped zero client JS.
  </Phase>
</RequestTrace>
```

Streaming trace:

```mdx
<RequestTrace title="Streaming a dashboard" phases="server-render,shell,stream">
  <TraceNode id="page" label="DashboardPage" kind="server" cache="static">
    <TraceNode id="header" label="Header" kind="server" cache="static" />
    <TraceNode id="rev" label="Suspense" kind="suspense" fallback="Revenue skeleton">
      <TraceNode id="revcard" label="RevenueCard" kind="server" await="db: revenue" />
    </TraceNode>
  </TraceNode>
</RequestTrace>
```

What crosses the wire:

```mdx
<RequestTrace title="Three props, three outcomes" phases="server-render,wire">
  <TraceNode id="page" label="InvoicePage" kind="server">
    <TraceNode id="row" label="InvoiceRow" kind="client">
      <WireProp name="invoice" value="{ id, total }" status="ok" />
      <WireProp name="onArchive" value="() => archive(id)" status="rejected"
                note="Functions are not serializable — pass a Server Action instead." />
      <WireProp name="currentUser" value="{ id, email, sessionToken }" status="leak"
                note="Serializable, so it crosses — but the token is now in client JS." />
    </TraceNode>
  </TraceNode>
</RequestTrace>
```

## Constraints & gotchas

- `<TraceNode>`, `<WireProp>`, and `<Phase>` must be **direct children** of `<RequestTrace>` (or, for nested `<TraceNode>` children, direct children of their parent `<TraceNode>`; for `<WireProp>`, direct children of their owning `kind="client"` `<TraceNode>`). The script walks placeholders via `:scope >` — deeper nesting is invisible.
- `<TraceNode id>` must be unique within a single `<RequestTrace>`.
- **An awaiting server node must be wrapped in `<Suspense>`** (or marked `cache="static"`). A `kind="server"` node with an `await` that is neither inside a `kind="suspense"` ancestor nor static-placed cannot exist in a real App Router — the shell stalls on the read. The engine surfaces this as a `needs <Suspense>` error state on the `shell`/`stream` phases and logs a `console.warn` so the author notices.
- `<WireProp>` is meaningful only on `kind="client"` nodes. A WireProp on a server or suspense node is ignored and the component logs a warning.
- The wire panel is rendered only when (a) the `wire` phase is in the visible phase set **and** (b) the trace declares at least one `<WireProp>`. Off-phase the panel fully collapses — and because the panel is the last element in the card, the scrubber and caption above it do not move.
- The component renders its own card chrome — don't wrap it in `<Figure>` (you'll get nested padding and borders).
- Tree depth: design for **3–7 nodes, depth ≤ 3**. Deeper trees should be split across multiple `RequestTrace` figures.
- The trace is **simulated** — Next.js, RSC, the bundler, none of it actually runs. The phase engine encodes the correct behaviour so AI-generated lessons stay correct by construction.
- Honours `prefers-reduced-motion: reduce`; node state is conveyed by text/`aria` labels in addition to colour.

## When to reach for it

- A lesson explains *what happens between writing a Server/Client Component and seeing it on screen*, and the misconception lives in the **order of events** (e.g. "`"use client"` means skip the server"; "the shell waits for the dynamic data"; "serializable means safe to send").
- A lesson teaches the **server→client boundary** specifically — which values cross, which throw, which leak. The wire panel exists for exactly this.
- A lesson teaches **PPR / streaming / cache** rendering models — static shell first, holes second, cache hit / miss / stored.
- The lesson is in Unit 4 (App Router execution model), particularly Ch 030–032. For the four-tool cache-invalidation **decision** tree (Ch 032.6), reach for `StateMachineWalker` instead — this component shows the render/stream pipeline, not branching decisions.

For arbitrary authored panels with no fixed phase vocabulary, use `DiagramSequence`. For "what causes a re-render in the client", reach for `RenderTracking`.

## Example

The full six-phase trace with cache markers covering dynamic-by-default, PPR static shell, and cache hit/miss (Ch 032 ground):

```mdx
<RequestTrace title="Six phases, with cache markers" url="/dashboard">
  <TraceNode id="root" label="DashboardPage" kind="server" cache="static">
    <TraceNode id="hdr" label="Header" kind="server" cache="static" />
    <TraceNode id="kpis" label="KpiStrip" kind="server" cache="cached" cacheState="hit" />
    <TraceNode id="cards" label="MetricsCard" kind="server" cache="cached" cacheState="miss" await="db: metrics" />
    <TraceNode id="bnd" label="Suspense" kind="suspense" fallback="Feed skeleton">
      <TraceNode id="feed" label="ActivityFeed" kind="server" await="db: events" />
    </TraceNode>
    <TraceNode id="filters" label="Filters" kind="client" />
  </TraceNode>
</RequestTrace>
```

The three §13 spec examples plus this six-phase trace live in [the demo page](../../../src/content/docs/0%20Demos/figures/request-trace-demo.mdx).

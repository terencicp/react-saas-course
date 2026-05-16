# `GraphExplorer` + `GraphNode` + `GraphEdge` + `Traversal`

A small graph on a stage with a click-to-explain side panel beneath it and optional play buttons that walk named paths through the graph. Clicking a node opens that node's side-panel content; clicking a labelled edge opens the relationship; clicking a play button steps a cursor through a sequence of nodes (and pulses each connecting edge), surfacing each node's panel as it goes. Layout is delegated to **Mermaid** — same DSL the rest of the course uses — so the author writes only the graph shape; ELK/dagre handles positioning.

Roughly a dozen chapter-specific diagram patterns fold into this one component — type hierarchies, module dependency graphs, trust topologies, CORS actor diagrams, signed-URL anatomy, and so on.

Provides its own outer card — do **not** wrap in `<Figure>`.

## Imports

```ts
import GraphExplorer from '../../../../components/figures/graph-explorer/GraphExplorer.astro';
import GraphNode from '../../../../components/figures/graph-explorer/GraphNode.astro';
import GraphEdge from '../../../../components/figures/graph-explorer/GraphEdge.astro';
import Traversal from '../../../../components/figures/graph-explorer/Traversal.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

### `GraphExplorer`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `title` | `string` | no | — | Short heading above the toolbar and stage. Plain text. |
| `direction` | `'TB' \| 'BT' \| 'LR' \| 'RL'` | no | `'TB'` | Mermaid flowchart direction. **Prefer `'LR'` (left-to-right) whenever the graph reads sensibly horizontally** — tall layouts push the side panel far below the diagram on narrow viewports, and reader-orienting at small widths gets hard. Use `'BT'` (bottom-up) for dependency graphs where leaves should sit at the bottom; reserve `'TB'` (top-down) for genuine top-down hierarchies. |
| `placeholder` | `string` | no | `"Click a box above to read what it represents. Labelled edges are clickable too — and if a play button is present, it walks the path for you."` | Body text shown in the side-panel before any interaction. Override when the default generic hint doesn't fit — e.g. an attack-path diagram might want `"Press 'Attack path' to see how a prompt injection escalates."` to point the reader at the right entry point. Plain text only; replaced by the node/edge content on first click. The "tip" pill label above it stays fixed. |

### `GraphNode`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | `string` | yes | — | Identifier referenced by every `<GraphEdge from="…">` / `<GraphEdge to="…">` and every `<Traversal sequence="…">`. Must be unique within a single `<GraphExplorer>`. Must be a Mermaid-safe identifier — letters, digits, underscores (no spaces, no hyphens). |
| `label` | `string` | yes | — | Text shown on the box. Spaces and most punctuation are fine. Angle brackets (`<App />`) are encoded automatically — write them naturally. |
| `group` | `string` | no | — | Optional cluster key — surfaced as `data-group` on the payload element for custom downstream styling. Not currently used by the renderer. |

The default slot is the side-panel content rendered when the node is clicked. Rich MDX — paragraphs, `inline code`, lists, links.

### `GraphEdge`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `from`, `to` | `string` | yes | — | Node ids. The edge points `from → to`. Mermaid draws the arrowhead at `to`. |
| `label` | `string` | no | — | Short text drawn at the edge midpoint. **Edges with no label are not clickable** — the panel only opens for labelled edges. Drop the label when the edges are pure connectors and the lesson lives in the nodes. |

The default slot is the side-panel content rendered when the edge label is clicked. Optional even on labelled edges — if absent, clicking the label still opens the panel and shows a fallback "Relationship: …" line. Reach for the slot whenever the relationship itself is the lesson (`extends` vs `implements`, "this is the leak", "this is the injection").

### `Traversal`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | `string` | yes | — | Identifier for the traversal. Used as a stable key when multiple traversals share the same graph. |
| `label` | `string` | yes | — | Text on the play button ("Boot order", "Happy path", "Attack path"). |
| `sequence` | `string` | yes | — | Comma-separated node ids to walk in order. Edges between consecutive ids are inferred and pulsed automatically — the sequence does not need to follow arrow direction (boot order walks leaves-first while edges point dependent → dependency, and that's fine). |
| `nodesOnly` | `boolean` | no | `false` | When set, the cursor hops node-to-node without dwelling on the connecting edges. Edges stay clickable and labelled; only the *animation* changes. Use when edge labels are detail-on-click rather than steps in the walk (e.g. a request lifecycle where the labels carry SQL strings or cache headers and the rhythm is "where is the request now?"). |

Self-closing — no slot, no children.

## Slots

- **`GraphExplorer` default** — any mix of `<GraphNode>`, `<GraphEdge>`, and `<Traversal>` children, in any order. The script reads the payload elements at mount and builds the visible UI.
- **`GraphNode` default** — the node's side-panel content.
- **`GraphEdge` default** — the labelled-edge's side-panel content (optional).

## Constraints & gotchas

- `<GraphNode>`, `<GraphEdge>`, and `<Traversal>` must be **direct children** of `<GraphExplorer>`. They're discovered via `:scope > [data-ge-node]` etc.; deeper nesting is invisible.
- Node ids must be **Mermaid-safe** — start with a letter, contain letters / digits / underscores only. Hyphens break the flowchart parser. The `label` is the user-facing string, so put spaces or special characters there.
- A `<GraphEdge>` between two nodes that don't exist is silently dropped by Mermaid — the explorer renders without the arrow, no warning. Re-check spelling when an arrow is missing.
- A `<Traversal sequence="…">` referencing a missing node id walks the rest of the sequence and silently skips the bad step. Re-check spelling when the play button looks like it's "pausing".
- Edges without a `label` are non-clickable; the side panel can't reach them. If you want the relationship to be explorable, the edge needs a label.
- **Prefer horizontal layouts** (`direction="LR"` or `"RL"`) over vertical for any graph with 4+ nodes. Tall layouts read poorly on narrow viewports (the side panel sits far below the diagram) and the stage gets cropped on small screens.
- This component is a complete figure card — don't wrap it in `<Figure>` (you'll get nested padding and borders).
- The panel reserves space from page load with placeholder copy ("Click any node or labelled edge"). Don't restate the same instruction in surrounding prose. If the generic hint isn't a fit — e.g. the diagram leads with a `<Traversal>` and you want readers to press the play button rather than click a node — override the body via the `placeholder` prop instead of writing instructions in the lesson text.

## When to reach for it

- A small, dense graph (3–8 nodes) where the lesson is *each entity's role plus how they connect*. The student reads the shape at a glance, then clicks each node to learn what it represents.
- A topology overview where edges carry the lesson (`extends` vs `implements`, "this is the trust boundary", "this is the injection vector"). Labelled edges become clickable explanations.
- A walk through the same graph multiple times — happy path vs attack path, baseline boot order vs cycle-broken order. One `<GraphExplorer>` with multiple `<Traversal>` children renders one play button per walk.
- *Not* the right fit for a decision tree (use `StateMachineWalker` — one path committed at a time, not a static graph), a temporal scrub (use `DiagramSequence`), or a file hierarchy (use Starlight's `<FileTree>`). For static architecture diagrams that don't need click-to-explain, prefer a plain ` ```mermaid ` / ` ```d2 ` fenced block.

## Authoring

Two paths — happy vs attack — with edges that carry their own lesson:

```mdx
<GraphExplorer title="LLM agent trust boundaries" direction="LR">
  <GraphNode id="user" label="user">…</GraphNode>
  <GraphNode id="agent" label="agent">…</GraphNode>
  <GraphNode id="tool" label="tool">…</GraphNode>
  <GraphNode id="external" label="external doc">**Untrusted.**</GraphNode>
  <GraphNode id="effect" label="side effect">…</GraphNode>

  <GraphEdge from="user" to="agent" label="prompt" />
  <GraphEdge from="agent" to="tool" label="call" />
  <GraphEdge from="tool" to="external" label="reads">
    This is the leak — tool reads pull *untrusted content* into the agent's context.
  </GraphEdge>
  <GraphEdge from="external" to="agent" label="injection">
    The attack: a retrieved document contains "ignore your instructions and …".
  </GraphEdge>
  <GraphEdge from="tool" to="effect" label="triggers" />

  <Traversal id="happy" label="Happy path" sequence="user,agent,tool,effect" />
  <Traversal id="attack" label="Attack path" sequence="user,agent,tool,external,agent,tool,effect" />
</GraphExplorer>
```

## Animation behaviour

Each transition between consecutive nodes in a traversal is a five-frame cross-fade — `A` → `A + edge` → `edge` → `edge + B` → `B` — so something stays lit throughout the handoff (no abrupt off+on flash):

- **Solo node** (~700ms) — the focus moment; side panel shows that node's content.
- **`A + edge`** (~220ms) — outgoing edge lights up while `A` is still on.
- **`edge` alone** (~220ms) — `A` turns off; the edge carries the transition.
- **`edge + B`** (~220ms) — `B` lights up while the edge is still on; panel switches to `B`.
- **Solo `B`** (~700ms) — edge turns off; the next transition begins.

The panel updates only when a new node enters the active set, so the in-flight overlap frames don't churn the side-panel content. The exception: an edge with authored slot content briefly surfaces its panel during its solo phase (extended to ~600ms so the panel is actually readable). Generic edges (`depends on`, `prompt`) leave the panel on the previous node — no distracting fallback text.

Other rules:

- Edges with a `label` highlight the label chip (accent-coloured background); edges without one highlight the path stroke instead — so unlabelled paths still pulse visibly.
- A `<Traversal nodesOnly>` traversal skips all the edge phases — the cursor hops `A` → `B` directly, with edges staying fully clickable but uninvolved in the animation.
- If two consecutive nodes in a sequence have no edge between them, the overlap phases are also skipped (defensive — sequences can include gaps).
- Clicking the playing tab stops mid-walk; clicking a different tab switches walks. Reduced-motion users get instant transitions (every dwell collapses to 0).

# Diagrams — when to use what

How to pick a diagram tool for a lesson. Decisions here optimize for **AI-authorable, low-effort, legible at the senior level**, in that order.

Working assumption: AI agents fail at hand-positioned diagrams. Any tool with a real layout engine constrains the agent into producing something usable; any tool without one (raw SVG, hand-positioned HTML) will easily fail. Pick the engine whose *output shape* matches the diagram's shape.

---

## Pick by shape

| Diagram shape | Top pick | Strong fallback | Why |
| --- | --- | --- | --- |
| **System architecture** (services + traffic) | D2 | Mermaid | ELK orthogonal routing + `cloud { … }` containers. Mermaid's dagre tangles at 10+ nodes. |
| **State machine** | D2 | Mermaid | ELK keeps the back-edges (returns to the initial state) from tangling with the forward flow. Mermaid's `stateDiagram-v2` has the `[*]` initial-state marker but a busier layout. |
| **Sequence diagram** (actors over time) | Mermaid | D2 | `sequenceDiagram` with `autonumber` + `alt … else … end` blocks. D2's `shape: sequence_diagram` is close, no alt blocks. |
| **Decision tree / flowchart** | Mermaid `flowchart LR` | D2 `direction: right` | **Lay it out horizontally.** Same tree fits in ~260 px (Mermaid LR) / ~180 px (D2 right) vs 420+ px for any top-down version. Native diamond syntax (`{…}`) makes Mermaid the cleanest source; D2 trails on source verbosity but routes edges slightly tighter. |
| **File / dependency tree** | Starlight `<FileTree>` | Plain HTML `<ul>` | A markdown bullet list with folder/file icons. The "tree" is already in the indentation; engines are overkill. |
| **ER diagram** (database schema) | D2 `shape: sql_table` | Mermaid `erDiagram` | D2 connects specific FK columns, so junction tables and multi-FK fan-in disambiguate cleanly; ELK routing stays legible past 4 tables. Mermaid's crow's-foot is more legible on small schemas (≤4 tables, no composite keys). Use `direction LR` on Mermaid to keep it compact. |
| **Gantt** (parallel tasks on a shared time axis) | Mermaid `gantt` | HTML + CSS bar grid | Mermaid generates the time axis and tick marks; HTML+CSS works for small bar grids but the axis is hand-authored. For sequential phase strips (no parallelism), prefer HTML+CSS — Mermaid pays for a layout engine on a diagram with no positioning to compute. Increase font size via `themeCSS` in the init directive. |
| **Annotated illustration** (geometric artifact + callouts) | HTML + CSS | Hand-coded SVG | HTML when the artifact *is* a layout concept you can render with real CSS (box model, flex axes, grid tracks) and the result is devtools-inspectable. SVG when leader lines need to land precisely or labels sit on multiple sides. |

---

## Engines

Available engines, sorted by preference:

| Engine | Use for | Avoid for |
| --- | --- | --- |
| **Mermaid** — ` ```mermaid ` fences, client-rendered via [astro-mermaid](https://github.com/joesaby/astro-mermaid) | Default text-based diagrams: state machines, sequences, flowcharts, ER, gantt. | Dense graphs (dagre tangles past ~10 nodes); diagrams of concrete objects. |
| **D2** — ` ```d2 ` fences, build-time SVG via [astro-d2](https://astro-d2.vercel.app/) (D2.js/WASM, no binary) | System architecture, dense graphs, nested hierarchies, sequences when you want page-wide style consistency. | `alt…else…end` branching (use Mermaid); fast live-edit loops (WASM re-runs on save). |
| **Starlight `<FileTree>`** | File / directory listings. | Anything that isn't a strict file hierarchy. |
| **`<ArrowDiagram>`** ([component](../src/components/figures/ArrowDiagram.astro)) — HTML boxes + `arrows` array drawn by [leader-line-new](https://github.com/anseki/leader-line) | Annotated illustrations where boxes are custom HTML (mixed text + code + spans). | Generic node-graphs (use a DSL); 8+ nodes (socket/gravity tuning explodes). |
| **Hand-coded SVG** — inline `<svg>`, themed via `var(--sl-color-*)` | "Picture of a specific thing": box model, HTTP request line, memory layout, custom shape composition. | Generic boxes-and-arrows — a DSL beats SVG on every axis. |
| **Plain HTML + CSS** — `<div>`/`<ul>`/flex/grid, no JS | Nested hierarchies, color-coded segments with callouts, layout concepts rendered with real CSS (devtools-inspectable). | Anything that needs arrows. |

# Diagrams

How to pick a diagram tool for a lesson. Decisions here optimize for **AI-authorable, low-effort**.

Working assumption: AI agents fail at hand-positioned diagrams. Any tool with a real layout engine constrains the agent into producing something usable. Pick the engine whose *output shape* matches the diagram's shape.

Vertical-space constraint: laptop viewports are wide but short — prefer horizontal layouts and cap diagram height, compress elements vertically. Consider ~800px the maximum height for a diagram's main container (including caption).

All diagrams should be wrapped in our custom [`<Figure>` component](../components/figures/figure.md).

## Pick by shape

| Diagram shape | Top pick | Strong fallback |
| --- | --- | --- |
| **System architecture** (services + traffic) | D2 | Mermaid |
| **State machine** | D2 | Mermaid |
| **Sequence diagram** (actors over time) | Mermaid | D2 |
| **Decision tree / flowchart** | Mermaid `flowchart LR` | D2 `direction: right` |
| **File / dependency tree** | Starlight `<FileTree>` | Plain HTML `<ul>` |
| **ER diagram** (database schema) | D2 `shape: sql_table` | Mermaid `erDiagram` |
| **Gantt** (parallel tasks on a shared time axis) | Mermaid `gantt` | HTML + CSS bar grid |
| **Annotated illustration** (geometric artifact + callouts) | HTML + CSS | `<ArrowDiagram>` |

## Engines

Available engines, sorted by preference:

| Engine | Use for | Doc |
| --- | --- | --- |
| **Mermaid** | Sequences, flowcharts, gantt; state machines and small ER schemas as a D2 fallback. | [./mermaid.md](./mermaid.md) |
| **D2** | System architecture, state machines, ER schemas, dense graphs, nested hierarchies, sequences when you want page-wide style consistency. | [./d2.md](./d2.md) |
| **`<FileTree>`** | Starlight file / directory listings. | [../components/starlight/file-tree.md](../components/starlight/file-tree.md) |
| **Plain HTML + CSS** | Nested hierarchies, color-coded segments with callouts, sequential phase strips (timelines without parallelism), layout concepts rendered with real CSS (devtools-inspectable). | [./html-css.md](./html-css.md) |
| **Hand-coded SVG** | "Picture of a specific thing": box model, HTTP request line, memory layout, custom shape composition. | [./svg.md](./svg.md) |
| **`<ArrowDiagram>`** | Annotated illustrations where boxes are custom HTML and need lines between them. | [../components/figures/arrow-diagram.md](../components/figures/arrow-diagram.md) |

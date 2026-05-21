# Mermaid

> _This document distills lessons learned from diagrams already built in this course. Treat it as a kick-starter for new diagrams, not a strict guide._

`astro-mermaid` is wired in [astro.config.mjs](../../astro.config.mjs) with `autoTheme: true` (light/dark follows Starlight). Author Mermaid in fenced ` ```mermaid ` blocks inside MDX — each block is replaced with `<pre class="mermaid">` at build time and rendered to SVG client-side. Live reference: [`src/content/docs/0 Demos/diagrams/mermaid-demo.mdx`](../../src/content/docs/0%20Demos/diagrams/mermaid-demo.mdx).

## Boilerplate

```mdx
import Figure from '../../../components/figures/Figure.astro';

<Figure caption="Short caption (Unit X)">
```mermaid
…diagram source…
```
</Figure>
```

Every Mermaid block must be wrapped in `<Figure>` ([guidelines](./INDEX.md)).

## Failure mode

A parse error renders a red box inside the figure with the offending line — visible in the browser. The two non-obvious causes that bit me:

- **Literal `;` in message text** — Mermaid uses `;` as a statement separator. Escape with the HTML entity `#59;` (works for any reserved char, e.g. `#9829;` for ♥).
- **`<` or `>` anywhere in an init-directive string value** — Mermaid's `sanitize()` silently deletes any directive value containing either character, so init/themeCSS just stops working. Use descendant selectors (space), not child (`>`).

## Per-diagram config via `%%{init}%%`

```mermaid
%%{init: {'theme': 'forest'}}%%
flowchart LR
```

Most config keys are overridable per-diagram even though `securityLevel` is `'strict'` (the project default). Use **single quotes** around keys and string values — Mermaid globally rewrites single→double quotes before `JSON.parse`.

## Font size on wide diagrams

A dense sequence or flowchart can produce an SVG several thousand viewBox-pixels wide; Starlight scales the SVG to the figure card (~640px), shrinking text to ~6px. Two things to know before reaching for a fix:

- `sequence: { actorFontSize, … }` (and the analogous keys for other types) **does not work** — Mermaid's renderer unconditionally overrides them with the root `fontSize`.
- Bumping the root `fontSize` doesn't help on screen — Mermaid grows the layout proportionally, so the viewBox-to-card scale shrinks by the same factor.

The fix is `themeCSS` in the init directive. It injects raw CSS into a `<style>` inside the SVG, bumping the *rendered* text without affecting Mermaid's *layout*, so the SVG stays at its compact default-font width and the text reads bigger after the scale-down:

```mermaid
%%{init: {'themeCSS': '.messageText, .messageText tspan { font-size: 22px !important; }'} }%%
sequenceDiagram
…
```

Selectors target whatever CSS classes Mermaid emits for that diagram type (`.actor`, `.messageText`, `.noteText` for sequences; inspect the rendered SVG for others). 18–22px is a safe range — going much higher overflows the boxes Mermaid sized for default 14/16px text.

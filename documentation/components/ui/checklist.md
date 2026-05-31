# `Checklist` + `ChecklistItem`

A tickable checklist the student works through as they build. Each `<ChecklistItem>` renders a checkbox plus a requirement, with an optional `tested`/`untested` chip. Ticked state **persists** in `localStorage`, keyed by the page path and the checklist `id`, so progress survives a reload. Items never reorder, so saved state maps to source order — keep item order stable across edits.

Use it for the project-lesson Implementation brief (the requirements checklist under "Your mission") and for the manual-verification checklist under "Moment of truth". Put two checklists on one page by giving each a distinct `id`.

## Imports

```ts
import Checklist from '../../../components/ui/checklist/Checklist.astro';
import ChecklistItem from '../../../components/ui/checklist/ChecklistItem.astro';
```

(Relative to a lesson at `src/content/docs/<chapter>/<lesson>.mdx`.)

## Props

### `Checklist`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `id` | `string` | no | DOM index on the page | Stable key for persistence. Set it when a page has more than one checklist so their saved state never collides. |

### `ChecklistItem`

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `chip` | `'tested' \| 'untested'` | no | — | Renders a small styled pill after the requirement. Omit it for an unannotated item. |

## Slots

- **`Checklist` default** — one or more `<ChecklistItem>` children.
- **`ChecklistItem` default** — the requirement. Inline markdown works (`code`, emphasis, links).

## Constraints & gotchas

- Clicking anywhere on a row toggles its checkbox; the box is also keyboard-focusable with a label derived from the row text.
- State is keyed by `location.pathname` + `id`. If you reorder or insert items, earlier ticks shift with the index — fine in practice since the student re-checks as they go.
- Keep item text to one observable outcome. The component is a progress tracker, not a place for multi-paragraph prose.

## Example

A "Your mission" requirements checklist (no chips) followed by a "Moment of truth" manual-verification checklist (untested items chipped):

````mdx
<Checklist id="mission">
  <ChecklistItem>Visiting `/invoices?status=paid` shows only paid invoices.</ChecklistItem>
  <ChecklistItem>An empty result renders the empty state, not a blank table.</ChecklistItem>
  <ChecklistItem>The status filter survives a page reload.</ChecklistItem>
</Checklist>
````

````mdx
<Checklist id="verify">
  <ChecklistItem chip="untested">Toggling status updates the URL query string.</ChecklistItem>
  <ChecklistItem chip="untested">The page works with JavaScript disabled (server-rendered filter).</ChecklistItem>
</Checklist>
````

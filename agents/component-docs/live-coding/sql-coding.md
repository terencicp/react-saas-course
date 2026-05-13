# `SQLCoding`

CodeMirror SQL editor wired to a Postgres database running in WebAssembly via [PGlite](https://pglite.dev). The seed (DDL + INSERTs) is re-applied before every run, so each click starts from a deterministic state — previous attempts can't leak.

With `expectedRows`, the result-row checklist flips ✓ when the student's query matches (per-column subset; extra columns are harmless). Without it, the card is a pure sandbox.

## Import

```ts
import SQLCoding from '../../../../components/live-coding/SQLCoding/SQLCoding.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `seed` | `string` | yes | — | DDL + INSERT SQL re-applied before every run. Whatever the student needs to query against. |
| `starter` | `string` | yes | — | SQL the editor opens with. Postgres dialect. |
| `instructions` | `string` | no | — | One-paragraph framing rendered above the editor. |
| `expectedRows` | `Record<string, unknown>[]` | no | — | Rows the student's query must return. Subset-matched per column. Omit for a pure sandbox. |
| `ordered` | `boolean` | no | `true` | Whether row order is checked in the comparison. Set `false` when the SELECT has no `ORDER BY`. |
| `hideSeed` | `boolean` | no | `false` | Hide the "View schema & data" `<details>` panel above the editor. |
| `maxHeight` | `number` | no | `320` | Editor height cap, in px. Forwarded as `--lc-max-h`. |

## Constraints & gotchas

- No `import` boilerplate inside the editor — students write raw SQL.
- The schema is dropped and re-applied on every Run; do not assume rows from a previous query persist.
- Row matching is **per-column subset** — `SELECT *` still passes an exercise that pinned only `{ name: '…' }`. Pick column names carefully when ambiguity matters.
- Postgres errors surface verbatim in the red panel below the editor. Useful for "fix the typo" exercises (`SELEKT name FROM users`).
- AI feedback only renders when criteria are present (i.e. `expectedRows` non-empty).

## Example

Sandbox card (no criteria):

````mdx
<SQLCoding
  instructions="Try changing the SELECT to see how the result table updates."
  seed={`CREATE TABLE users (id int PRIMARY KEY, name text NOT NULL);
INSERT INTO users (id, name) VALUES (1, 'Alice'), (2, 'Bob');`}
  starter={`SELECT name FROM users;`}
/>
````

Graded card with unordered match:

````mdx
<SQLCoding
  instructions="Return every distinct org name. Order is not checked."
  seed={`CREATE TABLE orgs (id int PRIMARY KEY, name text NOT NULL);
INSERT INTO orgs (id, name) VALUES (1, 'Acme'), (2, 'Globex'), (3, 'Initech');`}
  starter={`SELECT name FROM orgs;`}
  expectedRows={[
    { name: 'Globex' },
    { name: 'Acme' },
    { name: 'Initech' },
  ]}
  ordered={false}
/>
````

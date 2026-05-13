# `DrizzleCoding`

CodeMirror TypeScript editor wired to a Postgres database in WebAssembly ([PGlite](https://pglite.dev)) fronted by [Drizzle ORM](https://orm.drizzle.team). The widget walks the Drizzle `schema` via `getTableConfig` and emits the matching `CREATE TABLE` DDL automatically, so the lesson author writes the schema once. The schema is dropped, regenerated, and re-seeded before every run.

With `expectedRows`, the result-row checklist flips ✓ when the student's query matches (per-column subset). Without it, the card is a pure sandbox.

For schema-design exercises (where the student writes the schema and the grader checks the table/column/constraint shape), use [`DrizzleSchemaCoding`](./drizzle-schema-coding.md) instead.

## Import

```ts
import DrizzleCoding from '../../../../components/live-coding/DrizzleCoding/DrizzleCoding.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `schema` | `string` | yes | — | Drizzle `pgTable(...)` table definitions as TS source. Visible to the student in the "Schema & seed rows" `<details>` panel. Single source of truth — DDL is generated from this. |
| `seed` | `string` | yes | — | Raw SQL `INSERT`s (plus any DDL Drizzle can't express — extensions, etc.). Re-applied per run. Pass `''` for an empty database. |
| `starter` | `string` | yes | — | TS code the editor opens with. The student is expected to `return` the query result (or an awaited Drizzle query). |
| `instructions` | `string` | no | — | One-paragraph framing rendered above the editor. |
| `expectedRows` | `Record<string, unknown>[]` | no | — | Rows the student's query must return. Subset-matched per column. Omit for a pure sandbox. |
| `ordered` | `boolean` | no | `true` | Whether row order is checked. Set `false` when the query has no `orderBy`. |
| `hideSchema` | `boolean` | no | `false` | Hide the "Schema & seed rows" panel above the editor. |
| `maxHeight` | `number` | no | `360` | Editor height cap, in px. |

## What's in scope inside the editor

The runtime pre-imports Drizzle and exposes the common surface as **globals** — students do not write `import` statements:

- `db` — the Drizzle instance, connected to PGlite.
- Every top-level `const` declared in `schema` (e.g. `users`, `orgs`).
- Operators — `eq`, `ne`, `and`, `or`, `not`, `gt`, `gte`, `lt`, `lte`, `isNull`, `isNotNull`, `inArray`, `like`, `ilike`, `between`, `exists`, `asc`, `desc`, `count`, `sum`, `avg`, `min`, `max`, `sql`, …
- Column builders — `pgTable`, `integer`, `text`, `varchar`, `timestamp`, `boolean`, `serial`, `uuid`, `jsonb`, `primaryKey`, `foreignKey`, `unique`, `index`, …

## Constraints & gotchas

- The student's code must `return` the rows (or an awaited Drizzle query) — the runtime reads the return value and compares it to `expectedRows`.
- Don't duplicate DDL between `schema` and `seed` — the schema panel emits `CREATE TABLE`s automatically. Use `seed` only for inserts and auxiliary SQL.
- Row matching is per-column subset; pinning `{ name: '…' }` accepts `db.select().from(users)` that also returns `id`, `email`, etc.
- Runtime errors surface verbatim in the red panel below the editor.
- AI feedback only renders when `expectedRows` is non-empty.

## Example

````mdx
<DrizzleCoding
  instructions="Return Acme users who have never logged in (name and email)."
  schema={`export const orgs = pgTable('orgs', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
});

export const users = pgTable('users', {
  id: integer('id').primaryKey(),
  orgId: integer('org_id').references(() => orgs.id),
  name: text('name').notNull(),
  email: text('email').notNull(),
  lastLogin: timestamp('last_login'),
});`}
  seed={`INSERT INTO orgs (id, name) VALUES (1, 'Acme');
INSERT INTO users (id, org_id, name, email, last_login) VALUES
  (1, 1, 'Alice', 'alice@acme.example', '2026-05-09 14:00Z'),
  (2, 1, 'Carol', 'carol@acme.example', NULL);`}
  starter={`return await db
  .select({ name: users.name, email: users.email })
  .from(users)
  .where(and(eq(users.orgId, 1), /* finish: never logged in */));`}
  expectedRows={[
    { name: 'Carol', email: 'carol@acme.example' },
  ]}
/>
````

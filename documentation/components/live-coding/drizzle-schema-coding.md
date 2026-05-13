# `DrizzleSchemaCoding`

Schema-design counterpart to `DrizzleCoding`. The student writes a Drizzle `pgTable` schema; the grader walks every top-level table with `getTableConfig`, compares against the declared `requirements` (which tables, which columns, which flags, which constraints), and optionally runs SQL **probes** — INSERTs that the schema should accept or reject — against a fresh PGlite. Each criterion in the checklist names what's missing on a ✗.

For query exercises (student writes a query against a fixed schema), use [`DrizzleCoding`](./drizzle-coding.md) instead.

## Import

```ts
import DrizzleSchemaCoding from '../../../../components/live-coding/DrizzleSchemaCoding/DrizzleSchemaCoding.astro';
```

(Relative to a lesson at `src/content/docs/<unit>/<chapter>/<lesson>.mdx`.)

## Props

| Prop | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `starter` | `string` | yes | — | TS the editor opens with. A partial Drizzle schema. |
| `instructions` | `string` | no | — | One-paragraph framing rendered above the editor. |
| `requirements` | `TableRequirement[]` | no | — | What the student's schema must define. Omit for a pure sandbox (only the introspection panel renders). |
| `probes` | `ProbeSpec[]` | no | — | SQL probes run against the emitted DDL. Each must succeed or fail as declared. |
| `seedSQL` | `string` | no | `''` | Auxiliary SQL applied **after** the student's DDL, **before** probes (extensions, seed rows the probes depend on). |
| `maxHeight` | `number` | no | `360` | Editor height cap, in px. |

### `TableRequirement`

| Field | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `name` | `string` | yes | — | Table name as it must appear in the schema. |
| `columns` | `ColumnRequirement[]` | yes | — | Per-column requirements (see below). |
| `primaryKey` | `string[]` | no | — | Composite primary key — array of column names. Single-column PKs go on the column via `primaryKey: true`. |
| `uniques` | `string[][]` | no | — | Composite unique constraints — each entry is an array of column names. |

### `ColumnRequirement`

| Field | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `name` | `string` | yes | — | Column name. |
| `type` | `string` | no | — | Postgres SQL type prefix — `'text'`, `'integer'`, `'varchar'`, `'timestamp'`. Matches `col.getSQLType()` either exactly or by prefix, so `varchar(100)` matches `varchar` and `timestamp with time zone` matches `timestamp`. Omit to accept any type. |
| `notNull` | `boolean` | no | — | Require `.notNull()`. PRIMARY KEY columns count as not-null automatically. |
| `primaryKey` | `boolean` | no | — | Require `.primaryKey()` on the column. |
| `unique` | `boolean` | no | — | Require a single-column `unique()` on this column. |
| `hasDefault` | `boolean` | no | — | Require `.default(...)` or `.defaultNow()`. |
| `references` | `{ table: string; column: string }` | no | — | Require a single-column FK to the named table.column. |

### `ProbeSpec`

| Field | Type | Required | Default | Purpose |
| --- | --- | --- | --- | --- |
| `description` | `string` | yes | — | Plain-language label rendered in the checklist. |
| `sql` | `string` | yes | — | SQL run after the student's DDL (and `seedSQL`). |
| `mustSucceed` | `boolean` | no | `true` | When `true`, the SQL must succeed. When `false`, it must throw — proving the schema's constraint rejects the input. |

## What's in scope inside the editor

The runtime exposes the same globals as `DrizzleCoding`:

- Builders — `pgTable`, `pgSchema`, `pgEnum`, `integer`, `bigint`, `serial`, `text`, `varchar`, `boolean`, `timestamp`, `date`, `uuid`, `jsonb`, `primaryKey`, `foreignKey`, `unique`, `check`, `index`, …
- Operators — `eq`, `and`, `or`, `sql`, `relations`, … (for `sql\`now()\`` defaults and other inline SQL).

Top-level `export const X = pgTable(...)` declarations are introspected automatically — no manual registration.

## Constraints & gotchas

- The grader looks at **top-level** `pgTable` declarations. Nested or conditional declarations won't be picked up.
- Type matching is prefix-friendly — `varchar('email', { length: 100 })` (SQL type `varchar(100)`) matches a requirement of `type: 'varchar'`. Strict equality covers parameter-less types (`text`, `integer`, `boolean`, `uuid`, `jsonb`, `date`).
- If a probe's `sql` references a column or constraint the student hasn't built yet, the probe will fail with a Postgres error — the failure tells the student what's missing.
- The "What your schema produced" panel renders even on failed runs, so the student can compare what they defined against what the requirements wanted.
- AI feedback only renders when criteria are present (requirements OR probes).

## Example

Composite unique with constraint probes:

````mdx
<DrizzleSchemaCoding
  instructions="Add a composite UNIQUE (org_id, slug) to pages so the probe's duplicate insert is rejected."
  starter={`export const orgs = pgTable('orgs', {
  id: integer('id').primaryKey(),
  name: text('name').notNull(),
});

export const pages = pgTable('pages', {
  id: integer('id').primaryKey(),
  orgId: integer('org_id').notNull().references(() => orgs.id),
  slug: text('slug').notNull(),
  title: text('title').notNull(),
  // add the composite unique below the column block
}, (table) => []);`}
  requirements={[
    {
      name: 'pages',
      columns: [
        { name: 'id',     type: 'integer', primaryKey: true },
        { name: 'org_id', type: 'integer', notNull: true,
          references: { table: 'orgs', column: 'id' } },
        { name: 'slug',   type: 'text',    notNull: true },
        { name: 'title',  type: 'text',    notNull: true },
      ],
      uniques: [['org_id', 'slug']],
    },
  ]}
  seedSQL={`INSERT INTO orgs (id, name) VALUES (1, 'Acme'), (2, 'Globex');`}
  probes={[
    {
      description: 'Two pages can share a slug across different orgs',
      sql: `INSERT INTO pages (id, org_id, slug, title) VALUES
        (1, 1, 'home', 'Acme home'),
        (2, 2, 'home', 'Globex home');`,
      mustSucceed: true,
    },
    {
      description: 'Two pages cannot share a slug within the same org',
      sql: `INSERT INTO pages (id, org_id, slug, title) VALUES
        (3, 1, 'about', 'Acme about'),
        (4, 1, 'about', 'duplicate');`,
      mustSucceed: false,
    },
  ]}
/>
````

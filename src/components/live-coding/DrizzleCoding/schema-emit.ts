// Generate CREATE TABLE DDL from a Drizzle schema. The lesson author writes
// the Drizzle schema (the single source of truth, per Chapter 6.2.1) and the
// row inserts; we walk the schema with drizzle-orm's introspection (no
// drizzle-kit in the worker bundle — too heavy, and only the runtime subset
// is needed) and emit the matching CREATE TABLEs ahead of the inserts.
//
// Scope: enough to cover the column / PK / FK / NOT NULL / DEFAULT vocabulary
// the course teaches in Unit 6. Composite PKs and table-level uniques are
// handled; indexes, enums, and check constraints are not yet — they're either
// not load-bearing for query correctness (indexes) or rare in lesson code
// (enums, checks). Extend the column-type and constraint switch as Unit 6
// adds chapters.

import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { is, sql } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';

/** Heuristic: every `const|let|var X = pgTable(...)` declared at the top level
 * is a schema export. Naive on purpose — lessons write idiomatic schema files,
 * not metaprogrammed helpers. If a lesson wraps `pgTable` in a factory the
 * lesson author falls back to writing the DDL themselves alongside the
 * inserts. */
export function extractTopLevelTableNames(source: string): string[] {
  const pattern = /^[ \t]*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*pgTable\s*\(/gm;
  const names: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    names.push(match[1]);
  }
  return names;
}

/** Generate DDL for one table — `CREATE TABLE "name" (...columns, ...constraints);`. */
export function emitTableDDL(table: unknown): string {
  if (!is(table, PgTable)) {
    throw new Error('emitTableDDL: argument is not a Drizzle pgTable');
  }
  const cfg = getTableConfig(table as PgTable);

  const lines: string[] = [];

  for (const col of cfg.columns) {
    const parts: string[] = [quoteIdent(col.name), col.getSQLType()];
    if (col.primary) {
      parts.push('PRIMARY KEY');
    } else if (col.notNull) {
      // Postgres treats PRIMARY KEY as implying NOT NULL — emitting both is
      // valid but redundant.
      parts.push('NOT NULL');
    }
    if (col.hasDefault && col.default !== undefined) {
      parts.push(`DEFAULT ${formatDefault(col.default)}`);
    }
    lines.push('  ' + parts.join(' '));
  }

  // Composite primary keys are declared at the table level via `primaryKey`
  // helper — single-column PKs go through the column flag above instead.
  for (const pk of cfg.primaryKeys) {
    const cols = pk.columns.map((c) => quoteIdent(c.name)).join(', ');
    lines.push(`  PRIMARY KEY (${cols})`);
  }

  for (const fk of cfg.foreignKeys) {
    const ref = fk.reference();
    const localCols = ref.columns.map((c) => quoteIdent(c.name)).join(', ');
    const foreignTable = quoteIdent(getTableConfig(ref.foreignTable).name);
    const foreignCols = ref.foreignColumns.map((c) => quoteIdent(c.name)).join(', ');
    let clause = `  FOREIGN KEY (${localCols}) REFERENCES ${foreignTable} (${foreignCols})`;
    if (fk.onDelete) clause += ` ON DELETE ${fk.onDelete}`;
    if (fk.onUpdate) clause += ` ON UPDATE ${fk.onUpdate}`;
    lines.push(clause);
  }

  for (const u of cfg.uniqueConstraints) {
    const cols = u.columns.map((c) => quoteIdent(c.name)).join(', ');
    lines.push(`  UNIQUE (${cols})`);
  }

  return `CREATE TABLE ${quoteIdent(cfg.name)} (\n${lines.join(',\n')}\n);`;
}

/** Emit DDL for every PgTable in the iterable, joined with blank lines. */
export function emitSchemaDDL(tables: Iterable<unknown>): string {
  const stmts: string[] = [];
  for (const t of tables) {
    if (is(t, PgTable)) stmts.push(emitTableDDL(t));
  }
  return stmts.join('\n\n');
}

// Always quote identifiers — Postgres folds unquoted ones to lowercase, and
// drizzle's column names mirror the user's typed casing.
function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

function formatDefault(v: unknown): string {
  // sql`expr` produces a tagged template that drizzle stores as a SQL object.
  // The introspected form is `{ queryChunks, ... }`; the safe way to render
  // is to ask the SQL helper for its raw text — but that needs a dialect
  // instance. As a pragmatic fallback we recognise the common literals and
  // pass anything else through verbatim with a Postgres cast. The most
  // common SQL-default in lesson code is `now()` for timestamps; we special-
  // case it below.
  if (v === null) return 'NULL';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
  if (isSqlObject(v)) {
    // Best-effort: serialise the SQL object's first string chunk. Lessons
    // mostly default with literals or `sql\`now()\``, both of which round-trip.
    const text = trySerializeSql(v);
    if (text) return text;
  }
  return String(v);
}

function isSqlObject(v: unknown): v is SQL {
  return typeof v === 'object' && v !== null && 'queryChunks' in (v as object);
}

function trySerializeSql(v: SQL): string | null {
  // SQL.queryChunks is an array of string fragments and Param objects. For
  // simple literal-SQL defaults (`sql\`now()\``, `sql\`uuid_generate_v4()\``)
  // it's a single string. Anything richer falls through.
  const chunks = (v as unknown as { queryChunks?: unknown[] }).queryChunks;
  if (!Array.isArray(chunks)) return null;
  if (chunks.length === 1 && typeof chunks[0] === 'string') {
    return chunks[0];
  }
  return null;
}

// Re-export so the worker can import everything from one path.
export { is, sql, PgTable };

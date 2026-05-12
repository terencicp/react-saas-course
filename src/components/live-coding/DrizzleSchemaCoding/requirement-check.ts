// Host-side requirement → introspection comparator. The student writes a
// Drizzle schema; the worker introspects it via `getTableConfig` and posts a
// serializable shape back; we walk the author's declared requirements and
// produce one criterion per requirement (table present, column present, column
// type, column flags, composite PK / unique / FK). Each criterion is the unit
// the UI checklist renders, and the diagnosis the LLM feedback grounds on.
//
// Type matching is prefix-friendly — author writes `type: 'varchar'` and a
// student column declared as `varchar('email', { length: 100 })` (SQL type
// `varchar(100)`) still matches. Strict-equality fall-through covers types
// without parameters (`text`, `integer`, `boolean`, `uuid`, `jsonb`, `date`).

export interface ColumnRequirement {
  /** Column name as it must appear in the schema. */
  name: string;
  /** Postgres SQL type prefix, e.g. 'text', 'integer', 'varchar', 'timestamp'.
   * Matches `col.getSQLType()` either exactly or by `prefix(` / `prefix ` so
   * `varchar(100)` and `timestamp with time zone` both match `varchar` /
   * `timestamp`. Omit to accept any type. */
  type?: string;
  notNull?: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  hasDefault?: boolean;
  references?: { table: string; column: string };
}

export interface TableRequirement {
  name: string;
  columns: ColumnRequirement[];
  /** Composite primary key — array of column names. Single-column PKs go on
   * the column itself via `primaryKey: true`. */
  primaryKey?: string[];
  /** Composite unique constraints — each entry is a column-name array. */
  uniques?: string[][];
}

// Mirror of what schema-worker posts back — a serializable subset of
// drizzle-orm's `getTableConfig` output. Keep this in sync with
// schema-worker.ts; both files own the wire shape.
export interface IntrospectedColumn {
  name: string;
  sqlType: string;
  notNull: boolean;
  primary: boolean;
  hasDefault: boolean;
}
export interface IntrospectedFK {
  columns: string[];
  foreignTable: string;
  foreignColumns: string[];
  onDelete: string | null;
  onUpdate: string | null;
}
export interface IntrospectedUnique {
  columns: string[];
}
export interface IntrospectedTable {
  name: string;
  columns: IntrospectedColumn[];
  primaryKeys: { columns: string[] }[];
  foreignKeys: IntrospectedFK[];
  uniqueConstraints: IntrospectedUnique[];
}

export interface Criterion {
  /** Human-readable label shown in the checklist. */
  label: string;
  met: boolean;
  /** When unmet, a one-line reason fed into the LLM diagnosis. */
  reason?: string;
}

export function evaluateRequirements(
  requirements: TableRequirement[],
  introspected: IntrospectedTable[],
): Criterion[] {
  const out: Criterion[] = [];
  const byName = new Map(introspected.map((t) => [t.name, t]));

  for (const req of requirements) {
    const actual = byName.get(req.name);
    if (!actual) {
      out.push({
        label: `Table \`${req.name}\` is defined`,
        met: false,
        reason: `No top-level pgTable('${req.name}', …) found in the schema.`,
      });
      // Skip per-column criteria when the whole table is missing — the
      // table-level criterion is enough signal, and per-column failures would
      // just be noise.
      continue;
    }
    out.push({
      label: `Table \`${req.name}\` is defined`,
      met: true,
    });

    const colByName = new Map(actual.columns.map((c) => [c.name, c]));

    for (const colReq of req.columns) {
      out.push(...checkColumn(req.name, colReq, colByName.get(colReq.name), actual));
    }

    if (req.primaryKey && req.primaryKey.length > 0) {
      const hit = actual.primaryKeys.some((pk) => sameSet(pk.columns, req.primaryKey!));
      out.push({
        label: `\`${req.name}\` has composite PRIMARY KEY (${req.primaryKey.join(', ')})`,
        met: hit,
        reason: hit
          ? undefined
          : `No table-level primaryKey() declaration with columns [${req.primaryKey.join(', ')}].`,
      });
    }

    if (req.uniques) {
      for (const uniqueCols of req.uniques) {
        const hit = actual.uniqueConstraints.some((u) => sameSet(u.columns, uniqueCols));
        out.push({
          label: `\`${req.name}\` has UNIQUE (${uniqueCols.join(', ')})`,
          met: hit,
          reason: hit
            ? undefined
            : `No table-level unique() over columns [${uniqueCols.join(', ')}].`,
        });
      }
    }
  }

  return out;
}

function checkColumn(
  tableName: string,
  req: ColumnRequirement,
  actual: IntrospectedColumn | undefined,
  table: IntrospectedTable,
): Criterion[] {
  const colRef = `\`${tableName}.${req.name}\``;
  if (!actual) {
    return [
      {
        label: `${colRef} exists`,
        met: false,
        reason: `Column "${req.name}" is missing from table ${tableName}.`,
      },
    ];
  }
  const out: Criterion[] = [];

  // Single combined "shape" criterion — type + the requested flags. One
  // failing aspect fails the whole criterion, with the reason naming what.
  const aspects: string[] = [];
  const reasons: string[] = [];

  if (req.type) {
    aspects.push(`type ${req.type}`);
    if (!typeMatches(req.type, actual.sqlType)) {
      reasons.push(`type is \`${actual.sqlType}\`, expected \`${req.type}\``);
    }
  }
  if (req.primaryKey) {
    aspects.push('primary key');
    if (!actual.primary) reasons.push('not marked as primaryKey()');
  }
  if (req.notNull) {
    aspects.push('not null');
    // PRIMARY KEY columns are implicitly NOT NULL in Postgres — accept either.
    if (!actual.notNull && !actual.primary) reasons.push('missing .notNull()');
  }
  if (req.unique) {
    aspects.push('unique');
    const hasUnique = table.uniqueConstraints.some(
      (u) => u.columns.length === 1 && u.columns[0] === req.name,
    );
    if (!hasUnique) reasons.push('missing .unique() (single-column)');
  }
  if (req.hasDefault) {
    aspects.push('has default');
    if (!actual.hasDefault) reasons.push('missing .default(...) or .defaultNow()');
  }
  if (req.references) {
    const r = req.references;
    aspects.push(`references ${r.table}.${r.column}`);
    const hit = table.foreignKeys.some(
      (fk) =>
        fk.columns.length === 1 &&
        fk.columns[0] === req.name &&
        fk.foreignTable === r.table &&
        fk.foreignColumns.length === 1 &&
        fk.foreignColumns[0] === r.column,
    );
    if (!hit) {
      reasons.push(`missing .references(() => ${r.table}.${r.column})`);
    }
  }

  // No declared aspects → just assert the column exists, which it does.
  if (aspects.length === 0) {
    out.push({ label: `${colRef} exists`, met: true });
    return out;
  }

  const label = `${colRef}: ${aspects.join(', ')}`;
  out.push({
    label,
    met: reasons.length === 0,
    reason: reasons.length === 0 ? undefined : reasons.join('; '),
  });
  return out;
}

function typeMatches(required: string, actual: string): boolean {
  if (actual === required) return true;
  if (actual.startsWith(required + '(')) return true;
  if (actual.startsWith(required + ' ')) return true;
  return false;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((v, i) => v === sortedB[i]);
}

export interface ProbeOutcome {
  description: string;
  /** Did the probe's SQL succeed? */
  succeeded: boolean;
  /** Was the author expecting it to succeed? */
  mustSucceed: boolean;
  /** Error message when `succeeded === false`. */
  error?: string;
}

export function evaluateProbes(
  probes: ProbeOutcome[],
): Criterion[] {
  return probes.map((p) => {
    const met = p.succeeded === p.mustSucceed;
    let reason: string | undefined;
    if (!met) {
      if (p.mustSucceed && !p.succeeded) {
        reason = `Probe failed: ${p.error ?? 'unknown error'}.`;
      } else if (!p.mustSucceed && p.succeeded) {
        reason = `Probe succeeded but should have been rejected by a constraint.`;
      }
    }
    return {
      label: p.description,
      met,
      reason,
    };
  });
}

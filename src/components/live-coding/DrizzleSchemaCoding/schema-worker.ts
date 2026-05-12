// Web Worker for DrizzleSchemaCoding. The student writes a Drizzle schema;
// we evaluate it in isolation, walk every top-level pgTable with
// `getTableConfig`, post a serializable introspection back to the host, and
// optionally run a set of SQL "probes" against a fresh PGlite seeded with the
// emitted DDL. Probes are the constraint-firing tests — an INSERT that the
// schema should accept (`mustSucceed: true`) or reject (`mustSucceed: false`).
//
// Reuses `schema-emit.ts` from the sibling DrizzleCoding component: that file
// already knows how to walk a PgTable into CREATE TABLE DDL, and is the right
// single source of truth — both widgets must agree on what the schema means.

import { PGlite } from '@electric-sql/pglite';
import * as opsMod from 'drizzle-orm';
import * as pgMod from 'drizzle-orm/pg-core';
import { getTableConfig, PgTable } from 'drizzle-orm/pg-core';
import { is } from 'drizzle-orm';
import { extractTopLevelTableNames, emitSchemaDDL } from '../DrizzleCoding/schema-emit';
import type {
  IntrospectedColumn,
  IntrospectedFK,
  IntrospectedTable,
  IntrospectedUnique,
} from './requirement-check';

interface ProbeSpec {
  description: string;
  sql: string;
  mustSucceed: boolean;
}

interface RunMessage {
  type: 'run';
  schemaJS: string;
  /** Optional INSERTs/auxiliary DDL applied AFTER the student's schema DDL,
   * before probes run. Common case is empty — probes carry their own inserts. */
  seedSQL: string;
  probes: ProbeSpec[];
  opsNames: string[];
  pgCoreNames: string[];
}

function exposeNamespace(
  namespace: Record<string, unknown>,
  names: string[],
): void {
  for (const name of names) {
    if (name in namespace) {
      (self as unknown as Record<string, unknown>)[name] = namespace[name];
    }
  }
}

self.onmessage = async (e: MessageEvent<RunMessage>) => {
  if (!e.data || e.data.type !== 'run') return;
  const { schemaJS, seedSQL, probes, opsNames, pgCoreNames } = e.data;

  try {
    exposeNamespace(opsMod as unknown as Record<string, unknown>, opsNames);
    exposeNamespace(pgMod as unknown as Record<string, unknown>, pgCoreNames);

    // Evaluate the student's schema. Same trick as DrizzleCoding: synthesise a
    // return object listing every top-level `const X = pgTable(...)` name so we
    // get live PgTable objects back.
    const tableNames = extractTopLevelTableNames(schemaJS);
    const schemaBody =
      schemaJS +
      '\nreturn { ' +
      tableNames.map((n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ') +
      ' };';
    const schemaFn = new Function(schemaBody);
    const tables = schemaFn() as Record<string, unknown>;

    const tableObjects = Object.values(tables).filter((t): t is PgTable => is(t, PgTable));
    const introspected = tableObjects.map(introspectTable);

    // PGlite gets the student's DDL applied; probes run against it. If the
    // student's schema is so broken it can't emit valid DDL, surface that as
    // an error — the introspection still went out, so the criteria checklist
    // gets to show the column-level diagnosis even if probes can't run.
    const probeOutcomes: Array<{
      description: string;
      succeeded: boolean;
      mustSucceed: boolean;
      error?: string;
    }> = [];

    let ddlError: string | null = null;
    let client: PGlite | null = null;
    try {
      client = new PGlite();
      const ddl = emitSchemaDDL(tableObjects);
      if (ddl.trim()) await client.exec(ddl);
      if (seedSQL.trim()) await client.exec(seedSQL);
    } catch (err) {
      ddlError = err instanceof Error ? err.message : String(err);
    }

    if (client && !ddlError) {
      for (const probe of probes) {
        try {
          await client.exec(probe.sql);
          probeOutcomes.push({
            description: probe.description,
            succeeded: true,
            mustSucceed: probe.mustSucceed,
          });
        } catch (err) {
          probeOutcomes.push({
            description: probe.description,
            succeeded: false,
            mustSucceed: probe.mustSucceed,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } else if (ddlError) {
      // DDL didn't apply; report every probe as inconclusive-failure so the
      // checklist surfaces *something* rather than an empty section. The
      // ddlError gets carried out separately for the error panel.
      for (const probe of probes) {
        probeOutcomes.push({
          description: probe.description,
          succeeded: false,
          mustSucceed: probe.mustSucceed,
          error: `Schema DDL did not apply: ${ddlError}`,
        });
      }
    }

    self.postMessage({
      type: 'result',
      introspected,
      probes: probeOutcomes,
      ddlError,
    });
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

function introspectTable(table: PgTable): IntrospectedTable {
  const cfg = getTableConfig(table);
  const columns: IntrospectedColumn[] = cfg.columns.map((c) => ({
    name: c.name,
    sqlType: c.getSQLType(),
    notNull: c.notNull,
    primary: c.primary,
    hasDefault: c.hasDefault,
  }));
  const foreignKeys: IntrospectedFK[] = cfg.foreignKeys.map((fk) => {
    const ref = fk.reference();
    return {
      columns: ref.columns.map((c) => c.name),
      foreignTable: getTableConfig(ref.foreignTable).name,
      foreignColumns: ref.foreignColumns.map((c) => c.name),
      onDelete: fk.onDelete ?? null,
      onUpdate: fk.onUpdate ?? null,
    };
  });
  const uniqueConstraints: IntrospectedUnique[] = cfg.uniqueConstraints.map((u) => ({
    columns: u.columns.map((c) => c.name),
  }));
  return {
    name: cfg.name,
    columns,
    primaryKeys: cfg.primaryKeys.map((pk) => ({
      columns: pk.columns.map((c) => c.name),
    })),
    foreignKeys,
    uniqueConstraints,
  };
}

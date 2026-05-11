// Web Worker that runs the student's transpiled Drizzle code against a fresh
// PGlite. Vite bundles PGlite + drizzle-orm into the worker chunk at build
// time, so module resolution and WASM loading both happen with a real
// same-origin URL — the path that fails inside a srcdoc iframe (PGlite's
// `new URL('./postgres.wasm', import.meta.url)` resolves to `about:srcdoc/...`
// and the browser refuses to fetch it).
//
// Flow per `run` message:
//   1. Evaluate the schema source in isolation → table objects.
//   2. Emit CREATE TABLE DDL from those objects (single source of truth: the
//      Drizzle schema; the lesson author never writes the DDL by hand).
//   3. Apply DDL + the lesson's INSERT statements to a fresh PGlite.
//   4. Run the student's code with `db` + the schema tables in scope.
//   5. Post rows / columns / duration back to the host page; the runtime
//      terminates the worker on receipt.

import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import * as opsMod from 'drizzle-orm';
import * as pgMod from 'drizzle-orm/pg-core';
import { extractTopLevelTableNames, emitSchemaDDL } from './schema-emit';

interface RunMessage {
  type: 'run';
  schemaJS: string;
  studentJS: string;
  /** INSERT statements (and any auxiliary DDL the schema can't express, like
   * extensions or seed-only views). The CREATE TABLEs are generated from the
   * schema; this is rows-only in the common case. */
  seedSQL: string;
  opsNames: string[];
  pgCoreNames: string[];
}

// Assigning module exports onto `self` makes them resolvable from `new
// Function`-built code — the function's [[Scope]] only sees globals, not the
// worker module's local bindings. Allowlist comes from the host so the
// source-of-truth list lives in `drizzle-runtime.ts`.
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
  const { schemaJS, studentJS, seedSQL, opsNames, pgCoreNames } = e.data;

  try {
    exposeNamespace(opsMod as unknown as Record<string, unknown>, opsNames);
    exposeNamespace(pgMod as unknown as Record<string, unknown>, pgCoreNames);

    // Schema evaluates first, in its own function scope, returning the named
    // tables as an object. The regex extractor finds every top-level
    // `const X = pgTable(...)` declaration; we synthesize a return statement
    // listing those names so they come back to us as live PgTable objects.
    const tableNames = extractTopLevelTableNames(schemaJS);
    const schemaBody =
      schemaJS +
      '\nreturn { ' +
      tableNames.map((n) => `${n}: typeof ${n} !== 'undefined' ? ${n} : undefined`).join(', ') +
      ' };';
    const schemaFn = new Function(schemaBody);
    const tables = schemaFn() as Record<string, unknown>;

    const client = new PGlite();
    const ddl = emitSchemaDDL(Object.values(tables));
    if (ddl.trim()) await client.exec(ddl);
    if (seedSQL.trim()) await client.exec(seedSQL);
    const db = drizzle(client);
    (self as unknown as { db: unknown }).db = db;

    // Run the student's code with `db` + each schema table destructured into
    // scope. The destructure list is built from the same `tableNames` we used
    // above, so any table the schema declared is in scope without the
    // student writing an import.
    const destructure = tableNames.length
      ? `const { ${tableNames.join(', ')} } = __tables;`
      : '';
    const studentBody = destructure + '\n' + studentJS;
    const studentFn = new Function(
      'db',
      '__tables',
      'return (async () => {\n' + studentBody + '\n})();',
    );

    const t0 = performance.now();
    const raw = await studentFn(db, tables);
    const durationMs = performance.now() - t0;

    // Coerce whatever the student returned into rows. Drizzle queries already
    // resolve to arrays, so this only normalizes the edge cases (returning a
    // single object, returning a primitive, returning nothing).
    let rows: unknown[];
    if (Array.isArray(raw)) rows = raw;
    else if (raw === undefined || raw === null) rows = [];
    else if (typeof raw === 'object') rows = [raw];
    else rows = [{ value: raw }];

    const columns =
      rows.length > 0 && typeof rows[0] === 'object' && rows[0] !== null
        ? Object.keys(rows[0] as Record<string, unknown>)
        : [];

    // JSON round-trip drops Map/Set/functions and converts Date → ISO string,
    // which matches what an MDX-author would write in an `expectedRows` literal.
    // BigInt isn't structured-cloneable and isn't JSON-stringifiable either,
    // so we coerce it inline before stringify runs.
    const safeRows = JSON.parse(
      JSON.stringify(rows, (_k, v) => (typeof v === 'bigint' ? Number(v) : v)),
    );

    self.postMessage({
      type: 'result',
      rows: safeRows,
      columns,
      durationMs,
    });
  } catch (err) {
    self.postMessage({
      type: 'error',
      message: err instanceof Error ? err.message : String(err),
    });
  }
};

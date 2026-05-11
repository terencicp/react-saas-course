// PGlite-backed SQL runtime. One PGlite instance per card, lazy-init on first
// run so the (~3 MB) WASM bundle isn't on the editor's critical path. Before
// every run the public schema is dropped and re-seeded — deterministic state
// per click, no cross-run contamination from a learner who ran an INSERT in
// their previous attempt.

import type { PGlite as PGliteType, Results } from '@electric-sql/pglite';

let modulePromise: Promise<typeof import('@electric-sql/pglite')> | null = null;
function getModule() {
  if (!modulePromise) modulePromise = import('@electric-sql/pglite');
  return modulePromise;
}

export interface QueryResult {
  rows: Array<Record<string, unknown>>;
  fields: Array<{ name: string; dataTypeID: number }>;
  affectedRows?: number;
}

export type RunOutcome =
  | { ok: true; result: QueryResult }
  | { ok: false; error: string };

export class SQLRunner {
  private dbPromise: Promise<PGliteType> | null = null;
  private seed: string;

  constructor(seed: string) {
    this.seed = seed;
  }

  private async getDB(): Promise<PGliteType> {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = (async () => {
      const { PGlite } = await getModule();
      return new PGlite();
    })();
    return this.dbPromise;
  }

  async run(sql: string): Promise<RunOutcome> {
    try {
      const db = await this.getDB();
      // Reset to a clean slate every run. CASCADE drops dependent objects;
      // re-creating `public` restores the default search_path target.
      await db.exec('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
      if (this.seed.trim()) {
        await db.exec(this.seed);
      }
      const result: Results = await db.query(sql);
      return {
        ok: true,
        result: {
          rows: result.rows as Array<Record<string, unknown>>,
          fields: result.fields,
          affectedRows: result.affectedRows,
        },
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}

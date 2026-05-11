// Drizzle live-coding runtime. Student code is TypeScript; we strip the types
// with `ts.transpileModule`, concatenate it with the lesson's schema source,
// and post the result to a Web Worker that runs it against a fresh PGlite.
//
// Why a Worker and not a srcdoc iframe: PGlite resolves its WASM via
// `new URL('./postgres.wasm', import.meta.url)`, and inside a srcdoc iframe
// `import.meta.url` is `about:srcdoc` — the browser can't fetch a relative
// URL from there, so PGlite falls through to a Node-style readFile path that
// doesn't exist in the browser. A Vite-bundled worker has a real same-origin
// URL, so the WASM loader works. Bonus: Vite bundles drizzle-orm/PGlite at
// build time, no CDN resolution mismatches and no esm.sh cold-fetch.

// TypeScript is lazy-loaded — multi-MB module; only the first Run on the page
// needs it. Shared chunk with TypeCoding so pages with both pay the cost once.
let tsModulePromise: Promise<typeof import('typescript')> | null = null;
function getTS() {
  if (!tsModulePromise) tsModulePromise = import('typescript');
  return tsModulePromise;
}

// Spawn the worker with the `new Worker(new URL(...), { type: 'module' })`
// pattern Vite recognizes — this emits an ES-module-format worker. The
// `?worker` import default produces an IIFE-format worker that can't be
// code-split, but drizzle-orm splits across multiple chunks at build time,
// so the module-format worker is the one that actually compiles.
function createWorker(): Worker {
  return new Worker(new URL('./drizzle-worker.ts', import.meta.url), {
    type: 'module',
  });
}

const RUN_TIMEOUT_MS = 15_000;

// Identifiers we expose from drizzle-orm and drizzle-orm/pg-core as globals
// inside the worker so student code can write `eq(users.id, 1)` directly
// without an import statement. Explicit list (not a bulk spread) so we know
// nothing collides with `self.name`/`self.length`/etc., and so students can
// see what's available at a glance from the demo prose.
const DRIZZLE_OPS = [
  'eq', 'ne', 'gt', 'gte', 'lt', 'lte',
  'and', 'or', 'not',
  'isNull', 'isNotNull',
  'inArray', 'notInArray',
  'between', 'notBetween',
  'like', 'ilike',
  'exists', 'notExists',
  'asc', 'desc',
  'count', 'countDistinct', 'sum', 'sumDistinct', 'avg', 'avgDistinct', 'min', 'max',
  'sql', 'getTableColumns', 'getTableName',
  'relations',
];

const PG_CORE_BUILDERS = [
  'pgTable', 'pgSchema', 'pgEnum',
  'serial', 'bigserial',
  'integer', 'bigint', 'smallint', 'numeric', 'real', 'doublePrecision',
  'text', 'varchar', 'char',
  'boolean',
  'timestamp', 'date', 'time', 'interval',
  'uuid', 'jsonb', 'json',
  'primaryKey', 'foreignKey', 'unique', 'check', 'index', 'uniqueIndex',
];

export interface QueryRow {
  [key: string]: unknown;
}

export interface RunResultOk {
  ok: true;
  rows: QueryRow[];
  /** Column names in the order the runtime saw them on the first row.
   * Drizzle returns plain objects (not pg's `{rows, fields}`), so we
   * synthesize this from `Object.keys(rows[0])` for the result table. */
  columns: string[];
  durationMs: number;
}

export interface RunResultErr {
  ok: false;
  error: string;
  /** True when the timeout fired — surfaced separately so the UI can hint at
   * "infinite loop" rather than a Drizzle error. */
  timedOut?: boolean;
}

export type RunOutcome = RunResultOk | RunResultErr;

/** Transpile TS → JS by type-stripping. We don't want module emit (the result
 * is concatenated inline into a larger script body inside the worker), so
 * target ES2022 with module=ESNext leaves import/export syntax intact — which
 * we then strip by regex below. `isolatedModules: true` matches the host
 * tsconfig stance. */
async function transpileTS(source: string): Promise<string> {
  const ts = await getTS();
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      isolatedModules: true,
      esModuleInterop: true,
    },
    reportDiagnostics: false,
  });
  return outputText;
}

/** Drop top-level `import ... from '...'` and `import '...'` statements, and
 * strip the `export` keyword off declarations. The lesson's schema and the
 * student's query both write idiomatic module-shaped TS, but the worker runs
 * them as a single concatenated body inside an async function — modules
 * wouldn't compose, and the operator/builder bindings are pre-injected on
 * `self` anyway. */
function stripModuleSyntax(source: string): string {
  return source
    // import { a, b } from '...';  (single- or multi-line)
    .replace(/^[ \t]*import\s+(?:[\s\S]*?)from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    // import '...';  (side-effect)
    .replace(/^[ \t]*import\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    // export default / export const / export function / export type
    .replace(/^([ \t]*)export\s+default\s+/gm, '$1')
    .replace(/^([ \t]*)export\s+/gm, '$1');
}

async function prepareSource(tsSource: string): Promise<string> {
  return transpileTS(stripModuleSyntax(tsSource));
}

export interface DrizzleRunnerOptions {
  /** TypeScript source of the Drizzle schema (table definitions). Concatenated
   * BEFORE the student's code in the worker so the table consts are in scope. */
  schemaSource: string;
  /** Raw SQL applied to a fresh PGlite before every run (DDL + INSERTs that
   * mirror the schema's expected rows — Drizzle Kit isn't in scope inside the
   * worker, so the lesson author keeps the schema and seed in sync by hand). */
  seedSQL: string;
}

export class DrizzleRunner {
  // Schema is transpiled lazily on first Run alongside the student code so we
  // don't pay the cost (and don't load `typescript`) until the user engages.
  private schemaJSPromise: Promise<string> | null = null;
  private schemaSource: string;
  private seedSQL: string;

  constructor(opts: DrizzleRunnerOptions) {
    this.schemaSource = opts.schemaSource;
    this.seedSQL = opts.seedSQL;
  }

  private getSchemaJS(): Promise<string> {
    if (!this.schemaJSPromise) {
      this.schemaJSPromise = prepareSource(this.schemaSource);
    }
    return this.schemaJSPromise;
  }

  async run(studentTS: string): Promise<RunOutcome> {
    let studentJS: string;
    let schemaJS: string;
    try {
      [schemaJS, studentJS] = await Promise.all([
        this.getSchemaJS(),
        prepareSource(studentTS),
      ]);
    } catch (err) {
      return {
        ok: false,
        error: `TypeScript transpile failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    return new Promise<RunOutcome>((resolve) => {
      const worker = createWorker();
      let settled = false;

      const finish = (outcome: RunOutcome) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        worker.terminate();
        resolve(outcome);
      };

      const timer = window.setTimeout(() => {
        finish({
          ok: false,
          error:
            'Run timed out after ' + RUN_TIMEOUT_MS / 1000 + 's. ' +
            'Either the query is taking too long, or the code is in an infinite loop.',
          timedOut: true,
        });
      }, RUN_TIMEOUT_MS);

      worker.onmessage = (e: MessageEvent) => {
        const m = e.data;
        if (!m || typeof m !== 'object') return;
        if (m.type === 'result') {
          finish({
            ok: true,
            rows: m.rows ?? [],
            columns: m.columns ?? [],
            durationMs: m.durationMs ?? 0,
          });
        } else if (m.type === 'error') {
          finish({ ok: false, error: String(m.message ?? 'Unknown error') });
        }
      };

      // Worker-level errors (uncaught throws, module load failures) bypass
      // onmessage. Surface them so the lesson author can see a misconfigured
      // schema or a broken Drizzle import in development.
      worker.onerror = (e: ErrorEvent) => {
        finish({
          ok: false,
          error: e.message || 'Worker encountered an uncaught error.',
        });
      };

      worker.postMessage({
        type: 'run',
        schemaJS,
        studentJS,
        seedSQL: this.seedSQL,
        opsNames: DRIZZLE_OPS,
        pgCoreNames: PG_CORE_BUILDERS,
      });
    });
  }
}

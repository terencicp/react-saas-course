// Runtime for DrizzleSchemaCoding. The student edits a Drizzle schema (TS);
// we transpile types away and post the JS to a Web Worker that evaluates the
// schema, introspects each pgTable with `getTableConfig`, and (optionally)
// runs SQL probes against the emitted DDL on a fresh PGlite.
//
// The worker uses the same chunk shape as DrizzleCoding (ES module worker so
// drizzle-orm + PGlite can code-split). The transpile path is identical;
// extracted into this module so both runtimes share `typescript` if a page
// hosts both widgets — Vite resolves the shared dep across module-format
// workers.

import type { IntrospectedTable, ProbeOutcome } from './requirement-check';

let tsModulePromise: Promise<typeof import('typescript')> | null = null;
function getTS() {
  if (!tsModulePromise) tsModulePromise = import('typescript');
  return tsModulePromise;
}

function createWorker(): Worker {
  return new Worker(new URL('./schema-worker.ts', import.meta.url), {
    type: 'module',
  });
}

const RUN_TIMEOUT_MS = 15_000;

// Same operator/builder allowlists as DrizzleCoding — the schema-design
// surface is mostly the pg-core builders, but operator imports show up in
// lessons that use `sql\`now()\`` defaults or relations(), so the full set
// stays accessible.
const DRIZZLE_OPS = [
  'eq', 'ne', 'gt', 'gte', 'lt', 'lte',
  'and', 'or', 'not',
  'isNull', 'isNotNull',
  'inArray', 'notInArray',
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

export interface ProbeSpec {
  description: string;
  sql: string;
  /** When true the probe's SQL must succeed; when false it must throw (the
   * schema's constraint is rejecting it). Default true. */
  mustSucceed?: boolean;
}

export interface RunResultOk {
  ok: true;
  introspected: IntrospectedTable[];
  probes: ProbeOutcome[];
  /** When the student's schema couldn't be turned into valid DDL — e.g. an FK
   * references a column that doesn't exist on the target table — this is the
   * Postgres error from the CREATE TABLE step. Introspection still ran, so the
   * criteria checklist is still useful. */
  ddlError: string | null;
  durationMs: number;
}

export interface RunResultErr {
  ok: false;
  error: string;
  timedOut?: boolean;
}

export type RunOutcome = RunResultOk | RunResultErr;

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

function stripModuleSyntax(source: string): string {
  return source
    .replace(/^[ \t]*import\s+(?:[\s\S]*?)from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^[ \t]*import\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
    .replace(/^([ \t]*)export\s+default\s+/gm, '$1')
    .replace(/^([ \t]*)export\s+/gm, '$1');
}

async function prepareSource(tsSource: string): Promise<string> {
  return transpileTS(stripModuleSyntax(tsSource));
}

export interface DrizzleSchemaRunnerOptions {
  /** Optional extra SQL (auxiliary DDL or seed INSERTs) applied AFTER the
   * student's schema DDL, before probes. Usually empty. */
  seedSQL?: string;
  probes?: ProbeSpec[];
}

export class DrizzleSchemaRunner {
  private seedSQL: string;
  private probes: ProbeSpec[];

  constructor(opts: DrizzleSchemaRunnerOptions = {}) {
    this.seedSQL = opts.seedSQL ?? '';
    this.probes = opts.probes ?? [];
  }

  async run(studentTS: string): Promise<RunOutcome> {
    let studentJS: string;
    try {
      studentJS = await prepareSource(studentTS);
    } catch (err) {
      return {
        ok: false,
        error: `TypeScript transpile failed: ${err instanceof Error ? err.message : String(err)}`,
      };
    }

    return new Promise<RunOutcome>((resolve) => {
      const worker = createWorker();
      let settled = false;
      const t0 = performance.now();

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
            'Either the schema evaluation or a probe is taking too long.',
          timedOut: true,
        });
      }, RUN_TIMEOUT_MS);

      worker.onmessage = (e: MessageEvent) => {
        const m = e.data;
        if (!m || typeof m !== 'object') return;
        if (m.type === 'result') {
          finish({
            ok: true,
            introspected: m.introspected ?? [],
            probes: m.probes ?? [],
            ddlError: m.ddlError ?? null,
            durationMs: performance.now() - t0,
          });
        } else if (m.type === 'error') {
          finish({ ok: false, error: String(m.message ?? 'Unknown error') });
        }
      };

      worker.onerror = (e: ErrorEvent) => {
        finish({
          ok: false,
          error: e.message || 'Worker encountered an uncaught error.',
        });
      };

      worker.postMessage({
        type: 'run',
        schemaJS: studentJS,
        seedSQL: this.seedSQL,
        probes: this.probes.map((p) => ({
          description: p.description,
          sql: p.sql,
          mustSucceed: p.mustSucceed ?? true,
        })),
        opsNames: DRIZZLE_OPS,
        pgCoreNames: PG_CORE_BUILDERS,
      });
    });
  }
}

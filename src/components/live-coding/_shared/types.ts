// Shared types for all live-coding components. Kept in one file so the per-
// component bootstraps don't drift into parallel definitions of the same
// shape (a Diagnostic in TypeCoding vs ZodCoding, etc.).

export type Variant =
  | 'sql'
  | 'drizzle'
  | 'drizzle-schema'
  | 'html-css'
  | 'react'
  | 'script'
  | 'type'
  | 'zod';

export interface Row {
  [key: string]: unknown;
}

export interface QueryResult {
  rows: Row[];
  /** Column metadata from the driver (pg's `Results.fields`). When absent,
   * renderers fall back to `columns` or `Object.keys(rows[0])`. */
  fields?: Array<{ name: string; dataTypeID?: number }>;
  /** Explicit column order — used when the runtime knows the columns but
   * doesn't surface them via `fields` (e.g. Drizzle's plain objects). */
  columns?: string[];
  /** Postgres affectedRows (INSERT/UPDATE/DELETE row count). */
  affectedRows?: number;
  /** Optional execution time. Renderers append "· Xms" to the summary
   * when present (Drizzle uses this; SQL/PGlite does not). */
  durationMs?: number;
}

export type RunOutcome<T = QueryResult> =
  | { ok: true; result: T }
  | { ok: false; error: string };

export interface Diagnostic {
  line: number;
  column: number;
  message: string;
  category: 'error' | 'warning';
}

export interface TypeQuery {
  /** 1-indexed line of the `^?` marker itself. */
  line: number;
  /** Display string from TypeScript's hover info. */
  type: string;
}

export type TestStatus = 'pass' | 'fail' | 'error';

export interface TestResult {
  name: string;
  status: TestStatus;
  error?: string;
}

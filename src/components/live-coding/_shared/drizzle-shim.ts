// Minimal Drizzle (`drizzle-orm` + `drizzle-orm/pg-core`) ambient declarations
// for the in-browser TypeScript LanguageService used by TypeCoding.
//
// WHY THIS EXISTS
// ---------------
// TypeCoding's vfs (`@typescript/vfs` + `createDefaultMapFromCDN`) ships only
// TypeScript's standard libs — there is no node_modules and no Drizzle `.d.ts`.
// So a real `import { pgTable, uuid } from 'drizzle-orm/pg-core'` resolves to
// `Cannot find module …`, every builder becomes `any`, and `typeof
// table.$inferSelect` infers `any` — which means the Twoslash `^?` query never
// resolves to a concrete row and `@ts-expect-error` lines go spuriously unused.
// Seeding this shim as a separate ambient file (added to the Program's root,
// exactly like ZodCoding's `zod-shim`) makes the imports resolve and lets
// `$inferSelect` / `$inferInsert` infer concrete object types.
//
// This is a TYPE-ONLY shim — TypeCoding never executes the student's code, so
// the runtime bodies are irrelevant; only the inferred shapes matter. It is a
// deliberately tiny model of Drizzle's builder generics, scoped to the
// `$inferSelect`/`$inferInsert` lesson (Ch 037 L10) and its three exercises.
//
// HOW IT MODELS DRIZZLE
// ---------------------
// Each column builder returns a `Col<T, Null, HasDefault>` phantom carrying:
//   - `T`         the TS type a row's column reads back as (the per-column map:
//                 uuid/text/numeric → string, timestamp → Date, pgEnum → union)
//   - `Null`      nullability — starts `true`, flipped to `false` by `.notNull()`
//                 and `.primaryKey()` (a PK is implicitly NOT NULL)
//   - `HasDefault` whether a default was attached — flipped `true` by
//                 `.default()` / `.defaultNow()`
//
// `pgTable(name, cols)` then projects those flags into the two row shapes the
// lesson teaches:
//   - `$inferSelect` — every column, `T` when notNull else `T | null`.
//   - `$inferInsert` — the asymmetry: a notNull column with NO default is
//                 REQUIRED; everything else (defaulted OR nullable) is OPTIONAL.
//                 (Drizzle also OMITS generated columns; this lesson's tables
//                 use no generated columns, so that case is intentionally not
//                 modeled — add a `generatedAlwaysAs()` here if a later lesson
//                 needs it.)
//
// COVERED SURFACE (Ch 037 L10 exercises)
//   pgTable, pgEnum
//   uuid, text, numeric, timestamp
//   .notNull, .primaryKey, .default, .defaultNow, .array
//   sql (template tag — type-irrelevant placeholder, only used inside .default)
//   $inferSelect, $inferInsert
//
// DELIBERATELY NOT MODELED: real column config validation, every pg-core type,
// references/foreign keys, indexes, generated columns, the relational query
// API. If a future TypeCoding lesson needs more, extend this file (mirroring the
// `zod-shim` "add a piece when a lesson hits it" policy) rather than wiring up a
// full node_modules layout in the vfs.

export const DRIZZLE_SHIM_DTS = `
declare module 'drizzle-orm' {
  // The \`sql\` template tag — only ever appears inside \`.default(sql\\\`…\\\`)\` in
  // these lessons, where its result type is irrelevant. Typed loosely on purpose.
  export const sql: (strings: TemplateStringsArray, ...values: unknown[]) => unknown;
}

declare module 'drizzle-orm/pg-core' {
  // A column builder. The three phantom type params drive both inferred shapes.
  interface Col<T, Null extends boolean = true, HasDefault extends boolean = false> {
    readonly _t: T;
    readonly _null: Null;
    readonly _hasDefault: HasDefault;
    // \`.notNull()\` and \`.primaryKey()\` make the column NOT NULL.
    notNull(): Col<T, false, HasDefault>;
    primaryKey(): Col<T, false, HasDefault>;
    // \`.default(...)\` / \`.defaultNow()\` mark the column as having a default.
    default(value: unknown): Col<T, Null, true>;
    defaultNow(): Col<T, Null, true>;
    // \`.array()\` wraps the element type; nullability/default ride along.
    array(): Col<T[], Null, HasDefault>;
  }

  // ── Column constructors: the per-column TYPE MAP this lesson teaches ──
  export function uuid(): Col<string>;
  export function text(): Col<string>;
  // \`numeric\` reads back as a STRING (arbitrary-precision money) — the surprise.
  export function numeric(config?: { precision?: number; scale?: number }): Col<string>;
  export function timestamp(config?: { withTimezone?: boolean; mode?: string }): Col<Date>;
  // \`pgEnum\` returns a column constructor whose type is the literal-union of its members.
  export function pgEnum<T extends string>(
    name: string,
    values: readonly [T, ...T[]],
  ): () => Col<T>;

  // ── $inferSelect: the read shape — every column, nullable ⇒ \`T | null\`. ──
  type SelectRow<Cols> = {
    [K in keyof Cols]: Cols[K] extends Col<infer T, infer N, any>
      ? (N extends true ? T | null : T)
      : never;
  };

  // ── $inferInsert: the write shape — the read/write asymmetry. ──
  // A column is REQUIRED iff it is NOT NULL *and* has no default; otherwise it
  // is optional (defaulted columns and nullable columns may be omitted).
  type ColType<C> = C extends Col<infer T, infer N, any>
    ? (N extends true ? T | null : T)
    : never;
  type RequiredKeys<Cols> = {
    [K in keyof Cols]: Cols[K] extends Col<any, infer N, infer D>
      ? (N extends false ? (D extends false ? K : never) : never)
      : never;
  }[keyof Cols];
  type OptionalKeys<Cols> = Exclude<keyof Cols, RequiredKeys<Cols>>;
  type InsertRow<Cols> =
    { [K in RequiredKeys<Cols>]: ColType<Cols[K]> } &
    { [K in OptionalKeys<Cols>]?: ColType<Cols[K]> };

  export function pgTable<Cols extends Record<string, Col<any, any, any>>>(
    name: string,
    columns: Cols,
  ): { $inferSelect: SelectRow<Cols>; $inferInsert: InsertRow<Cols> };
}
`;

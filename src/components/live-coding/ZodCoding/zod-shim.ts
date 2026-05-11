// Minimal Zod 4 ambient declarations for the in-browser TypeScript LanguageService.
//
// The "real" path here is Automatic Type Acquisition (`@typescript/ata` fetches
// zod's actual `.d.ts` from a CDN) — see the Live coding doc, Tier 2 spec. For
// v1 we ship a hand-crafted shim that covers the Unit 7.1 surface:
//
//   z.string / number / boolean / bigint / date
//   z.email / uuid / url / cuid / ulid / ipv4 / ipv6 / iso.date / iso.datetime
//   z.literal / enum / nativeEnum
//   z.object / strictObject / looseObject  (with `.extend`, `.pick`, `.omit`, `.partial`, `.merge`)
//   z.array / tuple / union / discriminatedUnion / record / map / set
//   z.optional / nullable / intersection / lazy / coerce
//   .parse / .safeParse / .refine / .transform / .default / .describe / .or / .and
//   z.infer<typeof S> for all of the above
//
// What's deliberately NOT modeled: every per-method chained return type's
// narrowing, branded types, the new v4 `error` param's full union, transform
// output narrowing for `z.preprocess` etc. If a lesson hits a missing piece,
// add it here; if many do, swap this for real ATA.

export const ZOD_SHIM_DTS = `
declare module 'zod' {
  // ──────────────────────────────────────────────────────────────────────
  //  Core type — every schema implements this; carries the inferred output
  //  via the phantom \`_output\` field so \`z.infer<typeof S>\` can read it.
  // ──────────────────────────────────────────────────────────────────────
  export interface ZodType<Output = any, Input = Output> {
    readonly _output: Output;
    readonly _input: Input;
    parse(input: unknown): Output;
    safeParse(input: unknown): SafeParseResult<Output>;
    parseAsync(input: unknown): Promise<Output>;
    safeParseAsync(input: unknown): Promise<SafeParseResult<Output>>;
    optional(): ZodOptional<this>;
    nullable(): ZodNullable<this>;
    nullish(): ZodType<Output | null | undefined>;
    array(): ZodArray<this>;
    refine(
      check: (val: Output) => unknown,
      message?: string | { message?: string; path?: (string | number)[] },
    ): this;
    superRefine(check: (val: Output, ctx: unknown) => unknown): this;
    check(...checks: unknown[]): this;
    transform<U>(fn: (val: Output) => U): ZodType<U, Input>;
    overwrite(fn: (val: Output) => Output): this;
    default(value: Output | (() => Output)): this;
    catch(value: Output | (() => Output)): this;
    describe(description: string): this;
    brand<B extends string | number | symbol>(brand?: B): ZodType<Output & { readonly [k in B]: B }, Input>;
    readonly(): this;
    or<T extends ZodType>(other: T): ZodUnion<[this, T]>;
    and<T extends ZodType>(other: T): ZodType<Output & T['_output']>;
    pipe<T extends ZodType>(target: T): ZodType<T['_output'], Input>;
  }

  export type SafeParseResult<T> =
    | { success: true; data: T }
    | { success: false; error: ZodError };

  export class ZodError extends Error {
    issues: Array<{
      code: string;
      message: string;
      path: (string | number)[];
      expected?: string;
      received?: string;
    }>;
    format(): unknown;
    flatten(): { formErrors: string[]; fieldErrors: Record<string, string[]> };
  }

  // ──────────────────────────────────────────────────────────────────────
  //  Wrappers
  // ──────────────────────────────────────────────────────────────────────
  export interface ZodOptional<T extends ZodType>
    extends ZodType<T['_output'] | undefined, T['_input'] | undefined> {
    unwrap(): T;
  }
  export interface ZodNullable<T extends ZodType>
    extends ZodType<T['_output'] | null, T['_input'] | null> {
    unwrap(): T;
  }
  export interface ZodArray<T extends ZodType>
    extends ZodType<T['_output'][], T['_input'][]> {
    element: T;
    min(n: number, msg?: string): this;
    max(n: number, msg?: string): this;
    length(n: number, msg?: string): this;
    nonempty(msg?: string): this;
  }

  // ──────────────────────────────────────────────────────────────────────
  //  Primitives
  // ──────────────────────────────────────────────────────────────────────
  type ErrorOpts = string | { message?: string; error?: string | ((iss: unknown) => string) };

  export interface ZodString extends ZodType<string> {
    min(n: number, msg?: ErrorOpts): this;
    max(n: number, msg?: ErrorOpts): this;
    length(n: number, msg?: ErrorOpts): this;
    regex(re: RegExp, msg?: ErrorOpts): this;
    startsWith(s: string, msg?: ErrorOpts): this;
    endsWith(s: string, msg?: ErrorOpts): this;
    includes(s: string, msg?: ErrorOpts): this;
    trim(): this;
    toLowerCase(): this;
    toUpperCase(): this;
    nonempty(msg?: ErrorOpts): this;
  }

  export interface ZodNumber extends ZodType<number> {
    int(msg?: ErrorOpts): this;
    positive(msg?: ErrorOpts): this;
    negative(msg?: ErrorOpts): this;
    nonnegative(msg?: ErrorOpts): this;
    nonpositive(msg?: ErrorOpts): this;
    min(n: number, msg?: ErrorOpts): this;
    max(n: number, msg?: ErrorOpts): this;
    gt(n: number, msg?: ErrorOpts): this;
    gte(n: number, msg?: ErrorOpts): this;
    lt(n: number, msg?: ErrorOpts): this;
    lte(n: number, msg?: ErrorOpts): this;
    multipleOf(n: number, msg?: ErrorOpts): this;
    step(n: number, msg?: ErrorOpts): this;
    finite(msg?: ErrorOpts): this;
    safe(msg?: ErrorOpts): this;
  }

  export interface ZodBoolean extends ZodType<boolean> {}
  export interface ZodBigInt extends ZodType<bigint> {
    min(n: bigint, msg?: ErrorOpts): this;
    max(n: bigint, msg?: ErrorOpts): this;
  }
  export interface ZodDate extends ZodType<Date> {
    min(d: Date, msg?: ErrorOpts): this;
    max(d: Date, msg?: ErrorOpts): this;
  }

  // ──────────────────────────────────────────────────────────────────────
  //  Object — the load-bearing one. Splits required vs. optional keys via
  //  \`undefined extends T[K]['_output']\` so \`z.infer<typeof S>\` produces
  //  \`{ name: string; age?: number }\` not \`{ name: string; age: number | undefined }\`.
  // ──────────────────────────────────────────────────────────────────────
  type RawShape = Record<string, ZodType>;
  type OptionalKeys<T extends RawShape> = {
    [K in keyof T]: undefined extends T[K]['_output'] ? K : never;
  }[keyof T];
  type RequiredKeys<T extends RawShape> = Exclude<keyof T, OptionalKeys<T>>;
  type Identity<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;
  type ShapeOutput<T extends RawShape> = Identity<
    { [K in RequiredKeys<T>]: T[K]['_output'] } &
    { [K in OptionalKeys<T>]?: T[K]['_output'] }
  >;

  export interface ZodObject<T extends RawShape = RawShape>
    extends ZodType<ShapeOutput<T>> {
    shape: T;
    extend<U extends RawShape>(extension: U): ZodObject<T & U>;
    merge<U extends RawShape>(other: ZodObject<U>): ZodObject<T & U>;
    pick<Mask extends { [K in keyof T]?: true }>(
      mask: Mask,
    ): ZodObject<Pick<T, Extract<keyof T, keyof Mask>>>;
    omit<Mask extends { [K in keyof T]?: true }>(
      mask: Mask,
    ): ZodObject<Omit<T, Extract<keyof T, keyof Mask>>>;
    partial(): ZodObject<{ [K in keyof T]: ZodOptional<T[K]> }>;
    required(): ZodObject<{ [K in keyof T]: T[K] }>;
    keyof(): ZodType<keyof T>;
    strict(): this;
    passthrough(): this;
    strip(): this;
    catchall<U extends ZodType>(schema: U): this;
  }

  // ──────────────────────────────────────────────────────────────────────
  //  Literals, enums, unions, tuples
  // ──────────────────────────────────────────────────────────────────────
  export interface ZodLiteral<
    T extends string | number | boolean | bigint | null | undefined,
  > extends ZodType<T> {
    value: T;
  }

  export interface ZodEnum<T extends readonly [string, ...string[]]>
    extends ZodType<T[number]> {
    options: T;
    enum: { [K in T[number]]: K };
  }

  export interface ZodUnion<T extends readonly ZodType[]>
    extends ZodType<T[number]['_output']> {
    options: T;
  }

  export interface ZodDiscriminatedUnion<
    D extends string,
    T extends readonly ZodObject[],
  > extends ZodType<T[number]['_output']> {
    options: T;
    discriminator: D;
  }

  type TupleOutput<T extends readonly ZodType[]> = {
    [K in keyof T]: T[K] extends ZodType ? T[K]['_output'] : never;
  };
  export interface ZodTuple<T extends readonly [ZodType, ...ZodType[]] | readonly []>
    extends ZodType<TupleOutput<T>> {
    items: T;
    rest<R extends ZodType>(rest: R): ZodType<[...TupleOutput<T>, ...R['_output'][]]>;
  }

  export interface ZodRecord<K extends ZodType<string | number | symbol>, V extends ZodType>
    extends ZodType<Record<K['_output'] & (string | number | symbol), V['_output']>> {
    keyType: K;
    valueType: V;
  }

  // ──────────────────────────────────────────────────────────────────────
  //  The z namespace
  // ──────────────────────────────────────────────────────────────────────
  export const z: {
    string(opts?: ErrorOpts): ZodString;
    number(opts?: ErrorOpts): ZodNumber;
    boolean(opts?: ErrorOpts): ZodBoolean;
    bigint(opts?: ErrorOpts): ZodBigInt;
    date(opts?: ErrorOpts): ZodDate;
    symbol(): ZodType<symbol>;
    null(): ZodType<null>;
    undefined(): ZodType<undefined>;
    void(): ZodType<void>;
    any(): ZodType<any>;
    unknown(): ZodType<unknown>;
    never(): ZodType<never>;
    nan(): ZodType<number>;

    literal<T extends string | number | boolean | null | undefined>(
      value: T,
      opts?: ErrorOpts,
    ): ZodLiteral<T>;
    enum<T extends readonly [string, ...string[]]>(values: T, opts?: ErrorOpts): ZodEnum<T>;
    nativeEnum<T extends Record<string, string | number>>(values: T): ZodType<T[keyof T]>;

    email(opts?: ErrorOpts): ZodString;
    uuid(opts?: ErrorOpts): ZodString;
    url(opts?: ErrorOpts): ZodString;
    cuid(opts?: ErrorOpts): ZodString;
    cuid2(opts?: ErrorOpts): ZodString;
    ulid(opts?: ErrorOpts): ZodString;
    nanoid(opts?: ErrorOpts): ZodString;
    ipv4(opts?: ErrorOpts): ZodString;
    ipv6(opts?: ErrorOpts): ZodString;
    base64(opts?: ErrorOpts): ZodString;
    base64url(opts?: ErrorOpts): ZodString;
    iso: {
      date(opts?: ErrorOpts): ZodString;
      datetime(opts?: ErrorOpts): ZodString;
      time(opts?: ErrorOpts): ZodString;
      duration(opts?: ErrorOpts): ZodString;
    };

    object<T extends RawShape>(shape: T, opts?: ErrorOpts): ZodObject<T>;
    strictObject<T extends RawShape>(shape: T, opts?: ErrorOpts): ZodObject<T>;
    looseObject<T extends RawShape>(shape: T, opts?: ErrorOpts): ZodObject<T>;

    array<T extends ZodType>(item: T, opts?: ErrorOpts): ZodArray<T>;
    tuple<T extends readonly [ZodType, ...ZodType[]] | readonly []>(items: T): ZodTuple<T>;
    union<T extends readonly [ZodType, ZodType, ...ZodType[]]>(
      items: T,
      opts?: ErrorOpts,
    ): ZodUnion<T>;
    discriminatedUnion<D extends string, T extends readonly [ZodObject, ZodObject, ...ZodObject[]]>(
      discriminator: D,
      items: T,
    ): ZodDiscriminatedUnion<D, T>;
    record<K extends ZodType<string | number | symbol>, V extends ZodType>(
      keySchema: K,
      valueSchema: V,
    ): ZodRecord<K, V>;
    map<K extends ZodType, V extends ZodType>(
      keySchema: K,
      valueSchema: V,
    ): ZodType<Map<K['_output'], V['_output']>>;
    set<T extends ZodType>(itemSchema: T): ZodType<Set<T['_output']>>;

    optional<T extends ZodType>(schema: T): ZodOptional<T>;
    nullable<T extends ZodType>(schema: T): ZodNullable<T>;
    intersection<A extends ZodType, B extends ZodType>(
      a: A,
      b: B,
    ): ZodType<A['_output'] & B['_output']>;
    lazy<T extends ZodType>(fn: () => T): T;
    preprocess<T extends ZodType>(fn: (val: unknown) => unknown, schema: T): T;

    coerce: {
      string(): ZodString;
      number(): ZodNumber;
      boolean(): ZodBoolean;
      bigint(): ZodBigInt;
      date(): ZodDate;
    };
  };

  // Convenience aliases — the canonical export shape.
  export type infer<T> = T extends ZodType<infer U, any> ? U : never;
  export type input<T> = T extends ZodType<any, infer U> ? U : never;
  export type output<T> = T extends ZodType<infer U, any> ? U : never;
  export type ZodSchema<T = any> = ZodType<T>;
  export type Schema<T = any> = ZodType<T>;

  // ──────────────────────────────────────────────────────────────────────
  //  Namespace merge — \`z\` is both a value (the const above) and a type
  //  namespace, so \`z.infer<typeof S>\`, \`z.input<...>\`, \`z.output<...>\`,
  //  \`z.ZodType<...>\` all resolve as types. Without this merge, TypeScript
  //  reports "Cannot find namespace 'z'" on any \`z.<TypeName>\` reference.
  // ──────────────────────────────────────────────────────────────────────
  export namespace z {
    export type infer<T> = T extends ZodType<infer U, any> ? U : never;
    export type input<T> = T extends ZodType<any, infer U> ? U : never;
    export type output<T> = T extends ZodType<infer U, any> ? U : never;
    export type ZodType<O = any, I = O> = import('zod').ZodType<O, I>;
    export type ZodSchema<T = any> = ZodType<T>;
    export type ZodObject<T extends Record<string, ZodType> = Record<string, ZodType>> = import('zod').ZodObject<T>;
    export type ZodString = import('zod').ZodString;
    export type ZodNumber = import('zod').ZodNumber;
    export type ZodBoolean = import('zod').ZodBoolean;
    export type ZodArray<T extends ZodType> = import('zod').ZodArray<T>;
    export type ZodEnum<T extends readonly [string, ...string[]]> = import('zod').ZodEnum<T>;
    export type ZodUnion<T extends readonly ZodType[]> = import('zod').ZodUnion<T>;
    export type ZodLiteral<T extends string | number | boolean | bigint | null | undefined> = import('zod').ZodLiteral<T>;
    export type ZodError = import('zod').ZodError;
    export type SafeParseResult<T> = import('zod').SafeParseResult<T>;
  }
}
`;

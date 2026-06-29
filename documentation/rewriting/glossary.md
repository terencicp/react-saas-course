# Course glossary

A lookup table of the technical terms the course defines, so a rewriting agent can tell what
has already been introduced (and where) from what is new in the lesson it is editing.

## How to read and update this file

Do not read the whole file. Look a term up with grep, for example:

```
grep -i "code unit" "documentation/rewriting/glossary.md"
```

One term per line. Pipe-delimited, four fields:

```
term | synonyms | one-line definition | first defined: Chapter <NNN> L<N>
```

- **term** — the canonical name, lowercase unless it is a proper noun or API name.
- **synonyms** — comma-separated alternate names and abbreviations a search might use; `-` if none.
- **one-line definition** — plain, a few words, no markdown.
- **first defined** — the chapter and lesson where the course first defines the term, e.g. `Chapter 001 L4`.

Append a term the first time the course defines it; order does not matter since lookups use grep.
Never duplicate an existing term, update its line instead.

## Terms

<!-- entries below, one per line, append new terms at the end -->
value equality | - | `===` comparing primitives by content. | first defined: Chapter 001 L2
reference equality | identity equality | `===` comparing objects by same-allocation, not contents. | first defined: Chapter 001 L2
coercion | type coercion | Automatic conversion between types before an operation. | first defined: Chapter 001 L2
IEEE 754 | - | Floating-point standard JS `number` uses. | first defined: Chapter 001 L2
structural equality | deep equality | Comparing objects by recursive field/value match; no built-in operator. | first defined: Chapter 001 L2
memoization | - | Caching a function's result by input. | first defined: Chapter 001 L2
NaN | not a number | Invalid-numeric value; unequal to everything including itself, propagates. | first defined: Chapter 001 L2
integer cents | integer-cents rule | Storing money as integer smallest-units for exact arithmetic. | first defined: Chapter 001 L3
minor unit | smallest currency unit | A currency's smallest denomination (cent, fil). | first defined: Chapter 001 L3
ISO 4217 | - | Standard coding currencies and their minor-unit decimals. | first defined: Chapter 001 L3
BigInt | - | Integer type for whole numbers past MAX_SAFE_INTEGER; `n` suffix, no mixing. | first defined: Chapter 001 L3
safe integer | Number.MAX_SAFE_INTEGER | Integer a `number` represents exactly, up to 2^53−1. | first defined: Chapter 001 L3
radix | base | Number base for reading digit strings; parseInt's 2nd arg. | first defined: Chapter 001 L3
code unit | UTF-16 code unit | 16-bit chunk `.length` counts; chars above U+FFFF take two. | first defined: Chapter 001 L4
code point | Unicode code point | The single number Unicode assigns one character. | first defined: Chapter 001 L4
surrogate pair | - | Two code units encoding one code point above U+FFFF. | first defined: Chapter 001 L4
grapheme cluster | grapheme | One user-perceived character, possibly several code points. | first defined: Chapter 001 L4
zero-width joiner | ZWJ | Invisible char (U+200D) gluing code points into one grapheme. | first defined: Chapter 001 L4
serialization detail | - | A property of storage/transmission, not of meaning. | first defined: Chapter 001 L4
Intl.Segmenter | - | API splitting strings into graphemes/words/sentences per locale. | first defined: Chapter 001 L4
Unicode normalization | normalize, NFC, NFD, NFKC, NFKD | Rewriting to canonical code points so equal text compares equal. | first defined: Chapter 001 L4
template literal | backtick string | Backtick string with ${} interpolation and literal newlines. | first defined: Chapter 001 L5
interpolation | string interpolation | Embedding an expression's value via ${} in a template literal. | first defined: Chapter 001 L5
tagged template | tagged template literal, tag | Function receiving a template's static segments and dynamic values. | first defined: Chapter 001 L5
TemplateStringsArray | - | A tag's first arg: readonly array of static string segments. | first defined: Chapter 001 L5
String.raw | - | Built-in tag returning a template's raw text, escapes unprocessed. | first defined: Chapter 001 L5
SQL injection | - | Attack where user text concatenated into a query runs as SQL. | first defined: Chapter 001 L5
parameterized query | bound parameter, parameterization | Query sending values as bound parameters, not inlined text. | first defined: Chapter 001 L5
dedent | - | npm tagged template stripping common leading whitespace. | first defined: Chapter 001 L5
binding | - | A name pointing to a value (variable, parameter, property). | first defined: Chapter 001 L1
block scope | block-scoped | `const`/`let` visible only in the nearest enclosing braces. | first defined: Chapter 001 L6
Temporal Dead Zone | TDZ | Pre-declaration window where a `let`/`const` access throws. | first defined: Chapter 001 L6
hoisting | - | Compile-time pre-registration of names before code runs. | first defined: Chapter 001 L6
Object.is | SameValue | Like `===` but NaN equals itself and +0 ≠ −0. | first defined: Chapter 001 L2
Number.isNaN | - | Non-coercing check for the actual NaN. | first defined: Chapter 001 L2
Number.isFinite | - | Non-coercing check for a finite number. | first defined: Chapter 001 L2
predicate | - | A function returning a boolean. | first defined: Chapter 001 L3
Number.isInteger | - | Non-coercing check for a whole number. | first defined: Chapter 001 L3
Number.isSafeInteger | - | Non-coercing check for an exactly-representable integer. | first defined: Chapter 001 L3
Intl.NumberFormat | - | API formatting numbers per locale (currency, grouping, decimals). | first defined: Chapter 001 L3
combining mark | combining accent, combining acute accent | Zero-width code point overlaid on the preceding base char. | first defined: Chapter 001 L4
precomposed | composed form | Single code point already carrying its accent. | first defined: Chapter 001 L4
localeCompare | String.prototype.localeCompare | Locale-aware string comparison for sorting visible text. | first defined: Chapter 001 L4
ORM | object-relational mapper | Library mapping DB tables to typed objects instead of raw SQL. | first defined: Chapter 001 L5
arrow function | arrow, fat arrow | `(args) => body`; inherits `this`; course default. | first defined: Chapter 002 L1
function declaration | - | `function name(){}` at statement position; whole body hoists. | first defined: Chapter 002 L1
function expression | - | A `function`-keyword function used as a value. | first defined: Chapter 002 L1
method shorthand | - | Object-literal method syntax; binds own `this` from call site. | first defined: Chapter 002 L1
type predicate | predicate signature | Return annotation `x is T` that narrows on true. | first defined: Chapter 002 L1
assertion signature | assertion function | Return annotation `asserts x is T`; narrows if no throw. `function` only. | first defined: Chapter 002 L1
narrowing | - | TS shrinking a value's type within a branch. | first defined: Chapter 002 L1
labeled statement | label | Identifier-prefixed statement `break`/`continue` can target. | first defined: Chapter 002 L1
options object | - | Single object parameter replacing positional args; course default past two. | first defined: Chapter 002 L2
positional parameter | positional argument | Parameter bound by call order, not name. | first defined: Chapter 002 L2
parameter default | default parameter | `param = expr` firing only on `undefined`, unlike `||`. | first defined: Chapter 002 L2
object type literal | inline object type | Inline object shape used as a type. | first defined: Chapter 002 L2
rest parameter | rest | Final `...name` gathering trailing args into an array. | first defined: Chapter 002 L2
spread argument | spread | `...array` unpacking an array into positional args. | first defined: Chapter 002 L2
wrapper pattern | wrapper function | Function adding behavior around another, forwarding all args. | first defined: Chapter 002 L2
falsy | - | Value coercing to false: `false`, `0`, `''`, `null`, `undefined`, `NaN`. | first defined: Chapter 002 L2
architectural principle | senior-mindset principle | The course's running list of senior design decisions. | first defined: Chapter 002 L3
public surface | - | Everything a caller sees without opening the body. | first defined: Chapter 002 L3
Hungarian notation | - | Naming style encoding type/scope in the identifier. | first defined: Chapter 002 L3
Biome | - | The course's Rust linter/formatter, the ESLint+Prettier replacement. | first defined: Chapter 002 L3
Server Action | - | Next.js `'use server'` function callable from client code; course default for mutations. | first defined: Chapter 002 L3
implementation-leaking name | - | Name encoding how a value is stored/computed, not what it is. | first defined: Chapter 002 L3
vague abstraction | - | Name fitting any value (`data`, `result`, `manager`). | first defined: Chapter 002 L3
negated boolean | - | Boolean named with a baked-in negation. | first defined: Chapter 002 L3
guard clause | guard | Early-exit check at the top of a function, no `else`. | first defined: Chapter 002 L4
discriminated union | tagged union | Union of variants tagged by a shared literal field. | first defined: Chapter 002 L4
discriminant | tag | The shared literal field the dispatch reads. | first defined: Chapter 002 L4
never | never type | TS bottom type; no values; forces exhaustiveness errors. | first defined: Chapter 002 L4
exhaustiveness checking | exhaustive switch | Compiler verifying every union variant is handled. | first defined: Chapter 002 L4
assertNever | - | `(x: never): never` helper turning a missed variant into a compile error. | first defined: Chapter 002 L4
noFallthroughCasesInSwitch | - | TS flag making non-terminating switch cases an error. | first defined: Chapter 002 L4
noUncheckedIndexedAccess | - | TS flag adding `| undefined` to indexed access. | first defined: Chapter 002 L4
optional chaining | ?. | `?.` family short-circuiting to undefined on a nullish link. | first defined: Chapter 002 L5
nullish | - | null and undefined, distinct from the wider falsy set. | first defined: Chapter 002 L5
nullish coalescing | ?? | `??` returning the right operand only when left is nullish. | first defined: Chapter 002 L5
nullish coalescing assignment | ??= | `??=` assigning only when left is nullish; lazy cache-or-compute. | first defined: Chapter 002 L5
short-circuit | short-circuiting | Stopping evaluation at the first early-returning link. | first defined: Chapter 002 L5
destructuring | destructure | Pulling fields/positions out and binding them as locals. | first defined: Chapter 002 L6
shadowing | shadow | Inner binding hiding a same-named outer one. | first defined: Chapter 002 L6
tuple | - | Fixed-length array where each position has a fixed meaning. | first defined: Chapter 002 L6
closure | - | A function plus the bindings it reads from where it was written. | first defined: Chapter 002 L7
lexical environment | - | The in-scope bindings a function carries as its closure. | first defined: Chapter 002 L7
scope chain | - | Ordered enclosing scopes a name lookup walks. | first defined: Chapter 002 L7
higher-order function | - | Function taking or returning a function. | first defined: Chapter 002 L7
module scope | - | A module's top-level scope, evaluated once, shared across calls. | first defined: Chapter 002 L7
dot access | dot notation | `obj.field`; checked against known shape; default for known fields. | first defined: Chapter 003 L1
bracket access | bracket notation, indexed access | `obj[key]` for computed/runtime keys; can reach the prototype. | first defined: Chapter 003 L1
prototype chain | prototype | Objects walked on a property miss, ending at Object.prototype. | first defined: Chapter 003 L1
object spread | spread, shallow merge | `{ ...obj }` shallow-copying own enumerable props; right wins. | first defined: Chapter 003 L1
property shorthand | shorthand | `{ name }` for `{ name: name }`. | first defined: Chapter 003 L1
computed key | computed property name | `{ [expr]: value }` keying from a bracketed expression. | first defined: Chapter 003 L1
structural typing | structural type system | TS matching types by shape, not name. | first defined: Chapter 003 L1
enumerable | enumerable property | Property appearing in key iteration/listing. | first defined: Chapter 003 L1
Record<string, T> | Record type | Object type with dynamic string keys sharing value type T. | first defined: Chapter 003 L1
Object.hasOwn | - | ES2022 own-key check ignoring the prototype chain. | first defined: Chapter 003 L1
Object.groupBy | - | ES2024 static bucketing an array by a string key. | first defined: Chapter 003 L1
Object.create(null) | - | Prototype-less object for safe lookup tables. | first defined: Chapter 003 L1
non-mutating method | non-mutating update, non-mutating twin | Array method returning a new array (toSorted, with, …). | first defined: Chapter 003 L2
shallow copy | shallow clone | New outer container reusing nested references, one level deep. | first defined: Chapter 003 L2
iterable | iteration protocol | Anything implementing the iteration protocol (spreadable). | first defined: Chapter 003 L2
sparse array | - | Array with unassigned holes; most methods skip them. | first defined: Chapter 003 L2
SameValueZero | - | Set/Map key equality; like `===` but NaN equals itself. | first defined: Chapter 003 L2
accumulator | acc | The running value `.reduce` carries between calls. | first defined: Chapter 003 L3
Object.fromEntries | - | Builds an object from `[key, value]` pairs; inverse of entries. | first defined: Chapter 003 L3
non-null assertion | non-null assertion operator, postfix ! | Trailing `!` asserting non-null with no runtime check. | first defined: Chapter 003 L3
Set | - | Collection of unique values; constant-time membership; set algebra. | first defined: Chapter 003 L4
Map | - | Key-value collection with any-type keys and insertion order. | first defined: Chapter 003 L4
WeakMap | - | Map with weakly-held object keys; no iteration or size. | first defined: Chapter 003 L4
WeakSet | - | Set with weakly-held object members; "seen this object?" checks. | first defined: Chapter 003 L4
record | - | Object with a fixed, known shape; keys part of the type. | first defined: Chapter 003 L4
dictionary | - | Collection with a dynamic keyspace; `Map` is its container. | first defined: Chapter 003 L4
set algebra | set methods | ES2025 Set composition methods (union, intersection, …). | first defined: Chapter 003 L4
set-like | - | Object with `.size`, `.has`, `.keys()` a Set method accepts. | first defined: Chapter 003 L4
hash table | - | Structure with ~constant-time keyed lookup/insert/delete. | first defined: Chapter 003 L4
garbage collector | garbage collection | Engine part freeing unreferenced object memory automatically. | first defined: Chapter 003 L4
internal slots | internal slot | Engine storage for Map/Set entries, invisible to JSON.stringify. | first defined: Chapter 003 L4
Map.groupBy | - | Object.groupBy returning a Map with any-type keys. | first defined: Chapter 003 L4
iteration protocol | - | The iterable + iterator `.next()` → `{value, done}` contract. | first defined: Chapter 003 L5
iterator | - | Object with `.next()` returning `{ value, done }`. | first defined: Chapter 003 L5
own properties | own property | Properties directly on the object, not inherited. | first defined: Chapter 003 L5
generator | generator function | `function*` with `yield`; returns a pausable iterator/iterable. | first defined: Chapter 003 L5
iterator helpers | lazy helpers | ES2025 lazy Iterator.prototype methods (.map, .filter, .take, …). | first defined: Chapter 003 L5
Iterator.from | - | ES2025 static wrapping an iterable into an iterator. | first defined: Chapter 003 L5
for await...of | - | Loop awaiting each value from an async source. | first defined: Chapter 003 L5
regular expression | regex, regexp | Pattern describing a set of strings; `/.../ ` or RegExp. | first defined: Chapter 003 L6
regex flag | flag | Single letter toggling behavior: g, i, m, s, u, v. | first defined: Chapter 003 L6
named capture group | named group | `(?<name>...)` exposing captured text on match.groups. | first defined: Chapter 003 L6
character class | - | `[...]` matching any single char from its set. | first defined: Chapter 003 L6
quantifier | - | Repeat count: `+`, `*`, `?`, `{n,m}`. | first defined: Chapter 003 L6
backreference | - | Reference re-matching an earlier group's capture (`\1`, `\k<name>`). | first defined: Chapter 003 L6
property escape | Unicode property escape | `\p{...}` matching Unicode chars by property; needs u/v. | first defined: Chapter 003 L6
lookaround | lookahead, lookbehind | Zero-width assertion matching by surroundings. | first defined: Chapter 003 L6
Unicode mode | u flag | `u` flag enabling Unicode-aware matching and `\p{}`. | first defined: Chapter 003 L6
Unicode sets mode | v flag | ES2024 `v` flag superseding u; set operations in classes. | first defined: Chapter 003 L6
ReDoS | regular-expression denial of service | DoS from catastrophic backtracking on nested quantifiers. | first defined: Chapter 003 L6
Language Server Protocol | LSP | Editor–language-tool contract for portable diagnostics. | first defined: Chapter 003 L7
blame | git blame | Git's per-line record of last-changing commit and author. | first defined: Chapter 003 L7
EditorConfig | .editorconfig | Cross-editor config for indent, line endings, charset. | first defined: Chapter 003 L7
mise | rtx | Course's polyglot version manager pinning runtimes per repo. | first defined: Chapter 003 L8
LTS | Long-Term Support | Node's long-support release line; course default. | first defined: Chapter 003 L8
type-stripping | type-stripper, native type-stripping | Node 24 blanking type-only `.ts` parts and running the JS. | first defined: Chapter 003 L8
tsx | - | Third-party CLI running `.ts` via esbuild; dev tool only. | first defined: Chapter 003 L8
tsc | TypeScript compiler | The TS compiler; type-checks or emits JS + declarations. | first defined: Chapter 003 L8
esbuild | - | Fast Go JS/TS bundler/transformer tsx embeds. | first defined: Chapter 003 L8
path alias | - | tsconfig prefix mapping to a directory (`@/lib`). | first defined: Chapter 003 L8
scoped package | scope | npm package named `@scope/name`. | first defined: Chapter 003 L8
moduleResolution bundler | bundler resolution | tsconfig setting matching bundler-style import resolution. | first defined: Chapter 003 L8
pnpm dlx | - | pnpm's run-once command, like `npx`. | first defined: Chapter 003 L8
literal type | - | A primitive narrowed to exactly one value. | first defined: Chapter 004 L1
literal union | - | Union of literal types for finite known values. | first defined: Chapter 004 L1
inhabitant | - | A runtime value satisfying a type. | first defined: Chapter 004 L1
widening | literal widening | TS broadening an inferred literal to its base primitive. | first defined: Chapter 004 L1
as const | const assertion | Suffix freezing a value at its narrowest type. | first defined: Chapter 004 L1
any | any type | Type turning off checking; unsound; banned in the course. | first defined: Chapter 004 L1
unknown | unknown type | Sound top type accepting all values, refusing reads until narrowed. | first defined: Chapter 004 L1
void | void type | Return type meaning ignore the return value. | first defined: Chapter 004 L1
soundness | sound, unsound | Type system never letting runtime type contradict static type. | first defined: Chapter 004 L1
brand | branded type | Primitive tagged with a compile-only marker for distinctness. | first defined: Chapter 004 L1
type alias | alias | A name bound to a type expression; erased at compile time. | first defined: Chapter 004 L2
interface | - | Keyword declaring object shapes; allows declaration merging. | first defined: Chapter 004 L2
declaration merging | - | Two same-name declarations combining into one; interface only. | first defined: Chapter 004 L2
optional property | optional field, ? modifier | Field marked `?`, may be absent entirely. | first defined: Chapter 004 L2
readonly | readonly modifier | Modifier forbidding property reassignment after construction. | first defined: Chapter 004 L2
readonly array | readonly T[], ReadonlyArray | Array type without mutating methods. | first defined: Chapter 004 L2
Readonly | Readonly utility type | Utility applying `readonly` to top-level props; shallow. | first defined: Chapter 004 L2
exactOptionalPropertyTypes | - | TS flag separating absent from present-but-undefined fields. | first defined: Chapter 004 L2
excess property check | excess property checks | TS flagging undeclared props on a directly-assigned literal. | first defined: Chapter 004 L2
labeled tuple | labeled tuple element | Tuple with named positions; names are tooltip-only. | first defined: Chapter 004 L3
destructure-and-rename | - | Destructuring a positional return while renaming bindings. | first defined: Chapter 004 L3
readonly tuple | - | Tuple prefixed `readonly`, dropping mutating methods. | first defined: Chapter 004 L3
optional tuple position | optional position | Tuple slot marked `?`; must follow required ones. | first defined: Chapter 004 L3
rest tuple position | rest position | Trailing `...T[]` in a tuple; one, placed last. | first defined: Chapter 004 L3
index signature | - | `{ [key: K]: V }` declaring the type of dynamic keys. | first defined: Chapter 004 L4
key constraint | - | The type every key in an index signature/Record must satisfy. | first defined: Chapter 004 L4
PropertyKey | - | Built-in type for any key: `string | number | symbol`. | first defined: Chapter 004 L4
completeness check | - | `Record<LiteralUnion, V>` making missing keys a compile error. | first defined: Chapter 004 L4
in operator | - | `key in obj` runtime existence test; doesn't narrow index reads. | first defined: Chapter 004 L4
union | union type, `|` | `A | B`: a value is either; inhabitants grow. | first defined: Chapter 004 L5
intersection | intersection type, `&` | `A & B`: satisfies both; field set grows, value set shrinks. | first defined: Chapter 004 L5
shape-union access rule | - | On a union, only fields common to all variants read without narrowing. | first defined: Chapter 004 L5
type assertion | as, cast | Compile-only `as T`; no runtime effect, silences the check. | first defined: Chapter 004 L6
control-flow narrowing | flow narrowing | TS refining a type along branches from runtime checks. | first defined: Chapter 004 L6
truthy check | - | `if (x)` excluding every falsy value, not just nullish. | first defined: Chapter 004 L6
realm | - | Separate JS context with its own globals; breaks `instanceof`. | first defined: Chapter 004 L6
satisfies | satisfies operator | `satisfies T` validating assignability while keeping the narrow type. | first defined: Chapter 004 L7
typed config | typed config map | Module constant whose key/value types the module consumes. | first defined: Chapter 004 L7
keyof typeof | - | Lifts a value's keys into a literal-union type. | first defined: Chapter 004 L7
inference | type inference | TS reading a type from the producing expression. | first defined: Chapter 004 L8
implicit any | - | `noImplicitAny` error on an un-inferable unannotated parameter. | first defined: Chapter 004 L8
contextual inference | - | TS inferring a parameter type from the call site. | first defined: Chapter 004 L8
verbatimModuleSyntax | - | TS flag emitting imports verbatim, requiring `import type`. | first defined: Chapter 004 L8
side effect | - | Work a module does on import beyond exporting names. | first defined: Chapter 004 L8
tree-shaking | tree-shaken | Build step dropping code judged unused. | first defined: Chapter 004 L8
Result<T> | result type | `{ ok: true; data } | { ok: false; error }` for expected failure. | first defined: Chapter 004 L5
impossible state | impossible states | Field combination a type allows but the runtime never produces. | first defined: Chapter 005 L1
state machine | - | Discriminated union of states plus typed transition functions. | first defined: Chapter 005 L2
transition function | - | Function naming a specific input state and output state. | first defined: Chapter 005 L2
per-state invariant | per-variant invariant | Each variant carrying only the data valid in that state. | first defined: Chapter 005 L2
optimistic mutation | optimistic update | Showing a new value immediately, rolling back on failure. | first defined: Chapter 005 L2
reducer | - | A state machine as one `(state, event) => state` function. | first defined: Chapter 005 L2
AbortController | - | Web API for canceling an in-flight request via its signal. | first defined: Chapter 005 L2
XState | - | State-machine library for machines outgrowing plain TS. | first defined: Chapter 005 L2
dunning | - | Flow chasing a failed payment with retries and notices. | first defined: Chapter 005 L2
webhook | - | HTTP request an external service sends on its events. | first defined: Chapter 005 L2
indexed access type | indexed access | Type-level read of a field's type off another type. | first defined: Chapter 005 L3
Zod | - | TS-first schema library validating unknown data to typed values. | first defined: Chapter 005 L3
nominal typing | nominal type system | Type compatibility by name; TS emulates via branding. | first defined: Chapter 005 L4
brand factory | - | Function validating and converting a string to a branded ID. | first defined: Chapter 005 L4
phantom property | phantom field | Compile-only field carrying a brand label. | first defined: Chapter 005 L4
unique symbol | - | Declaration-unique symbol type used as a collision-proof key. | first defined: Chapter 005 L4
parse seam | - | Spot where outside data re-enters typed code and is parsed. | first defined: Chapter 005 L4
Drizzle | - | Course's TS-first database toolkit with inferred row types. | first defined: Chapter 005 L4
derived type | - | Type computed from a runtime value via typeof/keyof/indexed access. | first defined: Chapter 005 L5
value-level | value-level register | Expression evaluated by the JS runtime. | first defined: Chapter 005 L5
type-level | type-level register | Expression evaluated by the TS compiler, erased before runtime. | first defined: Chapter 005 L5
typeof extractor | type-level typeof | `typeof V` in a type position, reading a value's inferred type. | first defined: Chapter 005 L5
utility type | built-in utility type | Built-in generic transforming a type (Partial, Pick, ReturnType). | first defined: Chapter 005 L6
shallow | shallow transform | Type transform operating on the top level only. | first defined: Chapter 005 L6
DTO | data transfer object | Type for data crossing a boundary, often a trimmed view. | first defined: Chapter 005 L6
generic | generic function, generic type | Function/type accepting a type parameter. | first defined: Chapter 005 L7
type parameter | - | The `<T>` a generic names for the caller to fill. | first defined: Chapter 005 L7
default type parameter | - | Type parameter with `= Default` filling in when omitted. | first defined: Chapter 005 L7
constraint | extends constraint | `<T extends ...>` requiring T be assignable to the right side. | first defined: Chapter 005 L7
const type parameter | const modifier | `<const T>` inferring literals like caller-side `as const`. | first defined: Chapter 005 L7
variance | - | Type-parameter subtyping behavior via `in`/`out`. | first defined: Chapter 005 L7
module graph | directed graph of modules | Codebase as modules (nodes) and imports (edges). | first defined: Chapter 006 L1
named export | - | Export bound to a name; course default. | first defined: Chapter 006 L1
default export | - | A module's single `export default`; framework-mandated only. | first defined: Chapter 006 L1
side-effecting import | bare import | Import with no binding, run for its side effect. | first defined: Chapter 006 L1
dynamic import | import() | `import('...')` returning `Promise<Module>`; code-split marker. | first defined: Chapter 006 L1
re-export | - | `export ... from` republishing another module's binding. | first defined: Chapter 006 L1
barrel file | barrel | `index.ts` re-exporting many symbols; banned in the course. | first defined: Chapter 006 L1
code-splitting | code split | Splitting a bundle into on-demand chunks. | first defined: Chapter 006 L1
bundle | - | The JS the browser downloads and runs for your app; a Server Component adds zero bytes. | first defined: Chapter 006 L2
bare specifier | - | Import with no `./`/`../`/absolute path; resolved via node_modules. | first defined: Chapter 006 L1
exports field | - | package.json field declaring importable subpaths. | first defined: Chapter 006 L1
import attribute | with attribute | `with { type: 'json' }` telling the runtime how to parse a resource. | first defined: Chapter 006 L1
live binding | - | A read-only window onto the exporter's variable, not a copy. | first defined: Chapter 006 L2
module evaluation order | depth-first post-order | Imports run before the importer; leaves first, root last, once each. | first defined: Chapter 006 L2
circular dependency | cycle, import cycle | Import graph looping back; crashes only on top-level early read. | first defined: Chapter 006 L2
fail-closed | fail-closed startup validation | Invalid config crashing the process at startup. | first defined: Chapter 006 L2
eager edge | static edge | A static import's edge; target ships in the same chunk. | first defined: Chapter 006 L2
deferred edge | - | A dynamic import's edge; target fetched as a separate chunk. | first defined: Chapter 006 L2
chunk | bundle chunk | A separate JS file fetched on demand. | first defined: Chapter 006 L2
next/dynamic | - | Next.js wrapper pairing import() with Suspense and SSR controls. | first defined: Chapter 006 L2
'use client' | use client directive | Directive marking a file a client-subgraph root. | first defined: Chapter 006 L2
client entry point | client entry | A `'use client'` file rooting the client subgraph. | first defined: Chapter 006 L2
server-only | server-only package | `import 'server-only'` failing the build if a client bundle reaches it. | first defined: Chapter 006 L2
client-only | client-only package | `import 'client-only'` failing the build if a server bundle reaches it. | first defined: Chapter 006 L2
top-level await | top-level await, TLA | `await` at module top level, holding the module's evaluation. | first defined: Chapter 006 L3
implicitly async | - | Upstream module waiting on a descendant's top-level await. | first defined: Chapter 006 L3
render-blocker | render-blocking work | Module-load work gating a server-rendered page's first paint. | first defined: Chapter 006 L3
lazy init | lazy getter, lazy initialization | Getter doing setup on first call and caching it. | first defined: Chapter 006 L3
module-level singleton | - | Value cached in a module-scoped variable for the module's lifetime. | first defined: Chapter 006 L3
cold start | - | First request on a fresh serverless instance, paying setup. | first defined: Chapter 006 L3
connection pool | - | Reusable open DB connections queries borrow from. | first defined: Chapter 006 L3
module augmentation | - | Extending a package's types via `declare module`. | first defined: Chapter 006 L4
ambient declaration | - | A `.d.ts` declaration with no runtime code. | first defined: Chapter 006 L4
$Infer | - | Better Auth helper deriving the session type from runtime config. | first defined: Chapter 006 L4
Promise | - | Object representing async work's eventual result; three states. | first defined: Chapter 007 L2
pending | - | Promise state: work unfinished, no value or reason. | first defined: Chapter 007 L2
fulfilled | - | Promise state: succeeded, holds a value. | first defined: Chapter 007 L2
rejected | - | Promise state: failed, holds a reason (usually an Error). | first defined: Chapter 007 L2
settled | - | Promise out of pending; permanent. | first defined: Chapter 007 L2
executor | - | The `(resolve, reject) => ...` function run synchronously at construction. | first defined: Chapter 007 L2
combinator | Promise combinator | Static taking Promises and returning one (all, allSettled, any, race). | first defined: Chapter 007 L2
AggregateError | - | Error subclass wrapping multiple errors; thrown by Promise.any. | first defined: Chapter 007 L2
Promise.withResolvers() | withResolvers | Static returning a Promise plus its resolve/reject. | first defined: Chapter 007 L2
deferred pattern | deferred | Legacy settle-from-outside pattern; superseded by withResolvers. | first defined: Chapter 007 L2
unhandled rejection | - | A rejected Promise with no handler; crashes Node. | first defined: Chapter 007 L2
event loop | - | Runtime picking next work: macrotask, drain microtasks, render. | first defined: Chapter 007 L1
call stack | - | Where synchronous code runs; frames pushed and popped. | first defined: Chapter 007 L1
microtask | microtask queue | Continuation from a settled Promise/await; drains between macrotasks. | first defined: Chapter 007 L1
macrotask | task queue, macrotask queue | Work from setTimeout, I/O, events; one per loop iteration. | first defined: Chapter 007 L1
continuation | - | The code after an `await`, run later as a microtask. | first defined: Chapter 007 L1
queueMicrotask | - | Explicit microtask scheduler. | first defined: Chapter 007 L1
process.nextTick | - | Node scheduler draining before microtasks; can starve I/O. | first defined: Chapter 007 L1
setImmediate | - | Node macrotask scheduler firing after I/O callbacks. | first defined: Chapter 007 L1
unbounded parallelism | - | Many concurrent async ops with no in-flight cap. | first defined: Chapter 007 L3
N+1 | N+1 problem | One list query plus N per-child queries; fix with a batched query. | first defined: Chapter 007 L3
AbortSignal | - | Read-only view of an AbortController passed to async APIs. | first defined: Chapter 007 L4
AbortError | 'AbortError' | Error name a fetch rejects with on abort. | first defined: Chapter 007 L4
TimeoutError | 'TimeoutError' | Error name AbortSignal.timeout rejects with on deadline. | first defined: Chapter 007 L4
AbortSignal.timeout | - | Static signal aborting itself after ms with TimeoutError. | first defined: Chapter 007 L4
AbortSignal.any | - | Static signal aborting when any input signal aborts. | first defined: Chapter 007 L4
AbortSignal.abort | - | Static returning an already-aborted signal. | first defined: Chapter 007 L4
backpressure | - | Consumer unable to keep up with producer; bounded concurrency fixes it. | first defined: Chapter 007 L3
fan-out | - | Starting many async ops from one list; bounded or unbounded. | first defined: Chapter 007 L3
async iterable | - | Object yielding values one at a time, each possibly async. | first defined: Chapter 007 L3
bounded concurrency | - | Capping in-flight async ops; `pMap` concurrency is the default. | first defined: Chapter 007 L3
fire-and-forget | - | Starting async work without awaiting; pair `void` with `.catch`. | first defined: Chapter 007 L3
return await | - | `return await` in try/catch, keeping the frame for the catch. | first defined: Chapter 007 L3
domain failure | - | Expected, per-case-recoverable failure; returned as Result. | first defined: Chapter 008 L1
operational failure | - | Unexpected infrastructure fault; thrown for a boundary to handle. | first defined: Chapter 008 L1
framework boundary | - | Edge of the request lifecycle where unexpected throws stop. | first defined: Chapter 008 L1
custom Error subclass | domain error subclass | Class extending Error with a literal name and typed fields. | first defined: Chapter 008 L2
Error.cause | cause chaining | `{ cause }` option linking a failure to its origin. | first defined: Chapter 008 L2
Error.isError | - | ES2026 helper detecting real Errors across realms. | first defined: Chapter 008 L2
ensureError | - | Helper normalizing any thrown value into an Error. | first defined: Chapter 008 L2
catch ladder | discrimination ladder | Catch body ordered most to least specific. | first defined: Chapter 008 L2
rewrap at the seam | rewrap | Catching a vendor error and throwing a domain error with `cause`. | first defined: Chapter 008 L2
wire | the wire | The serialized bytes crossing a process boundary. | first defined: Chapter 009 L1
codec | - | The encoder/decoder pair (JSON.stringify/parse). | first defined: Chapter 009 L1
ISO 8601 | - | Standard text format for dates/times in UTC. | first defined: Chapter 009 L1
reviver | - | JSON.parse's optional function transforming parsed pairs. | first defined: Chapter 009 L1
replacer | - | JSON.stringify's optional function transforming fields. | first defined: Chapter 009 L1
prototype pollution | prototype poisoning | Attack via `__proto__`/constructor keys mutating the prototype. | first defined: Chapter 009 L1
structuredClone | deep clone, deep copy | Global deep-copy preserving Date, Map, Set, cycles. | first defined: Chapter 001 L1
hash-private | #private, #-private | `#name` field with runtime-enforced visibility. | first defined: Chapter 009 L2
arrow-field method | arrow field | Class field that's an arrow fn; `this` bound at construction. | first defined: Chapter 009 L2
invariant | - | A state rule that must always hold, enforced via one write path. | first defined: Chapter 009 L2
toJSON | - | Method JSON.stringify calls to choose an instance's wire shape. | first defined: Chapter 009 L2
UTC | Coordinated Universal Time | Global reference clock, no DST or offset. | first defined: Chapter 009 L3
DST | daylight saving time | Seasonal one-hour wall-clock shift, regional. | first defined: Chapter 009 L3
wall-clock time | wall clock | Local civil time DST can shift without the instant changing. | first defined: Chapter 009 L3
IANA tz | IANA timezone, tz database | Timezone identifier with full DST history (Europe/Madrid). | first defined: Chapter 009 L3
Unix epoch | epoch | Reference instant 1970-01-01 UTC machine timestamps count from. | first defined: Chapter 009 L3
sentinel | sentinel value | A special "not a real value" value returned instead of throwing. | first defined: Chapter 009 L3
polyfill | - | Library implementing a not-yet-native API. | first defined: Chapter 009 L3
seam | - | Boundary where the app meets something external, kept in one place. | first defined: Chapter 009 L3
Temporal | Temporal API | ES2026 date/time API replacing Date with immutable types. | first defined: Chapter 009 L3
Temporal.Instant | Instant | UTC moment, nanosecond precision, no timezone. | first defined: Chapter 009 L3
Temporal.ZonedDateTime | ZonedDateTime | Instant plus IANA timezone, DST-aware. | first defined: Chapter 009 L3
Temporal.PlainDate | PlainDate | Calendar date, no time or timezone. | first defined: Chapter 009 L3
Temporal.PlainDateTime | PlainDateTime | Wall-clock date+time, no timezone. | first defined: Chapter 009 L3
Temporal.Duration | Duration | A length of time for arithmetic. | first defined: Chapter 009 L3
lib/temporal.ts | temporal seam | The one file re-exporting the Temporal polyfill. | first defined: Chapter 009 L3
DNS | domain name system | System resolving a hostname to an IP via cache chain. | first defined: Chapter 010 L1
DoH | DNS over HTTPS | DNS tunneled through HTTPS; production-default encrypted DNS. | first defined: Chapter 010 L1
Happy Eyeballs v2 | RFC 8305 | Algorithm racing IPv4/IPv6 lookups, preferring IPv6. | first defined: Chapter 010 L1
QUIC | - | Multiplexed encrypted UDP transport folding in TLS 1.3. | first defined: Chapter 010 L1
HTTP/3 | h3 | HTTP over QUIC on UDP 443; 2026 default. | first defined: Chapter 010 L1
HTTP/2 | h2 | HTTP multiplexed over one TCP connection; the h3 fallback. | first defined: Chapter 010 L1
head-of-line blocking | - | One stalled item holding up everything queued behind it. | first defined: Chapter 010 L1
Alt-Svc | alternative services | Header advertising that an origin also speaks HTTP/3. | first defined: Chapter 010 L1
TLS | Transport Layer Security | Protocol encrypting a connection and authenticating the server. | first defined: Chapter 010 L1
RTT | round-trip time | Cost of one message and its reply; a latency tax. | first defined: Chapter 010 L1
session ticket | - | Cached credential letting a later connection resume faster. | first defined: Chapter 010 L1
resumed connection | session resumption | Repeat connection using a cached ticket for 0-RTT. | first defined: Chapter 010 L1
early data | 0-RTT data | First-packet request bytes on a resumed connection; idempotent GETs only. | first defined: Chapter 010 L1
forward secrecy | perfect forward secrecy | Per-session ephemeral keys; a later key leak can't decrypt past sessions. | first defined: Chapter 010 L1
idempotent | idempotency | A request safe to send more than once. | first defined: Chapter 010 L1
DOM | Document Object Model | In-memory tree of typed element nodes from parsed HTML. | first defined: Chapter 010 L2
CSSOM | CSS Object Model | In-memory tree of style rules, built alongside the DOM. | first defined: Chapter 010 L2
render-blocking resource | render-blocking | Resource (CSS) delaying first paint until parsed. | first defined: Chapter 010 L2
render tree | - | DOM intersected with visible style; what actually paints. | first defined: Chapter 010 L2
layout | reflow | Stage computing geometry for render-tree nodes. | first defined: Chapter 010 L2
layout thrashing | - | Read-write-read forcing repeated synchronous layout. | first defined: Chapter 010 L2
compositor | compositor thread | Thread combining painted layers into the final frame. | first defined: Chapter 010 L2
compositor-only properties | - | CSS (transform, opacity) the compositor applies without layout/paint. | first defined: Chapter 010 L2
Critical Rendering Path | CRP | Dependency chain from bytes to first pixel. | first defined: Chapter 010 L2
FCP | First Contentful Paint | When any content first appears; a Core Web Vital. | first defined: Chapter 010 L2
LCP | Largest Contentful Paint | When the largest above-fold element renders; a Core Web Vital. | first defined: Chapter 010 L2
Server Component | - | React component running only on the server, shipping no JS. | first defined: Chapter 010 L2
hydration | - | React attaching listeners/state to server-rendered DOM. | first defined: Chapter 010 L2
hydration mismatch | - | Server HTML not matching the client render, forcing a re-render. | first defined: Chapter 010 L2
TTFB | time to first byte | Time from URL to first response byte. | first defined: Chapter 010 L1
Chromium | - | Google's open-source browser engine behind most browsers. | first defined: Chapter 010 L3
live DOM | - | The DOM as it stands now, including JS changes; Elements panel view. | first defined: Chapter 010 L3
cascade | CSS cascade | Algorithm resolving conflicting CSS by origin, specificity, order. | first defined: Chapter 010 L3
pseudo-state | pseudo-class state | Colon-prefixed states (:hover, :focus); DevTools can force them. | first defined: Chapter 010 L3
throttle | network throttling | DevTools simulating a slower connection. | first defined: Chapter 010 L3
REPL | read-eval-print loop | Interactive shell evaluating one expression at a time. | first defined: Chapter 010 L3
console utilities | console helpers | DevTools console-only vars/functions ($0, copy(), $_). | first defined: Chapter 010 L3
Core Web Vitals | - | Google's page-health metrics: LCP, INP, CLS. | first defined: Chapter 010 L3
clear site data | - | DevTools button wiping an origin's persistence surfaces. | first defined: Chapter 010 L3
secure context | isSecureContext | Condition gating powerful APIs; met by HTTPS and localhost. | first defined: Chapter 010 L4
SNI | Server Name Indication | Hostname sent in the clear so the server picks a certificate. | first defined: Chapter 010 L4
ALPN | Application-Layer Protocol Negotiation | ClientHello extension negotiating the app protocol (h3, h2). | first defined: Chapter 010 L4
certificate | leaf cert, leaf certificate | Public key plus metadata signed by a CA. | first defined: Chapter 010 L4
Certificate Authority | CA, root CA | Entity signing certificates; root keys preinstalled in trust stores. | first defined: Chapter 010 L4
certificate chain | chain of trust | Path from a leaf cert up to a trusted root. | first defined: Chapter 010 L4
trust store | system trust store | OS/browser store of trusted root CA keys. | first defined: Chapter 010 L4
self-signed certificate | self-signed cert | Cert signed only by itself; browsers reject it. | first defined: Chapter 010 L4
mkcert | - | Dev tool installing a local CA so localhost gets trusted HTTPS. | first defined: Chapter 010 L4
SAN | Subject Alternative Name | List of hostnames a certificate is valid for. | first defined: Chapter 010 L4
safe | safe method, safety | HTTP method with no server-state side effect (GET, HEAD, OPTIONS). | first defined: Chapter 011 L1
CDN | content delivery network | Edge servers caching responses near users. | first defined: Chapter 011 L1
Vary header | Vary | Header listing request headers that vary a cached response. | first defined: Chapter 011 L1
CORS preflight | preflight, Cross-Origin Resource Sharing | Automatic OPTIONS asking if a cross-origin request is allowed. | first defined: Chapter 011 L1
JSON Merge Patch | merge-patch, application/merge-patch+json | RFC 7396 partial-object PATCH; null deletes. Course default. | first defined: Chapter 011 L1
JSON Patch | json-patch, application/json-patch+json | RFC 6902 array-of-ops PATCH for operation semantics. | first defined: Chapter 011 L1
Idempotency-Key | idempotency key | Header keying a stored response to make a method retry-safe. | first defined: Chapter 011 L1
optimistic concurrency | optimistic-concurrency | Submitting a change conditional on the value you read. | first defined: Chapter 011 L1
status code | HTTP status code | Three-digit response outcome the stack reads. | first defined: Chapter 011 L2
status class | status code class | First digit of a status code (1xx–5xx). | first defined: Chapter 011 L2
status line | HTTP status line | Response's first line: version, code, reason phrase. | first defined: Chapter 011 L2
Problem Details | RFC 9457, application/problem+json | IETF JSON error-body shape (type, title, status, detail, instance). | first defined: Chapter 011 L2
problem-type-specific extension | problem extension | Extra Problem Details field fixed per `type` URI. | first defined: Chapter 011 L2
load balancer | - | Server spreading requests across backend instances. | first defined: Chapter 011 L2
upstream | upstream service | The service behind the one handling the request. | first defined: Chapter 011 L2
multi-tenant | multi-tenancy, tenant | One app serving many isolated customers. | first defined: Chapter 011 L2
safeParse | - | Zod's non-throwing validation returning success/error. | first defined: Chapter 011 L2
Post-Redirect-Get | PRG | POST → 303 → GET so the result page is refresh-safe. | first defined: Chapter 011 L2
content negotiation | - | Client/server agreeing on body format via Accept/Content headers. | first defined: Chapter 011 L3
Content-Type | - | Header naming the body's media type and charset. | first defined: Chapter 011 L3
Cache-Control | - | Header of caching directives (max-age, no-store, …). | first defined: Chapter 011 L3
shared cache | - | Multi-user cache (CDN/proxy); stores only `public` responses. | first defined: Chapter 011 L3
conditional request | - | Request returning the body only if changed (ETag/If-Modified-Since). | first defined: Chapter 011 L3
ETag | entity tag | Opaque token identifying a resource version; echoed as If-None-Match. | first defined: Chapter 011 L3
If-Match | - | Write-side conditional for optimistic concurrency; 412 on mismatch. | first defined: Chapter 011 L3
bearer token | Bearer | Plaintext `Authorization: Bearer` credential for programmatic clients. | first defined: Chapter 011 L3
CSRF | Cross-Site Request Forgery | Attack riding the auto-attached cookie; defended by SameSite/Origin. | first defined: Chapter 011 L3
XSS | Cross-Site Scripting | Attacker script running in your origin; closed by a nonce CSP. | first defined: Chapter 011 L3
Content-Security-Policy | CSP | Header declaring allowed script/style/frame sources. | first defined: Chapter 011 L3
nonce | - | Per-request random value matching trusted scripts in a CSP. | first defined: Chapter 011 L3
HSTS | Strict-Transport-Security | Header forcing HTTPS for a host for a window. | first defined: Chapter 011 L3
structured fields | RFC 9651 | Standard grammar for header values; replaces ad-hoc formats. | first defined: Chapter 011 L3
Retry-After | - | Header carrying back-off on a 429 or 503. | first defined: Chapter 011 L3
X-Forwarded-For | XFF | Header proxies append the client IP to; trust rightmost only. | first defined: Chapter 011 L3
Forwarded | RFC 7239 | Standard header folding the X-Forwarded-* set. | first defined: Chapter 011 L3
proxy.ts | - | Next.js 16 rename of middleware.ts; per-request header setter. | first defined: Chapter 011 L3
URL | new URL, URL constructor | Global parsing a URL string into named fields. | first defined: Chapter 012 L1
URLSearchParams | search params | Global building/parsing a query string, owning percent-encoding. | first defined: Chapter 012 L1
WHATWG | Web Hypertext Application Technology Working Group | Body maintaining the URL, HTML, Fetch standards. | first defined: Chapter 012 L1
percent-encoding | URL-encoding | %-plus-hex escaping URLs use. | first defined: Chapter 012 L1
IDN | Internationalized Domain Name | Hostname with non-ASCII chars, normalized via Punycode. | first defined: Chapter 012 L1
Punycode | - | ASCII encoding of Unicode hostnames (xn--…). | first defined: Chapter 012 L1
trailing-slash drift | - | Concatenation bug producing unequal URLs from a stray slash. | first defined: Chapter 012 L1
origin | - | Tuple (scheme, host, port); the browser's strict trust boundary. | first defined: Chapter 012 L2
same-origin policy | SOP | Browser default: a page reads only its own origin's responses. | first defined: Chapter 012 L2
site | same-site, cross-site | Tuple (scheme, eTLD+1); looser, schemeful boundary SameSite uses. | first defined: Chapter 012 L2
effective top-level domain | eTLD | Suffix anyone can register under, from the Public Suffix List. | first defined: Chapter 012 L2
registrable domain | eTLD+1 | eTLD plus one label; the unit a site is keyed on. | first defined: Chapter 012 L2
Public Suffix List | PSL | Maintained list of every eTLD. | first defined: Chapter 012 L2
client certificate | - | Cert the browser presents to authenticate the user, like a cookie. | first defined: Chapter 012 L2
CORS | Cross-Origin Resource Sharing | Access-Control-* headers saying which origins may read a response. | first defined: Chapter 012 L3
simple request | CORS-safelisted request | Cross-origin request meeting safelist criteria, sent directly. | first defined: Chapter 012 L3
preflighted request | preflight | Cross-origin request preceded by an authorizing OPTIONS. | first defined: Chapter 012 L3
credentialed request | credentials include | Cross-origin request carrying cookies; needs Allow-Credentials. | first defined: Chapter 012 L3
Route Handler | route.ts | Next.js route.ts exporting one function per HTTP method. | first defined: Chapter 012 L3
Set-Cookie | - | Response header writing a cookie with its attributes. | first defined: Chapter 013 L1
ambient credential | - | Credential the browser auto-attaches (a cookie); the CSRF threat. | first defined: Chapter 013 L1
HttpOnly | - | Cookie attribute hiding it from JavaScript. | first defined: Chapter 013 L1
Secure (cookie) | Secure attribute | Cookie attribute attaching it only on HTTPS. | first defined: Chapter 013 L1
on-path attacker | - | Anyone on the network path reading/modifying unencrypted traffic. | first defined: Chapter 013 L1
SameSite | SameSite=Strict, SameSite=Lax, SameSite=None | Cookie attribute deciding cross-site attachment (Strict/Lax/None). | first defined: Chapter 013 L1
top-level navigation | - | A request changing the address bar to your site. | first defined: Chapter 013 L1
CSRF double-submit token | double-submit token | CSRF defense matching a cookie token against a header copy. | first defined: Chapter 013 L1
Path (cookie) | Path attribute | Cookie attribute scoping by pathname prefix; not a security boundary. | first defined: Chapter 013 L1
Domain (cookie) | Domain attribute | Cookie attribute extending it to a domain and subdomains. | first defined: Chapter 013 L1
host-only cookie | host-only | Cookie with no Domain, attached to the exact host only; session default. | first defined: Chapter 013 L1
session cookie | - | Cookie with no Max-Age/Expires; unreliable, so set Max-Age. | first defined: Chapter 013 L1
Max-Age | Max-Age attribute | Cookie lifetime in seconds; preferred over Expires. | first defined: Chapter 013 L1
__Host- prefix | __Host- | Name prefix requiring Secure, no Domain, Path=/; host-locked. | first defined: Chapter 013 L1
__Secure- prefix | __Secure- | Name prefix requiring only Secure. | first defined: Chapter 013 L1
Partitioned | CHIPS, Cookies Having Independent Partitioned State | Cookie attribute double-keyed by embedding site. | first defined: Chapter 013 L1
third-party cookie | - | Cookie set under a different site than the address bar; blocked by default. | first defined: Chapter 013 L1
FedCM | Federated Credential Management | Browser API replacing third-party-cookie federated sign-in. | first defined: Chapter 013 L1
Node hierarchy | DOM node hierarchy | The Node → Element → HTMLElement → subclass inheritance chain. | first defined: Chapter 014 L1
Node | - | Abstract base class every DOM tree member inherits from. | first defined: Chapter 014 L1
Element | - | A Node with a tag and attributes (HTML and SVG). | first defined: Chapter 014 L1
HTMLElement | - | An Element specialized to HTML (style, dataset, hidden). | first defined: Chapter 014 L1
abstract base class | - | A class never instantiated, existing only to be inherited from. | first defined: Chapter 014 L1
subclass | - | A class inheriting from and specializing a general one. | first defined: Chapter 014 L1
CSS selector | selector | CSS patterns used as a query language by querySelector. | first defined: Chapter 014 L1
HTMLCollection | - | Live collection of element children (element.children). | first defined: Chapter 014 L1
NodeList | - | Node collection from childNodes (live) or querySelectorAll (static). | first defined: Chapter 014 L1
live collection | live | Collection reflecting the tree now, not a copy. | first defined: Chapter 014 L1
static collection | static | Collection frozen at creation; querySelectorAll's result. | first defined: Chapter 014 L1
index drift | - | Bug where removing nodes while index-iterating a live collection skips some. | first defined: Chapter 014 L1
DocumentFragment | - | Off-tree node container; substrate behind React Portals. | first defined: Chapter 014 L1
HTML attribute | attribute | Parse-time string from source; getAttribute/setAttribute. | first defined: Chapter 014 L2
DOM property | property | Live typed field on the element object; element.propName. | first defined: Chapter 014 L2
reflect | reflection | An attribute and same-named property staying in sync. | first defined: Chapter 014 L2
boolean attribute | - | Attribute meaning carried by presence/absence (disabled, checked). | first defined: Chapter 014 L2
enumerated attribute | - | Attribute with a fixed value set; out-of-set falls back. | first defined: Chapter 014 L2
dataset | - | Property exposing data-* attributes as a camelCased object. | first defined: Chapter 014 L2
capture phase | capture | Downward leg of propagation, window→target; opt in via {capture:true}. | first defined: Chapter 014 L3
bubble phase | bubbling | Upward leg of propagation, target→window; the default phase. | first defined: Chapter 014 L3
event target | target, event.target | The element actually interacted with; fixed for the whole trip. | first defined: Chapter 014 L3
currentTarget | event.currentTarget | The element the running handler is attached to; changes during the trip. | first defined: Chapter 014 L3
event delegation | delegation | One ancestor listener handling many descendants via event.target.closest(). | first defined: Chapter 014 L3
default action | - | The browser's built-in reaction to an event; canceled with preventDefault(). | first defined: Chapter 014 L3
preventDefault | event.preventDefault | Cancels the default action without stopping propagation. | first defined: Chapter 014 L3
stopPropagation | event.stopPropagation | Halts the event's trip; breaks delegation, a design smell. | first defined: Chapter 014 L3
closest | element.closest | Climbs ancestors returning the nearest matching a selector, or null. | first defined: Chapter 014 L1
focusin | focusin, focusout | Bubbling counterparts of focus/blur (which fire only at the target). | first defined: Chapter 014 L3
passive listener | passive: true | Listener promising not to call preventDefault, so scroll/zoom isn't blocked. | first defined: Chapter 014 L3
once listener | once: true | Listener auto-removed after firing once. | first defined: Chapter 014 L3
pointer events | pointer event, pointerdown | pointer* family unifying mouse, touch, and pen. | first defined: Chapter 014 L3
SyntheticEvent | synthetic event | React's cross-browser wrapper around the native DOM event. | first defined: Chapter 014 L3
root container | - | Element a React app mounts into; where React delegates events into SyntheticEvents. | first defined: Chapter 014 L3
main thread | - | The single browser thread running JS and painting; busy work blocks rendering. | first defined: Chapter 034 L5
next/script | Script component | Next.js component scheduling when a third-party script loads. | first defined: Chapter 034 L5
afterInteractive | - | next/script default strategy: loads right after hydration begins. | first defined: Chapter 034 L5
lazyOnload | - | next/script strategy: loads during browser idle, after everything else. | first defined: Chapter 034 L5
beforeInteractive | - | next/script strategy: loads before Next.js code, root layout only. | first defined: Chapter 034 L5
worker strategy | strategy="worker" | next/script strategy offloading a script to a Web Worker via Partytown; Pages Router only. | first defined: Chapter 034 L5
Web Worker | - | Background browser thread running JS off the main thread, no DOM access. | first defined: Chapter 034 L5
Partytown | - | Library relaying third-party scripts into a Web Worker, off the main thread. | first defined: Chapter 034 L5
GDPR | - | EU law requiring a legal basis (usually consent) before processing personal data. | first defined: Chapter 034 L4
ePrivacy | cookie law | EU directive governing cookies and trackers; non-essential trackers await consent. | first defined: Chapter 034 L5
inline script | - | A next/script with its JS as content, not a src URL; needs an id to dedupe. | first defined: Chapter 034 L5
vendor SDK | npm SDK | Typed npm package a vendor ships instead of a raw snippet; imported, tree-shakable, React-wired. | first defined: Chapter 034 L5
@next/third-parties | - | Official Next.js package wrapping vendor snippets (GA, GTM) in tuned components. | first defined: Chapter 034 L5
numeric | NUMERIC, DECIMAL | Postgres exact-decimal type; stores literal digits, no float rounding; reads as string in Drizzle. | first defined: Chapter 037 L3
precision | - | Total count of significant digits a numeric column stores, both sides of the point. | first defined: Chapter 037 L3
scale | - | Number of digits a numeric column stores after the decimal point. | first defined: Chapter 037 L3
timestamptz | timestamp with time zone | Postgres type storing an absolute UTC instant, converting on in/out. | first defined: Chapter 037 L3
UUID | universally unique identifier | 128-bit value, 36-char string, unique without central coordination; crypto.randomUUID() mints v4. | first defined: Chapter 016 L1
UUIDv4 | uuid v4 | Fully-random UUID, 122 bits entropy; not time-sortable; Postgres gen_random_uuid() / Drizzle .defaultRandom(). | first defined: Chapter 016 L1
UUIDv7 | uuid v7 | Time-ordered UUID; leading bits are a timestamp so IDs sort by creation; native in Postgres 18. | first defined: Chapter 016 L1
surrogate key | - | Primary key with no business meaning, generated solely to identify the row. | first defined: Chapter 037 L3
pgEnum | Postgres enum | Drizzle builder declaring a named Postgres enum type and a column for a fixed value set. | first defined: Chapter 037 L3
lookup table | - | A table with one row per allowed value, the alternative to an enum when values need attributes. | first defined: Chapter 037 L3
junction table | join table | A table that connects rows of two other tables, one row per link. | first defined: Chapter 037 L3
jsonb | - | Postgres binary, indexable, queryable JSON type; course default over plain json. | first defined: Chapter 037 L3
inet | - | Postgres type for an IP address (IPv4/IPv6) understood as a network, enabling subnet queries. | first defined: Chapter 037 L3
normalization debt | - | A jsonb field you keep querying into that should have been a real column. | first defined: Chapter 037 L3
foreign key | FK | A column constraint Postgres enforces on writes, rejecting rows that don't reference an existing parent row. | first defined: Chapter 037 L6
defineRelations | - | Drizzle Relations v2 API declaring the whole traversal graph in one call, keyed by table name. | first defined: Chapter 037 L9
Relations v2 | relations v2 API | Drizzle's single-call relations API (from/to/through), replacing the v1 per-table relations() helper. | first defined: Chapter 037 L9
relational query builder | relational query API, db.query | The db.query.* findFirst/findMany API that reads the relations graph to assemble nested typed objects. | first defined: Chapter 037 L9
Relations v1 | relations v1, legacy relations API | Drizzle's older per-table relations() helper (drizzle-orm/_relations), queried via db._query. | first defined: Chapter 037 L9
.through() | through | Relations v2 chain on from/to naming a junction column, so a many-to-many hops through the junction. | first defined: Chapter 037 L9
pure junction | - | A junction table holding only foreign keys, walked through with .through() rather than related to. | first defined: Chapter 037 L8
self-referential relation | self-relation | A relation whose from and to columns both live on one table (e.g. a comment's parent). | first defined: Chapter 037 L9
database index | index | A separate sorted structure mapping keys to row locations, letting the engine skip a full scan. | first defined: Chapter 039 L1
sequential scan | seq scan | Reading every row in a table in order, with no shortcut to the matching rows. | first defined: Chapter 038 L6
query planner | planner | Postgres component that estimates each execution path's cost and picks the cheapest. | first defined: Chapter 039 L1
selectivity | selective | The fraction of a table's rows a predicate keeps; few rows = highly selective. | first defined: Chapter 039 L1
B-tree | btree | Balanced sorted tree; default Postgres index, fast for equality, ranges, and ordered reads. | first defined: Chapter 037 L5
composite index | multi-column index | One index over several columns, sorted left to right. | first defined: Chapter 039 L1
leftmost-prefix rule | leftmost prefix | A composite index serves only queries using a left-anchored prefix of its columns. | first defined: Chapter 039 L1
partial index | - | An index over only the rows matching a .where() predicate. | first defined: Chapter 037 L7
expression index | functional index | An index on a computed expression (lower(col), a cast) instead of the raw column. | first defined: Chapter 037 L7
unique index | uniqueIndex | A B-tree that also enforces uniqueness; rejects duplicate values at write time. | first defined: Chapter 037 L7
partial unique index | - | uniqueIndex(...).where(...) enforcing uniqueness only among rows matching a predicate. | first defined: Chapter 039 L1
GIN | generalized inverted index | Index mapping each value contained in a column back to the rows that hold it. | first defined: Chapter 039 L1
operator class | opclass | Per-type strategy an index uses to compare values, e.g. jsonb_path_ops. | first defined: Chapter 039 L1
write tax | - | The extra writes every insert/update/delete pays to keep each index in sync. | first defined: Chapter 039 L1
low-cardinality column | low cardinality | A column with few distinct values (booleans, small enums); usually not worth a full index. | first defined: Chapter 039 L1
CONCURRENTLY | - | CREATE INDEX option that builds without locking the table's writes. | first defined: Chapter 039 L1
fetch | fetch API | Async network primitive: `fetch(input, init)` resolving to a Response; rejects only on transport failure. | first defined: Chapter 015 L1
Response | - | Resolved result of `await fetch`: status, ok, headers, and a body read once via a consumer method. | first defined: Chapter 015 L1
Request | - | Web Platform outbound request type: URL, method, headers, body; built inline via init or `new Request`. | first defined: Chapter 015 L1
Headers | - | Case-insensitive multimap of header name to value(s); .get/.set/.append/.entries. | first defined: Chapter 015 L1
init object | init | fetch's second argument carrying method, headers, body, signal. | first defined: Chapter 015 L1
five seams | fetch seams, seam (fetch) | build, send, ok-branch, parse, catch — the five stages of every fetch call. | first defined: Chapter 015 L1
response.ok | ok | True for any 200–299 status; the branch separating an error answer from no answer. | first defined: Chapter 015 L1
consumer method | body consumer | A Response body reader (json/text/formData/blob/arrayBuffer); drains the stream, callable once. | first defined: Chapter 015 L1
multipart boundary | boundary marker | Random marker in a multipart Content-Type the server uses to split fields; browser sets it for FormData. | first defined: Chapter 015 L1
XMLHttpRequest | XHR | Legacy request primitive fetch replaced, surviving only for upload-progress events. | first defined: Chapter 015 L1
apiFetch | - | In-house typed fetch helper factoring the five seams into one place; extract on the third repetition. | first defined: Chapter 015 L1
FormData | - | Multipart body shape that can carry files; set no Content-Type so the browser adds the boundary. | first defined: Chapter 015 L1
ReadableStream | - | Pull-based stream of chunks; response.body is one, read with for await. | first defined: Chapter 015 L2
stream chunk | chunk (stream) | One network frame of a streamed body; a Uint8Array, sized by the network not your data. | first defined: Chapter 015 L2
Uint8Array | - | Fixed-length array of bytes; each stream chunk is one, decoded to text by TextDecoder. | first defined: Chapter 015 L2
buffering | buffered | Reading a body to completion before acting, the opposite of pulling chunks as they arrive. | first defined: Chapter 015 L2
TextDecoder | - | Platform object turning bytes to a string; { stream: true } holds back split multi-byte chars. | first defined: Chapter 015 L2
TextEncoder | - | Platform object turning a string to its UTF-8 bytes; used to write onto a stream. | first defined: Chapter 015 L2
Server-Sent Events | SSE | One-way server→client convention over a text/event-stream response: data: lines split by blank lines. | first defined: Chapter 015 L2
Last-Event-ID | - | Request header the browser sends on SSE reconnect, carrying the last id: so the server resumes. | first defined: Chapter 015 L2
EventSource | - | Browser API opening an SSE connection, parsing events, and auto-reconnecting with last-id replay. | first defined: Chapter 015 L2
polling | poll | Default live-update channel: a normal request-response call repeated on an interval. | first defined: Chapter 015 L2
WebSockets | WebSocket | Bidirectional connection where client and server send on the same live channel; no HTTP cache. | first defined: Chapter 015 L2
Web Crypto | crypto global, crypto | Built-in crypto global: randomUUID, getRandomValues, and the subtle algorithm surface; never imported. | first defined: Chapter 016 L1
CSPRNG | cryptographically secure PRNG | Random source unpredictable even to an attacker who saw prior outputs; unlike Math.random(). | first defined: Chapter 016 L1
base64url | - | URL-safe base64: - and _ for + and /, no = padding; drops into URLs, headers, JWTs. | first defined: Chapter 016 L1
entropy | - | Amount of unpredictable randomness in a value, in bits; each bit doubles the possible-value space. | first defined: Chapter 016 L1
CryptoKey | - | Opaque handle to key material held by the platform; passed to sign/verify, raw bytes not readable unless extractable. | first defined: Chapter 016 L1
HMAC | - | Keyed hash: one shared secret signs and verifies, proving a payload came from a secret-holder. | first defined: Chapter 016 L1
digest | - | One-shot hash (e.g. SHA-256) of a byte buffer; same input always yields the same fixed-length output. | first defined: Chapter 016 L1
ArrayBuffer | - | Raw byte container you can't index; wrap in a Uint8Array view to read it; subtle methods return one. | first defined: Chapter 016 L1
timing attack | constant-time compare | Leaking secret bytes via how long a short-circuiting compare (===) takes; fixed by comparing every byte. | first defined: Chapter 016 L1
transient user activation | user activation, user gesture | Short-lived 'user just interacted' flag set on a gesture and cleared ~1s later; clipboard write needs it live. | first defined: Chapter 016 L2
Client Component | use client | File starting with 'use client'; ships to the browser, can use state and browser APIs. | first defined: Chapter 016 L2
ClipboardItem | - | Object holding one clipboard entry as several MIME-typed representations, so each paste target picks its format. | first defined: Chapter 016 L2
live region | role=status | Element assistive tech announces when its text changes, e.g. role="status" for a 'Copied' message. | first defined: Chapter 016 L2
Blob | - | Immutable, fixed-length byte sequence carrying a claimed MIME type; the universal in-memory binary container. | first defined: Chapter 016 L3
MIME type | content type | Short string like image/png labeling the kind of bytes; a claim, not verified against content. | first defined: Chapter 016 L3
File | - | A named Blob subclass the browser hands you from a file input; adds name and lastModified. | first defined: Chapter 016 L3
FileList | - | Array-like list of File objects from a file input or drop; spread it before mapping. | first defined: Chapter 016 L3
object URL | URL.createObjectURL, blob: URL | Temporary blob:<origin>/<uuid> handle mapping to bytes in browser memory; pins them until revoked. | first defined: Chapter 016 L3
URL.revokeObjectURL | revokeObjectURL | Removes an object URL's map entry so its bytes can be collected; matches every createObjectURL. | first defined: Chapter 016 L3
data URL | - | data:<type>;base64,... string embedding bytes inline; ~33% larger than raw, re-encoded each use. | first defined: Chapter 016 L3
presigned URL | signed URL | Server-signed, short-expiry URL letting the holder PUT straight to object storage; bytes skip the app server. | first defined: Chapter 016 L3
object storage | blob storage, S3/R2 | Service holding files as key-addressed objects (S3, R2, GCS); serves large binaries cheaply and directly. | first defined: Chapter 016 L3
localStorage | Web Storage | Per-origin string key/value store; persists across reloads, tabs, and restarts; synchronous, ~5-10MB quota. | first defined: Chapter 016 L4
sessionStorage | Web Storage | Same API as localStorage but scoped to one tab and wiped when it closes. | first defined: Chapter 016 L4
storage event | - | Fires in OTHER same-origin tabs when a localStorage key changes; carries key, oldValue, newValue. | first defined: Chapter 016 L4
useSyncExternalStore | - | React hook binding a component to a value outside React; getServerSnapshot supplies the SSR value. | first defined: Chapter 016 L4
suppressHydrationWarning | - | React prop telling it one element will differ server-vs-client; not a general storage-warning silencer. | first defined: Chapter 016 L4
IndexedDB | - | Async, queryable in-browser database; the answer for large or structured client data. | first defined: Chapter 016 L4
BroadcastChannel | - | Browser API sending arbitrary messages between same-origin tabs. | first defined: Chapter 016 L4
JSX | JavaScript XML | JavaScript with an XML-like element syntax; compiles to jsx() calls. | first defined: Chapter 017 L1
JSX transform | - | Build step rewriting JSX into plain jsx() function calls. | first defined: Chapter 017 L1
Turbopack | - | Next.js's Rust-based bundler. | first defined: Chapter 017 L1
automatic runtime | - | Modern JSX transform that imports and emits jsx() with zero config. | first defined: Chapter 017 L1
element descriptor | React element | Plain object describing what to render, not a DOM node. | first defined: Chapter 017 L1
intrinsic element | - | A built-in HTML tag React knows (div, button, input). | first defined: Chapter 017 L1
prop | - | A named input set on a JSX element; name="value" after the tag. | first defined: Chapter 017 L1
key | React key | Stable data-tied id letting React match list items across renders. | first defined: Chapter 017 L1
reconciliation | - | React matching previous and current elements when re-rendering. | first defined: Chapter 017 L1
fragment | React.Fragment | <>...</> grouping siblings into one root, emitting no DOM node. | first defined: Chapter 017 L1
void element | - | HTML element that holds no children; must self-close in JSX. | first defined: Chapter 017 L1
JSX.IntrinsicElements | - | TS registry of every HTML element and the props it accepts. | first defined: Chapter 017 L1
Next.js | - | React framework handling routing, rendering, and the server. | first defined: Chapter 017 L2
App Router | - | Next.js file-based router; folders under app/ are URLs, layout.tsx/page.tsx define renders. | first defined: Chapter 017 L2
root layout | app/layout.tsx | App Router's outermost layout; rendered once per route, owns html and body. | first defined: Chapter 017 L2
metadata API | metadata, generateMetadata | Next.js declarative head authoring via exported metadata object or generateMetadata. | first defined: Chapter 017 L2
quirks mode | - | Legacy rendering mode emulating 1990s browser bugs; avoided via DOCTYPE. | first defined: Chapter 017 L2
mojibake | - | Garbled text from decoding bytes with the wrong character encoding. | first defined: Chapter 017 L2
provider | - | Component supplying app-wide context (theme, cache, locale) to its subtree. | first defined: Chapter 017 L2
portal target | - | Fixed DOM node React renders overlay UI (toasts, modals) into from anywhere. | first defined: Chapter 017 L2
subsetting | subset | Shipping only the glyphs a language needs to shrink a font file. | first defined: Chapter 017 L2
layout shift | - | Content jumping as a late-loading font or image arrives. | first defined: Chapter 017 L2
next/font | - | Next.js font loader; self-hosts, subsets, and preloads fonts at build time. | first defined: Chapter 017 L2
landmark | landmark region | Page region assistive tech can jump straight to, from elements like main, nav, header. | first defined: Chapter 017 L3
WCAG | Web Content Accessibility Guidelines | W3C accessibility standard; level AA is the usual baseline target. | first defined: Chapter 017 L3
accessibility tree | a11y tree | Browser-computed tree from the DOM holding each element's role, name, state; what assistive tech reads. | first defined: Chapter 017 L3
role | - | An element's semantic identity in the accessibility tree (button, banner, navigation). | first defined: Chapter 017 L3
ARIA | - | HTML attributes supplying roles, states, names to assistive tech when native HTML can't. | first defined: Chapter 017 L3
accessible name | - | The text assistive tech announces for an element, from a heading reference or literal label. | first defined: Chapter 017 L3
button element | <button> | HTML control that performs an action in place (submit, toggle, open); never navigates. | first defined: Chapter 017 L4
link | anchor, <a> | The anchor element; a control that navigates to a URL. | first defined: Chapter 017 L4
Preflight | Tailwind Preflight | Tailwind base layer zeroing default browser styling so elements start visually neutral. | first defined: Chapter 017 L4
tabnabbing | - | Attack where a target=_blank page uses window.opener to redirect the original tab to a phishing page. | first defined: Chapter 017 L4
Link | next/link | Next.js navigation component; renders to a plain <a href> and adds soft navigation. | first defined: Chapter 017 L4
soft navigation | client-side navigation | JS-handled route change swapping only changed parts; no full reload or white flash. | first defined: Chapter 017 L4
unordered list | <ul> | Bullet list where item order carries no meaning. | first defined: Chapter 017 L4
ordered list | <ol> | Numbered list where item order is meaningful. | first defined: Chapter 017 L4
list item | <li> | The only valid direct child of a <ul> or <ol>. | first defined: Chapter 017 L4
form control | control | Any interactive form element the browser submits: input, select, textarea, button. | first defined: Chapter 017 L5
progressive enhancement | - | Page works as plain HTML first; JS layers extra behavior on top of a working baseline. | first defined: Chapter 017 L5
name attribute | name | The key a control's value lands under in FormData; the contract with the server. | first defined: Chapter 017 L5
autoComplete | autofill token | Semantic token (email, new-password) telling browsers/password managers what a field holds. | first defined: Chapter 017 L5
trust boundary | - | The line between bypassable client checks and the server check that actually enforces a rule. | first defined: Chapter 017 L5
data-* attribute | data attribute, custom data attribute | Author-defined HTML attribute the browser stores but never renders or interprets; a private channel to your own scripts/styles. | first defined: Chapter 017 L6
disclosure | - | A control that shows and hides a section of content (accordion header, more-details toggle, menu button). | first defined: Chapter 017 L6
tabular data | - | Data shaped as a grid of like records: every row the same kind of thing, every column the same attribute, each cell at a (row, column). | first defined: Chapter 017 L6
transpose | - | Swapping a grid's rows and columns; a positive test for whether data is genuinely tabular. | first defined: Chapter 017 L6
scope (th attribute) | scope=col, scope=row | The <th> attribute declaring whether a header labels its column or its row, wiring each cell to the right header. | first defined: Chapter 017 L6
utility class | utility | Single-purpose CSS class setting one declaration; p-4 = padding: 1rem. | first defined: Chapter 018 L1
utility-first | - | Composing UI from single-purpose classes on the element instead of bespoke named classes in a stylesheet. | first defined: Chapter 018 L1
theme token | design token | Named value in the design system (spacing 4, primary color) that utilities reference for consistency. | first defined: Chapter 018 L1
Tailwind variant | variant prefix | Colon prefix wrapping a utility in a selector or media query (hover:, md:); changes when it applies, not what. | first defined: Chapter 018 L1
breakpoint | min-width breakpoint | Screen-width threshold where layout changes; Tailwind's sm/md/lg are min-width gates applying at that width and up. | first defined: Chapter 018 L1
arbitrary value | bracket value | Any CSS value in square brackets (w-[37rem]) for when no scale token fits. | first defined: Chapter 018 L1
token namespace | namespace, @theme namespace | The prefix of a @theme token (--color-, --spacing-) that decides which utility family it mints. | first defined: Chapter 018 L2
@theme | - | Tailwind v4 CSS directive defining design tokens that mint utility families. | first defined: Chapter 018 L2
@utility | - | Tailwind v4 CSS directive authoring a brand-new utility in CSS. | first defined: Chapter 018 L2
@custom-variant | - | Tailwind v4 CSS directive authoring a new variant prefix from a selector or media query. | first defined: Chapter 018 L2
@container | container query utility | Tailwind v4 utility marking an ancestor as a query container so @-variants read its width. | first defined: Chapter 018 L2
container query | - | CSS query styling an element by an ancestor container's size rather than the viewport. | first defined: Chapter 018 L2
viewport | - | The browser window's visible area; its width drives sm/md/lg breakpoints. | first defined: Chapter 018 L2
Lightning CSS | - | The Rust-based CSS engine Tailwind v4 uses to parse, transform, and minify, replacing PostCSS. | first defined: Chapter 018 L2
OKLCH | - | Perceptually-uniform color space (lightness, chroma, hue); Tailwind v4's default palette. | first defined: Chapter 018 L2
monorepo | - | A single repository holding multiple projects or packages built together. | first defined: Chapter 018 L2
cn() | cn helper | clsx then tailwind-merge in one helper; flattens conditional classes, then resolves Tailwind conflicts last-wins. | first defined: Chapter 018 L3
clsx | - | Tiny Tailwind-blind utility joining truthy class inputs (strings, arrays, objects) into one space-separated string. | first defined: Chapter 018 L3
tailwind-merge | twMerge | Tailwind-aware utility grouping conflicting utilities by property and keeping only the last. | first defined: Chapter 018 L3
ClassValue | - | clsx's input type: string, number, boolean, null, undefined, arrays of those, or class-key objects. | first defined: Chapter 018 L3
group | group variant | Tailwind utility marking a parent so descendants style on its state via group-* (group-hover:). | first defined: Chapter 018 L4
peer | peer variant | Tailwind utility marking an element so a later sibling styles on its state via peer-* (peer-invalid:); only reaches forward. | first defined: Chapter 018 L4
has- | has variant, :has() | Tailwind variant wrapping CSS :has() so a parent styles itself by a descendant it contains. | first defined: Chapter 018 L4
Constraint Validation | - | Browser's built-in form validity from HTML attributes (required, type=email); sets :invalid with no JS. | first defined: Chapter 018 L4
semantic token | role token, color role | Color named for its UI job (background, card, primary), not its value; theme supplies the value. | first defined: Chapter 018 L5
foreground | -foreground token | On-surface token (text/icons) paired with each surface token for legible contrast in both themes. | first defined: Chapter 018 L5
theme | value set | One set of values for the role tokens; same names, swapped values per theme (light/dark). | first defined: Chapter 018 L5
@theme inline | inline theme | @theme variant emitting var() refs into utilities so per-theme overrides resolve on the element, not :root. | first defined: Chapter 018 L5
FOUC | flash of unstyled content | Brief flash of the default/wrong theme before the correct one applies on load. | first defined: Chapter 018 L6
next-themes | - | React library injecting a pre-paint inline script to set the theme class, persist it, and track the OS preference. | first defined: Chapter 018 L6
prefers-color-scheme | - | CSS media query exposing the OS light/dark setting. | first defined: Chapter 018 L6
first paint | - | The browser's first pixels, drawn before any React code runs. | first defined: Chapter 018 L6
ThemeProvider | - | next-themes provider that wraps the app, holds theme config, and injects the pre-paint script. | first defined: Chapter 018 L6
resolvedTheme | - | useTheme() value: the concrete theme in effect ('light'/'dark') after 'system' resolves, vs settable theme. | first defined: Chapter 018 L6
declaration | CSS declaration | A single property: value pair inside a CSS rule. | first defined: Chapter 019 L1
user-agent stylesheet | UA stylesheet | The browser's built-in default styles. | first defined: Chapter 019 L1
cascade layer | layer, @layer | Named bucket of CSS rules declared with @layer; layer order outranks specificity. | first defined: Chapter 019 L1
specificity | specificity tuple | Four-part tuple (inline, ID, class, element) ranking selectors; gate 3 of the cascade. | first defined: Chapter 019 L1
source order | - | Last-declared-wins tiebreaker; gate 4 of the cascade. | first defined: Chapter 019 L1
!important | important | Marks a declaration adjudicated at gate 1; inverts layer order. | first defined: Chapter 019 L1
:where() | where | Specificity-zero selector wrapper; its contents add nothing to the tuple. | first defined: Chapter 019 L1
:is() | is | Selector wrapper taking the specificity of its most specific argument. | first defined: Chapter 019 L1
unlayered CSS | unlayered | A rule outside any @layer; cascades as if in a layer after every named one, beating them all. | first defined: Chapter 019 L1
Computed panel | - | DevTools view showing each property's final resolved value and the rule and layer that supplied it. | first defined: Chapter 019 L1
inheritance | CSS inheritance | Per-property flag; when no rule sets a property, an inheriting one copies the parent's computed value. | first defined: Chapter 019 L2
computed value | - | Final value the browser uses after the cascade and unit math; what inheritance copies. | first defined: Chapter 019 L2
initial value | - | A property's spec-defined default, used when the cascade supplies none and it does not inherit. | first defined: Chapter 019 L2
currentColor | - | CSS keyword resolving to the element's computed color; lets any property ride the inherited text color. | first defined: Chapter 019 L2
custom property | CSS custom property, CSS variable | Author-defined --name property set once and read with var(); inherits like text properties. | first defined: Chapter 019 L2
prose | @tailwindcss/typography, prose class | Typography-plugin class that restyles raw unclassed HTML with tokenized, themeable typographic defaults. | first defined: Chapter 019 L3
primitive token | primitive, primitive tier | Raw palette value named for appearance (--blue-500, --spacing-4); the bottom token tier. | first defined: Chapter 019 L4
component token | component tier | Token scoped to one component (--button-primary-bg); rare top tier above semantic. | first defined: Chapter 019 L4
@property | at-property | CSS at-rule typing a custom property (syntax/inherits/initial-value) so it can interpolate. | first defined: Chapter 019 L4
box model | - | The four nested boxes (content, padding, border, margin) every element renders as. | first defined: Chapter 020 L1
content box | - | Innermost box where text and children render; what width targets under content-box. | first defined: Chapter 020 L1
padding box | - | Box wrapping content with inside space; takes the element's background. | first defined: Chapter 020 L1
border box | - | The visible edge box where border-* utilities draw. | first defined: Chapter 020 L1
margin box | - | Outermost transparent band pushing neighbors away; the only box that collapses. | first defined: Chapter 020 L1
box-sizing | - | Property deciding whether width targets the content box or the border box. | first defined: Chapter 020 L1
content-box | - | Old box-sizing default; width sizes content only, padding and border add on top. | first defined: Chapter 020 L1
border-box | - | box-sizing value where width includes padding and border; Preflight's default. | first defined: Chapter 020 L1
spacing scale | - | Tailwind's --spacing-multiplier system; p-4, m-2 etc. compile to calc(--spacing * n). | first defined: Chapter 020 L1
4px grid | - | Convention of spacing in multiples of 4px; Tailwind's default --spacing step. | first defined: Chapter 020 L1
margin collapse | collapsing margins | Adjacent vertical block margins merge to the larger instead of summing; block-axis, normal-flow only. | first defined: Chapter 020 L1
block-level element | block element | Element taking full width and stacking on a new line (div, p, section); vs inline. | first defined: Chapter 020 L1
normal flow | - | Default top-to-bottom, left-to-right layout before flex, grid, or positioning. | first defined: Chapter 020 L1
logical properties | logical property | Direction-aware properties (padding-inline-start) resolving against writing direction so layouts mirror in RTL. | first defined: Chapter 020 L1
inline axis | - | The axis text flows along; horizontal in English. | first defined: Chapter 020 L1
block axis | - | The axis blocks stack along; vertical in English, perpendicular to inline. | first defined: Chapter 020 L1
RTL | right-to-left | Writing direction of Arabic, Hebrew, Persian; text and layout flow right to left. | first defined: Chapter 020 L1
mx-auto | margin-inline: auto | Centers a fixed-width block in flow by splitting leftover horizontal space evenly. | first defined: Chapter 020 L1
display | - | CSS property setting an element's outer role (block/inline) and inner formatting context (flow/flex/grid), or no box. | first defined: Chapter 020 L2
formatting context | - | The layout rules a container imposes on its children; display's inner part picks flow, flex, or grid. | first defined: Chapter 020 L2
layout tree | - | Tree of boxes the browser lays out and paints, derived from but not identical to the DOM. | first defined: Chapter 020 L2
inline-block | - | display value flowing in the text line like inline but honoring width, height, and reserved vertical space like block. | first defined: Chapter 020 L2
flex | flexbox | display inner context laying direct children out in one dimension, a single row or column. | first defined: Chapter 020 L2
grid | CSS grid | display inner context placing children into a two-dimensional structure of rows and columns. | first defined: Chapter 020 L2
display: contents | contents | display value removing an element's own box so its children rise into the grandparent's layout; element stays in the DOM. | first defined: Chapter 020 L2
assistive technology | AT | Software helping people with disabilities use a computer: screen readers, magnifiers, switch devices, voice control. | first defined: Chapter 020 L2
visibility: hidden | invisible | Hides an element from sight while keeping its box and reserved space; drops it from the accessibility tree. | first defined: Chapter 020 L2
aria-hidden | - | Attribute pruning an element from the accessibility tree only; stays visible and takes space. Never on focusable elements. | first defined: Chapter 020 L2
sr-only | - | Tailwind utility hiding an element visually while keeping it in the accessibility tree for screen readers. | first defined: Chapter 020 L2
conditional render | - | Mounting an element only when a condition holds ({cond && <X/>}); when false it leaves both trees and React tears down its state. | first defined: Chapter 020 L2
flex container | - | Element with display: flex; lays direct children along an axis and distributes space between them. | first defined: Chapter 020 L3
flex item | - | Direct child of a flex container; can grow, shrink, and be aligned. | first defined: Chapter 020 L3
main axis | - | Primary axis a flex container lays items along; horizontal in a row, vertical with flex-col. | first defined: Chapter 020 L3
cross axis | - | Axis perpendicular to the main axis; vertical in a default row. | first defined: Chapter 020 L3
flex-grow | flex-grow | How much an item grows to absorb free space relative to siblings; 0 means don't grow. | first defined: Chapter 020 L3
flex-shrink | flex-shrink | How much an item gives up space when the container is too small; 0 means refuse to shrink. | first defined: Chapter 020 L3
flex-basis | flex-basis | An item's starting size along the main axis before grow and shrink apply. | first defined: Chapter 020 L3
min-content | min-content width | Narrowest an element can get without content overflowing; roughly its longest unbreakable run of text. | first defined: Chapter 020 L3
min-w-0 | - | Tailwind utility overriding min-width: auto so a flex item can shrink below its content width. | first defined: Chapter 020 L3
truncate | - | Tailwind text utility clipping overflow to one line with an ellipsis. | first defined: Chapter 020 L3
justify-content | justify-* | Distributes flex items along the main axis (start, between, center). | first defined: Chapter 020 L3
align-items | items-* | Positions flex items across the cross axis (stretch, center, baseline). | first defined: Chapter 020 L3
align-self | self-* | Overrides cross-axis alignment for a single flex item. | first defined: Chapter 020 L3
gap | gap-* | Space between siblings in a flex/grid container; not before first or after last. | first defined: Chapter 020 L6
grid container | - | Element with display: grid; defines row and column tracks, direct children become items. | first defined: Chapter 020 L4
grid item | - | Direct child of a grid container; occupies one or more cells, auto-placed unless it positions itself. | first defined: Chapter 020 L4
track | grid track | A single column or row of a grid, set by grid-template-columns/rows; has a size, items fill its cells. | first defined: Chapter 020 L4
cell | grid cell | Intersection of one column track and one row track; the box an item can occupy. | first defined: Chapter 020 L4
fr | fr unit, fraction unit | Grid track unit equal to one share of leftover space after fixed/content tracks are subtracted. | first defined: Chapter 020 L4
minmax | minmax(min, max) | Grid track function bounding a track between a min and max size; minmax(0,1fr) lets a track shrink below its content. | first defined: Chapter 020 L4
media query | - | CSS @media rule applying styles only when a condition like a min viewport width holds; mechanism behind breakpoints. | first defined: Chapter 020 L4
auto-fit | - | repeat() keyword creating as many tracks as fit and collapsing empty trailing tracks so present items stretch. | first defined: Chapter 020 L4
auto-fill | - | repeat() keyword creating as many tracks as fit but keeping empty trailing tracks at min width. | first defined: Chapter 020 L4
app shell | page shell | Fixed chrome around an app's scrolling content: header, sidebar, main, footer. | first defined: Chapter 020 L4
named template areas | grid-template-areas | Grid feature mapping named regions in an ASCII-art string; children claim a region with grid-area. | first defined: Chapter 020 L4
subgrid | grid-rows-subgrid, grid-cols-subgrid | A nested grid adopting its parent's tracks so children align on the parent's shared lines. | first defined: Chapter 020 L4
Baseline | - | Feature supported across all current major browsers; safe to ship without a fallback. | first defined: Chapter 020 L4
gridline | grid line | Numbered edge between/around tracks; an N-track axis has N+1 lines, used by col-start/col-end. | first defined: Chapter 020 L4
place-items | place-items-* | Shorthand for align-items and justify-items; positions each grid item within its cell. | first defined: Chapter 020 L4
place-content | place-content-* | Shorthand for align-content and justify-content; positions the whole track block within the container. | first defined: Chapter 020 L4
intrinsic sizing | intrinsic, content-driven | A dimension sized by the box's own content. | first defined: Chapter 020 L5
extrinsic sizing | extrinsic, forced | A dimension imposed from outside: a fixed length, a percentage, or a flex/grid track. | first defined: Chapter 020 L5
max-content | max-content width | Widest the content wants with no wrapping; for text, the whole thing on one line. | first defined: Chapter 020 L5
fit-content | w-fit | max-content capped at the space available; sizes to content when there's room, wraps when there isn't. | first defined: Chapter 020 L5
size-* | - | Tailwind utility setting width and height together, for square elements. | first defined: Chapter 020 L5
max-w-prose | - | Tailwind utility capping width at a readable measure (~65ch). | first defined: Chapter 020 L5
ch | ch unit | CSS length equal to the width of the font's "0" glyph; the natural unit for character-count widths. | first defined: Chapter 020 L5
viewport units | vh, vw | CSS lengths relative to the viewport's size. | first defined: Chapter 020 L5
dvh | dynamic viewport height | Viewport-height unit tracking the live viewport as mobile chrome slides in and out. | first defined: Chapter 020 L5
svh | small viewport height | Viewport-height unit measured with mobile chrome fully shown (smallest viewport). | first defined: Chapter 020 L5
lvh | large viewport height | Viewport-height unit measured with mobile chrome collapsed (largest viewport); what vh has always meant. | first defined: Chapter 020 L5
aspect-ratio | aspect-* | CSS property deriving one dimension from the other at a fixed ratio; reserves media height before load. | first defined: Chapter 020 L5
object-cover | object-fit: cover | Fills a box with media, cropping to cover it rather than stretching. | first defined: Chapter 020 L5
clamp() | clamp | CSS function clamp(min, preferred, max); a value tracks preferred but never crosses the bounds. | first defined: Chapter 020 L5
CLS | Cumulative Layout Shift | Core Web Vitals metric measuring how much visible content unexpectedly jumps as a page loads. | first defined: Chapter 020 L5
browser chrome | chrome | The browser's own UI around the page: address bar, tabs, toolbars. | first defined: Chapter 020 L5
siblings | sibling | Direct children of the same parent; what a flex/grid container lays out. | first defined: Chapter 020 L6
space-y / space-x | space-y-*, space-x-* | Legacy Tailwind spacing; margin on every child but the last. Superseded by gap. | first defined: Chapter 020 L6
divide | divide-y-*, divide-x-* | Tailwind utility drawing a border between direct children, all but the last. | first defined: Chapter 020 L6
multi-column | columns | Layout flowing content into side-by-side text columns via CSS columns. | first defined: Chapter 020 L6
lobotomized owl | * + * | The * + * selector targeting all siblings but the first; legacy margin-based spacing. | first defined: Chapter 020 L6
position (CSS) | position property | CSS property with five values (static/relative/absolute/fixed/sticky) controlling what an element is positioned against. | first defined: Chapter 020 L7
static (position) | - | Default position; element stays in normal flow and offsets do nothing. | first defined: Chapter 020 L7
relative (position) | - | Position keeping the element in flow but allowing offsets and making it an anchor for absolute children. | first defined: Chapter 020 L7
absolute (position) | - | Position removing the element from flow; offsets measure from the nearest positioned ancestor. | first defined: Chapter 020 L7
fixed (position) | - | Position removing the element from flow and anchoring it to the viewport; stays put on scroll. | first defined: Chapter 020 L7
sticky (position) | - | Hybrid position; acts relative until a scroll offset, then pins like fixed within the parent's bounds. | first defined: Chapter 020 L7
in flow / out of flow | in flow, out of flow | In flow reserves space and pushes siblings; out of flow reserves none, so siblings close up. | first defined: Chapter 020 L7
containing block | - | Rectangle an out-of-flow element's offsets measure from; for absolute, the nearest positioned ancestor's padding box. | first defined: Chapter 020 L7
initial containing block | - | Viewport-sized fallback containing block when no ancestor is positioned. | first defined: Chapter 020 L7
inset | inset-* | CSS shorthand grouping the four offset properties top/right/bottom/left; Tailwind's inset utility family. | first defined: Chapter 020 L7
top layer | - | Browser-managed layer painting above all page content and escaping every stacking context; where popovers and dialogs render. | first defined: Chapter 020 L7
CSS Anchor Positioning | anchor positioning | Native CSS for tethering one element's position to another, replacing JS positioning libraries. | first defined: Chapter 020 L7
Popover API | popover | Native browser API for popovers/dropdowns/menus with light-dismiss and focus handling. | first defined: Chapter 020 L7
scroll container | - | Box that clips overflow and lets the user scroll inside it; created by overflow hidden/auto/scroll plus an exceedable height. | first defined: Chapter 020 L8
overflow | overflow-* | CSS property deciding whether oversized content clips and whether the box becomes a scroll container. | first defined: Chapter 020 L8
scroll chaining | scroll chains | Leftover scroll at a container's edge continuing into the nearest ancestor scroll container, ultimately the page. | first defined: Chapter 020 L8
overscroll-behavior | overscroll-* | CSS property controlling what happens at a scroll container's edge; contain stops the chain, none also kills the bounce. | first defined: Chapter 020 L8
pull-to-refresh | - | Touch gesture reloading the page when pulled past the top; scroll chaining can fire it by accident. | first defined: Chapter 020 L8
scrollbar gutter | - | Reserved strip along a scroll container's edge that a scrollbar occupies. | first defined: Chapter 020 L8
scrollbar-gutter | scrollbar-gutter-* | CSS property reserving the scrollbar gutter; stable keeps it reserved so content never shifts. | first defined: Chapter 020 L8
page scroll | - | Scroll model where body is the primary scroll container and the whole page scrolls as one document. | first defined: Chapter 020 L8
app-shell scroll | - | Scroll model where an inner main scrolls while top bar and sidebar chrome stay fixed; you own scroll restoration. | first defined: Chapter 020 L8
min-h-0 | - | Tailwind utility overriding min-height: auto so a flex/grid child can shrink below its content height and scroll. | first defined: Chapter 020 L8
scroll snapping | scroll snap | CSS feature making a scroll container settle on defined points; the native mechanism behind carousels and galleries. | first defined: Chapter 020 L8
stacking context | - | Self-contained group of elements stacked among themselves, then placed as one unit in the parent; z-index only competes within one. | first defined: Chapter 020 L9
z-index | z-* | CSS property ordering positioned elements on the z-axis within their stacking context; higher paints later, on top. | first defined: Chapter 020 L9
paint order | - | Order the browser paints elements; later-painted cover earlier; z-index sets it within a stacking context. | first defined: Chapter 020 L9
compositing layer | compositing layers | GPU surface the browser composites separately; roughly maps to a stacking context, a debugging hint not a precise model. | first defined: Chapter 020 L9
isolate | isolation: isolate | Tailwind utility creating a stacking context with no visual effect; the clean way to deliberately scope layering. | first defined: Chapter 020 L9
portal | - | Rendering a component's DOM node elsewhere (typically under body) while keeping it logically inside its React parent; escapes a trapping stacking context. | first defined: Chapter 020 L9
font-family | - | CSS property picking the typeface; takes a comma-separated list, browser uses first available. | first defined: Chapter 021 L1
variable font | - | Single font file holding a continuous axis (e.g. every weight), instead of one file per weight. | first defined: Chapter 021 L1
FOUT | flash of unstyled text | Brief moment a fallback font shows before the web font loads and swaps in. | first defined: Chapter 021 L1
FOIT | flash of invisible text | Text hidden entirely until the font loads, then appears; worse than FOUT. | first defined: Chapter 034 L4
static font | - | One font file per weight/style, unlike a variable font's single file. | first defined: Chapter 034 L4
.woff2 | woff2 | Compressed, universally-supported web font format; the only one worth shipping. | first defined: Chapter 034 L4
font-display: swap | swap | next/font default; renders fallback immediately, swaps web font in when ready. | first defined: Chapter 021 L1
rem | rem unit | CSS unit equal to the root element's font-size (16px default); scales with the user's browser setting. | first defined: Chapter 021 L1
type scale | font-size scale | The text-xs..text-9xl set; each step a rem font-size paired with a tuned line-height. | first defined: Chapter 021 L1
line-height | leading | Vertical distance between lines of text; Tailwind leading-* utilities. | first defined: Chapter 021 L1
letter-spacing | tracking | Horizontal spacing between letters; Tailwind tracking-* utilities. | first defined: Chapter 021 L1
measure | line length | Length of a line of text in characters; comfortable body range ~60-75. | first defined: Chapter 021 L1
orphan | - | A single stranded word left alone on its own line at the end of a heading or paragraph. | first defined: Chapter 021 L1
eyebrow | eyebrow label | Small all-caps label set above a heading or section. | first defined: Chapter 021 L1
tabular-nums | tabular figures | font-variant-numeric forcing every digit the same width so columns of numbers align. | first defined: Chapter 021 L1
color-mix() | color-mix | CSS function blending two colors at runtime in a chosen interpolation space; derives related colors instead of storing them. | first defined: Chapter 021 L2
interpolation space | - | The color space the browser travels through when blending; changes the path and the midpoint color. | first defined: Chapter 021 L2
OKLAB | oklab | Cartesian form of OKLCH with no separate hue axis; ideal for straight-line mixes like fading to transparent. | first defined: Chapter 021 L2
gamut | - | The range of colors a display or color space can physically show. | first defined: Chapter 021 L2
P3 | Display-P3 | Wide-gamut color space modern screens support, larger than sRGB, with more vivid greens and reds. | first defined: Chapter 021 L2
contrast ratio | - | Luminance difference between two colors, from 1:1 (identical) to 21:1 (black on white). | first defined: Chapter 021 L2
Windows High Contrast Mode | forced colors | Mode overriding every page color with a user-chosen system palette; targeted via forced-colors. | first defined: Chapter 021 L2
elevation | elevation language, elevation scale, elevation ladder | How borders, radius, and shadows together signal how high a surface sits above the page; each tier maps to one shadow rung. | first defined: Chapter 021 L3
hairline | - | A 1px border, the thinnest visible separator line between surfaces. | first defined: Chapter 021 L3
pill | - | A fully-rounded rectangle with semicircular ends and a straight middle; rounded-full on a non-square box. Not a circle. | first defined: Chapter 021 L3
contact shadow | - | The tight, darker shadow right where an object meets the surface; the line of contact. | first defined: Chapter 021 L3
ambient shadow | - | The soft, diffuse shadow an object casts into the surrounding space from indirect light. | first defined: Chapter 021 L3
focus ring | - | The visible highlight on whatever element keyboard focus is on; drawn with outline or ring-*, never border. | first defined: Chapter 021 L3
halo | - | A focus ring drawn with a gap between element and ring, so it sits in clear space; shadcn's ring-* style. | first defined: Chapter 021 L3
filter (CSS) | filter | CSS filter functions (blur, brightness, drop-shadow, ...) applied to an element's rendered pixels; creates a stacking context. | first defined: Chapter 021 L3
glass-morphism | glassmorphism | The frosted-glass UI style: a translucent surface that blurs whatever shows through from behind, via backdrop-filter. | first defined: Chapter 021 L3
GPU-composited | - | The browser hands an effect to the GPU and recomputes it every frame the surface paints; cheap for one element, costly across many. | first defined: Chapter 021 L3
pseudo-class | - | One-colon selector for a state the browser tracks on a real element (:hover, :checked, :disabled). | first defined: Chapter 021 L4
pseudo-element | - | Two-colon selector targeting a sub-part the markup never created as a tag (::placeholder, ::selection). | first defined: Chapter 021 L4
:active | active | Pseudo-class matching while an element is pressed (mouse/finger down); releases on let-go. | first defined: Chapter 021 L4
:focus-visible | focus-visible | Pseudo-class matching focus the browser decides warrants a ring; keyboard/programmatic, not plain click. | first defined: Chapter 021 L4
:focus-within | focus-within | Pseudo-class matching an ancestor when it or any descendant has focus. | first defined: Chapter 021 L4
:not() | not, not-* | Pseudo-class matching every element that does not match its inner selector. | first defined: Chapter 021 L4
focus heuristic | heuristic | Browser's built-in rule deciding when a focus indicator shows; styled via :focus-visible. | first defined: Chapter 021 L4
::placeholder | placeholder pseudo-element | Pseudo-element targeting an empty input's faint hint text; does not inherit color. | first defined: Chapter 021 L4
::selection | selection pseudo-element | Pseudo-element targeting the highlight painted over user-selected text. | first defined: Chapter 021 L4
shadow DOM | - | Encapsulated DOM subtree a browser keeps hidden from outside CSS and selectors; :has() can't reach in. | first defined: Chapter 021 L4
structural pseudo-class | - | Pseudo-class matching by sibling position (:first-child, :nth-child, :empty); mostly retired by gap/divide. | first defined: Chapter 021 L4
:visited | visited | Link pseudo-class for visited links; privacy-locked to a few styleable properties. | first defined: Chapter 021 L4
CSS transition | transition | Interpolates a property from its old value to a new one when that value changes; needs an external trigger. | first defined: Chapter 021 L5
tween | in-betweening | The in-between frames a transition or animation generates between two values. | first defined: Chapter 021 L5
easing | timing function, ease-* | Timing function mapping elapsed time to animation progress; controls start-fast vs end-fast vs even. | first defined: Chapter 021 L5
keyframes | @keyframes | A named timeline of property values from 0% to 100% that an animation plays through. | first defined: Chapter 021 L5
tw-animate-css | - | CSS-first Tailwind v4 utility pack of enter/exit animations; maintained successor to tailwindcss-animate. | first defined: Chapter 021 L5
Radix | Radix UI | Headless component library providing behavior and accessibility without styling; shadcn wraps it with Tailwind. | first defined: Chapter 021 L5
View Transitions API | - | Browser API snapshotting the page before/after a DOM change and animating the difference, including across navigations. | first defined: Chapter 021 L5
mobile-first | mobile-first reflex | Author base styles for the narrowest viewport, then layer wider-screen rules with min-width breakpoints; each adds, never overrides. | first defined: Chapter 021 L6
min-width (media feature) | min-width query | Media query applying its rules only from the given viewport width up; the mechanism behind every breakpoint prefix. | first defined: Chapter 021 L6
max-width (media feature) | max-width query, max-md: | Media query applying below a width; the desktop-first tool, walks the base back. | first defined: Chapter 021 L6
hover: hover | hover media feature | Media query asking whether the device can hover (mouse yes, touch no); Tailwind v4 wraps hover: in it. | first defined: Chapter 021 L6
sticky hover | sticky-hover bug | Pre-v4 bug where a touch tap fired :hover and left the style stuck until tapping elsewhere. | first defined: Chapter 021 L6
pointer (media feature) | pointer: fine, pointer: coarse | Media query reporting whether the pointing device is precise (mouse) or blunt (fingertip). | first defined: Chapter 021 L6
meta viewport | viewport meta tag | <meta name="viewport" content="width=device-width..."> making a phone report its real width; without it mobile-first base never shows. | first defined: Chapter 021 L6
layout switch | structure switch | Responsive tier one: changing the structural primitive at a breakpoint (flex-col md:flex-row). | first defined: Chapter 021 L6
value scaling | - | Responsive tier two: keeping structure but tuning its numbers up at a breakpoint (p-4 md:p-8). | first defined: Chapter 021 L6
container-type | - | CSS property opting a box into being a query container; inline-size measures width, size both axes, normal off. | first defined: Chapter 021 L7
inline-size | inline axis | The element's width axis in writing-mode terms; for LTR Latin text it is the horizontal one. | first defined: Chapter 021 L7
containment | - | Browser isolating a subtree's layout so it can be measured and queried independently. | first defined: Chapter 021 L7
container query unit | cqi, cqb, cqw, cqh, cqmin, cqmax | Length unit relative to the queried container's size; 1cqi is 1% of its inline (width) size. | first defined: Chapter 021 L7
cqi | - | Container query inline-size unit; 1cqi is 1% of the nearest queried container's width. | first defined: Chapter 021 L7
typed props contract | props contract | A component's props typed as a small named surface stating exactly what it accepts. | first defined: Chapter 022 L1
variant union | - | One prop whose value is a finite union, collapsing mutually-exclusive boolean flags into one axis. | first defined: Chapter 022 L1
JSX.Element | - | The type a component returns: a single rendered React element; inference supplies it. | first defined: Chapter 022 L1
ComponentProps | - | React utility type: ComponentProps<'button'> is every prop the JSX element accepts; ComponentProps<typeof X> every prop component X accepts. | first defined: Chapter 022 L1
rest destructuring | ...rest spread | Gathers every prop you didn't name into one object you then spread onto another element. | first defined: Chapter 022 L1
ComponentType | - | The type of a component itself (one accepting props P), for when a component is a value you store or pass. | first defined: Chapter 022 L1
forwardRef | - | Legacy way to let a component accept a ref; React 19 makes ref a regular prop. | first defined: Chapter 022 L1
PropTypes | - | Legacy runtime prop validation, replaced by TypeScript's compile-time checks. | first defined: Chapter 022 L1
higher-order component | HOC | Legacy withSomething(Component) wrapping pattern retired by hooks and composition. | first defined: Chapter 022 L1
make illegal states unrepresentable | illegal states unrepresentable | Shape types so invalid combinations can't be expressed, not just guarded at runtime. | first defined: Chapter 005 L1
children | children prop | The prop holding whatever JSX sits between a component's tags; React fills it in. | first defined: Chapter 022 L2
ReactNode | - | The broad renderable type: JSX, strings, numbers, arrays, fragments, portals, null/undefined/booleans. | first defined: Chapter 022 L2
ReactElement | - | The narrow renderable type: a single JSX element only; rejects strings, numbers, fragments. | first defined: Chapter 022 L2
compound component | compound family | A tightly coupled family of thin subcomponents exported together, composed via JSX. | first defined: Chapter 022 L2
prop-as-slot | - | A single named content region passed as a ReactNode prop instead of a subcomponent. | first defined: Chapter 022 L2
render prop | - | A prop (often children) that is a function the component calls with data it owns, letting the consumer render. | first defined: Chapter 022 L2
prop drilling | - | Threading a prop through middle components that don't use it, just to reach a deep consumer. | first defined: Chapter 022 L2

class-variance-authority | cva | Tiny library declaring a component's variant-to-class mapping as data, then resolving a combination. | first defined: Chapter 022 L3
VariantProps | - | cva type helper reading a cva call to derive its variants' optional prop types. | first defined: Chapter 022 L3
Slot | - | Radix component taking one child and merging its props onto that child, rendering no wrapper. | first defined: Chapter 022 L3
asChild | - | Boolean prop that swaps the component's element for the caller's single child, merging classes/behavior onto it. | first defined: Chapter 022 L3
polymorphism | polymorphic | A component's ability to render as more than one underlying element. | first defined: Chapter 022 L3

ref | - | A handle pointing at a DOM node (or value), exposed on a ref object's .current; lets a parent reach the rendered element. | first defined: Chapter 022 L4
Ref | Ref<T> | The type an element's ref prop accepts: the union RefObject | RefCallback | null. | first defined: Chapter 022 L4
RefObject | RefObject<T> | What useRef returns; its .current holds the value, writable in React 19. | first defined: Chapter 022 L4
RefCallback | RefCallback<T>, callback ref | A ref in function form; React calls it with the node on mount, may return a cleanup. | first defined: Chapter 022 L4
codemod | - | An automated source-transform script that rewrites code mechanically. | first defined: Chapter 022 L4
IntersectionObserver | - | Browser API running a callback when an element enters or leaves the viewport. | first defined: Chapter 022 L4
mergeRefs | merge-refs | Helper fanning one DOM node out to several refs. | first defined: Chapter 022 L4
useImperativeHandle | - | React hook exposing a custom object of methods on a ref instead of the DOM node. | first defined: Chapter 022 L4
createPortal | - | react-dom function rendering children's DOM under a named node while keeping the React tree intact. | first defined: Chapter 022 L5
WAI-ARIA APG | APG, Authoring Practices Guide | W3C reference patterns for accessible widgets; its Dialog (Modal) pattern is the overlay checklist. | first defined: Chapter 022 L5
focus trap | - | Confining Tab/Shift+Tab within an open dialog so focus can't reach the page behind it. | first defined: Chapter 022 L5
::backdrop | backdrop pseudo-element | Pseudo-element styling the scrim behind a top-layer dialog/popover with plain CSS. | first defined: Chapter 022 L5
native dialog | <dialog>, showModal | HTML dialog element; showModal() renders it in the top layer with Esc and focus trap for free. | first defined: Chapter 022 L5
Sonner | sonner | shadcn's default toast: one <Toaster /> in the layout, toast() from anywhere. | first defined: Chapter 022 L5
scroll lock | body scroll lock | Stopping the page behind a modal from scrolling; overflow hidden on body, plus position fixed on iOS. | first defined: Chapter 022 L5
render | re-render | React calling a component function to get its JSX tree; pure computation, no DOM touched. | first defined: Chapter 023 L1
commit | commit phase | The phase where React applies the diffed changes to the real DOM. | first defined: Chapter 023 L1
mount | - | A component's first render; React builds DOM from nothing, no previous tree to diff. | first defined: Chapter 023 L1
update | - | Any render after the mount; always has a previous tree to diff against. | first defined: Chapter 023 L1
UI = f(state) | - | The model that a component's output is a pure function of its props, state, and context. | first defined: Chapter 023 L1
React Compiler | - | Build-time tool auto-inserting memoization, replacing hand-written useMemo/useCallback. | first defined: Chapter 023 L1
useContext | - | React hook reading a value shared from an ancestor provider; subscribes to its changes. | first defined: Chapter 023 L1
useMemo | - | Hook caching a computed value across renders while its dependency array is unchanged. | first defined: Chapter 023 L1
useCallback | - | Hook caching a function's identity across renders while its dependency array is unchanged. | first defined: Chapter 023 L1
uncontrolled input | uncontrolled component | An input whose value lives in the DOM, not React state; React doesn't overwrite it on re-render. | first defined: Chapter 023 L2
remount | - | React tearing down a component instance and mounting a fresh one (state/refs reset) when type, key, or position changes at a slot. | first defined: Chapter 023 L2
pure function | - | A function whose output depends only on its inputs, with no observable effect outside itself. | first defined: Chapter 023 L3
purity contract | purity | React's rule that render must not mutate props/state or perform side effects. | first defined: Chapter 023 L3
side effect (render) | - | A render-time change to or dependence on outside state: writing a global/DOM/storage, a network call, reading the clock or random. | first defined: Chapter 023 L3
Strict Mode | StrictMode | Dev-only wrapper that double-invokes render to surface impurity before production. | first defined: Chapter 023 L3
concurrent rendering | - | React interrupting, abandoning, and resuming renders so a higher-priority update can jump ahead. | first defined: Chapter 023 L3
useState | - | React hook returning a [value, setter] pair for a piece of local state. | first defined: Chapter 023 L4
snapshot | state snapshot | A render's frozen state: each piece is baked in as a constant for that whole render. | first defined: Chapter 023 L4
update queue | - | The per-state queue React fills with setter entries during a handler, resolving once after it finishes. | first defined: Chapter 023 L4
batching | - | Grouping setters fired in one event into a single re-render. | first defined: Chapter 023 L4
updater form | updater function | Passing setState a function of the pending value (c => c + 1) instead of a value; reads the queue, not the snapshot. | first defined: Chapter 023 L4
stale closure | - | A callback running after render that reads a frozen snapshot value instead of the current one. | first defined: Chapter 023 L4
flushSync | - | react-dom function forcing a synchronous render and DOM commit before the next line runs. | first defined: Chapter 023 L4
Immer | - | Library letting you write mutation-style code that produces an immutable state update underneath. | first defined: Chapter 023 L4
useReducer | - | Hook holding state plus named transitions in one reducer; for state with several coordinated fields. | first defined: Chapter 023 L4
derived state | - | A value computed from existing state during render instead of stored in its own state. | first defined: Chapter 023 L4
master-detail | master-detail screen | A UI with a list of records (master) beside a panel showing the selected record's details (detail). | first defined: Chapter 023 L5
controlled component | controlled input | A form/input whose values live in React state and flow down as props, with edits reported up via callbacks. | first defined: Chapter 023 L5
pointer capture | setPointerCapture | Routes all further pointer events to one element until release, even outside its bounds; how drag handlers stay live. | first defined: Chapter 023 L6
initializer function | lazy initializer | The () => … form passed to useState; React calls it once on mount to produce the initial state. | first defined: Chapter 024 L1
useRef | - | Returns a mutable .current box that persists across renders without triggering one; for values the JSX doesn't read. | first defined: Chapter 024 L1
useEffect | effect | Hook running a callback after React commits a render, re-running when a dependency changes. | first defined: Chapter 024 L2
server state | server-state | Data whose canonical home is the server or database; the component only holds a cached copy. | first defined: Chapter 024 L2
source of truth | - | The single authoritative location a value is read from and written to; every other place shows a copy. | first defined: Chapter 024 L3
colocation | colocate | Placing state at the narrowest component above everyone who reads it, not high in the tree by default. | first defined: Chapter 024 L3
lifting state up | lift state | Moving state to the closest common ancestor of the components that need it, flowed back down as props. | first defined: Chapter 024 L3
nuqs | - | Typed search-params library for React; treats URL query params like useState (parsers, defaults, batched updates). | first defined: Chapter 024 L3
transition (state) | - | A move from one state value to the next. | first defined: Chapter 024 L4
dispatch (function) | - | The function that sends an action to the reducer; referentially stable. | first defined: Chapter 024 L4
payload | - | The data an action carries beyond its type. | first defined: Chapter 024 L4
bailout | - | Returning the same state reference so React skips the re-render. | first defined: Chapter 024 L4
grouped useState | - | One useState holding several related values updated together with spreads. | first defined: Chapter 024 L4
debounce | debouncing | Wait until input stops changing before acting, instead of firing each keystroke. | first defined: Chapter 024 L5
imperative | - | Telling an element to do something (focus, play, scroll) rather than describing what it should be. | first defined: Chapter 024 L5
instance ref | instance-value ref | A useRef used as plain cross-render memory the JSX never reads, no DOM. | first defined: Chapter 024 L5
element ref | DOM ref | A useRef attached via the ref prop, holding the live DOM node after commit. | first defined: Chapter 024 L5
useId | - | React hook returning a unique, stable id string, identical on server and client; no arguments. | first defined: Chapter 024 L6
htmlFor | - | JSX spelling of the HTML for attribute; names the id of the input a label describes. | first defined: Chapter 024 L6
aria-describedby | - | ARIA attribute naming the id of an element that describes this one; read after the field's name. | first defined: Chapter 024 L6
aria-invalid | - | ARIA attribute announcing a field as invalid to assistive tech. | first defined: Chapter 024 L6
cleanup | cleanup function | The function an effect returns; React runs it before the next setup and on unmount to tear down what setup created. | first defined: Chapter 025 L1
Activity API | <Activity> | React 19 feature that hides a subtree and later restores it, cleaning up its effects when hidden and re-running them when shown. | first defined: Chapter 025 L1
synchronization | synchronize, synchronized | Making an external system's state match React's current props and state. | first defined: Chapter 025 L2
escape hatch | - | A deliberate exit from React's normal data flow, used sparingly and on purpose. | first defined: Chapter 025 L2
reactive value | - | A prop, state, or anything derived from them; can change between renders. | first defined: Chapter 025 L2
dependency array | deps | useEffect's second argument; the reactive values that, when changed, re-run setup. | first defined: Chapter 025 L2
non-reactive read | - | Reading a value's latest value at event time without listing it as a re-sync trigger. | first defined: Chapter 025 L2
race condition | - | Async responses resolving out of order, so a stale one overwrites fresh data. | first defined: Chapter 025 L2
tearing | - | Different parts of a single render observing different values of the same external source. | first defined: Chapter 025 L2
useEffectEvent | - | Hook making a callback that reads the freshest props/state but is excluded from effect dependency arrays. | first defined: Chapter 025 L3
Effect Event | - | A non-reactive callback from useEffectEvent; reads latest values when called, never a dependency. | first defined: Chapter 025 L3
non-reactive seam | seam | Reading a value fresh inside an effect without re-syncing on it; what useEffectEvent provides. | first defined: Chapter 025 L3
route loader | loader | Server Component or framework data function fetching a page's data before render, on the server. | first defined: Chapter 025 L4
component identity | - | React identifies an instance by tree position plus key; change the key and state resets. | first defined: Chapter 025 L4
server-side rendering | SSR | Server produces the page's initial HTML before sending it; effects run only in the browser. | first defined: Chapter 025 L4
TanStack Query | react query | Client-side server-state cache: fetching, caching, polling, invalidation, optimistic updates. | first defined: Chapter 025 L4
use() | use hook | React hook reading a promise (or context) during render, suspending until it resolves. | first defined: Chapter 025 L4
context | React context | Mechanism broadcasting one value to every descendant of a provider without prop-drilling; propagation, not a store. | first defined: Chapter 025 L5
consumer | context consumer | Any component reading a context with useContext; subscribes to every change of the whole value. | first defined: Chapter 025 L5
fail-fast consumer hook | - | Custom hook wrapping useContext that throws if no provider is above, returning a non-nullable value. | first defined: Chapter 025 L5
feature flag | feature-flag map | Runtime toggle gating which features or buttons exist; a cross-cutting value read app-wide. | first defined: Chapter 025 L5
Zustand | - | External store; each component subscribes to just the slice it reads, for high-churn app state. | first defined: Chapter 025 L5
transition | - | A state update marked non-urgent; React renders it in the background and interrupts it for anything urgent. | first defined: Chapter 025 L6
useTransition | - | Hook returning [isPending, startTransition]; wrap a setter's call to mark that update non-urgent. | first defined: Chapter 025 L6
startTransition | - | Standalone/returned function; updates run synchronously inside its callback are marked as a transition. | first defined: Chapter 025 L6
useDeferredValue | - | Hook returning a lagging copy of a value, so consumers of it render at low priority. | first defined: Chapter 025 L6
isPending | - | Boolean from useTransition, true from a transition's start until its background render (and any awaited work) settles. | first defined: Chapter 025 L6
Suspense boundary | - | A wrapper showing a fallback while the UI inside it is still loading. | first defined: Chapter 025 L6
suspend | suspends | A component pausing its render until an awaited resource is ready, yielding to the nearest Suspense boundary. | first defined: Chapter 025 L7
error boundary | - | Component catching errors thrown by its descendants and rendering a fallback instead of crashing the tree. | first defined: Chapter 025 L7
RSC wire | - | Serialization channel carrying values and promises from Server to Client Components. | first defined: Chapter 025 L7
referentially stable | stable reference | Same object reference across renders, compared by Object.is. | first defined: Chapter 025 L7
cache() | React cache | Server-only React API deduplicating same-args calls to a function within one request. | first defined: Chapter 025 L7
hook | - | Function letting a component tap into React features (state, effects) and remember them across renders. | first defined: Chapter 025 L8
positional slot | slot, slot model, slot pointer | React matches each hook call to its stored value by call order, not name; a per-render pointer advances one slot per call. | first defined: Chapter 025 L8
rules of hooks | - | Call hooks at the top level every render, and only from components or other hooks; both keep the slot count stable. | first defined: Chapter 025 L8
early return | - | Returning JSX before the function ends, short-circuiting the rest of the body including hook calls below it. | first defined: Chapter 025 L8
referential identity | - | Which exact object a value is in memory, the notion Object.is compares. | first defined: Chapter 025 L8
ESLint | eslint | Linter flagging problematic code patterns statically, before the code runs. | first defined: Chapter 025 L8
eslint-plugin-react-hooks | - | ESLint plugin in the Next.js default config; provides rules-of-hooks and exhaustive-deps. | first defined: Chapter 025 L8
rules-of-hooks (lint rule) | react-hooks/rules-of-hooks | Lint rule enforcing top-level-only calls and use*-named callers; never disabled. | first defined: Chapter 025 L8
exhaustive-deps | react-hooks/exhaustive-deps | Lint rule flagging reactive values read inside an effect/memo/callback but missing from its dependency array. | first defined: Chapter 025 L8
CI | continuous integration | Automated checks that run on every push, before code can merge. | first defined: Chapter 025 L8
custom hook | - | use*-named function that calls one or more hooks; packages built-in hooks into a reusable named behavior, sharing code not state. | first defined: Chapter 026 L1
useSearchParams | - | Next.js hook reading the current URL query params (e.g. the page number). | first defined: Chapter 026 L1
auto-memoization | - | Memoization the compiler inserts automatically, versus hand-written useMemo/useCallback/memo. | first defined: Chapter 026 L2
Profiler | React Profiler | React DevTools panel recording which components rendered and why. | first defined: Chapter 026 L2
Rules of React | - | React's purity and hook-ordering contract: pure render, no mutation, hooks at top level in stable order. | first defined: Chapter 026 L2
SWC | - | Rust-based compiler Next.js uses to turn TypeScript/JSX into JavaScript; faster than Babel. | first defined: Chapter 026 L2
Babel | - | JavaScript compiler whose transforms run as plugins; the React Compiler ships as one. | first defined: Chapter 026 L2
annotation mode | compilationMode annotation | Compiler mode that only compiles functions opting in with 'use memo'; for gradual migration. | first defined: Chapter 026 L2
'use memo' | use memo directive | Directive opting a function into the compiler under annotation mode. | first defined: Chapter 026 L2
'use no memo' | use no memo directive | Directive telling the compiler to skip a function; temporary opt-out, fixes nothing. | first defined: Chapter 026 L2
React.memo | memo | Wraps a component so React skips its re-render while incoming props stay shallowly equal. | first defined: Chapter 026 L3
shallowly equal | shallow prop comparison | Props compared one level deep by reference: same value for primitives, same identity for objects. | first defined: Chapter 026 L3
headless primitive | headless component | Interactive component shipping behavior, keyboard handling, and ARIA but no styling; you bring the markup. | first defined: Chapter 027 L1
shadcn CLI | - | Command-line tool that fetches component source from a registry and writes it into your project; no runtime package. | first defined: Chapter 027 L1
shadcn registry | registry | Server the shadcn CLI reads component source from; shadcn's own, a third-party, or a team-private one. | first defined: Chapter 027 L1
shadcn block | block | A whole pre-composed UI section (dashboard, login) copied in as a scaffold and trimmed, vs a single component. | first defined: Chapter 027 L1
Base UI | @base-ui-components/react | Leaner headless-first primitive engine from the MUI team; the alternative to Radix at shadcn init. | first defined: Chapter 027 L1
lucide-react | lucide | shadcn's default icon set; tree-shakeable, one component per icon. | first defined: Chapter 027 L1
roving-tabindex | roving tabindex | Keyboard pattern where a group holds one tab stop and arrow keys move focus between items. | first defined: Chapter 027 L1
type-ahead | typeahead | Typing letters while a widget is focused jumps to the matching option. | first defined: Chapter 027 L1
AA conformance | WCAG AA, AA level | The middle WCAG level most laws and contracts require; the course's accessibility floor. | first defined: Chapter 027 L2
tab order | DOM order | Order Tab visits controls: their document order, not their CSS-painted position. | first defined: Chapter 027 L2
tabindex | - | Attribute setting an element's tab behavior; 0 focusable in order, -1 script-only, positives an anti-pattern. | first defined: Chapter 027 L2
target size | hit area, success criterion 2.5.8 | Tappable area of a control; WCAG AA floor 24x24 CSS px, 44x44 comfortable under a thumb. | first defined: Chapter 027 L2
prefers-reduced-motion | reduced motion, motion-reduce | OS preference for less on-screen motion; replace communicative motion, don't delete it. | first defined: Chapter 027 L2
vestibular disorder | - | Inner-ear/balance condition where screen motion can trigger nausea or dizziness. | first defined: Chapter 027 L2
Lighthouse | - | Accessibility audit built into Chrome DevTools; daily smoke test, catches only a minority of issues. | first defined: Chapter 027 L2
axe DevTools | axe, axe-core | Browser extension and engine giving deeper automated accessibility rule coverage than Lighthouse. | first defined: Chapter 027 L2
implicit role | - | The role an element already has from its tag before any role attribute (button is a button, nav a navigation landmark). | first defined: Chapter 027 L3
aria-label | - | ARIA attribute supplying an accessible name when a control has no visible text (icon-only button). | first defined: Chapter 027 L3
aria-labelledby | - | ARIA attribute naming a control by referencing the id of another element whose text becomes its name. | first defined: Chapter 027 L3
aria-live | - | ARIA attribute marking a region as live and setting when AT announces changes: polite (when idle) or assertive (interrupts). | first defined: Chapter 027 L3
aria-atomic | - | ARIA attribute setting how much of a live region to announce: true reads the whole region, false only the changed node. | first defined: Chapter 027 L3
role=status | - | Live-region role implying aria-live=polite and aria-atomic=true; for informational messages that can wait. | first defined: Chapter 027 L3
role=alert | - | Live-region role implying aria-live=assertive and atomic; interrupts AT, reserved for must-not-miss failures. | first defined: Chapter 027 L3
role=presentation | role=none | Role stripping an element's implicit semantics so AT treats it as a plain container (legacy layout table). | first defined: Chapter 027 L3
document.activeElement | activeElement | The one element that currently holds keyboard focus; reading it tells you where the focus cursor is. | first defined: Chapter 027 L4
inert | - | HTML attribute making a subtree non-focusable and hidden from AT; Radix applies it to the page behind an open dialog. | first defined: Chapter 027 L4
preventScroll | focus preventScroll | Option on element.focus() that moves focus without scrolling the element into view; default for page-level focus moves. | first defined: Chapter 027 L4
skip link | - | First focusable link in a layout, visually hidden until focused, that jumps the cursor past the nav into main. | first defined: Chapter 027 L4
aria-disabled | - | Marks a control disabled while keeping it focusable and discoverable; doesn't block activation, so guard the handler yourself. | first defined: Chapter 027 L4
autoFocus | - | React prop focusing an element on mount; right for single-purpose screens, wrong on multi-section forms and dialogs. Fires per mount. | first defined: Chapter 027 L4
skeleton | - | Placeholder mirroring the shape of loading content; shadcn's Skeleton primitive, sized to the real layout. | first defined: Chapter 027 L5
spinner | - | Indeterminate loading indicator for short work of unknown shape; says "something is happening". | first defined: Chapter 027 L5
CTA | call to action | Primary button or link moving the user toward resolving a state, e.g. "Create your first invoice". | first defined: Chapter 027 L5
correlation id | reference id | Unique id on a failed operation the user quotes to support so an engineer can trace it in logs. | first defined: Chapter 027 L5
stale data | stale-while-refetch | Previously-loaded data kept on screen during a background refetch instead of dropping to a skeleton. | first defined: Chapter 027 L5
Sheet | shadcn Sheet | shadcn's side-anchored dialog primitive; a panel sliding in from a screen edge, wrapping Radix's Dialog for focus trap and Esc-to-close. | first defined: Chapter 028 L1
dependency graph | - | Full set of packages an app pulls in: the named ones plus everything they depend on. | first defined: Chapter 028 L2
transitive dependency | - | A package you never named, pulled in because something you named depends on it. | first defined: Chapter 028 L2
phantom dependency | - | A package imported without declaring it, working only because a hoisted layout exposed it. | first defined: Chapter 028 L2
peer dependency | - | A package a library expects the host project to provide rather than bundle. | first defined: Chapter 028 L2
lockfile | pnpm-lock.yaml | Generated file pinning every resolved dependency to an exact version with an integrity hash. | first defined: Chapter 028 L2
integrity hash | sha512 integrity | sha512 fingerprint of a package artifact; a tampered download fails to match. | first defined: Chapter 028 L2
caret range | ^ range | `^2.1.1` accepting any later 2.x release; compatible-version range. | first defined: Chapter 028 L2
manifest | package.json manifest | package.json: names the project, declares dependencies, defines scripts. | first defined: Chapter 028 L2
content-addressed store | pnpm store | pnpm's global package store; node_modules symlinks into it, so each version lives on disk once. | first defined: Chapter 028 L2
build script | lifecycle script | Dependency script running on your machine during install; pnpm blocks it unless allowlisted. | first defined: Chapter 028 L2
engine-strict | - | .npmrc setting turning the engines field into a hard install error, not a warning. | first defined: Chapter 028 L2
frozen-lockfile | --frozen-lockfile | Install flag failing when lockfile and package.json disagree; used in CI. | first defined: Chapter 028 L2
AGENTS.md | - | Open-spec Markdown file at repo root; operational onboarding the next contributor or coding agent reads first. | first defined: Chapter 028 L3
ADR | Architectural Decision Record | Standalone doc capturing one architectural decision with its context and trade-offs; AGENTS.md points at it, never inlines it. | first defined: Chapter 028 L3
CLAUDE.md | - | Claude Code's tool-specific instructions file; should re-export AGENTS.md (@../AGENTS.md) rather than fork it. | first defined: Chapter 028 L3
isolatedModules | - | TS flag requiring each file to transpile alone, banning const enum and untyped barrel re-exports; Turbopack needs it. | first defined: Chapter 028 L4
transpile | transpilation | Convert source to an equivalent form in another language or syntax level (TS to JS). | first defined: Chapter 028 L4
CommonJS | CJS | Node's original module format using require()/module.exports, vs ES import/export. | first defined: Chapter 028 L4
Biome domain | linter domain | Rule set for one ecosystem (next, react, test) that auto-enables when its dependency is in package.json. | first defined: Chapter 028 L5
safe fix | - | Biome auto-fix that cannot change program behavior (sort imports, snap quotes); applied by --write and on save. | first defined: Chapter 028 L5
unsafe fix | --unsafe | Opt-in Biome fix that can change behavior (== to ===); never runs automatically. | first defined: Chapter 028 L5
JSON Schema | $schema | JSON document describing another JSON file's allowed shape, so editors autocomplete and validate it. | first defined: Chapter 028 L5
code action | - | Editor-triggered automated edit (on save or quick-fix) that rewrites code, e.g. reorder imports or apply a lint fix. | first defined: Chapter 028 L5
wordmark | - | A brand name set as styled text, used as the logo instead of a graphic mark. | first defined: Chapter 028 L6
hero | hero band | The headline band at the top of a marketing page: big claim, CTAs, product image. | first defined: Chapter 028 L7
dark: variant | dark variant | Tailwind class-strategy variant applying a utility when .dark is on the ancestor; the no-flash theme hook. | first defined: Chapter 028 L7
picture element | <picture> | HTML element wrapping one <img> plus <source> candidates; browser picks a source by media conditions. | first defined: Chapter 028 L7
heading outline | heading hierarchy | Tree of a page's heading levels in order; assistive tech navigates by it, so levels descend by one and never skip. | first defined: Chapter 028 L8
contentinfo | - | Landmark role a body-level footer maps to; page-wide info like copyright, one per page. | first defined: Chapter 028 L10
hamburger | hamburger button | Three-stacked-lines icon button opening a hidden nav menu on narrow screens. | first defined: Chapter 028 L12
drawer | mobile drawer, slide-in panel | Off-screen panel sliding in from a screen edge to hold nav on narrow screens; here a shadcn Sheet. | first defined: Chapter 028 L12
route segment | segment | One slash-separated piece of a URL path; one folder under app/. | first defined: Chapter 029 L1
import alias | @/ alias | tsconfig path mapping turning @/x into an absolute import from the source root. | first defined: Chapter 029 L1
co-location | co-locate by feature | App Router practice of placing a feature's code beside its page, not in by-kind buckets. | first defined: Chapter 029 L1
layout.tsx | layout, nested layout | App Router shared shell wrapping every page at or below its folder; persists across navigations, nests inside the layout above. | first defined: Chapter 029 L2
route group | (folder), parentheses folder | Folder named in parentheses; organizes routes and adds no URL segment. | first defined: Chapter 029 L2
template.tsx | template | Like layout.tsx but remounts on every navigation into its segment; state resets, effects re-fire. | first defined: Chapter 029 L2
dynamic segment | [id], bracketed folder | Folder named in [brackets] matching any value in that URL position, captured into params. | first defined: Chapter 029 L3
route parameter | route param, params | Value captured from a dynamic segment, handed to the page as params (a Promise in Next 16). | first defined: Chapter 029 L3
catch-all segment | [...slug] | Folder named [...x] matching that segment and every one after it; params value is string[]; bare parent 404s. | first defined: Chapter 029 L3
optional catch-all segment | [[...slug]] | Double-bracketed catch-all that also matches the bare parent; params value is string[] | undefined. | first defined: Chapter 029 L3
PageProps | PageProps helper | Global type Next.js generates from routes; PageProps<'/route'> types a page's params/searchParams, no import. | first defined: Chapter 029 L3
notFound() | notFound | next/navigation function that throws a signal rendering the nearest not-found.tsx as an HTTP 404. | first defined: Chapter 029 L3
hard navigation | full page load | Full document reload from the URL; browser tears down and rebuilds the page. | first defined: Chapter 029 L4
useRouter | next/navigation useRouter | Client-Component hook returning a router for imperative navigation (push, replace, back, refresh). | first defined: Chapter 029 L4
router.push | - | Imperative soft navigation to an href, adding a history entry. | first defined: Chapter 029 L4
prefetch | prefetching | Framework fetching a Link's destination in the background before the click. | first defined: Chapter 029 L4
redirect | redirect() | next/navigation function that throws a 307 (303 in a Server Action) to reroute during render. | first defined: Chapter 029 L4
permanentRedirect | permanentRedirect() | next/navigation function that throws a 308 for a permanent URL migration. | first defined: Chapter 029 L4
307 | Temporary Redirect | HTTP status: temporary move, repeat the request with the same method at the new URL. | first defined: Chapter 029 L4
303 | See Other | HTTP status: follow the redirect with a GET, even after a POST. | first defined: Chapter 029 L4
308 | Permanent Redirect | HTTP status: permanent move, update caches/search engines, keep the method. | first defined: Chapter 029 L4
404 | Not Found | HTTP status: the requested resource does not exist at this URL. | first defined: Chapter 029 L4
parallel routes | parallel route | App Router feature rendering two or more route trees at one URL, built from @-prefixed slot folders. | first defined: Chapter 029 L5
slot (parallel route) | @slot, named slot | Named layout region filled by a matching @-folder route tree; folder name minus @ becomes the layout prop, beside children. | first defined: Chapter 029 L5
default.tsx | default.js | A slot's fallback file rendered when a hard navigation matches none of its routes; without it the whole route 404s. | first defined: Chapter 029 L5
private folder | _folder, underscore folder | Folder named with a leading underscore; colocated non-routable code the router never sees. | first defined: Chapter 029 L5
intercepting route | (.)/(..)/(...) prefix, intercepter | Route folder prefixed to intercept a soft navigation to another URL and render in its place; paired with a non-intercepting sibling for hard nav. | first defined: Chapter 029 L6
deep link | - | A URL that reproduces a specific in-app view; paste it cold and you land exactly there. | first defined: Chapter 029 L6
@next/bundle-analyzer | bundle analyzer | Next.js dev tool rendering the client bundle as a treemap so you can see which files and deps add bytes; run with ANALYZE=true next build. | first defined: Chapter 030 L2
RPC | remote procedure call | Calling a function that runs on another machine as if local; Server Actions are React's RPC. | first defined: Chapter 030 L3
transitive import | indirect import | A module pulled in through an import chain, not imported directly. | first defined: Chapter 030 L3
RSC payload | RSC wire payload | Serialized React tree the server streams beside the HTML so the browser rebuilds the component tree. | first defined: Chapter 030 L4
structured clone | structuredClone | Deep-copy algorithm carrying data but dropping functions and DOM nodes; baseline for what crosses the RSC wire. | first defined: Chapter 001 L1
non-deterministic | - | A value differing between two evaluations of the same code; depends on the clock, randomness, locale/timezone, or a browser-only API. | first defined: Chapter 030 L5
suspend signal | - | The signal a component emits when not yet ready to render; Suspense treats it as wait, not error. | first defined: Chapter 031 L1
streaming (page) | HTTP response streaming, page streaming | Server opens the response and writes it in pieces, sending ready parts while it works on the rest. | first defined: Chapter 031 L2
shell (streaming) | static shell | The page's outer UI not behind any Suspense boundary; rendered first because it waits on no slow data. | first defined: Chapter 031 L2
response chunk | streaming chunk, flush | A partial write to an open HTTP response, sent before the response finishes; writing one is a flush. | first defined: Chapter 031 L2
chunked transfer encoding | - | HTTP/1.1 mechanism sending a response body in pieces without declaring its total length up front. | first defined: Chapter 031 L2
Promise.all | - | Starts all given promises at once and awaits them as a group; rejects if any rejects, so latency is max not sum. | first defined: Chapter 031 L2
Promise.allSettled | - | Like Promise.all but resolves with a result per promise regardless of individual failures. | first defined: Chapter 031 L2
boundary | - | A wrapper React places around a subtree to handle one cross-cutting concern, loading, errors, or a missing resource. | first defined: Chapter 031 L3
segment file | - | A specially-named file dropped beside page.tsx that the framework turns into a boundary: loading.tsx, not-found.tsx, error.tsx. | first defined: Chapter 031 L3
bubble up | bubbling | Throws propagate upward through the tree until a boundary catches them, like an exception up the call stack. | first defined: Chapter 031 L3
Cache Components | - | Next.js 16 rendering mode: routes dynamic by default, caching an explicit opt-in. The course default. | first defined: Chapter 031 L3
global-error.tsx | - | App Router's outermost Error Boundary, wrapping the root layout; replaces it as the whole document, so it renders its own html and body. | first defined: Chapter 031 L4
internationalization | i18n | Adapting an app's copy and formatting to the user's locale. | first defined: Chapter 031 L4
'use cache' | use cache directive | Directive opting a component subtree into build-time caching; the explicit opt-in under Cache Components. | first defined: Chapter 032 L1
cacheComponents | - | Next.js 16 config flag enabling dynamic-by-default, the 'use cache' opt-in, and Partial Prerendering. | first defined: Chapter 032 L1
Full Route Cache | - | Next.js 13–15 build-time-rendered HTML/RSC payload of a whole route, served per request until revalidated. | first defined: Chapter 032 L1
Partial Prerendering | PPR | Rendering mode: cached static shell ships instantly, dynamic holes stream in via Suspense. | first defined: Chapter 032 L1
request-time API | - | Value existing only per request: searchParams, cookies, headers; awaiting one forces dynamic rendering. | first defined: Chapter 032 L1
connection() | - | next/server function; awaiting it marks everything below as dynamic, for request-time code the framework cannot detect. | first defined: Chapter 032 L1
dynamic bailout | bails out | Build can't prerender a component reading request data; it must be cached or wrapped in Suspense. | first defined: Chapter 032 L2
cache key | - | Identity a cached result is stored/looked up under; same key means shared stored value. | first defined: Chapter 032 L3
serializable | - | Encodable to a transferable form and reconstructable later; the requirement for crossing the cache boundary. | first defined: Chapter 032 L3
pass-through | - | Non-serializable value (children, slot, Server Action) a cached component places but never inspects, so it stays out of the key. | first defined: Chapter 032 L3
in-memory LRU | LRU | Default 'use cache' store; least-recently-used eviction drops the least recently used entries when full. | first defined: Chapter 032 L3
cacheLife | - | next/cache call inside a cached body setting its freshness timeout via stale/revalidate/expire or a preset. | first defined: Chapter 032 L4
cacheTag | - | next/cache call attaching a named string handle to a cache entry so invalidation can target it. | first defined: Chapter 032 L4
stale (cacheLife) | - | cacheLife window where a client reuses its copy without contacting the server. | first defined: Chapter 032 L4
revalidate (cacheLife) | - | cacheLife point past which a request is served the cached value but a background refresh fires. | first defined: Chapter 032 L4
expire (cacheLife) | - | cacheLife hard ceiling; past it the next request blocks for a fresh fetch. | first defined: Chapter 032 L4
stale-while-revalidate | SWR | Serve the old value now and refresh in the background, so the user never waits. | first defined: Chapter 032 L4
revalidation | revalidate | Re-running a cached function to replace its stored value. | first defined: Chapter 032 L4
cache tag | tag | A string handle attached to a cache entry that the invalidation API targets. | first defined: Chapter 032 L4
invalidate | invalidation | Mark a cached entry stale so the next read refreshes it. | first defined: Chapter 032 L4
timeout (cache) | pull policy | Clock-based refresh cacheLife controls; the cache re-runs on a timer regardless of changes. | first defined: Chapter 032 L4
push (cache) | push policy | Tag-plus-invalidation refresh fired by the source the moment data changes. | first defined: Chapter 032 L4
cache preset | named preset | Named cacheLife profile tuned to a data shape rather than a stopwatch reading. | first defined: Chapter 032 L4
request-scoped | per-request | Lives only for one server render of one request, then is discarded. | first defined: Chapter 032 L5
read-your-writes | - | After a write, the very next read reflects it; the writer never sees stale data. | first defined: Chapter 032 L6
updateTag | - | next/cache call expiring a tag so the next read blocks for fresh data; Server Actions only, gives read-your-writes. | first defined: Chapter 032 L6
revalidateTag | - | next/cache call marking a tag stale with a cacheLife profile; stale-while-revalidate, runs anywhere on the server. | first defined: Chapter 032 L6
revalidatePath | - | next/cache call invalidating by URL instead of tag; for path-as-resource cases like sitemaps and OG images. | first defined: Chapter 032 L6
router.refresh | - | next/navigation client call re-pulling the route's Server Components without clearing the server cache. | first defined: Chapter 032 L6
path-as-resource | - | The cached thing is a URL's output (file, image, feed) with no underlying entity to tag. | first defined: Chapter 032 L6
route segment config | segment config | The legacy `export const` constants (dynamic, revalidate, fetchCache, runtime) Next 13-15 read at module scope to set render disposition; retired under Cache Components. | first defined: Chapter 032 L7
ISR | Incremental Static Regeneration | Next 13-15 model re-generating a static page in the background after a fixed time window. | first defined: Chapter 032 L7
next typegen | typegen | Next.js command generating route-typed PageProps/LayoutProps helpers from the app/ folder; runs with dev and build. | first defined: Chapter 032 L7
draftMode() | draft mode | Async next/headers API returning { isEnabled, enable, disable }, the toggle a CMS preview uses to show unpublished content. | first defined: Chapter 032 L7
cookies() | next/headers cookies | Async next/headers function returning the request's read-only cookie store; get/getAll/has during render. | first defined: Chapter 033 L1
headers() | next/headers headers | Async next/headers function returning the read-only request Headers; server-only. | first defined: Chapter 033 L1
Headers (web API) | Headers object | Standard browser API for reading/writing HTTP header name/value pairs (get/has/entries). | first defined: Chapter 033 L1
request surface | - | A route's only inputs: the URL, the headers, and the cookies. | first defined: Chapter 033 L1
A/B test | A/B-test | Experiment showing different variants to different users to measure which performs better. | first defined: Chapter 033 L1
session | cookie-backed identity | The verified, cookie-backed identity the server trusts for authorization, never a raw header. | first defined: Chapter 033 L1
matcher | - | proxy.ts config export of path patterns deciding which requests run the proxy. | first defined: Chapter 033 L2
Node.js runtime | - | The full Node environment proxy.ts runs on in Next.js 16; same APIs as the rest of the app. | first defined: Chapter 033 L2
Edge runtime | - | Stripped-down JS environment with a limited API subset; the old middleware target, not for new code. | first defined: Chapter 033 L2
path-to-regexp | - | Library turning matcher path patterns like /dashboard/:path* into regular expressions. | first defined: Chapter 033 L2
negative lookahead | - | Regex (?!...) group matching only when the enclosed pattern is absent. | first defined: Chapter 033 L2
NextRequest | - | Next.js extension of the web-platform Request with conveniences like nextUrl and cookies. | first defined: Chapter 033 L2
NextResponse | - | Next.js extension of the web-platform Response with next/redirect/rewrite helpers. | first defined: Chapter 033 L2
defense in depth | - | Layered checks: a fast non-authoritative gate plus the real validation behind it. | first defined: Chapter 033 L2
allow-list | allowlist | Enumerate permitted values and reject the rest; safer than a deny-list. | first defined: Chapter 033 L2
@vercel/functions | - | Vercel helper package; geolocation() and ipAddress() replace removed request.geo/request.ip. | first defined: Chapter 033 L2
open-redirect | open redirect | Redirect to a URL from unvalidated input, letting an attacker bounce the user to a hostile site. | first defined: Chapter 033 L2
link equity | - | Ranking value search engines pass through links; a 308 forwards it, a temporary redirect does not. | first defined: Chapter 033 L3
protocol-relative URL | - | URL starting with // that the browser resolves using the current page's protocol, e.g. //evil.com. | first defined: Chapter 033 L3
waterfall | fetch waterfall | Requests forced to run in sequence because each waits on the prior; latency stacks. | first defined: Chapter 033 L4
pagination cursor | cursor | Opaque token encoding where the last page ended (sort key + tiebreaker), handed back to resume. | first defined: Chapter 033 L4
tiebreaker | - | Secondary sort key making ordering deterministic when the primary key ties. | first defined: Chapter 033 L4
opaque | - | Data the user receives and returns unchanged but isn't meant to read or edit. | first defined: Chapter 033 L4
ReadonlyURLSearchParams | - | Read-only URLSearchParams subclass returned by useSearchParams; get/getAll/has but no set/delete. | first defined: Chapter 033 L5
usePathname | - | next/navigation Client-Component hook returning the current path as a string, no query or hash. | first defined: Chapter 033 L5
useParams | - | next/navigation Client-Component hook returning the route's dynamic segments as an object; synchronous. | first defined: Chapter 033 L5
router.replace | - | Soft navigation that overwrites the current history entry instead of pushing a new one; for filter/sort/pagination. | first defined: Chapter 033 L5
next.config.ts | next.config | Typed Next.js project config module, read once at startup/build; shapes build and serving, ships nothing to the browser. | first defined: Chapter 034 L1
native binding | native addon | A compiled .node module: machine code for one platform a bundler can't read, only require at runtime. | first defined: Chapter 034 L1
serverExternalPackages | - | next.config key listing packages Next leaves unbundled and requires at runtime; for native/dynamic-require packages. | first defined: Chapter 034 L1
transpilePackages | - | next.config key listing raw, un-compiled packages (e.g. monorepo .tsx) Next must compile in before bundling. | first defined: Chapter 034 L1
next/image | <Image> | Next.js image component: sizing, lazy-loading, format negotiation, and reserved box by default. | first defined: Chapter 034 L2
static import (image) | - | Importing an image file as a module; build-time width/height and blurDataURL ride on the typed object. | first defined: Chapter 034 L2
blurDataURL | - | Tiny build-time blurred preview baked into a static image import, shown while the full file streams in. | first defined: Chapter 034 L2
fill | - | next/image prop making the image expand to cover its nearest positioned ancestor; requires sizes. | first defined: Chapter 034 L2
srcset | - | A set of the same image at several widths, letting the browser pick the right-sized file. | first defined: Chapter 034 L2
sizes | - | next/image prop telling the browser the image's rendered width per breakpoint, so it picks the right srcset entry. | first defined: Chapter 034 L2
image optimizer | optimizer | The /_next/image endpoint that fetches, transcodes, resizes, and caches images on demand through your server. | first defined: Chapter 034 L2
preload (next/image) | - | next/image prop inserting a preload link for the LCP image; Next 16 rename of priority. | first defined: Chapter 034 L2
placeholder="blur" | - | next/image prop showing a blurred preview in the reserved box until the full image loads. | first defined: Chapter 034 L2
qualities | - | next.config images allowlist of permitted quality values; a quality off the list coerces to the closest allowed. | first defined: Chapter 034 L2
remotePatterns | - | next.config allowlist of external image origins the optimizer may fetch; closes the open-proxy hole. | first defined: Chapter 034 L2
localPatterns | - | next.config allowlist for local image src values that carry a query string. | first defined: Chapter 034 L2
provenance | - | Where an asset came from: build-time (static import) vs runtime/third-party (remote src + remotePatterns). | first defined: Chapter 034 L2
WebP | - | Modern image format ~25-35% smaller than PNG/JPEG; next/image's default negotiated output. | first defined: Chapter 034 L2
AVIF | - | Image format ~20% smaller than WebP but ~50% slower to encode; opt-in via images.formats. | first defined: Chapter 034 L2
unoptimized | - | next/image escape hatch serving original bytes untouched; default for .svg sources. | first defined: Chapter 034 L2
dangerouslyAllowSVG | - | next.config flag forcing SVGs through the optimizer; an XSS risk, so reserve for trusted SVGs. | first defined: Chapter 034 L2
open proxy | open image proxy | A server that fetches arbitrary attacker-supplied URLs on its own behalf; what remotePatterns prevents. | first defined: Chapter 034 L2
redirects() | redirects | next.config async function returning request-blind redirect rules (source/destination/permanent) applied at the CDN edge with no function invocation. | first defined: Chapter 034 L3
rewrites() | rewrites | next.config async function returning rules that change what serves a URL while the address bar stays put; flat array or beforeFiles/afterFiles/fallback stages. | first defined: Chapter 034 L3
has / missing | has, missing | Per-rule arrays of cookie/header/host/query conditions narrowing a config rule by presence or literal value, without decoding or trusting it. | first defined: Chapter 034 L3
trailingSlash | - | next.config flag picking one canonical URL form (slash or no slash) for the whole app; a launch-time decision costly to flip later. | first defined: Chapter 034 L3
reverse proxy | - | A server that forwards a request to an upstream origin and relays the response under your own URL. | first defined: Chapter 034 L3
Open Graph | OG, og tags | Protocol letting a page describe its link preview (title, description, image) via og: meta tags read by Slack, Discord, etc. | first defined: Chapter 034 L6
canonical URL | rel-canonical | The one URL a search engine should treat as a page's real address when the same content has several; consolidates ranking signal. | first defined: Chapter 034 L6
Satori | - | Engine behind ImageResponse; renders a flexbox-only JSX/CSS subset to SVG then PNG, inline styles, no JS runtime. | first defined: Chapter 034 L6
metadataBase | - | Metadata field setting the absolute origin once so relative metadata URLs (canonical, OG image) resolve against it. | first defined: Chapter 034 L6
title template | - | Root metadata title pattern (%s — Brand) each child page's title segment drops into, with a default for segments setting none. | first defined: Chapter 034 L6
ImageResponse | next/og | next/og class rendering JSX to a PNG via Satori; the engine of generated OG images. | first defined: Chapter 034 L6
opengraph-image | - | Route-segment file convention (.png static, or .tsx generated) Next wires into the og:image tags automatically. | first defined: Chapter 034 L6
unfurl | link preview | The card (thumbnail, title, description) a chat or social app renders when a link is pasted. | first defined: Chapter 034 L6
statically optimized | static optimization | Rendered at build time and cached, with no per-request work, unless it reads request data or uncached reads. | first defined: Chapter 034 L6
crawler | bot, web crawler | Automated program fetching pages to build a search index; Googlebot, Bingbot, social/AI scrapers. | first defined: Chapter 034 L7
Robots Exclusion Standard | robots.txt protocol | Site-wide voluntary protocol telling well-behaved crawlers which paths they may request. | first defined: Chapter 034 L7
duplicate content | - | Same content at multiple URLs splits ranking signals; a leaked staging deploy is the classic cause. | first defined: Chapter 034 L7
sitemap | sitemap.xml | XML file listing URLs you want crawled, with optional last-modified and change-frequency hints. | first defined: Chapter 034 L7
favicon | - | Small icon shown in a browser tab, bookmark, and history; historically a single favicon.ico at the site root. | first defined: Chapter 034 L7
PWA | Progressive Web App | Installable web app; manifest gives Add to Home Screen, full PWA adds offline support. | first defined: Chapter 034 L7
apple touch icon | apple-icon | Raster icon iOS uses when a site is added to the home screen. | first defined: Chapter 034 L7
web app manifest | manifest.webmanifest | JSON the browser reads to present an installed web app: name, icons, display mode, colors. | first defined: Chapter 034 L7
standalone display | display: standalone | Manifest display mode running the installed app full-screen with no browser chrome. | first defined: Chapter 034 L7
theme-color | theme_color | meta tag tinting the mobile browser chrome (address/status bar) to a chosen color. | first defined: Chapter 034 L7
generateStaticParams | - | Build-time named export returning the param list that turns a dynamic segment into a static catalog. | first defined: Chapter 034 L8
static catalog | - | A dynamic route segment prerendered into a fixed set of static URLs at build. | first defined: Chapter 034 L8
static generation | - | Building a page's HTML once at build and serving it without running the render per request. | first defined: Chapter 034 L8
materialize | - | Generate the concrete HTML for one specific URL at build time. | first defined: Chapter 034 L8
build environment | - | The Node process running once at next build, before any request; DB, filesystem, APIs reachable. | first defined: Chapter 034 L8
surgical invalidation | - | Busting one record's cache by its tag instead of rebuilding everything. | first defined: Chapter 034 L8
on-demand rendering | - | Rendering a URL on first request and caching the result, versus rendering it at build. | first defined: Chapter 034 L8
getStaticPaths | - | Legacy Pages-Router export declaring which URLs to build; replaced by generateStaticParams. | first defined: Chapter 034 L8
getStaticProps | - | Legacy Pages-Router export supplying each prerendered page's data; replaced by the page's async body. | first defined: Chapter 034 L8
degit | - | Tool copying a repo folder into a fresh directory with no git history; scaffolds a starter. | first defined: Chapter 035 L1
empty state | - | The UI a surface shows when there is nothing to display yet; a normal, expected state, not an error. | first defined: Chapter 027 L5
modal-with-real-URL pattern | URL-backed modal | A form/view shown as a modal on soft nav and a full page on hard nav, both from one URL via an intercepting route and its twin. | first defined: Chapter 035 L3
history stack | browser history | Ordered list of URLs visited in a tab; navigating pushes an entry, the back button pops the top. | first defined: Chapter 035 L3
relational model | - | Data as a set of tables, each a set of rows, each row typed columns, with references between tables. | first defined: Chapter 036 L1
primary key | PK | A column (or column set) whose value uniquely names each row. | first defined: Chapter 036 L1
composite key | - | A primary key formed from two or more columns, unique only in combination. | first defined: Chapter 036 L1
DDL | data definition language | The subset of SQL that defines the shape of tables, not the rows inside them. | first defined: Chapter 036 L1
normalization | normalize | Organizing tables so each fact is stored exactly once. | first defined: Chapter 036 L1
1NF | first normal form | Every cell holds one atomic value, no lists or repeated columns. | first defined: Chapter 036 L1
2NF | second normal form | No column depends on only part of a composite key. | first defined: Chapter 036 L1
3NF | third normal form | No non-key column depends on another non-key column. | first defined: Chapter 036 L1
atomic (column) | - | A single indivisible value; not a list or struct. | first defined: Chapter 036 L1
update anomaly | - | A duplicated fact updated in some copies but not others, leaving the database self-contradicting. | first defined: Chapter 036 L1
denormalization | denormalize | Deliberately duplicating or flattening data to speed a measured read path. | first defined: Chapter 036 L1
cardinality (relationship) | - | How many rows on one side of a relationship match how many on the other. | first defined: Chapter 036 L1
one-to-one | 1:1 | A relationship where one row in A matches at most one row in B. | first defined: Chapter 036 L1
one-to-many | 1:N | A relationship where one row in A relates to many rows in B; FK on the many side. | first defined: Chapter 036 L1
many-to-many | N:M | A relationship needing a junction table, each side having many of the other. | first defined: Chapter 036 L1
EXPLAIN ANALYZE | - | Postgres command running a query and reporting where it actually spends its time. | first defined: Chapter 036 L1
Postgres | PostgreSQL | Open-source relational database; the course default for SaaS backends. | first defined: Chapter 036 L1
connection string | database URL, DATABASE_URL | One URL encoding scheme, credentials, host, port, and database name to reach a database. | first defined: Chapter 036 L2
Docker | - | Tool that packages a program into a container and runs it the same on any machine. | first defined: Chapter 036 L2
image (Docker) | Docker image | Read-only disk template a container is created from; pulled from a registry. | first defined: Chapter 036 L2
container (Docker) | - | A running, isolated instance of a Docker image. | first defined: Chapter 036 L2
volume (Docker) | named volume | Persistent storage mounted into a container so its files outlive the container. | first defined: Chapter 036 L2
port mapping | port binding | Maps a port inside a container to a port on the host, exposing the container's service. | first defined: Chapter 036 L2
proxy | - | A local stand-in exposing a normal interface and forwarding every connection to a real backend elsewhere. | first defined: Chapter 036 L2
Neon | - | Managed serverless Postgres platform separating storage from compute; cheap branching and scale-to-zero. | first defined: Chapter 036 L2
Neon Local | - | Docker proxy exposing localhost while routing to an ephemeral Neon branch in the cloud. | first defined: Chapter 036 L2
scale-to-zero | - | Database compute suspends after idle and wakes on the next query; idle bills storage only. | first defined: Chapter 036 L2
prod-parity | production parity, parity | Local DB matching production's major version, extensions, and pooler so code behaves the same. | first defined: Chapter 036 L2
version drift | major-version drift | Local DB diverging from production's build/version; top cause of works-on-my-machine bugs. | first defined: Chapter 036 L2
ephemeral (branch) | - | Created fresh on start and deleted on stop, leaving nothing to clean up by hand. | first defined: Chapter 036 L2
stateless | - | A process holding no permanent data; kill it and nothing is lost, since state lives in storage. | first defined: Chapter 036 L3
branch (Neon) | Neon branch | A compute pointed at a copy-on-write snapshot of a parent branch's storage at a point in time. | first defined: Chapter 036 L3
copy-on-write | CoW | A copy sharing the original's pages until changed; only changed pages are written fresh. | first defined: Chapter 036 L3
point-in-time | - | A branch reflects its parent as it was at creation time; later changes never cross over either way. | first defined: Chapter 036 L3
primary (Neon) | primary branch | A Neon project's root branch, created with it and never deletable; all branches descend from it. | first defined: Chapter 036 L3
preview deployment | preview | A full running copy of the app per pull request, on its own URL, for review before merge. | first defined: Chapter 036 L3
handshake (connection) | - | The TCP, TLS, and auth round-trips paid before a connection runs a query. | first defined: Chapter 036 L4
backend (Postgres) | Postgres backend | A dedicated Postgres OS process serving one connection, with its own memory. | first defined: Chapter 036 L4
max_connections | - | Postgres's server-side hard cap on simultaneous connections/backends. | first defined: Chapter 036 L4
node-postgres | pg | The standard Postgres driver for long-lived Node processes; the pg package and its Pool. | first defined: Chapter 036 L4
serverless function | - | Ephemeral compute that boots for one request and is gone after; no process persists. | first defined: Chapter 036 L4
PgBouncer | - | Lightweight connection pooler sitting between clients and Postgres, reusing a small set of server connections. | first defined: Chapter 036 L4
transaction mode (PgBouncer) | - | Pooler mode lending a server connection for one transaction, then reclaiming it; vs session mode. | first defined: Chapter 036 L4
multiplexing (connections) | - | Many short-lived client connections sharing a few long-lived server connections by taking turns. | first defined: Chapter 036 L4
pooled URL | -pooler host | Neon connection string routing through PgBouncer; the default for serverless app traffic. | first defined: Chapter 036 L4
unpooled URL | direct URL, DATABASE_URL_UNPOOLED | Neon direct-host connection string skipping the pooler; for migrations and long sessions. | first defined: Chapter 036 L4
LISTEN/NOTIFY | - | Postgres built-in publish/subscribe, scoped to one connection. | first defined: Chapter 036 L4
advisory lock | - | An application-defined Postgres lock identified by a number your code chooses. | first defined: Chapter 036 L4
@neondatabase/serverless | Neon serverless driver | Neon's serverless driver; a node-postgres drop-in talking to Postgres over HTTP or WebSocket. | first defined: Chapter 036 L4
interactive transaction | - | A transaction that begins, reads, branches on the result, then writes, all on one held connection; vs a fixed batch. | first defined: Chapter 036 L4
neon-http | drizzle-orm/neon-http | Drizzle wrapper over the Neon HTTP driver; one fetch per query, for one-shot reads. | first defined: Chapter 036 L4
neon-serverless | drizzle-orm/neon-serverless | Drizzle wrapper over the Neon WebSocket Pool; a held connection for interactive transactions. | first defined: Chapter 036 L4
schema drift | drift, four-way drift | Hand-copied data shapes silently diverging from the schema; fails at runtime, not compile time. | first defined: Chapter 037 L1
$inferSelect | inferSelect | Drizzle helper reading a table's row type straight off the schema. | first defined: Chapter 037 L1
$inferInsert | inferInsert | Drizzle helper reading a table's insert type off the schema, defaulted columns optional. | first defined: Chapter 037 L1
createInsertSchema | createSelectSchema | Drizzle helper generating a Zod validator from a table's schema. | first defined: Chapter 037 L1
RLS | Row-Level Security | Postgres policies deciding which rows a given user may see. | first defined: Chapter 037 L1
projection | derived view shape | A distinct, narrower shape composed from an inferred row type, not retyped. | first defined: Chapter 037 L1
migration | DB migration | A versioned SQL change moving the database schema from one state to the next. | first defined: Chapter 037 L1
Drizzle Kit | - | Drizzle's CLI generating SQL migrations by diffing the schema file. | first defined: Chapter 037 L1
pgTable | - | Drizzle function defining one Postgres table: pgTable(name, columns). | first defined: Chapter 037 L2
column builder | - | Small function like text()/uuid() declaring a column's type, chained for constraints. | first defined: Chapter 037 L2
snake_case | - | SQL/Postgres identifier convention: lowercase words joined by underscores (amount_due). | first defined: Chapter 037 L2
camelCase | - | JS/TS property convention: words joined with internal capitals (amountDue). | first defined: Chapter 037 L2
casing | casing policy | Drizzle client option (casing: 'snake_case') translating camelCase keys to snake_case columns. | first defined: Chapter 037 L2
identifier folding | case folding | Postgres lowercasing any unquoted identifier, so createdAt becomes createdat. | first defined: Chapter 037 L2
logger flag | logger: true | Drizzle client option printing every emitted SQL statement to the terminal. | first defined: Chapter 037 L2
pgSchema | Postgres schema namespace | Postgres namespace grouping tables in a database; Drizzle's pgSchema('name'). | first defined: Chapter 037 L2
migration generator | - | Tool turning the schema file into SQL that alters the real database; reads only exports. | first defined: Chapter 037 L2
nullable | - | Column that may hold NULL; Drizzle's default until .notNull(). | first defined: Chapter 037 L4
.notNull() | NOT NULL constraint | Drizzle modifier adding a NOT NULL constraint so Postgres rejects rows omitting the column. | first defined: Chapter 037 L4
soft delete | - | Marking a row deleted with a timestamp instead of removing it; queries filter it out. | first defined: Chapter 037 L4
column default | default | Value filling a column when an insert omits it; SQL-side (Postgres) or app-side (Drizzle). | first defined: Chapter 037 L4
DEFAULT clause | SQL-side default | The DEFAULT expression Postgres attaches to a column, evaluated on insert when the column is omitted. | first defined: Chapter 037 L4
.$defaultFn | app-side default, defaultFn | Drizzle modifier computing a default in JS just before insert; fires only through Drizzle. | first defined: Chapter 037 L4
.$onUpdate | onUpdate | Drizzle modifier re-stamping a column before each Drizzle update; fires only through Drizzle. | first defined: Chapter 037 L4
generated column | - | Column Postgres computes from other columns in the same row; read-only, kept in sync. | first defined: Chapter 037 L4
sql tag | sql template | Drizzle tagged template building a safe SQL fragment; column refs become real SQL names. | first defined: Chapter 037 L4
stored generated column | STORED | Generated column computed on write, saved to disk, and indexable; Drizzle pg default. | first defined: Chapter 037 L4
virtual generated column | VIRTUAL | Generated column computed on read, stored nowhere, not indexable. | first defined: Chapter 037 L4
natural key | - | Primary key that is a real domain value the outside world owns (country code, ISBN). | first defined: Chapter 037 L5
write amplification | - | One logical insert causing many physical page writes when a key lands mid-index and splits a page. | first defined: Chapter 037 L5
identity column | GENERATED ALWAYS AS IDENTITY | Column Postgres auto-fills from an internal sequence, per the SQL standard. | first defined: Chapter 037 L5
bigserial | - | Postgres's legacy auto-incrementing 8-byte integer type; superseded by identity columns. | first defined: Chapter 037 L5
RFC 9562 | - | 2024 IETF spec standardizing UUID versions 6, 7, and 8. | first defined: Chapter 037 L5
composite primary key | composite key | Primary key spanning two or more columns; the column combination is the key. | first defined: Chapter 037 L5
identity bigint | - | 8-byte auto-incrementing integer primary key for high-volume internal tables. | first defined: Chapter 037 L5
referential integrity | - | DB guarantee that every foreign-key value points at a real existing row. | first defined: Chapter 037 L6
orphan row | orphan | A child row whose referenced parent row no longer exists. | first defined: Chapter 037 L6
ON DELETE | onDelete, referential action | Per-relationship rule for what happens to child rows when their parent is deleted. | first defined: Chapter 037 L6
cascade (ON DELETE) | onDelete cascade | ON DELETE rule that deletes the child rows along with the parent. | first defined: Chapter 037 L6
set null (ON DELETE) | onDelete set null | ON DELETE rule that keeps the child and nulls its foreign-key column; needs a nullable column. | first defined: Chapter 037 L6
restrict (ON DELETE) | onDelete restrict | ON DELETE rule that blocks the parent delete while any child exists. | first defined: Chapter 037 L6
set default (ON DELETE) | onDelete set default | ON DELETE rule that points the child at its column default; rarely used. | first defined: Chapter 037 L6
NO ACTION | - | Postgres's implicit ON DELETE default; blocks like restrict but its check can defer to transaction end. | first defined: Chapter 037 L6
hard delete | - | Physically removing a row with a DELETE, as opposed to soft delete. | first defined: Chapter 037 L6
database constraint | constraint | A rule the database enforces on every write, from any source, that you cannot bypass without dropping it. | first defined: Chapter 037 L7
UNIQUE constraint | unique() | Constraint saying a value or column combination appears at most once in the table. | first defined: Chapter 037 L7
composite unique | composite unique constraint | Uniqueness over a combination of columns, e.g. (organizationId, slug). | first defined: Chapter 037 L7
CHECK constraint | check() | A boolean predicate Postgres evaluates per row; a false result rejects the write. | first defined: Chapter 037 L7
user experience | UX | The behaviour and feedback a person experiences while using the product. | first defined: Chapter 037 L7
associative entity | promoted junction, junction-as-entity | A junction promoted to a real table once the link carries its own data or is referenced; gains a surrogate id, composite key demoted to a unique. | first defined: Chapter 037 L8
$type | $type<T>(), jsonb $type | Drizzle column annotation declaring a jsonb's TS shape; compile-time promise only, not a runtime check. | first defined: Chapter 037 L3
drizzle-zod | - | Drizzle companion library generating runtime Zod validators from a table schema. | first defined: Chapter 037 L10
CRUD | create read update delete | The four basic operations on stored data (INSERT/SELECT/UPDATE/DELETE). | first defined: Chapter 038 L1
query builder | - | Inert object collecting query instructions via chained methods; runs only on await. | first defined: Chapter 038 L1
thenable | - | Object with a .then() so await works on it; awaiting Drizzle's builder fires the query. | first defined: Chapter 038 L1
placeholder (SQL) | bound slot, $1 | A bound slot ($1, $2) in a parameterized query, filled with its value at execution. | first defined: Chapter 038 L1
join | - | Combining rows of two tables into one result by matching them on a predicate. | first defined: Chapter 038 L2
cross product | cartesian product | Every row of one table paired with every row of the other; what a join returns with a missing or always-true predicate. | first defined: Chapter 038 L2
self-join | - | A join where both sides are the same table, relating rows to other rows in it via alias. | first defined: Chapter 038 L2
filter object | object where | RQB's where as a plain object: column keys, bare value means equals, operator objects, AND/OR/NOT/RAW. | first defined: Chapter 038 L3
RAW | RAW key | RQB filter-object escape hatch: a (t) => sql`…` callback for predicates the object can't express, still parameterized. | first defined: Chapter 038 L3
correlated subquery | - | Subquery referencing the outer query's current row; how RQB nests relations in one statement, no N+1. | first defined: Chapter 038 L3
aggregate function | aggregate | A function computing one value across many rows (count, sum, avg). | first defined: Chapter 038 L4
COUNT(*) | count() | SQL aggregate counting every row; the star means every row, not all columns. | first defined: Chapter 038 L4
groupBy | GROUP BY | Clause collapsing rows into one output row per distinct group key; non-aggregated selected columns must appear in it. | first defined: Chapter 038 L4
having | HAVING | Clause filtering whole groups after the collapse, can test aggregates; where filters rows before. | first defined: Chapter 038 L4
FILTER (WHERE …) | filter clause | Postgres clause attaching a predicate to a single aggregate so it counts only matching rows. | first defined: Chapter 038 L4
selectDistinct | SELECT DISTINCT | Collapses fully identical rows into one. | first defined: Chapter 038 L4
distinctOn | DISTINCT ON | Postgres-specific selector keeping the first row per distinct column, ordered by orderBy; not standard SQL. | first defined: Chapter 038 L4
date_trunc | - | Postgres function flattening a timestamp to the first instant of a unit (month, day) to build group buckets. | first defined: Chapter 038 L4
coalesce | COALESCE | Returns the first non-null argument; turns an empty-sum null into 0 at the database. | first defined: Chapter 038 L4
upsert | insert-or-update | A single statement that inserts a row or, on a unique-constraint collision, updates the existing row instead. | first defined: Chapter 038 L5
ON CONFLICT | INSERT ... ON CONFLICT | Postgres insert clause defining what to do when the row collides on a unique/primary-key constraint; the upsert mechanism. | first defined: Chapter 038 L5
onConflictDoNothing | - | Drizzle method: skip the insert (no error) when it would collide on the target constraint. | first defined: Chapter 038 L5
onConflictDoUpdate | - | Drizzle method: update the existing row from the proposed values when the insert collides; the full upsert. | first defined: Chapter 038 L5
RETURNING | .returning() | SQL clause making a mutation hand back the rows it wrote; Drizzle's .returning(), typed like a select. | first defined: Chapter 038 L5
excluded | excluded table | Postgres pseudo-table inside ON CONFLICT DO UPDATE: the row the insert proposed but couldn't write; its values feed the update. | first defined: Chapter 038 L5
atomic (statement) | atomic operation | A statement that runs as one indivisible unit, with no observable half-finished state. | first defined: Chapter 038 L5
sql (Drizzle) | sql tagged template | Drizzle tagged template for raw SQL fragments; interpolated values become bound parameters, so it stays injection-safe. | first defined: Chapter 038 L5
targetWhere | - | onConflict option constraining which rows count as a conflict; pairs with a partial unique index. | first defined: Chapter 038 L5
setWhere | - | onConflictDoUpdate option constraining which conflicts actually update, e.g. only when the incoming row is newer. | first defined: Chapter 038 L5
cursor pagination | - | Paging by remembering the last row a page returned and asking for the rows after it, instead of counting from the front. | first defined: Chapter 038 L6
offset pagination | offset | Paging by sorting, skipping the first N rows, and taking the next page; slow when deep and unstable on live data. | first defined: Chapter 038 L6
keyset pagination | - | Formal name for cursor pagination: paging by the value of the last row's sort key(s) rather than by position. | first defined: Chapter 038 L6
intermediate result | - | A set of rows or values a query computes first, then uses to answer the real question. | first defined: Chapter 038 L7
subquery | - | A SELECT statement nested inside another statement. | first defined: Chapter 038 L7
common table expression (CTE) | CTE, WITH clause | A named subquery introduced with WITH, referenced by the main query like a table. | first defined: Chapter 038 L7
derived table | - | A subquery used in the FROM clause, queried as if it were a table. | first defined: Chapter 038 L7
scalar (subquery) | scalar | A subquery selecting one column and one row, returning a single value to compare against. | first defined: Chapter 038 L7
materialized (CTE) | WITH MATERIALIZED | Postgres computing a CTE's rows once and storing them for the statement, instead of inlining the query. | first defined: Chapter 038 L7
window function | - | A function computing a value across a set of related rows (the window) without collapsing them into one row. | first defined: Chapter 038 L7
recursive CTE | WITH RECURSIVE | A CTE that references itself to walk tree data via a base case and a repeating step. | first defined: Chapter 038 L7
full-text search | FTS | Searching documents by the words they contain, with stemming and ranking, not raw substrings; Postgres ships it in the box. | first defined: Chapter 038 L8
lexeme | - | A normalized word stem; 'running'/'ran'/'runs' all reduce to 'run'. | first defined: Chapter 038 L8
tsvector | - | Postgres type holding a document pre-processed into its sorted set of lexemes with positions; built with to_tsvector. | first defined: Chapter 038 L8
tsquery | - | Postgres type holding a search expression in lexeme space; built with websearch_to_tsquery/to_tsquery/plainto_tsquery. | first defined: Chapter 038 L8
text search configuration | search config | Named Postgres bundle of a stemmer and stop-word list (e.g. 'english', 'simple') deciding how text becomes lexemes. | first defined: Chapter 038 L8
stemming | stem | Reducing a word to its root form so variants match; 'running'/'ran'/'runs' stem to 'run'. | first defined: Chapter 038 L8
stop word | stopword | A common word ('the', 'a', 'are') dropped during normalization because it carries no search signal. | first defined: Chapter 038 L8
websearch_to_tsquery | - | Postgres function parsing raw human-typed (Google-style) search input into a tsquery without throwing. | first defined: Chapter 038 L8
customType | - | Drizzle escape hatch for declaring a column type the library doesn't ship; implement dataType(). | first defined: Chapter 038 L8
ts_rank | - | Postgres function scoring how well a tsvector matches a tsquery; higher is more relevant, order by it descending. | first defined: Chapter 038 L8
ts_rank_cd | cover density | Cover-density variant of ts_rank rewarding matched terms that appear close together. | first defined: Chapter 038 L8
ts_headline | - | Postgres function returning a snippet of source text with matched lexemes wrapped (default <b>...</b>). | first defined: Chapter 038 L8
faceted search | facets | Letting users narrow results by structured attributes shown as counts; the filter-sidebar-with-counts pattern. | first defined: Chapter 038 L8
pg_trgm | - | Postgres extension for trigram similarity matching; handles typos and partial matches lexeme search can't. | first defined: Chapter 038 L8
-> | json field accessor | Returns a jsonb value at a key as jsonb; use to descend into nested objects. | first defined: Chapter 038 L9
->> | json text accessor | Returns a jsonb value at a key as text; always a string, use on the leaf you read or compare. | first defined: Chapter 038 L9
#>> | json path text accessor | Takes a path array and returns the leaf at that path as text. | first defined: Chapter 038 L9
@> | jsonb containment operator | Tests whether the left jsonb contains the right; the most-used jsonb filter, GIN-accelerable. | first defined: Chapter 038 L9
? | jsonb key-existence operator | Tests whether a top-level key is present; siblings ?| (any) and ?& (all). | first defined: Chapter 038 L9
jsonb || | jsonb concatenation operator | Shallow one-level merge of two jsonb objects; right-side keys add or overwrite. | first defined: Chapter 038 L9
jsonb_set | - | Postgres function writing one nested path inside a jsonb value, leaving the rest intact. | first defined: Chapter 038 L9
promotion trigger | - | The moment a queried jsonb field has earned being moved to a real indexed column. | first defined: Chapter 038 L9
db.execute | - | Runs an arbitrary statement on the pool, returning the raw driver result, not a typed builder array. | first defined: Chapter 038 L10
sql.raw | - | Interpolates a string into SQL without binding; safe only for fixed identifiers from your own code. | first defined: Chapter 038 L10
sql.identifier | - | Quotes a runtime-chosen table or column name; still validate against an allow-list. | first defined: Chapter 038 L10
dynamic identifier | - | A table or column name chosen at runtime, not written literally; a bound parameter can't be one. | first defined: Chapter 038 L10
sql<T> | sql type parameter | A TypeScript claim on a raw fragment's return type; trusted like as, never runtime-checked. | first defined: Chapter 038 L10
shallow drop | - | A sql fragment inside a builder query; result type and projection stay intact. | first defined: Chapter 038 L10
full drop | - | A whole db.execute(sql) statement; no inference, no builder safety. | first defined: Chapter 038 L10
quoted identifier | - | A table/column name interpolated as a real SQL name like "invoices"."id", not a bound value. | first defined: Chapter 038 L10
materialized view | - | A query result computed once and stored on disk like a table; refresh recomputes it. | first defined: Chapter 038 L10
DataLoader | - | GraphQL-world batching utility coalescing per-id loads within one tick into a single query. | first defined: Chapter 039 L2
declarative (SQL) | - | A query stating the result you want, not the steps; the database picks the how. | first defined: Chapter 039 L3
cost estimate | cost= | Planner's predicted cost of a node in arbitrary units; for comparing plans, never milliseconds. | first defined: Chapter 039 L3
BUFFERS | buffers | EXPLAIN option reporting pages each node read from RAM (hit) vs disk (read). | first defined: Chapter 039 L3
indentation is depth | - | Reading a plan tree by indentation: deeper nodes are children that run first. | first defined: Chapter 039 L3
planner statistics | statistics | Sampled per-column summaries the planner uses to estimate row counts; refreshed by ANALYZE. | first defined: Chapter 039 L3
ANALYZE (command) | - | SQL command refreshing a table's planner statistics; distinct from the EXPLAIN ANALYZE option. | first defined: Chapter 039 L3
covering index | - | An index holding every column a query reads, so it answers from the index alone. | first defined: Chapter 039 L3
Rows Removed by Filter | - | Plan line counting rows a node read then discarded for failing the WHERE filter. | first defined: Chapter 039 L3
auto_explain | - | Postgres extension that logs the plan of any query slower than a set threshold. | first defined: Chapter 039 L3
Index Scan | - | Plan node walking a B-tree to find keys, then fetching those rows from the table. | first defined: Chapter 039 L3
Index Only Scan | - | Plan node answering from a covering index alone, never touching the table. | first defined: Chapter 039 L3
Bitmap Index Scan | Bitmap Heap Scan | Plan nodes combining indexes via a bitmap before fetching, for medium-selectivity queries. | first defined: Chapter 039 L3
Nested Loop | - | Join node probing the inner input once per outer row; watch its loops=. | first defined: Chapter 039 L3
Hash Join | - | Join node building a hash table from one input and probing it with the other. | first defined: Chapter 039 L3
Merge Join | - | Join node zipping two inputs already sorted on the join key. | first defined: Chapter 039 L3
Sort (plan node) | - | Plan node ordering rows; external merge means it spilled to disk. | first defined: Chapter 039 L3
Aggregate (plan node) | HashAggregate, GroupAggregate | Plan node folding rows behind count, sum, and group by. | first defined: Chapter 039 L3
transaction | db.transaction | A group of SQL statements that commit together or roll back together; all effects durable or none happened. | first defined: Chapter 039 L4
ACID | - | Atomicity, Consistency, Isolation, Durability; the four guarantees a transactional database provides. | first defined: Chapter 039 L4
atomicity | - | All statements in a transaction succeed together or fail together; no partial state. | first defined: Chapter 039 L4
durability | - | Once a transaction commits, its writes survive a crash, power loss, or restart. | first defined: Chapter 039 L4
isolation level | - | The transaction knob governing what changes a concurrent transaction can see while yours runs. | first defined: Chapter 039 L4
database snapshot | snapshot (transaction) | A consistent view of the whole database as of a moment; a transaction reads from it, not the latest state. | first defined: Chapter 039 L4
non-repeatable read | - | Reading a row twice in one transaction and getting two values, because another committed a change between. | first defined: Chapter 039 L4
phantom read | - | Re-running a range query in one transaction and finding new matching rows another transaction inserted. | first defined: Chapter 039 L4
write skew | - | Two transactions each read and decide validly, but their combined writes break an invariant neither broke alone. | first defined: Chapter 039 L4
read committed | - | Postgres default isolation; each statement sees a fresh snapshot of everything committed as it begins. | first defined: Chapter 039 L4
repeatable read | - | Isolation where the whole transaction reads one snapshot taken at its first statement; Postgres also blocks phantoms. | first defined: Chapter 039 L4
serializable (isolation) | - | Strongest isolation; result is as if concurrent transactions ran serially; the only level catching write skew. | first defined: Chapter 039 L4
serialization failure | 40001 | Error Postgres raises when it can't serialize concurrent transactions safely; the app retries the whole transaction. | first defined: Chapter 039 L4
SQLSTATE | - | A five-character SQL standard error code classifying what went wrong; switch on it to handle specific cases. | first defined: Chapter 039 L4
unique violation | 23505 | Error Postgres raises when a write would duplicate a value guarded by a UNIQUE constraint or unique index. | first defined: Chapter 039 L4
row lock | SELECT ... FOR UPDATE | A lock on specific rows so other transactions wait before modifying them; held until commit or rollback. | first defined: Chapter 039 L4
pessimistic concurrency | - | Take a lock up front so conflicting transactions wait their turn; best when contention is high and the hot row is known. | first defined: Chapter 039 L4
pool starvation | - | When all pooled connections are checked out and unavailable, so new queries must wait; often from long-held transactions. | first defined: Chapter 039 L4
snapshot (Drizzle) | meta/ snapshot, schema snapshot | Saved JSON of the full schema at each migration; what generate diffs against, never the live database. | first defined: Chapter 040 L1
dialect (Drizzle) | SQL dialect | Which database's SQL Drizzle Kit emits; postgresql pins it to Postgres types. | first defined: Chapter 040 L1
devDependencies | dev dependency | Packages needed only during development, never shipped to the production bundle. | first defined: Chapter 040 L1
_journal.json | journal, migration ledger | Ordered ledger of which migrations exist and the order they apply in. | first defined: Chapter 040 L1
__drizzle_migrations | migrations table | Postgres table recording which migration files have run, so each applies once. | first defined: Chapter 040 L1
schema-aware (GUI) | - | A DB GUI that reads your relations and column types, so it links foreign keys and validates by type. | first defined: Chapter 040 L1
Drizzle Studio | drizzle-kit studio | Local schema-aware web GUI for browsing and editing the dev database; not a production tool. | first defined: Chapter 040 L1
drizzle.config.ts | drizzle config | Repo-root file giving Drizzle Kit the dialect, schema path, migrations folder, and connection. | first defined: Chapter 040 L1
ephemeral branch | - | A short-lived Neon database branch you throw away once its feature merges. | first defined: Chapter 040 L2
backfill | - | Writing values into a newly added column for the rows that already existed. | first defined: Chapter 040 L2
ACCESS EXCLUSIVE | - | The strongest Postgres lock; blocks reads and writes, not just writes. | first defined: Chapter 040 L2
expand-backfill-contract | expand-contract, expand-migrate-contract, the cadence | Safe schema change: add the new shape, populate it, then drop the old shape once nothing reads it. | first defined: Chapter 040 L2
dual-write | - | Writing to both old and new columns during a migration so both stay populated. | first defined: Chapter 040 L2
fix forward | fix-forward | Correcting a failed migration with a new migration rather than rolling back. | first defined: Chapter 040 L2
statement-breakpoint | --> statement-breakpoint | Drizzle Kit marker splitting a migration file into separate statements. | first defined: Chapter 040 L2
deploy window | cutover | The interval during a deploy when old and new app versions coexist while traffic shifts. | first defined: Chapter 040 L2
invalid index | - | An index left unusable when CREATE INDEX CONCURRENTLY fails mid-build; must be dropped and rebuilt. | first defined: Chapter 040 L2
drizzle-seed | - | Schema-aware, deterministic, foreign-key-aware seeder for Drizzle; a devDependency, dev/test only. | first defined: Chapter 040 L3
fixtures | test fixtures | The pre-defined data a dev or test environment starts from before you do anything. | first defined: Chapter 040 L3
deterministic | determinism | Same inputs always produce the same output; no randomness leaks between runs. | first defined: Chapter 040 L3
topological order | topological sort | Ordering of dependency-graph nodes where each comes after what it depends on; parents before children. | first defined: Chapter 040 L3
.refine (drizzle-seed) | refine | drizzle-seed call taking a callback (f) to set per-table count, column generators, and with fanout. | first defined: Chapter 040 L3
reset (drizzle-seed) | - | drizzle-seed call clearing every row in FK-safe order, leaving table structure intact; not a drop. | first defined: Chapter 040 L3
valuesFromArray | f.valuesFromArray | drizzle-seed generator picking from a fixed set, optionally weighted, for pgEnum and curated columns. | first defined: Chapter 040 L3
test factory | factory helper | Function inserting one tailored row through Drizzle and returning it; for per-test rows, not datasets. | first defined: Chapter 040 L3
single round trip | single-round-trip | One request to the database and one response back; loading parent and children in one query, not several. | first defined: Chapter 041 L1
PRNG | pseudo-random number generator | Algorithm whose output stream is fully determined by a starting seed; same seed replays the same sequence. | first defined: Chapter 041 L1
@t3-oss/env-nextjs | t3-env, createEnv | Thin Zod wrapper validating env vars at build time and exporting typed values imported instead of process.env. | first defined: Chapter 041 L2
NEXT_PUBLIC_ prefix | NEXT_PUBLIC | Next.js prefix marking an env var safe for the browser; inlined into the bundle. Server-only secrets omit it. | first defined: Chapter 041 L2
SKIP_ENV_VALIDATION | - | Escape hatch disabling t3-env schema checks; legitimate only for a CI build without secrets. | first defined: Chapter 041 L2
browser bundle | client bundle | The JavaScript Next.js compiles and ships to the browser; anything inlined here is readable in devtools. | first defined: Chapter 041 L2
relationName | - | Drizzle relations() tag matched on both sides of an edge to disambiguate two relations between the same pair of tables. | first defined: Chapter 041 L3
introspect (database) | introspection | Querying a database's own catalog (information_schema, pg_catalog) to read its actual structure. | first defined: Chapter 041 L3
drizzle-kit push | push | Drizzle Kit command pushing the schema straight to the DB with no migration file; prototype-only escape hatch. | first defined: Chapter 041 L3
linear-congruential generator | LCG | A PRNG built from a one-line recurrence (state = state * a + c) that turns a seed into a repeatable number stream. | first defined: Chapter 041 L4
IDOR | insecure direct object reference | Exposing a row by a guessable/forgeable id with no ownership check; closed by scoping the query to the owner. | first defined: Chapter 041 L5
tenant guard | - | The organizationId filter placed inside the query where, AND-ed with the id, so a cross-org row never loads; the IDOR defense. | first defined: Chapter 041 L5
z.infer | z.infer<typeof>, Zod infer | Reads the TS type a Zod schema's successful parse returns, instead of hand-writing it. | first defined: Chapter 042 L1
.parse (Zod) | schema.parse | Zod method validating an unknown against the schema, returning a typed value or throwing. | first defined: Chapter 042 L1
z.object | object schema | Zod builder validating an object field by field; strips unknown keys by default. | first defined: Chapter 042 L1
z.strictObject | strict object | Zod object builder that throws on any unknown key; the boundary default. | first defined: Chapter 042 L1
z.looseObject | loose object, passthrough | Zod object builder that forwards unknown keys through untouched. | first defined: Chapter 042 L1
.optional / .nullable / .nullish | absence wrappers | Zod wrappers admitting undefined, null, or both; prefer .optional. | first defined: Chapter 042 L1
z.array | array schema | Zod builder for a list where every element matches one schema; .min/.max bound length. | first defined: Chapter 042 L1
z.tuple (Zod) | tuple schema | Zod builder for a fixed-length list where each position has its own type. | first defined: Chapter 042 L1
z.literal | literal schema | Zod builder accepting exactly one value, inferring its singleton type. | first defined: Chapter 042 L1
z.enum | enum schema | Zod builder for a finite string set; infers the union and exposes an .enum accessor. | first defined: Chapter 042 L1
z.union | union schema | Zod builder accepting any of several schemas; for shapeless alternatives. | first defined: Chapter 042 L1
z.discriminatedUnion | discriminated union schema | Zod builder routing on a shared literal field to one branch; the tagged-variant default. | first defined: Chapter 042 L1
discriminator (Zod) | discriminant | The shared literal field z.discriminatedUnion reads to pick a branch. | first defined: Chapter 042 L1
z.unknown | unknown schema | Zod builder accepting anything, inferring unknown; narrow it later. | first defined: Chapter 042 L1
z.never | never schema | Zod builder accepting nothing, inferring never. | first defined: Chapter 042 L1
format builder (Zod) | top-level format | Zod 4 top-level string builder (z.email, z.uuid, z.iso.datetime) replacing v3's chained z.string().email(). | first defined: Chapter 042 L2
z.email | email builder | Zod 4 top-level builder validating an RFC-aligned email; infers as string, tree-shakes. | first defined: Chapter 042 L2
z.guid | guid builder | Permissive Zod builder: any 8-4-4-4-12 hex string, version/variant unchecked; v3's loose z.string().uuid(). | first defined: Chapter 042 L2
OpenAPI | OpenAPI document | Standard machine-readable spec of a REST API's endpoints, inputs, and outputs. | first defined: Chapter 042 L2
CIDR | cidr block | IP-address-range notation (10.0.0.0/8): an address plus a prefix length of fixed leading bits. | first defined: Chapter 042 L2
CUID2 | cuid, ulid, nanoid | Collision-resistant ID string formats, each with its own alphabet; validate with the matching builder. | first defined: Chapter 042 L2
E.164 | e164 | International phone-number format: a leading + and up to fifteen digits. | first defined: Chapter 042 L2
JWT | JSON Web Token | Signed, self-describing token carrying claims, written as three base64url parts joined by dots. | first defined: Chapter 042 L2
refinement (Zod) | refine, .refine | Custom pass/fail check stored in a schema's checks array; validates the value without changing it or its inferred type. | first defined: Chapter 042 L3
transform (Zod) | .transform | Schema function producing a new value from the parsed one; can change the inferred output type. | first defined: Chapter 042 L3
.superRefine | superRefine | Zod check getting (value, ctx); pushes multiple issues via ctx.addIssue instead of returning a boolean. | first defined: Chapter 042 L3
.overwrite | overwrite | Zod value-changing function that preserves the input schema type; the normalization default. | first defined: Chapter 042 L3
.pipe (Zod) | pipe | Chains two schemas end to end; the first schema's output is the second's input, re-validated. | first defined: Chapter 042 L3
derive don't duplicate | schema derivation | Declare one canonical schema, derive every boundary variant from it so the variants can't drift. | first defined: Chapter 042 L4
.pick (Zod) | pick | Zod object method keeping only the masked keys, returning a new narrowed schema. | first defined: Chapter 042 L4
.omit (Zod) | omit | Zod object method dropping the masked keys, keeping the rest; builds the public-response shape. | first defined: Chapter 042 L4
.extend (Zod) | extend | Zod object method adding fields to a schema; a reused key overrides the old definition. | first defined: Chapter 042 L4
.partial (Zod) | partial | Zod object method making every field (or the masked ones) optional; the PATCH shape. | first defined: Chapter 042 L4
.required (Zod) | required | Zod object method forcing optional fields to be present; inverse of .partial. | first defined: Chapter 042 L4
.readonly (Zod) | readonly | Zod method inferring Readonly<T> and running Object.freeze on the parsed result. | first defined: Chapter 042 L4
.merge (Zod) | merge | Deprecated Zod v4 object-fusing method; replaced by the .shape spread. | first defined: Chapter 042 L4
.shape (Zod) | shape spread | An object schema's field map; spread two shapes into a fresh z.object to fuse them. | first defined: Chapter 042 L4
mask (Zod) | key mask | The { key: true } object .pick/.omit/.partial take to name fields, not an array. | first defined: Chapter 042 L4
z.record | record schema | Zod builder for an open-keyed map; v4 takes (keySchema, valueSchema). | first defined: Chapter 042 L4
z.looseRecord | loose record | Pass-through z.record variant that accepts keys not matching the key schema. | first defined: Chapter 042 L4
z.intersection | intersection schema | Zod builder for a value that must satisfy two schemas at once; for the non-object case. | first defined: Chapter 042 L4
z.input | input type | The type a schema's parser accepts: the pre-transform shape. | first defined: Chapter 042 L4
z.output | output type | The type a schema's parser returns: the post-transform shape; same as z.infer. | first defined: Chapter 042 L4
.describe (Zod) | describe | Zod method attaching a human-readable note consuming tools (OpenAPI, drizzle-zod) read. | first defined: Chapter 042 L4
createUpdateSchema | - | drizzle-zod generator for the patch shape: every column optional, generated columns absent. | first defined: Chapter 042 L7
override map | refinement object | drizzle-zod generator's optional second arg, keyed by column, refining or replacing each column's generated schema. | first defined: Chapter 042 L7
callback form | callback override | Override entry (schema) => schema.min()...; refines the generated base, nullability re-applied around it. | first defined: Chapter 042 L7
direct-schema form | direct-schema override | Override entry { col: someSchema } replacing the column's schema wholesale; nullability NOT re-applied, you own it. | first defined: Chapter 042 L7
int32 bounds | int32 range | -2147483648 to 2147483647; drizzle-zod bakes these into integer columns' generated schema. | first defined: Chapter 042 L7
envelope | webhook envelope | Outer { type, data } wrapper a webhook provider puts around an event; parse it first, then the payload inside. | first defined: Chapter 042 L7
createSchemaFactory | - | drizzle-zod factory binding generators to a custom Zod instance, with a coerce config (e.g. coerce: { date: true }). | first defined: Chapter 042 L7
ZodError | - | Error class a failed parse produces; carries an issues array, one entry per failure, not a single message. | first defined: Chapter 042 L5
issues array | error.issues | Array on a ZodError, one object per validation failure (code, message, path, code-specific fields). | first defined: Chapter 042 L5
path (Zod issue) | issue.path | Array locating the failing field inside the input; empty path means a form-level error. | first defined: Chapter 042 L5
parseAsync | safeParseAsync | Async-aware Zod runners needed when a refinement returns a Promise; sync parse/safeParse throw on async checks. | first defined: Chapter 042 L5
treeifyError | z.treeifyError | Top-level fn turning a ZodError into a nested object mirroring the input shape; course default for forms. | first defined: Chapter 042 L5
flattenError | z.flattenError | Top-level fn turning a ZodError into { formErrors, fieldErrors }; one level deep, for flat forms. | first defined: Chapter 042 L5
prettifyError | z.prettifyError | Top-level fn returning a ZodError as a human-readable multi-line string, for logs not UI. | first defined: Chapter 042 L5
error option (Zod) | error param | Zod 4's unified message hook: a string or (issue) => string, on a schema, refinement, or parse call. | first defined: Chapter 042 L5
error map | custom error | A (issue) => string function turning any issue into a message; Zod's single layered custom-wording hook. | first defined: Chapter 042 L5
operator signal | - | A validation failure the user can't fix (empty path, e.g. unrecognized_keys); log it, don't render it. | first defined: Chapter 042 L5
unrecognized_keys | - | ZodError issue code from a strict object rejecting an undeclared key; an operator signal with empty path. | first defined: Chapter 042 L5
z.coerce | coerce (Zod) | A transform fixed to a JS constructor (Number, Date, …) running before the inner schema validates; turns form strings into typed values. | first defined: Chapter 042 L6
z.preprocess | preprocess (Zod) | Maps the raw input before the inner schema validates; used to shape wire values (e.g. checkbox 'on') into real types. | first defined: Chapter 042 L6
z.stringbool | stringbool | Zod 4 validator for a present string that spells a boolean ('true'/'false', 'yes'/'no', 'on'/'off', '1'/'0'). | first defined: Chapter 042 L6
multipart/form-data | multipart form | Form encoding that splits the body into one part per field so binary file data can ride alongside text fields. | first defined: Chapter 042 L6
opaque ID | action ID | Hashed string the compiler ships in place of a Server Action's body; the client holds the ID, the server resolves it. | first defined: Chapter 043 L1
contract drift | - | Client and server sharing a schema fall out of sync; an unknown key signals a stale client, tampering, or a bug. | first defined: Chapter 043 L2
IO | input/output | A database read, an external call, or request state; checks needing it run in the action body, not the schema. | first defined: Chapter 043 L2
PII | personally identifiable information | Any data identifying a person (email, name, password); logging raw input can leak it. | first defined: Chapter 043 L2
return the expected, throw the unexpected | return vs throw | Action-error rule: return a typed Result for failures the user can fix, throw at the framework edge for bugs/infra and framework conventions. | first defined: Chapter 043 L3
catch, map, re-throw | catch-map-rethrow | In a catch block, map errors you recognize to a typed Result code and re-throw the rest toward error.tsx. | first defined: Chapter 043 L3
ErrorCode | error code (Result) | Small fixed string-literal union (validation, conflict, not_found, …) the form and analytics branch on; the cross-layer contract. | first defined: Chapter 043 L3
userMessage | - | Human sentence on a Result failure the form renders verbatim; the action owns it, the UI never invents copy. | first defined: Chapter 043 L3
fieldErrors (Result) | - | Optional Record<string, string[]> on a Result failure mapping a field name to its messages, dropped under each input. | first defined: Chapter 043 L3
401 | Unauthorized | HTTP status: no identity — the caller isn't signed in. Maps to the unauthorized error code. | first defined: Chapter 043 L3
403 | Forbidden | HTTP status: identity but no permission — signed in, wrong role or org. Maps to the forbidden error code. | first defined: Chapter 043 L3
suppression list | - | Email addresses the provider refuses to send to (bounced, complained, unsubscribed); sending to one is a business-rule failure. | first defined: Chapter 043 L3
useActionState | - | React hook running a Server Action and exposing its returned value as form state for the UI to render. | first defined: Chapter 043 L3
repository | data-access layer | The one file owning an entity's db reads and writes; this course names it db/queries/<entity>.ts. | first defined: Chapter 043 L4
data-access layer | repository, db/queries | The single file per feature allowed to import db; holds verb-led reads and writes. | first defined: Chapter 043 L4
DSL | domain-specific language | A small custom API or mini-language built for one project; one more thing every contributor must learn. | first defined: Chapter 043 L4
business logic | - | Logic that is a pure function of inputs to outputs, touching no cookies/db/network; lives in /lib. | first defined: Chapter 043 L4
orchestration | thin action | The action-body spine that sequences pure logic and side effects and shapes the outcome into a Result; owns no logic itself. | first defined: Chapter 043 L4
policy layer | - | Pure authorization predicates (canCreateInvoice(user, org)) at lib/<feature>/policy.ts; decides, never reads the session. | first defined: Chapter 043 L4
defaultValue | defaultChecked | React prop seeding an uncontrolled input's initial value on the first render only; the DOM owns it after. | first defined: Chapter 044 L1
action prop | form action | React 19 prop on a native form; on submit React serializes named fields into FormData and calls the prop's function with it, no onSubmit/fetch. | first defined: Chapter 044 L2
formAction | formaction | Native button attribute, camelCased; overrides the form's action for that button so one form's FormData can drive multiple actions. | first defined: Chapter 044 L2
action.bind | bind(null, id) | Pre-applies an extra leading argument to an action, returning a new function reference React still treats as a form action, keeping the appended FormData and no-JS fallback. | first defined: Chapter 044 L2
requestFormReset | - | react-dom call clearing uncontrolled inputs on demand, instead of React's automatic on-success reset; the edit-form escape hatch. | first defined: Chapter 044 L2
next/form Form | <Form> | Next.js form wrapping native <form> with route prefetch and client nav; prefetch needs a string-URL action, so equivalent to <form> for Server Action mutations. | first defined: Chapter 044 L2
loading UI | - | A route's shared loading and layout files Next can warm before navigation so the transition feels instant. | first defined: Chapter 044 L2
presentational component | - | A component with no hook or client directive that only renders the props it receives. | first defined: Chapter 044 L3
useFormStatus | - | react-dom client hook read inside a form; returns the enclosing form's submit state (pending, data, method, action) with no prop. | first defined: Chapter 044 L4
prop-drilling | prop drilling | Passing a value through intermediate components that don't use it, just to reach a deeper child. | first defined: Chapter 044 L4
descendant | - | A component rendered inside another in the tree, at any depth below it. | first defined: Chapter 044 L4
useOptimistic | - | React 19 hook overlaying an optimistic value on server truth inside a transition; React discards the overlay on settle and re-renders against actual state. | first defined: Chapter 044 L5
ValidityState | validity | Read-only object on every form control reporting which constraints fail (valueMissing, typeMismatch, patternMismatch, customError, …). | first defined: Chapter 044 L6
:user-invalid | user-invalid | Pseudo-class matching an invalid field only after the user engages it; the safe error-styling selector. | first defined: Chapter 044 L6
:invalid | invalid | Pseudo-class matching an invalid field from first paint, before the user types; scolds too early, avoid for required fields. | first defined: Chapter 044 L6
setCustomValidity | - | Form-control method flagging a field invalid with a custom message (empty string clears it); for cross-field rules attributes can't express. | first defined: Chapter 044 L6
inputMode | inputmode | Attribute telling a phone which soft keyboard to raise (decimal, numeric); not validation, set alongside type. | first defined: Chapter 044 L6
React Hook Form | RHF | Client-side library managing a form's field state, validation, and submit; subject of Chapter 045. | first defined: Chapter 044 L6
pre-hydration window | - | Gap between server HTML arriving and hydration finishing; submits in it take the native door even with JS on. | first defined: Chapter 044 L7
permalink | - | useActionState's optional third arg; URL the browser navigates to for a pre-hydration submit, must render the same form. | first defined: Chapter 044 L7
graceful degradation | - | Start from the rich JS version and strip features away; opposite of progressive enhancement. | first defined: Chapter 044 L7
Conform | conform.guide | Form library optimizing progressive enhancement on Server Actions; one Zod schema both sides, action gets FormData. | first defined: Chapter 045 L1
TanStack Form | tanstack form | Smallest-bundle form library with strong TS inference and per-validator timing; for form-heavy products. | first defined: Chapter 045 L1
useForm | - | RHF root hook, called once; creates the form's state container and returns every other primitive as a property. | first defined: Chapter 045 L2
register | register (RHF) | RHF call spread onto a native input (name/ref/onChange/onBlur); DOM owns the value, the uncontrolled fast path. | first defined: Chapter 045 L2
Controller | - | RHF render-prop bridge wiring a controlled value-owning component into form state via field value/onChange. | first defined: Chapter 045 L2
useController | - | Hook form of Controller; returns the same field and fieldState, for reusable field components. | first defined: Chapter 045 L2
handleSubmit | - | RHF wrapper returning a submit handler that intercepts, validates, then hands typed values to your onSubmit. | first defined: Chapter 045 L2
formState | - | RHF read side; a proxy of errors, isSubmitting, isDirty, etc., re-rendering only on the properties you read. | first defined: Chapter 045 L2
fieldState | - | Per-field RHF state (invalid, error, isDirty, isTouched) from Controller's render prop or useController. | first defined: Chapter 045 L2
watch | watch (RHF) | RHF call returning a field's live value, re-rendering the caller on every change; re-renders the whole form if read at the root. | first defined: Chapter 045 L2
useWatch | - | Hook form of watch; subscribes a small child to a live value so only that child re-renders. | first defined: Chapter 045 L2
defaultValues | - | RHF useForm option setting each field's initial value and declaring the full set of fields it tracks. | first defined: Chapter 045 L2
reset (RHF) | form.reset | RHF call re-setting field values and clearing dirty/touched state; called after a successful save. | first defined: Chapter 045 L2
mode (RHF) | validation mode | RHF useForm option deciding when validation first runs per field (onSubmit/onBlur/onChange/onTouched/all). | first defined: Chapter 045 L2
resolver (RHF) | - | Function RHF calls to validate; zodResolver builds one from a Zod schema so client and server share it. | first defined: Chapter 045 L2
zodResolver | - | @hookform/resolvers adapter turning a Zod schema into an RHF resolver. | first defined: Chapter 045 L2
proxy (formState) | tracked proxy | Wrapped object recording which properties you read and notifying only on those; reading subscribes you. | first defined: Chapter 045 L2
shadcn Field family | Field, FieldLabel, FieldError | Form-library-agnostic shadcn layout primitives used with RHF's Controller; successor to the old Form/FormField wrappers. | first defined: Chapter 045 L2
setError | form.setError | RHF call pushing an error into formState.errors[name]; routes a server fieldError onto the field, same place the resolver writes. | first defined: Chapter 045 L3
setValue | form.setValue | RHF call changing a field's value (optionally re-validating); not for pushing server errors. | first defined: Chapter 045 L3
reValidateMode | - | RHF useForm option deciding when a field re-validates after it has already errored (default onChange). | first defined: Chapter 045 L3
useFieldArray | - | RHF hook managing a variable-length array field; owns the rows' identity, ordering, re-indexing, and per-row error wiring. | first defined: Chapter 045 L4
field.id | - | Stable render key RHF assigns each field-array row; survives reorder/removal, used as the React key, never persisted. | first defined: Chapter 045 L4
fields (RHF) | - | Render-time snapshot array useFieldArray returns; each entry carries field.id plus values, not the live value. | first defined: Chapter 045 L4
field-array operations | append, prepend, insert, remove, swap, move, replace | The imperative API useFieldArray returns to mutate the array; each also re-indexes and migrates per-row field state. | first defined: Chapter 045 L4
getValues | form.getValues | RHF call reading current field values once without subscribing; for reads inside event handlers. | first defined: Chapter 045 L4
root error | errors.<name>.root | Error attached to a whole array field rather than any element; array rules like .min(1) report here, not at .message. | first defined: Chapter 045 L4
reconcile (line items) | - | Compute INSERT/UPDATE/DELETE writes by diffing the submitted list against the rows currently in the database. | first defined: Chapter 045 L4
FormProvider | - | RHF context provider wrapping the steps once at the root; publishes the useForm instance to every descendant, no props threaded. | first defined: Chapter 045 L5
useFormContext | - | Hook a descendant calls to read the useForm instance an ancestor FormProvider published; the consumer side of FormProvider. | first defined: Chapter 045 L5
trigger (RHF) | form.trigger | RHF call running the resolver against named field paths, returning Promise<boolean>; no argument validates the whole form. | first defined: Chapter 045 L5
shouldUnregister | - | RHF useForm option; whether a field's value is dropped when its input unmounts. Defaults to false (values kept), the safe wizard default. | first defined: Chapter 045 L5
isValid (RHF) | formState.isValid | Whole-form boolean, true only once every field passes; wrong tool for gating a single wizard step. | first defined: Chapter 045 L5
progressive disclosure | - | Revealing sections of one form inline as the user goes, behind a single native submit; keeps progressive enhancement. | first defined: Chapter 045 L5
BFF | Backend-for-Frontend | Thin server-side endpoint that proxies/aggregates third-party services for your own frontend, wearing your app's auth. | first defined: Chapter 046 L1
mutator | pure mutator, shared mutator | Pure /lib function taking parsed typed input, doing the db work, returning the entity; no Request/Response/FormData; shared by an action and a handler. | first defined: Chapter 046 L2
422 Unprocessable Entity | 422 | Status for a request that parsed as valid JSON but failed the schema. | first defined: Chapter 046 L2
extension member | Problem extension member | A custom field on a Problem Details body beyond the five core members; here errors carries per-field validation messages. | first defined: Chapter 046 L2
RouteContext | - | Next.js-generated helper type, keyed by route path, typing a handler's context argument (params etc.) from the URL segments. | first defined: Chapter 046 L2
trigram index | - | Index breaking each value into overlapping three-char n-grams so Postgres serves leading-wildcard ILIKE fast. | first defined: Chapter 046 L4
five-seam action shape | five seams (action), five-seam shape | A Server Action's five ordered stages: parse, authorize, mutate, revalidate, return a Result. | first defined: Chapter 047 L1
auth stub | getActiveContext stub | A placeholder returning the seeded org and user, marking where real auth drops in; reads no cookie. | first defined: Chapter 047 L1
network boundary | - | The client/server divide a Server Action call crosses; React serializes the args over the network. | first defined: Chapter 047 L2
native select | NativeSelect | Thin wrapper over a plain `<select>`; submits with the form and works with no JS, unlike Radix's div-tree Select. | first defined: Chapter 047 L2
island | island component | A small Client Component embedded in server-rendered HTML; an interactive island hydrated on its own. | first defined: Chapter 047 L6
audit log | audit-log | Append-only record of who did what and when; one row per significant action, for accountability. | first defined: Chapter 047 L6
database trigger | BEFORE DELETE trigger | A function Postgres runs automatically on insert/update/delete; BEFORE DELETE fires before the delete and can abort it. | first defined: Chapter 047 L6
deliverability | - | Likelihood a sent email reaches the inbox, not spam or a bounce. | first defined: Chapter 048 L1
Resend | - | Developer-focused transactional email provider; the course default. | first defined: Chapter 048 L1
ESP | email service provider | A company that sends email on your behalf. | first defined: Chapter 048 L1
transactional email | transactional mail | Email triggered by a user action, carrying info the user expects. | first defined: Chapter 048 L1
DX | developer experience | How quickly and pleasantly a developer gets productive with a tool. | first defined: Chapter 048 L1
apex domain | bare domain, root domain | Root domain with no subdomain prefix (yourapp.com). | first defined: Chapter 048 L1
DNS propagation | - | Delay before a new DNS record is visible to resolvers worldwide. | first defined: Chapter 048 L1
least privilege | - | Grant a credential only the permissions its job needs, no more. | first defined: Chapter 048 L1
key rotation | rotate key | Replacing a credential with a fresh one and revoking the old, no downtime. | first defined: Chapter 048 L1
local part | - | The portion of an email address before the @ sign. | first defined: Chapter 048 L1
reply-to | replyTo | Email header routing Reply to a different mailbox than the From address. | first defined: Chapter 048 L1
SMTP | - | Protocol mail servers use to hand email to one another. | first defined: Chapter 048 L1
mailbox provider | - | Service running a recipient's inbox; decides if mail lands (Gmail, Outlook). | first defined: Chapter 048 L1
sender reputation | reputation | A mailbox provider's trust score for a sending domain/IP, from delivery history. | first defined: Chapter 048 L1
hard bounce | - | Permanent delivery failure: address doesn't exist or refuses mail. | first defined: Chapter 048 L1
SPF | Sender Policy Framework | Published list of servers allowed to send mail for a domain; checks the envelope MAIL FROM. | first defined: Chapter 048 L2
DKIM | DomainKeys Identified Mail | Cryptographic signature proving a message was authorized and unaltered. | first defined: Chapter 048 L2
DMARC | - | Policy tying a passing SPF/DKIM check to the visible From address, with reporting. | first defined: Chapter 048 L2
envelope sender | MAIL FROM | Hidden return-path address from the SMTP transaction; distinct from the visible From. | first defined: Chapter 048 L2
include mechanism | include | SPF mechanism delegating to another domain's SPF record, inheriting its IPs. | first defined: Chapter 048 L2
softfail | ~all | SPF result: probably unauthorized, but deliver anyway and note it. | first defined: Chapter 048 L2
hardfail | -all | SPF result: definitely unauthorized, treat as a failure. | first defined: Chapter 048 L2
keypair | - | Matched private (signs) and public (verifies) keys; public never forges. | first defined: Chapter 048 L2
MTA | mail transfer agent | Server software that relays email between systems. | first defined: Chapter 048 L2
DKIM selector | selector | Label naming which DKIM public key to use, published at a subdomain. | first defined: Chapter 048 L2
alignment | - | DMARC requirement that a passing SPF/DKIM check match the visible From domain. | first defined: Chapter 048 L2
one-click unsubscribe | RFC 8058 | Standard letting a mailbox provider unsubscribe a user in one tap; required for marketing mail. | first defined: Chapter 048 L2
BIMI | Brand Indicators for Message Identification | Standard displaying a brand's logo beside its authenticated mail. | first defined: Chapter 048 L2
Verified Mark Certificate | VMC | Certificate tying a BIMI logo to a registered trademark, required by some providers. | first defined: Chapter 048 L2
CAN-SPAM | - | US anti-spam law requiring marketing mail to carry a working one-click unsubscribe. | first defined: Chapter 048 L3
dedicated IP | - | A sending IP used by one sender alone; starts at zero reputation and needs steady volume to warm up. | first defined: Chapter 048 L3
shared IP pool | shared pool | A provider's IP range shared across customers, kept warm collectively; the early-stage default. | first defined: Chapter 048 L3
complaint | spam complaint | A recipient clicking "report spam"; routed back to the sender via an FBL, the costliest reputation signal. | first defined: Chapter 048 L4
soft bounce | - | Temporary delivery failure (mailbox full, server hiccup, greylisted); may succeed on retry. | first defined: Chapter 048 L4
greylisted | greylisting | Anti-spam tactic temporarily rejecting unknown-sender mail, expecting a legitimate retry. | first defined: Chapter 048 L4
Feedback Loop | FBL | Agreement forwarding a recipient's "report spam" click back to the sender so they can stop mailing them. | first defined: Chapter 048 L4
single writer, many readers | single-writer | Pattern where one component inserts rows into a table and everything else only reads and branches on them. | first defined: Chapter 048 L4
failing open | fail open | A safety check that, when it errors, lets the operation proceed; defaults to yes. | first defined: Chapter 048 L4
fail closed (access gate) | failing closed | A safety gate that, when the check itself errors, refuses the operation; the senior default for access control. | first defined: Chapter 048 L4
complaint rate | - | Share of delivered mail recipients mark as spam; the top reputation metric, with hard provider thresholds. | first defined: Chapter 048 L4
postmaster tools | Google Postmaster Tools | Free provider dashboards showing a sender their own reputation: complaint rate, spam rate, auth status. | first defined: Chapter 048 L4
throttled (deliverability) | throttling | A provider deliberately slowing or limiting how much of a sender's mail it accepts, as a reputation penalty. | first defined: Chapter 048 L4
React Email | react-email | React library for authoring email templates in JSX/Tailwind that render to inbox-safe HTML; the course default. | first defined: Chapter 049 L1
2004-shaped HTML | - | The HTML-4, table-layout, inline-styles baseline the worst email client still requires. | first defined: Chapter 049 L1
React Email primitive | email primitive | A React Email component that is the email-safe version of a known web element (Section, Button, Img, etc.). | first defined: Chapter 049 L1
MJML | Mailjet Markup Language | XML-like email templating language compiling to bulletproof table HTML; the pre-React-era Outlook-compat tool. | first defined: Chapter 049 L1
plain-text part | text part | The text/plain version of an email carried alongside the HTML for clients that won't render HTML. | first defined: Chapter 049 L1
multipart/alternative | - | MIME container holding text/plain and text/html of one message so the client picks which to render. | first defined: Chapter 049 L1
bulletproof button | - | A CTA built from table cells plus a VML fallback so its fill/padding/shape survive every mailbox client. | first defined: Chapter 049 L1
VML | Vector Markup Language | Legacy Microsoft vector format; bulletproof buttons emit a hidden VML shape so Outlook renders the fill. | first defined: Chapter 049 L1
preheader | - | The short preview line an inbox shows next to the subject, set via a hidden Preview element. | first defined: Chapter 049 L1
pixelBasedPreset | - | React Email Tailwind preset re-basing rem utilities onto a 16px pixel scale for clients that ignore rem. | first defined: Chapter 049 L1
PreviewProps | - | Static property on a template holding mock props; the preview server auto-renders the template with them. | first defined: Chapter 049 L1
preview server | - | Local React Email dev server (pnpm email dev) that renders templates from PreviewProps and hot-reloads on save; the fast inner loop. | first defined: Chapter 049 L2
test-send | - | A real email fired through Resend to inboxes you open; the verification gate for what no local preview can fake. | first defined: Chapter 049 L2
inner loop | - | The fast, local iterate cycle (save, preview, fix) versus the slow real-send verification gate. | first defined: Chapter 049 L2
file watcher | - | Background process watching source files and reacting instantly on change, here re-rendering the template. | first defined: Chapter 049 L2
hot-reload | hot reload, hot-reloads | The page updates in place from new source, no manual reload, watcher-pushed. | first defined: Chapter 049 L2
color inversion | - | Client-side transform flipping light backgrounds dark and dark text light, often heuristic and beyond your control. | first defined: Chapter 049 L2
SDK | software development kit | Official client library you call from app code; here the Resend SDK for sending email. | first defined: Chapter 049 L3
toPlainText | toPlainText(html) | react-email helper converting rendered HTML into clean plain text; run on render() output. | first defined: Chapter 049 L3
touch target | tap target | Tappable area around an interactive element; CTA floor 44x44 CSS px per iOS HIG. | first defined: Chapter 049 L3
dir="auto" | dir auto | HTML attribute telling the client to infer text direction from the first strong directional character. | first defined: Chapter 049 L3
partial inversion | - | Dark-mode client behavior flipping light backgrounds dark while preserving already-dark elements. | first defined: Chapter 049 L3
full inversion | - | Dark-mode client behavior inverting everything, hue-shifting brand colors and negating dark-on-light logos. | first defined: Chapter 049 L3
registrar | domain registrar | Company you bought a domain from and where you manage its DNS records. | first defined: Chapter 050 L2
TXT record | - | DNS record type holding free-form text; carries SPF, DKIM, DMARC values. | first defined: Chapter 050 L2
MX record | mail exchanger | DNS record naming the mail server for a domain; here routes bounce/complaint reports to Resend. | first defined: Chapter 050 L2
dig | - | Command-line DNS lookup tool printing the raw records a resolver returns. | first defined: Chapter 050 L2
chokepoint | - | The single function every email passes through, where shared send disciplines live; a named side-effect seam. | first defined: Chapter 050 L3
pure renderer | pure-renderer discipline | Template taking typed props in and returning HTML/text out, with no env, session, or database reads, so preview and production never diverge. | first defined: Chapter 050 L4
authentication | authn | Verifying the identity behind a request and producing a verified principal. | first defined: Chapter 051 L1
authorization | authz | Deciding whether an authenticated principal may perform a specific action on a specific resource. | first defined: Chapter 051 L1
principal | - | The authenticated identity a request runs as; concretely a verified user row. | first defined: Chapter 051 L1
identification | - | An unverified claim of identity, with no proof yet. | first defined: Chapter 051 L1
authentication factor | factor | A category of identity proof: something you know, have, or are. | first defined: Chapter 051 L1
resource | - | The specific thing an action targets (this invoice, this org), not a category. | first defined: Chapter 051 L1
action boundary | - | The server-side entry point of a mutation where authorization is enforced. | first defined: Chapter 051 L1
fresh session | elevated session | A session whose most recent proof of identity is recent enough to clear high-stakes actions. | first defined: Chapter 051 L1
passkey | - | Device-bound credential signing a server challenge with a private key the device never reveals. | first defined: Chapter 051 L1
RBAC | role-based access control | Authorization driven by the principal's role rather than per-user rules. | first defined: Chapter 051 L1
session record | server-stored session | A server-side row mapping an opaque session ID to a user and metadata; the source of truth the browser only holds an ID for. | first defined: Chapter 051 L2
opaque session | server-stored opaque session | Session shape where the cookie holds a random lookup handle, not data; one indexed DB read per request, instantly revocable. | first defined: Chapter 051 L2
session fixation | - | Attacker pre-plants a known session ID before sign-in so the authenticated session is one they know; defended by regenerating the token at sign-in. | first defined: Chapter 051 L2
signed is not encrypted | - | A signature proves a payload wasn't altered and came from the key holder; it does not hide the contents. | first defined: Chapter 051 L2
sliding session | sliding lifetime, sliding renewal | Session whose expiry window resets on activity rather than at a fixed time from issue. | first defined: Chapter 051 L2
denylist | revoked-token denylist | List of revoked JWTs checked per request to fake revocation; re-introduces the DB read statelessness was meant to avoid. | first defined: Chapter 051 L2
refresh token | - | Long-lived server-side token used to mint fresh short-lived access tokens; revocable, unlike the access token. | first defined: Chapter 051 L2
access token | - | Short-lived (5-15 min) token authorizing requests; in the hybrid pattern, rotated via a refresh token. | first defined: Chapter 051 L2
OAuth | Open Authorization | Delegated-authorization protocol letting an app act on a user's behalf at a service without seeing their password. | first defined: Chapter 051 L3
OIDC | OpenID Connect | Authentication layer on top of OAuth; adds the id_token and userinfo so the app learns who the user is. | first defined: Chapter 051 L3
authorization-code flow | authorization code flow, auth code flow | OAuth flow that returns a one-time code via the browser, then exchanges it server-side for tokens. | first defined: Chapter 051 L3
PKCE | Proof Key for Code Exchange, pixy | Binds a flow's start to its finish so a stolen authorization code can't be redeemed without the original secret; mandatory in OAuth 2.1. | first defined: Chapter 051 L3
code verifier | - | High-entropy random secret the app keeps; its hash goes out, the verifier itself closes the PKCE loop on the back channel. | first defined: Chapter 051 L3
code challenge | - | SHA-256 hash of the code verifier, sent on the front channel; the provider re-hashes the verifier against it. | first defined: Chapter 051 L3
authorization code | code | One-time, short-lived code returned via the browser, exchanged on the back channel for tokens. | first defined: Chapter 051 L3
front channel | - | Any path through the browser (redirects, URLs); visible in history, logs, and to extensions, so untrusted by default. | first defined: Chapter 051 L3
back channel | - | Direct server-to-server HTTPS call with no browser in the middle; safe to carry secrets. | first defined: Chapter 051 L3
resource owner | - | The human who owns the data and grants access; in a login flow, the person signing in. | first defined: Chapter 051 L3
authorization server | - | Provider endpoint that authenticates the user and issues the code and tokens (e.g. accounts.google.com). | first defined: Chapter 051 L3
resource server | - | The API a token unlocks; for a pure login, just the userinfo profile endpoint. | first defined: Chapter 051 L3
consent screen | - | Provider screen showing the user exactly the scopes requested, where they pick an account and approve. | first defined: Chapter 051 L3
redirect URI | redirect_uri | Pre-registered callback URL the provider returns the code to; matched by exact string, no wildcards. | first defined: Chapter 051 L3
client secret | client_secret | Back-channel credential proving the app's identity during the token exchange; one per environment, never in the browser. | first defined: Chapter 051 L3
OAuth scope | scope | What an OAuth request asks for (e.g. openid email profile); shown verbatim on the consent screen. | first defined: Chapter 051 L3
OAuth state | state parameter | Random per-flow value echoed on the callback and checked, defending login CSRF. | first defined: Chapter 051 L3
login CSRF | - | Attacker tricks a victim into completing a flow with the attacker's code, linking the attacker's identity onto the victim's account; blocked by state. | first defined: Chapter 051 L3
id_token | - | Signed OIDC JWT carrying identity claims (sub, email, ...); must be signature/aud/iss/exp verified before trust. | first defined: Chapter 051 L3
JWKS | JSON Web Key Set | Provider's published public keys, used to verify an id_token's signature without contacting it per request. | first defined: Chapter 051 L3
implicit grant | - | Removed OAuth grant that returned the token directly in the URL fragment on the front channel. | first defined: Chapter 051 L3
client credentials | - | Service-to-service OAuth grant with no human involved; not a login flow. | first defined: Chapter 051 L3
device code | - | OAuth grant for input-constrained devices like a TV. | first defined: Chapter 051 L3
Resource Owner Password Credentials | ROPC | Removed OAuth grant where the user typed their password into the third-party app. | first defined: Chapter 051 L3
catch-all route | [...all] route, catch-all segment | Next.js dynamic segment matching every path beneath it; one file handles every URL under the prefix. | first defined: Chapter 052 L1
Better Auth server instance | auth instance, server instance | The betterAuth() object holding all server-side auth config (database, secret, plugins); called directly in server code. | first defined: Chapter 052 L1
Better Auth client | authClient, browser client | createAuthClient() typed wrapper React components call; each method is an HTTP call to the catch-all route. | first defined: Chapter 052 L1
database adapter | adapter | Layer mapping a library's storage calls onto a specific database/ORM; Better Auth's Drizzle adapter emits Drizzle queries. | first defined: Chapter 052 L1
Better Auth plugin | plugin | Module extending the auth instance's behavior; nextCookies() attaches Set-Cookie headers to Server Action responses. | first defined: Chapter 052 L1
nextCookies | nextCookies() | Better Auth Next.js plugin attaching Set-Cookie headers to Server Action responses; must be last in the plugins array. | first defined: Chapter 052 L1
cookie cache | - | Optional Better Auth feature storing a signed session copy in the cookie so common reads skip the DB lookup. | first defined: Chapter 052 L1
secret rotation | BETTER_AUTH_SECRETS | Rolling in a new signing secret (comma-separated list) without invalidating every existing session at once. | first defined: Chapter 052 L1
trustedOrigins | - | Better Auth's CSRF allowlist; defaults to the baseURL origin, widened only for a cross-origin client. | first defined: Chapter 052 L1
toNextJsHandler | - | Better Auth helper turning the instance into Next.js route handlers; export const { GET, POST } = toNextJsHandler(auth). | first defined: Chapter 052 L1
namespace import | import * as | Import pulling every export of a module under one object (schema.user, schema.session). | first defined: Chapter 052 L2
CLI | command-line tool | A program run in the terminal with flags and arguments rather than in the browser. | first defined: Chapter 052 L2
scrypt | - | Deliberately slow password-hashing function; slowness makes brute-forcing stolen hashes expensive. | first defined: Chapter 052 L2
magic link | magic-link sign-in | Sign-in by clicking a one-time emailed link, no password typed. | first defined: Chapter 052 L2
discriminator (DB column) | provider discriminator | A column whose value says which kind a row is (account.providerId: credential vs google). | first defined: Chapter 052 L2
expiresIn | absolute lifetime | Better Auth session knob: the hard wall after which a session is dead regardless of activity (course sets 30 days). | first defined: Chapter 052 L3
updateAge | sliding renewal | Better Auth session knob: how stale before a request pushes expiresAt out by another full window (course keeps 1 day). | first defined: Chapter 052 L3
freshAge | freshness window | Better Auth session knob: how long after createdAt a session counts as fresh for high-stakes actions (course sets 10 min). | first defined: Chapter 052 L3
bearer credential | - | Any credential granting access just by being presented, with no further identity proof; a session token is one. | first defined: Chapter 052 L3
session data cookie | cookie cache cookie | Sibling …session_data cookie holding a signed snapshot of {user, session} so reads skip the DB; the cookie cache's storage. | first defined: Chapter 052 L3
opaque session token | session token | Random meaningless id in the session cookie; the server looks it up to find the session row. | first defined: Chapter 052 L4
auth.api.getSession | getSession | Server-side Better Auth call reading {user, session} | null from request headers, in-process. | first defined: Chapter 052 L4
getSessionCookie | - | better-auth/cookies helper checking only whether a session cookie is present, no decode or DB. | first defined: Chapter 052 L4
authClient.useSession | useSession | Reactive Better Auth browser hook returning {data, isPending, error}; display only, never for gating. | first defined: Chapter 052 L4
getCurrentUser | - | Helper returning the session user or null; the safe server read. | first defined: Chapter 052 L4
requireUser | - | Helper returning the user or redirecting to /sign-in; the assertive server read. | first defined: Chapter 052 L4
salt | password salt | Per-password random value mixed in before hashing so equal passwords yield different stored hashes; handled by the library. | first defined: Chapter 053 L1
APIError | - | Better Auth's typed error thrown by auth.api.* calls on genuine failure; carries body.code and status. | first defined: Chapter 053 L1
user enumeration | account enumeration | Attack abusing differing responses to learn which emails/usernames have accounts. | first defined: Chapter 053 L1
credential stuffing | - | Replaying leaked username/password pairs from other breaches against a login, betting on password reuse. | first defined: Chapter 053 L1
k-anonymity | k-anonymity lookup | Range-query technique checking a password against breach lists by sending only a short hash prefix, never the password. | first defined: Chapter 053 L1
Argon2id | argon2 | Memory-hard password-hashing algorithm, PHC winner; the usual scrypt alternative when a standard mandates it. | first defined: Chapter 053 L1

constant time | constant-time comparison | Comparison taking the same time whether the secret matches or not, so response timing leaks nothing about the password. | first defined: Chapter 053 L2
two-factor authentication | 2FA, second factor | A second proof of identity demanded after the password, typically a time-based authenticator code; routes sign-in to a 'requires-second-factor' continuation. | first defined: Chapter 053 L2
per-IP rate limit | rate limiter | Cap on requests per IP per window; Better Auth ships it on auth endpoints (sign-in ~3/10s), on in prod, off in dev. | first defined: Chapter 053 L2
per-account rate limit | per-email lockout | Failed-attempt cap keyed to the account, not the IP; not in core Better Auth, you add it to catch IP-rotation against one account. | first defined: Chapter 053 L2
safeNext | - | Helper validating ?next= against an allowlist (same-site /path only) before redirect, closing the open redirect. | first defined: Chapter 053 L2

passwordless | passwordless sign-in | Sign-in with no stored password; proves identity via a delivered secret (magic link, OTP) instead of a remembered one. | first defined: Chapter 053 L5
OTP | one-time password, emailOTP | Short single-use code, valid only briefly, emailed for the user to type back; magic link's typed twin. | first defined: Chapter 053 L5
device-pinning | sameBrowser pinning | Hand-rolled restriction making a magic link work only in the browser that requested it, via a paired cookie; not a magicLink() option. | first defined: Chapter 053 L5
disableSignUp | - | magicLink() option; false (default) lets a first-time email create an account on the click, true restricts to existing users. | first defined: Chapter 053 L5
storeToken | storeToken: 'hashed' | magicLink() option; defaults to 'plain' (raw token in the verification row), set to 'hashed' so a leaked row holds no working link. | first defined: Chapter 053 L5
TOTP | time-based one-time password, RFC 6238 | 6-digit code from a shared secret + current 30s time window, recomputed each window; never sent, computed in parallel on both ends. | first defined: Chapter 053 L6
shared secret | TOTP secret | Random ~160-bit value known to server and authenticator app, fixed at setup; seeds every code and never travels after enrollment. | first defined: Chapter 053 L6
base32 | - | Encoding using 32 letters/digits, chosen so a value is easy to type by hand and survives a QR scan. | first defined: Chapter 053 L6
clock skew | clock drift | Small gap between two clocks meant to agree; here, phone vs server, absorbed by a ±1 TOTP window. | first defined: Chapter 053 L6
KMS | Key Management Service | Managed vault holding encryption keys, performing encrypt/decrypt without exposing the raw key to your app. | first defined: Chapter 053 L6
elevation (auth) | re-authentication, requires-re-authentication | Re-proving you own the account before a high-stakes change, even with a live session; guards against a stale or borrowed session. | first defined: Chapter 053 L6
recovery codes | backup codes | One-time fallback codes shown once at enrollment, stored hashed; let a user back in when the authenticator is gone. | first defined: Chapter 053 L6
single-use | one-time | Usable exactly once; consumed and removed from the set on success so it can never be replayed. | first defined: Chapter 053 L6
step-up | step-up authentication | Requiring a fresh auth challenge for a specific sensitive action, regardless of how recently the user signed in. | first defined: Chapter 053 L6
SIM swap | SIM swapping | Attacker convinces a carrier to move a victim's number to their SIM, intercepting calls and SMS one-time codes. | first defined: Chapter 053 L6

WebAuthn | Web Authentication API | W3C standard for public-key auth in the browser; exposes navigator.credentials, the library wraps it. | first defined: Chapter 053 L7
FIDO2 | - | FIDO Alliance umbrella spec WebAuthn implements; same passkey machinery under another name. | first defined: Chapter 053 L7
relying party | RP, rpID owner | The site a credential belongs to (your SaaS server); stores public keys, issues challenges, scoped by rpID. | first defined: Chapter 053 L7
authenticator | platform authenticator, roaming authenticator | Hardware/software holding the private key, unlocked by a local gesture; built in (platform) or separate like a YubiKey (roaming). | first defined: Chapter 053 L7
secure enclave | - | Isolated hardware region storing private keys and signing without ever exporting them; Apple Secure Enclave, TPM, YubiKey chip. | first defined: Chapter 053 L7
attestation | - | Signed statement from the authenticator vouching for its device type; library verifies it, most apps don't inspect further. | first defined: Chapter 053 L7
public-key cryptography | asymmetric crypto, keypair | Keypair where the private key signs and the public key verifies; publish the public key, only the private key produces valid signatures. | first defined: Chapter 053 L7
rpID | relying party ID | Better Auth/WebAuthn config naming the domain a passkey is bound to; must equal the app's registrable domain or sign-in silently fails. | first defined: Chapter 053 L7
assertion (WebAuthn) | passkey assertion | The signed sign-in response: the authenticator's signature over the server challenge, verified against the stored public key. | first defined: Chapter 053 L7
resident key | discoverable credential | Passkey the authenticator stores in full, offered without the site first naming an account; powers one-tap autofill sign-in. | first defined: Chapter 053 L7
conditional mediation | conditional UI, autoFill | Browser feature surfacing passkeys inside an input's autofill dropdown; navigator.credentials.get with mediation: 'conditional'. | first defined: Chapter 053 L7
NotAllowedError | - | DOMException thrown when a WebAuthn ceremony is cancelled or no eligible credential exists; usually benign. | first defined: Chapter 053 L7
phishing-resistant | - | Credential a look-alike site can't capture and replay, because release is gated on the request origin matching the registered one. | first defined: Chapter 053 L7
synced passkey | multiDevice passkey | Passkey replicated across devices by a cloud keychain (iCloud, Google, 1Password); recovers on device loss, security rides on the cloud account. | first defined: Chapter 053 L7
device-bound passkey | singleDevice passkey | Passkey pinned to one piece of hardware that never leaves it; uncopyable, but lost with the device, no cloud recovery. | first defined: Chapter 053 L7
single point of failure | SPOF | Component whose failure takes down the whole system because nothing else can stand in for it. | first defined: Chapter 053 L7
socialProviders | social provider config | Better Auth block keyed by provider name (google, github…) wiring clientId/clientSecret onto the auth instance; built-in providers need no plugin. | first defined: Chapter 053 L8
find-or-create lookup | - | The fixed-order decision Better Auth runs at the OAuth callback: match by provider identity, else by email, else create a new user/account. | first defined: Chapter 053 L8
account-not-linked | - | Refusal returned when an OAuth email matches an existing account but the provider isn't trusted, rather than auto-merging on an unverified claim. | first defined: Chapter 053 L8
trusted provider | trusted provider list | Provider you explicitly name as allowed to link onto an existing account on an email match; no default, so unconfigured same-email logins refuse. | first defined: Chapter 053 L8
enterprise SSO | - | A customer's IT pointing its whole company at its own identity provider (Okta, Entra) via SAML or OIDC; a different shape from consumer social sign-in. | first defined: Chapter 053 L8
identity provider | IdP | The system holding employee accounts that authenticates them for every app a company uses; the IdP in enterprise SSO. | first defined: Chapter 053 L8
SAML 2.0 | SAML | XML-based enterprise SSO protocol predating OIDC; the IdP asserts identity via a signed XML document instead of OAuth tokens. | first defined: Chapter 053 L8
encryptOAuthTokens | - | Better Auth account knob (defaults false) that encrypts stored provider tokens at rest; flip it on whenever you persist tokens. | first defined: Chapter 053 L8
accessType offline | - | Google socialProviders knob that makes Google issue a refresh token; only needed if you call Google's API on the user's behalf. | first defined: Chapter 053 L8
mapProfileToUser | - | socialProviders seam running before the user row is created, remapping provider profile fields (e.g. name into firstName/lastName). | first defined: Chapter 053 L8
databaseHooks.user.create.after | - | Global Better Auth hook firing once when a new user row is created; the seam for OAuth-sign-up side-effects like the welcome email. | first defined: Chapter 053 L8
linkSocial | - | Better Auth client call requesting more scopes from a provider incrementally, after sign-in, when the user opts into a feature. | first defined: Chapter 053 L8
genericOAuth | genericOAuth plugin | Better Auth plugin for providers it doesn't ship built-in; same config shape but you supply the authorize, token, and userinfo URLs. | first defined: Chapter 053 L8
account linking | linking | Attaching a second credential (OAuth provider or password) to an existing user by inserting another account row at the same userId. | first defined: Chapter 053 L9
user table (Better Auth) | user row | The table holding the human: id, name, canonical email, emailVerified; one row per person. | first defined: Chapter 053 L9
account table (Better Auth) | account row | Better Auth table holding one proof-of-identity per row (password hash or OAuth provider link); many rows can point at one user. | first defined: Chapter 053 L9
accountId (Better Auth) | provider account id | The provider's stable opaque id for the user (OIDC sub); survives email changes, safe to log. | first defined: Chapter 053 L9
accountLinking config | - | Better Auth account-key object: enabled, trustedProviders, allowDifferentEmails; controls how credentials attach to a user. | first defined: Chapter 053 L9
allowDifferentEmails | - | accountLinking knob (defaults false) letting a provider link when its email differs from the account's; loses the email-match trust signal. | first defined: Chapter 053 L9
linkSocial (link) | - | Better Auth client call starting the OAuth round-trip to attach a provider to the signed-in user from settings. | first defined: Chapter 053 L9
unlinkAccount | - | Better Auth client call deleting an account row to disconnect a provider; rejects removing the last sign-in method. | first defined: Chapter 053 L9
UNABLE_TO_UNLINK_LAST_ACCOUNT | last-method guard | Better Auth refusal when unlinking would remove a user's only sign-in method; catch it and route to add-password. | first defined: Chapter 053 L9
allowUnlinkingAll | - | accountLinking knob (defaults false) that disables last-method protection; leaving it on can ship a lockout generator. | first defined: Chapter 053 L9
canonical email | user.email | The single address on the user row used for outbound mail, profile display, and audit identity; distinct from per-account emails. | first defined: Chapter 053 L9
domain takeover | - | Attacker gains control of an email domain and stands up provider accounts on its addresses, faking 'this provider owns ada@acme.com'. | first defined: Chapter 053 L9
pre-account takeover | - | Account-takeover class where email-password and OAuth share an email identifier and the link goes through on an unverified email. | first defined: Chapter 053 L9
optimistic check | - | A cheap, possibly-stale check traded for speed, backed by an authoritative check later; here the proxy's cookie-presence read. | first defined: Chapter 054 L1
matchall-minus-public | matchall-minus | Matcher strategy running on every route then carving out public paths, so a forgotten route fails closed (locked, not leaked). | first defined: Chapter 054 L1
protected route | - | Route a signed-out user is bounced away from; the proxy redirects and a validating session read confirms a real session behind the cookie. | first defined: Chapter 054 L2
revokeOtherSessions | - | changePassword option (defaults false) deleting every session except the one making the request; the flag that makes a password change a real rotation. | first defined: Chapter 054 L2
session rotation | rotate the session | Minting a brand-new session on every real sign-in so the post-sign-in session is unknown to any attacker; what defeats session fixation. | first defined: Chapter 054 L2
setPassword | - | Server-only Better Auth call that adds a missing 'credential' account row (vs changePassword which rotates an existing one); for OAuth-only users. | first defined: Chapter 054 L2
user agent | userAgent | The browser's self-reported identity string; client-controlled, so display-only, never a security input. | first defined: Chapter 054 L3
GeoIP | geo-IP, IP geolocation | Approximate city-level geographic lookup from an IP address, never a precise point. | first defined: Chapter 054 L3
eventually consistent | eventual consistency | A change that is guaranteed to take effect, but after a propagation window, not instantly. | first defined: Chapter 054 L3
database hooks | database hook | Better Auth callbacks firing around its own DB writes (e.g. after a new session row is created). | first defined: Chapter 054 L3
server-trusted read | - | A read whose value rests on the server being the source of truth; must run server-side, never rebuilt from tamperable client state. | first defined: Chapter 054 L3
revokeSession | - | Better Auth call deleting one named session keyed on its token; the device signs out, you stay. | first defined: Chapter 054 L3
revokeSessions | - | Better Auth call deleting every session including the current one; clears this cookie too, so you sign out here. | first defined: Chapter 054 L3
multiSession | multiSession() | Better Auth plugin letting one browser hold sessions for several accounts at once (the account-switcher); opposite axis to per-device sessions. | first defined: Chapter 054 L3
React auto-escaping | auto-escaping, JSX escaping | React converts HTML-significant chars in every {value} to inert entities, so interpolated input renders as text not markup; the default XSS defense. | first defined: Chapter 054 L4
dangerouslySetInnerHTML | - | React prop injecting a string into the DOM as raw HTML, bypassing auto-escaping; an XSS hole unless the input is sanitized server-side first. | first defined: Chapter 054 L4
DOMPurify | isomorphic-dompurify | HTML sanitizer stripping executable content via an allowlist; the 2026 standard, run server-side before dangerouslySetInnerHTML. | first defined: Chapter 054 L4
synchronizer token | - | Classic CSRF defense: server plants a secret in the page, the form echoes it back, the server checks the match; unneeded under SameSite=Lax. | first defined: Chapter 054 L4
two-layer gate | two-layer request-time gate | Protected-route guard: a cheap cookie-presence redirect in proxy.ts plus a validating session read in the protected layout. | first defined: Chapter 054 L1
inverse gate | - | The mirror of the protected-route gate: on an auth page, a signed-in user is bounced to /dashboard while a signed-out user sees the form. | first defined: Chapter 054 L1
emailAndPassword | emailAndPassword block | Better Auth instance block enabling the password strategy and its knobs; presence of it emits the account password column. | first defined: Chapter 055 L2
requireEmailVerification | - | Better Auth emailAndPassword knob: sign-up creates the account but issues no session until the email is verified. | first defined: Chapter 055 L2
autoSignIn | - | Better Auth emailAndPassword knob; false means sign-up issues no session, and a duplicate email returns generic success (enumeration-safe). | first defined: Chapter 055 L2
minPasswordLength | - | Better Auth emailAndPassword knob setting the server-side minimum password length; pairs with the action's schema check. | first defined: Chapter 055 L2
auth-schema generator config | auth-schema.config.ts | A server-only-free mirror of lib/auth.ts holding only schema-shaping options, loaded by the Better Auth CLI to generate the Drizzle schema. | first defined: Chapter 055 L2
verification table | verification row | Better Auth schema table holding short-lived token rows; the JWT-link email-verification flow leaves it empty (the token rides the URL, not a row). | first defined: Chapter 053 L1
emailVerification | emailVerification block | Better Auth instance block configuring the email-verification flow: the send callback, sendOnSignUp, autoSignInAfterVerification, and the link's expiresIn. | first defined: Chapter 055 L3
sendVerificationEmail | - | emailVerification callback Better Auth invokes with the user and built verify URL; you hand both to sendEmail. | first defined: Chapter 055 L3
sendOnSignUp | - | emailVerification knob firing the verification email automatically when sign-up succeeds. | first defined: Chapter 055 L3
autoSignInAfterVerification | - | emailVerification knob that signs the user in when they follow the link, issuing the flow's first session and cookie. | first defined: Chapter 055 L3
signInEmail | auth.api.signInEmail | Better Auth call that checks credentials and, with requireEmailVerification on, validates the password first then throws EMAIL_NOT_VERIFIED. | first defined: Chapter 055 L4
mapAuthError | - | Provided helper turning Better Auth error codes into a typed Result; collapses wrong-email and wrong-password into one opaque unauthorized message. | first defined: Chapter 055 L4
enumeration oracle | - | A response difference (e.g. distinct sign-in errors) letting an attacker learn which emails are registered, one request at a time. | first defined: Chapter 055 L4
typedRoutes | typedRoutes: true, as Route | Next.js flag typing redirect()/Link against routes that exist; a runtime string needs an `as Route` cast, safe only behind a path guard. | first defined: Chapter 055 L4
read ladder | session-read ladder | The three-helper session read surface (cache()d getSession, getCurrentUser, requireUser); one deduped DB read per request, many consumers. | first defined: Chapter 055 L2
revocation | revoke | Killing a session early by deleting its opaque row, so the cookie value resolves to nothing on the next read; instant with server-stored sessions. | first defined: Chapter 054 L3
active org | activeOrganizationId, active organization | The one org a session is operating inside right now; a nullable column on the session row, rewritten in place on switch. | first defined: Chapter 056 L1
org slug | organization slug | A URL-safe lowercase identifier for an org (the acme in /o/acme/dashboard); user-chosen, uniqueness-checked. | first defined: Chapter 056 L1
tenancy model | unit of tenancy | The entity an app's data and ownership are scoped to; here the organization, not the user. | first defined: Chapter 056 L1
requireOrgUser | - | Third session-read ladder rung returning {user, orgId, role}; redirects null-org users to onboarding, the only trusted source of orgId. | first defined: Chapter 056 L1
requireRole | requireRole(required) | Fail-closed role gate that throws when the actor's role is below required; callers run it for its throw and must not swallow it in a try/catch, letting authedAction convert the throw to a refusal. | first defined: Chapter 080 L1
tenant-owned table | - | A table whose every row belongs to exactly one organization, pinned by an organizationId column. | first defined: Chapter 056 L2
tenantDb | tenantDb(orgId) | Thin org-scoped wrapper around the raw Drizzle client; injects the org filter on every read and write so unscoped tenant queries can't be written. | first defined: Chapter 056 L2
table registry (tenancy) | tenant table registry, TENANT_TABLES | A single source-of-truth list of org-owned table names the type system reads to constrain the scoped client's surface. | first defined: Chapter 056 L2
mapped type | - | A TS type built by mapping over a union of keys ([K in Union]) to generate one property per key. | first defined: Chapter 056 L2
RLS policy | policy (RLS) | Per-row boolean rule Postgres adds to every query against a table; failing rows cease to exist for that query. | first defined: Chapter 056 L3
USING (RLS) | - | A policy's read filter: rows where it is false are invisible to SELECT/UPDATE/DELETE. | first defined: Chapter 056 L4
WITH CHECK | - | A policy's write filter: rows an INSERT/UPDATE may produce; a row failing it is refused. | first defined: Chapter 056 L4
permissive policy | permissive | RLS policy mode OR-combined with other permissive policies; the default. | first defined: Chapter 056 L4
restrictive policy | restrictive | RLS policy mode AND-combined, for layering extra constraints on top of permissive ones. | first defined: Chapter 056 L4
pgPolicy | - | Drizzle table modifier declaring an RLS policy in the schema (for/to/using/withCheck). | first defined: Chapter 056 L4
crudPolicy | - | Neon-only Drizzle helper collapsing the four CRUD policies into one when read and write predicates match. | first defined: Chapter 056 L4
authenticatedRole | authenticated role | The non-owner DB role request handlers connect as; the role RLS policies apply to. | first defined: Chapter 056 L4
FORCE ROW LEVEL SECURITY | force RLS | ALTER TABLE statement extending RLS to the table owner, who otherwise bypasses policies. | first defined: Chapter 056 L4
session variable (Postgres) | app.org_id | Connection-scoped key/value read with current_setting that carries the tenant id into the policy. | first defined: Chapter 056 L3
SET LOCAL | - | Postgres command setting a config value only until the current transaction ends. | first defined: Chapter 056 L3
set_config | - | Function form of SET; third arg true makes it transaction-local; parameterizable, unlike raw SET. | first defined: Chapter 056 L4
current_setting | - | Postgres function reading a config value; second arg true returns NULL instead of erroring when unset. | first defined: Chapter 056 L4
withTenant | withTenant(orgId, fn) | Helper opening a transaction and setting app.org_id transaction-local before running the caller's work. | first defined: Chapter 056 L4
PHI | Protected Health Information | Health data regulated under HIPAA; canonical example of data whose leak is a legal event, not just an embarrassment. | first defined: Chapter 056 L3
authority gradient | cumulative roles | Roles ordered so each is a strict superset of the one below (member < admin < owner); every check is one comparison against the order. | first defined: Chapter 057 L1
stale authority | - | Trusting a role baked into the session instead of read fresh, so a demoted user keeps powers until the cookie refreshes. | first defined: Chapter 057 L1
ABAC | attribute-based access control | Access decided by attributes of the user, resource, and context, not a fixed role; the fine-grained step past RBAC. | first defined: Chapter 057 L1
roleAtLeast | roleAtLeast(have, need) | Predicate comparing a caller's role against a required floor on the authority gradient; true if at or above. | first defined: Chapter 057 L1
Role union | Role | The string-literal union of org roles ('member' | 'admin' | 'owner'). | first defined: Chapter 057 L1
privilege escalation | - | A user performing an action above their permission level (a member running an admin-only mutation). | first defined: Chapter 057 L2
privilege confusion | confused-deputy | An action runs under the wrong identity's authority, e.g. a forwarded invite accepted by the wrong account inheriting access never granted. | first defined: Chapter 058 L5
factory (function) | function factory | A function that builds and returns another function; authedAction builds a Server Action. | first defined: Chapter 057 L2
authedAction | authedAction(role, schema, fn) | The one sanctioned Server Action factory folding session, role, and schema checks into one boundary; body receives parsed input plus a ctx. | first defined: Chapter 057 L2
transport code | - | A Result error's fixed-vocabulary code (forbidden, validation, conflict) naming the category of failure for the caller. | first defined: Chapter 057 L2
domain reason | - | A code carried inside an err explaining why a specific business rule said no (e.g. 'last-owner'); produced by the body, not the wrapper. | first defined: Chapter 057 L2
authedRoute | authedRoute(role, schema, fn) | Route-handler twin of authedAction; same session/role/schema gates, but fn returns a Response and failures are HTTP statuses. | first defined: Chapter 057 L3
400 Bad Request | 400 | HTTP status for input the server can't parse (malformed JSON, a non-UUID where a UUID is required); never reaches the schema. | first defined: Chapter 057 L3
problem() helper | problem(status, detail, extras) | Project helper in lib/http/problem.ts building an RFC 9457 Problem Details Response. | first defined: Chapter 057 L3
problemFrom | problemFrom(error) | Mapper turning a Result error's code into the matching HTTP status (forbidden→403, validation→422, conflict→409, not-found→404). | first defined: Chapter 057 L3
UI gate | - | Hiding a control the caller can't use; cosmetic UX, never security. | first defined: Chapter 057 L4
security gate | - | The server-side role re-check inside the action wrapper; the gate that actually holds. | first defined: Chapter 057 L4
last-write-wins | - | Concurrent writes to one row both apply; the later one silently overwrites the earlier. | first defined: Chapter 057 L4
audit log | audit trail, audit_logs | Append-only table recording privileged actions: who did what to whom, when, from where. | first defined: Chapter 057 L5
forensic | - | After-the-fact reconstruction of what happened, who did it, and when. | first defined: Chapter 057 L5
SOC 2 | - | Security compliance attestation enterprise buyers ask vendors to pass; an audit trail is table stakes. | first defined: Chapter 057 L5
owner role | DB owner role | Privileged Postgres role exempt from forced RLS policies; runs retention/legal-retraction jobs, never request handlers. | first defined: Chapter 057 L5
iff guarantee | iff | The audit row exists if and only if the work committed; both ride one transaction. | first defined: Chapter 057 L5
logAudit | logAudit(tx, event) | Writer inserting an audit row on a Transaction handle; won't compile outside a transaction. | first defined: Chapter 057 L5
API key | api key | Opaque revocable secret an app mints for a machine caller; stored as prefix.hash, sent as Authorization: Bearer. | first defined: Chapter 057 L6
show-once | hash-and-show-once | Posture where the raw secret is returned to the minter exactly once; the DB keeps only its hash, never the secret. | first defined: Chapter 057 L6
key prefix | prefix | The public, plaintext lookup half of an API key (rsk_live_...); safe to log and list, used to find the row. | first defined: Chapter 057 L6
api-key scope | scope | Per-key capability grant (invoices:read) checked after the role gate; can only narrow a key's role, never widen it. | first defined: Chapter 057 L6
personal access token | PAT | API-key mechanism owned by a user instead of an org; acts as that user and is hard-deleted with their account. | first defined: Chapter 057 L6
additionalFields | - | Better Auth mechanism to add your own columns to a plugin-owned table via plugin config; migration and row type pick them up. | first defined: Chapter 058 L1
tokenHash | token_hash | The SHA-256 digest of the raw invitation token stored in the DB; the raw token lives only in the emailed URL. | first defined: Chapter 058 L1
canonical signing payload | signing payload | The exact byte string an HMAC is computed over (invitationId + '.' + rawToken); must be byte-for-byte identical on sign and verify sides. | first defined: Chapter 058 L2
signedInviteUrl | signedInviteUrl(id, token) | Async helper minting the accept URL and its HMAC sig; single source of truth for the URL shape the accept route verifies. | first defined: Chapter 058 L2
link unfurler | unfurler | A client or service that fetches a pasted link to draw a preview card; a silent GET, not a human click. | first defined: Chapter 058 L3
URL rewriter | link rewriter | A proxy intercepting outbound links and fetching them first (malware scan, click logging) before the user's click reaches the destination. | first defined: Chapter 058 L3
token rotation | rotate | Replacing a still-valid secret with a fresh one so any leaked or forwarded copy of the old one stops working. | first defined: Chapter 058 L4
tombstone | - | A row flipped to a dead state instead of deleted, surviving as a record that the thing existed and was ended. | first defined: Chapter 058 L4
capability URL | capability-bearing URL | A URL whose mere possession grants the ability to act; the secret rides in the URL itself. | first defined: Chapter 059 L1
organization plugin | organization() | Better Auth plugin owning the organization/member/invitation tables, the active-org session column, and setActive. | first defined: Chapter 059 L2
ROLE_RANK | role rank | Object mapping each role to an integer (member 0, admin 1, owner 2) so roleAtLeast is a >= compare. | first defined: Chapter 059 L2
getActiveMember | auth.api.getActiveMember | Better Auth call reading the active org's membership row fresh from the DB, bypassing the cookie-cached role. | first defined: Chapter 059 L2
INVITATION_TTL_SECONDS | invitation expiry constant | Module-scope constant for the seven-day invitation lifetime, fed to the plugin's invitationExpiresIn. | first defined: Chapter 059 L2
base62 | - | ID encoded with 0-9, A-Z, a-z; compact and URL-safe, not a UUID; Better Auth's id format. | first defined: Chapter 059 L3
superuser (Postgres) | superuser | Postgres role with all privileges, implicitly bypassing every RLS policy; the default postgres role. | first defined: Chapter 059 L3
facade | scoped-data facade | A single object every caller goes through, hiding the raw client behind one safe surface; tenantDb is the only tenant-scoped data path. | first defined: Chapter 059 L4
getInvitationById | unscoped read | The project's one deliberately unscoped query, run through the raw db (not tenantDb); the invitee is not yet a member, so the org is derived from the loaded row. | first defined: Chapter 059 L6
verify ladder | accept-invite ladder | Fixed-order checks (signature, row, hash, expiry, status, identity) the accept-invite page runs to pick exactly one of seven arrival surfaces. | first defined: Chapter 059 L6
tamper-evident | - | Property of a signed value where any edit (e.g. flipping the org id) breaks the signature and is detected, not honored. | first defined: Chapter 059 L5
non-extractable | non-extractable key | A CryptoKey imported with extractable=false: raw bytes can never be read back out, so a logged key object can't leak the secret. | first defined: Chapter 059 L5
list view | list-view anatomy | A list screen built from four pillars working as one state: filter, sort, search, and paginate. | first defined: Chapter 060 L1
share-and-refresh contract | - | The promise that list-view URL state survives a new tab, a refresh, a shared link, and the back button. | first defined: Chapter 060 L1
view parameters | view state | The filter/sort/search/page a URL pins; it saves the question, not a frozen snapshot of the rows. | first defined: Chapter 060 L1
parser builder (nuqs) | parseAs* | A nuqs function declaring one URL param's type that validates-or-defaults (parseAsString, parseAsInteger, etc.). | first defined: Chapter 060 L1
parseAsStringEnum | - | nuqs parser builder constraining a param to a fixed set of string literals, falling back to the default otherwise. | first defined: Chapter 060 L1
parseAsString | - | nuqs parser builder for a plain string param. | first defined: Chapter 060 L1
.withDefault (nuqs) | withDefault | nuqs parser method setting a default; when the param equals it, nuqs strips it from the URL. | first defined: Chapter 060 L1
createSearchParamsCache | searchParamsCache | nuqs/server reader: composes parsers into a cache that parses and validates a page's searchParams server-side. | first defined: Chapter 060 L1
useQueryState | - | nuqs client hook returning a param's current value and a setter that writes it to the URL. | first defined: Chapter 060 L1
NuqsAdapter | - | nuqs root-layout adapter teaching it the framework's router; wrap once around the app. | first defined: Chapter 060 L1
filter shape | - | A reusable pattern for encoding one kind of filter as URL state: single enum, multi-value, range, or boolean. | first defined: Chapter 060 L2
multi-value filter | - | A filter holding several values in one param, joined by commas by default in nuqs. | first defined: Chapter 060 L2
range filter | - | A bounded filter modeled as two separate flat params (from/to), not one blob. | first defined: Chapter 060 L2
parseAsArrayOf | - | nuqs parser builder wrapping a single-value parser into an array parser that splits/joins on a separator (comma by default). | first defined: Chapter 060 L2
parseAsIsoDate | - | nuqs parser builder reading an ISO-8601 date string into a Date, falling back to default on malformed input. | first defined: Chapter 060 L2
parseAsBoolean | - | nuqs parser builder for a boolean param; with a false default the param appears only when on. | first defined: Chapter 060 L2
useQueryStates | merge-setter | nuqs client hook taking an object of parsers and returning one setter that updates only the named keys, leaving the rest untouched. | first defined: Chapter 060 L2
reset invariant | - | Every write that changes what rows are shown bundles cursor: null into the same setter call. | first defined: Chapter 060 L2
active-filter chips | filter chips | A row of pills above the table, one per active filter, each with a ✕ to clear that one filter. | first defined: Chapter 060 L2
shape injection | shape-injection | Letting a URL value reach a query's structure (e.g. which column to sort by) rather than its data; closed by gating on an enum. | first defined: Chapter 060 L2
bounded set | - | A list whose maximum size you can name up front; what licenses offset pagination. | first defined: Chapter 060 L4
shallow (nuqs) | shallow write | A nuqs write that updates the URL on the client only and skips re-rendering the server; shallow: false reaches the server. | first defined: Chapter 060 L3
throttle (rate-limit) | throttle(ms) | Act at most once per N-ms window regardless of event count; fits a continuous stream like a dragged slider. | first defined: Chapter 060 L3
limitUrlUpdates | - | nuqs option, set on the parser, that bounds how often the URL may change via a debounce or throttle limiter; replaced throttleMs. | first defined: Chapter 060 L3
typed vs committed | typed, committed | Typed is the per-keystroke box value in component state; committed is the settled value written to the URL and queried by the server. | first defined: Chapter 060 L3
archive | archivedAt | A visible lifecycle state the user moves a row into via a stamped timestamp and can browse and restore from; distinct from soft delete's invisible admin recovery. | first defined: Chapter 061 L1
$dynamic() | dynamic builder | Drizzle method lifting the single-invocation lock on .where()/.limit()/.orderBy() so a pre-scoped builder can be chained further. | first defined: Chapter 061 L2
scoped query helper | scopedInvoices, lifecycle query helper | Per-entity factory closing over orgId; exposes active()/archived()/includingDeleted() returning a builder pre-filtered by org and lifecycle. | first defined: Chapter 061 L2
includingDeleted() | - | The lifecycle helper's escape hatch: drops the lifecycle filter (org scope stays), returning deleted rows; admin-gated, loudly named for grep. | first defined: Chapter 061 L2
version column | version precondition, version | Integer counter bumped on every UPDATE; the WHERE checks the read-time value, zero rows affected means a conflict. | first defined: Chapter 061 L3
pessimistic locking | SELECT FOR UPDATE | Locking a row at read time and holding it until write; wrong for web traffic since the lock spans human think-time. | first defined: Chapter 061 L3
conflict() helper | conflict(current) | Project helper spreading err('conflict', ...) and adding a current field carrying the fresh server row for recovery. | first defined: Chapter 061 L3
CRDTs and operational transforms | CRDT, operational transform, OT | Algorithms merging concurrent edits so all writers' changes survive; basis of real-time collaborative editors; out of scope here. | first defined: Chapter 061 L3
fluent builder | fluent interface, chainable builder | A builder whose methods each return the builder, so calls chain into one readable sentence. | first defined: Chapter 062 L3
resolveView | read-layer view gate | Pure RBAC step collapsing the all view to active for non-admins, so a hand-typed ?view=all is refused at the read, not the hidden tab. | first defined: Chapter 062 L3
one-shot stream | single-read body | A request body you can consume exactly once; reading drains it and a second read sees an empty body. | first defined: Chapter 063 L1
entitlement | - | The access a customer earns by paying — plan, seats, or feature flag granted once billing confirms. | first defined: Chapter 063 L1
constructEvent | stripe.webhooks.constructEvent | Stripe SDK call that verifies the signature, HMAC, and tolerance in one line and returns a typed event or throws. | first defined: Chapter 063 L1
Stripe CLI | stripe listen, stripe trigger | Local tool that tunnels Stripe events to localhost and fires synthetic events for testing webhooks. | first defined: Chapter 063 L1
replay attack | replay | Resending a captured authentic request so its valid signature passes again; blocked by a timestamp tolerance. | first defined: Chapter 063 L1
at-least-once delivery | at-least-once | Sender guarantees a message arrives one or more times, never zero; duplicates expected, receiver must tolerate them. | first defined: Chapter 063 L2
time-of-check-to-time-of-use | TOCTOU | Race where a condition is checked then acted on, but the world changes in the gap so the action runs on a stale fact. | first defined: Chapter 063 L2
high-water mark | last_event_at | Stored marker of the newest value seen so far; here the created timestamp of the most recent event applied, so older events are stale. | first defined: Chapter 063 L3
provenance (security) | who sent this | Who a request is from; proved by a signature (webhook) or auth (public route); orthogonal to attempt identity. | first defined: Chapter 063 L4
attempt identity | sameness | Whether an incoming request is the same attempt already seen; the key's job, answered by a unique constraint. | first defined: Chapter 063 L4
natural domain unique | natural unique | A unique constraint on real domain columns (e.g. (orgId, slug), email) that already dedups, so no extra key column is needed. | first defined: Chapter 063 L4
Svix | - | Hosted webhooks-as-a-service layer; standardizes signature headers and delivery so every Svix-backed webhook verifies the same way. Resend uses it. | first defined: Chapter 063 L5
Stripe Product | product | The thing you sell — a plan tier like Pro; carries name, description, marketing copy, but no price; one per tier. | first defined: Chapter 064 L1
Stripe Price | price | Binds a Product to a recurring interval, currency, amount (smallest unit), and a lookup_key; one Product has many Prices. | first defined: Chapter 064 L1
lookup_key | lookup key | A stable, author-chosen string handle for a Price (e.g. pro_monthly), identical across test and live; resolve Prices by it, not price_id. | first defined: Chapter 064 L1
Stripe Customer | customer | The account Stripe bills; owns subscriptions, payment methods, invoices; one per organization, never per user. | first defined: Chapter 064 L1
Stripe Subscription | subscription | Joins a Customer to the Price they pay recurringly; carries status, tracks the period, emits a webhook on every change. | first defined: Chapter 064 L1
subscription item | subscription items | The line inside a Subscription pairing a Price with a quantity; carries the current billing period (not the Subscription root). | first defined: Chapter 064 L1
current_period_end | - | Timestamp the current paid interval ends and Stripe attempts the next charge; lives on the subscription item (items.data[0]) since API 2025-03-31. | first defined: Chapter 064 L1
Stripe metadata | metadata (stripe) | Arbitrary key/value pairs on a Stripe object, echoed back on every webhook event, so a handler reads app-specific values without a DB round-trip. | first defined: Chapter 064 L1
STRIPE_SECRET_KEY | sk_test_, sk_live_ | Server-only Stripe key authenticating SDK calls; can charge cards; must never reach the client bundle; prefix encodes the universe. | first defined: Chapter 064 L1
STRIPE_PUBLISHABLE_KEY | pk_test_, pk_live_ | Client-side Stripe key, safe to ship; used by Stripe.js to mount payment UI; prefix encodes the universe. | first defined: Chapter 064 L1
hot path | request hot path | Code running on a large fraction of requests, where latency is paid every time; work that can't afford a round-trip belongs off it. | first defined: Chapter 064 L1
test mode and live mode | test universe, live universe | Two disjoint Stripe universes per account sharing no keys, objects, or IDs; dev/CI/staging use test, only production uses live. | first defined: Chapter 064 L1
Checkout Session | checkout session | Server-created, single-use, short-lived Stripe object; parameterized once, returns a hosted payment URL; offloads PCI scope and leaves provisioning to the webhook. | first defined: Chapter 064 L2
PCI compliance | PCI, PCI DSS | Security requirements for any system handling raw card data; letting Stripe's hosted page collect the card keeps that data off your servers and shrinks scope. | first defined: Chapter 064 L2
content-security policy | CSP | Browser security header whitelisting which sources a page may load scripts, styles, and frames from; a hosted Stripe page sidesteps it, an embedded form needs allowing. | first defined: Chapter 064 L2
Customer Portal | portal | Stripe-hosted prebuilt account-management UI scoped to one Customer: plan changes, payment method, invoice history, cancellation; maintained by Stripe. | first defined: Chapter 064 L3
portal session | - | Short-lived, single-use URL scoped to one Customer that opens its billing screens then expires; mint a fresh one each time. | first defined: Chapter 064 L3
bearer-style (link) | bearer-style | A link whose possession alone grants access, no further identity check; treat like a password. | first defined: Chapter 064 L3
cancel_at_period_end | - | Subscription flag; when true the subscription stays active and billed through the period then ends at current_period_end; set false to reactivate. | first defined: Chapter 064 L3
proration | - | Stripe's automatic credit-and-charge math on a mid-cycle subscription change; the app reads the result, never computes it. | first defined: Chapter 064 L3
flow_data | - | Portal-session parameter deep-linking the customer into one prebuilt flow (cancel, plan change, card update) instead of the home screen. | first defined: Chapter 064 L3
derived view (data) | projection, plan_entitlements | A small local table holding only the facts read on the hot path, refreshed from an authoritative source; read-shaped, not a full mirror. | first defined: Chapter 064 L4
plan_entitlements | entitlement projection | One-row-per-org table projecting Stripe subscription state (plan, status, seats, period); the row every gate reads. | first defined: Chapter 064 L4
subscriptionToEntitlement | projection function | Pure function mapping a Stripe.Subscription to an entitlement patch; no DB or network, so it unit-tests trivially. | first defined: Chapter 064 L4
getEntitlement | - | The single cache()-wrapped read helper returning the org's entitlement row; non-null because every org is provisioned a row at creation. | first defined: Chapter 064 L4
hasActiveAccess | - | The one exhaustive switch over subscription status deciding can-this-org-get-in; grants trialing/active/past_due, denies canceled/incomplete. | first defined: Chapter 064 L5
isWindingDown | - | Predicate true when status is active and cancelAtPeriodEnd is set; a cancelled subscription still in its paid period. | first defined: Chapter 064 L5
paywall | - | A gate blocking a feature behind a paid plan tier; below the line it's hidden or an upgrade nudge, above it the feature renders. | first defined: Chapter 064 L6
requirePlan | requirePlan(planSlug) | The two-question billing gate: resolves the org, reads its entitlement, throws BillingError on inactive access or too-low tier, else resolves void. | first defined: Chapter 064 L6
BillingError | - | Minimal Error subclass for billing; literal name plus a machine-readable code (no_access/plan_required/no_customer) and a customer-safe message. | first defined: Chapter 064 L6
PLAN_RANK | - | The plan ladder as data: free 0, pro 1, team 2; as const satisfies Record<Plan, number> forces ranking any new plan. | first defined: Chapter 064 L6
planAtLeast | planAtLeast(plan, required) | Tier comparison over PLAN_RANK; true when plan's rank meets or beats required, the twin of roleAtLeast. | first defined: Chapter 064 L6
anti-corruption layer | ACL | A module translating a vendor's API into your own shapes and confining it to one place; the formal name for the interface verdict. | first defined: Chapter 064 L7
adapter (SDK) | - | A thin module exposing your own stable interface over a third-party SDK, so call sites depend on your shape, not the vendor's. | first defined: Chapter 064 L7
processed_events | dedupe ledger | Table with a unique(provider, eventId) constraint; one claimed row per event, the dedupe seam every webhook handler shares. | first defined: Chapter 063 L2
claimEvent | claimEvent(tx, provider, eventId, eventType) | Check-and-claim helper; returns true when the row is freshly inserted, false when the unique(provider, eventId) constraint blocks a replay. | first defined: Chapter 063 L2
ordering predicate | newer-wins, last_event_at | A last_event_at comparison on the entitlement write that lets a stale out-of-order event no-op instead of overwriting newer state. | first defined: Chapter 063 L3
resolveOrgIdFromCustomer | reverse lookup (tenancy) | Authoritative reverse lookup mapping a Stripe Customer back to the org that owns it; cross-checks metadata so forged tenancy can't write the wrong tenant. | first defined: Chapter 065 L6
structured log | - | Log where each line is machine-readable JSON of named fields, queryable by field instead of grepping prose. | first defined: Chapter 065 L2
log-injection | log injection | Attack writing forged content into logs to fake entries or break the parser; logging unverified input enables it. | first defined: Chapter 065 L2
NTP | Network Time Protocol, NTP drift | Protocol syncing server clocks to a reference; drift is the small gap when sync lags. | first defined: Chapter 065 L2
disposition | webhook disposition | The recorded outcome of handling a delivery (verified, duplicate, claimed, dispatched, unhandled), logged keyed by event id. | first defined: Chapter 065 L3
background job | background work | Work queued to run outside the triggering request on a separate worker, so the response returns immediately. | first defined: Chapter 065 L3
forged tenancy | forged organization_id | Caller-influenceable tenancy claim (here metadata.organization_id) that names the wrong org; rejected by cross-checking the Customer-owned org. | first defined: Chapter 065 L6
carry-channel | carry channel | A value the app sets, sends through an external service, and reads back on the event; attacker-influenceable, so distrusted. | first defined: Chapter 065 L6
blast radius | - | The set of code a change can break or force you to touch; small means impact is contained to one place. | first defined: Chapter 065 L5
SPA | single-page application | Web app that loads once and updates the view with client-side JS instead of full page loads, keeping its own nav history. | first defined: Chapter 065 L5
after | after() | next/server primitive scheduling a callback to run after the response ships, in the same invocation; runs once, no retry, bounded by maxDuration. | first defined: Chapter 066 L1
waitUntil | - | Platform primitive keeping a serverless function alive past the response until a callback finishes or maxDuration hits; after() builds on it. | first defined: Chapter 066 L1
maxDuration | wall-clock cap | A serverless function's hard time limit; hit it and the function is killed mid-run, and every second up to it is billed to the request. | first defined: Chapter 066 L1
p99 | 99th-percentile latency | The latency 99% of requests beat; the slow 1% tail real users complain about. | first defined: Chapter 066 L1
Vercel Cron | cron | Platform-native scheduler firing a secured HTTP GET at a route handler on a UTC clock; no queue, worker, or second platform. | first defined: Chapter 066 L2
external scheduler | - | A service running on its own clock, separate from your app, whose only job is firing requests at declared times. | first defined: Chapter 066 L2
serverless function invocation | invocation | One short-lived run of a handler, spun up for a single request, torn down after, with a wall-clock cap and no memory of other runs. | first defined: Chapter 066 L2
best-effort delivery | best-effort | Delivery that can both miss and duplicate a scheduled run; weaker than at-least-once, so handlers must self-heal both. | first defined: Chapter 066 L2
reconciliation (cron) | catch-up-based | Processing all outstanding work from a known-good baseline every run, not a remembered delta; a miss is caught up next run, a duplicate finds nothing left. | first defined: Chapter 066 L2
job runner | - | Separate platform for off-request background work with durable retries, longer limits, and a run timeline; Trigger.dev is the course pick. | first defined: Chapter 066 L2
five-field cron expression | cron expression | Minute, hour, day-of-month, month, day-of-week; Vercel evaluates it in UTC, numbers only, the two day fields mutually exclusive. | first defined: Chapter 066 L2
durable run | durable runs | A run that survives worker crashes, redeploys, and restarts by checkpointing between steps. | first defined: Chapter 066 L3
exponential backoff | - | Retry delays that grow geometrically, with jitter, so retries spread out instead of stampeding. | first defined: Chapter 066 L3
concurrency limit | concurrency limits | Cap on how many runs of a queue execute at once; back-pressure. | first defined: Chapter 066 L3
waitpoint | waitpoints | A durable, resumable pause token: the run parks, the worker frees, an external signal resumes it. | first defined: Chapter 066 L3
project ref | proj_ ref | The proj_... id in trigger.config.ts linking local code to a Trigger.dev cloud project. | first defined: Chapter 066 L4
dirs (trigger.config) | dirs | trigger.config.ts array listing folders Trigger.dev scans for task files; files outside are silently ignored. | first defined: Chapter 066 L4
Standard Schema | - | Validator-agnostic schema interface (Zod, Valibot, ArkType all implement it), so the validation library isn't locked in. | first defined: Chapter 066 L4
Trigger.dev task | task() | The unit you define and call: an object with id and run; bare task has an untyped payload. | first defined: Chapter 066 L4
schemaTask | - | task plus a schema; parses the payload (a Standard Schema validator) before run executes, typed inside. | first defined: Chapter 066 L4
durable identity (task id) | task id | A task's id string: its permanent identity; runs reference it across deploys, renaming orphans every run. | first defined: Chapter 066 L4
ctx (Trigger.dev) | run context | Per-run context passed as run's second arg: run.id, attempt.number, environment; not request context, no session or headers. | first defined: Chapter 066 L4
handle (trigger) | run handle | The { id, ... } object trigger returns the moment a run is enqueued; carries the run id, not the result. | first defined: Chapter 066 L4
triggerAndWait | - | Pauses a parent run until a child task finishes, returning its typed result; legal only inside another task, not request code. | first defined: Chapter 066 L4
queue (Trigger.dev) | queue() | Predeclared at module scope; caps how many runs of a task execute at once for downstream back-pressure. | first defined: Chapter 066 L4
concurrencyKey | - | Value passed at trigger time splitting a queue's limit into one independent lane per key; e.g. one lane per org. | first defined: Chapter 066 L4
static schedule | schedules.task | One global schedule declared in code and deployed with the task via schedules.task. | first defined: Chapter 066 L4
dynamic schedule | schedules.create | One schedule per tenant created at runtime via schedules.create; cron is a plain string, timezone top-level. | first defined: Chapter 066 L4
externalId | - | Your own domain id attached to a dynamic schedule, so you look it up, deactivate, or delete it by your id. | first defined: Chapter 066 L4
deduplicationKey | - | Key making schedules.create idempotent; a repeat call with the same key updates instead of duplicating. | first defined: Chapter 066 L4
metadata.set (Trigger.dev) | run metadata | Mutable per-run object written from inside a task; the dashboard renders it live for progress like "47 of 200". | first defined: Chapter 066 L4
locals (Trigger.dev) | locals API | v4 per-run resource container populated in middleware via locals.create<T>(); replaces the deprecated per-task init hook. | first defined: Chapter 066 L4
checkpoint | - | Saved snapshot of a run's progress, written at every wait/triggerAndWait and end of attempt; a crash resumes from the most recent one. | first defined: Chapter 066 L5
worker (Trigger.dev) | - | The Trigger.dev compute process running a task, separate from the Vercel function that triggered it. | first defined: Chapter 066 L5
AbortTaskRunError | - | Thrown inside a task to fail the run immediately, skipping all remaining retries; for permanent failures retrying cannot fix. | first defined: Chapter 066 L5
transient (failure) | transient failure | A failure likely to clear on its own (5xx, network error, 429); worth retrying. | first defined: Chapter 066 L5
run-level retry | - | The runtime re-running a whole task on an unhandled throw, restarting from the most recent checkpoint; set by the retry block. | first defined: Chapter 066 L5
call-level retry | - | An SDK or HTTP client retrying a single failed request on its own, restarting only that call rather than the whole run. | first defined: Chapter 066 L5
idempotency key (Trigger.dev) | idempotencyKey | Stable identifier on a trigger; within its TTL, re-triggering with the same key returns the original run instead of starting a new one. | first defined: Chapter 066 L5
idempotencyKeyTTL | - | How long an idempotency key keeps returning the original run; a duration string like '5m' or '24h'; defaults to 30 days. | first defined: Chapter 066 L5
scope (idempotency) | - | Namespacing for an idempotency key: 'run' (per parent run, default), 'attempt' (per retry), or 'global' (key alone). | first defined: Chapter 066 L5
wait.for | - | Durable relative pause; checkpoints, frees the worker (no compute billed), resumes after the duration on a possibly new worker. | first defined: Chapter 066 L5
wait.until | - | Durable pause until an absolute wall-clock Date; same checkpoint/free-worker/crash-safe semantics as wait.for; past dates resolve immediately. | first defined: Chapter 066 L5
cooperative cancellation | cooperative | Cancellation where the runtime stops new steps but an in-flight step halts only if it honors the abort signal. | first defined: Chapter 066 L5
wait.createToken | createToken | Mints a waitpoint token (id, url, publicAccessToken); takes a timeout and optional idempotencyKey. | first defined: Chapter 066 L6
wait.forToken | forToken | Parks the run on a token (a checkpoint); resumes with the completion payload or ok:false on timeout. | first defined: Chapter 066 L6
wait.completeToken | completeToken | Completes a token from your own SDK code, resuming the parked run; one-shot, second call is a no-op. | first defined: Chapter 066 L6
programmatic completion | - | Completing a waitpoint token from your own code via the SDK rather than an external callback URL. | first defined: Chapter 066 L6
token.url (waitpoint) | - | A waitpoint's server-to-server completion webhook; no CORS, hand to a backend partner. | first defined: Chapter 066 L6
token.publicAccessToken | publicAccessToken | Bearer token a browser uses to complete a waitpoint via the CORS-enabled endpoint. | first defined: Chapter 066 L6
human-in-the-loop | human in the loop | A workflow that pauses for a person to decide before continuing. | first defined: Chapter 066 L6
fan-in | - | Spawn N units of work, resume only when all N finish; opposite of fan-out. | first defined: Chapter 066 L6
batchTriggerAndWait | - | Triggers many children at once and parks the parent on all of them; returns a typed array once all settle. | first defined: Chapter 066 L6
predicate-idempotent | - | A job whose own first run invalidates its WHERE clause, so re-running changes nothing and it needs no dedup key. | first defined: Chapter 066 L7
caller / callee | caller, callee | The caller is the code that triggers a task (the app); the callee is the triggered task; deploy the callee first. | first defined: Chapter 066 L7
concurrency seat | - | A unit of paid concurrency: one slot for a run to execute in at the same time as others. | first defined: Chapter 066 L7
tasks.trigger | - | Fire-and-return enqueue from request code; returns a handle the moment the run is queued, never blocking, unlike triggerAndWait. | first defined: Chapter 067 L2
.unwrap (triggerAndWait) | unwrap | Unwraps a triggerAndWait result to the child's return value, rethrowing if the child failed so the failure propagates to the parent. | first defined: Chapter 067 L3
RFC-4180 | RFC 4180 | The standard defining CSV: comma-separated fields, CRLF line breaks, quoting rules for fields with commas/quotes/newlines. | first defined: Chapter 067 L3
multipart upload | - | Upload protocol sending a large object as independently-PUT parts assembled server-side; streams a file without holding it whole in memory. | first defined: Chapter 067 L3
system actor | actorUserId: null, system-actor | An audit row written by a task with no session; the null actor records that no human did it, not a missing value. | first defined: Chapter 067 L4
Cloudflare R2 | R2 | Object storage speaking the S3 API that charges zero egress; the course default bucket. | first defined: Chapter 068 L1
binary payload | blob, bytes | Raw bytes (image, PDF, CSV) the app stores and serves whole, not structured rows it can query into. | first defined: Chapter 068 L1
egress | egress fees | Data transferred out of a storage provider to the internet; the dominant line item on a read-heavy bill, priced at zero by R2. | first defined: Chapter 068 L1
S3-compatible API | S3 API | The de-facto object-storage HTTP API from AWS S3; one SDK (@aws-sdk/client-s3) talks to S3, R2, or B2 by swapping endpoint and credentials. | first defined: Chapter 068 L1
bytea | - | Postgres raw-bytes column type storing arbitrary binary data inline in the row; fine only for tiny, short-lived blobs. | first defined: Chapter 068 L1
pg_dump | - | Postgres logical backup tool serializing schema and every row into one portable file; chokes at blob volume. | first defined: Chapter 068 L1
object key | key | The unique path string addressing one object in a bucket (e.g. org/42/files/abc.pdf); the join key between the Postgres row and the bytes. | first defined: Chapter 068 L1
bucket | R2 bucket | A namespace inside an R2 account holding objects; named once at creation, one per environment. | first defined: Chapter 068 L1
scoped token | R2 token, bucket-scoped token | R2 credential locked to specific buckets with a chosen permission grade; one per environment to shrink blast radius. | first defined: Chapter 068 L2
public bucket | - | R2 mode exposing objects at an unsigned public URL; right for public assets, wrong for tenant files. | first defined: Chapter 068 L2
location hint | - | A soft preference for where R2 stores a bucket's data; a latency nudge, not a trust boundary. | first defined: Chapter 068 L2
HEAD request | HEAD, HeadObjectCommand | HTTP request returning an object's response headers (e.g. ContentLength) without its body; how finalize reads the real stored size. | first defined: Chapter 068 L3
byte pipe | byte-pipe rule | Routing object bytes through your request handler; the anti-pattern presigned URLs exist to avoid, since it pays timeout and bandwidth costs for nothing. | first defined: Chapter 068 L3
file_metadata row | metadata row | The Postgres row owning a stored file's identity: queryable, owned, lifecycle-tracked, auditable. | first defined: Chapter 068 L4
lifecycle rule | - | A prefix-scoped bucket rule auto-deleting objects older than N days; configured once, no app code runs. | first defined: Chapter 068 L3
Class B operations | Class B | R2's request tier for reads and HEAD requests, billed separately from Class A writes; the cost driver for read-heavy workloads. | first defined: Chapter 068 L5
Content-Disposition | - | Download response header setting the saved filename (attachment; filename="..."), so the friendly name beats the object key. | first defined: Chapter 068 L4
orphan bytes | - | An R2 object with no file_metadata row; cheap litter a sweep reclaims, the inverse of an orphan row. | first defined: Chapter 068 L4
size-bomb | size bomb, size-bomb upload | Client claims a small file when asking for the URL, then PUTs something enormous; the post-upload HEAD plus byte cap defends against it. | first defined: Chapter 069 L1
presigned PUT | signed PUT | A presigned URL scoped to a PUT: the browser uploads bytes straight to R2, the app server signs but never carries them. | first defined: Chapter 069 L2
write capability | upload capability | A signed URL treated as a bearer grant: holding it authorizes one write scoped to a fixed bucket, key, and content type until it expires. | first defined: Chapter 069 L2
buildObjectKey | - | Helper deriving the object key server-side from orgId, a server-minted id, and the validated content type; never client-supplied. | first defined: Chapter 069 L2
signableHeaders | - | getSignedUrl option naming which headers the signature must cover; pinning content-type makes R2 reject a PUT whose Content-Type differs from the signed one. | first defined: Chapter 069 L2
two-step write | two-step upload | Sign-then-finalize split: the sign action writes no row, finalize HEADs the stored object and inserts from observed truth; an unused sign leaves only a cheap orphan object, never an orphan row. | first defined: Chapter 069 L2
poison pill | - | An `import 'server-only'` line that fails the build if a module reaches a client bundle; nickname for the server-only guard. | first defined: Chapter 069 L3
finalizeUpload | - | The two-step write's second half: HEADs the PUT object, validates type and size against the signed values, inserts the file_metadata row and audit entry in one transaction. | first defined: Chapter 069 L3
fresh-per-render URL | fresh-per-render | A download URL signed anew on every render and never stored; a persisted signed URL would expire and lie. | first defined: Chapter 069 L4
RFC 5987 | filename* encoding | The filename*=UTF-8'' header encoding (charset tag + percent-encoded string) carrying non-ASCII filenames through Content-Disposition. | first defined: Chapter 069 L4
getFileDownloadUrl | - | Tenant-scoped helper signing a fresh presigned GET for one file; a cross-org or missing id collapses to not_found. | first defined: Chapter 069 L4
getSignedGetForKey | - | The lone tenant-free GET signer for a raw key; called by the export worker inside the trust boundary, no org row to scope against. | first defined: Chapter 069 L4
server-side PUT | server-PUT | A worker writing object bytes to R2 itself with PutObjectCommand; the byte-pipe rule's other side from the browser presigned PUT, used when there is no browser to hand off to. | first defined: Chapter 069 L5
kill-resume | kill-resume idempotency, kill-resume drill | Killing a durable run mid-flight and restarting it yields exactly one of each effect; the parent retry re-runs the tail against the same run-keyed object, and an overwrite is idempotent. | first defined: Chapter 069 L5
notification dispatcher | dispatcher | The single function every notification flows through; call sites fire one event, it owns every channel decision. | first defined: Chapter 070 L1
call site | - | The place that fires an event: describes what happened and who should know, never how it's delivered. | first defined: Chapter 070 L1
cross-cutting concern | - | A concern otherwise scattered across the codebase (logging, auth, channel knowledge) pulled into one place. | first defined: Chapter 070 L1
notifiable_events registry | notifiable_events, notification registry | Typed map keyed by event type listing every notification the app can send, with channels, template, prefs, dedup. | first defined: Chapter 070 L1
transactional outbox | outbox pattern | Write the notification intent inside the state-change transaction, deliver later from a worker, so commit and intent are atomic. | first defined: Chapter 070 L1
render-at-dispatch | snapshot display strings, store rendered text | Compute a notification's title/body when the event fires and store them on the row, so later data changes don't rewrite it. | first defined: Chapter 070 L1
notification channel | channel | One delivery path a notification can take (email, in-app inbox, push); each is a function with the same signature. | first defined: Chapter 070 L1
sink | - | The bottom-layer function that actually performs the I/O a channel calls into (the sendEmail wrapper, db.insert). | first defined: Chapter 070 L2
inbox formatter | - | Per-event-type (payload) => { title, body } function in the registry that renders an inbox row's stored text. | first defined: Chapter 070 L2
notification category | preference category, preferenceCategory | A group of related event types sharing one user toggle (team, billing, security); the unit of preference choice. | first defined: Chapter 070 L3
notification opt-out | opt-out (notifications) | A user turning a channel off; the only thing that writes a preferences row, so silence is absence of a row. | first defined: Chapter 070 L3
default-on | default on | Missing preference row means opted in on every channel; only an explicit false drops a channel. | first defined: Chapter 070 L3
critical channel | criticalChannel | A registry-declared channel the user cannot fully mute (security, act-now billing); forced back on after the preference filter. | first defined: Chapter 070 L3
deduplication | dedup | Dropping a repeat so the same notification is not delivered to the same person twice. | first defined: Chapter 070 L4
dedup window | windowSeconds | Short look-back span (default 60s, per-event in the registry) within which a repeat firing counts as a duplicate. | first defined: Chapter 070 L4
dedup key | dedupKey, keyBy | Per-event field list that defines what counts as the same notification; built into a composite key with eventType and recipientUserId. | first defined: Chapter 070 L4
notification_dedup | dedup table | Table recording (eventType, dedupKey, recipientUserId, firedAt) per delivery; the dispatcher's short-term send memory, pruned on a schedule. | first defined: Chapter 070 L4
coalesce (notifications) | coalescing | Collapsing several distinct-but-related events into one summarized notification rather than dropping any. | first defined: Chapter 070 L4
parameter contravariance | contravariance, TS2322 | A function demanding a specific param shape can't stand in where any object is accepted; why the template field is typed `any`. | first defined: Chapter 071 L2
check-then-insert race | check-then-insert | Two concurrent fires both read "not duplicate" before either records, so both send; accepted, hardened with a unique key. | first defined: Chapter 071 L2
fire-after-commit | dispatch after commit, fire after commit | Call the dispatcher only after the transaction commits, so work that rolls back never notifies anyone. | first defined: Chapter 070 L1
dual write (notifications) | dual write | One action writing two tables for two audiences: an audit row for compliance plus a notification row for the user. | first defined: Chapter 071 L4
pendingDispatches | pending dispatches array | In-memory NotificationEvent[] a webhook fills inside the tx and the route drains after commit; the v1 stand-in for a transactional outbox table. | first defined: Chapter 071 L4
hit rate | cache hit rate | Share of reads served from cache instead of recomputed; near-zero means caching that read buys nothing. | first defined: Chapter 072 L1
read-to-write ratio | read/write ratio | Read frequency over write frequency; a high ratio (read by many, written rarely) is what makes a cache worth it. | first defined: Chapter 072 L1
route class | route classes, caching posture | Where a route sits on the caching gradient: fully dynamic, fully static, or partially cached (PPR). | first defined: Chapter 072 L1
tag union | - | A cached entry carries several tags; invalidating any one invalidates the whole entry, so a read attaches every tag a writer might use. | first defined: Chapter 072 L1
fetchedAt | - | Timestamp computed once inside a cached read and frozen into the entry; stable across loads means the cache is hitting. | first defined: Chapter 072 L1
in-band redirect | - | A Server Action mutates, invalidates, then redirects in one request, so the redirect's render reads freshly-expired data; the mechanism behind read-your-writes. | first defined: Chapter 072 L2
fan-out (invalidation) | invalidation fan-out | Firing one narrow tag per cached read a single mutation changed, so no affected read goes silently stale. | first defined: Chapter 072 L2
multi-recipient invalidation | multi-recipient pattern | One action fires tags scoping several people's data, since who triggered a change and whose data changed are different questions. | first defined: Chapter 072 L2
'max' (revalidateTag profile) | max profile | Recommended revalidateTag second arg; marks the tag stale for plain stale-while-revalidate on the next visit. | first defined: Chapter 073 L4
NAT | Network Address Translation | Many devices on a private network share one public IP; to the outside hundreds of users look like one address. | first defined: Chapter 074 L1
WAF | Web Application Firewall | Edge filter inspecting each request by IP, path, headers; blocks or logs before it reaches your code. | first defined: Chapter 074 L1
edge (network) | network edge | CDN/proxy tier running before your app function, geographically close to the user. | first defined: Chapter 074 L1
TTL | time-to-live | Automatic expiry on a stored key; when it elapses the key vanishes, which resets a rate-limit counter. | first defined: Chapter 074 L1
Redis | - | In-memory key-value store; very fast reads/writes, keys can carry a TTL; holds the per-key counters. | first defined: Chapter 074 L1
Upstash Redis | Upstash | Serverless HTTP/REST-accessible managed Redis; works in edge runtimes, scales to zero, bills per request. | first defined: Chapter 074 L1
scales to zero | scale to zero | No servers running and no cost when idle; pay per request, not per hour of uptime. | first defined: Chapter 074 L1
denial-of-service | DoS | Making a system unavailable to legitimate users; here, locking a victim out via a per-email limit. | first defined: Chapter 074 L1
@upstash/ratelimit | - | Rate-limiting library using @upstash/redis under the hood; the application-layer limiter. | first defined: Chapter 074 L1
@upstash/redis | - | HTTP/REST Redis client library you call from your code. | first defined: Chapter 074 L1
edge controls | edge layer | Rate-limit filters at the edge (Vercel WAF) seeing IP/path/headers, before app code. | first defined: Chapter 074 L1
application controls | application limiter | @upstash/ratelimit inside Server Actions/route handlers, after parse and auth; sees email/user/org. | first defined: Chapter 074 L1
connectionless | - | Reached over stateless HTTP requests, not a long-lived socket; nothing to open, pool, or close. | first defined: Chapter 074 L2
sliding window | Ratelimit.slidingWindow | Rate-limit algorithm weighting count across current and previous window; smoothest cap, the default. | first defined: Chapter 074 L2
token bucket | Ratelimit.tokenBucket | Rate-limit algorithm: a refilling bucket of tokens, one spent per request; allows bursts, caps sustained rate. | first defined: Chapter 074 L2
fixed window | Ratelimit.fixedWindow | Rate-limit algorithm: one counter per clock-aligned window, reset on the boundary; cheapest, allows boundary slop. | first defined: Chapter 074 L2
Lua | - | Redis's server-side scripting language; a script runs as one atomic unit. | first defined: Chapter 074 L2
hot invocation | warm instance | A serverless instance kept hot from a recent request; module-scope objects and their caches survive and get reused. | first defined: Chapter 074 L2
delta-seconds | - | A count of seconds from now until an event; a relative duration, not an absolute timestamp. | first defined: Chapter 074 L2
p50 | median latency | The median latency; half of requests are faster. | first defined: Chapter 074 L2
lockout vector | - | Denying a victim access to their own account by tripping a limit keyed on the victim's identifier; the defense becomes the attack. | first defined: Chapter 074 L3
dual-keying rule | dual key, dual gate | Run a per-IP and a per-victim-identifier gate independently and require a request to clear both; catches single-source floods and distributed campaigns without enabling lockout. | first defined: Chapter 074 L3
RateLimit-* headers | RateLimit-Limit, RateLimit-Remaining, RateLimit-Reset | IETF-standard rate-limit response headers conveying a client's budget and reset time. | first defined: Chapter 075 L1
429 | Too Many Requests | HTTP status returned when a client trips a rate limit. | first defined: Chapter 075 L1
ephemeralCache | - | In-process map a Ratelimit keeps so repeated reads of a hot key are served from memory, skipping a Redis round-trip. | first defined: Chapter 075 L2
getRemaining | - | Ratelimit read that returns a key's remaining budget without consuming a token. | first defined: Chapter 075 L2
fail-open | - | On limiter error (e.g. Redis unreachable), allow the request through rather than block, so an outage cannot lock everyone out. | first defined: Chapter 075 L2
secondaryStorage | secondary storage | Better Auth config slot for a second key-value store (e.g. Redis) backing rate-limit counters and sessions, so the built-in limiter shares state across instances. | first defined: Chapter 075 L3
client-side server-state library | - | Library that caches server data in the browser and manages its refetch/invalidation lifecycle; TanStack Query, SWR. | first defined: Chapter 076 L1
Router Cache | - | Next.js in-browser cache of prefetched route segments, so soft navigations are instant. | first defined: Chapter 076 L1
infinite scroll | - | Accumulate-and-reuse paging: scroll down to load more, scroll back up with already-loaded pages still cached, no refetch. | first defined: Chapter 076 L1
SWR (library) | - | Vercel's smaller client-side server-state library, built on the stale-while-revalidate pattern; the alternative to TanStack Query. | first defined: Chapter 076 L1
enumeration-uniform | enumeration-safe response | Return the identical response whether or not the email belongs to a real account, so an attacker can't tell registered addresses apart. | first defined: Chapter 075 L5
useQuery | - | TanStack Query read hook: takes a query key and queryFn, returns data plus lifecycle flags. | first defined: Chapter 076 L2
useMutation | - | TanStack Query write hook: takes a mutationFn and lifecycle callbacks (onMutate/onError/onSuccess/onSettled), returns mutate/mutateAsync. | first defined: Chapter 076 L2
useInfiniteQuery | - | TanStack Query read hook for cursor-paginated data; data is an array of pages, paged via getNextPageParam. | first defined: Chapter 076 L2
query key | queryKey | Serializable array that is a query's cache address; invalidation matches by prefix. | first defined: Chapter 076 L2
queryFn | query function | Async function a query runs to fetch its data; resolves to the data or throws into error. | first defined: Chapter 076 L2
staleTime | - | How long cached data counts as fresh; while fresh no refetch fires on mount or focus. | first defined: Chapter 076 L2
isFetching | - | TanStack Query flag: true while any request for the query is in flight, including background refetches. | first defined: Chapter 076 L2
isPending (TanStack Query) | - | TanStack Query flag: true until a query first resolves (no cached data yet). | first defined: Chapter 076 L2
query key factory | key factory | Typed per-feature helper object that builds query keys once, so read and write sides can't drift. | first defined: Chapter 076 L2
mutate vs mutateAsync | mutate, mutateAsync | mutate is fire-and-forget (errors go to onError); mutateAsync returns an awaitable Promise that rejects on failure. | first defined: Chapter 076 L2
optimistic update (via variables) | - | TanStack v5 shape rendering the in-flight mutation variables inline while isPending, no cache write or rollback. | first defined: Chapter 076 L2
optimistic update (cache update) | - | TanStack shape writing the optimistic value into the cache via cancel-snapshot-write-restore-invalidate. | first defined: Chapter 076 L2
useQueryClient | queryClient | Hook returning the provider's QueryClient, the imperative cache handle; client-only. | first defined: Chapter 076 L2
invalidateQueries | - | QueryClient call marking matching queries stale and refetching the active ones. | first defined: Chapter 076 L2
setQueryData | - | QueryClient call writing a value straight into the cache with no fetch. | first defined: Chapter 076 L2
removeQueries | - | QueryClient call evicting matching cache entries entirely; used on org-switch and sign-out. | first defined: Chapter 076 L2
pageParam | - | The cursor for the page a useInfiniteQuery queryFn is currently fetching. | first defined: Chapter 076 L2
getNextPageParam | - | useInfiniteQuery function returning the next page's cursor, or undefined to signal no more pages. | first defined: Chapter 076 L2
maxPages | - | useInfiniteQuery cap on cached pages; the oldest drops past the limit to bound memory. | first defined: Chapter 076 L2
data.pages | - | useInfiniteQuery shape: an array of fetched pages, flattened at the render site. | first defined: Chapter 076 L2
refetchInterval | - | useQuery option polling on a fixed interval; a function return of false stops the loop. | first defined: Chapter 076 L2
derived value (TanStack Query) | - | A value computed with useMemo over query data, not its own query with a synthetic key. | first defined: Chapter 076 L2
QueryClientProvider | - | React context provider exposing the TanStack cache to every useQuery/useMutation below it; client-only. | first defined: Chapter 076 L3
getQueryClient | per-request client | Helper returning a fresh request-scoped client on the server and a module singleton in the browser, preventing cross-request cache leaks. | first defined: Chapter 076 L3
prefetchInfiniteQuery | - | Runs an infinite query's fetcher and stores the result in the cache without rendering a hook; server-side cache warming. | first defined: Chapter 076 L3
HydrationBoundary | - | Client Component injecting a dehydrated cache snapshot into the browser's QueryClient before children render. | first defined: Chapter 076 L3
dehydrate | - | Serializes a QueryClient's cache into a plain object that rides inside the server's response. | first defined: Chapter 076 L3
gcTime | garbage-collection time | How long unused cache entries are kept before eviction. | first defined: Chapter 076 L3
refetchOnWindowFocus | - | QueryClient option; when false, the screen does not refetch every time the window regains focus. | first defined: Chapter 076 L3
isServer | - | TanStack Query's exported boolean, true during a server render; equivalent to typeof window === 'undefined'. | first defined: Chapter 076 L3
queryClient.clear() | clear() | QueryClient call dropping the entire cache; the safe default at a tenant boundary on org-switch. | first defined: Chapter 076 L3
cancelQueries | - | QueryClient call aborting in-flight queries so a mid-flight refetch can't clobber an optimistic cache write; the mandatory first onMutate step. | first defined: Chapter 076 L2
getQueryData | - | QueryClient call reading the current cached value for a key, with no fetch; used to snapshot before an optimistic write. | first defined: Chapter 076 L2
cross-view caching | cross-view cache | Same server data re-rendered instantly across mount/unmount of different views from a shared client cache; the weakest of the four TanStack triggers. | first defined: Chapter 076 L1
dual fetcher | - | A read function branching on typeof window: fetch the route handler in the browser, run the Drizzle query in-process on the server, parsing the same schema either way. | first defined: Chapter 076 L3
read seam | - | The single endpoint where the client crosses into server data; here the GET route handler the query reads from. | first defined: Chapter 076 L4
write seam | - | The Server Action that owns the mutation: parse, authorize, write, audit, return Result, then trigger invalidation. | first defined: Chapter 076 L4
progressive-enhancement form contract | form contract | The FormData + native HTML <form> contract that submits without JavaScript and degrades gracefully, working before hydration. | first defined: Chapter 076 L4
two-system invalidation | - | A write invalidating both caches at once: updateTag for the Server Component cache, invalidateQueries for the TanStack client cache. | first defined: Chapter 077 L3
refetchIntervalInBackground | - | useInfiniteQuery/useQuery flag; false pauses the poll while the tab is hidden, resumes on focus. | first defined: Chapter 076 L2
getPreviousPageParam | - | useInfiniteQuery function returning the previous page's cursor; mandatory whenever maxPages caps retention so dropped pages re-fetch on scroll-back. | first defined: Chapter 076 L2
isFetchingNextPage | - | TanStack Query flag: true only while a useInfiniteQuery paging fetch is in flight, distinct from a background poll's isFetching. | first defined: Chapter 076 L2
InfiniteData | - | TanStack Query's cache shape for an infinite query: a { pages, pageParams } object holding every fetched page. | first defined: Chapter 077 L4
selector (Zustand) | store selector | Function reading just the store slice a component needs, so it re-renders only when that slice changes. | first defined: Chapter 078 L1
pmndrs | Poimandres | Open-source collective maintaining Zustand, Jotai, Valtio, React Three Fiber. | first defined: Chapter 078 L1
Redux Toolkit | RTK | Incumbent state manager built on reducers, actions, and a dispatcher; heavier ceremony than Zustand. | first defined: Chapter 078 L1
Jotai | - | Atom-based state library: state built bottom-up from small independent atoms with a derivation graph. | first defined: Chapter 078 L1
Valtio | - | Proxy-based state library; mutate state directly through a proxy, smaller ecosystem. | first defined: Chapter 078 L1
command palette | - | Global keyboard-driven action menu whose open state is read by disjoint subtrees. | first defined: Chapter 078 L1
per-feature store | - | A Zustand store with a single feature owner, co-located beside that feature; never one global useAppStore. | first defined: Chapter 078 L1
create (Zustand) | - | Zustand's React-bound factory; returns a ready-to-use hook backed by one module-scoped store. Wrong for SSR. | first defined: Chapter 078 L2
createStore (Zustand) | zustand/vanilla | Vanilla store factory with no React binding; getState/setState/subscribe. Wrap in Context for per-request stores. | first defined: Chapter 078 L2
set (Zustand) | - | The store's write function passed into the creator; functional, absolute, or replace form. | first defined: Chapter 078 L2
get (Zustand) | - | Reads the store's current state from inside an action. | first defined: Chapter 078 L2
useStore (Zustand) | - | Zustand's generic React hook; binds a vanilla store to a component via a selector. | first defined: Chapter 078 L2
slice (Zustand) | - | A self-contained factory for one feature area of a store, composed into the whole. | first defined: Chapter 078 L2
StateCreator | - | Zustand's type for a store or slice initializer; its generics wire set/get to the full store. | first defined: Chapter 078 L2
useShallow | zustand/react/shallow | Wraps a selector to compare its result shallowly, so object/array returns don't re-render on every change. | first defined: Chapter 078 L2
atomic selector | - | A selector returning one primitive (field or action), so the component re-renders only when that exact value changes; the per-field default. | first defined: Chapter 078 L2
persist (Zustand) | - | Middleware mirroring store state to browser storage so it survives a refresh. | first defined: Chapter 078 L2
data-isolation bug | data-isolation failure | One tenant's data rendered into another's response; the most serious multi-tenant failure. | first defined: Chapter 078 L2
createContext | - | React API opening a provider/consumer channel; only runs inside Client Components. | first defined: Chapter 016 L2
creator (Zustand) | creator function | The function passed to create/createStore; receives set/get and returns the initial state with its actions. | first defined: Chapter 078 L2
replace flag (Zustand) | replace mode | set's second arg (true); replaces the whole state instead of shallow-merging the partial. | first defined: Chapter 079 L2
routed wizard | - | Multi-step flow where each step is its own URL/route segment, so back/forward and deep links work. | first defined: Chapter 078 L3
draft (state) | - | Data the user is editing that isn't persisted yet; here, the in-progress customer until step 4 submits. | first defined: Chapter 078 L3
tenancy boundary | - | The moment the active tenant changes (org-switch), after which any per-tenant client cache must be cleared. | first defined: Chapter 078 L3
composite schema | composite submit schema | One Zod schema derived from the per-step schemas, validating the whole multi-step payload at submit. | first defined: Chapter 078 L3
Next-gate | next-gate | Client check greying out Next so a user can't advance with an invalid step; UX only, not security. | first defined: Chapter 079 L3
authedInputAction | authedInputAction(role, schema, fn) | Direct-object sibling of authedAction; takes a plain parsed object (no FormData), re-parses it, runs fn with parsed input plus ctx. | first defined: Chapter 079 L4
correctness boundary | - | The server-side re-parse that actually guarantees a valid write; distinct from a bypassable client gate. | first defined: Chapter 079 L4
consumeForceFailure | force-failure (action) | Verification scaffolding: reads-and-clears a per-user force-failure flag so a submit returns the real err() failure shape on demand. | first defined: Chapter 079 L4
safeLimit | safeLimit(limiter, key) | The one helper holding the fail-open policy: on a Redis outage the limiter throws, it logs and returns a passing verdict so the auth path stays up. | first defined: Chapter 080 L1
two-message discipline | two messages, one failure two readers | Every error forks at the wrapper into a sanitized user sentence and a rich operator record; never at the UI. | first defined: Chapter 080 L2
operator (error reader) | the operator | Anyone reading logs/monitoring rather than the UI: on-call engineer, support rep, auditor; gets the fat artifact. | first defined: Chapter 080 L2
read-aloud test | - | A user message is one a support rep could read aloud verbatim on a call; if it must be translated or leaks, it isn't user-shaped. | first defined: Chapter 080 L2
redactor | redaction config | The single config stripping known sensitive keys from every operator-side artifact before it's written. | first defined: Chapter 080 L2
mapError | - | One dispatch (lib/error-mapping.ts) turning any error into { code, userMessage, fieldErrors? }; the single place the split is guaranteed. | first defined: Chapter 080 L2
error digest (Next.js) | digest (error.tsx) | Stable hash Next.js hands error boundaries after stripping error.message in production; the user-facing join key into Sentry. | first defined: Chapter 080 L2
six seams | error seam catalog, error surface | The six boundaries (Server Action, route handler, page check, webhook, rate limiter, page boundary) where fail-closed and message-split must land; the app's whole error surface. | first defined: Chapter 080 L3
error seam | seam (error) | One of the six boundaries owning both error commitments, each with a wrapper and a grep that finds bypasses. | first defined: Chapter 080 L3
unstable_retry | unstable_retry() | Next.js 16.2+ error-boundary retry running router.refresh() and reset() in a transition, so it recovers a render that failed during a data fetch. | first defined: Chapter 080 L3
security header | - | A response header that is a rule the browser enforces; the server only ships the rule. | first defined: Chapter 081 L1
clickjacking | - | Luring a user into clicking an invisible framed copy of your page laid over a decoy. | first defined: Chapter 081 L1
MIME-sniffing | MIME sniffing | The browser guessing a response's type from its bytes and maybe running a non-script file as script. | first defined: Chapter 081 L1
downgrade attack | SSL-strip | An attacker forcing a connection back to plaintext http:// to read or rewrite traffic. | first defined: Chapter 081 L1
strict-dynamic | 'strict-dynamic' | CSP keyword trusting any script loaded by an already-trusted (nonced) script, dropping the origin allowlist. | first defined: Chapter 081 L1
prerendering | static prerender | Rendering a page to static HTML at build time so every visitor gets the same cached output. | first defined: Chapter 081 L1
Report-Only (CSP) | Content-Security-Policy-Report-Only | CSP mode that reports violations it would have blocked but blocks nothing; a safe dress rehearsal before enforce. | first defined: Chapter 081 L1
Permissions-Policy | - | Header turning off browser features (camera, mic, geolocation, payment) the page doesn't use. | first defined: Chapter 081 L1
Referrer-Policy | - | Header controlling how much of the URL is sent to other origins as the referrer. | first defined: Chapter 081 L1
X-Frame-Options | - | Legacy standalone header denying framing; superseded by CSP frame-ancestors, kept for old crawlers. | first defined: Chapter 081 L1
X-Content-Type-Options | nosniff | Header (nosniff) stopping MIME-sniffing so a response isn't run as script. | first defined: Chapter 081 L1
relay (abuse) | - | An endpoint an attacker drives to act on a third party; your server sends the mail or fetch under your IP and reputation. | first defined: Chapter 081 L2
inbox-bombing | email bombing | Flooding a victim's inbox with unwanted mail by abusing an open send endpoint. | first defined: Chapter 081 L2
SSRF | Server-Side Request Forgery | Attacker supplies the URL your server fetches, pointing it at an internal service or the cloud metadata endpoint. | first defined: Chapter 081 L2
fan-out (webhook) | - | The downstream work one inbound event sets off (emails, jobs, rows); the cost the event causes, separate from receiving it. | first defined: Chapter 081 L2
CAPTCHA | - | A challenge distinguishing a human from an automated client; now usually an invisible signal check. | first defined: Chapter 081 L2
Cloudflare Turnstile | Turnstile | Cloudflare's free, mostly invisible CAPTCHA gate for public endpoints when per-IP limiting runs out of road. | first defined: Chapter 081 L2
superadmin | super-admin | Platform-operator role (your own staff) that can cross tenant boundaries; its use is gated and logged. | first defined: Chapter 081 L3
right to erasure | right to be forgotten | GDPR Art. 17 right letting a person demand erasure of their personal data. | first defined: Chapter 081 L3
canonical audit-log event set | six-category event set, audit-log event catalog | Fixed list of audit-log categories (auth, membership, billing, data-export, deletion, ownership/tenancy) each mandating a co-transacted row; a project-level invariant, not a per-feature call. | first defined: Chapter 081 L3
entity.verb-pasttense | event slug, audit action name | Single-dot naming convention for an audit-log action (member.role-changed, org.ownership-transferred); past tense because the row records what happened. | first defined: Chapter 081 L3
co-transact (audit write) | in-transaction audit write | Writing the audit row inside the same db.transaction as the mutation, so a committed change can never exist without its audit record. | first defined: Chapter 081 L3
data minimization | - | GDPR principle: don't keep personal data longer than its purpose needs; the basis for automated retention limits. | first defined: Chapter 081 L4
anonymize | anonymization | Deletion shape that scrubs the PII columns and keeps the rest of the row's forensic/relational data. | first defined: Chapter 081 L4
subprocessor | subprocessor list | Third-party vendor (Stripe, Resend, PostHog) processing your users' PII; the published list is the checklist erasure must cover. | first defined: Chapter 081 L4
prior consent | - | Consent must come before processing, not after; a tracker that fires then asks has broken the rule. | first defined: Chapter 081 L5
strictly necessary | - | ePrivacy phrase for cookies exempt from consent: indispensable to a service the user actively requested. | first defined: Chapter 081 L5
granular consent | - | Per-category consent (accept analytics, refuse marketing) instead of all-or-nothing; regulators require it. | first defined: Chapter 081 L5
consent gate | cookie consent gate | Engineering gate where nothing non-essential runs until the user consents; one source of truth every tracker reads. | first defined: Chapter 081 L5
useConsent | useConsent() | The single hook returning the two category flags plus the controls; every tracker reads consent only here. | first defined: Chapter 081 L5
belt one (opt-out by default) | opting out by default | SDK ships disabled and must be turned on; governs only a module already loaded, so not sufficient alone. | first defined: Chapter 081 L5
belt two (import gate) | import gate | Dynamically importing a tracker only after its flag flips on, so the code never reaches the browser pre-consent. | first defined: Chapter 081 L5
dark pattern | - | UI designed to steer the user to the choice the business prefers; an Accept bigger than Reject is the textbook case. | first defined: Chapter 081 L5
CNIL | - | France's data-protection authority; has fined companies over asymmetric Accept/Reject banner designs. | first defined: Chapter 081 L5
EDPB | European Data Protection Board | EU body that sets and enforces consent rules; fined asymmetric banner designs. | first defined: Chapter 081 L5
data controller | controller | The party deciding why and how personal data is processed; under GDPR carries the burden of demonstrating valid consent. | first defined: Chapter 081 L5
session replay | - | A tracker that records and replays a user's actual session (clicks, scrolls, keystrokes) as a video; always consent-required. | first defined: Chapter 081 L5
marketing pixel | ad pixel | Invisible image or script an ad network loads to track a user across sites for attribution/profiling; always consent-required. | first defined: Chapter 081 L5
CCPA | - | US-California law adding a "Do Not Sell or Share" footer link; a separate right from the EU consent gate. | first defined: Chapter 081 L5
cookieless analytics | - | Analytics (e.g. Plausible) that sets no cookie and builds no profile, so it needs no consent banner. | first defined: Chapter 081 L5
publishable key | - | Public-by-design API key that only identifies an account, grants no privileged access. | first defined: Chapter 081 L6
DSN | Sentry DSN | Sentry's public ingest URL; identifies the project, accepts error events, grants no read access. | first defined: Chapter 081 L6
source map | source maps | File mapping minified production JS back to original source for readable stack traces. | first defined: Chapter 081 L7
high-entropy string | high-entropy | A value with no discernible pattern; a scanner flags it by Shannon entropy, not a known prefix. | first defined: Chapter 081 L6
break-glass copy | break-glass | Emergency-only credential copy stored apart from the normal flow, reached only when the primary store can't return the value. | first defined: Chapter 081 L6
runbook | - | A checked-in step-by-step operational procedure a teammate can follow with no prior context. | first defined: Chapter 081 L6
pre-commit hook | pre-commit | A script Git runs before finalizing a commit; aborts the commit on a non-zero exit. | first defined: Chapter 081 L6
Husky | - | Standard tool for managing Git hooks in a JS project; versions hooks in the repo and auto-installs them. | first defined: Chapter 081 L6
Gitleaks | - | Secret scanner reading the staged diff, flagging known secret patterns and high-entropy strings. | first defined: Chapter 081 L6
log drain | - | A pipe forwarding an app's logs to an external service; a place env-shaped strings can leak if unredacted. | first defined: Chapter 081 L6
sensitive flag (Vercel) | sensitive | Vercel env-var flag making a variable write-only once created; the value can't be read back out. | first defined: Chapter 081 L6
secret store | platform secret store | A deployment platform's encrypted store for production secrets (Vercel's project env vars), injected at build/runtime. | first defined: Chapter 081 L6
BFG Repo-Cleaner | BFG | Fast tool for scrubbing a leaked secret out of every commit in git history. | first defined: Chapter 081 L6
Shai-Hulud | - | Self-replicating npm worm (2025-26) that spread via hijacked maintainer tokens, re-publishing itself package to package. | first defined: Chapter 081 L8
typosquatting | typosquat | Publishing a package whose name is a near-miss of a popular one, to catch typos and AI hallucinations. | first defined: Chapter 081 L8
postinstall script | postinstall | npm lifecycle script that runs automatically after install, with full machine access. | first defined: Chapter 081 L8
exfiltration | - | Covertly shipping stolen data (secrets, tokens) off the machine. | first defined: Chapter 081 L8
exotic dependency | exotic subdep | A dependency resolved from a git repo or tarball URL rather than a package registry. | first defined: Chapter 081 L8
sandbox | sandboxed | An isolated execution context that limits what code can touch; install scripts run with none. | first defined: Chapter 081 L8
GHSA | GitHub Security Advisory | The vulnerability database pnpm keys audits against. | first defined: Chapter 081 L8
CVE | Common Vulnerabilities and Exposures | The legacy public vulnerability ID scheme. | first defined: Chapter 081 L8
advisory | security advisory | A published report that a specific package version range is vulnerable. | first defined: Chapter 081 L8
attack surface | - | Every entry point an attacker could exploit; each dependency added widens it. | first defined: Chapter 081 L8
Renovate | - | A bot that opens dependency-update pull requests, with grouping and scheduling rules. | first defined: Chapter 081 L8
Socket | - | A tool that flags packages by suspicious behavior rather than known CVEs. | first defined: Chapter 081 L8
minimumReleaseAge | - | pnpm setting quarantining freshly-published versions until they age past a cutoff (default 1440 min). | first defined: Chapter 081 L8
blockExoticSubdeps | - | pnpm setting enforcing a registry-only contract across the transitive tree. | first defined: Chapter 081 L8
allowBuilds | - | pnpm map permitting named packages to run install scripts; everything else is skipped. | first defined: Chapter 081 L8
strictDepBuilds | - | pnpm setting failing the install when an un-acknowledged dependency wants to run a build script. | first defined: Chapter 081 L8
onlyBuiltDependencies | - | pnpm 10 build allow-list array, replaced by the allowBuilds map in v11. | first defined: Chapter 081 L8
Dependabot | - | A bot that opens dependency-update pull requests; a post-install signal, not a pre-install defense. | first defined: Chapter 081 L8
audit target | - | The read-only running project, seeded with defects, that an audit pass reads against its rules. | first defined: Chapter 082 L1
finding | audit finding | Written write-up of one defect: the rule it breaks, its location, its consequence, and the fix. | first defined: Chapter 082 L1
stored XSS | stored cross-site scripting | XSS whose payload is saved in the database and fires for every reader who later loads the page; worse than reflected XSS, which needs a crafted-URL lure. | first defined: Chapter 082 L3
system of record | authoritative record | The one store treated as the authoritative copy of a fact (audit_logs for ownership history); a gap in it makes the history unrecoverable. | first defined: Chapter 082 L4
finding severity | severity (high vs critical) | The blast-radius rating of a finding; a lost audit record on a correct mutation is high, a bypassed access gate is critical. | first defined: Chapter 082 L4
x-nonce | x-nonce header | Request header proxy.ts sets to thread the per-request CSP nonce to Server Components, which stamp it on their script tags. | first defined: Chapter 082 L5
frame-ancestors | - | CSP directive controlling who may frame the page; the modern replacement for X-Frame-Options. | first defined: Chapter 082 L5
abusable endpoint | - | Endpoint needing a limiter because it hits a trigger: costs money per call, can attack a third party, or touches state addressable without auth. | first defined: Chapter 081 L2
rate-limit coverage | coverage rule, three triggers | Rule that every abusable endpoint routes through a named limiter; an endpoint is abusable if it matches any one of three triggers. | first defined: Chapter 081 L2
coverage matrix | rate-limit coverage matrix | Table with one row per abusable endpoint recording file, limiter, key strategy, and covered Y/N; gaps tracked as open rows, not dropped. | first defined: Chapter 081 L2
retention catalog | retention map | The full inventory of every table and external service holding a user's PII that an erasure request must clear. | first defined: Chapter 081 L4
storage, domain, edge | three-layer split | The architecture for time: timestamptz in storage, Temporal in the domain, a localized string at the edge, ISO 8601 between them. | first defined: Chapter 083 L1
session TimeZone | TimeZone setting | Per-connection Postgres setting that interprets timestamptz input and renders output text; never changes the stored bytes. | first defined: Chapter 083 L1
mode (Drizzle column) | column mode | Per-column Drizzle option picking the JS type a column reads back as ('date' a Date, 'string' raw Postgres text). | first defined: Chapter 083 L1
calendar day | calendar-day value | A day everyone shares (May 15 everywhere), no time or zone; not an instant. Stored as date + PlainDate. | first defined: Chapter 083 L2
dateColumn | - | The customType codec pairing a Postgres date column with Temporal.PlainDate; parse string in, toString out. | first defined: Chapter 083 L2
overflow (Temporal) | overflow option, constrain, reject | Temporal arithmetic option: 'constrain' (default) clamps impossible results, 'reject' throws a RangeError. | first defined: Chapter 083 L2
month-end clamping | month clamp | Default Temporal behavior: Jan 31 + 1 month lands on Feb 28 (last valid day), not March. | first defined: Chapter 083 L2
toZonedDateTime | - | PlainDate method attaching a named timeZone and plainTime to bridge a calendar day to a ZonedDateTime, then an Instant. | first defined: Chapter 083 L2
tzdata | IANA time zone database, tz database | Platform-bundled data mapping an IANA name to the right offset at any instant; updated several times a year. | first defined: Chapter 083 L3
Intl.supportedValuesOf | supportedValuesOf | API returning the platform's known IANA timezone names; Chromium and Node omit Etc/* so 'UTC' is usually missing. | first defined: Chapter 083 L3
Invalid time zone RangeError | RangeError invalid time zone | Thrown when any Intl or Temporal call gets an IANA name the runtime can't resolve; why timezones are validated at the write edge. | first defined: Chapter 083 L3
timezone validation by acceptance | acceptance check | Validate a zone by trying new Intl.DateTimeFormat({ timeZone }) in try/catch, not membership in supportedValuesOf. | first defined: Chapter 083 L3
user-asserted (timezone) | user-asserted not authoritative | A client-reported value the user owns and can correct, accepted as a default but not treated as ground truth. | first defined: Chapter 083 L3
cadence | - | How often a job runs, independent of wall-clock time; when only frequency matters, run in UTC. | first defined: Chapter 083 L4
disambiguation | disambiguation option | Temporal option for which instant a wall-clock time resolves to in a DST gap or repeat ('compatible' default, 'reject' throws). | first defined: Chapter 083 L4
spring forward | spring-forward gap | DST transition where the clock jumps an hour ahead, so an hour does not exist; a time in it has no instant. | first defined: Chapter 083 L4
fall back | fall-back repeat | DST transition where the clock drops an hour back, so an hour happens twice; a time in it has two instants. | first defined: Chapter 083 L4
one-shot (schedule) | one-shot job | A job that fires once at a pre-computed instant (wait.until), not on a recurring cron; settle this before the zone question. | first defined: Chapter 083 L4
add/subtract (Temporal) | add, subtract | Immutable Temporal methods returning a new instance shifted by a named-component duration ({ days: 30 }). | first defined: Chapter 083 L5
since/until (Temporal) | since, until | Temporal methods measuring the Duration between two points; a.since(b) positive when a is later, until is the opposite sign. | first defined: Chapter 083 L5
largestUnit | - | since/until option naming the biggest unit a Duration may use; months/years throw on an Instant (no calendar). | first defined: Chapter 083 L5
with (Temporal) | with(fields) | Returns a new instance with the named fields replaced, the rest untouched; use for period starts, not round. | first defined: Chapter 083 L5
round (Temporal) | round | Snaps a whole value to a grid via smallestUnit, roundingIncrement, roundingMode; for bucketing and input snapping. | first defined: Chapter 083 L5
roundingMode | - | round option choosing how to break ties and which way to round: floor, ceil, trunc, halfExpand. | first defined: Chapter 083 L5
compare (Temporal) | Temporal.compare | Static per-type method returning -1/0/1 for sort; equals/before/after are the boolean instance forms. | first defined: Chapter 083 L5
ISO 8601 duration string | P grammar | Text form of a Duration: P30D is 30 days, P1M one month, PT12H twelve hours; the wire/DB form of a span. | first defined: Chapter 083 L5
next-intl | - | The 2026 Next.js i18n library: t() function, JSON catalog format, App Router wiring. | first defined: Chapter 084 L1
translation key | i18n key, key | Stable dot-path string code holds (inbox.greeting); resolves to per-language text. | first defined: Chapter 084 L1
catalog (i18n) | message catalog | Per-language JSON file holding the actual text, keyed by the same string code holds. | first defined: Chapter 084 L1
key namespace (i18n) | namespace | Top-level segment of a key grouping strings by feature (invoice, auth). | first defined: Chapter 084 L1
leaf (i18n key) | - | Final key segment naming the string's role (title, cta), not its English words. | first defined: Chapter 084 L1
named placeholder | named slot | A slot identified by name ({count}, {name}) the translator can reorder and the engineer fills. | first defined: Chapter 084 L1
positional placeholder | - | A slot identified by argument order (%s, {0}) rather than name; can't be reordered or renamed in translation. | first defined: Chapter 084 L1
wire format | - | The shared format two parties exchange data through; here the JSON catalog between engineer and translator. | first defined: Chapter 084 L1
ICU MessageFormat | - | Unicode-standard syntax inside a catalog entry for plurals, gendered forms, and more. | first defined: Chapter 084 L1
TMS | Translation Management System | SaaS where translators work, syncing translations back to the catalog (Lokalise, Crowdin, Tolgee, Phrase). | first defined: Chapter 084 L1
source language | i18n fallback language | The complete catalog every key must have (en-US here); other languages fall back to it per missing key. | first defined: Chapter 084 L1
per-key fallback | - | When a language lacks a key, rendering the source-language string for that key only, not the whole file. | first defined: Chapter 084 L1
t.rich | - | next-intl call rendering a catalog string with inline tags to real JSX, the component supplied from code. | first defined: Chapter 084 L1
International Components for Unicode | ICU | Reference C/Java implementation whose message syntax the i18n ecosystem adopted. | first defined: Chapter 084 L2
CLDR | Unicode Common Locale Data Repository | Open dataset of per-language formatting and grammar rules every Intl formatter and ICU implementation reads. | first defined: Chapter 084 L2
plural | ICU plural | ICU selector keyword branching a cardinal count into the locale's plural categories. | first defined: Chapter 084 L2
plural categories | - | CLDR's per-language buckets (zero one two few many other) deciding which numbers take which grammatical form. | first defined: Chapter 084 L2
cardinal | - | A plain counting number (1, 2, 3); what the plural keyword branches on. | first defined: Chapter 084 L2
ordinal | - | A position number (1st, 2nd, 3rd); branches on a different CLDR rule set than cardinals. | first defined: Chapter 084 L2
selectordinal | - | ICU selector keyword branching an ordinal on CLDR's ordinal rules. | first defined: Chapter 084 L2
select (ICU) | - | ICU selector keyword branching on a literal string value (gender, role, type) with a mandatory other. | first defined: Chapter 084 L2
# token (ICU) | - | Inside a plural branch, the selector value rendered as a locale-aware number; distinct from re-interpolating {count}. | first defined: Chapter 084 L2
Intl.PluralRules | - | Native browser API mapping a number to its CLDR plural category for a locale. | first defined: Chapter 084 L2
MessageFormat 2 | MF2 | Next version of ICU message syntax with explicit input/local/match declarations; standardizing as of 2026. | first defined: Chapter 084 L2
Intl.* family | Intl namespace | Built-in locale formatters (NumberFormat, DateTimeFormat, RelativeTimeFormat, Collator, ListFormat, DisplayNames...); construct once, .format(value). | first defined: Chapter 084 L3
Intl.DateTimeFormat | - | Locale+timeZone date/time formatter; accepts Temporal types but throws TypeError on ZonedDateTime. | first defined: Chapter 084 L3
Intl.RelativeTimeFormat | - | Locale formatter for "3 days ago"/"in 3 days" from a signed number and one unit. | first defined: Chapter 084 L3
Intl.Collator | - | Locale-aware string comparator; .compare plugs into Array.sort, with numeric/sensitivity/usage options. | first defined: Chapter 084 L3
Intl.ListFormat | - | Locale-aware joiner for lists (conjunction/disjunction/unit); replaces array.join(', '). | first defined: Chapter 084 L3
Intl.DisplayNames | - | Locale-aware names for languages, regions, currencies; .of(code) returns the display string. | first defined: Chapter 084 L3
BCP 47 | language tag, RFC 5646 | IETF language tag (language-REGION, e.g. en-US); the region subtag distinguishes en-US from en-GB. | first defined: Chapter 084 L3
locale resolution chain | resolution chain | Fixed-order check (URL prefix, profile, cookie, Accept-Language best-match, default) picking one locale per request; first hit wins. | first defined: Chapter 084 L4
Accept-Language | - | Request header carrying the browser's ranked BCP 47 tags with q-values; a hint, not the truth. | first defined: Chapter 084 L4
q-value | quality value | Weight 0-1 on each Accept-Language tag; higher ranks higher. | first defined: Chapter 084 L4
RFC 4647 | - | IETF spec for matching a requested tag against available ones; Lookup (single best) vs Filter (all). | first defined: Chapter 084 L4
Lookup (RFC 4647) | - | Matching strategy returning the single best tag, getting less specific (strip subtag) until a hit, else default. | first defined: Chapter 084 L4
best fit | - | Distance-based, region-aware locale match; match() default, always does at least as much as Lookup. | first defined: Chapter 084 L4
ponyfill | - | A polyfill imported and called by name rather than patching globals; opt-in. | first defined: Chapter 084 L4
@formatjs/intl-localematcher | match() | Ponyfill exposing match(requested, available, default); best-matches tags, does not parse Accept-Language. | first defined: Chapter 084 L4
negotiator | Negotiator | Package parsing a raw Accept-Language header into ranked tags; pairs with match(). | first defined: Chapter 084 L4
TC39 Stage 1 | - | Earliest formal TC39 proposal stage: worth exploring, not shippable. | first defined: Chapter 084 L4
NEXT_LOCALE | locale cookie | Cookie holding an anonymous visitor's switcher choice; written only on a genuine override, session-scoped by default. | first defined: Chapter 084 L4
Content-Language | - | Response header naming the locale of the returned content; crawlers and proxies read it. | first defined: Chapter 084 L4
middleware | - | Code that runs before a route renders; in Next.js 16 it lives in proxy.ts. | first defined: Chapter 084 L5
static rendering | static render | HTML built once at build time and served from cache, not rebuilt per request. | first defined: Chapter 084 L5
matcher (proxy) | proxy matcher | Path pattern (negative-lookahead regex) deciding which requests proxy.ts runs on; excludes API routes, framework internals, and file extensions. | first defined: Chapter 084 L5
hreflang | hreflang alternate | HTML link annotation declaring a page's language/region alternates; clusters same-content variants so search engines rank the right locale and pool authority. | first defined: Chapter 084 L6
SERP | search engine results page | The list of results a search engine shows for a query. | first defined: Chapter 084 L6
x-default | - | Pseudo-locale hreflang entry naming the fallback URL for users whose language matches none of the declared alternates; pointed at the default locale. | first defined: Chapter 084 L6
self-canonical | - | Each locale variant declaring its own localized URL as canonical, not the default-locale original; the rule that keeps translations indexable. | first defined: Chapter 084 L6
sitemap index | - | Root sitemap.xml that lists no URLs itself but points at child sitemaps, often one per locale; a scale option above a single sitemap.ts. | first defined: Chapter 084 L6
noindex | robots index:false | Per-page directive (metadata.robots index:false) telling Google to crawl but not index/rank a page; distinct from robots.txt, which blocks crawling. | first defined: Chapter 084 L6
setRequestLocale | - | next-intl call opting a segment into static rendering; must run before any other next-intl call in the segment. | first defined: Chapter 085 L2
hasLocale | - | next-intl type guard validating a string against routing.locales; narrows the type and gates notFound(). | first defined: Chapter 085 L2
getRequestConfig | - | next-intl/server seam evaluated once per request to resolve the locale and load its catalog; must stay prerender-safe. | first defined: Chapter 085 L2
getTranslations | - | next-intl/server async translator for Server Components, scoped to a namespace. | first defined: Chapter 085 L2
useTranslations | - | next-intl hook translator for Client Components, scoped to a namespace. | first defined: Chapter 085 L2
NextIntlClientProvider | - | next-intl provider passing the (pick-scoped) message catalog to Client Components. | first defined: Chapter 085 L2
useFormatter | - | next-intl hook returning a formatter wired to the request locale and shared formats presets; format.dateTime/number/relativeTime inside the render tree. | first defined: Chapter 084 L5
Formats type | - | next-intl's preset-config type with slots only for dateTime/number/list/displayName; no relativeTime slot. | first defined: Chapter 085 L3
narrowSymbol | currencyDisplay narrowSymbol | currencyDisplay option rendering the short currency glyph ($, €) instead of US$ or USD. | first defined: Chapter 085 L3
minor units | minor currency units | Smallest currency denomination money is stored in (integer cents); divide by 100 at display. | first defined: Chapter 085 L3
self-referential (hreflang) | - | Rule that each page's hreflang set must list its own locale, not just the others; Google ignores the cluster otherwise. | first defined: Chapter 085 L4
bidirectional (hreflang) | mutual hreflang | Rule that hreflang links must be reciprocal: if A points at B, B must point back at A, else Google drops the declaration. | first defined: Chapter 085 L4
localePrefix as-needed | as-needed prefix | next-intl routing option leaving the default locale unprefixed while every other locale gets a URL prefix. | first defined: Chapter 085 L4
getPathname | - | next-intl locale-aware path builder; given a locale and href, returns the correctly prefixed pathname. | first defined: Chapter 085 L4
Vitest | - | Vite-native test runner with a Jest-compatible API; runs ESM and TS with no extra transform. | first defined: Chapter 086 L1
Vite | - | Fast ESM-native, TypeScript-aware build tool and dev server this project runs on. | first defined: Chapter 086 L1
ESM | ECMAScript Modules, ES modules | The import/export module standard, vs CommonJS require. | first defined: Chapter 086 L1
HMR | hot module replacement | Swapping a changed module without a full reload. | first defined: Chapter 086 L1
jsdom | - | In-memory implementation of the browser DOM so Node can run browser-expecting code. | first defined: Chapter 086 L1
ambient globals | - | Names available in every file without an import (e.g. describe/it/expect under globals:true). | first defined: Chapter 086 L1
dotenv | - | Library that reads a .env file into process.env. | first defined: Chapter 086 L1
test runner | - | Tool that collects, executes, and reports test files (here, Vitest). | first defined: Chapter 086 L1
watch mode | - | Runner mode that stays alive and re-runs dependent tests on each save. | first defined: Chapter 086 L1
test projects | projects | Named config slices, each with its own environment and include glob, run in one root config. | first defined: Chapter 086 L1
test pyramid | pyramid | Test-shape advice: many unit tests at a wide base, fewer integration, a thin E2E cap; fits deep-logic systems. | first defined: Chapter 086 L2
testing honeycomb | honeycomb | Integration-centered test shape (Spotify); widest band in the middle, thin layers above and below; fits boundary-heavy systems. | first defined: Chapter 086 L2
testing trophy | trophy | Kent C. Dodds test shape, integration-centered with a static (types+lint) base; client-app framing. | first defined: Chapter 086 L2
unit test | - | Test of pure /lib logic: same input, same output, no DB/network/framework; cheap, no fixtures. | first defined: Chapter 086 L2
integration test | - | Test exercising a seam against a real test DB and auth fixture; the honeycomb's center of gravity. | first defined: Chapter 086 L2
component test | - | Test of a UI component's behavior (React Testing Library); conditional, earned by a trigger. | first defined: Chapter 086 L2
end-to-end test | E2E test | Test of a whole multi-step money path through the stack (Playwright); thin band, zero or four by year one. | first defined: Chapter 086 L2
snapshot test | - | Test asserting serialized output matches a saved copy; worth it only for a contract a caller depends on. | first defined: Chapter 086 L2
shape follows the bug | - | Heuristic: pick the test layer by where the bug lands, not by a target shape. | first defined: Chapter 086 L2
arrange-act-assert | AAA | Three-part test shape: arrange inputs/fixtures, act once on the unit, assert the outcome, separated by blank lines. | first defined: Chapter 086 L4
black-box test | black-box experiment | Test that asserts only what survives swapping the implementation for another satisfying the same contract; the behavior-vs-implementation check. | first defined: Chapter 086 L4
matcher (assertion) | Vitest matcher | The expect call (toBe, toMatchObject, toThrow…) chosen so a failure's diff names what broke. | first defined: Chapter 086 L4
BDD | behavior-driven development | Given/when/then phrasing of a behavior; the same arrange-act-assert shape under different vocabulary. | first defined: Chapter 086 L4
spy | test spy, vi.spyOn | Test double wrapping a real function to record/force its calls; arrange dependencies with it, never assert on it. | first defined: Chapter 086 L4
spy smell | - | Asserting your mock was called with values you wired in (toHaveBeenCalledWith); verifies setup, not the function. | first defined: Chapter 086 L4
MSW | Mock Service Worker | Intercepts outgoing HTTP at the network layer so tests stub the request/response, not the calling function. | first defined: Chapter 086 L4
coverage | test coverage, code coverage | Percentage of source that ran while tests executed; a record of what was reached, not a quality score. | first defined: Chapter 086 L3
line coverage | - | Whether each source line executed during the suite; least connected to where bugs live. | first defined: Chapter 086 L3
branch coverage | - | Whether each side of every decision (if/case/&&/?:/catch) was taken; read before line coverage. | first defined: Chapter 086 L3
statement coverage | - | Whether each statement ran; close to lines, but several statements can share one line. | first defined: Chapter 086 L3
function coverage | - | Whether each function was called at least once. | first defined: Chapter 086 L3
branch (coverage) | decision point | A point with more than one outcome (each if side, case, && short-circuit) that branch coverage tracks. | first defined: Chapter 086 L3
V8 | - | The JS engine in Node and Chrome; reports which code ran for free, how v8-provider coverage is gathered. | first defined: Chapter 086 L3
instrumentation (coverage) | - | Rewriting source to insert hit counters before running it (Istanbul); what the V8 provider avoids. | first defined: Chapter 086 L3
coverage theatre | - | Tests that raise coverage but assert nothing; pass and fail only if deleted. | first defined: Chapter 086 L3
mutation testing | - | Mutating source (flip operators, delete branches) and checking whether any test fails; measures what is checked, not just what ran. | first defined: Chapter 086 L3
Stryker | StrykerJS | The mutation-testing tool; named as a mental model, not installed in the course. | first defined: Chapter 086 L3
differential coverage | per-PR coverage | How much of a change's added code is covered by that change's own tests; the per-PR view vs the whole-codebase average. | first defined: Chapter 086 L3
coverage threshold | backstop | A CI floor catching a previously-tested seam losing coverage; a backstop, not a target to climb toward. | first defined: Chapter 086 L3
coverage.include | - | Vitest 4 globs pulling never-imported files into the report at 0% instead of vanishing; replaces removed coverage.all. | first defined: Chapter 086 L3
test colocation | colocate (test) | Source and its test file living side by side in the same folder, not mirrored into a separate tests/ tree. | first defined: Chapter 087 L1
globals: false | - | Vitest setting requiring describe/it/expect to be imported per file rather than injected as ambient globals. | first defined: Chapter 087 L1
expect.extend | - | Vitest API for registering a project-wide custom matcher. | first defined: Chapter 087 L1
custom matcher | - | A registered expect.* assertion (via expect.extend) returning { pass, message } so a domain failure reads as a sentence. | first defined: Chapter 087 L1
it.each | table-driven test | Vitest table form: one row per case, $token fields interpolated into the test name, collapsing near-identical it blocks. | first defined: Chapter 087 L1
no-restricted-paths | - | Lint rule that structurally blocks a /lib file from importing app/, enforcing the dependency direction. | first defined: Chapter 087 L1
test data factory | factory, buildUser | Function returning a fresh, valid in-memory domain object per call, with an overrides-last spread; for one test row. | first defined: Chapter 087 L2
run-order coupling | - | A test's outcome depends on whether, and in what order, other tests ran first. | first defined: Chapter 087 L2
false negative | - | A test that passes while the code it covers is actually broken. | first defined: Chapter 087 L2
InferSelectModel | - | Drizzle helper inferring a row's TS type from a table's schema, so the type tracks the schema. | first defined: Chapter 087 L2
monotonic | - | Only ever increases, never repeats a value. | first defined: Chapter 087 L2
sequence helper | sequence | A counter that hands out the next number each call; unique and deterministic, reset per test. | first defined: Chapter 087 L2
object mother | - | Named-fixture pattern (anExpiredInvoice()) returning a ready-made entity; an override-spread factory replaces it. | first defined: Chapter 087 L2
static fixture | - | Captured external payload (e.g. a Stripe webhook) used verbatim, when its exact shape is under test. | first defined: Chapter 087 L2
flaky | flaky test | A test whose pass/fail result changes without the code under test changing. | first defined: Chapter 087 L3
frozen instant | - | A fixed Temporal.Instant a test pins "now" to so the clock never moves. | first defined: Chapter 087 L3
clock seam | clock.now | The lib/clock.ts module routing every "now" read through one swappable point. | first defined: Chapter 087 L3
fake timers | vi.useFakeTimers | Vitest replacing Date/setTimeout/setInterval with fakes you advance manually; does not patch Temporal.Now. | first defined: Chapter 087 L3
vi.setSystemTime | setSystemTime | Sets the fake wall clock to a fixed moment under fake timers. | first defined: Chapter 087 L3
module mock | vi.mock | Replacing a whole imported module with a stub for the test file; vi.mock is hoisted above imports. | first defined: Chapter 087 L3
seed (PRNG) | fixed seed | The fixed starting value making a pseudo-random stream reproducible; same seed, same sequence. | first defined: Chapter 087 L3
jitter | backoff jitter | A small random offset added to a retry delay so clients don't retry in lockstep. | first defined: Chapter 087 L3
type-level test | type test, *.test-d.ts | Test whose assertions are checked by tsc, not by running code; proves a signature, union, or type shape. | first defined: Chapter 087 L4
expectTypeOf | - | Vitest type-test wrapper exposing a value's or type's type for matcher assertions; erased at runtime. | first defined: Chapter 087 L4
tsc --noEmit | noEmit | Run tsc for diagnostics only: type-check and report errors, produce no JS output. | first defined: Chapter 087 L4
vitest --typecheck | typecheck pass | Vitest flag running tsc --noEmit over *.test-d.ts files and reporting type errors as failed tests. | first defined: Chapter 087 L4
assignability | one-way assignability | A value of type A usable where B is expected; one-directional, A-to-B does not imply B-to-A. | first defined: Chapter 087 L4
bidirectional equality | type equality | A equals B requires A assignable to B and B assignable to A; neither wider; what toEqualTypeOf checks. | first defined: Chapter 087 L4
toEqualTypeOf | - | expectTypeOf matcher for exact bidirectional type equality; the default reach. | first defined: Chapter 087 L4
toExtend | - | expectTypeOf matcher for one-way assignability (is-a / subtype); replaces deprecated toMatchTypeOf. | first defined: Chapter 087 L4
toMatchObjectType | - | expectTypeOf matcher checking an object type against a subset of its keys; type-level toMatchObject. | first defined: Chapter 087 L4
assertType | - | Vitest helper asserting a single expression has type T, like a typed binding without the throwaway const. | first defined: Chapter 087 L4
@ts-expect-error | ts-expect-error | Directive expecting the next line to fail type-checking; errors as "unused" if the line type-checks. | first defined: Chapter 087 L4
silent pass | - | A test reporting green while the code is broken; a false negative, usually from an unawaited async assertion. | first defined: Chapter 087 L5
.resolves / .rejects | resolves, rejects | expect modifiers unwrapping a promise and applying a normal matcher to its settled value (resolved or thrown). | first defined: Chapter 087 L5
expect.assertions(n) | expect.assertions | Declares a test must run exactly n assertions; fails if it ends having run fewer, catching skipped branches. | first defined: Chapter 087 L5
expect.hasAssertions() | hasAssertions | Looser sibling of expect.assertions; only checks at least one assertion ran. | first defined: Chapter 087 L5
expect.fail | - | Forces a test to fail at that line; used in a try after the call so a non-throwing bug fails instead of skipping the catch. | first defined: Chapter 087 L5
*Async timer family | advanceTimersByTimeAsync, runAllTimersAsync, runOnlyPendingTimersAsync | Awaited fake-timer methods that fire the timer and drain the microtasks it schedules; sync variants stop at the timer. | first defined: Chapter 087 L5
toEqual | - | Vitest matcher, exhaustive deep equality; the object must have exactly the named fields and no others. | first defined: Chapter 087 L6
toContainEqual | - | Vitest matcher asserting an array contains an element deep-equal to the expected one, ignoring length and order. | first defined: Chapter 087 L6
asymmetric matcher | expect.any, expect.objectContaining | Matcher placed inside an expected object to assert a field's presence/type without pinning its exact value. | first defined: Chapter 087 L6
not.toThrow | - | Asserts a wrapped call completes without throwing; an absence check, pair with a positive assertion. | first defined: Chapter 087 L6
it.fails | - | Inverts a test's verdict so it passes only when its assertions fail; for recording a known-broken behavior with a tracking issue. | first defined: Chapter 087 L6
withRollback | - | Test wrapper opening a transaction, running the body on tx, then throwing a sentinel to force rollback; isolation comes from the rollback, not cleanup. | first defined: Chapter 088 L1
RollbackSignal | - | Module-private Error subclass thrown to roll back the test transaction; the wrapper catches only it and swallows it. | first defined: Chapter 088 L1
DbOrTx | - | Type union of the db singleton and a live Transaction; query helpers take it so a fn may run inside a tx. | first defined: Chapter 088 L1
explicit db handle | database handle injection | Passing the db/tx as a defaulted argument so production uses the singleton and tests pass tx; the course default over AsyncLocalStorage. | first defined: Chapter 088 L1
tautology (test) | - | A test that can only pass; asserts the same inputs it supplied, so a green result carries no information. | first defined: Chapter 088 L1
23502 | not-null violation | Postgres error code for a NOT NULL violation: a write left a required column empty. | first defined: Chapter 088 L1
TRUNCATE (SQL) | - | SQL that empties a table fast but commits outside any transaction, so a rollback can't undo it. | first defined: Chapter 088 L1
sentinel error | RollbackSignal | A private error value thrown only as a control-flow signal, never surfaced to the caller. | first defined: Chapter 088 L1
AsyncLocalStorage | als | Node API carrying a value through an async call chain without passing it as an argument; request-scoped context. | first defined: Chapter 088 L1
sequence (Postgres) | nextval | The counter Postgres uses for serial/identity columns; advancing it is not transactional, a rollback doesn't give the number back. | first defined: Chapter 088 L1
pg_notify | - | Postgres pub/sub command emitting a message to listeners; fires immediately, not on commit, so a rollback can't recall it. | first defined: Chapter 088 L1
no-restricted-imports | - | ESLint rule banning imports of specific module paths from specific files. | first defined: Chapter 088 L1
VITEST_POOL_ID | - | Vitest env var holding the current worker's index (1..N, <= maxWorkers); stable per worker, the routing key for per-worker databases. | first defined: Chapter 088 L2
Vitest worker | - | A long-lived process/thread that boots once and runs many test files in sequence; one per pool slot. | first defined: Chapter 088 L2
globalSetup (Vitest) | - | Vitest setup running once in the main process before/after the whole suite; no test globals, no VITEST_POOL_ID. | first defined: Chapter 088 L2
setupFiles (Vitest) | - | Vitest setup running once per worker inside the worker, before its files; VITEST_POOL_ID is set. | first defined: Chapter 088 L2
maxWorkers | - | Flat Vitest test-block key capping worker count (Vitest 4, replaced poolOptions); a performance dial, not correctness. | first defined: Chapter 088 L2
fsync (Postgres) | - | Postgres setting forcing each commit to physical disk before acknowledging; off trades crash-durability for speed, safe only on throwaway databases. | first defined: Chapter 088 L2
signedInAs | - | Auth fixture inserting a real user/org/session through tx and stubbing getSession; returns the signed-in test context. | first defined: Chapter 088 L3
anonymous (fixture) | - | Signed-out counterpart of signedInAs: resolves getSession to null, sets Origin=Host; names the no-session case. | first defined: Chapter 088 L3
aliasing (test) | - | Two tests referencing the same record by a shared hardcoded id, so a write in one changes what the other reads. | first defined: Chapter 088 L3
CookieJar | cookie jar | Map-backed stand-in exposing cookies()'s get/set surface so an action's cookie reads resolve in a test. | first defined: Chapter 088 L3
FROZEN | - | The named canonical frozen test instant (2026-01-15T12:00:00Z) the clock seam returns instead of the wall clock. | first defined: Chapter 088 L3
membership row | membership | Join row recording a user's role within one org; requireOrgUser reads it to resolve identity and tenant. | first defined: Chapter 088 L3
NEXT_REDIRECT | - | Sentinel Next.js redirect() throws to unwind the request; the auth ladder throws it instead of returning an error Result. | first defined: Chapter 088 L3
application/x-www-form-urlencoded | form-urlencoded | Key/value body encoding HTML forms post (a=1&b=2, nested keys flattened); Stripe's v1 API speaks this, not JSON. | first defined: Chapter 088 L4
contract test | - | Test run against a provider's live sandbox API on a schedule (nightly, not per commit) to catch when boundary-mock assumptions have drifted from reality. | first defined: Chapter 088 L4
setupServer | - | MSW's Node-side request interceptor; constructed once with default handlers, driven via listen/use/resetHandlers/close. | first defined: Chapter 088 L5
MSW v2 | - | The Oct 2023 MSW rewrite: http replaced rest, resolvers return an HttpResponse directly instead of res(ctx.json(...)). | first defined: Chapter 088 L5
resolver (MSW) | - | Function MSW calls when a request matches; receives { request, params, cookies, requestId } and returns an HttpResponse. | first defined: Chapter 088 L5
MSW handler | request handler | Method+URL matcher plus a resolver; default handlers state the happy-path contract, overrides stack on top. | first defined: Chapter 088 L5
HttpResponse | - | MSW's response builder: .json/.text/.error()/raw constructor for the reply a resolver returns. | first defined: Chapter 088 L5
server.use | - | Pushes handlers on top of the defaults for the current test; resetHandlers() in afterEach strips them. | first defined: Chapter 088 L5
once (MSW) | once: true | Handler option (third arg to http.*) making a handler answer exactly one matching request, then retire. | first defined: Chapter 088 L5
onUnhandledRequest | - | setupServer.listen policy; 'error' makes any request with no matching handler throw instead of passing through. | first defined: Chapter 088 L5
clone-and-capture | - | Test pattern: clone the request inside the resolver, push the copy into a per-test array, assert on it after the act. | first defined: Chapter 088 L5
raw body | raw-body invariant | The exact bytes off the wire before parsing; what Stripe's signature covers, so re-serializing breaks verification. | first defined: Chapter 088 L6
generateTestHeaderString | stripe.webhooks.generateTestHeaderString | Stripe SDK helper that builds a valid Stripe-Signature header for a payload+secret; the exact inverse of constructEvent, for signing test fixtures. | first defined: Chapter 088 L6
tolerance window | - | Stripe's 300-second freshness bound on a signature timestamp; an older one is rejected as a replay even though the HMAC is genuine. | first defined: Chapter 088 L6
isRedirectError | - | Next.js helper that tests whether a caught error is a NEXT_REDIRECT; lets production code tell a redirect throw from a real error. | first defined: Chapter 088 L7
clearAllMocks | vi.clearAllMocks | Vitest reset wiping every mock's recorded call history between tests so one test's calls don't leak into the next. | first defined: Chapter 088 L7
isolation (test) | isolated test | Each test runs against a clean world with no row, mock, handler, or timer left by an earlier test. | first defined: Chapter 088 L8
two-bucket model | two buckets | Every flake is a state leak or an order/nondeterminism bug; the bucket dictates the fix shape. | first defined: Chapter 088 L8
state leak | leak (test) | A test leaves a mutation behind (row, handler, mock, timer, shared array) and the next test inherits it; passes alone, fails in suite. | first defined: Chapter 088 L8
order dependency | order/nondeterminism | A test passes only because of when it ran (run order, wall-clock time, random value); fixed by removing the dependency. | first defined: Chapter 088 L8
repeats | { repeats: N } | Per-test Vitest option running the test N times in one go to measure its flake rate on demand. | first defined: Chapter 088 L8
--sequence.shuffle.files | shuffle flag | Vitest flag randomizing the order test files run in, surfacing cross-file leaks and order dependencies. | first defined: Chapter 088 L8
--retry (test) | vitest --retry | Re-runs a failing test until one attempt passes and reports green; forbidden for test-logic flake because it hides the cause. | first defined: Chapter 088 L8
infrastructure flake | infra flake | Nondeterminism outside your test (CI network blip, slow container start, external sandbox timeout); the one place a scoped retry is legitimate. | first defined: Chapter 088 L8
quarantine (test) | quarantine | Visibly skipping a flaky test out of the CI gate (it.skipIf(CI)) with an owner, issue, and date; buys time, never the fix. | first defined: Chapter 088 L8
mocking too deep | mock too deep | A component test reaching past its layer to assert a Server Action's database effect; re-tests the seam. | first defined: Chapter 089 L1
within (RTL) | within(el) | Testing Library helper scoping a query to inside one element (e.g. a row), so it matches there not page-wide. | first defined: Chapter 089 L4
virtualization (list) | virtualizer | Rendering only the rows in view and recycling DOM nodes on scroll, so a long list stays cheap. | first defined: Chapter 089 L4
storageState | - | JSON snapshot of a browser context's cookies and storage, replayed into a fresh context to restore auth without driving the login UI. | first defined: Chapter 090 L2
project (Playwright) | - | A named Playwright run configuration: a set of tests plus the settings and dependencies they run under. | first defined: Chapter 090 L2
readiness probe | - | A URL Playwright's webServer polls before starting tests, so the first test doesn't race the server's boot. | first defined: Chapter 090 L2
locator (Playwright) | page.getByRole | A role-first handle to an element (getByRole > getByLabel > getByText > getByTestId); auto-waits when acted on. | first defined: Chapter 090 L2
auto-waiting | - | Playwright retries an action or assertion until the element is ready (attached, visible, stable, enabled) or it times out; no manual sleeps. | first defined: Chapter 090 L2
web-first matcher | - | A Playwright expect matcher (toBeVisible, toHaveURL) that polls until it holds or times out; passes silently if not awaited. | first defined: Chapter 090 L2
trace viewer | show-trace | Playwright's post-mortem GUI opened from a trace.zip: per-action DOM snapshot, network, console, screenshot, source-mapped stack. | first defined: Chapter 090 L2
codegen | playwright codegen | Playwright tool that records clicks and typing in a live browser as spec code, generating locators; rough out then fix brittle selectors. | first defined: Chapter 090 L2
sharding | --shard | Splitting a test suite across parallel CI jobs; pays off only past ~10-15 min of runtime. | first defined: Chapter 090 L2
bug density | - | How thickly real bugs cluster in a layer; the metric a component test must justify against maintenance cost. | first defined: Chapter 089 L1
frameLocator | - | Playwright handle for locating elements inside an iframe (e.g. Stripe's hosted card fields) a normal locator can't reach. | first defined: Chapter 090 L3
multi-tenant guard | org-scoping guard | Per-org scoping that returns 404 when a user reaches another org's resource; same blast radius an invitation must respect. | first defined: Chapter 090 L3
value loop | - | The one end-to-end loop where every layer aligns to deliver a product's core promise (invoice: create, send, pay, flip to paid); the product-specific fourth money path. | first defined: Chapter 090 L3
render helper | custom render, src/test/render.tsx | Test-side wrapper over RTL's render that pre-applies the app's providers and returns a ready user; tests call it, never RTL render directly. | first defined: Chapter 089 L2
user-event | @testing-library/user-event | RTL companion simulating real user interactions; each call dispatches the full event sequence and is awaited. | first defined: Chapter 089 L2
fireEvent | - | RTL low-level dispatcher firing a single synthetic event; use only when no user-event equivalent exists. | first defined: Chapter 089 L2
findBy | findBy*, findByRole | RTL async query retrying until an element appears or the timeout elapses; for anything that shows up after an interaction. | first defined: Chapter 089 L2
screen | - | RTL object whose queries read the live global document, so they survive refactors to what render returns. | first defined: Chapter 089 L2
waitFor | - | RTL retry helper for non-DOM observations (e.g. a mock was eventually called); use when there is no element to find. | first defined: Chapter 089 L2
jest-dom | @testing-library/jest-dom | DOM-aware expect matchers (toBeInTheDocument, toHaveAccessibleName); /vitest entrypoint registers them against Vitest's expect. | first defined: Chapter 089 L2
query priority ladder | query ladder, priority ladder | RTL's ordered list of queries (role first, test id last); prefer the highest rung the element supports, which doubles as an accessibility audit. | first defined: Chapter 089 L3
getBy | getBy*, getByRole | RTL query asserting an element is here now; throws if missing, returns exactly one. | first defined: Chapter 089 L3
queryBy | queryBy*, queryByRole | RTL query returning null instead of throwing; the correct query for a negative (absence) assertion. | first defined: Chapter 089 L3
Testing Playground | testing-playground.com | Web tool that ranks the best RTL query for pasted markup using the same priority ladder. | first defined: Chapter 089 L3
money path | money-path | A multi-step flow where a break costs real money (Checkout, sign-in, billing); the part of a SaaS you cannot be wrong about. | first defined: Chapter 091 L1
system under test | SUT | The real code a test exercises, as opposed to the harness, mocks, and fixtures around it. | first defined: Chapter 091 L1
behavior contract | - | A test read as a statement of the behavior that must hold, named so its purpose is clear from the name alone. | first defined: Chapter 091 L1
Proxy | JavaScript Proxy | A JS object wrapping another and intercepting operations (property reads, etc.) via trap functions. | first defined: Chapter 091 L2
Sentry | - | Error-monitoring platform that collects, groups, and enriches exceptions from your app. | first defined: Chapter 092 L1
observability | - | Making a running system's behavior inspectable from outside via errors, logs, and traces. | first defined: Chapter 092 L1
fingerprint (Sentry) | - | Signature Sentry derives from an event to decide which issue it groups into. | first defined: Chapter 092 L1
tunnelRoute | tunnel route | Same-origin proxy route the Sentry SDK posts events through so ad-blockers don't drop them. | first defined: Chapter 092 L1
onRequestError | - | Next.js instrumentation hook firing on errors that bubble to the framework boundary; wired to Sentry's capture. | first defined: Chapter 092 L1
Sentry release | release tag | Sentry label binding events to a specific deploy and commit. | first defined: Chapter 092 L1
symbolicated | symbolication | Stack trace whose minified frames are mapped back to original source via source maps. | first defined: Chapter 092 L1
cardinality (field) | high-cardinality, low-cardinality | Number of distinct values a field can take; high-cardinality fields blow out grouping and quota. | first defined: Chapter 092 L1
breadcrumb | - | One entry in a capped, ordered trail of recent events Sentry attaches to an error. | first defined: Chapter 092 L1
beforeSend | - | Sentry hook running on every event before send; last chance to scrub sensitive data. | first defined: Chapter 092 L1
span (trace) | - | A timed segment of work (a call, a query) recorded as part of a trace. | first defined: Chapter 092 L1
pino | - | Fast structured JSON logger for Node; child-logger API makes correlation IDs ergonomic. | first defined: Chapter 092 L2
transport (pino) | log transport, pino-pretty | pino's pluggable log-shipping mechanism; runs in a worker thread, so it breaks on serverless cold paths. | first defined: Chapter 092 L2
stdout | standard output | A process's standard output stream; Vercel captures whatever a function writes to it, line by line. | first defined: Chapter 092 L2
child logger | logger.child | A derived logger that pre-binds extra keys onto every line, on top of its parent's keys. | first defined: Chapter 092 L2
entry seam | - | The chokepoint every request of a kind passes through, where cross-cutting setup like auth and context belongs. | first defined: Chapter 092 L2
serializer (pino) | - | A function turning an awkward value (like an Error) into clean structured JSON for a log line. | first defined: Chapter 092 L2
special-category data | Article 9 data, GDPR Art. 9 | Health, religion, ethnicity, political opinion, sexual orientation, biometric, genetic data; a stricter prohibition than ordinary PII, never log material. | first defined: Chapter 092 L3
legitimate-interest basis | legitimate interest | One of GDPR's six lawful bases: a genuine need outweighing the user's privacy interest, justified and documented rather than consented to. | first defined: Chapter 092 L3
Drain (Vercel) | Vercel Drain, Drains | One-way pipe copying Vercel runtime logs to an external destination; forwards a copy, does not replace the built-in viewer. | first defined: Chapter 092 L4
Axiom | - | Course-default log destination; native Vercel Marketplace integration, free ingest tier, schema-on-read. | first defined: Chapter 092 L4
schema-on-read | - | Destination infers fields from JSON at query time, no fixed schema; new keys become queryable automatically. | first defined: Chapter 092 L4
APL | Axiom Processing Language | Axiom's query language; field-filter idea transfers to any log destination's syntax. | first defined: Chapter 092 L4
Node inspector | V8 inspector, --inspect | Node's built-in debug agent; --inspect opens a WebSocket on 127.0.0.1:9229 speaking CDP that any client attaches to. | first defined: Chapter 092 L5
Chrome DevTools Protocol | CDP | The wire format Node's inspector speaks; any compatible client attaches over it to set breakpoints and read state. | first defined: Chapter 092 L5
heisenbug | - | A bug that changes or disappears the moment you observe it, e.g. adding a log line shifts the timing. | first defined: Chapter 092 L5
breakpoint (debugger) | - | A marked source line where the debugger pauses execution so you can read live state. | first defined: Chapter 092 L5
bound breakpoint | bound | Editor resolved the source line to running transpiled code via the source map, so the breakpoint will fire. | first defined: Chapter 092 L5
unbound breakpoint | unbound | Editor could not map the source line to running code (source-map miss); the breakpoint won't fire. | first defined: Chapter 092 L5
conditional breakpoint | - | A breakpoint that pauses only when an expression you supply evaluates true. | first defined: Chapter 092 L5
logpoint | - | A breakpoint that prints a message with expressions and keeps running, never pausing. | first defined: Chapter 092 L5
Fast Refresh | - | Next.js dev feature that hot-swaps edited React components in the browser without a full reload, preserving state. | first defined: Chapter 092 L5
remote code execution | RCE | An attacker running code of their choosing inside your server process; among the most severe vulnerabilities. | first defined: Chapter 092 L5
Vercel Web Analytics | Web Analytics | Cookieless traffic analytics (page views, referrers, geo, device) aggregated at ingest; the no-consent floor. | first defined: Chapter 093 L1
Speed Insights | @vercel/speed-insights | Vercel package sampling real-user Core Web Vitals from production traffic. | first defined: Chapter 093 L1
cookieless floor | the floor, analytics floor | The no-consent baseline analytics layer (Vercel Web Analytics + Speed Insights) shipped on every project. | first defined: Chapter 093 L1
PostHog | - | Product-analytics platform folding events, feature flags, session replay, and experiments into one tool; the consent-gated top tier. | first defined: Chapter 093 L1
field data | real-user data | Performance measured from real users on their own devices and networks; what Google ranks on. | first defined: Chapter 093 L1
lab data | synthetic data | Performance from a synthetic test: one run, one machine, controlled conditions. | first defined: Chapter 093 L1
pre-PMF | product-market fit, PMF | Early-stage product still searching for a repeatable paying audience, before proven steady demand. | first defined: Chapter 093 L1
opt_out_capturing_by_default | - | PostHog init flag; true loads the SDK disabled, capturing nothing until opted in. | first defined: Chapter 093 L3
opt_in_capturing | opt-in capturing | PostHog call turning capture on; lifts opt-out-by-default on the consented path. | first defined: Chapter 093 L3
opt_out_capturing | opt-out capturing | PostHog call turning capture off; paired with reset() to drop queued events and identity. | first defined: Chapter 093 L3
$pageview | pageview event | PostHog event for a page view; fired manually per route change when autocapture is off. | first defined: Chapter 093 L3
autocapture | - | PostHog default recording clicks, form submits, and other interactions without a per-event capture call. | first defined: Chapter 093 L3
INP | Interaction to Next Paint | Core Web Vital timing tap-to-paint latency across the visit (~p98); replaced FID. | first defined: Chapter 094 L1
p75 | 75th percentile | The value 75% of samples fall at or below; how Core Web Vitals are scored. | first defined: Chapter 094 L1
CrUX | Chrome User Experience Report | Google's public 28-day field dataset of real Chrome-user metrics; what Search scores against. | first defined: Chapter 094 L1
critical path | - | The chain of fetches that must finish before the browser can paint the main content. | first defined: Chapter 094 L1
FID | First Input Delay | Retired interactivity metric INP replaced in March 2024; measured only the first interaction's delay. | first defined: Chapter 094 L1
fetchpriority | fetchPriority | HTML attribute hinting how urgently to download a resource; tunes fetch priority, not discovery timing. | first defined: Chapter 094 L2
above the fold | - | The page slice visible without scrolling, on the first frame after load. | first defined: Chapter 094 L2
art direction | - | Serving a deliberately different image or crop per device, not just a rescaled version of the same image. | first defined: Chapter 094 L2
no-img-element | @next/next/no-img-element | Lint rule banning raw <img>; core-web-vitals config upgrades it from warning to error. | first defined: Chapter 094 L2
flat config | eslint.config.mjs | ESLint's exported-array config format that replaced .eslintrc; the only supported form. | first defined: Chapter 094 L2
optimizePackageImports | - | Next.js experimental config that rewrites a barrel named import into per-export deep imports at build, shipping only what's used. | first defined: Chapter 094 L3
sideEffects (package.json) | sideEffects flag | package.json field promising a package's modules run no import-time code, letting the bundler prune unused exports; array form names exceptions like CSS. | first defined: Chapter 094 L3
deep import | per-export import, deep path import | Importing directly from a submodule path, skipping the barrel so only that export ships; verbose and semver-fragile. | first defined: Chapter 094 L3
CommonJS interop | CJS interop | Mixing CommonJS require modules into an ESM graph; CJS exports are computed at runtime so the bundler can't tree-shake them. | first defined: Chapter 094 L3
semver | semantic versioning | MAJOR.MINOR.PATCH version scheme where only a MAJOR bump may break public API. | first defined: Chapter 094 L3
treemap | bundle treemap | Space-filling chart of nested rectangles where area encodes bytes; bigger tile means more bytes shipped. | first defined: Chapter 094 L4
gzip | gzipped | Compressed byte count actually sent over the wire; what the user's connection pays for, smaller than raw source. | first defined: Chapter 094 L4
transfer size | - | Compressed bytes that travel over the network, the size to read in an analyzer, not raw on-disk size. | first defined: Chapter 094 L4
import chain | - | The exact sequence of imports that pulled a module into the bundle; the analyzer traces it to the causing line. | first defined: Chapter 094 L4
shared chunk | - | The chunk loaded on every route (shared runtime plus root-layout/global-provider imports); the most expensive weight since every page pays it. | first defined: Chapter 094 L4
lab metric | - | A performance number measured in a synthetic Lighthouse run on a fixed profile; the five that make up the Performance score. | first defined: Chapter 094 L5
Speed Index | - | Lab metric (10% of Performance score) measuring how fast the page visually populates during load; lower is better. | first defined: Chapter 094 L5
TBT | Total Blocking Time | Sum of main-thread blocking over 50ms during load; Lighthouse's partial lab proxy for INP. | first defined: Chapter 094 L5
PageSpeed Insights | PSI | Hosted Lighthouse on Google's infrastructure plus a CrUX field overlay; the pre-launch audit surface. | first defined: Chapter 094 L5
performance budget | - | An asserted cap on a metric or resource class (JS bytes, image bytes, LCP) that fails the build when busted. | first defined: Chapter 094 L5
@lhci/cli | LHCI, Lighthouse CI | CLI that runs Lighthouse against a built app and asserts thresholds in CI, failing the build on a bust. | first defined: Chapter 094 L5
autorun | lhci autorun | LHCI command chaining healthcheck, collect, assert, and upload; exits non-zero if any assertion fails. | first defined: Chapter 094 L5
lighthouserc.json | - | The single LHCI config file with collect, assert, and upload blocks that encodes the CI gate. | first defined: Chapter 094 L5
RSC | React Server Component | Component running on the server that awaits data in its body, sending only rendered output to the browser. | first defined: Chapter 094 L6
trace | request trace | Tree of timed spans recorded for one request: what ran, when, for how long. | first defined: Chapter 094 L6
pg_stat_statements | - | Postgres extension tracking per-statement call counts and timing, to rank queries by cost. | first defined: Chapter 094 L7
Performance panel | Performance trace, Performance recording | Chrome DevTools panel that records a trace: a load timeline of network, main-thread, and paint work, read for shape. | first defined: Chapter 095 L2
mixin (pino) | requestId mixin | Pino function whose returned fields merge into every log line; a requestId mixin stamps a correlation ID on each line. | first defined: Chapter 095 L2
withSentryConfig | - | Wrapper around next.config that adds Sentry's build-time work: instrumentation injection and source-map upload. | first defined: Chapter 095 L3
tracesSampleRate | trace sample rate | Sentry.init fraction (0–1) of requests captured as traces; 1.0 locally, 0.1–0.2 in production since traces cost more than error events. | first defined: Chapter 095 L3
register (instrumentation) | - | The instrumentation.ts function Next.js runs once per runtime at boot; lazy-imports the matching Sentry config by NEXT_RUNTIME. | first defined: Chapter 095 L3
redact (seam) | redaction routine, redact() | Single recursive function stripping drop-listed secret/PII keys to [REDACTED]; reused by Pino's formatter and Sentry's beforeSend. | first defined: Chapter 095 L4
request-context store | runWithContext, getRequestContext | AsyncLocalStorage store holding a request's requestId; opened per request, read by the Pino mixin and Sentry beforeSend. | first defined: Chapter 095 L4
x-request-id | request id header | Header carrying the correlation id across the proxy/route-handler boundary, since a proxy-opened scope does not propagate into handlers. | first defined: Chapter 095 L4
.toSQL() | toSQL | Drizzle method returning the SQL string and bound params a query would emit without running it; used to count and inspect statements. | first defined: Chapter 095 L6
lateral join | left join lateral, lateral-join | Join whose right side is a subquery run once per left row, referencing that row; how Drizzle relations fetch related rows in one statement. | first defined: Chapter 095 L6
commit (Git) | git commit | A snapshot of the whole project plus author, message, and parent pointer; Git's unit of change. | first defined: Chapter 096 L1
branch (Git) | git branch | A movable pointer to one commit; creating one just writes a commit hash, copies nothing. | first defined: Chapter 096 L1
staging area | index, git add | The set of changes queued for the next commit; you move changes in with git add. | first defined: Chapter 096 L1
remote (Git) | origin | A named URL pointing at a hosted copy of the repo; push/fetch move commits to and from it. | first defined: Chapter 096 L1
working tree | working directory | The files on disk right now, including edits not yet staged or committed. | first defined: Chapter 096 L1
HEAD | - | Pointer to the commit/branch currently checked out; where your next commit attaches. | first defined: Chapter 096 L1
hunk | - | A contiguous block of changed lines Git treats as one unit when staging in patch mode. | first defined: Chapter 096 L1
git add -p | patch mode | Staging a file one hunk at a time so unrelated edits go into separate commits. | first defined: Chapter 096 L1
merge (Git) | git merge, merge commit | Ties two diverged histories with a new commit having two parents; both lines preserved. | first defined: Chapter 096 L1
rebase | git rebase | Replays your commits onto a new base, giving a straight line; replayed commits get new hashes. | first defined: Chapter 096 L1
fast-forward | - | Integrating by sliding the target branch pointer forward when it hasn't diverged; no merge commit. | first defined: Chapter 096 L1
squash-merge | squash and merge | Collapses a whole pull request into one commit on main with a message you write. | first defined: Chapter 096 L1
pull request | PR | A GitHub proposal to merge one branch into another, reviewed before it lands. | first defined: Chapter 096 L1
trunk-based | trunk-based development | Workflow with one long-lived mainline and short-lived feature branches that merge back fast. | first defined: Chapter 096 L1
GitHub Flow | - | Lightweight trunk-based workflow on GitHub: branch, open a PR, squash-merge, deploy. | first defined: Chapter 096 L1
trunk | mainline | The single shared always-deployable branch (main) everyone integrates into. | first defined: Chapter 096 L1
Git Flow | gitflow | Older multi-branch scheme (develop, release/*, hotfix/*) built for quarterly QA-gated releases. | first defined: Chapter 096 L1
imperative mood (commit) | imperative subject | Commit subject phrased as a command completing "This commit will…" (Add, not Added). | first defined: Chapter 096 L1
Conventional Commits | - | Stricter convention putting a machine-readable type (feat:, fix:) at the front of each subject. | first defined: Chapter 096 L1
.gitignore | gitignore | File listing path patterns Git never tracks: build output, deps, secrets, OS junk. | first defined: Chapter 096 L1
.gitattributes | gitattributes | File setting per-path Git behaviors, chiefly normalizing line endings across OSes. | first defined: Chapter 096 L1
rerere | reuse recorded resolution | Git records a conflict resolution and replays it automatically when the identical conflict reappears. | first defined: Chapter 096 L1
--force-with-lease | force-with-lease | Force-push that aborts if the remote moved since your last fetch, instead of clobbering it. | first defined: Chapter 096 L1
reflog | git reflog, recovery journal | Per-repo journal of every HEAD move; recovers unreferenced commits by hash. | first defined: Chapter 096 L2
git garbage collection | git gc | Git prunes commits no branch or reflog can reach; until it runs they are recoverable. | first defined: Chapter 096 L2
git stash | stash | Shelves uncommitted changes onto a stack and cleans the tree; pop to restore. | first defined: Chapter 096 L2
git bisect | bisect | Binary-searches the commit range between a good and bad commit to find the breaker. | first defined: Chapter 096 L2
cherry-pick | git cherry-pick | Replays one commit onto the current branch as a new commit with a new hash. | first defined: Chapter 096 L2
revert | git revert | Adds a new commit that is the inverse of a given commit; undoes without rewriting. | first defined: Chapter 096 L2
backporting | backport | Cherry-picking a fix from a newer branch onto an older release branch. | first defined: Chapter 096 L2
git commit --amend | amend | Replaces the most recent commit, fixing its message or folding in staged changes. | first defined: Chapter 096 L2
interactive rebase | rebase -i, git rebase -i | Edit a to-do list of commits to reorder, reword, squash, fixup, edit, or drop them. | first defined: Chapter 096 L2
autosquash | rebase.autoSquash, --autosquash | Rebase reorders fixup!/squash! commits under their target and pre-marks them. | first defined: Chapter 096 L2
fixup commit | git commit --fixup | A commit named fixup! <subject> that autosquash folds into its target commit. | first defined: Chapter 096 L2
conflict markers | <<<<<<< ======= >>>>>>> | Lines Git writes into a file to flag two unreconciled versions of the same lines. | first defined: Chapter 096 L2
three-way merge | - | A merge that compares both sides against their common ancestor, not just each other. | first defined: Chapter 096 L2
git switch | switch | Modern verb that only changes or creates branches; -c creates and switches. | first defined: Chapter 096 L2
git restore | restore | Modern verb that only discards file changes or unstages files (--staged). | first defined: Chapter 096 L2
pickaxe | git log -S | log -S flag listing commits that added or removed a given string. | first defined: Chapter 096 L2
GitHub CLI | gh, gh CLI | GitHub's official command-line tool for PR, issue, and repo operations from the terminal. | first defined: Chapter 096 L3
CODEOWNERS | .github/CODEOWNERS | File mapping path globs to GitHub users or teams so owned paths auto-request those reviewers; last match wins. | first defined: Chapter 096 L3
stack (of PRs) | stacked PRs, stacked diffs | A dependency chain of small PRs, each based on the branch of the one before it instead of main. | first defined: Chapter 096 L3
draft PR | draft pull request | A PR opened in draft status: shows a Draft badge, can't be merged, signals you want eyes not approval. | first defined: Chapter 096 L3
ruleset | repository ruleset | GitHub setting enforcing merge conditions on a branch: required reviews, required checks, dismiss-stale-approvals. | first defined: Chapter 096 L3
merge queue | - | GitHub setting serializing merges, rebasing and re-checking each PR against latest main before it lands. | first defined: Chapter 096 L3
auto-merge | allow auto-merge | GitHub setting queuing a PR to merge itself once its checks pass and reviews land. | first defined: Chapter 096 L3
nit (review comment) | nit | A review comment explicitly marked non-blocking; you noticed but won't hold the PR over it. | first defined: Chapter 096 L3
suggestion (review comment) | suggestion fence | A GitHub suggestion code fence holding exact replacement lines, applied with one click by the author. | first defined: Chapter 096 L3
branch protection rules | branch protection | GitHub's older per-branch protection mechanism, superseded by rulesets. | first defined: Chapter 096 L4
required status check | required status checks | A CI job a ruleset requires green by exact name string before a PR can merge. | first defined: Chapter 096 L4
strict mode (ruleset) | require branches to be up to date | Ruleset option forcing a PR to rebase onto latest main before its checks count, re-running CI when main moves. | first defined: Chapter 096 L4
linear history | require linear history | A commit history with no merge commits: a straight line of single-parent commits. | first defined: Chapter 096 L4
bypass actor | bypass actors | A user, team, or app a ruleset allows to skip its rules; every bypass is logged. | first defined: Chapter 096 L4
bootstrap exception | - | Pushing the first scaffold commit straight to an empty main before the ruleset exists, since there is nothing yet to protect. | first defined: Chapter 096 L4
GitHub Actions | GHA | GitHub's built-in CI/CD platform that runs YAML workflows in response to repo events. | first defined: Chapter 097 L1
workflow (GitHub Actions) | - | A YAML file in .github/workflows/ that GitHub runs on repo events; one concern per file. | first defined: Chapter 097 L1
job (GitHub Actions) | - | A workflow unit running on its own runner; its id becomes the PR status-check name. | first defined: Chapter 097 L1
step (GitHub Actions) | - | One ordered entry in a job: a run: shell command or a uses: action, never both. | first defined: Chapter 097 L1
runner | - | A fresh virtual machine GitHub provisions to run one job, then destroys. | first defined: Chapter 097 L1
action (GitHub Actions) | - | A packaged, reusable step referenced with uses:, from the Marketplace or a repo. | first defined: Chapter 097 L1
GITHUB_TOKEN | - | Short-lived token GitHub mints per workflow run, scoped to the repo, for GitHub API calls. | first defined: Chapter 097 L1
github.ref | - | Expression context for the ref that triggered the run: branch ref on push, PR ref on pull_request. | first defined: Chapter 097 L1
concurrency (GitHub Actions) | cancel-in-progress | Workflow block that buckets runs by group key and cancels a superseded in-flight run. | first defined: Chapter 097 L1
expression interpolation | ${{ }} | GitHub Actions syntax evaluated before a step runs and substituted in; reads github.*, secrets.*, env.*, matrix.*. | first defined: Chapter 097 L1
matrix strategy | strategy: matrix | Runs a job once per variable combination; a library concern, cut for single-config web apps. | first defined: Chapter 097 L1
SHA pin | commit SHA pin | Pinning a uses: action to a full 40-char commit SHA, the only reference an attacker can't repoint. | first defined: Chapter 097 L1
wall-clock time (CI) | wall-clock | Real elapsed time of a run start to finish, vs total compute summed across parallel jobs. | first defined: Chapter 097 L2
failure granularity | - | A run showing each check's pass/fail separately, so one push surfaces every failure at once. | first defined: Chapter 097 L2
composite action | - | A packaged set of steps bundled behind one uses: line; earns its weight only across repos that must stay in sync. | first defined: Chapter 097 L2
pre-rendering | pre-render | Next.js generating a page's HTML at build time rather than per request. | first defined: Chapter 097 L2
Next.js build cache | .next/cache | Incremental cache next build keeps in .next/cache; cached across CI runs to reuse unchanged build work. | first defined: Chapter 097 L2
test sharding | --shard | Splitting a large test suite across parallel jobs (vitest run --shard) with a matrix. | first defined: Chapter 097 L2
gate (CI) | merge gate | The blocking CI tier; every required check is a true production predicate, fast and deterministic. | first defined: Chapter 097 L3
signal check | signal tier | A CI check that runs and reports but never blocks a merge; answers "is the codebase healthy?" not "is it safe?". | first defined: Chapter 097 L3
production predicate | - | A check whose failure provably means the merged code breaks production; the bar for joining the gate. | first defined: Chapter 097 L3
supply-chain attack | supply chain attack | Compromising you by poisoning something upstream: a dependency, build tool, or published package. | first defined: Chapter 097 L3
advisory database | - | The registry's catalog of known vulnerabilities pnpm audit checks an installed tree against. | first defined: Chapter 097 L3
SLSA | salsa | Supply-chain Levels for Software Artifacts; the framework npm provenance attestations follow. | first defined: Chapter 097 L3
yanked | - | Un-published or deprecated from the registry so a version stops resolving. | first defined: Chapter 097 L3
actionlint | - | Static checker for GitHub Actions: type-checks ${{ }} expressions, validates inputs/runners, runs shellcheck on run: blocks. | first defined: Chapter 097 L3
shellcheck | - | Static analyzer for shell scripts; actionlint runs it over run: blocks to catch quoting and command bugs. | first defined: Chapter 097 L3
workflow_dispatch | - | A trigger adding a manual "Run workflow" button; needed to test a scheduled workflow without waiting for cron. | first defined: Chapter 097 L3
on: schedule | scheduled workflow | GitHub Actions cron trigger; always runs the workflow as it exists on the default branch. | first defined: Chapter 097 L3
alias swap | - | Vercel points the production domain at a new immutable deployment in one instant; atomic, no in-between. | first defined: Chapter 099 L1
immutable deployment | - | A built, frozen snapshot of the app the alias can point at; re-promotable, never edited in place. | first defined: Chapter 099 L1
fleet | warm fleet | The pool of serverless instances serving a deployment; old and new fleets overlap during a cutover. | first defined: Chapter 099 L1
Rolling Releases | rolling release | Vercel feature routing a configurable share of traffic to the new deployment before promoting to 100%. | first defined: Chapter 099 L1
dual-read | dual-read fall-through | Read path that coalesces the new value with the old, falling back while the backfill catches up; scaffolding contract removes. | first defined: Chapter 099 L1
forward-only migration | forward-only | Migrations only move forward; no down migrations, so rollback means a new forward migration to a safe state. | first defined: Chapter 099 L1
overlap window | - | The seconds to minutes after a deploy when old and new fleets both run against the same database, so the schema must serve both. | first defined: Chapter 099 L1
SHARE UPDATE EXCLUSIVE | - | A light Postgres table lock; concurrent reads and writes proceed while it's held. Taken by CREATE INDEX CONCURRENTLY and VALIDATE CONSTRAINT. | first defined: Chapter 099 L2
NOT VALID | - | Constraint flag registering it for new rows but skipping the upfront scan of existing rows; governs when validation happens, not what is allowed. | first defined: Chapter 099 L2
VALIDATE CONSTRAINT | - | Second step after NOT VALID; scans existing rows under SHARE UPDATE EXCLUSIVE to confirm they satisfy the constraint, so reads and writes keep flowing. | first defined: Chapter 099 L2
overlap-window axis | - | The question of whether a schema change alters a shape the running code reads or writes, breaking a fleet during the window. | first defined: Chapter 099 L2
lock axis | - | The question of whether a migration's SQL grabs a lock long enough to be an outage on its own, independent of the code. | first defined: Chapter 099 L2
maintenance window | - | A planned period of announced downtime to run a change that can't be made safely while the app serves traffic. | first defined: Chapter 099 L2
read-replica swap | - | Promoting a standby copy that already holds the new shape to become the primary, instead of altering the live database in place. | first defined: Chapter 099 L2
pgroll | - | Xata's open-source tool that automates the expand/contract cadence by running both schema versions at once behind Postgres views. | first defined: Chapter 099 L2
automatic ring | automatic verification ring | The unattended layer of preview verification: the build applies the migration and CI type-checks and tests; proves the migration applies and code compiles, nothing more. | first defined: Chapter 099 L3
manual ring | manual verification ring | The by-hand layer of preview verification: walk the preview URL and query the branch directly; the only layer that proves the change is correct. | first defined: Chapter 099 L3
synthetic load | manufactured contention | A small script hammering the relevant mutation in a tight loop on a branch, to surface lock contention a traffic-free rehearsal would hide. | first defined: Chapter 099 L3
IS DISTINCT FROM | - | SQL comparison treating NULL as an ordinary value, so neither side vanishes from a result the way a plain <> would. | first defined: Chapter 099 L3
neonctl | Neon CLI | Neon's command-line tool; the manual escape hatch for creating and resetting branches outside the automatic Vercel integration. | first defined: Chapter 099 L3
inspector (project) | /inspector | Read-only project surface that probes the live schema and data, making the migration's state visible (split coverage, dual-write, integrity diff). | first defined: Chapter 100 L1
Fluid Compute | - | Vercel serverless mode keeping a warm instance alive for many concurrent invocations, cutting cold starts; the project default. | first defined: Chapter 098 L3
incompatibility window | - | Span during a deploy when running code and live schema disagree, so requests can fail; expand-migrate-contract avoids it. | first defined: Chapter 100 L3
DROP COLUMN | drop column, metadata-only drop | Postgres column drop that only marks the column dead in the catalog; near-instant, no table rewrite, space reclaimed later by VACUUM. | first defined: Chapter 100 L5
VACUUM | - | Postgres background maintenance pass reclaiming on-disk space from dead rows and dropped columns. | first defined: Chapter 100 L5
Diataxis | Diátaxis | Documentation framework sorting all technical docs into four reader-need types (tutorial, how-to, reference, explanation). | first defined: Chapter 101 L1
tutorial (Diataxis) | - | Learning-oriented doc leading a stranger down one path to a first success; no choices. | first defined: Chapter 101 L1
how-to (Diataxis) | how-to guide | Task-oriented doc helping someone competent finish one specific job; scannable, goal-directed. | first defined: Chapter 101 L1
reference (Diataxis) | - | Dry, complete, structured doc describing the surface exactly as it is; the reader wants one fact. | first defined: Chapter 101 L1
explanation (Diataxis) | - | Understanding-oriented doc giving the rationale and trade-offs behind a choice, not the steps. | first defined: Chapter 101 L1
TSDoc | - | TypeScript-flavoured JSDoc comment block (/** … */) editors surface as hover text. | first defined: Chapter 101 L1
source-as-doc | docs live next to the truth | The file that owns a truth is its documentation; the README links to it, never copies it, so the doc can't drift. | first defined: Chapter 101 L2
first contact | - | The README's one job: the small handful of things a new contributor or recruiter needs in their first hour, nothing more. | first defined: Chapter 101 L2
coding agent | - | AI tool that reads and edits a codebase directly: Codex, Claude Code, Cursor, Copilot agent mode, and similar. | first defined: Chapter 101 L3
signal per line | signal density | AGENTS.md's quality metric: every line earns its place; noise buries the lines that matter. | first defined: Chapter 101 L3
symlink | - | Filesystem entry pointing at another file; reading one reads the other, so the target's changes show through. | first defined: Chapter 101 L3
squash merge | squash-merge | Merging a PR by collapsing all its commits into one; individual commit messages and bodies are discarded. | first defined: Chapter 101 L4
MADR | Markdown Any Decision Records | More structured ADR template adding Considered Options and Decision Outcome sections. | first defined: Chapter 101 L4
supersede (ADR) | supersession | Replace an earlier ADR with a newer one while keeping the original; old ADR's status becomes 'Superseded by ADR NNNN', file stays. | first defined: Chapter 101 L4
JSDoc | - | JavaScript doc-comment convention; carries types in the comment because plain JS has none, unlike TSDoc. | first defined: Chapter 102 L1
TypeDoc | - | Generator turning TSDoc comments into a published HTML reference site, for when you ship a library. | first defined: Chapter 102 L1
API Extractor | - | Microsoft tool turning TSDoc comments into a published HTML reference site and an API report. | first defined: Chapter 102 L1
why-not-what rule | - | A comment earns its place only when the why is invisible in the code because it lives outside the file. | first defined: Chapter 102 L2
constraint comment | - | Inline comment documenting an external reality the code must bend to. | first defined: Chapter 102 L2
workaround comment | - | Inline comment naming the failure mode a workaround prevents. | first defined: Chapter 102 L2
intentional-deviation comment | - | Inline comment naming the path not taken and why. | first defined: Chapter 102 L2
load-bearing-weirdness comment | - | Inline comment documenting an ordering or detail that is part of the contract. | first defined: Chapter 102 L2
constraint + response shape | - | Comment voice naming the external fact and the action it forces, in one line. | first defined: Chapter 102 L2
fossil comment | - | Stale comment explaining a workaround for a bug already fixed; misleads later readers. | first defined: Chapter 102 L2
comment density | - | A function needing three or more why-comments is a smell that it does too much. | first defined: Chapter 102 L2
doc drift | drift | A doc and the code it describes fall out of sync; the doc still claims something no longer true. | first defined: Chapter 102 L3
mechanical drift | - | Drift a machine can catch by comparing two things for a structural match, no interpretation. | first defined: Chapter 102 L3
semantic drift | - | Drift only a human can catch by reading the doc's intent against the code's behaviour. | first defined: Chapter 102 L3
schema header comment | schema header | One-paragraph header on a pgTable declaration stating the table's purpose, scope, and invariants. | first defined: Chapter 101 L2
PR template | pull-request template | Markdown file GitHub uses to pre-fill the PR description box; here a two-checkbox doc reminder. | first defined: Chapter 102 L3
code review | review | A human reading a diff with attention before it becomes production behaviour; the checkpoint where each codebase decision holds or erodes. | first defined: Chapter 103 L1
review stack | five-layer review stack, the stack | Five severity-ordered review layers run top-down on every diff; spend attention from the top. | first defined: Chapter 103 L1
diff signature | - | The visible pattern in a diff that signals a change skipped an established principle or pattern. | first defined: Chapter 103 L1
bikeshed | bikeshedding | A trivial, low-stakes detail that draws disproportionate review debate. | first defined: Chapter 103 L1
severity label | label (review comment) | The first token of a review comment naming its severity, so the author triages before reading the body. | first defined: Chapter 103 L2
four-part comment | comment anatomy | A review comment's slots: severity label, observation, reason+link, action or question. | first defined: Chapter 103 L2
Conventional Comments | - | Public convention putting a parseable label (+ optional decoration) on the front of every review comment. | first defined: Chapter 103 L2
blocking (review comment) | blocking: | Severity label for a change that must happen before merge; correctness, security, or an established pattern violation. | first defined: Chapter 103 L2
suggestion (severity label) | suggestion: | Severity label for a strong but subjective recommendation; the code works, so it doesn't hold the merge. | first defined: Chapter 103 L2
question (review comment) | question: | Severity label for a comment that needs an explanation, not a fix; resolves into an answer that may upgrade. | first defined: Chapter 103 L2
praise (review comment) | praise: | Severity label for genuine, specific praise of a non-trivial good call. | first defined: Chapter 103 L2
epistemic cowardice | - | Dressing a position you're certain about as an open question to avoid committing to it. | first defined: Chapter 103 L2
drive-by approval | drive-by review | A review verdict submitted without engaging the content; an unread approve or an over-blocking request-changes. | first defined: Chapter 103 L2
Nygard ADR | Nygard template, Nygard sections | Michael Nygard's 2011 four-section ADR template: Status, Context, Decision, Consequences; the canonical ADR shape. | first defined: Chapter 104 L4
large language model | LLM | System trained to predict likely text continuations; generates language, not a database, stores no data. | first defined: Chapter 105 L1
probabilistic | - | Same input isn't guaranteed to give the same output twice; disqualifies a model from exact, repeatable tasks. | first defined: Chapter 105 L1
Vercel AI SDK | AI SDK | Vercel's vendor-neutral open-source JS toolkit for AI features; one set of functions/hooks across providers. | first defined: Chapter 105 L1
streams (AI SDK) | - | Server sends the model's response piece by piece as it's generated, so text appears word by word. | first defined: Chapter 105 L1
provider (AI) | model provider | The company whose API serves the model (OpenAI, Anthropic, Google); distinct from the vendor-neutral SDK. | first defined: Chapter 105 L1
token (LLM) | LLM token | A model's unit of text, ~three-quarters of an English word; billed per million, input and output priced separately. | first defined: Chapter 105 L2
input tokens | - | Everything sent to the model (system prompt, history, user message); the cheaper side of the bill. | first defined: Chapter 105 L2
output tokens | - | Everything the model generates; usually several times the price of input, so the costliest side. | first defined: Chapter 105 L2
context window | - | Max span of tokens a model attends to at once; overflow drops the oldest tokens from view. | first defined: Chapter 105 L2
prompt-injection | prompt injection | Attack smuggling instructions inside user input hoping the model obeys them; defended by isolation, not filtering. | first defined: Chapter 105 L2
maxOutputTokens | - | AI SDK generation arg capping how many tokens a call may produce; never undefined, sized per surface. | first defined: Chapter 105 L2
AI Gateway | Vercel AI Gateway | One managed endpoint routing model calls to any provider; adds failover, usage tracking, one bill; the SDK's default target. | first defined: Chapter 105 L3
global provider | - | SDK-level default turning a plain model string into a routed call without importing or configuring a provider. | first defined: Chapter 105 L3
model handle | handle | Named export bound to a model id, imported instead of inlining the string; named by role, not vendor. | first defined: Chapter 105 L3
gateway string | creator/model string | A plain 'creator/model' string routed through the AI Gateway; the default way to name a model. | first defined: Chapter 105 L3
provider object | direct provider | A model named via an installed provider package that talks to the vendor directly, bypassing the gateway; the escape hatch. | first defined: Chapter 105 L3
failover (AI Gateway) | provider fallback | Gateway retries the next provider in a fallback list on 429/5xx/timeout, so code never sees the error. | first defined: Chapter 105 L3
BYOK | bring your own key | You supply your own provider API keys to the gateway rather than billing through it. | first defined: Chapter 105 L3
embedding | embedding vector | List of numbers a model assigns to text so similar meanings sit close; meaningful only within the model that made it. | first defined: Chapter 105 L3
vector space | embedding space | The geometry an embedding model maps text into; incompatible across models, so embeddings don't transfer. | first defined: Chapter 105 L3
RAG | retrieval-augmented generation | Fetching relevant documents and feeding them to the model as context so its answer is grounded in your data. | first defined: Chapter 105 L3
LangChain | - | Heavier chains/agents/retrievers framework; fits research-style multi-agent orchestration, not a Next.js streaming surface. | first defined: Chapter 105 L3
streamText | - | AI SDK primitive returning immediately and emitting text deltas; the shape for anything a person reads. | first defined: Chapter 106 L1
generateText | - | AI SDK primitive running the model to completion and resolving one string on .text; for output code consumes. | first defined: Chapter 106 L1
text delta | text deltas | A small chunk of a streamed answer the model emits as it generates; piped to the client as it arrives. | first defined: Chapter 106 L1
time to first token | TTFT | The moment streamed words start appearing; what a reader feels as fast, not total completion time. | first defined: Chapter 106 L1
ModelMessage | - | The lossy message shape the model reads: roles and content, nothing the model can't use. | first defined: Chapter 106 L1
UIMessage | - | The full message shape the app stores and renders: a parts array, metadata, and tool calls. | first defined: Chapter 106 L1
convertToModelMessages | - | AI SDK call converting UIMessage[] down to ModelMessage[], dropping everything the model doesn't read. | first defined: Chapter 106 L1
system prompt | system message | Trusted, code-authored instructions setting the model's role and rules; the controller, never templated from user data. | first defined: Chapter 106 L1
toUIMessageStreamResponse | - | AI SDK call serializing a stream into the structured parts the client hook knows how to render. | first defined: Chapter 106 L1
onFinish | - | AI SDK callback firing once after generation completes with { text, usage, finishReason, response }; where post-call accounting lives. | first defined: Chapter 106 L1
finishReason | - | Why the model stopped: 'stop', 'length', 'content-filter', 'tool-calls', 'error', or 'other'; the UI reacts to it. | first defined: Chapter 106 L1
temperature | - | AI SDK arg controlling output randomness; keep low (0-0.3) for stable format, raise only when variance is the feature. | first defined: Chapter 106 L1
structured output | - | Model returns a value constrained to a supplied schema, not free text; the SDK validates and types it. | first defined: Chapter 106 L2
generateObject | - | AI SDK call running the model to completion against a Zod schema, validating, retrying on a miss, resolving a typed object. | first defined: Chapter 106 L2
streamObject | - | AI SDK call streaming partial objects as schema fields populate; rendered client-side with useObject. | first defined: Chapter 106 L2
output: 'enum' / output: 'array' | enum mode, array mode | generateObject output modes returning one label from a set, or a typed list of records. | first defined: Chapter 106 L2
useChat | - | AI SDK React hook for a multi-turn conversation surface; owns messages, sendMessage, status, stop. | first defined: Chapter 106 L3
useCompletion | - | AI SDK React hook for single-shot text: one prompt in, a streaming completion string out, no history. | first defined: Chapter 106 L3
useObject | experimental_useObject | AI SDK React hook streaming a typed object that fills in field by field; aliased from experimental_useObject. | first defined: Chapter 106 L3
parts | parts array | The array on a UIMessage holding typed content pieces (text, reasoning, file, tool calls); the v5 render source of truth. | first defined: Chapter 106 L3
ChatTransport | DefaultChatTransport | The object useChat delegates sending to; DefaultChatTransport speaks HTTP POST plus streaming against a route. | first defined: Chapter 106 L3
status (useChat) | - | useChat request lifecycle string union: 'submitted' | 'streaming' | 'ready' | 'error'; drives the streaming UX. | first defined: Chapter 106 L3
initialMessages | - | Conventional variable name for history loaded from the database; in v5 assigned to the messages option, not its own option. | first defined: Chapter 106 L3
DeepPartial | DeepPartial<RESULT> | A result type with every field at every depth optional; models a half-built streamed object. | first defined: Chapter 106 L3
toTextStreamResponse | - | AI SDK call serializing a stream as plain text, not parts; what useCompletion reads. | first defined: Chapter 106 L3

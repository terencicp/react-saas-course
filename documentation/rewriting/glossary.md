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
GDPR | - | EU law requiring a legal basis (usually consent) before processing personal data. | first defined: Chapter 034 L5
ePrivacy | cookie law | EU directive governing cookies and trackers; non-essential trackers await consent. | first defined: Chapter 034 L5
numeric | NUMERIC, DECIMAL | Postgres exact-decimal type; stores literal digits, no float rounding; reads as string in Drizzle. | first defined: Chapter 037 L3
precision | - | Total count of significant digits a numeric column stores, both sides of the point. | first defined: Chapter 037 L3
scale | - | Number of digits a numeric column stores after the decimal point. | first defined: Chapter 037 L3
timestamptz | timestamp with time zone | Postgres type storing an absolute UTC instant, converting on in/out. | first defined: Chapter 037 L3
UUID | universally unique identifier | 128-bit value, 32 hex digits, unique without central coordination; maps to TS string. | first defined: Chapter 037 L3
UUIDv4 | uuid v4 | Fully-random UUID; Postgres gen_random_uuid() / Drizzle .defaultRandom(). | first defined: Chapter 037 L3
UUIDv7 | uuid v7 | Time-ordered UUID; leading bits are a timestamp so IDs sort by creation; native in Postgres 18. | first defined: Chapter 037 L3
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
pure junction | - | A junction table holding only foreign keys, walked through with .through() rather than related to. | first defined: Chapter 037 L9
self-referential relation | self-relation | A relation whose from and to columns both live on one table (e.g. a comment's parent). | first defined: Chapter 037 L9

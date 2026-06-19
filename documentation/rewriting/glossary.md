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
- **one-line definition** — plain, one sentence, no markdown.
- **first defined** — the chapter and lesson where the course first defines the term, e.g. `Chapter 001 L4`.

Append a term the first time the course defines it; order does not matter since lookups use grep.
Never duplicate an existing term, update its line instead.

## Terms

<!-- entries below, one per line, append new terms at the end -->
value equality | - | Equality that compares two primitives by their content, since a primitive has no identity apart from its value; what `===` does for primitives. | first defined: Chapter 001 L2
reference equality | identity equality | Equality that compares two objects by whether they are the same allocation rather than by their contents; what `===` does for objects. | first defined: Chapter 001 L2
coercion | type coercion | JavaScript automatically converting a value from one type to another, such as a string to a number, before an operation. | first defined: Chapter 001 L2
IEEE 754 | - | The standard defining how JavaScript's `number` type stores and computes floating-point values, the source of its floating-point edge cases. | first defined: Chapter 001 L2
structural equality | deep equality | Comparing two objects by whether their fields and values match, recursively; JavaScript has no built-in operator for it. | first defined: Chapter 001 L2
memoization | - | Caching a function's result so a repeated call with the same input returns the stored value instead of recomputing it. | first defined: Chapter 001 L2
NaN | not a number | The IEEE 754 value marking an invalid numeric calculation; it is not equal to anything, including itself, and propagates through any arithmetic it touches. | first defined: Chapter 001 L2
integer cents | integer-cents rule | Storing money as the integer count of a currency's smallest unit (1995, not 19.95), converting to a string only at input and display, so all arithmetic stays exact. | first defined: Chapter 001 L3
minor unit | smallest currency unit | The smallest denomination of a currency, such as a cent for USD or a fil for BHD; the unit money is stored and transmitted in as an integer. | first defined: Chapter 001 L3
ISO 4217 | - | The standard that codes each currency and its number of minor-unit decimals (USD 2, JPY 0, BHD 3), setting how many integer units make one major unit. | first defined: Chapter 001 L3
BigInt | - | A JavaScript integer type for whole numbers beyond Number.MAX_SAFE_INTEGER, written with an `n` suffix; it does not mix with `number` in expressions or work with `Math.*`. | first defined: Chapter 001 L3
safe integer | Number.MAX_SAFE_INTEGER | An integer a regular `number` can represent exactly, up to 2^53 − 1; past this ceiling integers lose precision and need BigInt. | first defined: Chapter 001 L3
radix | base | The number base a string of digits is read in, such as 10 for decimal or 16 for hexadecimal; parseInt's second argument. | first defined: Chapter 001 L3
code unit | UTF-16 code unit | One of the 16-bit chunks a JavaScript string is stored in and that `.length` counts; characters above U+FFFF take two of them. | first defined: Chapter 001 L4
code point | Unicode code point | The single number Unicode assigns to one character; spreading a string iterates by code point, collapsing each surrogate pair to one. | first defined: Chapter 001 L4
surrogate pair | - | The two UTF-16 code units used to encode a single code point above U+FFFF, the reason `.length` over-counts most emoji and many CJK characters. | first defined: Chapter 001 L4
grapheme cluster | grapheme | One character as the user perceives it on screen, which can span several code points such as a base letter plus combining marks or a joined emoji sequence. | first defined: Chapter 001 L4
zero-width joiner | ZWJ | An invisible Unicode character (U+200D) that glues adjacent code points into a single grapheme, such as the person emoji that combine into one family emoji. | first defined: Chapter 001 L4
serialization detail | - | A property of how a value is stored or transmitted rather than of what it represents, such as `.length` reporting storage form, not the human-meaningful count. | first defined: Chapter 001 L4
Intl.Segmenter | - | The built-in API that splits a string into graphemes, words, or sentences for a given locale and granularity, the correct way to count user-perceived characters. | first defined: Chapter 001 L4
Unicode normalization | normalize, NFC, NFD, NFKC, NFKD | Rewriting a string to a canonical sequence of code points so visually identical text compares equal; NFC composes, NFD decomposes, the NFK forms also fold compatibility look-alikes. | first defined: Chapter 001 L4
template literal | backtick string | A string written with backticks that supports ${} interpolation and preserves newlines as newlines. | first defined: Chapter 001 L5
interpolation | string interpolation | Embedding the value of an expression inside a template literal with ${expression}. | first defined: Chapter 001 L5
tagged template | tagged template literal, tag | A function call whose arguments are the static string segments and the dynamic values of a template literal, written as `tag` before the backticks. | first defined: Chapter 001 L5
TemplateStringsArray | - | The first argument a tag function receives, a readonly array of the static string segments between ${} placeholders, always one element longer than the values array. | first defined: Chapter 001 L5
String.raw | - | A built-in tag that returns a template's raw text without processing escape sequences, so `\n` stays as two characters. | first defined: Chapter 001 L5
SQL injection | - | An attack where user-submitted text is concatenated into a query and runs as SQL, letting the attacker read or change data the query never intended to touch. | first defined: Chapter 001 L5
parameterized query | bound parameter, parameterization | A query that sends each interpolated value to the database as a separately bound parameter rather than inlining it into the query text, closing the SQL injection door. | first defined: Chapter 001 L5
dedent | - | An npm package exposing a tagged template that strips the common leading whitespace from every line of a multi-line string and trims the outer newlines. | first defined: Chapter 001 L5
binding | - | A name that points to a value, such as a variable, parameter, or property; in `const x = 1`, `x` is the binding and `1` is the value. | first defined: Chapter 001 L1
block scope | block-scoped | The rule that a `const` or `let` binding is visible only inside the nearest enclosing pair of curly braces, determined lexically by where it is written rather than by the runtime call stack. | first defined: Chapter 001 L6
Temporal Dead Zone | TDZ | The period between entering a scope and reaching a `let`/`const` declaration, during which the binding exists but accessing it throws a ReferenceError. | first defined: Chapter 001 L6
hoisting | - | The compile-time process where the engine pre-registers every name in a scope before any code runs; `var` names initialize to `undefined`, while `let`, `const`, and `class` names stay unreachable until their declaration line (the TDZ). | first defined: Chapter 001 L6
Object.is | SameValue | A built-in equality function that behaves like `===` except it treats `NaN` as equal to itself and `+0` as distinct from `-0`; despite the name it has nothing to do with objects. | first defined: Chapter 001 L2
Number.isNaN | - | The namespaced check that returns `true` only when the value passed is the actual `NaN`, without coercing its argument the way the global `isNaN` does. | first defined: Chapter 001 L2
Number.isFinite | - | The namespaced check that returns `true` only when the value passed is a finite `number`, without coercing its argument the way the global `isFinite` does. | first defined: Chapter 001 L2
predicate | - | A function that returns a boolean, used to test whether a value satisfies some condition. | first defined: Chapter 001 L3
Number.isInteger | - | The namespaced check that returns `true` only when the value is a whole `number` with no fractional part, returning `false` for NaN and the infinities. | first defined: Chapter 001 L3
Number.isSafeInteger | - | The namespaced check that returns `true` only when the value is an integer a regular `number` can represent exactly, at or below 2^53 − 1. | first defined: Chapter 001 L3
Intl.NumberFormat | - | The built-in API that formats a number for a locale, producing the right currency symbol, digit grouping, and minor-unit decimals automatically. | first defined: Chapter 001 L3
combining mark | combining accent, combining acute accent | A Unicode code point with no width of its own that the renderer overlays onto the preceding base character, such as a combining acute accent turning a plain `e` into `é`. | first defined: Chapter 001 L4
precomposed | composed form | A single code point that already carries its accent (such as `é`), as opposed to the decomposed form of a base letter followed by separate combining marks. | first defined: Chapter 001 L4
localeCompare | String.prototype.localeCompare | The string method that compares two strings in locale-aware alphabetical order, the correct way to sort user-visible text since `<` and `>` compare by code unit instead. | first defined: Chapter 001 L4
ORM | object-relational mapper | A library that maps database tables to objects in your code, letting you query and write rows through typed methods instead of raw SQL strings. | first defined: Chapter 001 L5
arrow function | arrow, fat arrow | A function value written `(args) => body` that inherits `this` from the enclosing scope; the course default, bound to `const`. | first defined: Chapter 002 L1
function declaration | - | A function defined with the `function` keyword at statement position (`function name(args) { ... }`); its whole body hoists to the top of the scope and it gives the function its own name. | first defined: Chapter 002 L1
function expression | - | A `function`-keyword function used as a value, e.g. assigned to a `const`; an optional internal name is visible only inside its own body for self-reference. | first defined: Chapter 002 L1
method shorthand | - | The object-literal syntax that defines a method by dropping the colon and `function` keyword (`{ greet(name) { ... } }`); it binds its own `this` from the call site. | first defined: Chapter 002 L1
type predicate | predicate signature | A TypeScript return annotation of the form `x is T`; when the function returns true, the checker narrows the argument to `T`. | first defined: Chapter 002 L1
assertion signature | assertion function | A TypeScript return annotation of the form `asserts x is T`; if the function returns without throwing, the checker treats the argument as `T` from then on. Parses only on `function`, not on arrows. | first defined: Chapter 002 L1
narrowing | - | TypeScript shrinking a value's type to something more specific within a branch, such as from `unknown` to `User` after a type guard returns true. | first defined: Chapter 002 L1
labeled statement | label | A statement prefixed with an identifier and a colon (e.g. `loop: for (...)`), giving it a name that `break` or `continue` can target; rarely used in modern code. | first defined: Chapter 002 L1
options object | - | A single object parameter whose named fields replace a long positional parameter list, so call sites name each argument and new fields stay backward-compatible; the course default past two parameters. | first defined: Chapter 002 L2
positional parameter | positional argument | A parameter bound by its order in the call rather than by name; the first argument fills the first parameter, the second fills the second, and so on. | first defined: Chapter 002 L2
parameter default | default parameter | A value written `param = expr` in a signature that fires only when the argument is `undefined` (including a missing one), unlike `||` which also fires on other falsy values. | first defined: Chapter 002 L2
object type literal | inline object type | An inline object shape used as a type, each entry a field name, a colon, and its type, with a trailing `?` marking the field optional. | first defined: Chapter 002 L2
rest parameter | rest | A final `...name` parameter that gathers every trailing positional argument into one array; must be last and only one per signature. | first defined: Chapter 002 L2
spread argument | spread | A `...array` at a call site that unpacks an array into individual positional arguments, the reverse of a rest parameter. | first defined: Chapter 002 L2
wrapper pattern | wrapper function | A function that adds behavior (logging, timing, error translation) around another and forwards every argument straight through, typically via rest on the way in and spread on the way out. | first defined: Chapter 002 L2
falsy | - | A value that coerces to false in a boolean context; in JavaScript exactly `false`, `0`, `''`, `null`, `undefined`, and `NaN`. | first defined: Chapter 002 L2
architectural principle | senior-mindset principle | The course's running list of senior-mindset decisions that shape a 2026 SaaS codebase before any syntax is involved; each one earns its place by preventing a real bug class, not by being a style preference. | first defined: Chapter 002 L3
public surface | - | Everything about a function visible to a caller without opening its body: the name, parameter list, return type, and TSDoc; anything you'd see in an IDE tooltip or error message. | first defined: Chapter 002 L3
Hungarian notation | - | A naming style that encodes a value's type or scope in the identifier itself (`bIsAdmin`, `EStatus`); invented for early C and Visual Basic codebases where the compiler couldn't show the type at a glance. | first defined: Chapter 002 L3
Biome | - | The course's fast Rust-based linter and formatter, the 2026 replacement for ESLint plus Prettier; flags code-style problems and reformats files but can't judge whether a name describes the value. | first defined: Chapter 002 L3
Server Action | - | A Next.js async function marked `'use server'` that runs on the server but is callable straight from client code; the course's default way to handle form submissions and mutations. | first defined: Chapter 002 L3
implementation-leaking name | - | A name that encodes how today's code stores or computes a value (`userArray`, `invoicesQueryResult`) rather than what the value is, so a refactor makes it lie. | first defined: Chapter 002 L3
vague abstraction | - | A name that fits any value in the codebase (`data`, `result`, `manager`, `helper`) and therefore communicates nothing about the specific value it holds. | first defined: Chapter 002 L3
negated boolean | - | A boolean whose name bakes in a negation (`notDisabled`, `noErrors`), so it compounds with `!` at use sites into a double negative; the fix is to name the positive condition. | first defined: Chapter 002 L3
guard clause | guard | A check at the top of a function that exits early on an invalid or edge case, with no `else`, so the rest of the body can assume the happy path. | first defined: Chapter 002 L4
discriminated union | tagged union | A TypeScript type that is one of several object variants, each tagged by a shared literal field, so the compiler can narrow to a single variant per branch. | first defined: Chapter 002 L4
discriminant | tag | The literal-typed field shared across the variants of a discriminated union that the dispatch reads to pick a case. | first defined: Chapter 002 L4
never | never type | TypeScript's bottom type, the type with no values; used as a parameter type to force a compile error when an unhandled union variant could reach the function. | first defined: Chapter 002 L4
exhaustiveness checking | exhaustive switch | Forcing the compiler to verify that every variant of a union is handled, typically a `switch` whose `default` calls `assertNever` so a missing case fails the build. | first defined: Chapter 002 L4
assertNever | - | A helper typed `(x: never): never` that, placed in a switch `default`, turns a forgotten discriminated-union variant into a compile error and throws if ever reached at runtime. | first defined: Chapter 002 L4
noFallthroughCasesInSwitch | - | A TypeScript compiler flag enabled in the course's tsconfig.json that makes a switch case without a terminating statement (break, return, throw, continue) a compile error. | first defined: Chapter 002 L4
noUncheckedIndexedAccess | - | A TypeScript compiler flag that adds `| undefined` to the type of any indexed access (arr[i], obj[key]) where the key isn't statically known, forcing the caller to handle the miss. | first defined: Chapter 002 L4
optional chaining | ?. | The `?.` operator family — `?.`, `?.()`, `?.[…]` — for accessing a property, calling a method, or indexing when the receiver might be null or undefined, short-circuiting the whole expression to undefined at the first nullish link. | first defined: Chapter 002 L5
nullish | - | The two values JavaScript treats as genuinely missing, null and undefined, distinct from the wider falsy set that also includes 0, '', false, and NaN. | first defined: Chapter 002 L5
nullish coalescing | ?? | The `??` operator that returns its right operand only when the left is nullish (null or undefined), unlike `||` which also fires on any falsy left. | first defined: Chapter 002 L5
nullish coalescing assignment | ??= | The `??=` operator that assigns the right operand to the left only when the left is nullish, applying the nullish-not-falsy rule of `??` to assignment; its canonical use is lazy cache-or-compute. | first defined: Chapter 002 L5
short-circuit | short-circuiting | An expression that stops evaluating at the first link returning the early value — for `?.` the first nullish link returning undefined, for `??` a non-nullish left returning itself. | first defined: Chapter 002 L5
destructuring | destructure | The syntactic form that pulls fields out of an object (by name) or positions out of an array (by order) and binds them as local variables in one expression; works at the parameter signature, after assignment, and inside function bodies. | first defined: Chapter 002 L6
shadowing | shadow | When an inner-scope binding reuses a name from an enclosing scope, the inner one hides the outer for the rest of the block, so references resolve to the inner binding. | first defined: Chapter 002 L6
tuple | - | A fixed-length array whose positions each carry a distinct, agreed meaning, so order is part of the contract rather than incidental. | first defined: Chapter 002 L6
closure | - | A function paired with the variables it can see from where it was written; when it runs it reads those bindings themselves, not snapshots of the values they held when it was defined. | first defined: Chapter 002 L7
lexical environment | - | The set of bindings in scope at the spot in the source where a function is defined, which the function carries with it as its closure. | first defined: Chapter 002 L7
scope chain | - | The ordered list of enclosing scopes a name lookup walks until it finds the binding or fails; fixed at write time by where the function is defined. | first defined: Chapter 002 L7
higher-order function | - | A function that takes a function as input or returns a function as output, such as a factory that returns a configured handler. | first defined: Chapter 002 L7
module scope | - | The top-level scope of a module file, evaluated once at module load, so a binding declared there is shared across every later call into the module rather than being per-call or per-request. | first defined: Chapter 002 L7
dot access | dot notation | Reading or writing a field by a name written literally after a dot (`obj.field`); checked against the object's known shape and the default form for a known field. | first defined: Chapter 003 L1
bracket access | bracket notation, indexed access | Reading or writing a field by a key expression in brackets (`obj[key]`); the form for non-identifier, variable, or runtime-computed keys, and the one that can reach the prototype chain. | first defined: Chapter 003 L1
prototype chain | prototype | The chain of objects JavaScript walks on a property miss, ending at `Object.prototype`, which is why members like `toString` and `hasOwnProperty` are reachable on any object literal without being defined on it. | first defined: Chapter 003 L1
object spread | spread, shallow merge | The `{ ...obj }` form that copies an object's own enumerable properties one level deep into a new literal; when keys collide the right-most occurrence wins. | first defined: Chapter 003 L1
property shorthand | shorthand | The object-literal form that writes a field once when a local variable's name matches the field name (`{ name }` for `{ name: name }`). | first defined: Chapter 003 L1
computed key | computed property name | The object-literal form that takes the key from a bracketed expression on the left of the colon (`{ [fieldName]: value }`), for keys not known when the literal is written. | first defined: Chapter 003 L1
structural typing | structural type system | TypeScript matching types by shape rather than name, so any value carrying the required fields satisfies a type even with extra fields the type never mentioned. | first defined: Chapter 003 L1
enumerable | enumerable property | A property that appears when an object's keys are iterated or listed; keys written in a literal are enumerable, while some built-in properties are non-enumerable so loops and `Object.keys` skip them. | first defined: Chapter 003 L1
Record<string, T> | Record type | A TypeScript object type with dynamic string keys all sharing value type T, equivalent to `{ [key: string]: T }`. | first defined: Chapter 003 L1
Object.hasOwn | - | The ES2022 static that checks whether a key is the object's own property, ignoring the prototype chain, replacing the older `Object.prototype.hasOwnProperty.call(obj, key)`. | first defined: Chapter 003 L1
Object.groupBy | - | The ES2024 static that buckets an array's items into an object keyed by a string the callback returns, replacing the hand-written `.reduce` grouping pattern. | first defined: Chapter 003 L1
Object.create(null) | - | An object created with no prototype, so it has no inherited members and a user-controlled key can never collide with `Object.prototype` methods; used for safe lookup tables. | first defined: Chapter 003 L1
non-mutating method | non-mutating update, non-mutating twin | An array method that returns a new array with a new reference instead of changing the original in place (toSorted, toReversed, toSpliced, with), so reference-comparing systems like React detect the change. | first defined: Chapter 003 L2
shallow copy | shallow clone | A copy that produces a new outer array or object but reuses the references to any nested objects inside, one level deep; what spread and `.slice()` produce. | first defined: Chapter 003 L2
iterable | iteration protocol | Any value implementing the iteration protocol so it can be spread or passed to `Array.from`, including Set, NodeList, generators, strings, arguments, and URLSearchParams. | first defined: Chapter 003 L2
sparse array | - | An array with holes, index positions that were never assigned, such as the length-3 result of `Array(3)`; most array methods skip the holes silently. | first defined: Chapter 003 L2
SameValueZero | - | The equality JavaScript uses for Set and Map keys, like `===` for values except it treats NaN as equal to itself, so a Set never holds two NaN entries. | first defined: Chapter 003 L2
accumulator | acc | The running value `.reduce` carries from one callback call to the next; it starts at the initial value passed as the second argument and becomes the method's result after the last element. | first defined: Chapter 003 L3
Object.fromEntries | - | The built-in that turns an iterable of `[key, value]` pairs into an object, the linear-time inverse of `Object.entries`; paired with `.map` it builds a lookup object in one walk instead of a quadratic `.reduce` spread. | first defined: Chapter 003 L3
non-null assertion | non-null assertion operator, postfix ! | TypeScript's trailing `!` operator (`arr[i]!`) that tells the checker a value is not null or undefined without any runtime check, commonly used to silence the `| undefined` that noUncheckedIndexedAccess adds to an indexed read. | first defined: Chapter 003 L3
Set | - | A built-in collection of unique values with no keys and no payload, decided "same value" by SameValueZero; answers membership (`.has`) in constant time and supports set algebra. | first defined: Chapter 003 L4
Map | - | A built-in collection of key-value entries where keys can be any type and identity is preserved; a hash table built for churn that guarantees insertion-ordered iteration in the spec. | first defined: Chapter 003 L4
WeakMap | - | A Map variant that holds its keys weakly, so an entry is reclaimed once nothing else references its key; keys must be objects and it has no iteration or `.size`. Used to cache per-object data that must not keep the object alive. | first defined: Chapter 003 L4
WeakSet | - | The set cousin of WeakMap: weakly-held object members and no values, for "have I already processed this object?" checks that must not keep the object alive. | first defined: Chapter 003 L4
record | - | An object whose shape is fixed and known, like `{ id, email, name }`, where the keys are part of the type; the object literal is its container, as opposed to a dictionary. | first defined: Chapter 003 L4
dictionary | - | A collection with a dynamic keyspace, where which keys are present is part of the data rather than the type; `Map` is its container, as opposed to a record. | first defined: Chapter 003 L4
set algebra | set methods | The ES2025 Set composition methods that combine two set-like operands: union, intersection, difference, and symmetricDifference return a new Set; isSubsetOf, isSupersetOf, and isDisjointFrom return a boolean. | first defined: Chapter 003 L4
set-like | - | Any object a Set composition method accepts as its operand: anything with `.size`, `.has(value)`, and `.keys()`, which a Map satisfies. | first defined: Chapter 003 L4
hash table | - | A data structure that stores key-value entries so lookup, insert, and delete are all roughly constant-time regardless of entry count, by computing each key's storage location from the key itself. | first defined: Chapter 003 L4
garbage collector | garbage collection | The part of the JavaScript engine that automatically frees memory holding objects nothing references anymore, so you never free memory by hand. | first defined: Chapter 003 L4
internal slots | internal slot | Engine-managed storage that a Map or Set keeps its entries in, invisible to `JSON.stringify`, which only serializes an object's own enumerable properties, so both stringify to `'{}'`. | first defined: Chapter 003 L4
Map.groupBy | - | The non-string-key cousin of Object.groupBy: same signature, but it returns a Map and the key the callback returns can be any type, preserving instances like Date instead of stringifying them. | first defined: Chapter 003 L4
iteration protocol | - | The two-method contract behind `for...of`, spread, and `Array.from`: an iterable exposes `[Symbol.iterator]()` returning an iterator, and the iterator exposes `.next()` returning `{ value, done }`. | first defined: Chapter 003 L5
iterator | - | An object with a `.next()` method returning `{ value, done }`; once `done` is true it is exhausted, with nothing left to hand back. | first defined: Chapter 003 L5
own properties | own property | A property defined directly on the object, not inherited from its prototype; `Object.entries`, `Object.keys`, and `Object.values` walk only own properties, while `for...in` walks own plus inherited. | first defined: Chapter 003 L5
generator | generator function | A `function*` whose body uses `yield`; calling it runs nothing and returns an object that is both iterator and iterable, where each `yield` pauses execution and hands out a value and the next `.next()` resumes it. | first defined: Chapter 003 L5
iterator helpers | lazy helpers | The ES2025 `Iterator.prototype` methods (`.map`, `.filter`, `.take`, `.drop`, `.toArray`, and others) that run lazily on any iterator without building intermediate arrays; reach for them when the source is lazy, large, or short-circuits. | first defined: Chapter 003 L5
Iterator.from | - | The ES2025 static that wraps any iterable (array, Set, Map, generator, or custom) into an iterator so the lazy helper chain becomes available on it. | first defined: Chapter 003 L5
for await...of | - | The loop for asynchronous sources such as a `ReadableStream` or a paginated API; the same shape as `for...of` but it awaits each value before binding it. | first defined: Chapter 003 L5
regular expression | regex, regexp | A pattern that describes a set of strings, written as a literal between slashes (/.../) or via new RegExp(...), and run against a string with .test, .match, .matchAll, or .replaceAll. | first defined: Chapter 003 L6
regex flag | flag | A single letter after a regex that turns on one behavior: g (global), i (case-insensitive), m (multiline), s (dotAll), u (Unicode), v (Unicode sets). | first defined: Chapter 003 L6
named capture group | named group | A regex group written (?<name>...) that exposes its captured text under a name on match.groups, instead of by position; reference it with \k<name> and in replacements with $<name>. | first defined: Chapter 003 L6
character class | - | The bracketed part of a regex, like [a-z] or [\p{Letter}], that matches any single character from the set it lists. | first defined: Chapter 003 L6
quantifier | - | A regex symbol setting how many times the preceding piece may repeat: + (one or more), * (zero or more), ? (zero or one), {n,m} (a bounded range). | first defined: Chapter 003 L6
backreference | - | A reference inside a regex to text an earlier group already captured, so the pattern matches the same text again: \k<name> for named groups, \1 for indexed. | first defined: Chapter 003 L6
property escape | Unicode property escape | A regex \p{...} (or \P{...} for the negation) escape that matches Unicode characters by named property such as \p{Letter} or \p{Script=Han}; requires the u or v flag. | first defined: Chapter 003 L6
lookaround | lookahead, lookbehind | A regex assertion that matches a position by what surrounds it without consuming characters, in four forms: (?=...), (?!...), (?<=...), (?<!...). | first defined: Chapter 003 L6
Unicode mode | u flag | The u regex flag enabling Unicode-aware matching: full code-point handling, validation of escape sequences, and \p{...} property escapes. | first defined: Chapter 003 L6
Unicode sets mode | v flag | The v regex flag (ES2024) that supersedes u, adding set operations (&&, --) inside character classes and properties-of-strings like \p{RGI_Emoji}; mutually exclusive with u. | first defined: Chapter 003 L6
ReDoS | regular-expression denial of service | A denial of service where adversarial input on a regex with nested quantifiers like (a+)+ triggers catastrophic backtracking; avoid nesting quantifiers and length-cap untrusted input before the regex. | first defined: Chapter 003 L6
Language Server Protocol | LSP | The contract between an editor and a language tool like a type-checker or linter, so the same diagnostics can run in any editor that speaks the protocol. | first defined: Chapter 003 L7
blame | git blame | Git's record of which commit and author last changed each line of a file; "who touched this line, and when." | first defined: Chapter 003 L7
EditorConfig | .editorconfig | A cross-editor config file at the repo root whose rules (indent, line endings, charset, final newline) any editor honoring the spec applies, so editor basics stay consistent across the team. | first defined: Chapter 003 L7
mise | rtx | The course's Rust-based polyglot version manager (formerly rtx) that pins a project's Node, Python, and other runtime versions in a committed `.mise.toml`, so the runtime is a property of the repo rather than each machine. | first defined: Chapter 003 L8
LTS | Long-Term Support | The release line a Node major lands on after its initial Current phase, with roughly 30 months of bug fixes and security patches; the course's default for predictable updates. | first defined: Chapter 003 L8
type-stripping | type-stripper, native type-stripping | Node 24's built-in step that blanks out the type-only parts of a `.ts` file (annotations, interfaces, `type` aliases) at parse time and runs the resulting JavaScript, with no flag, build step, or type-check. | first defined: Chapter 003 L8
tsx | - | A third-party CLI that runs `.ts` files like `node` but reads `tsconfig.json` and uses esbuild to transform what native Node refuses (path aliases, JSX, decorators, enum, namespace); a development tool, never a production runtime. | first defined: Chapter 003 L8
tsc | TypeScript compiler | The TypeScript compiler; it doesn't run code but type-checks the codebase with `tsc --noEmit` or, without the flag, emits `.js` plus `.d.ts` declarations when publishing a library. | first defined: Chapter 003 L8
esbuild | - | A fast Go-based JavaScript and TypeScript bundler and transformer; tsx embeds it to convert the syntax native Node refuses into runnable JavaScript. | first defined: Chapter 003 L8
path alias | - | A short prefix declared in tsconfig.json that maps to a directory, so `@/lib/greet` resolves to `src/lib/greet` no matter how deep the importing file sits. | first defined: Chapter 003 L8
scoped package | scope | An npm package whose name begins with an `@`-prefixed scope followed by a slash and the package name (`@scope/name`); native Node misreads a `@/` path alias as one. | first defined: Chapter 003 L8
moduleResolution bundler | bundler resolution | The tsconfig.json moduleResolution setting that matches how tools like tsx and esbuild resolve imports: it understands extensionless imports and resolves `paths` aliases the way the runtime does. | first defined: Chapter 003 L8
pnpm dlx | - | The pnpm command that downloads a CLI into a temporary store, runs it once, and forgets it, the same one-shot pattern `npx` follows; the no-install way to run tsx or tsc before the project has a package.json. | first defined: Chapter 003 L8

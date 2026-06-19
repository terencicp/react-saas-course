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

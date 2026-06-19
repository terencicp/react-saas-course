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

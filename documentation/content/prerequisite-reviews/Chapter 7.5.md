# Chapter 7.5 prerequisites review

## Missing prerequisites

- **Lesson 7.5.4** — trigram GIN index for ILIKE search. Quote: "ILIKE on a small searchable column. `WHERE name ILIKE '%' || $q || '%'` with a trigram index (Chapter 6.5's GIN index)." The cross-reference is wrong: Chapter 6.5 covers Drizzle Kit migrations and contains no GIN content. The nearest prior coverage is 6.3.8, which explicitly marks `pg_trgm` as "named for recognition, not taught at depth," and 6.4.1, which names GIN indexes for `tsvector` and `jsonb` but not for trigram-based ILIKE. No prior chapter teaches how to declare or apply a `pg_trgm` GIN index for ILIKE queries. Suggested source: add a `pg_trgm` section to 6.4.1, or correct the cross-reference to 6.4.1 and expand that lesson to cover the `pg_trgm` GIN index shape. Severity: low.

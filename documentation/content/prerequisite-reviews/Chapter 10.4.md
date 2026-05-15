# Chapter 10.4 prerequisites review

## Missing prerequisites

- <Lesson 10.4.4> — `inet` Drizzle column builder. Quote: "the `inet` type for `actorIp`". The `actorIp inet null` column appears in the reference solution and the lesson goals require the student to write it. Chapter 6.2.3 surveys the "2026 subset" of Drizzle pg-core types (`text`, `numeric`, `timestamptz`, `uuid`, `jsonb`, `pgEnum`, arrays) but omits `inet`. Chapter 10.2.5 mentions `inet` only in a watch-out ("Postgres has an `inet` type that validates the shape; senior reflex is to use it") without showing the Drizzle builder call. No prior lesson demonstrates `inet('column')` in a schema file. Suggested source: add one line to 6.2.3 naming `inet` under "Geographic, full-text, binary — named, deferred" or in a new bullet for network-address types, with the Drizzle builder call shown. Severity: low.

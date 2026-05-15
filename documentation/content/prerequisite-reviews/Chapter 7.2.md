# Chapter 7.2 prerequisites review

## Missing prerequisites

- **Lesson 7.2.3** — Catching Postgres unique-constraint violations as typed error codes in application code. Quote: "if (isUniqueViolation(e)) return err('conflict', '...')". The chapter attributes this to Chapter 6.4 ("the Drizzle unique-violation detection helper (Chapter 6.4 owns the database side; this lesson names it)"), but Chapter 6.4.4 only covers SQLSTATE 40001 (serialization failure) with an explicit retry pattern. The concept that unique-constraint violations surface as catchable exceptions with a detectable error code (23505), and that a helper like `isUniqueViolation()` exists to inspect them, is not introduced anywhere before Chapter 7.2. Suggested source: add a bullet to Chapter 6.4.4 covering the 23505 SQLSTATE, or add a new lesson 6.4.X covering Postgres constraint-error mapping in application code. Severity: medium.

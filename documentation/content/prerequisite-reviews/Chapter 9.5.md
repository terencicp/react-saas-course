# Chapter 9.5 prerequisites review

## Missing prerequisites

- Lesson 9.5.3 — `mapAuthError` helper. Quote: "catch (e) { return mapAuthError(e); }". The reference solution signature displayed in lesson 9.5.3 calls `mapAuthError(e)` as if the helper is already known, but no prior chapter outline introduces it, it is not listed in the starter file tree (neither as a provided nor as a TODO file), and it does not appear in any Unit 9 teaching chapter (9.2, 9.3, 9.4). The lesson's own build-step narrative says only "On unique-violation error, return `err('conflict', …)`. (Map by Better Auth's error code.)" — suggesting the student is expected to inline the mapping — but the shown reference code contradicts this by calling an undefined utility. Suggested source: define `mapAuthError` inline in 9.3.1 or 9.3.2 (where Better Auth error codes are catalogued), or add it as a provided utility in the 9.5 starter and list it in the starter file tree. Severity: medium.

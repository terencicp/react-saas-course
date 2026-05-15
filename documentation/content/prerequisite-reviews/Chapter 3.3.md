# Chapter 3.3 prerequisites review

## Missing prerequisites

- Lesson 3.3.3 — Next.js Route Handler authoring shape (`route.ts`, `NextResponse`). Quote: "The student writes a tiny `route.ts` exporting `OPTIONS` and `GET`/`POST` handlers, each returning the response with the four headers. The Next.js 16 idiom is to set headers on the `Response` constructor or via `NextResponse.json(body, { headers })`". The `export async function GET / POST` dispatch is named once in 3.2.1 as a one-liner, but `NextResponse`, the `app/api/` file placement, and the full handler shape are not taught until Unit 5. Suggested source: a short intro lesson in Unit 3 or Unit 5.1, or a forward-reference callout in 3.3.3 pointing to the Unit 5 chapter where Route Handlers are taught. Severity: medium.

# Chapter 16.4 prerequisites review

## Missing prerequisites

- Lesson 16.4.4 — `z.flattenError` (Zod 4 top-level function). Quote: "errors via `validateBilling` + `flattenError`" and "const contactErrors = useWizardStore((s) => { const result = s.validateContact(); return result.success ? null : z.flattenError(result.error).fieldErrors })". Lesson 7.1.5 teaches `z.treeifyError` as the v4 default and mentions `error.flatten()` (the method on the ZodError instance) but never names the standalone module-level function `z.flattenError`. No prior chapter outline introduces it by that name. Suggested source: add one line to lesson 7.1.5 noting that `z.flattenError(error)` is the top-level equivalent of `error.flatten()` and produces the same `{ fieldErrors, formErrors }` shape. Severity: low.

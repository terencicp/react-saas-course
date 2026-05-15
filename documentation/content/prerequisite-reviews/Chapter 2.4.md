# Chapter 2.4 prerequisites review

## Missing prerequisites

- **Lesson 2.4.2** — `exactOptionalPropertyTypes: true` assumed active. Quote: "The strict tsconfig's `exactOptionalPropertyTypes: true` (from 1.3.2) makes the language enforce it." Chapter 1.4.3 explicitly states the starter does **not** set this flag and parks it as a conditional opt-in: "Named here so the student knows it exists and knows the trigger to turn it on." Chapter 1.3.2 is Biome configuration and has no tsconfig content at all. The `?` vs `| undefined` distinction the lesson teaches is real and correct, but framing the enforcement as an active tsconfig flag contradicts 1.4.3's explicit non-adoption. Suggested source: update the 2.4.2 framing to note the distinction holds conceptually under `strict` alone (TypeScript still differentiates the two in type-checking), and move any enforcement claim to a conditional: "if `exactOptionalPropertyTypes` is on (covered in 1.4.3 as an opt-in)." Severity: **medium**.

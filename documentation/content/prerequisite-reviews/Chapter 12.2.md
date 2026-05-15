# Chapter 12.2 prerequisites review

## Missing prerequisites

- <Lesson 12.2.7> — Trigger.dev SDK shape used as a known example before introduction. Quote: "Trigger.dev's primitives (`task`, `schemaTask`, `runs.trigger`) are themselves the abstraction … Call sites read `myTask.trigger(payload)`". Trigger.dev is first taught in Chapter 13.1 (Unit 13), which comes after Unit 12. The lesson's comparison matrix lists Trigger.dev as a row and relies on the student recognising the SDK's call-site shape to follow the "fails the test" argument. Suggested source: move the lesson to after Chapter 13.1, or replace the Trigger.dev example with a prior-unit SDK (e.g., a hypothetical second-email-provider swap using the Unit 8 Resend surface). Severity: medium.

- <Lesson 12.2.7> — R2 / S3-compatible SDK shape used as a known example before introduction. Quote: "The S3-compatible SDK is verbose (`PutObjectCommand({ Bucket, Key, Body, ContentType })`), but the call sites are few (one for presigned upload, one for presigned download — Chapter 13.3)". Cloudflare R2 and the S3 SDK are first taught in Chapter 13.3 (Unit 13), which comes after Unit 12. The matrix row for R2 and the code snippet assume familiarity with `PutObjectCommand` and presigned-URL concepts. Suggested source: move the lesson to after Chapter 13.3, or replace with a prior-unit example. Severity: medium.

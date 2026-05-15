# Chapter 3.6 prerequisites review

## Missing prerequisites

- Lesson 3.6.2 — `Uint8Array` as the chunk type. Quote: "the loop yields a `Uint8Array` per chunk". `Uint8Array` is used throughout 3.6.2 (chunk decoding, `TextDecoder` input, `TextEncoder` output) as if the student already knows what a typed array is. Chapter 2.3 explicitly defers typed arrays to Unit 3.7: "Typed arrays (`Uint8Array`, `Int32Array`, etc.). Rarely reached for in the SaaS UI/server surface; named once if at all when binary data (file upload, Web Crypto) lands in Unit 3.7." Since 3.6 precedes 3.7, the student has never encountered `Uint8Array` when they hit the chunk-reading loop. Suggested source: a brief (one paragraph) introduction of `Uint8Array` as a fixed-length byte buffer at the start of 3.6.2, or move the one-sentence introduction currently deferred to 3.7 into 3.6.2 directly. Severity: medium.

# Chapter 6.1 prerequisites review

## Missing prerequisites

- **Lesson 6.1.2** — Docker concepts (images, containers, volumes, port mapping). Quote: "`docker compose up` with the official `postgres:17` image, a named volume, port 5432 mapped to localhost". The lesson treats Docker as actionable setup without explaining what a container, image, or named volume is. No prior unit introduces Docker. Suggested source: new lesson in Unit 1 (toolchain chapter) or a brief framing section at the top of 6.1.2 itself. Severity: medium.

- **Lesson 6.1.3** — Vercel project structure and preview deployments. Quote: "install the Vercel Neon integration on the Vercel project; verify that the preview env shows a per-deploy branch URL". The provisioning walkthrough assumes the student knows what a Vercel project is, how PR preview deployments work, and how to install a Vercel integration. These concepts are introduced in Unit 21 (Chapter 21.3). The lesson's own scope note acknowledges "Vercel deployment, environment variables, preview deployments at depth — Unit 21", but the setup walkthrough still asks students to act on Vercel before that unit. Suggested source: Chapter 21.3 (Vercel deployment), or limit the 6.1.3 walkthrough to read-only description with a forward reference. Severity: low.

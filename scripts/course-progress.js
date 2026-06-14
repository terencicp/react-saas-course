// Recomputes the `course-progress` frontmatter on every lesson MDX.
//
// `course-progress` is a 0–1 fraction (see src/content.config.ts and
// src/components/ui/CourseProgressBar.astro) showing how far through the whole
// course a lesson sits. We derive it from word counts: walk the lessons in
// course order, keep a running total where each lesson's accumulated count is
// the previous lesson's total plus this lesson's own words, then store each
// lesson's accumulated count divided by the grand total.
//
// Usage:
//   node scripts/course-progress.js          # rewrite every lesson's field
//   node scripts/course-progress.js --dry     # print what would change, write nothing

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(root, 'src/content/docs');
const dryRun = process.argv.includes('--dry');

// `0 Demos/` holds playground pages, not course lessons, so they stay out of
// the progress accounting.
const skipTopDirs = new Set(['0 Demos']);

async function mdxFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return mdxFiles(full);
      // Skip the course homepage; only numbered lessons carry progress.
      if (entry.name === 'index.mdx') return [];
      return entry.name.endsWith('.mdx') ? [full] : [];
    }),
  );
  return files.flat();
}

// Count words in the lesson body (everything after the frontmatter block).
function bodyWordCount(text) {
  const body = text.replace(/^---\n[\s\S]*?\n---\n?/, '');
  return (body.match(/\S+/g) ?? []).length;
}

// Replace the `course-progress` line in the frontmatter, or insert one just
// before the closing `---` if the lesson doesn't have the field yet.
function setProgress(text, value) {
  const line = `course-progress: ${value}`;
  const fm = /^(---\n[\s\S]*?\n)(---\n)/;
  const match = text.match(fm);
  if (!match) return text; // no frontmatter; leave the file untouched

  let block = match[1];
  if (/^course-progress:.*$/m.test(block)) {
    block = block.replace(/^course-progress:.*$/m, line);
  } else {
    block += `${line}\n`;
  }
  return text.replace(fm, `${block}${match[2]}`);
}

// Lessons live under numbered folders ("080 …") with un-padded numbered files
// ("1 …", "10 …"), so a numeric-aware sort over the relative path gives the
// reading order without needing to parse sidebar metadata.
const collator = new Intl.Collator('en', { numeric: true });

const allFiles = (await mdxFiles(docsDir))
  .filter((f) => !skipTopDirs.has(path.relative(docsDir, f).split(path.sep)[0]))
  .map((f) => ({ file: f, rel: path.relative(docsDir, f) }))
  .sort((a, b) => collator.compare(a.rel, b.rel));

// First pass: word count per lesson and the running accumulated total.
let accumulated = 0;
const lessons = [];
for (const { file, rel } of allFiles) {
  const text = await readFile(file, 'utf8');
  accumulated += bodyWordCount(text);
  lessons.push({ file, rel, text, accumulated });
}

const total = accumulated;
if (total === 0) {
  console.error('No lesson words found — nothing to do.');
  process.exit(1);
}

// Second pass: write each lesson's fraction of the grand total.
let changed = 0;
for (const lesson of lessons) {
  const value = Number((lesson.accumulated / total).toFixed(4));
  const next = setProgress(lesson.text, value);
  if (next !== lesson.text) {
    changed++;
    if (dryRun) console.log(`${value}\t${lesson.rel}`);
    else await writeFile(lesson.file, next);
  }
}

console.log(
  `${dryRun ? 'Would update' : 'Updated'} ${changed}/${lessons.length} lessons ` +
    `(${total.toLocaleString('en')} words total).`,
);

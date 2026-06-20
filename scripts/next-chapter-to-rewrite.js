// Finds the next chapter whose lessons have not been through the prose rewrite
// pipeline yet.
//
// A lesson is considered "rewritten" once the rewrite pipeline stamps a
// `rewrites:` key into its frontmatter (see any lesson under "002 …"). A
// chapter counts as rewritten if ANY of its lesson MDX files carry that key —
// the pipeline always stamps every non-quiz lesson, so the first lesson is
// enough to tell a touched chapter from an untouched one.
//
// "Next" means the first chapter in course order (numeric-aware) with zero
// rewritten lessons. By default the absolute chapter folder path is printed on
// a single stdout line so it can be fed straight to the chapter rewrite
// orchestrator; with `--list` every chapter's status is printed instead.
//
// Usage:
//   node scripts/next-chapter-to-rewrite.js          # print next chapter folder path
//   node scripts/next-chapter-to-rewrite.js --list    # print every chapter's status

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Don't crash when stdout is closed early (e.g. piped into `head`).
process.stdout.on('error', (err) => {
  if (err.code === 'EPIPE') process.exit(0);
  throw err;
});

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(root, 'src/content/docs');
const listMode = process.argv.includes('--list');

// Top-level entries that are not course chapters.
const skipTopDirs = new Set(['0 Demos']);

// A chapter folder is a top-level directory whose name starts with a digit
// ("001 …", "002 …"); anything else (index.mdx, `0 Demos`) is not a chapter.
function isChapterDir(entry) {
  return (
    entry.isDirectory() &&
    /^\d/.test(entry.name) &&
    !skipTopDirs.has(entry.name)
  );
}

// Numeric-aware ordering so "002" precedes "010" and "1 …" precedes "10 …".
const collator = new Intl.Collator('en', { numeric: true });

// Pull the YAML frontmatter block (between the first two `---` fences) so the
// `rewrites:` check never matches the word appearing in lesson body prose.
function frontmatter(text) {
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  return match ? match[1] : '';
}

function hasRewritesKey(text) {
  return /^rewrites:/m.test(frontmatter(text));
}

// Count lessons and rewritten lessons in one chapter folder. Only `.mdx` files
// directly inside the folder are lessons; the chapter quiz is included in the
// total but never carries a `rewrites:` key, which is fine — we only need to
// know whether the count of rewritten lessons is zero.
async function chapterStatus(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const lessons = entries.filter(
    (e) => e.isFile() && e.name.endsWith('.mdx'),
  );
  let rewritten = 0;
  for (const lesson of lessons) {
    const text = await readFile(path.join(dir, lesson.name), 'utf8');
    if (hasRewritesKey(text)) rewritten++;
  }
  return { lessons: lessons.length, rewritten };
}

const entries = await readdir(docsDir, { withFileTypes: true });
const chapters = entries
  .filter(isChapterDir)
  .map((e) => e.name)
  .sort((a, b) => collator.compare(a, b));

if (chapters.length === 0) {
  console.error(`No chapter folders found under ${docsDir}.`);
  process.exit(1);
}

if (listMode) {
  for (const name of chapters) {
    const { lessons, rewritten } = await chapterStatus(path.join(docsDir, name));
    const mark = rewritten === 0 ? '   ' : rewritten === lessons ? ' ok' : '...';
    console.log(`${mark}  ${String(rewritten).padStart(2)}/${lessons}  ${name}`);
  }
  process.exit(0);
}

for (const name of chapters) {
  const { rewritten } = await chapterStatus(path.join(docsDir, name));
  if (rewritten === 0) {
    // Single clean line on stdout: the chapter folder path for the orchestrator.
    console.log(path.join(docsDir, name));
    process.exit(0);
  }
}

console.error('Every chapter already has rewritten lessons — nothing to do.');
process.exit(1);

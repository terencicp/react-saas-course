// Scans every lesson MDX under src/content/docs for <VideoCallout> embeds and
// reports any YouTube videoId that appears in more than one place. A single
// recursive readdir + one regex pass per file keeps it fast over the whole
// corpus.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const docsDir = path.join(root, 'src/content/docs');

// Match each VideoCallout's videoId, capturing an optional videoTitle for
// readable output. Attribute order on the tag is consistent across lessons.
const calloutRe =
  /<VideoCallout\b[^>]*\bvideoId="([^"]+)"(?:[^>]*\bvideoTitle="([^"]+)")?/g;

async function mdxFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(
    entries.map((entry) => {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) return mdxFiles(full);
      return entry.name.endsWith('.mdx') ? [full] : [];
    }),
  );
  return files.flat();
}

const occurrences = new Map(); // videoId -> [{ file, title }]

for (const file of await mdxFiles(docsDir)) {
  const text = await readFile(file, 'utf8');
  const rel = path.relative(docsDir, file);
  for (const [, videoId, title] of text.matchAll(calloutRe)) {
    if (!occurrences.has(videoId)) occurrences.set(videoId, []);
    occurrences.get(videoId).push({ file: rel, title });
  }
}

const duplicates = [...occurrences.entries()]
  .filter(([, hits]) => hits.length > 1)
  .sort((a, b) => b[1].length - a[1].length);

if (duplicates.length === 0) {
  console.log('No duplicate VideoCallout videoIds found.');
  process.exit(0);
}

console.log(`Found ${duplicates.length} duplicated videoId(s):\n`);
for (const [videoId, hits] of duplicates) {
  const title = hits.find((h) => h.title)?.title ?? '(no title)';
  console.log(`${videoId} — ${title} (${hits.length}×)`);
  for (const hit of hits) console.log(`    ${hit.file}`);
  console.log();
}

process.exit(1);

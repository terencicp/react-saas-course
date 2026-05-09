// Wraps `astro dev` and restarts it whenever a NEW content file appears under
// src/content/docs/. Astro's docsLoader() doesn't pick up new entries via HMR
// (rendering throws UnknownContentCollectionError until the server restarts);
// edits to existing files HMR fine, so we listen for `add` events only.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import chokidar from 'chokidar';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// We invoke the local astro binary directly (not via `npx`) so SIGTERM goes
// straight to the astro process — npx in the middle swallows signals and
// makes it ambiguous whether an exit was a kill or a real crash.
const astroBin = path.join(root, 'node_modules', '.bin', 'astro');
// chokidar v4+ dropped glob support, so we watch the directory and filter
// matches in the `add` handler.
const watchDir = 'src/content/docs';
const isContentFile = (file) => /\.(md|mdx)$/.test(file);

const astroArgs = process.argv.slice(2);

let child = null;
let restarting = false;

function startAstro() {
  restarting = false;
  child = spawn(astroBin, ['dev', ...astroArgs], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    const wasIntentional = restarting;
    child = null;
    if (wasIntentional) {
      startAstro();
      return;
    }
    // Real exit (Ctrl+C from astro itself, or a crash). Forward the status.
    if (signal) process.kill(process.pid, signal);
    else process.exit(code ?? 0);
  });
}

function restartAstro() {
  if (!child) {
    startAstro();
    return;
  }
  restarting = true;
  child.kill('SIGTERM');
}

let pending = null;
function scheduleRestart(reason) {
  if (pending) clearTimeout(pending);
  pending = setTimeout(() => {
    pending = null;
    console.log(`\n[dev] ${reason} — restarting astro dev...\n`);
    restartAstro();
  }, 200);
}

startAstro();

chokidar
  .watch(watchDir, { cwd: root, ignoreInitial: true })
  .on('add', (file) => {
    if (!isContentFile(file)) return;
    scheduleRestart(`new content file: ${file}`);
  });

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    if (child) child.kill(sig);
    process.exit(0);
  });
}

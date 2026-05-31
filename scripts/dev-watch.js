// Supervises `scripts/dev.js` and brings it back up whenever the dev server
// crashes (exits with a non-zero code). dev.js handles content-file restarts
// but forwards real crashes; this layer turns those crashes into restarts so a
// long session survives an occasional astro/vite blow-up unattended.
//
// We restart on a non-zero exit code only. An exit via signal means someone
// (Ctrl+C, `kill`) stopped it on purpose — dev.js re-raises that signal, so we
// honour it instead of fighting the user. A clean exit (code 0) also stops.

import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const devScript = path.join(root, 'scripts', 'dev.js');
const args = process.argv.slice(2);

// Back off between restarts so a server that crashes on boot (e.g. a broken
// astro.config) doesn't spin in a tight loop. A run that stays up long enough
// to be healthy resets the delay so the next crash restarts promptly.
const MIN_DELAY = 500;
const MAX_DELAY = 10_000;
const HEALTHY_MS = 5_000;
let delay = MIN_DELAY;

let child = null;
let shuttingDown = false;

function start() {
  const startedAt = Date.now();
  child = spawn(process.execPath, [devScript, ...args], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
  child.on('exit', (code, signal) => {
    const ranFor = Date.now() - startedAt;
    child = null;
    if (shuttingDown) return;
    // Deliberate stop (Ctrl+C / kill): re-raise so our exit status matches.
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    // Clean shutdown.
    if (code === 0) process.exit(0);
    // Crash: restart, resetting the backoff if the last run was healthy.
    if (ranFor >= HEALTHY_MS) delay = MIN_DELAY;
    console.log(`\n[dev:watch] dev server crashed (exit ${code}) — restarting in ${delay}ms...\n`);
    setTimeout(start, delay);
    delay = Math.min(delay * 2, MAX_DELAY);
  });
}

start();

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    shuttingDown = true;
    if (child) child.kill(sig);
    process.exit(0);
  });
}

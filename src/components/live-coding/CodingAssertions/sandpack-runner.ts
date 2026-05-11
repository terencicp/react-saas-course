// Sandpack runner — uses Sandpack's in-browser bundler so student code can
// rely on JSX/TS/Tailwind/npm. Dynamically imported by the bootstrap so
// vanilla-only pages don't pay for the ~150 KB Sandpack client.

import { appendConsole, beginResults, endResults, upsertResult } from './dom';

type SandpackStatus = 'booting' | 'ready' | 'running' | 'error';

export async function setupSandpackRunner(
  card: HTMLElement,
  getCode: () => string,
  tests: string,
  runBtn: HTMLButtonElement,
  statusEl: HTMLElement,
) {
  const iframe = card.querySelector<HTMLIFrameElement>('iframe.lc-runner-iframe')!;
  const resultsEl = card.querySelector<HTMLElement>('.lc-results')!;

  function setStatus(text: string, state: SandpackStatus) {
    statusEl.textContent = text;
    statusEl.dataset.state = state;
  }

  function buildFiles(): Record<string, { code: string }> {
    // Entry is a no-op so the bundler doesn't try to execute tests at
    // initial load. Sandpack's in-browser Jest picks up *.test.js files
    // independently when we dispatch 'run-all-tests'. Student code + tests
    // are concatenated so function declarations are visible inside tests.
    return {
      '/index.js': { code: '// entry — tests live in index.test.js\n' },
      '/index.test.js': { code: getCode() + '\n' + tests },
      '/package.json': {
        code: JSON.stringify({
          name: 'live-coding',
          version: '0.0.0',
          main: 'index.js',
          dependencies: {},
        }),
      },
    };
  }

  const { loadSandpackClient } = await import('@codesandbox/sandpack-client');
  const client = await loadSandpackClient(
    iframe,
    { files: buildFiles(), template: 'parcel', entry: '/index.js' },
    { showOpenInCodeSandbox: false, showLoadingScreen: false, showErrorScreen: false },
  );

  let running = false;

  client.listen((msg: any) => {
    if (msg.type === 'done' && !running) {
      runBtn.disabled = false;
      setStatus('Ready', 'ready');
    } else if (msg.type === 'test') {
      if (msg.event === 'total_test_start') {
        beginResults(card);
      } else if (msg.event === 'test_end') {
        const t = msg.test;
        const status = t.status === 'pass' ? 'pass' : 'fail';
        const err = t.errors?.[0];
        upsertResult(resultsEl, t.name, status, err?.message ?? (err ? String(err) : undefined));
      } else if (msg.event === 'file_error') {
        upsertResult(resultsEl, 'Code did not run', 'error', msg.error?.message ?? 'Unknown error');
      } else if (msg.event === 'total_test_end') {
        endResults(card);
        running = false;
        runBtn.disabled = false;
        setStatus('Ready', 'ready');
      }
    } else if (msg.type === 'console' && Array.isArray(msg.log)) {
      for (const entry of msg.log) appendConsole(card, entry.method, entry.data ?? []);
    }
    // Deliberately ignoring `action: 'show-error'` — Sandpack fires it per
    // assertion failure, which would double up every fail row.
  });

  runBtn.addEventListener('click', () => {
    running = true;
    runBtn.disabled = true;
    setStatus('Running…', 'running');
    client.updateSandbox({ files: buildFiles(), template: 'parcel', entry: '/index.js' });
    setTimeout(() => client.dispatch({ type: 'run-all-tests' }), 100);
  });
}

// Per-card bootstrap. Mounts CodeMirror (JSX/TS), bundles the student's TSX
// locally via esbuild-wasm, and renders the result into a same-origin `srcdoc`
// iframe. When tests are attached, an in-iframe runner posts results back over
// `window.postMessage`. Multi-card pages route by source iframe.

import { bundle, ensureEsbuild } from './bundler';
import { createEditor } from '../_shared/editor';
import { getCardRefs } from '../_shared/refs';
import { setError } from '../_shared/status';
import { wireFeedback } from '../_shared/feedback-loop';
import {
    appendTestResult,
    clearTestResults,
    collectTestResults,
} from '../_shared/iframe-harness';

// Warm esbuild-wasm in the background as soon as any ReactCoding card is on
// the page — by the time the user clicks Run, the wasm is loaded.
void ensureEsbuild().catch(() => {
    /* surfaced per-card on actual use */
});

document.querySelectorAll<HTMLElement>('.lc-react').forEach((card) => {
    void initCard(card);
});

async function initCard(card: HTMLElement): Promise<void> {
    const refs = getCardRefs(card);
    // Two iframes when target-match mode is on. The first `.lc-rc-preview`
    // without `.lc-rc-preview-target` is always the student's; the optional
    // `.lc-rc-preview-target` is the reference output.
    const iframe = card.querySelector<HTMLIFrameElement>(
        '.lc-rc-preview:not(.lc-rc-preview-target)',
    )!;
    const targetIframe = card.querySelector<HTMLIFrameElement>(
        '.lc-rc-preview-target',
    );
    const targetSrc = card.dataset.targetSrc ?? '';
    const resultsEl = card.querySelector<HTMLElement>('.lc-results');

    const starter = card.dataset.starter ?? '';
    const tests = card.dataset.tests ?? '';
    const hasTests = tests.trim().length > 0;
    const tailwind = card.dataset.tailwind !== 'false';
    const live = card.dataset.live === 'true';

    // 400ms is the "after typing settles" sweet spot — short enough to feel
    // live, long enough not to bundle on every keystroke.
    let liveDebounce: ReturnType<typeof setTimeout> | null = null;

    const view = createEditor({
        parent: refs.editor,
        doc: starter,
        lang: 'tsx',
        onDocChange: () => {
            feedback.refreshGate();
            if (live) {
                if (liveDebounce) clearTimeout(liveDebounce);
                liveDebounce = setTimeout(() => {
                    // Every live build is post-initial — runtime auto-runs
                    // tests if any.
                    initialBuild = false;
                    void rebuild({ live: true });
                }, 400);
            }
        },
    });

    const getCode = () => view.state.doc.toString();

    // Initial build is passive (runtime loads, posts tests-ready, then waits).
    // Every subsequent build is in response to a Run click, so the new
    // runtime auto-runs as soon as it loads.
    let initialBuild = true;
    let running = false;

    // esbuild's `jsx: 'automatic'` injects the right `react/jsx-runtime`
    // imports — no need for the student to write `import React`. When tests
    // are present, the runtime-tests module owns the #root mount.
    const indexTSX = hasTests
        ? `import './runtime-tests';\n`
        : `import { createRoot } from 'react-dom/client';
import { App } from './App';
createRoot(document.getElementById('root')!).render(<App />);
`;

    function buildFiles(): Record<string, string> {
        const files: Record<string, string> = {
            '/App.tsx': getCode(),
            '/index.tsx': indexTSX,
        };
        if (hasTests) {
            files['/runtime-tests.tsx'] = buildRuntimeTestsFile(tests, !initialBuild);
        }
        return files;
    }

    async function rebuild(opts: { live?: boolean } = {}): Promise<void> {
        try {
            const files = buildFiles();
            const { code } = await bundle(files, '/index.tsx');
            iframe.srcdoc = buildIframeHTML({ bundledJs: code, tailwind });
            // For preview-only cards there's no tests-ready signal — the
            // bundle landing is the readiness signal.
            if (!hasTests && refs.runBtn) refs.runBtn.disabled = false;
        } catch (err) {
            // On live (mid-keystroke) rebuilds, swallow parse errors and
            // leave the last successful preview in place. The error pane is
            // for explicit-Run failures.
            if (opts.live) return;
            const message =
                err instanceof Error ? err.message || String(err) : String(err);
            setError(refs.errorPane, message);
            running = false;
            if (refs.runBtn) refs.runBtn.disabled = false;
        }
    }

    await Promise.all([rebuild(), buildTarget()]);

    async function buildTarget(): Promise<void> {
        if (!targetIframe || !targetSrc) return;
        try {
            const files: Record<string, string> = {
                '/App.tsx': targetSrc,
                '/index.tsx': `import { createRoot } from 'react-dom/client';
import { App } from './App';
createRoot(document.getElementById('root')!).render(<App />);
`,
            };
            const { code } = await bundle(files, '/index.tsx');
            targetIframe.srcdoc = buildIframeHTML({ bundledJs: code, tailwind });
        } catch (err) {
            const message =
                err instanceof Error ? err.message || String(err) : String(err);
            setError(refs.errorPane, `Target render failed: ${message}`);
        }
    }

    // Same-origin means `e.source === iframe.contentWindow` identifies the
    // right card on multi-card pages — no per-card id needed.
    window.addEventListener('message', (e: MessageEvent) => {
        const isStudent = e.source === iframe.contentWindow;
        const isTarget = !!targetIframe && e.source === targetIframe.contentWindow;
        if (!isStudent && !isTarget) return;
        const data = e.data;
        if (!data || typeof data !== 'object' || typeof data.rcType !== 'string') return;

        switch (data.rcType) {
            case 'resize':
                if (typeof data.height === 'number') {
                    const which = isStudent ? iframe : targetIframe!;
                    const next = Math.min(Math.max(data.height, 56), 600) + 'px';
                    if (which.style.height !== next) which.style.height = next;
                }
                break;
            case 'runtime-error': {
                const prefix = isTarget ? 'Target runtime error: ' : '';
                setError(refs.errorPane, prefix + (data.stack || data.message || 'Runtime error'));
                if (isStudent) {
                    running = false;
                    if (refs.runBtn) refs.runBtn.disabled = false;
                }
                break;
            }
            // Remaining lifecycle events only originate from the student
            // iframe — the target has no runtime-tests module.
            case 'tests-ready':
                if (isStudent && !running && refs.runBtn) refs.runBtn.disabled = false;
                break;
            case 'tests-begin':
                if (isStudent) clearTestResults(resultsEl);
                break;
            case 'test-result':
                if (isStudent) {
                    appendTestResult(resultsEl, data.name, data.status, data.error);
                }
                break;
            case 'tests-end':
                if (isStudent) {
                    running = false;
                    if (refs.runBtn) refs.runBtn.disabled = false;
                }
                break;
        }
    });

    refs.runBtn?.addEventListener('click', () => {
        if (liveDebounce) {
            clearTimeout(liveDebounce);
            liveDebounce = null;
        }
        setError(refs.errorPane, null);
        running = hasTests;
        refs.runBtn!.disabled = true;
        initialBuild = false;
        void rebuild();
    });

    refs.resetBtn.addEventListener('click', () => {
        if (liveDebounce) {
            clearTimeout(liveDebounce);
            liveDebounce = null;
        }
        view.dispatch({
            changes: { from: 0, to: view.state.doc.length, insert: starter },
        });
        clearTestResults(resultsEl);
        setError(refs.errorPane, null);
        if (refs.feedbackPanel) refs.feedbackPanel.hidden = true;
        if (refs.feedbackStream) refs.feedbackStream.textContent = '';
    });

    const feedback = wireFeedback({
        card,
        button: refs.feedbackBtn,
        panel: refs.feedbackPanel,
        stream: refs.feedbackStream,
        closeBtn: refs.feedbackClose,
        unavailableBehavior: live ? 'hide' : 'disable',
        isDirty: () => getCode() !== starter,
        buildPrompt: () => {
            const sections: string[] = [
                `You are an AI tutor helping a student who is stuck on a React coding exercise.\n` +
                    `Give a short, encouraging hint that nudges them forward — do NOT give the full solution.\n`,
            ];
            if (refs.instructions) sections.push(`INSTRUCTIONS:\n${refs.instructions}\n`);
            if (targetSrc) {
                sections.push(
                    `TARGET CODE (the reference output the student should visually match — ` +
                        `compare against the student's current code to spot what's missing):\n${targetSrc}\n`,
                );
            }
            if (hasTests) sections.push(`TESTS:\n${tests}\n`);
            sections.push(`STUDENT'S CURRENT CODE:\n${getCode()}\n`);
            if (hasTests) sections.push(`CURRENT TEST RESULTS:\n${collectTestResults(resultsEl)}\n`);
            sections.push(
                `Reply with 1–2 short sentences (under 30 words total) addressed to the ` +
                    `student in second person. Be terse: point at the single thing to check ` +
                    `next, no warm-up phrases, no restating what they did. ` +
                    `No code blocks, no headers, no preamble.`,
            );
            return sections.join('\n');
        },
    });
}

// ---------- iframe scaffolding ----------

const REACT_CDN = 'https://esm.sh/react@19.2.0?dev';
const REACT_DOM_CLIENT_CDN = 'https://esm.sh/react-dom@19.2.0/client?dev';
const REACT_DOM_CDN = 'https://esm.sh/react-dom@19.2.0?dev';
const REACT_JSX_RUNTIME_CDN = 'https://esm.sh/react@19.2.0/jsx-runtime?dev';

function buildIframeHTML(opts: { bundledJs: string; tailwind: boolean }): string {
    const tailwindScript = opts.tailwind
        ? `<script src="https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4"></script>`
        : '';
    const importmap = JSON.stringify({
        imports: {
            react: REACT_CDN,
            'react-dom': REACT_DOM_CDN,
            'react-dom/client': REACT_DOM_CLIENT_CDN,
            'react/jsx-runtime': REACT_JSX_RUNTIME_CDN,
        },
    });
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<script type="importmap">${importmap}</script>
${tailwindScript}
<style>
  html, body { margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; padding: 16px; color: #111827; }
</style>
<script>
  // Forward runtime errors to the parent card's error pane.
  const postErr = (message, stack) =>
    window.parent.postMessage({ rcType: 'runtime-error', message, stack }, '*');
  window.addEventListener('error', (e) => postErr(e.message, e.error && e.error.stack));
  window.addEventListener('unhandledrejection', (e) =>
    postErr(String(e.reason), e.reason && e.reason.stack));
  // Auto-size: post the body height whenever it changes so the parent can
  // shrink/grow the iframe to fit.
  const postHeight = () =>
    window.parent.postMessage({ rcType: 'resize', height: document.documentElement.scrollHeight }, '*');
  new ResizeObserver(postHeight).observe(document.documentElement);
  window.addEventListener('load', postHeight);
</script>
</head>
<body>
<div id="root"></div>
<script type="module">${opts.bundledJs}</script>
</body>
</html>`;
}

// In-iframe assertion runner. Bundled by esbuild alongside App.tsx so modern
// syntax works everywhere. Owns the `#root` mount: keeps a preview mounted
// when idle, swaps to a fresh per-test mount during a run, restores the
// preview after.
//
// Author API: test, beforeEach, afterEach, expect(x).{toBe, toEqual, toBeNull,
// toBeUndefined, toBeTruthy, toBeFalsy, toContain, toMatch}, plus .not.* on each.
function buildRuntimeTestsFile(userTests: string, autoRun: boolean): string {
    return `import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';
import { flushSync } from 'react-dom';
import { App } from './App';

// React 18+ batches state updates triggered by events. After a synchronous
// \`btn.click()\` in a test, the queued update hasn't committed yet, so the
// next \`expect(...)\` reads stale DOM. Forcing flushSync after every click
// commits pending updates before the test continues.
const _origClick = HTMLElement.prototype.click;
HTMLElement.prototype.click = function() {
  _origClick.call(this);
  try { flushSync(() => {}); } catch {}
};

class _ExpectError extends Error {
  constructor(message: string) { super(message); this.name = 'ExpectError'; }
}

const _before: Array<() => unknown | Promise<unknown>> = [];
const _after: Array<() => unknown | Promise<unknown>> = [];
const _queue: Array<{ name: string; fn: () => unknown | Promise<unknown> }> = [];

(globalThis as any).beforeEach = (fn: any) => { _before.push(fn); };
(globalThis as any).afterEach = (fn: any) => { _after.push(fn); };
(globalThis as any).test = (name: string, fn: any) => { _queue.push({ name, fn }); };

function _format(v: unknown): string {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

function _deepEqual(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a as object);
  const kb = Object.keys(b as object);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!_deepEqual((a as any)[k], (b as any)[k])) return false;
  return true;
}

function _make(received: unknown, negated: boolean) {
  const check = (pass: boolean, expected: string): void => {
    const failed = negated ? pass : !pass;
    if (!failed) return;
    throw new _ExpectError(
      'Expected' + (negated ? ' NOT' : '') + ': ' + expected + '\\nReceived: ' + _format(received)
    );
  };
  return {
    toBe: (e: unknown) => check(Object.is(received, e), _format(e)),
    toEqual: (e: unknown) => check(_deepEqual(received, e), _format(e)),
    toBeNull: () => check(received === null, 'null'),
    toBeUndefined: () => check(received === undefined, 'undefined'),
    toBeTruthy: () => check(Boolean(received), 'truthy'),
    toBeFalsy: () => check(!received, 'falsy'),
    toContain: (needle: unknown) => {
      const found =
        typeof received === 'string' && typeof needle === 'string' ? received.includes(needle) :
        Array.isArray(received) ? received.includes(needle) : false;
      check(found, 'to contain ' + _format(needle));
    },
    toMatch: (pat: RegExp | string) => {
      const r = typeof pat === 'string' ? new RegExp(pat) : pat;
      check(r.test(String(received)), 'to match ' + _format(pat));
    },
  };
}

(globalThis as any).expect = (received: unknown) => {
  const m: any = _make(received, false);
  m.not = _make(received, true);
  return m;
};

// === LESSON AUTHOR'S TESTS ===
${userTests}
// === END LESSON AUTHOR'S TESTS ===

const _post = (payload: Record<string, unknown>) =>
  window.parent.postMessage(payload, '*');

let _previewRoot: Root | null = null;
const _rootEl = () => document.getElementById('root')!;

async function _mountPreview() {
  if (_previewRoot) {
    try { await act(async () => { _previewRoot!.unmount(); }); } catch {}
  }
  _rootEl().innerHTML = '';
  _previewRoot = createRoot(_rootEl());
  await act(async () => { _previewRoot!.render(<App />); });
}

async function _run() {
  if (_previewRoot) {
    try { await act(async () => { _previewRoot!.unmount(); }); } catch {}
    _previewRoot = null;
  }
  _post({ rcType: 'tests-begin' });
  for (const t of _queue) {
    _rootEl().innerHTML = '';
    const root = createRoot(_rootEl());
    try {
      for (const fn of _before) await fn();
      await act(async () => { root.render(<App />); });
      await t.fn();
      for (const fn of _after) await fn();
      _post({ rcType: 'test-result', name: t.name, status: 'pass' });
    } catch (err) {
      const isExpect = !!err && (err as any).name === 'ExpectError';
      _post({
        rcType: 'test-result',
        name: t.name,
        status: isExpect ? 'fail' : 'error',
        error: isExpect
          ? (err as Error).message
          : err instanceof Error ? (err.stack || err.message) : String(err),
      });
    } finally {
      root.unmount();
    }
  }
  _post({ rcType: 'tests-end' });
  // Restore the preview to its initial state.
  await _mountPreview();
}

await _mountPreview();
_post({ rcType: 'tests-ready' });
${autoRun ? 'void _run();' : ''}
`;
}

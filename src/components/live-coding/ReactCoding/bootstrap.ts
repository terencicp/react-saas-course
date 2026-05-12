// Per-card bootstrap. Mounts CodeMirror (JSX/TS), bundles the student's TSX
// locally via esbuild-wasm, and renders the result into a same-origin `srcdoc`
// iframe. When tests are attached, an in-iframe runner posts results back over
// `window.postMessage`. Multi-card pages route by `e.source === iframe.contentWindow`.
//
// Lifecycle:
//   • initCard → bundle + write srcdoc (initial, passive)
//   • Run click → re-bundle with `autoRun: true`; the new runtime fires
//     `_run()` automatically as soon as the iframe loads
//   • iframe → parent: `tests-ready`, `tests-begin`, `test-result`,
//     `tests-end`, `runtime-error`

import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

import { bundle, ensureEsbuild } from './bundler';
import { streamPrompt, OllamaError, pingOllama } from '../../../lib/ollama';

const ollamaReady = pingOllama();
// Warm esbuild-wasm in the background as soon as any ReactCoding card is on
// the page — by the time the user clicks Run, the wasm is loaded.
void ensureEsbuild().catch(() => { /* surfaced per-card on actual use */ });

document.querySelectorAll<HTMLElement>('.rc-card').forEach((card) => {
    void initCard(card);
});

async function initCard(card: HTMLElement): Promise<void> {
    const editorEl = card.querySelector<HTMLElement>('.rc-editor')!;
    // Run button is absent in live mode (the editor auto-rebuilds on edit).
    const runBtn = card.querySelector<HTMLButtonElement>('.rc-run');
    const resetBtn = card.querySelector<HTMLButtonElement>('.rc-reset')!;
    const resultsEl = card.querySelector<HTMLElement>('.rc-results');
    const errorEl = card.querySelector<HTMLElement>('.rc-error')!;
    // Two iframes when target-match mode is on. The first `.rc-preview` (no
    // `.rc-preview-target` class) is always the student's; the optional
    // `.rc-preview-target` is the reference output. Selecting student via
    // `:not(.rc-preview-target)` keeps it unambiguous in either mode.
    const iframe = card.querySelector<HTMLIFrameElement>('.rc-preview:not(.rc-preview-target)')!;
    const targetIframe = card.querySelector<HTMLIFrameElement>('.rc-preview-target');
    const targetSrc = targetIframe?.dataset.targetSrc ?? '';
    const feedbackBtn = card.querySelector<HTMLButtonElement>('.rc-feedback-btn');
    const feedbackEl = card.querySelector<HTMLElement>('.rc-feedback');
    const feedbackStream = card.querySelector<HTMLElement>('.rc-feedback-stream');
    const feedbackClose = card.querySelector<HTMLButtonElement>('.rc-feedback-close');
    const instructionsEl = card.querySelector<HTMLElement>('.rc-instructions');
    const instructions = instructionsEl?.textContent?.trim() ?? '';

    const starter = editorEl.dataset.starter ?? '';
    const tests = resultsEl?.dataset.tests ?? '';
    const hasTests = tests.trim().length > 0;
    const tailwind = card.dataset.tailwind !== 'false';
    const live = card.dataset.live === 'true';

    // Debounce timer for live-update cards. 400ms is the "after typing
    // settles" sweet spot — short enough to feel live, long enough that
    // we don't bundle on every keystroke.
    let liveDebounce: ReturnType<typeof setTimeout> | null = null;

    const view = new EditorView({
        state: EditorState.create({
            doc: starter,
            extensions: [
                lineNumbers(),
                history(),
                bracketMatching(),
                indentOnInput(),
                javascript({ jsx: true, typescript: true }),
                oneDark,
                keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
                EditorView.updateListener.of((u) => {
                    if (!u.docChanged) return;
                    if (feedbackBtn) updateFeedbackEnabled();
                    if (live) {
                        if (liveDebounce) clearTimeout(liveDebounce);
                        liveDebounce = setTimeout(() => {
                            // Every live build is post-initial — runtime
                            // auto-runs tests if any.
                            initialBuild = false;
                            void rebuild({ live: true });
                        }, 400);
                    }
                }),
            ],
        }),
        parent: editorEl,
    });

    const getCode = () => view.state.doc.toString();

    // Initial build is passive (runtime loads, posts tests-ready, then
    // waits). Every subsequent build is in response to a Run click, so the
    // new runtime auto-runs as soon as it loads.
    let initialBuild = true;
    let running = false;

    // esbuild's `jsx: 'automatic'` injects the right `react/jsx-runtime`
    // imports — no need for the student to write `import React`.
    //
    // When tests are present, the runtime-tests module owns the #root mount
    // (so test-driven `document.querySelector` lands on exactly one App
    // instance, and the runtime can swap in fresh mounts per test).
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
            // For preview-only cards there's no tests-ready message — the
            // bundle landing is the readiness signal.
            if (!hasTests && runBtn) runBtn.disabled = false;
        } catch (err) {
            // On live (mid-keystroke) rebuilds, swallow parse errors and
            // leave the last successful preview in place — the student is
            // probably still typing. The error pane is for explicit-Run
            // failures where the student wants the diagnostic.
            if (opts.live) return;
            const message = err instanceof Error ? (err.message || String(err)) : String(err);
            errorEl.hidden = false;
            errorEl.textContent = message;
            running = false;
            if (runBtn) runBtn.disabled = false;
        }
    }

    await Promise.all([rebuild(), buildTarget()]);

    // Build the reference iframe once. Preview-only — no tests, no runtime-
    // tests module. A bundle failure here is a lesson-author bug; surface it
    // in the error pane so it's never silent.
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
            const message = err instanceof Error ? (err.message || String(err)) : String(err);
            errorEl.hidden = false;
            errorEl.textContent = `Target render failed: ${message}`;
        }
    }

    // Parent-side listener. Same-origin means `e.source === iframe.contentWindow`
    // identifies the right card on multi-card pages — no per-card id needed.
    // In target-match mode the target iframe also posts `resize` / `runtime-
    // error` messages; route by source so each iframe sizes itself and so the
    // student's tests-* lifecycle stays unconfused by the target.
    window.addEventListener('message', (e: MessageEvent) => {
        const isStudent = e.source === iframe.contentWindow;
        const isTarget = !!targetIframe && e.source === targetIframe.contentWindow;
        if (!isStudent && !isTarget) return;
        const data = e.data;
        if (!data || typeof data !== 'object' || typeof data.rcType !== 'string') return;

        switch (data.rcType) {
            case 'resize':
                // Auto-fit each iframe to its rendered content.
                // Cap at 600px so a runaway render can't take over the page.
                // Idempotent — skip re-setting if unchanged so we don't kick
                // the iframe's ResizeObserver back into a feedback loop.
                if (typeof data.height === 'number') {
                    const which = isStudent ? iframe : targetIframe!;
                    const next = Math.min(Math.max(data.height, 56), 600) + 'px';
                    if (which.style.height !== next) which.style.height = next;
                }
                break;
            case 'runtime-error': {
                const prefix = isTarget ? 'Target runtime error: ' : '';
                errorEl.hidden = false;
                errorEl.textContent = prefix + (data.stack || data.message || 'Runtime error');
                if (isStudent) {
                    running = false;
                    if (runBtn) runBtn.disabled = false;
                }
                break;
            }
            // The remaining lifecycle events only originate from the student
            // iframe — the target has no runtime-tests module.
            case 'tests-ready':
                if (isStudent && !running && runBtn) runBtn.disabled = false;
                break;
            case 'tests-begin':
                if (isStudent) clearResults();
                break;
            case 'test-result':
                if (isStudent) appendResult(data.name, data.status, data.error);
                break;
            case 'tests-end':
                if (isStudent) {
                    running = false;
                    if (runBtn) runBtn.disabled = false;
                }
                break;
        }
    });

    runBtn?.addEventListener('click', () => {
        if (liveDebounce) { clearTimeout(liveDebounce); liveDebounce = null; }
        errorEl.hidden = true;
        errorEl.textContent = '';
        running = hasTests;
        runBtn.disabled = true;
        initialBuild = false; // next build emits an auto-running runtime
        void rebuild();
    });

    resetBtn.addEventListener('click', () => {
        if (liveDebounce) { clearTimeout(liveDebounce); liveDebounce = null; }
        view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: starter } });
        clearResults();
        errorEl.hidden = true;
        errorEl.textContent = '';
        if (feedbackEl) feedbackEl.hidden = true;
        if (feedbackStream) feedbackStream.textContent = '';
    });

    // ---------- result rendering ----------

    function clearResults(): void {
        if (resultsEl) resultsEl.innerHTML = '';
    }

    function appendResult(name: string, status: 'pass' | 'fail' | 'error', error?: string): void {
        if (!resultsEl) return;
        const li = document.createElement('li');
        li.className = 'rc-result';
        li.dataset.status = status;
        const nameEl = document.createElement('span');
        nameEl.className = 'rc-result-name';
        nameEl.textContent = name;
        const body = document.createElement('div');
        body.className = 'rc-result-body';
        body.appendChild(nameEl);
        if (error && status !== 'pass') {
            const pre = document.createElement('pre');
            pre.className = 'rc-result-error';
            pre.textContent = error;
            body.appendChild(pre);
        }
        const icon = document.createElement('span');
        icon.className = 'rc-result-icon';
        icon.setAttribute('aria-hidden', 'true');
        li.appendChild(icon);
        li.appendChild(body);
        resultsEl.appendChild(li);
    }

    // ---------- feedback (Ollama) ----------

    let ollamaOk = false;
    let streaming = false;
    // Feedback availability: hidden in live mode (chip floats inside the
    // editor; if it can't do anything it shouldn't take space), disabled in
    // toolbar mode (it's one of three buttons in a row — disappearing would
    // leave a gap).
    function updateFeedbackEnabled(): void {
        if (!feedbackBtn) return;
        const codeChanged = getCode() !== starter;
        const unavailable = streaming || !(ollamaOk && codeChanged);
        if (live) {
            feedbackBtn.hidden = unavailable;
        } else {
            feedbackBtn.disabled = unavailable;
            feedbackBtn.title = !ollamaOk
                ? 'AI tutor unavailable — Ollama is not reachable.'
                : !codeChanged
                  ? 'Edit the code first, then ask for feedback.'
                  : '';
        }
    }
    if (feedbackBtn) {
        if (live) feedbackBtn.hidden = true;
        else feedbackBtn.disabled = true;
        ollamaReady.then((ok) => {
            ollamaOk = ok;
            updateFeedbackEnabled();
        });
    }

    function collectResults(): string {
        if (!resultsEl) return '(no tests configured)';
        const items = resultsEl.querySelectorAll<HTMLElement>('.rc-result');
        if (items.length === 0) return '(tests have not been run yet)';
        return Array.from(items)
            .map((li) => {
                const name = li.querySelector('.rc-result-name')?.textContent ?? '';
                const status = li.dataset.status ?? '';
                const err = li.querySelector('.rc-result-error')?.textContent ?? '';
                return `- ${name} [${status}]${err ? `: ${err}` : ''}`;
            })
            .join('\n');
    }

    function buildFeedbackPrompt(): string {
        const sections: string[] = [
            `You are an AI tutor helping a student who is stuck on a React coding exercise.\n` +
            `Give a short, encouraging hint that nudges them forward — do NOT give the full solution.\n`,
        ];
        if (instructions) sections.push(`INSTRUCTIONS:\n${instructions}\n`);
        if (targetSrc) {
            sections.push(
                `TARGET CODE (the reference output the student should visually match — ` +
                `compare against the student's current code to spot what's missing):\n${targetSrc}\n`
            );
        }
        if (hasTests) sections.push(`TESTS:\n${tests}\n`);
        sections.push(`STUDENT'S CURRENT CODE:\n${getCode()}\n`);
        if (hasTests) sections.push(`CURRENT TEST RESULTS:\n${collectResults()}\n`);
        sections.push(
            `Reply with 1–2 short sentences (under 30 words total) addressed to the ` +
            `student in second person. Be terse: point at the single thing to check ` +
            `next, no warm-up phrases, no restating what they did. ` +
            `No code blocks, no headers, no preamble.`
        );
        return sections.join('\n');
    }

    feedbackClose?.addEventListener('click', () => {
        if (feedbackEl) feedbackEl.hidden = true;
    });

    if (feedbackBtn && feedbackEl && feedbackStream) {
        feedbackBtn.addEventListener('click', async () => {
            streaming = true;
            if (live) feedbackBtn.hidden = true;
            else feedbackBtn.disabled = true;
            feedbackEl.hidden = false;
            card.dataset.feedbackState = 'pending';
            feedbackStream.textContent = '';
            try {
                for await (const chunk of streamPrompt(buildFeedbackPrompt(), { temperature: 0.3 })) {
                    feedbackStream.textContent = (feedbackStream.textContent ?? '') + chunk;
                }
            } catch (err) {
                feedbackStream.textContent =
                    err instanceof OllamaError
                        ? err.message
                        : 'Could not reach the AI tutor. Please try again.';
                ollamaOk = false;
            } finally {
                delete card.dataset.feedbackState;
                streaming = false;
                updateFeedbackEnabled();
            }
        });
    }
}

// ---------- iframe scaffolding ----------

// Pinned React version. esm.sh resolves the bare-specifier imports the bundle
// leaves in place. `?dev` gives the dev React build — useful warnings in the
// console while learning.
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
  // shrink/grow the iframe to fit. Saves the lesson author from picking a
  // previewHeight, and makes the preview pane proportional to the App.
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
      // \`.name\` not \`instanceof _ExpectError\` — class transpilation can
      // break \`instanceof\` across boundaries; the name we set always survives.
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

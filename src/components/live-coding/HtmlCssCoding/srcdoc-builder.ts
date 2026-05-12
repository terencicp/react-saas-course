// Builds the full HTML document that lands in the iframe's `srcdoc`. Pure —
// no DOM, no side effects, just string assembly.
//
// What goes into the iframe:
//   • a meta viewport so previews render at the iframe's logical width
//   • Tailwind v4 Play CDN, if opted in
//   • a fixed scaffold <style> for body resets + the test-runner UI overlay
//   • the student's CSS in a second <style>
//   • a head <script> that forwards runtime errors and auto-resizes
//   • the student's HTML in <body>
//   • the student's JS, if provided
//   • the test runner, if tests are provided

export interface SrcdocOptions {
    html: string;
    css: string;
    /** Optional student JS, appended as a module script. */
    js?: string;
    /** Optional jest-style tests run against the rendered DOM. */
    tests?: string;
    /** Whether to wire the Tailwind v4 Play CDN. */
    tailwind: boolean;
    /** When true, the runtime kicks off the test suite as soon as it loads.
     *  False on the very first build, true on every rebuild thereafter (the
     *  same pattern ReactCoding uses for its preview-vs-test handoff). */
    autoRun: boolean;
}

const TAILWIND_CDN = 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4';

export function buildSrcdoc(opts: SrcdocOptions): string {
    const { html, css, js, tests, tailwind, autoRun } = opts;
    const tailwindScript = tailwind ? `<script src="${TAILWIND_CDN}"></script>` : '';
    const userJsScript = js ? `<script type="module">\n${js}\n</script>` : '';
    const testRunnerScript = tests
        ? `<script type="module">\n${buildTestRunner(tests, autoRun)}\n</script>`
        : '';

    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${tailwindScript}
<style>
  /* Scaffold styles — kept minimal so the student's CSS is what drives the
     visual. \`box-sizing: border-box\` matches the modern default every
     real project relies on. */
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; padding: 16px; color: #111827; }
</style>
<style id="hc-user-css">
${css}
</style>
<script>
  // Forward runtime errors to the parent card's error pane.
  const postErr = (message, stack) =>
    window.parent.postMessage({ hcType: 'runtime-error', message, stack }, '*');
  window.addEventListener('error', (e) => postErr(e.message, e.error && e.error.stack));
  window.addEventListener('unhandledrejection', (e) =>
    postErr(String(e.reason), e.reason && e.reason.stack));
  // Auto-size: post the body height whenever it changes so the parent can
  // shrink/grow the iframe to fit. Idempotent on the parent side; the
  // ResizeObserver firing many times costs effectively nothing here.
  const postHeight = () =>
    window.parent.postMessage({ hcType: 'resize', height: document.documentElement.scrollHeight }, '*');
  new ResizeObserver(postHeight).observe(document.documentElement);
  window.addEventListener('load', postHeight);
</script>
</head>
<body>
${html}
${userJsScript}
${testRunnerScript}
</body>
</html>`;
}

// In-iframe assertion runner. Same shape as ReactCoding's runtime-tests but
// stripped of all React-specific bits — no `act`, no `flushSync`, no per-test
// remount. The DOM is the DOM; tests query it directly.
//
// Author API: test, beforeEach, afterEach,
//   expect(x).{toBe, toEqual, toBeNull, toBeUndefined, toBeTruthy, toBeFalsy,
//              toContain, toMatch}
//   plus `.not.*` on each.
function buildTestRunner(userTests: string, autoRun: boolean): string {
    return `
class _ExpectError extends Error {
  constructor(message) { super(message); this.name = 'ExpectError'; }
}

const _before = [];
const _after = [];
const _queue = [];

window.beforeEach = (fn) => { _before.push(fn); };
window.afterEach = (fn) => { _after.push(fn); };
window.test = (name, fn) => { _queue.push({ name, fn }); };

function _format(v) {
  if (v === null) return 'null';
  if (v === undefined) return 'undefined';
  if (typeof v === 'string') return JSON.stringify(v);
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'bigint') return String(v);
  try { return JSON.stringify(v); } catch { return String(v); }
}

function _deepEqual(a, b) {
  if (Object.is(a, b)) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const ka = Object.keys(a);
  const kb = Object.keys(b);
  if (ka.length !== kb.length) return false;
  for (const k of ka) if (!_deepEqual(a[k], b[k])) return false;
  return true;
}

function _make(received, negated) {
  const check = (pass, expected) => {
    const failed = negated ? pass : !pass;
    if (!failed) return;
    throw new _ExpectError(
      'Expected' + (negated ? ' NOT' : '') + ': ' + expected + '\\nReceived: ' + _format(received)
    );
  };
  return {
    toBe: (e) => check(Object.is(received, e), _format(e)),
    toEqual: (e) => check(_deepEqual(received, e), _format(e)),
    toBeNull: () => check(received === null, 'null'),
    toBeUndefined: () => check(received === undefined, 'undefined'),
    toBeTruthy: () => check(Boolean(received), 'truthy'),
    toBeFalsy: () => check(!received, 'falsy'),
    toContain: (needle) => {
      const found =
        typeof received === 'string' && typeof needle === 'string' ? received.includes(needle) :
        Array.isArray(received) ? received.includes(needle) : false;
      check(found, 'to contain ' + _format(needle));
    },
    toMatch: (pat) => {
      const r = typeof pat === 'string' ? new RegExp(pat) : pat;
      check(r.test(String(received)), 'to match ' + _format(pat));
    },
  };
}

window.expect = (received) => {
  const m = _make(received, false);
  m.not = _make(received, true);
  return m;
};

// === LESSON AUTHOR'S TESTS ===
${userTests}
// === END LESSON AUTHOR'S TESTS ===

const _post = (payload) => window.parent.postMessage(payload, '*');

async function _run() {
  _post({ hcType: 'tests-begin' });
  for (const t of _queue) {
    try {
      for (const fn of _before) await fn();
      await t.fn();
      for (const fn of _after) await fn();
      _post({ hcType: 'test-result', name: t.name, status: 'pass' });
    } catch (err) {
      // \`.name\` not \`instanceof _ExpectError\` — class transpilation can
      // break \`instanceof\` across boundaries; the name we set survives.
      const isExpect = !!err && err.name === 'ExpectError';
      // Stack frames point at the synthetic srcdoc, not the student's source,
      // so they're noise. Send just the message line.
      _post({
        hcType: 'test-result',
        name: t.name,
        status: isExpect ? 'fail' : 'error',
        error: isExpect ? err.message : (err && err.message) || String(err),
      });
    }
  }
  _post({ hcType: 'tests-end' });
}

_post({ hcType: 'tests-ready' });
${autoRun ? 'void _run();' : ''}
`;
}

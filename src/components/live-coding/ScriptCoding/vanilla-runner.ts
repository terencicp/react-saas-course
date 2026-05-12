// Vanilla runner — student code executes inside a sandboxed iframe we build
// from a srcdoc string. A tiny jest-flavoured `test`/`expect` shim is injected
// alongside the student code; results flow back via postMessage.
//
// The shim is authored as a real function (`vanillaHarness`) so editors give
// it normal JS tooling. At build time we `.toString()` it, slice out the body,
// and concatenate with student/test source. The harness runs in the iframe
// context, so it uses `parent.postMessage` and ignores its TS environment.

import { appendConsole, beginResults, endResults, upsertResult } from './dom';

const VANILLA_TIMEOUT_MS = 5000;

function vanillaHarness() {
  // @ts-ignore — runs in the iframe
  const post = (msg: any) => parent.postMessage(msg, '*');
  const stringify = (v: any): string => {
    if (typeof v === 'string') return v;
    if (v instanceof Error) return v.stack || v.message;
    try { return JSON.stringify(v); } catch { return String(v); }
  };

  const tests: Array<{ name: string; fn: () => unknown | Promise<unknown> }> = [];

  // @ts-ignore
  (globalThis as any).console = {
    log: (...a: any[]) => post({ kind: 'console', method: 'log', args: a.map(stringify) }),
    error: (...a: any[]) => post({ kind: 'console', method: 'error', args: a.map(stringify) }),
    warn: (...a: any[]) => post({ kind: 'console', method: 'warn', args: a.map(stringify) }),
    info: (...a: any[]) => post({ kind: 'console', method: 'info', args: a.map(stringify) }),
  };

  // @ts-ignore
  (globalThis as any).test = (name: string, fn: () => unknown) => tests.push({ name, fn });
  // @ts-ignore — `it` aliased for jest-familiarity
  (globalThis as any).it = (globalThis as any).test;

  // @ts-ignore
  (globalThis as any).expect = (actual: any) => {
    const pretty = (v: any) => {
      if (typeof v === 'string') return JSON.stringify(v);
      if (typeof v === 'function') return v.name ? `[Function ${v.name}]` : '[Function]';
      try { return JSON.stringify(v); } catch { return String(v); }
    };
    const deepEqual = (a: any, b: any): boolean => {
      if (Object.is(a, b)) return true;
      if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      const ka = Object.keys(a); const kb = Object.keys(b);
      if (ka.length !== kb.length) return false;
      return ka.every((k) => deepEqual(a[k], b[k]));
    };
    const api = {
      toBe(expected: any) {
        if (!Object.is(actual, expected)) {
          throw new Error(`expected ${pretty(actual)} to be ${pretty(expected)}`);
        }
      },
      toEqual(expected: any) {
        if (!deepEqual(actual, expected)) {
          throw new Error(`expected ${pretty(actual)} to equal ${pretty(expected)}`);
        }
      },
      toBeTruthy() {
        if (!actual) throw new Error(`expected ${pretty(actual)} to be truthy`);
      },
      toBeFalsy() {
        if (actual) throw new Error(`expected ${pretty(actual)} to be falsy`);
      },
      toBeCloseTo(expected: number, precision = 2) {
        const limit = Math.pow(10, -precision) / 2;
        if (Math.abs(actual - expected) >= limit) {
          throw new Error(`expected ${actual} to be close to ${expected} (precision ${precision})`);
        }
      },
      toThrow(matcher?: string | RegExp) {
        let thrown: any;
        try { actual(); } catch (e) { thrown = e; }
        if (!thrown) throw new Error('expected function to throw');
        if (matcher) {
          const msg = String(thrown.message ?? thrown);
          const ok = matcher instanceof RegExp ? matcher.test(msg) : msg.includes(matcher);
          if (!ok) throw new Error(`expected throw to match ${matcher}, got "${msg}"`);
        }
      },
      toContain(item: any) {
        if (typeof actual === 'string') {
          if (!actual.includes(item)) throw new Error(`expected ${pretty(actual)} to contain ${pretty(item)}`);
        } else if (Array.isArray(actual)) {
          if (!actual.some((v) => deepEqual(v, item))) {
            throw new Error(`expected ${pretty(actual)} to contain ${pretty(item)}`);
          }
        } else {
          throw new Error(`expected ${pretty(actual)} to be a string or array`);
        }
      },
      get not() {
        const inverted: Record<string, (...a: any[]) => void> = {};
        for (const key of Object.keys(api) as Array<keyof typeof api>) {
          if (key === 'not') continue;
          inverted[key] = (...args: any[]) => {
            let passed = true;
            try { (api[key] as any)(...args); } catch { passed = false; }
            if (passed) throw new Error(`expected NOT ${key}, but matcher passed`);
          };
        }
        return inverted;
      },
    };
    return api;
  };

  // Student code + tests are concatenated after this body via string concat
  // — they run at script top level so `function add() {}` is a global the
  // test bodies can reference.
  return tests;
}

function buildVanillaSrcdoc(studentCode: string, testCode: string): string {
  const src = vanillaHarness.toString();
  const bodyStart = src.indexOf('{') + 1;
  const bodyEnd = src.lastIndexOf('}');
  const body = src.slice(bodyStart, bodyEnd).replace(/return tests;\s*$/, '');

  // Defang a closing script tag in student/test code so it can't terminate
  // the wrapping script tag we inject below.
  const closeRe = new RegExp('<' + '/script>', 'gi');
  const safeStudent = studentCode.replace(closeRe, '<\\/script>');
  const safeTests = testCode.replace(closeRe, '<\\/script>');

  const runner = `
    ${body}
    try {
      ${safeStudent}
      ${safeTests}
    } catch (e) {
      parent.postMessage({ kind: 'compile_error', message: (e && e.message) || String(e) }, '*');
      parent.postMessage({ kind: 'done' }, '*');
      throw e;
    }
    (async () => {
      for (const t of tests) {
        try {
          await t.fn();
          parent.postMessage({ kind: 'test_end', name: t.name, status: 'pass' }, '*');
        } catch (e) {
          parent.postMessage({ kind: 'test_end', name: t.name, status: 'fail', error: (e && e.message) || String(e) }, '*');
        }
      }
      parent.postMessage({ kind: 'done' }, '*');
    })();
  `;
  return '<!doctype html><html><body><script>' + runner + '<' + '/script></body></html>';
}

export function setupVanillaRunner(
  card: HTMLElement,
  getCode: () => string,
  tests: string,
  runBtn: HTMLButtonElement,
) {
  runBtn.addEventListener('click', () => {
    beginResults(card);
    runBtn.disabled = true;

    const old = card.querySelector('iframe.lc-runner-iframe');
    if (old) old.remove();
    const iframe = document.createElement('iframe');
    iframe.className = 'lc-runner-iframe';
    iframe.style.display = 'none';
    iframe.sandbox.add('allow-scripts');
    iframe.srcdoc = buildVanillaSrcdoc(getCode(), tests);
    card.appendChild(iframe);

    const resultsEl = card.querySelector<HTMLElement>('.lc-results')!;
    const timer = window.setTimeout(() => {
      upsertResult(resultsEl, 'Test run timed out (5s), incorrect syntax or infinite loop.', 'error');
      cleanup();
    }, VANILLA_TIMEOUT_MS);

    function cleanup() {
      clearTimeout(timer);
      window.removeEventListener('message', onMsg);
      iframe.remove();
      endResults(card);
      runBtn.disabled = false;
    }

    const onMsg = (e: MessageEvent) => {
      if (e.source !== iframe.contentWindow) return;
      const m = e.data;
      if (!m || typeof m !== 'object') return;
      if (m.kind === 'test_end') {
        upsertResult(resultsEl, m.name, m.status, m.error);
      } else if (m.kind === 'console') {
        appendConsole(card, m.method, m.args);
      } else if (m.kind === 'compile_error') {
        upsertResult(resultsEl, 'Code did not run', 'error', m.message);
      } else if (m.kind === 'done') {
        cleanup();
      }
    };
    window.addEventListener('message', onMsg);
  });
}

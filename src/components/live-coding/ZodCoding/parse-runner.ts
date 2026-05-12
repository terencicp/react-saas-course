// Runtime side of ZodCoding. Spins up a sandboxed iframe whose document
// loads real zod 4 from esm.sh, evaluates the student's (type-stripped) code
// as a module so top-level bindings stay in module scope, then walks each
// fixture and posts back per-fixture { actual: 'pass'|'fail', error: string|null }.
//
// Why an iframe (not a Web Worker): module evaluation order with cross-origin
// imports is easier to reason about in a real document context, and the
// sandbox attribute gives us a clean "no parent DOM access" guarantee.

import ts from 'typescript';

export interface Fixture {
  name: string;
  input: unknown;
  expect: 'pass' | 'fail';
  /** When `expect === 'fail'`, optional substring the ZodError message must contain. */
  errorContains?: string;
}

export interface FixtureResult {
  name: string;
  expect: 'pass' | 'fail';
  /** What the schema actually returned. */
  actual: 'pass' | 'fail';
  /** Whether the actual matches the expectation (and `errorContains` matched, if set). */
  ok: boolean;
  /** When the schema rejected, the flattened Zod error message. */
  errorMessage?: string;
  /** When the harness itself crashed (e.g. student code has a syntax error). */
  harnessError?: string;
}

const PARSE_TIMEOUT_MS = 5000;
const ZOD_URL = 'https://esm.sh/zod@4';

// Strip TS types so the iframe (which evaluates plain JS) doesn't choke on
// `type X = ...` or `: T` annotations. We keep `import`/`export` statements
// intact because the iframe runs the result as an ES module.
function stripTypes(source: string): string {
  return ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      isolatedModules: true,
      esModuleInterop: true,
    },
    reportDiagnostics: false,
  }).outputText;
}

function buildParseSrcdoc(studentCode: string, schemaName: string, fixtures: Fixture[]): string {
  // Strip TS first so type-only syntax (`type X = ...`, `: T`, `as T`, generics)
  // doesn't crash the iframe's module parse.
  let safeStudent = stripTypes(studentCode);

  // Defang `</script>` inside student code so it can't terminate the module
  // script tag below — same defense ScriptCoding's vanilla runner uses.
  const closeRe = new RegExp('<' + '/script>', 'gi');
  safeStudent = safeStudent.replace(closeRe, '<\\/script>');

  // Rewrite the student's `from 'zod'` (or `"zod"`) to the CDN URL. The
  // student's editor still sees the idiomatic bare specifier — we just
  // remap it before injection. This sidesteps `<script type="importmap">`
  // in srcdoc, which has flaky resolution timing relative to module scripts.
  safeStudent = safeStudent.replace(/(from\s*['"])zod(['"])/g, `$1${ZOD_URL}$2`);

  // JSON-encode the fixtures so the harness receives them as plain data. The
  // dance with `JSON.stringify` and `<` escaping protects against an `</script>`
  // landing inside a string fixture value.
  const fixturesJson = JSON.stringify(fixtures).replace(/</g, '\\u003c');

  // Pre-script (classic): registers error listeners BEFORE the module script
  // parses, so module-load failures (bad import URL, syntax error in student
  // code) reach the parent as `compile_error` instead of vanishing silently.
  const preScript = `
    var __post = function (msg) { parent.postMessage(msg, '*'); };
    var __errored = false;
    function __reportErr(msg) {
      if (__errored) return;
      __errored = true;
      __post({ kind: 'compile_error', message: msg || 'module load failed' });
      __post({ kind: 'done' });
    }
    window.addEventListener('error', function (ev) {
      __reportErr((ev.error && ev.error.message) || ev.message);
    });
    window.addEventListener('unhandledrejection', function (ev) {
      __reportErr((ev.reason && ev.reason.message) || String(ev.reason));
    });
  `;

  // Module script: student code at top level (so its \`import\` statements
  // stay hoisted), then a harness IIFE that walks the fixtures and posts
  // results back. \`__post\` is on \`window\` thanks to the classic pre-script.
  const moduleScript = `
    ${safeStudent}

    (async () => {
      const __post = window.__post || ((msg) => parent.postMessage(msg, '*'));
      let __schema;
      try {
        __schema = typeof ${schemaName} !== 'undefined' ? ${schemaName} : undefined;
      } catch (e) {
        __post({ kind: 'compile_error', message: (e && e.message) || String(e) });
        __post({ kind: 'done' });
        return;
      }

      if (!__schema) {
        __post({ kind: 'compile_error', message: 'Could not find a schema named "${schemaName}". Make sure the const is declared at the top level.' });
        __post({ kind: 'done' });
        return;
      }

      const __fixtures = ${fixturesJson};
      for (const f of __fixtures) {
        let actual, errorMessage;
        try {
          const result = __schema.safeParse(f.input);
          if (result.success) {
            actual = 'pass';
          } else {
            actual = 'fail';
            const issues = (result.error && result.error.issues) || [];
            errorMessage = issues.length
              ? issues.map((i) => (i.path.length ? i.path.join('.') + ': ' : '') + i.message).join('; ')
              : ((result.error && result.error.message) || 'validation failed');
          }
        } catch (e) {
          actual = 'fail';
          errorMessage = 'threw: ' + ((e && e.message) || String(e));
        }
        const ok = actual === f.expect && (
          f.expect === 'pass' || !f.errorContains || (errorMessage || '').includes(f.errorContains)
        );
        __post({
          kind: 'fixture_result',
          name: f.name,
          expect: f.expect,
          actual,
          ok,
          errorMessage: errorMessage == null ? null : errorMessage,
        });
      }
      __post({ kind: 'done' });
    })();
  `;

  return (
    '<!doctype html><html><body>' +
    '<script>' + preScript + '<' + '/script>' +
    '<script type="module">' + moduleScript + '<' + '/script>' +
    '</body></html>'
  );
}

export function runFixtures(
  card: HTMLElement,
  studentCode: string,
  schemaName: string,
  fixtures: Fixture[],
  onResult: (r: FixtureResult) => void,
  onHarnessError: (msg: string) => void,
  onDone: () => void,
): () => void {
  // Wipe any prior runner iframe so a re-run doesn't double-listen.
  const old = card.querySelector('iframe.zc-runner-iframe');
  if (old) old.remove();

  const iframe = document.createElement('iframe');
  iframe.className = 'zc-runner-iframe';
  iframe.sandbox.add('allow-scripts');
  iframe.srcdoc = buildParseSrcdoc(studentCode, schemaName, fixtures);
  card.appendChild(iframe);

  let settled = false;
  const cleanup = () => {
    if (settled) return;
    settled = true;
    clearTimeout(timer);
    window.removeEventListener('message', onMsg);
    iframe.remove();
  };

  const timer = window.setTimeout(() => {
    onHarnessError('Parse run timed out (5s). Infinite loop or unresolved import?');
    onDone();
    cleanup();
  }, PARSE_TIMEOUT_MS);

  const onMsg = (e: MessageEvent) => {
    if (e.source !== iframe.contentWindow) return;
    const m = e.data;
    if (!m || typeof m !== 'object') return;
    if (m.kind === 'fixture_result') {
      onResult({
        name: m.name,
        expect: m.expect,
        actual: m.actual,
        ok: m.ok,
        errorMessage: m.errorMessage ?? undefined,
      });
    } else if (m.kind === 'compile_error') {
      onHarnessError(m.message);
    } else if (m.kind === 'done') {
      onDone();
      cleanup();
    }
  };
  window.addEventListener('message', onMsg);

  return cleanup;
}

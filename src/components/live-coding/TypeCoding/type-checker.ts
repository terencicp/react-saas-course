// Type-only checker built on @typescript/vfs + the TypeScript LanguageService.
// No runtime — student code is never executed; the assertion is "no diagnostics"
// and (optionally) Twoslash-style `^?` query resolutions.
//
// The TS env is heavyweight (~MB of compiler + lib `.d.ts` files); we lazy-init
// it once per page and reuse across every TypeCoding instance.

import ts from 'typescript';
import {
  createSystem,
  createVirtualTypeScriptEnvironment,
  createDefaultMapFromCDN,
} from '@typescript/vfs';

// Leading slash matters: ts.createProgram resolves paths to absolute form,
// and the vfs Map is keyed by exact string match. Without the slash you get
// `sys.fileExists('index.ts') === true` but a TS6053 from inside createProgram
// because the compiler looks up `/index.ts`.
const FILE = '/index.ts';

// Strict floor matching the course's tsconfig stance (1.3.3).
const COMPILER_OPTIONS: ts.CompilerOptions = {
  target: ts.ScriptTarget.ES2022,
  module: ts.ModuleKind.ESNext,
  moduleResolution: ts.ModuleResolutionKind.Bundler,
  strict: true,
  noUncheckedIndexedAccess: true,
  esModuleInterop: true,
  skipLibCheck: true,
  isolatedModules: true,
  lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
};

type Env = ReturnType<typeof createVirtualTypeScriptEnvironment>;

let envPromise: Promise<Env> | null = null;

async function getEnv(): Promise<Env> {
  if (envPromise) return envPromise;
  envPromise = (async () => {
    const fsMap = await createDefaultMapFromCDN(
      COMPILER_OPTIONS,
      ts.version,
      true, // cache lib files in localStorage so warm starts are instant
      ts,
    );
    // Seed the root file in fsMap BEFORE the env wraps it — the env eagerly
    // builds a Program from rootFiles, and a missing root file shows up as
    // TS6053 ("File '…' not found") on every subsequent diagnostic call.
    // Seed with a newline, not '': vfs.readFile returns the literal contents
    // and TypeScript treats the empty string as "no source", surfacing the
    // same TS6053 even when fsMap.has(FILE) is true.
    fsMap.set(FILE, '\n');
    const system = createSystem(fsMap);
    return createVirtualTypeScriptEnvironment(system, [FILE], ts, COMPILER_OPTIONS);
  })();
  return envPromise;
}

export interface Diagnostic {
  line: number;
  column: number;
  message: string;
  category: 'error' | 'warning';
}

export interface TypeQuery {
  /** 1-indexed line of the `^?` marker itself (so the UI can render "line N"). */
  line: number;
  /** Display string from TypeScript's hover info, e.g. `const c: "red" | "green"`. */
  type: string;
}

export interface CheckResult {
  diagnostics: Diagnostic[];
  queries: TypeQuery[];
}

export async function checkCode(code: string): Promise<CheckResult> {
  const env = await getEnv();
  env.updateFile(FILE, code);

  const ls = env.languageService;

  const diagnostics: Diagnostic[] = [];
  // Syntax first — TS won't produce semantic diagnostics for unparseable files.
  const raw = [
    ...ls.getSyntacticDiagnostics(FILE),
    ...ls.getSemanticDiagnostics(FILE),
  ];
  for (const d of raw) {
    if (!d.file || d.start == null) continue;
    const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
    diagnostics.push({
      line: line + 1,
      column: character + 1,
      message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
      category:
        d.category === ts.DiagnosticCategory.Warning ? 'warning' : 'error',
    });
  }

  const queries = resolveQueries(ls, code);
  return { diagnostics, queries };
}

// Twoslash convention: a comment line shaped `//   ^?` queries the type of the
// expression on the *previous* line, at the column of the `^` character. We
// resolve via the LanguageService's getQuickInfoAtPosition (same call IDE
// hovers go through).
function resolveQueries(ls: ts.LanguageService, code: string): TypeQuery[] {
  const results: TypeQuery[] = [];
  const lines = code.split('\n');
  const program = ls.getProgram();
  if (!program) return results;
  const sourceFile = program.getSourceFile(FILE);
  if (!sourceFile) return results;

  // Start at 1 — a `^?` on line 0 has no previous line to query.
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!/^\s*\/\/\s*\^\?\s*$/.test(line)) continue;

    const caretCol = line.indexOf('^');
    const targetLineIdx = i - 1;
    const targetLineLen = lines[targetLineIdx].length;
    const targetCol = Math.min(caretCol, targetLineLen);
    const position = sourceFile.getPositionOfLineAndCharacter(targetLineIdx, targetCol);
    const info = ls.getQuickInfoAtPosition(FILE, position);
    const typeText =
      info?.displayParts?.map((p) => p.text).join('') ?? '(no type info)';
    results.push({ line: i + 1, type: typeText });
  }

  return results;
}

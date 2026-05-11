// Type-only checker for ZodCoding. Same shape as TypeCoding's checker
// (LanguageService over @typescript/vfs, with Twoslash-style `^?` queries),
// but pre-seeds a minimal zod 4 ambient module declaration so `import { z } from 'zod'`
// resolves and `z.infer<typeof S>` produces the expected output type.
//
// One TS env per page, lazily initialised and reused across every sandbox.

import ts from 'typescript';
import {
  createSystem,
  createVirtualTypeScriptEnvironment,
  createDefaultMapFromCDN,
} from '@typescript/vfs';

import { ZOD_SHIM_DTS } from './zod-shim';

const FILE = '/index.ts';
const ZOD_DTS = '/zod.d.ts';

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
      true,
      ts,
    );
    // Ambient module declaration — the `declare module 'zod'` block makes
    // `import { z } from 'zod'` resolve without us having to wire up a
    // node_modules layout in the vfs.
    fsMap.set(ZOD_DTS, ZOD_SHIM_DTS);
    // Seed the root with a newline so the env's eager Program build doesn't
    // surface TS6053 — same gotcha as TypeCoding.
    fsMap.set(FILE, '\n');
    const system = createSystem(fsMap);
    return createVirtualTypeScriptEnvironment(
      system,
      [FILE, ZOD_DTS],
      ts,
      COMPILER_OPTIONS,
    );
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
  line: number;
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

function resolveQueries(ls: ts.LanguageService, code: string): TypeQuery[] {
  const results: TypeQuery[] = [];
  const lines = code.split('\n');
  const program = ls.getProgram();
  if (!program) return results;
  const sourceFile = program.getSourceFile(FILE);
  if (!sourceFile) return results;

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!/^\s*\/\/\s*\^\?\s*$/.test(line)) continue;

    const caretCol = line.indexOf('^');
    const targetLineIdx = i - 1;
    const targetLineLen = lines[targetLineIdx].length;
    const targetCol = Math.min(caretCol, targetLineLen);
    const position = sourceFile.getPositionOfLineAndCharacter(
      targetLineIdx,
      targetCol,
    );
    const info = ls.getQuickInfoAtPosition(FILE, position);
    const typeText =
      info?.displayParts?.map((p) => p.text).join('') ?? '(no type info)';
    results.push({ line: i + 1, type: typeText });
  }

  return results;
}

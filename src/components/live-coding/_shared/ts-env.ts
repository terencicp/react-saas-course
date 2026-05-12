// In-browser TypeScript LanguageService over @typescript/vfs. TypeCoding and
// ZodCoding both ran identical setups; the only delta was ZodCoding seeding
// an ambient `zod` module declaration. This factory takes the ambient files
// as an option so both share the implementation.
//
// The TS compiler is a multi-MB module — bootstraps should `await import()`
// THIS file lazily (not eagerly at module top), so the TS bundle stays off
// the initial editor-render critical path.

import ts from 'typescript';
import {
    createSystem,
    createVirtualTypeScriptEnvironment,
    createDefaultMapFromCDN,
} from '@typescript/vfs';

import type { Diagnostic, TypeQuery } from './types';

const FILE = '/index.ts';

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

export interface CreateTsEnvOpts {
    /** Ambient .d.ts files to seed into the vfs, keyed by virtual path
     * (e.g. `{'/zod.d.ts': ZOD_SHIM_DTS}`). Their paths are added to the
     * Program's root files. */
    ambientFiles?: Record<string, string>;
}

export interface TsEnv {
    check(code: string): Promise<{ diagnostics: Diagnostic[]; queries: TypeQuery[] }>;
}

export function createTsEnv(opts: CreateTsEnvOpts = {}): TsEnv {
    const ambientFiles = opts.ambientFiles ?? {};
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
            // Seed ambient .d.ts files BEFORE the env builds its Program.
            for (const [path, content] of Object.entries(ambientFiles)) {
                fsMap.set(path, content);
            }
            // Seed root with a newline. An empty string would make
            // env.readFile return '' and TS would treat that as "no source",
            // surfacing TS6053 on every check call.
            fsMap.set(FILE, '\n');
            const system = createSystem(fsMap);
            const rootFiles = [FILE, ...Object.keys(ambientFiles)];
            return createVirtualTypeScriptEnvironment(
                system,
                rootFiles,
                ts,
                COMPILER_OPTIONS,
            );
        })();
        return envPromise;
    }

    return {
        async check(code: string) {
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
                const { line, character } =
                    d.file.getLineAndCharacterOfPosition(d.start);
                diagnostics.push({
                    line: line + 1,
                    column: character + 1,
                    message: ts.flattenDiagnosticMessageText(d.messageText, '\n'),
                    category:
                        d.category === ts.DiagnosticCategory.Warning
                            ? 'warning'
                            : 'error',
                });
            }

            const queries = resolveQueries(ls, code);
            return { diagnostics, queries };
        },
    };
}

// Twoslash convention: a comment line shaped `//   ^?` queries the type of
// the expression on the *previous* line, at the column of the `^` character.
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

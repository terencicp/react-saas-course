// Shared TS→JS pipeline used by the Drizzle runtimes. We type-strip with
// `ts.transpileModule` then regex-strip the surviving `import`/`export` so
// the result can be concatenated as a plain script body inside a worker.
//
// TypeScript is lazy-loaded — multi-MB module; only the first Run on a page
// pays the cost, and it's the same chunk TypeCoding/ZodCoding use, so pages
// with both Drizzle + Type cards download it once.

let tsModulePromise: Promise<typeof import('typescript')> | null = null;
export function getTS(): Promise<typeof import('typescript')> {
    if (!tsModulePromise) tsModulePromise = import('typescript');
    return tsModulePromise;
}

/** Type-strip a TS source. Module emit is kept (import/export survive) and
 * then removed by `stripModuleSyntax` — `isolatedModules: true` matches the
 * host tsconfig stance. */
export async function transpileTS(source: string): Promise<string> {
    const ts = await getTS();
    const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
            target: ts.ScriptTarget.ES2022,
            module: ts.ModuleKind.ESNext,
            moduleResolution: ts.ModuleResolutionKind.Bundler,
            isolatedModules: true,
            esModuleInterop: true,
        },
        reportDiagnostics: false,
    });
    return outputText;
}

/** Drop top-level `import … from '…'` and `import '…'` and strip the `export`
 * keyword. The Drizzle worker runs schema + student code as a single
 * concatenated body inside an async function — modules don't compose there,
 * and the ops/builders are pre-injected on `self`. */
export function stripModuleSyntax(source: string): string {
    return (
        source
            // import { a, b } from '...';  (single- or multi-line)
            .replace(/^[ \t]*import\s+(?:[\s\S]*?)from\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
            // import '...';  (side-effect)
            .replace(/^[ \t]*import\s+['"][^'"]+['"]\s*;?\s*$/gm, '')
            // export default / export const / export function / export type
            .replace(/^([ \t]*)export\s+default\s+/gm, '$1')
            .replace(/^([ \t]*)export\s+/gm, '$1')
    );
}

/** Convenience: strip modules then transpile. */
export async function prepareSource(tsSource: string): Promise<string> {
    return transpileTS(stripModuleSyntax(tsSource));
}

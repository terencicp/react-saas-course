// Browser-side bundler for ReactCoding. Wraps esbuild-wasm with a tiny virtual
// filesystem so the parent can hand in `{ '/App.tsx': '…', '/index.tsx': '…' }`
// and get back a single ESM string to drop into a `srcdoc` iframe.
//
// `react`, `react-dom` and `react/jsx-runtime` are marked external — the bundle
// keeps them as bare specifiers and the iframe's `<script type="importmap">`
// resolves them to esm.sh URLs at runtime.

import * as esbuild from 'esbuild-wasm';
// Vite-resolved URL to the bundled wasm — served from our own origin, cached.
import wasmURL from 'esbuild-wasm/esbuild.wasm?url';

const EXTERNAL = ['react', 'react-dom', 'react-dom/client', 'react/jsx-runtime'];

let _initPromise: Promise<void> | null = null;

/** Lazy-init esbuild-wasm. Idempotent — all cards on the page share one
 *  worker; the first caller pays the ~3 MB wasm fetch. */
export function ensureEsbuild(): Promise<void> {
    if (!_initPromise) _initPromise = esbuild.initialize({ wasmURL, worker: true });
    return _initPromise;
}

/** Bundle a flat virtual fs (`{ '/App.tsx': '…' }`) into a single ESM string.
 *  Throws on parse / resolve errors with esbuild's own messages. */
export async function bundle(
    files: Record<string, string>,
    entry: string,
): Promise<{ code: string }> {
    await ensureEsbuild();
    const result = await esbuild.build({
        entryPoints: [entry],
        bundle: true,
        format: 'esm',
        target: 'es2022',
        jsx: 'automatic',
        jsxImportSource: 'react',
        write: false,
        logLevel: 'silent',
        external: EXTERNAL,
        plugins: [virtualFsPlugin(files)],
    });
    return { code: result.outputFiles[0].text };
}

// Our virtual fs is flat — every file lives at `/`. So resolving `./X` is just
// "look up `/X`, `/X.tsx`, `/X.ts` in the files map."
function virtualFsPlugin(files: Record<string, string>): esbuild.Plugin {
    return {
        name: 'rc-virtual-fs',
        setup(build) {
            build.onResolve({ filter: /.*/ }, (args) => {
                if (args.kind === 'entry-point' && files[args.path]) {
                    return { path: args.path, namespace: 'rcvfs' };
                }
                if (args.path.startsWith('./')) {
                    const base = '/' + args.path.slice(2);
                    for (const p of [base, base + '.tsx', base + '.ts']) {
                        if (files[p]) return { path: p, namespace: 'rcvfs' };
                    }
                }
                return null;
            });
            build.onLoad({ filter: /.*/, namespace: 'rcvfs' }, (args) => ({
                contents: files[args.path],
                loader: args.path.endsWith('.tsx') ? 'tsx' : 'ts',
            }));
        },
    };
}

/**
 * SandpackCallout — Astro client island that mounts a `<Sandpack>` from the
 * `@codesandbox/sandpack-react` package loaded at runtime via esm.sh.
 *
 * The component renders as an expandable callout (matching
 * `SandboxCallout.astro` — chevron header + lazy-loaded player) so each
 * sandbox stays collapsed by default and the ~700 KB esm.sh bundle, the
 * cross-origin bundler iframe, and the React 19 root only spin up on the
 * first click. Subsequent toggles just hide/show the already-mounted tree.
 *
 * The course doesn't keep `sandpack-react` in package.json (only the
 * lightweight `@codesandbox/sandpack-client` is), so this component pulls
 * the full React bindings dynamically at mount time.
 *
 * React isolation: Sandpack is mounted in its own React 19 root using a
 * react / react-dom / sandpack-react triple all loaded from esm.sh, so they
 * share one React runtime. The host Astro island's React (bundled by Vite)
 * never calls Sandpack's hooks directly — it only renders the wrapper
 * <div> the Sandpack root mounts into. Without this isolation, Sandpack's
 * hooks would read a different React-internals slot than the one the host
 * sets, throwing "Invalid hook call" at runtime.
 *
 * Usage in MDX (mount as a React island):
 *
 *   import SandpackCallout from '../../../../components/embeds/SandpackCallout.tsx';
 *
 *   <SandpackCallout
 *     client:visible
 *     template="react-ts"
 *     label="Open counter sandbox"
 *     description="React 19 minimal counter — default template."
 *     files={{
 *       '/App.tsx': `export default function App() { return <h1>Hi</h1>; }`,
 *     }}
 *     dependencies={{ 'react-hook-form': '^7.55.0' }}
 *     options={{ showLineNumbers: true }}
 *   />
 */

import { useEffect, useRef, useState, type ReactElement } from 'react';

// Sandpack's template names — pinned to the v2 release line so the shape
// here matches the props the runtime accepts.
export type SandpackTemplate =
    | 'react'
    | 'react-ts'
    | 'vanilla'
    | 'vanilla-ts'
    | 'vue'
    | 'svelte'
    | 'solid'
    | 'static'
    | 'angular'
    | 'nextjs'
    | 'vite-react'
    | 'vite-react-ts'
    | 'test-ts';

// Per-file config mirrors Sandpack's own `SandpackFile`. We accept either a
// raw string (just the code) or this object form so authors can pin a file
// as active/hidden/read-only.
export interface SandpackFileObject {
    code: string;
    active?: boolean;
    hidden?: boolean;
    readOnly?: boolean;
}

export type SandpackFiles = Record<string, string | SandpackFileObject>;

export interface SandpackCalloutProps {
    /** Files keyed by absolute path inside the sandbox FS, e.g. `/App.tsx`. */
    files: SandpackFiles;
    /** Sandpack template. Defaults to `react-ts`. */
    template?: SandpackTemplate;
    /** Extra deps merged into the sandbox's `package.json`. */
    dependencies?: Record<string, string>;
    /** Entry point override (defaults vary per template). */
    entry?: string;
    /** Runtime — `'browser'` (default) or `'node'` for SSR-style demos. */
    environment?: 'browser' | 'node';
    /** Show the in-iframe console pane. */
    showConsole?: boolean;
    /** Show the file explorer pane. */
    showFileExplorer?: boolean;
    /** Show the `<SandpackTests>` runner pane (requires `*.test.{ts,tsx}` files). */
    showTests?: boolean;
    /**
     * Pass-through Sandpack `options` (showTabs, showLineNumbers,
     * editorHeight, autorun, recompileMode, etc).
     */
    options?: Record<string, unknown>;
    /** Theme name or theme object. `'auto'` (default) tracks prefers-color-scheme. */
    theme?: 'auto' | 'light' | 'dark' | Record<string, unknown>;
    /** Callout header label. Shown next to the badge icon. */
    label?: string;
    /** Optional secondary line under the label. */
    description?: string;
}

interface ReactModule {
    createElement: (
        type: unknown,
        props?: Record<string, unknown> | null,
        ...children: unknown[]
    ) => unknown;
    Fragment: unknown;
}

interface ReactDOMClientModule {
    createRoot: (container: Element) => {
        render: (children: unknown) => void;
        unmount: () => void;
    };
}

interface SandpackModule {
    Sandpack: unknown;
    SandpackProvider: unknown;
    SandpackLayout: unknown;
    SandpackCodeEditor: unknown;
    SandpackPreview: unknown;
    SandpackConsole: unknown;
    SandpackFileExplorer: unknown;
    SandpackTests: unknown;
}

interface LoadedBundle {
    React: ReactModule;
    ReactDOM: ReactDOMClientModule;
    Sandpack: SandpackModule;
}

// Pin React 19 across all three esm.sh URLs via `?deps=react@19,react-dom@19`
// so sandpack-react binds against the same React module we explicitly load.
const REACT_VERSION = '19';
// Pin to a sandpack-react release whose bundler iframe URL
// (`https://<dashed-version>-sandpack.codesandbox.io/`) is actually
// deployed. 2.20.0 builds `https://2-20-0-sandpack.codesandbox.io/`, which
// returns 404 — the runtime then times out with `ERROR: TIME_OUT`. 2.19.8
// is the latest tag with a live bundler at time of writing (May 2026).
const SANDPACK_VERSION = '2.19.8';
const SHARED_DEPS = `react@${REACT_VERSION},react-dom@${REACT_VERSION}`;

// The site sends `COEP: credentialless` so StackBlitz's WebContainer can use
// SharedArrayBuffer (see astro.config.mjs). Under that header, cross-origin
// iframes only load if they either send a COEP header themselves or carry
// the `credentialless` attribute on the `<iframe>` element. Sandpack's
// runtime client creates its bundler iframe with `document.createElement`
// and never sets that attribute, so without intervention every Sandpack
// iframe is blocked with `net::ERR_BLOCKED_BY_RESPONSE` and the inner UI
// shows "Couldn't connect to server / ERROR: TIME_OUT".
//
// Patch `document.createElement('iframe')` once so every iframe created
// after this module loads is born credentialless. Safe for same-origin
// iframes (the attribute is a no-op when the resource isn't cross-origin)
// and necessary for the cross-origin Sandpack bundler URL.
let iframePatchInstalled = false;
function ensureIframeCredentiallessPatch(): void {
    if (iframePatchInstalled || typeof document === 'undefined') return;
    iframePatchInstalled = true;
    const orig = document.createElement.bind(document) as (
        tag: string,
        options?: ElementCreationOptions,
    ) => HTMLElement;
    document.createElement = function patched(
        tag: string,
        options?: ElementCreationOptions,
    ): HTMLElement {
        const el = orig(tag, options);
        if (typeof tag === 'string' && tag.toLowerCase() === 'iframe') {
            (el as HTMLIFrameElement & { credentialless?: boolean }).credentialless = true;
            el.setAttribute('credentialless', '');
        }
        return el;
    } as typeof document.createElement;
}

// Cache the import triple so a page with N <SandpackDemo /> islands only
// fetches the bundles once.
let cached: Promise<LoadedBundle> | null = null;
function loadBundle(): Promise<LoadedBundle> {
    if (cached) return cached;
    cached = Promise.all([
        import(/* @vite-ignore */ `https://esm.sh/react@${REACT_VERSION}`),
        import(/* @vite-ignore */ `https://esm.sh/react-dom@${REACT_VERSION}/client`),
        import(
            /* @vite-ignore */ `https://esm.sh/@codesandbox/sandpack-react@${SANDPACK_VERSION}?deps=${SHARED_DEPS}`
        ),
    ]).then(([react, reactDom, sandpack]) => ({
        React: (react as { default?: ReactModule }).default ?? (react as ReactModule),
        ReactDOM:
            (reactDom as { default?: ReactDOMClientModule }).default ??
            (reactDom as ReactDOMClientModule),
        Sandpack: sandpack as SandpackModule,
    }));
    return cached;
}

// Styles match SandboxCallout.astro so the two callouts read as a family on
// the page. Injected once per document on first render.
const STYLE_TAG_ID = 'sandpack-demo-styles';
const CALLOUT_CSS = `
.spd-callout {
    margin: 1.5rem 0;
    border: 1px solid var(--sl-color-gray-5);
    border-radius: 0.5rem;
    background: var(--sl-color-black);
    overflow: hidden;
    transition: background 0.15s, border-color 0.15s;
}
.spd-callout:has(.spd-toggle:hover) {
    background: var(--sl-color-gray-7, var(--sl-color-gray-6));
    border-color: var(--sl-color-gray-2);
}
.spd-toggle {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1rem 1.25rem;
    border: none;
    background: transparent;
    color: var(--sl-color-text);
    font: inherit;
    text-align: left;
    cursor: pointer;
}
.spd-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 0.375rem;
    background: hsl(220 90% 95%);
    color: hsl(230 75% 45%);
    flex-shrink: 0;
}
[data-theme='dark'] .spd-badge {
    background: hsl(230 50% 22%);
    color: hsl(220 90% 80%);
}
.spd-body {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
}
.spd-label {
    font-size: 1rem;
    font-weight: 600;
    color: var(--sl-color-white);
}
.spd-message {
    font-size: 0.9375rem;
    line-height: 1.55;
    color: var(--sl-color-gray-2);
}
.spd-chevron {
    flex-shrink: 0;
    color: var(--sl-color-gray-3);
    transition: transform 0.2s, color 0.15s;
}
.spd-toggle:hover .spd-chevron {
    color: var(--sl-color-white);
}
.spd-toggle[aria-expanded='true'] .spd-chevron {
    transform: rotate(180deg);
}
.spd-player {
    padding: 0 1.25rem 1.25rem;
}
.spd-frame {
    width: 100%;
    border-radius: 0.5rem;
    overflow: hidden;
    background: var(--sl-color-gray-7, var(--sl-color-gray-6));
}
.spd-placeholder {
    padding: 2rem 1rem;
    color: var(--sl-color-gray-2);
    text-align: center;
    font-size: 14px;
}
.spd-error {
    padding: 0.75rem 1rem;
    border-radius: 0.5rem;
    border: 1px solid #f87171;
    background: #fef2f2;
    color: #7f1d1d;
    font-size: 14px;
}
`;
let stylesInjected = false;
function ensureStylesInjected(): void {
    if (stylesInjected || typeof document === 'undefined') return;
    stylesInjected = true;
    if (document.getElementById(STYLE_TAG_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_TAG_ID;
    style.textContent = CALLOUT_CSS;
    document.head.appendChild(style);
}

export default function SandpackCallout(props: SandpackCalloutProps): ReactElement {
    const {
        files,
        template = 'react-ts',
        dependencies,
        entry,
        environment,
        showConsole = false,
        showFileExplorer = false,
        showTests = false,
        options,
        theme = 'auto',
        label = 'Open Sandpack',
        description,
    } = props;

    const containerRef = useRef<HTMLDivElement | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);
    const [mountState, setMountState] = useState<'idle' | 'loading' | 'ready'>(
        'idle',
    );

    // Inject the shared CSS once on first client render.
    useEffect(() => {
        ensureStylesInjected();
    }, []);

    // Lazy-mount Sandpack the first time the callout is expanded. After that,
    // toggling collapses just hides the player; the iframe stays alive.
    useEffect(() => {
        if (!expanded || mountState !== 'idle') return;
        let cancelled = false;
        let rootHandle: { unmount: () => void } | null = null;

        ensureIframeCredentiallessPatch();
        setMountState('loading');

        loadBundle().then(
            ({ React, ReactDOM, Sandpack: S }) => {
                if (cancelled || !containerRef.current) return;

                const customSetup: Record<string, unknown> = {};
                if (dependencies) customSetup.dependencies = dependencies;
                if (entry) customSetup.entry = entry;
                if (environment) customSetup.environment = environment;
                const customSetupProp = Object.keys(customSetup).length
                    ? customSetup
                    : undefined;

                const needsCustomLayout = showConsole || showFileExplorer || showTests;

                let tree: unknown;
                if (!needsCustomLayout) {
                    tree = React.createElement(S.Sandpack as never, {
                        template,
                        files,
                        customSetup: customSetupProp,
                        options,
                        theme,
                    });
                } else {
                    const editorOptions = options as
                        | { showLineNumbers?: boolean }
                        | undefined;
                    const layoutChildren: unknown[] = [];
                    if (showFileExplorer) {
                        layoutChildren.push(
                            React.createElement(S.SandpackFileExplorer as never, {
                                key: 'fx',
                            }),
                        );
                    }
                    layoutChildren.push(
                        React.createElement(S.SandpackCodeEditor as never, {
                            key: 'editor',
                            showLineNumbers: editorOptions?.showLineNumbers ?? true,
                            showTabs: true,
                            showInlineErrors: true,
                            wrapContent: true,
                        }),
                        React.createElement(S.SandpackPreview as never, {
                            key: 'preview',
                            showNavigator: true,
                        }),
                    );

                    const providerChildren: unknown[] = [
                        React.createElement(
                            S.SandpackLayout as never,
                            { key: 'main' },
                            ...layoutChildren,
                        ),
                    ];
                    if (showConsole) {
                        providerChildren.push(
                            React.createElement(
                                S.SandpackLayout as never,
                                { key: 'console' },
                                React.createElement(S.SandpackConsole as never, {
                                    standalone: true,
                                }),
                            ),
                        );
                    }
                    if (showTests) {
                        providerChildren.push(
                            React.createElement(
                                S.SandpackLayout as never,
                                { key: 'tests' },
                                React.createElement(S.SandpackTests as never, {}),
                            ),
                        );
                    }

                    tree = React.createElement(
                        S.SandpackProvider as never,
                        {
                            template,
                            files,
                            customSetup: customSetupProp,
                            options,
                            theme,
                        },
                        ...providerChildren,
                    );
                }

                const root = ReactDOM.createRoot(containerRef.current);
                root.render(tree);
                rootHandle = root;
                setMountState('ready');
            },
            (err: unknown) => {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : String(err));
                    setMountState('idle');
                }
            },
        );

        return () => {
            cancelled = true;
            if (rootHandle) {
                // queueMicrotask defers unmount past the current React commit,
                // avoiding the "synchronously unmounting a root during render"
                // warning in React 19 strict mode.
                const handle = rootHandle;
                queueMicrotask(() => handle.unmount());
            }
        };
        // The Sandpack root is mounted once on first expand. Prop changes
        // after mount don't trigger a re-mount — Sandpack handles file and
        // template swaps internally via its own React tree.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [expanded]);

    const closeLabel = label.toLowerCase().startsWith('open ')
        ? `Hide ${label.slice(5)}`
        : `Hide ${label}`;

    return (
        <div className="spd-callout not-content">
            <button
                type="button"
                className="spd-toggle"
                aria-expanded={expanded}
                onClick={() => setExpanded((v) => !v)}
            >
                <span className="spd-badge" aria-hidden="true">
                    <svg
                        viewBox="0 0 24 24"
                        width="22"
                        height="22"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <polyline points="9 7 4 12 9 17" />
                        <polyline points="15 7 20 12 15 17" />
                    </svg>
                </span>
                <span className="spd-body">
                    <span className="spd-label">
                        {expanded ? closeLabel : label}
                    </span>
                    {description ? (
                        <span className="spd-message">{description}</span>
                    ) : null}
                </span>
                <svg
                    className="spd-chevron"
                    viewBox="0 0 12 12"
                    aria-hidden="true"
                    width="14"
                    height="14"
                >
                    <path
                        d="M2 4l4 4 4-4"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </button>
            <div className="spd-player" hidden={!expanded}>
                {error ? (
                    <div className="spd-error">Failed to load Sandpack: {error}</div>
                ) : (
                    <div className="spd-frame">
                        <div ref={containerRef} />
                        {mountState !== 'ready' ? (
                            <div className="spd-placeholder">Loading Sandpack…</div>
                        ) : null}
                    </div>
                )}
            </div>
        </div>
    );
}

// CodeMirror 6 factory. Every live-coding card uses the same base config
// (history, bracket matching, oneDark, default+history keymaps + Tab indent).
// Lessons differ only in (a) language extension and (b) extras like
// hoverTooltip or StateField decorations.

import { EditorView, keymap, lineNumbers, type Extension } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import {
    defaultKeymap,
    history,
    historyKeymap,
    indentWithTab,
} from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { sql, PostgreSQL } from '@codemirror/lang-sql';
import { html as cmHtml } from '@codemirror/lang-html';
import { css as cmCss } from '@codemirror/lang-css';
import { oneDark } from '@codemirror/theme-one-dark';

export type Lang = 'ts' | 'tsx' | 'js' | 'sql' | 'html' | 'css';

function langExtension(lang: Lang): Extension {
    switch (lang) {
        case 'ts':
            return javascript({ typescript: true });
        case 'tsx':
            return javascript({ typescript: true, jsx: true });
        case 'js':
            return javascript();
        case 'sql':
            return sql({ dialect: PostgreSQL, upperCaseKeywords: true });
        case 'html':
            return cmHtml();
        case 'css':
            return cmCss();
    }
}

export interface CreateEditorOpts {
    parent: HTMLElement;
    doc: string;
    lang: Lang;
    /** Fires on every doc change so callers can debounce live-rebuild or
     * re-evaluate feedback button gating. */
    onDocChange?: (doc: string) => void;
    /** Appended after the standard extensions — e.g. ZodCoding's hoverTooltip
     * + Decoration state field. */
    extraExtensions?: Extension[];
}

export function createEditor(opts: CreateEditorOpts): EditorView {
    return new EditorView({
        state: EditorState.create({
            doc: opts.doc,
            extensions: [
                lineNumbers(),
                history(),
                bracketMatching(),
                indentOnInput(),
                langExtension(opts.lang),
                oneDark,
                keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
                EditorView.updateListener.of((u) => {
                    if (u.docChanged && opts.onDocChange) {
                        opts.onDocChange(u.state.doc.toString());
                    }
                }),
                ...(opts.extraExtensions ?? []),
            ],
        }),
        parent: opts.parent,
    });
}

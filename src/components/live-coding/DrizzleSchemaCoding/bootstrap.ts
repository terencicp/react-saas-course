// Per-card bootstrap. Mounts CodeMirror (TS), drives the Check button into
// the schema runner, and renders a criteria checklist (requirements + probe
// outcomes) plus a compact introspection panel of what the student's schema
// actually produced. Mirrors DrizzleCoding's shape; the grader is shape-based
// (against requirements) instead of row-match.

import {
    DrizzleSchemaRunner,
    type RunOutcome,
    type ProbeSpec,
} from './schema-runtime';
import {
    evaluateRequirements,
    evaluateProbes,
    type TableRequirement,
    type Criterion,
    type IntrospectedTable,
} from './requirement-check';
import { createEditor } from '../_shared/editor';
import { getCardRefs } from '../_shared/refs';
import { setStatus, setError } from '../_shared/status';
import { wireReset } from '../_shared/reset';
import { wireFeedback } from '../_shared/feedback-loop';

document.querySelectorAll<HTMLElement>('.lc-drizzle-schema').forEach((card) => {
    const refs = getCardRefs(card);
    const criteriaEl = card.querySelector<HTMLElement>('.lc-criteria');
    const introspectionEl = card.querySelector<HTMLElement>('.lc-dsc-introspection')!;
    const introspectionBody = card.querySelector<HTMLElement>(
        '.lc-dsc-introspection-body',
    )!;

    const starter = card.dataset.starter ?? '';
    const requirementsRaw = card.dataset.requirements ?? '';
    const probesRaw = card.dataset.probes ?? '';
    const seedSQL = card.dataset.seed ?? '';
    const requirements: TableRequirement[] = requirementsRaw
        ? JSON.parse(requirementsRaw)
        : [];
    const probes: ProbeSpec[] = probesRaw ? JSON.parse(probesRaw) : [];

    const runner = new DrizzleSchemaRunner({ seedSQL, probes });
    let latestOutcome: RunOutcome | null = null;
    let latestCriteria: Criterion[] = [];

    const view = createEditor({
        parent: refs.editor,
        doc: starter,
        lang: 'ts',
        onDocChange: () => feedback.refreshGate(),
    });

    wireReset({
        card,
        resetBtn: refs.resetBtn,
        view,
        starter,
        feedbackPanel: refs.feedbackPanel,
        feedbackStream: refs.feedbackStream,
        errorPane: refs.errorPane,
        onAfterReset: () => {
            introspectionBody.innerHTML = '';
            introspectionEl.hidden = true;
            if (criteriaEl) criteriaEl.innerHTML = '';
            latestOutcome = null;
            latestCriteria = [];
        },
    });

    refs.runBtn!.addEventListener('click', async () => {
        refs.runBtn!.disabled = true;
        setStatus(refs.status, 'running', 'Checking…');
        clearOutput();

        const outcome = await runner.run(view.state.doc.toString());
        latestOutcome = outcome;

        if (outcome.ok) {
            const requirementCriteria = evaluateRequirements(
                requirements,
                outcome.introspected,
            );
            const probeCriteria = evaluateProbes(outcome.probes);
            latestCriteria = [...requirementCriteria, ...probeCriteria];
            renderCriteria(latestCriteria);
            renderIntrospection(outcome.introspected);
            if (outcome.ddlError) {
                // DDL didn't apply — probably an unresolved FK. Show it; the
                // criteria already point at the gap.
                setError(refs.errorPane, `Schema applied with an error:\n${outcome.ddlError}`);
            }
            setStatus(refs.status, 'idle', `${outcome.durationMs.toFixed(0)}ms`);
        } else {
            latestCriteria = [];
            setError(refs.errorPane, outcome.error);
            setStatus(refs.status, 'error', outcome.timedOut ? 'Timed out' : 'Error');
        }

        refs.runBtn!.disabled = false;
    });

    function clearOutput(): void {
        introspectionBody.innerHTML = '';
        introspectionEl.hidden = true;
        setError(refs.errorPane, null);
        if (criteriaEl) {
            criteriaEl.hidden = true;
            criteriaEl.innerHTML = '';
        }
    }

    function renderCriteria(criteria: Criterion[]): void {
        if (!criteriaEl || criteria.length === 0) return;
        criteriaEl.hidden = false;
        criteriaEl.innerHTML = '';
        for (const c of criteria) {
            const li = document.createElement('li');
            li.className = 'lc-criterion';
            li.dataset.met = c.met ? 'true' : 'false';

            const icon = document.createElement('span');
            icon.className = 'lc-criterion-icon';
            icon.setAttribute('aria-hidden', 'true');

            const text = document.createElement('span');
            text.className = 'lc-criterion-text';
            // Label may contain inline backticks; render those as <code>.
            // Labels are host-controlled (no user input) so the small
            // string-replacement pass is safe.
            text.innerHTML = formatLabel(c.label);
            if (!c.met && c.reason) {
                const reason = document.createElement('span');
                reason.className = 'lc-criterion-reason';
                reason.textContent = c.reason;
                text.appendChild(reason);
            }

            li.appendChild(icon);
            li.appendChild(text);
            criteriaEl.appendChild(li);
        }
    }

    function renderIntrospection(tables: IntrospectedTable[]): void {
        introspectionEl.hidden = false;
        introspectionBody.innerHTML = '';

        if (tables.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'lc-dsc-introspection-empty';
            empty.textContent =
                'No top-level pgTable(...) declarations were found.';
            introspectionBody.appendChild(empty);
            return;
        }

        for (const t of tables) {
            const block = document.createElement('div');
            block.className = 'lc-dsc-introspection-table';
            const pre = document.createElement('pre');
            pre.textContent = formatIntrospection(t);
            block.appendChild(pre);
            introspectionBody.appendChild(block);
        }
    }

    const feedback = wireFeedback({
        card,
        button: refs.feedbackBtn,
        panel: refs.feedbackPanel,
        stream: refs.feedbackStream,
        closeBtn: refs.feedbackClose,
        isDirty: () => view.state.doc.toString() !== starter,
        buildPrompt: () => {
            const diagnosis = diagnoseSchema(latestOutcome, latestCriteria);
            return (
                `You are an AI tutor helping a student design a Drizzle (TypeScript ORM) ` +
                `Postgres schema. The grader has produced a DIAGNOSIS you MUST treat as ` +
                `ground truth — do not re-derive pass/fail by inspecting the schema yourself.\n\n` +
                (refs.instructions ? `INSTRUCTIONS:\n${refs.instructions}\n\n` : '') +
                `STUDENT'S CURRENT SCHEMA:\n${view.state.doc.toString()}\n\n` +
                `DIAGNOSIS:\n${diagnosis}\n\n` +
                `Rules:\n` +
                `- If DIAGNOSIS starts with PASS: briefly affirm in one sentence and stop.\n` +
                `- If DIAGNOSIS starts with FAIL: you MUST NOT say "perfect", "great", ` +
                `"correct", or any congratulation. Point at the specific failing requirement ` +
                `using Drizzle vocabulary: \`pgTable\`, \`.primaryKey()\`, \`.notNull()\`, ` +
                `\`.unique()\`, \`.references(() => …)\`, \`primaryKey(...)\` (composite), ` +
                `\`unique(...)\` (composite), \`.default(...)\`, \`.defaultNow()\`. ` +
                `Do NOT give the full code solution — nudge, don't solve.\n` +
                `- If DIAGNOSIS starts with NOT_RUN: tell the student to click "Check schema" first.\n\n` +
                `Reply with 1-2 short sentences (under 30 words). Second person, terse, ` +
                `no warm-up phrases, no restating the schema. No code blocks, no headers.`
            );
        },
    });
});

function diagnoseSchema(
    outcome: RunOutcome | null,
    criteria: Criterion[],
): string {
    if (!outcome) return 'NOT_RUN: the student has not checked the schema yet';
    if (!outcome.ok) return `FAIL: ${outcome.error}`;
    if (criteria.length === 0) return 'NO_CRITERIA: sandbox card';

    const failing = criteria.filter((c) => !c.met);
    if (failing.length === 0) {
        return 'PASS: every requirement and probe is satisfied';
    }
    const summary = failing
        .map((c) => `- ${stripCode(c.label)}${c.reason ? ` — ${c.reason}` : ''}`)
        .join('\n');
    return `FAIL:\n${summary}`;
}

function formatLabel(label: string): string {
    return escapeHtml(label).replace(/`([^`]+)`/g, '<code>$1</code>');
}

function stripCode(label: string): string {
    return label.replace(/`/g, '');
}

function escapeHtml(s: string): string {
    return s
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function formatIntrospection(t: IntrospectedTable): string {
    const lines: string[] = [`${t.name}`];
    for (const c of t.columns) {
        const parts: string[] = [`  ${c.name} ${c.sqlType}`];
        if (c.primary) parts.push('PK');
        else if (c.notNull) parts.push('NOT NULL');
        if (c.hasDefault) parts.push('DEFAULT');
        lines.push(parts.join(' '));
    }
    for (const pk of t.primaryKeys) {
        lines.push(`  PRIMARY KEY (${pk.columns.join(', ')})`);
    }
    for (const u of t.uniqueConstraints) {
        lines.push(`  UNIQUE (${u.columns.join(', ')})`);
    }
    for (const fk of t.foreignKeys) {
        let line = `  FK (${fk.columns.join(', ')}) → ${fk.foreignTable}(${fk.foreignColumns.join(', ')})`;
        if (fk.onDelete) line += ` ON DELETE ${fk.onDelete}`;
        if (fk.onUpdate) line += ` ON UPDATE ${fk.onUpdate}`;
        lines.push(line);
    }
    return lines.join('\n');
}

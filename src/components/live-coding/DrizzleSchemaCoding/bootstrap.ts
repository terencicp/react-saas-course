// Per-card bootstrap. Mounts CodeMirror (TS), drives the Check button into the
// schema runner, and renders the criteria checklist (table/column/constraint
// requirements + probe outcomes) + a compact introspection summary of what
// the student's schema actually produced. Mirrors DrizzleCoding's bootstrap
// shape; the divergence is grader-side: shape-based against requirements
// rather than row-match against expected rows.

import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { EditorState } from '@codemirror/state';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { oneDark } from '@codemirror/theme-one-dark';

import { DrizzleSchemaRunner, type RunOutcome, type ProbeSpec } from './schema-runtime';
import {
  evaluateRequirements,
  evaluateProbes,
  type TableRequirement,
  type Criterion,
  type IntrospectedTable,
} from './requirement-check';
import { streamPrompt, OllamaError, pingOllama } from '../../../lib/ollama';

const ollamaReady = pingOllama();

document.querySelectorAll<HTMLElement>('.dsc-card').forEach((card) => {
  const editorEl = card.querySelector<HTMLElement>('.dsc-editor')!;
  const runBtn = card.querySelector<HTMLButtonElement>('.dsc-run')!;
  const resetBtn = card.querySelector<HTMLButtonElement>('.dsc-reset')!;
  const statusEl = card.querySelector<HTMLElement>('.dsc-status')!;
  const criteriaEl = card.querySelector<HTMLElement>('.dsc-criteria');
  const introspectionEl = card.querySelector<HTMLElement>('.dsc-introspection')!;
  const introspectionBody = card.querySelector<HTMLElement>('.dsc-introspection-body')!;
  const errorEl = card.querySelector<HTMLElement>('.dsc-error')!;
  const feedbackBtn = card.querySelector<HTMLButtonElement>('.dsc-feedback-btn');
  const feedbackEl = card.querySelector<HTMLElement>('.dsc-feedback');
  const feedbackStream = card.querySelector<HTMLElement>('.dsc-feedback-stream');
  const instructionsEl = card.querySelector<HTMLElement>('.dsc-instructions');
  const instructions = instructionsEl?.textContent?.trim() ?? '';

  const starter = editorEl.dataset.starter ?? '';
  const requirementsRaw = card.dataset.requirements ?? '';
  const probesRaw = card.dataset.probes ?? '';
  const seedSQL = card.dataset.seed ?? '';
  const requirements: TableRequirement[] = requirementsRaw ? JSON.parse(requirementsRaw) : [];
  const probes: ProbeSpec[] = probesRaw ? JSON.parse(probesRaw) : [];

  const runner = new DrizzleSchemaRunner({ seedSQL, probes });
  let latestOutcome: RunOutcome | null = null;
  let latestCriteria: Criterion[] = [];

  const view = new EditorView({
    state: EditorState.create({
      doc: starter,
      extensions: [
        lineNumbers(),
        history(),
        bracketMatching(),
        indentOnInput(),
        javascript({ typescript: true }),
        oneDark,
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        EditorView.updateListener.of((u) => {
          if (u.docChanged && feedbackBtn) updateFeedbackEnabled();
        }),
      ],
    }),
    parent: editorEl,
  });

  resetBtn.addEventListener('click', () => {
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: starter } });
    clearOutput();
    if (feedbackEl) feedbackEl.hidden = true;
    if (feedbackStream) feedbackStream.textContent = '';
  });

  runBtn.addEventListener('click', async () => {
    runBtn.disabled = true;
    statusEl.dataset.state = 'running';
    statusEl.textContent = 'Checking…';
    clearOutput();

    const outcome = await runner.run(view.state.doc.toString());
    latestOutcome = outcome;

    if (outcome.ok) {
      const requirementCriteria = evaluateRequirements(requirements, outcome.introspected);
      const probeCriteria = evaluateProbes(outcome.probes);
      latestCriteria = [...requirementCriteria, ...probeCriteria];
      renderCriteria(latestCriteria);
      renderIntrospection(outcome.introspected);
      if (outcome.ddlError) {
        // DDL didn't apply — probably an FK that doesn't resolve. Show it in
        // the error panel; the criteria above will already point at the gap.
        errorEl.hidden = false;
        errorEl.textContent = `Schema applied with an error:\n${outcome.ddlError}`;
      }
      statusEl.dataset.state = '';
      statusEl.textContent = `${outcome.durationMs.toFixed(0)}ms`;
    } else {
      latestCriteria = [];
      renderError(outcome.error);
      statusEl.dataset.state = 'error';
      statusEl.textContent = outcome.timedOut ? 'Timed out' : 'Error';
    }

    runBtn.disabled = false;
  });

  function clearOutput() {
    introspectionBody.innerHTML = '';
    introspectionEl.hidden = true;
    errorEl.hidden = true;
    errorEl.textContent = '';
    if (criteriaEl) {
      criteriaEl.hidden = true;
      criteriaEl.innerHTML = '';
    }
  }

  function renderCriteria(criteria: Criterion[]) {
    if (!criteriaEl || criteria.length === 0) return;
    criteriaEl.hidden = false;
    criteriaEl.innerHTML = '';
    for (const c of criteria) {
      const li = document.createElement('li');
      li.className = 'dsc-criterion';
      li.dataset.met = c.met ? 'true' : 'false';

      const icon = document.createElement('span');
      icon.className = 'dsc-criterion-icon';
      icon.setAttribute('aria-hidden', 'true');

      const text = document.createElement('span');
      text.className = 'dsc-criterion-text';
      // Label may contain inline backticks for code formatting.
      text.innerHTML = formatLabel(c.label);
      if (!c.met && c.reason) {
        const reason = document.createElement('span');
        reason.className = 'dsc-criterion-reason';
        reason.textContent = c.reason;
        text.appendChild(reason);
      }

      li.appendChild(icon);
      li.appendChild(text);
      criteriaEl.appendChild(li);
    }
  }

  function renderIntrospection(tables: IntrospectedTable[]) {
    introspectionEl.hidden = false;
    introspectionBody.innerHTML = '';

    if (tables.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'dsc-introspection-empty';
      empty.textContent = 'No top-level pgTable(...) declarations were found.';
      introspectionBody.appendChild(empty);
      return;
    }

    for (const t of tables) {
      const block = document.createElement('div');
      block.className = 'dsc-introspection-table';
      const pre = document.createElement('pre');
      pre.textContent = formatIntrospection(t);
      block.appendChild(pre);
      introspectionBody.appendChild(block);
    }
  }

  function renderError(message: string) {
    errorEl.hidden = false;
    errorEl.textContent = message;
  }

  // Feedback wiring — same shape as DrizzleCoding. Gated on Ollama reachable
  // AND the student having edited the starter.
  let ollamaOk = false;
  let streaming = false;
  function updateFeedbackEnabled(): void {
    if (!feedbackBtn || streaming) return;
    const codeChanged = view.state.doc.toString() !== starter;
    feedbackBtn.disabled = !(ollamaOk && codeChanged);
    feedbackBtn.title = !ollamaOk
      ? 'AI tutor unavailable — Ollama is not reachable.'
      : !codeChanged
        ? 'Edit the schema first, then ask for feedback.'
        : '';
  }
  if (feedbackBtn) {
    feedbackBtn.disabled = true;
    ollamaReady.then((ok) => {
      ollamaOk = ok;
      updateFeedbackEnabled();
    });
  }

  function diagnoseSchema(): string {
    if (!latestOutcome) return 'NOT_RUN: the student has not checked the schema yet';
    if (!latestOutcome.ok) return `FAIL: ${latestOutcome.error}`;
    if (latestCriteria.length === 0) return 'NO_CRITERIA: sandbox card';

    const failing = latestCriteria.filter((c) => !c.met);
    if (failing.length === 0) {
      return 'PASS: every requirement and probe is satisfied';
    }
    const summary = failing
      .map((c) => `- ${stripCode(c.label)}${c.reason ? ` — ${c.reason}` : ''}`)
      .join('\n');
    return `FAIL:\n${summary}`;
  }

  function buildFeedbackPrompt(): string {
    const diagnosis = diagnoseSchema();
    return (
      `You are an AI tutor helping a student design a Drizzle (TypeScript ORM) ` +
      `Postgres schema. The grader has produced a DIAGNOSIS you MUST treat as ` +
      `ground truth — do not re-derive pass/fail by inspecting the schema yourself.\n\n` +
      (instructions ? `INSTRUCTIONS:\n${instructions}\n\n` : '') +
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
  }

  if (feedbackBtn && feedbackEl && feedbackStream) {
    feedbackBtn.addEventListener('click', async () => {
      streaming = true;
      feedbackBtn.disabled = true;
      feedbackEl.hidden = false;
      card.dataset.feedbackState = 'pending';
      feedbackStream.textContent = '';
      try {
        for await (const chunk of streamPrompt(buildFeedbackPrompt(), { temperature: 0.3 })) {
          feedbackStream.textContent = (feedbackStream.textContent ?? '') + chunk;
        }
      } catch (err) {
        feedbackStream.textContent =
          err instanceof OllamaError
            ? err.message
            : 'Could not reach the AI tutor. Please try again.';
        ollamaOk = false;
      } finally {
        delete card.dataset.feedbackState;
        streaming = false;
        updateFeedbackEnabled();
      }
    });
  }
});

// Inline-code-aware label rendering: `foo` → <code>foo</code>. The label
// strings come from requirement-check.ts (host-controlled, no user input),
// so a small string-replacement pass is safe — no XSS path here.
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

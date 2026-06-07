// @ts-check
import { parseExpressionAt } from 'acorn';

/**
 * Recma plugin: restore the verbatim indentation of multi-line template
 * literals.
 *
 * While parsing, MDX dedents multi-line JSX attribute expressions, so a
 * `code={`...`}` attribute loses its nested indentation before Expressive Code
 * (or any other consumer) ever sees the string — the first level of indent
 * collapses flush-left. The dedent corrupts each template element's
 * `value.raw` / `value.cooked`, but the estree nodes keep accurate offsets
 * into the original source.
 *
 * For every template literal we re-parse the exact characters the author wrote,
 * straight from the source file at the node's own start offset, and copy the
 * untouched quasi values back. Only the literal text is restored; the
 * `${ ... }` expressions stay as whatever earlier plugins produced.
 */
export default function recmaPreserveCodeIndent() {
  return (tree, file) => {
    const source = String(file.value);

    walk(tree, (node) => {
      if (node.type !== 'TemplateLiteral') return;

      const start = typeof node.start === 'number' ? node.start : node.range?.[0];
      if (typeof start !== 'number') return;

      // Only touch literals whose start offset genuinely points at a backtick
      // in the source. Synthesized template literals (e.g. the HTML blobs
      // `mdx({ optimize: true })` produces) either lack a numeric offset or
      // point at unrelated source, so this skips them.
      if (source[start] !== '`') return;

      let original;
      try {
        original = parseExpressionAt(source, start, {
          ecmaVersion: 'latest',
          // Code samples never contain JSX inside a template literal; if one
          // somehow fails to parse, leave the node untouched rather than throw.
        });
      } catch {
        return;
      }

      if (
        !original ||
        original.type !== 'TemplateLiteral' ||
        original.quasis.length !== node.quasis.length
      ) {
        return;
      }

      original.quasis.forEach((quasi, index) => {
        node.quasis[index].value = {
          raw: quasi.value.raw,
          cooked: quasi.value.cooked,
        };
      });
    });
  };
}

/**
 * Minimal estree walker — visits every node with a `type`, depth-first.
 * Avoids a runtime dependency on estree-util-visit so the plugin only needs
 * `acorn`.
 *
 * @param {unknown} node
 * @param {(node: any) => void} visit
 */
function walk(node, visit) {
  if (!node || typeof node !== 'object') return;

  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit);
    return;
  }

  if (typeof (/** @type {any} */ (node).type) === 'string') visit(node);

  for (const key in node) {
    if (key === 'loc' || key === 'range' || key === 'position') continue;
    walk(/** @type {any} */ (node)[key], visit);
  }
}

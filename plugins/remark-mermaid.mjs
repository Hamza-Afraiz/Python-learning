// @ts-check
import { visit } from 'unist-util-visit';

/**
 * Remark plugin: turn ```mermaid fenced code blocks into a
 * <pre class="mermaid"> element so Mermaid.js can render them
 * client-side (and Expressive Code leaves them alone).
 */
export function remarkMermaid() {
  return (tree) => {
    visit(tree, 'code', (node, index, parent) => {
      if (!parent || index === null) return;
      if (node.lang !== 'mermaid') return;

      const escaped = String(node.value)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      parent.children[index] = {
        type: 'html',
        value: `<pre class="mermaid not-content">${escaped}</pre>`,
      };
    });
  };
}

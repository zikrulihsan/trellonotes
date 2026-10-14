/**
 * The selected part of a document as Markdown, so AI edits keep its lists, checklists and
 * inline formatting. Works on the editor's JSON, so it needs no browser.
 */
export interface DocNode {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  content?: DocNode[];
}

const WRAP: Record<string, [string, string]> = {
  bold: ['**', '**'],
  italic: ['*', '*'],
  strike: ['~~', '~~'],
  code: ['`', '`'],
  highlight: ['==', '=='],
};

function inline(nodes: DocNode[] = []): string {
  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') return '\n';
      let text = node.text ?? '';
      for (const mark of node.marks ?? []) {
        const wrap = WRAP[mark.type];
        if (wrap) text = `${wrap[0]}${text}${wrap[1]}`;
        else if (mark.type === 'link' && typeof mark.attrs?.href === 'string')
          text = `[${text}](${mark.attrs.href})`;
      }
      return text;
    })
    .join('');
}

function blocks(nodes: DocNode[] = [], indent = ''): string[] {
  return nodes.flatMap((node): string[] => {
    switch (node.type) {
      case 'paragraph':
        return [indent + inline(node.content)];
      case 'heading':
        return [`${indent}${'#'.repeat(Number(node.attrs?.level) || 1)} ${inline(node.content)}`];
      case 'blockquote':
        return blocks(node.content).map((line) => `${indent}> ${line}`);
      case 'codeBlock':
        return [`${indent}\`\`\`\n${inline(node.content)}\n${indent}\`\`\``];
      case 'bulletList':
      case 'orderedList':
      case 'taskList':
        return [
          (node.content ?? [])
            .map((item, index) => {
              const marker =
                node.type === 'orderedList'
                  ? `${index + 1}.`
                  : node.type === 'taskList'
                    ? `- [${item.attrs?.checked ? 'x' : ' '}]`
                    : '-';
              const [first = '', ...rest] = blocks(item.content, `${indent}  `);
              return [`${indent}${marker} ${first.trimStart()}`, ...rest].join('\n');
            })
            .join('\n'),
        ];
      default:
        return node.content ? blocks(node.content, indent) : [indent + inline([node])];
    }
  });
}

/** Markdown for a run of blocks, such as a selection's slice of the document. */
export function blocksToMarkdown(nodes: DocNode[]): string {
  return blocks(nodes)
    .filter((block) => block.trim())
    .join('\n\n');
}

/** Markdown for text inside one paragraph or heading. */
export const inlineToMarkdown = (nodes: DocNode[]) => inline(nodes);

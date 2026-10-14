import { describe, expect, it } from 'vitest';
import { blocksToMarkdown, inlineToMarkdown, type DocNode } from './selection-markdown';

const text = (value: string, ...marks: string[]): DocNode => ({
  type: 'text',
  text: value,
  marks: marks.map((type) => ({ type })),
});

describe('selection as Markdown', () => {
  it('keeps inline formatting and links', () => {
    expect(
      inlineToMarkdown([
        text('Fixed the '),
        text('slow', 'bold'),
        text(' query, see '),
        { type: 'text', text: 'PR', marks: [{ type: 'link', attrs: { href: 'https://x.test' } }] },
      ]),
    ).toBe('Fixed the **slow** query, see [PR](https://x.test)');
  });

  it('keeps headings, lists and checklists as blocks', () => {
    expect(
      blocksToMarkdown([
        { type: 'heading', attrs: { level: 2 }, content: [text('Plan')] },
        {
          type: 'taskList',
          content: [
            {
              type: 'taskItem',
              attrs: { checked: true },
              content: [{ type: 'paragraph', content: [text('Map the flow')] }],
            },
            {
              type: 'taskItem',
              attrs: { checked: false },
              content: [{ type: 'paragraph', content: [text('Roll out')] }],
            },
          ],
        },
        {
          type: 'orderedList',
          content: [
            { type: 'listItem', content: [{ type: 'paragraph', content: [text('One')] }] },
            { type: 'listItem', content: [{ type: 'paragraph', content: [text('Two')] }] },
          ],
        },
      ]),
    ).toBe('## Plan\n\n- [x] Map the flow\n- [ ] Roll out\n\n1. One\n2. Two');
  });
});

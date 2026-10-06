import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { Editor } from '@tiptap/react';
import { findSlashQuery, matchSlashCommands, type SlashCommand } from '../slash-commands';

type SlashQuery = NonNullable<ReturnType<typeof findSlashQuery>>;

/**
 * The menu that opens when "/" is typed. The editor forwards key presses through
 * `keysRef` so arrows, Enter and Escape drive the menu while it is open.
 */
export function SlashMenu({
  editor,
  keysRef,
}: {
  editor: Editor | null;
  keysRef: RefObject<(event: KeyboardEvent) => boolean>;
}) {
  const [query, setQuery] = useState<SlashQuery | null>(null);
  const [active, setActive] = useState({ query: '', index: 0 });
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const list = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!editor) return;
    const update = () => setQuery(findSlashQuery(editor));
    editor.on('transaction', update);
    return () => {
      editor.off('transaction', update);
    };
  }, [editor]);
  const open = query && query.from !== dismissedAt ? query : null;
  const items = open ? matchSlashCommands(open.query) : [];
  const index = active.query === open?.query ? Math.min(active.index, items.length - 1) : 0;
  const run = (command: SlashCommand) => {
    if (editor && open) command.run(editor, { from: open.from, to: open.to }, new Date());
  };
  useLayoutEffect(() => {
    keysRef.current = (event) => {
      if (!open || !items.length) return false;
      const move = (step: number) =>
        setActive({ query: open.query, index: (index + step + items.length) % items.length });
      switch (event.key) {
        case 'ArrowDown':
          move(1);
          return true;
        case 'ArrowUp':
          move(-1);
          return true;
        case 'Enter':
        case 'Tab':
          run(items[index]);
          return true;
        case 'Escape':
          setDismissedAt(open.from);
          return true;
        default:
          return false;
      }
    };
  });
  useEffect(() => {
    // The menu scrolls once it has more commands than fit, so keep the choice in sight.
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index, open?.query]);
  if (!editor || !open || !items.length) return null;
  const coords = editor.view.coordsAtPos(open.from);
  const above = coords.bottom + 320 > window.innerHeight;
  const now = new Date();
  return (
    <div
      ref={list}
      className={`slash-menu ${above ? 'is-above' : ''}`}
      role="listbox"
      aria-label="Insert"
      style={{ left: coords.left, top: above ? coords.top - 6 : coords.bottom + 6 }}
    >
      {items.map((command, i) => (
        <button
          key={command.id}
          type="button"
          role="option"
          aria-selected={i === index}
          className="slash-item"
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => setActive({ query: open.query, index: i })}
          onClick={() => run(command)}
        >
          <span className="slash-title">
            {command.title}
            <kbd>/{command.id}</kbd>
          </span>
          <span className="slash-preview">{command.preview(now)}</span>
        </button>
      ))}
    </div>
  );
}

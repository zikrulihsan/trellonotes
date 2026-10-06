/**
 * Turns pasted plain text (Markdown, or notes copied from a terminal) into editor HTML.
 *
 * It is deliberately forgiving: besides Markdown headings, lists, quotes, links and
 * fenced code, it keeps box-drawing and pipe tables aligned in a code block, and spots
 * shell commands (`kubectl …`, `curl …`, a `for` loop) that were pasted without fences.
 */

type Inline = string;
interface Para {
  kind: 'p';
  lines: Inline[];
}
interface Code {
  kind: 'code';
  lines: string[];
  lang: string;
}
interface Heading {
  kind: 'h';
  level: number;
  text: Inline;
}
interface Rule {
  kind: 'hr';
}
interface Quote {
  kind: 'quote';
  lines: Inline[];
}
interface Item {
  checked: boolean | null;
  children: Block[];
}
interface List {
  kind: 'list';
  type: 'ol' | 'ul' | 'task';
  start: number;
  indent: number;
  /** A bullet list written right under a numbered item at the same indent. */
  tucked: boolean;
  items: Item[];
}
type Block = Para | Code | Heading | Rule | Quote | List;

const COMMANDS = new Set(
  (
    'kubectl helm curl wget git gh npm npx pnpm yarn bun node deno python python3 pip pip3 ' +
    'uv go cargo rustc make docker podman terraform gcloud gsutil aws az supabase psql ' +
    'mysql redis-cli ssh scp rsync cd ls cat echo grep rg sed awk find xargs export unset ' +
    'source sudo chmod chown mkdir rm cp mv touch tail head less jq yq tar unzip brew ' +
    'apt apt-get yum dnf systemctl journalctl kill ps env bash sh zsh do done then fi ' +
    'else elif esac'
  ).split(' '),
);

const BOX = /[─-╿]/;
const FENCE = /^(\s*)(`{3,}|~{3,})\s*([\w+-]*)/;
const LIST_ITEM = /^(\s*)([-*+]|(\d{1,9})[.)])\s+(?:\[([ xX])\]\s+)?(.*)$/;

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const indentOf = (line: string) => line.match(/^\s*/)![0].replace(/\t/g, '    ').length;
const isBlank = (line: string) => !line.trim();

/** A line drawn with box characters (┌─┬─┐, │ … │) or a Markdown pipe table row. */
const isTableLine = (line: string) => {
  const text = line.trim();
  if (!text) return false;
  if (/^[┌├└│╭╰╔╠╚║┬┴┼]/.test(text) || (text.match(new RegExp(BOX, 'g')) || []).length >= 3)
    return BOX.test(text);
  return /^\|.*\|$/.test(text);
};

/** The start of a shell command: `$ …`, a known command, or a loop or condition. */
export function isCommandLine(line: string): boolean {
  const text = line.trim();
  if (/^\$\s+\S/.test(text)) return true;
  if (/^(for\s+\w+\s+in\b|while\s|if\s+\[|until\s)/.test(text)) return true;
  if (/^(\.{1,2}\/|~\/)\S/.test(text)) return true;
  const word = /^([a-z][\w.-]*)(\s|$)/.exec(text)?.[1];
  if (!word || !COMMANDS.has(word)) return false;
  // "do", "done" and friends are only commands on their own or followed by a command.
  if (['do', 'then', 'else'].includes(word)) return text === word || text.endsWith(';');
  return true;
}

/** Whether a shell snippet stops in the middle of something, such as an open quote. */
function isUnfinished(code: string): boolean {
  let quote: string | null = null,
    depth = 0;
  for (let i = 0; i < code.length; i++) {
    const c = code[i];
    if (quote) {
      if (c === '\\' && quote === '"') i++;
      else if (c === quote) quote = null;
    } else if (c === '"' || c === "'") quote = c;
    else if (c === '#' && (i === 0 || /\s/.test(code[i - 1]))) {
      // A comment runs to the end of its line.
      const end = code.indexOf('\n', i);
      if (end < 0) break;
      i = end;
    } else if (c === '(' || c === '{') depth++;
    else if ((c === ')' || c === '}') && depth > 0) depth--;
  }
  if (quote || depth > 0) return true;
  const last = code.trimEnd().split('\n').pop()!.trim();
  if (/(\\|\||&&|\bdo|\bthen|\{)$/.test(last)) return true;
  // A command whose argument wrapped onto the next line, e.g. "… | grep".
  const lastWord = last.split(/\s+/).pop()!;
  return ['grep', 'rg', 'cat', 'cd', 'echo', 'jq', 'awk', 'sed'].includes(lastWord);
}

/** Removes the indentation every line shares, and the one a terminal adds after line 1. */
function dedent(lines: string[]): string[] {
  const indents = (from: number) =>
    lines
      .slice(from)
      .filter((line) => !isBlank(line))
      .map(indentOf);
  const strip = (line: string, n: number) => {
    let i = 0,
      width = 0;
    while (i < line.length && width < n && /\s/.test(line[i])) {
      width += line[i] === '\t' ? 4 : 1;
      i++;
    }
    return line.slice(i);
  };
  const all = Math.min(...indents(0));
  if (all > 0 && all < Infinity) lines = lines.map((line) => strip(line, all));
  // Copying from a terminal often drops the first line's indentation only.
  const rest = Math.min(...indents(1));
  const first = lines.find((line) => !isBlank(line)) ?? '';
  if (rest > 0 && rest < Infinity && (LIST_ITEM.test(first) || /^#{1,6}\s/.test(first)))
    lines = lines.map((line, i) => (i === 0 ? line : strip(line, rest)));
  return lines;
}

function dedentCode(lines: string[]): string[] {
  const min = Math.min(...lines.filter((line) => !isBlank(line)).map(indentOf));
  return min > 0 && min < Infinity ? lines.map((line) => line.slice(min)) : lines;
}

export function parseMarkdown(text: string): Block[] {
  const lines = dedent(text.replace(/\r\n?/g, '\n').replace(/\n+$/, '').split('\n'));
  const root: Block[] = [];
  const lists: List[] = [];
  let para: Para | null = null,
    afterBlank = false;

  const container = () => {
    const list = lists[lists.length - 1];
    return list ? list.items[list.items.length - 1].children : root;
  };
  const closeLists = () => {
    lists.length = 0;
  };
  /** Code and tables join the list item above them unless a blank line came first. */
  const placeBlock = (block: Block, indent: number) => {
    const list = lists[lists.length - 1];
    if (!list || (afterBlank && indent <= list.indent)) closeLists();
    container().push(block);
    para = null;
  };

  for (let i = 0; i < lines.length;) {
    const line = lines[i],
      text = line.trim(),
      indent = indentOf(line);

    if (!text) {
      para = null;
      afterBlank = true;
      i++;
      continue;
    }

    const fence = FENCE.exec(line);
    if (fence) {
      const close = new RegExp(`^\\s*${fence[2][0]}{${fence[2].length},}\\s*$`);
      const body: string[] = [];
      i++;
      while (i < lines.length && !close.test(lines[i])) body.push(lines[i++]);
      i++;
      placeBlock({ kind: 'code', lines: dedentCode(body), lang: fence[3] }, indent);
      afterBlank = false;
      continue;
    }

    if (isTableLine(line)) {
      const body: string[] = [];
      while (i < lines.length && isTableLine(lines[i])) body.push(lines[i++]);
      placeBlock({ kind: 'code', lines: dedentCode(body), lang: 'table' }, indent);
      afterBlank = false;
      continue;
    }

    if (isCommandLine(line)) {
      const body = [lines[i++]];
      while (i < lines.length && !isBlank(lines[i])) {
        const next = lines[i];
        const fits =
          isCommandLine(next) ||
          /^\s*#/.test(next) ||
          // Indented lines carry on the command, unless they read as a sentence.
          (indentOf(next) > indent && !/^[A-Z][a-z]*[\s,]/.test(next.trim())) ||
          isUnfinished(body.join('\n'));
        if (!fits) break;
        body.push(lines[i++]);
      }
      placeBlock({ kind: 'code', lines: dedentCode(body), lang: 'shell' }, indent);
      afterBlank = false;
      continue;
    }

    const heading = /^(#{1,6})\s+(.*)$/.exec(text);
    if (heading) {
      closeLists();
      root.push({ kind: 'h', level: heading[1].length, text: heading[2].replace(/\s+#+$/, '') });
      para = null;
      afterBlank = false;
      i++;
      continue;
    }

    if (/^([-*_])(\s*\1){2,}$/.test(text)) {
      closeLists();
      root.push({ kind: 'hr' });
      para = null;
      afterBlank = false;
      i++;
      continue;
    }

    const item = LIST_ITEM.exec(line);
    if (item) {
      const type: List['type'] = item[4] !== undefined ? 'task' : item[3] ? 'ol' : 'ul';
      const top = () => lists[lists.length - 1];
      while (
        top() &&
        (top().indent > indent || (top().tucked && top().indent === indent && top().type !== type))
      )
        lists.pop();
      let list: List | undefined = top();
      if (list && list.indent === indent && list.type !== type) {
        if (list.type === 'ol' && type !== 'ol' && !afterBlank) {
          // "3. Do this:" followed directly by "- step" reads as steps under item 3.
          const tucked: List = { kind: 'list', type, start: 1, indent, tucked: true, items: [] };
          container().push(tucked);
          lists.push(tucked);
          list = tucked;
        } else {
          lists.pop();
          list = undefined;
        }
      }
      if (!list || list.indent < indent) {
        const fresh: List = {
          kind: 'list',
          type,
          start: item[3] ? Number(item[3]) : 1,
          indent,
          tucked: false,
          items: [],
        };
        container().push(fresh);
        lists.push(fresh);
        list = fresh;
      }
      para = { kind: 'p', lines: item[5] ? [item[5]] : [] };
      list.items.push({
        checked: item[4] === undefined ? null : item[4].toLowerCase() === 'x',
        children: [para],
      });
      afterBlank = false;
      i++;
      continue;
    }

    if (text.startsWith('>')) {
      closeLists();
      const quote: Quote = { kind: 'quote', lines: [] };
      while (i < lines.length && lines[i].trim().startsWith('>'))
        quote.lines.push(lines[i++].trim().replace(/^>\s?/, ''));
      root.push(quote);
      para = null;
      afterBlank = false;
      continue;
    }

    // Plain text: a line right below another continues it, keeping the line break.
    const list = lists[lists.length - 1];
    if (para && !afterBlank) para.lines.push(text);
    else if (list && indent > list.indent) container().push((para = { kind: 'p', lines: [text] }));
    else {
      closeLists();
      root.push((para = { kind: 'p', lines: [text] }));
    }
    afterBlank = false;
    i++;
  }
  return root;
}

/** Bold, italics, strikethrough, `code`, [links](…) and bare web addresses. */
export function renderInline(text: string): string {
  const pattern =
    /(`+)([^`]|[^`][\s\S]*?[^`])\1|\[([^\]]+)\]\(((?:https?:\/\/|mailto:)[^\s)]+)\)|(https?:\/\/[^\s<>"]+)|\*\*(?=\S)(.+?)(?<=\S)\*\*|~~(?=\S)(.+?)(?<=\S)~~|(?<![\w*])\*(?=[^\s*])([^*]+?)(?<=\S)\*(?![\w*])/g;
  let html = '',
    last = 0;
  for (const match of text.matchAll(pattern)) {
    const [whole, , code, label, href, bare, bold, strike, italic] = match;
    let out: string;
    let consumed = whole;
    if (code !== undefined) out = `<code>${escapeHtml(code)}</code>`;
    else if (label !== undefined) out = `<a href="${escapeHtml(href)}">${renderInline(label)}</a>`;
    else if (bare !== undefined) {
      // Leave trailing punctuation, and an unmatched ")", outside the link.
      let url = bare.replace(/[.,;:!?'"]+$/, '');
      while (url.endsWith(')') && url.split('(').length < url.split(')').length)
        url = url.slice(0, -1);
      consumed = url;
      out = `<a href="${escapeHtml(url)}">${escapeHtml(url)}</a>`;
    } else if (bold !== undefined) out = `<strong>${renderInline(bold)}</strong>`;
    else if (strike !== undefined) out = `<s>${renderInline(strike)}</s>`;
    else out = `<em>${renderInline(italic)}</em>`;
    html += escapeHtml(text.slice(last, match.index)) + out;
    last = match.index + consumed.length;
    // A shortened bare link leaves its tail for the next search.
    if (consumed !== whole) pattern.lastIndex = last;
  }
  return html + escapeHtml(text.slice(last));
}

/**
 * Keeps short lines on their own line, but rejoins long ones: those were wrapped by the
 * terminal they were copied from, not broken on purpose.
 */
function joinLines(lines: string[]): string {
  return lines
    .map(
      (line, i) =>
        (i === 0 ? '' : lines[i - 1].length >= WRAP_WIDTH ? ' ' : '<br>') + renderInline(line),
    )
    .join('');
}
const WRAP_WIDTH = 60;

function renderBlocks(blocks: Block[]): string {
  return blocks
    .map((block) => {
      switch (block.kind) {
        case 'p':
          return `<p>${joinLines(block.lines)}</p>`;
        case 'h':
          return `<h${block.level}>${renderInline(block.text)}</h${block.level}>`;
        case 'hr':
          return '<hr>';
        case 'quote':
          return `<blockquote><p>${block.lines.map(renderInline).join('<br>')}</p></blockquote>`;
        case 'code': {
          const lang = block.lang ? ` class="language-${escapeHtml(block.lang)}"` : '';
          return `<pre><code${lang}>${escapeHtml(block.lines.join('\n'))}</code></pre>`;
        }
        case 'list': {
          if (block.type === 'task')
            return `<ul data-type="taskList">${block.items
              .map(
                (item) =>
                  `<li data-type="taskItem" data-checked="${item.checked}">${renderBlocks(item.children)}</li>`,
              )
              .join('')}</ul>`;
          const tag = block.type;
          const start = tag === 'ol' && block.start !== 1 ? ` start="${block.start}"` : '';
          return `<${tag}${start}>${block.items
            .map((item) => `<li>${renderBlocks(item.children)}</li>`)
            .join('')}</${tag}>`;
        }
      }
    })
    .join('');
}

export const markdownToHtml = (text: string) => renderBlocks(parseMarkdown(text));

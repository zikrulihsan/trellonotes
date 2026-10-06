import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';
import { createLowlight } from 'lowlight';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import diff from 'highlight.js/lib/languages/diff';
import dockerfile from 'highlight.js/lib/languages/dockerfile';
import go from 'highlight.js/lib/languages/go';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import markdown from 'highlight.js/lib/languages/markdown';
import php from 'highlight.js/lib/languages/php';
import plaintext from 'highlight.js/lib/languages/plaintext';
import python from 'highlight.js/lib/languages/python';
import sql from 'highlight.js/lib/languages/sql';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import yaml from 'highlight.js/lib/languages/yaml';

/**
 * A handful of everyday languages keeps the bundle small. A block without a language
 * is coloured by whichever of these it looks like.
 */
export const lowlight = createLowlight({
  bash,
  css,
  diff,
  dockerfile,
  go,
  javascript,
  json,
  markdown,
  php,
  plaintext,
  python,
  sql,
  typescript,
  xml,
  yaml,
});
lowlight.registerAlias({
  bash: ['shell', 'sh', 'zsh', 'console', 'terminal'],
  javascript: ['js', 'jsx'],
  typescript: ['ts', 'tsx'],
  xml: ['html'],
  yaml: ['yml'],
  // Box-drawing tables stay uncoloured, so guessing never paints their borders.
  plaintext: ['text', 'txt', 'table'],
});

/** Code blocks with syntax colours, replacing the plain block from StarterKit. */
export const CodeHighlight = CodeBlockLowlight.configure({ lowlight });

import { afterEach, describe, expect, it } from 'vitest';
import { Editor } from '@tiptap/react';
import { writingExtensions } from './extensions';
import { fitWithin } from './image-upload';
import { displaySrc } from '@/lib/media';
import { matchSlashCommands } from './slash-commands';

let editor: Editor | null = null;
afterEach(() => editor?.destroy());
const load = (html: string) => {
  editor = new Editor({ extensions: writingExtensions(), content: html });
  return editor.getHTML();
};

describe('images in writing', () => {
  it('saves the media key, not a storage URL', () => {
    const html = load('<p>Before</p><img src="media:user-1/abc.webp" alt="Board"><p>After</p>');
    expect(html).toContain('<img src="media:user-1/abc.webp" alt="Board">');
  });

  it('keeps images from the web and drops base64 images', () => {
    expect(load('<img src="https://example.com/a.png">')).toContain(
      'src="https://example.com/a.png"',
    );
    expect(load('<img src="data:image/png;base64,AAAA">')).not.toContain('<img');
  });

  it('shows only web addresses and well-formed media keys', () => {
    expect(displaySrc('https://example.com/a.png')).toBe('https://example.com/a.png');
    expect(displaySrc('javascript:alert(1)')).toBe('');
    expect(displaySrc('media:../secret')).toBe('');
    expect(displaySrc(null)).toBe('');
  });

  it('shrinks large images to 1600px on the long side and leaves small ones alone', () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(1000, 3200)).toEqual({ width: 500, height: 1600 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('finds /image in English and Indonesian', () => {
    expect(matchSlashCommands('image')[0].id).toBe('image');
    expect(matchSlashCommands('gambar')[0].id).toBe('image');
  });
});

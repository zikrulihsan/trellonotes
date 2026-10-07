import Image, { type ImageOptions } from '@tiptap/extension-image';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { Editor } from '@tiptap/react';
import { displaySrc } from '@/lib/media';
import { isAcceptedImage, prepareImage } from './image-upload';

export interface MediaImageOptions {
  /** Saves an image file and resolves with the `src` to keep in the writing. */
  upload: ((file: Blob, extension: string) => Promise<string>) | null;
  /** Told when uploads start and finish, and why one failed. */
  onUploadStatus: (status: { uploading: number; error?: string }) => void;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaImage: {
      /** Opens the file picker and adds the chosen images at the cursor. */
      pickImage: () => ReturnType;
    };
  }
}

/**
 * Images in the writing. The saved HTML keeps the image's `media:` key; only the page
 * on screen loads it from the current store. Paste, drop, or /image to add one.
 */
export const MediaImage = Image.extend<ImageOptions & MediaImageOptions>({
  addOptions() {
    return {
      ...this.parent!(),
      upload: null,
      onUploadStatus: () => {},
    };
  },
  addAttributes() {
    return { src: { default: null }, alt: { default: null }, title: { default: null } };
  },
  addNodeView() {
    return ({ node }) => {
      const img = document.createElement('img');
      const show = (attrs: Record<string, unknown>) => {
        img.src = displaySrc(attrs.src);
        for (const key of ['alt', 'title'] as const) {
          if (typeof attrs[key] === 'string') img.setAttribute(key, attrs[key]);
          else img.removeAttribute(key);
        }
      };
      show(node.attrs);
      img.loading = 'lazy';
      return {
        dom: img,
        update: (next) => {
          if (next.type !== node.type) return false;
          show(next.attrs);
          return true;
        },
      };
    };
  },
  addCommands() {
    return {
      ...this.parent?.(),
      pickImage:
        () =>
        ({ editor }) => {
          if (!this.options.upload || typeof document === 'undefined') return false;
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/png,image/jpeg,image/webp,image/gif';
          input.multiple = true;
          input.onchange = () =>
            addImages(editor, [...(input.files ?? [])], editor.state.selection.from, this.options);
          input.click();
          return true;
        },
    };
  },
  addProseMirrorPlugins() {
    const editor = this.editor;
    const options = this.options;
    const images = (data: DataTransfer | null) =>
      [...(data?.files ?? [])].filter((file) => file.type.startsWith('image/'));
    return [
      new Plugin({
        key: new PluginKey('mediaImageUpload'),
        props: {
          handlePaste: (view, event) => {
            const files = images(event.clipboardData);
            if (!files.length || !options.upload || !view.editable) return false;
            addImages(editor, files, view.state.selection.from, options);
            return true;
          },
          handleDrop: (view, event, _slice, moved) => {
            const files = images(event.dataTransfer);
            if (moved || !files.length || !options.upload || !view.editable) return false;
            const at = view.posAtCoords({ left: event.clientX, top: event.clientY });
            addImages(editor, files, at?.pos ?? view.state.selection.from, options);
            event.preventDefault();
            return true;
          },
        },
      }),
    ];
  },
});

let uploading = 0;

/** Uploads each image in turn and adds it where it was pasted or dropped. */
async function addImages(editor: Editor, files: File[], at: number, options: MediaImageOptions) {
  const { upload, onUploadStatus } = options;
  if (!upload) return;
  let error: string | undefined;
  for (const file of files) {
    if (!isAcceptedImage(file)) {
      error = 'Only PNG, JPEG, WebP and GIF images can be added.';
      continue;
    }
    onUploadStatus({ uploading: ++uploading });
    try {
      const { blob, extension } = await prepareImage(file);
      const src = await upload(blob, extension);
      if (editor.isDestroyed) return;
      const pos = Math.min(at, editor.state.doc.content.size);
      editor.chain().focus().insertContentAt(pos, { type: 'image', attrs: { src } }).run();
      at = editor.state.selection.to;
    } catch (reason) {
      error = reason instanceof Error ? reason.message : 'Could not add the image.';
    } finally {
      onUploadStatus({ uploading: --uploading });
    }
  }
  if (error) onUploadStatus({ uploading, error });
}

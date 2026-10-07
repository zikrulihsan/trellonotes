import { supabaseMediaStore } from '@/lib/supabase/media-store';

/**
 * Where uploaded images live. Writing stores only `media:<key>` and asks the store for
 * a URL when it is shown, so moving to another object store means copying the files
 * and swapping the store here; no saved note changes.
 */
export interface MediaStore {
  /** Saves the file and resolves with its key, e.g. "<user id>/<random>.webp". */
  upload: (file: Blob, extension: string) => Promise<string>;
  /** The URL a browser can load the file from. */
  url: (key: string) => string;
}

export const MEDIA_SCHEME = 'media:';

const store: MediaStore | null = supabaseMediaStore;

export const canUploadMedia = store !== null;

/** Uploads an image and resolves with the `src` to save in the writing. */
export async function uploadMedia(file: Blob, extension: string): Promise<string> {
  if (!store) throw new Error('Images need cloud sync, which is not set up for this app.');
  return MEDIA_SCHEME + (await store.upload(file, extension));
}

/**
 * The URL to show for a saved `src`: media keys go through the store, web addresses
 * pass through, and anything else (such as `javascript:`) shows nothing.
 */
export function displaySrc(src: unknown): string {
  if (typeof src !== 'string') return '';
  if (src.startsWith(MEDIA_SCHEME)) {
    const key = src.slice(MEDIA_SCHEME.length);
    return store && /^[\w-]+\/[\w.-]+$/.test(key) ? store.url(key) : '';
  }
  return /^(https?:|blob:)/i.test(src) ? src : '';
}

const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_INPUT_BYTES = 20 * 1024 * 1024;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Wide enough for a full-width photo on a retina screen. */
const MAX_SIDE = 1600;

export const isAcceptedImage = (file: File) => ACCEPTED.includes(file.type);

/** Shrinks `width` × `height` to fit inside `max` on both sides, keeping its shape. */
export function fitWithin(width: number, height: number, max = MAX_SIDE) {
  const scale = Math.min(1, max / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

/**
 * Makes an image small enough to store: photos and screenshots become WebP no wider
 * than 1600px. GIFs stay as they are so they keep moving.
 */
export async function prepareImage(file: File): Promise<{ blob: Blob; extension: string }> {
  if (!isAcceptedImage(file)) throw new Error('Only PNG, JPEG, WebP and GIF images can be added.');
  if (file.size > MAX_INPUT_BYTES) throw new Error('That image is larger than 20 MB.');
  let result: { blob: Blob; extension: string } = { blob: file, extension: EXTENSIONS[file.type] };
  if (file.type !== 'image/gif') {
    const webp = await toWebp(file).catch(() => null);
    if (webp && (webp.size < file.size || file.size > MAX_UPLOAD_BYTES))
      result = { blob: webp, extension: 'webp' };
  }
  if (result.blob.size > MAX_UPLOAD_BYTES) throw new Error('That image is larger than 5 MB.');
  return result;
}

async function toWebp(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', 0.85),
  );
  // Browsers that cannot write WebP fall back to PNG, which is not smaller.
  return blob?.type === 'image/webp' ? blob : null;
}

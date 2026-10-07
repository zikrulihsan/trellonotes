import type { MediaStore } from '@/lib/media';
import { supabase } from './client';

const BUCKET = 'trellonotes-media';

/** Images in Supabase Storage, one folder per account. */
export const supabaseMediaStore: MediaStore | null = supabase && {
  async upload(file, extension) {
    const { data } = await supabase!.auth.getSession();
    const userId = data.session?.user.id;
    if (!userId) throw new Error('Sign in to add images.');
    const key = `${userId}/${crypto.randomUUID()}.${extension}`;
    const { error } = await supabase!.storage
      .from(BUCKET)
      .upload(key, file, { contentType: file.type, cacheControl: '31536000' });
    if (error) {
      if (/bucket not found/i.test(error.message))
        throw new Error('Images are not set up yet: the storage bucket is missing.');
      throw new Error(error.message || 'Could not upload the image.');
    }
    return key;
  },
  url: (key) => supabase!.storage.from(BUCKET).getPublicUrl(key).data.publicUrl,
};

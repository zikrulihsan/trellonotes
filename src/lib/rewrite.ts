import type { SupabaseClient } from '@supabase/supabase-js';
import { aiHeaders } from '@/lib/gemini-key';
import { REWRITE_MAX_CHARS, type RewriteAction } from '@/lib/rewrite-prompt';

/** Asks Gemini (through the app's edge function) to rewrite a selected passage, as Markdown. */
export async function rewriteText(client: SupabaseClient, action: RewriteAction, text: string) {
  if (!text.trim()) throw new Error('Select some text to edit first.');
  if (text.length > REWRITE_MAX_CHARS)
    throw new Error('That is a lot of text for one edit. Select a shorter passage.');
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in to edit with AI.');
  const response = await fetch('/api/rewrite', {
    method: 'POST',
    headers: aiHeaders(token),
    body: JSON.stringify({ action, text }),
  });
  const result = (await response.json().catch(() => null)) as {
    rewrite?: { markdown?: unknown };
    error?: string;
  } | null;
  const markdown = result?.rewrite?.markdown;
  if (!response.ok || typeof markdown !== 'string' || !markdown.trim())
    throw new Error(result?.error ?? `Gemini could not edit the passage (${response.status}).`);
  return markdown.trim();
}

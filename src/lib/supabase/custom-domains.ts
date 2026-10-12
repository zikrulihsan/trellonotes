import type { SupabaseClient } from '@supabase/supabase-js';

const TABLE = 'trellonotes_custom_domains';

export interface CustomDomain {
  domain: string;
  /** Null while Notis waits for the domain's DNS records. */
  verified_at: string | null;
}

/** What /api/custom-domain answers: the domain, whether it is live, and what is missing. */
export interface DomainStatus {
  domain: string | null;
  live: boolean;
  /** Why it isn't live yet, in words a writer can act on. */
  problem?: string;
  /** The CNAME target for a subdomain, e.g. "notis.netlify.app". */
  target?: string;
}

const missingTable = (code?: string) => code === 'PGRST205' || code === '42P01';

/** Whose public page a domain shows: the account id, or null when no one's domain is live. */
export async function domainOwner(client: SupabaseClient, domain: string): Promise<string | null> {
  const { data, error } = await client
    .from(TABLE)
    .select('user_id')
    .eq('domain', domain)
    .not('verified_at', 'is', null)
    .maybeSingle();
  if (missingTable(error?.code)) return null;
  if (error) throw new Error(error.message);
  return data?.user_id ?? null;
}

/** The signed-in writer's domain, live or waiting; null when they haven't added one. */
export async function getOwnDomain(
  client: SupabaseClient,
  userId: string,
): Promise<CustomDomain | null> {
  const { data, error } = await client
    .from(TABLE)
    .select('domain, verified_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (missingTable(error?.code)) return null;
  if (error) throw new Error(error.message);
  return data;
}

/**
 * Asks the server to connect a domain, check its DNS again, or remove it. Only the server
 * may register domains with Netlify, so writes go through it rather than the table.
 */
export async function changeDomain(
  client: SupabaseClient,
  request: { action: 'connect'; domain: string } | { action: 'check' } | { action: 'remove' },
): Promise<DomainStatus> {
  const { data } = await client.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Sign in to set up your domain.');
  const response = await fetch('/api/custom-domain', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
    body: JSON.stringify(request),
  });
  const result = (await response.json().catch(() => null)) as
    (DomainStatus & { error?: string }) | null;
  if (!response.ok || !result || result.error)
    throw new Error(result?.error ?? `Could not reach Notis (${response.status}). Try again.`);
  return result;
}

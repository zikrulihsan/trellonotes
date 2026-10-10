import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it } from 'vitest';
import { listPublishedPages, newShortCode } from './published-pages';

/** A client whose query records its filters and answers with `respond`. */
function fakeClient(respond: (filters: string[]) => { data: unknown; error: unknown }) {
  const calls: string[][] = [];
  const client = {
    from() {
      const filters: string[] = [];
      calls.push(filters);
      const query = {
        select: () => query,
        eq: (column: string) => (filters.push(column), query),
        order: () => Promise.resolve(respond(filters)),
      };
      return query;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

describe('listPublishedPages', () => {
  it('leaves unlisted pages off the public list', async () => {
    const { client, calls } = fakeClient(() => ({ data: [], error: null }));
    await listPublishedPages(client, 'author');
    expect(calls).toEqual([['user_id', 'unlisted']]);
  });

  it('lists every page on a database that predates unlisted pages', async () => {
    const { client, calls } = fakeClient((filters) =>
      filters.includes('unlisted')
        ? {
            data: null,
            error: {
              code: '42703',
              message: 'column trellonotes_published_pages.unlisted does not exist',
            },
          }
        : { data: [{ id: 'p1' }], error: null },
    );
    expect(await listPublishedPages(client, 'author')).toEqual([{ id: 'p1' }]);
    expect(calls).toEqual([['user_id', 'unlisted'], ['user_id']]);
  });
});

describe('newShortCode', () => {
  it('makes short codes from letters and digits that are hard to mix up', () => {
    const codes = Array.from({ length: 200 }, () => newShortCode());
    for (const code of codes) expect(code).toMatch(/^[a-hj-km-np-z2-9]{7}$/);
    expect(new Set(codes).size).toBe(codes.length);
  });
});

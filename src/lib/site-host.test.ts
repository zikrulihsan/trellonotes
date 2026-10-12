import { afterEach, describe, expect, it } from 'vitest';
import {
  classifyHost,
  domainProblem,
  isApexDomain,
  normalizeDomain,
  setSiteHandle,
} from './site-host';
import { writerPath } from './supabase/published-pages';

describe('which site a hostname is', () => {
  it('treats the app, its old address, previews and local hosts as the app', () => {
    for (const host of [
      'notis.swegrowth.id',
      'notes.swegrowth.id',
      'www.notis.swegrowth.id',
      'deploy-preview-30--notis.netlify.app',
      'localhost',
      '127.0.0.1',
    ])
      expect(classifyHost(host)).toEqual({ kind: 'app' });
  });

  it('reads a handle from a Notis subdomain', () => {
    expect(classifyHost('Zikrul.notis.swegrowth.id')).toEqual({
      kind: 'subdomain',
      handle: 'zikrul',
    });
    expect(classifyHost('a.b.notis.swegrowth.id')).toEqual({ kind: 'app' });
  });

  it('treats any other host as a writer’s own domain', () => {
    expect(classifyHost('zikrul.dev.')).toEqual({ kind: 'custom', domain: 'zikrul.dev' });
  });
});

describe('domains writers type', () => {
  it('cleans up pasted addresses', () => {
    expect(normalizeDomain(' https://Blog.Zikrul.dev/about?x=1 ')).toBe('blog.zikrul.dev');
    expect(normalizeDomain('zikrul.dev:443')).toBe('zikrul.dev');
  });

  it('refuses Notis addresses and things that are not domains', () => {
    expect(domainProblem('zikrul.dev')).toBeNull();
    expect(domainProblem('zikrul')).toMatch(/doesn’t look like a domain/);
    expect(domainProblem('zikrul.notis.swegrowth.id')).toMatch(/belongs to Notis/);
    expect(domainProblem('notis.netlify.app')).toMatch(/belongs to Notis/);
  });

  it('tells root domains from subdomains', () => {
    expect(isApexDomain('zikrul.dev')).toBe(true);
    expect(isApexDomain('zikrul.my.id')).toBe(true);
    expect(isApexDomain('blog.zikrul.dev')).toBe(false);
    expect(isApexDomain('blog.zikrul.co.id')).toBe(false);
  });
});

describe('links on a writer’s own domain', () => {
  afterEach(() => setSiteHandle(null));

  it('drops the /@handle prefix for that writer only', () => {
    const author = { userId: 'u1', handle: 'zikrul' };
    expect(writerPath(author, 'notes')).toBe('/@zikrul/notes');
    setSiteHandle('zikrul');
    expect(writerPath(author, 'notes')).toBe('/notes');
    expect(writerPath(author)).toBe('/');
    expect(writerPath({ userId: 'u2', handle: 'ayu' })).toBe('/@ayu');
  });
});

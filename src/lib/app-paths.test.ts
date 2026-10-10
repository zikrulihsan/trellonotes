import { describe, expect, it } from 'vitest';
import { findByRef, initiativePath, isPublicPath, linkRef } from './app-paths';

const items = [
  { id: '7f1c2a9b-41d2-4c5e-9a0b-1234567890ab', title: 'Q4 onboarding revamp' },
  { id: 'writing-room', title: 'The writing room' },
  { id: 'small', title: 'The beauty of small beginnings' },
  { id: '0b9e1f00-0000-4000-8000-000000000000', title: '' },
];

describe('short app links', () => {
  it('builds readable links from the title and a short id', () => {
    expect(initiativePath(items[0])).toBe('/initiative/q4-onboarding-revamp-7f1c2a9b');
    expect(linkRef(items[3])).toBe('0b9e1f00');
  });

  it('finds items by their short link, older full-id links, and after a rename', () => {
    for (const item of items) expect(findByRef(items, linkRef(item))).toBe(item);
    expect(findByRef(items, items[0].id)).toBe(items[0]);
    expect(findByRef(items, 'writing-room')).toBe(items[1]);
    expect(findByRef(items, 'old-title-7f1c2a9b')).toBe(items[0]);
    expect(findByRef(items, 'nothing-here-deadbeef')).toBeUndefined();
    expect(findByRef(items, 'sm')).toBeUndefined();
  });

  it('recognises public addresses', () => {
    expect(isPublicPath('/@zikrul/catatan-rilis')).toBe(true);
    expect(isPublicPath('/read/7f1c2a9b-41d2-4c5e-9a0b-1234567890ab')).toBe(true);
    expect(isPublicPath('/s/k7m2xq9')).toBe(true);
    expect(isPublicPath('/pages')).toBe(false);
  });
});

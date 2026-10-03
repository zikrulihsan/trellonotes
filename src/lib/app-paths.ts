import { slugify } from './slug';

type Linkable = { id: string; title: string };

const compactId = (id: string) => id.replace(/-/g, '').toLowerCase();

/**
 * A short, readable URL segment: the title plus the first 8 characters of the id,
 * e.g. "q4-onboarding-revamp-7f1c2a9b". Only the id part is used to find the item,
 * so links keep working after the title changes.
 */
export function linkRef({ id, title }: Linkable): string {
  const slug = slugify(title, 40);
  const key = compactId(id).slice(0, 8);
  return slug ? `${slug}-${key}` : key;
}

/** Finds the item a URL segment points to: a full id (older links) or a `linkRef`. */
export function findByRef<T extends { id: string }>(
  items: T[],
  ref: string | undefined,
): T | undefined {
  if (!ref) return undefined;
  const exact = items.find((item) => item.id === ref);
  if (exact) return exact;
  const key = ref.slice(ref.lastIndexOf('-') + 1).toLowerCase();
  return items.find((item) => {
    const id = compactId(item.id);
    return id === key || (key.length >= 8 && id.startsWith(key));
  });
}

export const boardPath = (board: Linkable) => `/board/${linkRef(board)}`;
export const initiativePath = (note: Linkable) => `/initiative/${linkRef(note)}`;
export const pagePath = (page: Linkable) => `/page/${linkRef(page)}`;

/** Public addresses: "/@handle[/slug]", and the older "/read/<account id>[/slug]". */
export function isPublicPath(pathname: string): boolean {
  return pathname.startsWith('/@') || pathname.startsWith('/read/');
}

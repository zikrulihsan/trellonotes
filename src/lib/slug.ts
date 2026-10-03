/** "Catatan Minggu Ini: Rilis 2.0!" → "catatan-minggu-ini-rilis-2-0"; empty when nothing usable is left. */
export function slugify(text: string, maxLength = 60): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '');
}

export function isAllowedLink(value: string): boolean {
  return /^(https?:\/\/|mailto:)/i.test(value.trim());
}

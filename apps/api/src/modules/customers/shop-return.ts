/** Longer than any page of the shop, with its query; a longer one is not a place anyone was going. */
const RETURN_MAX_LENGTH = 300;

/**
 * Where a shopper's e-mailed link brings them back once done (BEELINK-149): a path inside their
 * shop, as the shop's forms send it, else the shop's front. It goes into a link a person clicks, so
 * nothing that could leave the shop does: no other origin (`//`), no backslash a browser reads as a
 * slash, no `..` that climbs out of it, no space or control character.
 */
export function shopReturnOf(slug: string, raw: string | null | undefined): string {
  const home = `/${slug}`;
  if (!raw || raw.length > RETURN_MAX_LENGTH) return home;
  const inside = raw === home || raw.startsWith(`${home}/`) || raw.startsWith(`${home}?`);
  const control = [...raw].some((char) => char.charCodeAt(0) < 0x20 || char.charCodeAt(0) === 0x7f);
  const escapes = control || /\/\/|\\|(?:^|\/)\.\.?(?:\/|\?|$)|\s/.test(raw);
  return inside && !escapes ? raw : home;
}

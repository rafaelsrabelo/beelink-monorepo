/** Longer than any page of the shop, with its query; a longer one is not a place anyone was going. */
const RETURN_MAX_LENGTH = 300;

/** Only to resolve a path the way a browser will: nothing is ever fetched from it. */
const RESOLVER = 'http://shop.invalid';

/**
 * Where a shopper's e-mailed link brings them back once done (BEELINK-149): a path inside their
 * shop, as the shop's forms send it, else the shop's front. It goes into a link a person clicks, so
 * it is resolved the way their browser will resolve it — `%2e%2e`, a backslash, a fragment — and
 * kept only when what comes out is still a page of this shop, written plainly.
 */
export function shopReturnOf(slug: string, raw: string | null | undefined): string {
  const home = `/${slug}`;
  if (!raw || raw.length > RETURN_MAX_LENGTH || !raw.startsWith('/')) return home;

  let url: URL;
  try {
    url = new URL(raw, RESOLVER);
  } catch {
    return home;
  }
  const inside = url.origin === RESOLVER && (url.pathname === home || url.pathname.startsWith(`${home}/`)) && !url.pathname.includes('//');
  return inside ? `${url.pathname}${url.search}` : home;
}

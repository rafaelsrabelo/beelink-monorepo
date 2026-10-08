// Node
import { isIP } from 'node:net';

/** Why what a shopkeeper typed is not a domain a shop can have. Each is a `CUSTOM_DOMAIN_*` code of its own. */
export type CustomDomainRefusal = 'INVALID' | 'IP_ADDRESS' | 'LOCAL' | 'NOT_ASCII' | 'PLATFORM';

export type CustomDomainHostResult = { host: string; refusal?: never } | { refusal: CustomDomainRefusal; host?: never };

/** DNS's own bounds: 253 characters a name, 63 a label. */
export const CUSTOM_DOMAIN_MAX_LENGTH = 253;
const LABEL_MAX_LENGTH = 63;

/** Letters, digits and hyphens, no hyphen at either end. The column's CHECK (`stores_custom_domain_check`) repeats it. */
const LABEL = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

/** No top-level domain is a number, and a browser reads a host ending in one — `1.2.3`, `0x7f.1` — as an IPv4 address. */
const NUMERIC_LABEL = /^(?:\d+|0x[0-9a-f]*)$/;

/** Names that only exist inside a network: nothing on the internet resolves them, and a certificate is never issued for one. */
const LOCAL_SUFFIXES = ['.localhost', '.local', '.internal'];

/**
 * What a shopkeeper pasted, down to the bare host: lower case, no scheme, no path, no port, no
 * trailing dot, no `www.` in front. It mends nothing else — a space or an `@` inside is left for
 * the validation to refuse.
 */
export function bareHostOf(input: string): string {
  let host = input.trim().toLowerCase();
  host = host.replace(/^(?:[a-z][a-z0-9+.-]*:)?\/\//, '');
  host = host.split(/[/?#]/, 1)[0] ?? '';
  // Only where it is the one colon: an IPv6 address keeps its own, and is refused as an address.
  host = host.replace(/^([^:]*):\d+$/, '$1');
  host = host.replace(/\.$/, '');
  // Every one of them: a stored host never starts with `www.`, which is the form the web redirects from.
  while (host.startsWith('www.')) host = host.slice(4);
  return host;
}

/**
 * The host a shop's domain is kept as, or why it cannot be one (BEELINK-281). Pure: `platformHost`
 * is the host of the platform's own address, handed in so no test depends on the environment.
 */
export function customDomainHostOf(input: string, platformHost: string): CustomDomainHostResult {
  const host = bareHostOf(input);

  if (host === '') return { refusal: 'INVALID' };
  // Before the characters are judged: an internationalised name is a domain, only not in the form kept here.
  if (/[\u0080-￿]/.test(host)) return { refusal: 'NOT_ASCII' };
  if (/[[\]:]/.test(host)) return { refusal: isIP(host.replace(/^\[([^\]]*)\](?::\d+)?$/, '$1')) === 0 ? 'INVALID' : 'IP_ADDRESS' };

  const labels = host.split('.');
  if (host.length > CUSTOM_DOMAIN_MAX_LENGTH || labels.some((label) => label.length > LABEL_MAX_LENGTH || !LABEL.test(label))) return { refusal: 'INVALID' };
  if (NUMERIC_LABEL.test(labels.at(-1) ?? '')) return { refusal: 'IP_ADDRESS' };
  if (host === 'localhost' || LOCAL_SUFFIXES.some((suffix) => host.endsWith(suffix))) return { refusal: 'LOCAL' };
  if (labels.length < 2) return { refusal: 'INVALID' };

  const platform = bareHostOf(platformHost);
  if (platform !== '' && (host === platform || host.endsWith(`.${platform}`))) return { refusal: 'PLATFORM' };

  return { host };
}

// App
import { isCnpj } from '../../shared/http/cnpj.js';
import { isCpf } from '../../shared/http/cpf.js';

/*
  A Pix key as the affiliate types it (IMPULSEIA-108), kept in the one shape the Central Bank's
  directory knows it by: an e-mail in lower case, a random key in lower case, a phone as `+55` and
  its digits, a CPF's or a CNPJ's digits. Anything else is no key: the shop would try to pay into
  nothing. Which kind it is stays implicit — the shop's bank tells them apart the same way.
*/

/** The directory's e-mail keys go up to 77 characters. */
const EMAIL_MAX = 77;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RANDOM_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** What a person writes around digits: spaces, dots, dashes, slashes, brackets. */
const PUNCTUATION = /[\s.\-/()]/g;

/** The key in the directory's shape, or null when it is none. */
export function pixKeyOf(raw: string): string | null {
  const typed = raw.trim();
  if (typed.includes('@')) return EMAIL.test(typed) && typed.length <= EMAIL_MAX ? typed.toLowerCase() : null;
  if (RANDOM_KEY.test(typed)) return typed.toLowerCase();

  const bare = typed.replace(PUNCTUATION, '');
  if (bare.startsWith('+')) return /^\+55\d{10,11}$/.test(bare) ? bare : null;
  if (!/^\d+$/.test(bare)) return null;
  if (bare.length === 14) return isCnpj(bare) ? bare : null;
  if (bare.length === 11 && isCpf(bare)) return bare;
  // A Brazilian phone without its `+55` — a landline's ten digits or a mobile's eleven — or with `55` in front.
  if (bare.length === 10 || bare.length === 11) return `+55${bare}`;
  if ((bare.length === 12 || bare.length === 13) && bare.startsWith('55')) return `+${bare}`;
  return null;
}

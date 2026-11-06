// Types
import type { CustomerPurchaseAddress } from '@harness-monorepo/contracts';
import type { CustomerAddressModel } from '../../generated/prisma/models.js';

const HIDDEN = '•••';

/** The first letters of a word and dots: "Tibúrcio Cavalcante" is "Tib•••" — enough to know it, not to find it. */
function maskedWord(value: string, keep: number): string {
  const letters = [...value.trim()];
  return letters.length <= keep ? `${letters.slice(0, 1).join('')}${HIDDEN}` : `${letters.slice(0, keep).join('')}${HIDDEN}`;
}

/** The street's type kept ("Rua", "Av."), its name cut to three letters. */
function maskedStreet(street: string): string {
  const [first = '', ...rest] = street.trim().split(/\s+/);
  const typed = /^(rua|r\.|avenida|av\.?|travessa|tv\.?|alameda|al\.?|estrada|rodovia|praça|pça\.?|largo|via)$/i.test(first);
  return typed && rest.length > 0 ? `${first} ${maskedWord(rest.join(' '), 3)}` : maskedWord(street, 3);
}

/** The number's first digits and dots: "1200" is "12••"; one or two digits keep one. */
function maskedNumber(number: string): string {
  const digits = number.trim();
  if (!/\d/.test(digits)) return digits.slice(0, 3);
  const keep = digits.length > 2 ? 2 : 1;
  return `${digits.slice(0, keep)}${'•'.repeat(Math.max(digits.length - keep, 1))}`;
}

/**
 * A saved address as a purchase session sees it (plan 2026-11-06--whatsapp-primeiro): enough for the
 * person it belongs to to know it — "Rua Tib•••, 12•• — Fortaleza/CE" — and not enough for whoever typed
 * their WhatsApp to go there. No label, nobody receiving, no complement, no neighbourhood, no CEP.
 */
export function purchaseAddressOf(address: Pick<CustomerAddressModel, 'id' | 'street' | 'number' | 'city' | 'state' | 'isDefault'>): CustomerPurchaseAddress {
  const street = address.street ? [maskedStreet(address.street), address.number ? maskedNumber(address.number) : null].filter(Boolean).join(', ') : HIDDEN;
  const place = [address.city, address.state].filter(Boolean).join('/');
  return { id: address.id, line: place ? `${street} — ${place}` : street, isDefault: address.isDefault };
}

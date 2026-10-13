// Types
import type { PlatformCustomerData } from './platform-asaas.client.js';

const literal = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The document however it is punctuated: its characters in order, with a mark or a space allowed between any two. */
const punctuated = (document: string): RegExp => new RegExp([...document].map(literal).join('[.\\-/\\s]?'), 'gi');

/**
 * Asaas's words about a refusal, fit for a log: whatever they repeat of the customer taken out. Asaas
 * was seen naming the kind of problem and not the value ("O CPF/CNPJ informado é inválido."), and
 * nothing says it always will — a log line holds no one's name, document or e-mail either way.
 */
export function reasonWithout(reason: string, customer: PlatformCustomerData): string {
  let said = reason;
  if (customer.document) said = said.replace(punctuated(customer.document), '[document]');
  if (customer.email) said = said.replace(new RegExp(literal(customer.email), 'gi'), '[e-mail]');
  if (customer.name) said = said.replace(new RegExp(literal(customer.name), 'gi'), '[name]');
  return said;
}

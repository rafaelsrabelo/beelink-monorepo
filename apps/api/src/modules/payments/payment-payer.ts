// Types
import type { AsaasPayer } from '../integrations/asaas/asaas-charges.service.js';

/** What an order says of who pays it, as the charge's claim reads it. */
export interface PayingOrder {
  purchaseSessionId: string | null;
  payerDocument: string | null;
  payerName: string | null;
  customer: { id: string; name: string; cpf: string | null };
}

/**
 * The person an order's charge is made for (plan 2026-11-11--cobranca-do-visitante): the CPF kept on
 * the order, else — for an account's order placed before it was kept — the record's. A visitor's order
 * never falls back to the record: whoever typed a WhatsApp is not the person of its CPF, nor of its
 * name, which Asaas's payment page shows. Null when there is no CPF to charge in.
 */
export function payerOf(order: PayingOrder): AsaasPayer | null {
  const visitor = order.purchaseSessionId !== null;
  const cpf = order.payerDocument ?? (visitor ? null : order.customer.cpf);
  if (!cpf) return null;
  return { id: order.customer.id, name: order.payerName ?? order.customer.name, cpf };
}

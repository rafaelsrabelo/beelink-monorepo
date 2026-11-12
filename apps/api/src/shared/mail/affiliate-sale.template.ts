// App
import { brl, escapeHtml, firstNameOf, layout, type MailContent } from './mail.templates.js';

export interface AffiliateSaleContent {
  /** The affiliate's name, as the shop invited them: only its first word is said. */
  name: string;
  shopName: string;
  number: number;
  /** The customer's name as it is on the order: the affiliate sees who bought (addendum B of the epic). */
  customerName: string;
  /** "2× Whey 900 g", in the order's order. */
  items: readonly string[];
  commissionCents: number;
}

const greetingOf = (name: string) => {
  const first = firstNameOf(name);
  return first ? `Olá, ${first}!` : 'Olá!';
};

/**
 * A sale through the affiliate's link (IMPULSEIA-106): which order, at which shop, who bought, what,
 * and the commission it should pay — paid by the shop after the delivery, on its programme's calendar.
 * From the shop by name, as the invite was.
 */
export function affiliateSale(content: AffiliateSaleContent, url: string): MailContent {
  const greeting = greetingOf(content.name);
  const line = `Você fez uma venda na ${content.shopName}: o pedido nº ${content.number}, de ${content.customerName}.`;
  const commission = `Comissão prevista: ${brl(content.commissionCents)}. Ela fica disponível depois da entrega, na data de pagamento do programa, e a loja paga direto a você.`;
  return {
    subject: `Nova venda pelo seu link — pedido nº ${content.number}`,
    text: `${greeting}\n\n${line}\n\n${content.items.join('\n')}\n\n${commission}\n\nAcompanhe as suas vendas:\n${url}`,
    html: layout(
      escapeHtml(greeting),
      `<p style="margin:0">${escapeHtml(line)}</p><ul style="margin:12px 0 0;padding-left:20px">${content.items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul><p style="margin:12px 0 0">${escapeHtml(commission)}</p>`,
      'Ver as minhas vendas',
      url,
      escapeHtml(content.shopName),
    ),
  };
}

/** One of the affiliate's orders was cancelled: its commission will not be paid, or comes off the next payment. */
export function affiliateSaleCancelled(content: Omit<AffiliateSaleContent, 'items'> & { wasAvailable: boolean }, url: string): MailContent {
  const greeting = greetingOf(content.name);
  const line = `O pedido nº ${content.number} da ${content.shopName}, de ${content.customerName}, foi cancelado.`;
  const commission = content.wasAvailable
    ? `A comissão de ${brl(content.commissionCents)} já estava disponível e é descontada do próximo pagamento.`
    : `A comissão prevista de ${brl(content.commissionCents)} não será paga.`;
  return {
    subject: `Pedido nº ${content.number} cancelado`,
    text: `${greeting}\n\n${line}\n\n${commission}\n\nAcompanhe as suas vendas:\n${url}`,
    html: layout(escapeHtml(greeting), `<p style="margin:0">${escapeHtml(line)}</p><p style="margin:12px 0 0">${escapeHtml(commission)}</p>`, 'Ver as minhas vendas', url, escapeHtml(content.shopName)),
  };
}

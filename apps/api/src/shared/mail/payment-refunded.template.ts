// App
import { brl, escapeHtml, layout, type MailContent } from './mail.templates.js';

export interface PaymentRefundedContent {
  name: string;
  shopName: string;
  number: number;
  /** What this refund gives back. */
  amountCents: number;
  /** Everything the order's payment was: the refund is whole when it gives all of it back. */
  paidCents: number;
  method: 'PIX' | 'CREDIT_CARD';
  /** Asaas concluded it; otherwise it is on its way. */
  done: boolean;
}

/** When the money shows: a card's refund takes days to reach the statement, whatever Asaas says of it. */
function whenOf(method: PaymentRefundedContent['method'], done: boolean): string {
  if (method === 'CREDIT_CARD') return 'No cartão, o estorno pode levar até 10 dias úteis para aparecer na fatura.';
  return done ? 'O valor volta para a conta de onde o Pix saiu.' : 'O estorno está em processamento e o valor volta para a conta de onde o Pix saiu.';
}

/**
 * Money of a customer's online payment was given back (BEELINK-208): which order, at which shop,
 * how much — all of it or a part — and when it shows, the way to the order and — last — how to
 * stop these, as an order's moves end. Never why: the reason is the shop's own note.
 */
export function paymentRefunded({ name, shopName, number, amountCents, paidCents, method, done }: PaymentRefundedContent, url: string, settingsUrl: string): MailContent {
  const greeting = `Olá, ${name}!`;
  const whole = amountCents >= paidCents;
  const line = whole
    ? `${shopName} estornou o pagamento do seu pedido nº ${number}: ${brl(amountCents)}.`
    : `${shopName} estornou parte do pagamento do seu pedido nº ${number}: ${brl(amountCents)} de ${brl(paidCents)}.`;
  const next = whenOf(method, done);
  const why = 'Você recebe este aviso porque tem conta na loja. Para não receber mais, desmarque "Andamento dos pedidos" e salve';
  return {
    subject: `${shopName} — estorno do pagamento do pedido nº ${number}`,
    text: `${greeting}\n\n${line}\n\n${next}\n\nVeja o pedido:\n${url}\n\n${why}:\n${settingsUrl}`,
    html: layout(
      escapeHtml(greeting),
      `<p style="margin:0">${escapeHtml(line)}</p><p style="margin:12px 0 0">${escapeHtml(next)}</p>`,
      'Ver pedido',
      url,
      escapeHtml(shopName),
      `${escapeHtml(why)}: <a href="${settingsUrl}" style="color:#52525b">avisos da sua conta</a>.`,
    ),
  };
}

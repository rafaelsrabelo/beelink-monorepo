// App
import { brl, escapeHtml, layout, type MailContent } from './mail.templates.js';

export interface PaymentApprovedContent {
  name: string;
  shopName: string;
  number: number;
  amountCents: number;
  method: 'PIX' | 'CREDIT_CARD';
  /** 1 is in full. */
  installments: number;
}

/** "no Pix", "no cartão de crédito, em 3x". */
function wayOf(method: PaymentApprovedContent['method'], installments: number): string {
  if (method === 'PIX') return 'no Pix';
  return installments > 1 ? `no cartão de crédito, em ${installments}x` : 'no cartão de crédito';
}

/**
 * A customer's online payment was approved (BEELINK-207): which order, at which shop, how much and
 * how it was paid, the way to the order and — last — how to stop these, as an order's moves end.
 */
export function paymentApproved({ name, shopName, number, amountCents, method, installments }: PaymentApprovedContent, url: string, settingsUrl: string): MailContent {
  const greeting = `Olá, ${name}!`;
  const line = `O pagamento do seu pedido nº ${number} em ${shopName} foi aprovado: ${brl(amountCents)} ${wayOf(method, installments)}.`;
  const next = 'A loja já foi avisada e você acompanha o andamento pelo pedido.';
  const why = 'Você recebe este aviso porque tem conta na loja. Para não receber mais, desmarque "Andamento dos pedidos" e salve';
  return {
    subject: `${shopName} — pagamento do pedido nº ${number} aprovado`,
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

// App
import { brl, escapeHtml, firstNameOf, layout, type MailContent } from './mail.templates.js';

/** How a payment made outside bee-link went, as the e-mail says it. */
export type AffiliatePayoutMethodWord = 'PIX' | 'TRANSFER' | 'CASH';

export interface AffiliatePayoutContent {
  /** The affiliate's name, as the shop invited them: only its first word is said. */
  name: string;
  shopName: string;
  amountCents: number;
  /** `YYYY-MM-DD`, the day the shop says it paid. */
  paidOn: string;
  method: AffiliatePayoutMethodWord;
  note: string | null;
}

const METHOD: Record<AffiliatePayoutMethodWord, string> = { PIX: 'por Pix', TRANSFER: 'por transferência', CASH: 'em dinheiro' };

/** `2026-11-12` as `12/11/2026`: a calendar day, so no clock and no zone can move it. */
function dayOf(day: string): string {
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
}

/**
 * A payment the shop registered for the affiliate (IMPULSEIA-108): how much, on which day, how, and
 * the shop's note. Nothing moved through bee-link — the shop says it paid — so the e-mail says it as
 * the shop's word, and leads to the statement where it now stands. From the shop by name.
 */
export function affiliatePayout(content: AffiliatePayoutContent, url: string): MailContent {
  const first = firstNameOf(content.name);
  const greeting = first ? `Olá, ${first}!` : 'Olá!';
  const line = `A ${content.shopName} registrou um pagamento de ${brl(content.amountCents)} para você, feito ${METHOD[content.method]} em ${dayOf(content.paidOn)}.`;
  const note = content.note ? `Recado da loja: ${content.note}` : null;
  const after = 'O valor já saiu do seu saldo. Se não reconhecer o pagamento, fale com a loja.';
  return {
    subject: `Pagamento registrado — ${brl(content.amountCents)}`,
    text: [greeting, line, note, after, `Veja o seu extrato:\n${url}`].filter(Boolean).join('\n\n'),
    html: layout(
      escapeHtml(greeting),
      [line, note, after]
        .filter((paragraph): paragraph is string => paragraph !== null)
        .map((paragraph, index) => `<p style="margin:${index === 0 ? '0' : '12px 0 0'}">${escapeHtml(paragraph)}</p>`)
        .join(''),
      'Ver o meu extrato',
      url,
      escapeHtml(content.shopName),
    ),
  };
}

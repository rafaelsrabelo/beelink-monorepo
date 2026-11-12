// App
import { escapeHtml, firstNameOf, layout, type MailContent } from './mail.templates.js';

export interface AffiliateInviteContent {
  /** As the shopkeeper typed it: only its first word is said, and only if it reads as a name. */
  name: string;
  shopName: string;
  /** How long the link works. */
  days: number;
}

/**
 * A shop invites someone to sell through its link (IMPULSEIA-103). From the shop by name; the link
 * opens bee-link's own page, since the affiliate's account is bee-link's. Nothing of the condition is
 * said here: the page shows it, read fresh, and the e-mail would go stale with the next change.
 */
export function affiliateInvite({ name, shopName, days }: AffiliateInviteContent, url: string): MailContent {
  const first = firstNameOf(name);
  const greeting = first ? `Olá, ${first}!` : 'Olá!';
  const invited = `A loja ${shopName} convidou você para ser afiliado: você divulga a loja com o seu link e ganha comissão sobre o que vender por ele.`;
  const next = `Abra o convite para ver a sua condição, escolher o seu link e aceitar. O convite vale por ${days} dias.`;
  const ignore = 'Se você não esperava este convite, ignore esta mensagem.';
  return {
    subject: `${shopName} convidou você para ser afiliado`,
    text: `${greeting}\n\n${invited}\n\n${next}\n${url}\n\n${ignore}`,
    html: layout(
      escapeHtml(greeting),
      `<p style="margin:0">${escapeHtml(invited)}</p><p style="margin:12px 0 0">${escapeHtml(next)}</p>`,
      'Ver o convite',
      url,
      escapeHtml(shopName),
      escapeHtml(ignore),
    ),
  };
}

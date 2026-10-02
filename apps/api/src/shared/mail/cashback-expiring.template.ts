// App
import { brl, escapeHtml, layout, type MailContent } from './mail.templates.js';

export interface CashbackExpiringContent {
  name: string;
  shopName: string;
  /** What is left of the lot when the e-mail goes. */
  amountCents: number;
  expiresAt: Date;
}

/**
 * A customer's cashback about to expire (BEELINK-241): how much, at which shop, until when — the day
 * in Brasília, as the shops keep their hours — the way back to the shop, and how to stop these.
 */
export function cashbackExpiring({ name, shopName, amountCents, expiresAt }: CashbackExpiringContent, url: string, settingsUrl: string): MailContent {
  const day = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(expiresAt);
  const greeting = `Olá, ${name}!`;
  const line = `Você tem ${brl(amountCents)} de cashback em ${shopName}, que vence em ${day}. Use nas suas próximas compras na loja antes disso.`;
  const why = 'Você recebe este aviso porque tem cashback na loja. Para não receber mais, desmarque "Cashback" e salve';
  return {
    subject: `${shopName} — seu cashback de ${brl(amountCents)} vence em ${day}`,
    text: `${greeting}\n\n${line}\n\nIr para a loja:\n${url}\n\n${why}:\n${settingsUrl}`,
    html: layout(
      escapeHtml(greeting),
      `<p style="margin:0">${escapeHtml(line)}</p>`,
      'Ir para a loja',
      url,
      escapeHtml(shopName),
      `${escapeHtml(why)}: <a href="${settingsUrl}" style="color:#52525b">avisos da sua conta</a>.`,
    ),
  };
}

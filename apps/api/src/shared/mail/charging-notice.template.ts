// App
import { brl, escapeHtml, firstNameOf, note, type MailContent } from './mail.templates.js';

/** A page of the shopkeeper's that locks without a plan, as the notice tells it. */
export interface ChargingNoticePage {
  name: string;
  /** Where the page is, as a shopkeeper reads it: `beelink.biz/<slug>`. */
  address: string;
  /** The last day it is free, `YYYY-MM-DD`, when that is after charging starts; null when it locks that very day. */
  freeUntil: string | null;
  /** The day it locks without a plan, `YYYY-MM-DD`. */
  locksOn: string;
}

export interface ChargingNoticeContent {
  /** The account's name: only its first word is said. */
  name: string;
  /** The day charging starts, `YYYY-MM-DD` on Brasília's calendar. */
  switchOnDay: string;
  /** What each cycle of the plan on sale costs a page, the shortest first. */
  cycles: { months: number; priceCents: number }[];
  pages: ChargingNoticePage[];
}

/** A day as the shopkeeper reads one: 20/11/2026. */
function dayOf(day: string): string {
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
}

function cycleOf(months: number): string {
  if (months === 1) return 'Mensal';
  if (months % 12 === 0) return months === 12 ? '1 ano' : `${months / 12} anos`;
  return `${months} meses`;
}

function priceOf({ months, priceCents }: { months: number; priceCents: number }): string {
  return months === 1 ? `${cycleOf(months)}: ${brl(priceCents)}` : `${cycleOf(months)}: ${brl(priceCents)} (${brl(Math.round(priceCents / months))} por mês)`;
}

function pageOf(page: ChargingNoticePage): string {
  const until = page.freeUntil ? `grátis até ${dayOf(page.freeUntil)}. Sem um plano, ela trava e sai do ar em ${dayOf(page.locksOn)}.` : `sem um plano, ela trava e sai do ar em ${dayOf(page.locksOn)}.`;
  return `${page.name} (${page.address}): ${until}`;
}

/**
 * A shopkeeper is told the day charging starts (BEELINK-297), seven days or more before it: what each
 * cycle costs a page, and the day each of their pages locks without a plan. From bee-link itself, under
 * no shop's name. It promises no way to cancel and no channel to talk to, neither of which exists yet
 * (BEELINK-290), and asks nothing to be done before the day: no plan can be chosen until then.
 */
export function chargingNotice({ name, switchOnDay, cycles, pages }: ChargingNoticeContent): MailContent {
  const first = firstNameOf(name);
  const greeting = first ? `Olá, ${first}.` : 'Olá.';
  const day = dayOf(switchOnDay);
  const opening = `A cobrança das páginas na Beelink começa em ${day}. A partir daí, cada página precisa de um plano para continuar no ar, depois do tempo grátis que ela ainda tiver. O valor é por página:`;
  const prices = cycles.map(priceOf);
  const heading = pages.length === 1 ? 'Sua página:' : 'Suas páginas:';
  const lines = pages.map(pageOf);
  const how = `A partir de ${day}, você escolhe o plano no painel de cada página e paga a fatura com cartão, Pix ou boleto. Nada é cobrado sem você escolher. Com cartão de crédito, o plano renova sozinho; com Pix ou boleto, cada renovação é uma fatura nova, que aparece no painel.`;
  const kept = 'Uma página travada não perde nada do que tem: assim que o plano é pago, ela volta ao ar como estava.';
  const signature = 'Equipe Beelink';
  const list = (items: string[]) => `<ul style="margin:12px 0 0;padding-left:20px">${items.map((item) => `<li style="margin:4px 0">${escapeHtml(item)}</li>`).join('')}</ul>`;

  return {
    subject: `A cobrança das páginas na Beelink começa em ${day}`,
    text: [greeting, opening, prices.map((price) => `- ${price}`).join('\n'), heading, lines.map((line) => `- ${line}`).join('\n'), how, kept, signature].join('\n\n'),
    html: note(
      escapeHtml(greeting),
      `<p style="margin:0">${escapeHtml(opening)}</p>${list(prices)}<p style="margin:16px 0 0">${escapeHtml(heading)}</p>${list(lines)}<p style="margin:16px 0 0">${escapeHtml(how)}</p><p style="margin:12px 0 0">${escapeHtml(kept)}</p><p style="margin:24px 0 0;color:#52525b">${signature}</p>`,
    ),
  };
}

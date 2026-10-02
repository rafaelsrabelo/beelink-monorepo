/** The product speaks pt-BR (docs/product). Identifiers and comments stay in English. */
export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

/**
 * Text from a stranger, made safe to sit inside HTML. A lead is what a visitor typed, a shopper's
 * name is what anyone signing up at a shop typed, a shop's name what its owner did: `<script>` in
 * any of them is text the reader's mail client must not run.
 */
export function escapeHtml(value: string): string {
  const escaped: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  return value.replace(/[&<>"']/g, (char) => escaped[char] ?? char);
}

/**
 * `brand`, already escaped, heads the card: whose e-mail this is, when it is a shop's. `footer`,
 * already HTML, closes it, after the button — the fine print is read last. The colours are literals,
 * not the design system's tokens: a mail client reads no CSS variables and no stylesheet, only
 * inline styles.
 */
function layout(title: string, body: string, actionLabel: string, actionUrl: string, brand?: string, footer?: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#18181b">
    <table role="presentation" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <tr><td>
        ${brand ? `<p style="margin:0 0 16px;font-size:14px;font-weight:700;color:#52525b">${brand}</p>` : ''}
        <h1 style="margin:0 0 16px;font-size:20px">${title}</h1>
        ${body}
        <p style="margin:24px 0">
          <a href="${actionUrl}" style="display:inline-block;background:#18181b;color:#fafafa;text-decoration:none;padding:12px 20px;border-radius:8px">${actionLabel}</a>
        </p>
        <p style="margin:0;font-size:13px;color:#71717a">Se o botão não funcionar, copie e cole este endereço no navegador:<br />${actionUrl}</p>
        ${footer ? `<p style="margin:16px 0 0;font-size:13px;color:#71717a">${footer}</p>` : ''}
      </td></tr>
    </table>
  </body>
</html>`;
}

/**
 * A shop's account e-mails name the shop — in the subject, atop the card and in the words — and a
 * shopkeeper's name nobody (BEELINK-149). The names are what someone typed: escaped for the HTML.
 */
export function emailVerification(name: string, url: string, hours: number, shopName?: string): MailContent {
  const greeting = `Olá, ${name}!`;
  const account = shopName ? `sua conta na loja ${shopName}` : 'sua conta';
  return {
    subject: shopName ? `${shopName} — confirme seu e-mail` : 'Confirme seu e-mail',
    text: `${greeting}\n\nConfirme seu e-mail para ativar ${account}:\n${url}\n\nO link vale por ${hours} horas e só pode ser usado uma vez.\nSe não foi você quem criou a conta, ignore esta mensagem.`,
    html: layout(
      escapeHtml(greeting),
      `<p style="margin:0">Confirme seu e-mail para ativar ${escapeHtml(account)}. O link vale por ${hours} horas e só pode ser usado uma vez.</p>
       <p style="margin:12px 0 0;font-size:13px;color:#71717a">Se não foi você quem criou a conta, ignore esta mensagem.</p>`,
      'Confirmar e-mail',
      url,
      shopName ? escapeHtml(shopName) : undefined,
    ),
  };
}

export function passwordReset(name: string, url: string, minutes: number, shopName?: string): MailContent {
  const greeting = `Olá, ${name}!`;
  const account = shopName ? `sua conta na loja ${shopName}` : 'sua conta';
  return {
    subject: shopName ? `${shopName} — crie uma nova senha` : 'Redefinir sua senha',
    text: `${greeting}\n\nUse este link para criar uma nova senha para ${account}:\n${url}\n\nO link vale por ${minutes} minutos e só pode ser usado uma vez.\nSe não foi você quem pediu, ignore esta mensagem: sua senha continua a mesma.`,
    html: layout(
      escapeHtml(greeting),
      `<p style="margin:0">Use o botão abaixo para criar uma nova senha para ${escapeHtml(account)}. O link vale por ${minutes} minutos e só pode ser usado uma vez.</p>
       <p style="margin:12px 0 0;font-size:13px;color:#71717a">Se não foi você quem pediu, ignore esta mensagem: sua senha continua a mesma.</p>`,
      'Criar nova senha',
      url,
      shopName ? escapeHtml(shopName) : undefined,
    ),
  };
}

/** The order moves a customer hears of by e-mail (BEELINK-151). */
export type NotifiedOrderStatus = 'ACCEPTED' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

export interface OrderStatusContent {
  name: string;
  shopName: string;
  number: number;
  status: NotifiedOrderStatus;
  /** A pick-up reads its moves as the shop window does: ready at the shop, picked up. */
  pickup: boolean;
  /**
   * On a delivery, the cashback it made usable (BEELINK-239), read when the e-mail is sent — an order
   * cancelled since has none to tell of. Null otherwise.
   */
  cashback?: { amountCents: number; expiresAt: Date | null } | null;
}

/** "Você ganhou R$ 5,00 de cashback…", the date in the shops' own zone, as a calendar shows it. */
function cashbackLineOf(cashback: NonNullable<OrderStatusContent['cashback']>): string {
  const until = cashback.expiresAt
    ? `, até ${new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Sao_Paulo' }).format(cashback.expiresAt)}`
    : '';
  return `Você ganhou ${brl(cashback.amountCents)} de cashback para usar nas próximas compras na loja${until}.`;
}

/** How each move reads — in the subject, after the order's number, and in the words. */
function orderMoveOf(status: NotifiedOrderStatus, pickup: boolean): { subject: string; said: string } {
  switch (status) {
    case 'ACCEPTED':
      return { subject: 'confirmado', said: 'foi confirmado' };
    case 'OUT_FOR_DELIVERY':
      return pickup ? { subject: 'pronto para retirar', said: 'está pronto para retirar' } : { subject: 'saiu para entrega', said: 'saiu para entrega' };
    case 'DELIVERED':
      return pickup ? { subject: 'retirado', said: 'foi retirado na loja' } : { subject: 'entregue', said: 'foi entregue' };
    case 'CANCELLED':
      return { subject: 'cancelado', said: 'foi cancelado' };
  }
}

/**
 * A customer's order moved: the shop's name on it, the way to the order at the shop, and — last —
 * the way to stop these notices, straight to the box that turns them off (`settingsUrl`).
 */
export function orderStatusChanged({ name, shopName, number, status, pickup, cashback = null }: OrderStatusContent, url: string, settingsUrl: string): MailContent {
  const greeting = `Olá, ${name}!`;
  const { subject, said } = orderMoveOf(status, pickup);
  const line = `Seu pedido nº ${number} em ${shopName} ${said}.`;
  const earned = cashback ? cashbackLineOf(cashback) : null;
  const why = 'Você recebe este aviso porque tem conta na loja. Para não receber mais, desmarque "Andamento dos pedidos" e salve';
  return {
    subject: `${shopName} — pedido nº ${number} ${subject}`,
    text: `${greeting}\n\n${line}${earned ? `\n\n${earned}` : ''}\n\nVeja o pedido:\n${url}\n\n${why}:\n${settingsUrl}`,
    html: layout(
      escapeHtml(greeting),
      `<p style="margin:0">${escapeHtml(line)}</p>${earned ? `<p style="margin:12px 0 0">${escapeHtml(earned)}</p>` : ''}`,
      'Ver pedido',
      url,
      escapeHtml(shopName),
      `${escapeHtml(why)}: <a href="${settingsUrl}" style="color:#52525b">avisos da sua conta</a>.`,
    ),
  };
}

export interface FavoriteNoticeContent {
  name: string;
  shopName: string;
  productName: string;
  /** "Sabor: Uva"; null for a product liked as a whole. */
  variantLabel: string | null;
  /** Today's price when the notice was born. */
  priceCents: number;
  /** What it cost before, when it dropped; null when it only came back. */
  previousPriceCents: number | null;
  backInStock: boolean;
}

function brl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cents / 100);
}

/**
 * A favourite got cheaper, came back in stock, or both (BEELINK-155): the shop's name on it, the way
 * to the product at the shop, and — last — the way to stop these notices, straight to the box that
 * turns them off (`settingsUrl`).
 */
export function favoriteNotice(content: FavoriteNoticeContent, url: string, settingsUrl: string): MailContent {
  const { name, shopName, productName, variantLabel, priceCents, previousPriceCents, backInStock } = content;
  const dropped = previousPriceCents !== null;
  const what = dropped && backInStock ? 'baixou de preço e voltou ao estoque' : dropped ? 'baixou de preço' : 'voltou ao estoque';
  const thing = variantLabel ? `${productName} (${variantLabel})` : productName;
  const price = dropped ? `agora sai por ${brl(priceCents)} (antes ${brl(previousPriceCents)})` : `sai por ${brl(priceCents)}`;
  const line = backInStock ? `${thing}, que você curtiu em ${shopName}, voltou ao estoque e ${price}.` : `${thing}, que você curtiu em ${shopName}, ${price}.`;
  const greeting = `Olá, ${name}!`;
  const why = 'Você recebe este aviso porque curtiu este produto. Para não receber mais, desmarque "Favoritos" e salve';
  return {
    subject: `${shopName} — ${productName} ${what}`,
    text: `${greeting}\n\n${line}\n\nVeja o produto:\n${url}\n\n${why}:\n${settingsUrl}`,
    html: layout(
      escapeHtml(greeting),
      `<p style="margin:0">${escapeHtml(line)}</p>`,
      'Ver produto',
      url,
      escapeHtml(shopName),
      `${escapeHtml(why)}: <a href="${settingsUrl}" style="color:#52525b">avisos da sua conta</a>.`,
    ),
  };
}

/** What the owner is told about a lead. Values are the visitor's; every one is escaped for HTML. */
export interface LeadReceivedContent {
  ownerName: string;
  siteName: string;
  leadName: string;
  email: string | null;
  phone: string | null;
  answers: readonly { label: string; value: string }[];
}

export function leadReceived(content: LeadReceivedContent, panelUrl: string): MailContent {
  const greeting = `Olá, ${content.ownerName}!`;
  const lines: [string, string][] = [
    ['Nome', content.leadName],
    ...(content.email ? [['E-mail', content.email] as [string, string]] : []),
    ...(content.phone ? [['Telefone', content.phone] as [string, string]] : []),
    ...content.answers.map(({ label, value }) => [label, value] as [string, string]),
  ];

  const rows = lines
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;font-size:13px;color:#71717a;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td>` +
        `<td style="padding:4px 0;font-size:14px;white-space:pre-line">${escapeHtml(value)}</td></tr>`,
    )
    .join('');

  return {
    subject: `Novo contato pelo site ${content.siteName}`,
    text: `${greeting}\n\nAlguém preencheu o formulário do site ${content.siteName}:\n\n${lines
      .map(([label, value]) => `${label}: ${value}`)
      .join('\n')}\n\nVeja no painel:\n${panelUrl}`,
    html: layout(
      escapeHtml(greeting),
      `<p style="margin:0 0 12px">Alguém preencheu o formulário do site ${escapeHtml(content.siteName)}:</p>
       <table role="presentation" style="border-collapse:collapse">${rows}</table>`,
      'Ver no painel',
      panelUrl,
    ),
  };
}

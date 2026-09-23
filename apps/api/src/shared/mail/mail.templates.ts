/** The product speaks pt-BR (docs/product). Identifiers and comments stay in English. */
export interface MailContent {
  subject: string;
  text: string;
  html: string;
}

/**
 * Text from a stranger, made safe to sit inside HTML.
 *
 * The two templates before this one interpolate raw, and could: they only ever carried the
 * account holder's own name. A lead is what a visitor typed, and `<script>` in a message field
 * is a message field the owner's mail client must not run.
 */
export function escapeHtml(value: string): string {
  const escaped: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  return value.replace(/[&<>"']/g, (char) => escaped[char] ?? char);
}

function layout(title: string, body: string, actionLabel: string, actionUrl: string): string {
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#18181b">
    <table role="presentation" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:20px">${title}</h1>
        ${body}
        <p style="margin:24px 0">
          <a href="${actionUrl}" style="display:inline-block;background:#18181b;color:#fafafa;text-decoration:none;padding:12px 20px;border-radius:8px">${actionLabel}</a>
        </p>
        <p style="margin:0;font-size:13px;color:#71717a">Se o botão não funcionar, copie e cole este endereço no navegador:<br />${actionUrl}</p>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function emailVerification(name: string, url: string, hours: number): MailContent {
  const greeting = `Olá, ${name}!`;
  return {
    subject: 'Confirme seu e-mail',
    text: `${greeting}\n\nConfirme seu e-mail para ativar sua conta:\n${url}\n\nO link vale por ${hours} horas e só pode ser usado uma vez.\nSe não foi você quem criou a conta, ignore esta mensagem.`,
    html: layout(
      greeting,
      `<p style="margin:0">Confirme seu e-mail para ativar sua conta. O link vale por ${hours} horas e só pode ser usado uma vez.</p>
       <p style="margin:12px 0 0;font-size:13px;color:#71717a">Se não foi você quem criou a conta, ignore esta mensagem.</p>`,
      'Confirmar e-mail',
      url,
    ),
  };
}

export function passwordReset(name: string, url: string, minutes: number): MailContent {
  const greeting = `Olá, ${name}!`;
  return {
    subject: 'Redefinir sua senha',
    text: `${greeting}\n\nUse este link para criar uma nova senha:\n${url}\n\nO link vale por ${minutes} minutos e só pode ser usado uma vez.\nSe não foi você quem pediu, ignore esta mensagem: sua senha continua a mesma.`,
    html: layout(
      greeting,
      `<p style="margin:0">Use o botão abaixo para criar uma nova senha. O link vale por ${minutes} minutos e só pode ser usado uma vez.</p>
       <p style="margin:12px 0 0;font-size:13px;color:#71717a">Se não foi você quem pediu, ignore esta mensagem: sua senha continua a mesma.</p>`,
      'Criar nova senha',
      url,
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

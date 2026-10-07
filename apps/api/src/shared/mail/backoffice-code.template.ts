// App
import { escapeHtml, type MailContent } from './mail.templates.js';

/**
 * The second step of a backoffice sign-in (BEELINK-227): a code to type, not a link to follow — so
 * no button, and nothing in the subject, which a lock screen shows and a log keeps. The colours are
 * literals for the reason `layout` gives: a mail client reads inline styles and nothing else.
 */
export function backofficeSignInCode(name: string, code: string, minutes: number): MailContent {
  const greeting = `Olá, ${name}!`;
  const lead = 'Use este código para concluir a entrada no backoffice da bee-link:';
  const fine = `O código vale por ${minutes} minutos e só pode ser usado uma vez. Se não foi você quem tentou entrar, troque sua senha: alguém a conhece.`;

  return {
    subject: 'Seu código de acesso ao backoffice',
    text: `${greeting}\n\n${lead}\n\n${code}\n\n${fine}`,
    html: `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f4f4f5;font-family:system-ui,-apple-system,Segoe UI,sans-serif;color:#18181b">
    <table role="presentation" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px">
      <tr><td>
        <h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(greeting)}</h1>
        <p style="margin:0">${lead}</p>
        <p style="margin:24px 0;font-size:32px;font-weight:700;letter-spacing:6px">${escapeHtml(code)}</p>
        <p style="margin:0;font-size:13px;color:#71717a">${fine}</p>
      </td></tr>
    </table>
  </body>
</html>`,
  };
}

// App
import { escapeHtml, firstNameOf, note, type MailContent } from './mail.templates.js';

export interface SignInCodeContent {
  /** The account's own name: only its first word is said. */
  name: string;
  /** Six digits. */
  code: string;
  minutes: number;
  shopName: string;
}

/** "123456" as "123 456": read in two halves, as a phone's keyboard suggests it. */
function spaced(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}

/**
 * The checkout's code, from the shop by name: six digits to type where the purchase waits. No button
 * and no link — a link would open another tab, away from the cart. The code is in the subject too,
 * where a phone's notice shows it without opening anything.
 */
export function signInCode({ name, code, minutes, shopName }: SignInCodeContent): MailContent {
  const first = firstNameOf(name);
  const greeting = first ? `Olá, ${first}!` : 'Olá!';
  const use = `Use este código para continuar sua compra na loja ${shopName}:`;
  const holds = `Ele vale por ${minutes} minutos e só pode ser usado uma vez.`;
  const notYou = 'Se não foi você quem pediu, ignore esta mensagem: sem o código ninguém entra na sua conta.';
  return {
    subject: `${spaced(code)} é o seu código na ${shopName}`,
    text: `${greeting}\n\n${use}\n\n${spaced(code)}\n\n${holds}\n${notYou}`,
    html: note(
      escapeHtml(greeting),
      `<p style="margin:0">${escapeHtml(use)}</p>
       <p style="margin:20px 0;font-size:32px;font-weight:700;letter-spacing:6px">${spaced(code)}</p>
       <p style="margin:0">${escapeHtml(holds)}</p>
       <p style="margin:12px 0 0;font-size:13px;color:#71717a">${escapeHtml(notYou)}</p>`,
    ),
  };
}

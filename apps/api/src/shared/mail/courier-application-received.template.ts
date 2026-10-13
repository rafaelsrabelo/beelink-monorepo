// App
import { escapeHtml, note, type MailContent } from './mail.templates.js';

export interface CourierApplicationReceivedContent {
  /** The full name as the application keeps it: only its first word is said. */
  name: string;
  /** The city's name, as bee-link writes it; null for a code that names no city any more. */
  city: string | null;
}

/** A letter, then letters, an apostrophe as a keyboard or a phone writes it, a hyphen: nothing a mail client turns into a link. */
const SAYABLE = /^\p{L}[\p{L}'’-]*$/u;

/**
 * The name to greet by, or none. The address was confirmed by nobody: whoever fills the form in
 * with somebody else's e-mail chooses what that person reads after "Olá,". A first word that is
 * anything but a name — `www.exemplo.com` becomes a link in the reader's mail client — is not said.
 */
function firstNameOf(name: string): string | null {
  // Composed first: an accent typed apart from its letter is a mark, and would read as no letter.
  const first = name.normalize('NFC').trim().split(/\s+/)[0] ?? '';

  return SAYABLE.test(first) ? first : null;
}

/**
 * A person who asked to deliver is told the application arrived (BEELINK-326), and that the way to
 * go on with it comes later, to this same address. It leads nowhere: no button, no link, and
 * nothing of what was typed but a first name. From bee-link itself, under no shop's name.
 */
export function courierApplicationReceived({ name, city }: CourierApplicationReceivedContent): MailContent {
  const first = firstNameOf(name);
  const greeting = first ? `Olá, ${first}.` : 'Olá.';
  const received = city ? `Recebemos o seu cadastro para fazer entregas com a Beelink em ${city}.` : 'Recebemos o seu cadastro para fazer entregas com a Beelink.';
  const next = 'Em breve você recebe, neste e-mail, as orientações para seguir com o cadastro. Por enquanto, não é preciso fazer mais nada.';
  const signature = 'Equipe Beelink';
  return {
    subject: 'Recebemos o seu cadastro de entregador na Beelink',
    text: `${greeting}\n\n${received}\n\n${next}\n\n${signature}`,
    html: note(
      escapeHtml(greeting),
      `<p style="margin:0">${escapeHtml(received)}</p><p style="margin:12px 0 0">${escapeHtml(next)}</p><p style="margin:24px 0 0;color:#52525b">${signature}</p>`,
    ),
  };
}

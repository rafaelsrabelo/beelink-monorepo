// App
import { escapeHtml, firstNameOf, note, type MailContent } from './mail.templates.js';

export interface CourierApplicationReceivedContent {
  /** The full name as the application keeps it: only its first word is said. */
  name: string;
  /** The city's name, as bee-link writes it; null for a code that names no city any more. */
  city: string | null;
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

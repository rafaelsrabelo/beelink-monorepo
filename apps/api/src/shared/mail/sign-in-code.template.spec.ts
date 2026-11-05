// Libs
import { describe, expect, it } from 'vitest';

// App
import { signInCode } from './sign-in-code.template.js';

describe("the checkout's code e-mail", () => {
  it('says the code in the subject, where a phone shows it, and in the body, from the shop by name', () => {
    const mail = signInCode({ name: 'Ana Souza', code: '004217', minutes: 10, shopName: 'Mutante' });

    expect(mail.subject).toBe('004 217 é o seu código na Mutante');
    expect(mail.text).toContain('Olá, Ana!');
    expect(mail.text).toContain('continuar sua compra na loja Mutante');
    expect(mail.text).toContain('004 217');
    expect(mail.text).toContain('10 minutos');
    expect(mail.html).toContain('004 217');
  });

  it('leads nowhere, and greets nobody by a first word that is not a name', () => {
    const mail = signInCode({ name: 'www.exemplo.com', code: '123456', minutes: 10, shopName: '<b>Loja</b>' });

    expect(mail.html).not.toContain('href=');
    expect(mail.text.startsWith('Olá!')).toBe(true);
    expect(mail.html).toContain('&lt;b&gt;Loja&lt;/b&gt;');
  });
});

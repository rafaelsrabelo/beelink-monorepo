// App
import { affiliatePayout } from './affiliate-payout.template.js';

/** `Intl` puts a no-break space between `R$` and the number. */
const plain = (text: string) => text.replace(/\u00a0/g, ' ');

describe("the e-mail of an affiliate's payout", () => {
  const content = { name: 'Maria Souza', shopName: 'Loja da Ana', amountCents: 3000, paidOn: '2026-11-12', method: 'PIX' as const, note: null };

  it('says how much, when and how, from the shop, and leads to the statement', () => {
    const mail = affiliatePayout(content, 'https://bee-link.test/afiliado/loja-da-ana?aba=extrato');

    expect(plain(mail.subject)).toBe('Pagamento registrado — R$ 30,00');
    expect(mail.text).toContain('Olá, Maria!');
    expect(plain(mail.text)).toContain('A Loja da Ana registrou um pagamento de R$ 30,00 para você, feito por Pix em 12/11/2026.');
    expect(mail.text).toContain('https://bee-link.test/afiliado/loja-da-ana?aba=extrato');
    expect(mail.text).not.toContain('Recado da loja');
  });

  it("carries the shop's note, escaped in the HTML", () => {
    const mail = affiliatePayout({ ...content, method: 'CASH', note: 'Obrigada <3' }, 'https://bee-link.test/afiliado');

    expect(mail.text).toContain('em dinheiro');
    expect(mail.text).toContain('Recado da loja: Obrigada <3');
    expect(mail.html).toContain('Obrigada &lt;3');
  });
});

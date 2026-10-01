// App
import { emailVerification, escapeHtml, favoriteNotice, leadReceived, orderStatusChanged, passwordReset } from './mail.templates.js';

describe('leadReceived — a stranger’s words in the owner’s inbox', () => {
  const content = {
    ownerName: 'Ana',
    siteName: 'Asfalto Norte',
    leadName: 'Carlos <script>alert(1)</script>',
    email: 'carlos@exemplo.test',
    phone: '11988887777',
    answers: [{ label: 'Mensagem', value: 'Preciso de "30t" & mais' }],
  };

  it('escapes every value in the HTML and leaves the text as typed', () => {
    const mail = leadReceived(content, 'http://localhost:3000/admin/asfalto-norte/leads');

    expect(mail.html).not.toContain('<script>');
    expect(mail.html).toContain('&lt;script&gt;');
    expect(mail.html).toContain('&quot;30t&quot; &amp; mais');
    expect(mail.text).toContain('Nome: Carlos <script>alert(1)</script>');
    expect(mail.text).toContain('Mensagem: Preciso de "30t" & mais');
  });

  it('names the site in the subject and points at its panel', () => {
    const mail = leadReceived(content, 'http://localhost:3000/admin/asfalto-norte/leads');

    expect(mail.subject).toBe('Novo contato pelo site Asfalto Norte');
    expect(mail.html).toContain('href="http://localhost:3000/admin/asfalto-norte/leads"');
  });

  it('leaves out a line the lead has nothing for', () => {
    const mail = leadReceived({ ...content, phone: null, answers: [] }, 'http://x');

    expect(mail.text).not.toContain('Telefone');
    expect(mail.text).not.toContain('Mensagem');
  });
});

describe("a shop's account e-mails", () => {
  const url = 'http://localhost:3000/mutante/confirmar-email?token=t&voltar=%2Fmutante';

  it('name the shop in the subject, atop the card and in the words, escaped in the HTML', () => {
    const verify = emailVerification('Bia <b>', url, 24, 'Mutante & Cia');
    const reset = passwordReset('Bia', url, 30, 'Mutante & Cia');

    expect(verify.subject).toBe('Mutante & Cia — confirme seu e-mail');
    expect(reset.subject).toBe('Mutante & Cia — crie uma nova senha');
    expect(verify.text).toContain('ativar sua conta na loja Mutante & Cia');
    expect(reset.text).toContain('nova senha para sua conta na loja Mutante & Cia');
    expect(verify.html).toContain('>Mutante &amp; Cia</p>');
    expect(verify.html).toContain('Olá, Bia &lt;b&gt;!');
    expect(verify.html).not.toContain('<b>');
    expect(verify.html).toContain(`href="${url}"`);
  });

  it("name nobody on a shopkeeper's: the panel's account is bee-link's", () => {
    const verify = emailVerification('Ana', 'http://localhost:3000/verify-email?token=t', 24);

    expect(verify.subject).toBe('Confirme seu e-mail');
    expect(verify.text).toContain('para ativar sua conta:');
  });
});

describe("a favourite's notice, told to who liked it", () => {
  const base = { name: 'Bia', shopName: 'Mutante & Cia', productName: 'Whey <Isolado>', variantLabel: 'Sabor: Uva', priceCents: 15990, previousPriceCents: 18990, backInStock: false };
  const url = 'https://link.test/mutante/produtos/whey';
  const settings = 'https://link.test/mutante/conta/perfil#avisos';

  it('says what changed in the subject, and the price it has now beside the one it had', () => {
    const dropped = favoriteNotice(base, url, settings);
    expect(dropped.subject).toBe('Mutante & Cia — Whey <Isolado> baixou de preço');
    expect(dropped.text).toMatch(/Whey <Isolado> \(Sabor: Uva\), que você curtiu em Mutante & Cia, agora sai por R\$\s159,90 \(antes R\$\s189,90\)\./);

    expect(favoriteNotice({ ...base, previousPriceCents: null, backInStock: true }, url, settings).subject).toBe('Mutante & Cia — Whey <Isolado> voltou ao estoque');
    expect(favoriteNotice({ ...base, backInStock: true }, url, settings).subject).toBe('Mutante & Cia — Whey <Isolado> baixou de preço e voltou ao estoque');
    expect(favoriteNotice({ ...base, variantLabel: null, previousPriceCents: null, backInStock: true }, url, settings).text).toMatch(/Whey <Isolado>, que você curtiu em Mutante & Cia, voltou ao estoque e sai por R\$\s159,90\./);
  });

  it('escapes the names in the HTML, and ends on the way to stop these notices', () => {
    const mail = favoriteNotice({ ...base, name: 'Bia <b>' }, url, settings);
    expect(mail.html).toContain('Whey &lt;Isolado&gt;');
    expect(mail.html).toContain('Olá, Bia &lt;b&gt;!');
    expect(mail.html).not.toContain('<Isolado>');
    expect(mail.text.trimEnd().endsWith(settings)).toBe(true);
  });
});

describe("an order's move, told to its customer", () => {
  const base = { name: 'Bia', shopName: 'Mutante & Cia', number: 12, pickup: false };
  const url = 'http://localhost:3000/mutante/conta/pedidos/12';
  const settings = 'http://localhost:3000/mutante/conta/perfil#avisos';

  it('names the move in the subject and the words, as the shop window reads a delivery or a pick-up', () => {
    expect(orderStatusChanged({ ...base, status: 'ACCEPTED' }, url, settings).subject).toBe('Mutante & Cia — pedido nº 12 confirmado');
    expect(orderStatusChanged({ ...base, status: 'OUT_FOR_DELIVERY' }, url, settings).text).toContain('saiu para entrega');
    expect(orderStatusChanged({ ...base, status: 'OUT_FOR_DELIVERY', pickup: true }, url, settings).subject).toBe('Mutante & Cia — pedido nº 12 pronto para retirar');
    expect(orderStatusChanged({ ...base, status: 'DELIVERED', pickup: true }, url, settings).text).toContain('foi retirado na loja');
    expect(orderStatusChanged({ ...base, status: 'CANCELLED' }, url, settings).subject).toBe('Mutante & Cia — pedido nº 12 cancelado');
  });

  it("leads to the order at the shop, escapes the names, and — last — how to stop it, with its own link", () => {
    const mail = orderStatusChanged({ ...base, name: 'Bia <b>', status: 'ACCEPTED' }, url, settings);

    expect(mail.text).toContain('Seu pedido nº 12 em Mutante & Cia foi confirmado.');
    expect(mail.html).toContain(`href="${url}"`);
    expect(mail.html).toContain('Olá, Bia &lt;b&gt;!');
    expect(mail.html).toContain('em Mutante &amp; Cia foi confirmado.');
    expect(mail.text).toMatch(/desmarque "Andamento dos pedidos" e salve:\n.*perfil#avisos$/);
    // The fine print after the button, never before it.
    expect(mail.html.indexOf(`href="${settings}"`)).toBeGreaterThan(mail.html.indexOf('Ver pedido'));
  });
});

describe('escapeHtml', () => {
  it('escapes the five characters that matter and nothing else', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
    expect(escapeHtml('Olá, café!')).toBe('Olá, café!');
  });
});

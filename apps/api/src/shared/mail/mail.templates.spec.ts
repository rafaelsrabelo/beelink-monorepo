// App
import { cashbackExpiring } from './cashback-expiring.template.js';
import { paymentApproved } from './payment-approved.template.js';
import { paymentRefunded } from './payment-refunded.template.js';
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

  /** BEELINK-239: a delivery makes the cashback usable, and the e-mail says how much and until when. */
  /** BEELINK-207: bee-link's own cancellation says why; the shop's and the customer's do not. */
  it('says why an order nobody paid was cancelled, and nothing of it on any other cancellation or move', () => {
    const unpaid = orderStatusChanged({ ...base, status: 'CANCELLED', unpaid: true }, url, settings);
    expect(unpaid.subject).toBe('Mutante & Cia — pedido nº 12 cancelado');
    expect(unpaid.text).toContain('foi cancelado. O pagamento não foi identificado dentro do prazo, e por isso o pedido foi cancelado automaticamente. Se você já pagou, fale com a loja.');
    expect(unpaid.html).toContain('O pagamento não foi identificado dentro do prazo');
    expect(orderStatusChanged({ ...base, status: 'CANCELLED' }, url, settings).text).not.toContain('pagamento');
    expect(orderStatusChanged({ ...base, status: 'ACCEPTED', unpaid: true }, url, settings).text).not.toContain('pagamento');
  });

  it('tells the cashback a delivery made usable, until the day it expires in Brasília', () => {
    // 02:59 UTC on the 31st is still the 30th in Brasília.
    const mail = orderStatusChanged({ ...base, status: 'DELIVERED', cashback: { amountCents: 504, expiresAt: new Date('2026-10-31T02:59:00.000Z') } }, url, settings);

    expect(mail.text).toContain('foi entregue.\n\nVocê ganhou R$\u00a05,04 de cashback para usar nas próximas compras na loja, até 30/10/2026.');
    expect(mail.html).toContain('Você ganhou R$\u00a05,04 de cashback');
    expect(orderStatusChanged({ ...base, status: 'DELIVERED', cashback: { amountCents: 100, expiresAt: null } }, url, settings).text).toContain('compras na loja.');
    expect(orderStatusChanged({ ...base, status: 'DELIVERED' }, url, settings).text).not.toContain('cashback');
  });

  /** BEELINK-258: leaving with a carrier is told as sent, with who carries it and how to follow it. */
  describe('leaving with a carrier', () => {
    const correios = { carrier: 'Correios', service: 'SEDEX', trackingCode: 'AB123456789BR', trackingUrl: 'https://rastreamento.correios.com.br/app/index.php' };

    it('says sent, by which carrier and service, with the code and the link to follow it', () => {
      const mail = orderStatusChanged({ ...base, status: 'OUT_FOR_DELIVERY', shipment: correios }, url, settings);

      expect(mail.subject).toBe('Mutante & Cia — pedido nº 12 enviado');
      expect(mail.text).toContain(
        'Seu pedido nº 12 em Mutante & Cia foi enviado pela transportadora Correios (SEDEX).\n\nCódigo de rastreio: AB123456789BR\nVer no site da transportadora:\nhttps://rastreamento.correios.com.br/app/index.php\n\nVeja o pedido:',
      );
      expect(mail.html).toContain('<p style="margin:12px 0 0">Código de rastreio: AB123456789BR</p>');
      expect(mail.html).toContain('<a href="https://rastreamento.correios.com.br/app/index.php" style="color:#52525b">Ver no site da transportadora</a>');
      expect(mail.text).not.toContain('saiu para entrega');
    });

    it('says what it was told: a carrier without its service, none at all, a link without a code', () => {
      expect(orderStatusChanged({ ...base, status: 'OUT_FOR_DELIVERY', shipment: { ...correios, service: null } }, url, settings).text).toContain('foi enviado pela transportadora Correios.');
      expect(orderStatusChanged({ ...base, status: 'OUT_FOR_DELIVERY', shipment: { ...correios, carrier: null, service: null } }, url, settings).text).toContain('foi enviado pela transportadora.');

      const linkOnly = orderStatusChanged({ ...base, status: 'OUT_FOR_DELIVERY', shipment: { ...correios, trackingCode: null } }, url, settings);
      expect(linkOnly.text).toContain('Ver no site da transportadora:\nhttps://rastreamento.correios.com.br');
      expect(linkOnly.text).not.toContain('Código de rastreio');
    });

    it('with no code yet, says where it will be — the e-mail is not sent again when it comes', () => {
      const mail = orderStatusChanged({ ...base, status: 'OUT_FOR_DELIVERY', shipment: { ...correios, trackingCode: null, trackingUrl: null } }, url, settings);

      expect(mail.subject).toBe('Mutante & Cia — pedido nº 12 enviado');
      expect(mail.text).toContain('pela transportadora Correios (SEDEX).\n\nO código de rastreio aparece no pedido assim que for informado.\n\nVeja o pedido:');
      expect(mail.text).not.toContain('Ver no site');
    });

    it('escapes what the shop or the carrier typed, and links only to https', () => {
      const typed = { carrier: 'Loggi <b>', service: 'Expresso & Cia', trackingCode: '<script>1</script>', trackingUrl: 'https://track.example/?a=1&b="2"' };
      const mail = orderStatusChanged({ ...base, status: 'OUT_FOR_DELIVERY', shipment: typed }, url, settings);
      expect(mail.html).toContain('pela transportadora Loggi &lt;b&gt; (Expresso &amp; Cia).');
      expect(mail.html).toContain('Código de rastreio: &lt;script&gt;1&lt;/script&gt;');
      expect(mail.html).toContain('href="https://track.example/?a=1&amp;b=&quot;2&quot;"');
      expect(mail.html).not.toContain('<script>');

      for (const trackingUrl of ['javascript:alert(1)', 'http://track.example/1', 'track.example/1']) {
        const unsafe = orderStatusChanged({ ...base, status: 'OUT_FOR_DELIVERY', shipment: { ...typed, trackingUrl } }, url, settings);
        expect(unsafe.html, trackingUrl).not.toContain(trackingUrl);
        expect(unsafe.text, trackingUrl).not.toContain('Ver no site');
      }
    });

    it('leaves a pick-up and every other move as they read', () => {
      const shipment = correios;
      expect(orderStatusChanged({ ...base, status: 'OUT_FOR_DELIVERY', pickup: true, shipment }, url, settings).text).toContain('está pronto para retirar.\n\nVeja o pedido:');
      for (const status of ['ACCEPTED', 'DELIVERED', 'CANCELLED'] as const) {
        const told = orderStatusChanged({ ...base, status, shipment }, url, settings);
        expect(told, status).toEqual(orderStatusChanged({ ...base, status }, url, settings));
      }
      expect(orderStatusChanged({ ...base, status: 'OUT_FOR_DELIVERY', shipment: null }, url, settings).subject).toBe('Mutante & Cia — pedido nº 12 saiu para entrega');
    });
  });
});

describe("a customer's cashback about to expire (BEELINK-241)", () => {
  it('says how much, where and until when — the day in Brasília — the way back, and how to stop it', () => {
    // 01:30 UTC on the 10th is still the 9th in Brasília.
    const mail = cashbackExpiring({ name: 'Bia', shopName: 'Mutante & Cia', amountCents: 1250, expiresAt: new Date('2026-10-10T01:30:00.000Z') }, 'http://localhost:3000/mutante', 'http://localhost:3000/mutante/conta/perfil#avisos');

    expect(mail.subject).toBe('Mutante & Cia — seu cashback de R$\u00a012,50 vence em 09/10/2026');
    expect(mail.text).toContain('Você tem R$\u00a012,50 de cashback em Mutante & Cia, que vence em 09/10/2026.');
    expect(mail.html).toContain('href="http://localhost:3000/mutante"');
    expect(mail.text).toMatch(/desmarque "Cashback" e salve:\n.*perfil#avisos$/);
  });
});

describe('escapeHtml', () => {
  it('escapes the five characters that matter and nothing else', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
    expect(escapeHtml('Olá, café!')).toBe('Olá, café!');
  });
});

describe("a payment approved, told to its customer (BEELINK-207)", () => {
  const url = 'https://beelink.biz/mutante/conta/pedidos/12';
  const settings = 'https://beelink.biz/mutante/conta/perfil#avisos';
  const base = { name: 'Bia', shopName: 'Mutante & Cia', number: 12, amountCents: 15990, method: 'PIX' as const, installments: 1 };

  it('names the shop and the order in the subject, and says how much and how it was paid', () => {
    const pix = paymentApproved(base, url, settings);
    expect(pix.subject).toBe('Mutante & Cia — pagamento do pedido nº 12 aprovado');
    expect(pix.text).toMatch(/O pagamento do seu pedido nº 12 em Mutante & Cia foi aprovado: R\$\s159,90 no Pix\./);
    expect(paymentApproved({ ...base, method: 'CREDIT_CARD' }, url, settings).text).toContain('no cartão de crédito.');
    expect(paymentApproved({ ...base, method: 'CREDIT_CARD', installments: 3 }, url, settings).text).toContain('no cartão de crédito, em 3x.');
  });

  it('leads to the order, escapes the names, and ends on how to stop these notices', () => {
    const mail = paymentApproved({ ...base, name: 'Bia <b>' }, url, settings);
    expect(mail.text).toContain(`Veja o pedido:\n${url}`);
    expect(mail.text.trimEnd().endsWith(settings)).toBe(true);
    expect(mail.html).toContain('Bia &lt;b&gt;');
    expect(mail.html).toContain('Mutante &amp; Cia');
    expect(mail.html).not.toContain('<b>');
    expect(mail.html).toContain(`href="${settings}"`);
  });
});

describe('the payment refunded e-mail (BEELINK-208)', () => {
  const base = { name: 'Bia', shopName: 'Lessari', number: 7, amountCents: 5990, paidCents: 5990, method: 'PIX' as const, done: true };
  const url = 'https://beelink.biz/lessari/conta/pedidos/7';
  const settings = 'https://beelink.biz/lessari/conta/perfil#avisos';

  it('tells a whole refund from a part of it, and when the money shows', () => {
    const whole = paymentRefunded(base, url, settings);
    expect(whole.subject).toBe('Lessari — estorno do pagamento do pedido nº 7');
    expect(whole.text).toMatch(/Lessari estornou o pagamento do seu pedido nº 7: R\$\s59,90\./);
    expect(whole.text).toContain('O valor volta para a conta de onde o Pix saiu.');
    expect(whole.text).toContain(url);
    expect(whole.text).toContain(settings);

    const part = paymentRefunded({ ...base, amountCents: 1990 }, url, settings);
    expect(part.text).toMatch(/estornou parte do pagamento do seu pedido nº 7: R\$\s19,90 de R\$\s59,90\./);
    expect(paymentRefunded({ ...base, done: false }, url, settings).text).toContain('O estorno está em processamento');
    expect(paymentRefunded({ ...base, method: 'CREDIT_CARD', done: false }, url, settings).text).toContain('até 10 dias úteis para aparecer na fatura');
  });

  it("escapes the customer's and the shop's names in the HTML", () => {
    const mail = paymentRefunded({ ...base, name: 'Bia <b>', shopName: 'Lessari & Cia' }, url, settings);
    expect(mail.html).toContain('Bia &lt;b&gt;');
    expect(mail.html).toContain('Lessari &amp; Cia estornou');
    expect(mail.html).not.toContain('<b>');
  });
});

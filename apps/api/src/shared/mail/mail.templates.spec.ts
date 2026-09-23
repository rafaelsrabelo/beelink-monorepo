// App
import { escapeHtml, leadReceived } from './mail.templates.js';

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

describe('escapeHtml', () => {
  it('escapes the five characters that matter and nothing else', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe('&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;');
    expect(escapeHtml('Olá, café!')).toBe('Olá, café!');
  });
});

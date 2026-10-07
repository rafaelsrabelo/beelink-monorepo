// App
import { backofficeSignInCode } from './backoffice-code.template.js';

describe('the backoffice sign-in code e-mail', () => {
  const mail = backofficeSignInCode('Ana Souza', '042817', 10);

  it('carries the code in its body, alone on a line a person can read', () => {
    expect(mail.text).toMatch(/^042817$/m);
    expect(mail.html).toContain('042817');
    expect(mail.text).toContain('10 minutos');
    expect(mail.text).toContain('só pode ser usado uma vez');
  });

  it('keeps the code out of the subject, which a lock screen shows and the mailer logs', () => {
    expect(mail.subject).toBe('Seu código de acesso ao backoffice');
    expect(mail.subject).not.toMatch(/[0-9]/);
  });

  it('escapes the name somebody typed', () => {
    const typed = backofficeSignInCode('Ana <b>', '042817', 10);

    expect(typed.html).toContain('Ana &lt;b&gt;');
    expect(typed.html).not.toContain('Ana <b>');
  });
});

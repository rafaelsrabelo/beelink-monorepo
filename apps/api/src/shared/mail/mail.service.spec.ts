// Libs
import { createTransport } from 'nodemailer';

// App
import { env } from '../config/env.js';
import { MailService } from './mail.service.js';

vi.mock('nodemailer', () => ({ createTransport: vi.fn() }));

describe('MailService at boot (BEELINK-168)', () => {
  const verify = vi.fn();
  const nodeEnv = env.NODE_ENV;

  beforeEach(() => {
    verify.mockReset();
    vi.mocked(createTransport).mockReturnValue({ verify, sendMail: vi.fn() } as unknown as ReturnType<typeof createTransport>);
  });

  afterEach(() => {
    env.NODE_ENV = nodeEnv;
  });

  it('asks the provider in production whether it takes the login, and logs a refusal without throwing', async () => {
    env.NODE_ENV = 'production';
    verify.mockRejectedValue(Object.assign(new Error('Invalid login: 535 Authentication Failed'), { code: 'EAUTH' }));
    const service = new MailService();
    const refused = vi.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    expect(() => service.onApplicationBootstrap()).not.toThrow();

    await vi.waitFor(() => expect(refused).toHaveBeenCalledWith(expect.objectContaining({ err: expect.objectContaining({ code: 'EAUTH' }) }), expect.stringContaining('refused')));
    expect(verify).toHaveBeenCalledOnce();
  });

  it('says so when the provider takes the login', async () => {
    env.NODE_ENV = 'production';
    verify.mockResolvedValue(true);
    const service = new MailService();
    const took = vi.spyOn(service['logger'], 'log').mockImplementation(() => undefined);

    service.onApplicationBootstrap();

    await vi.waitFor(() => expect(took).toHaveBeenCalledWith(expect.stringContaining('took the login')));
  });

  it('asks nothing outside production, where Mailpit takes everything', () => {
    env.NODE_ENV = 'development';

    new MailService().onApplicationBootstrap();

    expect(verify).not.toHaveBeenCalled();
  });
});

describe("MailService, a courier's application acknowledged (BEELINK-326)", () => {
  const sendMail = vi.fn();
  const mailFrom = env.MAIL_FROM;

  beforeEach(() => {
    sendMail.mockReset();
    vi.mocked(createTransport).mockReturnValue({ verify: vi.fn(), sendMail } as unknown as ReturnType<typeof createTransport>);
    env.MAIL_FROM = 'Beelink <nao-responda@beelink.test>';
  });

  afterEach(() => {
    env.MAIL_FROM = mailFrom;
  });

  it("goes from bee-link's own sender, under no shop's name, to the address of the application", async () => {
    sendMail.mockResolvedValue({});

    await expect(new MailService().sendCourierApplicationReceived('zuleica.tavares@exemplo.test', { name: 'Zuleica Tavares', city: 'Fortaleza' })).resolves.toBe(true);

    expect(sendMail).toHaveBeenCalledOnce();
    expect(sendMail.mock.calls[0]![0]).toMatchObject({
      from: 'Beelink <nao-responda@beelink.test>',
      to: 'zuleica.tavares@exemplo.test',
      subject: 'Recebemos o seu cadastro de entregador na Beelink',
      text: expect.stringContaining('Olá, Zuleica.'),
      html: expect.stringContaining('Olá, Zuleica.'),
    });
  });

  it('answers that it did not go, without throwing, when the provider refuses', async () => {
    sendMail.mockRejectedValue(new Error('connect ECONNREFUSED'));
    const service = new MailService();
    vi.spyOn(service['logger'], 'error').mockImplementation(() => undefined);

    await expect(service.sendCourierApplicationReceived('zuleica.tavares@exemplo.test', { name: 'Zuleica Tavares', city: 'Fortaleza' })).resolves.toBe(false);
  });
});

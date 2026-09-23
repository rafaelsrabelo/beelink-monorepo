// The limit is read when the controller module loads, so it has to be lowered before any import.
vi.hoisted(() => {
  process.env.LEAD_RATE_LIMIT_MAX = '3';
  process.env.LEAD_RATE_LIMIT_WINDOW = '1 minute';
});

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type { ApiErrorBody, AuthSession, LeadPage, Section } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox, waitForMessage } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

/** A site: no WhatsApp asked, a template chosen. */
const siteBody = {
  name: 'Asfalto Norte',
  slug: 'asfalto-norte',
  type: 'INSTITUTIONAL',
  template: 'servicos-b2b',
  socialNetworks: {},
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
};

describe('leads', () => {
  let app: NestFastifyApplication;
  let owner: AuthSession;
  let ownerEmail: string;
  let stranger: AuthSession;
  let formId: string;
  let address = 0;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(app.get(PrismaService));
    await clearInbox();
    ownerEmail = newEmail('dona');
    owner = await signUpAndSignIn(app, ownerEmail);
    stranger = await signUpAndSignIn(app, newEmail('estranha'));

    const created = await call('POST', '/api/stores', owner, siteBody);
    if (created.statusCode !== 201) throw new Error(`POST stores answered ${created.statusCode}: ${created.payload}`);

    const sections = (await call('GET', '/api/stores/asfalto-norte/sections', owner)).json<Section[]>();
    const form = sections.flatMap((section) => section.components).find((component) => component.kind === 'CONTACT');
    if (!form) throw new Error('The template seeded no contact form');
    formId = form.id;

    // A fresh address per test: the limiter's bucket lives in the app, not in the database.
    address += 1;
  });

  function call(
    method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
    url: string,
    session?: AuthSession,
    payload?: object,
  ) {
    return app.inject({
      method,
      url,
      headers: {
        ...(session ? { authorization: `Bearer ${session.accessToken}` } : {}),
        'x-forwarded-for': `203.0.113.${address}`,
      },
      ...(payload ? { payload } : {}),
    });
  }

  const send = (body: object) => call('POST', '/api/stores/asfalto-norte/contact', undefined, body);

  const leads = async () => (await call('GET', '/api/stores/asfalto-norte/leads', owner)).json<LeadPage>();

  it('takes a visitor’s form, lists it for the owner and e-mails them', async () => {
    const response = await send({
      componentId: formId,
      name: 'Carlos Lima',
      answers: { email: 'Carlos@Exemplo.test', telefone: '(11) 98888-7777', empresa: 'Obras SA', mensagem: '30t por semana' },
    });

    expect(response.statusCode).toBe(204);

    const page = await leads();
    expect(page.total).toBe(1);
    expect(page.leads[0]).toMatchObject({
      componentId: formId,
      name: 'Carlos Lima',
      email: 'carlos@exemplo.test',
      phone: '11988887777',
      status: 'NEW',
    });
    expect(page.leads[0]!.answers.map((answer) => answer.label)).toEqual(['E-mail', 'Telefone', 'Empresa', 'O que você precisa?']);

    const mail = await waitForMessage(ownerEmail, 10_000, 'Novo contato');
    expect(mail.Subject).toBe('Novo contato pelo site Asfalto Norte');
    expect(mail.Text).toContain('Empresa: Obras SA');
    expect(mail.Text).toContain('/admin/asfalto-norte/leads');
  });

  it('answers the trap like a save and keeps nothing', async () => {
    const response = await send({ componentId: formId, name: 'Robot', answers: {}, website: 'http://spam.test' });

    expect(response.statusCode).toBe(204);
    expect((await leads()).total).toBe(0);
  });

  it('refuses answers that do not fit the form, naming the field', async () => {
    const response = await send({ componentId: formId, name: 'Carlos', answers: { email: 'a@b.co' } });

    expect(response.statusCode).toBe(400);
    const body = response.json<ApiErrorBody>();
    expect(body.errorCode).toBe('LEAD_ANSWER_INVALID');
    expect(body.message).toMatch(/Telefone: campo obrigatório/);
  });

  it('refuses a form the site does not have', async () => {
    const response = await send({
      componentId: '0199c000-0000-7000-8000-00000000dead',
      name: 'Carlos',
      answers: { email: 'a@b.co', telefone: '11988887777', mensagem: 'oi' },
    });

    expect(response.statusCode).toBe(404);
    expect(response.json<ApiErrorBody>().errorCode).toBe('LEAD_FORM_NOT_FOUND');
  });

  it('keeps the list to the owner, and lets them move and forget a lead', async () => {
    await send({ componentId: formId, name: 'Carlos', answers: { email: 'a@b.co', telefone: '11988887777', mensagem: 'oi' } });
    const [lead] = (await leads()).leads;

    const refused = await call('GET', '/api/stores/asfalto-norte/leads', stranger);
    expect(refused.statusCode).toBe(403);

    const moved = await call('PATCH', `/api/stores/asfalto-norte/leads/${lead!.id}`, owner, { status: 'WON' });
    expect(moved.statusCode).toBe(200);
    expect((await leads()).leads[0]!.status).toBe('WON');

    const forgotten = await call('DELETE', `/api/stores/asfalto-norte/leads/${lead!.id}`, owner);
    expect(forgotten.statusCode).toBe(204);
    expect((await leads()).total).toBe(0);
  });

  it('limits one address, in the same error envelope as everything else', async () => {
    const body = { componentId: formId, name: 'Carlos', answers: { email: 'a@b.co', telefone: '11988887777', mensagem: 'oi' } };
    const allowed = [await send(body), await send(body), await send(body)];
    const blocked = await send(body);

    expect(allowed.map((response) => response.statusCode)).toEqual([204, 204, 204]);
    expect(blocked.statusCode).toBe(429);
    expect(blocked.json<ApiErrorBody>()).toMatchObject({ statusCode: 429, errorCode: 'RATE_LIMITED' });
  });
});

// Types
import type { MailService } from '../../shared/mail/mail.service.js';
import type { PrismaService } from '../../shared/prisma/prisma.service.js';
import type { StoresService } from '../stores/stores.service.js';

// App
import { LeadsService } from './leads.service.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const FORM = '0199c000-0000-7000-8000-000000000001';
const LEAD = '0199d000-0000-7000-8000-000000000001';

const FIELDS = [
  { id: 'email', label: 'E-mail', type: 'EMAIL', required: true },
  { id: 'telefone', label: 'Telefone', type: 'PHONE', required: false },
  { id: 'mensagem', label: 'Mensagem', type: 'TEXTAREA', required: false },
];

function leadRow(over: Record<string, unknown> = {}) {
  return {
    id: LEAD,
    storeId: STORE,
    componentId: FORM,
    name: 'Carlos',
    email: 'carlos@exemplo.test',
    phone: null,
    answers: [{ fieldId: 'email', label: 'E-mail', type: 'EMAIL', value: 'carlos@exemplo.test' }],
    status: 'NEW',
    createdAt: new Date('2026-09-23T12:00:00.000Z'),
    updatedAt: new Date('2026-09-23T12:00:00.000Z'),
    ...over,
  };
}

/** Collaborators by hand, the way every other service spec here builds them. */
function build(found: { form?: boolean; items?: unknown; leadOfAnotherSite?: boolean } = {}) {
  const create = vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => leadRow(data));
  const sendLeadReceived = vi.fn().mockResolvedValue(undefined);

  const prisma = {
    storeComponent: {
      findFirst: vi.fn().mockResolvedValue(
        found.form === false
          ? null
          : {
              id: FORM,
              items: found.items ?? FIELDS,
              store: { slug: 'asfalto-norte', name: 'Asfalto Norte', owner: { name: 'Ana', email: 'ana@exemplo.test' } },
            },
      ),
    },
    lead: {
      create,
      findMany: vi.fn().mockResolvedValue([leadRow()]),
      count: vi.fn().mockResolvedValue(1),
      findUnique: vi.fn().mockResolvedValue({ storeId: found.leadOfAnotherSite ? 'another-site' : STORE }),
      update: vi.fn().mockImplementation(({ data }: { data: Record<string, unknown> }) => leadRow(data)),
      delete: vi.fn().mockResolvedValue({}),
    },
    $transaction: vi.fn().mockImplementation((calls: Promise<unknown>[]) => Promise.all(calls)),
  } as unknown as PrismaService;

  const stores = {
    publicStoreId: vi.fn().mockResolvedValue(STORE),
    ownedStoreId: vi.fn().mockResolvedValue(STORE),
  } as unknown as StoresService;

  const mail = { sendLeadReceived } as unknown as MailService;

  return { service: new LeadsService(prisma, stores, mail), prisma, create, sendLeadReceived };
}

describe('LeadsService — a visitor writes in', () => {
  it('writes the lead with the e-mail and phone lifted out, then tells the owner', async () => {
    const { service, create, sendLeadReceived } = build();

    await service.receive('asfalto-norte', {
      componentId: FORM,
      name: 'Carlos',
      answers: { email: 'Carlos@Exemplo.test', telefone: '11 98888-7777', mensagem: 'Preciso de 30t' },
    });

    expect(create.mock.calls[0]![0].data).toMatchObject({
      storeId: STORE,
      componentId: FORM,
      name: 'Carlos',
      email: 'carlos@exemplo.test',
      phone: '11988887777',
    });
    expect(sendLeadReceived).toHaveBeenCalledWith(
      'ana@exemplo.test',
      expect.objectContaining({ ownerName: 'Ana', siteName: 'Asfalto Norte', siteSlug: 'asfalto-norte' }),
    );
  });

  /** The trap: a field no person sees was filled in. Success is answered; nothing happens. */
  it('answers a body that fell into the trap as if saved, and saves nothing', async () => {
    const { service, create, sendLeadReceived, prisma } = build();

    await expect(
      service.receive('asfalto-norte', { componentId: FORM, name: 'Bot', answers: {}, website: 'http://spam' }),
    ).resolves.toBeUndefined();

    expect(create).not.toHaveBeenCalled();
    expect(sendLeadReceived).not.toHaveBeenCalled();
    expect(prisma.storeComponent.findFirst).not.toHaveBeenCalled();
  });

  it('refuses a form this site does not have, or has hidden', async () => {
    const { service, prisma } = build({ form: false });

    await expect(
      service.receive('asfalto-norte', { componentId: FORM, name: 'Carlos', answers: { email: 'a@b.co' } }),
    ).rejects.toMatchObject({ response: { errorCode: 'LEAD_FORM_NOT_FOUND' } });

    // Hidden is part of the question, not a second read: the form has to be shown to be posted to.
    expect(prisma.storeComponent.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ kind: 'CONTACT', isActive: true, section: { isActive: true } }),
      }),
    );
  });

  it('refuses answers that do not fit the form, before writing anything', async () => {
    const { service, create } = build();

    await expect(
      service.receive('asfalto-norte', { componentId: FORM, name: 'Carlos', answers: { mensagem: 'sem e-mail' } }),
    ).rejects.toMatchObject({ response: { errorCode: 'LEAD_ANSWER_INVALID' } });

    expect(create).not.toHaveBeenCalled();
  });

  /** A form whose stored fields no longer parse asks nothing, so any answer is to an unknown field. */
  it('treats a form whose fields no longer parse as a form with no fields', async () => {
    const { service } = build({ items: { broken: true } });

    await expect(
      service.receive('asfalto-norte', { componentId: FORM, name: 'Carlos', answers: { email: 'a@b.co' } }),
    ).rejects.toMatchObject({ response: { errorCode: 'LEAD_ANSWER_INVALID' } });
  });
});

describe('LeadsService — the owner reads', () => {
  it('lists newest first, one site at a time, echoing the bounds it used', async () => {
    const { service, prisma } = build();

    const page = await service.list('asfalto-norte', 'user-1', { pageSize: 500, page: 0 });

    expect(prisma.lead.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { storeId: STORE }, orderBy: { createdAt: 'desc' }, skip: 0, take: 100 }),
    );
    expect(page).toMatchObject({ total: 1, page: 1, pageSize: 100 });
    expect(page.leads[0]).toMatchObject({ name: 'Carlos', email: 'carlos@exemplo.test', status: 'NEW' });
  });

  it('filters by status when asked', async () => {
    const { service, prisma } = build();

    await service.list('asfalto-norte', 'user-1', { status: 'WON' });

    expect(prisma.lead.count).toHaveBeenCalledWith({ where: { storeId: STORE, status: 'WON' } });
  });

  it('moves a lead along', async () => {
    const { service, prisma } = build();

    const lead = await service.updateStatus('asfalto-norte', 'user-1', LEAD, { status: 'CONTACTED' });

    expect(prisma.lead.update).toHaveBeenCalledWith({ where: { id: LEAD }, data: { status: 'CONTACTED' } });
    expect(lead.status).toBe('CONTACTED');
  });

  /** Another site's lead answers 404, not 403: this site does not have one by that id. */
  it('refuses to touch another site’s lead', async () => {
    const { service, prisma } = build({ leadOfAnotherSite: true });

    await expect(service.remove('asfalto-norte', 'user-1', LEAD)).rejects.toMatchObject({
      response: { errorCode: 'LEAD_NOT_FOUND' },
    });
    expect(prisma.lead.delete).not.toHaveBeenCalled();
  });
});

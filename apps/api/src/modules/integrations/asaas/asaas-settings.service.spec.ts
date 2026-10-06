// Nest
import { ForbiddenException, type HttpException } from '@nestjs/common';

// Types
import type { AsaasSettingsPayload } from '@harness-monorepo/contracts';
import type { PrismaService } from '../../../shared/prisma/prisma.service.js';
import type { StoresService } from '../../stores/stores.service.js';

// App
import { AsaasSettingsService } from './asaas-settings.service.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const SAVED_AT = new Date('2026-10-05T12:00:00.000Z');

type Row = AsaasSettingsPayload & { storeId: string; updatedAt: Date };

/** One shop's `asaas_settings`, in memory, behind the calls the service makes. */
function build(existing: Row | null = null) {
  let row = existing;
  const asaasSettings = {
    findUnique: vi.fn(async () => row),
    upsert: vi.fn(async ({ create, update }: { create: Omit<Row, 'updatedAt'>; update: AsaasSettingsPayload }) => {
      row = { ...(row ? { ...row, ...update } : create), updatedAt: SAVED_AT };
      return row;
    }),
  };
  const stores = { ownedStoreId: vi.fn().mockResolvedValue(STORE) };
  const service = new AsaasSettingsService({ asaasSettings } as unknown as PrismaService, stores as unknown as StoresService);
  return { service, asaasSettings, stores, row: () => row };
}

const codeOf = (error: unknown) => ((error as HttpException).getResponse() as { errorCode: string }).errorCode;
const statusOf = (error: unknown) => (error as HttpException).getStatus();

describe('AsaasSettingsService', () => {
  /** An instalment's fee is the shop's: nothing past one is offered until the shop says so. */
  it('answers the defaults for a shop that never saved: Pix and card in full, and paying on delivery', async () => {
    const { service, stores } = build();

    expect(await service.settings('lessari', 'owner')).toEqual({ pix: true, card: true, maxInstallments: 1, offline: true, updatedAt: null });
    expect(stores.ownedStoreId).toHaveBeenCalledWith('lessari', 'owner');
  });

  it('answers what the shop saved, with when', async () => {
    const { service } = build({ storeId: STORE, pix: false, card: true, maxInstallments: 6, offline: false, updatedAt: SAVED_AT });

    expect(await service.settings('lessari', 'owner')).toEqual({ pix: false, card: true, maxInstallments: 6, offline: false, updatedAt: '2026-10-05T12:00:00.000Z' });
  });

  it('saves the choices whole, in a row of the shop alone, and answers them as they now stand', async () => {
    const { service, asaasSettings, row } = build();
    const choices = { pix: true, card: true, maxInstallments: 12, offline: false };

    expect(await service.save('lessari', 'owner', choices)).toEqual({ ...choices, updatedAt: '2026-10-05T12:00:00.000Z' });
    expect(asaasSettings.upsert).toHaveBeenCalledWith({ where: { storeId: STORE }, create: { storeId: STORE, ...choices }, update: choices });
    expect(row()).toMatchObject({ storeId: STORE, ...choices });
  });

  it('writes nothing the payload does not name, whatever else rides on it', async () => {
    const { service, asaasSettings } = build();
    const padded = { pix: true, card: false, maxInstallments: 3, offline: true, updatedAt: '1999-01-01T00:00:00.000Z', storeId: 'another-shop' } as AsaasSettingsPayload;

    await service.save('lessari', 'owner', padded);

    expect(asaasSettings.upsert.mock.calls[0]?.[0].update).toEqual({ pix: true, card: false, maxInstallments: 3, offline: true });
    expect(asaasSettings.upsert.mock.calls[0]?.[0].create.storeId).toBe(STORE);
  });

  /** The number is the shop's choice for when the card is on: switching the card off does not forget it. */
  it('keeps the instalments of a card that is switched off', async () => {
    const { service, row } = build({ storeId: STORE, pix: true, card: true, maxInstallments: 10, offline: true, updatedAt: SAVED_AT });

    await service.save('lessari', 'owner', { pix: true, card: false, maxInstallments: 10, offline: true });

    expect(row()).toMatchObject({ card: false, maxInstallments: 10 });
  });

  it.each([
    ['Pix alone', { pix: true, card: false, offline: false }],
    ['the card alone', { pix: false, card: true, offline: false }],
    ['paying on delivery alone', { pix: false, card: false, offline: true }],
  ])('takes %s as the one way left on', async (_, ways) => {
    const { service } = build();

    expect(await service.save('lessari', 'owner', { ...ways, maxInstallments: 1 })).toMatchObject(ways);
  });

  it('refuses every way switched off, and writes nothing', async () => {
    const { service, asaasSettings } = build();

    const refused = await service.save('lessari', 'owner', { pix: false, card: false, maxInstallments: 1, offline: false }).catch((error: unknown) => error);

    expect([statusOf(refused), codeOf(refused)]).toEqual([400, 'ASAAS_SETTINGS_INVALID']);
    expect(asaasSettings.upsert).not.toHaveBeenCalled();
  });

  /** Whoever does not own the shop is told only that: not what its rules would have refused. */
  it("refuses whoever does not own the shop before reading or judging anything", async () => {
    const { service, asaasSettings, stores } = build();
    stores.ownedStoreId.mockRejectedValue(new ForbiddenException({ errorCode: 'STORE_FORBIDDEN', message: 'Not your shop' }));

    const read = await service.settings('lessari', 'stranger').catch((error: unknown) => error);
    const saved = await service.save('lessari', 'stranger', { pix: false, card: false, maxInstallments: 1, offline: false }).catch((error: unknown) => error);

    expect([codeOf(read), codeOf(saved)]).toEqual(['STORE_FORBIDDEN', 'STORE_FORBIDDEN']);
    expect(asaasSettings.findUnique).not.toHaveBeenCalled();
    expect(asaasSettings.upsert).not.toHaveBeenCalled();
  });
});

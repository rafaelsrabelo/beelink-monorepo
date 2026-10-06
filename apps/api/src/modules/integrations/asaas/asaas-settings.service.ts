// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { AsaasSettings, AsaasSettingsPayload } from '@harness-monorepo/contracts';
import type { AsaasSettingsModel } from '../../../generated/prisma/models.js';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { StoresService } from '../../stores/stores.service.js';
import { integrationError } from '../integrations.constants.js';

/**
 * What a shop that never saved is paid with: Pix and card, and paying on delivery as before Asaas.
 * In full — an instalment's fee is the shop's, so going past one is the shop's own choice.
 */
export const ASAAS_SETTINGS_DEFAULTS: AsaasSettings = { pix: true, card: true, maxInstallments: 1, offline: true, updatedAt: null };

function settingsOf(row: AsaasSettingsModel | null): AsaasSettings {
  if (!row) return ASAAS_SETTINGS_DEFAULTS;
  return { pix: row.pix, card: row.card, maxInstallments: row.maxInstallments, offline: row.offline, updatedAt: row.updatedAt.toISOString() };
}

/**
 * How a shop is paid once its Asaas account is connected (BEELINK-203): Pix, credit card and in up to
 * how many instalments, and whether paying on delivery or at pickup stays. The choices are the shop's,
 * kept in a row of their own: connecting again or disconnecting touches the connection and leaves
 * them, and they are read and saved with no connection at all.
 */
@Injectable()
export class AsaasSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async settings(storeSlug: string, userId: string): Promise<AsaasSettings> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return settingsOf(await this.prisma.asaasSettings.findUnique({ where: { storeId } }));
  }

  /** Saved whole. The shop is checked first: whoever does not own it learns nothing of its rules. */
  async save(storeSlug: string, userId: string, payload: AsaasSettingsPayload): Promise<AsaasSettings> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    if (!payload.pix && !payload.card && !payload.offline) {
      throw new BadRequestException(integrationError('ASAAS_SETTINGS_INVALID', 'At least one way of being paid stays on'));
    }

    const data = { pix: payload.pix, card: payload.card, maxInstallments: payload.maxInstallments, offline: payload.offline };
    return settingsOf(await this.prisma.asaasSettings.upsert({ where: { storeId }, create: { storeId, ...data }, update: data }));
  }
}

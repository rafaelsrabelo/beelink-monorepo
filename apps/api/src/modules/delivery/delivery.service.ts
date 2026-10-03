// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { DeliverySettings, DeliverySettingsPayload } from '@harness-monorepo/contracts';
import type { DeliveryBandModel, DeliverySettingsModel } from '../../generated/prisma/models.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { bandsRefusal, radiusOf } from './delivery-bands.js';
import { DELIVERY_DEFAULTS, deliveryError } from './delivery.constants.js';

type StoredSettings = DeliverySettingsModel & { bands: DeliveryBandModel[] };

const BANDS_IN_ORDER = { bands: { orderBy: { upToMeters: 'asc' } } } as const;

function settingsOf(row: StoredSettings | null): DeliverySettings {
  if (!row) return DELIVERY_DEFAULTS;
  const bands = row.bands.map(({ upToMeters, feeCents, windowFromMinutes, windowToMinutes }) => ({ upToMeters, feeCents, windowFromMinutes, windowToMinutes }));
  return {
    pickupEnabled: row.pickupEnabled,
    ownDeliveryEnabled: row.ownDeliveryEnabled,
    bands,
    radiusMeters: radiusOf(bands),
    freeAboveCents: row.freeAboveCents,
    carriersEnabled: row.carriersEnabled,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * How a shop gets an order to its customer (BEELINK-175), as its owner sets it: pickup, its own
 * delivery by distance bands, and carriers — each on or off apart. The quote (BEELINK-176) and the
 * checkout read the same rules through `forStore`.
 */
@Injectable()
export class DeliveryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async settings(storeSlug: string, userId: string): Promise<DeliverySettings> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return this.forStore(storeId);
  }

  /** The rules of a shop already found — the defaults until its owner first saves. */
  async forStore(storeId: string): Promise<DeliverySettings> {
    return settingsOf(await this.prisma.deliverySettings.findUnique({ where: { storeId }, include: BANDS_IN_ORDER }));
  }

  /** Saved whole: the bands are replaced in the same transaction, so a read never sees half of them. */
  async save(storeSlug: string, userId: string, payload: DeliverySettingsPayload): Promise<DeliverySettings> {
    const refusal = bandsRefusal(payload.bands);
    if (refusal) throw new BadRequestException(deliveryError('DELIVERY_SETTINGS_INVALID', refusal));

    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const rules = {
      pickupEnabled: payload.pickupEnabled,
      ownDeliveryEnabled: payload.ownDeliveryEnabled,
      freeAboveCents: payload.freeAboveCents,
      carriersEnabled: payload.carriersEnabled,
    };
    const bands = payload.bands.map(({ upToMeters, feeCents, windowFromMinutes, windowToMinutes }) => ({ upToMeters, feeCents, windowFromMinutes, windowToMinutes }));

    const saved = await this.prisma.$transaction(async (tx) => {
      await tx.deliverySettings.upsert({ where: { storeId }, create: { storeId, ...rules }, update: rules });
      await tx.deliveryBand.deleteMany({ where: { storeId } });
      await tx.deliveryBand.createMany({ data: bands.map((band) => ({ storeId, ...band })) });
      return tx.deliverySettings.findUniqueOrThrow({ where: { storeId }, include: BANDS_IN_ORDER });
    });
    return settingsOf(saved);
  }
}

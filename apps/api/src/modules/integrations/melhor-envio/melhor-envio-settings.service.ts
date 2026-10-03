// Nest
import { BadGatewayException, Injectable } from '@nestjs/common';

// Types
import type { MelhorEnvioAccountOverview, MelhorEnvioSettings, MelhorEnvioSettingsPayload } from '@harness-monorepo/contracts';
import type { MelhorEnvioSettingsModel } from '../../../generated/prisma/models.js';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { StoresService } from '../../stores/stores.service.js';
import { integrationError } from '../integrations.constants.js';
import { melhorEnvioConfig, MelhorEnvioClient, MelhorEnvioUnreachable } from './melhor-envio.client.js';
import { MelhorEnvioService } from './melhor-envio.service.js';

/** What a shop that never saved its carrier settings ships with: every service, a day to post, no default parcel. */
const DEFAULTS: MelhorEnvioSettings = { handlingDays: 1, serviceIds: null, defaultPackage: null, senderDocument: null, senderStateRegister: null, updatedAt: null };

function settingsOf(row: MelhorEnvioSettingsModel | null): MelhorEnvioSettings {
  if (!row) return DEFAULTS;
  const { packageWeightGrams: weightGrams, packageLengthMm: lengthMm, packageWidthMm: widthMm, packageHeightMm: heightMm } = row;
  return {
    handlingDays: row.handlingDays,
    serviceIds: row.serviceIds,
    defaultPackage: weightGrams !== null && lengthMm !== null && widthMm !== null && heightMm !== null ? { weightGrams, lengthMm, widthMm, heightMm } : null,
    senderDocument: row.senderDocument,
    senderStateRegister: row.senderStateRegister,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/**
 * How a shop ships by carrier (BEELINK-183): what its Melhor Envio account offers and holds, read
 * there and then with the shop's token, and the choices the shop keeps here — the services it offers,
 * the days it takes to post, the parcel for a product with no size.
 */
@Injectable()
export class MelhorEnvioSettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly connection: MelhorEnvioService,
    private readonly melhorEnvio: MelhorEnvioClient,
  ) {}

  /** The wallet and the services, never kept: both change at Melhor Envio, outside bee-link. */
  async account(storeSlug: string, userId: string): Promise<MelhorEnvioAccountOverview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const token = await this.connection.accessTokenFor(storeId);
    // `accessTokenFor` already refused a deployment with no app.
    const config = melhorEnvioConfig()!;

    try {
      const [balanceCents, services] = await Promise.all([this.melhorEnvio.balanceCents(config, token), this.melhorEnvio.services(config, token)]);
      return { balanceCents, services };
    } catch (error) {
      // A no here — a scope missing, an account blocked — is no answer the panel can act on either.
      throw new BadGatewayException(integrationError('INTEGRATION_UNREACHABLE', error instanceof MelhorEnvioUnreachable ? 'Melhor Envio did not answer' : 'Melhor Envio refused to say'));
    }
  }

  async settings(storeSlug: string, userId: string): Promise<MelhorEnvioSettings> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return settingsOf(await this.prisma.melhorEnvioSettings.findUnique({ where: { storeId } }));
  }

  /** Saved whole. Nothing here asks Melhor Envio: the choices are the shop's, connected or not. */
  async save(storeSlug: string, userId: string, payload: MelhorEnvioSettingsPayload): Promise<MelhorEnvioSettings> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const parcel = payload.defaultPackage;
    const data = {
      handlingDays: payload.handlingDays,
      serviceIds: [...payload.serviceIds].sort((a, b) => a - b),
      packageWeightGrams: parcel?.weightGrams ?? null,
      packageLengthMm: parcel?.lengthMm ?? null,
      packageWidthMm: parcel?.widthMm ?? null,
      packageHeightMm: parcel?.heightMm ?? null,
      // Absent keeps what is saved: the panel's form may not hold the sender yet.
      ...(payload.senderDocument !== undefined ? { senderDocument: payload.senderDocument } : {}),
      ...(payload.senderStateRegister !== undefined ? { senderStateRegister: payload.senderStateRegister } : {}),
    };
    return settingsOf(await this.prisma.melhorEnvioSettings.upsert({ where: { storeId }, create: { storeId, ...data }, update: data }));
  }
}

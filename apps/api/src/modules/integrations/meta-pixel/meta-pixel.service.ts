// Nest
import { ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';

// Types
import type { MetaPixelConnection, MetaPixelConnectPayload, MetaPixelTestEventResult, MetaPixelTokenPayload } from '@harness-monorepo/contracts';

// App
import { env } from '../../../shared/config/env.js';
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { StoresService } from '../../stores/stores.service.js';
import { integrationError } from '../integrations.constants.js';
import { MetaConversionsClient, MetaEventRefused, MetaPixelNotFound, MetaTokenRejected } from './meta-conversions.client.js';
import { META_PIXEL_PROVIDER as PROVIDER, clearRefusal, metaVaultKey, noteRefusal, openToken, sealToken } from './meta-pixel-token.js';
import { testEventOf } from './meta-purchase-event.js';

/** The columns a pixel's row is read by. The sealed field is read to know whether anything is sealed — never opened to answer. */
const READ = { status: true, pixelId: true, connectedAt: true, secretSealed: true, secretRefusal: true, secretRefusedAt: true } as const;

interface PixelRow {
  status: MetaPixelConnection['status'];
  pixelId: string | null;
  connectedAt: Date;
  secretSealed: string;
  secretRefusal: 'TOKEN_REJECTED' | 'PIXEL_NOT_FOUND' | null;
  secretRefusedAt: Date | null;
}

function connectionOf(row: PixelRow | null): MetaPixelConnection {
  const available = metaVaultKey() !== null;
  // A row with no ID is no pixel: it is said disconnected rather than connected to nothing.
  if (!row?.pixelId) return { status: 'DISCONNECTED', pixelId: null, connectedAt: null, conversions: { available, token: 'NONE', refusal: null, refusedAt: null } };
  const set = row.secretSealed !== '';
  const refusal = set ? row.secretRefusal : null;
  return {
    status: row.status,
    pixelId: row.pixelId,
    connectedAt: row.connectedAt.toISOString(),
    conversions: { available, token: !set ? 'NONE' : refusal ? 'REJECTED' : 'SET', refusal, refusedAt: refusal ? (row.secretRefusedAt?.toISOString() ?? null) : null },
  };
}

const NOTHING_SEALED = { secretSealed: '', secretRefusal: null, secretRefusedAt: null } as const;

/**
 * A shop's Meta Pixel: the ID its owner saves (BEELINK-269), served to the shop window in the shop's
 * public data (`toPublicStore`), and the Conversions API token its purchases are told with from the
 * server (BEELINK-274). The ID is public and needs no key — a deployment with no
 * `INTEGRATIONS_SECRET_KEY` still saves a pixel. The token is a secret: sealed in the same row, never
 * answered, and refused where there is nowhere to seal it. Meta is asked nothing when either is
 * saved; the test event is how a token is tried.
 */
@Injectable()
export class MetaPixelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly meta: MetaConversionsClient,
  ) {}

  async connection(storeSlug: string, userId: string): Promise<MetaPixelConnection> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return connectionOf(await this.read(storeId));
  }

  /**
   * Save, or replace what was saved: one row a shop, and the moment it was saved starts over with
   * the new ID. A token is one pixel's: another ID takes the token away with it.
   */
  async connect(storeSlug: string, userId: string, { pixelId }: MetaPixelConnectPayload): Promise<MetaPixelConnection> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const known = await this.read(storeId);
    const data = { status: 'CONNECTED' as const, pixelId, lastError: null, connectedAt: new Date(), ...(known && known.pixelId !== pixelId ? NOTHING_SEALED : {}) };
    const row = await this.prisma.storeIntegration.upsert({
      where: { storeId_provider: { storeId, provider: PROVIDER } },
      create: { storeId, provider: PROVIDER, ...data },
      update: data,
      select: READ,
    });
    return connectionOf(row);
  }

  /** The whole row goes, and the token sealed in it goes with it. Removing none is no error. */
  async disconnect(storeSlug: string, userId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.prisma.storeIntegration.deleteMany({ where: { storeId, provider: PROVIDER } });
  }

  /** Seal the token beside the ID, or replace the one sealed: what Meta refused of the last one is forgotten, and the purchases that waited are due. */
  async saveToken(storeSlug: string, userId: string, { accessToken }: MetaPixelTokenPayload): Promise<MetaPixelConnection> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const key = metaVaultKey();
    if (!key) throw new ServiceUnavailableException(integrationError('INTEGRATION_UNAVAILABLE', 'This deployment cannot keep a Conversions API token'));
    const { count } = await this.prisma.storeIntegration.updateMany({ where: { storeId, provider: PROVIDER, pixelId: { not: null } }, data: { secretSealed: sealToken(accessToken, key, storeId) } });
    if (count === 0) throw new ConflictException(integrationError('INTEGRATION_NOT_CONNECTED', 'This shop has no Meta Pixel saved'));
    await clearRefusal(this.prisma, storeId, new Date());
    return connectionOf(await this.read(storeId));
  }

  /** The token goes and the ID stays: the pixel in the browser needs none. Removing none is no error. */
  async removeToken(storeSlug: string, userId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.prisma.storeIntegration.updateMany({ where: { storeId, provider: PROVIDER }, data: NOTHING_SEALED });
  }

  /**
   * One event about nobody, sent now with the shop's token and the code of its Events Manager's
   * test tab, and Meta's answer in bee-link's words. What it learns of the token is kept: a refusal
   * stops the shop's purchases until another token, and an event taken lets them go again.
   */
  async sendTestEvent(storeSlug: string, userId: string, testEventCode: string): Promise<MetaPixelTestEventResult> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const key = metaVaultKey();
    if (!key) throw new ServiceUnavailableException(integrationError('INTEGRATION_UNAVAILABLE', 'This deployment cannot keep a Conversions API token'));
    const row = await this.read(storeId);
    if (!row?.pixelId || row.secretSealed === '') throw new ConflictException(integrationError('INTEGRATION_NOT_CONNECTED', 'This shop has no Conversions API token saved'));
    const accessToken = openToken(row.secretSealed, key, storeId);
    if (!accessToken) throw new ConflictException(integrationError('INTEGRATION_NEEDS_RECONNECT', "The shop's token cannot be opened here; save it again"));

    const now = new Date();
    try {
      await this.meta.send(row.pixelId, accessToken, testEventOf({ id: storeId }, `${env.WEB_URL}/${storeSlug}`, now), testEventCode);
    } catch (error) {
      const detail = error instanceof Error ? error.message.slice(0, 300) : null;
      if (error instanceof MetaTokenRejected || error instanceof MetaPixelNotFound) {
        const outcome = error instanceof MetaTokenRejected ? 'TOKEN_REJECTED' : 'PIXEL_NOT_FOUND';
        await noteRefusal(this.prisma, storeId, row.secretSealed, outcome, now);
        return { outcome, detail };
      }
      if (error instanceof MetaEventRefused) return { outcome: 'EVENT_REFUSED', detail };
      return { outcome: 'UNREACHABLE', detail: null };
    }
    if (row.secretRefusal) await clearRefusal(this.prisma, storeId, now);
    return { outcome: 'ACCEPTED', detail: null };
  }

  private read(storeId: string): Promise<PixelRow | null> {
    return this.prisma.storeIntegration.findUnique({ where: { storeId_provider: { storeId, provider: PROVIDER } }, select: READ });
  }
}

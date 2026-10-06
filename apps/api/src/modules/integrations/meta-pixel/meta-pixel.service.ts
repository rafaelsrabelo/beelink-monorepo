// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { MetaPixelConnection, MetaPixelConnectPayload } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { StoresService } from '../../stores/stores.service.js';

const PROVIDER = 'META_PIXEL' as const;

/** The columns a pixel's row is read by: never the sealed field, which this party leaves empty. */
const READ = { status: true, pixelId: true, connectedAt: true } as const;

interface PixelRow {
  status: MetaPixelConnection['status'];
  pixelId: string | null;
  connectedAt: Date;
}

function connectionOf(row: PixelRow | null): MetaPixelConnection {
  // A row with no ID is no pixel: it is said disconnected rather than connected to nothing.
  if (!row?.pixelId) return { status: 'DISCONNECTED', pixelId: null, connectedAt: null };
  return { status: row.status, pixelId: row.pixelId, connectedAt: row.connectedAt.toISOString() };
}

/**
 * A shop's Meta Pixel (BEELINK-269): the ID its owner saves, served to the shop window in the shop's
 * public data (`toPublicStore`). The ID is public, so nothing here is sealed and nothing depends on
 * `INTEGRATIONS_SECRET_KEY` — a deployment with no key still saves a pixel. Meta is asked nothing:
 * no call of its confirms an ID without a token, and an ID that names no pixel receives no event.
 */
@Injectable()
export class MetaPixelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async connection(storeSlug: string, userId: string): Promise<MetaPixelConnection> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return connectionOf(await this.prisma.storeIntegration.findUnique({ where: { storeId_provider: { storeId, provider: PROVIDER } }, select: READ }));
  }

  /** Save, or replace what was saved: one row a shop, and the moment it was saved starts over with the new ID. */
  async connect(storeSlug: string, userId: string, { pixelId }: MetaPixelConnectPayload): Promise<MetaPixelConnection> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const data = { status: 'CONNECTED' as const, pixelId, lastError: null, connectedAt: new Date() };
    const row = await this.prisma.storeIntegration.upsert({
      where: { storeId_provider: { storeId, provider: PROVIDER } },
      create: { storeId, provider: PROVIDER, ...data },
      update: data,
      select: READ,
    });
    return connectionOf(row);
  }

  /** The whole row goes, and whatever is ever kept beside the ID goes with it. Removing none is no error. */
  async disconnect(storeSlug: string, userId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.prisma.storeIntegration.deleteMany({ where: { storeId, provider: PROVIDER } });
  }
}

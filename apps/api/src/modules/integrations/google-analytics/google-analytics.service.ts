// Nest
import { Injectable } from '@nestjs/common';

// Types
import type { GoogleAnalyticsConnection, GoogleAnalyticsConnectPayload } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { StoresService } from '../../stores/stores.service.js';

const PROVIDER = 'GOOGLE_ANALYTICS' as const;

/** The columns the row is read by: never the sealed field, which this party leaves empty. */
const READ = { status: true, measurementId: true, connectedAt: true } as const;

interface AnalyticsRow {
  status: GoogleAnalyticsConnection['status'];
  measurementId: string | null;
  connectedAt: Date;
}

function connectionOf(row: AnalyticsRow | null): GoogleAnalyticsConnection {
  // A row with no ID is no property: it is said disconnected rather than connected to nothing.
  if (!row?.measurementId) return { status: 'DISCONNECTED', measurementId: null, connectedAt: null };
  return { status: row.status, measurementId: row.measurementId, connectedAt: row.connectedAt.toISOString() };
}

/**
 * A shop's Google Analytics (BEELINK-301): the GA4 measurement ID its owner saves, served to the
 * shop window in the shop's public data (`toPublicStore`). The ID is public, so nothing here is
 * sealed and nothing depends on `INTEGRATIONS_SECRET_KEY` — a deployment with no key still saves
 * one. Google is asked nothing: an ID that names no property receives no event.
 */
@Injectable()
export class GoogleAnalyticsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async connection(storeSlug: string, userId: string): Promise<GoogleAnalyticsConnection> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return connectionOf(await this.prisma.storeIntegration.findUnique({ where: { storeId_provider: { storeId, provider: PROVIDER } }, select: READ }));
  }

  /** Save, or replace what was saved: one row a shop, and the moment it was saved starts over with the new ID. */
  async connect(storeSlug: string, userId: string, { measurementId }: GoogleAnalyticsConnectPayload): Promise<GoogleAnalyticsConnection> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const data = { status: 'CONNECTED' as const, measurementId, lastError: null, connectedAt: new Date() };
    const row = await this.prisma.storeIntegration.upsert({
      where: { storeId_provider: { storeId, provider: PROVIDER } },
      create: { storeId, provider: PROVIDER, ...data },
      update: data,
      select: READ,
    });
    return connectionOf(row);
  }

  /** The whole row goes. Removing none is no error. */
  async disconnect(storeSlug: string, userId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.prisma.storeIntegration.deleteMany({ where: { storeId, provider: PROVIDER } });
  }
}

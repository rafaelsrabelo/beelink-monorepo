// Node
import { randomBytes } from 'node:crypto';

// Nest
import { BadGatewayException, BadRequestException, ConflictException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

// Types
import type { IntegrationAuthorization, MelhorEnvioCallbackPayload, MelhorEnvioConnected, MelhorEnvioConnection } from '@harness-monorepo/contracts';
import type { StoreIntegrationModel } from '../../../generated/prisma/models.js';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { StoresService } from '../../stores/stores.service.js';
import { integrationError, INTEGRATION_STATE_TTL_MS, MELHOR_ENVIO_REFRESH_LIFE_MS, RENEW_AHEAD_MS, RENEW_BATCH, RENEW_BEFORE_MS } from '../integrations.constants.js';
import { open, seal } from '../secret-vault.js';
import { melhorEnvioConfig, melhorEnvioEnvironment, MelhorEnvioClient, MelhorEnvioRefused, type MelhorEnvioConfig, type MelhorEnvioTokens } from './melhor-envio.client.js';

const PROVIDER = 'MELHOR_ENVIO' as const;

/** What the sealed field holds for Melhor Envio. */
interface SealedTokens {
  accessToken: string;
  refreshToken: string;
}

/** What one renewal came to: a token to use, Melhor Envio's no, or no answer from it. */
type Renewal = { kind: 'token'; accessToken: string } | { kind: 'refused' } | { kind: 'unreachable'; stillValid: string | null };

function connectionOf(row: StoreIntegrationModel | null): MelhorEnvioConnection {
  return {
    available: melhorEnvioConfig() !== null,
    environment: melhorEnvioEnvironment(),
    status: row?.status ?? 'DISCONNECTED',
    account: row?.accountName ? { name: row.accountName, email: row.accountEmail } : null,
    connectedAt: row?.connectedAt.toISOString() ?? null,
    accessExpiresAt: row?.accessExpiresAt?.toISOString() ?? null,
  };
}

/**
 * A shop's Melhor Envio account (BEELINK-182): the authorization-code flow that connects it, the
 * connection's state, and the one door the shipping tickets get an access token through —
 * `accessTokenFor`, which renews the token before it runs out.
 *
 * The tokens are sealed for this shop alone (`secret-vault.ts`) and opened only here. A renewal holds
 * the connection's row while it trades the refresh token: Melhor Envio gives a new refresh token with
 * every trade, and two trades of the same one would leave the shop holding a spent token.
 */
@Injectable()
export class MelhorEnvioService {
  private readonly logger = new Logger(MelhorEnvioService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly melhorEnvio: MelhorEnvioClient,
  ) {}

  async connection(storeSlug: string, userId: string): Promise<MelhorEnvioConnection> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return connectionOf(await this.rowOf(storeId));
  }

  async authorize(storeSlug: string, userId: string): Promise<IntegrationAuthorization> {
    const config = this.config();
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const state = randomBytes(32).toString('base64url');

    await this.prisma.$transaction([
      // Abandoned flows are swept on the way in; nothing else ever reads them.
      this.prisma.integrationOAuthState.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
      this.prisma.integrationOAuthState.create({ data: { state, provider: PROVIDER, storeId, userId, expiresAt: new Date(Date.now() + INTEGRATION_STATE_TTL_MS) } }),
    ]);
    return { url: this.melhorEnvio.authorizationUrl(config, state) };
  }

  /**
   * The browser came back with a code. The state must be one this person began for a shop they still
   * own, unexpired and unused — taken out as it is read, so a replay finds nothing. Anyone else's
   * browser coming back with it is refused before Melhor Envio is asked anything: a stranger cannot
   * have a shop connected to their account by luring its owner through their flow.
   */
  async callback(userId: string, { code, state }: MelhorEnvioCallbackPayload): Promise<MelhorEnvioConnected> {
    const config = this.config();
    const flight = await this.prisma.integrationOAuthState.delete({ where: { state } }).catch(() => null);
    const valid = flight && flight.provider === PROVIDER && flight.userId === userId && flight.expiresAt > new Date();
    const store = valid ? await this.prisma.store.findFirst({ where: { id: flight.storeId, ownerId: userId }, select: { id: true, slug: true } }) : null;
    if (!store) throw new BadRequestException(integrationError('INTEGRATION_STATE_INVALID', 'This connection was not started here, by you, was used, or took too long'));

    const shop = { storeSlug: store.slug };
    const tokens = await this.melhorEnvio.exchange(config, code).catch((error: unknown) => this.failed(error, shop));
    const account = await this.melhorEnvio.account(config, tokens.accessToken).catch((error: unknown) => this.failed(error, shop));
    const now = new Date();

    const row = await this.prisma.storeIntegration.upsert({
      where: { storeId_provider: { storeId: store.id, provider: PROVIDER } },
      create: { storeId: store.id, provider: PROVIDER, ...this.sealedOf(config, store.id, tokens, now), accountId: account.id, accountName: account.name, accountEmail: account.email, connectedAt: now },
      update: { status: 'CONNECTED', lastError: null, ...this.sealedOf(config, store.id, tokens, now), accountId: account.id, accountName: account.name, accountEmail: account.email, connectedAt: now },
    });
    return { storeSlug: store.slug, connection: connectionOf(row) };
  }

  /** The tokens are deleted with the row. Melhor Envio has no documented way to revoke them: the shop removes the app there if it wants to. */
  async disconnect(storeSlug: string, userId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.prisma.storeIntegration.deleteMany({ where: { storeId, provider: PROVIDER } });
  }

  /**
   * A good access token for the shop's account, renewed first when it is close to its end — the one
   * way the shipping tickets reach Melhor Envio in a shop's name. A shop with no connection, or one
   * Melhor Envio stopped accepting, is refused with a code the panel turns into "conecte de novo".
   */
  async accessTokenFor(storeId: string, now = new Date()): Promise<string> {
    const config = this.config();
    const row = await this.rowOf(storeId);
    if (!row) throw new ConflictException(integrationError('INTEGRATION_NOT_CONNECTED', 'This shop has not connected Melhor Envio'));
    if (row.status !== 'CONNECTED') throw new ConflictException(integrationError('INTEGRATION_NEEDS_RECONNECT', 'Melhor Envio no longer accepts this connection; connect it again'));

    if (row.accessExpiresAt && row.accessExpiresAt.getTime() - now.getTime() > RENEW_BEFORE_MS) return this.opened(config, row).accessToken;

    const renewal = await this.renew(config, row.id, now, RENEW_BEFORE_MS);
    if (renewal.kind === 'token') return renewal.accessToken;
    if (renewal.kind === 'unreachable' && renewal.stillValid) return renewal.stillValid;
    if (renewal.kind === 'refused') throw new ConflictException(integrationError('INTEGRATION_NEEDS_RECONNECT', 'Melhor Envio no longer accepts this connection; connect it again'));
    throw new BadGatewayException(integrationError('INTEGRATION_UNREACHABLE', 'Melhor Envio did not answer'));
  }

  /** The routine's pass: every connection whose access ends within the week is renewed now. Answers how many were. */
  async renewDue(now: Date): Promise<number> {
    const config = melhorEnvioConfig();
    if (!config) return 0;

    const due = await this.prisma.storeIntegration.findMany({
      where: { provider: PROVIDER, status: 'CONNECTED', accessExpiresAt: { lte: new Date(now.getTime() + RENEW_AHEAD_MS) } },
      select: { id: true },
      orderBy: { accessExpiresAt: 'asc' },
      take: RENEW_BATCH,
    });
    let renewed = 0;
    for (const { id } of due) {
      // One shop's failure is its own: the others still renew in this pass.
      const renewal = await this.renew(config, id, now, RENEW_AHEAD_MS).catch((error: unknown) => {
        this.logger.error({ err: error, integrationId: id }, 'Could not renew a Melhor Envio connection');
        return null;
      });
      if (renewal?.kind === 'token') renewed += 1;
    }
    return renewed;
  }

  /**
   * One renewal under the row's lock. Read again once held: a renewal that finished while this one
   * waited left a token good past `window`, and that one is used rather than spending the new
   * refresh token on a second trade.
   */
  private renew(config: MelhorEnvioConfig, id: string, now: Date, window: number): Promise<Renewal> {
    return this.prisma.$transaction(
      async (tx) => {
        await tx.$queryRaw`SELECT 1 FROM "store_integrations" WHERE "id" = ${id}::uuid FOR UPDATE`;
        const row = await tx.storeIntegration.findUnique({ where: { id } });
        if (!row || row.status !== 'CONNECTED') return { kind: 'refused' };

        const held = this.opened(config, row);
        const valid = row.accessExpiresAt !== null && row.accessExpiresAt > now ? held.accessToken : null;
        if (valid && row.accessExpiresAt && row.accessExpiresAt.getTime() - now.getTime() > window) return { kind: 'token', accessToken: valid };

        // Past its life the refresh token is not tried: Melhor Envio would only refuse it.
        if (row.refreshExpiresAt && row.refreshExpiresAt <= now) {
          await tx.storeIntegration.update({ where: { id }, data: { status: 'NEEDS_RECONNECT', lastError: 'The refresh token ran out before it was used' } });
          return { kind: 'refused' };
        }

        try {
          const tokens = await this.melhorEnvio.refresh(config, held.refreshToken);
          await tx.storeIntegration.update({ where: { id }, data: { ...this.sealedOf(config, row.storeId, tokens, now), lastError: null } });
          return { kind: 'token', accessToken: tokens.accessToken };
        } catch (error) {
          const refused = error instanceof MelhorEnvioRefused;
          await tx.storeIntegration.update({ where: { id }, data: { ...(refused ? { status: 'NEEDS_RECONNECT' as const } : {}), lastError: error instanceof Error ? error.message : 'Unknown failure' } });
          return refused ? { kind: 'refused' } : { kind: 'unreachable', stillValid: valid };
        }
      },
      // The trade waits on Melhor Envio for up to ten seconds, inside the transaction that holds the row.
      { timeout: 20_000 },
    );
  }

  private sealedOf(config: MelhorEnvioConfig, storeId: string, tokens: MelhorEnvioTokens, now: Date) {
    const secret: SealedTokens = { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken };
    return {
      secretSealed: seal(JSON.stringify(secret), config.vaultKey, { storeId, provider: PROVIDER }),
      accessExpiresAt: new Date(now.getTime() + tokens.expiresInSeconds * 1000),
      refreshExpiresAt: new Date(now.getTime() + MELHOR_ENVIO_REFRESH_LIFE_MS),
      lastRefreshedAt: now,
    };
  }

  private opened(config: MelhorEnvioConfig, row: StoreIntegrationModel): SealedTokens {
    return JSON.parse(open(row.secretSealed, config.vaultKey, { storeId: row.storeId, provider: PROVIDER })) as SealedTokens;
  }

  private rowOf(storeId: string): Promise<StoreIntegrationModel | null> {
    return this.prisma.storeIntegration.findUnique({ where: { storeId_provider: { storeId, provider: PROVIDER } } });
  }

  private config(): MelhorEnvioConfig {
    const config = melhorEnvioConfig();
    if (!config) throw new ServiceUnavailableException(integrationError('INTEGRATION_UNAVAILABLE', 'Melhor Envio is not set up here'));
    return config;
  }

  /** A failed trade, said with the shop it was for — the web sends the browser back to that shop's panel. */
  private failed(error: unknown, shop: { storeSlug: string }): never {
    if (error instanceof MelhorEnvioRefused) throw new BadRequestException(integrationError('INTEGRATION_EXCHANGE_FAILED', 'Melhor Envio refused the code', shop));
    throw new BadGatewayException(integrationError('INTEGRATION_UNREACHABLE', 'Melhor Envio did not answer', shop));
  }
}

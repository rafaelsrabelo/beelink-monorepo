// Node
import { createHash, timingSafeEqual } from 'node:crypto';

// Nest
import { Injectable } from '@nestjs/common';

// App
import { PrismaService } from '../../../shared/prisma/prisma.service.js';
import { open } from '../secret-vault.js';
import { asaasConfig } from './asaas.config.js';

const PROVIDER = 'ASAAS' as const;

/** What Asaas takes for a webhook's token: 32 to 255 characters. Anything else is nobody's. */
const TOKEN_MIN = 32;
const TOKEN_MAX = 255;

/**
 * Whose webhook a request is (BEELINK-206), by the token Asaas sends back in `asaas-access-token`.
 * The shop is found by the token's SHA-256 — an index, so no shop's seal is opened to look — and
 * then the token itself is compared with the one sealed for that shop, in constant time: a guess
 * learns nothing from how long the answer took. A connection that needs reconnecting is still the
 * shop's: its events are recorded, and read once the key is good again.
 */
@Injectable()
export class AsaasWebhookDoor {
  constructor(private readonly prisma: PrismaService) {}

  async shopOf(token: string | undefined): Promise<{ storeId: string } | null> {
    const config = asaasConfig();
    if (!config || typeof token !== 'string' || token.length < TOKEN_MIN || token.length > TOKEN_MAX) return null;

    const hash = createHash('sha256').update(token, 'utf8').digest('hex');
    const row = await this.prisma.storeIntegration.findUnique({ where: { webhookTokenHash: hash } });
    if (!row || row.provider !== PROVIDER) return null;

    let sealed: string;
    try {
      sealed = (JSON.parse(open(row.secretSealed, config.vaultKey, { storeId: row.storeId, provider: PROVIDER })) as { webhookToken?: string }).webhookToken ?? '';
    } catch {
      return null;
    }
    const given = Buffer.from(token, 'utf8');
    const kept = Buffer.from(sealed, 'utf8');
    return given.length === kept.length && timingSafeEqual(given, kept) ? { storeId: row.storeId } : null;
  }
}

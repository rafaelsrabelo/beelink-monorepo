// Types
import type { MetaConversionsRefusal } from '@harness-monorepo/contracts';
import type { Prisma } from '../../../generated/prisma/client.js';

// App
import { env } from '../../../shared/config/env.js';
import { open, seal, vaultKeyOf } from '../secret-vault.js';

export const META_PIXEL_PROVIDER = 'META_PIXEL' as const;

type Db = Pick<Prisma.TransactionClient, 'storeIntegration' | 'orderMetaPurchase'>;

interface SealedMeta {
  accessToken: string;
}

/** This deployment's vault key, or null when it has nowhere to seal a token — the pixel's ID is kept all the same. */
export function metaVaultKey(): Buffer | null {
  return env.INTEGRATIONS_SECRET_KEY ? vaultKeyOf(env.INTEGRATIONS_SECRET_KEY) : null;
}

/**
 * A shop's Conversions API token (BEELINK-274), sealed for its own row and opened here alone (gate
 * `api/meta-secret-in-meta-pixel`). Whoever opens one hands it to `MetaConversionsClient` and to
 * nothing else: it is never logged, answered or kept in memory past the call.
 */
export function sealToken(accessToken: string, key: Buffer, storeId: string): string {
  return seal(JSON.stringify({ accessToken } satisfies SealedMeta), key, { storeId, provider: META_PIXEL_PROVIDER });
}

/** The token back, or null: nothing sealed, or a value this key does not open — another key, another shop's row. */
export function openToken(sealed: string, key: Buffer, storeId: string): string | null {
  if (sealed === '') return null;
  try {
    const { accessToken } = JSON.parse(open(sealed, key, { storeId, provider: META_PIXEL_PROVIDER })) as Partial<SealedMeta>;
    return typeof accessToken === 'string' && accessToken !== '' ? accessToken : null;
  } catch {
    return null;
  }
}

/**
 * Meta refused the token, or the pixel under it: written on the shop's row, so nothing else of the
 * shop is sent with it. Only while the row still holds the very token that was refused — one
 * replaced meanwhile was not.
 */
export async function noteRefusal(db: Db, storeId: string, sealed: string, refusal: MetaConversionsRefusal, at: Date): Promise<void> {
  await db.storeIntegration.updateMany({ where: { storeId, provider: META_PIXEL_PROVIDER, secretSealed: sealed, secretRefusal: null }, data: { secretRefusal: refusal, secretRefusedAt: at } });
}

/** The token works, or is another one now: the refusal goes, and the shop's waiting purchases are due at once. */
export async function clearRefusal(db: Db, storeId: string, at: Date): Promise<void> {
  await db.storeIntegration.updateMany({ where: { storeId, provider: META_PIXEL_PROVIDER }, data: { secretRefusal: null, secretRefusedAt: null } });
  await db.orderMetaPurchase.updateMany({ where: { storeId, processedAt: null }, data: { nextAttemptAt: at } });
}

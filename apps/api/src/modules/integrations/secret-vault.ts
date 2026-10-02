// Node
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// Types
import type { IntegrationProvider } from '@harness-monorepo/contracts';

/** The shape on disk; a key or a cipher replaced later is a `v2`, read beside the `v1`s still stored. */
const VERSION = 'v1';
/** GCM's own nonce length: twelve bytes, never reused under one key — random each time. */
const IV_BYTES = 12;

/** Whose secret it is: sealed into the ciphertext, so a value copied to another shop's row will not open. */
export interface SealContext {
  storeId: string;
  provider: IntegrationProvider;
}

/** The key, as INTEGRATIONS_SECRET_KEY holds it: 32 bytes in base64. */
export function vaultKeyOf(base64: string): Buffer {
  const key = Buffer.from(base64, 'base64');
  if (key.length !== 32) throw new Error('The integrations key must be 32 bytes');
  return key;
}

const contextOf = ({ storeId, provider }: SealContext) => Buffer.from(`${provider}:${storeId}`, 'utf8');

/**
 * What a shop's third party gave it — Melhor Envio's tokens, the Asaas key — sealed for the database
 * with AES-256-GCM: `v1.<iv>.<tag>.<ciphertext>`, each part base64url. The shop and the party are
 * authenticated data, never stored: opening needs the very row the value was sealed for.
 */
export function seal(plain: string, key: Buffer, context: SealContext): string {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(contextOf(context));
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [VERSION, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), body.toString('base64url')].join('.');
}

/**
 * The plain value back, or an error: another key, another shop or party, or a value altered at rest
 * all fail the tag — GCM never hands back a guess.
 */
export function open(sealed: string, key: Buffer, context: SealContext): string {
  const [version, iv, tag, body] = sealed.split('.');
  if (version !== VERSION || !iv || !tag || body === undefined) throw new Error('Not a sealed value this vault reads');

  const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64url'));
  decipher.setAAD(contextOf(context));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(body, 'base64url')), decipher.final()]).toString('utf8');
}

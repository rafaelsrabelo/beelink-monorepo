// Node
import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Whether a Melhor Envio webhook is Melhor Envio's (BEELINK-188): `X-ME-Signature` is the HMAC-SHA256
 * of the body as it arrived, keyed with the app's secret, in base64. Compared in constant time, so a
 * guess learns nothing from how long the answer took.
 */
export function isMelhorEnvioSigned(rawBody: Buffer, signature: string | undefined, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac('sha256', secret).update(rawBody).digest();
  const given = Buffer.from(signature, 'base64');
  return given.length === expected.length && timingSafeEqual(given, expected);
}

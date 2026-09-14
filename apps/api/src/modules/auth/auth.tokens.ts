// Node
import { createHash, randomBytes } from 'node:crypto';

/** 256 bits of randomness. The plain value is handed out once and never stored. */
export function createOpaqueToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * A token is already unguessable, so a fast digest is enough — unlike a password, there is nothing
 * to brute-force. It also keeps the lookup a single indexed query.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

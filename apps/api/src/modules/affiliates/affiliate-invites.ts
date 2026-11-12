// App
import { createOpaqueToken, hashToken } from '../auth/auth.tokens.js';
import { AFFILIATE_INVITE_TTL_MS } from './affiliates.constants.js';

/**
 * A fresh invite (IMPULSEIA-103): the plain token, handed to the e-mail once and never stored, and
 * the row's columns — its hash, sent now, working for a week. Sending again writes another over it,
 * so only the latest e-mail's link works.
 */
export function freshInvite(now: Date): { token: string; columns: { tokenHash: string; sentAt: Date; expiresAt: Date; usedAt: null } } {
  const token = createOpaqueToken();
  return { token, columns: { tokenHash: hashToken(token), sentAt: now, expiresAt: new Date(now.getTime() + AFFILIATE_INVITE_TTL_MS), usedAt: null } };
}

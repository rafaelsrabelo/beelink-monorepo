// Types
import type { User as WireUser } from '@harness-monorepo/contracts';
import type { UserModel } from '../../generated/prisma/models.js';

/** The row carries a hash and a verification date; the wire carries neither. */
export function toUser(user: UserModel): WireUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerifiedAt !== null,
    createdAt: user.createdAt.toISOString(),
  } satisfies WireUser;
}

// Types
import type { BackofficeAdmin } from '@harness-monorepo/contracts';
import type { PlatformAdminModel, UserModel } from '../../../generated/prisma/models.js';

/** Field by field, from two accounts' rows: nothing of either leaves but an id, a name and an e-mail. */
export function toBackofficeAdmin(
  row: PlatformAdminModel & { user: Pick<UserModel, 'name' | 'email'> },
  granter?: Pick<UserModel, 'id' | 'name' | 'email'>,
): BackofficeAdmin {
  return {
    userId: row.userId,
    name: row.user.name,
    email: row.user.email,
    grantedAt: row.grantedAt.toISOString(),
    grantedBy: granter ? { id: granter.id, name: granter.name, email: granter.email } : null,
  };
}

// Nest
import { Injectable, UnauthorizedException } from '@nestjs/common';

// Types
import type { User } from '@harness-monorepo/contracts';

// App
import { toUser } from '../auth/user.mapper.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /** A signed token whose account no longer exists is not an authenticated caller. */
  async byId(id: string): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new UnauthorizedException({ errorCode: 'AUTH_UNAUTHENTICATED', message: 'Account no longer exists' });
    }
    return toUser(user);
  }
}

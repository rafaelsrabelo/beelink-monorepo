// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { EmailTokenPurpose } from '../../generated/prisma/enums.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { createOpaqueToken, hashToken } from './auth.tokens.js';

/** The single-use tokens behind e-mailed links. Only their hashes are stored. */
@Injectable()
export class EmailTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /** Returns the plain token — the one moment it exists outside the person's inbox. */
  async issue(userId: string, purpose: EmailTokenPurpose, ttlMs: number): Promise<string> {
    const token = createOpaqueToken();

    // Asking for a new link makes every older one of the same kind useless.
    await this.prisma.emailToken.updateMany({
      where: { userId, purpose, usedAt: null },
      data: { usedAt: new Date() },
    });

    await this.prisma.emailToken.create({
      data: {
        userId,
        purpose,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + ttlMs),
      },
    });

    return token;
  }

  /**
   * Spends the token and answers whose it was. Unknown, expired, spent and wrong-purpose all raise
   * the same error: a link that does not work says nothing about why.
   */
  async consume(token: string, purpose: EmailTokenPurpose): Promise<string> {
    const record = await this.prisma.emailToken.findUnique({ where: { tokenHash: hashToken(token) } });

    if (!record || record.purpose !== purpose || record.usedAt || record.expiresAt.getTime() <= Date.now()) {
      throw new BadRequestException({ errorCode: 'AUTH_TOKEN_INVALID', message: 'Invalid or expired link' });
    }

    // Conditional update, so two clicks on the same link cannot both win.
    const spent = await this.prisma.emailToken.updateMany({
      where: { id: record.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    if (spent.count === 0) {
      throw new BadRequestException({ errorCode: 'AUTH_TOKEN_INVALID', message: 'Invalid or expired link' });
    }

    return record.userId;
  }
}

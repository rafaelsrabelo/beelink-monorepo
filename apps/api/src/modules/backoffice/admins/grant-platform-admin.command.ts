// Nest
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

// App
import { PrismaModule } from '../../../shared/prisma/prisma.module.js';
import { AuditService } from '../audit/audit.service.js';
import { PlatformAdminsService } from './platform-admins.service.js';

/** Only what granting needs: the database. No HTTP server, none of the API's routines. */
@Module({ imports: [PrismaModule], providers: [AuditService, PlatformAdminsService] })
class GrantPlatformAdminModule {}

export interface CommandOutput {
  out(line: string): void;
  error(line: string): void;
}

export const GRANT_PLATFORM_ADMIN_USAGE = 'Usage: node dist/commands/grant-platform-admin.js <e-mail>';

/**
 * The first platform administrator (BEELINK-227): nobody is one yet, so nobody can grant the role
 * from the backoffice. Grants it to an existing bee-link account whose e-mail is verified, and
 * records it with the command as the actor. Answers the exit code: 0 when the account is an
 * administrator at the end — run again, it changes nothing and records nothing — and 1 when it
 * refused, saying why.
 */
export async function grantPlatformAdminCommand(argument: string | undefined, output: CommandOutput): Promise<number> {
  const email = argument?.trim().toLowerCase();
  if (!email) {
    output.error(GRANT_PLATFORM_ADMIN_USAGE);
    return 1;
  }

  const context = await NestFactory.createApplicationContext(GrantPlatformAdminModule, { logger: ['error'] });
  try {
    const { admin, granted } = await context.get(PlatformAdminsService).grant(email, null, context.get(AuditService).commandTrail());
    output.out(granted ? `${admin.email} is now a platform administrator.` : `${admin.email} is a platform administrator already; nothing changed.`);
    return 0;
  } catch (error) {
    output.error(`Refused: ${error instanceof Error ? error.message : String(error)}`);
    return 1;
  } finally {
    await context.close();
  }
}

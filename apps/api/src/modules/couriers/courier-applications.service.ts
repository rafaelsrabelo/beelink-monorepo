// Nest
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { LEGAL_VERSION } from '../auth/auth.constants.js';

// Types
import type { CourierApplicationDto } from './dto/courier-application.dto.js';

/**
 * The couriers who asked to deliver with Beelink: a list of interest, written by the landing's form
 * and read by nobody yet (BEELINK-321). It sends no e-mail and answers nothing.
 */
@Injectable()
export class CourierApplicationsService {
  private readonly logger = new Logger(CourierApplicationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * A person's application, as the DTO left it: already normalised, already checked.
   *
   * One row a CPF, written in one statement. A CPF already on the list has what was kept of it
   * replaced, and the terms taken again now; `createdAt` stays the first time. The caller is told
   * nothing either way — an answer that differed would say whose CPFs are on the list.
   *
   * The version of the terms is the one in force here, and the moment is this one: neither is read
   * from the body.
   */
  async receive(dto: CourierApplicationDto): Promise<void> {
    // The trap, sprung: a field no person sees was filled in. Answered exactly like a save, and
    // nothing is written — a robot shown success does not come back with a variation.
    if (dto.website) return;

    const kept = {
      name: dto.name,
      email: dto.email,
      whatsapp: dto.whatsapp,
      city: dto.city,
      vehicle: dto.vehicle,
      termsVersion: LEGAL_VERSION,
      termsAcceptedAt: new Date(),
    };

    try {
      await this.prisma.courierApplication.upsert({
        where: { document: dto.document },
        create: { document: dto.document, ...kept },
        update: kept,
        select: { id: true },
      });
    } catch (error) {
      // Not rethrown, and its message never logged: Postgres writes the row it refused into an
      // error's detail, and the exception filter logs whatever reaches it whole. The code is what
      // tells one failure from another.
      this.logger.error({ reason: codeOf(error) }, 'A courier application could not be kept');
      throw new InternalServerErrorException({ errorCode: 'INTERNAL_ERROR', message: 'Internal server error' });
    }
  }
}

/** What kind of failure it was, and nothing of what it was about: Prisma's code, else the error's class. */
function codeOf(error: unknown): string {
  if (!(error instanceof Error)) return 'UNKNOWN';
  return 'code' in error && typeof error.code === 'string' ? `${error.name} ${error.code}` : error.name;
}

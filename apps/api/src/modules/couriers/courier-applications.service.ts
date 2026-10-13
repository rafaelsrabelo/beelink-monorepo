// Nest
import { ConflictException, Injectable, InternalServerErrorException, Logger } from '@nestjs/common';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { LEGAL_VERSION } from '../auth/auth.constants.js';
import { CourierApplicationMailer } from './courier-application-mailer.js';

// Types
import type { CourierApplicationErrorCode } from '@harness-monorepo/contracts';
import type { CourierApplicationDto } from './dto/courier-application.dto.js';

/** What says who a person is, in the order it is looked for, and what each answers when it is on the list already. */
const TAKEN = [
  { field: 'document', errorCode: 'COURIER_DOCUMENT_TAKEN', message: 'That CPF is already on the list' },
  { field: 'email', errorCode: 'COURIER_EMAIL_TAKEN', message: 'That e-mail is already on the list' },
  { field: 'whatsapp', errorCode: 'COURIER_WHATSAPP_TAKEN', message: 'That WhatsApp number is already on the list' },
] as const satisfies readonly { field: keyof CourierApplicationDto; errorCode: CourierApplicationErrorCode; message: string }[];

/**
 * The couriers who asked to deliver with Beelink: a list of interest, written by the landing's form
 * (BEELINK-321) and read by nobody but the outbox of the one e-mail each application is owed
 * (`CourierApplicationMailer`, BEELINK-326).
 */
@Injectable()
export class CourierApplicationsService {
  private readonly logger = new Logger(CourierApplicationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailer: CourierApplicationMailer,
  ) {}

  /**
   * A person's application, as the DTO left it: already normalised, already checked.
   *
   * A person is on the list once (BEELINK-325): a CPF, an e-mail or a WhatsApp number already there
   * is refused, by name, and the row it belongs to is left as it was — nobody who knows a CPF can
   * write over the person it is. The price is said in the product's own docs: the answer tells
   * whether one of the three is on the list.
   *
   * The version of the terms is the one in force here, and the moment is this one: neither is read
   * from the body.
   *
   * An application kept owes its person an e-mail (BEELINK-326), written with it or not at all. The
   * sending is asked for once that committed and waited for by nobody: an e-mail that does not go
   * changes no answer of this route, and its outbox tries again.
   */
  async receive(dto: CourierApplicationDto): Promise<void> {
    // The trap, sprung: a field no person sees was filled in. Answered exactly like a save, and
    // nothing is written — a robot shown success does not come back with a variation.
    if (dto.website) return;

    let taken: (typeof TAKEN)[number] | undefined;

    try {
      taken = await this.prisma.$transaction(async (tx) => {
        // One application at a time, so looking and writing are one step: two sends of one e-mail
        // arriving together would each find the list without it. A lock and not two more unique
        // indexes — the list took repeated e-mails and numbers before this rule, an index cannot
        // be built over them, and a migration that fails stops the API from starting.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended('courier_applications', 0))`;

        const listed = await tx.courierApplication.findMany({
          where: { OR: TAKEN.map(({ field }) => ({ [field]: dto[field] })) },
          select: { document: true, email: true, whatsapp: true },
        });
        const already = TAKEN.find(({ field }) => listed.some((row) => row[field] === dto[field]));
        if (already) return already;

        await tx.courierApplication.create({
          data: {
            document: dto.document,
            name: dto.name,
            email: dto.email,
            whatsapp: dto.whatsapp,
            city: dto.city,
            vehicle: dto.vehicle,
            termsVersion: LEGAL_VERSION,
            termsAcceptedAt: new Date(),
            // One write: an application and the e-mail it owes exist together or not at all.
            notice: { create: {} },
          },
          select: { id: true },
        });

        return undefined;
      });
    } catch (error) {
      // Not rethrown, and its message never logged: Postgres writes the row it refused into an
      // error's detail, and the exception filter logs whatever reaches it whole. The code is what
      // tells one failure from another.
      this.logger.error({ reason: codeOf(error) }, 'A courier application could not be kept');
      throw new InternalServerErrorException({ errorCode: 'INTERNAL_ERROR', message: 'Internal server error' });
    }

    // Thrown out here, past the catch that turns everything into a 500: it says which of the three, and nothing of whose.
    if (taken) throw new ConflictException({ errorCode: taken.errorCode, message: taken.message });

    this.mailer.dispatch();
  }
}

/** A class's name, Prisma's `P2039`, Node's `ECONNREFUSED`, Postgres's `23514`: a word with no room for a row in it. */
const CODE = /^\w{1,60}$/;

type DatabaseRefusal = Error & { code?: unknown; meta?: { driverAdapterError?: { cause?: { originalCode?: unknown } } } };

/**
 * What kind of failure it was, and nothing of what it was about: the error's class, its code, and
 * Postgres's own five characters where Prisma passed them on (23514 is a CHECK). Each is taken only
 * if it is shaped like a code — anything else an error carries may be the row.
 */
function codeOf(error: unknown): string {
  if (!(error instanceof Error)) return 'UNKNOWN';

  const { name, code, meta }: DatabaseRefusal = error;
  const codes = [name, code, meta?.driverAdapterError?.cause?.originalCode].filter(
    (part): part is string => typeof part === 'string' && CODE.test(part),
  );

  return codes.join(' ') || 'UNKNOWN';
}

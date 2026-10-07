// Nest
import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import type { CallHandler, ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Libs
import { mergeMap, type Observable } from 'rxjs';

// Types
import type { AuditActor } from './audit.types.js';
import type { AuditedActions, BackofficeRequest } from '../backoffice.request.js';

// App
import { AUDITED_KEY, UNAUDITED_KEY, originOf } from '../backoffice.request.js';
import { AuditService } from './audit.service.js';
import { AuditTrail } from './audit-trail.js';

const READS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * What makes recording unavoidable (BEELINK-227). On every backoffice controller:
 *
 * - a handler that is not a read and declares neither `@Audited` nor `@Unaudited` is refused with
 *   500 **before it runs** — nothing is done that nothing would record;
 * - a declared handler gets its `AuditTrail`, and its service records through it, in the
 *   transaction of the write;
 * - a declared handler that answered without recording still leaves its line: this writes the
 *   declared action, with whoever asked, and logs the omission as an error.
 *
 * A handler that throws records nothing here — nothing was done. A refusal worth keeping, like a
 * failed sign-in, is recorded by the service before it throws.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly audit: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<BackofficeRequest>();
    const declared = this.reflector.get<AuditedActions | undefined>(AUDITED_KEY, context.getHandler());

    if (!declared) {
      const exempt = this.reflector.get<string | undefined>(UNAUDITED_KEY, context.getHandler());
      if (exempt || READS.has(request.method)) return next.handle();

      throw new InternalServerErrorException({
        errorCode: 'BACKOFFICE_AUDIT_MISSING',
        message: `${context.getClass().name}.${context.getHandler().name} writes and declares no @Audited action`,
      });
    }

    const trail = new AuditTrail(this.audit, declared, originOf(request), () => actorOf(request));
    request.auditTrail = trail;

    return next.handle().pipe(
      mergeMap(async (answer: unknown) => {
        if (!trail.recorded) {
          this.logger.error(`${context.getClass().name}.${context.getHandler().name} answered without recording; "${declared[0]}" was recorded for it`);
          await trail.record(declared[0]);
        }
        return answer;
      }),
    );
  }
}

function actorOf({ backofficeAdmin }: BackofficeRequest): AuditActor {
  return backofficeAdmin ? { kind: 'ADMIN', userId: backofficeAdmin.id, label: backofficeAdmin.email } : { kind: 'ANONYMOUS' };
}

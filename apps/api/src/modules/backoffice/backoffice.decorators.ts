// Nest
import { Controller, SetMetadata, UseGuards, UseInterceptors, applyDecorators, createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { ApiBearerAuth, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';

// Types
import type { BackofficeAuditAction } from '@harness-monorepo/contracts';
import type { AuditTrail } from './audit/audit-trail.js';
import type { AuthenticatedAdmin, BackofficeRequest } from './backoffice.request.js';

// App
import { Public } from '../auth/auth.decorators.js';
import { AuditInterceptor } from './audit/audit.interceptor.js';
import { BackofficeGuard } from './backoffice.guard.js';
import { AUDITED_KEY, UNAUDITED_KEY } from './backoffice.request.js';

/**
 * How a backoffice controller is declared — the only way. It puts the route under `/backoffice`,
 * behind `BackofficeGuard` and through `AuditInterceptor`, and opens it to the global guard, which
 * would refuse this door's token. `backoffice-routes.spec.ts` refuses a controller under
 * `/backoffice` that got there any other way.
 */
export function BackofficeController(path: string): ClassDecorator {
  return applyDecorators(
    Controller(`backoffice/${path}`),
    Public(),
    UseGuards(BackofficeGuard),
    UseInterceptors(AuditInterceptor),
    ApiTags('backoffice'),
    ApiBearerAuth(),
    ApiUnauthorizedResponse({ description: 'BACKOFFICE_UNAUTHENTICATED — no backoffice session behind the request' }),
  );
}

/**
 * The actions a handler may write to the audit record; the first is what is written for it if it
 * writes nothing. Every backoffice handler that is not a read carries it.
 */
export const Audited = (...actions: [BackofficeAuditAction, ...BackofficeAuditAction[]]): MethodDecorator => SetMetadata(AUDITED_KEY, actions);

/**
 * A write that leaves no audit line, and why. `backoffice-routes.spec.ts` lists every one: adding
 * an exemption is a change to that test, read by whoever reviews it.
 */
export const Unaudited = (reason: string): MethodDecorator => SetMetadata(UNAUDITED_KEY, reason);

/** The administrator behind the request, put there by `BackofficeGuard`. */
export const CurrentAdmin = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedAdmin => {
  const { backofficeAdmin } = context.switchToHttp().getRequest<BackofficeRequest>();
  if (!backofficeAdmin) throw new Error('CurrentAdmin used on a route that BackofficeGuard did not authenticate');
  return backofficeAdmin;
});

/** The request's way to the audit record, made by `AuditInterceptor` for a handler that carries `@Audited`. */
export const Trail = createParamDecorator((_data: unknown, context: ExecutionContext): AuditTrail => {
  const { auditTrail } = context.switchToHttp().getRequest<BackofficeRequest>();
  if (!auditTrail) throw new Error('Trail used on a handler that declares no @Audited action');
  return auditTrail;
});

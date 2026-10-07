// Nest
import { InternalServerErrorException } from '@nestjs/common';
import type { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Libs
import { defer, firstValueFrom, throwError } from 'rxjs';

// Types
import type { AuditService } from './audit.service.js';
import type { AuditLine } from './audit.types.js';
import type { AuthenticatedAdmin, BackofficeRequest } from '../backoffice.request.js';

// App
import { Audited, Unaudited } from '../backoffice.decorators.js';
import { AuditInterceptor } from './audit.interceptor.js';

const ADMIN: AuthenticatedAdmin = { id: 'user-1', name: 'Ana Souza', email: 'ana@bee-link.test', sessionId: 'session-1' };

class Handlers {
  undeclared(): void {}

  @Audited('ADMIN_GRANTED', 'ADMIN_REVOKED')
  declared(): void {}

  @Unaudited('a reason')
  exempt(): void {}
}

function requestOf(method: string, admin?: AuthenticatedAdmin): BackofficeRequest {
  return { method, ip: '203.0.113.7', headers: { 'user-agent': 'a-browser' }, backofficeAdmin: admin };
}

function contextOf(handler: keyof Handlers, request: BackofficeRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => Handlers.prototype[handler],
    getClass: () => Handlers,
  } as unknown as ExecutionContext;
}

describe('AuditInterceptor', () => {
  const lines: AuditLine[] = [];
  const audit = { record: async (line: AuditLine) => void lines.push(line) } as unknown as AuditService;
  const interceptor = new AuditInterceptor(new Reflector(), audit);
  const ran = vi.fn();
  /** As Nest hands a handler over: it runs on subscription, and its answer is emitted once it settled. */
  const next = (act: () => Promise<unknown> = async () => undefined): CallHandler => ({
    handle: () =>
      defer(() => {
        ran();
        return act();
      }),
  });

  beforeEach(() => {
    lines.length = 0;
    ran.mockClear();
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])('refuses a %s that declares no action, before the handler runs', (method) => {
    const attempt = () => interceptor.intercept(contextOf('undeclared', requestOf(method, ADMIN)), next());

    let refusal: unknown;
    try {
      attempt();
    } catch (error) {
      refusal = error;
    }

    expect(refusal).toBeInstanceOf(InternalServerErrorException);
    expect((refusal as InternalServerErrorException).getResponse()).toMatchObject({ errorCode: 'BACKOFFICE_AUDIT_MISSING' });
    expect(ran).not.toHaveBeenCalled();
    expect(lines).toEqual([]);
  });

  it('lets a read through with nothing declared and nothing recorded', async () => {
    await firstValueFrom(interceptor.intercept(contextOf('undeclared', requestOf('GET', ADMIN)), next()));

    expect(ran).toHaveBeenCalledOnce();
    expect(lines).toEqual([]);
  });

  it('lets a write that says why it is not audited through', async () => {
    await firstValueFrom(interceptor.intercept(contextOf('exempt', requestOf('POST')), next()));

    expect(ran).toHaveBeenCalledOnce();
    expect(lines).toEqual([]);
  });

  it('hands the handler a trail bound to the administrator and the address, and adds no line of its own', async () => {
    const request = requestOf('DELETE', ADMIN);
    const act = () => request.auditTrail!.record('ADMIN_REVOKED', { target: { type: 'USER', id: 'user-2', label: 'bia@bee-link.test' } });

    await firstValueFrom(interceptor.intercept(contextOf('declared', request), next(act)));

    expect(lines).toEqual([
      {
        actor: { kind: 'ADMIN', userId: 'user-1', label: 'ana@bee-link.test' },
        action: 'ADMIN_REVOKED',
        target: { type: 'USER', id: 'user-2', label: 'bia@bee-link.test' },
        details: undefined,
        origin: { ip: '203.0.113.7', userAgent: 'a-browser' },
      },
    ]);
  });

  it('records the declared action itself when the handler answered without recording', async () => {
    await firstValueFrom(interceptor.intercept(contextOf('declared', requestOf('POST', ADMIN)), next()));

    expect(lines).toEqual([
      { actor: { kind: 'ADMIN', userId: 'user-1', label: 'ana@bee-link.test' }, action: 'ADMIN_GRANTED', target: undefined, details: undefined, origin: { ip: '203.0.113.7', userAgent: 'a-browser' } },
    ]);
  });

  it('records nobody known where no administrator is behind the request', async () => {
    await firstValueFrom(interceptor.intercept(contextOf('declared', requestOf('POST')), next()));

    expect(lines[0]?.actor).toEqual({ kind: 'ANONYMOUS' });
  });

  it('refuses an action the handler did not declare', async () => {
    const request = requestOf('POST', ADMIN);
    interceptor.intercept(contextOf('declared', request), next());

    await expect(request.auditTrail!.record('BACKOFFICE_SIGNED_IN')).rejects.toThrow(/not an action this handler declared/);
    expect(lines).toEqual([]);
  });

  it('records nothing for a handler that failed: nothing was done', async () => {
    const failing: CallHandler = { handle: () => throwError(() => new Error('refused')) };

    await expect(firstValueFrom(interceptor.intercept(contextOf('declared', requestOf('POST', ADMIN)), failing))).rejects.toThrow('refused');
    expect(lines).toEqual([]);
  });
});

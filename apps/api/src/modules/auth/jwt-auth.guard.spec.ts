// Nest
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';

// Types
import type { AuthenticatedUser } from './auth.decorators.js';

// App
import { JwtAuthGuard } from './jwt-auth.guard.js';

function contextWith(headers: Record<string, string>): ExecutionContext {
  const request: { headers: Record<string, string>; user?: AuthenticatedUser } = { headers };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => undefined,
    getClass: () => undefined,
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  const jwt = new JwtService({ secret: 'a-secret-long-enough-for-these-tests' });
  const closedReflector = { getAllAndOverride: () => false } as unknown as Reflector;
  const guard = new JwtAuthGuard(closedReflector, jwt);

  it('lets a route marked @Public() through with no token', async () => {
    const openReflector = { getAllAndOverride: () => true } as unknown as Reflector;
    const open = new JwtAuthGuard(openReflector, jwt);

    await expect(open.canActivate(contextWith({}))).resolves.toBe(true);
  });

  it('puts the person on the request when the token checks out', async () => {
    const token = await jwt.signAsync({ sub: 'user-1', sid: 'session-1' });
    const context = contextWith({ authorization: `Bearer ${token}` });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.switchToHttp().getRequest<{ user: AuthenticatedUser }>().user).toEqual({
      id: 'user-1',
      sessionId: 'session-1',
    });
  });

  it.each([
    ['no header at all', {}],
    ['a token with no scheme', { authorization: 'abc.def.ghi' }],
    ['another scheme', { authorization: 'Basic abc' }],
    ['a token signed by someone else', { authorization: 'Bearer abc.def.ghi' }],
  ])('refuses %s with AUTH_UNAUTHENTICATED', async (_case, headers) => {
    await expect(guard.canActivate(contextWith(headers))).rejects.toThrow(UnauthorizedException);
    await guard.canActivate(contextWith(headers)).catch((error: UnauthorizedException) => {
      expect(error.getResponse()).toMatchObject({ errorCode: 'AUTH_UNAUTHENTICATED' });
    });
  });
});

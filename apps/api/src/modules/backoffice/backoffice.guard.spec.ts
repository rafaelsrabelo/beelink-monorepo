// Nest
import { UnauthorizedException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Types
import type { BackofficeSessionService } from './auth/backoffice-session.service.js';
import type { AuthenticatedAdmin, BackofficeRequest } from './backoffice.request.js';

// App
import { BACKOFFICE_TOKEN_KIND } from './backoffice.constants.js';
import { BackofficeGuard } from './backoffice.guard.js';

const ADMIN: AuthenticatedAdmin = { id: 'user-1', name: 'Ana Souza', email: 'ana@bee-link.test', sessionId: 'session-1' };

function contextWith(headers: Record<string, string>): { context: ExecutionContext; request: BackofficeRequest } {
  const request: BackofficeRequest = { method: 'GET', headers };
  const context = { switchToHttp: () => ({ getRequest: () => request }) } as unknown as ExecutionContext;
  return { context, request };
}

describe('BackofficeGuard', () => {
  const jwt = new JwtService({ secret: 'a-secret-long-enough-for-these-tests' });
  const authenticate = vi.fn(async (): Promise<AuthenticatedAdmin | null> => ADMIN);
  const guard = new BackofficeGuard(jwt, { authenticate } as unknown as BackofficeSessionService);

  const bearer = async (payload: Record<string, unknown>) => ({ authorization: `Bearer ${await jwt.signAsync(payload)}` });
  const backofficeToken = () => bearer({ sub: 'user-1', sid: 'session-1', kind: BACKOFFICE_TOKEN_KIND, step: 'EMAIL_CODE' });

  const refusal = async (headers: Record<string, string>) => {
    const error = await guard.canActivate(contextWith(headers).context).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(UnauthorizedException);
    return (error as UnauthorizedException).getResponse();
  };

  beforeEach(() => {
    authenticate.mockClear();
    authenticate.mockResolvedValue(ADMIN);
  });

  it('puts the administrator on the request when the token and its session check out', async () => {
    const { context, request } = contextWith(await backofficeToken());

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(request.backofficeAdmin).toEqual(ADMIN);
    expect(authenticate).toHaveBeenCalledWith('user-1', 'session-1', 'EMAIL_CODE');
  });

  it("refuses a shopkeeper's token, which is valid and says no kind", async () => {
    expect(await refusal(await bearer({ sub: 'user-1', sid: 'session-1' }))).toMatchObject({ errorCode: 'BACKOFFICE_UNAUTHENTICATED' });
    expect(authenticate).not.toHaveBeenCalled();
  });

  it("refuses a shopper's token", async () => {
    expect(await refusal(await bearer({ sub: 'user-1', sid: 'session-1', kind: 'customer' }))).toMatchObject({ errorCode: 'BACKOFFICE_UNAUTHENTICATED' });
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('refuses a token of this door that names no second step', async () => {
    expect(await refusal(await bearer({ sub: 'user-1', sid: 'session-1', kind: BACKOFFICE_TOKEN_KIND }))).toMatchObject({ errorCode: 'BACKOFFICE_UNAUTHENTICATED' });
    expect(authenticate).not.toHaveBeenCalled();
  });

  it('refuses a valid token whose session is over, or whose owner is no administrator any more', async () => {
    authenticate.mockResolvedValue(null);

    expect(await refusal(await backofficeToken())).toMatchObject({ errorCode: 'BACKOFFICE_UNAUTHENTICATED' });
  });

  it.each([
    ['no header at all', {}],
    ['a token with no scheme', { authorization: 'abc.def.ghi' }],
    ['another scheme', { authorization: 'Basic abc' }],
    ['a token signed by someone else', { authorization: 'Bearer abc.def.ghi' }],
  ])('refuses %s', async (_case, headers) => {
    expect(await refusal(headers)).toMatchObject({ errorCode: 'BACKOFFICE_UNAUTHENTICATED' });
  });

  it('lets a database error surface instead of reading it as signed out', async () => {
    authenticate.mockRejectedValue(new Error('connection lost'));

    await expect(guard.canActivate(contextWith(await backofficeToken()).context)).rejects.toThrow('connection lost');
  });
});

// Nest
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// App
import { IS_PUBLIC_KEY } from '../auth/auth.decorators.js';
import { PAGE_LOCK_KEY } from './page-lock.decorators.js';
import { PageLockGuard } from './page-lock.guard.js';
import type { LockedPage, PageLocks } from './page-locks.service.js';

const OWNER = 'owner-1';
const locked: LockedPage = { ownerId: OWNER, lock: 'TRIAL_EXPIRED', changesAt: null };

interface Ask {
  params?: Record<string, string>;
  user?: { id: string; sessionId: string };
  answer?: 'open' | 'told';
  visitor?: boolean;
}

/** A guard over a page that is `page`, where pages lock or not, and a request to one route of it. */
function guarding(page: LockedPage | null, engaged = true) {
  const pageOf = vi.fn(async () => page);
  const locks = { engaged, pageOf } as unknown as PageLocks;
  const guard = new PageLockGuard(new Reflector(), locks);

  async function ask({ params = { storeSlug: 'padaria' }, user = { id: OWNER, sessionId: 's' }, answer, visitor = false }: Ask = {}) {
    const handler = () => undefined;
    if (answer) Reflect.defineMetadata(PAGE_LOCK_KEY, answer, handler);
    if (visitor) Reflect.defineMetadata(IS_PUBLIC_KEY, true, handler);
    const request: { params: Record<string, string>; user?: unknown; pageLock?: LockedPage } = { params, ...(visitor ? {} : { user }) };
    const context = {
      getType: () => 'http',
      getHandler: () => handler,
      getClass: () => class Route {},
      switchToHttp: () => ({ getRequest: () => request }),
    } as unknown as ExecutionContext;
    return { outcome: await guard.canActivate(context).then(String, (error: { response?: { errorCode?: string } }) => error.response?.errorCode ?? 'thrown'), request };
  }

  return { ask, pageOf };
}

describe('the guard of a locked page (BEELINK-223)', () => {
  it('asks the database nothing where pages do not lock: the product as it was', async () => {
    const { ask, pageOf } = guarding(locked, false);

    expect((await ask()).outcome).toBe('true');
    expect((await ask({ visitor: true })).outcome).toBe('true');
    expect(pageOf).not.toHaveBeenCalled();
  });

  it('asks nothing for a route with no page in its path, or one open while locked', async () => {
    const { ask, pageOf } = guarding(locked);

    expect((await ask({ params: {} })).outcome).toBe('true');
    expect((await ask({ answer: 'open' })).outcome).toBe('true');
    expect(pageOf).not.toHaveBeenCalled();
  });

  it("refuses the owner a locked page's panel, by `storeSlug` or by the stores' own `slug`", async () => {
    const { ask } = guarding(locked);

    expect((await ask()).outcome).toBe('PAGE_LOCKED');
    expect((await ask({ params: { slug: 'padaria' } })).outcome).toBe('PAGE_LOCKED');
  });

  it('lets anybody but the owner through to the answer they get today, and a page nobody holds too', async () => {
    expect((await guarding(locked).ask({ user: { id: 'someone-else', sessionId: 's' } })).outcome).toBe('true');
    expect((await guarding(null).ask()).outcome).toBe('true');
  });

  it("refuses a locked page's shop window to anyone, never saying why", async () => {
    expect((await guarding(locked).ask({ visitor: true })).outcome).toBe('STORE_UNAVAILABLE');
  });

  it('lets an open page through', async () => {
    expect((await guarding({ ...locked, lock: null }).ask()).outcome).toBe('true');
    expect((await guarding({ ...locked, lock: null }).ask({ visitor: true })).outcome).toBe('true');
  });

  it('hands a route that answers a locked page in its own way how the page stands, and lets it through', async () => {
    const { outcome, request } = await guarding(locked).ask({ answer: 'told', visitor: true });

    expect(outcome).toBe('true');
    expect(request.pageLock).toEqual(locked);
  });
});

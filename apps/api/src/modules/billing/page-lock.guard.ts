// Nest
import { Injectable } from '@nestjs/common';
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

// Types
import type { AuthenticatedUser } from '../auth/auth.decorators.js';

// App
import { IS_PUBLIC_KEY } from '../auth/auth.decorators.js';
import { pageLocked, storeUnavailable } from './billing-refusals.js';
import { PAGE_LOCK_KEY, type LockedPageAnswer } from './page-lock.decorators.js';
import { PageLocks, type LockedPage } from './page-locks.service.js';

interface PageRequest {
  params?: Record<string, string | undefined>;
  user?: AuthenticatedUser;
  pageLock?: LockedPage;
}

/**
 * The lock of a page that does not pay (BEELINK-223), on every route with a page in its path — the
 * panel's `stores/:storeSlug/…` and `stores/:slug…`, and the shop window's. Registered globally after
 * the session's guard, which has said who is asking by then; closed by default, like it: a route of a
 * page answers a locked one only if it says so (`@OpenWhileLocked()`, `@AnswersLockedPage()`).
 *
 * Behind the panel's door the page's owner alone hears of the lock — `403 PAGE_LOCKED`, and why. For
 * anybody else, and for a page nobody holds, the guard lets the request through to the answer it gets
 * today (`STORE_FORBIDDEN`, `STORE_NOT_FOUND`): a lock is never told to a stranger. A shop window's
 * visitor is told `403 STORE_UNAVAILABLE`, never why.
 *
 * Where nothing locks (`PageLocks.engaged`), it returns before anything is read: the product as it
 * was, with no query more. Whether a page is locked is `page-lock.ts`'s alone to say, computed at the
 * instant of the request: a payment read a moment ago opens the page on the next one.
 */
@Injectable()
export class PageLockGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly locks: PageLocks,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    if (!this.locks.engaged || context.getType() !== 'http') return true;

    const request = context.switchToHttp().getRequest<PageRequest>();
    // `slug` is the stores' own routes' word for the page; every other route of a page says `storeSlug`.
    const slug = request.params?.storeSlug ?? request.params?.slug;
    if (!slug) return true;

    const targets = [context.getHandler(), context.getClass()];
    const answer = this.reflector.getAllAndOverride<LockedPageAnswer | undefined>(PAGE_LOCK_KEY, targets);
    if (answer === 'open') return true;

    const page = await this.locks.pageOf(slug, new Date());
    if (!page) return true;
    const visitor = this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, targets) === true;
    if (!visitor && request.user?.id !== page.ownerId) return true;

    if (answer === 'told') {
      request.pageLock = page;
      return true;
    }
    if (!page.lock) return true;
    throw visitor ? storeUnavailable() : pageLocked(page.lock);
  }
}

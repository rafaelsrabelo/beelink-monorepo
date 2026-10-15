// Nest
import { createParamDecorator, SetMetadata } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

// Types
import type { LockedPage } from './page-locks.service.js';

export const PAGE_LOCK_KEY = 'billing:page-lock';

/** How a route of a page answers while the page is locked, when it does not refuse as every other. */
export type LockedPageAnswer = 'open' | 'told';

/**
 * Opens a route of a page while the page is locked for want of payment (BEELINK-223): it answers as
 * it always does, and the lock is not asked. For what is the shopkeeper's or the customer's whatever
 * the page owes — the page's own subscription, a customer's account and orders. Every other route
 * with a page in its path is closed to a locked page by `PageLockGuard`, and a new one is born closed.
 */
export const OpenWhileLocked = () => SetMetadata(PAGE_LOCK_KEY, 'open' satisfies LockedPageAnswer);

/**
 * A route that answers a locked page in a way of its own — the shop's public read, which serves who
 * the shop is and nothing it sells: the guard lets it through and hands it how the page stands
 * (`@PageLockOf()`).
 */
export const AnswersLockedPage = () => SetMetadata(PAGE_LOCK_KEY, 'told' satisfies LockedPageAnswer);

/** How the page stands for its lock, as the guard read it for a route that `AnswersLockedPage`; undefined where nothing locks. */
export const PageLockOf = createParamDecorator((_data: unknown, context: ExecutionContext): LockedPage | undefined => context.switchToHttp().getRequest<{ pageLock?: LockedPage }>().pageLock);

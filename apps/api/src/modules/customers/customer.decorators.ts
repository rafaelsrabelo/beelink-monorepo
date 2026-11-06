// Nest
import { createParamDecorator, SetMetadata } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

// App
import type { Buyer } from './buyers.service.js';
import type { AuthenticatedCustomer } from './customer-auth.guard.js';

/** The metadata `OpenToPurchase` sets and `CustomerAuthGuard` reads. */
export const OPEN_TO_PURCHASE = 'customer:open-to-purchase';

/** The shopper behind the bearer token, put on the request by CustomerAuthGuard. */
export const CurrentCustomer = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedCustomer => {
  const request = context.switchToHttp().getRequest<{ customer?: AuthenticatedCustomer }>();
  if (!request.customer) throw new Error('CurrentCustomer used on a route that CustomerAuthGuard did not authenticate');
  return request.customer;
});

/**
 * Opens a route to a purchase session (plan 2026-11-06--whatsapp-primeiro) beside the account's: what a
 * purchase needs — pricing, placing, reading the orders it placed and their payment. Every route without
 * it refuses a purchase session as if there were no token.
 */
export const OpenToPurchase = () => SetMetadata(OPEN_TO_PURCHASE, true);

/** Who is buying at a route open to a purchase session: the account, or the purchase. Put on the request by CustomerAuthGuard. */
export const CurrentBuyer = createParamDecorator((_data: unknown, context: ExecutionContext): Buyer => {
  const request = context.switchToHttp().getRequest<{ buyer?: Buyer }>();
  if (!request.buyer) throw new Error('CurrentBuyer used on a route that CustomerAuthGuard did not authenticate');
  return request.buyer;
});

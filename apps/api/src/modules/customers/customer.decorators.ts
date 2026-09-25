// Nest
import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';

// App
import type { AuthenticatedCustomer } from './customer-auth.guard.js';

/** The shopper behind the bearer token, put on the request by CustomerAuthGuard. */
export const CurrentCustomer = createParamDecorator((_data: unknown, context: ExecutionContext): AuthenticatedCustomer => {
  const request = context.switchToHttp().getRequest<{ customer?: AuthenticatedCustomer }>();
  if (!request.customer) throw new Error('CurrentCustomer used on a route that CustomerAuthGuard did not authenticate');
  return request.customer;
});

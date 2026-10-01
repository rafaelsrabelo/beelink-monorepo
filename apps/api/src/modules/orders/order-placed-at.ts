// Nest
import { BadRequestException } from '@nestjs/common';

// App
import { orderError, PLACED_AT_SKEW_MS } from './orders.constants.js';

/**
 * When a sale the panel registers — or prices before registering — was made: now, or the past
 * instant it gives. The promotions running and a coupon's period are read at it.
 */
export function placedAtOf(given: string | undefined): Date {
  const placedAt = given ? new Date(given) : new Date();
  // ISO-shaped is not a date: "2026-02-30" passes the shape and parses to nothing.
  if (Number.isNaN(placedAt.getTime())) {
    throw new BadRequestException({ errorCode: 'BAD_REQUEST', message: 'placedAt is not a date' });
  }
  if (placedAt.getTime() > Date.now() + PLACED_AT_SKEW_MS) {
    throw new BadRequestException(orderError('ORDER_PLACED_IN_FUTURE', 'An order cannot be placed in the future'));
  }
  return placedAt;
}

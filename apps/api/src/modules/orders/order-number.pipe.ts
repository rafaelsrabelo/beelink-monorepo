// Nest
import { Injectable, NotFoundException } from '@nestjs/common';
import type { PipeTransform } from '@nestjs/common';

// App
import { orderError, ORDER_NUMBER_MAX } from './orders.constants.js';

/**
 * An order number from the path. What is not a number from 1 to the column's limit names no order:
 * a 404, as for a number the shop never gave — not a 400, and never the database's 500 for an
 * integer too large for INT4.
 */
@Injectable()
export class OrderNumberPipe implements PipeTransform<string, number> {
  transform(value: string): number {
    const number = /^\d{1,10}$/.test(value) ? Number(value) : 0;
    if (number < 1 || number > ORDER_NUMBER_MAX) {
      throw new NotFoundException(orderError('ORDER_NOT_FOUND', `No order #${value} in this shop`));
    }
    return number;
  }
}

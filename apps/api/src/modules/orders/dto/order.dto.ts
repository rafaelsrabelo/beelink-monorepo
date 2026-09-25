// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

// Types
import type {
  CreateOrderItemInput,
  OrderFulfillment,
  OrderListQuery,
  OrderStatus,
  PaymentMethod,
  UpdateOrderStatusPayload,
} from '@harness-monorepo/contracts';

// App
import { blankToNull, trim } from '../../stores/dto/store-fields.dto.js';
import { PAYMENT_METHODS } from '../../stores/stores.constants.js';
import {
  ORDER_AMOUNT_MAX_CENTS,
  ORDER_FULFILLMENTS,
  ORDER_ITEMS_MAX,
  ORDER_NOTE_MAX_LENGTH,
  ORDER_QUANTITY_MAX,
  ORDER_STATUSES,
  ORDERS_PAGE_SIZE,
  ORDERS_PAGE_SIZE_MAX,
} from '../orders.constants.js';

/**
 * The customer, as a flat shape: `id` for one the shop has, or `name` and `phone` to register one
 * on the order. Which of the two it is, is the service's to check — a DTO cannot validate a union.
 */
export class OrderCustomerDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'A customer of this shop.' })
  @IsOptional()
  @IsUUID()
  id?: string;

  @ApiPropertyOptional({ example: 'Ana Souza', minLength: 2, maxLength: 120 })
  @IsOptional()
  @IsString()
  @trim
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: '5511999998888', description: 'Digits only; the phone the shop knows them by.' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.replace(/\D/g, '') : value))
  @Matches(/^\d{10,15}$/)
  phone?: string;
}

export class OrderItemDto implements CreateOrderItemInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ minimum: 1, maximum: ORDER_QUANTITY_MAX })
  @IsInt()
  @Min(1)
  @Max(ORDER_QUANTITY_MAX)
  quantity!: number;
}

/** What the panel sends. No price anywhere: the API reads each variant's. */
export class CreateOrderDto {
  @ApiProperty({ type: OrderCustomerDto })
  @IsObject()
  @ValidateNested()
  @Type(() => OrderCustomerDto)
  customer!: OrderCustomerDto;

  @ApiProperty({ type: [OrderItemDto], minItems: 1, maxItems: ORDER_ITEMS_MAX })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ORDER_ITEMS_MAX)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];

  @ApiProperty({ enum: ORDER_FULFILLMENTS })
  @IsIn(ORDER_FULFILLMENTS)
  fulfillment!: OrderFulfillment;

  @ApiPropertyOptional({ minimum: 0, maximum: ORDER_AMOUNT_MAX_CENTS, description: 'Whole cents; zero on a pick-up.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(ORDER_AMOUNT_MAX_CENTS)
  deliveryFeeCents?: number;

  @ApiPropertyOptional({ minimum: 0, maximum: ORDER_AMOUNT_MAX_CENTS, description: 'Whole cents, off the total.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(ORDER_AMOUNT_MAX_CENTS)
  discountCents?: number;

  @ApiProperty({ enum: PAYMENT_METHODS })
  @IsIn(PAYMENT_METHODS)
  paymentMethod!: PaymentMethod;

  @ApiPropertyOptional({ maxLength: ORDER_NOTE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @trim
  @MaxLength(ORDER_NOTE_MAX_LENGTH)
  note?: string;

  @ApiPropertyOptional({ format: 'date-time', description: 'When it was sold; absent is now, the future is refused.' })
  @IsOptional()
  @IsISO8601({ strict: true })
  placedAt?: string;
}

export class UpdateOrderStatusDto implements UpdateOrderStatusPayload {
  @ApiProperty({ enum: ORDER_STATUSES })
  @IsIn(ORDER_STATUSES)
  status!: OrderStatus;
}

/** How the panel asks for a page. Absent means all, so a bare `GET` is the first page of everything. */
export class ListOrdersDto implements OrderListQuery {
  @ApiPropertyOptional({ enum: ORDER_STATUSES })
  @IsOptional()
  @blankToNull
  @IsIn(ORDER_STATUSES)
  status?: OrderStatus;

  @ApiPropertyOptional({ description: 'An order number, a customer name, or digits of their phone.' })
  @IsOptional()
  @IsString()
  @trim
  @MaxLength(120)
  q?: string;

  // `@Type(() => Number)` and not the pipe's implicit conversion — apps/api/AGENTS.md, rule 6.
  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({ minimum: 1, maximum: ORDERS_PAGE_SIZE_MAX, default: ORDERS_PAGE_SIZE })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(ORDERS_PAGE_SIZE_MAX)
  @Type(() => Number)
  pageSize?: number;
}

// Nest
import { applyDecorators } from '@nestjs/common';
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
  IsUrl,
  IsUUID,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

// Types
import type {
  CreateOrderItemInput,
  OrderDeliveryKind,
  OrderDeliveryPayload,
  OrderFulfillment,
  OrderListQuery,
  OrderPaymentFilter,
  OrderShippingChoice,
  OrderStatus,
  OrderStatusFilter,
  PaymentMethod,
  UpdateOrderStatusPayload,
} from '@harness-monorepo/contracts';

// App
import { MaxCodePoints } from '../../../shared/http/max-code-points.js';
import { blankToNull, normaliseWhatsapp, trim } from '../../stores/dto/store-fields.dto.js';
import { ORDER_PAYMENT_FILTERS } from '../../payments/dto/payment.response.js';
import { OrderCancellationRefundDto } from '../../payments/dto/refund-order.dto.js';
import { PAYMENT_METHODS } from '../../stores/stores.constants.js';
import {
  ORDER_AMOUNT_MAX_CENTS,
  ORDER_COUPON_CODE_MAX_LENGTH,
  ORDER_DELIVERY_KINDS,
  ORDER_FULFILLMENTS,
  ORDER_ITEMS_MAX,
  ORDER_NOTE_MAX_LENGTH,
  ORDER_QUANTITY_MAX,
  ORDER_STATUS_FILTERS,
  ORDER_STATUSES,
  ORDERS_PAGE_MAX,
  ORDERS_PAGE_SIZE,
  ORDERS_PAGE_SIZE_MAX,
  SHIPPING_CHOICE_KINDS,
} from '../orders.constants.js';

/** A UUID in the case Postgres answers it in, so an id sent in capitals still matches its row. */
const lowerCase = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.toLowerCase() : value));

/** The customer's credit an order spends (BEELINK-240), as its quote offered it; the API checks it again as the order is written. */
export const cashbackCents = applyDecorators(
  ApiPropertyOptional({ minimum: 0, maximum: ORDER_AMOUNT_MAX_CENTS, description: "Whole cents of the customer's credit to spend, as the quote offered it; absent is none. More than they can spend now is ORDER_CASHBACK_REFUSED." }),
  IsOptional(),
  IsInt(),
  Min(0),
  Max(ORDER_AMOUNT_MAX_CENTS),
);

/** A coupon's code as a person types it: blank is none, and whether it holds is the pricing's to say. */
export const couponCode = applyDecorators(
  ApiPropertyOptional({ nullable: true, type: String, maxLength: ORDER_COUPON_CODE_MAX_LENGTH, example: 'BEMVINDO10', description: 'A coupon of the shop, in any case; blank is none.' }),
  IsOptional(),
  blankToNull,
  IsString(),
  MaxLength(ORDER_COUPON_CODE_MAX_LENGTH),
);

/**
 * The customer, as a flat shape: `id` for one the shop has, or `name` and `phone` to register one
 * on the order. Which of the two it is, is the service's to check — a DTO cannot validate a union.
 */
export class OrderCustomerDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'A customer of this shop.' })
  @IsOptional()
  @IsUUID()
  @lowerCase
  id?: string;

  @ApiPropertyOptional({ example: 'Ana Souza', minLength: 2, maxLength: 120 })
  @IsOptional()
  @IsString()
  @trim
  @MinLength(2)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    example: '(11) 99999-8888',
    description: 'Any way a person writes it; kept as a WhatsApp link wants it, which is the key the shop finds them by.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{12,15}$/, { message: 'phone must be a phone number, area code included' })
  @normaliseWhatsapp
  phone?: string;
}

export class OrderItemDto implements CreateOrderItemInput {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @lowerCase
  variantId!: string;

  @ApiProperty({ minimum: 1, maximum: ORDER_QUANTITY_MAX })
  @IsInt()
  @Min(1)
  @Max(ORDER_QUANTITY_MAX)
  quantity!: number;
}

/** The way a delivery goes by: the shop's own, or a carrier's service by Melhor Envio's id (BEELINK-186). */
export class OrderShippingChoiceDto {
  @ApiProperty({ enum: SHIPPING_CHOICE_KINDS })
  @IsIn(SHIPPING_CHOICE_KINDS)
  kind!: OrderShippingChoice['kind'];

  @ApiPropertyOptional({ minimum: 1, description: "Melhor Envio's service id; required on a CARRIER." })
  @ValidateIf((choice: OrderShippingChoiceDto) => choice.kind === 'CARRIER')
  @IsInt()
  @Min(1)
  serviceId?: number;
}

/**
 * A delivery's way on a body: validated by `OrderShippingChoiceDto`, and read as the contract's
 * union — a CARRIER that passed has its `serviceId`.
 */
export const shippingChoice = applyDecorators(
  ApiPropertyOptional({ type: () => OrderShippingChoiceDto, description: "The way a delivery goes by, among the shipping quote's; absent, the shop's own delivery." }),
  IsOptional(),
  IsObject(),
  ValidateNested(),
  Type(() => OrderShippingChoiceDto),
);

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

  @ApiPropertyOptional({ minimum: 0, maximum: ORDER_AMOUNT_MAX_CENTS, description: 'Whole cents the shopkeeper takes off by hand, beyond the promotions and the coupon.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(ORDER_AMOUNT_MAX_CENTS)
  discountCents?: number;

  @couponCode
  couponCode?: string | null;

  @cashbackCents
  cashbackCents?: number;

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

  @ApiPropertyOptional({ type: OrderCancellationRefundDto, description: 'On a cancellation of an order that holds its customer\'s money (BEELINK-208): the refund of all that is left, asked of Asaas first. Without it such a cancellation answers ORDER_PAID.' })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderCancellationRefundDto)
  refund?: OrderCancellationRefundDto;
}

/** How the panel asks for a page. Absent means all, so a bare `GET` is the first page of everything. */
export class ListOrdersDto implements OrderListQuery {
  @ApiPropertyOptional({ enum: ORDER_STATUS_FILTERS, description: 'One status, or OPEN: every order still asking something of the shop — the ones the panel menu counts (BEELINK-309).' })
  @IsOptional()
  @blankToNull
  @IsIn(ORDER_STATUS_FILTERS)
  status?: OrderStatusFilter;

  @ApiPropertyOptional({
    enum: ORDER_PAYMENT_FILTERS,
    description: 'By where the money stands (BEELINK-207): PAID holds the customer\'s money; PENDING is charged online, not cancelled and never paid; PAID_UNSEEN is paid and not opened since; STRAY has money it did not ask for.',
  })
  @IsOptional()
  @blankToNull
  @IsIn(ORDER_PAYMENT_FILTERS)
  payment?: OrderPaymentFilter;

  @ApiPropertyOptional({ description: 'An order number, a customer name, or digits of their phone.' })
  @IsOptional()
  @IsString()
  @trim
  @MaxLength(120)
  q?: string;

  @ApiPropertyOptional({ format: 'uuid', description: "One customer's orders only; another shop's customer finds none." })
  @IsOptional()
  @IsUUID()
  @lowerCase
  customerId?: string;

  // `@Type(() => Number)` and not the pipe's implicit conversion — apps/api/AGENTS.md, rule 6.
  @ApiPropertyOptional({ minimum: 1, maximum: ORDERS_PAGE_MAX, default: 1 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(ORDERS_PAGE_MAX)
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

/** A day of the calendar, `YYYY-MM-DD`: a window is days, never hours. Lengths below count as the columns do, in code points. */
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * What the shopkeeper tells of a delivery, whole: an absent field is cleared, since the form sends
 * the record as it stands. Whether the window's two days fit together is the service's to check —
 * a DTO validates fields one at a time.
 */
export class OrderDeliveryDto implements OrderDeliveryPayload {
  @ApiProperty({ enum: ORDER_DELIVERY_KINDS, description: 'OWN — the shop brings it · CARRIER — a carrier does' })
  @IsIn(ORDER_DELIVERY_KINDS)
  kind!: OrderDeliveryKind;

  @ApiPropertyOptional({ nullable: true, maxLength: 60, example: 'Correios' })
  @IsOptional()
  @blankToNull
  @IsString()
  @MaxCodePoints(60)
  carrier?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 60, example: 'SEDEX' })
  @IsOptional()
  @blankToNull
  @IsString()
  @MaxCodePoints(60)
  service?: string | null;

  @ApiPropertyOptional({ nullable: true, maxLength: 60, example: 'AB123456789BR' })
  @IsOptional()
  @blankToNull
  @IsString()
  @MaxCodePoints(60)
  trackingCode?: string | null;

  // Opened by the customer's browser: anything but https is a link somebody else chose.
  @ApiPropertyOptional({ nullable: true, maxLength: 500, description: 'https only; empty, a Correios code leads to their page.' })
  @IsOptional()
  @blankToNull
  @IsUrl({ protocols: ['https'], require_protocol: true }, { context: { errorCode: 'ORDER_DELIVERY_LINK_INVALID' } })
  @MaxCodePoints(500)
  trackingUrl?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date', example: '2026-09-25' })
  @IsOptional()
  @blankToNull
  @Matches(DAY)
  @IsISO8601({ strict: true })
  estimateFrom?: string | null;

  @ApiPropertyOptional({ nullable: true, format: 'date', example: '2026-09-26' })
  @IsOptional()
  @blankToNull
  @Matches(DAY)
  @IsISO8601({ strict: true })
  estimateTo?: string | null;
}

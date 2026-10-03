// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayMinSize, IsArray, IsObject, IsOptional, IsString, Matches, MaxLength, ValidateNested } from 'class-validator';

// Types
import type { ShippingDestination, ShippingErrorCode, ShippingQuotePayload } from '@harness-monorepo/contracts';

// App
import { OrderItemDto } from '../../orders/dto/order.dto.js';
import { ORDER_ITEMS_MAX } from '../../orders/orders.constants.js';

/** The code a failed constraint answers, read by `ApiValidationPipe`. */
const answering = { context: { errorCode: 'SHIPPING_DESTINATION_INVALID' satisfies ShippingErrorCode } };

export class ShippingDestinationDto implements ShippingDestination {
  @ApiProperty({ example: '01310-930', description: 'Eight digits, with or without the mask.' })
  @IsString(answering)
  @Matches(/^\d{5}-?\d{3}$/, answering)
  zipCode!: string;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'Rua Augusta' })
  @IsOptional()
  @IsString(answering)
  @MaxLength(200, answering)
  street?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: '1500' })
  @IsOptional()
  @IsString(answering)
  @MaxLength(20, answering)
  number?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'Consolação' })
  @IsOptional()
  @IsString(answering)
  @MaxLength(120, answering)
  neighborhood?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'São Paulo' })
  @IsOptional()
  @IsString(answering)
  @MaxLength(120, answering)
  city?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String, example: 'SP' })
  @IsOptional()
  @IsString(answering)
  @Matches(/^[A-Za-z]{2}$/, answering)
  state?: string | null;
}

export class ShippingQuoteDto implements ShippingQuotePayload {
  @ApiProperty({ type: ShippingDestinationDto })
  @IsObject(answering)
  @ValidateNested()
  @Type(() => ShippingDestinationDto)
  destination!: ShippingDestinationDto;

  @ApiProperty({ type: [OrderItemDto], minItems: 1, maxItems: ORDER_ITEMS_MAX })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(ORDER_ITEMS_MAX)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items!: OrderItemDto[];
}

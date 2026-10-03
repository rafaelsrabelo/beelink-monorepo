// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Transform, Type } from 'class-transformer';
import { IsInt, IsObject, IsOptional, Matches, Max, Min, ValidateIf, ValidateNested } from 'class-validator';

// Types
import type { BuyOrderLabelPayload, LabelErrorCode, OrderLabel, OrderLabelBlocker, OrderLabelOverview, OrderLabelPrint, OrderLabelStatus, OrderLabelVolume } from '@harness-monorepo/contracts';

// App
import { PARCEL_GRAMS_MAX, PARCEL_MM_MAX } from '../../../../catalog/catalog.constants.js';
import { ShippingCarrierResponse } from '../../../../delivery/dto/delivery.response.js';

const answering = { context: { errorCode: 'LABEL_INVALID' satisfies LabelErrorCode } };

const STATUSES = ['IN_CART', 'PAID', 'GENERATED', 'CANCELLED'] as const satisfies readonly OrderLabelStatus[];
const BLOCKERS = ['NOT_CARRIER', 'ORDER_CANCELLED', 'NOT_CONNECTED', 'NO_SENDER_DOCUMENT', 'NO_ORIGIN', 'NO_RECIPIENT_DOCUMENT', 'RECIPIENT_ADDRESS_INCOMPLETE'] as const satisfies readonly OrderLabelBlocker[];

/** The box as it will be posted, in the product's own units and the carriers' bounds. */
export class OrderLabelVolumeDto implements OrderLabelVolume {
  @ApiProperty({ minimum: 1, maximum: PARCEL_GRAMS_MAX, description: 'Grams, the box and what is in it.' })
  @IsInt(answering)
  @Min(1, answering)
  @Max(PARCEL_GRAMS_MAX, answering)
  weightGrams!: number;

  @ApiProperty({ minimum: 1, maximum: PARCEL_MM_MAX, description: 'Millimetres.' })
  @IsInt(answering)
  @Min(1, answering)
  @Max(PARCEL_MM_MAX, answering)
  lengthMm!: number;

  @ApiProperty({ minimum: 1, maximum: PARCEL_MM_MAX, description: 'Millimetres.' })
  @IsInt(answering)
  @Min(1, answering)
  @Max(PARCEL_MM_MAX, answering)
  widthMm!: number;

  @ApiProperty({ minimum: 1, maximum: PARCEL_MM_MAX, description: 'Millimetres.' })
  @IsInt(answering)
  @Min(1, answering)
  @Max(PARCEL_MM_MAX, answering)
  heightMm!: number;
}

export class BuyOrderLabelDto implements BuyOrderLabelPayload {
  @ApiProperty({ type: OrderLabelVolumeDto })
  @IsObject(answering)
  @ValidateNested()
  @Type(() => OrderLabelVolumeDto)
  volume!: OrderLabelVolumeDto;

  @ApiPropertyOptional({ nullable: true, type: String, description: "The NF-e's 44-digit key; absent or null sends a declaration of contents." })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.replace(/\D/g, '') || null : value))
  @ValidateIf((_, value) => value !== null)
  @Matches(/^\d{44}$/, answering)
  invoiceKey?: string | null;
}

class OrderLabelVolumeResponse implements OrderLabelVolume {
  @ApiProperty() weightGrams!: number;
  @ApiProperty() lengthMm!: number;
  @ApiProperty() widthMm!: number;
  @ApiProperty() heightMm!: number;
}

class OrderLabelResponse implements OrderLabel {
  @ApiProperty({ enum: STATUSES }) status!: OrderLabelStatus;
  @ApiProperty({ nullable: true, type: String, example: 'ORD-202610020001' }) protocol!: string | null;
  @ApiProperty({ description: 'What it cost the wallet, in cents.' }) priceCents!: number;
  @ApiProperty({ type: OrderLabelVolumeResponse }) volume!: OrderLabelVolumeResponse;
  @ApiProperty({ nullable: true, type: String }) invoiceKey!: string | null;
  @ApiProperty({ nullable: true, type: String }) trackingCode!: string | null;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) paidAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) generatedAt!: string | null;
  @ApiProperty({ nullable: true, type: String, format: 'date-time' }) cancelledAt!: string | null;
}

export class OrderLabelOverviewResponse implements OrderLabelOverview {
  @ApiProperty({ type: OrderLabelResponse, nullable: true }) label!: OrderLabelResponse | null;
  @ApiProperty({ enum: BLOCKERS, isArray: true, description: 'Empty: a label can be bought.' }) blockers!: OrderLabelBlocker[];
  @ApiProperty({ type: ShippingCarrierResponse, nullable: true }) carrier!: ShippingCarrierResponse | null;
  @ApiProperty({ type: OrderLabelVolumeResponse, nullable: true, description: 'The box Melhor Envio would pack the order in.' }) suggestedVolume!: OrderLabelVolumeResponse | null;
  @ApiProperty({ nullable: true, type: Number, description: 'The wallet now, in cents.' }) balanceCents!: number | null;
  @ApiProperty({ description: 'Where the shopkeeper adds to the wallet.' }) walletUrl!: string;
}

export class OrderLabelPrintResponse implements OrderLabelPrint {
  @ApiProperty({ description: "The label's PDF, at a public address made there and then." }) url!: string;
}

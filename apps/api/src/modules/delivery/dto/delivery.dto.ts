// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsBoolean, IsInt, IsObject, Max, Min, ValidateIf, ValidateNested } from 'class-validator';

// Types
import type { DeliveryBand, DeliveryErrorCode, DeliverySettingsPayload } from '@harness-monorepo/contracts';

// App
import { DELIVERY_AMOUNT_MAX_CENTS, DELIVERY_BANDS_MAX, DELIVERY_REACH_MAX_METERS, DELIVERY_WINDOW_MAX_MINUTES } from '../delivery.constants.js';

/** The code a failed constraint answers, read by `ApiValidationPipe`. */
const answering = { context: { errorCode: 'DELIVERY_SETTINGS_INVALID' satisfies DeliveryErrorCode } };

export class DeliveryBandDto implements DeliveryBand {
  @ApiProperty({ minimum: 1, maximum: DELIVERY_REACH_MAX_METERS, example: 3000, description: 'Metres, in a straight line from the shop.' })
  @IsInt(answering)
  @Min(1, answering)
  @Max(DELIVERY_REACH_MAX_METERS, answering)
  upToMeters!: number;

  @ApiProperty({ minimum: 0, maximum: DELIVERY_AMOUNT_MAX_CENTS, example: 500, description: 'Cents; 0 is free within this band.' })
  @IsInt(answering)
  @Min(0, answering)
  @Max(DELIVERY_AMOUNT_MAX_CENTS, answering)
  feeCents!: number;

  @ApiProperty({ minimum: 0, maximum: DELIVERY_WINDOW_MAX_MINUTES, example: 30 })
  @IsInt(answering)
  @Min(0, answering)
  @Max(DELIVERY_WINDOW_MAX_MINUTES, answering)
  windowFromMinutes!: number;

  @ApiProperty({ minimum: 0, maximum: DELIVERY_WINDOW_MAX_MINUTES, example: 50 })
  @IsInt(answering)
  @Min(0, answering)
  @Max(DELIVERY_WINDOW_MAX_MINUTES, answering)
  windowToMinutes!: number;
}

/** The whole of the rules: a form saves them together, and a key left out is refused rather than reset. */
export class DeliverySettingsDto implements DeliverySettingsPayload {
  @ApiProperty()
  @IsBoolean(answering)
  pickupEnabled!: boolean;

  @ApiProperty()
  @IsBoolean(answering)
  ownDeliveryEnabled!: boolean;

  @ApiProperty({ type: [DeliveryBandDto], maxItems: DELIVERY_BANDS_MAX, description: 'Ordered, each reaching further than the one before.' })
  @IsArray(answering)
  @ArrayMaxSize(DELIVERY_BANDS_MAX, answering)
  @IsObject({ each: true, ...answering })
  @ValidateNested({ each: true })
  @Type(() => DeliveryBandDto)
  bands!: DeliveryBandDto[];

  @ApiProperty({ nullable: true, type: Number, minimum: 1, maximum: DELIVERY_AMOUNT_MAX_CENTS, description: 'Cents; null is never free.' })
  // Null is a choice — never free — and so is sent; only a missing key is refused.
  @ValidateIf((_, value) => value !== null)
  @IsInt(answering)
  @Min(1, answering)
  @Max(DELIVERY_AMOUNT_MAX_CENTS, answering)
  freeAboveCents!: number | null;

  @ApiProperty()
  @IsBoolean(answering)
  carriersEnabled!: boolean;
}

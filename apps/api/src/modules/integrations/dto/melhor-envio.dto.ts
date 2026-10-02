// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { Type } from 'class-transformer';
import { ArrayMaxSize, ArrayUnique, IsArray, IsDefined, IsInt, IsObject, IsString, Length, Max, Min, ValidateIf, ValidateNested } from 'class-validator';

// Types
import type { IntegrationErrorCode, MelhorEnvioCallbackPayload, MelhorEnvioSettingsPayload, ShippingPackage } from '@harness-monorepo/contracts';

// App
import { PARCEL_GRAMS_MAX, PARCEL_MM_MAX } from '../../catalog/catalog.constants.js';
import { HANDLING_DAYS_MAX, SERVICE_IDS_MAX } from '../integrations.constants.js';

export class MelhorEnvioCallbackDto implements MelhorEnvioCallbackPayload {
  @ApiProperty({ description: 'The code Melhor Envio sent the browser back with.' })
  @IsString()
  @Length(1, 4096)
  code!: string;

  @ApiProperty({ description: 'The state the authorization began with.' })
  @IsString()
  @Length(1, 200)
  state!: string;
}

const answering = { context: { errorCode: 'MELHOR_ENVIO_SETTINGS_INVALID' satisfies IntegrationErrorCode } };

/** A whole parcel, in the product's units and bounds. */
export class ShippingPackageDto implements ShippingPackage {
  @ApiProperty({ minimum: 1, maximum: PARCEL_GRAMS_MAX, description: 'Grams.' })
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

export class MelhorEnvioSettingsDto implements MelhorEnvioSettingsPayload {
  @ApiProperty({ minimum: 0, maximum: HANDLING_DAYS_MAX, description: 'Days the shop takes to post an order.' })
  @IsInt(answering)
  @Min(0, answering)
  @Max(HANDLING_DAYS_MAX, answering)
  handlingDays!: number;

  @ApiProperty({ type: [Number], description: "Melhor Envio's service ids offered at checkout; empty offers none." })
  @IsArray(answering)
  @ArrayMaxSize(SERVICE_IDS_MAX, answering)
  @ArrayUnique(answering)
  @IsInt({ each: true, ...answering })
  @Min(1, { each: true, ...answering })
  serviceIds!: number[];

  @ApiProperty({ type: ShippingPackageDto, nullable: true, description: 'Null: no default parcel.' })
  // Present and null, or a whole parcel: a key left out is a body that forgot it, not a choice.
  @IsDefined(answering)
  @ValidateIf((dto: MelhorEnvioSettingsDto) => dto.defaultPackage !== null)
  @IsObject(answering)
  @ValidateNested()
  @Type(() => ShippingPackageDto)
  defaultPackage!: ShippingPackageDto | null;
}

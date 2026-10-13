// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { Equals, IsEmail, IsIn, IsOptional, IsString, Matches, MaxLength } from 'class-validator';

// App
import { IsCpf, cpfDigitsOf } from '../../../shared/http/cpf.js';
import { normaliseWhatsapp } from '../../stores/dto/store-fields.dto.js';
import {
  COURIER_CITIES,
  COURIER_CITY_CODES,
  COURIER_EMAIL_MAX_LENGTH,
  COURIER_FULL_NAME,
  COURIER_NAME_MAX_LENGTH,
  COURIER_VEHICLES,
  COURIER_WHATSAPP,
} from '../couriers.constants.js';

// Types
import type {
  CourierApplicationErrorCode,
  CourierApplicationPayload,
  CourierCity,
  CourierVehicle,
} from '@harness-monorepo/contracts';

/**
 * Every constraint of a field declares that field's code, so the answer names the field whichever
 * of them failed — a field left out included. `ApiValidationPipe` answers the first one declared.
 */
const refusing = (errorCode: CourierApplicationErrorCode) => ({ context: { errorCode } });

/** A name is kept as typed, less the spaces around it and with a run of them between words read as one. */
const fullName = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : value,
);

const cpfDigits = Transform(({ value }: { value: unknown }) => cpfDigitsOf(value));

/** An address is compared without case or the spaces around it, so that is how it is kept. */
const lowerCased = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value,
);

const OPEN_CITIES = Object.entries(COURIER_CITIES)
  .map(([code, city]) => `${code} (${city.name}/${city.state})`)
  .join(', ');

/**
 * What a person sends to say they want to deliver.
 *
 * Each field is normalised first and checked after, so what reaches the service is what the table
 * keeps. There is no field for the version of the terms or for when they were taken: both are the
 * server's to say, and a body that names either is refused like any unknown field.
 */
export class CourierApplicationDto implements CourierApplicationPayload {
  @ApiProperty({
    example: 'Maria Souza Lima',
    maxLength: COURIER_NAME_MAX_LENGTH,
    description: 'A first name and a surname at least. Refused with COURIER_NAME_INVALID.',
  })
  @fullName
  @Matches(COURIER_FULL_NAME, refusing('COURIER_NAME_INVALID'))
  @MaxLength(COURIER_NAME_MAX_LENGTH, refusing('COURIER_NAME_INVALID'))
  name!: string;

  @ApiProperty({
    example: '529.982.247-25',
    description: 'A CPF, with points and dash or not; kept as its eleven digits. Refused with COURIER_DOCUMENT_INVALID.',
  })
  @cpfDigits
  @IsCpf(refusing('COURIER_DOCUMENT_INVALID'))
  document!: string;

  @ApiProperty({
    example: 'maria@exemplo.test',
    maxLength: COURIER_EMAIL_MAX_LENGTH,
    description: 'Kept trimmed and lower-cased. Refused with COURIER_EMAIL_INVALID.',
  })
  @lowerCased
  @IsEmail({}, refusing('COURIER_EMAIL_INVALID'))
  @MaxLength(COURIER_EMAIL_MAX_LENGTH, refusing('COURIER_EMAIL_INVALID'))
  email!: string;

  @ApiProperty({
    example: '(85) 98888-7777',
    description:
      'A Brazilian mobile with its area code, as typed; kept as digits with the country code (5585988887777). Refused with COURIER_WHATSAPP_INVALID.',
  })
  @normaliseWhatsapp
  @Matches(COURIER_WHATSAPP, refusing('COURIER_WHATSAPP_INVALID'))
  whatsapp!: string;

  @ApiProperty({
    enum: COURIER_CITY_CODES,
    description: `The cities taking couriers: ${OPEN_CITIES}. Any other is refused with COURIER_CITY_NOT_OPEN.`,
  })
  @IsIn(COURIER_CITY_CODES, refusing('COURIER_CITY_NOT_OPEN'))
  city!: CourierCity;

  @ApiProperty({ enum: COURIER_VEHICLES, description: 'Refused with COURIER_VEHICLE_INVALID.' })
  @IsIn(COURIER_VEHICLES, refusing('COURIER_VEHICLE_INVALID'))
  vehicle!: CourierVehicle;

  @ApiProperty({
    example: true,
    description:
      'That the terms of use and the privacy policy were accepted. Only the boolean true is taken; anything else is refused with COURIER_TERMS_REQUIRED. The version recorded is the one in force on the server.',
  })
  @Equals(true, refusing('COURIER_TERMS_REQUIRED'))
  acceptedTerms!: boolean;

  @ApiPropertyOptional({
    description: 'The trap. Drawn out of sight; a body that carries a value is answered and not saved.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

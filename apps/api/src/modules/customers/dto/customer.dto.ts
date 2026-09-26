// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Transform, Type } from 'class-transformer';
import { IsObject, IsOptional, IsString, Matches, MaxLength, MinLength, ValidateIf, ValidateNested } from 'class-validator';

// Types
import type { CustomerAddress, UpdateCustomerProfilePayload } from '@harness-monorepo/contracts';

// App
import { normaliseWhatsapp } from '../../stores/dto/store-fields.dto.js';

const trim = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
/** Blank is "not given": an empty field in a form is not a value to store. */
const blankIsNull = Transform(({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() === '' ? null : value));

export class CustomerAddressDto implements Partial<CustomerAddress> {
  @ApiPropertyOptional({ example: '01310-930', nullable: true, type: String })
  @IsOptional() @blankIsNull @trim @ValidateIf((_, value) => value !== null) @Matches(/^\d{5}-?\d{3}$/)
  zipCode?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional() @blankIsNull @trim @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(160)
  street?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional() @blankIsNull @trim @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(20)
  number?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional() @blankIsNull @trim @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80)
  complement?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional() @blankIsNull @trim @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80)
  neighborhood?: string | null;

  @ApiPropertyOptional({ nullable: true, type: String })
  @IsOptional() @blankIsNull @trim @ValidateIf((_, value) => value !== null) @IsString() @MaxLength(80)
  city?: string | null;

  @ApiPropertyOptional({ example: 'SP', nullable: true, type: String })
  @IsOptional()
  @blankIsNull
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @ValidateIf((_, value) => value !== null)
  @Matches(/^[A-Z]{2}$/)
  state?: string | null;
}

export class UpdateCustomerProfileDto implements UpdateCustomerProfilePayload {
  @ApiPropertyOptional({ example: 'Ana Souza', minLength: 2, maxLength: 120 })
  @IsOptional() @trim @IsString() @MinLength(2) @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    example: '(11) 99999-8888',
    nullable: true,
    type: String,
    description: 'Any way a person writes it; kept as a WhatsApp link wants it, the key an order finds the customer by.',
  })
  @IsOptional()
  @blankIsNull
  @normaliseWhatsapp
  @ValidateIf((_, value) => value !== null)
  @Matches(/^\d{12,15}$/)
  phone?: string | null;

  @ApiPropertyOptional({ type: CustomerAddressDto })
  @IsOptional() @IsObject() @ValidateNested() @Type(() => CustomerAddressDto)
  address?: CustomerAddressDto;
}

export class CustomerAddressResponse implements CustomerAddress {
  @ApiProperty({ nullable: true, type: String }) zipCode!: string | null;
  @ApiProperty({ nullable: true, type: String }) street!: string | null;
  @ApiProperty({ nullable: true, type: String }) number!: string | null;
  @ApiProperty({ nullable: true, type: String }) complement!: string | null;
  @ApiProperty({ nullable: true, type: String }) neighborhood!: string | null;
  @ApiProperty({ nullable: true, type: String }) city!: string | null;
  @ApiProperty({ nullable: true, type: String }) state!: string | null;
}

export class CustomerProfileResponse {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ nullable: true, type: String, description: 'Digits only, with the country code.' }) phone!: string | null;
  @ApiProperty({ type: CustomerAddressResponse }) address!: CustomerAddressResponse;
}

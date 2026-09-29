// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString, Matches, MaxLength, ValidateIf } from 'class-validator';

// Types
import type { CustomerSavedAddress, SaveCustomerAddressPayload } from '@harness-monorepo/contracts';

const trim = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));
/** Blank is "not given": an empty field in a form is not a value to store. */
const blankIsNull = Transform(({ value }: { value: unknown }) => (typeof value === 'string' && value.trim() === '' ? null : value));
const optional = ValidateIf((_, value) => value !== null && value !== undefined);

/**
 * A saved address as the shopper writes it, whole. The ZIP code, the street, the city and the state
 * are required: it is where the shop delivers. The limits are the panel's own (`CustomerAddressDto`).
 */
export class SaveCustomerAddressDto implements SaveCustomerAddressPayload {
  @ApiPropertyOptional({ example: 'Casa', nullable: true, type: String, maxLength: 40 })
  @blankIsNull @trim @optional @IsString() @MaxLength(40)
  label?: string | null;

  @ApiPropertyOptional({ example: 'Rafael Souza', nullable: true, type: String, maxLength: 120, description: 'Null is the shopper, by their name when the order is placed.' })
  @blankIsNull @trim @optional @IsString() @MaxLength(120)
  recipientName?: string | null;

  @ApiProperty({ example: '60160-230' })
  @trim @Matches(/^\d{5}-?\d{3}$/)
  zipCode!: string;

  @ApiProperty({ example: 'Rua Tibúrcio Cavalcante', maxLength: 160 })
  @trim @IsString() @IsNotEmpty() @MaxLength(160)
  street!: string;

  @ApiPropertyOptional({ example: '1200', nullable: true, type: String, maxLength: 20 })
  @blankIsNull @trim @optional @IsString() @MaxLength(20)
  number?: string | null;

  @ApiPropertyOptional({ example: 'apto 302', nullable: true, type: String, maxLength: 80 })
  @blankIsNull @trim @optional @IsString() @MaxLength(80)
  complement?: string | null;

  @ApiPropertyOptional({ example: 'Meireles', nullable: true, type: String, maxLength: 80 })
  @blankIsNull @trim @optional @IsString() @MaxLength(80)
  neighborhood?: string | null;

  @ApiProperty({ example: 'Fortaleza', maxLength: 80 })
  @trim @IsString() @IsNotEmpty() @MaxLength(80)
  city!: string;

  @ApiProperty({ example: 'CE', description: 'Two letters; kept upper case.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @Matches(/^[A-Z]{2}$/)
  state!: string;

  @ApiPropertyOptional({ description: 'True makes it the default; false or absent leaves the default where it is. The first address is the default either way.' })
  @IsOptional() @IsBoolean()
  isDefault?: boolean;
}

export class CustomerSavedAddressResponse implements CustomerSavedAddress {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ nullable: true, type: String }) label!: string | null;
  @ApiProperty({ nullable: true, type: String, description: 'Null is the shopper, by their name when the order is placed.' }) recipientName!: string | null;
  @ApiProperty({ nullable: true, type: String }) zipCode!: string | null;
  @ApiProperty({ nullable: true, type: String }) street!: string | null;
  @ApiProperty({ nullable: true, type: String }) number!: string | null;
  @ApiProperty({ nullable: true, type: String }) complement!: string | null;
  @ApiProperty({ nullable: true, type: String }) neighborhood!: string | null;
  @ApiProperty({ nullable: true, type: String }) city!: string | null;
  @ApiProperty({ nullable: true, type: String }) state!: string | null;
  @ApiProperty() isDefault!: boolean;
}

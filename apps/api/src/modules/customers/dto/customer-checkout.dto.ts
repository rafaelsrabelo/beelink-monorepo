// Nest
import { ApiProperty, ApiPropertyOptional, OmitType } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Types
import type { CustomerCheckoutPayload, PurchaseAddressPayload } from '@harness-monorepo/contracts';

// App
import { EmailDto } from '../../auth/dto/auth.dto.js';
import { normaliseWhatsapp } from '../../stores/dto/store-fields.dto.js';
import { SaveCustomerAddressDto } from './customer-address.dto.js';

const trim = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Who is buying, at a visitor's checkout: the e-mail as `EmailDto` takes it, the name as a sign-up does, and the WhatsApp as the profile keeps it. */
export class CustomerCheckoutDto extends EmailDto implements CustomerCheckoutPayload {
  @ApiProperty({ example: 'Ana Souza', minLength: 2, maxLength: 120 })
  @trim
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '(11) 99999-8888', description: 'Any way a person writes it; kept as a WhatsApp link wants it, the key an order finds the customer by.' })
  @normaliseWhatsapp
  @Matches(/^\d{12,15}$/)
  phone!: string;
}

/** Where a visitor's order goes: a saved address's parts and rules, without a name for it, someone else receiving or a default. */
export class PurchaseAddressDto extends OmitType(SaveCustomerAddressDto, ['label', 'recipientName', 'isDefault'] as const) implements PurchaseAddressPayload {}

export class PurchaseSessionResponse {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ description: 'ISO-8601; seven days, not renewed' }) accessTokenExpiresAt!: string;
}

/** The checkout's answer, the same for every e-mail and phone. */
export class CustomerCheckoutAnswerResponse {
  @ApiProperty({ type: PurchaseSessionResponse })
  purchase!: PurchaseSessionResponse;
}

export class PurchaseAddressResponse {
  @ApiPropertyOptional({ nullable: true, type: String }) zipCode!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) street!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) number!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) complement!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) neighborhood!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) city!: string | null;
  @ApiPropertyOptional({ nullable: true, type: String }) state!: string | null;
}

/** What a purchase session reads: the visitor's own words. */
export class CustomerPurchaseResponse {
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty() phone!: string;
  @ApiPropertyOptional({ type: PurchaseAddressResponse, nullable: true }) address!: PurchaseAddressResponse | null;
  @ApiProperty() expiresAt!: string;
}

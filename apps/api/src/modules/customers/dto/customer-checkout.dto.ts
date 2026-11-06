// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Types
import type { CustomerCheckoutCodePayload, CustomerCheckoutPayload, CustomerCheckoutPhonePayload } from '@harness-monorepo/contracts';

// App
import { EmailDto } from '../../auth/dto/auth.dto.js';
import { AuthSessionResponse } from '../../auth/dto/auth.response.js';
import { normaliseWhatsapp } from '../../stores/dto/store-fields.dto.js';

const trim = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

/** Who is buying, at the checkout: the e-mail as `EmailDto` takes it, the name as a sign-up does, and the WhatsApp as the profile keeps it. */
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

/** The code e-mailed to the account the checkout found, with the e-mail it went to. */
export class CustomerCheckoutCodeDto extends EmailDto implements CustomerCheckoutCodePayload {
  @ApiProperty({ example: '123 456', description: 'The six digits, spaces allowed. Refused with CUSTOMER_CODE_INVALID.' })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.replace(/\s/g, '') : value))
  @Matches(/^\d{6}$/)
  code!: string;
}

/** The checkout's answer, for Swagger: `session` with `SESSION`, nothing with `CODE_SENT`. */
export class CustomerCheckoutAnswerResponse {
  @ApiProperty({ enum: ['SESSION', 'CODE_SENT'] })
  kind!: 'SESSION' | 'CODE_SENT';

  @ApiPropertyOptional({ type: AuthSessionResponse })
  session?: AuthSessionResponse;
}

/** The checkout's first question: the WhatsApp, as the profile keeps it. */
export class CustomerCheckoutPhoneDto implements CustomerCheckoutPhonePayload {
  @ApiProperty({ example: '(11) 99999-8888', description: 'Any way a person writes it; compared as a WhatsApp link wants it.' })
  @normaliseWhatsapp
  @Matches(/^\d{12,15}$/)
  phone!: string;
}

/** The number's answer, for Swagger: `purchase` with `RECOGNIZED`, nothing with `NEW`. */
export class PurchaseSessionResponse {
  @ApiProperty() accessToken!: string;
  @ApiProperty({ description: 'ISO-8601; two hours, not renewed' }) accessTokenExpiresAt!: string;
}

export class CustomerCheckoutPhoneAnswerResponse {
  @ApiProperty({ enum: ['RECOGNIZED', 'NEW'] })
  kind!: 'RECOGNIZED' | 'NEW';

  @ApiPropertyOptional({ type: PurchaseSessionResponse })
  purchase?: PurchaseSessionResponse;
}

export class CustomerPurchaseAddressResponse {
  @ApiProperty() id!: string;
  @ApiProperty({ example: 'Rua Tib•••, 12•• — Fortaleza/CE' }) line!: string;
  @ApiProperty() isDefault!: boolean;
}

export class CustomerPurchaseResponse {
  @ApiProperty({ type: [CustomerPurchaseAddressResponse] }) addresses!: CustomerPurchaseAddressResponse[];
  @ApiProperty() expiresAt!: string;
}

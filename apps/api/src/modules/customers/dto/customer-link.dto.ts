// Nest
import { ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { IsOptional, IsString, MaxLength } from 'class-validator';

// Types
import type { CustomerEmailPayload, CustomerRegisterPayload } from '@harness-monorepo/contracts';

// App
import { EmailDto, RegisterDto } from '../../auth/dto/auth.dto.js';

const RETURN_TO = {
  example: '/lessari/carrinho',
  description: "Where the e-mailed link brings the shopper back: a path inside this shop, else the shop's front.",
  maxLength: 300,
} as const;

/** Signing up at a shop, and where the confirmation link brings the shopper back. */
export class CustomerRegisterDto extends RegisterDto implements CustomerRegisterPayload {
  @ApiPropertyOptional(RETURN_TO)
  @IsOptional() @IsString() @MaxLength(RETURN_TO.maxLength)
  returnTo?: string;
}

/** Asking a shop for a new link, and where it brings the shopper back. */
export class CustomerEmailDto extends EmailDto implements CustomerEmailPayload {
  @ApiPropertyOptional(RETURN_TO)
  @IsOptional() @IsString() @MaxLength(RETURN_TO.maxLength)
  returnTo?: string;
}

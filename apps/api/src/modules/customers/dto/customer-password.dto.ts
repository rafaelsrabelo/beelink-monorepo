// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// Types
import type { ChangeCustomerPasswordPayload, CustomerPasswordLinkPayload } from '@harness-monorepo/contracts';

// App
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../../auth/auth.constants.js';

export class ChangeCustomerPasswordDto implements ChangeCustomerPasswordPayload {
  @ApiProperty({ maxLength: PASSWORD_MAX_LENGTH })
  @IsString() @MinLength(1) @MaxLength(PASSWORD_MAX_LENGTH)
  currentPassword!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString() @MinLength(PASSWORD_MIN_LENGTH) @MaxLength(PASSWORD_MAX_LENGTH)
  newPassword!: string;
}

export class CustomerPasswordLinkDto implements CustomerPasswordLinkPayload {
  @ApiPropertyOptional({ example: '/lessari/conta/perfil', description: "Where the link brings the shopper back: a path inside this shop, else the shop's front.", maxLength: 2048 })
  @IsOptional() @IsString() @MaxLength(2048)
  returnTo?: string;
}

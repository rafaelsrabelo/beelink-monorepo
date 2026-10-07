// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Types
import type { BackofficeRefreshPayload, BackofficeSignInPayload, BackofficeVerifyPayload } from '@harness-monorepo/contracts';

// App
import { PASSWORD_MAX_LENGTH } from '../../../auth/auth.constants.js';
import { BACKOFFICE_CODE_DIGITS } from '../../backoffice.constants.js';

/** Compared without case or surrounding spaces, as every account's e-mail is stored. */
export const normaliseEmail = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim().toLowerCase() : value));
const trim = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

export class BackofficeSignInDto implements BackofficeSignInPayload {
  @ApiProperty({ example: 'ana@bee-link.com' })
  @IsEmail()
  @normaliseEmail
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}

export class BackofficeVerifyDto implements BackofficeVerifyPayload {
  @ApiProperty({ description: 'The token step one answered.' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  challengeToken!: string;

  @ApiProperty({ example: '042817', description: 'The code from the e-mail.' })
  @IsString()
  @trim
  @Matches(new RegExp(`^[0-9]{${BACKOFFICE_CODE_DIGITS}}$`), { message: `code must be ${BACKOFFICE_CODE_DIGITS} digits` })
  code!: string;
}

export class BackofficeRefreshDto implements BackofficeRefreshPayload {
  @ApiProperty({ description: 'The refresh token handed out by step two or by the previous refresh.' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  refreshToken!: string;
}

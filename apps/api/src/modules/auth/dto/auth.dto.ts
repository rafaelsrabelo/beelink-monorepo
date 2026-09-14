// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

// Types
import type {
  EmailPayload,
  LoginPayload,
  LogoutPayload,
  RefreshPayload,
  RegisterPayload,
  ResetPasswordPayload,
  VerifyEmailPayload,
} from '@harness-monorepo/contracts';

// App
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from '../auth.constants.js';

/** An e-mail is compared without case or surrounding spaces, so it is normalised on the way in. */
const normaliseEmail = Transform(({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toLowerCase() : value,
);
const trim = Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value));

export class RegisterDto implements RegisterPayload {
  @ApiProperty({ example: 'Ana Souza', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  @trim
  name!: string;

  @ApiProperty({ example: 'ana@exemplo.com' })
  @IsEmail()
  @normaliseEmail
  email!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}

export class LoginDto implements LoginPayload {
  @ApiProperty({ example: 'ana@exemplo.com' })
  @IsEmail()
  @normaliseEmail
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  password!: string;
}

export class RefreshDto implements RefreshPayload {
  @ApiProperty({ description: 'The refresh token handed out by login or by the previous refresh.' })
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

export class LogoutDto implements LogoutPayload {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  refreshToken!: string;
}

export class VerifyEmailDto implements VerifyEmailPayload {
  @ApiProperty({ description: 'The token from the link in the verification e-mail.' })
  @IsString()
  @MinLength(1)
  token!: string;
}

/** Body of forgot-password and resend-verification — both answer 202 for any address. */
export class EmailDto implements EmailPayload {
  @ApiProperty({ example: 'ana@exemplo.com' })
  @IsEmail()
  @normaliseEmail
  email!: string;
}

export class ResetPasswordDto implements ResetPasswordPayload {
  @ApiProperty({ description: 'The token from the link in the reset e-mail.' })
  @IsString()
  @MinLength(1)
  token!: string;

  @ApiProperty({ minLength: PASSWORD_MIN_LENGTH, maxLength: PASSWORD_MAX_LENGTH })
  @IsString()
  @MinLength(PASSWORD_MIN_LENGTH)
  @MaxLength(PASSWORD_MAX_LENGTH)
  password!: string;
}

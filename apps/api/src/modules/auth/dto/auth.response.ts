// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { AuthSession } from '@harness-monorepo/contracts';

// App
import { UserResponse } from '../../users/dto/user.response.js';

export class AuthSessionResponse implements AuthSession {
  @ApiProperty({ description: 'Bearer token for the API. Short-lived.' })
  accessToken!: string;

  @ApiProperty({ format: 'date-time' })
  accessTokenExpiresAt!: string;

  @ApiProperty({ description: 'Single use: refreshing returns a new one and spends this one.' })
  refreshToken!: string;

  @ApiProperty({ format: 'date-time' })
  refreshTokenExpiresAt!: string;

  @ApiProperty({ type: UserResponse })
  user!: UserResponse;
}

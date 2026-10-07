// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { BackofficeAdminIdentity, BackofficeMe, BackofficeSession, BackofficeSignInChallenge } from '@harness-monorepo/contracts';

/** Documents the shapes for Swagger; the wire types live in packages/contracts. */
export class BackofficeSignInChallengeResponse implements BackofficeSignInChallenge {
  @ApiProperty({ description: 'Presented with the e-mailed code at step two. Opaque, single use.' })
  challengeToken!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;
}

export class BackofficeAdminIdentityResponse implements BackofficeAdminIdentity {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ana Souza' })
  name!: string;

  @ApiProperty({ example: 'ana@bee-link.com' })
  email!: string;
}

export class BackofficeSessionResponse implements BackofficeSession {
  @ApiProperty({ description: 'Bearer token for the backoffice routes, and for nothing else. Ten minutes.' })
  accessToken!: string;

  @ApiProperty({ format: 'date-time' })
  accessTokenExpiresAt!: string;

  @ApiProperty({ description: 'Single use: refreshing returns a new one and spends this one.' })
  refreshToken!: string;

  @ApiProperty({ format: 'date-time', description: 'Left idle past this, the session is over.' })
  refreshTokenExpiresAt!: string;

  @ApiProperty({ format: 'date-time', description: 'The session ends here whatever its use.' })
  sessionExpiresAt!: string;

  @ApiProperty({ type: BackofficeAdminIdentityResponse })
  admin!: BackofficeAdminIdentityResponse;
}

export class BackofficeMeSessionResponse implements Readonly<BackofficeMe['session']> {
  @ApiProperty({ format: 'date-time' })
  startedAt!: string;

  @ApiProperty({ format: 'date-time' })
  expiresAt!: string;

  @ApiProperty({ format: 'date-time' })
  idleExpiresAt!: string;
}

export class BackofficeMeResponse implements BackofficeMe {
  @ApiProperty({ type: BackofficeAdminIdentityResponse })
  admin!: BackofficeAdminIdentityResponse;

  @ApiProperty({ type: BackofficeMeSessionResponse })
  session!: BackofficeMeSessionResponse;
}

// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

// Types
import type {
  CustomerSignInOptions,
  GoogleAuthorization,
  GoogleAuthorizePayload,
  GoogleCallbackPayload,
  GoogleHandoff,
  GoogleHandoffPayload,
  GoogleHandoffSession,
  GoogleSignIn,
} from '@harness-monorepo/contracts';

// App
import { AuthSessionResponse } from '../../auth/dto/auth.response.js';

/** 32 random bytes, or a SHA-256, in base64url: what a handoff's code, secret and challenge all look like. */
const HANDOFF_VALUE = /^[A-Za-z0-9_-]{43}$/;

export class GoogleAuthorizeDto implements GoogleAuthorizePayload {
  @ApiPropertyOptional({ example: '/lessari/carrinho', description: 'Kept only when it is inside this shop.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  returnTo?: string;

  @ApiPropertyOptional({ description: "From a flow begun at the shop's own domain: the SHA-256, in base64url, of the secret that browser keeps." })
  @IsOptional()
  @Matches(HANDOFF_VALUE)
  handoffChallenge?: string;
}

export class GoogleCallbackDto implements GoogleCallbackPayload {
  @ApiProperty({ description: 'The code Google sent back.' })
  @IsString()
  @MinLength(1)
  @MaxLength(2048)
  code!: string;

  @ApiProperty({ description: 'The state this flow began with.' })
  @IsString()
  @MinLength(16)
  @MaxLength(200)
  state!: string;
}

export class GoogleHandoffDto implements GoogleHandoffPayload {
  @ApiProperty({ description: "The code the platform's host sent the browser to the shop's domain with." })
  @Matches(HANDOFF_VALUE)
  code!: string;

  @ApiProperty({ description: "The secret that browser kept at the shop's domain since the flow began." })
  @Matches(HANDOFF_VALUE)
  verifier!: string;
}

export class CustomerSignInOptionsResponse implements CustomerSignInOptions {
  @ApiProperty({ description: 'Whether "Continuar com Google" can be offered.' }) google!: boolean;
  @ApiProperty({ example: 'https://beelink.biz', description: "The platform's own origin, where every Google sign-in starts and ends." }) platformOrigin!: string;
}

export class GoogleAuthorizationResponse implements GoogleAuthorization {
  @ApiProperty({ description: "Google's consent page, for this flow." }) url!: string;
  @ApiProperty({ description: 'To hold in the browser and compare on the way back.' }) state!: string;
}

export class GoogleHandoffResponse implements GoogleHandoff {
  @ApiProperty({ example: 'lessari.com.br', description: "The shop's active domain." }) host!: string;
  @ApiProperty({ description: 'Good once, for a minute.' }) code!: string;
}

export class GoogleSignInResponse implements GoogleSignIn {
  @ApiProperty({ type: AuthSessionResponse, nullable: true, description: 'Null when the sign-in ends as a handoff.' }) session!: AuthSessionResponse | null;
  @ApiProperty({ type: GoogleHandoffResponse, nullable: true, description: "Set for a flow begun at the shop's own, active domain." }) handoff!: GoogleHandoffResponse | null;
  @ApiProperty({ example: 'lessari' }) storeSlug!: string;
  @ApiProperty({ nullable: true, type: String, example: '/lessari/carrinho' }) returnTo!: string | null;
}

export class GoogleHandoffSessionResponse implements GoogleHandoffSession {
  @ApiProperty({ type: AuthSessionResponse }) session!: AuthSessionResponse;
  @ApiProperty({ nullable: true, type: String, example: '/lessari/carrinho' }) returnTo!: string | null;
}

// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// Types
import type { CustomerSignInOptions, GoogleAuthorization, GoogleAuthorizePayload, GoogleCallbackPayload, GoogleSignIn } from '@harness-monorepo/contracts';

// App
import { AuthSessionResponse } from '../../auth/dto/auth.response.js';

export class GoogleAuthorizeDto implements GoogleAuthorizePayload {
  @ApiPropertyOptional({ example: '/lessari/carrinho', description: 'Kept only when it is inside this shop.' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  returnTo?: string;
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

export class CustomerSignInOptionsResponse implements CustomerSignInOptions {
  @ApiProperty({ description: 'Whether "Continuar com Google" can be offered.' }) google!: boolean;
}

export class GoogleAuthorizationResponse implements GoogleAuthorization {
  @ApiProperty({ description: "Google's consent page, for this flow." }) url!: string;
  @ApiProperty({ description: 'To hold in the browser and compare on the way back.' }) state!: string;
}

export class GoogleSignInResponse implements GoogleSignIn {
  @ApiProperty({ type: AuthSessionResponse }) session!: AuthSessionResponse;
  @ApiProperty({ example: 'lessari' }) storeSlug!: string;
  @ApiProperty({ nullable: true, type: String, example: '/lessari/carrinho' }) returnTo!: string | null;
}

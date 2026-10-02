// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { IsString, Length } from 'class-validator';

// Types
import type { MelhorEnvioCallbackPayload } from '@harness-monorepo/contracts';

export class MelhorEnvioCallbackDto implements MelhorEnvioCallbackPayload {
  @ApiProperty({ description: 'The code Melhor Envio sent the browser back with.' })
  @IsString()
  @Length(1, 4096)
  code!: string;

  @ApiProperty({ description: 'The state the authorization began with.' })
  @IsString()
  @Length(1, 200)
  state!: string;
}

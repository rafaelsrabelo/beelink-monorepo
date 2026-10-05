// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { Transform } from 'class-transformer';
import { IsString, Length, Matches } from 'class-validator';

// Types
import type { AsaasConnectPayload, IntegrationErrorCode } from '@harness-monorepo/contracts';

const answering = { context: { errorCode: 'INTEGRATION_KEY_INVALID' satisfies IntegrationErrorCode } };

export class AsaasConnectDto implements AsaasConnectPayload {
  @ApiProperty({ example: '$aact_hmlg_000…', description: "The shop's Asaas API key, `$` included — sealed, and never answered back." })
  // A key pasted from Asaas's panel often carries the line break or the space around it.
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString(answering)
  @Length(16, 512, answering)
  // Visible ASCII only: an invisible character copied along with the key cannot travel in a header,
  // and the request failing on it would read as Asaas not answering instead of a key to paste again.
  @Matches(/^[\x21-\x7e]+$/, answering)
  apiKey!: string;
}

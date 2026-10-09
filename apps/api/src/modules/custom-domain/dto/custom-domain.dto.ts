// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { IsString, MaxLength } from 'class-validator';

// Types
import type { CustomDomainErrorCode, SaveCustomDomainPayload } from '@harness-monorepo/contracts';

// App
import { CUSTOM_DOMAIN_INPUT_MAX_LENGTH } from '../custom-domain.constants.js';

const answering = { context: { errorCode: 'CUSTOM_DOMAIN_INVALID' satisfies CustomDomainErrorCode } };

export class SaveCustomDomainDto implements SaveCustomDomainPayload {
  @ApiProperty({
    example: 'https://www.minhaloja.com.br/',
    description: 'The domain as the shopkeeper pasted it. It is read down to the bare host (`minhaloja.com.br`) by `customDomainHostOf`, which is also what refuses it; the pipe only makes sure there is text to read.',
  })
  @IsString(answering)
  @MaxLength(CUSTOM_DOMAIN_INPUT_MAX_LENGTH, answering)
  domain!: string;
}

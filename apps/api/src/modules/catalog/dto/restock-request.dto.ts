// Nest
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Libs
import { IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

// Types
import type { CreateRestockRequestPayload } from '@harness-monorepo/contracts';

// App
import { blankToNull, normaliseWhatsapp } from '../../stores/dto/store-fields.dto.js';

export class CreateRestockRequestDto implements CreateRestockRequestPayload {
  @ApiProperty({ format: 'uuid', description: 'The sold-out combination.' })
  @IsUUID()
  variantId!: string;

  @ApiProperty({ example: '(11) 99999-8888', description: 'WhatsApp with area code. Stored as digits with 55.' })
  @IsString()
  @normaliseWhatsapp
  @Matches(/^\d{12,15}$/, { message: 'phone must be a WhatsApp number with its area code' })
  phone!: string;

  @ApiPropertyOptional({ nullable: true, maxLength: 80 })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @blankToNull
  name?: string | null;

  @ApiPropertyOptional({
    description: 'The trap. Drawn out of sight; a body that carries a value is answered and not saved.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  website?: string;
}

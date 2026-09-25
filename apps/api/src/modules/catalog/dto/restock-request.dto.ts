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
  @Matches(/^[1-9]\d{11,14}$/, { message: 'phone must be a WhatsApp number with its area code' })
  phone!: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: 80 })
  @IsOptional()
  @IsString()
  // Counted in code points, as the column counts them: MaxLength skips emoji variation selectors,
  // and a name it lets through would overflow VarChar(80) into a 500.
  @Matches(/^[\s\S]{0,80}$/u, { message: 'name must be shorter than or equal to 80 characters' })
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

// Nest
import { ApiProperty } from '@nestjs/swagger';

// Libs
import { IsEmail } from 'class-validator';

// Types
import type { GrantBackofficeAdminPayload } from '@harness-monorepo/contracts';

// App
import { normaliseEmail } from '../../auth/dto/backoffice-auth.dto.js';

export class GrantAdminDto implements GrantBackofficeAdminPayload {
  @ApiProperty({ example: 'ana@bee-link.com', description: 'An existing bee-link account, its e-mail verified.' })
  @IsEmail()
  @normaliseEmail
  email!: string;
}

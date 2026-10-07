// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { BackofficeAdmin } from '@harness-monorepo/contracts';

// App
import { BackofficeAdminIdentityResponse } from '../../auth/dto/backoffice-auth.response.js';

export class BackofficeAdminResponse implements BackofficeAdmin {
  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ example: 'Ana Souza' })
  name!: string;

  @ApiProperty({ example: 'ana@bee-link.com' })
  email!: string;

  @ApiProperty({ format: 'date-time' })
  grantedAt!: string;

  @ApiProperty({ type: BackofficeAdminIdentityResponse, nullable: true, description: 'Null when the role came from the server-side command.' })
  grantedBy!: BackofficeAdminIdentityResponse | null;
}

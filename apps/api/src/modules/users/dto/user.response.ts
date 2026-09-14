// Nest
import { ApiProperty } from '@nestjs/swagger';

// Types
import type { User } from '@harness-monorepo/contracts';

/** Documents the shape for Swagger; the wire type itself lives in packages/contracts. */
export class UserResponse implements User {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Ana Souza' })
  name!: string;

  @ApiProperty({ example: 'ana@exemplo.com' })
  email!: string;

  @ApiProperty({ description: 'False until the person follows the link in the verification e-mail.' })
  emailVerified!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

// Nest
import { Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

// Types
import type { AuthenticatedAdmin } from '../backoffice.request.js';

// App
import { BackofficeController, CurrentAdmin } from '../backoffice.decorators.js';
import { BackofficeSessionService } from './backoffice-session.service.js';
import { BackofficeMeResponse } from './dto/backoffice-auth.response.js';

@BackofficeController('me')
export class BackofficeMeController {
  constructor(private readonly sessions: BackofficeSessionService) {}

  @Get()
  @ApiOperation({ summary: 'The signed-in administrator, and when their session ends' })
  @ApiOkResponse({ type: BackofficeMeResponse })
  me(@CurrentAdmin() admin: AuthenticatedAdmin): Promise<BackofficeMeResponse> {
    return this.sessions.me(admin);
  }
}

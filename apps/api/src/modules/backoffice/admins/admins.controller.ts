// Nest
import { Body, ConflictException, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiConflictResponse, ApiCreatedResponse, ApiNoContentResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';

// Types
import type { AuditTrail } from '../audit/audit-trail.js';
import type { AuthenticatedAdmin } from '../backoffice.request.js';

// App
import { Audited, BackofficeController, CurrentAdmin, Trail } from '../backoffice.decorators.js';
import { GrantAdminDto } from './dto/admin.dto.js';
import { BackofficeAdminResponse } from './dto/admin.response.js';
import { PlatformAdminsService } from './platform-admins.service.js';

/** Who administers the platform: an administrator grants the role to another account, and takes it away. */
@BackofficeController('admins')
export class AdminsController {
  constructor(private readonly admins: PlatformAdminsService) {}

  @Get()
  @ApiOperation({ summary: 'The platform administrators there are now' })
  @ApiOkResponse({ type: [BackofficeAdminResponse] })
  list(): Promise<BackofficeAdminResponse[]> {
    return this.admins.list();
  }

  @Post()
  @Audited('ADMIN_GRANTED')
  @ApiOperation({ summary: 'Make an existing, verified bee-link account an administrator' })
  @ApiCreatedResponse({ type: BackofficeAdminResponse })
  @ApiNotFoundResponse({ description: 'BACKOFFICE_USER_NOT_FOUND' })
  @ApiConflictResponse({ description: 'BACKOFFICE_USER_NOT_VERIFIED · BACKOFFICE_ADMIN_ALREADY' })
  async grant(@Body() { email }: GrantAdminDto, @CurrentAdmin() current: AuthenticatedAdmin, @Trail() trail: AuditTrail): Promise<BackofficeAdminResponse> {
    const { admin, granted } = await this.admins.grant(email, current.id, trail);
    if (!granted) throw new ConflictException({ errorCode: 'BACKOFFICE_ADMIN_ALREADY', message: 'This account is an administrator already' });
    return admin;
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Audited('ADMIN_REVOKED')
  @ApiOperation({ summary: 'Take the role away, ending every backoffice session of the account — never from the last administrator' })
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'BACKOFFICE_ADMIN_NOT_FOUND' })
  @ApiConflictResponse({ description: 'BACKOFFICE_LAST_ADMIN' })
  revoke(@Param('userId', ParseUUIDPipe) userId: string, @CurrentAdmin() current: AuthenticatedAdmin, @Trail() trail: AuditTrail): Promise<void> {
    return this.admins.revoke(userId, current.id, trail);
  }
}

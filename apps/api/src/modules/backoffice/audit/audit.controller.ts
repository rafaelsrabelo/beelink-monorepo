// Nest
import { Get, Query } from '@nestjs/common';
import { ApiOkResponse, ApiOperation } from '@nestjs/swagger';

// App
import { BackofficeController } from '../backoffice.decorators.js';
import { AuditService } from './audit.service.js';
import { ListAuditDto } from './dto/audit.dto.js';
import { BackofficeAuditPageResponse } from './dto/audit.response.js';

/** The audit record, read. There is no other verb here, and there will be none. */
@BackofficeController('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiOperation({ summary: 'One page of everything the backoffice did, newest first — by actor, action and period' })
  @ApiOkResponse({ type: BackofficeAuditPageResponse })
  list(@Query() query: ListAuditDto): Promise<BackofficeAuditPageResponse> {
    return this.audit.list(query);
  }
}

// Nest
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOkResponse({ description: 'The process is up. It does not touch the database.' })
  check(): { status: 'ok' } {
    return { status: 'ok' };
  }
}

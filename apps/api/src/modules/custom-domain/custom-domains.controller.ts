// Nest
import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';

// Types
import type { CustomDomainEntry } from '@harness-monorepo/contracts';

// App
import { Public } from '../auth/auth.decorators.js';
import { CustomDomainService } from './custom-domain.service.js';
import { CustomDomainEntryResponse } from './dto/custom-domain.response.js';

/**
 * Which host is which shop's (BEELINK-281), for the web to resolve a request by its host. Beside
 * `stores` and not under it, like `store-categories`: `/stores/<anything>` is a shop's slug.
 *
 * Public and unlimited on purpose. The web asks with no session, over the internal network, once a
 * minute; and it says nothing a visitor could not read off the shops themselves — a domain and the
 * shop it opens are both public.
 */
@ApiTags('custom-domain')
@Controller('custom-domains')
export class CustomDomainsController {
  constructor(private readonly domains: CustomDomainService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: "Every saved domain with its shop's slug and where it stands, pending ones included — by host" })
  @ApiOkResponse({ type: CustomDomainEntryResponse, isArray: true })
  all(): Promise<CustomDomainEntry[]> {
    return this.domains.entries();
  }
}

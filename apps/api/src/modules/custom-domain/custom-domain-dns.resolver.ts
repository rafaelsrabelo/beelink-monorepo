// Node
import { Resolver } from 'node:dns/promises';

// Nest
import { Injectable } from '@nestjs/common';

// App
import { CUSTOM_DOMAIN_LOOKUP_TIMEOUT_MS } from './custom-domain.constants.js';
import { CustomDomainResolver } from './custom-domain.ports.js';

/** DNS answering that the name does not exist, or exists with no `A` record: an answer, not a failure. */
const NO_RECORD_CODES = new Set(['ENOTFOUND', 'ENODATA']);

export function saysNoRecord(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' && NO_RECORD_CODES.has(error.code);
}

/**
 * A name's `A` records, asked of DNS itself (`resolve4`) and not of the operating system's lookup:
 * a hosts file or a search domain must not make a name look as though the internet resolves it.
 */
@Injectable()
export class CustomDomainDnsResolver extends CustomDomainResolver {
  async addressesOf(name: string): Promise<string[]> {
    const resolver = new Resolver({ timeout: CUSTOM_DOMAIN_LOOKUP_TIMEOUT_MS, tries: 1 });

    try {
      return await resolver.resolve4(name);
    } catch (error) {
      if (saysNoRecord(error)) return [];
      throw error;
    }
  }
}

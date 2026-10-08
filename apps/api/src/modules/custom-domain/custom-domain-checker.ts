// Nest
import { Injectable, Logger } from '@nestjs/common';

// Types
import type { CustomDomainCheck, CustomDomainDnsProblem, CustomDomainHttpsProblem, CustomDomainWwwCheck } from '@harness-monorepo/contracts';
import type { CustomDomainProbeOutcome } from './custom-domain.ports.js';

// App
import { CustomDomainProbe, CustomDomainResolver } from './custom-domain.ports.js';

const HTTPS_PROBLEM_OF = {
  ANSWERED: null,
  UNREACHABLE: 'HTTPS_UNREACHABLE',
  CERTIFICATE_INVALID: 'HTTPS_CERTIFICATE_INVALID',
} as const satisfies Record<CustomDomainProbeOutcome, CustomDomainHttpsProblem | null>;

/** What a check asks to be written on the shop's row. */
export interface CustomDomainCheckWrite {
  customDomainCheckedAt: Date;
  customDomainProblem: string | null;
  customDomainStatus?: 'ACTIVE';
}

/**
 * What a check leaves on the shop's row. A check that found nothing wrong makes the domain active;
 * one that found a problem writes the problem and **no status**, so a pending domain stays pending
 * and an active one stays active — a shop is not taken down by a DNS server that was slow once.
 */
export function checkWriteOf(check: Pick<CustomDomainCheck, 'problem'>, now: Date): CustomDomainCheckWrite {
  return {
    customDomainCheckedAt: now,
    customDomainProblem: check.problem,
    ...(check.problem === null ? { customDomainStatus: 'ACTIVE' as const } : {}),
  };
}

/**
 * Whether a shop's domain already opens the shop (BEELINK-281), in two steps: its DNS, then
 * `https://<host>`. The second runs only once the first is right — which is also what keeps this
 * from being a way to make the API call an address of somebody's choosing: it only ever calls a
 * host whose every `A` record is the server itself, and at one of those very addresses.
 */
@Injectable()
export class CustomDomainChecker {
  private readonly logger = new Logger(CustomDomainChecker.name);

  constructor(
    private readonly resolver: CustomDomainResolver,
    private readonly probe: CustomDomainProbe,
  ) {}

  /** `probe: false` is a deployment whose API cannot reach its own public address: there the DNS being right is enough. */
  async check(host: string, target: { ips: readonly string[]; probe: boolean }): Promise<CustomDomainCheck> {
    // `www.` is asked of beside the domain and decides nothing: its problem is a warning.
    const [domain, www] = await Promise.all([this.recordsOf(host, target.ips), this.recordsOf(`www.${host}`, target.ips)]);
    const { addresses } = domain;

    if (domain.problem !== null || !target.probe) return { problem: domain.problem, addresses, www };

    return { problem: HTTPS_PROBLEM_OF[await this.answerOf(host, addresses[0]!)], addresses, www };
  }

  private async recordsOf(name: string, targetIps: readonly string[]): Promise<CustomDomainWwwCheck> {
    let found: string[];
    try {
      found = await this.resolver.addressesOf(name);
    } catch (error) {
      this.logger.warn({ err: error }, `DNS did not answer for ${name}`);
      return { problem: 'DNS_LOOKUP_FAILED', addresses: [] };
    }

    const addresses = [...new Set(found)].sort();
    return { problem: dnsProblemOf(addresses, targetIps), addresses };
  }

  private async answerOf(host: string, address: string): Promise<CustomDomainProbeOutcome> {
    try {
      return await this.probe.answerOf(host, address);
    } catch (error) {
      this.logger.warn({ err: error }, `Asking https://${host} failed`);
      return 'UNREACHABLE';
    }
  }
}

/** Exactly the server's addresses, no more and no fewer: one record left at a registrar's parking page sends some visitors there. */
function dnsProblemOf(addresses: readonly string[], targetIps: readonly string[]): CustomDomainDnsProblem | null {
  if (addresses.length === 0) return 'DNS_NOT_FOUND';

  const target = new Set(targetIps);
  return addresses.length === target.size && addresses.every((address) => target.has(address)) ? null : 'DNS_POINTS_ELSEWHERE';
}

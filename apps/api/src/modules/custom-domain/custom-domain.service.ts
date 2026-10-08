// Nest
import { BadRequestException, ConflictException, Injectable, ServiceUnavailableException } from '@nestjs/common';

// Types
import type { CustomDomain, CustomDomainCheck, CustomDomainEntry, CustomDomainErrorCode, CustomDomainOverview, CustomDomainProblem, SaveCustomDomainPayload } from '@harness-monorepo/contracts';
import type { CustomDomainRefusal } from './custom-domain-host.js';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { CustomDomainChecker, checkWriteOf } from './custom-domain-checker.js';
import { customDomainHostOf } from './custom-domain-host.js';
import { CUSTOM_DOMAIN_PROBLEMS, customDomainError } from './custom-domain.constants.js';
import { CustomDomainSettings } from './custom-domain.settings.js';

/** The four columns, and nothing else of the shop's row. */
const READ = { customDomain: true, customDomainStatus: true, customDomainCheckedAt: true, customDomainProblem: true } as const;

const NONE = { customDomain: null, customDomainStatus: null, customDomainCheckedAt: null, customDomainProblem: null } as const;

interface DomainRow {
  customDomain: string | null;
  customDomainStatus: CustomDomain['status'] | null;
  customDomainCheckedAt: Date | null;
  customDomainProblem: string | null;
}

/** What each refusal answers. The sentence a shopkeeper reads is the panel's, chosen by the code; these are for whoever reads the API. */
const REFUSALS = {
  INVALID: ['CUSTOM_DOMAIN_INVALID', 'That is not a domain name. Send the domain alone, as in minhaloja.com.br.'],
  IP_ADDRESS: ['CUSTOM_DOMAIN_IP_ADDRESS', 'That is an IP address. Send a domain name, as in minhaloja.com.br.'],
  LOCAL: ['CUSTOM_DOMAIN_LOCAL', 'That name only exists inside a network. Send a domain registered on the internet.'],
  NOT_ASCII: ['CUSTOM_DOMAIN_NOT_ASCII', 'An internationalised domain is sent in its ASCII form, the one that starts with "xn--"; the registrar shows it.'],
  PLATFORM: ['CUSTOM_DOMAIN_PLATFORM', "That is the platform's own address. Send a domain of the shop's own."],
} as const satisfies Record<CustomDomainRefusal, readonly [CustomDomainErrorCode, string]>;

/** Postgres' unique violation, as Prisma reports it — the backstop for the race a pre-check loses. */
function isUniqueViolation(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002';
}

function problemOf(stored: string | null): CustomDomainProblem | null {
  return CUSTOM_DOMAIN_PROBLEMS.find((problem) => problem === stored) ?? null;
}

function domainOf(row: DomainRow): CustomDomain | null {
  if (!row.customDomain || !row.customDomainStatus) return null;

  return {
    host: row.customDomain,
    status: row.customDomainStatus,
    checkedAt: row.customDomainCheckedAt?.toISOString() ?? null,
    problem: problemOf(row.customDomainProblem),
  } satisfies CustomDomain;
}

/**
 * A shop's own domain (BEELINK-281): the host its owner saves, kept on the shop's row, checked when
 * it is saved and when the owner asks again, and told to the web — in the shop's public data
 * (`toPublicStore`) and in the table of every host (`entries`).
 *
 * A check runs outside any transaction and its verdict is written only onto the host it was run
 * for: an owner who saved another domain meanwhile is not told that one is active.
 */
@Injectable()
export class CustomDomainService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly checker: CustomDomainChecker,
    private readonly settings: CustomDomainSettings,
  ) {}

  async overview(storeSlug: string, userId: string): Promise<CustomDomainOverview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    return this.overviewOf(await this.read(storeId), null);
  }

  /**
   * Save, or replace what was saved, and check it there and then. The same host saved again is a
   * check and nothing more: writing PENDING over an active domain would take the shop off it.
   */
  async save(storeSlug: string, userId: string, { domain }: SaveCustomDomainPayload): Promise<CustomDomainOverview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const targetIps = this.targetIpsOrRefuse();
    const host = this.hostOrRefuse(domain);

    if ((await this.read(storeId)).customDomain !== host) await this.claim(storeId, host);

    return this.checkAndKeep(storeId, host, targetIps);
  }

  async check(storeSlug: string, userId: string): Promise<CustomDomainOverview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    const targetIps = this.targetIpsOrRefuse();
    const { customDomain: host } = await this.read(storeId);

    if (!host) throw new ConflictException(customDomainError('CUSTOM_DOMAIN_NOT_SET', 'The shop has no domain saved to check'));

    return this.checkAndKeep(storeId, host, targetIps);
  }

  /** The four columns go back to null. Removing none is no error, and needs nothing of the deployment. */
  async remove(storeSlug: string, userId: string): Promise<void> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    await this.prisma.store.update({ where: { id: storeId }, data: NONE, select: { id: true } });
  }

  /** Which host is which shop's, every saved one: a single query over three columns, read by the web once a minute. */
  async entries(): Promise<CustomDomainEntry[]> {
    const rows = await this.prisma.store.findMany({
      where: { customDomain: { not: null } },
      select: { customDomain: true, slug: true, customDomainStatus: true },
      orderBy: { customDomain: 'asc' },
    });

    return rows.flatMap(({ customDomain: host, slug, customDomainStatus: status }) => (host && status ? [{ host, slug, status } satisfies CustomDomainEntry] : []));
  }

  private async claim(storeId: string, host: string): Promise<void> {
    const taken = () => new ConflictException(customDomainError('CUSTOM_DOMAIN_TAKEN', `"${host}" is already another shop's domain`));

    const holder = await this.prisma.store.findUnique({ where: { customDomain: host }, select: { id: true } });
    if (holder && holder.id !== storeId) throw taken();

    try {
      await this.prisma.store.update({ where: { id: storeId }, data: { ...NONE, customDomain: host, customDomainStatus: 'PENDING' }, select: { id: true } });
    } catch (error) {
      if (isUniqueViolation(error)) throw taken();
      throw error;
    }
  }

  private async checkAndKeep(storeId: string, host: string, targetIps: readonly string[]): Promise<CustomDomainOverview> {
    const check = await this.checker.check(host, { ips: targetIps, probe: this.settings.probe });

    // By the host as well as the shop: a domain saved while this one was being checked keeps its own standing.
    const { count } = await this.prisma.store.updateMany({ where: { id: storeId, customDomain: host }, data: checkWriteOf(check, new Date()) });

    return this.overviewOf(await this.read(storeId), count === 1 ? check : null);
  }

  private read(storeId: string): Promise<DomainRow> {
    return this.prisma.store.findUniqueOrThrow({ where: { id: storeId }, select: READ });
  }

  private overviewOf(row: DomainRow, check: CustomDomainCheck | null): CustomDomainOverview {
    return { targetIps: this.settings.targetIps ? [...this.settings.targetIps] : null, domain: domainOf(row), check } satisfies CustomDomainOverview;
  }

  private targetIpsOrRefuse(): readonly string[] {
    if (!this.settings.targetIps) {
      throw new ServiceUnavailableException(customDomainError('CUSTOM_DOMAIN_UNAVAILABLE', 'This deployment names no address to point a domain at'));
    }

    return this.settings.targetIps;
  }

  private hostOrRefuse(domain: string): string {
    const { host, refusal } = customDomainHostOf(domain, [this.settings.platformHost, ...this.settings.reservedHosts]);
    if (host !== undefined) return host;

    const [errorCode, message] = REFUSALS[refusal];
    throw new BadRequestException(customDomainError(errorCode, message));
  }
}

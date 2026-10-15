// Nest
import { BadGatewayException, ConflictException, HttpException, Injectable, Logger, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';

// Types
import type { BillingAccount, BillingAccountAnswer, BillingAccountPayload } from '@harness-monorepo/contracts';
import type { BillingAccountModel } from '../../generated/prisma/models.js';

// App
import { AsaasOutcomeUnknown, AsaasRefused, AsaasUnreachable } from '../../shared/asaas/asaas-errors.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { reasonWithout } from './asaas-reason.js';
import { accountRequired, unavailable } from './billing-refusals.js';
import { billingError, CUSTOMER_CLAIM_MS, CUSTOMER_UNKNOWN_HOLD_MS, customerReferenceOf } from './billing.constants.js';
import { toBillingAccount } from './billing.mapper.js';
import { PlatformAsaas, PlatformAsaasUnconfigured, type PlatformCustomer, type PlatformCustomerData } from './platform-asaas.client.js';

/** One save's talk with Asaas about an account's customer, taken and not yet settled. */
interface Talk {
  userId: string;
  customer: PlatformCustomerData;
  /** Asaas's id of the customer as the row held it when the talk was taken; null when it held none. */
  knownId: string | null;
  /** `asaasCustomerClaimedUntil` as this request wrote it: what it is recognized by when renewed, held and let go. */
  until: Date;
}

/** Whether Asaas already holds exactly what the row says. */
const holds = (standing: PlatformCustomer, customer: PlatformCustomerData): boolean =>
  standing.name === customer.name && standing.document === customer.document && standing.email === customer.email.trim().toLowerCase();

/**
 * Who bee-link charges for an account's pages (BEELINK-291): the name and the CPF or CNPJ, kept on
 * the billing account, and the shopkeeper as a customer of bee-link's own Asaas account — one per
 * account, made once and found again.
 *
 * `save` is the one talk with Asaas about that customer, and it is safe to repeat. The row is written
 * and committed first, with a claim that has a deadline; only then is Asaas asked, so no lock is ever
 * held while Asaas answers. It always looks for what Asaas already holds under the account's reference
 * before it creates: a customer left behind by a request that died, or by a creation nobody answered,
 * is found and taken, never made twice. A second save that changes nothing asks Asaas nothing.
 *
 * `customerOf` is the same talk for whoever is about to charge the account (BEELINK-292): with what
 * the row already keeps, and nothing asked of Asaas when it already holds that.
 */
@Injectable()
export class BillingAccounts {
  private readonly logger = new Logger(BillingAccounts.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly asaas: PlatformAsaas,
  ) {}

  /** An account's billing data, for its owner; none is an answer and not an error. */
  async read(userId: string): Promise<BillingAccountAnswer> {
    this.available();
    const row = await this.prisma.billingAccount.findUnique({ where: { userId } });

    return { account: row ? toBillingAccount(row) : null };
  }

  /**
   * The billing data kept, and the customer at Asaas made to match it. After a refusal or a silence
   * from Asaas the data stays kept, not yet matched: the same save again picks the talk up.
   */
  async save(userId: string, payload: BillingAccountPayload): Promise<BillingAccount> {
    this.available();
    return toBillingAccount(await this.matched(userId, payload, null));
  }

  /**
   * Asaas's id of the account's customer, made sure of before something is charged to it: the customer
   * stands at Asaas with what the row keeps. An account in good standing costs no request. Refused
   * with `BILLING_ACCOUNT_REQUIRED` for one that never gave its billing data.
   *
   * `doubted` is an id Asaas has just refused to charge. A row in good standing does not notice its
   * customer was removed at Asaas, so that id is not taken on the row's word: it is forgotten and the
   * account searched anew — which finds the same customer when it stands, and makes another when not.
   */
  async customerOf(userId: string, doubted: string | null = null): Promise<string> {
    this.available();
    const { asaasCustomerId } = await this.matched(userId, null, doubted);
    if (!asaasCustomerId) throw new Error("A billing account's talk with Asaas settled without a customer");
    return asaasCustomerId;
  }

  /** The row with Asaas holding what it says: as it stood when that was already so, else after the one talk that makes it so. */
  private async matched(userId: string, payload: BillingAccountPayload | null, doubted: string | null): Promise<BillingAccountModel> {
    const claimed = await this.claim(userId, payload, doubted);
    if ('standing' in claimed) return claimed.standing;

    try {
      return await this.converge(claimed);
    } catch (error) {
      // A creation nobody answered may have made the customer: nobody creates again until it had time to show.
      if (error instanceof AsaasOutcomeUnknown) await this.holdFor(claimed, CUSTOMER_UNKNOWN_HOLD_MS);
      else await this.letGo(claimed);
      throw this.said(error, claimed);
    }
  }

  /**
   * The first step, and all that happens under a lock: the row written and the talk taken, or the row
   * answered as it is when Asaas already holds what was sent. The lock is the account's own, since a
   * first save has no row to lock; it goes with the transaction, before Asaas is asked anything.
   * With no payload it is the row's own data that Asaas is to hold.
   */
  private claim(userId: string, payload: BillingAccountPayload | null, doubted: string | null): Promise<Talk | { standing: BillingAccountModel }> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`billing-account:${userId}`}, 0))`;

      const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true } });
      if (!user) throw new UnauthorizedException({ errorCode: 'AUTH_UNAUTHENTICATED', message: 'Account no longer exists' });

      const row = await tx.billingAccount.findUnique({ where: { userId } });
      const kept = payload ?? row;
      if (!kept) throw accountRequired();
      const { name, document } = kept;
      const now = new Date();
      // Before anything is written: a save that waits its turn leaves the row as the talk in course found it.
      if (row?.asaasCustomerClaimedUntil && row.asaasCustomerClaimedUntil > now) throw busy();

      const unchanged = row?.name === name && row.document === document;
      const refused = doubted !== null && row?.asaasCustomerId === doubted;
      if (row && unchanged && !refused && row.asaasCustomerId && row.asaasCustomerSyncedAt) return { standing: row };

      const until = new Date(now.getTime() + CUSTOMER_CLAIM_MS);
      const data = {
        name,
        document,
        asaasCustomerClaimedUntil: until,
        // Changed data is no longer what Asaas was told, whatever it was told before.
        ...(unchanged && !refused ? {} : { asaasCustomerSyncedAt: null }),
        ...(refused ? { asaasCustomerId: null } : {}),
      };
      await tx.billingAccount.upsert({ where: { userId }, create: { userId, ...data }, update: data });

      return { userId, customer: { name, document, email: user.email }, knownId: refused ? null : (row?.asaasCustomerId ?? null), until };
    });
  }

  /** With the talk in hand and no lock held: Asaas searched, a customer that stands there made to match and kept, and one created only when none stood. */
  private async converge(talk: Talk): Promise<BillingAccountModel> {
    const reference = customerReferenceOf(talk.userId);
    const found = await this.asaas.customers(reference).catch((error: unknown) => {
      // A search refused says nothing of the customer — an address Asaas blocks, not a document it will not take — and decided nothing.
      if (error instanceof AsaasRefused && error.status !== 401) throw new AsaasUnreachable(`Asaas refused the search for the customer (${error.status}${error.code ? `, ${error.code}` : ''})`);
      throw error;
    });
    if (found.length > 1) {
      this.logger.warn({ userId: talk.userId, customerIds: found.map((customer) => customer.id) }, "More than one customer stands under an account's reference at bee-link's own Asaas account");
    }

    // The one the row already names first: what was made for it at Asaas hangs from that id.
    const standing = found.find((customer) => customer.id === talk.knownId) ?? found[0] ?? null;
    if (standing) {
      if (!holds(standing, talk.customer)) await this.asaas.updateCustomer(standing.id, talk.customer);
      return this.settle(talk, standing.id);
    }

    // The claim first: one lost meanwhile must not create.
    await this.renew(talk);
    return this.settle(talk, await this.asaas.createCustomer({ ...talk.customer, externalReference: reference }));
  }

  /** The customer written as the account's, and the talk let go — only while it is still this request's: one that lost it leaves everything to whoever took it. */
  private async settle(talk: Talk, customerId: string): Promise<BillingAccountModel> {
    const { count } = await this.prisma.billingAccount.updateMany({
      where: { userId: talk.userId, asaasCustomerClaimedUntil: talk.until },
      data: { asaasCustomerId: customerId, asaasCustomerSyncedAt: new Date(), asaasCustomerClaimedUntil: null },
    });
    if (count === 0) throw busy();

    return this.prisma.billingAccount.findUniqueOrThrow({ where: { userId: talk.userId } });
  }

  /** The claim pushed ahead just before the one call that cannot be undone — and only while it is still this request's. */
  private async renew(talk: Talk): Promise<void> {
    const until = new Date(Date.now() + CUSTOMER_CLAIM_MS);
    const { count } = await this.prisma.billingAccount.updateMany({ where: { userId: talk.userId, asaasCustomerClaimedUntil: talk.until }, data: { asaasCustomerClaimedUntil: until } });
    if (count === 0) throw busy();
    talk.until = until;
  }

  private async holdFor(talk: Talk, ms: number): Promise<void> {
    await this.prisma.billingAccount.updateMany({ where: { userId: talk.userId, asaasCustomerClaimedUntil: talk.until }, data: { asaasCustomerClaimedUntil: new Date(Date.now() + ms) } });
  }

  private async letGo(talk: Talk): Promise<void> {
    await this.prisma.billingAccount.updateMany({ where: { userId: talk.userId, asaasCustomerClaimedUntil: talk.until }, data: { asaasCustomerClaimedUntil: null } });
  }

  /**
   * How a failed talk is told: a stable code, never Asaas's words. What Asaas said goes to the log
   * with the account's id — and with nothing of who the account is, whatever Asaas repeated.
   */
  private said(error: unknown, talk: Talk): unknown {
    const { userId } = talk;
    if (error instanceof HttpException) return error;
    if (error instanceof PlatformAsaasUnconfigured) return unavailable();
    if (error instanceof AsaasRefused && error.status === 401) {
      // Not this shopkeeper's problem, nor one they can solve: nobody is charged until the key is replaced.
      this.logger.error({ status: error.status, code: error.code, reason: error.reason }, "Asaas refused the key of bee-link's own account");
      return unavailable("Asaas refused the key of bee-link's own account");
    }
    if (error instanceof AsaasRefused) {
      this.logger.warn({ userId, status: error.status, code: error.code, reason: reasonWithout(error.reason, talk.customer) }, "Asaas refused a shopkeeper's customer");
      return new BadGatewayException(billingError('BILLING_CUSTOMER_REFUSED', 'Asaas refused the customer: the billing data was kept, and saving it again asks again'));
    }
    if (error instanceof AsaasUnreachable) {
      this.logger.warn({ userId, reason: error.message }, "Asaas did not answer about a shopkeeper's customer");
      return new ServiceUnavailableException(billingError('BILLING_UNREACHABLE', 'Asaas did not answer: the billing data was kept, and saving it again asks again'));
    }
    return error;
  }

  private available(): void {
    if (!this.asaas.configured) throw unavailable();
  }
}

function busy(): ConflictException {
  return new ConflictException(billingError('BILLING_ACCOUNT_BUSY', "The account's billing data is being told to Asaas: save it again in a moment"));
}

// Nest
import { BadGatewayException, ConflictException, HttpException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

// Types
import type { BillingCycle, SubscriptionChoice } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';

// App
import { AsaasOutcomeUnknown, AsaasRefused, AsaasUnreachable } from '../../shared/asaas/asaas-errors.js';
import { env } from '../../shared/config/env.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import { reasonWithout } from './asaas-reason.js';
import { BillingAccounts } from './billing-accounts.service.js';
import { brasiliaDayOf } from './billing-dates.js';
import { accountRequired, unavailable } from './billing-refusals.js';
import { ASAAS_CYCLES, billingError, CHECK_FIRST_MS, PLAN_ON_SALE, SUBSCRIPTION_CLAIM_MS, SUBSCRIPTION_UNKNOWN_HOLD_MS, subscriptionReferenceOf } from './billing.constants.js';
import { priceOf, SUBSCRIPTION_READ, toStoreSubscription, type StoreSubscriptionRow } from './billing.mapper.js';
import { PageLocks } from './page-locks.service.js';
import { PlatformAsaas, PlatformAsaasUnconfigured, type PlatformCharge, type PlatformCustomerData, type PlatformSubscription } from './platform-asaas.client.js';
import { awaitsPayment, firstChargeOf, invoiceDescriptionOf, serves, touchedByMoney } from './subscription-attempt.js';
import { reasonOf, SubscriptionSync } from './subscription-sync.service.js';

/** A talk with Asaas about a page's subscription, taken and not yet settled, whatever it is for. */
interface Claim {
  /** The row's own id: what the subscription is named by at Asaas. */
  id: string;
  storeId: string;
  /** Who is charged — carried only so Asaas's words are cleaned of them before a line is logged. */
  payer: PlatformCustomerData;
  /** Asaas's id of the subscription as the row held it when the talk was taken; null when it held none. */
  knownId: string | null;
  /** `asaasSubscriptionClaimedUntil` as this request wrote it: what it is recognized by when renewed, held and let go. */
  until: Date;
}

/** One choice's talk: the claim, and what it asks of Asaas. */
interface Talk extends Claim {
  userId: string;
  /** The plan's price for the cycle as the database held it when the talk was taken: what Asaas is asked to charge, and what the row is to say. */
  want: { planId: string; planName: string; cycle: BillingCycle; priceCents: number; storeName: string };
}

/** A subscription standing at Asaas under the page's reference, with its charges. */
interface Attempt {
  subscription: PlatformSubscription;
  charges: PlatformCharge[];
}

/** Asaas said no to the creation itself — and not to the key, which no shopkeeper can mend. */
class CreationRefused extends Error {
  constructor(readonly refusal: AsaasRefused) {
    super(refusal.message);
  }
}

/** Asaas says a charge of the subscription the page has moved money: nothing is made or removed beside it. */
class SubscriptionPaid extends ConflictException {
  constructor() {
    super(billingError('BILLING_SUBSCRIPTION_PAID', 'Asaas says the subscription the page has was paid: nothing was made or removed'));
  }
}

const dateOf = (day: string): Date => new Date(`${day}T00:00:00.000Z`);
/** When the routine first reads a subscription a choice made or kept: the shopkeeper is on its invoice. */
const firstCheckAt = (): Date => new Date(Date.now() + CHECK_FIRST_MS);

/**
 * A page's subscription at bee-link's own Asaas account (BEELINK-292): the shopkeeper chooses a cycle,
 * and the page comes to have one subscription there, made with no card, whose first charge is paid at
 * Asaas's invoice. The page's status is not moved here — it moves when Asaas tells of the payment.
 *
 * `choose` is the one talk with Asaas about a page's subscription, and it is safe to repeat. A claim
 * with a deadline is written on the page's row and committed first; only then is Asaas asked, so no
 * lock is ever held while it answers. It always looks for what stands at Asaas under the page's
 * reference before it creates: a subscription a dead request left behind, or one a creation nobody
 * answered did make, is found and taken, never made twice. And it never makes a second beside one
 * that stands: one still unpaid that is not what was chosen is removed first, and one Asaas says was
 * paid stops the talk — nothing removed, nothing made.
 *
 * What the row says of Asaas — the id, the plan, the cycle, the price, the first due day and the
 * invoice — tells of the subscription standing there and is written only once Asaas answered: a cycle
 * that was only asked for is never on the row.
 *
 * A payment it comes upon is not its to apply: once the talk is let go, the page is read through the
 * one door a fact from Asaas comes in by (`SubscriptionSync`, BEELINK-221), and the refusal said after.
 */
@Injectable()
export class StoreSubscriptions {
  private readonly logger = new Logger(StoreSubscriptions.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
    private readonly accounts: BillingAccounts,
    private readonly asaas: PlatformAsaas,
    private readonly payments: SubscriptionSync,
    private readonly locks: PageLocks,
  ) {}

  /**
   * The page's subscription in the cycle chosen, and the invoice its first charge is paid at: the one
   * it has when that still serves, else a new one — whatever stood unpaid removed from Asaas first.
   * Refused, each with its own code and before Asaas is asked, where nothing is to be bought.
   */
  async choose(storeSlug: string, userId: string, cycle: BillingCycle): Promise<SubscriptionChoice> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    // Where nothing is charged, nothing is bought: a subscription made here would charge a page the product says is free.
    if (!env.BILLING_ENFORCED) throw new ConflictException(billingError('BILLING_NOT_ENFORCED', 'This deployment charges no page for its plan'));
    if (!this.asaas.configured) throw unavailable();

    const talk = await this.claim(storeId, userId, cycle);
    try {
      const { row, invoiceUrl } = await this.converge(talk);
      return { invoiceUrl, subscription: toStoreSubscription(row, new Date(), this.locks.engaged) };
    } catch (error) {
      // A creation nobody answered may have made the subscription: nobody creates again until it had time to show.
      if (error instanceof AsaasOutcomeUnknown) await this.holdFor(talk, SUBSCRIPTION_UNKNOWN_HOLD_MS);
      else await this.letGo(talk);
      if (error instanceof SubscriptionPaid) await this.readPaid(storeId);
      throw this.said(error, talk);
    }
  }

  /**
   * Whatever stands unpaid at Asaas for the page, taken out — for a coupon's free month (BEELINK-224),
   * in which nothing may go on charging the page. The talk of a choice, with nothing made after it: the
   * claim committed first, Asaas asked with no lock held, what stands found by the page's reference and
   * by the row's own id, and each one removed and looked at again; a charge money touched stops it all,
   * nothing removed, and the page is read through the door. Once it is done the row names no
   * subscription, and the claim is let go. Its caller asks only for a page whose row names one.
   */
  async withdraw(storeId: string, userId: string): Promise<void> {
    const claim = await this.claimWithdrawal(storeId, userId);
    try {
      const attempts: Attempt[] = [];
      for (const subscription of await this.standing(claim)) attempts.push({ subscription, charges: await this.asaas.subscriptionCharges(subscription.id) });
      if (attempts.some(({ charges }) => touchedByMoney(charges))) throw paid();

      for (const attempt of attempts) await this.remove(claim, attempt.subscription.id);
      await this.mine(claim, { asaasSubscriptionId: null, planId: null, cycle: null, priceCents: null, firstDueDate: null, invoiceUrl: null, nextCheckAt: null, asaasSubscriptionClaimedUntil: null });
    } catch (error) {
      await this.letGo(claim);
      if (error instanceof SubscriptionPaid) await this.readPaid(storeId);
      throw this.said(error, claim);
    }
  }

  /** A withdrawal's claim, under the page's row lock as a choice's is: refused while another talk holds the page, and nothing else written. */
  private claimWithdrawal(storeId: string, userId: string): Promise<Claim> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "store_subscriptions" WHERE "storeId" = ${storeId}::uuid FOR UPDATE`;
      const row = await tx.storeSubscription.findUnique({ where: { storeId }, select: { id: true, asaasSubscriptionId: true, asaasSubscriptionClaimedUntil: true } });
      if (!row) throw new ConflictException(billingError('BILLING_SUBSCRIPTION_MISSING', 'A page from before subscriptions existed has nothing at Asaas'));

      const now = new Date();
      if (row.asaasSubscriptionClaimedUntil && row.asaasSubscriptionClaimedUntil > now) throw busy();

      // Read only to clean Asaas's words of them: a subscription stands at Asaas for an account that gave them.
      const account = await tx.billingAccount.findUnique({ where: { userId }, select: { name: true, document: true, user: { select: { email: true } } } });
      const until = new Date(now.getTime() + SUBSCRIPTION_CLAIM_MS);
      await tx.storeSubscription.update({ where: { id: row.id }, data: { asaasSubscriptionClaimedUntil: until } });

      const payer = account ? { name: account.name, document: account.document, email: account.user.email } : { name: '', document: '', email: '' };
      return { id: row.id, storeId, payer, knownId: row.asaasSubscriptionId, until };
    });
  }

  /**
   * The payment that stopped the talk, read and written as any other is — with the claim already let
   * go, which the read waits for. Whatever comes of it, the refusal is what is answered: the page's
   * subscription read again shows the payment.
   */
  private async readPaid(storeId: string): Promise<void> {
    await this.payments.sync(storeId).catch((error: unknown) => {
      this.logger.warn({ storeId, reason: reasonOf(error) }, 'Could not read the payment a choice of a cycle came upon');
    });
  }

  /**
   * The first step, and all that happens under a lock: every refusal the row can give, and the talk
   * taken. The lock is the page's own row and goes with the transaction, before Asaas is asked
   * anything. Nothing of the choice is written but the claim.
   */
  private claim(storeId: string, userId: string, cycle: BillingCycle): Promise<Talk> {
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT 1 FROM "store_subscriptions" WHERE "storeId" = ${storeId}::uuid FOR UPDATE`;

      const account = await tx.billingAccount.findUnique({ where: { userId }, select: { name: true, document: true, user: { select: { email: true } } } });
      if (!account) throw accountRequired();

      const row = await tx.storeSubscription.findUnique({ where: { storeId }, include: { store: { select: { name: true } } } });
      if (!row) throw new ConflictException(billingError('BILLING_SUBSCRIPTION_MISSING', 'A page from before subscriptions existed has none to choose a cycle for yet'));

      const now = new Date();
      if (row.status === 'EXEMPT') throw new ConflictException(billingError('BILLING_PAGE_EXEMPT', 'The page owes nothing: there is no plan to pay for'));
      // Only what the row itself is sure of. Any other standing goes on to Asaas, which says whether something was paid.
      if (row.status === 'ACTIVE' && row.currentPeriodEndsAt && row.currentPeriodEndsAt > now) {
        throw new ConflictException(billingError('BILLING_PAGE_ACTIVE', 'A period already paid for is running'));
      }

      const plan = await tx.plan.findUnique({ where: { slug: PLAN_ON_SALE } });
      const priceCents = plan?.active ? priceOf(plan, cycle) : null;
      if (!plan || priceCents === null) throw new ConflictException(billingError('BILLING_PLAN_UNAVAILABLE', 'The plan is not on sale in that cycle'));

      // Last, and before anything is written: a choice that waits its turn leaves the row as the talk in course found it.
      if (row.asaasSubscriptionClaimedUntil && row.asaasSubscriptionClaimedUntil > now) throw busy();

      const until = new Date(now.getTime() + SUBSCRIPTION_CLAIM_MS);
      await tx.storeSubscription.update({ where: { id: row.id }, data: { asaasSubscriptionClaimedUntil: until } });

      return {
        id: row.id,
        storeId,
        userId,
        want: { planId: plan.id, planName: plan.name, cycle, priceCents, storeName: row.store.name },
        payer: { name: account.name, document: account.document, email: account.user.email },
        knownId: row.asaasSubscriptionId,
        until,
      };
    });
  }

  /**
   * With the talk in hand and no lock held: the account's customer made sure of, Asaas searched, and
   * what stands there kept when it is what was chosen — else removed, and one created only when none
   * stands any more.
   */
  private async converge(talk: Talk): Promise<{ row: StoreSubscriptionRow; invoiceUrl: string }> {
    const customerId = await this.accounts.customerOf(talk.userId);
    const want = { customerId, cycle: talk.want.cycle, priceCents: talk.want.priceCents };

    const attempts: Attempt[] = [];
    for (const subscription of await this.standing(talk)) attempts.push({ subscription, charges: await this.asaas.subscriptionCharges(subscription.id) });

    // Applying a payment is not this talk's to do: with one found, nothing is removed and nothing made beside it.
    if (attempts.some(({ charges }) => touchedByMoney(charges))) throw paid();

    // The one the row already names first: its invoice is the one the shopkeeper was handed.
    const kept = attempts.find(({ subscription }) => subscription.id === talk.knownId && serves(subscription, want)) ?? attempts.find(({ subscription }) => serves(subscription, want)) ?? null;
    for (const attempt of attempts) {
      if (attempt !== kept) await this.remove(talk, attempt.subscription.id);
    }
    if (kept) return this.settle(talk, kept.subscription.id, kept.charges);

    if (talk.knownId) await this.forget(talk);
    const firstDueDay = brasiliaDayOf(new Date());
    const created = await this.create(talk, customerId, firstDueDay);
    await this.record(talk, created.id, firstDueDay);

    return this.settle(talk, created.id, await this.asaas.subscriptionCharges(created.id));
  }

  /**
   * Every subscription standing at Asaas for the page: those under its reference and, when the search
   * did not bring it, the one the row names — a search that lags is no leave to make another. That one
   * only while it carries the page's reference: nothing named otherwise is this page's to remove.
   */
  private async standing(talk: Claim): Promise<PlatformSubscription[]> {
    const reference = subscriptionReferenceOf(talk.id);
    const found = await this.asaas.subscriptions(reference);

    if (talk.knownId && !found.some((subscription) => subscription.id === talk.knownId)) {
      const known = await this.asaas.subscription(talk.knownId);
      if (known && !known.deleted && known.externalReference === reference) found.push(known);
    }
    if (found.length > 1) {
      this.logger.warn({ storeId: talk.storeId, asaasSubscriptionIds: found.map((subscription) => subscription.id) }, "More than one subscription stands under a page's reference at bee-link's own Asaas account");
    }
    return found;
  }

  /**
   * One unpaid subscription taken out of Asaas, and then looked at again: a charge paid between the
   * look before and the removal is kept by Asaas on the removed subscription, and no other may be made
   * over money already taken.
   */
  private async remove(talk: Claim, asaasSubscriptionId: string): Promise<void> {
    await this.renew(talk);
    await this.asaas.removeSubscription(asaasSubscriptionId);

    if (touchedByMoney(await this.asaas.subscriptionCharges(asaasSubscriptionId))) {
      this.logger.error({ storeId: talk.storeId, asaasSubscriptionId }, "A page's subscription was paid while it was being removed from Asaas: the charge stands on a removed subscription");
      throw paid();
    }
  }

  /**
   * The one call that cannot be undone, with the claim pushed ahead first. Asaas names a customer that
   * was removed by a code it gives any other refusal, so a refusal is not read: the customer is asked
   * for anew, and only when Asaas turns out to hold another is the creation tried again — once.
   */
  private async create(talk: Talk, customerId: string, firstDueDay: string): Promise<PlatformSubscription> {
    const ask = async (customer: string): Promise<PlatformSubscription> => {
      await this.renew(talk);
      return this.asaas.createSubscription({
        customerId: customer,
        valueCents: talk.want.priceCents,
        cycle: ASAAS_CYCLES[talk.want.cycle],
        firstDueDay,
        description: invoiceDescriptionOf(talk.want.planName, talk.want.cycle, talk.want.storeName),
        externalReference: subscriptionReferenceOf(talk.id),
      });
    };
    const refusalOf = (error: unknown): AsaasRefused | null => (error instanceof AsaasRefused && error.status !== 401 ? error : null);

    try {
      return await ask(customerId);
    } catch (error) {
      const refusal = refusalOf(error);
      if (!refusal) throw error;
      if (refusal.status !== 400) throw new CreationRefused(refusal);

      const standing = await this.accounts.customerOf(talk.userId, customerId);
      if (standing === customerId) throw new CreationRefused(refusal);

      // Said, since nothing else tells it: whatever Asaas held for the customer that was removed went with it.
      this.logger.warn({ storeId: talk.storeId, userId: talk.userId }, "Asaas no longer held an account's customer: another was made, and the page's subscription asked for again");
      return await ask(standing).catch((again: unknown) => {
        const refused = refusalOf(again);
        throw refused ? new CreationRefused(refused) : again;
      });
    }
  }

  /** The subscription just made written as the page's, at once: whatever comes of reading its charge, the row names what stands at Asaas. */
  private async record(talk: Talk, asaasSubscriptionId: string, firstDueDay: string): Promise<void> {
    const { planId, cycle, priceCents } = talk.want;
    await this.mine(talk, { asaasSubscriptionId, planId, cycle, priceCents, firstDueDate: dateOf(firstDueDay), invoiceUrl: null, nextCheckAt: firstCheckAt() });
  }

  /** The row told that the subscription it named stands no more: read meanwhile, it shows no invoice that was removed. */
  private async forget(talk: Claim): Promise<void> {
    await this.mine(talk, { asaasSubscriptionId: null, planId: null, cycle: null, priceCents: null, firstDueDate: null, invoiceUrl: null });
  }

  /**
   * The subscription that stands written as the page's, with the invoice of its first charge, and the
   * talk let go. The first due day is the charge's own: the subscription tells only the one after.
   * With no charge to pay yet the row is written all the same, and the choice is asked again.
   */
  private async settle(talk: Talk, asaasSubscriptionId: string, charges: PlatformCharge[]): Promise<{ row: StoreSubscriptionRow; invoiceUrl: string }> {
    const first = firstChargeOf(charges);
    const invoiceUrl = first && awaitsPayment(first) ? first.invoiceUrl : null;
    const { planId, cycle, priceCents } = talk.want;

    await this.mine(talk, { asaasSubscriptionId, planId, cycle, priceCents, ...(first ? { firstDueDate: dateOf(first.dueDate) } : {}), invoiceUrl, nextCheckAt: firstCheckAt(), asaasSubscriptionClaimedUntil: null });
    if (!invoiceUrl) {
      this.logger.warn({ storeId: talk.storeId, asaasSubscriptionId }, "A page's subscription stands at Asaas with no invoice to pay yet");
      throw new ServiceUnavailableException(billingError('BILLING_UNREACHABLE', 'Asaas holds the subscription and has told of no invoice yet: the same choice again reads it'));
    }

    const row = await this.prisma.storeSubscription.findUniqueOrThrow({ where: { id: talk.id }, include: SUBSCRIPTION_READ });
    return { row, invoiceUrl };
  }

  /** A write to the page's row only while the talk is still this request's: one that lost it writes nothing, and leaves everything to whoever took it. */
  private async mine(talk: Claim, data: Prisma.StoreSubscriptionUncheckedUpdateManyInput): Promise<void> {
    const { count } = await this.prisma.storeSubscription.updateMany({ where: { id: talk.id, asaasSubscriptionClaimedUntil: talk.until }, data });
    if (count === 0) throw busy();
  }

  /** The claim pushed ahead just before a call that changes something at Asaas — and only while it is still this request's. */
  private async renew(talk: Claim): Promise<void> {
    const until = new Date(Date.now() + SUBSCRIPTION_CLAIM_MS);
    await this.mine(talk, { asaasSubscriptionClaimedUntil: until });
    talk.until = until;
  }

  private async holdFor(talk: Claim, ms: number): Promise<void> {
    await this.prisma.storeSubscription.updateMany({ where: { id: talk.id, asaasSubscriptionClaimedUntil: talk.until }, data: { asaasSubscriptionClaimedUntil: new Date(Date.now() + ms) } });
  }

  private async letGo(talk: Claim): Promise<void> {
    await this.prisma.storeSubscription.updateMany({ where: { id: talk.id, asaasSubscriptionClaimedUntil: talk.until }, data: { asaasSubscriptionClaimedUntil: null } });
  }

  /**
   * How a failed talk is told: a stable code, never Asaas's words. What Asaas said goes to the log
   * with the page's id — and with nothing of who is charged, whatever Asaas repeated.
   */
  private said(error: unknown, talk: Claim): unknown {
    const { storeId } = talk;
    if (error instanceof HttpException) return error;
    if (error instanceof PlatformAsaasUnconfigured) return unavailable();
    if (error instanceof AsaasRefused && error.status === 401) {
      this.logger.error({ status: error.status, code: error.code, reason: error.reason }, "Asaas refused the key of bee-link's own account");
      return unavailable("Asaas refused the key of bee-link's own account");
    }
    if (error instanceof CreationRefused) {
      const { status, code, reason } = error.refusal;
      this.logger.warn({ storeId, status, code, reason: reasonWithout(reason, talk.payer) }, "Asaas refused a page's subscription");
      return new BadGatewayException(billingError('BILLING_SUBSCRIPTION_REFUSED', 'Asaas refused the subscription: nothing was made, and choosing again asks again'));
    }
    if (error instanceof AsaasRefused) {
      // A search, a reading or a removal turned away says nothing of the page's choice, and decided nothing.
      this.logger.warn({ storeId, status: error.status, code: error.code, reason: reasonWithout(error.reason, talk.payer) }, "Asaas turned away a question about a page's subscription");
      return unreachable();
    }
    if (error instanceof AsaasUnreachable) {
      this.logger.warn({ storeId, reason: error.message }, "Asaas did not answer about a page's subscription");
      return unreachable();
    }
    return error;
  }
}

function busy(): ConflictException {
  return new ConflictException(billingError('BILLING_SUBSCRIPTION_BUSY', "The page's subscription is being told to Asaas: choose again in a moment"));
}

function paid(): ConflictException {
  return new SubscriptionPaid();
}

function unreachable(): ServiceUnavailableException {
  return new ServiceUnavailableException(billingError('BILLING_UNREACHABLE', 'Asaas did not answer: choosing again picks the talk up'));
}

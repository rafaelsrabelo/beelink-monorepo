// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { StorePopupOverview } from '@harness-monorepo/contracts';

// App
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { StoresService } from '../stores/stores.service.js';
import type { StorePopupDto } from './dto/popup.dto.js';
import { runningPromotions } from './order-discounts.js';
import { UUID } from './promotions.constants.js';
import { firstPurchaseHeadlineOf, shownFirstPurchaseCoupon, shownFirstPurchaseCouponById, shownFirstPurchaseCoupons } from './shop-offers.js';
import { couponOptionOf, popupBenefitOf, popupError, promotionOptionOf, refuseTypedDiscounts, toPopupSettings, visitorsReadAnother } from './shop-popup.js';

/**
 * A shop's first-purchase pop-up as its owner keeps it (BEELINK-306): the form, what it announces
 * now and what it may name. What a visitor is served of it is the offers' answer
 * (`StorefrontOffersController`), by `servedPopupOf`.
 */
@Injectable()
export class PopupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stores: StoresService,
  ) {}

  async overview(storeSlug: string, userId: string): Promise<StorePopupOverview> {
    return this.overviewOf(await this.stores.ownedStoreId(storeSlug, userId));
  }

  /**
   * The whole of the form. A sentence stating a discount by hand is refused, and so is naming a
   * promotion or a coupon the pop-up could never announce. The revision goes up only when what a
   * visitor reads changed: the switch and the trigger leave it, so switching the pop-up off and on
   * does not show it again to everyone who closed it.
   */
  async save(storeSlug: string, userId: string, dto: StorePopupDto): Promise<StorePopupOverview> {
    const storeId = await this.stores.ownedStoreId(storeSlug, userId);
    refuseTypedDiscounts({ title: dto.title, text: dto.text, buttonLabel: dto.buttonLabel });

    const read = { imageUrl: dto.imageUrl, title: dto.title, text: dto.text, buttonLabel: dto.buttonLabel, ...(await this.namedOf(storeId, dto)) };
    const fields = { enabled: dto.enabled, trigger: dto.trigger, delaySeconds: dto.delaySeconds, ...read };

    await this.prisma.$transaction(async (tx) => {
      const before = await tx.storePopup.findUnique({ where: { storeId } });
      if (!before) return tx.storePopup.create({ data: { storeId, ...fields } });
      return tx.storePopup.update({ where: { storeId }, data: { ...fields, ...(visitorsReadAnother(before, read) ? { revision: { increment: 1 } } : {}) } });
    });

    return this.overviewOf(storeId);
  }

  /**
   * The promotion or the coupon the form names, as the two columns. It has to be this shop's, for a
   * first purchase and — a coupon — one the shop shows: anything else the pop-up could never say,
   * and a hidden coupon is not announced by naming it here. Not yet started is taken: the pop-up
   * invites plainly until it runs.
   */
  private async namedOf(storeId: string, dto: StorePopupDto): Promise<{ promotionId: string | null; couponId: string | null }> {
    if (dto.benefitSource === 'AUTO') return { promotionId: null, couponId: null };

    const id = dto.benefitId;
    const refuse = () => new BadRequestException(popupError('POPUP_BENEFIT_INVALID', 'The pop-up names a first-purchase promotion of this shop, or a first-purchase coupon it shows'));
    if (!id || !UUID.test(id)) throw refuse();

    const where = { id, storeId, audience: 'FIRST_PURCHASE' } as const;
    if (dto.benefitSource === 'PROMOTION') {
      if (!(await this.prisma.promotion.findFirst({ where, select: { id: true } }))) throw refuse();
      return { promotionId: id, couponId: null };
    }
    if (!(await this.prisma.coupon.findFirst({ where: { ...where, shownInStore: true }, select: { id: true } }))) throw refuse();
    return { promotionId: null, couponId: id };
  }

  private async overviewOf(storeId: string): Promise<StorePopupOverview> {
    // One instant for what is in force, what is announced and what may be named.
    const now = new Date();
    const maxUses = this.prisma.coupon.fields.maxUses;
    const [row, promotions, coupons, headlineCoupon] = await Promise.all([
      this.prisma.storePopup.findUnique({ where: { storeId } }),
      runningPromotions(this.prisma, storeId, now),
      shownFirstPurchaseCoupons(this.prisma, storeId, now, maxUses),
      shownFirstPurchaseCoupon(this.prisma, storeId, now, maxUses),
    ]);
    const namedCoupon = row?.couponId ? (coupons.find((coupon) => coupon.id === row.couponId) ?? (await shownFirstPurchaseCouponById(this.prisma, storeId, row.couponId, now, maxUses))) : null;

    return {
      settings: toPopupSettings(row),
      benefit: popupBenefitOf(row, { promotions, headlineCoupon, namedCoupon }),
      headline: firstPurchaseHeadlineOf(promotions, headlineCoupon),
      options: [...promotions.filter((promotion) => promotion.audience === 'FIRST_PURCHASE').map(promotionOptionOf), ...coupons.map(couponOptionOf)],
    } satisfies StorePopupOverview;
  }
}

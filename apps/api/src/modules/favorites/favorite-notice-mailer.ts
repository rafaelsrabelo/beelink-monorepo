// Nest
import { Injectable, Logger } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { MailService } from '../../shared/mail/mail.service.js';
import { ATTEMPTS_MAX, OutboxMailer, retryAtOf } from '../../shared/mail/outbox-mailer.js';
import { PrismaService } from '../../shared/prisma/prisma.service.js';
import { ROUTE_WORDS } from '../catalog/catalog.constants.js';
import { favoriteInclude, toCustomerFavorite } from './favorite-reading.js';

/**
 * Pays the e-mails favourites owe (`FavoriteNotice`, BEELINK-155), apart from the writes that owed
 * them: every minute, since what changed a price — the panel, an order — knows nothing of who liked
 * it. The claim, the lease and the retries are `OutboxMailer`'s.
 */
@Injectable()
export class FavoriteNoticeMailer extends OutboxMailer {
  protected readonly logger = new Logger(FavoriteNoticeMailer.name);
  protected readonly table = 'favorite_notices';

  constructor(
    prisma: PrismaService,
    private readonly mail: MailService,
  ) {
    super(prisma);
  }

  protected async send(id: string, attempts: number): Promise<boolean> {
    const row = await this.prisma.favoriteNotice.findUnique({
      where: { id },
      select: {
        customerId: true,
        productId: true,
        variantId: true,
        priceCents: true,
        previousPriceCents: true,
        backInStock: true,
        customer: { select: { name: true, notifyFavorites: true, user: { select: { email: true, emailVerifiedAt: true } } } },
        product: { select: { status: true, store: { select: { name: true, slug: true, routeVocabulary: true } } } },
      },
    });
    const favorite = row
      ? await this.prisma.customerFavorite.findUnique({ where: { customerId_productId: { customerId: row.customerId, productId: row.productId } }, include: favoriteInclude })
      : null;
    const today = favorite ? toCustomerFavorite(favorite) : null;
    const user = row?.customer.user;
    // Unliked or liked in another combination since, the combination no longer sold, sold out again,
    // the notice turned off, the account no longer confirmed or the product off the shelf: nobody to
    // tell, or nothing true to say — done, and not tried again.
    const stale = !favorite || !today || favorite.variantId !== row?.variantId || (row.variantId !== null && today.variant === null) || today.soldOut;
    if (!row || stale || !row.customer.notifyFavorites || !user?.emailVerifiedAt || row.product.status !== 'ACTIVE') {
      await this.prisma.favoriteNotice.update({ where: { id }, data: { sentAt: new Date() } }).catch(() => null);
      return false;
    }

    const { store } = row.product;
    const words = ROUTE_WORDS[store.routeVocabulary];
    const home = `${env.WEB_URL}/${store.slug}`;
    const went = await this.mail.sendFavoriteNotice(
      user.email,
      {
        name: row.customer.name,
        shopName: store.name,
        productName: today.name,
        variantLabel: today.variant?.label ?? null,
        priceCents: row.priceCents,
        previousPriceCents: row.previousPriceCents,
        backInStock: row.backInStock,
      },
      `${home}/${words.products}/${today.slug}${today.variant ? `?${new URLSearchParams({ variant: today.variant.id })}` : ''}`,
      // Straight to the box that turns these off, in the shop's own words.
      `${home}/${words.account}/${words.accountTabs.profile}#avisos`,
    );
    if (went) {
      await this.prisma.favoriteNotice.update({ where: { id }, data: { sentAt: new Date() } });
      return true;
    }

    if (attempts >= ATTEMPTS_MAX) this.logger.warn({ productId: row.productId }, 'Gave up on a favourite notice');
    else await this.prisma.favoriteNotice.update({ where: { id }, data: { nextAttemptAt: retryAtOf(attempts) } });
    return false;
  }
}

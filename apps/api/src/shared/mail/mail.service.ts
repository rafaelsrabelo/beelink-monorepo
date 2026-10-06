// Nest
import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';

// Libs
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Types
import type { Lead } from '@harness-monorepo/contracts';

// App
import type { AccountShop } from '../../modules/auth/account-scope.js';
import { EMAIL_VERIFICATION_TTL_HOURS, PASSWORD_RESET_TTL_MINUTES } from '../../modules/auth/auth.constants.js';
import { env } from '../config/env.js';
import { cashbackExpiring, type CashbackExpiringContent } from './cashback-expiring.template.js';
import { paymentApproved, type PaymentApprovedContent } from './payment-approved.template.js';
import { paymentRefunded, type PaymentRefundedContent } from './payment-refunded.template.js';
import { emailVerification, favoriteNotice, leadReceived, orderStatusChanged, passwordReset, type FavoriteNoticeContent, type OrderStatusContent } from './mail.templates.js';

/** What a lead's e-mail needs beyond the lead: who to greet, and which site's panel to point at. */
export interface LeadReceivedMail {
  ownerName: string;
  siteName: string;
  siteSlug: string;
  lead: Lead;
}

/** A link to one of the shop's pages, with its token and where to go back to once done. */
function shopLinkOf(path: string, token: string, returnTo: string): string {
  return `${env.WEB_URL}${path}?token=${encodeURIComponent(token)}&voltar=${encodeURIComponent(returnTo)}`;
}

/** The address alone out of `Name <address>`, or the whole value when it is just an address. */
export function addressOf(from: string): string {
  return /<([^<>]+)>\s*$/.exec(from)?.[1]?.trim() ?? from.trim();
}

@Injectable()
export class MailService implements OnApplicationBootstrap {
  private readonly logger = new Logger(MailService.name);
  /**
   * The timeouts are well under an outbox's lease (`OutboxMailer`): a send that hangs
   * gives up long before another sweep may claim the same e-mail and send it again.
   */
  private readonly transporter: Transporter = createTransport({ url: env.SMTP_URL, connectionTimeout: 30_000, greetingTimeout: 30_000, socketTimeout: 60_000 });

  /**
   * In production the provider is asked once, at boot, whether it takes this login (BEELINK-168). A
   * send fails without failing its request, by design, so a wrong password otherwise surfaces only
   * as the first sign-up nobody can confirm. Never awaited: a slow provider does not hold the boot.
   */
  onApplicationBootstrap(): void {
    if (env.NODE_ENV !== 'production') return;
    this.transporter.verify().then(
      () => this.logger.log('SMTP took the login: e-mails can leave'),
      (error: unknown) => this.logger.error({ err: error }, 'SMTP refused the connection or the login: no e-mail will leave'),
    );
  }

  /**
   * A shopper's links open their shop's own pages, bringing them back where they were going, and the
   * e-mail comes from the shop by name (BEELINK-149): a shop's customer never lands on the panel.
   * A shopkeeper's open the panel's.
   */
  async sendEmailVerification(to: string, name: string, token: string, shop?: AccountShop): Promise<void> {
    const url = shop ? shopLinkOf(shop.verifyPath, token, shop.returnTo) : `${env.WEB_URL}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send(to, emailVerification(name, url, EMAIL_VERIFICATION_TTL_HOURS, shop?.name), shop?.name);
  }

  async sendPasswordReset(to: string, name: string, token: string, shop?: AccountShop): Promise<void> {
    const url = shop ? shopLinkOf(shop.resetPath, token, shop.returnTo) : `${env.WEB_URL}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send(to, passwordReset(name, url, PASSWORD_RESET_TTL_MINUTES, shop?.name), shop?.name);
  }

  /**
   * A customer's order moved (BEELINK-151), from the shop by name, with the way to the order at the
   * shop. Answers whether it went: the outbox that asks tries again when it did not.
   */
  async sendOrderStatus(to: string, content: OrderStatusContent, url: string, settingsUrl: string): Promise<boolean> {
    return this.send(to, orderStatusChanged(content, url, settingsUrl), content.shopName);
  }

  /** A customer's online payment was approved (BEELINK-207); answers whether it went, for its outbox. */
  async sendPaymentApproved(to: string, content: PaymentApprovedContent, url: string, settingsUrl: string): Promise<boolean> {
    return this.send(to, paymentApproved(content, url, settingsUrl), content.shopName);
  }

  /** Money of a customer's online payment was given back (BEELINK-208); answers whether it went, for its outbox. */
  async sendPaymentRefunded(to: string, content: PaymentRefundedContent, url: string, settingsUrl: string): Promise<boolean> {
    return this.send(to, paymentRefunded(content, url, settingsUrl), content.shopName);
  }

  /** A favourite got cheaper or came back (BEELINK-155); answers whether it went, for its outbox. */
  async sendFavoriteNotice(to: string, content: FavoriteNoticeContent, url: string, settingsUrl: string): Promise<boolean> {
    return this.send(to, favoriteNotice(content, url, settingsUrl), content.shopName);
  }

  /** A customer's cashback about to expire (BEELINK-241); answers whether it went, for its outbox. */
  async sendCashbackExpiring(to: string, content: CashbackExpiringContent, url: string, settingsUrl: string): Promise<boolean> {
    return this.send(to, cashbackExpiring(content, url, settingsUrl), content.shopName);
  }

  /** One per lead, to the site's owner. The visitor's words travel escaped — see `leadReceived`. */
  async sendLeadReceived(to: string, { ownerName, siteName, siteSlug, lead }: LeadReceivedMail): Promise<void> {
    const url = `${env.WEB_URL}/admin/${siteSlug}/leads`;

    await this.send(
      to,
      leadReceived(
        { ownerName, siteName, leadName: lead.name, email: lead.email, phone: lead.phone, answers: lead.answers },
        url,
      ),
    );
  }

  /**
   * A failed send never fails the request: the caller has already answered 202 or created the
   * account, and every one of these e-mails can be asked for again — an order's, by its outbox, which
   * reads the answer. The link is never logged.
   */
  private async send(to: string, { subject, text, html }: { subject: string; text: string; html: string }, senderName?: string): Promise<boolean> {
    // A shop's e-mail goes out under the shop's name, from the product's own address.
    const from = senderName ? { name: senderName, address: addressOf(env.MAIL_FROM) } : env.MAIL_FROM;
    try {
      await this.transporter.sendMail({ from, to, subject, text, html });
      return true;
    } catch (error) {
      this.logger.error({ err: error, subject }, 'Could not send e-mail');
      return false;
    }
  }
}

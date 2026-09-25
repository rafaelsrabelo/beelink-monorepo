// Nest
import { Injectable, Logger } from '@nestjs/common';

// Libs
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';

// Types
import type { Lead } from '@harness-monorepo/contracts';

// App
import { EMAIL_VERIFICATION_TTL_HOURS, PASSWORD_RESET_TTL_MINUTES } from '../../modules/auth/auth.constants.js';
import { env } from '../config/env.js';
import { emailVerification, leadReceived, passwordReset } from './mail.templates.js';

/** What a lead's e-mail needs beyond the lead: who to greet, and which site's panel to point at. */
export interface LeadReceivedMail {
  ownerName: string;
  siteName: string;
  siteSlug: string;
  lead: Lead;
}

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter = createTransport(env.SMTP_URL);

  /**
   * `continuePath` is where the web sends the person once verified: a shopper who signed up in a
   * shop goes back to that shop, not to the panel's front door.
   */
  async sendEmailVerification(to: string, name: string, token: string, continuePath?: string): Promise<void> {
    const back = continuePath ? `&voltar=${encodeURIComponent(continuePath)}` : '';
    const url = `${env.WEB_URL}/verify-email?token=${encodeURIComponent(token)}${back}`;
    await this.send(to, emailVerification(name, url, EMAIL_VERIFICATION_TTL_HOURS));
  }

  async sendPasswordReset(to: string, name: string, token: string): Promise<void> {
    const url = `${env.WEB_URL}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send(to, passwordReset(name, url, PASSWORD_RESET_TTL_MINUTES));
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
   * account, and every one of these e-mails can be asked for again. The link is never logged.
   */
  private async send(to: string, { subject, text, html }: { subject: string; text: string; html: string }): Promise<void> {
    try {
      await this.transporter.sendMail({ from: env.MAIL_FROM, to, subject, text, html });
    } catch (error) {
      this.logger.error({ err: error, subject }, 'Could not send e-mail');
    }
  }
}

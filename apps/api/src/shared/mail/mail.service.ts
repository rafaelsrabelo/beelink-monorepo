// Nest
import { Injectable, Logger } from '@nestjs/common';

// Libs
import { createTransport } from 'nodemailer';
import type { Transporter } from 'nodemailer';

// App
import { EMAIL_VERIFICATION_TTL_HOURS, PASSWORD_RESET_TTL_MINUTES } from '../../modules/auth/auth.constants.js';
import { env } from '../config/env.js';
import { emailVerification, passwordReset } from './mail.templates.js';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter = createTransport(env.SMTP_URL);

  async sendEmailVerification(to: string, name: string, token: string): Promise<void> {
    const url = `${env.WEB_URL}/verify-email?token=${encodeURIComponent(token)}`;
    await this.send(to, emailVerification(name, url, EMAIL_VERIFICATION_TTL_HOURS));
  }

  async sendPasswordReset(to: string, name: string, token: string): Promise<void> {
    const url = `${env.WEB_URL}/reset-password?token=${encodeURIComponent(token)}`;
    await this.send(to, passwordReset(name, url, PASSWORD_RESET_TTL_MINUTES));
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

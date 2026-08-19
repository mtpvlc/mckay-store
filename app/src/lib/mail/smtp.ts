import 'server-only';
import nodemailer from 'nodemailer';
import { config } from '../config';
import type { Mail, Mailer } from '../mail';

const globalForMail = globalThis as unknown as {
  __transport?: nodemailer.Transporter;
};

function transport() {
  globalForMail.__transport ??= nodemailer.createTransport(config.smtpUrl);
  return globalForMail.__transport;
}

export const smtpMailer: Mailer = {
  async send(mail: Mail): Promise<void> {
    await transport().sendMail({
      from: config.orderFromEmail,
      to: mail.to,
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });
  },
};

/**
 * Sends without ever rejecting. Order writes must not roll back because an
 * SMTP host was unreachable.
 *
 * Only the error is logged - never the mail body, which carries personal data.
 */
export async function sendQuietly(mail: Mail): Promise<void> {
  try {
    await smtpMailer.send(mail);
  } catch (error) {
    console.error('[mail] send failed:', error instanceof Error ? error.message : 'unknown error');
  }
}

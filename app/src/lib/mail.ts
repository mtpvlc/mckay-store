import 'server-only';

export type Mail = { to: string; subject: string; text: string; html: string };

export interface Mailer {
  send(mail: Mail): Promise<void>;
}

export { smtpMailer as mailer } from './mail/smtp';

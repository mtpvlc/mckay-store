/**
 * Hidden field bots fill in and humans never see. Named innocuously so that
 * autofill-driven bots are tempted by it.
 */
export const HONEYPOT_FIELD = 'company_url';

export function isBotSubmission(formData: FormData): boolean {
  const value = formData.get(HONEYPOT_FIELD);
  return typeof value === 'string' && value.trim() !== '';
}

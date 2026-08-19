/**
 * Cookie names and flags.
 *
 * This file is imported by src/middleware.ts, which runs on the edge runtime.
 * It must therefore stay free of any database or Node-only import.
 *
 * NOTE: this is the ONE permitted exception to "process.env only in config.ts".
 * config.ts validates the full environment (DATABASE_URL and friends), which
 * is not available - and not wanted - inside edge middleware. Only NODE_ENV is
 * read here.
 */
const isProduction = process.env.NODE_ENV === 'production';

/**
 * The __Host- prefix requires the Secure flag, which browsers refuse to set
 * over plain http. Development runs on http://localhost, so the prefix is
 * dropped there. Without this, login silently fails to persist a session.
 */
export const ADMIN_COOKIE_NAME = isProduction ? '__Host-admin_session' : 'admin_session';
export const CUSTOMER_COOKIE_NAME = isProduction ? '__Host-customer_session' : 'customer_session';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax' as const,
  path: '/',
};

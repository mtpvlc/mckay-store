import 'dotenv/config';
import { createInterface } from 'node:readline';
import { stdin, stdout, argv, env, exit } from 'node:process';
import * as argon2 from 'argon2';
import postgres from 'postgres';

/**
 * Creates (or resets the password of) an admin account. No default credentials
 * exist anywhere in the repo - this script is the only way an admin is made.
 *
 * Interactive:
 *   npm run admin:create
 *
 * Non-interactive (CI, scripted setup):
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=secret npm run admin:create
 *   npm run admin:create -- you@example.com secret
 */

function ask(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const rl = createInterface({ input: stdin, output: stdout });
    // Piped stdin hits EOF without ever answering. Fail loudly instead of
    // exiting silently having done nothing.
    rl.on('close', () => reject(new Error('Input closed before a value was given.')));
    rl.question(prompt, (answer) => {
      rl.removeAllListeners('close');
      rl.close();
      resolve(answer);
    });
  });
}

async function main() {
  const url = env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL is not set. Create .env.local first.');

  const [argEmail, argPassword] = argv.slice(2);
  const email = (argEmail ?? env.ADMIN_EMAIL ?? (await ask('Admin email: '))).trim().toLowerCase();
  const password = argPassword ?? env.ADMIN_PASSWORD ?? (await ask('Password (min 10 chars): '));

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('That is not a valid email address.');
  if (password.length < 10) throw new Error('Password must be at least 10 characters.');

  // argon2id explicitly - the library defaults to argon2i.
  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  const sql = postgres(url, { max: 1 });
  try {
    const rows = await sql<{ email: string }[]>`
      INSERT INTO admins (email, password_hash)
      VALUES (${email}, ${passwordHash})
      ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash
      RETURNING email
    `;
    console.log(`Admin ready: ${rows[0]!.email}`);
    console.log(`Hash type:   ${passwordHash.slice(0, 9)}`);
  } finally {
    await sql.end();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  exit(1);
});

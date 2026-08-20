import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { config } from '@/lib/config';

/**
 * Serves uploaded product images from UPLOAD_DIR at request time.
 *
 * This route exists because `next start` only serves public/ files that were
 * present at build time - anything uploaded later 404s. Reading from disk here
 * also lets UPLOAD_DIR point at a mounted volume outside public/ entirely.
 */

const CONTENT_TYPES: Record<string, string> = {
  jpg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  avif: 'image/avif',
};

export async function GET(_request: Request, { params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;

  // Filenames are server-generated UUIDs; anything else is rejected outright.
  if (path.basename(key) !== key || !/^[a-f0-9-]{36}\.[a-z0-9]+$/.test(key)) {
    return new Response('Not found', { status: 404 });
  }

  const extension = key.split('.').pop() ?? '';
  const contentType = CONTENT_TYPES[extension];
  if (!contentType) return new Response('Not found', { status: 404 });

  try {
    const data = await readFile(path.join(path.resolve(config.uploadDir), key));
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': contentType,
        // Keys are immutable UUIDs - a replaced image always gets a new URL.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}

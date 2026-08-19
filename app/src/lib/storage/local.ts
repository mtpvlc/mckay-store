import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config';
import { assertValidImage, type Storage, type StoredFile } from '../storage';

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

export const localStorage: Storage = {
  async put(file: File): Promise<StoredFile> {
    assertValidImage(file);

    // Filename is generated, never taken from the client. A client-supplied
    // name is a path traversal vector.
    const key = `${randomUUID()}.${EXTENSIONS[file.type] ?? 'bin'}`;
    const dir = path.resolve(config.uploadDir);

    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, key), Buffer.from(await file.arrayBuffer()));

    return { key, url: `/uploads/${key}` };
  },

  async delete(key: string): Promise<void> {
    // Defence in depth: reject anything that is not a bare filename.
    const safe = path.basename(key);
    if (safe !== key) return;

    try {
      await unlink(path.join(path.resolve(config.uploadDir), safe));
    } catch {
      /* already gone - nothing to do */
    }
  },
};

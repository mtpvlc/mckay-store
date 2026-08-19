import 'server-only';
import type { Storage } from '../storage';

/**
 * Placeholder for object storage (S3, R2, Supabase Storage).
 *
 * Throws loudly rather than silently no-opping, so that swapping the export in
 * ../storage.ts without wiring credentials fails immediately instead of
 * dropping uploads on the floor.
 */
export const s3Storage: Storage = {
  async put() {
    throw new Error('S3 storage is not configured. Add credentials before enabling it.');
  },
  async delete() {
    throw new Error('S3 storage is not configured. Add credentials before enabling it.');
  },
};

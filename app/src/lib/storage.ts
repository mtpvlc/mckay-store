import 'server-only';

export type StoredFile = { url: string; key: string };

export interface Storage {
  put(file: File): Promise<StoredFile>;
  delete(key: string): Promise<void>;
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export class UploadError extends Error {}

export function assertValidImage(file: File): void {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    throw new UploadError('Only JPEG, PNG, WebP and AVIF images are allowed.');
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new UploadError('Images must be 8 MB or smaller.');
  }
  if (file.size === 0) {
    throw new UploadError('That file is empty.');
  }
}

/** Swap this for the S3 implementation when the client outgrows local disk. */
export { localStorage as storage } from './storage/local';

import slugify from 'slugify';

/**
 * General Unicode transliteration - the store is international, so names can
 * carry accents, umlauts or non-Latin scripts.
 */
export function toSlug(name: string, fallback: string): string {
  const slug = slugify(name, { lower: true, strict: true, trim: true });
  return slug.length > 0 ? slug.slice(0, 80) : fallback;
}

/** Appends -2, -3, ... so a new product never overwrites an existing slug. */
export function nextSlugCandidate(base: string, attempt: number): string {
  return attempt <= 1 ? base : `${base}-${attempt}`;
}

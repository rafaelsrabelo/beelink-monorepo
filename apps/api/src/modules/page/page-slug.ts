// App
import { slugify } from '../../shared/slug.js';
import { SLUG_PATTERN } from '../catalog/catalog.constants.js';

/** Long enough for "lancamento-whey-900g-baunilha", short enough to read aloud. */
export const PAGE_SLUG_MAX_LENGTH = 60;

/** One letter is an address nobody reads as a page's. */
export const PAGE_SLUG_MIN_LENGTH = 2;

/**
 * A landing's address, as the API stores it: normalised the way every other segment is, cut to the
 * column, and whether what is left is an address at all.
 *
 * No reserved words: a landing lives under `/<shop>/lp/`, where the router means nothing else.
 */
export function pageSlugOf(value: string): { slug: string; valid: boolean } {
  const slug = slugify(value).slice(0, PAGE_SLUG_MAX_LENGTH).replace(/-+$/, '');
  return { slug, valid: slug.length >= PAGE_SLUG_MIN_LENGTH && SLUG_PATTERN.test(slug) };
}

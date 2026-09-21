// Nest
import { BadRequestException, Injectable } from '@nestjs/common';

// Types
import type { CatalogErrorCode } from '@harness-monorepo/contracts';

// App
import { slugify } from '../../shared/slug.js';
import {
  RESERVED_PATH_SEGMENTS,
  SLUG_HISTORY_LIMIT,
  SLUG_PATTERN,
} from './catalog.constants.js';

/** Keeps every code this module answers inside the contract's union. */
export function catalogError(
  errorCode: CatalogErrorCode,
  message: string,
): { errorCode: CatalogErrorCode; message: string } {
  return { errorCode, message };
}

/**
 * The rule that decides what a URL segment may be, and what happens to the old one when it changes.
 *
 * It is a service of its own rather than two copies inside the product and category services,
 * because those two share a namespace: both are reached through `/<shop>/…`, both are refused the
 * same reserved words, and both keep a history so a rename redirects instead of 404ing. Written
 * twice, the two would drift the first time one of them gained a rule.
 */
@Injectable()
export class CatalogSlugService {
  /**
   * What the row should store, given what the shopkeeper sent. An explicit slug is normalised
   * exactly as a derived one is: a shopkeeper who types `Blusas!` gets `blusas` rather than a
   * refusal, and one who types nothing gets the name they already wrote.
   */
  resolve(explicit: string | undefined, name: string): string {
    const slug = slugify(explicit ?? name);

    if (!slug) {
      throw new BadRequestException(
        catalogError(
          'CATALOG_SLUG_EMPTY',
          `"${explicit ?? name}" leaves nothing that can be part of a web address`,
        ),
      );
    }

    // Belt and braces: slugify's output satisfies this by construction, so a failure here means the
    // normaliser changed underneath and the unique index is about to mean something else.
    if (!SLUG_PATTERN.test(slug)) {
      throw new BadRequestException(
        catalogError('CATALOG_SLUG_EMPTY', `"${slug}" is not a valid web address segment`),
      );
    }

    if (RESERVED_PATH_SEGMENTS.includes(slug)) {
      throw new BadRequestException(
        catalogError('CATALOG_SLUG_RESERVED', `"${slug}" is a word the shop's own addresses use`),
      );
    }

    return slug;
  }

  /**
   * The history a renamed row should now carry.
   *
   * The previous slug goes to the end, so the oldest link is the first to be retired when the bound
   * is reached. A slug that comes **back** — the shopkeeper renames and changes their mind — is
   * removed from the history rather than left in it, because a live slug that is also a historical
   * one would make the resolver answer a redirect to the page the visitor already asked for.
   */
  historyAfterRename(current: string, next: string, history: readonly string[]): string[] {
    if (current === next) return [...history];

    return [...history.filter((past) => past !== current && past !== next), current].slice(
      -SLUG_HISTORY_LIMIT,
    );
  }
}

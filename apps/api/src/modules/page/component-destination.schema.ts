// Libs
import { z } from 'zod';

// App
import { COMPONENT_URL_MAX_LENGTH } from './page.constants.js';

/**
 * A destination, as an id. Shared by a slide and by the strip's link.
 *
 * Exactly one of the three, refined rather than left to a CHECK — `items` is JSON, so the
 * database cannot hold the rule the way it held it for the four columns this model dropped. The
 * refinement is where it lives instead, and it says the same thing: a thing that claims CATEGORY
 * has a category.
 */
export const destination = {
  target: z.enum(['CATEGORY', 'PRODUCT', 'EXTERNAL', 'NONE']),
  categoryId: z.uuid().nullish(),
  productId: z.uuid().nullish(),
  externalUrl: z.url({ protocol: /^https?$/ }).max(COMPONENT_URL_MAX_LENGTH).nullish(),
};

export const carriesWhatItNames = (row: {
  target: string;
  categoryId?: string | null;
  productId?: string | null;
  externalUrl?: string | null;
}) =>
  (row.target === 'CATEGORY' && !!row.categoryId) ||
  (row.target === 'PRODUCT' && !!row.productId) ||
  (row.target === 'EXTERNAL' && !!row.externalUrl) ||
  row.target === 'NONE';

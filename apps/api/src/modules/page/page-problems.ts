// Types
import type { PageProblem } from '@harness-monorepo/contracts';
import type { SectionShape } from './page-document.js';
import type { PageLookups } from './page-public.mapper.js';

// App
import { hasEnded } from './page-countdown.js';
import { pointersOf } from './page-links.js';

/**
 * What Publicar would serve that the owner may not mean to, found with the lookups the shop itself
 * would run — so "vitrine sem produtos" means exactly what a visitor would see. Only what shows is
 * looked at: a hidden band or block is served to nobody. None of it stops a publish.
 */
export function problemsOf(sections: readonly SectionShape[], resolved: PageLookups): PageProblem[] {
  const problems: PageProblem[] = [];

  for (const section of sections) {
    if (!section.isActive) continue;

    for (const component of section.components) {
      if (!component.isActive) continue;
      const where = { sectionId: section.id, componentId: component.id };

      if (component.kind === 'PRODUCTS' && !resolved.shelves.get(component.id)?.products.length) {
        problems.push({ kind: 'SHOWCASE_EMPTY', ...where, itemId: null });
      }

      if (hasEnded(component, resolved.now ?? Date.now())) {
        problems.push({ kind: 'COUNTDOWN_ENDED', ...where, itemId: null });
      }

      // None chosen, or one no longer on sale: the shop draws nothing where the owner put a product.
      if (component.kind === 'FEATURED_PRODUCT' && !resolved.featured.has(component.id)) {
        problems.push({ kind: 'FEATURED_PRODUCT_UNAVAILABLE', ...where, itemId: null });
      }

      const pointers = pointersOf(component.kind, component.items);

      if (component.kind === 'BANNER' && pointers.length === 0) {
        problems.push({ kind: 'BANNER_WITHOUT_IMAGE', ...where, itemId: null });
      }

      for (const pointer of pointers) {
        if (pointer.target === 'PRODUCT' && pointer.productId && !resolved.slugs.products.has(pointer.productId)) {
          problems.push({ kind: 'LINK_TO_MISSING_PRODUCT', ...where, itemId: pointer.id });
        }
        if (pointer.target === 'CATEGORY' && pointer.categoryId && !resolved.slugs.categories.has(pointer.categoryId)) {
          problems.push({ kind: 'LINK_TO_MISSING_CATEGORY', ...where, itemId: pointer.id });
        }
      }
    }
  }

  return problems;
}

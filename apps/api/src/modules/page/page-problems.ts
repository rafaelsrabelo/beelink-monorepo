// Types
import type { AnnouncementLink, BannerSlide, PageProblem } from '@harness-monorepo/contracts';
import type { SectionShape } from './page-document.js';
import type { ShelvesByComponent, SlugsByEntity } from './page-public.mapper.js';

// App
import { itemsOf } from './page.mapper.js';

/** A slide or a link, as far as where it points goes. */
type Pointer = Pick<BannerSlide | AnnouncementLink, 'id' | 'target' | 'productId' | 'categoryId'>;

/**
 * What Publicar would serve that the owner may not mean to, found with the lookups the shop itself
 * would run — so "vitrine sem produtos" means exactly what a visitor would see. Only what shows is
 * looked at: a hidden band or block is served to nobody. None of it stops a publish.
 */
export function problemsOf(sections: readonly SectionShape[], resolved: { slugs: SlugsByEntity; shelves: ShelvesByComponent }): PageProblem[] {
  const problems: PageProblem[] = [];

  for (const section of sections) {
    if (!section.isActive) continue;

    for (const component of section.components) {
      if (!component.isActive) continue;
      const where = { sectionId: section.id, componentId: component.id };

      if (component.kind === 'PRODUCTS' && !resolved.shelves.get(component.id)?.products.length) {
        problems.push({ kind: 'SHOWCASE_EMPTY', ...where, itemId: null });
      }

      if (component.kind !== 'BANNER' && component.kind !== 'ANNOUNCEMENT') continue;
      const pointers = itemsOf(component.kind, component.items) as Pointer[];

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

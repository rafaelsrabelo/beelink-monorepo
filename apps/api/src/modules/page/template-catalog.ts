// Types
import type { PageKind, PageTemplateSummary, PaymentMethod, StoreType, TemplateId, TemplateNeed } from '@harness-monorepo/contracts';
import type { LandingSubject } from './landing-templates.js';
import type { SeededBand } from './page-seed.js';

// App
import { coverImageOf, landingBands } from './landing-templates.js';
import { saleEndOf } from './page-countdown.js';
import { promisesOf } from './page-seed.js';
import { templatePage } from './page-templates.js';

/** What a model fills its bands from, read from the shop before anything is written. One shape for every model. */
export type TemplateSubject = LandingSubject;

/** A model: where it applies, what it asks for, and the bands it arranges. */
export interface PageTemplate {
  id: TemplateId;
  pageKinds: readonly PageKind[];
  storeTypes: readonly StoreType[];
  /** Slugs of `store_categories` it is suggested for. They order the gallery; they hide nothing. */
  recommendedFor: readonly string[];
  /** What the shopkeeper has to name before it can be arranged — not everything it reads. */
  needs: readonly TemplateNeed[];
  bands(subject: TemplateSubject): SeededBand[];
  /** The picture its cover draws, which a shared link shows. */
  coverImage(subject: TemplateSubject): string | null;
}

const SHOP_LANDING = { pageKinds: ['LANDING'], storeTypes: ['ECOMMERCE'], needs: ['PRODUCT'] } as const;

/**
 * Every model, in the order the gallery offers them.
 *
 * A record and not a list: an id added to the contract does not compile until it has an entry here,
 * and no id can be entered twice. This is the one place that says where a model applies — creating a
 * store, creating a landing and listing the gallery all read it.
 *
 * The builders are where they were (`page-templates.ts`, `landing-templates.ts`); an entry points at
 * its own. A site's model reads nothing from the subject. A product model asked for without a
 * product is refused by whoever applies it, from `needs`, before `bands` runs.
 */
const TEMPLATES: Record<TemplateId, Omit<PageTemplate, 'id'>> = {
  'servicos-b2b': {
    pageKinds: ['HOME'],
    storeTypes: ['INSTITUTIONAL'],
    recommendedFor: ['servicos'],
    needs: [],
    bands: () => templatePage('servicos-b2b'),
    coverImage: () => null,
  },
  lancamento: {
    ...SHOP_LANDING,
    recommendedFor: ['suplementos', 'eletronicos', 'beleza'],
    bands: (subject) => landingBands('lancamento', subject),
    coverImage: (subject) => coverImageOf('lancamento', subject),
  },
  'promocao-relampago': {
    ...SHOP_LANDING,
    recommendedFor: ['alimentacao', 'padaria', 'doces-e-bolos', 'bebidas', 'mercado'],
    bands: (subject) => landingBands('promocao-relampago', subject),
    coverImage: (subject) => coverImageOf('promocao-relampago', subject),
  },
  // Its category is the product's, read with it: nothing more for the shopkeeper to name.
  colecao: {
    ...SHOP_LANDING,
    recommendedFor: ['moda', 'casa-e-decoracao', 'petshop'],
    bands: (subject) => landingBands('colecao', subject),
    coverImage: (subject) => coverImageOf('colecao', subject),
  },
  // The one landing a site may open with: the others sell a product, and a site sells none.
  'em-branco': {
    pageKinds: ['LANDING'],
    storeTypes: ['ECOMMERCE', 'INSTITUTIONAL'],
    recommendedFor: [],
    needs: [],
    bands: (subject) => landingBands('em-branco', subject),
    coverImage: () => null,
  },
};

export const TEMPLATE_IDS = Object.keys(TEMPLATES) as TemplateId[];

export const PAGE_TEMPLATES: readonly PageTemplate[] = TEMPLATE_IDS.map((id) => ({ id, ...TEMPLATES[id] }));

export function templateOf(id: TemplateId): PageTemplate {
  return { id, ...TEMPLATES[id] };
}

/**
 * The subject of a page made with no product picked: the shop's own promises and a title.
 *
 * `now` is the caller's clock, read once: a flash sale's end is counted from the moment the page is made.
 */
export function shopSubject(title: string, paymentMethods: readonly PaymentMethod[], now: Date): TemplateSubject {
  return { title, product: null, category: null, promises: promisesOf(paymentMethods), saleEndsAt: saleEndOf(now) };
}

/**
 * The models a page of this kind, in a store of this type, may be arranged with — the ones suggested
 * for the shop's category first, each group in the catalogue's order. A shop with no category is
 * suggested none, and is still offered every model.
 */
export function templatesFor(pageKind: PageKind, storeType: StoreType, categorySlug: string | null): PageTemplateSummary[] {
  const offered = PAGE_TEMPLATES.filter((template) => template.pageKinds.includes(pageKind) && template.storeTypes.includes(storeType)).map(
    (template) => ({
      id: template.id,
      pageKinds: [...template.pageKinds],
      storeTypes: [...template.storeTypes],
      recommended: categorySlug !== null && template.recommendedFor.includes(categorySlug),
      needs: [...template.needs],
    }),
  );

  return [...offered.filter((template) => template.recommended), ...offered.filter((template) => !template.recommended)];
}

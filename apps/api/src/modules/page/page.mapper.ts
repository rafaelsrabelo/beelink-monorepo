// Types
import type {
  AnnouncementLink,
  BannerSlide,
  ComponentItem,
  ComponentKind,
  PublicAnnouncementLink,
  PublicBannerSlide,
  PublicComponent,
  PublicComponentItem,
  PublicSection,
  Section,
  StoreComponent,
  StorefrontRouteWords,
} from '@harness-monorepo/contracts';
import type { StoreComponentModel, StoreSectionModel } from '../../generated/prisma/models.js';

// App
import { parseComponentItems } from './component-items.schema.js';

/**
 * A band is always read with what is in it, never on its own.
 *
 * Demanding the components in the row type is what stops a call site forgetting the include and
 * shipping a band that draws nothing — which, on the storefront, is an empty strip on a page a
 * stranger asked for rather than an error anybody would see.
 */
export type SectionRow = StoreSectionModel & { components: StoreComponentModel[] };

export const sectionInclude = {
  components: { orderBy: { position: 'asc' } },
} as const;

/**
 * What the database gave back for `items`, narrowed to what the wire declares.
 *
 * `Json` is `unknown` as far as the client is concerned, and casting it would be a lie the
 * compiler cannot check. A row whose items are not an array reads as none — which draws an empty
 * band rather than throwing. The shape inside each entry is the write path's job, and the zod
 * union there is where a malformed one is refused.
 */
function itemsOf(kind: ComponentKind, raw: unknown): ComponentItem[] {
  return parseComponentItems(kind, raw);
}

/**
 * The slugs the slides point at, looked up once for the whole page.
 *
 * A slide keeps an id rather than an address, so that renaming a category moves the slide with it
 * — the promise a foreign key used to make. What it cannot have is the foreign key itself, because
 * `items` is JSON: there is no cascade, and no constraint stopping an id from outliving the row it
 * names.
 *
 * That turns out to be the better failure. A deleted category used to take the whole banner with
 * it; an id with nothing behind it resolves to null here and the slide stops being a link. The
 * picture stays on the page, which is what the shopkeeper put there.
 */
export interface SlugsByEntity {
  categories: ReadonlyMap<string, string>;
  products: ReadonlyMap<string, string>;
}

export const NO_SLUGS: SlugsByEntity = { categories: new Map(), products: new Map() };

/** The kinds whose items point somewhere by id. */
const POINTING: readonly ComponentKind[] = ['BANNER', 'ANNOUNCEMENT'];

/** Every id every slide and the strip's link on this page name, so one query answers all of them. */
export function slideTargetsOf(rows: readonly SectionRow[]): { categoryIds: string[]; productIds: string[] } {
  const categoryIds = new Set<string>();
  const productIds = new Set<string>();

  for (const section of rows) {
    for (const component of section.components) {
      if (!POINTING.includes(component.kind)) continue;

      for (const item of itemsOf(component.kind, component.items) as (BannerSlide | AnnouncementLink)[]) {
        if (item.categoryId) categoryIds.add(item.categoryId);
        if (item.productId) productIds.add(item.productId);
      }
    }
  }

  return { categoryIds: [...categoryIds], productIds: [...productIds] };
}

/**
 * The finished address, built here and not in the browser.
 *
 * This is the whole reason a slide stores an id instead of the `href` the first attempt stored:
 * the address is derived from the slug the target has **now**, so renaming a category moves every
 * slide pointing at it. The word for the product segment comes from the shop's own vocabulary,
 * never from a literal — the API's side of the rule the web keeps in one module.
 */
function hrefOf(
  row: Pick<AnnouncementLink, 'target' | 'categoryId' | 'productId' | 'externalUrl'>,
  shopSlug: string,
  words: StorefrontRouteWords,
  slugs: SlugsByEntity,
): string | null {
  const categorySlug = row.categoryId ? slugs.categories.get(row.categoryId) : undefined;
  const productSlug = row.productId ? slugs.products.get(row.productId) : undefined;

  return row.target === 'CATEGORY' && categorySlug
    ? `/${shopSlug}/${categorySlug}`
    : row.target === 'PRODUCT' && productSlug
      ? `/${shopSlug}/${words.products}/${productSlug}`
      : row.target === 'EXTERNAL'
        ? (row.externalUrl ?? null)
        : null;
}

/** One slide, with its address built from the slug its target has now. */
function toPublicSlide(
  slide: BannerSlide,
  shopSlug: string,
  words: StorefrontRouteWords,
  slugs: SlugsByEntity,
): PublicBannerSlide {
  const href = hrefOf(slide, shopSlug, words, slugs);

  return {
    id: slide.id,
    imageUrl: slide.imageUrl,
    title: slide.title ?? null,
    subtitle: slide.subtitle ?? null,
    // Null rather than an empty string: the window reads it as "no link" and draws a poster. An
    // empty href is a link to the current page, which is a card that looks live and does nothing.
    href,
    // On the wire rather than sniffed from the href downstream: a storefront deciding by looking
    // for "http" would start opening the shop's own pages in a new tab the day these become
    // absolute.
    external: slide.target === 'EXTERNAL' && !!href,
  } satisfies PublicBannerSlide;
}

function toPublicComponent(
  row: StoreComponentModel,
  shopSlug: string,
  words: StorefrontRouteWords,
  slugs: SlugsByEntity,
): PublicComponent {
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    subtitle: row.subtitle,
    body: row.body,
    span: row.span,
    display: row.display,
    // A banner's slides are resolved; every other kind's items are what the shopkeeper wrote. The
    // ids never reach the wire: `PublicStore` is served to anyone who asks, and a uuid on it is a
    // row's identity handed to a stranger for nothing.
    items:
      row.kind === 'BANNER'
        ? (itemsOf(row.kind, row.items) as BannerSlide[]).map((slide) =>
            toPublicSlide(slide, shopSlug, words, slugs),
          )
        : row.kind === 'ANNOUNCEMENT'
          ? (itemsOf(row.kind, row.items) as AnnouncementLink[]).map((link) => {
              const href = hrefOf(link, shopSlug, words, slugs);
              return { id: link.id, href, external: link.target === 'EXTERNAL' && !!href } satisfies PublicAnnouncementLink;
            })
          : (itemsOf(row.kind, row.items) as PublicComponentItem[]),
    columns: row.columns,
    align: row.align,
  } satisfies PublicComponent;
}

/**
 * A band as a visitor is served it, with the hidden components already gone.
 *
 * Filtered here and not in the query, because the same rows answer the panel: the storefront's
 * read and the editor's read are one query with two mappers, which is what stops the two from
 * disagreeing about what a shop looks like.
 */
export function toPublicSection(
  row: SectionRow,
  shopSlug: string,
  words: StorefrontRouteWords,
  slugs: SlugsByEntity = NO_SLUGS,
): PublicSection {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    background: row.background,
    components: row.components
      .filter((component) => component.isActive)
      .map((component) => toPublicComponent(component, shopSlug, words, slugs)),
  } satisfies PublicSection;
}

export function toComponent(row: StoreComponentModel): StoreComponent {
  return {
    id: row.id,
    sectionId: row.sectionId,
    kind: row.kind,
    title: row.title,
    subtitle: row.subtitle,
    body: row.body,
    span: row.span,
    display: row.display,
    source: row.source,
    sourceCategoryId: row.sourceCategoryId,
    limit: row.limit,
    items: itemsOf(row.kind, row.items),
    columns: row.columns,
    align: row.align,
    position: row.position,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies StoreComponent;
}

export function toSection(row: SectionRow): Section {
  return {
    id: row.id,
    name: row.name,
    width: row.width,
    background: row.background,
    position: row.position,
    isActive: row.isActive,
    components: row.components.map(toComponent),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  } satisfies Section;
}

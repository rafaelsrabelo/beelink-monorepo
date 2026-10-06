// Nest
import { BadRequestException } from '@nestjs/common';

// Types
import type { ApplyTemplatePayload, PageKind, PaymentMethod, StoreType, TemplateId } from '@harness-monorepo/contracts';
import type { Prisma } from '../../generated/prisma/client.js';
import type { PageDocument } from './page-document.js';
import type { PageInScope } from './page-scope.js';
import type { PageTemplate, TemplateSubject } from './template-catalog.js';

// App
import { sectionInclude } from './page.mapper.js';
import { arrangedDocument } from './page-template-arrange.js';
import { pageError } from './page.rules.js';
import { shopSubject, TEMPLATE_IDS, templateOf } from './template-catalog.js';

/*
  A model chosen for a page: whether it may be, and what it is filled from. One place for the three
  that ask — creating a landing, applying a model to a draft, previewing one — so a model refused by
  one is refused by all, with the same code.
*/

/** What the shopkeeper named for the model: the page's title, and the product or category it is built around. */
export interface TemplateChoice {
  title: string;
  productId?: string | null;
  categoryId?: string | null;
}

/**
 * A model's id read from an address, where no DTO has checked it. One that names no model is refused
 * as a body's is: not available, by the same code.
 */
export function templateIdOf(value: string): TemplateId {
  const id = TEMPLATE_IDS.find((known) => known === value);
  if (!id) throw new BadRequestException(pageError('PAGE_TEMPLATE_UNAVAILABLE', 'Esse modelo não existe.'));
  return id;
}

/** A model is arranged only on the kind of page, in the kind of store, its catalogue entry names. */
export function refuseUnavailable(template: PageTemplate, pageKind: PageKind, storeType: StoreType): void {
  if (!template.storeTypes.includes(storeType)) {
    const message = storeType === 'INSTITUTIONAL' ? 'Este modelo é de loja; um site começa em branco.' : 'Este modelo é de site, não de loja.';
    throw new BadRequestException(pageError('PAGE_TEMPLATE_UNAVAILABLE', message));
  }

  if (!template.pageKinds.includes(pageKind)) {
    const message = pageKind === 'HOME' ? 'Este modelo é de landing, não da página inicial.' : 'Este modelo é da página inicial, não de uma landing.';
    throw new BadRequestException(pageError('PAGE_TEMPLATE_UNAVAILABLE', message));
  }
}

/**
 * What the template fills its bands from. The product and the category are this shop's or they are
 * refused as not there — the same answer a foreign product gets from a showcase. What a model does
 * not ask for (`needs`) is not read, whatever was sent.
 */
export async function subjectOf(
  db: Prisma.TransactionClient,
  storeId: string,
  template: PageTemplate,
  choice: TemplateChoice,
  paymentMethods: readonly PaymentMethod[],
): Promise<TemplateSubject> {
  // Now, and not a clock the caller hands in: a sale's end is the moment the page is made plus three days.
  const subject = shopSubject(choice.title, paymentMethods, new Date());

  if (template.needs.includes('PRODUCT')) {
    if (!choice.productId) throw new BadRequestException(pageError('PAGE_PRODUCT_REQUIRED', 'Escolha o produto da página.'));

    const product = await db.product.findFirst({
      where: { id: choice.productId, storeId },
      select: {
        id: true,
        name: true,
        description: true,
        images: { orderBy: [{ position: 'asc' }, { id: 'asc' }], take: 1, select: { url: true } },
        category: { select: { id: true, name: true, description: true, imageUrl: true, isActive: true } },
      },
    });
    if (!product) throw new BadRequestException(pageError('PAGE_PRODUCT_INVALID', 'Esse produto não é desta loja.'));

    const { category } = product;
    subject.product = { id: product.id, name: product.name, description: product.description, imageUrl: product.images[0]?.url ?? null };
    // A hidden category is not a collection anybody can browse: the page is built around the product instead.
    subject.category = category?.isActive
      ? { id: category.id, name: category.name, description: category.description, imageUrl: category.imageUrl }
      : null;
  }

  if (template.needs.includes('CATEGORY')) {
    if (!choice.categoryId) throw new BadRequestException(pageError('PAGE_CATEGORY_REQUIRED', 'Escolha a categoria da página.'));

    // The one named wins over the product's own: it is what the shopkeeper said the page is about.
    const category = await db.productCategory.findFirst({
      where: { id: choice.categoryId, storeId, isActive: true },
      select: { id: true, name: true, description: true, imageUrl: true },
    });
    if (!category) throw new BadRequestException(pageError('PAGE_CATEGORY_INVALID', 'Essa categoria não é desta loja.'));

    subject.category = category;
  }

  return subject;
}

/**
 * The draft a model would leave on a page, as one document, with nothing written: refused where the
 * model does not apply, filled from the shop, and arranged around what the page keeps.
 *
 * Applying restores this document into the draft; the preview resolves it as the shop would be served.
 * Under a transaction the caller has locked, every read here is of rows no other write is changing.
 */
export async function templateDocument(
  db: Prisma.TransactionClient,
  scope: { storeId: string; page: PageInScope },
  choice: ApplyTemplatePayload,
): Promise<PageDocument> {
  const { storeId, page } = scope;
  const [store, { title }, draft] = await Promise.all([
    db.store.findUniqueOrThrow({ where: { id: storeId }, select: { type: true, paymentMethods: true } }),
    db.storePage.findUniqueOrThrow({ where: { id: page.id }, select: { title: true } }),
    db.storeSection.findMany({ where: { pageId: page.id }, include: sectionInclude, orderBy: [{ position: 'asc' }, { id: 'asc' }] }),
  ]);

  const template = templateOf(choice.template);
  refuseUnavailable(template, page.kind, store.type);
  const subject = await subjectOf(db, storeId, template, { title, productId: choice.productId, categoryId: choice.categoryId }, store.paymentMethods);

  return arrangedDocument(template.bands(subject), { pageKind: page.kind, storeType: store.type, draft });
}

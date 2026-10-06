// Types
import type { Prisma } from '../../generated/prisma/client.js';
import type { PageTemplate } from './template-catalog.js';

// App
import { refuseUnavailable, subjectOf } from './page-template-choice.js';
import { templateOf } from './template-catalog.js';

const STORE = '0199a0f1-0000-7000-8000-000000000001';
const PRODUCT = '0199e000-0000-7000-8000-000000000001';
const CATEGORY = '0199d000-0000-7000-8000-000000000001';

const OWN_CATEGORY = { id: 'cat-of-product', name: 'Proteínas', description: null, imageUrl: null, isActive: true };

function db(found: { product?: Record<string, unknown> | null; category?: Record<string, unknown> | null } = {}) {
  const fake = {
    product: {
      findFirst: vi.fn().mockResolvedValue(
        found.product === undefined
          ? { id: PRODUCT, name: 'Whey', description: 'Isolada', images: [{ url: 'https://cdn.example/whey.png' }], category: OWN_CATEGORY }
          : found.product,
      ),
    },
    productCategory: {
      findFirst: vi.fn().mockResolvedValue(
        found.category === undefined ? { id: CATEGORY, name: 'Ofertas', description: 'Da semana', imageUrl: null } : found.category,
      ),
    },
  };

  return { fake, client: fake as unknown as Prisma.TransactionClient };
}

/** A model that asks for what none of the catalogue's does yet. */
function needing(...needs: PageTemplate['needs']): PageTemplate {
  return { ...templateOf('em-branco'), needs };
}

const refusal = (errorCode: string) => ({ response: expect.objectContaining({ errorCode }) });

describe('whether a model may be arranged on a page', () => {
  it('accepts a model on the kind of page and store its entry names', () => {
    expect(() => refuseUnavailable(templateOf('lancamento'), 'LANDING', 'ECOMMERCE')).not.toThrow();
    expect(() => refuseUnavailable(templateOf('servicos-b2b'), 'HOME', 'INSTITUTIONAL')).not.toThrow();
    expect(() => refuseUnavailable(templateOf('em-branco'), 'LANDING', 'INSTITUTIONAL')).not.toThrow();
  });

  it.each([
    ['a shop’s model on a site', 'lancamento', 'LANDING', 'INSTITUTIONAL'],
    ['a site’s model on a shop', 'servicos-b2b', 'HOME', 'ECOMMERCE'],
    ['a landing’s model on the home', 'lancamento', 'HOME', 'ECOMMERCE'],
    ['a home’s model on a landing', 'servicos-b2b', 'LANDING', 'INSTITUTIONAL'],
  ] as const)('refuses %s', (_name, id, pageKind, storeType) => {
    expect(() => refuseUnavailable(templateOf(id), pageKind, storeType)).toThrow(expect.objectContaining(refusal('PAGE_TEMPLATE_UNAVAILABLE')));
  });
});

describe('what a model is filled from', () => {
  it('reads nothing for a model that asks for nothing, whatever was sent', async () => {
    const { fake, client } = db();

    const subject = await subjectOf(client, STORE, templateOf('em-branco'), { title: 'Campanha', productId: PRODUCT, categoryId: CATEGORY }, ['PIX']);

    expect(subject).toMatchObject({ title: 'Campanha', product: null, category: null });
    expect(subject.promises).toHaveLength(1);
    expect(fake.product.findFirst).not.toHaveBeenCalled();
    expect(fake.productCategory.findFirst).not.toHaveBeenCalled();
  });

  it('reads the shop’s product, its first picture and its category', async () => {
    const { fake, client } = db();

    const subject = await subjectOf(client, STORE, templateOf('colecao'), { title: 'Coleção', productId: PRODUCT }, []);

    expect(fake.product.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: PRODUCT, storeId: STORE } }));
    expect(subject.product).toEqual({ id: PRODUCT, name: 'Whey', description: 'Isolada', imageUrl: 'https://cdn.example/whey.png' });
    expect(subject.category).toEqual({ id: 'cat-of-product', name: 'Proteínas', description: null, imageUrl: null });
  });

  it('degrades to no picture and no category: a product with neither, or whose category is hidden', async () => {
    const bare = { id: PRODUCT, name: 'Whey', description: null, images: [], category: null };

    expect(await subjectOf(db({ product: bare }).client, STORE, templateOf('colecao'), { title: '', productId: PRODUCT }, [])).toMatchObject({
      product: { imageUrl: null },
      category: null,
    });
    expect(
      (await subjectOf(db({ product: { ...bare, category: { ...OWN_CATEGORY, isActive: false } } }).client, STORE, templateOf('colecao'), { title: '', productId: PRODUCT }, []))
        .category,
    ).toBeNull();
  });

  it('refuses a product model with no product, and a product that is not this shop’s', async () => {
    await expect(subjectOf(db().client, STORE, templateOf('lancamento'), { title: '' }, [])).rejects.toMatchObject(refusal('PAGE_PRODUCT_REQUIRED'));
    await expect(subjectOf(db({ product: null }).client, STORE, templateOf('lancamento'), { title: '', productId: PRODUCT }, [])).rejects.toMatchObject(
      refusal('PAGE_PRODUCT_INVALID'),
    );
  });

  it('reads the category a model asks for: this shop’s, and shown', async () => {
    const { fake, client } = db();

    const subject = await subjectOf(client, STORE, needing('CATEGORY'), { title: '', categoryId: CATEGORY }, []);

    expect(fake.productCategory.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: CATEGORY, storeId: STORE, isActive: true } }));
    expect(subject).toMatchObject({ product: null, category: { id: CATEGORY, name: 'Ofertas' } });
  });

  it('puts the category named above the product’s own', async () => {
    const subject = await subjectOf(db().client, STORE, needing('PRODUCT', 'CATEGORY'), { title: '', productId: PRODUCT, categoryId: CATEGORY }, []);

    expect(subject.product?.id).toBe(PRODUCT);
    expect(subject.category?.id).toBe(CATEGORY);
  });

  it('refuses a category model with no category, and a category that is not this shop’s to show', async () => {
    await expect(subjectOf(db().client, STORE, needing('CATEGORY'), { title: '' }, [])).rejects.toMatchObject(refusal('PAGE_CATEGORY_REQUIRED'));
    await expect(subjectOf(db({ category: null }).client, STORE, needing('CATEGORY'), { title: '', categoryId: CATEGORY }, [])).rejects.toMatchObject(
      refusal('PAGE_CATEGORY_INVALID'),
    );
  });
});

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// Types
import type {
  ApiErrorBody,
  AuthSession,
  ProductCategory,
  ProductDetail,
  ProductImportExtraction,
  ProductImportResult,
} from '@harness-monorepo/contracts';
import type { ReadOutcome } from '../src/modules/catalog/product-import.reader.js';

// App
import { ProductImportReader } from '../src/modules/catalog/product-import.reader.js';
import { PrismaService } from '../src/shared/prisma/prisma.service.js';
import { newEmail, signUpAndSignIn } from './support/auth-flow.js';
import { createTestApp } from './support/create-test-app.js';
import { clearInbox } from './support/mailpit.js';
import { resetDatabase } from './support/reset-database.js';

const shopBody = {
  name: 'Dindin da Leia',
  slug: 'dindin-da-leia',
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(85) 99999-8888' },
  address: { city: 'Fortaleza', state: 'ce', zipCode: '60000-000' },
};

const PDF = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n');

/** What a browser's FormData sends, built by hand: `app.inject` takes the bytes as they are. */
function multipart(bytes: Buffer, filename = 'cardapio.pdf', type = 'application/pdf') {
  const boundary = '----beelink-import-e2e';
  const head = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: ${type}\r\n\r\n`,
  );
  return {
    payload: Buffer.concat([head, bytes, Buffer.from(`\r\n--${boundary}--\r\n`)]),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}` },
  };
}

/** The reader stands in for Claude: these suites prove the API around it, never the model. */
const reader = {
  configured: vi.fn(() => true),
  read: vi.fn<(...args: unknown[]) => Promise<ReadOutcome>>(),
};

describe('product import', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;
  let owner: AuthSession;
  let stranger: AuthSession;

  beforeAll(async () => {
    app = await createTestApp((builder) => builder.overrideProvider(ProductImportReader).useValue(reader));
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    await clearInbox();
    reader.configured.mockReturnValue(true);
    reader.read.mockReset();
    owner = await signUpAndSignIn(app, newEmail('leia'));
    stranger = await signUpAndSignIn(app, newEmail('estranha'));
    await call('POST', '/api/stores', owner, shopBody);
  });

  function call(method: 'GET' | 'POST', url: string, session?: AuthSession, payload?: object) {
    return app.inject({
      method,
      url,
      headers: session ? { authorization: `Bearer ${session.accessToken}` } : {},
      ...(payload ? { payload } : {}),
    });
  }

  function extract(session: AuthSession, file = multipart(PDF)) {
    return app.inject({
      method: 'POST',
      url: '/api/stores/dindin-da-leia/products/import/extract',
      headers: { authorization: `Bearer ${session.accessToken}`, ...file.headers },
      payload: file.payload,
    });
  }

  describe('the read', () => {
    it('hands the file and the shop’s category names to the reader, and answers its drafts', async () => {
      await call('POST', '/api/stores/dindin-da-leia/product-categories', owner, { name: 'Picolés' });
      const drafts = [{ name: 'Dindin de coco', description: null, priceCents: 400, categoryName: 'Picolés', option: null }];
      reader.read.mockResolvedValue({ status: 'read', drafts });

      const response = await extract(owner);

      expect(response.statusCode).toBe(200);
      expect(response.json<ProductImportExtraction>()).toEqual({ drafts, takenSlugs: [] });
      expect(reader.read).toHaveBeenCalledWith(expect.objectContaining({ type: 'application/pdf' }), ['Picolés']);
      expect(await prisma.product.count()).toBe(0);
    });

    it('judges the file by its bytes: text named .pdf is refused before anything is read', async () => {
      const response = await extract(owner, multipart(Buffer.from('não sou um pdf')));

      expect(response.statusCode).toBe(415);
      expect(response.json<ApiErrorBody>().errorCode).toBe('UNSUPPORTED_MEDIA_TYPE');
      expect(reader.read).not.toHaveBeenCalled();
    });

    it('says so when no reader is configured, without reading the body', async () => {
      reader.configured.mockReturnValue(false);

      const response = await extract(owner);

      expect(response.statusCode).toBe(501);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_IMPORT_NOT_CONFIGURED');
    });

    it('tells a document with nothing to sell apart from a reader that did not answer', async () => {
      reader.read.mockResolvedValueOnce({ status: 'unreadable' }).mockResolvedValueOnce({ status: 'unavailable' });

      const unreadable = await extract(owner);
      const unavailable = await extract(owner);

      expect([unreadable.statusCode, unreadable.json<ApiErrorBody>().errorCode]).toEqual([422, 'PRODUCT_IMPORT_UNREADABLE']);
      expect([unavailable.statusCode, unavailable.json<ApiErrorBody>().errorCode]).toEqual([502, 'PRODUCT_IMPORT_UNAVAILABLE']);
    });

    it('reads nothing for somebody else’s shop', async () => {
      const response = await extract(stranger);

      expect(response.statusCode).toBe(403);
      expect(reader.read).not.toHaveBeenCalled();
    });
  });

  describe('the import', () => {
    function commit(session: AuthSession, products: object[]) {
      return call('POST', '/api/stores/dindin-da-leia/products/import', session, { products });
    }

    async function detail(productId: string): Promise<ProductDetail> {
      return (await call('GET', `/api/stores/dindin-da-leia/products/${productId}`, owner)).json<ProductDetail>();
    }

    it('creates products on sale, reuses a category by its name and makes a new one once, and prices each flavour', async () => {
      const picoles = (await call('POST', '/api/stores/dindin-da-leia/product-categories', owner, { name: 'Picolés' })).json<ProductCategory>();

      const response = await commit(owner, [
        { name: 'Picolé de uva', priceCents: 500, newCategoryName: 'PICOLES' },
        {
          name: 'Dindin gourmet',
          description: 'Feito com leite.',
          priceCents: 400,
          newCategoryName: 'Dindins',
          option: { name: 'Sabor', values: [{ name: 'Coco' }, { name: 'Nutella', priceCents: 650 }] },
        },
        { name: 'Dindin simples', priceCents: 300, newCategoryName: 'dindins' },
      ]);

      expect(response.statusCode).toBe(201);
      const result = response.json<ProductImportResult>();
      expect(result.categoriesCreated).toBe(1);
      expect(result.productIds).toHaveLength(3);

      const [uva, gourmet, simples] = await Promise.all(result.productIds.map(detail));
      expect([uva!.status, gourmet!.status, simples!.status]).toEqual(['ACTIVE', 'ACTIVE', 'ACTIVE']);
      expect(uva!.category?.id).toBe(picoles.id);
      expect(simples!.category?.id).toBe(gourmet!.category?.id);

      const [option] = gourmet!.options;
      expect(option?.values.map((value) => value.name)).toEqual(['Coco', 'Nutella']);
      const priceOf = (valueId: string) => gourmet!.variants.find((variant) => variant.optionValueIds.includes(valueId))?.priceCents;
      expect([priceOf(option!.values[0]!.id), priceOf(option!.values[1]!.id)]).toEqual([400, 650]);
      expect(gourmet!.priceCents).toBe(400);
    });

    it('tells the review which names the shop already has, and refuses one of them on import', async () => {
      await call('POST', '/api/stores/dindin-da-leia/products', owner, { name: 'Dindin de coco', priceCents: 400 });
      reader.read.mockResolvedValue({ status: 'read', drafts: [] });

      expect((await extract(owner)).json<ProductImportExtraction>().takenSlugs).toEqual(['dindin-de-coco']);

      const response = await commit(owner, [
        { name: 'Picolé de uva', priceCents: 500, newCategoryName: 'Picolés' },
        { name: 'Dindin de Coco', priceCents: 450 },
      ]);

      expect(response.statusCode).toBe(409);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_SLUG_TAKEN');
      expect([await prisma.product.count(), await prisma.productCategory.count()]).toEqual([1, 0]);
    });

    it('refuses two items of one import with the same name, before writing anything', async () => {
      const response = await commit(owner, [
        { name: 'Dindin de coco', priceCents: 400 },
        { name: 'DINDIN DE COCO', priceCents: 450 },
      ]);

      expect(response.statusCode).toBe(409);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_SLUG_TAKEN');
      expect(await prisma.product.count()).toBe(0);
    });

    it('creates nothing when one item is refused', async () => {
      const response = await commit(owner, [
        { name: 'Dindin de coco', priceCents: 400, newCategoryName: 'Dindins' },
        { name: 'Dindin duplo', priceCents: 400, option: { name: 'Sabor', values: [{ name: 'Coco' }, { name: 'coco' }] } },
      ]);

      expect(response.statusCode).toBe(400);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_OPTION_DUPLICATE');
      expect([await prisma.product.count(), await prisma.productCategory.count()]).toEqual([0, 0]);
    });

    it('refuses a category of another shop', async () => {
      await call('POST', '/api/stores', stranger, { ...shopBody, name: 'Outra', slug: 'outra-loja' });
      const foreign = (await call('POST', '/api/stores/outra-loja/product-categories', stranger, { name: 'Alheia' })).json<ProductCategory>();

      const response = await commit(owner, [{ name: 'Dindin de coco', priceCents: 400, categoryId: foreign.id }]);

      expect(response.statusCode).toBe(404);
      expect(response.json<ApiErrorBody>().errorCode).toBe('PRODUCT_CATEGORY_NOT_FOUND');
    });

    it('refuses a stranger, and writes nothing', async () => {
      const response = await commit(stranger, [{ name: 'Invasor', priceCents: 100 }]);

      expect(response.statusCode).toBe(403);
      expect(await prisma.product.count()).toBe(0);
    });
  });
});

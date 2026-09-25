// Node
import { randomUUID } from 'node:crypto';

// Nest
import type { NestFastifyApplication } from '@nestjs/platform-fastify';

// App
import { PrismaService } from '../../src/shared/prisma/prisma.service.js';
import { createTestApp } from '../support/create-test-app.js';
import { resetDatabase } from '../support/reset-database.js';

const PRODUCTS = 5_000;
const CALLS = 200;
const P95_BUDGET_MS = 300;

const WORDS = ['Blusa', 'Saia', 'Bolsa', 'Vestido', 'Camisa', 'Crochê', 'Tricô', 'Algodão', 'Linho', 'Seda'];
const SIZES = ['P', 'M', 'G'];
const COLOURS = ['Areia', 'Preto'];

/**
 * p95 of the storefront listing, with its facets, over a shelf of 5 000 products — 40% of them with
 * size and colour, some sold out, some on sale — under the filters a visitor actually combines.
 *
 * Written with `createMany` in batches rather than through the API: this measures the read, and a
 * setup that took ten minutes would be a measurement nobody runs.
 */
describe('the storefront listing at scale', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetDatabase(prisma);
    await seed(prisma);
  });

  afterAll(async () => {
    await app.close();
  });

  it(`answers ${CALLS} mixed listings with a p95 under ${P95_BUDGET_MS} ms`, async () => {
    const queries = [
      '',
      '?categoria=categoria-3',
      '?busca=croche',
      '?opcao=Tamanho:P',
      '?opcao=Tamanho:M&opcao=Cor:Areia',
      '?desconto=1&ordenar=menor-preco',
      '?precoMin=50&precoMax=200',
      '?categoria=categoria-7&opcao=Cor:Preto&ordenar=maior-preco&pagina=3',
      `?busca=${encodeURIComponent('algodão')}&opcao=Tamanho:G`,
      '?ordenar=novidades&pagina=10',
    ];

    // Warm the connection pool and the plan cache, as a running server would be.
    for (const query of queries) await app.inject({ method: 'GET', url: `/api/stores/perf/catalog${query}` });

    const times: number[] = [];
    for (let call = 0; call < CALLS; call++) {
      const query = queries[call % queries.length]!;
      const started = performance.now();
      const response = await app.inject({ method: 'GET', url: `/api/stores/perf/catalog${query}` });
      times.push(performance.now() - started);
      expect(response.statusCode).toBe(200);
    }

    times.sort((a, b) => a - b);
    const p95 = times[Math.ceil(times.length * 0.95) - 1]!;
    const p50 = times[Math.ceil(times.length * 0.5) - 1]!;
    process.stdout.write(`\ncatalog listing over ${PRODUCTS} products: p50 ${p50.toFixed(1)} ms, p95 ${p95.toFixed(1)} ms\n`);

    expect(p95).toBeLessThan(P95_BUDGET_MS);
  });
});

async function seed(prisma: PrismaService): Promise<void> {
  const owner = await prisma.user.create({ data: { email: 'perf@teste.dev', passwordHash: 'x', name: 'Perf' } });
  const store = await prisma.store.create({ data: { ownerId: owner.id, slug: 'perf', name: 'Perf' } });

  const categories = Array.from({ length: 10 }, (_, index) => ({
    id: randomUUID(),
    storeId: store.id,
    slug: `categoria-${index}`,
    name: `Categoria ${index}`,
    position: index,
  }));
  await prisma.productCategory.createMany({ data: categories });

  for (let from = 0; from < PRODUCTS; from += 1_000) {
    const products = [];
    const variants = [];
    const options = [];
    const values = [];
    const links = [];

    for (let index = from; index < from + 1_000; index++) {
      const id = randomUUID();
      const priceCents = 2_000 + ((index * 7_919) % 48_000);
      const onSale = index % 5 === 0;
      const counted = index % 2 === 0;
      const name = `${WORDS[index % WORDS.length]} ${WORDS[(index * 3) % WORDS.length]} ${index}`;
      products.push({
        id,
        storeId: store.id,
        categoryId: categories[index % categories.length]!.id,
        slug: `produto-${index}`,
        name,
        description: `${WORDS[(index * 7) % WORDS.length]} feito à mão`,
        priceCents,
        maxPriceCents: priceCents,
        compareAtPriceCents: onSale ? priceCents + 1_000 : null,
        trackStock: counted,
        stockQuantity: counted ? index % 11 : null,
        position: index,
        slugHistory: [],
      });

      if (index % 5 < 2) {
        const size = { id: randomUUID(), productId: id, name: 'Tamanho', position: 0 };
        const colour = { id: randomUUID(), productId: id, name: 'Cor', position: 1 };
        options.push(size, colour);
        const sizeValues = SIZES.map((value, position) => ({ id: randomUUID(), optionId: size.id, name: value, position }));
        const colourValues = COLOURS.map((value, position) => ({ id: randomUUID(), optionId: colour.id, name: value, position }));
        values.push(...sizeValues, ...colourValues);

        let position = 0;
        for (const sizeValue of sizeValues) {
          for (const colourValue of colourValues) {
            const variantId = randomUUID();
            variants.push({
              id: variantId,
              productId: id,
              storeId: store.id,
              position: position++,
              priceCents,
              trackStock: counted,
              stockQuantity: counted ? (index + position) % 4 : null,
            });
            links.push(
              { variantId, optionId: size.id, valueId: sizeValue.id },
              { variantId, optionId: colour.id, valueId: colourValue.id },
            );
          }
        }
      } else {
        variants.push({
          id: randomUUID(),
          productId: id,
          storeId: store.id,
          position: 0,
          priceCents,
          trackStock: counted,
          stockQuantity: counted ? index % 11 : null,
        });
      }
    }

    await prisma.product.createMany({ data: products });
    await prisma.productOption.createMany({ data: options });
    await prisma.productOptionValue.createMany({ data: values });
    await prisma.productVariant.createMany({ data: variants });
    await prisma.productVariantValue.createMany({ data: links });
  }

  // The planner needs to know the tables grew from nothing to thousands of rows.
  await prisma.$executeRawUnsafe('ANALYZE');
}

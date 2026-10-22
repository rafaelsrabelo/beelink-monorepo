// Nest
import { BadRequestException } from '@nestjs/common';

// App
import { ApiValidationPipe } from '../../../shared/http/api-validation.pipe.js';
import { ChangeStoreSlugDto, StoreSlugAvailabilityQueryDto } from './store-slug.dto.js';

/** The global pipe, as src/app.setup.ts builds it: what a refused field answers is part of what is tested. */
const pipe = new ApiValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { exposeUnsetFields: false } });

const change = (body: object) => pipe.transform(body, { type: 'body', metatype: ChangeStoreSlugDto }) as Promise<ChangeStoreSlugDto>;
const ask = (query: object) => pipe.transform(query, { type: 'query', metatype: StoreSlugAvailabilityQueryDto }) as Promise<StoreSlugAvailabilityQueryDto>;

describe('ChangeStoreSlugDto (BEELINK-331)', () => {
  it('normalises the new address exactly as the creation does', async () => {
    expect((await change({ slug: '  Padaria  da Esquina!! ' })).slug).toBe('padaria-da-esquina');
    expect((await change({ slug: 'Cantina do Zé' })).slug).toBe('cantina-do-ze');
  });

  it('refuses what is no address once normalised, as STORE_SLUG_INVALID', async () => {
    for (const slug of ['Zé', '!!!', 'a'.repeat(41), 42]) {
      const refused = await change({ slug }).catch((error: BadRequestException) => error.getResponse());
      expect(refused).toMatchObject({ errorCode: 'STORE_SLUG_INVALID' });
    }
  });

  it('refuses a field nobody declared', async () => {
    await expect(change({ slug: 'padaria', name: 'outra' })).rejects.toThrow(BadRequestException);
  });
});

describe('StoreSlugAvailabilityQueryDto', () => {
  it('normalises what is typed and leaves whether it is an address to the answer', async () => {
    expect((await ask({ slug: 'Zé' })).slug).toBe('ze');
    expect((await ask({ slug: 'Padaria da Esquina' })).slug).toBe('padaria-da-esquina');
  });
});

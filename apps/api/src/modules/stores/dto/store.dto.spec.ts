// Nest
import { BadRequestException, ValidationPipe } from '@nestjs/common';

// App
import { CreateStoreDto, UpdateStoreDto } from './store.dto.js';

/**
 * Mirrors the global pipe in src/app.setup.ts — deliberately not `enableImplicitConversion`, which
 * coerces after a `@Transform` runs. The e2e proves the real pipeline; this proves the normalisations
 * without a database, because they are where the legacy's two spellings of a CEP came from.
 */
const pipe = new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  transform: true,
  transformOptions: { exposeUnsetFields: false },
});

const createBody = {
  name: '  Padaria do Bairro  ',
  slug: 'Padaria  Do Bairro!!',
  type: 'ECOMMERCE',
  socialNetworks: { whatsapp: '(11) 99999-8888', instagram: '@minhaloja' },
  address: { city: 'São Paulo', state: 'sp', zipCode: '01310-930' },
};

const updateBody = {
  name: 'Padaria do Bairro',
  type: 'ECOMMERCE',
  layoutType: 'DEFAULT',
  showProductsByCategory: false,
  colors: { background: '#FFFFFF', primary: '#3B7AF7', header: '#3B7AF7', footer: '#3B7AF7' },
  socialNetworks: { whatsapp: '5511999998888' },
  paymentMethods: ['PIX'],
};

function create(body: object): Promise<CreateStoreDto> {
  return pipe.transform(body, { type: 'body', metatype: CreateStoreDto }) as Promise<CreateStoreDto>;
}

function update(body: object): Promise<UpdateStoreDto> {
  return pipe.transform(body, { type: 'body', metatype: UpdateStoreDto }) as Promise<UpdateStoreDto>;
}

describe('CreateStoreDto', () => {
  it('normalises a slug the way the legacy generateSlug() did, plus the hyphens it left behind', async () => {
    expect((await create(createBody)).slug).toBe('padaria-do-bairro');
    expect((await create({ ...createBody, slug: 'Café da Manhã' })).slug).toBe('cafe-da-manha');
  });

  it('refuses a slug that normalises to fewer than three characters', async () => {
    await expect(create({ ...createBody, slug: 'ab' })).rejects.toThrow(BadRequestException);
  });

  it('stores one spelling of a phone number, with the country code the wa.me link needs', async () => {
    expect((await create(createBody)).socialNetworks.whatsapp).toBe('5511999998888');
    expect((await create({ ...createBody, socialNetworks: { whatsapp: '+55 (11) 99999-8888' } })).socialNetworks.whatsapp).toBe(
      '5511999998888',
    );
  });

  it('stores one spelling of a CEP and one of a UF — the legacy stored two of each', async () => {
    const dto = await create(createBody);

    expect(dto.address?.zipCode).toBe('01310930');
    expect(dto.address?.state).toBe('SP');
  });

  it('drops the `@` a person types in front of a handle', async () => {
    expect((await create(createBody)).socialNetworks.instagram).toBe('minhaloja');
  });

  it('refuses a shop with no WhatsApp at all', async () => {
    await expect(create({ ...createBody, socialNetworks: {} })).rejects.toThrow(BadRequestException);
  });

  it('refuses a logo that is not an http(s) URL — the storefront renders it in `src`', async () => {
    await expect(create({ ...createBody, logoUrl: 'javascript:alert(1)' })).rejects.toThrow(BadRequestException);
  });

  it('refuses a field nobody declared', async () => {
    await expect(create({ ...createBody, printSettings: {} })).rejects.toThrow(BadRequestException);
  });
});

describe('UpdateStoreDto', () => {
  it('refuses the slug, which is immutable, and the coordinates, which are the API’s to compute', async () => {
    await expect(update({ ...updateBody, slug: 'outra' })).rejects.toThrow(BadRequestException);
    await expect(update({ ...updateBody, latitude: -23.5 })).rejects.toThrow(BadRequestException);
    await expect(update({ ...updateBody, longitude: -46.6 })).rejects.toThrow(BadRequestException);
  });

  it('refuses a checkout with no payment method, and a method that is not one of the four', async () => {
    await expect(update({ ...updateBody, paymentMethods: [] })).rejects.toThrow(BadRequestException);
    await expect(update({ ...updateBody, paymentMethods: ['BOLETO'] })).rejects.toThrow(BadRequestException);
  });

  it('refuses a colour that is not #RRGGBB', async () => {
    await expect(update({ ...updateBody, colors: { ...updateBody.colors, primary: 'blue' } })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('accepts every layout key the contract declares and refuses one it does not', async () => {
    const accepted = await update({
      ...updateBody,
      layoutSettings: { showBanner: true, bannerType: 'carousel', productsPerRow: 2, cartPosition: 'bottom-left' },
    });

    expect(accepted.layoutSettings).toMatchObject({ bannerType: 'carousel' });
    await expect(update({ ...updateBody, layoutSettings: { showWhatever: true } })).rejects.toThrow(BadRequestException);
    await expect(update({ ...updateBody, layoutSettings: { productsPerRow: 5 } })).rejects.toThrow(BadRequestException);
  });

  it('turns a blank string into the null the column means', async () => {
    const dto = await update({ ...updateBody, description: '   ' });

    expect(dto.description).toBeNull();
  });
});

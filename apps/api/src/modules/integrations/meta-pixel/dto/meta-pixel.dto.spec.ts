// Nest
import { BadRequestException, ValidationPipe } from '@nestjs/common';

// App
import { META_PIXEL_ID, MetaPixelConnectDto } from './meta-pixel.dto.js';

/** Mirrors the global pipe in src/app.setup.ts; the e2e proves the real pipeline and its error code. */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { exposeUnsetFields: false } });

const parse = (body: object) => pipe.transform(body, { type: 'body', metatype: MetaPixelConnectDto }) as Promise<MetaPixelConnectDto>;

describe('MetaPixelConnectDto', () => {
  it('takes an ID of digits, of the lengths Meta hands out and around them', async () => {
    for (const pixelId of ['1234567890', '123456789012345', '1234567890123456', '12345678901234567890']) {
      expect((await parse({ pixelId })).pixelId).toBe(pixelId);
    }
  });

  it('drops the spaces and the line break copied around an ID, and nothing else', async () => {
    expect((await parse({ pixelId: '  1234567890123456\n' })).pixelId).toBe('1234567890123456');
  });

  /** Shops share one domain: what is saved here is served on every page of the shop, so only digits get through. */
  it('refuses everything that is not 10 to 20 digits — a script above all', async () => {
    const refused = [
      '',
      '123456789',
      '123456789012345678901',
      '1234 5678 9012 3456',
      '1234-5678-9012-3456',
      '12345678901234a',
      '1234567890123456\n<script>alert(1)</script>',
      "1234567890');fbq('init','999",
      '<script src="https://evil.test/x.js"></script>',
      // Digits of another script, and a full-width one: `[0-9]` is ASCII alone.
      '١٢٣٤٥٦٧٨٩٠١٢٣٤٥',
      '１２３４５６７８９０１２３４５',
      '1234567890123456​',
    ];
    for (const pixelId of refused) await expect(parse({ pixelId }), JSON.stringify(pixelId)).rejects.toBeInstanceOf(BadRequestException);
    for (const body of [{}, { pixelId: 1234567890123456 }, { pixelId: null }, { pixelId: ['1234567890123456'] }]) {
      await expect(parse(body), JSON.stringify(body)).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('refuses anything sent beside the ID: a script has no field to ride in', async () => {
    await expect(parse({ pixelId: '1234567890123456', script: '<script></script>' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps one bound for the pipe and for the column, anchored at both ends', () => {
    expect(META_PIXEL_ID.source).toBe('^[0-9]{10,20}$');
    expect(META_PIXEL_ID.flags).toBe('');
  });
});

// Nest
import { BadRequestException, ValidationPipe } from '@nestjs/common';

// App
import { GOOGLE_ANALYTICS_ID, GOOGLE_ANALYTICS_ID_REFUSAL, GoogleAnalyticsConnectDto } from './google-analytics.dto.js';

/** Mirrors the global pipe in src/app.setup.ts; the e2e proves the real pipeline and its error code. */
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, transformOptions: { exposeUnsetFields: false } });

const parse = (body: object) => pipe.transform(body, { type: 'body', metatype: GoogleAnalyticsConnectDto }) as Promise<GoogleAnalyticsConnectDto>;

describe('GoogleAnalyticsConnectDto', () => {
  it('takes G- and capitals or digits, of the length Google hands out and around it', async () => {
    for (const measurementId of ['G-AB12CD34EF', 'G-0123456789', 'G-ABCDEFGHIJ', 'G-ABC123', 'G-ABCDEFGH12345678']) {
      expect((await parse({ measurementId })).measurementId).toBe(measurementId);
    }
  });

  it('drops the spaces and the line break copied around an ID, and nothing else', async () => {
    expect((await parse({ measurementId: '  G-AB12CD34EF\n' })).measurementId).toBe('G-AB12CD34EF');
  });

  it('refuses the IDs of what is not a GA4 property, and says which they are', async () => {
    for (const measurementId of ['UA-12345678-1', 'GTM-AB12CD3', 'AW-1234567890', 'DC-1234567']) {
      const refusal = await parse({ measurementId }).catch((error: unknown) => error);
      expect(refusal, measurementId).toBeInstanceOf(BadRequestException);
      expect((refusal as BadRequestException).getResponse(), measurementId).toMatchObject({ message: [GOOGLE_ANALYTICS_ID_REFUSAL] });
    }
    for (const named of ['G-XXXXXXXXXX', 'UA-', 'GTM-', 'AW-']) expect(GOOGLE_ANALYTICS_ID_REFUSAL).toContain(named);
  });

  /** Shops share one domain: what is saved here is served on every page of the shop, so only an ID gets through. */
  it('refuses everything else that is not G- and 6 to 16 capitals or digits — a script above all', async () => {
    const refused = [
      '',
      'G-',
      'G-ABC12',
      'G-ABCDEFGH123456789',
      'AB12CD34EF',
      'g-AB12CD34EF',
      'G-ab12cd34ef',
      'G AB12CD34EF',
      'G-AB12 CD34EF',
      'G-AB12-CD34EF',
      'G_AB12CD34EF',
      'G-AB12CD34EF\n<script>alert(1)</script>',
      "G-AB12CD34EF');gtag('config','G-ZZ99ZZ99ZZ",
      '<script async src="https://www.googletagmanager.com/gtag/js?id=G-AB12CD34EF"></script>',
      'https://www.googletagmanager.com/gtag/js?id=G-AB12CD34EF',
      // Letters and digits of other scripts, and a zero-width space: the classes are ASCII alone.
      'G-ＡＢ１２ＣＤ３４ＥＦ',
      'G-АВ12СD34ЕF',
      'G-AB12CD34EF​',
    ];
    for (const measurementId of refused) await expect(parse({ measurementId }), JSON.stringify(measurementId)).rejects.toBeInstanceOf(BadRequestException);
    for (const body of [{}, { measurementId: 1234567890 }, { measurementId: null }, { measurementId: ['G-AB12CD34EF'] }]) {
      await expect(parse(body), JSON.stringify(body)).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('refuses anything sent beside the ID: a script has no field to ride in', async () => {
    await expect(parse({ measurementId: 'G-AB12CD34EF', script: '<script></script>' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(parse({ measurementId: 'G-AB12CD34EF', pixelId: '1234567890123456' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('keeps one bound for the pipe and for the column, anchored at both ends', () => {
    expect(GOOGLE_ANALYTICS_ID.source).toBe('^G-[A-Z0-9]{6,16}$');
    expect(GOOGLE_ANALYTICS_ID.flags).toBe('');
  });
});

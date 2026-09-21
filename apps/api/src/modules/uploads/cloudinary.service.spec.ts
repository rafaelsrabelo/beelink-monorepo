// Libs
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Nest
import { Logger } from '@nestjs/common';

// App
import type { CloudinaryConfig } from './cloudinary.service.js';
import { CloudinaryService, toCloudinaryConfig } from './cloudinary.service.js';
import { ACCEPTED_TYPES, MAX_UPLOAD_BYTES } from './uploads.constants.js';

const config: CloudinaryConfig = {
  cloudName: 'bee-link-dev',
  apiKey: '123456789',
  apiSecret: 'um-segredo-de-teste',
  folder: 'bee-link',
};

const complete = {
  CLOUDINARY_CLOUD_NAME: 'bee-link-dev',
  CLOUDINARY_API_KEY: '123456789',
  CLOUDINARY_API_SECRET: 'um-segredo-de-teste',
  CLOUDINARY_FOLDER: 'bee-link',
};

function imageOf(type = 'image/png', bytes = 1024) {
  return { bytes: Buffer.alloc(bytes), type, filename: 'logo.png' };
}

/** Answers like Cloudinary and keeps the body, so what was signed and sent can be inspected. */
function stubCloudinary(response: Response) {
  const fetch = vi.fn(async () => response);
  vi.stubGlobal('fetch', fetch);
  return {
    body: () => (fetch.mock.calls[0] as unknown as [string, { body: FormData }])[1].body,
    url: () => (fetch.mock.calls[0] as unknown as [string])[0],
    calls: () => fetch.mock.calls.length,
  };
}

const service = new CloudinaryService();

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('toCloudinaryConfig', () => {
  it('reads a complete configuration', () => {
    expect(toCloudinaryConfig(complete)).toEqual(config);
  });

  // Half a configuration is worse than none: the panel would look switched on and fail at the
  // first file, with a 502 blaming a service nobody configured.
  it.each(['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const)(
    'treats a configuration missing %s as no configuration at all',
    (missing) => {
      const partial = { ...complete };
      delete partial[missing];

      expect(toCloudinaryConfig(partial)).toBeNull();
    },
  );
});

describe('CloudinaryService.upload', () => {
  it("answers the stored file's https address", async () => {
    stubCloudinary(Response.json({ secure_url: 'https://res.cloudinary.com/bee-link-dev/logo.png' }));

    expect(await service.upload(imageOf(), config)).toEqual({
      status: 'uploaded',
      url: 'https://res.cloudinary.com/bee-link-dev/logo.png',
    });
  });

  it('posts to the configured cloud, signed, and never sends the secret', async () => {
    const cloudinary = stubCloudinary(Response.json({ secure_url: 'https://res.cloudinary.com/x.png' }));

    await service.upload(imageOf(), config);
    const body = cloudinary.body();

    expect(cloudinary.url()).toBe('https://api.cloudinary.com/v1_1/bee-link-dev/image/upload');
    expect(body.get('api_key')).toBe('123456789');
    expect(body.get('folder')).toBe('bee-link');
    // The secret signs the request; it is never part of it. An upload carrying it would hand a
    // write credential to anyone who could read the request.
    expect([...body.keys()]).not.toContain('api_secret');
    expect(JSON.stringify([...body.entries()])).not.toContain(config.apiSecret);
  });

  /**
   * Pins the string that gets signed, which is the half of this that cannot be checked locally.
   * Cloudinary echoes it back on a refusal — "String to sign - 'folder=…&timestamp=…'" — and this
   * is that exact shape: the signed params, sorted, joined with `&`, secret appended, no `file`
   * and no `api_key`. Get it wrong and every upload is a 401 that blames the signature.
   */
  it('signs the parameters in the shape Cloudinary verifies', async () => {
    const cloudinary = stubCloudinary(Response.json({ secure_url: 'https://res.cloudinary.com/x.png' }));

    await service.upload(imageOf(), config);
    const body = cloudinary.body();
    const timestamp = String(body.get('timestamp'));

    expect(body.get('signature')).toBe(
      createHash('sha1')
        .update(`folder=${config.folder}&timestamp=${timestamp}` + config.apiSecret, 'utf8')
        .digest('hex'),
    );
  });

  it('prefers secure_url — the plain url is http and the panel is served over https', async () => {
    stubCloudinary(
      Response.json({
        url: 'http://res.cloudinary.com/bee-link-dev/logo.png',
        secure_url: 'https://res.cloudinary.com/bee-link-dev/logo.png',
      }),
    );

    expect(await service.upload(imageOf(), config)).toMatchObject({
      url: expect.stringMatching(/^https:/) as unknown as string,
    });
  });

  // A 200 carrying no address is not a success: answering "uploaded" with "" writes an empty
  // logoUrl and loses the shop's picture with no error anywhere.
  it('refuses an answer that carries no address, however successful it looked', async () => {
    stubCloudinary(Response.json({ public_id: 'logo' }));

    expect(await service.upload(imageOf(), config)).toEqual({ status: 'unavailable' });
  });

  it('refuses a format outside the accepted list without calling out', async () => {
    const cloudinary = stubCloudinary(Response.json({ secure_url: 'https://res.cloudinary.com/x.png' }));

    expect(await service.upload(imageOf('image/gif'), config)).toEqual({ status: 'unsupported' });
    expect(cloudinary.calls()).toBe(0);
  });

  it.each(ACCEPTED_TYPES)('accepts %s', async (type) => {
    stubCloudinary(Response.json({ secure_url: 'https://res.cloudinary.com/x.png' }));

    expect(await service.upload(imageOf(type), config)).toMatchObject({ status: 'uploaded' });
  });

  it('refuses a file over the ceiling without calling out', async () => {
    const cloudinary = stubCloudinary(Response.json({ secure_url: 'https://res.cloudinary.com/x.png' }));

    expect(await service.upload(imageOf('image/png', MAX_UPLOAD_BYTES + 1), config)).toEqual({
      status: 'too-large',
    });
    expect(cloudinary.calls()).toBe(0);
  });

  it('reads a refusal from Cloudinary as unavailable, whatever it blamed', async () => {
    stubCloudinary(Response.json({ error: { message: 'Invalid signature' } }, { status: 401 }));

    expect(await service.upload(imageOf(), config)).toEqual({ status: 'unavailable' });
  });

  /**
   * The caller gets one outcome, and the operator gets the reason. Without this, a cloud name
   * typed into the wrong variable reaches someone as a bare 502 with nothing behind it — which is
   * exactly how this was found, by reproducing the call by hand because the log said nothing.
   */
  it("writes Cloudinary's own explanation to the log before dropping it", async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    stubCloudinary(Response.json({ error: { message: 'Invalid cloud_name xpto' } }, { status: 401 }));

    await service.upload(imageOf(), config);

    expect(error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 401, cloudinary: 'Invalid cloud_name xpto' }),
      'Cloudinary refused an upload',
    );
    error.mockRestore();
  });

  it('logs a 200 that carried no address, which is the silent failure of the two', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    stubCloudinary(Response.json({ public_id: 'logo' }));

    await service.upload(imageOf(), config);

    expect(error).toHaveBeenCalledWith(expect.anything(), 'Cloudinary answered 200 with no secure_url');
    error.mockRestore();
  });

  it('never puts the secret in the log', async () => {
    const error = vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    stubCloudinary(Response.json({ error: { message: 'nope' } }, { status: 401 }));

    await service.upload(imageOf(), config);

    expect(JSON.stringify(error.mock.calls)).not.toContain(config.apiSecret);
    error.mockRestore();
  });

  it('survives a network that never answered', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('ECONNRESET');
      }),
    );

    expect(await service.upload(imageOf(), config)).toEqual({ status: 'unavailable' });
  });

  // `config()` is deliberately not asserted here. env.ts calls dotenv at import, so a unit test
  // reads whatever .env the machine running it happens to have: this passed on CI and failed on a
  // developer's laptop, and printed their live API secret into the terminal while failing. The
  // decision it makes lives in `toCloudinaryConfig`, which is pure and is tested above.
});

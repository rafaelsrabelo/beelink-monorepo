// Libs
import { createHash } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

// Nest
import { Logger } from '@nestjs/common';

// App
import type { CloudinaryConfig } from './cloudinary.service.js';
import { CloudinaryPrivateAssets, privateDownloadUrl } from './cloudinary-private-assets.js';
import { signCloudinary } from './cloudinary-signature.js';

const config: CloudinaryConfig = { cloudName: 'bee-link-dev', apiKey: '123456789', apiSecret: 'um-segredo-de-teste', folder: 'bee-link' };
const sha1 = (text: string) => createHash('sha1').update(text).digest('hex');

describe("Cloudinary's signature", () => {
  it('sorts the parameters by name, joins them as a query string and appends the secret', async () => {
    const signature = await signCloudinary({ type: 'authenticated', folder: 'bee-link/x', timestamp: '1700000000' }, 'segredo');

    expect(signature).toBe(sha1('folder=bee-link/x&timestamp=1700000000&type=authenticated' + 'segredo'));
  });
});

describe('a private download link', () => {
  it("is the API's download route, for this file in this format, signed with its expiry", async () => {
    const url = new URL(
      await privateDownloadUrl(config, { publicId: 'bee-link/affiliate-documents/s1/abc', format: 'jpg', expiresAt: new Date(1_700_000_600_000), now: new Date(1_700_000_000_000) }),
    );

    expect(`${url.origin}${url.pathname}`).toBe('https://api.cloudinary.com/v1_1/bee-link-dev/image/download');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      expires_at: '1700000600',
      format: 'jpg',
      public_id: 'bee-link/affiliate-documents/s1/abc',
      timestamp: '1700000000',
      type: 'authenticated',
      api_key: '123456789',
      signature: sha1('expires_at=1700000600&format=jpg&public_id=bee-link/affiliate-documents/s1/abc&timestamp=1700000000&type=authenticated' + config.apiSecret),
    });
  });
});

describe('CloudinaryPrivateAssets', () => {
  afterEach(() => vi.restoreAllMocks());

  function configured() {
    const assets = new CloudinaryPrivateAssets();
    vi.spyOn(assets, 'config').mockReturnValue(config);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    return assets;
  }

  const photo = (type = 'image/jpeg', bytes = 1024) => ({ bytes: Buffer.alloc(bytes), type, filename: 'frente.jpg' });

  it('uploads as an authenticated asset into its own folder, and keeps the id and the format', async () => {
    const fetched = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ public_id: 'bee-link/docs/abc', format: 'jpg', secure_url: 'https://x' })));

    const uploaded = await configured().upload(photo(), 'docs', { types: ['image/jpeg'], maxBytes: 8 * 1024 * 1024 });

    expect(uploaded).toEqual({ status: 'uploaded', publicId: 'bee-link/docs/abc', format: 'jpg' });
    const body = fetched.mock.calls[0]![1]!.body as FormData;
    expect(body.get('type')).toBe('authenticated');
    expect(body.get('folder')).toBe('bee-link/docs');
    expect(body.get('signature')).toBe(sha1(`folder=bee-link/docs&timestamp=${String(body.get('timestamp'))}&type=authenticated` + config.apiSecret));
  });

  it('refuses what is not an image it takes, or past the cap, before calling anyone', async () => {
    const fetched = vi.spyOn(globalThis, 'fetch');
    const assets = configured();

    expect(await assets.upload(photo('application/zip'), 'docs', { types: ['image/jpeg', 'application/pdf'], maxBytes: 1024 })).toEqual({ status: 'unsupported' });
    expect(await assets.upload(photo('image/png', 2048), 'docs', { types: ['image/png'], maxBytes: 1024 })).toEqual({ status: 'too-large' });
    expect(fetched).not.toHaveBeenCalled();
  });

  it('says nothing is configured, rather than failing, where there is no account', async () => {
    const assets = new CloudinaryPrivateAssets();
    vi.spyOn(assets, 'config').mockReturnValue(null);

    expect(await assets.upload(photo(), 'docs', { types: ['image/jpeg'], maxBytes: 1024 })).toEqual({ status: 'not-configured' });
    expect(await assets.downloadUrl('x', 'jpg', new Date())).toBeNull();
    expect(await assets.destroy('x')).toBe(false);
  });

  it('counts a file already gone as deleted, and a refusal as not', async () => {
    const assets = configured();
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response(JSON.stringify({ result: 'not found' }))).mockResolvedValueOnce(new Response('{}', { status: 500 }));

    expect(await assets.destroy('bee-link/docs/abc')).toBe(true);
    expect(await assets.destroy('bee-link/docs/abc')).toBe(false);
  });
});

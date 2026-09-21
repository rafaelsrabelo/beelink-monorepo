// Libs
import { describe, expect, it, vi } from 'vitest';

// Types
import type { FastifyRequest } from 'fastify';

// App
import type { CloudinaryConfig, ImageUpload } from './cloudinary.service.js';
import { CloudinaryService } from './cloudinary.service.js';
import { UploadsController } from './uploads.controller.js';

const config: CloudinaryConfig = {
  cloudName: 'bee-link-dev',
  apiKey: '123456789',
  apiSecret: 'um-segredo-de-teste',
  folder: 'bee-link',
};

/**
 * What @fastify/multipart hands a handler, reduced to the four things this one reads. `truncated`
 * is the flag that says the plugin stopped at its limit rather than reaching the end of the file.
 */
function partOf(init: { type?: string; bytes?: number; truncated?: boolean } = {}) {
  return {
    mimetype: init.type ?? 'image/png',
    filename: 'logo.png',
    file: { truncated: init.truncated ?? false },
    toBuffer: async () => Buffer.alloc(init.bytes ?? 1024),
  };
}

function controllerWith(options: {
  config?: CloudinaryConfig | null;
  upload?: ImageUpload;
}) {
  const cloudinary = new CloudinaryService();
  vi.spyOn(cloudinary, 'config').mockReturnValue(options.config === undefined ? config : options.config);
  const upload = vi
    .spyOn(cloudinary, 'upload')
    .mockResolvedValue(options.upload ?? { status: 'uploaded', url: 'https://res.cloudinary.com/x.png' });

  return { controller: new UploadsController(cloudinary), upload };
}

function requestWith(part: unknown): FastifyRequest {
  return { file: async () => part } as unknown as FastifyRequest;
}

describe('UploadsController', () => {
  it('answers the address the adapter stored the file at, and nothing else', async () => {
    const { controller } = controllerWith({ upload: { status: 'uploaded', url: 'https://res.cloudinary.com/logo.png' } });

    expect(await controller.upload(requestWith(partOf()))).toEqual({ url: 'https://res.cloudinary.com/logo.png' });
  });

  it('refuses before reading a body when no storage is configured', async () => {
    const { controller, upload } = controllerWith({ config: null });
    const request = { file: vi.fn() } as unknown as FastifyRequest;

    await expect(controller.upload(request)).rejects.toMatchObject({
      status: 501,
      response: { errorCode: 'UPLOAD_NOT_CONFIGURED' },
    });
    // Nothing was read: there is no reason to buffer megabytes that have nowhere to go.
    expect((request.file as unknown as ReturnType<typeof vi.fn>)).not.toHaveBeenCalled();
    expect(upload).not.toHaveBeenCalled();
  });

  it('says so when the multipart body carries no file', async () => {
    const { controller } = controllerWith({});

    await expect(controller.upload(requestWith(undefined))).rejects.toMatchObject({
      status: 400,
      response: { errorCode: 'BAD_REQUEST' },
    });
  });

  /**
   * The plugin stops reading at its limit and sets `truncated`, so the buffer arrives one byte
   * under the ceiling — passing a size check it had in fact failed. Without this a file of any
   * size would be uploaded, cut short, and stored as a corrupt image.
   */
  it('turns a read the plugin cut short into 413, not a silent half-file', async () => {
    const { controller, upload } = controllerWith({});

    await expect(controller.upload(requestWith(partOf({ truncated: true })))).rejects.toMatchObject({
      status: 413,
      response: { errorCode: 'PAYLOAD_TOO_LARGE' },
    });
    expect(upload).not.toHaveBeenCalled();
  });

  it.each([
    ['unsupported', 415, 'UNSUPPORTED_MEDIA_TYPE'],
    ['too-large', 413, 'PAYLOAD_TOO_LARGE'],
    // 502 and not 500: this API is healthy and the picture was fine. Blaming ourselves sends the
    // shopkeeper looking for a problem on their side.
    ['unavailable', 502, 'BAD_GATEWAY'],
  ] as const)('maps %s to %i', async (status, httpStatus, errorCode) => {
    const { controller } = controllerWith({ upload: { status } });

    await expect(controller.upload(requestWith(partOf()))).rejects.toMatchObject({
      status: httpStatus,
      response: { errorCode },
    });
  });

  it('hands the adapter what the part actually carried', async () => {
    const { controller, upload } = controllerWith({});

    await controller.upload(requestWith(partOf({ type: 'image/webp', bytes: 64 })));

    expect(upload).toHaveBeenCalledWith(
      { bytes: Buffer.alloc(64), type: 'image/webp', filename: 'logo.png' },
      config,
    );
  });
});

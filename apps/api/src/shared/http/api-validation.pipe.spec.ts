// Libs
import { Type } from 'class-transformer';
import { IsIn, IsOptional, IsString, ValidateNested } from 'class-validator';

// App
import { ApiValidationPipe } from './api-validation.pipe.js';

class Shape {
  @IsIn(['WIDE', 'NARROW'], { context: { errorCode: 'SHAPE_INVALID' } })
  width!: string;

  @IsOptional()
  @IsString()
  name?: string;
}

class Holder {
  @ValidateNested()
  @Type(() => Shape)
  shape!: Shape;
}

const pipe = new ApiValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });

function check(value: object, metatype: new () => object) {
  return pipe.transform(value, { type: 'body', metatype });
}

describe('ApiValidationPipe', () => {
  it('answers the code a failed constraint declares', async () => {
    await expect(check({ width: 'SQUARE' }, Shape)).rejects.toMatchObject({
      response: { errorCode: 'SHAPE_INVALID', message: [expect.stringContaining('width')] },
    });
  });

  it('finds it on a nested field, where a section carries its first component', async () => {
    await expect(check({ shape: { width: 'SQUARE' } }, Holder)).rejects.toMatchObject({
      response: { errorCode: 'SHAPE_INVALID' },
    });
  });

  // No declared code is Nest's own answer, which the filter names BAD_REQUEST after the status.
  it('leaves a failure that declares nothing as Nest answered it', async () => {
    const failure = await check({ width: 'WIDE', name: 7 }, Shape).catch((error: unknown) => error);

    expect(failure).toMatchObject({ response: { statusCode: 400, message: [expect.stringContaining('name')] } });
    expect((failure as { response: object }).response).not.toHaveProperty('errorCode');
  });

  it('lets a valid body through', async () => {
    await expect(check({ width: 'NARROW' }, Shape)).resolves.toMatchObject({ width: 'NARROW' });
  });

  // Postgres refuses a NUL in text and in jsonb; both reached it and came back as a 500.
  it('refuses text holding a NUL, at any depth', async () => {
    await expect(check({ width: 'WIDE', name: 'a\u0000b' }, Shape)).rejects.toMatchObject({ status: 400 });
    await expect(check({ shape: { width: 'WIDE', name: '\u0000' } }, Holder)).rejects.toMatchObject({ status: 400 });
  });

  it('refuses a lone surrogate, and lets a whole pair through', async () => {
    await expect(check({ width: 'WIDE', name: 'a\ud800' }, Shape)).rejects.toMatchObject({ status: 400 });
    await expect(check({ width: 'WIDE', name: '❤️ 😀' }, Shape)).resolves.toMatchObject({ name: '❤️ 😀' });
  });

  // class-transformer recurses before any decorator runs; forty levels overflowed it as a RangeError.
  it('refuses a body nested deeper than any this API reads', async () => {
    let deep: object = { width: 'WIDE' };
    for (let level = 0; level < 40; level += 1) deep = { next: deep };

    await expect(check(deep, Shape)).rejects.toMatchObject({ status: 400 });
  });

  it('walks only what a person wrote, not an upload', async () => {
    await expect(pipe.transform(Buffer.from([0, 0, 0]), { type: 'body' })).resolves.toBeInstanceOf(Buffer);
  });
});

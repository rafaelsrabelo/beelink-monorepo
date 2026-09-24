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
});

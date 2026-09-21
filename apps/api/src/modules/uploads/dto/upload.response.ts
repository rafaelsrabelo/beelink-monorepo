// Nest
import { ApiProperty } from '@nestjs/swagger';

/** What an accepted upload answers, and all it answers: where the file now lives. */
export class UploadResponse {
  @ApiProperty({
    description: 'The public https address of the stored image, ready for logoUrl or a banner',
    example: 'https://res.cloudinary.com/bee-link/image/upload/v1/bee-link/logo.png',
  })
  url!: string;

  static from(url: string): UploadResponse {
    const response = new UploadResponse();
    response.url = url;
    return response;
  }
}

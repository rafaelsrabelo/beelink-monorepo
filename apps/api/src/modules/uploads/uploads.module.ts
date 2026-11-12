// Nest
import { Module } from '@nestjs/common';

// App
import { CloudinaryPrivateAssets } from './cloudinary-private-assets.js';
import { CloudinaryService } from './cloudinary.service.js';
import { UploadsController } from './uploads.controller.js';

/** Images, and the private files of affiliates' documents (12/11/2026), which the affiliates module stores through `CloudinaryPrivateAssets`. */
@Module({
  controllers: [UploadsController],
  providers: [CloudinaryService, CloudinaryPrivateAssets],
  exports: [CloudinaryPrivateAssets],
})
export class UploadsModule {}

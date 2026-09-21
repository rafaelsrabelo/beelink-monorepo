// Nest
import { Module } from '@nestjs/common';

// App
import { CloudinaryService } from './cloudinary.service.js';
import { UploadsController } from './uploads.controller.js';

@Module({
  controllers: [UploadsController],
  providers: [CloudinaryService],
})
export class UploadsModule {}

// Nest
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';

// Libs
import { LoggerModule } from 'nestjs-pino';

// App
import { HealthController } from './health.controller.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard.js';
import { AddressesModule } from './modules/addresses/addresses.module.js';
import { BannersModule } from './modules/banners/banners.module.js';
import { CatalogModule } from './modules/catalog/catalog.module.js';
import { StoresModule } from './modules/stores/stores.module.js';
import { UploadsModule } from './modules/uploads/uploads.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { env } from './shared/config/env.js';
import { MailModule } from './shared/mail/mail.module.js';
import { PrismaModule } from './shared/prisma/prisma.module.js';

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: env.LOG_LEVEL,
        // Pretty lines for a person at a terminal; JSON wherever a machine reads the logs.
        transport:
          env.NODE_ENV === 'development'
            ? { target: 'pino-pretty', options: { singleLine: true } }
            : undefined,
        redact: ['req.headers.authorization', 'req.headers.cookie'],
      },
    }),
    PrismaModule,
    MailModule,
    AuthModule,
    UsersModule,
    AddressesModule,
    StoresModule,
    BannersModule,
    CatalogModule,
    UploadsModule,
  ],
  controllers: [HealthController],
  providers: [
    // Every route is closed unless it carries @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}

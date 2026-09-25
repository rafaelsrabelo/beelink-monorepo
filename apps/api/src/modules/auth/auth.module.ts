// Nest
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';

// App
import { env } from '../../shared/config/env.js';
import { AuthController } from './auth.controller.js';
import { AuthService } from './auth.service.js';
import { EmailTokenService } from './email-token.service.js';
import { SessionService } from './session.service.js';

@Module({
  imports: [
    JwtModule.register({
      // The guard is registered in AppModule (APP_GUARD), so JwtService has to resolve there too.
      global: true,
      secret: env.JWT_SECRET,
      signOptions: { algorithm: 'HS256' },
      verifyOptions: { algorithms: ['HS256'] },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, SessionService, EmailTokenService],
  exports: [AuthService, SessionService],
})
export class AuthModule {}

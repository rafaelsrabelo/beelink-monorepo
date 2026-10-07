// Nest
import { Module } from '@nestjs/common';

// App
import { AuthModule } from '../auth/auth.module.js';
import { AdminsController } from './admins/admins.controller.js';
import { PlatformAdminsService } from './admins/platform-admins.service.js';
import { AuditController } from './audit/audit.controller.js';
import { AuditInterceptor } from './audit/audit.interceptor.js';
import { AuditService } from './audit/audit.service.js';
import { BackofficeAuthController } from './auth/backoffice-auth.controller.js';
import { BackofficeAuthService } from './auth/backoffice-auth.service.js';
import { BackofficeMeController } from './auth/backoffice-me.controller.js';
import { BackofficeSessionService } from './auth/backoffice-session.service.js';
import { BackofficeGuard } from './backoffice.guard.js';

/**
 * bee-link's own backoffice (BEELINK-226). One module on purpose: every controller under
 * `/backoffice` is declared here, whatever sub-folder it lives in, so the guard and the audit
 * interceptor it is declared with resolve in one place. The panel's `AuthModule` is imported for the
 * password check alone — a backoffice session is not one of its sessions.
 */
@Module({
  imports: [AuthModule],
  controllers: [BackofficeAuthController, BackofficeMeController, AdminsController, AuditController],
  providers: [BackofficeGuard, AuditInterceptor, AuditService, BackofficeSessionService, BackofficeAuthService, PlatformAdminsService],
})
export class BackofficeModule {}

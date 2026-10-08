// Nest
import { Module } from '@nestjs/common';

// App
import { env } from '../../shared/config/env.js';
import { StoresModule } from '../stores/stores.module.js';
import { CustomDomainChecker } from './custom-domain-checker.js';
import { CustomDomainDnsResolver } from './custom-domain-dns.resolver.js';
import { CustomDomainHttpsProbe } from './custom-domain-https.probe.js';
import { CustomDomainController } from './custom-domain.controller.js';
import { CustomDomainProbe, CustomDomainResolver } from './custom-domain.ports.js';
import { CustomDomainService } from './custom-domain.service.js';
import { CustomDomainSettings, customDomainSettingsOf } from './custom-domain.settings.js';
import { CustomDomainsController } from './custom-domains.controller.js';

/**
 * A shop's own domain (BEELINK-281): the host kept on the shop's row, the check of it, and the table
 * the web resolves a request's host by. `CustomDomainResolver` and `CustomDomainProbe` are ports —
 * bound here to DNS and to HTTPS, the only two things in this module that reach the network — and
 * `CustomDomainSettings` is what the deployment says: the server's addresses, whether to probe, the
 * platform's own host.
 */
@Module({
  imports: [StoresModule],
  controllers: [CustomDomainController, CustomDomainsController],
  providers: [
    { provide: CustomDomainSettings, useFactory: () => customDomainSettingsOf(env) },
    { provide: CustomDomainResolver, useClass: CustomDomainDnsResolver },
    { provide: CustomDomainProbe, useClass: CustomDomainHttpsProbe },
    CustomDomainChecker,
    CustomDomainService,
  ],
})
export class CustomDomainModule {}

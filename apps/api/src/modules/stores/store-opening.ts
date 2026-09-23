// Nest
import { BadRequestException } from '@nestjs/common';

// Types
import type { PaymentMethod, StoreErrorCode, StoreType } from '@harness-monorepo/contracts';
import type { CreateStoreDto } from './dto/store.dto.js';
import type { SeededBand } from '../page/page-seed.js';

// App
import { defaultPage } from '../page/page-seed.js';
import { templatePage } from '../page/page-templates.js';

/**
 * A shop cannot be without a WhatsApp: an order has nowhere to go. A site can — it takes contact
 * through a form, and a phone is a nicety. Said here and not in the DTO, because the DTO for the
 * social networks does not know which kind of store it is nested in.
 */
export function refuseShopWithoutWhatsapp(type: StoreType, whatsapp: string | null | undefined): void {
  if (type === 'ECOMMERCE' && !whatsapp) {
    throw new BadRequestException({
      errorCode: 'STORE_WHATSAPP_REQUIRED' satisfies StoreErrorCode,
      message: 'A shop needs a WhatsApp to take orders',
    });
  }
}

/** The page a store opens with: a shop's own, or the template a site was created from. */
export function openingPageOf(dto: Pick<CreateStoreDto, 'type' | 'template'>, paymentMethods: readonly PaymentMethod[]): SeededBand[] {
  return dto.type === 'INSTITUTIONAL' ? templatePage(dto.template ?? 'servicos-b2b') : defaultPage(paymentMethods);
}

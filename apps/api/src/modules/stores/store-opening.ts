// Nest
import { BadRequestException } from '@nestjs/common';

// Types
import type { OpeningTemplateId, PaymentMethod, StoreErrorCode, StoreType } from '@harness-monorepo/contracts';
import type { CreateStoreDto } from './dto/store.dto.js';
import type { SeededBand } from '../page/page-seed.js';
import type { PageTemplate } from '../page/template-catalog.js';

// App
import { EMPTY_SHOP } from '../page/home-templates.js';
import { defaultPage } from '../page/page-seed.js';
import { PAGE_TEMPLATES, shopSubject, templateOf } from '../page/template-catalog.js';

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

/** What `POST /stores` takes as a model: every model of a home, whichever type of store it is for. */
export const OPENING_TEMPLATE_IDS = PAGE_TEMPLATES.filter((template) => template.pageKinds.includes('HOME')).map((template) => template.id) as OpeningTemplateId[];

/**
 * The model a store of this type opens with, or null for a shop's default page.
 *
 * The catalogue decides whether the one asked for applies — a home's model, for this type of store.
 * One that does not is not refused: the store opens as it would have with none, which is what a shop
 * sent a site's model has always done. A site has no page that is not a model: it falls to its first.
 */
export function openingTemplateOf(type: StoreType, asked: OpeningTemplateId | undefined): PageTemplate | null {
  const chosen = asked ? templateOf(asked) : null;
  if (chosen && chosen.pageKinds.includes('HOME') && chosen.storeTypes.includes(type)) return chosen;

  return type === 'INSTITUTIONAL' ? templateOf('servicos-b2b') : null;
}

/**
 * The page a store opens with: a shop's own, or the model it was created from, asked of the
 * catalogue like every model.
 *
 * A store being created has nothing on its shelf, so a model that arranges from the shop's stock is
 * handed an empty one, with the shop's name: the bands it would leave on a shop with no product.
 */
export function openingPageOf(dto: Pick<CreateStoreDto, 'name' | 'type' | 'template'>, paymentMethods: readonly PaymentMethod[]): SeededBand[] {
  const template = openingTemplateOf(dto.type, dto.template);
  if (!template) return defaultPage(paymentMethods);

  const stock = template.readsShop ? { ...EMPTY_SHOP, name: dto.name } : undefined;
  return template.bands(shopSubject(dto.name, paymentMethods, new Date(), stock));
}

// Libs
import { CreditCardIcon, MegaphoneIcon, MessageCircleIcon, ShoppingBagIcon, TruckIcon, type LucideIcon } from "lucide-react"

// Locales
import type { LandingProductValue } from "@harness-monorepo/ui/locales/messages"

/** The five parts of the ecosystem, each by the one icon the hero's hub and the hexagons both draw. */
export const LANDING_PRODUCT_ICON: Record<LandingProductValue, LucideIcon> = {
  store: ShoppingBagIcon,
  chat: MessageCircleIcon,
  checkout: CreditCardIcon,
  shipping: TruckIcon,
  marketing: MegaphoneIcon,
}

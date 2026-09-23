// Libs
import {
  AwardIcon,
  BanknoteIcon,
  CalendarCheckIcon,
  CheckIcon,
  ClockIcon,
  CreditCardIcon,
  GiftIcon,
  HeadphonesIcon,
  HeartIcon,
  LeafIcon,
  LockIcon,
  MapPinIcon,
  MessageCircleIcon,
  PackageIcon,
  PercentIcon,
  PhoneIcon,
  QrCodeIcon,
  RefreshCwIcon,
  ShieldCheckIcon,
  SparklesIcon,
  StarIcon,
  ThumbsUpIcon,
  TruckIcon,
  WalletIcon,
  ZapIcon,
  type LucideIcon,
} from "lucide-react"

/**
 * Every icon a shopkeeper may put on a promise.
 *
 * A closed table, and it is closed for two reasons that are both measurable. The first is weight:
 * lucide has well over a thousand icons and importing them dynamically to fill a grid of choices
 * ships a bundle nobody on the shop window needs. The second is that a shop's landing page has to
 * survive a deploy that removed one — an unknown name draws the default here rather than throwing
 * on a page a stranger asked for.
 *
 * The name is what is stored, never a URL and never a component — the same rule
 * `StoreCategory.icon` already states in the schema. Until this table existed nothing in the
 * repository could turn such a name back into a glyph, which is why that column was never drawn.
 */
export const BENEFIT_ICONS = {
  truck: TruckIcon,
  package: PackageIcon,
  "shield-check": ShieldCheckIcon,
  "refresh-cw": RefreshCwIcon,
  banknote: BanknoteIcon,
  "qr-code": QrCodeIcon,
  "credit-card": CreditCardIcon,
  wallet: WalletIcon,
  percent: PercentIcon,
  gift: GiftIcon,
  star: StarIcon,
  heart: HeartIcon,
  award: AwardIcon,
  "thumbs-up": ThumbsUpIcon,
  sparkles: SparklesIcon,
  headphones: HeadphonesIcon,
  "message-circle": MessageCircleIcon,
  phone: PhoneIcon,
  "map-pin": MapPinIcon,
  clock: ClockIcon,
  "calendar-check": CalendarCheckIcon,
  lock: LockIcon,
  leaf: LeafIcon,
  zap: ZapIcon,
  check: CheckIcon,
} as const satisfies Record<string, LucideIcon>

export type BenefitIconName = keyof typeof BENEFIT_ICONS

/** The one every unknown name falls back to. A tick promises nothing and misleads nobody. */
export const DEFAULT_BENEFIT_ICON: BenefitIconName = "check"

export function benefitIconNames(): BenefitIconName[] {
  return Object.keys(BENEFIT_ICONS) as BenefitIconName[]
}

/**
 * The glyph for a stored name.
 *
 * Never throws and never returns nothing: a name this table does not know — written by a newer
 * deploy, or left behind by one that removed an icon — draws the default.
 */
export function BenefitIcon({ name, className }: { name: string; className?: string }) {
  const Icon = BENEFIT_ICONS[name as BenefitIconName] ?? BENEFIT_ICONS[DEFAULT_BENEFIT_ICON]

  return <Icon aria-hidden="true" className={className ?? "size-5"} />
}

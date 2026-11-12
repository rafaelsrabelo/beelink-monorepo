// UI
import { Avatar, AvatarFallback, AvatarImage } from "@harness-monorepo/ui/components/avatar"
import { cn } from "@harness-monorepo/ui/lib/utils"

// Block
import { initialsOf } from "./storefront-account-menu"

export interface StorefrontAffiliateAvatarProps {
  name: string
  /** Their photo; null with none, and then their initials. */
  photoUrl: string | null
  size?: "sm" | "default" | "lg"
  className?: string
}

/**
 * The affiliate's face on the shop window, or their initials, in the shop's own tint. Decorative:
 * the sentence beside it always says the name, so the picture is not read out again.
 */
export function StorefrontAffiliateAvatar({ name, photoUrl, size = "default", className }: StorefrontAffiliateAvatarProps) {
  return (
    <Avatar size={size} aria-hidden="true" className={cn("after:border-shop-line", className)}>
      {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
      <AvatarFallback className="bg-shop-primary-tint-strong font-semibold text-shop-on-background">{initialsOf(name)}</AvatarFallback>
    </Avatar>
  )
}

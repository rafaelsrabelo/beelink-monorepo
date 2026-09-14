// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AuthCard } from "./auth-card"
import { AnchorLink, type LinkComponent } from "./auth-link"

export type VerifyEmailState = "checking" | "verified" | "invalid"

export interface VerifyEmailStatusProps {
  state: VerifyEmailState
  /** Offered when the link is spent or expired; a new one is always a click away. */
  onResend?: () => void | Promise<void>
  resendPending?: boolean
  resent?: boolean
  loginHref?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

export function VerifyEmailStatus({
  state,
  onResend,
  resendPending = false,
  resent = false,
  loginHref = "/login",
  linkComponent: Link = AnchorLink,
  messages = defaultMessages,
}: VerifyEmailStatusProps) {
  const text = messages.verifyEmail

  if (state === "checking") {
    return (
      <AuthCard title={text.checkingTitle} description={text.checkingDescription}>
        <div className="flex flex-col gap-3" aria-busy="true" aria-live="polite">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-8 w-full" />
        </div>
      </AuthCard>
    )
  }

  if (state === "verified") {
    return (
      <AuthCard
        title={text.verifiedTitle}
        description={text.verifiedDescription}
        footer={
          <Link href={loginHref} className="underline underline-offset-4">
            {text.goToSignIn}
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">{text.verifiedBody}</p>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title={text.invalidTitle}
      description={text.invalidDescription}
      footer={
        <Link href={loginHref} className="underline underline-offset-4">
          {text.backToSignIn}
        </Link>
      }
    >
      {resent ? (
        <p className="text-sm text-muted-foreground">{text.resentBody}</p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">{text.invalidBody}</p>
          {onResend ? (
            <Button type="button" onClick={onResend} disabled={resendPending}>
              {resendPending ? text.resending : text.resend}
            </Button>
          ) : null}
        </div>
      )}
    </AuthCard>
  )
}

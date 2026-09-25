// UI
import { AuthCard } from "@harness-monorepo/ui/blocks/auth/auth-card"
import { VerifyEmailStatus } from "@harness-monorepo/ui/blocks/auth/verify-email-status"

// App
import { AppLink } from "@/components/app-link"
import { ResendVerification } from "@/components/auth/resend-verification"
import { callApi } from "@/lib/api"
import { getMessages } from "@/lib/locale"
import { signInAfter } from "@/lib/sign-in-after"

/**
 * Verification runs here, on the server: the token is spent once, on the request the person's
 * click made. Doing it in the browser would risk a second render spending a token that is gone.
 */
export default async function VerifyEmailPage({ searchParams }: PageProps<"/verify-email">) {
  const { ui, web } = await getMessages()
  const { token, voltar } = await searchParams

  const verified =
    typeof token === "string" && token !== ""
      ? (await callApi({ path: "/auth/verify-email", body: { token } })).ok
      : false

  const signIn = await signInAfter(voltar)

  if (verified) {
    return <VerifyEmailStatus state="verified" loginHref={signIn.href} messages={ui} linkComponent={AppLink} />
  }

  return (
    <AuthCard
      title={ui.verifyEmail.invalidTitle}
      description={ui.verifyEmail.invalidDescription}
      footer={
        <AppLink href={signIn.href} className="underline underline-offset-4">
          {ui.verifyEmail.backToSignIn}
        </AppLink>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">
          {typeof token === "string" && token !== "" ? ui.verifyEmail.invalidBody : web.auth.missingToken}
        </p>
        {/* A shop's account is resent from the shop: signing up there again sends a fresh link. */}
        {signIn.atShop ? null : <ResendVerification ui={ui} />}
      </div>
    </AuthCard>
  )
}

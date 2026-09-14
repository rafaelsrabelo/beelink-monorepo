// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Skeleton } from "@harness-monorepo/ui/components/skeleton"

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
}

export function VerifyEmailStatus({
  state,
  onResend,
  resendPending = false,
  resent = false,
  loginHref = "/login",
  linkComponent: Link = AnchorLink,
}: VerifyEmailStatusProps) {
  if (state === "checking") {
    return (
      <AuthCard title="Confirmando seu e-mail" description="Isso leva só um instante">
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
        title="E-mail confirmado"
        description="Sua conta está pronta para uso"
        footer={
          <Link href={loginHref} className="underline underline-offset-4">
            Ir para a tela de entrada
          </Link>
        }
      >
        <p className="text-sm text-muted-foreground">
          Agora é só entrar com o e-mail e a senha que você cadastrou.
        </p>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      title="Link inválido ou expirado"
      description="Um link de confirmação vale por 24 horas e só pode ser usado uma vez"
      footer={
        <Link href={loginHref} className="underline underline-offset-4">
          Voltar para entrar
        </Link>
      }
    >
      {resent ? (
        <p className="text-sm text-muted-foreground">
          Enviamos um novo link. Confira sua caixa de entrada e o spam.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            Peça um novo link e tente de novo.
          </p>
          {onResend ? (
            <Button type="button" onClick={onResend} disabled={resendPending}>
              {resendPending ? "Enviando…" : "Enviar novo link"}
            </Button>
          ) : null}
        </div>
      )}
    </AuthCard>
  )
}

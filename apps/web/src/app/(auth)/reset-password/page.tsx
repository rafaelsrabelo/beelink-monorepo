// App
import { ResetPasswordScreen } from "@/components/auth/reset-password-screen"
import { getMessages } from "@/lib/locale"
import { signInAfter } from "@/lib/sign-in-after"

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { ui, web } = await getMessages()
  const { token, voltar } = await searchParams
  const signIn = await signInAfter(voltar)

  return <ResetPasswordScreen ui={ui} web={web} token={typeof token === "string" ? token : undefined} signInHref={signIn.href} />
}

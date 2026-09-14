// App
import { ResetPasswordScreen } from "@/components/auth/reset-password-screen"
import { getMessages } from "@/lib/locale"

export default async function ResetPasswordPage({ searchParams }: PageProps<"/reset-password">) {
  const { ui, web } = await getMessages()
  const { token } = await searchParams

  return <ResetPasswordScreen ui={ui} web={web} token={typeof token === "string" ? token : undefined} />
}

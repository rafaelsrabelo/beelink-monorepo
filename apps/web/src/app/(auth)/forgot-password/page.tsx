// App
import { ForgotPasswordScreen } from "@/components/auth/forgot-password-screen"
import { getMessages } from "@/lib/locale"

export default async function ForgotPasswordPage() {
  const { ui, web } = await getMessages()

  return <ForgotPasswordScreen ui={ui} web={web} />
}

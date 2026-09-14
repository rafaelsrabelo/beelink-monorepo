// App
import { LoginScreen } from "@/components/auth/login-screen"
import { getMessages } from "@/lib/locale"

export default async function LoginPage() {
  const { ui, web } = await getMessages()

  return <LoginScreen ui={ui} web={web} />
}

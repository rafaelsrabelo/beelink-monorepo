// App
import { SignupScreen } from "@/components/auth/signup-screen"
import { getMessages } from "@/lib/locale"

export default async function SignupPage() {
  const { ui, web } = await getMessages()

  return <SignupScreen ui={ui} web={web} />
}

// App
import { LoginScreen } from "@/components/auth/login-screen"
import { getMessages } from "@/lib/locale"
import { panelReturnOf, RETURN_KEY } from "@/lib/panel-return"

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [{ ui, web }, query] = await Promise.all([getMessages(), searchParams])
  const back = query[RETURN_KEY]

  return <LoginScreen ui={ui} web={web} back={panelReturnOf(typeof back === "string" ? back : null)} />
}

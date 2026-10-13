// App
import { LoginScreen } from "@/components/auth/login-screen"
import { SiteMeasured } from "@/components/site-analytics/site-measured"
import { getMessages } from "@/lib/locale"
import { panelReturnOf, RETURN_KEY } from "@/lib/panel-return"

/**
 * The shopkeeper's sign-in. One of the three pages Beelink measures (BEELINK-320), for a visitor who
 * said yes on the landing: it asks nothing itself, and with no answer nobody is measured.
 */
export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const [{ ui, web }, query] = await Promise.all([getMessages(), searchParams])
  const back = query[RETURN_KEY]

  return (
    <SiteMeasured>
      <LoginScreen ui={ui} web={web} back={panelReturnOf(typeof back === "string" ? back : null)} />
    </SiteMeasured>
  )
}

// App
import { SignupScreen } from "@/components/auth/signup-screen"
import { SiteMeasured } from "@/components/site-analytics/site-measured"
import { getMessages } from "@/lib/locale"

/**
 * The shopkeeper's sign-up. One of the three pages Beelink measures (BEELINK-320), for a visitor who
 * said yes on the landing: it asks nothing itself, and with no answer nobody is measured.
 */
export default async function SignupPage() {
  const { ui, web } = await getMessages()

  return (
    <SiteMeasured>
      <SignupScreen ui={ui} web={web} />
    </SiteMeasured>
  )
}

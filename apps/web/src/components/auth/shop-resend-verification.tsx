// UI
import { Button } from "@harness-monorepo/ui/components/button"
import { Field, FieldGroup, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

/**
 * A new confirmation link for a shop's account, asked of that shop: the panel's resend looks among
 * bee-link's accounts and would find nothing. A plain form posted to the shop's own handler, which
 * answers on the shop's sign-up face, saying where the link went.
 */
export function ShopResendVerification({ ui, slug, signInHref }: { ui: UiMessages; slug: string; signInHref: string }) {
  return (
    <form method="post" action={`/${slug}/api/customer/reenviar`}>
      <input type="hidden" name="retorno" value={signInHref} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="resend-email">{ui.login.emailLabel}</FieldLabel>
          <Input id="resend-email" name="email" type="email" required autoComplete="email" placeholder={ui.login.emailPlaceholder} />
        </Field>
        <Field>
          <Button type="submit">{ui.verifyEmail.resend}</Button>
        </Field>
      </FieldGroup>
    </form>
  )
}

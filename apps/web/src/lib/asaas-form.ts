// Types
import type { AsaasConnection, AsaasEnvironment, AsaasSettings, AsaasSettingsPayload } from "@harness-monorepo/contracts"
import type { AsaasCardView, PaymentSettingsFormValues } from "@harness-monorepo/ui/lib/integrations"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

type AsaasText = UiMessages["integrations"]["asaas"]
type PaymentsText = UiMessages["integrations"]["payments"]

/**
 * Where an Asaas account is opened, by the environment this deployment talks to. The sandbox's is
 * the one Asaas's own documentation sends a developer to; it names no address for opening an account
 * in production, so that one is Asaas's front door and not a path guessed at.
 */
const SIGN_UP: Record<AsaasEnvironment, string> = {
  SANDBOX: "https://sandbox.asaas.com",
  PRODUCTION: "https://www.asaas.com",
}

/** The card as the block draws it: the connection, and where a shopkeeper with no account opens one. */
export function asaasCardOf(connection: AsaasConnection): AsaasCardView {
  return {
    available: connection.available,
    status: connection.status,
    sandbox: connection.environment === "SANDBOX",
    account: connection.account,
    webhook: connection.webhook,
    connectedAt: connection.connectedAt,
    signUpHref: SIGN_UP[connection.environment],
  }
}

/**
 * Why a key was refused, in words. A key of the other environment is told which one this deployment
 * takes; own keys only, so a code that names a member of `Object` reads as any unknown one.
 */
export function asaasConnectErrorOf(code: string, environment: AsaasEnvironment, text: Pick<AsaasText, "errors" | "wrongEnvironment" | "unavailable">): string {
  if (code === "INTEGRATION_KEY_WRONG_ENVIRONMENT") return text.wrongEnvironment[environment]
  if (code === "INTEGRATION_UNAVAILABLE") return text.unavailable
  return Object.hasOwn(text.errors, code) ? text.errors[code as keyof AsaasText["errors"]] : text.errors.UNKNOWN
}

/** The ways the shop is paid as the form starts from them: the settings, without when they were saved. */
export function paymentFormOf(settings: AsaasSettings): PaymentSettingsFormValues {
  return { pix: settings.pix, card: settings.card, maxInstallments: settings.maxInstallments, offline: settings.offline }
}

/** What the form holds as the API takes it, or why not: with every way off the shop could not be paid at all. */
export function paymentPayloadOf(value: PaymentSettingsFormValues, text: PaymentsText["issues"]): { payload: AsaasSettingsPayload } | { issue: string } {
  if (!value.pix && !value.card && !value.offline) return { issue: text.none }
  return { payload: { pix: value.pix, card: value.card, maxInstallments: value.maxInstallments, offline: value.offline } }
}

/** The API's refusal of a save, in words. */
export function paymentErrorOf(code: string, text: PaymentsText["errors"]): string {
  return code === "ASAAS_SETTINGS_INVALID" ? text.ASAAS_SETTINGS_INVALID : text.UNKNOWN
}

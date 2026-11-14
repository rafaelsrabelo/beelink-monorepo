// Types
import type { ShopAffiliateApplication } from "@harness-monorepo/contracts"
import type { AffiliateApplicationView } from "@harness-monorepo/ui/lib/affiliate-page"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// App
import { phoneLineOf } from "./account-menu"

/* The applications the shop's page took (plan 2026-11-14), as the panel's list says them. */

type Text = UiMessages["affiliateApplications"]

/** When an application arrived, on Brasília's clock: "14/11, 14:32". */
export function applicationReceivedFormatter(locale: string): (iso: string) => string {
  const moment = new Intl.DateTimeFormat(locale, { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" })
  return (iso) => moment.format(new Date(iso))
}

/** One application in words; an approval says where its affiliate stands now, or that the invite went. */
export function applicationViewOf(application: ShopAffiliateApplication, text: Text, received: (iso: string) => string): AffiliateApplicationView {
  const outcome = application.status === "APPROVED" ? (application.affiliate ? text.affiliate[application.affiliate.status] : text.affiliate.gone) : application.status === "REFUSED" ? text.refused : null
  return {
    id: application.id,
    name: application.name,
    email: application.email,
    phone: phoneLineOf(application.phone) ?? application.phone,
    extra: application.extraAnswer ? { question: application.extraQuestion ?? text.extraDefault, answer: application.extraAnswer } : null,
    received: received(application.createdAt),
    status: application.status,
    outcome,
  }
}

/** The API's refusal, in words; a code this screen does not know reads as the general failure. */
export function applicationErrorOf(errorCode: string, errors: Text["errors"]): string {
  return errorCode in errors ? errors[errorCode as keyof Text["errors"]] : errors.UNKNOWN
}

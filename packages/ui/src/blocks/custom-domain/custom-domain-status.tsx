// UI
import type { CustomDomainView } from "@harness-monorepo/ui/lib/custom-domain"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

export interface CustomDomainStatusProps {
  domain: CustomDomainView
  /** The server's addresses: where the domain has to point. */
  targetIps: readonly string[]
  /** The page's address at the platform, with no scheme: `beelink.biz/minha-loja`. */
  address: string
  messages?: UiMessages
}

type DomainText = UiMessages["customDomain"]

/** What the last check found wrong, as what the shopkeeper does about it. Where the records point is told only by a check that just ran. */
function problemOf(domain: CustomDomainView, targetIps: readonly string[], text: DomainText, locale: string): string | null {
  if (domain.problem === null) return null
  const list = new Intl.ListFormat(locale, { type: "conjunction" })
  const values = { domain: domain.host, expected: list.format(targetIps), found: list.format(domain.addresses) }
  const told = domain.problem === "DNS_POINTS_ELSEWHERE" && domain.addresses.length > 0

  return format(told ? text.pointsElsewhereFound : text.problems[domain.problem], values)
}

/**
 * Where a saved domain stands, in sentences (BEELINK-285). A pending one says what the last check
 * found, as what to do about it. An active one says where the page opens now, where its old address
 * leads, and that a change takes up to a minute to show — always, since the screen cannot tell a
 * domain activated a moment ago from one activated last month, and the sentence is true of both.
 *
 * An active domain may carry a problem (BEELINK-281): it stays active, and the problem is said as
 * what the last check found, never as a domain still waiting.
 */
export function CustomDomainStatus({ domain, targetIps, address, messages = defaultMessages }: CustomDomainStatusProps) {
  const text = messages.customDomain
  const problem = problemOf(domain, targetIps, text, messages.locale)
  const active = domain.status === "ACTIVE"

  return (
    <div className="flex flex-col gap-3 break-words">
      {active ? <p className="text-sm">{format(text.active, { domain: domain.host, address })}</p> : null}

      {active && problem ? (
        <div className="border-destructive/30 bg-destructive/10 flex flex-col gap-1 rounded-lg border px-3 py-3 text-sm">
          <p className="font-medium">{text.activeProblem}</p>
          <p>{problem}</p>
        </div>
      ) : null}

      {active ? null : <p className="bg-muted rounded-lg px-3 py-3 text-sm">{problem ?? text.pending}</p>}

      {/* A note, in the page's quiet colour: the domain is active without `www`. */}
      {domain.wwwOff ? <p className="text-muted-foreground text-sm">{format(text.www, { domain: domain.host })}</p> : null}
    </div>
  )
}

"use client"

// React
import { useId, useRef } from "react"

// Libs
import { CheckIcon } from "lucide-react"

// UI
import { Badge } from "@harness-monorepo/ui/components/badge"
import { useFocusOnSwap } from "@harness-monorepo/ui/hooks/use-focus-on-swap"
import type { CustomDomainView } from "@harness-monorepo/ui/lib/custom-domain"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { CustomDomainActions } from "./custom-domain-actions"
import { CustomDomainForm } from "./custom-domain-form"
import { CustomDomainStatus } from "./custom-domain-status"

export interface CustomDomainCardProps {
  /** The server's addresses, which a domain is pointed at. Null where this deployment names none: nothing is saved or checked there. */
  targetIps: readonly string[] | null
  /** The saved domain; null while the shop has none. */
  domain: CustomDomainView | null
  /** The page's address at the platform, with no scheme: `beelink.biz/minha-loja`. */
  address: string
  /** Saves what was typed. The API reads it down to a host and checks it there and then. */
  onSave: (domain: string) => void
  saving?: boolean
  /** Why the API refused the last domain, in words. */
  saveError?: string
  onCheck: () => void
  checking?: boolean
  /** A check asked from this screen just came back: what it found is read out. */
  checked?: boolean
  /** Why the last check did not go through, in words. */
  checkError?: string
  onRemove: () => void
  removing?: boolean
  /** Why the last removal did not go through, in words. */
  removeError?: string
  /** `h1` where the card is its page, so the page is not titled twice. */
  headingAs?: "h1" | "h2"
  messages?: UiMessages
}

/**
 * A shop's own domain in the panel (BEELINK-285): what it is for, the field it is typed into, and —
 * once one is saved — which domain it is, where it stands, when it was last checked, and the ways to
 * check it again and to remove it.
 *
 * There is no "change the domain": whoever wants another removes this one and saves the other. One
 * state fewer on a screen that says, at every step, what the shop's address is.
 *
 * Where the deployment names no address to point at, the card says so and offers no field. A domain
 * saved there before — the setting was taken away since — is still shown, and can still be removed.
 */
export function CustomDomainCard({ targetIps, domain, address, onSave, saving = false, saveError, onCheck, checking = false, checked = false, checkError, onRemove, removing = false, removeError, headingAs: Heading = "h2", messages = defaultMessages }: CustomDomainCardProps) {
  const text = messages.customDomain
  const id = useId()
  const body = useRef<HTMLDivElement>(null)
  const badge = domain?.status ?? (targetIps === null ? "UNAVAILABLE" : "NONE")
  useFocusOnSwap(domain ? "saved" : "form", body)

  return (
    <section aria-labelledby={`${id}-title`} className="bg-shell-surface border-shell-border flex flex-col gap-4 rounded-xl border p-4 shadow-xs sm:p-6">
      <div className="flex flex-wrap items-center gap-3">
        <Heading id={`${id}-title`} className={Heading === "h1" ? "text-2xl font-semibold" : "font-semibold"}>
          {text.title}
        </Heading>
        <Badge variant={badge === "ACTIVE" ? "success" : "outline"}>
          {badge === "ACTIVE" ? <CheckIcon aria-hidden="true" /> : null}
          {text.badges[badge]}
        </Badge>
      </div>
      <p className="text-muted-foreground text-sm break-words">{format(text.lead, { address })}</p>

      <div ref={body} className="flex flex-col gap-4">
        {/*
          Focusable by script alone: once a domain saved here before is removed, nothing is left to
          press, and this is what the focus lands on rather than being dropped to the page's start.
        */}
        {targetIps === null ? (
          <p tabIndex={-1} className="bg-muted rounded-lg px-3 py-3 text-sm outline-none">
            {text.unavailable}
          </p>
        ) : null}
        {domain ? (
          <>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground text-sm">{text.domainLabel}</dt>
                <dd className="text-sm font-medium break-all">{domain.host}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-muted-foreground text-sm">{text.checkedAtLabel}</dt>
                <dd className="text-sm font-medium tabular-nums">{domain.checkedAt ?? text.neverChecked}</dd>
              </div>
            </dl>
            {targetIps ? <CustomDomainStatus domain={domain} targetIps={targetIps} address={address} messages={messages} /> : null}
            <CustomDomainActions
              host={domain.host}
              address={address}
              onCheck={targetIps ? onCheck : undefined}
              checking={checking}
              checkResult={checked ? (domain.status === "ACTIVE" && domain.problem === null ? text.checkedOk : text.checkedProblem) : undefined}
              checkError={checkError}
              onRemove={onRemove}
              removing={removing}
              removeError={removeError}
              messages={messages}
            />
          </>
        ) : targetIps ? (
          <CustomDomainForm onSubmit={onSave} pending={saving} error={saveError} messages={messages} />
        ) : null}
      </div>
    </section>
  )
}

"use client"

// React
import { useEffect, useState } from "react"

// Libs
import { ArrowLeftIcon, CheckIcon, CopyIcon, EllipsisIcon, MailIcon, PauseIcon, PlayIcon } from "lucide-react"

// UI
import { Avatar, AvatarFallback, AvatarImage } from "@harness-monorepo/ui/components/avatar"
import { Button, buttonVariants } from "@harness-monorepo/ui/components/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@harness-monorepo/ui/components/dropdown-menu"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { initialsOf, type AffiliateStatusValue } from "@harness-monorepo/ui/lib/affiliates"
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import { AffiliateStatusBadge } from "./affiliate-status-badge"

/** What can be done to an affiliate, by where they stand. */
export type AffiliateAction = "resend" | "cancel" | "pause" | "resume" | "end"

/** The one act the standing asks for most, beside the copy, and the rest behind "⋯". */
const ACTIONS: Record<AffiliateStatusValue, { main: AffiliateAction | null; more: readonly AffiliateAction[] }> = {
  INVITED: { main: "resend", more: ["cancel"] },
  ACTIVE: { main: "pause", more: ["end"] },
  PAUSED: { main: "resume", more: ["end"] },
  ENDED: { main: null, more: [] },
}

const COPIED_MS = 2000

export interface AffiliateRecordHeaderProps {
  name: string
  email: string
  status: AffiliateStatusValue
  /** The whole link; null while invited. */
  link: string | null
  photoUrl: string | null
  backHref: string
  onAction: (action: AffiliateAction) => void
  /** The act in flight: every button waits. */
  busy?: AffiliateAction | null
  /** What the last act did, in words. */
  notice?: string
  /** The API's refusal, in words. */
  error?: string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/**
 * The top of an affiliate's record (12/11/2026): who, where they stand, their e-mail and link, and
 * what the shop does next — copy the link, and the act their standing asks for — with the acts that
 * do not come back behind "⋯".
 */
export function AffiliateRecordHeader({ name, email, status, link, photoUrl, backHref, onAction, busy = null, notice, error, linkComponent: Link = AnchorLink, messages = defaultMessages }: AffiliateRecordHeaderProps) {
  const text = messages.affiliates.record
  const [copied, setCopied] = useState(false)
  const { main, more } = ACTIONS[status]

  useEffect(() => {
    if (!copied) return
    const timer = setTimeout(() => setCopied(false), COPIED_MS)
    return () => clearTimeout(timer)
  }, [copied])

  async function copy() {
    if (!link) return
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  const label: Record<AffiliateAction, string> = { resend: busy === "resend" ? text.resending : text.resend, cancel: text.cancelInvite, pause: text.pause, resume: text.resume, end: text.end }
  const icon = { resend: <MailIcon />, pause: <PauseIcon />, resume: <PlayIcon />, cancel: null, end: null }

  return (
    <header className="flex flex-col gap-4">
      <Link href={backHref} className="text-muted-foreground hover:text-foreground focus-visible:ring-ring inline-flex w-fit items-center gap-1 rounded-sm text-sm outline-none focus-visible:ring-2">
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        {text.back}
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar className="size-14">
            {photoUrl ? <AvatarImage src={photoUrl} alt="" /> : null}
            <AvatarFallback className="text-base">{initialsOf(name)}</AvatarFallback>
          </Avatar>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold break-words">{name}</h1>
              <AffiliateStatusBadge status={status} messages={messages} />
            </div>
            <p className="text-muted-foreground text-sm break-all">
              {email}
              {link ? <span className="font-mono text-[13px]"> · {link.replace(/^https?:\/\//, "")}</span> : null}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {link && status !== "ENDED" ? (
            <Button type="button" variant="outline" onClick={() => void copy()}>
              {copied ? <CheckIcon /> : <CopyIcon />}
              {copied ? text.copied : text.copyLink}
            </Button>
          ) : null}
          {main ? (
            <Button type="button" disabled={busy !== null} onClick={() => onAction(main)}>
              {icon[main]}
              {busy === main && main !== "resend" ? text.busy : label[main]}
            </Button>
          ) : null}
          {more.length > 0 ? (
            <DropdownMenu>
              <DropdownMenuTrigger aria-label={text.moreActions} disabled={busy !== null} className={buttonVariants({ variant: "outline", size: "icon" })}>
                <EllipsisIcon aria-hidden="true" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {more.map((action) => (
                  <DropdownMenuItem key={action} variant="destructive" onClick={() => onAction(action)}>
                    {label[action]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>
      </div>
      {status === "ENDED" ? <p className="text-muted-foreground text-sm">{text.endedHint}</p> : null}
      <p role="status" className="text-muted-foreground text-sm empty:hidden">
        {notice ?? ""}
      </p>
      {error ? (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      ) : null}
    </header>
  )
}

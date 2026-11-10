// UI
import { buttonVariants } from "@harness-monorepo/ui/components/button"
import { Switch } from "@harness-monorepo/ui/components/switch"

// Locales
import { defaultMessages, format } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { AnchorLink, type LinkComponent } from "../auth/auth-link"
import type { CouponListRow } from "../promotions/coupon-list"

export interface GestorCouponListProps {
  rows: readonly CouponListRow[]
  onToggle: (id: string, active: boolean) => void
  /** The coupon a switch is on its way for. */
  pendingId?: string | null
  /** The panel's form, where a coupon is made or changed: the manager only switches. */
  createHref: string
  editHrefOf: (id: string) => string
  linkComponent?: LinkComponent
  messages?: UiMessages
}

/** The shop's coupons as the counter needs them: each one's rule, its uses, and its switch. */
export function GestorCouponList({ rows, onToggle, pendingId = null, createHref, editHrefOf, linkComponent: Link = AnchorLink, messages = defaultMessages }: GestorCouponListProps) {
  const text = messages.gestor.coupons

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-foreground text-2xl font-bold">{text.title}</h1>
          <p className="text-shell-muted text-sm">{text.intro}</p>
        </div>
        <Link href={createHref} className={buttonVariants({ className: "h-11 px-4 font-semibold" })}>
          {text.create}
        </Link>
      </header>

      {rows.length === 0 ? (
        <p className="text-shell-muted bg-shell-surface rounded-xl border p-6 text-center text-sm">{text.empty}</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => (
            <li key={row.id} className="bg-shell-surface border-shell-border flex flex-col gap-3 rounded-2xl border p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="bg-warning text-foreground border-foreground rounded-lg border border-dashed px-2.5 py-1 font-semibold tracking-wide">{row.code}</span>
                <Switch
                  checked={row.active}
                  onCheckedChange={(on: boolean) => onToggle(row.id, on)}
                  disabled={pendingId === row.id}
                  aria-label={format(text.switchLabel, { code: row.code })}
                />
              </div>
              <p className="text-foreground font-medium">{row.minimum ? `${row.discount} · ${row.minimum}` : row.discount}</p>
              <div className="border-shell-border text-shell-muted flex flex-wrap justify-between gap-2 border-t pt-2.5 text-sm">
                <span>{row.uses}</span>
                <span>{row.period}</span>
              </div>
              <Link href={editHrefOf(row.id)} className="focus-visible:ring-ring w-fit rounded-sm text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2">
                {text.edit}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

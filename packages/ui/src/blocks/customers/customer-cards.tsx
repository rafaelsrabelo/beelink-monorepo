// Locales
import { format } from "@harness-monorepo/ui/locales/index"

// Block
import { CustomerContact } from "./customer-contact"
import { CustomerDuplicateBadge } from "./customer-duplicate-badge"
import { CustomerStageBadge } from "./customer-stage-badge"
import { ordersLabel, placeOf, type CustomerRowsProps } from "./customer-types"
import { CustomerWhatsApp } from "./customer-whatsapp"

/**
 * The list as cards, on a phone behind the counter. The name is the card's one link, stretched over
 * it as the table's is, and the rest stays text a screen reader reads. The WhatsApp button sits
 * above the stretched link, and says its whole sentence: a card has the room the column does not.
 */
export function CustomerCards({ customers, hrefOf, whatsappHrefOf, money, when, linkComponent: Link, messages }: CustomerRowsProps) {
  const text = messages.customers

  return (
    <ul className="flex flex-col gap-2">
      {customers.map((customer) => {
        const place = placeOf(customer)

        return (
          <li key={customer.id} className="bg-shell-surface border-shell-border relative flex flex-col gap-2 rounded-xl border p-3 shadow-xs">
            <span className="flex items-start justify-between gap-2">
              <span className="flex min-w-0 flex-col">
                {/* The ring is drawn on the stretched area, not on the card: a focus on the
                    WhatsApp button inside must not look like a focus on the record. */}
                <Link
                  href={hrefOf(customer.id)}
                  aria-label={format(text.open, { name: customer.name })}
                  className="focus-visible:after:ring-ring truncate font-medium outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2"
                >
                  {customer.name}
                </Link>
                <CustomerContact customer={customer} messages={messages} />
              </span>
              <span className="flex flex-col items-end gap-1">
                <CustomerStageBadge customer={customer} messages={messages} />
                {customer.possibleDuplicate ? <CustomerDuplicateBadge messages={messages} /> : null}
              </span>
            </span>
            <span className="text-muted-foreground flex flex-wrap justify-between gap-x-3 gap-y-1 text-xs">
              <span className="tabular-nums">
                {ordersLabel(customer.ordersCount, messages)}
                {customer.ordersCount > 0 ? ` · ${money(customer.totalSpentCents)}` : null}
              </span>
              {customer.lastOrderAt ? <span className="tabular-nums">{format(text.lastOrderOn, { date: when(customer.lastOrderAt) })}</span> : null}
            </span>
            {place ? <span className="text-muted-foreground text-xs">{place}</span> : null}
            <span className="relative z-10 self-start">
              <CustomerWhatsApp name={customer.name} href={whatsappHrefOf(customer)} label={text.whatsapp} messages={messages} />
            </span>
          </li>
        )
      })}
    </ul>
  )
}

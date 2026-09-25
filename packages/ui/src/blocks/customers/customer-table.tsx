// UI
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@harness-monorepo/ui/components/table"

// Locales
import { format } from "@harness-monorepo/ui/locales/index"

// Block
import { CustomerContact } from "./customer-contact"
import { CustomerStageBadge } from "./customer-stage-badge"
import { placeOf, type CustomerRowsProps } from "./customer-types"
import { CustomerWhatsApp } from "./customer-whatsapp"

/**
 * The list as a table, where there is room for one: who, where they stand, how much they bought and
 * when, where they are, and the way to message them.
 *
 * The name is the row's one link, stretched over it, so the whole row opens the record and a screen
 * reader hears "Abrir a ficha de Bia Souza". The WhatsApp cell sits above the stretched link: a tap
 * on the button opens the conversation, never the record.
 */
export function CustomerTable({ customers, hrefOf, whatsappHrefOf, money, when, linkComponent: Link, messages }: CustomerRowsProps) {
  const text = messages.customers

  return (
    <div className="bg-shell-surface border-shell-border rounded-xl border shadow-xs">
      <Table>
        <TableHeader className="bg-muted/40">
          <TableRow>
            <TableHead>{text.customer}</TableHead>
            <TableHead className="w-36">{text.stage}</TableHead>
            <TableHead className="w-20 text-right">{text.orders}</TableHead>
            <TableHead className="w-28 text-right">{text.spent}</TableHead>
            <TableHead className="w-32">{text.lastOrder}</TableHead>
            <TableHead className="w-36">{text.place}</TableHead>
            <TableHead className="w-32">
              <span className="sr-only">{text.whatsappShort}</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id} className="relative">
              <TableCell>
                <div className="flex max-w-64 min-w-0 flex-col">
                  <Link
                    href={hrefOf(customer.id)}
                    aria-label={format(text.open, { name: customer.name })}
                    title={customer.name}
                    className="focus-visible:ring-ring truncate rounded-sm font-medium outline-none after:absolute after:inset-0 hover:underline focus-visible:ring-2"
                  >
                    {customer.name}
                  </Link>
                  <CustomerContact customer={customer} messages={messages} />
                </div>
              </TableCell>
              <TableCell>
                <CustomerStageBadge customer={customer} messages={messages} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{customer.ordersCount}</TableCell>
              <TableCell className="text-right font-medium tabular-nums">{money(customer.totalSpentCents)}</TableCell>
              <TableCell className="text-muted-foreground tabular-nums">{customer.lastOrderAt ? when(customer.lastOrderAt) : "—"}</TableCell>
              <TableCell className="text-muted-foreground max-w-36 truncate">{placeOf(customer) ?? "—"}</TableCell>
              <TableCell>
                {/* Only as wide as the button: the rest of the cell still opens the record. */}
                <div className="relative z-10 w-fit">
                  <CustomerWhatsApp name={customer.name} href={whatsappHrefOf(customer)} label={text.whatsappShort} messages={messages} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

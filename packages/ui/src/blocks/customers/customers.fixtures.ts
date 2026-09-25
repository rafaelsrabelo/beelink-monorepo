// Block
import type { CustomerOrderItem } from "./customer-orders"
import type { CustomerListItem, CustomerRecordView } from "./customer-types"

/** A lead with an unconfirmed e-mail, a customer, and one who stopped buying and left no phone. */
export const customers: CustomerListItem[] = [
  {
    id: "c1",
    name: "Bia Souza",
    email: "bia@exemplo.com",
    emailVerified: false,
    phone: "5511977776666",
    city: "São Paulo",
    state: "SP",
    stage: "LEAD",
    ordersCount: 0,
    totalSpentCents: 0,
    lastOrderAt: null,
    daysSinceLastOrder: null,
  },
  {
    id: "c2",
    name: "Caio Lima",
    email: null,
    emailVerified: false,
    phone: "5511955554444",
    city: "Campinas",
    state: "SP",
    stage: "CUSTOMER",
    ordersCount: 3,
    totalSpentCents: 36870,
    lastOrderAt: "2026-09-20T14:30:00.000Z",
    daysSinceLastOrder: 5,
  },
  {
    id: "c3",
    name: "Eva Nunes",
    email: "eva@exemplo.com",
    emailVerified: true,
    phone: null,
    city: null,
    state: null,
    stage: "INACTIVE",
    ordersCount: 1,
    totalSpentCents: 8990,
    lastOrderAt: "2026-07-13T10:00:00.000Z",
    daysSinceLastOrder: 74,
  },
]

/** Caio's record: the list's row, where he is, and the rest of his numbers over three valid orders. */
export const customerRecord: CustomerRecordView = {
  ...customers[1]!,
  createdAt: "2026-06-02T12:00:00.000Z",
  address: {
    zipCode: "13015-904",
    street: "Rua Barão de Jaguara",
    number: "1000",
    complement: "apto 12",
    neighborhood: "Centro",
    city: "Campinas",
    state: "SP",
  },
  firstOrderAt: "2026-07-13T12:00:00.000Z",
  averageTicketCents: 12290,
}

/** His history, newest first — a cancelled one among them, which his numbers leave out. */
export const customerOrders: CustomerOrderItem[] = [
  { number: 14, status: "PREPARING", paymentMethod: "PIX", totalCents: 17980, itemsCount: 2, placedAt: "2026-09-20T14:30:00.000Z" },
  { number: 9, status: "CANCELLED", paymentMethod: "MONEY", totalCents: 5990, itemsCount: 1, placedAt: "2026-08-30T12:00:00.000Z" },
  { number: 6, status: "DELIVERED", paymentMethod: "CREDIT_CARD", totalCents: 8990, itemsCount: 1, placedAt: "2026-08-02T12:00:00.000Z" },
  { number: 3, status: "DELIVERED", paymentMethod: "PIX", totalCents: 9900, itemsCount: 3, placedAt: "2026-07-13T12:00:00.000Z" },
]

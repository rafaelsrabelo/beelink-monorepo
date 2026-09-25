// Block
import type { CustomerListItem } from "./customer-types"

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

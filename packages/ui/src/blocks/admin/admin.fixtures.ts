// Block
import type { DashboardNavItem } from "../dashboard/dashboard-types"
import type { WorkspaceOption } from "./admin-types"

/**
 * Fixtures for the admin chrome's stories and tests. No icons here: an icon is a ReactNode, and a
 * `.ts` file that returned JSX would have to be a `.tsx` — the stories add them where they render.
 */
export const sampleAdminNav: DashboardNavItem[] = [
  { title: "Início", href: "/admin/lessari" },
  { title: "Pedidos", href: "/admin/lessari/orders", match: "prefix" },
  { title: "Produtos", href: "/admin/lessari/products", match: "prefix" },
  { title: "Clientes", href: "/admin/lessari/customers", match: "prefix" },
]

/**
 * The same menu with what waits in two of its areas (BEELINK-309): the number, and the words a
 * screen reader hears for it — both built by the screen, which is where the counts and the copy are.
 */
export const sampleAdminNavWithCounts: DashboardNavItem[] = sampleAdminNav.map((item) =>
  item.title === "Pedidos"
    ? { ...item, badge: 3, badgeLabel: "3 em aberto" }
    : item.title === "Clientes"
      ? { ...item, badge: 128, badgeLabel: "128 novos" }
      : item,
)

export const sampleAdminFooterNav: DashboardNavItem[] = [
  { title: "Configurações da loja", href: "/admin/lessari/store" },
]

export const sampleWorkspaces: WorkspaceOption[] = [
  { slug: "lessari", name: "Lessari", logoUrl: null, href: "/admin/lessari" },
  { slug: "doces-da-ana", name: "Doces da Ana", logoUrl: null, href: "/admin/doces-da-ana" },
]

export const sampleAdminUser = { name: "Rafael Rabelo", email: "rafael@beecoders.dev" }

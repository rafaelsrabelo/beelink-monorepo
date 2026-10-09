// Libs
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vitest"

// App
import { CartProvider, useCart } from "./cart-provider"
import { ShopAddressProvider, useShopAddress } from "./shop-address-provider"
import { CART_COOKIE } from "@/lib/cart-cookie"
import { storefrontRoutes } from "@/lib/storefront-routes"

const WORDS = { products: "produtos", categories: "categorias", search: "busca", cart: "carrinho", signIn: "entrar", verifyEmail: "confirmar-email", resetPassword: "nova-senha", account: "conta", accountTabs: { orders: "pedidos", favorites: "favoritos", reviews: "avaliacoes", cashback: "cashback", profile: "perfil", messages: "conversas" } }

/** A component of the shop window as most are: handed the shop's slug and words, and nothing of the request. */
function Probe({ slug }: { slug: string }) {
  const shop = useShopAddress(slug)
  const add = useCart((cart) => cart.add)

  return (
    <>
      <a href={storefrontRoutes({ ...shop, routeWords: WORDS }).cart()}>cart</a>
      <button type="button" onClick={() => add({ productId: "p-1", variantId: null, qty: 1 })}>
        add
      </button>
    </>
  )
}

const cartCookie = () => document.cookie.split("; ").find((entry) => entry.startsWith(`${CART_COOKIE}=`))

afterEach(() => {
  cleanup()
  for (const path of ["/", "/loja"]) document.cookie = `${CART_COOKIE}=; Path=${path}; Max-Age=0`
  window.history.replaceState(null, "", "/")
})

describe("where the shop's pages are, for a component in the browser (BEELINK-283)", () => {
  it("is the shop's own domain under the layout that says so: addresses with no slug, and the cart's cookie on the whole site", async () => {
    window.history.replaceState(null, "", "/produtos")
    render(
      <ShopAddressProvider ownDomain>
        <CartProvider slug="loja" lines={[]}>
          <Probe slug="loja" />
        </CartProvider>
      </ShopAddressProvider>,
    )

    expect(screen.getByRole("link", { name: "cart" }).getAttribute("href")).toBe("/carrinho")
    await userEvent.click(screen.getByRole("button", { name: "add" }))
    // Read back at `/produtos`: a cookie on `/loja` would not be.
    expect(cartCookie()).toBeDefined()
  })

  it("is the platform's host under a layout that says so", async () => {
    window.history.replaceState(null, "", "/loja/produtos")
    render(
      <ShopAddressProvider ownDomain={false}>
        <CartProvider slug="loja" lines={[]}>
          <Probe slug="loja" />
        </CartProvider>
      </ShopAddressProvider>,
    )

    expect(screen.getByRole("link", { name: "cart" }).getAttribute("href")).toBe("/loja/carrinho")
    await userEvent.click(screen.getByRole("button", { name: "add" }))
    expect(cartCookie()).toBeDefined()

    // On the shop's path alone: the site's root does not see it.
    window.history.replaceState(null, "", "/")
    expect(cartCookie()).toBeUndefined()
  })

  /** The panel's design preview draws the shop's blocks with no layout of the shop around them. */
  it("is the platform's host with no layout to say otherwise", () => {
    render(<Probe slug="loja" />)

    expect(screen.getByRole("link", { name: "cart" }).getAttribute("href")).toBe("/loja/carrinho")
  })
})

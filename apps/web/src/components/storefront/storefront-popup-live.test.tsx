// Libs
import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ConsentProvider, useConsent } from "./consent-provider"
import { StorefrontPopupLive, type StorefrontPopupLiveProps } from "./storefront-popup-live"
import { POPUP_MAX_AGE_SECONDS } from "@/lib/popup-cookie"
import { useShopPopup } from "@/stores/shop-popup"

const words = { title: "Ganhe 5% de desconto na primeira compra", text: "Crie sua conta e o desconto é seu.", detail: null, buttonLabel: "Ganhar cupom" }
const props: StorefrontPopupLiveProps = { slug: "loja", notice: "VISITOR", revision: 3, trigger: "ON_ARRIVAL", delaySeconds: 5, words, imageUrl: null, actionHref: "/loja/entrar?modo=criar&voltar=%2Floja", style: {}, messages: ptBR }
const couponWords = { title: "Seu primeiro pedido tem 15% de desconto", text: "Use este cupom no carrinho:", detail: null, buttonLabel: "Usar no carrinho" }
const coupon: StorefrontPopupLiveProps = { ...props, notice: "CUSTOMER", words: couponWords, code: "SEJAMUTANTE", actionHref: "/loja/carrinho?cupom=SEJAMUTANTE" }
const promotion: StorefrontPopupLiveProps = { ...props, notice: "CUSTOMER", words: { ...couponWords, text: "Aplicado automaticamente no seu primeiro pedido. Não precisa de código.", buttonLabel: "Continuar comprando" }, code: null, actionHref: null }

/** Every `document.cookie = …` the page made, as written. */
const written: string[] = []
const dialog = () => screen.queryByRole("dialog", { name: words.title })
const wait = (seconds: number) => act(() => vi.advanceTimersByTime(seconds * 1000))
const press = (name: string) => fireEvent.click(screen.getByRole("button", { name }))

function Answer() {
  const refuse = useConsent((consent) => consent.refuse)
  const ask = useConsent((consent) => consent.ask)
  return (
    <>
      <button type="button" onClick={refuse}>recusar</button>
      <button type="button" onClick={ask}>perguntar de novo</button>
    </>
  )
}

beforeEach(() => {
  vi.useFakeTimers()
  written.length = 0
  vi.spyOn(document, "cookie", "set").mockImplementation((value) => void written.push(value))
  useShopPopup.setState({ open: {}, shown: {} })
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("StorefrontPopupLive", () => {
  it("opens after the shop's delay, as a dialog that leads to the shop's sign-up with the way back", () => {
    render(<StorefrontPopupLive {...props} />)
    expect(dialog()).toBeNull()

    wait(5)
    expect(dialog()).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Ganhar cupom" })).toHaveAttribute("href", "/loja/entrar?modo=criar&voltar=%2Floja")
  })

  it("writes nothing by opening: a pop-up left open was never dismissed", () => {
    render(<StorefrontPopupLive {...props} />)

    wait(5)
    expect(written).toEqual([])
  })

  describe("closed", () => {
    it("remembers its revision on the shop's own path for thirty days, and is gone", () => {
      render(<StorefrontPopupLive {...props} />)
      wait(5)

      press("Fechar")
      expect(written).toEqual([`bl_popup=3; Path=/loja; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax`])
      expect(dialog()).toBeNull()
    })

    it("remembers on Escape too", () => {
      render(<StorefrontPopupLive {...props} />)
      wait(5)

      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })
      expect(written).toHaveLength(1)
      expect(dialog()).toBeNull()
    })

    it("does not come back while the page lives — not later, not on a redraw, not on another page of the shop", () => {
      const view = render(<StorefrontPopupLive {...props} />)
      wait(5)
      press("Fechar")

      wait(120)
      expect(dialog()).toBeNull()

      // The next page of the shop mounts its own, in the same tab.
      view.unmount()
      render(<StorefrontPopupLive {...props} actionHref="/loja/entrar?modo=criar&voltar=%2Floja%2Fbusca" />)
      wait(120)
      expect(dialog()).toBeNull()
      expect(written).toHaveLength(1)
    })
  })

  it("remembers when its button is pressed, the same way", () => {
    render(<StorefrontPopupLive {...props} revision={9} />)
    wait(5)

    const link = screen.getByRole("link", { name: "Ganhar cupom" })
    link.addEventListener("click", (event) => event.preventDefault())
    fireEvent.click(link)
    expect(written).toEqual([`bl_popup=9; Path=/loja; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax`])
  })

  it("is one shop's: another shop's pop-up, already seen in this tab, does not stop this one", () => {
    useShopPopup.getState().show("vizinha")
    render(<StorefrontPopupLive {...props} />)

    wait(5)
    expect(dialog()).toBeInTheDocument()
  })

  describe("at a shop that asks about cookies", () => {
    const shop = (choice: "granted" | "denied" | null) =>
      render(
        <ConsentProvider slug="loja" choice={choice}>
          <Answer />
          <StorefrontPopupLive {...props} />
        </ConsentProvider>,
      )

    it("waits while the question is unanswered, however long", () => {
      shop(null)

      wait(600)
      expect(dialog()).toBeNull()
      expect(written).toEqual([])
    })

    it("starts its wait, whole, once the visitor answers — it does not open on the click", () => {
      shop(null)
      wait(60)

      press("recusar")
      expect(dialog()).toBeNull()
      wait(4)
      expect(dialog()).toBeNull()
      wait(1)
      expect(dialog()).toBeInTheDocument()
    })

    it("does not wait for a visitor who answered on an earlier page, yes or no", () => {
      const refused = shop("denied")
      wait(5)
      expect(dialog()).toBeInTheDocument()
      refused.unmount()

      useShopPopup.setState({ open: {}, shown: {} })
      shop("granted")
      wait(5)
      expect(dialog()).toBeInTheDocument()
    })

    it("holds again if the visitor reopens the question before it opened", () => {
      shop("denied")
      wait(2)

      press("perguntar de novo")
      wait(60)
      expect(dialog()).toBeNull()
    })
  })

  it("is not left marked open when the page takes it away while it is open", () => {
    const view = render(<StorefrontPopupLive {...props} />)
    wait(5)

    view.unmount()
    expect(useShopPopup.getState().open).toEqual({})
  })

  describe("as the coupon of a customer who never ordered (BEELINK-310)", () => {
    const couponDialog = () => screen.queryByRole("dialog", { name: couponWords.title })

    it("opens after the shop's delay, by the same trigger, with the code and the cart that applies it", () => {
      render(<StorefrontPopupLive {...coupon} />)
      wait(4)
      expect(couponDialog()).toBeNull()

      wait(1)
      expect(couponDialog()).toBeInTheDocument()
      expect(document.querySelector("[data-popup-code]")).toHaveTextContent("SEJAMUTANTE")
      expect(screen.getByRole("link", { name: "Usar no carrinho" })).toHaveAttribute("href", "/loja/carrinho?cupom=SEJAMUTANTE")
      expect(written).toEqual([])
    })

    it("closed, remembers the customer notice's version — a number, and nothing about the person", () => {
      render(<StorefrontPopupLive {...coupon} />)
      wait(5)

      press("Fechar")
      expect(written).toEqual([`bl_popup=1000000003; Path=/loja; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax`])
      expect(couponDialog()).toBeNull()
    })

    it("remembers on Escape, and when the way to the cart is pressed", () => {
      const first = render(<StorefrontPopupLive {...coupon} />)
      wait(5)
      fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" })
      expect(written).toHaveLength(1)
      first.unmount()

      useShopPopup.setState({ open: {}, shown: {} })
      render(<StorefrontPopupLive {...coupon} revision={8} />)
      wait(5)
      const link = screen.getByRole("link", { name: "Usar no carrinho" })
      link.addEventListener("click", (event) => event.preventDefault())
      fireEvent.click(link)
      expect(written[1]).toBe(`bl_popup=1000000008; Path=/loja; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax`)
    })

    it("for a promotion, its one button closes it and is remembered the same way", () => {
      render(<StorefrontPopupLive {...promotion} />)
      wait(5)
      expect(screen.queryByRole("link")).toBeNull()

      press("Continuar comprando")
      expect(couponDialog()).toBeNull()
      expect(written).toEqual([`bl_popup=1000000003; Path=/loja; Max-Age=${POPUP_MAX_AGE_SECONDS}; SameSite=Lax`])
    })

    it("opens once in a page's life", () => {
      render(<StorefrontPopupLive {...coupon} />)
      wait(5)
      press("Fechar")

      wait(600)
      expect(couponDialog()).toBeNull()
      expect(written).toHaveLength(1)
    })

    it("waits behind an unanswered cookie question, and starts its wait whole once it is answered", () => {
      render(
        <ConsentProvider slug="loja" choice={null}>
          <Answer />
          <StorefrontPopupLive {...coupon} />
        </ConsentProvider>,
      )
      wait(600)
      expect(couponDialog()).toBeNull()

      press("recusar")
      wait(4)
      expect(couponDialog()).toBeNull()
      wait(1)
      expect(couponDialog()).toBeInTheDocument()
    })
  })

  // BEELINK-306 adds no event: what a pop-up does is told to nobody.
  it("reaches neither the pixel nor the funnel: nothing of the pop-up names the tracking", () => {
    const here = join(process.cwd(), "src/components/storefront")
    const sources = ["storefront-popup-live.tsx", "use-popup-trigger.ts"].map((file) => readFileSync(join(here, file), "utf8"))

    for (const source of sources) expect(source).not.toMatch(/useTrack|meta-pixel|funnel-count|fbq|storefront-track/)
    expect(readdirSync(join(here, "tracking")).filter((file) => /popup/i.test(file))).toEqual([])
  })
})

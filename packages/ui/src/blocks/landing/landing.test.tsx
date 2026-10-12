// Libs
import { render, screen, within } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LandingBanners } from "./landing-banners"
import { LandingCouriers } from "./landing-couriers"
import { LandingCta } from "./landing-cta"
import { LandingEcosystem } from "./landing-ecosystem"
import { LandingFaq } from "./landing-faq"
import { LandingFooter } from "./landing-footer"
import { LANDING_ANCHORS, LandingHeader } from "./landing-header"
import { LandingHero } from "./landing-hero"
import { LandingIntegrations } from "./landing-integrations"
import { LandingPlans } from "./landing-plans"
import { examplePlanPrices } from "./landing-plans.fixtures"
import { LandingShell } from "./landing-shell"
import { LandingSteps } from "./landing-steps"
import { LandingTitle } from "./landing-title"

const hrefs = { loginHref: "/login", signupHref: "/signup", termsHref: "/termos", privacyHref: "/privacidade" }
const photos = {
  store: <img src="/loja.jpg" alt="" />,
  panel: <img src="/painel.jpg" alt="O painel no notebook" />,
  shipping: <img src="/entrega.jpg" alt="" />,
}
const logos = {
  asaas: <img src="/asaas.png" alt="Logo do Asaas" />,
  melhorEnvio: <img src="/melhor-envio.png" alt="Logo do Melhor Envio" />,
  googleAnalytics: <img src="/google-analytics.svg" alt="Logo do Google Analytics" />,
  meta: <img src="/meta.svg" alt="Logo da Meta" />,
}

// jsdom has no ResizeObserver, and the banners' row watches its own size.
beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function Page() {
  return (
    <LandingShell>
      <LandingHeader {...hrefs} />
      <main>
        <LandingHero signupHref={hrefs.signupHref} trialDays={examplePlanPrices.trialDays} />
        <LandingBanners signupHref={hrefs.signupHref} photos={photos} />
        <LandingEcosystem />
        <LandingIntegrations logos={logos} />
        <LandingSteps />
        <LandingPlans prices={examplePlanPrices} locale="pt-BR" signupHref={hrefs.signupHref} />
        <LandingCouriers termsHref={hrefs.termsHref} privacyHref={hrefs.privacyHref} />
        <LandingFaq prices={examplePlanPrices} locale="pt-BR" />
        <LandingCta signupHref={hrefs.signupHref} trialDays={examplePlanPrices.trialDays} />
      </main>
      <LandingFooter termsHref={hrefs.termsHref} privacyHref={hrefs.privacyHref} year={2026} />
    </LandingShell>
  )
}

describe("LandingTitle", () => {
  it("is one sentence to a reader, in two weights, and the yellow full stop is not read", () => {
    render(<LandingTitle as="h1" light="Tudo o que o seu" strong="e-commerce precisa" />)

    const title = screen.getByRole("heading", { level: 1, name: "Tudo o que o seu e-commerce precisa" })
    expect(title.querySelector("[aria-hidden='true']")).toHaveTextContent(".")
  })

  /** At these sizes a browser breaks "e-commerce" at its hyphen, and leaves "e-" at a line's end. */
  it("never breaks inside a word", () => {
    render(<LandingTitle light="Seu e-commerce." strong="Conectado" />)

    expect(screen.getByText("e-commerce.")).toHaveClass("whitespace-nowrap")
  })

  it("puts the heavy line first, and drops the full stop, when asked", () => {
    render(<LandingTitle light="Três formas de crescer." strong="Uma plataforma." strongFirst dot={false} />)

    const title = screen.getByRole("heading", { level: 2 })
    expect(title).toHaveTextContent("Uma plataforma. Três formas de crescer.")
    expect(title.querySelector("[aria-hidden='true']")).toBeNull()
  })
})

describe("LandingHeader", () => {
  /** Six of the seven sections: "Planos" stands where "Perguntas" stood, which the menu and the footer still lead to. */
  it("leads to six sections in the page's order, to the sign-in and to the sign-up", () => {
    render(<LandingHeader {...hrefs} />)

    const nav = screen.getByRole("navigation", { name: "Principal" })
    expect(within(nav).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["#solucoes", "#ecossistema", "#integracoes", "#como", "#planos", "#entregadores"])
    expect(screen.getByRole("link", { name: "Beelink, início" })).toHaveAttribute("href", "/")
    // Twice each: in the bar, and in the menu a narrow screen opens.
    expect(screen.getAllByRole("link", { name: "Entrar" }).map((link) => link.getAttribute("href"))).toEqual(["/login", "/login"])
    expect(screen.getAllByRole("link", { name: "Criar minha loja" }).map((link) => link.getAttribute("href"))).toEqual(["/signup", "/signup"])
  })

  /**
   * Measured in a browser, which jsdom cannot do: at 1280px, where the links first show, the six and
   * the two ways in leave 46px under a classic scrollbar with these gaps — and a seventh, "Perguntas"
   * with its gap, asks for 89. With the design's wider gaps "Criar minha loja" ran past the page's
   * column, and the shell clipped it.
   */
  it("keeps its six links close enough to fit beside the two ways in at the width they first show", () => {
    render(<LandingHeader {...hrefs} />)

    const nav = screen.getByRole("navigation", { name: "Principal" })
    expect(nav).toHaveClass("hidden", "xl:flex", "gap-4", "min-[90rem]:gap-6", "whitespace-nowrap")
    expect(nav.closest("header")).toHaveClass("gap-6", "min-[90rem]:gap-9")
    expect(nav.closest("header")?.className).not.toMatch(/xl:gap-/)
    expect(within(nav).getAllByRole("link")).toHaveLength(6)
  })

  /** On a wide screen the legal texts are in the footer; on a phone the menu is where they are within reach. */
  it("keeps a menu for the narrow screen: every section, the terms, the privacy policy and the two ways in", () => {
    render(<LandingHeader {...hrefs} />)

    const menu = screen.getByRole("navigation", { name: "Menu" }).closest("details")!
    expect(menu).toHaveClass("xl:hidden")
    expect(menu.querySelector("summary")).toHaveAccessibleName("Menu")
    expect(within(menu).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Soluções", "#solucoes"],
      ["Ecossistema", "#ecossistema"],
      ["Integrações", "#integracoes"],
      ["Como funciona", "#como"],
      ["Planos", "#planos"],
      ["Para entregadores", "#entregadores"],
      ["Perguntas", "#perguntas"],
      ["Termos de uso", "/termos"],
      ["Política de privacidade", "/privacidade"],
      ["Entrar", "/login"],
      ["Criar minha loja", "/signup"],
    ])
  })

  it("says everything in the language it is handed", () => {
    render(<LandingHeader {...hrefs} messages={en} />)

    expect(screen.getAllByRole("link", { name: "Sign in" })).toHaveLength(2)
    expect(screen.getByRole("link", { name: "Privacy policy" })).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument()
  })
})

describe("LandingHero", () => {
  it("says what Beelink is in the page's one h1, and offers the way in and the way down", () => {
    render(<LandingHero signupHref="/signup" trialDays={14} />)

    expect(screen.getByRole("heading", { level: 1, name: "Tudo o que o seu e-commerce precisa" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Começar agora" })).toHaveAttribute("href", "/signup")
    expect(screen.getByRole("link", { name: "Ver soluções" })).toHaveAttribute("href", "#solucoes")
  })

  /** The trial is the plan's own sentence, with the days it is handed: under the two buttons, which keep their words. */
  it("says the free trial under the way in, for as many days as it is handed", () => {
    const { rerender } = render(<LandingHero signupHref="/signup" trialDays={14} />)

    const trial = screen.getByText("14 dias grátis, sem cartão")
    expect(trial.previousElementSibling).toContainElement(screen.getByRole("link", { name: "Começar agora" }))

    rerender(<LandingHero signupHref="/signup" trialDays={30} messages={en} />)
    expect(screen.getByText("30 days free, no card")).toBeInTheDocument()
  })

  /** The ecosystem's own section is where the five are said: the hub is its picture. */
  it("draws the hub as a picture: a reader is not told the five twice", () => {
    const { container } = render(<LandingHero signupHref="/signup" trialDays={14} />)

    const hub = screen.getByText("eMarketing").closest<HTMLElement>("[aria-hidden='true']")!
    expect(hub).not.toBeNull()
    expect(container.querySelectorAll("[aria-hidden='true']")).toContain(hub)
    // `hidden`: without it the query skips what a reader is not told, and finds nothing whatever is there.
    expect(within(hub).queryAllByRole("link", { hidden: true })).toHaveLength(0)
    expect(within(hub).queryAllByRole("button", { hidden: true })).toHaveLength(0)
  })
})

describe("LandingBanners", () => {
  it("holds the shop's banner, the panel's photo it is handed, and the deliveries' banner", () => {
    render(<LandingBanners signupHref="/signup" photos={photos} />)

    const row = screen.getByRole("group", { name: "Destaques" })
    expect(within(row).getAllByRole("listitem").filter((item) => item.parentElement?.parentElement === row)).toHaveLength(3)
    expect(within(row).getByRole("heading", { level: 3, name: "Sua loja no ar hoje mesmo." })).toBeInTheDocument()
    expect(within(row).getByRole("heading", { level: 3, name: "Sua loja inteira num painel só" })).toBeInTheDocument()
    expect(within(row).getByText("Pedidos, produtos, clientes e conversas no mesmo lugar, no computador e no celular.")).toBeInTheDocument()
    expect(within(row).getByRole("link", { name: "Criar minha loja" })).toHaveAttribute("href", "/signup")
    expect(within(row).getByRole("link", { name: "Quero ser entregador" })).toHaveAttribute("href", "#entregadores")
  })

  /** No banner rises any more: what answers the pointer is the photograph behind its words, inside a frame that clips it and stands still. */
  it("lays a photo behind each banner's words, and brings it closer under the pointer instead of moving the banner", () => {
    const { container } = render(<LandingBanners signupHref="/signup" photos={photos} />)

    const banners = [...container.querySelectorAll("article")]
    expect(banners.map((banner) => banner.querySelector("img")?.getAttribute("src"))).toEqual(["/loja.jpg", "/painel.jpg", "/entrega.jpg"])
    for (const banner of banners) {
      expect(banner).toHaveClass("group", "relative", "isolate", "overflow-hidden")
      expect(banner.className).not.toContain("translate-y")
      const picture = banner.querySelector("img")?.parentElement
      expect(picture).toHaveClass("transition-transform", "motion-safe:group-hover:scale-[1.06]")
      // Under the words, and under a scrim of the banner's own ground.
      expect(picture?.parentElement).toHaveClass("absolute", "-z-10", "overflow-hidden")
      expect(picture?.nextElementSibling?.className).toMatch(/bg-linear-to-/)
    }
  })

  it("gives the panel twice the room on a wide screen, its photo beside its words", () => {
    render(<LandingBanners signupHref="/signup" photos={photos} />)

    const banner = screen.getByRole("img", { name: "O painel no notebook" }).closest("article")
    expect(banner?.parentElement?.className).toContain("xl:w-[min(1218px,calc(100vw-8rem))]")
    expect(banner?.firstElementChild).toHaveClass("inset-x-0", "top-0", "xl:left-[30%]", "xl:h-full")
  })

  it("names the panel in the language it is handed", () => {
    render(<LandingBanners signupHref="/signup" photos={photos} messages={en} />)

    expect(screen.getByRole("heading", { level: 3, name: "Your whole shop in one panel" })).toBeInTheDocument()
  })

  it("offers an example shop only when there is one to offer", () => {
    const { rerender } = render(<LandingBanners signupHref="/signup" photos={photos} />)
    expect(screen.queryByRole("link", { name: "Ver uma loja de exemplo" })).not.toBeInTheDocument()

    rerender(<LandingBanners signupHref="/signup" exampleHref="/loja-exemplo" photos={photos} />)
    expect(screen.getByRole("link", { name: "Ver uma loja de exemplo" })).toHaveAttribute("href", "/loja-exemplo")
  })
})

describe("LandingEcosystem", () => {
  it("lists the five parts once, each with what it is", () => {
    render(<LandingEcosystem />)

    const section = screen.getByRole("heading", { level: 2, name: "Seu e-commerce. Conectado" }).closest("section")!
    expect(within(section).getAllByRole("listitem").map((item) => item.textContent)).toEqual([
      "STORESua loja online.",
      "CHATConecte-se com seus clientes.",
      "CHECKOUTVenda com uma experiência simples.",
      "ENVIOSSua operação de entrega.",
      "eMARKETINGTransforme clientes em vendas.",
    ])
  })
})

describe("LandingSteps", () => {
  it("says the three steps as an ordered list; the big numbers are drawn, not read", () => {
    render(<LandingSteps />)

    const steps = within(screen.getByRole("list")).getAllByRole("listitem")
    expect(steps.map((step) => within(step).getByRole("heading", { level: 3 }).textContent)).toEqual(["Crie sua conta", "Monte a vitrine", "Venda e entregue"])
    expect(screen.getByRole("list").tagName).toBe("OL")
    expect(screen.getByText("01", { exact: false, selector: "li > span" })).toHaveAttribute("aria-hidden", "true")
  })
})

describe("LandingCouriers", () => {
  it("says what delivering would be, the sign-up's four steps, and holds the form", () => {
    render(<LandingCouriers termsHref="/termos" privacyHref="/privacidade" />)

    expect(screen.getByRole("heading", { level: 2, name: "Entregue com a Beelink" })).toBeInTheDocument()
    expect(screen.getByText("Ganhos à vista")).toBeInTheDocument()
    const flow = screen.getByRole("heading", { level: 3, name: "Como funciona o cadastro" }).nextElementSibling!
    expect(within(flow as HTMLElement).getAllByRole("listitem").map((step) => step.textContent)).toEqual(["1Cadastro", "2Documentos", "3Aprovação", "4Primeiras entregas"])
    expect(screen.getByRole("form", { name: "Comece seu cadastro" })).toBeInTheDocument()
  })

  /** A public page shows no "[confirmar]": what the design left open is left out. */
  it.each([
    ["pt-BR", undefined],
    ["en", en],
  ])("shows nothing the design marked as still to confirm, in %s", (_, messages) => {
    const { container } = render(
      <>
        <LandingBanners signupHref="/signup" photos={photos} messages={messages} />
        <LandingCouriers termsHref="/termos" privacyHref="/privacidade" messages={messages} />
        <LandingFaq prices={examplePlanPrices} locale="pt-BR" messages={messages} />
        <LandingFooter termsHref="/termos" privacyHref="/privacidade" year={2026} messages={messages} />
      </>,
    )

    expect(container.textContent).not.toMatch(/\[|\]/)
  })
})

describe("LandingFaq", () => {
  it("marks each question by whose it is, the shopkeeper's first, with every answer in the page", () => {
    const { container } = render(<LandingFaq prices={examplePlanPrices} locale="pt-BR" />)

    const questions = [...container.querySelectorAll("details")]
    expect(questions.map((question) => question.querySelector("summary")!.textContent)).toEqual([
      "LojistaPreciso de site ou desenvolvedor?",
      "LojistaComo recebo os pedidos?",
      "LojistaPosso usar meus próprios entregadores?",
      "LojistaQuanto custa?",
      "LojistaComo funciona o teste de 14 dias?",
      "LojistaO que acontece quando o teste acaba?",
      "EntregadorQuem pode se cadastrar como entregador?",
      "EntregadorQuanto tempo leva a aprovação?",
      "EntregadorComo recebo pelos serviços?",
    ])
    expect(questions.every((question) => (question.querySelector("p")?.textContent ?? "").length > 20)).toBe(true)
  })

  /**
   * The prices handed over here are not Beelink's (see the fixture): an amount or a trial typed into
   * an answer would stand beside them. Every figure the answers say is one the plan's own card says.
   */
  it("answers what the plan costs and how its trial works from the prices it is handed, and writes none", () => {
    const { container } = render(<LandingFaq prices={examplePlanPrices} locale="pt-BR" />)
    const answerTo = (question: string) => (screen.getByText(question).closest("details")?.querySelector("p")?.textContent ?? "").replace(/\u00a0/g, " ")

    expect(answerTo("Quanto custa?")).toBe(
      "O plano Beelink custa R$ 100,00 por mês. Pagando 6 meses de uma vez sai por R$ 540,00, que dá R$ 90,00 por mês; pagando o ano, R$ 960,00, que dá R$ 80,00 por mês. O plano com a Beelia ainda não está disponível e vai custar R$ 150,00 por mês.",
    )
    expect(answerTo("Como funciona o teste de 14 dias?")).toBe("Você cria a conta e usa a loja e o painel por 14 dias sem pagar nada. Não pedimos cartão no cadastro.")
    expect(answerTo("O que acontece quando o teste acaba?")).toBe("Passados os 14 dias, a conta fica travada até você escolher um plano e pagar. Nada é cobrado sozinho.")

    const page = (container.textContent ?? "").replace(/\u00a0/g, " ")
    expect([...new Set(page.match(/R\$ ?[\d.]+,\d{2}/g))].sort()).toEqual(["R$ 100,00", "R$ 150,00", "R$ 540,00", "R$ 80,00", "R$ 90,00", "R$ 960,00"])
    expect([...new Set(page.match(/\d+ dias/g))]).toEqual(["14 dias"])
  })

  it.each([
    ["pt-BR", undefined],
    ["en", en],
  ])("leaves no placeholder unfilled, in %s", (locale, messages) => {
    const { container } = render(<LandingFaq prices={examplePlanPrices} locale={locale} messages={messages} />)

    expect(container.textContent).not.toMatch(/[{}]/)
  })
})

describe("LandingCta", () => {
  it("calls for the shop first, and points a courier to their section", () => {
    render(<LandingCta signupHref="/signup" trialDays={14} />)

    expect(screen.getByRole("heading", { level: 2, name: "Seu e-commerce começa hoje." })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Criar minha loja" })).toHaveAttribute("href", "/signup")
    expect(screen.getByRole("link", { name: "Quero ser entregador" })).toHaveAttribute("href", "#entregadores")
  })

  it("says the free trial under its heading, for as many days as it is handed", () => {
    const { rerender } = render(<LandingCta signupHref="/signup" trialDays={14} />)

    expect(screen.getByRole("heading", { level: 2 }).nextElementSibling).toHaveTextContent("14 dias grátis, sem cartão")

    rerender(<LandingCta signupHref="/signup" trialDays={30} messages={en} />)
    expect(screen.getByText("30 days free, no card")).toBeInTheDocument()
  })
})

describe("LandingFooter", () => {
  it("leads only to what exists: the solutions' section, the integrations', the couriers' sign-up, the questions and the two legal texts", () => {
    render(<LandingFooter termsHref="/termos" privacyHref="/privacidade" year={2026} />)

    expect(within(screen.getByRole("navigation", { name: "Soluções" })).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Store", "#ecossistema"],
      ["Checkout", "#ecossistema"],
      ["Chat", "#ecossistema"],
      ["Envios", "#ecossistema"],
      ["eMarketing", "#ecossistema"],
      ["Integrações", "#integracoes"],
    ])
    expect(within(screen.getByRole("navigation", { name: "Entregadores" })).getByRole("link", { name: "Cadastro" })).toHaveAttribute("href", "#entregadores")
    // The questions' link is the wide screen's only one: its header shows six sections, and they are the seventh.
    expect(within(screen.getByRole("navigation", { name: "Empresa" })).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Perguntas", "#perguntas"],
      ["Termos de uso", "/termos"],
      ["Privacidade", "/privacidade"],
    ])
    expect(screen.getByText("© 2026 Beelink")).toBeInTheDocument()
    // No link leads nowhere.
    expect(screen.getAllByRole("link").every((link) => (link.getAttribute("href") ?? "#") !== "#")).toBe(true)
  })
})

describe("the landing page, whole", () => {
  it("wears the brand's own typeface, handed over by the screen", () => {
    const { container } = render(<Page />)

    expect((container.firstElementChild as HTMLElement).style.fontFamily).toBe("var(--font-brand, inherit)")
  })

  /** Every link down the page — the header's, the hero's, the banners', the footer's — is one of these. */
  it("has a section behind every anchor its links point at", () => {
    const { container } = render(<Page />)

    for (const anchor of Object.values(LANDING_ANCHORS)) expect(container.querySelector(anchor), anchor).not.toBeNull()
    const links = [...container.querySelectorAll("a[href^='#']")].map((link) => link.getAttribute("href")!)
    expect(links.length).toBeGreaterThan(8)
    for (const href of links) expect(container.querySelector(href), href).not.toBeNull()
  })

  /** The rule that makes the anchors travel is on the document, in `globals.css`, and asks for this. */
  it("asks the document to travel to its anchors rather than cut to them", () => {
    const { container } = render(<Page />)

    expect(container.firstElementChild).toHaveAttribute("data-smooth-anchors")
  })

  it("has one h1, and a heading for every section under it", () => {
    render(<Page />)

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Uma plataforma. Três formas de crescer com a Beelink.",
      "Seu e-commerce. Conectado.",
      "Conecte a loja às suas contas.",
      "Do cadastro à primeira venda.",
      "Escolha o seu plano.",
      "Entregue com a Beelink.",
      "Perguntas frequentes.",
      "Seu e-commerce começa hoje.",
    ])
  })

  /** The header's links are in the page's own order: a reader who follows them one by one only travels down. */
  it("lays its sections in the order the header names them", () => {
    const { container } = render(<Page />)

    const sections = [...container.querySelectorAll("main > section[id]")].map((section) => `#${section.id}`)
    expect(sections).toEqual(Object.values(LANDING_ANCHORS))
    expect(sections.slice(1, 6)).toEqual(["#ecossistema", "#integracoes", "#como", "#planos", "#entregadores"])
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Page />)

    await expectNoA11yViolations(container)
  })
})

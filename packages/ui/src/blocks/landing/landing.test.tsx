// React
import type { ReactNode } from "react"

// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Locales
import { en, ptBR } from "@harness-monorepo/ui/locales/index"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { LandingBanners } from "./landing-banners"
import { LandingConsent } from "./landing-consent"
import { LandingCourierForm } from "./landing-courier-form"
import { LandingCouriers } from "./landing-couriers"
import { LandingCta } from "./landing-cta"
import { LandingEcosystem } from "./landing-ecosystem"
import { LandingFaq } from "./landing-faq"
import { LandingFooter } from "./landing-footer"
import { LandingFooterAction } from "./landing-footer-action"
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

/** The courier's form as the page hands it to its section: wired to nothing here. */
const courierForm = (messages = ptBR) => <LandingCourierForm termsHref={hrefs.termsHref} privacyHref={hrefs.privacyHref} text={messages.landing.couriers.form} onSubmit={() => {}} />

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

function Page({ notice, cookies }: { notice?: ReactNode; cookies?: ReactNode }) {
  return (
    <LandingShell notice={notice}>
      <LandingHeader {...hrefs} />
      <main>
        <LandingHero signupHref={hrefs.signupHref} trialDays={examplePlanPrices.trialDays} />
        <LandingBanners signupHref={hrefs.signupHref} photos={photos} />
        <LandingEcosystem />
        <LandingIntegrations logos={logos} />
        <LandingSteps />
        <LandingPlans prices={examplePlanPrices} locale="pt-BR" signupHref={hrefs.signupHref} />
        <LandingCouriers form={courierForm()} />
        <LandingFaq prices={examplePlanPrices} locale="pt-BR" />
        <LandingCta signupHref={hrefs.signupHref} trialDays={examplePlanPrices.trialDays} />
      </main>
      <LandingFooter termsHref={hrefs.termsHref} privacyHref={hrefs.privacyHref} year={2026} cookies={cookies} />
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
  const FORM = "Dê o primeiro passo para entregar com a Beelink"

  it("says what delivering would be in one heading and four advantages, and holds the form it is handed", () => {
    const { container } = render(<LandingCouriers form={courierForm()} />)

    // The stop is the sentence's own here: the heading's drawn one is yellow, and so is the ground.
    expect(screen.getByRole("heading", { level: 2, name: "Entregue com a Beelink." })).toBeInTheDocument()
    expect(screen.getByText("Para entregadores")).toBeInTheDocument()
    expect([...container.querySelectorAll("section ul > li")].map((perk) => perk.textContent)).toEqual(["Entregas na sua região", "Você aceita ou recusa", "Faça seu horário", "Ganhos à vista no app"])
    expect(screen.getByRole("form", { name: FORM })).toBeInTheDocument()
  })

  /** BEELINK-329: a yellow band, where a black section stood over a photograph. */
  it("is yellow from edge to edge — the section's own from lg, the words' alone on a phone — with no photograph", () => {
    const { container } = render(<LandingCouriers form={courierForm()} />)
    const section = container.querySelector("#entregadores")!

    expect(section).toHaveClass("lg:bg-brand-yellow")
    expect(section).not.toHaveClass("bg-brand-ink")
    expect(screen.getByText("Para entregadores").parentElement).toHaveClass("bg-brand-yellow", "lg:bg-transparent")
    expect(container.querySelector("img")).toBeNull()
  })

  it("draws the bag with the logo's own artwork, beside the heading or between the words and the card, and tells a reader of neither", () => {
    const { container } = render(<LandingCouriers form={courierForm()} />)
    // The logo's bag alone: its own box, which the name lies outside of.
    const bags = [...container.querySelectorAll("section svg")].filter((drawing) => drawing.getAttribute("viewBox") === "0 0 566 542")

    expect(bags).toHaveLength(2)
    for (const bag of bags) expect(bag).toHaveAttribute("aria-hidden", "true")
    // One of the two at any width: the small one leaves where the big one arrives.
    expect(bags.map((bag) => bag.getAttribute("class"))).toEqual([expect.stringContaining("xl:hidden"), expect.stringMatching(/(^| )hidden .*xl:block/)])
  })

  it("keeps the sign-up's four steps for a phone alone, as an ordered list under the card", () => {
    render(<LandingCouriers form={courierForm()} />)
    const flow = screen.getByRole("heading", { level: 3, name: "Como funciona" }).nextElementSibling as HTMLElement

    expect(flow.tagName).toBe("OL")
    expect(within(flow).getAllByRole("listitem").map((step) => step.textContent)).toEqual(["1Cadastro", "2Documentos", "3Aprovação", "4Entregas"])
    expect(flow.parentElement).toHaveClass("lg:hidden")
    expect(screen.getByRole("form", { name: FORM }).compareDocumentPosition(flow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  /** The sign-up is open, and for one city: the section's one line says so, in both languages, the city in bold. */
  it.each([
    ["pt-BR", ptBR, "Pedidos de lojas perto de você, no seu horário. Por enquanto, só em Fortaleza/CE."],
    ["en", en, "Orders from shops near you, on your own hours. For now, only in Fortaleza/CE."],
  ] as const)("says the sign-up is for Fortaleza only today, in %s", (_, messages, lead) => {
    const { container } = render(<LandingCouriers form={courierForm(messages)} messages={messages} />)
    const line = container.querySelector("section p")!

    expect(line).toHaveTextContent(lead)
    expect(line.querySelector("b")).toHaveTextContent("Fortaleza/CE")
  })

  /**
   * What the form said while it sent nothing, and the two minutes it promised. And no e-mail is
   * promised any more (BEELINK-329): the first step asks for none, so nothing can arrive at one.
   */
  it.each([
    ["pt-BR", ptBR],
    ["en", en],
  ] as const)("no longer says nothing was sent or that it takes two minutes, and promises no e-mail, in %s", (_, messages) => {
    const said = JSON.stringify([messages.landing.couriers, messages.landing.faq.courier])

    expect(said).not.toMatch(/Nada foi enviado|não saíram deste aparelho|Leva 2 minutos|ainda não está aberto|abre em breve/)
    expect(said).not.toMatch(/Nothing was sent|did not leave this device|takes 2 minutes|is not open yet|opens soon/)
    expect(said).not.toMatch(/por e-mail|no seu e-mail|by e-mail/i)
    expect(said).toMatch(/WhatsApp/)
  })

  /** A public page shows no "[confirmar]": what the design left open is left out. */
  it.each([
    ["pt-BR", undefined],
    ["en", en],
  ])("shows nothing the design marked as still to confirm, in %s", (_, messages) => {
    const { container } = render(
      <>
        <LandingBanners signupHref="/signup" photos={photos} messages={messages} />
        <LandingCouriers form={courierForm(messages ?? ptBR)} messages={messages} />
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
      "LojistaPosso ter mais de uma página?",
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
      "O plano Beelink custa R$ 100,00 por mês, por página criada. Pagando 6 meses de uma vez sai por R$ 540,00, que dá R$ 90,00 por mês; pagando o ano, R$ 960,00, que dá R$ 80,00 por mês. O plano com a Beelia ainda não está disponível e vai custar R$ 150,00 por mês.",
    )
    expect(answerTo("Como funciona o teste de 14 dias?")).toBe("Você cria a conta e usa a loja e o painel por 14 dias sem pagar nada. Não pedimos cartão no cadastro. Cada página que você cria tem os seus 14 dias.")
    expect(answerTo("O que acontece quando o teste acaba?")).toBe("Passados os 14 dias, a página fica travada até você escolher um plano e pagar. Nada é cobrado sozinho.")
    expect(answerTo("Posso ter mais de uma página?")).toBe("Pode. Cada página tem o seu próprio link, e o plano é por página criada: cada uma tem os seus 14 dias grátis e o seu plano.")

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

  // BEELINK-319: "Cookies" is the screen's to hand over, and only a site that asks hands one.
  it("has no way back to a cookie choice unless the screen hands it one", () => {
    render(<LandingFooter termsHref="/termos" privacyHref="/privacidade" year={2026} />)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
    expect(screen.queryByText("Cookies")).not.toBeInTheDocument()
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

  /**
   * The prices live in the app, in one place, and this page is handed others that are not Beelink's
   * (see the fixture). So an amount, a share or a trial typed into any block or any sentence of the
   * landing would stand here beside the ones worked out from them.
   */
  it("says no amount, share or trial but the ones worked out from the prices it was handed", () => {
    const { container } = render(<Page />)
    const page = (container.textContent ?? "").replace(/\u00a0/g, " ")

    expect([...new Set(page.match(/R\$ ?[\d.]+,\d{2}/g))].sort()).toEqual(["R$ 100,00", "R$ 150,00", "R$ 240,00", "R$ 540,00", "R$ 60,00", "R$ 80,00", "R$ 90,00", "R$ 960,00"])
    expect([...new Set(page.match(/\d+ ?%/g))].sort()).toEqual(["10%", "20%"])
    expect([...new Set(page.match(/\d+ dias/g))]).toEqual(["14 dias"])
    expect(page).not.toMatch(/[{}]/)
  })

  // The whole page under axe: half a second on a desk, and past the default five on CI's shared runner (5.2s once), where every workspace is tested at the same time.
  it("has no accessibility violations", { timeout: 20_000 }, async () => {
    const { container } = render(<Page />)

    await expectNoA11yViolations(container)
  })

  /** BEELINK-319: the page as a visitor who was not asked yet finds it — the notice first in the document, "Cookies" in the footer. */
  describe("with its cookie notice", () => {
    const asking = <Page notice={<LandingConsent privacyHref={hrefs.privacyHref} onAccept={() => {}} onRefuse={() => {}} text={ptBR.landing.consent} />} cookies={<LandingFooterAction onClick={() => {}}>Cookies</LandingFooterAction>} />

    it("meets a keyboard with the notice before the header, and still has one h1", async () => {
      const user = userEvent.setup()
      render(asking)

      const notice = within(screen.getByRole("region", { name: "Cookies de medição" }))

      await user.tab()
      expect(notice.getByRole("link", { name: "política de privacidade" })).toHaveFocus()
      await user.tab()
      await user.tab()
      expect(notice.getByRole("button", { name: "Aceitar" })).toHaveFocus()
      await user.tab()
      expect(screen.getByRole("link", { name: "Beelink, início" })).toHaveFocus()
      expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    })

    it("fills every placeholder and has no accessibility violations", async () => {
      const { container } = render(asking)

      expect(container.textContent).not.toMatch(/[{}]/)
      await expectNoA11yViolations(container)
    })
  })
})

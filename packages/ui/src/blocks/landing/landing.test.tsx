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
import { LandingShell } from "./landing-shell"
import { LandingSteps } from "./landing-steps"
import { LandingTitle } from "./landing-title"

const hrefs = { loginHref: "/login", signupHref: "/signup", termsHref: "/termos", privacyHref: "/privacidade" }

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
      <LandingHeader loginHref={hrefs.loginHref} signupHref={hrefs.signupHref} />
      <main>
        <LandingHero signupHref={hrefs.signupHref} />
        <LandingBanners signupHref={hrefs.signupHref} />
        <LandingEcosystem />
        <LandingSteps />
        <LandingCouriers termsHref={hrefs.termsHref} privacyHref={hrefs.privacyHref} />
        <LandingFaq />
        <LandingCta signupHref={hrefs.signupHref} />
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
  it("leads to each section, to the sign-in and to the sign-up", () => {
    render(<LandingHeader loginHref="/login" signupHref="/signup" />)

    const nav = screen.getByRole("navigation", { name: "Principal" })
    expect(within(nav).getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["#solucoes", "#ecossistema", "#como", "#entregadores", "#perguntas"])
    expect(screen.getByRole("link", { name: "Beelink, início" })).toHaveAttribute("href", "/")
    expect(screen.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/login")
    expect(screen.getByRole("link", { name: "Criar minha loja" })).toHaveAttribute("href", "/signup")
  })

  it("says everything in the language it is handed", () => {
    render(<LandingHeader loginHref="/login" signupHref="/signup" messages={en} />)

    expect(screen.getByRole("link", { name: "Sign in" })).toBeInTheDocument()
    expect(screen.getByRole("navigation", { name: "Main" })).toBeInTheDocument()
  })
})

describe("LandingHero", () => {
  it("says what Beelink is in the page's one h1, and offers the way in and the way down", () => {
    render(<LandingHero signupHref="/signup" />)

    expect(screen.getByRole("heading", { level: 1, name: "Tudo o que o seu e-commerce precisa" })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Começar agora" })).toHaveAttribute("href", "/signup")
    expect(screen.getByRole("link", { name: "Ver soluções" })).toHaveAttribute("href", "#solucoes")
  })

  /** The ecosystem's own section is where the five are said: the hub is its picture. */
  it("draws the hub as a picture: a reader is not told the five twice", () => {
    const { container } = render(<LandingHero signupHref="/signup" />)

    const hub = screen.getByText("eMarketing").closest<HTMLElement>("[aria-hidden='true']")!
    expect(hub).not.toBeNull()
    expect(container.querySelectorAll("[aria-hidden='true']")).toContain(hub)
    // `hidden`: without it the query skips what a reader is not told, and finds nothing whatever is there.
    expect(within(hub).queryAllByRole("link", { hidden: true })).toHaveLength(0)
    expect(within(hub).queryAllByRole("button", { hidden: true })).toHaveLength(0)
  })
})

describe("LandingBanners", () => {
  it("holds the shop's banner, the phone as one picture, and the deliveries' banner", () => {
    render(<LandingBanners signupHref="/signup" />)

    const row = screen.getByRole("group", { name: "Destaques" })
    expect(within(row).getAllByRole("listitem").filter((item) => item.parentElement?.parentElement === row)).toHaveLength(3)
    expect(within(row).getByRole("heading", { level: 3, name: "Sua loja no ar hoje mesmo." })).toBeInTheDocument()
    expect(within(row).getByRole("img", { name: "Exemplo de loja no celular" })).toBeInTheDocument()
    expect(within(row).getByRole("link", { name: "Criar minha loja" })).toHaveAttribute("href", "/signup")
    expect(within(row).getByRole("link", { name: "Quero ser entregador" })).toHaveAttribute("href", "#entregadores")
  })

  it("offers an example shop only when there is one to offer", () => {
    const { rerender } = render(<LandingBanners signupHref="/signup" />)
    expect(screen.queryByRole("link", { name: "Ver uma loja de exemplo" })).not.toBeInTheDocument()

    rerender(<LandingBanners signupHref="/signup" exampleHref="/loja-exemplo" />)
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
        <LandingBanners signupHref="/signup" messages={messages} />
        <LandingCouriers termsHref="/termos" privacyHref="/privacidade" messages={messages} />
        <LandingFaq messages={messages} />
        <LandingFooter termsHref="/termos" privacyHref="/privacidade" year={2026} messages={messages} />
      </>,
    )

    expect(container.textContent).not.toMatch(/\[|\]/)
  })
})

describe("LandingFaq", () => {
  it("marks each question by whose it is, the shopkeeper's first, with every answer in the page", () => {
    const { container } = render(<LandingFaq />)

    const questions = [...container.querySelectorAll("details")]
    expect(questions.map((question) => question.querySelector("summary")!.textContent)).toEqual([
      "LojistaPreciso de site ou desenvolvedor?",
      "LojistaComo recebo os pedidos?",
      "LojistaPosso usar meus próprios entregadores?",
      "EntregadorQuem pode se cadastrar como entregador?",
      "EntregadorQuanto tempo leva a aprovação?",
      "EntregadorComo recebo pelos serviços?",
    ])
    expect(questions.every((question) => (question.querySelector("p")?.textContent ?? "").length > 20)).toBe(true)
  })
})

describe("LandingCta", () => {
  it("calls for the shop first, and points a courier to their section", () => {
    render(<LandingCta signupHref="/signup" />)

    expect(screen.getByRole("heading", { level: 2, name: "Seu e-commerce começa hoje." })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Criar minha loja" })).toHaveAttribute("href", "/signup")
    expect(screen.getByRole("link", { name: "Quero ser entregador" })).toHaveAttribute("href", "#entregadores")
  })
})

describe("LandingFooter", () => {
  it("leads only to what exists: the solutions' section, the couriers' sign-up and the two legal texts", () => {
    render(<LandingFooter termsHref="/termos" privacyHref="/privacidade" year={2026} />)

    expect(within(screen.getByRole("navigation", { name: "Soluções" })).getAllByRole("link").map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["Store", "#ecossistema"],
      ["Checkout", "#ecossistema"],
      ["Chat", "#ecossistema"],
      ["Envios", "#ecossistema"],
      ["eMarketing", "#ecossistema"],
    ])
    expect(within(screen.getByRole("navigation", { name: "Entregadores" })).getByRole("link", { name: "Cadastro" })).toHaveAttribute("href", "#entregadores")
    expect(screen.getByRole("link", { name: "Termos de uso" })).toHaveAttribute("href", "/termos")
    expect(screen.getByRole("link", { name: "Privacidade" })).toHaveAttribute("href", "/privacidade")
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

  it("has one h1, and a heading for every section under it", () => {
    render(<Page />)

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1)
    expect(screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent)).toEqual([
      "Uma plataforma. Três formas de crescer com a Beelink.",
      "Seu e-commerce. Conectado.",
      "Do cadastro à primeira venda.",
      "Entregue com a Beelink.",
      "Perguntas frequentes.",
      "Seu e-commerce começa hoje.",
    ])
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Page />)

    await expectNoA11yViolations(container)
  })
})

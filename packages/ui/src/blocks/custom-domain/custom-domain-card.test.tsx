// Libs
import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// UI
import type { CustomDomainView } from "@harness-monorepo/ui/lib/custom-domain"

// Locales
import { en } from "@harness-monorepo/ui/locales/index"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { CustomDomainCard, type CustomDomainCardProps } from "./custom-domain-card"
import { ADDRESS, HOST, PARKING_IP, TARGET_IP, active, activeWithProblem, activeWithoutWww, pendingCertificate, pendingElsewhere, pendingElsewhereRead, pendingLookupFailed, pendingNotFound, pendingUnreachable } from "./custom-domain.fixtures"

function show(domain: CustomDomainView | null, props: Partial<CustomDomainCardProps> = {}) {
  const handlers = { onSave: vi.fn(), onCheck: vi.fn(), onRemove: vi.fn() }
  const element = (next: CustomDomainView | null, more: Partial<CustomDomainCardProps> = {}) => <CustomDomainCard targetIps={[TARGET_IP]} domain={next} address={ADDRESS} {...handlers} {...props} {...more} />
  const result = render(element(domain))
  return { ...result, ...handlers, again: (next: CustomDomainView | null, more: Partial<CustomDomainCardProps> = {}) => result.rerender(element(next, more)) }
}

const card = () => screen.getByRole("region", { name: "Domínio próprio" })
const field = () => screen.getByLabelText<HTMLInputElement>("Seu domínio")
const CERTIFICATE = /^O DNS já está certo\. Falta o certificado de segurança \(o cadeado do https\), que é ativado pela equipe da Beelink e pode levar algumas horas\./

describe("CustomDomainCard (BEELINK-285), for a page with no domain", () => {
  it("says what a domain of one's own gives, naming the address the page has, and takes the domain", async () => {
    const { container, onSave } = show(null)

    expect(within(card()).getByText("Não configurado")).toHaveAttribute("data-variant", "outline")
    expect(within(card()).getByText(/o endereço da sua página deixa de ser beelink\.biz\/lessari e passa a ser o seu/)).toBeInTheDocument()
    expect(screen.queryByRole("button", { name: "Remover domínio" })).toBeNull()
    expect(screen.getByRole("button", { name: "Salvar domínio" })).toBeDisabled()

    await userEvent.type(field(), HOST)
    await userEvent.click(screen.getByRole("button", { name: "Salvar domínio" }))
    expect(onSave).toHaveBeenCalledExactlyOnceWith(HOST)
    await expectNoA11yViolations(container)
  })

  /** The API reads an address down to its host, and alone decides what a domain is: nothing is cleaned or refused here. */
  it.each([
    ["a whole address", "https://www.Lessari.com.br/produtos?x=1", "https://www.Lessari.com.br/produtos?x=1"],
    ["white space around it", "  lessari.com.br \n", "lessari.com.br"],
    ["what the API will refuse", "192.168.0.1", "192.168.0.1"],
  ])("hands over %s as it was pasted, less the space around it", async (_what, pasted, sent) => {
    const { onSave } = show(null)

    await userEvent.click(field())
    await userEvent.paste(pasted)
    await userEvent.click(screen.getByRole("button", { name: "Salvar domínio" }))

    expect(onSave).toHaveBeenCalledExactlyOnceWith(sent)
  })

  it("sends nothing of a field left blank", async () => {
    const { onSave } = show(null)

    await userEvent.type(field(), "   {Enter}")

    expect(onSave).not.toHaveBeenCalled()
  })

  it("locks the field while the domain is saved, then says the API's refusal under it and hands the focus back", () => {
    const { again } = show(null, { saving: true })
    expect(field()).toBeDisabled()
    expect(screen.getByRole("button", { name: "Salvando…" })).toBeDisabled()

    again(null, { saving: false, saveError: ptBR.customDomain.errors.CUSTOM_DOMAIN_TAKEN })
    expect(screen.getByRole("alert")).toHaveTextContent("Esse domínio já está em uso por outra página do bee-link.")
    expect(field()).toHaveAttribute("aria-invalid", "true")
    expect(field()).toHaveFocus()
  })

  it("says the deployment offers no domain, with no field, where it names no address to point at", async () => {
    const { container } = show(null, { targetIps: null })

    expect(within(card()).getByText("Indisponível")).toBeInTheDocument()
    expect(within(card()).getByText("O domínio próprio não está disponível nesta instalação do bee-link.")).toBeInTheDocument()
    expect(screen.queryByRole("textbox")).toBeNull()
    expect(screen.queryByRole("button")).toBeNull()
    await expectNoA11yViolations(container)
  })

  it("titles its own page, and speaks the language it is handed", () => {
    show(null, { headingAs: "h1", messages: en })

    expect(screen.getByRole("heading", { level: 1, name: "Your own domain" })).toBeInTheDocument()
    expect(screen.getByText("Not set up")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Save domain" })).toBeInTheDocument()
  })
})

describe("CustomDomainCard, with a domain saved and not active yet", () => {
  it("is waiting, and says which domain it is and when it was last checked — with no field", async () => {
    const { container } = show(pendingNotFound)

    expect(within(card()).getByText("Aguardando")).toHaveAttribute("data-variant", "outline")
    expect(within(card()).queryByText("Ativo")).toBeNull()
    expect(screen.getByText("Domínio").nextElementSibling).toHaveTextContent(/^lessari\.com\.br$/)
    expect(screen.getByText("Última verificação").nextElementSibling).toHaveTextContent(/^08\/10\/2026, 14:20$/)
    expect(screen.queryByRole("textbox")).toBeNull()
    // Nothing says the domain is the page's address before it is.
    expect(screen.queryByText(/é o endereço da sua página/)).toBeNull()
    await expectNoA11yViolations(container)
  })

  it("says a name that was not found as what to look at: the spelling, and the records at the provider", () => {
    show(pendingNotFound)

    expect(screen.getByText("Não encontramos o domínio lessari.com.br. Confira se ele foi digitado certo e se os registros desta página foram salvos no seu provedor. Uma mudança de DNS pode levar algumas horas para valer.")).toBeInTheDocument()
  })

  it("says where the records were found to point and where they have to, when the check told", () => {
    show(pendingElsewhere)

    expect(screen.getByText(/aponta para outro lugar/)).toHaveTextContent(`O domínio lessari.com.br aponta para outro lugar (${PARKING_IP}). Para ele apontar só para ${TARGET_IP}, troque o registro A do @, apague qualquer outro registro A que exista nele e desligue o encaminhamento, se houver.`)
  })

  /** A plain read tells the problem and not the addresses: the sentence stands without them, with no hole in it. */
  it("says the same without the addresses found, when only the problem is known", () => {
    show(pendingElsewhereRead)

    const said = screen.getByText(/aponta para outro lugar/)
    expect(said).toHaveTextContent(`O domínio lessari.com.br aponta para outro lugar. Para ele apontar só para ${TARGET_IP}, troque`)
    expect(said).not.toHaveTextContent(/\{|\}|\(\)/)
  })

  it("names every address the server answers on, and every one the domain was found at", () => {
    show({ ...pendingElsewhere, addresses: [PARKING_IP, "198.51.100.8"] }, { targetIps: [TARGET_IP, "203.0.113.11"] })

    expect(screen.getByText(/aponta para outro lugar/)).toHaveTextContent(`aponta para outro lugar (${PARKING_IP} e 198.51.100.8). Para ele apontar só para ${TARGET_IP} e 203.0.113.11, troque`)
  })

  /** Seen in the browser: "…só para 127.0.0.1: troque…" reads as an address with a port. An address is followed by a comma or a bracket. */
  it.each([["pt-BR", ptBR], ["en", en]] as const)("never puts a colon after an address, in %s", (_name, messages) => {
    show(pendingElsewhere, { messages })
    const withAddresses = screen.getByText(new RegExp(PARKING_IP.replaceAll(".", "\\."))).textContent
    cleanup()
    show(pendingElsewhereRead, { messages })
    const without = screen.getByText(new RegExp(TARGET_IP.replaceAll(".", "\\."))).textContent

    for (const said of [withAddresses, without]) expect(said).not.toMatch(/\d:/)
  })

  it("says a DNS that did not answer as nothing to change, only to try again", () => {
    show(pendingLookupFailed)

    expect(screen.getByText("Não conseguimos consultar o DNS agora. Isso não quer dizer que a sua configuração esteja errada: tente verificar de novo em alguns instantes.")).toBeInTheDocument()
  })

  /** Until BEELINK-282 the certificate is set up by hand: the shopkeeper is told the wait is not theirs to end. */
  it.each([["no certificate for the name yet", pendingCertificate], ["https not answering", pendingUnreachable]])("says the DNS is right and that the certificate is the Beelink team's to activate, for %s", (_what, domain) => {
    show(domain)

    expect(screen.getByText(CERTIFICATE)).toHaveTextContent("Você não precisa mudar mais nada: volte mais tarde e clique em Verificar de novo.")
    expect(screen.queryByText(/aponta para outro lugar|Não encontramos/)).toBeNull()
  })

  it("says a domain no problem was recorded of as one still to be checked", () => {
    show({ ...pendingNotFound, problem: null, checkedAt: null })

    expect(screen.getByText("Última verificação").nextElementSibling).toHaveTextContent("Ainda não verificado")
    expect(screen.getByText(/Este domínio ainda não foi verificado\. Crie os registros desta página no seu provedor/)).toBeInTheDocument()
  })

  it("checks again when asked, held while the check runs", async () => {
    const { again, onCheck } = show(pendingNotFound)

    await userEvent.click(screen.getByRole("button", { name: "Verificar de novo" }))
    expect(onCheck).toHaveBeenCalledOnce()

    again(pendingNotFound, { checking: true })
    expect(screen.getByRole("button", { name: "Verificando…" })).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByRole("button", { name: "Remover domínio" })).toHaveAttribute("aria-disabled", "true")
  })

  /**
   * Seen in the browser: a button that turns `disabled` under the focus drops it to the page's
   * start, and the check's result was read out from nowhere near the button that asked. Held, both
   * buttons keep the focus they had and do nothing when pressed.
   */
  it("holds both buttons while a check runs without taking them out of the tab order, and neither does anything", async () => {
    const { again, onCheck, onRemove } = show(pendingNotFound)
    screen.getByRole("button", { name: "Verificar de novo" }).focus()

    again(pendingNotFound, { checking: true })
    const held = screen.getByRole("button", { name: "Verificando…" })
    expect(held).toHaveFocus()
    expect(held).not.toHaveAttribute("disabled")
    expect(screen.getByRole("button", { name: "Remover domínio" })).not.toHaveAttribute("disabled")
    await userEvent.click(held)
    await userEvent.click(screen.getByRole("button", { name: "Remover domínio" }))
    expect(onCheck).not.toHaveBeenCalled()
    expect(onRemove).not.toHaveBeenCalled()
    expect(screen.queryByRole("alertdialog")).toBeNull()

    again(pendingNotFound, { checking: false, checked: true })
    expect(screen.getByRole("button", { name: "Verificar de novo" })).toHaveFocus()
    expect(screen.getByRole("button", { name: "Verificar de novo" })).not.toHaveAttribute("aria-disabled", "true")
  })

  it("reads out what a check that just came back found, or why it did not go through — never both, and neither while checking", () => {
    const { again } = show(pendingNotFound, { checked: true })
    expect(screen.getByRole("status")).toHaveTextContent("Verificação feita: ainda há um problema. Veja os detalhes nesta página.")
    expect(screen.queryByRole("alert")).toBeNull()

    again(pendingNotFound, { checked: true, checkError: ptBR.customDomain.errors.RATE_LIMITED })
    expect(screen.getByRole("alert")).toHaveTextContent("Muitas tentativas. Espere um minuto e tente de novo.")
    expect(screen.getByRole("status")).toBeEmptyDOMElement()

    again(pendingNotFound, { checked: true, checking: true, checkError: ptBR.customDomain.errors.RATE_LIMITED })
    expect(screen.queryByRole("alert")).toBeNull()
    expect(screen.getByRole("status")).toBeEmptyDOMElement()

    // Read as it stands, with no check asked from here: nothing is announced.
    again(pendingNotFound, { checked: false, checking: false, checkError: undefined })
    expect(screen.getByRole("status")).toBeEmptyDOMElement()
  })

  it("asks before removing, saying what it does and the minute it takes, and removes only once confirmed", async () => {
    const { onRemove } = show(pendingNotFound)

    await userEvent.click(screen.getByRole("button", { name: "Remover domínio" }))
    const dialog = await screen.findByRole("alertdialog", { name: "Remover o domínio lessari.com.br?" })
    expect(dialog).toHaveTextContent("A sua página volta a abrir só em beelink.biz/lessari, e lessari.com.br deixa de levar até ela. A mudança pode levar até um minuto para aparecer.")
    expect(dialog).toHaveTextContent("Os registros no seu provedor não são apagados.")
    expect(onRemove).not.toHaveBeenCalled()

    await userEvent.click(within(dialog).getByRole("button", { name: "Remover domínio" }))
    expect(onRemove).toHaveBeenCalledOnce()
  })

  it("keeps the domain when the question is answered with keeping it", async () => {
    const { onRemove } = show(pendingNotFound)

    await userEvent.click(screen.getByRole("button", { name: "Remover domínio" }))
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Manter domínio" }))

    expect(onRemove).not.toHaveBeenCalled()
  })

  it("says a removal that did not go through, and locks the ways out while one is on its way", () => {
    const { again } = show(pendingNotFound, { removeError: ptBR.customDomain.removeFailed })
    expect(screen.getByRole("alert")).toHaveTextContent("Não foi possível remover o domínio agora. Tente de novo.")

    again(pendingNotFound, { removing: true, removeError: undefined })
    expect(screen.getByRole("button", { name: "Remover domínio" })).toHaveAttribute("aria-disabled", "true")
    expect(screen.getByRole("button", { name: "Verificar de novo" })).toHaveAttribute("aria-disabled", "true")
  })

  /** A form swapped for the saved domain leaves the focus on the page's body: it goes to the first thing to press. */
  it("moves the focus to what replaced the field once the domain is saved, and back to the field once it is removed", () => {
    const { again } = show(null)

    again(pendingNotFound)
    expect(screen.getByRole("button", { name: "Verificar de novo" })).toHaveFocus()

    again(null)
    expect(field()).toHaveFocus()
  })
})

describe("CustomDomainCard, with the domain active", () => {
  it("is active in green, and says the domain is the page's address, where its old one leads, and the minute a domain just activated takes", async () => {
    const { container } = show(active)

    expect(within(card()).getByText("Ativo")).toHaveAttribute("data-variant", "success")
    expect(within(card()).queryByText("Aguardando")).toBeNull()
    expect(screen.getByText("lessari.com.br é o endereço da sua página, e beelink.biz/lessari leva para ele. Um domínio que acabou de ser ativado pode levar até um minuto para começar a abrir a página.")).toBeInTheDocument()
    expect(screen.getByText("Última verificação").nextElementSibling).toHaveTextContent("08/10/2026, 16:05")
    await expectNoA11yViolations(container)
  })

  /** A check that fails later does not take the page off its domain (BEELINK-281): active it stays, and says what was found. */
  it("stays active with what its last check found, never as a domain still waiting", () => {
    show(activeWithProblem)

    expect(within(card()).getByText("Ativo")).toHaveAttribute("data-variant", "success")
    expect(within(card()).queryByText("Aguardando")).toBeNull()
    expect(screen.getByText("O domínio continua ativo, mas a última verificação encontrou um problema:").nextElementSibling).toHaveTextContent("Não conseguimos consultar o DNS agora.")
    expect(screen.getByText(/é o endereço da sua página/)).toBeInTheDocument()
  })

  it("reads out a check that found nothing wrong as everything being right, and one that found something as a problem", () => {
    const { again } = show(active, { checked: true })
    expect(screen.getByRole("status")).toHaveTextContent("Verificação feita: está tudo certo com o domínio.")

    again(activeWithProblem, { checked: true })
    expect(screen.getByRole("status")).toHaveTextContent("Verificação feita: ainda há um problema.")
  })

  /** The domain is active without `www`: a note in the page's quiet colour, not a warning. */
  it("notes that www does not lead here, quietly, and says nothing of it when no check told", () => {
    const { again } = show(activeWithoutWww)
    const note = screen.getByText(/^O endereço com www \(www\.lessari\.com\.br\) ainda não aponta para cá\. O domínio funciona sem ele/)
    expect(note).toHaveClass("text-muted-foreground")
    expect(screen.queryByRole("alert")).toBeNull()

    again(active)
    expect(screen.queryByText(/O endereço com www/)).toBeNull()
  })

  it("speaks the language it is handed", () => {
    show(active, { messages: en })

    expect(screen.getByText("Active")).toBeInTheDocument()
    expect(screen.getByText(/^lessari\.com\.br is your page's address, and beelink\.biz\/lessari leads to it\./)).toHaveTextContent("may take up to a minute to start opening the page")
    expect(screen.getByRole("button", { name: "Check again" })).toBeInTheDocument()
  })
})

describe("CustomDomainCard, where the deployment lost its setting with a domain already saved", () => {
  it("shows the domain and lets it be removed, with no check to ask and nothing to point it at", async () => {
    const { onRemove } = show(pendingNotFound, { targetIps: null })

    expect(within(card()).getByText("O domínio próprio não está disponível nesta instalação do bee-link.")).toBeInTheDocument()
    expect(within(card()).getByText("Aguardando")).toBeInTheDocument()
    expect(screen.getByText("Domínio").nextElementSibling).toHaveTextContent("lessari.com.br")
    expect(screen.queryByRole("button", { name: "Verificar de novo" })).toBeNull()
    expect(screen.queryByText(/Não encontramos o domínio/)).toBeNull()

    await userEvent.click(screen.getByRole("button", { name: "Remover domínio" }))
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Remover domínio" }))
    expect(onRemove).toHaveBeenCalledOnce()
  })

  /** Seen in the browser: with the domain gone there is no field and no button, and the focus was dropped to the page's start. */
  it("hands the focus to the notice once that domain is removed, since nothing is left to press", () => {
    const { again } = show(pendingNotFound, { targetIps: null })

    again(null, { targetIps: null })

    expect(screen.getByText("O domínio próprio não está disponível nesta instalação do bee-link.")).toHaveFocus()
    expect(screen.queryByRole("button")).toBeNull()
  })
})

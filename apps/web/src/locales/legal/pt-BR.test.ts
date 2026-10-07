// Libs
import { describe, expect, it } from "vitest"

// App
import { legalTexts } from "./pt-BR"

const documents = [legalTexts.terms, legalTexts.privacy]

describe("bee-link's legal texts (BEELINK-171)", () => {
  it("are written in Portuguese, the language that binds, and say so", () => {
    for (const document of documents) expect(document.lang).toBe("pt-BR")
  })

  // The API records `LegalVersion`; the page shows `effective`. This is what keeps the two one day.
  it("say they took effect on the day their version names", () => {
    const day = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${legalTexts.version}T00:00:00Z`))

    for (const document of documents) expect(document.effective).toBe(`Vigente desde ${day}`)
  })

  // The page keys each heading, paragraph and item by its text: a repeated one would be dropped.
  it("never repeat a heading, an intro paragraph or an item of one list", () => {
    for (const document of documents) {
      const headings = document.sections.map((section) => section.heading)
      expect(new Set(headings).size).toBe(headings.length)
      expect(new Set(document.intro).size).toBe(document.intro.length)
      for (const section of document.sections) {
        for (const block of section.blocks) {
          if (block.kind === "list") expect(new Set(block.items).size).toBe(block.items.length)
        }
      }
    }
  })

  /** BEELINK-244: cashback is the shop's credit, not money — and the shop keeps the balance and its statement. */
  it("say what cashback is and is not in the terms, and that the shop keeps it in the policy", () => {
    const cashback = legalTexts.terms.sections.find((section) => section.heading === "Cashback das lojas")
    const said = cashback?.blocks.map((block) => (block.kind === "paragraph" ? block.text : block.items.join(" "))).join(" ") ?? ""

    expect(said).toMatch(/crédito concedido pela loja, e não dinheiro/)
    expect(said).toMatch(/vale só na loja que o concedeu/)
    expect(said).toMatch(/não pode ser sacado, trocado por dinheiro nem transferido/)
    expect(said).toMatch(/vence e deixa de existir/)

    const kept = legalTexts.privacy.sections.find((section) => section.heading === "Dados dos clientes das lojas")
    expect(JSON.stringify(kept)).toMatch(/o seu cashback na loja[^"]*o saldo[^"]*o extrato/)
  })

  /** BEELINK-271: what a shop's Meta Pixel shares, when, on whose behalf, and how to take a yes back. */
  describe("the policy, on a shop's Meta Pixel", () => {
    const textOf = (heading: string) => {
      const section = legalTexts.privacy.sections.find((entry) => entry.heading === heading)
      return section?.blocks.map((block) => (block.kind === "paragraph" ? block.text : block.items.join(" "))).join(" ") ?? ""
    }
    const pixel = textOf("Pixel da Meta nas lojas")

    it("says it is loaded only at a shop that connected one, and only after a yes", () => {
      expect(pixel).toMatch(/só existe nas lojas que o conectaram, e só é carregado depois que você aceita/)
      expect(pixel).toMatch(/se você recusa, o script da Meta não é carregado no seu navegador e nada é enviado à Meta/)
    })

    it("says what is sent to Meta", () => {
      expect(pixel).toMatch(/as páginas e os produtos que abre, o que coloca no carrinho e o pedido que faz/)
      expect(pixel).toMatch(/o endereço IP e a identificação do navegador/)
      expect(pixel).toMatch(/_fbp e _fbc/)
    })

    it("says the shop, not bee-link, is who advertises", () => {
      expect(pixel).toMatch(/Quem anuncia é a loja, e não o bee-link/)
      expect(textOf("Para que os dados são usados")).toMatch(/O bee-link não usa dados pessoais para publicidade própria/)
    })

    // BEELINK-268: every shop shares one domain, and Meta's cookie is the domain's.
    it("says Meta's identifier is one for the whole domain, while the answer is each shop's", () => {
      expect(pixel).toMatch(/o identificador que a Meta guarda no seu navegador é um só para todas as lojas do bee-link/)
      expect(pixel).toMatch(/aceitar numa loja não vale para outra/)
    })

    it("says how a yes is taken back, and what stays in the browser", () => {
      expect(pixel).toMatch(/o link "Cookies", no rodapé da loja, abre o aviso de novo/)
      expect(pixel).toMatch(/Se você retira o aceite, aquela loja deixa de enviar dados à Meta/)
      expect(pixel).toMatch(/Os cookies da Meta continuam no seu navegador até vencerem ou até você apagá-los/)
    })

    it("names the cookie that keeps the answer, and Meta's own, in the list of cookies", () => {
      const cookies = textOf("Cookies")

      expect(cookies).toMatch(/bl_consent: a sua resposta, aceitar ou recusar, ao aviso de cookies de uma loja que usa o Pixel da Meta; vale só para aquela loja e dura 180 dias/)
      expect(cookies).toMatch(/_fbp e _fbc\. Quem os grava é o script da Meta, e só depois que você aceita/)
    })

    // BEELINK-273: the list of cookies is a list of all of them.
    it("names the cookie that keeps which orders were already told to Meta, written only after a yes", () => {
      expect(textOf("Cookies")).toMatch(/bl_purchases: numa loja que usa o Pixel da Meta, e só depois que você aceita, os códigos dos seus últimos pedidos já informados à Meta, para que o mesmo pedido não seja informado duas vezes; vale só para aquela loja e dura 7 dias/)
    })

    // BEELINK-275: and so is the cookie that keeps the campaign a visitor arrived by.
    it("names the cookie that keeps the campaign of the link, and the ad's click only after a yes", () => {
      const cookies = textOf("Cookies")

      expect(cookies).toMatch(/bl_origin: a campanha do link pelo qual você chegou a uma loja, isto é, os parâmetros utm_source, utm_medium, utm_campaign, utm_content e utm_term do endereço/)
      expect(cookies).toMatch(/numa loja que usa o Pixel da Meta, só depois que você aceita, o identificador do clique no anúncio \(fbclid\) com que você chegou; vale só para aquela loja e dura 30 dias a partir da chegada/)
    })

    // BEELINK-274: the purchase is told from bee-link's server too, and the order keeps what that needs.
    describe("on the purchase told from the server", () => {
      it("says who sends, to whom, when, and only for an order placed after a yes", () => {
        expect(pixel).toMatch(/A compra também pode ser informada à Meta pelo servidor do bee-link, e não só pelo seu navegador/)
        expect(pixel).toMatch(/quando a loja, além do pixel, informou ao bee-link o token de acesso da API de Conversões da conta dela na Meta/)
        expect(pixel).toMatch(/só para um pedido que você fez depois de aceitar o aviso de cookies daquela loja/)
        expect(pixel).toMatch(/ao ser feito, se o pagamento é combinado com a loja, ou quando o pagamento é confirmado, se é cobrado no site/)
        expect(pixel).toMatch(/mesmo que o seu navegador não tenha enviado nada/)
      })

      it("says what goes: the purchase, the e-mail and the phone as a code, and what the order kept of the browser", () => {
        expect(pixel).toMatch(/o identificador do pedido, o valor total, os produtos, as quantidades, o preço de cada um/)
        expect(pixel).toMatch(/o seu e-mail e o seu celular, transformados antes num código \(um hash SHA-256\)/)
        expect(pixel).toMatch(/o e-mail e o celular em si não são enviados/)
        expect(pixel).toMatch(/o identificador do clique no anúncio \(fbclid\)[^.]*o identificador _fbp, a identificação do navegador e o endereço da página do carrinho/)
      })

      it("says what never goes from the server", () => {
        expect(pixel).toMatch(/O servidor não envia o seu nome, o seu endereço, o seu CPF nem o seu endereço IP/)
      })

      it("says the order keeps the yes and the browser's identifiers, until when, and what a yes taken back does not undo", () => {
        expect(pixel).toMatch(/o pedido feito depois do aceite guarda, no banco de dados do bee-link, o registro de que o aceite valia naquele momento/)
        expect(pixel).toMatch(/até você excluir a sua conta naquela loja, e saem na cópia dos seus dados/)
        expect(pixel).toMatch(/Vale o aceite do momento do pedido/)
        expect(pixel).toMatch(/Se você exclui a conta antes do envio, nada é enviado/)
        expect(textOf("Dados dos clientes das lojas")).toMatch(/de onde você chegou quando fez um pedido: a campanha do link[\s\S]*só se você tinha aceitado o aviso de cookies dela quando fez o pedido/)
      })

      it("no longer says the answer to the cookie notice is kept in the browser alone", () => {
        const all = JSON.stringify(legalTexts.privacy)

        expect(all).not.toMatch(/guarda a sua resposta só no seu navegador/)
        expect(all).not.toMatch(/também fica num cookie no seu navegador, e não no banco de dados do bee-link/)
        expect(pixel).toMatch(/No banco de dados, ela só é registrada junto de um pedido feito depois do aceite/)
      })

      it("names the purchase beside the navigation among what rests on consent", () => {
        expect(textOf("Para que os dados são usados")).toMatch(/os dados da sua navegação naquela loja e a compra que você fizer ali, pelo seu navegador ou pelo servidor do bee-link, só depois que você aceita/)
      })
    })

    it("no longer says no advertising pixel and no third-party script is ever used", () => {
      const all = JSON.stringify(legalTexts.privacy)

      expect(all).not.toMatch(/pixels de publicidade nem scripts de terceiros/)
      expect(all).not.toMatch(/não usa cookies de análise, de publicidade ou de rastreamento/)
      expect(textOf("Dados técnicos")).toMatch(/O único script de terceiros que uma página do bee-link pode carregar é o Pixel da Meta/)
      expect(textOf("Com quem os dados são compartilhados")).toMatch(/A Meta só recebe dados numa loja que conectou um Pixel da Meta, e só depois que você aceita/)
    })
  })

  it("say, in the terms and the policy alike, the three moments an account accepts them", () => {
    expect(legalTexts.terms.intro.join(" ")).toMatch(/Continuar com Google[\s\S]*define uma senha pelo link/)
    expect(legalTexts.privacy.intro.join(" ")).toMatch(/criar uma conta, ou ao definir uma senha pelo link/)
  })
})

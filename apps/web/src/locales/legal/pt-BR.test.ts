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

    // BEELINK-306: and so is the cookie that remembers a shop's pop-up was closed — which is no tracking.
    // BEELINK-311: the notice may be the strip under the header, and the number names which was closed.
    it("names the cookie that remembers a closed first-purchase notice, pop-up or strip: one number, nothing of the person, one shop, 30 days", () => {
      const cookies = textOf("Cookies")

      expect(cookies).toMatch(/bl_popup: numa loja que mostra um aviso de primeira compra \(pop-up ou faixa\), que você já fechou esse aviso ou apertou o botão dele, para que ele não apareça de novo/)
      expect(cookies).toMatch(/guarda só um número que identifica o aviso fechado, e nada sobre você; vale só para aquela loja e dura 30 dias/)
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
      // BEELINK-319: the pixel is no longer the only one — Beelink's own Google Analytics is the other.
      expect(textOf("Dados técnicos")).toMatch(/Os únicos scripts de terceiros que uma página do bee-link pode carregar são esse, do Google, e o Pixel da Meta de uma loja que o conectou, cada um só depois que você aceita/)
      expect(textOf("Com quem os dados são compartilhados")).toMatch(/A Meta só recebe dados numa loja que conectou um Pixel da Meta, e só depois que você aceita/)
    })
  })

  /** BEELINK-319: Beelink measures its own site with Google Analytics, on three screens, and only after a yes. */
  describe("the policy, on bee-link's own Google Analytics", () => {
    const textOf = (heading: string) => {
      const section = legalTexts.privacy.sections.find((entry) => entry.heading === heading)
      return section?.blocks.map((block) => (block.kind === "paragraph" ? block.text : block.items.join(" "))).join(" ") ?? ""
    }
    const analytics = textOf("Google Analytics no site do bee-link")
    const all = JSON.stringify(legalTexts.privacy)

    it("says who measures and what for, and that it is not for ads", () => {
      expect(analytics).toMatch(/quem decide medir é o próprio bee-link, e não uma loja/)
      // BEELINK-322: a courier's application sent is counted too.
      expect(analytics).toMatch(/quantas pessoas chegam à página inicial, quantas criam uma conta e quantas enviam o cadastro de entregador, e não para anúncios/)
      expect(textOf("Controlador e operador")).toMatch(/a medição das visitas ao seu próprio site: o bee-link é o controlador/)
      expect(textOf("Para que os dados são usados")).toMatch(/O bee-link não usa dados pessoais para publicidade própria: o Google Analytics do site dele serve para contar as visitas, as contas criadas e os cadastros de entregador enviados, e não para anúncios/)
    })

    it("says it is loaded on three screens, never at a shop, and only after a yes", () => {
      expect(analytics).toMatch(/só é carregado em três telas: a página inicial do bee-link e as duas telas em que o lojista entra e cria a conta/)
      expect(analytics).toMatch(/Ele nunca é carregado numa loja/)
      expect(analytics).toMatch(/Enquanto você não responde, e se você recusa, o script do Google não é carregado no seu navegador e nada é enviado ao Google/)
      expect(analytics).toMatch(/O site funciona do mesmo jeito nos dois casos/)
    })

    it("says the sign-in and the sign-up ask nothing, and measure nobody who was not asked", () => {
      expect(analytics).toMatch(/As telas de entrar e de criar conta não perguntam de novo: vale a resposta que você deu na página inicial/)
      expect(analytics).toMatch(/Quem chega direto a elas, sem ter respondido, não é medido/)
    })

    it("says what is sent to Google", () => {
      expect(analytics).toMatch(/as páginas abertas, de onde você veio e o que você faz nelas, como criar uma conta/)
      expect(analytics).toMatch(/o endereço IP e a identificação do navegador/)
      expect(analytics).toMatch(/os identificadores que o Google Analytics guarda em cookies no seu navegador/)
    })

    it("says the answer is the site's and never a shop's, nor a shop's the site's", () => {
      expect(analytics).toMatch(/aceitar ali não vale como aceite do aviso de cookies de nenhuma loja, e aceitar numa loja não libera a medição do site/)
    })

    // BEELINK-320 takes Google's cookies out at a yes taken back; the text said they stayed, and was corrected within its version.
    it("says how a yes is taken back, where the answer is kept, and that Google's cookies are taken out", () => {
      expect(analytics).toMatch(/o link "Cookies", no rodapé da página inicial, abre o aviso de novo e mostra a sua escolha atual/)
      expect(analytics).toMatch(/Se você retira o aceite, o bee-link deixa de carregar o Google Analytics no seu navegador e de enviar dados ao Google, e apaga do seu navegador os cookies do Google Analytics/)
      expect(analytics).not.toMatch(/continuam no seu navegador/)
      expect(analytics).toMatch(/O que já foi enviado ao Google passa a seguir a política de privacidade dele/)
      expect(analytics).toMatch(/no cookie bl_site_consent, e o bee-link pergunta de novo depois de 180 dias\. Ela não é registrada no banco de dados/)
    })

    it("names Google among who receives data, for the sign-in and for the measurement, and the measurement among what rests on consent", () => {
      const shared = textOf("Com quem os dados são compartilhados")
      expect(shared).toMatch(/Google, em dois casos: quando você usa o "Continuar com Google"/)
      expect(shared).toMatch(/pelo Google Analytics, o Google recebe os dados da sua navegação na página inicial do bee-link e nas telas em que o lojista entra e cria a conta, só depois que você aceita/)

      const basis = textOf("Para que os dados são usados")
      expect(basis).toMatch(/no site do bee-link, medir as visitas com o Google Analytics, que recebe os dados da sua navegação ali, só depois que você aceita no aviso de cookies da página inicial/)
      expect(basis).toMatch(/o da medição, no link "Cookies", no rodapé da página inicial do bee-link/)
    })

    it("names the cookie that keeps the answer, and Google's own, in the list of cookies", () => {
      const cookies = textOf("Cookies")

      expect(cookies).toMatch(/bl_site_consent: a sua resposta, aceitar ou recusar, ao aviso de cookies do site do bee-link, que pergunta sobre o Google Analytics/)
      expect(cookies).toMatch(/nunca como resposta ao aviso de uma loja, e dura 180 dias/)
      expect(cookies).toMatch(/_ga e outro cujo nome começa por _ga_ e termina com o identificador da medição do bee-link/)
      expect(cookies).toMatch(/Quem os grava é o script do Google Analytics, e só depois que você aceita o aviso de cookies da página inicial/)
      expect(cookies).toMatch(/cada um dura até 2 anos/)
    })

    // The briefing's two caveats on Google's cookies: they are the whole address's, and the script is three screens'.
    it("says Google's cookies are the whole address's, while the script is loaded on those screens and never at a shop", () => {
      expect(textOf("Cookies")).toMatch(/Eles valem para o endereço inteiro do bee-link, e não só para as telas em que o script é carregado; mas o Google Analytics do bee-link só é carregado na página inicial e nas telas em que o lojista entra e cria a conta, nunca numa loja/)
    })

    it("no longer says no analytics cookie is written, no audience tool is used, or that every cookie is essential", () => {
      expect(all).not.toMatch(/não grava cookies de análise, de publicidade ou de rastreamento/)
      expect(all).not.toMatch(/não usa, por conta própria, ferramentas de análise de audiência/)
      expect(all).not.toMatch(/usa só cookies essenciais e próprios/)
      expect(all).not.toMatch(/Google: só quando você usa o/)
      expect(textOf("Cookies")).toMatch(/O bee-link não grava cookies de publicidade\. Cookies de análise só existem no caso descrito a seguir, o do Google Analytics, e só depois do seu aceite/)
      expect(textOf("Dados técnicos")).toMatch(/A única ferramenta de análise de audiência que ele usa é o Google Analytics, só no seu próprio site e só depois que você aceita/)
    })

    it("is for whoever visits bee-link's own site too", () => {
      expect(legalTexts.privacy.intro.join(" ")).toMatch(/para quem visita o site do bee-link ou uma loja sem criar conta/)
    })
  })

  /**
   * BEELINK-322: the landing's courier form sends, and what it sends is kept. Every sentence here is
   * something the code does — the table's columns, a person on the list once, the event with nothing in it —
   * and none promises a deletion nothing performs.
   */
  describe("the policy, on who asked to deliver", () => {
    const textOf = (heading: string) => {
      const section = legalTexts.privacy.sections.find((entry) => entry.heading === heading)
      return section?.blocks.map((block) => (block.kind === "paragraph" ? block.text : block.items.join(" "))).join(" ") ?? ""
    }
    const couriers = textOf("Dados de quem se candidata a entregar")

    // BEELINK-325 said a person is on the list once, under 2026-10-14. BEELINK-329 changed what the
    // form asks for — no e-mail, no city — and what is collected changing is a version of its own.
    it("is the version that says the form asks for no e-mail and no city", () => {
      expect(legalTexts.version).toBe("2026-10-15")
      expect(legalTexts.privacy.effective).toBe("Vigente desde 15 de outubro de 2026")
      expect(legalTexts.terms.effective).toBe("Vigente desde 15 de outubro de 2026")
    })

    it("has a section of its own, between the visitor's and the technical data", () => {
      const headings = legalTexts.privacy.sections.map((section) => section.heading)

      expect(headings.slice(headings.indexOf("Dados de quem visita uma loja sem conta"), headings.indexOf("Dados técnicos") + 1)).toEqual(["Dados de quem visita uma loja sem conta", "Dados de quem se candidata a entregar", "Dados técnicos"])
    })

    it("names every thing the table keeps: what the form asks for, the e-mail of who was asked for one, the city, the vehicle, the acceptance and the two dates", () => {
      expect(couriers).toMatch(/nome completo, CPF e número de WhatsApp;/)
      expect(couriers).not.toMatch(/nome completo, CPF, e-mail/)
      expect(couriers).toMatch(/o e-mail, só de quem enviou o cadastro quando o formulário ainda o pedia: hoje ele não pede/)
      expect(couriers).toMatch(/a cidade do cadastro, que hoje é sempre Fortaleza\/CE, e como você entrega: moto, bicicleta, carro ou utilitário/)
      expect(couriers).toMatch(/a versão dos Termos de uso e desta Política que você aceitou ao enviar, com a data e a hora do aceite/)
      expect(couriers).toMatch(/enviado pela primeira vez e em que foi alterado pela última vez/)
    })

    it("says where the form is, that it is the sign-up's first step, and that today it is for one city it does not ask for", () => {
      expect(couriers).toMatch(/Na página inicial do bee-link, o formulário de entregador recebe o primeiro passo do cadastro/)
      expect(couriers).toMatch(/Hoje o cadastro é só para a cidade de Fortaleza\/CE, e por isso o formulário não pergunta a cidade/)
    })

    it("says what the data is for, and that a person is on the list once: by CPF and by WhatsApp, and by e-mail where there is one", () => {
      expect(couriers).toMatch(/formam uma lista de interesse/)
      expect(couriers).toMatch(/para falar com você sobre a conclusão do cadastro, pelo WhatsApp informado e, se o seu cadastro tem um, pelo e-mail/)
      expect(couriers).toMatch(/existe um só cadastro por CPF e por número de WhatsApp, e por e-mail quando o cadastro tem um/)
    })

    // What the code does since BEELINK-325, and its price said in as many words: the answer tells who is on the list.
    it("says a send with a CPF or a WhatsApp already on the list is refused, which of the two is said, and what was kept stays", () => {
      expect(couriers).toMatch(/com um CPF ou um número de WhatsApp que já está na lista, o cadastro não é aceito, e o site diz qual dos dois já estava cadastrado/)
      expect(couriers).toMatch(/do CPF, que ele já tem cadastro; do WhatsApp, que o número já está cadastrado/)
      expect(couriers).toMatch(/O cadastro que já existia não é alterado/)
      expect(couriers).toMatch(/quem digita um desses dados no formulário fica sabendo se ele já está na lista/)
      expect(couriers).not.toMatch(/substituem os anteriores|não diz se o CPF/)
    })

    it("says no account is made of it and no shop sees it", () => {
      expect(couriers).toMatch(/não cria uma conta no bee-link, e nenhuma loja vê esses dados/)
    })

    it("says nothing typed goes to Google: with a yes, only that a sign-up was sent", () => {
      expect(couriers).toMatch(/O que você digita no formulário não é enviado ao Google/)
      expect(couriers).toMatch(/o Google Analytics é avisado apenas de que um cadastro foi enviado, sem nenhum dos dados acima/)
      expect(textOf("Google Analytics no site do bee-link")).toMatch(/como criar uma conta ou enviar o cadastro de entregador; do cadastro, o Google é avisado só de que ele foi enviado, sem nada do que você digitou/)
    })

    // Nothing deletes a row by itself, so no period is promised: the text says so, and how to ask.
    it("says the data stays until its deletion is asked for, and promises no period", () => {
      expect(couriers).toMatch(/ficam guardados até você pedir a exclusão: o bee-link não os apaga automaticamente depois de um prazo/)
      expect(couriers).toMatch(/fale com o bee-link pelo canal indicado na seção "Contato e encarregado", informando o CPF do cadastro/)
      expect(couriers).not.toMatch(/\d+ (dias|meses|anos)/)
      expect(textOf("Por quanto tempo os dados são guardados")).toMatch(/O cadastro de quem se candidata a entregar não está ligado a uma conta: ele fica guardado até a pessoa pedir a exclusão/)
    })

    it("names bee-link as the controller, the legal basis, and the way to ask, each where the policy lists them", () => {
      expect(textOf("Controlador e operador")).toMatch(/Dados de quem se candidata a fazer entregas: o bee-link é o controlador/)
      expect(textOf("Para que os dados são usados")).toMatch(/Procedimentos preliminares a um contrato, a pedido de quem se candidata: guardar o cadastro de quem quer fazer entregas pelo bee-link/)
      expect(textOf("Como exercer os seus direitos")).toMatch(/Se você enviou o cadastro de entregador, faça o pedido ao bee-link, pelo canal indicado na seção de contato, informando o CPF do cadastro/)
      expect(textOf("Como exercer os seus direitos")).toMatch(/a exclusão de uma conta, de uma loja ou de um cadastro de entregador é pedida pelo canal indicado/)
    })

    it("is for who asks to deliver too, and says the form is a moment the texts are taken", () => {
      expect(legalTexts.privacy.intro.join(" ")).toMatch(/para quem se candidata a fazer entregas/)
      expect(legalTexts.privacy.intro.join(" ")).toMatch(/ou ao enviar o cadastro de entregador, você declara que leu esta Política/)
      expect(legalTexts.terms.intro.join(" ")).toMatch(/Quem envia o cadastro de entregador, na página inicial do bee-link, também aceita estes Termos e declara ter lido a Política de privacidade ao enviá-lo/)
      expect(legalTexts.terms.intro.join(" ")).toMatch(/não cria uma conta, e as regras da atividade de entrega ainda não fazem parte destes Termos/)
      expect(JSON.stringify(legalTexts.terms)).toMatch(/ao definir a senha ou ao enviar o cadastro de entregador/)
    })
  })

  it("say, in the terms and the policy alike, the three moments an account accepts them", () => {
    expect(legalTexts.terms.intro.join(" ")).toMatch(/Continuar com Google[\s\S]*define uma senha pelo link/)
    expect(legalTexts.privacy.intro.join(" ")).toMatch(/criar uma conta, ou ao definir uma senha pelo link/)
  })
})

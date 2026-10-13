// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/index"

// Block
import { sampleLegalDocument } from "../legal/legal-document.fixtures"
import { LandingCourierForm } from "./landing-courier-form"
import type { LandingCourierValues } from "./landing-courier-schema"
import { LandingLegalDialog } from "./landing-legal-dialog"
import { LandingShell } from "./landing-shell"

const text = ptBR.landing.couriers.form

/** Dados inventados: um CPF de teste, com os dígitos verificadores certos, e um e-mail que não é de ninguém. */
const filled = {
  name: "Zuleica Tavares",
  document: "529.982.247-25",
  email: "zuleica.tavares@exemplo.test",
  whatsapp: "(85) 9 8765-4321",
  vehicle: "MOTORCYCLE",
  acceptedTerms: true,
  website: "",
} satisfies LandingCourierValues

/**
 * O primeiro passo do cadastro de entregador (BEELINK-329) — nome, CPF, e-mail, WhatsApp e veículo —, sozinho
 * sobre o amarelo da faixa. O bloco não conhece a rede: quem envia é a tela, que lhe diz onde o envio
 * está (`status`) e o que ele encontrou (`problem`). Aqui cada estado é uma história.
 */
const meta = {
  title: "Blocos/Landing/Formulário do entregador",
  component: LandingCourierForm,
  parameters: { layout: "fullscreen" },
  args: { termsHref: "#termos", privacyHref: "#privacidade", text, onSubmit: () => {} },
  render: (args) => (
    <LandingShell className="min-h-0 items-center bg-brand-yellow p-4 sm:p-10">
      <LandingCourierForm {...args} />
    </LandingShell>
  ),
} satisfies Meta<typeof LandingCourierForm>

export default meta
type Story = StoryObj<typeof meta>

/** Como a página chega: o botão travado, e a frase embaixo dele dizendo o que falta. Não há campo de cidade. */
export const Vazio: Story = {}

/** Tudo certo e o aceite marcado: o botão libera e a frase some. Apague um dígito do CPF para vê-lo travar de novo. */
export const Preenchido: Story = { args: { initial: filled } }

/** O erro de cada campo aparece quando a pessoa sai dele. Aqui, um CPF com o dígito verificador errado e um telefone fixo: passe pelos dois com o Tab. */
export const ComErros: Story = { args: { initial: { ...filled, document: "529.982.247-26", whatsapp: "(85) 3222-1111", acceptedTerms: false } } }

/** Enquanto o envio está a caminho: o botão desabilitado, com a própria frase. Nunca um spinner. */
export const Enviando: Story = { args: { initial: filled, status: "sending" } }

/** A API recusou um campo que o navegador tinha deixado passar: a frase vai no campo, que recebe o foco, e o resto fica como estava. */
export const RecusadoPelaApi: Story = { args: { initial: filled, problem: { field: "document", message: "Esse CPF não confere. Confira os números." } } }

/** Envios demais do mesmo endereço (429): a frase própria, sem oferta de tentar na hora. */
export const LimiteAtingido: Story = { args: { initial: filled, problem: { field: null, message: "Muitos envios em pouco tempo. Espere alguns minutos e tente de novo." } } }

/** Falha de rede ou do servidor: a frase, e o botão vira "Tentar de novo". O formulário não é apagado. */
export const Falha: Story = { args: { initial: filled, problem: { field: null, message: "Não foi possível enviar o cadastro agora. Seus dados continuam aqui.", retry: true } } }

/** O cadastro foi recebido: a confirmação toma o lugar do formulário e recebe o foco. Ela diz que o resto chega por e-mail. */
export const Enviado: Story = { args: { initial: filled, status: "sent" } }

/** O CPF já estava na lista: nada foi gravado, e o mesmo cartão diz "Esse CPF já tem cadastro", sem erro em campo nenhum. */
export const CpfJaCadastrado: Story = { args: { initial: filled, status: "already" } }

/** O caminho inteiro: enviar leva ao "enviando", depois à confirmação; "Enviar outro cadastro" devolve o formulário vazio. Os links dos termos e da política abrem o diálogo por cima, sem apagar o que foi digitado. */
export const Fluxo: Story = {
  render: function Flow(args) {
    const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle")
    const [reading, setReading] = useState<{ document: "terms" | "privacy"; open: boolean; link: HTMLElement | null }>({ document: "terms", open: false, link: null })

    return (
      <LandingShell className="min-h-0 items-center bg-brand-yellow p-4 sm:p-10">
        <LandingCourierForm
          {...args}
          status={status}
          onSubmit={() => {
            setStatus("sending")
            window.setTimeout(() => setStatus("sent"), 1200)
          }}
          onAgain={() => setStatus("idle")}
          onRead={(document, link) => setReading({ document, open: true, link })}
        />
        <LandingLegalDialog
          open={reading.open}
          onOpenChange={(open) => setReading((last) => ({ ...last, open }))}
          title={text.legal.titles[reading.document]}
          content={{ ...sampleLegalDocument, title: text.legal.titles[reading.document] }}
          href={reading.document === "terms" ? args.termsHref : args.privacyHref}
          returnFocus={{ current: reading.link }}
          text={text.legal}
        />
      </LandingShell>
    )
  },
}

/** No celular: os quatro veículos numa linha, com 44px de altura, e nada estoura a largura. */
export const NoCelular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }

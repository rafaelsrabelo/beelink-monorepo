// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/index"

// Block
import { sampleLegalDocument } from "../legal/legal-document.fixtures"
import { LandingLegalDialog } from "./landing-legal-dialog"

const text = ptBR.landing.couriers.form.legal

/**
 * O diálogo em que os termos de uso e a política de privacidade são lidos por cima do formulário de
 * entregador (BEELINK-322), sem sair da página. O texto chega depois de o diálogo abrir, por isso
 * ele tem três estados: esperando, com o texto e sem o texto.
 */
const meta = {
  title: "Blocos/Landing/Diálogo dos textos legais",
  component: LandingLegalDialog,
  parameters: { layout: "fullscreen" },
  args: { open: true, onOpenChange: () => {}, title: text.titles.privacy, content: sampleLegalDocument, href: "#privacidade", text },
  render: function Opened(args) {
    const [open, setOpen] = useState(args.open)

    return (
      <div className="flex min-h-svh items-center justify-center bg-brand-ink p-10">
        <button type="button" onClick={() => setOpen(true)} className="rounded-full bg-brand-yellow px-6 py-3 font-bold text-brand-ink">
          Abrir de novo
        </button>
        <LandingLegalDialog {...args} open={open} onOpenChange={setOpen} />
      </div>
    )
  },
} satisfies Meta<typeof LandingLegalDialog>

export default meta
type Story = StoryObj<typeof meta>

/** Com o texto: o título e a data de vigência ficam parados no topo, e o texto rola por baixo. */
export const ComOTexto: Story = {}

/** Enquanto o texto não chega: o diálogo já tem nome, e linhas ocupam o lugar do texto. Nunca um spinner. */
export const Carregando: Story = { args: { content: null } }

/** O texto não chegou: a frase, "Tentar de novo" e o caminho para a página, numa nova aba. */
export const SemOTexto: Story = { args: { content: null, failed: true } }

/** No celular: o diálogo ocupa a largura da tela, menos a margem, e nunca passa da altura dela. */
export const NoCelular: Story = { globals: { viewport: { value: "mobile1", isRotated: false } } }

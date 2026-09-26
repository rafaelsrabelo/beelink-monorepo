// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontFaq } from "./storefront-faq"

const meta = {
  title: "Blocos/Vitrine/Perguntas frequentes",
  component: StorefrontFaq,
  parameters: { layout: "padded" },
  args: {
    id: "faq",
    title: "Perguntas frequentes",
    subtitle: "Tudo o que perguntam antes de comprar",
    items: [
      { id: "entrega", question: "Quanto tempo leva a entrega?", answer: "De 2 a 5 dias úteis nas capitais.\nNo interior, até 8." },
      { id: "troca", question: "Posso trocar?", answer: "Sim, em até 7 dias depois de receber, com a etiqueta." },
      { id: "pagamento", question: "Quais são as formas de pagamento?", answer: "PIX, cartão de crédito em até 6 vezes e cartão de débito." },
    ],
  },
} satisfies Meta<typeof StorefrontFaq>

export default meta
type Story = StoryObj<typeof meta>

/** As respostas estão no HTML mesmo fechadas: a página é indexada. Abrir uma fecha as outras. */
export const Padrao: Story = {}

/** Sem título, só as perguntas. */
export const SemTitulo: Story = { args: { title: null, subtitle: null } }

/** Sem perguntas não desenha nada: o editor mostra o lugar para escrever a primeira. */
export const Vazio: Story = { args: { items: [] } }

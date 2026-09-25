// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontRichText } from "./storefront-rich-text"

const meta = {
  title: "Blocos/Vitrine/Descrição formatada",
  component: StorefrontRichText,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div className="max-w-2xl">{Story()}</div>],
  args: {
    markdown: [
      "**100% Whey Protein Concentrado**",
      "",
      "Potencialize seus treinos com o **100% Whey Protein Concentrado**, uma excelente opção para complementar sua ingestão diária de proteínas.",
      "",
      "🥛 **Destaques do produto**",
      "",
      "- Proteína de alta qualidade",
      "",
      "- Ideal para complementar a ingestão diária de proteínas",
      "",
      "- Fácil e rápido de preparar",
      "",
      "**Modo de consumo:** misture a porção recomendada com água, leite ou sua bebida preferida. _Consulte a embalagem._",
      "",
      "1. Abra o pote",
      "2. Misture",
      "3. Beba",
    ].join("\n"),
  },
} satisfies Meta<typeof StorefrontRichText>

export default meta
type Story = StoryObj<typeof meta>

/** A descrição como o lojista escreveu: negrito, itálico, listas com linha em branco entre os itens. */
export const Padrao: Story = {}

/** Um asterisco de conta e um sublinhado de código ficam como foram digitados. */
export const SemMarcas: Story = { args: { markdown: "Leve 2 * 3 potes pelo preço de 5. Código WH_900." } }

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { ADDRESS, HOST } from "./custom-domain.fixtures"
import { ShopAddressCard } from "./shop-address-card"

const meta = {
  title: "Blocos/Painel/Início/Endereço da página",
  component: ShopAddressCard,
  // A third of the home's grid, which is how wide the card sits there.
  decorators: [(Story) => <ul className="grid max-w-sm">{Story()}</ul>],
  args: { address: ADDRESS, domain: null, href: "#dominio" },
} satisfies Meta<typeof ShopAddressCard>

export default meta
type Story = StoryObj<typeof meta>

/** Sem domínio: o endereço atual e a chamada para apontar o domínio. */
export const SemDominio: Story = {}

/** O domínio salvo e ainda não ativo: "Aguardando", e o endereço que segue valendo. */
export const Aguardando: Story = { args: { domain: { host: HOST, status: "PENDING" } } }

/** O domínio ativo: ele é o endereço, e o cartão está feito. */
export const Ativo: Story = { args: { domain: { host: HOST, status: "ACTIVE" } } }

/** Um domínio comprido não estoura o cartão: quebra de linha no meio do nome. */
export const DominioComprido: Story = { args: { domain: { host: "um-nome-de-dominio-bem-comprido-para-uma-loja.com.br", status: "PENDING" } } }

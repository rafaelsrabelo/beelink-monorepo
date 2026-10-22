// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Locales
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// Block
import { StoreAddressChange } from "./store-address-change"
import { StoreAddressChangeSkeleton } from "./store-address-change-skeleton"

const noop = () => {}

const meta = {
  title: "Blocos/Painel/Trocar endereço",
  component: StoreAddressChange,
  decorators: [(Story) => <div className="max-w-4xl">{Story()}</div>],
  args: {
    currentAddress: "beelink.biz/padaria-do-bairo",
    prefix: "beelink.biz/",
    value: "",
    onValueChange: noop,
    preview: "",
    availability: { state: "idle" },
    lockedUntil: null,
    customDomain: null,
    onConfirm: noop,
  },
} satisfies Meta<typeof StoreAddressChange>

export default meta
type Story = StoryObj<typeof meta>

/** Antes de digitar: o endereço atual, o campo e o que acontece numa troca. O botão espera. */
export const Vazio: Story = {}

/** Digitado com espaço e acento: a prévia mostra o endereço como vai ficar, e a API está sendo consultada. */
export const Conferindo: Story = { args: { value: "Padaria do Bairro", preview: "padaria-do-bairro", availability: { state: "checking" } } }

/** Livre: o botão abre a confirmação. */
export const Livre: Story = { args: { value: "padaria-do-bairro", preview: "padaria-do-bairro", availability: { state: "available" } } }

/** Já é de outra página (ou outra página o deixou): o motivo em palavras, sob a prévia. */
export const EmUso: Story = { args: { value: "padaria", preview: "padaria", availability: { state: "unavailable", reason: "TAKEN" } } }

/** Uma página com domínio próprio: a lista diz que ele continua o mesmo. */
export const ComDominioProprio: Story = { args: { value: "padaria-do-bairro", preview: "padaria-do-bairro", availability: { state: "available" }, customDomain: "padariadobairro.com.br" } }

/** A troca sendo feita: o campo e o botão travados. */
export const Trocando: Story = { args: { value: "padaria-do-bairro", preview: "padaria-do-bairro", availability: { state: "available" }, pending: true } }

/** A troca recusada pela API, em palavras: aqui, outra página pegou o endereço no meio do caminho. */
export const Recusada: Story = { args: { value: "padaria-do-bairro", preview: "padaria-do-bairro", availability: { state: "available" }, error: ptBR.store.addressChange.reasons.TAKEN } }

/** Trocado há menos de 30 dias: diz a partir de quando dá para trocar de novo, sem campo. */
export const DentroDos30Dias: Story = { args: { currentAddress: "beelink.biz/padaria-do-bairro", lockedUntil: "16/11/2026" } }

/** Enquanto a página é lida. */
export const Carregando: Story = { render: () => <StoreAddressChangeSkeleton /> }

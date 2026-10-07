// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import type { PopupFormValues } from "@harness-monorepo/ui/lib/popup-form"
import { shopPaletteVariables } from "@harness-monorepo/ui/lib/shop-palette"

// Block
import { sampleColorPresets } from "../store/store.fixtures"
import { popupPicture } from "../storefront/popup.fixtures"
import { PopupForm, type PopupFormProps } from "./popup-form"
import { PopupPreview, type PopupPreviewProps } from "./popup-preview"
import { popupAnnouncing, popupAnnouncingNothing, popupChoices, popupCustomerPromotionWords, popupCustomerWords, popupDefaults, popupPlainWords, popupValues, popupWords } from "./popup.fixtures"

type PanelProps = Pick<PopupPreviewProps, "words" | "customerWords" | "announcing" | "imageUrl"> & Pick<PopupFormProps, "issues" | "error" | "saved" | "pending"> & { initial?: Partial<PopupFormValues> }

/** The screen as it composes the two: the preview over the form, which holds what is typed. */
function PopupPanel({ words, customerWords, announcing, imageUrl, initial, ...form }: PanelProps) {
  const [value, setValue] = useState<PopupFormValues>({ ...popupValues, ...initial })

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <PopupPreview words={words} customerWords={customerWords} announcing={announcing} imageUrl={imageUrl} style={shopPaletteVariables(sampleColorPresets[2]!.colors)} />
      <PopupForm value={value} onChange={setValue} onSubmit={() => {}} choices={popupChoices} defaults={popupDefaults} onUploadImage={async () => popupPicture} {...form} />
    </div>
  )
}

const meta = {
  title: "Blocos/Painel/Pop-up de primeira compra",
  component: PopupPanel,
  args: { words: popupWords, customerWords: popupCustomerWords, announcing: popupAnnouncing, imageUrl: null },
} satisfies Meta<typeof PopupPanel>

export default meta
type Story = StoryObj<typeof meta>

/** Como uma loja que nunca salvou o vê: desligado, com os textos padrão e o benefício de agora. */
export const Padrao: Story = {}

/** Ligado, com imagem e textos próprios. */
export const ComImagem: Story = {
  args: {
    imageUrl: popupPicture,
    words: { ...popupWords, title: "Ei, antes de ir embora… 5% de desconto te espera", buttonLabel: "Ganhar cupom!!" },
    initial: { enabled: true, imageUrl: popupPicture, title: "Ei, antes de ir embora… {beneficio} te espera", buttonLabel: "Ganhar cupom!!" },
  },
}

/** Loja sem benefício de primeira compra: a prévia é o convite simples e o aviso diz que nada é prometido. */
export const SemBeneficio: Story = { args: { words: popupPlainWords, customerWords: null, announcing: popupAnnouncingNothing } }

/** A loja tem só promoção de primeira compra: em "Cliente sem pedido" a prévia não tem código e o botão só fecha. */
export const ClienteComPromocao: Story = { args: { customerWords: popupCustomerPromotionWords } }

/** Lembrete ligado: depois de fechado o pop-up, a faixa fica abaixo do cabeçalho até ser fechada também. Desligado é o padrão. */
export const ComLembrete: Story = { args: { initial: { enabled: true, keepReminder: true } } }

/** Gatilho "ao sair": a ajuda diz o que acontece no celular. */
export const AoSair: Story = { args: { initial: { enabled: true, trigger: "ON_LEAVE" } } }

/** Recusas de campo: desconto digitado à mão e atraso fora do limite. */
export const ComRecusas: Story = {
  args: {
    initial: { title: "Ganhe 10% na primeira compra", delay: "90" },
    issues: { title: "Não escreva o desconto à mão. Use {beneficio}: o número vem do cupom ou da promoção.", delay: "Informe um número inteiro de 0 a 60." },
  },
}

/** A API recusou o salvamento. */
export const RecusadoPelaApi: Story = { args: { error: "Este benefício não pode ser anunciado: escolha uma promoção de primeira compra ou um cupom de primeira compra mostrado na loja." } }

/** Salvo. */
export const Salvo: Story = { args: { saved: true, initial: { enabled: true } } }

/** Salvando: os campos ficam travados. */
export const Salvando: Story = { args: { pending: true } }

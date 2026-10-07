// UI
import type { PopupAnnouncing, PopupBenefitChoice, PopupFormValues } from "@harness-monorepo/ui/lib/popup-form"
import type { PopupWords } from "@harness-monorepo/ui/lib/shop-popup"

/** The form as a shop that never saved one reads it. */
export const popupValues: PopupFormValues = { enabled: false, imageUrl: "", title: "", text: "", buttonLabel: "", trigger: "ON_ARRIVAL", delay: "5", benefit: "AUTO" }

export const popupChoices: PopupBenefitChoice[] = [
  { value: "AUTO", label: "Seguir o destaque de primeira compra da loja" },
  { value: "PROMOTION:01931f2e-0000-7000-8000-0000000000a1", label: "Promoção Primeira compra: 15% de desconto" },
  { value: "COUPON:01931f2e-0000-7000-8000-0000000000b1", label: "Cupom PRIMEIRA5: 5% de desconto" },
]

export const popupDefaults = { title: "Ganhe 5% de desconto na primeira compra", text: "Crie sua conta e o desconto é seu.", buttonLabel: "Ganhar cupom" }

export const popupWords: PopupWords = { ...popupDefaults, detail: null }
export const popupPlainWords: PopupWords = { title: "Crie sua conta na loja", text: "Acompanhe seus pedidos, salve favoritos e compre mais rápido.", detail: null, buttonLabel: "Criar minha conta" }

export const popupAnnouncing: PopupAnnouncing = { tone: "benefit", sentence: "O pop-up está anunciando 5% de desconto." }
export const popupAnnouncingNothing: PopupAnnouncing = { tone: "nothing", sentence: "Sua loja não tem benefício de primeira compra valendo. O pop-up convida a criar a conta e não promete desconto nenhum." }

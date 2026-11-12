// Block
import type { AffiliateAcceptanceFormValues, AffiliateInvitationView } from "@harness-monorepo/ui/lib/affiliates"

export const invitation: AffiliateInvitationView = {
  storeName: "Lessari Suplementos",
  storeLogoUrl: null,
  email: "joao@exemplo.com",
  generalRate: "10%",
  categories: [{ name: "Acessórios", rate: "15%" }],
  products: [
    { name: "Whey Concentrado", rate: "25%" },
    { name: "Creatina", rate: "0%" },
  ],
  termsText: "A comissão é paga por Pix, no calendário do programa.\nNão vale divulgar com desconto que a loja não dá.",
  expires: "18/11/2026",
}

export const acceptance: AffiliateAcceptanceFormValues = { slug: "joao", pixKey: "", name: "João Silva", password: "", agreed: false }

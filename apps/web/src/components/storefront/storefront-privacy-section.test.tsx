// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// UI
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { StorefrontPrivacySection } from "./storefront-privacy-section"

const profile = { email: "bia@exemplo.com", hasPassword: true, cashback: { balanceCents: 800, pendingCents: 599 } }

function renderSection(cashback = profile.cashback) {
  return render(
    <StorefrontPrivacySection slug="loja" accountHref="/loja/conta/perfil" signInHref="/loja/entrar" profile={{ ...profile, cashback }} query={{}} locale="pt-BR" errors={web.errors} messages={ptBR} />,
  )
}

describe("StorefrontPrivacySection", () => {
  /** BEELINK-244: deleting the account voids the credit usable now and the credit waiting on a delivery alike. */
  it("says how much cashback deleting the account takes: what is usable and what is pending, together", () => {
    renderSection()

    expect(screen.getByText(/Você também perde R\$\s13,99 de cashback nesta loja\./)).toBeInTheDocument()
  })

  it("says nothing of cashback to a shopper who has none", () => {
    renderSection({ balanceCents: 0, pendingCents: 0 })

    expect(screen.queryByText(/de cashback nesta loja/)).toBeNull()
  })
})

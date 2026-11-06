import type { Meta, StoryObj } from "@storybook/react-vite"

import { shopPaletteStyle } from "@harness-monorepo/ui/lib/shop-palette"

import { sampleColorPresets } from "../store/store.fixtures"
import { StorefrontCartTotals } from "./storefront-cart-totals"
import { StorefrontCheckoutLayout } from "./storefront-checkout-layout"
import { StorefrontCheckoutStep } from "./storefront-checkout-step"
import { StorefrontCheckoutSummary } from "./storefront-checkout-summary"
import { StorefrontCoupon } from "./storefront-coupon"

const meta = {
  title: "Blocos/Vitrine/Checkout · página",
  component: StorefrontCheckoutLayout,
  parameters: { layout: "padded" },
  decorators: [(Story) => <div style={{ ...shopPaletteStyle(sampleColorPresets[2]!.colors), backgroundColor: "var(--shop-canvas)", padding: 16 }}>{Story()}</div>],
  args: {
    summary: (
      <StorefrontCheckoutSummary
        rows={[{ key: "top", name: "Top Fitness Preto com Alças Finas", href: "#", variantLabel: "Cor: Preto · Tamanho: M", imageUrl: null, unitPriceCents: 12900, qty: 1, lineTotalCents: 12900, available: true }]}
        count={1}
        amount="R$ 129,00"
        editHref="#"
        locale="pt-BR"
      >
        <StorefrontCartTotals subtotalCents={12900} count={1} locale="pt-BR" />
      </StorefrontCheckoutSummary>
    ),
    controls: <StorefrontCoupon applied={null} collapsed />,
    steps: (
      <>
        <StorefrontCheckoutStep step={1} total={3} title="Seus dados" state="open">
          <p className="text-sm">Os campos de quem compra.</p>
        </StorefrontCheckoutStep>
        <StorefrontCheckoutStep step={2} total={3} title="Entrega" state="locked" hint="Depois dos seus dados." />
        <StorefrontCheckoutStep step={3} total={3} title="Pagamento" state="locked" hint="Depois da entrega." />
      </>
    ),
  },
} satisfies Meta<typeof StorefrontCheckoutLayout>

export default meta
type Story = StoryObj<typeof meta>

/** No celular: o resumo fechado, o cupom recolhido e a primeira etapa na primeira tela. */
export const Padrao: Story = {}

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontLoadMore } from "./storefront-load-more"

const meta = {
  title: "Blocos/Vitrine/Carregar mais produtos",
  component: StorefrontLoadMore,
  parameters: { layout: "padded" },
  args: { href: "/lessari/produtos?pagina=2", onLoad: () => {}, productsPerRow: 3 },
  render: (args) => (
    <section className="@container">
      <StorefrontLoadMore {...args} />
    </section>
  ),
} satisfies Meta<typeof StorefrontLoadMore>

export default meta
type Story = StoryObj<typeof meta>

/** At rest: the next page as a link, which the shelf loads on its own as it comes near. */
export const Pronto: Story = {}

export const Carregando: Story = { args: { pending: true } }

export const Falhou: Story = { args: { failed: true } }

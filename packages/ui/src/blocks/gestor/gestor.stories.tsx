// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { GestorBoard } from "./gestor-board"
import { GestorCouponList } from "./gestor-coupon-list"
import { GestorCourier } from "./gestor-courier"
import { GestorFrame } from "./gestor-frame"
import { GestorStart } from "./gestor-start"
import { gestorColumns, gestorCoupons, gestorEmptyColumns, gestorNav } from "./gestor.fixtures"

const noop = () => undefined

const meta = {
  title: "Blocos/Painel/Modo gestor",
  component: GestorBoard,
  parameters: { layout: "fullscreen" },
  args: { columns: gestorColumns, onAccept: noop, onRefuse: noop, current: 1041, allOrdersHref: "#", newSaleHref: "#" },
  render: (args) => (
    <GestorFrame shopName="Dindin da Leia" today="terça-feira, 10 de novembro" nav={gestorNav} current="orders" backHref="#" soundOn onSoundChange={noop} onTestSound={noop}>
      <GestorBoard {...args} />
    </GestorFrame>
  ),
} satisfies Meta<typeof GestorBoard>

export default meta
type Story = StoryObj<typeof meta>

export const PedidoChegando: Story = {}
export const SemPedidoNovo: Story = { args: { columns: { ...gestorColumns, NEW: [] } } }
export const Vazio: Story = { args: { columns: gestorEmptyColumns, current: null } }

export const Cupons: Story = {
  render: () => (
    <GestorFrame shopName="Dindin da Leia" today="terça-feira, 10 de novembro" nav={gestorNav} current="coupons" backHref="#" soundOn={false} onSoundChange={noop} onTestSound={noop}>
      <GestorCouponList rows={gestorCoupons} onToggle={noop} createHref="#" editHrefOf={() => "#"} />
    </GestorFrame>
  ),
}

export const ChamarEntregador: Story = {
  render: () => (
    <div className="max-w-md p-6">
      <GestorCourier whatsappHref="https://wa.me/?text=Entrega" />
    </div>
  ),
}

export const Comecar: Story = { render: () => <GestorStart open onStart={noop} /> }

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"
import { useState } from "react"
import { fn } from "storybook/test"

// Block
import { PageSettingsDialog, type PageSettingsValue } from "./page-settings-dialog"

const value: PageSettingsValue = {
  title: "Lançamento Whey Baunilha",
  slug: "lancamento-whey",
  display: { inMenu: true, usesChrome: true },
  seo: { title: "", description: "", imageUrl: "https://cdn.example/whey.png" },
}

const meta = {
  title: "Blocks/Design/PageSettingsDialog",
  component: PageSettingsDialog,
  args: {
    open: true,
    onOpenChange: fn(),
    value,
    onChange: fn(),
    addressPrefix: "/mutante/lp/",
    addressState: "available",
    onSubmit: fn(),
    pending: false,
  },
  render: function Controlled(args) {
    const [current, setCurrent] = useState(args.value)
    return <PageSettingsDialog {...args} value={current} onChange={setCurrent} />
  },
} satisfies Meta<typeof PageSettingsDialog>

export default meta
type Story = StoryObj<typeof meta>

export const Aberto: Story = {}
export const Salvando: Story = { args: { pending: true } }

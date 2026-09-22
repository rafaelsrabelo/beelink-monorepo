// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// Block
import { StorefrontHeading } from "./storefront-heading"

const meta = {
  title: "Blocos/Vitrine/Título",
  component: StorefrontHeading,
  parameters: { layout: "padded" },
} satisfies Meta<typeof StorefrontHeading>

export default meta
type Story = StoryObj<typeof meta>

/**
 * Uma placa que o lojista pôs na página. Centralizado, ao contrário de todo outro título da
 * vitrine: o título de um trilho fica sobre uma fileira de cartões e pertence à borda esquerda
 * deles; este não tem nada embaixo além do próximo bloco.
 */
export const Padrao: Story = {
  args: { title: "Novidades da semana", subtitle: "Chegou tudo isso nos últimos sete dias" },
}

/** Só o título, que é o caso comum. */
export const SoTitulo: Story = { args: { title: "Mais vendidos" } }

/** Vazio não desenha nada: um bloco em branco é um bloco que o lojista ainda está preenchendo. */
export const Vazio: Story = { args: {} }

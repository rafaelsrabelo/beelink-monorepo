// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@harness-monorepo/ui/components/carousel"
import { Card, CardContent } from "@harness-monorepo/ui/components/card"

const meta = {
  title: "Primitivos/Carousel",
  component: Carousel,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Carousel>

export default meta
type Story = StoryObj<typeof meta>

/**
 * O primitivo do shadcn, com as setas.
 *
 * **Onde ele serve, e onde não serve.** Ele é Embla, e Embla é dono do overflow: o viewport é
 * `overflow-hidden` e cada passo é um transform. Atrás de um login isso é irrelevante e as setas
 * saem de graça. Numa página pública, quem está sem script — ou antes da hidratação — vê os
 * primeiros itens e não alcança o resto, então a vitrine usa `blocks/storefront/scroll-rail`, que
 * rola nativo e põe as setas por cima. A regra e o porquê estão em docs/ai-rules/styling.md.
 */
export const Padrao: Story = {
  render: () => (
    <Carousel className="w-full max-w-xs">
      <CarouselContent>
        {Array.from({ length: 5 }, (_unused, at) => (
          <CarouselItem key={at}>
            <Card>
              <CardContent className="flex aspect-square items-center justify-center">
                <span className="text-4xl font-semibold">{at + 1}</span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
}

/** Vários por vez, que é o formato de uma prateleira de produtos. */
export const VariosPorVez: Story = {
  render: () => (
    <Carousel className="w-full max-w-md">
      <CarouselContent className="-ml-2">
        {Array.from({ length: 8 }, (_unused, at) => (
          <CarouselItem key={at} className="basis-1/3 pl-2">
            <Card>
              <CardContent className="flex aspect-square items-center justify-center">
                <span className="text-2xl font-semibold">{at + 1}</span>
              </CardContent>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselPrevious />
      <CarouselNext />
    </Carousel>
  ),
}

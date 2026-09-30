import type { Meta, StoryObj } from "@storybook/react-vite"

import { LegalDocument } from "./legal-document"
import { sampleLegalDocument } from "./legal-document.fixtures"

const meta = {
  title: "Blocos/Legal/Documento",
  component: LegalDocument,
  parameters: { layout: "padded" },
  args: { content: sampleLegalDocument },
} satisfies Meta<typeof LegalDocument>

export default meta
type Story = StoryObj<typeof meta>

/** Os termos de uso ou a política de privacidade do bee-link, como a página pública desenha. */
export const Padrao: Story = {}

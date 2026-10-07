// React
import { useState } from "react"

// Libs
import type { Meta, StoryObj } from "@storybook/react-vite"

// UI
import type { MetaConversionsView, MetaTestEventView } from "@harness-monorepo/ui/lib/integrations"

// Block
import { META_EVENTS_MANAGER } from "./integrations.fixtures"
import { MetaConversionsCard } from "./meta-conversions-card"

const noop = () => {}
const none: MetaConversionsView = { available: true, token: "NONE", refusal: null }
const set: MetaConversionsView = { available: true, token: "SET", refusal: null }

const meta = {
  title: "Blocos/Painel/Integrações/Pixel da Meta — compras pelo servidor",
  component: MetaConversionsCard,
  decorators: [(Story) => <div className="max-w-3xl">{Story()}</div>],
  args: { view: set, eventsManagerHref: META_EVENTS_MANAGER, onSaveToken: noop, onRemoveToken: noop, onTest: noop },
} satisfies Meta<typeof MetaConversionsCard>

export default meta
type Story = StoryObj<typeof meta>

/** Um token salvo: o selo verde, nunca o token, trocar ou remover, e o evento de teste. */
export const TokenSalvo: Story = {}

/** Sem token: o campo, mascarado e vazio, e onde gerar o token na Meta. Sem evento de teste. */
export const SemToken: Story = { args: { view: none } }

/** A Meta recusou o token: o que parou, e trocar o token em destaque. */
export const TokenRecusado: Story = { args: { view: { available: true, token: "REJECTED", refusal: "TOKEN_REJECTED" } } }

/** A Meta não achou o pixel com este token. */
export const PixelNaoEncontrado: Story = { args: { view: { available: true, token: "REJECTED", refusal: "PIXEL_NOT_FOUND" } } }

/** A instalação não tem onde guardar o token: nenhum campo. */
export const Indisponivel: Story = { args: { view: { available: false, token: "NONE", refusal: null } } }

/** A recusa da API em palavras, sob o campo. */
export const TokenInvalido: Story = { args: { view: none, tokenError: "Não foi possível salvar o token. Tente de novo." } }

/** A Meta aceitou o evento de teste. */
export const TesteAceito: Story = { args: { testResult: { tone: "done", message: "A Meta aceitou o evento. Ele deve aparecer em “Testar eventos” em alguns segundos, com o nome BeeLinkTestEvent.", detail: null } } }

/** A Meta recusou o evento, com as palavras dela ao lado. */
export const TesteRecusado: Story = {
  args: { testResult: { tone: "error", message: "A Meta aceitou o token, mas recusou o evento. Confira o código de teste e tente de novo.", detail: "Meta refused (400, code 100): Invalid parameter" } },
}

/** O cartão como a tela o liga: salvar leva um instante; o teste responde "aceito" para TEST12345 e "recusado" para o resto. */
function Live() {
  const [view, setView] = useState<MetaConversionsView>(none)
  const [saved, setSaved] = useState(0)
  const [busy, setBusy] = useState<"token" | "test" | null>(null)
  const [result, setResult] = useState<MetaTestEventView | null>(null)

  function later(what: "token" | "test", then: () => void) {
    setBusy(what)
    window.setTimeout(() => {
      setBusy(null)
      then()
    }, 800)
  }

  return (
    <MetaConversionsCard
      key={saved}
      view={view}
      eventsManagerHref={META_EVENTS_MANAGER}
      onSaveToken={() =>
        later("token", () => {
          setView(set)
          setSaved((count) => count + 1)
          setResult(null)
        })
      }
      savingToken={busy === "token"}
      onRemoveToken={() => {
        setView(none)
        setResult(null)
      }}
      onTest={(code) =>
        later("test", () =>
          setResult(code === "TEST12345" ? { tone: "done", message: "A Meta aceitou o evento.", detail: null } : { tone: "error", message: "A Meta aceitou o token, mas recusou o evento.", detail: "Meta refused (400, code 100): Invalid test event code" }),
        )
      }
      testing={busy === "test"}
      testResult={result}
    />
  )
}

export const AoVivo: Story = { render: () => <Live /> }

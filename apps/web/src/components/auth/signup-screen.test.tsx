// React
import type { ReactNode } from "react"

// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { SiteTrackContext } from "@/components/site-analytics/use-site-track"
import { SignupScreen } from "./signup-screen"
import type { SiteEvent } from "@/lib/site-analytics"

const ANA = { name: "Ana Souza", email: "ana@exemplo.com", password: "uma-senha-bem-comprida" }

/** The BFF's answer to the sign-up, stood in for. */
function answer(response: Response) {
  const fetched = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>(async () => response)
  vi.stubGlobal("fetch", fetched)
  return fetched
}

function open(told?: (event: SiteEvent) => void) {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } })
  const measured = (page: ReactNode) => (told ? <SiteTrackContext value={told}>{page}</SiteTrackContext> : page)

  return render(<QueryClientProvider client={client}>{measured(<SignupScreen ui={ui} web={web} />)}</QueryClientProvider>)
}

async function signUp() {
  const user = userEvent.setup()
  await user.type(screen.getByLabelText("Nome"), ANA.name)
  await user.type(screen.getByLabelText("E-mail"), ANA.email)
  await user.type(screen.getByLabelText("Senha"), ANA.password)
  await user.click(screen.getByRole("button", { name: "Criar conta" }))
}

afterEach(() => {
  vi.unstubAllGlobals()
})

/** BEELINK-320: an account created is told, once the API took it, and nothing of the person goes with it. */
describe("SignupScreen", () => {
  it("tells an account created once the API accepted it — the event's name, and nothing the form holds", async () => {
    const told = vi.fn<(event: SiteEvent) => void>()
    const fetched = answer(Response.json({ id: "u-1", name: ANA.name, email: ANA.email }, { status: 201 }))
    open(told)

    await signUp()

    expect(await screen.findByText("Confira seu e-mail")).toBeInTheDocument()
    expect(fetched).toHaveBeenCalledTimes(1)
    expect(told.mock.calls).toEqual([[{ name: "sign_up" }]])
    expect(JSON.stringify(told.mock.calls)).not.toMatch(/Ana|exemplo|senha/)
  })

  it("tells nothing of a sign-up the API refused", async () => {
    const told = vi.fn<(event: SiteEvent) => void>()
    answer(Response.json({ statusCode: 409, errorCode: "AUTH_EMAIL_TAKEN", message: "taken" }, { status: 409 }))
    open(told)

    await signUp()

    expect(await screen.findByRole("alert")).toBeInTheDocument()
    expect(told).not.toHaveBeenCalled()
  })

  it("tells nothing of a form that was never sent", async () => {
    const told = vi.fn<(event: SiteEvent) => void>()
    const fetched = answer(Response.json({}, { status: 201 }))
    open(told)

    await userEvent.click(screen.getByRole("button", { name: "Criar conta" }))

    expect(fetched).not.toHaveBeenCalled()
    expect(told).not.toHaveBeenCalled()
  })

  it("signs up all the same on a page nobody measures", async () => {
    answer(Response.json({ id: "u-1", name: ANA.name, email: ANA.email }, { status: 201 }))
    open()

    await signUp()

    expect(await screen.findByText("Confira seu e-mail")).toBeInTheDocument()
  })
})

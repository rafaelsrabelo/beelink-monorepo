// Libs
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { Store, StoreSlugAvailability } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { ptBR as web } from "@/locales/pt-BR"
import { StoreRequestError } from "@/services/stores/store-requests"
import { StoreAddressScreen } from "./store-address-screen"

const mocks = vi.hoisted(() => ({ store: vi.fn(), availability: vi.fn(), change: vi.fn(), replace: vi.fn() }))
vi.mock("@/services/stores/store-hooks", () => ({ useStore: mocks.store, useStoreSlugAvailability: mocks.availability, useChangeStoreSlug: mocks.change }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }) }))

const page = { id: "1", slug: "padaria-do-bairo", name: "Padaria do Bairro", slugChangeableOn: null, customDomain: null } as unknown as Store
const mutate = vi.fn()
const reset = vi.fn()

function with_(state: { store?: Partial<Store>; answer?: StoreSlugAvailability; changing?: boolean; error?: Error }) {
  mocks.store.mockReturnValue({ isPending: false, isError: false, data: { ...page, ...state.store } })
  mocks.availability.mockImplementation((_slug: string, asked: string) => ({ data: state.answer && state.answer.slug === asked ? state.answer : undefined, isFetching: false, isError: false }))
  mocks.change.mockReturnValue({ mutate, reset, isPending: state.changing ?? false, isSuccess: false, isError: Boolean(state.error), error: state.error ?? null })
}

const view = (changed = false) => render(<StoreAddressScreen slug="padaria-do-bairo" prefix="beelink.biz/" changed={changed} back={{ href: "/admin/padaria-do-bairo/store", label: "Configurações da loja" }} locale="pt-BR" ui={ui} web={web} />)
const field = () => screen.getByLabelText("Novo endereço")

beforeEach(() => {
  for (const mock of [mutate, reset, mocks.replace]) mock.mockReset()
  with_({})
})

afterEach(() => vi.useRealTimers())

describe("StoreAddressScreen (BEELINK-331)", () => {
  it("is a page of its own under the settings: the way back, the address the page has, the field", () => {
    view()

    expect(screen.getByRole("link", { name: "Configurações da loja" })).toHaveAttribute("href", "/admin/padaria-do-bairo/store")
    expect(screen.getByRole("heading", { level: 1, name: "Trocar endereço" })).toBeInTheDocument()
    expect(screen.getByText("O endereço da sua página é beelink.biz/padaria-do-bairo.")).toBeInTheDocument()
    expect(field()).toBeInTheDocument()
  })

  it("shows the address as it will be stored at once, asks the API after a pause, and says it is free", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    with_({ answer: { slug: "padaria-do-bairro", available: true, reason: null } })
    view()

    await userEvent.type(field(), "Padaria do Bairro")
    expect(screen.getByText("Vai ficar assim: beelink.biz/padaria-do-bairro")).toBeInTheDocument()
    expect(screen.getByText("Conferindo se o endereço está livre")).toBeInTheDocument()

    await act(() => vi.advanceTimersByTimeAsync(400))
    expect(mocks.availability).toHaveBeenLastCalledWith("padaria-do-bairo", "padaria-do-bairro")
    expect(screen.getByText("Este endereço está livre.")).toBeInTheDocument()
  })

  it("changes to the address as it will be stored once the question is answered, and the panel goes there saying so", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    with_({ answer: { slug: "padaria-do-bairro", available: true, reason: null } })
    view()

    await userEvent.type(field(), "Padaria do Bairro")
    await act(() => vi.advanceTimersByTimeAsync(400))
    await userEvent.click(screen.getByRole("button", { name: "Trocar endereço" }))
    await userEvent.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: "Trocar endereço" }))

    expect(mutate).toHaveBeenCalledWith({ slug: "padaria-do-bairro" }, expect.objectContaining({ onSuccess: expect.any(Function) }))
    const [, { onSuccess }] = mutate.mock.calls[0] as [unknown, { onSuccess: (store: Store) => void }]
    onSuccess({ ...page, slug: "padaria-do-bairro" })
    expect(mocks.replace).toHaveBeenCalledWith("/admin/padaria-do-bairro/store/address?trocado=1")
  })

  it("says it is done, at the new address, and from when another change is accepted", () => {
    with_({ store: { slug: "padaria-do-bairro", slugChangeableOn: "2026-11-16" } })
    view(true)

    expect(screen.getByText("Pronto: o endereço da página agora é beelink.biz/padaria-do-bairro. O antigo continua funcionando e leva para cá.")).toBeInTheDocument()
    expect(screen.getByText("O endereço foi trocado há menos de 30 dias. Você poderá trocar de novo a partir de 16/11/2026.")).toBeInTheDocument()
    expect(screen.queryByLabelText("Novo endereço")).toBeNull()
  })

  it("says why a change was refused — the day, when it was too soon", () => {
    with_({ error: new StoreRequestError("STORE_SLUG_CHANGE_TOO_SOON", { changeableOn: "2026-11-16" }) })
    view()

    expect(screen.getByText("O endereço só pode ser trocado de novo a partir de 16/11/2026.")).toBeInTheDocument()
  })

  it("says the page's own domain stays as it is", () => {
    with_({ store: { customDomain: { host: "padaria.com.br", status: "ACTIVE" } } })
    view()

    expect(screen.getByText("Seu domínio próprio, padaria.com.br, continua o mesmo.")).toBeInTheDocument()
  })

  it("is the skeleton while the page is read, still titled for a reader", () => {
    mocks.store.mockReturnValue({ isPending: true, isError: false })
    view()

    expect(screen.getByRole("heading", { level: 1, name: "Trocar endereço" })).toHaveClass("sr-only")
    expect(screen.queryByLabelText("Novo endereço")).toBeNull()
  })
})

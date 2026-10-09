// Libs
import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { en } from "@/locales/en"
import { ptBR as web } from "@/locales/pt-BR"
import { StoreSettingsScreen } from "./store-settings-screen"

const mocks = vi.hoisted(() => ({ store: vi.fn(), form: vi.fn(), uploads: [] as Array<() => void> }))
const idle = { isPending: false, isSuccess: false, error: null, reset: () => {} }
vi.mock("@/services/stores/store-hooks", () => ({ useStore: mocks.store, useStoreCategories: () => ({ data: [] }), useUpdateStore: () => ({ ...idle, mutate: () => {} }) }))
vi.mock("@/services/cep/cep-hooks", () => ({ useZipCodeLookup: () => ({ ...idle, lookup: () => {}, pending: false }) }))
vi.mock("@/services/addresses/address-hooks", () => ({ useAddressSearch: () => ({ suggestions: [], pending: false }), DEBOUNCE_MS: 0 }))
// Each call its own handle, as the hook gives: the screen asks for the logo's first and the icon's second.
vi.mock("@/services/uploads/upload-hooks", () => ({
  useImageUpload: () => {
    const upload = () => {}
    mocks.uploads.push(upload)
    return { ...idle, upload, pending: mocks.uploads.length % 2 === 0 }
  },
}))
// What this test is about is around the form, not in it: the form, its values and its extra tab stand as a word.
vi.mock("@harness-monorepo/ui/blocks/store/store-settings-form", () => ({
  StoreSettingsForm: (props: object) => {
    mocks.form(props)
    return <form aria-label="settings" />
  },
}))
vi.mock("@/components/store/store-payloads", () => ({ toSettingsValues: () => ({}), toUpdatePayload: () => ({}) }))
vi.mock("@/components/store/store-delivery-tab", () => ({ StoreDeliveryTab: () => null }))

const view = (messages = web) => render(<StoreSettingsScreen slug="lessari" locale="pt-BR" ui={ui} web={messages} />)

beforeEach(() => {
  mocks.form.mockClear()
  mocks.uploads.length = 0
  mocks.store.mockReturnValue({ isPending: false, isError: false, data: { slug: "lessari", latitude: null, longitude: null } })
})

describe("StoreSettingsScreen, the shop's browser icon (BEELINK-312)", () => {
  /** One upload each: with the logo's state alone, sending the logo would say "sending" on the icon's field too. */
  it("hands the icon an upload and a pending of its own, apart from the logo's, and bee-link's icon for the preview", () => {
    view()

    const [logoUpload, iconUpload] = mocks.uploads
    expect(mocks.uploads).toHaveLength(2)
    expect(mocks.form).toHaveBeenLastCalledWith(
      expect.objectContaining({ onImageUpload: logoUpload, imageUploadPending: false, onFaviconUpload: iconUpload, faviconUploadPending: true, platformIconUrl: "/icon.png" }),
    )
    expect(iconUpload).not.toBe(logoUpload)
  })
})

describe("StoreSettingsScreen, the way to the shop's own domain (BEELINK-285)", () => {
  /** The panel's menu has no group of settings: the domain's screen is reached from here and from the home's card. */
  it("leads to the domain's screen, under the form", () => {
    view()

    const link = screen.getByRole("link", { name: "Configurar domínio próprio" })
    expect(link).toHaveAttribute("href", "/admin/lessari/domain")
    expect(link.parentElement).toHaveTextContent("O endereço da sua página pode ser o seu próprio domínio. Configurar domínio próprio")
    expect(screen.getByRole("form", { name: "settings" }).compareDocumentPosition(link) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it("says it in the language the screen is handed", () => {
    view(en)

    expect(screen.getByRole("link", { name: "Set up your own domain" })).toHaveAttribute("href", "/admin/lessari/domain")
  })

  it("offers no way there while the shop is read, or when its read failed", () => {
    mocks.store.mockReturnValue({ isPending: true, isError: false })
    const { unmount } = view()
    expect(screen.queryByRole("link")).toBeNull()
    unmount()

    mocks.store.mockReturnValue({ isPending: false, isError: true, error: new Error("x") })
    view()
    expect(screen.queryByRole("link")).toBeNull()
    expect(screen.getByRole("alert")).toBeInTheDocument()
  })
})

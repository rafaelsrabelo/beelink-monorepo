// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { beforeEach, describe, expect, it, vi } from "vitest"

// Types
import type { AffiliatePageOverview, AffiliateProgramOverview, ShopAffiliateApplicationPage } from "@harness-monorepo/contracts"

// UI
import { ptBR as ui } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { AffiliateError } from "@/services/affiliates/affiliate-requests"
import { AffiliateApplicationsScreen } from "./affiliate-applications-screen"

const mocks = vi.hoisted(() => ({ list: vi.fn(), decide: vi.fn(), page: vi.fn(), replace: vi.fn(), params: { current: new URLSearchParams() }, error: { current: null as Error | null } }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: mocks.replace }), useSearchParams: () => mocks.params.current }))
vi.mock("@/services/affiliates/affiliate-hooks", () => ({ useAffiliateProgram: () => ({ isPending: false, isError: false, data: program }) }))
vi.mock("@/services/affiliates/affiliate-page-hooks", () => ({
  useAffiliatePage: mocks.page,
  useAffiliateApplications: mocks.list,
  useDecideAffiliateApplication: () => ({ mutate: mocks.decide, reset: vi.fn(), isPending: false, error: mocks.error.current }),
}))

const program: AffiliateProgramOverview = {
  program: { enabled: true, attributionDays: 30, payoutDelayDays: 10, termsText: null, termsVersion: 0, updatedAt: "2026-11-11T12:00:00.000Z" },
  tables: [
    { id: "padrao", name: "Padrão", defaultRateBps: 1000, isDefault: true, productRateCount: 0, categoryRateCount: 0, affiliateCount: 0, affiliate: null },
    { id: "revenda", name: "Revendedoras", defaultRateBps: 1500, isDefault: false, productRateCount: 0, categoryRateCount: 0, affiliateCount: 0, affiliate: null },
  ],
  periods: [],
  linksLive: true,
}
const applications: ShopAffiliateApplicationPage = {
  applications: [{ id: "a1", name: "Ana Souza", email: "ana@exemplo.com", phone: "5511955554444", extraQuestion: null, extraAnswer: "@ana", status: "PENDING", createdAt: "2026-11-14T17:32:00.000Z", decidedAt: null, affiliate: null }],
  total: 1,
  page: 1,
  pageSize: 20,
  pendingCount: 1,
}
const overview = { page: { tableId: "revenda" }, pendingApplications: 1 } as AffiliatePageOverview

beforeEach(() => {
  mocks.decide.mockReset()
  mocks.replace.mockReset()
  mocks.error.current = null
  mocks.params.current = new URLSearchParams()
  mocks.list.mockReturnValue({ isPending: false, isError: false, isFetching: false, data: applications })
  mocks.page.mockReturnValue({ data: overview })
})

describe("AffiliateApplicationsScreen (plan 2026-11-14)", () => {
  it("lists the new applications by default, with the count beside the tab", () => {
    render(<AffiliateApplicationsScreen slug="loja" locale="pt-BR" messages={ui} />)

    expect(mocks.list).toHaveBeenCalledWith("loja", "PENDING", 1)
    expect(screen.getByText("Ana Souza")).toBeInTheDocument()
    expect(screen.getByText("(11) 95555-4444", { exact: false })).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Candidaturas 1" })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("link", { name: "Aprovadas" })).toHaveAttribute("href", "/admin/loja/affiliates/applications?status=APPROVED")
  })

  it("reads the filter and the page from the address", () => {
    mocks.params.current = new URLSearchParams("status=REFUSED&page=2")
    render(<AffiliateApplicationsScreen slug="loja" locale="pt-BR" messages={ui} />)
    expect(mocks.list).toHaveBeenCalledWith("loja", "REFUSED", 2)
  })

  it("approves on the table the page announces, unless another is chosen", async () => {
    render(<AffiliateApplicationsScreen slug="loja" locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("button", { name: "Aprovar e convidar" }))
    const dialog = within(screen.getByRole("dialog", { name: "Aprovar Ana Souza?" }))
    await userEvent.click(dialog.getByRole("button", { name: "Enviar convite" }))
    expect(mocks.decide).toHaveBeenCalledWith({ applicationId: "a1", act: "approve", approval: { tableId: "revenda" } }, expect.anything())
  })

  it("asks once more before refusing, and refuses", async () => {
    render(<AffiliateApplicationsScreen slug="loja" locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("button", { name: "Recusar" }))
    const dialog = within(screen.getByRole("alertdialog", { name: "Recusar Ana Souza?" }))
    await userEvent.click(dialog.getByRole("button", { name: "Recusar" }))
    expect(mocks.decide).toHaveBeenCalledWith({ applicationId: "a1", act: "refuse" }, expect.anything())
  })

  it("says the API's refusal in the question it answers", async () => {
    mocks.error.current = new AffiliateError("AFFILIATE_EMAIL_TAKEN")
    render(<AffiliateApplicationsScreen slug="loja" locale="pt-BR" messages={ui} />)

    await userEvent.click(screen.getByRole("button", { name: "Aprovar e convidar" }))
    expect(within(screen.getByRole("dialog")).getByRole("alert")).toHaveTextContent("Esse e-mail já é de um afiliado da loja.")
  })
})

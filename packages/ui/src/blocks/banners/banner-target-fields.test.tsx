// React
import { useState } from "react"

// Libs
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { EMPTY_BANNER } from "./banner-form-types"
import type { BannerFormValues } from "./banner-form-types"
import { BannerTargetFields } from "./banner-target-fields"

function Harness({ start = EMPTY_BANNER }: { start?: BannerFormValues }) {
  const [value, setValue] = useState(start)

  return (
    <BannerTargetFields
      value={value}
      onChange={setValue}
      categories={[{ slug: "blusas", name: "Blusas" }]}
      products={[{ slug: "whey", name: "Whey 900g" }]}
    />
  )
}

describe("BannerTargetFields", () => {
  it("shows only the destination the target names", () => {
    render(<Harness />)

    expect(screen.getByLabelText("Categoria")).toBeInTheDocument()
    expect(screen.queryByLabelText("Endereço")).not.toBeInTheDocument()
  })

  it("asks for an address, typed as a URL, when the banner leaves the shop", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByLabelText("Para onde leva"))
    await user.click(await screen.findByRole("option", { name: "Um endereço fora da loja" }))

    expect(screen.getByLabelText("Endereço")).toHaveAttribute("type", "url")
  })

  /** Base UI spells "nothing chosen" as an empty string, so the placeholder needs a sentinel. */
  it("names the empty picker rather than showing its sentinel", () => {
    render(<Harness />)

    expect(screen.getByLabelText("Categoria")).toHaveTextContent("Escolha uma categoria")
  })

  /** The only target with no field under it — nothing further is asked because nothing exists. */
  it("asks for nothing when the banner goes nowhere, and says why", async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.click(screen.getByLabelText("Para onde leva"))
    await user.click(await screen.findByRole("option", { name: "Nenhum — só informativo" }))

    expect(screen.queryByLabelText("Categoria")).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Endereço")).not.toBeInTheDocument()
    expect(screen.getByText(/não leva a lugar nenhum/)).toBeInTheDocument()
  })

  it("has no accessibility violations", async () => {
    const { container } = render(<Harness />)

    await expectNoA11yViolations(container)
  })
})

// Node
import { existsSync } from "node:fs"
import path from "node:path"

// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// UI
import { en } from "@harness-monorepo/ui/locales/en"
import { ptBR } from "@harness-monorepo/ui/locales/pt-BR"

// App
import { INTEGRATION_LOGOS } from "@/lib/integration-pages"
import { integrationMarksOf } from "./integration-mark"

const PUBLIC = path.resolve(__dirname, "../../../public")

/** The file an image was asked from: Next's optimiser carries it in `url=`, and serves an SVG from its own address. */
function fileOf(image: HTMLElement) {
  const src = image.getAttribute("src") ?? ""
  return src.startsWith("/_next/image") ? new URLSearchParams(src.slice(src.indexOf("?"))).get("url") : src
}

describe("integrationMarksOf", () => {
  it("draws each brand from the file the panel's Integrations page draws it from, read out by its own sentence", () => {
    const marks = integrationMarksOf(ptBR.landing.integrations.items)
    render(
      <>
        {marks.asaas}
        {marks.melhorEnvio}
        {marks.googleAnalytics}
        {marks.meta}
      </>,
    )

    expect(screen.getAllByRole("img").map((image) => [image.getAttribute("alt"), fileOf(image)])).toEqual([
      ["Logo do Asaas", INTEGRATION_LOGOS.ASAAS],
      ["Logo do Melhor Envio", INTEGRATION_LOGOS.MELHOR_ENVIO],
      ["Logo do Google Analytics", INTEGRATION_LOGOS.GOOGLE_ANALYTICS],
      ["Logo da Meta", INTEGRATION_LOGOS.META_PIXEL],
    ])
  })

  /** An address with no file behind it is a broken image only a browser would show. */
  it("names only files this app serves", () => {
    for (const file of Object.values(INTEGRATION_LOGOS)) expect(existsSync(path.join(PUBLIC, file)), file).toBe(true)
  })

  /** Next sends an SVG as it is and resizes a PNG: an SVG through the optimiser is refused with a 400. */
  it("leaves a vector as it is, and has a bitmap served at the size it is drawn", () => {
    const marks = integrationMarksOf(ptBR.landing.integrations.items)
    render(
      <>
        {marks.asaas}
        {marks.meta}
      </>,
    )

    expect(screen.getByRole("img", { name: "Logo do Asaas" }).getAttribute("src")).toMatch(/^\/_next\/image\?/)
    expect(screen.getByRole("img", { name: "Logo da Meta" })).toHaveAttribute("src", INTEGRATION_LOGOS.META_PIXEL)
    for (const image of screen.getAllByRole("img")) {
      expect(image).toHaveAttribute("width", "56")
      expect(image).toHaveAttribute("height", "56")
    }
  })

  it("reads them out in the language it is handed", () => {
    render(<>{integrationMarksOf(en.landing.integrations.items).meta}</>)

    expect(screen.getByRole("img", { name: "Meta logo" })).toBeInTheDocument()
  })
})

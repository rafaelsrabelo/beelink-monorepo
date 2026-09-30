// Libs
import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// App
import { withParts } from "./text-parts"

describe("withParts", () => {
  it("puts each part where its placeholder stands, in the sentence's own order", () => {
    render(<p>{withParts("Você aceita os {terms} e leu a {privacy}.", { terms: <a href="/termos">Termos</a>, privacy: <a href="/privacidade">Política</a> })}</p>)

    expect(screen.getByText(/Você aceita os/)).toHaveTextContent("Você aceita os Termos e leu a Política.")
    expect(screen.getByRole("link", { name: "Termos" })).toHaveAttribute("href", "/termos")
    expect(screen.getByRole("link", { name: "Política" })).toHaveAttribute("href", "/privacidade")
  })

  it("follows a translation that moves the placeholders", () => {
    const parts = withParts("{privacy} read, {terms} accepted", { terms: "T", privacy: "P" })

    expect(parts.map((part) => (typeof part === "string" ? part : "·"))).toEqual(["·", " read, ", "·", " accepted"])
  })

  it("leaves a placeholder with no part as written, so it shows", () => {
    expect(withParts("aceita os {terms}", {})).toEqual(["aceita os ", "{terms}"])
  })
})

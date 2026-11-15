// Libs
import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"

// Block
import { expectNoA11yViolations } from "../../test/a11y"
import { StorefrontAffiliateJoinBanner } from "./storefront-affiliate-join-banner"
import { StorefrontAffiliateJoinForm } from "./storefront-affiliate-join-form"
import { StorefrontAffiliateJoinHero } from "./storefront-affiliate-join-hero"
import { StorefrontAffiliateJoinPicture } from "./storefront-affiliate-join-picture"
import { StorefrontAffiliateJoinSections } from "./storefront-affiliate-join-sections"
import { StorefrontAffiliateJoinSent } from "./storefront-affiliate-join-sent"
import { emptyJoinForm, joinForm, joinPage } from "./storefront-affiliate-join.fixtures"
import { StorefrontAffiliateLinkPreview } from "./storefront-affiliate-link-preview"

const noop = () => {}

describe("the shop's \"Seja afiliado\" page (plan 2026-11-14)", () => {
  it("says what the shop offers, opens the form from the top and from the closing call, and leaves out a section the shop emptied", async () => {
    const onOpen = vi.fn()
    const { container } = render(
      <>
        <StorefrontAffiliateJoinHero view={joinPage} aside={<StorefrontAffiliateLinkPreview base="lessari.com.br/" example="Uma venda de R$ 200,00 rende R$ 20,00." />} onOpen={onOpen} />
        <StorefrontAffiliateJoinSections view={{ ...joinPage, benefits: [] }} onOpen={onOpen} />
      </>,
    )

    expect(screen.getByRole("heading", { level: 1, name: joinPage.title })).toBeInTheDocument()
    expect(screen.getByText("lessari.com.br/")).toBeInTheDocument()
    expect(within(screen.getByRole("region", { name: "Como funciona" })).getAllByRole("listitem")).toHaveLength(3)
    expect(screen.queryByText("Preço de sempre")).toBeNull()
    for (const button of screen.getAllByRole("button", { name: "Quero ser afiliado" })) await userEvent.click(button)
    expect(onOpen).toHaveBeenCalledTimes(2)
    await expectNoA11yViolations(container)
  })

  it("takes the application, masks the WhatsApp, opens the terms, and says what does not hold", async () => {
    const onChange = vi.fn()
    const onTerms = vi.fn()
    const { container, rerender } = render(<StorefrontAffiliateJoinForm view={joinForm} value={emptyJoinForm} onChange={onChange} onSubmit={noop} onClose={noop} onTerms={onTerms} privacyHref="/privacidade" />)

    await userEvent.type(screen.getByRole("textbox", { name: "WhatsApp" }), "1")
    expect(onChange).toHaveBeenLastCalledWith({ ...emptyJoinForm, phone: "(1" })
    expect(screen.getByRole("textbox", { name: "Onde você vai divulgar? (opcional)" })).toBeInTheDocument()
    await userEvent.click(screen.getByRole("button", { name: "termos do programa" }))
    expect(onTerms).toHaveBeenCalledOnce()
    expect(screen.getByRole("link", { name: "política de privacidade" })).toHaveAttribute("href", "/privacidade")
    await expectNoA11yViolations(container)

    rerender(<StorefrontAffiliateJoinForm view={{ ...joinForm, extraQuestion: null }} value={emptyJoinForm} onChange={noop} onSubmit={noop} onClose={noop} onTerms={noop} privacyHref="/privacidade" issues={{ email: "Informe um e-mail válido." }} error="Tente de novo." />)
    expect(screen.getByRole("textbox", { name: "E-mail" })).toHaveAttribute("aria-invalid", "true")
    expect(screen.getByText("Tente de novo.")).toHaveAttribute("role", "alert")
    expect(screen.queryByText("Onde você vai divulgar?")).toBeNull()
  })

  it("keeps the field no person sees out of the tab order", () => {
    const { container } = render(<StorefrontAffiliateJoinForm view={joinForm} value={emptyJoinForm} onChange={noop} onSubmit={noop} onClose={noop} onTerms={noop} privacyHref="/privacidade" />)
    expect(container.querySelector('input[name="website"]')).toHaveAttribute("tabindex", "-1")
  })

  it("answers the application with what happens next", async () => {
    const { container } = render(<StorefrontAffiliateJoinSent title="Recebemos sua candidatura, Ana!" message="A Lessari vai analisar." homeHref="/lessari" />)

    const answer = screen.getByRole("status", { name: "Recebemos sua candidatura, Ana!" })
    expect(within(answer).getAllByRole("listitem")).toHaveLength(4)
    expect(within(answer).getByRole("link", { name: "Continuar comprando" })).toHaveAttribute("href", "/lessari")
    await expectNoA11yViolations(container)
  })

  it("draws the shop's own picture as decoration, the title saying what it shows", async () => {
    const { container } = render(<StorefrontAffiliateJoinPicture url="https://res.cloudinary.com/x.png" />)
    expect(container.querySelector("img")).toHaveAttribute("alt", "")
    await expectNoA11yViolations(container)
  })

  it("leads from the home's banner to the page, in the shop's colours", async () => {
    const { container } = render(<StorefrontAffiliateJoinBanner view={{ title: "Indique a Lessari", text: "Receba por Pix.", cta: "Quero ser afiliado" }} href="/lessari/seja-afiliado" />)

    expect(screen.getByRole("link", { name: "Quero ser afiliado" })).toHaveAttribute("href", "/lessari/seja-afiliado")
    expect(screen.getByRole("heading", { name: "Indique a Lessari" }).parentElement?.parentElement).toHaveClass("bg-shop-primary")
    await expectNoA11yViolations(container)
  })
})

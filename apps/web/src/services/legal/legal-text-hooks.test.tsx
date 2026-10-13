// React
import type { ReactNode } from "react"

// Node
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

// Libs
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { renderHook, waitFor } from "@testing-library/react"
import { describe, expect, it } from "vitest"

// App
import { legalKeys, useLegalText, type LegalTextName } from "./legal-text-hooks"
import { legalTexts } from "@/locales/legal/pt-BR"

function mount(name: LegalTextName, enabled: boolean) {
  const client = new QueryClient()
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  const hook = renderHook(({ on }: { on: boolean }) => useLegalText(name, on), { wrapper, initialProps: { on: enabled } })
  return { client, ...hook }
}

describe("useLegalText (BEELINK-322)", () => {
  it("fetches nothing until it is asked to", async () => {
    const { result, client } = mount("terms", false)

    // A turn of the queue, for a fetch that would have started.
    await new Promise((resolve) => setTimeout(resolve, 20))

    expect(result.current.fetchStatus).toBe("idle")
    expect(result.current.data).toBeUndefined()
    expect(client.getQueryData(legalKeys.text("terms"))).toBeUndefined()
  })

  it.each(["terms", "privacy"] as const)("hands over the %s exactly as the legal pages draw them, once enabled", async (name) => {
    const { result, rerender } = mount(name, false)

    rerender({ on: true })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBe(legalTexts[name])
    expect(result.current.data?.title).toBe(name === "terms" ? "Termos de uso" : "Política de privacidade")
  })

  it("keeps each text under its own key, and asks for it once however often it is opened", async () => {
    const { result, rerender, client } = mount("privacy", true)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const fetchedAt = result.current.dataUpdatedAt

    rerender({ on: false })
    rerender({ on: true })

    expect(result.current.isFetching).toBe(false)
    expect(result.current.dataUpdatedAt).toBe(fetchedAt)
    expect(client.getQueryData(legalKeys.text("privacy"))).toBe(legalTexts.privacy)
    expect(client.getQueryData(legalKeys.text("terms"))).toBeUndefined()
  })

  /**
   * The whole point of the hook: the text is reached by `import()` and by nothing else in what a
   * browser loads. A top-level import of it in any client file puts it back in the page's script.
   */
  it("is the only thing under `src` a browser loads that reaches the legal text, and reaches it by `import()` alone", () => {
    const src = join(process.cwd(), "src")
    const reaching = (readdirSync(src, { recursive: true }) as string[])
      .map((file) => file.replaceAll("\\", "/"))
      .filter((file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file) && !file.startsWith("locales/legal/"))
      .map((file) => ({ file, source: readFileSync(join(src, file), "utf8") }))
      .filter(({ source }) => /locales\/legal/.test(source))
      .map(({ file, source }) => ({ file, client: /^["']use client["']/m.test(source), statically: /^import [^;]*from ["'][^"']*locales\/legal[^"']*["']/m.test(source) }))

    // The two pages are Server Components: their text is HTML, and no script of theirs carries it.
    expect(
      reaching
        .filter((entry) => entry.statically)
        .map((entry) => entry.file)
        .sort(),
    ).toEqual(["app/(legal)/privacidade/page.tsx", "app/(legal)/termos/page.tsx"])
    expect(reaching.filter((entry) => entry.statically && entry.client)).toEqual([])
    expect(reaching.filter((entry) => !entry.statically).map((entry) => entry.file)).toEqual(["services/legal/legal-text-hooks.ts"])
  })
})

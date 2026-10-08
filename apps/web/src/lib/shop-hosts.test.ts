// Libs
import { afterEach, describe, expect, it, vi } from "vitest"

// Types
import type { CustomDomainEntry } from "@harness-monorepo/contracts"

// App
import { createShopHosts, hostNameOf, settledWithin, SHOP_HOSTS_FRESH_MS, SHOP_HOSTS_READ_TIMEOUT_MS, SHOP_HOSTS_RETRY_MS, shopHosts } from "./shop-hosts"

const LOJA: CustomDomainEntry = { host: "minhaloja.com.br", slug: "loja", status: "ACTIVE" }
const PENDING: CustomDomainEntry = { host: "aindanao.com.br", slug: "pendente", status: "PENDING" }

/** A copy over a reader the test answers, on a clock the test moves. */
function copy(answer: () => Promise<CustomDomainEntry[]>) {
  const clock = { now: 1_000_000 }
  const read = vi.fn(answer)

  return { clock, read, hosts: createShopHosts(read, () => clock.now) }
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("a read that may take only so long", () => {
  it("is what the work settled to, when it settled in time", async () => {
    await expect(settledWithin(Promise.resolve("table"), 50)).resolves.toBe("table")
    await expect(settledWithin(Promise.reject(new Error("refused")), 50)).rejects.toThrow("refused")
  })

  it("fails once the time is up, though the work never settles", async () => {
    vi.useFakeTimers()
    const read = settledWithin(new Promise<string>(() => {}), SHOP_HOSTS_READ_TIMEOUT_MS)
    const outcome = expect(read).rejects.toThrow(`No answer in ${SHOP_HOSTS_READ_TIMEOUT_MS} ms`)

    await vi.advanceTimersByTimeAsync(SHOP_HOSTS_READ_TIMEOUT_MS)
    await outcome
  })
})

describe("a host as the table spells one", () => {
  it("is lower case, with no port and no trailing dot", () => {
    expect(hostNameOf("MinhaLoja.com.br")).toBe("minhaloja.com.br")
    expect(hostNameOf("minhaloja.com.br:3100")).toBe("minhaloja.com.br")
    expect(hostNameOf("minhaloja.com.br.")).toBe("minhaloja.com.br")
    expect(hostNameOf("loja.localhost:3800")).toBe("loja.localhost")
    expect(hostNameOf("[::1]:3000")).toBe("[::1]")
    expect(hostNameOf("[::1]")).toBe("[::1]")
  })

  /** A chain of proxies lists several in `x-forwarded-host`: the first is the one the visitor addressed. */
  it("is the first of a list", () => {
    expect(hostNameOf("minhaloja.com.br, internal:3000")).toBe("minhaloja.com.br")
  })

  it("is nothing for no host at all", () => {
    expect(hostNameOf(null)).toBe("")
    expect(hostNameOf(undefined)).toBe("")
    expect(hostNameOf("  ")).toBe("")
  })
})

describe("the copy of which host is which shop's (BEELINK-283)", () => {
  it("says the shop of a host, and the host of a shop, comparing hosts with no port and in lower case", async () => {
    const { hosts } = copy(async () => [LOJA])
    const table = await hosts()

    expect(table.slugOf("minhaloja.com.br")).toBe("loja")
    expect(table.slugOf("MinhaLoja.com.br:3100")).toBe("loja")
    expect(table.hostOf("loja")).toBe("minhaloja.com.br")
    expect(table.slugOf("outra.com.br")).toBeNull()
    expect(table.slugOf("www.minhaloja.com.br")).toBeNull()
    expect(table.hostOf("outra")).toBeNull()
  })

  /** A pending domain is saved and not checked: its host opens no shop, and its shop is redirected nowhere. */
  it("knows nothing of a pending domain", async () => {
    const { hosts } = copy(async () => [PENDING, LOJA])
    const table = await hosts()

    expect(table.slugOf("aindanao.com.br")).toBeNull()
    expect(table.hostOf("pendente")).toBeNull()
    expect(table.slugOf("minhaloja.com.br")).toBe("loja")
  })

  it("drops a row that is not one, and keeps the rest", async () => {
    const { hosts } = copy(async () => [null, { host: 7, slug: "x", status: "ACTIVE" }, { host: "", slug: "y", status: "ACTIVE" }, LOJA] as unknown as CustomDomainEntry[])
    const table = await hosts()

    expect(table.slugOf("minhaloja.com.br")).toBe("loja")
    expect(table.hostOf("x")).toBeNull()
    expect(table.hostOf("y")).toBeNull()
  })

  it("is read once and answered from memory for a minute", async () => {
    const { clock, read, hosts } = copy(async () => [LOJA])

    await hosts()
    clock.now += SHOP_HOSTS_FRESH_MS - 1
    await hosts()
    await hosts()

    expect(read).toHaveBeenCalledTimes(1)
  })

  it("is read again once the minute is over, and says what changed", async () => {
    let entries = [LOJA]
    const { clock, read, hosts } = copy(async () => entries)

    expect((await hosts()).slugOf("minhaloja.com.br")).toBe("loja")
    entries = []
    clock.now += SHOP_HOSTS_FRESH_MS

    expect((await hosts()).slugOf("minhaloja.com.br")).toBeNull()
    expect(read).toHaveBeenCalledTimes(2)
  })

  it("has one read in flight, however many requests arrive while it is", async () => {
    let answer: (entries: CustomDomainEntry[]) => void = () => {}
    const { read, hosts } = copy(() => new Promise<CustomDomainEntry[]>((resolve) => (answer = resolve)))

    const waiting = [hosts(), hosts(), hosts()]
    answer([LOJA])
    const tables = await Promise.all(waiting)

    expect(read).toHaveBeenCalledTimes(1)
    for (const table of tables) expect(table.slugOf("minhaloja.com.br")).toBe("loja")
  })

  describe("when the API cannot answer", () => {
    it("keeps the last copy, rather than forget every shop's domain during an outage", async () => {
      let down = false
      const { clock, hosts } = copy(async () => {
        if (down) throw new Error("connection refused")
        return [LOJA]
      })

      await hosts()
      down = true
      clock.now += SHOP_HOSTS_FRESH_MS

      expect((await hosts()).slugOf("minhaloja.com.br")).toBe("loja")
    })

    it("knows no shop's domain when it never answered, and every host is then the platform's", async () => {
      const { hosts } = copy(async () => {
        throw new Error("connection refused")
      })

      const table = await hosts()

      expect(table.slugOf("minhaloja.com.br")).toBeNull()
      expect(table.hostOf("loja")).toBeNull()
    })

    it("asks again in a few seconds, not at every request and not a minute later", async () => {
      let down = true
      const { clock, read, hosts } = copy(async () => {
        if (down) throw new Error("connection refused")
        return [LOJA]
      })

      await hosts()
      await hosts()
      expect(read).toHaveBeenCalledTimes(1)

      down = false
      clock.now += SHOP_HOSTS_RETRY_MS
      expect((await hosts()).slugOf("minhaloja.com.br")).toBe("loja")
      expect(read).toHaveBeenCalledTimes(2)
    })
  })

  describe("this process's own copy", () => {
    it("reads the API's table with no session, and takes an answer that is no list for a read that failed", async () => {
      const fetched = vi.fn(async () => Response.json([LOJA, PENDING]))
      vi.stubGlobal("fetch", fetched)

      const table = await shopHosts()

      expect(String((fetched.mock.calls[0] as unknown[] | undefined)?.[0])).toBe("http://api.test/api/custom-domains")
      const init = (fetched.mock.calls[0] as unknown[] | undefined)?.[1] as RequestInit
      expect(init.method).toBe("GET")
      expect(new Headers(init.headers).has("authorization")).toBe(false)
      expect(table.slugOf("minhaloja.com.br")).toBe("loja")
      expect(table.slugOf("aindanao.com.br")).toBeNull()
    })
  })
})

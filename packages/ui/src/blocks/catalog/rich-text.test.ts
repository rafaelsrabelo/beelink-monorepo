// Libs
import { describe, expect, it } from "vitest"

// Block
import { domHtmlFromMarkdown, markdownFromDom } from "./rich-text"

function dom(html: string): HTMLElement {
  const host = document.createElement("div")
  host.innerHTML = html
  return host
}

describe("markdownFromDom", () => {
  it("keeps the formatting the toolbar can produce", () => {
    expect(markdownFromDom(dom("<p>uma <strong>blusa</strong> <em>leve</em></p>"))).toBe(
      "uma **blusa** _leve_",
    )
  })

  it("writes both kinds of list", () => {
    expect(markdownFromDom(dom("<ul><li>um</li><li>dois</li></ul>"))).toBe("- um\n- dois")
    expect(markdownFromDom(dom("<ol><li>um</li><li>dois</li></ol>"))).toBe("1. um\n2. dois")
  })

  /*
    The safety property. A node this walker does not know contributes its text and nothing else,
    so nothing a shopkeeper pastes can reach storage as markup — which is the whole reason the
    description is stored as Markdown rather than as HTML.
  */
  it("drops a pasted script to its words", () => {
    expect(markdownFromDom(dom("<p>oi</p><script>alert(1)</script>"))).toBe("oi\n\nalert(1)")
  })

  it("drops a pasted table to its words, keeping nothing structural", () => {
    const markdown = markdownFromDom(dom("<table><tr><td>a</td><td>b</td></tr></table>"))

    expect(markdown).not.toContain("<")
    expect(markdown).toContain("a")
  })

  it("keeps an http link and throws away a javascript one", () => {
    expect(markdownFromDom(dom('<a href="https://loja.com">aqui</a>'))).toBe("[aqui](https://loja.com)")
    // The words survive; the destination does not.
    expect(markdownFromDom(dom('<a href="javascript:alert(1)">aqui</a>'))).toBe("aqui")
  })

  it("escapes what would otherwise become formatting", () => {
    expect(markdownFromDom(dom("<p>2 * 3 _ 4</p>"))).toBe("2 \\* 3 \\_ 4")
  })
})

describe("domHtmlFromMarkdown", () => {
  it("brings the formatting back", () => {
    expect(domHtmlFromMarkdown("uma **blusa** _leve_")).toBe(
      "<p>uma <strong>blusa</strong> <em>leve</em></p>",
    )
  })

  it("brings both kinds of list back", () => {
    expect(domHtmlFromMarkdown("- um\n- dois")).toBe("<ul><li>um</li><li>dois</li></ul>")
    expect(domHtmlFromMarkdown("1. um\n2. dois")).toBe("<ol><li>um</li><li>dois</li></ol>")
  })

  // This function answers HTML, so it is the one that could be dangerous. Everything is escaped
  // before any tag is added, and the tags come from patterns this module controls.
  it("cannot be made to emit a tag from stored text", () => {
    const html = domHtmlFromMarkdown('<script>alert(1)</script> e <img src=x onerror=1>')

    expect(html).not.toContain("<script")
    expect(html).not.toContain("<img")
    expect(html).toContain("&lt;script&gt;")
  })

  it("only makes a link out of http(s)", () => {
    expect(domHtmlFromMarkdown("[aqui](https://loja.com)")).toContain('href="https://loja.com"')
    expect(domHtmlFromMarkdown("[aqui](javascript:alert(1))")).not.toContain("<a")
  })
})

describe("the round trip", () => {
  it("survives it, which is what the editor depends on", () => {
    const markdown = "uma **blusa** _leve_\n\n- algodão\n- lavável"

    expect(markdownFromDom(dom(domHtmlFromMarkdown(markdown)))).toBe(markdown)
  })
})

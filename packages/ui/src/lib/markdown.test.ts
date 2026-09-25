// Libs
import { describe, expect, it } from "vitest"

// Lib
import { firstListOf, parseInline, parseMarkdown, plainTextOf, withoutFirstList } from "./markdown"

describe("the description's Markdown", () => {
  it("reads paragraphs, both kinds of list, and the marks inside them", () => {
    expect(parseMarkdown("Um **whey** _bom_.\n\n- a\n- **b**\n\n1. um\n2. dois")).toEqual([
      {
        kind: "paragraph",
        lines: [
          [
            { kind: "text", text: "Um " },
            { kind: "strong", children: [{ kind: "text", text: "whey" }] },
            { kind: "text", text: " " },
            { kind: "em", children: [{ kind: "text", text: "bom" }] },
            { kind: "text", text: "." },
          ],
        ],
      },
      { kind: "list", ordered: false, items: [[{ kind: "text", text: "a" }], [{ kind: "strong", children: [{ kind: "text", text: "b" }] }]] },
      { kind: "list", ordered: true, items: [[{ kind: "text", text: "um" }], [{ kind: "text", text: "dois" }]] },
    ])
  })

  it("joins list items that a blank line separates into one list, as the first shops' text has them", () => {
    const blocks = parseMarkdown("Destaques\n\n- Proteína\n\n- Fácil de preparar\n\n- Pós-treino\n\nDepois.")

    expect(blocks.map((block) => block.kind)).toEqual(["paragraph", "list", "paragraph"])
    expect(firstListOf("Destaques\n\n- Proteína\n\n- Fácil de preparar")).toEqual([
      [{ kind: "text", text: "Proteína" }],
      [{ kind: "text", text: "Fácil de preparar" }],
    ])
  })

  it("gives 'Sobre este item' the first bulleted list with its bold leads, and never a numbered one", () => {
    const markdown = "Modo de uso:\n\n1. Misture\n2. Beba\n\n- **Mais energia** no treino\n- Foco\n\n- depois"

    expect(firstListOf(markdown)[0]).toEqual([{ kind: "strong", children: [{ kind: "text", text: "Mais energia" }] }, { kind: "text", text: " no treino" }])
    expect(firstListOf(markdown)).toHaveLength(3)
    expect(firstListOf("1. Misture\n2. Beba")).toEqual([])
  })

  it("leaves that list out of the rest, and only that one", () => {
    const rest = withoutFirstList("Intro.\n\n1. Misture\n\n- **Mais energia**\n\nFim.")

    expect(rest.map((block) => block.kind)).toEqual(["paragraph", "list", "paragraph"])
    expect(rest[1]).toMatchObject({ ordered: true })
    expect(withoutFirstList("- só\n- a lista")).toEqual([])
    expect(withoutFirstList("Sem lista.")).toHaveLength(1)
  })

  it("keeps a mark that never closes as text, so a price with an asterisk survives", () => {
    expect(parseInline("R$ 10 * 2 e um _ solto")).toEqual([{ kind: "text", text: "R$ 10 * 2 e um _ solto" }])
    expect(parseInline("**aberto")).toEqual([{ kind: "text", text: "**aberto" }])
  })

  it("reads an escaped character as itself", () => {
    expect(parseInline("2 \\* 3 e \\_nome\\_")).toEqual([{ kind: "text", text: "2 * 3 e _nome_" }])
  })

  it("makes a link only out of http(s), and leaves the rest as the words", () => {
    expect(parseInline("[loja](https://bee.link/x)")).toEqual([
      { kind: "link", href: "https://bee.link/x", children: [{ kind: "text", text: "loja" }] },
    ])
    expect(parseInline("[x](javascript:alert(1))")).toEqual([{ kind: "text", text: "[x](javascript:alert(1))" }])
  })

  it("keeps a soft break as a second line of the same paragraph", () => {
    expect(parseMarkdown("linha um\nlinha dois")).toEqual([
      { kind: "paragraph", lines: [[{ kind: "text", text: "linha um" }], [{ kind: "text", text: "linha dois" }]] },
    ])
  })

  it("gives the words alone for a meta description", () => {
    expect(plainTextOf("**Whey**\n\nCom _alto_ teor.\n\n- a\n- [b](https://x.y)")).toBe("Whey Com alto teor. a b")
  })
})

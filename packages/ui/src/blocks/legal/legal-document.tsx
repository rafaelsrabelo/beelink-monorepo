/** A paragraph, or a list whose items read as one enumeration. */
export type LegalBlock = { kind: "paragraph"; text: string } | { kind: "list"; items: readonly string[] }

export interface LegalSection {
  heading: string
  blocks: readonly LegalBlock[]
}

/**
 * A legal text as data (BEELINK-171): the web keeps the words, reviewed by whoever answers for them,
 * and this block only draws them — no Markdown, and nothing in it a lawyer would have to read.
 *
 * Every word is the text's own, the line saying when it took effect included: the text binds in its
 * language, and a page read in another must not half-translate it around the words that count.
 */
export interface LegalDocumentContent {
  /** The language the text is written in — "pt-BR" — declared on it, whatever the page's language is. */
  lang: string
  title: string
  /** When the text took effect, as it says it: "Vigente desde 30 de setembro de 2026". */
  effective: string
  intro: readonly string[]
  sections: readonly LegalSection[]
}

export interface LegalDocumentProps {
  content: LegalDocumentContent
}

/** Bee-link's terms of use or privacy policy, numbered by section, readable at any width. */
export function LegalDocument({ content }: LegalDocumentProps) {
  return (
    <article lang={content.lang} className="mx-auto flex w-full max-w-3xl flex-col gap-8 text-foreground">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
        <p className="text-sm text-muted-foreground">{content.effective}</p>
      </header>

      {content.intro.length ? (
        <div className="flex flex-col gap-3">
          {content.intro.map((paragraph) => (
            <p key={paragraph} className="leading-relaxed">
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}

      {content.sections.map((section, index) => (
        <section key={section.heading} aria-labelledby={`legal-section-${index + 1}`} className="flex flex-col gap-3">
          <h2 id={`legal-section-${index + 1}`} className="text-xl font-semibold">
            {index + 1}. {section.heading}
          </h2>
          {section.blocks.map((block, position) =>
            block.kind === "paragraph" ? (
              <p key={position} className="leading-relaxed">
                {block.text}
              </p>
            ) : (
              <ul key={position} className="flex list-disc flex-col gap-1.5 pl-6 leading-relaxed">
                {block.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ),
          )}
        </section>
      ))}
    </article>
  )
}

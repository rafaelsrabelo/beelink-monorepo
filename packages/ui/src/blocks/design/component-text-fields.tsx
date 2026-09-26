"use client"

// UI
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"
import { Textarea } from "@harness-monorepo/ui/components/textarea"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { ComponentKind } from "./design-types"

/** A block's words. `""` where the wire carries null. */
export interface ComponentTextValue {
  title: string
  subtitle: string
  body: string
}

export interface ComponentTextFieldsProps {
  kind: ComponentKind
  value: ComponentTextValue
  onChange: (next: Partial<ComponentTextValue>) => void
  messages?: UiMessages
}

/** Which of the three words a kind asks for. */
interface Words {
  title: boolean
  subtitle: boolean
  body: boolean
}

const HEADED: Words = { title: true, subtitle: true, body: false }
const WORDLESS: Words = { title: false, subtitle: false, body: false }

/**
 * The words each kind asks for, closed with `satisfies`: a kind added without saying which fails
 * the build here, rather than opening with no words to fill. A banner's and the promises' words are
 * their items' own.
 */
const WORDS_OF = {
  ANNOUNCEMENT: HEADED,
  HEADING: HEADED,
  CATEGORIES: HEADED,
  PRODUCTS: HEADED,
  CONTACT: HEADED,
  FAQ: HEADED,
  CALL_TO_ACTION: { title: true, subtitle: false, body: true },
  IMAGE_TEXT: { title: true, subtitle: false, body: true },
  FEATURED_PRODUCT: HEADED,
  TEXT: { title: false, subtitle: false, body: true },
  BANNER: WORDLESS,
  BENEFITS: WORDLESS,
} as const satisfies Record<ComponentKind, Words>

/**
 * What a block says in words: a heading and the line under it, or a paragraph.
 *
 * Its own block, and the seam falls here: every kind with words asks them the same way, and
 * `ComponentContentFields` only dispatches on the kind.
 */
export function ComponentTextFields({ kind, value, onChange, messages = defaultMessages }: ComponentTextFieldsProps) {
  const text = messages.design
  const banner = messages.banners
  const words = WORDS_OF[kind]

  return (
    <>
      {words.title ? (
        <Field>
          <FieldLabel htmlFor="component-title">{banner.titleLabel}</FieldLabel>
          <FieldContent>
            <Input
              id="component-title"
              value={value.title}
              onChange={(event) => onChange({ title: event.target.value })}
              placeholder={banner.titlePlaceholder}
            />
          </FieldContent>
        </Field>
      ) : null}

      {words.subtitle ? (
        <Field>
          <FieldLabel htmlFor="component-subtitle">{banner.subtitleLabel}</FieldLabel>
          <FieldContent>
            <Input id="component-subtitle" value={value.subtitle} onChange={(event) => onChange({ subtitle: event.target.value })} />
            <FieldDescription>{banner.subtitleHelp}</FieldDescription>
          </FieldContent>
        </Field>
      ) : null}

      {words.body ? (
        <Field>
          <FieldLabel htmlFor="component-body">{text.bodyLabel}</FieldLabel>
          <FieldContent>
            {/* A textarea and not an input: the paragraph's own line breaks are the only
                formatting this field has, and the storefront draws them. */}
            <Textarea
              id="component-body"
              rows={6}
              value={value.body}
              onChange={(event) => onChange({ body: event.target.value })}
              placeholder={text.bodyPlaceholder}
            />
          </FieldContent>
        </Field>
      ) : null}
    </>
  )
}

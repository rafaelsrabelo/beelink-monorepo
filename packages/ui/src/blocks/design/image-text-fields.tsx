"use client"

// UI
import { Field, FieldContent, FieldDescription, FieldLabel } from "@harness-monorepo/ui/components/field"
import { Input } from "@harness-monorepo/ui/components/input"

// Locales
import { defaultMessages } from "@harness-monorepo/ui/locales/index"
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import { StoreImageField } from "../store/store-image-field"
import { ButtonFields, type ButtonValue } from "./button-fields"
import type { TargetOption } from "./target-fields"

/** An image with text's picture and its description, and the button beside the words. */
export interface ImageTextValue extends ButtonValue {
  imageUrl: string
  imageAlt: string
}

export interface ImageTextFieldsProps {
  value: ImageTextValue
  onChange: (next: Partial<ImageTextValue>) => void
  categories: readonly TargetOption[]
  products: readonly TargetOption[]
  onUploadImage?: (file: File) => Promise<string>
  imagePending?: boolean
  messages?: UiMessages
}

/**
 * An image with text's own fields: the picture, what it shows — asked, because the picture here is
 * content and not decoration, and left blank it is drawn as decoration — and the button beside the
 * words, which "Nenhum" leaves out. Both are asked once there is a picture: the block keeps them
 * with it, and a button typed with no picture would be one the save could not keep.
 */
export function ImageTextFields({
  value,
  onChange,
  categories,
  products,
  onUploadImage,
  imagePending = false,
  messages = defaultMessages,
}: ImageTextFieldsProps) {
  const text = messages.design.imageText

  return (
    <>
      <StoreImageField
        id="image-text"
        label={text.image}
        value={value.imageUrl}
        onChange={(imageUrl) => onChange({ imageUrl })}
        {...(onUploadImage ? { onUpload: onUploadImage } : {})}
        pending={imagePending}
        hint={text.imageHelp}
        previewAlt={text.image}
        aspect="wide"
        messages={messages}
      />

      {value.imageUrl ? (
        <Field>
          <FieldLabel htmlFor="image-text-alt">{text.alt}</FieldLabel>
          <FieldContent>
            <Input
              id="image-text-alt"
              value={value.imageAlt}
              maxLength={160}
              aria-describedby="image-text-alt-help"
              onChange={(event) => onChange({ imageAlt: event.target.value })}
            />
            <FieldDescription id="image-text-alt-help">{text.altHelp}</FieldDescription>
          </FieldContent>
        </Field>
      ) : null}

      {/* The button sits beside the picture and goes with it: with no picture there is none to keep. */}
      {value.imageUrl ? (
        <ButtonFields value={value} onChange={onChange} categories={categories} products={products} messages={messages} />
      ) : null}
    </>
  )
}

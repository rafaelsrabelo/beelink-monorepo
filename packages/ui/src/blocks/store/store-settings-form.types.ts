// Locales
import type { UiMessages } from "@harness-monorepo/ui/locales/messages"

// Block
import type { StoreSettingsValues } from "./store-schemas"
import type {
  StoreAddressSuggestion,
  StoreCategoryOption,
  StoreColorPreset,
  StorePoint,
  StoreZipCodeAddress,
} from "./store-types"

export interface StoreSettingsFormProps {
  /** The shop's URL segment. Shown by the identity tab, never edited. */
  slug: string
  defaultValues: StoreSettingsValues
  onSubmit: (values: StoreSettingsValues) => void | Promise<void>
  categories: StoreCategoryOption[]
  colorPresets?: StoreColorPreset[]
  /**
   * Asked to fill the address from the postcode, and its answer is used — `void` here is what made
   * the lookup run, resolve, and discard what it found, with no complaint from the compiler.
   */
  onZipCodeLookup?: (zipCode: string) => Promise<StoreZipCodeAddress | null>
  zipCodeLookupPending?: boolean
  /** What is in the street field, for the screen to search with. It debounces; this does not. */
  onAddressSearch?: (query: string) => void
  suggestions?: readonly StoreAddressSuggestion[]
  addressSearchPending?: boolean
  /** Where a picked suggestion says the shop is; the screen turns it into `mapSrc`. */
  onPointChange?: (point: StorePoint) => void
  point?: StorePoint | null
  mapTileUrl?: string
  /**
   * Hands one image to whoever keeps bytes and answers with its URL. One callback serves the logo
   * and the banner alike, because one upload endpoint serves both — where the bytes land is the
   * screen's business and never this form's.
   */
  onImageUpload?: (file: File) => Promise<string>
  imageUploadPending?: boolean
  pending?: boolean
  /** A sentence the reader can act on. The screen turns an API errorCode into it. */
  error?: string
  messages?: UiMessages
}
